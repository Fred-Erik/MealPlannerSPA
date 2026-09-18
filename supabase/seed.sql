-- Storage bucket for recipe photos (public, no client-side compression).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', true, 10485760, array['image/*'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Single global settings row.
insert into public.settings (id, default_recipes_per_week, default_servings)
values (1, 3, 6)
on conflict (id) do nothing;

-- Initial categories.
insert into public.categories (name)
values
  ('Ovenschotel'),
  ('Pasta'),
  ('Plaattaart'),
  ('Mexicaans'),
  ('Risotto'),
  ('Curry'),
  ('Soep'),
  ('Quiche / hartige taart'),
  ('Wraps'),
  ('Traybake')
on conflict (name) do nothing;
