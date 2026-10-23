# Duel.X AI — setup

Status: the whole site is built (auth, challenges, submissions, evaluation,
leaderboards, public profiles, admin panel, company requests). Nothing below has
been run against a real Supabase project yet; the database logic is tested only
in an isolated local Postgres (see docs/VERIFICATION.md).

## 1. Supabase project

1. Create a Supabase project.
2. Apply `supabase/migrations/*.sql` in filename order (SQL editor, or the
   Supabase CLI: `supabase db push`). There are 9 files; the Storage bucket
   `submissions` (private) and its policies are created by
   `20261022141000_submission_storage.sql`.
3. Auth → URL Configuration:
   - Site URL: your production origin.
   - Redirect URLs: add `<origin>/auth/callback` for production, each preview
     origin, and `http://localhost:3000/auth/callback` for local work.
4. Auth → Providers → Email: decide whether "Confirm email" is on. Both work:
   with it on, sign-up shows "check your inbox"; with it off, sign-up signs in
   immediately.
5. Auth → SMTP: configure your own SMTP provider before real users arrive; the
   built-in sender is heavily rate-limited.

## 2. Environment

Copy `.env.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon / publishable key)
- `NEXT_PUBLIC_SITE_URL` (optional)

`NEXT_PUBLIC_SITE_URL` also feeds the sitemap and metadata: set it in
production (the sitemap stays empty without it).

`NEXT_PUBLIC_*` values are inlined at build time, so set them in Vercel for
every environment **before** building. Never put the service-role key in any
`NEXT_PUBLIC_*` variable.

## 3. First admin

Admins live only in `public.admin_users`; there is no role column a user could
edit. After the person has signed up, run as project owner in the SQL editor:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'admin@example.com';
```

## 4. Commands

```bash
npm run dev        # local development
npm run lint
npm run typecheck
npm test           # unit tests + RLS tests (isolated PGlite)
npm run build
```

## 5. First content

No challenges are seeded on purpose (no fake data). After the first admin
exists: Admin -> Challenges -> New challenge (saved as a draft) -> add a rubric
-> Publish. Participants then join, submit, and you evaluate after it closes:
Start review -> score each submission -> Approve -> Complete.

## 6. Vercel

Import the repository, set the environment variables from section 2 for
Production and Preview, and deploy. Submission files go from the browser
straight to Supabase Storage, so Vercel's request-body limit does not apply to
them.

## Known limitations

- A file uploaded to Storage whose submission then fails (for example, the
  deadline passes between the two steps) stays in the private bucket as an
  orphan. Clients cannot delete objects by design; clean up with the service
  role in a scheduled job later.
- Challenge status moves with the clock when pages load (and inside
  `join_challenge` / `submit_solution`). A scheduled job is not needed for
  correctness, only for tidiness of the admin lists.
- No app-level rate limiting beyond Supabase Auth and a per-email limit on
  company requests. Add edge/WAF limits in production.
- Usernames cannot be changed after sign-up.
- No dynamic Open Graph image and no per-challenge metadata yet.
- Pages show a 200 status even when they stream a not-found/redirect result
  (Partial Prerendering sends the shell first). The content is correct.
