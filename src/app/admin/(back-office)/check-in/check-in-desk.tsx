"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { isKioskMode, kioskUrl } from "@/lib/check-in/kiosk-mode";
import { event, findEventDay } from "@/lib/event";
import { cn } from "@/lib/utils";
import { useNoToasts } from "../_shell/toasts";
import { checkInScan } from "./actions";
import { CameraScanner } from "./camera-scanner";
import { type CheckInAttempt, CheckInResultPanel } from "./check-in-result";
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
 * The entrance desk: the Event Day being checked in, the Pass Code box and the latest result, or
 * the Kiosk (ticket 19) when the address says so. Both check in through the same `submitScan`, so
 * the Event Day chosen at the desk still applies in the Kiosk. Check-In results show in the large
 * panel only, never in a toast; Kiosk mode clears and holds back the Back Office's toasts.
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
        checkInDay={{
          label: findEventDay(selectedDay)?.label.th ?? null,
          chosenByStaff: chosenDay !== null,
        }}
      />
    );
  }

  return (
    <div className="mt-6">
      <fieldset>
        <legend className="text-sm leading-normal font-medium">วันเข้าร่วมงานที่เช็คอิน</legend>
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
              <span className="text-sm font-medium">{day.label.th}</span>
              {day.date === today && <span className="text-xs">วันนี้</span>}
            </label>
          ))}
        </div>
        {today === null && chosenDay === null && (
          <p className="mt-2 text-sm leading-normal text-muted-foreground">
            วันนี้ไม่ใช่วันจัดงาน เลือกวันเข้าร่วมงานที่จะเช็คอิน เช่น เพื่อทดสอบก่อนงาน
          </p>
        )}
        {chosenDay !== null && (
          <p className="mt-2 text-sm leading-normal font-medium text-orange-800">
            {today === null ? "วันนี้ไม่ใช่วันจัดงาน" : "ไม่ใช่วันนี้"}: การเช็คอินจะบันทึกเป็น
            {findEventDay(chosenDay)?.label.th}
          </p>
        )}
      </fieldset>

      <CameraScanner onPass={(scan) => void submitScan(scan)} />

      {/* Above the box: on a phone the on-screen keyboard stays up between scans and would cover
          anything below it. */}
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-6">
        {attempt ? (
          <CheckInResultPanel attempt={attempt} />
        ) : (
          <p className="rounded-xl border-2 border-dashed border-neutral-300 p-5 text-base leading-normal text-muted-foreground">
            ผลการเช็คอินจะแสดงที่นี่
          </p>
        )}
      </div>

      {/* method="dialog" makes a submit before hydration a no-op instead of a GET that would put
          the pass in the URL. Once hydrated, onSubmit handles everything. */}
      <form method="dialog" onSubmit={onSubmit} className="mt-6">
        <label htmlFor="check-in-scan" className="text-sm leading-normal font-medium">
          Pass Code หรือลิงก์ Event Pass
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
            placeholder="เช่น EP-7KQ2MZ9H"
            aria-describedby="check-in-scan-hint"
            className="h-16 w-full min-w-0 rounded-lg border-2 border-neutral-500 bg-white px-3 font-mono text-xl tracking-wide placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-muted-foreground focus-visible:border-neutral-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-950/20 tab:px-4 tab:text-2xl tab:placeholder:text-lg"
          />
          <Button type="submit" className="h-16 px-5 text-xl tab:px-8">
            เช็คอิน
          </Button>
        </div>
        <p id="check-in-scan-hint" className="mt-2 text-sm leading-normal text-muted-foreground">
          พิมพ์ Pass Code ตัวพิมพ์เล็กหรือใหญ่ มีขีดหรือเว้นวรรคก็ได้ หรือวางลิงก์ Event Pass แล้วกด Enter
        </p>
      </form>

      <section aria-labelledby="kiosk-mode-heading" className="mt-10 border-t pt-6">
        <h2 id="kiosk-mode-heading" className="text-base leading-normal font-semibold">
          โหมด Kiosk: จุดเช็คอินด้วยตนเอง
        </h2>
        <p className="mt-1 text-sm leading-normal text-muted-foreground">
          สำหรับ iPad ที่ผู้เข้าร่วมงานแสดง Event Pass ที่กล้องหน้าเอง เต็มหน้าจอ มีคำแนะนำภาษาไทยและอังกฤษ
          และไม่มีเมนู ช่องพิมพ์ Pass Code หรือการเลือกวัน การเช็คอินบันทึกเป็นวันที่เลือกไว้ด้านบน
          ออกจากโหมดนี้ได้ที่ปุ่ม “เจ้าหน้าที่” มุมขวาบน
        </p>
        <Button type="button" size="lg" variant="outline" className="mt-3" onClick={() => setKioskMode(true)}>
          เปิดโหมด Kiosk
        </Button>
        <p className="mt-2 text-sm leading-normal text-muted-foreground">
          บุ๊กมาร์กหน้านี้โดยเติม <code className="font-mono">?kiosk=1</code> ท้ายลิงก์ เพื่อเปิดเข้าโหมด Kiosk โดยตรง
        </p>
        <p className="mt-2 text-sm leading-normal font-medium">
          iPad ที่วางไว้ให้ผู้เข้าร่วมงานใช้เองโดยไม่มีเจ้าหน้าที่อยู่ ให้เข้าสู่ระบบด้วยบัญชี Kiosk แทน
          บัญชีนี้เปิดได้เฉพาะหน้า Kiosk และไม่เห็นข้อมูลผู้ลงทะเบียน
        </p>
      </section>
    </div>
  );
}
