import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asSuperuser, asUser, createDb, signUp } from "./helpers";

const ALICE = "11111111-1111-4111-8111-111111111111";
const CAROL_ADMIN = "33333333-3333-4333-8333-333333333333";

let db: PGlite;

const send = (email = "hr@acme.test", type = "sponsor_challenge", message = "We would like to sponsor a challenge.") =>
  db.query<{ submit_company_request: string }>(
    "select public.submit_company_request('Acme', 'Jane Doe', $1, $2, $3)",
    [email, type, message],
  );

beforeAll(async () => {
  db = await createDb();
  await signUp(db, ALICE, { username: "alice_x", display_name: "Alice" });
  await signUp(db, CAROL_ADMIN, { username: "carol_admin", display_name: "Carol" });
  await asSuperuser(db);
  await db.query("insert into public.admin_users (user_id) values ($1)", [CAROL_ADMIN]);
});

afterAll(async () => {
  await db.close();
});

describe("company requests", () => {
  it("anyone can submit through the function, nobody can read the table except admins", async () => {
    await asAnon(db);
    const r = await send();
    expect(r.rows[0].submit_company_request).toBeTruthy();
    await expect(db.query("select * from public.company_requests")).rejects.toThrow(/permission denied/);
    await expect(
      db.query("insert into public.company_requests (company_name, contact_name, contact_email, request_type, message) values ('a','b','c@d.ee','other','1234567890')"),
    ).rejects.toThrow(/permission denied/);

    await asUser(db, ALICE);
    expect((await db.query("select 1 from public.company_requests")).rows).toHaveLength(0);

    await asUser(db, CAROL_ADMIN);
    expect((await db.query("select 1 from public.company_requests")).rows).toHaveLength(1);
  });

  it("rejects invalid input with a stable error code", async () => {
    await asAnon(db);
    await expect(send("not-an-email")).rejects.toThrow(/invalid_request/);
    await expect(send("ok@acme.test", "spam")).rejects.toThrow(/invalid_request/);
    await expect(send("ok@acme.test", "other", "short")).rejects.toThrow(/invalid_request/);
  });

  it("limits requests per email per hour", async () => {
    await asAnon(db);
    await send("flood@acme.test");
    await send("FLOOD@acme.test");
    await send("flood@acme.test");
    await expect(send("flood@acme.test")).rejects.toThrow(/rate_limited/);
    await send("other@acme.test");
  });

  it("only admins can triage, and only status/handled_by can change", async () => {
    await asUser(db, ALICE);
    expect(
      (await db.query("update public.company_requests set status = 'closed' returning id")).rows,
    ).toHaveLength(0);

    await asUser(db, CAROL_ADMIN);
    const upd = await db.query("update public.company_requests set status = 'contacted', handled_by = $1 returning id", [CAROL_ADMIN]);
    expect(upd.rows.length).toBeGreaterThan(0);
    await expect(
      db.query("update public.company_requests set message = 'tampered message!'"),
    ).rejects.toThrow(/permission denied/);

    const audit = await db.query("select 1 from public.audit_logs where action = 'company_requests.update'");
    expect(audit.rows.length).toBeGreaterThan(0);
  });
});
