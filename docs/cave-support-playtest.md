# Cave support and behavior playtest

Tested locally on October 5, 2026 in the running game, using ordinary fish records, placement, sprites, collision masks, behavior planning, and locomotion.

## Species

The main catalog now enables caves for 43 of 54 species. Added: betta, molly, swordtail, tang, goldfish, moor goldfish, angelfish, discus, pufferfish, rainbowfish, piranha, freshwater shrimp, and marine shrimp. Smaller catalogs agree, including the blue/yellow tang and wonder killifish aliases. Shelter-oriented fish get stronger interest; large or schooling fish visit opportunistically. Enabling caves still requires the entire fish to fit the opening and route.

Excluded: otocinclus, nerite/turbo snails, koi, sunfish, pilot fish, lookdown, the three sharks, and orca. Attached crawlers use a different movement controller; the remaining exclusions do not suit these shelters.

## Problems reproduced and fixed

| Problem seen in the game | Change |
| --- | --- |
| Every new cave copied the same generic entrance/two-seat template, hiding the artwork's actual openings. | Preserve authored geometry; recognize untouched legacy templates while retaining customized coordinates. |
| Large pots had a usable entrance and seat, but zero plans. | Entrance masks now determine the mouth when no explicit portal profile exists. Generic profile coordinates previously replaced the measured opening. |
| Collision recovery repeatedly damped velocity, leaving occupants frozen. | Rate-limit damping together with replanning and preserve the cave controller's momentum. |
| Fish checked their old facing before initiating a required entrance/exit turn. | Check intended facing, turn in place, then enforce actual full-body clearance. |
| A tube entry and clay-cave exit crossed neighboring slate/tube walls. | Check the complete entry/exit route against neighboring cave masks on the same layer; try alternate portals. |
| Long approaches consumed the visit's rest time; unfinished seat settling could hold forever. | Start linger on arrival and enforce expiry even while settling. |
| Busy or failed entrances could keep fish waiting indefinitely. | Select available entrances and detect lack of progress. Failed entries physically back out; approach failures resume swimming after cooldown. |

No change grants passage through opaque walls or skips full-body fit, turn, depth, seat reservation, or collision checks.

## Scenarios and observations

Freshwater and reef stress scenes each contain eight caves and ten adult fish. Caves include pots, ceramic tubes, slate, mossy driftwood, shells, clay chambers, and narrow pleco tubes, with overlapping artwork on two main layers. A separate scene contains four enlarged pots on four layers.

Before recovery fixes, the freshwater run had fish stalled in alignment, seating, and exit. Before neighbor checks, the reef run had three stalled occupants; instrumentation identified neighboring cave walls blocking two portal crossings. After neighbor checks, an 87-second reef run recorded four arrivals, three exits, and no current cave stalls.

After correcting mask-derived entrances, the enlarged-pot run reached four arrivals and two exits at 90 seconds, with no current cave stalls. A newly supported molly visibly settled at its interior seat. Natural visits continued between manual starts.

At 153 seconds, the final freshwater run recorded ten arrivals and ten exits, with no current cave stalls. Newly supported betta, swordtail, and freshwater shrimp each completed a visit. Larger adults still rejected many of the standard-scale shelters, so suitable cave scale remains necessary.

At 100 seconds, the final reef run recorded 16 arrivals and 15 exits, with no current cave stalls. All ten species reached an interior, including the newly supported marine shrimp, which also completed an exit. Arrival/exit callbacks in the diagnostic panel count these events directly; entry/abandonment and movement observations are sampled every 250 ms. The panel's `maxStep` measures movement between samples, not a per-frame teleport detector. Seated, resting fish are excluded from transit-stall counts.

Screenshots: [freshwater](cave-freshwater-playtest.jpg), [reef](cave-reef-playtest.jpg), [larger shelters](cave-larger-shelters-playtest.jpg).

## Reproduce safely

1. Run `node scripts/start-web.cjs --no-open --debug-tools`.
2. Open `http://localhost:4173/.cave-behavior-audit.html` and wait for initialization.
3. Choose a freshwater, reef, or larger-shelter scene.
4. Click **Start eligible visits**. It selects real valid plans for currently roaming fish; it does not force admission, fit, or completion.
5. Watch through several visit cycles. Inspect the panel for state, velocity, blocked decor, reservations, arrivals, exits, and stalls.

This opt-in page uses an isolated aquarium in memory. Local, desktop, and cloud loading/writes are disabled before game initialization. It is unavailable in production or without `--debug-tools`. The normal `/play` page retains its regular save behavior.

## Validation and remaining limits

- 69 focused cave tests pass, including catalog parity, legacy geometry, measured entrances, occupancy, progress recovery, arrival timing, complete neighbor-route checks, momentum, portal occlusion, turns, swept wall collision, and authored seat-only caves. The obstructed-mouth fixtures now provide the new transit-progress and intended-facing helpers.
- All six HTTP delivery/isolation tests pass with localhost socket access.
- Generated app consistency, asset checks, mobile patch, notifications, architecture, syntax, and whitespace checks pass.
- The broader integration group has 782 tests: 730 pass, 40 fail, 12 skip. The same 40 failure titles were reproduced against the original HEAD sources before these changes; the additions introduce no extra failures in that group. The performance gate also has two existing fixture/hash failures, so `npm test` is not fully green.

This is substantial improvement, not proof that every species can use every cave. Adult body shape, scale, occupied seats, entrance direction, and neighboring decor can legitimately reject a plan. Several approaches still cancel safely rather than finish, and placement changes during an active visit can create new obstacles. The next useful improvements are routing around neighboring decor after placement changes, better alternate-seat search within the same portal, and explicit visual feedback explaining why an entrance is unavailable.

## User recording review

Reviewed the 14.87-second recording `20261006-0009-15.2996533.mp4` by direct video decoding, with frames sampled throughout the clip. Browser video seeking returned the opening frame for every requested timestamp, so those browser samples were discarded.

The pink fish moves left from the central opening, circles near the upper-left tube, returns across the central opening, and swims away to the right near the end. It changes direction several times and remains visible over the tube rims. The clip does not show a fish frozen for the full recording.

Ceramic Tube Cluster is a seat-only cave with five independent portal/seat pairs. An active occupant should stay at its assigned seat and leave through its portal. Ordinary fish in front of the decor can legitimately overlap its artwork: `findBlockingCaveForFishPose` tests the middle lane, and cave ownership controls interior occlusion. Without the recorded fish's behavior state and depth, the clip cannot establish whether its rim overlap is ordinary front-lane travel or an incorrect cave route. The visible concern is that front-lane travel and entering/leaving a shelter are hard to distinguish; reproducing the turns with state/depth diagnostics is needed before attributing them to a particular controller.

Added **Build ceramic tube scene** to the isolated playtest, with an enlarged cluster and danio, guppy, and tetra. The readout now includes simulation depth, continuous Z, render depth, and blocking status for ordinary swimming as well as active visits. In a 111-second run, all three species completed visits: seven arrivals and seven exits, no abandoned approaches, no current transit stalls, and no sampled large steps. After exiting, ordinary front-lane fish visibly overlapped the same rims while the readout confirmed they no longer owned a cave route. This reproduces the visual ambiguity, rather than proving the precise state of the fish in the recording. Evidence: [ceramic tube playtest](cave-ceramic-recording-review.jpg).
