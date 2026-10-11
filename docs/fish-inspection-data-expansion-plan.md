# Fish inspection data expansion plan

Planned and implemented October 10, 2026. The original design and data mapping follow; implementation verification is recorded below.

Follow-up: removed Customize and all owned-fish size, color, and behavior editing, including the legacy inspector controls and Fish Management's size/default buttons. Existing fish values remain intact; Size and Behavior remain read-only Details. Naming and preview controls still work. This supersedes the customization-preservation requirements in the original plan below.

Follow-up verification: all 15 inspection tests and the customization-removal regression pass, along with the app bundle, architecture, mobile, and syntax checks. A disposable browser aquarium confirms Customize is absent and Enter still saves a name. The broader feature suite reports 459 passing, 33 failing, and 12 skipped tests; failures span Halloween content, movement/depth fixtures, WebSurf, and save-schema expectations. Updated preview: `.review-artifacts/fish-inspection/customization-disabled.png`.

## Goal and comparison

Use the supplied image as the reference for a richer fish Inspect screen: a large fish preview on the left and clearly grouped information on the right. The comparison below is based on the current source implementation, rather than a live screenshot of the running game. Values and species artwork in the reference are illustrative; display the selected fish's actual state.

The current `fish-inspect` utility overlay already includes:

- A large canvas preview, left/right thumbnails, and an independent animation loop.
- Species, health hearts, care condition, and biological age.
- Name input, random name, and Save.
- Editable size, behavior profile, color, RGB, and Colorize.
- Buy Another, Rehome, and Put Away / Place in Tank; Dispose for deceased fish.

Compared with that overlay, the reference adds a prominent fish identity/level summary, numeric health, mood, an XP progress card, a structured Details card, and AM/PM feeding status. It also gives the information column more width, clearer card boundaries, larger text, and stronger spacing. The reference omits existing customization controls, so preserve them in a compact expandable section.

Most required data already exists. This should be a presentation change using existing game rules, with no new save fields or progression/feeding mechanics.

## Proposed layout

Desktop: roughly 55–58% preview and 42–45% information, with the information column filling its available width instead of the current 380px cap. Tune against actual viewport height and content; do not copy the reference's pixel dimensions.

Left column:

1. Keep the selected fish's existing preview renderer and dark aquatic stage.
2. Keep Left side, Right side, and Animate together below the preview.
3. Retain selected-state and keyboard-focus indicators.

Right column, in order:

1. **Summary:** species, fish name, Care Level badge, hearts plus current/max health, mood badge, and care-condition text. A short Activity line can use the existing snapshot if space permits.
2. **Care progress:** Care Level, XP earned within the current level / XP required for the next level, and a green progress bar. At the cap, show Maximum Care Level. Omit progression for ineligible fish.
3. **Details:** two-column facts grid with Age, Water Type, Genetics, Food, Behavior, and Size. Show age here once rather than repeating it in the summary. Water Type means the fish's requirement; Food means its routine diet, not the last meal. Size means the existing editable display scale, not biological growth.
4. **Daily Care:** AM and PM entries with explicit text such as Eaten, Not yet eaten, or Upcoming. Add a summary badge such as 1/2 meals recorded; avoid implying both meals are complete when only one is recorded. Future slots should look neutral. These are historical indicators, not a new feeding schedule or obligation.
5. **Name:** existing input, random-name button, and Save in their own card.
6. **Customize:** collapsed by default, containing the existing size slider, behavior selector, color options, and Colorize. Changes immediately update the matching Details values and preview.
7. **Actions:** Buy Another, Rehome, and Put Away / Place in Tank in a persistent row below the scrollable information cards. Keep existing action availability and confirmation flows. Use Dispose for deceased fish.

Reuse the game's dark navy surfaces, cyan outlines and accents, typography, and button styling. Increase readability without adding expensive background effects or new art dependencies. The photographed fish/background in the reference are not prerequisites for this data expansion.

## Data mapping

