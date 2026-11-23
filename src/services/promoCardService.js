import { formatCurrency } from './storeService';
import { sanitizeCommercialText, cleanBrand, getProductSlug } from './textUtils';

/**
 * Motor de tarjetas promocionales para el Centro de Difusión.
 * Genera imágenes PNG 100% en el navegador con Canvas 2D, sin servicios
 * externos, para que el operador descargue o comparta la pieza al instante.
 */

const FONT_HEAD = '"Sora", "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const FONT_BODY = '"Instrument Sans", "Sora", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

/** Favicon/logo corporativo que se dibuja en el encabezado de cada tarjeta. */
export const STORE_LOGO_URL = '/zafra/logo-menu.webp';

export const PROMO_FORMATS = [
  {
    id: 'story',
    label: 'WhatsApp Estado / Historias',
    ratio: '9:16',
    caption: 'WhatsApp Estado, Instagram & TikTok Stories',
    width: 1080,
    height: 1920,
    badge: '9:16 Vertical Extremo',
    network: 'WhatsApp / Instagram / TikTok',
  },
  {
    id: 'square',
    label: 'Publicación Cuadrada',
    ratio: '1:1',
    caption: 'Instagram Feed, Facebook Post & Catálogo',
    width: 1080,
    height: 1080,
    badge: '1:1 Cuadrado Perfecto',
    network: 'Instagram / Facebook',
  },
  {
    id: 'portrait',
    label: 'Vertical Contenido (Reels / TikTok)',
    ratio: '4:5',
    caption: 'TikTok, Instagram Reels & Feed Vertical',
    width: 1080,
    height: 1350,
    badge: '4:5 Vertical Optimizado',
    network: 'TikTok / Reels / Shorts',
  },
  {
    id: 'panoramic',
    label: 'X (Twitter) & Telegram',
    ratio: '16:9',
    caption: 'X / Twitter, Telegram & Chats Grupales',
    width: 1200,
    height: 675,
    badge: '16:9 Panorámico HD',
    network: 'X (Twitter) / Telegram',
  },
  {
    id: 'landscape',
    label: 'Facebook / LinkedIn Post Ancho',
    ratio: '1.91:1',
    caption: 'Facebook Link Card & LinkedIn Post',
    width: 1200,
    height: 628,
    badge: '1.91:1 Banner Web',
    network: 'Facebook / LinkedIn',
  },
];

export const PROMO_THEMES = [
  {
    id: 'classic',
    label: 'Clásica',
    caption: 'Azul y blanco',
    preview: 'linear-gradient(135deg,#F8FAFF 0%,#FFFFFF 55%,#DBEAFE 100%)',
    tone: 'light',
  },
  {
    id: 'offer',
    label: 'Oferta',
    caption: 'Azul profundo',
    preview: 'linear-gradient(135deg,#061A3B 0%,#0A2E73 55%,#0A6CFF 100%)',
    tone: 'dark',
  },
  {
    id: 'cobalt',
    label: 'Cobalto Neón',
    caption: 'Cobalto + cian',
    preview: 'linear-gradient(135deg,#020617 0%,#041C4F 45%,#0A6CFF 78%,#22D3EE 100%)',
    tone: 'dark',
  },
  {
    id: 'obsidian',
    label: 'Obsidiana',
    caption: 'Negro + oro',
    preview: 'linear-gradient(135deg,#050509 0%,#12121C 52%,#2A1B3D 78%,#B45309 100%)',
    tone: 'dark',
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    caption: 'Verde corporativo',
    preview: 'linear-gradient(135deg,#022C22 0%,#064E3B 50%,#10B981 100%)',
    tone: 'dark',
  },
  {
    id: 'sunset',
    label: 'Atardecer',
    caption: 'Degradado premium',
    preview: 'linear-gradient(135deg,#2E1065 0%,#9D174D 52%,#F97316 100%)',
    tone: 'dark',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    caption: 'Violeta + cian',
    preview: 'linear-gradient(135deg,#1E1B4B 0%,#7C3AED 55%,#22D3EE 100%)',
    tone: 'dark',
  },
  {
    id: 'midnight',
    label: 'Medianoche',
    caption: 'Azul noche + plata',
    preview: 'linear-gradient(135deg,#020617 0%,#0F172A 55%,#64748B 100%)',
    tone: 'dark',
  },
  {
    id: 'ruby',
    label: 'Rubí',
    caption: 'Carmesí + dorado',
    preview: 'linear-gradient(135deg,#450A0A 0%,#991B1B 55%,#F43F5E 100%)',
    tone: 'dark',
  },
  {
    id: 'aqua',
    label: 'Aqua',
    caption: 'Turquesa profundo',
    preview: 'linear-gradient(135deg,#042F2E 0%,#0F766E 55%,#2DD4BF 100%)',
    tone: 'dark',
  },
  {
    id: 'royal',
    label: 'Real',
    caption: 'Púrpura + magenta',
    preview: 'linear-gradient(135deg,#2E1065 0%,#6D28D9 55%,#C026D3 100%)',
    tone: 'dark',
  },
  {
    id: 'graphite',
    label: 'Grafito',
    caption: 'Grafito + lima',
    preview: 'linear-gradient(135deg,#0B0F19 0%,#1F2937 55%,#4B5563 100%)',
    tone: 'dark',
  },
  {
    id: 'habano',
    label: 'Habano Cálido',
    caption: 'Tabaco + crema',
    preview: 'linear-gradient(135deg,#FBF3E7 0%,#EAD3B4 55%,#C79A6B 100%)',
    tone: 'light',
  },
  {
    id: 'celeste',
    label: 'Celeste Brillante',
    caption: 'Azul cielo + blanco',
    preview: 'linear-gradient(135deg,#EFF8FF 0%,#BFE3FF 50%,#7CC7FF 100%)',
    tone: 'light',
  },
  {
    id: 'violeta',
    label: 'Morado Profundo',
    caption: 'Violeta intenso',
    preview: 'linear-gradient(135deg,#1E0A3C 0%,#4C1D95 55%,#7E22CE 100%)',
    tone: 'dark',
  },
  {
    id: 'lavanda',
    label: 'Lavanda Suave',
    caption: 'Lila + blanco',
    preview: 'linear-gradient(135deg,#FAF5FF 0%,#E9D5FF 50%,#C4B5FD 100%)',
    tone: 'light',
  },
  {
    id: 'naranja',
    label: 'Naranja Vibrante',
    caption: 'Cítrico + durazno',
    preview: 'linear-gradient(135deg,#FFF7ED 0%,#FFD9A8 50%,#FB923C 100%)',
    tone: 'light',
  },
  {
    id: 'chrome',
    label: 'Plata Cromada',
    caption: 'Metal pulido',
    preview: 'linear-gradient(135deg,#F8FAFC 0%,#D7DEE8 45%,#9AA7B8 75%,#E2E8F0 100%)',
    tone: 'light',
  },
  {
    id: 'bronce',
    label: 'Bronce Elegante',
    caption: 'Bronce + ámbar',
    preview: 'linear-gradient(135deg,#2A1A0F 0%,#6B4226 55%,#B87333 100%)',
    tone: 'dark',
  },
  {
    id: 'platino',
    label: 'Platino Sutil',
    caption: 'Gris perla + blanco',
    preview: 'linear-gradient(135deg,#F8FAFC 0%,#E8EDF3 55%,#B8C4D2 100%)',
    tone: 'light',
  },
  {
    id: 'cobre',
    label: 'Cobre Brillante',
    caption: 'Cobre + naranja',
    preview: 'linear-gradient(135deg,#2B0F06 0%,#9A3412 55%,#F97316 100%)',
    tone: 'dark',
  },
  {
    id: 'rosagold',
    label: 'Oro Rosa',
    caption: 'Rosa metalizado',
    preview: 'linear-gradient(135deg,#FFF1F2 0%,#F9D5D3 50%,#E7A9A0 100%)',
    tone: 'light',
  },
  {
    id: 'dualneon',
    label: 'Dual Neón 3D',
    caption: 'Cian + magenta',
    preview: 'linear-gradient(135deg,#050B1F 0%,#0E7490 45%,#DB2777 100%)',
    tone: 'dark',
  },
  {
    id: 'dualfire',
    label: 'Dual Fuego 3D',
    caption: 'Rojo + ámbar',
    preview: 'linear-gradient(135deg,#1A0505 0%,#B91C1C 50%,#F59E0B 100%)',
    tone: 'dark',
  },
];

export const PROMO_CTA_OPTIONS = ['Ver en Tienda', '¡Cómpralo Ya!', 'Apartar ahora'];

