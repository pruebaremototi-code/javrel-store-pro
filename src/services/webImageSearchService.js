/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Servicio de Búsqueda Visual — JavrelStore v2.14 Enterprise
 * Dos motores claramente separados:
 *
 *   1. CATÁLOGO WEB PRO (este servicio):
 *      /api/web-image-search → Openverse + Wikimedia + DuckDuckGo + Bing.
 *      Resultados etiquetados como "Web Pro · <banco>".
 *
 *   2. MAGNIFIC (servidor MCP, intacto):
 *      /api/magnific-search → MCP JSON-RPC → API REST → catálogo oficial.
 *      Se consume desde la pestaña Magnific del modal y su iframe Live Studio.
 *
 * La clave/token de Magnific NUNCA se pide ni se almacena en el navegador:
 * vive solo en las variables de entorno del servidor (Vercel).
 *
 * Pipeline de compresión compartido (Canvas):
 *   1. URL HD (item.url, nunca el thumbnail) → Canvas → WebP (#FFFFFF 800×800 <50KB)
 *   2. Fetch blob → Canvas → WebP
 *   3. Proxy serverless → Canvas → WebP
 *   4. Thumbnail fallback → Canvas → WebP
 *   5. URL directa (último recurso)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { imageOptimizer } from './imageOptimizer.js';

export const webImageSearchService = {
  // Metadatos de la última búsqueda Web Pro (para mostrar el motor en la UI).
  lastEngine: 'idle',
  lastError: '',

  /**
   * Eleva la resolución de una URL del CDN de Magnific/Freepik.
   * El CDN acepta `w` para servir la misma imagen a mayor tamaño sin recortar.
   */
  upgradeHdUrl(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
    try {
      const url = new URL(imageUrl, window.location.origin);
      const host = url.hostname.toLowerCase();
      const isMagnificCdn =
        host === 'img.freepik.com' ||
        host.endsWith('.freepik.com') ||
        host.endsWith('.magnific.com') ||
        host.endsWith('.cdnpk.net');
      if (!isMagnificCdn) return imageUrl;
      const current = Number(url.searchParams.get('w') || 0);
      if (!current || current < 1200) url.searchParams.set('w', '1600');
      url.searchParams.delete('h');
      url.searchParams.delete('crop');
      return url.toString();
    } catch {
      return imageUrl;
    }
  },

  /**
   * CATÁLOGO WEB PRO — búsqueda global en bancos y contenedores gratuitos.
   * Procesa cualquier término abierto ("estuche", "carcasa", "mouse gamer"...)
   * y devuelve 15-20 imágenes reales etiquetadas como "Web Pro".
   * No consulta Magnific: ese motor tiene su propio flujo MCP.
   */
  async searchWebProImages(query, category = '', limit = 20) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery) return [];

    const targetLimit = Math.min(Math.max(Number(limit) || 20, 15), 30);

    this.lastEngine = 'idle';
    this.lastError = '';

    try {
      const url = `/api/web-image-search?term=${encodeURIComponent(
        cleanQuery
      )}&limit=${targetLimit}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);

      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        this.lastEngine = json.engine || 'webpro';
        this.lastError = '';

        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data.slice(0, targetLimit).map((item, idx) => ({
            id: item.id || `webpro-${idx}`,
            title: item.title || `${cleanQuery} #${idx + 1}`,
            // HD para el botón "Usar"; thumbUrl solo para la cuadrícula.
            url: this.upgradeHdUrl(item.url),
            thumbUrl: item.thumbUrl || item.url,
            dimensions: item.dimensions || 'HD',
            badge: item.badge || 'Web Pro HD',
            source: item.source || 'Web Pro',
            sourceType: 'webpro',
            author: item.author || '',
            license: item.license || '',
            resourceUrl: item.resourceUrl || '',
          }));
        }
      }
    } catch (netErr) {
      this.lastError = netErr.message;
      console.warn('[WebProSearch] Endpoint falló:', netErr.message);
    }

    // Sin resultados: array vacío, sin prompts de clave ni errores bloqueantes.
    this.lastEngine = 'empty';
    return [];
  },

  /**
   * Compatibilidad con flujos existentes (importación, relleno de fotos).
   * Siempre usa el catálogo Web Pro, nunca Magnific.
   */
  async searchMultipleImages(query, category = '', limit = 20) {
    return this.searchWebProImages(query, category, limit);
  },

  /**
   * Devuelve la primera URL HD del catálogo Web Pro para un producto.
   * Usado por la importación masiva y el relleno automático de fotos.
   */
  async searchProductImage(name, category = '', brand = '') {
    const term = [name, brand].filter(Boolean).join(' ').trim() || name;
    const results = await this.searchWebProImages(term, category, 5);
    return results[0]?.url || '';
  },

  /**
   * Pipeline Canvas WebP con Fondo Blanco:
   * Descarga la imagen HD, la dibuja en <canvas> con fondo #FFFFFF,
   * centrada 800×800 px, y exporta WebP comprimido (<50 KB).
   *
   * Los CDN de Magnific/Freepik no exponen CORS, así que para ellos se usa
   * primero el proxy serverless (mismo origen) y se evitan errores de consola.
   */
  async fetchAndCompressWebP(imageUrl, thumbUrl = null) {
    if (!imageUrl) throw new Error('URL de imagen no proporcionada');

    // Prioriza siempre la rendición de alta resolución.
    const hdUrl = this.upgradeHdUrl(imageUrl);

    const opts = {
      maxWidth: 800,
      maxHeight: 800,
      initialQuality: 0.85,
      targetMaxKb: 50,
      forceSquare: true,
      backgroundColor: '#FFFFFF',
      padding: 24,
    };

    const compressFromUrl = (url) => imageOptimizer.compressToWebP(url, opts);

    const compressFromProxy = async (url) => {
      const proxyUrl = `/api/magnific-search?proxyUrl=${encodeURIComponent(url)}`;
      const proxyRes = await fetch(proxyUrl);
      if (!proxyRes.ok) throw new Error(`proxy HTTP ${proxyRes.status}`);
      const blob = await proxyRes.blob();
      return imageOptimizer.compressToWebP(blob, opts);
    };

    const compressFromBlobFetch = async (url) => {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      return imageOptimizer.compressToWebP(blob, opts);
    };

    let isMagnificCdn = false;
    try {
      const host = new URL(hdUrl, window.location.origin).hostname.toLowerCase();
      isMagnificCdn =
        host === 'img.freepik.com' ||
        host.endsWith('.freepik.com') ||
        host.endsWith('.magnific.com') ||
        host.endsWith('.cdnpk.net');
    } catch {
      isMagnificCdn = false;
    }

    if (isMagnificCdn) {
      // 1. CDN de Magnific: el proxy evita el bloqueo CORS y preserva la HD.
      try {
        return await compressFromProxy(hdUrl);
      } catch (proxyErr) {
        console.warn('[fetchAndCompressWebP] Proxy HD falló:', proxyErr.message);
      }
      // 2. Intento directo (por si el CDN habilita CORS en el futuro).
      try {
        return await compressFromUrl(hdUrl);
      } catch (err) {
        console.warn('[fetchAndCompressWebP] Directo falló:', err.message);
      }
    } else {
      // 1. Intento directo con la URL principal de alta resolución
      try {
        return await compressFromUrl(hdUrl);
      } catch (err) {
        console.warn('[fetchAndCompressWebP] Directo falló:', err.message);
      }

      // 2. Fetch blob directo (bypass de CORS si el servidor lo permite)
      try {
        return await compressFromBlobFetch(hdUrl);
      } catch (blobErr) {
        console.warn('[fetchAndCompressWebP] Blob directo falló:', blobErr.message);
      }

      // 3. Proxy serverless (/api/magnific-search?proxyUrl=...) para bypass CORS
      try {
        return await compressFromProxy(hdUrl);
      } catch (proxyErr) {
        console.warn('[fetchAndCompressWebP] Proxy serverless falló:', proxyErr.message);
      }
    }

    // 4. Usar thumbUrl como alternativa
    if (thumbUrl && thumbUrl !== hdUrl) {
      try {
        return await compressFromUrl(thumbUrl);
      } catch (_) {
        /* continuar */
      }

      try {
        return await compressFromProxy(thumbUrl);
      } catch (thumbErr) {
        console.warn('[fetchAndCompressWebP] Proxy thumbnail falló:', thumbErr.message);
      }
    }

    // 5. Último recurso: devolver la URL HD tal cual
    console.warn('[fetchAndCompressWebP] Todos los intentos fallaron, devolviendo URL directa');
    return { dataUrl: hdUrl, compressedSizeKb: 0 };
  },
};
