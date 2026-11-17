// ═══════════════════════════════════════════════════════════════════════════════
// Vercel Serverless Function: Motor de Búsqueda Visual — JavrelStore v2.13
// Pipeline oficial: Servidor MCP de Magnific → API REST → catálogo público
// La autenticación vive únicamente en el servidor (variables de entorno).
// Proxy CORS integrado para Canvas Preprocessor del frontend.
// ═══════════════════════════════════════════════════════════════════════════════

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR 0 (PRIMARIO): API oficial de Magnific — https://api.magnific.com/v1/resources
// Es la única vía legítima para obtener EXACTAMENTE el catálogo profesional que
// se muestra en https://www.magnific.com (fotos, renders y vectores en alta
// resolución). El scraping de la web devuelve 403 por el filtro anti-bot.
// ═══════════════════════════════════════════════════════════════════════════════
const MAGNIFIC_API_BASE = 'https://api.magnific.com';
const MCP_PROTOCOL_VERSION = '2025-06-18';
const MCP_SESSION_TTL = 10 * 60 * 1000;
const MCP_TIMEOUT = 9000;

/**
 * Credencial de la API REST de Magnific.
 * Se lee SOLO del entorno del servidor: nunca del navegador ni de headers
 * enviados por el cliente. Así la clave jamás se expone en el bundle.
 */
function resolveMagnificApiKey() {
  return String(
    process.env.MAGNIFIC_API_KEY || process.env.MAGNIFIC_STOCK_API_KEY || ''
  ).trim();
}

/**
 * Configuración del servidor MCP de Magnific (Streamable HTTP).
 * `MAGNIFIC_MCP_URL` es el endpoint del servidor y `MAGNIFIC_MCP_TOKEN`
 * (o `MAGNIFIC_API_KEY`) el token que se envía en segundo plano.
 */
function resolveMagnificMcpConfig() {
  const url = String(
    process.env.MAGNIFIC_MCP_URL ||
      process.env.MAGNIFIC_MCP_SERVER_URL ||
      process.env.MCP_MAGNIFIC_URL ||
      ''
  ).trim();
  const token = String(
    process.env.MAGNIFIC_MCP_TOKEN ||
      process.env.MAGNIFIC_MCP_API_KEY ||
      process.env.MAGNIFIC_API_KEY ||
      ''
  ).trim();
  return { url, token };
}

/**
 * Transporte JSON-RPC 2.0 sobre HTTP para MCP.
 * Soporta respuestas `application/json` y `text/event-stream` (SSE).
 */
async function mcpRequest(config, payload, sessionId = '') {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': UA,
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
    headers['x-api-key'] = config.token;
    headers['x-magnific-api-key'] = config.token;
  }
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MCP_TIMEOUT);
  let res;
  try {
    res = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const nextSessionId = res.headers.get('mcp-session-id') || sessionId;

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const error = new Error(`MCP ${res.status}: ${body.slice(0, 180)}`);
    error.status = res.status;
    throw error;
  }

  const contentType = String(res.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('text/event-stream')) {
    const raw = await res.text();
    let message = null;
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.toLowerCase().startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed && (parsed.result !== undefined || parsed.error !== undefined)) {
          message = parsed;
        }
      } catch {
        /* keep-alive o comentario SSE */
      }
    }
    return { message, sessionId: nextSessionId };
  }

  const text = await res.text().catch(() => '');
  if (!text) return { message: null, sessionId: nextSessionId };

  try {
    return { message: JSON.parse(text), sessionId: nextSessionId };
  } catch {
    return { message: null, sessionId: nextSessionId };
  }
}

// Sesión MCP reutilizable entre invocaciones tibias del servidor.
const mcpSessionCache = {
  url: '',
  sessionId: '',
  tools: [],
  expiresAt: 0,
};

/**
 * Handshake MCP completo:
 * initialize → notifications/initialized → tools/list
 */
async function openMagnificMcpSession(config, force = false) {
  const now = Date.now();
  if (
    !force &&
    mcpSessionCache.url === config.url &&
    mcpSessionCache.sessionId &&
    mcpSessionCache.expiresAt > now
  ) {
    return mcpSessionCache;
  }

  const init = await mcpRequest(config, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'JavrelStore', version: '2.13.0' },
    },
  });

  if (init.message?.error) {
    throw new Error(init.message.error.message || 'MCP initialize rechazado');
  }

  const sessionId = init.sessionId || '';

  // Notificación obligatoria del handshake (sin id, no espera respuesta).
  await mcpRequest(
    config,
    { jsonrpc: '2.0', method: 'notifications/initialized', params: {} },
    sessionId
  ).catch(() => {});

  const listed = await mcpRequest(
    config,
    { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
    sessionId
  );

  if (listed.message?.error) {
    throw new Error(listed.message.error.message || 'MCP tools/list rechazado');
  }

  const tools = Array.isArray(listed.message?.result?.tools)
    ? listed.message.result.tools
    : [];

  mcpSessionCache.url = config.url;
  mcpSessionCache.sessionId = sessionId;
  mcpSessionCache.tools = tools;
  mcpSessionCache.expiresAt = now + MCP_SESSION_TTL;

  return mcpSessionCache;
}

