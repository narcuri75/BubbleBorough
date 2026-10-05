# Runtime performance and memory improvements

Reviewed and implemented October 4, 2026. Changes are in the canonical source fragments under `game/public/app-src`; `game/public/app.js` and its inventories were rebuilt.

The October 5 gameplay review and subsequent fixes are documented in `performance-gameplay-review.md`, including the disappearing-fish reproduction, current recolor-cache limits, turn-buffer reuse, and remaining stalls.

## Changes

- Disposing artwork now retires its CPU turn shapes, WebGL textures and buffers, depth variants, highlight canvases, and shadow canvases. Sprite/tint cache eviction uses the same cleanup. Shared aliases and separate live images using the same URL preserve shared turn resources.
- Tank cleanup retains active recolors instead of clearing the shared tint cache. Recolors for discarded paths are released along with their source artwork. The 48 MiB tint pixel budget remains in place; the gameplay follow-up raises the small-entry limit to 128.
- Fin discovery retires unused cropped fins at tank transitions. Current candidates and the fin selected by an ongoing turn remain protected, including their source atlas. Pending loads retain their existing completion behavior.
- Released sprite crops clear their synthetic `naturalWidth`/`naturalHeight` along with their canvas dimensions. Returning to an evicted crop therefore triggers a reload.
- Alpha masks retain the independent RGBA buffer returned by `getImageData`, eliminating a second full-image allocation and copy. RGB placement markers remain available. Mask and turn preprocessing canvases release their backing stores in `finally`; fin preprocessing also stops retaining intermediate fields that have no consumers. Body distance fields remain available for visual anchors.
- Shadow support queries visit only potentially relevant rows, with conservative boundary padding and the original pixel-center comparisons, flips, alpha threshold, and tie order. Receiver registration uses a per-frame index while preserving array order and replacement behavior.
- Caustic marks reuse the stage's inverse matrix while still reading and composing each live local transform. Exact stage-scale/offset changes invalidate it.
- Stage layout reads the visual rectangle only when a logical dimension is missing. The existing fallback and Ratio Lock semantics are preserved. Reduced-motion queries reuse one live media-query object.
- The redundant glass clear was removed; the full physical glass clear still occurs before drawing overlays.

Active artwork stays cached. These changes introduce no new quality limits, frame caps, simulation cadence changes, or renderer replacement.

## Measurements

| Executed fixture | Before | After |
| --- | --- | --- |
| Browser: retire 40 unique artwork canvases after creating their turn resources | 40 retained shapes, buffer pairs, and textures | 0 retained shapes, buffer pairs, or textures |
| Five shadow queries against a 1,024-row support mask | 5,120 visited rows | 60 visited rows |
| 10,000 warmed narrow shadow queries, median of six alternating CPU runs | 59.42 ms | 46.75 ms, about 21% faster |
| 100 caustic marks with an unchanged stage transform | 100 base inversions | 1 base inversion; all 100 local transforms remain live |
| 100 stage-size calls with valid logical dimensions | 100 visual rectangle measurements | 0 visual rectangle measurements |
| Seeded 20-fish browser fixture, median render work | 110.3 ms | 106.9 ms |
| Same browser fixture, p95 render work | 240.1 ms | 229.4 ms |

A 2,048 × 2,048 RGBA mask no longer allocates the redundant 16 MiB pixel copy. This describes allocation savings for that image size, not a measurement of total browser RAM.

Browser checks used fresh headless Chrome contexts, a 1280 × 800 viewport at DPR 1, and an NVIDIA RTX 4070 SUPER through ANGLE/D3D11. A seeded 20-fish scene was warmed for 30 renders and measured for 150 renders with background simulation suspended. External network requests were blocked and no existing player save was used. The fixture also checked actual Canvas RGBA snapshot independence and caustic transform composition.

Overall render timings remain variable; they do not establish an FPS gain across player saves or devices. A CPU sampling trace identified the existing screen-blended fish highlight draws as the dominant remaining rendering cost. Changes to that rendering path need separate measured and visual validation. Total process/GPU RAM and long-session memory on the player's normal device were not measured.

Reproduction scripts, original-source snapshots, CPU trace, browser results, and complete regression logs are in the ignored `.review-artifacts/performance-runtime/` directory. The browser harness uses the local bundled Playwright package and installed Chrome.

## Validation

- `npm run check:performance`: 22 tests pass, including 5,000 seeded support-query parity cases, alias preservation, active fin/recolor protection, repeated resource retirement, crop eviction, RGBA preservation, and transform invalidation.
- Existing sprite and turn-renderer regression files: 95 tests pass.
- Bundle freshness, asset references, mobile compatibility, notification ownership, action architecture, and generated JavaScript syntax checks pass.
- Full suite: 1,061 tests, 988 passed, 61 failed, 12 skipped. The pre-change suite had the same 61 failing test names; no new failing names remain. Existing unrelated failures were preserved. One old assertion requiring the redundant RGBA copy was replaced by an executed RGB/alpha preservation check.
