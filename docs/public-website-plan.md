# Bubble Borough public website plan

## Goal and current scope

Prepare bubbleborough.com for a public website that explains the game and gives future informational content permanent URLs, with the game available at `/play`.

**Current scope: routing and blueprints only.** Prepare the permanent routes, shared public layout, separate game entry, page-specific metadata support, indexing controls, and future content slots. Do not create marketing assets, populate showcases, write articles, or publish empty sections. Unfinished informational pages remain noindex and excluded from the sitemap. Switching the live homepage requires a minimal completed introduction and a verified game migration.

There are no approved marketing assets or page contents for this work yet. The future content descriptions below are specifications, not instructions to create or populate them now. Creating URLs alone is not the SEO deliverable; useful, crawlable content will provide that foundation when it is ready.

## 1. Permanent routes

| Route | Intended purpose | Initial public state after launch |
| --- | --- | --- |
| `/` | Public homepage | Indexable only when the minimal homepage is complete |
| `/play` | Existing Bubble Borough game | `noindex,follow`; excluded from sitemap |
| `/news` | News and development updates | Page-specific placeholder; `noindex,follow` |
| `/faqs` | Frequently asked questions | Page-specific placeholder; `noindex,follow` |
| `/decor` | Decor showcase | Page-specific placeholder; `noindex,follow` |
| `/fish` | Fish encyclopedia | Page-specific placeholder; `noindex,follow` |
| `/about` | About Bubble Borough | Page-specific placeholder; `noindex,follow` |

The informational routes must render at their own URLs. Do not redirect them to `/` or repeat the homepage content. Reuse the shell, with a page-specific heading and a brief “Coming soon” message until approved content exists.

The paths above express the intended route names. Before implementation, verify the production host's routing capabilities and choose one supported trailing-slash convention. Use the selected form consistently in links, redirects, canonicals, and the sitemap. Normalize HTTP/HTTPS and alternate hostnames to the preferred HTTPS hostname where the host supports it.

## 2. Separate preparation from public launch

### Preparation: current work

- Prepare public page templates and the shared shell.
- Prepare the game entry at `/play` and audit dependencies on the old root entry.
- Define the homepage and informational page content slots without populating them.
- Add per-route metadata and publication-state support.
- Prepare sitemap generation or maintenance rules and `robots.txt`.
- Verify local and production routing behavior before release.
- Keep unfinished previews out of search; an unfinished homepage blueprint must not become an indexable live homepage.

Do not switch the live root entry merely because the route scaffolding exists. Stage the routing changes until the launch requirements below are satisfied; the existing game remains the live entry during preparation.

### Public launch: later release step

The first public homepage needs only approved branding, a short accurate explanation of Bubble Borough, and an obvious Play link. Screenshots and the full feature presentation are not prerequisites for this minimal launch.

Before switching `/` to the public homepage:

- Approve and populate that minimal introduction.
- Verify the game works directly at `/play`, including fresh entry and refresh.
- Verify account, save, asset, navigation, and installed-app behavior.
- Verify initial HTML metadata, status codes, canonical URL forms, and sitemap contents.
- Remove preview-only indexing restrictions from the completed homepage only.

Do not apply new noindex rules to the existing live root game as a side effect of blueprint preparation.

## 3. Public shell and implementation approach

Use a lightweight static-page approach compatible with the existing project. A new application framework is not required.

The reusable shell should support:

- Bubble Borough branding, shared typography, colors, rounded containers, and buttons.
- A compact header, responsive navigation, main content container, and compact footer.
- Page-specific title, description, robots directive, canonical URL, and social metadata.
- Logical heading levels, keyboard navigation, visible focus, readable contrast, and mobile layouts.
- Optional light and dark presentation where appropriate to the existing identity.

Keep marketing CSS and JavaScript separate from game initialization. The public shell must not initialize the aquarium, load the game bundle, or fetch the full game asset catalog to display a preview.

## 4. Navigation

The eventual public navigation is: logo/Home, Play, Fish, Decor, News, FAQs, About. Play is the primary action and links directly to `/play` without another introduction, confirmation, or splash screen.

Define all navigation destinations now, but make public visibility depend on content readiness. Initially emphasize Home and Play. Do not promote unfinished pages with “Explore Fish,” “Explore Decor,” or similar calls to action. If an unfinished route is exposed, label its coming-soon state clearly.

Use ordinary links for navigation. Returning players must be able to bookmark `/play` and bypass the public homepage. Footer utility links such as Privacy and Terms appear only when their destinations exist; do not add dead links.

## 5. Homepage blueprint: future content only

Define the following sections and their data requirements. Keep unpopulated sections hidden; do not render empty cards, broken images, fake screenshots, invented news, or filler copy.

