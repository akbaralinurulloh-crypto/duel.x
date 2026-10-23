-- Duel.X AI — migration 0001: foundation
-- categories, profiles, admin_users, profile-creation trigger, RLS.
-- Admin authority lives ONLY in public.admin_users (never in a profile column).

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_users: who is an admin. No client-facing access at all.
-- Rows are added by a project owner via SQL editor / service role only.
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
-- No policies on purpose: with RLS on and no policy, clients see nothing.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;

-- anon needs EXECUTE too: the categories SELECT policy calls is_admin() for
-- every visitor. For a visitor with no session it simply returns false.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null check (char_length(name) between 1 and 80),
  description   text check (char_length(description) <= 500),
  icon          text,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;

revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

create policy categories_select_active_or_admin
  on public.categories for select
  using (is_active or public.is_admin());

create policy categories_admin_insert
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy categories_admin_update
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy categories_admin_delete
  on public.categories for delete
  to authenticated
  using (public.is_admin());

-- Initial categories (spec section 4). Reference data, not demo data.
insert into public.categories (slug, name, display_order) values
  ('prompt-engineering',  'Prompt Engineering',  1),
  ('ai-automation',       'AI Automation',       2),
  ('data-analysis',       'Data Analysis',       3),
  ('ai-content-creation', 'AI Content Creation', 4),
  ('ai-assisted-coding',  'AI-Assisted Coding',  5),
  ('ai-for-business',     'AI for Business',     6)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  username                 text not null unique
                             check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name             text not null
                             check (char_length(display_name) between 1 and 80),
  avatar_path              text,
  bio                      text check (char_length(bio) <= 500),
  primary_category_id      uuid references public.categories (id),
  onboarding_completed     boolean not null default false,
  is_public                boolean not null default true,
  talent_discovery_consent boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index profiles_primary_category_idx on public.profiles (primary_category_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;

-- Anonymous visitors only get the columns a public profile page needs.
grant select (id, username, display_name, avatar_path, bio,
              primary_category_id, is_public, created_at)
  on public.profiles to anon;

-- Signed-in users: full read (rows still filtered by RLS) ...
-- KNOWN LIMITATION: a signed-in user can read the consent/onboarding flags of
-- other PUBLIC profiles. To be closed with a dedicated public view in Phase 5.
grant select on public.profiles to authenticated;

-- ... and update only their own editable columns. id / created_at are not
-- grantable, so they can never be changed from the client.
grant update (username, display_name, avatar_path, bio, primary_category_id,
              onboarding_completed, is_public, talent_discovery_consent)
  on public.profiles to authenticated;

-- No INSERT or DELETE grants: profiles are created by the signup trigger and
-- removed only by cascade from auth.users.

create policy profiles_select_public_or_own
  on public.profiles for select
  using (is_public or id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and (
      primary_category_id is null
      or exists (
        select 1 from public.categories c
        where c.id = primary_category_id and c.is_active
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Signup: create the profile from auth metadata (server-side, untrusted input)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta           jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wanted         text  := lower(btrim(coalesce(meta ->> 'username', '')));
  fallback       text  := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  shown          text  := nullif(btrim(coalesce(meta ->> 'display_name', '')), '');
  final_username text;
  cat_id         uuid;
begin
  if wanted !~ '^[a-z0-9_]{3,30}$'
     or exists (select 1 from public.profiles p where p.username = wanted) then
    final_username := fallback;
  else
    final_username := wanted;
  end if;

  select c.id into cat_id
  from public.categories c
  where c.slug = meta ->> 'primary_category_slug' and c.is_active;

  insert into public.profiles (id, username, display_name, primary_category_id)
  values (new.id, final_username, left(coalesce(shown, final_username), 80), cat_id);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the register form tell people a username is taken before they submit.
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles p where p.username = lower(btrim(candidate))
  );
$$;

revoke execute on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;
