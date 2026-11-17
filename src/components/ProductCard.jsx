import React from 'react';
import {
  MessageCircle,
  Star,
  CheckCircle2,
  ShoppingBag,
  Camera,
  ZoomIn,
  Share2,
  Images,
  Sparkles,
} from 'lucide-react';
import { formatCurrency, buildWhatsAppUrl } from '../services/storeService';
import { cleanBrand, sanitizeCommercialText, resolveCategoryLabel, isUuid, formatDisplayReference } from '../services/textUtils';
import { useVisualEditor } from '../context/VisualEditorContext';
import { PERMISSIONS } from '../config/rbac';
import { EditableText } from './EditableText';
import { EditablePrice } from './EditablePrice';

// Lazy load del Centro de Difusión para carga instantánea del catálogo
const SocialShareModal = React.lazy(() =>
  import('./SocialShareModal').then((m) => ({ default: m.SocialShareModal }))
);

/**
 * Tarjeta de producto con edición in-situ estilo Wix / Elementor.
 *
 * Contrato de eventos:
 * - El clic sobre título, marca, descripción, etiquetas o precios SOLO edita.
 * - El clic sobre la fotografía principal abre el modal de detalle completo.
 * - La lupa de la esquina abre el lightbox/zoom sin abrir el detalle.
 * - El texto nunca dispara la apertura del modal.
 */
