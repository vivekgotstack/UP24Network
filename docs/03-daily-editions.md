# Daily editions: Hindi Rashifal

This checkpoint separates provider access, scheduling, and publication. The goal
is one reliable daily section before adding more integrations.

## Configure locally

1. [Create a free AstroLogics account](https://developers.astrologics.in/auth/sign-up)
   using Google or an email code; its signup page says no card is needed. In the
   dashboard, create a **live server key** starting with `al_live_`. Review the
   [current pricing](https://developers.astrologics.in/pricing) and
   [authentication guide](https://developers.astrologics.in/docs/authentication).
2. Copy `backend/providers.example.properties` to
   `backend/.local/providers.properties` if the local file does not already exist.
3. Set `up24.providers.astrologics.api-key` in that local file. Alternatively,
   remove that local override and set the backend's `ASTROLOGICS_API_KEY` environment variable.
   Never use a `NEXT_PUBLIC_` variable, commit a key, or paste one into chat.
4. Restart the backend. Sign in as an administrator and open **Automations**.
5. Enable **Daily Rashifal** and choose **Day**, then **Run now** for the first edition.
   Its public section appears only after a complete, current Hindi edition succeeds.

No live key was supplied during implementation. Live provider authentication and
real Hindi output still need verification after local configuration. Test keys and
test-mode responses are deliberately blocked from public publication.

## Public API research

Checked on 12 November 2026. AstroLogics' Free plan includes 3,000 credits per
month. Its [all-signs endpoint](https://developers.astrologics.in/daily-horoscope-api)
returns Hindi with `lang=hi` and costs 5 credits per successful request. One
complete edition daily therefore uses at most 155 credits in a 31-day month,
before any failed-edition rechecks or other API use. A public API still requires
your own free account key; the free plan has no uptime commitment.

Other public options were checked rather than silently substituting an English
feed or scraping a publisher:

- [MathuraNow](https://mathuranow.in/panchang-api/) offers Hindi without a key,
  but its published licence requires visible attribution and non-commercial use.
  It does not fit the requested publication policy.
- [GrahaAPI](https://grahaapi.com/docs/rashifal/) documents bilingual daily
  readings and 1,000 real calls/month on its free plan. Its linked terms page did
  not expose a usable publication licence during this review; it is not selected.

The admin automation screen now links directly to the selected signup page and
shows the local configuration steps while the provider is unconfigured. This
keeps provider credentials out of browser storage and the CMS API.

## Behaviour and boundaries

- `horoscope` owns edition storage and its public DTO. `automation` accesses only
  the module's public `Horoscopes` API.
- One all-signs request uses `period=daily`, `lang=hi` and the date in Asia/Kolkata.
  The provider documents `data.signs[]` and `sign.hindi` in its
  [publisher contract](https://developers.astrologics.in/reference/horoscopes).
- Validate the overall date, each sign's date, daily period, live mode, 12 unique
  known signs, Hindi names/readings and bounded field lengths before saving.
- A stored edition prevents repeat paid requests for the same day, including
  manual reruns. The daily schedule targets 00:05 IST; other intervals are explicit
  administrator choices. It catches up after application downtime.
- Disabling the job also hides the public section in the same transaction.
  Existing editions remain stored. Yesterday's edition is never labelled as today.
- External I/O precedes the publication transaction. A UUID lease and row lock
  prevent a superseded worker from publishing. Publication and successful job
  completion commit together. Failures retain content and use persisted backoff.
- Provider identity, request ID and engine version stay in internal storage.
  No provider key or raw provider error body is returned to the frontend or logs.
- The frontend uses Radix tabs for keyboard navigation and Framer Motion for the
  reading transition, respecting reduced-motion preferences.

## Source and publication policy

Checked on 12 November 2026: AstroLogics' [terms, section 4](https://developers.astrologics.in/legal/terms)
permit displaying, caching and storing API output in a product; these terms do not
require a public provider credit. Section 6 requires identifying astrology as
traditional guidance rather than a prediction or professional advice; the section
includes that reader-facing note. No birth data is collected or sent.

YouTube imports continue from the verified official UP24Network channel. They
validate the channel and use each returned thumbnail URL unchanged. The Watch
section no longer contains a hardcoded fallback video.

The WordPress importer is retired. Migration V3 moves its automatically managed
articles to drafts, preserving articles with manual editorial overrides. No
article data is deleted. Health, books and awards remain disabled and are marked
as unconfigured until their own vetted adapters are implemented.

## Next small step

Verify a real Hindi edition with a locally supplied live key. The live YouTube
RSS endpoint returned intermittent HTTP 404 responses during verification, so
refreshes were not confirmed end-to-end; retained articles and persisted retries
worked. Add an official YouTube Data API adapter with a locally configured key
before relying on automatic video updates in production. Then add one health
source whose publication terms allow the requested presentation. Production
deployment, durable sessions, account recovery, media uploads and operational
monitoring are still separate work; this checkpoint does not certify a release.
The local PostgreSQL 18 cluster also triggers a compatibility warning from the
Spring Boot-managed Flyway version (tested through PostgreSQL 17); align those
versions before production deployment. The migration itself passed locally.

## Checks at this checkpoint

- 16 backend tests passed, including module boundaries, admin/CSRF restrictions,
  hidden/stale editions, provider validation, batch rollback and lease fencing.
  The five provider tests passed again after matching the live channel-ID format.
- The frontend production build and final TypeScript check passed.
- Live local admin login through the frontend proxy succeeded after its origin
  check was aligned with the configured `SITE_URL`.
- Browser review confirmed the Hindi font declarations, language attributes,
  headline spacing and video image fallback. Real Rashifal publication awaits a
  live provider key; its tab interaction has not yet been checked with live data.
