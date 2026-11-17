-- ========================================================
-- POLÍTICAS DE BORRADO DURO (HARD-DELETE) EN SUPABASE
-- JavrelStore / Mercado Tecnológico Super Wow
-- Ejecutar en el SQL Editor de tu proyecto Supabase (mnwockpzhhbcavqehrdy)
-- ========================================================

-- 1. Habilitar DELETE en la tabla de Pedidos (Orders)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir eliminacion de pedidos" ON public.orders;
CREATE POLICY "Permitir eliminacion de pedidos" ON public.orders FOR DELETE USING (true);

-- 2. Habilitar DELETE en la tabla de Ítems de Pedidos (si existe)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Permitir eliminacion de order_items" ON public.order_items;
    CREATE POLICY "Permitir eliminacion de order_items" ON public.order_items FOR DELETE USING (true);
  END IF;
END $$;

-- 3. Habilitar DELETE en la tabla de Productos (Products)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir eliminacion de productos" ON public.products;
CREATE POLICY "Permitir eliminacion de productos" ON public.products FOR DELETE USING (true);

-- 4. Habilitar DELETE en la tabla de Categorías (Categories)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir eliminacion de categorias" ON public.categories;
CREATE POLICY "Permitir eliminacion de categorias" ON public.categories FOR DELETE USING (true);

-- Confirmación de políticas activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('orders', 'products', 'categories');
