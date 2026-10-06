# Stillwater Veterinary Telehealth and diagnosis puzzle

Planning extension: October 5, 2026. No gameplay or website implementation is included.

This extends `docs/pharmacy-symptom-quiz-and-treatment-plan.md`. The latest user direction is authoritative: no diagnosis above a fish; the BubbleBodega Pharmacy questionnaire is the normal way to solve a small care puzzle. A paid telehealth vet is an optional shortcut that sends the answer and treatment plan and provides medication. The first vet website should be plain and functional.

Confirmed specification: **Stillwater Veterinary Telehealth**, at **`stillwatervet.swim`**, charges **20 coins per selected fish in the active tank**. One confirmed consultation can cover several fish and produces **one email** from **`consultation@stillwatervet.swim`**, broken down per fish. The initial website is one advertising page with a consultation dialog; it has its own WebSurf tab and favorites support. These requirements replace the earlier placeholder brand, 40-coin fee, all-tank selector, and separate report-page proposal.

## 1. Gameplay contract

The two routes provide different kinds of help:

| Route | Player action | Result | Cost |
| --- | --- | --- | --- |
| Pharmacy puzzle | Observe existing marks/behavior, select symptoms, answer a few follow-ups | A likely medicine and instructions based on those selections; a correct applied treatment confirms the case | Free questionnaire; ordinary medication purchase |
| Stillwater shortcut | Select one or more fish in the active tank and confirm a consultation | Actual diagnoses, treatment plans, and prescribed medication; one email containing a section for each fish | 20 coins per selected fish |

The paid route skips identification. It does not skip administering drops, environmental corrections, healing time, or missed-day consequences. Both routes use the same treatment definitions and dose engine.

Do not add new diseases, a real AI clinician, multiplayer staff, or external medical services. This is a deterministic game service examining the implemented fish state.

## 2. Clues without automatic answers

### Above the fish

Keep name, Care Level/XP, current/max hearts, feeding indicators, and mood. If illness/damage requires care, add a generic concern indicator such as “Needs attention.” Do not show the specific condition or medicine, even after that condition has been discovered.

A Social or Happy mood can remain a behavior description, provided the concern indicator is visible. An alternative compact layout can replace the mood with the existing nonspecific Sick status during illness. No new clinical labels are needed.

The puzzle clues are existing effects: white specks, red/cloudy lesions, wound marks, color changes, green bubbles, hiding/drifting, food refusal, health deficits, and water/tank context. Show behavior clues in text when artwork is restricted by content settings, so turning off symptom art does not make solving impossible. Do not infer a diagnosis solely from vague behavior.

### Other ways the current game gives the answer away

The implementation review found existing named disclosures in the inspector, condition-change events, and medicine rejection text. Audit all ordinary player-facing surfaces before considering the puzzle complete:

- Before discovery, the inspector should show observations or “Cause not identified,” not the internal primary condition.
- Condition events should say the fish appears unwell, has visible marks, has lost health, or needs care. Store event semantics separately from displayed text so historical entries do not continue revealing an unsolved answer.
- Notifications, recaps, task explanations, tooltips, screen-reader text, store auto-filters, and purchase-arrival illness messages need the same rule.
- Invalid medicine use remains free of stock consumption, but rejection should not say “This fish has parasites instead.” Provide a generic mismatch message and a route back to the questionnaire.
- Generic product descriptions may explain what a medicine treats. Those are intentional learning clues, not a diagnosis of the selected fish.
- A completed questionnaire recommendation stays based on player input. Selecting Nova must not automatically highlight the correct symptom or make a background state check answer the questionnaire.
- Debug tools may show internal conditions; ordinary play should not.

The paid shortcut is convenience. Players can learn the small set of symptom/medicine relationships, and can guess a treatment. Do not add penalties or consume wrong drops solely to force vet purchases. A successful correct treatment choice is a legitimate puzzle solution.

After solving, the answer and treatment progress can appear in Pharmacy, Details, or the saved consultation email. Above-fish presentation remains generic.

## 3. Single-page Stillwater website

Name: **Stillwater Veterinary Telehealth**. In-game WebSurf domain: **`stillwatervet.swim`**. Sender: **`consultation@stillwatervet.swim`**.

