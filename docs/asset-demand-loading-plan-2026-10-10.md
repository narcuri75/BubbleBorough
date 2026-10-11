# Load assets when they are needed

Status: implementation plan, October 10, 2026. No runtime changes made for this plan. Reference hardware: Ryzen 7 PRO 250 / Radeon 780M / 16 GB RAM. Earlier collision and renderer batches remain deferred; this plan concerns asset demand, readiness, and the UI work required to support it.

## Intended behavior

Keep small catalog metadata available for names, prices, search, compatibility, and unlock rules. Request and prepare artwork for the current scene or visible UI, with a small scrolling buffer. Home must display products from multiple categories immediately on its first visit, without opening those category tabs. Search, product details, cart, and saved purchases must have the same independence.

Preserve artwork, preview appearance, effects, resolution/DPR, animation detail, collision decisions, simulation cadence, and save compatibility. A shop thumbnail must not cause full-resolution tank artwork to load. Required tank artwork and collision companions must be ready before that tank or newly placed object becomes active. Offscreen simulation must continue from metadata without fetching artwork merely because a fish exists in another tank.

| Trigger | Assets needed | When to prepare |
| --- | --- | --- |
| Launch | Loading/toolbar assets and the saved active tank's complete working set | Before the first playable tank frame |
| Shop Home | Previews for its actual recommendations, seasonal products, and new fish | When Home opens; no category visit prerequisite |
| Category, All Categories, or search | Visible result previews and approximately one additional row | On opening, filtering, and scrolling |
| Product details | Images/layers used by that product's detail view | When the product opens; retain working controls during loading |
| Inventory/editor | Visible previews; full artwork and helper layers for the selected placement | Preview on visibility; prepare the selected item before placement |
| Food/medicine/tool selection | The selected action's artwork, cursor, drops, and required effects | On selection, before using the action |
| Tank switch | Destination fish poses/overlays, placed decor layers/masks, background, substrate, selected machinery, and current effects | Behind the existing loading cover, before activation/reveal |
| Feature/event | Assets that feature can immediately use, including current seasonal/content variants | On feature activation; deterministic events may prepare just ahead of their existing trigger |
| Audio | Enabled ambience and sounds relevant to current controls/features | Within existing browser audio-unlock requirements; preserve first-use response |

## What the code already does

- `init()` in `ui/tool-modes-and-debug-panels.js` limits the main scene to `getTankSwitchPreloadPaths(activeTank)`. It still adds all gravel choices, dispenser/boat/submarine variants, food/medicine images, and several effect groups. Audit these additions rather than removing the active-tank gate.
- `preloadImagePath()` in `assets/image-storage-and-import.js` already reuses pending requests, retries failures, and returns cached images. Extend this loader instead of adding a competing image cache.
- `assets/sprite-sheets.js` already separates delivered DOM previews from full-resolution runtime images and bounds some canvas/mask resources. Retain those paths, aliases, fallback recovery, and versioned URLs.
- `renderBubbleBodegaHomePage()` in `ui/management-and-overlays.js` creates its own mixed-category cards through the normal card renderers. It does not need to visit category tabs to construct those cards.
- `websurf-store.js` currently obtains aggregate/search products from category DOM cards. Therefore simply skipping hidden category renderers can silently remove search results and product functionality even if Home looks correct.
- Home cards are explicitly excluded from catalog virtualization. Existing image preparation deliberately preserves authored source attributes because removing them previously produced blank tiles during tab changes. Preserve both safeguards.
- `initializeSpriteImages()` hydrates inserted sprite images globally; hidden static HTML also contains authored image URLs. Visibility policy must cover these entry points, not just the gameplay preload list.
- Custom-image hydration currently visits every tank/custom asset. Audio priming creates pools for every sound path on the first unlock. Both need separate migration/readiness handling before making them selective.

## Implementation sequence

### 0. Preserve and measure

Retain the original full-game backup and create a fresh code/generated-output checkpoint with checksums before implementation. Preserve unrelated workspace edits.

Capture current request/transfer/decode behavior for a cold launch, Home-first visit, direct category entry, All Categories/search, product details, editor, tool use, and tank switching. Attribute each request to a demand scope and separate preview files, full artwork, sprite atlases, custom blobs, audio, and derived canvases. Record readiness, request counts, transferred bytes, duplicate work, queue wait, decode/preparation time, main-thread long tasks, and retained game-owned resources. Distinguish HTTP-cache hits from decoded-image reuse.

Extend the existing benchmark rather than replacing it. Add real Event Timing interaction breakdowns for Shop/Settings/Debug and first-visible-complete timing for tank changes. The current loading-logo LCP is not game readiness. Keep diagnostics outside ordinary timing runs where they materially affect overhead.

### 1. Add explicit demand and ownership to the existing loader

Introduce small dependency collectors for active tank, selected tool, visible product, detail view, and editor selection. Share collectors between launch, tank changes, imports, purchase, placement, and recovery so one entry point cannot omit required companion art.

