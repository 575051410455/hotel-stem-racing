import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultActivityDay,
  parseActivityView,
  activityViewParams,
  parseActivityRequest,
} from "./check-in-activity-view";

test("Check-In Activity links resolve a Bangkok Event Day and preserve a complete filtered view", () => {
  assert.equal(
    defaultActivityDay(new Date("2026-10-29T12:00:00+07:00")),
    "2026-10-30",
  );
  assert.equal(defaultActivityDay(new Date("2026-10-30T12:00:00+07:00")), "2026-10-30");
  assert.equal(defaultActivityDay(new Date("2026-10-30T17:00:00Z")), "2026-10-31");
  assert.equal(
    defaultActivityDay(new Date("2026-10-31T17:00:00Z")),
    "2026-11-01",
  );
  assert.equal(
    defaultActivityDay(new Date("2026-11-02T00:00:00+07:00")),
    "2026-11-01",
  );
  const view = parseActivityView(
    new URLSearchParams(
      "day=2026-11-01&q=Alice&role=parent&account=desk-1&outside=false&page=2&pageSize=50",
    ),
    "2026-10-31",
  );
  assert.deepEqual(view, {
    day: "2026-11-01",
    q: "Alice",
    role: "parent",
    account: "desk-1",
    outside: false,
    page: 2,
    pageSize: 50,
  });
  assert.deepEqual(
    parseActivityView(activityViewParams(view), "2026-10-31"),
    view,
  );
  assert.equal(
    activityViewParams(
      parseActivityView(new URLSearchParams(), "2026-10-31"),
    ).get("day"),
    "2026-10-31",
  );
});

test("malformed links recover per field while the API rejects invalid known parameters", () => {
  const invalid = new URLSearchParams(
    "day=bad&role=unknown&outside=no&account=&page=-1&pageSize=1000000",
  );
  assert.deepEqual(parseActivityView(invalid, "2026-11-01"), {
    day: "2026-11-01",
    role: undefined,
    outside: undefined,
    page: 1,
    pageSize: 25,
  });
  assert.equal(parseActivityRequest(invalid).success, false);
  assert.equal(
    parseActivityRequest(
      new URLSearchParams("day=2026-10-31&outside=false&pageSize=100"),
    ).success,
    true,
  );
  assert.equal(
    parseActivityRequest(new URLSearchParams("day=2026-10-31&page=1e30"))
      .success,
    false,
  );
  assert.equal(parseActivityRequest(new URLSearchParams()).success, false);
  assert.equal(parseActivityRequest(new URLSearchParams("day=2026-10-30")).success, true);
});
