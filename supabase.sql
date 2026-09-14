-- PO Control - schema limpo para Supabase
-- Rode este arquivo no SQL Editor do Supabase.

create extension if not exists pgcrypto;

-- RECOMECO LIMPO: remove a tabela antiga deste MVP.
-- Como a versão anterior não salvava POs, isso evita conflito de colunas/policies antigas.
drop table if exists public.purchase_orders cascade;

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  po_number text not null,
  supplier text not null,
  client text,
  origin text,
  incoterm text,
  responsible text,
  order_date date,
  estimated_ready_date date not null,
  actual_ready_date date,
  status text not null default 'Aguardando produção',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_orders_status_check check (
    status in ('Aguardando produção','Em produção','Pronto','Embarcado','Concluído')
  ),
  constraint purchase_orders_user_po_unique unique (user_id, po_number)
);

alter table public.purchase_orders enable row level security;

-- Remover políticas antigas com os mesmos nomes, se existirem.
drop policy if exists "po_select_own" on public.purchase_orders;
drop policy if exists "po_insert_own" on public.purchase_orders;
drop policy if exists "po_update_own" on public.purchase_orders;
drop policy if exists "po_delete_own" on public.purchase_orders;

create policy "po_select_own"
on public.purchase_orders
for select
to authenticated
using (auth.uid() = user_id);

create policy "po_insert_own"
on public.purchase_orders
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "po_update_own"
on public.purchase_orders
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "po_delete_own"
on public.purchase_orders
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_purchase_orders_updated_at on public.purchase_orders;
create trigger trg_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

create index if not exists idx_purchase_orders_user_id on public.purchase_orders(user_id);
create index if not exists idx_purchase_orders_estimated_ready on public.purchase_orders(estimated_ready_date);
