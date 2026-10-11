# Performance review — October 9, 2026

The slowdown is reproducible on this machine. Dev diagnostics make it substantially worse, but fish simulation and drawing also exceed the frame budget after those diagnostics are disabled.

## Test conditions

Ran the current game in Chrome 155 on Windows, using the NVIDIA RTX 4070 SUPER through ANGLE/D3D11. Viewport 1280 × 800, DPR 1, no CPU throttling. Used the game's localhost `?playtest=1` mode in a fresh, isolated headless browser, completed the first-tank setup, and dismissed the first-visit hardware notice. The existing account and saves were not accessed. Remote requests were blocked, so these are local engine measurements, not hosted network or cloud-service measurements.

Collected the game's frame-profiler sections/counters, Chrome Performance metrics, long tasks, event timings, a CPU sampling profile, a browser timeline trace, screenshots, and collected heaps during tank switching. Diagnostic hooks were appended only to the test browser's served response. Game source and settings were not changed.

Idle gameplay already targets **30 FPS**, which allows **33.3 ms per rendered frame**. The store targets 24 FPS. The table's FPS counts processed game frames, not browser callbacks or physically presented monitor frames. Timed interaction windows include opening their controls. Samples are short and sequential; they are not a benchmark across devices or representative player saves.

## Gameplay results

| Scenario | Rendered FPS | Average frame work | p95 frame work |
| --- | ---: | ---: | ---: |
| Eight fish, early swimming after population | 7.0 | 53.7 ms | 213.7 ms |
| Eight fish, turn test | 9.0 | 36.8 ms | 108.6 ms |
| Eight fish, warmed scene with three decorations | 24.5 | 34.9 ms | 42.2 ms |
| Feeding eight fish | 23.0 | 35.9 ms | 41.6 ms |
| Editing eight fish | 20.9 | 38.1 ms | 51.1 ms |
| Borough Overview | 30.6 | 5.0 ms | 7.3 ms |
| Fish store over the live tank | 19.7 | 37.7 ms | 44.4 ms |
| Twenty fish and three decorations | 6.4 | 129.0 ms | 154.0 ms |
| Same twenty-fish scene, behavior labels/log updates disabled | 9.1 | 90.4 ms | 120.4 ms |
| Labels/log updates and fish highlights disabled | 9.5 | 89.4 ms | 112.9 ms |
| Thirty individually recolored guppies, labels/log updates disabled | 4.0 | 162.0 ms | 236.0 ms |

The early swimming and turn windows include first-use work. Adding decor did not cause the later speedup: caches and rendering resources were warmer by then. The 30-guppy result combines population, species behavior, recoloring, and first-use costs; it does not isolate recoloring. That window also contains a long interval across scene preparation.

Disabling the behavior broadcast drawing and synchronization reduced average twenty-fish frame work by **30%**, with fish-motion cost staying close to 64–66 ms. This isolates a useful dev-mode improvement while showing that diagnostics are only part of the problem. The additional highlight experiment saved about 1 ms on average, too little and too variable to justify prioritizing that appearance change.

## Review by category

The per-frame figures below use the warmed twenty-fish scene with behavior broadcasts disabled unless stated otherwise. Parent and child profiler sections overlap; their times must not be added together.

