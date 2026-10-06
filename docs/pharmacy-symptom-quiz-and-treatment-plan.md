# Pharmacy symptom quiz and treatment courses

Planning review: October 5, 2026. This document proposes game mechanics for Bubble Borough. No gameplay implementation is included.

User scope clarification: the supplied image is inspiration, not a required layout. Use only implemented conditions, medicines, symptom effects, and behavior clues. The requested quiz, guides, and adherence rules are the new functionality; no new illness families or invented symptoms are proposed.

Latest direction: identifying the problem is a small gameplay puzzle. Never display the diagnosis above the fish. Players use the Pharmacy questionnaire to work out treatment, or pay an optional fish telehealth vet for an answer, treatment plan, and medication delivered through the existing in-game email/inventory systems. See `docs/fish-telehealth-and-diagnosis-puzzle-plan.md` for the detailed extension.

Confirmed clinic: **Stillwater Veterinary Telehealth**, **`stillwatervet.swim`**, with the supplied `game/assets/web/proteus/sub/stillwater-vet_logo.webp` logo. It has its own site/tab/favorites, one advertising page with a consultation dialog, mostly white styling with WebSurf dark-mode support, active-tank fish selection, and a fee of **20 coins per fish**. A confirmed multi-fish consultation sends **one** email from **`consultation@stillwatervet.swim`**, listing services and then diagnosis, medication provided, and instructions per fish.

## Recommended decisions

- Add an image-based Symptom Checker above the Pharmacy product filters. Adapt the layout to the existing store rather than reproducing the mockup.
- Recommend existing medicines from selected symptoms, with short explanations and an optional fish selector for context.
- Keep the answer hidden on the fish card and other ordinary status surfaces. Show observable clues and generic care concern; reveal a case-specific answer through the questionnaire/treatment choice or a paid vet consultation.
- Use **one drop per fish per treatment day for five days** for parasites and infection.
- Use **one drop per fish per treatment day for three days** for injury recovery. This deliberately replaces the current six-hour injury recovery with a shorter course than disease treatment.
- Permit one consecutive missed treatment day: preserve completed doses, administer the next dose when returning, and move subsequent due times forward.
- At two consecutive missed treatment days, worsen symptoms once and invalidate the unfinished course. The next correct dose begins a full new course.
- Retain condition-specific guides for Osmotic Stress Treatment and Calming Serum. Water compatibility and temporary calming should not become five-day illness courses.
- Keep bottles at three drops initially, but clearly show the number of bottles needed to finish treatment. Changing bottle size or price is a separate balance decision.

The two-day rule is interpreted as **consecutive missed days**, not two isolated omissions accumulated across a course. Multiple isolated one-day delays can extend a course without resetting it. This is a proposed interpretation of the request.

## 1. Current implementation audit

### Source and build ownership

`game/public/app.js` is generated. Implement changes in `game/public/app-src/`, then rebuild with `npm run build:app`. The module manifest and function inventory are build-managed. Current working-tree changes already exist in gameplay, catalog, website, and tests; implementation must preserve them.

### Disease model

Primary code: `fish/needs-disease-and-behavior.js`, especially `infectFishWithDisease`, `processFishDisease`, `processFishDiseaseExposure`, and `getFishPrimaryCondition`.

- There are two effective disease families: parasites and infection. Legacy `generic` normalizes to parasites; legacy `viral` normalizes to infection. The Davy Jones purchase path can seed the latter.
- States are `none`, `carrier`, `incubating`, `earlySymptoms`, `visibleSymptoms`, `severe`, `recovering`, and `temporaryImmunity`.
- Untreated stage thresholds are cumulative progression: carrier below 12 hours, incubating from 12 to 24 hours, early symptoms from 24 to 48 hours, visible symptoms from 48 to 72 hours, and severe after 72 hours. These are not separate durations to add together.
- Severe disease applies one health unit of damage at a 12-hour interval when processed. Disease recovery does not itself refill missing health.
- Natural acquisition is gated by the Stable Tank milestone. Baseline daily risk is 0.1%, increased by poor cleanliness, low comfort, and crowding. New fish can arrive as carriers. Special/debug paths can bypass the unlock.
- Disease spreads through proximity and exposure. Cleanliness, comfort, shared feeding, shared hides, treatment, and disease family affect spread; infection has a lower multiplier than parasites.
- Recovering fish are currently noncontagious. Recovery grants temporary immunity lasting one to three days.
- Visible disease affects movement, color, comfort, isolation, and behavior. Actual disease-based food refusal is deterministic at severe sickness.

