/**
 * Utilidades de identidad y limpieza de contenido comercial.
 *
 * JavrelStore convive con dos fuentes de datos:
 *  - Supabase de producción: `products.id`, `category_id` y `brand_id` son UUID.
 *  - Datos locales/importaciones antiguas: ids de texto (`prod-...`, `pc-001`).
 *
 * Estas funciones centralizan la generación de UUID, la detección de ids válidos
 * y la limpieza de descripciones que antes filtraban metadatos técnicos (UUID,
 * nombres de modelos de IA, dimensiones WebP, SKU internos, etc.) a las tarjetas.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value) =>
  typeof value === 'string' && UUID_RE.test(value.trim());

/** Genera un UUID v4 incluso en navegadores antiguos o contextos sin crypto.randomUUID. */
export const generateUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Continuar con el respaldo manual
    }
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/** Devuelve un UUID seguro: conserva el id si ya es UUID, si no genera uno nuevo. */
export const ensureUuid = (value) => (isUuid(value) ? value.trim() : generateUuid());

/**
 * Normaliza una cadena de texto para comparaciones y búsquedas:
 * - Insensible a mayúsculas y minúsculas (.toLowerCase())
 * - Insensible a tildes, diéresis y marcas diacríticas (.normalize('NFD'))
 * - Limpieza de espacios redundantes
 */
export const normalizeSearchText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/** Slug estable para categorías y marcas. */
export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

/**
 * Obtiene el slug limpio y amigable de un producto para URLs profesionales (/p/:slug).
 * Prioriza slug explícito > nombre/título > referencia > id como fallback retrocompatible.
 */
export const getProductSlug = (product) => {
  if (!product) return '';
  if (product.slug && typeof product.slug === 'string' && product.slug.trim()) {
    return slugify(product.slug);
  }
  const baseName = product.name || product.title || product.reference || '';
  const slug = slugify(baseName);
  if (slug) return slug;
  return String(product.id || '').trim();
};

const UUID_GLOBAL_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

// Modelos, herramientas y metadatos que nunca deben llegar al comprador.
const TECHNICAL_NOISE = [
  /\bimagen\s*[34](?:\.\d+)?\b/gi,
  /\bnano\s*banana\b/gi,
  /\bmidjourney\b/gi,
  /\bdall[\s·-]*e\b/gi,
  /\bstable\s*diffusion\b/gi,
  /\bflux(?:\s*pro)?\b/gi,
  /\bgemini(?:\s*[\d.]+\s*(?:flash|pro))?\b/gi,
  /\bchatgpt\b/gi,
  /\bmagnific(?:\s*ai)?\b/gi,
  /\bgenerad[oa]\s+(?:por|con)\s+(?:ia|ai)\b/gi,
  /\b(?:ia|ai)\s+generativ[ao]\b/gi,
  /\bcanvas\s*(?:webp|helper|preprocessor)\b/gi,
  /\bwebp\b/gi,
  /\b\d{2,4}\s*[x×]\s*\d{2,4}\s*(?:px)?\b/gi,
  /\bfondo\s+blanco(?:\s+s[oó]lido)?\b/gi,
  /\b(?:#ffffff|#fff)\b/gi,
  /\bcompress(?:i[oó]n|ado)\b/gi,
  /\b(?:m[aá]x(?:imo)?\.?|menos de)\s*\d+\s*kb\b/gi,
  /\b\d+\s*kb\b/gi,
  /\b(?:url|src|data:image\/[a-z+]+;base64)\b/gi,
];

// Referencias internas / códigos que no aportan a la descripción comercial.
const INTERNAL_REFERENCE_LINES = [
  /^\s*(?:referencia|ref\.?|sku|c[oó]digo|ean|upc|id|uuid)\s*[:#-]\s*.*$/gim,
  /^\s*(?:producto|art[ií]culo)\s+(?:generado|extra[ií]do|importado)\b.*$/gim,
];

const collapseSpaces = (text) =>
  text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/([,;:])\s*\1+/g, '$1')
    .replace(/^[\s\-–—•|,.;:]+|[\s\-–—•|,.;:]+$/g, '')
    .trim();

/**
 * Limpia una descripción para mostrarla al comprador.
 * Elimina UUID, enlaces, nombres de modelos de IA, metadatos WebP y líneas de
 * referencia interna. Si después de limpiar no queda contenido útil devuelve ''.
 */
export const sanitizeCommercialText = (value) => {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (!text.trim()) return '';

  text = text.replace(UUID_GLOBAL_RE, ' ');
  text = text.replace(/https?:\/\/\S+/gi, ' ');
  text = text.replace(/data:image\/[a-z+.-]+;base64,[a-z0-9+/=\s]+/gi, ' ');
  text = text.replace(/<[^>]+>/g, ' ');

  INTERNAL_REFERENCE_LINES.forEach((re) => {
    text = text.replace(re, '');
  });
  TECHNICAL_NOISE.forEach((re) => {
    text = text.replace(re, ' ');
  });

  text = collapseSpaces(text);
  if (!text) return '';

  // Si el único contenido restante es un código corto o un número, no es útil.
  const meaningful = text.replace(/[^a-záéíóúñ0-9]/gi, '');
  if (meaningful.length < 3) return '';

  return text;
};

/** Marca visible: descarta UUID, ids internos y valores puramente técnicos. */
export const cleanBrand = (value, fallback = '') => {
  if (!value) return fallback;
  const text = String(value).trim();
  if (!text || isUuid(text)) return fallback;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(text)) return fallback;
  if (/^(?:prod|cat|brand|sku|ref)[-_]/i.test(text)) return fallback;
  if (/^\d+$/.test(text)) return fallback;
  const cleaned = sanitizeCommercialText(text);
  return cleaned || fallback;
};

