// ═══════════════════════════════════════════════════════════════════════════════
// Vercel Serverless Function: imagen pública de producto — JavrelStore v2.16
//
// Los productos guardan su foto como data URI (WebP base64) en Supabase. Los
// crawlers de Facebook, WhatsApp y TikTok exigen una URL http(s) para og:image,
// así que esta función decodifica la imagen y la sirve como binario cacheable.
// Para imágenes ya públicas (CDN) responde con una redirección.
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_ORIGIN = 'https://mercado-tecnologico.vercel.app';
const DEFAULT_IMAGE = '/zafra/banner-teclado.jpg';
const DEFAULT_SUPABASE_URL = 'https://mnwockpzhhbcavqehrdy.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_R3yoD44f33EvVPUu0A7jbg_mc_DJKTF';

// Caché en memoria de imagen para respuestas a crawlers en <1ms
const imageMemoryCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

const resolveOrigin = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers.host || new URL(FALLBACK_ORIGIN).host;
  return `${forwardedProto || 'https'}://${host}`;
};

async function fetchProductImage(id) {
  if (!id) return null;
  const cacheKey = String(id).trim().toLowerCase();
  const cached = imageMemoryCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  let rowResult = null;
  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?id=eq.${encodeURIComponent(
      id
    )}&select=id,image_url&limit=1`;

    const res = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) rowResult = rows[0];
    }
  } catch (err) {
    console.warn('[ProductImage] Error por id:', err?.message);
  }

  // Intento alternativo por slug
  if (!rowResult) {
    try {
      const slugEndpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?slug=eq.${encodeURIComponent(
        id
      )}&select=id,image_url&limit=1`;

      const slugRes = await fetch(slugEndpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4000),
      });

      if (slugRes.ok) {
        const rows = await slugRes.json();
        if (Array.isArray(rows) && rows.length > 0) rowResult = rows[0];
      }
    } catch (err) {
      console.warn('[ProductImage] Error por slug:', err?.message);
    }
  }

  if (rowResult) {
    imageMemoryCache.set(cacheKey, { data: rowResult, timestamp: Date.now() });
    if (rowResult.id) imageMemoryCache.set(String(rowResult.id).toLowerCase(), { data: rowResult, timestamp: Date.now() });
  }

  return rowResult;
}

const parseDataUri = (value) => {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(value);
  if (!match) return null;

  const mime = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || '';

  try {
    return {
      mime,
      buffer: isBase64
        ? Buffer.from(payload, 'base64')
        : Buffer.from(decodeURIComponent(payload), 'utf8'),
    };
  } catch {
    return null;
  }
};

export default async function handler(req, res) {
  const id = String(
    req.query?.product_id ||
    req.query?.id ||
    req.query?.productId ||
    req.query?.producto ||
    ''
  ).trim();
  const origin = resolveOrigin(req);

  let product = null;
  if (id) {
    try {
      product = await fetchProductImage(id);
    } catch (error) {
      console.warn('[ProductImage] No se pudo consultar la imagen:', error?.message);
    }
  }

  const rawImage = String(
    product?.image_url ||
    product?.image ||
    (Array.isArray(product?.photos) && product.photos.length > 0 ? product.photos[0] : '') ||
    ''
  ).trim();

  // Imagen pública: redirigir al CDN original.
  if (/^https?:\/\//i.test(rawImage)) {
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    return res.redirect(302, rawImage);
  }

  // Imagen embebida: servir binario decodificado.
  if (rawImage.startsWith('data:')) {
    const decoded = parseDataUri(rawImage);
    if (decoded && decoded.buffer.length > 0) {
      res.setHeader('Content-Type', decoded.mime);
      res.setHeader('Content-Length', String(decoded.buffer.length));
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (req.method === 'HEAD') return res.status(200).end();
      return res.status(200).send(decoded.buffer);
    }
  }

  // Ruta relativa o sin foto: usar el banner de la tienda.
  const fallback = /^https?:\/\//i.test(rawImage)
    ? rawImage
    : rawImage
      ? `${origin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
      : `${origin}${DEFAULT_IMAGE}`;

  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
  return res.redirect(302, fallback);
}
