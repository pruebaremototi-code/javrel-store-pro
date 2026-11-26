// ═══════════════════════════════════════════════════════════════════════════════
// Vercel Serverless Function: Open Graph por producto — JavrelStore v2.16
//
// Sirve /p/:id con metadatos Open Graph/Twitter y JSON-LD reales del producto
// para que Facebook, Messenger, WhatsApp y TikTok muestren una previsualización
// profesional. Después redirige al visitante a la ficha interactiva del SPA.
// ═══════════════════════════════════════════════════════════════════════════════

const FALLBACK_ORIGIN = 'https://www.javrelstore.shop';
const STORE_NAME = 'JavrelStore';
const DEFAULT_IMAGE = '/og-image.png?v=4';
const DEFAULT_SUPABASE_URL = 'https://mnwockpzhhbcavqehrdy.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_R3yoD44f33EvVPUu0A7jbg_mc_DJKTF';

// Caché en memoria ultra-rápida (0ms para crawlers repetidos de WhatsApp / redes)
const productMemoryCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const cleanText = (value, maxLength = 300) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const formatCop = (value) => {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$ ${amount}`;
  }
};

async function fetchProduct(id) {
  if (!id) return null;
  const cacheKey = String(id).trim().toLowerCase();
  const cached = productMemoryCache.get(cacheKey);
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

  let productResult = null;
  try {
    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?id=eq.${encodeURIComponent(
      id
    )}&select=*&limit=1`;

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
      if (Array.isArray(rows) && rows.length > 0) {
        productResult = rows[0];
      }
    }
  } catch (err) {
    console.warn('[ProductShareOG] Error consultando producto por ID:', err?.message);
  }

  // Intento alternativo por slug o referencia
  if (!productResult) {
    try {
      const slugEndpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?slug=eq.${encodeURIComponent(
        id
      )}&select=*&limit=1`;
      const slugRes = await fetch(slugEndpoint, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4000),
      });
      if (slugRes.ok) {
        const slugRows = await slugRes.json();
        if (Array.isArray(slugRows) && slugRows.length > 0) {
          productResult = slugRows[0];
        }
      }
    } catch {}
  }

  // Intento alternativo C: búsqueda por coincidencia parcial de título o referencia a partir del slug
  if (!productResult && id) {
    try {
      const words = String(id).split('-').filter((w) => w.length > 2);
      if (words.length > 0) {
        const queryTerm = encodeURIComponent(`%${words.slice(0, 3).join('%')}%`);
        const searchEndpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/products?or=(title.ilike.${queryTerm},name.ilike.${queryTerm},reference.ilike.${queryTerm})&select=*&limit=1`;
        const searchRes = await fetch(searchEndpoint, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(4000),
        });
        if (searchRes.ok) {
          const searchRows = await searchRes.json();
          if (Array.isArray(searchRows) && searchRows.length > 0) {
            productResult = searchRows[0];
          }
        }
      }
    } catch {}
  }

  if (productResult) {
    productMemoryCache.set(cacheKey, { data: productResult, timestamp: Date.now() });
    if (productResult.id) productMemoryCache.set(String(productResult.id).toLowerCase(), { data: productResult, timestamp: Date.now() });
    if (productResult.slug) productMemoryCache.set(String(productResult.slug).toLowerCase(), { data: productResult, timestamp: Date.now() });
  }

  return productResult;
}

