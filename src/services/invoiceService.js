import { orderService } from './orderService';
import { emailService } from './emailService';
import { formatCurrency } from './storeService';

export const invoiceService = {
  // Generar HTML y estructura de Factura Electrónica Corporativa JavrelStore
  generateInvoiceHtml({ order, invoiceNumber, issueDate, companyInfo }) {
    const items = Array.isArray(order.items_json) ? order.items_json : [];
    const subtotal = items.reduce((acc, it) => acc + (Number(it.price) * Number(it.quantity || 1)), 0);
    const total = Number(order.total_amount || subtotal);

    const itemsHtml = items.map((it, idx) => `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 10px 8px; font-size: 12px; color: #1E293B;">${idx + 1}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #1E293B; font-weight: 600;">
          ${it.name || 'Producto'}
          <span style="display: block; font-size: 10px; color: #64748B; font-weight: normal;">Ref: ${it.id || 'N/A'} • ${it.brand || 'JavrelStore'}</span>
        </td>
        <td style="padding: 10px 8px; font-size: 12px; color: #1E293B; text-align: center;">${it.quantity || 1}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #1E293B; text-align: right;">$${formatCurrency(it.price)}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #0A6CFF; font-weight: 700; text-align: right;">$${formatCurrency((it.price || 0) * (it.quantity || 1))}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Factura Electrónica ${invoiceNumber} - JavrelStore</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #0F172A; }
          .invoice-box { max-width: 720px; margin: auto; padding: 32px; border: 1px solid #CBD5E1; border-radius: 20px; background: #FFFFFF; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0A6CFF; padding-bottom: 20px; margin-bottom: 24px; }
          .brand { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #0F172A; }
          .brand span { color: #0A6CFF; }
          .badge { display: inline-block; padding: 4px 10px; background: #EFF6FF; color: #0A6CFF; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase; border: 1px solid #BFDBFE; margin-top: 4px; }
          .invoice-details { text-align: right; }
          .invoice-num { font-size: 18px; font-weight: 800; color: #0A6CFF; font-family: monospace; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; font-size: 12px; }
          .card-info { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; }
          .card-title { font-weight: 700; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #0A6CFF; color: #FFFFFF; font-size: 11px; text-transform: uppercase; font-weight: 700; padding: 10px 8px; }
          .total-box { margin-left: auto; width: 260px; font-size: 13px; margin-bottom: 28px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; color: #475569; }
          .total-row.grand { border-top: 2px solid #0A6CFF; color: #0F172A; font-size: 16px; font-weight: 900; padding-top: 10px; }
          .footer { text-align: center; border-top: 1px dashed #CBD5E1; padding-top: 20px; font-size: 11px; color: #64748B; }
          @media print {
            body { padding: 0; background: #FFFFFF; }
            .invoice-box { border: none; box-shadow: none; padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="no-print" style="margin-bottom: 18px; text-align: right;">
            <button onclick="window.print()" style="background: #0A6CFF; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">
              🖨️ Imprimir / Guardar en PDF
            </button>
          </div>

          <div class="header">
            <div>
              <div class="brand">Javrel<span>Store</span></div>
              <span class="badge">Facturación Electrónica DIAN</span>
              <p style="font-size: 11px; color: #64748B; margin: 6px 0 0;">
                NIT: 901.482.910-4 • Régimen Simple<br>
                Tel / WhatsApp: +57 ${companyInfo?.whatsappNumber || '3122174851'}<br>
                Medellín - Colombia • Despacho Nacional
              </p>
            </div>
            <div class="invoice-details">
              <div class="card-title">Comprobante Fiscal</div>
              <div class="invoice-num">${invoiceNumber}</div>
              <p style="font-size: 11px; color: #64748B; margin: 4px 0 0;">
                Fecha: ${issueDate}<br>
                Ref. Pedido: <strong>${order.reference_code}</strong><br>
                Estado: <span style="color: #10B981; font-weight: 700;">${order.payment_status || 'Aprobado'}</span>
              </p>
            </div>
          </div>

          <div class="grid">
            <div class="card-info">
              <div class="card-title">Adquiriente / Cliente</div>
              <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0F172A;">${order.customer_name || 'Consumidor Final'}</p>
              <p style="margin: 4px 0 0; color: #475569;">
                Email: ${order.customer_email || 'cliente@javrelstore.com'}<br>
                Teléfono: ${order.customer_phone || 'N/A'}<br>
                Detalle: ${order.notes || 'Envío estándar asegurado'}
              </p>
            </div>

            <div class="card-info">
              <div class="card-title">Información de Pago</div>
              <p style="margin: 0; font-weight: 700; color: #0F172A;">${order.payment_method || 'Transferencia Electrónica / QR'}</p>
              <p style="margin: 4px 0 0; color: #475569;">
                Garantía: 12 Meses directa oficial<br>
                Soporte: javrelstore.soporte@gmail.com<br>
                Validez: Documento equivalente digital
              </p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th style="text-align: left;">Descripción del Artículo</th>
                <th style="width: 60px; text-align: center;">Cant.</th>
                <th style="width: 100px; text-align: right;">Unitario</th>
                <th style="width: 110px; text-align: right;">Total COP</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>$${formatCurrency(subtotal)}</span>
            </div>
            <div class="total-row">
              <span>Envío Nacional:</span>
              <span style="color: #10B981; font-weight: 700;">GRATIS</span>
            </div>
            <div class="total-row">
              <span>IVA Incluido (19%):</span>
              <span>$${formatCurrency(Math.round(total * 0.19 / 1.19))}</span>
            </div>
            <div class="total-row grand">
              <span>Total Pagado:</span>
              <span style="color: #0A6CFF;">$${formatCurrency(total)} COP</span>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px; font-weight: 600; color: #334155;">
              ¡Gracias por elegir a JavrelStore! Innovación, rendimiento y garantía asegurada.
            </p>
            <p style="margin: 0;">
              Documento tributario emitido electrónicamente de conformidad con el estatuto tributario colombiano. Para dudas o seguimiento escribe a nuestra línea oficial de atención.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  },

  // Disparar envío de factura electrónica al correo del cliente
  async sendInvoiceEmail({ order, config }) {
    if (!order) return { success: false, error: 'No se suministró orden válida.' };

    const invoiceNumber = `FE-JAV-${order.reference_code?.replace('SWOW-', '') || Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const invoiceHtml = this.generateInvoiceHtml({
      order,
      invoiceNumber,
      issueDate,
      companyInfo: config,
    });

    // Enviar a través de la API Serverless o cliente directo Resend
    try {
      const targetEmail = order.customer_email?.trim() || 'jhonkavasquez@gmail.com';
      const clientResendKey = import.meta.env?.VITE_RESEND_API_KEY || (typeof process !== 'undefined' && process.env?.RESEND_API_KEY);

      if (clientResendKey && clientResendKey.startsWith('re_')) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientResendKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'JavrelStore Facturación <onboarding@resend.dev>',
            to: [targetEmail],
            subject: `📄 Factura Electrónica ${invoiceNumber} - JavrelStore (${order.reference_code})`,
            html: invoiceHtml,
          }),
        });

        if (res.ok) {
          return { success: true, invoiceNumber, sentTo: targetEmail };
        }
      }
    } catch (err) {
      console.warn('[invoiceService] Error enviando correo de factura:', err);
    }

    return {
      success: true,
      invoiceNumber,
      htmlContent: invoiceHtml,
      fallbackView: true,
      sentTo: order.customer_email || 'jhonkavasquez@gmail.com',
    };
  },

  // Abrir ventana emergente lista para imprimir o guardar como PDF nativo
  printInvoice(order, config) {
    const invoiceNumber = `FE-JAV-${order.reference_code?.replace('SWOW-', '') || Math.floor(100000 + Math.random() * 900000)}`;
    const issueDate = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = this.generateInvoiceHtml({
      order,
      invoiceNumber,
      issueDate,
      companyInfo: config,
    });

    const printWin = window.open('', '_blank', 'width=850,height=900');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
      printWin.focus();
    }
  },
};
