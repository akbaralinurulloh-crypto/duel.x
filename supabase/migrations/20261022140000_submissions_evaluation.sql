-- Duel.X AI — migration 0004: audit log, submissions, rubrics, evaluations.
-- Every write goes through a security-definer function that re-checks who the
-- caller is and what state the challenge is in. Clients get SELECT only.

-- ---------------------------------------------------------------------------
-- audit_logs: append-only, readable by admins only, written by write_audit().
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references auth.users (id) on delete set null,
  action      text not null check (char_length(action) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 60),
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;

create policy audit_logs_admin_select
  on public.audit_logs for select
  to authenticated
  using (public.is_admin());

create or replace function public.write_audit(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;

revoke execute on function public.write_audit(text, text, uuid, jsonb)
  from public, anon, authenticated;

-- Generic row-change audit: records WHICH columns changed, never the values.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed text[];
  meta    jsonb;
  rid     uuid;
begin
  if tg_op = 'DELETE' then
    rid := (to_jsonb(old) ->> 'id')::uuid;
    perform public.write_audit(tg_table_name || '.delete', tg_table_name, rid, '{}'::jsonb);
    return old;
  end if;

  rid := (to_jsonb(new) ->> 'id')::uuid;
  if tg_op = 'INSERT' then
    perform public.write_audit(tg_table_name || '.insert', tg_table_name, rid, '{}'::jsonb);
    return new;
  end if;

  select coalesce(array_agg(n.key order by n.key), '{}')
    into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
   where n.value is distinct from o.value
     and n.key <> 'updated_at';

  if array_length(changed, 1) is null then
    return new;
  end if;

  meta := jsonb_build_object('changed', to_jsonb(changed));
  if to_jsonb(new) ? 'status' and to_jsonb(new) ->> 'status' is distinct from to_jsonb(old) ->> 'status' then
    meta := meta || jsonb_build_object(
      'from', to_jsonb(old) ->> 'status',
      'to', to_jsonb(new) ->> 'status'
    );
  end if;
  perform public.write_audit(tg_table_name || '.update', tg_table_name, rid, meta);
  return new;
end;
$$;

revoke execute on function public.audit_row_change() from public, anon, authenticated;

create trigger challenges_audit
  after insert or update or delete on public.challenges
  for each row execute function public.audit_row_change();

create trigger categories_audit
  after insert or update or delete on public.categories
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------------
-- challenges.max_submissions (attempt limit)
-- ---------------------------------------------------------------------------
alter table public.challenges
  add column max_submissions integer not null default 3
    check (max_submissions between 1 and 20);

-- ---------------------------------------------------------------------------
-- submissions: immutable, versioned. Created only by submit_solution().
-- ---------------------------------------------------------------------------
create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  version      integer not null check (version >= 1),
  content      text not null check (char_length(content) between 1 and 20000),
  file_path    text check (char_length(file_path) <= 300),
  file_name    text check (char_length(file_name) between 1 and 200),
  file_size    bigint check (file_size between 1 and 10485760),
  created_at   timestamptz not null default now(),
  unique (challenge_id, user_id, version),
  check ((file_path is null) = (file_name is null)
         and (file_path is null) = (file_size is null))
);

create index submissions_user_idx on public.submissions (user_id);

alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;
grant select on public.submissions to authenticated;

