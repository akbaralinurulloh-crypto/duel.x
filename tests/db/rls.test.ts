import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Isolated local Postgres (PGlite) + a test-only auth mock. This exercises our
// SQL and RLS policies; it does not prove real Supabase behaviour.

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";
const CAROL_ADMIN = "33333333-3333-4333-8333-333333333333";
const DAVE = "44444444-4444-4444-8444-444444444444";
const ERIN = "55555555-5555-4555-8555-555555555555";

let db: PGlite;

async function asSuperuser() {
  await db.exec("reset role");
}
async function asAnon() {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
  await db.exec("set role anon");
}
async function asUser(uid: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  await db.exec("set role authenticated");
}

async function signUp(id: string, meta: Record<string, unknown>) {
  await asSuperuser();
  await db.query(
    "insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3::jsonb)",
    [id, `${id.slice(0, 4)}@example.test`, JSON.stringify(meta)],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync(resolve("tests/db/auth-mock.sql"), "utf8"));
  await db.exec(
    readFileSync(
      resolve("supabase/migrations/20261022120000_foundation.sql"),
      "utf8",
    ),
  );

  await signUp(ALICE, {
    username: "Alice_X",
    display_name: "Alice",
    primary_category_slug: "data-analysis",
  });
  await signUp(BOB, { username: "bob_b", display_name: "Bob" });
  await signUp(CAROL_ADMIN, { username: "carol_admin", display_name: "Carol" });
  await asSuperuser();
  await db.query("insert into public.admin_users (user_id) values ($1)", [
    CAROL_ADMIN,
  ]);
});

afterAll(async () => {
  await db.close();
});

describe("signup trigger", () => {
  it("creates a normalized profile with the chosen primary category", async () => {
    await asSuperuser();
    const { rows } = await db.query<{
      username: string;
      display_name: string;
      slug: string | null;
    }>(
      `select p.username, p.display_name, c.slug
         from public.profiles p
         left join public.categories c on c.id = p.primary_category_id
        where p.id = $1`,
      [ALICE],
    );
    expect(rows[0]).toEqual({
      username: "alice_x",
      display_name: "Alice",
      slug: "data-analysis",
    });
  });

  it("falls back to a generated username when the wanted one is taken", async () => {
    await signUp(DAVE, { username: "alice_x", display_name: "Dave" });
    await asSuperuser();
    const { rows } = await db.query<{ username: string }>(
      "select username from public.profiles where id = $1",
      [DAVE],
    );
    expect(rows[0].username).toBe("user_4444444444");
  });

  it("falls back when the username is invalid, and ignores unknown categories", async () => {
    await signUp(ERIN, {
      username: "a!",
      display_name: "Erin",
      primary_category_slug: "does-not-exist",
    });
    await asSuperuser();
    const { rows } = await db.query<{
      username: string;
      primary_category_id: string | null;
    }>(
      "select username, primary_category_id from public.profiles where id = $1",
      [ERIN],
    );
    expect(rows[0].username).toMatch(/^user_[a-f0-9]{10}$/);
    expect(rows[0].primary_category_id).toBeNull();
  });
});

describe("categories", () => {
  it("seeds the six initial categories", async () => {
    await asAnon();
    const { rows } = await db.query<{ slug: string }>(
      "select slug from public.categories order by display_order",
    );
    expect(rows.map((r) => r.slug)).toEqual([
      "prompt-engineering",
      "ai-automation",
      "data-analysis",
      "ai-content-creation",
      "ai-assisted-coding",
      "ai-for-business",
    ]);
  });

  it("hides inactive categories from non-admins but not from admins", async () => {
    await asSuperuser();
    await db.query(
      "insert into public.categories (slug, name, is_active, display_order) values ('hidden-cat', 'Hidden', false, 99)",
    );

    await asAnon();
    let res = await db.query("select 1 from public.categories where slug = 'hidden-cat'");
    expect(res.rows).toHaveLength(0);

    await asUser(ALICE);
    res = await db.query("select 1 from public.categories where slug = 'hidden-cat'");
    expect(res.rows).toHaveLength(0);

    await asUser(CAROL_ADMIN);
    res = await db.query("select 1 from public.categories where slug = 'hidden-cat'");
    expect(res.rows).toHaveLength(1);
  });

  it("blocks anonymous writes", async () => {
    await asAnon();
    await expect(
      db.query("insert into public.categories (slug, name) values ('x-anon', 'X')"),
    ).rejects.toThrow(/permission denied/);
  });

  it("blocks writes by a normal user", async () => {
    await asUser(ALICE);
    await expect(
      db.query("insert into public.categories (slug, name) values ('x-user', 'X')"),
    ).rejects.toThrow(/row-level security/);

    const upd = await db.query(
      "update public.categories set name = 'Hacked' where slug = 'data-analysis' returning id",
    );
    expect(upd.rows).toHaveLength(0);

    const del = await db.query(
      "delete from public.categories where slug = 'data-analysis' returning id",
    );
    expect(del.rows).toHaveLength(0);
  });

  it("lets an admin write", async () => {
    await asUser(CAROL_ADMIN);
    const ins = await db.query(
      "insert into public.categories (slug, name, display_order) values ('admin-added', 'Admin Added', 7) returning id",
    );
    expect(ins.rows).toHaveLength(1);
    const upd = await db.query(
      "update public.categories set name = 'Admin Renamed' where slug = 'admin-added' returning name",
    );
    expect(upd.rows).toHaveLength(1);
  });
});

