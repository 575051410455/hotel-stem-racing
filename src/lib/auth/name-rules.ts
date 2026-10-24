// The display-name limit, shared by the Accounts module and the forms in the browser (My Account,
// New Account, an Account's page). Pure: no server code, so the browser forms can import it.

/** Counted like the browser's `maxLength`, in UTF-16 code units. */
export const MAX_NAME_LENGTH = 100;
