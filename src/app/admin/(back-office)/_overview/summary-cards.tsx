import { ArrowRightIcon, CircleAlertIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireStaff } from "@/lib/auth/session";
import { event, eventDayLabel } from "@/lib/event";
import { registrations } from "@/lib/server/registrations";
import { readHeadCounts } from "./head-counts";

const formatCount = new Intl.NumberFormat("th-TH").format;

const TOTAL_TITLE = "ลงทะเบียนทั้งหมด";
const UNSENT_TITLE = "ยังไม่ได้ส่งอีเมล Event Pass";

/** dashboard-01's section card: a title, a big number, an optional badge and a footer. */
function SummaryCard({
  title,
  value,
  badge,
  footer,
}: {
  title: string;
  value: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>
          <h3 className="leading-normal">{title}</h3>
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{value}</CardTitle>
        {badge && <CardAction>{badge}</CardAction>}
      </CardHeader>
      {footer && <CardFooter className="flex-col items-start gap-1.5 text-sm leading-normal">{footer}</CardFooter>}
    </Card>
  );
}

/** "1,234 คน": the card's big number. */
function People({ count }: { count: number }) {
  return (
    <>
      {formatCount(count)} <span className="text-base font-normal text-muted-foreground">คน</span>
    </>
  );
}

/**
 * Card 1 (all Registrations, with today's) and one card per Event Day (its Registrations and
 * Check-Ins), in Event order. Staff-only; render below a <Suspense> boundary.
 */
export async function HeadCountCards() {
  await requireStaff();
  const counts = await readHeadCounts();

  return (
    <>
      <SummaryCard
        title={TOTAL_TITLE}
        value={<People count={counts.registrations} />}
        badge={
          <Badge variant="outline">
            <UserPlusIcon aria-hidden="true" />+{formatCount(counts.registeredToday)} วันนี้
          </Badge>
        }
        footer={<p className="text-muted-foreground">ผู้ที่เลือกทั้ง 2 วันนับครั้งเดียว</p>}
      />
      {counts.eventDays.map((day) => (
        <SummaryCard
          key={day.eventDay}
          title={eventDayLabel(day.eventDay)}
          value={<People count={day.total} />}
          footer={
            <p className="font-medium">
              เช็คอินแล้ว {formatCount(day.checkIns.total)}
              {/* The same wording as the check-in desk and the Kiosk. */}
              {day.checkIns.outsideRegisteredDay > 0 &&
                ` (ไม่ได้ลงทะเบียนวันนี้ ${formatCount(day.checkIns.outsideRegisteredDay)})`}
            </p>
          }
        />
      ))}
    </>
  );
}

/** Card 4: Registrations never sent their Event Pass email. Staff-only; render below a <Suspense> boundary. */
export async function UnsentEmailCard() {
  await requireStaff();
  const summary = await registrations().bulkSendSummary("unsent");

  return (
    <SummaryCard
      title={UNSENT_TITLE}
      value={<People count={summary.emails} />}
      footer={
        <>
          {!summary.emailConfigured && (
            <p className="flex items-center gap-1.5 font-medium">
              <CircleAlertIcon aria-hidden="true" className="size-4 shrink-0" />
              ระบบอีเมลยังไม่ได้ตั้งค่า
            </p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/email">
              ไปหน้าส่งอีเมล
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </>
      }
    />
  );
}

/**
 * A card waiting for its number: the title is known, the rest is a placeholder of the same height
 * (the number's line, and a line of footer text or, with `button`, the footer's button).
 */
function SummaryCardSkeleton({ title, button = false }: { title: string; button?: boolean }) {
  return (
    <SummaryCard
      title={title}
      value={
        <>
          <span className="sr-only">กำลังโหลด…</span>
          <Skeleton aria-hidden="true" className="h-8 w-24 @[250px]/card:h-9" />
        </>
      }
      footer={<Skeleton aria-hidden="true" className={button ? "h-8 w-32" : "h-[1lh] w-40 max-w-full"} />}
    />
  );
}

/** The fallback for `HeadCountCards`: the same cards, so nothing moves when the numbers arrive. */
export function HeadCountCardsSkeleton() {
  return (
    <>
      <SummaryCardSkeleton title={TOTAL_TITLE} />
      {event.eventDays.map(({ date, label }) => (
        <SummaryCardSkeleton key={date} title={label} />
      ))}
    </>
  );
}

export function UnsentEmailCardSkeleton() {
  return <SummaryCardSkeleton title={UNSENT_TITLE} button />;
}
