-- Duel.X AI — migration 0002: challenges and participation
-- challenges, challenge_participants, status-transition rules, lazy status
-- sync, join_challenge() RPC, RLS.
-- Joining NEVER looks at the user's primary category (spec 4.2).

-- ---------------------------------------------------------------------------
-- challenges
-- ---------------------------------------------------------------------------
create table public.challenges (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                             and char_length(slug) <= 100),
  category_id       uuid not null references public.categories (id),
  title             text not null check (char_length(title) between 1 and 160),
  summary           text check (char_length(summary) <= 300),
  description       text check (char_length(description) <= 20000),
  -- Ordered list of instruction steps (array of strings).
  instructions      jsonb not null default '[]'::jsonb
                      check (jsonb_typeof(instructions) = 'array'),
  difficulty        text not null
                      check (difficulty in ('beginner', 'intermediate', 'advanced')),
  status            text not null default 'draft'
                      check (status in ('draft', 'published', 'active', 'closed',
                                        'under_review', 'completed', 'cancelled')),
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  max_participants  integer check (max_participants is null or max_participants > 0),
  evaluation_method text not null
                      check (evaluation_method in ('automated', 'rubric', 'hybrid')),
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index challenges_category_status_idx
  on public.challenges (category_id, status, starts_at desc);
create index challenges_status_idx on public.challenges (status);

create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute function public.set_updated_at();

-- Allowed status transitions (spec 10.1). completed and cancelled are final.
create or replace function public.enforce_challenge_status_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft'        and new.status in ('published', 'cancelled')) or
      (old.status = 'published'    and new.status in ('active', 'cancelled')) or
      (old.status = 'active'       and new.status in ('closed', 'cancelled')) or
      (old.status = 'closed'       and new.status in ('under_review', 'cancelled')) or
      (old.status = 'under_review' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'invalid_status_transition: % -> %', old.status, new.status;
    end if;

    if old.status = 'draft' and new.status = 'published' then
      new.published_at := coalesce(new.published_at, now());
    end if;
  end if;
  return new;
end;
$$;

create trigger challenges_status_transition
  before update on public.challenges
  for each row execute function public.enforce_challenge_status_transition();

alter table public.challenges enable row level security;

revoke all on public.challenges from anon, authenticated;
grant select on public.challenges to anon, authenticated;
grant insert, update, delete on public.challenges to authenticated;

create policy challenges_select_visible
  on public.challenges for select
  using (status <> 'draft' or public.is_admin());

create policy challenges_admin_insert
  on public.challenges for insert
  to authenticated
  with check (public.is_admin());

create policy challenges_admin_update
  on public.challenges for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Only drafts can be deleted; anything public is cancelled, never erased.
create policy challenges_admin_delete_draft
  on public.challenges for delete
  to authenticated
  using (public.is_admin() and status = 'draft');

-- ---------------------------------------------------------------------------
-- challenge_participants
-- ---------------------------------------------------------------------------
create table public.challenge_participants (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'joined'
                 check (status in ('joined', 'completed', 'withdrawn')),
  joined_at    timestamptz not null default now(),
  completed_at timestamptz,
  unique (challenge_id, user_id)
);

create index challenge_participants_user_idx
  on public.challenge_participants (user_id);

alter table public.challenge_participants enable row level security;

revoke all on public.challenge_participants from anon, authenticated;
grant select on public.challenge_participants to authenticated;
-- No INSERT/UPDATE/DELETE grants: rows are created only by join_challenge().

create policy participants_select_own_or_admin
  on public.challenge_participants for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Status sync driven by the clock (published -> active -> closed).
-- Idempotent. Called on page loads now, by a scheduled job later.
-- ---------------------------------------------------------------------------
create or replace function public.sync_challenge_statuses()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.challenges
     set status = 'active'
   where status = 'published' and starts_at <= now();

  update public.challenges
     set status = 'closed'
   where status = 'active' and ends_at <= now();
$$;

revoke execute on function public.sync_challenge_statuses() from public;
grant execute on function public.sync_challenge_statuses() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- join_challenge(): the only way to create a participation row.
-- Locks the challenge row, so the capacity check cannot be raced.
-- Raises machine-readable messages the app maps to friendly text.
-- ---------------------------------------------------------------------------
create or replace function public.join_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid           uuid := auth.uid();
  c             public.challenges%rowtype;
  cat_active    boolean;
  taken         integer;
  inserted_id   uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into c from public.challenges where id = p_challenge_id for update;
  if not found or c.status = 'draft' then
    raise exception 'challenge_not_found';
  end if;

  -- Bring this one row up to date with the clock before deciding.
  if c.status = 'published' and c.starts_at <= now() then
    update public.challenges set status = 'active' where id = c.id;
    c.status := 'active';
  end if;
  if c.status = 'active' and c.ends_at <= now() then
    update public.challenges set status = 'closed' where id = c.id;
    c.status := 'closed';
  end if;

  -- Repeat requests are harmless, even after the challenge has closed.
  if exists (
    select 1 from public.challenge_participants
     where challenge_id = c.id and user_id = uid
  ) then
    return jsonb_build_object('joined', true, 'already_joined', true);
  end if;

  if c.status <> 'active' then
    raise exception 'challenge_not_open';
  end if;

  select k.is_active into cat_active
    from public.categories k where k.id = c.category_id;
  if not coalesce(cat_active, false) then
    raise exception 'category_inactive';
  end if;

  if c.max_participants is not null then
    select count(*) into taken
      from public.challenge_participants
     where challenge_id = c.id and status <> 'withdrawn';
    if taken >= c.max_participants then
      raise exception 'challenge_full';
    end if;
  end if;

  insert into public.challenge_participants (challenge_id, user_id)
  values (c.id, uid)
  on conflict (challenge_id, user_id) do nothing
  returning id into inserted_id;

  return jsonb_build_object('joined', true, 'already_joined', inserted_id is null);
end;
$$;

revoke execute on function public.join_challenge(uuid) from public, anon;
grant execute on function public.join_challenge(uuid) to authenticated;

-- Public participant count (participation rows themselves stay private).
create or replace function public.challenge_participant_count(p_challenge_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.challenge_participants p
    join public.challenges c on c.id = p.challenge_id
   where p.challenge_id = p_challenge_id
     and p.status <> 'withdrawn'
     and c.status <> 'draft';
$$;

revoke execute on function public.challenge_participant_count(uuid) from public;
grant execute on function public.challenge_participant_count(uuid) to anon, authenticated;
