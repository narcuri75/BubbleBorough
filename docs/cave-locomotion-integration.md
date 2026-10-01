# Phase 5: Cave locomotion integration

Phase 5 makes cave traversal use the same momentum-based locomotion model as ordinary swimming instead of behaving like a separate waypoint mover.

## Movement handoff

When a fish accepts a cave plan, the cave controller now records its current velocity, heading, and speed. The first cave steering target is seeded slightly ahead of that motion so the fish curves toward the approach route instead of snapping directly at the first cave node.

Cave targets remain authoritative route goals, but the shared traversal target filter turns them into smooth steering targets. Transit states respond faster than interior roaming, while both preserve continuity from frame to frame.

## Waypoint flow

Intermediate cave path nodes now use a small speed-dependent lookahead radius. A moving fish can roll through a safe intermediate node without braking to hit its exact coordinate. Final nodes keep the stricter arrival threshold so portal and seat destinations remain accurate.

## Cave locomotion tuning

The shared passive motion integrator remains responsible for acceleration and velocity. Cave states supply only tuning:

- approach and route transit favor coasting and reduced braking
- portal states keep a tighter arrival distance
- interior roaming stays smooth and bounded
- seat approach increases braking and slightly reduces acceleration so the fish settles instead of locking into place

## Seat settling

Seat facing is no longer applied merely because the fish reached the seat area. The fish must be physically close and moving slowly before the authored seat facing is applied. Seat holds extend briefly while a fish is still settling.

This applies to seat-only caves as well as seats inside swimmable caves.

## Collision recovery

A blocked cave route no longer wipes movement velocity to zero in one frame. Recovery heavily damps the current velocity, then replans from the fish's real position. Recovery targets also leave heading changes to the shared locomotion controller instead of snapping direction immediately.

## Exit handoff

When the exterior leave route is complete, cave ownership is released without clearing the fish's existing movement velocity. The normal-swim target filters are seeded along the outbound heading, and a short continuation target keeps the fish moving away from the cave before ordinary roaming may retarget it.

The existing turnaround cooldown is started on release so the fish cannot clear the entrance and immediately reverse back toward the cave.
