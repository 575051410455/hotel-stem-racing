import { Suspense } from "react";
import { DailyRegistrationsCard } from "../_daily-registrations/daily-registrations-card";
import { RoleTableCard } from "./role-table-card";
import {
  EventDayCards,
  EventDayCardsSkeleton,
  TotalRegistrationsCard,
  TotalRegistrationsCardSkeleton,
  UnsentEmailCard,
  UnsentEmailCardSkeleton,
} from "./summary-cards";

const summaryGridClassName = "grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs";

/**
 * The Back Office overview: overall counts, then Event Day counts, then the role table beside
 * the daily Registrations chart. The grids are static; each card's numbers are Admin-only
 * and stream in behind their own boundary. Laid out by the section's width (a container), not the
 * window's, so the sidebar being open or closed is taken into account.
 */
export function OverviewSection() {
  return (
    <section aria-labelledby="overview-heading" className="@container/overview">
      <h2 id="overview-heading" className="sr-only">
        Overview
      </h2>
      <div role="group" aria-label="Overall Registration counts" className={`${summaryGridClassName} @xl/overview:grid-cols-2`}>
        <Suspense fallback={<TotalRegistrationsCardSkeleton />}>
          <TotalRegistrationsCard />
        </Suspense>
        <Suspense fallback={<UnsentEmailCardSkeleton />}>
          <UnsentEmailCard />
        </Suspense>
      </div>
      <div role="group" aria-label="Registration counts by Event Day" className={`${summaryGridClassName} mt-4 @xl/overview:grid-cols-2 @3xl/overview:grid-cols-3`}>
        <Suspense fallback={<EventDayCardsSkeleton />}>
          <EventDayCards />
        </Suspense>
      </div>
      {/* Side by side from 48rem, stacked below. */}
      <div className="mt-4 grid grid-cols-1 gap-4 @3xl/overview:grid-cols-2">
        <RoleTableCard />
        {/* Static title; its series streams in behind its own boundary (see the card). */}
        <DailyRegistrationsCard />
      </div>
    </section>
  );
}
