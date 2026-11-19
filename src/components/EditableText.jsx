import React, { useState, useEffect, useRef } from 'react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { PERMISSIONS } from '../config/rbac';

/**
 * Texto editable in-situ (estilo Wix / Elementor).
 *
 * Reglas clave:
 * - Solo es editable si el administrador tiene activo el "Modo Editor".
 * - El clic sobre el texto NUNCA debe burbujear a la tarjeta ni abrir el modal de detalle.
 * - No se renderiza ningún badge dentro del nodo contentEditable: así el texto
 *   leído al hacer blur no se contamina con iconos o etiquetas auxiliares.
 */
export const EditableText = ({
  id,
  field,
  initialText = '',
  tag: Component = 'span',
  className = '',
  multiline = false,
  placeholder = 'Haz clic para editar texto...',
  // Props de compatibilidad con la versión anterior (edición por campo de producto)
  value,
  onChange,
  isAdmin: legacyIsAdmin,
  as,
}) => {
  const { isEditorModeActive, getText, updateText, isAdmin, hasPermission } = useVisualEditor();
  const Tag = as || Component;

  // Determinar si opera por ID de Contexto o por props controladas legacy
  const isContextDriven = Boolean(id);
  const activeAdmin = isAdmin ?? legacyIsAdmin;
  const canEdit = Boolean(
    activeAdmin && isEditorModeActive && hasPermission?.(PERMISSIONS.EDIT_PAGE)
  );

  // Valor actual
  const resolvedValue = isContextDriven ? getText(id, initialText) : value ?? initialText;
  const [currentText, setCurrentText] = useState(resolvedValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const elementRef = useRef(null);

  // Sincronizar cambios externos solo cuando el usuario no está escribiendo.
  // Evita que un re-render de la tarjeta mueva el cursor mientras se edita.
  useEffect(() => {
    if (!isFocused) {
      setCurrentText(resolvedValue || '');
    }
  }, [resolvedValue, isFocused]);

  // Si el modo editor está apagado (o no es admin), renderizar elemento plano.
  if (!canEdit) {
    return <Tag className={className}>{resolvedValue || initialText}</Tag>;
  }

  const commitText = (rawText) => {
    const newText = String(rawText || '').replace(/\u200B/g, '').trim();
    setCurrentText(newText);

    if (newText !== resolvedValue) {
      if (isContextDriven) {
        updateText(id, newText);
      }
      if (onChange) {
        onChange(newText);
      }
    }
  };

  // Manejo de edición directa en pantalla (ContentEditable)
  const handleBlur = (e) => {
    setIsFocused(false);
    commitText(e.currentTarget.innerText);
  };

  const handleKeyDown = (e) => {
    // Evita que atajos globales de la tarjeta reaccionen mientras se escribe.
    e.stopPropagation();

    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.innerText = resolvedValue;
      setCurrentText(resolvedValue || '');
      e.currentTarget.blur();
    }
  };

  // Pegar siempre como texto plano: evita HTML/estilos externos dentro de la tarjeta.
  const handlePaste = (e) => {
    e.preventDefault();
    const plainText = e.clipboardData?.getData('text/plain') || '';
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    selection.deleteFromDocument();
    selection.getRangeAt(0).insertNode(document.createTextNode(plainText));
    selection.collapseToEnd();
  };

  // El texto y sus controles absorben el clic: la tarjeta jamás debe abrir el modal.
  const stopCardInteraction = (e) => {
    e.stopPropagation();
  };

  return (
    <Tag
      ref={elementRef}
      contentEditable={true}
      suppressContentEditableWarning={true}
      spellCheck={false}
      data-inline-editable="true"
      data-editor-field={id || field || undefined}
      aria-label={`Editar ${id || field || 'texto'}`}
      onFocus={() => setIsFocused(true)}
      onInput={(e) => commitText(e.currentTarget.innerText)}
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
      title={`Modo Editor Wix: Haz clic para editar (${id || 'texto'})`}
    >
      {currentText ? currentText : null}
    </Tag>
  );
};
