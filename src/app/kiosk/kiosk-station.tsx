"use client";

import { useRef, useState } from "react";
import { checkInScan } from "@/app/admin/(back-office)/check-in/actions";
import type { CheckInAttempt } from "@/app/admin/(back-office)/check-in/check-in-result";
import { KioskScreen } from "@/app/admin/(back-office)/check-in/kiosk-screen";

/**
 * The Kiosk page's state: always the Kiosk, always today's Event Day (the server decides which day
 * that is, and ignores any other for a Kiosk Account), and no way back to a desk, only sign-out.
 * `today` is today's Event Day when the page was rendered (Bangkok), or null when today isn't one.
 */
export function KioskStation({ today: renderedToday, accountName }: { today: string | null; accountName: string }) {
  const [today, setToday] = useState(renderedToday);
  const [attempt, setAttempt] = useState<CheckInAttempt | null>(null);
  const latestAttempt = useRef(0);

  // Like the desk's `submitScan`, without the chosen day and the Pass Code box.
  async function submitScan(scan: string) {
    const id = ++latestAttempt.current;
    // Replace the previous result at once, so nobody is waved through on the last Attendee's green.
    setAttempt({ scan, result: { status: "pending" } });
    let result: CheckInAttempt["result"];
    try {
      result = await checkInScan({ scan });
    } catch {
      result = { status: "failed" };
    }
    if (id !== latestAttempt.current) return; // a newer scan has taken over the result
    setAttempt({ scan, result });
    // A Kiosk left on overnight moves on to the next Event Day by itself.
    if ("eventDay" in result) setToday(result.eventDay);
  }

  return (
    <KioskScreen
      attempt={attempt}
      onPass={(scan) => void submitScan(scan)}
      exit={{ kind: "sign-out", accountName }}
      checkInDay={{ date: today, chosenByStaff: false }}
    />
  );
}
