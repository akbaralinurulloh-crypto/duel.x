import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asSuperuser, asUser, createDb, inHours, signUp } from "./helpers";

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const CAROL_ADMIN = "33333333-3333-4333-8333-333333333333";

let db: PGlite;
let n = 0;

async function makeChallenge(
  o: Partial<{ status: string; startsAt: string; endsAt: string; maxSubs: number }> = {},
): Promise<string> {
  await asSuperuser(db);
  const cat = (
    await db.query<{ id: string }>("select id from public.categories where slug = 'ai-automation'")
  ).rows[0].id;
  n += 1;
  const { rows } = await db.query<{ id: string }>(
    `insert into public.challenges
       (slug, category_id, title, difficulty, status, starts_at, ends_at,
        evaluation_method, max_submissions)
     values ($1, $2, $3, 'beginner', $4, $5, $6, 'rubric', $7) returning id`,
    [
      `sub-fixture-${n}`,
      cat,
      `Sub fixture ${n}`,
      o.status ?? "active",
      o.startsAt ?? inHours(-1),
      o.endsAt ?? inHours(24),
      o.maxSubs ?? 3,
    ],
  );
  return rows[0].id;
}

async function join(uid: string, challengeId: string) {
  await asUser(db, uid);
  await db.query("select public.join_challenge($1)", [challengeId]);
}

const submit = (cid: string, content = "my answer", file?: [string, string, number]) =>
  db.query<{ submit_solution: { id: string; version: number } }>(
    "select public.submit_solution($1, $2, $3, $4, $5)",
    [cid, content, file?.[0] ?? null, file?.[1] ?? null, file?.[2] ?? null],
  );

async function setStatus(id: string, status: string) {
  await asSuperuser(db);
  await db.query("update public.challenges set status = $2 where id = $1", [id, status]);
}

const CRITERIA = JSON.stringify([
  { key: "clarity", label: "Clarity", max_points: 10 },
  { key: "result", label: "Result", max_points: 20 },
]);

async function addRubric(cid: string) {
  await asUser(db, CAROL_ADMIN);
  await db.query("insert into public.rubrics (challenge_id, criteria) values ($1, $2::jsonb)", [
    cid,
    CRITERIA,
  ]);
}

beforeAll(async () => {
  db = await createDb();
  await signUp(db, ALICE, { username: "alice_x", display_name: "Alice" });
  await signUp(db, BOB, { username: "bob_b", display_name: "Bob" });
  await signUp(db, CAROL_ADMIN, { username: "carol_admin", display_name: "Carol" });
  await asSuperuser(db);
  await db.query("insert into public.admin_users (user_id) values ($1)", [CAROL_ADMIN]);
});

afterAll(async () => {
  await db.close();
});

describe("submit_solution()", () => {
  it("rejects anonymous callers and non-participants", async () => {
    const cid = await makeChallenge();
    await asAnon(db);
    await expect(submit(cid)).rejects.toThrow(/permission denied/);
    await asUser(db, ALICE);
    await expect(submit(cid)).rejects.toThrow(/not_participant/);
  });

  it("versions submissions and enforces the attempt limit", async () => {
    const cid = await makeChallenge({ maxSubs: 2 });
    await join(ALICE, cid);
    await asUser(db, ALICE);
    expect((await submit(cid, "first")).rows[0].submit_solution.version).toBe(1);
    expect((await submit(cid, "second")).rows[0].submit_solution.version).toBe(2);
    await expect(submit(cid, "third")).rejects.toThrow(/attempt_limit_reached/);
  });

  it("rejects empty and oversized content", async () => {
    const cid = await makeChallenge();
    await join(ALICE, cid);
    await asUser(db, ALICE);
    await expect(submit(cid, "   ")).rejects.toThrow(/invalid_content/);
    await expect(submit(cid, "x".repeat(20001))).rejects.toThrow(/invalid_content/);
  });

  it("is closed after the deadline or when the challenge is not active", async () => {
    const late = await makeChallenge();
    await join(ALICE, late);
    await asSuperuser(db);
    await db.query("update public.challenges set ends_at = now() - interval '1 minute', starts_at = now() - interval '2 hours' where id = $1", [late]);
    await asUser(db, ALICE);
    await expect(submit(late)).rejects.toThrow(/submissions_closed/);

    const closed = await makeChallenge();
    await join(ALICE, closed);
    await setStatus(closed, "closed");
    await asUser(db, ALICE);
    await expect(submit(closed)).rejects.toThrow(/submissions_closed/);
  });

  it("only accepts a file path inside the caller's own folder for this challenge", async () => {
    const cid = await makeChallenge();
    const other = await makeChallenge();
    await join(ALICE, cid);
    await asUser(db, ALICE);
    await expect(submit(cid, "x", [`${BOB}/${cid}/a.pdf`, "a.pdf", 10])).rejects.toThrow(
      /invalid_file/,
    );
    await expect(submit(cid, "x", [`${ALICE}/${other}/a.pdf`, "a.pdf", 10])).rejects.toThrow(
      /invalid_file/,
    );
    const ok = await submit(cid, "x", [`${ALICE}/${cid}/r1-a.pdf`, "a.pdf", 10]);
    expect(ok.rows[0].submit_solution.version).toBe(1);
  });
});

