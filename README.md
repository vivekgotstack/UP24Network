# UP24Network

The voice of new India.

## Our motto

**Learn the reason. Build one small working slice. Upgrade when the need is real.**

Build slowly, understand each decision, and keep changes small enough to review.
The goal is a useful news platform and engineering experience we can explain in interviews.

## Architecture journey

1. Spring Boot modular monolith with Spring Modulith and PostgreSQL.
2. Complete the Next.js news website and manual editorial CMS.
3. Extract a service when a concrete need justifies it; introduce Spring Cloud.
4. Add Kafka, a transactional outbox, retries, and eventual consistency.
5. Deploy on AWS and practice observability, backups, load testing, and recovery.

The 90-day roadmap is a learning target. A working website and CMS come first.

## First product milestone

Admin login -> create a draft -> publish -> public `/news/article-slug` page,
with SEO metadata and an image.

Start with the Article module. Modules communicate through explicit APIs or
events and never reach into another module's internal repositories.

## Current checkpoint

### Administration build map

- Private entry: `/admin/sign-in` → password → email code → `/admin`. Reader sign-in now also routes staff to their verified workspace; no public admin navigation is exposed to visitors.
- Four roles are available. Reporters work on their own stories, editors work across the desk, subscribers use reader features, and the administrator controls publication, accounts, workflows, and sources.
- Admin navigation: articles, trash/archive, media, publication pages, team, employee workflows, automations and site settings. Article history keeps 20 revisions; restoration returns to draft. Deleted imports are suppressed from future fetches.
- Frontend data: `frontend/lib/session.ts` owns account-scoped TanStack Query hooks; SWR is removed. Public fetches use tagged server caching; successful content changes invalidate those tags.
- Fonts: Source Serif/Sans sources stay in `frontend/assets/fonts`; the repeatable `npm run fonts:build` pipeline ships content-hashed WOFF2 files and saves 581 KB compared with the former TTF downloads. Unused Geist Mono assets are removed; Hindi Noto fonts remain self-hosted.
- Backend data: explicit module APIs and storage ports; transaction-aware Caffeine caches have bounded memory/expiry. Public lists omit article bodies, private lists paginate in SQL, JSON responses compress, long PostgreSQL values use LZ4.
- Media: `/api/media` bounds original uploads at 12 MB/24 megapixels, produces proportional WebP copies up to 1920 px/2 MB, strips metadata, hashes/deduplicates storage. Two concurrent conversions; images referenced by articles or revisions cannot be deleted.
- Storage: uploads have an atomic 1 GiB default aggregate quota (`UP24_MEDIA_QUOTA_BYTES`); optimized image disk cache is capped at 256 MiB. Search/detail requests use bounded backend caches instead of creating unlimited Next disk-cache entries.
- S3 image storage: select `UP24_MEDIA_STORAGE=s3` after supplying your bucket, region, credentials and CloudFront origin in ignored `backend/.env`. The AWS SDK v2 adapter uses one lightweight HTTP transport, conditional content-addressed uploads, SHA-256 checksums and S3 Standard. Persisted locations keep older local photographs accessible at the same `/media/` addresses. Local preview always uses local storage and never contacts AWS.
- Admin → Media library now controls a versioned 365-day Standard → Glacier Instant Retrieval policy, application status and per-image exclusions. AWS rules are scoped to UP24's prefix and eligibility tag, exclude objects below 128 KiB, and preserve unrelated bucket rules. Synchronization uses a persisted lease and retry schedule. Age is measured from S3 object creation; excluding an already transitioned object does not move it back to Standard.
- Media removals use a durable retry queue; pending deletion bytes continue counting toward the tracked library allowance. Security/storage maintenance schedules run independently of editorial imports. Focused checks (8), both production builds, a real preview upload and the new controls at 320/768 px passed; live AWS remains unverified until your account is configured.
- Per-employee workflow: `identity/WorkflowPolicies` → `/admin/workflows`; dateline/source/media requirements, section/city defaults and metadata helper access. These checks are enforced by the backend.
- Publication: `publication` module and `/admin/pages`, `/admin/settings`; full structured policy documents, site tagline, announcement and home-section controls. Admin email remains private.
- Installability: PWA manifest/install prompt and bounded public-static offline cache; signed Android API 37 AAB/APK built with shrinking and release signing. Native apps open the deployed HTTPS origin; see [Android release steps](android/RELEASE.md) for domain/signing and Play Console work.
- VPS: Docker/Caddy/PostgreSQL stack, private backend/database networks, restricted DB roles, persistent volumes, TLS, compressed responses, backups and resource limits. See [operations](deploy/OPERATIONS.md). Docker is absent on this workstation, so container execution has not been verified here.
- Repeatable local production preview: `./scripts/Start-OptimizedPreview.ps1`. It prepares PostgreSQL/backend, builds fonts/frontend and starts the site. `-ReuseBuild` explicitly reuses a successful build; `-ReuseBackend` keeps a verified running backend for frontend-only work.
- Verification completed: real reader-login → admin OTP → dashboard; uploaded photograph → editor → public report; word edits, revision history and recovery; all six new admin areas at 320/768 px; PWA registration/privacy boundary. Frontend/backend builds and module-boundary verification passed. Local jump maps remain in ignored `.worknotes/*-controls.md` and `.worknotes/deployment-pwa.md`.


