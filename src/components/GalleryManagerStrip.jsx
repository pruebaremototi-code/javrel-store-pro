import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, GripVertical, Pencil, Plus, Star, X } from 'lucide-react';

/**
 * Reordena un arreglo moviendo un elemento desde `fromIndex` hasta `toIndex`.
 */
const moveArrayItem = (list, fromIndex, toIndex) => {
  if (
    !Array.isArray(list) ||
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= list.length ||
    toIndex >= list.length
  ) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

/**
 * Gestor visual de galería con Drag & Drop (desktop + táctil),
 * flechas de movimiento rápido (← / →), botón "Hacer Portada" (★)
 * y eliminación puntual (×).
 */
export const GalleryManagerStrip = ({
  images = [],
  selectedIndex = 0,
  onSelectIndex,
  canEdit = false,
  onChangeOrder,
  onEditSlot,
  onAddImage,
}) => {
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const touchStartIdxRef = useRef(null);
  const touchMovedRef = useRef(false);

  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const total = safeImages.length;

  const commitOrder = (nextList, nextSelectedIdx = 0) => {
    if (!Array.isArray(nextList) || nextList.length === 0) return;
    onChangeOrder?.(nextList);
    if (onSelectIndex && typeof nextSelectedIdx === 'number') {
      onSelectIndex(Math.max(0, Math.min(nextSelectedIdx, nextList.length - 1)));
    }
  };

  const handleMove = (e, idx, delta) => {
    e.stopPropagation();
    const target = idx + delta;
    if (target < 0 || target >= total) return;
    const next = moveArrayItem(safeImages, idx, target);
    commitOrder(next, target);
  };

  const handleMakeCover = (e, idx) => {
    e.stopPropagation();
    if (idx <= 0 || idx >= total) return;
    const next = moveArrayItem(safeImages, idx, 0);
    commitOrder(next, 0);
  };

  const handleRemove = (e, idx) => {
    e.stopPropagation();
    if (total <= 1) return;
    const next = safeImages.filter((_, i) => i !== idx);
    const nextSel = selectedIndex >= next.length ? next.length - 1 : selectedIndex;
    commitOrder(next, nextSel);
  };

  // Drag & Drop (Desktop)
  const handleDragStart = (e, idx) => {
    if (!canEdit) return;
    setDragIndex(idx);
    setDropIndex(idx);
    try {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
    } catch {
      // Safari / fallback
    }
  };

  const handleDragOver = (e, idx) => {
    if (!canEdit || dragIndex === null) return;
    e.preventDefault();
    if (dropIndex !== idx) setDropIndex(idx);
  };

  const handleDrop = (e, idx) => {
    if (!canEdit) return;
    e.preventDefault();
    const from = dragIndex;
    setDragIndex(null);
    setDropIndex(null);
    if (from === null || from === idx) return;
    const next = moveArrayItem(safeImages, from, idx);
    commitOrder(next, idx);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  // Soporte táctil (móvil / tablet)
  const handleTouchStart = (idx) => {
    if (!canEdit || total <= 1) return;
    touchStartIdxRef.current = idx;
    touchMovedRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (!canEdit || touchStartIdxRef.current === null) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotEl = el?.closest?.('[data-gallery-idx]');
    if (slotEl) {
      const targetIdx = Number(slotEl.getAttribute('data-gallery-idx'));
      if (!Number.isNaN(targetIdx) && targetIdx !== touchStartIdxRef.current) {
        touchMovedRef.current = true;
        setDragIndex(touchStartIdxRef.current);
        setDropIndex(targetIdx);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!canEdit) return;
    const from = touchStartIdxRef.current;
    const to = dropIndex;
    touchStartIdxRef.current = null;
    if (touchMovedRef.current && from !== null && to !== null && from !== to) {
      const next = moveArrayItem(safeImages, from, to);
      commitOrder(next, to);
    }
    touchMovedRef.current = false;
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <div className="flex items-start gap-2.5 overflow-x-auto py-2 px-1 no-scrollbar">
      {safeImages.map((imgUrl, idx) => {
        const isCover = idx === 0;
        const isSelected = selectedIndex === idx;
        const isDragging = dragIndex === idx;
        const isDropTarget = dropIndex === idx && dragIndex !== null && dragIndex !== idx;

        return (
          <div
            key={`${imgUrl}-${idx}`}
            data-gallery-idx={idx}
            draggable={canEdit && total > 1}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onTouchStart={() => handleTouchStart(idx)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            {/* Contenedor de la miniatura */}
            <div
              onClick={() => onSelectIndex?.(idx)}
              onMouseEnter={() => onSelectIndex?.(idx)}
              className={`group/thumb relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl p-1 bg-white transition-all duration-150 cursor-pointer border-2 ${
                isDragging
                  ? 'opacity-50 scale-95 border-[#0A6CFF] ring-2 ring-[#0A6CFF]/30'
                  : isDropTarget
                    ? 'border-dashed border-[#0A6CFF] bg-blue-50/60 scale-105'
                    : isSelected || isCover
                      ? 'border-[#0A6CFF] shadow-md shadow-blue-500/15'
                      : 'border-slate-200 opacity-85 hover:opacity-100 hover:border-slate-300'
              }`}
            >
              <img
                src={imgUrl}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-contain rounded-lg select-none pointer-events-none"
                loading="lazy"
                draggable={false}
              />

              {/* Badge verde ★ PORTADA en posición 0 */}
              {isCover && (
                <span className="absolute -top-2 -left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-[8px] font-mono-code font-bold uppercase tracking-wider text-white shadow-xs pointer-events-none whitespace-nowrap z-10">
                  ★ PORTADA
                </span>
              )}

              {/* Indicador discreto de arrastre cuando hay múltiples fotos */}
              {canEdit && total > 1 && (
                <span
                  className="absolute bottom-1 left-1 p-0.5 rounded bg-slate-900/60 text-white opacity-70 group-hover/thumb:opacity-100 pointer-events-none"
                  title="Arrastra para reordenar"
                >
                  <GripVertical className="w-2.5 h-2.5" />
                </span>
              )}

              {/* Botón Eliminar (×) cuando hay más de 1 imagen */}
              {canEdit && total > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-sm transition-transform hover:scale-110 z-20 cursor-pointer"
                  title="Eliminar esta foto de la galería"
                  aria-label={`Eliminar foto ${idx + 1}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Botón lápiz opcional para reemplazar foto en este slot */}
              {canEdit && onEditSlot && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditSlot(e, idx);
                  }}
                  className="absolute bottom-1 right-1 p-1 rounded-md bg-white/95 text-slate-700 hover:bg-blue-50 hover:text-[#0A6CFF] border border-slate-200 shadow-xs opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10 cursor-pointer"
                  title={isCover ? 'Cambiar Foto Principal' : `Cambiar foto ${idx + 1}`}
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            {/* Barra de controles rápidos bajo cada miniatura (siempre visible en Editor/Admin) */}
            {canEdit && (total > 1 || !isCover) && (
              <div className="flex items-center justify-center gap-0.5">
                {total > 1 && (
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => handleMove(e, idx, -1)}
                    className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#0A6CFF] disabled:opacity-30 disabled:pointer-events-none shadow-2xs transition-colors cursor-pointer"
                    title="Mover a la izquierda"
                    aria-label="Mover imagen a la izquierda"
                  >
                    <ArrowLeft className="w-2.5 h-2.5" />
                  </button>
                )}

                {!isCover && (
                  <button
                    type="button"
                    onClick={(e) => handleMakeCover(e, idx)}
                    className="px-1.5 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 text-[9px] font-bold flex items-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap"
                    title="Hacer Portada Principal"
                  >
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>Portada</span>
                  </button>
                )}

                {total > 1 && (
                  <button
                    type="button"
                    disabled={idx === total - 1}
                    onClick={(e) => handleMove(e, idx, 1)}
                    className="p-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-[#0A6CFF] disabled:opacity-30 disabled:pointer-events-none shadow-2xs transition-colors cursor-pointer"
                    title="Mover a la derecha"
                    aria-label="Mover imagen a la derecha"
                  >
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Botón "+" para añadir imagen a la galería */}
      {canEdit && onAddImage && (
        <button
          type="button"
          onClick={onAddImage}
          className="group/add w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-blue-600 flex flex-col items-center justify-center gap-0.5 transition-all flex-shrink-0 cursor-pointer shadow-2xs"
          title="Añadir nueva foto a la galería"
        >
          <Plus className="w-5 h-5 group-hover/add:rotate-90 transition-transform duration-200 text-blue-600" />
          <span className="text-[9px] font-bold tracking-tight text-blue-700">Añadir</span>
        </button>
      )}
    </div>
  );
};

export default GalleryManagerStrip;
