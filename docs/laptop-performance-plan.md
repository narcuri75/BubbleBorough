# Laptop baseline performance plan

Status: three implementation batches completed October 9–10, 2026; see the [first measurements](performance-implementation-2026-10-09.md), [second batch](performance-second-batch-2026-10-09.md), and [latest social-profile/friend-selection results](performance-third-batch-2026-10-10.md). Further batches are deferred at the user's request. Acceptance on the reference laptop is still outstanding.

Execution plan: [next batches, with implementation scope and test gates](performance-next-batches-2026-10-09.md).

## Reference machine and quality contract

User-selected baseline: **AMD Ryzen 7 PRO 250, Radeon 780M integrated graphics, 16 GB RAM**, with a reported 512 MB graphics allocation. AMD lists this processor as eight cores/sixteen threads with a 3.3 GHz base clock and Radeon 780M graphics. This is the reference laptop, not a claim that it represents the weakest laptop in use. Keep older integrated-GPU systems in compatibility testing.

Verify shared/dedicated graphics-memory reporting on the reference laptop before assigning a total GPU-memory limit. The reported reservation alone does not establish available graphics memory. Do not require BIOS or graphics-memory setting changes to make the game run acceptably.

Use **1920 × 1080 browser content at DPR 1** as the provisional standard test viewport; also test 1280 × 800 and the laptop's actual native viewport/Windows scaling. Native resolution has not been supplied. Keep the game's existing normal DPR cap (1.25); do not lower it to obtain a passing result. Record laptop model, browser/version, display scaling, graphics driver, power mode, and plugged-in/battery status. These measurements must eventually run on the actual laptop: desktop CPU throttling does not reproduce its GPU, shared memory, power limits, or sustained behavior.

Preserve the existing artwork, fish silhouettes, recolors, highlights, shadows, caustics, cave occlusion, smooth deformation, turn appearance, and normal detail settings. Preserve simulation cadence, feeding response, schooling, movement, collisions, disease/needs outcomes, offscreen progression, save compatibility, and random/state-update ordering. Debug label text may refresh less often; label positions and gameplay remain responsive.

No new frame cap, automatic resolution reduction, fewer fish, removed effects, or slower simulation will count as an engine optimization. Separate optional quality settings would require a separate product decision.

## Proposed acceptance goals

These are targets to validate, not claimed results on the reference laptop.

| Area | Goal |
| --- | --- |
| Normal gameplay | Sustain the existing 30 FPS idle target at current quality; at least 95% of processed-render intervals within 40 ms on a 60 Hz display, p99 within 67 ms after warm-up. Confirm presented-frame smoothness separately. |
| Main-thread frame work | p95 at or below 20 ms in baseline scenes, leaving headroom within the 33.3 ms idle-frame interval. |
| Interaction rendering | Preserve currently uncapped interaction modes. Aim for smooth 60 FPS feeding, dragging, and camera transitions; report these separately rather than silently capping them at 30. For a 60 FPS pass, target p95 main-thread work at or below 12 ms plus GPU/presentation headroom. |
| Responsiveness | Warm controls show visible feedback within 100 ms at p95; routine feedback should not exceed 200 ms. Measure click-to-visible-result, not just handler execution. |
| Warm hitches | No recurring tasks over 50 ms in stable play. Include the periodic all-tank tick and deferred UI/save tasks. Separate asset preparation and cold-start measurements. |
| Tank changes | Warm revisits complete within 1 second at p95, including the existing transition. First visits may load artwork but must show responsive feedback throughout. |
| Startup | Initially target at most 12 MiB of compressed first-play resource bodies and engine readiness within 8 seconds at controlled 20 Mb/s, 50 ms latency. Aim for repeat starts within 3 seconds. Preserve appearance and immediate tool usability; record any required first-use preparation. |
| Memory | First inventory resource ownership. Provisional baseline budgets: game JS heap at or below 128 MiB after collection; estimated game-owned GPU textures/buffers/render targets at or below 192 MiB steady and 256 MiB during transitions. Track CPU image/mask buffers separately and measure process/shared-GPU memory where available. These estimates exclude browser/driver overhead and require validation. |
| Session stability | No monotonic retained-resource growth across 30 switches or a 30-minute session. No disappearing fish, cache-eviction loops, stale worker output, or blank frames. |

