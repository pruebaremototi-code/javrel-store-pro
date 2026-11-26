/**
 * api/image-proxy.js — Vercel Serverless Function
 * Proxy same-origin para cargar imágenes externas (Supabase Storage / CDNs)
 * sin bloqueos CORS al exportar tarjetas PNG en Canvas 2D.
 */

const ALLOWED_PROTOCOLS = /^https?:\/\//i;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const targetUrl = String(req.query?.url || '').trim();
  if (!targetUrl || !ALLOWED_PROTOCOLS.test(targetUrl)) {
    return res.status(400).json({ error: 'Invalid url parameter' });
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!contentType.startsWith('image/')) {
      return res.status(415).json({ error: 'Unsupported media type' });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(buffer);
  } catch (err) {
    console.warn('[image-proxy] Error fetching image:', err?.message || err);
    return res.status(502).json({ error: 'Failed to fetch upstream image' });
  }
}
