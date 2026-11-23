import React from 'react';
import {
  CreditCard,
  ShieldCheck,
  Truck,
  Lock,
  Building,
  Smartphone,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { EditableText } from './EditableText';

export const PaymentMethodsSection = () => {
  const methods = [
    {
      id: 'pm_card_0',
      defaultTitle: 'Tarjetas Débito / Crédito',
      defaultDesc: 'Visa, Mastercard, Amex, Diners hasta en 36 cuotas.',
      defaultBadge: 'PROCESO SEGURO',
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      id: 'pm_card_1',
      defaultTitle: 'PSE & Transferencias',
      defaultDesc: 'Débito directo desde cualquier cuenta bancaria colombiana.',
      defaultBadge: 'SIN COMISIÓN',
      icon: Building,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      id: 'pm_card_2',
      defaultTitle: 'Billeteras Móviles',
      defaultDesc: 'Nequi, Daviplata y Bancolombia a la mano al instante.',
      defaultBadge: 'PAGO INMEDIATO',
      icon: Smartphone,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      id: 'pm_card_3',
      defaultTitle: 'Pago Contra Entrega',
      defaultDesc: 'Pagas en efectivo cuando recibes el producto en tu domicilio.',
      defaultBadge: '100% CONFIANZA',
      icon: Truck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <section className="relative py-14 bg-gradient-to-b from-[#F8FAFC] via-white to-[#F8FAFC] border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cabecera de la Sección con Edición In-Context */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono-code font-bold uppercase tracking-wider bg-blue-50 text-[#0A6CFF] border border-blue-200 mb-3 shadow-xs">
            <Lock className="w-3.5 h-3.5" />
            <EditableText
              id="payment_badge"
              initialText="Transacciones Protegidas con Encriptación SSL 256-Bit"
              tag="span"
            />
          </div>
          <EditableText
            id="payment_title"
            initialText="Medios de Pago Seguros y Facilidades de Compra"
            tag="h2"
            className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight block"
          />
          <EditableText
            id="payment_subtitle"
            initialText="Elige la modalidad que mejor se adapte a ti con respaldo oficial y confirmación inmediata vía WhatsApp."
            tag="p"
            className="text-xs sm:text-sm text-slate-500 mt-2 block"
          />
        </div>

        {/* Tarjetas de Medios de Pago con Textos Editables In-Context */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {methods.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="group relative p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-[#0A6CFF]/40 hover:shadow-xl transition-all duration-300 transform-gpu hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${m.bg} ${m.color} transition-transform group-hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    <EditableText
                      id={`${m.id}_badge`}
                      initialText={m.defaultBadge}
                      tag="span"
                    />
                  </span>
                </div>

                <EditableText
                  id={`${m.id}_title`}
                  initialText={m.defaultTitle}
                  tag="h3"
                  className="font-display font-semibold text-base text-slate-900 mb-2 block"
                />
                <EditableText
                  id={`${m.id}_desc`}
                  initialText={m.defaultDesc}
                  tag="p"
                  className="text-xs text-slate-500 leading-relaxed block"
                />
              </div>
            );
          })}
        </div>

        {/* Barra de Certificaciones y Respaldo Editables */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-around gap-4 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <EditableText
              id="pm_guarantee_1"
              initialText="Garantía Oficial de Fábrica (12 Meses)"
              tag="span"
            />
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0A6CFF]" />
            <EditableText
              id="pm_guarantee_2"
              initialText="Facturación Legal y Certificados de Origen"
              tag="span"
            />
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-500" />
            <EditableText
              id="pm_guarantee_3"
              initialText="Despacho Asegurado con Guía Nacional"
              tag="span"
            />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <EditableText
              id="pm_guarantee_4"
              initialText="Atención Personalizada 24/7"
              tag="span"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
