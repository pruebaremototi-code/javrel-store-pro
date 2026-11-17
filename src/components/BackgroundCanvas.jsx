import React, { useEffect, useRef } from 'react';

/**
 * BackgroundCanvas
 * Efecto de fondo inmersivo y dinámico de alto impacto y definición:
 * Renderiza ondas sinusoidales esculpidas en zafiro profundo (#0A4ABF, #0A6CFF) y platino metálico (#64748B, #94A3B8)
 * con partículas relucientes que reaccionan con fluidez al scroll y al mouse.
 * Calibrado especialmente para fondos claros, blancos y grises perla.
 */
export const BackgroundCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    // En navegadores con canvas bloqueado o sin memoria, getContext devuelve
    // null. Sin esta guarda, el efecto lanzaba una excepción síncrona y React
    // desmontaba toda la app (pantalla blanca).
    if (!ctx) {
      console.warn('[BackgroundCanvas] Canvas 2D no disponible; fondo animado omitido.');
      return undefined;
    }
    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let scrollY = window.scrollY;
    let targetScrollY = window.scrollY;
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY;
    };

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Partículas de alta definición (zafiro y platino)
    const particles = Array.from({ length: 48 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.8 + 1.4,
      speedX: (Math.random() - 0.5) * 0.7,
      speedY: (Math.random() - 0.5) * 0.7,
      alpha: Math.random() * 0.55 + 0.3,
      type: Math.random() > 0.45 ? 'sapphire' : 'platinum',
    }));

    let step = 0;

    const render = () => {
      step += 0.01;
      // Inercia fluida al scroll
      scrollY += (targetScrollY - scrollY) * 0.09;
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      ctx.clearRect(0, 0, width, height);

      // Gradiente ambiental sutil de profundidad zafiro y platino en la parte superior
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        -100,
        50,
        width * 0.5,
        height * 0.6,
        width * 0.8
      );
      bgGrad.addColorStop(0, 'rgba(10, 108, 255, 0.05)');
      bgGrad.addColorStop(0.5, 'rgba(203, 213, 225, 0.03)');
      bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Definición de ondas sinusoidales con alta nitidez y contraste elegante
      const waves = [
        {
          color: 'rgba(10, 74, 191, 0.22)', // Zafiro corporativo profundo
          lineWidth: 2.4,
          wavelength: 0.0025,
          amplitude: 58,
          speed: step * 0.85,
          offsetY: height * 0.32,
        },
        {
          color: 'rgba(10, 108, 255, 0.28)', // Azul eléctrico vibrante
          lineWidth: 2.0,
          wavelength: 0.0034,
          amplitude: 48,
          speed: step * 1.15,
          offsetY: height * 0.48,
        },
        {
          color: 'rgba(100, 116, 139, 0.36)', // Platino metálico contrastado
          lineWidth: 1.8,
          wavelength: 0.002,
          amplitude: 68,
          speed: step * 0.65,
          offsetY: height * 0.64,
        },
        {
          color: 'rgba(2, 132, 199, 0.20)', // Azul cian titanio
          lineWidth: 1.5,
          wavelength: 0.0042,
          amplitude: 38,
          speed: step * 1.35,
          offsetY: height * 0.8,
        },
      ];

      waves.forEach((w, idx) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.lineWidth;

        const scrollShift = scrollY * 0.0035 * (idx + 1);
        const mouseEffect = ((mouseX / width) - 0.5) * 24;

        for (let x = 0; x <= width; x += 10) {
          const y =
            w.offsetY +
            Math.sin(x * w.wavelength + w.speed + scrollShift) * w.amplitude +
            Math.cos(x * 0.0014 + w.speed * 0.5) * (w.amplitude * 0.42) +
            mouseEffect;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Partículas luminosas flotantes
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const currentY = (p.y + (scrollY * 0.07) % height + height) % height;

        ctx.beginPath();
        ctx.arc(p.x, currentY, p.radius, 0, Math.PI * 2);

        if (p.type === 'sapphire') {
          ctx.fillStyle = `rgba(10, 108, 255, ${p.alpha})`;
          ctx.shadowColor = 'rgba(10, 108, 255, 0.5)';
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha * 0.95})`;
          ctx.shadowColor = 'rgba(203, 213, 225, 0.7)';
          ctx.shadowBlur = 5;
        }

        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-95 transition-opacity"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
};