| Order | Section | Future content and asset requirements |
| --- | --- | --- |
| 1 | Header | Approved branding, available navigation, primary Play link |
| 2 | Compact hero | Approved short description, Play action, optional real gameplay screenshot |
| 3 | What is Bubble Borough? | Approximately four concise features: collect fish, build a tank, care for fish, watch them live |
| 4 | Fish that actually behave | Short explanation and real gameplay capture illustrating selected behaviors |
| 5 | Meet the fish | Approximately 6–8 visually varied fish, names, small category labels, approved artwork |
| 6 | Build your tank | Real examples of varied tanks, decor, plants, caves, backgrounds, substrate, and equipment |
| 7 | Make it yours | Concise examples of customization, custom creations, frames, lighting, and visual options that actually exist |
| 8 | Explore WebSurf | Real interface screenshot and brief introduction to selected services |
| 9 | Optional news preview | Up to three real updates with titles, dates, summaries, and working links |
| 10 | Final Play action | Short invitation and direct `/play` link |
| 11 | Footer | Compact branding and available navigation |

Keep the hero compact and descriptions short. Use real gameplay captures when assets are supplied; do not substitute concept art that misrepresents the game. Do not initialize the simulation to demonstrate behavior.

Behavior examples may include schooling, feeding, hiding, resting, exploration, social behavior, and species-specific motion. Select a few compelling examples rather than listing every mechanic.

WebSurf may introduce BubbleBodega, Bubble Borough Bank, email, and Proteus Biodyne. Preserve discovery and mystery; do not explain Davy Jones' Locker or expose every secret.

The minimal launch homepage may contain only the header, completed text introduction, Play action, and footer. Activate remaining sections as their real content becomes available.

## 6. Future informational page blueprints

### Fish: `/fish`

Keep the encyclopedia on one page. Do not create one webpage per fish in this phase.

Prepare a structure for fish names, approved images, categories, descriptions, behaviors, food types, rarity, and relevant genetics information. Future enhancements may include search, filters, fish cards, and expandable details.

Stable anchors such as `/fish#clownfish` support direct navigation within the page. They do not create separately indexable fish pages. When populated, the encyclopedia's useful text must be available as readable HTML content, not accessible only after a search, fragment change, or client-side fetch. Search and filters enhance access to that content.

### Decor: `/decor`

Prepare categories for plants, rocks, caves, floating decor, equipment, backgrounds, substrate, and custom decor. Future entries may include images, descriptions, screenshots, search, and filters.

### News: `/news`

Prepare a listing of real releases, gameplay changes, new content, development updates, or patch notes. Each future article may have a stable URL such as `/news/fish-behavior-update` or `/news/version-0-14`.

Do not create article routes or articles just to increase page count. Define the URL pattern now; create actual entries when content exists.

### FAQs: `/faqs`

Prepare a question-and-answer layout. Future topics may cover pricing, accounts, saves, supported browsers, mobile support, custom uploads, enhanced fish, Peaceful Mode, fish care, bug reports, tank resets, and account data.

Answers must reflect verified game behavior. These topics are prompts for later authoring, not established claims or answers.

### About: `/about`

Prepare space for the project's purpose, origins, design philosophy, development history, credits, and contact information. Keep future writing personal and specific.

## 7. Indexing, metadata, and sitemap rules

Use an explicit readiness state per page so public visibility, metadata, and sitemap inclusion can be checked together. Content slots being present does not make a page ready for indexing.

- Unfinished informational routes: initial HTML includes `<meta name="robots" content="noindex,follow">`; omit from sitemap.
- `/play`: initially `noindex,follow`, with game-specific metadata and no sitemap entry. Revisit this choice separately if a search landing page for the game entry becomes useful.
- Completed homepage: indexable, with unique metadata and its own canonical URL; include in sitemap at public launch.
- Completed informational page: remove noindex only after unique, useful content is ready; add unique metadata, a self-referencing canonical, navigation links, and a sitemap entry in the same release.

Deliver titles, descriptions, robots directives, and any canonical tags in the initial HTML, rather than depending on JavaScript to replace shared metadata. Do not canonicalize unfinished informational routes to the homepage. Their initial exclusion is controlled by noindex; add their own canonical URLs when activated. Keep any `/play` canonical pointed at its own normalized URL, separate from `/`.

`robots.txt` must allow crawlers to fetch noindex pages so they can read the directive. Do not use `Disallow` as a substitute for noindex, and do not block assets needed to render public pages.

At the minimal public launch, `sitemap.xml` contains only the completed homepage. Use the chosen canonical URL form throughout. A sitemap entry requests discovery; it does not guarantee indexing or ranking.

Suggested future homepage metadata, subject to approval and accurate visible content:

- Title: `Bubble Borough | Virtual Aquarium Game`
- Description: `Build, decorate, and care for a living virtual aquarium. Collect fish, customize tanks, and discover unique fish behaviors in Bubble Borough.`

Use natural language about the actual game. Avoid keyword repetition or unsupported feature claims.

## 8. Social metadata, structured data, and images

