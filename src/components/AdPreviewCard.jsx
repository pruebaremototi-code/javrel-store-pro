import React, { useMemo } from 'react';
import { ArrowRight, BadgeCheck, ShieldCheck, Sparkles, Tag, Edit3 } from 'lucide-react';
import { formatCurrency } from '../services/storeService';
import { sanitizeCommercialText } from '../services/textUtils';
import { STORE_LOGO_URL } from '../services/promoCardService';
import { resolveBadgeStyle } from './BadgeStudio';

/**
 * Tarjeta comercial interactiva del Centro de Difusión.
 * Refleja en tiempo real exactamente lo que verá el cliente: imagen,
 * nombre, descripción breve, precio regular, oferta y CTA.
 */

const THEME_STYLES = {
  classic: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#F8FAFF] via-white to-[#E8F1FF] border-slate-200 text-slate-950',
    muted: 'text-slate-700',
    subtle: 'text-slate-600',
    regular: 'text-slate-500',
    panel:
      'border-white/80 bg-white/75 backdrop-blur-sm shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]',
    imagePanel:
      'border-white/90 bg-white shadow-[0_26px_55px_-32px_rgba(15,23,42,0.55)]',
    badge: 'bg-[#0A6CFF] text-white',
    statusPill: 'bg-blue-50 text-[#0A6CFF]',
    savings: 'bg-emerald-50 text-emerald-700',
    cta: 'bg-[#0A6CFF] text-white hover:bg-[#0056D2]',
    guarantee: 'border-blue-100 bg-blue-50 text-[#0A6CFF]',
    accentText: 'text-[#0A6CFF]',
    glowA: 'bg-[#0A6CFF]/10',
    glowB: 'bg-[#38BDF8]/15',
  },
  offer: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#061A3B] via-[#0A2E73] to-[#0A6CFF] border-white/15 text-white',
    muted: 'text-white/85',
    subtle: 'text-white/70',
    regular: 'text-white/55',
    panel:
      'border-white/15 bg-white/10 backdrop-blur-md shadow-[0_20px_45px_-30px_rgba(0,0,0,0.8)]',
    imagePanel:
      'border-white/30 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.85)]',
    badge: 'bg-[#FDE047] text-[#0A2E73]',
    statusPill: 'bg-white/15 text-white',
    savings: 'bg-white/15 text-white',
    cta: 'bg-white text-[#0A2E73] hover:bg-blue-50',
    guarantee: 'border-white/20 bg-white/10 text-white',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-white/20',
    glowB: 'bg-[#FDE047]/15',
  },
  cobalt: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#020617] via-[#041C4F] to-[#0A6CFF] border-cyan-300/25 text-white',
    muted: 'text-cyan-50/85',
    subtle: 'text-cyan-100/65',
    regular: 'text-cyan-100/55',
    panel:
      'border-cyan-300/25 bg-white/[0.08] backdrop-blur-md shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-cyan-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#22D3EE] text-[#031633]',
    statusPill: 'bg-cyan-300/15 text-cyan-100',
    savings: 'bg-cyan-300/15 text-cyan-100',
    cta: 'bg-[#22D3EE] text-[#031633] hover:bg-cyan-300',
    guarantee: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#22D3EE]/25',
    glowB: 'bg-[#A855F7]/20',
  },
  obsidian: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#050509] via-[#12121C] to-[#2A1B3D] border-white/15 text-white',
    muted: 'text-white/85',
    subtle: 'text-white/60',
    regular: 'text-white/50',
    panel:
      'border-amber-300/20 bg-white/[0.06] backdrop-blur-md shadow-[0_20px_45px_-30px_rgba(0,0,0,0.95)]',
    imagePanel:
      'border-amber-200/30 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.95)]',
    badge: 'bg-[#FBBF24] text-[#1C1917]',
    statusPill: 'bg-amber-300/15 text-amber-100',
    savings: 'bg-amber-300/15 text-amber-100',
    cta: 'bg-[#FBBF24] text-[#1C1917] hover:bg-amber-300',
    guarantee: 'border-amber-300/25 bg-amber-300/10 text-amber-50',
    accentText: 'text-[#FBBF24]',
    glowA: 'bg-[#FBBF24]/20',
    glowB: 'bg-[#A855F7]/20',
  },
  emerald: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#022C22] via-[#064E3B] to-[#10B981] border-emerald-200/25 text-white',
    muted: 'text-emerald-50/90',
    subtle: 'text-emerald-100/65',
    regular: 'text-emerald-100/55',
    panel:
      'border-emerald-200/25 bg-white/[0.08] backdrop-blur-md shadow-[0_20px_45px_-30px_rgba(0,0,0,0.8)]',
    imagePanel:
      'border-emerald-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.85)]',
    badge: 'bg-[#A7F3D0] text-[#064E3B]',
    statusPill: 'bg-emerald-200/15 text-emerald-50',
    savings: 'bg-emerald-200/15 text-emerald-50',
    cta: 'bg-[#ECFDF5] text-[#064E3B] hover:bg-white',
    guarantee: 'border-emerald-200/30 bg-emerald-200/10 text-emerald-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#34D399]/25',
    glowB: 'bg-[#FACC15]/15',
  },
  sunset: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#2E1065] via-[#9D174D] to-[#F97316] border-white/20 text-white',
    muted: 'text-white/90',
    subtle: 'text-white/70',
    regular: 'text-white/55',
    panel:
      'border-white/20 bg-white/10 backdrop-blur-md shadow-[0_20px_45px_-30px_rgba(0,0,0,0.85)]',
    imagePanel:
      'border-amber-200/30 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.85)]',
    badge: 'bg-[#FDE047] text-[#7C2D12]',
    statusPill: 'bg-white/15 text-white',
    savings: 'bg-white/15 text-white',
    cta: 'bg-white text-[#7C2D12] hover:bg-orange-50',
    guarantee: 'border-white/25 bg-white/10 text-white',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#FB923C]/30',
    glowB: 'bg-[#F472B6]/25',
  },
  aurora: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#1E1B4B] via-[#5B21B6] to-[#7C3AED] border-cyan-300/25 text-white',
    muted: 'text-violet-50/90',
    subtle: 'text-violet-100/70',
    regular: 'text-violet-100/60',
    panel:
      'border-cyan-300/25 bg-white/[0.08] backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-cyan-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#22D3EE] text-[#0B1026]',
    statusPill: 'bg-cyan-300/15 text-cyan-100',
    savings: 'bg-cyan-300/15 text-cyan-100',
    cta: 'bg-[#22D3EE] text-[#0B1026] hover:bg-cyan-300',
    guarantee: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#22D3EE]/25',
    glowB: 'bg-[#F472B6]/20',
  },
  midnight: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#334155] border-slate-300/20 text-white',
    muted: 'text-slate-100/90',
    subtle: 'text-slate-300/75',
    regular: 'text-slate-300/60',
    panel:
      'border-slate-300/20 bg-white/[0.07] backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.95)]',
    imagePanel:
      'border-slate-200/30 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.95)]',
    badge: 'bg-[#E2E8F0] text-[#0F172A]',
    statusPill: 'bg-slate-300/15 text-slate-100',
    savings: 'bg-slate-300/15 text-slate-100',
    cta: 'bg-[#E2E8F0] text-[#0F172A] hover:bg-white',
    guarantee: 'border-slate-300/25 bg-slate-300/10 text-slate-100',
    accentText: 'text-[#7DD3FC]',
    glowA: 'bg-[#38BDF8]/20',
    glowB: 'bg-[#E2E8F0]/15',
  },
  ruby: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#450A0A] via-[#991B1B] to-[#F43F5E] border-rose-300/25 text-white',
    muted: 'text-rose-50/90',
    subtle: 'text-rose-100/70',
    regular: 'text-rose-100/60',
    panel:
      'border-amber-300/25 bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-amber-200/30 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#FDE047] text-[#7F1D1D]',
    statusPill: 'bg-amber-300/15 text-amber-100',
    savings: 'bg-amber-300/15 text-amber-100',
    cta: 'bg-white text-[#7F1D1D] hover:bg-rose-50',
    guarantee: 'border-white/25 bg-white/10 text-white',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#FB7185]/25',
    glowB: 'bg-[#FDE047]/15',
  },
  aqua: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#042F2E] via-[#0F766E] to-[#14B8A6] border-teal-200/25 text-white',
    muted: 'text-teal-50/90',
    subtle: 'text-teal-100/70',
    regular: 'text-teal-100/60',
    panel:
      'border-teal-200/25 bg-white/[0.08] backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.85)]',
    imagePanel:
      'border-teal-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.85)]',
    badge: 'bg-[#5EEAD4] text-[#064E3B]',
    statusPill: 'bg-teal-200/15 text-teal-50',
    savings: 'bg-teal-200/15 text-teal-50',
    cta: 'bg-[#ECFDF5] text-[#064E3B] hover:bg-white',
    guarantee: 'border-teal-200/30 bg-teal-200/10 text-teal-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#2DD4BF]/25',
    glowB: 'bg-[#FACC15]/15',
  },
  royal: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#2E1065] via-[#6D28D9] to-[#C026D3] border-fuchsia-300/25 text-white',
    muted: 'text-fuchsia-50/90',
    subtle: 'text-fuchsia-100/70',
    regular: 'text-fuchsia-100/60',
    panel:
      'border-amber-300/20 bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-amber-200/30 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#FDE047] text-[#4C1D95]',
    statusPill: 'bg-fuchsia-300/15 text-fuchsia-100',
    savings: 'bg-fuchsia-300/15 text-fuchsia-100',
    cta: 'bg-white text-[#4C1D95] hover:bg-fuchsia-50',
    guarantee: 'border-white/25 bg-white/10 text-white',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#C026D3]/25',
    glowB: 'bg-[#FDE047]/15',
  },
  graphite: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#0B0F19] via-[#1F2937] to-[#4B5563] border-lime-300/20 text-white',
    muted: 'text-slate-100/90',
    subtle: 'text-slate-300/70',
    regular: 'text-slate-300/55',
    panel:
      'border-lime-300/20 bg-white/[0.06] backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.95)]',
    imagePanel:
      'border-lime-200/25 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.95)]',
    badge: 'bg-[#A3E635] text-[#14200A]',
    statusPill: 'bg-lime-300/15 text-lime-100',
    savings: 'bg-lime-300/15 text-lime-100',
    cta: 'bg-[#A3E635] text-[#14200A] hover:bg-lime-300',
    guarantee: 'border-lime-300/25 bg-lime-300/10 text-lime-50',
    accentText: 'text-[#A3E635]',
    glowA: 'bg-[#A3E635]/20',
    glowB: 'bg-[#64748B]/25',
  },
  habano: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#FBF3E7] via-[#EAD3B4] to-[#C79A6B] border-amber-900/15 text-[#2B1608]',
    muted: 'text-[#3F2410]',
    subtle: 'text-[#5A3A1E]',
    regular: 'text-[#6B4A2B]',
    panel:
      'border-white/80 bg-white/70 backdrop-blur-sm ring-1 ring-inset ring-white/40 shadow-[0_18px_40px_-30px_rgba(69,26,3,0.5)]',
    imagePanel:
      'border-white/90 bg-white shadow-[0_26px_55px_-32px_rgba(69,26,3,0.55)]',
    badge: 'bg-[#92400E] text-[#FFF7ED]',
    statusPill: 'bg-amber-100 text-[#7C2D12]',
    savings: 'bg-amber-100 text-[#7C2D12]',
    cta: 'bg-[#7C2D12] text-white hover:bg-[#92400E]',
    guarantee: 'border-amber-900/15 bg-amber-100/80 text-[#7C2D12]',
    accentText: 'text-[#9A3412]',
    glowA: 'bg-[#C79A6B]/30',
    glowB: 'bg-[#FDE68A]/30',
  },
  celeste: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#EFF8FF] via-[#BFE3FF] to-[#7CC7FF] border-sky-700/15 text-[#082F49]',
    muted: 'text-[#0C3B57]',
    subtle: 'text-[#155E75]',
    regular: 'text-[#475569]',
    panel:
      'border-white/80 bg-white/75 backdrop-blur-sm ring-1 ring-inset ring-white/50 shadow-[0_18px_40px_-30px_rgba(3,105,161,0.45)]',
    imagePanel:
      'border-white/90 bg-white shadow-[0_26px_55px_-32px_rgba(3,105,161,0.5)]',
    badge: 'bg-[#0EA5E9] text-[#032B44]',
    statusPill: 'bg-sky-100 text-[#075985]',
    savings: 'bg-sky-100 text-[#075985]',
    cta: 'bg-[#0284C7] text-white hover:bg-[#0369A1]',
    guarantee: 'border-sky-700/15 bg-sky-100/80 text-[#075985]',
    accentText: 'text-[#0369A1]',
    glowA: 'bg-[#7CC7FF]/40',
    glowB: 'bg-white/50',
  },
  violeta: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#1E0A3C] via-[#4C1D95] to-[#7E22CE] border-purple-300/25 text-white',
    muted: 'text-purple-50/90',
    subtle: 'text-purple-100/70',
    regular: 'text-purple-100/60',
    panel:
      'border-purple-300/30 bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-purple-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#C084FC] text-[#2E1065]',
    statusPill: 'bg-purple-300/15 text-purple-100',
    savings: 'bg-purple-300/15 text-purple-100',
    cta: 'bg-[#F5D0FE] text-[#3B0764] hover:bg-fuchsia-100',
    guarantee: 'border-purple-300/30 bg-purple-300/10 text-purple-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#A855F7]/25',
    glowB: 'bg-[#F472B6]/20',
  },
  lavanda: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#FAF5FF] via-[#E9D5FF] to-[#C4B5FD] border-violet-700/15 text-[#2E1065]',
    muted: 'text-[#4C1D95]',
    subtle: 'text-[#5B21B6]',
    regular: 'text-[#6B7280]',
    panel:
      'border-white/80 bg-white/75 backdrop-blur-sm ring-1 ring-inset ring-white/50 shadow-[0_18px_40px_-30px_rgba(76,29,149,0.4)]',
    imagePanel:
      'border-white/90 bg-white shadow-[0_26px_55px_-32px_rgba(76,29,149,0.45)]',
    badge: 'bg-[#8B5CF6] text-white',
    statusPill: 'bg-violet-100 text-[#5B21B6]',
    savings: 'bg-violet-100 text-[#5B21B6]',
    cta: 'bg-[#6D28D9] text-white hover:bg-[#5B21B6]',
    guarantee: 'border-violet-700/15 bg-violet-100/80 text-[#5B21B6]',
    accentText: 'text-[#6D28D9]',
    glowA: 'bg-[#C4B5FD]/50',
    glowB: 'bg-[#FBCFE8]/40',
  },
  naranja: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#FFF7ED] via-[#FFD9A8] to-[#FB923C] border-orange-800/15 text-[#3B1500]',
    muted: 'text-[#5A2600]',
    subtle: 'text-[#7C3A0A]',
    regular: 'text-[#6B4A2B]',
    panel:
      'border-white/80 bg-white/70 backdrop-blur-sm ring-1 ring-inset ring-white/40 shadow-[0_18px_40px_-30px_rgba(154,52,18,0.5)]',
    imagePanel:
      'border-white/90 bg-white shadow-[0_26px_55px_-32px_rgba(154,52,18,0.5)]',
    badge: 'bg-[#F97316] text-[#3B1500]',
    statusPill: 'bg-orange-100 text-[#9A3412]',
    savings: 'bg-orange-100 text-[#9A3412]',
    cta: 'bg-[#EA580C] text-white hover:bg-[#C2410C]',
    guarantee: 'border-orange-800/15 bg-orange-100/80 text-[#9A3412]',
    accentText: 'text-[#C2410C]',
    glowA: 'bg-[#FB923C]/40',
    glowB: 'bg-[#FDE047]/30',
  },
  chrome: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#F8FAFC] via-[#D7DEE8] to-[#9AA7B8] border-slate-500/20 text-[#0F172A]',
    muted: 'text-[#1E293B]',
    subtle: 'text-[#334155]',
    regular: 'text-[#64748B]',
    panel:
      'border-white/80 bg-white/70 backdrop-blur-sm ring-1 ring-inset ring-white/60 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]',
    imagePanel:
      'border-white/95 bg-white shadow-[0_26px_55px_-32px_rgba(15,23,42,0.5)]',
    badge: 'bg-[#334155] text-[#F8FAFC]',
    statusPill: 'bg-slate-200 text-[#334155]',
    savings: 'bg-slate-200 text-[#334155]',
    cta: 'bg-[#1E293B] text-[#F8FAFC] hover:bg-[#0F172A]',
    guarantee: 'border-slate-500/20 bg-slate-200/80 text-[#334155]',
    accentText: 'text-[#0F172A]',
    glowA: 'bg-white/60',
    glowB: 'bg-[#94A3B8]/30',
  },
  bronce: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#2A1A0F] via-[#6B4226] to-[#B87333] border-amber-300/25 text-white',
    muted: 'text-amber-50/90',
    subtle: 'text-amber-100/75',
    regular: 'text-amber-100/60',
    panel:
      'border-amber-300/25 bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-amber-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#E0A45C] text-[#2A1A0F]',
    statusPill: 'bg-amber-300/15 text-amber-100',
    savings: 'bg-amber-300/15 text-amber-100',
    cta: 'bg-[#F5DEB3] text-[#3B2412] hover:bg-amber-100',
    guarantee: 'border-amber-300/30 bg-amber-300/10 text-amber-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#B87333]/35',
    glowB: 'bg-[#FDE047]/15',
  },
  platino: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#F8FAFC] via-[#E8EDF3] to-[#B8C4D2] border-slate-400/20 text-[#111827]',
    muted: 'text-[#1F2937]',
    subtle: 'text-[#374151]',
    regular: 'text-[#6B7280]',
    panel:
      'border-white/85 bg-white/70 backdrop-blur-sm ring-1 ring-inset ring-white/60 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.35)]',
    imagePanel:
      'border-white/95 bg-white shadow-[0_26px_55px_-32px_rgba(15,23,42,0.4)]',
    badge: 'bg-[#64748B] text-white',
    statusPill: 'bg-slate-200 text-[#374151]',
    savings: 'bg-slate-200 text-[#374151]',
    cta: 'bg-[#334155] text-[#F8FAFC] hover:bg-[#1E293B]',
    guarantee: 'border-slate-400/20 bg-slate-200/80 text-[#374151]',
    accentText: 'text-[#111827]',
    glowA: 'bg-white/70',
    glowB: 'bg-[#CBD5E1]/40',
  },
  cobre: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#2B0F06] via-[#9A3412] to-[#F97316] border-orange-300/25 text-white',
    muted: 'text-orange-50/90',
    subtle: 'text-orange-100/75',
    regular: 'text-orange-100/60',
    panel:
      'border-orange-300/25 bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-orange-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#FDBA74] text-[#7C2D12]',
    statusPill: 'bg-orange-300/15 text-orange-100',
    savings: 'bg-orange-300/15 text-orange-100',
    cta: 'bg-[#FFEDD5] text-[#7C2D12] hover:bg-orange-100',
    guarantee: 'border-orange-300/30 bg-orange-300/10 text-orange-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#F97316]/30',
    glowB: 'bg-[#FDE047]/15',
  },
  rosagold: {
    isDark: false,
    shell:
      'bg-gradient-to-br from-[#FFF1F2] via-[#F9D5D3] to-[#E7A9A0] border-rose-800/15 text-[#4A1D1F]',
    muted: 'text-[#5F2528]',
    subtle: 'text-[#7F2D33]',
    regular: 'text-[#6B4A4B]',
    panel:
      'border-white/80 bg-white/70 backdrop-blur-sm ring-1 ring-inset ring-white/50 shadow-[0_18px_40px_-30px_rgba(136,19,55,0.35)]',
    imagePanel:
      'border-white/90 bg-white shadow-[0_26px_55px_-32px_rgba(136,19,55,0.4)]',
    badge: 'bg-[#BE185D] text-[#FFF1F2]',
    statusPill: 'bg-rose-100 text-[#9F1239]',
    savings: 'bg-rose-100 text-[#9F1239]',
    cta: 'bg-[#9F1239] text-[#FFF1F2] hover:bg-[#BE185D]',
    guarantee: 'border-rose-800/15 bg-rose-100/80 text-[#9F1239]',
    accentText: 'text-[#9F1239]',
    glowA: 'bg-[#E7A9A0]/50',
    glowB: 'bg-[#FDE68A]/30',
  },
  dualneon: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#050B1F] via-[#0E7490] to-[#DB2777] border-cyan-300/25 text-white',
    muted: 'text-cyan-50/90',
    subtle: 'text-cyan-100/75',
    regular: 'text-cyan-100/60',
    panel:
      'border-cyan-300/30 bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-cyan-200/40 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#22D3EE] text-[#06121F]',
    statusPill: 'bg-cyan-300/15 text-cyan-100',
    savings: 'bg-cyan-300/15 text-cyan-100',
    cta: 'bg-[#22D3EE] text-[#06121F] hover:bg-cyan-300',
    guarantee: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#22D3EE]/25',
    glowB: 'bg-[#EC4899]/25',
  },
  dualfire: {
    isDark: true,
    shell:
      'bg-gradient-to-br from-[#1A0505] via-[#B91C1C] to-[#F59E0B] border-amber-300/25 text-white',
    muted: 'text-amber-50/90',
    subtle: 'text-amber-100/75',
    regular: 'text-amber-100/60',
    panel:
      'border-amber-300/30 bg-white/10 backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_20px_45px_-30px_rgba(0,0,0,0.9)]',
    imagePanel:
      'border-amber-200/35 bg-white shadow-[0_28px_60px_-30px_rgba(0,0,0,0.9)]',
    badge: 'bg-[#FDE047] text-[#451A03]',
    statusPill: 'bg-amber-300/15 text-amber-100',
    savings: 'bg-amber-300/15 text-amber-100',
    cta: 'bg-[#FDE047] text-[#451A03] hover:bg-amber-300',
    guarantee: 'border-amber-300/30 bg-amber-300/10 text-amber-50',
    accentText: 'text-[#FDE047]',
    glowA: 'bg-[#F59E0B]/30',
    glowB: 'bg-[#F43F5E]/20',
  },
};

