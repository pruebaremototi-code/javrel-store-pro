import React, { useRef } from 'react';
import { EditableText } from './EditableText';

export const ShowcaseVideoReel = () => {
  const videoRef = useRef(null);

  return (
    <div className="w-full mb-6">
      {/* Contenedor Alargado Estilo Cristal Real (Glassmorphism Puro, Translúcido con Bordes Cromados) */}
      <div className="relative rounded-3xl overflow-hidden bg-white/75 backdrop-blur-2xl border border-white/90 shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/60 transition-all duration-500">
        {/* Reflejo cromado superior tipo cristal biselado */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90 z-20 pointer-events-none" />

        {/* Video en Bucle Fluido con Mezcla Translúcida Atmosférica (Sin Fondos Negros Sólidos) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover filter brightness-[1.1] contrast-[1.05] opacity-25 mix-blend-multiply"
          >
            <source src="/zafra/fondo-catalogo.mp4" type="video/mp4" />
          </video>

          {/* Gradientes de Cristal Luminoso que dejan traslucir el fondo inmersivo y las partículas */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-blue-50/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-white/95" />
        </div>

        {/* Contenido en Primer Plano Alargado, Luminoso, Nítido y Limpio */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col justify-center min-h-[190px] sm:min-h-[220px] lg:min-h-[250px]">
          {/* Identidad Oficial JavrelStore */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A6CFF] animate-pulse shadow-[0_0_12px_rgba(10,108,255,0.8)]" />
            <span className="text-[11px] sm:text-xs font-mono-code font-bold uppercase tracking-widest text-[#0A6CFF]">
              — JAVRELSTORE SHOWCASE
            </span>
          </div>

          {/* Título Principal */}
          <h2 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-slate-900 tracking-tight mb-2 drop-shadow-xs">
            <EditableText
              id="showcase_title"
              initialText="Todo el catálogo"
              tag="span"
            />
          </h2>

          {/* Subtítulo Descriptivo de Alta Legibilidad */}
          <p className="text-xs sm:text-sm lg:text-base text-slate-600 leading-relaxed max-w-2xl font-medium">
            <EditableText
              id="showcase_subtitle"
              initialText="Elige una categoría o busca lo que necesitas. Precios en pesos colombianos con despacho inmediato a todo el país."
              tag="span"
              multiline
            />
          </p>
        </div>
      </div>
    </div>
  );
};
