-- Clean products table for football jerseys.
-- Copy/paste into Supabase SQL Editor and run.
-- Keeps system columns needed by app/security: id, customer_id, created_at, updated_at, status.
-- WARNING: drops unused columns and their data.

alter table public.products
  drop column if exists short_description,
  drop column if exists long_description,
  drop column if exists category,
  drop column if exists sku;

-- Rename old generic columns to jersey app names.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'stock_quantity'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'quantity'
  ) then
    alter table public.products rename column stock_quantity to quantity;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'image_urls'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'products'
      and column_name = 'photo_urls'
  ) then
    alter table public.products rename column image_urls to photo_urls;
  end if;
end $$;

-- Make sure desired columns exist if project is in weird partial state.
alter table public.products
  add column if not exists name text,
  add column if not exists price numeric,
  add column if not exists quantity integer,
  add column if not exists club text,
  add column if not exists photo_urls text[] default '{}',
  add column if not exists notes text;

-- Keep defaults sane.
alter table public.products
  alter column photo_urls set default '{}',
  alter column status set default 'new';

-- Optional check: shows final product columns.
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'products'
order by ordinal_position;
