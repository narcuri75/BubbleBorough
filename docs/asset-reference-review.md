# Asset reference review — October 3, 2026

Reviewed the current game source, built bundle, HTML, CSS, manifests, asset metadata, website source, generated static pages, rendered Node website routes, and image delivery generators. Changes are limited to asset references, icon declarations, generated outputs, and asset validation.

## Corrections

- Website logo, favicon, and animated bubbles now use their existing WebP files.
- Website decor cards use the existing `.webp` preview names instead of nonexistent `.png.webp` names. Rebuilt all nine static website outputs.
- The cart icon CSS now matches the case of the `Icons` directory, avoiding a failure on case-sensitive hosts.
- Otocinclus and piranha fallback references now resolve to their own existing sprite frames. The missing shrimp shop preview reference now resolves to the existing shrimp body frame. Synchronized emergency catalog data and rebuilt the game bundle from current source.
- Game favicon links and installed-app icons declare `image/webp`. The tile icon declares its actual 100×100 dimensions.
- Expanded the reference checker to cover the whole current public runtime, website, generated HTML, and rendered catalog routes; physical paths are checked with exact case. Raw HTML image sources and CSS URLs require physical files. Logical sprite names remain valid.
- Follow-up browser errors exposed same-origin absolute `/assets/` URLs that bypassed sprite lookup under `/game/`. Canonicalized these app resource URLs, including `/game/assets/` references, while preserving external URLs and query strings.
- Legacy renderable background delivery paths now resolve to loose WebP backgrounds. Legacy `_png.webp` and `.png.webp` suffixes resolve to `.webp`; valid `.png.thumb.webp` sprite delivery names remain intact. Legacy loose logo, bubble, favicon, tile, and coin image paths also resolve to WebP.

## Preserved PNGs

- `game/assets/web/websurf/WebSurf_icon.png`
- `game/assets/web/websurf/browser_home.png`
- `game/assets/foodandmeds/frisky-food.png`

PNG sprite-frame names and `.png.thumb.webp` delivery names are logical identifiers backed by WebP atlases, so they remain unchanged. Catalog/save identifiers for decor are also preserved.

## Validation

- Reference audit: **3,541 references; zero missing**. Also validates the asset manifest against physical assets or 1,007 logical sprite names.
- Image header/format audit: **1,759 PNG/WebP files; zero errors** across game assets and website artwork. This checks metadata, not every decoded pixel or browser appearance.
- Website routing and sprite tests: **20 passed, zero failed**, including all fish/food sprite names in the pasted browser errors, the legacy background and coin paths, obsolete double-extension forms, and the three preserved PNGs.
- Game bundle freshness, static website freshness, JavaScript syntax, mobile, notification ownership, and architecture checks passed.
- Remaining standard game regressions: **692 passed, 41 failed, 12 skipped**. These failures include stale PNG expectations and unrelated gameplay/test-harness assertions; they were not changed to force a green result.
- Deployment asset check: **zero missing files on disk, 1,151 untracked files**. The existing move into `game/` has not been added to Git. These files need inclusion in the eventual commit for deployment. No staging, commit, or push was performed.

## Limits

The unreferenced historical `game/public/grime-test-app.js` and `game/public/zombie_skeleton_behaviors.js` still contain references to retired assets. Neither has an import or document entry point in the current game. They were reviewed and left untouched, and are explicitly excluded from the current-runtime reference checker.

Dynamic custom/user-uploaded assets and browser rendering were not exhaustively exercised. The existing cave opacity checker only scans PNG cave art and therefore checks zero files after this conversion; image opacity was not altered. The background delivery generator likewise only converts PNG sources; current WebP backgrounds are served directly through the asset manifest.
