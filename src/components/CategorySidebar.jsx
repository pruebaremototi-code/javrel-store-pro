import React, { useMemo } from 'react';
import { EditableText } from './EditableText';
import {
  Sparkles,
  Zap,
  Cable,
  Headphones,
  Bluetooth,
  Gamepad2,
  SlidersHorizontal,
  Layers,
  Mic,
  Laptop,
  Tv,
  Printer,
  Smartphone,
  Keyboard,
  Mouse,
  LayoutGrid,
  Radio,
  Watch,
  Folder,
  Tag,
  RotateCcw,
  Check,
} from 'lucide-react';
import { formatCurrency } from '../services/storeService';

// Mapeo inteligente de iconos según el texto o identificador de categoría
const getCategoryIcon = (id = '', name = '') => {
  const norm = (id + ' ' + name).toLowerCase();
  if (norm.includes('todo') || norm === 'all') return LayoutGrid;
  if (norm.includes('carga') || norm.includes('power')) return Zap;
  if (norm.includes('cable')) return Cable;
  if (norm.includes('audifono') || norm.includes('manos libres') || norm.includes('audio') || norm.includes('diadema') || norm.includes('cuellero')) return Headphones;
  if (norm.includes('bluetooth') || norm.includes('inalambrico')) return Bluetooth;
  if (norm.includes('control') || norm.includes('gamer') || norm.includes('juego')) return Gamepad2;
  if (norm.includes('convertidor') || norm.includes('adaptador')) return SlidersHorizontal;
  if (norm.includes('holder') || norm.includes('soporte')) return Smartphone;
  if (norm.includes('microfono') || norm.includes('audio')) return Mic;
  if (norm.includes('pc') || norm.includes('computador') || norm.includes('torre') || norm.includes('laptop')) return Laptop;
  if (norm.includes('consola') || norm.includes('tv')) return Tv;
  if (norm.includes('impresora')) return Printer;
  if (norm.includes('celular') || norm.includes('iphone')) return Smartphone;
  if (norm.includes('teclado')) return Keyboard;
  if (norm.includes('mouse')) return Mouse;
  if (norm.includes('reloj') || norm.includes('smartwatch')) return Watch;
  return Layers;
};

