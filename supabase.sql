-- PO Control - Supabase setup
create extension if not exists pgcrypto;

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier text not null,
  client text,
  origin text,
  incoterm text,
  owner text,
  order_date date,
  estimated_ready date not null,
  actual_ready date,
  status text not null default 'Aguardando produção',
  notes text,
  history jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_orders_status_check check (status in ('Aguardando produção','Em produção','Pronto','Embarcado','Concluído'))
);
create index if not exists purchase_orders_estimated_ready_idx on public.purchase_orders (estimated_ready);
create index if not exists purchase_orders_status_idx on public.purchase_orders (status);

create or replace function public.set_purchase_orders_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at before update on public.purchase_orders
for each row execute function public.set_purchase_orders_updated_at();

alter table public.purchase_orders enable row level security;
revoke all on table public.purchase_orders from anon, authenticated;
grant select, insert, update, delete on table public.purchase_orders to authenticated;

drop policy if exists "Authenticated users can read POs" on public.purchase_orders;
create policy "Authenticated users can read POs" on public.purchase_orders for select to authenticated using (true);
drop policy if exists "Authenticated users can insert POs" on public.purchase_orders;
create policy "Authenticated users can insert POs" on public.purchase_orders for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "Authenticated users can update POs" on public.purchase_orders;
create policy "Authenticated users can update POs" on public.purchase_orders for update to authenticated using (true) with check (auth.uid() is not null);
drop policy if exists "Authenticated users can delete POs" on public.purchase_orders;
create policy "Authenticated users can delete POs" on public.purchase_orders for delete to authenticated using (true);
