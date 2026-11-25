import { supabase } from '../supabaseClient.js';

/**
 * Servicio de validación y aplicación de cupones de descuento contra Supabase.
 */
export const couponService = {
  /**
   * Valida un código de cupón frente a la tabla `public.coupons` en Supabase
   * y calcula el descuento aplicable para el subtotal dado.
   */
  async validateCoupon(rawCode, subtotal) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) {
      return { valid: false, error: 'Ingresa un código de cupón.' };
    }

    const numericSubtotal = Math.max(0, Number(subtotal) || 0);

    try {
      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .ilike('code', code)
        .maybeSingle();

      if (error) {
        console.warn('[couponService] Error consultando cupón:', error.message);
        return {
          valid: false,
          error: 'No se pudo validar el cupón en este momento. Intenta de nuevo.',
        };
      }

      if (!coupon) {
        return { valid: false, error: 'El cupón ingresado no existe.' };
      }

      if (!coupon.is_active) {
        return { valid: false, error: 'Este cupón ya no se encuentra activo.' };
      }

      const now = Date.now();
      if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) {
        return { valid: false, error: 'Este cupón aún no ha iniciado su vigencia.' };
      }
      if (coupon.expires_at && new Date(coupon.expires_at).getTime() < now) {
        return { valid: false, error: 'Este cupón ha expirado.' };
      }

      const maxUses = coupon.max_uses != null ? Number(coupon.max_uses) : null;
      const currentUses = Number(coupon.current_uses) || 0;
      if (maxUses !== null && currentUses >= maxUses) {
        return { valid: false, error: 'Este cupón alcanzó el límite máximo de usos.' };
      }

      const minOrder = Number(coupon.min_order_amount) || 0;
      if (numericSubtotal < minOrder) {
        return {
          valid: false,
          error: `Monto mínimo requerido: $${minOrder.toLocaleString('es-CO')}.`,
        };
      }

      const discountValue = Number(coupon.discount_value) || 0;
      let discountAmount = 0;

      if (coupon.discount_type === 'percentage') {
        discountAmount = Math.round((numericSubtotal * discountValue) / 100);
        const maxDiscount =
          coupon.max_discount_amount != null ? Number(coupon.max_discount_amount) : null;
        if (maxDiscount !== null && maxDiscount > 0) {
          discountAmount = Math.min(discountAmount, maxDiscount);
        }
      } else {
        discountAmount = Math.round(discountValue);
      }

      discountAmount = Math.min(discountAmount, numericSubtotal);

      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          description: coupon.description || '',
          discountType: coupon.discount_type,
          discountValue,
          discountAmount,
        },
      };
    } catch (err) {
      console.warn('[couponService] Excepción validando cupón:', err);
      return {
        valid: false,
        error: 'Error de conexión al validar el cupón.',
      };
    }
  },

  /**
   * Incrementa el contador de uso de un cupón al confirmar la orden.
   */
  async markCouponUsed(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return;

    try {
      const { data } = await supabase
        .from('coupons')
        .select('id, current_uses')
        .ilike('code', normalized)
        .maybeSingle();

      if (!data?.id) return;

      await supabase
        .from('coupons')
        .update({ current_uses: (Number(data.current_uses) || 0) + 1 })
        .eq('id', data.id);
    } catch (err) {
      console.warn('[couponService] No se pudo incrementar uso del cupón:', err);
    }
  },
};
