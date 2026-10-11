// Source fragment: ui/fish-inspector.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getFishInspectorManagedTarget() {
  return getManagedFishById(runtime.utilityOverlayMode === "fish-inspect" ? runtime.fishInspectFishId : runtime.selectedFishId);
}

function closeFishInspectPreview() {
  const id = runtime.fishInspectFishId;
  runtime.fishSwimAnimationStates?.delete(`inspect:${id}`);
  for (const canvas of runtime.fishInspectWarpCanvases?.values() || []) {
    releaseFishTurnV26ImageResources(canvas);
    canvas.width = canvas.height = 0;
  }
  runtime.fishInspectWarpCanvases = null;
  runtime.fishInspectPreviewFish = null;
  runtime.fishInspectFishId = null;
  runtime.fishInspectNameDraft = "";
  runtime.fishInspectPreviewStartedAt = 0;
  runtime.fishInspectView = "animated";
  runtime.fishInspectPausedAt = 0;
  runtime.fishInspectLastReadoutAt = 0;
}

function renderFishInspectIcon(kind) {
  const paths = {
    details: '<path d="M7 3h7l4 4v14H6V3h1Zm7 0v5h4M9 12h6m-6 4h6"/>',
    care: '<path d="M5 3v6m3-6v6m-6-6v6a3 3 0 0 0 6 0m-3 3v9m13-18c-3 3-4 6-4 9h4m0-9v18"/>',
    name: '<path d="m3 3 9 0 9 9-9 9-9-9V3Z"/><circle cx="8" cy="8" r="1"/>',
    age: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 11h16m-11 4h1m4 0h1m-6 3h1"/>',
    water: '<path d="M12 3s-7 8-7 12a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
    genetics: '<path d="M7 3c0 9 10 9 10 18M17 3c0 9-10 9-10 18M8 5h8m-7 4h6m-6 6h6m-7 4h8"/>',
    food: '<path d="M3 12h18a9 9 0 0 1-18 0Zm3-3h12M10 5h4m-2-2v2"/>',
    behavior: '<circle cx="9" cy="7" r="3"/><circle cx="18" cy="8" r="2"/><path d="M3 21v-4a6 6 0 0 1 12 0v4H3Zm13-7a4 4 0 0 1 6 3v4h-4"/>',
    size: '<path d="M14 3h7v7m0-7-7 7M10 21H3v-7m0 7 7-7"/>'
  };
  return `<svg class="fish-inspect-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[kind] || paths.details}</svg>`;
}

