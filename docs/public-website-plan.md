# Bubble Borough public website plan

> **Current deployment rule (October 1, 2026):** Use `game/assets/` and
> `game/public/` as the single game source. GitHub Pages serves `index.html`,
> `website/*/*.html`, and `game/index.html` directly. Never restore root
> `assets/` or root `public/`.

## Architecture decision: October 1, 2026

This plan **replaces** the previous generated-HTML/static-hosting approach and the earlier preparation-only root-game arrangement. The project is served by Node; GitHub is the source repository, not a routing constraint.

- `game/index.html` is the only canonical game entry document.
- All existing game assets and runtime modules live in `game/assets/` and `game/public/`, preserving their internal organization.
- Game-specific backend configuration and the friend-invite function live in `game/supabase/`.
- `website/index.html` is the single public shell. `website/router.cjs` chooses metadata and content on each request; `website/home.html` supplies current homepage content.
- `/` serves the website; `/play` serves the game. `/fish`, `/decor`, `/news`, `/faqs`, and `/about` use the shared website system.
- Node handles routing, metadata, sitemap, robots, and actual 404 responses. Canonical public URLs have no trailing slash except `/`.
- Root-level generated page directories, a copied game entry, the preview route, and the old website generator are retired.

## Current content and indexing

The homepage contains an accurate, compact introduction, feature descriptions, existing Bubble Borough branding, and direct Play actions. Secondary routes temporarily show the same visible homepage content, but retain independent route records and titles. The navigation supports all requested public routes.

The homepage is `index,follow` and has its own canonical URL. Unfinished routes and `/play` are `noindex,follow`. Initially only `/` is in the sitemap. Robots permits fetching assets and noindex documents.

Do not fabricate marketing screenshots, news, reviews, ratings, release dates, or player counts. Reuse existing game artwork by URL where appropriate. Future website-only media belongs in `website/assets/`; do not duplicate game asset libraries. No gameplay engine is loaded by the website.

## Future content slots

The homepage can grow in this order as approved content and assets arrive:

1. Compact hero: short description, Play button, real gameplay screenshot.
2. Four concise features: collect fish, build your tank, care for fish, watch them live.
3. Fish behavior: a few representative behaviors with real gameplay media.
4. Meet the fish: 6–8 varied fish, names, category labels, and approved artwork.
5. Decorating: real examples of distinct tank designs.
6. Customization: backgrounds, substrate, frames, lighting, and custom creations.
7. WebSurf: brief introduction and a real interface screenshot; preserve secrets.
8. Optional latest news: only real updates with working article links.
9. Final Play action and compact footer.

Keep unsupplied media sections absent. Assets can arrive later without changing the URL architecture.

## Activating a route

Each route owns its `render` function, title, description, and `ready` flag in `website/router.cjs`. Replace its temporary `home` renderer with useful route-specific content, supply accurate metadata, then set it ready. The server emits a self-canonical, indexing directive, and sitemap entry from that readiness state. Review those changes together; do not mark duplicate placeholders ready.

- `/fish`: one encyclopedia route with readable HTML, fish names, descriptions, behavior, category and care fields. Add filters/search as enhancements. Anchors such as `/fish#clownfish` identify entries; do not generate per-fish HTML pages.
- `/decor`: categorized showcase with accurate descriptions, images, and optional filters.
- `/news`: real updates; individual article routes can be added deliberately when articles exist.
- `/faqs`: short verified answers about game behavior and support.
- `/about`: purpose, origins, design philosophy, history, credits, and contact information.

Maintain accessibility, keyboard support, responsive layouts, accurate alt text, efficient media delivery, and logical headings as content expands. Do not add analytics or new dependencies just to populate the blueprint.

## Compatibility and verification

Preserve the game's public resource URLs, storage keys, database names, auth validation, and game behavior. Old root auth callbacks and installed-app launches must reach `/play` with query and fragment information intact. Retain existing root callbacks in the hosted allowlist while adding `/play` destinations.

Before deployment verify the Node process/reverse proxy, delivered-email callbacks, existing saves/custom uploads, and upgrades of already-installed apps. Regression comparison must distinguish existing failures from migration regressions. See [implementation and migration details](public-website-implementation.md).
