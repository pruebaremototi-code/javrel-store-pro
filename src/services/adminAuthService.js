import { supabase } from '../supabaseClient';
import {
  ALL_PERMISSIONS,
  EMPTY_PERMISSIONS,
  PERMISSIONS,
  ROLES,
  ROLE_DEFAULT_PERMISSIONS,
  getPrimaryAdminEmail,
  hasPermission,
  normalizePermissions,
  sanitizeRole,
} from '../config/rbac';

const SESSION_KEY = 'javrelstore_admin_session_v1';
const LEGACY_TOKEN_KEY = 'superwow_admin_token';
const LEGACY_USER_KEY = 'superwow_admin_user';
const LOCAL_USERS_KEY = 'javrelstore_local_store_users_v1';
const PRIMARY_ADMIN_ID = '00000000-0000-4000-8000-000000000001';
const PRIMARY_ADMIN_PASSWORD = 'Soporte2026*';
const PROFILE_COLUMNS =
  'id,email,role,permissions,is_primary,is_active,display_name,created_at,updated_at';

const ALL_TRUE_PERMISSIONS = ALL_PERMISSIONS.reduce(
  (acc, key) => ({ ...acc, [key]: true }),
  {}
);

const nowIso = () => new Date().toISOString();

const safeParse = (raw, fallback) => {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const bytesToBase64 = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'user-' + Date.now() + '-' + Math.random().toString(16).slice(2);
};

/**
 * Hash PBKDF2-SHA256 para el modo local de desarrollo.
 * En producción se usa Supabase Auth (password gestionado por GoTrue).
 */
