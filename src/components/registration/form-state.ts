import type { SubmitResult } from "@/lib/registrations/registrations";

/**
 * What the registration form shows after a submission. An accepted Registration never comes
 * back: the Server Action redirects to its Event Pass instead. Every other outcome of
 * "submit a Registration" (06 duplicate, 07 closed, 08 bot-check-failed) arrives here as is.
 */
export type RegistrationFormState =
  | { status: "idle" }
  | Exclude<SubmitResult, { status: "accepted" }>;

export type SubmitRegistrationAction = (
  previous: RegistrationFormState,
  formData: FormData,
) => Promise<RegistrationFormState>;
