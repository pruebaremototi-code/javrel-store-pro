// Vercel Serverless Function: Gestión de Usuarios Administradores (RBAC)
// Usa Supabase Auth + tabla public.store_users.
//
// Variables de entorno recomendadas en Vercel:
//   SUPABASE_SERVICE_ROLE_KEY  (obligatoria para crear/editar credenciales)
//   PRIMARY_ADMIN_EMAIL        (opcional, por defecto jhonkavasquez@gmail.com)
//   PRIMARY_ADMIN_PASSWORD     (opcional, por defecto la clave maestra actual)
//
// Sin SUPABASE_SERVICE_ROLE_KEY el frontend entra en modo local seguro
// (PBKDF2 en navegador) y muestra el aviso correspondiente.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'https://mnwockpzhhbcavqehrdy.supabase.co';
const ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_R3yoD44f33EvVPUu0A7jbg_mc_DJKTF';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

const PRIMARY_EMAIL = (process.env.PRIMARY_ADMIN_EMAIL || 'jhonkavasquez@gmail.com')
  .trim()
  .toLowerCase();
const PRIMARY_PASSWORD = process.env.PRIMARY_ADMIN_PASSWORD || 'Soporte2026*';

const ROLES = ['admin', 'editor', 'pos_operator'];
const PERMISSION_KEYS = [
  'edit_page',
  'manage_products',
  'pos_sales',
  'manage_orders',
  'manage_users',
];
const PROFILE_COLUMNS =
  'id,email,role,permissions,is_primary,is_active,display_name,created_at,updated_at';
const EMPTY_PERMISSIONS = PERMISSION_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: false }),
  {}
);
const ALL_PERMISSIONS = PERMISSION_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: true }),
  {}
);

const getAdminClient = () =>
  createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const getAnonClient = () =>
  createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

const getUserClient = (accessToken) =>
  createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

const sendJson = (res, status, payload) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const normalizePermissions = (permissions = {}, role = 'editor') => {
  const defaults =
    role === 'admin'
      ? { edit_page: true, manage_products: true, pos_sales: true, manage_orders: true, manage_users: true }
      : role === 'editor'
        ? { edit_page: true, manage_products: true, pos_sales: false, manage_orders: false, manage_users: false }
        : { edit_page: false, manage_products: false, pos_sales: true, manage_orders: true, manage_users: false };

  return PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = Boolean(
      permissions && typeof permissions === 'object' && key in permissions
        ? permissions[key]
        : defaults[key]
    );
    return acc;
  }, { ...EMPTY_PERMISSIONS });
};

const sanitizeUser = (row) => {
  const isPrimary = Boolean(row.is_primary);
  const permissions = normalizePermissions(row.permissions, row.role);
  if (!isPrimary) permissions.manage_users = false;

  return {
    id: row.id,
    email: row.email,
    role: row.role,
    permissions,
    isPrimary,
    isActive: row.is_active !== false,
    displayName:
      row.display_name || String(row.email || '').split('@')[0] || 'Colaborador',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    source: 'supabase',
  };
};

const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
};

const authenticateUser = async (req) => {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error('Sesión no proporcionada.');
    error.status = 401;
    throw error;
  }

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    const authError = new Error('Sesión inválida o expirada.');
    authError.status = 401;
    throw authError;
  }

  const userClient = getUserClient(token);
  const { data: profile, error: profileError } = await userClient
    .from('store_users')
    .select(PROFILE_COLUMNS)
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    const dbError = new Error(
      'No se pudo leer store_users. Verifica la migración SQL y las políticas RLS.'
    );
    dbError.status = 500;
    dbError.details = profileError.message;
    throw dbError;
  }

  if (!profile || profile.is_active === false) {
    const inactive = new Error('El usuario no existe o está desactivado.');
    inactive.status = 403;
    throw inactive;
  }

  return { authUser: data.user, profile, userClient, token };
};

const requirePrimary = async (req) => {
  const context = await authenticateUser(req);
  if (!context.profile.is_primary) {
    const error = new Error('Solo el administrador principal puede gestionar colaboradores.');
    error.status = 403;
    throw error;
  }
  return context;
};