function getFishInspectPresentation(managed, wallNow = Date.now()) {
  const { fish, inStorage } = managed;
  const species = getSpeciesForFish(fish);
  const baseSpecies = getBaseSpeciesForFish(fish) || species;
  const now = inStorage ? getFishStorageSimulationNow(fish, wallNow) : getPeacefulModeSimulationNow(wallNow);
  const dead = isFishDead(fish);
  const peaceful = isPeacefulModeEnabled();
  const maxHealth = getFishMaxHealthUnits(fish);
  const health = peaceful && !dead ? maxHealth : clamp(Number(fish.healthUnits) || 0, 0, maxHealth);
  const snapshot = dead || inStorage ? null : getFishNeedsSnapshot(fish, now);
  const mood = dead ? "Deceased" : inStorage ? "Stored" : snapshot.mood.label;
  const moodTone = snapshot ? getFishMoodPresentation(mood).tone : "neutral";
  const concerns = dead ? [] : getFishCareConcerns(fish, now);
  const socialConcern = mood === "Lonely" ? "Needs companions" : "";
  const condition = dead ? "Deceased" : concerns.length
    ? [getFishCareConditionText(fish, now), socialConcern].filter(Boolean).join(" · ")
    : socialConcern || getFishCareConditionText(fish, now);
  const progression = getFishManagementProgressionPresentation(fish, baseSpecies);
  const variant = getFishAppearanceVariantKey(fish.appearanceVariantKey || fish.appearanceAssetPath || "");
  const foods = getFishAcceptedFoodKeys(fish);
  const food = isDetritusFish(fish) ? "Grime + waste · optional algae wafers"
    : isMealFreeFish(fish) ? "No routine food"
    : foods.map(key => key === "basic" ? "Basic Food / Fish Flakes" : getFoodMeta(key)?.name || key).join(", ") || "No routine food";
  // Shop placeholders describe unconfigured products, not an owned custom fish.
  const behaviorSpecies = { ...species, id: species?.customAsset ? "" : species?.behaviorProfileSpeciesId || species?.id };
  const socialBehavior = { school: "Schooling", shoal: "Shoaling", pair: "Pair bonding", pod: "Pod social", host: "Host bonding", solitary: "Solitary" }[getFishSocialProfile(fish).socialMode];
  const behavior = socialBehavior || formatFishShopBehavior(behaviorSpecies);
  const profileName = fish.behaviorSpeciesId
    ? getFishInspectorBehaviorProfiles().find(profile => profile.id === fish.behaviorSpeciesId)?.name
    : "";
  const dailyNote = dead ? "Not applicable" : inStorage ? "Stored" : peaceful ? "Peaceful mode" : isMealFreeFish(fish) ? "No routine meals" : "";
  const slots = getDailyMealIndicatorSlots(wallNow);
  const meals = dailyNote ? null : getFishDailyMealIndicatorState(fish, wallNow, getFishSimulationTank(fish));
  return {
    fish, species, baseSpecies, now, dead, inStorage, health, maxHealth, mood, moodTone, progression,
    condition,
    conditionTone: dead ? "neutral" : concerns.length || socialConcern ? "warn" : "good",
    activity: dead ? "" : inStorage ? "Stored safely" : snapshot.activity,
    facts: [
      ["age", "Age", formatFishBiologicalAge(fish, now)],
      ["food", "Food", food],
      ["water", "Water Type", getFishVariantWaterType(fish) === "saltwater" ? "Saltwater" : "Freshwater"],
      ["behavior", "Behavior", profileName ? `${behavior} (${profileName})` : behavior],
      ["genetics", "Genetics", formatFishShopGenetics(baseSpecies, variant)],
      ["size", "Size", `${Math.round((Number(fish.scale) || DEFAULT_FISH_SCALE) * 100)}%`]
    ],
    dailyNote,
    mealSummary: meals ? `${Number(meals.am) + Number(meals.pm)}/2 meals recorded` : dailyNote,
    mealSlots: slots.map((slot, index) => {
      const eaten = meals && (index === 0 ? meals.am : meals.pm);
      const label = dailyNote || (eaten ? "Eaten" : wallNow < slot.start ? "Upcoming" : "Not yet eaten");
      return { period: slot.label, label, eaten: Boolean(eaten) };
    })
  };
}

function getFishInspectReadoutMarkup(managed, wallNow = Date.now()) {
  const p = getFishInspectPresentation(managed, wallNow);
  const { fish, progression } = p;
  return {
    summary: `<div class="fish-inspect-identity"><div><span class="fish-inspect-species">${escapeHtml(getFishDisplaySpeciesName(fish, p.species))}</span><h2>${escapeHtml(fish.name || "Fish")}</h2></div>${progression ? `<span class="fish-inspect-level-badge">${escapeHtml(progression.levelLabel)}</span>` : ""}</div>
      <div class="fish-inspect-status-row"><div class="fish-inspect-health"><div class="hearts" aria-hidden="true">${renderHearts(p.health, p.maxHealth)}</div><strong aria-label="${p.health / 2} of ${p.maxHealth / 2} hearts">${p.health / 2}/${p.maxHealth / 2}</strong></div><span class="fish-inspect-mood" data-mood-tone="${escapeHtml(p.moodTone)}">Mood <strong>${escapeHtml(p.mood)}</strong></span></div>
      <p class="fish-inspect-condition" data-tone="${p.conditionTone}"><span aria-hidden="true">${p.conditionTone === "good" ? "✓" : p.conditionTone === "warn" ? "!" : "—"}</span>${escapeHtml(p.condition)}</p>
      ${p.activity ? `<p class="fish-inspect-activity">${escapeHtml(p.activity)}</p>` : ""}`,
    progression: progression ? `<div class="fish-inspect-card-heading"><h3>Care Level ${progression.careLevel}</h3><span>${escapeHtml(progression.xpLabel || "Maximum Care Level")}</span></div>${progression.isMaxLevel ? "" : `<div class="fish-care-xp-track fish-inspect-xp-track" role="progressbar" aria-label="Care XP toward Level ${progression.careLevel + 1}" aria-valuemin="0" aria-valuemax="${progression.levelXpSpan}" aria-valuenow="${progression.levelXp}"><span style="width:${Math.round(progression.xpProgress * 100)}%"></span></div>`}` : "",
    facts: `<h3>${renderFishInspectIcon("details")}Details</h3><dl class="fish-inspect-facts">${p.facts.map(([key, label, value]) => `<div>${renderFishInspectIcon(key)}<dt>${label}</dt><dd${key === "size" ? ' data-fish-inspect-fact-size' : ""}>${escapeHtml(value)}</dd></div>`).join("")}</dl>`,
    daily: `<div class="fish-inspect-card-heading"><h3>${renderFishInspectIcon("care")}Daily Care</h3><span class="fish-inspect-meal-summary">${escapeHtml(p.mealSummary)}</span></div><div class="fish-inspect-meals">${p.mealSlots.map(slot => `<div class="fish-inspect-meal${slot.eaten ? " is-eaten" : ""}"><span class="fish-inspect-meal-symbol" aria-hidden="true">${slot.eaten ? "✓" : "◷"}</span><div><strong>${escapeHtml(slot.period)}</strong><span>${escapeHtml(slot.label)}</span></div></div>`).join("")}</div>`,
    actions: `${!p.dead && p.baseSpecies && isFishSpeciesShopUnlocked(p.baseSpecies) ? '<button class="small-button alt" type="button" data-fish-inspect-action="buy">Buy Another</button><button class="small-button warn" type="button" data-fish-inspect-action="sell">Rehome</button>' : ""}
      ${!p.dead ? `<button class="small-button" type="button" data-fish-inspect-action="store">${p.inStorage ? "Place in Tank" : "Put Away"}</button>` : '<button class="small-button warn" type="button" data-fish-inspect-action="dispose">Dispose</button>'}`
  };
}

