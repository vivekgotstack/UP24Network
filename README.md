# TheMorningExpress

TheMorningExpress is a Hindi and English news portal with a private newsroom. Spring Boot and Spring Modulith power the API, Next.js serves the site, and PostgreSQL stores articles and accounts. Docker Compose runs the application, PostgreSQL, Redis, RabbitMQ, and Caddy.

## Run locally

Install JDK 21+, Maven, Node.js 24 with npm, and PostgreSQL. On Windows, run from the repository root.

```powershell
npm --prefix frontend ci
.\scripts\Start-Preview.ps1
```

Open [the local site](http://127.0.0.1:3000). Spring Boot listens on port 8080. Preview uses sample articles and an isolated database schema on port 55432. Read the sample logins in `backend/.local/preview-login.txt` and the local sign-in code in `backend/.local/preview-mailbox/latest-message.txt`. Use `./scripts/Backend.ps1 Restart -Profile default` to switch back to editorial data.

Use `.\scripts\Start-OptimizedPreview.ps1` for a production-mode local preview. It runs outside the Next.js build directory so you can rebuild while the preview is open. Use `.\scripts\Stop-Preview.ps1` to stop the frontend and Spring Boot.

## Private configuration

Put production secrets in **`backend/.env`** using unquoted `KEY=value` lines. On a fresh checkout, the preview launcher creates this file. To add any missing service fields to an existing file, run `./scripts/Initialize-ServiceEnvironment.ps1` and `./scripts/Initialize-MediaEnvironment.ps1`.

| Backend keys | Value |
| --- | --- |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Owner sign-in email and a unique production password of 16–64 characters and at most 72 UTF-8 bytes |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Brevo key and verified sender for sign-in codes and recovery |
| `UP24_MEDIA_STORAGE` | `local` stores uploads on the VPS. `s3` uses the configured object storage |
| `UP24_S3_BUCKET`, `AWS_REGION` | Private bucket and Region when using `s3` |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | Scoped IAM credentials for the VPS. Add `AWS_SESSION_TOKEN` only for temporary credentials |
| `UP24_MEDIA_CDN_URL` | CloudFront HTTPS origin with no path |
| `ASTROLOGICS_API_KEY`, `WEATHERBIT_API_KEY` | Optional keys for Rashifal and air quality |
| `NEWSLETTER_LIST_ID`, `NEWSLETTER_DOI_TEMPLATE_ID` | Optional Brevo double opt-in list and template IDs |
| `YOUTUBE_API_KEY` | Optional YouTube Data API key. The feed also supports RSS |

**`frontend/.env.production`** holds public configuration. Deployment preparation defaults to `SITE_INDEXABLE=true` for `https://themorningexpres.com` and `false` for new preview origins. Set `SITE_INDEXABLE` explicitly to override that default. After changing it, rerun deployment preparation and deploy. Verify that the live `/robots.txt` allows crawling and lists `/sitemap-index.xml`. Compose sets `NEWS_API_URL`, and deployment uses the backend CloudFront origin when `MEDIA_CDN_URL` is empty. Set `ANDROID_SHA256_CERT_FINGERPRINTS` when configuring Android App Links. To show official social links, set the relevant `YOUTUBE_CHANNEL_URL`, `FACEBOOK_PAGE_URL`, `INSTAGRAM_PROFILE_URL`, or `X_PROFILE_URL`. For local overrides use `frontend/.env.local`.

The env files, credentials, signing keys, and generated `.local` files are ignored by Git. Spring's `application.properties` contains shared defaults.

The homepage uses SportScore's free editorial cricket widget. It updates automatically and requires no account or API key. Admin → Site settings controls visibility, and readers can allow it through Cookie settings.

## Deploy to the VPS

1. Point `themorningexpres.com` at the VPS, open ports 80 and 443, and install Docker Engine with Compose 2.24+ and Node.js 24. Allow at least 8 GB RAM for builds, video encoding, and the running services.
2. Fill `backend/.env` with the production admin credentials and verified Brevo sender details. If starting with VPS storage, use `UP24_MEDIA_STORAGE=local`. For your configured S3 setup, supply the keys above and use `https://themorningexpres.com` as the upload origin.
3. Run from the VPS repository root.

   ```sh
   node scripts/prepare-deployment.mjs
   node scripts/deploy.mjs
   ```

   Prepare generates and preserves the private deployment files and uses `keytool` on first setup. If you already prepared the files on your computer, copy `.local/deployment` privately into the VPS checkout, run `chmod 700 .local/deployment`, and run only `node scripts/deploy.mjs`. Deploy runs the preflight, builds the images, and verifies the HTTPS site after startup.
4. Verify one administrator OTP and publish a report. Test one upload and playback with your chosen storage. Enable indexing and submit `/sitemap-index.xml` once the site is live.

Configure your HTTPS reverse proxy to forward the public domain to the frontend on port 3000. The backend, database, cache, and broker use private Compose networks. To apply credential or environment changes, rerun preparation and deploy so the updated configuration is remounted.

The GitHub Actions production-stack check builds and starts the Linux containers with disposable configuration. Review its result before deploying. The new archive starts with stories published in the new newsroom. Keep the existing WordPress installation and a restorable backup available for rollback when switching DNS.

## Backup and recovery

Before an upgrade, run `node scripts/backup-deployment.mjs` and copy the complete recovery directory off the VPS. It contains the database, local media, and matching secrets. Protect S3 objects with a separate recovery policy. Verify a recovery point with `node scripts/restore-deployment.mjs --from=/absolute/recovery/path --verify-only`. Restoring over an existing deployment requires `--replace-existing`.

For service health, run `docker compose --env-file .local/deployment/deployment.env ps`. For backend logs, use the same command prefix with `logs --tail=100 backend`.

## Android

After deploying the site, run `node scripts/build-android.mjs --setup` to build the Play Store bundle and release APK. Back up `.local/android-upload` privately and increment `--version-code` for each upload. When using Play App Signing, configure the distribution certificate fingerprint from Play Console so `/.well-known/assetlinks.json` matches the installed app.

## Newsroom

Admins can publish directly. Trusted editors can publish after completing verification and media-rights checks. Reporters submit work to daily editorial review. A future **Become a reporter** application could let vetted outside contributors submit previews for publication and a manually approved bounty.
