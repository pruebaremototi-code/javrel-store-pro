import React from 'react';
import { Sparkles, Flame, Heart, PartyPopper, Zap, Tag, ArrowRight } from 'lucide-react';

const CAMPAIGN_ICONS = {
  black_friday: Flame,
  anniversary: PartyPopper,
  valentine: Heart,
  cyber: Zap,
  default: Sparkles,
};

export const CampaignBanner = ({ campaign, onExploreClick }) => {
  if (!campaign || !campaign.enabled) return null;

  const IconComponent = CAMPAIGN_ICONS[campaign.theme] || Sparkles;

  // Temas de colores festivos de alto impacto
  let bgGradient = 'from-rose-600 via-purple-600 to-indigo-700';
  if (campaign.theme === 'black_friday') {
    bgGradient = 'from-red-600 via-neutral-900 to-black';
  } else if (campaign.theme === 'anniversary') {
    bgGradient = 'from-blue-600 via-amber-500 to-indigo-900';
  } else if (campaign.theme === 'valentine') {
    bgGradient = 'from-pink-600 via-rose-500 to-red-700';
  } else if (campaign.theme === 'cyber') {
    bgGradient = 'from-cyan-600 via-blue-700 to-purple-900';
  }

  // Estilo de color personalizado si el usuario seleccionó un color corporativo
  const bannerStyle = campaign.customColor
    ? {
        background: `linear-gradient(90deg, ${campaign.customColor} 0%, ${campaign.customColor}d9 55%, #0B1430 100%)`,
        borderColor: `${campaign.customColor}66`,
      }
    : undefined;

  return (
    <aside
      aria-label="Campaña promocional"
      style={bannerStyle}
      className={`w-full ${!campaign.customColor ? `bg-gradient-to-r ${bgGradient}` : ''} text-white py-2.5 px-4 shadow-xl border-b border-white/10 relative overflow-hidden transition-all duration-300`}
    >
      {/* Resplandor animado de fondo */}
      <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)] pointer-events-none" />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs relative z-10">
        <div className="flex items-center gap-2.5 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-md shadow-xs animate-bounce">
            <IconComponent className="w-3.5 h-3.5 text-white" />
          </span>

          <span className="font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-slate-900 text-[10px] shadow-sm">
            {campaign.badge || 'PROMO ESPECIAL'}
          </span>

          <p className="font-semibold text-white/95 text-xs truncate">
            {campaign.bannerText || `¡Campaña ${campaign.name} activa! Aprovecha hasta ${campaign.discountPercent || 20}% OFF.`}
          </p>
        </div>

        {onExploreClick && (
          <button
            onClick={onExploreClick}
            className="flex-shrink-0 hidden sm:inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-white text-slate-900 font-bold text-[11px] hover:bg-slate-100 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Ver Ofertas</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </aside>
  );
};
