import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, test } from "node:test";
import { createTestDatabase } from "@/test-support/database";
import { createRegistrations } from "./registrations";

describe("Registration module", () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let registrations: ReturnType<typeof createRegistrations>;

  before(async () => {
    database = await createTestDatabase();
    registrations = createRegistrations({ db: database.db });
  });

  beforeEach(async () => {
    await database.reset();
  });

  after(async () => {
    await database.drop();
  });

  test("reports an unknown Event Pass token as not found", async () => {
    const result = await registrations.getEventPass(randomUUID());

    assert.deepEqual(result, { status: "not-found" });
  });

  test("reports a malformed Event Pass token as not found", async () => {
    const result = await registrations.getEventPass("EP-NOT-A-TOKEN");

    assert.deepEqual(result, { status: "not-found" });
  });
});
