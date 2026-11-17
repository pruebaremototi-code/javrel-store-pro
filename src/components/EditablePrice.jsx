import React, { useEffect, useRef, useState } from 'react';

/**
 * Editor numérico compacto para precios in-situ.
 *
 * - Entra en edición con un solo clic (selecciona el contenido al enfocar).
 * - Mantiene un borrador local y solo confirma al hacer blur o Enter.
 * - Absorbe todos los eventos de puntero para que la tarjeta no abra el modal.
 * - `tone="regular"` pinta el precio de lista en tono secundario;
 *   `tone="offer"` destaca el precio de oferta en azul.
 */
export const EditablePrice = ({
  value,
  onChange,
  label = 'Precio',
  placeholder = '0',
  allowEmpty = false,
  tone = 'offer',
  className = '',
}) => {
  const [draft, setDraft] = useState(value === null || value === undefined ? '' : String(value));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  const isRegular = tone === 'regular';
  const shellClass = isRegular
    ? 'border-slate-300/90 bg-slate-50/90'
    : 'border-[#0A6CFF]/35 bg-blue-50/70';
  const symbolClass = isRegular ? 'text-slate-400' : 'text-[#0A6CFF]';
  const inputClass = isRegular
    ? 'text-slate-600 placeholder:text-slate-400'
    : 'text-[#0A6CFF] placeholder:text-blue-400/70';
  const labelClass = isRegular ? 'text-slate-400' : 'text-slate-500';

  useEffect(() => {
    if (!isFocused) {
      setDraft(value === null || value === undefined ? '' : String(value));
    }
  }, [value, isFocused]);

  const commitPrice = () => {
    const digits = String(draft).replace(/[^\d]/g, '');

    if (!digits) {
      if (allowEmpty) {
        if (value !== null && value !== undefined) {
          onChange?.(null);
        }
      } else {
        setDraft(value === null || value === undefined ? '' : String(value));
      }
      return;
    }

    const numericValue = Number(digits);
    if (!Number.isNaN(numericValue) && numericValue !== Number(value)) {
      onChange?.(numericValue);
    } else {
      setDraft(String(numericValue));
    }
  };

  const stopCardInteraction = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 ${shellClass} ${className}`}
      onClick={stopCardInteraction}
      onDoubleClick={stopCardInteraction}
      onMouseDown={stopCardInteraction}
      onPointerDown={stopCardInteraction}
    >
      <span className={`text-[10px] font-black ${symbolClass}`}>$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        data-price-field={label}
        value={draft}
        placeholder={placeholder}
        aria-label={`Editar ${label}`}
        title={`Editar ${label} in-situ`}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onFocus={(e) => {
          setIsFocused(true);
          const input = e.currentTarget;
          // Un solo clic deja el valor listo para reemplazar.
          requestAnimationFrame(() => input.select());
        }}
        onBlur={() => {
          setIsFocused(false);
          commitPrice();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setDraft(value === null || value === undefined ? '' : String(value));
            e.currentTarget.blur();
          }
        }}
        onClick={stopCardInteraction}
        onDoubleClick={stopCardInteraction}
        onMouseDown={stopCardInteraction}
        onPointerDown={stopCardInteraction}
        className={`min-w-0 flex-1 w-full bg-transparent text-[11px] font-bold font-display outline-none ${inputClass}`}
      />
      <span
        className={`shrink-0 text-[8px] font-mono-code font-bold uppercase tracking-wide ${labelClass}`}
      >
        {label}
      </span>
    </div>
  );
};
