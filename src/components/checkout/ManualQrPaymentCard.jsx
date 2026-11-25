import React, { useState } from 'react';
import {
  Copy,
  Check,
  UploadCloud,
  Lock,
  ArrowLeft,
  RefreshCw,
  FileText,
  CheckCircle2,
  Landmark,
  Smartphone,
} from 'lucide-react';
import { formatCurrency } from '../../services/storeService';

const COLOMBIA_PLATFORMS = [
  {
    id: 'breb',
    label: 'Bre-B',
    fullName: 'Bre-B (Llave interoperable)',
    accountLabel: 'LLAVE BRE-B',
    bannerGradient: 'from-[#5B21B6] via-[#6D28D9] to-[#4C1D95]',
    badgeColor: 'bg-violet-600',
  },
  {
    id: 'nequi',
    label: 'Nequi',
    fullName: 'Nequi Colombia',
    accountLabel: 'NÚMERO NEQUI',
    bannerGradient: 'from-[#4C1D95] via-[#7C3AED] to-[#DB2777]',
    badgeColor: 'bg-fuchsia-600',
  },
  {
    id: 'daviplata',
    label: 'Daviplata',
    fullName: 'Daviplata',
    accountLabel: 'NÚMERO DAVIPLATA',
    bannerGradient: 'from-[#991B1B] via-[#DC2626] to-[#B91C1C]',
    badgeColor: 'bg-rose-600',
  },
  {
    id: 'bancolombia',
    label: 'Bancolombia',
    fullName: 'Bancolombia / Ahorro a la mano',
    accountLabel: 'CUENTA BANCOLOMBIA',
    bannerGradient: 'from-[#1E293B] via-[#0F172A] to-[#1D4ED8]',
    badgeColor: 'bg-amber-500',
  },
  {
    id: 'otros_bancos',
    label: 'Otros Bancos',
    fullName: 'Transferencia Bancaria / QR',
    accountLabel: 'CUENTA BANCARIA',
    bannerGradient: 'from-[#0F766E] via-[#0D9488] to-[#0369A1]',
    badgeColor: 'bg-teal-600',
  },
];