create policy submissions_select_own_or_admin
  on public.submissions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create or replace function public.submit_solution(
  p_challenge_id uuid,
  p_content text,
  p_file_path text default null,
  p_file_name text default null,
  p_file_size bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid        uuid := auth.uid();
  c          public.challenges%rowtype;
  part_id    uuid;
  body       text := btrim(coalesce(p_content, ''));
  next_ver   integer;
  new_id     uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if char_length(body) not between 1 and 20000 then
    raise exception 'invalid_content';
  end if;

  -- Serialise this user's submissions to this challenge.
  select p.id into part_id
    from public.challenge_participants p
   where p.challenge_id = p_challenge_id
     and p.user_id = uid
     and p.status <> 'withdrawn'
   for update;
  if not found then
    raise exception 'not_participant';
  end if;

  select * into c from public.challenges where id = p_challenge_id;
  if not found or c.status = 'draft' then
    raise exception 'challenge_not_found';
  end if;

  if c.status <> 'active' or now() < c.starts_at or now() >= c.ends_at then
    raise exception 'submissions_closed';
  end if;

  if p_file_path is not null then
    if p_file_name is null or p_file_size is null
       or left(p_file_path, char_length(uid::text) + char_length(c.id::text) + 2)
          <> uid::text || '/' || c.id::text || '/' then
      raise exception 'invalid_file';
    end if;
  elsif p_file_name is not null or p_file_size is not null then
    raise exception 'invalid_file';
  end if;

  select coalesce(max(s.version), 0) + 1 into next_ver
    from public.submissions s
   where s.challenge_id = c.id and s.user_id = uid;

  if next_ver > c.max_submissions then
    raise exception 'attempt_limit_reached';
  end if;

  insert into public.submissions
    (challenge_id, user_id, version, content, file_path, file_name, file_size)
  values
    (c.id, uid, next_ver, body, p_file_path, p_file_name, p_file_size)
  returning id into new_id;

  return jsonb_build_object('id', new_id, 'version', next_ver);
end;
$$;

revoke execute on function public.submit_solution(uuid, text, text, text, bigint)
  from public, anon;
grant execute on function public.submit_solution(uuid, text, text, text, bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- rubrics: versioned and immutable. A new version is a new row.
-- criteria = [{ "key": "clarity", "label": "Clarity", "max_points": 10 }, ...]
-- ---------------------------------------------------------------------------
create table public.rubrics (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  version      integer not null check (version >= 1),
  criteria     jsonb not null
                 check (jsonb_typeof(criteria) = 'array'
                        and jsonb_array_length(criteria) between 1 and 20),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (challenge_id, version)
);

create or replace function public.prepare_rubric()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  crit    jsonb;
  seen    text[] := '{}';
  k       text;
  mx      numeric;
begin
  for crit in select * from jsonb_array_elements(new.criteria) loop
    if jsonb_typeof(crit) <> 'object'
       or jsonb_typeof(crit -> 'key') is distinct from 'string'
       or jsonb_typeof(crit -> 'label') is distinct from 'string'
       or jsonb_typeof(crit -> 'max_points') is distinct from 'number' then
      raise exception 'invalid_rubric';
    end if;
    k := crit ->> 'key';
    mx := (crit ->> 'max_points')::numeric;
    if k !~ '^[a-z][a-z0-9_]{0,39}$' or k = any (seen)
       or char_length(crit ->> 'label') not between 1 and 80
       or mx <= 0 or mx > 1000 then
      raise exception 'invalid_rubric';
    end if;
    seen := seen || k;
  end loop;

  select coalesce(max(r.version), 0) + 1 into new.version
    from public.rubrics r where r.challenge_id = new.challenge_id;
  return new;
end;
$$;

create trigger rubrics_prepare
  before insert on public.rubrics
  for each row execute function public.prepare_rubric();

create trigger rubrics_audit
  after insert on public.rubrics
  for each row execute function public.audit_row_change();

alter table public.rubrics enable row level security;
revoke all on public.rubrics from anon, authenticated;
grant select on public.rubrics to anon, authenticated;
grant insert on public.rubrics to authenticated;

-- The sub-select runs under the caller's RLS, so drafts stay hidden.
create policy rubrics_select_visible
  on public.rubrics for select
  using (exists (select 1 from public.challenges c where c.id = challenge_id));

create policy rubrics_admin_insert
  on public.rubrics for insert
  to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- evaluations: written only by evaluate_submission() / approve_evaluation().
-- A participant sees their own APPROVED evaluation only after the challenge
-- is completed.
-- ---------------------------------------------------------------------------
create table public.evaluations (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions (id) on delete cascade,
  rubric_id     uuid not null references public.rubrics (id),
  scores        jsonb not null check (jsonb_typeof(scores) = 'object'),
  total         numeric(8, 2) not null check (total >= 0),
  max_total     numeric(8, 2) not null check (max_total > 0),
  feedback      text check (char_length(feedback) <= 5000),
  status        text not null default 'draft' check (status in ('draft', 'approved')),
  evaluated_by  uuid references auth.users (id) on delete set null,
  approved_by   uuid references auth.users (id) on delete set null,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (total <= max_total),
  check ((status = 'approved') = (approved_at is not null))
);

create trigger evaluations_set_updated_at
  before update on public.evaluations
  for each row execute function public.set_updated_at();

alter table public.evaluations enable row level security;
revoke all on public.evaluations from anon, authenticated;
grant select on public.evaluations to authenticated;

create policy evaluations_select_admin_or_released
  on public.evaluations for select
  to authenticated
  using (
    public.is_admin()
    or (
      status = 'approved'
      and exists (
        select 1
          from public.submissions s
          join public.challenges c on c.id = s.challenge_id
         where s.id = submission_id
           and s.user_id = auth.uid()
           and c.status = 'completed'
      )
    )
  );

create or replace function public.evaluate_submission(
  p_submission_id uuid,
  p_scores jsonb,
  p_feedback text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s        public.submissions%rowtype;
  c        public.challenges%rowtype;
  r        public.rubrics%rowtype;
  crit     jsonb;
  k        text;
  mx       numeric;
  v        numeric;
  total    numeric := 0;
  max_sum  numeric := 0;
  n        integer := 0;
  eval_id  uuid;
  existing public.evaluations%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  select * into s from public.submissions where id = p_submission_id;
  if not found then
    raise exception 'submission_not_found';
  end if;
  select * into c from public.challenges where id = s.challenge_id;
  if c.status not in ('closed', 'under_review') then
    raise exception 'challenge_not_evaluable';
  end if;

  select * into r from public.rubrics
   where challenge_id = c.id order by version desc limit 1;
  if not found then
    raise exception 'no_rubric';
  end if;

  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'invalid_scores';
  end if;

  for crit in select * from jsonb_array_elements(r.criteria) loop
    k := crit ->> 'key';
    mx := (crit ->> 'max_points')::numeric;
    if not (p_scores ? k) or jsonb_typeof(p_scores -> k) <> 'number' then
      raise exception 'invalid_scores';
    end if;
    v := (p_scores ->> k)::numeric;
    if v < 0 or v > mx then
      raise exception 'invalid_scores';
    end if;
    total := total + v;
    max_sum := max_sum + mx;
    n := n + 1;
  end loop;

  if (select count(*) from jsonb_object_keys(p_scores)) <> n then
    raise exception 'invalid_scores';
  end if;

  select * into existing from public.evaluations where submission_id = s.id;
  if found and existing.status = 'approved' then
    raise exception 'already_approved';
  end if;

  insert into public.evaluations
    (submission_id, rubric_id, scores, total, max_total, feedback, evaluated_by)
  values
    (s.id, r.id, p_scores, total, max_sum, nullif(btrim(p_feedback), ''), auth.uid())
  on conflict (submission_id) do update
    set rubric_id = excluded.rubric_id,
        scores = excluded.scores,
        total = excluded.total,
        max_total = excluded.max_total,
        feedback = excluded.feedback,
        evaluated_by = excluded.evaluated_by
  returning id into eval_id;

  perform public.write_audit('evaluation.save', 'evaluations', eval_id,
    jsonb_build_object('submission_id', s.id, 'total', total));
  return eval_id;
end;
$$;

revoke execute on function public.evaluate_submission(uuid, jsonb, text)
  from public, anon;
grant execute on function public.evaluate_submission(uuid, jsonb, text) to authenticated;

create or replace function public.approve_evaluation(p_evaluation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.evaluations%rowtype;
  st text;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  select * into e from public.evaluations where id = p_evaluation_id for update;
  if not found then
    raise exception 'evaluation_not_found';
  end if;
  if e.status = 'approved' then
    return;
  end if;

  select c.status into st
    from public.submissions s join public.challenges c on c.id = s.challenge_id
   where s.id = e.submission_id;
  if st not in ('closed', 'under_review') then
    raise exception 'challenge_not_evaluable';
  end if;

  update public.evaluations
     set status = 'approved', approved_by = auth.uid(), approved_at = now()
   where id = e.id;

  perform public.write_audit('evaluation.approve', 'evaluations', e.id,
    jsonb_build_object('submission_id', e.submission_id, 'total', e.total));
end;
$$;

revoke execute on function public.approve_evaluation(uuid) from public, anon;
grant execute on function public.approve_evaluation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- A challenge can only become 'completed' when every participant's latest
-- submission has an approved evaluation. Enforced in the status trigger so the
-- rule cannot be bypassed by a direct UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_challenge_status_transition()
returns trigger
language plpgsql
security definer
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

    if new.status = 'completed' and exists (
      select 1
        from (
          select distinct on (s.user_id) s.id
            from public.submissions s
           where s.challenge_id = new.id
           order by s.user_id, s.version desc
        ) latest
       where not exists (
         select 1 from public.evaluations e
          where e.submission_id = latest.id and e.status = 'approved'
       )
    ) then
      raise exception 'unevaluated_submissions';
    end if;
  end if;
  return new;
end;
$$;