Use the supplied logo at `game/assets/web/proteus/sub/stillwater-vet_logo.webp` for the page identity, tab icon, and bookmark icon. The asset's folder location does not make Stillwater part of Proteus. Keep it at its existing path initially; no redraw or asset move is required.

Use the existing WebSurf window and navigation conventions, with **one website page** at first. The consultation is a dialog or inline expanded form on that same page, not another website page. Confirmation returns to the advertising page with a status message and a button to open the consultation email. Saved reports live in the existing inbox/Details; do not add a separate report list or report page to the initial site.

### Page content and consultation dialog

1. **Advertising page:** supplied logo, service name, a short explanation of fish assessments, diagnosis, prescribed medication, and treatment instructions; “20 coins per fish”; primary “Get a vet consultation” button. Explain that the report arrives by in-game email and medicines are added to Fish Care.
2. **Fish selection dialog:** identify the active tank by name; list its living owned fish with native multi-select checkboxes, name/species, and a neutral preview. Do not list fish from other tanks or Storage, and do not label diagnoses in the picker. Start with no fish selected. The player chooses explicitly rather than having the whole tank selected automatically.
3. **Review/confirmation state within the dialog:** show selected fish names, number selected, 20-coin unit price, total, current wallet balance, and medication inclusion. Button: “Confirm consultation — 40 coins” for two selected fish, with the correct live total. Cancel/back remain available before confirmation; navigating to the website or opening the dialog never charges.
4. **Success:** one confirmation with receipt/reference, “Your consultation email is in your inbox,” and “Open email.” Medicine is already delivered; opening email is not a claim step.

Keep public observations from a Pharmacy draft only as optional context. The shortcut must work without answering the questionnaire.

### Light and dark mode

Light mode should be mostly white: white page background, dark readable text, pale neutral section borders, and a restrained cyan/blue accent from the logo. Use ordinary layouts and controls; prioritize functionality over decoration. Keep the logo modestly sized so it does not dominate the content.

Inherit the existing WebSurf dark-mode preference. Use dark page/panel backgrounds, light text, and visible controls/borders in dark mode; do not leave the advertising page or dialog bright white. The supplied logo can remain unchanged. Style both the page and dialog for keyboard focus, error/disabled states, mobile width, and readable contrast in both themes.

### Domain, tab, favorites, and Pharmacy referral

- Register Stillwater as its own site identity and domain, with its own open/close/reopen tab behavior, address-bar value, title, and logo. Opening it must not select Proteus, Clearwell, or a subsidiary page or reuse their active tab identity.
- Visiting from Pharmacy opens or focuses a Stillwater tab, preserving the Bodega tab and questionnaire draft. Revisiting focuses the existing Stillwater tab instead of accumulating duplicates.
- Support standard favorites/bookmarks, history, back/forward, manual address entry, and restoration through the existing WebSurf mechanisms. A favorite points to `stillwatervet.swim` and opens that site's own tab.
- Add a link **at the bottom of the Pharmacy questionnaire**, visible before completion: “Consult with a professional at Stillwater Veterinary Telehealth.” It opens the advertising page, where the player chooses to consult and pay.
- Do not require discovery of Proteus or borrow another site's access gate. Stillwater is independently accessible. The registry may make it discoverable like the other ordinary sites; the Pharmacy link remains its clear entry point.

## 4. Confirmed price and medication inclusion

The price is **20 coins per fish**, including services and prescribed medication. It is a user requirement, not an adjustable 40-coin proposal. Store the unit price in one constant and calculate `total = uniqueSelectedFishCount * 20`. Do not add separate prescription costs at checkout or scale price according to hidden diagnosis.

Examples: one selected fish costs 20 coins; two cost 40; three cost 60. One grouped consultation yields one debit/receipt and one email, not one transaction/email per fish.

The fixed price can be quoted without revealing the medicine/condition. Keep ordinary Bodega medication prices unchanged. Clinic pricing is its own bundled service; do not raise the user-specified fee to match retail bottle costs.

Only prescribe what the existing game needs. Include First Aid when repairing the current health deficit is part of the plan. Osmotic recovery medication is optional support because correcting water already permits recovery; Calming Serum is temporary support. Show optional support distinctly rather than automatically charging for it as mandatory medicine.

