import React, { useState, useEffect } from 'react';
import {
  Search,
  MessageCircle,
  ShieldCheck,
  Zap,
  Phone,
  Sparkles,
  X,
  ShoppingBag,
  Menu,
} from 'lucide-react';
import { buildWhatsAppUrl } from '../services/storeService';
import { EditableText } from './EditableText';

export const Navbar = ({
  config = {},
  searchTerm = '',
  setSearchTerm,
  cartCount = 0,
  onOpenCart,
  onSecretAdminClick,
  onOpenMobileFilters,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const whatsappLink = buildWhatsAppUrl(
    config.whatsappNumber,
    `${config.whatsappWelcomeMsg || '¡Hola JavrelStore!'} Quiero consultar información sobre sus productos y tecnología.`
  );

  return (
    <header className="relative z-40 w-full transition-all duration-300">
      {/* Barra superior de anuncios */}
      <div className="bg-[#030712] text-white text-xs py-1.5 px-4 shadow-sm font-medium tracking-wide border-b border-white/10">
        <div className="w-full max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#0A6CFF] text-white uppercase tracking-wider">
              JavrelStore
            </span>
            <span className="text-slate-300 text-[11px] sm:text-xs">
              <EditableText
                id="nav_announcement"
                initialText={config.announcementText || '✨ ENVIOS GRATIS A NIVEL NACIONAL | SOPORTE TÉCNICO & LICENCIAS OFICIALES'}
                tag="span"
              />
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <EditableText id="nav_warranty_label" initialText="Garantía Directa Oficial" tag="span" />
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <EditableText id="nav_dispatch_label" initialText="Despacho en 24 Horas" tag="span" />
            </span>
            <a
              href={`tel:${config.whatsappNumber}`}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <Phone className="w-3 h-3 text-[#38BDF8]" />
              Línea Directa: +{config.whatsappNumber}
            </a>
          </div>
        </div>
      </div>

      {/* Barra de navegación principal: Oscura sobre el Hero, Blanca luminosa al bajar */}
      <div
        className={`w-full transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200 shadow-md py-2 sm:py-2.5'
            : 'bg-[#060B18]/90 backdrop-blur-md text-white border-b border-white/10 py-3 sm:py-3.5'
        }`}
      >
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo y Marca JavrelStore */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <a
              href="#"
              onClick={(e) => {
                if (e.detail === 3 && onSecretAdminClick) {
                  e.preventDefault();
                  onSecretAdminClick();
                }
              }}
              className="flex items-center gap-2.5 sm:gap-3 group select-none"
              title="JavrelStore - Tecnología y Soporte"
            >
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#0A6CFF] to-[#38BDF8] p-0.5 shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform flex-shrink-0">
                <div className="w-full h-full bg-[#060B18] rounded-[14px] flex items-center justify-center overflow-hidden">
                  <img
                    src="/zafra/logo-menu.webp"
                    alt="Logo"
                    className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <Sparkles className="w-4 h-4 text-[#38BDF8] hidden only-child:block" />
                </div>
              </div>
              <div>
                <span
                  className={`font-display font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1 ${
                    isScrolled ? 'text-[#0B1430]' : 'text-white'
                  }`}
                >
                  Javrel<span className="text-[#0A6CFF]">Store</span>
                  <span
                    className={`hidden xl:inline-block text-[10px] uppercase font-mono-code font-bold px-1.5 py-0.5 rounded border ${
                      isScrolled
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-white/10 text-blue-200 border-white/20'
                    }`}
                  >
                    STORE
                  </span>
                </span>
                <p
                  className={`text-[9px] sm:text-[10px] tracking-wider uppercase font-semibold hidden sm:block ${
                    isScrolled ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Celulares, Gaming & Periféricos
                </p>
              </div>
            </a>
          </div>

          {/* Buscador reactivo central en Desktop */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              />
              <input
                type="text"
                placeholder="Buscar producto, referencia o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-9 py-2 text-sm rounded-full border outline-none transition-all shadow-inner ${
                  isScrolled
                    ? 'bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-slate-900 placeholder-slate-400 border-slate-200 focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/15'
                    : 'bg-white/10 hover:bg-white/15 focus:bg-white/20 text-white placeholder-slate-400 border-white/20 focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/30'
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Acciones: Carrito, Botón WhatsApp tipo Píldora Blanca Móvil y Menú Hamburguesa */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón Carrito de Compras */}
            <button
              onClick={onOpenCart}
              type="button"
              aria-label="Abrir carrito de compras"
              className={`relative p-2 sm:p-2.5 rounded-full transition-all flex items-center justify-center cursor-pointer active:scale-95 border ${
                isScrolled
                  ? 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 border-slate-200'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md'
              }`}
              title="Ver Carrito de Compras"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 rounded-full bg-[#0A6CFF] text-white text-[10px] font-mono-code font-bold flex items-center justify-center shadow-md animate-scaleUp">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Botón WhatsApp Píldora Estilo JavrelStore */}
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 ${
                isScrolled
                  ? 'bg-[#25D366] text-white hover:bg-[#20BD5A]'
                  : 'bg-white text-slate-900 hover:bg-slate-100 shadow-white/10'
              }`}
            >
              <MessageCircle className={`w-3.5 h-3.5 ${isScrolled ? 'text-white' : 'text-[#0A6CFF]'}`} />
              <span>WhatsApp</span>
            </a>

            {/* Botón Hamburguesa de Menú / Filtros Móviles */}
            <button
              onClick={onOpenMobileFilters}
              className={`p-2 rounded-xl transition-all flex items-center justify-center active:scale-95 border ${
                isScrolled
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
              title="Abrir Categorías y Filtros"
              aria-label="Menú y Filtros"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
