import Link from "next/link";
import { Container } from "@/components/site/Container";

export default function EventPassNotFound() {
  return (
    <Container className="py-8 tab:py-10">
      <section className="mx-auto flex w-[min(100%,528px)] flex-col gap-4 rounded-input border border-line bg-surface p-5 tab:p-8">
        <h1 className="text-[1.25rem] font-black italic tab:text-[1.5rem]">ไม่พบบัตรเข้างานนี้</h1>
        <p>ลิงก์อาจไม่ถูกต้องหรือไม่ครบถ้วน กรุณาตรวจสอบลิงก์อีกครั้ง หรือติดต่อผู้จัดงาน</p>
        <p>
          <Link href="/" className="font-bold text-link underline">
            ไปที่แบบฟอร์มลงทะเบียน
          </Link>
        </p>
      </section>
    </Container>
  );
}
