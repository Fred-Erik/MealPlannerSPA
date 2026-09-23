SET local check_function_bodies = off;

ALTER TABLE "public"."categories" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at) - 1 AS rn
  FROM public.categories
)
UPDATE public.categories c
SET sort_order = ordered.rn
FROM ordered
WHERE c.id = ordered.id;

DROP VIEW "public"."category_rotation";

CREATE OR REPLACE VIEW "public"."category_rotation"
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.name,
  c.sort_order,
  c.created_at,
  max(r.last_cooked_at) AS last_cooked_at,
  count(r.id) AS recipe_count
FROM public.categories c
LEFT JOIN public.recipes r ON r.category_id = c.id
GROUP BY c.id, c.name, c.sort_order, c.created_at;

GRANT SELECT ON "public"."category_rotation" TO "authenticated";

-- Sets category sort_order to match the given id order (used for drag-and-drop reordering).
CREATE OR REPLACE FUNCTION public.reorder_categories (
  category_ids uuid[]
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO ''
  AS $function$
declare
  v_id uuid;
  v_position integer := 0;
begin
  foreach v_id in array category_ids
  loop
    update public.categories set sort_order = v_position where id = v_id;
    v_position := v_position + 1;
  end loop;
end;
$function$;

REVOKE ALL ON FUNCTION public.reorder_categories (uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_categories (uuid[]) TO "authenticated";
