import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { event } from "@/lib/event";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

// Static page: the form signs in from the browser through /api/auth, where Better Auth rate-limits.
export default function StaffSignInPage() {
  return (
    <main className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl leading-normal">เข้าสู่ระบบหลังบ้าน</h1>
          </CardTitle>
          <CardDescription>สำหรับเจ้าหน้าที่ {event.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </main>
  );
}
