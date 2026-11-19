import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { formatCurrency, buildWhatsAppUrl, storeService } from '../services/storeService';
import {
  formatDisplayReference,
  formatCleanEan,
  cleanBrand,
  sanitizeCommercialText,
  isUuid,
} from '../services/textUtils';
import confetti from 'canvas-confetti';

// Lazy loading para aceleración del modal
const ImagePickerModal = React.lazy(() =>
  import('./ImagePickerModal').then((m) => ({ default: m.ImagePickerModal }))
);
const SocialShareModal = React.lazy(() =>
  import('./SocialShareModal').then((m) => ({ default: m.SocialShareModal }))
);

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

  // Estados para modal de selección y carga de imágenes
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false);
  const [editingSlotIndex, setEditingSlotIndex] = useState(null); // null: cerrado, -1: nueva imagen, >= 0: reemplazar slot

  // Estados para edición in-situ de Garantía y Envíos
  const [isEditingWarranty, setIsEditingWarranty] = useState(false);
  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [warrantyVal, setWarrantyVal] = useState('');
  const [shippingVal, setShippingVal] = useState('');
  const [applyGlobally, setApplyGlobally] = useState(false);

  // Estados para edición CRUD de características/specs (deben estar ANTES del early return)
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

  // Generar o normalizar array de imágenes para la galería
  // REGLA: El primer espacio corresponde siempre a la Imagen Principal
  // y las miniaturas secundarias no se duplican artificialmente.
  const galleryImages = React.useMemo(() => {
    if (!product) return [];
    const mainImg = product.image || '/zafra/logo-menu.webp';
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

    // Primera posición garantizada como la imagen principal, seguida de fotos adicionales únicas
    const secondaryFiltered = extraList.filter((img) => img && img !== mainImg);
    return [mainImg, ...secondaryFiltered];
  }, [product]);

  useEffect(() => {
    setQuantity(1);
    setSelectedImageIndex(0);
    setIsEditingWarranty(false);
    setIsEditingShipping(false);
    if (product) {
      setWarrantyVal(product.warrantyText || config?.warrantyText || 'Garantía Oficial 12 Meses');
      setShippingVal(product.shippingText || config?.shippingText || 'Envíos Asegurados a Colombia');
    }
  }, [product, config]);

  if (!product) return null;

  const currentMainImage = galleryImages[selectedImageIndex] || product.image || '/zafra/logo-menu.webp';
  const totalPrice = product.price * quantity;

  // Limpieza rigurosa de marca, categoría y códigos para vista pública (cero UUIDs)
  const cleanBrandName = cleanBrand(product.brand, config?.storeName || 'JAVRELSTORE');
  const rawCat = product.category;
  const displayCategory = !rawCat || isUuid(rawCat) ? '' : sanitizeCommercialText(rawCat);
  const cleanRef = formatDisplayReference(product.reference, product.name, product.category, product.id);
  const cleanEan = formatCleanEan(product.ean || product.barcode, product.id || cleanRef);

  // Formatear especificación técnica de forma segura e infalible (evitando [object Object])
  const formatSpecItem = (spec) => {
    if (!spec) return null;
    if (typeof spec === 'string') {
      const clean = spec.replace(/\[object Object\]/g, '').trim();
      if (!clean) return null;
      const colonIndex = clean.indexOf(':');
      if (colonIndex !== -1) {
        return {
          title: clean.slice(0, colonIndex).trim().toUpperCase(),
          detail: clean.slice(colonIndex + 1).trim(),
        };
      }
      const words = clean.split(' ');
      if (words.length > 2) {
        return {
          title: words.slice(0, 2).join(' ').toUpperCase(),
          detail: words.slice(2).join(' '),
        };
      }
      return { title: 'CARACTERÍSTICA', detail: clean };
    }
    if (typeof spec === 'object' && spec !== null) {
      const rawTitle = spec.title || spec.key || spec.name || 'CARACTERÍSTICA';
      const rawDetail = spec.detail !== undefined ? spec.detail : spec.value !== undefined ? spec.value : spec.val;
      const detailStr = String(rawDetail ?? '').replace(/\[object Object\]/g, '').trim();
      if (!detailStr || detailStr === '[object Object]') return null;
      return {
        title: String(rawTitle).trim().toUpperCase(),
        detail: detailStr,
      };
    }
    return null;
  };

  // Claves de metadata interna que NO deben mostrarse como specs públicas
  const INTERNAL_SPEC_KEYS = /^(CONDICI[OÓ]N|ETIQUETA|SKU|EAN|BARCODE|COSTO|REFERENCIA|C[OÓ]DIGO)$/i;

  // Formatear especificaciones técnicas preservando el rawIdx (índice real en product.specs)
  // para que reordenamiento y edición operen sobre el array fuente correcto.
  const formattedSpecs = (Array.isArray(product.specs) ? product.specs : [])
    .map((spec, rawIdx) => {
      const item = formatSpecItem(spec);
      if (!item) return null;
      if (!item.detail || /\[object Object\]/i.test(item.detail)) return null;
      if (INTERNAL_SPEC_KEYS.test(item.title)) return null;
      return { ...item, rawIdx };
    })
    .filter(Boolean);

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
      await storeService.updateProductAtomic({
        ...product,
        specs: currentList,
      });
      if (onRefetchProducts) await onRefetchProducts();
    } catch (err) {
      console.warn('Error actualizando característica:', err);
    } finally {
      setIsSavingSpecs(false);
      setEditingSpecIdx(null);
    }
  };

  const handleDeleteSpec = async (idx) => {
    if (!window.confirm('¿Deseas eliminar esta característica del producto?')) return;
    setIsSavingSpecs(true);
    const currentList = Array.isArray(product.specs) ? [...product.specs] : [];
    currentList.splice(idx, 1);

    if (onUpdateProductField) {
      onUpdateProductField('specs', currentList);
    }

    try {
      await storeService.updateProductAtomic({
        ...product,
        specs: currentList,
      });
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
      await storeService.updateProductAtomic({
        ...product,
        specs: currentList,
      });
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

  // Reordenar spec: mueve el item del índice rawIdx en product.specs hacia arriba o hacia abajo
  // rawIdx es el índice dentro de product.specs (el array completo, no el filtrado)
  const handleMoveSpec = async (rawIdx, direction) => {
    const currentList = Array.isArray(product.specs) ? [...product.specs] : [];
    const targetIdx = rawIdx + direction;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;
    // Intercambiar posiciones
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

  // Guardar descripción editada en Supabase
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

  // Eliminar descripción (dejarla vacía)
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
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#0A6CFF', '#38BDF8', '#10B981'],
    });

    const msg = `¡Hola ${config?.storeName || 'JavrelStore'}! Deseo comprar *${quantity} unidad(es)* de:\n*${product.name}*\nRef: ${cleanRef}\nTotal: *${formatCurrency(totalPrice)}*\n¿Tienen unidades listas para despacho inmediato?`;
    const url = buildWhatsAppUrl(config?.whatsappNumber, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = () => {
    setIsShareOpen(true);
  };

  // Abrir selector de imagen para un slot específico (-1 para nuevo slot)
  const handleOpenImageSlotPicker = (e, index) => {
    e.stopPropagation();
    setEditingSlotIndex(index);
    setIsImagePickerOpen(true);
  };

  // Guardar imagen seleccionada desde el picker (URL, Visor Web o WebP local)
  const handleSavePickedImage = async (newImageUrl) => {
    if (!newImageUrl) return;

    let updatedList = [...galleryImages];
    let newMainImage = product.image;

    if (editingSlotIndex === -1) {
      // Añadir nueva imagen secundaria
      updatedList.push(newImageUrl);
      setSelectedImageIndex(updatedList.length - 1);
    } else if (editingSlotIndex === 0) {
      // Actualizar imagen principal
      newMainImage = newImageUrl;
      updatedList[0] = newImageUrl;
      setSelectedImageIndex(0);
    } else if (editingSlotIndex > 0) {
      // Actualizar imagen secundaria existente
      updatedList[editingSlotIndex] = newImageUrl;
      setSelectedImageIndex(editingSlotIndex);
    }

    if (onUpdateProductField) {
      if (editingSlotIndex === 0) {
        onUpdateProductField('image', newMainImage);
      }
      onUpdateProductField('images', updatedList);
    }

    // Persistencia atómica inmediata en Supabase y notificación multi-dispositivo
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

  // Eliminar imagen secundaria
  const handleRemoveSecondaryImage = async (e, indexToRemove) => {
    e.stopPropagation();
    if (indexToRemove === 0) return;
    const updatedList = galleryImages.filter((_, idx) => idx !== indexToRemove);
    if (onUpdateProductField) {
      onUpdateProductField('images', updatedList);
    }
    if (selectedImageIndex >= updatedList.length) {
      setSelectedImageIndex(Math.max(0, updatedList.length - 1));
    }
    try {
      await storeService.updateProductAtomic({
        ...product,
        images: updatedList,
      });
      if (onRefetchProducts) onRefetchProducts();
    } catch (err) {
      console.warn('Error eliminando foto secundaria:', err);
    }
  };

  // Guardar Garantía in-situ con persistencia atómica en Supabase
  const handleSaveWarranty = async () => {
    const finalVal = warrantyVal.trim() || 'Garantía Oficial 12 Meses';
    if (onUpdateProductField) {
      onUpdateProductField('warrantyText', finalVal);
    }
    try {
      await storeService.updateProductAtomic({
        ...product,
        warrantyText: finalVal,
      });
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

  // Guardar Envíos in-situ con persistencia atómica en Supabase
  const handleSaveShipping = async () => {
    const finalVal = shippingVal.trim() || 'Envíos Asegurados a Colombia';
    if (onUpdateProductField) {
      onUpdateProductField('shippingText', finalVal);
    }
    try {
      await storeService.updateProductAtomic({
        ...product,
        shippingText: finalVal,
      });
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
        className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/55 backdrop-blur-xs animate-fadeIn"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Detalle del producto"
          data-product-detail-modal="true"
          className="relative w-full max-w-5xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 transform transition-all animate-scaleUp max-h-[94vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Barra Superior (Cero UUIDs técnicos en vista pública) */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-500 truncate">
                {cleanBrandName} {displayCategory ? `• ${displayCategory.toUpperCase()}` : ''}
              </span>

              {/* Distintivos Dinámicos: Estado Físico y Promoción */}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  product.condition === 'Seminuevo'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : product.condition === 'Usado'
                      ? 'bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                ● {product.condition || 'Nuevo'}
              </span>

              {(product.commercialTag || product.badge) && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    /black\s*friday/i.test(product.commercialTag || product.badge)
                      ? 'bg-black text-amber-300 border border-amber-400/50 shadow-xs'
                      : /oferta/i.test(product.commercialTag || product.badge)
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  {product.commercialTag || product.badge}
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cuerpo del Modal */}
          <div className="overflow-y-auto flex-1 p-4 sm:p-6 lg:p-8 no-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

              {/* SECCIÓN IZQUIERDA: GALERÍA DE MINIATURAS + FOTO PRINCIPAL */}
              <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 items-center sm:items-start">
                
                {/* Tira de Miniaturas (Thumbnails Dinámica) */}
                <div className="flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-y-auto max-h-[420px] no-scrollbar w-full sm:w-20 flex-shrink-0 justify-center sm:justify-start py-1">
                  {galleryImages.map((imgUrl, idx) => {
                    const isMainSlot = idx === 0;
                    const isSelected = selectedImageIndex === idx;

                    return (
                      <div
                        key={idx}
                        className={`group/thumb relative w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-xl sm:rounded-2xl p-1 bg-white transition-all duration-200 flex-shrink-0 cursor-pointer border-2 ${
                          isSelected
                            ? 'border-[#0A6CFF] shadow-md shadow-blue-500/15 scale-[1.02]'
                            : 'border-slate-200 opacity-75 hover:opacity-100 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedImageIndex(idx)}
                        onMouseEnter={() => setSelectedImageIndex(idx)}
                      >
                        <img
                          src={imgUrl}
                          alt={`Miniatura ${idx + 1}`}
                          className="w-full h-full object-contain rounded-lg"
                          loading="lazy"
                        />

                        {/* Etiqueta Principal en el primer slot */}
                        {isMainSlot && (
                          <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-md bg-blue-600 text-[8px] font-mono-code font-bold uppercase tracking-wider text-white shadow-2xs">
                            Ppal
                          </span>
                        )}

                        {/* Controles de Edición In-Situ al pasar el mouse (si tiene permisos) */}
                        {canEdit && (
                          <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center gap-1 z-10">
                            <button
                              type="button"
                              onClick={(e) => handleOpenImageSlotPicker(e, idx)}
                              className="p-1 rounded-md bg-white text-slate-800 hover:bg-blue-50 hover:text-blue-600 shadow-sm transition-colors"
                              title={isMainSlot ? 'Cambiar Imagen Principal' : `Cambiar foto ${idx + 1}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>

                            {!isMainSlot && (
                              <button
                                type="button"
                                onClick={(e) => handleRemoveSecondaryImage(e, idx)}
                                className="p-1 rounded-md bg-white text-rose-600 hover:bg-rose-50 shadow-sm transition-colors"
                                title="Eliminar foto secundaria"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Botón Dinámico "+" para Asignar / Añadir Nueva Imagen */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenImageSlotPicker(e, -1)}
                      className="group/add w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-xl sm:rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-blue-600 flex flex-col items-center justify-center gap-0.5 transition-all flex-shrink-0 cursor-pointer shadow-2xs hover:scale-102"
                      title="Añadir nueva foto a la galería (URL, Visor Web o WebP local)"
                    >
                      <Plus className="w-5 h-5 group-hover/add:rotate-90 transition-transform duration-200 text-blue-600" />
                      <span className="text-[9px] font-bold tracking-tight text-blue-700">Añadir</span>
                    </button>
                  )}
                </div>

                {/* Imagen Central en Alta Resolución */}
                <div className="relative flex-1 w-full aspect-square bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex items-center justify-center border border-slate-200 shadow-sm overflow-hidden group">
                  {product.badge && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono-code font-bold uppercase tracking-wider bg-slate-800 text-white shadow-sm">
                        {product.badge}
                      </span>
                    </div>
                  )}

                  {/* Botón flotante para editar la foto actualmente en vista */}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={(e) => handleOpenImageSlotPicker(e, selectedImageIndex)}
                      className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-xl bg-white/90 hover:bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-blue-600 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Reemplazar esta imagen"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Cambiar Foto</span>
                    </button>
                  )}

                  <div
                    onClick={() => onOpenLightbox && onOpenLightbox(product, selectedImageIndex, galleryImages)}
                    className="w-full h-full flex items-center justify-center cursor-zoom-in"
                    title="Haz clic para ampliar en pantalla completa"
                  >
                    <img
                      src={currentMainImage}
                      alt={product.name}
                      className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        e.target.src = '/zafra/logo-menu.webp';
                      }}
                    />

                    {/* Lupa flotante */}
                    <div className="absolute bottom-3 right-3 p-2 rounded-full bg-slate-800/70 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN DERECHA: INFORMACIÓN Y ACCIONES */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
                <div>
                  {/* Cabecera: Marca y Compartir */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-[#0A6CFF] bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md">
                      {product.brand || 'JAVRELSTORE'}
                    </span>

                    <button
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Compartir</span>
                    </button>
                  </div>

                  {/* Título */}
                  <h1 className="font-display font-extrabold text-lg sm:text-xl md:text-2xl text-slate-900 uppercase tracking-tight leading-snug mb-3">
                    {product.name}
                  </h1>

                  {/* Precio y Disponibilidad */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-3 mb-1">
                      <span className="font-display font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
                        {formatCurrency(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-sm sm:text-base text-slate-400 line-through">
                          {formatCurrency(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Indicador de Existencias */}
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                      <Check className="w-4 h-4" />
                      <span>Hay existencias</span>
                    </div>
                  </div>

                  {/* Controles de Cantidad + Botones */}
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-3">
                      {/* Selector de Cantidad */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
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
                        className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-blue-600 bg-white border border-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-sm"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span className="uppercase tracking-wider">Añadir al Carrito</span>
                      </button>
                    </div>

                    {/* Botón Comprar Ahora */}
                    <button
                      onClick={handleWhatsAppBuy}
                      className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Comprar Ahora</span>
                    </button>
                  </div>

                  {/* Código de Referencia / EAN Comercial Limpio */}
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

                  {/* FICHA TÉCNICA ESTRUCTURADA Y TOTALMENTE EDITABLE EN MODO ADMIN */}
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
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={newSpecTitle}
                            onChange={(e) => setNewSpecTitle(e.target.value)}
                            placeholder="Título (ej: Procesador)"
                            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                          />
                          <input
                            type="text"
                            value={newSpecDetail}
                            onChange={(e) => setNewSpecDetail(e.target.value)}
                            placeholder="Detalle (ej: Intel Core i7 16GB)"
                            className="sm:col-span-2 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
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
                            {isSavingSpecs ? 'Guardando...' : 'Guardar Característica'}
                          </button>
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
                              <div className="w-full space-y-1.5 animate-fadeIn">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    value={specTitleDraft}
                                    onChange={(e) => setSpecTitleDraft(e.target.value)}
                                    placeholder="Título"
                                    className="px-2.5 py-1 text-xs bg-white border border-blue-400 rounded-lg font-bold outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={specDetailDraft}
                                    onChange={(e) => setSpecDetailDraft(e.target.value)}
                                    placeholder="Detalle"
                                    className="sm:col-span-2 px-2.5 py-1 text-xs bg-white border border-blue-400 rounded-lg outline-none"
                                    autoFocus
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingSpecIdx(null)}
                                    className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300"
                                  >
                                    ✕
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditSpec(item.rawIdx)}
                                    disabled={isSavingSpecs}
                                    className="px-2.5 py-0.5 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs"
                                  >
                                    ✓ Guardar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Controles de reordenamiento ↑/↓ — siempre visibles en touch, hover en desktop */}
                                {canEdit && (
                                  <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity touch:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSpec(item.rawIdx, -1)}
                                      disabled={visIdx === 0 || isSavingSpecs}
                                      className="p-0.5 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-20 transition-colors touch-manipulation"
                                      title="Mover arriba"
                                      aria-label="Mover característica arriba"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSpec(item.rawIdx, 1)}
                                      disabled={visIdx === formattedSpecs.length - 1 || isSavingSpecs}
                                      className="p-0.5 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-20 transition-colors touch-manipulation"
                                      title="Mover abajo"
                                      aria-label="Mover característica abajo"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                <p className="text-sm text-slate-700 leading-relaxed flex-1 min-w-0">
                                  <strong className="text-slate-900 uppercase font-bold tracking-wide">
                                    {item.title}:
                                  </strong>{' '}
                                  {item.detail}
                                </p>

                                {/* Editar / Eliminar */}
                                {canEdit && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditSpec(item.rawIdx, item)}
                                      className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors touch-manipulation"
                                      title="Editar esta característica"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSpec(item.rawIdx)}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors touch-manipulation"
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

                    {/* Descripción General — Editable y Eliminable en modo Admin */}
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
                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors touch-manipulation"
                                title="Editar descripción"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {product.description && (
                                <button
                                  type="button"
                                  onClick={handleDeleteDescription}
                                  disabled={isSavingDescription}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors touch-manipulation"
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
                            <textarea
                              value={descriptionDraft}
                              onChange={(e) => setDescriptionDraft(e.target.value)}
                              rows={5}
                              placeholder="Descripción del producto..."
                              className="w-full px-3 py-2 text-sm border border-blue-400 rounded-xl bg-white text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setIsEditingDescription(false)}
                                className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveDescription}
                                disabled={isSavingDescription}
                                className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
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
                        {canEdit && !product.description && !isEditingDescription && (
                          <p className="text-xs text-slate-400 italic">Sin descripción. Haz clic en ✏️ para agregar.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SELLOS DE CONFIANZA: GARANTÍA Y ENVÍOS (EDITABLES IN-SITU) */}
                  <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                    
                    {/* 1. Garantía Oficial */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-4 h-4 text-[#0A6CFF] flex-shrink-0" />
                        <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400">
                          Garantía
                        </span>
                        {canEdit && !isEditingWarranty && (
                          <button
                            type="button"
                            onClick={() => setIsEditingWarranty(true)}
                            className="ml-auto text-slate-400 hover:text-blue-600 transition-colors cursor-pointer p-0.5"
                            title="Editar texto de garantía"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isEditingWarranty ? (
                        <div className="space-y-1.5 animate-fadeIn">
                          <input
                            type="text"
                            value={warrantyVal}
                            onChange={(e) => setWarrantyVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveWarranty()}
                            placeholder="Ej. Garantía Oficial 12 Meses"
                            className="w-full px-2.5 py-1 text-xs border border-blue-400 rounded-lg bg-white text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                            autoFocus
                          />
                          <div className="flex items-center justify-between text-[10px]">
                            <label className="flex items-center gap-1 text-slate-500 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={applyGlobally}
                                onChange={(e) => setApplyGlobally(e.target.checked)}
                                className="rounded text-blue-600"
                              />
                              <span>Guardar como predeterminado</span>
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingWarranty(false)}
                                className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold cursor-pointer"
                              >
                                ✕
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveWarranty}
                                className="px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-bold cursor-pointer"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => canEdit && setIsEditingWarranty(true)}
                          className={`font-semibold text-slate-800 ${
                            canEdit ? 'cursor-pointer hover:text-blue-600' : ''
                          }`}
                          title={canEdit ? 'Haz clic para editar' : undefined}
                        >
                          {product.warrantyText || config?.warrantyText || 'Garantía Oficial 12 Meses'}
                        </p>
                      )}
                    </div>

                    {/* 2. Envíos Asegurados */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400">
                          Despacho
                        </span>
                        {canEdit && !isEditingShipping && (
                          <button
                            type="button"
                            onClick={() => setIsEditingShipping(true)}
                            className="ml-auto text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer p-0.5"
                            title="Editar texto de envíos"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {isEditingShipping ? (
                        <div className="space-y-1.5 animate-fadeIn">
                          <input
                            type="text"
                            value={shippingVal}
                            onChange={(e) => setShippingVal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveShipping()}
                            placeholder="Ej. Envíos Asegurados a Colombia"
                            className="w-full px-2.5 py-1 text-xs border border-emerald-400 rounded-lg bg-white text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                            autoFocus
                          />
                          <div className="flex items-center justify-between text-[10px]">
                            <label className="flex items-center gap-1 text-slate-500 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={applyGlobally}
                                onChange={(e) => setApplyGlobally(e.target.checked)}
                                className="rounded text-emerald-600"
                              />
                              <span>Guardar como predeterminado</span>
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setIsEditingShipping(false)}
                                className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold cursor-pointer"
                              >
                                ✕
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveShipping}
                                className="px-2 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-bold cursor-pointer"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p
                          onClick={() => canEdit && setIsEditingShipping(true)}
                          className={`font-semibold text-slate-800 ${
                            canEdit ? 'cursor-pointer hover:text-emerald-600' : ''
                          }`}
                          title={canEdit ? 'Haz clic para editar' : undefined}
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

      {/* Centro de Difusión Multicanal */}
      {isShareOpen && (
        <React.Suspense fallback={null}>
          <SocialShareModal
            isOpen
            product={product}
            config={config}
            isAdmin={isAdmin}
            onClose={() => setIsShareOpen(false)}
          />
        </React.Suspense>
      )}

      {/* Modal Selector de Imagen con Soporte de URL, Visor Web y WebP Local */}
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