const PALETTES = {
  classic: {
    bgFrom: '#F8FAFF',
    bgMid: '#FFFFFF',
    bgTo: '#E8F1FF',
    glow: 'rgba(10,108,255,0.16)',
    orb1: 'rgba(10,108,255,0.14)',
    orb2: 'rgba(56,189,248,0.18)',
    accentBar: '#0A6CFF',
    text: '#0B1430',
    muted: '#111C2E',
    subtle: '#334155',
    accent: '#0A6CFF',
    accentSoft: '#E8F1FF',
    offer: '#0A6CFF',
    regular: '#475569',
    ctaBg: '#0A6CFF',
    ctaText: '#FFFFFF',
    badgeBg: '#0A6CFF',
    badgeText: '#FFFFFF',
    border: '#DBEAFE',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.95)',
    imageShadow: 'rgba(15,23,42,0.18)',
    panelFill: 'rgba(255,255,255,0.78)',
    panelBorder: 'rgba(255,255,255,0.95)',
    panelShadow: 'rgba(15,23,42,0.08)',
    guaranteeBg: '#E8F1FF',
    guaranteeBorder: '#DBEAFE',
    guaranteeText: '#0647B8',
    check: '#0A6CFF',
    shadow: 'rgba(15,23,42,0.14)',
    isDark: false,
  },
  offer: {
    bgFrom: '#061A3B',
    bgMid: '#0A2E73',
    bgTo: '#0A6CFF',
    glow: 'rgba(255,255,255,0.18)',
    orb1: 'rgba(253,224,71,0.16)',
    orb2: 'rgba(56,189,248,0.24)',
    accentBar: '#FDE047',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(255,255,255,0.80)',
    accent: '#FFFFFF',
    accentSoft: 'rgba(255,255,255,0.14)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.62)',
    ctaBg: '#FFFFFF',
    ctaText: '#0A2E73',
    badgeBg: '#FDE047',
    badgeText: '#0A2E73',
    border: 'rgba(255,255,255,0.24)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.35)',
    imageShadow: 'rgba(0,0,0,0.42)',
    panelFill: 'rgba(255,255,255,0.10)',
    panelBorder: 'rgba(255,255,255,0.18)',
    panelShadow: 'rgba(0,0,0,0.25)',
    guaranteeBg: 'rgba(255,255,255,0.14)',
    guaranteeBorder: 'rgba(255,255,255,0.26)',
    guaranteeText: '#FFFFFF',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.3)',
    isDark: true,
  },
  cobalt: {
    bgFrom: '#020617',
    bgMid: '#041C4F',
    bgTo: '#0A6CFF',
    glow: 'rgba(34,211,238,0.22)',
    orb1: 'rgba(34,211,238,0.28)',
    orb2: 'rgba(168,85,247,0.24)',
    accentBar: '#22D3EE',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(224,255,255,0.80)',
    accent: '#22D3EE',
    accentSoft: 'rgba(34,211,238,0.14)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.62)',
    ctaBg: '#22D3EE',
    ctaText: '#031633',
    badgeBg: '#22D3EE',
    badgeText: '#031633',
    border: 'rgba(255,255,255,0.18)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(34,211,238,0.45)',
    imageShadow: 'rgba(0,0,0,0.48)',
    panelFill: 'rgba(255,255,255,0.08)',
    panelBorder: 'rgba(34,211,238,0.25)',
    panelShadow: 'rgba(0,0,0,0.28)',
    guaranteeBg: 'rgba(34,211,238,0.12)',
    guaranteeBorder: 'rgba(34,211,238,0.35)',
    guaranteeText: '#E0FFFF',
    check: '#22D3EE',
    shadow: 'rgba(0,0,0,0.4)',
    isDark: true,
  },
  obsidian: {
    bgFrom: '#050509',
    bgMid: '#12121C',
    bgTo: '#2A1B3D',
    glow: 'rgba(251,191,36,0.16)',
    orb1: 'rgba(251,191,36,0.18)',
    orb2: 'rgba(168,85,247,0.20)',
    accentBar: '#FBBF24',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(255,255,255,0.78)',
    accent: '#FBBF24',
    accentSoft: 'rgba(251,191,36,0.12)',
    offer: '#FBBF24',
    regular: 'rgba(255,255,255,0.55)',
    ctaBg: '#FBBF24',
    ctaText: '#1C1917',
    badgeBg: '#FBBF24',
    badgeText: '#1C1917',
    border: 'rgba(255,255,255,0.14)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(251,191,36,0.35)',
    imageShadow: 'rgba(0,0,0,0.58)',
    panelFill: 'rgba(255,255,255,0.06)',
    panelBorder: 'rgba(251,191,36,0.22)',
    panelShadow: 'rgba(0,0,0,0.38)',
    guaranteeBg: 'rgba(251,191,36,0.10)',
    guaranteeBorder: 'rgba(251,191,36,0.30)',
    guaranteeText: '#FEF3C7',
    check: '#FBBF24',
    shadow: 'rgba(0,0,0,0.5)',
    isDark: true,
  },
  emerald: {
    bgFrom: '#022C22',
    bgMid: '#064E3B',
    bgTo: '#10B981',
    glow: 'rgba(167,243,208,0.18)',
    orb1: 'rgba(52,211,153,0.24)',
    orb2: 'rgba(250,204,21,0.16)',
    accentBar: '#34D399',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(236,253,245,0.80)',
    accent: '#A7F3D0',
    accentSoft: 'rgba(167,243,208,0.14)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.62)',
    ctaBg: '#ECFDF5',
    ctaText: '#064E3B',
    badgeBg: '#A7F3D0',
    badgeText: '#064E3B',
    border: 'rgba(255,255,255,0.18)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(167,243,208,0.40)',
    imageShadow: 'rgba(0,0,0,0.42)',
    panelFill: 'rgba(255,255,255,0.08)',
    panelBorder: 'rgba(167,243,208,0.24)',
    panelShadow: 'rgba(0,0,0,0.24)',
    guaranteeBg: 'rgba(167,243,208,0.12)',
    guaranteeBorder: 'rgba(167,243,208,0.32)',
    guaranteeText: '#ECFDF5',
    check: '#A7F3D0',
    shadow: 'rgba(0,0,0,0.35)',
    isDark: true,
  },
  sunset: {
    bgFrom: '#2E1065',
    bgMid: '#9D174D',
    bgTo: '#F97316',
    glow: 'rgba(253,224,71,0.20)',
    orb1: 'rgba(251,146,60,0.28)',
    orb2: 'rgba(244,114,182,0.24)',
    accentBar: '#FDE047',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(255,255,255,0.80)',
    accent: '#FEF3C7',
    accentSoft: 'rgba(254,243,199,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.62)',
    ctaBg: '#FFFFFF',
    ctaText: '#7C2D12',
    badgeBg: '#FDE047',
    badgeText: '#7C2D12',
    border: 'rgba(255,255,255,0.20)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(253,224,71,0.40)',
    imageShadow: 'rgba(0,0,0,0.42)',
    panelFill: 'rgba(255,255,255,0.10)',
    panelBorder: 'rgba(255,255,255,0.22)',
    panelShadow: 'rgba(0,0,0,0.26)',
    guaranteeBg: 'rgba(255,255,255,0.12)',
    guaranteeBorder: 'rgba(255,255,255,0.28)',
    guaranteeText: '#FFFFFF',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.4)',
    isDark: true,
  },
  aurora: {
    bgFrom: '#1E1B4B',
    bgMid: '#5B21B6',
    bgTo: '#7C3AED',
    glow: 'rgba(34,211,238,0.22)',
    orb1: 'rgba(34,211,238,0.28)',
    orb2: 'rgba(244,114,182,0.24)',
    accentBar: '#22D3EE',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(237,233,254,0.82)',
    accent: '#22D3EE',
    accentSoft: 'rgba(34,211,238,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.70)',
    ctaBg: '#22D3EE',
    ctaText: '#0B1026',
    badgeBg: '#22D3EE',
    badgeText: '#0B1026',
    border: 'rgba(255,255,255,0.22)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(34,211,238,0.45)',
    imageShadow: 'rgba(0,0,0,0.50)',
    panelFill: 'rgba(255,255,255,0.12)',
    panelFillTop: 'rgba(255,255,255,0.22)',
    panelBorder: 'rgba(34,211,238,0.32)',
    panelShadow: 'rgba(0,0,0,0.32)',
    edgeShine: 'rgba(34,211,238,0.55)',
    orb3: 'rgba(253,224,71,0.14)',
    guaranteeBg: 'rgba(34,211,238,0.14)',
    guaranteeBorder: 'rgba(34,211,238,0.38)',
    guaranteeText: '#ECFEFF',
    check: '#22D3EE',
    shadow: 'rgba(0,0,0,0.42)',
    isDark: true,
  },
  midnight: {
    bgFrom: '#020617',
    bgMid: '#0F172A',
    bgTo: '#334155',
    glow: 'rgba(226,232,240,0.18)',
    orb1: 'rgba(148,163,184,0.26)',
    orb2: 'rgba(56,189,248,0.18)',
    accentBar: '#E2E8F0',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(226,232,240,0.80)',
    accent: '#E2E8F0',
    accentSoft: 'rgba(226,232,240,0.14)',
    offer: '#7DD3FC',
    regular: 'rgba(255,255,255,0.68)',
    ctaBg: '#E2E8F0',
    ctaText: '#0F172A',
    badgeBg: '#E2E8F0',
    badgeText: '#0F172A',
    border: 'rgba(255,255,255,0.20)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(226,232,240,0.40)',
    imageShadow: 'rgba(0,0,0,0.55)',
    panelFill: 'rgba(255,255,255,0.09)',
    panelFillTop: 'rgba(255,255,255,0.18)',
    panelBorder: 'rgba(226,232,240,0.24)',
    panelShadow: 'rgba(0,0,0,0.38)',
    edgeShine: 'rgba(226,232,240,0.5)',
    orb3: 'rgba(125,211,252,0.18)',
    guaranteeBg: 'rgba(226,232,240,0.12)',
    guaranteeBorder: 'rgba(226,232,240,0.30)',
    guaranteeText: '#F8FAFC',
    check: '#7DD3FC',
    shadow: 'rgba(0,0,0,0.48)',
    isDark: true,
  },
  ruby: {
    bgFrom: '#450A0A',
    bgMid: '#991B1B',
    bgTo: '#F43F5E',
    glow: 'rgba(253,224,71,0.20)',
    orb1: 'rgba(251,113,133,0.28)',
    orb2: 'rgba(253,224,71,0.20)',
    accentBar: '#FDE047',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(255,228,230,0.82)',
    accent: '#FDE047',
    accentSoft: 'rgba(253,224,71,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.70)',
    ctaBg: '#FFFFFF',
    ctaText: '#7F1D1D',
    badgeBg: '#FDE047',
    badgeText: '#7F1D1D',
    border: 'rgba(255,255,255,0.22)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(253,224,71,0.40)',
    imageShadow: 'rgba(0,0,0,0.45)',
    panelFill: 'rgba(255,255,255,0.12)',
    panelFillTop: 'rgba(255,255,255,0.22)',
    panelBorder: 'rgba(253,224,71,0.30)',
    panelShadow: 'rgba(0,0,0,0.28)',
    edgeShine: 'rgba(253,224,71,0.5)',
    orb3: 'rgba(244,114,182,0.18)',
    guaranteeBg: 'rgba(255,255,255,0.12)',
    guaranteeBorder: 'rgba(255,255,255,0.30)',
    guaranteeText: '#FFFFFF',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.40)',
    isDark: true,
  },
  aqua: {
    bgFrom: '#042F2E',
    bgMid: '#0F766E',
    bgTo: '#14B8A6',
    glow: 'rgba(153,246,228,0.20)',
    orb1: 'rgba(45,212,191,0.28)',
    orb2: 'rgba(250,204,21,0.16)',
    accentBar: '#5EEAD4',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(204,251,241,0.82)',
    accent: '#5EEAD4',
    accentSoft: 'rgba(94,234,212,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.70)',
    ctaBg: '#ECFDF5',
    ctaText: '#064E3B',
    badgeBg: '#5EEAD4',
    badgeText: '#064E3B',
    border: 'rgba(255,255,255,0.22)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(94,234,212,0.42)',
    imageShadow: 'rgba(0,0,0,0.42)',
    panelFill: 'rgba(255,255,255,0.12)',
    panelFillTop: 'rgba(255,255,255,0.22)',
    panelBorder: 'rgba(94,234,212,0.30)',
    panelShadow: 'rgba(0,0,0,0.26)',
    edgeShine: 'rgba(94,234,212,0.55)',
    orb3: 'rgba(45,212,191,0.20)',
    guaranteeBg: 'rgba(94,234,212,0.14)',
    guaranteeBorder: 'rgba(94,234,212,0.34)',
    guaranteeText: '#ECFDF5',
    check: '#5EEAD4',
    shadow: 'rgba(0,0,0,0.35)',
    isDark: true,
  },
  royal: {
    bgFrom: '#2E1065',
    bgMid: '#6D28D9',
    bgTo: '#C026D3',
    glow: 'rgba(253,224,71,0.18)',
    orb1: 'rgba(192,38,211,0.30)',
    orb2: 'rgba(253,224,71,0.18)',
    accentBar: '#FDE047',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(243,232,255,0.82)',
    accent: '#FDE047',
    accentSoft: 'rgba(253,224,71,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.70)',
    ctaBg: '#FFFFFF',
    ctaText: '#4C1D95',
    badgeBg: '#FDE047',
    badgeText: '#4C1D95',
    border: 'rgba(255,255,255,0.22)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(253,224,71,0.40)',
    imageShadow: 'rgba(0,0,0,0.45)',
    panelFill: 'rgba(255,255,255,0.12)',
    panelFillTop: 'rgba(255,255,255,0.22)',
    panelBorder: 'rgba(253,224,71,0.30)',
    panelShadow: 'rgba(0,0,0,0.28)',
    edgeShine: 'rgba(253,224,71,0.5)',
    orb3: 'rgba(244,114,182,0.18)',
    guaranteeBg: 'rgba(255,255,255,0.12)',
    guaranteeBorder: 'rgba(255,255,255,0.30)',
    guaranteeText: '#FFFFFF',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.40)',
    isDark: true,
  },
  graphite: {
    bgFrom: '#0B0F19',
    bgMid: '#1F2937',
    bgTo: '#4B5563',
    glow: 'rgba(163,230,53,0.16)',
    orb1: 'rgba(163,230,53,0.20)',
    orb2: 'rgba(148,163,184,0.24)',
    accentBar: '#A3E635',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.94)',
    subtle: 'rgba(226,232,240,0.78)',
    accent: '#A3E635',
    accentSoft: 'rgba(163,230,53,0.14)',
    offer: '#A3E635',
    regular: 'rgba(255,255,255,0.66)',
    ctaBg: '#A3E635',
    ctaText: '#14200A',
    badgeBg: '#A3E635',
    badgeText: '#14200A',
    border: 'rgba(255,255,255,0.20)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(163,230,53,0.35)',
    imageShadow: 'rgba(0,0,0,0.55)',
    panelFill: 'rgba(255,255,255,0.08)',
    panelFillTop: 'rgba(255,255,255,0.16)',
    panelBorder: 'rgba(163,230,53,0.26)',
    panelShadow: 'rgba(0,0,0,0.38)',
    edgeShine: 'rgba(163,230,53,0.5)',
    orb3: 'rgba(148,163,184,0.2)',
    guaranteeBg: 'rgba(163,230,53,0.10)',
    guaranteeBorder: 'rgba(163,230,53,0.28)',
    guaranteeText: '#ECFCCB',
    check: '#A3E635',
    shadow: 'rgba(0,0,0,0.48)',
    isDark: true,
  },
  habano: {
    bgFrom: '#FBF3E7',
    bgMid: '#EAD3B4',
    bgTo: '#C79A6B',
    glow: 'rgba(146,64,14,0.16)',
    orb1: 'rgba(146,64,14,0.16)',
    orb2: 'rgba(253,230,138,0.28)',
    orb3: 'rgba(120,53,15,0.10)',
    accentBar: '#92400E',
    text: '#2B1608',
    muted: '#3F2410',
    subtle: '#5A3A1E',
    accent: '#B45309',
    accentSoft: '#F5E3CB',
    offer: '#9A3412',
    regular: '#6B4A2B',
    ctaBg: '#7C2D12',
    ctaText: '#FFF7ED',
    badgeBg: '#92400E',
    badgeText: '#FFF7ED',
    border: '#E7D3B8',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.95)',
    imageShadow: 'rgba(69,26,3,0.22)',
    panelFill: 'rgba(255,255,255,0.72)',
    panelFillTop: 'rgba(255,255,255,0.92)',
    panelBorder: 'rgba(255,255,255,0.95)',
    panelShadow: 'rgba(69,26,3,0.14)',
    edgeShine: 'rgba(180,83,9,0.35)',
    guaranteeBg: '#F5E3CB',
    guaranteeBorder: '#E7D3B8',
    guaranteeText: '#7C2D12',
    check: '#B45309',
    shadow: 'rgba(69,26,3,0.18)',
    isDark: false,
  },
  celeste: {
    bgFrom: '#EFF8FF',
    bgMid: '#BFE3FF',
    bgTo: '#7CC7FF',
    glow: 'rgba(2,132,199,0.18)',
    orb1: 'rgba(2,132,199,0.18)',
    orb2: 'rgba(255,255,255,0.5)',
    orb3: 'rgba(56,189,248,0.22)',
    accentBar: '#0284C7',
    text: '#082F49',
    muted: '#0C3B57',
    subtle: '#155E75',
    accent: '#0284C7',
    accentSoft: '#E0F2FE',
    offer: '#0369A1',
    regular: '#475569',
    ctaBg: '#0284C7',
    ctaText: '#FFFFFF',
    badgeBg: '#0EA5E9',
    badgeText: '#032B44',
    border: '#BAE6FD',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.95)',
    imageShadow: 'rgba(3,105,161,0.22)',
    panelFill: 'rgba(255,255,255,0.75)',
    panelFillTop: 'rgba(255,255,255,0.95)',
    panelBorder: 'rgba(255,255,255,0.95)',
    panelShadow: 'rgba(3,105,161,0.12)',
    edgeShine: 'rgba(14,165,233,0.4)',
    guaranteeBg: '#E0F2FE',
    guaranteeBorder: '#BAE6FD',
    guaranteeText: '#075985',
    check: '#0284C7',
    shadow: 'rgba(3,105,161,0.16)',
    isDark: false,
  },
  violeta: {
    bgFrom: '#1E0A3C',
    bgMid: '#4C1D95',
    bgTo: '#7E22CE',
    glow: 'rgba(168,85,247,0.26)',
    orb1: 'rgba(168,85,247,0.28)',
    orb2: 'rgba(244,114,182,0.20)',
    orb3: 'rgba(99,102,241,0.22)',
    accentBar: '#C084FC',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(243,232,255,0.82)',
    accent: '#C084FC',
    accentSoft: 'rgba(192,132,252,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.68)',
    ctaBg: '#F5D0FE',
    ctaText: '#3B0764',
    badgeBg: '#C084FC',
    badgeText: '#2E1065',
    border: 'rgba(255,255,255,0.20)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(192,132,252,0.45)',
    imageShadow: 'rgba(0,0,0,0.50)',
    panelFill: 'rgba(255,255,255,0.10)',
    panelFillTop: 'rgba(255,255,255,0.20)',
    panelBorder: 'rgba(192,132,252,0.32)',
    panelShadow: 'rgba(0,0,0,0.34)',
    edgeShine: 'rgba(192,132,252,0.55)',
    guaranteeBg: 'rgba(192,132,252,0.14)',
    guaranteeBorder: 'rgba(192,132,252,0.36)',
    guaranteeText: '#FAE8FF',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.42)',
    isDark: true,
  },
  lavanda: {
    bgFrom: '#FAF5FF',
    bgMid: '#E9D5FF',
    bgTo: '#C4B5FD',
    glow: 'rgba(124,58,237,0.16)',
    orb1: 'rgba(124,58,237,0.16)',
    orb2: 'rgba(244,114,182,0.16)',
    orb3: 'rgba(167,139,250,0.20)',
    accentBar: '#7C3AED',
    text: '#2E1065',
    muted: '#4C1D95',
    subtle: '#5B21B6',
    accent: '#7C3AED',
    accentSoft: '#F3E8FF',
    offer: '#6D28D9',
    regular: '#6B7280',
    ctaBg: '#6D28D9',
    ctaText: '#FFFFFF',
    badgeBg: '#8B5CF6',
    badgeText: '#FFFFFF',
    border: '#DDD6FE',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.95)',
    imageShadow: 'rgba(76,29,149,0.22)',
    panelFill: 'rgba(255,255,255,0.75)',
    panelFillTop: 'rgba(255,255,255,0.94)',
    panelBorder: 'rgba(255,255,255,0.95)',
    panelShadow: 'rgba(76,29,149,0.12)',
    edgeShine: 'rgba(139,92,246,0.4)',
    guaranteeBg: '#F3E8FF',
    guaranteeBorder: '#DDD6FE',
    guaranteeText: '#5B21B6',
    check: '#7C3AED',
    shadow: 'rgba(76,29,149,0.16)',
    isDark: false,
  },
  naranja: {
    bgFrom: '#FFF7ED',
    bgMid: '#FFD9A8',
    bgTo: '#FB923C',
    glow: 'rgba(234,88,12,0.18)',
    orb1: 'rgba(234,88,12,0.18)',
    orb2: 'rgba(253,224,71,0.30)',
    orb3: 'rgba(251,146,60,0.24)',
    accentBar: '#EA580C',
    text: '#3B1500',
    muted: '#5A2600',
    subtle: '#7C3A0A',
    accent: '#C2410C',
    accentSoft: '#FFEDD5',
    offer: '#C2410C',
    regular: '#6B4A2B',
    ctaBg: '#EA580C',
    ctaText: '#FFFFFF',
    badgeBg: '#F97316',
    badgeText: '#3B1500',
    border: '#FED7AA',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.95)',
    imageShadow: 'rgba(154,52,18,0.22)',
    panelFill: 'rgba(255,255,255,0.72)',
    panelFillTop: 'rgba(255,255,255,0.92)',
    panelBorder: 'rgba(255,255,255,0.95)',
    panelShadow: 'rgba(154,52,18,0.14)',
    edgeShine: 'rgba(234,88,12,0.4)',
    guaranteeBg: '#FFEDD5',
    guaranteeBorder: '#FED7AA',
    guaranteeText: '#9A3412',
    check: '#EA580C',
    shadow: 'rgba(154,52,18,0.18)',
    isDark: false,
  },
  chrome: {
    bgFrom: '#F8FAFC',
    bgMid: '#D7DEE8',
    bgTo: '#9AA7B8',
    glow: 'rgba(71,85,105,0.16)',
    orb1: 'rgba(255,255,255,0.60)',
    orb2: 'rgba(71,85,105,0.18)',
    orb3: 'rgba(148,163,184,0.25)',
    accentBar: '#475569',
    text: '#0F172A',
    muted: '#1E293B',
    subtle: '#334155',
    accent: '#475569',
    accentSoft: '#E2E8F0',
    offer: '#0F172A',
    regular: '#64748B',
    ctaBg: '#1E293B',
    ctaText: '#F8FAFC',
    badgeBg: '#334155',
    badgeText: '#F8FAFC',
    border: '#CBD5E1',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.95)',
    imageShadow: 'rgba(15,23,42,0.24)',
    panelFill: 'rgba(255,255,255,0.70)',
    panelFillTop: 'rgba(255,255,255,0.95)',
    panelBorder: 'rgba(255,255,255,0.95)',
    panelShadow: 'rgba(15,23,42,0.16)',
    edgeShine: 'rgba(255,255,255,0.85)',
    guaranteeBg: '#E2E8F0',
    guaranteeBorder: '#CBD5E1',
    guaranteeText: '#334155',
    check: '#475569',
    shadow: 'rgba(15,23,42,0.20)',
    isDark: false,
  },
  bronce: {
    bgFrom: '#2A1A0F',
    bgMid: '#6B4226',
    bgTo: '#B87333',
    glow: 'rgba(251,191,36,0.20)',
    orb1: 'rgba(251,191,36,0.22)',
    orb2: 'rgba(180,83,9,0.30)',
    orb3: 'rgba(253,224,71,0.14)',
    accentBar: '#E0A45C',
    text: '#FFFFFF',
    muted: 'rgba(255,247,237,0.95)',
    subtle: 'rgba(254,243,199,0.80)',
    accent: '#E0A45C',
    accentSoft: 'rgba(224,164,92,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.68)',
    ctaBg: '#F5DEB3',
    ctaText: '#3B2412',
    badgeBg: '#E0A45C',
    badgeText: '#2A1A0F',
    border: 'rgba(255,255,255,0.20)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(224,164,92,0.45)',
    imageShadow: 'rgba(0,0,0,0.50)',
    panelFill: 'rgba(255,255,255,0.10)',
    panelFillTop: 'rgba(255,255,255,0.20)',
    panelBorder: 'rgba(224,164,92,0.30)',
    panelShadow: 'rgba(0,0,0,0.30)',
    edgeShine: 'rgba(224,164,92,0.55)',
    guaranteeBg: 'rgba(224,164,92,0.14)',
    guaranteeBorder: 'rgba(224,164,92,0.34)',
    guaranteeText: '#FEF3C7',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.40)',
    isDark: true,
  },
  platino: {
    bgFrom: '#F8FAFC',
    bgMid: '#E8EDF3',
    bgTo: '#B8C4D2',
    glow: 'rgba(148,163,184,0.16)',
    orb1: 'rgba(226,232,240,0.60)',
    orb2: 'rgba(148,163,184,0.20)',
    orb3: 'rgba(255,255,255,0.50)',
    accentBar: '#64748B',
    text: '#111827',
    muted: '#1F2937',
    subtle: '#374151',
    accent: '#64748B',
    accentSoft: '#F1F5F9',
    offer: '#111827',
    regular: '#6B7280',
    ctaBg: '#334155',
    ctaText: '#F8FAFC',
    badgeBg: '#64748B',
    badgeText: '#FFFFFF',
    border: '#DCE3EA',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.98)',
    imageShadow: 'rgba(15,23,42,0.18)',
    panelFill: 'rgba(255,255,255,0.72)',
    panelFillTop: 'rgba(255,255,255,0.95)',
    panelBorder: 'rgba(255,255,255,0.98)',
    panelShadow: 'rgba(15,23,42,0.12)',
    edgeShine: 'rgba(255,255,255,0.90)',
    guaranteeBg: '#F1F5F9',
    guaranteeBorder: '#DCE3EA',
    guaranteeText: '#334155',
    check: '#64748B',
    shadow: 'rgba(15,23,42,0.16)',
    isDark: false,
  },
  cobre: {
    bgFrom: '#2B0F06',
    bgMid: '#9A3412',
    bgTo: '#F97316',
    glow: 'rgba(251,146,60,0.26)',
    orb1: 'rgba(251,146,60,0.30)',
    orb2: 'rgba(253,224,71,0.20)',
    orb3: 'rgba(244,114,182,0.14)',
    accentBar: '#FDBA74',
    text: '#FFFFFF',
    muted: 'rgba(255,247,237,0.95)',
    subtle: 'rgba(255,237,213,0.82)',
    accent: '#FDBA74',
    accentSoft: 'rgba(253,186,116,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.70)',
    ctaBg: '#FFEDD5',
    ctaText: '#7C2D12',
    badgeBg: '#FDBA74',
    badgeText: '#7C2D12',
    border: 'rgba(255,255,255,0.22)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(253,186,116,0.45)',
    imageShadow: 'rgba(0,0,0,0.45)',
    panelFill: 'rgba(255,255,255,0.12)',
    panelFillTop: 'rgba(255,255,255,0.22)',
    panelBorder: 'rgba(253,186,116,0.32)',
    panelShadow: 'rgba(0,0,0,0.28)',
    edgeShine: 'rgba(253,186,116,0.55)',
    guaranteeBg: 'rgba(253,186,116,0.14)',
    guaranteeBorder: 'rgba(253,186,116,0.34)',
    guaranteeText: '#FFEDD5',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.40)',
    isDark: true,
  },
  rosagold: {
    bgFrom: '#FFF1F2',
    bgMid: '#F9D5D3',
    bgTo: '#E7A9A0',
    glow: 'rgba(190,24,93,0.14)',
    orb1: 'rgba(190,24,93,0.14)',
    orb2: 'rgba(253,224,71,0.22)',
    orb3: 'rgba(244,114,182,0.18)',
    accentBar: '#BE185D',
    text: '#4A1D1F',
    muted: '#5F2528',
    subtle: '#7F2D33',
    accent: '#BE185D',
    accentSoft: '#FFE4E6',
    offer: '#9F1239',
    regular: '#6B4A4B',
    ctaBg: '#9F1239',
    ctaText: '#FFF1F2',
    badgeBg: '#BE185D',
    badgeText: '#FFF1F2',
    border: '#FBCFE8',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(255,255,255,0.95)',
    imageShadow: 'rgba(136,19,55,0.20)',
    panelFill: 'rgba(255,255,255,0.72)',
    panelFillTop: 'rgba(255,255,255,0.93)',
    panelBorder: 'rgba(255,255,255,0.95)',
    panelShadow: 'rgba(136,19,55,0.12)',
    edgeShine: 'rgba(190,24,93,0.35)',
    guaranteeBg: '#FFE4E6',
    guaranteeBorder: '#FBCFE8',
    guaranteeText: '#9F1239',
    check: '#BE185D',
    shadow: 'rgba(136,19,55,0.16)',
    isDark: false,
  },
  dualneon: {
    bgFrom: '#050B1F',
    bgMid: '#0E7490',
    bgTo: '#DB2777',
    glow: 'rgba(34,211,238,0.24)',
    orb1: 'rgba(34,211,238,0.30)',
    orb2: 'rgba(236,72,153,0.28)',
    orb3: 'rgba(99,102,241,0.24)',
    accentBar: '#22D3EE',
    text: '#FFFFFF',
    muted: 'rgba(255,255,255,0.95)',
    subtle: 'rgba(224,242,254,0.82)',
    accent: '#22D3EE',
    accentSoft: 'rgba(34,211,238,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.70)',
    ctaBg: '#22D3EE',
    ctaText: '#06121F',
    badgeBg: '#22D3EE',
    badgeText: '#06121F',
    border: 'rgba(255,255,255,0.22)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(34,211,238,0.45)',
    imageShadow: 'rgba(0,0,0,0.50)',
    panelFill: 'rgba(255,255,255,0.10)',
    panelFillTop: 'rgba(255,255,255,0.20)',
    panelBorder: 'rgba(34,211,238,0.32)',
    panelShadow: 'rgba(0,0,0,0.32)',
    edgeShine: 'rgba(34,211,238,0.60)',
    guaranteeBg: 'rgba(34,211,238,0.14)',
    guaranteeBorder: 'rgba(34,211,238,0.36)',
    guaranteeText: '#ECFEFF',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.42)',
    isDark: true,
  },
  dualfire: {
    bgFrom: '#1A0505',
    bgMid: '#B91C1C',
    bgTo: '#F59E0B',
    glow: 'rgba(251,146,60,0.26)',
    orb1: 'rgba(251,146,60,0.30)',
    orb2: 'rgba(244,63,94,0.26)',
    orb3: 'rgba(253,224,71,0.20)',
    accentBar: '#FDE047',
    text: '#FFFFFF',
    muted: 'rgba(255,247,237,0.95)',
    subtle: 'rgba(255,237,213,0.82)',
    accent: '#FDE047',
    accentSoft: 'rgba(253,224,71,0.16)',
    offer: '#FDE047',
    regular: 'rgba(255,255,255,0.70)',
    ctaBg: '#FDE047',
    ctaText: '#451A03',
    badgeBg: '#FDE047',
    badgeText: '#451A03',
    border: 'rgba(255,255,255,0.22)',
    imageCard: '#FFFFFF',
    imageBorder: 'rgba(253,224,71,0.45)',
    imageShadow: 'rgba(0,0,0,0.48)',
    panelFill: 'rgba(255,255,255,0.11)',
    panelFillTop: 'rgba(255,255,255,0.21)',
    panelBorder: 'rgba(253,224,71,0.32)',
    panelShadow: 'rgba(0,0,0,0.30)',
    edgeShine: 'rgba(253,224,71,0.55)',
    guaranteeBg: 'rgba(253,224,71,0.13)',
    guaranteeBorder: 'rgba(253,224,71,0.34)',
    guaranteeText: '#FEF3C7',
    check: '#FDE047',
    shadow: 'rgba(0,0,0,0.42)',
    isDark: true,
  },
};

