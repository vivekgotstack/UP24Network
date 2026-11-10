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
- Bold mono editorial layout, category filters, search, article metadata, and
  missing-article handling. All six sample stories are labelled as demonstrations.
- Framer Motion reveals, cover parallax, reading progress, and shadcn UI controls.
- Stories with a video source have a player; other stories show photographs.
  A local CC0 sample film demonstrates playback, hover previews, and image fallback.
- Read-only fixtures are enabled only with the backend's `demo` profile.
- Next small step: model an article's draft/published lifecycle, persist it in
  PostgreSQL with a Flyway migration, then add protected editorial actions.

## Run locally

Prerequisites: JDK 21 or newer, Maven 3.6.3 or newer, Node.js 20.9 or newer, and npm.
This first slice needs no database or Docker.

Terminal 1, from the repository root:

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

Terminal 2, from the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open [the reader](http://127.0.0.1:3000). The backend listens on `127.0.0.1:8080`.
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

Current folders: `backend/` and `frontend/`. Add `infra/` when we introduce PostgreSQL.

## Review and push

Review local changes in Codex's Git review panel, commit them, then push to `origin`.
Suggested commit message: `feat: add the first UP24 reader slice`.

Terminal fallback, from this folder:

```powershell
git add README.md AGENTS.md .gitignore backend frontend docs
git commit -m "feat: add the first UP24 reader slice"
git push -u origin main
```
