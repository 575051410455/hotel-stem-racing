"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { isKioskMode, kioskUrl } from "@/lib/check-in/kiosk-mode";
import { event, eventDayLabel } from "@/lib/event";
import { cn } from "@/lib/utils";
import { useNoToasts } from "../_shell/toasts";
import { checkInScan } from "./actions";
import { CameraScanner } from "./camera-scanner";
import { type CheckInAttempt, CheckInResultPanel, CheckInResultPlaceholder } from "./check-in-result";
import { KioskScreen } from "./kiosk-screen";

/** Results that say nothing about the pass: the text goes back in the box so Staff can resubmit. */
const KEEPS_SCAN = new Set<CheckInAttempt["result"]["status"]>(["not-an-event-day", "signed-out", "failed"]);

/**
 * Kiosk mode lives in the address (`?kiosk=1`). Replacing the entry, rather than pushing one, means
 * Back never just turns the Kiosk off while staying on this page.
 */
function setKioskMode(on: boolean) {
  window.history.replaceState(null, "", kioskUrl(window.location, on));
}

/**
 * The entrance desk, in English: the Event Day being checked in, the Pass Code box and the latest
 * result, or the Kiosk (ticket 19) when the address says so. Both check in through the same
 * `submitScan`, so the Event Day chosen at the desk still applies in the Kiosk. Check-In results
 * show in the large panel only, never in a toast; Kiosk mode clears and holds back the Back
 * Office's toasts.
 * `today` is today's Event Day when the page was rendered (Bangkok), or null when today isn't one.
 */
