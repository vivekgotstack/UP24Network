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
- Classic newspaper typography: Source Serif for headlines/reading and Source Sans
  for controls. The original logo sits on a balanced political-news illustration.
- Sections, latest news, a moving headline strip, one search form, article metadata,
  media players, and verified social links.
- Framer Motion reveals, cover parallax, reading progress, and shadcn UI controls.
- Stories with a video source have a player; other stories show photographs.
  A local CC0 sample film demonstrates playback, hover previews, and image fallback.
- PostgreSQL/Flyway foundation, draft/publication API, cookie sessions with CSRF,
  and Admin/Editor/Reporter/Subscriber account types.
- Newsroom screens for articles, accounts, and saved automation settings.
- Automatic imports use only the existing UP24Network website and YouTube channel.
  News/YouTube jobs start enabled; Rashifal, health, books, and awards jobs start
  disabled and can be controlled by an administrator.
- Next small step: review this frontend prototype, then add focused role/publication
  integration coverage and separate the newsroom UI into feature components.

Prototype links: [Reader](http://127.0.0.1:3000/),
[Newsroom](http://127.0.0.1:3000/admin), [Reader account](http://127.0.0.1:3000/account).

## Run locally

Prerequisites: JDK 21 or newer, Maven 3.6.3 or newer, Node.js 20.9 or newer, npm,
and a local PostgreSQL installation. The Windows helper detects PostgreSQL 18 or 17.
It creates a separate development cluster on port 55432 inside ignored local data.

From the repository root:

```powershell
.\scripts\Start-Prototype.ps1
```

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
