import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  Palette,
  Pencil,
  Wand2,
  ChevronDown,
  Share2,
} from 'lucide-react';
import { WhatsAppIcon, FacebookIcon, TikTokIcon } from './BrandIcons';

/**
 * Estudio interno de preparación de Estados, Historias y publicaciones.
 * Emula la experiencia de cada red social sin invocar el diálogo nativo
 * del sistema operativo: la tarjeta se renderiza en alta resolución,
 * el copy queda listo para copiar y la red se abre en una pestaña nueva.
 */

const CHANNEL_META = {
  whatsapp: {
    label: 'Estado de WhatsApp',
    short: 'Estado',
    topLabel: 'Mi Estado',
    Icon: WhatsAppIcon,
    frame: 'from-[#075E54] via-[#0B7A6B] to-[#0B141A]',
    accent: 'text-[#25D366]',
    cta: 'bg-[#25D366] hover:bg-[#1ebe5b] text-[#04140C]',
    openLabel: 'Abrir WhatsApp Web con plantilla copiada',
    hint: 'Abre WhatsApp Web, entra a Estados y pega la imagen y el texto. La tarjeta ya está en alta resolución.',
    steps: [
      'La imagen y el texto ya están copiados al portapapeles.',
      'En WhatsApp Web abre la pestaña Estados → Mi Estado.',
      'Pulsa Añadir foto y pega la imagen con Ctrl+V.',
      'Pega el texto como descripción y publica tu Estado.',
    ],
  },
  facebook: {
    label: 'Historia de Facebook',
    short: 'Historia',
    topLabel: 'Tu Historia',
    Icon: FacebookIcon,
    frame: 'from-[#0B1F3A] via-[#123E7C] to-[#071426]',
    accent: 'text-[#1877F2]',
    cta: 'bg-[#1877F2] hover:bg-[#0f65d4] text-white',
    openLabel: 'Abrir Facebook con plantilla copiada',
    hint: 'Abre Facebook, crea una Historia y pega la imagen y el texto. La pieza 9:16 está lista para publicar.',
    steps: [
      'La imagen y el texto ya están copiados al portapapeles.',
      'En Facebook pulsa Crear historia.',
      'Pega la imagen con Ctrl+V o súbela desde tu equipo.',
      'Pega el texto, ajústalo y publica tu Historia.',
    ],
  },
  tiktok: {
    label: 'Publicación de TikTok',
    short: 'Publicación',
    topLabel: 'Nueva publicación',
    Icon: TikTokIcon,
    frame: 'from-[#12001A] via-[#2A0A3A] to-[#05010A]',
    accent: 'text-[#FE2C55]',
    cta: 'bg-[#FE2C55] hover:bg-[#e0264c] text-white',
    openLabel: 'Abrir TikTok con plantilla copiada',
    hint: 'Abre TikTok, sube la tarjeta como portada y pega el copy viral. La imagen 9:16 está optimizada.',
    steps: [
      'La imagen y el texto ya están copiados al portapapeles.',
      'En TikTok pulsa Subir y elige la tarjeta descargada.',
      'Usa la imagen como portada del video o publicación.',
      'Pega el copy viral con sus hashtags y publica.',
    ],
  },
};

const FORMAT_LABEL = {
  square: '1:1',
  story: '9:16',
  landscape: '1.91:1',
};

