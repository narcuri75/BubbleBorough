# Cave portal crossing, Phase 3

Phase 3 replaces the hard cave depth handoff at the mouth with explicit `portal-enter` and `portal-exit` travel states.

## Entry

`approach -> align -> portal-enter -> enter -> inside`

The fish remains at its real X/Y position. Portal entry targets the first valid interior route node and never writes a replacement position. Its current velocity and heading are left untouched. During the crossing, normalized depth Z is derived from physical progress along the crossing segment, from the fish current front depth to the cave interior depth. Legacy layer fields mirror that continuous Z only for compatibility.

## Exit

`inside -> exit -> portal-exit -> leave`

After the interior exit route reaches its last node, `portal-exit` carries the fish through the mouth and out to the exterior approach point. Depth moves continuously from the current interior Z to the cave front Z across the same physical travel. The fish does not jump to the front layer at the mouth.

## Progress

`cavePortalProgress` reports 0 to 1. Entry uses the real start-to-interior crossing segment. Exit supports a two-segment path through the mouth and then to the exterior approach point. Debug Cave Movement Overlay shows the percentage while a crossing is active.

## Guarantees

- no writes to `xNorm` or `yNorm` during a portal transition
- no velocity zeroing when starting or finishing a portal transition
- no forced facing change when starting a portal transition
- no immediate front/interior layer switch at `align -> enter` or `exit -> leave`
- stalled crossings keep steering toward their physical target rather than teleporting
- both swimmable and seat-only caves use the same portal crossing path

Foreground masking and turn-volume collision are deliberately left for Phase 4.
