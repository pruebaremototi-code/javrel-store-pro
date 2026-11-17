// Vercel Serverless Function: Envío de Token OTP de Administrador
// Compatible con Vercel Serverless (Node.js) y ejecución local Vite

export default async function handler(req, res) {
  // Configuración de CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

  const { email, otpCode } = req.body || {};
  const AUTHORIZED_EMAIL = 'jhonkavasquez@gmail.com';

  if (!email || email.trim().toLowerCase() !== AUTHORIZED_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: 'Correo no autorizado para recepción de tokens administrativos.' });
  }

  if (!otpCode || otpCode.length !== 6) {
    return res.status(400).json({ error: 'Código OTP inválido.' });
  }

  const resendApiKey =
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    (typeof process !== 'undefined' && process.env?.RESEND_KEY);

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ||
    'JavrelStore Security <onboarding@resend.dev>';

  if (!resendApiKey) {
    console.error('[Resend Service] Error: RESEND_API_KEY no encontrada en variables de entorno.');
    return res.status(200).json({
      success: false,
      error: 'Variables de pasarela de correo no detectadas en el servidor.',
      expiresInMinutes: 5,
    });
  }

  try {
    const htmlTemplate = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Seguridad - JavrelStore</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #060B18; margin: 0; padding: 32px 16px; color: #F8FAFC;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; margin: 0 auto; background-color: #0B132B; border-radius: 24px; border: 1px solid #1E293B; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
          <!-- Header Corporativo -->
          <tr>
            <td style="background: linear-gradient(135deg, #091124 0%, #0A6CFF 100%); padding: 36px 28px; text-align: center; border-bottom: 1px solid #1E293B;">
              <div style="display: inline-block; width: 44px; height: 44px; background: rgba(255, 255, 255, 0.15); border-radius: 14px; line-height: 44px; margin-bottom: 12px; font-size: 20px;">
                🛡️
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #FFFFFF;">
                JavrelStore
              </h1>
              <p style="margin: 6px 0 0; font-size: 11px; color: #BAE6FD; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
                Seguridad Corporativa • Autenticación 2FA
              </p>
            </td>
          </tr>
          
          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 36px 32px; text-align: center;">
              <p style="font-size: 14px; color: #94A3B8; margin: 0 0 20px; line-height: 1.6;">
                Has solicitado acceso administrativo para la gestión de catálogo, inventario y órdenes en <strong style="color: #FFFFFF;">JavrelStore</strong>.
              </p>
              
              <!-- Tarjeta de Código OTP -->
              <div style="background-color: #060B18; border: 1.5px solid #0A6CFF; border-radius: 20px; padding: 24px; margin: 24px 0; display: inline-block; width: 85%; box-shadow: 0 0 25px rgba(10, 108, 255, 0.2);">
                <span style="font-size: 11px; text-transform: uppercase; color: #38BDF8; font-weight: 700; letter-spacing: 1.5px; display: block; margin-bottom: 8px;">
                  Tu Código de Autorización
                </span>
                <span style="font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #FFFFFF; font-family: 'Courier New', Courier, monospace; display: block;">
                  ${otpCode}
                </span>
              </div>
              
              <p style="font-size: 12px; color: #F59E0B; font-weight: 600; margin: 16px 0 0; display: flex; align-items: center; justify-content: center; gap: 4px;">
                ⏱️ Este código es de un solo uso y expira en 5 minutos.
              </p>
              
              <!-- Avisos de Seguridad -->
              <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B; line-height: 1.6; text-align: left;">
                <p style="margin: 0;">• Destinatario exclusivo: <strong style="color: #94A3B8;">${AUTHORIZED_EMAIL}</strong>.</p>
                <p style="margin: 4px 0 0;">• Si no solicitaste este código, ignora este mensaje y cambia tu clave inmediatamente.</p>
                <p style="margin: 4px 0 0;">• El equipo de JavrelStore nunca te solicitará este código por llamada o mensaje.</p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #060B18; padding: 18px; text-align: center; border-top: 1px solid #1E293B; font-size: 11px; color: #64748B;">
              © ${new Date().getFullYear()} JavrelStore • Todos los derechos reservados.
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [AUTHORIZED_EMAIL],
        subject: `🔐 Tu Código de Seguridad: ${otpCode} - JavrelStore`,
        html: htmlTemplate,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('[Resend Error]', data);
      return res.status(200).json({
        success: false,
        error: `Error de la API de Resend: ${data.message || 'Fallo de entrega'}`,
        expiresInMinutes: 5,
      });
    }

    console.log('[Resend Success] Correo enviado exitosamente con ID:', data.id);
    return res.status(200).json({
      success: true,
      message: 'Token OTP enviado exitosamente a tu correo.',
      emailId: data.id,
      expiresInMinutes: 5,
    });
  } catch (error) {
    console.error('[Serverless send-otp Error]:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno conectando con el servicio de correo transaccional.',
    });
  }
}
