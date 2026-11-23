import React, { useState, Suspense } from 'react';
import {
  MessageCircle,
  Star,
  CheckCircle2,
  ShoppingBag,
  Camera,
  ZoomIn,
  Share2,
  Images,
  Eye,
} from 'lucide-react';
import { formatCurrency, buildWhatsAppUrl } from '../services/storeService';
import { cleanBrand, sanitizeCommercialText, resolveCategoryLabel, isUuid, formatDisplayReference } from '../services/textUtils';
import { useVisualEditor } from '../context/VisualEditorContext';
import { PERMISSIONS } from '../config/rbac';
import { EditableText } from './EditableText';
import { EditablePrice } from './EditablePrice';
import { lazyWithRetry } from '../utils/lazyWithRetry';

// Code-splitting resiliente — Centro de Difusión JavrelStore
const SocialShareModal = lazyWithRetry(
  () => import('./SocialShareModal').then((m) => ({ default: m.SocialShareModal })),
  'SocialShareModal'
);

/**
 * ProductCard — Tarjeta de Producto Tecnológica Premium JavrelStore.
 *
 * Características:
 * - Diseño Full-Bleed 4/5 sin recuadros ni márgenes internos que reduzcan la fotografía.
 * - Efecto de iluminación perimetral y elevación dinámica (.javrel-card-luxury).
 * - Overlay deslizante en hover (información técnica y descripción emergente).
 * - Botones de acción ergonómicos: "Al Carrito", "Vista rápida" (Eye) y "WhatsApp".
 * - Botones flotantes en hover: Zoom/Lupa y Compartir.
 * - Edición in-situ estilo Wix/Elementor protegida por RBAC.
 */
