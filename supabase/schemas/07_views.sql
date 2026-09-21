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
  count(r.id) as recipe_count
from public.categories c
left join public.recipes r on r.category_id = c.id
group by c.id, c.name, c.created_at;

grant select on public.category_rotation to authenticated;