| Category | Observed result | Simple improvement |
| --- | --- | --- |
| Dev diagnostics | Behavior broadcasts added about 39 ms/frame in the sequential comparison. `measureText` alone consumed about 432 ms of sampled CPU time in the eight-fish turn profile. | Make per-fish labels/logging independently opt-in. Refresh their text a few times per second, cache fitted strings, and replace character-at-a-time truncation with a bounded search. |
| Fish movement and behavior | 64.4 ms/frame with broadcasts off. The eight-fish profile includes repeated mood, comfort, needs, social-status, and asset queries through several callers. | Compute shared fish/tank facts once per simulation step and reuse them for movement, mood bubbles, animation, and UI. Invalidate when relevant state changes. Keep movement and behavior semantics intact. |
| Action scheduler | About 0.01 ms/frame in the warmed eight-fish fixture; not the main measured cost. | Focus on the expensive fact queries around actions before changing action scheduling. |
| Depth collision and escape | Depth collision 10.5 ms/frame; escape 4.9 ms/frame. Around 117 depth queries and 323 candidates/frame. These are included in movement cost. | Reuse unchanged obstacle geometry and query results where valid; narrow candidate sets before detailed collision checks. |
| Cave collision | About 1.1 ms/frame, with roughly 5.5 strict checks/frame. | Preserve existing broad-phase filtering and optimize only the remaining repeated checks. |
| Fish preparation | About 0.64 ms/frame warm. | Keep the existing frame cache; target expensive misses rather than replacing this inexpensive warm path. |
| Fish drawing and swimming | About 20.6 ms/frame; roughly 1,253 swim-slice draws, including highlights. | Prototype batching fish strips into fewer GPU submissions and validate appearance/order. First reuse calculations and remove redundant preparation; a full renderer replacement needs separate evidence. |
| Turns and image processing | The turn trace contains seven GPU pixel readbacks totaling 272 ms, with one taking 114 ms. Depth-image treatment and turn-shape preprocessing appear in the CPU profile. | Prepare the active scene's masks, depth variants, and turn data before their visible use, in bounded jobs. Consider a worker or precomputed asset data for pixel processing. |
| GPU, raster, and compositing | GPU-process command/raster events occupied substantial time during the turn trace. Their nested durations overlap and are not a GPU-utilization percentage. | Reduce draw submissions and CPU↔GPU readbacks; measure GPU and main-thread improvements separately. |
| Decorations and sway | About 0.94 ms/frame for three decorations; 96 sway slices/frame. | Existing optimizations are useful. Reassess with a heavily decorated player tank before spending more effort here. |
| Ground and surface shadows | Ground 0.85 ms/frame; surface 0.06 ms/frame. Shadow geometry/raster reuse was active. | Keep caches and invalidation reliable; these are lower priority in this fixture. |
| Floor | About 0.46 ms/frame. | Consider static composition caching only if a larger substrate scene shows a meaningful cost. |
| Background and backdrop | Each below 0.01 ms/frame in these scenes. | Low priority for steady FPS. Large background artwork can still matter for loading and memory. |
| Caustics | About 0.22 ms/frame. | Low priority in these scenes. |
| Grime | Warm front/rear draw sections near zero in the clean test tank, but the grime asset alone was 6.39 MiB of resource payload. | Defer unnecessary grime loading or provide an appropriate delivery asset. A dirty-tank draw cost was not established. |
| Canvas clear and shadow receivers | Clear about 0.03 ms/frame; receiver preparation near zero. | Low priority. |
| Stage view and editor geometry | Eight-fish editor stage-view work averaged 0.74 ms/frame. Editing increased style/layout work, but it remained far below scripting. | Update geometry on relevant size/position changes and avoid unchanged UI writes. |
| Browser layout and paint | In the turn trace: layout 7.6 ms total, style-tree update 24.2 ms, main-thread paint 14.9 ms. Canvas raster/GPU work is separate. | UI cleanup can help editing, but reducing fish work has a much larger demonstrated opportunity. |
| UI and input response | Sampled event durations reached 232 ms feeding, 392 ms editing, and 288 ms opening Overview. The store expanded the DOM to about 5,755 elements. | Split heavy opening work into bounded tasks; build visible shop content first. Consider a captured tank backdrop under menus that cover the tank. These event samples are not a field INP score. |
| Overview and hidden/covered scenes | Overview averages 5 ms/frame; the live tank keeps drawing behind sign-in and the store. | Reuse Overview's lighter approach: avoid redrawing a scene that is fully covered, with correct simulation/turn resumption behavior. |
| Tick simulation | Twenty-fish tick p95 was 171 ms with broadcasts, 136 ms without. | Reuse the same shared needs/social/environment calculations across the periodic tick and other consumers. |
| Saving | Twenty-fish save p95 around 8–9 ms. Small saves were cheaper. | Lower priority than simulation. Measure genuinely large saves before changing storage architecture. |
| Memory and garbage collection | Repeated tank visits returned to similar collected heaps. Turn textures and shapes were released on the simpler tank. The turn trace's largest major GC was 8.1 ms. | Retain current cleanup. Reduce temporary allocations after the large CPU costs; run a longer session before claiming memory leaks are solved. |
| Loading and delivery | Engine ready in about 3.3 seconds locally, before onboarding. 171 resource entries contained about 40 MiB of uncompressed resource-body bytes. | Load the active tank and immediately usable tools first; defer optional catalogs/artwork and reduce oversized asset delivery. |
| JavaScript and CSS startup | Bundle 5.07 MiB raw; CSS 0.86 MiB raw. Locally computed Brotli sizes about 0.92 and 0.13 MiB. The profiling interception serves an uncompressed instrumented bundle. | Preserve existing production compression. Conservatively minify and later split optional features to reduce parsing and startup work. These do not establish a steady-FPS gain. |

## Memory and tank changes

A separate corrected fixture switched six times between a twenty-fish tank and a two-fish tank. Completion took **0.8–2.7 seconds**. Collected JS heaps were about **27–29 MiB** in the simpler tank and **46–48 MiB** in the twenty-fish tank, without monotonic growth. After later visits to the simpler tank, tracked body textures and body shapes returned to zero. The successful fixture produced no runtime errors or failed local HTTP responses.

Unique cached source-image dimensions represented roughly **67–85 MiB** of RGBA pixels during those visits. This is an estimate, not measured process/GPU RAM, and excludes several derived surfaces and browser/driver overhead. Improve tank changes by preparing the destination's expensive data and retaining a bounded useful working set, without introducing repeated eviction/recreation.

## Suggested order

1. **Cheap first win:** make dev fish broadcasts optional and cache/throttle their text.
2. **Largest remaining CPU opportunity:** reuse needs, mood, comfort, social, and tank facts across consumers, with correct invalidation.
3. **Remove visible stalls:** prepare active artwork's masks/depth/turn data outside visible frame work.
4. **Improve crowded rendering:** prototype batched fish strips, then compare CPU, GPU, and visual output.
5. **Improve startup and menus:** defer large optional assets, build visible store content first, and avoid drawing fully covered tanks.

Target p95 work below 33.3 ms for the current 30 FPS idle target. A future 60 FPS target requires below 16.7 ms plus room for browser rendering. Compare matched scenes and preserve feeding, cave traversal, turns, ordering, and save behavior.

## Evidence and limits

Reproduction: `node .review-artifacts/performance-20261009/audit.cjs` and `node .review-artifacts/performance-20261009/audit.cjs --followup`. Results, raw frame samples, screenshots, `turning.cpuprofile`, and a DevTools-importable `turning-trace.json` are in that ignored directory. The primary run's switching portion used an invalid sample-species record; those failed switching samples were discarded. Memory/switch/color figures above use the successful corrected follow-up. Earlier attempts that still had onboarding overlays open were also excluded.

This review covers the exercised renderer and browser categories. Hosted latency/cache behavior, authenticated/cloud calls, desktop mode, actual mobile GPU performance, dirty tanks, machinery-heavy tanks, large custom-art saves, and hours-long sessions remain unmeasured. Diagnostics add measurement overhead. No game fixes or visual changes were applied.

Browser-method references: [Chrome runtime profiling](https://developer.chrome.com/docs/devtools/performance), [MDN canvas optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas), and [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
