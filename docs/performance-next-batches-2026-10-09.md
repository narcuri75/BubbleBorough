# Next performance implementation batches

Status: batch 3A/3B implemented October 9–10, 2026; conditional 3C evaluated without promoting additional reuse. See the [third implementation report](performance-third-batch-2026-10-10.md). **Batches 4–6 are deferred at the user's request.** The remaining text records the original plan and its test gates.

## Starting point and quality requirements

The current desktop test with twenty fish and three decorations averages 47.9–52.1 ms of work/frame, or 17.2–18.5 processed FPS. Motion costs 25.4–29.7 ms/frame; fish drawing costs about 16.8 ms. Crowded tank switches take 2.48–2.74 seconds. Collected crowded-scene heap is 84.4–89.4 MiB, higher than the previous short baseline; retained-memory behavior needs investigation.

These are desktop measurements. The reference remains Ryzen 7 PRO 250 / Radeon 780M / 16 GB RAM. The [laptop plan](laptop-performance-plan.md) proposes 30 FPS normal play, a 20 ms p95 main-thread work budget, responsive uncapped interactions, and warm tank changes within one second at p95. The current twenty-fish fixture has only three decorations; it does not establish performance for the proposed ten-decoration/two-cave baseline.

Preserve artwork, resolution/DPR, highlights, shadows, caustics, strip detail, turn geometry, cave occlusion, fish counts, simulation cadence, feeding, schooling, collision decisions, and saved state. Preserve random-number and state-update ordering. The turn/movement ownership rules in [the integration contract](fish-turn-movement-contract.md) also apply.

| Order | Batch | Intended benefit | Main regression risk |
| --- | --- | --- | --- |
| 3 | Social profiles and mood work | Less repeated CPU work and allocation | Stale social rules or changed friend/mood selection |
| 4 | Collision preparation and strict-mask checks | Cheaper depth/cave movement decisions | Incorrect passage, clipping, or altered routes |
| 5 | Tank switching and resource ownership | Shorter switches and stable memory | Missing artwork, rebuild loops, or excess retained resources |
| 6 | Fish drawing prototype | Fewer drawing submissions at the same detail | Blending, layer ordering, deformation, and context recovery |

Batch 3 is implemented as described in the latest report. No further batch is authorized for implementation now. If work resumes later, use a new profile to scope batch 4 and transition/resource evidence to scope batch 5. Batch 6 stays a separate prototype until it passes visual and hardware checks. No FPS increase is promised in advance.

## Preparation shared by the batches

- Preserve the current generated bundle, canonical source, tests, and a checksum in a new code checkpoint. Retain the original full-game backup. Record existing uncommitted work rather than resetting it.
- Capture a fresh baseline using the exact instrumentation that will measure the change. Extend `scripts/benchmark-laptop.cjs` with opt-in social-profile builds/hits, friend candidates, descriptor builds, strict-mask calls/sample counts, transition phases, and resource ownership counters as needed. Separate heavily instrumented diagnostics from ordinary timing runs.
- Keep the existing eight-/twenty-fish scenes for continuity. Add validated schooling, friendship, cave, and dirty-tank fixtures for the relevant batch. Add viewport/DPR configuration so 1280 × 800 and 1920 × 1080 can be measured independently.
- Add deterministic function/state comparisons against the preserved implementation. Use fixed time, fixed steps, identical inputs, and tracked RNG consumption. The existing real-time benchmark is useful for timing but cannot prove trajectory parity merely by sharing an initial seed.
- Preserve the current failure inventory: 43 gameplay test failures, two performance-test failures, and missing website screenshot references. New parity tests must pass. Existing red checks cannot be used to excuse a new behavioral difference; do not refresh a golden digest solely to make it green.

## Batch 3 — social profiles and mood calculations

Primary files: `tank/catalog-and-equipment.js`, `fish/meals-and-needs.js`, relevant consumers in `fish/needs-disease-and-behavior.js`, `fish/gravel-and-schooling.js`, and `fish/predators-and-motion.js`.

### 3A. Cache normalized social profiles

`getFishSocialProfile` accounts for about 0.89–0.93 seconds inclusive in the latest six-second profiles. It repeatedly normalizes category, mode, host lists, affinity groups, minimum group sizes, and social size classes.

Extract a pure profile builder, retain it as the parity reference, and add metadata-only reuse keyed by the resolved species and fish overrides. First inventory every output dependency, including nested profile/configuration values, legacy comfort needs, and catalog defaults. Preserve the current distinction between `||` and `??` fallbacks. Detect in-place host/affinity array changes as well as object replacement; avoid JSON serialization or fresh dependency-array allocation on every hit.