export const StatusPrepModal = ({
  open,
  target,
  cardUrl,
  cardLoading = false,
  cardError = '',
  onClose,
  onCopyText,
  onCopyImage,
  onDownload,
  onOpenNetwork,
  onNativeShare,
  isAndroid = false,
  canShare = false,
  busyKey = '',
  feedback = '',
  storeName = 'JavrelStore',
  productName = '',
  themes = [],
  activeTheme = 'classic',
  onThemeChange,
  text,
  onTextChange,
}) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [showAllThemes, setShowAllThemes] = useState(false);

  useEffect(() => {
    setGuideOpen(false);
    setShowAllThemes(false);
  }, [target]);

  if (!open || !target) return null;

  const meta = CHANNEL_META[target.channel] || CHANNEL_META.whatsapp;
  const Icon = meta.Icon;
  const formatLabel = FORMAT_LABEL[target.format] || '9:16';
  const isBusy = Boolean(busyKey);
  const liveText = typeof text === 'string' ? text : target.text || '';
  const FEATURED_THEME_COUNT = 8;
  const paletteThemes = showAllThemes ? themes : themes.slice(0, FEATURED_THEME_COUNT);

  const handleOpen = () => {
    onOpenNetwork?.();
    setGuideOpen(true);
  };

  return (
    <div
      className="fixed inset-0 z-[140] flex items-end justify-center bg-[#04070F]/90 p-0 backdrop-blur-xl animate-fadeIn sm:items-center sm:p-6"
      onClick={(event) => {
        event.stopPropagation();
        onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={target.title || 'Preparar publicación'}
        style={{
          backgroundImage:
            'radial-gradient(120% 80% at 10% -10%, rgba(34,211,238,0.10), transparent 55%), radial-gradient(95% 75% at 100% 0%, rgba(99,102,241,0.16), transparent 60%), linear-gradient(165deg, #151C2C 0%, #0C1322 48%, #070B14 100%)',
        }}
        className="relative max-h-[94vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 text-white shadow-[0_45px_120px_-45px_rgba(0,0,0,0.95)] sm:max-w-5xl sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-[#25D366] via-[#1877F2] to-[#FE2C55]" />

        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-lg ${meta.accent}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                <Sparkles className="h-3 w-3 text-[#22D3EE]" />
                Estudio de preparación
              </span>
              <h2 className="font-display mt-1 truncate text-lg font-extrabold tracking-tight text-white sm:text-xl">
                {target.title || `Preparar ${meta.label}`}
              </h2>
              <p className="mt-0.5 text-[12px] text-white/70">
                {meta.label} · todo listo sin salir de la tienda
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 cursor-pointer rounded-xl bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            aria-label="Cerrar estudio de preparación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {/* Simulador de la red social */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono-code text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                <Sparkles className="h-3 w-3 text-[#22D3EE]" />
                Simulación de {meta.short}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-bold text-white/80">
                {formatLabel} · Alta resolución
              </span>
            </div>

            <div className="mt-3 flex justify-center">
              <div
                className={`relative w-full max-w-[340px] overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-b shadow-[0_35px_80px_-30px_rgba(0,0,0,0.9)] ${meta.frame}`}
              >
                <div className="flex gap-1 px-4 pt-3">
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className={`h-0.5 flex-1 rounded-full ${
                        index === 0 ? 'bg-white/90' : 'bg-white/25'
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 px-4 pt-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#0A6CFF] to-[#38BDF8] text-[10px] font-black text-white shadow-lg">
                    J
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-bold text-white">{storeName}</p>
                    <p className="text-[10px] text-white/75">
                      Ahora · {meta.topLabel}
                    </p>
                  </div>
                  <span className="ml-auto text-white/70">
                    <X className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="px-3.5 py-4">
                  <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.85)]">
                    {cardLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
                        <Loader2 className="h-5 w-5 animate-spin text-[#22D3EE]" />
                        <span className="text-[11px] font-semibold">Generando tarjeta…</span>
                      </div>
                    )}
                    {!cardLoading && cardUrl && (
                      <img
                        src={cardUrl}
                        alt={`Tarjeta promocional de ${productName}`}
                        crossOrigin="anonymous"
                        decoding="async"
                        className="h-full w-full object-contain animate-fadeIn"
                      />
                    )}
                    {!cardLoading && !cardUrl && cardError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-[11px] font-semibold text-white/80">
                        {cardError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 px-4 pb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75">
                  <ArrowUpRight className="h-3 w-3" />
                  Desliza hacia arriba
                </div>
              </div>
            </div>
          </div>

          {/* Editor de texto + paletas + acciones */}
          <div className="min-w-0">
            <div className="rounded-3xl border border-white/10 bg-[#0A1120]/70 p-3.5 shadow-[0_30px_70px_-45px_rgba(0,0,0,0.95)] backdrop-blur-md sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono-code text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                  <Pencil className="h-3 w-3 text-[#22D3EE]" />
                  Editor de texto en tiempo real
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22D3EE]/30 bg-[#22D3EE]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#A5F3FC]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22D3EE]" />
                  {liveText.length} caracteres
                </span>
              </div>

              <textarea
                value={liveText}
                onChange={(event) => onTextChange?.(event.target.value)}
                spellCheck={false}
                rows={8}
                aria-label="Texto de la publicación"
                className="font-display mt-2 h-[190px] w-full resize-none overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-white/15 bg-white/[0.06] p-4 text-[14px] leading-[1.75] tracking-[0.01em] text-white shadow-inner shadow-black/40 outline-none transition-colors placeholder:text-white/35 focus:border-[#22D3EE]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[#22D3EE]/20"
              />

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 font-mono-code text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
                    <Palette className="h-3 w-3 text-[#22D3EE]" />
                    Estilo de la tarjeta
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#22D3EE] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#031633]">
                    <Wand2 className="h-2.5 w-2.5" />
                    {themes.length || 24} estilos 3D
                  </span>
                </div>

                <div
                  className={`mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4 ${
                    showAllThemes
                      ? 'max-h-[214px] overflow-y-auto pr-1 [scrollbar-width:thin]'
                      : ''
                  }`}
                >
                  {paletteThemes.map((option) => {
                    const isActive = activeTheme === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onThemeChange?.(option.id)}
                        aria-pressed={isActive}
                        title={`${option.label} · ${option.caption}`}
                        className={`group relative cursor-pointer overflow-hidden rounded-xl border p-1.5 text-left transition-all ${
                          isActive
                            ? 'border-[#22D3EE] bg-white/10 ring-2 ring-[#22D3EE]/30'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.07]'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="block h-6 w-full rounded-lg border border-white/15 shadow-inner"
                          style={{ backgroundImage: option.preview }}
                        />
                        <span
                          className={`mt-1 block truncate text-[10px] font-bold ${
                            isActive ? 'text-white' : 'text-white/80'
                          }`}
                        >
                          {option.label}
                        </span>
                        {isActive && (
                          <span className="absolute right-1 top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#22D3EE] text-[#031633] shadow">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAllThemes((value) => !value)}
                  className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] px-3 py-2 text-[10px] font-bold text-white/75 transition-colors hover:bg-white/[0.1] hover:text-white"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${
                      showAllThemes ? 'rotate-180' : ''
                    }`}
                  />
                  {showAllThemes
                    ? 'Mostrar estilos destacados'
                    : `Paleta completa (${themes.length || 24} estilos)`}
                </button>

                <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-snug text-white/50">
                  <Sparkles className="h-3 w-3 flex-shrink-0 text-[#22D3EE]" />
                  La vista previa se regenera al instante con el estilo y el texto elegidos.
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {canShare && onNativeShare && (
                <button
                  type="button"
                  onClick={onNativeShare}
                  disabled={isBusy || cardLoading}
                  className="col-span-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/25 transition-all hover:-translate-y-0.5 hover:from-[#1ebe5b] hover:to-[#0d7367] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyKey === 'prep-native' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                  {isAndroid
                    ? 'Compartir Estado en Android (WhatsApp / Redes)'
                    : 'Compartir Estado en Apps Nativas'}
                </button>
              )}

              <button
                type="button"
                onClick={handleOpen}
                disabled={isBusy || cardLoading}
                className={`col-span-2 inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${meta.cta}`}
              >
                {busyKey === 'prep-open' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {meta.openLabel}
              </button>

              <button
                type="button"
                onClick={onCopyImage}
                disabled={isBusy || cardLoading || !cardUrl}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyKey === 'prep-image' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : busyKey === 'prep-image-ok' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <ImageIcon className="h-3.5 w-3.5" />
                )}
                Copiar imagen
              </button>

              <button
                type="button"
                onClick={onCopyText}
                className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-white/20"
              >
                {busyKey === 'prep-text' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copiar texto
              </button>

              <button
                type="button"
                onClick={onDownload}
                disabled={isBusy || cardLoading || !cardUrl}
                className="col-span-2 inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-[12px] font-bold text-white/90 transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyKey === 'prep-download' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Descargar PNG
              </button>
            </div>

            {feedback && (
              <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/15 px-3 py-2 text-[11px] font-semibold text-emerald-100 animate-fadeIn">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                {feedback}
              </div>
            )}

            <div className="mt-3 space-y-1.5 rounded-2xl border border-white/15 bg-white/[0.05] p-3 text-[11px] leading-relaxed text-white/80">
              <p className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#22D3EE]" />
                {meta.hint}
              </p>
              <p className="flex items-start gap-1.5">
                <Smartphone className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#22D3EE]" />
                La imagen y el texto se copian al abrir la red. Pega con Ctrl+V (⌘+V en Mac).
              </p>
            </div>
          </div>
        </div>

        {/* Guía superpuesta: flujo directo de publicación */}
        {guideOpen && (
          <div className="absolute inset-0 z-10 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-fadeIn sm:items-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-[#151C2C] to-[#0B1220] p-5 text-white shadow-2xl">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-2xl bg-[#22D3EE]/15 text-[#22D3EE]">
                  <ClipboardCheck className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                    Plantilla copiada
                  </p>
                  <h3 className="font-display mt-0.5 text-lg font-extrabold tracking-tight">
                    Publica en {meta.short} en 4 pasos
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setGuideOpen(false)}
                  className="ml-auto flex-shrink-0 cursor-pointer rounded-xl bg-white/10 p-1.5 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Cerrar guía"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ol className="mt-4 space-y-2.5">
                {meta.steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-[#22D3EE] text-[11px] font-black text-[#031633]">
                      {index + 1}
                    </span>
                    <span className="text-[12px] leading-relaxed text-white/90">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100">
                Imagen y texto ya están en tu portapapeles. Solo pega y publica.
              </div>

              {target.channel === 'whatsapp' && (
                <p className="mt-2 text-[10px] leading-relaxed text-white/70">
                  WhatsApp no permite enlaces directos a Estados; por eso preparamos tu
                  portapapeles y te guiamos paso a paso.
                </p>
              )}

              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="mt-4 w-full cursor-pointer rounded-xl bg-[#22D3EE] px-4 py-3 text-sm font-extrabold text-[#031633] transition-all hover:-translate-y-0.5 hover:bg-cyan-300"
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPrepModal;
