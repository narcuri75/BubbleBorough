# Architecture migration regression baseline

The all-files test run before and after the October 1 migration has the same 52 failures and 12 skips. These were not removed or weakened by the migration. See public-website-implementation.md for counts, commands, staging prerequisites, and runtime verification limits.

Existing failing test names:

- null pellet origins stay absent; real custom origins survive
- store item pages use catalog-authored sellers and link Proteus Biodyne to its overlay webpage
- WebSurf persists mailbox state and FIN sends the intro plus randomized vague fulfillment mail
- same-species schooling declares its target refresh interval before using it
- Halloween placement uses corrected sizes with catalog loading and offline fallback
- WebSurf Settings uses the full browser-page redesign without changing its controls
- WebSurf Phase 5 keeps Home, mail, Settings, and browser chrome in desktop geometry under Ratio Lock
- Phase 15 fish body collision ignores fish on different sublayers of the same major layer
- Phase 15 local sublayer passing is attempted before planar collision detours
- Phase 20 active school follow owns its depth while higher-priority movement controllers preempt mood routing
- Hang Out keeps a stable reachable formation and yields to collision recovery
- Phase 22 Pilot Fish autonomous escort uses the configured host-bond system
- Dead Fish Phase 12 makes corpses invisible to living body-collision probes
- Dead Fish Phase 13 removes the floating skull indicator while preserving the living critical-health warning
- Dead Fish Phase 20 blocks living visual flourishes and corpse particles after death
- Expansion Phase 1 save schema persists fish, tank, storage, and living decor foundation fields
- Expansion Phase 2 enforces capacity across purchases, restore, offspring, and Borough travel
- Expansion Phase 5 inactive living decor loses benefits without becoming transparent, and save schema migrates its state
- Expansion Phase 6 formalizes conditions, recovery timers, and v55 salinity migration
- Expansion Phase 8 activates biological aging, elderly state, and v56 migration
- Expansion Phase 9 persists breeding readiness, pending spawns, v57 migration, and inspector status
- Expansion Phase 10 reserves unborn capacity, starts juveniles near half scale, and migrates reproduction to v58
- Phase 12 species mastery is persistent account-wide state with safe normalized fields
- Phase 18 structured progression event history remains preserved by the current save schema
- old whole-fish living wobble is neutralized while turning and death remain separate
- cleanup crew species data is present and water-compatible
- shrimp and snails are separated from ordinary fish but rendered inside Fish > Other
- Phase 13 advances save schema and persists feeder automation telemetry
- bundled app contains Phase 13 automation runtime
- Phase 14 advances schema and defines shared custom-content quotas
- generated bundle contains the Phase 14 runtime paths
- Food shop In Tank filter defaults on and can be toggled off
- Generated bundle contains all Phase 15 final-polish paths
- Phase 34 older fish safely default progression fields without inferring XP from age
- Phase 37 store chance uses the exact gameplay locked pool and rounds cleanly
- Phase 37 one remaining variant is guaranteed and zero remaining is complete
- Phase 39 Debug variant bypass works in both catalog and detail selectors without erasing actual lock metadata
- Second prompt hard boundary preserves fish travel-speed and target-motion code
- Second prompt hard boundary preserves swim animation, deformation, head-tail warp, and turn smoothing
- Second prompt hard boundary preserves schooling leader and formation geometry
- Second prompt hard boundary preserves fish sizing code
- Second prompt hard boundary preserves feeding behavior
- inactive tanks and overview fish pursue and consume normal food and candy exactly once
- offscreen feeding respects expiry, refusal, diet, dead fish, and active-view handoff
- Cleanup Crew exists in initial store DOM so WebSurf observers include it
- Nerite art is enabled and Turbo remains safely hidden without assets
- Visible water facet owns the auto filter and can be cleared or unchecked
- Tool cursor persists through toolbar hover and right click ends the active tool
- Generated bundle contains the cleanup, filter, and cursor hotfixes
- Fishing lure appearance thumbnails fit inside the unchanged 64px buttons
- Background and substrate products use BubbleBodega cart purchase routing
- custom tool art is anchored at its upper-right hotspot
