create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_all_authenticated"
on public.categories
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.categories to authenticated;
