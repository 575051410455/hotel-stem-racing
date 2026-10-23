"use client";

import dynamic from "next/dynamic";

/**
 * The daily Registrations chart, loaded in the browser after the page hydrates. Imported directly,
 * recharts (~117 KB gzipped) shared a chunk with the Registration list, so the list couldn't
 * hydrate and fetch its rows until the chart library had downloaded. The placeholder matches the
 * chart's height; screen readers already have the card's table, so it's hidden from them.
 */
export const LazyDailyRegistrationsChart = dynamic(
  () => import("./daily-registrations-chart").then((module) => module.DailyRegistrationsChart),
  {
    ssr: false,
    loading: () => <div aria-hidden="true" className="h-62.5 rounded-md bg-muted motion-safe:animate-pulse" />,
  },
);
