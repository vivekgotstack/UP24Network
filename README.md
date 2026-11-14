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
  It stays disabled until a live provider key is configured locally. Health, books
  and awards show an unconfigured state and cannot be enabled prematurely.
- Public Hindi API research confirmed the AstroLogics free plan and direct
  [signup page](https://developers.astrologics.in/auth/sign-up). The admin
  automation screen now provides that link and server-only setup instructions.
  One all-signs daily request uses at most 155 of the current 3,000 free monthly
  credits. Live output remains unverified until an account key is configured.
- A temporary test key successfully authenticated against the real Hindi
  publisher endpoint on 12 November 2026: HTTP 200, all 12 signs, matching dates,
  Hindi readings and required metadata. The temporary key file was deleted;
  test output was not published. Next: verify an edition with a local live key.
- Next small step: configure and verify a real Hindi edition and add a keyed
  YouTube Data API adapter: the public RSS endpoint returned intermittent 404s
  during live checks. Existing videos are retained and failed jobs retry.
  See [daily edition setup, checks and boundaries](docs/03-daily-editions.md).

Prototype links: [Reader](http://127.0.0.1:3000/),
[Newsroom](http://127.0.0.1:3000/admin), [Reader account](http://127.0.0.1:3000/account).

Latest local milestone (13 November 2026): versioned article edits prevent lost
updates; older published articles remain addressable; runtime and migration DB
accounts are separate. The private newsroom requires a password and a session-bound
email code. Only `vivekni1224@gmail.com` can be Admin; invited Editors and Reporters
have restricted permissions. Configure the real email sender with
`./scripts/Configure-Brevo.ps1`, then restart the backend. Public navigation has no
newsroom link. Nine publication/policy pages now share a full reading layout.
Backend checks (21), frontend production build and local access/DB checks passed.
Next small step: authenticated local photograph uploads for the article editor.

## Run locally

Prerequisites: JDK 21 or newer, Maven 3.6.3 or newer, Node.js 20.9 or newer, npm,
and a local PostgreSQL installation. The Windows helper detects PostgreSQL 18 or 17.
It creates a separate development cluster on port 55432 inside ignored local data.

From the repository root:

```powershell
.\scripts\Start-Preview.ps1
```

This starts the project PostgreSQL cluster before Spring Boot. After a reboot,
running the Java application directly can fail with `127.0.0.1:55432 refused`
until the database is started. For an IDE launch, run
`./scripts/Start-LocalDatabase.ps1` from the repository root first.

The preview includes twelve Hindi stories, video, a daily Rashifal edition and
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
Local administrator credentials are saved in `backend/.local/admin-login.txt`;
that folder and startup logs are excluded from Git. Do not commit credentials.
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