- Expanded reader navigation: 32 sections, nested subject pages, 8 regional hubs and 22 city editions.
- Compact logo/category header; the sitewide footer pairs the uncropped illustrated
  banner and official logo with verified social channels and grouped navigation.
- Article discovery uses bounded database pagination, category/city filters and keyword search instead of filtering the latest 100 reports in the browser.
- Local preview includes 35 published Hindi stories across the new desks and cities, plus the daily Rashifal; operational data stays separate.
- Rashifal now uses twelve original zodiac illustrations, picture selectors and a larger reading panel with lucky-number and colour cards.
- Identity now separates account policy, credential storage, JWT signing and session persistence. Five-minute RSA access tokens use HttpOnly cookies, rotating refresh tokens, persisted revocation and OTP step-up; logout can end one login or every device.
- Phone/tablet refinements include readable form controls, larger touch buttons and wrapping automation cards.
- Password login throttling is persisted; admin can edit profiles, suspend/restore accounts, revoke logins and delete suspended accounts.
- Account recovery: `/account/recover` uses single-use email codes, five-attempt limits, ten-minute expiry, persisted throttling and a bounded mail queue. Resets revoke all sessions; account-version checks also reject a password login racing a reset. The designated admin credential remains environment-controlled. Local recovery mail is in ignored `backend/.local/preview-mailbox/latest-recovery.txt`.
- Schema migrations V16/V17 add recovery records, normalized-account/publication constraints, a single-admin invariant and indexed media/revision references. Expired identity records are removed in bounded scheduled batches. Integration checks now use a separate `up24_test` schema.
- Discovery: `/sitemap-index.xml` links the static page sitemap and lean article sitemaps of 1,000 reports each, including older reports outside the latest-100 feed. Indexing remains disabled in local preview.
- Release checkpoint: backend packaging, frontend production build, password-recovery/account checks and targeted recovery UI checks at 320/768 px passed. The local optimized preview is running on ports 3000/8080. The Docker backup script now holds the media catalogue lock across database/file capture; Docker execution remains unverified because Docker is absent locally.
- Production media: the newsroom accepts MP4/MOV sources, keeps originals private and prepares bounded H.264/AAC playback on a durable worker. S3 uploads go directly to the private source prefix. Published playback and images use stable site URLs and separate CloudFront prefixes. The administrator can migrate existing local photos to S3 in batches without changing article links.
- Public `/archive` lists published reports by month and year. Previous slugs redirect to the current article. **Withdraw** removes a story from public view without treating old stories as expired.
- RabbitMQ carries job identifiers in production. PostgreSQL holds encrypted payloads, retries and job state. Brevo delivers sign-in and recovery codes. Operations shows configuration presence and job status to verified administrators.
- Cookie preferences are available on public pages and in the footer. YouTube embeds require an explicit choice and a play action. The cookie policy explains storage and external connections.
- Deployment preparation, structure and provider preflight, launch, checksummed backup and guarded restore are in [VPS operations](deploy/OPERATIONS.md). The owner supplies provider credentials and domain configuration.
- Release verification (18 November 2026): both production builds passed, all 48 backend checks passed, and a clean PostgreSQL test schema applied all 23 migrations. The local browser confirmed OTP, video upload/encoding and ranged delivery, cookie consent and withdrawal, old article redirects, and archive/media/operations pages at 320 and 768 px. Docker startup and real provider delivery require the configured VPS and owner accounts.
- Reader correspondence: Contact, Corrections, and Complaints accept messages into the admin-only Reader inbox. PostgreSQL handles delivery, throttling, and retention, so this channel works independently of Brevo. Next step: configure the owner’s launch credentials and verify the VPS runbook against the live domain.
- The compact air quality strip links to `/aqi-india`, with selected city readings across every state and union territory. Set `WEATHERBIT_API_KEY` in the backend environment with a commercial Weatherbit subscription, then enable Air Quality Index under Admin → Automations. The persisted schedule defaults to hourly and stores the latest reading per city. Verify live coverage after adding the owner's key.
- Staff submit new stories and updates with visuals, verification notes, and editorial checks. `/admin/reviews` groups them into one daily batch per contributor in India time. The administrator previews the proposals, returns individual items for changes, and approves the remaining batch in one action. Approval checks every article version and commits the batch atomically. The queue records rewards already arranged by the administrator. The next small step is to rehearse a daily batch with a reporter account.
- Newsletter signups use Brevo double opt-in. Set `NEWSLETTER_LIST_ID` and `NEWSLETTER_DOI_TEMPLATE_ID` alongside `BREVO_API_KEY` in `backend/.env`, then verify a confirmation email from `/newsletter` before scheduling a campaign in Brevo. Article bylines link to an About the author section based on the published attribution.

