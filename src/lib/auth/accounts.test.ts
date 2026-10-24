import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import type { AccountKind } from "./access";
import { createAccounts, type Accounts } from "./accounts";
import { createStaffAuth, type StaffAuth } from "./staff-auth";
import { eq } from "drizzle-orm";
import { accounts as credentials, sessions } from "@/lib/db/auth-schema";

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
    accounts = createAccounts(auth, database.db);
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
      name: "Somchai Jaidee",
      password,
    }, "server-command");
    assert.equal(created.status, "created");

    const response = await signIn(auth, "somchai@example.org", password);

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.name, "Somchai Jaidee");
    assert.equal(body.user.email, "somchai@example.org");
  });

  test("a created Kiosk Account signs in as a Kiosk Account", async () => {
    const created = await accounts.create({
      email: "Kiosk-1@Example.org",
      name: "Kiosk 1",
      password,
      kind: "kiosk",
    }, "server-command");
    assert.equal(created.status, "created");

    const session = await signInAndGetSession(auth, "kiosk-1@example.org", password);

    assert.equal(session?.user.kind, "kiosk");
    assert.equal(session?.user.name, "Kiosk 1");
  });

  test("a created Admin Account signs in as an Admin Account", async () => {
    const created = await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" }, "server-command");

    assert.deepEqual(created.status === "created" && created.kind, "admin");
    const session = await signInAndGetSession(auth, "admin@example.org", password);
    assert.equal(session?.user.kind, "admin");
  });

  test("a Staff Account signs in as a Staff Account", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");

    const session = await signInAndGetSession(auth, "staff@example.org", password);

    assert.equal(session?.user.kind, "staff");
  });

  test("a signed-in Kiosk Account can't make itself an Admin Account through the public API", async () => {
    await accounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" }, "server-command");
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
      await accounts.create({ email, name: "Before", password, kind }, "server-command");
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
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
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
    await accounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" }, "server-command");
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
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");

    const response = await signIn(auth, "staff@example.org", "wrong horse battery");

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("set-cookie"), null);
  });

  test("creating a Staff Account with a password under 12 characters is rejected", async () => {
    const result = await accounts.create({
      email: "short@example.org",
      name: "Staff",
      password: "elevenchars",
    }, "server-command");

    assert.deepEqual(result, { status: "password-too-short", minLength: 12 });
    const response = await signIn(auth, "short@example.org", "elevenchars");
    assert.equal(response.status, 401);
  });

  test("a 12-character password with no special characters is accepted", async () => {
    const result = await accounts.create({
      email: "plain@example.org",
      name: "Staff",
      password: "abcdefghijkl",
    }, "server-command");

    assert.equal(result.status, "created");
  });

  test("a second Staff Account with the same email is rejected", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");

    const result = await accounts.create({
      email: " STAFF@example.org ",
      name: "Someone else",
      password: "another long password",
    }, "server-command");

    assert.deepEqual(result, { status: "email-taken" });
  });

  test("an email that a disabled Account has is taken too", async () => {
    const created = await accounts.create({ email: "helper@example.org", name: "Helper", password }, "server-command");
    assert.equal(created.status, "created");
    // Until ticket 08's `disable`, disable it the way the module will: through Better Auth.
    await (await auth.$context).internalAdapter.updateUser(created.accountId, { disabledAt: new Date() });

    const result = await accounts.create(
      { email: "Helper@Example.org", name: "Someone else", password, kind: "admin" },
      "server-command",
    );

    assert.deepEqual(result, { status: "email-taken" });
    assert.deepEqual((await accounts.list()).map(({ name, kind }) => [name, kind]), [["Helper", "staff"]]);
  });

  test("a new Account's name is trimmed, and an empty one or one over 100 characters is refused", async () => {
    const empty = await accounts.create({ email: "empty@example.org", name: "   ", password }, "server-command");
    const tooLong = await accounts.create({ email: "long@example.org", name: "a".repeat(101), password }, "server-command");
    const longest = await accounts.create(
      { email: "longest@example.org", name: `  ${"a".repeat(100)}  `, password },
      "server-command",
    );

    assert.deepEqual(empty, { status: "invalid-name" });
    assert.deepEqual(tooLong, { status: "name-too-long", maxLength: 100 });
    assert.equal(longest.status, "created");
    assert.deepEqual((await accounts.list()).map(({ email, name }) => [email, name]), [
      ["longest@example.org", "a".repeat(100)],
    ]);
  });

  test("a new Account's name is in English: a Thai name, or one with no letter, is refused and nothing is created", async () => {
    const refused = [
      await accounts.create({ email: "somchai@example.org", name: "สมชาย ใจดี", password }, "server-command"),
      await accounts.create({ email: "napat@example.org", name: "Napat วงศา", password, kind: "admin" }, "server-command"),
      await accounts.create({ email: "kiosk-1@example.org", name: "123", password, kind: "kiosk" }, "server-command"),
    ];
    for (const [email, name] of [
      ["napat@example.org", "Napat Wongsa"],
      ["kiosk-1@example.org", "Kiosk 1"],
      ["mary-jane@example.org", "Mary-Jane O'Neil"],
      ["j.smith@example.org", "J. Smith"],
    ]) {
      assert.equal((await accounts.create({ email, name, password }, "server-command")).status, "created", name);
    }

    assert.deepEqual(refused, [
      { status: "name-not-english" },
      { status: "name-not-english" },
      { status: "name-not-english" },
    ]);
    assert.deepEqual((await accounts.list()).map(({ name }) => name), [
      "J. Smith",
      "Kiosk 1",
      "Mary-Jane O'Neil",
      "Napat Wongsa",
    ]);
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
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    const clientIp = nextClientIp();

    for (let attempt = 0; attempt < 3; attempt++) {
      assert.equal((await signIn(auth, "staff@example.org", "wrong horse battery", clientIp)).status, 401);
    }
    const limited = await signIn(auth, "staff@example.org", password, clientIp);

    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get("x-retry-after")) > 0);
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 200);
  });

  test("setting a password replaces the old one and signs the Staff Account out", async () => {
    const created = await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    assert.equal(created.status, "created");
    const signedIn = await signIn(auth, "staff@example.org", password);
    const sessionCookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.setPassword(created.accountId, "a brand new password", "server-command");

    assert.equal(result.status, "password-set");
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 401);
    assert.equal((await signIn(auth, "staff@example.org", "a brand new password")).status, 200);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: sessionCookie }) });
    assert.equal(session, null);
  });

  test("setting a Kiosk Account's password keeps it a Kiosk Account", async () => {
    const created = await accounts.create({ email: "kiosk@example.org", name: "Kiosk", password, kind: "kiosk" }, "server-command");
    assert.equal(created.status, "created");

    const result = await accounts.setPassword(created.accountId, "a brand new password", "server-command");

    assert.deepEqual(result, {
      status: "password-set",
      accountId: created.accountId,
      email: "kiosk@example.org",
      kind: "kiosk",
      staysDisabled: false,
    });
    const session = await signInAndGetSession(auth, "kiosk@example.org", "a brand new password");
    assert.equal(session?.user.kind, "kiosk");
  });

  test("setting a password under 12 characters is rejected", async () => {
    const created = await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    assert.equal(created.status, "created");

    const result = await accounts.setPassword(created.accountId, "too short", "server-command");

    assert.deepEqual(result, { status: "password-too-short", minLength: 12 });
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 200);
  });

  test("the first Admin Account can sign in with the password it was given", async () => {
    const result = await accounts.createFirst({
      email: " Organiser@Example.org ",
      name: "Organiser",
      password,
    }, "server-command");

    assert.equal(result.status, "created");
    assert.equal(result.email, "organiser@example.org");
    const session = await signInAndGetSession(auth, "organiser@example.org", password);
    assert.equal(session?.user.kind, "admin");
    assert.equal(session?.user.name, "Organiser");
  });

  test("the first Admin Account is created when only Staff and Kiosk Accounts exist", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    await accounts.create({ email: "kiosk-1@example.org", name: "Kiosk 1", password, kind: "kiosk" }, "server-command");

    const result = await accounts.createFirst({ email: "organiser@example.org", name: "Organiser", password }, "server-command");

    assert.equal(result.status, "created");
    const session = await signInAndGetSession(auth, "organiser@example.org", password);
    assert.equal(session?.user.kind, "admin");
  });

  test("the first Admin Account is skipped when an Admin Account exists, and nothing changes", async () => {
    await accounts.create({ email: "staff@example.org", name: "Admin", password, kind: "admin" }, "server-command");
    const existing = await signIn(auth, "staff@example.org", password);
    const existingCookie = existing.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.createFirst({
      email: "organiser@example.org",
      name: "Organiser",
      password: "another long password",
    }, "server-command");

    assert.deepEqual(result, { status: "admin-account-exists" });
    assert.equal((await signIn(auth, "organiser@example.org", "another long password")).status, 401);
    assert.equal((await signIn(auth, "staff@example.org", password)).status, 200);
    const session = await auth.api.getSession({ headers: new Headers({ cookie: existingCookie }) });
    assert.equal(session?.user.email, "staff@example.org");
  });

  test("the first Admin Account isn't created over a Staff Account with its email, which stays as it was", async () => {
    await accounts.create({ email: "organiser@example.org", name: "Organiser", password }, "server-command");

    const result = await accounts.createFirst({
      email: "organiser@example.org",
      name: "Organiser",
      password: "another long password",
    }, "server-command");

    assert.deepEqual(result, { status: "email-taken" });
    const session = await signInAndGetSession(auth, "organiser@example.org", password);
    assert.equal(session?.user.kind, "staff");
  });

  test("the first Admin Account refuses an invalid email or a password out of range", async () => {
    const name = "Organiser";

    assert.deepEqual(await accounts.createFirst({ email: "not-an-email", name, password }, "server-command"), {
      status: "invalid-email",
    });
    assert.deepEqual(await accounts.createFirst({ email: "organiser@example.org", name, password: "too short" }, "server-command"), {
      status: "password-too-short",
      minLength: 12,
    });
    assert.deepEqual(
      await accounts.createFirst({ email: "organiser@example.org", name, password: "x".repeat(129) }, "server-command"),
      { status: "password-too-long", maxLength: 128 },
    );
    assert.equal((await signIn(auth, "organiser@example.org", "too short")).status, 401);
  });

  test("the first Admin Account is called Admin when it is given no name, or an empty one", async () => {
    for (const name of [undefined, "", "   "]) {
      await database.reset();

      const result = await accounts.createFirst({ email: "organiser@example.org", name, password }, "server-command");

      assert.equal(result.status, "created", JSON.stringify(name));
      assert.equal((await accounts.getByEmail("organiser@example.org"))?.name, "Admin");
    }
  });

  test("the first Admin Account refuses a name that isn't in English, and creates nothing", async () => {
    const result = await accounts.createFirst({ email: "organiser@example.org", name: "เจ้าหน้าที่", password }, "server-command");

    assert.deepEqual(result, { status: "name-not-english" });
    assert.deepEqual(await accounts.list(), []);
  });

  test("the first Admin Account still reports an invalid email when an Admin Account exists", async () => {
    await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" }, "server-command");

    const result = await accounts.createFirst({ email: "organiser@example", name: "Organiser", password }, "server-command");

    assert.deepEqual(result, { status: "invalid-email" });
  });

  test("making a Staff Account an Admin signs it out everywhere, and it signs in as an Admin", async () => {
    const created = await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    const signedIn = await signIn(auth, "staff@example.org", password);
    const oldCookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.makeAdmin(" Staff@Example.org ", "server-command");

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
    await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" }, "server-command");
    const signedIn = await signIn(auth, "admin@example.org", password);
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.makeAdmin("admin@example.org", "server-command");

    assert.equal(result.status, "already-admin");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session?.user.kind, "admin");
  });

  test("making an unknown email an Admin reports it", async () => {
    assert.deepEqual(await accounts.makeAdmin("nobody@example.org", "server-command"), { status: "not-found" });
  });

  test("a Staff Account renames itself, trimmed, and keeps its sessions", async () => {
    const created = await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    const accountId = created.status === "created" ? created.accountId : "";
    const signedIn = await signIn(auth, "staff@example.org", password);
    const cookie = signedIn.headers.get("set-cookie")!.split(";")[0];

    const result = await accounts.rename(accountId, "  Somchai Jaidee  ");

    assert.deepEqual(result, { status: "renamed", name: "Somchai Jaidee" });
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.equal(session?.user.name, "Somchai Jaidee");
  });

  test("a rename to an empty name, or one over 100 characters, is refused and changes nothing", async () => {
    const created = await accounts.create({ email: "admin@example.org", name: "Admin", password, kind: "admin" }, "server-command");
    const accountId = created.status === "created" ? created.accountId : "";

    assert.deepEqual(await accounts.rename(accountId, "   "), { status: "invalid-name" });
    assert.deepEqual(await accounts.rename(accountId, "a".repeat(101)), {
      status: "name-too-long",
      maxLength: 100,
    });
    assert.deepEqual(await accounts.rename(accountId, "a".repeat(100)), {
      status: "renamed",
      name: "a".repeat(100),
    });
  });

  test("a rename to a name that isn't in English is refused; an old Thai name can be saved as it is", async () => {
    const created = await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    const accountId = created.status === "created" ? created.accountId : "";

    assert.deepEqual(await accounts.rename(accountId, "สมชาย ใจดี"), { status: "name-not-english" });
    assert.deepEqual(await accounts.rename(accountId, "123"), { status: "name-not-english" });
    assert.equal((await accounts.get(accountId))?.name, "Staff");

    // A name from before the rule, as an existing Account may have.
    await (await auth.$context).internalAdapter.updateUser(accountId, { name: "สมชาย ใจดี" });
    assert.deepEqual(await accounts.rename(accountId, " สมชาย ใจดี "), { status: "renamed", name: "สมชาย ใจดี" });
    assert.deepEqual(await accounts.rename(accountId, "สมชาย Jaidee"), { status: "name-not-english" });
    assert.deepEqual(await accounts.rename(accountId, "Somchai Jaidee"), { status: "renamed", name: "Somchai Jaidee" });
  });

  test("a Kiosk Account can't be renamed by its owner", async () => {
    const created = await accounts.create({ email: "kiosk@example.org", name: "Kiosk 1", password, kind: "kiosk" }, "server-command");
    const accountId = created.status === "created" ? created.accountId : "";

    assert.deepEqual(await accounts.rename(accountId, "Kiosk 9"), { status: "not-allowed" });
    const session = await signInAndGetSession(auth, "kiosk@example.org", password);
    assert.equal(session?.user.name, "Kiosk 1");
  });

  test("setting the password of an unknown Account reports it", async () => {
    const result = await accounts.setPassword("no-such-account", "a brand new password", "server-command");

    assert.deepEqual(result, { status: "not-found" });
  });

  test("a new Account is listed enabled, with no last sign-in, and its owner must choose their own password", async () => {
    const before = new Date();
    const created = await accounts.create({ email: "Staff@Example.org", name: "Napat Wongsa", password }, "server-command");
    const after = new Date();
    assert.equal(created.status, "created");

    const [account, ...others] = await accounts.list();

    assert.deepEqual(others, []);
    const { createdAt, ...rest } = account;
    assert.deepEqual(rest, {
      id: created.accountId,
      name: "Napat Wongsa",
      email: "staff@example.org",
      kind: "staff",
      disabledAt: null,
      mustChangePassword: true,
      lastSignedInAt: null,
    });
    assert.ok(createdAt >= before && createdAt <= after, String(createdAt));
  });

  test("signing in sets an Account's last sign-in, for every kind", async () => {
    for (const kind of ["admin", "staff", "kiosk"] as const) {
      await accounts.create({ email: `${kind}@example.org`, name: kind, password, kind }, "server-command");
      const before = new Date();
      assert.equal((await signIn(auth, `${kind}@example.org`, password)).status, 200);
      const after = new Date();

      const { lastSignedInAt } = (await accounts.list()).find((account) => account.kind === kind)!;

      assert.ok(lastSignedInAt && lastSignedInAt >= before && lastSignedInAt <= after, `${kind}: ${lastSignedInAt}`);
    }
  });

  test("one Account is read by its id, as the list shows it, and an unknown id is not found", async () => {
    const created = await accounts.create({ email: "kiosk-1@example.org", name: "Kiosk 1", password, kind: "kiosk" }, "server-command");
    assert.equal(created.status, "created");
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");
    await signIn(auth, "kiosk-1@example.org", password);

    const account = await accounts.get(created.accountId);

    assert.equal(account?.email, "kiosk-1@example.org");
    assert.equal(account?.kind, "kiosk");
    assert.ok(account?.lastSignedInAt instanceof Date);
    assert.deepEqual(
      account,
      (await accounts.list()).find(({ id }) => id === created.accountId),
    );
    assert.equal(await accounts.get("no-such-account"), null);
  });

  test("one Account is read by its email in any case, for the commands, and an unknown email is not found", async () => {
    const created = await accounts.create({ email: "kiosk-1@example.org", name: "Kiosk 1", password, kind: "kiosk" }, "server-command");
    assert.equal(created.status, "created");

    assert.deepEqual(await accounts.getByEmail(" Kiosk-1@Example.org "), await accounts.get(created.accountId));
    assert.equal(await accounts.getByEmail("nobody@example.org"), null);
  });

  test("the list shows enabled Accounts first, then disabled ones, each by name whatever its case", async () => {
    const ids = new Map<string, string>();
    for (const [name, kind] of [
      ["Zed Admin", "admin"],
      ["carl", "staff"],
      ["anna", "staff"],
      ["Bob", "kiosk"],
      ["Kiosk 1", "kiosk"],
    ] as const) {
      const created = await accounts.create({ email: `${name.replace(" ", "-")}@example.org`, name, password, kind }, "server-command");
      if (created.status === "created") ids.set(name, created.accountId);
    }
    // Until ticket 08's `disable`, disable two Accounts the way the module will: through Better Auth.
    const ctx = await auth.$context;
    for (const name of ["carl", "Bob"]) await ctx.internalAdapter.updateUser(ids.get(name)!, { disabledAt: new Date() });

    const listed = await accounts.list();

    assert.deepEqual(
      listed.map(({ name, disabledAt }) => [name, disabledAt instanceof Date]),
      [
        ["anna", false],
        ["Kiosk 1", false],
        ["Zed Admin", false],
        ["Bob", true],
        ["carl", true],
      ],
    );
  });

  test("the list has every Account, beyond Better Auth's default of 100 rows", async () => {
    // Without passwords, through Better Auth, so 101 Accounts are quick to make.
    const ctx = await auth.$context;
    for (let n = 1; n <= 101; n++) {
      await ctx.internalAdapter.createUser(
        { email: `kiosk-${n}@example.org`, name: `Kiosk ${n}`, kind: "kiosk" },
        { method: "email-password" },
      );
    }

    assert.equal((await accounts.list()).length, 101);
  });

  test("the session carries the Account's forced-change flag, disabled time and last sign-in", async () => {
    await accounts.create({ email: "staff@example.org", name: "Staff", password }, "server-command");

    const session = await signInAndGetSession(auth, "staff@example.org", password);

    assert.equal(session?.user.mustChangePassword, true);
    assert.equal(session?.user.disabledAt ?? null, null);
    assert.ok(session?.user.lastSignedInAt instanceof Date);
  });
});

