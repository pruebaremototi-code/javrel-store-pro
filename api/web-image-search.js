// ═══════════════════════════════════════════════════════════════════════════════
// Vercel Serverless Function: Catálogo Web Pro — JavrelStore v2.14
// Motor independiente del de Magnific: bancos y contenedores globales gratuitos.
//
// Fuentes (en paralelo, tolerantes a fallos):
//   1. Openverse (agregador de imágenes libres/comerciales)
//   2. Wikimedia Commons (namespace 6 = archivos)
//   3. DuckDuckGo Images
//   4. Bing Images
//
// Todas las imágenes se etiquetan como "Web Pro" y nunca se presentan como
// resultados de Magnific. El motor MCP de Magnific vive en /api/magnific-search.
// ═══════════════════════════════════════════════════════════════════════════════

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const WEB_PRO_TIMEOUT = 8000;

const isHttpUrl = (value) =>
  typeof value === 'string' && /^https?:\/\//i.test(value);

const isUsableImageUrl = (value) =>
  isHttpUrl(value) &&
  !/\.svg(?:\?|$)/i.test(value) &&
  !value.startsWith('data:');

function cleanText(value, fallback = 'Web Pro') {
  return String(value || fallback)
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function makeItem({
  id,
  title,
  url,
  thumbUrl,
  width = 0,
  height = 0,
  source,
  author = '',
  license = '',
  resourceUrl = '',
}) {
  if (!isUsableImageUrl(url)) return null;

  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const is4k = w >= 1200 || h >= 1200;

  return {
    id,
    title: cleanText(title),
    url,
    thumbUrl: isUsableImageUrl(thumbUrl) ? thumbUrl : url,
    dimensions: w && h ? `${w}x${h}` : 'HD',
    width: w,
    height: h,
    badge: is4k ? 'Web Pro 4K' : 'Web Pro HD',
    source: source ? `Web Pro · ${source}` : 'Web Pro',
    sourceType: 'webpro',
    sourceEngine: 'webpro',
    author: author || source || 'Web Pro',
    license,
    resourceUrl,
  };
}

// ── Fuente 1: Openverse (agregador global de imágenes libres) ────────────────
async function searchOpenverse(term, limit) {
  const params = new URLSearchParams();
  params.set('q', term);
  params.set('page_size', String(Math.min(Math.max(limit, 1), 20)));
  params.set('license_type', 'commercial');
  params.set('extension', 'jpg,png,webp');
  params.set('mature', 'false');

  const res = await fetch(`https://api.openverse.org/v1/images/?${params.toString()}`, {
    headers: {
      'User-Agent': 'JavrelStore/2.14 (https://mercado-tecnologico.vercel.app)',
      Accept: 'application/json',
      'Accept-Language': 'es-CO,es;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(WEB_PRO_TIMEOUT),
  });

  if (!res.ok) return [];

  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];

  return results
    .map((r, index) =>
      makeItem({
        id: `webpro-openverse-${r.id || index}`,
        title: r.title || r.description || `${term} #${index + 1}`,
        url: r.url,
        thumbUrl: r.thumbnail,
        width: r.width,
        height: r.height,
        source: r.source ? `Openverse / ${r.source}` : 'Openverse',
        author: r.creator || '',
        license: [r.license, r.license_version].filter(Boolean).join(' '),
        resourceUrl: r.foreign_landing_url || '',
      })
    )
    .filter(Boolean);
}

// ── Fuente 2: Wikimedia Commons (archivos reales, namespace 6) ───────────────
async function searchWikimedia(term, limit) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
    term
  )}&gsrnamespace=6&gsrlimit=${Math.min(limit, 30)}&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=800&format=json&origin=*`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'JavrelStore/2.14 (https://mercado-tecnologico.vercel.app)',
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(WEB_PRO_TIMEOUT),
  });

  if (!res.ok) return [];

  const json = await res.json();
  const pages = Object.values(json?.query?.pages || {});
  const items = [];

  for (const page of pages) {
    if (items.length >= limit) break;

    const info = page.imageinfo?.[0];
    if (!info?.url) continue;

    const mime = String(info.mime || '').toLowerCase();
    if (
      info.url.endsWith('.svg') ||
      mime.includes('audio') ||
      mime.includes('pdf') ||
      mime.includes('ogg')
    ) {
      continue;
    }

    const item = makeItem({
      id: `webpro-wiki-${page.pageid || items.length}`,
      title: (page.title || term)
        .replace(/^File:/i, '')
        .replace(/\.[a-zA-Z0-9]+$/, '')
        .replace(/_/g, ' '),
      url: info.url,
      thumbUrl: info.thumburl || info.url,
      width: info.width,
      height: info.height,
      source: 'Wikimedia Commons',
      author: 'Wikimedia Commons',
      license: 'CC / dominio público',
      resourceUrl: info.descriptionurl || '',
    });

    if (item) items.push(item);
  }

  return items;
}

// ── Fuente 3: DuckDuckGo Images (bancos globales indexados) ──────────────────
async function searchDuckDuckGo(term, limit) {
  const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(term)}`, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(WEB_PRO_TIMEOUT),
  });

  if (!tokenRes.ok) return [];

  const html = await tokenRes.text();
  const patterns = [
    /vqd=['"]([^'"&\s]+)/,
    /vqd=([^&'"<>\s]+)/,
    /vqd\\x3d([^&'"\\]+)/,
    /vqd%3[dD]([^&'"]+)/,
  ];

  let vqd = '';
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.length > 5) {
      vqd = match[1];
      break;
    }
  }
  if (!vqd) return [];

  const imgRes = await fetch(
    `https://duckduckgo.com/i.js?l=es-es&o=json&q=${encodeURIComponent(
      term
    )}&vqd=${vqd}&f=,,,,,&p=1`,
    {
      headers: {
        'User-Agent': UA,
        Accept: 'application/json, text/javascript, */*; q=0.01',
        Referer: 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(WEB_PRO_TIMEOUT),
    }
  );

  if (!imgRes.ok) return [];

  const json = await imgRes.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  const seen = new Set();
  const items = [];

  for (const r of results) {
    if (items.length >= limit) break;
    if (!isUsableImageUrl(r.image) || seen.has(r.image)) continue;
    seen.add(r.image);

    const item = makeItem({
      id: `webpro-ddg-${items.length}`,
      title: r.title || `${term} #${items.length + 1}`,
      url: r.image,
      thumbUrl: r.thumbnail,
      width: r.width,
      height: r.height,
      source: r.source ? `DuckDuckGo / ${r.source}` : 'DuckDuckGo',
      author: r.source || '',
      resourceUrl: r.url || '',
    });

    if (item) items.push(item);
  }

  return items;
}

// ── Fuente 4: Bing Images (respaldo de bancos globales) ─────────────────────
async function searchBing(term, limit) {
  const res = await fetch(
    `https://www.bing.com/images/search?q=${encodeURIComponent(
      term
    )}&form=HDRSC3&first=1`,
    {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(WEB_PRO_TIMEOUT),
    }
  );

  if (!res.ok) return [];

  const html = await res.text();
  const murls = [];
  const turls = [];

  const pMurl = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/g;
  const pTurl = /"turl"\s*:\s*"(https?:\/\/[^"]+)"/g;
  let match;
  while ((match = pMurl.exec(html))) murls.push(match[1]);
  while ((match = pTurl.exec(html))) turls.push(match[1]);

  if (murls.length === 0) {
    const pMurlEnc = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
    const pTurlEnc = /turl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
    while ((match = pMurlEnc.exec(html))) murls.push(decodeURIComponent(match[1]));
    while ((match = pTurlEnc.exec(html))) turls.push(decodeURIComponent(match[1]));
  }

  if (murls.length === 0) {
    const pImgUrl = /imgurl=(https?[^&"'<>\s]+)/gi;
    while ((match = pImgUrl.exec(html))) murls.push(decodeURIComponent(match[1]));
  }

  const seen = new Set();
  const items = [];

  for (let i = 0; i < murls.length && items.length < limit; i++) {
    const url = murls[i];
    if (!isUsableImageUrl(url) || seen.has(url)) continue;
    seen.add(url);

    const item = makeItem({
      id: `webpro-bing-${items.length}`,
      title: `${term} — Imagen ${items.length + 1}`,
      url,
      thumbUrl: turls[i],
      source: 'Bing Images',
      author: 'Bing Images',
    });

    if (item) items.push(item);
  }

  return items;
}

function dedupe(items, limit) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!item?.url || seen.has(item.url)) continue;
    seen.add(item.url);
    result.push(item);
    if (result.length >= limit) break;
  }

  return result;
}

export default async function handler(req, res) {
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

  const term = (req.query?.term || req.query?.query || req.query?.q || '').trim();
  const limit = Math.min(Math.max(Number(req.query?.limit) || 20, 1), 30);

  if (!term) {
    return res.status(200).json({
      success: true,
      engine: 'webpro',
      count: 0,
      data: [],
    });
  }

  const settled = await Promise.allSettled([
    searchOpenverse(term, limit),
    searchWikimedia(term, limit),
    searchDuckDuckGo(term, limit),
    searchBing(term, limit),
  ]);

  const labels = ['Openverse', 'Wikimedia', 'DuckDuckGo', 'Bing'];
  const engineNames = [];
  const buckets = [];

  settled.forEach((result, index) => {
    if (result.status !== 'fulfilled' || result.value.length === 0) return;
    engineNames.push(labels[index]);
    buckets.push(result.value);
  });

  // Intercalado round-robin: ninguna fuente monopoliza la cuadrícula, así el
  // administrador ve una mezcla real de bancos globales (Web Pro).
  const collected = [];
  const target = limit * 3;
  for (let cursor = 0; collected.length < target; cursor++) {
    let added = false;
    for (const bucket of buckets) {
      if (cursor < bucket.length) {
        collected.push(bucket[cursor]);
        added = true;
        if (collected.length >= target) break;
      }
    }
    if (!added) break;
  }

  const data = dedupe(collected, limit);

  return res.status(200).json({
    success: true,
    engine: 'webpro',
    source:
      data.length > 0
        ? `Web Pro (${engineNames.join(' + ')})`
        : 'Web Pro (sin resultados)',
    count: data.length,
    data,
  });
}
