// Vercel Serverless Function: Envío de Confirmación de Pedido al Cliente y al Administrador
// Compatible con Vercel Serverless (Node.js)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Utilice POST.' });
  }

  const { order, customerEmail, customerName, items, totalAmount, paymentMethod, referenceCode } =
    req.body || {};

  const ADMIN_EMAIL = 'jhonkavasquez@gmail.com';
  const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Mercado Tecnológico Super Wow <onboarding@resend.dev>';

  if (!resendApiKey) {
    return res.status(200).json({
      success: false,
      warning: 'RESEND_API_KEY no configurada aún en variables de entorno de Vercel.',
      simulated: true,
      referenceCode,
    });
  }

  const recipientList = [];
  if (customerEmail && customerEmail.includes('@')) {
    recipientList.push(customerEmail.trim());
  }
  // Añadir copia al administrador
  if (!recipientList.includes(ADMIN_EMAIL)) {
    recipientList.push(ADMIN_EMAIL);
  }

  const formattedTotal = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(totalAmount || 0);

  const itemsListHtml = (items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 12px 8px; font-size: 13px; color: #1E293B;">
          <strong>${item.name || 'Producto'}</strong>
          <span style="display: block; font-size: 11px; color: #64748B;">Cantidad: ${item.quantity || 1}</span>
        </td>
        <td style="padding: 12px 8px; text-align: right; font-size: 13px; font-weight: 700; color: #0A6CFF;">
          ${new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
          }).format((item.price || 0) * (item.quantity || 1))}
        </td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <title>Confirmación de Orden ${referenceCode || ''}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08);">
        
        <div style="background: linear-gradient(135deg, #0B1430 0%, #0A6CFF 100%); padding: 32px 24px; text-align: center; color: #FFFFFF;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">MERCADO TECNOLÓGICO SUPER WOW</h1>
          <p style="margin: 6px 0 0; font-size: 12px; color: #E2E8F0; text-transform: uppercase; letter-spacing: 1px;">Notificación Oficial de Pedido Registrado</p>
        </div>

        <div style="padding: 32px 28px;">
          <div style="background-color: #EFF6FF; border-left: 4px solid #0A6CFF; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #1E3A8A; font-weight: 600;">
              ¡Hola ${customerName || 'Estimado Cliente'}! Hemos recibido tu solicitud de pedido.
            </p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #3B82F6;">
              Código de Referencia: <strong>${referenceCode || 'N/A'}</strong>
            </p>
          </div>

          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748B; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
            Resumen de Productos
          </h3>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #F8FAFC; border-bottom: 1.5px solid #CBD5E1;">
                <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748B;">Ítem</th>
                <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #64748B;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 14px 8px; font-size: 15px; font-weight: 800; color: #0F172A;">Total Liquidado:</td>
                <td style="padding: 14px 8px; text-align: right; font-size: 18px; font-weight: 900; color: #0A6CFF;">
                  ${formattedTotal}
                </td>
              </tr>
            </tfoot>
          </table>

          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 18px; font-size: 12px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
            <div><strong>Método de Pago:</strong> ${paymentMethod || 'Código QR / Transferencia'}</div>
            <div><strong>Línea de Atención WhatsApp:</strong> +57 312 217 4851</div>
            <div><strong>Estado Actual:</strong> <span style="background-color: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 6px; font-weight: 700;">Pendiente de Verificación</span></div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="https://wa.me/573122174851?text=${encodeURIComponent(`Hola, confirmo mi pedido ${referenceCode || ''} por valor de ${formattedTotal}`)}" 
               style="background-color: #25D366; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 13px; font-weight: 700; display: inline-block;">
              💬 Notificar Despacho a Soporte WhatsApp (312 217 4851)
            </a>
          </div>
        </div>

        <div style="background-color: #F8FAFC; padding: 16px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8;">
          © ${new Date().getFullYear()} Mercado Tecnológico Super Wow • Colombia • Todos los derechos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipientList,
        subject: `🛍️ Pedido Registrado ${referenceCode} - Mercado Tecnológico Super Wow`,
        html: htmlContent,
      }),
    });

    const data = await resendResponse.json();
    return res.status(200).json({ success: resendResponse.ok, data });
  } catch (err) {
    console.error('Error enviando correo de orden:', err);
    return res.status(500).json({ error: 'Error al enviar notificación de correo.' });
  }
}