Recommended fulfillment: provide the remaining required treatment drops for each assessed fish, using the existing medicine IDs and drop-count inventory. A new five-dose disease plan supplies five drops; a new three-dose injury plan supplies three. An already-active course supplies only its remaining required doses. These are clinic prescription quantities, not new inventory item types; ordinary retail bottles still contain three drops. Existing personal stock is retained and is not deducted or silently used instead of providing the clinic prescription.

When several selected fish need the same medicine, sum their prescribed quantities once for the inventory delivery, while recording each fish's allocation in its email section. For example, two new parasite courses supply ten total anti-parasite drops. Do not count the same existing stock independently for multiple fish or round every fish's allocation into extra retail bottles.

Existing reports remain freely readable. Do not automatically charge for a relapse or to rediscover the same answer. A player can deliberately request a new assessment at the displayed 20-coin price, but reopening a report or retrying the same submission is never a new purchase. Deduplication must use a consultation/submission ID, not permanently prohibit all future consultations for that fish/case.

A healthy fish can be selected for a paid assessment. After confirmation, the email records the assessment, “No active condition identified,” and “No medication indicated.” Do not reveal that answer for free in the picker or change the bill according to hidden health state. Medication is provided only when indicated; advertise this clearly. Dead, removed, or stored fish are not eligible.

## 5. Payment-to-delivery flow

1. The Pharmacy referral or ordinary WebSurf navigation opens Stillwater's advertising page in its own tab. No charge.
2. “Get a vet consultation” opens the dialog and captures the current active tank ID. The player selects one or more fish from that tank. Require at least one fish before continuing.
3. Show and confirm `20 * selectedCount`, selected names, wallet balance, and included services. Keep hidden diagnosis details out of the unpaid UI.
4. At the purchase action, reconcile simulation and revalidate the same active tank, every selected fish's membership/ownership/life state, wallet balance, and the consultation submission ID. If a fish moved/died or the active tank changed, stop before charging and refresh the selection/quote for explicit reconfirmation; never silently bill fewer fish or substitute another fish.
5. Build per-fish assessment snapshots and prescriptions using actual implemented disease, injury, osmotic, and treatment state. Do not merely trust the player's previous symptom choices. Aggregate medicine grants across the selected fish.
6. Commit one total coin debit, one receipt, one grouped consultation record, each case's discovered knowledge, aggregate medicine increments, and **one** inbox message together. Failure leaves no partial charge/delivery; the grouped operation is all-or-nothing.
7. Save the complete result; update unread mail, stock, and the site completion state. Deliver promptly without making the player wait for a fake appointment. One notification announces the email, rather than separate notifications per fish.
8. The player opens the email and manually administers the medication. **The treatment countdown starts with the first successful dose, not payment, delivery, or opening the email.**

No extra “claim medicine” step in the first version: medicine is added once at payment completion and the email reports delivery. This avoids a second inventory-claim state and makes lost/trashed email recoverable through the site. Opening, forwarding within the game if available, refreshing, or restoring an email must never grant medicine again.

## 6. Email and saved report

Use the existing **in-game WebSurf inbox** for the first version. This planning assumption fits the game's current automated fulfillment emails; it does not add a real email integration or send any messages during planning.

Sender: **`consultation@stillwatervet.swim`**. Suggested subject: “Your Stillwater consultation — 2 fish.” Before payment, inbox previews or notification text must not expose a pending answer. After payment, the report may disclose it. Use one message for all selected fish, including a one-fish consultation.

Email ordering:

1. **Services rendered:** consultation reference, date, active tank at assessment, fish count, 20 coins per fish, total paid, and service list: assessment, diagnosis, prescribed medication, treatment instructions. Include a per-fish service line charged at 20 coins so the bill is clear.
2. **One section per fish**, in selection order. Each section has fish name/species, then diagnosis, medication provided (medicine name and exact drops delivered, or no medication indicated), and treatment instructions. Keep diagnosis distinct from any health deficit/environmental contributor; explain water correction before an osmotic treatment.
3. **Treatment instructions per fish:** source the regimen from shared definitions, with target, drops, interval, required/remaining doses, healing time, and the one-/two-missed-day rules. Provide the fish-specific care blockers and actions. Grouping the invoice does not combine the fishes' treatment courses.
4. **Actions:** fish-specific “View fish”/“Open Fish Care” buttons, plus a general Pharmacy link. Each action resolves the stored fish ID rather than trusting a current fish name.