const getFormat = (id) => PROMO_FORMATS.find((format) => format.id === id) || PROMO_FORMATS[0];
const getPalette = (id) => PALETTES[id] || PALETTES.classic;

const roundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const fillRoundRect = (ctx, x, y, width, height, radius, fill) => {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
};

/**
 * Dibuja una imagen emulando CSS object-cover (de borde a borde, cero márgenes blancos).
 * Llena el 100% del contenedor superior sin distorsión, recortando simétricamente el excedente.
 */
const drawImageCover = (ctx, image, dx, dy, dw, dh) => {
  if (!image || !image.width || !image.height) return;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Recorte exacto al área del contenedor de la imagen
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();

  const imgW = image.width;
  const imgH = image.height;
  const imgRatio = imgW / imgH;
  const boxRatio = dw / dh;

  let sx = 0;
  let sy = 0;
  let sw = imgW;
  let sh = imgH;

  if (imgRatio > boxRatio) {
    // La imagen es más ancha que el contenedor -> recortar proporcionalmente lados
    sw = Math.round(imgH * boxRatio);
    sx = Math.round((imgW - sw) / 2);
  } else {
    // La imagen es más alta que el contenedor -> recortar proporcionalmente arriba/abajo
    sh = Math.round(imgW / boxRatio);
    sy = Math.round((imgH - sh) / 2);
  }

  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
};

