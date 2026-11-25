import { supabase } from '../supabaseClient.js';
import { imageOptimizer } from './imageOptimizer.js';

const PROOF_BUCKET = 'payment-proofs';
const MAX_PROOF_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

/**
 * Servicio para subir comprobantes de pago (imagen o PDF) al bucket
 * `payment-proofs` de Supabase Storage y devolver su URL pública.
 */
export const paymentProofService = {
  /**
   * Sube un archivo de comprobante a Supabase Storage sin guardar Base64 en BD.
   */
  async uploadProof(file, referenceCode = 'JVR') {
    if (!file) {
      throw new Error('Selecciona un archivo de comprobante.');
    }

    if (file.size > MAX_PROOF_BYTES) {
      throw new Error('El comprobante no debe superar los 10 MB.');
    }

    const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    const isImage = file.type?.startsWith('image/');

    if (!isPdf && !isImage) {
      throw new Error('Formato no compatible. Sube una imagen (PNG, JPG, WebP) o PDF.');
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type) && !isImage) {
      throw new Error('Formato de archivo no permitido.');
    }

    let uploadBody = file;
    let contentType = file.type || (isPdf ? 'application/pdf' : 'image/webp');
    let extension = isPdf ? 'pdf' : 'webp';

    if (isImage) {
      try {
        const optimized = await imageOptimizer.compressToWebP(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          initialQuality: 0.82,
          targetMaxKb: 180,
        });
        const response = await fetch(optimized.dataUrl);
        uploadBody = await response.blob();
        contentType = 'image/webp';
        extension = 'webp';
      } catch (optErr) {
        console.warn('[paymentProofService] Fallback a imagen original:', optErr);
        const origExt = (file.name?.split('.').pop() || 'jpg').toLowerCase();
        extension = ['png', 'jpg', 'jpeg', 'webp'].includes(origExt) ? origExt : 'jpg';
      }
    }

    const safeRef = String(referenceCode || 'JVR')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 32);
    const uniquePath = `proofs/${safeRef}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(uniquePath, uploadBody, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `No se pudo subir el comprobante a Supabase Storage: ${uploadError.message}`
      );
    }

    const { data: publicData } = supabase.storage
      .from(PROOF_BUCKET)
      .getPublicUrl(uniquePath);

    if (!publicData?.publicUrl) {
      throw new Error('No se obtuvo la URL pública del comprobante.');
    }

    return {
      url: publicData.publicUrl,
      path: uniquePath,
      fileName: file.name,
      isPdf,
    };
  },
};