function refreshFishInspectReadouts(now = Date.now(), readouts = null) {
  if (!runtime.utilityOverlayOpen || runtime.utilityOverlayMode !== "fish-inspect") return false;
  const root = dom.utilityOverlayBody?.querySelector("[data-fish-inspect-key]");
  const key = `${runtime.fishInspectFishId}:${runtime.fishInspectBodyVersion || 0}`;
  if (!root || root.dataset.fishInspectKey !== key) return false;
  if (!readouts && now >= runtime.fishInspectLastReadoutAt && now - runtime.fishInspectLastReadoutAt < 500) return true;
  const managed = getFishInspectorManagedTarget();
  if (!managed) {
    if (!readouts) renderUtilityOverlay();
    return false;
  }
  runtime.fishInspectLastReadoutAt = now;
  const markup = readouts || getFishInspectReadoutMarkup(managed, now);
  for (const [name, html] of Object.entries(markup)) {
    const section = root.querySelector(`[data-fish-inspect-section="${name}"]`);
    if (!section) continue;
    // Cache on the actual node so reopening a fish cannot reuse a stale global cache.
    if (section.fishInspectMarkup !== html) {
      section.innerHTML = html;
      section.fishInspectMarkup = html;
    }
    section.hidden = !html;
  }
  const { fish } = managed;
  const input = root.querySelector("[data-fish-inspect-name]");
  const draft = runtime.fishInspectNameDraft ?? fish.name;
  if (input && input.value !== draft) input.value = draft;
  const view = runtime.fishInspectView || "animated";
  for (const button of root.querySelectorAll("[data-fish-inspect-view]")) button.setAttribute("aria-pressed", String(button.dataset.fishInspectView === view));
  root.querySelector("[data-fish-inspect-preview]")?.setAttribute("aria-label", `${view === "animated" ? "Animated" : view === "left" ? "Left" : "Right"} side view of ${fish.name || "this fish"}`);
  setTextIfChanged(dom.utilityOverlayTitle, fish.name || "Fish");
  return true;
}

