# Public website preparation

The root `index.html` remains the current game. This implements the preparation phase of `public-website-plan.md`, not the public homepage launch.

## Working with the blueprints

- Run `npm run build:website` after changing `index.html`, the existing manifest, `website/pages.json`, or the page renderer.
- Run `npm run check:website` to verify generated files and HTTP routing.
- `npm start` regenerates the routes and starts the local server. `node scripts/start-web.cjs --no-open` suppresses browser opening.
- Open `/website-preview/` for the unpopulated homepage shell.
- Open `/fish/`, `/decor/`, `/news/`, `/faqs/`, and `/about/` for page-specific placeholders.
- Open `/play/` for the game. It uses the same game body, bundles, asset directories, storage origin, and auth code as the existing root.

`website/pages.json` defines readiness, future field requirements, and empty content slots. All pages are unready. The renderer fails closed if a page is marked ready: real content rendering and the launch review must be implemented before publication, rather than merely removing noindex from a placeholder. No fake content, media, articles, analytics, or structured-data claims are emitted.

`scripts/build-website.cjs` owns the generated route HTML, `public/play.webmanifest`, `404.html`, `robots.txt`, and `sitemap.xml`. Commit these outputs with their sources for static hosting. The build never writes the root game or `mobile.html`. `public/website.css` is independent of game styling and uses the existing typography/color vocabulary without requiring new assets.

## URL and host contract

Directory URLs use trailing slashes: `/play/`, `/fish/`, etc. The local server redirects slashless directories while preserving queries, serves each directory's `index.html`, and returns HTTP 404 for unknown routes. There is no SPA fallback. The homepage blueprint stays at `/website-preview/` until launch.

The repository contains a custom-domain CNAME but no confirmed production serving configuration. Directory index files are prepared for conventional static hosting; before deployment verify that the real host serves them, normalizes slashless URLs, preserves queries/fragments through redirects, returns the custom error document with status 404, and normalizes HTTPS/hostnames. Do not assume the local Node server is the production server. Direct `/index.html` aliases on static hosts should also be normalized where host configuration permits.

All new public placeholders, the preview, and `/play/` carry noindex in initial HTML and are omitted from the sitemap. The sitemap currently lists the unchanged existing root only. The preview has no canonical to the unfinished future homepage. Crawling remains allowed so noindex can be read.

## Game compatibility and release checks

The generated game adds `<base href="/">` before resource references, preserving existing relative asset URLs and the game's `document.baseURI` asset resolver. Its game body is byte-identical to the current root document. No save keys or formats change. The existing mobile compatibility document stays at `/mobile.html` with its current behavior.

The `/play/` entry uses a separate manifest at `/public/play.webmanifest`, with `id: "/"`, `start_url: "/play/"`, and `scope: "/"`. This retains the original root-based application identity while preparing the new launch URL. The existing root manifest is untouched during preparation. Verify updates of an already-installed application on real supported devices before switching the original manifest at launch.

The existing auth helper derives callback URLs from the current location. Before publicly promoting `/play/`, add the following exact production redirects to the hosted Supabase allowlist and test confirmation, recovery, and email changes:

- `https://bubbleborough.com/play/`
- `https://bubbleborough.com/play/?auth=signup-confirmed`
- `https://bubbleborough.com/play/?auth=email-changed`
- `https://bubbleborough.com/play/?auth=recovery`

Keep the existing root callback URLs allowed during preparation; the root remains a functioning game entry. Hosted allowlist settings and email templates were not changed by this implementation. Before a later root replacement, implement and verify compatibility for old root callback links (including query and fragment credentials), and update Site URL/email destinations as appropriate. Do not strand existing recovery links on a marketing page.

Local checks exercise metadata, root preservation, game-body parity, assets, route refreshes, redirects, and 404s. Mocked auth tests do not substitute for delivered-email tests against the hosted project. Live account/save round trips, purchases, uploads, installed-app upgrades, gameplay visual parity, and production host behavior remain release verification requirements.

## Later public launch

Supply the approved minimal introduction; implement its content renderer; move the completed public homepage to `/`; update the original app manifest only after installed-app checks; preserve old auth callbacks; and enable homepage indexing. Then activate other pages individually with real content, unique metadata, self-canonicals, navigation, and sitemap entries. Remove the preview from public navigation permanently and decide whether to remove its route. Assets and full showcase sections can arrive later.
