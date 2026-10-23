import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asAnon,
  asSuperuser,
  asUser,
  createDb,
  inHours,
  signUp,
} from "./helpers";

const ALICE = "11111111-1111-4111-8111-111111111111"; // primary: data-analysis
const BOB = "22222222-2222-4222-8222-222222222222";
const CAROL_ADMIN = "33333333-3333-4333-8333-333333333333";

let db: PGlite;
let n = 0;

async function categoryId(slug: string): Promise<string> {
  await asSuperuser(db);
  const { rows } = await db.query<{ id: string }>(
    "select id from public.categories where slug = $1",
    [slug],
  );
  return rows[0].id;
}

type Overrides = Partial<{
  category: string;
  status: string;
  startsAt: string;
  endsAt: string;
  max: number | null;
}>;

/** Insert a challenge as superuser (fixtures only) and return its id. */
async function makeChallenge(o: Overrides = {}): Promise<string> {
  const cat = await categoryId(o.category ?? "ai-automation");
  await asSuperuser(db);
  n += 1;
  const { rows } = await db.query<{ id: string }>(
    `insert into public.challenges
       (slug, category_id, title, difficulty, status, starts_at, ends_at,
        max_participants, evaluation_method)
     values ($1, $2, $3, 'beginner', $4, $5, $6, $7, 'automated')
     returning id`,
    [
      `fixture-${n}`,
      cat,
      `Fixture ${n}`,
      o.status ?? "active",
      o.startsAt ?? inHours(-1),
      o.endsAt ?? inHours(24),
      o.max === undefined ? null : o.max,
    ],
  );
  return rows[0].id;
}

async function status(id: string): Promise<string> {
  await asSuperuser(db);
  const { rows } = await db.query<{ status: string }>(
    "select status from public.challenges where id = $1",
    [id],
  );
  return rows[0].status;
}

const join = (id: string) =>
  db.query<{ join_challenge: { joined: boolean; already_joined: boolean } }>(
    "select public.join_challenge($1)",
    [id],
  );

beforeAll(async () => {
  db = await createDb();
  await signUp(db, ALICE, {
    username: "alice_x",
    display_name: "Alice",
    primary_category_slug: "data-analysis",
  });
  await signUp(db, BOB, { username: "bob_b", display_name: "Bob" });
  await signUp(db, CAROL_ADMIN, { username: "carol_admin", display_name: "Carol" });
  await asSuperuser(db);
  await db.query("insert into public.admin_users (user_id) values ($1)", [CAROL_ADMIN]);
});

afterAll(async () => {
  await db.close();
});

describe("challenge visibility and writes (RLS)", () => {
  it("anon and users see non-draft challenges; drafts only for admins", async () => {
    const draft = await makeChallenge({ status: "draft" });
    const active = await makeChallenge({ status: "active" });
    const cancelled = await makeChallenge({ status: "cancelled" });

    const ids = async () =>
      (await db.query<{ id: string }>("select id from public.challenges")).rows.map(
        (r) => r.id,
      );

    await asAnon(db);
    let seen = await ids();
    expect(seen).toContain(active);
    expect(seen).toContain(cancelled);
    expect(seen).not.toContain(draft);

    await asUser(db, ALICE);
    expect(await ids()).not.toContain(draft);

    await asUser(db, CAROL_ADMIN);
    seen = await ids();
    expect(seen).toContain(draft);
  });

  it("only admins can create, edit or delete (drafts only)", async () => {
    const cat = await categoryId("data-analysis");
    const insert = `insert into public.challenges
      (slug, category_id, title, difficulty, starts_at, ends_at, evaluation_method)
      values ($1, $2, 'T', 'beginner', $3, $4, 'rubric')`;

    await asAnon(db);
    await expect(
      db.query(insert, ["anon-made", cat, inHours(1), inHours(2)]),
    ).rejects.toThrow(/permission denied/);

    await asUser(db, ALICE);
    await expect(
      db.query(insert, ["user-made", cat, inHours(1), inHours(2)]),
    ).rejects.toThrow(/row-level security/);

    const draft = await makeChallenge({ status: "draft" });
    const live = await makeChallenge({ status: "active" });

    await asUser(db, ALICE);
    expect(
      (await db.query("update public.challenges set title = 'x' where id = $1 returning id", [live]))
        .rows,
    ).toHaveLength(0);
    expect(
      (await db.query("delete from public.challenges where id = $1 returning id", [draft])).rows,
    ).toHaveLength(0);

    await asUser(db, CAROL_ADMIN);
    expect(
      (await db.query(insert + " returning id", ["admin-made", cat, inHours(1), inHours(2)])).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("update public.challenges set title = 'Edited' where id = $1 returning id", [live]))
        .rows,
    ).toHaveLength(1);
    expect(
      (await db.query("delete from public.challenges where id = $1 returning id", [live])).rows,
    ).toHaveLength(0); // not a draft
    expect(
      (await db.query("delete from public.challenges where id = $1 returning id", [draft])).rows,
    ).toHaveLength(1); // a draft
  });

  it("rejects bad data: end before start, unknown difficulty or status", async () => {
    const cat = await categoryId("data-analysis");
    await asSuperuser(db);
    await expect(
      db.query(
        `insert into public.challenges (slug, category_id, title, difficulty, starts_at, ends_at, evaluation_method)
         values ('bad-dates', $1, 'T', 'beginner', $2, $3, 'rubric')`,
        [cat, inHours(5), inHours(1)],
      ),
    ).rejects.toThrow(/check constraint|violates/);
    await expect(
      db.query(
        `insert into public.challenges (slug, category_id, title, difficulty, starts_at, ends_at, evaluation_method)
         values ('bad-diff', $1, 'T', 'godlike', $2, $3, 'rubric')`,
        [cat, inHours(1), inHours(2)],
      ),
    ).rejects.toThrow(/check constraint|violates/);
    await expect(
      db.query(
        `insert into public.challenges (slug, category_id, title, difficulty, status, starts_at, ends_at, evaluation_method)
         values ('bad-status', $1, 'T', 'beginner', 'launched', $2, $3, 'rubric')`,
        [cat, inHours(1), inHours(2)],
      ),
    ).rejects.toThrow(/check constraint|violates/);
  });
});

