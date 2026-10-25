-- Duel.X AI — migration 0010: AI-written personal briefs and AI-drafted evaluations.
-- AI never decides alone: its scores are saved as DRAFT evaluations (source = 'ai')
-- that an admin approves. Only the server (service_role) may call the ai_* functions.

alter table public.challenges
  add column if not exists ai_brief_guide text
    check (ai_brief_guide is null or char_length(ai_brief_guide) <= 4000);

alter table public.challenge_participants
  add column if not exists brief text check (brief is null or char_length(brief) <= 8000),
  add column if not exists brief_at timestamptz;

alter table public.evaluations
  add column if not exists source text not null default 'human'
    check (source in ('human', 'ai'));

create or replace function public.ai_save_brief(
  p_challenge_id uuid, p_user_id uuid, p_brief text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if p_brief is null or char_length(btrim(p_brief)) not between 1 and 8000 then
    raise exception 'invalid_brief';
  end if;
  -- A brief is given once; it is never re-rolled.
  update public.challenge_participants
     set brief = btrim(p_brief), brief_at = now()
   where challenge_id = p_challenge_id and user_id = p_user_id
     and status <> 'withdrawn' and brief is null;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

create or replace function public.ai_save_evaluation(
  p_submission_id uuid, p_scores jsonb, p_feedback text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.submissions%rowtype;
  r public.rubrics%rowtype;
  crit jsonb; k text; mx numeric; v numeric;
  total numeric := 0; max_sum numeric := 0; n integer := 0;
  existing public.evaluations%rowtype;
  eval_id uuid;
begin
  select * into s from public.submissions where id = p_submission_id;
  if not found then raise exception 'submission_not_found'; end if;
  select * into r from public.rubrics where challenge_id = s.challenge_id
   order by version desc limit 1;
  if not found then raise exception 'no_rubric'; end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then
    raise exception 'invalid_scores';
  end if;
  for crit in select * from jsonb_array_elements(r.criteria) loop
    k := crit ->> 'key'; mx := (crit ->> 'max_points')::numeric;
    if not (p_scores ? k) or jsonb_typeof(p_scores -> k) <> 'number' then
      raise exception 'invalid_scores';
    end if;
    v := (p_scores ->> k)::numeric;
    if v < 0 or v > mx then raise exception 'invalid_scores'; end if;
    total := total + v; max_sum := max_sum + mx; n := n + 1;
  end loop;
  if (select count(*) from jsonb_object_keys(p_scores)) <> n then
    raise exception 'invalid_scores';
  end if;

  select * into existing from public.evaluations where submission_id = s.id;
  if found and (existing.status = 'approved' or existing.source = 'human') then
    return existing.id;  -- never overwrite an approved or human-written evaluation
  end if;

  insert into public.evaluations
    (submission_id, rubric_id, scores, total, max_total, feedback, source)
  values
    (s.id, r.id, p_scores, total, max_sum, nullif(btrim(p_feedback), ''), 'ai')
  on conflict (submission_id) do update
    set rubric_id = excluded.rubric_id, scores = excluded.scores,
        total = excluded.total, max_total = excluded.max_total,
        feedback = excluded.feedback
  returning id into eval_id;
  return eval_id;
end;
$$;

revoke all on function public.ai_save_brief(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.ai_save_evaluation(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.ai_save_brief(uuid, uuid, text) to service_role;
grant execute on function public.ai_save_evaluation(uuid, jsonb, text) to service_role;
