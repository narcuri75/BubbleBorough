# Second laptop performance implementation batch

October 9, 2026. Implemented the next four CPU improvements, ran matched Chrome benchmarks, and checked gameplay regressions. **The crowded scene is faster but still misses the performance target. The Ryzen 7 PRO 250 / Radeon 780M laptop has not been tested.**

## Backup and scope

The original full-game backup remains at `backups/pre-performance-20261009/BubbleBorough-full.tar`; its checksum and restore details are in the [first implementation report](performance-implementation-2026-10-09.md). Before this batch, the current source, generated runtime, scripts, HTML, and documentation were also archived into `backups/pre-performance-20261009/pre-batch2-code.tar` (15,499,776 bytes). SHA-256: `730A27C1F556FF7AEC989F8C31C39B2A8D4A6DE81B520D9BF9D1A39E45687494`. This second archive is a code checkpoint; the original archive contains the artwork and dependencies.

Changes are in the canonical `game/public/app-src` fragments, with `app.js` and inventories rebuilt. No artwork, render detail, resolution, fish limit, normal frame cap, animation geometry, collision rule, or simulation interval was reduced.

## Implemented

1. **Share stage dimensions during motion and simulation.** `withTankStageLayoutSnapshot` reads logical stage dimensions once per synchronous evaluation. Nested evaluations reuse that result, and `finally` releases it even on errors. Motion releases its snapshot before `updateStageRenderView`; rendering retains its separate existing snapshot. UI work after a simulation tick reads fresh dimensions.
2. **Share dirtiness within a single calculation.** Disposition and derived needs pass already-computed dirtiness to comfort when they refer to the same tank. Results are refreshed on the next call, including calls with the same timestamp. There is no whole-frame dirtiness cache: displayed fish size/depth can change during movement and affects dirtiness. Invalid cleaning timestamps and offscreen-tank behavior retain their prior handling.
3. **Cache resolved artwork.** WeakMaps cache normalized catalogs and each fish's resolved path. Reuse checks the fish's saved appearance, variant, ID/name seed, species identity/ID, fallback, source-array identity, and array contents. In-place insertion, reordering, replacement, and custom catalog edits are observed. These caches store metadata and paths, without duplicating decoded images or textures.
4. **Remove redundant needs normalization.** A normal hunger update now performs at most two full normalizations instead of eight. The second is retained when hunger changes because crossing the hunger threshold changes comfort. Candy boosts, expired boosts, starvation damage/death/events, legacy saves, peaceful mode, and the seven persisted needs fields retain their behavior.

Six added tests compare artwork and needs outputs with frozen pre-batch algorithms, test immediate mutations, and verify snapshot nesting, exception cleanup, and the actual animation-loop ordering. The benchmark now records the relevant getter counts and renderer counters; optional UI verification also checks live resizing.

## Matched measurements

One fresh run of the preserved first-batch bundle and two runs of this implementation. Chrome 155, headless, desktop RTX 4070 SUPER, 1280 × 800, DPR 1, no CPU throttling. Each scene uses an isolated local playtest save, validated fish/decor fixtures, seeded initial randomness, and eight seconds of sampling after warm-up. Remote requests are blocked.

Both versions use the same timing/getter instrumentation. The second optimized run adds a resize smoke test after all timed scenes and profiling. FPS counts processed game renders, not presented/compositor frames. Simulation evolves in real time; different rates can produce different positions and collision workloads. The ranges show repeat variance, not statistical confidence intervals.

| Scene | Before average work | After, two runs | Before processed FPS | After, two runs |
| --- | ---: | ---: | ---: | ---: |
| 8 fish, 3 decorations | 23.2 ms | 16.6–17.4 ms | 29.8 | 30.0 |
| 20 fish, same decorations | 68.9 ms | 47.9–52.1 ms | 12.8 | 17.2–18.5 |
| 20 fish, diagnostics enabled | 64.2 ms | 45.8–47.9 ms | 13.7 | 18.4–19.1 |
| 20 fish, turning | 62.7 ms | 44.0–44.9 ms | 13.7 | 17.7–18.2 |
| 20 fish, feeding | 62.9 ms | 45.9–47.3 ms | 13.4 | 17.9–18.4 |
| 20 fish, editing | 66.2 ms | 47.7–48.2 ms | 12.2 | 16.0–17.0 |
| 20 fish, store open | 62.6 ms | 44.6–45.1 ms | 12.7 | 17.1–17.2 |

