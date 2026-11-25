import React, { useState, useCallback } from 'react';
import { X, Lock, ShoppingBag, ShieldCheck, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency } from '../../services/storeService';
import { orderService } from '../../services/orderService';
import { emailService } from '../../services/emailService';
import { couponService } from '../../services/couponService';
import { paymentProofService } from '../../services/paymentProofService';
import { paymentGatewayService } from '../../services/paymentGatewayService';
import { CheckoutStepper } from './CheckoutStepper';
import { StepCustomerData } from './StepCustomerData';
import { StepPaymentMethod } from './StepPaymentMethod';
import { StepOrderConfirmation } from './StepOrderConfirmation';

const FREE_SHIPPING_THRESHOLD = 150000;
const SHIPPING_FEE = 15000;
const CORPORATE_WHATSAPP = '573122174851';

const INITIAL_CUSTOMER = {
  email: '',
  countryCode: '+57',
  phone: '',
  firstName: '',
  lastName: '',
  document: '',
  department: '',
  city: '',
  address: '',
};

export const CheckoutManager = ({
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onClose,
  config = {},
}) => {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(INITIAL_CUSTOMER);
  const [formErrors, setFormErrors] = useState({});

  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponStatus, setCouponStatus] = useState(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [pendingReference, setPendingReference] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [uploadedProof, setUploadedProof] = useState(null);
  const [proofError, setProofError] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [orderCreatedData, setOrderCreatedData] = useState(null);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
    0
  );
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingCost = isFreeShipping || subtotal === 0 ? 0 : SHIPPING_FEE;
  const discountAmount = appliedCoupon
    ? Math.min(Number(appliedCoupon.discountAmount) || 0, subtotal)
    : 0;
  const total = Math.max(0, subtotal + shippingCost - discountAmount);

  const whatsappLine =
    String(config?.whatsappNumber || '').replace(/\D/g, '') || CORPORATE_WHATSAPP;
  const fullCustomerName = `${customer.firstName.trim()} ${customer.lastName.trim()}`.trim();
  const fullWhatsappPhone = `${customer.countryCode} ${customer.phone.trim()}`.trim();

  const handleCustomerChange = (field, value) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep1 = () => {
    const nextErrors = {};
    if (!customer.email.trim() || !customer.email.includes('@')) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }
    if (!customer.phone.trim() || customer.phone.trim().length < 7) {
      nextErrors.phone = 'Ingresa un número de WhatsApp válido.';
    }
    if (!customer.firstName.trim()) nextErrors.firstName = 'Ingresa tu nombre.';
    if (!customer.lastName.trim()) nextErrors.lastName = 'Ingresa tus apellidos.';
    if (!customer.document.trim()) nextErrors.document = 'Ingresa tu cédula o documento.';
    if (!customer.department.trim()) nextErrors.department = 'Ingresa tu departamento.';
    if (!customer.city.trim()) nextErrors.city = 'Ingresa tu ciudad.';
    if (!customer.address.trim()) nextErrors.address = 'Ingresa tu dirección exacta.';

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleGoToStep2 = () => {
    if (!validateStep1()) return;
    if (!pendingReference) {
      setPendingReference(orderService.generateReference());
    }
    setStep(2);
  };

  const handleApplyCoupon = async (code) => {
    setIsValidatingCoupon(true);
    setCouponStatus(null);
    const result = await couponService.validateCoupon(code, subtotal);
    setIsValidatingCoupon(false);

    if (!result.valid) {
      setAppliedCoupon(null);
      setCouponStatus({ type: 'error', message: result.error });
      return;
    }

    setAppliedCoupon(result.coupon);
    setCouponStatus({
      type: 'success',
      message: `Cupón ${result.coupon.code} aplicado (-${formatCurrency(
        result.coupon.discountAmount
      )}).`,
    });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponStatus(null);
  };

  const handleUploadProof = async (file) => {
    const refForFile = pendingReference || orderService.generateReference();
    if (!pendingReference) setPendingReference(refForFile);

    setProofError('');
    setIsUploadingProof(true);
    try {
      const uploaded = await paymentProofService.uploadProof(file, refForFile);
      setUploadedProof(uploaded);
    } catch (err) {
      setProofError(err.message || 'No se pudo subir el comprobante.');
    } finally {
      setIsUploadingProof(false);
    }
  };

  const buildItemsPayload = useCallback(
    () =>
      cartItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        brand: item.brand,
      })),
    [cartItems]
  );

  const buildWhatsAppSummary = useCallback(
    ({ order, methodLabel }) => {
      const itemsText = cartItems
        .map(
          (item) =>
            `• ${item.quantity}x *${item.name}* - ${formatCurrency(item.price * item.quantity)}`
        )
        .join('\n');

      const statusLabel =
        order.payment_status === 'pagado' ? 'PAGADO (EN LÍNEA)' : 'PENDIENTE DE VERIFICACIÓN';

      return (
        `🛍️ *NUEVO PEDIDO - ${(config?.storeName || 'JavrelStore').toUpperCase()}*\n` +
        `*N° de Orden:* ${order.reference_code}\n` +
        `*Estado:* ${statusLabel}\n` +
        `----------------------------------------\n` +
        `👤 *Cliente:* ${fullCustomerName}\n` +
        `🪪 *Documento:* ${customer.document.trim()}\n` +
        `📱 *WhatsApp:* ${fullWhatsappPhone}\n` +
        `📧 *Correo:* ${customer.email.trim()}\n` +
        `📍 *Entrega:* ${customer.address.trim()}, ${customer.city.trim()}, ${customer.department.trim()}\n` +
        `----------------------------------------\n` +
        `💳 *Método de Pago:* ${methodLabel}\n` +
        (order.payment_operation_number
          ? `🔢 *N° Operación:* ${order.payment_operation_number}\n`
          : '') +
        (order.payment_proof_url ? `📎 *Comprobante:* ${order.payment_proof_url}\n` : '') +
        `----------------------------------------\n` +
        `*PRODUCTOS:*\n${itemsText}\n` +
        `----------------------------------------\n` +
        `📦 *Subtotal:* ${formatCurrency(subtotal)}\n` +
        `🚚 *Envío:* ${isFreeShipping ? 'GRATIS' : formatCurrency(shippingCost)}\n` +
        (discountAmount > 0
          ? `🏷️ *Descuento (${appliedCoupon?.code}):* -${formatCurrency(discountAmount)}\n`
          : '') +
        `💰 *TOTAL:* ${formatCurrency(total)}`
      );
    },
    [
      cartItems,
      config?.storeName,
      fullCustomerName,
      customer.document,
      fullWhatsappPhone,
      customer.email,
      customer.address,
      customer.city,
      customer.department,
      subtotal,
      isFreeShipping,
      shippingCost,
      discountAmount,
      appliedCoupon?.code,
      total,
    ]
  );

  const finalizeOrder = useCallback(
    async ({ order, methodLabel, paymentLink = null }) => {
      if (appliedCoupon?.code) {
        couponService.markCouponUsed(appliedCoupon.code);
      }

      emailService.sendOrderNotification({
        customerName: fullCustomerName,
        customerEmail: customer.email.trim(),
        items: cartItems,
        totalAmount: total,
        paymentMethod: methodLabel,
        referenceCode: order.reference_code,
      });

      const whatsappMessage = buildWhatsAppSummary({ order, methodLabel });

      try {
        confetti({
          particleCount: 70,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#5B21B6', '#16A34A', '#F59E0B'],
        });
      } catch {
        // Ignorar si confetti no está disponible
      }

      setOrderCreatedData({
        order,
        methodLabel,
        items: [...cartItems],
        subtotal,
        shippingCost,
        discountAmount,
        couponCode: appliedCoupon?.code || '',
        total,
        paymentLink,
        whatsappMessage,
      });
      setStep(3);
      onClearCart();
    },
    [
      appliedCoupon,
      fullCustomerName,
      customer.email,
      cartItems,
      total,
      buildWhatsAppSummary,
      subtotal,
      shippingCost,
      discountAmount,
      onClearCart,
    ]
  );

  const handlePayPalApproved = useCallback(
    async ({ transactionId, payerEmail, totalUSD, baseUSD, paypalFeeUSD, rawDetails }) => {
      setIsProcessing(true);
      try {
        const refCode = pendingReference || orderService.generateReference();
        const methodLabel = 'PayPal / Tarjeta Internacional';
        const result = await orderService.createOrder({
          referenceCode: refCode,
          customerName: fullCustomerName,
          customerEmail: customer.email.trim(),
          customerPhone: fullWhatsappPhone,
          customerDocument: customer.document.trim(),
          customerDepartment: customer.department.trim(),
          customerCity: customer.city.trim(),
          customerAddress: customer.address.trim(),
          items: buildItemsPayload(),
          subtotalAmount: subtotal,
          shippingCost,
          discountAmount,
          couponCode: appliedCoupon?.code || '',
          totalAmount: total,
          paymentMethod: methodLabel,
          paymentProvider: 'paypal',
          paymentReference: transactionId,
          paymentPayload: {
            transactionId,
            payerEmail,
            totalUSD,
            baseUSD,
            paypalFeeUSD,
            status: rawDetails?.status || 'COMPLETED',
          },
          notes: `PayPal Tx: ${transactionId} | Entrega: ${customer.address.trim()}, ${customer.city.trim()}`,
          initialStatus: 'pagado',
        });

        if (!result?.order) {
          throw new Error('No se pudo registrar la orden de PayPal.');
        }

        await finalizeOrder({
          order: result.order,
          methodLabel,
        });
      } catch (err) {
        console.error('[CheckoutManager] Error registrando orden PayPal:', err);
        alert('Tu pago fue procesado pero hubo un error registrando la orden. Contáctanos con tu correo.');
      } finally {
        setIsProcessing(false);
      }
    },
    [
      pendingReference,
      fullCustomerName,
      customer,
      fullWhatsappPhone,
      buildItemsPayload,
      subtotal,
      shippingCost,
      discountAmount,
      appliedCoupon,
      total,
      finalizeOrder,
    ]
  );

  const handleConfirmManualQr = async ({ platformLabel, payerFullName, operationNumber }) => {
    if (!uploadedProof?.url) {
      setProofError('Debes adjuntar el comprobante antes de confirmar.');
      return;
    }

    setIsProcessing(true);
    try {
      const refCode = pendingReference || orderService.generateReference();
      const methodLabel = `QR / Transferencia (${platformLabel})`;

      const result = await orderService.createOrder({
        referenceCode: refCode,
        customerName: fullCustomerName,
        customerEmail: customer.email.trim(),
        customerPhone: fullWhatsappPhone,
        customerDocument: customer.document.trim(),
        customerDepartment: customer.department.trim(),
        customerCity: customer.city.trim(),
        customerAddress: customer.address.trim(),
        items: buildItemsPayload(),
        subtotalAmount: subtotal,
        shippingCost,
        discountAmount,
        couponCode: appliedCoupon?.code || '',
        totalAmount: total,
        paymentMethod: methodLabel,
        paymentProofUrl: uploadedProof.url,
        paymentOperationNumber: operationNumber,
        paymentProvider: 'manual_qr',
        paymentReference: config?.wompiLlaveBreve || config?.paymentNequiPhone || refCode,
        paymentPayload: {
          platform: platformLabel,
          payerFullName,
          storagePath: uploadedProof.path,
          fileName: uploadedProof.fileName,
          isPdf: uploadedProof.isPdf,
        },
        notes: `Titular transfiere: ${payerFullName} | ${platformLabel} | Entrega: ${customer.address.trim()}, ${customer.city.trim()}`,
        initialStatus: 'pendiente_verificacion',
      });

      if (!result?.order) {
        throw new Error('No se pudo registrar el pedido.');
      }

      await finalizeOrder({
        order: result.order,
        methodLabel,
      });
    } catch (err) {
      console.error('[CheckoutManager] Error registrando pago QR:', err);
      alert('Ocurrió un error al registrar tu comprobante. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmWompi = async (externalUrl) => {
    setIsProcessing(true);
    try {
      const refCode = pendingReference || orderService.generateReference();
      const gatewayResult = await paymentGatewayService.initiateAutomaticPayment({
        channel: 'wompi',
        orderReference: refCode,
        totalCOP: total,
        customer: { email: customer.email.trim(), name: fullCustomerName },
        config,
      });

      const resolvedLink = externalUrl || gatewayResult.paymentLink;
      const result = await orderService.createOrder({
        referenceCode: refCode,
        customerName: fullCustomerName,
        customerEmail: customer.email.trim(),
        customerPhone: fullWhatsappPhone,
        customerDocument: customer.document.trim(),
        customerDepartment: customer.department.trim(),
        customerCity: customer.city.trim(),
        customerAddress: customer.address.trim(),
        items: buildItemsPayload(),
        subtotalAmount: subtotal,
        shippingCost,
        discountAmount,
        couponCode: appliedCoupon?.code || '',
        totalAmount: total,
        paymentMethod: gatewayResult.methodLabel,
        paymentProvider: gatewayResult.provider,
        paymentReference: gatewayResult.paymentReference,
        paymentPayload: gatewayResult.paymentPayload,
        notes: `Wompi | Entrega: ${customer.address.trim()}, ${customer.city.trim()}`,
        initialStatus: 'pendiente_verificacion',
      });

      if (!result?.order) {
        throw new Error('No se pudo registrar la orden Wompi.');
      }

      if (resolvedLink) {
        window.open(resolvedLink, '_blank', 'noopener,noreferrer');
      }

      await finalizeOrder({
        order: result.order,
        methodLabel: gatewayResult.methodLabel,
        paymentLink: resolvedLink,
      });
    } catch (err) {
      console.error('[CheckoutManager] Error Wompi:', err);
      alert('No se pudo iniciar la orden con Wompi.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAndClose = () => {
    setOrderCreatedData(null);
    setStep(1);
    setPendingReference('');
    setUploadedProof(null);
    setProofError('');
    setAppliedCoupon(null);
    setCouponStatus(null);
    onClose();
  };

  return (
    <div
      className="relative w-full max-w-lg bg-[#F5F4F8] h-full shadow-2xl flex flex-col border-l border-slate-200 animate-slideLeft"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Encabezado morado oscuro */}
      <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#4C1D95] to-[#5B21B6] text-white flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-white" />
            <h3 className="font-display font-extrabold text-base leading-tight">
              Checkout Seguro
            </h3>
          </div>
          <p className="text-[11px] text-violet-200 mt-0.5">
            Completa tu compra en pocos pasos
          </p>
        </div>
        <button
          type="button"
          onClick={step === 3 ? handleResetAndClose : onClose}
          className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
          title="Cerrar checkout"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stepper */}
      {(cartItems.length > 0 || orderCreatedData) && (
        <CheckoutStepper
          currentStep={step}
          onStepClick={(target) => {
            if (target < step && step < 3) setStep(target);
          }}
        />
      )}

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {step === 3 && orderCreatedData ? (
          <StepOrderConfirmation
            orderCreatedData={orderCreatedData}
            corporateWhatsapp={whatsappLine}
            onFinish={handleResetAndClose}
          />
        ) : cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-6 bg-[#F5F4F8]">
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center mb-3 text-slate-400">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h4 className="font-display font-bold text-sm text-slate-800">
              Tu carrito está vacío
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Explora el catálogo y añade productos para iniciar tu pedido.
            </p>
          </div>
        ) : step === 1 ? (
          <StepCustomerData
            cartItems={cartItems}
            subtotal={subtotal}
            shippingCost={shippingCost}
            isFreeShipping={isFreeShipping}
            freeShippingThreshold={FREE_SHIPPING_THRESHOLD}
            customer={customer}
            errors={formErrors}
            appliedCoupon={appliedCoupon}
            couponStatus={couponStatus}
            isValidatingCoupon={isValidatingCoupon}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
            onChangeCustomer={handleCustomerChange}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
            onContinue={handleGoToStep2}
          />
        ) : (
          <StepPaymentMethod
            subtotal={subtotal}
            shippingCost={shippingCost}
            isFreeShipping={isFreeShipping}
            discountAmount={discountAmount}
            total={total}
            appliedCoupon={appliedCoupon}
            config={config}
            customer={customer}
            orderReference={pendingReference}
            isProcessing={isProcessing}
            isUploadingProof={isUploadingProof}
            uploadedProof={uploadedProof}
            proofError={proofError}
            onUploadProof={handleUploadProof}
            onClearProof={() => {
              setUploadedProof(null);
              setProofError('');
            }}
            onPayPalApproved={handlePayPalApproved}
            onConfirmManualQr={handleConfirmManualQr}
            onConfirmWompi={handleConfirmWompi}
            onBack={() => setStep(1)}
          />
        )}
      </div>

      {/* Pie de página fijo */}
      <div className="px-4 py-2.5 bg-[#F1F0F5] border-t border-slate-200/90 flex items-center justify-around gap-2 text-[11px] font-semibold text-slate-600 shrink-0">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" /> SSL Seguro
        </span>
        <span className="inline-flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-[#16A34A]" /> Activación inmediata
        </span>
        <span className="inline-flex items-center gap-1 font-display font-bold text-[#5B21B6]">
          <ShoppingBag className="w-3.5 h-3.5" /> JAVRELSTORE
        </span>
      </div>
    </div>
  );
};
