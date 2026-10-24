import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { eventDayLabel } from "@/lib/event";
import type { RegistrationDetail } from "@/lib/registrations/detail";
import { type AttendeeRole, attendeeRoleShortLabels, referralSourceShortLabels } from "@/lib/registrations/fields";
import { registrationIdFromPath } from "@/lib/registrations/registration-id";
import { eventPassLink, registrations } from "@/lib/server/registrations";
import { formatCreatedAt, formatPhone } from "../../_registration-list/format";
import { registrationListHref } from "../../_registration-list/list-links";
import { PageContent, PageHeader } from "../../_shell/page-header";
import { DeleteRegistration } from "./delete-registration";
import { DetailEventPassEmail, EventPassLink } from "./detail-actions";

export const metadata: Metadata = { title: "Registration details" };

// /admin/registrations/{id}: every answer of one Registration, its Event Pass, email status and
// Check-Ins, and delete. Admin-only; the id, the session and the data are request-time, so it all
// renders behind one boundary, header included. The query string is the list view to return to
// (see list-links.ts).
export default function RegistrationDetailPage({ params, searchParams }: PageProps<"/admin/registrations/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <DetailHeader listHref={registrationListHref([])} passCode={null} />
          <PageContent narrow>
            <p role="status" className="text-sm leading-normal text-muted-foreground">
              Loading Registration details…
            </p>
          </PageContent>
        </>
      }
    >
      <RegistrationDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** "Registrations › EP-…": back to the list view Staff came from, then the Pass Code once known. */
function DetailHeader({ listHref, passCode }: { listHref: string; passCode: string | null }) {
  return (
    <PageHeader>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={listHref}>Registrations</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {passCode && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-mono">{passCode}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </PageHeader>
  );
}

async function RegistrationDetailContent({
  params,
  searchParams,
}: Pick<PageProps<"/admin/registrations/[id]">, "params" | "searchParams">) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const listParams = queryEntries(query);
  const listHref = registrationListHref(listParams);

  const lookup = await registrations().getRegistrationDetail(registrationIdFromPath(id));
  if (lookup.status === "not-found") {
    return (
      <>
        <DetailHeader listHref={listHref} passCode={null} />
        <PageContent narrow>
          <BackToList href={listHref} />
          <h1 className="mt-6 text-2xl leading-normal font-semibold">Registration not found</h1>
          <p className="mt-2 leading-normal text-muted-foreground">It may have been deleted, or the link is wrong.</p>
        </PageContent>
      </>
    );
  }

  const registration = lookup.registration;
  const attendeeName = `${registration.givenName} ${registration.familyName}`;
  const createdAt = registration.createdAt.toISOString();

  return (
    <>
      <DetailHeader listHref={listHref} passCode={registration.passCode} />
      <PageContent narrow>
        <BackToList href={listHref} />
        <h1 className="mt-6 text-2xl leading-normal font-semibold wrap-anywhere">{attendeeName}</h1>
        <p className="mt-1 text-sm leading-normal text-muted-foreground">
          <span className="font-mono">{registration.passCode}</span> · Registered{" "}
          <time dateTime={createdAt} className="tabular-nums">
            {formatCreatedAt(createdAt)}
          </time>
        </p>

        <div className="mt-6 flex flex-col gap-6">
          <Section title="Registration">
            <Answers registration={registration} />
          </Section>

          <Section title="Event Pass">
            <dl className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Pass Code</dt>
                <dd className="font-mono text-lg leading-normal font-semibold">{registration.passCode}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Event Pass link</dt>
                <dd className="flex flex-col gap-2">
                  <EventPassLinkOrNotice token={registration.token} />
                  <p className="text-xs leading-normal text-muted-foreground">
                    Send this link to an Attendee who can&apos;t find their Event Pass. Anyone with the link
                    can open the Event Pass, so send it only to its holder.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Event Pass email</dt>
                <dd>
                  <DetailEventPassEmail
                    registrationId={registration.id}
                    email={registration.email}
                    emailSentCount={registration.emailSentCount}
                    lastEmailSentAt={registration.lastEmailSentAt?.toISOString() ?? null}
                  />
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Check-Ins">
            <CheckIns checkIns={registration.checkIns} />
          </Section>

          <Section title="Delete Registration">
            <p className="mb-4 text-sm leading-normal text-muted-foreground">
              For spam and Duplicate Registrations. This Registration&apos;s Check-Ins are deleted with it.
            </p>
            <DeleteRegistration
              registrationId={registration.id}
              attendeeName={attendeeName}
              passCode={registration.passCode}
              listHref={listHref}
              afterDeleteHref={registrationListHref(listParams, registration.passCode)}
            />
          </Section>
        </div>
      </PageContent>
    </>
  );
}

