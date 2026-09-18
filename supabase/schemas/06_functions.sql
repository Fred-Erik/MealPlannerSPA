create or replace function public.sync_recipe_last_cooked()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id uuid;
begin
  if tg_op = 'DELETE' then
    v_recipe_id := old.recipe_id;
  else
    v_recipe_id := new.recipe_id;
  end if;

  update public.recipes
  set last_cooked_at = (
    select max(mpi.cooked_at) from public.meal_plan_items mpi where mpi.recipe_id = v_recipe_id
  )
  where id = v_recipe_id;

  if tg_op = 'UPDATE' and old.recipe_id is distinct from new.recipe_id then
    update public.recipes
    set last_cooked_at = (
      select max(mpi.cooked_at) from public.meal_plan_items mpi where mpi.recipe_id = old.recipe_id
    )
    where id = old.recipe_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_recipe_last_cooked() from public;

drop trigger if exists sync_recipe_last_cooked_trigger on public.meal_plan_items;
create trigger sync_recipe_last_cooked_trigger
after insert or update or delete on public.meal_plan_items
for each row
execute function public.sync_recipe_last_cooked();

-- Atomically upserts a recipe and replaces its ingredient list (PostgREST can't span a transaction across tables).
create or replace function public.save_recipe(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id uuid;
  v_ingredient jsonb;
  v_position integer := 0;
begin
  v_recipe_id := coalesce(nullif(payload->>'id', '')::uuid, gen_random_uuid());

  insert into public.recipes (
    id, category_id, name, base_servings, instructions, source_url, notes, photo_path, last_cooked_at
  )
  values (
    v_recipe_id,
    (payload->>'category_id')::uuid,
    payload->>'name',
    coalesce((payload->>'base_servings')::integer, 6),
    payload->>'instructions',
    payload->>'source_url',
    payload->>'notes',
    payload->>'photo_path',
    nullif(payload->>'last_cooked_at', '')::date
  )
  on conflict (id) do update
  set category_id = excluded.category_id,
      name = excluded.name,
      base_servings = excluded.base_servings,
      instructions = excluded.instructions,
      source_url = excluded.source_url,
      notes = excluded.notes,
      photo_path = excluded.photo_path,
      last_cooked_at = excluded.last_cooked_at;

  delete from public.recipe_ingredients where recipe_id = v_recipe_id;

  for v_ingredient in select * from jsonb_array_elements(coalesce(payload->'ingredients', '[]'::jsonb))
  loop
    insert into public.recipe_ingredients (recipe_id, position, quantity, unit, name)
    values (
      v_recipe_id,
      v_position,
      nullif(v_ingredient->>'quantity', '')::numeric,
      nullif(v_ingredient->>'unit', ''),
      v_ingredient->>'name'
    );
    v_position := v_position + 1;
  end loop;

  return v_recipe_id;
end;
$$;

revoke execute on function public.save_recipe(jsonb) from public;
grant execute on function public.save_recipe(jsonb) to authenticated;