### Injury and health

Primary code: `fish/health.js`, `processFishConditionFramework`, and damage callers in `fish/predators-and-motion.js`.

- Fish health begins at three hearts and increases with Care Level, up to eight. One health unit represents half a heart.
- Injury is inferred from missing health; there is no independent wound diagnosis or damage-cause ledger in the primary condition model. Attacks, disease, osmotic stress, and poor comfort can all leave a health deficit.
- First Aid starts a six-hour recovery from a snapshot of starting health to maximum health.
- The existing recovery target can restore health after additional damage because it follows the original starting-health curve. A longer course must avoid erasing fresh damage automatically.
- Primary condition precedence is water stress, active disease, injury, recovery, elderly, then healthy. This is a display summary, not a complete account of simultaneous problems.

### Current medication behavior

Catalog: `game/assets/foodandmeds/food-and-meds.json`. Purchase: `store/purchases.js`. Application: `fish/feeding-and-medicine.js`.

| Medicine | ID | Current effect | Bottle / price |
| --- | --- | --- | --- |
| First Aid | `firstAid` | Click an injured fish; start six-hour health recovery | 3 drops / 8 coins |
| Calming Serum | `betaBlocker` | One tank drop calms all living residents for ten minutes and clears aggression/panic state | 3 drops / 10 coins |
| Anti-Parasite Treatment | `antiParasite` | One correct fish dose switches disease to recovering; approximately 24-hour recovery | 3 drops / 12 coins |
| Infection Treatment | `infectionTreatment` | Same recovery behavior for infection | 3 drops / 14 coins |
| Osmotic Stress Treatment | `waterStress` | Only after correct water; doubles recovery rate for six hours | 3 drops / 11 coins |

Wrong medication, a dead fish, or an empty-target click currently does not consume a dose. Preserve that behavior.

Important implementation constraints:

1. Anti-parasite and infection treatment immediately clear `diseaseRequiresTreatment` and set `diseaseTreatedUntil = now + 1`. Recovery then advances without additional medication. Extending a constant alone cannot implement daily adherence.
2. Once primary condition becomes `recovering`, the current medicine eligibility checks reject another anti-parasite or infection dose. Continuation must validate the underlying disease family and course.
3. Recovering disease advances even in poor conditions. If the new guide requires clean, compatible water for healing, the recovery engine must enforce it.
4. Disease and condition elapsed-time updates cap an interval at one day. Treatment deadlines need their own full elapsed-time reconciliation so a long absence cannot count as only one missed day.
5. The disease loop does not consistently mark every timer/progress mutation as `changed`. New course reconciliation must explicitly signal mutation for reliable saving and UI refresh.

### Visual symptoms and content settings

Primary code: `rendering/fish-and-effects.js:getFishSymptomOverlayCanvas` and disease color/behavior helpers.

- Parasites use the white-speck overlay, subject to the existing Trypophobia setting.
- Infection uses red/cloudy wound artwork, subject to gore settings.
- Health deficits use wound artwork, also subject to gore settings.
- Infection and injury marks appear only when the fish's assigned marked side faces the viewer. Quiz copy should mention checking both sides.
- Recovery currently removes active disease marks immediately. Multi-day treatment should fade marks with valid healing progress instead of making them vanish after the first drop.
- Green bubbles, hiding, drifting, and faded color are general illness clues; they do not identify a medicine reliably by themselves.
- **There is no separate fungal condition or cottony white/gray growth effect.** Do not promise fungal diagnosis/treatment from the mockup's “Fuzzy patches” card. Use “Red / cloudy patches” for the existing infection visual in the first release. A distinct fungus condition would require separate design, rendering, progression, and medication support.
- Some recorded disease signals can be broader than current behavior: `food_refused` can be recorded in the visible stage even though actual refusal is severe-only. The quiz should describe observed behavior, not treat signal history as authoritative diagnosis.

