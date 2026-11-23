import { supabase } from '../supabaseClient';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_CONFIG } from '../data/initialData';
import {
  ensureUuid,
  generateUuid,
  isUuid,
  slugify,
  sanitizeCommercialText,
  cleanBrand,
} from './textUtils';

const STORAGE_KEYS = {
  PRODUCTS: 'super_wow_products_v2',
  CATEGORIES: 'super_wow_categories_v2',
  CONFIG: 'super_wow_config_v2',
  CUSTOMIZATIONS: 'javrelstore_customizations_v1',
  LAST_SYNC: 'super_wow_last_sync_timestamp',
  PURGED_PRODUCTS: 'javrelstore_purged_products_v1',
};

/**
 * Sanitiza URLs de imagen antes de enviarlas a Supabase.
 * - URLs externas (https://...) → se pasan tal cual (referencia directa, 0 bytes en BD)
 * - dataUrls/base64 ≤150KB → se aceptan como fallback temporal
 * - dataUrls/base64 >150KB (cadenas pesadas) → se bloquean y se sustituyen por ''
 *   para no saturar la columna TEXT de Supabase ni el ancho de banda de Vercel.
 */
const sanitizeImageUrl = (src) => {
  if (!src || typeof src !== 'string') return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src.trim();
  if (src.startsWith('data:')) {
    // Bloquear base64 pesados (>150KB en caracteres ~ 200KB binario)
    if (src.length > 150 * 1024) {
      console.warn('[storeService] Base64 pesado bloqueado (>150KB). Usar imageOptimizer.processLocalImage primero.');
      return '';
    }
    return src;
  }
  return src.trim();
};

// Utilidad de formateo de moneda colombiana / regional
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '$ 0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
};

// Generar link de WhatsApp con mensaje estructurado
export const buildWhatsAppUrl = (phone, text) => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const encodedText = encodeURIComponent(text || '');
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
};

/**
 * Devuelve un enlace de WhatsApp válido para la columna NOT NULL
 * `products.whatsapp_link` de producción.
 */
const getStoreWhatsAppLink = () => {
  try {
    const cfg = JSON.parse(localStorage.getItem(STORAGE_KEYS.CONFIG) || '{}');
    const phone = String(cfg.whatsappNumber || '').replace(/\D/g, '');
    if (phone) return `https://wa.me/${phone}`;
  } catch {
    // Ignorar configuración corrupta
  }
  return 'https://wa.me/573000000000';
};

/**
 * Construye el payload de Supabase para un producto.
 *
 * La tabla `products` del proyecto puede tener dos esquemas históricos:
 *   A) title / image_url / category_id (esquema actual en producción)
 *   B) name / image / category / brand / badge / specs (esquema inicial documentado)
 *
 * `includeVisualFields` intenta el payload completo. Si la base de datos aún no
 * tiene las columnas visuales, `syncAllToSupabaseAndGlobal` reintenta con el
 * payload base para no perder precios, títulos, descripciones ni stock.
 */
const buildProductPayload = (
  product,
  includeVisualFields = true,
  resolvedCategoryId = null,
  resolvedBrandId = null
) => {
  const cleanId = ensureUuid(product.id);
  const cleanCategoryId = isUuid(resolvedCategoryId || product.category)
    ? String(resolvedCategoryId || product.category).trim()
    : null;
  const cleanBrandId = isUuid(resolvedBrandId || product.brandId)
    ? String(resolvedBrandId || product.brandId).trim()
    : null;

  const mainImage = sanitizeImageUrl(product.image || product.image_url || '') || '/zafra/logo-menu.webp';
  const secondaryImages = (
    Array.isArray(product.images)
      ? product.images.filter((img) => img && typeof img === 'string' && img !== (product.image || product.image_url || ''))
      : Array.isArray(product.additional_images)
        ? product.additional_images.filter((img) => img && img !== (product.image || product.image_url || ''))
        : []
  ).map(sanitizeImageUrl).filter(Boolean);

  const payload = {
    id: cleanId,
    title: String(product.name || product.title || 'Producto').trim(),
    price: Number(product.price || 0),
    original_price:
      product.originalPrice !== null &&
      product.originalPrice !== undefined &&
      product.originalPrice !== ''
        ? Number(product.originalPrice)
        : null,
    image_url: mainImage,
    additional_images: secondaryImages,
    // whatsapp_link es NOT NULL en producción: sin este campo TODO insert falla.
    whatsapp_link:
      product.whatsappLink ||
      product.whatsapp_link ||
      getStoreWhatsAppLink(),
    description: sanitizeCommercialText(product.description || ''),
    stock: Number(product.stock ?? 10),
  };

  if (cleanCategoryId) payload.category_id = cleanCategoryId;
  if (cleanBrandId) payload.brand_id = cleanBrandId;

  if (includeVisualFields) {
    payload.brand = cleanBrand(product.brand, '') || null;
    payload.badge = product.commercialTag || product.badge || '';

    // Preservar condición física, SKU, EAN, costo y etiquetas dentro de specs (JSONB)
    // para garantizar persistencia fiel e indestructible en Supabase.
    let specs = Array.isArray(product.specs) ? [...product.specs] : [];

    const setSpecKey = (keyName, val) => {
      if (!val) return;
      const strVal = String(val).trim();
      if (!strVal || strVal === '[object Object]') return;
      const idx = specs.findIndex(
        (s) => typeof s === 'object' && s !== null && (s.key === keyName || s.title === keyName)
      );
      if (idx >= 0) {
        specs[idx] = { key: keyName, value: strVal };
      } else {
        specs.push({ key: keyName, value: strVal });
      }
    };

    setSpecKey('CONDICIÓN', product.condition || 'Nuevo');
    if (product.commercialTag || product.badge) {
      setSpecKey('ETIQUETA', product.commercialTag || product.badge);
    }
    if (product.sku || product.reference) {
      setSpecKey('SKU', product.sku || product.reference);
    }
    if (product.ean || product.barcode) {
      setSpecKey('EAN', product.ean || product.barcode);
    }
    if (product.cost !== undefined && product.cost !== null && product.cost !== '') {
      setSpecKey('COSTO', product.cost);
    }

    payload.specs = specs;
    payload.rating = product.rating !== undefined ? Number(product.rating) : 5.0;
    payload.reviews = product.reviews !== undefined ? Number(product.reviews) : 0;
    payload.featured = Boolean(product.featured);
    payload.is_featured = Boolean(product.featured);
  }

  return payload;
};

const isUuidColumnError = (error) =>
  Boolean(
    error?.message &&
      /invalid input syntax for type uuid|is not a valid uuid|22P02/i.test(error.message)
  );

/**
 * Alias de categorías generadas por IA/importaciones antiguas.
 * Evita crear duplicados cuando el catálogo usa nombres como "Computadores"
 * o "Gamer" y producción ya tiene "computadores-laptops" / "zona-gamer-consolas".
 */
