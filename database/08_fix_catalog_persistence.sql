-- ========================================================
-- JavrelStore — Persistencia definitiva del catálogo y RLS
-- Ejecutar UNA sola vez en el SQL Editor de Supabase
-- (proyecto mnwockpzhhbcavqehrdy), después de 04, 05, 06 y 07.
--
-- Motivo:
--   * La app crea productos, categorías y marcas en caliente con UUID.
--   * Si RLS no permite INSERT/UPDATE, los artículos nuevos solo viven en
--     localStorage y desaparecen al recargar o al abrir otro dispositivo.
--   * La tabla `brands` estaba vacía y sin slug, y `categories` no tenía slug
--     en instalaciones antiguas.
--
-- Este script:
--   1. Garantiza las tablas/columnas necesarias (brands, slug, brand_id…).
--   2. Deja los ids UUID con default gen_random_uuid().
--   3. Habilita RLS y crea políticas de catálogo abierto (lectura/escritura
--      con la publishable/anon key usada por la app).
--   4. Concede privilegios a los roles anon y authenticated.
-- ========================================================

create extension if not exists pgcrypto;

-- ========================================================
-- 1. TABLA DE MARCAS
-- ========================================================
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  created_at timestamptz not null default now()
);

alter table public.brands add column if not exists slug text;
alter table public.brands add column if not exists created_at timestamptz not null default now();

create unique index if not exists brands_name_lower_idx
  on public.brands (lower(name));
create unique index if not exists brands_slug_idx
  on public.brands (slug)
  where slug is not null;

-- ========================================================
-- 2. CATEGORÍAS: slug e icono
-- ========================================================
alter table public.categories add column if not exists slug text;
alter table public.categories add column if not exists icon text;

update public.categories
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

create unique index if not exists categories_slug_idx
  on public.categories (slug)
  where slug is not null;

-- ========================================================
-- 3. PRODUCTOS: columnas visuales y relaciones UUID
-- ========================================================
alter table public.products add column if not exists brand text;
alter table public.products add column if not exists badge text;
alter table public.products add column if not exists specs jsonb default '[]'::jsonb;
alter table public.products add column if not exists rating numeric default 5.0;
alter table public.products add column if not exists reviews integer default 0;
alter table public.products add column if not exists featured boolean default false;
alter table public.products add column if not exists is_featured boolean default false;
alter table public.products add column if not exists brand_id uuid;
alter table public.products add column if not exists category_id uuid;

-- `whatsapp_link` es NOT NULL en producción y no tenía default: cualquier alta
-- sin ese campo fallaba con 23502. Se rellena y se deja con default seguro.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'whatsapp_link'
  ) then
    execute 'update public.products set whatsapp_link = ''https://wa.me/573000000000'' where whatsapp_link is null';
    execute 'alter table public.products alter column whatsapp_link set default ''https://wa.me/573000000000''';
    execute 'alter table public.products alter column whatsapp_link drop not null';
  end if;
end $$;

-- FK de marca (solo si no existe ya).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_brand_id_fkey'
  ) then
    alter table public.products
      add constraint products_brand_id_fkey
      foreign key (brand_id) references public.brands(id) on delete set null;
  end if;
exception
  when others then
    raise notice 'No se pudo crear products_brand_id_fkey: %', sqlerrm;
end $$;

-- ========================================================
-- 4. DEFAULTS UUID (solo cuando la columna ya es UUID)
-- ========================================================
do $$
declare
  t text;
begin
  foreach t in array array['products', 'categories', 'brands'] loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t
        and column_name = 'id'
        and data_type = 'uuid'
    ) then
      execute format('alter table public.%I alter column id set default gen_random_uuid()', t);
    end if;
  end loop;
end $$;

-- ========================================================
-- 5. RLS Y POLÍTICAS DEL CATÁLOGO
-- ========================================================
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;

drop policy if exists "javrel_products_read" on public.products;
drop policy if exists "javrel_products_write" on public.products;
drop policy if exists "javrel_categories_read" on public.categories;
drop policy if exists "javrel_categories_write" on public.categories;
drop policy if exists "javrel_brands_read" on public.brands;
drop policy if exists "javrel_brands_write" on public.brands;

create policy "javrel_products_read"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "javrel_products_write"
  on public.products for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "javrel_categories_read"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "javrel_categories_write"
  on public.categories for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "javrel_brands_read"
  on public.brands for select
  to anon, authenticated
  using (true);

create policy "javrel_brands_write"
  on public.brands for all
  to anon, authenticated
  using (true)
  with check (true);

-- ========================================================
-- 6. CONFIGURACIÓN Y PERSONALIZACIONES (si existen)
-- ========================================================
do $$
begin
  if to_regclass('public.store_settings') is not null then
    execute 'alter table public.store_settings enable row level security';
    execute 'drop policy if exists "javrel_store_settings_read" on public.store_settings';
    execute 'drop policy if exists "javrel_store_settings_write" on public.store_settings';
    execute 'create policy "javrel_store_settings_read" on public.store_settings for select to anon, authenticated using (true)';
    execute 'create policy "javrel_store_settings_write" on public.store_settings for all to anon, authenticated using (true) with check (true)';
  end if;

  if to_regclass('public.store_customizations') is not null then
    execute 'alter table public.store_customizations enable row level security';
    execute 'drop policy if exists "javrel_store_customizations_read" on public.store_customizations';
    execute 'drop policy if exists "javrel_store_customizations_write" on public.store_customizations';
    execute 'create policy "javrel_store_customizations_read" on public.store_customizations for select to anon, authenticated using (true)';
    execute 'create policy "javrel_store_customizations_write" on public.store_customizations for all to anon, authenticated using (true) with check (true)';
  end if;
end $$;

-- ========================================================
-- 7. PRIVILEGIOS PARA LA API (PostgREST)
-- ========================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;
grant select, insert, update, delete on public.categories to anon, authenticated;
grant select, insert, update, delete on public.brands to anon, authenticated;

do $$
begin
  if to_regclass('public.store_settings') is not null then
    execute 'grant select, insert, update, delete on public.store_settings to anon, authenticated';
  end if;
  if to_regclass('public.store_customizations') is not null then
    execute 'grant select, insert, update, delete on public.store_customizations to anon, authenticated';
  end if;
end $$;

-- ========================================================
-- 8. VERIFICACIÓN RÁPIDA (opcional)
-- ========================================================
-- select count(*) as productos from public.products;
-- select count(*) as categorias from public.categories;
-- select count(*) as marcas from public.brands;
