import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asSuperuser, asUser, createDb, inHours, signUp } from "./helpers";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const DAN = "44444444-4444-4444-8444-444444444444"; // private profile

let db: PGlite;
let n = 0;

async function challenge(category: string, status: string): Promise<string> {
  await asSuperuser(db);
  const cat = (
    await db.query<{ id: string }>("select id from public.categories where slug = $1", [category])
  ).rows[0].id;
  n += 1;
  return (
    await db.query<{ id: string }>(
      `insert into public.challenges (slug, category_id, title, difficulty, status, starts_at, ends_at, evaluation_method)
       values ($1, $2, $3, 'beginner', $4, $5, $6, 'rubric') returning id`,
      [`lb-${n}`, cat, `LB ${n}`, status, inHours(-48), inHours(-24)],
    )
  ).rows[0].id;
}

/** Fixture: a submission with an evaluation (superuser, bypasses the RPCs). */
async function scored(
  cid: string,
  uid: string,
  version: number,
  total: number,
  status: "draft" | "approved" = "approved",
) {
  await asSuperuser(db);
  const rubric =
    (await db.query<{ id: string }>("select id from public.rubrics where challenge_id = $1", [cid])).rows[0]?.id ??
    (
      await db.query<{ id: string }>(
        `insert into public.rubrics (challenge_id, criteria) values ($1, '[{"key":"a","label":"A","max_points":100}]'::jsonb) returning id`,
        [cid],
      )
    ).rows[0].id;
  const sid = (
    await db.query<{ id: string }>(
      "insert into public.submissions (challenge_id, user_id, version, content) values ($1,$2,$3,'x') returning id",
      [cid, uid, version],
    )
  ).rows[0].id;
  await db.query(
    `insert into public.evaluations (submission_id, rubric_id, scores, total, max_total, status, approved_at)
     values ($1, $2, '{}'::jsonb, $3, 100, $4, case when $4 = 'approved' then now() end)`,
    [sid, rubric, total, status],
  );
}

const board = (slug: string | null = null) =>
  db.query<{ rank: string; username: string; completed_challenges: number; points: string }>(
    "select * from public.category_leaderboard($1)",
    [slug],
  );

beforeAll(async () => {
  db = await createDb();
  await signUp(db, ALICE, { username: "alice_x", display_name: "Alice" });
  await signUp(db, BOB, { username: "bob_b", display_name: "Bob" });
  await signUp(db, DAN, { username: "dan_hidden", display_name: "Dan" });
  await asSuperuser(db);
  await db.query("update public.profiles set is_public = false where id = $1", [DAN]);

  const c1 = await challenge("ai-automation", "completed");
  const c2 = await challenge("ai-automation", "completed");
  const open = await challenge("ai-automation", "closed");
  const other = await challenge("data-analysis", "completed");

  // Alice: best of two attempts counts (60 then 90), plus 50 on c2 => 140, 2 challenges.
  await scored(c1, ALICE, 1, 60);
  await scored(c1, ALICE, 2, 90);
  await scored(c2, ALICE, 1, 50);
  // Bob: 80 on c1 => 80. A draft evaluation on c2 must not count.
  await scored(c1, BOB, 1, 80);
  await scored(c2, BOB, 1, 100, "draft");
  // Dan is the top scorer but private.
  await scored(c1, DAN, 1, 100);
  await scored(c2, DAN, 1, 100);
  // Unfinished challenge never counts.
  await scored(open, BOB, 1, 100);
  // Different category.
  await scored(other, BOB, 1, 70);
});

afterAll(async () => {
  await db.close();
});

describe("category_leaderboard()", () => {
  it("uses best approved score per completed challenge and hides private profiles", async () => {
    await asAnon(db);
    const { rows } = await board("ai-automation");
    expect(rows.map((r) => [r.username, Number(r.points), r.completed_challenges])).toEqual([
      ["alice_x", 140, 2],
      ["bob_b", 80, 1],
    ]);
  });

  it("keeps honest ranks when a private profile outranks everyone", async () => {
    await asAnon(db);
    const { rows } = await board("ai-automation");
    // Dan (200 points, hidden) holds rank 1, so Alice is rank 2 and Bob rank 3.
    expect(rows.map((r) => Number(r.rank))).toEqual([2, 3]);
  });

  it("filters by category and supports all categories", async () => {
    await asAnon(db);
    expect((await board("data-analysis")).rows.map((r) => r.username)).toEqual(["bob_b"]);
    const all = await board(null);
    expect(all.rows.find((r) => r.username === "bob_b")).toMatchObject({ completed_challenges: 2 });
    expect((await board("no-such-category")).rows).toHaveLength(0);
  });

  it("is callable by signed-in users too", async () => {
    await asUser(db, ALICE);
    expect((await board("ai-automation")).rows.length).toBeGreaterThan(0);
  });
});

describe("public_portfolio()", () => {
  const portfolio = (u: string) =>
    db.query<{ challenge_title: string; percent: string }>(
      "select challenge_title, percent from public.public_portfolio($1)",
      [u],
    );

  it("lists completed challenges with the best approved score", async () => {
    await asAnon(db);
    const { rows } = await portfolio("alice_x");
    expect(rows.map((r) => Number(r.percent)).sort((a, b) => a - b)).toEqual([50, 90]);
  });

  it("returns nothing for private profiles or unknown users", async () => {
    await asAnon(db);
    expect((await portfolio("dan_hidden")).rows).toHaveLength(0);
    expect((await portfolio("nobody")).rows).toHaveLength(0);
  });
});

describe("profile privacy", () => {
  it("signed-in users can no longer read other people's consent flag", async () => {
    await asUser(db, ALICE);
    await expect(db.query("select talent_discovery_consent from public.profiles")).rejects.toThrow(
      /permission denied/,
    );
    const { rows } = await db.query("select username, bio from public.profiles where id = $1", [BOB]);
    expect(rows).toHaveLength(1);
  });

  it("get_my_profile() returns only the caller's full row", async () => {
    await asUser(db, ALICE);
    await db.query("update public.profiles set talent_discovery_consent = true where id = $1", [ALICE]);
    const { rows } = await db.query<{ id: string; talent_discovery_consent: boolean }>(
      "select * from public.get_my_profile()",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: ALICE, talent_discovery_consent: true });
    await asAnon(db);
    await expect(db.query("select * from public.get_my_profile()")).rejects.toThrow(/permission denied/);
  });

  it("owners can still update their profile and read it back", async () => {
    await asUser(db, BOB);
    const { rows } = await db.query(
      "update public.profiles set bio = 'hello' where id = $1 returning id",
      [BOB],
    );
    expect(rows).toHaveLength(1);
  });
});