function renderFishInspectUtilityOverlay() {
  const managed = getFishInspectorManagedTarget();
  if (!managed) return { kicker: "Fish", title: "Inspect", body: '<div class="empty-state">This fish is no longer available.</div>', footer: "" };
  const { fish } = managed;
  const readouts = getFishInspectReadoutMarkup(managed);
  const view = runtime.fishInspectView || "animated";
  return {
    kicker: "Inspect",
    title: fish.name || "Fish",
    fishInspectReadouts: readouts,
    body: `<div class="fish-inspect-layout" data-fish-inspect-key="${escapeHtml(`${fish.id}:${runtime.fishInspectBodyVersion || 0}`)}">
      <section class="fish-inspect-preview-column" aria-label="Fish preview">
        <div class="fish-inspect-preview-stage"><canvas data-fish-inspect-preview aria-label="${view === "animated" ? "Animated" : view === "left" ? "Left" : "Right"} side view of ${escapeHtml(fish.name || "this fish")}"></canvas><span data-fish-inspect-preview-loading>Loading fish…</span></div>
        <div class="fish-inspect-views" role="group" aria-label="Fish inspection views">
          ${["left", "right"].map(side => `<button type="button" data-fish-inspect-view="${side}" aria-pressed="${view === side}"><canvas data-fish-inspect-thumbnail="${side}" aria-hidden="true"></canvas><span>${side === "left" ? "Left side" : "Right side"}</span></button>`).join("")}
          <button class="small-button alt" type="button" data-fish-inspect-view="animated" aria-pressed="${view === "animated"}">Animate</button>
        </div>
      </section>
      <div class="fish-inspect-controls">
        <div class="fish-inspect-card-scroll">
        ${["summary", "progression", "facts", "daily"].map(section => `<section class="fish-inspect-card" data-fish-inspect-section="${section}"${!readouts[section] ? " hidden" : ""}>${readouts[section]}</section>`).join("")}
        <section class="fish-inspect-card"><h3>${renderFishInspectIcon("name")}Name</h3><div class="fish-inspect-name-row"><label><span class="fish-inspect-input-label">Fish name</span><input type="text" maxlength="20" value="${escapeHtml(runtime.fishInspectNameDraft ?? fish.name)}" data-fish-inspect-name /></label><button class="small-button alt" type="button" data-fish-inspect-action="random-name" aria-label="Randomize fish name">?</button><button class="small-button" type="button" data-fish-inspect-action="save-name">Save</button></div></section>
        </div>
        <div class="fish-inspect-actions" data-fish-inspect-section="actions">${readouts.actions}</div>
      </div>
    </div>`,
    footer: "",
    closable: true
  };
}

function handleFishInspectClick(_ctx, target) {
  const managed = getFishInspectorManagedTarget();
  if (!managed) return false;
  const viewButton = target.closest("button[data-fish-inspect-view]");
  if (viewButton) {
    const view = viewButton.dataset.fishInspectView;
    if (!["left", "right", "animated"].includes(view)) return false;
    const now = Date.now();
    if (view !== "animated" && !runtime.fishInspectPausedAt) runtime.fishInspectPausedAt = now;
    if (view === "animated" && runtime.fishInspectPausedAt) {
      runtime.fishInspectPreviewStartedAt += now - runtime.fishInspectPausedAt;
      runtime.fishInspectPausedAt = 0;
    }
    runtime.fishInspectView = view;
    renderUtilityOverlay();
    return true;
  }
  const button = target.closest("[data-fish-inspect-action]");
  if (!button) return false;
  const id = managed.fish.id;
  switch (button.dataset.fishInspectAction) {
    case "save-name": {
      if (renameTankContextTarget("fish", id, runtime.fishInspectNameDraft)) renderUtilityOverlay();
      break;
    }
    case "random-name": randomizeInspectorName(); break;
    case "buy": openFishBuyAnotherConfirmation(id); break;
    case "sell": openFishSellConfirmation(id); break;
    case "store":
      closeUtilityOverlay();
      if (managed.inStorage) restoreFishToTank(id);
      else storeFish(id);
      break;
    case "dispose": closeUtilityOverlay(); disposeFish(id); break;
    default: return false;
  }
  return true;
}

function handleFishInspectInput(_ctx, target) {
  if (target.matches("[data-fish-inspect-name]")) {
    runtime.fishInspectNameDraft = target.value;
    return true;
  }
  return false;
}

function handleFishInspectKeyDown(ctx, target, event) {
  if (!target.matches("[data-fish-inspect-name]") || event.key !== "Enter") return false;
  event.preventDefault();
  return handleFishInspectClick(ctx, { closest: selector => selector === "[data-fish-inspect-action]" ? { dataset: { fishInspectAction: "save-name" } } : null });
}

