# Gameplay performance and disappearing fish

Reviewed October 5, 2026. The canonical fragments and generated application bundle include these fixes.

## Gameplay exercised

The local game ran in an isolated Chrome session at 1280 × 800 with the normal animation and simulation loops active. Test residents and inventory stayed in that browser session; account authentication and cloud persistence were excluded.

The review exercised swimming and reversals; feeding through the care tray; fish editing and thumbnails; the fish shop; the Borough overview; placement of an Amazon sword, terracotta cave and treasure chest; and six completed switches between tanks. Residents included guppies, neon tetras, goldfish, bettas, zebra danios, otocinclus, pufferfish and cherry shrimp. Additional isolated fixtures covered 30 and 70 individually colored guppies and unavailable WebGL.

The exercised flows produced no browser runtime errors or missing prepared fish artwork after the fixes. Fish hidden by the foreground of a cave or plant were ordinary painter-order occlusion. Thumbnail images decoded successfully after their asynchronous loads.

## Reproduced defects and fixes

### Disappearing fish under recolor-cache pressure

`prepareFishRenderRecord` previously held tinted canvases while preparing the entire population. Later recolors could evict those same canvases from the shared cache. Eviction reset their width and height to zero. Drawing an earlier fish then threw `InvalidStateError`, aborting the remainder of the tank frame.

Thirty distinct guppy colors reproduced this consistently: six prepared canvases were empty and every attempted frame failed. The first reproduction spent 342–344 ms repeatedly generating recolors before failing.

Preparation now retains source artwork. Each sprite layer resolves its tint immediately before drawing, including layered shrimp and sucker view transitions. Symptom overlays retain their original colors. The shared cache refreshes recently used entries and accommodates up to 128 small variants under its existing 48 MiB pixel budget, so the old 24-entry limit no longer forces a moderately populated tank to regenerate all colors every frame. A single newly generated canvas that exceeds a cache budget remains drawable until replaced, rather than being destroyed before its caller can use it.

### A turn that never completes without WebGL

The flat emergency sprite was drawn when the volume renderer was unavailable, but it never acknowledged the terminal frame. The simulation therefore waited indefinitely and kept the original display direction. A paired browser reproduction confirmed that the old code left the turn active after its duration; the fixed code completes it and adopts the destination direction.

The emergency sprite now preserves the source facing during the turn, draws the destination facing at completion, contributes its visible silhouette to the lighting mask, and acknowledges that final frame. Normal animation timing and mesh geometry are unchanged.

### Reallocated turn drawing buffers

The shared WebGL canvas resized to every fish's source dimensions, repeatedly reallocating color and depth buffers when different species turned together. It now reuses an existing surface when the requested viewport fits. A request that does not fit replaces the surface with that request's exact dimensions. There is no additional surface pool and no allocation combining the maximum width and height of different fish.

Only the active viewport is cleared and painted. Canvas2D draws crop that viewport using the correct conversion from WebGL's bottom origin. The caustic mask uses the same crop. Render resolution, shader equations, mesh density, pass quality and motion remain unchanged.

### Retained GPU textures and repeated layout reads

Changing depth settings replaced the treated-image WeakMap but left its uploaded body textures in the WebGL texture map. Invalidation now deletes those textures, preserving shaders, mesh buffers and fins. A regression fixture repeated this 100 times without texture-cache growth.

Geometry helpers now share one logical stage-size measurement during each synchronous tank render. `finally` restores live measurement outside that draw, including after an exception. This removes repeated layout reads without caching dimensions across frames or UI events.

## Measurements and verification

| Executed comparison | Before | After |
| --- | --- | --- |
| Paired 30-color scene, four warm attempts | 328–375 ms, every frame aborted, six empty canvases | 48–56 ms, every frame completed, zero empty canvases |
| Four-species turn draw including mask and readback, alternating warm runs | Median 7.5–7.9 ms | Median 5.8–5.9 ms, about 24% faster |
| 28 turn images and 28 matching lighting masks at sampled progress values | Reference pixels | Identical RGBA pixels |
| Unavailable WebGL at turn completion | Turn remains active, original facing | Final frame acknowledged, turn completes |
| Six tank switches without decor, collected JavaScript heap | — | About 29–35 MB, similar sizes on repeated visits |
| Six switches with three large decorations in one tank | — | About 30–31 MB in the simpler tank and 60–63 MB in the decorated tank; repeated visits did not grow monotonically |

The 30-color cache held 22.5 MiB of pixels after the fix versus 18 MiB under the old entry cap. This uses more of the existing budget to avoid repeated generation; it is not a claim that every individual cache uses less memory. JavaScript heap measurements exclude decoded browser images, canvas backing stores and driver memory.

The focused performance suite passed all 28 tests. The turn-renderer parity and runtime suites passed all 97 tests. The complete direct test run had 994 passes, 12 skips and the same 61 pre-existing failures; there were no new failures. The generated application passed `check:app`.

Browser fixtures, profiling results and screenshots are retained in the ignored `.review-artifacts/performance-gameplay` directory. They inject diagnostic hooks into served responses only; no profiling instrumentation was added to production rendering.

## Remaining limits

- First use of WebGL and newly decoded or recolored artwork still causes stalls. A first turn took about 400 ms in the live review. Rendering all 30 new recolors for the first time took about 900 ms in the final paired fixture. The old first frame aborted before drawing the complete scene, so its shorter time is not a successful rendering baseline.
- Seventy unique guppy recolors exceed the 48 MiB cache budget. The fixed scene stays visible and respects that normal cache budget, but it still spends about 1.8 seconds regenerating and drawing each frame. Fixing this while preserving both exact artwork and the memory budget needs a separate rendering/cache design; simply increasing the byte budget was not adopted.
- Mixed live gameplay still included long frames during asset loads, turns and tank changes. The faster isolated fixtures do not establish a universal FPS gain or eliminate every stutter.
- A software-canvas recoloring experiment was rejected: it changed pixel hashes and gave no reliable improvement to warm rendering. No frame-rate caps, reduced animation detail or extra production telemetry were introduced.
