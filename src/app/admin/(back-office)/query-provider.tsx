"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

/** A non-2xx answer from a Back Office endpoint under /api/back-office. */
export class BackOfficeRequestError extends Error {
  constructor(readonly status: number) {
    super(`Back Office request failed with HTTP ${status}`);
    this.name = "BackOfficeRequestError";
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Registrations keep arriving; a list older than this refetches when shown again.
        staleTime: 10_000,
        // A signed-out (401) or rejected (400) request fails the same way every time.
        retry: (failureCount, error) =>
          failureCount < 2 && !(error instanceof BackOfficeRequestError && error.status < 500),
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** A fresh query client per server render; one for the whole visit in the browser. */
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

/** TanStack Query for every signed-in Back Office page (set in the (back-office) layout). */
export function BackOfficeQueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>;
}