Extend request bookkeeping with queued/loading/ready/failed status, priority, current owners, generation, and last use. Priorities: active tank/action readiness, visible UI, then the scrolling buffer. Start with four concurrent game-managed load/decode jobs as an experiment; tune from traces, without rewriting native browser image fetching just to impose that number. Existing in-flight work is reused. A later visible request can promote queued work.

Deduplicate by resolved resource/version and representation while retaining saved logical filenames and aliases. Preview and full artwork are different representations. Atlas crops and shared source sheets require ownership at both levels; one frame request may necessarily fetch a whole existing atlas. Do not repack assets in this first implementation.

Cancel queued work that no scope needs. Ignore stale results using route/tank/image generations, and release unused completed resources according to ownership. Abort a shared request only when no consumer needs it and its transport supports cancellation. Never clear an active owner's image or revoke its custom object URL because another panel closes. Preserve existing bounded retries and late-load recovery; repeated renders must not create retry storms.

### 2. Make store data independent of mounted tabs

Create a shared product descriptor/query layer from existing catalog metadata. Home, category views, search, detail pages, and cart resolve stable product/variant IDs through it. Preserve all current availability, tutorial, unlock, seasonal, water-type, sorting, facet, seller, price, quantity, and compatibility rules. Product variants need stable identities, not array positions.

Migrate `getTankazonAllCatalogCards()` consumers that need products rather than elements. Keep element-based scrolling/focus behavior at the presentation boundary. Check `store-facets.js`, `store-variants.js`, detail navigation, cart/checkout, and category counts before removing any hidden catalog construction. Reuse the current card renderers and product facts; do not fork a reduced Home-only product model.

Cache expensive descriptor/card preparation only where mutation boundaries are explicit. Dirty inputs include purchases, inventory, wallet, unlocks, custom catalog edits, filters, relevant tank facts, and seasonal/day changes. Do not cache dynamic recommendations or compatibility under a permanent catalog key. Avoid duplicate renders by updating only the active store route and affected controls after these inputs change.

**Gate:** every Home item, search result, detail page, and purchase must work from a fresh reload without any prerequisite category visit. Keep the current broad category rendering until this gate passes.

### 3. Apply visibility-driven image preparation

Mount actual visible cards and use their logical asset descriptors to resolve the same preview URLs directly. Treat the first visible row as needed now. Use each real scroll container as the observation root, with a provisional 256 px buffer; Home's horizontal rows need their own visibility handling. Reconcile immediately after route reveal, viewport changes, and virtual-card remounts so zero-sized hidden containers cannot strand requests. If observation is unavailable, mount-driven preparation is the fallback.

Keep `src`/`data-sprite-src` intact on existing card instances. Do not repeat the old strategy of removing sources during virtualization and hoping an observer restores them. Empty/detached elements are not proof a product lacks an image. On remount or variant change, explicitly ensure the current source; validate the source/generation before applying asynchronous fallback or custom-image results.

Use existing preview assets and preserve their appearance. Product details request their actual displayed layers; gameplay full-resolution assets load at purchase/placement readiness, not merely because a thumbnail was visible. Dynamic/custom art needs a lazy storage resolver with a working placeholder, retry/error state, and the existing custom rendering fallback.

Audit hidden WebSurf/static markup and CSS background images too. Where authored `src` would fetch eagerly before demand is known, mount that hidden section from an inert template when it opens, or use an explicit source descriptor resolved on mount. Do not lazy-load the loading logo, visible toolbar, or current tank. Reserve existing image dimensions/aspect ratios to avoid layout shifts. Never await all offscreen catalog images to reveal a usable panel.

Browser-native lazy loading is a useful hint, not a guarantee of exact per-row fetching. Verify network behavior for each view; avoid installing a second observer/virtualizer alongside the existing one.

**Gate:** cold Home-first images, direct category entry, cross-category search, rapid route changes, variant changes, and scrolling work with slow/delayed requests, without loading full-resolution aquarium art for browsing.

### 4. Narrow launch, tank, and tool dependency sets

Replace the broad extra startup list with the selected substrate, active machinery variants, present eggs/effects, and assets the current scene/action can actually need. Keep active fish directional poses, overlays, puffer forms, decor grounding/shadow/cave/seat/trigger companions, and currently enabled content alternatives. Invisible helper artwork can be gameplay-critical.

Audit existing synchronous image readers before deferring an effect. If a first-use reader cannot wait safely, prepare its small dependency bundle at tool selection or feature activation; do not drop that effect's first frame or change simulation timing. Purchases must still prepare the exact chosen fish appearance before introducing it. Newly placed decor must have valid masks before it affects movement/collision.

Extend the existing tank-switch generation guard and loading cover. Retain the old active working set until the destination passes image validity, companion readiness, and the first complete render. A timeout does not count as successful readiness. On unrecoverable required-art failure, retain a usable scene and show retry/error feedback; do not reveal missing artwork or consume a purchase before its required readiness/transaction conditions are met. Preserve save durability and existing transaction order.

