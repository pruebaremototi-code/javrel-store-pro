import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Crown,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { adminAuthService } from '../services/adminAuthService';
import { emailService } from '../services/emailService';
import {
  PERMISSION_CATALOG,
  PERMISSIONS,
  ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS,
  getRoleLabel,
  hasPermission,
  normalizePermissions,
} from '../config/rbac';

const emptyForm = () => ({
  email: '',
  displayName: '',
  password: '',
  securityToken: '',
  role: ROLES.EDITOR,
  permissions: { ...ROLE_DEFAULT_PERMISSIONS[ROLES.EDITOR] },
  isActive: true,
});

const permissionsForRole = (role) => {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS[ROLES.EDITOR];
  const permissions = normalizePermissions(defaults, role);
  permissions[PERMISSIONS.MANAGE_USERS] = false;
  return permissions;
};

const roleBadgeClass = (role) => {
  if (role === ROLES.ADMIN) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (role === ROLES.EDITOR) return 'bg-blue-50 text-[#0A6CFF] border-blue-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '—';
  }
};

const initialsFor = (user) => {
  const source = user.displayName || user.email || 'U';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const PermissionCheckboxes = ({ permissions, onToggle, disabled = false }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
    {PERMISSION_CATALOG.map((permission) => {
      const checked = Boolean(permissions?.[permission.key]);
      return (
        <label
          key={permission.key}
          className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors cursor-pointer ${
            checked
              ? 'bg-blue-50/70 border-[#0A6CFF]/40'
              : 'bg-white border-slate-200 hover:border-slate-300'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={() => onToggle(permission.key)}
            className="mt-0.5 w-4 h-4 rounded accent-[#0A6CFF]"
          />
          <span className="min-w-0">
            <span className="block text-xs font-bold text-slate-800">{permission.label}</span>
            <span className="block text-[10px] text-slate-500 leading-snug mt-0.5">
              {permission.description}
            </span>
          </span>
        </label>
      );
    })}
  </div>
);

export const AdminUsersPanel = ({ session, currentUser, onNotify }) => {
  const [users, setUsers] = useState([]);
  const [source, setSource] = useState('local');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tokenSending, setTokenSending] = useState(false);
  const [tokenSent, setTokenSent] = useState(false);

  const canManage = Boolean(currentUser?.isPrimary && hasPermission(currentUser, PERMISSIONS.MANAGE_USERS));

  const handleSendSecurityToken = async () => {
    setError('');
    setTokenSending(true);
    try {
      const adminEmail = currentUser?.email || 'jhonkavasquez@gmail.com';
      const res = await emailService.sendOtp(adminEmail);
      if (res.success) {
        setTokenSent(true);
        onNotify?.(`📧 Token OTP de 6 dígitos enviado a ${adminEmail}`);
      } else {
        setError(res.error || 'No se pudo generar el token de seguridad.');
      }
    } catch {
      setError('Error al generar el token de seguridad.');
    } finally {
      setTokenSending(false);
    }
  };

  const loadUsers = async (silent = false) => {
    if (!session) return;
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const result = await adminAuthService.listUsers(session);
      setUsers(result.users || []);
      setSource(result.source || 'local');
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los colaboradores.');
      setUsers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, session?.source]);

  const stats = useMemo(() => {
    const active = users.filter((user) => user.isActive).length;
    const editors = users.filter((user) => user.role === ROLES.EDITOR).length;
    const pos = users.filter((user) => user.role === ROLES.POS_OPERATOR).length;
    return { total: users.length, active, editors, pos };
  }, [users]);

  const openCreate = () => {
    setForm(emptyForm());
    setShowPassword(false);
    setError('');
    setIsCreateOpen(true);
  };

  const openEdit = (user) => {
    setForm({
      email: user.email || '',
      displayName: user.displayName || '',
      password: '',
      role: user.role || ROLES.EDITOR,
      permissions: { ...permissionsForRole(user.role), ...(user.permissions || {}) },
      isActive: user.isActive !== false,
    });
    setShowPassword(false);
    setError('');
    setEditingUser(user);
  };

  const closeModals = () => {
    if (isSaving) return;
    setIsCreateOpen(false);
    setEditingUser(null);
    setDeleteTarget(null);
  };

  const handleRoleChange = (role) => {
    setForm((prev) => ({
      ...prev,
      role,
      permissions: permissionsForRole(role),
    }));
  };

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const buildPayload = () => ({
    email: form.email.trim(),
    displayName: form.displayName.trim(),
    password: form.password,
    role: form.role,
    permissions: normalizePermissions(form.permissions, form.role),
    isActive: form.isActive,
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canManage) return;

    if (!form.securityToken || form.securityToken.trim().length !== 6) {
      setError('Se requiere el Token de Seguridad OTP de 6 dígitos del Administrador Principal para autorizar este registro.');
      return;
    }

    const verification = emailService.verifyOtp(form.securityToken.trim());
    if (!verification.success) {
      setError(verification.error || 'Token de seguridad inválido o expirado. Solicita un nuevo código.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      const result = await adminAuthService.createUser(session, buildPayload());
      setIsCreateOpen(false);
      setForm(emptyForm());
      setTokenSent(false);
      await loadUsers(true);
      setSource(result.source || source);
      onNotify?.(`✅ Colaborador ${result.user.email} autorizado y creado con éxito.`);
    } catch (err) {
      setError(err.message || 'No se pudo crear el colaborador.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!canManage || !editingUser) return;

    setError('');
    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (!payload.password) delete payload.password;
      const result = await adminAuthService.updateUser(session, editingUser.id, payload);
      setEditingUser(null);
      await loadUsers(true);
      setSource(result.source || source);
      onNotify?.(`✅ Colaborador ${result.user.email} actualizado correctamente.`);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el colaborador.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canManage || !deleteTarget) return;

    setError('');
    setIsSaving(true);
    try {
      await adminAuthService.deleteUser(session, deleteTarget.id);
      const deletedEmail = deleteTarget.email;
      setDeleteTarget(null);
      await loadUsers(true);
      onNotify?.(`🗑️ Acceso revocado definitivamente para ${deletedEmail}.`);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el colaborador.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center">
        <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="font-display font-bold text-slate-900">Acceso restringido</h3>
        <p className="text-xs text-slate-500 mt-1">
          Solo el administrador principal puede gestionar colaboradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full max-w-full overflow-x-hidden" data-admin-users-panel="true">
      {/* Encabezado del módulo */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#38BDF8]" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-base sm:text-lg flex items-center gap-2">
              Control de Colaboradores
              <span className="text-[9px] font-mono-code uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                RBAC
              </span>
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Crea accesos con permisos granulares. Los cambios de credenciales y las bajas se aplican al instante.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => loadUsers(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/15 transition-colors disabled:opacity-50"
            title="Recargar colaboradores"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0A6CFF] hover:bg-blue-600 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Crear Nuevo Usuario
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Colaboradores', value: stats.total, icon: Users, color: 'text-[#0A6CFF] bg-blue-50' },
          { label: 'Activos', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Editores', value: stats.editors, icon: Edit3, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Operadores POS', value: stats.pos, icon: ShieldCheck, color: 'text-amber-700 bg-amber-50' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-display font-black text-lg text-slate-900 leading-none">{kpi.value}</div>
                <div className="text-[10px] font-mono-code uppercase font-bold text-slate-400 mt-1">{kpi.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error si ocurre */}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-semibold">Cargando colaboradores…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5" data-users-list="true">
          {users.map((user) => {
            const active = user.isActive !== false;
            const permissionChips = PERMISSION_CATALOG.filter(
              (permission) => user.permissions?.[permission.key]
            );

            return (
              <div
                key={user.id}
                className={`relative p-4 rounded-2xl bg-white border shadow-xs transition-shadow hover:shadow-md ${
                  user.isPrimary ? 'border-emerald-300 ring-1 ring-emerald-200/60' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-display font-black text-xs flex-shrink-0 ${
                      user.isPrimary
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {initialsFor(user)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {user.displayName || user.email}
                      </span>
                      {user.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Crown className="w-3 h-3" /> Principal
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${roleBadgeClass(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        title={active ? 'Activo' : 'Desactivado'}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-2">
                      {permissionChips.length === 0 ? (
                        <span className="text-[10px] text-slate-400">Sin permisos asignados</span>
                      ) : (
                        permissionChips.map((permission) => (
                          <span
                            key={permission.key}
                            className="px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[9px] font-semibold text-slate-600"
                          >
                            {permission.label}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="text-[9px] font-mono-code text-slate-400 mt-2">
                      Alta: {formatDate(user.createdAt)} · {user.source === 'local' ? 'Local' : 'Supabase Auth'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    disabled={user.isPrimary}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={user.isPrimary ? 'El administrador principal no se edita aquí' : 'Editar permisos y credenciales'}
                  >
                    <Edit3 className="w-3 h-3" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(user)}
                    disabled={user.isPrimary}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={user.isPrimary ? 'El administrador principal no puede eliminarse' : 'Eliminar acceso definitivamente'}
                  >
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear / Editar */}
      {(isCreateOpen || editingUser) && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-slate-50/95 backdrop-blur border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0A6CFF]/10 text-[#0A6CFF] flex items-center justify-center border border-[#0A6CFF]/20">
                  {editingUser ? <UserCog className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    {editingUser ? 'Editar Colaborador' : 'Crear Nuevo Usuario'}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {editingUser ? editingUser.email : 'Credenciales temporales y permisos granulares'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModals}
                disabled={isSaving}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingUser ? handleEdit : handleCreate} className="p-4 sm:p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Correo de acceso *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="colaborador@javrelstore.com"
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/15 outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Nombre visible</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Ej. Laura Gómez"
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/15 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    {editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña temporal *'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required={!editingUser}
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      className="w-full pl-9 pr-9 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0A6CFF] focus:ring-2 focus:ring-[#0A6CFF]/15 outline-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                      title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Rol operativo *</label>
                  <select
                    data-role-select="true"
                    value={form.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#0A6CFF] outline-none font-semibold text-slate-800"
                  >
                    <option value={ROLES.ADMIN}>{ROLE_LABELS[ROLES.ADMIN]} colaborador</option>
                    <option value={ROLES.EDITOR}>{ROLE_LABELS[ROLES.EDITOR]}</option>
                    <option value={ROLES.POS_OPERATOR}>{ROLE_LABELS[ROLES.POS_OPERATOR]}</option>
                  </select>
                </div>
              </div>

              {!editingUser && (
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-amber-600" />
                      <span className="text-[11px] font-bold text-amber-950">Token de Seguridad Obligatorio (OTP) *</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSendSecurityToken}
                      disabled={tokenSending}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {tokenSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      {tokenSent ? 'Reenviar Código' : 'Solicitar Token al Correo'}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-relaxed">
                    Para crear un nuevo usuario colaborador con acceso a la tienda, ingresa el código de 6 dígitos enviado al correo del Administrador Principal ({currentUser?.email || 'jhonkavasquez@gmail.com'}).
                  </p>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={form.securityToken}
                      onChange={(e) => setForm((prev) => ({ ...prev, securityToken: e.target.value.replace(/\D/g, '') }))}
                      placeholder="Ingresa el token de 6 dígitos (ej. 482910)"
                      className="w-full px-3 py-2 text-xs font-mono font-bold tracking-widest text-center bg-white border border-amber-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 outline-none placeholder:font-sans placeholder:tracking-normal placeholder:font-normal placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-3.5 h-3.5 text-[#0A6CFF]" />
                  <span className="text-[11px] font-bold text-slate-800">Permisos granulares</span>
                  <span className="text-[9px] text-slate-400">El permiso de usuarios queda reservado al principal</span>
                </div>
                <PermissionCheckboxes permissions={form.permissions} onToggle={togglePermission} />
              </div>

              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer">
                <span>
                  <span className="block text-[11px] font-bold text-slate-800">Acceso activo</span>
                  <span className="block text-[10px] text-slate-500">
                    Desactiva para bloquear el inicio de sesión sin borrar el historial.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModals}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0A6CFF] hover:bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Guardando…
                    </>
                  ) : (
                    <>
                      {editingUser ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingUser ? 'Guardar cambios' : 'Crear usuario'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmación de borrado duro */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-display font-bold text-base text-slate-900 text-center">
              Revocar acceso definitivamente
            </h3>
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              Se eliminará el perfil de <strong className="text-slate-800">{deleteTarget.email}</strong> y su cuenta de Supabase Auth. Esta acción es irreversible y aplica de inmediato.
            </p>
            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2 mt-5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/25 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
