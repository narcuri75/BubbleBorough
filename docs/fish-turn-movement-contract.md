# Fish Turn / Movement Integration Contract

Game source and asset paths in this document are relative to game/, unless written as public URLs. Project tooling and documentation remain at the repository root.

This document freezes the Bubble Borough fish-facing and turn lifecycle that existed before the v26 pseudo-3D turn renderer integration.

The v26 renderer must be added behind these contracts. It must not become a second movement, targeting, collision, schooling, or interaction system.

## Authoritative gameplay pose

The authoritative gameplay pose remains the existing simulation state:

- `fish.xNorm`
- `fish.yNorm`
- tank layer / sublayer state
- existing collision pose helpers
- existing target coordinates
- existing movement-controller state

Any future v26 X/Y/Z offsets are visual render offsets only. They must not be written back into the gameplay pose.

## Horizontal direction roles

### `fish.direction`

The logical destination horizontal direction. For an accepted reversal this changes to the requested destination when the turn starts.

### `fish.displayDirection`

The stable horizontal direction exposed to gameplay-facing and sprite-facing consumers through `getFishFacingDirection()`.

For a complex reversal, `displayDirection` remains on the source side until the complex turn renderer has drawn its terminal frame and the turn state is handed back to the normal sprite.

### `fish.turnFromDirection`

The latched source direction for an active horizontal reversal.

### `fish.turnToDirection`

The latched destination direction for an active horizontal reversal.

### Renderer-only orientation

Future v26 values such as visual yaw, visual turn Z, near-side selection, mesh deformation, and turn-style trajectory must remain renderer state. They must not redefine `getFishFacingDirection()`.

## Normal reversal gateway

`setFishDirection()` remains the normal in-tank horizontal reversal gateway for free-swimming fish.

Movement owners may change targets. They should not independently implement their own visual horizontal turn.

Current systems using `setFishDirection()` include normal traversal, cave behavior, queued fish actions, breeding alignment, gravel behavior, predator/flee behavior, schooling-related traversal, glass-tap reactions, and other steering systems.

If a horizontal turn is already active, `setFishDirection()` latches the existing `turnToDirection` and does not restart the turn. This protects moving targets and formation corrections from producing rapid counter-turn loops.

## Complex-renderer terminal-frame handshake

A complex turn is not considered complete merely because elapsed time reaches 100 percent.

The renderer must first draw its terminal frame and call `markFishTurnFinalFrameRendered()`.

`updateFishTurnState()` may then commit the destination-facing sprite state and clear the active turn.

This prevents a one-frame flash, missing frame, or snap caused by returning to the flat sprite before the complex renderer actually reaches its final orientation.

## Sucker-fish exception

Attached sucker fish use arbitrary-angle orientation through `setSuckerFishAngle()` and are not ordinary left/right reversal consumers.

A free-swimming Otocinclus is explicitly treated as a normal horizontal swimmer and may use the ordinary reversal contract.

The future v26 renderer must not replace attached sucker-fish glass-crawling orientation.

## Existing lifecycle exceptions to direct facing writes

A small number of systems intentionally write direction or turn fields directly because they are not requesting an ordinary swimming reversal. They are resetting, restoring, spawning, storing, killing, inflating, dragging, or simulating fish outside the active tank movement loop.

The current allowlisted source modules are:

- `decor/placement-and-dragging.js`
  - snail release settling
  - storage/reset handoff
  - return-to-tank initialization
- `decor/customization.js`
  - storage/customization state reset
- `fish/predators-and-motion.js`
  - puffer inflation facing lock
  - death transition reset
  - ordinary movement otherwise uses `setFishDirection()`
- `fish/health.js`
  - lifecycle/death-related turn reset
- `fish/decor-behavior.js`
  - coarse/offscreen simulation writes logical direction only
- `debug/tools.js`
  - explicit debug/reset utilities
- `rendering/fish-motion-and-floor.js`
  - authoritative turn lifecycle itself

These direct-write sites are legacy/lifecycle exceptions, not examples for new movement mechanics. New normal in-tank steering behavior should use `setFishDirection()`.

## Movement-system dependency rule

The movement system is allowed to read the turn contract to decide whether translation must be held, drifted, or released during a reversal.

The renderer is not allowed to write navigation decisions back into movement.

The future integration should therefore expose renderer-neutral turn state to movement rather than making movement depend on a particular renderer implementation.

## Gameplay consumers of logical pose/facing

The following mechanics must remain based on existing gameplay pose/facing rather than v26 projected mesh coordinates:

- feeding and mouth-target solving
- gravel digging and pebble pickup
- cave entry, seating, and exit
- obstacle avoidance
- fish/fish and fish/decor collision
- schooling formation targets and turn commitment
- queued fish actions
- breeding alignment
- predator attack / escape logic
- whale surface behavior
- tank depth / sublayer logic
- tube travel
- dragging
- death/corpse motion

Visual attachments may later receive renderer-only projected anchor points, but their gameplay reach and ownership logic must remain unchanged.

## Phase 1 helper API

Phase 1 establishes these renderer-neutral helpers:

- `normalizeFishHorizontalDirection(value, fallback)`
- `getFishFacingDirection(fish)`
- `getFishLogicalDirection(fish)`
- `getFishHorizontalTurnState(fish, now)`
- `markFishTurnFinalFrameRendered(fish, now)`

`getFishHorizontalTurnState()` is the shared read-only description of the current horizontal turn contract. Later phases should prefer this over re-deriving turn activity/progress in multiple subsystems.

## Phase 1 non-goals

Phase 1 intentionally does not:

- add v26 mesh rendering
- change turn duration
- change simple vs complex turn selection
- change movement release timing
- change schooling behavior
- change feeding/collision/cave math
- change fish position during turns
- remove the legacy complex renderer
- add the optional `fish_fin` layer

Those changes belong to later phases after this contract is protected by regression tests.

## Phase 2 renderer-neutral locomotion policy

Phase 2 removes legacy renderer names from authoritative movement decisions without changing the existing movement behavior.

Movement may read turn state, but it must not ask whether the active visual renderer is the segmented rig, v26, or another implementation.

The shared locomotion helper is:

- `getFishTurnLocomotionState(fish, now)`

It derives locomotion-only values from `getFishHorizontalTurnState()`:

- whether a horizontal turn is active
- whether it is a true left/right reversal
- normalized turn progress
- whether translation is temporarily held
- the existing movement-release blend
- the existing temporary passive speed scale

The current release point remains `0.62`. Phase 2 intentionally preserves this value and its existing smoothstep blend. It is renamed `FISH_TURN_LOCOMOTION_RELEASE_PROGRESS` because it belongs to locomotion, not to a particular turn renderer.

The reversal travel helper is:

- `getFishTurnReversalTraversal(fish, requestedXNorm, requestedYNorm, now)`

This helper preserves the existing authoritative reversal travel behavior:

- source-facing drift that curves continuously through the reversal
- destination-facing launch after the direction switch
- reduced vertical travel during the reversal
- temporary movement scaling based on turn progress and current traversal speed

Its constants are likewise renderer-neutral:

- `FISH_TURN_TRAVERSAL_DIRECTION_SWITCH_PROGRESS`
- `FISH_TURN_TRAVERSAL_DRIFT_MIN_SCALE`
- `FISH_TURN_TRAVERSAL_DRIFT_MAX_SCALE`
- `FISH_TURN_TRAVERSAL_LAUNCH_MIN_SCALE`

