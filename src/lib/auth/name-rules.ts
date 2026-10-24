// The display-name limit, shared by the Accounts module and the My Account form in the browser.
// Pure: no server code, so the browser form can import it.

/** Counted like the browser's `maxLength`, in UTF-16 code units. */
export const MAX_NAME_LENGTH = 100;
