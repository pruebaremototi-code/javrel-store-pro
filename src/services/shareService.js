import { formatCurrency } from './storeService';
import { getProductSlug } from './textUtils';

/**
 * Generación de enlaces y copys comerciales para el Centro de Difusión.
 * Un único lugar para que WhatsApp, Facebook/Messenger y TikTok mantengan
 * el mismo precio, descripción y enlace canónico del producto.
 */

const FALLBACK_ORIGIN = 'https://www.javrelstore.shop';
export const TIKTOK_UPLOAD_URL = 'https://www.tiktok.com/upload?lang=es';
export const MESSENGER_HOME_URL = 'https://www.messenger.com/';

export const getShareOrigin = () => {
  if (typeof window === 'undefined') return FALLBACK_ORIGIN;
  const origin = window.location.origin;
  if (!origin || origin === 'null') return FALLBACK_ORIGIN;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin;
  }
  // En producción priorizar el dominio canónico de marca https://www.javrelstore.shop
  if (origin.includes('javrelstore.shop') || origin.includes('vercel.app')) {
    return 'https://www.javrelstore.shop';
  }
  return origin.replace(/^http:\/\//i, 'https://');
};

/**
 * URL canónica del producto: /p/:slug (con retrocompatibilidad para /p/:id).
 * Genera enlaces limpios, profesionales y amigables basados en el nombre
 * o referencia del producto (ej. https://www.javrelstore.shop/p/xbox-series-s-1tb-sdd).
 */
export const buildProductShareUrl = (product) => {
  const origin = getShareOrigin();
  const slug = getProductSlug(product);
  if (!slug) return `${origin}/`;
  return `${origin}/p/${encodeURIComponent(slug)}`;
};

