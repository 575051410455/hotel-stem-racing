import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventPassCard } from "@/components/registration/EventPassCard";
import { Container } from "@/components/site/Container";
import { event } from "@/lib/event";
import { eventPassLink, registrations } from "@/lib/server/registrations";

export const metadata: Metadata = {
  title: `บัตรเข้างาน ${event.name}`,
  // The link is the pass: keep it out of search results and out of Referer headers.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function EventPassPage({ params }: PageProps<"/p/[token]">) {
  return (
    <Container className="flex flex-col gap-6 py-8 tab:gap-8 tab:py-10">
      <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-2">
        <h1 className="text-[1.25rem] font-black italic tab:text-[1.5rem]">
          ขอบคุณสำหรับการลงทะเบียนเข้าร่วมงาน {event.name} 🏁
        </h1>
        <p>แล้วพบกันในวันที่ท่านเลือก ณ {event.venue}</p>
        <p className="text-[0.875rem] text-muted">
          กรุณาบันทึกหน้านี้หรือบันทึกภาพหน้าจอไว้ เพื่อแสดง QR ที่ทางเข้างาน
        </p>
      </section>
      <Suspense fallback={<EventPassPlaceholder />}>
        <EventPass params={params} />
      </Suspense>
    </Container>
  );
}

// Params and the database read are request-time data, so they stay under <Suspense>.
async function EventPass({ params }: Pick<PageProps<"/p/[token]">, "params">) {
  const { token } = await params;
  const lookup = await registrations().getEventPass(token);
  if (lookup.status === "not-found") notFound();

  return <EventPassCard pass={lookup.pass} link={eventPassLink(lookup.pass.token)} />;
}

function EventPassPlaceholder() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex h-[640px] w-[min(100%,528px)] items-center justify-center rounded-input border border-line bg-surface text-muted"
    >
      กำลังโหลดบัตรเข้างาน…
    </div>
  );
}