export function CheckInDesk({ today: renderedToday }: { today: string | null }) {
  const kiosk = isKioskMode(useSearchParams());
  useNoToasts(kiosk);
  const [today, setToday] = useState(renderedToday);
  // An Event Day Staff picked explicitly. Null follows today, so a desk left open overnight
  // moves on to the next Event Day by itself (the server decides which day "today" is).
  const [chosenDay, setChosenDay] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<CheckInAttempt | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const latestAttempt = useRef(0);
  const selectedDay = chosenDay ?? today;

  /** Checks in scanned or typed text. The camera scanner (ticket 18) and the Kiosk call this as well. */
  async function submitScan(scan: string) {
    const id = ++latestAttempt.current;
    // Replace the previous result at once, so nobody is waved through on the last Attendee's green.
    setAttempt({ scan, result: { status: "pending" } });
    let result: CheckInAttempt["result"];
    try {
      result = await checkInScan({ scan, eventDay: chosenDay ?? undefined });
    } catch {
      result = { status: "failed" };
    }
    if (id !== latestAttempt.current) return; // a newer scan has taken over the result
    setAttempt({ scan, result });
    if (chosenDay === null && "eventDay" in result) setToday(result.eventDay);
    const input = inputRef.current;
    if (input && !input.value && KEEPS_SCAN.has(result.status)) input.value = scan;
  }

  function onSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    const scan = input.value;
    // Clear and refocus straight away, so the next pass can be typed while this one is checked.
    input.value = "";
    input.focus();
    if (scan.trim()) void submitScan(scan);
  }

  if (kiosk) {
    return (
      <KioskScreen
        attempt={attempt}
        onPass={(scan) => void submitScan(scan)}
        exit={{ kind: "leave-kiosk-mode", onLeave: () => setKioskMode(false) }}
        checkInDay={{ date: selectedDay, chosenByStaff: chosenDay !== null }}
      />
    );
  }

  // One card, centred on the page and as wide as a phone: the Event Day, the result square, the
  // camera, then the Pass Code box. Kiosk mode sits in a quieter card below.
  return (
    <div className="flex flex-1 flex-col items-center justify-center-safe gap-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="p-4 tab:p-5">
          <fieldset>
            <legend className="text-xs leading-normal font-medium tracking-wider text-muted-foreground uppercase">
              Event Day to check in for
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {event.eventDays.map((day) => (
                <label
                  key={day.date}
                  className={cn(
                    "flex cursor-pointer flex-col justify-center rounded-lg border-2 border-neutral-300 bg-white px-3 py-2 leading-normal",
                    "has-[:checked]:border-neutral-950 has-[:checked]:bg-neutral-950 has-[:checked]:text-white",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-neutral-950",
                  )}
                >
                  <input
                    type="radio"
                    name="eventDay"
                    value={day.date}
                    checked={selectedDay === day.date}
                    onChange={() => setChosenDay(day.date === today ? null : day.date)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{day.label.en}</span>
                  {day.date === today && <span className="text-xs">Today</span>}
                </label>
              ))}
            </div>
            {today === null && chosenDay === null && (
              <p className="mt-2 text-sm leading-normal text-muted-foreground">
                Today isn&apos;t an Event Day. Choose the Event Day to check in for, for example to test before the
                Event.
              </p>
            )}
            {chosenDay !== null && (
              <p className="mt-2 text-sm leading-normal font-medium text-orange-800">
                {today === null ? "Today isn't an Event Day" : "Not today"}: Check-Ins are recorded for{" "}
                {eventDayLabel(chosenDay, "en")}
              </p>
            )}
          </fieldset>

          {/* Above the box: on a phone the on-screen keyboard stays up between scans and would cover
              anything below it. */}
          <div role="status" aria-live="polite" aria-atomic="true" className="mt-4">
            {attempt ? <CheckInResultPanel attempt={attempt} /> : <CheckInResultPlaceholder />}
          </div>

          {/* Right under the result, so the preview and the latest result are in view together. */}
          <CameraScanner className="mt-4" onPass={(scan) => void submitScan(scan)} />
        </div>

        {/* method="dialog" makes a submit before hydration a no-op instead of a GET that would put
            the pass in the URL. Once hydrated, onSubmit handles everything. */}
        <form method="dialog" onSubmit={onSubmit} className="border-t p-4 tab:p-5">
          <label htmlFor="check-in-scan" className="text-sm leading-normal font-medium">
            Pass Code or Event Pass link
          </label>
          <div className="mt-2 flex gap-2 tab:gap-3">
            <input
              ref={inputRef}
              id="check-in-scan"
              name="scan"
              type="text"
              // Staff open this page to scan, so the box is ready at once.
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="go"
              placeholder="e.g. EP-7KQ2MZ9H"
              aria-describedby="check-in-scan-hint"
              className="h-16 w-full min-w-0 rounded-lg border-2 border-neutral-500 bg-white px-3 font-mono text-xl tracking-wide placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:border-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-950/20 tab:px-4 tab:text-2xl tab:placeholder:text-lg"
            />
            <Button type="submit" className="h-16 px-5 text-xl tab:px-8">
              Check in
            </Button>
          </div>
          <p id="check-in-scan-hint" className="mt-2 text-center text-sm leading-normal text-muted-foreground">
            Type the Pass Code in any case, with or without hyphens or spaces, or paste an Event Pass link, then press
            Enter.
          </p>
        </form>
      </div>

      <section
        aria-labelledby="kiosk-mode-heading"
        className="w-full max-w-md rounded-2xl border bg-card p-4 text-center shadow-sm tab:p-5"
      >
        <h2 id="kiosk-mode-heading" className="text-base leading-normal font-semibold">
          Kiosk mode: self check-in
        </h2>
        <p className="mt-1 text-sm leading-normal text-muted-foreground">
          For an iPad where Attendees show their Event Pass to the front camera themselves: full screen, with Thai
          and English instructions, and no menu, Pass Code entry or day choice. Check-Ins are recorded for the day
          chosen above. Leave it with the “Staff” button in the top-right corner.
        </p>
        <Button type="button" size="lg" variant="outline" className="mt-3 w-full" onClick={() => setKioskMode(true)}>
          Start Kiosk mode
        </Button>
        <p className="mt-2 text-sm leading-normal text-muted-foreground">
          Bookmark this page with <code className="font-mono">?kiosk=1</code> at the end of the link to open Kiosk
          mode directly.
        </p>
        <p className="mt-2 text-sm leading-normal font-medium">
          An iPad left for Attendees with no Staff nearby should sign in with a Kiosk Account instead. That Account
          opens only the Kiosk page and sees no Registration data.
        </p>
      </section>
    </div>
  );
}