### Store, saving, pauses, and automation

- Pharmacy currently renders only product cards in `ui/main-and-store-rendering.js:renderPharmacyShop`.
- `game/index.html` contains the Pharmacy drawer. `store-facets.js` prepends the shared filter strip, and `websurf-store.js` handles virtualized catalog cards, product details, carts, and purchases. Putting the checker inside the product grid alone will not place it above the shared filters.
- Fish persistence is sanitized in `decor/layout-and-layers.js`; construction is in `fish/lifecycle-and-breeding.js`. State migrations are in `core/settings-and-persistence.js`. Current source state version is 67; use the next available version when implementing.
- `tank/simulation.js:syncState` visits every tank. Treatment progress must follow the fish ID and work in inactive tanks.
- Storage freezes fish timers and shifts them on return. Peaceful Mode pauses harmful progression and restores snapshots. New nested course timers must join both paths.
- The automated submarine carries First Aid and Calming Serum. Its First Aid path directly writes recovery fields and bypasses normal targeted medication validation. It must use the same course rules to prevent repeated doses and instant-healing bypasses.
- Existing copy is inconsistent: the medicine inventory footer says all medicine treats the whole tank; Calming Serum catalog copy says the rest of the day but the effect is ten minutes; First Aid copy implies disease support that the targeted application path does not provide. Update these alongside the feature.

### Baseline verification

- Five focused existing tests passed: deterministic disease stages/appetite, targeted medicine validation, Calming Serum/storage pause, and both osmotic-stress tests.
- The health/store-care test run had 36 passes and two failures. Both failures are existing feeding test fixtures missing `getEffectiveFishBehavior`, in the inactive-tank/offscreen tests. No gameplay source was changed in this planning review.
- Some existing feature tests also hard-code an older state version; update affected expectations carefully during implementation rather than treating them as the source of the current version.

## 2. Symptom Checker experience

### Prerequisite: make care needs visible without revealing the answer

Follow-up review of Nova's screenshots found a concrete status-presentation gap. The compact card shows Level 2, three current hearts, and “Social.” The source gives a Level 2 fish four maximum hearts, so three hearts is 75% health. `getFishPrimaryCondition` classifies an untreated health deficit as `injured`, but `getFishDisposition` does not explicitly prioritize the `injured` condition. It only surfaces health-related Sick at 45% health or below, or Stressed at 70% or below. A fish at 75% health can therefore display Happy/Social while the renderer draws injury wounds.

The compact card draws current hearts only, and does not draw the underlying condition. Its green bar is Care XP, not health or comfort. The full inspector has a separate Condition field, but that does not make the compact status understandable.

Active parasite/infection/osmotic conditions already take priority over social/flavor moods and should yield Sick, unless a more urgent panic label wins. A screenshot alone cannot establish Nova's saved disease state; the pictured mark could be an injury effect. Do not diagnose a specific disease from this image.

The user's latest direction supersedes the earlier recommendation to show condition names above fish. Address this before or alongside the Pharmacy quiz:

