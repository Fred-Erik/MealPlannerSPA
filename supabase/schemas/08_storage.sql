create policy "recipe_photos_public_read"
on storage.objects
for select
to public
using (bucket_id = 'recipe-photos');

create policy "recipe_photos_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'recipe-photos');

create policy "recipe_photos_authenticated_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'recipe-photos')
with check (bucket_id = 'recipe-photos');

create policy "recipe_photos_authenticated_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'recipe-photos');