Audit consumers before returning a shared object. Cached arrays must not become writable shared state. If a caller requires a mutable result, copy at that boundary. Keep dynamic friendship records, health, fear, hunger, positions, and active actions outside this cache.

Verify all catalog species plus custom species, fish overrides, missing/malformed values, empty strings, zero/false/null values, catalog replacement, and in-place edits. Test schooling groups, pairs, host bonds, solitary fish, size compatibility, save/load, replacement fish with the same ID, and tank transfers. Compare every profile field and array with the preserved builder.

### 3B. Find nearby friends without building and sorting arrays

`getFishDisposition` currently filters, maps, filters again, and sorts tankmates to select one nearby friend. Replace that pipeline with a single scan that keeps the best eligible result. Preserve the same distance calculation, the 0.24 cutoff, tank iteration order, first-candidate tie behavior, friendship eligibility, and existing fallback behavior. Do not broaden this change into a different proximity or relationship rule.

Test equal distances, cutoff boundaries, zero/missing coordinates, direct and reverse friendship records, pair/host bonds, hostile relationships, dead fish, and same-timestamp position or relationship changes. Compare selected partner and the complete mood/activity result with the old function. Audit helper side effects before changing evaluation order; preserve RNG consumption.

### 3C. Share only proven-stable inputs

After 3A/3B measurements, pass prepared social/habitat inputs through a narrow synchronous evaluation where their dependencies remain unchanged. Keep the existing social-satisfaction cache and its refresh cadence. Do not cache the entire disposition by fish ID, timestamp, or frame: movement changes proximity and depth/size-dependent comfort, and action controllers can change state mid-update.

Extend the existing scoped viewport snapshot with stable scale inputs only if the new profile still identifies repeated mobile/DPR checks as significant. Refresh after layout/display changes and retain the same DPR. Defer persistent fish-size/dirtiness aggregation until its mutation boundaries are explicit; a whole-frame dirtiness snapshot remains unsafe.

**Promotion gate:** profile and mood parity tests pass; feeding, medicine, panic, relationship edits, and tank edits remain immediate; relevant schooling/behavior/needs tests have no new failures; profile rebuilds decrease after warm-up without retained-resource growth. Run matched browser scenes and re-profile before choosing the next sub-change.

## Batch 4 — precise collisions with less preparation

Primary files: `fish/caves-and-collision.js`, `rendering/collision-and-masks.js`, `decor/hit-testing.js`, and existing placement/depth invalidation paths.

Strict mask overlap costs about 0.63–0.88 seconds inclusive in the current profiles. Timed depth collision costs 6.6–8.5 ms/frame, plus 1.5–1.8 ms in depth escape. Existing depth buckets, opaque-bounds rejection, cave candidate caches, and image masks should be retained and improved.

1. Count descriptor construction, candidate rejection, and sampled points separately. Determine whether repeated preparation, candidate volume, or the inner sampling loop dominates each fixture.
2. Reuse immutable decor mask/descriptor inputs with complete invalidation for same-count edits, placement, depth, scale, flip/rotation, artwork readiness, companion layers, and tank changes. Audit existing cache clearing before adding another cache. Reuse moving-fish preparation only within an identical pose/depth probe.
3. Reduce inner-loop allocation with a query-local scalar/scratch UV path for supported descriptors. Initially preserve the old arithmetic order, bounds, thresholds, and sample positions. Keep the generic path for unsupported descriptors. Combining transforms or changing floating-point arithmetic requires boundary parity evidence.
4. If sampling still dominates, prototype conservative occupied-region rejection. Reject only points/regions proven unable to contain a hit. Keep the original strict sampling origin and grid: tightening bounds must not shift the samples. Retain exact narrow-phase answers and candidate order.

Use differential tests for rotations, flips, fractional positions/scales, near-zero turn scales, threshold edges, transparent borders, thin leaves, companion layers, puffer size, sucker pivots, caves, corpses, and depth sweeps. Add fixed-step cave entry/exit, dragging, avoidance, and escape traces. Compare collision answers, selected blockers, paths, final state, and RNG counts.

**Promotion gate:** exact answer/path parity and no new cave/depth/turn/drag failures; no clipping or disappearing fish in browser fixtures; reduced preparation/sample work and repeatable motion-time improvement. Roll back a faster path if it changes decisions. A coarser collision grid is outside this plan.

## Batch 5 — tank switches and memory

