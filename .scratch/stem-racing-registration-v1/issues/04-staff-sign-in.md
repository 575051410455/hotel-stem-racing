# 04: Staff sign-in

**What to build:** Staff sign in to the Back Office at `/admin/login` with email and password, and only signed-in Staff can reach `/admin`. Staff Accounts are created and passwords reset with a command on the server. There is no public sign-up (ADR 0001).

**Blocked by:** 01

**Status:** resolved

- [x] Better Auth email/password:
  - sign-up disabled
  - auth tables added through their own migration
  - session lifetime at least 7 days
  - built-in sign-in rate limiting on
- [x] A server command creates a Staff Account or resets its password, and rejects passwords shorter than 12 characters. There are no composition rules.
- [x] `/admin/login` (Thai UI, no "forgot password" link) signs Staff in. Visiting `/admin` without a session redirects to `/admin/login`. Staff can sign out.
- [x] No public page links to the Back Office
- [x] Tests cover:
  - a Staff Account created by the command can sign in
  - a wrong password fails
  - a short password is rejected by the command

## Answer

Done in commit "feat(staff-auth): …". Better Auth 1.7.12 on the Drizzle adapter. Migration `drizzle/0001_staff_auth.sql` adds `users`, `sessions`, `accounts` and `verifications` (plural names, as in the spec). Schema: `src/lib/db/auth-schema.ts`, merged into the Drizzle client and `drizzle.config.ts`.

### Names

| What | Where |
| --- | --- |
| `createStaffAuth({ db, secret, baseURL })`: the Better Auth factory; `StaffAuth` type; `MIN_PASSWORD_LENGTH` (12), `SESSION_LIFETIME_SECONDS` (30 days) | `src/lib/auth/staff-auth.ts` |
| `staffAuth()`: the app's lazy, env-built instance (`server-only`) | `src/lib/auth/server.ts` |
| `getCurrentStaff()` → `CurrentStaff \| null`, `requireStaff()` → `CurrentStaff` (redirects), `BACK_OFFICE_SIGN_IN_PATH` (`server-only`) | `src/lib/auth/session.ts` |
| `createStaffAccounts(auth)` → `{ create, resetPassword }`: the command's code path, returning result unions | `src/lib/auth/staff-accounts.ts` |
| `readStaffAuthEnv()`: DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL | `src/lib/auth/env.ts` |
| `staffAuthClient`: browser client (sign-in) | `src/lib/auth/client.ts` |
| `signOut` Server Action | `src/app/admin/actions.ts` |

`CurrentStaff` is `{ id, name, email }`. `id` is the Better Auth user id: store it in `check_ins.staff_account_id` (ticket 13). A `users` row is a Staff Account. An `accounts` row is its credential (the password hash), not a GLOSSARY Account.

### Getting the current Staff member

- **Server Component (page):** call it below a `<Suspense>` boundary (Cache Components). Put new signed-in pages in `src/app/admin/(back-office)/<route>/page.tsx` to get the header (name and sign-out). The layout protects nothing, so every page checks for itself:
  ```tsx
  export default function Page() {
    return <Suspense fallback={…}><Content /></Suspense>;
  }
  async function Content() {
    const staff = await requireStaff(); // redirects to /admin/login when signed out
    …
  }
  ```
- **Route Handler (Back Office API):** put Staff-only endpoints under `src/app/api/back-office/…`, not under `/admin`. The proxy redirects cookie-less `/admin/*` requests to the HTML sign-in page, which breaks JSON callers such as TanStack Query. Check in every handler:
  ```ts
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401 });
  ```
- **Server Action:** start with `await requireStaff()`, or with `getCurrentStaff()` if you'd rather return an error. Actions are public endpoints, so the page check doesn't cover them.
- `src/proxy.ts` only checks that a session cookie exists, to give a real 307 for `/admin/*`. It is not the security boundary.

### shadcn/ui

- `components.json`: new-york style, Radix, neutral, lucide, aliases `@/components/ui` and `@/lib/utils`. The `cn` helper is in `src/lib/utils.ts`. Components: `src/components/ui/{button,input,label,card}.tsx`.
- Theme: the marked block at the end of `src/app/globals.css`. It is scoped to `.back-office`, which `src/app/admin/layout.tsx` sets, so public pages are unchanged. shadcn's `muted` and `accent` share names with public tokens, so `.back-office` re-points `--color-muted` and `--color-accent` instead of redefining them in `@theme`. In the Back Office, use `text-muted-foreground`, never `text-muted`, and don't reuse `src/components/site/*` (for example, `Wordmark` uses `text-accent`). Radii are Tailwind's defaults. Light mode only.
- `npx shadcn@latest add <component>` (4.22.1 here) needs checking after each run:
  1. Undo its `globals.css` edits. It adds `:root` variables, `@theme inline` entries for `--color-muted`, `--color-accent` and `--radius-*`, and base `*`/`body` rules, all of which change public pages.
  2. Fix the import if it writes `import { cn } from "cn"`, as `init` did in a probe. It must be `@/lib/utils`, and the unrelated npm package `cn` must not be installed.
