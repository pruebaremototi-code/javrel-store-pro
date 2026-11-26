/**
 * api/paypal-capture.js — Vercel Serverless Function
 * Captura y valida un pago de PayPal en el servidor usando credenciales privadas.
 *
 * NUNCA exponer PAYPAL_CLIENT_SECRET al cliente (no usar prefijo VITE_).
 *
 * POST /api/paypal-capture
 * Body: { paypalOrderId, internalRef, expectedAmountUSD }
 * Respuesta exitosa: { success: true, transactionId, payerEmail }
 * Respuesta fallida:  { success: false, error: "..." }
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENV = (process.env.PAYPAL_ENV || 'sandbox').toLowerCase();

const PAYPAL_BASE_URL =
  PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

/**
 * Obtiene un Bearer token de PayPal usando credenciales de servidor.
 */
async function getPayPalAccessToken() {
  const credentials = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString(
    'base64'
  );

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth falló (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Captura la orden de PayPal en el servidor y devuelve el resultado.
 */
async function capturePayPalOrder(accessToken, paypalOrderId) {
  const res = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'PayPal-Request-Id': `JVR-CAPTURE-${paypalOrderId}`,
    },
    body: '{}',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal Capture falló (${res.status}): ${text}`);
  }

  return res.json();
}

export default async function handler(req, res) {
  // Solo aceptar POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido.' });
  }

  // Validar configuración del servidor
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    console.error('[PayPal Capture] PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET no configurados.');
    return res.status(500).json({
      success: false,
      error: 'El servidor no tiene las credenciales de PayPal configuradas. Contacta soporte.',
    });
  }

  const { paypalOrderId, internalRef, expectedAmountUSD } = req.body || {};

  // Validar parámetros requeridos
  if (!paypalOrderId || typeof paypalOrderId !== 'string') {
    return res.status(400).json({ success: false, error: 'paypalOrderId es requerido.' });
  }
  if (!internalRef || typeof internalRef !== 'string') {
    return res.status(400).json({ success: false, error: 'internalRef es requerido.' });
  }
  if (expectedAmountUSD == null || isNaN(Number(expectedAmountUSD)) || Number(expectedAmountUSD) <= 0) {
    return res.status(400).json({ success: false, error: 'expectedAmountUSD inválido.' });
  }

  const expectedUSD = Number(Number(expectedAmountUSD).toFixed(2));

  try {
    // 1. Obtener token de acceso
    const accessToken = await getPayPalAccessToken();

    // 2. Capturar la orden en PayPal
    const captureResult = await capturePayPalOrder(accessToken, paypalOrderId);

    // 3. Verificar estado COMPLETED
    if (captureResult.status !== 'COMPLETED') {
      console.warn(`[PayPal Capture] Estado inesperado: ${captureResult.status} para ${paypalOrderId}`);
      return res.status(400).json({
        success: false,
        error: `El pago no fue completado (estado: ${captureResult.status}). Intenta nuevamente o usa otro método.`,
      });
    }

    // 4. Extraer captura y verificar monto/moneda
    const capture =
      captureResult.purchase_units?.[0]?.payments?.captures?.[0];

    if (!capture) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró información de captura en la respuesta de PayPal.',
      });
    }

    const capturedAmount = Number(Number(capture.amount?.value).toFixed(2));
    const capturedCurrency = (capture.amount?.currency_code || '').toUpperCase();

    // Tolerancia de ±$0.01 USD para evitar rechazos por redondeo de tipo de cambio
    const amountDiff = Math.abs(capturedAmount - expectedUSD);

    if (capturedCurrency !== 'USD') {
      return res.status(400).json({
        success: false,
        error: `Moneda incorrecta: se esperaba USD, PayPal reportó ${capturedCurrency}.`,
      });
    }

    if (amountDiff > 0.01) {
      console.error(
        `[PayPal Capture] Discrepancia de monto: esperado $${expectedUSD} USD, capturado $${capturedAmount} USD — ref ${internalRef}`
      );
      return res.status(400).json({
        success: false,
        error: `Discrepancia en el monto capturado ($${capturedAmount} vs $${expectedUSD} USD). La orden no fue aprobada. Contacta soporte.`,
      });
    }

    // 5. Todo válido — devolver datos al frontend
    console.info(
      `[PayPal Capture] ✓ Pago verificado — ref ${internalRef}, transacción ${capture.id}, $${capturedAmount} USD`
    );

    return res.status(200).json({
      success: true,
      transactionId: capture.id,
      payerEmail: captureResult.payer?.email_address || '',
      capturedAmountUSD: capturedAmount,
      paypalStatus: captureResult.status,
    });
  } catch (err) {
    console.error('[PayPal Capture] Error inesperado:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Error al verificar el pago con PayPal. Intenta nuevamente o contacta soporte.',
    });
  }
}
