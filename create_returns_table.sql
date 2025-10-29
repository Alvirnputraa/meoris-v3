-- =============================================
-- CREATE: returns table (no RLS)
-- =============================================

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  order_number text,
  reason text not null,
  description text,
  photo_paths text[] default '{}',
  video_paths text[] default '{}',
  status text not null default 'pending',
  notes text
);

create index if not exists idx_returns_user on public.returns(user_id);
create index if not exists idx_returns_order on public.returns(order_id);
create index if not exists idx_returns_status on public.returns(status);

alter table public.returns
  alter column updated_at set default now();

-- Update trigger to keep updated_at fresh
create or replace function public.set_returns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_set_returns_updated_at on public.returns;
create trigger trg_set_returns_updated_at
before update on public.returns
for each row
execute function public.set_returns_updated_at();

-- Disable RLS (table accessible via policies already enforced elsewhere)
alter table public.returns disable row level security;
