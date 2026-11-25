import React, { useState } from 'react';
import {
  Gift,
  Lock,
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatCurrency } from '../../services/storeService';

const WHATSAPP_COUNTRIES = [
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
];

export const StepCustomerData = ({
  cartItems,
  subtotal,
  shippingCost,
  isFreeShipping,
  freeShippingThreshold,
  customer,
  errors,
  appliedCoupon,
  couponStatus,
  isValidatingCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  onChangeCustomer,
  onUpdateQuantity,
  onRemoveItem,
  onContinue,
}) => {
  const [showCouponBox, setShowCouponBox] = useState(Boolean(appliedCoupon));
  const [couponCodeInput, setCouponCodeInput] = useState(appliedCoupon?.code || '');
  const [showItemsList, setShowItemsList] = useState(false);

  const selectedCountry =
    WHATSAPP_COUNTRIES.find((c) => c.code === customer.countryCode) || WHATSAPP_COUNTRIES[0];

  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPct = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const isFormValid =
    Boolean(customer.email.trim() && customer.email.includes('@')) &&
    Boolean(customer.phone.trim().length >= 7) &&
    Boolean(customer.firstName.trim()) &&
    Boolean(customer.lastName.trim()) &&
    Boolean(customer.document.trim()) &&
    Boolean(customer.department.trim()) &&
    Boolean(customer.city.trim()) &&
    Boolean(customer.address.trim());

  const handleSubmit = (e) => {
    e.preventDefault();
    onContinue();
  };

  const handleCouponApply = () => {
    if (!couponCodeInput.trim()) return;
    onApplyCoupon(couponCodeInput);
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col bg-[#F5F4F8]">
      {/* Resumen colapsable de productos + Barra de envío gratis */}
      <div className="px-4 sm:px-6 pt-3 pb-2.5 bg-white border-b border-slate-200/80 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-slate-700 font-medium">
            <Truck className="w-3.5 h-3.5 text-[#5B21B6]" />
            {isFreeShipping ? (
              <span className="text-[#16A34A] font-bold">
                ¡Envío gratis nacional desbloqueado!
              </span>
            ) : (
              <span>
                Te faltan <strong>{formatCurrency(remainingForFreeShipping)}</strong> para envío gratis
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowItemsList((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[#5B21B6] font-bold hover:underline cursor-pointer"
          >
            <span>{cartItems.length} prod.</span>
            {showItemsList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#5B21B6] to-[#16A34A] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {showItemsList && (
          <div className="pt-2 space-y-2 max-h-44 overflow-y-auto">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200 p-0.5 shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = '/zafra/logo-menu.webp';
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                  <span className="text-[#5B21B6] font-bold">{formatCurrency(item.price)}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-mono-code font-bold text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulario replicando Imagen 1 */}
      <div className="p-4 sm:p-6 space-y-4 flex-1">
        {/* Correo electrónico */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            CORREO ELECTRÓNICO <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            value={customer.email}
            onChange={(e) => onChangeCustomer('email', e.target.value)}
            placeholder="tucorreo@gmail.com"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 outline-none transition-colors focus:border-[#5B21B6] focus:ring-2 focus:ring-[#5B21B6]/15 ${
              errors.email ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
            }`}
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Usarás este correo para seguimiento de tu pedido.
          </p>
          {errors.email && <p className="text-[11px] text-rose-600 mt-0.5">{errors.email}</p>}
        </div>

        {/* WhatsApp con selector de país + confirmación verde */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1.5">
            WHATSAPP <span className="text-rose-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={selectedCountry.code}
              onChange={(e) => onChangeCustomer('countryCode', e.target.value)}
              aria-label="Código de país WhatsApp"
              className="px-2.5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 outline-none focus:border-[#5B21B6] shrink-0 cursor-pointer"
            >
              {WHATSAPP_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              value={customer.phone}
              onChange={(e) => onChangeCustomer('phone', e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder="3015555551"
              className={`flex-1 px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 outline-none transition-colors focus:border-[#5B21B6] focus:ring-2 focus:ring-[#5B21B6]/15 ${
                errors.phone ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
              }`}
            />
          </div>
          {customer.phone.trim() && (
            <p className="text-[11px] font-semibold text-[#16A34A] mt-1">
              Tu WhatsApp: {selectedCountry.name} · {selectedCountry.code} {customer.phone.trim()}
            </p>
          )}
          <p className="text-[11px] text-slate-500 mt-0.5">
            Elige el país de tu WhatsApp y revisa el número completo antes de pagar.
          </p>
          {errors.phone && <p className="text-[11px] text-rose-600 mt-0.5">{errors.phone}</p>}
        </div>

        {/* Enlace interactivo de código de descuento / referido */}
        <div>
          <button
            type="button"
            onClick={() => setShowCouponBox((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5B21B6] hover:text-[#4C1D95] cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>¿Tienes un código de descuento / referido?</span>
          </button>

          {showCouponBox && (
            <div className="mt-2 p-3 rounded-xl bg-white border border-violet-200 space-y-2">
              {appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 text-xs text-[#16A34A] font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Cupón <strong>{appliedCoupon.code}</strong> aplicado (-
                    {formatCurrency(appliedCoupon.discountAmount)})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCouponCodeInput('');
                      onRemoveCoupon();
                    }}
                    className="p-1 rounded-lg hover:bg-emerald-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                    title="Quitar cupón"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Ej. JAVREL10"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono-code uppercase text-slate-900 outline-none focus:border-[#5B21B6]"
                  />
                  <button
                    type="button"
                    disabled={isValidatingCoupon || !couponCodeInput.trim()}
                    onClick={handleCouponApply}
                    className="px-3.5 py-2 rounded-lg bg-[#5B21B6] hover:bg-[#4C1D95] text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {isValidatingCoupon ? '...' : 'Aplicar'}
                  </button>
                </div>
              )}

              {couponStatus && !appliedCoupon && (
                <p
                  className={`text-[11px] font-medium ${
                    couponStatus.type === 'error' ? 'text-rose-600' : 'text-[#16A34A]'
                  }`}
                >
                  {couponStatus.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tarjeta informativa azul suave */}
        <div className="p-3.5 rounded-xl bg-[#EEF4FF] border border-[#BFDBFE] text-xs text-[#1E3A8A] leading-relaxed">
          Confirmaremos tu pedido en <strong>JAVRELSTORE</strong>. Completa tus datos de entrega para continuar.
        </div>

        {/* Nombre y Apellidos en 2 columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1">
              NOMBRE <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={customer.firstName}
              onChange={(e) => onChangeCustomer('firstName', e.target.value)}
              placeholder="Ej. Alejandro"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 outline-none focus:border-[#5B21B6] ${
                errors.firstName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
              }`}
            />
            {errors.firstName && (
              <p className="text-[11px] text-rose-600 mt-0.5">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1">
              APELLIDOS <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={customer.lastName}
              onChange={(e) => onChangeCustomer('lastName', e.target.value)}
              placeholder="Ej. Cardona"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 outline-none focus:border-[#5B21B6] ${
                errors.lastName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
              }`}
            />
            {errors.lastName && (
              <p className="text-[11px] text-rose-600 mt-0.5">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Cédula / Documento */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-700 mb-1">
            CÉDULA / DOCUMENTO <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={customer.document}
            onChange={(e) => onChangeCustomer('document', e.target.value)}
            placeholder="Ej. 1018456789"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-sm text-slate-900 outline-none focus:border-[#5B21B6] ${
              errors.document ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
            }`}
          />
          {errors.document && (
            <p className="text-[11px] text-rose-600 mt-0.5">{errors.document}</p>
          )}
        </div>

        {/* Datos de Envío en Colombia */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 space-y-3">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-600">
            DATOS DE ENVÍO (Despachos en Colombia)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Departamento <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customer.department}
                onChange={(e) => onChangeCustomer('department', e.target.value)}
                placeholder="Ej. Antioquia"
                className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 outline-none focus:border-[#5B21B6] ${
                  errors.department ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                }`}
              />
              {errors.department && (
                <p className="text-[10px] text-rose-600 mt-0.5">{errors.department}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Ciudad / Municipio <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customer.city}
                onChange={(e) => onChangeCustomer('city', e.target.value)}
                placeholder="Ej. Medellín"
                className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 outline-none focus:border-[#5B21B6] ${
                  errors.city ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                }`}
              />
              {errors.city && <p className="text-[10px] text-rose-600 mt-0.5">{errors.city}</p>}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Dirección exacta de entrega <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={customer.address}
              onChange={(e) => onChangeCustomer('address', e.target.value)}
              placeholder="Calle / Carrera, N°, Barrio, Apto o Casa"
              className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 outline-none focus:border-[#5B21B6] ${
                errors.address ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
              }`}
            />
            {errors.address && (
              <p className="text-[10px] text-rose-600 mt-0.5">{errors.address}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Costo de envío:</span>
            <span className={`font-bold ${isFreeShipping ? 'text-[#16A34A]' : 'text-slate-900'}`}>
              {isFreeShipping ? 'GRATIS NACIONAL' : formatCurrency(shippingCost)}
            </span>
          </div>
        </div>

        {/* Botón principal morado ancho completo */}
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full py-3.5 px-4 rounded-xl font-display font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isFormValid
              ? 'bg-[#5B21B6] hover:bg-[#4C1D95] text-white shadow-md shadow-violet-900/20 active:scale-99 cursor-pointer'
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Continuar al pago</span>
        </button>

        <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
          Tus datos están protegidos y cifrados
        </p>
      </div>
    </form>
  );
};
