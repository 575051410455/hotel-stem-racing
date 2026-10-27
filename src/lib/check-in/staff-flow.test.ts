import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createStaffCheckInFlow, staffCheckInFlow } from "./staff-flow";

const day = "2026-10-31";
const preview = {
  status: "ready" as const,
  eventDay: day,
  outsideRegisteredDay: false,
  attendee: {
    givenName: "Somchai",
    familyName: "Jaidee",
    role: "parent" as const,
    passCode: "EP-7KQ2MZ9H",
    eventDays: [day],
  },
};

describe("Staff Check-In flow", () => {
  test("scanning only inspects, holds one Attendee and reviewed day, and can cancel before confirmation", () => {
    const initial = createStaffCheckInFlow(day);
    const inspecting = staffCheckInFlow(initial, {
      type: "scan",
      source: "manual",
      scan: preview.attendee.passCode,
      now: 0,
    });
    assert.equal(inspecting.step.kind, "inspecting");
    assert.equal(
      staffCheckInFlow(inspecting, { type: "scan", source: "manual", scan: "EP-ABCDEFGH", now: 1 }).step,
      inspecting.step,
    );
    const reviewing = staffCheckInFlow(inspecting, {
      type: "inspected",
      id: inspecting.sequence,
      result: preview,
    });
    assert.equal(reviewing.step.kind, "preview");
    assert.equal(staffCheckInFlow(reviewing, { type: "choose-day", day: "2026-11-01" }), reviewing);
    const cancelled = staffCheckInFlow(reviewing, { type: "clear" });
    assert.equal(cancelled.step.kind, "ready");
    assert.equal(cancelled.lastResult, null);
    const confirming = staffCheckInFlow(reviewing, { type: "confirm" });
    assert.equal(confirming.step.kind, "confirming");
    assert.equal(staffCheckInFlow(confirming, { type: "confirm" }), confirming);
    assert.equal(staffCheckInFlow(confirming, { type: "clear" }), confirming);
  });

  test("an uncertain confirmation holds the reviewed item for retry and ignores late responses", () => {
    let flow = staffCheckInFlow(createStaffCheckInFlow(day), {
      type: "scan",
      source: "manual",
      scan: preview.attendee.passCode,
      now: 0,
    });
    flow = staffCheckInFlow(flow, { type: "inspected", id: flow.sequence, result: preview });
    flow = staffCheckInFlow(flow, { type: "confirm" });
    const firstId = flow.sequence;
    flow = staffCheckInFlow(flow, { type: "failed", id: firstId });
    assert.equal(flow.step.kind, "uncertain");
    if (flow.step.kind !== "uncertain") assert.fail("The confirmation must remain uncertain");
    assert.equal(flow.step.preview.eventDay, day);
    assert.equal(flow.step.scan, preview.attendee.passCode);
    assert.equal(staffCheckInFlow(flow, { type: "clear" }), flow);
    flow = staffCheckInFlow(flow, { type: "confirm" });
    assert.ok(flow.sequence > firstId);
    const original = {
      status: "already-checked-in" as const,
      eventDay: day,
      attendee: preview.attendee,
      checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
      outsideRegisteredDay: false,
    };
    assert.equal(staffCheckInFlow(flow, { type: "confirmed", id: firstId, result: original }), flow);
    flow = staffCheckInFlow(flow, { type: "confirmed", id: flow.sequence, result: original });
    assert.equal(flow.step.kind, "result");
    if (flow.step.kind === "result") assert.equal(flow.step.result.status, "already-checked-in");
    assert.equal(staffCheckInFlow(flow, { type: "clear" }).step.kind, "ready");
  });

  test("a handled QR stays suppressed in view, a different waiting Attendee is accepted, and removal rearms it", () => {
    let flow = staffCheckInFlow(createStaffCheckInFlow(day), {
      type: "scan",
      source: "camera",
      scan: preview.attendee.passCode,
      now: 0,
    });
    flow = staffCheckInFlow(flow, { type: "inspected", id: flow.sequence, result: preview });
    flow = staffCheckInFlow(flow, { type: "scan", source: "camera", scan: "EP-ABCDEFGH", now: 100 });
    assert.equal(flow.step.kind, "preview");
    flow = staffCheckInFlow(flow, { type: "confirm" });
    flow = staffCheckInFlow(flow, {
      type: "confirmed",
      id: flow.sequence,
      result: {
        status: "checked-in",
        eventDay: day,
        attendee: preview.attendee,
        checkedInAt: new Date("2026-10-31T09:00:00+07:00"),
      },
    });
    assert.equal(flow.step.kind, "ready");
    flow = staffCheckInFlow(flow, { type: "scan", source: "camera", scan: "ep 7kq2 mz9h", now: 200 });
    assert.equal(flow.step.kind, "ready");
    assert.equal(flow.lastResult?.status, "checked-in");
    flow = staffCheckInFlow(flow, { type: "scan", source: "camera", scan: "EP-ABCDEFGH", now: 210 });
    assert.equal(flow.step.kind, "inspecting");
    assert.equal(flow.lastResult, null);
    flow = staffCheckInFlow(flow, {
      type: "inspected",
      id: flow.sequence,
      result: { ...preview, attendee: { ...preview.attendee, passCode: "EP-ABCDEFGH" } },
    });
    flow = staffCheckInFlow(flow, { type: "clear" });
    flow = staffCheckInFlow(flow, { type: "scan", source: "camera", scan: "EP-ABCDEFGH", now: 300 });
    assert.equal(flow.step.kind, "ready");
    flow = staffCheckInFlow(flow, { type: "scan", source: "camera", scan: "EP-ABCDEFGH", now: 2_000 });
    assert.equal(flow.step.kind, "inspecting");
  });
  test("camera and manual entry share inspection, and stale inspection cannot overwrite a newer item", () => {
    const initial = createStaffCheckInFlow(null);
    const chosen = staffCheckInFlow(initial, { type: "choose-day", day });
    const manual = staffCheckInFlow(chosen, { type: "scan", source: "manual", scan: "EP-7KQ2MZ9H", now: 0 });
    assert.deepEqual(
      manual,
      staffCheckInFlow(chosen, { type: "scan", source: "camera", scan: "EP-7KQ2MZ9H", now: 0 }),
    );
    assert.equal(manual.step.kind, "inspecting");
    if (manual.step.kind === "inspecting") assert.equal(manual.step.requestedDay, day);
    const failed = staffCheckInFlow(manual, { type: "failed", id: manual.sequence });
    const cleared = staffCheckInFlow(failed, { type: "clear" });
    const next = staffCheckInFlow(cleared, { type: "scan", source: "manual", scan: "EP-ABCDEFGH", now: 1 });
    assert.equal(staffCheckInFlow(next, { type: "inspected", id: manual.sequence, result: preview }), next);
  });

  test("inspection can retry without writing; invalid and no-day outcomes offer only Scan next", () => {
    let flow = staffCheckInFlow(createStaffCheckInFlow(day), {
      type: "scan",
      source: "manual",
      scan: "bad pass",
      now: 0,
    });
    flow = staffCheckInFlow(flow, { type: "failed", id: flow.sequence });
    assert.equal(flow.step.kind, "result");
    assert.equal(staffCheckInFlow(flow, { type: "confirm" }), flow);
    flow = staffCheckInFlow(flow, { type: "retry-inspection" });
    assert.equal(flow.step.kind, "inspecting");
    if (flow.step.kind === "inspecting") assert.equal(flow.step.scan, "bad pass");
    for (const result of [
      { status: "not-an-event-pass" } as const,
      { status: "not-an-event-day" } as const,
    ]) {
      const terminal = staffCheckInFlow(flow, { type: "inspected", id: flow.sequence, result });
      assert.equal(terminal.step.kind, "result");
      assert.equal(staffCheckInFlow(terminal, { type: "confirm" }), terminal);
      assert.equal(staffCheckInFlow(terminal, { type: "clear" }).step.kind, "ready");
    }
  });

  test("session expiry during inspection or confirmation blocks all input and replay", () => {
    const inspecting = staffCheckInFlow(createStaffCheckInFlow(day), {
      type: "scan",
      source: "manual",
      scan: preview.attendee.passCode,
      now: 0,
    });
    const reviewing = staffCheckInFlow(inspecting, {
      type: "inspected",
      id: inspecting.sequence,
      result: preview,
    });
    const confirming = staffCheckInFlow(reviewing, { type: "confirm" });
    const expired = [
      staffCheckInFlow(inspecting, {
        type: "inspected",
        id: inspecting.sequence,
        result: { status: "signed-out" },
      }),
      staffCheckInFlow(confirming, {
        type: "confirmed",
        id: confirming.sequence,
        result: { status: "signed-out" },
      }),
    ];
    for (const flow of expired) {
      assert.equal(flow.step.kind, "signed-out");
      assert.equal(staffCheckInFlow(flow, { type: "confirm" }), flow);
      assert.equal(staffCheckInFlow(flow, { type: "clear" }), flow);
      assert.equal(
        staffCheckInFlow(flow, { type: "scan", source: "manual", scan: preview.attendee.passCode, now: 1 }),
        flow,
      );
    }
    assert.equal(createStaffCheckInFlow(day).step.kind, "ready");
  });

  test("a long review keeps refreshing a held QR and cancellation does not immediately reopen it", () => {
    let flow = staffCheckInFlow(createStaffCheckInFlow(day), {
      type: "scan",
      source: "camera",
      scan: preview.attendee.passCode,
      now: 0,
    });
    flow = staffCheckInFlow(flow, { type: "inspected", id: flow.sequence, result: preview });
    for (let now = 100; now <= 10_000; now += 100) {
      flow = staffCheckInFlow(flow, { type: "scan", source: "camera", scan: preview.attendee.passCode, now });
      assert.equal(flow.step.kind, "preview");
    }
    flow = staffCheckInFlow(flow, { type: "clear" });
    flow = staffCheckInFlow(flow, {
      type: "scan",
      source: "camera",
      scan: preview.attendee.passCode,
      now: 10_100,
    });
    assert.equal(flow.step.kind, "ready");
    // Manual re-entry is a deliberate inspection, independent of camera suppression.
    assert.equal(
      staffCheckInFlow(flow, { type: "scan", source: "manual", scan: preview.attendee.passCode, now: 10_101 })
        .step.kind,
      "inspecting",
    );
  });

  test("a wrong-day preview stays neutral until explicit confirmation and preserves its warning on success", () => {
    let flow = staffCheckInFlow(createStaffCheckInFlow(day), {
      type: "scan",
      source: "manual",
      scan: preview.attendee.passCode,
      now: 0,
    });
    flow = staffCheckInFlow(flow, {
      type: "inspected",
      id: flow.sequence,
      result: { ...preview, outsideRegisteredDay: true, eventDay: "2026-11-01" },
    });
    assert.equal(flow.today, "2026-11-01");
    assert.equal(flow.lastResult, null);
    flow = staffCheckInFlow(flow, { type: "confirm" });
    if (flow.step.kind !== "confirming") assert.fail("Explicit confirmation is required");
    assert.equal(flow.step.preview.eventDay, "2026-11-01");
    flow = staffCheckInFlow(flow, {
      type: "confirmed",
      id: flow.sequence,
      result: {
        status: "checked-in-outside-registered-day",
        attendee: preview.attendee,
        eventDay: "2026-11-01",
        checkedInAt: new Date("2026-11-01T09:00:00+07:00"),
      },
    });
    assert.equal(flow.step.kind, "ready");
    assert.equal(flow.lastResult?.status, "checked-in-outside-registered-day");
  });
});
