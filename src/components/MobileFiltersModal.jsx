import React from 'react';
import {
  X,
  Sparkles,
  Laptop,
  Gamepad2,
  Tv,
  Printer,
  Smartphone,
  Headphones,
  Cpu,
  Layers,
  ArrowUpDown,
  Check,
  RotateCcw,
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

export const MobileFiltersModal = ({
  isOpen,
  onClose,
  categories = [],
  activeCategory,
  onSelectCategory,
  sortBy,
  onSelectSortBy,
  products = [],
  onResetFilters,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full sm:max-w-md bg-[#0B132B] border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col text-white animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal Móvil */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0A6CFF]/20 flex items-center justify-center text-[#38BDF8]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Categorías y Filtros
              </h3>
              <p className="text-[11px] text-slate-400 font-mono-code">
                {products.length} productos en catálogo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido con scroll táctil suave */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 no-scrollbar">
          {/* Categorías */}
          <div>
            <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-slate-400 mb-3 block">
              Explorar por Categoría
            </span>
            <div className="grid grid-cols-1 gap-2">
              {(Array.isArray(categories) ? categories : []).map((cat) => {
                if (!cat) return null;
                const IconComponent = ICON_MAP[cat.icon] || Sparkles;
                const catIdStr = String(cat.id || '').trim();
                const isSelected = String(activeCategory || '').toLowerCase() === catIdStr.toLowerCase();
                const count =
                  catIdStr === 'all'
                    ? (Array.isArray(products) ? products : []).length
                    : (Array.isArray(products) ? products : []).filter(
                        (p) => p && String(p.category || '').toLowerCase() === catIdStr.toLowerCase()
                      ).length;

                return (
                  <button
                    key={cat.id || catIdStr}
                    onClick={() => {
                      onSelectCategory(cat.id || catIdStr);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? 'bg-[#0A6CFF] border-[#0A6CFF] text-white shadow-lg shadow-blue-500/25'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-[#38BDF8]'
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-mono-code font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ordenar productos */}
          <div>
            <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-slate-400 mb-3 block">
              Criterio de Orden
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'featured', label: 'Recomendado' },
                { id: 'price-asc', label: 'Menor Precio' },
                { id: 'price-desc', label: 'Mayor Precio' },
                { id: 'name', label: 'Alfabético A-Z' },
              ].map((sortOption) => {
                const isSelected = sortBy === sortOption.id;
                return (
                  <button
                    key={sortOption.id}
                    onClick={() => onSelectSortBy(sortOption.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      isSelected
                        ? 'bg-blue-600/30 border-[#0A6CFF] text-[#38BDF8]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sortOption.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="p-4 border-t border-slate-800 bg-[#070D1F] flex items-center gap-3">
          <button
            onClick={() => {
              onResetFilters();
              onClose();
            }}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5"
            title="Restablecer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-[#0A6CFF] hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 transition-all text-center"
          >
            Ver Resultados
          </button>
        </div>
      </div>
    </div>
  );
};
