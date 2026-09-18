SET local check_function_bodies = off;

CREATE TABLE "public"."categories" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"       text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "categories_name_key" UNIQUE (name),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meal_plan_items" (
  "id"           uuid    NOT NULL DEFAULT gen_random_uuid(),
  "meal_plan_id" uuid    NOT NULL,
  "recipe_id"    uuid    NOT NULL,
  "servings"     integer NOT NULL,
  "position"     integer NOT NULL,
  "cooked_at"    date,
  CONSTRAINT "meal_plan_items_meal_plan_id_position_key" UNIQUE (meal_plan_id, "position"),
  CONSTRAINT "meal_plan_items_pkey" PRIMARY KEY (id),
  CONSTRAINT "meal_plan_items_servings_check" CHECK ((servings > 0))
);

ALTER TABLE "public"."meal_plan_items"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."meal_plans" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "week_start" date                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "meal_plans_pkey" PRIMARY KEY (id),
  CONSTRAINT "meal_plans_week_start_key" UNIQUE (week_start)
);

ALTER TABLE "public"."meal_plans"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recipe_ingredients" (
  "id"        uuid    NOT NULL DEFAULT gen_random_uuid(),
  "recipe_id" uuid    NOT NULL,
  "position"  integer NOT NULL,
  "quantity"  numeric,
  "unit"      text,
  "name"      text    NOT NULL,
  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY (id),
  CONSTRAINT "recipe_ingredients_recipe_id_position_key" UNIQUE (recipe_id, "position")
);

ALTER TABLE "public"."recipe_ingredients"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."recipes" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "category_id"    uuid                     NOT NULL,
  "name"           text                     NOT NULL,
  "base_servings"  integer                  NOT NULL DEFAULT 6,
  "instructions"   text,
  "source_url"     text,
  "notes"          text,
  "photo_path"     text,
  "last_cooked_at" date,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "recipes_base_servings_check" CHECK ((base_servings > 0)),
  CONSTRAINT "recipes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."recipes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."settings" (
  "id"                       integer                  NOT NULL DEFAULT 1,
  "default_recipes_per_week" integer                  NOT NULL DEFAULT 3,
  "default_servings"         integer                  NOT NULL DEFAULT 6,
  "updated_at"               timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "settings_default_recipes_per_week_check" CHECK ((default_recipes_per_week >= 0)),
  CONSTRAINT "settings_default_servings_check" CHECK ((default_servings > 0)),
  CONSTRAINT "settings_id_check" CHECK ((id = 1)),
  CONSTRAINT "settings_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."settings"
  ENABLE ROW LEVEL SECURITY;

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
  v_recipe_id := nullif(payload->>'id', '')::uuid;

  if v_recipe_id is null then
    insert into public.recipes (
      category_id, name, base_servings, instructions, source_url, notes, photo_path, last_cooked_at
    )
    values (
      (payload->>'category_id')::uuid,
      payload->>'name',
      coalesce((payload->>'base_servings')::integer, 6),
      payload->>'instructions',
      payload->>'source_url',
      payload->>'notes',
      payload->>'photo_path',
      nullif(payload->>'last_cooked_at', '')::date
    )
    returning id into v_recipe_id;
  else
    update public.recipes
    set category_id = (payload->>'category_id')::uuid,
        name = payload->>'name',
        base_servings = coalesce((payload->>'base_servings')::integer, 6),
        instructions = payload->>'instructions',
        source_url = payload->>'source_url',
        notes = payload->>'notes',
        photo_path = payload->>'photo_path',
        last_cooked_at = nullif(payload->>'last_cooked_at', '')::date
    where id = v_recipe_id;

    delete from public.recipe_ingredients where recipe_id = v_recipe_id;
  end if;

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

ALTER TABLE "public"."meal_plan_items"
  ADD CONSTRAINT "meal_plan_items_meal_plan_id_fkey" FOREIGN KEY (meal_plan_id) REFERENCES public.meal_plans(id) ON DELETE CASCADE;

ALTER TABLE "public"."recipes"
  ADD CONSTRAINT "recipes_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

ALTER TABLE "public"."meal_plan_items"
  ADD CONSTRAINT "meal_plan_items_recipe_id_fkey" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

ALTER TABLE "public"."recipe_ingredients"
  ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;

CREATE VIEW "public"."category_rotation" WITH (security_invoker=true) AS  SELECT c.id,
    c.name,
    c.created_at,
    max(r.last_cooked_at) AS last_cooked_at,
    count(r.id) AS recipe_count
   FROM (public.categories c
     LEFT JOIN public.recipes r ON ((r.category_id = c.id)))
  GROUP BY c.id, c.name, c.created_at;

CREATE VIEW "public"."ingredient_names" WITH (security_invoker=true) AS  SELECT name,
    count(*) AS usage_count,
    array_agg(DISTINCT unit) AS units
   FROM public.recipe_ingredients
  GROUP BY name
  ORDER BY name;

CREATE INDEX meal_plan_items_meal_plan_id_idx ON public.meal_plan_items USING btree (meal_plan_id);

CREATE INDEX meal_plan_items_recipe_id_idx ON public.meal_plan_items USING btree (recipe_id);

CREATE INDEX recipe_ingredients_name_idx ON public.recipe_ingredients USING btree (lower(name));

CREATE INDEX recipe_ingredients_recipe_id_idx ON public.recipe_ingredients USING btree (recipe_id);

CREATE INDEX recipes_category_id_idx ON public.recipes USING btree (category_id);

CREATE INDEX recipes_category_last_cooked_idx ON public.recipes USING btree (category_id, last_cooked_at NULLS FIRST);

CREATE TRIGGER sync_recipe_last_cooked_trigger
  AFTER INSERT OR DELETE OR UPDATE ON public.meal_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_recipe_last_cooked();

CREATE TRIGGER set_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "categories_all_authenticated" ON "public"."categories"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "meal_plan_items_all_authenticated" ON "public"."meal_plan_items"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "meal_plans_all_authenticated" ON "public"."meal_plans"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "recipe_ingredients_all_authenticated" ON "public"."recipe_ingredients"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "recipes_all_authenticated" ON "public"."recipes"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "settings_all_authenticated" ON "public"."settings"
  FOR ALL
  TO "authenticated"
  USING (true)
  WITH CHECK (true);

CREATE POLICY "recipe_photos_authenticated_delete" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING ((bucket_id = 'recipe-photos'::text));

CREATE POLICY "recipe_photos_authenticated_insert" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'recipe-photos'::text));

CREATE POLICY "recipe_photos_authenticated_update" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING ((bucket_id = 'recipe-photos'::text))
  WITH CHECK ((bucket_id = 'recipe-photos'::text));

CREATE POLICY "recipe_photos_public_read" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'recipe-photos'::text));

REVOKE ALL ON FUNCTION "public"."save_recipe"(jsonb) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."save_recipe"(jsonb) TO "authenticated", "service_role";

REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."set_updated_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."sync_recipe_last_cooked"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."sync_recipe_last_cooked"() TO "authenticated", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "authenticated", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."meal_plan_items" TO "authenticated", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."meal_plans" TO "authenticated", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipe_ingredients" TO "authenticated", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."recipes" TO "authenticated", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."settings" TO "authenticated", "service_role";

GRANT SELECT ON TABLE "public"."category_rotation" TO "authenticated", "service_role";

GRANT SELECT ON TABLE "public"."ingredient_names" TO "authenticated", "service_role";
