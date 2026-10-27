import type { CheckInInspection, CheckInResult } from "@/lib/registrations/check-in";
import { resolveScan } from "@/lib/registrations/event-pass-codec";

// At 10 decode attempts/second, a quiet interval indicates that the handled QR left the frame.
const QR_REARM_MS = 1_200;

export type StaffInspectionResult = CheckInInspection | { status: "signed-out" };
export type StaffConfirmationResult = CheckInResult | { status: "signed-out" };
type Preview = Extract<CheckInInspection, { status: "ready" }>;
type TerminalResult =
  | Exclude<StaffInspectionResult | StaffConfirmationResult, Preview | { status: "signed-out" }>
  | { status: "inspection-failed" };
type Item = { scan: string };

export type StaffCheckInStep =
  | { kind: "ready" }
  | (Item & { kind: "inspecting"; id: number; requestedDay: string | undefined })
  | (Item & { kind: "preview"; preview: Preview })
  | (Item & { kind: "confirming"; id: number; preview: Preview })
  | (Item & { kind: "uncertain"; id: number; preview: Preview })
  | (Item & { kind: "result"; result: TerminalResult })
  | { kind: "signed-out" };

export type StaffCheckInFlow = {
  today: string | null;
  chosenDay: string | null;
  sequence: number;
  step: StaffCheckInStep;
  lastResult: CheckInResult | null;
  cameraHold: { key: string; seenAt: number } | null;
};

export type StaffCheckInEvent =
  | { type: "scan"; source: "camera" | "manual"; scan: string; now: number }
  | { type: "choose-day"; day: string }
  | { type: "inspected"; id: number; result: StaffInspectionResult }
  | { type: "confirmed"; id: number; result: StaffConfirmationResult }
  | { type: "failed"; id: number }
  | { type: "confirm" | "clear" | "retry-inspection" };

export function createStaffCheckInFlow(today: string | null): StaffCheckInFlow {
  return { today, chosenDay: null, sequence: 0, step: { kind: "ready" }, lastResult: null, cameraHold: null };
}

function passKey(scan: string): string {
  const resolved = resolveScan(scan);
  return resolved.kind === "token"
    ? resolved.token
    : resolved.kind === "pass-code"
      ? resolved.passCode
      : scan.trim();
}

/** Pure desk decisions; its caller performs only the work represented by a new pending step. */
export function staffCheckInFlow(state: StaffCheckInFlow, event: StaffCheckInEvent): StaffCheckInFlow {
  const step = state.step;
  switch (event.type) {
    case "choose-day":
      return step.kind === "ready"
        ? { ...state, chosenDay: event.day === state.today ? null : event.day, lastResult: null }
        : state;
    case "scan": {
      if (!event.scan.trim()) return state;
      const key = passKey(event.scan);
      const held = state.cameraHold;
      if (event.source === "camera" && held?.key === key) {
        const observed = { ...state, cameraHold: { key, seenAt: event.now } };
        if (step.kind !== "ready" || event.now - held.seenAt < QR_REARM_MS) return observed;
      }
      if (step.kind !== "ready") return state;
      const id = state.sequence + 1;
      return {
        ...state,
        sequence: id,
        lastResult: null,
        cameraHold: { key, seenAt: event.now },
        step: { kind: "inspecting", id, scan: event.scan, requestedDay: state.chosenDay ?? undefined },
      };
    }
    case "inspected": {
      if (step.kind !== "inspecting" || step.id !== event.id) return state;
      const result = event.result;
      if (result.status === "signed-out") return { ...state, step: { kind: "signed-out" } };
      return {
        ...state,
        today: state.chosenDay === null && "eventDay" in result ? result.eventDay : state.today,
        step:
          result.status === "ready"
            ? { kind: "preview", scan: step.scan, preview: result }
            : { kind: "result", scan: step.scan, result },
      };
    }
    case "confirm": {
      if (step.kind !== "preview" && step.kind !== "uncertain") return state;
      const id = state.sequence + 1;
      return { ...state, sequence: id, step: { ...step, kind: "confirming", id } };
    }
    case "confirmed": {
      if (step.kind !== "confirming" || step.id !== event.id) return state;
      const result = event.result;
      if (result.status === "signed-out") return { ...state, step: { kind: "signed-out" } };
      if (result.status === "checked-in" || result.status === "checked-in-outside-registered-day") {
        return { ...state, step: { kind: "ready" }, lastResult: result };
      }
      return { ...state, step: { kind: "result", scan: step.scan, result } };
    }
    case "failed":
      if ((step.kind !== "inspecting" && step.kind !== "confirming") || step.id !== event.id) return state;
      return {
        ...state,
        step:
          step.kind === "confirming"
            ? { ...step, kind: "uncertain" }
            : { kind: "result", scan: step.scan, result: { status: "inspection-failed" } },
      };
    case "retry-inspection": {
      if (step.kind !== "result" || step.result.status !== "inspection-failed") return state;
      const id = state.sequence + 1;
      return {
        ...state,
        sequence: id,
        step: { kind: "inspecting", id, scan: step.scan, requestedDay: state.chosenDay ?? undefined },
      };
    }
    case "clear":
      return step.kind === "preview" || step.kind === "result"
        ? { ...state, step: { kind: "ready" }, lastResult: null }
        : state;
    default:
      return state;
  }
}