The movement loop now consumes these contracts through names such as `turnLocomotionState` and `turnReversalTraversal`. It no longer branches on a variable named after the legacy segmented renderer.

### Preserved exception

Attached sucker fish continue to bypass the ordinary horizontal locomotion blend because they use arbitrary-angle glass-crawling movement. This preserves the pre-v26 behavior. Free-swimming Otocinclus still participates in ordinary horizontal reversal traversal through the existing `canUseHorizontalFacing` path.

### Phase 2 non-goals

Phase 2 intentionally does not:

- change turn duration
- change the `0.62` movement release point
- change reversal direction-switch timing
- change drift or launch movement scales
- add v26 rendering
- remove the legacy complex renderer
- change target selection, schooling, feeding, caves, collision, or behavior ownership
- change logical fish position during a turn

The purpose of Phase 2 is architectural: authoritative locomotion no longer knows which renderer is responsible for drawing the active turn.

## Phase 3 v26 renderer backend boundary

Phase 3 introduces the Fish Turn Lab v26 rendering backend as a dormant rendering option. It does not change authoritative movement, turn duration, reversal traversal, schooling, collision, feeding, or logical facing.

At Phase 3, the production default for a `complex` turn remained `legacy-complex` while v26 was development-only. The renderer can be selected for development with `setFishTurnRendererBackendOverride("v26")`, and cleared with `setFishTurnRendererBackendOverride("")`.

Renderer selection was kept separate from animation-mode selection during integration. Phase 15 retires the segmented backend: `simple` is the lightweight sprite path and `v26` is the continuous WebGL mesh path.

`isFishComplexTurnRendererEligible(...)` is the shared eligibility contract for both complex renderers. This keeps exclusions synchronized for dead fish, attached sucker behavior, sucker view transitions, inactive turns, and non-reversing turn states.

The Phase 3 v26 backend is intentionally a parity renderer. Its 96 x 48 continuous UV mesh renders the source fish artwork undeformed so the following can be verified before body volume or flex is introduced:

- same logical fish position
- same sprite width and height
- same center and pivot behavior
- same stable display-facing direction
- same tank-depth treated source image
- same canvas filter/tint context
- no writes to `xNorm`, `yNorm`, tank layer, tank sublayer, collision pose, target, speed, schooling state, or behavior state

The WebGL canvas is composited into the existing 2D tank render pass. WebGL failure latches the animated lightweight sprite path for the remaining turn. This fallback is visual only and does not change the active movement contract.

Phase 3 intentionally does not:

- implement v26 body distance-field preprocessing
- add faux thickness or volume layers
- bend the body spine
- change turn duration to 650 ms
- add v26 trajectory motion
- add `fish_fin`
- change movement release timing
- promote v26 to the production default

## Phase 4 v26 alpha-aware faux body volume

Phase 4 replaced the dormant v26 parity pass with the approved alpha-aware faux-volume body while v26 was still development-only.

Body preprocessing is asset-level and read-only toward gameplay. It uses the full source canvas, never alpha-bound cropping, and follows these approved defaults:

- alpha cutoff: `7`
- maximum preprocessing dimension: `512`, downscale-only
- mesh: `96 x 48`
- volume layers: `5`
- thickness: `30`
- edge closure: `100`
- edge reach: `26`
- edge roundness: `68`
- end thinning: `100`
- mid-body fullness: `100`
- cross-section shape: `100`
- FOV: `42` degrees
- camera Z: `-5.2`

The preprocessing path builds an alpha-only binary mask, finds opaque silhouette boundaries with eight-neighbor checks, performs the approved chamfer distance transform, computes per-X-column distance maxima, and samples `a_dist` and `a_local` onto the shared continuous mesh. Results are cached by source asset, processing settings, and mesh resolution.

The vertex shader computes the approved v26 `edgeShape`, `crossShape`, `bodyShape`, and `thicknessShape`. The five layer coordinates remain `-1, -0.5, 0, +0.5, +1`. Outer skins retain full source brightness and depth writing. Interior layers use approximately `0.16` alpha, reduced shading, and no depth writes. Fragment alpha uses the approved `smoothstep(0.02, 0.22, sourceAlpha)` edge feather.

The depth-treated fish image remains the color texture so existing tank-depth treatment is preserved, while the original source art supplies alpha geometry. The v26 renderer still writes no logical position, depth layer, target, speed, collision, schooling, feeding, or behavior state.

Phase 4 intentionally does not:

- add the continuous X/Z body spine
- add body flex or tail follow-through
- change turn duration to 650 ms
- add the four v26 motion profiles
- add trajectory translation
- add `fish_fin`
- change movement release timing
- promote v26 to the production default

Until the spine phase, Phase 4 rotates the alpha-aware faux-volume body through yaw solely to validate thickness, edge closure, end thinning, interior support layers, and reverse-side brightness.

## Phase 5 v26 continuous X/Z body spine

Phase 5 adds the approved continuous Fish Turn Lab v26 body-flex spine to the dormant v26 renderer. It remains a rendering-only deformation and does not become locomotion, collision geometry, gameplay depth, or an interaction pose.

Approved flex defaults introduced here are:

- Z-axis body flex: `92`
- tail follow-through: `48`
- local spine sampling epsilon: `0.010`

The shader now computes the normalized bell envelope `B = sin(PI * t)` and the approved signed bend amount beginning with the intentional negative `-1.95` factor. The continuous circular arc is evaluated in X/Z, then the tail-weighted follow-through wave is added. The runtime source-art orientation is read separately from logical fish facing so anatomical head/tail math is not redefined by a gameplay reversal.

For each mesh vertex, the renderer samples the spine at `sourceX`, `sourceX + epsilon`, and `sourceX - epsilon`, constructs the local X/Z tangent and perpendicular normal, and applies faux body thickness along that local normal. This is the key Phase 5 change: the volume layers bend with the body instead of remaining a straight extruded card.

At `t = 0` and `t = 1`, the flex envelope is zero and the procedural spine resolves to the original straight source X axis. This preserves clean handoff geometry at both ends of the turn. At intermediate progress, flex exists only inside the renderer.

Phase 5 deliberately uses one neutral body-flex profile (`bendScale = 1`, `bias = 0`, `waveScale = 1`, `waveSpeed = 1`) so the spine implementation can be validated independently. The four approved v26 turn profiles and their whole-fish trajectories remain a later phase.

Phase 5 still does not:

- change the current turn duration
- implement Banked Flex, Tail-loaded C-turn, Head-led Turn, or Wide Fluid U-turn trajectories
- translate the logical fish along a v26 visual arc
- write `xNorm`, `yNorm`, tank layer, tank sublayer, targets, speed, collision, schooling, feeding, or behavior state
- add `fish_fin`
- change movement release timing
- promote v26 to the production default

## Phase 6 approved v26 turn styles and whole-fish visual motion

Phase 6 replaces the neutral Phase 5 body-flex profile with the four approved Fish Turn Lab v26 production-natural turn styles while keeping v26 development-only and visual-only.

The supported style identifiers are:

