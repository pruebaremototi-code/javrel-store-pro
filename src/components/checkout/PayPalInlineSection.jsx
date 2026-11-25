import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../services/storeService';

const PAYPAL_CLIENT_ID = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim();
const USD_EXCHANGE_RATE = Math.max(1000, Number(import.meta.env.VITE_USD_EXCHANGE_RATE) || 4200);

const hasValidPayPalClientId =
  Boolean(PAYPAL_CLIENT_ID) && !PAYPAL_CLIENT_ID.includes('tu_paypal_client_id');

/**
 * Carga dinámica del SDK oficial de PayPal (sin redirecciones a WhatsApp).
 */
const loadPayPalSdk = (clientId) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.paypal?.Buttons) return Promise.resolve(window.paypal);

  const existing = document.querySelector('script[data-javrel-paypal-sdk="true"]');
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.paypal));
      existing.addEventListener('error', () => reject(new Error('Error cargando SDK de PayPal')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      clientId
    )}&currency=USD&intent=capture&locale=es_CO&enable-funding=card`;
    script.async = true;
    script.dataset.javrelPaypalSdk = 'true';
    script.onload = () => {
      if (window.paypal?.Buttons) {
        resolve(window.paypal);
      } else {
        reject(new Error('PayPal SDK no inicializó correctamente.'));
      }
    };
    script.onerror = () => reject(new Error('No se pudo conectar con PayPal.'));
    document.body.appendChild(script);
  });
};

export const PayPalInlineSection = ({
  totalCOP,
  orderReference,
  onPayPalApproved,
  onCancel,
}) => {
  const paypalContainerRef = useRef(null);
  const cardContainerRef = useRef(null);
  const [sdkStatus, setSdkStatus] = useState(hasValidPayPalClientId ? 'loading' : 'unconfigured');
  const [sdkError, setSdkError] = useState('');

  const baseUSD = Number((Math.max(0, Number(totalCOP) || 0) / USD_EXCHANGE_RATE).toFixed(2));
  const paypalFeeUSD = Number((baseUSD * 0.054 + 0.3).toFixed(2));
  const totalUSD = Number((baseUSD + paypalFeeUSD).toFixed(2));

  useEffect(() => {
    if (!hasValidPayPalClientId) return undefined;

    const effectState = { cancelled: false };

    loadPayPalSdk(PAYPAL_CLIENT_ID)
      .then((paypal) => {
        if (effectState.cancelled) return;
        setSdkStatus('ready');
        setSdkError('');

        const renderButtons = (container, fundingSource, style) => {
          if (!container) return;
          container.innerHTML = '';
          const buttons = paypal.Buttons({
            fundingSource,
            style,
            createOrder: (_data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    reference_id: orderReference,
                    description: `Pedido JavrelStore ${orderReference}`,
                    amount: {
                      currency_code: 'USD',
                      value: totalUSD.toFixed(2),
                    },
                  },
                ],
              });
            },
            onApprove: async (_data, actions) => {
              const details = await actions.order.capture();
              onPayPalApproved({
                transactionId: details?.id || orderReference,
                payerEmail: details?.payer?.email_address || '',
                totalUSD,
                baseUSD,
                paypalFeeUSD,
                rawDetails: details,
              });
            },
            onError: (err) => {
              console.error('[PayPal SDK Error]', err);
              setSdkError('Ocurrió un error al procesar el pago con PayPal. Intenta nuevamente.');
            },
          });

          if (buttons.isEligible()) {
            buttons.render(container);
          }
        };

        renderButtons(paypalContainerRef.current, paypal.FUNDING.PAYPAL, {
          layout: 'vertical',
          color: 'gold',
          shape: 'pill',
          label: 'pay',
          height: 46,
        });

        renderButtons(cardContainerRef.current, paypal.FUNDING.CARD, {
          layout: 'vertical',
          color: 'black',
          shape: 'pill',
          height: 46,
        });
      })
      .catch((err) => {
        if (effectState.cancelled) return;
        setSdkStatus('error');
        setSdkError(err.message || 'No se pudo cargar la pasarela de PayPal.');
      });

    return () => {
      effectState.cancelled = true;
    };
  }, [orderReference, totalUSD, baseUSD, paypalFeeUSD, onPayPalApproved]);

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Cálculo transparente en USD */}
      <p className="text-[11px] text-slate-600 text-center">
        Pedido <strong>${baseUSD.toFixed(2)} USD</strong> ({formatCurrency(totalCOP)}) +{' '}
        <strong>${paypalFeeUSD.toFixed(2)}</strong> de comisión de PayPal ={' '}
        <strong className="text-slate-900">Total ${totalUSD.toFixed(2)} USD</strong>
      </p>

      {sdkStatus === 'loading' && (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-5 h-5 animate-spin text-[#5B21B6]" />
          <span>Conectando con PayPal Seguro...</span>
        </div>
      )}

      {sdkStatus === 'ready' && (
        <div className="space-y-2.5">
          {/* Botón amarillo oficial de PayPal */}
          <div ref={paypalContainerRef} className="min-h-[48px]" />
          {/* Botón negro oficial de Tarjeta de débito o crédito (despliega formulario embebido de PayPal) */}
          <div ref={cardContainerRef} className="min-h-[48px]" />
        </div>
      )}

      {sdkStatus === 'unconfigured' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Falta configurar `VITE_PAYPAL_CLIENT_ID`</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Agrega tu Client ID de PayPal en <code>.env</code> para habilitar el popup oficial de PayPal y el formulario embebido de tarjeta débito/crédito.
              </p>
            </div>
          </div>
          <div className="space-y-2 pt-1 opacity-60 pointer-events-none">
            <div className="w-full py-2.5 rounded-full bg-[#FFC439] text-[#003087] font-bold text-center text-sm">
              Pagar con <span className="italic font-black">PayPal</span>
            </div>
            <div className="w-full py-2.5 rounded-full bg-[#2C2E2F] text-white font-bold text-center text-sm flex items-center justify-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>Tarjeta de débito o crédito</span>
            </div>
          </div>
        </div>
      )}

      {sdkError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {sdkError}
        </div>
      )}

      <div className="text-center space-y-1 pt-1">
        <p className="text-[11px] text-slate-500 italic">
          Desarrollado por <span className="font-black text-[#003087] not-italic">Pay</span>
          <span className="font-black text-[#0070BA] not-italic">Pal</span>
        </p>
        <p className="text-[11px] text-slate-500">
          Pago internacional seguro con PayPal o tarjeta
        </p>
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Cancelar y elegir otra forma de pago</span>
      </button>
    </div>
  );
};
