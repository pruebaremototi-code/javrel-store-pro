// Vercel Serverless Function: Sincronización Global de Catálogo y Configuración
// Garantiza persistencia multi-dispositivo inmediata (PC <-> Celulares Android / iOS)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://mnwockpzhhbcavqehrdy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_R3yoD44f33EvVPUu0A7jbg_mc_DJKTF';

const supabase = createClient(supabaseUrl, supabaseKey);

// Memoria compartida en runtime serverless de Vercel como capa de aceleración
let cachedStore = null;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value.trim());

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET: Obtener el estado global sincronizado para cualquier dispositivo
  if (req.method === 'GET') {
    try {
      // 1. Intentar consultar Supabase en vivo
      const { data: dbProducts, error: pError } = await supabase.from('products').select('*');
      const { data: dbCategories, error: cError } = await supabase.from('categories').select('*');

      let products = null;
      let categories = null;

      if (!pError && Array.isArray(dbProducts)) {
        products = dbProducts.map((p) => {
          const mainImg = p.image_url || p.image || '/zafra/logo-menu.webp';
          const secImages = Array.isArray(p.additional_images)
            ? p.additional_images.filter((img) => img && typeof img === 'string')
            : [];
          const allImages = [mainImg, ...secImages.filter((img) => img !== mainImg)];
          const rawCondition =
            p.condition ||
            (Array.isArray(p.specs) &&
              p.specs.find((s) => s && s.key === 'CONDICIÓN')?.value) ||
            'Nuevo';
          const commTag = p.commercial_tag || p.badge || '';

          return {
            id: p.id,
            name: p.title || p.name,
            price: Number(p.price || 0),
            originalPrice: p.original_price ? Number(p.original_price) : null,
            image: mainImg,
            images: allImages,
            additional_images: secImages,
            condition: rawCondition,
            commercialTag: commTag,
            category: p.category_id || p.category,
            description: p.description,
            stock: p.stock,
            specs: p.specs || [],
            brand: p.brand || '',
            brandId: p.brand_id || null,
            badge: commTag || p.badge || '',
            rating: p.rating,
            reviews: p.reviews,
            featured: p.featured ?? p.is_featured ?? false,
          };
        });

        // La base de datos es la fuente de verdad absoluta:
        // actualizamos cachedStore para que refleje fielmente las eliminaciones
        cachedStore = {
          ...cachedStore,
          products,
          timestamp: Date.now(),
        };
      }

      if (!cError && dbCategories && dbCategories.length > 0) {
        categories = dbCategories;
      }

      return res.status(200).json({
        success: true,
        products: products || (cachedStore?.products) || null,
        categories: categories || (cachedStore?.categories) || null,
        config: cachedStore?.config || null,
        timestamp: cachedStore?.timestamp || Date.now(),
      });
    } catch (err) {
      console.warn('Sync GET error:', err);
      return res.status(200).json({
        success: true,
        products: cachedStore?.products || null,
        categories: cachedStore?.categories || null,
        config: cachedStore?.config || null,
        timestamp: cachedStore?.timestamp || Date.now(),
      });
    }
  }

  // POST: Guardar cambios desde Administrador (PC) y propagar a todos los dispositivos
  if (req.method === 'POST') {
    const { products, categories, config, action, deletedId, deletedIds } = req.body || {};

    // Manejo de eliminación atómica: purga inmediata de memoria y BD
    if (action === 'delete') {
      const idsToDelete = [
        ...(deletedId ? [String(deletedId).trim()] : []),
        ...(Array.isArray(deletedIds) ? deletedIds.map((id) => String(id).trim()) : []),
      ];

      if (idsToDelete.length > 0) {
        try {
          await supabase.from('products').delete().in('id', idsToDelete);
          for (const singleId of idsToDelete) {
            if (!isNaN(Number(singleId))) {
              await supabase.from('products').delete().eq('id', Number(singleId));
            }
          }
        } catch (e) {
          console.warn('[sync-store] Delete error:', e);
        }

        if (Array.isArray(cachedStore?.products)) {
          const deleteSet = new Set(idsToDelete);
          cachedStore.products = cachedStore.products.filter(
            (p) => !deleteSet.has(String(p.id).trim())
          );
        }
      }

      if (Array.isArray(products)) {
        cachedStore = {
          ...cachedStore,
          products,
          timestamp: Date.now(),
        };
      }

      return res.status(200).json({
        success: true,
        message: 'Eliminación atómica propagada exitosamente.',
        timestamp: Date.now(),
      });
    }

    cachedStore = {
      products: products !== undefined ? products : cachedStore?.products,
      categories: categories !== undefined ? categories : cachedStore?.categories,
      config: config !== undefined ? config : cachedStore?.config,
      timestamp: Date.now(),
    };

    // Intentar sincronizar productos en Supabase si es posible
    if (products && Array.isArray(products)) {
      const basePayload = products.map((p) => {
        const mainImg = p.image || p.image_url || '';
        const secImages = Array.isArray(p.images)
          ? p.images.filter((img) => img && typeof img === 'string' && img !== mainImg)
          : Array.isArray(p.additional_images)
            ? p.additional_images.filter((img) => img && img !== mainImg)
            : [];

        const payload = {
          id: p.id,
          title: p.name || p.title || '',
          price: Number(p.price || 0),
          original_price:
            p.originalPrice !== null && p.originalPrice !== undefined && p.originalPrice !== ''
              ? Number(p.originalPrice)
              : null,
          image_url: mainImg,
          additional_images: secImages,
          whatsapp_link:
            p.whatsappLink || p.whatsapp_link || 'https://wa.me/573000000000',
          description: p.description || '',
          stock: Number(p.stock ?? 10),
        };
        // Solo enviar UUIDs reales: la tabla de producción usa UUID y un slug
        // de texto haría fallar TODO el upsert por "invalid input syntax".
        if (isUuid(p.category)) payload.category_id = p.category.trim();
        if (isUuid(p.brandId)) payload.brand_id = p.brandId.trim();
        return payload;
      });

      const fullPayload = products.map((p, index) => {
        let specs = Array.isArray(p.specs) ? [...p.specs] : [];
        const cond = p.condition || 'Nuevo';
        if (!specs.some((s) => typeof s === 'object' && s?.key === 'CONDICIÓN')) {
          specs.push({ key: 'CONDICIÓN', value: cond });
        }
        return {
          ...basePayload[index],
          brand: p.brand || null,
          badge: p.commercialTag || p.badge || '',
          condition: cond,
          commercial_tag: p.commercialTag || p.badge || '',
          specs,
          rating: p.rating !== undefined ? Number(p.rating) : 5.0,
          reviews: p.reviews !== undefined ? Number(p.reviews) : 0,
          featured: Boolean(p.featured),
          is_featured: Boolean(p.featured),
        };
      });

      const CHUNK_SIZE = 40;
      for (let i = 0; i < fullPayload.length; i += CHUNK_SIZE) {
        const fullChunk = fullPayload.slice(i, i + CHUNK_SIZE);
        const baseChunk = basePayload.slice(i, i + CHUNK_SIZE);
        try {
          const { error } = await supabase.from('products').upsert(fullChunk);
          if (error) {
            // Tabla sin columnas visuales: guardar al menos los campos base.
            const fallback = await supabase.from('products').upsert(baseChunk);
            if (fallback.error) {
              // Aislar filas conflictivas (ids no UUID, constraints, etc.).
              for (const single of fullChunk) {
                const singleRes = await supabase.from('products').upsert(single);
                if (singleRes.error) {
                  console.warn(
                    'Upsert individual desde serverless:',
                    singleRes.error.message
                  );
                }
              }
            }
          }
        } catch (e) {
          console.warn('Upsert a Supabase desde serverless:', e.message);
        }
      }
    }

    // Persistir también las categorías creadas en caliente (UUID + slug).
    if (categories && Array.isArray(categories) && categories.length > 0) {
      const categoryPayload = categories
        .filter((c) => c && c.name)
        .map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug || null,
          icon: c.icon || 'Sparkles',
        }))
        .filter((c) => isUuid(c.id));

      if (categoryPayload.length > 0) {
        try {
          const { error } = await supabase
            .from('categories')
            .upsert(categoryPayload, { onConflict: 'id' });
          if (error) {
            console.warn('Upsert categorías desde serverless:', error.message);
          }
        } catch (e) {
          console.warn('Upsert categorías desde serverless:', e.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Sincronización global aplicada exitosamente.',
      timestamp: cachedStore.timestamp,
    });
  }

  return res.status(405).json({ error: 'Método no soportado.' });
}
