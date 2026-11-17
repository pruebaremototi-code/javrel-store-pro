-- ========================================================
-- JavrelStore — RBAC de colaboradores (store_users)
-- Ejecutar en el SQL Editor de Supabase después de 04 y 05.
--
-- Requisitos:
--   - Supabase Auth habilitado (email/password).
--   - El administrador principal se crea desde /api/admin-users
--     (acción primary-login) usando SUPABASE_SERVICE_ROLE_KEY.
--
-- La tabla se vincula a auth.users(id) y guarda permisos granulares.
-- ========================================================

CREATE TABLE IF NOT EXISTS public.store_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'editor'
    CHECK (role IN ('admin', 'editor', 'pos_operator')),
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Compatibilidad si la tabla ya existía con una versión anterior.
ALTER TABLE public.store_users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Un solo correo por usuario (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS store_users_email_unique
  ON public.store_users (lower(email));

-- Un solo administrador principal activo.
CREATE UNIQUE INDEX IF NOT EXISTS store_users_single_primary
  ON public.store_users ((is_primary))
  WHERE is_primary = true;

-- Trigger de updated_at.
CREATE OR REPLACE FUNCTION public.set_store_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_users_updated_at ON public.store_users;
CREATE TRIGGER store_users_updated_at
  BEFORE UPDATE ON public.store_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_store_users_updated_at();

-- Función SECURITY DEFINER: evita recursión de RLS al comprobar el primario.
CREATE OR REPLACE FUNCTION public.is_primary_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.store_users
    WHERE id = auth.uid()
      AND is_primary = true
      AND is_active = true
  );
$$;

ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;

-- Lectura: cada colaborador ve su propio perfil; el primario ve todos.
DROP POLICY IF EXISTS "store_users_select_self_or_primary" ON public.store_users;
CREATE POLICY "store_users_select_self_or_primary"
  ON public.store_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.is_primary_admin());

-- Alta: solo el administrador principal.
DROP POLICY IF EXISTS "store_users_insert_primary_only" ON public.store_users;
CREATE POLICY "store_users_insert_primary_only"
  ON public.store_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_primary_admin());

-- Edición: solo el administrador principal.
DROP POLICY IF EXISTS "store_users_update_primary_only" ON public.store_users;
CREATE POLICY "store_users_update_primary_only"
  ON public.store_users
  FOR UPDATE
  TO authenticated
  USING (public.is_primary_admin())
  WITH CHECK (public.is_primary_admin());

-- Borrado duro: solo el administrador principal.
DROP POLICY IF EXISTS "store_users_delete_primary_only" ON public.store_users;
CREATE POLICY "store_users_delete_primary_only"
  ON public.store_users
  FOR DELETE
  TO authenticated
  USING (public.is_primary_admin());

-- Verificación posterior:
-- SELECT email, role, is_primary, is_active, permissions
-- FROM public.store_users ORDER BY is_primary DESC, email;