- GitHub repository connected locally.
- First reader slice: a Spring Boot Article module connected to a Next.js homepage
  and individual `/news/[slug]` pages.
- Official UP24Network logo, navy/yellow palette, and Hindi masthead tagline integrated.
- Supplied official logo replaces the earlier asset; shared marks use its original
  PNG without lossy resizing or the previous enlargement. Next: local media uploads.
- Classic newspaper typography: Source Serif/Source Sans for Latin, paired with
  self-hosted Noto Serif Devanagari/Noto Sans Devanagari for Hindi. Hindi headlines
  use natural spacing and room for vowel marks. The original logo sits on a
  balanced political-news illustration.
- Sections, latest news, a moving headline strip, one search form, article metadata,
  media players, and verified social links.
- Framer Motion reveals, cover parallax, reading progress, and shadcn UI controls.
- Stories with a video source have a player; other stories show photographs.
  A local CC0 sample film demonstrates playback, hover previews, and image fallback.
- PostgreSQL/Flyway foundation, draft/publication API, cookie sessions with CSRF,
  and Admin/Editor/Reporter/Subscriber account types.
- Newsroom screens for articles, accounts, and saved automation settings.
- Independent source adapters replace the WordPress importer. The official YouTube
  feed supplies video IDs and exact thumbnails automatically; editor changes remain
  protected. Automatically imported WordPress stories are preserved as drafts.
- Hindi Rashifal has its own module, dated editions, keyboard-accessible sign tabs,
  admin visibility/schedule controls, complete-feed validation and persisted retries.
  It stays disabled until a live provider key is configured. Health, books and
  awards remain editorial sections.
