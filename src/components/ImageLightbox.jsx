import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../services/storeService';

export const ImageLightbox = ({
  isOpen,
  image,
  images = [],
  initialIndex = 0,
  title,
  price,
  brand,
  onClose,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  // Normalizar lista completa de imágenes del producto
  const allImages = useMemo(() => {
    const list = Array.isArray(images) && images.length > 0 ? images : [image];
    return list.filter((img) => img && typeof img === 'string');
  }, [images, image]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialIndex >= 0 && initialIndex < allImages.length) return initialIndex;
    return 0;
  });

  // Sincronizar índice inicial al abrir o cambiar la imagen base
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setMousePos({ x: 50, y: 50 });
      if (initialIndex >= 0 && initialIndex < allImages.length) {
        setCurrentIndex(initialIndex);
      } else {
        const foundIdx = allImages.findIndex((img) => img === image);
        setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
      }
    }
  }, [isOpen, image, initialIndex, allImages]);

  const handlePrev = useCallback(() => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
  }, [allImages.length]);

  const handleNext = useCallback(() => {
    setZoomLevel(1);
    setCurrentIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
  }, [allImages.length]);

  // Soporte para eventos de teclado (Escape, Flecha Izquierda, Flecha Derecha)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && allImages.length > 1) {
        handlePrev();
      } else if (e.key === 'ArrowRight' && allImages.length > 1) {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext, allImages.length]);

  if (!isOpen || allImages.length === 0) return null;

  const currentDisplayImage = allImages[currentIndex] || image;

  const handleMouseMove = (e) => {
    if (zoomLevel <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 2.2 : 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada del producto"
      data-image-lightbox="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-fadeIn select-none"
      onClick={onClose}
    >
      {/* Cuadro Flotante Centralizado de Tamaño Mediano estilo MercadoLibre */}
      <div
        className="relative w-full max-w-lg sm:max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Lightbox Modal */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="min-w-0 pr-3">
            {brand && (
              <span className="text-[10px] font-mono-code uppercase font-bold text-[#0A6CFF] tracking-wider block">
                {brand}
              </span>
            )}
            <h3 className="font-display font-bold text-sm sm:text-base text-slate-900 truncate">
              {title || 'Detalle de Producto'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              {price && (
                <span className="text-xs font-display font-extrabold text-[#0A6CFF]">
                  {formatCurrency(price)}
                </span>
              )}
              {allImages.length > 1 && (
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  Foto {currentIndex + 1} de {allImages.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Control de Lupa */}
            <button
              onClick={toggleZoom}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title={zoomLevel > 1 ? 'Alejar imagen' : 'Activar lupa de alta resolución'}
            >
              {zoomLevel > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Cerrar visor (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Área Central de Visualización de la Imagen */}
        <div
          className="relative w-full h-[320px] sm:h-[420px] bg-gradient-to-b from-[#F8FAFC] to-white flex items-center justify-center p-4 overflow-hidden select-none cursor-zoom-in"
          onClick={toggleZoom}
          onMouseMove={handleMouseMove}
        >
          <img
            key={currentDisplayImage}
            src={currentDisplayImage}
            alt={`${title} - Foto ${currentIndex + 1}`}
            className="w-full h-full object-contain transition-transform duration-150 filter drop-shadow-md animate-fadeIn"
            style={{
              transform: zoomLevel > 1 ? `scale(${zoomLevel})` : 'scale(1)',
              transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
            }}
            onError={(e) => {
              e.target.src = '/zafra/logo-menu.webp';
            }}
          />

          {/* Flecha Lateral Izquierda (Navegación Galería) */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Foto anterior"
              title="Foto anterior (←)"
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-white/90 hover:bg-white text-slate-800 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 z-20 border border-slate-200/80 cursor-pointer group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Flecha Lateral Derecha (Navegación Galería) */}
          {allImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Siguiente foto"
              title="Siguiente foto (→)"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-2xl bg-white/90 hover:bg-white text-slate-800 shadow-xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 z-20 border border-slate-200/80 cursor-pointer group"
            >
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Indicador de Zoom Activo */}
          {zoomLevel > 1 && (
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full pointer-events-none z-10 shadow-sm">
              Zoom 2.2x activo
            </div>
          )}

          {/* Indicador flotante de fotos */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-md z-10">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel(1);
                    setCurrentIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Ver foto ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pie con sugerencia interactiva y selector rápido de miniaturas */}
        <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-1.5 truncate pr-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            <span className="truncate">
              {allImages.length > 1
                ? 'Usa las flechas del teclado o los botones para explorar la galería'
                : 'Haz clic para alternar lupa o afuera para cerrar'}
            </span>
          </span>
          <button
            onClick={onClose}
            className="text-[#0A6CFF] font-semibold hover:underline flex-shrink-0"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
