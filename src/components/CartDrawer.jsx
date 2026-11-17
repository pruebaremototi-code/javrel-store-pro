import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Truck,
  ShieldCheck,
  CreditCard,
  Lock,
  RefreshCw,
  Upload,
  Check,
  Copy,
  Clock,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Send,
  ArrowUpRight,
  Landmark,
  BadgeCheck,
} from 'lucide-react';
import { formatCurrency, buildWhatsAppUrl } from '../services/storeService';
import { orderService } from '../services/orderService';
import { emailService } from '../services/emailService';
import { imageOptimizer } from '../services/imageOptimizer';
import { walletService } from '../services/walletService';
import { WompiCheckoutButton } from './WompiCheckoutButton';
import confetti from 'canvas-confetti';

const FREE_SHIPPING_THRESHOLD = 150000;
const CORPORATE_WHATSAPP = '573122174851';

export const CartDrawer = ({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  config = {},
}) => {
  // Modo de checkout: 'online_gateway' | 'whatsapp'
  const [checkoutMode, setCheckoutMode] = useState('online_gateway');
  // Pasarela seleccionada: 'wompi' | 'paypal' | 'wallet'
  const [selectedGateway, setSelectedGateway] = useState(() => {
    try {
      const stored = localStorage.getItem('javrelstore_last_payment_method');
      return ['wompi', 'paypal', 'wallet'].includes(stored) ? stored : 'wompi';
    } catch {
      return 'wompi';
    }
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreatedData, setOrderCreatedData] = useState(null);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Wompi / Llave Breve
  const [isWompiModalOpen, setIsWompiModalOpen] = useState(false);
  const [wompiOperationNumber, setWompiOperationNumber] = useState('');

  // Mi Billetera
  const [walletBalance, setWalletBalance] = useState(0);
  const [isWalletRechargeOpen, setIsWalletRechargeOpen] = useState(false);
  const [walletRechargeAmount, setWalletRechargeAmount] = useState('50000');
  const [walletFeedback, setWalletFeedback] = useState(null);

  // Datos del Cliente (compartidos)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Comprobante de Pago QR (archivo/captura)
  const [proofFilePreview, setProofFilePreview] = useState(null);
  const [proofFileName, setProofFileName] = useState('');

  // Cerrar con Escape (primero modales de pago, luego el carrito)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen || e.key !== 'Escape') return;
      if (isWompiModalOpen) {
        setIsWompiModalOpen(false);
        return;
      }
      if (isWalletRechargeOpen) {
        setIsWalletRechargeOpen(false);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isWompiModalOpen, isWalletRechargeOpen]);

  // Sincronizar saldo de la billetera con el correo del comprador.
  useEffect(() => {
    if (!isOpen) return;
    setWalletBalance(walletService.getBalance(customerEmail));
  }, [isOpen, customerEmail]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
    0
  );
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const shippingCost = isFreeShipping || subtotal === 0 ? 0 : 15000;
  const total = subtotal + shippingCost;
  const totalItemsCount = cartItems.reduce(
    (acc, item) => acc + (Number(item?.quantity) || 0),
    0
  );

  // Manejar subida de imagen de comprobante con compresión WebP
  const handleProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('La imagen no debe superar los 15MB.');
      return;
    }

    try {
      const optimized = await imageOptimizer.compressToWebP(file, {
        maxWidth: 800,
        maxHeight: 800,
        initialQuality: 0.8,
        targetMaxKb: 50,
      });
      setProofFileName(`${file.name} (WebP ~${optimized.compressedSizeKb} KB)`);
      setProofFilePreview(optimized.dataUrl);
    } catch (err) {
      console.warn('Error optimizando comprobante, fallback directo:', err);
      setProofFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        setProofFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copiar datos de cuenta
  const handleCopyAccountInfo = () => {
    const textToCopy = `${config?.paymentBankAccount || 'Bancolombia Ahorros 829-000123-45'} | Nequi/Daviplata: ${config?.paymentNequiPhone || '3122174851'}`;
    try {
      navigator.clipboard?.writeText(textToCopy);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2500);
    } catch (err) {
      console.warn('No se pudo copiar la cuenta:', err);
    }
  };

  const persistPaymentMethod = (method) => {
    setSelectedGateway(method);
    try {
      localStorage.setItem('javrelstore_last_payment_method', method);
    } catch {
      // Ignorar
    }
  };

  const validateCustomer = () => {
    if (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim()) {
      alert('Completa tu nombre, teléfono y correo antes de continuar con el pago.');
      return false;
    }
    return true;
  };

  const buildItemsPayload = () =>
    cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      brand: item.brand,
    }));

  const buildOrderNotes = (extra = '') =>
    `Ciudad: ${customerCity || 'No especificada'} | Dir: ${
      customerAddress || 'No especificada'
    }${extra ? ` | ${extra}` : ''}`;

  const completeOrder = ({ order, methodLabel, proofAttached = false, paymentLink = null }) => {
    emailService.sendOrderNotification({
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      items: cartItems,
      totalAmount: total,
      paymentMethod: methodLabel,
      referenceCode: order.reference_code,
    });

    const itemsListText = cartItems
      .map(
        (item) =>
          `• ${item.quantity}x *${item.name}* (Ref: ${item.id || 'N/A'}) - ${formatCurrency(
            item.price * item.quantity
          )}`
      )
      .join('\n');

    const statusLabel =
      order.payment_status === 'Aprobado'
        ? 'APROBADO'
        : order.payment_status === 'Rechazado'
          ? 'RECHAZADO'
          : 'PENDIENTE DE VERIFICACIÓN';

    const whatsAppMessage =
      `🛍️ *NUEVO PEDIDO REGISTRADO - ${config.storeName?.toUpperCase() || 'JavrelStore'}*\n` +
      `*Referencia:* ${order.reference_code}\n` +
      `*Fecha:* ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      })}\n` +
      `----------------------------------------\n` +
      `👤 *Cliente:* ${customerName.trim()}\n` +
      `📱 *Teléfono:* ${customerPhone.trim()}\n` +
      `📧 *Email:* ${customerEmail.trim()}\n` +
      `📍 *Ciudad / Destino:* ${customerCity.trim() || 'No especificada'}\n` +
      (customerAddress.trim() ? `🏠 *Dirección:* ${customerAddress.trim()}\n` : '') +
      `----------------------------------------\n` +
      `💳 *Método de Pago:* ${methodLabel}\n` +
      `🟡 *Estado:* ${statusLabel}\n` +
      (proofAttached ? `📎 *Comprobante:* Adjuntado en el sistema\n` : '') +
      (order.payment_operation_number
        ? `🔢 *N° Operación:* ${order.payment_operation_number}\n`
        : '') +
      `----------------------------------------\n` +
      `*RESUMEN DE PRODUCTOS:*\n` +
      `${itemsListText}\n` +
      `----------------------------------------\n` +
      `📦 *Subtotal:* ${formatCurrency(subtotal)}\n` +
      `🚚 *Envío:* ${isFreeShipping ? 'GRATIS NACIONAL' : formatCurrency(shippingCost)}\n` +
      `💰 *TOTAL A LIQUIDAR:* ${formatCurrency(total)}\n` +
      `----------------------------------------\n` +
      `Solicito confirmación de pedido y trámite de despacho con tesorería. ¡Muchas gracias!`;

    try {
      window.open(buildWhatsAppUrl(CORPORATE_WHATSAPP, whatsAppMessage), '_blank', 'noopener,noreferrer');
    } catch (openErr) {
      console.warn('Auto-open WhatsApp blocked by browser pop-up blocker:', openErr);
    }

    try {
      confetti({
        particleCount: 70,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#7C3AED', '#0A6CFF', '#10B981', '#F59E0B'],
      });
    } catch (confettiError) {
      console.warn('Confetti no disponible en este navegador:', confettiError);
    }

    setOrderCreatedData({
      order,
      methodLabel,
      items: [...cartItems],
      total,
      paymentLink,
    });

    onClearCart();
  };

  const handleSelectGateway = (method) => {
    persistPaymentMethod(method);

    if (method === 'wallet') {
      setWalletBalance(walletService.getBalance(customerEmail));
    }

    if (method === 'wompi') {
      if (!validateCustomer()) return;
      setIsWompiModalOpen(true);
    }
  };

  // 1. Checkout PayPal / Mi Billetera. Wompi abre su modal de comprobante.
  const handleProcessOrder = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    if (!validateCustomer()) return;

    if (selectedGateway === 'wompi') {
      setIsWompiModalOpen(true);
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedGateway === 'paypal') {
        const methodLabel = 'PayPal — Pago Global Seguro';
        const result = await orderService.createOrder({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          items: buildItemsPayload(),
          totalAmount: total,
          paymentMethod: methodLabel,
          paymentProvider: 'paypal',
          paymentReference: config.paypalBusinessEmail || '',
          paymentPayload: {
            paypalEmail: config.paypalBusinessEmail || '',
            paymentLink: config.paypalPaymentLink || '',
          },
          notes: buildOrderNotes('Pago PayPal pendiente de confirmación'),
          initialStatus: 'Pendiente',
        });

        if (!result?.order) {
          throw new Error('El servidor no devolvió la orden de PayPal.');
        }

        completeOrder({
          order: result.order,
          methodLabel,
          paymentLink: config.paypalPaymentLink || null,
        });
        return;
      }

      if (selectedGateway === 'wallet') {
        const debit = walletService.debit(
          customerEmail,
          total,
          `Pedido JavrelStore ${new Date().toLocaleDateString('es-CO')}`
        );

        if (!debit.success) {
          setWalletBalance(debit.balance || 0);
          setIsWalletRechargeOpen(true);
          return;
        }

        setWalletBalance(debit.balance);
        const methodLabel = 'Mi Billetera JavrelStore';
        const result = await orderService.createOrder({
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          items: buildItemsPayload(),
          totalAmount: total,
          paymentMethod: methodLabel,
          paymentProvider: 'wallet',
          paymentReference: debit.transaction?.id || '',
          paymentPayload: {
            walletTransactionId: debit.transaction?.id || '',
            balanceAfter: debit.balance,
          },
          notes: buildOrderNotes('Saldo debitado de Mi Billetera'),
          initialStatus: 'Aprobado',
        });

        if (!result?.order) {
          throw new Error('El servidor no devolvió la orden de Mi Billetera.');
        }

        completeOrder({ order: result.order, methodLabel });
      }
    } catch (err) {
      console.error('Error al generar la orden:', err);
      alert('Ocurrió un error al procesar tu pedido. Por favor intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Enviar comprobante Wompi / Llave Breve
  const handleWompiSubmit = async (e) => {
    e.preventDefault();
    if (!validateCustomer()) return;

    if (!proofFilePreview) {
      alert('Adjunta la captura del comprobante de transferencia para continuar.');
      return;
    }

    setIsProcessing(true);

    try {
      const methodLabel = 'Wompi — Llave Breve / Transferencia';
      const result = await orderService.createOrder({
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        items: buildItemsPayload(),
        totalAmount: total,
        paymentMethod: methodLabel,
        paymentProofUrl: proofFilePreview,
        paymentOperationNumber: wompiOperationNumber.trim(),
        paymentProvider: 'wompi',
        paymentReference: config.wompiLlaveBreve || config.wompiPublicKey || 'wompi-llave-breve',
        paymentPayload: {
          llaveBreve: config.wompiLlaveBreve || '',
          amount: total,
          wompiPublicKeyConfigured: Boolean(config.wompiPublicKey),
          checkoutUrlConfigured: Boolean(config.wompiCheckoutUrl),
        },
        notes: buildOrderNotes(
          `Wompi Llave Breve: ${config.wompiLlaveBreve || 'Pendiente de configurar'} | N° operación: ${
            wompiOperationNumber.trim() || 'No informado'
          }`
        ),
        initialStatus: 'Pendiente',
      });

      if (!result?.order) {
        throw new Error('El servidor no devolvió la orden de Wompi.');
      }

      setIsWompiModalOpen(false);
      setWompiOperationNumber('');
      setProofFilePreview(null);
      setProofFileName('');
      completeOrder({ order: result.order, methodLabel, proofAttached: true });
    } catch (err) {
      console.error('Error al registrar comprobante Wompi:', err);
      alert('No se pudo registrar el comprobante. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletRecharge = () => {
    if (!customerEmail.trim()) {
      alert('Ingresa tu correo electrónico para asociar el saldo de Mi Billetera.');
      return;
    }
    const amount = Math.round(Number(walletRechargeAmount) || 0);
    const result = walletService.recharge(customerEmail, amount, 'Recarga billetera JavrelStore');

    if (!result.success) {
      setWalletFeedback({ type: 'error', message: result.error });
      return;
    }

    setWalletBalance(result.balance);
    setWalletFeedback({
      type: 'success',
      message: `Recarga acreditada. Nuevo saldo: ${formatCurrency(result.balance)}`,
    });
    setTimeout(() => {
      setIsWalletRechargeOpen(false);
      setWalletFeedback(null);
    }, 900);
  };

  // 2. Finalizar Directamente por WhatsApp
  const handleCheckoutWhatsApp = async () => {
    if (cartItems.length === 0) return;

    setIsProcessing(true);

    const generatedRef = orderService.generateReference();
    const itemsText = cartItems
      .map(
        (item) =>
          `• ${item.quantity}x *${item.name}* (Ref: ${item.id}) - ${formatCurrency(
            item.price * item.quantity
          )}`
      )
      .join('\n');

    const message =
      `🛍️ *NUEVO PEDIDO - ${(config?.storeName || 'JavrelStore').toUpperCase()}*\n` +
      `*Referencia:* ${generatedRef}\n` +
      `----------------------------------------\n` +
      `${itemsText}\n` +
      `----------------------------------------\n` +
      `📦 *Subtotal:* ${formatCurrency(subtotal)}\n` +
      `🚚 *Envío:* ${isFreeShipping ? 'GRATIS NACIONAL' : formatCurrency(shippingCost)}\n` +
      `💰 *TOTAL A PAGAR:* ${formatCurrency(total)}\n` +
      `----------------------------------------\n` +
      `👤 *Cliente:* ${customerName || 'Solicitud Directa'}\n` +
      `📱 *Contacto:* ${customerPhone || 'N/A'}\n` +
      `📍 *Ciudad:* ${customerCity || 'N/A'}\n` +
      `----------------------------------------\n` +
      `Hola asesor, solicito información de disponibilidad y cuenta bancaria para pagar mi pedido.`;

    // Registrar también orden en el sistema para trazabilidad
    try {
      await orderService.createOrder({
        customerName: customerName.trim() || 'Cliente WhatsApp',
        customerEmail: customerEmail.trim() || '',
        customerPhone: customerPhone.trim() || '',
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          brand: item.brand,
        })),
        totalAmount: total,
        paymentMethod: 'WHATSAPP_DIRECT',
        notes: `Pedido directo a línea corporativa 3122174851. Ciudad: ${customerCity || 'N/A'}`,
        initialStatus: 'Pendiente',
      });
    } catch (err) {
      console.warn('Error registrando orden de whatsapp:', err);
    }

    setIsProcessing(false);

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#0A6CFF', '#25D366', '#38BDF8'],
      });
    } catch (confettiError) {
      console.warn('Confetti no disponible en este navegador:', confettiError);
    }

    const url = buildWhatsAppUrl(CORPORATE_WHATSAPP, message);
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (openError) {
      console.warn('No se pudo abrir WhatsApp automáticamente:', openError);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-xs flex justify-end animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideLeft overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Carrito Refinada */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0052cc] via-[#0A6CFF] to-[#38bdf8] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                  Carrito de Compras
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0A6CFF] border border-blue-100 font-mono-code font-bold text-[10px]">
                  {totalItemsCount} {totalItemsCount === 1 ? 'artículo' : 'artículos'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Despacho inmediato asegurado • Checkout seguro
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Cerrar carrito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal / Vista de Pedido Generado */}
        {orderCreatedData ? (
          <div className="p-6 sm:p-8 flex-1 flex flex-col items-center justify-center text-center animate-fadeIn">
            <div
              className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border shadow-sm ${
                orderCreatedData.order.payment_status === 'Aprobado'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}
            >
              {orderCreatedData.order.payment_status === 'Aprobado' ? (
                <BadgeCheck className="w-9 h-9" />
              ) : (
                <Clock className="w-9 h-9 animate-pulse" />
              )}
            </div>

            <span
              className={`text-[11px] font-mono-code font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border mb-2 ${
                orderCreatedData.order.payment_status === 'Aprobado'
                  ? 'text-emerald-800 bg-emerald-100/80 border-emerald-300'
                  : 'text-amber-800 bg-amber-100/80 border-amber-300'
              }`}
            >
              ORDEN REGISTRADA •{' '}
              {orderCreatedData.order.payment_status === 'Aprobado'
                ? 'PAGO APROBADO'
                : 'PENDIENTE DE VERIFICACIÓN'}
            </span>

            <h3 className="font-display font-bold text-xl text-slate-900 mb-1">
              ¡Hemos Recibido tu Pedido!
            </h3>
            <p className="text-xs text-slate-500 mb-6 max-w-md">
              Tu orden ha sido registrada con éxito en el sistema. El stock será apartado y verificado
              por el área de tesorería y despachos de JavrelStore.
            </p>

            {/* Ficha de Detalles de la Orden */}
            <div className="w-full p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-2.5 mb-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-medium">Referencia de Orden:</span>
                <span className="font-mono-code font-bold text-sm text-[#0A6CFF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {orderCreatedData.order.reference_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold text-slate-800">{orderCreatedData.order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono:</span>
                <span className="font-semibold text-slate-800">{orderCreatedData.order.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Método de Pago:</span>
                <span className="font-semibold text-slate-800">{orderCreatedData.methodLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estado del Pago:</span>
                <span
                  className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    orderCreatedData.order.payment_status === 'Aprobado'
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-amber-700 bg-amber-100'
                  }`}
                >
                  {orderCreatedData.order.payment_status === 'Aprobado' ? (
                    <>
                      <BadgeCheck className="w-3 h-3" /> Aprobado
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3" /> Pendiente de Verificación
                    </>
                  )}
                </span>
              </div>

              {orderCreatedData.order.payment_operation_number && (
                <div className="flex justify-between">
                  <span className="text-slate-500">N° de Operación:</span>
                  <span className="font-mono-code font-bold text-slate-800">
                    {orderCreatedData.order.payment_operation_number}
                  </span>
                </div>
              )}

              {orderCreatedData.order.payment_proof_url && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">Comprobante Adjunto:</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Adjuntado exitosamente
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Total del Pedido:</span>
                <span className="font-display text-emerald-600">
                  {formatCurrency(orderCreatedData.total)}
                </span>
              </div>
            </div>

            {/* Acciones Inmediatas Multicanal */}
            <div className="w-full space-y-3">
              {orderCreatedData.paymentLink && (
                <a
                  href={orderCreatedData.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-black text-white cta-paypal transition-all"
                >
                  <CreditCard className="w-4 h-4" />
                  Abrir checkout de PayPal
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              )}

              <a
                href={buildWhatsAppUrl(
                  CORPORATE_WHATSAPP,
                  `¡Hola! Acabo de registrar mi pedido *${orderCreatedData.order.reference_code}* por *${formatCurrency(orderCreatedData.total)}*. Mi nombre es ${orderCreatedData.order.customer_name}. Envío confirmación para verificación y despacho inmediato.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#25D366] hover:bg-[#20BD5A] shadow-md shadow-[#25D366]/25 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Notificar Pedido a WhatsApp Corporativo (312 217 4851)</span>
              </a>

              <p className="text-[11px] text-slate-400">
                Se ha enviado una notificación de confirmación a tu correo y al equipo de soporte.
              </p>

              <button
                onClick={() => {
                  setOrderCreatedData(null);
                  setProofFilePreview(null);
                  setProofFileName('');
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Continuar Navegando en la Tienda
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Barra de Progreso de Envío Gratis */}
            <div className="px-5 py-3 bg-blue-50/70 border-b border-blue-100 text-xs">
              <div className="flex items-center justify-between text-slate-700 font-medium mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#0A6CFF]" />
                  {isFreeShipping ? (
                    <span className="text-emerald-700 font-bold">¡Calificas para Envío Gratis Nacional! 🎉</span>
                  ) : (
                    <span>
                      Te faltan <strong>{formatCurrency(remainingForFreeShipping)}</strong> para envío gratis
                    </span>
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 bg-blue-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0A6CFF] to-emerald-500 transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Lista de Ítems en Carrito */}
            <div className="p-4 sm:p-5 space-y-3">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-[#0A6CFF]/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-16 h-16 rounded-xl bg-[#F8FAFC] border border-slate-200/80 p-1 flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain rounded-lg"
                        onError={(e) => {
                          e.target.src = '/zafra/logo-menu.webp';
                        }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono-code uppercase font-bold text-slate-400">
                        {item.brand || 'TECNOLOGÍA'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.name}
                      </h4>
                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="font-display font-extrabold text-xs text-[#0A6CFF]">
                          {formatCurrency(item.price)}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {formatCurrency(item.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar del carrito"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center border border-slate-200/90 rounded-xl overflow-hidden bg-slate-50 p-0.5 shadow-2xs">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200/60 shadow-2xs text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono-code font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200/60 shadow-2xs text-slate-700 hover:bg-slate-100 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h4 className="font-display font-bold text-sm text-slate-800">
                    Tu carrito está vacío
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Explora el catálogo y añade productos para iniciar tu pedido.
                  </p>
                </div>
              )}
            </div>

            {/* SECCIÓN DE CHECKOUT Y PASARELAS */}
            {cartItems.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 space-y-4">
                {/* Resumen Premium: Total a Pagar */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1528] via-[#0F224A] to-[#122B5E] p-5 text-white shadow-xl shadow-blue-950/20 border border-blue-900/40">
                  <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#0A6CFF]/20 blur-2xl pointer-events-none" />
                  <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-emerald-400/15 blur-2xl pointer-events-none" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono-code font-bold uppercase tracking-[0.18em] text-blue-200">
                        Total a pagar
                      </span>
                      <div className="font-display font-black text-3xl sm:text-4xl text-emerald-300 tracking-tight mt-1">
                        {formatCurrency(total)}
                      </div>
                      <span className="text-[11px] text-slate-300 mt-1 block">
                        {totalItemsCount} producto{totalItemsCount === 1 ? '' : 's'} • Envío{' '}
                        {isFreeShipping ? 'gratis nacional' : formatCurrency(shippingCost)}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-emerald-300">
                      <ShieldCheck className="w-3 h-3" /> Pago protegido
                    </span>
                  </div>

                  <div className="relative grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/15 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Subtotal</span>
                      <span className="font-semibold text-white">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block">Envío</span>
                      <span className="font-semibold text-white">
                        {isFreeShipping ? 'GRATIS' : formatCurrency(shippingCost)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selector Modo: Pasarela Segura vs Asesor WhatsApp */}
                <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCheckoutMode('online_gateway')}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      checkoutMode === 'online_gateway'
                        ? 'bg-white text-[#0A6CFF] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pasarela y Pago QR</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutMode('whatsapp')}
                    className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      checkoutMode === 'whatsapp'
                        ? 'bg-white text-[#25D366] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Asesor WhatsApp (312 217 4851)</span>
                  </button>
                </div>

                {checkoutMode === 'online_gateway' ? (
                  <form onSubmit={handleProcessOrder} className="space-y-4">
                    {/* Datos de Entrega del Cliente */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 text-xs">
                      <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wide text-slate-500">
                        1. Datos del Comprador y Envío
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Nombre y Apellidos *
                          </label>
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-[#0A6CFF]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Teléfono Celular WhatsApp *
                          </label>
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="312 000 0000"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Correo Electrónico (Notificación) *
                          </label>
                          <input
                            type="email"
                            required
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="tu@correo.com"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-[#0A6CFF]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Ciudad / Municipio
                          </label>
                          <input
                            type="text"
                            value={customerCity}
                            onChange={(e) => setCustomerCity(e.target.value)}
                            placeholder="Ej. Bogotá, Medellín, Cali"
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-[#0A6CFF]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 2. Métodos de Pago Premium */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 block text-[11px] uppercase tracking-wide text-slate-500">
                          2. Selecciona tu Método de Pago
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-mono-code font-bold uppercase text-emerald-700">
                          <ShieldCheck className="w-3 h-3" /> SSL 256-Bit
                        </span>
                      </div>

                      <div className="space-y-2">
                        {/* Wompi / Llave Breve */}
                        <button
                          type="button"
                          data-payment-method="wompi"
                          onClick={() => handleSelectGateway('wompi')}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            selectedGateway === 'wompi'
                              ? 'border-violet-500 bg-violet-50/80 ring-2 ring-violet-500/15 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20 flex-shrink-0">
                              <Landmark className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-display font-extrabold text-sm text-slate-900">Wompi</span>
                                <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-black uppercase">
                                  Llave Breve
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Transferencia inmediata + comprobante
                              </p>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedGateway === 'wompi'
                                  ? 'bg-violet-600 border-violet-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {selectedGateway === 'wompi' && <Check className="w-3 h-3" />}
                            </span>
                          </div>
                        </button>

                        {selectedGateway === 'wompi' && (
                          <div className="space-y-3 animate-fadeIn">
                            <WompiCheckoutButton
                              totalCOP={total}
                              orderReference={`JVR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`}
                              customerEmail={customerEmail}
                              customerName={customerName}
                              onCashOnDelivery={() => {
                                if (validateCustomer()) {
                                  handleCheckoutWhatsApp();
                                }
                              }}
                            />

                            <div className="rounded-2xl border border-violet-200 bg-white p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-slate-900">
                                  ¿Ya transferiste por Llave Breve / Bancolombia?
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 text-[9px] font-bold">
                                  Comprobante
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 leading-relaxed">
                                Llave Breve:{' '}
                                <strong className="text-slate-800">
                                  {config.wompiLlaveBreve || 'JAVRELSTORE-LLAVE-BREVE'}
                                </strong>
                              </p>
                              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600">
                                <span className="truncate">
                                  {config.paymentBankAccount || 'Bancolombia Ahorros: 829-000123-45'} • Nequi:{' '}
                                  {config.paymentNequiPhone || '3122174851'}
                                </span>
                                <button
                                  type="button"
                                  onClick={handleCopyAccountInfo}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 font-bold text-[#0A6CFF] hover:bg-blue-50 flex-shrink-0 cursor-pointer"
                                >
                                  {copiedAccount ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  {copiedAccount ? 'Copiado' : 'Copiar'}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (validateCustomer()) setIsWompiModalOpen(true);
                                }}
                                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" /> Subir comprobante de transferencia
                              </button>
                            </div>
                          </div>
                        )}

                        {/* PayPal */}
                        <button
                          type="button"
                          data-payment-method="paypal"
                          onClick={() => handleSelectGateway('paypal')}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            selectedGateway === 'paypal'
                              ? 'border-[#0A6CFF] bg-blue-50/80 ring-2 ring-blue-500/15 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs flex-shrink-0">
                              <span className="font-display font-black italic text-sm text-[#003087]">Pay</span>
                              <span className="font-display font-black italic text-sm text-[#009CDE]">Pal</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-display font-extrabold text-sm text-slate-900">PayPal</span>
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-black uppercase">
                                  Global
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Pago Global Seguro con tu cuenta
                              </p>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedGateway === 'paypal'
                                  ? 'bg-[#0A6CFF] border-[#0A6CFF] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {selectedGateway === 'paypal' && <Check className="w-3 h-3" />}
                            </span>
                          </div>
                        </button>

                        {selectedGateway === 'paypal' && (
                          <div className="rounded-2xl border border-blue-200 bg-white p-3.5 space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <span className="font-display font-black italic text-base text-[#003087]">Pay</span>
                                <span className="font-display font-black italic text-base text-[#009CDE]">Pal</span>
                              </div>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-emerald-700">
                                <ShieldCheck className="w-3 h-3" /> Protección al comprador
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              {config.paypalPaymentLink
                                ? 'Serás dirigido al checkout seguro de PayPal para completar el pago.'
                                : 'Registraremos tu pedido y el equipo enviará el enlace de cobro PayPal a tu correo.'}
                            </p>
                            <button
                              type="button"
                              onClick={handleProcessOrder}
                              className="w-full inline-flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black text-white bg-gradient-to-r from-[#001C64] via-[#003087] to-[#0070E0] hover:from-[#002B7A] hover:to-[#0079D6] shadow-lg shadow-blue-900/20 transition-all active:scale-98"
                            >
                              <CreditCard className="w-4 h-4" /> Pagar con PayPal
                            </button>
                          </div>
                        )}

                        {/* Mi Billetera */}
                        <button
                          type="button"
                          data-payment-method="wallet"
                          onClick={() => handleSelectGateway('wallet')}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            selectedGateway === 'wallet'
                              ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-500/15 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 flex-shrink-0">
                              <Wallet className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-display font-extrabold text-sm text-slate-900">Mi Billetera</span>
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-black uppercase">
                                  Saldo
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Saldo disponible: <strong>{formatCurrency(walletBalance)}</strong>
                              </p>
                            </div>
                            <span
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                selectedGateway === 'wallet'
                                  ? 'bg-amber-500 border-amber-500 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {selectedGateway === 'wallet' && <Check className="w-3 h-3" />}
                            </span>
                          </div>
                        </button>

                        {selectedGateway === 'wallet' && (
                          <div className="rounded-2xl border border-amber-200 bg-white p-3.5 space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-900">Saldo JavrelStore</span>
                              <span className="font-display font-black text-lg text-amber-600">
                                {formatCurrency(walletBalance)}
                              </span>
                            </div>
                            {walletBalance < total ? (
                              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                                Te faltan <strong>{formatCurrency(total - walletBalance)}</strong> para pagar este pedido.
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-1.5">
                                <BadgeCheck className="w-4 h-4" /> Saldo suficiente para completar el pago.
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setIsWalletRechargeOpen(true)}
                                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors"
                              >
                                <Plus className="w-4 h-4" /> Recargar
                              </button>
                              <button
                                type="button"
                                onClick={handleProcessOrder}
                                disabled={walletBalance < total || isProcessing}
                                className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Wallet className="w-4 h-4" /> Pagar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón Principal Generar Pedido */}
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className={`w-full py-4 px-4 rounded-2xl text-xs sm:text-sm font-black text-white active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                        selectedGateway === 'wallet'
                          ? 'cta-emerald'
                          : selectedGateway === 'paypal'
                            ? 'cta-paypal'
                            : 'cta-violet'
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Procesando pago seguro...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>
                            {selectedGateway === 'wompi'
                              ? `Subir comprobante Wompi (${formatCurrency(total)})`
                              : selectedGateway === 'paypal'
                                ? `Pagar con PayPal (${formatCurrency(total)})`
                                : `Pagar con mi Billetera (${formatCurrency(total)})`}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* BLOQUE ASESOR DIRECTO POR WHATSAPP (312 217 4851) */
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-emerald-200">
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Tu Nombre Completo (Opcional)
                        </label>
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Ej. Carlos Mendoza"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-[#25D366]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Ciudad de Destino
                        </label>
                        <input
                          type="text"
                          value={customerCity}
                          onChange={(e) => setCustomerCity(e.target.value)}
                          placeholder="Ej. Bogotá, Bucaramanga, Barranquilla"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-[#25D366]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCheckoutWhatsApp}
                      disabled={isProcessing}
                      className="w-full py-4 px-4 rounded-2xl text-xs sm:text-sm font-black text-white cta-emerald active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Comprar por WhatsApp (Línea 312 217 4851)</span>
                    </button>
                    <p className="text-[11px] text-slate-500 text-center">
                      Atención inmediata 24/7 con soporte para pago contra entrega y transferencias bancarias.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Carrito</span>
                  </button>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <ShieldCheck className="w-4 h-4 text-[#0A6CFF]" />
                    <span>Pasarela SSL 256-Bit • Compra Segura</span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL WOMPI / LLAVE BREVE — COMPROBANTE DE TRANSFERENCIA */}
      {/* ======================================================== */}
      {isWompiModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsWompiModalOpen(false)}
        >
          <form
            data-wompi-modal="true"
            onSubmit={handleWompiSubmit}
            className="relative w-full max-w-lg max-h-[94vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#2A1261] via-[#4C1D95] to-[#0A6CFF] p-5 text-white">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base">Wompi · Llave Breve</h3>
                    <p className="text-[10px] text-violet-200 font-mono-code uppercase tracking-wider">
                      Transferencia inmediata · Comprobante
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWompiModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-colors"
                  title="Cancelar pago"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative flex items-end justify-between mt-5 pt-3 border-t border-white/15">
                <span className="text-[11px] text-violet-200">Monto a transferir</span>
                <span className="font-display font-black text-2xl text-emerald-300">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-code font-bold uppercase text-violet-700">
                    Llave Breve
                  </span>
                  <span className="text-[9px] font-bold text-violet-600">Wompi</span>
                </div>
                <p className="font-mono-code font-black text-sm text-slate-900 break-all">
                  {config.wompiLlaveBreve || 'JAVRELSTORE-LLAVE-BREVE'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {config.paymentBankAccount || 'Bancolombia Ahorros: 829-000123-45'} · Nequi:{' '}
                  {config.paymentNequiPhone || '3122174851'}
                </p>
                <button
                  type="button"
                  onClick={handleCopyAccountInfo}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 hover:underline"
                >
                  {copiedAccount ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedAccount ? 'Datos copiados' : 'Copiar datos de pago'}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Captura del comprobante *
                </label>
                <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-4 text-center hover:border-violet-400 transition-colors">
                  {proofFilePreview ? (
                    <div className="space-y-2">
                      <img
                        src={proofFilePreview}
                        alt="Comprobante Wompi"
                        className="max-h-32 mx-auto rounded-xl border border-slate-300 shadow-sm"
                      />
                      <p className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {proofFileName || 'Comprobante cargado'}
                      </p>
                      <label className="inline-block text-[10px] font-bold text-violet-700 underline cursor-pointer">
                        Cambiar imagen
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                      <label className="inline-block text-[11px] font-bold text-violet-700 underline cursor-pointer">
                        Subir captura
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofUpload}
                          className="sr-only"
                        />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">PNG, JPG o WebP · máx. 15 MB</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  N° de operación <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={wompiOperationNumber}
                  onChange={(e) => setWompiOperationNumber(e.target.value)}
                  placeholder="Ej. 88421902"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:bg-white focus:border-violet-500 font-mono-code text-xs"
                />
              </div>

              {config.wompiCheckoutUrl && (
                <a
                  href={config.wompiCheckoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-700 hover:underline"
                >
                  Pagar directamente en el checkout Wompi <ArrowUpRight className="w-3 h-3" />
                </a>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsWompiModalOpen(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black text-slate-900 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/25 active:scale-98 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Enviar comprobante
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL RECARGA MI BILLETERA */}
      {/* ======================================================== */}
      {isWalletRechargeOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setIsWalletRechargeOpen(false)}
        >
          <div
            data-wallet-recharge-modal="true"
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base">Recargar Mi Billetera</h3>
                    <p className="text-[10px] text-amber-100 font-mono-code uppercase">
                      Saldo JavrelStore
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWalletRechargeOpen(false)}
                  className="p-1.5 rounded-full bg-white/15 hover:bg-white/25"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 flex items-end justify-between">
                <span className="text-[11px] text-amber-100">Saldo actual</span>
                <span className="font-display font-black text-2xl">{formatCurrency(walletBalance)}</span>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                {[50000, 100000, 200000, 500000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setWalletRechargeAmount(String(amount))}
                    className={`py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                      String(walletRechargeAmount) === String(amount)
                        ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/15'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Otro monto
                </label>
                <input
                  type="number"
                  min="1000"
                  value={walletRechargeAmount}
                  onChange={(e) => setWalletRechargeAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 outline-none focus:bg-white focus:border-amber-500 font-display font-bold"
                />
              </div>

              {walletFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] font-semibold ${
                    walletFeedback.type === 'error'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {walletFeedback.message}
                </div>
              )}

              <p className="text-[10px] text-slate-400">
                La recarga se acredita instantáneamente a tu saldo JavrelStore para completar el pago.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsWalletRechargeOpen(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleWalletRecharge}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
                >
                  <Plus className="w-4 h-4" /> Recargar saldo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
