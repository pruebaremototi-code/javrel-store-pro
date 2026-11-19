-- ========================================================
-- JavrelStore — Script Consolidado de Persistencia y RLS (Supabase)
-- Ejecutar en el SQL Editor del proyecto Supabase: mnwockpzhhbcavqehrdy
-- ========================================================

-- 1. Habilitar extensión pgcrypto para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Asegurar columnas complementarias en la tabla products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Nuevo',
  ADD COLUMN IF NOT EXISTS commercial_tag TEXT,
  ADD COLUMN IF NOT EXISTS reference TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS ean TEXT,
  ADD COLUMN IF NOT EXISTS cost NUMERIC,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS specs JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS reviews INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS brand_id UUID,
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS additional_images TEXT[] DEFAULT '{}';

-- 3. Asegurar que whatsapp_link tenga default seguro y no bloquee inserts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'whatsapp_link'
  ) THEN
    UPDATE public.products SET whatsapp_link = 'https://wa.me/573000000000' WHERE whatsapp_link IS NULL;
    ALTER TABLE public.products ALTER COLUMN whatsapp_link SET DEFAULT 'https://wa.me/573000000000';
    ALTER TABLE public.products ALTER COLUMN whatsapp_link DROP NOT NULL;
  END IF;
END $$;

-- 4. Tabla de Marcas (brands) con índices únicos
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_lower_idx ON public.brands (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS brands_slug_idx ON public.brands (slug) WHERE slug IS NOT NULL;

-- 5. Tabla de Categorías (categories) con slug e icono
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT,
  icon TEXT DEFAULT 'Sparkles',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Sparkles';
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_idx ON public.categories (slug) WHERE slug IS NOT NULL;

-- 6. Tablas de configuración y personalizaciones del CMS
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'main_settings',
  store_name TEXT NOT NULL DEFAULT 'JavrelStore',
  whatsapp_number TEXT NOT NULL DEFAULT '573122174851',
  announcement_text TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  warranty_text TEXT DEFAULT 'Garantía Oficial 12 Meses',
  shipping_text TEXT DEFAULT 'Envíos Asegurados a Colombia',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_customizations (
  id TEXT PRIMARY KEY,
  content TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Habilitar RLS en todas las tablas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_customizations ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS de Catálogo Abierto (Lectura y Escritura para anon y authenticated)
DROP POLICY IF EXISTS "javrel_products_read" ON public.products;
DROP POLICY IF EXISTS "javrel_products_write" ON public.products;
CREATE POLICY "javrel_products_read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "javrel_products_write" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "javrel_categories_read" ON public.categories;
DROP POLICY IF EXISTS "javrel_categories_write" ON public.categories;
CREATE POLICY "javrel_categories_read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "javrel_categories_write" ON public.categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "javrel_brands_read" ON public.brands;
DROP POLICY IF EXISTS "javrel_brands_write" ON public.brands;
CREATE POLICY "javrel_brands_read" ON public.brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "javrel_brands_write" ON public.brands FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "javrel_store_settings_read" ON public.store_settings;
DROP POLICY IF EXISTS "javrel_store_settings_write" ON public.store_settings;
CREATE POLICY "javrel_store_settings_read" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "javrel_store_settings_write" ON public.store_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "javrel_store_customizations_read" ON public.store_customizations;
DROP POLICY IF EXISTS "javrel_store_customizations_write" ON public.store_customizations;
CREATE POLICY "javrel_store_customizations_read" ON public.store_customizations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "javrel_store_customizations_write" ON public.store_customizations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 9. Concesión de privilegios a la API de PostgREST
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_customizations TO anon, authenticated;
