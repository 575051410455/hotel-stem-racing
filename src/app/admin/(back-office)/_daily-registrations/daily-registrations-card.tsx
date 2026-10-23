import { ChartAreaIcon } from "lucide-react";
import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { registrations } from "@/lib/server/registrations";
import { cn } from "@/lib/utils";
import { formatCount, formatSpokenDay } from "./format";
import { LazyDailyRegistrationsChart } from "./lazy-daily-registrations-chart";

/** The chart's height; the skeleton and the empty state match it, so nothing jumps. */
const PLOT_HEIGHT = "h-62.5";

/**
 * New Registrations per Bangkok day, from the first Registration's day to today, as an area chart
 * (after dashboard-01's chart card). The title is part of the static shell; the series is
 * Staff-only and streams in behind its own boundary.
 */
export function DailyRegistrationsCard({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle>
          <h3 className="text-base leading-normal">ผู้ลงทะเบียนใหม่รายวัน</h3>
        </CardTitle>
        <CardDescription className="leading-normal">
          ตั้งแต่วันที่มีผู้ลงทะเบียนคนแรกจนถึงวันนี้ ตามเวลาประเทศไทย
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <Suspense fallback={<DailyRegistrationsSkeleton />}>
          <DailyRegistrations />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function DailyRegistrations() {
  await requireStaff();
  const series = await registrations().newRegistrationsPerDay();

  if (series.length === 0) {
    return (
      <div
        className={cn(
          PLOT_HEIGHT,
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 text-center",
        )}
      >
        <ChartAreaIcon aria-hidden="true" className="size-6 text-muted-foreground" />
        <p className="text-sm leading-normal font-medium">ยังไม่มีผู้ลงทะเบียน</p>
        <p className="text-sm leading-normal text-muted-foreground">กราฟจะแสดงเมื่อมีผู้ลงทะเบียนคนแรก</p>
      </div>
    );
  }

  return (
    <>
      <LazyDailyRegistrationsChart series={series} />
      {/* The chart's text alternative. sr-only sits on a wrapper: a table ignores width and height. */}
      <div className="sr-only">
        <table>
          <caption>ผู้ลงทะเบียนใหม่รายวัน</caption>
          <thead>
            <tr>
              <th scope="col">วันที่</th>
              <th scope="col">ผู้ลงทะเบียนใหม่</th>
            </tr>
          </thead>
          <tbody>
            {series.map(({ date, registrations }) => (
              <tr key={date}>
                <th scope="row">{formatSpokenDay(date)}</th>
                <td>{formatCount(registrations)} คน</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DailyRegistrationsSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">กำลังโหลดกราฟผู้ลงทะเบียนใหม่รายวัน…</span>
      <div aria-hidden="true" className={cn(PLOT_HEIGHT, "rounded-md bg-muted motion-safe:animate-pulse")} />
    </div>
  );
}