function getFishInspectLoopPose(fish, now, startedAt) {
  const swimMs = 1000;
  const turnMs = 700;
  const halfCycle = swimMs + turnMs;
  const elapsed = Math.max(0, now - startedAt);
  const halfIndex = Math.floor(elapsed / halfCycle);
  const phase = elapsed % halfCycle;
  const direction = isFishDead(fish) || halfIndex % 2 === 0 ? 1 : -1;
  const turning = !isFishDead(fish) && phase >= swimMs;
  const turnStartedAt = turning ? startedAt + halfIndex * halfCycle + swimMs : null;
  return {
    ...fish, id: `inspect:${fish.id}`,
    injuryDisplaySide: getFishInjuryDisplaySide({ ...fish }),
    direction: turning ? -direction : direction, displayDirection: direction,
    displayAngle: direction < 0 ? Math.PI : 0,
    turnFromDirection: direction, turnToDirection: -direction,
    turnFromAngle: direction < 0 ? Math.PI : 0, turnToAngle: direction < 0 ? 0 : Math.PI,
    turnStartedAt,
    turnDurationMs: turning ? turnMs : 0,
    // Keep the inspection loop independent of territorial or travel turns.
    turnV26StyleActive: "tail-loaded-c-turn", turnV26StyleStartedAt: turnStartedAt,
    turnV26ActiveDepthSign: direction, turnV26MotionTiming: null,
    turnV26EntryTilt: 0,
    turnRendererBackend: "simple", turnFinalFrameRenderedAt: 0,
    activity: "roam", caveDecorId: null, pendingTravel: null
  };
}

function getFishInspectSwimTexture(texture, layer, imagePath, pose, species, now) {
  if (!texture || isFishDead(pose)) return texture;
  if (!(runtime.fishInspectWarpCanvases instanceof Map)) runtime.fishInspectWarpCanvases = new Map();
  let canvas = runtime.fishInspectWarpCanvases.get(layer);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.fishTurnV26DynamicTexture = true;
    runtime.fishInspectWarpCanvases.set(layer, canvas);
  }
  const scale = Math.min(1, 512 / Math.max(texture.width, texture.height));
  const width = Math.max(1, Math.round(texture.width * scale));
  const height = Math.max(1, Math.round(texture.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width; canvas.height = height;
  }
  const context = canvas.getContext("2d");
  if (!context) return texture;
  context.clearRect(0, 0, width, height);
  // One continuous swim phase feeds both the side view and the turn mesh.
  // Switching renderers therefore never resets the tail or body deformation.
  if (!drawFishSwimDepthWarpImage(context, texture, 0, 0, width, height, pose, species, now, {
    imagePath, suckerFreeSwimming: true, presetId: "regular", movementFactor: 1
  })) context.drawImage(texture, 0, 0, width, height);
  return canvas;
}

