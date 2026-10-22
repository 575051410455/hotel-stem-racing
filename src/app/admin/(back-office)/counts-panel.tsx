import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { event } from "@/lib/event";
import { type AttendeeRole, attendeeRoleLabels, attendeeRoles } from "@/lib/registrations/fields";
import { registrations } from "@/lib/server/registrations";

// The form's label for "Other" asks the Attendee to specify; as a count it is just "Other".
const roleLabels: Record<AttendeeRole, string> = { ...attendeeRoleLabels, other: "อื่น ๆ" };

const eventDayLabels = new Map<string, string>(event.eventDays.map(({ date, label }) => [date, label]));

const formatCount = new Intl.NumberFormat("th-TH").format;

/**
 * Head counts per Event Day by Attendee Role, for planning each day's crowd. The heading is part
 * of the static shell; the counts are Staff-only and stream in behind their own boundary.
 */
export function CountsPanel() {
  return (
    <section aria-labelledby="counts-heading" className="mt-8">
      <h2 id="counts-heading" className="text-lg leading-normal font-semibold">
        จำนวนผู้ลงทะเบียน
      </h2>
      <Suspense fallback={<CountsSkeleton />}>
        <Counts />
      </Suspense>
    </section>
  );
}

async function Counts() {
  await requireStaff();
  const counts = await registrations().countByEventDayAndRole();

  return (
    <>
      <p className="mt-1 text-sm leading-normal text-muted-foreground">
        ทั้งหมด {formatCount(counts.registrations)} คน · ผู้ที่เลือกทั้ง 2 วันนับในแต่ละวัน
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {counts.eventDays.map((day) => (
          <Card key={day.eventDay} className="gap-4">
            <CardHeader>
              <CardTitle>
                <h3 className="leading-normal">{eventDayLabels.get(day.eventDay) ?? day.eventDay}</h3>
              </CardTitle>
              <p className="leading-normal">
                <span className="text-3xl font-semibold tabular-nums">{formatCount(day.total)}</span>{" "}
                <span className="text-sm text-muted-foreground">คน</span>
              </p>
            </CardHeader>
            <CardContent>
              <dl className="divide-y border-t">
                {attendeeRoles.map((role) => (
                  <div key={role} className="flex items-baseline justify-between gap-4 py-2 text-sm leading-normal">
                    <dt>{roleLabels[role]}</dt>
                    <dd className="font-medium tabular-nums">{formatCount(day.byRole[role])}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

/** Same shape as the counts, so nothing jumps when they arrive. */
function CountsSkeleton() {
  return (
    <div role="status">
      <p className="mt-1 text-sm leading-normal text-muted-foreground">กำลังโหลดจำนวนผู้ลงทะเบียน…</p>
      <div aria-hidden="true" className="mt-4 grid gap-4 sm:grid-cols-2">
        {event.eventDays.map(({ date, label }) => (
          <Card key={date} className="gap-4">
            <CardHeader>
              <CardTitle>
                <p className="leading-normal">{label}</p>
              </CardTitle>
              <div className="my-1.5 h-7 w-16 rounded-md bg-muted motion-safe:animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-[11.5rem] rounded-md bg-muted motion-safe:animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