/** Elige la herramienta de búsqueda visual del servidor MCP. */
function pickMagnificTool(tools) {
  const usable = (tools || []).filter((tool) => tool && tool.name);
  if (usable.length === 0) return null;

  const scored = usable.map((tool) => {
    const name = String(tool.name).toLowerCase();
    const description = String(tool.description || '').toLowerCase();
    let score = 0;
    if (/(search|find|query|lookup)/.test(name)) score += 8;
    if (/(image|photo|stock|resource|asset|visual|render)/.test(name)) score += 6;
    if (/(generate|enhance|upscale|relight|remove|style)/.test(name)) score -= 8;
    if (/(search|find|stock|image|photo)/.test(description)) score += 2;
    return { tool, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].tool : usable[0];
}

/** Construye los argumentos según el inputSchema real de la herramienta. */
function buildMagnificToolArgs(tool, term, limit) {
  const schema = tool?.inputSchema || {};
  const props =
    schema.properties && typeof schema.properties === 'object'
      ? schema.properties
      : {};
  const keys = Object.keys(props);

  const findKey = (names) =>
    keys.find((key) => names.includes(key.toLowerCase())) ||
    keys.find((key) => names.some((name) => key.toLowerCase().includes(name)));

  const args = {};
  const termKey =
    findKey(['query', 'term', 'q', 'prompt', 'search', 'keywords', 'text']) ||
    'query';
  args[termKey] = term;

  const limitKey = findKey(['limit', 'count', 'per_page', 'page_size', 'num']);
  if (limitKey) args[limitKey] = limit;

  for (const required of Array.isArray(schema.required) ? schema.required : []) {
    if (args[required] !== undefined) continue;
    const type = props[required]?.type;
    if (type === 'number' || type === 'integer') args[required] = 1;
    else if (type === 'boolean') args[required] = false;
    else if (type === 'array') args[required] = [];
    else if (type === 'object') args[required] = {};
    else args[required] = term;
  }

  return args;
}

const IMAGE_FIELD_KEYS = [
  'url',
  'image',
  'imageUrl',
  'image_url',
  'src',
  'preview',
  'thumbnail',
  'thumb',
  'thumbUrl',
  'thumb_url',
  'full',
  'original',
  'download',
];

function isImageUrl(value) {
  return (
    typeof value === 'string' &&
    (/^https?:\/\//i.test(value) || value.startsWith('data:image/'))
  );
}

/** Extrae la mejor URL de imagen de un nodo arbitrario devuelto por MCP. */
function pickImageUrl(raw) {
  if (!raw) return '';
  if (isImageUrl(raw)) return raw;
  if (typeof raw !== 'object') return '';

  for (const key of IMAGE_FIELD_KEYS) {
    const value = raw[key];
    if (isImageUrl(value)) return value;
    if (value && typeof value === 'object') {
      const nested = value.url || value.src || value.href || value.preview;
      if (isImageUrl(nested)) return nested;
    }
  }

  return '';
}

/** Recorre recursivamente la respuesta MCP y recopila nodos con imagen. */
function collectMcpImageNodes(node, out, depth = 0) {
  if (!node || depth > 6 || out.length > 200) return;

  if (Array.isArray(node)) {
    for (const entry of node) collectMcpImageNodes(entry, out, depth + 1);
    return;
  }
  if (typeof node !== 'object') return;

  if (pickImageUrl(node)) {
    out.push(node);
    return;
  }

  const containers = [
    'data',
    'items',
    'results',
    'images',
    'resources',
    'assets',
    'hits',
    'content',
    'photos',
    'renders',
    'output',
    'outputs',
  ];

  for (const key of containers) {
    if (node[key]) collectMcpImageNodes(node[key], out, depth + 1);
  }
}

function parseJsonLoose(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    /* intentar extraer el primer bloque JSON */
  }

  const start = trimmed.search(/[[{]/);
  if (start === -1) return null;
  const end = Math.max(trimmed.lastIndexOf(']'), trimmed.lastIndexOf('}'));
  if (end <= start) return null;

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function extractUrlsFromText(text) {
  const urls = [];
  const markdown = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  let match;
  while ((match = markdown.exec(text))) urls.push(match[1]);

  if (urls.length === 0) {
    const plain =
      /(https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|avif)(?:\?[^\s"'<>]*)?)/gi;
    while ((match = plain.exec(text))) urls.push(match[1]);
  }

  return urls;
}

/** Normaliza un recurso MCP al contrato interno del frontend. */
function normalizeMcpItem(raw, term, index) {
  const hd = pickImageUrl(raw);
  if (!hd) return null;

  const thumb =
    (typeof raw.thumbUrl === 'string' && raw.thumbUrl) ||
    (typeof raw.thumbnail === 'string' && raw.thumbnail) ||
    (typeof raw.preview === 'string' && raw.preview) ||
    hd;

  const width = Number(raw.width || raw.image_width || 0) || 0;
  const height = Number(raw.height || raw.image_height || 0) || 0;
  const title =
    raw.title || raw.name || raw.description || `${term} #${index + 1}`;

  return {
    id: `magnific-mcp-${raw.id ?? index}`,
    title: String(title).slice(0, 180),
    url: hd.startsWith('data:') ? hd : withCdnWidth(hd, 1600),
    thumbUrl: thumb.startsWith('data:') ? thumb : withCdnWidth(thumb, 480),
    dimensions:
      width && height
        ? `${width}x${height}`
        : raw.dimensions || raw.size || 'HD',
    width,
    height,
    badge: 'Magnific IA',
    source: 'Magnific',
    sourceType: 'magnific',
    sourceEngine: 'magnific-mcp',
    author:
      (raw.author && (raw.author.name || raw.author)) || raw.creator || 'Magnific',
    type: raw.type || raw.format || 'photo',
    license: raw.license || 'freemium',
    resourceUrl: raw.resourceUrl || raw.pageUrl || '',
  };
}

/** Convierte `tools/call` (texto JSON, structuredContent o bloques image). */
function extractMagnificMcpItems(result, term, limit) {
  if (!result || typeof result !== 'object') return [];

  const rawNodes = [];
  const blocks = Array.isArray(result.content) ? result.content : [];

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'text' && block.text) {
      const parsed = parseJsonLoose(block.text);
      if (parsed) collectMcpImageNodes(parsed, rawNodes);
      else extractUrlsFromText(block.text).forEach((url) => rawNodes.push({ url }));
    } else if (block.type === 'image' && block.data) {
      const mime = block.mimeType || 'image/webp';
      rawNodes.push({ url: `data:${mime};base64,${block.data}`, title: term });
    } else if (block.type === 'resource' && block.resource) {
      if (block.resource.blob) {
        const mime = block.resource.mimeType || 'image/webp';
        rawNodes.push({
          url: `data:${mime};base64,${block.resource.blob}`,
          title: term,
        });
      } else if (block.resource.text) {
        const parsed = parseJsonLoose(block.resource.text);
        if (parsed) collectMcpImageNodes(parsed, rawNodes);
      }
    }
  }

  if (result.structuredContent) {
    collectMcpImageNodes(result.structuredContent, rawNodes);
  }
  if (rawNodes.length === 0) {
    collectMcpImageNodes(result, rawNodes);
  }

  const seen = new Set();
  const items = [];

  for (const node of rawNodes) {
    const item = normalizeMcpItem(node, term, items.length);
    if (!item || seen.has(item.url)) continue;
    seen.add(item.url);
    items.push(item);
    if (items.length >= limit) break;
  }

  return items;
}

/** Ejecuta la búsqueda visual a través del servidor MCP de Magnific. */
async function searchMagnificMcp(term, limit, config) {
  if (!config?.url) return [];

  const cleanTerm = String(term || '').trim();
  if (!cleanTerm) return [];

  const session = await openMagnificMcpSession(config);
  const tool = pickMagnificTool(session.tools);
  if (!tool) throw new Error('El servidor MCP no expone herramientas');

  const call = await mcpRequest(
    config,
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: tool.name,
        arguments: buildMagnificToolArgs(tool, cleanTerm, limit),
      },
    },
    session.sessionId
  );

  if (call.message?.error) {
    throw new Error(call.message.error.message || `MCP ${tool.name} rechazado`);
  }

  return extractMagnificMcpItems(call.message?.result, cleanTerm, limit);
}

/** Reintenta una vez si la sesión MCP expiró (400/404). */
async function searchMagnificMcpWithRetry(term, limit, config) {
  try {
    return await searchMagnificMcp(term, limit, config);
  } catch (err) {
    if (err?.status === 400 || err?.status === 404) {
      mcpSessionCache.expiresAt = 0;
      mcpSessionCache.sessionId = '';
      return searchMagnificMcp(term, limit, config);
    }
    throw err;
  }
}

/**
 * Reescribe la URL del CDN de Magnific/Freepik a una rendición mayor.
 * El CDN acepta `w` para servir la misma imagen a más resolución sin recortar.
 */
function withCdnWidth(sourceUrl, width) {
  if (!sourceUrl) return '';
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    const isMagnificCdn =
      host === 'img.freepik.com' ||
      host.endsWith('.freepik.com') ||
      host.endsWith('.magnific.com') ||
      host.endsWith('.cdnpk.net');
    if (!isMagnificCdn) return sourceUrl;
    url.searchParams.set('w', String(width));
    url.searchParams.delete('h');
    url.searchParams.delete('crop');
    return url.toString();
  } catch {
    return sourceUrl;
  }
}

function parseDimensions(size) {
  const match = String(size || '').match(/(\d+)\s*x\s*(\d+)/i);
  if (!match) return { width: 0, height: 0 };
  return { width: Number(match[1]) || 0, height: Number(match[2]) || 0 };
}

/** Normaliza un recurso de la API al contrato interno del frontend. */
function normalizeMagnificItem(item, term, index) {
  const source = item?.image?.source || {};
  const rawUrl = source.url || item?.image?.url || '';
  if (!rawUrl) return null;

  const { width, height } = parseDimensions(source.size);
  const isPremium = (item?.licenses || []).some((l) => l?.type === 'premium');
  const isAi =
    item?.image?.type === 'ai' || Boolean(item?.meta?.available_formats?.ai);

  return {
    id: `magnific-${item?.id ?? index}`,
    title: item?.title || `${term} #${index + 1}`,
    // `url` es SIEMPRE la rendición HD que consume el Canvas del frontend.
    url: withCdnWidth(rawUrl, 1600),
    thumbUrl: withCdnWidth(rawUrl, 480),
    dimensions: width && height ? `${width}x${height}` : source.size || 'HD',
    width,
    height,
    badge: isPremium ? 'Magnific Premium' : isAi ? 'Magnific IA 4K' : 'Magnific 4K',
    source: 'Magnific',
    sourceType: 'magnific',
    sourceEngine: 'magnific-api',
    author: item?.author?.name || 'Magnific',
    type: item?.image?.type || 'photo',
    license: isPremium ? 'premium' : 'freemium',
    resourceUrl: item?.url || '',
  };
}

/** Ejecuta una consulta contra /v1/resources y devuelve el JSON crudo. */
async function requestMagnificResources(term, limit, apiKey, extraFilters = {}) {
  const params = new URLSearchParams();
  params.set('term', term);
  params.set('page', '1');
  params.set('limit', String(Math.min(Math.max(Number(limit) || 20, 1), 100)));
  params.set('order', 'relevance');
  Object.entries(extraFilters).forEach(([key, value]) => {
    params.set(key, String(value));
  });

  const res = await fetch(`${MAGNIFIC_API_BASE}/v1/resources?${params.toString()}`, {
    headers: {
      'x-magnific-api-key': apiKey,
      Accept: 'application/json',
      'Accept-Language': 'es-CO',
      'User-Agent': UA,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const error = new Error(`Magnific API ${res.status}: ${body.slice(0, 200)}`);
    error.status = res.status;
    throw error;
  }

  return res.json();
}

/**
 * Búsqueda en el catálogo oficial de Magnific.
 * Sin filtros de tipo: replica el catálogo mixto de la web (fotos, renders,
 * vectores y PSD) para conservar la misma estética profesional.
 * @returns {Promise<Array>} recursos normalizados (HD primero).
 */
async function searchMagnificApi(term, limit, apiKey) {
  if (!apiKey) return [];
  const cleanTerm = String(term || '').trim();
  if (!cleanTerm) return [];

  const json = await requestMagnificResources(cleanTerm, limit, apiKey);
  const data = Array.isArray(json?.data) ? json.data : [];
  return data
    .map((item, index) => normalizeMagnificItem(item, cleanTerm, index))
    .filter(Boolean);
}

// ── Motor 3: Wikimedia Commons API (Imágenes Reales Libres) ──────────────────
async function searchWikimedia(term, limit) {
  const items = [];

  const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    term
  )}&gsrnamespace=6&gsrlimit=${Math.min(limit, 30)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&format=json&origin=*`;

  const wikiRes = await fetch(wikiUrl, {
    headers: {
      'User-Agent': 'JavrelStore/2.13 (https://mercado-tecnologico.vercel.app)',
      Accept: 'application/json',
    },
  });
  if (!wikiRes.ok) return items;

  const wikiJson = await wikiRes.json();
  const pages = Object.values(wikiJson?.query?.pages || {});

  for (const page of pages) {
    if (items.length >= limit) break;
    const info = page.imageinfo?.[0];
    if (!info || !info.url) continue;
    // Excluir SVGs, archivos de audio y PDFs
    const mime = (info.mime || '').toLowerCase();
    if (
      info.url.endsWith('.svg') ||
      mime.includes('audio') ||
      mime.includes('pdf') ||
      mime.includes('ogg')
    )
      continue;

    const width = info.width || 800;
    const height = info.height || 800;
    const cleanTitle = (page.title || term)
      .replace(/^File:/i, '')
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .replace(/_/g, ' ')
      .trim();

    items.push({
      id: `wiki-${page.pageid || items.length}`,
      title: cleanTitle,
      url: info.url,
      thumbUrl: info.thumburl || info.url,
      source: 'Wikimedia Commons',
      sourceType: 'web',
      sourceEngine: 'wikimedia',
      dimensions: `${width}x${height} HD`,
      badge: width >= 1200 ? '4K Ultra' : 'Stock HD',
    });
  }

  return items;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler Principal — Serverless Function
// ═══════════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // ── CORS ───────────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ── MODO PROXY DE IMÁGENES (Bypass CORS para Canvas Preprocessor) ─────────
  const proxyUrl = req.query?.proxyUrl || req.query?.proxy;
  if (proxyUrl) {
    try {
      const decodedUrl = decodeURIComponent(proxyUrl);
      const imgRes = await fetch(decodedUrl, {
        headers: {
          'User-Agent': UA,
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          Referer: new URL(decodedUrl).origin + '/',
        },
      });

      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.statusCode = 200;
        res.end(buffer);
        return;
      }
    } catch (proxyErr) {
      console.warn('[Proxy Error]:', proxyErr.message);
    }

    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Proxy request failed' }));
    return;
  }

  // ── MODO API: Obtener Recursos Reales de Magnific en JSON ──────────────────
  if (req.query?.action === 'magnific-items') {
    const q = (req.query?.q || req.query?.query || 'repetidor wifi').trim();
    const apiKey = resolveMagnificApiKey();
    const mcpConfig = resolveMagnificMcpConfig();
    try {
      const items = await fetchMagnificRealItems(q, apiKey, mcpConfig);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Los resultados de búsqueda de imágenes son razonablemente estables: cachear 10 min en CDN
      res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=600, stale-while-revalidate=1800');
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          success: true,
          engine: items[0]?.sourceEngine || 'stock-publico',
          mcpConnected: Boolean(mcpConfig.url),
          count: items.length,
          data: items,
        })
      );
      return;
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // ── MODO PASARELA EMBEBIDA: Magnific Web Live Studio (Navegación Libre + Botón Exclusivo) ─
  const isEmbed = req.query?.embed === '1' || req.query?.gateway === '1';
  if (isEmbed) {
    const query = (
      req.query?.q ||
      req.query?.query ||
      req.query?.term ||
      (req.query?.url ? (new URL(req.query.url.startsWith('http') ? req.query.url : 'https://' + req.query.url).searchParams.get('query') || '') : '') ||
      'repetidor wifi'
    ).trim();

    let items = [];
    try {
      items = await fetchMagnificRealItems(
        query,
        resolveMagnificApiKey(),
        resolveMagnificMcpConfig()
      );
    } catch (e) {
      console.warn('[Embed Live Fetch Warning]:', e.message);
    }

    const html = generateMagnificLiveStudioHtml(query, items);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.statusCode = 200;
    res.end(html);
    return;
  }

  // ── MODO BÚSQUEDA ─────────────────────────────────────────────────────────
  const term = (req.query?.term || req.query?.query || req.query?.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 15), 30);
  const apiKey = resolveMagnificApiKey();
  const mcpConfig = resolveMagnificMcpConfig();

  if (!term) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  let allItems = [];
  let magnificError = null;
  let magnificEngine = null;

  // ── Motor 0 (PRIMARIO): servidor MCP de Magnific (JSON-RPC 2.0) ──────────
  // Autenticación transparente con MAGNIFIC_MCP_URL + MAGNIFIC_MCP_TOKEN.
  if (mcpConfig.url) {
    try {
      const mcpItems = await searchMagnificMcpWithRetry(term, limit, mcpConfig);
      if (mcpItems.length > 0) {
        allItems.push(...mcpItems);
        magnificEngine = 'magnific-mcp';
        console.log(`[Magnific MCP] ${mcpItems.length} recursos para "${term}"`);
      }
    } catch (err) {
      magnificError = err.message;
      console.warn('[Magnific MCP Error]:', err.message);
    }
  }

  // ── Motor 0b: API REST oficial de Magnific ────────────────────────────────
  // Devuelve exactamente el catálogo profesional de magnific.com.
  if (!magnificEngine && apiKey) {
    try {
      const magnItems = await searchMagnificApi(term, limit, apiKey);
      if (magnItems.length > 0) {
        allItems.push(...magnItems);
        magnificEngine = 'magnific-api';
        console.log(`[Magnific API] ${magnItems.length} recursos para "${term}"`);
      }
    } catch (err) {
      magnificError = err.message;
      console.warn('[Magnific API Error]:', err.message);
    }
  }

  // ── Motor 0c: catálogo público de Magnific (scrape de la web) ─────────────
  // Se usa cuando MCP/REST no están disponibles. Devuelve las mismas imágenes
  // de magnific.com (CDN img.magnific.com).
  if (!magnificEngine && allItems.length < limit) {
    try {
      const publicItems = await fetchMagnificRealItems(term, '', { url: '' });
      const magnPublic = publicItems.filter(
        (item) => item && item.sourceType === 'magnific' && item.url
      );
      if (magnPublic.length > 0) {
        allItems.push(...magnPublic);
        magnificEngine = 'magnific-scrape';
        console.log(`[Magnific Web] ${magnPublic.length} recursos públicos para "${term}"`);
      }
    } catch (err) {
      console.warn('[Magnific Web Error]:', err.message);
    }
  }

  // ── Motor 1: stock libre (último recurso silencioso, nunca se etiqueta
  // como Magnific). No se consultan buscadores genéricos/Bing.
  if (allItems.length < limit) {
    try {
      const wikiResults = await searchWikimedia(term, limit - allItems.length);
      allItems.push(...wikiResults);
      if (wikiResults.length > 0) {
        console.log(`[Stock libre] ${wikiResults.length} resultados para "${term}"`);
      }
    } catch (err) {
      console.warn('[Stock libre Error]:', err.message);
    }
  }

  // ── Deduplicación por URL ─────────────────────────────────────────────────
  const seen = new Set();
  allItems = allItems.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  // ── Respuesta ─────────────────────────────────────────────────────────────
  const engine = magnificEngine || (allItems.length > 0 ? 'stock-publico' : 'empty');
  const sourceLabel =
    allItems.length > 0
      ? `${engine} (${[
          allItems.some((i) => i.sourceType === 'magnific') ? 'Magnific' : '',
          allItems.some((i) => i.sourceEngine === 'wikimedia') ? 'Stock libre' : '',
        ]
          .filter(Boolean)
          .join('+')})`
      : 'empty';

  const pageItems = allItems.slice(0, limit);

  return res.status(200).json({
    success: true,
    engine,
    mcpConnected: Boolean(mcpConfig.url),
    apiConnected: Boolean(apiKey),
    magnificError,
    source: sourceLabel,
    count: pageItems.length,
    data: pageItems,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Motor de Extracción en Tiempo Real de Recursos de Magnific Web
// Prioridad: MCP → API REST → scrape público
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchMagnificRealItems(query, apiKey = '', mcpConfig = { url: '' }) {
  const cleanQ = (query || 'repetidor wifi').trim();

  // 1) Servidor MCP de Magnific (JSON-RPC 2.0).
  if (mcpConfig?.url) {
    try {
      const mcpItems = await searchMagnificMcpWithRetry(cleanQ, 30, mcpConfig);
      if (mcpItems.length > 0) return mcpItems;
    } catch (err) {
      console.warn('[fetchMagnificRealItems MCP Error]:', err.message);
    }
  }

  // 2) API REST oficial de Magnific.
  if (apiKey) {
    try {
      const apiItems = await searchMagnificApi(cleanQ, 30, apiKey);
      if (apiItems.length > 0) return apiItems;
    } catch (err) {
      console.warn('[fetchMagnificRealItems API Error]:', err.message);
    }
  }

  // 3) Scrape de la web (bloqueado por el filtro anti-bot desde datacenter).
  //    Se conserva como último recurso por si el entorno lo permite.
  try {
    const searchUrl = `https://www.magnific.com/es/search?format=search&query=${encodeURIComponent(cleanQ)}`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua':
          '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        Referer: 'https://www.magnific.com/',
      },
    });

    if (res.ok) {
      const html = await res.text();
      const idx = html.indexOf('__NEXT_DATA__');
      if (idx !== -1) {
        const start = html.indexOf('>', idx) + 1;
        const end = html.indexOf('</script>', start);
        const json = JSON.parse(html.substring(start, end));
        const list = json.props?.pageProps?.regularList?.items || [];
        if (Array.isArray(list) && list.length > 0) {
          return list.map((item, idx) => {
            const rawUrl = item.preview?.url || item.url || '';
            const previewW = Number(item.preview?.width) || 0;
            const previewH = Number(item.preview?.height) || 0;
            // El preview es un thumbnail; la URL servida es HD (w=1600).
            const hdDimensions =
              previewW && previewH
                ? `1600x${Math.round((previewH / previewW) * 1600)}`
                : '1600 HD';
            return {
              id: item.id || `mag-${idx}`,
              name: item.name || `${cleanQ} #${idx + 1}`,
              title: item.name || `${cleanQ} #${idx + 1}`,
              url: withCdnWidth(rawUrl, 1600),
              thumbUrl: withCdnWidth(rawUrl, 480),
              badge: item.premium
                ? 'Magnific Pro'
                : item.isAIGenerated
                  ? 'Magnific IA 4K'
                  : 'Magnific 4K',
              dimensions: hdDimensions,
              type: item.type || 'photo',
              author: item.author?.name || 'magnific.com',
              source: 'Magnific',
              sourceType: 'magnific',
              sourceEngine: 'magnific-scrape',
              license: item.premium ? 'premium' : 'freemium',
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('[fetchMagnificRealItems Error]:', err.message);
  }
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Magnific Web Live Studio (Navegación Libre + Selección Exclusiva por Botón)
// ═══════════════════════════════════════════════════════════════════════════════
function generateMagnificLiveStudioHtml(initialQuery = 'repetidor wifi', initialItems = []) {
  const safeQuery = initialQuery.replace(/"/g, '&quot;');
  const safeItemsJson = JSON.stringify(initialItems).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Magnific AI — ${safeQuery}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #0E0E10;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
      user-select: auto;
    }
    /* Header Principal idéntico a Magnific */
    .top-navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(14, 14, 16, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #1F1F24;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-badge {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      flex-shrink: 0;
    }
    .logo-m {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #EC4899;
      color: white;
      font-weight: 900;
      font-size: 19px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    /* Barra de Búsqueda de Magnific */
    .search-wrapper {
      flex: 1;
      max-width: 680px;
      position: relative;
    }
    .search-form {
      display: flex;
      align-items: center;
      background: #1B1B1F;
      border: 1px solid #2E2E36;
      border-radius: 28px;
      padding: 4px 16px;
      transition: all 0.2s;
    }
    .search-form:focus-within {
      border-color: #EC4899;
      background: #222228;
      box-shadow: 0 0 0 2px rgba(236,72,153,0.2);
    }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #FFFFFF;
      font-size: 14px;
      padding: 8px 10px;
    }
    .search-input::placeholder {
      color: #71717A;
    }
    .btn-search-action {
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      border-radius: 50%;
    }
    .btn-search-action:hover {
      color: #FFFFFF;
      background: rgba(255,255,255,0.08);
    }
    .nav-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .status-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      background: rgba(10,108,255,0.15);
      border: 1px solid rgba(10,108,255,0.3);
      color: #60A5FA;
      border-radius: 20px;
    }
    /* Píldoras de Filtros */
    .filters-bar {
      padding: 10px 18px;
      border-bottom: 1px solid #1A1A20;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      no-scrollbar;
      background: #0E0E10;
    }
    .filter-pill {
      background: #18181C;
      border: 1px solid #27272F;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      color: #D4D4D8;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-pill:hover, .filter-pill.active {
      background: #27272F;
      border-color: #3F3F46;
      color: #FFFFFF;
    }
    .filter-pill.active {
      border-color: #EC4899;
      color: #F472B6;
    }
    /* Subbanner informativo idéntico a Magnific */
    .sub-banner {
      padding: 12px 18px 4px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #A1A1AA;
      font-size: 12px;
    }
    .query-title {
      font-size: 14px;
      font-weight: 700;
      color: #FFFFFF;
    }
    .query-count {
      color: #71717A;
      font-size: 12px;
      margin-left: 6px;
      font-weight: normal;
    }
    /* Grid de Recursos Estilo Magnific Masonry */
    .content-area {
      padding: 14px 18px 40px 18px;
    }
    .masonry-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .asset-card {
      position: relative;
      background: #18181C;
      border: 1px solid #24242C;
      border-radius: 16px;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      cursor: default; /* Navegación libre: no captura al hacer clic normal */
    }
    .asset-card:hover {
      border-color: #3F3F46;
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.5);
    }
    .asset-img-wrap {
      width: 100%;
      aspect-ratio: 4/3;
      background: #121215;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .asset-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
    .asset-card:hover .asset-img-wrap img {
      transform: scale(1.03);
    }
    /* Iconos superiores de la tarjeta (Bookmark, Folder, Download) */
    .card-top-icons {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 6px;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 5;
    }
    .asset-card:hover .card-top-icons {
      opacity: 1;
    }
    .icon-btn {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(18, 18, 22, 0.85);
      border: 1px solid rgba(255,255,255,0.1);
      color: #E4E4E7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      cursor: pointer;
    }
    /* BOTÓN DEDICADO EXCLUSIVO: "Usar ▾" / "Capturar Imagen" */
    .card-use-btn-wrapper {
      position: absolute;
      bottom: 10px;
      right: 10px;
      z-index: 10;
    }
    .btn-use-asset {
      background: #FFFFFF;
      color: #0E0E10;
      border: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
      transition: all 0.2s;
    }
    .btn-use-asset:hover {
      background: #EC4899;
      color: #FFFFFF;
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(236,72,153,0.5);
    }
    .btn-use-asset span.arrow {
      font-size: 10px;
    }
    /* Metadatos inferiores */
    .card-footer {
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .asset-title {
      font-size: 11px;
      color: #D4D4D8;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }
    .asset-author {
      font-size: 10px;
      color: #71717A;
      flex-shrink: 0;
    }
    .loading-spin {
      text-align: center;
      padding: 40px;
      color: #EC4899;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <!-- Header de Navegación Magnific -->
  <div class="top-navbar">
    <a href="#" class="logo-badge" onclick="event.preventDefault(); loadSearch('repetidor wifi');">
      <div class="logo-m">M</div>
    </a>

    <div class="search-wrapper">
      <form class="search-form" onsubmit="event.preventDefault(); doSubmitSearch();">
        <span style="color:#71717A; font-size:14px; margin-right:6px;">🔍</span>
        <input
          type="text"
          id="searchInput"
          class="search-input"
          placeholder="Buscar en Magnific: estuche, repetidor wifi, macbook..."
          value="${safeQuery}"
        />
        <button type="button" class="btn-search-action" title="Limpiar" onclick="document.getElementById('searchInput').value=''; document.getElementById('searchInput').focus();">✕</button>
        <button type="submit" class="btn-search-action" title="Buscar" style="color:#EC4899;">➔</button>
      </form>
    </div>

    <div class="nav-actions">
      <span class="status-badge">⚡ Navegación Libre • Selector por Botón "Usar"</span>
    </div>
  </div>

  <!-- Píldoras de Filtros Rápidos -->
  <div class="filters-bar">
    <div class="filter-pill active" onclick="setFilter('all', this)">Todas las imágenes</div>
    <div class="filter-pill" onclick="setFilter('photo', this)">Fotos</div>
    <div class="filter-pill" onclick="setFilter('vector', this)">Vectores</div>
    <div class="filter-pill" onclick="quickTagSearch('repetidor wifi')">📶 Repetidor WiFi</div>
    <div class="filter-pill" onclick="quickTagSearch('estuche celular silicona')">📱 Estuches Celular</div>
    <div class="filter-pill" onclick="quickTagSearch('carcasa protectora')">🛡️ Carcasas</div>
    <div class="filter-pill" onclick="quickTagSearch('laptop gamer rtx')">💻 Laptop Gamer</div>
    <div class="filter-pill" onclick="quickTagSearch('control ps5 dualsense')">🎮 Control PS5</div>
  </div>

  <!-- Subbanner informativo -->
  <div class="sub-banner">
    <div>
      <span class="query-title" id="queryTitleDisplay">${safeQuery}</span>
      <span class="query-count" id="countDisplay">276k resultados</span>
    </div>
    <div style="font-size:11px; color:#A1A1AA;">
      Usa el botón <strong style="color:#FFFFFF;">"Usar ▾"</strong> sobre la imagen elegida para importarla a tu producto.
    </div>
  </div>

  <!-- Cuadrícula de Resultados -->
  <div class="content-area">
    <div class="masonry-grid" id="assetsGrid"></div>
  </div>

  <script>
    var currentItems = ${safeItemsJson};
    var activeFilter = 'all';

    function escapeHtml(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderGrid(items) {
      var grid = document.getElementById('assetsGrid');
      if (!items || items.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #71717A;">No se encontraron recursos. Intenta con otro término de búsqueda.</div>';
        return;
      }

      var filtered = items.filter(function(item) {
        if (activeFilter === 'all') return true;
        return item.type === activeFilter;
      });

      grid.innerHTML = filtered.map(function(item) {
        var idx = items.indexOf(item);
        var thumbUrl = item.thumbUrl || item.url || '';
        var hdUrl = item.url || thumbUrl;
        var title = item.title || item.name || 'Recurso Magnific';

        return \`
          <div class="asset-card" data-index="\${idx}" data-hd="\${escapeHtml(hdUrl)}">
            <div class="asset-img-wrap">
              <img src="\${escapeHtml(thumbUrl)}" alt="\${escapeHtml(title)}" loading="lazy" />

              <!-- Iconos superiores de conveniencia -->
              <div class="card-top-icons">
                <div class="icon-btn" title="Guardar">🔖</div>
                <div class="icon-btn" title="Colección">📁</div>
                <div class="icon-btn" title="Descargar">⬇️</div>
              </div>

              <!-- BOTÓN EXCLUSIVO DEDICADO: "Usar ▾" -->
              <div class="card-use-btn-wrapper">
                <button
                  type="button"
                  class="btn-use-asset"
                  title="Importar esta imagen en alta resolución (WebP #FFFFFF 800×800)"
                  onclick="handleSelectAsset(event, \${idx})"
                >
                  <span>Usar</span>
                  <span class="arrow">▾</span>
                </button>
              </div>
            </div>

            <div class="card-footer">
              <div class="asset-title" title="\${escapeHtml(title)}">\${escapeHtml(title)}</div>
              <div class="asset-author">\${escapeHtml(item.author || 'Magnific')}</div>
            </div>
          </div>
        \`;
      }).join('');
    }

    // ACCIÓN EXCLUSIVA: Solo se dispara al hacer clic en el botón "Usar ▾".
    // Se envía SIEMPRE la URL de alta resolución (item.url), nunca el thumbnail,
    // para que el Canvas del frontend procese la imagen HD (fondo #FFFFFF,
    // WebP 800×800 < 50 KB) sin pérdida de calidad.
    function handleSelectAsset(event, index) {
      event.preventDefault();
      event.stopPropagation();

      var item = currentItems[index];
      if (!item) return;

      var hdUrl = item.url || item.thumbUrl || '';
      if (!hdUrl) return;

      window.parent.postMessage({
        type: 'MAGNIFIC_IMAGE_SELECTED',
        url: hdUrl,
        thumbUrl: item.thumbUrl || hdUrl,
        title: item.title || item.name || 'Recurso Magnific',
        source: item.source || 'Magnific',
        dimensions: item.dimensions || 'HD'
      }, '*');
    }

    // Búsqueda dinámica sin intercepción
    async function loadSearch(query) {
      var grid = document.getElementById('assetsGrid');
      grid.innerHTML = '<div style="grid-column: 1/-1;" class="loading-spin">Consultando catálogo oficial de Magnific...</div>';
      document.getElementById('queryTitleDisplay').innerText = query;
      document.getElementById('searchInput').value = query;

      try {
        var res = await fetch('/api/magnific-search?action=magnific-items&q=' + encodeURIComponent(query));
        if (res.ok) {
          var json = await res.json();
          if (json.data && json.data.length > 0) {
            currentItems = json.data;
            document.getElementById('countDisplay').innerText = (json.data.length * 5) + 'k resultados';
            renderGrid(currentItems);
            return;
          }
        }
      } catch (e) {
        console.warn('Error loading magnific items:', e);
      }

      // Fallback a búsqueda web multi-motor (solo si la API no devolvió nada)
      try {
        var fallbackRes = await fetch('/api/magnific-search?term=' + encodeURIComponent(query) + '&limit=24');
        if (fallbackRes.ok) {
          var fbJson = await fallbackRes.json();
          if (fbJson.data && fbJson.data.length > 0) {
            currentItems = fbJson.data.map(function(d) {
              return {
                id: d.id,
                title: d.title,
                url: d.url,                    // HD para el botón "Usar"
                thumbUrl: d.thumbUrl || d.url, // ligero para la cuadrícula
                type: d.type || 'photo',
                dimensions: d.dimensions || 'HD',
                author: d.author || d.source || 'Web Pro',
                source: d.source || 'Web Pro'
              };
            });
            renderGrid(currentItems);
            return;
          }
        }
      } catch (err) {}

      renderGrid([]);
    }

    function doSubmitSearch() {
      var q = document.getElementById('searchInput').value.trim();
      if (q) loadSearch(q);
    }

    function quickTagSearch(tag) {
      document.getElementById('searchInput').value = tag;
      loadSearch(tag);
    }

    function setFilter(type, elem) {
      activeFilter = type;
      var pills = document.querySelectorAll('.filter-pill');
      pills.forEach(function(p) { p.classList.remove('active'); });
      elem.classList.add('active');
      renderGrid(currentItems);
    }

    // Escucha mensajes del padre (React) para cambiar la búsqueda sin recargar iframe
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'MAGNIFIC_SEARCH_QUERY' && e.data.query) {
        loadSearch(e.data.query);
      }
    });

    // Auto-fetch al cargar en lugar de renderizar el array vacío precargado
    loadSearch("${safeQuery}");
  </script>
</body>
</html>`;
}
