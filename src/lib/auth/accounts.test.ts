import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import { createAccounts, type Accounts } from "./accounts";
import { createStaffAuth, type StaffAuth } from "./staff-auth";
import { eq } from "drizzle-orm";
import { sessions } from "@/lib/db/auth-schema";

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

describe("Accounts", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: StaffAuth;
  let accounts: Accounts;

  before(async () => {
    database = await createTestDatabase();
    auth = createStaffAuth({ db: database.db, secret: "test-secret-".repeat(4), baseURL });
    accounts = createAccounts(auth);
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  test("a created Staff Account can sign in", async () => {
    const created = await accounts.create({
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
    const created = await accounts.create({
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

  test("a created Admin Account signs in as an Admin Account", async () => {
    const created = await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" });

    assert.deepEqual(created.status === "created" && created.kind, "admin");
    const session = await signInAndGetSession(auth, "admin@example.org", password);
    assert.equal(session?.user.kind, "admin");
  });

  test("a Staff Account signs in as a Staff Account", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password });

    const session = await signInAndGetSession(auth, "staff@example.org", password);

    assert.equal(session?.user.kind, "staff");
  });

  test("a signed-in Kiosk Account can't make itself an Admin Account through the public API", async () => {
    await accounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" });
    const signedIn = await signIn(auth, "kiosk@example.org", password);
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/update-user`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL, "x-real-ip": nextClientIp(), cookie },
        body: JSON.stringify({ kind: "admin" }),
      }),
    );

    assert.equal(response.status, 403);
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session?.user.kind, "kiosk");
  });

  test("no signed-in Account can rename itself through Better Auth's endpoint", async () => {
    for (const kind of ["admin", "staff", "kiosk"] as const) {
      const email = `${kind}@example.org`;
      await accounts.create({ email, name: "Before", password, kind });
      const cookie = (await signIn(auth, email, password)).headers.get("set-cookie")!.split(";")[0];

      const response = await auth.handler(
        new Request(`${baseURL}/api/auth/update-user`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: baseURL, "x-real-ip": nextClientIp(), cookie },
          body: JSON.stringify({ name: "After" }),
        }),
      );

      assert.equal(response.status, 403, kind);
      const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
      assert.equal(session?.user.name, "Before", kind);
    }
  });

  test("a signed-in Staff Account changes its own password through the public API, signing out its other devices", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password });
    const otherDevice = (await signIn(auth, "staff@example.org", password)).headers.get("set-cookie")!.split(";")[0];
    const thisDevice = (await signIn(auth, "staff@example.org", password)).headers.get("set-cookie")!.split(";")[0];

    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/change-password`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: baseURL,
          "x-real-ip": nextClientIp(),
          cookie: thisDevice,
        },
        body: JSON.stringify({ currentPassword: password, newPassword: "a brand new password", revokeOtherSessions: true }),
      }),
    );

    assert.equal(response.status, 200);
    const freshCookie = response.headers.get("set-cookie")!.split(";")[0];
    assert.equal((await auth.api.getSession({ headers: new Headers({ cookie: freshCookie }) }))?.user.email, "staff@example.org");
    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: otherDevice }) }), null);
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 401);
    assert.equal((await signIn(auth, "staff@example.org", "a brand new password")).status, 200);
  });

  test("a signed-in Kiosk Account can't change its own password through the public API", async () => {
    await accounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" });
    const signedIn = await signIn(auth, "kiosk@example.org", password);
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/change-password`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL, "x-real-ip": nextClientIp(), cookie },
        body: JSON.stringify({ currentPassword: password, newPassword: "a brand new password", revokeOtherSessions: true }),
      }),
    );

    assert.equal(response.status, 403);
    assert.equal((await signIn(auth, "kiosk@example.org", password)).status, 200);
    assert.equal((await signIn(auth, "kiosk@example.org", "a brand new password")).status, 401);
  });

  test("signing in with a wrong password fails", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password });

    const response = await signIn(auth, "staff@example.org", "wrong horse battery");

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  });

  test("creating a Staff Account with a password under 12 characters is rejected", async () => {
    const result = await accounts.create({
      email: "short@example.org",
      name: "Staff",
      password: "elevenchars",
    });

    assert.deepEqual(result, { status: "password-too-short", minLength: 12 });
    const response = await signIn(auth, "short@example.org", "elevenchars");
    assert.equal(response.status, 401);
  });

  test("a 12-character password with no special characters is accepted", async () => {
    const result = await accounts.create({
      email: "plain@example.org",
      name: "Staff",
      password: "abcdefghijkl",
    });

    assert.equal(result.status, "created");
  });

  test("a second Staff Account with the same email is rejected", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password });

    const result = await accounts.create({
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
    await accounts.create({ email: "staff@example.org", name: "Staff", password });
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
    await accounts.create({ email: "staff@example.org", name: "Staff", password });
    const signedIn = await signIn(auth, "staff@example.org", password);
    const sessionCookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.resetPassword({
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
    const created = await accounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" });
    assert.equal(created.status, "created");

    const result = await accounts.resetPassword({ email: "kiosk@example.org", password: "a brand new password" });

    assert.deepEqual(result, { status: "password-reset", accountId: created.accountId, kind: "kiosk" });
    const session = await signInAndGetSession(auth, "kiosk@example.org", "a brand new password");
    assert.equal(session?.user.kind, "kiosk");
  });

  test("resetting to a password under 12 characters is rejected", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password });

    const result = await accounts.resetPassword({ email: "staff@example.org", password: "too short" });

    assert.deepEqual(result, { status: "password-too-short", minLength: 12 });
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 200);
  });

  test("the first Admin Account can sign in with the password it was given", async () => {
    const result = await accounts.createFirst({
      email: " Organiser@Example.org ",
      name: "เจ้าหน้าที่",
      password,
    });

    assert.equal(result.status, "created");
    assert.equal(result.email, "organiser@example.org");
    const session = await signInAndGetSession(auth, "organiser@example.org", password);
    assert.equal(session?.user.kind, "admin");
    assert.equal(session?.user.name, "เจ้าหน้าที่");
  });

  test("the first Admin Account is created when only Staff and Kiosk Accounts exist", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password });
    await accounts.create({ email: "kiosk-1@example.org", name: "Kiosk 1", password, kind: "kiosk" });

    const result = await accounts.createFirst({ email: "organiser@example.org", name: "เจ้าหน้าที่", password });

    assert.equal(result.status, "created");
    const session = await signInAndGetSession(auth, "organiser@example.org", password);
    assert.equal(session?.user.kind, "admin");
  });

  test("the first Admin Account is skipped when an Admin Account exists, and nothing changes", async () => {
    await accounts.create({ email: "staff@example.org", name: "Admin", password, kind: "admin" });
    const existing = await signIn(auth, "staff@example.org", password);
    const existingCookie = existing.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.createFirst({
      email: "organiser@example.org",
      name: "เจ้าหน้าที่",
      password: "another long password",
    });

    assert.deepEqual(result, { status: "admin-account-exists" });
    assert.equal((await signIn(auth, "organiser@example.org", "another long password")).status, 401);
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 200);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: existingCookie }) });
    assert.equal(session?.user.email, "staff@example.org");
  });

  test("the first Admin Account isn't created over a Staff Account with its email, which stays as it was", async () => {
    await accounts.create({ email: "organiser@example.org", name: "Organiser", password });

    const result = await accounts.createFirst({
      email: "organiser@example.org",
      name: "เจ้าหน้าที่",
      password: "another long password",
    });

    assert.deepEqual(result, { status: "email-taken" });
    const session = await signInAndGetSession(auth, "organiser@example.org", password);
    assert.equal(session?.user.kind, "staff");
  });

  test("the first Admin Account refuses an invalid email or a password out of range", async () => {
    const name = "เจ้าหน้าที่";

    assert.deepEqual(await accounts.createFirst({ email: "not-an-email", name, password }), {
      status: "invalid-email",
    });
    assert.deepEqual(await accounts.createFirst({ email: "organiser@example.org", name, password: "too short" }), {
      status: "password-too-short",
      minLength: 12,
    });
    assert.deepEqual(
      await accounts.createFirst({ email: "organiser@example.org", name, password: "x".repeat(129) }),
      { status: "password-too-long", maxLength: 128 },
    );
    assert.equal((await signIn(auth, "organiser@example.org", "too short")).status, 401);
  });

  test("the first Admin Account still reports an invalid email when an Admin Account exists", async () => {
    await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" });

    const result = await accounts.createFirst({ email: "organiser@example", name: "เจ้าหน้าที่", password });

    assert.deepEqual(result, { status: "invalid-email" });
  });

  test("making a Staff Account an Admin signs it out everywhere, and it signs in as an Admin", async () => {
    const created = await accounts.create({ email: "staff@example.org", name: "Staff", password });
    const signedIn = await signIn(auth, "staff@example.org", password);
    const oldCookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.makeAdmin(" Staff@Example.org ");

    assert.deepEqual(result, {
      status: "promoted",
      accountId: created.status === "created" ? created.accountId : "",
      from: "staff",
    });
    assert.equal(await auth.api.getSession({ headers: new Headers({ cookie: oldCookie }) }), null);
    const session = await signInAndGetSession(auth, "staff@example.org", password);
    assert.equal(session?.user.kind, "admin");
  });

  test("making an Admin Account an Admin again changes nothing and keeps it signed in", async () => {
    await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" });
    const signedIn = await signIn(auth, "admin@example.org", password);
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.makeAdmin("admin@example.org");

    assert.equal(result.status, "already-admin");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session?.user.kind, "admin");
  });

  test("making an unknown email an Admin reports it", async () => {
    assert.deepEqual(await accounts.makeAdmin("nobody@example.org"), { status: "not-found" });
  });

  test("a Staff Account renames itself, trimmed, and keeps its sessions", async () => {
    const created = await accounts.create({ email: "staff@example.org", name: "Staff", password });
    const accountId = created.status === "created" ? created.accountId : "";
    const signedIn = await signIn(auth, "staff@example.org", password);
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.rename(accountId, "  สมชาย ใจดี  ");

    assert.deepEqual(result, { status: "renamed", name: "สมชาย ใจดี" });
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session?.user.name, "สมชาย ใจดี");
  });

  test("a rename to an empty name, or one over 100 characters, is refused and changes nothing", async () => {
    const created = await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" });
    const accountId = created.status === "created" ? created.accountId : "";

    assert.deepEqual(await accounts.rename(accountId, "   "), { status: "invalid-name" });
    assert.deepEqual(await accounts.rename(accountId, "ก".repeat(101)), {
      status: "name-too-long",
      maxLength: 100,
    });
    assert.deepEqual(await accounts.rename(accountId, "ก".repeat(100)), {
      status: "renamed",
      name: "ก".repeat(100),
    });
  });

  test("a Kiosk Account can't be renamed by its owner", async () => {
    const created = await accounts.create({ email: "kiosk@example.org", name: "Kiosk 1", password, kind: "kiosk" });
    const accountId = created.status === "created" ? created.accountId : "";

    assert.deepEqual(await accounts.rename(accountId, "Kiosk 9"), { status: "not-allowed" });
    const session = await signInAndGetSession(auth, "kiosk@example.org", password);
    assert.equal(session?.user.name, "Kiosk 1");
  });

  test("resetting the password of an unknown email reports it", async () => {
    const result = await accounts.resetPassword({
      email: "nobody@example.org",
      password: "a brand new password",
    });

    assert.deepEqual(result, { status: "not-found" });
  });
});

describe("Accounts: signed-in devices", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: StaffAuth;
  let accounts: Accounts;

  before(async () => {
    database = await createTestDatabase();
    auth = createStaffAuth({ db: database.db, secret: "test-secret-".repeat(4), baseURL });
    accounts = createAccounts(auth);
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  const SAFARI_ON_IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";
  const CHROME_ON_WINDOWS =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
  const FIREFOX_ON_LINUX = "Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0";

  async function createStaff(email: string) {
    const created = await accounts.create({ email, name: "Staff", password });
    assert.equal(created.status, "created");
    return created.accountId;
  }

  /** Signs in from a browser with this user agent and IP, and reads its session back from the cookie. */
  async function signInFrom(email: string, userAgent: string, clientIp = nextClientIp()) {
    const response = await auth.handler(
      new Request(`${baseURL}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: baseURL,
          "x-real-ip": clientIp,
          "user-agent": userAgent,
        },
        body: JSON.stringify({ email, password }),
      }),
    );
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const signedIn = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.ok(signedIn);
    return signedIn.session;
  }

  test("lists only the Account's own devices: this one first, then the others newest first", async () => {
    const accountId = await createStaff("staff@example.org");
    await createStaff("someone-else@example.org");
    const oldest = await signInFrom("staff@example.org", FIREFOX_ON_LINUX, "203.0.113.201");
    const thisDevice = await signInFrom("staff@example.org", SAFARI_ON_IPHONE, "203.0.113.202");
    const newest = await signInFrom("staff@example.org", CHROME_ON_WINDOWS, "203.0.113.203");
    await signInFrom("someone-else@example.org", CHROME_ON_WINDOWS, "203.0.113.204");

    const devices = await accounts.listDevices(accountId, thisDevice.id);

    assert.deepEqual(devices, [
      { id: thisDevice.id, userAgent: SAFARI_ON_IPHONE, ipAddress: "203.0.113.202", createdAt: thisDevice.createdAt, isCurrent: true },
      { id: newest.id, userAgent: CHROME_ON_WINDOWS, ipAddress: "203.0.113.203", createdAt: newest.createdAt, isCurrent: false },
      { id: oldest.id, userAgent: FIREFOX_ON_LINUX, ipAddress: "203.0.113.201", createdAt: oldest.createdAt, isCurrent: false },
    ]);
  });

  test("leaves out a device whose session has expired", async () => {
    const accountId = await createStaff("staff@example.org");
    const expired = await signInFrom("staff@example.org", FIREFOX_ON_LINUX);
    const thisDevice = await signInFrom("staff@example.org", SAFARI_ON_IPHONE);
    await database.db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.id, expired.id));

    const devices = await accounts.listDevices(accountId, thisDevice.id);

    assert.deepEqual(
      devices.map(({ id }) => id),
      [thisDevice.id],
    );
  });

  test("never carries a session token", async () => {
    const accountId = await createStaff("staff@example.org");
    const otherDevice = await signInFrom("staff@example.org", CHROME_ON_WINDOWS);
    const thisDevice = await signInFrom("staff@example.org", SAFARI_ON_IPHONE);

    const devices = await accounts.listDevices(accountId, thisDevice.id);

    assert.equal(devices.length, 2);
    for (const device of devices) {
      assert.deepEqual(Object.keys(device).sort(), ["createdAt", "id", "ipAddress", "isCurrent", "userAgent"]);
    }
    const listed = JSON.stringify(devices);
    assert.ok(!listed.includes(thisDevice.token));
    assert.ok(!listed.includes(otherDevice.token));
  });
});
