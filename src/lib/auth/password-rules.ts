// Account password rules (pure), shared by the auth config, the Accounts commands and the browser.

/** At least 12 characters, no composition rules (spec: Back Office → Staff Accounts). */
export const MIN_PASSWORD_LENGTH = 12;
/** Better Auth's own default upper bound, stated here so the command and forms can check it before sending. */
export const MAX_PASSWORD_LENGTH = 128;
