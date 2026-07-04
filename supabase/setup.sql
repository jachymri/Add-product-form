-- Run in Supabase SQL Editor.
-- Creates approved-customer product intake tables, RLS rules, storage rules.

create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  name text not null,
  price numeric,
  quantity integer,
  club text,
  photo_urls text[] default '{}',
  notes text,
  status text default 'new'
);

alter table public.products
  drop column if exists short_description,
  drop column if exists long_description,
  drop column if exists category,
  drop column if exists sku;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'stock_quantity')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'quantity') then
    alter table public.products rename column stock_quantity to quantity;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'image_urls')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'photo_urls') then
    alter table public.products rename column image_urls to photo_urls;
  end if;
end $$;

alter table public.products
  add column if not exists quantity integer,
  add column if not exists club text,
  add column if not exists photo_urls text[] default '{}';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.products enable row level security;

drop policy if exists "customers can see themselves" on public.customers;
create policy "customers can see themselves"
on public.customers
for select
to authenticated
using (id = auth.uid());

drop policy if exists "customers can see own products" on public.products;
create policy "customers can see own products"
on public.products
for select
to authenticated
using (customer_id = auth.uid());

drop policy if exists "customers can insert own products" on public.products;
create policy "customers can insert own products"
on public.products
for insert
to authenticated
with check (customer_id = auth.uid());

drop policy if exists "customers can update own products" on public.products;
create policy "customers can update own products"
on public.products
for update
to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

-- Create private bucket in Dashboard first:
-- Storage -> New bucket -> product-images -> Public bucket OFF

-- Image paths are user-id/file-name. Example: <auth.uid()>/<uuid>-image.jpg
-- Private bucket: only logged-in owner can upload/read own folder.


drop policy if exists "customers can upload own product images" on storage.objects;
create policy "customers can upload own product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "customers can read own product images" on storage.objects;
create policy "customers can read own product images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