Prepare optional fields for Open Graph and social-card title, description, site name, URL, and preview image. Do not emit an image URL until a real approved image exists. A future preview should use the logo and actual gameplay, composed for small sharing previews.

Prepare support for accurate game/software structured data. Add it when the corresponding public content is ready, using only established facts such as the name, browser platform, simulation genre, website, and game URL. Do not invent reviews, ratings, awards, player counts, prices, or release dates. Structured data is not a promise of a special search appearance.

When images are supplied, use descriptive filenames where practical, accurate alt text, explicit dimensions, and responsive delivery. Decorative images should use empty alt text. Compress suitable imagery to WebP or AVIF; lazy-load below-the-fold assets. Do not create images or rename existing game assets solely for this blueprint work.

## 9. Game migration requirements

Moving the entry must preserve the existing game and user data. Audit and verify:

- JavaScript, CSS, fish/decor assets, JSON, sprite sheets, fonts, audio, and dynamically loaded resources.
- Authentication, account creation, login/logout, recovery and callback destinations, existing accounts, and persistence.
- Tank loading/saving, multiple tanks, storage, inventory, settings, import/export, and custom uploads.
- Fish behavior/rendering, decor rendering, custom decorations, and caves.
- BubbleBodega, WebSurf, Bubble Borough Bank, Proteus Biodyne, email, purchases, and debug tools.
- In-game Home/reload links, error recovery, query strings, fragments, and other root-path assumptions.

Keep in-game navigation in the game unless a link explicitly means the public website. Test fresh direct entry to `/play`; visiting `/` first must never be required.

Repository-specific work identified during review:

1. `index.html` uses relative resource paths. Audit both HTML references and dynamically constructed URLs against the selected `/play` URL form, including slash variants.
2. `scripts/start-web.cjs` currently maps request paths directly to files. Add deliberate local route support so development matches the production route contract.
3. `public/manifest.webmanifest` currently launches at the root via `start_url: "../"`. Update and verify installed-app launch behavior so players enter the game after migration; assess existing install identity and scope before changing them.
4. Review the separate `mobile.html` entry and define its intended destination and compatibility behavior rather than leaving a second entry unexamined.

Do not move asset directories or change save formats merely to move the game URL.

## 10. Hosting and HTTP behavior

Confirm the actual production hosting configuration before choosing directory pages, extensionless rewrites, or redirects. Local success alone does not verify production support.

- Known public routes and `/play` must return working pages on direct entry and refresh.
- Normalize alternate URL forms through supported redirects, preserving relevant query data where necessary.
- Unknown paths return a real HTTP 404 and an understandable error page.
- Do not use a universal homepage fallback that returns HTTP 200 for nonexistent pages.
- Verify canonical URLs match the final destinations rather than redirecting variants.

## 11. Performance, accessibility, and analytics readiness

Public pages should use minimal JavaScript, efficient CSS, optimized fonts, and lightweight effects. Reserve space for future media to avoid layout shifts. Use short compressed video only when a real demonstration warrants it; do not make large animated media a default dependency.

Layouts must work on desktop, laptop, tablet, and phone without horizontal scrolling. Keep the Play action obvious, navigation usable, and future screenshots and cards readable. Support keyboard access, semantic landmarks, a logical heading hierarchy, visible focus, and reduced-motion preferences for any animation.

Use clear semantic links and stable interaction identifiers where useful for future analytics. Installing analytics, tracking scroll depth, or adding third-party tracking is outside current scope.

## 12. Verification and completion criteria

### Blueprint preparation is complete when

- The permanent route map and production-compatible URL convention are documented.
- The public shell and unpopulated page blueprints exist without fabricated content or broken asset references.
- Route-specific initial HTML metadata and indexing controls work.
- Unfinished sections and promotional links are hidden or clearly marked as coming soon.
- The prepared `/play` entry works independently and does not cause public pages to load the game.
- Relevant migration checks pass, with any production-only verification clearly recorded as outstanding.
- The live root has not been replaced by an unfinished indexable homepage.

### Before public launch

- Check direct entry, refresh, new tabs, bookmarks, and browser back/forward on every route.
- Check slash variants, canonical destinations, unknown-route 404s, `robots.txt`, and sitemap exclusions.
- Inspect response HTML for route-specific metadata without executing JavaScript.
- Verify authentication flows, existing saves, installed-app launch, and the game systems listed above.
- Review the minimal public page at desktop, tablet, and phone sizes with keyboard navigation.
- Verify that public pages do not download or initialize the game engine.
- Publish only the approved minimal homepage and verified game migration.

When real content and media arrive, perform the additional visual checks relevant to those sections, including cropping, image quality, responsive sizing, loading performance, and any supported color modes.

## Reference guidance

- [Google: block indexing with noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google: JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google: URL structure guidance](https://developers.google.com/search/docs/crawling-indexing/url-structure)

The public website should explain Bubble Borough and get interested users into the game quickly. This phase establishes its structure; future approved content supplies the reasons for people and search engines to visit.
