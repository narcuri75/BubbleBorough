# First laptop performance implementation batch

October 9, 2026. Implemented part of phases 0–2 from the [laptop plan](laptop-performance-plan.md), tested the running game in Chrome, and measured the remaining bottlenecks. The reference Ryzen 7 PRO 250 / Radeon 780M laptop has not been tested; its acceptance target remains outstanding.

Follow-up: the [second batch report](performance-second-batch-2026-10-09.md) records the next implementation, current timings, and revised priorities. The measurements below describe the first batch.

## Backup

A full pre-change project archive is stored at `backups/pre-performance-20261009/BubbleBorough-full.tar` (1,850,292,736 bytes). It includes game source, generated runtime, artwork, dependencies, Git history, and ignored/local review files. Only the backup directory is excluded to avoid recursive archives. This is a project backup; it does not export an external browser profile or cloud saves.

SHA-256: `12A0A3D1BFDFE9011477C7761B53B66976D4531228E3B56E9C991B5E384ECE87`.

The archive listing contains 4,188 entries. Source, assets, scripts, and documentation were restored into an isolated baseline directory and used for before/after regression checks. Restore into a separate empty directory before replacing an existing checkout. The archive and checksum instructions are in the ignored backup directory.

## Changes

- Fish Labels and Record Log are separate, opt-in controls in the developer menu. Access to developer tools no longer requires building/drawing every fish's behavior diagnostics. Controls default off each session.
- Enabled diagnostic snapshots refresh at most every 250 ms, shared between labels and recording. Label positions and depth bars still follow the fish every rendered frame. Replacement fish, tank changes, and time rollback invalidate snapshots; removed fish are pruned.
- Diagnostic text uses the actual drawing context/font, binary-search truncation, and a bounded 256-entry layout cache. Labels retain the five-line format. Diagnostics may miss intermediate transitions shorter than their sampling interval; gameplay timing is unchanged.
- Normalized hunger and retired-meter reads skip unrelated habitat normalization. Malformed/legacy needs, live habitat reads, peaceful mode, and candy boosts retain full normalization. Full needs updates still occur at their existing boundaries; the seven-field persisted shape remains unchanged.
- Comfort, disposition, and needs normalization reuse tank facts/statuses within the individual synchronous calculation. There is no cross-frame tank-fact cache or new invalidation protocol. Existing active/offscreen tank resolution is preserved.
- Added an opt-in maintained Chrome benchmark, `scripts/benchmark-laptop.cjs`, and six substantive performance/parity tests. Rebuilt `game/public/app.js` and its generated inventories from canonical fragments.

Fish counts, normal frame caps, render resolution, artwork, highlights, shadows, caustics, deformation, turning geometry, and collision rules were not reduced or changed to obtain these gains. The gameplay rendering functions and asset files remain unchanged; rendering-file edits concern debug labels only.

## Matched Chrome measurements

One completed pre-change run against a preserved bundle and two completed optimized runs. Chrome 155, headless, 1280 × 800, DPR 1, no CPU throttling, RTX 4070 SUPER desktop, isolated local playtest save, remote requests blocked. Identical benchmark code, seeded initial randomness, validated catalog fixtures, and five-second warm-ups. Each scene samples eight seconds, plus any interaction setup within that measurement.

The benchmark enables the existing frame profiler and identical getter-call instrumentation in both variants. FPS counts processed game renders; it is not a compositor/presentation measurement. Simulations evolve in real time, so different frame rates can lead to different positions/collision workloads despite identical initial seeds. These are local comparisons, not proof of laptop performance or exact trajectory equivalence.

| Scene | Before average frame work | After, two runs | Before processed FPS | After, two runs |
| --- | ---: | ---: | ---: | ---: |
| 8 fish, 3 decorations; diagnostics off | 26.4 ms | 18.6–26.0 ms | 29.5 | 29.8–30.1 |
| 20 fish, same decorations; diagnostics off | 92.5 ms | 66.7–68.1 ms | 9.0 | 12.8–13.1 |
| 20 fish, labels and recording enabled | 117.8 ms | 63.3–66.0 ms | 7.1 | 13.1–13.7 |
| 20 fish, turning | 88.9 ms | 61.2–64.9 ms | 9.3 | 13.2–13.7 |
| 20 fish, feeding | 90.5 ms | 59.9–64.9 ms | 8.9 | 13.0–14.0 |
| 20 fish, editing | 106.5 ms | 67.0–72.8 ms | 7.3 | 11.4–12.0 |
| 20 fish, store open | 98.5 ms | 63.2–65.6 ms | 7.7 | 12.1–12.4 |

The 20-fish diagnostics-off scene uses **26–28% less average frame work**. Its frame-work p95 falls from 127.7 ms to 80.7–93.2 ms. Enabled diagnostics use 44–46% less average work overall; that result combines both the CPU changes and cheaper diagnostics, rather than isolating either change. The small scene varies substantially between runs, so its CPU gain should not be treated as a stable percentage.

In the 20-fish scene, tank-fact builds fall from 706.6 to 97.6–99.0 per processed frame (about 86% fewer). Full needs normalization falls from 103.6 to 14.0–15.3 calls/frame. These counts include periodic simulation work occurring during sampling.

## Lifecycle, memory, and UI checks