The original email is a dated snapshot. Details/Pharmacy can show live remaining doses and current status after discovery. Label changes clearly: “Assessed October 5” versus “Current course: restart required.” Do not silently rewrite an old conclusion when a fish later develops a different disease. No additional report webpage is required in the first version; reopening the email is free and never grants medication again.

Email text should not call symptom disappearance a completed cure. Both routes finish the same required regimen. Telehealth provides guidance and stock, not instant healing.

## 7. Episode identity and knowledge

Persist discovered cases and consultations separately from simulation conditions. Suggested records:

```text
careCases: {
  caseId, fishId, episodeSignature, openedAt,
  identifiedAt, identifiedVia: treatmentChoice | vet,
  conditionSnapshot, planVersion, consultationId
}
vetConsultations: {
  consultationId, submissionId, activeTankId, assessedAt,
  unitFee: 20, totalFee, receiptId, emailId,
  fishReports: [{ fishId, caseId, diagnosisSnapshot, planVersion,
                  prescribedMedicine, deliveredDropCounts }],
  aggregateDeliveredDrops, deliveredAt
}
```

Build the episode signature from a stable disease infection identity and, where necessary, an injury event identity. The current injury model has no damage episode field, so add a minimal injury episode marker in shared damage handling/sanitization if needed. This identifies a problem instance; it does not introduce a new illness.

Do not use current health quantity, current tank, mood, severity, or symptom fade alone as a new episode key: those change during normal treatment and could trigger extra charges or lose the solved answer.

- Tank travel and rename preserve the same case/report.
- Ordinary worsening and a missed-day relapse remain part of the same case; keep the diagnosis available and update the treatment guide.
- A new infection after recovery creates a new undiscovered episode.
- New physical damage after the prior injury heals can create a new injury episode. Additional damage during an open injury case updates that case and its healing needs without inventing a new fee.
- Medication stock already delivered is ordinary inventory; later spending it elsewhere does not make reopening the report deliver another dose.
- Storage/Peaceful Mode preserve discovered knowledge while pausing treatment time. Consultations for stored fish can be unsupported initially; show “Move this fish to a tank to request care.”
- Death/rehome prevents new consultation purchases, but preserves paid reports as history.

For old saves, do not silently forget active treatment knowledge: existing recovering fish can keep their known legacy treatment plan. For untreated cases, the hidden-answer policy should apply without changing the fish's actual condition or forcing a fee.

## 8. Reuse and gaps in the existing code

- **WebSurf:** `decor/customization.js` provides the site registry, URL resolution, navigation, bookmarks, and history. Add an independent `stillwater` entry for `stillwatervet.swim`, its own route/open handler, destination mapping, page container, tab and visibility integration in the existing store/WebSurf render path. Include session-page normalization, tab persistence and bookmark restoration; the current lists of site identities are explicit in several places.
- **Separation:** do not register Stillwater as a Proteus subsidiary page or use a `data-websurf-subsidiary-site` identity simply because the logo sits in that asset folder. It has a separate domain, container and tab. Hide Bodega filters, product panels, and other sites while Stillwater is the active page; preserve them when navigating back.
- **Context:** current WebSurf URL normalization rejects query strings. Keep the one-page route at `stillwatervet.swim`; carry selection/dialog context in runtime state. Email actions use trusted persisted consultation/fish IDs, not unsupported query URLs or extra initial website pages.
- **Styling/assets:** reference the supplied logo via existing asset helpers, include it in the asset manifest, and use the WebSurf theme attribute for page/dialog colors. Verify direct white/light styling does not bypass dark-mode overrides.
- **Payment:** `store/purchases.js:performCoinTransaction` supplies wallet debits and receipts, but only rolls back coins if application fails; it is not a general rollback for inventory, mail, and case mutations. Build/validate the complete mutation first and commit it as one saved state, with explicit failure restoration if necessary.
- **Email:** `ui/management-and-overlays.js` already queues fulfillment mail, resolves templates, renders bodies, routes actions, and updates unread status. Add a dedicated vet report template/render path and safe report actions; reuse the existing inbox.
- **Email persistence:** `core/settings-and-persistence.js:sanitizeWebSurfSentEmails` currently preserves a small field whitelist. Add a sanitized consultation reference for the single email, and sanitize the canonical grouped fish reports in `vetConsultations`. Do not assume a single `fishId` field can represent a multi-fish report or store the only copy in rendered HTML.
- **Templates:** `game/assets/web/websurf/auto_emails.json` holds automatic email content. Keep treatment instructions sourced from shared definitions so quiz, vet site, and email do not disagree.
- **Stock/doses:** use the existing medicine IDs, bottle sizes, global inventory, Fish Care selectors, and new shared course engine. Grant stock only; never bypass medication eligibility or automatically start healing.
- **Disclosures:** route ordinary displayed status/event text through case-discovery policy without changing disease simulation, internal condition IDs, or debug introspection.