| Display | Existing source | Implementation detail |
| --- | --- | --- |
| Name and species | `fish.name`, `getFishDisplaySpeciesName`, base/display species helpers | Preserve individual identity when a behavior override is selected. |
| Health | `getFishMaxHealthUnits`, `fish.healthUnits`, `renderHearts` | Health units are half-heart steps. Convert the numeric label to hearts so four full hearts read 4/4, not 8/8. Preserve peaceful-mode display behavior. |
| Condition | `getFishCareConditionText` | Keep its discovery-aware text; do not derive new labels from raw disease fields. Use care concerns, not full hearts alone, to determine the status tone. |
| Mood and activity | `getFishNeedsSnapshot`, `getFishMoodPresentation` | Reuse current labels and tones. Show Stored / unavailable appropriately instead of calculating live tank mood for stored or deceased fish. |
| Care Level and XP | `getFishManagementProgressionPresentation` | Use `levelXp`, `levelXpSpan`, and `xpProgress`. Make progressbar accessibility values match the displayed within-level numbers. Respect eligibility and maximum level. |
| Age | `formatFishBiologicalAge` | Use the existing effective simulation time for storage and peaceful mode. |
| Water Type | `getFishVariantWaterType(fish)` | Respect variant-specific water requirements. Do not substitute the current tank's water type. |
| Genetics | `formatFishShopGenetics` plus the fish's appearance variant | Resolve the selected fish's actual base species/variant. Tinting alone must not change Genetics. |
| Food | `getFishAcceptedFoodKeys`, diet rules; `formatFishShopFood` where suitable | Match the effective fish diet. Resolve custom fish settings rather than showing the shop placeholder “Configured in designer.” Explain detritus/no-routine-food cases accurately. |
| Behavior | Effective species/profile and `formatFishShopBehavior` where suitable | Show a human-readable behavior such as Schooling. For overrides, identify the active profile. Resolve custom fish instead of showing “Choose behavior.” |
| Size | `fish.scale` and existing scale formatting | Keep the existing percentage semantics and limits. |
| Daily Care | `getFishDailyMealIndicatorState`, `getDailyMealIndicatorSlots`, existing meal history | Read the selected fish's recorded consumption; offering food or another fish eating does not count. Retain local-day/noon boundaries. |

Stored, deceased, meal-free, and peaceful-mode fish need deliberate Daily Care presentations. Reuse existing mechanics and clock rules; use descriptive neutral text such as Stored, Not applicable, or Peaceful mode when ordinary feeding status would be misleading. Do not fabricate successful meals in peaceful mode.

## Implementation sequence

1. Add a small inspection presentation helper in `game/public/app-src/ui/fish-inspector.js` to resolve identity, effective time, progression, facts, mood, and meal state consistently. Reuse existing helpers rather than persisting copies of these values.
2. Refactor `renderFishInspectUtilityOverlay` into the cards above. Preserve existing input/action data attributes and preview hooks. Keep customization expansion state across updates and reset it when opening a different fish.
3. Update the existing fish-inspect CSS in `game/public/styles.css`: flexible right-column width, readable card spacing, a facts grid, a scrollable card region, and a persistent action row.
4. Add targeted refreshes for changing readouts while Inspect remains open. The shared utility renderer replaces the body when its markup changes; avoid rebuilding the entire body for every XP, mood, health, or meal update. Preserve focus, name drafts, scroll position, customization state, preview canvases, and animation timing. Keep data refresh separate from per-frame canvas rendering.
5. Adapt the layout for phones and short windows. Stack a bounded preview above the cards on narrow screens rather than forcing the existing equal-height split. Let Details collapse to one column. Keep every action reachable, including with the keyboard open, and provide touch-friendly controls and visible focus.
6. Rebuild the generated app bundle using `npm run build:app` after implementation. Edit source fragments, not `game/public/app.js` directly.

## Validation and completion criteria

- Extend `scripts/fish-inspect.test.cjs` for displayed values, half-heart numeric health, progression eligibility/cap, profile/variant/custom-fish facts, and correct per-fish AM/PM consumption.
- Cover local noon/day rollover and the stored, deceased, meal-free, and peaceful-mode presentations.
- Verify that unknown conditions remain undisclosed and existing preview tests still pass.
- Verify live changes with an unsaved name draft, an expanded customization section, and a scrolled information column; none should reset because a status readout changes.
- Run the focused inspection tests, relevant existing feeding/progression/care tests, and `npm run check:app`.
- Visually review desktop, laptop/short-window, and mobile layouts. Confirm no clipping, overlapping cards, horizontal scrolling, lost focus, or inaccessible action buttons.
- Confirm Inspect continues to preserve edit mode, uses the actual selected fish's appearance, and keeps preview animation isolated from live fish behavior.

The first implementation is complete when all six Details facts, mood, numeric health, Care Level/XP, and AM/PM care status are visible and accurate, while naming, customization, preview controls, and existing actions still work.

## Implementation verification

Implemented the summary, Care Level/XP, Details, Daily Care, Name, and expandable Customize cards, with persistent actions. Readouts refresh independently of the name input, controls, and preview canvas. Enter now saves the name draft through the correct action route.

- 15 inspection tests and 52 existing feeding, progression, and care tests passed.
- App bundle, architecture, and mobile checks passed.
- Browser review used a disposable in-memory aquarium, with saving and cloud initialization disabled.
- Reviewed 360×640 and 390×844 phones, a 1024×600 laptop window, and a 1440×1000 desktop. Corrected phone header placement, action wrapping, narrow-screen overflow, and the inherited XP-bar width limit.
- Verified in the browser that changing size, behavior, and preview side preserves an unsaved name and the expanded customization section.
- Desktop preview: `.review-artifacts/fish-inspection/desktop.png`.
