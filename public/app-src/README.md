# Bubble Borough application source

`public/app.js` is generated. Edit the organized source fragments in this directory and run `npm run build:app`.

The fragments intentionally assemble into one JavaScript module scope. This preserves shared state, runtime caches, function hoisting, mobile patch compatibility, and initialization order while avoiding circular ES-module dependencies during the first modularization pass.

`module-manifest.json` records bundle order and module dependencies. `function-inventory.json` records every top-level function, its original line, assigned module, source hash, and calls to other game functions. Run `npm run check:app` to verify the generated bundle.
