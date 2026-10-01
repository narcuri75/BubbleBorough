# Cave swimmability JSON contract

Every `cave_layered` decor entry in `assets/decor/decor_types.json` now has an explicit boolean `swimmable` field.

```json
{
  "file": "terracotta-pot__cave__theme-artificial__front.png",
  "behavior": "cave_layered",
  "swimmable": false
}
```

## `swimmable: false`

The fish may use the cave entrance and may occupy its assigned seat, but the cave controller must not start interior roam paths, move the fish between alternate seats, or run the debug roam sequence. The fish holds its assigned seat for the normal cave linger period and then exits through the cave route.

## `swimmable: true`

Existing cave behavior is preserved. After entry, fish may use the bounded cave-interior roaming system and available seats. Interior collision/mask constraints still apply.

## Authored seat-only caves

The following built-in cave decorations are explicitly `swimmable: false` because they are hide/seat spaces rather than believable roaming interiors:

- Ceramic Tube Cluster
- Slate Stack
- Seashell Cluster
- Extra Narrow Pleco Tubes
- Clay Multi

All other built-in `cave_layered` decorations are currently authored as `swimmable: true`.

## Backward compatibility

If the field is missing, the runtime resolves it as `true`. This preserves old saves, custom cave assets, and older metadata. The loader also accepts `caveBehavior.swimmable` as a compatibility form, but the canonical authored field for decor JSON is the top-level `swimmable` boolean.

`caveSettings` continues to describe entrance and seat geometry. It does not need to exist just to set swimmability, so adding this toggle does not accidentally replace image-derived cave entry/seat data with generated defaults.