export const CategorySidebar = ({
  categories = [],
  products = [],
  activeCategory = 'all',
  onSelectCategory,
  filterType = 'all',
  onSelectType,
  filterPriceMin = 0,
  filterPriceMax = 2000000,
  maxAvailablePrice = 2000000,
  onSelectPriceMax,
  filterInStockOnly = false,
  onToggleInStockOnly,
  onResetFilters,
}) => {
  // Generar lista consolidada de categorías dinámicas basadas en productos y configuración
  const dynamicCategories = useMemo(() => {
    const map = new Map();
    const safeProducts = Array.isArray(products) ? products : [];
    const safeCategories = Array.isArray(categories) ? categories : [];

    // 1. Siempre incluir 'Todo el catálogo' primero
    map.set('all', {
      id: 'all',
      name: 'Todo el catálogo',
      count: safeProducts.length,
      icon: LayoutGrid,
    });

    // 2. Incorporar categorías configuradas
    safeCategories.forEach((cat) => {
      if (!cat) return;
      const catId = String(cat.id || '').trim();
      if (!catId || catId.toLowerCase() === 'all') return;
      const catName = String(cat.name || catId).trim();
      const catIdLower = catId.toLowerCase();
      const catNameLower = catName.toLowerCase();

      const count = safeProducts.filter((p) => {
        if (!p) return false;
        const pCat = String(p.category || '').toLowerCase().trim();
        return pCat === catIdLower || pCat === catNameLower;
      }).length;

      map.set(catIdLower, {
        id: catId,
        name: catName,
        count: count,
        icon: getCategoryIcon(catId, catName),
      });
    });

    // 3. Descubrir categorías de productos existentes que no estén en la configuración
    safeProducts.forEach((p) => {
      if (!p) return;
      const rawCat = String(p.category || '').trim();
      if (!rawCat || rawCat.toLowerCase() === 'all') return;
      const key = rawCat.toLowerCase();
      if (!map.has(key)) {
        const displayName = rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
        const count = safeProducts.filter(
          (item) => item && String(item.category || '').toLowerCase().trim() === key
        ).length;

        map.set(key, {
          id: key,
          name: displayName,
          count: count,
          icon: getCategoryIcon(key, displayName),
        });
      }
    });

    return Array.from(map.values());
  }, [categories, products]);

  const typeOptions = [
    { id: 'all', label: 'TODO' },
    { id: 'ofertas', label: 'OFERTAS' },
    { id: 'nuevos', label: 'NUEVOS' },
    { id: 'destacados', label: 'TOP' },
  ];

  return (
    <aside className="w-full">
      {/* Contenedor Vertical de Filtros Estilo JavrelStore Luxury Glassmorphism */}
      <div className="w-full rounded-3xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-4 transition-all duration-300 space-y-5">
        
        {/* =========================================================
            1. CATEGORÍAS
           ========================================================= */}
        <div>
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A6CFF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0A6CFF]" />
              </span>
              <h4 className="text-[11px] font-mono-code tracking-[0.18em] uppercase font-extrabold text-slate-800">
                CATEGORÍAS
              </h4>
            </div>
            <span className="text-[10px] font-mono-code text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/70">
              {dynamicCategories.length}
            </span>
          </div>

          <div className="space-y-1 max-h-56 overflow-y-auto pr-1 no-scrollbar scroll-smooth">
            {dynamicCategories.map((cat) => {
              const IconComp = cat.icon;
              const isSelected =
                String(activeCategory || '').toLowerCase() === String(cat.id || '').toLowerCase();

              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 group cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] text-white shadow-md shadow-blue-500/25 border border-blue-400'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-blue-50/70 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <IconComp
                      className={`w-3.5 h-3.5 transition-colors ${
                        isSelected ? 'text-white' : 'text-[#0A6CFF] group-hover:scale-110'
                      }`}
                    />
                    <span className="truncate text-[12px] font-bold">{cat.name}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono-code px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-[#0A6CFF]'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            2. TIPO / GAMA (Segmented Pill Switch)
           ========================================================= */}
        <div className="pt-3 border-t border-slate-100">
          <h4 className="text-[11px] font-mono-code tracking-[0.18em] uppercase font-extrabold text-slate-800 mb-2.5">
            TIPO / GAMA
          </h4>
          <div className="p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 grid grid-cols-4 gap-1">
            {typeOptions.map((opt) => {
              const active = (filterType || 'all') === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectType && onSelectType(opt.id)}
                  className={`py-1.5 px-1 text-[10px] font-mono-code font-bold tracking-wider rounded-lg text-center transition-all duration-200 uppercase truncate cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] text-white shadow-md shadow-blue-500/25 font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================
            3. PRECIO (Slider con Rombos y Gradiente Azul Eléctrico)
           ========================================================= */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[11px] font-mono-code tracking-[0.18em] uppercase font-extrabold text-slate-800">
              PRECIO
            </h4>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono-code mb-2">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block">DESDE</span>
              <span className="text-slate-700 font-bold">
                {formatCurrency(filterPriceMin || 0)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 font-bold uppercase block">HASTA</span>
              <span className="text-[#0A6CFF] font-black">
                {formatCurrency(filterPriceMax || maxAvailablePrice)}
              </span>
            </div>
          </div>

          {/* Slider input */}
          <div className="px-1 py-1.5">
            <input
              type="range"
              min="0"
              max={maxAvailablePrice}
              step="10000"
              value={filterPriceMax}
              onChange={(e) => onSelectPriceMax && onSelectPriceMax(Number(e.target.value))}
              className="slider-diamond w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200"
              style={{
                background: `linear-gradient(to right, #0A6CFF ${
                  (filterPriceMax / (maxAvailablePrice || 1)) * 100
                }%, #E2E8F0 ${(filterPriceMax / (maxAvailablePrice || 1)) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* =========================================================
            4. DISPONIBILIDAD (Stock Inmediato Toggle)
           ========================================================= */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-[11px] font-mono-code tracking-[0.18em] uppercase font-extrabold text-slate-800">
              DISPONIBILIDAD
            </h4>
            <span className="text-[10px] text-slate-500 font-medium">Sólo en stock inmediato</span>
          </div>

          {/* Luxury Switch Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={filterInStockOnly}
            onClick={() => onToggleInStockOnly && onToggleInStockOnly(!filterInStockOnly)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              filterInStockOnly ? 'bg-gradient-to-r from-[#0A6CFF] to-[#0052FF]' : 'bg-slate-200'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                filterInStockOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* =========================================================
            5. BOTÓN LIMPIAR FILTROS (Anclado al fondo)
           ========================================================= */}
        {onResetFilters && (
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={onResetFilters}
              className="w-full py-2.5 px-3 rounded-xl text-[11px] font-mono-code font-bold tracking-[0.18em] uppercase transition-all duration-200 flex items-center justify-center gap-2 border border-blue-200 text-[#0A6CFF] hover:bg-blue-50/80 hover:border-blue-300 cursor-pointer active:scale-98 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              LIMPIAR FILTROS
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
