import React from 'react';
import {
  Sparkles,
  Laptop,
  Gamepad2,
  Tv,
  Printer,
  Smartphone,
  Headphones,
  Cpu,
  Layers,
} from 'lucide-react';

const ICON_MAP = {
  Sparkles,
  Laptop,
  Gamepad2,
  Tv,
  Printer,
  Smartphone,
  Headphones,
  Cpu,
  Layers,
};

export const CategoryPills = ({ categories, activeCategory, onSelectCategory, products = [] }) => {
  return (
    <div className="w-full py-4 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5 pb-2">
          {categories.map((cat) => {
            const IconComponent = ICON_MAP[cat.icon] || Sparkles;
            const isSelected = activeCategory === cat.id;

            // Conteo dinámico de productos para esta categoría
            const count =
              cat.id === 'all'
                ? products.length
                : products.filter((p) => p.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex-shrink-0 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0A6CFF] text-white shadow-md shadow-blue-500/25 border border-[#0A6CFF]'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-[#0A6CFF]'}`}
                />
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono-code font-bold ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
