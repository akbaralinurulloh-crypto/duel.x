# Duel.X AI

International AI-skill competition platform: challenges, private versioned
submissions, rubric-based evaluation with human approval, category
leaderboards, public skill profiles, and an admin panel.

Stack: Next.js 16 (App Router, Cache Components), TypeScript, Supabase
(Postgres, Auth, Storage, RLS), Vercel.

- Setup and deployment: [docs/SETUP.md](docs/SETUP.md)
- What is and is not verified: [docs/VERIFICATION.md](docs/VERIFICATION.md)
- Every button and what enforces it: [docs/BUTTON_AUDIT.md](docs/BUTTON_AUDIT.md)

```bash
npm install
npm run dev
npm run lint && npm run typecheck && npm test && npm run build
```

Security model in one line: the browser is never trusted. Every write goes
through row-level security or a security-definer function that re-checks the
caller; admin authority lives only in `public.admin_users`.