export const ManualQrPaymentCard = ({
  totalCOP,
  config = {},
  isProcessing,
  isUploadingProof,
  uploadedProof,
  proofError,
  onUploadProof,
  onClearProof,
  onConfirmManualOrder,
  onCancel,
}) => {
  const [selectedPlatformId, setSelectedPlatformId] = useState('breb');
  const [payerFullName, setPayerFullName] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [copied, setCopied] = useState(false);

  const platform =
    COLOMBIA_PLATFORMS.find((p) => p.id === selectedPlatformId) || COLOMBIA_PLATFORMS[0];

  const qrImageSrc = config?.qrPaymentImageUrl || '/zafra/logo.webp';
  const titular = config?.paymentTitular || 'JavrelStore';
  const llaveBreB = config?.wompiLlaveBreve || config?.paymentNequiPhone || '3122174851';
  const nequiPhone = config?.paymentNequiPhone || '3122174851';
  const bankAccount = config?.paymentBankAccount || 'Bancolombia Ahorros: 829-000123-45';

  const accountValue =
    selectedPlatformId === 'breb'
      ? llaveBreB
      : selectedPlatformId === 'nequi' || selectedPlatformId === 'daviplata'
        ? nequiPhone
        : bankAccount;

  const isReadyToSubmit = Boolean(payerFullName.trim()) && Boolean(uploadedProof?.url);

  const handleCopy = () => {
    navigator.clipboard?.writeText(accountValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isReadyToSubmit || isProcessing || isUploadingProof) return;
    onConfirmManualOrder({
      platformLabel: platform.fullName,
      payerFullName: payerFullName.trim(),
      operationNumber: operationNumber.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 animate-fadeIn">
      {/* Selector rápido de entidades Colombia */}
      <div className="flex flex-wrap gap-1.5">
        {COLOMBIA_PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedPlatformId(p.id)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              selectedPlatformId === p.id
                ? 'bg-[#5B21B6] text-white border-[#5B21B6] shadow-2xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tarjeta principal replicando Imagen 6 */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Banner superior de plataforma */}
        <div
          className={`px-4 py-3 bg-gradient-to-r ${platform.bannerGradient} text-white flex items-center gap-3`}
        >
          <div className="w-9 h-9 rounded-xl bg-white text-slate-900 flex items-center justify-center shadow-xs shrink-0">
            {selectedPlatformId === 'bancolombia' || selectedPlatformId === 'otros_bancos' ? (
              <Landmark className="w-5 h-5 text-[#5B21B6]" />
            ) : (
              <Smartphone className="w-5 h-5 text-[#5B21B6]" />
            )}
          </div>
          <h4 className="font-display font-extrabold text-sm leading-tight">
            Escanea y Paga con {platform.label}
          </h4>
        </div>

        {/* Total a pagar */}
        <div className="py-3 px-4 bg-[#F5F3FF] border-b border-slate-200/80 text-center">
          <span className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-500">
            TOTAL A PAGAR
          </span>
          <span className="font-display font-black text-2xl text-slate-900">
            {formatCurrency(totalCOP)}
          </span>
        </div>

        {/* Recuadro QR + Titular + Nota verde suave */}
        <div className="p-4 space-y-3.5">
          <div className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col items-center text-center space-y-2.5">
            <div className="p-2 rounded-2xl border-2 border-[#5B21B6]/70 bg-white shadow-xs">
              <img
                src={qrImageSrc}
                alt={`Código QR ${platform.label}`}
                className="w-40 h-40 object-contain rounded-xl"
                onError={(e) => {
                  e.currentTarget.src = '/zafra/logo.webp';
                }}
              />
            </div>

            <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
              {titular}
            </span>

            <div className="w-full p-2.5 rounded-xl bg-[#ECFDF5] border border-[#BBF7D0] text-[11px] text-[#166534] leading-snug">
              Escanea el código QR desde tu app bancaria o billetera digital para realizar el pago.
            </div>
          </div>

          {/* Tarjeta gris con número / llave + Copiar */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg ${platform.badgeColor} text-white flex items-center justify-center shrink-0`}
              >
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase text-slate-400">
                  {platform.accountLabel}
                </span>
                <span className="font-mono-code font-extrabold text-sm text-slate-900 truncate block">
                  {accountValue}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-violet-50 text-[#5B21B6] text-[11px] font-bold shrink-0 cursor-pointer"
              title="Copiar al portapapeles"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span className="text-[#16A34A]">¡Copiado!</span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Validar Transferencia */}
          <div className="pt-1 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 rounded-full bg-[#5B21B6]" />
              <h5 className="font-display font-extrabold text-xs text-slate-900">
                Validar Transferencia
              </h5>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ingresa Nombre y Apellido del titular que transfiere{' '}
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={payerFullName}
                onChange={(e) => setPayerFullName(e.target.value)}
                placeholder="Ej: Juan Pérez García"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none focus:border-[#5B21B6]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                N.° de aprobación / referencia{' '}
                <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                placeholder="Ej. 88421902"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono-code text-slate-900 outline-none focus:border-[#5B21B6]"
              />
            </div>

            {/* Zona punteada verde agua: Adjuntar Comprobante / Voucher */}
            <div className="rounded-2xl border-2 border-dashed border-[#6EE7B7] bg-[#E6F4F1] p-4 text-center">
              {isUploadingProof ? (
                <div className="flex flex-col items-center gap-1.5 py-2 text-xs text-teal-800">
                  <RefreshCw className="w-5 h-5 animate-spin text-teal-700" />
                  <span className="font-semibold">Subiendo comprobante a Supabase Storage...</span>
                </div>
              ) : uploadedProof ? (
                <div className="space-y-2">
                  {uploadedProof.isPdf ? (
                    <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-teal-200 text-xs text-slate-800">
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span className="font-semibold truncate max-w-[200px]">
                        {uploadedProof.fileName}
                      </span>
                    </div>
                  ) : (
                    <img
                      src={uploadedProof.url}
                      alt="Comprobante cargado"
                      className="max-h-28 mx-auto rounded-xl border border-teal-300 shadow-xs"
                    />
                  )}
                  <p className="text-[11px] font-bold text-teal-800 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Comprobante listo
                  </p>
                  <button
                    type="button"
                    onClick={onClearProof}
                    className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-1.5 cursor-pointer">
                  <UploadCloud className="w-6 h-6 text-[#0F766E]" />
                  <span className="text-xs font-bold text-[#0F766E]">
                    Adjuntar Comprobante / Voucher
                  </span>
                  <span className="text-[10px] text-teal-700/80">
                    Imagen JPG, PNG, WebP o PDF (máx. 10 MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadProof(file);
                    }}
                    className="sr-only"
                  />
                </label>
              )}
            </div>

            {proofError && (
              <p className="text-[11px] text-rose-600 font-semibold">{proofError}</p>
            )}

            {/* Botones inferiores replicando Imagen 6 */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={!isReadyToSubmit || isProcessing || isUploadingProof}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                  isReadyToSubmit
                    ? 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md shadow-emerald-600/20 cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ENVIANDO...</span>
                  </>
                ) : isReadyToSubmit ? (
                  <span>CONFIRMAR PAGO</span>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>COMPLETA LOS DATOS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Cancelar y elegir otra forma de pago</span>
      </button>
    </form>
  );
};