- Show current/max hearts on the compact card, for example “3 / 4.”
- Never put Injured, Parasites, Infection, Osmotic Stress, or a recommended medication above the fish. Use a generic care indicator such as “Needs attention,” or the existing nonspecific Sick mood, alongside visible marks and current/max hearts.
- Preserve the distinction between mood and medical state: Social/Happy may describe behavior, but a generic care indicator must prevent it from reading as an all-clear. Do not invent additional disease or mood types just to implement this presentation.
- Distinguish the Care XP bar from health in accessible/details text; do not infer comfort from its green color.
- Provide a generic “Check symptoms in Pharmacy” route. Keep low comfort separate from damage; an injured fish can still have a comfortable habitat.
- The existing inspector Condition field and named illness events currently reveal the answer. Before a case is solved, present observations or “Cause not identified”; after a questionnaire/treatment choice or paid consultation resolves it, show the saved result and treatment guide in Details/Pharmacy/mail. Diagnosis remains absent above the fish even after discovery.
- Add regression coverage for a Level 2 fish at six of eight health units with a social action and good habitat conditions: it communicates a care concern without naming injury. Also cover active infection/parasites, recovery, and simultaneous environmental trouble, with no unsolicited diagnosis disclosure.

### Placement and flow

Place a stable checker region between the category tabs and the filter strip. Display it only on the Pharmacy category listing; hide it on other categories, the store homepage, cart, and product-detail views. Keep symptom selection in session runtime state so periodic rendering or visiting a product does not clear the quiz.

1. Heading: **Symptom Checker**. Description: “Select what you see on your fish to find likely treatments.”
2. Optional “Checking: [fish / no fish selected]” control. Selecting a fish supplies public tank context and any already-discovered treatment plan; it must not prefill the hidden diagnosis or reveal unseen symptoms. Require a target before applying medication or purchasing a vet consultation.
3. Image cards with native checkbox behavior, clear labels, descriptions, and a visible selected border/checkmark.
4. “Clear symptoms” and “Find treatments” controls. Disable finding treatments with no selection, with a short hint explaining how to begin.
5. A result region directly below the checker: likely treatment based on the player's answers, why it matched, how to use it, supplies needed, and relevant care steps. The free questionnaire should help solve the puzzle, not silently inspect the fish and overwrite incorrect selections with the true answer.
6. Existing product cards remain browsable. Highlight matching products and offer “View medicine”; retain the current cart/purchase flow. Finding treatments never purchases or administers medicine.
7. After buying, offer “Treat fish” to return to the tank with the appropriate medicine and fish context. A successful dose starts the course; purchasing or selecting medicine does not start a countdown.
8. At the **bottom of the questionnaire**, show “Consult with a professional at Stillwater Veterinary Telehealth.” The link opens `stillwatervet.swim` in its own WebSurf tab without requiring quiz completion. Its single advertising page offers a consultation dialog for selecting one or more fish in the active tank, reviewing **20 coins per fish**, and confirming payment. One email from `consultation@stillwatervet.swim` covers the selected fish with per-fish diagnoses, supplied medicines, and instructions; medicine is added to inventory without applying it.

### Initial symptom catalog

| Player-selected symptom | Image reference | Recommendation behavior |
| --- | --- | --- |
| Small white spots | Existing white-speck effect on a neutral fish | Strong parasite match; Anti-Parasite Treatment |
| Red sores / cloudy lesions | Existing infection mark on a neutral fish | Strong infection match; Infection Treatment |
| Cuts / scratches / wounds | Existing injury mark on a neutral fish | First Aid; note it repairs missing health and does not clear active disease |
| Faded / dull color | Healthy-versus-faded comparison | Nonspecific; ask for a distinctive mark and check water/comfort |
| Slow swimming / hiding / isolation | Short game-style example or still with descriptive caption | Nonspecific; care checks and a follow-up question |
| Refusing food | Food offer example | Nonspecific; can indicate severe illness, panic, or another refusal cause |
| Green bubbles | Existing disease bubble effect | General illness clue; ask for a distinctive mark before recommending a disease medicine |
| Panicked / aggressive behavior | Chase/panic example | Calming Serum as temporary support; address the underlying tank conflict |

Water mismatch should be a contextual question or selected-fish check, not an invented visual symptom. Add “Is this fish in its required water type?” where color or behavior alone leaves the result ambiguous.

Use the same existing fish sprite, size, lighting, and crop across physical-symptom images. Include a healthy reference. Prepare examples from existing game art and effects; no new symptom artwork or real fish-health photos are required. When symptom art is restricted by content settings, use the existing unmarked fish sprite and text/behavior clues. No automatic selection of unseen symptoms. The first screen can contain just the three distinctive physical symptoms, with existing color, bubble, and behavior clues in a compact optional section.