- Public Hindi API research confirmed the AstroLogics free plan and direct
  [signup page](https://developers.astrologics.in/auth/sign-up). The admin
  automation screen now provides that link and server-only setup instructions.
  One all-signs daily request uses at most 155 of the current 3,000 free monthly
  credits. Live output remains unverified until an account key is configured.
- A temporary test key successfully authenticated against the real Hindi
  publisher endpoint on 12 November 2026: HTTP 200, all 12 signs, matching dates,
  Hindi readings and required metadata. The temporary key file was deleted;
  test output was not published. Next: verify an edition with a local live key.
- Official YouTube ingestion supports a keyed Data API adapter and an RSS fallback.
  Existing videos are retained when a source fetch fails. Configure the owner’s
  provider keys before enabling live updates.
  See [daily edition setup, checks and boundaries](docs/03-daily-editions.md).

Prototype links: [Reader](http://127.0.0.1:3000/),
[Newsroom](http://127.0.0.1:3000/admin), [Reader account](http://127.0.0.1:3000/account).

Only the designated owner account can become Administrator. Set its address and
password in the ignored backend environment. The private newsroom requires a
password and a session-bound email code. Set the verified Brevo sender and key
before production. Public publication and policy pages share a reading layout.

## Run locally

Prerequisites: JDK 21 or newer, Maven 3.6.3 or newer, Node.js 20.9 or newer, npm,
and a local PostgreSQL installation. The Windows helper detects PostgreSQL 18 or 17.
It creates a separate development cluster on port 55432 inside ignored local data.

From the repository root:

```powershell
.\scripts\Start-Preview.ps1
```

This starts the project PostgreSQL cluster before Spring Boot. In VS Code, select
**UP24Network: Local preview** in Run and Debug, then press F5. Its pre-launch task
starts PostgreSQL and releases any previous backend from this workspace. Use
**UP24Network: Editorial data** for the normal database schema. Both configurations
work when opening the repository root or just `backend/`; local setup supports
Windows PowerShell 5.1 without requiring another PowerShell installation.
For a plain Java command outside these launchers, start the database first with
`./scripts/Start-LocalDatabase.ps1`.

The preview includes 35 Hindi stories, video, a daily Rashifal edition and
sample Editor/Reporter accounts in an isolated `local_preview` schema. Credentials
are in `backend/.local/preview-login.txt`. Request a sign-in code, then read
`backend/.local/preview-mailbox/latest-message.txt`; preview sends no external mail.
Admin uses `/admin/sign-in`; employees use `/newsroom/sign-in` and cannot open
administrative pages. Staff reports require a dateline, media details and private
source notes; Admin has a shorter workflow. Public ownership names Abhishek
Srivastav and the editorial publishing team; the developer's identity stays private.
To use editorial data and Brevo again, run
`./scripts/Backend.ps1 Restart -Profile default`, then `./scripts/Start-Prototype.ps1`.

If frontend dependencies are missing, install them first:

```powershell
cd frontend
npm ci
```

Open [the reader](http://127.0.0.1:3000). The backend listens on `127.0.0.1:8080`.
Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`, which is excluded from Git.
Restarting applies a changed admin password and revokes existing admin logins.
Optional frontend environment overrides are documented in `frontend/.env.example`;
copy it to `.env.local` if you need to change the defaults.

```powershell
# In backend/
mvn test

# In frontend/
npm run build
```

See [the first-slice learning notes](docs/01-first-reader-slice.md) for the request
flow, module boundaries, design references, and deliberate limitations.

See [the prototype checkpoint](docs/02-prototype-checkpoint.md) for current scope
and limitations. The first-slice notes describe the earlier sample-data checkpoint.

## Review and push

Review local changes in Codex's Git review panel, commit them, then push to `origin`.
Suggested commit message: `feat: add newsroom prototype and controlled source imports`.

Terminal fallback, from this folder:

```powershell
git add README.md AGENTS.md .gitignore backend frontend docs scripts
git commit -m "feat: add newsroom prototype and controlled source imports"
git push -u origin main
```
