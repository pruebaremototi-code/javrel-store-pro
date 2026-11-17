import React, { useRef, useEffect, useState } from 'react';
import { EditableText } from './EditableText';

export const ParticleTitle = ({
  text = 'Tecnología Prémium al Alcance de tus Manos',
  onChange,
  isAdmin = false,
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef([]);

  // Paleta de partículas multicolor prémium: Azul eléctrico, Cyan neón, Oro solar, Violeta, Esmeralda, Rosa
  const COLORS = [
    '#0A6CFF',
    '#38BDF8',
    '#60A5FA',
    '#F59E0B',
    '#F43F5E',
    '#A855F7',
    '#10B981',
    '#E2E8F0',
    '#38BDF8',
  ];

  const initParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const count = Math.min(180, Math.floor(width * 0.45));
    const newParticles = [];

    for (let i = 0; i < count; i++) {
      // Coordenada inicial distribuida sobre el área del texto
      const originX = Math.random() * (width - 40) + 20;
      const originY = Math.random() * (height - 20) + 10;

      // Velocidad de dispersión en ángulo aleatorio
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 2.0;

      newParticles.push({
        originX,
        originY,
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 1.5),
        size: Math.random() * 3.5 + 1.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.4 + 0.6,
        life: 1.0,
      });
    }

    particlesRef.current = newParticles;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [text]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isHovered) {
      initParticles();
    }

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let anyActive = false;

      particlesRef.current.forEach((p) => {
        if (isHovered) {
          // Fase 1: Dispersión y vuelo orgánico al hacer hover
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.96;
          p.vy *= 0.96;
          // Ligero baile oscilatorio
          p.x += (Math.random() - 0.5) * 0.8;
          p.y += (Math.random() - 0.5) * 0.8;
          anyActive = true;
        } else {
          // Fase 2: Reagrupación magnética hacia las coordenadas del texto
          const dx = p.originX - p.x;
          const dy = p.originY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 1.2) {
            p.x += dx * 0.14;
            p.y += dy * 0.14;
            anyActive = true;
          } else {
            p.x = p.originX;
            p.y = p.originY;
          }
        }

        // Dibujar partícula con resplandor
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      if (isHovered || anyActive) {
        animationFrameRef.current = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    render();

    return () => {
      isRunning = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovered]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative inline-block cursor-pointer select-none py-1 group"
    >
      {/* Canvas interactivo de partículas multicolores superpuesto */}
      <canvas
        ref={canvasRef}
        className={`pointer-events-none absolute inset-0 w-full h-full z-20 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-80'
        }`}
      />

      {/* Título Principal con desvanecimiento y desenfoque suave al hover */}
      <h1
        className={`font-display font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight text-white leading-[1.12] transition-all duration-700 ease-out ${
          isHovered
            ? 'opacity-20 scale-[0.98] blur-[4px]'
            : 'opacity-100 scale-100 blur-0'
        }`}
        style={{
          textShadow: '0 4px 30px rgba(5,7,13,0.8), 0 0 45px rgba(10,108,255,0.35)',
        }}
      >
        <EditableText
          value={text}
          onChange={onChange}
          isAdmin={isAdmin}
          as="span"
          multiline
        />
      </h1>
    </div>
  );
};