### Recommendation rules

Use a small deterministic rules table rather than probabilities or an AI diagnosis service:

- Distinctive marks yield their corresponding treatment candidate, with an explanation tied to the selected card.
- White spots plus wounds yields parasite treatment plus possible First Aid support for the health deficit.
- Red lesions plus wounds yields infection treatment plus possible First Aid support.
- White spots plus red lesions is ambiguous for a single fish because the current model stores one disease family. Ask which mark is present on the target fish or whether multiple fish are affected. Do not advise blindly using both disease medicines.
- Generic color/behavior clues alone produce “More information needed,” with distinctive-image choices and water/cleanliness/comfort checks. No universal medication recommendation.
- Confirmed incompatible water takes priority: guide the player to move the fish into compatible water or correct the tank where appropriate, then explain optional osmotic recovery support. Disease/injury recommendations can remain visible as other issues.
- A selected fish with an already-discovered case or accepted course can show “Continue current course,” remaining doses, and the next due time inside the Pharmacy/Details guide.
- Revalidate the actual fish immediately before administering. If a recommendation does not match, reject without consuming stock and use a generic explanation such as “This treatment does not match these symptoms. Recheck the questionnaire.” Do not reveal the true diagnosis in rejection text. A correct accepted treatment choice confirms the solved case and unlocks its guide; a paid vet consultation reveals it directly. The quiz result is advisory; dose validation is authoritative.

Keep ordinary product search/facets independent of symptom matching. Recommendations stay visible even if an unrelated price or seller filter hides the associated product; explain the active filter and provide a way to reveal it. Recommendation cards must not use the generic `.shop-card` class and accidentally become products in cart/filter/virtualization code.

## 3. Treatment guides and timing

### Proposed regimens

| Condition / medicine | Instructions | Completion |
| --- | --- | --- |
| Parasites / Anti-Parasite Treatment | One drop on the affected fish every treatment day; five valid doses | Five doses plus the final 24-hour healing interval |
| Infection / Infection Treatment | Same five-day course | Same |
| Missing health / First Aid | One drop on the affected fish every treatment day; three valid doses | Three doses plus the final 24-hour healing interval; repair only the deficit assigned to that course |
| Osmotic stress / Osmotic Stress Treatment | Correct water first; optional one drop boosts recovery for six hours | Retain 24-hour baseline recovery and 2x boost; show expected remaining recovery, with no dose requirement |
| Panic/aggression / Calming Serum | One drop into the tank when needed | Ten-minute effect; show expiry, no daily healing course |

For Osmotic Stress Treatment, reject an extra drop while the existing boost is active without consuming it. For Calming Serum, show the active effect and prevent accidental repeated drops while it is active. Environmental care continues to matter.

### Exact missed-day policy

Use elapsed **24-hour treatment days**, anchored to successful doses, rather than midnight/local calendar dates. This avoids a late-night first drop requiring another dose minutes later, and avoids daylight-saving/timezone ambiguity. Display absolute due time and time remaining.

After a successful dose at time `t`:

- `[t, t + 24h)`: today's dose is administered. Reject another dose for the same course without consuming inventory.
- `[t + 24h, t + 48h)`: the next dose is due; the player may administer it normally.
- `[t + 48h, t + 72h)`: one scheduled day has been missed. Preserve completed doses; show “One day missed—give the next drop now.” Accept one dose, and set the following due time to 24 hours after that actual dose.
- At `t + 72h`: two scheduled days have been missed. Apply the relapse once, reset valid dose count/healing progress to zero, and mark the course “Restart required.” A correct dose at or after this instant becomes dose one of a new course.

This rule applies only while additional doses remain. After the last required dose, there is no next dose to miss; finish the final observation/healing interval. Poor environmental conditions can delay completion but must not manufacture an extra medication requirement.

Examples for a five-day course:

