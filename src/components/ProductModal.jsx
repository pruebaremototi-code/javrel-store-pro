import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  MessageCircle,
  ShieldCheck,
  Truck,
  Check,
  Star,
  Plus,
  Minus,
  Sparkles,
  Share2,
  ShoppingBag,
  ZoomIn,
  Pencil,
  Trash2,
  Upload,
  Globe,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { TechViewer360 } from './TechViewer360';
import { GalleryManagerStrip } from './GalleryManagerStrip';
import { formatCurrency, buildWhatsAppUrl, storeService } from '../services/storeService';
import { deleteStorageFilesByUrls } from '../services/imageOptimizer';
import {
  formatDisplayReference,
  formatCleanEan,
  cleanBrand,
  sanitizeCommercialText,
  isUuid,
} from '../services/textUtils';
import { buildProductShareUrl } from '../services/shareService';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import confetti from 'canvas-confetti';

// Lazy loading resiliente para aceleración del modal
const ImagePickerModal = lazyWithRetry(
  () => import('./ImagePickerModal').then((m) => ({ default: m.ImagePickerModal })),
  'ImagePickerModal'
);
const SocialShareModal = lazyWithRetry(
  () => import('./SocialShareModal').then((m) => ({ default: m.SocialShareModal })),
  'SocialShareModal'
);

