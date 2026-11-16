# VPS operations

Run `node scripts/prepare-deployment.mjs --site=https://www.up24network.com` once, then
`docker compose --env-file .local/deployment/deployment.env up --build -d`.
The generator reads administrator settings from `backend/.env`, generates real
database/OTP/signing secrets, preserves them on repeat runs, and copies configured
Brevo/provider settings. Keep `.local/deployment` private and back it up separately.
Docker Engine with Compose and a domain pointing at the VPS are required. Only
Caddy publishes ports 80/443; PostgreSQL and Spring Boot stay inside Docker networks.
The backend uses a restricted runtime database login and a distinct migration owner.

Volumes retain PostgreSQL, uploaded media, image cache and TLS certificates.
Before upgrades, run `node scripts/backup-deployment.mjs`; keep the resulting
private backup off the VPS. Restore database/media/signing material together.
Never use `docker compose down -v` for an upgrade: that removes persistent volumes.

Change `ADMIN_PASSWORD` in `backend/.env`, rerun the generator, then recreate the
backend: `docker compose --env-file .local/deployment/deployment.env up -d --force-recreate backend`.
Do not change generated database passwords without rotating the PostgreSQL roles
and matching mounted secrets together. A generator rerun deliberately does not rotate them.
Health checks: `docker compose --env-file .local/deployment/deployment.env ps`.
Logs are rotated automatically. The default container memory budget is about 2.4 GB;
use a VPS with at least 4 GB RAM for builds, PostgreSQL and operating-system headroom.

The private application network uses `172.30.24.0/24`; choose a different unused
subnet and update the two static service addresses and Tomcat's trusted-proxy
expression together if that range conflicts with the VPS. Caddy overwrites client
forwarding headers, Next forwards them only with `UP24_TRUST_PROXY_HEADERS=true`,
and Tomcat trusts only the Next container's `172.30.24.10` address. Do not publish
the frontend/backend container ports or enable that flag for an untrusted ingress.
This preserves per-client password throttling instead of treating every reader as
the same proxy address. Reconfigure trusted ingress explicitly before adding a CDN.

The reader is installable through its browser manifest and offline static shell.
Private data/news HTML are excluded from service-worker caches. The Android package
is under `android/`; its release notes list the remaining Play Console requirements.
