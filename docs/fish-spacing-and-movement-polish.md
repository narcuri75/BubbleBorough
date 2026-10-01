# Fish spacing and movement polish (Phase 6 of 9)

Phase 6 adds a soft body-space steering layer and finishes the movement pass without reintroducing rigid fish-on-fish physics.

## Soft body spacing

- Living fish on the same tank and overlapping depth volume begin to yield before their visible bodies stack.
- Spacing is an additive steering bias. It never directly moves a fish, teleports it, bounces it, or changes its facing.
- The bias is smoothed in and out so a new neighbor cannot produce a one-frame sideways shove.
- A moving fish prefers to slide laterally around another fish while preserving forward travel. Backward steering is removed from the spacing correction.
- Perfectly head-on/tail-on pairs use a deterministic global up/down split so the two animals choose opposite passing lanes instead of mirroring into the same lane.
- Near the waterline or floor, the tie-break direction is flipped inward rather than pushing into a clamp.
- Fish on non-overlapping depth volumes ignore one another. Different tanks ignore one another. Cave occupants/portal crossings are left to cave routing and entrance occupancy rules.

## Schooling and social movement

Natural schoolmates and active follow pairs continue to use their authored formation targets as the primary spacing system. Generic body spacing only engages inside a much smaller emergency envelope, where visible overlap is becoming imminent. This prevents the generic solver from making schools look mutually repulsive or breaking stable formation slots.

## Hard collision fallback

The legacy collision detour remains available for genuine blocked depth changes, but it no longer zeroes motion velocity or snaps the fish toward its detour. It retains a reduced portion of momentum and lets the shared turn/steering lifecycle curve naturally toward the temporary avoidance route.

## Movement-owner boundaries

Soft body spacing deliberately stays out of constrained/special movement owners: cave traversal, tube/Borough travel, breeding choreography, whale breathing, puffer pose ownership, committed predator pursuit, gravel carry/dig sequences, and dragged fish. Panic uses only the emergency inner envelope.

## Intended visual result

Two ordinary fish approaching the same area should begin to slide past one another before their sprites stack, without bouncing, stopping dead, or whipping around. A school remains a school; only a near-overlap safety correction can briefly bend a follower away.