const wrapText = (ctx, text, maxWidth, maxLines) => {
  const words = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) return [];

  const lines = [];
  let line = '';

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const candidate = line ? `${line} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }

    lines.push(line);
    line = word;

    if (lines.length === maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);

  if (lines.length === maxLines) {
    const consumed = lines.join(' ').split(' ').length;
    if (consumed < words.length) {
      let last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last.trim()}…`;
    }
  }

  return lines;
};

const drawImageContain = (ctx, image, x, y, width, height) => {
  if (!image || !image.width || !image.height) return;
  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );
};

const drawBackground = (ctx, width, height, palette) => {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, palette.bgFrom);
  gradient.addColorStop(0.55, palette.bgMid);
  gradient.addColorStop(1, palette.bgTo);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glowA = ctx.createRadialGradient(
    width * 0.14,
    height * 0.08,
    0,
    width * 0.14,
    height * 0.08,
    width * 0.78
  );
  glowA.addColorStop(0, palette.orb1);
  glowA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(
    width * 0.92,
    height * 0.86,
    0,
    width * 0.92,
    height * 0.86,
    width * 0.7
  );
  glowB.addColorStop(0, palette.orb2);
  glowB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  // Tercer orbe: profundidad adicional para los estilos glass 3D.
  if (palette.orb3) {
    const glowC = ctx.createRadialGradient(
      width * 0.74,
      height * 0.2,
      0,
      width * 0.74,
      height * 0.2,
      width * 0.52
    );
    glowC.addColorStop(0, palette.orb3);
    glowC.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowC;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.save();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(width * 0.93, height * 0.16, width * 0.17, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(width * 0.06, height * 0.82, width * 0.13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const shine = ctx.createLinearGradient(0, 0, width, height);
  shine.addColorStop(0, palette.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.34)');
  shine.addColorStop(0.42, 'rgba(255,255,255,0)');
  shine.addColorStop(1, palette.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(10,108,255,0.04)');
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, width, height);

  // Barrido de luz diagonal: simula el reflejo de una lámina de cristal.
  const sweep = ctx.createLinearGradient(0, height, width, 0);
  sweep.addColorStop(0, 'rgba(255,255,255,0)');
  sweep.addColorStop(0.44, 'rgba(255,255,255,0)');
  sweep.addColorStop(0.5, palette.isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.5)');
  sweep.addColorStop(0.56, 'rgba(255,255,255,0)');
  sweep.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = palette.accentBar;
  ctx.fillRect(0, height - 10, width, 10);
};

/**
 * Fondo sutil que rodea la tarjeta ya redondeada. Mantiene la silueta
 * limpia en Estados de WhatsApp y feeds sin dejar esquinas a 90°.
 */
const drawFrameBackdrop = (ctx, width, height, palette, cardBorder = 'silver') => {
  const backdrop = ctx.createLinearGradient(0, 0, width, height);
  if (cardBorder === 'white') {
    backdrop.addColorStop(0, '#FFFFFF');
    backdrop.addColorStop(1, '#F8FAFC');
  } else if (cardBorder === 'silver') {
    backdrop.addColorStop(0, '#EFF4FC');
    backdrop.addColorStop(1, '#E2E8F0');
  } else {
    // Sutil / Oscuro
    if (palette.isDark) {
      backdrop.addColorStop(0, '#080D18');
      backdrop.addColorStop(1, '#02040A');
    } else {
      backdrop.addColorStop(0, '#EFF4FC');
      backdrop.addColorStop(1, '#DBE6F6');
    }
  }
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  const halo = ctx.createRadialGradient(
    width * 0.5,
    height * 0.14,
    0,
    width * 0.5,
    height * 0.14,
    width * 0.8
  );
  if (cardBorder === 'white') {
    halo.addColorStop(0, 'rgba(255,255,255,0.7)');
  } else if (cardBorder === 'silver') {
    halo.addColorStop(0, 'rgba(203,213,225,0.35)');
  } else {
    halo.addColorStop(0, palette.isDark ? palette.orb1 : 'rgba(10,108,255,0.12)');
  }
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
};

const drawBrandMark = (ctx, x, y, size, logo) => {
  const radius = size * 0.28;

  if (logo && logo.naturalWidth > 0 && logo.naturalHeight > 0) {
    ctx.save();
    roundRect(ctx, x, y, size, size, radius);
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, size, size);

    const ratio = Math.min(size / logo.naturalWidth, size / logo.naturalHeight);
    const logoWidth = logo.naturalWidth * ratio;
    const logoHeight = logo.naturalHeight * ratio;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      logo,
      x + (size - logoWidth) / 2,
      y + (size - logoHeight) / 2,
      logoWidth,
      logoHeight
    );
    ctx.restore();

    ctx.save();
    roundRect(ctx, x + 1, y + 1, size - 2, size - 2, radius);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    return;
  }

  const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
  gradient.addColorStop(0, '#0A6CFF');
  gradient.addColorStop(1, '#38BDF8');
  fillRoundRect(ctx, x, y, size, size, radius, gradient);

  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${Math.round(size * 0.52)}px ${FONT_HEAD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', x + size / 2, y + size / 2 + 2);
  ctx.restore();
};

const drawHeader = (ctx, x, y, width, data, palette, sizes, logo) => {
  drawBrandMark(ctx, x, y, sizes.mark, logo);

  ctx.save();
  ctx.fillStyle = palette.text;
  ctx.font = `800 ${sizes.store}px ${FONT_HEAD}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.storeName, x + sizes.mark + 18, y + sizes.mark / 2 - 2);
  ctx.restore();

  const badgeText = 'CATÁLOGO OFICIAL';
  ctx.save();
  ctx.font = `700 ${sizes.badge}px ${FONT_BODY}`;
  const badgeWidth = ctx.measureText(badgeText).width + 32;
  const badgeHeight = sizes.badge + 22;
  const badgeX = x + width - badgeWidth;
  fillRoundRect(
    ctx,
    badgeX,
    y + (sizes.mark - badgeHeight) / 2,
    badgeWidth,
    badgeHeight,
    badgeHeight / 2,
    palette.accentSoft
  );
  ctx.fillStyle = palette.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + badgeWidth / 2, y + sizes.mark / 2);
  ctx.restore();
};

const drawPlaceholder = (ctx, x, y, width, height, data, palette) => {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, '#E8F1FF');
  gradient.addColorStop(1, '#F8FAFF');
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  const initials = String(data.productName || 'JavrelStore')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  ctx.save();
  ctx.fillStyle = palette.accent;
  ctx.font = `800 ${Math.round(Math.min(width, height) * 0.24)}px ${FONT_HEAD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials || 'JS', x + width / 2, y + height / 2);
  ctx.restore();
};

const drawGlassPanel = (ctx, x, y, width, height, radius, palette) => {
  // Sombra suave para separar el cristal del fondo (profundidad 3D).
  ctx.save();
  ctx.shadowColor = palette.panelShadow;
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 16;
  fillRoundRect(ctx, x, y, width, height, radius, palette.panelFill);
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();

  // Degradado vertical del cristal: más luminoso arriba, translúcido abajo.
  if (palette.panelFillTop) {
    const glassFill = ctx.createLinearGradient(x, y, x, y + height);
    glassFill.addColorStop(0, palette.panelFillTop);
    glassFill.addColorStop(1, palette.panelFill);
    ctx.fillStyle = glassFill;
    ctx.fillRect(x, y, width, height);
  }

  // Línea de brillo superior, como el canto pulido de un vidrio.
  const topShine = ctx.createLinearGradient(x, y, x + width, y);
  topShine.addColorStop(0, 'rgba(255,255,255,0)');
  topShine.addColorStop(
    0.5,
    palette.isDark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.95)'
  );
  topShine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topShine;
  ctx.fillRect(x + radius * 0.6, y + 1.5, width - radius * 1.2, 2.5);

  const highlight = ctx.createLinearGradient(x, y, x, y + height * 0.45);
  highlight.addColorStop(
    0,
    palette.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.85)'
  );
  highlight.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = highlight;
  ctx.fillRect(x, y, width, height * 0.45);

  // Reflejo diagonal tenue dentro del panel.
  const reflection = ctx.createLinearGradient(x, y + height, x + width, y);
  reflection.addColorStop(0, 'rgba(255,255,255,0)');
  reflection.addColorStop(0.46, 'rgba(255,255,255,0)');
  reflection.addColorStop(
    0.5,
    palette.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.4)'
  );
  reflection.addColorStop(0.54, 'rgba(255,255,255,0)');
  reflection.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = reflection;
  ctx.fillRect(x, y, width, height);
  ctx.restore();

  // Borde exterior con brillo de color + borde interior claro (doble canto).
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = palette.edgeShine || palette.panelBorder;
  ctx.lineWidth = 2;
  ctx.stroke();

  roundRect(
    ctx,
    x + 3,
    y + 3,
    width - 6,
    height - 6,
    Math.max(radius - 3, 4)
  );
  ctx.strokeStyle = palette.isDark
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
};