describe("status transitions", () => {
  it("follows draft → published → active → closed → under_review → completed", async () => {
    const id = await makeChallenge({ status: "draft" });
    await asUser(db, CAROL_ADMIN);
    for (const next of ["published", "active", "closed", "under_review", "completed"]) {
      await db.query("update public.challenges set status = $1 where id = $2", [next, id]);
      expect(await status(id)).toBe(next);
      await asUser(db, CAROL_ADMIN);
    }
  });

  it("stamps published_at when a draft is published", async () => {
    const id = await makeChallenge({ status: "draft" });
    await asUser(db, CAROL_ADMIN);
    await db.query("update public.challenges set status = 'published' where id = $1", [id]);
    await asSuperuser(db);
    const { rows } = await db.query<{ published_at: string | null }>(
      "select published_at from public.challenges where id = $1",
      [id],
    );
    expect(rows[0].published_at).not.toBeNull();
  });

  it.each([
    ["draft", "active"],
    ["draft", "completed"],
    ["published", "closed"],
    ["active", "draft"],
    ["active", "published"],
    ["completed", "active"],
    ["cancelled", "published"],
  ])("rejects %s → %s", async (from, to) => {
    const id = await makeChallenge({ status: from });
    await asUser(db, CAROL_ADMIN);
    await expect(
      db.query("update public.challenges set status = $1 where id = $2", [to, id]),
    ).rejects.toThrow(/invalid_status_transition/);
  });

  it("allows cancelling from any non-final state", async () => {
    for (const from of ["draft", "published", "active", "closed", "under_review"]) {
      const id = await makeChallenge({ status: from });
      await asUser(db, CAROL_ADMIN);
      await db.query("update public.challenges set status = 'cancelled' where id = $1", [id]);
      expect(await status(id)).toBe("cancelled");
    }
  });
});