export default async function handler(req, res) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const host = req.headers.host || new URL(FALLBACK_ORIGIN).host;
  const origin = `${forwardedProto || 'https'}://${host}`;

  const id = String(
    req.query?.id ||
    req.query?.product_id ||
    req.query?.productId ||
    req.query?.producto ||
    ''
  ).trim();

  // Las personas van directo a la ficha interactiva del SPA (en milisegundos, sin esperar
  // a la base de datos ni provocar retrasos). Los rastreadores sociales sí reciben el HTML con Open Graph.
  const userAgent = String(req.headers['user-agent'] || '').trim();
  const isSocialCrawler =
    /^WhatsApp\//i.test(userAgent) ||
    /facebookexternalhit|facebot|twitterbot|telegrambot|linkedinbot|slackbot|discordbot|pinterest|googlebot|bingbot/i.test(
      userAgent
    );

  if (!isSocialCrawler) {
    const redirectUrl = id
      ? `${origin}/?product_id=${encodeURIComponent(id)}`
      : `${origin}/`;
    res.statusCode = 302;
    res.setHeader('Location', redirectUrl);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.end();
  }

  let product = null;

  if (id) {
    try {
      product = await fetchProduct(id);
    } catch (error) {
      console.warn('[ProductShareOG] No se pudo consultar el producto:', error?.message);
    }
  }

  const name = cleanText(product?.title || product?.name || 'Tecnología prémium', 120);
  const brand = cleanText(product?.brand || STORE_NAME, 60);
  const description = cleanText(
    product?.description ||
      `${name} disponible en ${STORE_NAME}. Envío asegurado a todo el país y atención inmediata.`,
    300
  );

  const rawImage = String(product?.image_url || product?.image || '').trim();
  // Los crawlers sociales no aceptan data URIs: si la foto está embebida en
  // Supabase se sirve binaria desde /api/product-image. Las URLs públicas
  // (Unsplash/CDN) se usan directamente.
  const imageUrl = /^https?:\/\//i.test(rawImage)
    ? rawImage
    : product && id
      ? `${origin}/api/product-image?id=${encodeURIComponent(id)}`
      : rawImage && !rawImage.startsWith('data:')
        ? `${origin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`
        : `${origin}${DEFAULT_IMAGE}`;

  const price = Number(product?.price) || 0;
  const originalPrice = Number(product?.original_price ?? product?.originalPrice) || 0;
  const hasOffer = originalPrice > price && price > 0;
  const stock = Number(product?.stock ?? 10);

  const shareUrl = id
    ? `${origin}/?product_id=${encodeURIComponent(id)}`
    : `${origin}/`;

  const discount = hasOffer
    ? Math.max(1, Math.round(((originalPrice - price) / originalPrice) * 100))
    : 0;
  const priceLine =
    price > 0
      ? `${formatCop(price)}${hasOffer ? ` · ${discount}% OFF` : ''} · Compra protegida`
      : '';

  const ogTitle = `${name} | ${STORE_NAME}`;
  const ogDescription = cleanText(priceLine || description, 140);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: [imageUrl],
    description,
    brand: { '@type': 'Brand', name: brand },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'COP',
      price: price || undefined,
      availability:
        stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: shareUrl,
    },
  };

  const safeJsonLd = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns# product: https://ogp.me/ns/product#">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="canonical" href="${escapeHtml(shareUrl)}" />
    <title>${escapeHtml(ogTitle)}</title>
    <meta name="description" content="${escapeHtml(ogDescription)}" />
    <meta name="robots" content="noindex, follow" />

    <meta property="og:type" content="product" />
    <meta property="og:site_name" content="${escapeHtml(STORE_NAME)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDescription)}" />
    <meta property="og:url" content="${escapeHtml(shareUrl)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:alt" content="${escapeHtml(name)}" />
    <meta property="og:locale" content="es_CO" />
    ${
      price > 0
        ? `<meta property="product:price:amount" content="${price}" />
    <meta property="product:price:currency" content="COP" />`
        : ''
    }

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(name)}" />

    <script type="application/ld+json">${safeJsonLd}</script>
    <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: radial-gradient(circle at 80% 0%, #e8f1ff 0%, #f8fafc 55%);
        color: #0f172a;
        font-family: 'Instrument Sans', system-ui, -apple-system, sans-serif; }
      .card { width: min(92vw, 440px); padding: 28px; text-align: center; background: #fff;
        border: 1px solid #e2e8f0; border-radius: 26px;
        box-shadow: 0 24px 55px -20px rgba(10,108,255,.22), 0 8px 20px rgba(15,23,42,.05); }
      img { width: 100%; max-height: 230px; object-fit: contain; margin-bottom: 14px; }
      .badge { display: inline-block; margin-bottom: 10px; padding: 5px 11px; border-radius: 999px;
        background: #e8f1ff; color: #0a6cff; font-size: 10px; font-weight: 800;
        letter-spacing: .12em; text-transform: uppercase; }
      h1 { font-size: 19px; line-height: 1.3; margin: 0 0 8px; letter-spacing: -.01em; }
      .desc { font-size: 13px; line-height: 1.55; color: #64748b; margin: 0 0 14px; }
      .price { display: flex; align-items: baseline; justify-content: center; gap: 10px;
        margin: 0 0 18px; flex-wrap: wrap; }
      .price strong { font-size: 26px; color: #0a6cff; letter-spacing: -.02em; }
      .price s { font-size: 13px; color: #94a3b8; }
      .cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%; box-sizing: border-box; padding: 14px 22px; border-radius: 999px;
        background: linear-gradient(135deg, #0a6cff, #0056d2); color: #fff !important;
        font-size: 14px; font-weight: 800; text-decoration: none;
        box-shadow: 0 12px 24px -10px rgba(10,108,255,.65); transition: transform .2s ease; }
      .cta:hover { transform: translateY(-1px); }
      .store { margin: 14px 0 0; font-size: 11px; color: #94a3b8; }
      .store b { color: #475569; }
      a { color: #0a6cff; font-weight: 700; text-decoration: none; }
    </style>
  </head>
  <body>
    <div class="card">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" />
      ${hasOffer ? '<span class="badge">Oferta exclusiva</span>' : '<span class="badge">Disponible ahora</span>'}
      <h1>${escapeHtml(name)}</h1>
      <p class="desc">${escapeHtml(description)}</p>
      ${
        price > 0
          ? `<div class="price"><strong>${escapeHtml(formatCop(price))}</strong>${
              hasOffer ? `<s>${escapeHtml(formatCop(originalPrice))}</s>` : ''
            }</div>`
          : ''
      }
      <a class="cta" href="${escapeHtml(redirectUrl)}">Ver en Tienda →</a>
      <p class="store"><b>${escapeHtml(STORE_NAME)}</b> · Envío asegurado y atención inmediata</p>
    </div>
    <script>
      window.location.replace(${JSON.stringify(redirectUrl)});
    </script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
  return res.status(200).send(html);
}
