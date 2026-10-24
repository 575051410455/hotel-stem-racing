"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { registrationDetailHref } from "./list-links";
import type { RegistrationListItem } from "./query";

/**
 * The list row's way into the Registration's detail. The link keeps the list's current view, so
 * the detail can send Staff back to the same search. Not prefetched: a page can hold 100 rows.
 */
export function RegistrationDetailLink({ registration }: { registration: RegistrationListItem }) {
  const searchParams = useSearchParams();
  return (
    <Button asChild variant="outline" size="xs">
      <Link href={registrationDetailHref(registration.id, searchParams)} prefetch={false}>
        Details
        <span className="sr-only">
          {" "}
          {registration.givenName} {registration.familyName}
        </span>
      </Link>
    </Button>
  );
}