Do not force a memory budget by evicting the visible working set every frame. The alpha-mask cache is already 128 MiB because smaller budgets previously caused repeated readbacks. Revisit representation/ownership before shrinking existing budgets.

## Test scenes

Create validated fixtures from the current catalog, using only successfully created fish/decor. Keep population, layout, fish state, lighting, camera, time progression, and randomness comparable between variants. Record cold preparation separately from warmed operation.

- Ordinary: eight mixed fish, three decorations; repeat the October 9 audit scene.
- Baseline: twenty mixed fish, ten decorations including two caves and animated plants, normal lighting/shadows/caustics, and equipment. Include a dirty-tank variant.
- Crowded: thirty fish, twenty decorations, schooling and individually recolored fish. Report performance separately until its acceptance level is established; do not imply unlimited scene complexity.
- Interaction: feeding, multiple simultaneous turns, cave entry/exit, fish/decor dragging, resizing, zooming, cleaning, and equipment motion.
- Borough: one, five, and fifteen tanks, with the same visible tank and meaningful offscreen populations, to expose periodic tick scaling.
- UI/lifecycle: store opening and scrolling, Overview, startup/sign-in cover, repeated tank switches, save/reload, custom artwork, and WebGL context loss/fallback.

Time active simulation, rendering submission, browser/GPU/presentation, UI, tick, and save independently. Parent and child profiler sections overlap. Collect p50/p95/p99, allocation/GC, resource bytes, cache misses/rebuilds, and long tasks. Measure ordinary play with diagnostics off and run a separate diagnostics-on scenario. Use headed browser tests on the reference laptop; the existing headless desktop audit is a useful regression check, not final hardware acceptance.

## Implementation order

### 0. Make the comparison reproducible

Promote the useful ignored audit fixtures into a maintained, opt-in benchmark harness. Validate catalog IDs and wait for all startup dialogs to finish. Separate setup/warm-up from sampling and keep repeat runs comparable. Add resource and expensive-getter call counts only in diagnostic runs. Preserve the current development bundle and test architecture.

The current twenty-fish desktop scene takes about 90 ms/frame even with behavior broadcasts disabled. Reaching a 20 ms main-thread budget means roughly a 4.5× reduction in that measured work before accounting for reference-laptop differences. Small cleanups alone are unlikely to complete the plan. Establish actual laptop measurements before claiming success.

### 1. Make dev diagnostics inexpensive

Files: `ui/tool-modes-and-debug-panels.js`, `rendering/fish-and-effects.js`, `debug/tools.js`.

- Separate debug-tools access, behavior broadcasts, logging, and the performance overlay. A developer account should not automatically draw and construct all fish diagnostics every frame.
- Make detailed behavior broadcasts/logging opt-in. Offer selected-fish inspection as the inexpensive default.
- Refresh diagnostic text at about 4 Hz or when its meaningful contents change. Cache text fitting by string, font, and available width. Use bounded search for truncation, and measure with the canvas context/font that actually draws the text.
- Keep label positioning live and preserve useful behavior logs without building unused snapshots.

Gate: diagnostics off performs no broadcast snapshot/text work; diagnostics remain useful when requested. The previous sequential comparison saved about 39 ms/frame in one twenty-fish dev scene. That is evidence for prioritization, not a prediction for the laptop or ordinary accounts.

### 2. Remove repeated fish/tank calculations

Files: `fish/meals-and-needs.js`, `fish/needs-disease-and-behavior.js`, `fish/predators-and-motion.js`, `tank/catalog-and-equipment.js`, `tank/simulation.js`.