describe("join_challenge", () => {
  it("requires a signed-in user", async () => {
    const id = await makeChallenge();
    await asAnon(db);
    await expect(join(id)).rejects.toThrow(/permission denied/);
  });

  it("lets a user join a challenge outside their primary category", async () => {
    // Alice's primary category is data-analysis; this challenge is ai-automation.
    const id = await makeChallenge({ category: "ai-automation" });
    await asUser(db, ALICE);
    const { rows } = await join(id);
    expect(rows[0].join_challenge).toEqual({ joined: true, already_joined: false });
  });

  it("is idempotent: a repeat call never duplicates the participation", async () => {
    const id = await makeChallenge();
    await asUser(db, ALICE);
    await join(id);
    const again = await join(id);
    expect(again.rows[0].join_challenge).toEqual({ joined: true, already_joined: true });

    await asSuperuser(db);
    const { rows } = await db.query<{ n: number }>(
      "select count(*)::int as n from public.challenge_participants where challenge_id = $1 and user_id = $2",
      [id, ALICE],
    );
    expect(rows[0].n).toBe(1);
  });

  it("rejects challenges that are not open", async () => {
    const draft = await makeChallenge({ status: "draft" });
    const upcoming = await makeChallenge({
      status: "published",
      startsAt: inHours(5),
      endsAt: inHours(30),
    });
    const closed = await makeChallenge({ status: "closed" });
    const cancelled = await makeChallenge({ status: "cancelled" });

    await asUser(db, BOB);
    await expect(join(draft)).rejects.toThrow(/challenge_not_found/);
    await expect(join(upcoming)).rejects.toThrow(/challenge_not_open/);
    await expect(join(closed)).rejects.toThrow(/challenge_not_open/);
    await expect(join(cancelled)).rejects.toThrow(/challenge_not_open/);
  });

  it("rejects an unknown challenge id", async () => {
    await asUser(db, BOB);
    await expect(join("99999999-9999-4999-8999-999999999999")).rejects.toThrow(
      /challenge_not_found/,
    );
  });

  it("treats an overdue 'active' challenge as closed", async () => {
    const id = await makeChallenge({
      status: "active",
      startsAt: inHours(-48),
      endsAt: inHours(-24),
    });
    await asUser(db, BOB);
    await expect(join(id)).rejects.toThrow(/challenge_not_open/);
  });

  it("opens a 'published' challenge whose start time has passed", async () => {
    const id = await makeChallenge({
      status: "published",
      startsAt: inHours(-1),
      endsAt: inHours(24),
    });
    await asUser(db, BOB);
    const { rows } = await join(id);
    expect(rows[0].join_challenge.joined).toBe(true);
    expect(await status(id)).toBe("active");
  });

  it("enforces max_participants", async () => {
    const id = await makeChallenge({ max: 1 });
    await asUser(db, ALICE);
    await join(id);
    await asUser(db, BOB);
    await expect(join(id)).rejects.toThrow(/challenge_full/);
    // The existing participant is still told they are in.
    await asUser(db, ALICE);
    expect((await join(id)).rows[0].join_challenge.already_joined).toBe(true);
  });

  it("rejects challenges in an inactive category", async () => {
    await asSuperuser(db);
    await db.query(
      "insert into public.categories (slug, name, is_active, display_order) values ('retired', 'Retired', false, 50)",
    );
    const id = await makeChallenge({ category: "retired" });
    await asUser(db, BOB);
    await expect(join(id)).rejects.toThrow(/category_inactive/);
  });
});

describe("participation privacy", () => {
  it("users see only their own participation rows", async () => {
    const id = await makeChallenge();
    await asUser(db, ALICE);
    await join(id);

    await asUser(db, ALICE);
    const mine = await db.query(
      "select 1 from public.challenge_participants where challenge_id = $1",
      [id],
    );
    expect(mine.rows).toHaveLength(1);

    await asUser(db, BOB);
    const theirs = await db.query(
      "select 1 from public.challenge_participants where challenge_id = $1",
      [id],
    );
    expect(theirs.rows).toHaveLength(0);

    await asUser(db, CAROL_ADMIN);
    const admin = await db.query(
      "select 1 from public.challenge_participants where challenge_id = $1",
      [id],
    );
    expect(admin.rows).toHaveLength(1);
  });

  it("blocks direct writes and anonymous reads", async () => {
    const id = await makeChallenge();
    await asUser(db, BOB);
    await expect(
      db.query("insert into public.challenge_participants (challenge_id, user_id) values ($1, $2)", [id, BOB]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update public.challenge_participants set status = 'completed'"),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.challenge_participants")).rejects.toThrow(
      /permission denied/,
    );

    await asAnon(db);
    await expect(db.query("select * from public.challenge_participants")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("exposes only a participant COUNT publicly, and 0 for drafts", async () => {
    const id = await makeChallenge();
    const draft = await makeChallenge({ status: "draft" });
    await asUser(db, ALICE);
    await join(id);
    await asUser(db, BOB);
    await join(id);

    await asAnon(db);
    const count = (cid: string) =>
      db
        .query<{ n: number }>("select public.challenge_participant_count($1) as n", [cid])
        .then((r) => r.rows[0].n);
    expect(await count(id)).toBe(2);
    expect(await count(draft)).toBe(0);
  });
});

describe("sync_challenge_statuses", () => {
  it("moves published→active and active→closed by the clock, leaves the rest", async () => {
    const started = await makeChallenge({
      status: "published",
      startsAt: inHours(-2),
      endsAt: inHours(24),
    });
    const overdue = await makeChallenge({
      status: "active",
      startsAt: inHours(-48),
      endsAt: inHours(-1),
    });
    const future = await makeChallenge({
      status: "published",
      startsAt: inHours(10),
      endsAt: inHours(30),
    });
    const stillRunning = await makeChallenge({ status: "active" });
    const draft = await makeChallenge({
      status: "draft",
      startsAt: inHours(-2),
      endsAt: inHours(24),
    });

    await asAnon(db);
    await db.query("select public.sync_challenge_statuses()");

    expect(await status(started)).toBe("active");
    expect(await status(overdue)).toBe("closed");
    expect(await status(future)).toBe("published");
    expect(await status(stillRunning)).toBe("active");
    expect(await status(draft)).toBe("draft");
  });

  it("walks a published challenge whose whole window has passed to closed", async () => {
    const id = await makeChallenge({
      status: "published",
      startsAt: inHours(-48),
      endsAt: inHours(-24),
    });
    await asAnon(db);
    await db.query("select public.sync_challenge_statuses()");
    expect(await status(id)).toBe("closed");
  });
});
