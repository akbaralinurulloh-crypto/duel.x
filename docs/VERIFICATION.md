# What is verified, and what is not

## Verified locally

| Check | How |
| --- | --- |
| Lint, strict TypeScript | `npm run lint`, `npm run typecheck` |
| Pure logic (validation, parsing, error mapping, redirects, challenge helpers) | Vitest unit tests |
| Database rules: RLS, grants, status transitions, join/submit/evaluate/approve functions, leaderboard scoring, privacy, audit log, company requests, storage policies | Vitest against an isolated Postgres (PGlite) with test-only mocks of `auth` and `storage` |
| Production build | `npm run build` |
| Routes behave with Supabase missing and with Supabase unreachable | `next start` + curl, dummy env values |

## NOT verified until real keys are connected

- Real sign-up, login, confirmation and reset emails, session refresh.
- The policies and functions running inside real Supabase (the mocks are not
  Supabase; real `storage.objects` behaviour in particular).
- Browser file upload to Storage, signed download links.
- Visual and mobile checks in a browser; accessibility audit with a tool.
- End-to-end flow (sign up -> join -> submit -> evaluate -> leaderboard).
- Vercel deployment and environment configuration.

Run through the flow in `docs/SETUP.md` section 5 once Supabase is connected
and record the result here.
