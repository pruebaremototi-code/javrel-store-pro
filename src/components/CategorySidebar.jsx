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
} from 'lucide-react';

// Mapeo inteligente de iconos según el texto o identificador de categoría
const getCategoryIcon = (id, name = '') => {
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

  return (
    <aside className="w-full lg:w-64 2xl:w-72 flex-shrink-0 sticky top-24 z-30">
      {/* Contenedor Flotante Estilo Cristal / Glassmorphism Luminoso (Sticky) */}
      <div className="rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/90 shadow-xl shadow-slate-200/50 p-3.5 transition-all duration-300">
        {/* Cabecera de Categorías con micro-indicador de estado */}
        <div className="flex items-center justify-between px-2.5 py-2 mb-2.5 border-b border-slate-100/90">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A6CFF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0A6CFF]"></span>
            </span>
            <EditableText
              id="sidebar_categories_title"
              initialText="CATEGORÍAS"
              tag="h3"
              className="text-[11px] font-mono-code uppercase font-extrabold text-slate-800 tracking-wider inline-block"
            />
          </div>
          <span className="text-[10px] font-mono-code text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/60">
            {dynamicCategories.length}
          </span>
        </div>

        {/* Lista de Categorías con Micro-interacciones y Destellos de Color */}
        <div className="space-y-1.5 max-h-[calc(100vh-230px)] overflow-y-auto pr-1 no-scrollbar scroll-smooth">
          {dynamicCategories.map((cat) => {
            const IconComponent = cat.icon;
            const isSelected =
              String(activeCategory || '').toLowerCase() === String(cat?.id || '').toLowerCase();

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`relative w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-300 ease-out transform-gpu group cursor-pointer text-left overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#0A6CFF] to-[#0052FF] text-white shadow-lg shadow-blue-500/30 border border-blue-400 scale-[1.02]'
                    : 'bg-white/60 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-white text-slate-700 hover:text-slate-900 border border-slate-100 hover:border-blue-300/70 hover:shadow-md hover:shadow-blue-500/10 hover:-translate-y-0.5'
                }`}
              >
                {/* Cuadro de Icono con Micro-interacción */}
                <div
                  className={`w-7.5 h-7.5 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isSelected
                      ? 'bg-white/20 text-white shadow-inner'
                      : 'bg-white text-[#0A6CFF] border border-slate-200/80 shadow-2xs group-hover:scale-110 group-hover:bg-blue-500/15 group-hover:text-[#0A6CFF]'
                  }`}
                >
                  <IconComponent className="w-4 h-4 transition-transform duration-300 group-hover:rotate-3" />
                </div>

                {/* Nombre de la Categoría */}
                <span className="flex-1 truncate tracking-tight text-[12px] font-bold">
                  {cat.name}
                </span>

                {/* Badge de Conteo de Productos */}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold flex-shrink-0 transition-all duration-200 ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-slate-100 text-slate-500 border border-slate-200/60 group-hover:bg-blue-100 group-hover:text-[#0A6CFF] group-hover:border-blue-200'
                  }`}
                >
                  {cat.count}
                </span>

                {/* Destello sutil en el lateral para el item seleccionado */}
                {isSelected && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 rounded-r-2xl" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
