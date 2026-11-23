-- Run once in the Supabase SQL Editor, then add the project URL and anon key to supabase-config.js.

create table if not exists public.crew_photos (
  id uuid primary key default gen_random_uuid(),
  file_path text not null unique,
  public_url text not null,
  original_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/heic', 'image/heif')),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 12582912),
  captured_at text,
  day_id text,
  stage_id text,
  stage_title text,
  exif jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crew_photos_day_stage_idx
  on public.crew_photos (day_id, stage_id, captured_at);

alter table public.crew_photos enable row level security;

grant select, insert on public.crew_photos to anon;
revoke update, delete on public.crew_photos from anon;

drop policy if exists crew_photos_public_read on public.crew_photos;
create policy crew_photos_public_read
  on public.crew_photos for select to anon
  using (true);

drop policy if exists crew_photos_public_insert on public.crew_photos;
create policy crew_photos_public_insert
  on public.crew_photos for insert to anon
  with check (
    mime_type in ('image/jpeg', 'image/heic', 'image/heif')
    and size_bytes > 0
    and size_bytes <= 12582912
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crew-photos',
  'crew-photos',
  true,
  12582912,
  array['image/jpeg', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists crew_photos_storage_read on storage.objects;
create policy crew_photos_storage_read
  on storage.objects for select to anon
  using (bucket_id = 'crew-photos');

drop policy if exists crew_photos_storage_insert on storage.objects;
create policy crew_photos_storage_insert
  on storage.objects for insert to anon
  with check (bucket_id = 'crew-photos');
