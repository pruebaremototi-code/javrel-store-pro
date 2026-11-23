import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Image as ImageIcon,
  Check,
  Upload,
  Link2,
  Sparkles,
  Globe,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import { VisualImageSearchModal } from './VisualImageSearchModal';
import { imageOptimizer, isExternalUrl } from '../services/imageOptimizer';

export const ImagePickerModal = ({ isOpen, currentImage, onSave, onClose }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading' | 'storage' | 'fallback' | 'external'
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setImageUrl(currentImage || '');
    setPreviewUrl(currentImage || '');
    setCompressionInfo(null);
    setUploadStatus(null);
  }, [currentImage, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = imageUrl.trim();
    if (url) {
      onSave(url);
      onClose();
    }
  };

  /**
   * Maneja archivos locales:
   *   1. Comprime a WebP ≤80KB
   *   2. Sube a Supabase Storage → guarda URL pública CDN (no base64)
   *   3. Fallback a dataUrl si Storage no está disponible
   */
  const handleLocalFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setCompressionInfo(null);
    setUploadStatus('uploading');

    try {
      const result = await imageOptimizer.processLocalImage(file, file.name);

      // Mostrar previsualización inmediata con dataUrl
      setPreviewUrl(result.dataUrl);

      // La URL final que se guarda en BD: pública de Storage o dataUrl
      setImageUrl(result.url);

      setCompressionInfo({
        sizeKb: result.compressedSizeKb,
        savings: result.savingsPercent,
      });

      setUploadStatus(result.isStorageUrl ? 'storage' : 'fallback');

      // Guardar y cerrar directamente
      onSave(result.url);
      onClose();
    } catch (err) {
      console.warn('[ImagePickerModal] Error procesando imagen local:', err);
      // Último fallback: FileReader directo
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        setImageUrl(dataUrl);
        setPreviewUrl(dataUrl);
        setUploadStatus('fallback');
        onSave(dataUrl);
        onClose();
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /** Cuando el usuario pega una URL externa → se guarda sin procesamiento */
  const handleUrlChange = (e) => {
    const val = e.target.value;
    setImageUrl(val);
    setPreviewUrl(val);
    if (isExternalUrl(val)) {
      setUploadStatus('external');
      setCompressionInfo(null);
    } else {
      setUploadStatus(null);
    }
  };

  const statusLabel = {
    uploading: { icon: <Loader2 className="w-3 h-3 animate-spin text-blue-500" />, text: 'Comprimiendo y subiendo…', color: 'text-blue-600' },
    storage:   { icon: <CloudUpload className="w-3 h-3 text-emerald-500" />,       text: 'Subida a CDN correcta • URL pública guardada', color: 'text-emerald-600' },
    fallback:  { icon: <CheckCircle2 className="w-3 h-3 text-amber-500" />,         text: 'WebP comprimido • Guardado local', color: 'text-amber-600' },
    external:  { icon: <Globe className="w-3 h-3 text-slate-400" />,               text: 'URL externa — se guarda sin procesamiento', color: 'text-slate-500' },
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
        <div
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#0A6CFF]/10 text-[#0A6CFF]">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-slate-900">
                  Gestión de Imagen del Producto
                </h3>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  WebP Auto-Compress · CDN Upload · URL Directa
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Vista previa + botones de acción */}
            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              {/* Thumbnail */}
              <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                <img
                  src={previewUrl || imageUrl || '/zafra/logo-menu.webp'}
                  alt="Vista previa"
                  className="w-full h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = '/zafra/logo-menu.webp';
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <span className="text-[9px] font-mono-code uppercase font-bold text-slate-400 tracking-widest block">
                  Vista previa · Imagen activa
                </span>

                {/* Estado de upload / compresión */}
                {uploadStatus && statusLabel[uploadStatus] && (
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${statusLabel[uploadStatus].color}`}>
                    {statusLabel[uploadStatus].icon}
                    <span>{statusLabel[uploadStatus].text}</span>
                  </div>
                )}

                {/* Info de compresión */}
                {compressionInfo && (
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    {compressionInfo.sizeKb} KB · {compressionInfo.savings}% ahorro
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsVisualSearchOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A6CFF] text-white text-[11px] font-bold shadow-sm hover:bg-blue-600 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Galería Web</span>
                  </button>
                  <button
                    type="button"
                    disabled={isCompressing}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition-colors disabled:opacity-60"
                  >
                    {isCompressing
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Upload className="w-3 h-3 text-emerald-600" />
                    }
                    <span>{isCompressing ? 'Procesando…' : 'Subir archivo'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLocalFile}
                  />
                </div>
              </div>
            </div>

            {/* Recuadro informativo: flujo dual */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-[10px] text-slate-600 leading-relaxed space-y-1">
              <p className="font-black uppercase tracking-wider text-[#0A6CFF] text-[9px] mb-1">📌 Gestión de imágenes</p>
              <p><span className="font-bold text-emerald-700">Archivo local (PC / Móvil):</span> se comprime a WebP &lt;50KB y se sube al CDN de Supabase. Se guarda la URL pública — sin cadenas base64 pesadas.</p>
              <p><span className="font-bold text-blue-700">URL externa (web / catálogo):</span> se guarda como referencia directa sin modificación.</p>
            </div>

            {/* Campo URL directa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                URL directa de imagen
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={imageUrl}
                  onChange={handleUrlChange}
                  placeholder="https://... (URL externa) o pega cualquier link"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-900 focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/10 outline-none font-medium transition-all"
                />
              </div>
              {isExternalUrl(imageUrl) && (
                <p className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  URL externa detectada — se guardará sin procesamiento
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!imageUrl.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0A6CFF] hover:bg-[#0058D6] shadow-md shadow-blue-500/25 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar Imagen
              </button>
            </div>
          </form>
        </div>
      </div>

      {isVisualSearchOpen && (
        <VisualImageSearchModal
          isOpen={isVisualSearchOpen}
          initialQuery=""
          productTitle="Producto"
          onClose={() => setIsVisualSearchOpen(false)}
          onSelectImage={(newWebp) => {
            setImageUrl(newWebp);
            setPreviewUrl(newWebp);
            setUploadStatus(isExternalUrl(newWebp) ? 'external' : 'fallback');
            onSave(newWebp);
            onClose();
          }}
        />
      )}
    </>
  );
};
