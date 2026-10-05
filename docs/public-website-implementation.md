# Public website implementation

> **Current deployment rule (October 1, 2026):** `game/assets/` and
> `game/public/` are the only checked-in game source directories. GitHub Pages
> serves `index.html`, `website/*/*.html`, and `game/index.html` directly from
> the repository. Root `assets/` and root `public/` are forbidden duplicate
> directories. The historical Node-only migration notes below are superseded
> where they conflict with this rule.

## Historical migration notes

This architecture replaces the former generated page directories and root-game preparation workflow. There is no GitHub Pages dependency, root HTML entry, per-route website HTML copy, or website generation command.

| Physical source | Public URL / responsibility |
| --- | --- |
| `game/index.html` | `/play`, canonical non-trailing form |
| `game/mobile.html` | `/mobile.html`, existing compatibility behavior |
| `game/assets/` | `/assets/...`, unchanged game resource URLs |
| `game/public/` | `/public/...`, unchanged bundles, styles, manifests and resources |
| `game/supabase/` | Existing game backend configuration and friend-invite function; not served by Node |
| `website/index.html` | Shared shell for all public website routes |
| `website/home.html` | Current homepage content, temporarily shared by unfinished routes |
| `website/router.cjs` | Server-rendered route metadata/content, sitemap, and error content |
| `website/site.css`, `website/compat.js` | Browser resources at `/site/site.css` and `/site/compat.js` |
| Future `website/assets/` | Website-only media at `/site/assets/...` |
| `scripts/start-web.cjs` | Node server and explicit public resource mounts |

The internal game organization is intentionally preserved. Splitting `game/public/` into new JS/CSS folders or renaming asset files would add unnecessary churn. Public asset URL prefixes are mounts, not repository folders.

## Routing and SEO

`/`, `/fish`, `/decor`, `/news`, `/faqs`, and `/about` render through one template. Metadata and content are in the initial HTTP response. The homepage has real introductory text and existing branding; screenshots and other unprovided media are omitted. Secondary pages temporarily reuse that content with noindex. Only the homepage is initially in the sitemap.

`/play/` and trailing-slash informational URLs redirect to their non-trailing forms, preserving queries. Browsers preserve fragments when the redirect does not replace the fragment. Legacy `/index.html`, `/play/index.html`, and `/game` entry aliases redirect to `/play`. Unknown routes return HTTP 404 with website error content; they do not fall back to the homepage. `/website-preview` is retired and returns 404.

`robots.txt` and `sitemap.xml` are served by Node, not loose root files. Noindex documents remain crawlable. `/play` is noindex in the document and response header. Website code does not load the aquarium engine.

Only explicit runtime resource mounts are served; project files, backend functions, and website server modules are not web-accessible. HTML and resources currently retain the existing server's no-store caching policy. Responses use no-referrer so callback query credentials do not become referrers. The server never logs request URLs or tokens.

## Authentication and installed apps

The game's auth implementation is unchanged. Direct entry at `/play` naturally produces `/play` auth redirects through its existing location-based helper. Authentication parameters are routing hints, never proof of verification; validation remains inside the game.

For old callbacks to `/`, Node recognizes query-based auth callbacks and redirects to `/play`. The early `website/compat.js` handles fragment callbacks that servers cannot read, preserving the complete original query and fragment with `location.replace`. Its destination is fixed to same-origin `/play`; there is no user-supplied redirect target. Ordinary homepage links, campaign queries, and unrelated anchors stay on the website.

The same script recognizes standalone root launches via display mode or iOS standalone status and sends them to `/play`. The manifest remains at the existing `/public/manifest.webmanifest` URL, with explicit `id: "/"`, `start_url: "/play"`, and `scope: "/"`. Explicit identity matches the old resolved root start URL. The temporary `/public/play.webmanifest` redirects to that original manifest URL.

No service-worker registration or Cache Storage strategy was found in the runtime audit. No cache wipe was added. LocalStorage keys, custom-image IndexedDB database/version, and origin remain unchanged. No data migration or reset runs. Existing resource URLs remain stable, avoiding a mixture of old/new asset URL conventions.

