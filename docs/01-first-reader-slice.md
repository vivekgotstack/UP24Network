# Milestone 1: a reader can open a story

Our first step connects a real Spring Boot API to two Next.js reader pages.
The content is explicitly illustrative. There is no live news feed or CMS yet.

## The request flow

```text
Browser -> Next.js server page -> Article HTTP controller
        -> Articles interface -> demo fixture provider -> rendered HTML
```

The browser does not fetch the backend directly. Next.js fetches on the server,
so the backend URL stays on the server and no CORS configuration is needed.
Article metadata and page rendering share one request-scoped React cache.

Try these routes:

- `http://127.0.0.1:3000/`: front page.
- `http://127.0.0.1:3000/?category=Education`: category filter.
- `http://127.0.0.1:3000/?q=Lucknow`: search the loaded sample catalogue.
- `http://127.0.0.1:3000/news/closer-to-home`: article page.
- `http://127.0.0.1:3000/news/does-not-exist`: missing-article page.
- `http://127.0.0.1:8080/api/articles`: public list contract.
- `http://127.0.0.1:8080/actuator/health`: backend health.

Search currently filters six API-provided stories on the Next.js server.
Once articles are persisted, move filtering and pagination into the backend.

## What makes this a module?

```text
com.up24.news
  NewsApplication
  article/
    Articles.java                 Public module interface
    ArticleView.java              Public read contract
    package-info.java             Declares the module and its dependencies
    internal/
      ArticleController.java      HTTP adapter
      DemoArticles.java           Temporary read-only data provider
```

Spring Modulith treats immediate subpackages of the application package as
modules. Public contracts live at the module root; implementation details stay
under `internal`. `ModuleBoundariesTest` calls `ApplicationModules.verify()` to
check for dependency cycles and access to another module's internals. With only
one module, there are no cross-module dependencies yet; the check becomes more
valuable as the next business module is added.

The demo provider implements `Articles`. Replacing it with a persistent provider
will preserve the frontend's HTTP contract. The `demo` profile must be selected
explicitly; the application currently has no non-demo data provider and will
fail to start without one. That is intentional for this development milestone.

## Reader experience and design references

The design takes broad patterns from modern news products and gives UP24 its own
identity: the supplied UP24 logo, navy/off-white with a yellow accent, self-hosted
Geist Mono throughout, a cinematic cover, a briefing column, and a responsive
story grid. The masthead carries the
original Hindi tagline, "खबर हमारी यकीन आपका". The original logo is preserved at
`frontend/public/brand/up24-logo.png`; CSS frames its circular mark without changing the file.

- [AP News](https://apnews.com/): clear sections and a hierarchy of stories.
- [AP's redesign announcement](https://www.ap.org/the-definitive-source/announcements/a-new-look-for-ap-news/): a journalism-focused digital showcase.
- [The Hindu's mobile-first work](https://newsinitiative.withgoogle.com/resources/stories/a-mobile-first-content-strategy-and-ux-design/): designing visually rich stories for mobile readers.
- [NDTV](https://www.ndtv.com/): explicit video discovery alongside news sections.
- [The Indian Express](https://indianexpress.com/): regional sections and multiple story formats.
- Dainik Bhaskar was requested as a reference, but its homepage blocked the automated research fetch. We did not copy its layout or reporting.
- [shadcn Dialog](https://ui.shadcn.com/docs/components/radix/dialog): the installed Radix-based video dialog and keyboard behavior.
- [Magic UI video dialog](https://magicui.design/docs/components/hero-video-dialog): a reference for the poster-to-player interaction, implemented with our shadcn controls.
- [Motion scroll animations](https://motion.dev/docs/react-scroll-animations): scroll reveals, cover parallax, and reading progress, implemented using Framer Motion.
- [Spring Modulith verification](https://docs.spring.io/spring-modulith/reference/verification.html): verifying module boundaries.
- [Next.js installation and structure](https://nextjs.org/docs/app/getting-started/installation): the frontend foundation.

Those patterns are starting hypotheses for our product. We will assess quality
through real reporting, reader feedback, accessibility, speed, and reliability.

Keyboard users get a skip link, visible focus rings, native search controls, and
semantic headings. The category navigation scrolls on small screens. Reduced
motion preferences disable transitions. Missing stories have a dedicated page;
backend failures show a retry state instead of fabricated fallback articles.
The backend returns HTTP 404 for unknown slugs. Next.js can stream a missing-story
page with HTTP 200 after its loading shell has been sent; it marks that response
`noindex`, as documented by the installed Next.js version.

The interface avoids decorative arrows and uses consistent type roles. Framer
Motion adds scroll entry, cover parallax, video hover/tap response, and a reading
progress line. Reduced-motion preferences disable the moving effects and video
hover playback.

The preview is marked `noindex` until we have a real newsroom and production URL.
Article pages include titles, descriptions, canonical URLs, and Open Graph data.
Photographs are illustrative and are not presented as reporting evidence.

## Scope of this checkpoint

Working scope: read-only sample API, reader homepage, category and text filters,
article pages, optional video media, metadata, loading and error states, and
module/API tests. The watch section is derived from articles with a `videoUrl`;
articles without one render photographs. Video playback failures show the poster.

Next: PostgreSQL, Flyway, and a tested draft/published lifecycle. Then add admin
authentication and the create/publish flow. Media upload, Hindi content, regional
taxonomy, full-text search, and distributed infrastructure are later milestones.

No data is written or persisted in this slice. Do not expose the demo as a live
news service. Nothing has been committed, pushed, or deployed by the agent.

## Local image sources

Illustrative photos are stored locally for a consistent preview; initial source
URLs (Unsplash):

- Heritage: https://images.unsplash.com/photo-1564507592333-c60657eea523
- Newsroom: https://images.unsplash.com/photo-1504711434969-e33886168f5c
- Business: https://images.unsplash.com/photo-1486406146926-c627a92ad1ab
- Education: https://images.unsplash.com/photo-1523240795612-9a054b0db644
- Nature poster: https://images.unsplash.com/photo-1490750967868-88aa4486c946

The local demo video is MDN's CC0 flower clip:
https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4
It is sample footage, not original reporting. A WebVTT description accompanies it.
Geist Mono is distributed with its SIL Open Font License in `frontend/public/fonts/OFL.txt`.

Before a public launch, replace these with newsroom-owned media and record
photographer credits and usage rights in the Media module.
