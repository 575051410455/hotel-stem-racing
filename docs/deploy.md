# Deploying to the server

This is the operator checklist for running the registration site on an Ubuntu server with Docker Compose, behind Cloudflare's proxy.

```
Visitor ──HTTPS──▶ Cloudflare edge ──HTTPS (Origin Certificate)──▶ nginx :443 ──▶ app :3000 ──▶ db :5432
                                                                    (only published ports: 80, 443)
```

| Service | Image | Notes |
| ------- | ----- | ----- |
| `app`   | built from `Dockerfile` | Next.js standalone server. Applies database migrations on every start, then serves on port 3000 (Compose network only). |
| `db`    | `postgres:17-alpine` | Data lives in the named volume `stem-racing_db-data`. Rebuilding or recreating `app` never touches it. |
| `nginx` | `nginx:1.30.6-alpine` | Terminates TLS with the Origin Certificate, redirects HTTP to HTTPS, restores the visitor's IP from Cloudflare, and proxies to `app`. Config is in `deploy/nginx/conf.d/`. |

All commands below run from the repo checkout on the server.

## 1. Server

- [ ] Install Docker Engine and the Compose plugin: https://docs.docker.com/engine/install/ubuntu/. Check with `docker compose version`.
- [ ] Allow inbound 22, 80 and 443 in the provider's firewall.
  - Optional hardening: allow 80/443 only from [Cloudflare's ranges](https://www.cloudflare.com/ips/). Docker's published ports bypass `ufw`, so do this in the provider's firewall or Docker's `DOCKER-USER` chain, not in `ufw`.
- [ ] Give the server at least 2 GB of RAM, or add swap: `next build` runs on the server and can run out of memory on a 1 GB machine.
- [ ] Clone the repo, for example to `/opt/stem-racing`.

## 2. Cloudflare DNS and SSL

- [ ] **DNS:** add an `A` record for the registration subdomain pointing at the server's **IPv4** address, with the proxy status **Proxied** (orange cloud).
  - Don't add an `AAAA` record. Compose publishes ports on IPv4 only, because Docker forwards IPv6 connections through a proxy that hides their source address. nginx would then not see a Cloudflare IP and could not restore the visitor's IP.
- [ ] **SSL/TLS → Overview:** set the encryption mode to **Full (strict)**.
- [ ] **SSL/TLS → Edge Certificates:** turn on **Always Use HTTPS**. nginx also redirects, so this is belt and braces.

## 3. Origin Certificate

- [ ] **SSL/TLS → Origin Server → Create Certificate:**
  - let Cloudflare generate the private key (RSA 2048 is fine)
  - hostnames: the registration subdomain, or `*.example.com` plus `example.com`
  - validity: 15 years
  - key format: PEM
- [ ] Copy both blocks into these files on the server. Cloudflare shows the private key only once.
  ```sh
  nano deploy/certs/origin.pem   # "Origin Certificate" block
  nano deploy/certs/origin.key   # "Private Key" block
  chmod 644 deploy/certs/origin.pem
  chmod 600 deploy/certs/origin.key
  ```
  Git ignores both files (`deploy/certs/README.md`), so never commit them.

## 4. Fill in `.env`

- [ ] `cp .env.example .env && chmod 600 .env`, then edit it:

| Variable | Value on the server |
| -------- | ------------------- |
| `APP_URL` | `https://<registration domain>`, with no trailing slash. QR links and email links are built from this. |
| `BETTER_AUTH_URL` | same as `APP_URL` |
| `BETTER_AUTH_SECRET` | output of `openssl rand -hex 32` |
| `POSTGRES_PASSWORD` | output of `openssl rand -hex 32`. Hex keeps it URL-safe, since it goes into the app's `DATABASE_URL`. |
| `DATABASE_URL` | leave as is: Compose replaces it with `postgres://stem_racing:<POSTGRES_PASSWORD>@db:5432/stem_racing` |
| `TEST_DATABASE_ADMIN_URL` | unused on the server |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | real keys from Cloudflare Turnstile, with the registration domain added as an allowed hostname. The example values are test keys that let everything through. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | the Gmail or Google Workspace account. `SMTP_PASS` is an app password; write it without spaces. Leave `SMTP_USER` empty to launch without email. |
| `NEXT_PUBLIC_CONTACT_LINE`, `NEXT_PUBLIC_CONTACT_PHONE` | the organisers' contact channels (each is hidden when empty) |

- `NEXT_PUBLIC_*` values are baked into the app at build time. After changing one, rebuild with `docker compose up -d --build`.
- `POSTGRES_PASSWORD` is applied only when the database volume is first created. To change it later, run `ALTER USER stem_racing PASSWORD '…'` in `psql` (section 8), then update `.env` and run `docker compose up -d`.
- Avoid `$` in values: Compose treats it as a variable reference.

## 5. Start

- [ ] Build and start everything:
  ```sh
  docker compose up -d --build
  docker compose ps            # db and app should become "healthy"
  docker compose logs app      # expect "[migrate] applied N new migration(s)" and "Ready"
  ```
- [ ] Open `https://<registration domain>`: the registration page loads with a valid certificate.
- [ ] `curl -sI http://<registration domain>` returns `301` with `Location: https://…`.

## 6. First Staff Account and test email

Operator commands run inside the running `app` container, exactly like `npm run …` locally. The container gets its environment from `.env` through Compose, so no `.env` file is needed inside it. The "`.env` not found. Continuing without it." line in the output is harmless.

- [ ] Create the first Staff Account. The arguments are defined by the `staff` script (`scripts/`).
  ```sh
  docker compose exec app npm run staff -- <arguments>
  ```
- [ ] Sign in at `https://<registration domain>/admin/login`.
- [ ] Send a test Event Pass email to yourself, then check it arrives, including in the spam folder:
  ```sh
  docker compose exec app npm run email:test -- <arguments>
  ```
- [ ] Migrations can also be run by hand: `docker compose exec app npm run migrate`. It is idempotent and reports `applied 0 new migration(s)` when the database is up to date.

## 7. Check the visitor IP and logs

- [ ] Visit the site, then run `docker compose logs --tail 20 nginx`. Each access line starts with `<visitor IP> via <Cloudflare IP>`.
  - The visitor IP must be your own public IP. `https://<registration domain>/cdn-cgi/trace` shows it as `ip=`.
  - If the first field is a `172.x` Docker address or a Cloudflare IP, client-IP restoration isn't working, and every visitor would share one rate limit. Check the DNS and IPv6 notes in section 2.
- [ ] Logs:
  ```sh
  docker compose logs -f app          # app and migrations
  docker compose logs --tail 100 nginx
  docker compose logs --tail 100 db
  ```
  Docker keeps at most 5 × 10 MB of logs per container.

## 8. Day-to-day

- **Deploy a new version:** `git pull && docker compose up -d --build`. Migrations run automatically on start. The database volume is untouched.
- **Restart the app:** `docker compose restart app`.
- **Database shell:** `docker compose exec db psql -U stem_racing stem_racing`.
- **Backup** (do this before the Event and before risky changes):
  ```sh
  docker compose exec -T db pg_dump -U stem_racing -Fc stem_racing > stem-racing-$(date +%F-%H%M).dump
  ```
  To restore (this replaces the current data), stop the app first:
  ```sh
  docker compose stop app
  docker compose exec -T db pg_restore -U stem_racing -d stem_racing --clean --if-exists < file.dump
  docker compose start app
  ```
- **Refresh Cloudflare's IP ranges** (they rarely change):
  ```sh
  sh deploy/nginx/update-cloudflare-ips.sh
  docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
  ```
- **Never** run `docker compose down -v`: `-v` deletes the database volume and every Registration. Plain `docker compose down` is safe.

## Notes

- **Timeouts:** nginx allows requests of up to 300 s. Cloudflare ends any request after 100 s with error 524 (on non-Enterprise plans), so long jobs such as bulk email must work in batches that each finish well under 100 s.
- **Client IP for the app:** nginx sends the restored visitor IP as `X-Real-IP`, and sets `X-Forwarded-For` to that same single address. It strips `CF-Connecting-IP` and `True-Client-IP` before proxying.
- **Streaming:** nginx doesn't buffer app responses (`proxy_buffering off`), so Suspense and Partial Prerendering stream through.
