# Button and link audit

Every interactive element, and what it does. "DB" = enforced by the database
regardless of the UI.

| Element | Where | Does | Enforced by |
| --- | --- | --- | --- |
| Browse challenges / Create account / For companies | Home | Navigate | - |
| Apply filters / Clear | /challenges | GET query filters (works without JS) | server validation of params |
| Previous / Next | /challenges | Page navigation | server validation |
| Join challenge | /challenges/[slug] | `join_challenge()` | DB: status, capacity, category active, idempotent |
| Submit (+ file) | /challenges/[slug] | Upload to private Storage, then `submit_solution()` | DB: participant, deadline, attempt limit, path ownership; Storage RLS |
| Attachment link | /challenges/[slug], admin | Short-lived signed URL | RLS: owner or admin |
| Sign up / Log in / Log out / Forgot / Reset | /register, /login, ... | Supabase Auth | Supabase Auth |
| Save profile | /dashboard/settings | Updates own profile | column grants + RLS |
| Send request | /companies | `submit_company_request()` | DB: validation, per-email limit |
| Leaderboard category tabs | /leaderboard | Navigation | - |
| Publish / Close / Start review / Complete / Cancel | /admin/challenges/[id] | Status update | DB trigger: allowed transitions; completion needs approved evaluations |
| Save challenge | /admin/challenges/[id] | Update draft/published | RLS admin-only |
| Save rubric version | /admin/challenges/[id] | Insert new rubric version | RLS admin-only + validation trigger |
| Save draft / Approve result | /admin/.../submissions | `evaluate_submission()` / `approve_evaluation()` | DB: is_admin(), rubric match, state |
| Mark contacted / Close / Reopen | /admin/requests | Updates status | RLS admin-only |
| Activate / Deactivate | /admin/categories | Updates category | RLS admin-only |
| Admin link | Header (admins only) | Navigate | page + DB re-check |