- Doses at hours 0, 24, 48, 72, and 96; healing completes at hour 120.
- Dose at hour 0, miss the day beginning at hour 24, return and dose at hour 50: retain dose one, record dose two, then doses at 74, 98, and 122; complete at hour 146.
- Dose at hour 0, no more medication through hour 72: relapse and restart required. Dose at hour 80 is new dose one; the previous drop does not count toward the new course.
- Repeated clicks, reconnects, or auto-care attempts during a completed dose interval never add credit or use another drop.

### Healing, grace, and relapse

- A correct first disease dose stabilizes the fish, stops disease-related severe damage while the course is valid, and reduces contagion to the current recovering behavior. Other hazards remain active.
- Preserve disease family and pre-treatment severity separately from display condition. Fade marks and restore disease-related behavior gradually as valid healing progresses. Still show the original diagnosis and “Treatment: 2 of 5 drops.”
- Healing advances during dose coverage in compatible water with sufficient cleanliness/comfort. The one-day grace interval preserves progress but does not grant unmedicated healing. Show “Healing paused” when conditions or coverage are insufficient.
- Completion requires both the dose count and the required healing time. Each accepted dose provides one day of healing coverage. If all doses are given but water/comfort blocked healing, the final observation stage remains supported until the remaining healing time completes in good conditions; do not require endless additional doses. This completion rule is an explicit proposed game mechanic, not an existing medication effect.
- At relapse, cancel treatment protection, restore the original disease family, and move symptoms one severity step above the course's starting stage, capped at severe, with at least visible symptoms. Restart normal disease progression/damage from the relapse boundary. Show more pronounced marks/slower behavior. Do not apply a separate arbitrary health penalty on top of ordinary disease damage.
- Apply one relapse event per failed course. Subsequent absence follows ordinary disease progression, without repeated reset penalties each frame or day.
- For injury, reset the unfinished course and healing credit, make wound symptoms more pronounced, and resume the damaged condition. Retain legitimately restored hearts; do not subtract already-earned healing just to punish a missed day. Fresh damage remains real and is not overwritten by a stale recovery target.
- A new course receives a new ID and snapshot. Continue the same diagnosis unless gameplay changed it; switching brands/medicines must not reset deadlines or bypass failure.

### Guide locations and sample copy

Show generic medicine regimens in quiz results, product details, and Fish Care inventory/tray. Show the actual fish's diagnosis and case-specific regimen only after an accepted correct treatment choice or paid consultation, in Details/Pharmacy/mail; never above the fish. The discovered treatment panel shows progress slots, next due time, stock, care blockers, and remaining treatment duration. Keep course progress distinct from symptom severity and health hearts.

Example:

> **Anti-Parasite Treatment** — Give one drop to this fish every 24 hours for five treatment days. Finish all five doses even if spots fade. If you miss one day, give the next drop when you return; your finish time moves later. If you miss two consecutive days, symptoms worsen and the full course must restart. Do not give extra drops to catch up.

Use event history and existing in-game notifications for a newly due dose, one-day delay, relapse, and completion. Deduplicate events and combine multiple fish into useful summaries; no per-frame warnings or new external reminder service.

## 4. Data and engine design

### Shared definitions

Add a single treatment-definition table keyed by medicine ID with target, condition family, required doses, interval, grace policy, healing time, and instruction text. Quiz mapping, shop guides, dose validation, and simulation should consume these definitions. Keep price, bottle size, and artwork in the existing catalog.

### Per-fish courses

Persist a small `treatmentCourses` object with separate `disease` and `injury` slots, since disease and missing health can coexist. Do not use the one primary display condition as medicine eligibility.

Each slot should contain validated fields such as:

```text
schemaVersion, courseId, medicineId, conditionFamily
status: active | delayed | restartRequired | observing | complete
requiredDoses, dosesGiven, startedAt, lastDoseAt, nextDoseAt
coverageEndsAt, healingProgressMs, lastEvaluatedAt
startingSeverity, relapseAppliedAt, completedAt
injuryHealingBudgetUnits, injuryUnitsRestored   (injury only)
```

