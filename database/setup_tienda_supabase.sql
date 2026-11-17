-- ========================================================
-- MERCADO TECNOLÓGICO SUPER WOW - ESQUEMA Y POLÍTICAS SUPABASE
-- Ejecutar en el SQL Editor de tu proyecto Supabase (mnwockpzhhbcavqehrdy)
-- ========================================================

-- 1. Tabla de Categorías
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'Sparkles',
    count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Productos Multi-Categoría
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    image TEXT NOT NULL,
    badge TEXT,
    rating NUMERIC DEFAULT 5.0,
    reviews INT DEFAULT 0,
    stock INT DEFAULT 10,
    featured BOOLEAN DEFAULT false,
    description TEXT,
    specs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Configuración de la Tienda (CMS)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'main_settings',
    store_name TEXT NOT NULL DEFAULT 'Mercado Tecnológico Super Wow',
    whatsapp_number TEXT NOT NULL DEFAULT '573105556677',
    announcement_text TEXT,
    hero_title TEXT,
    hero_subtitle TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Habilitar RLS (Row Level Security) y Políticas de Acceso Público
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública (cualquier visitante puede ver el catálogo)
DROP POLICY IF EXISTS "Permitir lectura publica de categorias" ON public.categories;
CREATE POLICY "Permitir lectura publica de categorias" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de productos" ON public.products;
CREATE POLICY "Permitir lectura publica de productos" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir lectura publica de configuracion" ON public.store_settings;
CREATE POLICY "Permitir lectura publica de configuracion" ON public.store_settings FOR SELECT USING (true);

-- Políticas de escritura (habilitadas para gestión desde el CMS)
DROP POLICY IF EXISTS "Permitir insercion y actualizacion en productos" ON public.products;
CREATE POLICY "Permitir insercion y actualizacion en productos" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion en categorias" ON public.categories;
CREATE POLICY "Permitir insercion y actualizacion en categorias" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificacion de configuracion" ON public.store_settings;
CREATE POLICY "Permitir modificacion de configuracion" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);