The ordinary twenty-fish scene uses **24–30% less average frame work in this batch**. Its frame-work p95 improves from 91.9 ms to 59.2–62.8 ms. The eight-fish scene keeps its existing 30 FPS cap; its frame-work p95 is 20.0–24.2 ms. Crowded scenes still exceed both the 33.3 ms frame interval and the proposed 20 ms p95 work budget. Interaction modes remain uncapped and do not reach the 60 FPS goal.

In the twenty-fish scene, full needs normalization falls from 14.0 to 3.2–3.5 calls per processed frame. Base dirtiness evaluations fall from 179.6 to 91.3–92.6. Steady scenes record no artwork-resolution misses after warm-up, despite hundreds of artwork getter calls/frame. Stage getter calls remain numerous; the change removes repeated DOM measurements beneath those getters. No claim is made that getter invocations themselves disappeared.

## Browser and regression checks

Both optimized runs complete swimming, turns, feeding clicks, editing, store opening/closing, six tank switches, diagnostic-control verification, and save/readback with twenty active fish and seven numeric needs fields. Both have zero page exceptions and zero failed local HTTP responses. Ordinary and diagnostic screenshots were inspected. This is not exhaustive visual parity across every species, cave, custom asset, and turn.

The second run also resizes to 1024 × 768 and back to 1280 × 800, checking that measured stage dimensions match the live DOM and that both motion and render snapshots have been released. This fixture keeps a logical 1280 × 800 stage at both viewport sizes; unit tests separately verify actual logical-dimension changes.

Warm simple-tank visits complete in 0.48–0.68 seconds; crowded-tank visits take 2.48–2.74 seconds, compared with 2.70–2.76 seconds before this batch. Six switches per run are too few to establish p95 compliance, and crowded switches still miss the goal. Collected JS heap is approximately 47.6–49.9 MiB in the simple tank and 84.4–89.4 MiB in the crowded tank. The crowded baseline was lower, 76.9–79.7 MiB. Different evolving poses/derived-resource working sets and short runs prevent attributing this difference to a leak or to the new metadata caches; **no memory improvement is claimed**. A sustained ownership/retention measurement remains necessary. GPU/process memory was not measured.

The targeted runtime suite passes **49/49**. All stages of the repository test command were run, including a rerun with localhost access for server tests. The failing test-name set exactly matches the prior implementation: 43 gameplay failures out of 925 tests (870 pass, 12 skipped), plus the two existing performance failures (`document.hasFocus` absent from a profiler fixture and the swim-coordinate golden mismatch). The performance stage now passes 59 of 61 tests. Website tests, bundle generation, syntax, mobile, notification, and architecture checks pass. Asset-reference checking still reports the existing six references to two missing website screenshots. Its subsequent deployment-assets check was run separately and passes all 1,171 deployed assets; the cave-opacity command also completes (zero eligible files). These existing failures were not suppressed. `git diff --check` passes.

## Re-evaluation and next solutions

The latest CPU profiles and renderer counters identify several remaining opportunities. CPU inclusive times overlap; they are not additive budgets. The priorities below preserve the quality contract in the [laptop plan](laptop-performance-plan.md).

Two fresh profiles cover about 6.2 seconds each, after the switching/UI checks:

| Remaining cost | Sampled CPU time across the two profiles |
| --- | ---: |
| Social-profile normalization | 530–545 ms self; 892–929 ms inclusive |
| Strict mask overlap | 596–839 ms self; 625–879 ms inclusive |
| Tank rendering | 2.13–2.42 seconds inclusive |
| Fish drawing within tank rendering | 1.69–1.84 seconds inclusive |
| Dirtiness | 529–571 ms inclusive |
| Periodic tick | 387–406 ms inclusive |

