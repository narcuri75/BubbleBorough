# Cave movement Phase 1 audit

Phase 1 is diagnostic only. It does not intentionally change cave traversal behavior. The goal is to expose where movement ownership, targets, collision, and depth change so the later phases can replace the hard transitions without guessing.

## Current movement ownership

The main fish motion loop gives cave behavior explicit movement ownership while `fish.caveState` is active. Cave behavior chooses targets, then the shared locomotion integrator still performs translation. This means the newer momentum system is already used for cave travel, but cave code can still make abrupt target, direction, layer, and sublayer changes before that integrator runs.

Movement ownership priority around caves is currently: panic or special overrides, breeding, queued gravel behavior, cave behavior, queued fish actions, debug behavior, disease avoidance, then normal roaming. A debug overlay now records which owner actually won each frame while a cave state is active.

## State machine

Normal cave traversal currently uses these states:

`approach -> align -> enter -> inside -> exit -> leave`

A legacy `depart` branch also remains supported. Debug cave testing has extra inside phases for roaming and seat testing.

## Hard transition hotspots

### `align -> enter`

This is the most important discontinuity. Once the fish is accepted at the portal, cave code immediately changes the fish from the front cave layer and front sublayer to the cave interior layer and middle sublayer. This happens before the fish has physically traversed the full opening. The fish then starts following interior path nodes.

This is the strongest code-level explanation for the visual depth pop seen in the recording.

### `exit -> leave` and `depart -> leave`

The reverse transition also switches the fish directly from the interior depth slot to the front cave layer and front sublayer as soon as the portal test passes. The fish then targets the exterior approach point.

### Cave collision recovery

`recoverFishInsideCave()` explicitly zeros both motion velocity components before replanning. Repeated recovery can therefore interrupt momentum and make movement feel mechanical even though normal cave translation uses the shared locomotion integrator.

### Safe interior retargeting

`retargetFishToSafeCaveInteriorPoint()` may change the cave state, force the cave back layer, replace the target, and force horizontal facing. This is a recovery path and is another place where several visual properties can change at once.

### Seat facing

On arrival at a seat, cave behavior may call `setFishDirection()` directly to apply the configured seat facing. The turn renderer still handles the visual turn, but the request can arrive immediately after a path completes. This should be reviewed when later phases blend seating into continuous locomotion.

### Target ownership

Cave waypoints are written directly into `targetXNorm` and `targetYNorm`. Entry, exit, roaming, and seat paths all use the same target fields as normal locomotion. The shared locomotion controller smooths translation, but it cannot prevent a large target relocation from changing steering intent abruptly.

## Rendering and collision ownership

Cave rendering is a three-part sandwich inside each major tank layer: cave background, interior fish, cave foreground. Fish in `enter`, `inside`, `exit`, or `depart` are treated as cave-interior fish for render ordering. This binary classification means rendering currently changes as a state decision rather than as a continuous portal-crossing percentage.

Collision uses the derived cave interior mask, shell mask, trigger regions, and fish shape descriptor. Portal admission checks require the fish body to fit the opening before depth switching, but once the switch is authorized the depth change itself is still discrete.

## Phase 1 instrumentation added

The Debug Menu now contains **Cave Movement Overlay**. When enabled, it draws:

- cave interior descriptor bounds
- cave shell descriptor bounds
- portal trigger regions
- seat regions
- approach, mouth, and inside anchors
- entry, exit, normal interior, and debug path nodes
- the fish current target and velocity vector
- the current fish collision descriptor bounds
- cave state
- actual movement owner
- major layer and sublayer
- current and desired depth Z
- current path node index
- warnings for large position jumps, large target jumps, depth-slot switches, velocity resets, and facing changes
- a short rolling transition log in the top-left corner

The overlay clears its audit history each time it is toggled so every test run starts clean. It is disabled by default and only renders in debug mode.

## Phase 1 conclusion

The cave system is not a separate translation engine anymore. The shared locomotion integrator is already doing much of the actual motion. The main mismatch is that cave state still owns several discrete decisions that the newer locomotion system cannot smooth by itself, especially layer and sublayer switches at the portal, recovery velocity resets, direct waypoint replacement, and seat-facing requests.

Phase 2 can now be built against these observed transition points instead of changing general swimming blindly.