/** Etiqueta de categoría legible (nunca devuelve un UUID crudo). */
export const resolveCategoryLabel = (categories = [], value = '') => {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'all') return '';

  const list = Array.isArray(categories) ? categories : [];
  const found = list.find((cat) => {
    const id = String(cat?.id || '').toLowerCase();
    const slug = String(cat?.slug || '').toLowerCase();
    const name = String(cat?.name || '').toLowerCase();
    const needle = raw.toLowerCase();
    return id === needle || slug === needle || name === needle;
  });

  if (found?.name) return found.name;
  return isUuid(raw) ? '' : sanitizeCommercialText(raw);
};

/**
 * Mapeo de prefijos comerciales estandarizados según categoría o tipo de producto:
 * ej. Portátiles -> porta-01, Discos -> disc-02, Consolas -> cons-03
 */
const CATEGORY_PREFIX_MAP = [
  { match: /(?:port[aá]til|laptop|notebook)/i, prefix: 'porta' },
  { match: /(?:disco|m\.?2|ssd|almacenamiento|nvme|hdd)/i, prefix: 'disc' },
  { match: /(?:consola|playstation|ps[45]|xbox|nintendo|switch)/i, prefix: 'cons' },
  { match: /(?:diadema|auricular|aud[ií]fono|headset|audio|parlante|sonido)/i, prefix: 'audi' },
  { match: /(?:perif[eé]rico|teclado|mouse|pad|cable|hub|adaptador)/i, prefix: 'peri' },
  { match: /(?:monitor|pantalla|display|tv)/i, prefix: 'moni' },
  { match: /(?:celular|tel[eé]fono|smartphone|tablet|ipad)/i, prefix: 'movil' },
  { match: /(?:componente|ram|procesador|gpu|tarjeta|fuente|board|chasis)/i, prefix: 'comp' },
];

/**
 * Genera un código de referencia corto y estandarizado (ej. porta-01, disc-02, cons-03).
 */
export const generateShortReference = (productName = '', category = '', existingProducts = []) => {
  const combined = `${productName} ${category}`.toLowerCase();
  let prefix = 'item';

  for (const item of CATEGORY_PREFIX_MAP) {
    if (item.match.test(combined)) {
      prefix = item.prefix;
      break;
    }
  }

  if (prefix === 'item' && category) {
    const cleanCat = String(category).toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
    if (cleanCat.length >= 3) prefix = cleanCat;
  }

  // Contar cuántos productos existentes ya usan este prefijo para secuenciar (-01, -02, etc.)
  let maxSeq = 0;
  const list = Array.isArray(existingProducts) ? existingProducts : [];
  list.forEach((p) => {
    const ref = String(p?.reference || p?.sku || '').toLowerCase().trim();
    if (ref.startsWith(`${prefix}-`)) {
      const numPart = parseInt(ref.replace(`${prefix}-`, ''), 10);
      if (!isNaN(numPart) && numPart > maxSeq) {
        maxSeq = numPart;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${prefix}-${nextSeq}`;
};

/**
 * Formatea o sanea una referencia para vista pública o inventario:
 * NUNCA devuelve un UUID ni identificadores técnicos de más de 20 caracteres.
 */
export const formatDisplayReference = (reference = '', productName = '', category = '', id = '') => {
  const raw = String(reference || '').trim();
  if (raw && !isUuid(raw) && raw.length <= 16 && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(raw)) {
    return raw.toLowerCase();
  }

  // Si no hay referencia limpia o era un UUID, generar referencia corta determinística
  const combined = `${productName} ${category}`.toLowerCase();
  let prefix = 'item';
  for (const item of CATEGORY_PREFIX_MAP) {
    if (item.match.test(combined)) {
      prefix = item.prefix;
      break;
    }
  }

  // Generar sufijo numérico de 2 dígitos basado en hash del id o nombre
  const seed = String(id || productName || '01');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = Math.abs(hash | 0);
  }
  const seq = String((hash % 99) + 1).padStart(2, '0');
  return `${prefix}-${seq}`;
};

/**
 * Formatea el EAN para que maneje cadenas comerciales limpias de 8 a 9 dígitos (ej. 77012345).
 * Elimina cualquier UUID, hash o token extenso.
 */
export const formatCleanEan = (eanOrId = '', fallbackSeed = '') => {
  const str = String(eanOrId || '').trim();

  // Si ya es un número limpio de 8 a 9 dígitos
  if (/^\d{8,9}$/.test(str)) {
    return str;
  }

  // Si es un número más largo (ej. EAN-13), tomar los primeros 8 dígitos
  const onlyDigits = str.replace(/\D/g, '');
  if (onlyDigits.length >= 8) {
    return onlyDigits.slice(0, 8);
  }

  // Si es un UUID o texto alfa-numérico largo, derivar código numérico estable de 8 dígitos (prefijo 77 Colombia)
  const seed = str || String(fallbackSeed || 'javrelstore');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = Math.abs(hash | 0);
  }
  const suffix = String(hash % 1000000).padStart(6, '0');
  return `77${suffix}`;
};
