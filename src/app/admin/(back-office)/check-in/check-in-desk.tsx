"use client";

import { type FormEvent, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { createStaffCheckInFlow, staffCheckInFlow, type StaffCheckInEvent } from "@/lib/check-in/staff-flow";
import { event, eventDayLabel } from "@/lib/event";
import { cn } from "@/lib/utils";
import { confirmCheckInScan, inspectCheckInScan } from "./actions";
import { CameraScanner } from "./camera-scanner";
import { StaffCheckInResult } from "./staff-check-in-result";

/** The Staff desk always inspects first, including old links with ?kiosk=1. */
export function CheckInDesk({ today }: { today: string | null }) {
  const [flow, setFlow] = useState(() => createStaffCheckInFlow(today));
  const flowRef = useRef(flow);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { open, setOpen } = useSidebar();
  const collapseSidebar = useEffectEvent(() => {
    setOpen(false);
    return open;
  });
  const restoreSidebar = useEffectEvent((previous: boolean) => setOpen(previous));

  useEffect(() => {
    const previous = collapseSidebar();
    return () => restoreSidebar(previous);
  }, []);

  // Admission changes synchronously, so two decodes before React renders cannot start two lookups.
  // Repeated sightings update the hold timer without rendering ten times a second.
  const send = useCallback(function dispatch(event: StaffCheckInEvent) {
    const previous = flowRef.current;
    const next = staffCheckInFlow(previous, event);
    flowRef.current = next;
    if (
      next.step === previous.step &&
      next.today === previous.today &&
      next.chosenDay === previous.chosenDay &&
      next.lastResult === previous.lastResult
    )
      return;
    setFlow(next);
    const step = next.step;
    if (step === previous.step) return;
    if (step.kind === "inspecting") {
      void inspectCheckInScan({ scan: step.scan, eventDay: step.requestedDay }).then(
        (result) => dispatch({ type: "inspected", id: step.id, result }),
        () => dispatch({ type: "failed", id: step.id }),
      );
    } else if (step.kind === "confirming") {
      void confirmCheckInScan({ scan: step.scan, eventDay: step.preview.eventDay }).then(
        (result) => dispatch({ type: "confirmed", id: step.id, result }),
        () => dispatch({ type: "failed", id: step.id }),
      );
    }
  }, []);

  const readCamera = useCallback(
    (scan: string) => send({ type: "scan", source: "camera", scan, now: Date.now() }),
    [send],
  );

  useEffect(() => {
    if (flow.step.kind !== "ready" && flow.step.kind !== "inspecting" && flow.step.kind !== "confirming") {
      resultRef.current?.focus({ preventScroll: true });
    }
  }, [flow.step]);

  function inspectManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const scan = input.value;
    input.blur();
    input.value = "";
    send({ type: "scan", source: "manual", scan, now: Date.now() });
  }

  const ready = flow.step.kind === "ready";
  const selectedDay = flow.chosenDay ?? flow.today;
  const reviewedDay = "preview" in flow.step ? flow.step.preview.eventDay : selectedDay;

  return (
    <div className="flex flex-1 flex-col items-center justify-center-safe">
      <div className="w-full max-w-5xl space-y-4">
        <fieldset disabled={!ready} className="text-center">
          <legend className="mx-auto mb-2 text-sm font-medium text-muted-foreground">
            Event Day to check in for
          </legend>
          <div className="flex flex-wrap justify-center gap-2">
            {event.eventDays.map((day) => (
              <label
                key={day.date}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-lg border-2 bg-card px-4 py-2 text-sm font-medium",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                  ready ? "cursor-pointer" : "cursor-default",
                  selectedDay === day.date
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="eventDay"
                  value={day.date}
                  checked={selectedDay === day.date}
                  onChange={() => send({ type: "choose-day", day: day.date })}
                  className="sr-only"
                />
                {day.label.en}
                {day.date === flow.today && <span className="text-xs">Today</span>}
              </label>
            ))}
          </div>
          {flow.chosenDay !== null && (
            <p className="mt-2 text-sm font-semibold text-orange-800">
              {flow.today === null ? "Today isn't an Event Day" : "Not today"}: recording for{" "}
              {eventDayLabel(flow.chosenDay, "en")}.
            </p>
          )}
          {selectedDay === null && (
            <p className="mt-2 text-sm text-muted-foreground">
              Today isn&apos;t an Event Day. Choose a day before inspecting a pass.
            </p>
          )}
          {!ready && reviewedDay && (
            <p className="mt-2 text-sm text-muted-foreground">
              Event Day locked for this Attendee: {eventDayLabel(reviewedDay, "en")}
            </p>
          )}
        </fieldset>

        <div className="grid items-stretch gap-4 tab:grid-cols-2">
          <div className="order-2 min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm tab:order-1">
            <CameraScanner onRead={readCamera} className="mt-0" />
            {/* A pre-hydration submit cannot put a bearer pass in the URL. Enter only inspects. */}
            <form method="dialog" onSubmit={inspectManual} className="mt-4 border-t pt-3">
              <label htmlFor="check-in-scan" className="text-sm font-medium">
                Pass Code or Event Pass link
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  ref={inputRef}
                  id="check-in-scan"
                  name="scan"
                  type="text"
                  disabled={!ready}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  enterKeyHint="go"
                  placeholder="e.g. EP-7KQ2MZ9H"
                  maxLength={2048}
                  aria-describedby="check-in-scan-hint"
                  className="h-12 w-full min-w-0 rounded-lg border bg-background px-3 font-mono text-base focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
                />
                <Button type="submit" disabled={!ready} className="h-12 px-4">
                  Inspect pass
                </Button>
              </div>
              <p id="check-in-scan-hint" className="mt-2 text-xs text-muted-foreground">
                Scan or enter a pass to review it. Arrival is recorded only after Confirm Check-In.
              </p>
            </form>
          </div>
          <div
            ref={resultRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label="Attendee and Check-In status"
            className="order-1 flex min-w-0 flex-col justify-center rounded-2xl border bg-card p-4 shadow-sm outline-offset-4 tab:order-2"
          >
            <StaffCheckInResult
              flow={flow}
              onConfirm={() => send({ type: "confirm" })}
              onClear={() => send({ type: "clear" })}
              onRetryInspection={() => send({ type: "retry-inspection" })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
