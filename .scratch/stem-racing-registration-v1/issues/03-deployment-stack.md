# 03: Deployment stack

**What to build:** The operator can deploy the app on an Ubuntu server with one Docker Compose command. The stack has three services: app, PostgreSQL 17 and nginx. It runs behind Cloudflare's proxy using a Cloudflare Origin Certificate, and nginx passes the real client IP to the app.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The app builds as Next.js standalone output in a multi-stage Docker image and applies database migrations on start
- [ ] Compose defines `app`, `db` (PostgreSQL 17 on a named volume that app rebuilds never touch) and `nginx`
- [ ] nginx:
  - terminates TLS with the Origin Certificate and key mounted from the host
  - redirects HTTP to HTTPS
  - restores the client IP from Cloudflare's forwarded header, trusted only for Cloudflare's published IP ranges
- [ ] Build-time public variables (`NEXT_PUBLIC_*`) are passed as build args from the server's `.env`
- [ ] A short operator checklist covers DNS proxied on Cloudflare, placing the Origin Certificate, filling `.env`, and `docker compose up -d --build`
- [ ] The production build passes locally. Compose and nginx config can't be run locally (no Docker on the dev machine), so this is stated in the hand-off and verified on the server.
