"use server";

import { redirect } from "next/navigation";
import type { RegistrationFormState } from "@/components/registration/form-state";
import { registrationFormFromFormData } from "@/lib/registrations/fields";
import { registrations } from "@/lib/server/registrations";

/** Submits the registration form; an accepted Registration goes straight to its Event Pass. */
export async function submitRegistration(
  _previous: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const result = await registrations().submit(registrationFormFromFormData(formData));
  if (result.status === "accepted") redirect(`/p/${result.pass.token}`);
  return result;
}