export const getAbsoluteImageUrl = (image) => {
  const value = String(image || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  return `${getShareOrigin()}${value.startsWith('/') ? '' : '/'}${value}`;
};

const getProductName = (product) => String(product?.name || 'Producto destacado').trim();

const getPriceInfo = (product) => {
  const offer = Number(product?.price) || 0;
  const regular = Number(product?.originalPrice) || 0;
  const hasRegular = regular > offer && offer > 0;
  const savings = hasRegular ? regular - offer : 0;
  const discount = hasRegular ? Math.max(1, Math.round((savings / regular) * 100)) : 0;
  return { offer, regular: hasRegular ? regular : 0, hasRegular, savings, discount };
};

/**
 * Copy comercial omnicanal de alto impacto y máxima claridad:
 * Incluye nombre del artículo, insignia/etiqueta, precios (oferta y regular si aplica),
 * características/especificaciones destacadas o descripción, y enlace directo clickable /p/:id.
 */
const buildMinimalCopy = (
  product,
  { bold = false, cta = 'Ver ficha completa y comprar', emoji = '👉' } = {}
) => {
  const { offer, regular, hasRegular, discount } = getPriceInfo(product);
  const name = getProductName(product);
  const price = formatCurrency(offer);
  const regularPriceStr = hasRegular ? formatCurrency(regular) : '';
  const tag = (product?.commercialTag || product?.badge || '').trim();
  const brand = (product?.brand || '').trim();

  const lines = [];

  // 1. Título e insignia
  const tagPrefix = tag ? `[${tag.toUpperCase()}] ` : '';
  const brandText = brand ? ` · ${brand}` : '';
  lines.push(bold ? `🚀 *${tagPrefix}${name}${brandText}*` : `🚀 ${tagPrefix}${name}${brandText}`);

  // 2. Precios
  lines.push('');
  if (hasRegular) {
    if (bold) {
      lines.push(`🔥 *Precio de Oferta: ${price}* (${discount}% OFF)`);
      lines.push(`💵 Precio Regular: ~${regularPriceStr}~`);
    } else {
      lines.push(`🔥 Precio de Oferta: ${price} (${discount}% OFF)`);
      lines.push(`💵 Precio Regular: ${regularPriceStr}`);
    }
  } else {
    lines.push(bold ? `🔥 *Precio: ${price}*` : `🔥 Precio: ${price}`);
  }

  // 3. Características / Especificaciones destacadas o descripción
  const specsList = Array.isArray(product?.specs) ? product.specs : [];
  const cleanSpecs = [];
  for (const s of specsList) {
    let specText = '';
    if (typeof s === 'string') {
      const clean = s.replace(/\[object Object\]/g, '').trim();
      if (clean && !/^(CONDICI|ETIQUETA|SKU|EAN|BARCODE|COSTO)/i.test(clean)) {
        specText = clean;
      }
    } else if (typeof s === 'object' && s !== null) {
      const k = String(s.title || s.key || '').trim();
      const v = String(s.detail !== undefined ? s.detail : s.value !== undefined ? s.value : '')
        .replace(/\[object Object\]/g, '')
        .trim();
      if (v && !/^(CONDICI|ETIQUETA|SKU|EAN|BARCODE|COSTO)/i.test(k)) {
        specText = k ? `${k}: ${v}` : v;
      }
    }
    if (specText) cleanSpecs.push(specText);
    if (cleanSpecs.length >= 3) break;
  }

  if (cleanSpecs.length > 0) {
    lines.push('');
    lines.push(bold ? '✨ *Características:*' : '✨ Características:');
    cleanSpecs.forEach((spec) => {
      lines.push(`  ✓ ${spec}`);
    });
  } else if (product?.description) {
    const cleanDesc = String(product.description)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
    if (cleanDesc) {
      lines.push('');
      lines.push(`📝 ${cleanDesc}...`);
    }
  }

  // 4. Enlace directo completo y clickable
  lines.push('');
  lines.push(`${emoji} ${cta}:`);
  lines.push(buildProductShareUrl(product));

  return lines.join('\n');
};

export const buildWhatsAppShareText = (product) =>
  buildMinimalCopy(product, { bold: true, cta: 'Ver ficha completa y comprar' });

/**
 * Copy comercial ultra compacto para Estados de WhatsApp y Web Share con imagen:
 * WhatsApp recorta captions largos sobre imágenes superpuestas.
 * Se garantiza límite estricto de caracteres con la URL en línea aislada (Línea 4)
 * sin viñetas previas para que nunca se trunque con "..." y mantenga hipervínculo activo.
 */
export const buildWhatsAppStatusText = (product) => {
  const { offer, hasRegular, discount } = getPriceInfo(product);
  const rawName = getProductName(product);
  const name = rawName.length > 55 ? `${rawName.slice(0, 52).trim()}...` : rawName;
  const price = formatCurrency(offer);
  const url = buildProductShareUrl(product);

  const lines = [
    `🔥 *${name}*`,
    hasRegular ? `💰 *Precio: ${price}* · ${discount}% OFF` : `💰 *Precio: ${price}*`,
  ];

  // Característica destacada o descripción breve (1 o 2 líneas)
  const spec = Array.isArray(product?.specs) && product.specs.length > 0
    ? (typeof product.specs[0] === 'string' ? product.specs[0] : product.specs[0]?.value || product.specs[0]?.title || '')
    : product?.description ? String(product.description).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 85) : '';

  if (spec && !/\[object Object\]/i.test(spec)) {
    lines.push(`✨ ${spec}`);
  }

  lines.push('');
  lines.push('👉 Cómpralo en JavrelStore:');
  lines.push(url);

  return lines.join('\n');
};

export const buildFacebookShareText = (product) =>
  buildMinimalCopy(product, { cta: 'Ver ficha completa' });

export const buildFacebookStoryText = (product) => {
  const { offer } = getPriceInfo(product);
  const rawName = getProductName(product);
  const name = rawName.length > 55 ? `${rawName.slice(0, 52).trim()}...` : rawName;
  const price = formatCurrency(offer);
  const url = buildProductShareUrl(product);

  return [
    `🔥 *${name}* — *${price}*`,
    '',
    '👉 Cómpralo aquí:',
    url,
  ].join('\n');
};

export const buildMessengerShareText = (product) =>
  buildMinimalCopy(product, { cta: 'Ver ficha completa' });