export const ProductCard = ({
  product,
  config = {},
  categories = [],
  isAdmin,
  priority = false,
  onQuickView,
  onAddToCart,
  onOpenLightbox,
  onOpenImagePicker,
  onUpdateProductField,
}) => {
  const {
    isAdmin: contextIsAdmin,
    isEditorModeActive,
    hasPermission,
  } = useVisualEditor();

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [activeVariant, setActiveVariant] = useState(null);

  if (!product) return null;

  const editorActive = Boolean(
    (isAdmin || contextIsAdmin) &&
      isEditorModeActive &&
      hasPermission?.(PERMISSIONS.EDIT_PAGE)
  );
  const canManageProducts = Boolean(hasPermission?.(PERMISSIONS.MANAGE_PRODUCTS));
  const isAdminUser = Boolean(isAdmin || contextIsAdmin);

  // Variantes / colores si existen
  const variants = Array.isArray(product.variants)
    ? product.variants
    : Array.isArray(product.colors)
    ? product.colors
    : [];

  const displayImage = activeVariant?.image_url || activeVariant?.image || product.image || product.image_url;
  const displayPrice = activeVariant?.price || product.price;

  // Campaña Promocional Activa (Black Friday, Aniversario, Cyber, etc.)
  const campaign = config?.activeCampaign;
  const isCampaignActive =
    campaign?.enabled &&
    (!campaign.targetCategory ||
      campaign.targetCategory === 'all' ||
      campaign.targetCategory === product.category);

  // Comprobación de oferta personalizada
  const hasCustomOffer = Boolean(
    product.originalPrice && Number(product.originalPrice) > Number(displayPrice)
  );

  // Precio efectivo aplicando campaña o valor directo
  const effectivePrice =
    isCampaignActive && campaign?.discountPercent && !hasCustomOffer
      ? Math.round(displayPrice * (1 - campaign.discountPercent / 100))
      : displayPrice;

  const originalDisplayPrice = hasCustomOffer
    ? product.originalPrice
    : isCampaignActive && campaign?.discountPercent
    ? displayPrice
    : product.originalPrice;

  const discountPercent =
    originalDisplayPrice && originalDisplayPrice > effectivePrice
      ? Math.round(((originalDisplayPrice - effectivePrice) / originalDisplayPrice) * 100)
      : null;

  const hasOfferPrice = Boolean(
    originalDisplayPrice && originalDisplayPrice > effectivePrice
  );

  // Función extractora de especificaciones técnicas limpias
  const parseSpecText = (spec) => {
    if (!spec) return '';
    if (typeof spec === 'string') {
      return spec.replace(/\[object Object\]/g, '').trim();
    }
    if (typeof spec === 'object' && spec !== null) {
      const val = spec.value !== undefined ? spec.value : spec.detail !== undefined ? spec.detail : spec.val;
      const key = spec.key || spec.title || spec.name;
      if (val !== undefined && val !== null && String(val) !== '[object Object]') {
        if (key && !/^(CONDICIÓN|CONDICION|ETIQUETA|SKU|EAN|BARCODE|COSTO)$/i.test(String(key))) {
          return `${key}: ${val}`;
        }
        return String(val);
      }
      const entries = Object.entries(spec).filter(
        ([k, v]) => v && String(v) !== '[object Object]' && typeof v !== 'object'
      );
      if (entries.length > 0) {
        return entries.map(([k, v]) => `${k}: ${v}`).join(' - ');
      }
    }
    return '';
  };

  // Primer spec descriptivo como highlight en la tarjeta
  const specHighlight = React.useMemo(() => {
    if (!Array.isArray(product.specs) || product.specs.length === 0) return null;
    for (const s of product.specs) {
      const parsed = parseSpecText(s);
      if (parsed && !/\[object Object\]/i.test(parsed)) {
        const sanitized = sanitizeCommercialText(parsed);
        if (sanitized) return sanitized;
      }
    }
    return null;
  }, [product.specs]);

  // Textos comerciales limpios y estandarizados
  const safeBrand =
    cleanBrand(product.brand) ||
    resolveCategoryLabel(categories, product.categoryName || product.category) ||
    'JAVRELSTORE';
  const safeDescription = sanitizeCommercialText(product.description);
  const rawBadge = sanitizeCommercialText(product.commercialTag || product.badge || '');
  const safeBadge =
    rawBadge &&
    !/^(JAVRELSTORE|IMPORTADO|TECNOLOGÍA|ELECTRÓNICO|ELECTRONICO)$/i.test(rawBadge) &&
    !/\b(?:ia|ai)\b|verif|modelo|generad/i.test(rawBadge)
      ? rawBadge
      : null;

  const safeName =
    product.name && !isUuid(product.name)
      ? String(product.name).trim()
      : 'Producto destacado';

  const publicReference = formatDisplayReference(product.reference, product.name, product.category, product.id);

  const whatsappMsg = `¡Hola ${config?.storeName || 'JavrelStore'}! Estoy interesado en comprar: *${safeName}*${
    publicReference ? ` (Ref: ${publicReference})` : ''
  } por valor de *${formatCurrency(effectivePrice)}*. ¿Tienen unidades disponibles para envío inmediato?`;
  const whatsappUrl = buildWhatsAppUrl(config?.whatsappNumber, whatsappMsg);

  const updateField = (field, value) => {
    if (onUpdateProductField) {
      onUpdateProductField(product.id, field, value);
    }
  };

  const handleOpenDetailModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onQuickView) {
      onQuickView(product);
    }
  };

  const handleOpenZoom = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onOpenLightbox) {
      onOpenLightbox(product);
    }
  };

  const handleSpecChange = (newValue) => {
    const specs = Array.isArray(product.specs) ? [...product.specs] : [];
    const cleanValue = String(newValue || '').trim();
    if (cleanValue) {
      specs[0] = cleanValue;
    } else {
      specs.splice(0, 1);
    }
    updateField('specs', specs);
  };

  const renderBadge = () => {
    if (isCampaignActive && campaign?.badge) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white border border-red-400 shadow-md shadow-red-500/30 animate-pulse">
          {campaign.badge}
        </span>
      );
    }
    if (discountPercent && !isCampaignActive) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#0A6CFF] text-white shadow-sm">
          -{discountPercent}%
        </span>
      );
    }
    if (product.condition && product.condition !== 'Nuevo') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-xs border border-white/20">
          ● {product.condition}
        </span>
      );
    }
    if (safeBadge) {
      return (
        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white/95 text-slate-800 border border-slate-200/90 shadow-sm backdrop-blur-xs">
          <EditableText
            field="badge"
            value={safeBadge}
            onChange={(val) => updateField('badge', val)}
            isAdmin={isAdmin}
            as="span"
          />
        </span>
      );
    }
    return null;
  };

  return (
    <div
      data-product-card={product.id}
      data-editor-mode={editorActive ? 'true' : 'false'}
      className={`group relative flex flex-col javrel-card-luxury w-full max-w-full min-w-0 box-border rounded-2xl overflow-hidden transition-all duration-300 transform-gpu hover:-translate-y-1 ${
        editorActive ? 'ring-2 ring-[#0A6CFF]/40' : ''
      }`}
    >
      {/* ── 1. Contenedor de Imagen Full-Bleed 4:5 sin márgenes internos ── */}
      <div
        className="relative w-full overflow-hidden bg-slate-50 border-b border-slate-100"
        style={{ aspectRatio: '4/5' }}
      >
        {/* Badges Flotantes — Top Left */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start pointer-events-none">
          {renderBadge()}
        </div>

        {/* Indicador de galería multi-foto */}
        {Array.isArray(product.images) && product.images.length > 1 && (
          <span className="absolute top-2.5 right-2.5 z-20 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/75 text-white text-[9px] font-bold backdrop-blur-xs pointer-events-none shadow-sm">
            <Images className="w-3 h-3" />
            {product.images.length}
          </span>
        )}

        {/* Administrador: Botón para cambiar foto */}
        {canManageProducts && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenImagePicker) onOpenImagePicker(product);
            }}
            className="absolute top-2.5 right-2.5 z-30 p-1.5 sm:p-2 rounded-xl bg-[#0A6CFF] text-white shadow-md hover:bg-blue-600 transition-all hover:scale-105 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
            title="Cambiar imagen"
          >
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Foto</span>
          </button>
        )}

        {/* Imagen Principal Full-Bleed con Click a Detalle */}
        <button
          type="button"
          onClick={handleOpenDetailModal}
          data-action="view-detail"
          className="w-full h-full block p-0 border-0 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6CFF]/60"
          title="Ver ficha técnica y detalles del producto"
          aria-label={`Ver detalle de ${safeName}`}
        >
          <img
            src={displayImage}
            alt={safeName}
            draggable={false}
            className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500 ease-out"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => {
              e.target.src = '/zafra/logo-menu.webp';
            }}
          />
        </button>

        {/* ── Hover Info Overlay — desliza desde abajo, oculto en reposo ── */}
        {!editorActive && (safeDescription || specHighlight) && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 z-10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(10,15,30,0.96) 0%, rgba(10,15,30,0.85) 60%, transparent 100%)',
              paddingTop: '28px',
            }}
          >
            <div className="px-3.5 pb-3 space-y-1.5">
              {safeDescription && (
                <p className="text-[11px] leading-relaxed text-slate-200 line-clamp-3 font-sans font-medium">
                  {safeDescription}
                </p>
              )}
              {specHighlight && (
                <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-emerald-400" />
                  <span className="truncate">{specHighlight}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Botón Lupa Zoom Flotante (Bottom-Right, visible en hover) */}
        <button
          type="button"
          onClick={handleOpenZoom}
          data-action="zoom-image"
          className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-full bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200/90 hover:text-[#0A6CFF] hover:border-[#0A6CFF]/60 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6CFF]/60"
          title="Ampliar imagen"
          aria-label={`Ampliar imagen de ${safeName}`}
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Botón Compartir Flotante (Bottom-Left sobre la imagen) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsShareOpen(true);
          }}
          data-action="share-product"
          className="absolute bottom-2.5 left-2.5 z-20 p-2 rounded-full bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200/90 hover:text-[#0A6CFF] hover:border-[#0A6CFF]/60 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 hover:scale-110 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6CFF]/60"
          title="Compartir producto"
          aria-label={`Compartir ${safeName}`}
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Variantes de Color / Swatches (si existen) */}
        {variants.length > 1 && (
          <div className="absolute bottom-11 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-white/90 border border-slate-200 shadow-xs backdrop-blur-xs">
            {variants.slice(0, 4).map((v, idx) => {
              const isActive = activeVariant === v;
              const color = v.color || v.hex || v.value || '#0A6CFF';
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveVariant(isActive ? null : v);
                  }}
                  title={v.name || v.label || color}
                  className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: isActive ? '#0A6CFF' : 'transparent',
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. Contenido e Información con Escala Tipográfica Aumentada ── */}
      <div className="p-3 sm:p-4 pt-2.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Marca / Categoría + Rating */}
          <div className="flex items-center justify-between text-[10.5px] sm:text-xs font-mono-code uppercase font-bold mb-1">
            <span className="tracking-wider text-[#0A6CFF] min-w-0 truncate">
              <EditableText
                field="brand"
                value={safeBrand}
                onChange={(val) => updateField('brand', val)}
                isAdmin={isAdmin}
                as="span"
              />
            </span>
            <div className="flex items-center gap-1 text-amber-500 shrink-0">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-500" />
              <span className="font-bold text-slate-700 text-[10.5px]">
                {product.rating || '5.0'}
              </span>
              {product.reviews && (
                <span className="text-slate-400 text-[9.5px]">({product.reviews})</span>
              )}
            </div>
          </div>

          {/* Título de Producto */}
          <h3 className="font-sans font-bold text-xs sm:text-[14px] xl:text-[15px] text-slate-900 line-clamp-2 leading-snug mb-1.5 tracking-tight">
            <EditableText
              field="name"
              value={isUuid(product.name) ? '' : product.name}
              onChange={(val) => updateField('name', val)}
              isAdmin={isAdmin}
              as="span"
              placeholder="Escribe el título del producto..."
            />
          </h3>

          {/* Descripción Corta: Siempre visible con 2 líneas claras */}
          {(safeDescription || editorActive) && (
            <p className="text-[10px] sm:text-[11px] xl:text-[12px] leading-relaxed text-slate-500 line-clamp-2 focus-within:line-clamp-none mb-1.5 font-medium">
              <EditableText
                field="description"
                value={safeDescription || ''}
                onChange={(val) => updateField('description', val)}
                isAdmin={isAdmin}
                as="span"
                multiline
                placeholder="Haz clic para añadir una descripción..."
              />
            </p>
          )}

          {/* Característica Destacada con Ícono (COMPATIBILIDAD, ALMACENAMIENTO, EDICIÓN, etc.) */}
          {(specHighlight || editorActive) && (
            <p className="flex items-center gap-1 text-[9.5px] sm:text-[10.5px] text-emerald-600 font-semibold mb-2 line-clamp-1 focus-within:line-clamp-none">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0 text-emerald-500" />
              <EditableText
                field="spec"
                value={specHighlight || ''}
                onChange={handleSpecChange}
                isAdmin={isAdmin}
                as="span"
                className="truncate min-w-0 font-mono-code uppercase"
                placeholder="Haz clic para añadir etiqueta técnica..."
              />
            </p>
          )}
        </div>

        {/* ── 3. Precios y Botones de Acción Ergonómicos (Fijados al fondo con mt-auto) ── */}
        <div className="mt-auto pt-2.5 border-t border-slate-100">
          {editorActive ? (
            <div className="flex flex-col gap-1.5 mb-2" data-price-editor="true">
              <EditablePrice
                label="Precio Regular"
                value={product.originalPrice}
                onChange={(val) => updateField('originalPrice', val)}
                placeholder="Precio de lista (opcional)"
                allowEmpty
                tone="regular"
              />
              <EditablePrice
                label="Precio de Oferta"
                value={product.price}
                onChange={(val) => updateField('price', val ?? 0)}
                placeholder="Precio de venta"
                tone="offer"
              />
              <p className="text-[9px] leading-snug text-slate-400">
                El precio regular se muestra tachado; la oferta es el valor que paga el cliente.
              </p>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
              <span
                className="font-display font-black text-base sm:text-lg xl:text-xl text-slate-900 tracking-tight"
                title={hasOfferPrice ? 'Precio de oferta' : 'Precio regular'}
                aria-label={`${hasOfferPrice ? 'Precio de oferta' : 'Precio regular'}: ${formatCurrency(effectivePrice)}`}
              >
                {formatCurrency(effectivePrice)}
              </span>

              {hasOfferPrice && (
                <span
                  className="text-[11px] sm:text-xs text-slate-400 line-through decoration-slate-300 font-semibold"
                  title="Precio regular"
                  aria-label={`Precio regular: ${formatCurrency(originalDisplayPrice)}`}
                >
                  {formatCurrency(originalDisplayPrice)}
                </span>
              )}
            </div>
          )}

          {/* Fila de Botones: [Agregar] (Principal) + [Ojo/QuickView] + [WhatsApp] */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AGREGAR — CTA azul eléctrico, texto siempre visible */}
            <button
              type="button"
              onClick={() => onAddToCart({ ...product, price: effectivePrice })}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-1 sm:gap-1.5 min-h-[38px] sm:min-h-[44px] py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl text-[10.5px] sm:text-xs font-bold text-white bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] hover:from-[#0052FF] hover:to-[#0040cc] active:scale-95 shadow-md shadow-blue-500/20 transition-all cursor-pointer touch-manipulation"
              title="Añadir al Carrito"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Agregar</span>
            </button>

            {/* Vista rápida — ojo azul */}
            <button
              type="button"
              onClick={handleOpenDetailModal}
              className="inline-flex shrink-0 items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[#0A6CFF] hover:bg-blue-100 hover:border-blue-400 active:scale-95 transition-all cursor-pointer touch-manipulation"
              title="Vista rápida del producto"
              aria-label={`Ver detalles de ${safeName}`}
            >
              <Eye className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* WhatsApp — verde esmeralda */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-400 active:scale-95 transition-all cursor-pointer touch-manipulation"
              title="Consultar por WhatsApp"
              aria-label={`Consultar ${safeName} por WhatsApp`}
            >
              <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Centro de Difusión JavrelStore ── */}
      {isShareOpen && (
        <Suspense fallback={null}>
          <SocialShareModal
            isOpen
            product={product}
            config={config}
            isAdmin={Boolean(isAdmin || contextIsAdmin)}
            onClose={() => setIsShareOpen(false)}
            onProductUpdated={(updated) => {
              if (onUpdateProductField) {
                onUpdateProductField('image', updated.image);
                onUpdateProductField('images', updated.images);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