- `getFishNeedValue` currently sanitizes/rebuilds the full needs object for a single-key read, and that work derives comfort, decor needs, and conflicts. Split narrow reads from full normalization. Keep live derived values and the persisted needs shape correct; audit callers that currently rely on the write performed by a read.
- Build reusable tank facts: living residents, species counts, decor/service tags, space load, and relevant conflict counts. Reuse across needs, comfort, social status, mood, UI, and the periodic tick instead of scanning the same tank repeatedly.
- Reuse pure per-fish derived facts within an evaluation step. Scope caches to the tank and evaluation time, and invalidate immediately on relevant mutations. Begin with conservative step-local reuse before adding cross-frame revision caches.
- Cover eating, damage/healing, death, growth, transfers, relationship changes, decor/equipment edits, water/cleanliness changes, settings, restore, and timed expirations. Do not memoize side-effecting or random functions without separating their effects.
- Reuse the same work in offscreen tank processing while preserving existing offscreen progression. Do not obtain gains by skipping entire tank updates.
- Prefer existing indexes and tank aggregates for conflict checks. Preserve self-exclusion, source ordering, and species-specific exceptions.

Gate: matched state-transition tests and existing behavior suites agree; time-sensitive and mid-step mutations take effect immediately. Record decreases in repeated getter calls and both frame/tick time. Initial budget: at most 6 ms of main-thread frame work for movement/behavior **including** collision, subject to the total frame budget.

### 3. Remove first-use image/turn stalls

Files: `assets/image-storage-and-import.js`, `rendering/depth-visuals.js`, `rendering/fish-turn-v26.js`, scene startup/switch loaders.

- Inventory active-scene mask, depth-variant, tint, turn-shape, shader, and upload misses; prepare required data before the scene is revealed, with bounded main-thread jobs.
- For immutable shipped artwork, prototype content-versioned precomputed masks/turn data using the existing algorithms and preserving authored RGB markers and RGBA contracts.
- For runtime/custom artwork, move suitable pixel processing into a worker where supported. Transfer owned buffers/bitmaps, avoid per-frame scene copies, and preserve a bounded main-thread fallback.
- Use scene generations to cancel/discard stale results after switches, artwork replacement, and settings changes. Ensure immediate actions have a ready path rather than silently losing input.
- Warm first turn resources before the player triggers a visible turn. Keep current turn geometry, resolution, layering, and final-frame handoff.

Gate: identical prepared outputs where algorithms are unchanged; no live pixel-readback/build loops in warmed steady scenes; no new first-use freezes or blank art. Loading must remain responsive and optional preparation must not unnecessarily extend startup.

### 4. Reduce collision preparation and candidate work

Files: `fish/caves-and-collision.js` and related depth/spatial helpers.

- Reuse immutable obstacle geometry with explicit invalidation for placement, size, depth, waterline, readiness, and tank changes.
- Tighten broad-phase candidate queries while preserving conservative bounds and exact narrow-phase rules.
- Reuse valid step-local query/preparation results; moving fish still invalidate position-dependent results.
- Remove repeated collision/escape attempts only when they are provably equivalent. Keep tunnel/cave traversal, spacing, and motion cadence unchanged.

Gate: seeded collision/path parity and existing cave/depth tests pass, with lower candidate/preparation counts. Collision remains included in the movement budget, not counted again as a separate allowance.

### 5. Prototype fish drawing batches with the same detail

Files: `rendering/fish-and-effects.js`, `rendering/fish-turn-v26.js`, `rendering/tank-and-water.js`.

- Existing source-rectangle and swim-geometry reuse is already implemented. Keep it and focus on the remaining roughly 1,250 slice submissions/frame in the measured twenty-fish scene.
- Prototype batching existing textured strip geometry in a shared GPU path, using bounded atlas pages or texture groups. Keep the same strip count, deformation, sample rectangles, overlap, alpha, blend behavior, and painter order.
- Batch only compatible consecutive draws; fish/cave/plant ordering boundaries must split batches. Preserve the cave interior/exterior passes and lighting-mask silhouette.
- Avoid per-fish GPU→CPU→GPU transfers. Measure submission, synchronization, and actual GPU work separately. Do not remove required flush/preserved-buffer behavior casually from the existing mixed Canvas/WebGL path.
- Keep the existing renderer as a fallback. If a narrow batch prototype cannot reach the budget, evaluate a shared GPU scene renderer as a separate measured architecture step with the same quality checks.