function renderFishInspectPreview(now = Date.now()) {
  if (!runtime.utilityOverlayOpen || runtime.utilityOverlayMode !== "fish-inspect") return;
  const managed = getFishInspectorManagedTarget();
  const canvas = dom.utilityOverlayBody?.querySelector("[data-fish-inspect-preview]");
  if (!managed || !canvas) return;
  const { fish, inStorage } = managed;
  const species = getSpeciesForFish(fish);
  if (!species) return;
  const displaySpecies = getFishDisplaySourceSpecies(fish, species) || species;
  // Suckers use their side-swimming art so inspection can show both flanks.
  const imagePath = species.behavior === "sucker"
    ? getSuckerFishViewAssetPath(displaySpecies, fish, "swim") || getFishDisplayAssetPath(fish, species, now)
    : getFishDisplayAssetPath(fish, species, now);
  const image = runtime.images.get(imagePath);
  const loading = dom.utilityOverlayBody.querySelector("[data-fish-inspect-preview-loading]");
  if (!isUsableRuntimeImage(image)) {
    if (loading) loading.hidden = false;
    requestRuntimeImageRecovery(imagePath, { kind: "fish", id: fish.id, speciesId: fish.speciesId });
    return;
  }
  if (loading) loading.hidden = true;
  const drawPreview = (canvas, view, thumbnail = false) => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width <= 0 || height <= 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    const maxSide = Math.min(512, width * 0.88, height * 0.88);
    const scale = maxSide / Math.max(image.width, image.height);
    const drawWidth = image.width * scale, drawHeight = image.height * scale;
    const still = view !== "animated";
    const direction = view === "left" ? -1 : 1;
    const nextPose = getFishInspectLoopPose(fish, still ? runtime.fishInspectPreviewStartedAt : now, runtime.fishInspectPreviewStartedAt || now);
    if (still) Object.assign(nextPose, {
      direction, displayDirection: direction, displayAngle: direction < 0 ? Math.PI : 0,
      turnStartedAt: null, turnDurationMs: 0
    });
    // Thumbnail poses must never replace the animated preview's persistent owner.
    if (!thumbnail && runtime.fishInspectPreviewFish?.id !== nextPose.id) runtime.fishInspectPreviewFish = {};
    const pose = thumbnail ? nextPose : Object.assign(runtime.fishInspectPreviewFish, nextPose);
    const conditionNow = inStorage ? getFishStorageSimulationNow(fish, now) : getPeacefulModeSimulationNow(now);
    const healthRatio = clamp(fish.healthUnits / Math.max(1, getFishMaxHealthUnits(fish)), 0, 1);
    const turn = Boolean(pose.turnStartedAt);
    const complexTurn = turn && !areSimpleTurnAnimationsForced();
    context.save();
    context.translate(width / 2, height / 2);
    const drawLayer = (texture, layer, filter = "none", alpha = 1) => {
      if (!texture || alpha <= 0) return;
      const swimTexture = still ? texture : getFishInspectSwimTexture(texture, layer, imagePath, pose, species, now);
      context.save(); context.filter = filter; context.globalAlpha = alpha;
      let turned = false;
      if (complexTurn) turned = drawFishTurnV26VolumeMesh(context, swimTexture, image, -drawWidth / 2, drawWidth, drawHeight, pose, now, { species, baseAssetPath: imagePath });
      if (!turned && turn) drawFishLightweightTurnFallbackFrame(context, swimTexture, -drawWidth / 2, drawWidth, drawHeight, pose, now);
      else if (!turned) {
        context.scale(pose.displayDirection, 1);
        context.drawImage(swimTexture, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      }
      context.restore();
    };
    drawLayer(getFishTintedImage(imagePath, image, fish), "body", getFishCanvasFilter(fish, healthRatio, conditionNow));
    if (!isFishDead(fish)) {
      drawLayer(getFishSymptomOverlayCanvas(fish, species, imagePath, image, healthRatio, conditionNow, { mode: "global" }), "global");
      const sideAlpha = getFishSymptomSideVisibility(pose, { facingScaleX: pose.displayDirection }, now, complexTurn);
      drawLayer(getFishSymptomOverlayCanvas(fish, species, imagePath, image, healthRatio, conditionNow, { mode: "side" }), "side", "none", sideAlpha);
    }
    context.restore();
  };
  drawPreview(canvas, runtime.fishInspectView || "animated");
  for (const thumbnail of dom.utilityOverlayBody.querySelectorAll?.("[data-fish-inspect-thumbnail]") || []) {
    drawPreview(thumbnail, thumbnail.dataset.fishInspectThumbnail, true);
  }
}

function openFishInspector(fishId, options = {}) {
  if (!getManagedFishById(fishId)) {
    return;
  }

  if (options.settingsOpen !== false) {
    openUtilityOverlay("fish-inspect", { fishId, clearPrimaryToolModes: false });
    return;
  }

  if (runtime.selectedFishId !== fishId) {
    runtime.fishInspectorSettingsOpen = false;
    runtime.fishNameDraftId = "";
    runtime.fishNameDraftValue = "";
  }
  closeFishActionMenu();
  runtime.selectedFishId = fishId;
  runtime.selectedFishStatusFishId = fishId;
  runtime.fishInspectorSettingsOpen = options.settingsOpen !== false;
  renderUi(Date.now());
}

function closeFishInspector() {
  runtime.selectedFishId = null;
  runtime.selectedFishStatusFishId = null;
  runtime.fishInspectorSettingsOpen = false;
  runtime.fishNameKeyboardOpen = false;
  runtime.fishNameDraftId = "";
  runtime.fishNameDraftValue = "";
  renderUi(Date.now());
}

function setFishNameDraftFromInput() {
  if (!(dom.fishNameInput instanceof HTMLInputElement) || !runtime.selectedFishId) {
    return;
  }
  runtime.fishNameDraftId = runtime.selectedFishId;
  runtime.fishNameDraftValue = dom.fishNameInput.value;
}

function clearFishNameDraft() {
  runtime.fishNameDraftId = "";
  runtime.fishNameDraftValue = "";
}

