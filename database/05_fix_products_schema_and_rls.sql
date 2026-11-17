-- ========================================================
-- JavrelStore — Alineación del esquema de productos y RLS
-- Ejecutar en el SQL Editor de Supabase (una sola vez, después de 04).
--
-- Motivo:
--   La tabla `products` de producción quedó creada con `id UUID` y
--   `category_id UUID`, mientras la app usa IDs/categorías de texto
--   (`pc-001`, `computadores`). Además, la política RLS de escritura no
--   existe, por lo que el botón "Guardar en Supabase" recibe 42501.
--
-- Este script:
--   1. Elimina la FK de category_id y convierte id/category_id a TEXT.
--   2. Habilita RLS con lectura y escritura para el catálogo.
--   3. Deja la tabla lista para el payload de la app.
-- ========================================================

-- 1. Quitar la FK que impide cambiar category_id a TEXT.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_category_id_fkey;

-- 2. Convertir la PK y la categoría a TEXT.
ALTER TABLE public.products ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.products
  ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.products
  ALTER COLUMN category_id TYPE TEXT USING category_id::text;

-- 3. RLS: lectura pública y escritura desde el CMS (admin autenticado en cliente).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.products;
CREATE POLICY "Permitir lectura publica de productos"
  ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura de productos desde CMS" ON public.products;
CREATE POLICY "Permitir escritura de productos desde CMS"
  ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 4. Categorías: misma corrección para que el catálogo pueda referenciarlas.
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de categorias" ON public.categories;
CREATE POLICY "Permitir lectura publica de categorias"
  ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir escritura de categorias desde CMS" ON public.categories;
CREATE POLICY "Permitir escritura de categorias desde CMS"
  ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 5. Verificación rápida (opcional):
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'products'
-- ORDER BY ordinal_position;
