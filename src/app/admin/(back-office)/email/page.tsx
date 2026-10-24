import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { PageContent, PageHeader, PageTitle } from "../_shell/page-header";
import { BulkSend } from "./bulk-send";

export const metadata: Metadata = { title: "Email Event Passes" };

// Bulk send of Event Pass emails (ticket 17). The header and introduction are the static shell;
// the controls are Admin-only and every number comes from an Admin-only endpoint, behind the
// session check.
export default function BulkSendPage() {
  return (
    <>
      <PageHeader>
        <PageTitle>Email</PageTitle>
      </PageHeader>
      <PageContent narrow>
        <p className="leading-normal text-muted-foreground">
          Email Event Passes to many Attendees at once, for example after an email outage or a quota limit.
        </p>
        <Suspense fallback={<p className="mt-6 text-sm leading-normal text-muted-foreground">Loading…</p>}>
          <AdminOnlyBulkSend />
        </Suspense>
      </PageContent>
    </>
  );
}

async function AdminOnlyBulkSend() {
  await requireAdmin();
  return <BulkSend />;
}