/**
 * Dibuja un badge personalizado del studio con degradados de lujo y bordes translúcidos
 */
const drawStudioCanvasBadge = (ctx, cardX, cardY, cardW, cardH, badge, palette, isPrimary = true) => {
  if (!badge || !badge.enabled || !badge.text) return;
  const text = String(badge.text).trim().toUpperCase();
  if (!text) return;

  const position = badge.position || (isPrimary ? 'top-left' : 'bottom-right');
  const paletteId = badge.palette || 'theme';

  const palMap = {
    theme: { bg: palette.badgeBg, text: palette.badgeText, border: 'rgba(255,255,255,0.45)' },
    'neon-blue': { bg: '#0A6CFF', gradTo: '#00D2FF', text: '#FFFFFF', border: 'rgba(0, 210, 255, 0.6)' },
    gold: { bg: '#111111', gradTo: '#B45309', text: '#FDE047', border: 'rgba(253, 224, 71, 0.5)' },
    emerald: { bg: '#064E3B', gradTo: '#10B981', text: '#ECFDF5', border: 'rgba(52, 211, 153, 0.5)' },
    platinum: { bg: '#F1F5F9', gradTo: '#94A3B8', text: '#0F172A', border: 'rgba(255, 255, 255, 0.9)' },
    lavender: { bg: '#4C1D95', gradTo: '#8B5CF6', text: '#FFFFFF', border: 'rgba(196, 181, 253, 0.5)' },
    fire: { bg: '#DC2626', gradTo: '#F59E0B', text: '#FFFFFF', border: 'rgba(251, 146, 60, 0.6)' },
    'rose-gold': { bg: '#9D174D', gradTo: '#F472B6', text: '#FFFFFF', border: 'rgba(244, 114, 182, 0.5)' },
  };

  const pal = palMap[paletteId] || palMap.theme;
  const fontSize = isPrimary ? 24 : 20;
  const font = isPrimary ? `800 ${fontSize}px ${FONT_HEAD}` : `700 ${fontSize}px ${FONT_BODY}`;

  ctx.save();
  ctx.font = font;
  const paddingX = isPrimary ? 24 : 20;
  const badgeWidth = ctx.measureText(isPrimary ? text : `✓ ${text}`).width + paddingX * 2;
  const badgeHeight = isPrimary ? 48 : 38;
  const radius = isPrimary ? 16 : 19;

  let bx = cardX + 22;
  let by = cardY + 22;

  if (position === 'top-right') {
    bx = cardX + cardW - badgeWidth - 22;
    by = cardY + 22;
  } else if (position === 'bottom-left') {
    bx = cardX + 22;
    by = cardY + cardH - badgeHeight - 22;
  } else if (position === 'bottom-right') {
    bx = cardX + cardW - badgeWidth - 22;
    by = cardY + cardH - badgeHeight - 22;
  } else {
    // top-left por defecto
    bx = cardX + 22;
    by = cardY + 22;
  }

  // Sombra 3D suave
  ctx.shadowColor = 'rgba(0,0,0,0.32)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;

  // Fondo (con degradado si corresponde)
  if (pal.gradTo) {
    const grad = ctx.createLinearGradient(bx, by, bx + badgeWidth, by + badgeHeight);
    grad.addColorStop(0, pal.bg);
    grad.addColorStop(1, pal.gradTo);
    fillRoundRect(ctx, bx, by, badgeWidth, badgeHeight, radius, grad);
  } else {
    fillRoundRect(ctx, bx, by, badgeWidth, badgeHeight, radius, pal.bg);
  }

  // Borde translúcido premium
  ctx.shadowColor = 'transparent';
  roundRect(ctx, bx, by, badgeWidth, badgeHeight, radius);
  ctx.strokeStyle = pal.border || 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Texto nítido con sombra inteligente para máxima legibilidad
  ctx.shadowColor = pal.text === '#0F172A' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = pal.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isPrimary ? text : `✓ ${text}`, bx + badgeWidth / 2, by + badgeHeight / 2);
  ctx.restore();
};

const drawImageCard = (ctx, x, y, width, height, radius, image, data, palette) => {
  ctx.save();
  ctx.shadowColor = palette.imageShadow;
  ctx.shadowBlur = 46;
  ctx.shadowOffsetY = 20;
  fillRoundRect(ctx, x, y, width, height, radius, palette.imageCard);
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = palette.imageBorder;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const padding = Math.min(width, height) * 0.025;
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, width, height);

  if (image && image.width && image.height) {
    // 1) Fondo ambiental dinámico: ampliado y difuminado para rellenar vacíos laterales
    ctx.save();
    try {
      ctx.filter = 'blur(16px)';
    } catch (_) {}
    ctx.globalAlpha = 0.22;
    const bgScale = Math.max(width / image.width, height / image.height) * 1.15;
    const bgW = image.width * bgScale;
    const bgH = image.height * bgScale;
    ctx.drawImage(image, x + (width - bgW) / 2, y + (height - bgH) / 2, bgW, bgH);
    ctx.restore();

    // 2) Imagen principal del producto con acercamiento visual (zoom +6%) y máxima nitidez
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    const zoomFactor = 1.12;
    const scale = Math.min(
      (width - padding * 2) / image.width,
      (height - padding * 2) / image.height
    ) * zoomFactor;
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    ctx.drawImage(
      image,
      x + (width - drawWidth) / 2,
      y + (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();
  } else {
    drawPlaceholder(ctx, x, y, width, height, data, palette);
  }

  const sheen = ctx.createLinearGradient(x, y, x + width * 0.7, y + height);
  sheen.addColorStop(0, 'rgba(255,255,255,0.26)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(15,23,42,0.05)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, width, height);
  ctx.restore();

  // Si viene configuración explícita desde el Studio de Etiquetas
  if (data.badgeConfig) {
    drawStudioCanvasBadge(ctx, x, y, width, height, data.badgeConfig.primary, palette, true);
    drawStudioCanvasBadge(ctx, x, y, width, height, data.badgeConfig.secondary, palette, false);
  } else {
    // Comportamiento por defecto
    if (data.discount > 0) {
      const label = `-${data.discount}%`;
      ctx.save();
      ctx.font = `800 26px ${FONT_HEAD}`;
      const badgeWidth = ctx.measureText(label).width + 28;
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
      fillRoundRect(ctx, x + 22, y + 22, badgeWidth, 50, 16, palette.badgeBg);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = palette.badgeText;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 22 + badgeWidth / 2, y + 47);
      ctx.restore();
    }

    // Insignia de Condición (Nuevo / Seminuevo / Usado)
    if (data.condition && data.condition !== 'Nuevo') {
      const conditionText = data.condition.toUpperCase();
      ctx.save();
      ctx.font = `700 18px ${FONT_BODY}`;
      const condWidth = ctx.measureText(`✓ ${conditionText}`).width + 26;
      const condHeight = 36;
      const condX = x + width - condWidth - 22;
      const condY = y + height - 60;
      const condBg =
        conditionText === 'SEMINUEVO'
          ? 'rgba(217, 119, 6, 0.92)'
          : conditionText === 'USADO'
            ? 'rgba(51, 65, 85, 0.92)'
            : 'rgba(5, 150, 105, 0.92)';
      fillRoundRect(ctx, condX, condY, condWidth, condHeight, 12, condBg);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`✓ ${conditionText}`, condX + condWidth / 2, condY + condHeight / 2);
      ctx.restore();
    }

    // Insignia Comercial Personalizada (Black Friday, Oferta, etc.)
    if (data.commercialTag) {
      const promoLabel = data.commercialTag.toUpperCase();
      const isBf = /black\s*friday/i.test(promoLabel);
      ctx.save();
      ctx.font = `800 22px ${FONT_HEAD}`;
      const promoWidth = ctx.measureText(promoLabel).width + 30;
      const promoHeight = 44;
      const promoX = x + width - promoWidth - 22;
      const promoY = y + 22;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      fillRoundRect(
        ctx,
        promoX,
        promoY,
        promoWidth,
        promoHeight,
        14,
        isBf ? '#09090b' : '#E11D48'
      );
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = isBf ? '#FDE047' : '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(promoLabel, promoX + promoWidth / 2, promoY + promoHeight / 2);
      ctx.restore();
    }
  }
};