const CATEGORY_ALIASES = {
  computadores: ['computadores-laptops', 'computador', 'laptop', 'laptops', 'portatil', 'portatiles'],
  computador: ['computadores-laptops'],
  laptops: ['computadores-laptops'],
  portatiles: ['computadores-laptops'],
  gamer: ['zona-gamer-consolas'],
  gaming: ['zona-gamer-consolas'],
  consolas: ['zona-gamer-consolas'],
  consola: ['zona-gamer-consolas'],
  videojuegos: ['zona-gamer-consolas'],
  celulares: ['celulares-tablets'],
  celular: ['celulares-tablets'],
  tablets: ['celulares-tablets'],
  smartphones: ['celulares-tablets'],
  telefonos: ['celulares-tablets'],
  audio: ['accesorios-perifericos'],
  audifonos: ['accesorios-perifericos'],
  accesorios: ['accesorios-perifericos'],
  perifericos: ['accesorios-perifericos'],
  impresoras: ['impresoras-escaneres'],
  escaneres: ['impresoras-escaneres'],
};

// Puente de inicialización diferida.
// Las utilidades de taxonomía se declaran antes de storeService, pero solo
// lo invocan en tiempo de llamada (nunca durante la evaluación del módulo),
// evitando así cualquier acceso a una variable en zona muerta temporal (TDZ).
let storeServiceRef = null;

/**
 * Resuelve el UUID de una categoría a partir de su id, slug o nombre.
 * Si la categoría no existe en Supabase la crea en caliente con UUID real.
 */
const resolveCategoryId = async (categoryValue, categoriesCache = null) => {
  const raw = categoryValue === null || categoryValue === undefined ? '' : String(categoryValue).trim();
  if (!raw || raw.toLowerCase() === 'all') return null;

  const cache = categoriesCache || { list: null };
  if (!cache.list) {
    try {
      const { data } = await supabase.from('categories').select('id,name,slug');
      cache.list = Array.isArray(data) ? data : [];
    } catch {
      cache.list = [];
    }
  }

  const needle = raw.toLowerCase();
  const found = cache.list.find((cat) => {
    const id = String(cat.id || '').toLowerCase();
    const slug = String(cat.slug || '').toLowerCase();
    const name = String(cat.name || '').toLowerCase();
    return id === needle || slug === needle || name === needle;
  });
  if (found?.id) return found.id;

  // Coincidencia por alias (computadores → computadores-laptops, gamer → zona-gamer-consolas…)
  const aliasKey = slugify(raw);
  const aliasTargets = CATEGORY_ALIASES[aliasKey] || [];
  if (aliasTargets.length > 0) {
    const byAlias = cache.list.find((cat) => {
      const slug = String(cat.slug || '').toLowerCase();
      const nameSlug = slugify(cat.name || '');
      return aliasTargets.some(
        (target) =>
          slug === target ||
          nameSlug === target ||
          (slug && slug.includes(target)) ||
          (nameSlug && nameSlug.includes(target))
      );
    });
    if (byAlias?.id) return byAlias.id;
  }

  // Coincidencia parcial segura (evita duplicados por plurales o guiones).
  if (aliasKey.length >= 4) {
    const partial = cache.list.find((cat) => {
      const slug = String(cat.slug || '').toLowerCase();
      const nameSlug = slugify(cat.name || '');
      return (
        (slug && (slug.includes(aliasKey) || aliasKey.includes(slug))) ||
        (nameSlug && (nameSlug.includes(aliasKey) || aliasKey.includes(nameSlug)))
      );
    });
    if (partial?.id) return partial.id;
  }

  if (isUuid(raw)) return raw;

  // No existe: crear categoría con UUID y slug reales.
  const created = await storeServiceRef.addCategory({ name: raw });
  if (created?.id && created.persisted !== false) {
    cache.list.push({ id: created.id, name: created.name, slug: created.slug });
    return created.id;
  }
  return null;
};

/** Resuelve el UUID de una marca, creándola en Supabase si aún no existe. */
const resolveBrandId = async (brandName, brandsCache = null) => {
  const raw = brandName === null || brandName === undefined ? '' : String(brandName).trim();
  if (!raw) return null;

  const cache = brandsCache || { list: null };
  if (!cache.list) {
    try {
      const { data } = await supabase.from('brands').select('id,name,slug');
      cache.list = Array.isArray(data) ? data : [];
    } catch {
      cache.list = [];
    }
  }

  const needle = raw.toLowerCase();
  const found = cache.list.find((brand) => {
    const id = String(brand.id || '').toLowerCase();
    const slug = String(brand.slug || '').toLowerCase();
    const name = String(brand.name || '').toLowerCase();
    return id === needle || slug === needle || name === needle;
  });
  if (found?.id) return found.id;
  if (isUuid(raw)) return raw;

  const created = await storeServiceRef.addBrand(raw);
  if (created?.id && created.persisted !== false) {
    cache.list.push({ id: created.id, name: created.name, slug: created.slug });
    return created.id;
  }
  return null;
};