const ensureServiceKey = () => {
  if (!SERVICE_KEY) {
    const error = new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en Vercel. El panel funcionará en modo local hasta configurarla.'
    );
    error.status = 503;
    error.code = 'SERVICE_ROLE_MISSING';
    throw error;
  }
};

const ensureStoreUsersTable = async () => {
  const { error } = await getAdminClient().from('store_users').select('id').limit(1);
  if (error) {
    const tableError = new Error(
      'La tabla store_users no está disponible. Ejecuta database/06_store_users_rbac.sql en Supabase.'
    );
    tableError.status = 500;
    tableError.details = error.message;
    throw tableError;
  }
};

const validateCreatePayload = (payload) => {
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');
  const role = ROLES.includes(payload.role) ? payload.role : 'editor';

  if (!isValidEmail(email)) {
    const error = new Error('Ingresa un correo electrónico válido.');
    error.status = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error('La contraseña temporal debe tener al menos 8 caracteres.');
    error.status = 400;
    throw error;
  }

  const permissions = normalizePermissions(payload.permissions, role);
  permissions.manage_users = false;

  return {
    email,
    password,
    role,
    permissions,
    displayName: String(payload.displayName || email.split('@')[0]).trim(),
    isActive: payload.isActive !== false,
  };
};

const validateUpdatePayload = (payload) => {
  const role = ROLES.includes(payload.role) ? payload.role : 'editor';
  const permissions = normalizePermissions(payload.permissions, role);
  permissions.manage_users = false;

  const password = payload.password ? String(payload.password) : '';
  if (payload.password && password.length < 8) {
    const error = new Error('La nueva contraseña debe tener al menos 8 caracteres.');
    error.status = 400;
    throw error;
  }

  const email = payload.email ? normalizeEmail(payload.email) : '';
  if (payload.email && !isValidEmail(email)) {
    const error = new Error('Ingresa un correo electrónico válido.');
    error.status = 400;
    throw error;
  }

  return {
    email,
    password,
    role,
    permissions,
    displayName: payload.displayName
      ? String(payload.displayName).trim()
      : undefined,
    isActive:
      payload.isActive === undefined ? undefined : Boolean(payload.isActive),
  };
};

const findAuthUserByEmail = async (email) => {
  const admin = getAdminClient();
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      const listError = new Error('No se pudo consultar Supabase Auth.');
      listError.status = 500;
      listError.details = error.message;
      throw listError;
    }
    const found = (data?.users || []).find(
      (user) => normalizeEmail(user.email) === normalizeEmail(email)
    );
    if (found) return found;
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }

  return null;
};