/**
 * Aplica sombras de texto de alta definición, nitidez óptica y máximo contraste.
 * Evita halos borrosos o lechosos (shadowBlur excesivo) y genera bordes nítidos y cristalinos.
 */
const applySharpTextShadow = (ctx, palette, kind = 'title') => {
  ctx.shadowOffsetX = 0;
  if (palette.isDark) {
    // Modo oscuro: sombra fina de alto contraste para definir contorno sin emborronar
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    if (kind === 'title') {
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
    } else if (kind === 'price') {
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1.5;
    } else if (kind === 'body') {
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
    } else {
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
    }
  } else {
    // Modo claro: sombra sutil y nítida que despega las letras del fondo sin crear manchas
    ctx.shadowColor = 'rgba(15, 23, 42, 0.16)';
    if (kind === 'title') {
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1.5;
    } else if (kind === 'price') {
      ctx.shadowBlur = 2.5;
      ctx.shadowOffsetY = 1;
    } else if (kind === 'body') {
      ctx.shadowBlur = 1.5;
      ctx.shadowOffsetY = 1;
    } else {
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
    }
  }
};

const drawWrappedText = (
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
  font,
  color,
  align = 'left'
) => {
  if (!text) return 0;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if ('textRendering' in ctx) {
    try { ctx.textRendering = 'optimizeLegibility'; } catch (_) {}
  }
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  ctx.restore();
  return lines.length;
};

const drawPriceRow = (ctx, x, y, data, palette, sizes, glassEffect = true) => {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if ('textRendering' in ctx) {
    try { ctx.textRendering = 'optimizeLegibility'; } catch (_) {}
  }
  ctx.font = `800 ${sizes.offer}px ${FONT_HEAD}`;
  ctx.fillStyle = palette.isDark ? '#FDE047' : palette.offer;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  applySharpTextShadow(ctx, palette, 'price');

  const offerText = formatCurrency(data.offer);
  ctx.fillText(offerText, x, y);
  const offerWidth = ctx.measureText(offerText).width;

  if (data.hasRegular) {
    ctx.font = `700 ${sizes.regular}px ${FONT_BODY}`;
    ctx.fillStyle = palette.isDark ? 'rgba(255,255,255,0.75)' : palette.regular;
    const regularText = formatCurrency(data.regular);
    const regularX = x + offerWidth + 24;
    const regularY = y - sizes.offer * 0.18;
    ctx.fillText(regularText, regularX, regularY);
    const regularWidth = ctx.measureText(regularText).width;
    ctx.beginPath();
    ctx.moveTo(regularX, regularY - sizes.regular * 0.32);
    ctx.lineTo(regularX + regularWidth, regularY - sizes.regular * 0.32);
    ctx.strokeStyle = palette.isDark ? 'rgba(255,255,255,0.75)' : palette.regular;
    ctx.lineWidth = Math.max(2, sizes.regular * 0.08);
    ctx.stroke();
  }
  ctx.restore();
};

const drawCta = (ctx, x, y, width, height, text, palette, fontSize) => {
  ctx.save();
  ctx.shadowColor = palette.shadow;
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  fillRoundRect(ctx, x, y, width, height, height / 2, palette.ctaBg);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = palette.ctaText;
  ctx.font = `800 ${fontSize}px ${FONT_HEAD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${text}  →`, x + width / 2, y + height / 2 + 1);
  ctx.restore();
};

const drawGuarantee = (ctx, x, y, text, palette, fontSize, glassEffect = true) => {
  ctx.save();
  ctx.font = `800 ${fontSize}px ${FONT_BODY}`;
  const textWidth = ctx.measureText(text).width;
  const paddingX = Math.round(fontSize * 1.1);
  const height = Math.round(fontSize + 24);
  const width = textWidth + paddingX * 2 + fontSize * 1.5;

  const bg = !glassEffect
    ? (palette.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)')
    : palette.guaranteeBg;
  const border = !glassEffect
    ? (palette.isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)')
    : palette.guaranteeBorder;
  const textColor = !glassEffect
    ? (palette.isDark ? '#FFFFFF' : '#0F172A')
    : palette.guaranteeText;
  const checkColor = !glassEffect
    ? (palette.isDark ? '#FFFFFF' : '#0A6CFF')
    : palette.check;

  fillRoundRect(ctx, x, y, width, height, height / 2, bg);
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = checkColor;
  ctx.font = `800 ${fontSize}px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', x + paddingX, y + height / 2);

  ctx.fillStyle = textColor;
  ctx.font = `800 ${fontSize}px ${FONT_BODY}`;
  ctx.fillText(text, x + paddingX + fontSize * 1.3, y + height / 2);
  ctx.restore();
};

const drawSquare = (ctx, width, height, data, palette, image, logo, glassEffect = true) => {
  const pad = 44;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  const radius = 36;
  const isDark = palette.isDark;

  // Fondo de la tarjeta con sombra perimetral suave
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;
  fillRoundRect(ctx, pad, pad, cardW, cardH, radius, isDark ? palette.bgFrom : '#FFFFFF');
  ctx.restore();

  // Borde exterior sutil
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Recortar al contenedor
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.clip();

  // 1. Imagen Superior Protagónica Full-Bleed (65% del Área Visual - Cero Espacios Blancos)
  const imgBoxH = 640;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(pad, pad, cardW, imgBoxH);

  if (image && image.width && image.height) {
    drawImageCover(ctx, image, pad, pad, cardW, imgBoxH);
  }

  // Divisor inferior de la imagen
  ctx.beginPath();
  ctx.moveTo(pad, pad + imgBoxH);
  ctx.lineTo(pad + cardW, pad + imgBoxH);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Badges sobre la imagen
  if (data.discount > 0) {
    const badgeText = `-${data.discount}%`;
    ctx.save();
    ctx.font = `800 24px ${FONT_HEAD}`;
    const bW = ctx.measureText(badgeText).width + 24;
    fillRoundRect(ctx, pad + 24, pad + 24, bW, 44, 12, '#0A6CFF');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, pad + 24 + bW / 2, pad + 24 + 23);
    ctx.restore();
  }

  // Contador de fotos
  if (data.photoCount > 1) {
    ctx.save();
    ctx.font = `700 20px ${FONT_HEAD}`;
    fillRoundRect(ctx, pad + cardW - 80, pad + 24, 56, 38, 10, 'rgba(15,23,42,0.7)');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📷 ${data.photoCount}`, pad + cardW - 52, pad + 24 + 20);
    ctx.restore();
  }

  // 2. Fila Marca y Calificación
  const contentPad = pad + 36;
  const contentW = cardW - 72;
  const brandY = pad + imgBoxH + 34;

  ctx.save();
  ctx.font = `800 22px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((data.brand || 'JavrelStore').toUpperCase(), contentPad, brandY);

  // Rating
  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'right';
  ctx.fillText(`★ ${data.rating || '5.0'}`, contentPad + contentW, brandY);
  ctx.restore();

  // 3. Título del producto
  const titleY = brandY + 28;
  drawWrappedText(
    ctx,
    data.productName,
    contentPad,
    titleY,
    contentW,
    38,
    2,
    `800 34px ${FONT_HEAD}`,
    isDark ? '#FFFFFF' : '#0F172A'
  );

  // 4. Insignia / Detalle técnico con salto de línea automático (CERO CORTES)
  const specY = titleY + 84;
  const specText = data.specHighlight || data.description || 'Garantía Oficial Directa · Despacho Inmediato';
  drawWrappedText(
    ctx,
    `✓ ${specText}`,
    contentPad,
    specY,
    contentW,
    26,
    2,
    `700 20px ${FONT_HEAD}`,
    '#059669'
  );

  // Divisor para precios
  const priceDivY = specY + 54;
  ctx.beginPath();
  ctx.moveTo(contentPad, priceDivY);
  ctx.lineTo(contentPad + contentW, priceDivY);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Precios
  const priceY = priceDivY + 36;
  ctx.save();
  ctx.font = `900 48px ${FONT_HEAD}`;
  ctx.fillStyle = isDark ? '#FFFFFF' : '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const offerStr = formatCurrency(data.offer);
  ctx.fillText(offerStr, contentPad, priceY);
  const offerW = ctx.measureText(offerStr).width;

  if (data.hasRegular) {
    const regStr = formatCurrency(data.regular);
    ctx.font = `700 26px ${FONT_HEAD}`;
    ctx.fillStyle = '#94A3B8';
    const regX = contentPad + offerW + 20;
    ctx.fillText(regStr, regX, priceY + 2);
    const regW = ctx.measureText(regStr).width;
    ctx.beginPath();
    ctx.moveTo(regX, priceY + 2);
    ctx.lineTo(regX + regW, priceY + 2);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // 6. Sello de marca limpio al pie (CERO URLs impresas internamente)
  const footerDivY = pad + cardH - 46;
  ctx.beginPath();
  ctx.moveTo(contentPad, footerDivY);
  ctx.lineTo(contentPad + contentW, footerDivY);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const footerY = footerDivY + 23;
  ctx.save();
  ctx.font = `800 20px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('• JavrelStore', contentPad + contentW / 2, footerY);
  ctx.restore();

  ctx.restore(); // fin clip
};

