create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null,
  base_servings integer not null default 6 check (base_servings > 0),
  instructions text,
  source_url text,
  notes text,
  photo_path text,
  last_cooked_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_category_id_idx on public.recipes (category_id);
create index if not exists recipes_category_last_cooked_idx
  on public.recipes (category_id, last_cooked_at nulls first);

alter table public.recipes enable row level security;

create policy "recipes_all_authenticated"
on public.recipes
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.recipes to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public;

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_updated_at();
