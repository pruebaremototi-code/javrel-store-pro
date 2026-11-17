-- ========================================================
-- TABLA DE PEDIDOS E INVENTARIO - MERCADO TECNOLÓGICO SUPER WOW
-- Ejecutar en el SQL Editor de tu proyecto Supabase (mnwockpzhhbcavqehrdy)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_code TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL, -- 'QR_BANCOLOMBIA_NEQUI', 'PSE', 'CREDIT_CARD', 'WHATSAPP_DIRECT'
    payment_status TEXT NOT NULL DEFAULT 'Pendiente' CHECK (payment_status IN ('Pendiente', 'Aprobado', 'Rechazado')),
    payment_proof_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública (para verificar estados y consulta de pedidos)
DROP POLICY IF EXISTS "Permitir lectura publica de pedidos" ON public.orders;
CREATE POLICY "Permitir lectura publica de pedidos" ON public.orders FOR SELECT USING (true);

-- Política de inserción (para que cualquier cliente al completar checkout cree su orden)
DROP POLICY IF EXISTS "Permitir insercion publica de pedidos" ON public.orders;
CREATE POLICY "Permitir insercion publica de pedidos" ON public.orders FOR INSERT WITH CHECK (true);

-- Política de actualización (para que el administrador cambie el estado de la orden)
DROP POLICY IF EXISTS "Permitir actualizacion de pedidos" ON public.orders;
CREATE POLICY "Permitir actualizacion de pedidos" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);

-- Campos adicionales recomendados en store_settings para gestión de pagos QR
ALTER TABLE public.store_settings 
    ADD COLUMN IF NOT EXISTS qr_payment_image_url TEXT DEFAULT '/zafra/logo.webp',
    ADD COLUMN IF NOT EXISTS payment_bank_account TEXT DEFAULT 'Bancolombia Ahorros: 829-000123-45',
    ADD COLUMN IF NOT EXISTS payment_nequi_phone TEXT DEFAULT '3122174851';