const drawStory = (ctx, width, height, data, palette, image, logo, glassEffect = true) => {
  const pad = 48;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  const radius = 42;
  const isDark = palette.isDark;

  // Fondo de la tarjeta con sombra perimetral
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.22)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 20;
  fillRoundRect(ctx, pad, pad, cardW, cardH, radius, isDark ? palette.bgFrom : '#FFFFFF');
  ctx.restore();

  // Borde exterior
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Recortar al contenedor
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.clip();

  // ── 1. IMAGEN SUPERIOR PROTAGÓNICA FULL-BLEED (65% - 70% del Área Visual - Cero Espacios Blancos) ──
  const imgBoxH = 1270;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(pad, pad, cardW, imgBoxH);

  if (image && image.width && image.height) {
    drawImageCover(ctx, image, pad, pad, cardW, imgBoxH);
  }

  // Divisor inferior de la imagen
  ctx.beginPath();
  ctx.moveTo(pad, pad + imgBoxH);
  ctx.lineTo(pad + cardW, pad + imgBoxH);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Badges sobre la imagen
  if (data.discount > 0) {
    const badgeText = `-${data.discount}%`;
    ctx.save();
    ctx.font = `800 32px ${FONT_HEAD}`;
    const bW = ctx.measureText(badgeText).width + 32;
    fillRoundRect(ctx, pad + 32, pad + 32, bW, 58, 16, '#0A6CFF');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, pad + 32 + bW / 2, pad + 32 + 30);
    ctx.restore();
  }

  if (data.photoCount > 1) {
    ctx.save();
    ctx.font = `700 26px ${FONT_HEAD}`;
    const photoLabel = `📷 ${data.photoCount}`;
    fillRoundRect(ctx, pad + cardW - 110, pad + 32, 78, 48, 12, 'rgba(15,23,42,0.7)');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(photoLabel, pad + cardW - 71, pad + 32 + 25);
    ctx.restore();
  }

  // ── 2. JERARQUÍA TEXTUAL INFERIOR (30% - 35%): Espaciada y sin superposiciones
  const contentPad = pad + 44;
  const contentW = cardW - 88;

  // Fila de Marca y Rating
  const brandY = pad + imgBoxH + 36; // y ≈ 1354
  ctx.save();
  ctx.font = `800 24px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((data.brand || 'JavrelStore').toUpperCase(), contentPad, brandY);

  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'right';
  ctx.fillText(`★ ${data.rating || '5.0'}`, contentPad + contentW, brandY);
  ctx.restore();

  // 1) Título del producto en tipografía gruesa y alto contraste
  const titleY = brandY + 34; // y ≈ 1388
  drawWrappedText(
    ctx,
    data.productName,
    contentPad,
    titleY,
    contentW,
    50,   // lineHeight
    2,    // maxLines
    `900 44px ${FONT_HEAD}`,
    isDark ? '#FFFFFF' : '#0F172A'
  );

  // 2) Precio actual destacado en gran tamaño (+ regular tachado si aplica)
  const priceY = titleY + 100; // y ≈ 1488
  ctx.save();
  ctx.font = `900 62px ${FONT_HEAD}`;
  ctx.fillStyle = isDark ? '#FFFFFF' : '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const offerStr = formatCurrency(data.offer);
  ctx.fillText(offerStr, contentPad, priceY);
  const offerW = ctx.measureText(offerStr).width;

  if (data.hasRegular) {
    const regStr = formatCurrency(data.regular);
    ctx.font = `600 32px ${FONT_HEAD}`;
    ctx.fillStyle = '#94A3B8';
    const regX = contentPad + offerW + 20;
    ctx.fillText(regStr, regX, priceY + 3);
    const regW = ctx.measureText(regStr).width;
    ctx.beginPath();
    ctx.moveTo(regX, priceY + 3);
    ctx.lineTo(regX + regW, priceY + 3);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();

  // 3) Detalles clave / característica principal (1 o 2 líneas bien encuadradas con auto-wrap)
  const specY = priceY + 58; // y ≈ 1546
  const specText = data.specHighlight || data.description || 'Garantía Oficial Directa · Despacho Inmediato a Todo el País';
  drawWrappedText(
    ctx,
    `✓ ${specText}`,
    contentPad,
    specY,
    contentW,
    30,   // lineHeight
    2,    // maxLines
    `700 24px ${FONT_HEAD}`,
    '#059669'
  );

  // 4) Botón visual tipo CTA ("Ver en Tienda")
  const ctaY = specY + 62; // y ≈ 1608
  const ctaBtnW = contentW;
  const ctaBtnH = 64;
  ctx.save();
  const ctaGrad = ctx.createLinearGradient(contentPad, ctaY, contentPad + ctaBtnW, ctaY);
  ctaGrad.addColorStop(0, '#0A6CFF');
  ctaGrad.addColorStop(1, '#0050CC');
  fillRoundRect(ctx, contentPad, ctaY, ctaBtnW, ctaBtnH, 18, ctaGrad);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 28px ${FONT_HEAD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Ver en Tienda →', contentPad + ctaBtnW / 2, ctaY + ctaBtnH / 2);
  ctx.restore();

  // 5) Sello de marca limpio (JavrelStore, CERO URLs impresas)
  const brandStripY = ctaY + ctaBtnH + 32; // y ≈ 1704

  ctx.beginPath();
  ctx.moveTo(contentPad, brandStripY - 14);
  ctx.lineTo(contentPad + contentW, brandStripY - 14);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.font = `800 24px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('● JavrelStore', contentPad + contentW / 2, brandStripY + 16);
  ctx.restore();
  ctx.restore();

  // ── FIN DEL CLIP ──────────────────────────────────────────────────────────
  ctx.restore();
};

const drawPortrait = (ctx, width, height, data, palette, image, logo, glassEffect = true) => {
  const pad = 46;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  const radius = 38;
  const isDark = palette.isDark;

  // Fondo de la tarjeta con sombra perimetral
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  fillRoundRect(ctx, pad, pad, cardW, cardH, radius, isDark ? palette.bgFrom : '#FFFFFF');
  ctx.restore();

  // Borde exterior
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Recortar al contenedor
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.clip();

  // 1. Imagen Superior Protagónica 4:5 (h ≈ 860px - Cero Espacios Blancos)
  const imgBoxH = 860;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(pad, pad, cardW, imgBoxH);

  if (image && image.width && image.height) {
    drawImageCover(ctx, image, pad, pad, cardW, imgBoxH);
  }

  // Divisor inferior de la imagen
  ctx.beginPath();
  ctx.moveTo(pad, pad + imgBoxH);
  ctx.lineTo(pad + cardW, pad + imgBoxH);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Badges sobre imagen
  if (data.discount > 0) {
    const badgeText = `-${data.discount}%`;
    ctx.save();
    ctx.font = `800 26px ${FONT_HEAD}`;
    const bW = ctx.measureText(badgeText).width + 26;
    fillRoundRect(ctx, pad + 26, pad + 26, bW, 48, 14, '#0A6CFF');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, pad + 26 + bW / 2, pad + 26 + 25);
    ctx.restore();
  }

  if (data.photoCount > 1) {
    ctx.save();
    ctx.font = `700 22px ${FONT_HEAD}`;
    fillRoundRect(ctx, pad + cardW - 90, pad + 26, 64, 42, 10, 'rgba(15,23,42,0.7)');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📷 ${data.photoCount}`, pad + cardW - 58, pad + 26 + 22);
    ctx.restore();
  }

  // 2. Fila Marca y Calificación
  const contentPad = pad + 40;
  const contentW = cardW - 80;
  const brandY = pad + imgBoxH + 52;

  ctx.save();
  ctx.font = `800 26px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((data.brand || 'JavrelStore').toUpperCase(), contentPad, brandY);

  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'right';
  ctx.fillText(`★ ${data.rating || '5.0'}`, contentPad + contentW, brandY);
  ctx.restore();

  // 3. Título del producto
  const titleY = brandY + 38;
  drawWrappedText(
    ctx,
    data.productName,
    contentPad,
    titleY,
    contentW,
    48,
    2,
    `800 40px ${FONT_HEAD}`,
    isDark ? '#FFFFFF' : '#0F172A'
  );

  // 4. Descripción corta (2 líneas)
  const descY = titleY + 108;
  drawWrappedText(
    ctx,
    data.description || 'Dispositivo Tecnológico Inteligente diseñado para ofrecer el máximo rendimiento.',
    contentPad,
    descY,
    contentW,
    32,
    2,
    `600 24px ${FONT_BODY}`,
    isDark ? 'rgba(255,255,255,0.7)' : '#64748B'
  );

  // 5. Insignia / Detalle técnico con check verde y auto-wrap (CERO CORTES)
  const specY = descY + 80;
  const specText = data.specHighlight || data.description || 'Garantía Oficial Directa · Despacho Inmediato';
  drawWrappedText(
    ctx,
    `✓ ${specText}`,
    contentPad,
    specY,
    contentW,
    28,
    2,
    `800 24px ${FONT_HEAD}`,
    '#059669'
  );

  // Divisor para precios
  const priceDivY = specY + 60;
  ctx.beginPath();
  ctx.moveTo(contentPad, priceDivY);
  ctx.lineTo(contentPad + contentW, priceDivY);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 6. Precios
  const priceY = priceDivY + 44;
  ctx.save();
  ctx.font = `900 54px ${FONT_HEAD}`;
  ctx.fillStyle = isDark ? '#FFFFFF' : '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const offerStr = formatCurrency(data.offer);
  ctx.fillText(offerStr, contentPad, priceY);
  const offerW = ctx.measureText(offerStr).width;

  if (data.hasRegular) {
    const regStr = formatCurrency(data.regular);
    ctx.font = `700 30px ${FONT_HEAD}`;
    ctx.fillStyle = '#94A3B8';
    const regX = contentPad + offerW + 22;
    ctx.fillText(regStr, regX, priceY + 3);
    const regW = ctx.measureText(regStr).width;
    ctx.beginPath();
    ctx.moveTo(regX, priceY + 3);
    ctx.lineTo(regX + regW, priceY + 3);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // 7. Sello de marca limpio al pie (CERO URLs internas)
  const footerDivY = pad + cardH - 68;
  ctx.beginPath();
  ctx.moveTo(contentPad, footerDivY);
  ctx.lineTo(contentPad + contentW, footerDivY);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const footerY = footerDivY + 35;
  ctx.save();
  ctx.font = `800 24px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('• JavrelStore', contentPad + contentW / 2, footerY);
  ctx.restore();

  ctx.restore();
};

const drawLandscape = (ctx, width, height, data, palette, image, logo, glassEffect = true) => {
  const pad = 40;
  const cardW = width - pad * 2;
  const cardH = height - pad * 2;
  const radius = 32;
  const isDark = palette.isDark;

  // Fondo de la tarjeta con sombra perimetral
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.18)';
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;
  fillRoundRect(ctx, pad, pad, cardW, cardH, radius, isDark ? palette.bgFrom : '#FFFFFF');
  ctx.restore();

  // Borde exterior
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // Recortar al contenedor
  ctx.save();
  roundRect(ctx, pad, pad, cardW, cardH, radius);
  ctx.clip();

  // Disposición en 2 columnas: Columna izquierda = Imagen Full-Bleed (520x520)
  const imgBoxW = Math.min(cardH, 520);
  const imgBoxH = cardH;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(pad, pad, imgBoxW, imgBoxH);

  if (image && image.width && image.height) {
    drawImageCover(ctx, image, pad, pad, imgBoxW, imgBoxH);
  }

  // Divisor vertical entre imagen y contenido
  ctx.beginPath();
  ctx.moveTo(pad + imgBoxW, pad);
  ctx.lineTo(pad + imgBoxW, pad + cardH);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Badge descuento
  if (data.discount > 0) {
    const badgeText = `-${data.discount}%`;
    ctx.save();
    ctx.font = `800 22px ${FONT_HEAD}`;
    const bW = ctx.measureText(badgeText).width + 22;
    fillRoundRect(ctx, pad + 20, pad + 20, bW, 40, 10, '#0A6CFF');
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, pad + 20 + bW / 2, pad + 20 + 21);
    ctx.restore();
  }

  // Columna Derecha: Contenido
  const contentPad = pad + imgBoxW + 36;
  const contentW = cardW - imgBoxW - 68;

  // 1. Marca y Rating
  const brandY = pad + 48;
  ctx.save();
  ctx.font = `800 24px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.brand.toUpperCase(), contentPad, brandY);

  ctx.fillStyle = '#F59E0B';
  ctx.textAlign = 'right';
  ctx.fillText(`★ ${data.rating} 0`, contentPad + contentW, brandY);
  ctx.restore();

  // 2. Título
  const titleY = brandY + 34;
  drawWrappedText(
    ctx,
    data.productName,
    contentPad,
    titleY,
    contentW,
    44,
    2,
    `800 36px ${FONT_HEAD}`,
    isDark ? '#FFFFFF' : '#0F172A'
  );

  // 3. Descripción
  const descY = titleY + 96;
  drawWrappedText(
    ctx,
    data.description || 'Dispositivo Tecnológico Inteligente diseñado para ofrecer el máximo rendimiento.',
    contentPad,
    descY,
    contentW,
    30,
    2,
    `600 20px ${FONT_BODY}`,
    isDark ? 'rgba(255,255,255,0.7)' : '#64748B'
  );

  // 4. Insignia / Detalle con auto-wrap (CERO CORTES)
  const specY = descY + 70;
  const specText = data.specHighlight || data.description || 'Garantía Oficial Directa';
  drawWrappedText(
    ctx,
    `✓ ${specText}`,
    contentPad,
    specY,
    contentW,
    24,
    2,
    `800 22px ${FONT_HEAD}`,
    '#059669'
  );

  // 5. Precios
  const priceDivY = specY + 54;
  ctx.beginPath();
  ctx.moveTo(contentPad, priceDivY);
  ctx.lineTo(contentPad + contentW, priceDivY);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const priceY = priceDivY + 38;
  ctx.save();
  ctx.font = `900 48px ${FONT_HEAD}`;
  ctx.fillStyle = isDark ? '#FFFFFF' : '#0F172A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const offerStr = formatCurrency(data.offer);
  ctx.fillText(offerStr, contentPad, priceY);
  const offerW = ctx.measureText(offerStr).width;

  if (data.hasRegular) {
    const regStr = formatCurrency(data.regular);
    ctx.font = `700 26px ${FONT_HEAD}`;
    ctx.fillStyle = '#94A3B8';
    const regX = contentPad + offerW + 20;
    ctx.fillText(regStr, regX, priceY + 2);
    const regW = ctx.measureText(regStr).width;
    ctx.beginPath();
    ctx.moveTo(regX, priceY + 2);
    ctx.lineTo(regX + regW, priceY + 2);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  // 6. Sello de marca limpio al pie (CERO URLs internas)
  const footerDivY = pad + cardH - 52;
  ctx.beginPath();
  ctx.moveTo(contentPad, footerDivY);
  ctx.lineTo(contentPad + contentW, footerDivY);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const footerY = footerDivY + 26;
  ctx.save();
  ctx.font = `800 20px ${FONT_HEAD}`;
  ctx.fillStyle = '#0A6CFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('• JavrelStore', contentPad + contentW / 2, footerY);
  ctx.restore();

  ctx.restore();
};

const drawPanoramic = (ctx, width, height, data, palette, image, logo, glassEffect = true) => {
  // Panorámico 16:9 usa la misma distribución de 2 columnas de Landscape
  drawLandscape(ctx, width, height, data, palette, image, logo, glassEffect);
};

const buildCardData = (product, config, ctaText, badgeConfig = null) => {
  const offer = Number(product?.price) || 0;
  const regularRaw = Number(product?.originalPrice) || 0;
  const hasRegular = regularRaw > offer && offer > 0;
  const regular = hasRegular ? regularRaw : 0;
  const discount = hasRegular
    ? Math.max(1, Math.round(((regular - offer) / regular) * 100))
    : 0;

  // Si no hay descripción, extraer las especificaciones técnicas principales como resumen
  let desc = sanitizeCommercialText(product?.description || '').slice(0, 220).trim();
  if (!desc && Array.isArray(product?.specs) && product.specs.length > 0) {
    const cleanSpecs = product.specs
      .map((s) => {
        if (typeof s === 'string') return s.replace(/\[object Object\]/g, '').trim();
        if (typeof s === 'object' && s !== null) {
          const k = String(s.title || s.key || '').trim();
          const v = String(s.detail !== undefined ? s.detail : s.value !== undefined ? s.value : '')
            .replace(/\[object Object\]/g, '')
            .trim();
          return k ? `${k}: ${v}` : v;
        }
        return '';
      })
      .filter((s) => s && !/^(CONDICI|ETIQUETA|SKU|EAN|BARCODE|COSTO)/i.test(s));
    desc = cleanSpecs.slice(0, 2).join(' · ');
  }

  const origin = typeof window !== 'undefined' ? (window.location.origin || 'https://www.javrelstore.shop') : 'https://www.javrelstore.shop';
  const storeDomain = 'javrelstore.shop';
  const slug = getProductSlug(product);
  const brand = cleanBrand(product?.brand) || 'JAVRELSTORE';
  const rating = Number(product?.rating || 5).toFixed(0);

  let specHighlight = '';
  if (Array.isArray(product?.specs) && product.specs.length > 0) {
    for (const s of product.specs) {
      if (typeof s === 'string') {
        const clean = s.replace(/\[object Object\]/g, '').trim();
        if (clean && !/^(CONDICI|ETIQUETA|SKU|EAN|BARCODE|COSTO)/i.test(clean)) {
          specHighlight = clean;
          break;
        }
      } else if (typeof s === 'object' && s !== null) {
        const k = String(s.title || s.key || '').trim();
        const v = String(s.detail !== undefined ? s.detail : s.value !== undefined ? s.value : '')
          .replace(/\[object Object\]/g, '')
          .trim();
        if (v && !/^(CONDICI|ETIQUETA|SKU|EAN|BARCODE|COSTO)/i.test(k)) {
          specHighlight = k ? `${k}: ${v}` : v;
          break;
        }
      }
    }
  }
  if (!specHighlight) {
    specHighlight = String(product?.condition && product.condition !== 'Nuevo' ? product.condition : 'NUEVO').toUpperCase();
  }

  return {
    storeName: String(config?.storeName || 'JavrelStore').trim(),
    storeDomain,
    productName: String(product?.name || 'Producto destacado').trim(),
    brand,
    condition: String(product?.condition || 'Nuevo').trim(),
    commercialTag: String(product?.commercialTag || product?.badge || '').trim(),
    description: desc,
    offer,
    regular,
    hasRegular,
    discount,
    rating,
    slug,
    specHighlight,
    ctaText: String(ctaText || 'Ver en Tienda').trim(),
    guaranteeText: String(
      config?.guaranteeText ||
        `Garantía ${String(config?.storeName || 'JavrelStore').trim()} · Compra protegida`
    ).trim(),
    badgeConfig: badgeConfig || null,
  };
};

const waitForFonts = async () => {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('800 48px "Sora"'),
        document.fonts.load('700 28px "Instrument Sans"'),
        document.fonts.ready,
      ]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Si las fuentes tardan, el canvas usa la familia de respaldo.
  }
};

