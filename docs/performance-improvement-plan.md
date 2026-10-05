# Bubble Borough performance review and plan

Reviewed October 3, 2026. The initial review made no runtime changes. The first five items from the subsequently reordered, least-compromising list are now implemented; see [implementation and validation](performance-first-five-implementation.md). The evidence below records the pre-change working files, including the ongoing repository migration. No live browser/GPU performance trace was captured. Findings below distinguish source-confirmed work from improvements whose benefit needs measurement.

"Uncompromising" means preserving the current artwork, deformation, layering, gameplay rules, fish movement, responsiveness, and save reliability. Extra bookkeeping, bounded memory, and implementation complexity are acceptable costs when measured gains justify them. Target hardware still determines achievable frame rate.

The strongest immediate opportunities are repeated decoration routing, remaining linear relationship lookups, first-use image processing, and renderer resource lifetime. The largest architectural opportunity is batching swimming fish while preserving the existing appearance. Loading speed has a separate, concrete opportunity in the included Node server.

## Evidence gathered

| Observation | Evidence | Meaning |
| --- | --- | --- |
| Decoration routing repeats 20 times per full tank render | Five depth layers; four `drawDecor` calls per layer in `rendering/tank-and-water.js:36` | Each pass rebuilds the order cache key, filters the sorted list, and sorts the filtered list again. |
| A fixture with 100 decorations visits 2,000 items for cache keys and 2,000 for filtering per frame | Executed extracted routing functions from `rendering/decor.js`, with stubbed geometry | It also performs 380 comparator calls on already sorted subsets. Removing the second sort preserved every fixture's order. These are operation counts, not frame timings. |
| Swimming uses many Canvas 2D calls | `00-bootstrap.js:2483`; `rendering/fish-and-effects.js:1143` | Base settings are 28/44/70/100 strips by fish size, with existing population adjustments. Highlights and other overlays can add work. |
| Complex turns already use WebGL | `rendering/fish-turn-v26.js:1843` and `:2308` | Each turn uses a shared WebGL canvas, which is composited into Canvas 2D. This is already a hybrid renderer. |
| The profiler can report twice the rendered FPS | Extracted `animationLoop` with synthetic 60 Hz timestamps and a 30 FPS cap | Actual processed cadence was 30 FPS; current profiler calculation reported 60 FPS. Rendering functions were stubbed; this verifies timing logic only. |
| Large browser script and stylesheet | Local file byte counts and Node compression | `app.js`: 5,105,213 bytes; gzip: 1,054,998; Brotli: 748,161. `styles.css`: 834,595 bytes; gzip: 145,516. Compression settings were Node defaults. |
| Included Node server prevents reuse and sends raw files | `scripts/start-web.cjs:55` and `:103` | `Cache-Control: no-store`; no compression or conditional response handling in this server. External hosting may behave differently. |
| Targeted regressions have existing failures | Seven test files, 124 reported tests | 122 passed, 2 failed. This is a limited baseline, not a full-suite result. |

Source paths in this document are relative to `game/public/app-src/`, except paths explicitly starting with `scripts/`, `docs/`, or `game/public/`.

## Existing optimizations to retain

The game already uses active-tank asset loading, lazy store artwork, build-time sprite delivery and thumbnails, bounded sprite and alpha-mask caches, cached gravel and depth treatments, fish render record pools and pass buckets, a local fish spatial hash, budgeted behavior decisions, deferred UI updates, and deferred saves. Hidden-tab drawing also stops. The plan extends these systems instead of recommending their introduction again.

Current code also caps normal idle animation at 30 FPS, shop animation at 24 FPS, other overlays at 30 FPS, and normal render DPR at 1.25. It reduces swimming strip density with fish population and reduces interior turn volume layers during large turn bursts. These are existing quality/performance policies. Further reductions are outside this plan. Benchmark with these policies recorded so a gain cannot be explained by an unnoticed quality reduction.

## Implementation order

| Stage | Work | Likely benefit | Effort and confidence |
| --- | --- | --- | --- |
| 0 | Correct measurement and capture representative scenes | Trustworthy decisions | Small; timing defect reproduced |
| 1 | Decoration routing and remaining identity/relationship lookups | Less CPU work as scenes grow | Small to medium; repeated work confirmed |
| 1 | Production compression and caching | Faster initial and repeat loading | Small to medium; byte savings measured locally |
| 2 | Resource lifetime and preparation of image data | Fewer first-use hitches; steadier long sessions | Medium; paths confirmed, magnitude unmeasured |
| 2 | DOM geometry and reusable frame calculations | Smoother editing; less allocation | Medium; needs browser allocation/layout trace |
| 3 | Cache suitable static render segments | Less repeated drawing | Medium; requires visual and memory comparison |
| 3 | Async persistence if saves are a measured hitch | Fewer interruptions in large saves | Medium to large; durability must be proven |
| 4 | GPU swimming/turn batching prototype | Potentially the largest dense-scene rendering gain | Large; conditional on device measurements and visual parity |

