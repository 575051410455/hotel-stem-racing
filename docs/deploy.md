# Deploying to the server

The operator guide is **[`docs/deploy-guide/index.html`](deploy-guide/index.html)**. Open it in a browser straight from the checkout; it needs no server. Fill in your domain once, and every command on the page uses it. Each step has a checkbox, and ticked steps are remembered in that browser.

It covers:

- the server, the Cloudflare Tunnel and the Cloudflare settings;
- `.env`, the first start, and the Admin, Staff and Kiosk Accounts;
- the visitor-IP check, day-to-day operations and troubleshooting.

In short: an Ubuntu server runs Docker Compose with `app`, `db` (PostgreSQL 17), `nginx` and `cloudflared`. Visitors reach the site through a Cloudflare Tunnel, so the server publishes no port, and TLS ends at Cloudflare's edge (ADR 0005).

```
Visitor ──HTTPS──▶ Cloudflare edge ◀══tunnel══ cloudflared ──▶ nginx :80 ──▶ app :3000 ──▶ db :5432
```

The commands used most:

```sh
docker compose up -d --build                                  # build and (re)start everything
docker compose exec app npm run seed                          # the first Admin Account (from SEED_STAFF_* in .env)
docker compose exec -it app npm run staff -- create-admin <email> "<name>"
docker compose exec app npm run staff -- make-admin <email>   # an existing Account becomes an Admin
docker compose exec -it app npm run staff -- reset-password <email>
docker compose logs -f app
```

Never run `docker compose down -v`: `-v` deletes the database volume and every Registration.
