# Third performance batch: social profiles and nearby friends

October 9–10, 2026. Implemented batch 3A/3B and evaluated the conditional input-sharing work in 3C. Batches 4–6 remain deferred at the user's request. **The crowded scenes still miss the performance target, and the Ryzen 7 PRO 250 / Radeon 780M reference laptop has not been tested.**

## Backup and scope

The original full-game backup remains `backups/pre-performance-20261009/BubbleBorough-full.tar` (1,850,292,736 bytes), SHA-256 `12A0A3D1BFDFE9011477C7761B53B66976D4531228E3B56E9C991B5E384ECE87`.

Before this batch, a new code checkpoint preserved canonical fragments, generated runtime, HTML, tank-frame code, scripts, documentation, and package files: `backups/pre-performance-20261009/pre-batch3-code.tar` (15,625,216 bytes), SHA-256 `75FEC3FE457A414394458ED9235BB004C8B8F8EC5B968F499AB010AC0DE6F126`. Artwork/dependencies are in the original full archive. Existing unrelated workspace changes were retained.

The preserved pre-batch bundle is `.review-artifacts/performance-20261009/batch3/before-app.js`, SHA-256 `967d909516afb4910006a7db5833cf37f8eac15ac3d2a07d6b7fefaa3fdb4cb6`. The rebuilt implementation is SHA-256 `e0cc1007f66abdae292989d4f22e726f9aa59d014cdde14695ff0a890ed9a569`.

This batch changes canonical `tank/catalog-and-equipment.js` and `fish/meals-and-needs.js`, with generated output rebuilt. No artwork, drawing detail, DPR/resolution, effects, fish counts, frame cap, simulation cadence, collision rules, or saved schema was reduced or changed.

## Implemented

**3A — normalized social-profile reuse.** The original normalization now lives in `buildFishSocialProfile`. A WeakMap reuses its immutable result for the same fish/species while checking all mutable catalog and override inputs. Checks include nested/default configuration, custom social affinity, legacy schooling needs, and in-place host/affinity array edits. Cache hits do not allocate fresh dependency arrays. Object/function-valued inputs are normalized again rather than assumed unchanged by identity. Cached output arrays are frozen; audited consumers read or spread these results. Replacing a fish with the same ID receives an independent entry. Cache metadata stays outside saved fish records and does not retain removed fish through a strong key map.

**3B — single-pass nearest eligible friend.** Disposition scans tankmates once instead of allocating intermediate filter/map arrays and sorting candidates. It retains the original coordinate fallbacks, `Math.hypot`, 0.24 cutoff, eligibility checks, tank order, and first-candidate distance ties. Eligibility still runs for every qualifying candidate, even when an earlier candidate is closer. Audited helpers do not consume RNG or mutate relationship state along this path.

**3C — evaluated, no additional input sharing promoted.** Re-profiling still finds many profile getter calls, but the satisfaction cache already returns early on its usual hit path. Passing another object between disposition and biological status would add allocation while saving only a small portion of these lookups; the dominant repetition is deeper in pairwise host/friend eligibility. That broader sharing needs its own dependency boundaries. Mobile/DPR checks remain visible but are a small part of this profile, and extending viewport behavior is unnecessary for these two changes. The existing social-satisfaction cache, refresh cadence, and layout snapshots remain as before. Complete moods, proximity, comfort, actions, and friendship records are not cached by frame or timestamp.

## Correctness and running-game checks

`node --test scripts/performance-runtime.test.cjs scripts/performance-social.test.cjs` passes **57/57**. Eight new social tests compare the complete profile and disposition results with frozen pre-batch functions. They cover the full source catalog; IDs/species/fish inputs; custom and malformed values; all mutable dependency fields and arrays; replacement fish; tank transfers and save reloads; ties and cutoff boundaries; reverse friendship/pair/host rules; and same-timestamp edits. A 160-step fixed-time sequence varies schooling, host bonds, partner positions, actions, hunger, panic, calm/medicine state, illness, comfort, and dirtiness. Results match and these evaluations consume zero RNG calls in both versions. These are calculation comparisons, not a claim of full trajectory parity across arbitrary gameplay.

