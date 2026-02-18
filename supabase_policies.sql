-- Supabase RLS policies needed for frontend-only deployment.
-- Run in Supabase SQL editor.

-- ============================================================
-- 0) TABLE FOR DISEASE CONTOUR ANNOTATIONS
-- ============================================================
drop table if exists annotations_maladie cascade;

create table if not exists annotations_maladie (
  id uuid primary key default gen_random_uuid(),
  diagnostic_id uuid references categories_diagnostics(id) on delete cascade,
  image_hash text not null,
  utilisateur_id bigint not null references utilisateurs(id) on delete cascade,
  image_original_url text,
  annotated_image_path text not null,
  annotated_image_url text not null,
  annotation_details jsonb not null,
  created_at timestamptz not null default now()
);

alter table annotations_maladie enable row level security;

create policy "annotations_maladie_read_auth"
on annotations_maladie
for select
to authenticated
using (true);

create policy "annotations_maladie_insert_own"
on annotations_maladie
for insert
to authenticated
with check (
  utilisateur_id = (
    select id from utilisateurs
    where email = (auth.jwt() ->> 'email')
    limit 1
  )
);

create policy "annotations_maladie_update_own"
on annotations_maladie
for update
to authenticated
using (
  utilisateur_id = (
    select id from utilisateurs
    where email = (auth.jwt() ->> 'email')
    limit 1
  )
)
with check (
  utilisateur_id = (
    select id from utilisateurs
    where email = (auth.jwt() ->> 'email')
    limit 1
  )
);

create policy "annotations_maladie_delete_own"
on annotations_maladie
for delete
to authenticated
using (
  utilisateur_id = (
    select id from utilisateurs
    where email = (auth.jwt() ->> 'email')
    limit 1
  )
);

-- 1) utilisateurs: allow each authenticated user to read own profile by email
alter table utilisateurs enable row level security;

create policy "utilisateurs_read_own"
on utilisateurs
for select
to authenticated
using (email = (auth.jwt() ->> 'email'));

-- 2) categories_diagnostics: allow authenticated users to read all rows
alter table categories_diagnostics enable row level security;

create policy "categories_diagnostics_read_all"
on categories_diagnostics
for select
to authenticated
using (true);

-- 3) allow insert from authenticated users (needed for duo insert flow)
create policy "categories_diagnostics_insert_auth"
on categories_diagnostics
for insert
to authenticated
with check (true);

-- 4) allow update/delete only for rows owned by the authenticated user
-- assumes utilisateurs.email matches auth email
create policy "categories_diagnostics_update_own"
on categories_diagnostics
for update
to authenticated
using (
  utilisateur_id = (
    select id from utilisateurs
    where email = (auth.jwt() ->> 'email')
    limit 1
  )
)
with check (
  utilisateur_id = (
    select id from utilisateurs
    where email = (auth.jwt() ->> 'email')
    limit 1
  )
);

create policy "categories_diagnostics_delete_own"
on categories_diagnostics
for delete
to authenticated
using (
  utilisateur_id = (
    select id from utilisateurs
    where email = (auth.jwt() ->> 'email')
    limit 1
  )
);

-- 5) storage bucket "images" (if you use Supabase Storage)
-- Make bucket public OR set policies below to allow authenticated access.
-- Uncomment if bucket is private.
--
-- create policy "storage_read_auth"
-- on storage.objects
-- for select
-- to authenticated
-- using (bucket_id = 'images');
--
-- create policy "storage_insert_auth"
-- on storage.objects
-- for insert
-- to authenticated
-- with check (bucket_id = 'images');

-- 6) optional: if your bucket images is private, authorize only annotation folder
-- create policy "storage_annotations_read_auth"
-- on storage.objects
-- for select
-- to authenticated
-- using (
--   bucket_id = 'images'
--   and (storage.foldername(name))[1] = 'annotations'
-- );
--
-- create policy "storage_annotations_insert_auth"
-- on storage.objects
-- for insert
-- to authenticated
-- with check (
--   bucket_id = 'images'
--   and (storage.foldername(name))[1] = 'annotations'
-- );
