import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  ShieldCheck,
  Lock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Landmark,
} from 'lucide-react';
import { formatCurrency } from '../../services/storeService';
import { PayPalInlineSection } from './PayPalInlineSection';
import { ManualQrPaymentCard } from './ManualQrPaymentCard';
import { WompiCheckoutButton } from '../WompiCheckoutButton';

export const StepPaymentMethod = ({
  subtotal,
  shippingCost,
  isFreeShipping,
  discountAmount,
  total,
  appliedCoupon,
  config,
  customer,
  orderReference,
  isProcessing,
  isUploadingProof,
  uploadedProof,
  proofError,
  onUploadProof,
  onClearProof,
  onPayPalApproved,
  onConfirmManualQr,
  onConfirmWompi,
  onBack,
}) => {
  const [selectedMethod, setSelectedMethod] = useState('paypal'); // 'paypal' | 'manual_qr' | 'wompi'
  const [activeSubView, setActiveSubView] = useState(null); // null | 'paypal' | 'manual_qr' | 'wompi'
  const [showOtherMethods, setShowOtherMethods] = useState(true);

  const handlePrimaryPayClick = () => {
    setActiveSubView(selectedMethod);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 bg-[#F5F4F8] flex-1">
      {/* Tarjeta superior resumen (replicando Imagen 2) */}
      <div className="p-4 rounded-2xl bg-[#EDE9F6] border border-[#DDD6FE]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">Total a pagar</span>
          <span className="font-display font-black text-2xl text-[#5B21B6]">
            {formatCurrency(total)}
          </span>
        </div>

        {(discountAmount > 0 || !isFreeShipping) && (
          <div className="mt-2 pt-2 border-t border-[#DDD6FE] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>Subtotal: {formatCurrency(subtotal)}</span>
            <span>Envío: {isFreeShipping ? 'GRATIS' : formatCurrency(shippingCost)}</span>
            {discountAmount > 0 && (
              <span className="text-[#16A34A] font-bold">
                Cupón {appliedCoupon?.code}: -{formatCurrency(discountAmount)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sub-vistas activas (Imágenes 3, 4, 5 y 6) */}
      {activeSubView === 'paypal' && (
        <PayPalInlineSection
          totalCOP={total}
          orderReference={orderReference}
          onPayPalApproved={onPayPalApproved}
          onCancel={() => setActiveSubView(null)}
        />
      )}

      {activeSubView === 'manual_qr' && (
        <ManualQrPaymentCard
          totalCOP={total}
          config={config}
          isProcessing={isProcessing}
          isUploadingProof={isUploadingProof}
          uploadedProof={uploadedProof}
          proofError={proofError}
          onUploadProof={onUploadProof}
          onClearProof={onClearProof}
          onConfirmManualOrder={onConfirmManualQr}
          onCancel={() => setActiveSubView(null)}
        />
      )}

      {activeSubView === 'wompi' && (
        <div className="space-y-3 animate-fadeIn">
          <WompiCheckoutButton
            totalCOP={total}
            orderReference={orderReference}
            customerEmail={customer?.email}
            customerName={`${customer?.firstName || ''} ${customer?.lastName || ''}`.trim()}
            config={config}
            onConfirmWompiOrder={onConfirmWompi}
          />
          <button
            type="button"
            onClick={() => setActiveSubView(null)}
            className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cancelar y elegir otra forma de pago</span>
          </button>
        </div>
      )}

      {/* Selector principal de medios de pago (replicando Imagen 2) */}
      {activeSubView === null && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            <CreditCard className="w-3.5 h-3.5 text-[#5B21B6]" />
            <span>¿CÓMO QUIERES PAGAR?</span>
          </div>

          {/* 1. PayPal o tarjeta */}
          <button
            type="button"
            onClick={() => setSelectedMethod('paypal')}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
              selectedMethod === 'paypal'
                ? 'border-[#5B21B6] bg-[#F3EFFE] shadow-xs'
                : 'border-slate-200 bg-white hover:border-violet-300'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <span className="font-display font-black italic text-sm text-[#003087]">P</span>
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-sm text-slate-900">
                  PayPal o tarjeta
                </div>
                <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                  Pago internacional seguro, con cuenta PayPal o tarjeta débito/crédito.
                </p>
              </div>
            </div>
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedMethod === 'paypal'
                  ? 'border-[#5B21B6] bg-[#5B21B6]'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {selectedMethod === 'paypal' && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </span>
          </button>

          {/* Acordeón "Otros medios de pago (Colombia)" */}
          <button
            type="button"
            onClick={() => setShowOtherMethods((prev) => !prev)}
            className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 bg-white/80 hover:bg-white text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5 text-[#5B21B6]" />
            <span>Otros medios de pago (Bre-B · Nequi · Daviplata · Wompi)</span>
            {showOtherMethods ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showOtherMethods && (
            <div className="space-y-2.5">
              {/* 2. Pago con QR / Transferencia Bancaria (Colombia) */}
              <button
                type="button"
                onClick={() => setSelectedMethod('manual_qr')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  selectedMethod === 'manual_qr'
                    ? 'border-[#5B21B6] bg-[#F3EFFE] shadow-xs'
                    : 'border-slate-200 bg-white hover:border-violet-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-slate-900">
                      Pago con QR / Transferencia Bancaria (Colombia)
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                      Bre-B, Nequi, Daviplata, Bancolombia y otros bancos. Subes comprobante para verificación.
                    </p>
                  </div>
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedMethod === 'manual_qr'
                      ? 'border-[#5B21B6] bg-[#5B21B6]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {selectedMethod === 'manual_qr' && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              </button>

              {/* 3. Wompi (intacto) */}
              <button
                type="button"
                onClick={() => setSelectedMethod('wompi')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                  selectedMethod === 'wompi'
                    ? 'border-[#5B21B6] bg-[#F3EFFE] shadow-xs'
                    : 'border-slate-200 bg-white hover:border-violet-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 text-[#5B21B6] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-slate-900">
                      Wompi · Bancolombia
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
                      PSE, Nequi, Bancolombia y Tarjetas nacionales en pasarela Wompi.
                    </p>
                  </div>
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedMethod === 'wompi'
                      ? 'border-[#5B21B6] bg-[#5B21B6]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {selectedMethod === 'wompi' && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
              </button>
            </div>
          )}

          {/* Botón principal morado Pagar $... */}
          <button
            type="button"
            onClick={handlePrimaryPayClick}
            className="w-full py-3.5 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] text-white font-display font-bold text-sm shadow-md shadow-violet-900/20 flex items-center justify-center gap-2 transition-all active:scale-99 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Pagar {formatCurrency(total)}</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
            En cuanto se confirme el pago, procesamos tu despacho
          </p>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#5B21B6] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a tus datos</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
