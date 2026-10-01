# Cave portal occlusion and turn safety, Phase 4

Phase 4 makes a portal crossing visually match the continuous movement introduced in Phase 3.

## Progressive foreground occlusion

Portal fish are still drawn in the cave sandwich under the cave front artwork. A second body-only pass runs immediately after the cave front, clipped to the exterior half-plane of the active portal. As the fish physically crosses the mouth, less of its body remains on the exterior side of that plane, so the foreground shell covers the fish progressively instead of the entire sprite popping behind the cave at `portal-enter`. The same rule runs in reverse for `portal-exit`.

The clip plane is derived from the authored mouth and the real crossing axis. A two-pixel overlap hides antialias seams. Effects, shadows, status icons, debug labels, and selected-fish cards are not duplicated by the exterior overlay pass.

## Turn safety

Cave-mouth and near-cave reversals use the internal `portal-tight` v26 style. It keeps the 3D turn centered on the authoritative fish position and removes the large screen-space translation used by cinematic open-water turns.

A crossing cannot begin while a horizontal turn is active. If the fish reaches the legal portal position facing the wrong horizontal direction, it holds position and completes a compact clearance turn first. Once `portal-enter` or `portal-exit` owns the fish, target jitter cannot start another reversal until the body has cleared the portal.

## Guarantees

- the outside portion of a crossing fish remains visually in front of the cave front shell
- the inside portion remains behind the cave front shell
- portal occlusion changes continuously as the body crosses the mouth
- portal travel never begins mid-turn
- cave-adjacent v26 turns do not use wide translated U-turn trajectories
- the portal crossing direction is latched against target jitter until the crossing completes
- normal open-water turn styles are unchanged away from cave geometry
