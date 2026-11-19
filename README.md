# UP24Network

UP24Network is a Hindi and English news portal with a private newsroom. Spring Boot and Spring Modulith power the API, Next.js serves the site, and PostgreSQL stores articles and accounts. Docker Compose runs the application, PostgreSQL, Redis, RabbitMQ, and Caddy.

## Run locally

Install JDK 21+, Maven, Node.js 24 with npm, and PostgreSQL. On Windows, run from the repository root.

```powershell
npm --prefix frontend ci
.\scripts\Start-Preview.ps1
```

Open [the local site](http://127.0.0.1:3000). Spring Boot listens on port 8080. Preview uses sample articles and an isolated database schema on port 55432. Read the sample logins in `backend/.local/preview-login.txt` and the local sign-in code in `backend/.local/preview-mailbox/latest-message.txt`. Use `./scripts/Backend.ps1 Restart -Profile default` to switch back to editorial data.

## Private configuration

Put production secrets in **`backend/.env`** using unquoted `KEY=value` lines. On a fresh checkout, the preview launcher creates this file. To add any missing service fields to an existing file, run `./scripts/Initialize-ServiceEnvironment.ps1` and `./scripts/Initialize-MediaEnvironment.ps1`.

| Backend keys | Value |
| --- | --- |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Owner sign-in email and a unique production password of 16–64 characters and at most 72 UTF-8 bytes |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Brevo key and verified sender for sign-in codes and recovery |
| `UP24_MEDIA_STORAGE`, `UP24_S3_BUCKET`, `AWS_REGION` | Set storage to `s3` and use the private bucket name and its region |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Scoped IAM credentials for the VPS. Add `AWS_SESSION_TOKEN` only for temporary credentials |
| `UP24_MEDIA_CDN_URL` | CloudFront HTTPS origin with no path |
| `ASTROLOGICS_API_KEY`, `WEATHERBIT_API_KEY` | Optional keys for Rashifal and air quality |
| `NEWSLETTER_LIST_ID`, `NEWSLETTER_DOI_TEMPLATE_ID` | Optional Brevo double opt-in list and template IDs |
| `YOUTUBE_API_KEY` | Optional YouTube Data API key. The feed also supports RSS |
| `SPORTMONKS_CRICKET_API_TOKEN` | Sportmonks Cricket API token for the homepage scoreboard. Enable Cricket scores in Admin → Automations |

**`frontend/.env.production`** holds public configuration. Set `SITE_URL=https://www.up24network.com` and `SITE_INDEXABLE=true` for launch. Compose sets `NEWS_API_URL`, and deployment uses the backend CloudFront origin when `MEDIA_CDN_URL` is empty. Set `ANDROID_SHA256_CERT_FINGERPRINTS` when configuring Android App Links. For local overrides use `frontend/.env.local`.

The env files, credentials, signing keys, and generated `.local` files are ignored by Git. Spring's `application.properties` contains shared defaults.

## Deploy to the VPS

1. Point the public DNS at the VPS, open ports 80 and 443, and install Docker Engine with Compose 2.24+ and Node.js 24. Allow at least 8 GB RAM for builds, video encoding, and the running services.
2. Set up the private S3 bucket and CloudFront Origin Access Control. Use `./scripts/Configure-MediaStorage.ps1` with `-Bucket`, `-CdnUrl`, `-SiteUrl`, and the region to generate the scoped IAM and CORS policies under `.local/media-storage`. Supply the AWS account and CloudFront distribution IDs to also generate the bucket policy. Apply the policies in AWS and keep S3 Block Public Access enabled.
3. From the repository root, prepare the private deployment files and check the values.

   ```sh
   node scripts/prepare-deployment.mjs
   node scripts/deployment-doctor.mjs --config-only
   ```

   Preparation generates and preserves the database, broker, cache, OTP, and signing secrets. Initial signing-key generation uses the JDK's `keytool`. Transfer `.local/deployment` privately to the VPS repository and set its directory permissions to `700`.
4. From the VPS repository root, run the full preflight and deploy.

   ```sh
   node scripts/deployment-doctor.mjs
   node scripts/deploy.mjs
   ```

5. Verify a real sign-in email, publish a report, and confirm one upload and video playback. Submit `/sitemap-index.xml` in Google Search Console once the public site is live. Enable provider-backed jobs under **Admin → Automations** as needed.

Caddy is the public entry point. Application, database, cache, and broker ports use the private Compose networks. To apply credential or environment changes, rerun preparation and deploy so the updated configuration is remounted.

## Backup and recovery

Before an upgrade, run `node scripts/backup-deployment.mjs` and copy the complete recovery directory off the VPS. It contains the database, local media, and matching secrets. Protect S3 objects with a separate recovery policy. Verify a recovery point with `node scripts/restore-deployment.mjs --from=/absolute/recovery/path --verify-only`. Restoring over an existing deployment requires `--replace-existing`.

For service health, run `docker compose --env-file .local/deployment/deployment.env ps`. For backend logs, use the same command prefix with `logs --tail=100 backend`.

## Android

After deploying the site, run `node scripts/build-android.mjs --setup` to build the Play Store bundle and release APK. Back up `.local/android-upload` privately and increment `--version-code` for each upload. When using Play App Signing, configure the distribution certificate fingerprint from Play Console so `/.well-known/assetlinks.json` matches the installed app.

## Newsroom

Admins can publish directly. Trusted editors can publish after completing verification and media-rights checks. Reporters submit work to daily editorial review. A future **Become a reporter** application could let vetted outside contributors submit previews for publication and a manually approved bounty.
