-- ========================================================
-- JavrelStore — Estados Físicos, Insignias Comerciales y Galería de Imágenes
-- Ejecutar en el SQL Editor de Supabase (proyecto mnwockpzhhbcavqehrdy)
-- ========================================================

-- 1. Agregar columnas para condición física y etiquetas comerciales
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Nuevo',
  ADD COLUMN IF NOT EXISTS commercial_tag TEXT,
  ADD COLUMN IF NOT EXISTS additional_images TEXT[] DEFAULT '{}';

-- 2. Asegurar que las políticas RLS permitan UPDATE e INSERT de estas columnas
COMMENT ON COLUMN public.products.condition IS 'Estado físico del producto: Nuevo, Seminuevo, Usado';
COMMENT ON COLUMN public.products.commercial_tag IS 'Insignia comercial: Black Friday, Oferta, Destacado, Liquidación';
COMMENT ON COLUMN public.products.additional_images IS 'Array de URLs de imágenes secundarias de la galería';
