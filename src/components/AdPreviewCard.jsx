import React, { useMemo } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  Tag,
  Edit3,
  Star,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { formatCurrency } from '../services/storeService';
import { sanitizeCommercialText, cleanBrand, getProductSlug } from '../services/textUtils';
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
      brand: cleanBrand(product?.brand) || 'JAVRELSTORE',
      condition,
      commercialTag,
      description: sanitizeCommercialText(product?.description || '')
        .replace(/\s+/g, ' ')
        .slice(0, 160)
        .trim(),
      offer,
      regular,
      hasRegular,
      discount,
      rating: Number(product?.rating || 5).toFixed(0),
    };
  }, [product, config]);

  const specHighlight = useMemo(() => {
    if (Array.isArray(product?.specs) && product.specs.length > 0) {
      for (const s of product.specs) {
        if (typeof s === 'string') {
          const clean = s.replace(/\[object Object\]/g, '').trim();
          if (clean && !/^(CONDICI|ETIQUETA|SKU|EAN|BARCODE|COSTO)/i.test(clean)) {
            return clean;
          }
        } else if (typeof s === 'object' && s !== null) {
          const k = String(s.title || s.key || '').trim();
          const v = String(s.detail !== undefined ? s.detail : s.value !== undefined ? s.value : '')
            .replace(/\[object Object\]/g, '')
            .trim();
          if (v && !/^(CONDICI|ETIQUETA|SKU|EAN|BARCODE|COSTO)/i.test(k)) {
            return k ? `${k}: ${v}` : v;
          }
        }
      }
    }
    return (data.condition && data.condition !== 'Nuevo' ? data.condition : 'NUEVO').toUpperCase();
  }, [product, data.condition]);

  const productSlug = useMemo(() => getProductSlug(product), [product]);

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
      className={`group relative overflow-hidden rounded-3xl transition-all duration-300 w-full mx-auto ${formatAspect} ${style.shell} ${borderClass} ${className} flex flex-col justify-between`}
    >
      {/* Resplandor perimetral ambiental de fondo */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl ${style.glowA}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full blur-3xl ${style.glowB}`}
      />

      {isHorizontal ? (
        /* Disposición Horizontal (Panorámico 16:9 y Banner 1.91:1) */
        <div className="relative p-4 sm:p-5 h-full grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Columna Izquierda: Imagen del Producto Limpia y Protagónica */}
          <div className="relative h-full aspect-square max-h-[290px] mx-auto flex items-center justify-center overflow-hidden rounded-2xl bg-white border border-slate-100 shadow-sm">
            <img
              src={imageUrl || '/zafra/logo-menu.webp'}
              alt={data.name}
              className="relative z-2 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = '/zafra/logo-menu.webp';
              }}
            />
            {/* Badges superiores sobre imagen */}
            {(data.discount > 0 || primaryBadge) && (
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1">
                <span className="px-2 py-0.5 rounded-lg bg-[#0A6CFF] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                  {primaryBadge?.text || `-${data.discount}%`}
                </span>
              </div>
            )}
            <span className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 rounded-md bg-slate-900/60 backdrop-blur-xs text-white text-[9.5px] font-bold flex items-center gap-1 shadow-sm">
              <ImageIcon className="w-2.5 h-2.5" /> 2
            </span>
          </div>

          {/* Columna Derecha: Estructura Idéntica a Tarjeta de Catálogo */}
          <div className="flex flex-col justify-between h-full py-1">
            <div>
              {/* 1. Marca y Calificación */}
              <div className="flex items-center justify-between text-[11px] font-mono-code uppercase font-bold mb-1">
                <span className="text-[#0A6CFF] tracking-wider truncate">
                  {data.brand}
                </span>
                <div className="flex items-center gap-1 text-amber-500 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-slate-700 text-xs">{data.rating}</span>
                  <span className="text-slate-400 text-[10px]">0</span>
                </div>
              </div>

              {/* 2. Título Principal */}
              <h3 className={`font-sans font-bold text-sm sm:text-base line-clamp-2 leading-snug mb-1 tracking-tight ${style.isDark ? 'text-white' : 'text-slate-900'}`}>
                {data.name}
              </h3>

              {/* 3. Descripción Corta: 2 líneas */}
              <p className={`text-[10.5px] leading-relaxed line-clamp-2 mb-2 font-medium ${style.isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                {data.description || 'Dispositivo Tecnológico Inteligente diseñado para ofrecer el máximo rendimiento y confiabilidad.'}
              </p>

              {/* 4. Insignia Técnica en Verde con Ícono de Check */}
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 uppercase mb-2 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate font-mono-code">{specHighlight}</span>
              </div>
            </div>

            {/* 5. Precios & Franja de Enlace */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-baseline gap-2">
                <span className={`font-black text-xl tracking-tight ${style.isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(data.offer)}
                </span>
                {data.hasRegular && (
                  <span className="text-xs text-slate-400 line-through font-medium">
                    {formatCurrency(data.regular)}
                  </span>
                )}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  ✓ Garantía Oficial Directa
                </span>
                <span className="font-bold text-[#0A6CFF] flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A6CFF]" />
                  JavrelStore
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Disposición Vertical (Square 1:1, Story 9:16 y Portrait 4:5) — Réplica Fiel de la Tarjeta del Catálogo */
        <div className="relative h-full flex flex-col justify-between">
          {/* 1. Imagen Protagonista Superior con ajuste proporcional íntegro (object-contain sin recortes) */}
          <div className={`relative w-full overflow-hidden bg-white border-b border-slate-100 flex items-center justify-center ${
            format === 'story' ? 'h-[66%] min-h-[340px]' : format === 'portrait' ? 'h-[58%] min-h-[260px]' : 'aspect-square h-[62%]'
          }`}>
            <img
              src={imageUrl || '/zafra/logo-menu.webp'}
              alt={data.name}
              className="relative z-2 h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.src = '/zafra/logo-menu.webp';
              }}
            />
            {/* Badge de Oferta / Descuento (Top-Left) */}
            {(data.discount > 0 || primaryBadge) && (
              <span className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-lg bg-[#0A6CFF] text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
                {primaryBadge?.text || `-${data.discount}%`}
              </span>
            )}
            {/* Contador de Fotos (Top-Right) */}
            <span className="absolute top-3 right-3 z-10 px-1.5 py-0.5 rounded-md bg-slate-900/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
              <ImageIcon className="w-2.5 h-2.5" /> 2
            </span>
          </div>

          {/* 2. Cuerpo de Información Comercial Estilo Tarjeta Principal */}
          <div className="p-3.5 sm:p-4 pt-3 flex-1 flex flex-col justify-between">
            <div>
              {/* Fila Marca & Calificación */}
              <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono-code uppercase font-bold mb-1">
                <span className="text-[#0A6CFF] tracking-wider truncate">
                  {data.brand}
                </span>
                <div className="flex items-center gap-1 text-amber-500 shrink-0">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className={`font-bold text-xs ${style.isDark ? 'text-slate-200' : 'text-slate-700'}`}>{data.rating}</span>
                  <span className="text-slate-400 text-[10px]">0</span>
                </div>
              </div>

              {/* Título Principal en Negrita de Gran Legibilidad */}
              <h3 className={`font-sans font-bold text-xs sm:text-[14px] xl:text-[15px] line-clamp-2 leading-snug mb-1.5 tracking-tight ${style.isDark ? 'text-white' : 'text-slate-900'}`}>
                {data.name}
              </h3>

              {/* Descripción Corta: Máximo 2 líneas */}
              <p className={`text-[10px] sm:text-[11px] xl:text-[11.5px] leading-relaxed line-clamp-2 mb-2 font-medium ${style.isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                {data.description || 'Dispositivo Tecnológico Inteligente diseñado para ofrecer el máximo rendimiento y confiabilidad.'}
              </p>

              {/* Insignia / Estado o Detalle Técnico con Check Verde (Auto-wrap sin cortes) */}
              <div className="flex items-start gap-1.5 text-[9.5px] sm:text-[10.5px] font-semibold text-emerald-600 uppercase mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="font-mono-code leading-tight line-clamp-2">{specHighlight}</span>
              </div>
            </div>

            {/* Franja de Precio y Enlace al Pie */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-baseline gap-2">
                <span className={`font-black text-base sm:text-lg tracking-tight ${style.isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(data.offer)}
                </span>
                {data.hasRegular && (
                  <span className="text-xs text-slate-400 line-through font-medium">
                    {formatCurrency(data.regular)}
                  </span>
                )}
              </div>

              {/* Franja sutil con sello JavrelStore (sin URL en el arte) */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] sm:text-[10px] font-mono-code text-slate-400">
                <span className="font-semibold text-emerald-600 flex items-center gap-1">
                  ✓ Despacho Inmediato
                </span>
                <span className="font-bold text-[#0A6CFF] flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A6CFF]" />
                  JavrelStore
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdPreviewCard;
