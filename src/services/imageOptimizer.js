/**
 * Módulo de Optimización de Medios y Compresión Automática WebP Ultraligera
 * Diseñado para e-commerce de alto rendimiento y cero saturación en Supabase y Vercel.
 * Redimensiona a máx. 1200px y comprime a WebP ≤80KB antes de subir a Supabase Storage.
 * Las URLs externas (catálogos / Magnific / web) NO se tocan — se guardan como referencia directa.
 */

import { supabase } from '../supabaseClient';

/** Bucket público configurado en Supabase Storage */
const STORAGE_BUCKET = 'product-images';

/**
 * Detecta si una cadena es una URL externa válida (no base64, no blob)
 * → se guarda sin procesamiento como referencia directa.
 */
export const isExternalUrl = (src) => {
  if (typeof src !== 'string') return false;
  const s = src.trim();
  return (
    (s.startsWith('http://') || s.startsWith('https://')) &&
    !s.startsWith('data:') &&
    !s.startsWith('blob:')
  );
};

/**
 * Sube un Blob/File WebP a Supabase Storage y devuelve la URL pública permanente.
 * Si Supabase Storage no está disponible, hace fallback a dataUrl (no se rompe el flujo).
 * @param {Blob} blob - Blob WebP comprimido
 * @param {string} [fileName] - Nombre de archivo sugerido
 * @returns {Promise<string>} URL pública de Supabase o dataUrl como fallback
 */