### 1. Give the speedometer the right number

**Like you're five:** A car's wheels can spin many times while it moves a little. We need to count how often the aquarium actually gets a new picture.

`ui/scene-controls-and-animation.js:1311` updates `lastAnimationFrameAt` before rejecting callbacks for the FPS cap. Its profiler receives the interval between browser callbacks. `debug/tools.js:340` converts that interval to FPS, even when the game drew only every second callback. Normal idle rendering is already capped at 30 FPS in `ui/tool-modes-and-debug-panels.js:2068`.

Track callback cadence and processed-render cadence separately. Add p50/p95/p99 frame-work and render-interval summaries, cap reason, and separate tick/UI/save timing. A p95 number describes the slowest edge of the usual experience: 95 out of 100 samples are faster. Existing section timings overlap; do not sum parent and child sections as if they were separate work.

Pair the built-in profiler with browser Performance traces for layout, painting, garbage collection, and GPU/compositor activity. JavaScript callback duration is not the entire display cost. Long Animation Frames are supplementary hitch diagnostics: their 50 ms threshold misses many dropped 60 Hz frames. [Chrome Performance documentation](https://developer.chrome.com/docs/devtools/performance), [Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames).

**Acceptance:** Synthetic cap tests report the processed cadence correctly. Record baseline traces before choosing expensive architectural work.

### 2. Sort the decorations once and remember where they belong

**Like you're five:** Put the toys in the right order once. Don't empty the toy box and sort it again every time you look at it.

`rendering/decor.js:1614` caches sorted decorations, but constructs a string from every item to check that cache. `drawDecor` at `:1640` then filters and sorts the result on every pass. Filtering preserves the order of a sorted array; the second sort is redundant for a stable scene. Four passes across five layers multiply the scans.

First remove the redundant subset sort. Then prepare exact layer/pass lists once per frame, preserving the comparator and current pass sequence. Replace repeated content-string checks with explicit revisions only after all mutation paths are covered. Rebuild on placement, deletion, movement, depth/order changes, grouping, asset readiness, tank switching, restore, and relevant settings. Keep animated pose values live. Cache stable artwork-path lists with settings revisions rather than allocating `getDecorArtworkPaths()` results inside repeated drawing passes.

Preserve the deliberate second cave-back pass, the cave interior sandwich, transit tube layer spans, and the exterior portal overlay. The same cave pixels may need to be painted twice; the optimization is their preparation, not deleting a required draw.

**Acceptance:** Exact pass membership/order before and after; depth and cave tests; moving/resizing/swapping decor invalidates immediately. This is the best first runtime change because its repeated work is directly visible in the source.

### 3. Use name tags and school lists

**Like you're five:** If you want to find Lily, look at her name tag. Don't ask every fish whether it is Lily. Keep one list of Lily's friends too.

`getFishByIdFast()` already exists in `fish/needs-disease-and-behavior.js:279`. Yet `getFishSchoolFollowLeader()` at `fish/gravel-and-schooling.js:1268` still searches the whole fish array. `getFishSchoolActiveFollowers()` at `:1407` repeatedly filters it, including from formation and target calculations. Feeding motion also searches pellets by ID, and `getTankContainingFish()` at `fish/decor-behavior.js:29` scans tanks and their residents.

Route active-tank identity reads through the existing map. Maintain followers by leader and pellets by ID. Maintain tank ownership where cross-tank lookups are truly needed. Update indexes at relationship, death, consumption, transfer, switch, and restore mutations; a frame-start snapshot alone can become stale during the frame. Preserve source ordering and time-dependent follow expiry. Keep global nearest-target queries global when their rules require that scope.

The behavior spatial hash already accelerates local perception and spacing. Extend its use only for other measured local queries, with a radius/depth filter matching their existing semantics. A spatial index trades maintenance and memory for faster searches. [Spatial partitioning](https://gameprogrammingpatterns.com/spatial-partition.html).

**Acceptance:** The same leaders, targets, follower ranks, pellet ownership, and transfer outcomes; less array scanning in schooling/feeding traces. No slower thinking cadence or reduced interaction range.

### 4. Stop saving old pictures forever

**Like you're five:** Keep the pictures you're using. Put old ones away so the desk doesn't fill up.

Most canvas caches already have limits. The v26 body/fin shape caches and GPU texture/buffer maps are exceptions: `rendering/fish-turn-v26.js:900`, `:966`, `:2161`, and `:2238` retain entries until renderer disposal or page lifetime. Searches found disposal on renderer failure/context loss, but no regular per-entry eviction. `assets/image-storage-and-import.js:442` releases base images without releasing their v26 GPU resources. Reloaded image identities can create more entries for the same artwork over a long session.

Add byte accounting and lifecycle-aware eviction for shape data, buffers, textures, and discovery images. Pin resources used by active turns. Release related GPU entries when source art leaves the working set, using `deleteTexture` and `deleteBuffer` where appropriate. Account for derived masks and tint/depth copies too; limiting one map does not bound all references to its data.

Prefer release at safe scene transitions or bounded maintenance work, rather than destroying many resources in one animation frame. Avoid eviction/redecode loops when the active scene is larger than a chosen budget. [WebGL resource and memory guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).

**Acceptance:** Memory reaches a stable working range during repeated tank switches, recoloring, and turns. No vanished fish, in-flight resource deletion, or texture thrashing.

### 5. Do picture homework before showtime

**Like you're five:** Cut out the paper fish before the puppet show starts. Don't make everyone wait while you find the scissors.

`getImageAlphaMask()` at `assets/image-storage-and-import.js:1646` reads full-resolution pixels and copies RGBA on a cache miss. `preprocessFishTurnV26BodyShape()` at `rendering/fish-turn-v26.js:907` reads pixels and computes a distance field during first use. Background/depth treatments and shadow silhouettes also do pixel processing on cache misses.

Prepare the active scene's needed masks, depth images, silhouettes, shader program, and turn shapes during asset readiness or small warm-up jobs before their first visible use. Prioritize the active scene and imminent actions; preparing the entire catalog would worsen startup and memory. For immutable art, investigate generated, versioned shape/metadata sidecars using exactly the current algorithm. For custom art, use a worker for isolated pixel transforms, with transferable buffers and stale-job cancellation.

Preserve the RGBA contract: the existing masks support RGB-based markers and anchors as well as alpha. Replacing them with alpha-only data indiscriminately would break behavior. Keep main drawing contexts optimized for drawing; `willReadFrequently` belongs on processing contexts when needed. Workers and OffscreenCanvas can move isolated work off the UI thread, but sending large snapshots also has a cost. [Workers](https://web.dev/articles/off-main-thread), [OffscreenCanvas](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas).

**Acceptance:** Same masks, shape arrays, and anchor outputs; fewer first-turn/tank-switch hitches; acceptable time to first interactive scene and memory use.

### 6. Measure the table when it moves

**Like you're five:** If the table hasn't moved, don't measure it again sixty times a second.

`updateStageRenderView()` at `assets/custom-content.js:4316` checks editor tray visibility/geometry during each processed frame. `isStageEditTrayActuallyVisible()` reads computed style and bounding rectangles. Camera transforms write CSS geometry in `syncTankStageRenderCssGeometry()` at `:4270`. Selection controls also run every animation frame. Custom previews already return early when inactive, so their inactive cost should not be exaggerated.

Cache editor geometry through ResizeObserver plus explicit open/close/reflow invalidation. Observe position changes as well as size: transforms, scrolling, ratio lock, and camera transitions can move an element without resizing it. Read required geometry together, then write styles. Cache reduced-motion preference with its change listener. Split selection control content updates from animated positioning, and compare values before writes.

**Acceptance:** Browser traces show reduced geometry/style work while editing. Camera easing, tray resizing, pointer alignment, and reduced-motion behavior stay correct. Layout calls are a candidate; actual forced reflow has not been demonstrated in a browser trace. [Browser layout guidance](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing).

### 7. Reuse the calculations for each picture

**Like you're five:** If you drew the shape of a fish once, use that same shape to put its shiny coat and spots in the right place.

Fish render records and slice templates are already pooled/cached. Remaining repeated work includes per-frame render-state objects, temporary neighbor arrays/sets, and the strip deformation calculations in `drawFishSwimDepthWarpImage()` at `rendering/fish-and-effects.js:1143` when multiple overlays use compatible geometry. Shadow receivers are rebuilt each frame at `rendering/decor.js:526`, with a linear `findIndex` during registration.

Use allocation traces to choose targets. Reuse numeric strip geometry for compatible passes keyed by fish, frame generation, dimensions, count, preset, and image bounds. Different highlight quality or source bounds require separate geometry. Reuse render-state storage and scratch collections with clear ownership. Cache static receiver geometry on decor revisions and bucket receivers by layer; keep moving caster shadows live.

Do not pool everything. Retained pools also consume memory, and shared scratch arrays are unsafe when callers retain them or nesting occurs.

**Acceptance:** Fewer hot-path allocations and calculations; no changed strip locations or alpha; stable garbage-collection pauses and bounded pools. Benefit is conditional on profiling.

### 8. Keep the parts of the picture that stay still

**Like you're five:** Draw the wallpaper once. Draw the moving fish over it again and again.

`renderTank()` clears and redraws the scene. `drawBackground()` at `rendering/tank-and-water.js:718` paints static art and water shading, then animated water lines. Gravel pixels are partly cached already, while stable composition and some decor segments still execute each frame.

Start with bounded, full-resolution cache surfaces for suitable static background/floor composition. Keep animated water lines separate. Cache contiguous static decor runs only where their alpha, blend, depth, and surrounding draw order permit equivalent composition. Invalidate on camera/DPR/size, waterline, tank shell, substrate, color, lighting, assets, and edits. Keep animated backgrounds, plants, fish shadows, caustics, and cave portal overlays live.

A same-canvas cached blit still draws pixels; it only reduces preparation/draw commands. Separate static canvas layers can avoid that repaint but add compositor surfaces and memory. Benchmark both. Full-scene dirty rectangles are a poor first choice because water, particles, shadows, and translucency change over broad areas. [Canvas caching and layer guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).

**Acceptance:** Matching images during edits and transitions, lower render work, and acceptable surface memory. No flattened cave ordering or frozen moving effects.

### 9. Save without stopping the aquarium

**Like you're five:** Ask a helper to write in your notebook while you keep playing. Make sure the helper finished before saying the page is saved.

Deferred saving already coalesces work in `tank/events-recaps-and-save.js:1838`. However, `saveState()` at `:1877` still performs state housekeeping, `JSON.stringify(state)`, and browser `localStorage.setItem` synchronously. Scheduling that work during idle time does not make a large write non-blocking. [Web Storage's synchronous behavior](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API).

Measure save housekeeping, snapshot/copy cost, serialization, and storage separately. If large saves cause visible stalls, introduce versioned async IndexedDB transactions and a last-committed snapshot while keeping legacy import/export and desktop persistence compatibility. A worker can serialize a prepared data snapshot, but copying the full mutable state every frame would create a new problem. Serialize/coalesce only at the required save cadence.

Use monotonically ordered save generations and transaction completion as the saved signal. Preserve current save timing and error reporting for player actions. Keep migration recovery and test quota failure, rapid purchases, tab closure, reload, and custom images. Do not depend on an async `beforeunload` write finishing.

**Acceptance:** Lower save-related hitch time with the same persistence guarantees. This migration is conditional; it should not precede measured evidence of save stalls.

### 10. Pack the game smaller and bring only today's supplies

**Like you're five:** Zip up the backpack, reuse the books you already brought, and bring tomorrow's toys tomorrow.

`scripts/start-web.cjs:55` disables caching for every response and serves raw files. Locally, Brotli reduced the current 5.11 MB script to 0.75 MB, about 85% fewer transfer bytes. This is a compression measurement, not an FPS or load-time measurement. [Text compression](https://web.dev/articles/codelab-text-compression-brotli).

For the hosted Node path, serve precompressed Brotli/gzip variants with correct `Content-Encoding`, `Vary: Accept-Encoding`, and HEAD behavior. Use revalidation for documents/version pointers and content-hashed immutable assets. Existing date-like query strings alone are insufficient unless every content change reliably updates them. Verify the real hosting path separately; GitHub Pages or a proxy has its own policies. [HTTP caching](https://web.dev/articles/http-cache).

Add a minified production artifact and source maps while preserving the canonical generated development bundle checks. Compression helps transfer; minification can also reduce parse input. Split heavy optional editors/debug tools only after creating explicit module boundaries: the current source fragments share one scope, so simply lazy-loading arbitrary fragments is unsafe.

Startup in `ui/tool-modes-and-debug-panels.js:1084` awaits all gravel catalogs, machinery variants, cursors, and food/medicine artwork alongside the active tank. Prioritize everything visible and immediately usable, then load optional variants with bounded concurrent decoding and action-triggered prefetch. Store art is already lazy. Retain action readiness and asset error recovery.

**Acceptance:** Lower cold-load transfer and faster warm reloads; earlier complete active scene; no stale deployments, missing action art, or higher decode-memory peaks. It improves loading rather than sustained FPS.

### 11. Give the graphics chip a batch of fish

**Like you're five:** Tell the painter how to draw the whole fish. Don't send a new instruction for every tiny strip.

The swimming renderer makes a Canvas 2D `drawImage` call per strip. For illustration, 20 medium fish use 70 x 0.75 = 53 rounded strips each under the current population rule: 1,060 base strip calls per picture before compatible overlays or special cases. This is a hypothetical workload calculation, not a measured player scene. Larger fish and layered art have different counts.

First prototype batching the existing strip quads on the GPU, preserving their sample rectangles, overlap, order, alpha, deformation equations, and phase. A new continuous mesh is a different rasterization method and needs separate visual approval; it is not automatically identical. Batch only where the existing painter order permits it. The engine may use a narrow custom renderer or a maintained 2D renderer such as PixiJS; adoption should follow the prototype, not precede it. [PixiJS batching guidance](https://pixijs.com/8.x/guides/concepts/performance-tips).

For v26 turns, measure the shared-canvas resize frequency, padded target area, repeated state/uniform setup, and WebGL-to-Canvas compositing. Explore reusable size-class render targets or a bounded turn atlas so differently sized fish do not repeatedly resize the same backing surface. Preserve clipping, full requested volume quality, shader output, and cave exterior replays. A later shared GPU scene could remove cross-context compositing but is a substantial renderer migration.

Do not blindly remove `preserveDrawingBuffer` or per-turn `flush`: the current consumer samples the WebGL canvas immediately. These settings need validation in the intended consumption architecture.

**Acceptance:** Improved p95 rendering cost across representative integrated/mobile GPUs, same fish shape/tints/highlights/caustics/layering, clean context-loss recovery, and a reliable existing-renderer fallback. Fewer calls alone do not prove faster frames.

## Benchmark and correctness contract

Use repeatable saves and recorded seeds/input where possible. Include small, medium, and maximum supported populations; dense decoration and cave scenes; schooling; feeding; simultaneous turns; cleaning; editors; shop blur; Borough overview; custom art; and repeated tank switching. Test one real weaker target device as well as the development machine. CPU throttling is supplementary and does not reproduce mobile GPU limits.

Measure cold and warm load separately from steady rendering. Record viewport/DPR, device/browser, hardware acceleration, cap reason, source revision, population, and effects. Run comparable warm-up and recording windows; compare several runs and uninstrumented behavior. Proposed interactive 60 Hz target: processed-frame work p95 below 12 ms, leaving part of the 16.67 ms display interval for the browser. This is an engineering target, not a present measurement or a guarantee. Idle 30 FPS should be evaluated against its own cadence, not labeled a dropped-frame failure.

Before/after visual comparisons must cover all swim presets, tints, disease marks, corpse rendering, highlights, caustics, cave entry/exit, and turn endpoint handoffs. Behavioral checks must preserve school rank and leader ownership, exact pellet consumption, collision clearance, layer routing, and action preemption. Memory checks should include repeated scene cycling, not only a fresh page. Save checks must preserve coins, unlocks, fish identity, custom art references, and recovery behavior.

Use the existing regression tests plus focused behavioral checks where source-text assertions cannot establish correctness. Do not weaken tests to hide a change in behavior. Add only checks needed by the implementation being changed.

## Current regression baseline

Executed:

```text
node --test scripts/fish-swim-animation-regressions.test.cjs scripts/fish-behavior-scheduler-regressions.test.cjs scripts/fish-turn-v26-renderer-parity.test.cjs scripts/continuous-depth-render-order.test.cjs scripts/cave-portal-occlusion-and-turn-safety.test.cjs scripts/fish-soft-body-spacing.test.cjs scripts/tank-frame-regressions.test.cjs
```

Reported 124 tests: 122 passed and 2 failed before implementation.

- `fish-swim-animation-regressions.test.cjs:107`: "old whole-fish living wobble is neutralized while turning and death remain separate" fails its source-text assertion expecting `drawFishLightweightTurnFallbackFrame` after the v26 branch. This failure name is already listed in `docs/architecture-regression-baseline.md`. The current branch explicitly keeps a live sprite visible if v26 cannot render. This source mismatch is not by itself evidence of a visual bug.
- `tank-frame-regressions.test.cjs:413`: "Frame must load the Bubble Borough badge artwork" fails. This file uses top-level assertions, so its reported failed file does not count individual internal assertions. Diagnose the badge expectation before treating this test as a performance acceptance gate.

The full suite and live browser benchmarks were not run. No FPS improvement has been measured or claimed. The next implementation step is corrected measurement plus decoration routing; the proposed GPU and persistence migrations remain conditional on evidence.
