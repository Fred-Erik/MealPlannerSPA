create or replace view public.ingredient_names
with (security_invoker = true) as
select
  name,
  count(*) as usage_count,
  array_agg(distinct unit) as units
from public.recipe_ingredients
group by name
order by name;

grant select on public.ingredient_names to authenticated;

create or replace view public.category_rotation
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.created_at,
  max(r.last_cooked_at) as last_cooked_at,
  -- most recent week a recipe of this category was planned, cooked or not; keeps the
  -- rotation moving forward for weeks already planned but not yet marked as cooked.
  max(mp.week_start) as last_planned_at,
  count(distinct r.id) as recipe_count
from public.categories c
left join public.recipes r on r.category_id = c.id
left join public.meal_plan_items mpi on mpi.recipe_id = r.id
left join public.meal_plans mp on mp.id = mpi.meal_plan_id
group by c.id, c.name, c.created_at;

grant select on public.category_rotation to authenticated;
