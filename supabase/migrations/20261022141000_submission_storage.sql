-- Duel.X AI — migration 0005: private Storage bucket for submission files.
-- Object path: <user_id>/<challenge_id>/<random>-<filename>
-- Upload is allowed only for a participant while the challenge is accepting
-- submissions. Objects are never updated or deleted by clients (versioning).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  10485760,
  array[
    'application/pdf', 'text/plain', 'text/markdown', 'text/csv',
    'application/json', 'application/zip', 'image/png', 'image/jpeg'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.submission_upload_allowed(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(p_name, '/');
  uid   uuid := auth.uid();
  cid   uuid;
begin
  if uid is null or array_length(parts, 1) <> 3 then
    return false;
  end if;
  if parts[1] <> uid::text
     or parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  cid := parts[2]::uuid;

  return exists (
    select 1
      from public.challenge_participants p
      join public.challenges c on c.id = p.challenge_id
     where p.challenge_id = cid
       and p.user_id = uid
       and p.status <> 'withdrawn'
       and c.status = 'active'
       and now() >= c.starts_at
       and now() < c.ends_at
  );
end;
$$;

revoke execute on function public.submission_upload_allowed(text) from public, anon;
grant execute on function public.submission_upload_allowed(text) to authenticated;

create policy submissions_bucket_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.submission_upload_allowed(name)
  );

create policy submissions_bucket_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'submissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
