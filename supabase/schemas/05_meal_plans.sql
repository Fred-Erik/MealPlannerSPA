create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  created_at timestamptz not null default now()
);

alter table public.meal_plans enable row level security;

create policy "meal_plans_all_authenticated"
on public.meal_plans
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.meal_plans to authenticated;

create table if not exists public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  servings integer not null check (servings > 0),
  position integer not null,
  cooked_at date,
  unique (meal_plan_id, position)
);

create index if not exists meal_plan_items_meal_plan_id_idx on public.meal_plan_items (meal_plan_id);
create index if not exists meal_plan_items_recipe_id_idx on public.meal_plan_items (recipe_id);

alter table public.meal_plan_items enable row level security;

create policy "meal_plan_items_all_authenticated"
on public.meal_plan_items
for all
to authenticated
using (true)
with check (true);

grant select, insert, update, delete on public.meal_plan_items to authenticated;
