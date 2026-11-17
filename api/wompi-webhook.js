// api/wompi-webhook.js — JavrelStore
// Recibe notificaciones de transacciones aprobadas/rechazadas enviadas por Wompi.
//
// Configurar en el dashboard de Wompi:
//   Webhook URL → https://<tu-dominio>/api/wompi-webhook
//
// Variables de entorno opcionales:
//   SUPABASE_URL             — URL de tu proyecto Supabase
//   SUPABASE_SERVICE_ROLE_KEY — Clave de servicio para actualizar órdenes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const event = req.body;

    if (!event || !event.event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    console.log(
      '[Wompi Webhook] Event received:',
      event.event,
      '| Reference:',
      event.data?.transaction?.reference
    );

    // transaction.updated — evento principal que envía Wompi
    if (event.event === 'transaction.updated') {
      const tx = event.data?.transaction;
      if (!tx) return res.status(200).json({ received: true });

      const reference = tx.reference;              // e.g. "JVR-1234567890-5678"
      const status = tx.status;                    // APPROVED | DECLINED | VOIDED | ERROR
      const amountInCents = tx.amount_in_cents;
      const paymentMethod = tx.payment_method_type; // NEQUI | PSE | CARD | BANCOLOMBIA_TRANSFER

      console.log(
        `[Wompi] Transaction ${reference}: ${status}` +
          ` via ${paymentMethod} — ${amountInCents / 100} COP`
      );

      // Mapear estado Wompi → estado interno JavrelStore
      const internalStatus =
        status === 'APPROVED'
          ? 'Aprobado'
          : status === 'DECLINED' || status === 'VOIDED'
            ? 'Rechazado'
            : 'Pendiente';

      // Actualizar orden en Supabase si las credenciales están disponibles
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (supabaseUrl && supabaseKey && reference) {
        try {
          const updateRes = await fetch(
            `${supabaseUrl}/rest/v1/orders?reference_code=eq.${encodeURIComponent(reference)}`,
            {
              method: 'PATCH',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                payment_status: internalStatus,
                payment_provider: 'wompi',
                payment_method:
                  `Wompi — ${paymentMethod ?? 'Online'}`,
                updated_at: new Date().toISOString(),
              }),
            }
          );

          if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error(
              '[Wompi Webhook] Supabase update failed:',
              updateRes.status,
              errText
            );
          } else {
            console.log(
              `[Wompi Webhook] Order ${reference} updated → ${internalStatus}`
            );
          }
        } catch (dbErr) {
          console.error('[Wompi Webhook] DB error:', dbErr.message);
        }
      } else if (!supabaseUrl || !supabaseKey) {
        console.warn(
          '[Wompi Webhook] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping DB update.'
        );
      }
    }

    // Siempre responder 200 a Wompi para evitar reintentos
    return res.status(200).json({
      received: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Wompi Webhook Error]:', err.message);
    // 200 siempre para que Wompi no reintente
    return res
      .status(200)
      .json({ received: true, error: err.message });
  }
}
