import React from 'react';
import {
  Sparkles,
  MessageCircle,
  ArrowRight,
  ShieldCheck,
  Truck,
  Award,
  Zap,
} from 'lucide-react';
import { buildWhatsAppUrl } from '../services/storeService';
import { EditableText } from './EditableText';
import { ParticleTitle } from './ParticleTitle';

export const HeroBanner = ({
  config = {},
  onExploreClick,
  isAdmin,
  onUpdateConfig,
}) => {
  const whatsappUrl = buildWhatsAppUrl(
    config?.whatsappNumber,
    `${config?.whatsappWelcomeMsg || '¡Hola JavrelStore!'} Me gustaría recibir asesoría personalizada para adquirir tecnología y celulares.`
  );

  return (
    <div className="relative overflow-hidden bg-slate-950/25 backdrop-blur-md text-white border-b border-white/10">
      {/* Fondo Inmersivo Translúcido con Video de Fondo */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover filter brightness-[0.75] contrast-[1.08] opacity-60"
        >
          <source src="/zafra/portada-pc.mp4" type="video/mp4" />
        </video>

        {/* Capas de Cristal Real con Transparencia Luminosa */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_35%,rgba(10,108,255,0.22)_0%,rgba(15,23,42,0.35)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-transparent to-slate-950/40" />
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-[#F8FAFC]" />
      </div>

      {/* Contenido Limpio Flotando Libremente sobre el Fondo de Cristal */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-28 text-center">
        {/* Badge Flotante Inmersivo Platino / Neón */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-white/10 border border-white/20 text-slate-100 mb-6 shadow-md backdrop-blur-md hover:scale-105 transition-transform">
          <span className="w-2 h-2 rounded-full bg-[#0A6CFF] animate-ping" />
          <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
          <EditableText
            value={config.featuredBadge || 'COLECCIÓN OFICIAL JAVRELSTORE 2026'}
            onChange={(val) => onUpdateConfig({ ...config, featuredBadge: val })}
            isAdmin={isAdmin}
            as="span"
            className="font-mono-code uppercase font-bold text-[11px] text-slate-100 tracking-wider"
          />
        </div>

        {/* Título Principal Interactivo con Nube de Partículas Multicolores al Hover */}
        <div className="mb-6 max-w-4xl mx-auto">
          <ParticleTitle
            text={config.heroTitle || 'Tecnología Prémium al Alcance de tus Manos'}
            onChange={(val) => onUpdateConfig({ ...config, heroTitle: val })}
            isAdmin={isAdmin}
          />
        </div>

        {/* Subtítulo Descriptivo Nítido */}
        <p className="text-sm sm:text-base md:text-lg text-slate-200 font-normal leading-relaxed mb-8 sm:mb-10 max-w-2xl mx-auto drop-shadow-sm">
          <EditableText
            value={
              config.heroSubtitle ||
              'Encuentra computadores de alto rendimiento, consolas, zona gamer y smartphones originales con atención directa e inmediata por WhatsApp.'
            }
            onChange={(val) => onUpdateConfig({ ...config, heroSubtitle: val })}
            isAdmin={isAdmin}
            as="span"
            multiline
          />
        </p>

        {/* Botones de Conversión Prémium Flotantes */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mb-12 sm:mb-16">
          <button
            onClick={onExploreClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full text-xs sm:text-sm font-black text-white cta-violet hover:scale-102 transition-all group cursor-pointer"
          >
            <span>{config.heroCtaText || 'Explorar Catálogo'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-blue-200" />
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-xs sm:text-sm font-black text-white cta-emerald hover:scale-102 transition-all group"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366] group-hover:scale-110 transition-transform" />
            <span>{config.heroSecondaryText || 'Chatear con un Asesor'}</span>
          </a>
        </div>

        {/* Iconos Flotantes Inferiores de Confianza (Glassmorphism Sutil) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto pt-6 border-t border-white/10">
          <div className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-sm hover:border-blue-400/50 hover:bg-white/[0.12] transition-all">
            <ShieldCheck className="w-5 h-5 text-[#38BDF8] flex-shrink-0" />
            <span className="text-sm font-bold text-slate-100">100% Originales</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-sm hover:border-emerald-400/50 hover:bg-white/[0.12] transition-all">
            <Truck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-bold text-slate-100">Envíos Asegurados</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 shadow-sm hover:border-amber-400/50 hover:bg-white/[0.12] transition-all">
            <Award className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="text-sm font-bold text-slate-100">Garantía Directa</span>
          </div>
          <div className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/15 shadow-sm hover:border-purple-400/50 hover:bg-white/[0.12] transition-all">
            <Zap className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <span className="text-sm font-bold text-slate-100">Despacho 24h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
