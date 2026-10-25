import { nameProblem } from "./name-rules";

/** Initials for an Account's fallback avatar. Old names outside the English rule use the email. */
export function accountInitials(name: string, email: string): string {
  if (nameProblem(name)) return email.match(/[A-Za-z]/)?.[0].toUpperCase() ?? "?";

  const words = name.trim().split(/ +/);
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words.at(-1)!.charAt(0) : "";
  return (first + last).toUpperCase();
}