describe("Accounts: Account History", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: StaffAuth;
  let accounts: Accounts;

  before(async () => {
    database = await createTestDatabase();
    auth = createStaffAuth({ db: database.db, secret: "test-secret-".repeat(4), baseURL });
    accounts = createAccounts(auth, database.db);
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  /** The id of an Account the server command creates. */
  async function createAccount(email: string, name: string, kind: AccountKind = "staff") {
    const created = await accounts.create({ email, name, password, kind }, "server-command");
    assert.equal(created.status, "created");
    return created.accountId;
  }

  /** Every change, newest first, without its id and time. */
  async function changes(accountId?: string) {
    const { changes } = await accounts.history({ accountId, page: 1 });
    return changes.map(({ account, change, actor }) => ({ account: account.id, change, actor }));
  }

  test("creating an Account records it with its kind and who created it, newest first", async () => {
    const before = new Date();
    const adminId = await createAccount("admin@example.org", "Napat Wongsa", "admin");
    const created = await accounts.create(
      { email: "kiosk-1@example.org", name: "Kiosk 1", password, kind: "kiosk" },
      { accountId: adminId },
    );
    assert.equal(created.status, "created");
    const after = new Date();

    const history = await accounts.history({ page: 1 });

    assert.equal(history.total, 2);
    assert.deepEqual(
      history.changes.map(({ account, change, actor }) => ({ account, change, actor })),
      [
        {
          account: { id: created.accountId, name: "Kiosk 1", email: "kiosk-1@example.org" },
          change: { action: "created", details: { kind: "kiosk" } },
          actor: { accountId: adminId, name: "Napat Wongsa" },
        },
        {
          account: { id: adminId, name: "Napat Wongsa", email: "admin@example.org" },
          change: { action: "created", details: { kind: "admin" } },
          actor: "server-command",
        },
      ],
    );
    for (const { changedAt } of history.changes) {
      assert.ok(changedAt >= before && changedAt <= after, String(changedAt));
    }
  });

  test("an Admin creating an Account of each kind records it with that Admin; a refused one records nothing", async () => {
    const adminId = await createAccount("admin@example.org", "Napat Wongsa", "admin");
    const byAdmin = { accountId: adminId };
    const created = new Map<AccountKind, string>();
    for (const kind of ["staff", "admin", "kiosk"] as const) {
      const result = await accounts.create({ email: `new-${kind}@example.org`, name: `New ${kind}`, password, kind }, byAdmin);
      assert.equal(result.status, "created");
      created.set(kind, result.accountId);
    }

    const refused = [
      await accounts.create({ email: "not an email", name: "Someone", password }, byAdmin),
      await accounts.create({ email: "NEW-KIOSK@example.org", name: "Someone", password }, byAdmin),
      await accounts.create({ email: "someone@example.org", name: " ", password }, byAdmin),
      await accounts.create({ email: "someone@example.org", name: "a".repeat(101), password }, byAdmin),
      await accounts.create({ email: "someone@example.org", name: "สมชาย ใจดี", password }, byAdmin),
      await accounts.create({ email: "someone@example.org", name: "Someone", password: "too short" }, byAdmin),
      await accounts.create({ email: "someone@example.org", name: "Someone", password: "x".repeat(129) }, byAdmin),
    ];

    assert.deepEqual(
      refused.map(({ status }) => status),
      [
        "invalid-email",
        "email-taken",
        "invalid-name",
        "name-too-long",
        "name-not-english",
        "password-too-short",
        "password-too-long",
      ],
    );
    const admin = { accountId: adminId, name: "Napat Wongsa" };
    assert.deepEqual(await changes(), [
      { account: created.get("kiosk"), change: { action: "created", details: { kind: "kiosk" } }, actor: admin },
      { account: created.get("admin"), change: { action: "created", details: { kind: "admin" } }, actor: admin },
      { account: created.get("staff"), change: { action: "created", details: { kind: "staff" } }, actor: admin },
      { account: adminId, change: { action: "created", details: { kind: "admin" } }, actor: "server-command" },
    ]);
    // The Admin chose the password, so Staff and Admin owners choose their own; a Kiosk never does.
    const flags = await Promise.all(
      (["staff", "admin", "kiosk"] as const).map(async (kind) => (await accounts.get(created.get(kind)!))?.mustChangePassword),
    );
    assert.deepEqual(flags, [true, true, false]);
    assert.equal((await accounts.list()).length, 4);
  });

  test("the first Admin Account is recorded as created by the server command, and a skipped one records nothing", async () => {
    const first = await accounts.createFirst({ email: "organiser@example.org", name: "Organiser", password }, "server-command");
    assert.equal(first.status, "created");

    const skipped = await accounts.createFirst({ email: "second@example.org", name: "Second", password }, "server-command");

    assert.equal(skipped.status, "admin-account-exists");
    assert.deepEqual(await changes(), [
      { account: first.accountId, change: { action: "created", details: { kind: "admin" } }, actor: "server-command" },
    ]);
  });

  test("setting a password records that it was set, and a refused one records nothing", async () => {
    const staffId = await createAccount("staff@example.org", "Staff");

    const reset = await accounts.setPassword(staffId, "a brand new password", "server-command");
    const tooShort = await accounts.setPassword(staffId, "too short", "server-command");
    const unknown = await accounts.setPassword("no-such-account", "a brand new password", "server-command");
    const own = await accounts.setPassword(staffId, "a brand new password", { accountId: staffId });

    assert.equal(reset.status, "password-set");
    assert.equal(tooShort.status, "password-too-short");
    assert.equal(unknown.status, "not-found");
    assert.equal(own.status, "own-account");
    assert.deepEqual(await changes(), [
      { account: staffId, change: { action: "password-set" }, actor: "server-command" },
      { account: staffId, change: { action: "created", details: { kind: "staff" } }, actor: "server-command" },
    ]);
  });

  test("making an Account an Admin records the kind it had, only when the kind changes", async () => {
    const kioskId = await createAccount("kiosk@example.org", "Kiosk 1", "kiosk");

    assert.equal((await accounts.makeAdmin("kiosk@example.org", "server-command")).status, "promoted");
    assert.equal((await accounts.makeAdmin("kiosk@example.org", "server-command")).status, "already-admin");
    assert.equal((await accounts.makeAdmin("nobody@example.org", "server-command")).status, "not-found");

    assert.deepEqual(await changes(), [
      { account: kioskId, change: { action: "kind-changed", details: { from: "kiosk", to: "admin" } }, actor: "server-command" },
      { account: kioskId, change: { action: "created", details: { kind: "kiosk" } }, actor: "server-command" },
    ]);
  });

  test("an owner's rename records both names with the owner as actor; a refused or unchanged one records nothing", async () => {
    const staffId = await createAccount("staff@example.org", "Somchai J");
    const kioskId = await createAccount("kiosk@example.org", "Kiosk 1", "kiosk");

    assert.equal((await accounts.rename(staffId, "  Somchai Jaidee ")).status, "renamed");
    assert.equal((await accounts.rename(staffId, "Somchai Jaidee")).status, "renamed");
    assert.equal((await accounts.rename(staffId, "   ")).status, "invalid-name");
    assert.equal((await accounts.rename(staffId, "สมชาย ใจดี")).status, "name-not-english");
    assert.equal((await accounts.rename(kioskId, "Kiosk 9")).status, "not-allowed");

    assert.deepEqual(await changes(staffId), [
      {
        account: staffId,
        change: { action: "name-changed", details: { from: "Somchai J", to: "Somchai Jaidee" } },
        actor: { accountId: staffId, name: "Somchai Jaidee" },
      },
      { account: staffId, change: { action: "created", details: { kind: "staff" } }, actor: "server-command" },
    ]);
    assert.equal((await changes(kioskId)).length, 1);
  });

  /** The owner changes their own password at Better Auth's endpoint, as My Account does from the browser. */
  async function changeOwnPassword(email: string, currentPassword: string, newPassword: string) {
    const cookie = (await signIn(auth, email, password)).headers.get("set-cookie")!.split(";")[0];
    return auth.handler(
      new Request(`${baseURL}/api/auth/change-password`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL, "x-real-ip": nextClientIp(), cookie },
        body: JSON.stringify({ currentPassword, newPassword, revokeOtherSessions: true }),
      }),
    );
  }

  test("an owner's own password change records it with the owner as actor; a failed or refused one records nothing", async () => {
    const adminId = await createAccount("admin@example.org", "Napat Wongsa", "admin");
    const kioskId = await createAccount("kiosk@example.org", "Kiosk 1", "kiosk");

    const wrongCurrent = await changeOwnPassword("admin@example.org", "wrong horse battery", "a brand new password");
    const kiosk = await changeOwnPassword("kiosk@example.org", password, "a brand new password");
    const changed = await changeOwnPassword("admin@example.org", password, "a brand new password");

    assert.equal(wrongCurrent.status, 400);
    assert.equal(kiosk.status, 403);
    assert.equal(changed.status, 200);
    assert.deepEqual(await changes(adminId), [
      { account: adminId, change: { action: "password-changed" }, actor: { accountId: adminId, name: "Napat Wongsa" } },
      { account: adminId, change: { action: "created", details: { kind: "admin" } }, actor: "server-command" },
    ]);
    assert.equal((await changes(kioskId)).length, 1);
  });

  test("the history comes 50 changes a page, newest first, with the total, for everyone or one Account", async () => {
    const staffId = await createAccount("staff@example.org", "Name 0");
    const otherId = await createAccount("other@example.org", "Other");
    for (let n = 1; n <= 55; n++) await accounts.rename(staffId, `Name ${n}`);
    const renames = Array.from({ length: 55 }, (_, index) => ({
      action: "name-changed",
      details: { from: `Name ${54 - index}`, to: `Name ${55 - index}` },
    }));
    const newestFirst = [
      ...renames,
      { action: "created", details: { kind: "staff" } }, // Other
      { action: "created", details: { kind: "staff" } }, // Staff
    ];

    const pages = [1, 2, 3].map((page) => accounts.history({ page }));
    const [first, second, third] = await Promise.all(pages);

    assert.deepEqual(
      [first, second, third].map(({ changes, total, page, pageSize }) => ({ shown: changes.length, total, page, pageSize })),
      [
        { shown: 50, total: 57, page: 1, pageSize: 50 },
        { shown: 7, total: 57, page: 2, pageSize: 50 },
        { shown: 0, total: 57, page: 3, pageSize: 50 },
      ],
    );
    assert.deepEqual(
      [...first.changes, ...second.changes].map(({ change }) => change),
      newestFirst,
    );
    assert.deepEqual(
      second.changes.slice(-2).map(({ account }) => account.id),
      [otherId, staffId],
    );

    const staffSecondPage = await accounts.history({ accountId: staffId, page: 2 });
    assert.equal(staffSecondPage.total, 56);
    assert.deepEqual(
      staffSecondPage.changes.map(({ change }) => change),
      [...renames.slice(50), { action: "created", details: { kind: "staff" } }],
    );
    assert.deepEqual(await changes(otherId), [
      { account: otherId, change: { action: "created", details: { kind: "staff" } }, actor: "server-command" },
    ]);
    assert.equal((await accounts.history({ accountId: "no-such-account", page: 1 })).total, 0);
  });

  test("a page below 1, or not a whole number, reads as the first page", async () => {
    await createAccount("staff@example.org", "Staff");

    for (const page of [0, -2, 1.5, Number.NaN]) {
      const history = await accounts.history({ page });
      assert.equal(history.page, 1, String(page));
      assert.equal(history.changes.length, 1, String(page));
    }
  });

  test("no record holds a password or its hash", async () => {
    const first = await accounts.createFirst({ email: "admin@example.org", name: "Admin", password }, "server-command");
    assert.equal(first.status, "created");
    const staffId = await createAccount("staff@example.org", "Staff");
    await accounts.setPassword(staffId, "the password an Admin set", { accountId: first.accountId });
    await accounts.makeAdmin("staff@example.org", "server-command");
    await accounts.rename(staffId, "Staff Member");
    const hashesBefore = await database.db.select({ hash: credentials.password }).from(credentials);
    assert.equal((await changeOwnPassword("admin@example.org", password, "the owner's own password")).status, 200);
    const hashesAfter = await database.db.select({ hash: credentials.password }).from(credentials);

    const { changes, total } = await accounts.history({ page: 1 });

    assert.equal(total, 6);
    const recorded = JSON.stringify(changes);
    for (const secret of [
      password,
      "the password an Admin set",
      "the owner's own password",
      ...[...hashesBefore, ...hashesAfter].map(({ hash }) => hash!),
    ]) {
      assert.ok(!recorded.includes(secret), secret);
    }
    assert.ok(!/password"\s*:/i.test(recorded), recorded);
  });
});

