import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Copy,
  Check,
  Send,
  ExternalLink,
  Link2,
  Share2,
  Download,
  Smartphone,
  Image as ImageIcon,
  Palette,
  Loader2,
  LayoutGrid,
  RectangleVertical,
  Clapperboard,
  Maximize2,
  Store,
  Sparkles,
  Images,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  RotateCcw,
  ChevronDown,
  Tag,
} from 'lucide-react';
import {
  WhatsAppIcon,
  FacebookIcon,
  TikTokIcon,
  MessengerIcon,
  TwitterIcon,
  TelegramIcon,
} from './BrandIcons';
import { AdPreviewCard } from './AdPreviewCard';
import { StatusPrepModal } from './StatusPrepModal';
import { BadgeStudio, getDefaultBadgeSlot } from './BadgeStudio';
import { useVisualEditor } from '../context/VisualEditorContext';
import { PERMISSIONS } from '../config/rbac';
import { formatCurrency, storeService } from '../services/storeService';
import {
  buildProductShareUrl,
  getAbsoluteImageUrl,
  buildWhatsAppShareText,
  buildWhatsAppStatusText,
  buildWhatsAppChatUrl,
  buildFacebookShareText,
  buildFacebookStoryText,
  buildFacebookSharerUrl,
  buildTwitterShareUrl,
  buildTelegramShareUrl,
  buildMessengerShareText,
  buildMessengerShareUrl,
  buildTikTokShareText,
  TIKTOK_HOOKS,
  TIKTOK_UPLOAD_URL,
  MESSENGER_HOME_URL,
  isMobileDevice,
  isAndroidDevice,
  canShareNativeFiles,
  shareNativePromoCard,
} from '../services/shareService';
import {
  PROMO_FORMATS,
  PROMO_THEMES,
  PROMO_CTA_OPTIONS,
  STORE_LOGO_URL,
  renderPromoCardToBlob,
  buildPromoFileName,
  downloadBlob,
  copyBlobToClipboard,
} from '../services/promoCardService';

const CHANNELS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    caption: 'Chats y Estado',
    Icon: WhatsAppIcon,
    iconBg: 'bg-[#25D366] text-white',
    activeTile: 'border-[#25D366]/60 bg-[#25D366]/5 ring-1 ring-[#25D366]/30',
    text: 'text-[#128C7E]',
    primary: 'bg-[#25D366] hover:bg-[#1ebe5b] shadow-emerald-500/25',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    caption: 'Muro e Historias',
    Icon: FacebookIcon,
    iconBg: 'bg-[#1877F2] text-white',
    activeTile: 'border-[#1877F2]/60 bg-[#1877F2]/5 ring-1 ring-[#1877F2]/30',
    text: 'text-[#1877F2]',
    primary: 'bg-[#1877F2] hover:bg-[#0f65d4] shadow-blue-500/25',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    caption: 'Copy viral',
    Icon: TikTokIcon,
    iconBg: 'bg-slate-900 text-white',
    activeTile: 'border-slate-900/40 bg-slate-900/5 ring-1 ring-slate-900/20',
    text: 'text-slate-900',
    primary: 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/25',
  },
];

const FORMAT_ICONS = {
  square:    LayoutGrid,
  story:     RectangleVertical,
  portrait:  RectangleVertical,
  panoramic: Maximize2,
  landscape: Clapperboard,
};

const FORMAT_FRAME = {
  square:    'w-full max-w-[340px] aspect-square',
  story:     'w-full max-w-[220px] aspect-[9/16]',
  portrait:  'w-full max-w-[280px] aspect-[4/5]',
  panoramic: 'w-full max-w-[420px] aspect-[16/9]',
  landscape: 'w-full max-w-[420px] aspect-[1.91/1]',
};

const ToggleGroup = ({ options, value, onChange, label }) => (
  <div
    className="inline-flex rounded-xl bg-slate-100 p-0.5"
    role="group"
    aria-label={label}
  >
    {options.map((option) => {
      const Icon = option.Icon;
      const isActive = value === option.id;
      return (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={isActive}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
            isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {Icon && <Icon className="w-3 h-3" />}
          {option.label}
        </button>
      );
    })}
  </div>
);

