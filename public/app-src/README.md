# Bubble Borough application source

`public/app.js` is generated. Edit the organized source fragments in this directory and run `npm run build:app`.

The fragments intentionally assemble into one JavaScript module scope. This preserves shared state, runtime caches, function hoisting, mobile patch compatibility, and initialization order while avoiding circular ES-module dependencies during the first modularization pass.

`module-manifest.json` records bundle order and module dependencies. `function-inventory.json` records every top-level function, its original line, assigned module, source hash, and calls to other game functions. Run `npm run check:app` to verify the generated bundle.

Sprite sheets use the paired WebP and version 2 editor JSON files in `assets/`.
Keep both: JSON supplies grid order, dimensions and offsets, while WebP supplies
the pixels. `npm run build:app` validates each pair and regenerates
`assets/sprite-sheet-definitions.js` with only frame coordinates; embedded source
PNGs in the editor JSON are never downloaded by the game. Unsupported layouts
or mismatched image dimensions stop the build instead of silently miscropping.

The build also generates delivery WebPs under `assets/generated/sprites/`:
384-pixel previews for all frames and lossless full-resolution images for decor.
Commit these generated files with the sources. Install build dependencies with
`npm ci`; Sharp performs conversion during the build, never in the browser.
The delivery manifest checks content hashes and skips unchanged sheets.
Increment the delivery preset version in `scripts/generate-sprite-sheets.cjs`
when changing output settings. `npm run check:app` rejects stale delivery files.

Catalog and save paths remain stable logical asset names. The shared image
loader resolves decor to individual full-resolution WebPs and other sheet-backed
names to cached canvas crops. Unmapped paths still load as loose images.
Atlas images are temporary: concurrent crops share a decode, then release the
source image. Later variants can decode the atlas again without replacing
existing crops. Failed or timed-out decodes cannot leave late atlas cache entries.
Startup loads only the selected appearances and poses of resident fish across
all tanks, plus placed decor. Inventory decor loads its artwork and companion
layers when selected for placement; fish purchases load the chosen poses.
DOM images use prebuilt previews,
with lazy loading in the shop, without decoding sheets or encoding PNG data URLs.
UI templates should use
`assetImageAttributes(path)` and direct DOM updates should use
`setAssetImageSource(image, path)`. Static HTML and scripts outside the app module
can use `data-sprite-src`; the image observer also accepts loose/custom URLs.
After adding sheets or individual assets, run `npm run generate:manifest`, then
`npm run build:app` and `npm test`. Manifest generation includes named frames and
excludes whole sheets from the store catalog.

`assets/sprite-sheet-aliases.json` maps retired filenames to renamed sheet frames
for catalog and saved-game compatibility. Otocinclus uses matching `_bottom` and
`_side` frames for each selected appearance when cleaning glass or swimming.