export const uploadToStorage = async (blob, fileName = null) => {
  try {
    const name = fileName || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.webp`;
    const path = `catalog/${name}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, {
        contentType: blob.type || 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1 año de caché CDN
      });

    if (error) {
      console.warn('[imageOptimizer] Storage upload failed, using dataUrl fallback:', error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return publicData?.publicUrl || null;
  } catch (err) {
    console.warn('[imageOptimizer] uploadToStorage exception:', err);
    return null;
  }
};

export const imageOptimizer = {
  /**
   * Comprime y redimensiona una imagen a formato WebP optimizado (máx. 1200px, ≤80KB).
   * Centrado simétrico con fondo blanco limpio para presentación prémium en catálogo.
   * @param {File|Blob|string} imageSource - Archivo, Blob o DataURL/URL de la imagen
   * @param {Object} options - Parámetros de compresión
   * @returns {Promise<{ dataUrl: string, blob: Blob, originalSizeKb: number, compressedSizeKb: number, width: number, height: number, savingsPercent: number }>}
   */
  async compressToWebP(imageSource, options = {}) {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      initialQuality = 0.80,
      targetMaxKb = 80,
      minQuality = 0.40,
      forceSquare = true,
      backgroundColor = '#FFFFFF',
      padding = 24,
    } = options;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      let originalSizeKb = 0;
      let objectUrl = null;
      if (imageSource instanceof Blob || imageSource instanceof File) {
        originalSizeKb = Math.round(imageSource.size / 1024);
      }

      const cleanup = () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
      };

      img.onload = async () => {
        try {
          let canvasWidth = maxWidth;
          let canvasHeight = maxHeight;

          let dw, dh, dx, dy;

          if (forceSquare) {
            // Lienzo cuadrado uniforme (máx 1000x1000)
            canvasWidth = maxWidth;
            canvasHeight = maxHeight;

            const usableWidth = canvasWidth - (padding * 2);
            const usableHeight = canvasHeight - (padding * 2);

            const scale = Math.min(usableWidth / img.width, usableHeight / img.height, 1);
            dw = Math.round(img.width * scale);
            dh = Math.round(img.height * scale);

            dx = Math.round((canvasWidth - dw) / 2);
            dy = Math.round((canvasHeight - dh) / 2);
          } else {
            // Proporcional sin lienzo forzado
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
              const ratio = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }
            canvasWidth = width;
            canvasHeight = height;
            dw = width;
            dh = height;
            dx = 0;
            dy = 0;
          }

          // 2. Renderizar en Canvas de alto rendimiento
          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          if (backgroundColor) {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          }

          ctx.drawImage(img, dx, dy, dw, dh);

          // 3. Compresión adaptativa WebP con meta estricta < 40KB
          let quality = initialQuality;
          let blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));

          // Ajuste iterativo descendente si supera el objetivo de 40KB
          while (blob && blob.size > targetMaxKb * 1024 && quality > minQuality) {
            quality -= 0.08;
            blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality));
          }

          // Si aún excede 40KB, reducir resolución progresivamente para garantizar < 40KB
          if (blob && blob.size > targetMaxKb * 1024) {
            const downScaleCanvas = document.createElement('canvas');
            const targetDim = 800;
            downScaleCanvas.width = targetDim;
            downScaleCanvas.height = targetDim;
            const downCtx = downScaleCanvas.getContext('2d');
            downCtx.imageSmoothingEnabled = true;
            downCtx.imageSmoothingQuality = 'high';
            downCtx.drawImage(canvas, 0, 0, targetDim, targetDim);
            blob = await new Promise((res) => downScaleCanvas.toBlob(res, 'image/webp', 0.65));
          }

          // Fallback a JPEG si el navegador antiguo no soporta WebP
          if (!blob) {
            blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.75));
          }

          const compressedSizeKb = Math.round((blob?.size || 0) / 1024);
          if (!originalSizeKb) {
            originalSizeKb = compressedSizeKb * 3;
          }

          const savingsPercent = originalSizeKb > compressedSizeKb
            ? Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100)
            : 0;

          const reader = new FileReader();
          reader.onloadend = () => {
            cleanup();
            resolve({
              dataUrl: reader.result,
              blob,
              originalSizeKb,
              compressedSizeKb,
              width: canvasWidth,
              height: canvasHeight,
              savingsPercent,
              mimeType: blob?.type || 'image/webp',
            });
          };
          reader.readAsDataURL(blob);
        } catch (err) {
          cleanup();
          reject(err);
        }
      };

      img.onerror = (err) => {
        cleanup();
        reject(new Error('No se pudo cargar la imagen para compresión: ' + err));
      };

      if (imageSource instanceof Blob || imageSource instanceof File) {
        objectUrl = URL.createObjectURL(imageSource);
        img.src = objectUrl;
      } else if (typeof imageSource === 'string') {
        img.src = imageSource;
      } else {
        reject(new Error('Tipo de fuente de imagen inválido.'));
      }
    });
  },

  /**
   * Verifica si una URL es una cadena Base64 pesada (>150KB)
   */
  isHeavyBase64(str) {
    return typeof str === 'string' && str.startsWith('data:') && str.length > 150 * 1024;
  },

  /**
   * Procesa múltiples imágenes por lotes asegurando no bloquear el hilo principal
   */
  async compressBatch(files, onProgress = null) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await this.compressToWebP(file, { forceSquare: true });
        results.push({
          file,
          fileName: file.name || `image_${i + 1}.webp`,
          ...compressed,
          success: true,
        });
      } catch (err) {
        console.warn(`Error al optimizar ${file.name || i}:`, err);
        results.push({
          file,
          fileName: file.name || `image_${i + 1}`,
          error: err.message,
          success: false,
        });
      }
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }
    return results;
  },

  /**
   * Genera un placeholder SVG ultraligero (menos de 1KB) para productos sin imagen
   */
  getEmptyProductPlaceholder(title = 'Producto') {
    const safeTitle = encodeURIComponent(title.substring(0, 20));
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="%23FFFFFF" width="400" height="400"/><rect fill="%23F8FAFC" x="20" y="20" width="360" height="360" rx="24"/><text fill="%230A6CFF" font-family="sans-serif" font-size="20" font-weight="bold" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle">${safeTitle}</text></svg>`;
  },

  /**
   * Pipeline completo para imágenes locales (File/Blob):
   *   1. Comprime a WebP ≤80KB (máx. 1200px)
   *   2. Sube a Supabase Storage → retorna URL pública CDN
   *   3. Si Storage falla → retorna dataUrl como fallback seguro
   *
   * Las URLs externas (http/https) NO deben pasar por aquí — usar isExternalUrl().
   *
   * @param {File|Blob} file
   * @param {string} [fileName]
   * @returns {Promise<{ url: string, isStorageUrl: boolean, compressedSizeKb: number, savingsPercent: number }>}
   */
  async processLocalImage(file, fileName = null) {
    // 1. Comprimir
    const compressed = await this.compressToWebP(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      initialQuality: 0.80,
      targetMaxKb: 80,
      forceSquare: false, // preservar proporción original para catálogo
      backgroundColor: '#FFFFFF',
      padding: 0,
    });

    // 2. Intentar subir a Supabase Storage
    const baseName = fileName
      ? fileName.replace(/\.[^.]+$/, '')
      : `img_${Date.now()}`;
    const storageName = `${baseName}_${Date.now()}.webp`;
    const publicUrl = await uploadToStorage(compressed.blob, storageName);

    if (publicUrl) {
      return {
        url: publicUrl,
        isStorageUrl: true,
        dataUrl: compressed.dataUrl, // para previsualización inmediata
        compressedSizeKb: compressed.compressedSizeKb,
        savingsPercent: compressed.savingsPercent,
      };
    }

    // 3. Fallback: dataUrl (funcional, aunque pesa más)
    return {
      url: compressed.dataUrl,
      isStorageUrl: false,
      dataUrl: compressed.dataUrl,
      compressedSizeKb: compressed.compressedSizeKb,
      savingsPercent: compressed.savingsPercent,
    };
  },
};
