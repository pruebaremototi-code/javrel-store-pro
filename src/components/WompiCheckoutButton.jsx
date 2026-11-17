// WompiCheckoutButton.jsx — JavrelStore
// Pasarela de Pagos Oficial con Wompi (Bancolombia)
//   • Botón de Pago Seguro Oficial Wompi (Nequi, PSE, Tarjetas, Efectivo)
//   • Módulo de Pago con Código QR Dinámico
//   • Validación de Medios de Pago y Sincronización

import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Package,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Zap,
} from 'lucide-react';

const WOMPI_PUBLIC_KEY =
  import.meta.env.VITE_WOMPI_PUBLIC_KEY || 'pub_test_KHMUy1JrF1GWIuTyRxvRhHp9Q7M4a3tF';

/**
 * @param {object}   props
 * @param {number}   props.totalCOP          - Total del pedido en pesos colombianos
 * @param {string}  [props.orderReference]   - Referencia única de la orden
 * @param {string}  [props.customerEmail]    - Correo del comprador
 * @param {string}  [props.customerName]     - Nombre del comprador
 * @param {function} [props.onCashOnDelivery] - Callback si el usuario elige Contra Entrega
 */
export const WompiCheckoutButton = ({
  totalCOP,
  orderReference,
  customerEmail,
  customerName,
  onCashOnDelivery,
}) => {
  const [activeTab, setActiveTab] = useState('wompi_button'); // 'wompi_button' | 'wompi_qr'
  const [copiedRef, setCopiedRef] = useState(false);

  const amountInCents = Math.round((Number(totalCOP) || 0) * 100);
  const reference =
    orderReference ||
    `JVR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // URL del Checkout Oficial de Wompi
  const wompiUrl = new URL('https://checkout.wompi.co/p/');
  wompiUrl.searchParams.set('public-key', WOMPI_PUBLIC_KEY);
  wompiUrl.searchParams.set('currency', 'COP');
  wompiUrl.searchParams.set('amount-in-cents', String(amountInCents));
  wompiUrl.searchParams.set('reference', reference);
  if (customerEmail) {
    wompiUrl.searchParams.set('customer-data:email', customerEmail);
  }
  if (customerName) {
    wompiUrl.searchParams.set('customer-data:full-name', customerName);
  }
  wompiUrl.searchParams.set(
    'redirect-url',
    typeof window !== 'undefined'
      ? `${window.location.origin}/?payment=success&ref=${encodeURIComponent(reference)}`
      : 'https://javrelstore.vercel.app/?payment=success'
  );

  const checkoutLink = wompiUrl.toString();

  // QR dinámico que abre directamente la transacción de Wompi al escanear con la cámara o app
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(
    checkoutLink
  )}`;

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
    <div className="rounded-2xl border border-violet-200/90 bg-gradient-to-b from-violet-50/40 via-white to-white p-4 space-y-3.5 shadow-xs">
      {/* Cabecera con validación de pasarela */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-pink-500 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold text-xs sm:text-sm text-slate-900">
                Wompi · Bancolombia
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                Oficial
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              Transacción 100% segura con cifrado bancario
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="block text-[10px] font-mono-code text-slate-400 uppercase">Monto</span>
          <span className="font-display font-black text-sm sm:text-base text-violet-700">
            ${Number(totalCOP || 0).toLocaleString('es-CO')}
          </span>
        </div>
      </div>

      {/* Píldoras de canales de pago disponibles */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
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

      {/* Selector de modo: Botón de Pago vs QR Dinámico */}
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

      {/* MODO A: Botón de Pago Wompi */}
      {activeTab === 'wompi_button' && (
        <div className="space-y-2.5 animate-fadeIn">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Paga en segundos con tu cuenta <strong className="text-slate-900">Nequi</strong>, débito bancario <strong className="text-slate-900">PSE</strong> o con cualquier <strong className="text-slate-900">tarjeta de crédito/débito</strong> a través de la pasarela oficial de Bancolombia.
          </p>

          <a
            href={checkoutLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-violet-500/25 active:scale-98 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pagar ${Number(totalCOP || 0).toLocaleString('es-CO')} en Wompi</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      )}

      {/* MODO B: Código QR Dinámico */}
      {activeTab === 'wompi_qr' && (
        <div className="flex flex-col items-center text-center space-y-2.5 p-2 bg-white rounded-xl border border-violet-100 animate-fadeIn">
          <span className="text-[11px] font-bold text-slate-800">
            Escanea con tu celular para pagar automáticamente
          </span>

          <div className="relative p-2 bg-white rounded-2xl border-2 border-violet-300 shadow-md">
            <img
              src={qrImageUrl}
              alt="Código QR de Pago Wompi"
              className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-1 flex justify-center">
              <span className="px-2 py-0.5 rounded-full bg-slate-900/85 text-white text-[8px] font-mono-code font-bold">
                ${Number(totalCOP || 0).toLocaleString('es-CO')} COP
              </span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 max-w-xs leading-snug">
            Abre la cámara o tu app de Nequi / Bancolombia, apunta al código y completa el pago en pantalla segura.
          </p>

          <a
            href={checkoutLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-violet-700 hover:text-violet-900 underline flex items-center gap-1"
          >
            <span>O abrir pasarela en esta pestaña</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Referencia única y validación */}
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

      {onCashOnDelivery && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onCashOnDelivery}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span>O pagar Contra Entrega al recibir</span>
          </button>
        </div>
      )}
    </div>
  );
};
