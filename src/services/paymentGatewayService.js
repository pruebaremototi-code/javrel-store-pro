/**
 * Servicio desacoplado de pasarelas de pago automáticas (PayPal, Tarjetas y Wompi).
 *
 * Centraliza la lógica de PayPal, tarjetas débito/crédito y la futura conexión
 * directa de Wompi (Nequi, PSE, Bancolombia, tarjetas) usando las credenciales
 * administradas desde `store_settings` / variables de entorno.
 */

export const paymentGatewayService = {
  /**
   * Indica si Wompi tiene llave pública real configurada desde `store_settings` o `.env`.
   */
  getWompiPublicKey(config = {}) {
    return (
      String(config?.wompiPublicKey || '').trim() ||
      String(import.meta.env.VITE_WOMPI_PUBLIC_KEY || '').trim() ||
      ''
    );
  },

  /**
   * Construye el enlace de checkout Wompi únicamente cuando hay llave pública configurada.
   */
  buildWompiCheckoutUrl({ config = {}, totalCOP, orderReference, customer }) {
    const publicKey = this.getWompiPublicKey(config);
    if (!publicKey) return null;

    const amountInCents = Math.round((Number(totalCOP) || 0) * 100);
    const wompiUrl = new URL('https://checkout.wompi.co/p/');
    wompiUrl.searchParams.set('public-key', publicKey);
    wompiUrl.searchParams.set('currency', 'COP');
    wompiUrl.searchParams.set('amount-in-cents', String(amountInCents));
    wompiUrl.searchParams.set('reference', orderReference);
    if (customer?.email) {
      wompiUrl.searchParams.set('customer-data:email', customer.email);
    }
    if (customer?.name) {
      wompiUrl.searchParams.set('customer-data:full-name', customer.name);
    }
    if (typeof window !== 'undefined') {
      wompiUrl.searchParams.set(
        'redirect-url',
        `${window.location.origin}/?payment=success&ref=${encodeURIComponent(orderReference)}`
      );
    }

    return wompiUrl.toString();
  },

  /**
   * Procesa el pago en línea automático (PayPal o Tarjeta débito/crédito)
   * y prepara el payload para registrar la orden en Supabase.
   */
  async initiateAutomaticPayment({
    channel, // 'paypal' | 'card' | 'wompi'
    orderReference,
    totalCOP,
    customer,
    cardLast4 = '',
    config = {},
  }) {
    const wompiUrl = this.buildWompiCheckoutUrl({
      config,
      totalCOP,
      orderReference,
      customer,
    });

    if (channel === 'paypal') {
      return {
        provider: 'paypal',
        methodLabel: 'PayPal — Pago en Línea',
        initialStatus: 'pagado',
        paymentLink: config?.paypalPaymentLink || null,
        paymentReference: config?.paypalBusinessEmail || orderReference,
        paymentPayload: {
          channel: 'paypal',
          paypalEmail: config?.paypalBusinessEmail || '',
          paymentLink: config?.paypalPaymentLink || '',
          amountCOP: totalCOP,
        },
      };
    }

    if (channel === 'wompi') {
      return {
        provider: 'wompi',
        methodLabel: 'Wompi — Nequi / PSE / Bancolombia / Tarjetas',
        initialStatus: wompiUrl || config?.wompiCheckoutUrl ? 'pagado' : 'pendiente_verificacion',
        paymentLink: wompiUrl || config?.wompiCheckoutUrl || null,
        paymentReference: orderReference,
        paymentPayload: {
          channel: 'wompi',
          wompiConfigured: Boolean(wompiUrl || config?.wompiCheckoutUrl),
          amountCOP: totalCOP,
        },
      };
    }

    // channel === 'card' (Tarjeta de débito o crédito; usa Wompi si está configurado)
    return {
      provider: wompiUrl ? 'wompi_card' : 'card_gateway',
      methodLabel: 'Tarjeta de Débito o Crédito',
      initialStatus: 'pagado',
      paymentLink: wompiUrl || config?.wompiCheckoutUrl || null,
      paymentReference: orderReference,
      paymentPayload: {
        channel: 'card',
        cardLast4: cardLast4 || null,
        wompiConfigured: Boolean(wompiUrl),
        amountCOP: totalCOP,
      },
    };
  },
};
