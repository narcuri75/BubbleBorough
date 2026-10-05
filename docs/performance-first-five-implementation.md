# First five performance improvements

Implemented October 3, 2026, in the requested order from least compromising upward. The game bundle was rebuilt from its source fragments.

| Change | Explain like I'm five | What changed |
| --- | --- | --- |
| Correct profiler | Count the pictures the game actually makes. | Rendered FPS uses the interval between processed frames, separately from browser callbacks. Physics keeps its existing timestep. The overlay adds p95 work time and geometry reuse counts. Intentional frame caps and pauses do not count as missed frame deadlines. |
| Compress downloads and cache safely | Pack the same toys in a smaller box, and check whether the box changed. | Production Node delivery supports Brotli/gzip, encoding negotiation, HEAD and conditional GET. Static files use content ETags and mandatory revalidation. HTML and development responses keep `no-store`. File reads and compressed representations share a bounded 64 MiB/128-entry server cache. |
| Sort decorations once | Put the toys in order once, then use that order. | Each tank render prepares one sorted decoration list and five layer buckets. All twenty decoration passes share them. Both cave-back passes remain in their original positions. Exact depth/y values invalidate the order cache, including very small edits. |
| Fast fish lookups | Use a name tag instead of searching every fish. | School leaders, rival targets, zombie targets, social depth targets and floating food use indexed IDs. The fish map checks list identity, length and stored positions; replacements repair the index. School followers have a reverse index, with live expiry/death checks and invalidation when relationships change. |
| Reuse drawing calculations | Remember the parts of a fish picture that have not changed. | Matching image passes share swim slice coordinates. Stable source rectangles are reused across frames, including ordinary healthy fish. Float64 buffers preserve the original numbers and are reused across frames. Different bounds, sizes, qualities, poses or phases get separate calculations. New frames invalidate deformation results even when simulation time is unchanged. Weak fish ownership and eight variants per fish bound retained storage. |

The Node server prepares compressed representations asynchronously on first use, rather than adding generated compressed asset copies. Warm requests reuse them. These delivery changes apply when running with `NODE_ENV=production`; GitHub Pages and external proxies retain their own delivery policies. Existing date-like version query strings are deliberately revalidated because they are not content hashes.

## Measurements

These are transfer bytes and executed operation counts, not browser FPS claims.

| Fixture | Before | After |
| --- | --- | --- |
| Game script, production Brotli quality 5 | 5,114,258 raw bytes | 913,906 transferred bytes; 82.1% smaller |
| Stylesheet, production Brotli quality 5 | 834,595 raw bytes | 133,145 transferred bytes; 84.0% smaller |
| 100 decorations, twenty passes, warmed sorting cache: depth reads | 2,760 | 100 |
| Same decoration fixture: layer span checks | 2,000 | 100 |
| 100 leader queries in a 100-fish list, including index construction: fish visits | 10,000 | 200 |
| Three matching 44-slice fish passes: sine calls | 135 | 47 |
| Same fish fixture: drawing calls | 132 | 132 |

The swim renderer's drawing coordinates match a pre-change golden digest across 96 cases: all eight presets, four sizes, base/highlight/borough quality, cropped/full artwork and crowded density. Cave occlusion and slice counts retain their existing behavior.

A Node CPU microbenchmark also checked the ordinary healthy-fish case: 2,000 frames, one 44-slice body pass plus one 16-slice highlight, fixed sprite size and a no-op canvas. Across four alternating before/after runs, median drawing-function time fell from 200.94 ms to 152.19 ms, about 24%. This isolates JavaScript calculations; it excludes browser canvas/GPU work, image uploads and the rest of the game. Fish whose dimensions change continuously may reuse less source-layout work.

## Validation

- `npm run check:performance`: all 11 tests pass. They exercise profiler caps/pauses, exact decoration ordering, mutable fish/food lists, follower changes, drawing parity, compression round trips, HEAD, ETags, changed file bytes, development behavior and production routes.
- Bundle generation/freshness, website routing, asset references, mobile, notifications, architecture and JavaScript syntax checks pass.
- Every test file was run directly: 1,050 tests, 977 passed, 61 failed, 12 skipped. A read-only overlay of the saved original files reported the same 61 failing test names before these changes. No new failing names remain. Existing source-hash guards were retained.
- `npm test` stops at the existing deployment check: 1,151 migrated assets are untracked, with zero missing files. The working Git staging area was preserved. The standalone cave-opacity command passes and reports zero eligible images checked.

Local before/after snapshots, complete logs and operation-count fixtures are under `.review-artifacts/performance-first-five/`. No live browser/GPU trace was captured, so an actual FPS improvement remains to be measured on target hardware.
