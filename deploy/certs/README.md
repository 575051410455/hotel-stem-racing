# Cloudflare Origin Certificate

nginx reads two files from this directory. They are mounted read-only into the container at `/etc/nginx/certs`:

| File         | Contents                                           |
| ------------ | -------------------------------------------------- |
| `origin.pem` | the Origin Certificate (PEM, `-----BEGIN CERTIFICATE-----`) |
| `origin.key` | its private key (PEM, `-----BEGIN PRIVATE KEY-----`)       |

They exist only on the server. Git ignores everything here except this README, so never commit or copy them anywhere else. To create them, see "Origin Certificate" in [`docs/deploy.md`](../../docs/deploy.md).

```sh
chmod 644 deploy/certs/origin.pem
chmod 600 deploy/certs/origin.key
```

The certificate is trusted only by Cloudflare, not by browsers. That is expected: visitors reach the site through Cloudflare's edge certificate, and Cloudflare (SSL mode Full (strict)) checks this one when it connects to the server.
