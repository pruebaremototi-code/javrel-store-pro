import React from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  CreditCard,
  MessageCircle,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  Lock,
} from 'lucide-react';
import { buildWhatsAppUrl } from '../services/storeService';
import { EditableText } from './EditableText';

export const Footer = ({ config = {}, onSecretAdminClick }) => {
  const appVersion = import.meta.env.VITE_APP_VERSION || 'dev';
  const whatsappUrl = buildWhatsAppUrl(
    config?.whatsappNumber,
    `${config?.whatsappWelcomeMsg || '¡Hola JavrelStore!'} Me gustaría consultar información sobre garantías, envíos o catálogo.`
  );

  const brands = [
    'Apple',
    'ASUS ROG',
    'Sony PlayStation',
    'Nintendo',
    'Lenovo Legion',
    'Samsung',
    'Xiaomi',
    'HP',
    'Epson',
    'Razer',
    'Logitech G',
  ];

  return (
    <footer className="relative bg-white border-t border-slate-200/90 text-slate-600 text-xs">
      {/* Carrusel de Marcas Asociadas */}
      <div className="py-6 border-b border-slate-200/70 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] font-mono-code font-bold uppercase tracking-widest text-slate-400 mb-4">
            MARCAS Y ECOSISTEMAS TECNOLÓGICOS AUTORIZADOS
          </p>
          <div className="flex items-center justify-center gap-6 sm:gap-10 flex-wrap opacity-75">
            {brands.map((b, i) => (
              <span
                key={i}
                className="font-display font-semibold text-slate-700 tracking-wider text-xs sm:text-sm hover:text-[#0A6CFF] transition-colors"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Columna 1: Identidad */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0A6CFF] to-[#38BDF8] p-0.5">
                <div className="w-full h-full bg-white rounded-[6px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[#0A6CFF]" />
                </div>
              </div>
              <span className="font-display font-extrabold text-base tracking-tight text-slate-900">
                Javrel<span className="text-[#0A6CFF]">Store</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              <EditableText
                id="footer_description"
                initialText="Especialistas en iPhones, smartphones, computadores gamer, consolas de última generación, periféricos prémium y soporte técnico oficial."
                tag="span"
                multiline
              />
            </p>
            <div className="flex items-center gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Atención WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Columna 2: Categorías Directas */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 mb-3">
              Categorías Principales
            </h4>
            <ul className="space-y-2 text-slate-500">
              <li>
                <a href="#catalogo" className="hover:text-[#0A6CFF] transition-colors">
                  Computadores y Portátiles
                </a>
              </li>
              <li>
                <a href="#catalogo" className="hover:text-[#0A6CFF] transition-colors">
                  Zona Gamer y Periféricos
                </a>
              </li>
              <li>
                <a href="#catalogo" className="hover:text-[#0A6CFF] transition-colors">
                  Consolas de Videojuegos
                </a>
              </li>
              <li>
                <a href="#catalogo" className="hover:text-[#0A6CFF] transition-colors">
                  Smartphones y Telefonía
                </a>
              </li>
              <li>
                <a href="#catalogo" className="hover:text-[#0A6CFF] transition-colors">
                  Impresoras y Escáneres
                </a>
              </li>
              <li>
                <a href="#catalogo" className="hover:text-[#0A6CFF] transition-colors">
                  Accesorios y Cargadores Originales
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 3: Compromiso de Calidad */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 mb-3">
              Garantía y Seguridad
            </h4>
            <ul className="space-y-2.5 text-slate-500">
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0A6CFF] flex-shrink-0" />
                <span>Productos 100% nuevos en empaque sellado</span>
              </li>
              <li className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Guías de rastreo en tiempo real</span>
              </li>
              <li className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span>Soporte posventa directo con asesores</span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>Múltiples métodos de pago bancario y contraentrega</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Contacto */}
          <div>
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-900 mb-3">
              Contacto y Despachos
            </h4>
            <ul className="space-y-2.5 text-slate-500">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <EditableText
                  id="footer_coverage"
                  initialText="Envíos directos a todo el territorio nacional"
                  tag="span"
                />
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <EditableText
                  id="footer_schedule"
                  initialText="Horario: Lunes a Sábado de 8:00 AM a 8:00 PM"
                  tag="span"
                />
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>+{config.whatsappNumber}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra Inferior con Activador Discreto Secreto para Admin */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <p>© {new Date().getFullYear()} {config.storeName}. Todos los derechos reservados.</p>
          
          <div className="flex items-center gap-4">
            <span className="font-mono-code">
              Inspirado en la tecnología visual de Zafara • Arquitectura CMS React + Supabase
            </span>

            <span
              className="font-mono-code text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500"
              title={`Build de producción ${appVersion}`}
            >
              v{appVersion}
            </span>

            {/* Activador secreto de autenticación (candado discreto al pie) */}
            <button
              onClick={onSecretAdminClick}
              className="opacity-20 hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700"
              title="Portal Administrativo Corporativo (Privado)"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
