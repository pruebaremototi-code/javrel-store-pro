import React from 'react';
import {
  BadgeCheck,
  Clock,
  CheckCircle2,
  MessageCircle,
  MapPin,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency, buildWhatsAppUrl } from '../../services/storeService';

export const StepOrderConfirmation = ({
  orderCreatedData,
  corporateWhatsapp,
  onFinish,
}) => {
  if (!orderCreatedData?.order) return null;

  const {
    order,
    methodLabel,
    items,
    subtotal,
    shippingCost,
    discountAmount,
    couponCode,
    total,
    paymentLink,
    whatsappMessage,
  } = orderCreatedData;

  const isPaid = order.payment_status === 'pagado' || order.payment_status === 'Aprobado';

  return (
    <div className="p-5 sm:p-6 flex-1 flex flex-col items-center text-center bg-[#F5F4F8] space-y-4 animate-fadeIn">
      <div
        className={`w-16 h-16 rounded-3xl flex items-center justify-center border shadow-sm ${
          isPaid
            ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
            : 'bg-amber-50 text-amber-600 border-amber-200'
        }`}
      >
        {isPaid ? <BadgeCheck className="w-9 h-9" /> : <Clock className="w-9 h-9" />}
      </div>

      <div className="space-y-1">
        <span
          className={`inline-block text-[10px] font-mono-code font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
            isPaid
              ? 'text-emerald-800 bg-emerald-100/90 border-emerald-300'
              : 'text-amber-800 bg-amber-100/90 border-amber-300'
          }`}
        >
          {isPaid ? 'PAGO CONFIRMADO (PAGADO)' : 'PENDIENTE DE VERIFICACIÓN'}
        </span>

        <h3 className="font-display font-bold text-xl text-slate-900 pt-1">
          ¡Pedido Registrado en JavrelStore!
        </h3>
        <p className="text-xs text-slate-600 max-w-md">
          {isPaid
            ? 'Tu pago en línea fue aprobado. Nuestro equipo preparará tu envío de inmediato.'
            : 'Recibimos tu comprobante. Validaremos la transferencia para despachar tu pedido.'}
        </p>
      </div>

      {/* Ficha detallada de la orden */}
      <div className="w-full p-4 rounded-2xl bg-white border border-slate-200 text-xs text-left space-y-2.5 shadow-2xs">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <span className="text-slate-500 font-medium">N.° de Orden:</span>
          <span className="font-mono-code font-bold text-sm text-[#5B21B6] bg-violet-50 px-2.5 py-0.5 rounded-lg border border-violet-200">
            {order.reference_code}
          </span>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Cliente:</span>
          <span className="font-semibold text-slate-900 text-right">{order.customer_name}</span>
        </div>

        {order.customer_document && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Documento:</span>
            <span className="font-mono-code font-semibold text-slate-800">
              {order.customer_document}
            </span>
          </div>
        )}

        <div className="flex justify-between gap-2">
          <span className="text-slate-500 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> Entrega:
          </span>
          <span className="font-semibold text-slate-800 text-right">
            {[order.customer_address, order.customer_city, order.customer_department]
              .filter(Boolean)
              .join(', ')}
          </span>
        </div>

        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Método:</span>
          <span className="font-semibold text-slate-900 text-right">{methodLabel}</span>
        </div>

        {order.payment_reference && isPaid && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">ID Transacción:</span>
            <span className="font-mono-code font-bold text-slate-900">
              {order.payment_reference}
            </span>
          </div>
        )}

        {order.payment_operation_number && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">N.° Operación:</span>
            <span className="font-mono-code font-bold text-slate-900">
              {order.payment_operation_number}
            </span>
          </div>
        )}

        {order.payment_proof_url && (
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Comprobante:</span>
            <a
              href={order.payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#16A34A] font-semibold inline-flex items-center gap-1 hover:underline"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Ver soporte adjunto
            </a>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <span className="text-[10px] font-mono-code font-bold uppercase text-slate-400 block">
            Resumen de productos
          </span>
          {(items || []).map((item) => (
            <div key={item.id} className="flex justify-between text-[11px] text-slate-700">
              <span className="truncate pr-2">
                {item.quantity}x {item.name}
              </span>
              <span className="font-semibold shrink-0">
                {formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 0))}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Envío</span>
            <span>{shippingCost === 0 ? 'GRATIS' : formatCurrency(shippingCost)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-[#16A34A] font-semibold">
              <span className="inline-flex items-center gap-1">
                <Tag className="w-3 h-3" /> Cupón {couponCode}
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 border-t border-slate-100 text-sm font-bold text-slate-900">
            <span>Total</span>
            <span className="font-display text-[#5B21B6]">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="w-full space-y-2.5">
        {paymentLink && (
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#5B21B6] hover:bg-[#4C1D95] transition-colors"
          >
            <span>Abrir enlace de pasarela</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <a
          href={buildWhatsAppUrl(corporateWhatsapp, whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#25D366] hover:bg-[#20BD5A] shadow-sm transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Enviar N.° de orden por WhatsApp (opcional)</span>
        </a>

        <button
          type="button"
          onClick={onFinish}
          className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Continuar navegando en la tienda
        </button>
      </div>
    </div>
  );
};
