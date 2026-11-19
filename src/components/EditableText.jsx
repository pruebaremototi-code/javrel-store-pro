import React, { useState, useEffect, useRef } from 'react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { PERMISSIONS } from '../config/rbac';

/**
 * Texto editable in-situ (estilo Wix / Elementor).
 *
 * Arquitectura Anti-Salto de Cursor:
 * - Cuando el elemento está enfocado en edición, React NO toca los nodos hijos
 *   del nodo DOM `contentEditable`. El navegador gestiona el caret de forma nativa.
 * - `textRef` captura cada cambio en `onInput` sin forzar re-renders que destruyan la selección.
 * - El valor se consolida en `onBlur` o cuando se activa el guardado general.
 */
export const EditableText = ({
  id,
  field,
  initialText = '',
  tag: Component = 'span',
  className = '',
  multiline = false,
  placeholder = 'Haz clic para editar texto...',
  value,
  onChange,
  isAdmin: legacyIsAdmin,
  as,
}) => {
  const { isEditorModeActive, getText, updateText, isAdmin, hasPermission } = useVisualEditor();
  const Tag = as || Component;

  const isContextDriven = Boolean(id);
  const activeAdmin = isAdmin ?? legacyIsAdmin;
  const canEdit = Boolean(
    activeAdmin && isEditorModeActive && hasPermission?.(PERMISSIONS.EDIT_PAGE)
  );

  const resolvedValue = isContextDriven ? getText(id, initialText) : value ?? initialText;
  const [isFocused, setIsFocused] = useState(false);
  const elementRef = useRef(null);
  const isFocusedRef = useRef(false);
  const textRef = useRef(resolvedValue || '');

  // Sincronizar el DOM solo cuando el usuario NO está editando activamente
  useEffect(() => {
    textRef.current = resolvedValue || '';
    if (!isFocusedRef.current && elementRef.current) {
      if (elementRef.current.innerText !== (resolvedValue || '')) {
        elementRef.current.innerText = resolvedValue || '';
      }
    }
  }, [resolvedValue]);

  // Si el modo editor está inactivo o no tiene permisos, renderizar elemento estático
  if (!canEdit) {
    return <Tag className={className}>{resolvedValue || initialText}</Tag>;
  }

  const commitText = (rawText) => {
    const newText = String(rawText || '').replace(/\u200B/g, '').trim();
    textRef.current = newText;

    if (newText !== resolvedValue) {
      if (isContextDriven) {
        updateText(id, newText);
      }
      if (onChange) {
        onChange(newText);
      }
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    setIsFocused(true);
  };

  const handleBlur = (e) => {
    isFocusedRef.current = false;
    setIsFocused(false);
    commitText(e.currentTarget.innerText);
  };

  const handleInput = (e) => {
    textRef.current = e.currentTarget.innerText;
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();

    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      commitText(e.currentTarget.innerText);
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (elementRef.current) {
        elementRef.current.innerText = resolvedValue || '';
      }
      textRef.current = resolvedValue || '';
      e.currentTarget.blur();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const plainText = e.clipboardData?.getData('text/plain') || '';
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(plainText));
    selection.collapseToEnd();
    if (elementRef.current) {
      textRef.current = elementRef.current.innerText;
    }
  };

  const stopCardInteraction = (e) => {
    e.stopPropagation();
  };

  return (
    <Tag
      ref={(el) => {
        elementRef.current = el;
        if (el && !isFocusedRef.current && el.innerText !== (resolvedValue || '')) {
          el.innerText = resolvedValue || '';
        }
      }}
      contentEditable={true}
      suppressContentEditableWarning={true}
      spellCheck={false}
      data-inline-editable="true"
      data-editor-field={id || field || undefined}
      aria-label={`Editar ${id || field || 'texto'}`}
      onFocus={handleFocus}
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onClick={stopCardInteraction}
      onDoubleClick={stopCardInteraction}
      onMouseDown={stopCardInteraction}
      onPointerDown={stopCardInteraction}
      onTouchStart={stopCardInteraction}
      data-placeholder={placeholder}
      className={`jr-editable relative transition-all duration-200 outline-none cursor-text ${
        isFocused
          ? 'outline-dashed outline-2 outline-[#0A6CFF] outline-offset-2 bg-blue-50/20 rounded shadow-xs'
          : 'hover:outline-dashed hover:outline-2 hover:outline-[#0A6CFF]/80 hover:outline-offset-2 hover:bg-blue-50/10 rounded'
      } ${className}`}
      title={`Modo Editor Wix: Haz clic para editar (${id || field || 'texto'})`}
    />
  );
};
