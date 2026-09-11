-- Ensure employee onboarding can store private profile photographs when the
-- optional compatibility migration was not installed on an existing database.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists profile_photos_self_read on storage.objects;
create policy profile_photos_self_read
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-photos'
  and (
    (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text
    or public.has_company_role(((storage.foldername(name))[1])::uuid, array['hr_manager','admin']::public.app_role[])
  )
);

drop policy if exists profile_photos_self_upload on storage.objects;
create policy profile_photos_self_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text
);

drop policy if exists profile_photos_self_update on storage.objects;
create policy profile_photos_self_update
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text
);

drop policy if exists profile_photos_self_delete on storage.objects;
create policy profile_photos_self_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[2] = public.current_employee_id(((storage.foldername(name))[1])::uuid)::text
);

notify pgrst, 'reload schema';