// ─── AutoTextarea ────────────────────────────────────────────────────────────
const AutoTextarea = React.forwardRef(function AutoTextarea(
  { value, onChange, onSave, onCancel, placeholder, className = '', autoFocus = false, minRows = 2 },
  forwardedRef
) {
  const internalRef = useRef(null);
  const ref = forwardedRef || internalRef;

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, (minRows || 1) * 26)}px`;
  }, [ref, minRows]);

  useEffect(() => {
    resize();
    const frame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(frame);
  }, [value, resize]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
      resize();
      setTimeout(() => {
        ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [autoFocus, ref, resize]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave?.();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel?.();
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e.target.value); resize(); }}
      onInput={resize}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={minRows}
      style={{ resize: 'none', overflow: 'hidden' }}
      className={`w-full whitespace-pre-wrap break-words leading-relaxed box-border transition-all duration-150 ${className}`}
    />
  );
});

export const ProductModal = ({
  product,
  config = {},
  isAdmin = false,
  canEdit = false,
  onUpdateProductField,
  onUpdateConfig,
  onRefetchProducts,
  onClose,
  onAddToCart,
  onOpenLightbox,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Estados para modal de selección y carga de imágenes
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState(null);

  // Estados para edición in-situ de Garantía y Envíos
  const [isEditingWarranty, setIsEditingWarranty] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [warrantyVal, setWarrantyVal] = useState('');
  const [shippingVal, setShippingVal] = useState('');
  const [applyGlobally, setApplyGlobally] = useState(false);

  // Estados para edición CRUD de características/specs
  const [editingSpecIdx, setEditingSpecIdx] = useState(null);
  const [specTitleDraft, setSpecTitleDraft] = useState('');
  const [specDetailDraft, setSpecDetailDraft] = useState('');
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpecTitle, setNewSpecTitle] = useState('');
  const [newSpecDetail, setNewSpecDetail] = useState('');
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);

  // Estados para edición de descripción
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [isSavingDescription, setIsSavingDescription] = useState(false);

  // Galería normalizada
  const galleryImages = React.useMemo(() => {
    if (!product) return [];
    const mainImg = product.image || product.image_url || '/zafra/logo-menu.webp';
    let extraList = [];

    if (Array.isArray(product.images) && product.images.length > 0) {
      extraList = product.images.filter(Boolean);
    } else {
      extraList = [
        product.image,
        product.secondaryImage,
        product.packageImage,
        product.detailImage,
      ].filter(Boolean);
    }

    const secondaryFiltered = extraList.filter((img) => img && img !== mainImg);
    const result = [mainImg, ...secondaryFiltered];
    return result.length > 0 ? result : ['/zafra/logo-menu.webp'];
  }, [product]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  useEffect(() => {
    if (product) {
      setWarrantyVal(product.warrantyText || config?.warrantyText || 'Garantía Oficial 12 Meses');
      setShippingVal(product.shippingText || config?.shippingText || 'Envíos Asegurados a Colombia');
    }
  }, [product, config]);

  // Cierre con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const currentMainImage = galleryImages[selectedImageIndex] || galleryImages[0] || '/zafra/logo-menu.webp';

  const cleanRef = formatDisplayReference(product.reference, product.name, product.category, product.id);
  const cleanEan = formatCleanEan(product.barcode || product.ean, product.id);
  const cleanBrandName = cleanBrand(product.brand) || 'JAVRELSTORE';

  const handleCopyDirectLink = () => {
    try {
      const url = buildProductShareUrl(product);
      navigator.clipboard.writeText(url);
      setIsLinkCopied(true);
      setTimeout(() => setIsLinkCopied(false), 2200);
    } catch (e) {
      console.warn('Error copiando link:', e);
    }
  };

  const handlePrevImage = (e) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1));
  };

  const handleNextImage = (e) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0));
  };

  const formatSpecItem = (spec) => {
    if (!spec) return null;
    if (typeof spec === 'string') {
      const parts = spec.split(':');
      if (parts.length >= 2) {
        return {
          title: parts[0].trim(),
          detail: parts.slice(1).join(':').trim(),
        };
      }
      return { title: 'CARACTERÍSTICA', detail: spec.trim() };
    }
    if (typeof spec === 'object' && spec !== null) {
      const detailVal = spec.detail !== undefined ? spec.detail : spec.value !== undefined ? spec.value : spec.val;
      const titleVal = spec.title || spec.key || spec.name || 'CARACTERÍSTICA';
      if (detailVal !== undefined && detailVal !== null && String(detailVal) !== '[object Object]') {
        return { title: String(titleVal).trim(), detail: String(detailVal).trim() };
      }
      const entries = Object.entries(spec).filter(
        ([k, v]) => v && String(v) !== '[object Object]' && typeof v !== 'object'
      );
      if (entries.length > 0) {
        return {
          title: String(entries[0][0]).trim(),
          detail: String(entries[0][1]).trim(),
        };
      }
    }
    return null;
  };

  const isHiddenSpecKey = (title = '', detail = '') => {
    const raw = `${title} ${detail}`.toUpperCase();
    return /^(CONDICIÓN|CONDICION|ETIQUETA|BADGE|COMMERCIALTAG|COSTO|PRICE|IMAGEN|IMAGE)$/i.test(title.trim());
  };

  const formattedSpecs = React.useMemo(() => {
    if (!product || !Array.isArray(product.specs)) return [];
    const seen = new Set();
    const result = [];

    product.specs.forEach((spec, rawIdx) => {
      const item = formatSpecItem(spec);
      if (!item) return;
      if (!item.detail || /\[object Object\]/i.test(item.detail)) return;
      if (isHiddenSpecKey(item.title, item.detail)) return;

      const sig = `${item.title.trim().toUpperCase()}:::${item.detail.trim().toLowerCase()}`;
      if (seen.has(sig)) return;
      seen.add(sig);

      result.push({ ...item, rawIdx });
    });

    return result;
  }, [product?.specs]);

  const handleStartEditSpec = (rawIdx, currentItem) => {
    setEditingSpecIdx(rawIdx);
    setSpecTitleDraft(currentItem.title || '');
    setSpecDetailDraft(currentItem.detail || '');
  };

  const handleSaveEditSpec = async (idx) => {
    if (!specDetailDraft.trim()) return;
    setIsSavingSpecs(true);
    const title = specTitleDraft.trim() || 'CARACTERÍSTICA';
    const detail = specDetailDraft.trim();
    const updatedString = `${title}: ${detail}`;

    const currentList = Array.isArray(product.specs) ? [...product.specs] : [];
    if (idx >= 0 && idx < currentList.length) {
      currentList[idx] = updatedString;
    } else {
      currentList.push(updatedString);
    }

    if (onUpdateProductField) {
      onUpdateProductField('specs', currentList);
    }

    try {
      await storeService.updateProductAtomic({ ...product, specs: currentList });
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error actualizando característica:', err);
    } finally {
      setIsSavingSpecs(false);
      setEditingSpecIdx(null);
    }
  };

  const handleDeleteSpec = async (rawIdx) => {
    setIsSavingSpecs(true);
    const currentList = Array.isArray(product.specs) ? [...product.specs] : [];
    currentList.splice(rawIdx, 1);

    if (onUpdateProductField) {
      onUpdateProductField('specs', currentList);
    }

    try {
      await storeService.updateProductAtomic({ ...product, specs: currentList });
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error eliminando característica:', err);
    } finally {
      setIsSavingSpecs(false);
      setEditingSpecIdx(null);
    }
  };

  const handleCreateNewSpec = async () => {
    if (!newSpecDetail.trim()) return;
    setIsSavingSpecs(true);
    const title = newSpecTitle.trim() || 'CARACTERÍSTICA';
    const detail = newSpecDetail.trim();
    const newSpecEntry = `${title}: ${detail}`;

    const currentList = Array.isArray(product.specs) ? [...product.specs] : [];
    currentList.push(newSpecEntry);

    if (onUpdateProductField) {
      onUpdateProductField('specs', currentList);
    }

    try {
      await storeService.updateProductAtomic({ ...product, specs: currentList });
      if (onRefetchProducts) await onRefetchProducts();
      setNewSpecTitle('');
      setNewSpecDetail('');
      setIsAddingSpec(false);
    } catch (err) {
      console.warn('Error agregando característica:', err);
    } finally {
      setIsSavingSpecs(false);
    }
  };

  const handleMoveSpec = async (rawIdx, direction) => {
    const currentList = Array.isArray(product.specs) ? [...product.specs] : [];
    const targetIdx = rawIdx + direction;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;
    [currentList[rawIdx], currentList[targetIdx]] = [currentList[targetIdx], currentList[rawIdx]];

    if (onUpdateProductField) {
      onUpdateProductField('specs', currentList);
    }
    setIsSavingSpecs(true);
    try {
      await storeService.updateProductAtomic({ ...product, specs: currentList });
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error reordenando característica:', err);
    } finally {
      setIsSavingSpecs(false);
    }
  };

  const handleSaveDescription = async () => {
    const finalVal = descriptionDraft.trim();
    setIsSavingDescription(true);
    if (onUpdateProductField) {
      onUpdateProductField('description', finalVal);
    }
    try {
      await storeService.updateProductAtomic({ ...product, description: finalVal });
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error guardando descripción:', err);
    } finally {
      setIsSavingDescription(false);
      setIsEditingDescription(false);
    }
  };

  const handleDeleteDescription = async () => {
    if (!window.confirm('¿Deseas eliminar la descripción de este producto?')) return;
    setIsSavingDescription(true);
    if (onUpdateProductField) {
      onUpdateProductField('description', '');
    }
    try {
      await storeService.updateProductAtomic({ ...product, description: '' });
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error eliminando descripción:', err);
    } finally {
      setIsSavingDescription(false);
      setIsEditingDescription(false);
    }
  };

  const handleWhatsAppBuy = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#0A6CFF', '#0052FF', '#38BDF8', '#10B981'],
    });

    const msg = `¡Hola ${config?.storeName || 'JavrelStore'}! Quiero comprar:\n\n*${product.name}*\n- Ref: ${cleanRef}\n- Cantidad: ${quantity}\n- Total: ${formatCurrency(product.price * quantity)}\n\n¿Me confirman disponibilidad y medios de pago?`;
    const url = buildWhatsAppUrl(config?.whatsappNumber, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    setIsShareOpen(true);
  };

  const handleOpenImageSlotPicker = (e, index) => {
    e.stopPropagation();
    setEditingSlotIndex(index);
    setIsImagePickerOpen(true);
  };

  const handleSavePickedImage = async (newImageUrl) => {
    if (!newImageUrl) return;

    let updatedList = [...galleryImages];
    let newMainImage = product.image;

    if (editingSlotIndex === -1) {
      updatedList.push(newImageUrl);
      setSelectedImageIndex(updatedList.length - 1);
    } else if (editingSlotIndex === 0) {
      newMainImage = newImageUrl;
      updatedList[0] = newImageUrl;
      setSelectedImageIndex(0);
    } else if (editingSlotIndex > 0) {
      updatedList[editingSlotIndex] = newImageUrl;
      setSelectedImageIndex(editingSlotIndex);
    }

    if (onUpdateProductField) {
      if (editingSlotIndex === 0) {
        onUpdateProductField('image', newMainImage);
      }
      onUpdateProductField('images', updatedList);
    }

    try {
      await storeService.updateProductAtomic({
        ...product,
        image: newMainImage,
        images: updatedList,
      });
      if (onRefetchProducts) onRefetchProducts();
    } catch (err) {
      console.warn('Error guardando galería:', err);
    }

    setIsImagePickerOpen(false);
    setEditingSlotIndex(null);
  };

  const handleReorderGallery = async (reorderedList) => {
    if (!Array.isArray(reorderedList) || reorderedList.length === 0) return;
    const removedUrls = galleryImages.filter((url) => url && !reorderedList.includes(url));
    const newMainImage = reorderedList[0];
    const newAdditional = reorderedList.slice(1);
    if (onUpdateProductField) {
      onUpdateProductField('image', newMainImage);
      onUpdateProductField('images', reorderedList);
      onUpdateProductField('additional_images', newAdditional);
    }
    try {
      await storeService.updateProductAtomic({
        ...product,
        image: newMainImage,
        images: reorderedList,
        additional_images: newAdditional,
      });
      if (removedUrls.length > 0) {
        deleteStorageFilesByUrls(removedUrls).catch(() => {});
      }
      if (onRefetchProducts) onRefetchProducts();
    } catch (err) {
      console.warn('Error sincronizando orden de galería:', err);
    }
  };

  const handleSaveWarranty = async () => {
    const finalVal = warrantyVal.trim() || 'Garantía Oficial 12 Meses';
    if (onUpdateProductField) {
      onUpdateProductField('warrantyText', finalVal);
    }
    try {
      await storeService.updateProductAtomic({ ...product, warrantyText: finalVal });
      if (applyGlobally && onUpdateConfig) {
        const newCfg = { ...config, warrantyText: finalVal };
        onUpdateConfig(newCfg);
        await storeService.saveConfig(newCfg);
      }
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error guardando garantía en Supabase:', err);
    }
    setIsEditingWarranty(false);
  };

  const handleSaveShipping = async () => {
    const finalVal = shippingVal.trim() || 'Envíos Asegurados a Colombia';
    if (onUpdateProductField) {
      onUpdateProductField('shippingText', finalVal);
    }
    try {
      await storeService.updateProductAtomic({ ...product, shippingText: finalVal });
      if (applyGlobally && onUpdateConfig) {
        const newCfg = { ...config, shippingText: finalVal };
        onUpdateConfig(newCfg);
        await storeService.saveConfig(newCfg);
      }
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error guardando envíos en Supabase:', err);
    }
    setIsEditingShipping(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del producto"
          data-product-detail-modal="true"
          className="relative w-full max-w-[1440px] w-[96vw] mx-auto rounded-3xl shadow-2xl overflow-hidden my-2 sm:my-3 transform transition-all animate-scaleUp max-h-[96vh] flex flex-col bg-white border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Barra Superior con Marca e Indicadores de Estado */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <span className="text-xs font-mono-code font-bold uppercase tracking-widest text-[#0A6CFF] truncate">
                {cleanBrandName} {product.category ? `• ${String(product.category).toUpperCase()}` : ''}
              </span>

              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 border border-slate-300">
                ● {product.condition || 'Nuevo'}
              </span>

              {(product.commercialTag || product.badge) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                  <Sparkles className="w-3 h-3 inline text-[#0A6CFF]" />
                  {product.commercialTag || product.badge}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo del Modal — 2 Columnas Balanceadas de Alto Impacto */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-8 no-scrollbar space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

              {/* SECCIÓN IZQUIERDA: GALERÍA VISUAL DOMINANTE CON TECHVIEWER 360° */}
              <div className="lg:col-span-7 flex flex-col gap-3 sm:gap-4">
                {/* Contenedor Principal del Visor 360° / 3D */}
                <div className="relative w-full aspect-square sm:aspect-[4/3] lg:aspect-[4/3] bg-slate-100 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm overflow-hidden group">
                  
                  {/* Visor Interactivo 360° / Inclinación 3D */}
                  <TechViewer360
                    images={galleryImages}
                    activeImageIdx={selectedImageIndex}
                    onIndexChange={setSelectedImageIndex}
                    alt={product.name}
                    className="w-full h-full"
                  />

                  {/* Botón Lupa Zoom (Pantalla Completa) */}
                  <button
                    type="button"
                    onClick={() => onOpenLightbox && onOpenLightbox(product, selectedImageIndex, galleryImages)}
                    className="absolute bottom-3 left-3 z-20 px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white border border-white/20 shadow-md backdrop-blur-md flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer hover:scale-105"
                    title="Ampliar imagen en pantalla completa"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-[#0A6CFF]" />
                    <span>Lupa Zoom</span>
                  </button>

                  {/* Contador y Navegación entre Fotografías */}
                  {galleryImages.length > 1 && (
                    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/85 border border-white/20 rounded-xl px-2 py-1 backdrop-blur-md text-white shadow-md">
                      <button
                        type="button"
                        onClick={handlePrevImage}
                        className="p-1 hover:text-[#0A6CFF] transition-colors cursor-pointer"
                        title="Foto anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] font-mono-code font-bold px-1 select-none">
                        {selectedImageIndex + 1} / {galleryImages.length}
                      </span>
                      <button
                        type="button"
                        onClick={handleNextImage}
                        className="p-1 hover:text-[#0A6CFF] transition-colors cursor-pointer"
                        title="Foto siguiente"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Administrador: Reemplazar foto actual */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenImageSlotPicker(e, selectedImageIndex)}
                      className="absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:text-blue-600 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Reemplazar esta imagen"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cambiar Foto</span>
                    </button>
                  )}
                </div>

                {/* Tira Horizontal de Miniaturas con Drag & Drop, flechas, Portada y Eliminar */}
                <GalleryManagerStrip
                  images={galleryImages}
                  selectedIndex={selectedImageIndex}
                  onSelectIndex={setSelectedImageIndex}
                  canEdit={canEdit}
                  onChangeOrder={handleReorderGallery}
                  onEditSlot={(e, idx) => handleOpenImageSlotPicker(e, idx)}
                  onAddImage={(e) => handleOpenImageSlotPicker(e, -1)}
                />
              </div>

              {/* SECCIÓN DERECHA: INFORMACIÓN, COMPRA Y ESPECIFICACIONES TÉCNICAS */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div>
                  {/* Cabecera: Marca y Rating */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-[#0A6CFF] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                      {cleanBrandName}
                    </span>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span className="font-bold text-slate-700 text-xs">
                        {product.rating || '5.0'}
                      </span>
                      {product.reviews && (
                        <span className="text-slate-400 text-xs">({product.reviews})</span>
                      )}
                    </div>
                  </div>

                  {/* Título en Tipografía Grande y Clara */}
                  <h1 className="font-display font-extrabold text-xl sm:text-2xl lg:text-3xl text-slate-900 tracking-tight leading-snug mb-3">
                    {product.name}
                  </h1>

                  {/* Precio Grande y Estado de Existencias */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                      <span className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-slate-900 tracking-tight">
                        {formatCurrency(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-base sm:text-lg text-slate-400 line-through decoration-slate-300 font-semibold">
                          {formatCurrency(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold mt-1">
                      <Check className="w-4 h-4" />
                      <span>Despacho inmediato disponible</span>
                    </div>
                  </div>

                  {/* Barra Rápida de Difusión (9:16 + Copiar Enlace Directo) */}
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3 shadow-xs mb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-600/25 flex items-center justify-center shrink-0">
                        <Share2 className="w-4 h-4 text-[#0A6CFF]" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-900 truncate">
                          Difusión en Redes
                        </h5>
                        <p className="text-[10px] text-slate-500 truncate">Tarjeta vertical 9:16 lista</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleShare}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] text-white hover:brightness-105 active:scale-95 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Generar y compartir tarjeta 9:16 para historias y redes"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Compartir 9:16</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyDirectLink}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:text-[#0A6CFF] border border-slate-200 hover:border-blue-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Copiar enlace directo al portapapeles"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isLinkCopied ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Controles de Cantidad + Botones Principales */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-3">
                      {/* Selector de Cantidad */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="px-3 py-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-4 font-mono-code font-bold text-sm text-slate-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="px-3 py-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Botón Añadir al Carrito */}
                      <button
                        onClick={() => {
                          if (onAddToCart) {
                            onAddToCart(product, quantity);
                            onClose();
                          }
                        }}
                        className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] hover:from-[#0052FF] hover:to-[#0040cc] flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-md shadow-blue-500/25"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="uppercase tracking-wider">Añadir al Carrito</span>
                      </button>
                    </div>

                    {/* Botón Comprar por WhatsApp */}
                    <button
                      onClick={handleWhatsAppBuy}
                      className="w-full min-h-[44px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Comprar por WhatsApp</span>
                    </button>
                  </div>

                  {/* Código de Referencia / EAN */}
                  <div className="text-[11px] font-mono-code text-slate-500 mb-4 pb-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">REF:</span>
                      <span className="font-semibold text-slate-600 uppercase bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {cleanRef}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-700">EAN:</span>
                      <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {cleanEan}
                      </span>
                    </div>
                  </div>

                  {/* CARACTERÍSTICAS Y ESPECIFICACIONES TÉCNICAS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-500">
                        Características y Especificaciones
                      </span>
                      {canEdit && !isAddingSpec && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingSpec(true);
                            setNewSpecTitle('');
                            setNewSpecDetail('');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Añadir</span>
                        </button>
                      )}
                    </div>

                    {/* Formulario Inline para Añadir Nueva Característica */}
                    {canEdit && isAddingSpec && (
                      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2 animate-fadeIn">
                        <div className="font-bold text-xs text-blue-900">Nueva Característica:</div>
                        <div className="space-y-2">
                          <AutoTextarea
                            value={newSpecTitle}
                            onChange={setNewSpecTitle}
                            onSave={handleCreateNewSpec}
                            onCancel={() => setIsAddingSpec(false)}
                            placeholder="Título (ej: Conectividad)"
                            minRows={1}
                            autoFocus
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          />
                          <AutoTextarea
                            value={newSpecDetail}
                            onChange={setNewSpecDetail}
                            onSave={handleCreateNewSpec}
                            onCancel={() => setIsAddingSpec(false)}
                            placeholder="Detalle (ej: Bluetooth 5.3 + USB-C)"
                            minRows={2}
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <span className="text-[10px] text-slate-400 hidden sm:block">Ctrl+Enter para guardar · Esc para cancelar</span>
                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              type="button"
                              onClick={() => setIsAddingSpec(false)}
                              className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={handleCreateNewSpec}
                              disabled={isSavingSpecs || !newSpecDetail.trim()}
                              className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                            >
                              {isSavingSpecs ? 'Guardando...' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Lista de Especificaciones */}
                    {formattedSpecs.length > 0 ? (
                      <div className="space-y-1">
                        {formattedSpecs.map((item, visIdx) => (
                          <div
                            key={item.rawIdx}
                            className="group flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                          >
                            {editingSpecIdx === item.rawIdx ? (
                              <div className="w-full space-y-2 animate-fadeIn">
                                <AutoTextarea
                                  value={specTitleDraft}
                                  onChange={setSpecTitleDraft}
                                  onSave={() => handleSaveEditSpec(item.rawIdx)}
                                  onCancel={() => setEditingSpecIdx(null)}
                                  placeholder="Título de la característica"
                                  minRows={1}
                                  className="px-2.5 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <AutoTextarea
                                  value={specDetailDraft}
                                  onChange={setSpecDetailDraft}
                                  onSave={() => handleSaveEditSpec(item.rawIdx)}
                                  onCancel={() => setEditingSpecIdx(null)}
                                  placeholder="Detalle completo"
                                  minRows={2}
                                  autoFocus
                                  className="px-2.5 py-1 text-xs bg-white border border-blue-400 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 ml-auto">
                                    <button
                                      type="button"
                                      onClick={() => setEditingSpecIdx(null)}
                                      className="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                                    >
                                      ✕ Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditSpec(item.rawIdx)}
                                      disabled={isSavingSpecs}
                                      className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs"
                                    >
                                      {isSavingSpecs ? 'Guardando...' : '✓ Guardar'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                {canEdit && (
                                  <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSpec(item.rawIdx, -1)}
                                      disabled={visIdx === 0 || isSavingSpecs}
                                      className="p-0.5 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-20"
                                      title="Mover arriba"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSpec(item.rawIdx, 1)}
                                      disabled={visIdx === formattedSpecs.length - 1 || isSavingSpecs}
                                      className="p-0.5 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-20"
                                      title="Mover abajo"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                <p className="text-sm text-slate-700 leading-relaxed flex-1 min-w-0 whitespace-pre-line break-words">
                                  <strong className="text-slate-900 uppercase font-bold tracking-wide">
                                    {item.title}:
                                  </strong>{' '}
                                  {item.detail}
                                </p>

                                {canEdit && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditSpec(item.rawIdx, item)}
                                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                      title="Editar esta característica"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSpec(item.rawIdx)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                      title="Eliminar esta característica"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic py-1">
                        No hay especificaciones adicionales registradas.
                      </p>
                    )}

                    {/* Descripción General */}
                    {(product.description || canEdit) && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400">
                            Descripción
                          </span>
                          {canEdit && !isEditingDescription && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setDescriptionDraft(product.description || '');
                                  setIsEditingDescription(true);
                                }}
                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Editar descripción"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {product.description && (
                                <button
                                  type="button"
                                  onClick={handleDeleteDescription}
                                  disabled={isSavingDescription}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Eliminar descripción"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {isEditingDescription ? (
                          <div className="space-y-2 animate-fadeIn">
                            <AutoTextarea
                              value={descriptionDraft}
                              onChange={setDescriptionDraft}
                              onSave={handleSaveDescription}
                              onCancel={() => setIsEditingDescription(false)}
                              placeholder="Descripción completa del producto..."
                              minRows={3}
                              autoFocus
                              className="px-3 py-2 text-sm border border-blue-400 rounded-xl bg-white text-slate-900 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2 ml-auto justify-end">
                              <button
                                type="button"
                                onClick={() => setIsEditingDescription(false)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveDescription}
                                disabled={isSavingDescription}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                              >
                                {isSavingDescription ? 'Guardando...' : '✓ Guardar Descripción'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          product.description && (
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                              {product.description}
                            </p>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* SELLOS DE CONFIANZA: GARANTÍA Y ENVÍOS */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-[#0A6CFF] flex-shrink-0" />
                        <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400">
                          Garantía
                        </span>
                        {canEdit && !isEditingWarranty && (
                          <button
                            type="button"
                            onClick={() => setIsEditingWarranty(true)}
                            className="ml-auto text-slate-400 hover:text-blue-600 transition-colors p-0.5"
                            title="Editar texto de garantía"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isEditingWarranty ? (
                        <div className="space-y-1.5 animate-fadeIn">
                          <AutoTextarea
                            value={warrantyVal}
                            onChange={setWarrantyVal}
                            onSave={handleSaveWarranty}
                            onCancel={() => setIsEditingWarranty(false)}
                            placeholder="Ej. Garantía Oficial 12 Meses"
                            minRows={1}
                            autoFocus
                            className="px-2.5 py-1 text-xs border border-blue-400 rounded-lg bg-white text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                          />
                          <div className="flex items-center justify-between text-[10px]">
                            <label className="flex items-center gap-1 text-slate-500 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={applyGlobally}
                                onChange={(e) => setApplyGlobally(e.target.checked)}
                                className="rounded text-blue-600"
                              />
                              <span>Predeterminado</span>
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingWarranty(false)}
                                className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold"
                              >
                                ✕
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveWarranty}
                                className="px-2 py-0.5 rounded bg-blue-600 text-white font-bold"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => canEdit && setIsEditingWarranty(true)}
                          className={`font-semibold text-slate-800 whitespace-pre-line break-words ${
                            canEdit ? 'cursor-pointer hover:text-blue-600' : ''
                          }`}
                        >
                          {product.warrantyText || config?.warrantyText || 'Garantía Oficial 12 Meses'}
                        </p>
                      )}
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400">
                          Despacho
                        </span>
                        {canEdit && !isEditingShipping && (
                          <button
                            type="button"
                            onClick={() => setIsEditingShipping(true)}
                            className="ml-auto text-slate-400 hover:text-emerald-600 transition-colors p-0.5"
                            title="Editar texto de envíos"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isEditingShipping ? (
                        <div className="space-y-1.5 animate-fadeIn">
                          <AutoTextarea
                            value={shippingVal}
                            onChange={setShippingVal}
                            onSave={handleSaveShipping}
                            onCancel={() => setIsEditingShipping(false)}
                            placeholder="Ej. Envíos Asegurados a Colombia"
                            minRows={1}
                            autoFocus
                            className="px-2.5 py-1 text-xs border border-emerald-400 rounded-lg bg-white text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                          />
                          <div className="flex items-center justify-between text-[10px]">
                            <label className="flex items-center gap-1 text-slate-500 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={applyGlobally}
                                onChange={(e) => setApplyGlobally(e.target.checked)}
                                className="rounded text-emerald-600"
                              />
                              <span>Predeterminado</span>
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingShipping(false)}
                                className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-semibold"
                              >
                                ✕
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveShipping}
                                className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => canEdit && setIsEditingShipping(true)}
                          className={`font-semibold text-slate-800 whitespace-pre-line break-words ${
                            canEdit ? 'cursor-pointer hover:text-emerald-600' : ''
                          }`}
                        >
                          {product.shippingText || config?.shippingText || 'Envíos Asegurados a Colombia'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Centro de Difusión */}
      {isShareOpen && (
        <React.Suspense fallback={null}>
          <SocialShareModal
            isOpen
            product={product}
            config={config}
            isAdmin={isAdmin}
            onClose={() => setIsShareOpen(false)}
            onProductUpdated={(updated) => {
              if (onUpdateProductField) {
                onUpdateProductField('image', updated.image);
                onUpdateProductField('images', updated.images);
              }
              if (onRefetchProducts) onRefetchProducts();
            }}
          />
        </React.Suspense>
      )}

      {/* Selector de Imagen */}
      {isImagePickerOpen && (
        <React.Suspense fallback={null}>
          <ImagePickerModal
            isOpen={isImagePickerOpen}
            currentImage={
              editingSlotIndex >= 0 && galleryImages[editingSlotIndex]
                ? galleryImages[editingSlotIndex]
                : ''
            }
            onSave={handleSavePickedImage}
            onClose={() => {
              setIsImagePickerOpen(false);
              setEditingSlotIndex(null);
            }}
          />
        </React.Suspense>
      )}
    </>
  );
};