const loadImageSafe = (src, timeoutMs = 4000) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const image = new Image();
    let timer = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
    };

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    // Activar crossOrigin solo si es URL HTTP/HTTPS externa para permitir canvas toBlob()
    if (/^https?:\/\//i.test(src)) {
      image.crossOrigin = 'anonymous';
    }
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';

    image.onload = () => {
      cleanup();
      resolve(image);
    };

    image.onerror = () => {
      cleanup();
      // Si la carga con crossOrigin falla por restricción del servidor externo,
      // resolver null de forma segura para usar el respaldo gráfico sin romper el canvas
      resolve(null);
    };

    image.src = src;
  });

export async function renderPromoCard({
  product,
  config = {},
  imageUrl,
  format = 'story',
  theme = 'classic',
  ctaText = 'Ver en Tienda',
  logoUrl = STORE_LOGO_URL,
  glassEffect = true,
  badgeConfig = null,
  cardBorder = 'frameless',
}) {
  if (typeof document === 'undefined') {
    throw new Error('La generación de tarjetas requiere un navegador.');
  }

  const spec = getFormat(format);
  const palette = getPalette(theme);
  const data = buildCardData(product, config, ctaText, badgeConfig);

  // 1) Composición completa sobre un lienzo interno.
  // Escala 3× nativa para Ultra HD (1080x1920 en story, 1080x1080 en square, 1080x1350 en portrait)
  // para máxima nitidez en pantallas móviles AMOLED y Retina sin pixelado
  const dprScale = (spec.id === 'story' || spec.id === 'square' || spec.id === 'portrait') ? 3 : 2;
  const composition = document.createElement('canvas');
  composition.width = spec.width * dprScale;
  composition.height = spec.height * dprScale;
  if (dprScale > 1) {
    composition.style.width = `${spec.width}px`;
    composition.style.height = `${spec.height}px`;
  }
  const compositionCtx = composition.getContext('2d');
  if (!compositionCtx) throw new Error('No se pudo inicializar el canvas.');
  if (dprScale > 1) {
    compositionCtx.scale(dprScale, dprScale);
  }

  compositionCtx.imageSmoothingEnabled = true;
  compositionCtx.imageSmoothingQuality = 'high';

  await waitForFonts();
  const [image, logo] = await Promise.all([
    loadImageSafe(imageUrl),
    loadImageSafe(logoUrl),
  ]);

  drawBackground(compositionCtx, spec.width, spec.height, palette);

  if (spec.id === 'story') {
    drawStory(compositionCtx, spec.width, spec.height, data, palette, image, logo, glassEffect);
  } else if (spec.id === 'landscape') {
    drawLandscape(compositionCtx, spec.width, spec.height, data, palette, image, logo, glassEffect);
  } else if (spec.id === 'portrait') {
    drawPortrait(compositionCtx, spec.width, spec.height, data, palette, image, logo, glassEffect);
  } else if (spec.id === 'panoramic') {
    drawPanoramic(compositionCtx, spec.width, spec.height, data, palette, image, logo, glassEffect);
  } else {
    drawSquare(compositionCtx, spec.width, spec.height, data, palette, image, logo, glassEffect);
  }

  // 2) Si se selecciona "Sin Marco" (frameless): el degradado de fondo cubre
  // el 100% de la tarjeta de punta a punta sin márgenes grises ni bordes pesados.
  if (cardBorder === 'frameless') {
    return composition;
  }

  // 3) Marco exterior decorativo: para opciones con marco (Plateado Claro, Blanco Puro, Sutil/Oscuro).
  const canvas = document.createElement('canvas');
  canvas.width = spec.width * dprScale;
  canvas.height = spec.height * dprScale;
  if (dprScale > 1) {
    canvas.style.width = `${spec.width}px`;
    canvas.style.height = `${spec.height}px`;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el canvas.');
  if (dprScale > 1) {
    ctx.scale(dprScale, dprScale);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const minSide = Math.min(spec.width, spec.height);
  const margin = Math.max(18, Math.round(minSide * 0.032));
  const radius = Math.max(24, Math.round(minSide * 0.052));
  const innerWidth = spec.width - margin * 2;
  const innerHeight = spec.height - margin * 2;

  drawFrameBackdrop(ctx, spec.width, spec.height, palette, cardBorder);

  ctx.save();
  ctx.shadowColor = palette.isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.28)';
  ctx.shadowBlur = Math.round(minSide * 0.05);
  ctx.shadowOffsetY = Math.round(margin * 0.45);
  fillRoundRect(
    ctx,
    margin,
    margin,
    innerWidth,
    innerHeight,
    radius,
    palette.isDark ? '#0B1220' : '#FFFFFF'
  );
  ctx.restore();

  ctx.save();
  roundRect(ctx, margin, margin, innerWidth, innerHeight, radius);
  ctx.clip();
  ctx.drawImage(composition, margin, margin, innerWidth, innerHeight);
  ctx.restore();

  // 3) Canto de brillo: refuerza la sensación de tarjeta física 3D.
  ctx.save();
  roundRect(ctx, margin + 1, margin + 1, innerWidth - 2, innerHeight - 2, Math.max(radius - 1, 4));
  ctx.strokeStyle = cardBorder === 'white'
    ? 'rgba(255,255,255,0.95)'
    : cardBorder === 'silver'
    ? 'rgba(203,213,225,0.9)'
    : palette.isDark
    ? 'rgba(255,255,255,0.22)'
    : 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  return canvas;
}

export const canvasToBlob = (canvas, type = 'image/png', quality = 0.95) =>
  new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo convertir la tarjeta a imagen.'));
        },
        type,
        quality
      );
    } catch (error) {
      reject(error);
    }
  });

export async function renderPromoCardToBlob(options) {
  try {
    const canvas = await renderPromoCard(options);
    return await canvasToBlob(canvas);
  } catch (error) {
    console.warn('[renderPromoCardToBlob] Fallo de renderizado canvas (posible bloqueo CORS), reintentando con respaldo gráfico seguro:', error);
    try {
      // Reintentar sin la imagen remota que pueda haber contaminado el lienzo (tainted canvas)
      const fallbackCanvas = await renderPromoCard({
        ...options,
        imageUrl: STORE_LOGO_URL,
      });
      return await canvasToBlob(fallbackCanvas);
    } catch (fallbackError) {
      throw error;
    }
  }
}

export const buildPromoFileName = (product, format = 'square') => {
  const base =
    String(product?.name || 'producto')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'producto';
  return `${base}-${getFormat(format).id}-javrelstore.png`;
};

export const downloadBlob = (blob, filename) => {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

/**
 * Copia al portapapeles la tarjeta PNG y, en la misma operación, el copy
 * comercial como `text/plain`. Así WhatsApp / Redes reciben la imagen
 * completa y el texto formateado sin sobrescribir uno con el otro.
 */
export const copyBlobToClipboard = async (blob, text = '') => {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Tu navegador no permite copiar imágenes al portapapeles.');
  }

  const plainText = String(text || '').trim();
  const payload = { [blob.type]: blob };
  if (plainText) payload['text/plain'] = new Blob([plainText], { type: 'text/plain' });

  try {
    await navigator.clipboard.write([new ClipboardItem(payload)]);
  } catch (error) {
    if (!plainText) throw error;
    // Algunos navegadores no aceptan varios tipos en un mismo ClipboardItem:
    // conservamos al menos la imagen para que el pegado visual nunca falle.
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  }
};
