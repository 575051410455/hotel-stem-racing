import Image from "next/image";
import { RegistrationForm } from "@/components/registration/RegistrationForm";
import { Container } from "@/components/site/Container";
import { event } from "@/lib/event";
import { submitRegistration } from "./actions";

export default function RegistrationPage() {
  return (
    <>
      <Image
        src="/brand/banner.jpg"
        alt={`${event.name} National Finals — Grand Richmond`}
        width={5000}
        height={1250}
        sizes="100vw"
        loading="eager"
        fetchPriority="high"
        className="h-auto w-full"
      />
      <Container className="flex flex-col gap-8 py-8 tab:gap-10 tab:py-10">
        <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-2">
          <h1 className="text-[1.25rem] font-black italic tab:text-[1.5rem]">
            ลงทะเบียนเข้าร่วมงาน {event.name}
          </h1>
          <p>
            ขอเชิญร่วมสัมผัสบรรยากาศการแข่งขัน {event.name}{" "}
            และส่งกำลังใจให้เยาวชนผู้เข้าร่วมการแข่งขัน
          </p>
          <p className="text-muted">
            วันที่ {event.dateRangeLabel} · {event.venue}
          </p>
        </section>
        <RegistrationForm action={submitRegistration} />
      </Container>
    </>
  );
}
