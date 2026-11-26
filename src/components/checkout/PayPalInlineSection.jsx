import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, AlertCircle, CreditCard, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../services/storeService';

const PAYPAL_CLIENT_ID = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim();
const USD_EXCHANGE_RATE = Math.max(1000, Number(import.meta.env.VITE_USD_EXCHANGE_RATE) || 4200);

const hasValidPayPalClientId =
  Boolean(PAYPAL_CLIENT_ID) && !PAYPAL_CLIENT_ID.includes('tu_paypal_client_id');

// Detecta modo sandbox: Client ID de sandbox empieza con "AZ" o el env dice sandbox/no-live
const isSandboxMode =
  PAYPAL_CLIENT_ID.startsWith('AZ') ||
  PAYPAL_CLIENT_ID.toLowerCase().includes('sandbox') ||
  String(import.meta.env.VITE_PAYPAL_ENV || 'sandbox').toLowerCase() !== 'live';

let paypalSdkPromise = null;

/**
 * Carga única (singleton) del SDK oficial de PayPal.
 */
const loadPayPalSdk = (clientId) => {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.paypal?.Buttons) return Promise.resolve(window.paypal);
  if (paypalSdkPromise) return paypalSdkPromise;

  paypalSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-javrel-paypal-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.paypal));
      existing.addEventListener('error', () => {
        paypalSdkPromise = null;
        reject(new Error('Error cargando SDK de PayPal'));
      });
      return;
    }

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
        paypalSdkPromise = null;
        reject(new Error('PayPal SDK no inicializó correctamente.'));
      }
    };
    script.onerror = () => {
      paypalSdkPromise = null;
      reject(new Error('No se pudo conectar con PayPal.'));
    };
    document.body.appendChild(script);
  });

  return paypalSdkPromise;
};

export const PayPalInlineSection = ({
  totalCOP,
  orderReference,
  onPayPalApproved,
  onCancel,
}) => {
  const paypalContainerRef = useRef(null);
  const cardContainerRef = useRef(null);
  const buttonInstancesRef = useRef([]);
  const hasRenderedRef = useRef(false);

  const [sdkStatus, setSdkStatus] = useState(hasValidPayPalClientId ? 'loading' : 'unconfigured');
  const [sdkError, setSdkError] = useState('');

  const baseUSD = Number((Math.max(0, Number(totalCOP) || 0) / USD_EXCHANGE_RATE).toFixed(2));
  const paypalFeeUSD = Number((baseUSD * 0.054 + 0.3).toFixed(2));
  const totalUSD = Number((baseUSD + paypalFeeUSD).toFixed(2));

  // Refs estables para evitar re-renders o desmontaje de los contenedores de PayPal
  const latestPayloadRef = useRef({
    orderReference,
    totalUSD,
    baseUSD,
    paypalFeeUSD,
    onPayPalApproved,
  });

  useEffect(() => {
    latestPayloadRef.current = {
      orderReference,
      totalUSD,
      baseUSD,
      paypalFeeUSD,
      onPayPalApproved,
    };
  }, [orderReference, totalUSD, baseUSD, paypalFeeUSD, onPayPalApproved]);

  useEffect(() => {
    if (!hasValidPayPalClientId) return undefined;

    const effectState = { cancelled: false };

    loadPayPalSdk(PAYPAL_CLIENT_ID)
      .then((paypal) => {
        if (effectState.cancelled || hasRenderedRef.current) return;
        const paypalNode = paypalContainerRef.current;
        const cardNode = cardContainerRef.current;
        if (!paypalNode || !cardNode) return;

        hasRenderedRef.current = true;
        setSdkStatus('ready');
        setSdkError('');

        const mountButton = (container, fundingSource, style) => {
          const instance = paypal.Buttons({
            fundingSource,
            style,
            createOrder: (_data, actions) => {
              const current = latestPayloadRef.current;
              return actions.order.create({
                purchase_units: [
                  {
                    reference_id: current.orderReference,
                    description: `Pedido JavrelStore ${current.orderReference}`,
                    amount: {
                      currency_code: 'USD',
                      value: current.totalUSD.toFixed(2),
                    },
                  },
                ],
              });
            },
            onApprove: async (data, _actions) => {
              const current = latestPayloadRef.current;
              setSdkError('');
              try {
                const res = await fetch('/api/paypal-capture', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    paypalOrderId: data.orderID,
                    internalRef: current.orderReference,
                    expectedAmountUSD: current.totalUSD,
                  }),
                });
                const result = await res.json();
                if (!result.success) {
                  setSdkError(
                    result.error ||
                      'El pago no pudo ser verificado en el servidor. Contacta soporte.'
                  );
                  return;
                }
                current.onPayPalApproved?.({
                  transactionId: result.transactionId,
                  payerEmail: result.payerEmail || '',
                  totalUSD: current.totalUSD,
                  baseUSD: current.baseUSD,
                  paypalFeeUSD: current.paypalFeeUSD,
                  rawDetails: null,
                });
              } catch (err) {
                console.error('[PayPal Capture]', err);
                setSdkError('Error de conexión al verificar el pago. Intenta nuevamente.');
              }
            },
            onError: (err) => {
              console.error('[PayPal SDK Error]', err);
              setSdkError('Ocurrió un error al procesar el pago con PayPal. Intenta nuevamente.');
            },
          });

          if (instance.isEligible()) {
            buttonInstancesRef.current.push(instance);
            instance.render(container).catch((renderErr) => {
              if (!effectState.cancelled) {
                console.warn('[PayPal Render Warning]', renderErr);
              }
            });
          }
        };

        mountButton(paypalNode, paypal.FUNDING.PAYPAL, {
          layout: 'vertical',
          color: 'gold',
          shape: 'pill',
          label: 'pay',
          height: 46,
        });

        mountButton(cardNode, paypal.FUNDING.CARD, {
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
      hasRenderedRef.current = false;
      const instances = buttonInstancesRef.current;
      buttonInstancesRef.current = [];
      instances.forEach((inst) => {
        try {
          if (typeof inst?.close === 'function') {
            inst.close().catch(() => {});
          }
        } catch {
          // Ignorar errores al cerrar instancia desmontada
        }
      });
    };
  }, []);

  return (
    <div className="space-y-3.5 animate-fadeIn">
      {/* Badge de modo sandbox — solo visible cuando el Client ID es de pruebas */}
      {hasValidPayPalClientId && isSandboxMode && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-[11px] text-amber-900 font-semibold flex items-center gap-1.5">
          <span>⚠️</span>
          <span>
            Modo Sandbox (pruebas) — Los pagos <strong>NO</strong> son reales. Cambia a credenciales
            Live antes de producción.
          </span>
        </div>
      )}

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

      {/* Contenedores siempre montados en el DOM para evitar que PayPal pierda la referencia */}
      {hasValidPayPalClientId && (
        <div className={`space-y-2.5 ${sdkStatus === 'ready' ? 'block' : 'hidden'}`}>
          <div ref={paypalContainerRef} className="min-h-[48px]" />
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