In the timed twenty-fish scene, motion averages 25.4–29.7 ms/frame and fish drawing 16.8 ms/frame. Depth collision alone averages 6.6–8.5 ms, with another 1.5–1.8 ms in depth escape; those are portions of motion, not extra independent totals. Bucket queries return roughly 369–419 candidates/frame. The renderer submits 1,373–1,459 swim slices/frame. These measurements support further CPU and submission work; they do not establish GPU execution time.

1. **Normalize social profiles once when their inputs change.** `getFishSocialProfile` repeatedly resolves categories, modes, groups, size classes, and host lists. Cache its static inputs with mutation checks for fish overrides, custom species, and catalog changes. Keep hunger, fear, proximity, friendship state, and current actions live. Compare full profile outputs and schooling/host/friendship behavior before accepting the cache. This is the next relatively contained CPU change.
2. **Share the static part of mood calculations.** Twenty fish still trigger roughly sixty disposition evaluations per processed frame, through movement, depth preferences, bubbles, and animation selection. Pass prepared social/habitat inputs within a well-defined evaluation, rather than repeatedly rebuilding them. Do not freeze the complete mood across movement: proximity, actions, and comfort can change during that movement. Test immediate feeding, tank edits, panic, medicine, and partner changes.
3. **Accelerate precise mask collisions.** Reuse obstacle descriptors and transformed bounds; tighten conservative candidate rejection before pixel sampling. Consider precomputed occupied-mask regions and allocation-free coordinate transforms. Preserve the existing alpha threshold, sample locations, ordering, cave/depth decisions, and narrow-phase answers. Do not gain speed by making the sample grid coarser. Seeded path/collision parity and cave tests are required.
4. **Reuse fish-size contributions at explicit update boundaries.** Dirtiness still traverses fish-size calculations around ninety times/frame. Prepare each unchanged fish's contribution and rebuild the tank aggregate when size/depth, growth, puffer state, membership, death, equipment, or viewport inputs change. A whole-frame cache would be unsafe with the current update order. Start with a narrow synchronous reuse scope and prove identical dirtiness before introducing persistent revision tracking.
5. **Batch fish rendering while keeping the same detail.** The twenty-fish scene still submits about 1,400 swim slices/frame. Prototype a shared GPU path for consecutive compatible draws using the existing strips, textures, deformation, highlights, and painter order. Cave/plant/lighting boundaries must split batches. Keep a fallback and require image comparisons, context-loss recovery, measured GPU/presentation timing, and a win on the 780M. This is a larger rendering project, with more visual-regression risk than the preceding CPU work.
6. **Prepare stable viewport inputs alongside dimensions.** Mobile-layout checks and device-pixel-ratio resolution remain visible in the profile. Resolve stable scale inputs once per synchronous phase, refreshing after resize/display-scaling changes. Keep the current DPR and rendered dimensions. Test editor/camera transitions and moving the browser between displays.
7. **Profile tank-switch phases before changing cache policy.** Warm crowded-tank visits still exceed the one-second target. Separate image decode, derived image/mask preparation, state activation, full UI work, save, first draw, and the loading veil. Then prewarm only the bounded destination working set or reuse equivalent immutable derivatives. Increasing every cache would hide work by consuming more memory; measure ownership and limits first.
8. **Measure sustained and larger-Borough behavior.** Add 1/5/15-tank fixtures, a thirty-minute session, native-resolution/DPR tests, and presented-frame/input timing on the actual laptop. Startup transfer/readiness, custom artwork preparation, and GPU/process memory still need dedicated measurements. These results determine whether worker preparation or broader renderer changes are justified.

Recommended next batch: social-profile normalization and scoped mood inputs, followed by collision preparation. Re-profile after each; the present improvement does not justify reducing fish counts, artwork, or effects.

## Evidence and reproduction

Run `node scripts/benchmark-laptop.cjs --output .review-artifacts/laptop-benchmark --verify-ui --profile` with Chrome and Playwright available. Use `--bundle <saved-app.js>` for a preserved reference. `PLAYWRIGHT_MODULE` can point to a separate Playwright installation. Ordinary and cloud saves are not used.

Raw measurements, screenshots, CPU profiles, check logs, preserved bundle, and summary are in `.review-artifacts/performance-20261009/batch2/`. Backup and review artifacts are ignored by Git; this report, the benchmark, tests, and frozen parity fixture are reviewable project files.
