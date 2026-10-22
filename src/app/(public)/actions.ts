"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { RegistrationFormState } from "@/components/registration/form-state";
import { submissionContext } from "@/lib/bot-check/submission-context";
import { registrationFormFromFormData } from "@/lib/registrations/fields";
import { registrations } from "@/lib/server/registrations";

/** Submits the registration form; an accepted Registration goes straight to its Event Pass. */
export async function submitRegistration(
  _previous: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const result = await registrations().submit(
    registrationFormFromFormData(formData),
    submissionContext(formData, await headers()),
  );
  if (result.status === "accepted") redirect(`/p/${result.pass.token}`);
  return result;
}
