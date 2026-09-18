create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null,
  quantity numeric,
  unit text,
  name text not null,
  unique (recipe_id, position)
);

create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients (recipe_id);
create index if not exists recipe_ingredients_name_idx on public.recipe_ingredients (lower(name));

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients_all_authenticated"
on public.recipe_ingredients
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.recipe_ingredients to authenticated;