export const storeService = {
  // Obtener Configuración con Prioridad en Servidor Global y Supabase
  async getConfig() {
    // 1. Intentar obtener desde la sincronización global serverless
    try {
      const res = await fetch('/api/sync-store', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.config && data.config.storeName) {
          localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.config));
          return data.config;
        }
      }
    } catch {
      // Ignorar en local o sin conexión
    }

    // 2. Intentar leer de Supabase store_settings
    try {
      const { data, error } = await supabase.from('store_settings').select('*').limit(1);
      if (!error && data && data.length > 0) {
        const s = data[0];
        const remoteConfig = {
          storeName: s.store_name || INITIAL_CONFIG.storeName,
          whatsappNumber: s.whatsapp_number || INITIAL_CONFIG.whatsappNumber,
          announcementText: s.announcement_text || INITIAL_CONFIG.announcementText,
          heroTitle: s.hero_title || INITIAL_CONFIG.heroTitle,
          heroSubtitle: s.hero_subtitle || INITIAL_CONFIG.heroSubtitle,
          featuredBadge: s.featured_badge || INITIAL_CONFIG.featuredBadge,
          heroCtaText: INITIAL_CONFIG.heroCtaText,
          heroSecondaryText: INITIAL_CONFIG.heroSecondaryText,
          whatsappWelcomeMsg: INITIAL_CONFIG.whatsappWelcomeMsg,
          qrPaymentImageUrl: s.qr_payment_image_url || INITIAL_CONFIG.qrPaymentImageUrl,
          paymentBankAccount: s.payment_bank_account || INITIAL_CONFIG.paymentBankAccount,
          paymentNequiPhone: s.payment_nequi_phone || INITIAL_CONFIG.paymentNequiPhone,
          paymentTitular: s.payment_titular || INITIAL_CONFIG.paymentTitular,
          wompiMerchantName: s.wompi_merchant_name || INITIAL_CONFIG.wompiMerchantName,
          wompiPublicKey: s.wompi_public_key || INITIAL_CONFIG.wompiPublicKey,
          wompiCheckoutUrl: s.wompi_checkout_url || INITIAL_CONFIG.wompiCheckoutUrl,
          wompiLlaveBreve: s.wompi_llave_breve || INITIAL_CONFIG.wompiLlaveBreve,
          paypalPaymentLink: s.paypal_payment_link || INITIAL_CONFIG.paypalPaymentLink,
          paypalBusinessEmail: s.paypal_business_email || INITIAL_CONFIG.paypalBusinessEmail,
        };
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(remoteConfig));
        return remoteConfig;
      }
    } catch {
      // Continuar a fallback
    }

    // 3. Fallback a LocalStorage
    try {
      const local = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.warn('Error reading local config:', e);
    }

    return INITIAL_CONFIG;
  },

  async saveConfig(newConfig) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig));
    } catch (e) {
      console.error('Error saving config local:', e);
    }

    // Intentar persistir en Supabase
    try {
      await supabase.from('store_settings').upsert({
        id: 'main_settings',
        store_name: newConfig.storeName,
        whatsapp_number: newConfig.whatsappNumber,
        announcement_text: newConfig.announcementText,
        hero_title: newConfig.heroTitle,
        hero_subtitle: newConfig.heroSubtitle,
        qr_payment_image_url: newConfig.qrPaymentImageUrl,
        payment_bank_account: newConfig.paymentBankAccount,
        payment_nequi_phone: newConfig.paymentNequiPhone,
        payment_titular: newConfig.paymentTitular,
      });
    } catch {
      // Continuar
    }

    return newConfig;
  },

  // Obtener Categorías
  async getCategories() {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Continuar a fallback
    }

    try {
      const local = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.warn('Error reading local categories:', e);
    }

    return INITIAL_CATEGORIES;
  },

  // Agregar Nueva Categoría Dinámica (Local + Supabase + Servidor)
  async addCategory(cat) {
    if (!cat || !cat.name) return null;
    const cleanName = String(cat.name).trim();
    if (!cleanName) return null;

    const cleanSlug = slugify(cat.slug || cleanName) || `categoria-${Date.now()}`;
    const cleanId = isUuid(cat.id) ? cat.id.trim() : generateUuid();
    const newCatObj = {
      id: cleanId,
      name: cleanName,
      slug: cleanSlug,
      icon: cat.icon || 'Sparkles',
      count: Number(cat.count || 0),
    };

    // Evitar duplicados por nombre/slug: si ya existe, devolver la fila real.
    try {
      const { data: existing } = await supabase
        .from('categories')
        .select('id,name,slug,icon')
        .or(`slug.eq.${cleanSlug},name.ilike.${cleanName}`)
        .limit(1);
      if (Array.isArray(existing) && existing.length > 0) {
        return { ...existing[0], count: newCatObj.count };
      }
    } catch {
      // Continuar con la inserción
    }

    // 1. Persistir en Supabase con UUID real (la columna id es UUID en producción).
    let persisted = false;
    try {
      const { error } = await supabase.from('categories').upsert(
        {
          id: newCatObj.id,
          name: newCatObj.name,
          slug: newCatObj.slug,
          icon: newCatObj.icon,
        },
        { onConflict: 'id' }
      );
      persisted = !error;
      if (error) {
        console.warn('[storeService] addCategory Supabase:', error.message);
      }
    } catch (err) {
      console.warn('[storeService] addCategory excepción:', err);
    }

    // 2. Guardar copia local (fuente de verdad inmediata para los selectores).
    try {
      const current = await this.getCategories();
      const existsIdx = current.findIndex(
        (c) =>
          String(c.id).toLowerCase() === String(newCatObj.id).toLowerCase() ||
          String(c.slug || '').toLowerCase() === cleanSlug
      );
      let updated;
      if (existsIdx >= 0) {
        updated = [...current];
        updated[existsIdx] = { ...updated[existsIdx], ...newCatObj };
      } else {
        updated = [...current, newCatObj];
      }
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving local category:', e);
    }

    // 3. Notificar sincronización global (multi-dispositivo)
    try {
      const allCats = await this.getCategories();
      await fetch('/api/sync-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: allCats }),
      });
    } catch {}

    return { ...newCatObj, persisted };
  },

  // Obtener y Gestionar Marcas Dinámicas
  async getBrands() {
    const defaultBrands = [
      'Apple',
      'ASUS ROG',
      'Lenovo',
      'Samsung',
      'Sony',
      'Razer',
      'Logitech',
      'Xiaomi',
      'Nintendo',
      'Microsoft',
      'HP',
      'Dell',
    ];
    const brandsSet = new Set(defaultBrands);

    // 1. Marcas persistidas en Supabase
    try {
      const { data } = await supabase.from('brands').select('name').order('name');
      if (Array.isArray(data)) {
        data.forEach((b) => {
          const name = cleanBrand(b?.name);
          if (name) brandsSet.add(name);
        });
      }
    } catch {
      // La tabla brands puede no existir en instalaciones antiguas.
    }

    // 2. Marcas guardadas localmente
    try {
      const local = localStorage.getItem('super_wow_brands_v1');
      if (local) {
        const list = JSON.parse(local);
        if (Array.isArray(list)) {
          list.forEach((b) => {
            const name = cleanBrand(b);
            if (name) brandsSet.add(name);
          });
        }
      }
    } catch {}

    // 3. Marcas presentes en el catálogo
    try {
      const prods = await this.getProducts();
      prods.forEach((p) => {
        const name = cleanBrand(p.brand);
        if (name) brandsSet.add(name);
      });
    } catch {}

    return Array.from(brandsSet).filter(Boolean).sort();
  },

  async addBrand(brandName) {
    if (!brandName || typeof brandName !== 'string' || !brandName.trim()) return null;
    const cleanName = brandName.trim();
    const cleanSlug = slugify(cleanName) || `marca-${Date.now()}`;
    const brandObj = { id: generateUuid(), name: cleanName, slug: cleanSlug };

    // Evitar duplicados: reutilizar la marca existente si ya está registrada.
    try {
      const { data: existing } = await supabase
        .from('brands')
        .select('id,name,slug')
        .or(`slug.eq.${cleanSlug},name.ilike.${cleanName}`)
        .limit(1);
      if (Array.isArray(existing) && existing.length > 0) {
        return { ...existing[0], persisted: true };
      }
    } catch {
      // Continuar con la inserción
    }

    let persisted = false;
    try {
      const { error } = await supabase.from('brands').insert(brandObj);
      if (error) {
        console.warn('[storeService] addBrand Supabase:', error.message);
      } else {
        persisted = true;
      }
    } catch (err) {
      console.warn('[storeService] addBrand excepción:', err);
    }

    try {
      const raw = JSON.parse(localStorage.getItem('super_wow_brands_v1') || '[]');
      const updated = Array.from(
        new Set([...(Array.isArray(raw) ? raw : []), cleanName])
      ).sort();
      localStorage.setItem('super_wow_brands_v1', JSON.stringify(updated));
    } catch {
      // Ignorar
    }

    return { ...brandObj, persisted };
  },

  // Obtener registro de productos purgados (Tombstones anti-revival)
  getPurgedProducts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PURGED_PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Registrar producto en la lista de purga definitiva
  registerPurgedProduct(id) {
    if (!id) return;
    const list = this.getPurgedProducts();
    const set = new Set(list);
    set.add(String(id).trim());
    try {
      localStorage.setItem(STORAGE_KEYS.PURGED_PRODUCTS, JSON.stringify(Array.from(set)));
    } catch {}
  },

  // Recupera la lista de productos almacenada en localStorage de forma segura
  getProductsFromStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return [];
      const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  // Obtener un producto individual por ID, código, referencia, SKU o Slug (para enlaces directos /p/:slug o /p/:id)
  async getProductById(id, { timeoutMs = 6000 } = {}) {
    if (!id) return null;
    const cleanId = String(id).trim();
    if (!cleanId) return null;

    const cleanIdLower = cleanId.toLowerCase();
    const cleanSlug = slugify(cleanId);

    // 1. Buscar en caché local de productos (memoria / localStorage) primero
    const local = this.getProductsFromStorage();
    if (Array.isArray(local) && local.length > 0) {
      const match = local.find(
        (p) =>
          p &&
          (String(p.id).trim() === cleanId ||
            (p.slug && String(p.slug).toLowerCase().trim() === cleanIdLower) ||
            (p.slug && slugify(p.slug) === cleanSlug) ||
            (p.name && slugify(p.name) === cleanSlug) ||
            (p.reference && String(p.reference).toLowerCase().trim() === cleanIdLower) ||
            (p.reference && slugify(p.reference) === cleanSlug) ||
            (p.sku && String(p.sku).toLowerCase().trim() === cleanIdLower) ||
            (p.barcode && String(p.barcode).toLowerCase().trim() === cleanIdLower) ||
            (p.ean && String(p.ean).toLowerCase().trim() === cleanIdLower))
      );
      if (match) return match;
    }

    // 2. Consultar directamente a Supabase con timeout controlado (5-8s) para no bloquear la tienda
    try {
      const fetchPromise = (async () => {
        let data = null;

        // Solo buscar por id si es UUID válido (en PostgreSQL id es UUID)
        if (isUuid(cleanId)) {
          const res = await supabase
            .from('products')
            .select('*')
            .eq('id', cleanId)
            .limit(1)
            .maybeSingle();
          if (res?.data) data = res.data;
        }

        // Si no es UUID o no se encontró por id, buscar por reference, sku, barcode o ean
        if (!data) {
          try {
            const alt = await supabase
              .from('products')
              .select('*')
              .or(`reference.eq.${cleanId},sku.eq.${cleanId},barcode.eq.${cleanId},ean.eq.${cleanId}`)
              .limit(1)
              .maybeSingle();
            if (alt?.data) data = alt.data;
          } catch {}
        }

        // Búsqueda inteligente por título / nombre si viene un slug amigable
        if (!data && cleanSlug) {
          try {
            const searchTerms = cleanSlug.split('-').filter((t) => t.length > 2);
            if (searchTerms.length > 0) {
              const queryStr = `%${searchTerms.slice(0, 3).join('%')}%`;
              const byTitle = await supabase
                .from('products')
                .select('*')
                .ilike('title', queryStr)
                .limit(6);
              if (byTitle?.data && byTitle.data.length > 0) {
                const exactSlug = byTitle.data.find(
                  (row) => slugify(row.title || row.name || '') === cleanSlug
                );
                data = exactSlug || byTitle.data[0];
              }
            }
          } catch {}
        }

        return data;
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Timeout al consultar producto directo en Supabase')),
          timeoutMs
        )
      );

      const data = await Promise.race([fetchPromise, timeoutPromise]);

      if (data) {
        const specsList = Array.isArray(data.specs) ? data.specs : [];
        const findSpecVal = (keyName) => {
          const found = specsList.find(
            (s) => typeof s === 'object' && s !== null && (s.key === keyName || s.title === keyName)
          );
          return found?.value || found?.detail || null;
        };

        const mainImage = data.image_url || data.image || '/zafra/logo-menu.webp';
        const secondaryImages = Array.isArray(data.additional_images)
          ? data.additional_images.filter((img) => img && typeof img === 'string')
          : [];

        return {
          id: data.id,
          name: data.title || data.name || 'Producto',
          category: data.category_id || data.category || 'computadores',
          brand: data.brand || '',
          condition: data.condition || findSpecVal('CONDICIÓN') || findSpecVal('CONDICION') || 'Nuevo',
          commercialTag: data.commercial_tag || data.badge || findSpecVal('ETIQUETA') || '',
          price: Number(data.price) || 0,
          originalPrice: Number(data.original_price ?? data.originalPrice) || 0,
          cost: data.cost !== undefined && data.cost !== null ? data.cost : findSpecVal('COSTO'),
          stock: Number(data.stock ?? 10),
          image: mainImage,
          images: [mainImage, ...secondaryImages.filter((img) => img !== mainImage)],
          specs: specsList,
          description: data.description || '',
          rating: Number(data.rating || 5.0),
          reviews: Number(data.reviews || 0),
          featured: Boolean(data.featured || data.is_featured),
          badge: data.badge || data.commercial_tag || '',
          reference: data.sku || data.reference || findSpecVal('SKU') || findSpecVal('REFERENCIA') || '',
          sku: data.sku || data.reference || findSpecVal('SKU') || '',
          barcode: data.barcode || data.ean || findSpecVal('EAN') || '',
          ean: data.barcode || data.ean || findSpecVal('EAN') || '',
          warrantyText: findSpecVal('GARANTÍA') || findSpecVal('GARANTIA') || 'Garantía Oficial 12 Meses',
          shippingText: findSpecVal('DESPACHO') || findSpecVal('ENVÍOS') || 'Envíos Asegurados a Colombia',
        };
      }
    } catch (err) {
      console.warn('[storeService.getProductById] Error o timeout consultando producto directo:', err?.message || err);
    }

    return null;
  },

  // Obtener Productos con Prioridad en la Nube (Multi-Dispositivo Inmediato)
  async getProducts(options = {}) {
    const { forceFresh = false } = options;
    const purgedSet = new Set(this.getPurgedProducts().map((id) => String(id).trim()));
    const initialIdSet = new Set(INITIAL_PRODUCTS.map((p) => String(p.id)));
    let rawCloud = null;
    let cloudCategories = [];
    let cloudBrands = [];

    // 1. Consultar sincronización global serverless (solo si no se fuerza recarga limpia de BD)
    if (!forceFresh) {
      try {
        const res = await fetch('/api/sync-store', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.products && Array.isArray(data.products) && data.products.length > 0) {
            rawCloud = data.products;
          }
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            cloudCategories = data.categories;
          }
        }
      } catch {
        // Continuar a Supabase
      }
    }

    // 2. Supabase es la fuente de verdad definitiva: productos + categorías + marcas.
    // Se selecciona '*' paginado en bloques de 200 para obtener las columnas existentes reales
    // sin fallar por nombres de columna incompatibles.
    const PAGE_SIZE = 200;
    try {
      // Categorías y marcas: tablas pequeñas, se leen completas
      const [categoriesRes, brandsRes] = await Promise.all([
        supabase.from('categories').select('id,name,slug,icon'),
        supabase.from('brands').select('id,name,slug'),
      ]);
      if (!categoriesRes.error && Array.isArray(categoriesRes.data)) {
        cloudCategories = categoriesRes.data;
      }
      if (!brandsRes.error && Array.isArray(brandsRes.data)) {
        cloudBrands = brandsRes.data;
      }

      // Productos: paginados en bloques para no exceder límites de transferencia
      let allProducts = [];
      let page = 0;
      let keepFetching = true;
      while (keepFetching) {
        const from = page * PAGE_SIZE;
        const to   = from + PAGE_SIZE - 1;
        const { data: pageData, error: pageError } = await supabase
          .from('products')
          .select('*')
          .range(from, to)
          .order('created_at', { ascending: false });
        if (pageError) {
          console.warn('[storeService] Error leyendo productos de Supabase:', pageError.message);
          keepFetching = false;
          break;
        }
        if (!Array.isArray(pageData) || pageData.length === 0) { keepFetching = false; break; }
        allProducts = allProducts.concat(pageData);
        if (pageData.length < PAGE_SIZE) keepFetching = false;
        page++;
      }
      if (allProducts.length > 0) rawCloud = allProducts;
    } catch (fetchErr) {
      console.warn('[storeService] Error conectando con Supabase:', fetchErr);
    }

    const categoryById = new Map(
      cloudCategories.map((cat) => [String(cat.id || '').toLowerCase(), cat])
    );
    const brandById = new Map(
      cloudBrands.map((brand) => [String(brand.id || '').toLowerCase(), brand])
    );

    const mapCloudProduct = (item) => {
      const rawCategory = item.category_id || item.category || '';
      const categoryKey = String(rawCategory || '').toLowerCase();
      const categoryMeta = categoryById.get(categoryKey);
      const categoryName =
        categoryMeta?.name ||
        item.category_name ||
        (!isUuid(rawCategory) && rawCategory !== 'computadores' ? sanitizeCommercialText(rawCategory) : '');

      const brandMeta = brandById.get(String(item.brand_id || '').toLowerCase());
      const brandName = cleanBrand(item.brand) || cleanBrand(brandMeta?.name);

      const mainImage = item.image_url || item.image || '/zafra/logo-menu.webp';
      const secondaryImages = Array.isArray(item.additional_images)
        ? item.additional_images.filter((img) => img && typeof img === 'string')
        : [];
      const allImages = [
        mainImage,
        ...secondaryImages.filter((img) => img !== mainImage),
      ];

      const specsList = Array.isArray(item.specs) ? item.specs : [];
      const findSpecVal = (keyName) => {
        const found = specsList.find(
          (s) => typeof s === 'object' && s !== null && (s.key === keyName || s.title === keyName)
        );
        return found?.value || found?.detail || null;
      };

      const rawCondition =
        item.condition ||
        findSpecVal('CONDICIÓN') ||
        findSpecVal('CONDICION') ||
        'Nuevo';
      const commercialTag = item.commercial_tag || item.badge || findSpecVal('ETIQUETA') || '';
      const skuVal = item.sku || item.reference || findSpecVal('SKU') || findSpecVal('REFERENCIA') || '';
      const barcodeVal = item.barcode || item.ean || findSpecVal('EAN') || findSpecVal('BARCODE') || '';
      const costVal = item.cost !== undefined && item.cost !== null ? item.cost : findSpecVal('COSTO');

      return {
        id: item.id,
        name: item.title || item.name || 'Producto',
        category: rawCategory || 'computadores',
        categoryName,
        brand: brandName,
        brandId: item.brand_id || null,
        condition: rawCondition,
        commercialTag,
        price: Number(item.price || 0),
        originalPrice:
          item.original_price !== null && item.original_price !== undefined
            ? Number(item.original_price)
            : null,
        cost: costVal !== null && costVal !== undefined && !isNaN(Number(costVal)) ? Number(costVal) : null,
        image: mainImage,
        images: allImages,
        additional_images: secondaryImages,
        badge: commercialTag || item.badge || '',
        rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : 5.0,
        reviews: item.reviews !== undefined && item.reviews !== null ? Number(item.reviews) : 0,
        stock: Number(item.stock ?? 10),
        featured: Boolean(item.featured ?? item.is_featured),
        description: sanitizeCommercialText(item.description || ''),
        specs: specsList,
        reference: skuVal,
        sku: skuVal,
        barcode: barcodeVal,
        ean: barcodeVal,
      };
    };

    // 3. Fusionar con los campos visuales locales (edición in-situ, marca, etc.)
    let localRaw = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
      localRaw = Array.isArray(parsed) ? parsed : [];
    } catch {
      localRaw = [];
    }
    const localById = new Map(localRaw.map((p) => [String(p.id), p]));

    let merged = [];
    if (Array.isArray(rawCloud) && rawCloud.length > 0) {
      merged = rawCloud
        .filter((item) => item && item.id && !purgedSet.has(String(item.id).trim()))
        .map((item) => {
          const cloudProduct = mapCloudProduct(item);
          const local = localById.get(String(item.id)) || {};
          const category = cloudProduct.category || local.category || 'computadores';
          return {
            ...local,
            ...cloudProduct,
            name: cloudProduct.name || local.name,
            category,
            categoryName:
              cloudProduct.categoryName ||
              local.categoryName ||
              categoryById.get(String(category).toLowerCase())?.name ||
              '',
            brand: cloudProduct.brand || cleanBrand(local.brand),
            condition: cloudProduct.condition || local.condition || 'Nuevo',
            commercialTag: cloudProduct.commercialTag || local.commercialTag || '',
            badge: cloudProduct.badge || local.badge || '',
            image: cloudProduct.image || local.image,
            images:
              Array.isArray(cloudProduct.images) && cloudProduct.images.length > 0
                ? cloudProduct.images
                : Array.isArray(local.images) && local.images.length > 0
                  ? local.images
                  : [cloudProduct.image || local.image],
            description:
              cloudProduct.description || sanitizeCommercialText(local.description || ''),
            specs:
              Array.isArray(cloudProduct.specs) && cloudProduct.specs.length > 0
                ? cloudProduct.specs
                : Array.isArray(local.specs)
                  ? local.specs
                  : [],
            rating: cloudProduct.rating ?? local.rating ?? 5.0,
            reviews: cloudProduct.reviews ?? local.reviews ?? 0,
            featured: cloudProduct.featured ?? local.featured ?? false,
            reference: cloudProduct.reference || local.reference || '',
          };
        });
    }

    // 4. Fallback local / fábrica cuando la nube está totalmente inaccesible.
    if (merged.length === 0) {
      const localFiltered = localRaw.filter(
        (p) => p && p.id && !purgedSet.has(String(p.id).trim())
      );
      merged =
        localFiltered.length > 0
          ? localFiltered.map((p) => ({
              ...p,
              description: sanitizeCommercialText(p.description || ''),
              brand: cleanBrand(p.brand),
            }))
          : INITIAL_PRODUCTS.filter((p) => !purgedSet.has(String(p.id).trim()));
    }

    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(merged));
    } catch {
      // Ignorar
    }

    return merged;
  },

  // Guardar Producto Individual
  async saveProduct(product) {
    let savedInSupabase = false;
    let visualFieldsSynced = false;
    const finalProduct = {
      ...product,
      id: ensureUuid(product?.id),
      description: sanitizeCommercialText(product?.description || ''),
      brand: cleanBrand(product?.brand),
    };

    // Resolver categoría y marca a UUID reales de Supabase (creándolas si faltan).
    const categoryCache = { list: null };
    const brandCache = { list: null };
    let resolvedCategoryId = null;
    let resolvedBrandId = null;
    try {
      [resolvedCategoryId, resolvedBrandId] = await Promise.all([
        resolveCategoryId(finalProduct.category, categoryCache),
        resolveBrandId(finalProduct.brand, brandCache),
      ]);
    } catch (err) {
      console.warn('[storeService] No se pudieron resolver categoría/marca:', err);
    }

    if (resolvedCategoryId) finalProduct.category = resolvedCategoryId;
    if (resolvedBrandId) finalProduct.brandId = resolvedBrandId;

    // Intentar inserción/actualización directa en Supabase
    let supabaseError = null;
    try {
      const fullPayload = buildProductPayload(
        finalProduct,
        true,
        resolvedCategoryId,
        resolvedBrandId
      );
      let { data, error } = await supabase.from('products').upsert(fullPayload).select();

      if (error) {
        console.warn('[storeService] Upsert Supabase devolvió error:', error.message);
        supabaseError = error.message;
        // Intento de rescate con payload base
        const fallback = await supabase
          .from('products')
          .upsert(buildProductPayload(finalProduct, false, resolvedCategoryId, resolvedBrandId))
          .select();
        if (!fallback.error && Array.isArray(fallback.data) && fallback.data.length > 0) {
          savedInSupabase = true;
          visualFieldsSynced = false;
          supabaseError = null;
        } else {
          console.error('[storeService] Upsert Supabase falló definitivamente:', fallback.error?.message || error.message);
          supabaseError = fallback.error?.message || error.message;
        }
      } else {
        savedInSupabase = true;
        visualFieldsSynced = true;
      }
    } catch (err) {
      console.error('[storeService] Excepción guardando producto en Supabase:', err);
      supabaseError = err.message;
    }

    // Actualizar localStorage
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
      const existing = Array.isArray(raw) ? raw : [];
      const index = existing.findIndex((p) => String(p.id) === String(finalProduct.id));
      let updatedList;
      if (index >= 0) {
        updatedList = [...existing];
        updatedList[index] = { ...existing[index], ...finalProduct };
      } else {
        updatedList = [finalProduct, ...existing];
      }
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedList));

      // Forzar re-fetch desde la nube en la próxima llamada a getProducts()
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, '0');

      // Sincronización multi-dispositivo inmediata vía endpoint serverless
      if (savedInSupabase && typeof window !== 'undefined' && window.fetch) {
        window
          .fetch('/api/sync-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              products: updatedList,
              timestamp: Date.now(),
              source: 'saveProduct',
            }),
          })
          .catch(() => {});
      }
    } catch (e) {
      console.error('Error saving in localStorage:', e);
    }

    return { product: finalProduct, savedInSupabase, visualFieldsSynced, error: supabaseError };
  },

  // Actualización Atómica y Verificación de Filas Afectadas en Supabase (Multi-Dispositivo Inmediato)
  async updateProductAtomic(product) {
    if (!product || !product.id) return { success: false, rowsAffected: 0 };
    const cleanId = ensureUuid(product.id);

    const mainImage = sanitizeImageUrl(product.image || product.image_url || '/zafra/logo-menu.webp');
    let allImages = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      allImages = product.images.map(sanitizeImageUrl).filter(Boolean);
    } else {
      allImages = [
        mainImage,
        ...(Array.isArray(product.additional_images) ? product.additional_images.map(sanitizeImageUrl) : []),
      ].filter(Boolean);
    }
    const secondaryImages = allImages.filter(
      (img) => img && typeof img === 'string' && img !== mainImage
    );

    const condition = product.condition || 'Nuevo';
    const commercialTag = product.commercialTag || product.badge || '';

    const finalProduct = {
      ...product,
      id: cleanId,
      name: product.name || product.title || 'Producto',
      image: mainImage,
      images: [mainImage, ...secondaryImages],
      additional_images: secondaryImages,
      condition,
      commercialTag,
      badge: commercialTag || product.badge || '',
      price: Number(product.price || 0),
      originalPrice:
        product.originalPrice !== null &&
        product.originalPrice !== undefined &&
        product.originalPrice !== ''
          ? Number(product.originalPrice)
          : null,
      stock: Number(product.stock ?? 10),
      description: sanitizeCommercialText(product.description || ''),
      brand: cleanBrand(product.brand),
    };

    // Resolver categoría y marca a UUID reales
    const categoryCache = { list: null };
    const brandCache = { list: null };
    let resolvedCategoryId = null;
    let resolvedBrandId = null;
    try {
      [resolvedCategoryId, resolvedBrandId] = await Promise.all([
        resolveCategoryId(finalProduct.category, categoryCache),
        resolveBrandId(finalProduct.brand, brandCache),
      ]);
    } catch (err) {
      console.warn('[storeService] updateProductAtomic resolución categoría/marca:', err);
    }

    if (resolvedCategoryId) finalProduct.category = resolvedCategoryId;
    if (resolvedBrandId) finalProduct.brandId = resolvedBrandId;

    let rowsAffected = 0;
    let savedInSupabase = false;
    let lastError = null;

    // 1. UPDATE atómico en Supabase con confirmación de filas afectadas (.select())
    try {
      const fullPayload = buildProductPayload(
        finalProduct,
        true,
        resolvedCategoryId,
        resolvedBrandId
      );

      // Intento A: Update directo por id
      const { data, error } = await supabase
        .from('products')
        .update(fullPayload)
        .eq('id', cleanId)
        .select();

      if (!error && Array.isArray(data) && data.length > 0) {
        rowsAffected = data.length;
        savedInSupabase = true;
      } else {
        if (error) {
          console.warn('[storeService] updateProductAtomic intento A falló:', error.message);
          lastError = error.message;
        }

        // Intento B: Si la fila aún no existía en Supabase o afectó 0 filas, intentar upsert
        const { data: upsertData, error: upsertErr } = await supabase
          .from('products')
          .upsert(fullPayload)
          .select();

        if (!upsertErr && Array.isArray(upsertData) && upsertData.length > 0) {
          rowsAffected = upsertData.length;
          savedInSupabase = true;
          lastError = null;
        } else if (upsertErr) {
          console.warn('[storeService] updateProductAtomic intento B (upsert) falló:', upsertErr.message);
          lastError = upsertErr.message;
        }
      }
    } catch (err) {
      console.error('[storeService] Excepción en updateProductAtomic:', err);
      lastError = err.message;
    }

    // 2. Persistencia en localStorage
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
      const existing = Array.isArray(raw) ? raw : [];
      const index = existing.findIndex((p) => String(p.id) === String(cleanId));
      let updatedList;
      if (index >= 0) {
        updatedList = [...existing];
        updatedList[index] = { ...existing[index], ...finalProduct };
      } else {
        updatedList = [finalProduct, ...existing];
      }
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedList));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (e) {
      console.error('Error saving in localStorage:', e);
    }

    // 3. Sincronización multi-dispositivo inmediata
    if (savedInSupabase) {
      try {
        await fetch('/api/sync-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            products: [finalProduct],
          }),
        });
      } catch (syncErr) {
        console.warn('[storeService] Sync serverless call:', syncErr);
      }
    }

    return {
      success: savedInSupabase && rowsAffected > 0,
      rowsAffected,
      product: finalProduct,
      error: lastError,
    };
  },

  // Sincronización Global Obligatoria al Hacer Clic en "Guardar Cambios"
  async syncAllToSupabaseAndGlobal(products, categories, config, customizations = null) {
    let supabaseSuccess = false;
    let visualFieldsSynced = false;

    const normalizedProducts = (Array.isArray(products) ? products : []).map((product) => ({
      ...product,
      id: ensureUuid(product?.id),
      description: sanitizeCommercialText(product?.description || ''),
      brand: cleanBrand(product?.brand),
    }));

    // 1. Guardar en LocalStorage (fuente inmediata para la UI y el store local)
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(normalizedProducts));
      if (config) localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
      if (customizations && typeof customizations === 'object') {
        localStorage.setItem(STORAGE_KEYS.CUSTOMIZATIONS, JSON.stringify(customizations));
      }
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (e) {
      console.warn('Error local storage:', e);
    }

    // 2. Resolver categorías y marcas a UUID reales antes de persistir.
    const categoryCache = { list: null };
    const brandCache = { list: null };
    try {
      const [catRes, brandRes] = await Promise.all([
        supabase.from('categories').select('id,name,slug'),
        supabase.from('brands').select('id,name,slug'),
      ]);
      if (!catRes.error && Array.isArray(catRes.data)) categoryCache.list = catRes.data;
      if (!brandRes.error && Array.isArray(brandRes.data)) brandCache.list = brandRes.data;
    } catch {
      // Se resolverán individualmente más adelante.
    }

    const preparedProducts = await Promise.all(
      normalizedProducts.map(async (product) => {
        let categoryId = null;
        let brandId = null;
        try {
          [categoryId, brandId] = await Promise.all([
            resolveCategoryId(product.category, categoryCache),
            resolveBrandId(product.brand, brandCache),
          ]);
        } catch {
          // Mantener los valores originales si la resolución falla.
        }
        return {
          ...product,
          category: categoryId || product.category,
          brandId: brandId || product.brandId || null,
        };
      })
    );

    // 3. Propagación inmediata a la Serverless Function de Vercel (multi-dispositivo)
    try {
      await fetch('/api/sync-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: preparedProducts,
          categories: categories || categoryCache.list || [],
          config,
          customizations,
        }),
      });
    } catch (e) {
      console.warn('Sync serverless call:', e);
    }

    // 4. Upsert en store_customizations si se proporcionaron
    if (customizations && typeof customizations === 'object') {
      try {
        await this.saveCustomizations(customizations);
      } catch (err) {
        console.warn('Sync customizations:', err);
      }
    }

    // 5. Upsert obligatorio en Supabase (lotes estructurados)
    let supabaseError = null;
    try {
      const fullPayload = preparedProducts.map((p) =>
        buildProductPayload(p, true, p.category, p.brandId)
      );

      const CHUNK_SIZE = 30;
      let totalSaved = 0;

      for (let i = 0; i < fullPayload.length; i += CHUNK_SIZE) {
        const fullChunk = fullPayload.slice(i, i + CHUNK_SIZE);
        const { data: savedData, error } = await supabase.from('products').upsert(fullChunk).select();

        if (error) {
          console.warn('[storeService] Error en lote Supabase:', error.message);
          supabaseError = error.message;

          // Reintento fila a fila para aislar el error y salvar el resto
          for (const single of fullChunk) {
            const singleRes = await supabase.from('products').upsert(single).select();
            if (!singleRes.error && Array.isArray(singleRes.data) && singleRes.data.length > 0) {
              totalSaved++;
            } else if (singleRes.error) {
              supabaseError = singleRes.error.message;
            }
          }
        } else if (savedData && Array.isArray(savedData)) {
          totalSaved += savedData.length;
        } else {
          totalSaved += fullChunk.length;
        }
      }

      if (totalSaved >= fullPayload.length) {
        supabaseSuccess = true;
        visualFieldsSynced = true;
        supabaseError = null;
      } else if (totalSaved > 0) {
        supabaseSuccess = true;
        visualFieldsSynced = true;
      } else {
        supabaseSuccess = false;
        visualFieldsSynced = false;
      }
    } catch (err) {
      console.error('[storeService] Supabase batch upsert excepción:', err);
      supabaseSuccess = false;
      supabaseError = err.message;
    }

    return {
      success: supabaseSuccess,
      supabaseSuccess,
      supabaseError,
      visualFieldsSynced,
      products: preparedProducts,
    };
  },

  /**
   * Elimina en cascada las imágenes dedicadas del producto en Supabase Storage
   * para no dejar archivos huérfanos ocupando almacenamiento.
   * @param {string[]} imageUrls - Lista de URLs de imágenes asociadas
   */
  async deleteDedicatedStorageImages(imageUrls = []) {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) return { deleted: 0 };

    const BUCKET_NAME = 'product-images';
    const pathsToRemove = [];

    imageUrls.forEach((url) => {
      if (!url || typeof url !== 'string') return;
      if (url.includes(`/${BUCKET_NAME}/`)) {
        const parts = url.split(`/${BUCKET_NAME}/`);
        if (parts[1]) {
          const rawPath = parts[1].split('?')[0];
          if (rawPath) pathsToRemove.push(decodeURIComponent(rawPath));
        }
      }
    });

    if (pathsToRemove.length === 0) return { deleted: 0 };

    try {
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(pathsToRemove);

      if (error) {
        console.warn('[storeService] Storage image cleanup error:', error.message);
      } else {
        console.info(`[storeService] ${pathsToRemove.length} imágenes eliminadas de Supabase Storage.`);
      }
      return { deleted: pathsToRemove.length };
    } catch (err) {
      console.warn('[storeService] Excepción al remover archivos de Storage:', err);
      return { deleted: 0 };
    }
  },

  // Invalidación Forzada de Caché y Recarga en Caliente desde Supabase
  async forceRefreshFromCloud() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.LAST_SYNC);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
    } catch {}

    // Obtener directamente desde Supabase sin capas intermedias
    const freshProducts = await this.getProducts({ forceFresh: true });

    // Notificar a toda la aplicación mediante evento nativo
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('javrelstore:products-synced', {
          detail: { products: freshProducts },
        })
      );
    }

    return freshProducts;
  },

  // Eliminar Producto de Raíz (Hard-Delete en Supabase, Storage, Local y Servidor Global)
  async deleteProduct(id) {
    if (!id) return { success: false };
    const strId = String(id).trim();

    // 1. Obtener datos del producto para identificar imágenes en Storage antes de borrarlo
    let imageSources = [];
    try {
      const { data } = await supabase
        .from('products')
        .select('image_url, additional_images')
        .eq('id', strId)
        .maybeSingle();

      if (data) {
        imageSources = [
          data.image_url,
          ...(Array.isArray(data.additional_images) ? data.additional_images : []),
        ].filter(Boolean);
      }
    } catch {}

    // Si no está en Supabase buscar en LocalStorage
    if (imageSources.length === 0) {
      try {
        const localList = this.getProductsFromStorage();
        const found = localList.find((p) => p && String(p.id).trim() === strId);
        if (found) {
          imageSources = [
            found.image,
            found.image_url,
            ...(Array.isArray(found.images) ? found.images : []),
            ...(Array.isArray(found.additional_images) ? found.additional_images : []),
          ].filter(Boolean);
        }
      } catch {}
    }

    // 2. Registrar en lista de purga definitiva (Tombstone anti-revival)
    this.registerPurgedProduct(strId);

    // 3. BORRADO DURO ESTRICTO EN SUPABASE — DELETE FROM products WHERE id = strId
    let supabaseDeleted = false;
    let deleteError = null;
    try {
      const { error } = await supabase.from('products').delete().eq('id', strId);
      if (!error) {
        supabaseDeleted = true;
      } else {
        deleteError = error.message;
        console.warn('[storeService] Supabase DELETE error:', error.message);
      }
      // Intento secundario con columna numérica si el id es numérico y no borró
      if (!supabaseDeleted && !isNaN(Number(strId))) {
        const numRes = await supabase.from('products').delete().eq('id', Number(strId));
        if (!numRes.error) supabaseDeleted = true;
      }
    } catch (err) {
      deleteError = err.message;
      console.warn('[storeService] Excepción en DELETE Supabase:', err);
    }

    // 4. Limpieza en cascada de imágenes dedicadas en Supabase Storage
    if (imageSources.length > 0) {
      await this.deleteDedicatedStorageImages(imageSources);
    }

    // 5. Limpiar de LocalStorage
    try {
      const localList = this.getProductsFromStorage();
      const remaining = localList.filter((p) => p && String(p.id).trim() !== strId);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(remaining));

      // 6. Invalidar en tiempo real la caché global de la Serverless Function
      try {
        await fetch('/api/sync-store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            deletedId: strId,
            products: remaining,
          }),
        });
      } catch {}
    } catch (e) {
      console.error('[storeService] Error eliminando de localStorage:', e);
    }

    return { success: supabaseDeleted, supabaseDeleted, error: deleteError };
  },

  // Barrido de Registros Fantasma (Orphan Sweep) — Limpia desde Supabase registros
  // que ya están en la lista de purga local pero aún podrían existir en la base de datos.
  async sweepOrphanProducts() {
    const purgedIds = this.getPurgedProducts();
    if (!purgedIds || purgedIds.length === 0) return { swept: 0 };

    let swept = 0;
    for (const id of purgedIds) {
      try {
        await supabase.from('products').delete().eq('id', id);
        swept++;
      } catch {}
    }

    // También limpiar el localStorage de cualquier residuo
    try {
      const localList = this.getProductsFromStorage();
      const purgedSet = new Set(purgedIds.map((i) => String(i).trim()));
      const cleaned = localList.filter((p) => p && !purgedSet.has(String(p.id).trim()));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(cleaned));
    } catch {}

    console.info(`[storeService] Orphan sweep: ${swept} registros fantasma purgados de Supabase.`);
    return { swept };
  },

  // Eliminación Masiva de Productos de Raíz — Hard DELETE en Supabase en lote
  async deleteMultipleProducts(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return { success: false, count: 0 };
    const idSet = new Set(ids.map((id) => String(id).trim()));
    const idsArray = Array.from(idSet);

    // 1. Obtener imágenes para borrado en cascada
    let allImageSources = [];
    try {
      const { data } = await supabase
        .from('products')
        .select('image_url, additional_images')
        .in('id', idsArray);

      if (data && Array.isArray(data)) {
        data.forEach((p) => {
          if (p.image_url) allImageSources.push(p.image_url);
          if (Array.isArray(p.additional_images)) {
            allImageSources.push(...p.additional_images);
          }
        });
      }
    } catch {}

    // 2. Registrar en purga (Tombstones)
    ids.forEach((id) => this.registerPurgedProduct(id));

    // 3. BORRADO DURO EN SUPABASE — DELETE FROM products WHERE id IN (ids)
    let batchErr = null;
    try {
      const { error } = await supabase.from('products').delete().in('id', idsArray);
      if (error) {
        batchErr = error.message;
        // Si .in() falla, intentar uno a uno
        for (const id of idsArray) {
          try { await supabase.from('products').delete().eq('id', id); } catch {}
        }
      }
    } catch (err) {
      batchErr = err.message;
      for (const id of idsArray) {
        try { await supabase.from('products').delete().eq('id', id); } catch {}
      }
    }

    // 4. Limpieza de imágenes en Supabase Storage
    if (allImageSources.length > 0) {
      await this.deleteDedicatedStorageImages(allImageSources);
    }

    // 5. Limpiar de LocalStorage y Serverless
    try {
      const localList = this.getProductsFromStorage();
      const remaining = localList.filter((p) => p && !idSet.has(String(p.id).trim()));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(remaining));

      await fetch('/api/sync-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          deletedIds: idsArray,
          products: remaining,
        }),
      });
    } catch {}

    return { success: !batchErr, count: idsArray.length, error: batchErr };
  },

  // Obtener Personalizaciones Visuales In-Context (store_customizations)
  async getCustomizations() {
    let customizations = {};

    // 1. Intentar consultar Supabase en la tabla store_customizations
    try {
      const { data, error } = await supabase.from('store_customizations').select('*');
      if (!error && data && Array.isArray(data) && data.length > 0) {
        data.forEach((row) => {
          if (row.key) {
            let val = row.value;
            try {
              if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
                val = JSON.parse(val);
              }
            } catch {}
            customizations[row.key] = val;
          }
        });

        // Persistir copia local
        try {
          localStorage.setItem(STORAGE_KEYS.CUSTOMIZATIONS, JSON.stringify(customizations));
        } catch {}

        return customizations;
      }
    } catch (err) {
      console.warn('Consulta store_customizations en Supabase:', err);
    }

    // 2. Fallback a LocalStorage
    try {
      const local = localStorage.getItem(STORAGE_KEYS.CUSTOMIZATIONS);
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.warn('Lectura local customizations:', e);
    }

    return {};
  },

  // Guardar Personalizaciones Visuales con Upsert en Supabase y LocalStorage
  async saveCustomizations(customizationsMap) {
    if (!customizationsMap || typeof customizationsMap !== 'object') {
      return { success: false };
    }

    // 1. Guardar siempre en LocalStorage de inmediato
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOMIZATIONS, JSON.stringify(customizationsMap));
    } catch (e) {
      console.warn('Error guardando customizations en local:', e);
    }

    // 2. Realizar Upsert masivo en Supabase (store_customizations)
    let supabaseSuccess = false;
    try {
      const rows = Object.entries(customizationsMap).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? JSON.stringify(val) : String(val),
        updated_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('store_customizations')
          .upsert(rows, { onConflict: 'key' });

        if (!error) {
          supabaseSuccess = true;
        } else {
          console.warn('Aviso upsert store_customizations en Supabase (tabla nueva o RLS):', error.message);
        }
      }
    } catch (err) {
      console.warn('Excepción al sincronizar store_customizations:', err);
    }

    return { success: true, supabaseSuccess };
  },

  // Restaurar valores de fábrica
  resetToDefaults() {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
    return {
      products: INITIAL_PRODUCTS,
      categories: INITIAL_CATEGORIES,
      config: INITIAL_CONFIG,
    };
  },
};

// El servicio ya está completamente inicializado: habilitar el puente.
storeServiceRef = storeService;
