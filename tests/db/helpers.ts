import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Isolated local Postgres (PGlite) + the test-only auth mock + ALL migrations
// in order. This exercises our SQL and RLS; it does not prove real Supabase
// behaviour.

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(resolve("tests/db/auth-mock.sql"), "utf8"));
  const dir = resolve("supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(resolve(dir, file), "utf8"));
  }
  return db;
}

export async function asSuperuser(db: PGlite) {
  await db.exec("reset role");
}

export async function asAnon(db: PGlite) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await db.exec("set role anon");
}

export async function asUser(db: PGlite, uid: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  await db.exec("set role authenticated");
}

export async function signUp(
  db: PGlite,
  id: string,
  meta: Record<string, unknown>,
) {
  await asSuperuser(db);
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)",
    [id, `${id.slice(0, 4)}@example.test`, JSON.stringify(meta)],
  );
}

export function inHours(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}