function saveInspectorName() {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    return;
  }

  const { fish } = managed;
  const nextName = dom.fishNameInput.value.trim().slice(0, 20);
  if (!nextName) {
    showToast("Fish names cannot be blank.");
    setFishNameDraftFromInput();
    return;
  }

  fish.name = nextName;
  pushEvent(`${nextName} got a fresh new name tag.`, Date.now());
  runtime.fishNameKeyboardOpen = false;
  clearFishNameDraft();
  saveState();
  renderUi(Date.now());
  showToast(`${nextName} has been renamed.`);
}

function randomizeInspectorName() {
  const managed = getFishInspectorManagedTarget();
  if (!managed) {
    return;
  }

  const { fish } = managed;
  const species = getBaseSpeciesForFish(fish);
  const pool = Array.isArray(species?.defaultNames)
    ? species.defaultNames.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  if (!pool.length) {
    showToast("No name list found for this fish type.");
    return;
  }

  const takenNames = [
    ...getAllTankFish(state),
    ...(state?.storedFish || [])
  ]
    .filter((entry) => entry?.id !== fish.id)
    .map((entry) => entry?.name)
    .filter((name) => typeof name === "string" && name.trim());
  const available = pool.filter((name) => !takenNames.includes(name) && name !== fish.name);
  const choices = available.length ? available : pool.filter((name) => name !== fish.name);
  const nextName = choices.length
    ? choices[Math.floor(Math.random() * choices.length)]
    : pool[Math.floor(Math.random() * pool.length)];

  fish.name = nextName.slice(0, 20);
  if (runtime.utilityOverlayMode === "fish-inspect") runtime.fishInspectNameDraft = fish.name;
  clearFishNameDraft();
  saveState();
  renderUi(Date.now());
}

function getWallpaperFishNameKeyboardRows() {
  const mode = runtime.fishNameKeyboardMode;
  if (mode === "numbers") {
    return [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", { action: "backspace", label: "Back" }],
      ["-", "/", ":", ";", "(", ")", "$", "&", "@", "\""],
      [{ action: "letters", label: "ABC", wide: true }, ".", ",", "?", "!", "'", { action: "symbols", label: "#+=", wide: true }],
      [{ spacer: true, wide: true }, { action: "space", label: "Space", space: true }, { spacer: true, wide: true }]
    ];
  }
  if (mode === "symbols") {
    return [
      ["[", "]", "{", "}", "#", "%", "^", "*", "+", "=", { action: "backspace", label: "Back" }],
      ["_", "\\", "|", "~", "<", ">", "`", ".", ",", "?"],
      [{ action: "numbers", label: "123", wide: true }, "!", "'", "\"", "-", "/", { action: "letters", label: "ABC", wide: true }],
      [{ spacer: true, wide: true }, { action: "space", label: "Space", space: true }, { spacer: true, wide: true }]
    ];
  }

  const applyCase = (letter) => runtime.fishNameKeyboardUppercase ? letter.toUpperCase() : letter.toLowerCase();
  return [
    [..."qwertyuiop"].map(applyCase).concat([{ action: "backspace", label: "Back" }]),
    [{ spacer: true }, ...[..."asdfghjkl"].map(applyCase), { spacer: true, wide: true }],
    [{ action: "case", label: runtime.fishNameKeyboardUppercase ? "abc" : "ABC", wide: true }, ...[..."zxcvbnm"].map(applyCase), { action: "numbers", label: "123", wide: true }],
    [{ spacer: true, wide: true }, { action: "space", label: "Space", space: true }, { spacer: true, wide: true }]
  ];
}

function renderWallpaperNameKeyboardInto(keyboard) {
  if (!(keyboard instanceof HTMLElement)) {
    return;
  }
  const rows = getWallpaperFishNameKeyboardRows();
  keyboard.innerHTML = rows.map((row) => `
    <div class="wallpaper-name-keyboard-row">
      ${row.map((entry) => {
        if (typeof entry === "object" && entry.spacer) {
          return `<span class="wallpaper-name-keyboard-spacer ${entry.wide ? "is-wide" : ""}" aria-hidden="true"></span>`;
        }
        const key = typeof entry === "string" ? entry : "";
        const action = typeof entry === "object" ? entry.action : "";
        const label = typeof entry === "object" ? entry.label : key;
        const className = [
          typeof entry === "object" && entry.wide ? "is-wide" : "",
          typeof entry === "object" && entry.space ? "is-space" : "",
          action === "backspace" ? "is-backspace" : ""
        ].filter(Boolean).join(" ");
        return `<button class="${className}" type="button" ${action ? `data-fish-name-action="${escapeHtml(action)}"` : `data-fish-name-key="${escapeHtml(key)}"`}>${escapeHtml(label)}</button>`;
      }).join("")}
    </div>
  `).join("");
}

