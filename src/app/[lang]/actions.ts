"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { RegistrationFormState } from "@/components/registration/form-state";
import { submissionContext } from "@/lib/bot-check/submission-context";
import { defaultLanguage, isLanguage, languagePath } from "@/lib/language";
import { registrationFormFromFormData } from "@/lib/registrations/fields";
import { registrations } from "@/lib/server/registrations";

/**
 * Submits the registration form, bound by the page to its language: field problems come back in
 * it, and an accepted Registration goes straight to its Event Pass in it.
 */
export async function submitRegistration(
  language: unknown,
  _previous: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  // A Server Action is a public endpoint: never trust the bound language.
  const formLanguage = isLanguage(language) ? language : defaultLanguage;
  const result = await registrations().submit(
    registrationFormFromFormData(formData),
    submissionContext(formData, await headers()),
    formLanguage,
  );
  if (result.status === "accepted") redirect(languagePath(formLanguage, `/p/${result.pass.token}`));
  return result;
}
