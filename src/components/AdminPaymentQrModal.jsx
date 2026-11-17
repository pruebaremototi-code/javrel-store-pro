// AdminPaymentQrModal.jsx — JavrelStore Enterprise
// Modal interactivo de visualización de códigos QR para cuentas bancarias y pasarelas
// Diseñado con controles interactivos de Zoom (Zoom 1x, HD), pantalla completa y copiado rápido.

import React, { useState } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  QrCode,
  ExternalLink,
} from 'lucide-react';

export const AdminPaymentQrModal = ({
  isOpen,
  onClose,
  accountData = {
    title: 'Nequi · QR Oficial',
    subtitle: 'Nequi Colombia',
    entity: 'Nequi',
    holder: 'Jhon Vasquez',
    phone: '3122174851',
    keyBreB: 'jhonkavasquez@gmail.com',
    qrImage: '/zafra/p/k1763147593434.webp',
  },
}) => {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = normal, 1.5 = HD zoom
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  if (!isOpen) return null;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const isNequi = accountData.entity?.toLowerCase().includes('nequi');
  const isBreB = accountData.entity?.toLowerCase().includes('bre');
  const isDaviplata = accountData.entity?.toLowerCase().includes('davi');

  const themeGradient = isNequi || isBreB
    ? 'from-[#0A735E] via-[#059669] to-[#047857]'
    : isDaviplata
      ? 'from-[#DC2626] to-[#991B1B]'
      : 'from-[#1E1B4B] via-[#312E81] to-[#0A6CFF]';

  const qrSrc =
    accountData.qrImage ||
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
      `https://javrelstore.vercel.app/pay?holder=${encodeURIComponent(accountData.holder)}&key=${encodeURIComponent(
        accountData.keyBreB || accountData.phone
      )}`
    )}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div
        className={`relative w-full ${
          isFullscreen ? 'max-w-4xl h-[95vh]' : 'max-w-lg'
        } bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp transition-all duration-300`}
      >
        {/* Encabezado con Paleta Corporativa */}
        <div className={`p-4 sm:p-5 bg-gradient-to-r ${themeGradient} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-display font-extrabold text-sm sm:text-base leading-tight">
                  {accountData.title || 'Nequi · QR Oficial'}
                </h3>
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
              </div>
              <p className="text-[11px] text-emerald-100/90 mt-0.5">
                {accountData.subtitle || 'Nequi Colombia'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title={isFullscreen ? 'Reducir tamaño' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cuerpo con Marco de QR y Controles de Zoom */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="relative rounded-3xl border-2 border-emerald-400/80 bg-white p-5 sm:p-6 flex flex-col items-center shadow-sm">
            {/* Control Interactivo de Zoom */}
            <div className="absolute top-3.5 right-3.5 z-10">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (prev === 1 ? 1.4 : 1))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white text-[11px] font-bold shadow-md transition-all cursor-pointer"
              >
                {zoomLevel === 1 ? <ZoomIn className="w-3.5 h-3.5 text-amber-300" /> : <ZoomOut className="w-3.5 h-3.5 text-amber-300" />}
                <span>{zoomLevel === 1 ? 'Zoom 1x' : 'Zoom HD'}</span>
              </button>
            </div>

            {/* Logo de la Entidad */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="font-display font-black text-sm tracking-tight text-[#0A735E]">
                Bre-B
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-display font-black text-sm tracking-tight text-fuchsia-700">
                {accountData.entity || 'Nequi'}
              </span>
            </div>

            {/* Contenedor del QR con Zoom Suave */}
            <div className="overflow-hidden p-2 rounded-2xl bg-white flex items-center justify-center">
              <img
                src={qrSrc}
                alt="Código QR"
                style={{ transform: `scale(${zoomLevel})` }}
                className="w-44 h-44 sm:w-52 sm:h-52 object-contain transition-transform duration-300 drop-shadow-sm"
              />
            </div>

            {/* Subtítulo bajo el QR */}
            <div className="text-center mt-3">
              <div className="font-display font-bold text-xs sm:text-sm text-slate-800">
                {accountData.holder || 'Jhon Vasquez'}
              </div>
              <div className="text-[11px] text-slate-500 font-mono-code mt-0.5">
                Llave • {accountData.keyBreB || 'jhonkavasquez@gmail.com'}
              </div>
            </div>

            {/* Badge Inferior Activo */}
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-mono-code font-bold uppercase shadow-xs">
                <span>⚡</span> Modo Zoom HD Activo
              </span>
            </div>
          </div>

          {/* Enlace Pantalla Cliente */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver en pantalla completa (Pantalla Cliente)</span>
            </button>
          </div>

          {/* Tarjeta de Datos y Botones de Copiado */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">Titular del Comercio:</span>
              <span className="font-bold text-slate-900">{accountData.holder || 'Jhon Vasquez'}</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs pb-2 border-b border-slate-200/80">
              <div>
                <span className="block text-[10px] text-slate-400 font-medium uppercase">
                  Número de Cuenta / Celular:
                </span>
                <span className="font-mono-code font-bold text-slate-900 text-sm">
                  {accountData.phone || '3122174851'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(accountData.phone || '3122174851', 'phone')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedField === 'phone' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] text-slate-400 font-medium uppercase">
                  Llave Bre-B (Interoperable):
                </span>
                <span className="font-mono-code font-bold text-slate-900 text-xs truncate block">
                  {accountData.keyBreB || 'jhonkavasquez@gmail.com'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(accountData.keyBreB || 'jhonkavasquez@gmail.com', 'key')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs flex-shrink-0"
              >
                {copiedField === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedField === 'key' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pie con Botón Cerrar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