function renderWallpaperFishNameKeyboard() {
  renderWallpaperNameKeyboardInto(dom.fishNameKeyboard);
}

function updateWallpaperFishNameKeyboard() {
  if (!dom.fishNameKeyboard) {
    return;
  }
  renderWallpaperFishNameKeyboard();
  dom.fishNameKeyboard.hidden = !(
    isWallpaperEngineInputAssistEnabled()
    && runtime.selectedFishId
    && dom.fishInspector
    && !dom.fishInspector.hidden
    && runtime.fishNameKeyboardOpen
  );
  if (dom.clearFishName instanceof HTMLButtonElement && dom.fishNameInput instanceof HTMLInputElement) {
    dom.clearFishName.hidden = !isWallpaperEngineInputAssistEnabled() || !dom.fishNameInput.value;
  }
}

function setNameInputValue(input, value) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const maxLength = Number(input.maxLength) > 0 ? Number(input.maxLength) : 48;
  const nextValue = String(value || "").slice(0, maxLength);
  input.value = nextValue;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function applyWallpaperNameKeyboardActionToInput(input, actionOrKey) {
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const currentValue = input.value || "";
  switch (actionOrKey) {
    case "space":
      setNameInputValue(input, `${currentValue} `);
      break;
    case "backspace":
      setNameInputValue(input, currentValue.slice(0, -1));
      break;
    case "clear":
      setNameInputValue(input, "");
      break;
    case "case":
      runtime.fishNameKeyboardUppercase = !runtime.fishNameKeyboardUppercase;
      updateWallpaperFishNameKeyboard();
      syncWallpaperUtilityNameKeyboards();
      break;
    case "letters":
    case "numbers":
    case "symbols":
      runtime.fishNameKeyboardMode = actionOrKey;
      updateWallpaperFishNameKeyboard();
      syncWallpaperUtilityNameKeyboards();
      break;
    default:
      setNameInputValue(input, `${currentValue}${String(actionOrKey || "").slice(0, 1)}`);
      break;
  }
  input.focus?.({ preventScroll: true });
}

function applyWallpaperFishNameKeyboardAction(actionOrKey) {
  applyWallpaperNameKeyboardActionToInput(dom.fishNameInput, actionOrKey);
}

function syncWallpaperUtilityNameKeyboards() {
  const keyboards = dom.utilityOverlayBody?.querySelectorAll?.("[data-wallpaper-keyboard]") || [];
  for (const keyboard of keyboards) {
    if (keyboard instanceof HTMLElement) {
      renderWallpaperNameKeyboardInto(keyboard);
      let input = null;
      for (const candidate of dom.utilityOverlayBody?.querySelectorAll?.("[data-wallpaper-keyboard-input]") || []) {
        if (candidate instanceof HTMLInputElement && candidate.dataset.wallpaperKeyboardInput === keyboard.dataset.wallpaperKeyboard) {
          input = candidate;
          break;
        }
      }
      keyboard.hidden = !(
        isWallpaperEngineInputAssistEnabled()
        && input instanceof HTMLInputElement
        && runtime.wallpaperUtilityKeyboardOpenId === input.dataset.wallpaperKeyboardInput
      );
    }
  }
}

function toggleFishInspectorSettings() {
  openFishInspector(runtime.selectedFishId);
}

function buyInspectorFish() {
  const managed = getManagedFishById(runtime.selectedFishId);
  const fish = managed?.fish || null;
  if (!fish) {
    return;
  }

  openFishBuyAnotherConfirmation(fish.id);
}

function getFishInspectorBehaviorProfiles() {
  return runtime.fishCatalog.filter((species) => (
    species
    && !HIDDEN_FISH_OPTION_IDS.has(species.id)
    && !species.customUploadProduct
    && !isCustomFishShopKey(species.id)
    && !isCustomFishAssetKey(species.id)
  ));
}
