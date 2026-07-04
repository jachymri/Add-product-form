-- Supabase complete setup for customer product portal.
-- Copy/paste entire file into Supabase SQL Editor, then click Run.
-- After this, manually add approved Auth users, then run insert at bottom per customer.

-- Needed for gen_random_uuid() on some projects.
create extension if not exists pgcrypto;

-- Customers table: one row per approved auth user.
create table if not exists public.customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

-- Product submissions.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  name text not null,
  short_description text,
  long_description text,
  price numeric,
  category text,
  sku text,
  stock_quantity integer,
  status text default 'new',
  notes text,
  image_urls text[] default '{}'
);

-- Keep updated_at fresh.
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

-- Enable Row Level Security.
alter table public.customers enable row level security;
alter table public.products enable row level security;

-- Customers can only see their own customer row.
drop policy if exists "customers can see themselves" on public.customers;
create policy "customers can see themselves"
on public.customers
for select
to authenticated
using (id = auth.uid());

-- Customers can only see their own products.
drop policy if exists "customers can see own products" on public.products;
create policy "customers can see own products"
on public.products
for select
to authenticated
using (customer_id = auth.uid());

-- Customers can only create products for themselves.
drop policy if exists "customers can insert own products" on public.products;
create policy "customers can insert own products"
on public.products
for insert
to authenticated
with check (customer_id = auth.uid());

-- Customers can only update their own products.
drop policy if exists "customers can update own products" on public.products;
create policy "customers can update own products"
on public.products
for update
to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

-- Create private storage bucket if missing.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Customers upload only to folder named with their auth user id.
-- App uploads paths like: <auth.uid()>/<uuid>-filename.jpg
drop policy if exists "customers can upload own product images" on storage.objects;
create policy "customers can upload own product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Customers can read only own uploaded images.
drop policy if exists "customers can read own product images" on storage.objects;
create policy "customers can read own product images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Optional: allow customers to delete their own uploaded images.
drop policy if exists "customers can delete own product images" on storage.objects;
create policy "customers can delete own product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Sanity check output.
select 'setup complete' as status;

-- NEXT STEP, after running setup:
-- 1. Supabase Dashboard -> Authentication -> Users -> Add user.
-- 2. Copy that user's ID.
-- 3. Run this per customer, replacing values:
--
-- insert into public.customers (id, email, name)
-- values ('USER_ID_FROM_AUTH_USERS', 'customer@example.com', 'Customer Name')
-- on conflict (id) do update set
--   email = excluded.email,
--   name = excluded.name;
