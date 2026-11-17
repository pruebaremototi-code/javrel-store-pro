import React, { useState } from 'react';
import {
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  LogOut,
  Sliders,
  CheckCircle2,
  PackagePlus,
  UploadCloud,
  Flame,
  Layout,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { PERMISSIONS, getRoleLabel } from '../config/rbac';

export const WixEditorTopBar = ({
  currentUser = null,
  can = null,
  onOpenBulkImport,
  onOpenOrdersDashboard,
  onOpenUsers,
  onAddNewProduct,
  onLogout,
  onSaveStore,
  storePendingChanges = false,
}) => {
  const {
    isAdmin,
    adminEmail,
    isEditorModeActive,
    toggleEditorMode,
    saveAllCustomizations,
    discardPendingChanges,
    hasPendingChanges,
    pendingChangesCount,
    isSaving,
  } = useVisualEditor();

  const [showBlockMenu, setShowBlockMenu] = useState(false);

  const canAccess = (permission) => {
    if (!currentUser) return false;
    if (currentUser.isPrimary) return true;
    if (typeof can === 'function') return Boolean(can(permission));
    return Boolean(currentUser.permissions?.[permission]);
  };

  if (!isAdmin) return null;

  const canEditPage = canAccess(PERMISSIONS.EDIT_PAGE);
  const canManageProducts = canAccess(PERMISSIONS.MANAGE_PRODUCTS);
  const canManageOrders = canAccess(PERMISSIONS.MANAGE_ORDERS);
  const canUsePos = canAccess(PERMISSIONS.POS_SALES);
  const totalPending = pendingChangesCount + (storePendingChanges ? 1 : 0);
  const anyPending = hasPendingChanges || storePendingChanges;

  const handleSaveAll = async () => {
    // 1. Guardar personalizaciones de texto de Supabase
    if (hasPendingChanges) {
      await saveAllCustomizations();
    }
    // 2. Guardar estado general de tienda
    if (onSaveStore) {
      await onSaveStore();
    }
  };

  const handleDiscardAll = () => {
    discardPendingChanges();
  };

  return (
    <div className="fixed top-0 inset-x-0 z-[100] h-11 bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-700 flex items-center justify-between px-3 sm:px-6 shadow-xs animate-slideDown">
      {/* Lado Izquierdo: Marca del Editor + Switch de Modo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#0A6CFF] flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-extrabold text-xs tracking-tight text-slate-900 hidden sm:inline">
            Modo Editor <span className="text-[#0A6CFF]">Wix / Elementor</span>
          </span>
        </div>

        {/* Switch Activado / Desactivado con Estilo Corporativo Claro */}
        {canEditPage && (
          <button
            type="button"
            onClick={toggleEditorMode}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
              isEditorModeActive
                ? 'bg-blue-50 text-[#0A6CFF] border-blue-300 shadow-2xs ring-2 ring-blue-500/10'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70'
            }`}
            title="Activa o desactiva la edición directa al hacer clic sobre cualquier texto en la tienda"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isEditorModeActive
                  ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-slate-400'
              }`}
            />
            <span>{isEditorModeActive ? 'ACTIVADO' : 'DESACTIVADO'}</span>
          </button>
        )}

        <span className="text-[10px] font-mono-code text-slate-400 hidden md:inline">
          {currentUser?.email || adminEmail}
        </span>
        <span className="text-[9px] font-mono-code font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 hidden sm:inline">
          {currentUser?.isPrimary ? 'Principal' : getRoleLabel(currentUser?.role)}
        </span>
      </div>

      {/* Lado Derecho: Acciones (Añadir Bloque, Descartar, Guardar Cambios) */}
      <div className="flex items-center gap-2">
        {/* Desplegable Añadir Bloque */}
        {(canManageProducts || canManageOrders || canUsePos || currentUser?.isPrimary) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBlockMenu((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer border border-slate-200 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#0A6CFF]" />
              <span className="hidden sm:inline">Añadir Bloque</span>
            </button>

            {showBlockMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-1 text-xs z-50 animate-scaleUp text-slate-700"
                onMouseLeave={() => setShowBlockMenu(false)}
              >
                {canManageProducts && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBlockMenu(false);
                      if (onAddNewProduct) onAddNewProduct();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold">Nuevo Producto</div>
                      <div className="text-[10px] text-slate-500">Crear manual con foto WebP</div>
                    </div>
                  </button>
                )}

                {canManageProducts && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBlockMenu(false);
                      if (onOpenBulkImport) onOpenBulkImport();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
                  >
                    <UploadCloud className="w-4 h-4 text-[#0A6CFF]" />
                    <div>
                      <div className="font-bold">Importar Catálogo IA</div>
                      <div className="text-[10px] text-slate-500">PDFs e imágenes con Gemini</div>
                    </div>
                  </button>
                )}

                {(canManageOrders || canUsePos) && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBlockMenu(false);
                      if (onOpenOrdersDashboard) onOpenOrdersDashboard();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
                  >
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-bold">Pedidos & POS</div>
                      <div className="text-[10px] text-slate-500">Caja, facturación y stock</div>
                    </div>
                  </button>
                )}

                {currentUser?.isPrimary && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBlockMenu(false);
                      if (onOpenUsers) onOpenUsers();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
                  >
                    <Users className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold">Colaboradores</div>
                      <div className="text-[10px] text-slate-500">Usuarios, roles y permisos RBAC</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Descartar si hay pendientes */}
        {anyPending && (canEditPage || canManageProducts) && (
          <button
            type="button"
            onClick={handleDiscardAll}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
            title="Descartar cambios no guardados"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Descartar</span>
          </button>
        )}

        {/* Botón Guardar Cambios en Supabase */}
        {(canEditPage || canManageProducts) && (
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
              anyPending
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-300 animate-pulse'
                : 'bg-[#0A6CFF] hover:bg-blue-600 text-white'
            }`}
            title="Guardar todos los textos y cambios permanentemente en Supabase"
          >
            <Save className="w-3.5 h-3.5" />
            <span>
              {isSaving
                ? 'Guardando...'
                : anyPending
                ? `Guardar (${totalPending})`
                : 'Guardado'}
            </span>
          </button>
        )}

        {/* Logout Admin */}
        <button
          type="button"
          onClick={onLogout}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Cerrar sesión de administrador"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