const signInAndBuildSession = async (email, password) => {
  const anon = getAnonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    const loginError = new Error(
      error?.message === 'Invalid login credentials'
        ? 'Correo o contraseña incorrectos.'
        : error?.message || 'No se pudo iniciar sesión.'
    );
    loginError.status = 401;
    throw loginError;
  }

  const userClient = getUserClient(data.session.access_token);
  const { data: profile, error: profileError } = await userClient
    .from('store_users')
    .select(PROFILE_COLUMNS)
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    const profileMissing = new Error(
      'El usuario no tiene un perfil habilitado en store_users.'
    );
    profileMissing.status = 403;
    throw profileMissing;
  }
  if (profile.is_active === false) {
    const inactive = new Error('El usuario está desactivado.');
    inactive.status = 403;
    throw inactive;
  }

  return {
    user: sanitizeUser(profile),
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
    },
  };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With, Accept, Origin'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método no soportado.' });
    return;
  }

  const body = req.body || {};
  const action = String(body.action || '').trim();

  try {
    if (action === 'login') {
      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      if (!isValidEmail(email) || !password) {
        sendJson(res, 400, { error: 'Correo y contraseña son obligatorios.' });
        return;
      }
      const result = await signInAndBuildSession(email, password);
      sendJson(res, 200, { success: true, ...result });
      return;
    }

    if (action === 'primary-login') {
      ensureServiceKey();
      await ensureStoreUsersTable();

      const email = normalizeEmail(body.email);
      const password = String(body.password || '');
      if (email !== PRIMARY_EMAIL || password !== PRIMARY_PASSWORD) {
        sendJson(res, 401, { error: 'Credenciales de administrador principal inválidas.' });
        return;
      }

      const admin = getAdminClient();
      let authUser = await findAuthUserByEmail(email);

      if (authUser) {
        // La contraseña maestra del primario es la fuente de verdad configurada
        // en Vercel; se sincroniza para evitar bloqueos por rotaciones previas.
        const { error: syncPasswordError } = await admin.auth.admin.updateUserById(
          authUser.id,
          {
            password,
            email_confirm: true,
            user_metadata: {
              role: 'admin',
              is_primary: true,
              display_name: 'Administrador Principal',
            },
          }
        );
        if (syncPasswordError) {
          console.warn(
            'No se pudo sincronizar la contraseña primaria:',
            syncPasswordError.message
          );
        }
      }

      if (!authUser) {
        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            role: 'admin',
            is_primary: true,
            display_name: 'Administrador Principal',
          },
        });
        if (createError || !created?.user) {
          sendJson(res, 500, {
            error: 'No se pudo crear la cuenta primaria en Supabase Auth.',
            details: createError?.message,
          });
          return;
        }
        authUser = created.user;
      }

      const { error: upsertError } = await admin.from('store_users').upsert(
        {
          id: authUser.id,
          email,
          role: 'admin',
          permissions: ALL_PERMISSIONS,
          is_primary: true,
          is_active: true,
          display_name: 'Administrador Principal',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (upsertError) {
        sendJson(res, 500, {
          error: 'No se pudo registrar el perfil primario en store_users.',
          details: upsertError.message,
        });
        return;
      }

      const result = await signInAndBuildSession(email, password);
      sendJson(res, 200, { success: true, ...result });
      return;
    }

    if (action === 'list') {
      const { userClient } = await requirePrimary(req);
      const { data, error } = await userClient
        .from('store_users')
        .select(PROFILE_COLUMNS)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        sendJson(res, 500, {
          error: 'No se pudo listar los usuarios.',
          details: error.message,
        });
        return;
      }

      sendJson(res, 200, {
        success: true,
        users: (data || []).map(sanitizeUser),
        serviceRoleConfigured: Boolean(SERVICE_KEY),
      });
      return;
    }

    if (action === 'create') {
      await requirePrimary(req);
      ensureServiceKey();
      await ensureStoreUsersTable();

      const clean = validateCreatePayload(body);
      const admin = getAdminClient();

      const { data: existing, error: existingError } = await admin
        .from('store_users')
        .select('id,email')
        .eq('email', clean.email)
        .maybeSingle();

      if (existingError) {
        sendJson(res, 500, {
          error: 'No se pudo validar el correo en store_users.',
          details: existingError.message,
        });
        return;
      }
      if (existing) {
        sendJson(res, 409, { error: 'Ya existe un usuario con ese correo.' });
        return;
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: clean.email,
        password: clean.password,
        email_confirm: true,
        user_metadata: {
          role: clean.role,
          display_name: clean.displayName,
        },
      });

      if (createError || !created?.user) {
        sendJson(res, 400, {
          error: 'No se pudo crear la cuenta de acceso en Supabase Auth.',
          details: createError?.message,
        });
        return;
      }

      const { data: profile, error: profileError } = await admin
        .from('store_users')
        .insert({
          id: created.user.id,
          email: clean.email,
          role: clean.role,
          permissions: clean.permissions,
          is_primary: false,
          is_active: clean.isActive,
          display_name: clean.displayName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(PROFILE_COLUMNS)
        .single();

      if (profileError || !profile) {
        // Rollback: si falla el perfil, no dejar una cuenta de Auth huérfana.
        await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
        sendJson(res, 500, {
          error: 'La cuenta de Auth se creó, pero no se pudo guardar el perfil. Se revirtió el alta.',
          details: profileError?.message,
        });
        return;
      }

      sendJson(res, 200, { success: true, user: sanitizeUser(profile) });
      return;
    }

    if (action === 'update') {
      const context = await requirePrimary(req);
      const userId = String(body.userId || '').trim();
      if (!userId) {
        sendJson(res, 400, { error: 'Falta el identificador del usuario.' });
        return;
      }

      const admin = SERVICE_KEY ? getAdminClient() : context.userClient;
      const { data: target, error: targetError } = await admin
        .from('store_users')
        .select(PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (targetError || !target) {
        sendJson(res, 404, { error: 'El usuario no existe o ya fue eliminado.' });
        return;
      }
      if (target.is_primary) {
        sendJson(res, 403, {
          error: 'El administrador principal no se modifica desde este panel.',
        });
        return;
      }

      const clean = validateUpdatePayload({ ...body, role: body.role || target.role });

      if (clean.password) {
        ensureServiceKey();
        const { error: authUpdateError } = await getAdminClient().auth.admin.updateUserById(
          userId,
          {
            ...(clean.email ? { email: clean.email, email_confirm: true } : {}),
            password: clean.password,
          }
        );
        if (authUpdateError) {
          sendJson(res, 400, {
            error: 'No se pudo actualizar la contraseña en Supabase Auth.',
            details: authUpdateError.message,
          });
          return;
        }
      } else if (clean.email) {
        if (clean.email !== target.email) {
          ensureServiceKey();
          const { error: emailUpdateError } = await getAdminClient().auth.admin.updateUserById(
            userId,
            { email: clean.email, email_confirm: true }
          );
          if (emailUpdateError) {
            sendJson(res, 400, {
              error: 'No se pudo actualizar el correo en Supabase Auth.',
              details: emailUpdateError.message,
            });
            return;
          }
        }
      }

      const updates = {
        role: clean.role,
        permissions: clean.permissions,
        updated_at: new Date().toISOString(),
      };
      if (clean.email) updates.email = clean.email;
      if (clean.displayName) updates.display_name = clean.displayName;
      if (clean.isActive !== undefined) updates.is_active = clean.isActive;

      const { data: updated, error: updateError } = await (SERVICE_KEY
        ? getAdminClient()
        : context.userClient
      )
        .from('store_users')
        .update(updates)
        .eq('id', userId)
        .select(PROFILE_COLUMNS)
        .single();

      if (updateError || !updated) {
        sendJson(res, 500, {
          error: 'No se pudo actualizar el perfil del usuario.',
          details: updateError?.message,
        });
        return;
      }

      sendJson(res, 200, { success: true, user: sanitizeUser(updated) });
      return;
    }

    if (action === 'delete') {
      const context = await requirePrimary(req);
      const userId = String(body.userId || '').trim();
      if (!userId) {
        sendJson(res, 400, { error: 'Falta el identificador del usuario.' });
        return;
      }

      const admin = SERVICE_KEY ? getAdminClient() : context.userClient;
      const { data: target, error: targetError } = await admin
        .from('store_users')
        .select('id,email,is_primary')
        .eq('id', userId)
        .maybeSingle();

      if (targetError || !target) {
        sendJson(res, 404, { error: 'El usuario no existe o ya fue eliminado.' });
        return;
      }
      if (target.is_primary) {
        sendJson(res, 403, {
          error: 'El administrador principal no puede eliminarse a sí mismo.',
        });
        return;
      }

      // 1. Borrado duro del perfil (revoca el acceso inmediatamente).
      const { error: deleteError } = await (SERVICE_KEY
        ? getAdminClient()
        : context.userClient
      )
        .from('store_users')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        sendJson(res, 500, {
          error: 'No se pudo eliminar el perfil del usuario.',
          details: deleteError.message,
        });
        return;
      }

      // 2. Borrado duro de la cuenta de Supabase Auth (si hay service role).
      if (SERVICE_KEY) {
        const { error: authDeleteError } = await getAdminClient().auth.admin.deleteUser(
          userId
        );
        if (authDeleteError) {
          console.warn('Perfil eliminado, pero Auth delete falló:', authDeleteError.message);
        }
      }

      sendJson(res, 200, { success: true, id: userId });
      return;
    }

    sendJson(res, 400, { error: 'Acción no reconocida.' });
  } catch (error) {
    console.error('[admin-users]', action, error);
    sendJson(res, error.status || 500, {
      error: error.message || 'Error interno en la gestión de usuarios.',
      code: error.code || 'ADMIN_USERS_ERROR',
      details: error.details || null,
      mode: SERVICE_KEY ? 'supabase' : 'local',
    });
  }
}