/** Page search params as key/value pairs; a repeated key keeps its last value, as the list reads it. */
function queryEntries(query: Record<string, string | string[] | undefined>): [string, string][] {
  return Object.entries(query).flatMap(([key, value]): [string, string][] =>
    value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((item) => [key, item]),
  );
}

function BackToList({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm leading-normal font-medium underline-offset-4 hover:underline"
    >
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      Back to Registrations
    </Link>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg leading-normal">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const withOther = (label: string, other: string | null) => (other ? `${label}: ${other}` : label);

/** Field 5's label for Staff, rather than the form's question to the Attendee ("…you represent"). */
const organisationLabel = (role: AttendeeRole) =>
  role === "sponsor" ? "Company or organisation represented" : "School or organisation";

/** Every answer from the registration form, in the form's order, with its Back Office label. */
function Answers({ registration }: { registration: RegistrationDetail }) {
  const answers: { label: string; value: ReactNode }[] = [
    { label: "Given name", value: registration.givenName },
    { label: "Family name", value: registration.familyName },
    {
      label: "Phone",
      value: (
        <a href={`tel:${registration.phone}`} className="tabular-nums underline-offset-4 hover:underline">
          {formatPhone(registration.phone)}
        </a>
      ),
    },
    {
      label: "Email",
      value: (
        <a href={`mailto:${registration.email}`} className="underline-offset-4 hover:underline">
          {registration.email}
        </a>
      ),
    },
    {
      label: "Attendee Role",
      value: withOther(attendeeRoleShortLabels.en[registration.role], registration.roleOther),
    },
    { label: organisationLabel(registration.role), value: registration.organisation },
    {
      label: "Event Days",
      value: <Lines items={registration.eventDays.map((day) => eventDayLabel(day, "en"))} />,
    },
    {
      label: "Referral Sources",
      value: (
        <Lines
          items={registration.referralSources.map((source) =>
            withOther(referralSourceShortLabels.en[source], source === "other" ? registration.referralOther : null),
          )}
        />
      ),
    },
    { label: "Team cheering for", value: registration.competingTeamCheeredFor },
    { label: "Help needed to attend", value: registration.accessibilityNeeds },
    { label: "Questions or suggestions", value: registration.comments },
  ];

  return (
    <dl className="divide-y border-t text-sm">
      {answers.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
          <dt className="leading-normal text-muted-foreground sm:w-56 sm:shrink-0">{label}</dt>
          <dd className="min-w-0 flex-1 leading-normal whitespace-pre-line wrap-anywhere">
            {value ?? <span className="text-muted-foreground">Not given</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Lines({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/** The link is built at render from APP_URL (never stored); without it, say why it's missing. */
function EventPassLinkOrNotice({ token }: { token: string }) {
  let link: string;
  try {
    link = eventPassLink(token);
  } catch {
    return <p className="leading-normal text-destructive">Can&apos;t build the link: APP_URL isn&apos;t set</p>;
  }
  return <EventPassLink link={link} />;
}

function CheckIns({ checkIns }: { checkIns: RegistrationDetail["checkIns"] }) {
  if (checkIns.length === 0) {
    return <p className="text-sm leading-normal text-muted-foreground">Not checked in</p>;
  }
  return (
    <ul className="divide-y border-t text-sm">
      {checkIns.map((checkIn) => {
        const checkedInAt = checkIn.checkedInAt.toISOString();
        return (
          <li key={checkIn.eventDay} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
            <span className="leading-normal font-medium sm:w-56 sm:shrink-0">{eventDayLabel(checkIn.eventDay, "en")}</span>
            <span className="flex flex-wrap items-center gap-2 leading-normal">
              <span>
                Checked in{" "}
                <time dateTime={checkedInAt} className="tabular-nums">
                  {formatCreatedAt(checkedInAt)}
                </time>
              </span>
              {checkIn.outsideRegisteredDay && (
                <Badge variant="outline" className="border-orange-700 text-orange-800">
                  not a registered day
                </Badge>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
