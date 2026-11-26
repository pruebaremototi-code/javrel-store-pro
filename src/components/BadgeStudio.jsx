import React, { useCallback } from 'react';
import {
  Tag,
  AlignLeft,
  AlignRight,
  Sparkles,
  Check,
  RotateCcw,
  CloudUpload,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';

/**
 * Paletas de Colores y Degradados de Lujo para Badges
 */
export const BADGE_PALETTES = [
  {
    id: 'theme',
    label: 'Tema actual',
    desc: 'Hereda el estilo de la tarjeta',
    bg: null,
    text: null,
    preview: 'linear-gradient(135deg, #0A6CFF 0%, #38BDF8 100%)',
    border: 'rgba(255, 255, 255, 0.4)',
    canvasBg: '#0A6CFF',
    canvasText: '#FFFFFF',
  },
  {
    id: 'neon-blue',
    label: 'Azul Neón',
    desc: 'Cian eléctrico y cobalto brillante',
    bg: 'linear-gradient(135deg, #0A6CFF 0%, #00D2FF 100%)',
    text: '#FFFFFF',
    preview: 'linear-gradient(135deg, #0A6CFF 0%, #00D2FF 100%)',
    border: 'rgba(0, 210, 255, 0.6)',
    canvasBg: '#0A6CFF',
    canvasGradTo: '#00D2FF',
    canvasText: '#FFFFFF',
  },
  {
    id: 'gold',
    label: 'Dorado Black Friday',
    desc: 'Negro obsidiana y oro puro',
    bg: 'linear-gradient(135deg, #0d0d0d 0%, #1f1600 50%, #B45309 100%)',
    text: '#FDE047',
    preview: 'linear-gradient(135deg, #111111 0%, #78350F 50%, #F59E0B 100%)',
    border: 'rgba(253, 224, 71, 0.5)',
    canvasBg: '#111111',
    canvasGradTo: '#B45309',
    canvasText: '#FDE047',
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    desc: 'Verde corporativo de alta gama',
    bg: 'linear-gradient(135deg, #022C22 0%, #064E3B 40%, #10B981 100%)',
    text: '#ECFDF5',
    preview: 'linear-gradient(135deg, #064E3B 0%, #10B981 100%)',
    border: 'rgba(52, 211, 153, 0.5)',
    canvasBg: '#064E3B',
    canvasGradTo: '#10B981',
    canvasText: '#ECFDF5',
  },
  {
    id: 'platinum',
    label: 'Platino Cromado',
    desc: 'Metal pulido y blanco plata',
    bg: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 45%, #94A3B8 100%)',
    text: '#0F172A',
    preview: 'linear-gradient(135deg, #F8FAFC 0%, #CBD5E1 50%, #64748B 100%)',
    border: 'rgba(255, 255, 255, 0.9)',
    canvasBg: '#F1F5F9',
    canvasGradTo: '#94A3B8',
    canvasText: '#0F172A',
  },
  {
    id: 'lavender',
    label: 'Morado Lavanda',
    desc: 'Púrpura real y violeta neón',
    bg: 'linear-gradient(135deg, #2E1065 0%, #6D28D9 50%, #8B5CF6 100%)',
    text: '#FFFFFF',
    preview: 'linear-gradient(135deg, #4C1D95 0%, #8B5CF6 100%)',
    border: 'rgba(196, 181, 253, 0.5)',
    canvasBg: '#4C1D95',
    canvasGradTo: '#8B5CF6',
    canvasText: '#FFFFFF',
  },
  {
    id: 'fire',
    label: 'Fuego / Anaranjado',
    desc: 'Carmesí, naranja y ámbar vibrante',
    bg: 'linear-gradient(135deg, #B91C1C 0%, #EA580C 50%, #F59E0B 100%)',
    text: '#FFFFFF',
    preview: 'linear-gradient(135deg, #DC2626 0%, #EA580C 50%, #F59E0B 100%)',
    border: 'rgba(251, 146, 60, 0.6)',
    canvasBg: '#DC2626',
    canvasGradTo: '#F59E0B',
    canvasText: '#FFFFFF',
  },
  {
    id: 'rose-gold',
    label: 'Oro Rosa',
    desc: 'Rosa metalizado y rubí elegante',
    bg: 'linear-gradient(135deg, #831843 0%, #DB2777 50%, #F472B6 100%)',
    text: '#FFFFFF',
    preview: 'linear-gradient(135deg, #9D174D 0%, #F472B6 100%)',
    border: 'rgba(244, 114, 182, 0.5)',
    canvasBg: '#9D174D',
    canvasGradTo: '#F472B6',
    canvasText: '#FFFFFF',
  },
];

/**
 * Posiciones de colocación del badge en la tarjeta
 */
export const BADGE_POSITIONS = [
  { id: 'top-left', label: 'Sup. Izquierda', icon: AlignLeft },
  { id: 'top-right', label: 'Sup. Derecha', icon: AlignRight },
  { id: 'bottom-right', label: 'Inf. Derecha', icon: AlignRight },
  { id: 'bottom-left', label: 'Inf. Izquierda', icon: AlignLeft },
];

/**
 * Sugerencias rápidas para condición
 */
export const CONDITION_SUGGESTIONS = [
  'NUEVO',
  'SEMINUEVO',
  'USADO',
  'POCO USO',
  'REACONDICIONADO',
  'OUTLET',
];

/**
 * Sugerencias rápidas para promoción comercial
 */
export const PROMO_SUGGESTIONS = [
  'BLACK FRIDAY',
  'SUPER OFERTA',
  'LIQUIDACIÓN',
  'PROMOCIÓN',
  'DESTACADO',
  'ÚLTIMAS UNIDADES',
];

/**
 * Extrae el objeto badgeConfig guardado (si existe en product.badgeConfig o product.specs)
 */
const readSavedBadgeConfig = (product) => {
  if (product?.badgeConfig && typeof product.badgeConfig === 'object') {
    return product.badgeConfig;
  }
  const specs = Array.isArray(product?.specs) ? product.specs : [];
  const found = specs.find(
    (s) => s && typeof s === 'object' && String(s.key || s.title || '').toUpperCase() === 'BADGE_CONFIG'
  );
  if (found?.value) {
    try {
      const parsed = typeof found.value === 'string' ? JSON.parse(found.value) : found.value;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch {
      // Ignorar JSON inválido
    }
  }
  return null;
};

/**
 * Obtener estado por defecto de cada slot
 */
export const getDefaultBadgeSlot = (slot, product) => {
  const saved = readSavedBadgeConfig(product);
  if (saved?.[slot] && typeof saved[slot] === 'object') {
    return {
      enabled: Boolean(saved[slot].enabled),
      text: String(saved[slot].text || '').trim(),
      position: saved[slot].position || (slot === 'primary' ? 'top-left' : 'bottom-right'),
      palette: saved[slot].palette || (slot === 'primary' ? 'neon-blue' : 'emerald'),
    };
  }

  if (slot === 'primary') {
    const rawTag = product?.commercialTag || product?.badge || '';
    const hasTag = Boolean(rawTag && !/^(nuevo|usado|seminuevo)$/i.test(rawTag));
    return {
      enabled: hasTag || Boolean(product?.originalPrice && product.originalPrice > product.price),
      text: hasTag
        ? rawTag
        : product?.originalPrice && product.originalPrice > product.price
          ? `-${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%`
          : 'OFERTA',
      position: 'top-left',
      palette: hasTag && /black\s*friday/i.test(rawTag) ? 'gold' : 'neon-blue',
    };
  }

  // secondary = Condición física
  const rawCond = product?.condition;
  return {
    enabled: Boolean(rawCond),
    text: rawCond || 'NUEVO',
    position: 'bottom-right',
    palette: rawCond === 'Seminuevo' ? 'gold' : rawCond === 'Usado' ? 'platinum' : 'emerald',
  };
};

/**
 * Resolver estilo visual de React/Tailwind para el badge
 */
export const resolveBadgeStyle = (paletteId, themeBadgeBg, themeBadgeText) => {
  const p = BADGE_PALETTES.find((pal) => pal.id === paletteId);
  if (!p || paletteId === 'theme') {
    return {
      background: themeBadgeBg || '#0A6CFF',
      color: themeBadgeText || '#FFFFFF',
      border: 'rgba(255,255,255,0.4)',
      isGradient: false,
    };
  }
  return {
    background: p.bg,
    color: p.text,
    border: p.border,
    isGradient: Boolean(p.bg),
    canvasBg: p.canvasBg,
    canvasGradTo: p.canvasGradTo,
    canvasText: p.canvasText,
  };
};

/**
 * Componente Principal: Panel de Control "Etiquetas & Badges Studio"
 */
export const BadgeStudio = ({
  badgeConfig,
  onChange,
  product,
  onSaveToSupabase,
  isSaving = false,
  saveSuccess = false,
  activeEditingSlot = null,
  setActiveEditingSlot = () => {},
}) => {
  const updateSlot = useCallback(
    (slot, field, value) => {
      onChange({
        ...badgeConfig,
        [slot]: { ...badgeConfig[slot], [field]: value },
      });
    },
    [badgeConfig, onChange]
  );

  const resetSlot = useCallback(
    (slot) => {
      onChange({
        ...badgeConfig,
        [slot]: getDefaultBadgeSlot(slot, product),
      });
    },
    [badgeConfig, onChange, product]
  );

  return (
    <div className="space-y-3.5">
      {/* Indicador de ayuda interactiva */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-blue-50/70 border border-blue-100/80 rounded-xl px-3 py-2">
        <span className="flex items-center gap-1.5 font-semibold text-[#0A6CFF]">
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          Haz clic en cualquier badge de la tarjeta para editarlo
        </span>
      </div>

      {/* Slot 1: Badge Comercial / Promoción */}
      <BadgeSlotSection
        slot="primary"
        title="Etiqueta Comercial / Promoción"
        subtitle="Black Friday, Descuento, Oferta Especial, etc."
        icon={Flame}
        slotData={badgeConfig?.primary || getDefaultBadgeSlot('primary', product)}
        suggestions={PROMO_SUGGESTIONS}
        isActive={activeEditingSlot === 'primary'}
        onFocusSlot={() => setActiveEditingSlot('primary')}
        onUpdate={(field, val) => updateSlot('primary', field, val)}
        onReset={() => resetSlot('primary')}
      />

      {/* Slot 2: Condición del Artículo */}
      <BadgeSlotSection
        slot="secondary"
        title="Condición del Artículo"
        subtitle="Nuevo, Seminuevo, Usado, Poco Uso, etc."
        icon={ShieldCheck}
        slotData={badgeConfig?.secondary || getDefaultBadgeSlot('secondary', product)}
        suggestions={CONDITION_SUGGESTIONS}
        isActive={activeEditingSlot === 'secondary'}
        onFocusSlot={() => setActiveEditingSlot('secondary')}
        onUpdate={(field, val) => updateSlot('secondary', field, val)}
        onReset={() => resetSlot('secondary')}
      />

      {/* Botón de Guardado Atómico en Supabase & Catálogo */}
      {onSaveToSupabase && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onSaveToSupabase}
            disabled={isSaving}
            className={`w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-[#0A6CFF] to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white active:scale-98'
            } disabled:opacity-60`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando en Supabase y Catálogo...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>¡Sincronizado atómicamente en Supabase!</span>
              </>
            ) : (
              <>
                <CloudUpload className="w-4 h-4" />
                <span>Guardar Cambios en Supabase y Catálogo</span>
              </>
            )}
          </button>
          <p className="mt-1.5 text-center text-[10px] text-slate-400">
            Actualiza inmediatamente en Supabase, eliminando caché en incógnito y otros dispositivos.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Editor individual para un Slot de Badge
 */
const BadgeSlotSection = ({
  slot,
  title,
  subtitle,
  icon: Icon,
  slotData,
  suggestions = [],
  isActive = false,
  onFocusSlot,
  onUpdate,
  onReset,
}) => {
  const currentPalette = BADGE_PALETTES.find((p) => p.id === slotData.palette) || BADGE_PALETTES[0];

  return (
    <div
      onClick={onFocusSlot}
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'border-[#0A6CFF] ring-2 ring-[#0A6CFF]/20 bg-white shadow-md'
          : 'border-slate-200 bg-white/90 hover:border-slate-300'
      }`}
    >
      {/* Cabecera del Slot con Switch y Reset */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              slotData.enabled ? 'bg-blue-600/10 text-[#0A6CFF]' : 'bg-slate-200 text-slate-400'
            }`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-bold text-slate-800 truncate">{title}</span>
            <span className="block text-[10px] text-slate-400 truncate leading-none">{subtitle}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            title="Restaurar valor predeterminado"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={slotData.enabled}
            onClick={(e) => {
              e.stopPropagation();
              onUpdate('enabled', !slotData.enabled);
            }}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              slotData.enabled ? 'bg-[#0A6CFF]' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                slotData.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Controles de Configuración cuando está activo */}
      {slotData.enabled && (
        <div className="p-3.5 space-y-3 animate-fadeIn">
          {/* Input de Texto Editable */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-500">
                Texto del Badge
              </label>
              <span className="text-[9px] text-slate-400 font-mono-code">
                {slotData.text.length}/28 caracteres
              </span>
            </div>
            <input
              type="text"
              value={slotData.text}
              onChange={(e) => onUpdate('text', e.target.value.toUpperCase())}
              maxLength={28}
              placeholder={slot === 'primary' ? 'Ej. BLACK FRIDAY, -30% OFF' : 'Ej. SEMINUEVO, USADO'}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-[#0A6CFF]/20 focus:border-[#0A6CFF] transition-all uppercase tracking-wide"
            />

            {/* Chips de Sugerencia Rápida */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => onUpdate('text', sug)}
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                    slotData.text === sug
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Posicionamiento Dinámico */}
          <div>
            <label className="block text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Posición en la Tarjeta
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {BADGE_POSITIONS.map((pos) => {
                const isSelected = slotData.position === pos.id;
                const PosIcon = pos.icon;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => onUpdate('position', pos.id)}
                    aria-pressed={isSelected}
                    className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0A6CFF] bg-blue-50 text-[#0A6CFF] ring-1 ring-[#0A6CFF]/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <PosIcon className="w-3 h-3" />
                    <span>{pos.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Paletas y Degradados de Lujo */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-500">
                Paleta y Degradado Premium
              </label>
              <span className="text-[10px] font-bold text-slate-700">
                {currentPalette.label}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {BADGE_PALETTES.map((pal) => {
                const isSelected = slotData.palette === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => onUpdate('palette', pal.id)}
                    title={`${pal.label} — ${pal.desc}`}
                    aria-pressed={isSelected}
                    className={`group flex flex-col items-center gap-1 rounded-xl border p-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0A6CFF] ring-2 ring-[#0A6CFF]/30 bg-blue-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-full h-5 rounded-lg shadow-sm border border-white/60"
                      style={{ background: pal.preview }}
                    />
                    <span className="text-[9px] font-bold text-slate-700 leading-tight text-center truncate w-full">
                      {pal.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vista Previa Instantánea del Badge */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Vista Previa:</span>
            <div
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm border"
              style={{
                background: currentPalette.bg || '#0A6CFF',
                color: currentPalette.text || '#FFFFFF',
                borderColor: currentPalette.border || 'rgba(255,255,255,0.4)',
              }}
            >
              <Tag className="w-2.5 h-2.5" />
              <span>{slotData.text || 'SIN TEXTO'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
