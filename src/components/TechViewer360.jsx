import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Rotate3d, Sparkles } from 'lucide-react';

/**
 * TechViewer360 — Visor Interactivo 360° / 3D de Alto Rendimiento para JavrelStore.
 *
 * Características de Optimización:
 * 1. Cero dependencias externas: React nativo + CSS GPU (transform3d, variables CSS).
 * 2. Un único nodo <img> en el DOM, carga bajo demanda puntual.
 * 3. 60 FPS continuos: transform rotateX/rotateY/translate3d sin reflows ni layout thrashing.
 * 4. touch-action: pan-y para permitir scroll vertical nativo en dispositivos móviles.
 * 5. Inercia con decaimiento por fricción y cancelación de RAF al detenerse.
 * 6. Modo Dual: rotación orbital continua con 2+ imágenes; inclinación 3D + brillo especular con 1 imagen.
 */
export const TechViewer360 = ({
  images = [],
  activeImageIdx = 0,
  onIndexChange,
  alt = 'JavrelStore Producto',
  isZoomEnabled = false,
  className = '',
}) => {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityXRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const inertiaRafRef = useRef(null);
  const springRafRef = useRef(null);
  const rectRef = useRef(null);

  const [isInteracting, setIsInteracting] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const totalImages = Array.isArray(images) ? images.length : 0;
  const isMultiAngle = totalImages >= 2;
  const currentImageUrl = (images && images[activeImageIdx]) || (images && images[0]) || '/zafra/logo-menu.webp';

  // Sensibilidad: píxeles horizontales requeridos para avanzar un fotograma
  const STEP_THRESHOLD = 32;

  const cancelActiveAnimations = useCallback(() => {
    if (inertiaRafRef.current) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }
    if (springRafRef.current) {
      cancelAnimationFrame(springRafRef.current);
      springRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelActiveAnimations();
    };
  }, [cancelActiveAnimations]);

  // Spring back to neutral para modo 1 sola imagen
  const springBackToNeutral = useCallback(() => {
    const el = containerRef.current;
    if (!el || isMultiAngle) return;

    cancelActiveAnimations();

    let currentTiltX = parseFloat(el.style.getPropertyValue('--tilt-x')) || 0;
    let currentTiltY = parseFloat(el.style.getPropertyValue('--tilt-y')) || 0;

    const animateSpring = () => {
      currentTiltX += (0 - currentTiltX) * 0.14;
      currentTiltY += (0 - currentTiltY) * 0.14;

      if (Math.abs(currentTiltX) < 0.08 && Math.abs(currentTiltY) < 0.08) {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
        el.style.setProperty('--sheen-x', '50%');
        el.style.setProperty('--sheen-y', '50%');
        springRafRef.current = null;
        return;
      }

      el.style.setProperty('--tilt-x', `${currentTiltX.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${currentTiltY.toFixed(2)}deg`);
      springRafRef.current = requestAnimationFrame(animateSpring);
    };

    springRafRef.current = requestAnimationFrame(animateSpring);
  }, [isMultiAngle, cancelActiveAnimations]);

  // Inercia suave para modo multi-ángulo
  const startInertia = useCallback(
    (initialVelocity) => {
      if (!isMultiAngle || !onIndexChange) return;

      cancelActiveAnimations();

      let vel = initialVelocity * 14;
      let accum = 0;

      const stepInertia = () => {
        vel *= 0.87;

        if (Math.abs(vel) < 0.22) {
          inertiaRafRef.current = null;
          return;
        }

        accum += vel;
        if (Math.abs(accum) >= STEP_THRESHOLD) {
          const step = accum > 0 ? 1 : -1;
          accum = 0;
          onIndexChange((prev) => (prev - step + totalImages) % totalImages);
        }

        inertiaRafRef.current = requestAnimationFrame(stepInertia);
      };

      inertiaRafRef.current = requestAnimationFrame(stepInertia);
    },
    [isMultiAngle, onIndexChange, totalImages, cancelActiveAnimations]
  );

  const handlePointerDown = (e) => {
    if (isZoomEnabled) return;

    cancelActiveAnimations();

    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityXRef.current = 0;
    accumulatedDeltaRef.current = 0;

    if (containerRef.current) {
      rectRef.current = containerRef.current.getBoundingClientRect();
      containerRef.current.setPointerCapture?.(e.pointerId);
    }

    setIsInteracting(true);
    setHasInteracted(true);
  };

  const handlePointerMove = (e) => {
    if (isZoomEnabled) return;

    const el = containerRef.current;
    if (!el) return;

    const now = performance.now();
    const dt = Math.max(1, now - lastTimeRef.current);
    const deltaX = e.clientX - lastXRef.current;

    // Modo 1: Multi-ángulo (rotación orbital paso a paso)
    if (isMultiAngle && isDraggingRef.current) {
      velocityXRef.current = deltaX / dt;
      lastXRef.current = e.clientX;
      lastTimeRef.current = now;

      accumulatedDeltaRef.current += deltaX;

      if (Math.abs(accumulatedDeltaRef.current) >= STEP_THRESHOLD) {
        const step = accumulatedDeltaRef.current > 0 ? 1 : -1;
        accumulatedDeltaRef.current = accumulatedDeltaRef.current % STEP_THRESHOLD;

        if (onIndexChange) {
          onIndexChange((prev) => (prev - step + totalImages) % totalImages);
        }
      }
      return;
    }

    // Modo 2: Imagen única (inclinación 3D y brillo reactivo)
    if (!isMultiAngle) {
      const rect = rectRef.current || el.getBoundingClientRect();
      const normX = Math.max(-1, Math.min(1, (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)));
      const normY = Math.max(-1, Math.min(1, (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)));

      const rotY = normX * 12;
      const rotX = -normY * 8;

      el.style.setProperty('--tilt-x', `${rotX.toFixed(2)}deg`);
      el.style.setProperty('--tilt-y', `${rotY.toFixed(2)}deg`);
      el.style.setProperty('--sheen-x', `${((normX + 1) * 50).toFixed(1)}%`);
      el.style.setProperty('--sheen-y', `${((normY + 1) * 50).toFixed(1)}%`);
    }
  };

  const handlePointerUp = (e) => {
    if (isZoomEnabled) return;

    if (containerRef.current && e.pointerId) {
      try {
        containerRef.current.releasePointerCapture?.(e.pointerId);
      } catch (_) {}
    }

    isDraggingRef.current = false;
    setIsInteracting(false);

    if (isMultiAngle) {
      if (Math.abs(velocityXRef.current) > 0.35) {
        startInertia(velocityXRef.current);
      }
    } else {
      springBackToNeutral();
    }
  };

  const handlePointerCancel = (e) => {
    handlePointerUp(e);
  };

  const handlePointerLeave = () => {
    if (!isDraggingRef.current && !isMultiAngle) {
      springBackToNeutral();
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      className={`relative w-full h-full flex items-center justify-center select-none overflow-hidden ${
        isZoomEnabled ? '' : 'cursor-grab active:cursor-grabbing'
      } ${className}`}
      style={{
        touchAction: 'pan-y',
        perspective: '1200px',
        WebkitPerspective: '1200px',
      }}
    >
      {/* Capa de reflejo especular reactivo en paleta JavrelStore (azul eléctrico / blanco) */}
      {!isMultiAngle && (
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl transition-opacity duration-300 z-10"
          style={{
            background:
              'radial-gradient(circle at var(--sheen-x, 50%) var(--sheen-y, 50%), rgba(10, 108, 255, 0.18) 0%, rgba(56, 189, 248, 0.06) 45%, transparent 70%)',
            opacity: isInteracting ? 0.95 : 0.4,
          }}
        />
      )}

      {/* Contenedor 3D Acelerado por Hardware */}
      <div
        className="w-full h-full flex items-center justify-center will-change-transform transform-gpu transition-transform duration-75 ease-out"
        style={{
          transform: isMultiAngle
            ? 'translate3d(0, 0, 0)'
            : 'perspective(1200px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translate3d(0, 0, 0)',
          transformStyle: 'preserve-3d',
        }}
      >
        <img
          ref={imgRef}
          src={currentImageUrl}
          alt={alt}
          className="w-full h-full object-cover pointer-events-none select-none transition-transform duration-200"
          decoding="async"
          loading="lazy"
          fetchPriority="normal"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = '/zafra/logo-menu.webp';
          }}
        />
      </div>

      {/* Indicador 360° / 3D con identidad JavrelStore */}
      {!isZoomEnabled && (
        <div
          className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/85 border border-[#0A6CFF]/45 shadow-lg backdrop-blur-md transition-all duration-300 select-none ${
            isInteracting
              ? 'scale-105 border-[#0A6CFF] bg-slate-900/95 shadow-[0_0_16px_rgba(10,108,255,0.45)]'
              : hasInteracted
              ? 'opacity-40 hover:opacity-90'
              : 'opacity-90 animate-pulse'
          }`}
        >
          {isMultiAngle ? (
            <>
              <Rotate3d className="w-3.5 h-3.5 text-[#0A6CFF]" />
              <span className="text-[10px] font-mono-code font-bold tracking-wider text-white">
                Gira 360°
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-[10px] font-mono-code font-bold tracking-wider text-white">
                Efecto 3D
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TechViewer360;