Each run performs six validated tank switches between a twenty-fish decorated tank and a two-fish alternate. All switches complete. After-change visits to the simple tank take 0.49–0.74 seconds; decorated tank revisits take 2.70–3.10 seconds. Before-change ranges are 0.82–1.09 seconds and 3.22–4.01 seconds respectively. Three visits per destination per run are too few to claim p95 compliance; the larger tank still misses the one-second goal.

Collected heap after optimized simple-tank visits is about 47.5–48.9 MiB; decorated visits about 85.1–90.7 MiB. Resource counts return toward the simple-tank working set after switches. This short run does not demonstrate a leak-free thirty-minute session or total GPU-memory compliance. The diagnostic recording cache is bounded; gameplay/resource caches were not enlarged to obtain the improvement.

The browser smoke test verifies diagnostic controls, their accessible pressed states, populated snapshots, both controls defaulting off, and a local save/readback with two tanks, twenty active fish, and all seven numeric needs fields. Swimming, turns, feeding clicks, editing, store opening/closing, and switching execute in the benchmark. Both optimized runs have zero page exceptions and zero failed local HTTP responses. Screenshots of ordinary rendering and the diagnostic controls were visually inspected; this is not an exhaustive pixel comparison across every species/turn/cave case.

Startup transfer size, custom-art preparation, GPU execution time, presented-frame timing, individual click-to-paint latency, Overview, and the larger offscreen Borough fixtures were not re-benchmarked in this batch. No improvements are claimed for them. Unrelated loading and memory architecture remains for later phases.

## Automated checks

The targeted runtime suite passes **43/43 tests**, including six new cases covering normalization parity, immediate hunger/habitat changes, scoped fact reuse, diagnostic defaults and snapshot lifetime, font-correct text fitting, and bounded cache size.

Every stage of the repository's test command was run separately so an early failure would not hide later checks, against both the restored backup and the implementation. Generated bundle, JavaScript syntax, website, mobile, notification, and architecture checks pass. The broad gameplay suite has the same **43 existing failures out of 925 tests** before and after (870 pass, 12 skipped). The performance/delivery stage has the same two existing failures: a profiler fixture without `document.hasFocus`, and an already-mismatched swim-coordinate golden digest. The six added cases pass. The asset-reference check also fails before and after on missing website screenshot references; it reports six references to two missing WebP files. These unrelated failures were not suppressed or rewritten.

The first sandboxed baseline additionally had localhost-access failures; those were rerun with local network access. A preliminary restored-baseline run lacked `.github` and produced one artificial website-test failure; after restoring it, all ten website tests pass. No new failing test cases were found in the matched full checks. The full repository suite remains red because of the existing failures.

`git diff --check` passes. Generated outputs are rebuilt from source.

## Re-evaluation and next priorities

This batch improves performance without a graphics-quality tradeoff, but **does not meet the crowded-scene or reference-laptop acceptance goals**. Twenty-fish frame work still needs a substantial further reduction from roughly 67 ms toward the proposed 20 ms p95 budget; averages and percentiles are distinct targets.

A fresh six-second CPU profile of the optimized twenty-fish tank shows these remaining costs. Inclusive samples overlap and must not be summed:

- Repeated dirtiness calculations: `getTankDirtiness`/`getBaseTankDirtiness` account for roughly 1.17 seconds inclusive. They repeatedly traverse size-dependent dirtiness calculations.
- Size/viewport inputs: `getTankStageLayoutSize` accounts for about 525 ms self time; `getFishAssetPath` about 521 ms; repeated size and social-profile normalization also remain prominent.
- Precise collision checks: `shapesOverlapByMaskStrict` accounts for about 666 ms self time. The steady-scene overlay still reports substantial depth-collision work.
- Rendering: `renderTank` accounts for about 1.79 seconds inclusive, with fish drawing about 1.45 seconds. The captured steady scene still submits around 1,400 swim slices/frame. CPU submission is not equivalent to GPU execution time.
- Periodic simulation remains visible: the profile includes roughly 685 ms in `tick`; one/five/fifteen-tank scaling still needs explicit measurement.

Next, investigate scope-local reuse of dirtiness/size inputs and a coherent viewport snapshot, with immediate updates for growth, edits, resize, tank switching, and equipment changes. Then reduce collision preparation/candidate work while retaining exact rules. Continue with the planned image-preparation work and measured GPU batching prototype. Preserve artwork and simulation cadence throughout; do not interpret the remaining gap as a reason to remove fish or effects.

## Reproduction

With Chrome and Playwright available, run:

```text
node scripts/benchmark-laptop.cjs --output .review-artifacts/laptop-benchmark --verify-ui --profile
```

Use `--headed` for visible Chrome and `--bundle <preserved-app.js>` for a reference bundle. `--duration` accepts sampling milliseconds. The optional Playwright module can be supplied via `PLAYWRIGHT_MODULE`; the script also checks a local installation and the bundled Codex runtime. No ordinary/cloud save is used.

Raw evidence is in `.review-artifacts/performance-20261009/`: `before-implementation`, `after-implementation`, `after-repeat`, `implementation-summary.json`, CPU profile/screenshots, pre-change bundle, and all-before/all-after check logs. Artifacts and full backup are ignored by Git; this report and the maintained benchmark are reviewable project files.