No cloud API, external email service, real login/account, real payment processor, or public site hosting is needed for this game feature.

## 9. Implementation phases

1. Finish the course engine and Pharmacy questionnaire in the parent plan; include generic care clues and removal of automatic answer disclosures.
2. Add persistent episode/discovery records and free access to known case guides. Confirm questionnaire guesses and correct doses behave fairly.
3. Add Stillwater's single advertising page using the logo, own domain/tab/favorites, light/dark modes, and the bottom-of-questionnaire referral link. Add the active-tank multi-fish dialog and 20-coin-per-fish review state.
4. Implement the grouped consultation transaction, per-fish report sections, one-time aggregate stock delivery, one inbox message from `consultation@stillwatervet.swim`, and safe email actions/reopening.
5. Validate payment/persistence failure cases, all existing conditions, and pause/tank/ownership changes.
6. Playtest the user-defined 20-coin service and convenience value without substituting a different price. Richer vet interaction or additional site pages are later scope.

This document specifies Stillwater's first version. Keep the free Pharmacy puzzle independently usable whether the clinic is implemented in the same release or a later phase.

## 10. Acceptance checks

- Above-fish text never names the diagnosis or medicine, before or after discovery.
- An unsolved inspector, event log, tooltip, notification, arrival message, or screen-reader label does not reveal the answer.
- The free questionnaire remains useful and accessible with restricted symptom art; it never requires a vet purchase to finish.
- Selecting a fish does not prefill symptoms or silently replace the player's answers with the actual diagnosis.
- Consultation navigation is free; charging occurs only on the clearly priced purchase action.
- Only living owned fish currently in the active tank appear in the selector. Hidden condition/health state does not decide which eligible fish are listed or reveal the answer.
- Price is exactly 20 coins per unique selected fish. Zero selection cannot proceed; 1/2/3 fish quotes are 20/40/60. The final confirmation lists names and total.
- Insufficient coins, dead/rehome/stored/moved target, changed active tank, or transaction failure produces no unwanted debit or partial stock/mail. A healthy selected fish can receive a paid assessment with no unnecessary medication.
- Double clicks, reloads, navigation back, message reopening, and restored saves do not charge twice or deliver medicine twice.
- A successful purchase creates one receipt, one grouped dated report, exactly one email from `consultation@stillwatervet.swim`, and the correct aggregate drop increments. Services appear first, followed by diagnosis, medication provided and instructions grouped per fish.
- Prescriptions account for disease plus health deficit where applicable, and distinguish required water correction from optional medication support.
- Existing reports reopen freely; a relapse shows restart guidance without charging to rediscover the same condition.
- Reports remain dated snapshots; a new illness does not inherit the old episode's discovered answer.
- Medicine delivery does not administer a drop or start the treatment deadline.
- Paid and free treatment paths obey identical healing, stock consumption, missed-day, pause, and environmental rules.
- WebSurf route, bookmarks/back/history, email unread/delete/restore/actions, wallet receipts, and save migrations remain compatible.
- Stillwater uses the supplied logo, its own domain/tab and favorite entry; it never opens under Proteus, Clearwell, or Bodega identity. Revisiting reuses its tab.
- The initial website has one advertising page. Selection/review/success are dialog or inline states, not extra pages or a report directory.
- Light mode is mostly white; page, dialog and controls adapt to WebSurf dark mode. The Pharmacy referral is at the bottom and can be used without completing the questionnaire.
