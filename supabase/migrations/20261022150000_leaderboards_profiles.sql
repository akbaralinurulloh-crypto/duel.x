-- Duel.X AI — migration 0006: leaderboards, public portfolio, profile privacy.
-- Scoring: for each COMPLETED challenge a person's best APPROVED evaluation,
-- as a percentage of the rubric maximum. Points = sum of those percentages.
-- Draft or unapproved evaluations and unfinished challenges never count.

-- ---------------------------------------------------------------------------
-- Close the known gap: signed-in users could read other people's
-- talent_discovery_consent / onboarding flags. They now get the same public
-- columns as anon; the owner reads their full row through get_my_profile().
-- ---------------------------------------------------------------------------
revoke select on public.profiles from authenticated;
grant select (id, username, display_name, avatar_path, bio,
              primary_category_id, is_public, created_at)
  on public.profiles to authenticated;

create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- Leaderboard. p_category_slug = null means all categories.
-- Rank is computed before private profiles are hidden, so ranks stay honest
-- (a gap means someone chose not to be shown).
-- ---------------------------------------------------------------------------
create or replace function public.category_leaderboard(
  p_category_slug text default null,
  p_limit integer default 50
)
returns table (
  rank bigint,
  username text,
  display_name text,
  completed_challenges integer,
  points numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with best as (
    select s.user_id,
           s.challenge_id,
           max(e.total / e.max_total * 100) as pct
      from public.evaluations e
      join public.submissions s on s.id = e.submission_id
      join public.challenges c on c.id = s.challenge_id
      join public.categories k on k.id = c.category_id
     where e.status = 'approved'
       and c.status = 'completed'
       and k.is_active
       and (p_category_slug is null or k.slug = p_category_slug)
     group by s.user_id, s.challenge_id
  ),
  agg as (
    select user_id,
           count(*)::integer as n,
           round(sum(pct), 1) as pts
      from best
     group by user_id
  ),
  ranked as (
    select user_id, n, pts,
           rank() over (order by pts desc, n desc) as rnk
      from agg
  )
  select r.rnk, p.username, p.display_name, r.n, r.pts
    from ranked r
    join public.profiles p on p.id = r.user_id
   where p.is_public
   order by r.rnk, p.username
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke execute on function public.category_leaderboard(text, integer) from public;
grant execute on function public.category_leaderboard(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public portfolio of a public profile: completed challenges with the best
-- approved score. Nothing about unfinished work or the submissions themselves.
-- ---------------------------------------------------------------------------
create or replace function public.public_portfolio(p_username text)
returns table (
  challenge_slug text,
  challenge_title text,
  category_slug text,
  category_name text,
  percent numeric,
  ended_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.slug, c.title, k.slug, k.name,
         round(max(e.total / e.max_total * 100), 1),
         c.ends_at
    from public.profiles p
    join public.submissions s on s.user_id = p.id
    join public.evaluations e on e.submission_id = s.id and e.status = 'approved'
    join public.challenges c on c.id = s.challenge_id and c.status = 'completed'
    join public.categories k on k.id = c.category_id and k.is_active
   where p.username = p_username
     and p.is_public
   group by c.id, c.slug, c.title, k.slug, k.name, c.ends_at
   order by c.ends_at desc;
$$;

revoke execute on function public.public_portfolio(text) from public;
grant execute on function public.public_portfolio(text) to anon, authenticated;