Gate: animation/image comparisons across species, recolors, turns, depths, shadows, caves, and custom art; context-loss recovery; sustained improvement on the actual 780M. Initial drawing-submission budget: at most 7 ms/frame at the 30 FPS baseline, with separate GPU/presentation acceptance. Do not count cheaper-looking output as parity.

### 6. Bound resources and avoid covered-scene work

Files: artwork resource owners, `ui/scene-controls-and-animation.js`, store/utility overlays, tank transitions.

- Account for CPU masks, decoded art estimates, derived canvases, textures, buffers, and render targets under explicit owners. Add bounded lifetimes and release aliases safely; preserve the cleanup already verified by tank switching.
- Pin the active working set; use bounded destination prewarming. Avoid increasing caches globally to hide misses or shrinking them into repeated rebuilds. Share equivalent static results and remove unnecessary copies first.
- Reuse a captured tank backdrop under the store where it retains the current blurred appearance. Stop fully covered visual work at sign-in/startup. Keep scene transitions, simulation, and turn completion correct, including resumption after a long pause.
- Keep dynamic scenery live during normal gameplay. Cache static compositions only where complete invalidation and a measured net benefit justify their memory cost.

Gate: memory budgets are measured, warm switches meet the goal, covered menus remain visually equivalent, no stuck turns, no resource growth during the session test. Do not create a second simulation clock to support snapshots.

### 7. Improve startup and menus

Files: startup loaders, image delivery/manifest tooling, store/UI rendering, `scripts/build-app-bundle.cjs`.

- Load the visible tank and immediately usable tools first. Defer unrelated machinery/art variants and catalogs. Keep required first-use readiness/error recovery explicit.
- First try lossless re-encoding, deduplication, removal of unused data, and narrower readiness sets. Any resized/alternate delivery artwork needs editing/zoom comparisons and a full-detail source where required.
- Build visible store items first and add content in bounded batches. Preserve keyboard navigation, search/filter results, focus, scrolling, and item selection.
- Retain existing production Brotli/gzip and safe caching. Add conservative production minification/source maps; split optional features only after their shared-scope dependencies are explicit.
- Reduce unchanged DOM writes and layout reads in editing. Keep save/storage changes conditional on a measured save bottleneck.

Gate: startup transfer/readiness and menu-response goals pass on controlled networking and the reference laptop; no missing images, delayed tool actions, navigation regressions, or degraded art.

## Delivery and validation

Deliver the phases as small, reviewable changes, rebuilding generated `game/public/app.js` from canonical fragments. Preserve existing performance, rendering, cave, turn, save, and architecture checks. Record a fresh pre-change suite so existing failures are distinguished from regressions. Add targeted parity/invalidation tests for substantive caching/rendering changes, and use browser fixtures for actual timing and visual output.

After each phase, repeat matched desktop and reference-laptop scenes. Keep both normal and developer scenarios. Use the phase's targeted tests and required build checks; broaden testing when integration changes justify it. Only claim the laptop baseline achieved after sustained, headed runs on that hardware, including battery/plugged-in results and the larger Borough fixture. Full native-resolution results remain a required check once the screen/scaling are known.

Start with phases **0–2**, then re-profile. Continue through image preparation and collision work; use remaining measured bottlenecks to scope the GPU prototype. The implementation may need all phases to meet the baseline. No FPS uplift or completion estimate is guaranteed by the earlier desktop profile.

## Sources and prior evidence

- [October 9 runtime review](performance-review-2026-10-09.md): local measured timings and limits.
- [Existing first-five implementation](performance-first-five-implementation.md) and [runtime resource cleanup](performance-runtime-improvements.md): retain work already completed.
- [AMD Ryzen 7 PRO 250 specifications](https://www.amd.com/en/products/processors/laptop/ryzen-pro/200-series/amd-ryzen-7-pro-250.html).
- [AMD UMA shared-memory explanation](https://www.amd.com/en/resources/support-articles/faqs/PA-280.html): general shared-memory guidance; this desktop article does not identify the laptop's exact allocation.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): batching, synchronization, resource ownership, and estimated GPU budgets. A 512 MB number is not a portable browser-queryable allocation limit.
- [web.dev worker guidance](https://web.dev/articles/off-main-thread): narrower off-main-thread work and transfer overhead.