Primary files: `decor/customization.js`, `assets/image-storage-and-import.js`, `assets/sprite-sheets.js`, resource/cache owners in rendering, and UI/save call sites identified by measurement.

First measure `setActiveTank` from click through the first visible completed destination frame. Separate loading-cover wait, decode/preload, state activation, full UI, save, derived preparation, drawing, release, and reveal. The existing benchmark measures transition completion; add visible-completion timing before evaluating the full user-facing goal.

Inventory original images, masks, derived/recolored/depth canvases, body-shape caches, GPU textures/buffers, pending promises, and aliases. Attribute retained bytes and rebuilds to their owners. Investigate the higher short-run crowded heap with identical replayed states and heap retainers before calling it a leak or a harmless difference. Reuse and release logic already exists and must remain correct.

Optimize the measured bottleneck: reuse equivalent immutable derivatives, avoid unchanged UI work, or prepare a bounded destination working set. Guard asynchronous preparation with the existing generation/token checks. Keep the destination complete before reveal and preserve save durability. If a worker becomes justified, start with pure image/mask preparation and verify cancellation, transfer costs, and stale-result rejection.

Do not globally enlarge caches or evict the active working set repeatedly. Use ownership accounting to enforce the provisional memory budgets in the laptop plan. Distinguish game-owned estimates from total browser/driver memory.

**Promotion gate:** at least thirty controlled warm revisits, reporting median/p95 and visible completion; a thirty-minute session with equivalent-state retained-resource comparisons; no missing images, stale output, blank destination frames, or eviction/rebuild loops; save/reload and custom-art checks pass. The one-second p95 target remains a goal until measured.

## Batch 6 — preserve detail while batching fish drawing

Primary files: `rendering/fish-and-effects.js`, `rendering/fish-turn-v26.js`, `rendering/tank-and-water.js`, and associated lighting/mask composition.

The current scene submits 1,373–1,459 swim slices/frame. Start with one ordinary fish's existing strip geometry in a test-only shared GPU path, then consecutive compatible fish draws. Preserve source rectangles, overlap, deformation, texture filtering, recolors, alpha/blending, highlights, and painter order. Split batches at cave, plant, lighting, and incompatible texture/state boundaries. The prototype must not introduce a second movement or turn controller.

Measure command submission, synchronization/readback, GPU execution where available, and presented-frame behavior separately. Preserve the current renderer as fallback, including unavailable/lost GPU context. Expand to turns/caves only after the simple prototype passes. If the measured bottleneck has moved elsewhere, rescope before building a broad renderer rewrite.

Capture controlled reference frames at the same pose, animation phase, turn progress, depth, lighting, and viewport. Cover all eight swim presets, side/edge/front/back turn phases, fins, shadows, caustic silhouettes, caves, recolors, custom art, puffer/sucker cases, and context recovery. Define numerical comparison tolerances before evaluating the prototype and inspect compositing edges visually; do not relax thresholds to hide visible differences. Audit legacy test extractors against the canonical manifest so inactive duplicate fragments do not create false confidence.

**Promotion gate:** visual/geometry and turn-lifecycle checks pass, fallback/context recovery works, and measured submission/presentation improves on the actual Radeon 780M within memory budgets. Keep this prototype out of the default renderer until that hardware gate is met.

## Measurement and delivery after each batch

For the affected scenes, run at least three matched before and three after samples on the same machine, alternating versions with identical fixtures, warm-up, and instrumentation. Compare work/gap p50/p95/p99, relevant component time, long tasks, cache builds, allocation/GC, and retained resources. If improvement cannot be separated from run variance, collect more evidence rather than declaring a percentage gain. Check unaffected ordinary/interaction scenes for regressions.

Run targeted parity tests for each change, rebuild with `npm.cmd run build:app`, and complete the relevant integration checks. At each completed batch, run all repository stages separately so an early known failure does not hide later checks; compare failing test names and examine changed failure details. Keep existing unrelated failures visible. Use the existing Chrome UI/save/switch smoke tests and add the batch-specific scenarios.

Deliver each batch with a code checkpoint, reviewable source and generated outputs, test results, raw before/after artifacts, a concise measurements report, and a fresh prioritized profile. Use the measured outcome to choose the next batch.

Final acceptance requires headed tests on the reference laptop: ordinary and crowded fixtures at 1280 × 800, 1920 × 1080 and actual native scaling; plugged-in/battery behavior; interactions; 1/5/15 populated tanks; sustained session/resource checks; startup, save, and visible switch timing. Desktop throttling cannot certify that result.