// Clases de contenedor según formato / red social
const FORMAT_ASPECT = {
  square:    'max-w-[360px] w-full',
  story:     'max-w-[280px] w-full',
  portrait:  'max-w-[320px] w-full',
  panoramic: 'max-w-[500px] w-full',
  landscape: 'max-w-[500px] w-full',
};

export const AdPreviewCard = ({
  product,
  config = {},
  imageUrl,
  ctaText = 'Ver en Tienda',
  theme = 'classic',
  format = 'square',
  glassEffect = true,
  badgeConfig = null,
  cardBorder = 'frameless',
  onEditBadge,
  activeEditingSlot = null,
  onCtaClick,
  className = '',
}) => {
  const style = THEME_STYLES[theme] || THEME_STYLES.classic;
  const formatAspect = FORMAT_ASPECT[format] || FORMAT_ASPECT.square;
  // Para formatos horizontales usamos distribución en dos columnas para no recortar la tarjeta
  const isHorizontal = format === 'panoramic' || format === 'landscape';

  const borderClass =
    cardBorder === 'frameless'
      ? 'border-0 shadow-2xl'
      : cardBorder === 'silver'
      ? 'border-[3px] border-slate-300/90 shadow-2xl'
      : cardBorder === 'white'
      ? 'border-[3px] border-white shadow-[0_15px_40px_rgba(0,0,0,0.2)]'
      : 'border border-slate-700/55 shadow-2xl';

  const data = useMemo(() => {
    const offer = Number(product?.price) || 0;
    const regular = Number(product?.originalPrice) || 0;
    const hasRegular = regular > offer && offer > 0;
    const discount = hasRegular
      ? Math.max(1, Math.round(((regular - offer) / regular) * 100))
      : 0;

    const condition = String(product?.condition || 'Nuevo').trim();
    const commercialTag = String(product?.commercialTag || product?.badge || '').trim();

    return {
      storeName: String(config?.storeName || 'JavrelStore').trim(),
      name: String(product?.name || 'Producto destacado').trim(),
      brand: String(product?.brand || '').trim(),
      condition,
      commercialTag,
      description: sanitizeCommercialText(product?.description || '')
        .replace(/\s+/g, ' ')
        .slice(0, 150)
        .trim(),
      offer,
      regular,
      hasRegular,
      discount,
      guarantee: String(
        config?.guaranteeText ||
          `Garantía ${String(config?.storeName || 'JavrelStore').trim()} · Compra protegida`
      ).trim(),
    };
  }, [product, config]);

  const getPositionClass = (position) => {
    switch (position) {
      case 'top-right':
        return 'top-3 right-3';
      case 'bottom-left':
        return 'bottom-3 left-3';
      case 'bottom-right':
        return 'bottom-3 right-3';
      case 'top-left':
      default:
        return 'top-3 left-3';
    }
  };

  const primaryBadge = useMemo(() => {
    if (!badgeConfig?.primary) {
      if (data.commercialTag) {
        return {
          enabled: true,
          text: data.commercialTag,
          position: 'top-left',
          palette: /black\s*friday/i.test(data.commercialTag) ? 'gold' : 'neon-blue',
        };
      }
      if (data.discount > 0) {
        return {
          enabled: true,
          text: `-${data.discount}%`,
          position: 'top-left',
          palette: 'theme',
        };
      }
      return null;
    }
    return badgeConfig.primary.enabled && badgeConfig.primary.text ? badgeConfig.primary : null;
  }, [badgeConfig, data.commercialTag, data.discount]);

  const secondaryBadge = useMemo(() => {
    if (!badgeConfig?.secondary) {
      if (data.condition && data.condition !== 'Nuevo') {
        return {
          enabled: true,
          text: data.condition,
          position: 'bottom-right',
          palette:
            data.condition === 'Seminuevo'
              ? 'gold'
              : data.condition === 'Usado'
                ? 'platinum'
                : 'emerald',
        };
      }
      return null;
    }
    return badgeConfig.secondary.enabled && badgeConfig.secondary.text ? badgeConfig.secondary : null;
  }, [badgeConfig, data.condition]);

  const primaryStyle = useMemo(() => {
    if (!primaryBadge) return null;
    return resolveBadgeStyle(primaryBadge.palette, style.badge?.split(' ')[0], '#FFFFFF');
  }, [primaryBadge, style]);

  const secondaryStyle = useMemo(() => {
    if (!secondaryBadge) return null;
    return resolveBadgeStyle(secondaryBadge.palette, style.badge?.split(' ')[0], '#FFFFFF');
  }, [secondaryBadge, style]);

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl transition-all duration-300 w-full mx-auto ${formatAspect} ${style.shell} ${borderClass} ${className}`}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${style.glowA}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl ${style.glowB}`}
      />

      <div className="relative p-4 sm:p-5">
        {/* Marca */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#0A6CFF] to-[#38BDF8] shadow-[0_8px_18px_-8px_rgba(10,108,255,0.8)]">
              <span className="absolute inset-0 grid place-items-center text-sm font-black text-white">
                J
              </span>
              <img
                src={STORE_LOGO_URL}
                alt={`Logo de ${data.storeName}`}
                className="relative h-full w-full bg-white object-contain p-0.5"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight">{data.storeName}</p>
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${style.subtle}`}>
                Catálogo oficial
              </p>
            </div>
          </div>
          {(data.commercialTag || data.discount > 0) && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
              data.commercialTag && /black\s*friday/i.test(data.commercialTag)
                ? 'bg-black text-amber-300 border border-amber-400/50 shadow-sm'
                : data.commercialTag && /oferta/i.test(data.commercialTag)
                  ? 'bg-rose-500 text-white shadow-sm'
                  : style.statusPill
            }`}>
              <Sparkles className="h-2.5 w-2.5" />
              {data.commercialTag
                ? data.commercialTag
                : data.discount > 0
                  ? `-${data.discount}%`
                  : null}
            </span>
          )}
        </div>

        {/* Distribución del contenido: Horizontal (2 columnas) para Panoramic/Landscape o Vertical clásica */}
        {isHorizontal ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            {/* Columna Izquierda: Imagen del Producto */}
            <div
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border p-2 ${style.imagePanel}`}
            >
              {/* Fondo difuminado ambiental sutil para evitar vacíos */}
              <img
                src={imageUrl || '/zafra/logo-menu.webp'}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover blur-md opacity-25 scale-125"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/35 z-1"
              />
              <img
                src={imageUrl || '/zafra/logo-menu.webp'}
                alt={data.name}
                className="relative z-2 h-full w-full object-contain scale-[1.06] drop-shadow-[0_14px_18px_rgba(15,23,42,0.18)] transition-transform duration-500 group-hover:scale-[1.10]"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = '/zafra/logo-menu.webp';
                }}
              />
              {/* Badge Primario */}
              {primaryBadge && primaryStyle && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBadge?.('primary');
                  }}
                  title="Clic para editar este badge en el Studio"
                  className={`absolute ${getPositionClass(primaryBadge.position)} z-10 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                    activeEditingSlot === 'primary'
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A6CFF] scale-105 animate-pulse'
                      : ''
                  }`}
                  style={{
                    background: primaryStyle.background,
                    color: primaryStyle.color,
                    borderColor: primaryStyle.border,
                  }}
                >
                  <span className="font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                    {primaryBadge.text}
                  </span>
                </button>
              )}
              {/* Badge Secundario */}
              {secondaryBadge && secondaryStyle && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBadge?.('secondary');
                  }}
                  title="Clic para editar este badge en el Studio"
                  className={`absolute ${getPositionClass(secondaryBadge.position)} z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                    activeEditingSlot === 'secondary'
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A6CFF] scale-105 animate-pulse'
                      : ''
                  }`}
                  style={{
                    background: secondaryStyle.background,
                    color: secondaryStyle.color,
                    borderColor: secondaryStyle.border,
                  }}
                >
                  <BadgeCheck className="h-2.5 w-2.5" />
                  <span className="font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                    {secondaryBadge.text}
                  </span>
                </button>
              )}
            </div>

            {/* Columna Derecha: Panel de Contenido Comercial */}
            <div
              className={`transition-all duration-300 overflow-hidden ${
                glassEffect
                  ? `rounded-2xl border p-3 ${style.panel}`
                  : 'rounded-none border-none bg-transparent p-1 shadow-none backdrop-blur-none'
              }`}
            >
              <div className="overflow-hidden">
                <h3
                  className={`font-display text-sm sm:text-base leading-tight tracking-tight line-clamp-2 break-words ${
                    glassEffect
                      ? style.isDark
                        ? 'font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                        : 'font-extrabold text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]'
                      : style.isDark
                        ? 'font-black text-white [text-shadow:_0_2px_8px_rgba(0,0,0,0.95),_0_0_3px_rgba(0,0,0,0.9)]'
                        : 'font-black text-slate-950 [text-shadow:_0_2px_6px_rgba(255,255,255,0.95),_0_0_3px_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {data.name}
                </h3>
                {data.description && (
                  <p
                    className={`mt-1 text-[11px] leading-snug line-clamp-2 break-words ${
                      glassEffect
                        ? style.isDark
                          ? 'font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                          : 'font-medium text-slate-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]'
                        : style.isDark
                          ? 'font-semibold text-white/90 [text-shadow:_0_2px_6px_rgba(0,0,0,0.9),_0_0_2px_rgba(0,0,0,0.9)]'
                          : 'font-semibold text-slate-900 [text-shadow:_0_1px_4px_rgba(255,255,255,0.9),_0_0_2px_rgba(255,255,255,0.9)]'
                    }`}
                  >
                    {data.description}
                  </p>
                )}
              </div>

              {/* Precios */}
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={`font-display text-xl sm:text-2xl tracking-tight ${
                    glassEffect
                      ? style.isDark
                        ? 'font-bold text-[#FDE047] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                        : 'font-bold text-slate-950 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]'
                      : style.isDark
                        ? 'font-black text-[#FDE047] [text-shadow:_0_2px_8px_rgba(0,0,0,0.95),_0_0_3px_rgba(0,0,0,0.9)]'
                        : 'font-black text-slate-950 [text-shadow:_0_2px_6px_rgba(255,255,255,0.95),_0_0_3px_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {formatCurrency(data.offer)}
                </span>
                {data.hasRegular && (
                  <span
                    className={`text-xs line-through ${
                      glassEffect
                        ? style.isDark
                          ? 'font-semibold text-white/70'
                          : 'font-semibold text-slate-500'
                        : style.isDark
                          ? 'font-bold text-white/80'
                          : 'font-bold text-slate-600'
                    }`}
                  >
                    {formatCurrency(data.regular)}
                  </span>
                )}
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={onCtaClick}
                className={`group/cta mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer ${style.cta}`}
                aria-label={`${ctaText} — ${data.name}`}
              >
                {ctaText}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Disposición Vertical para Square, Story y Portrait */
          <>
            {/* Imagen ampliada con profundidad 3D y mayor protagonismo */}
            <div
              className={`relative flex items-center justify-center overflow-hidden rounded-3xl border p-2 sm:p-2.5 ${style.imagePanel} ${
                format === 'story' ? 'mt-2.5 aspect-square w-full' : 'mt-3.5 aspect-[3/2]'
              }`}
            >
              {/* Fondo difuminado ambiental sutil para evitar vacíos */}
              <img
                src={imageUrl || '/zafra/logo-menu.webp'}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover blur-md opacity-25 scale-125"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/35 z-1"
              />
              <img
                src={imageUrl || '/zafra/logo-menu.webp'}
                alt={data.name}
                className="relative z-2 h-full w-full object-contain scale-[1.10] drop-shadow-[0_18px_22px_rgba(15,23,42,0.18)] transition-transform duration-500 group-hover:scale-[1.14]"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = '/zafra/logo-menu.webp';
                }}
              />
              {/* Badge Primario (Promoción / Oferta) */}
              {primaryBadge && primaryStyle && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBadge?.('primary');
                  }}
                  title="Clic para editar este badge en el Studio"
                  className={`absolute ${getPositionClass(primaryBadge.position)} z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                    activeEditingSlot === 'primary'
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A6CFF] scale-105 animate-pulse'
                      : ''
                  }`}
                  style={{
                    background: primaryStyle.background,
                    color: primaryStyle.color,
                    borderColor: primaryStyle.border,
                    textShadow: primaryStyle.color === '#0F172A'
                      ? '0 1px 2px rgba(255,255,255,0.9)'
                      : '0 2px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)',
                  }}
                >
                  <span className="font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                    {primaryBadge.text}
                  </span>
                  {onEditBadge && (
                    <Edit3 className="w-2.5 h-2.5 opacity-70 hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )}

              {/* Badge Secundario (Condición Física) */}
              {secondaryBadge && secondaryStyle && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBadge?.('secondary');
                  }}
                  title="Clic para editar este badge en el Studio"
                  className={`absolute ${getPositionClass(secondaryBadge.position)} z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-md backdrop-blur-md transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                    activeEditingSlot === 'secondary'
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A6CFF] scale-105 animate-pulse'
                      : ''
                  }`}
                  style={{
                    background: secondaryStyle.background,
                    color: secondaryStyle.color,
                    borderColor: secondaryStyle.border,
                    textShadow: secondaryStyle.color === '#0F172A'
                      ? '0 1px 2px rgba(255,255,255,0.9)'
                      : '0 2px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,0.9)',
                  }}
                >
                  <BadgeCheck className="h-2.5 w-2.5" />
                  <span className="font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                    {secondaryBadge.text}
                  </span>
                  {onEditBadge && (
                    <Edit3 className="w-2 h-2 opacity-70 hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )}
            </div>

            {/* Panel de contenido comercial (Cristal esmerilado o Fondo directo 3D) */}
            <div
              className={`mt-3 transition-all duration-300 overflow-hidden ${
                glassEffect
                  ? `rounded-2xl border p-3 sm:p-3.5 ${style.panel}`
                  : 'rounded-none border-none bg-transparent p-1 shadow-none backdrop-blur-none'
              }`}
            >
              <div className="overflow-hidden">
                <h3
                  className={`font-display text-sm sm:text-base leading-tight tracking-tight line-clamp-2 break-words ${
                    glassEffect
                      ? style.isDark
                        ? 'font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                        : 'font-extrabold text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.9)]'
                      : style.isDark
                        ? 'font-black text-white [text-shadow:_0_2px_8px_rgba(0,0,0,0.95),_0_0_3px_rgba(0,0,0,0.9)]'
                        : 'font-black text-slate-950 [text-shadow:_0_2px_6px_rgba(255,255,255,0.95),_0_0_3px_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {data.name}
                </h3>
                {data.description && (
                  <p
                    className={`mt-1 text-[11px] sm:text-[12px] leading-snug line-clamp-2 break-words ${
                      glassEffect
                        ? style.isDark
                          ? 'font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                          : 'font-medium text-slate-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.85)]'
                        : style.isDark
                          ? 'font-semibold text-white/90 [text-shadow:_0_2px_6px_rgba(0,0,0,0.9),_0_0_2px_rgba(0,0,0,0.9)]'
                          : 'font-semibold text-slate-900 [text-shadow:_0_1px_4px_rgba(255,255,255,0.9),_0_0_2px_rgba(255,255,255,0.9)]'
                    }`}
                  >
                    {data.description}
                  </p>
                )}
              </div>

              {/* Precios */}
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className={`font-display text-xl sm:text-2xl tracking-tight ${
                    glassEffect
                      ? style.isDark
                        ? 'font-bold text-[#FDE047] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                        : 'font-bold text-slate-950 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]'
                      : style.isDark
                        ? 'font-black text-[#FDE047] [text-shadow:_0_2px_8px_rgba(0,0,0,0.95),_0_0_3px_rgba(0,0,0,0.9)]'
                        : 'font-black text-slate-950 [text-shadow:_0_2px_6px_rgba(255,255,255,0.95),_0_0_3px_rgba(255,255,255,0.9)]'
                  }`}
                >
                  {formatCurrency(data.offer)}
                </span>
                {data.hasRegular && (
                  <span
                    className={`text-xs line-through ${
                      glassEffect
                        ? style.isDark
                          ? 'font-semibold text-white/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]'
                          : 'font-semibold text-slate-500'
                        : style.isDark
                          ? 'font-bold text-white/80 [text-shadow:_0_1px_4px_rgba(0,0,0,0.9)]'
                          : 'font-bold text-slate-600 [text-shadow:_0_1px_3px_rgba(255,255,255,0.9)]'
                    }`}
                  >
                    {formatCurrency(data.regular)}
                  </span>
                )}
                {data.hasRegular && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wide ${
                      !glassEffect && style.isDark
                        ? 'bg-black/50 text-white border border-white/30 backdrop-blur-sm [text-shadow:_0_1px_2px_rgba(0,0,0,0.8)]'
                        : style.savings
                    }`}
                  >
                    Ahorras {formatCurrency(data.regular - data.offer)}
                  </span>
                )}
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={onCtaClick}
                className={`group/cta mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 cursor-pointer ${style.cta}`}
                aria-label={`${ctaText} — ${data.name}`}
              >
                {ctaText}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
              </button>

              <div
                className={`mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10.5px] font-bold tracking-wide backdrop-blur-sm ${
                  !glassEffect
                    ? style.isDark
                      ? 'bg-black/45 border-white/20 text-white shadow-sm [text-shadow:_0_1px_2px_rgba(0,0,0,0.9)]'
                      : 'bg-white/85 border-slate-300 text-slate-800 shadow-sm'
                    : style.guarantee
                }`}
              >
                <ShieldCheck
                  className={`h-3.5 w-3.5 ${
                    !glassEffect && style.isDark ? 'text-[#FDE047]' : style.accentText
                  }`}
                />
                {data.guarantee}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdPreviewCard;
