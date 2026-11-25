// WompiCheckoutButton.jsx — JavrelStore
// Componente desacoplado para Wompi (Nequi, PSE, Bancolombia, Tarjetas).
// Lee las credenciales exclusivamente desde `store_settings` o `VITE_WOMPI_PUBLIC_KEY`.

import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Clock,
} from 'lucide-react';
import { paymentGatewayService } from '../services/paymentGatewayService';
import { orderService } from '../services/orderService';

export const WompiCheckoutButton = ({
  totalCOP,
  orderReference,
  customerEmail,
  customerName,
  config = {},
  onConfirmWompiOrder,
}) => {
  const [activeTab, setActiveTab] = useState('wompi_button');
  const [copiedRef, setCopiedRef] = useState(false);

  const reference = useMemo(
    () => orderReference || orderService.generateReference(),
    [orderReference]
  );

  const checkoutLink = useMemo(
    () =>
      paymentGatewayService.buildWompiCheckoutUrl({
        config,
        totalCOP,
        orderReference: reference,
        customer: { email: customerEmail, name: customerName },
      }),
    [config, totalCOP, reference, customerEmail, customerName]
  );

  const isConfigured = Boolean(checkoutLink || config?.wompiCheckoutUrl);
  const resolvedLink = checkoutLink || config?.wompiCheckoutUrl || '';

  const qrImageUrl = resolvedLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(
        resolvedLink
      )}`
    : '';

  const handleCopyRef = () => {
    navigator.clipboard?.writeText(reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const paymentChannels = [
    { name: 'Nequi', icon: Smartphone, color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
    { name: 'PSE', icon: Building2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { name: 'Tarjetas', icon: CreditCard, color: 'text-violet-600 bg-violet-50 border-violet-200' },
    { name: 'Bancolombia', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  ];

  return (
    <div className="rounded-2xl border border-violet-200/90 bg-gradient-to-b from-violet-50/40 via-white to-white p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xs sm:text-sm text-slate-900">
                Wompi · Bancolombia
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  isConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isConfigured ? 'Activo' : 'Listo para llaves'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Nequi, PSE, Bancolombia y Tarjetas
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="block text-[10px] font-mono-code text-slate-400 uppercase">Monto</span>
          <span className="font-display font-black text-sm text-violet-700">
            ${Number(totalCOP || 0).toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {paymentChannels.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.name}
              className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center ${c.color}`}
            >
              <Icon className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[9px] font-bold leading-none">{c.name}</span>
            </div>
          );
        })}
      </div>

      {isConfigured ? (
        <>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('wompi_button')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'wompi_button'
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Botón de Pago</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wompi_qr')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'wompi_qr'
                  ? 'bg-white text-violet-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Dinámico</span>
            </button>
          </div>

          {activeTab === 'wompi_button' ? (
            <button
              type="button"
              onClick={() => onConfirmWompiOrder?.(resolvedLink)}
              className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-violet-500/25 active:scale-98 transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pagar ${Number(totalCOP || 0).toLocaleString('es-CO')} con Wompi</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>
          ) : (
            <div className="flex flex-col items-center text-center space-y-2 p-2.5 bg-white rounded-xl border border-violet-100">
              <img
                src={qrImageUrl}
                alt="Código QR de Pago Wompi"
                className="w-40 h-40 object-contain rounded-xl border border-violet-200 p-1"
                loading="lazy"
              />
              <button
                type="button"
                onClick={() => onConfirmWompiOrder?.(resolvedLink)}
                className="text-[11px] font-bold text-violet-700 hover:text-violet-900 underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Registrar orden y abrir pasarela</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Pasarela Wompi preparada. Configura tu <strong>Public Key</strong> en el panel administrativo para habilitar el cobro directo Nequi/PSE/Tarjetas, o usa <strong>PayPal / Tarjeta</strong> o <strong>Transferencia QR</strong>.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
        <div className="flex items-center gap-1 truncate">
          <span className="font-bold text-slate-400">Ref:</span>
          <span className="font-mono-code font-bold text-slate-800 truncate">{reference}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyRef}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 font-bold text-violet-700 hover:bg-violet-50 flex-shrink-0 cursor-pointer"
        >
          {copiedRef ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          {copiedRef ? 'Copiada' : 'Copiar'}
        </button>
      </div>
    </div>
  );
};
