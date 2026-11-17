import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storeService } from '../services/storeService';

const VisualEditorContext = createContext(null);

export const VisualEditorProvider = ({
  children,
  isAdmin = false,
  permissions = {},
  isPrimary = false,
  adminEmail = '',
  onShowToast,
}) => {
  const [isEditorModeActive, setIsEditorModeActive] = useState(false);
  const canEditPage = Boolean(isAdmin && (isPrimary || permissions?.edit_page));
  const [customizations, setCustomizations] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar personalizaciones iniciales de Supabase / LocalStorage
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const data = await storeService.getCustomizations();
        if (isMounted && data) {
          setCustomizations(data);
        }
      } catch (err) {
        console.warn('Error cargando store_customizations:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // El modo editor solo se activa si el usuario tiene el permiso de edición.
  useEffect(() => {
    setIsEditorModeActive(canEditPage);
  }, [canEditPage]);

  // Obtener texto personalizado o valor inicial
  const getText = useCallback(
    (key, fallbackText = '') => {
      if (!key) return fallbackText;
      if (pendingChanges[key] !== undefined) {
        return pendingChanges[key];
      }
      if (customizations[key] !== undefined) {
        return customizations[key];
      }
      return fallbackText;
    },
    [customizations, pendingChanges]
  );

  // Actualizar texto en caliente (In-Situ)
  const updateText = useCallback((key, newText) => {
    if (!key) return;
    setPendingChanges((prev) => ({
      ...prev,
      [key]: newText,
    }));
  }, []);

  // Guardar todas las personalizaciones en Supabase (store_customizations)
  const saveAllCustomizations = async () => {
    const merged = { ...customizations, ...pendingChanges };
    setIsSaving(true);
    try {
      const { success, supabaseSuccess } = await storeService.saveCustomizations(merged);
      setCustomizations(merged);
      setPendingChanges({});

      if (onShowToast) {
        onShowToast(
          supabaseSuccess
            ? '✅ ¡Textos y personalizaciones guardados permanentemente en Supabase!'
            : '✅ ¡Personalizaciones guardadas y sincronizadas con éxito!'
        );
      }
      return { success: true };
    } catch (err) {
      console.error('Error guardando personalizaciones en Supabase:', err);
      if (onShowToast) onShowToast('⚠️ Error al sincronizar personalizaciones.');
      return { success: false, error: err };
    } finally {
      setIsSaving(false);
    }
  };

  // Descartar cambios pendientes
  const discardPendingChanges = () => {
    setPendingChanges({});
    if (onShowToast) onShowToast('Cambios visuales descartados.');
  };

  const pendingCount = Object.keys(pendingChanges).length;
  const hasPendingChanges = pendingCount > 0;

  const hasPermission = (permission) =>
    Boolean(isAdmin && (isPrimary || permissions?.[permission]));

  const value = {
    isAdmin,
    isPrimary,
    permissions,
    hasPermission,
    canEditPage,
    adminEmail: adminEmail || 'jhonkavasquez@gmail.com',
    isEditorModeActive,
    setIsEditorModeActive,
    toggleEditorMode: () => {
      if (canEditPage) setIsEditorModeActive((prev) => !prev);
    },
    customizations,
    getText,
    updateText,
    saveAllCustomizations,
    discardPendingChanges,
    hasPendingChanges,
    pendingChangesCount: pendingCount,
    isSaving,
    isLoading,
  };

  return (
    <VisualEditorContext.Provider value={value}>
      {children}
    </VisualEditorContext.Provider>
  );
};

export const useVisualEditor = () => {
  const context = useContext(VisualEditorContext);
  if (!context) {
    return {
      isAdmin: false,
      isPrimary: false,
      permissions: {},
      hasPermission: () => false,
      canEditPage: false,
      isEditorModeActive: false,
      getText: (k, fallback) => fallback,
      updateText: () => {},
      saveAllCustomizations: async () => {},
      discardPendingChanges: () => {},
      hasPendingChanges: false,
      pendingChangesCount: 0,
      isSaving: false,
    };
  }
  return context;
};