describe("admin authority", () => {
  it("is_admin() is true only for rows in admin_users", async () => {
    await asUser(CAROL_ADMIN);
    expect((await db.query<{ is_admin: boolean }>("select public.is_admin()")).rows[0].is_admin).toBe(true);
    await asUser(ALICE);
    expect((await db.query<{ is_admin: boolean }>("select public.is_admin()")).rows[0].is_admin).toBe(false);
  });

  it("a user cannot grant themselves admin or even read admin_users", async () => {
    await asUser(ALICE);
    await expect(
      db.query("insert into public.admin_users (user_id) values ($1)", [ALICE]),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.admin_users")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("is_admin() is false for anonymous visitors (and does not error)", async () => {
    await asAnon();
    const { rows } = await db.query<{ is_admin: boolean }>("select public.is_admin()");
    expect(rows[0].is_admin).toBe(false);
  });
});

describe("profiles", () => {
  it("anon can read public profiles but only the public columns", async () => {
    await asAnon();
    const { rows } = await db.query<{ username: string }>(
      "select username from public.profiles where id = $1",
      [ALICE],
    );
    expect(rows).toHaveLength(1);
    await expect(
      db.query("select talent_discovery_consent from public.profiles"),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.profiles")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("a private profile is visible only to its owner", async () => {
    await asUser(BOB);
    await db.query("update public.profiles set is_public = false where id = $1", [BOB]);

    await asAnon();
    expect(
      (await db.query("select 1 from public.profiles where id = $1", [BOB])).rows,
    ).toHaveLength(0);

    await asUser(ALICE);
    expect(
      (await db.query("select 1 from public.profiles where id = $1", [BOB])).rows,
    ).toHaveLength(0);

    await asUser(BOB);
    expect(
      (await db.query("select 1 from public.profiles where id = $1", [BOB])).rows,
    ).toHaveLength(1);
  });

  it("a user can update their own editable fields", async () => {
    await asUser(ALICE);
    const { rows } = await db.query<{ bio: string }>(
      "update public.profiles set bio = 'Data person', display_name = 'Alice A.' where id = $1 returning bio",
      [ALICE],
    );
    expect(rows[0].bio).toBe("Data person");
  });

  it("a user cannot update someone else's profile", async () => {
    await asUser(ALICE);
    const { rows } = await db.query(
      "update public.profiles set display_name = 'Pwned' where id = $1 returning id",
      [CAROL_ADMIN],
    );
    expect(rows).toHaveLength(0);

    await asSuperuser();
    const check = await db.query<{ display_name: string }>(
      "select display_name from public.profiles where id = $1",
      [CAROL_ADMIN],
    );
    expect(check.rows[0].display_name).toBe("Carol");
  });

  it("a user cannot change their id or created_at", async () => {
    await asUser(ALICE);
    await expect(
      db.query("update public.profiles set id = $1 where id = $2", [BOB, ALICE]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update public.profiles set created_at = now() where id = $1", [ALICE]),
    ).rejects.toThrow(/permission denied/);
  });

  it("a user cannot point their primary category at an inactive category", async () => {
    // Fetch the id as superuser: a normal user cannot even see the inactive row.
    await asSuperuser();
    const hidden = await db.query<{ id: string }>(
      "select id from public.categories where slug = 'hidden-cat'",
    );
    await asUser(ALICE);
    await expect(
      db.query("update public.profiles set primary_category_id = $1 where id = $2", [
        hidden.rows[0].id,
        ALICE,
      ]),
    ).rejects.toThrow(/row-level security|violates/);
  });

  it("changing the primary category does not touch anything else", async () => {
    await asUser(ALICE);
    const cat = await db.query<{ id: string }>(
      "select id from public.categories where slug = 'ai-automation'",
    );
    await db.query("update public.profiles set primary_category_id = $1 where id = $2", [
      cat.rows[0].id,
      ALICE,
    ]);
    const { rows } = await db.query<{ username: string; bio: string }>(
      "select username, bio from public.profiles where id = $1",
      [ALICE],
    );
    expect(rows[0]).toEqual({ username: "alice_x", bio: "Data person" });
  });

  it("nobody can insert or delete profiles from the client", async () => {
    await asUser(ALICE);
    await expect(
      db.query(
        "insert into public.profiles (id, username, display_name) values (gen_random_uuid(), 'sneaky', 'Sneaky')",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("delete from public.profiles where id = $1", [ALICE]),
    ).rejects.toThrow(/permission denied/);
  });

  it("rejects invalid usernames and over-long bios", async () => {
    await asUser(ALICE);
    await expect(
      db.query("update public.profiles set username = 'Bad Name' where id = $1", [ALICE]),
    ).rejects.toThrow(/check constraint|violates/);
    await expect(
      db.query("update public.profiles set bio = $1 where id = $2", ["x".repeat(501), ALICE]),
    ).rejects.toThrow(/check constraint|violates/);
  });
});

describe("is_username_available", () => {
  it("reports taken and free usernames to anonymous visitors", async () => {
    await asAnon();
    const taken = await db.query<{ ok: boolean }>(
      "select public.is_username_available('ALICE_X') as ok",
    );
    const free = await db.query<{ ok: boolean }>(
      "select public.is_username_available('brand_new_name') as ok",
    );
    expect(taken.rows[0].ok).toBe(false);
    expect(free.rows[0].ok).toBe(true);
  });
});