export const ProductCard = ({
  product,
  config = {},
  categories = [],
  isAdmin,
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

  const [isShareOpen, setIsShareOpen] = React.useState(false);

  if (!product) return null;
  const editorActive = Boolean(
    (isAdmin || contextIsAdmin) &&
      isEditorModeActive &&
      hasPermission?.(PERMISSIONS.EDIT_PAGE)
  );
  const canManageProducts = Boolean(hasPermission?.(PERMISSIONS.MANAGE_PRODUCTS));

  // Campaña Promocional Activa (Black Friday, Aniversario, San Valentín)
  const campaign = config?.activeCampaign;
  const isCampaignActive =
    campaign?.enabled &&
    (!campaign.targetCategory ||
      campaign.targetCategory === 'all' ||
      campaign.targetCategory === product.category);

  // Si el comerciante ya configuró un precio regular y precio de oferta explícitos,
  // se respeta íntegramente su definición manual sin doble descuento involuntario.
  const hasCustomOffer = Boolean(
    product.originalPrice && Number(product.originalPrice) > Number(product.price)
  );

  // Precio efectivo: aplica campaña estacional solo si el producto no tiene oferta manual explícita
  const effectivePrice =
    isCampaignActive && campaign?.discountPercent && !hasCustomOffer
      ? Math.round(product.price * (1 - campaign.discountPercent / 100))
      : product.price;

  const originalDisplayPrice = hasCustomOffer
    ? product.originalPrice
    : isCampaignActive && campaign?.discountPercent
    ? product.price
    : product.originalPrice;

  const discountPercent =
    originalDisplayPrice && originalDisplayPrice > effectivePrice
      ? Math.round(((originalDisplayPrice - effectivePrice) / originalDisplayPrice) * 100)
      : null;

  // Hay oferta real solo cuando el precio regular supera al precio de venta.
  const hasOfferPrice = Boolean(
    originalDisplayPrice && originalDisplayPrice > effectivePrice
  );

  // Primer spec como highlight / etiqueta editable
  const rawSpecHighlight =
    product.specs && product.specs.length > 0 ? product.specs[0] : null;
  const specHighlight = rawSpecHighlight
    ? sanitizeCommercialText(String(rawSpecHighlight)) || null
    : null;

  // Texto comercial limpio: sin UUID, modelos de IA, dimensiones WebP ni
  // referencias internas que confundan al comprador.
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

  // Nombre visible: nunca mostrar un UUID crudo si el título viene vacío.
  const safeName =
    product.name && !isUuid(product.name)
      ? String(product.name).trim()
      : 'Producto destacado';

  // Referencia pública: estandarizada limpia (cero UUIDs en WhatsApp)
  const publicReference = formatDisplayReference(product.reference, product.name, product.category, product.id);

  // Enlace directo a WhatsApp estructurado
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

  return (
    <div
      data-product-card={product.id}
      data-editor-mode={editorActive ? 'true' : 'false'}
      className={`group relative flex flex-col bg-white rounded-2xl border border-slate-200/90 hover:border-[#0A6CFF]/40 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden transform-gpu hover:-translate-y-1 ${
        editorActive ? 'ring-1 ring-[#0A6CFF]/20' : ''
      }`}
    >
      {/* Contenedor de Imagen — sin clic a modal; solo botones explícitos */}
      <div className="relative m-2.5 rounded-xl bg-slate-50/90 aspect-square p-3 sm:p-4 xl:p-5 flex items-center justify-center overflow-hidden border border-slate-100/90 group-hover:bg-slate-100/70 transition-colors">
        {/* ── Badges — máximo 2 simultáneos, jerarquía comercial estricta ── */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {(() => {
            const slots = [];

            // 1. Campaña estacional (máxima prioridad)
            if (isCampaignActive && campaign?.badge) {
              slots.push(
                <span
                  key="campaign"
                  className="px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white border border-red-400 shadow-md shadow-red-500/30 animate-pulse"
                >
                  {campaign.badge}
                </span>
              );
            }

            // 2. Descuento % (solo si no hay badge de campaña ya visible)
            if (discountPercent && !isCampaignActive) {
              slots.push(
                <span
                  key="discount"
                  className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black bg-[#0A6CFF] text-white shadow-xs"
                >
                  -{discountPercent}%
                </span>
              );
            }

            // 3. Condición física (Seminuevo, Usado, Poco Uso) — siempre discreta, ocupa el slot 2 si queda espacio
            if (product.condition && product.condition !== 'Nuevo' && slots.length < 2) {
              slots.push(
                <span
                  key="condition"
                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shadow-2xs ${
                    product.condition === 'Seminuevo'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-200 text-slate-800 border border-slate-300'
                  }`}
                >
                  ● {product.condition}
                </span>
              );
            }

            // 4. Badge comercial libre (solo si no hay nada activo aún y queda espacio)
            if (safeBadge && !isCampaignActive && !discountPercent && slots.length < 2) {
              slots.push(
                <span
                  key="badge"
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-[0_1px_3px_rgba(0,0,0,0.12)] backdrop-blur-xs ${
                    /black\s*friday/i.test(safeBadge)
                      ? 'bg-black text-amber-300 border border-amber-400/60 shadow-sm animate-pulse'
                      : /oferta/i.test(safeBadge)
                        ? 'bg-rose-600 text-white border border-rose-500'
                        : /destacado/i.test(safeBadge)
                          ? 'bg-blue-600 text-white border border-blue-500'
                          : 'text-slate-800 bg-gradient-to-b from-white via-slate-100 to-slate-200 border border-slate-300'
                  }`}
                >
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

            return slots;
          })()}
        </div>

        {/* Indicador de galería multi-foto */}
        {Array.isArray(product.images) && product.images.length > 1 && (
          <span className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold backdrop-blur-sm pointer-events-none">
            <Images className="w-3 h-3" />
            {product.images.length}
          </span>
        )}

        {/* Botón cambiar foto si tiene permiso de catálogo */}
        {canManageProducts && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenImagePicker) onOpenImagePicker(product);
            }}
            className="absolute top-2.5 right-2.5 z-20 p-1.5 sm:p-2 rounded-xl bg-[#0A6CFF] text-white shadow-md hover:bg-blue-600 transition-all hover:scale-105 flex items-center gap-1 text-[10px] font-bold"
            title="Cambiar imagen"
          >
            <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Foto</span>
          </button>
        )}

        {/* Imagen de Producto — clic abre la ficha completa; la lupa abre el zoom */}
        <div className="relative w-full h-full flex items-center justify-center select-none">
          <button
            type="button"
            onClick={handleOpenDetailModal}
            data-action="view-detail"
            className="w-full h-full flex items-center justify-center bg-transparent p-0 border-0 cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6CFF]/60 focus-visible:ring-offset-2"
            title="Ver ficha técnica y detalles del producto"
            aria-label={`Ver detalle de ${safeName}`}
          >
            <img
              src={product.image}
              alt={safeName}
              draggable={false}
              className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-106 transition-transform duration-500 ease-out"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.src = '/zafra/logo-menu.webp';
              }}
            />
          </button>

          {/* Único control flotante: lupa para ampliar la fotografía */}
          <button
            type="button"
            onClick={handleOpenZoom}
            data-action="zoom-image"
            className="absolute bottom-1 right-1 z-20 p-2 rounded-full bg-white/95 hover:bg-white text-slate-600 shadow-md border border-slate-200/90 hover:text-[#0A6CFF] transition-all hover:scale-110 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6CFF]/60"
            title="Ampliar imagen"
            aria-label={`Ampliar imagen de ${safeName}`}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Centro de difusión: WhatsApp, Facebook y TikTok */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsShareOpen(true);
            }}
            data-action="share-product"
            className="absolute bottom-1 left-1 z-20 p-2 rounded-full bg-white/95 hover:bg-white text-slate-600 shadow-md border border-slate-200/90 hover:text-[#0A6CFF] transition-all hover:scale-110 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A6CFF]/60"
            title="Compartir producto"
            aria-label={`Compartir ${safeName}`}
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Contenido e Información — Tipografía Oscura y Alta Legibilidad */}
      <div className="p-3.5 sm:p-4 pt-1 sm:pt-2 flex-1 flex flex-col justify-between">
        <div>
          {/* Marca / Badge Platino + Rating */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono-code uppercase font-bold mb-1.5">
            <span className="tracking-wider text-slate-500 min-w-0">
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
              <span className="font-bold text-slate-700 text-[10px]">
                {product.rating || '5.0'}
              </span>
              {product.reviews && (
                <span className="text-slate-400 text-[9px]">({product.reviews})</span>
              )}
            </div>
          </div>

          {/* Título de Producto — SOLO edición in-situ, nunca abre modal */}
          <h3 className="font-display font-semibold text-xs sm:text-sm xl:text-[15px] 2xl:text-base text-slate-900 line-clamp-2 focus-within:line-clamp-none transition-colors mb-1.5 leading-snug">
            <EditableText
              field="name"
              value={isUuid(product.name) ? '' : product.name}
              onChange={(val) => updateField('name', val)}
              isAdmin={isAdmin}
              as="span"
              placeholder="Escribe el título del producto..."
            />
          </h3>

          {/* Descripción corta editable in-situ */}
          {(safeDescription || editorActive) && (
            <p className="text-[10px] xl:text-[11px] leading-relaxed text-slate-500 line-clamp-2 focus-within:line-clamp-none mb-2">
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

          {/* Etiqueta / primera especificación editable in-situ */}
          {(specHighlight || editorActive) && (
            <p className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mb-2 line-clamp-1 focus-within:line-clamp-none">
              <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
              <EditableText
                field="spec"
                value={specHighlight || ''}
                onChange={handleSpecChange}
                isAdmin={isAdmin}
                as="span"
                className="truncate min-w-0"
                placeholder="Haz clic para añadir una etiqueta técnica..."
              />
            </p>
          )}
        </div>

        {/* Precios y Botones de Acción Limpios ("Al Carrito" / "WhatsApp") */}
        <div className="pt-2.5 border-t border-slate-100">
          {editorActive ? (
            <div className="flex flex-col gap-1.5 mb-2.5" data-price-editor="true">
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
            <div className="flex items-baseline gap-1.5 mb-2.5 flex-wrap">
              <span
                className="font-display font-black text-base sm:text-lg xl:text-xl text-slate-900 tracking-tight"
                title={hasOfferPrice ? 'Precio de oferta' : 'Precio regular'}
                aria-label={`${hasOfferPrice ? 'Precio de oferta' : 'Precio regular'}: ${formatCurrency(effectivePrice)}`}
              >
                {formatCurrency(effectivePrice)}
              </span>

              {hasOfferPrice && (
                <span
                  className="text-[10px] sm:text-xs text-slate-400 line-through decoration-slate-300"
                  title="Precio regular"
                  aria-label={`Precio regular: ${formatCurrency(originalDisplayPrice)}`}
                >
                  {formatCurrency(originalDisplayPrice)}
                </span>
              )}
            </div>
          )}

          {/* Botones institucionales: Al Carrito + WhatsApp */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onAddToCart({ ...product, price: effectivePrice })}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs xl:text-[13px] font-bold text-blue-600 bg-white border border-blue-600 hover:bg-blue-50 active:scale-95 transition-all cursor-pointer"
              title="Añadir al Carrito"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Al Carrito</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-[11px] sm:text-xs xl:text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
              title="Consultar por WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {isShareOpen && (
        <React.Suspense fallback={null}>
          <SocialShareModal
            isOpen
            product={product}
            config={config}
            isAdmin={Boolean(isAdmin || contextIsAdmin)}
            onClose={() => setIsShareOpen(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};
