"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { DailyRegistrations } from "@/lib/registrations/daily-registrations";
import { formatAxisDay, formatCount, formatPeople, formatTooltipDay } from "./format";

const chartConfig = {
  // --chart-2: the first chart token with 3:1 contrast on the card (WCAG non-text contrast).
  registrations: { label: "New Registrations", color: "var(--chart-2)" },
} satisfies ChartConfig;

/**
 * The area chart itself: one series, new Registrations per Bangkok day. Pointer users hover or
 * tap; keyboard users focus it and step through the days with the arrow keys (recharts'
 * accessibility layer). Screen readers get the table the card renders beside it, so the drawing
 * is one image to them.
 */
export function DailyRegistrationsChart({ series }: { series: DailyRegistrations }) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-62.5 w-full rounded-md has-[.recharts-surface:focus-visible]:ring-2 has-[.recharts-surface:focus-visible]:ring-ring"
    >
      <AreaChart
        data={series}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        role="img"
        aria-label="Chart of new Registrations per day. Each day's number is in the table that follows."
      >
        <defs>
          <linearGradient id="fill-daily-registrations" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-registrations)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-registrations)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={formatAxisDay}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          width={36}
          tickFormatter={formatCount}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(date) => formatTooltipDay(String(date))}
              formatter={(value) => (
                <div className="flex w-full items-center gap-2">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-[2px] bg-(--color-registrations)" />
                  <span className="text-muted-foreground">New Registrations</span>
                  <span className="ml-auto pl-2 font-medium text-foreground tabular-nums">
                    {formatPeople(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="registrations"
          // Monotone, not dashboard-01's "natural": a spline through zero days would dip below zero.
          type="monotone"
          fill="url(#fill-daily-registrations)"
          stroke="var(--color-registrations)"
          strokeWidth={2}
          // One day alone draws no line, so mark it.
          dot={series.length === 1 ? { r: 4, fill: "var(--color-registrations)" } : false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
