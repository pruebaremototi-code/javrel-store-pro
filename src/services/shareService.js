import { formatCurrency } from './storeService';

/**
 * Generación de enlaces y copys comerciales para el Centro de Difusión.
 * Un único lugar para que WhatsApp, Facebook/Messenger y TikTok mantengan
 * el mismo precio, descripción y enlace canónico del producto.
 */

const FALLBACK_ORIGIN = 'https://mercado-tecnologico.vercel.app';
export const TIKTOK_UPLOAD_URL = 'https://www.tiktok.com/upload?lang=es';
export const MESSENGER_HOME_URL = 'https://www.messenger.com/';

export const getShareOrigin = () => {
  if (typeof window === 'undefined') return FALLBACK_ORIGIN;
  return window.location.origin || FALLBACK_ORIGIN;
};

/**
 * URL canónica del producto: /p/:id.
 * Es el endpoint público de la ficha completa (Open Graph + ficha interactiva),
 * sin parámetros intermedios ni variantes locales.
 */
export const buildProductShareUrl = (product) => {
  const id = String(product?.id || '').trim();
  const origin = getShareOrigin();
  if (!id) return `${origin}/`;
  return `${origin}/p/${encodeURIComponent(id)}`;
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
 * Copy comercial minimalista de alto impacto:
 * nombre del artículo, precio de oferta con descuento, CTA corta y enlace
 * directo a la ficha. Sin bloques técnicos, viñetas ni relleno.
 */
const buildMinimalCopy = (
  product,
  { bold = false, cta = 'Ver ficha completa', emoji = '👉' } = {}
) => {
  const { offer, hasRegular, discount } = getPriceInfo(product);
  const name = getProductName(product);
  const price = formatCurrency(offer);

  const title = bold ? `🚀 *${name}*` : `🚀 ${name}`;
  const priceLine = hasRegular
    ? `🔥 ${bold ? `*${price}*` : price} · ${discount}% OFF`
    : `🔥 ${bold ? `*${price}*` : price}`;

  return [title, '', priceLine, '', `${emoji} ${cta}`, buildProductShareUrl(product)].join('\n');
};

export const buildWhatsAppShareText = (product) =>
  buildMinimalCopy(product, { bold: true, cta: 'Ver ficha completa' });

export const buildWhatsAppStatusText = (product) => {
  const { offer, hasRegular, discount } = getPriceInfo(product);
  const price = formatCurrency(offer);
  const priceLine = hasRegular ? `🔥 *${price}* · ${discount}% OFF` : `🔥 *${price}*`;

  return [
    `🚀 *${getProductName(product)}*`,
    '',
    priceLine,
    '',
    '👉 Ver ficha completa',
    buildProductShareUrl(product),
  ].join('\n');
};

export const buildFacebookShareText = (product) =>
  buildMinimalCopy(product, { cta: 'Ver ficha completa' });

export const buildFacebookStoryText = (product) => {
  const { offer, hasRegular, discount } = getPriceInfo(product);
  const price = formatCurrency(offer);
  const priceLine = hasRegular ? `🔥 ${price} · ${discount}% OFF` : `🔥 ${price}`;

  return [
    `🚀 ${getProductName(product)}`,
    '',
    priceLine,
    '',
    '👉 Ver ficha completa',
    buildProductShareUrl(product),
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
  `fb-messenger://share/?link=${encodeURIComponent(url || '')}`;

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
  if (typeof navigator.canShare !== 'function') {
    return true;
  }
  try {
    const testFile = new File([''], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
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

  let file = null;
  if (blob) {
    try {
      file = new File([blob], fileName, { type: 'image/png' });
    } catch {
      file = null;
    }
  }

  // 1) Si admite archivos, adjuntar el archivo PNG con el texto y título
  if (file && typeof navigator.canShare === 'function') {
    try {
      if (navigator.canShare({ files: [file] })) {
        return await navigator.share({
          title,
          text,
          files: [file],
        });
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      // Continuar al fallback si canShare falló
    }
  }

  // 2) Fallback para navegadores que solo comparten texto + url
  const payload = { title };
  if (text) payload.text = text;
  if (url) payload.url = url;

  return await navigator.share(payload);
};

