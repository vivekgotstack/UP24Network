# VPS operations

The production stack runs PostgreSQL 17, RabbitMQ 4.4.0, Spring Boot with FFmpeg,
Next.js and Caddy. Only Caddy publishes ports 80/443. Database, broker and backend
ports stay private. RabbitMQ uses persistent queues on one VPS; PostgreSQL's
encrypted job outbox remains the recovery source if broker messages are lost.

## Prepare your configuration

On the development machine, `./scripts/Initialize-ServiceEnvironment.ps1` and
`./scripts/Initialize-MediaEnvironment.ps1` add missing fields to ignored
`backend/.env` without replacing existing values. Supply your own verified Brevo
sender/API key, AWS credentials, S3 bucket, CloudFront media origin and production
administrator password. Rashifal and YouTube API keys enable their corresponding
source adapters. Never put these keys in frontend environment variables.

Edit `frontend/.env.production` for the public site origin, search indexing, and
Android certificate fingerprints. The file is ignored by Git. The preparation
command reads it when building the Docker deployment configuration. The backend
address and trusted proxy settings are set by Compose on the private network.

`./scripts/Configure-MediaStorage.ps1` accepts the real `-Bucket`, `-CdnUrl` and
`-SiteUrl`, plus optional `-AccountId`/`-DistributionId`. It saves public origins,
preserves credential fields and generates scoped IAM, exact-origin CORS and
CloudFront OAC policies in ignored `.local/media-storage`. Runtime permissions
cover published image/video objects and private video originals; CloudFront gets
read access only to published prefixes. Keep S3 Block Public Access enabled.
Apply the generated policies in your own AWS account. Select
`UP24_MEDIA_STORAGE=s3` when the account configuration is ready.

Run `node scripts/prepare-deployment.mjs --site=https://www.up24network.com`.
The generator produces actual database/broker/signing secrets in ignored
`.local/deployment`, preserving them on repeat runs. Its separate job-encryption
key must remain stable while queued work exists. Copy the project and that
private directory to the VPS; protect the directory with `chmod 700` on Linux.
New signing-key generation needs JDK 21+; a prepared signing key can be copied
with its matching private configuration instead. Host scripts use Node 24 LTS.

The VPS needs Docker Engine with Compose 2.24+ and public DNS pointing at it.
Allow inbound 80/443 for certificate issuance and HTTPS. The container memory
limits total about 3.6 GiB; use at least 8 GB RAM for builds, encoding and OS
headroom. Encoding is bounded to one media consumer with two codec threads.

## Start or upgrade

Run `node scripts/deployment-doctor.mjs`, then `node scripts/deploy.mjs`.
Preflight checks the private settings, role separation, provider configuration,
Compose syntax and Linux Docker engine without printing secrets. Set a production
admin password of at least 16 characters. `--config-only` skips Docker execution;
`--structure-only` checks prepared files without provider or Docker verification.

The deploy command builds before replacing application services, waits for
database/broker/backend/frontend health and verifies the public HTTPS manifest.
It remounts file-backed secrets on service recreation. This single-VPS setup
has a short interruption during replacement; it does not claim zero downtime.
Verify one admin OTP, publication and video playback using your actual accounts.
Live provider permissions and certificate/DNS readiness cannot be proved offline.

Admin → Media library controls 365-day Standard-to-GIR rules for published images
and video, with per-image exclusions. Transition rules never delete published content. S3 versions, logs,
private originals and backups are billed separately from tracked library quotas.

## Back up and recover

Before upgrades, run `node scripts/backup-deployment.mjs` and copy the resulting
private recovery point off the VPS. The command briefly stops frontend/backend
writers, captures a consistent database plus local media/private video sources,
copies matching secrets, records SHA-256 checksums and restarts previously running
writers. PostgreSQL and RabbitMQ keep running. An unfinished backup has an
`INCOMPLETE` marker and cannot be restored as a complete recovery point.

This backup does **not** download S3 objects. Protect them with versioning and an
independent recovery policy. Recover cloud objects alongside the matching media
catalogue. Caddy can obtain fresh certificates after DNS is restored.

Inspect a recovery point using
`node scripts/restore-deployment.mjs --from=/absolute/recovery/path --verify-only`.
Restoration replaces current data and requires an explicit `--replace-existing`
flag. Take a current backup first. The restore verifies checksums and safe archive
paths, stops writers, restores matching secrets, uses a single database restore
transaction and stages media before switching it into place. It keeps previous
configuration under `.local/restore-safety` and previous media in a
`.before-restore-UUID` directory inside the upload volume. Remove retained old
media only after checking the recovered site. A failed restore leaves application
writers stopped rather than serving an inconsistent recovery.

Use the PostgreSQL major version recorded in the manifest; perform version
upgrades as a separate operation. Broker messages contain only job UUIDs, so
restore resets the broker and requeues eligible work from the restored database.
Do not remove named volumes or run `docker compose down -v` during upgrades.

## Configuration changes and diagnostics

Edit owner-controlled backend values, rerun the deployment generator, then use
`node scripts/deploy.mjs` so replaced secret/config files are remounted. Changing
the admin password revokes existing administrator logins. Do not rotate database
or RabbitMQ passwords without updating the matching stored service credentials.
Drain queued work before rotating the job-encryption key.

Use `docker compose --env-file .local/deployment/deployment.env ps` for health and
`logs --tail=100 backend` or `logs --tail=100 rabbitmq` for service diagnostics.
Logs rotate automatically. Never paste secret configuration or full request
payloads into issue reports.

The private application subnet is `172.30.24.0/24`. If it conflicts with the VPS,
update both static application addresses and Tomcat's trusted-proxy expression
together. Caddy supplies the client address, Next forwards only validated values,
and Tomcat trusts only the Next container. Reconfigure trusted ingress explicitly
before adding another proxy/CDN in front of the application.

The public reader is installable as a PWA; private data and news HTML stay outside
the service-worker cache. Android packaging and Play Console steps remain in
`android/RELEASE.md`.