describe("submission privacy and immutability", () => {
  it("users see only their own submissions; admins see all; nobody edits", async () => {
    const cid = await makeChallenge();
    await join(ALICE, cid);
    await join(BOB, cid);
    await asUser(db, ALICE);
    await submit(cid, "alice secret");
    await asUser(db, BOB);
    await submit(cid, "bob secret");

    const read = async () =>
      (await db.query<{ content: string }>("select content from public.submissions where challenge_id = $1", [cid])).rows.map((r) => r.content);

    await asUser(db, ALICE);
    expect(await read()).toEqual(["alice secret"]);
    await asAnon(db);
    await expect(read()).rejects.toThrow(/permission denied/);
    await asUser(db, CAROL_ADMIN);
    expect((await read()).sort()).toEqual(["alice secret", "bob secret"]);

    await asUser(db, ALICE);
    await expect(
      db.query("update public.submissions set content = 'edited' where challenge_id = $1", [cid]),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.submissions where challenge_id = $1", [cid])).rejects.toThrow(/permission denied/);
    await expect(
      db.query(
        "insert into public.submissions (challenge_id, user_id, version, content) values ($1, $2, 99, 'x')",
        [cid, ALICE],
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("private submission storage", () => {
  const put = (name: string) =>
    db.query("insert into storage.objects (bucket_id, name) values ('submissions', $1)", [name]);

  it("bucket is private", async () => {
    await asSuperuser(db);
    const { rows } = await db.query<{ public: boolean }>(
      "select public from storage.buckets where id = 'submissions'",
    );
    expect(rows[0].public).toBe(false);
  });

  it("allows uploads only to own folder, for a joined, open challenge", async () => {
    const cid = await makeChallenge();
    const notJoined = await makeChallenge();
    await join(ALICE, cid);

    await asUser(db, ALICE);
    await put(`${ALICE}/${cid}/ok.pdf`);
    await expect(put(`${BOB}/${cid}/x.pdf`)).rejects.toThrow(/row-level security/);
    await expect(put(`${ALICE}/${notJoined}/x.pdf`)).rejects.toThrow(/row-level security/);
    await expect(put(`${ALICE}/not-a-uuid/x.pdf`)).rejects.toThrow(/row-level security/);
    await expect(put(`${ALICE}/${cid}/deep/x.pdf`)).rejects.toThrow(/row-level security/);

    await setStatus(cid, "closed");
    await asUser(db, ALICE);
    await expect(put(`${ALICE}/${cid}/late.pdf`)).rejects.toThrow(/row-level security/);
  });

  it("hides files from other users, shows them to admins, blocks edits", async () => {
    const cid = await makeChallenge();
    await join(ALICE, cid);
    await asUser(db, ALICE);
    await put(`${ALICE}/${cid}/mine.pdf`);

    const names = async () =>
      (await db.query<{ name: string }>("select name from storage.objects where bucket_id = 'submissions'")).rows.map((r) => r.name);

    await asUser(db, ALICE);
    expect(await names()).toContain(`${ALICE}/${cid}/mine.pdf`);
    await asUser(db, BOB);
    expect(await names()).not.toContain(`${ALICE}/${cid}/mine.pdf`);
    await asUser(db, CAROL_ADMIN);
    expect(await names()).toContain(`${ALICE}/${cid}/mine.pdf`);

    await asUser(db, ALICE);
    await expect(db.query("delete from storage.objects where name = $1", [`${ALICE}/${cid}/mine.pdf`])).rejects.toThrow(/permission denied/);
  });
});

describe("rubrics", () => {
  it("are admin-written, versioned, validated and visible for public challenges", async () => {
    const cid = await makeChallenge();
    await asUser(db, ALICE);
    await expect(
      db.query("insert into public.rubrics (challenge_id, criteria) values ($1, $2::jsonb)", [cid, CRITERIA]),
    ).rejects.toThrow(/row-level security/);

    await addRubric(cid);
    await addRubric(cid);
    await asAnon(db);
    const { rows } = await db.query<{ version: number }>(
      "select version from public.rubrics where challenge_id = $1 order by version",
      [cid],
    );
    expect(rows.map((r) => r.version)).toEqual([1, 2]);

    await asUser(db, CAROL_ADMIN);
    for (const bad of [
      "[]",
      '[{"key":"a","label":"A","max_points":0}]',
      '[{"key":"Bad Key","label":"A","max_points":5}]',
      '[{"key":"a","label":"A","max_points":5},{"key":"a","label":"B","max_points":5}]',
      '[{"key":"a","label":"A","max_points":"5"}]',
    ]) {
      await expect(
        db.query("insert into public.rubrics (challenge_id, criteria) values ($1, $2::jsonb)", [cid, bad]),
      ).rejects.toThrow(/invalid_rubric|check constraint/);
    }

    await expect(db.query("update public.rubrics set version = 9")).rejects.toThrow(/permission denied/);
  });

  it("are hidden while the challenge is a draft", async () => {
    const draft = await makeChallenge({ status: "draft" });
    await addRubric(draft);
    await asAnon(db);
    expect((await db.query("select 1 from public.rubrics where challenge_id = $1", [draft])).rows).toHaveLength(0);
    await asUser(db, CAROL_ADMIN);
    expect((await db.query("select 1 from public.rubrics where challenge_id = $1", [draft])).rows).toHaveLength(1);
  });
});

describe("evaluation lifecycle", () => {
  async function scenario() {
    const cid = await makeChallenge();
    await join(ALICE, cid);
    await join(BOB, cid);
    await asUser(db, ALICE);
    const a = (await submit(cid, "alice")).rows[0].submit_solution.id;
    await asUser(db, BOB);
    const b = (await submit(cid, "bob")).rows[0].submit_solution.id;
    return { cid, a, b };
  }

  const evaluate = (sid: string, scores: object) =>
    db.query<{ evaluate_submission: string }>("select public.evaluate_submission($1, $2::jsonb, 'ok')", [
      sid,
      JSON.stringify(scores),
    ]);

  it("only admins evaluate, only after the challenge closes, only with a valid rubric score", async () => {
    const { cid, a } = await scenario();
    await asUser(db, ALICE);
    await expect(evaluate(a, { clarity: 1, result: 1 })).rejects.toThrow(/not_admin/);

    await asUser(db, CAROL_ADMIN);
    await expect(evaluate(a, { clarity: 1, result: 1 })).rejects.toThrow(/challenge_not_evaluable/);

    await setStatus(cid, "closed");
    await asUser(db, CAROL_ADMIN);
    await expect(evaluate(a, { clarity: 1, result: 1 })).rejects.toThrow(/no_rubric/);

    await addRubric(cid);
    await asUser(db, CAROL_ADMIN);
    await expect(evaluate(a, { clarity: 1 })).rejects.toThrow(/invalid_scores/);
    await expect(evaluate(a, { clarity: 11, result: 1 })).rejects.toThrow(/invalid_scores/);
    await expect(evaluate(a, { clarity: -1, result: 1 })).rejects.toThrow(/invalid_scores/);
    await expect(evaluate(a, { clarity: 1, result: 1, extra: 1 })).rejects.toThrow(/invalid_scores/);
    await expect(evaluate(a, { clarity: "5", result: 1 })).rejects.toThrow(/invalid_scores/);
    const ok = await evaluate(a, { clarity: 8, result: 15 });
    expect(ok.rows[0].evaluate_submission).toBeTruthy();

    const { rows } = await db.query<{ total: string; max_total: string; status: string }>(
      "select total, max_total, status from public.evaluations where submission_id = $1",
      [a],
    );
    expect(Number(rows[0].total)).toBe(23);
    expect(Number(rows[0].max_total)).toBe(30);
    expect(rows[0].status).toBe("draft");
  });

  it("keeps results private until the challenge is completed, and blocks completion until all are approved", async () => {
    const { cid, a, b } = await scenario();
    await setStatus(cid, "closed");
    await addRubric(cid);

    await asUser(db, CAROL_ADMIN);
    const ea = (await evaluate(a, { clarity: 9, result: 18 })).rows[0].evaluate_submission;
    const eb = (await evaluate(b, { clarity: 5, result: 10 })).rows[0].evaluate_submission;
    await db.query("select public.approve_evaluation($1)", [ea]);
    await db.query("update public.challenges set status = 'under_review' where id = $1", [cid]);

    // Bob's evaluation is still a draft: completion must be refused.
    await expect(
      db.query("update public.challenges set status = 'completed' where id = $1", [cid]),
    ).rejects.toThrow(/unevaluated_submissions/);

    await db.query("select public.approve_evaluation($1)", [eb]);

    // Approved but not completed: participants still see nothing.
    await asUser(db, ALICE);
    expect((await db.query("select 1 from public.evaluations")).rows).toHaveLength(0);

    await asUser(db, CAROL_ADMIN);
    await db.query("update public.challenges set status = 'completed' where id = $1", [cid]);

    await asUser(db, ALICE);
    const mine = await db.query<{ total: string }>("select total from public.evaluations");
    expect(mine.rows.map((r) => Number(r.total))).toEqual([27]);
    await asUser(db, BOB);
    const his = await db.query<{ total: string }>("select total from public.evaluations");
    expect(his.rows.map((r) => Number(r.total))).toEqual([15]);
    await asAnon(db);
    await expect(db.query("select 1 from public.evaluations")).rejects.toThrow(/permission denied/);
  });

  it("an approved evaluation cannot be rewritten", async () => {
    const { cid, a } = await scenario();
    await setStatus(cid, "closed");
    await addRubric(cid);
    await asUser(db, CAROL_ADMIN);
    const e = (await evaluate(a, { clarity: 1, result: 1 })).rows[0].evaluate_submission;
    await db.query("select public.approve_evaluation($1)", [e]);
    await expect(evaluate(a, { clarity: 2, result: 2 })).rejects.toThrow(/already_approved/);
    await asUser(db, ALICE);
    await expect(db.query("select public.approve_evaluation($1)", [e])).rejects.toThrow(/not_admin/);
  });
});

describe("audit log", () => {
  it("records status changes with from/to, readable only by admins", async () => {
    const cid = await makeChallenge({ status: "published", startsAt: inHours(5), endsAt: inHours(9) });
    await asUser(db, CAROL_ADMIN);
    await db.query("update public.challenges set status = 'cancelled' where id = $1", [cid]);

    const { rows } = await db.query<{ action: string; metadata: { from: string; to: string }; actor_id: string }>(
      "select action, metadata, actor_id from public.audit_logs where entity_id = $1 and action = 'challenges.update'",
      [cid],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toMatchObject({ from: "published", to: "cancelled" });
    expect(rows[0].actor_id).toBe(CAROL_ADMIN);

    await asUser(db, ALICE);
    expect((await db.query("select 1 from public.audit_logs")).rows).toHaveLength(0);
    await expect(db.query("insert into public.audit_logs (action, entity_type) values ('x','y')")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.write_audit('x','y',null)")).rejects.toThrow(/permission denied/);
  });
});

describe("AI layer functions", () => {
  it("are not executable by authenticated users", async () => {
    await asUser(db, ALICE);
    await expect(
      db.query("select public.ai_save_brief(gen_random_uuid(), gen_random_uuid(), 'x')"),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      db.query("select public.ai_save_evaluation(gen_random_uuid(), '{}'::jsonb, 'x')"),
    ).rejects.toThrow(/permission denied/i);
    await asSuperuser(db);
  });
});
