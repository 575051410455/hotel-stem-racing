import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import { createStaffAccounts, type StaffAccounts } from "./staff-accounts";
import { createStaffAuth, type StaffAuth } from "./staff-auth";

const baseURL = "http://localhost:3104";
const password = "correct horse battery";

// Better Auth keeps rate-limit counters in one in-memory store per process, keyed by client IP,
// so every test signs in from its own address.
let lastOctet = 0;
const nextClientIp = () => `203.0.113.${++lastOctet}`;

/** Calls the public auth endpoint the sign-in page uses, the way a browser would. */
function post(auth: StaffAuth, path: string, body: unknown, clientIp: string) {
  return auth.handler(
    new Request(`${baseURL}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: baseURL, "x-real-ip": clientIp },
      body: JSON.stringify(body),
    }),
  );
}

function signIn(auth: StaffAuth, email: string, password: string, clientIp = nextClientIp()) {
  return post(auth, "/sign-in/email", { email, password }, clientIp);
}

/** Signs in and reads the session back the way Back Office pages do, from the session cookie. */
async function signInAndGetSession(auth: StaffAuth, email: string, password: string) {
  const response = await signIn(auth, email, password);
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  return auth.api.getSession({ headers: new Headers({ cookie }) });
}

describe("Staff Accounts", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: StaffAuth;
  let staffAccounts: StaffAccounts;

  before(async () => {
    database = await createTestDatabase();
    auth = createStaffAuth({ db: database.db, secret: "test-secret-".repeat(4), baseURL });
    staffAccounts = createStaffAccounts(auth);
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  test("a created Staff Account can sign in", async () => {
    const created = await staffAccounts.create({
      email: "Somchai@Example.org",
      name: "สมชาย ใจดี",
      password,
    });
    assert.equal(created.status, "created");

    const response = await signIn(auth, "somchai@example.org", password);

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.name, "สมชาย ใจดี");
    assert.equal(body.user.email, "somchai@example.org");
  });

  test("a created Kiosk Account signs in as a Kiosk Account", async () => {
    const created = await staffAccounts.create({
      email: "Kiosk-1@Example.org",
      name: "Kiosk 1",
      password,
      kind: "kiosk",
    });
    assert.equal(created.status, "created");

    const session = await signInAndGetSession(auth, "kiosk-1@example.org", password);

    assert.equal(session?.user.kind, "kiosk");
    assert.equal(session?.user.name, "Kiosk 1");
  });

  test("a Staff Account signs in as a Staff Account", async () => {
    await staffAccounts.create({ email: "staff@example.org", name: "Staff", password });

    const session = await signInAndGetSession(auth, "staff@example.org", password);

    assert.equal(session?.user.kind, "staff");
  });

  test("a signed-in Kiosk Account can't make itself a Staff Account through the public API", async () => {
    await staffAccounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" });
    const signedIn = await signIn(auth, "kiosk@example.org", password);
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/update-user`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL, "x-real-ip": nextClientIp(), cookie },
        body: JSON.stringify({ kind: "staff" }),
      }),
    );

    assert.equal(response.status, 400);
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session?.user.kind, "kiosk");
  });

  test("signing in with a wrong password fails", async () => {
    await staffAccounts.create({ email: "staff@example.org", name: "Staff", password });

    const response = await signIn(auth, "staff@example.org", "wrong horse battery");

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  });

  test("creating a Staff Account with a password under 12 characters is rejected", async () => {
    const result = await staffAccounts.create({
      email: "short@example.org",
      name: "Staff",
      password: "elevenchars",
    });

    assert.deepEqual(result, { status: "password-too-short", minLength: 12 });
    const response = await signIn(auth, "short@example.org", "elevenchars");
    assert.equal(response.status, 401);
  });

  test("a 12-character password with no special characters is accepted", async () => {
    const result = await staffAccounts.create({
      email: "plain@example.org",
      name: "Staff",
      password: "abcdefghijkl",
    });

    assert.equal(result.status, "created");
  });

  test("a second Staff Account with the same email is rejected", async () => {
    await staffAccounts.create({ email: "staff@example.org", name: "Staff", password });

    const result = await staffAccounts.create({
      email: " STAFF@example.org ",
      name: "Someone else",
      password: "another long password",
    });

    assert.deepEqual(result, { status: "email-taken" });
  });

  test("signing up through the public API is refused", async () => {
    const clientIp = nextClientIp();
    const response = await post(
      auth,
      "/sign-up/email",
      { email: "intruder@example.org", name: "Intruder", password },
      clientIp,
    );

    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "EMAIL_PASSWORD_SIGN_UP_DISABLED");
    assert.equal((await signIn(auth, "intruder@example.org", password)).status, 401);
  });

  test("repeated sign-in attempts from one address are rate limited", async () => {
    await staffAccounts.create({ email: "staff@example.org", name: "Staff", password });
    const clientIp = nextClientIp();

    for (let attempt = 0; attempt < 3; attempt++) {
      assert.equal((await signIn(auth, "staff@example.org", "wrong horse battery", clientIp)).status, 401);
    }
    const limited = await signIn(auth, "staff@example.org", password, clientIp);

    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("x-retry-after")) > 0);
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 200);
  });

  test("resetting a password replaces the old one and signs the Staff Account out", async () => {
    await staffAccounts.create({ email: "staff@example.org", name: "Staff", password });
    const signedIn = await signIn(auth, "staff@example.org", password);
    const sessionCookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await staffAccounts.resetPassword({
      email: "Staff@Example.org",
      password: "a brand new password",
    });

    assert.equal(result.status, "password-reset");
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 401);
    assert.equal((await signIn(auth, "staff@example.org", "a brand new password")).status, 200);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: sessionCookie }) });
    assert.equal(session, null);
  });

  test("resetting a Kiosk Account's password keeps it a Kiosk Account", async () => {
    const created = await staffAccounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" });
    assert.equal(created.status, "created");

    const result = await staffAccounts.resetPassword({ email: "kiosk@example.org", password: "a brand new password" });

    assert.deepEqual(result, { status: "password-reset", accountId: created.accountId, kind: "kiosk" });
    const session = await signInAndGetSession(auth, "kiosk@example.org", "a brand new password");
    assert.equal(session?.user.kind, "kiosk");
  });

  test("resetting to a password under 12 characters is rejected", async () => {
    await staffAccounts.create({ email: "staff@example.org", name: "Staff", password });

    const result = await staffAccounts.resetPassword({ email: "staff@example.org", password: "too short" });

    assert.deepEqual(result, { status: "password-too-short", minLength: 12 });
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 200);
  });

  test("resetting the password of an unknown email reports it", async () => {
    const result = await staffAccounts.resetPassword({
      email: "nobody@example.org",
      password: "a brand new password",
    });

    assert.deepEqual(result, { status: "not-found" });
  });
});