const hashPassword = async (password) => {
  const iterations = 120000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `pbkdf2$${iterations}$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
};

const verifyPassword = async (password, storedHash) => {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const [algorithm, iterationsRaw, saltRaw, hashRaw] = storedHash.split('$');
  if (algorithm !== 'pbkdf2' || !iterationsRaw || !saltRaw || !hashRaw) return false;

  const iterations = Number(iterationsRaw);
  const salt = base64ToBytes(saltRaw);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToBase64(new Uint8Array(bits)) === hashRaw;
};

const readLocalUsers = () => {
  try {
    const parsed = safeParse(localStorage.getItem(LOCAL_USERS_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalUsers = (users) => {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn('[adminAuthService] No se pudo guardar el store local de usuarios:', err);
  }
};

const primaryProfile = () => ({
  id: PRIMARY_ADMIN_ID,
  email: getPrimaryAdminEmail(),
  role: ROLES.ADMIN,
  permissions: ALL_TRUE_PERMISSIONS,
  isPrimary: true,
  isActive: true,
  displayName: 'Administrador Principal',
  createdAt: '2026-01-01T00:00:00.000Z',
  source: 'local',
});

const toProfile = (row = {}) => {
  const isPrimary = Boolean(row.is_primary ?? row.isPrimary);
  const permissions = normalizePermissions(
    row.permissions && typeof row.permissions === 'object'
      ? row.permissions
      : row.permissions
        ? safeParse(row.permissions, {})
        : {},
    row.role
  );

  // El permiso de gestionar usuarios queda reservado SIEMPRE al primario.
  if (!isPrimary) {
    permissions[PERMISSIONS.MANAGE_USERS] = false;
  }

  return {
    id: row.id,
    email: row.email,
    role: sanitizeRole(row.role),
    permissions,
    isPrimary,
    isActive: row.is_active ?? row.isActive ?? true,
    displayName:
      row.display_name ||
      row.displayName ||
      String(row.email || '').split('@')[0] ||
      'Colaborador',
    createdAt: row.created_at || row.createdAt || nowIso(),
    updatedAt: row.updated_at || row.updatedAt || null,
    source: row.source || row._source || 'supabase',
  };
};

const buildSession = (profile, tokens = {}, source = 'supabase') => ({
  user: toProfile({ ...profile, source }),
  accessToken: tokens.access_token || null,
  refreshToken: tokens.refresh_token || null,
  source,
  createdAt: nowIso(),
});

const saveSession = (session) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(LEGACY_TOKEN_KEY, session.accessToken || `session_${Date.now()}`);
    sessionStorage.setItem(LEGACY_USER_KEY, session.user?.email || '');
  } catch (err) {
    console.warn('[adminAuthService] No se pudo guardar la sesión:', err);
  }
};

const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    // Ignorar
  }
};

const getStoredSession = () => {
  try {
    const parsed = safeParse(sessionStorage.getItem(SESSION_KEY), null);
    if (parsed?.user) return parsed;
  } catch {
    // Ignorar
  }
  return null;
};

const apiRequest = async (action, payload = {}, accessToken = null) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch('/api/admin-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json().catch(() => ({})) : {};

    if (!response.ok) {
      const isUnavailable = response.status === 404 || response.status === 405;
      const error = new Error(
        isUnavailable
          ? 'El endpoint /api/admin-users no está desplegado. Se usará el modo local.'
          : data.error || 'No fue posible completar la operación de usuarios.'
      );
      error.code = isUnavailable
        ? 'API_NOT_AVAILABLE'
        : data.code || `HTTP_${response.status}`;
      error.status = isUnavailable ? 503 : response.status;
      error.details = data.details || null;
      error.mode = data.mode || null;
      throw error;
    }

    if (!isJson) {
      const error = new Error(
        'El endpoint /api/admin-users no está disponible en este entorno. Se usará el modo local.'
      );
      error.code = 'API_NOT_AVAILABLE';
      error.status = 503;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Tiempo de espera agotado al contactar el servidor.');
      timeoutError.code = 'NETWORK_TIMEOUT';
      throw timeoutError;
    }
    if (!err.status) {
      err.code = err.code || 'NETWORK_ERROR';
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

const shouldUseLocalFallback = (error) =>
  !error ||
  error.code === 'SERVICE_ROLE_MISSING' ||
  error.code === 'API_NOT_AVAILABLE' ||
  error.code === 'INVALID_API_RESPONSE' ||
  error.code === 'NETWORK_ERROR' ||
  error.code === 'NETWORK_TIMEOUT' ||
  error.status === 503 ||
  error.status === 502;

const invalidApiResponse = () => {
  const error = new Error(
    'El servidor devolvió una respuesta inválida para la gestión de usuarios.'
  );
  error.code = 'INVALID_API_RESPONSE';
  error.status = 502;
  return error;
};

const supabaseDirectLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) {
    const loginError = new Error(
      error.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : error.message
    );
    loginError.code = 'INVALID_CREDENTIALS';
    throw loginError;
  }

  if (!data?.user?.id) {
    const missingUser = new Error('No se recibió el usuario autenticado.');
    missingUser.code = 'AUTH_USER_MISSING';
    throw missingUser;
  }

  const { data: profile, error: profileError } = await supabase
    .from('store_users')
    .select(PROFILE_COLUMNS)
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut().catch(() => {});
    const profileMissing = new Error(
      'Este usuario no tiene un perfil habilitado en store_users. Contacta al administrador principal.'
    );
    profileMissing.code = 'PROFILE_MISSING';
    throw profileMissing;
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut().catch(() => {});
    const inactive = new Error('Este usuario está desactivado. Contacta al administrador principal.');
    inactive.code = 'USER_INACTIVE';
    throw inactive;
  }

  return buildSession(profile, data.session, 'supabase');
};

const localLogin = async (email, password) => {
  const normalized = normalizeEmail(email);
  const primary = primaryProfile();

  if (normalized === primary.email.toLowerCase() && password === PRIMARY_ADMIN_PASSWORD) {
    return buildSession(primary, {}, 'local');
  }

  const localUser = readLocalUsers().find((user) => normalizeEmail(user.email) === normalized);
  if (!localUser) {
    const error = new Error('Correo o contraseña incorrectos.');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const valid = await verifyPassword(password, localUser.password_hash);
  if (!valid) {
    const error = new Error('Correo o contraseña incorrectos.');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  if (localUser.is_active === false) {
    const error = new Error('Este usuario está desactivado. Contacta al administrador principal.');
    error.code = 'USER_INACTIVE';
    throw error;
  }

  return buildSession(toProfile({ ...localUser, source: 'local' }), {}, 'local');
};

const localListUsers = () => {
  const localUsers = readLocalUsers().map((row) => toProfile({ ...row, source: 'local' }));
  const primary = primaryProfile();
  return [primary, ...localUsers].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return String(a.email).localeCompare(String(b.email));
  });
};

const assertPrimarySession = (session) => {
  if (!session?.user?.isPrimary || !hasPermission(session.user, PERMISSIONS.MANAGE_USERS)) {
    const error = new Error('Solo el administrador principal puede gestionar colaboradores.');
    error.code = 'FORBIDDEN';
    throw error;
  }
};

const validateCreatePayload = (payload) => {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');
  const role = sanitizeRole(payload.role);

  if (!isValidEmail(email)) {
    const error = new Error('Ingresa un correo electrónico válido.');
    error.code = 'INVALID_EMAIL';
    throw error;
  }
  if (password.length < 8) {
    const error = new Error('La contraseña temporal debe tener al menos 8 caracteres.');
    error.code = 'WEAK_PASSWORD';
    throw error;
  }
  const permissions = normalizePermissions(payload.permissions, role);
  // Un administrador colaborador puede gestionar módulos, nunca usuarios.
  permissions[PERMISSIONS.MANAGE_USERS] = false;

  return {
    email,
    password,
    role,
    permissions,
    displayName: String(payload.displayName || email.split('@')[0]).trim(),
    isActive: payload.isActive !== false,
  };
};

const localCreateUser = async (session, payload) => {
  assertPrimarySession(session);
  const clean = validateCreatePayload(payload);
  const existing = localListUsers().find((user) => normalizeEmail(user.email) === clean.email);
  if (existing) {
    const error = new Error('Ya existe un usuario con ese correo.');
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const row = {
    id: randomId(),
    email: clean.email,
    password_hash: await hashPassword(clean.password),
    role: clean.role,
    permissions: clean.permissions,
    is_primary: false,
    is_active: clean.isActive,
    display_name: clean.displayName,
    created_at: nowIso(),
    updated_at: nowIso(),
    source: 'local',
  };

  writeLocalUsers([row, ...readLocalUsers()]);
  return toProfile(row);
};

const localUpdateUser = async (session, userId, payload) => {
  assertPrimarySession(session);
  if (userId === PRIMARY_ADMIN_ID) {
    const error = new Error('El administrador principal no puede modificarse desde este panel.');
    error.code = 'PRIMARY_IMMUTABLE';
    throw error;
  }

  const rows = readLocalUsers();
  const index = rows.findIndex((row) => row.id === userId);
  if (index < 0) {
    const error = new Error('El usuario no existe o ya fue eliminado.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  const current = rows[index];
  const nextRole = sanitizeRole(payload.role || current.role);
  const nextEmail = payload.email ? normalizeEmail(payload.email) : current.email;
  if (!isValidEmail(nextEmail)) {
    const error = new Error('Ingresa un correo electrónico válido.');
    error.code = 'INVALID_EMAIL';
    throw error;
  }
  const duplicate = localListUsers().find(
    (user) => user.id !== userId && normalizeEmail(user.email) === nextEmail
  );
  if (duplicate) {
    const error = new Error('Ya existe otro usuario con ese correo.');
    error.code = 'EMAIL_EXISTS';
    throw error;
  }

  const nextPassword = String(payload.password || '');
  if (nextPassword && nextPassword.length < 8) {
    const error = new Error('La nueva contraseña debe tener al menos 8 caracteres.');
    error.code = 'WEAK_PASSWORD';
    throw error;
  }

  const nextPermissions = normalizePermissions(payload.permissions, nextRole);
  nextPermissions[PERMISSIONS.MANAGE_USERS] = false;

  rows[index] = {
    ...current,
    email: nextEmail,
    role: nextRole,
    permissions: nextPermissions,
    is_active:
      payload.isActive === undefined ? current.is_active !== false : Boolean(payload.isActive),
    display_name: String(payload.displayName || current.display_name || nextEmail.split('@')[0]).trim(),
    password_hash: nextPassword ? await hashPassword(nextPassword) : current.password_hash,
    updated_at: nowIso(),
  };

  writeLocalUsers(rows);
  return toProfile({ ...rows[index], source: 'local' });
};

const localDeleteUser = async (session, userId) => {
  assertPrimarySession(session);
  if (userId === PRIMARY_ADMIN_ID) {
    const error = new Error('El administrador principal no puede eliminarse a sí mismo.');
    error.code = 'PRIMARY_IMMUTABLE';
    throw error;
  }
  const rows = readLocalUsers();
  const next = rows.filter((row) => row.id !== userId);
  if (next.length === rows.length) {
    const error = new Error('El usuario no existe o ya fue eliminado.');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }
  writeLocalUsers(next);
  return { success: true, id: userId };
};

const refreshSupabaseProfile = async (session) => {
  if (session?.accessToken && session?.refreshToken) {
    await supabase.auth
      .setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
      .catch(() => {});
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user?.id) {
    clearSession();
    return null;
  }

  const { data: profile, error } = await supabase
    .from('store_users')
    .select(PROFILE_COLUMNS)
    .eq('id', authData.user.id)
    .maybeSingle();

  if (error || !profile || profile.is_active === false) {
    await supabase.auth.signOut().catch(() => {});
    clearSession();
    return null;
  }

  const nextSession = buildSession(
    profile,
    {
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    },
    'supabase'
  );
  saveSession(nextSession);
  return nextSession;
};

export const adminAuthService = {
  primaryEmail: getPrimaryAdminEmail(),
  primaryId: PRIMARY_ADMIN_ID,
  roles: ROLES,
  permissions: PERMISSIONS,
  hasPermission,

  getStoredSession() {
    return getStoredSession();
  },

  getCurrentUser() {
    return getStoredSession()?.user || null;
  },

  async restoreSession() {
    const stored = getStoredSession();

    if (stored?.source === 'supabase') {
      try {
        const refreshed = await refreshSupabaseProfile(stored);
        if (refreshed) return refreshed;
      } catch (err) {
        console.warn('[adminAuthService] No se pudo refrescar la sesión Supabase:', err);
      }
      // Nunca escalar a una sesión primaria local si la sesión Supabase falló.
      clearSession();
      return null;
    }

    if (stored) {
      if (stored.user?.isPrimary) return stored;
      const localUser = readLocalUsers().find((row) => row.id === stored.user.id);
      if (localUser && localUser.is_active !== false) {
        const refreshed = buildSession(
          toProfile({ ...localUser, source: 'local' }),
          {},
          'local'
        );
        saveSession(refreshed);
        return refreshed;
      }
      clearSession();
      return null;
    }

    // Compatibilidad con la sesión antigua basada solo en el token de OTP.
    try {
      if (sessionStorage.getItem(LEGACY_TOKEN_KEY)) {
        const legacy = buildSession(primaryProfile(), {}, 'local');
        saveSession(legacy);
        return legacy;
      }
    } catch {
      // Ignorar
    }

    return null;
  },

  async login(email, password) {
    const normalized = normalizeEmail(email);

    if (normalized === getPrimaryAdminEmail().toLowerCase()) {
      return this.loginPrimary(email, password);
    }

    try {
      return await supabaseDirectLogin(normalized, password);
    } catch (directError) {
      if (directError.code === 'USER_INACTIVE' || directError.code === 'PROFILE_MISSING') {
        return { success: false, error: directError.message, code: directError.code };
      }

      try {
        const data = await apiRequest('login', { email: normalized, password });
        if (!data?.user?.email || !data?.session?.access_token) {
          throw invalidApiResponse();
        }
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        return {
          success: true,
          session: buildSession(data.user, data.session, 'supabase'),
        };
      } catch (apiError) {
        // En modo local el endpoint devuelve 401 porque el usuario aún no
        // existe en Supabase Auth; se valida contra el store PBKDF2 local.
        // Un 5xx (tabla/migración pendiente) tampoco debe bloquear el acceso.
        const localModeAllowed = !apiError.mode || apiError.mode === 'local';
        if (
          shouldUseLocalFallback(apiError) ||
          (apiError.status === 401 && localModeAllowed) ||
          (apiError.status >= 500 && localModeAllowed)
        ) {
          try {
            const session = await localLogin(normalized, password);
            return { success: true, session, localFallback: true };
          } catch (localError) {
            return { success: false, error: localError.message, code: localError.code };
          }
        }
        return { success: false, error: apiError.message, code: apiError.code };
      }
    }
  },

  async loginPrimary(email, password) {
    const normalized = normalizeEmail(email);
    if (normalized !== getPrimaryAdminEmail().toLowerCase()) {
      return { success: false, error: 'Correo no autorizado como administrador principal.' };
    }

    try {
      const session = await supabaseDirectLogin(normalized, password);
      if (session.user?.isPrimary) {
        return { success: true, session };
      }
    } catch {
      // El usuario primario aún no existe en Supabase Auth: intentar bootstrap.
    }

    try {
      const data = await apiRequest('primary-login', { email: normalized, password });
      if (!data?.user?.isPrimary || !data?.session?.access_token) {
        throw invalidApiResponse();
      }
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      return { success: true, session: buildSession(data.user, data.session, 'supabase') };
    } catch (apiError) {
      const canFallback =
        shouldUseLocalFallback(apiError) || apiError.status >= 500;
      if (canFallback && password === PRIMARY_ADMIN_PASSWORD) {
        return {
          success: true,
          session: buildSession(primaryProfile(), {}, 'local'),
          localFallback: true,
        };
      }
      return { success: false, error: apiError.message, code: apiError.code };
    }
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignorar
    }
    clearSession();
  },

  async listUsers(session) {
    assertPrimarySession(session);

    if (session.source === 'supabase' && session.accessToken) {
      try {
        const data = await apiRequest('list', {}, session.accessToken);
        if (!Array.isArray(data.users)) throw invalidApiResponse();
        return { users: data.users.map(toProfile), source: 'supabase' };
      } catch (err) {
        if (!shouldUseLocalFallback(err)) throw err;
      }
    }

    return { users: localListUsers(), source: 'local' };
  },

  async createUser(session, payload) {
    assertPrimarySession(session);

    if (session.source === 'supabase' && session.accessToken) {
      try {
        const data = await apiRequest('create', payload, session.accessToken);
        if (!data?.user?.email) throw invalidApiResponse();
        return { user: toProfile(data.user), source: 'supabase' };
      } catch (err) {
        if (!shouldUseLocalFallback(err)) throw err;
      }
    }

    return { user: await localCreateUser(session, payload), source: 'local' };
  },

  async updateUser(session, userId, payload) {
    assertPrimarySession(session);

    if (session.source === 'supabase' && session.accessToken) {
      try {
        const data = await apiRequest('update', { userId, ...payload }, session.accessToken);
        if (!data?.user?.email) throw invalidApiResponse();
        return { user: toProfile(data.user), source: 'supabase' };
      } catch (err) {
        if (!shouldUseLocalFallback(err)) throw err;
      }
    }

    return { user: await localUpdateUser(session, userId, payload), source: 'local' };
  },

  async deleteUser(session, userId) {
    assertPrimarySession(session);

    if (session.source === 'supabase' && session.accessToken) {
      try {
        const data = await apiRequest('delete', { userId }, session.accessToken);
        if (!data?.success) throw invalidApiResponse();
        return { ...data, source: 'supabase' };
      } catch (err) {
        if (!shouldUseLocalFallback(err)) throw err;
      }
    }

    return { ...(await localDeleteUser(session, userId)), source: 'local' };
  },

  saveSession,
  clearSession,
  buildSession,
  toProfile,
  normalizePermissions,
  ROLE_DEFAULT_PERMISSIONS,
  EMPTY_PERMISSIONS,
  ALL_PERMISSIONS,
};
