import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/session";
import { event } from "@/lib/event";
import { type RegistrationDetail, registrationIdFromPath } from "@/lib/registrations/detail";
import { passLink } from "@/lib/registrations/event-pass-codec";
import { organisationLabel, type ReferralSource, referralSourceLabels } from "@/lib/registrations/fields";
import { registrations } from "@/lib/server/registrations";
import { attendeeRoleListLabels, formatCreatedAt, formatPhone } from "../../_registration-list/format";
import { registrationListHref } from "../../_registration-list/list-links";
import { DeleteRegistration } from "./delete-registration";
import { DetailEventPassEmail, EventPassLink } from "./detail-actions";

export const metadata: Metadata = { title: "รายละเอียดการลงทะเบียน" };

// /admin/registrations/{id}: every answer of one Registration, its Event Pass, email status and
// Check-Ins, and delete. Staff-only; the id, the session and the data are request-time, so it all
// renders behind one boundary. The query string is the list view to return to (see list-links.ts).
export default function RegistrationDetailPage({ params, searchParams }: PageProps<"/admin/registrations/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Suspense
        fallback={
          <p role="status" className="text-sm leading-normal text-muted-foreground">
            กำลังโหลดรายละเอียดการลงทะเบียน…
          </p>
        }
      >
        <RegistrationDetailContent params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function RegistrationDetailContent({
  params,
  searchParams,
}: Pick<PageProps<"/admin/registrations/[id]">, "params" | "searchParams">) {
  await requireStaff();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const listParams = queryEntries(query);
  const listHref = registrationListHref(listParams);

  const lookup = await registrations().getRegistrationDetail(registrationIdFromPath(id));
  if (lookup.status === "not-found") {
    return (
      <>
        <BackToList href={listHref} />
        <h1 className="mt-6 text-2xl leading-normal font-semibold">ไม่พบการลงทะเบียนนี้</h1>
        <p className="mt-2 leading-normal text-muted-foreground">อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>
      </>
    );
  }

  const registration = lookup.registration;
  const attendeeName = `${registration.givenName} ${registration.familyName}`;
  const createdAt = registration.createdAt.toISOString();

  return (
    <>
      <BackToList href={listHref} />
      <h1 className="mt-6 text-2xl leading-normal font-semibold wrap-anywhere">{attendeeName}</h1>
      <p className="mt-1 text-sm leading-normal text-muted-foreground">
        <span className="font-mono">{registration.passCode}</span> · ลงทะเบียนเมื่อ{" "}
        <time dateTime={createdAt} className="tabular-nums">
          {formatCreatedAt(createdAt)}
        </time>
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <Section title="ข้อมูลการลงทะเบียน">
          <Answers registration={registration} />
        </Section>

        <Section title="Event Pass">
          <dl className="flex flex-col gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">รหัส Event Pass</dt>
              <dd className="font-mono text-lg leading-normal font-semibold">{registration.passCode}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">ลิงก์ Event Pass</dt>
              <dd className="flex flex-col gap-2">
                <EventPassLinkOrNotice token={registration.token} />
                <p className="text-xs leading-normal text-muted-foreground">
                  ส่งลิงก์นี้ให้ผู้เข้าร่วมงานที่หา Event Pass ไม่พบ ใครมีลิงก์ก็เปิด Event Pass ได้
                  จึงควรส่งให้เจ้าของเท่านั้น
                </p>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted-foreground">อีเมล Event Pass</dt>
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

        <Section title="การเช็คอิน">
          <CheckIns checkIns={registration.checkIns} />
        </Section>

        <Section title="ลบการลงทะเบียน">
          <p className="mb-4 text-sm leading-normal text-muted-foreground">
            สำหรับการลงทะเบียนที่เป็นสแปมหรือการลงทะเบียนซ้ำ การเช็คอินของการลงทะเบียนนี้จะถูกลบไปด้วย
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
      กลับไปรายการลงทะเบียน
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

const eventDayLabels = new Map<string, string>(event.eventDays.map(({ date, label }) => [date, label]));
const eventDayLabel = (date: string) => eventDayLabels.get(date) ?? date;

/** In a list, "Other" is just "Other"; what the Attendee typed follows it. */
const referralLabels: Record<ReferralSource, string> = { ...referralSourceLabels, other: "อื่น ๆ" };

const withOther = (label: string, other: string | null) => (other ? `${label}: ${other}` : label);

/** Every answer from the registration form, in the form's order, with its Thai label. */
function Answers({ registration }: { registration: RegistrationDetail }) {
  const answers: { label: string; value: ReactNode }[] = [
    { label: "ชื่อ", value: registration.givenName },
    { label: "นามสกุล", value: registration.familyName },
    {
      label: "เบอร์โทรศัพท์",
      value: (
        <a href={`tel:${registration.phone}`} className="tabular-nums underline-offset-4 hover:underline">
          {formatPhone(registration.phone)}
        </a>
      ),
    },
    {
      label: "อีเมล",
      value: (
        <a href={`mailto:${registration.email}`} className="underline-offset-4 hover:underline">
          {registration.email}
        </a>
      ),
    },
    {
      label: "ฐานะการเข้าร่วมงาน",
      value: withOther(attendeeRoleListLabels[registration.role], registration.roleOther),
    },
    { label: organisationLabel(registration.role), value: registration.organisation },
    {
      label: "วันเข้าร่วมงาน",
      value: <Lines items={registration.eventDays.map(eventDayLabel)} />,
    },
    {
      label: "ช่องทางที่ทราบข่าว",
      value: (
        <Lines
          items={registration.referralSources.map((source) =>
            source === "other" ? withOther(referralLabels.other, registration.referralOther) : referralLabels[source],
          )}
        />
      ),
    },
    { label: "ทีมที่ต้องการมาเชียร์", value: registration.competingTeamCheeredFor },
    { label: "ความช่วยเหลือที่ต้องการในการเข้าร่วมงาน", value: registration.accessibilityNeeds },
    { label: "ข้อสอบถามหรือข้อเสนอแนะ", value: registration.comments },
  ];

  return (
    <dl className="divide-y border-t text-sm">
      {answers.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6">
          <dt className="leading-normal text-muted-foreground sm:w-56 sm:shrink-0">{label}</dt>
          <dd className="min-w-0 flex-1 leading-normal whitespace-pre-line wrap-anywhere">
            {value ?? <span className="text-muted-foreground">ไม่ได้ระบุ</span>}
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
    link = passLink(token);
  } catch {
    return <p className="leading-normal text-destructive">สร้างลิงก์ไม่ได้ เพราะยังไม่ได้ตั้งค่า APP_URL</p>;
  }
  return <EventPassLink link={link} />;
}

function CheckIns({ checkIns }: { checkIns: RegistrationDetail["checkIns"] }) {
  if (checkIns.length === 0) {
    return <p className="text-sm leading-normal text-muted-foreground">ยังไม่ได้เช็คอิน</p>;
  }
  return (
    <ul className="divide-y border-t text-sm">
      {checkIns.map((checkIn) => {
        const checkedInAt = checkIn.checkedInAt.toISOString();
        return (
          <li key={checkIn.eventDay} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
            <span className="leading-normal font-medium sm:w-56 sm:shrink-0">{eventDayLabel(checkIn.eventDay)}</span>
            <span className="flex flex-wrap items-center gap-2 leading-normal">
              <span>
                เช็คอินเมื่อ{" "}
                <time dateTime={checkedInAt} className="tabular-nums">
                  {formatCreatedAt(checkedInAt)}
                </time>
              </span>
              {checkIn.outsideRegisteredDay && (
                <Badge variant="outline" className="border-orange-700 text-orange-800">
                  นอกวันที่ลงทะเบียน
                </Badge>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