Hosted Supabase configuration is external and was not changed. Add exact `/play` callback destinations listed in `authentication.md`, keep old root entries allowed, and test real delivered emails before deployment. Existing friend invitations still returning to `/` are supported by the compatibility handoff. Run backend deployment commands from `game/` after the backend source move; the function itself was not redeployed.

## Tooling

`npm start` starts the Node server; it does not generate or copy HTML. `HOST` and `PORT` are configurable; production disables automatic browser opening. The existing deployment should launch this server with its required environment and reverse-proxy settings.

Game build/audit/test tools now resolve their game root under `game/`. Project scripts, documentation, package metadata, and development dependencies remain at the repository level. Asset manifests continue storing public URL-relative paths such as `assets/fish/...`, not physical repository paths. The GitHub build-info workflow and asset rebuild batch command write to the moved game paths.

The fish-motion observational harness writes its document inside `game/`; enable its explicit development-only mounts with `node scripts/start-web.cjs --debug-tools`. Production does not expose those audit routes.

## Removed obsolete sources

After the new routing tests and regression comparison succeeded, the generated `fish/`, `decor/`, `news/`, `faqs/`, `about/`, `play/`, and `website-preview/` directories were removed. Each contained only its obsolete `index.html`; contents were checked before removal. Root `404.html`, `robots.txt`, and `sitemap.xml`, the old `scripts/build-website.cjs`, obsolete `website/pages.json`, and duplicate game manifest were also removed. The original root game and mobile documents were moved, not discarded.

## Validation and limits

Baseline before migration: all test files reported **1,036 tests: 972 passed, 52 failed, 12 skipped**. The first corrected post-migration comparison reported **1,039 tests: 975 passed, 52 failed, 12 skipped**; the increase comes from replacing four static-architecture tests with seven Node architecture/compatibility tests. The set of 52 failing test names was identical. No game test assertions were removed to achieve this result.

The standard checks initially passed bundle freshness, asset references, tracked deployment assets, mobile compatibility, notification ownership, and action architecture. Cave opacity validation already failed for `ceramic-tube-cluster`, `extra-narrow-pleco-tubes`, and `seashell-cluster` front-layer PNGs. Those image bytes were not changed. Full baseline logs and before/after comparison artifacts are retained locally in `.review-artifacts/architecture-*`.

After migration, bundle freshness, asset references, mobile, notifications, architecture, and JavaScript syntax checks still pass. The tracked-deployment-assets check flags the moved assets until their new paths are staged. A temporary projected Git index verified all 1,151 deployment assets with zero missing or untracked entries; the real staging area was not changed. This is a staging prerequisite, not a suppressed check. `npm test` is not fully green: without staging it stops at that check, and the existing cave-opacity/game regression failures remain afterward.

The byte audit recorded 2,098 original game/public files, including the former website CSS and generated manifest. Of those, 2,094 moved files are byte-identical. Removing the three new head tags from `game/index.html` reproduces the original document hash exactly. Intentional runtime edits are confined to those routing metadata/base tags and manifest launch/identity fields; website CSS moved and changed independently, and the obsolete duplicate manifest was retired. Gameplay source, bundles, and asset bytes are preserved.

Automated checks cover direct URL requests and repeated requests, canonical slash redirects, metadata, sitemap, real 404s, response resource parity, callback query/fragment preservation, standalone launch routing, and unchanged auth cleanup behavior. Hosted mail delivery, production proxy routing, actual installed-app upgrade behavior, and live cloud/save/upload round trips cannot be established by these local tests and remain release verification requirements. Existing regression failures prevent an unconditional clean-suite claim.

Browser checks passed direct entry and refresh for all seven public routes, homepage-to-Fish/Decor/Play back navigation, and Fish-to-About back/forward navigation. The game reached its existing-player Continue screen at `/play`. The homepage's phone viewport had equal content/viewport widths and loaded only `/site/compat.js` as an external script, with no game bundle. This verifies local entry and layout, not every gameplay action or cloud round trip.

The complete unchanged failure list is recorded in [architecture-regression-baseline.md](architecture-regression-baseline.md).