For custom assets, separate save migration/reference repair from blob resolution and object-URL creation. First read only active/visible owners. Legacy migration, import/export, cloud serialization, and deletion must still enumerate every referenced custom image when required; never save runtime URLs or discard an inactive image because its blob was not hydrated yet. Apply the same demand policy on imported/cloud-restored saves and content-setting changes.

**Gate:** exact gameplay/state/RNG comparisons where appropriate, complete cold tank transitions, immediate tool use, selected-variant purchases, custom-save round trips, and all existing cave/turn/placement behaviors remain correct. No collision algorithm or simulation scheduler change is part of this step.

### 5. Bound retention; address audio separately

Account for actual owners across existing image, crop, mask, tint, depth, shadow, preview, and object-URL caches. Pin current tank/action resources and visible UI resources, plus both tanks during a transition. Evict only unowned resources, releasing aliases and dependent resources through existing cleanup functions. Avoid enlarging every cache or adding a parallel warm cache.

Start with existing limits and collect equivalent-state retention evidence before changing them. Any recent-tank retention allowance must be counted within the total resource budget, not added to every existing cache. Active working sets may exceed an advisory budget; report pressure instead of repeatedly evicting/rebuilding live artwork. Browser-managed DOM decode memory cannot be precisely bounded by a JavaScript map; separately report game-owned estimates, collected JS heap, and available process/GPU evidence. The reported 512 MB reservation is not an established total GPU-memory budget.

Then replace all-path sound priming with selective, user-gesture-safe unlocking and loading. Preserve first-click sound, ambience continuity, volume/mute settings, overlapping playback, and RNG ordering for sound selection. Do not fetch every sound pool merely to unlock audio. Keep this a separately measured sub-change because browser autoplay requirements and first-use sound latency differ from image readiness.

## Verification and promotion

Add meaningful tests for request deduplication/promotion, owner release, alias/shared-sheet handling, stale completion, failure/retry, inactive custom references, and dependency completeness. Update old preload-policy assertions only when intentionally changing which assets load; keep visual/state oracles unchanged.

Automated Chrome scenarios must include:

- Empty browser cache, fresh page: open Home first and verify every displayed mixed-category preview and detail link without touching category tabs.
- All Categories and searches spanning categories, filters, variants, sorting, cart/checkout, back navigation, saved cart, and direct entry to Equipment.
- Fast Home/category/Settings changes and scroll-to-bottom/back under delayed/out-of-order image responses; missing previews recover or show an explicit error without infinite retries.
- Browsing preview requests do not decode full-resolution tank fish/decor; hidden unused categories, inactive tanks, and unselected equipment variants do not create unrelated full-art requests.
- Tool selection/use, fish purchases, placement with cave companions, seasonal/content toggles, custom uploads, imported/legacy saves, and switching while requests are pending.
- 1/5/15 populated tanks: active-tank full-art requests depend on the selected scene rather than all owned artwork. Allow required metadata and shared-sheet requests explicitly.
- Thirty controlled revisits and a thirty-minute browse/tank session with owner counts and retained-resource comparisons at equivalent states; no unexplained growth or decode/eviction thrashing.

Use real image validity (`complete` plus nonzero intrinsic dimensions for DOM images, usable canvas dimensions for crops) and screenshots, not just the presence of a `src` attribute. Compare controlled-pose tank frames at unchanged quality. Run three alternating before/after samples per affected scenario, reporting cold and warm results separately: startup-to-playable, first useful/complete panel paint, event input/processing/presentation delay, frame-work tails, switches, requests/bytes, preparation, and retention. Aim for ≤200 ms interaction latency and <100 ms p95 for ordinary menu responses as a stretch target; report actual outcomes rather than promise them.

Rebuild canonical fragments with `npm.cmd run build:app`; run targeted sprite/store/navigation/save tests and all repository stages separately. Capture a fresh baseline of the currently known failing tests and missing website screenshot references; no new failures, hidden regressions, or refreshed visual goldens to mask differences. Test the actual Radeon 780M laptop at 1280 × 800, 1920 × 1080, and native scaling before claiming hardware acceptance.

Implement each step with a checkpoint, measured result, and rollback path. Promote the store-data boundary before skipping hidden catalogs; promote dependency/readiness collectors before removing startup preloads; change retention/audio only after their separate checks pass. Do not simultaneously undertake the deferred renderer or collision optimizations.

## Technical references

- [Browser-native image lazy loading](https://web.dev/articles/browser-level-image-lazy-loading): visible images, reserved dimensions, and browser-controlled loading distance.
- [IntersectionObserver roots](https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver): observing the actual scrolling viewport.
- [Optimize INP](https://web.dev/articles/optimize-inp): separate input delay, processing, and presentation; reduce nonessential work before the next paint.
