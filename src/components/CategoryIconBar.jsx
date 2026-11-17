import React from 'react';
import {
  LayoutGrid,
  Server,
  Layers,
  Cpu,
  Monitor,
  Box,
  Armchair,
  Sparkles,
  Laptop,
  Gamepad2,
  CircuitBoard,
  HardDrive,
  Headphones,
  Keyboard,
  Mouse,
  Zap,
  Video,
} from 'lucide-react';

export const TECH_CATEGORY_ICONS = [
  { id: 'all', name: 'TODO', icon: LayoutGrid, categoryKey: 'all' },
  { id: 'torres', name: 'TORRES', icon: Server, categoryKey: 'torre' },
  { id: 'ram', name: 'RAM', icon: Layers, categoryKey: 'ram' },
  { id: 'gpu', name: 'GPU', icon: CircuitBoard, categoryKey: 'gpu' },
  { id: 'monitores', name: 'MONITORES', icon: Monitor, categoryKey: 'monitor' },
  { id: 'chasis', name: 'CHASIS', icon: Box, categoryKey: 'chasis' },
  { id: 'sillas', name: 'SILLAS', icon: Armchair, categoryKey: 'silla' },
  { id: 'torres-ia', name: 'TORRES IA', icon: Sparkles, categoryKey: 'ia' },
  { id: 'cpu', name: 'CPU', icon: Cpu, categoryKey: 'cpu' },
  { id: 'portatiles', name: 'PORTÁTILES', icon: Laptop, categoryKey: 'computadores' },
  { id: 'simracing', name: 'SIMRACING', icon: Gamepad2, categoryKey: 'simracing' },
  { id: 'board', name: 'BOARD', icon: CircuitBoard, categoryKey: 'board' },
  { id: 'hdd', name: 'HDD', icon: HardDrive, categoryKey: 'hdd' },
  { id: 'audio', name: 'AUDIO', icon: Headphones, categoryKey: 'audio' },
  { id: 'teclado', name: 'TECLADO', icon: Keyboard, categoryKey: 'teclado' },
  { id: 'mouse', name: 'MOUSE', icon: Mouse, categoryKey: 'mouse' },
  { id: 'fuente', name: 'FUENTE', icon: Zap, categoryKey: 'fuente' },
  { id: 'streaming', name: 'STREAMING', icon: Video, categoryKey: 'streaming' },
];

export const CategoryIconBar = ({
  activeCategory,
  onSelectCategory,
  onCategoryClickScroll,
}) => {
  return (
    <section className="relative z-10 w-full bg-white/70 backdrop-blur-xl border-y border-slate-200/70 py-3.5 sm:py-4 shadow-xs transition-all">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center justify-start xl:justify-between gap-3 sm:gap-4 md:gap-5 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth">
          {TECH_CATEGORY_ICONS.map((cat) => {
            const IconComponent = cat.icon;
            const isSelected =
              activeCategory === cat.categoryKey ||
              (cat.categoryKey === 'all' && (!activeCategory || activeCategory === 'all'));

            return (
              <button
                key={cat.id}
                onClick={() => {
                  const nextCategory = isSelected && cat.categoryKey !== 'all' ? 'all' : cat.categoryKey;
                  onSelectCategory(nextCategory);
                  if (onCategoryClickScroll) onCategoryClickScroll();
                }}
                className={`group flex-shrink-0 flex flex-col items-center justify-center gap-1.5 min-w-[56px] sm:min-w-[64px] transition-all duration-200 cursor-pointer outline-none`}
              >
                {/* Cuadro de Icono Minimalista Estilo Referencia */}
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-200 border ${
                    isSelected
                      ? 'bg-blue-50/90 border-[#0A6CFF] text-[#0A6CFF] shadow-sm shadow-blue-500/15 -translate-y-0.5 ring-2 ring-blue-500/20'
                      : 'bg-white/80 border-slate-200/90 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-xs'
                  }`}
                >
                  <IconComponent
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-transform duration-200 ${
                      isSelected ? 'scale-105 stroke-[2.2]' : 'group-hover:scale-105 stroke-[1.8]'
                    }`}
                  />
                </div>

                {/* Título de Categoría Limpio y Minimalista */}
                <span
                  className={`text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-center leading-tight transition-colors ${
                    isSelected
                      ? 'text-[#0A6CFF]'
                      : 'text-slate-500 group-hover:text-slate-900'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
