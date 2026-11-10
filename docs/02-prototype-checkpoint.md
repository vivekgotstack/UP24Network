# Frontend prototype checkpoint

The current deliverable is a locally reviewable frontend prototype connected to
a modular Spring Boot API and an isolated PostgreSQL development database.
It is not a production release.

## Review routes

- `/`: reader homepage, sections, headline strip, and media.
- `/?view=latest`: articles ordered by publication time.
- `/?category=Uttar%20Pradesh`: a section.
- `/news/[slug]`: an article or video report.
- `/admin`: protected newsroom screens.
- `/account`: reader registration and sign-in.

The original logo is used directly. The selected editorial illustration is
`frontend/public/brand/newsroom-banner-balanced.png`. It depicts seven political
figures as a designed collage and is labelled as an illustration. Source Serif
and Source Sans provide consistent reading and control typography. Their font
licenses are in `frontend/public/fonts/`.

## Boundaries and tools

- Next.js App Router owns rendering and frontend routes.
- shadcn/Radix owns dialogs, focus behavior, and standard controls.
- Framer Motion owns scroll reveals, cover parallax, and progress/hover effects.
- `lib/articles.ts` is the server-side reader API adapter.
- `lib/cms.ts` is the typed client adapter for newsroom requests.
- `/api/cms/[...path]` is the same-origin proxy; credentials stay in HTTP-only
  session cookies and state changes require Spring Security CSRF tokens.
- Spring Modulith modules expose public contracts; implementations and database
  access stay inside their module.

## Accounts

| Role | Access |
| --- | --- |
| Admin | Accounts, articles, publication, breaking flags, automation settings |
| Editor | Edit and publish articles, control breaking flags |
| Reporter | Create and edit their own unpublished drafts |
| Subscriber | Reader account; no newsroom mutation permissions |

Passwords are BCrypt-hashed. Public registration always creates a Subscriber.
Role checks consult current database roles, so existing sessions do not retain
revoked privileges. The local bootstrap password is randomly generated and kept
only in ignored local configuration. Email verification, password recovery,
rate limiting, and production session operations are not finished in this prototype.

## Controlled imports

The user explicitly selected only their existing website and YouTube channel.
The discovered WordPress endpoint is:

`https://www.up24network.com/index.php?rest_route=/wp/v2/posts`

The verified YouTube channel ID is `UC5Gu1A0d70QSUThd_7VrPew`.
The importer preserves source publication dates and links; it does not invent news.
Manual editorial changes protect an article from later import overwrites.

Automation switches and intervals are saved in PostgreSQL. News and YouTube
imports start enabled. Daily Rashifal, Health & Wellness, Books & Literature, and
Awards & Publications imports start disabled. Their source must actually publish
matching material: these jobs do not generate medical claims or horoscope text,
and they do not relabel old content as today's update. Admins can run a job once
or change its schedule. A missing/unavailable source preserves existing articles.

## Verification and next step

Verified in this session: frontend TypeScript check; local API startup and Flyway
migrations; administrator sign-in through the same-origin proxy; saved job listing;
successful website and YouTube imports; reader rendering in the browser. Earlier
sample API/module-boundary tests also passed.

The latest production build was not verified: the Windows build process exited
before useful diagnostics. The live development prototype and TypeScript check
work. The Boot-managed Flyway version also warns about PostgreSQL 18 compatibility,
although both migrations succeeded; align these versions before release.

Next: review the frontend, extract newsroom feature components, add focused
publication/role integration tests, and finish production identity operations.
Public pagination, finer regional taxonomy, upload handling, and security hardening
remain later checkpoints. No push or deployment was performed by the agent.
