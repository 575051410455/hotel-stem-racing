import { Suspense } from "react";
import { RoleTableCard } from "./role-table-card";
import { HeadCountCards, HeadCountCardsSkeleton, UnsentEmailCard, UnsentEmailCardSkeleton } from "./summary-cards";

/**
 * The overview on the Back Office home (redesign 02): four summary cards, then the role table
 * beside the daily Registrations chart. The grids are static; each card's numbers are Staff-only
 * and stream in behind their own boundary. Laid out by the section's width (a container), not the
 * window's, so the sidebar being open or closed is taken into account.
 */
export function OverviewSection() {
  return (
    <section aria-labelledby="overview-heading" className="@container/overview">
      <h2 id="overview-heading" className="sr-only">
        ภาพรวม
      </h2>
      {/* dashboard-01's section cards: one column, two from 36rem, four from 64rem. */}
      <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/overview:grid-cols-2 @5xl/overview:grid-cols-4">
        <Suspense fallback={<HeadCountCardsSkeleton />}>
          <HeadCountCards />
        </Suspense>
        <Suspense fallback={<UnsentEmailCardSkeleton />}>
          <UnsentEmailCard />
        </Suspense>
      </div>
      {/* Side by side from 48rem, stacked below. */}
      <div className="mt-4 grid grid-cols-1 gap-4 @3xl/overview:grid-cols-2">
        {/* Spans the row while it is alone in it (before the chart card is added). */}
        <RoleTableCard className="only:col-span-full" />
        {/*
          Slot for ticket 03's chart card (new Registrations per day), beside the role table:
          render it here as the grid's second child, inside its own <Suspense>.
        */}
      </div>
    </section>
  );
}