- `tw-animate-css` isn't installed. Before adding animated components (Dialog, Select, Dropdown Menu, …), install it and put `@import "tw-animate-css";` right after `@import "tailwindcss";`. `lucide-react` isn't installed either; the CLI adds it when a component needs it.

### Staff command (ticket 03 runs it in the image)

- `npm run staff -- create <email> <display name>` and `npm run staff -- reset-password <email>`.
- The password comes from a hidden prompt (typed twice), or from `STAFF_PASSWORD` when it's set (non-interactive).
- It rejects passwords under 12 characters; there are no composition rules. Emails are trimmed and lower-cased.
- A reset signs that Staff member out of every device, Kiosks included.
- Exit codes: 0 success, 1 rejected or failed, 2 usage error. Output is in English, because it's an operator tool and not Back Office UI.
- It imports only runtime dependencies, never `server-only`, and has no top-level await.

### Gotchas

- **Sign in from the browser** (`staffAuthClient.signIn.email`), never through a Server Action. Better Auth only rate-limits HTTP requests to its handler; `auth.api.*` calls on the server aren't limited.
- **Rate limits** are Better Auth's built-in ones: sign-in allows 3 requests per 10 s per IP, everything else 100 per 10 s, held in memory (one per process). They are explicitly on in dev and tests too.
- **Client IP:** Better Auth reads `X-Real-IP`, then `X-Forwarded-For` only when it holds a single value. nginx must send `X-Real-IP $remote_addr` after restoring the Cloudflare IP. Otherwise every client shares one bucket.
- **BETTER_AUTH_URL** must be the public https origin. Better Auth checks the Origin header on POSTs against it, and cookies are `Secure` with the `__Secure-` prefix only when it starts with `https://`.
- **Sessions last 30 days** (the spec asks for at least 7). Server Components can't rewrite cookies, so Better Auth skips refreshing during RSC renders. The fixed lifetime is what keeps a Kiosk signed in through the Event.
- **`requireStaff()` inside `<Suspense>`** redirects by streaming (HTTP 200 plus a client redirect), not with a 307. Nothing below the boundary renders. Keep Staff-only data inside the boundary.
- **Build without secrets:** read the request (`await headers()`/`cookies()`) before calling `staffAuth()`. Otherwise prerender builds the instance and the build fails without env. `getCurrentStaff()` already does this.
- **Tests:** build the instance with `createStaffAuth({ db: database.db, … })` from `src/test-support/database.ts`. Call `auth.handler(new Request(…))` to go through the public API. Rate-limit counters are shared across instances in a process, so give each test its own `x-real-ip`.
- **Upgrading Better Auth or adding a plugin:** run `npx auth@<version> generate --adapter drizzle --dialect postgresql --output <tmp file>`, port the changes into `auth-schema.ts` (plural names, implicit snake_case, timestamptz), then `npm run db:generate`.
- `check_ins.staff_account_id` has no foreign key yet. Ticket 13 may add one to `users.id` in `schema.ts`.

### Verification

- Ticket 04 tests (12 in total): sign-in, wrong password, short password on create and reset, a 12-character plain password accepted, duplicate email, public sign-up refused, sign-in rate limit, reset revoking sessions, unknown email.
- Mutation-checked: with sign-up enabled, rate limiting off or session revocation removed, the matching tests fail.
- Build without `.env`: `mv .env .env.bak && npm run build` passed. `/admin` is partially prerendered and `/admin/login` is static.
- Smoke test with `next start` on port 3104 against `stem_racing_t04`:
  - `npm run staff` created a Staff Account (with `STAFF_PASSWORD`, and through the hidden prompt in a real pty, with no echo).
  - `/admin` signed out returns 307 to `/admin/login`.
  - In the browser: the wrong-password Thai error, sign-in, the name in the header, sign-out, and the Thai rate-limit message.
  - A forged cookie gets no Staff content.
  - The session cookie is HttpOnly and lasts 30 days.
  - `/` has no `/admin` link.