const ChipButton = ({ active, onClick, children, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
      active
        ? 'border-[#0A6CFF]/50 bg-blue-50 text-[#0A6CFF] ring-1 ring-[#0A6CFF]/20'
        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
    }`}
  >
    {children}
  </button>
);

export const SocialShareModal = ({ isOpen, onClose, product, config = {}, isAdmin = false }) => {
  const {
    isAdmin: contextIsAdmin,
    isPrimary,
    permissions,
    hasPermission,
  } = useVisualEditor();

  /**
   * Alcance de acceso al Centro de Difusión:
   * - Administrador (hasMarketingAccess = true): control total, editor de copy en tiempo real,
   *   estudio de estados/historias, selección de paletas 3D, y estudio de etiquetas.
   * - Visitante (hasMarketingAccess = false): compartir limpio, seguro y directo (WhatsApp,
   *   redes sociales, copiar texto con enlace canónico /p/:id, descargar/copiar tarjeta PNG
   *   y Web Share API nativa), sin exponer herramientas de edición ni configuraciones internas.
   */
  const hasMarketingAccess = useMemo(() => {
    if (!isAdmin) return false;
    if (isPrimary) return true;
    if (hasPermission?.(PERMISSIONS.EDIT_PAGE)) return true;
    if (hasPermission?.(PERMISSIONS.MANAGE_PRODUCTS)) return true;
    if (!contextIsAdmin && Object.keys(permissions || {}).length === 0) return true;
    return false;
  }, [isAdmin, isPrimary, hasPermission, contextIsAdmin, permissions]);

  const [activeChannel, setActiveChannel] = useState('whatsapp');
  const [whatsappView, setWhatsappView] = useState('chat');
  const [facebookView, setFacebookView] = useState('post');
  const [tiktokHook, setTiktokHook] = useState(TIKTOK_HOOKS[0].id);
  const [previewMode, setPreviewMode] = useState('interactive');
  const [format, setFormat] = useState('square');
  const [theme, setTheme] = useState('classic');
  const [showAllThemes, setShowAllThemes] = useState(false);
  const [glassEffect, setGlassEffect] = useState(true);
  const [ctaText, setCtaText] = useState(PROMO_CTA_OPTIONS[0]);
  const [imageIndex, setImageIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState('');
  const [feedback, setFeedback] = useState('');
  const [busyKey, setBusyKey] = useState('');
  const [cardUrl, setCardUrl] = useState('');
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState('');
  const [copyOverride, setCopyOverride] = useState(null);
  const isMobile = useMemo(() => isMobileDevice(), []);
  const isAndroid = useMemo(() => isAndroidDevice(), []);
  const canShare = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      isMobile &&
      canShareNativeFiles(),
    [isMobile]
  );
  const [prepTarget, setPrepTarget] = useState(null);
  const [prepText, setPrepText] = useState('');
  const [prepBlob, setPrepBlob] = useState(null);
  const [prepUrl, setPrepUrl] = useState('');
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState('');
  const [prepFeedback, setPrepFeedback] = useState('');
  const [prepared, setPrepared] = useState(null);

  // Estado del "Etiquetas & Badges Studio"
  const [badgeConfig, setBadgeConfig] = useState(() => ({
    primary: getDefaultBadgeSlot('primary', product),
    secondary: getDefaultBadgeSlot('secondary', product),
  }));
  const [activeEditingSlot, setActiveEditingSlot] = useState(null);
  const [isSavingBadge, setIsSavingBadge] = useState(false);
  const [saveBadgeSuccess, setSaveBadgeSuccess] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState('channels'); // 'channels' | 'styles' | 'badges'
  const [cardBorder, setCardBorder] = useState('frameless'); // 'frameless' | 'silver' | 'white' | 'none'

  const timerRef = useRef(null);
  const cardUrlRef = useRef('');
  const prepUrlRef = useRef('');
  const prepTimerRef = useRef(null);

  const notify = useCallback((key, message) => {
    setCopiedKey(key);
    setFeedback(message);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCopiedKey('');
      setFeedback('');
    }, 3200);
  }, []);

  const handleSaveBadgeToSupabase = async () => {
    try {
      setIsSavingBadge(true);
      setSaveBadgeSuccess(false);
      const updatedProduct = {
        ...product,
        condition: badgeConfig.secondary?.enabled ? badgeConfig.secondary.text : (product.condition || 'Nuevo'),
        commercialTag: badgeConfig.primary?.enabled ? badgeConfig.primary.text : '',
        badge: badgeConfig.primary?.enabled ? badgeConfig.primary.text : '',
      };
      await storeService.saveProduct(updatedProduct);
      setSaveBadgeSuccess(true);
      notify('badge-save', 'Etiquetas y condición guardadas atómicamente en Supabase.');
      setTimeout(() => setSaveBadgeSuccess(false), 3500);
    } catch (err) {
      console.warn('Error guardando badges en Supabase:', err);
      notify('badge-save-err', 'No se pudo guardar en Supabase. Intenta nuevamente.');
    } finally {
      setIsSavingBadge(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (prepTimerRef.current) clearTimeout(prepTimerRef.current);
      if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current);
      if (prepUrlRef.current) URL.revokeObjectURL(prepUrlRef.current);
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    setImageIndex(0);
    setFeedback('');
    setCopiedKey('');
    setPreviewMode('interactive');
    setCopyOverride(null);
    setPrepTarget(null);
    setPrepText('');
    setPrepFeedback('');
    setPrepared(null);
    setActiveEditingSlot(null);
    setSaveBadgeSuccess(false);
    setBadgeConfig({
      primary: getDefaultBadgeSlot('primary', product),
      secondary: getDefaultBadgeSlot('secondary', product),
    });
  }, [isOpen, product?.id]);

  useEffect(() => {
    setCopyOverride(null);
  }, [activeChannel, whatsappView, facebookView, tiktokHook, product?.id]);

  const productUrl = useMemo(() => {
    return buildProductShareUrl(product);
  }, [product]);
  const cardLogoUrl = config?.logoUrl || STORE_LOGO_URL;

  const images = useMemo(() => {
    if (!product) return [];
    const raw = [
      product.image,
      ...(Array.isArray(product.images) ? product.images : []),
      product.secondaryImage,
      product.packageImage,
      product.detailImage,
    ];
    const list = [];
    raw.forEach((value) => {
      const absolute = getAbsoluteImageUrl(value);
      if (absolute && !list.includes(absolute)) list.push(absolute);
    });
    return list;
  }, [product]);

  const imageUrl = images[imageIndex] || images[0] || '';
  const productName = String(product?.name || 'Producto destacado').trim();
  const brand = String(product?.brand || '').trim();
  const offerPrice = Number(product?.price) || 0;
  const regularPrice = Number(product?.originalPrice) || 0;
  const hasRegularPrice = regularPrice > offerPrice && offerPrice > 0;

  // Configuración estable para el motor de tarjetas: evita regeneraciones
  // infinitas cuando el padre entrega un objeto literal en cada render.
  const cardConfig = useMemo(
    () => ({
      storeName: config?.storeName || '',
      guaranteeText: config?.guaranteeText || '',
    }),
    [config?.storeName, config?.guaranteeText]
  );

  const whatsappText = useMemo(
    () => buildWhatsAppShareText(product, config),
    [product, config]
  );
  const statusText = useMemo(
    () => buildWhatsAppStatusText(product, config),
    [product, config]
  );
  const facebookPostText = useMemo(
    () => buildFacebookShareText(product, config),
    [product, config]
  );
  const facebookStoryText = useMemo(
    () => buildFacebookStoryText(product, config),
    [product, config]
  );
  const messengerText = useMemo(
    () => buildMessengerShareText(product, config),
    [product, config]
  );
  const tiktokText = useMemo(
    () => buildTikTokShareText(product, config, tiktokHook),
    [product, config, tiktokHook]
  );

  const generatedActiveText =
    activeChannel === 'whatsapp'
      ? whatsappView === 'status'
        ? statusText
        : whatsappText
      : activeChannel === 'facebook'
        ? facebookView === 'story'
          ? facebookStoryText
          : facebookPostText
        : tiktokText;

  const activeText = copyOverride ?? generatedActiveText;
  const isCopyEdited = copyOverride !== null && copyOverride !== generatedActiveText;

  const currentChannel = CHANNELS.find((channel) => channel.id === activeChannel) || CHANNELS[0];
  const CurrentChannelIcon = currentChannel.Icon;

  // Catálogo escalable: 8 estilos destacados visibles y el resto tras
  // "Paleta completa" para no saturar el panel.
  const FEATURED_THEME_COUNT = 8;
  const featuredThemes = PROMO_THEMES.slice(0, FEATURED_THEME_COUNT);
  const paletteThemes = showAllThemes ? PROMO_THEMES : featuredThemes;

  /* ── Tarjeta gráfica: generación bajo demanda ─────────────────────────── */
  const generateCardBlob = useCallback(
    (overrides = {}) =>
      renderPromoCardToBlob({
        product,
        config: cardConfig,
        imageUrl: overrides.imageUrl ?? imageUrl,
        format: overrides.format ?? format,
        theme: overrides.theme ?? theme,
        ctaText: overrides.ctaText ?? ctaText,
        logoUrl: cardLogoUrl,
        glassEffect: overrides.glassEffect ?? glassEffect,
        badgeConfig: overrides.badgeConfig ?? badgeConfig,
        cardBorder: overrides.cardBorder ?? cardBorder,
      }),
    [product, cardConfig, imageUrl, format, theme, ctaText, cardLogoUrl, glassEffect, badgeConfig, cardBorder]
  );

  useEffect(() => {
    if (!isOpen || !product || previewMode !== 'graphic') return undefined;
    let cancelled = false;
    setCardLoading(true);
    setCardError('');

    renderPromoCardToBlob({
      product,
      config: cardConfig,
      imageUrl,
      format,
      theme,
      ctaText,
      logoUrl: cardLogoUrl,
      glassEffect,
      badgeConfig,
      cardBorder,
    })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        if (cardUrlRef.current) URL.revokeObjectURL(cardUrlRef.current);
        cardUrlRef.current = url;
        setCardUrl(url);
      })
      .catch((error) => {
        if (cancelled) return;
        setCardError(error?.message || 'No se pudo generar la tarjeta gráfica.');
      })
      .finally(() => {
        if (!cancelled) setCardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, product, cardConfig, imageUrl, format, theme, ctaText, previewMode, cardLogoUrl, glassEffect, badgeConfig, cardBorder]);

  useEffect(() => {
    if (!isOpen || !prepTarget) return undefined;
    let cancelled = false;
    setPrepLoading(true);
    setPrepError('');
    setPrepBlob(null);
    if (prepUrlRef.current) {
      URL.revokeObjectURL(prepUrlRef.current);
      prepUrlRef.current = '';
      setPrepUrl('');
    }

    renderPromoCardToBlob({
      product,
      config: cardConfig,
      imageUrl,
      format: prepTarget.format || 'story',
      theme,
      ctaText,
      logoUrl: cardLogoUrl,
      glassEffect,
      badgeConfig,
      cardBorder,
    })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        prepUrlRef.current = url;
        setPrepBlob(blob);
        setPrepUrl(url);
      })
      .catch((error) => {
        if (cancelled) return;
        setPrepError(error?.message || 'No se pudo generar la tarjeta gráfica.');
      })
      .finally(() => {
        if (!cancelled) setPrepLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, prepTarget, product, cardConfig, imageUrl, theme, ctaText, cardLogoUrl, glassEffect, badgeConfig, cardBorder]);

  if (!isOpen || !product) return null;

  /* ── Utilidades de interacción ────────────────────────────────────────── */
  const writeTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
  };

  const copyText = async (text, key, message = 'Texto copiado al portapapeles') => {
    try {
      await writeTextToClipboard(text);
      notify(key, message);
    } catch {
      notify('', 'No se pudo copiar automáticamente. Selecciona el texto y cópialo.');
    }
  };

  const openWindow = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadCard = async (key = 'card', overrides = {}) => {
    try {
      setBusyKey(key);
      const blob = await generateCardBlob(overrides);
      downloadBlob(blob, buildPromoFileName(product, overrides.format || format));
      notify(key, 'Tarjeta PNG descargada. Lista para tu Estado o publicación.');
    } catch {
      notify('', 'No se pudo generar la tarjeta. Intenta de nuevo.');
    } finally {
      setBusyKey('');
    }
  };

  const handleCopyCard = async (key = 'copy-image', overrides = {}) => {
    try {
      setBusyKey(key);
      const blob = await generateCardBlob(overrides);
      await copyBlobToClipboard(blob, activeText);
      notify(key, 'Tarjeta + copy copiados. Pega la imagen (Ctrl+V) y el texto en tu publicación.');
    } catch {
      notify('', 'Tu navegador no permite copiar imágenes. Usa “Descargar PNG”.');
    } finally {
      setBusyKey('');
    }
  };

  const handleNativeShare = async (key = 'native-share', overrides = {}) => {
    try {
      setBusyKey(key);
      const targetFormat = overrides.format || format;
      const textToShare = overrides.text || activeText;
      const blob = await generateCardBlob({ format: targetFormat });
      const fileName = buildPromoFileName(product, targetFormat);

      await shareNativePromoCard({
        blob,
        fileName,
        title: `${productName} · ${config?.storeName || 'JavrelStore'}`,
        text: textToShare,
        url: productUrl,
      });

      notify(key, 'Tarjeta y texto enviados a compartir.');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.warn('Error al compartir nativamente:', error);
      notify('', 'No se pudo abrir el menú nativo. Usa "Copiar imagen" o "Descargar PNG".');
    } finally {
      setBusyKey('');
    }
  };

  const showPrepFeedback = (message) => {
    setPrepFeedback(message);
    if (prepTimerRef.current) clearTimeout(prepTimerRef.current);
    prepTimerRef.current = setTimeout(() => setPrepFeedback(''), 4200);
  };

  const closePrep = () => {
    setPrepTarget(null);
    setPrepBlob(null);
    setPrepText('');
    setPrepFeedback('');
    if (prepUrlRef.current) {
      URL.revokeObjectURL(prepUrlRef.current);
      prepUrlRef.current = '';
    }
    setPrepUrl('');
  };

  const openPrepModal = (options = {}) => {
    const channel = options.channel || activeChannel;
    setPrepared(null);
    setPrepText(options.text || activeText);
    setPrepTarget({
      channel,
      format: options.format || 'story',
      text: options.text || activeText,
      openUrl:
        options.openUrl ||
        (channel === 'whatsapp'
          ? 'https://web.whatsapp.com/'
          : channel === 'facebook'
            ? 'https://www.facebook.com/'
            : TIKTOK_UPLOAD_URL),
      title:
        options.title ||
        (channel === 'whatsapp'
          ? 'Preparar Estado de WhatsApp'
          : channel === 'facebook'
            ? 'Preparar Historia de Facebook'
            : 'Preparar publicación de TikTok'),
    });
    setPrepFeedback('');
  };

  const handleShareCard = (key = 'share-card', options = {}) => {
    openPrepModal(options);
    notify(key, 'Estudio de preparación abierto.');
  };

  const handlePrepareChatSend = async () => {
    try {
      setBusyKey('wa-prepare');
      const blob = await generateCardBlob({ format: 'square' });
      let imageReady = false;

      try {
        // Una sola escritura: la imagen PNG viaja junto al copy formateado.
        await copyBlobToClipboard(blob, activeText);
        imageReady = true;
      } catch {
        imageReady = false;
      }

      setPrepared({
        channel: 'whatsapp',
        format: 'square',
        imageReady,
        text: activeText,
        title: 'Chat individual de WhatsApp',
        openUrl: buildWhatsAppChatUrl(activeText),
      });

      openWindow(buildWhatsAppChatUrl(activeText));
      notify(
        'wa-prepare',
        imageReady
          ? 'Tarjeta + copy copiados. En el chat pega la imagen con Ctrl+V y envía.'
          : 'Copy listo. Pega la imagen desde “Copiar imagen” o descárgala en PNG.'
      );
    } catch {
      notify('', 'No se pudo preparar la tarjeta. Inténtalo de nuevo desde el estudio.');
    } finally {
      setBusyKey('');
    }
  };

  const handleDirectWhatsAppShare = async (key = 'direct-wa') => {
    try {
      setBusyKey(key);
      const waUrl = buildWhatsAppChatUrl(activeText);
      try {
        await writeTextToClipboard(activeText);
      } catch {}
      openWindow(waUrl);
      notify(key, 'WhatsApp abierto con mensaje oficial y enlace del producto.');
    } catch {
      openWindow(buildWhatsAppChatUrl(activeText));
    } finally {
      setBusyKey('');
    }
  };

  const handleShareFacebook = () => {
    openWindow(buildFacebookSharerUrl(productUrl));
    notify('share-fb', 'Abriendo Facebook para compartir el producto.');
  };

  const handleShareTwitter = () => {
    openWindow(buildTwitterShareUrl(productName, productUrl));
    notify('share-tw', 'Abriendo X / Twitter para compartir el producto.');
  };

  const handleShareTelegram = () => {
    openWindow(buildTelegramShareUrl(productUrl, productName));
    notify('share-tg', 'Abriendo Telegram para compartir el producto.');
  };

  const handlePrepCopyText = async () => {
    if (!prepTarget) return;
    try {
      setBusyKey('prep-text');
      await writeTextToClipboard(prepText);
      showPrepFeedback('Texto copiado. Pégalo en la red social.');
    } catch {
      showPrepFeedback('No se pudo copiar automáticamente. Selecciona el texto y cópialo.');
    } finally {
      setBusyKey('');
    }
  };

  const handlePrepCopyImage = async () => {
    if (!prepBlob || !prepTarget) return;
    try {
      setBusyKey('prep-image');
      await copyBlobToClipboard(prepBlob, prepText);
      setBusyKey('prep-image-ok');
      showPrepFeedback('Tarjeta + copy copiados. Pega la imagen con Ctrl+V y luego el texto.');
      setTimeout(() => setBusyKey(''), 1600);
    } catch {
      setBusyKey('');
      showPrepFeedback('Tu navegador no permite copiar imágenes. Usa “Descargar PNG”.');
    }
  };

  const handlePrepDownload = async () => {
    if (!prepBlob || !prepTarget) return;
    try {
      setBusyKey('prep-download');
      downloadBlob(prepBlob, buildPromoFileName(product, prepTarget.format || 'story'));
      showPrepFeedback('Tarjeta PNG descargada en alta resolución.');
    } finally {
      setBusyKey('');
    }
  };

  const handlePrepOpenNetwork = () => {
    if (!prepTarget?.openUrl) return;
    // Abrimos la red de forma síncrona para evitar bloqueos de ventanas emergentes.
    openWindow(prepTarget.openUrl);
    setBusyKey('prep-open');
    (async () => {
      let imageReady = false;
      try {
        if (prepBlob) {
          // Imagen + copy en una sola escritura para que ninguno sobrescriba al otro.
          await copyBlobToClipboard(prepBlob, prepText);
          imageReady = true;
        } else {
          await writeTextToClipboard(prepText);
        }
      } catch {
        // La descarga manual sigue disponible dentro del estudio.
      }
      setBusyKey('');
      showPrepFeedback(
        imageReady
          ? 'Red abierta. Imagen y texto copiados: pega ambos con Ctrl+V.'
          : 'Red abierta. Texto copiado: usa “Descargar PNG” para adjuntar la tarjeta.'
      );
    })();
  };

  const handlePrepNativeShare = async () => {
    if (!prepBlob || !prepTarget) return;
    try {
      setBusyKey('prep-native');
      const fileName = buildPromoFileName(product, prepTarget.format || 'story');
      await shareNativePromoCard({
        blob: prepBlob,
        fileName,
        title: `${productName} · ${config?.storeName || 'JavrelStore'}`,
        text: prepText,
        url: productUrl,
      });
      showPrepFeedback('Contenido compartido.');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.warn('Error al compartir estado nativo:', error);
      showPrepFeedback('No se pudo abrir el menú nativo. Usa "Descargar PNG".');
    } finally {
      setBusyKey('');
    }
  };

  const handleMessenger = async () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (isMobile) {
      openWindow(buildMessengerShareUrl(productUrl));
      return;
    }
    await copyText(messengerText, 'messenger', 'Copy copiado. Pégalo en Messenger con el enlace.');
    openWindow(MESSENGER_HOME_URL);
  };

  const openPrepForActiveChannel = () => {
    if (activeChannel === 'whatsapp') {
      handleShareCard('footer-prep', {
        channel: 'whatsapp',
        format: 'story',
        text: whatsappView === 'status' ? activeText : statusText,
      });
      return;
    }
    if (activeChannel === 'facebook') {
      handleShareCard('footer-prep', {
        channel: 'facebook',
        format: 'story',
        text: facebookView === 'story' ? activeText : facebookStoryText,
      });
      return;
    }
    handleShareCard('footer-prep', {
      channel: 'tiktok',
      format: 'story',
      text: activeText,
    });
  };

  const handlePreviewCta = () => {
    if (!isAdmin) {
      openWindow(productUrl);
      return;
    }
    notify(
      'preview-cta',
      'Así se verá el CTA. El cliente abrirá la ficha del producto con este botón.'
    );
  };

  const currentFormat = PROMO_FORMATS.find((item) => item.id === format) || PROMO_FORMATS[0];

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Centro de difusión de ${productName}`}
        className="w-full max-w-6xl xl:max-w-7xl max-h-[94vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/30 overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#1877F2] to-slate-900 flex-shrink-0" />

        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-12 w-12 rounded-xl border border-slate-200 bg-white p-1 flex-shrink-0 hidden sm:block">
              <img
                src={imageUrl || '/zafra/logo-menu.webp'}
                alt={productName}
                className="h-full w-full object-contain"
                onError={(event) => {
                  event.currentTarget.src = '/zafra/logo-menu.webp';
                }}
              />
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#0A6CFF] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
                <Share2 className="w-3 h-3" />
                Centro de Difusión
              </span>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-900 mt-2 tracking-tight line-clamp-1">
                {productName}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {hasMarketingAccess
                  ? 'Previsualiza, genera la tarjeta y publica en tres canales sin salir de la tienda.'
                  : 'Comparte este producto en un clic: enlace, WhatsApp o imagen.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex-shrink-0"
            aria-label="Cerrar centro de difusión"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo con Diseño Split-Screen Enterprise (Previsualización Fija + Panel Tabulado) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(330px,420px)_1fr] xl:grid-cols-[minmax(360px,460px)_1fr] gap-6 items-start">
            {/* ── Columna 1: Previsualización en Vivo Fija (Sticky) ─────────── */}
            <section className="min-w-0 lg:sticky lg:top-0 self-start space-y-3 z-10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400">
                  <Sparkles className="w-3 h-3 text-[#0A6CFF]" />
                  Vista previa en vivo
                </span>
                {hasMarketingAccess && (
                  <ToggleGroup
                    label="Modo de previsualización"
                    value={previewMode}
                    onChange={setPreviewMode}
                    options={[
                      { id: 'interactive', label: 'Interactiva', Icon: LayoutGrid },
                      { id: 'graphic', label: 'Gráfica', Icon: Images },
                    ]}
                  />
                )}
              </div>

              {/* ── Barra Rápida de Formatos / Red Social ─── */}
              {hasMarketingAccess && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 shadow-xs">
                  <p className="text-[9px] font-mono-code font-bold uppercase tracking-widest text-slate-400 mb-2 px-0.5">
                    Formato · Red Social
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROMO_FORMATS.map((opt) => {
                      const Icon = FORMAT_ICONS[opt.id] || LayoutGrid;
                      const isActive = format === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormat(opt.id)}
                          title={`${opt.label} — ${opt.width}×${opt.height}`}
                          className={`inline-flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer
                            ${isActive
                              ? 'border-[#0A6CFF]/50 bg-[#0A6CFF]/10 text-[#0A6CFF] shadow-sm shadow-blue-200/60'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{opt.label}</span>
                          <span className={`text-[8px] font-semibold normal-case ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                            {opt.width}×{opt.height}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                {!(hasMarketingAccess && previewMode === 'graphic') ? (
                  <AdPreviewCard
                    product={product}
                    config={config}
                    imageUrl={imageUrl}
                    ctaText={ctaText}
                    theme={theme}
                    format={format}
                    glassEffect={glassEffect}
                    badgeConfig={badgeConfig}
                    cardBorder={cardBorder}
                    onEditBadge={(slot) => {
                      setActiveEditingSlot(slot);
                      setAdminActiveTab('badges');
                    }}
                    activeEditingSlot={activeEditingSlot}
                    onCtaClick={handlePreviewCta}
                  />
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/90 to-white p-3">
                    <div className="flex items-center justify-center w-full min-h-[260px] py-1 overflow-hidden">
                      <div
                        className={`relative flex items-center justify-center overflow-hidden rounded-2xl transition-all duration-300 max-w-full ${FORMAT_FRAME[currentFormat.id]} ${
                          cardBorder === 'frameless'
                            ? 'border-0 shadow-2xl ring-1 ring-slate-900/10'
                            : cardBorder === 'silver'
                            ? 'border-[3px] border-slate-300/90 bg-slate-100 shadow-2xl'
                            : cardBorder === 'white'
                            ? 'border-[3px] border-white bg-white shadow-[0_15px_40px_rgba(0,0,0,0.2)]'
                            : 'border border-slate-700/55 shadow-2xl'
                        }`}
                      >
                        {cardUrl && !cardLoading && (
                          <img
                            src={cardUrl}
                            alt={`Tarjeta promocional de ${productName}`}
                            className="max-h-full max-w-full w-full h-full object-contain animate-fadeIn"
                          />
                        )}
                        {cardLoading && (
                          <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Loader2 className="w-5 h-5 animate-spin text-[#0A6CFF]" />
                            <span className="text-[10px] font-semibold">Generando tarjeta…</span>
                          </div>
                        )}
                        {cardError && !cardLoading && (
                          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            <span className="text-[10px] font-semibold text-slate-500">
                              {cardError}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[9px] font-mono-code text-slate-400">
                        {currentFormat.width} × {currentFormat.height} px · PNG
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCard('preview-copy')}
                          disabled={busyKey === 'preview-copy'}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {busyKey === 'preview-copy' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copiar imagen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCard('preview-download')}
                          disabled={busyKey === 'preview-download'}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0A6CFF] hover:bg-blue-700 text-white text-[10px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {busyKey === 'preview-download' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Descargar PNG
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Selector Rápido de Fotos de la Pieza (Fijo debajo de la tarjeta) */}
              {hasMarketingAccess && images.length > 1 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-2xs">
                  <p className="flex items-center gap-1.5 text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    <ImageIcon className="w-3 h-3 text-[#0A6CFF]" />
                    Foto de la pieza ({images.length} fotos)
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.slice(0, 8).map((url, index) => (
                      <button
                        key={`${url.slice(0, 40)}-${index}`}
                        type="button"
                        onClick={() => setImageIndex(index)}
                        aria-pressed={imageIndex === index}
                        className={`relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border bg-white p-0.5 transition-all cursor-pointer ${
                          imageIndex === index
                            ? 'border-[#0A6CFF] ring-2 ring-[#0A6CFF]/20'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        aria-label={`Seleccionar imagen ${index + 1}`}
                      >
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-contain"
                          onError={(event) => {
                            event.currentTarget.src = '/zafra/logo-menu.webp';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ── Columna 2: Panel de Control Dinámico (Pestañas Organizadas) ── */}
            <section className="min-w-0">
              {hasMarketingAccess ? (
                <>
                  {/* Selector de Pestañas Superior */}
                  <div className="mb-4 flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAdminActiveTab('channels')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        adminActiveTab === 'channels'
                          ? 'bg-white text-[#0A6CFF] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Difusión & Canales</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminActiveTab('styles')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        adminActiveTab === 'styles'
                          ? 'bg-white text-[#0A6CFF] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>Estilos 3D & CTA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminActiveTab('badges')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                        adminActiveTab === 'badges'
                          ? 'bg-white text-[#0A6CFF] shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>Etiquetas Studio</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A6CFF]" />
                    </button>
                  </div>

                  {/* PESTAÑA 2: ESTILOS 3D, CTA Y CRISTAL */}
                  {adminActiveTab === 'styles' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-xs animate-fadeIn">
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="flex items-center gap-1.5 text-xs font-mono-code font-bold uppercase tracking-wider text-slate-600">
                            <Palette className="w-3.5 h-3.5 text-[#0A6CFF]" />
                            Estilo visual de la tarjeta
                          </p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                            <Sparkles className="w-2.5 h-2.5" />
                            24 estilos 3D
                          </span>
                        </div>
                        <div
                          className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${
                            showAllThemes
                              ? 'max-h-[320px] overflow-y-auto pr-1 [scrollbar-width:thin]'
                              : ''
                          }`}
                        >
                          {paletteThemes.map((option) => {
                            const isActive = theme === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setTheme(option.id)}
                                aria-pressed={isActive}
                                title={option.caption}
                                className={`group flex items-center gap-2 rounded-xl border p-2 text-left transition-all cursor-pointer ${
                                  isActive
                                    ? 'border-[#0A6CFF] bg-blue-50/70 shadow-xs ring-2 ring-[#0A6CFF]/20'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span
                                  className="h-9 w-9 flex-shrink-0 rounded-lg border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_4px_10px_-4px_rgba(15,23,42,0.45)]"
                                  style={{ backgroundImage: option.preview }}
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-bold text-slate-800">
                                    {option.label}
                                  </span>
                                  <span className="block truncate text-[10px] font-medium text-slate-500">
                                    {option.caption}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAllThemes((value) => !value)}
                          className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 cursor-pointer"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform ${
                              showAllThemes ? 'rotate-180' : ''
                            }`}
                          />
                          {showAllThemes
                            ? 'Mostrar estilos destacados'
                            : `Ver paleta completa (${PROMO_THEMES.length} estilos)`}
                        </button>
                      </div>

                      <div className="pt-3 border-t border-slate-100">
                        <p className="mb-2 text-xs font-mono-code font-bold uppercase tracking-wider text-slate-600">
                          Llamado a la acción (Botón CTA)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PROMO_CTA_OPTIONS.map((option) => (
                            <ChipButton
                              key={option}
                              active={ctaText === option}
                              onClick={() => setCtaText(option)}
                            >
                              {option}
                            </ChipButton>
                          ))}
                        </div>
                      </div>

                      {/* Interruptor Efecto Cristal en Descripción */}
                      <div className="pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                glassEffect
                                  ? 'bg-blue-600/10 text-[#0A6CFF]'
                                  : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Efecto Cristal en Descripción
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {glassEffect
                                  ? 'Panel translúcido de vidrio esmerilado con nitidez de texto'
                                  : 'Texto flotante directo sobre degradado 3D'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={glassEffect}
                            onClick={() => setGlassEffect((prev) => !prev)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              glassEffect ? 'bg-[#0A6CFF]' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                glassEffect ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* ── Selector de Marco / Borde Exterior de la Tarjeta ─── */}
                      <div className="pt-3 border-t border-slate-100">
                        <p className="mb-2.5 text-xs font-mono-code font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <span>🖼️</span> Marco exterior de la tarjeta
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            {
                              id: 'frameless',
                              label: 'Sin Marco',
                              desc: 'Fondo Completo · Limpio',
                              preview: 'bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 border border-transparent',
                              ring: 'ring-blue-500',
                            },
                            {
                              id: 'silver',
                              label: 'Plateado Claro',
                              desc: 'Elegante · Profesional',
                              preview: 'bg-gradient-to-br from-slate-200 to-slate-300',
                              ring: 'ring-slate-400',
                            },
                            {
                              id: 'white',
                              label: 'Blanco Puro',
                              desc: 'Limpio · Minimalista',
                              preview: 'bg-white border border-slate-200',
                              ring: 'ring-slate-300',
                            },
                            {
                              id: 'none',
                              label: 'Sutil / Oscuro',
                              desc: 'Clásico · Original',
                              preview: 'bg-slate-700',
                              ring: 'ring-slate-600',
                            },
                          ].map((opt) => {
                            const isActive = cardBorder === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setCardBorder(opt.id)}
                                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all cursor-pointer
                                  ${isActive
                                    ? 'border-[#0A6CFF]/50 bg-blue-50 shadow-sm shadow-blue-100'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                              >
                                {/* Muestra del marco */}
                                <div className={`w-10 h-7 rounded-md ${opt.preview} ${isActive ? `ring-2 ${opt.ring}/60` : ''} shadow-sm flex items-center justify-center`}>
                                  <div className="w-6 h-4 rounded-sm bg-gradient-to-br from-blue-100 to-blue-200 opacity-80" />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-wider leading-tight ${isActive ? 'text-[#0A6CFF]' : 'text-slate-600'}`}>
                                  {opt.label}
                                </span>
                                <span className={`text-[8px] font-medium ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                                  {opt.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {previewMode === 'graphic' && (
                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-600 mb-3">
                            📐 Formato de Red Social / Dimensión
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {PROMO_FORMATS.map((option) => {
                              const Icon = FORMAT_ICONS[option.id] || LayoutGrid;
                              const isActive = format === option.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => setFormat(option.id)}
                                  className={`flex flex-col items-center gap-1 rounded-xl border p-2.5 text-left transition-all cursor-pointer
                                    ${isActive
                                      ? 'border-[#0A6CFF]/50 bg-gradient-to-b from-blue-50 to-white text-[#0A6CFF] shadow-sm shadow-blue-100'
                                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isActive ? 'bg-[#0A6CFF]/10' : 'bg-slate-100'}`}>
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0A6CFF]' : 'text-slate-500'}`} />
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-center leading-tight">
                                    {option.label}
                                  </span>
                                  <span className={`text-[8.5px] font-semibold text-center ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                                    {option.caption}
                                  </span>
                                  <span className={`text-[8px] font-mono text-center ${isActive ? 'text-blue-300' : 'text-slate-300'}`}>
                                    {option.width}×{option.height}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PESTAÑA 3: ETIQUETAS & BADGES STUDIO */}
                  {adminActiveTab === 'badges' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs animate-fadeIn space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0A6CFF]">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Etiquetas & Badges Studio
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Personalización en tiempo real sobre la tarjeta en vivo
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#0A6CFF]">
                          Live Studio
                        </span>
                      </div>

                      <BadgeStudio
                        badgeConfig={badgeConfig}
                        onChange={setBadgeConfig}
                        product={product}
                        onSaveToSupabase={handleSaveBadgeToSupabase}
                        isSaving={isSavingBadge}
                        saveSuccess={saveBadgeSuccess}
                        activeEditingSlot={activeEditingSlot}
                        setActiveEditingSlot={setActiveEditingSlot}
                      />
                    </div>
                  )}

                  {/* PESTAÑA 1: DIFUSIÓN Y CANALES */}
                  {adminActiveTab === 'channels' && (
                    <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-3 gap-2">
                {CHANNELS.map((channel) => {
                  const Icon = channel.Icon;
                  const isActive = activeChannel === channel.id;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setActiveChannel(channel.id)}
                      aria-pressed={isActive}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-2.5 transition-all cursor-pointer ${
                        isActive
                          ? `${channel.activeTile} shadow-sm`
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${channel.iconBg}`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="text-xs font-bold text-slate-800">{channel.label}</span>
                      <span className="text-[10px] text-slate-500 leading-none">
                        {channel.caption}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  <CurrentChannelIcon className={`w-4 h-4 ${currentChannel.text}`} />
                  {currentChannel.label}
                </span>

                {activeChannel === 'whatsapp' && (
                  <ToggleGroup
                    label="Vista de WhatsApp"
                    value={whatsappView}
                    onChange={setWhatsappView}
                    options={[
                      { id: 'chat', label: 'Chat individual' },
                      { id: 'status', label: 'Estado' },
                    ]}
                  />
                )}

                {activeChannel === 'facebook' && (
                  <ToggleGroup
                    label="Vista de Facebook"
                    value={facebookView}
                    onChange={setFacebookView}
                    options={[
                      { id: 'post', label: 'Publicación' },
                      { id: 'story', label: 'Historia' },
                    ]}
                  />
                )}

                {activeChannel === 'tiktok' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-[9px] font-bold text-white">
                    <Sparkles className="w-2.5 h-2.5" />
                    Copy viral listo
                  </span>
                )}
              </div>

              {activeChannel === 'tiktok' && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TIKTOK_HOOKS.map((hook) => (
                    <ChipButton
                      key={hook.id}
                      active={tiktokHook === hook.id}
                      onClick={() => setTiktokHook(hook.id)}
                      title={hook.caption}
                    >
                      <span aria-hidden="true">{hook.emoji}</span>
                      {hook.label}
                    </ChipButton>
                  ))}
                </div>
              )}

              {/* Editor de copy (editable solo para administradores) */}
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3.5 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-600">
                    <Pencil className="h-3 w-3 text-[#0A6CFF]" />
                    {!hasMarketingAccess
                      ? 'Texto para compartir'
                      : activeChannel === 'whatsapp' && whatsappView === 'status'
                        ? 'Editor del Estado'
                        : activeChannel === 'facebook' && facebookView === 'story'
                          ? 'Editor de Historia'
                          : activeChannel === 'tiktok'
                            ? `Editor · ${TIKTOK_HOOKS.find((hook) => hook.id === tiktokHook)?.label || 'Viral'}`
                            : 'Editor de copy en tiempo real'}
                  </span>
                  <div className="flex items-center gap-2">
                    {hasMarketingAccess && isCopyEdited && (
                      <button
                        type="button"
                        onClick={() => setCopyOverride(null)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 transition-colors hover:text-slate-700 cursor-pointer"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => copyText(activeText, 'copy', 'Texto copiado al portapapeles.')}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A6CFF] transition-colors hover:text-blue-700 cursor-pointer"
                    >
                      {copiedKey === 'copy' ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copiedKey === 'copy' ? 'Copiado' : 'Copiar texto'}
                    </button>
                  </div>
                </div>
                {hasMarketingAccess ? (
                  <textarea
                    value={activeText}
                    onChange={(event) => setCopyOverride(event.target.value)}
                    rows={8}
                    spellCheck={false}
                    aria-label="Editor de copy en tiempo real"
                    className="font-display block max-h-72 min-h-[150px] w-full resize-y bg-white px-4 py-3.5 text-[14px] leading-[1.75] tracking-[0.01em] text-slate-900 outline-none transition-shadow focus:ring-2 focus:ring-inset focus:ring-[#0A6CFF]/20 sm:text-[15px]"
                  />
                ) : (
                  <pre className="font-display block max-h-80 overflow-y-auto whitespace-pre-wrap break-words bg-white px-4 py-3.5 text-[14px] leading-[1.75] tracking-[0.01em] text-slate-900 sm:text-[15px]">
                    {activeText}
                  </pre>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2 text-[10px] font-medium text-slate-500">
                  <span>{activeText.length} caracteres</span>
                  {hasMarketingAccess && (
                    <span className={isCopyEdited ? 'font-bold text-[#0A6CFF]' : ''}>
                      {isCopyEdited ? 'Texto personalizado' : 'Plantilla original'}
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones por canal */}
              {activeChannel === 'whatsapp' && (
                <div className="mt-3 space-y-2">
                  {canShare && (
                    <button
                      type="button"
                      onClick={() =>
                        handleNativeShare('wa-native-share', {
                          format: whatsappView === 'status' ? 'story' : 'square',
                          text: activeText,
                        })
                      }
                      disabled={busyKey === 'wa-native-share'}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition-all cursor-pointer bg-gradient-to-r from-[#25D366] via-emerald-600 to-[#128C7E] hover:from-[#1ebe5b] hover:to-[#0d7367] disabled:opacity-60"
                    >
                      {busyKey === 'wa-native-share' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      {isAndroid
                        ? 'Compartir directo en Android (WhatsApp / Redes)'
                        : 'Compartir tarjeta + texto (Apps Nativas)'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      whatsappView === 'chat'
                        ? handlePrepareChatSend()
                        : handleShareCard('wa-prepare-status', {
                            channel: 'whatsapp',
                            format: 'story',
                            text: activeText,
                          })
                    }
                    disabled={busyKey === 'wa-prepare' || busyKey === 'wa-prepare-status'}
                    className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60 ${currentChannel.primary}`}
                  >
                    {busyKey === 'wa-prepare' || busyKey === 'wa-prepare-status' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : whatsappView === 'chat' ? (
                      <Send className="w-4 h-4" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    {whatsappView === 'chat'
                      ? 'Enviar tarjeta + copy a un chat'
                      : 'Preparar Estado (imagen + copy)'}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      whatsappView === 'chat'
                        ? handleShareCard('wa-prepare-status', {
                            channel: 'whatsapp',
                            format: 'story',
                            text: statusText,
                          })
                        : handleCopyCard('wa-copy-both')
                    }
                    disabled={busyKey === 'wa-copy-both'}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[#25D366]/40 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {busyKey === 'wa-copy-both' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ImageIcon className="w-4 h-4" />
                    )}
                    {whatsappView === 'chat'
                      ? 'Preparar tarjeta 9:16 para Estado'
                      : 'Copiar tarjeta + copy del Estado'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          whatsappView === 'status' ? whatsappText : statusText,
                          'wa-alt',
                          whatsappView === 'status'
                            ? 'Copy para chat copiado.'
                            : 'Plantilla del Estado copiada.'
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {whatsappView === 'status' ? 'Copiar copy de chat' : 'Copiar para Estado'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCard('wa-card')}
                      disabled={busyKey === 'wa-card'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'wa-card' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Tarjeta PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCard('wa-copy-image')}
                      disabled={busyKey === 'wa-copy-image'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'wa-copy-image' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                      Copiar imagen + copy
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleShareCard('wa-share', {
                          channel: 'whatsapp',
                          format: 'story',
                          text: whatsappView === 'status' ? activeText : statusText,
                        })
                      }
                      disabled={busyKey === 'wa-share'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'wa-share' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      Compartir a Estado
                    </button>
                  </div>

                  {/* Estado in-situ: todo preparado dentro del modal, sin diálogos del sistema */}
                  {prepared && prepared.channel === 'whatsapp' && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3 animate-fadeIn">
                      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Listo en tu portapapeles
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-emerald-900/80">
                        {prepared.imageReady
                          ? 'La tarjeta PNG y el copy comercial están copiados. En WhatsApp pega la imagen con Ctrl+V y envía el texto.'
                          : 'El copy está copiado, pero el navegador no permitió copiar la imagen. Usa “Copiar de nuevo” o descarga el PNG desde aquí.'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyCard('prepared-copy', { format: prepared.format })
                          }
                          disabled={busyKey === 'prepared-copy'}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 transition-colors hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
                        >
                          {busyKey === 'prepared-copy' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          Copiar de nuevo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadCard('prepared-download', { format: prepared.format })}
                          disabled={busyKey === 'prepared-download'}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 transition-colors hover:bg-emerald-100 cursor-pointer disabled:opacity-60"
                        >
                          {busyKey === 'prepared-download' ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          Descargar PNG
                        </button>
                        <button
                          type="button"
                          onClick={() => openWindow(prepared.openUrl)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Abrir WhatsApp Web
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] leading-snug text-slate-400 flex items-start gap-1.5">
                    <Smartphone className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {isMobile
                      ? 'En móvil: usa el botón nativo para enviar la tarjeta y el texto en 1 clic a WhatsApp u otra app.'
                      : 'En PC: la tarjeta y el copy quedan en tu portapapeles listos para pegar en WhatsApp Web con Ctrl+V.'}
                  </p>
                </div>
              )}

              {activeChannel === 'facebook' && (
                <div className="mt-3 space-y-2">
                  {canShare && (
                    <button
                      type="button"
                      onClick={() =>
                        handleNativeShare('fb-native-share', {
                          format: facebookView === 'story' ? 'story' : 'landscape',
                          text: activeText,
                        })
                      }
                      disabled={busyKey === 'fb-native-share'}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition-all cursor-pointer bg-gradient-to-r from-[#1877F2] to-[#0A6CFF] hover:from-[#0f65d4] hover:to-[#0854c7] disabled:opacity-60"
                    >
                      {busyKey === 'fb-native-share' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      {isAndroid
                        ? 'Compartir en Facebook / Apps (Nativo Android)'
                        : 'Compartir tarjeta + texto en Redes'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      facebookView === 'post'
                        ? openWindow(buildFacebookSharerUrl(productUrl))
                        : handleShareCard('fb-story', {
                            channel: 'facebook',
                            format: 'story',
                            text: activeText,
                          })
                    }
                    className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all cursor-pointer ${currentChannel.primary}`}
                  >
                    {facebookView === 'post' ? (
                      <FacebookIcon className="w-4 h-4" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                    {facebookView === 'post' ? 'Compartir en mi muro' : 'Preparar Historia'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleMessenger}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#1877F2]/30 hover:bg-blue-50 text-[#1877F2] text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <MessengerIcon className="w-3.5 h-3.5" />
                      Enviar por Messenger
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          facebookView === 'story' ? facebookPostText : facebookStoryText,
                          'fb-alt',
                          'Copy alternativo copiado.'
                        )
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {facebookView === 'story' ? 'Copiar copy del muro' : 'Copiar copy de Historia'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCard('fb-card', { format: 'story' })}
                      disabled={busyKey === 'fb-card'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'fb-card' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Tarjeta 9:16
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleShareCard('fb-share', {
                          channel: 'facebook',
                          format: 'story',
                          text: facebookView === 'story' ? activeText : facebookStoryText,
                        })
                      }
                      disabled={busyKey === 'fb-share'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'fb-share' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      Compartir Historia
                    </button>
                  </div>

                  <p className="text-[10px] leading-snug text-slate-400 flex items-start gap-1.5">
                    <ExternalLink className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    El muro usa la vista previa Open Graph. “Compartir Historia” abre el estudio
                    interno con la tarjeta 9:16, el copy editable y el acceso directo a Facebook.
                  </p>
                </div>
              )}

              {activeChannel === 'tiktok' && (
                <div className="mt-3 space-y-2">
                  {canShare && (
                    <button
                      type="button"
                      onClick={() =>
                        handleNativeShare('tt-native-share', {
                          format: 'story',
                          text: activeText,
                        })
                      }
                      disabled={busyKey === 'tt-native-share'}
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition-all cursor-pointer bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 hover:bg-slate-800 disabled:opacity-60"
                    >
                      {busyKey === 'tt-native-share' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                      {isAndroid
                        ? 'Compartir tarjeta a TikTok / Apps (Android)'
                        : 'Compartir tarjeta + copy en Apps'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      copyText(activeText, 'tiktok', 'Copy viral copiado. Pégalo en TikTok.')
                    }
                    className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all cursor-pointer ${currentChannel.primary}`}
                  >
                    {copiedKey === 'tiktok' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    {copiedKey === 'tiktok' ? 'Copy viral copiado' : 'Copiar copy viral + hashtags'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openWindow(TIKTOK_UPLOAD_URL)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <TikTokIcon className="w-3.5 h-3.5" />
                      Abrir TikTok
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCard('tt-card', { format: 'story' })}
                      disabled={busyKey === 'tt-card'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'tt-card' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      Tarjeta 9:16
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyCard('tt-copy-image')}
                      disabled={busyKey === 'tt-copy-image'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'tt-copy-image' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-3.5 h-3.5" />
                      )}
                      Copiar imagen
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleShareCard('tt-share', {
                          channel: 'tiktok',
                          format: 'story',
                          text: activeText,
                        })
                      }
                      disabled={busyKey === 'tt-share'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'tt-share' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      Compartir a TikTok
                    </button>
                  </div>

                  <p className="text-[10px] leading-snug text-slate-400 flex items-start gap-1.5">
                    <Smartphone className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {isMobile
                      ? 'En móvil: usa el botón superior para enviar la tarjeta y el texto directo a TikTok u otra app.'
                      : '“Compartir a TikTok” abre el estudio interno con la tarjeta 9:16, el copy viral editable y el enlace directo.'}
                  </p>
                </div>
              )}

              {feedback && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  {feedback}
                </div>
              )}
                    </div>
                  )}
                </>
              ) : (
                /* ── Experiencia del cliente: compartir directo + menú de redes sociales ── */
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0A6CFF]">
                      <Share2 className="w-3 h-3" />
                      Compartir Producto
                    </span>
                    <h3 className="font-display mt-2 text-base font-extrabold tracking-tight text-slate-900">
                      Comparte este producto
                    </h3>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                      Envía directamente la ficha oficial a WhatsApp o compártela en tus redes favoritas.
                    </p>
                  </div>

                  {/* 1. Botón Principal Directo de WhatsApp (Esquema Universal Optimizado) */}
                  <div>
                    <button
                      type="button"
                      onClick={() => handleDirectWhatsAppShare('guest-wa-direct')}
                      disabled={busyKey === 'guest-wa-direct'}
                      className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-4 py-3.5 text-sm font-black text-[#04140C] shadow-md shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:bg-[#1ebe5b] cursor-pointer disabled:opacity-60"
                    >
                      {busyKey === 'guest-wa-direct' ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <WhatsAppIcon className="w-5 h-5" />
                      )}
                      <span>Compartir directo en WhatsApp</span>
                    </button>
                    <p className="mt-1 text-center text-[10px] font-medium text-slate-400">
                      Abre WhatsApp de inmediato con el mensaje comercial y el enlace oficial.
                    </p>
                  </div>

                  {/* 2. Menú de Redes Sociales (Componente Web Propio) */}
                  <div className="pt-2 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Share2 className="w-3 h-3 text-[#0A6CFF]" />
                        Menú de Redes Sociales
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Facebook */}
                      <button
                        type="button"
                        onClick={handleShareFacebook}
                        title="Compartir en Facebook"
                        className="inline-flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-blue-50/50 hover:border-[#1877F2]/40 hover:text-[#1877F2] cursor-pointer shadow-2xs group"
                      >
                        <FacebookIcon className="w-5 h-5 text-[#1877F2] group-hover:scale-110 transition-transform" />
                        <span className="text-[11px]">Facebook</span>
                      </button>

                      {/* Twitter / X */}
                      <button
                        type="button"
                        onClick={handleShareTwitter}
                        title="Compartir en X / Twitter"
                        className="inline-flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 hover:border-slate-400 hover:text-black cursor-pointer shadow-2xs group"
                      >
                        <TwitterIcon className="w-5 h-5 text-slate-900 group-hover:scale-110 transition-transform" />
                        <span className="text-[11px]">X / Twitter</span>
                      </button>

                      {/* Telegram */}
                      <button
                        type="button"
                        onClick={handleShareTelegram}
                        title="Compartir en Telegram"
                        className="inline-flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-700 transition-all hover:bg-sky-50/50 hover:border-[#229ED9]/40 hover:text-[#229ED9] cursor-pointer shadow-2xs group"
                      >
                        <TelegramIcon className="w-5 h-5 text-[#229ED9] group-hover:scale-110 transition-transform" />
                        <span className="text-[11px]">Telegram</span>
                      </button>
                    </div>

                    {/* Previsualización del mensaje comercial para visitantes (solo lectura) */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Mensaje comercial oficial</span>
                        <span className="text-[#0A6CFF] font-mono-code">Enlace /p/:id incluido</span>
                      </div>
                      <pre className="font-sans text-xs text-slate-700 whitespace-pre-wrap break-words leading-relaxed max-h-36 overflow-y-auto pr-1 [scrollbar-width:thin] select-all">
                        {statusText}
                      </pre>
                    </div>

                    {/* Copiar para Estado/WhatsApp (copy estructurado con URL cliqueable) */}
                    <button
                      type="button"
                      onClick={() => copyText(statusText, 'guest-link', '¡Texto + enlace copiados! Pégalo en tu estado o chat.')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A6CFF] px-4 py-3 text-xs font-extrabold text-white shadow-sm shadow-blue-500/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 cursor-pointer"
                    >
                      {copiedKey === 'guest-link' ? (
                        <Check className="w-4 h-4 text-white" />
                      ) : (
                        <Link2 className="w-4 h-4 text-white" />
                      )}
                      <span>
                        {copiedKey === 'guest-link' ? '¡Texto + enlace copiados!' : 'Copiar para Estado / WhatsApp'}
                      </span>
                    </button>
                    {/* Secundario: solo URL */}
                    <button
                      type="button"
                      onClick={() => copyText(productUrl, 'guest-url-only', 'Solo URL copiada.')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'guest-url-only' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>
                        {copiedKey === 'guest-url-only' ? 'URL copiada' : 'Copiar solo URL'}
                      </span>
                    </button>

                    {/* Tarjeta Gráfica: Descargar PNG / Copiar Tarjeta */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadCard('guest-download')}
                        disabled={busyKey === 'guest-download'}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-60 shadow-2xs"
                      >
                        {busyKey === 'guest-download' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>Descargar PNG</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyCard('guest-copy-image')}
                        disabled={busyKey === 'guest-copy-image'}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 cursor-pointer disabled:opacity-60 shadow-2xs"
                      >
                        {busyKey === 'guest-copy-image' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>Copiar tarjeta</span>
                      </button>
                    </div>

                    {/* Botón nativo SOLO en dispositivos móviles reales (nunca en PC de escritorio) */}
                    {isMobile && canShare && (
                      <button
                        type="button"
                        onClick={() =>
                          handleNativeShare('guest-native-share', {
                            format: 'square',
                            text: activeText,
                          })
                        }
                        disabled={busyKey === 'guest-native-share'}
                        className="w-full mt-1.5 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-100 cursor-pointer disabled:opacity-60"
                      >
                        {busyKey === 'guest-native-share' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5" />
                        )}
                        <span>Compartir con otras apps del teléfono</span>
                      </button>
                    )}
                  </div>

                  {prepared && prepared.channel === 'whatsapp' && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800 animate-fadeIn">
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        Tarjeta y texto listos. Pega la imagen en WhatsApp con Ctrl+V.
                      </p>
                      <button
                        type="button"
                        onClick={() => openWindow(prepared.openUrl)}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 underline decoration-emerald-400 underline-offset-2 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir WhatsApp Web
                      </button>
                    </div>
                  )}

                  {feedback && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 animate-fadeIn">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      {feedback}
                    </div>
                  )}

                  <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-snug text-slate-400">
                    <Smartphone className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    Vista previa de la tarjeta oficial de {config?.storeName || 'JavrelStore'}.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Pie: enlace canónico */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Link2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-[10px] text-slate-500 truncate font-mono-code">{productUrl}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              <Store className="w-3 h-3" />
              {hasRegularPrice
                ? `Ahorro ${formatCurrency(regularPrice - offerPrice)}`
                : formatCurrency(offerPrice)}
              {brand ? ` · ${brand}` : ''}
            </span>
            <button
              type="button"
              onClick={() => copyText(statusText, 'link', 'Texto + enlace copiados para compartir.')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold transition-colors cursor-pointer"
            >
              {copiedKey === 'link' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiedKey === 'link' ? 'Copiado' : 'Copiar enlace'}
            </button>
            {hasMarketingAccess && (
              <button
                type="button"
                onClick={openPrepForActiveChannel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A6CFF] hover:bg-blue-700 text-white text-[10px] font-bold transition-colors cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                Preparar publicación
              </button>
            )}
          </div>
        </div>
      </div>

      <StatusPrepModal
        open={Boolean(prepTarget)}
        target={prepTarget}
        cardUrl={prepUrl}
        cardLoading={prepLoading}
        cardError={prepError}
        onClose={closePrep}
        onCopyText={handlePrepCopyText}
        onCopyImage={handlePrepCopyImage}
        onDownload={handlePrepDownload}
        onOpenNetwork={handlePrepOpenNetwork}
        onNativeShare={canShare ? handlePrepNativeShare : undefined}
        isAndroid={isAndroid}
        canShare={canShare}
        busyKey={busyKey}
        feedback={prepFeedback}
        storeName={config?.storeName || 'JavrelStore'}
        productName={productName}
        themes={PROMO_THEMES}
        activeTheme={theme}
        onThemeChange={setTheme}
        text={prepText}
        onTextChange={setPrepText}
      />
    </div>,
    document.body
  );
};

export default SocialShareModal;