The browser harness adds a twenty-fish friendship fixture after the original scenes. It uses current gameplay helpers and catalog data. Opt-in verification compares 177 loaded catalog profiles, twenty current fish moods, and four live-edit/restoration cases against the preserved functions, after timed scenes and CPU profiling. Save/readback, six tank switches per run, diagnostic toggles, and resizing are checked separately. The viewport resize fixture retains a logical 1280 × 800 stage; separate unit tests cover logical-dimension changes.

All repository check stages were run separately so known early failures did not hide later checks. The failing test-name set and error type/operator signatures match the fresh baseline exactly: **43 broad gameplay failures and two existing performance failures**. The performance stage now passes 69/71; the broad stage passes 874/929 with twelve skipped (one unrelated tank-frame test was added during the work and passes). The existing profiler fixture lacks `document.hasFocus`; the existing swim-coordinate golden also fails before and after. No golden or failure was suppressed. Website, bundle freshness, syntax, mobile, notifications, and architecture checks pass. Asset checking still reports six references to two missing website screenshots. The subsequent deployment check was run separately and passes all 1,171 assets; cave-opacity checking completes with zero eligible files. `git diff --check` passes.

## Measurement method

Fresh preserved-bundle and updated-bundle runs use Chrome 155, headless, desktop RTX 4070 SUPER, 1280 × 800, DPR 1, no CPU throttling, an isolated local save, seeded initial randomness, eight seconds per scene after warm-up, and identical getter/timing instrumentation. Remote requests are blocked. These are processed game-render rates, not compositor/presented FPS. Real-time simulation continues, so different render rates produce different poses and collision workloads; the seed alone does not prove identical trajectories.

The fresh baseline includes unrelated workspace changes and one additional social-getter wrapper compared with the earlier report. Compare this batch with its own preserved bundle, not directly with the previous batch's numbers. Desktop timing varied considerably, so all run ranges and the alternating comparisons must be considered; an early faster sample is not a guaranteed percentage gain.

## Measurements

Four preserved-bundle runs and three updated-bundle runs. Run order: before-1, before-2, initial-after, before-3, after-2, before-4, after-3. The last six runs alternate versions. A separate one-second-per-scene run verifies the corrected browser comparison helper; its timings are excluded from this table.

| Scene | Before mean work, range | After mean work, range | Before processed FPS | After processed FPS |
| --- | ---: | ---: | ---: | ---: |
| 8 fish, 3 decorations | 13.6–18.8 ms | 12.4–18.7 ms | 29.7–30.0 | 29.6–30.0 |
| 20 fish, same decorations | 44.3–67.5 ms | 42.0–48.8 ms | 13.3–20.2 | 18.1–21.1 |
| 20 fish, diagnostics on | 44.9–57.5 ms | 38.5–43.8 ms | 15.4–20.0 | 19.5–21.3 |
| 20 fish, turning | 41.1–49.0 ms | 37.8–45.1 ms | 15.9–19.1 | 16.4–18.6 |
| 20 fish, feeding | 42.4–53.0 ms | 39.4–45.3 ms | 15.7–20.2 | 18.0–19.9 |
| 20 fish, editing | 42.8–61.9 ms | 37.0–49.1 ms | 12.4–17.5 | 15.4–19.0 |
| 20 fish, store open | 38.9–55.8 ms | 34.6–42.3 ms | 13.3–19.4 | 17.4–20.2 |
| 20 fish, friendship fixture | 46.0–71.1 ms | 38.6–50.3 ms | 12.4–19.4 | 17.8–22.7 |

Across these runs, median mean work in the ordinary twenty-fish scene changes from 56.2 to 42.8 ms/frame; median processed FPS changes from 16.0 to 20.1. Its frame-work p95 ranges from 67.1–93.5 ms before and 53.9–75.4 ms after. The friendship fixture's median mean work changes from 52.9 to 39.1 ms, with p95 58.0–96.2 ms before and 50.3–61.5 ms after. These observed medians support retaining the change; overlapping ranges and different evolving scenes prevent treating the ratio as an isolated or guaranteed improvement.

Tail latency is not uniformly better. Ordinary twenty-fish frame-work p99 is 98.2–124.9 ms before and 103.3–125.9 ms after; long-task p95 is 85–110 ms before and 93–128 ms after. The first updated editing scene also contains a 286 ms outlier. All raw samples remain available. This batch does not solve periodic stalls or meet the 30 FPS / 20 ms p95 work targets.

