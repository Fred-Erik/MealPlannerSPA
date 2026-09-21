SET local check_function_bodies = off;

DROP VIEW "public"."category_rotation";

CREATE OR REPLACE FUNCTION public.save_recipe (
  payload jsonb
)
  RETURNS uuid
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_recipe_last_cooked()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
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
$function$;

CREATE VIEW "public"."category_rotation" WITH (security_invoker=true) AS  SELECT c.id,
    c.name,
    c.created_at,
    max(r.last_cooked_at) AS last_cooked_at,
    max(mp.week_start) AS last_planned_at,
    count(DISTINCT r.id) AS recipe_count
   FROM (((public.categories c
     LEFT JOIN public.recipes r ON ((r.category_id = c.id)))
     LEFT JOIN public.meal_plan_items mpi ON ((mpi.recipe_id = r.id)))
     LEFT JOIN public.meal_plans mp ON ((mp.id = mpi.meal_plan_id)))
  GROUP BY c.id, c.name, c.created_at;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."category_rotation" TO "anon", "authenticated", "postgres", "service_role";