describe("Accounts: signed-in devices", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: StaffAuth;
  let accounts: Accounts;

  before(async () => {
    database = await createTestDatabase();
    auth = createStaffAuth({ db: database.db, secret: "test-secret-".repeat(4), baseURL });
    accounts = createAccounts(auth, database.db);
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
    const created = await accounts.create({ email, name: "Staff", password }, "server-command");
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

  /** Signs in as one more device, and returns its session and the cookie its browser keeps. */
  async function signInDevice(email: string) {
    const response = await signIn(auth, email, password);
    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie")!.split(";")[0];
    const signedIn = await auth.api.getSession({ headers: new Headers({ cookie }) });
    assert.ok(signedIn);
    return { session: signedIn.session, cookie };
  }

  /** Whether the device holding this cookie is still signed in on its next request. */
  async function isSignedIn(cookie: string) {
    return (await auth.api.getSession({ headers: new Headers({ cookie }) })) !== null;
  }

  test("signing out another device ends its session, and only its own", async () => {
    const accountId = await createStaff("staff@example.org");
    const thisDevice = await signInDevice("staff@example.org");
    const lostPhone = await signInDevice("staff@example.org");
    const laptop = await signInDevice("staff@example.org");

    const result = await accounts.signOutDevice(accountId, lostPhone.session.id, thisDevice.session.id);

    assert.deepEqual(result, { status: "device-signed-out" });
    assert.equal(await isSignedIn(lostPhone.cookie), false);
    assert.equal(await isSignedIn(thisDevice.cookie), true);
    assert.equal(await isSignedIn(laptop.cookie), true);
  });

  test("this device isn't signed out from the list: it's not found, and stays signed in", async () => {
    const accountId = await createStaff("staff@example.org");
    const thisDevice = await signInDevice("staff@example.org");

    const result = await accounts.signOutDevice(accountId, thisDevice.session.id, thisDevice.session.id);

    assert.deepEqual(result, { status: "not-found" });
    assert.equal(await isSignedIn(thisDevice.cookie), true);
  });

  test("another Account's device can't be signed out: it's not found, and stays signed in", async () => {
    const accountId = await createStaff("staff@example.org");
    await createStaff("someone-else@example.org");
    const thisDevice = await signInDevice("staff@example.org");
    const theirDevice = await signInDevice("someone-else@example.org");

    const result = await accounts.signOutDevice(accountId, theirDevice.session.id, thisDevice.session.id);

    assert.deepEqual(result, { status: "not-found" });
    assert.equal(await isSignedIn(theirDevice.cookie), true);
  });

  test("signing out all other devices keeps only this one, and no other Account's", async () => {
    const accountId = await createStaff("staff@example.org");
    await createStaff("someone-else@example.org");
    const phone = await signInDevice("staff@example.org");
    const thisDevice = await signInDevice("staff@example.org");
    const laptop = await signInDevice("staff@example.org");
    const theirDevice = await signInDevice("someone-else@example.org");

    const result = await accounts.signOutOtherDevices(accountId, thisDevice.session.id);

    assert.deepEqual(result, { status: "other-devices-signed-out", count: 2 });
    assert.equal(await isSignedIn(phone.cookie), false);
    assert.equal(await isSignedIn(laptop.cookie), false);
    assert.equal(await isSignedIn(thisDevice.cookie), true);
    assert.equal(await isSignedIn(theirDevice.cookie), true);
    assert.deepEqual(
      (await accounts.listDevices(accountId, thisDevice.session.id)).map(({ id }) => id),
      [thisDevice.session.id],
    );
  });

  test("listing devices and signing them out records no Account Change", async () => {
    const accountId = await createStaff("staff@example.org");
    const thisDevice = await signInDevice("staff@example.org");
    const phone = await signInDevice("staff@example.org");
    await signInDevice("staff@example.org");
    const before = await accounts.history({ accountId, page: 1 });

    await accounts.listDevices(accountId, thisDevice.session.id);
    await accounts.signOutDevice(accountId, phone.session.id, thisDevice.session.id);
    await accounts.signOutOtherDevices(accountId, thisDevice.session.id);

    assert.deepEqual(await accounts.history({ accountId, page: 1 }), before);
  });
});

describe("Accounts: a password set by someone else", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: StaffAuth;
  let accounts: Accounts;

  before(async () => {
    database = await createTestDatabase();
    auth = createStaffAuth({ db: database.db, secret: "test-secret-".repeat(4), baseURL });
    accounts = createAccounts(auth, database.db);
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  /** Whether the Account's owner must choose their own password, as the Accounts list shows it. */
  async function mustChangePassword(accountId: string) {
    return (await accounts.get(accountId))?.mustChangePassword;
  }

  test("a new Staff or Admin Account must choose its own password; a new Kiosk Account never", async () => {
    const created = new Map<AccountKind, string>();
    for (const kind of ["admin", "staff", "kiosk"] as const) {
      const result = await accounts.create({ email: `${kind}@example.org`, name: kind, password, kind }, "server-command");
      assert.equal(result.status, "created");
      created.set(kind, result.accountId);
    }

    assert.equal(await mustChangePassword(created.get("admin")!), true);
    assert.equal(await mustChangePassword(created.get("staff")!), true);
    assert.equal(await mustChangePassword(created.get("kiosk")!), false);
    assert.equal((await signInAndGetSession(auth, "staff@example.org", password))?.user.mustChangePassword, true);
    assert.equal((await signInAndGetSession(auth, "kiosk@example.org", password))?.user.mustChangePassword, false);
  });

  test("the first Admin Account, from `npm run seed`, must choose its own password", async () => {
    const first = await accounts.createFirst({ email: "organiser@example.org", name: "Organiser", password }, "server-command");
    assert.equal(first.status, "created");

    assert.equal(await mustChangePassword(first.accountId), true);
    assert.equal((await signInAndGetSession(auth, "organiser@example.org", password))?.user.mustChangePassword, true);
  });

  /** The id of a Staff or Admin Account the server command creates, so its owner must change its password. */
  async function createAccount(email: string, kind: AccountKind = "staff") {
    const created = await accounts.create({ email, name: "Napat Wongsa", password, kind }, "server-command");
    assert.equal(created.status, "created");
    return created.accountId;
  }

  /** The owner changes their own password, signed in on one device, through Better Auth as My Account does. */
  async function changeOwnPassword(email: string, currentPassword: string, newPassword: string) {
    const cookie = (await signIn(auth, email, password)).headers.get("set-cookie")!.split(";")[0];
    return auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: new Headers({ cookie }),
      asResponse: true,
    });
  }

  test("the owner choosing their own password clears it, and is recorded as changed by the owner", async () => {
    const staffId = await createAccount("staff@example.org");

    const changed = await changeOwnPassword("staff@example.org", password, "the owner's own password");

    assert.equal(changed.status, 200);
    assert.equal(await mustChangePassword(staffId), false);
    const freshCookie = changed.headers.get("set-cookie")!.split(";")[0];
    const session = await auth.api.getSession({ headers: new Headers({ cookie: freshCookie }) });
    assert.equal(session?.user.mustChangePassword, false);
    const { changes } = await accounts.history({ accountId: staffId, page: 1 });
    assert.deepEqual(
      changes.map(({ change, actor }) => ({ change, actor })),
      [
        { change: { action: "password-changed" }, actor: { accountId: staffId, name: "Napat Wongsa" } },
        { change: { action: "created", details: { kind: "staff" } }, actor: "server-command" },
      ],
    );
  });

  test("a failed change of the owner's password leaves it set", async () => {
    const adminId = await createAccount("admin@example.org", "admin");

    const wrongCurrent = await changeOwnPassword("admin@example.org", "wrong horse battery", "the owner's own password");
    const tooShort = await changeOwnPassword("admin@example.org", password, "too short");

    assert.equal(wrongCurrent.status, 400);
    assert.equal(tooShort.status, 400);
    assert.equal(await mustChangePassword(adminId), true);
  });

  test("a password set by someone else must be changed again, for Staff and Admin Accounts", async () => {
    const staffId = await createAccount("staff@example.org");
    const adminId = await createAccount("admin@example.org", "admin");
    for (const email of ["staff@example.org", "admin@example.org"]) {
      assert.equal((await changeOwnPassword(email, password, "the owner's own password")).status, 200);
    }

    assert.equal((await accounts.setPassword(staffId, password, "server-command")).status, "password-set");
    assert.equal((await accounts.setPassword(adminId, password, { accountId: staffId })).status, "password-set");

    assert.equal(await mustChangePassword(staffId), true);
    assert.equal(await mustChangePassword(adminId), true);
    assert.equal((await signInAndGetSession(auth, "staff@example.org", password))?.user.mustChangePassword, true);
  });

  test("a Kiosk Account's password set by someone else needs no change: a Kiosk keeps working", async () => {
    const kioskId = await createAccount("kiosk@example.org", "kiosk");

    await accounts.setPassword(kioskId, "a brand new password", "server-command");

    assert.equal(await mustChangePassword(kioskId), false);
    const session = await signInAndGetSession(auth, "kiosk@example.org", "a brand new password");
    assert.equal(session?.user.mustChangePassword, false);
  });

  test("making an Account an Admin, or the owner renaming it, doesn't ask for a new password", async () => {
    const staffId = await createAccount("staff@example.org");
    assert.equal((await changeOwnPassword("staff@example.org", password, "the owner's own password")).status, 200);

    assert.equal((await accounts.makeAdmin("staff@example.org", "server-command")).status, "promoted");
    assert.equal((await accounts.rename(staffId, "Somchai Jaidee")).status, "renamed");

    assert.equal(await mustChangePassword(staffId), false);
  });

  test("a refused password leaves it as it was", async () => {
    const staffId = await createAccount("staff@example.org");
    assert.equal((await changeOwnPassword("staff@example.org", password, "the owner's own password")).status, 200);

    const tooShort = await accounts.setPassword(staffId, "too short", "server-command");

    assert.equal(tooShort.status, "password-too-short");
    assert.equal(await mustChangePassword(staffId), false);
  });
});