Required dose count and intervals come from known definitions; saved values are sanitized and versioned, not trusted arbitrarily. Bound counters and timestamps. Retain at most the current/recent course per slot; full history belongs in the existing event log.

Quiz choices and result visibility are runtime state, not clinical state. Persist discovered case information separately, keyed to the fish and current illness/damage episode; do not treat an old diagnosis as knowledge of every future illness. Bottle inventory remains global drop counts. Course identity follows fish identity when moving between tanks. See the telehealth extension for episode identity, paid consultation records, and answer disclosure rules.

### One dose entry point

Propose `getFishMedicationEligibility`, `administerFishMedication`, `reconcileFishTreatmentCourses`, and `getFishTreatmentGuide`. Names may change during implementation.

The administration path must reconcile deadlines at the provided `now`, validate target/type/course/stock/duplicate timing, consume exactly one dose, update the course, and then emit effects/events/save changes. Manual clicks, the treatment-panel button, and automated care call this same operation. Rejected actions do not alter stock or healing.

For First Aid, track a bounded healing budget based on the deficit assigned to the course. Restore units against that budget rather than setting health to an old absolute target every tick. Damage during a course must not be erased by its next tick; show any remaining deficit after completing the assigned healing budget.

### Simulation and elapsed time

Reconcile treatments before condition/disease progression and before accepting a new dose. Process relevant interval boundaries chronologically: dose coverage end, one-day miss, two-day relapse, final observation end, and boost expiry. Do not use only the status at `now` to apply one multiplier to an entire elapsed interval.

Derive missed-dose failure from persisted timestamps across the full absence, independent of the old one-day progression clamp. Keep any limits on ordinary offline damage consistent with existing game policy and documented in tests. Do not silently increase all offline damage as part of this feature.

Persist relapse/dose identity so reloads cannot reapply a penalty or count a dose twice. Reconcile twice at the same timestamp with no further mutations. Handle a backwards clock without manufacturing healing or immediately invalidating a course; preserve remaining intervals and prevent duplicate dose credits. The existing local save model cannot provide full tamper-proof timekeeping.

### Pauses and migration

- Preserve active one-dose legacy recoveries as legacy completion paths until they finish; do not impose four unexpected new drops on already-treated fish.
- New treatment starts use the new definitions. Untreated fish retain their disease/health state and can begin a course normally.
- Preserve owned stock, medicine IDs, prices, and unrelated save fields. Migration is idempotent.
- Pause nested course times and healing progress in Storage and Peaceful Mode; resume with the same remaining due intervals. Include pause snapshots and avoid shifting the same interval twice.
- Tank travel does not restart a course. A moved fish is validated against its current water and receives events in its current tank.
- Death/rehome/removal ends live scheduling; history can keep the treatment record without reminders or healing after death.
- The submarine continues its supported First Aid/calming roles but schedules only eligible doses through the shared entry point. Parasite/infection auto-care inventory support is a separate follow-up; do not imply it already exists.

## 5. Supply and economy

With current three-drop bottles, a five-dose disease course needs two bottles for a fish with no stock: 24 coins for parasites or 28 for infection, with one drop left. A three-dose First Aid course needs one bottle at eight coins.

Show:

- “5 drops required · 2 owned · 3 more needed.”
- “1 bottle covers the remaining course” where appropriate.
- For multiple explicitly selected fish, calculate remaining drops across their courses; a bottle is not automatically one course for an entire tank.
- Preserve purchase choice and the existing cart. Offer the required bottle quantity visibly without adding purchases automatically.

The longer disease treatment also increases stabilization time and daily interaction. Playtest stock affordability, visual improvement, and missed-day forgiveness before adjusting prices or bottle sizes. Keep known disease prices unchanged in the initial implementation.

## 6. Implementation sequence

