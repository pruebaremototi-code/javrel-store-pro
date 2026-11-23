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
        <div className="flex items-center justify-start xl:justify-between gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth">
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
                className={`group flex-shrink-0 flex flex-col items-center justify-center gap-1.5 min-w-[68px] sm:min-w-[76px] px-1 transition-all duration-200 cursor-pointer outline-none`}
              >
                {/* Cuadro de Icono — más grande y compacto */}
                <div
                  className={`w-13 h-13 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-200 border ${
                    isSelected
                      ? 'bg-blue-50/90 border-[#0A6CFF] text-[#0A6CFF] shadow-md shadow-blue-500/20 -translate-y-0.5 ring-2 ring-blue-500/25'
                      : 'bg-white/80 border-slate-200/90 text-slate-500 hover:text-slate-900 hover:border-slate-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-sm'
                  }`}
                >
                  <IconComponent
                    className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-200 ${
                      isSelected ? 'scale-105 stroke-[2.2]' : 'group-hover:scale-105 stroke-[1.8]'
                    }`}
                  />
                </div>

                {/* Etiqueta más legible */}
                <span
                  className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-center leading-tight transition-colors ${
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
