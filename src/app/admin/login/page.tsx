import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { event } from "@/lib/event";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

// Static page: the form signs in from the browser through /api/auth, where Better Auth rate-limits.
// Layout from shadcn/ui's login-01 block: a centred card on a full-height page.
export default function StaffSignInPage() {
  return (
    <main className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>
              <h1 className="text-xl leading-normal">Sign in to the Back Office</h1>
            </CardTitle>
            <CardDescription>For Staff of {event.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
