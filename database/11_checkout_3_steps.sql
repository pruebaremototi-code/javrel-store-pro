-- ========================================================
-- JavrelStore — Checkout Progresivo en 3 Pasos
-- Ejecutar en el SQL Editor de Supabase
--
-- Incluye:
--   1. Nuevas columnas de envío, documento y cupones en `orders`
--   2. CHECK compatible de `payment_status` (nuevos + históricos)
--   3. Tabla `coupons` + cupón de prueba activo `BIENVENIDO10`
--   4. Bucket `payment-proofs` en Supabase Storage + políticas RLS
-- ========================================================

-- 1. Columnas adicionales en public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_document TEXT,
  ADD COLUMN IF NOT EXISTS customer_department TEXT,
  ADD COLUMN IF NOT EXISTS customer_city TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- 2. Actualizar CHECK de payment_status manteniendo compatibilidad con admin y pedidos históricos
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%payment_status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.orders DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check
  CHECK (
    payment_status IN (
      'Pendiente',
      'Aprobado',
      'Rechazado',
      'pendiente_verificacion',
      'pagado'
    )
  );

CREATE INDEX IF NOT EXISTS orders_coupon_code_idx
  ON public.orders (coupon_code)
  WHERE coupon_code IS NOT NULL;

-- 3. Tabla de cupones de descuento
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de cupones" ON public.coupons;
CREATE POLICY "Permitir lectura publica de cupones"
  ON public.coupons
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion de uso de cupones" ON public.coupons;
CREATE POLICY "Permitir actualizacion de uso de cupones"
  ON public.coupons
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Cupón de prueba activo: JAVREL10 (10% de descuento)
INSERT INTO public.coupons (
  code,
  description,
  discount_type,
  discount_value,
  min_order_amount,
  max_discount_amount,
  is_active
)
VALUES (
  'JAVREL10',
  '10% de descuento de bienvenida en JavrelStore',
  'percentage',
  10,
  0,
  150000,
  true
)
ON CONFLICT (code) DO UPDATE
SET
  is_active = EXCLUDED.is_active,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  max_discount_amount = EXCLUDED.max_discount_amount;

-- 4. Bucket de Supabase Storage para comprobantes de pago (imagen o PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS "Lectura publica comprobantes payment-proofs" ON storage.objects;
CREATE POLICY "Lectura publica comprobantes payment-proofs"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Subida publica comprobantes payment-proofs" ON storage.objects;
CREATE POLICY "Subida publica comprobantes payment-proofs"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'payment-proofs');
