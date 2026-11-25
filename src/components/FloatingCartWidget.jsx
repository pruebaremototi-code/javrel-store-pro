import React, { useState } from 'react';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../services/storeService';

export const FloatingCartWidget = ({
  cartItems = [],
  onOpenCart,
}) => {
  const [prevCount, setPrevCount] = useState(0);
  const [isBumping, setIsBumping] = useState(false);

  const totalCount = (Array.isArray(cartItems) ? cartItems : []).reduce(
    (acc, item) => acc + (Number(item?.quantity) || 0),
    0
  );

  const totalAmount = (Array.isArray(cartItems) ? cartItems : []).reduce(
    (acc, item) => acc + (Number(item?.price) || 0) * (Number(item?.quantity) || 0),
    0
  );

  if (totalCount !== prevCount) {
    setPrevCount(totalCount);
    if (totalCount > 0 && !isBumping) {
      setIsBumping(true);
      setTimeout(() => setIsBumping(false), 350);
    }
  }

  return (
    <button
      type="button"
      onClick={onOpenCart}
      aria-label={`Abrir carrito de compras: ${totalCount} artículos por ${formatCurrency(totalAmount)}`}
      className={`fixed top-20 sm:top-24 right-3 sm:right-6 z-40 group flex items-center gap-2.5 p-1.5 sm:p-2 pr-3.5 sm:pr-4 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-[0_8px_30px_rgba(10,108,255,0.14)] hover:shadow-[0_12px_36px_rgba(10,108,255,0.22)] hover:border-[#0A6CFF]/40 transition-all duration-300 cursor-pointer active:scale-95 ${
        isBumping ? 'scale-105 ring-2 ring-[#0A6CFF]/30' : 'scale-100'
      }`}
      title="Ver Carrito de Compras y Checkout"
    >
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#0052cc] via-[#0A6CFF] to-[#38bdf8] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
        <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />

        {totalCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-mono-code font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-scaleUp">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        ) : (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
        )}
      </div>

      <div className="text-left leading-tight hidden xs:block">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono-code font-bold uppercase tracking-wider text-slate-400 group-hover:text-[#0A6CFF] transition-colors">
            {totalCount > 0 ? `${totalCount} ${totalCount === 1 ? 'ítem' : 'ítems'}` : 'Carrito'}
          </span>
          {totalCount > 0 && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
        </div>
        <div className="font-display font-extrabold text-xs sm:text-[13px] text-slate-900 tracking-tight">
          {totalCount > 0 ? formatCurrency(totalAmount) : 'Vacío'}
        </div>
      </div>

      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0A6CFF] group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block" />
    </button>
  );
};
