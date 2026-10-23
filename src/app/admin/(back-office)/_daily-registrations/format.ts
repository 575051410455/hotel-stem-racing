// How the daily Registrations chart and its text alternative show Bangkok days and counts.
// Pure; safe in browser and server.

import { bangkokInstant } from "@/lib/bangkok-time";
import { event } from "@/lib/event";

function dayFormat(options: Intl.DateTimeFormatOptions) {
  const format = new Intl.DateTimeFormat("th-TH", { timeZone: event.timeZone, ...options });
  return (isoDate: string) => format.format(bangkokInstant(isoDate));
}

/** "23 ต.ค.", for the chart's axis. */
export const formatAxisDay = dayFormat({ day: "numeric", month: "short" });

/** "ศ. 23 ต.ค. 2569", for the tooltip. */
export const formatTooltipDay = dayFormat({ weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** "วันศุกร์ที่ 23 ตุลาคม 2569", for the screen-reader table: nothing abbreviated. */
export const formatSpokenDay = dayFormat({ weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** "1,234": with thousands separators, the Thai way. */
export const formatCount = new Intl.NumberFormat("th-TH").format;
