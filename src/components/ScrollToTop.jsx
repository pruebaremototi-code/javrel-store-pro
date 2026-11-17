import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export const ScrollToTop = ({ isAdminActive = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 350);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Volver arriba"
      className={`fixed ${
        isAdminActive ? 'bottom-24 right-5 sm:right-6' : 'bottom-6 right-5 sm:right-6'
      } z-40 w-11 h-11 rounded-full bg-white/95 text-slate-700 hover:text-[#0A6CFF] border border-slate-200/90 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md active:scale-95 flex items-center justify-center group cursor-pointer ${
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto scale-100'
          : 'opacity-0 translate-y-4 pointer-events-none scale-90'
      }`}
      title="Volver al inicio"
    >
      <ArrowUp className="w-5 h-5 transition-transform duration-200 group-hover:-translate-y-0.5 text-slate-700 group-hover:text-[#0A6CFF]" />
    </button>
  );
};