export const TIKTOK_HOOKS = [
  {
    id: 'urgency',
    label: 'Urgencia',
    emoji: '🚨',
    caption: 'Escasez y último aviso',
  },
  {
    id: 'unboxing',
    label: 'Unboxing',
    emoji: '📦',
    caption: 'Muestra real del producto',
  },
  {
    id: 'price',
    label: 'Precio',
    emoji: '💸',
    caption: 'Golpe de oferta directo',
  },
];

const TIKTOK_HOOK_BUILDERS = {
  urgency: ({ name }) => `🚨 Últimas unidades | ${name}`,
  unboxing: ({ name }) => `📦 Unboxing real: ${name}`,
  price: ({ name }) => `💸 ${name} al mejor precio`,
};

export const buildTikTokShareText = (product, config = {}, hookId = 'urgency') => {
  const { offer, hasRegular, discount } = getPriceInfo(product);
  const name = getProductName(product);
  const hook = TIKTOK_HOOK_BUILDERS[hookId] || TIKTOK_HOOK_BUILDERS.urgency;
  const price = formatCurrency(offer);
  const priceLine = hasRegular ? `🔥 ${price} · ${discount}% OFF` : `🔥 ${price}`;

  return [hook({ name }), '', priceLine, '', `👉 ${buildProductShareUrl(product)}`].join('\n');
};

export const buildWhatsAppChatUrl = (text) =>
  `https://api.whatsapp.com/send?text=${encodeURIComponent(text || '')}`;

export const buildWhatsAppStoreUrl = (phone, text) => {
  const cleanPhone = String(phone || '').replace(/\D/g, '');
  const encoded = encodeURIComponent(text || '');
  return cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;
};

export const buildFacebookSharerUrl = (url) =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url || '')}`;

export const buildTwitterShareUrl = (text, url) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text || '')}&url=${encodeURIComponent(url || '')}`;

export const buildTelegramShareUrl = (url, text) =>
  `https://t.me/share/url?url=${encodeURIComponent(url || '')}&text=${encodeURIComponent(text || '')}`;

export const buildMessengerShareUrl = (url) =>
  `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url || '')}&app_id=291494419107518&redirect_uri=${encodeURIComponent(url || '')}`;

/**
 * Detección de dispositivo móvil (Android, iPhone, iPad, etc.)
 */
export const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent || ''
    ) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent || ''))
  );
};

/**
 * Detección específica de entorno Android.
 */
export const isAndroidDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent || '');
};

/**
 * Comprueba si el navegador actual soporta Web Share API con archivos (PNG).
 */
export const canShareNativeFiles = () => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }
  return true;
};

/**
 * Comparte una tarjeta gráfica PNG redondeada y texto comercial mediante la Web Share API nativa.
 * En dispositivos móviles (especialmente Android e iOS) esto abre directamente el diálogo nativo
 * con WhatsApp, Instagram, Facebook, etc., adjuntando el archivo de imagen y el texto de acompañamiento.
 */
export const shareNativePromoCard = async ({
  blob,
  fileName = 'tarjeta-promocional.png',
  title = 'JavrelStore',
  text = '',
  url = '',
}) => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    throw new Error('Web Share API no soportada en este entorno.');
  }

  // Respaldo inmediato en portapapeles para evitar pérdida en cualquier transición de app
  try {
    if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  } catch {}

  let file = null;
  if (blob) {
    try {
      file = new File([blob], fileName, { type: 'image/png' });
    } catch {
      file = null;
    }
  }

  // 1) Si admite archivos (Web Share Level 2 nativo en Android/iOS), adjuntar la tarjeta HD junto al texto oficial
  if (file) {
    try {
      let canShareFiles = true;
      if (typeof navigator.canShare === 'function') {
        try {
          canShareFiles = navigator.canShare({ files: [file] });
        } catch {
          canShareFiles = true;
        }
      }

      if (canShareFiles) {
        return await navigator.share({
          title,
          text,
          files: [file],
        });
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      console.warn('[shareNativePromoCard] Fallback de archivo a solo texto/enlace:', err);
    }
  }

  // 2) Fallback para navegadores que solo comparten texto + url
  const payload = { title };
  if (text) payload.text = text;
  if (url) payload.url = url;

  return await navigator.share(payload);
};

