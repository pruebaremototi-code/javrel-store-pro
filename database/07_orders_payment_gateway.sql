-- ========================================================
-- JavrelStore — Pasarela multopción y comprobantes de pago
-- Ejecutar en el SQL Editor de Supabase después de las migraciones 04-06.
--
-- Agrega los campos necesarios para registrar pagos por Wompi / Llave Breve,
-- PayPal y Mi Billetera, junto con el número de operación y el comprobante.
-- ========================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_operation_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS payment_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS validated_by TEXT;

CREATE INDEX IF NOT EXISTS orders_payment_status_idx
  ON public.orders (payment_status);

CREATE INDEX IF NOT EXISTS orders_payment_provider_idx
  ON public.orders (payment_provider);

-- RLS: el checkout público puede crear pedidos y adjuntar comprobantes;
-- el panel administrativo puede aprobar/rechazar el pago.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir lectura publica de pedidos" ON public.orders;
CREATE POLICY "Permitir lectura publica de pedidos"
  ON public.orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion publica de pedidos" ON public.orders;
CREATE POLICY "Permitir insercion publica de pedidos"
  ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion de pedidos" ON public.orders;
CREATE POLICY "Permitir actualizacion de pedidos"
  ON public.orders FOR UPDATE USING (true) WITH CHECK (true);

-- Verificación posterior:
-- SELECT reference_code, payment_method, payment_provider,
--        payment_operation_number, payment_status, payment_proof_url
-- FROM public.orders ORDER BY created_at DESC LIMIT 20;
