import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Check, ArrowRight } from 'lucide-react';
import { buildWhatsAppUrl } from '../services/storeService';
import confetti from 'canvas-confetti';

export const WhatsAppRail = ({ config }) => {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const railRef = useRef(null);
  const isDragging = useRef(false);

  const whatsappUrl = buildWhatsAppUrl(
    config.whatsappNumber,
    `¡Hola ${config.storeName}! Vengo de la tienda virtual y me gustaría cotizar un producto.`
  );

  const triggerConnect = () => {
    setIsDone(true);
    setProgress(1);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#0A6CFF', '#25D366', '#38BDF8'],
    });

    setTimeout(() => {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => {
        setIsDone(false);
        setProgress(0);
      }, 2000);
    }, 400);
  };

  const updateProgress = (clientX) => {
    if (!railRef.current) return;
    const rect = railRef.current.getBoundingClientRect();
    const width = rect.width - 56;
    const offset = Math.max(0, Math.min(width, clientX - rect.left - 28));
    const p = offset / width;
    setProgress(p);

    if (p >= 0.88 && !isDone) {
      isDragging.current = false;
      triggerConnect();
    }
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    updateProgress(e.clientX);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging.current) return;
      updateProgress(e.clientX);
    };

    const handlePointerUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (progress < 0.88) {
        setProgress(0);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [progress, isDone]);

  return (
    <div className="py-12 px-4 flex flex-col items-center justify-center">
      <div className="text-center mb-4">
        <span className="text-[11px] font-mono-code uppercase tracking-widest text-[#0A6CFF] font-bold">
          CONEXIÓN INSTANTÁNEA
        </span>
        <h3 className="font-display font-bold text-xl text-slate-800">
          ¿Deseas atención personalizada o cotizar a medida?
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Desliza la clavija o presiona el conector para hablar directamente con nuestro equipo técnico.
        </p>
      </div>

      {/* Riel Deslizante Magnético */}
      <div
        ref={railRef}
        className={`relative w-full max-w-[420px] h-[64px] rounded-full bg-white border border-slate-300 shadow-md select-none touch-none overflow-hidden transition-all duration-300 ${
          isDone ? 'ring-4 ring-emerald-400/40 border-emerald-500' : ''
        }`}
      >
        {/* Relleno de avance */}
        <div
          className="absolute inset-y-1.5 left-1.5 rounded-full bg-gradient-to-r from-blue-50 via-blue-100 to-[#0A6CFF]/20 pointer-events-none transition-all duration-75"
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />

        {/* Texto indicador central */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-mono-code font-bold uppercase tracking-wider text-slate-400 transition-opacity"
          style={{ opacity: Math.max(0, 1 - progress * 2) }}
        >
          <span>Desliza para conectar WhatsApp</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 animate-pulse text-[#0A6CFF]" />
        </div>

        {/* Clavija deslizable */}
        <div
          onPointerDown={handlePointerDown}
          className={`absolute top-1.5 w-[52px] h-[52px] rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing text-white shadow-lg transition-transform duration-75 ${
            isDone
              ? 'bg-[#25D366] shadow-emerald-500/50 scale-105'
              : 'bg-gradient-to-tr from-[#0A6CFF] to-[#38BDF8] shadow-blue-500/35 hover:scale-105'
          }`}
          style={{
            transform: `translate3d(${progress * (railRef.current ? railRef.current.offsetWidth - 64 : 350)}px, 0, 0)`,
          }}
        >
          {isDone ? (
            <Check className="w-6 h-6 animate-scaleUp" />
          ) : (
            <MessageCircle className="w-6 h-6" />
          )}
        </div>

        {/* Puerto de destino */}
        <button
          onClick={triggerConnect}
          className={`absolute right-1.5 top-1.5 bottom-1.5 w-[52px] rounded-full border-2 border-dashed flex items-center justify-center font-mono-code text-[10px] font-bold transition-all ${
            isDone
              ? 'bg-[#25D366] text-white border-emerald-500'
              : 'border-[#0A6CFF]/40 text-[#0A6CFF] bg-blue-50/50 hover:bg-blue-100/60'
          }`}
          title="Conectar"
        >
          {isDone ? 'LISTO' : 'CHATEAR'}
        </button>
      </div>
    </div>
  );
};