describe("Accounts: an Admin edits an Account and sets its password", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let auth: StaffAuth;
  let accounts: Accounts;

  before(async () => {
    database = await createTestDatabase();
    auth = createStaffAuth({ db: database.db, secret: "test-secret-".repeat(4), baseURL });
    accounts = createAccounts(auth, database.db);
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  /** The id of an Account the server command creates. */
  async function createAccount(email: string, name: string, kind: AccountKind = "staff") {
    const created = await accounts.create({ email, name, password, kind }, "server-command");
    assert.equal(created.status, "created");
    return created.accountId;
  }

  /** The Admin who edits the others, and acts as `{ accountId }`. */
  async function createAdmin(email = "admin@example.org", name = "Napat Wongsa") {
    const accountId = await createAccount(email, name, "admin");
    return { accountId };
  }

  /** One Account's changes since it was created, newest first, without ids and times. */
  async function changesSinceCreated(accountId: string) {
    const { changes } = await accounts.history({ accountId, page: 1 });
    return changes
      .filter(({ change }) => change.action !== "created")
      .map(({ change, actor }) => ({ change, actor: actor === "server-command" ? actor : actor.accountId }));
  }

  /** Signs in as one more device and returns the cookie its browser keeps. */
  async function signInDevice(email: string, withPassword = password) {
    const response = await signIn(auth, email, withPassword);
    assert.equal(response.status, 200);
    return response.headers.get("set-cookie")!.split(";")[0];
  }

  /** The session the browser holding this cookie has on its next request, or null when it was ended. */
  function sessionOf(cookie: string) {
    return auth.api.getSession({ headers: new Headers({ cookie }) });
  }

  async function disable(accountId: string) {
    // Until ticket 08's `disable`, disable it the way the module will: through Better Auth.
    await (await auth.$context).internalAdapter.updateUser(accountId, { disabledAt: new Date() });
  }

  test("changing the name, email and kind saves each, records each with its old and new value, and the new email signs in", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("somchai@example.org", "Somchai J");

    const result = await accounts.update(
      staffId,
      { name: "  Somchai Jaidee ", email: " Somchai.Jaidee@Example.org ", kind: "admin" },
      admin,
    );

    assert.equal(result.status, "updated");
    const { name, email, kind } = result.status === "updated" ? result.account : ({} as never);
    assert.deepEqual({ name, email, kind }, { name: "Somchai Jaidee", email: "somchai.jaidee@example.org", kind: "admin" });
    assert.deepEqual(await accounts.get(staffId), result.status === "updated" && result.account);
    assert.deepEqual(await changesSinceCreated(staffId), [
      { change: { action: "kind-changed", details: { from: "staff", to: "admin" } }, actor: admin.accountId },
      {
        change: { action: "email-changed", details: { from: "somchai@example.org", to: "somchai.jaidee@example.org" } },
        actor: admin.accountId,
      },
      { change: { action: "name-changed", details: { from: "Somchai J", to: "Somchai Jaidee" } }, actor: admin.accountId },
    ]);
    assert.equal((await signIn(auth, "somchai@example.org", password)).status, 401);
    const session = await sessionOf(await signInDevice("somchai.jaidee@example.org"));
    assert.equal(session?.user.kind, "admin");
  });

  test("only the fields that change are saved and recorded; the same values, in any case, record nothing", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("staff@example.org", "Somchai J");

    const same = await accounts.update(staffId, { name: " Somchai J ", email: "STAFF@example.org", kind: "staff" }, admin);
    const nothing = await accounts.update(staffId, {}, admin);
    const nameOnly = await accounts.update(staffId, { name: "Somchai Jaidee", email: "staff@example.org" }, admin);
    const emailOnly = await accounts.update(staffId, { email: "somchai@example.org" }, admin);
    const kindOnly = await accounts.update(staffId, { name: "Somchai Jaidee", kind: "kiosk" }, admin);

    assert.deepEqual(
      [same, nothing, nameOnly, emailOnly, kindOnly].map(({ status }) => status),
      ["updated", "updated", "updated", "updated", "updated"],
    );
    assert.deepEqual(await changesSinceCreated(staffId), [
      { change: { action: "kind-changed", details: { from: "staff", to: "kiosk" } }, actor: admin.accountId },
      { change: { action: "email-changed", details: { from: "staff@example.org", to: "somchai@example.org" } }, actor: admin.accountId },
      { change: { action: "name-changed", details: { from: "Somchai J", to: "Somchai Jaidee" } }, actor: admin.accountId },
    ]);
  });

  test("an email any other Account has, in any case, is taken; a refused field changes nothing, not even the others", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("staff@example.org", "Staff");
    const departedId = await createAccount("departed@example.org", "Departed");
    await disable(departedId);

    const refused = [
      await accounts.update(staffId, { name: "Somchai Jaidee", email: " ADMIN@Example.org " }, admin),
      await accounts.update(staffId, { email: "Departed@example.org" }, admin),
      await accounts.update(staffId, { name: "Somchai Jaidee", email: "not an email" }, admin),
      await accounts.update(staffId, { name: "   ", email: "somchai@example.org" }, admin),
      await accounts.update(staffId, { name: "a".repeat(101), kind: "admin" }, admin),
      await accounts.update("no-such-account", { name: "Somchai Jaidee" }, admin),
    ];

    assert.deepEqual(refused, [
      { status: "email-taken" },
      { status: "email-taken" },
      { status: "invalid-email" },
      { status: "invalid-name" },
      { status: "name-too-long", maxLength: 100 },
      { status: "not-found" },
    ]);
    const staff = await accounts.get(staffId);
    assert.deepEqual([staff?.name, staff?.email, staff?.kind], ["Staff", "staff@example.org", "staff"]);
    assert.deepEqual(await changesSinceCreated(staffId), []);
    const longest = await accounts.update(staffId, { name: "a".repeat(100) }, admin);
    assert.equal(longest.status === "updated" && longest.account.name, "a".repeat(100));
  });

  test("a name that isn't in English is refused, by anyone, and nothing changes or is recorded, not even the other fields", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("staff@example.org", "Staff");

    const refused = [
      await accounts.update(staffId, { name: "สมชาย ใจดี", email: "somchai@example.org", kind: "admin" }, admin),
      await accounts.update(staffId, { name: "123" }, admin),
      await accounts.update(staffId, { name: "Somchai ใจดี" }, "server-command"),
    ];

    assert.deepEqual(refused, [{ status: "name-not-english" }, { status: "name-not-english" }, { status: "name-not-english" }]);
    const staff = await accounts.get(staffId);
    assert.deepEqual([staff?.name, staff?.email, staff?.kind], ["Staff", "staff@example.org", "staff"]);
    assert.deepEqual(await changesSinceCreated(staffId), []);
  });

  test("an Account whose old name is in Thai keeps it through an email or kind change, sent with all three fields as the page does", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("staff@example.org", "Staff");
    // A name from before the rule, as an existing Account may have.
    await (await auth.$context).internalAdapter.updateUser(staffId, { name: "สมชาย ใจดี" });

    const emailChange = await accounts.update(staffId, { name: "สมชาย ใจดี", email: "Somchai@Example.org", kind: "staff" }, admin);
    const kindChange = await accounts.update(staffId, { name: " สมชาย ใจดี ", email: "somchai@example.org", kind: "admin" }, admin);

    assert.deepEqual([emailChange.status, kindChange.status], ["updated", "updated"]);
    const account = await accounts.get(staffId);
    assert.deepEqual([account?.name, account?.email, account?.kind], ["สมชาย ใจดี", "somchai@example.org", "admin"]);
    assert.deepEqual(await changesSinceCreated(staffId), [
      { change: { action: "kind-changed", details: { from: "staff", to: "admin" } }, actor: admin.accountId },
      { change: { action: "email-changed", details: { from: "staff@example.org", to: "somchai@example.org" } }, actor: admin.accountId },
    ]);
  });

  test("an Admin can't change their own kind, but can change their own name and email; the server command can change it", async () => {
    const admin = await createAdmin();
    await createAdmin("second-admin@example.org", "Mary-Jane O'Neil");

    const ownKind = await accounts.update(admin.accountId, { name: "Napat W", kind: "staff" }, admin);
    const sameKind = await accounts.update(
      admin.accountId,
      { name: "Napat W", email: "napat@example.org", kind: "admin" },
      admin,
    );
    const byCommand = await accounts.update(admin.accountId, { kind: "staff" }, "server-command");

    assert.deepEqual(ownKind, { status: "own-kind" });
    assert.equal(sameKind.status, "updated");
    assert.equal(byCommand.status, "updated");
    assert.deepEqual(await changesSinceCreated(admin.accountId), [
      { change: { action: "kind-changed", details: { from: "admin", to: "staff" } }, actor: "server-command" },
      { change: { action: "email-changed", details: { from: "admin@example.org", to: "napat@example.org" } }, actor: admin.accountId },
      { change: { action: "name-changed", details: { from: "Napat Wongsa", to: "Napat W" } }, actor: admin.accountId },
    ]);
  });

  test("the last enabled Admin can't be demoted, by anyone; a disabled Admin doesn't count, and can be demoted", async () => {
    const lastAdminId = await createAccount("admin@example.org", "Napat Wongsa", "admin");
    const staffId = await createAccount("staff@example.org", "Staff");
    const disabledAdminId = await createAccount("disabled-admin@example.org", "Disabled Admin", "admin");
    await disable(disabledAdminId);

    const refused = [
      await accounts.update(lastAdminId, { kind: "staff" }, "server-command"),
      await accounts.update(lastAdminId, { kind: "kiosk" }, { accountId: staffId }),
      await accounts.update(lastAdminId, { name: "Napat W", kind: "staff" }, { accountId: disabledAdminId }),
    ];
    const demotedDisabled = await accounts.update(disabledAdminId, { kind: "staff" }, "server-command");

    assert.deepEqual(
      refused.map(({ status }) => status),
      ["last-enabled-admin", "last-enabled-admin", "last-enabled-admin"],
    );
    assert.equal(demotedDisabled.status, "updated");
    assert.equal((await accounts.get(lastAdminId))?.name, "Napat Wongsa");
    assert.deepEqual(await changesSinceCreated(lastAdminId), []);

    await createAccount("second-admin@example.org", "Mary-Jane O'Neil", "admin");
    assert.equal((await accounts.update(lastAdminId, { kind: "staff" }, "server-command")).status, "updated");
    assert.equal((await accounts.get(lastAdminId))?.kind, "staff");
  });

  test("a kind change signs the Account out everywhere; a name or email change keeps it signed in", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("staff@example.org", "Staff");
    const phone = await signInDevice("staff@example.org");
    const laptop = await signInDevice("staff@example.org");

    await accounts.update(staffId, { name: "Somchai Jaidee", email: "somchai@example.org" }, admin);

    const session = await sessionOf(phone);
    assert.deepEqual([session?.user.name, session?.user.email], ["Somchai Jaidee", "somchai@example.org"]);
    assert.ok(await sessionOf(laptop));

    assert.equal((await accounts.update(staffId, { kind: "admin" }, admin)).status, "updated");

    assert.equal(await sessionOf(phone), null);
    assert.equal(await sessionOf(laptop), null);
    assert.equal((await sessionOf(await signInDevice("somchai@example.org")))?.user.kind, "admin");
  });

  test("a kind change keeps a Kiosk unflagged, and a Kiosk made Staff or Admin must choose its own password", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("staff@example.org", "Staff");
    const kioskId = await createAccount("kiosk@example.org", "Kiosk 1", "kiosk");
    const mustChangePassword = async (accountId: string) => (await accounts.get(accountId))?.mustChangePassword;

    // A flagged Staff Account made a Kiosk: a Kiosk never has to choose its own.
    assert.equal(await mustChangePassword(staffId), true);
    await accounts.update(staffId, { kind: "kiosk" }, admin);
    assert.equal(await mustChangePassword(staffId), false);

    // A Kiosk's password was chosen by an Admin or the command, so its new owner chooses their own.
    await accounts.update(kioskId, { kind: "staff" }, admin);
    assert.equal(await mustChangePassword(kioskId), true);
    assert.equal((await sessionOf(await signInDevice("kiosk@example.org")))?.user.mustChangePassword, true);

    // Between Staff and Admin it stays as it was.
    await (await auth.$context).internalAdapter.updateUser(kioskId, { mustChangePassword: false });
    await accounts.update(kioskId, { kind: "admin" }, admin);
    assert.equal(await mustChangePassword(kioskId), false);

    // `make-admin` on a Kiosk, likewise.
    const secondKioskId = await createAccount("kiosk-2@example.org", "Kiosk 2", "kiosk");
    assert.equal((await accounts.makeAdmin("kiosk-2@example.org", "server-command")).status, "promoted");
    assert.equal(await mustChangePassword(secondKioskId), true);
  });

  test("setting a password signs the Account out everywhere, its new password signs in, and Staff and Admin owners must change it", async () => {
    const admin = await createAdmin();
    for (const kind of ["staff", "admin", "kiosk"] as const) {
      const email = `the-${kind}@example.org`;
      const accountId = await createAccount(email, `The ${kind}`, kind);
      const signedIn = await signInDevice(email);

      const result = await accounts.setPassword(accountId, "the password an Admin set", admin);

      assert.deepEqual(result, { status: "password-set", accountId, email, kind, staysDisabled: false }, kind);
      assert.equal(await sessionOf(signedIn), null, kind);
      assert.equal((await signIn(auth, email, password)).status, 401, kind);
      const session = await sessionOf(await signInDevice(email, "the password an Admin set"));
      assert.equal(session?.user.kind, kind);
      // Someone else chose it, so its owner chooses their own; a Kiosk never does.
      assert.equal((await accounts.get(accountId))?.mustChangePassword, kind !== "kiosk", kind);
      assert.deepEqual(await changesSinceCreated(accountId), [{ change: { action: "password-set" }, actor: admin.accountId }], kind);
    }
  });

  test("an Admin can't set their own password here, and stays as they were; the server command can", async () => {
    const admin = await createAdmin();
    const signedIn = await signInDevice("admin@example.org");

    const own = await accounts.setPassword(admin.accountId, "the password an Admin set", admin);

    assert.deepEqual(own, { status: "own-account" });
    assert.ok(await sessionOf(signedIn));
    assert.equal((await signIn(auth, "admin@example.org", "the password an Admin set")).status, 401);
    assert.deepEqual(await changesSinceCreated(admin.accountId), []);

    const byCommand = await accounts.setPassword(admin.accountId, "the password an Admin set", "server-command");

    assert.equal(byCommand.status, "password-set");
    assert.equal(await sessionOf(signedIn), null);
    assert.equal((await signIn(auth, "admin@example.org", "the password an Admin set")).status, 200);
  });

  test("setting a disabled Account's password leaves it disabled, and says so", async () => {
    const admin = await createAdmin();
    const staffId = await createAccount("staff@example.org", "Staff");
    await disable(staffId);
    const disabledAt = (await accounts.get(staffId))?.disabledAt;
    assert.ok(disabledAt instanceof Date);

    const result = await accounts.setPassword(staffId, "the password an Admin set", admin);

    assert.equal(result.status === "password-set" && result.staysDisabled, true);
    assert.deepEqual((await accounts.get(staffId))?.disabledAt, disabledAt);
  });
});
