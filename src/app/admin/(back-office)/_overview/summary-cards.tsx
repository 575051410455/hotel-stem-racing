import { ArrowRightIcon, CircleAlertIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth/session";
import { event, eventDayLabel } from "@/lib/event";
import { registrations } from "@/lib/server/registrations";
import { readHeadCounts } from "./head-counts";

const formatCount = new Intl.NumberFormat("en-GB").format;

const TOTAL_TITLE = "Total Registrations";
const UNSENT_TITLE = "Event Pass email not sent";

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

/** "1,234 people" (or "1 person"): the card's big number. */
function People({ count }: { count: number }) {
  const unit = count === 1 ? "person" : "people";
  return (
    <>
      {formatCount(count)} <span className="text-base font-normal text-muted-foreground">{unit}</span>
    </>
  );
}

/**
 * Card 1 (all Registrations, with today's) and one card per Event Day (its Registrations and
 * Check-Ins), in Event order. Admin-only; render below a <Suspense> boundary.
 */
export async function HeadCountCards() {
  await requireAdmin();
  const counts = await readHeadCounts();

  return (
    <>
      <SummaryCard
        title={TOTAL_TITLE}
        value={<People count={counts.registrations} />}
        badge={
          <Badge variant="outline">
            <UserPlusIcon aria-hidden="true" />+{formatCount(counts.registeredToday)} today
          </Badge>
        }
        footer={<p className="text-muted-foreground">People who chose multiple days count once</p>}
      />
      {counts.eventDays.map((day) => (
        <SummaryCard
          key={day.eventDay}
          title={eventDayLabel(day.eventDay, "en")}
          value={<People count={day.total} />}
          footer={
            <p className="font-medium">
              Checked in {formatCount(day.checkIns.total)}
              {/* The same wording as the check-in desk. */}
              {day.checkIns.outsideRegisteredDay > 0 &&
                ` (${formatCount(day.checkIns.outsideRegisteredDay)} not registered for this day)`}
            </p>
          }
        />
      ))}
    </>
  );
}

/** Card 4: Registrations never sent their Event Pass email. Admin-only; render below a <Suspense> boundary. */
export async function UnsentEmailCard() {
  await requireAdmin();
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
              {"Email isn't set up"}
            </p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/email">
              Go to Email
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
          <span className="sr-only">Loading…</span>
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
        <SummaryCardSkeleton key={date} title={label.en} />
      ))}
    </>
  );
}

export function UnsentEmailCardSkeleton() {
  return <SummaryCardSkeleton title={UNSENT_TITLE} button />;
}