1. **Definitions and course engine:** finalize timing constants and regimens; build shared eligibility, atomic dose recording, boundary reconciliation, healing budgets, and relapse behavior. Add meaningful time-boundary tests first.
2. **Persistence and compatibility:** sanitize nested course records; migrate legacy recoveries; integrate Storage/Peaceful Mode, all tanks, death/removal, and submarine application. Register any new fragments in the bundle manifest.
3. **Puzzle and quiz UI:** replace automatic diagnosis disclosures on normal status surfaces with observable clues; create the stable Pharmacy-only checker region, existing sprite/effect examples, symptom rule table, ambiguity follow-ups, and clear result states. Integrate storefront navigation, filters, virtualization, and focus behavior.
4. **Treatment guides:** expose shared instructions and live progress in product details, inventory/Fish Care, and inspector. Correct stale copy. Show bottle requirements and care blockers.
5. **Visual progression and events:** fade marks using course healing progress, restore stronger symptoms on relapse, respect content settings, and add deduplicated treatment events.
6. **Validation and playtest:** verify saves, offline boundaries, missed doses, all supported medicines, and desktop/mobile Pharmacy flow. Rebuild generated assets/bundle and run the repository's required checks.

## 7. Acceptance checks

### Quiz/store

- White spots recommends parasites; red/cloudy lesions recommends infection; wounds recommends First Aid.
- Nonspecific clues do not yield an unjustified medicine; conflicting disease clues request clarification.
- Water mismatch is addressed before osmotic medication; multi-condition support is clearly separated.
- Quiz selections survive product navigation and ordinary render updates. Clear symptoms affects only the quiz.
- Recommendations do not become cart products, facet counts, or virtualized catalog entries.
- Existing search/facets/cart behavior remains correct. Hidden filtered recommendations explain how to reveal a product.
- Keyboard, screen-reader labels, touch targets, selected states, mobile wrapping, and restricted artwork all work.
- Fish cards, unsolved inspector fields, event history, notifications, tooltips, accessibility text, and rejected medicine actions do not reveal the hidden diagnosis. Product instructions remain useful as general educational clues.
- The questionnaire bases recommendations on the player's choices. The optional vet identifies the actual case only after a successful paid consultation.

### Treatment engine

- Normal five-day course completes only after five valid doses and covered healing time; three-day injury course follows its own definition.
- Test exact instants immediately before/at/after 24, 48, and 72 hours since the last dose.
- One missed day preserves dose/healing progress and moves due time after the late dose.
- Two consecutive misses apply one symptom setback and require a fresh course; two isolated single-day delays do not.
- At the last dose, no nonexistent future dose can become missed. Care blockers can delay healing without forcing extra drops.
- Wrong/dead/healthy target, already-administered dose, no stock, incompatible water, and active support effect do not consume a drop.
- Disease family remains available during recovery; disease and injury can coexist without primary-condition precedence blocking correct treatment.
- Relapse restores ordinary disease behavior/contagion; a healthy course protects only against the treated disease, not attacks or unsafe water.
- Fresh injury damage cannot be overwritten by old healing targets.
- Ten-minute calming and six-hour osmotic boost keep accurate guides and expiry behavior.

### Persistence/integration

- Reload, inactive tank, tank transfer, long offline absence, repeated reconciliation, clock rollback, and automation cannot duplicate doses or relapse events.
- Stored fish and Peaceful Mode do not miss doses during paused time.
- Legacy saves preserve existing recoveries and stock; malformed records sanitize safely.
- Submarine medication shares validation and cannot administer First Aid every retry interval during a course.
- Death/rehome removes live treatment scheduling and prevents further doses.
- Restore baseline failing test fixtures before relying on the full suite; run course/quiz tests, relevant save/navigation/medicine regressions, then `npm run build:app` and required repository checks. Broaden tests when failures or affected paths justify it.

## Scope kept for later

New disease families, real-world fish diagnosis, additional submarine medicine storage, new external reminders, and bottle-price rebalance are outside this implementation. The optional in-game telehealth site is planned separately for a later phase. Existing game mechanics govern all symptom choices and medicine matches; the mockup is optional visual inspiration.