After warm-up, all measured updated scenes record zero social-profile rebuilds, despite roughly 2,691–2,906 getter calls/frame in the ordinary crowded scene and 5,152–5,485 in the friendship fixture. The old getter rebuilds on every call; it has no build counter, so absent old counters must not be read as zero builds. The change reduces normalization/allocation beneath the getter, not getter invocation count. The single scan separately removes its intermediate arrays and sort; no isolated percentage is assigned to that change.

In the corrected verifier's fixed-input experiment, 10,000 direct profile calls take 26.2–30.0 ms before and 12.7–20.5 ms after, with equal checksums in all four alternating rounds. This isolates the profile getter on twenty fixed fish; it does not establish a whole-game percentage gain. Ordinary crowded scenes still draw 1,337–1,465 swim slices/frame after, versus 1,236–1,382 before as poses evolve. Detail was not cut to obtain the timings.

All seven timed runs have zero page exceptions and zero failed local HTTP responses, and pass save/readback with twenty active fish and seven numeric needs fields. Updated UI checks pass diagnostic toggles and layout snapshot cleanup after resizing. Ordinary/social screenshots were inspected; this does not certify every artwork, species, cave, or turn combination.

Warm simple-tank visits take 0.44–0.67 seconds after (0.45–0.73 before); crowded visits take 2.41–2.66 seconds after (2.37–2.87 before). Crowded switches still miss the goal. Collected heap after switches is 47.9–49.6 MiB for the simple tank and 82.2–89.4 MiB for the crowded tank, versus 49.0–50.3 and 83.8–90.8 MiB before. Image counts stay at 98 and 121–122 respectively. Short visits show no obvious new retained-resource growth, but do not establish long-session retention or a memory improvement. GPU/process memory and allocation/GC profiles were not collected.

## Re-evaluation

Six-second post-switch CPU profiles still place substantial work in drawing, precise collision checks, disposition consumers, and dirtiness. Inclusive times overlap and are not additive budgets. Duplicate wrapper/function names are counted once per sampled stack in the summary.

| Function | Latest preserved profile | Three updated profiles |
| --- | ---: | ---: |
| Social-profile getter, inclusive | 1,256 ms | 716–751 ms |
| Disposition, inclusive | 2,092 ms | 1,799–1,923 ms |
| Fish drawing, inclusive | 1,755 ms | 1,776–2,080 ms |
| Strict mask overlap, inclusive | 824 ms | 602–978 ms |
| Dirtiness, inclusive | 474 ms | 482–559 ms |
| Mobile-layout checks, self | 151 ms | 146–191 ms |
| Render-DPR checks, self | 61 ms | 95–101 ms |

The preserved profile spans 6.21 seconds and updated profiles 6.26–6.29 seconds. They contain different numbers of processed frames and evolving poses, so these totals show where work remains rather than per-frame speedup. The profile builder is absent from the warmed updated samples. Dependency validation still costs CPU; unsafe stale-state reuse would trade correctness for speed. No collision, renderer, switch, or memory-policy change was implemented.

## Evidence and reproduction

Raw JSON, screenshots, CPU profiles, complete check logs, failure-name/signature comparisons, bundle checkpoint, and summary are in `.review-artifacts/performance-20261009/batch3/`. `verification/results.json` with `socialParity.verifierVersion: 2` is the authoritative browser parity result. Earlier after-2/after-3 parity helpers shadowed the current functions with oracle names; discard those parity fields. That helper error does not affect timed scenes, CPU profiles, the independent unit suite, or the direct getter timing experiment. The corrected helper passes current functions as explicit parameters.

Run `node scripts/benchmark-laptop.cjs --social-fixture --verify-ui --verify-social --profile --output .review-artifacts/laptop-benchmark`. Use `--bundle <preserved-app.js>` for a reference run and identical timing options on both sides. `PLAYWRIGHT_MODULE` can point to a separate Playwright installation. The additional fixed-input getter experiment runs after profiling, alternating four 10,000-call rounds with equal checksums; it excludes the getter wrapper on both sides and is not a whole-game FPS result.

Acceptance still requires the actual Ryzen 7 PRO 250 / Radeon 780M laptop, native scaling/resolution, larger fixtures, interactions, and sustained sessions. Further implementation is deferred as requested.