- `banked-flex` (Tester #2, Banked Flex Turn)
- `tail-loaded-c-turn` (Tester #3, Tail-loaded C-turn)
- `head-led` (Tester #4, Head-led Turn)
- `wide-fluid-u-turn` (Tester #9, Wide Fluid U-turn)

The body profiles are preserved exactly:

- Banked Flex and Wide Fluid U-turn: `bendScale = 1.05`, `bias = 0`, `waveScale = 0.36`, `waveSpeed = 1.45`
- Tail-loaded C-turn: `bendScale = 1.22`, `bias = -0.22`, `waveScale = 0.62`, `waveSpeed = 1.85`
- Head-led Turn: `bendScale = 1.10`, `bias = +0.22`, `waveScale = 0.28`, `waveSpeed = 1.15`

Whole-fish trajectory motion is evaluated from normalized visual turn progress and source-art orientation. The approved `/210` trajectory conversion is applied in render space only. These trajectory offsets never write back to `fish.xNorm`, `fish.yNorm`, targets, traversal headings, tank depth, or collision state.

The four approved transforms are implemented exactly:

- Banked Flex: `x = 35*sin(PI*t)*d`, `y = -20*B`, `z = 0.10*B`, `rotationX = -6*B`, cubic-eased Y rotation, `rotationZ = 16*sin(2*PI*t)*d`
- Tail-loaded C-turn: `x = 55*B*d`, `y = -12*B`, `z = 0.12*B`, sine-eased Y rotation, `rotationZ = 10*B*d`
- Head-led Turn: `x = -35*B*d`, `y = 10*B`, `z = 0.08*B`, `rotationX = 3*B`, sine-eased Y rotation, `rotationZ = -8*B*d`
- Wide Fluid U-turn: `x = 150*sin(PI*t)*d`, `y = -68*B`, `z = 0.18*B`, `rotationX = -6*B`, sine-eased Y rotation, `rotationZ = 18*sin(2*PI*t)*d`

The shader applies the approved model transform order:

`Translation * RotationZ * RotationY * RotationX * Scale`

Therefore each vertex experiences scale first, then X rotation, Y rotation, Z rotation, and finally visual translation. Perspective remains the approved 42-degree FOV with camera Z `-5.2`.

Because Wide Fluid U-turn and the other spatial styles can leave the original sprite rectangle, the temporary WebGL target is padded while projection is compensated so the fish keeps the same apparent base size. The temporary render target also caps its base resolution at `1024` pixels on the longest dimension because v26 exists only during a short turn and does not need to allocate multi-thousand-pixel framebuffers for every high-resolution source sprite. This does not alter source-art UVs or preprocessing.

Actual Bubble Borough fish assets include unusually long source canvases. If the original endpoint-fit model scale were allowed to grow without limit, a sufficiently long fish could place rotated vertices at or behind camera Z `-5.2` around the 90-degree midpoint. Phase 6 therefore caps the internal 3D model scale at `2.2` and applies projection-only endpoint-size compensation. The approved style translation values remain unchanged. This safeguard changes neither logical fish position nor the v26 motion equations; it only prevents camera-plane singularities for long/narrow fish.

The padding and model-scale safety are render-target protections only and are not gameplay movement.

Style selection in Phase 6 is deliberately not behavior-aware yet. A development override and an optional per-fish `turnV26Style` / `turnStyle` value can choose among the four styles. When none is provided, the dormant v26 renderer uses `head-led` as a neutral development default. A later integration phase decides which style is appropriate for cruising, precision interactions, panic, schooling, and other gameplay contexts.

Phase 6 still does not:

- change complex-turn duration to the approved v26 650 ms default
- change the current locomotion release curve or reversal traversal contract
- make v26 the production complex-turn renderer
- choose styles from feeding, schooling, panic, predator, cave, breeding, or other behavior state
- move authoritative fish coordinates along the visual trajectory
- alter collision or interaction anchors
- add the optional `fish_fin` system

## Phase 7 renderer session ownership and terminal-frame handoff

Phase 7 makes the existing turn lifecycle explicit for the v26 backend without changing locomotion, turn duration, collision, interaction anchors, behavior selection, or the production renderer default.

A horizontal reversal now owns one stable render session from turn start through terminal-frame handoff. `setFishDirection()` still remains the normal reversal gateway. When it starts a real horizontal turn, `beginFishTurnRendererSession(fish, species, now)` latches the renderer backend for that turn.

The session records:

- `turnRendererBackend`
- `turnRendererStartedAt`
- `turnRendererFallbackBackend`
- `turnV26StyleActive`
- `turnV26StyleStartedAt`

The session key is the authoritative `turnStartedAt`. A renderer/style latch is considered current only when its recorded start time matches the active turn. This prevents stale transient state from a cancelled, loaded, dragged, dead, inflated, or debug-reset fish from controlling a later reversal.

Renderer and style configuration are intentionally resolved only at session start. Changing a development override or fish/species preference during an active reversal does not swap the fish to another renderer or v26 style in the middle of the animation. The changed configuration applies to the next turn.

In Phase 7, a v26 WebGL failure latched the then-existing legacy complex renderer. Phase 15 retires that renderer and latches the lightweight sprite fallback instead, preserving the same no-oscillation rule.

The final-frame handshake is also session-specific. `turnFinalFrameRenderedAt` is accepted only when `turnFinalFrameRenderedForStartedAt` matches the current `turnStartedAt`. A terminal-frame marker from an older cancelled turn therefore cannot complete a newer reversal early.

Complex-turn completion remains ordered as follows:

1. logical destination direction is already latched in `fish.direction`
2. `displayDirection` remains the source direction while the complex renderer owns the reversal
3. renderer reaches normalized progress `1`
4. renderer actually draws the terminal frame
5. `markFishTurnFinalFrameRendered()` records that terminal frame for the current turn session
6. on the following movement/update pass, `updateFishTurnState()` commits `displayDirection` to the logical destination
7. the render session is cleared and the normal flat sprite resumes

This preserves a visible terminal frame and prevents a frame where the old sprite and turn renderer disagree, both draw as primary body renderers, or neither draws.

Direct turn-cancellation paths such as puffer inflation, death, dragging/storage transitions, customization reset, health reset, and debug reset also clear renderer-session metadata. Debug turn previews create the same renderer session used by live turns so development testing exercises the real ownership rules.

Phase 7 intentionally does not:

- change the current turn duration to `650 ms`
- change the `0.62` locomotion release point
- change reversal drift/launch movement
- make v26 the production complex-turn default
- select v26 styles from gameplay behavior
- move `xNorm`, `yNorm`, gameplay depth, collision, feeding, cave, gravel, breeding, or schooling anchors along the v26 visual trajectory
- add `fish_fin`

## Phase 8 v26 timing and locomotion reconciliation

Phase 8 connects the approved Fish Turn Lab v26 `650 ms` clock to Bubble Borough without globally replacing the game's existing turn timing.

The renderer backend is resolved and latched first. Only a turn whose latched renderer backend is `v26` receives the approved `650 ms` duration.

This preserved the integration-era timing split. In the Phase 15 production state, `simple` keeps the lightweight sprite-turn duration logic and `v26` uses exactly `FISH_TURN_V26_DURATION_MS = 650`; the retired segmented backend no longer has an active duration path.

The duration decision is therefore made from the active turn session, not from a global game setting and not from a renderer choice that can change later in the same reversal.

If the v26 WebGL renderer fails after the turn has started, the current session latches the lightweight sprite fallback, but that fallback does not rewrite `turnDurationMs`. Retiming a turn after it has begun would change normalized progress and could cause a position, facing, or animation discontinuity. The fallback finishes on the original v26 clock.

### Authoritative locomotion remains normalized

The reversal traversal controller remains renderer-neutral and operates on normalized turn progress rather than hard-coded milliseconds. Its sequence is still:

`source-facing drift -> continuous water arc -> destination-facing launch`

That means the existing traversal shape is preserved when the v26 clock is 650 ms. It simply occupies the approved shorter time window. The reversal is never converted into an in-place flip, and normal swimming still cannot translate horizontally backward relative to the committed/rendered facing contract.

The existing renderer-neutral constants remain authoritative for locomotion:

- `FISH_TURN_TRAVERSAL_DIRECTION_SWITCH_PROGRESS = 0.5`
- `FISH_TURN_TRAVERSAL_DRIFT_MIN_SCALE = 0.08`
- `FISH_TURN_TRAVERSAL_DRIFT_MAX_SCALE = 0.32`
- `FISH_TURN_TRAVERSAL_LAUNCH_MIN_SCALE = 0.18`

Phase 8 deliberately does not make the v26 whole-fish X/Y trajectory authoritative. The style's trajectory translation is a temporary render-space offset and does not become `fish.xNorm` or `fish.yNorm`. Collision, feeding, gravel pickup, caves, schooling, breeding, obstacle avoidance, tank depth, and target selection continue to use the existing simulation pose.

### Phase 8 non-goals

Phase 8 does not:

- promote v26 to the production default renderer
- make behavior systems choose v26 turn styles
- alter collision or interaction anchors
- alter schooling targets or leader/follower logic
- alter tank depth or sublayers
- add the optional `fish_fin` system
- remove the legacy complex renderer
- modify simple-turn timing

The purpose of this phase is to make the approved v26 timing coexist safely with Bubble Borough's existing movement contract before any behavior-aware style selection or broader production promotion occurs.

## Phase 9 context-aware v26 style selection

Phase 9 makes v26 style choice aware of the movement context that already exists in Bubble Borough, while keeping the decision centralized inside the turn-renderer boundary. Individual feeding, schooling, cave, gravel, breeding, predator, action, and collision systems do not hardcode renderer style names and do not call the v26 renderer directly.

The precedence order is:

1. development-wide `fishTurnV26StyleOverride`
2. explicit fish `turnV26Style` / legacy `turnStyle`
3. optional species `turnV26Style`
4. centralized context-aware selection
5. `head-led` as the safe normalization fallback

Context is sampled only when the renderer session begins. The selected result is then stored in `turnV26StyleActive` and remains unchanged for the entire reversal, even if the target, action, panic state, or debug configuration changes mid-turn.

The selector reads existing state without taking ownership of it. Relevant signals include current activity, unexpired behavior intent, queued action, social/action steering, schooling/follow state, breeding sequence membership, collision avoidance, panic state, current swim speed relative to the species range, remaining target distance, and approximate clearance from tank edges.

The policy is:

- **Tail-loaded C-turn** for panic, attack/chase/strike/lunge/pounce, fleeing/avoidance, abrupt darts, zoomies, high-speed bursts, confrontations, and other forceful reversals.
- **Head-led Turn** for normal deliberate reversals and unconstrained precision interactions.
- **Banked Flex Turn** for constrained turns, collision recovery, tank-edge corrections, very short target corrections, and precision/social turns where a compact visual path is preferable.
- **Wide Fluid U-turn** primarily for relaxed open-water cruising when there is enough target distance and edge clearance, the fish is not in a precision interaction, not schooling, not avoiding a collision, and not moving at a high urgency. It is selected most often rather than always so relaxed fish do not repeat one identical reversal indefinitely.

Precision interaction detection deliberately includes feeding, gravel digging, pebble play, cave travel, breeding/mating, inspection, service/decor visits, hiding, resting, and sleeping. These mechanics continue using their existing gameplay anchors. The style selector only changes how the temporary v26 body is drawn.

School followers and social steering do not receive Wide Fluid U-turns because the large visual excursion could make a follower appear far from its authoritative formation slot even though the simulation position is correct. They use Head-led turns normally and Banked Flex when constrained.

Collision avoidance and tank-edge proximity similarly prevent Wide Fluid U-turn selection. This is a visual-space policy only. The selector does not change collision queries, targets, avoidance waypoints, or fish position.

Phase 9 intentionally does not:

- promote v26 to the production default renderer
- alter the approved 650 ms v26 duration
- alter the normalized reversal traversal curve
- move `xNorm`, `yNorm`, tank depth, collision geometry, feeding mouth points, gravel mouth points, cave anchors, breeding anchors, or schooling slots
- let behavior modules choose renderer styles directly
- add `fish_fin`
- remove the legacy complex renderer

## Phase 10 special movement-owner gating

Phase 10 prevents the v26 visual turn from competing with mechanics that temporarily own a fish's pose, position, or orientation.

The central read-only ownership gate is `getFishV26SpecialMovementOwner()`, exposed to the renderer through `canUseFishV26TurnRenderer()`. It recognizes these states:

- dead/corpse rendering
- active fish dragging
- pending Borough edge travel
- pending Borough tube travel
- tank-entry animation
- active puffer inflation or deflation pose
- attached sucker-fish glass locomotion
- sucker-fish view transitions between back/front/swim artwork

A free-swimming Otocinclus is intentionally not blocked merely because its species behavior is `sucker`. Once it is using the normal side-swimming/free-swim state and no sucker view transition is active, it may use the ordinary horizontal v26 turn system.

The gate does not write gameplay state. It never changes `xNorm`, `yNorm`, targets, tank layer, sublayer, speed, collision geometry, food state, schooling state, cave state, or behavior state.

### Deterministic handoff when a special owner takes control

A render-only eligibility check is not enough when a mechanic can seize control between simulation frames. An already-active complex v26 turn would otherwise remain latched underneath the special pose and could later resume from stale progress or wait forever for a terminal v26 frame that the special renderer intentionally never draws.

`cancelFishV26TurnForSpecialMovementOwner()` therefore applies only to a turn whose original latched renderer session is `v26`. Legacy-origin turn behavior remains untouched during this integration phase.

When such a v26 turn is cancelled for a special movement owner:

1. preserve the current `displayDirection`, because that is the side actually visible to the player
2. set logical direction to that same displayed side rather than snapping to the not-yet-rendered turn destination
3. clear the active horizontal-turn timing and terminal-frame markers
4. clear the v26 renderer/style session
5. return traversal-turn bookkeeping to an idle state
6. do not alter position, target, gameplay depth, collision, or any state owned by the incoming mechanic

The owning mechanic can later request a fresh reversal through the normal movement gateway after it releases control.

This cancellation is also applied immediately at ownership boundaries that can trigger a render before the next simulation update:

- beginning a fish drag
- beginning Borough edge travel
- beginning Borough tube travel
- beginning a sucker-fish view transition

The normal simulation loop additionally calls `reconcileFishV26TurnWithSpecialMovementOwner()` before early-return movement-owner branches. This protects imported/debug-created or otherwise overlapping states that did not enter through the normal ownership-start function.

Puffer inflation, death, storage/return transitions, and other existing reset paths already clear turn state directly. The centralized gate remains a defensive renderer boundary for those states as well.

### Renderer behavior

`shouldUseFishTurnV26RendererForSprite()` now requires both:

- the existing shared complex-turn eligibility contract
- no active v26 special movement owner

The legacy complex renderer continues using the pre-existing shared eligibility contract. Phase 10 does not alter legacy-origin turn behavior.

If a v26-origin turn is cancelled because a special owner has taken control, the normal/specialized renderer for that mechanic draws the fish immediately. There is no requirement to draw the abandoned v26 terminal frame, because the turn has explicitly been cancelled rather than completed.

Phase 10 intentionally does not:

- change fish position or target coordinates
- change the approved 650 ms v26 duration for turns that remain active
- change the normalized reversal traversal curve
- alter feeding, gravel, cave, breeding, schooling, collision, or pathfinding calculations
- allow v26 during tube poses, tank entry, dragging, puffer puff poses, attached sucker locomotion, or sucker view transitions
- block free-swimming Otocinclus from using v26
- promote v26 to the production default
- add `fish_fin`

## Phase 11 gameplay anchors and v26 visual attachments

Phase 11 separates authoritative interaction geometry from render-only attachment geometry.

The gameplay mouth, collision, target, feeding, gravel, cave, breeding, and schooling calculations remain 2D and authoritative. Existing helpers such as `getFishGravelPebbleMouthPoint()` and `getFishTargetNormForMouthPoint()` are not rewritten to follow the pseudo-3D mesh. The v26 trajectory, body bow, perspective, and temporary visual depth therefore cannot change pickup distance, feeding reach, collision results, pathfinding, formation slots, or any other simulation outcome.

A separate UV-to-render-only projection path is introduced for visuals that are supposed to stay attached to the fish artwork while the body is bending through v26. The projection mirrors the actual v26 vertex path rather than estimating an offset. It uses the same:

- source-image UV coordinates
- alpha-derived body distance data
- edge closure and cross-section thickness
- current near-side outer surface
- circular body spine
- active v26 style profile
- X/Y/Z whole-fish style transform
- long-fish camera-safe model scale
- perspective FOV and camera Z
- padded render target mapping
- currently displayed horizontal facing

The result is a render coordinate only. It never writes `xNorm`, `yNorm`, `targetXNorm`, `targetYNorm`, tank layer, sublayer, speed, direction intent, collision state, feeding state, gravel state, or behavior state.

### Carried gravel pebble

The carried gravel pebble still uses the same alpha-derived source-image mouth UV. During an active v26 turn, only its drawn position is projected onto the visible v26 body surface so the pebble remains at the rendered mouth. The actual gravel pickup target, carry state, pickup reach, and drop/source calculations continue using the existing authoritative 2D mouth helpers.

If no v26 projection is available, the carried pebble immediately uses the existing flat-sprite local mouth position.

### Birthday hat

The birthday hat keeps its existing alpha-derived head anchor. During v26, that UV is projected to the current visible body surface and a nearby projected UV sample supplies the local body orientation. The hat therefore follows banking and edge-on turns rather than remaining at the old flat-sprite head position.

The small overlap/sink offset is applied along the projected local body-down axis during v26 so the hat remains seated against the head. Outside v26, the previous flat-sprite placement and rotation path remains unchanged.

### Disease and mood bubble emission

Existing disease/mood bubbles remain independent world-space particles after emission. Only their spawn point changes visually during an active v26 turn.

The mouth UV is projected to the visible v26 body surface, and a nearby headward sample determines the visual emission direction. This means a bubble leaves the mouth the player can actually see while the fish is mid-turn. Once emitted, the bubble continues its existing water-column travel and pop behavior and does not stay attached to the fish.

For calls that happen outside the fish draw loop, the v26 bubble source resolves the fish's real current rendered width and source-art aspect ratio instead of trusting placeholder dimensions used by older mood-bubble scheduling code.

### Body-aligned overlays

Wounds, cloudy-eye/body symptom artwork, white-speck illness artwork, shrimp body-aligned layers, and other full-canvas sprite layers continue through the same fish layer renderer. Under v26, their texture is mapped with the base fish image as the body-shape geometry source. They therefore share the same UV mesh, spine deformation, perspective, and body volume instead of creating independent pseudo-3D geometry from the overlay's sparse alpha pixels.

This distinction is intentional:

- the overlay texture determines what color/alpha is drawn
- the base fish image determines the body geometry it is attached to

The optional future `fish_fin` system is different because it has its own approved alpha-derived separation profile. Phase 11 does not implement that system.

### Phase 11 non-goals

Phase 11 does not:

- change gameplay mouth or collision helpers
- change feeding, gravel pickup, cave, breeding, schooling, pathfinding, or obstacle calculations
- make v26 trajectory coordinates authoritative
- change the approved 650 ms v26 timing
- change style selection
- change special movement-owner gating
- promote v26 to the production default
- add `fish_fin`
- make emitted bubbles remain attached to the fish after spawn

## Phase 12 optional same-canvas `fish_fin` overlay

Phase 12 implements the approved Fish Turn Lab v26 fin-overlay model without changing gameplay movement or creating independent fin geometry.

A fin overlay is optional. Every v26 turn session begins with the fin overlay disabled. A fin can be latched on only when a valid asset is already available at turn start. If discovery/loading completes during an active turn, the current turn stays body-only and the newly available fin may be used on the next turn. This prevents a fin from popping into existence halfway through a reversal.

Asset resolution order is:

1. explicit `finOverlayAsset` / `finAsset` metadata on the fish or species
2. otherwise the selected base fish asset basename plus `_fin` before the existing extension
3. otherwise no fin overlay

For inferred `_fin` companions, the static asset manifest is checked before an image load is attempted. Missing companions are cached as an ordinary absent state so fish without fins do not repeatedly issue failed asset requests.

A valid fin image must have exactly the same pixel width and height as the selected base fish image. Mismatched fins are ignored. They are never stretched, resized, cropped, realigned, or repaired by the renderer. A mismatched fin may emit one development warning for that specific dimension mismatch, but it cannot break the body turn.

### Fin preprocessing and geometry

The fin uses the same continuous 96 x 48 UV mesh and the same body turn deformation as the fish. It does not have a separate mesh, coordinate system, pivot, hinge, X/Y transform, or attachment solver.

The fin does have separate alpha-derived shape data. Using the same 512 px downscale-only preprocessing rule, alpha cutoff, 8-neighbor boundary detection, chamfer distance transform, and per-X-column maximum normalization, Phase 12 caches:

- `finDistanceField`
- `finColMax`
- per-mesh-vertex `finLocal`

This data is cached by fin visual asset and mesh configuration. No fin preprocessing occurs when a valid fin is absent.

### Approved v26 separation controls

Defaults are:

- Fin Distance from Body: 18
- Front Attachment Distance: 34
- Fin Tapering: 72

The renderer also accepts explicit per-fish or per-species values for those controls while retaining the approved defaults when none are configured.

The shader follows the approved v26 math:

- `front01 = clamp((h + 1) * 0.5, 0, 1)`
- `attachStart = 1 - u_finAttach`
- `frontAttached = smoothstep(attachStart, 1, front01)` when attachment is enabled
- `attachMask = 1 - frontAttached`
- `finPower = mix(0.55, 2.40, u_finTaper)`
- `finProfile = pow(clamp(a_finLocal, 0, 1), finPower)`
- `finGap = u_finGap * finProfile * attachMask`
- `depth += finSideSign * finGap`

The extra separation therefore falls toward zero at the fin's own alpha silhouette and toward the configured headward/front attachment region. The existing body thickness contribution still comes from the base fish geometry beneath the shared UV.

### Near/far fin rendering

The visible near side is computed from the current v26 yaw. Fin rendering order is always:

1. far-side fin
2. complete body volume
3. near-side fin

Each fin pass uses the same mesh, UV coordinates, body spine, turn progress, whole-fish transform, perspective, and source-facing convention as the body. The fin pass uses full source brightness inside the v26 WebGL renderer and does not receive interior-layer darkening.

`finSideSign` is explicit for each fin copy rather than relying on `sign(u_layer)`, so the fin system remains well-defined even if a future debug configuration uses a single body volume layer.

### Absence and performance rules

If a fish has no valid fin:

- its fin session remains disabled
- no fin distance field is built
- no fin-local GPU buffer is created
- the optional fin GPU texture is not allocated
- no fin texture is bound
- no fin draw call is issued
- the body turn continues normally

The fin texture and fin-local GPU buffers are created lazily only after a valid fin is actually latched for rendering. Shared fin preprocessing/GPU data is cached by asset, while each fish instance stores only its turn-session fin enable/path state.

Phase 12 does not:

- detach a fin in X/Y
- create a separate fin mesh
- add rear/bottom separation controls
- add a fin root picker
- rotate or hinge the fin independently
- remove fin artwork from the base fish image
- make `fish_fin` mandatory
- change gameplay anchors, movement, collision, depth, feeding, schooling, cave behavior, breeding, pathfinding, or special movement-owner rules
- promote v26 to the production default


## Phase 13 schooling-specific v26 integration

Phase 13 validates the pseudo-3D turn against the coordinated schooling system and closes the remaining visual-group edge cases without making v26 part of schooling simulation.

Schooling continues to use authoritative 2D leader/follower positions, stable formation slots, tank depth/sublayers, target smoothing, collision recovery, rejoin logic, and the existing social turn-commitment rules. No formation calculation reads v26 yaw, visual Z, perspective, or render-space trajectory.

### Renderer-neutral leader facing

`getFishSchoolLeaderFormationDirection(leader, now)` is the single schooling-facing read for formation orientation. It normally returns `getFishFacingDirection(leader)`. While a real horizontal reversal is active, it explicitly returns the turn's latched `fromDirection` from `getFishHorizontalTurnState()`.

This makes the schooling contract independent of renderer implementation:

- the v26 edge-on midpoint is invisible to schooling
- v26 visual yaw never becomes a third or neutral gameplay-facing state
- a lightweight/simple turn cannot mirror the formation halfway through its animation
- a complex v26/legacy turn cannot move follower slots before its normal terminal-frame handoff
- the leader's destination-facing formation update begins only after the turn lifecycle is actually complete

When the completed leader facing differs from the stored school formation direction, the existing group-turn hysteresis remains in force. `SCHOOL_FORMATION_HEADING_SETTLE_MS` preserves the approved 420 ms settle window before `schoolFormationDirection` moves to the new side. Target smoothing then reforms the school behind the new heading instead of teleporting every slot through the leader.

Follower facing requests use the same committed leader-facing helper. Existing formation deadzones and `SOCIAL_FORMATION_TURN_COMMIT_MS` still prevent a moving slot from ordering an immediate opposite reversal. `setFishDirection()` remains the only ordinary horizontal reversal gateway, so an already-active follower turn stays latched to its original destination until completion.

### School leaders use school-safe v26 styles

Phase 9 already prevented active followers from receiving Wide Fluid U-turns. Phase 13 extends the same visual-group rule to a fish that currently has active school followers.

The centralized v26 behavior context now distinguishes:

- `schoolLeading`: the fish currently has one or more active school followers
- `schoolFollowing`: the fish is an active follower/social-follow participant
- `schoolFormationActive`: either of the above

An active school leader or follower uses Head-led Turn normally and Banked Flex when constrained. Wide Fluid U-turn is excluded for the whole active school. This prevents the leader sprite from making a large render-space excursion away from followers whose authoritative formation anchors correctly remain around the leader's gameplay position.

This is visual policy only. It does not move the leader, followers, formation slots, collision geometry, or target coordinates.

### Existing schooling protections preserved

Phase 13 deliberately preserves the existing systems that already protect schooling from movement instability:

- stable single-leader election and no follower chains
- fixed follower formation slots and depth slots
- target-response smoothing and maximum target-step limits
- formation position and turn deadzones
- `SCHOOL_REJOIN_DISTANCE_NORM` / settle distance
- dynamic rejoin speed increase
- collision recovery suspension and later rejoin
- no backward horizontal translation relative to rendered facing
- `SOCIAL_FORMATION_TURN_COMMIT_MS` anti-counterturn commitment
- follower turns that cannot be restarted by a newly crossed moving target

Obstacle avoidance remains higher priority. A follower may temporarily leave its slot for collision recovery, then resume/rejoin using the existing recovery path. V26 does not alter that ownership hierarchy.

Phase 13 does not:

- make v26 yaw authoritative for school facing
- move formation anchors using render-space trajectories
- change follower capacity, formation geometry, or formation randomization
- change school target smoothing or rejoin distances
- change schooling speed/catch-up equations
- change collision-recovery ownership
- change `SOCIAL_FORMATION_TURN_COMMIT_MS`
- change the approved 650 ms v26 turn duration
- change logical fish position or depth
- promote v26 to the production default renderer

## Phase 14 real fin-atlas validation and gameplay interaction regression

Phase 14 validates the optional fin path with a real Bubble Borough fish asset and then treats the completed v26 renderer as a read-only visual client of gameplay state across the interaction stack.

### Sprite-sheet fin atlases reuse the original fish frame coordinates

Bubble Borough fish variants frequently render from logical sprite aliases backed by a shared atlas. For those fish, the optional fin companion is a parallel atlas named by inserting `_fin` before the source atlas extension. The original fish sprite-sheet definition remains authoritative for both images.

Example:

- logical fish variant: `/assets/fish/tetra_neon-blue.png`
- body atlas: `assets/fish/tetra-neon__genetics-enhanced.webp`
- optional fin atlas: `assets/fish/tetra-neon__genetics-enhanced_fin.webp`
- frame rectangle: the exact `tetra_neon-blue.png` rectangle already defined by the body atlas JSON/generated sprite definition

No second fin JSON is required. The fin loader resolves the logical fish alias back to its body atlas, derives the parallel `_fin` atlas, and crops the fin atlas with the same `x`, `y`, `width`, and `height` frame rectangle. The crop becomes the full-canvas fin overlay supplied to v26. This preserves the v26 requirement that the body image and fin image presented to the turn renderer have identical dimensions and UV alignment.

Each sprite-frame crop has its own fin discovery-cache key even when several variants share the same fin atlas. This prevents one color variant from reusing another variant's cropped fin pixels.

The real neon-tetra fin atlas is shipped as `assets/fish/tetra-neon__genetics-enhanced_fin.webp`. It is 1536 x 1024, matching the body atlas, and contains six sparse fin overlays aligned to the existing six 512 x 512 tetra cells. The normal body JSON remains the single coordinate source of truth.

### Turn-session behavior remains unchanged

Fin loading is still optional and asynchronous. A v26 turn begins with the fin disabled. If the correct cropped fin is already validated when that turn session begins, it is latched for the whole turn. If the fin atlas finishes loading later, the active turn remains body-only and the fin becomes eligible for the next turn.

The latched turn stores the fin discovery-cache key as well as the atlas path so sprite-sheet fish retrieve the correct cropped frame rather than the full atlas during rendering.

### Gameplay interaction regression contract

The completed v26 body/fin renderer remains visual-only. It does not write authoritative locomotion or interaction fields such as:

- `xNorm` / `yNorm`
- target coordinates
- logical tank depth or sublayer
- logical facing or displayed-facing handoff
- collision pose
- feeding targets or food depth
- gravel pickup targets
- cave state or cave pathing
- breeding alignment targets
- schooling formation positions
- predator/escape targets
- tube/Borough travel state
- drag ownership
- puffer movement ownership
- death/corpse movement state

Feeding, gravel digging and pebble pickup, cave traversal, breeding, panic, predator pursuit/escape, tube travel, tank entry, puffer transitions, dragging, death, and schooling therefore continue to resolve through their existing simulation systems. V26 receives the resulting pose and turn state only for rendering.

Visual attachments may use the Phase 11 UV-to-screen projection helper so they remain attached to the displayed pseudo-3D fish, but their gameplay reach and state remain derived from the original 2D authoritative helpers.

Phase 14 does not promote v26 to the production default. Promotion and legacy-renderer cleanup remain a separate final phase after this interaction regression pass is clean.


## Phase 15 production promotion, fallback, and performance contract

Phase 15 is the production state of the fish-turn system. **v26 is the production complex-turn renderer**. A fish whose existing animation-mode contract resolves to `complex` uses v26 by default; the ordinary `simple` animation mode remains available and unchanged. Any stale `legacy-complex` renderer preference is treated as a migration alias for `v26`, not as permission to revive the retired segmented renderer.

The segmented 12-slice renderer, its canvas cache, its multi-second renderer-specific timing constants, and its caustic-mask renderer have been removed from the live code path. The renderer-neutral locomotion contract remains unchanged.

If WebGL initialization, preprocessing, texture creation, or a v26 draw fails, the session latches the animated lightweight sprite fallback. It narrows before changing facing and expands on the destination side, rather than holding a full-width sprite and flipping at completion. The already-started turn clock and authoritative movement state remain intact. The visual recovery never rewrites `xNorm`, `yNorm`, targets, depth, collision, feeding, cave state, schooling, or behavior ownership.

Production GPU work is asset-cached. Body and optional fin shape data remain asset-level caches, body/fin vertex buffers are shared by shape cache key, and WebGL body/fin textures are uploaded once per source image identity rather than once per fish per frame. A school of fish using the same artwork therefore reuses the same preprocessing and GPU resources.

The production renderer keeps the approved `96 x 48` mesh at all quality levels. Full quality uses five volume layers. Unusually large simultaneous turn bursts reduce translucent interior layers first: up to 8 active v26 turns use 5 layers, 9-16 use 3 layers, and more than 16 use the 2 outer skins. Edge closure, body flex, cross-section shaping, mesh resolution, and optional fin passes remain intact. This follows the approved quality-reduction order without changing gameplay.

The v26 WebGL renderer owns one reusable offscreen context. Asset GPU buffers and textures are explicitly disposed if the context fails, and a restored context may be recreated for later turns. Normal swimming continues to use the flat sprite renderer, so none of these resources add per-frame mesh work when fish are not turning.


## Texture orientation contract

The v26 mesh uses sprite UV coordinates with `v = 0` at the TOP of the Bubble Borough source image, matching the existing flat-sprite coordinate system. WebGL body and `fish_fin` texture uploads must therefore keep `UNPACK_FLIP_Y_WEBGL = false`. Enabling Y-flip at upload time vertically inverts the fish for the entire v26 turn, causing an upright flat sprite to become instantly upside down when the turn renderer takes ownership and then snap upright again when the flat sprite resumes. Body and fin textures share this orientation rule.

## Phase 18 visual-pose continuity

At turn start, every renderer session latches the last visible local steering tilt. Normal swimming mirrors before rotating; turning rotates before applying its own facing. Turn rotation therefore uses world tilt (`localTilt * facing`) to match the swimming transform. This prevents a left-facing fish's climb/dive slope from reversing at entry.

The mesh owns the active turn without a sprite crossfade. World tilt blends smoothly from the latched source-facing slope to the current destination-facing slope throughout the turn. The terminal frame uses the destination swimming transform, and the terminal-frame handshake remains intact. Caustics and visual carry anchors follow the same world rotation. Simple and fallback turns use this continuity transform and own their squash once, rather than applying it again in the pose.

V26-origin sessions retain a renderer-only clock in a runtime WeakMap. Each visible frame advances at most 50 ms, matching the movement loop's maximum step, and all passes at the same timestamp share the same progress. A stalled browser frame therefore cannot consume the whole turn between two images. The authoritative turn clock and `turnDurationMs` remain unchanged. Completion waits for the rendered terminal frame, including after a session latches the simple fallback. At ordinary frame rates this preserves the 650 ms animation; during severe stalls it extends the visual turn until its intermediate poses have actually been drawn.

This phase is rendering-only. It does not change `xNorm`, `yNorm`, target selection, steering, collision, tank depth, schooling, feeding, cave behavior, or the turn clock. Caustic mask alignment and navigation routing are intentionally deferred to later phases.

## Phase 19 v26 caustic silhouette continuity

Phase 19 makes the caustic receiver mask use the actual v26 output canvas rather than the flat fish source image. After rendering the WebGL mesh, the renderer supplies its alpha-bearing canvas and its padded draw bounds to the tank caustic mask while the same facing transform is still active. The resulting mask follows v26 yaw, body curvature, faux-volume silhouette, fin overlay, and render-space trajectory frame by frame.

The Phase 18 endpoint overlap contributes the ordinary swim sprite to the mask only for its visible alpha. The v26 and sprite mask contributions therefore crossfade with the displayed fish rather than snapping between two unrelated receiver shapes.

This phase changes only illumination masking. It does not alter fish artwork, color treatment, render ordering, movement, gameplay pose, collision, target state, or any turn timing.

## Phase 20 decor-approach routing

Phase 20 prevents a fish from treating a decor hangout directly above or below it as a command to swim vertically. When a roaming fish has a decor-owned hangout target and the initial target vector lacks enough horizontal travel, traversal inserts a short, committed forward approach waypoint. The waypoint retains the fish's physical forward heading, applies a bounded vertical component, and then releases ordinary steering to complete the local decor arrival.

The approach applies only to non-urgent roaming behavior. Panic, collision avoidance, caves, queued actions, debug steering, puffer motion, tube travel, and other movement owners bypass it. Obstacle avoidance remains higher priority after the approach target is chosen. Route state is persisted and validated with the existing traversal-state save path, so a save/load cannot turn the waypoint into an invalid coordinate.

This phase does not change collision decisions, decor occupancy, target selection, authoritative fish coordinates, turn animation, or urgency behavior. It only converts an implausible vertical first leg into a short swimming approach.

## Phase 21 turnaround commitment

Phase 21 adds a per-fish post-turn commitment after a completed left/right reversal. Once the normal turn lifecycle has reached its terminal-frame handoff, the fish records the new facing, start pose, a short cooldown, and a small minimum forward-travel distance. An ordinary target that immediately crosses behind the fish cannot start another reversal; traversal instead continues along the new facing with a bounded vertical component. This turns rapid target churn into a shallow forward arc rather than a left/right flip loop.

The commitment releases as soon as both its short time window and minimum travel requirement are satisfied, with a maximum window so a blocked fish cannot be held indefinitely. Panic, predator/zombie aggression, puffer and whale motion, tube travel, queued/debug/action steering, and active collision avoidance bypass the commitment. Those systems remain free to reverse immediately when safety or gameplay requires it.

This phase does not alter the v26 turn timeline, renderer ownership, collision resolution, target selection, or authoritative fish pose. It only gates non-urgent *new* reversals after the prior one visibly completes.

## Phase 22 v26 head volume and alternating depth turns

Phase 22 increases v26 faux-volume thickness to 43 and gives only the face/head end a capped depth boost. The boost is shaped by the source-facing horizontal coordinate using a smooth head mask, then capped before edge closure, so a fish reads as fuller at the head without inflating its tail or leaking volume past transparent artwork boundaries.

Each v26 session also latches one visual depth hemisphere. The default `both` mode alternates that sign per fish across consecutive turns; development overrides can force `toward` or `away`. The sign mirrors yaw, temporary Z trajectory, continuous spine curvature, and tail wave together. Visual attachments use the same signed projection, keeping hats, held objects, and effects seated on the rendered body.

This remains renderer-only. It does not change fish coordinates, targets, tank depth/layer, collision geometry, behavior, animation timing, or gameplay authority. The previous depth-side sign is stored only to maintain alternation after save/load; an active renderer session is never restored.

## Phase 23 continuous turnaround locomotion

Phase 23 replaces the old midpoint horizontal direction switch with a continuous swimming arc. During a reversal, horizontal momentum follows a smooth curve through zero at the turn apex while a small bounded vertical arc carries the fish through the water. The result is a physical change of course rather than an in-place flip or a one-frame stop.

The turn retains a meaningful fraction of its exit velocity. Normal passive swimming consumes that velocity on the first post-turn frame, so the v26/sprite handoff and the movement handoff both coast naturally instead of restarting from zero.

This only changes the authoritative free-swim path during an already-approved turnaround. It does not alter target selection, collision constraints, tank depth, behavior ownership, or the visual v26 trajectory.

## Stable turn arcs and anticipatory obstacle corridors

An accepted reversal keeps its locomotion arc until the visual turn finishes, even if a moving target crosses back to the source side. Arc distance and vertical intent are latched per turn so target changes cannot abruptly bend the fish in the opposite vertical direction mid-turn. A new turn chooses a fresh arc.

Passive obstacle anticipation samples four positions along the intended path and, when present, the carried velocity path. Its lookahead includes steering response time. This catches obstacles between probe endpoints and obstacles the fish is still coasting toward. Existing collision resolution remains authoritative, and committed detours retain their existing lifetime. An obstacle waypoint bypasses the post-turn forward commitment so that commitment cannot force the fish into an obstacle.

## Phase 24 momentum locomotion overhaul

Phase 24 supersedes the earlier fixed-timing and synthetic-turn-arc assumptions for ordinary living swimming. `FISH_TURN_V26_DURATION_MS = 650` remains the reference baseline, not a universal duration. A v26 turn now scales that baseline by species locomotion, current swimming speed, body scale, urgency, and a small per-turn variation. The lightweight renderer continues to use its existing simple-turn duration path. Once a turn begins, its chosen duration remains latched for that session.

Authoritative reversal travel no longer invents world-space vertical motion merely because a fish is turning. Fish Turn v26 still supplies the toward/away pseudo-3D visual maneuver, while `xNorm` and `yNorm` only carry vertical movement that navigation actually requested. Horizontal momentum still eases through zero and launches into the destination-facing direction, preserving a continuous reversal without forcing an unrelated climb or dive.

Normal swimming now maintains a continuous steering heading and bounded velocity state. Near-vertical destinations retain a meaningful horizontal component, and species may lower the global vertical-steering ceiling further. Behavioral targets remain intent. The locomotion layer applies heading rotation, acceleration, braking, slow speed variation, propulsion push/cruise/coast states, and bounded path wander. Random variation is chosen at low-frequency state transitions and interpolated over time rather than rerolled every frame.

Roaming, feeding, ordinary inspection, and social following increasingly share the same velocity controller. Behavior changes therefore preserve momentum instead of replacing one movement model with another. Urgent or genuinely scripted owners such as tube travel, cave-specific movement, puffer overrides, gravel actions, panic, dragging, and death may still use their dedicated paths.

Toward-camera and away-camera v26 turns remain available, but default `both` mode no longer strictly alternates. Selection is weighted by current tank depth and recent turn history, which discourages visible repetition while retaining both depth hemispheres.

Turnaround commitment now includes species timing, carried speed, and a body-length travel requirement. Ordinary target churn cannot immediately command another reversal before the fish establishes its new course. Safety and explicit movement owners retain their existing bypasses.

Schooling remains a single leader/follower behavior. The leader keeps one bounded rolling path history shared by the school. Followers sample delayed positions along that history, then apply their stable formation offsets as elastic regions rather than exact points. This makes a leader's turn propagate through the school instead of mirroring all slots instantly. Formations breathe with small stable offsets, pause reshaping during major maneuvers, preserve catch-up behavior, and continue to forbid reverse-swimming followers.

Wall and decor anticipation remain steering aids rather than collision replacements. Lookahead now considers species profile, carried speed, and body scale. Wall avoidance prefers a sweeping tangent route before hard boundary correction. Existing collision and cave rules remain authoritative.

## Swimming handoff corrections

V26-origin reversal travel and movement release now read the same bounded runtime turn progress as the body renderer. This supersedes the earlier separation between the renderer's bounded clock and wall-clock locomotion progress: after a browser stall, the fish cannot launch toward the destination while its visible body is still on the source side. The chosen duration, wall-clock state reader, terminal-frame handshake, special owners and save format remain intact.

The reversal controller updates the screen-space steering heading as it traverses its arc. Ordinary steering therefore resumes from the final reversal heading rather than rotating again from the obsolete entry heading.

Decor hangouts and species hover bouts are arrival destinations. Cruise continuation clears its waypoint for those targets instead of extending them into another route. Hover bouts use the existing hangout zone field to retain that distinction until their target expires. Ordinary cruising retains its rolling waypoints; cave, feeding and emergency owners retain their established movement paths.

The frame limiter discards missed render slots and retains only a fractional interval after a stall. It no longer builds a render backlog that makes it exceed its configured FPS limit during recovery. The profiler separately reports simulation and UI time within the one-second tick, since those callbacks can stall rendering outside the animation callback's measured work.
