// Source fragment: ui/customization-actions-and-inventory.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderCustomFishCreationOverlay() {
  const pending = runtime.pendingCustomFishUpload;
  if (!pending?.dataUrl) {
    return `<div class="empty-state">Choose an image from the fish shop first.</div>`;
  }

  const width = clamp(Math.round(Number(pending.width) || CUSTOM_FISH_DEFAULT_WIDTH), CUSTOM_FISH_MIN_WIDTH, CUSTOM_FISH_MAX_WIDTH);
  const behaviorProfileId = normalizeCustomFishBehaviorProfileId(pending.behaviorProfileId);
  const behaviorOptions = getCustomFishBehaviorProfiles().map((profile) => `
    <option value="${escapeHtml(profile.id)}" ${behaviorProfileId === profile.id ? "selected" : ""}>
      ${escapeHtml(formatCustomFishBehaviorOption(profile))}
    </option>
  `).join("");
  const aspectRatio = pending.naturalHeight && pending.naturalWidth
    ? `${Math.max(1, Number(pending.naturalWidth))} / ${Math.max(1, Number(pending.naturalHeight))}`
    : "1 / 1";
  const rotation = sanitizeCustomFishRotation(pending.rotation);
  const flipped = Boolean(pending.flipX);
  const transform = getPendingCustomFishTransform(pending);

  return `
    <div class="custom-fish-create-panel">
      <div class="custom-fish-preview-column">
        <div class="custom-fish-size-window">
          <div class="custom-fish-size-stage">
            <img
              class="custom-fish-template-overlay"
              src="${escapeHtml(CUSTOM_FISH_TEMPLATE_IMAGE)}"
              alt=""
              aria-hidden="true"
              draggable="false" />
            <img
              class="custom-fish-upload-preview"
              src="${escapeHtml(pending.dataUrl)}"
              alt="Uploaded custom fish preview"
              style="width: ${width}px; aspect-ratio: ${escapeHtml(aspectRatio)}; transform: ${escapeHtml(transform)};"
              data-custom-fish-preview />
          </div>
          <div class="custom-fish-size-readout">
            <span>Actual fish width</span>
            <strong data-custom-fish-size-label>${width} px</strong>
          </div>
        </div>
      </div>
      <div class="custom-fish-settings-column">
        <label class="custom-decor-name-row">
          <span>Fish Type Name</span>
          <input
            class="tank-name-input custom-decor-name-input"
            type="text"
            maxlength="48"
            value="${escapeHtml(pending.name || pending.suggestedName || "Custom Fish")}"
            data-wallpaper-keyboard-input="custom-fish"
            data-custom-fish-name-input
            aria-label="Custom fish type name" />
          <div class="wallpaper-name-keyboard" data-wallpaper-keyboard="custom-fish" hidden aria-label="Custom fish type name keyboard"></div>
        </label>
        <label class="custom-decor-name-row">
          <span>Fish Behavior</span>
          <select class="shop-sort-select" data-custom-fish-behavior-select aria-label="Custom fish behavior">
            ${behaviorOptions}
          </select>
        </label>
        <label class="bubbler-control-row custom-fish-size-control">
          <span>Fish Size <strong data-custom-fish-size-label>${width} px</strong></span>
          <input
            type="range"
            min="${CUSTOM_FISH_MIN_WIDTH}"
            max="${CUSTOM_FISH_MAX_WIDTH}"
            step="1"
            value="${width}"
            data-custom-fish-size-input />
        </label>
        <label class="cave-colorize-toggle custom-fish-flip-toggle">
          <input
            type="checkbox"
            data-custom-fish-flip-toggle
            ${flipped ? "checked" : ""} />
          <span>Flip horizontally</span>
        </label>
        <label class="bubbler-control-row custom-fish-rotation-control">
          <span>Rotation <strong data-custom-fish-rotation-label>${rotation} deg</strong></span>
          <input
            type="range"
            min="${CUSTOM_FISH_ROTATION_MIN_DEGREES}"
            max="${CUSTOM_FISH_ROTATION_MAX_DEGREES}"
            step="1"
            value="${rotation}"
            data-custom-fish-rotation-input />
        </label>
        <div class="mini-note">This will create one custom fish for ${CUSTOM_FISH_COST} ${pluralize("coin", CUSTOM_FISH_COST)} and add it to the tank.</div>
      </div>
    </div>
  `;
}

function renderBubblerSettingsOverlay(item) {
  if (!item || !canConfigureDecorBubbler(item)) {
    return `<div class="empty-state">Select a placed bubbler from the decor tray first.</div>`;
  }

  const settings = getPlacedDecorBubblerSettings(item);
  const directionOptions = BUBBLER_DIRECTION_OPTIONS.map((option) => `
    <option value="${escapeHtml(option.id)}" ${settings.direction === option.id ? "selected" : ""}>
      ${escapeHtml(option.label)}
    </option>
  `).join("");
  const activeBubbleColor = normalizeDecorColorSetting(settings.bubbleColor) || DEFAULT_BUBBLER_BUBBLE_COLOR;
  const activeBubbleColorChoice = isDecorRgbColorSetting(activeBubbleColor)
    ? { label: "RGB", color: activeBubbleColor }
    : getCustomGravelColorChoices().find((choice) => choice.color === activeBubbleColor)
    || { label: activeBubbleColor, color: activeBubbleColor };
  const defaultColorSelected = activeBubbleColor === DEFAULT_BUBBLER_BUBBLE_COLOR;
  const rgbColorSelected = isDecorRgbColorSetting(activeBubbleColor);
  const defaultColorTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${defaultColorSelected ? "is-selected" : ""}"
      type="button"
      data-bubbler-color="${DEFAULT_BUBBLER_BUBBLE_COLOR}"
      aria-pressed="${defaultColorSelected}"
      aria-label="Reset bubble color to default"
      title="Default bubble color">
      Default
    </button>
  `;
  const rgbColorTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile cave-color-rgb-tile ${rgbColorSelected ? "is-selected" : ""}"
      type="button"
      data-bubbler-color="${DECOR_RGB_COLOR_SETTING}"
      aria-pressed="${rgbColorSelected}"
      aria-label="Fade bubble color through RGB colors"
      title="RGB color cycle">
      RGB
    </button>
  `;
  const bubbleColorSwatches = getCustomGravelColorChoices()
    .map((choice) => {
      const selected = choice.color === activeBubbleColor && !defaultColorSelected;
      return `
        <button
          class="custom-gravel-color-swatch bubbler-color-swatch ${selected ? "is-selected" : ""}"
          type="button"
          data-bubbler-color="${choice.color}"
          aria-pressed="${selected}"
          aria-label="Set bubble color to ${escapeHtml(choice.label)}"
          title="${escapeHtml(choice.label)}"
          style="--swatch:${choice.color};">
        </button>
      `;
    })
    .join("");
  const rawBubbleFillOpacity = Number(settings.bubbleFillOpacity);
  const bubbleFillOpacity = clamp(Number.isFinite(rawBubbleFillOpacity) ? rawBubbleFillOpacity : DEFAULT_BUBBLER_FILL_OPACITY, 0, 1);

  return `
    <div class="bubbler-settings-panel">
      <label class="bubbler-control-row">
        <span>Speed <strong data-bubbler-setting-value="speed">${formatBubblerSpeedReadout(settings.speed)}</strong></span>
        <input type="range" min="${MIN_BUBBLER_SPEED}" max="${MAX_BUBBLER_SPEED}" step="0.05" value="${settings.speed}" data-bubbler-setting="speed" />
      </label>
      <label class="bubbler-control-row">
        <span>Intensity <strong data-bubbler-setting-value="intensity">${settings.amount < 1 ? settings.amount.toFixed(1) : Math.round(settings.amount)}</strong></span>
        <input type="range" min="${MIN_CUSTOM_BUBBLER_AMOUNT}" max="${MAX_BUBBLER_INTENSITY}" step="0.1" value="${settings.amount}" data-bubbler-setting="intensity" />
      </label>
      <label class="bubbler-control-row">
        <span>Bubble Size <strong data-bubbler-setting-value="bubbleSize">${settings.bubbleSize.toFixed(2)}x</strong></span>
        <input type="range" min="${MIN_CUSTOM_BUBBLER_BUBBLE_SIZE}" max="${MAX_CUSTOM_BUBBLER_BUBBLE_SIZE}" step="0.05" value="${settings.bubbleSize}" data-bubbler-setting="bubbleSize" />
      </label>
      <label class="bubbler-control-row">
        <span>Visibility <strong data-bubbler-setting-value="bubbleOpacity">${settings.bubbleOpacity.toFixed(2)}x</strong></span>
        <input type="range" min="${MIN_CUSTOM_BUBBLER_OPACITY}" max="${MAX_CUSTOM_BUBBLER_OPACITY}" step="0.05" value="${settings.bubbleOpacity}" data-bubbler-setting="bubbleOpacity" />
      </label>
      <div class="bubbler-control-row bubbler-color-row">
        <span>Bubble Color <strong data-bubbler-setting-value="bubbleColor">${escapeHtml(activeBubbleColorChoice.label)}</strong></span>
        <div class="custom-gravel-swatches bubbler-color-swatches" role="group" aria-label="Bubble color choices">
          <div class="color-choice-mode-row">
            ${defaultColorTile}
            ${rgbColorTile}
          </div>
          <div class="color-choice-swatch-row">
            ${bubbleColorSwatches}
          </div>
        </div>
        <label class="cave-colorize-toggle">
          <input
            type="checkbox"
            data-bubbler-setting="bubbleColorize"
            ${settings.bubbleColorize ? "checked" : ""} />
          <span>Colorize</span>
        </label>
      </div>
      <label class="bubbler-control-row">
        <span>Inside Fill <strong data-bubbler-setting-value="bubbleFillOpacity">${Math.round(bubbleFillOpacity * 100)}%</strong></span>
        <input type="range" min="0" max="1" step="0.05" value="${bubbleFillOpacity}" data-bubbler-setting="bubbleFillOpacity" />
      </label>
      <div class="bubbler-control-row bubbler-toggle-row">
        <span>Bubble End</span>
        <label class="cave-colorize-toggle">
          <input
            type="checkbox"
            data-bubbler-setting="bubblePopEnabled"
            ${settings.bubblePopEnabled ? "checked" : ""} />
          <span>Pop bubbles</span>
        </label>
        <label class="cave-colorize-toggle">
          <input
            type="checkbox"
            data-bubbler-setting="bubbleMalformed"
            ${settings.bubbleMalformed ? "checked" : ""} />
          <span>Malformed bubbles</span>
        </label>
      </div>
      <label class="bubbler-control-row">
        <span>Malformed Intensity <strong data-bubbler-setting-value="bubbleMalformedIntensity">${settings.bubbleMalformedIntensity.toFixed(2)}x</strong></span>
        <input type="range" min="${MIN_BUBBLER_MALFORMED_INTENSITY}" max="${MAX_BUBBLER_MALFORMED_INTENSITY}" step="0.05" value="${settings.bubbleMalformedIntensity}" data-bubbler-setting="bubbleMalformedIntensity" />
      </label>
      <label class="bubbler-control-row">
        <span>Malformed Speed <strong data-bubbler-setting-value="bubbleMalformedSpeed">${settings.bubbleMalformedSpeed < 1 ? settings.bubbleMalformedSpeed.toFixed(2) : settings.bubbleMalformedSpeed.toFixed(1)}x</strong></span>
        <input type="range" min="${MIN_BUBBLER_MALFORMED_SPEED}" max="${MAX_BUBBLER_MALFORMED_SPEED}" step="0.05" value="${settings.bubbleMalformedSpeed}" data-bubbler-setting="bubbleMalformedSpeed" />
      </label>
      <label class="bubbler-control-row">
        <span>Direction</span>
        <select class="shop-sort-select" data-bubbler-setting="direction">${directionOptions}</select>
      </label>
      <label class="bubbler-control-row">
        <span>Width <strong data-bubbler-setting-value="width">${Math.round(settings.width)} px</strong></span>
        <input type="range" min="${MIN_CUSTOM_BUBBLER_WIDTH_PX}" max="${MAX_CUSTOM_BUBBLER_WIDTH_PX}" step="2" value="${settings.width}" data-bubbler-setting="width" />
      </label>
      <label class="bubbler-control-row">
        <span>Distance <strong data-bubbler-setting-value="distance">${Math.round(settings.distance)} px</strong></span>
        <input type="range" min="${MIN_CUSTOM_BUBBLER_DISTANCE_PX}" max="${MAX_CUSTOM_BUBBLER_DISTANCE_PX}" step="5" value="${settings.distance}" data-bubbler-setting="distance" />
      </label>
      <div class="mini-note">Side and downward streams bend upward after a short run. Higher speed lets them travel farther before they rise.</div>
      <button class="small-button alt" type="button" data-reset-bubbler-settings>Reset Bubbler</button>
    </div>
  `;
}

function renderFoodInventoryOverlay() {
  const cards = getFoodCatalog().filter((food) => (
    shouldShowFoodInStore(food)
    && food.id !== "upgraded"
    && Math.max(0, Number(state.foodInventory?.[food.id]) || 0) > 0
  )).map((food) => {
    const quantity = Math.max(0, Number(state.foodInventory?.[food.id]) || 0);
    const active = runtime.feedingModeFoodKey === food.id;
    return `
      <article class="inventory-card ${active ? "is-selected" : ""}">
        ${renderFoodAndMedImage("food", food.id, food.name, "inventory-card-thumb")}
        <div>
          <strong>${food.name}</strong>
          <div class="fish-meta">${food.description}</div>
          <div class="mini-note">${quantity} pellet${quantity === 1 ? "" : "s"} remaining</div>
        </div>
        <button class="small-button ${active ? "" : "alt"}" data-select-food="${food.id}" ${quantity > 0 ? "" : "disabled"}>
          ${active ? "Selected" : "Select"}
        </button>
      </article>
    `;
  }).join("");
  return cards || `<div class="empty-state">Buy some food from the store first.</div>`;
}

function renderMedicineInventoryOverlay() {
  const cards = getMedicineCatalog().filter((medicine) => (
    shouldShowMedicineInStore(medicine)
    && Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0) > 0
  )).map((medicine) => {
    const quantity = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
    const active = runtime.medicineModeKey === medicine.id;
    return `
      <article class="inventory-card ${active ? "is-selected" : ""}">
        ${renderFoodAndMedImage("medicine", medicine.id, medicine.name, "inventory-card-thumb")}
        <div>
          <strong>${medicine.name}</strong>
          <div class="fish-meta">${medicine.description}</div>
          <div class="mini-note">${quantity} drop${quantity === 1 ? "" : "s"} remaining</div>
        </div>
        <button class="small-button ${active ? "" : "alt"}" data-select-medicine="${medicine.id}" ${quantity > 0 ? "" : "disabled"}>
          ${active ? "Selected" : "Select"}
        </button>
      </article>
    `;
  }).join("");
  return cards || `<div class="empty-state">Buy medicine from the pharmacy first.</div>`;
}

function renderTipsOverlay() {
  const suggestions = buildCurrentTankCareSuggestions(Date.now());
  if (!suggestions.length) {
    return `<div class="empty-state">No care issues are being suggested for this tank right now.</div>`;
  }

  return suggestions.map((suggestion) => `
    <label class="checklist-row ${suggestion.fulfilled ? "is-fulfilled" : ""}">
      <input type="checkbox" disabled ${suggestion.fulfilled ? "checked" : ""} />
      <span>${suggestion.label}</span>
    </label>
  `).join("");
}

function renderDailyBonusOverlay() {
  syncActiveDailyBonusState();
  const summary = getActiveDailyBonusSummary();
  if (!summary) {
    return `<div class="empty-state">No daily recap is waiting right now.</div>`;
  }

  const rows = Array.isArray(summary.rows) && summary.rows.length
    ? summary.rows.map((row) => `
      <div class="daily-recap-row ${row.score >= 0 ? "is-positive" : "is-negative"}">
        <span>${escapeHtml(row.text)}</span>
        <strong>${row.score > 0 ? "+" : ""}${row.score}</strong>
      </div>
    `).join("")
    : `<div class="empty-state">Nothing major happened across the borough.</div>`;
  return `
    <div class="daily-recap-list">
      <div class="compact-heading">
        <h3>Daily Recap!</h3>
        <p>Bubble Borough - ${escapeHtml(summary.dayKey || "")}</p>
      </div>
      <p class="daily-recap-narrative">${escapeHtml(summary.narrative || buildDailyRecapNarrative(summary.rows || [], null))}</p>
      ${rows}
    </div>
    <div class="summary-grid bonus-summary-grid">
      <div class="summary-row"><span>Overall</span><strong>${escapeHtml(summary.overall || "Quiet day.")}</strong></div>
      <div class="summary-row"><span>Average Comfort</span><strong>${summary.averageComfort || 0}%</strong></div>
      <div class="summary-row"><span>Normalized Score</span><strong>${summary.score > 0 ? "+" : ""}${summary.score || 0}</strong></div>
      <div class="summary-row"><span>Activity Score</span><strong>${summary.rawScore > 0 ? "+" : ""}${summary.rawScore || 0}</strong></div>
      <div class="summary-row"><span>Total Bonus</span><strong>${summary.reward || 0} coins</strong></div>
    </div>
  `;
}

function buildCurrentTankCareSuggestions(now = Date.now()) {
  const tank = getCurrentTank();
  if (!tank) {
    return [];
  }

  const livingFish = tank.fish.filter((fish) => !isFishDead(fish));
  if (!livingFish.length) {
    return [];
  }

  const suggestions = new Map();
  const putSuggestion = (key, label, fulfilled) => {
    const existing = suggestions.get(key);
    if (existing) {
      existing.fulfilled = existing.fulfilled && fulfilled;
      return;
    }
    suggestions.set(key, { key, label, fulfilled });
  };

  for (const fish of livingFish) {
    const species = getSpeciesForFish(fish);
    if (!species) {
      continue;
    }
    const speciesName = getFishDisplaySpeciesName(fish, species);
    if (getFishGlassTapStressPenalty(fish, now) > 0) {
      putSuggestion(`glass_tap_stress:${fish.id}`, `Give ${fish.name} some quiet time after glass tapping.`, false);
    }

    for (const need of getFishNeedsStatus(fish, tank, now)) {
      if (need.met) {
        continue;
      }
      const needPhrase = need.tag === "school_2_plus"
        ? `another ${speciesName} nearby`
        : need.tag === "open_water"
          ? "more open swimming space"
          : `${need.label.toLowerCase()} in the tank`;
      putSuggestion(`need:${fish.id}:${need.tag}`, `${fish.name} would love ${needPhrase}.`, false);
    }

    for (const conflict of getFishConflictStatus(fish, tank, now).filter((entry) => entry.active)) {
      const conflictLabel = conflict.label.toLowerCase();
      const label = conflict.tag === "community_fish" && fish.speciesId === "betta"
        ? `${fish.name} the ${speciesName} is not very popular in this tank. Consider giving them their own space.`
        : conflict.tag === "betta_present"
          ? `${fish.name} is stressed by a betta in this tank.`
          : conflict.tag === "overcrowded"
            ? `${fish.name} needs a roomier tank setup.`
            : conflict.tag === "sharp_decor"
              ? `${fish.name} is uneasy around sharp decor.`
              : `${fish.name} is bothered by ${conflictLabel}.`;
      putSuggestion(`conflict:${fish.id}:${conflict.tag}`, label, false);
    }

    const comfort = getFishComfort(fish, now);
    if (comfort.value < 0.45) {
      putSuggestion(`comfort:${fish.id}`, `${fish.name}'s comfort is low.`, false);
    }
  }

  return [...suggestions.values()].sort((left, right) => Number(left.fulfilled) - Number(right.fulfilled) || left.label.localeCompare(right.label));
}

function claimDailyBonus() {
  const now = Date.now();
  syncActiveDailyBonusState();
  const tank = getCurrentTank();
  const summary = getActiveDailyBonusSummary();
  if (!state.dailyBonus?.available || !summary) {
    closeUtilityOverlay();
    return;
  }

  const claimedKey = getDailyBonusClaimKey(summary);
  if (claimedKey && state.dailyBonus.claimedByTankDay?.[claimedKey]) {
    state.dailyBonus.summariesByTankId = {};
    state.dailyBonus.summary = null;
    syncActiveDailyBonusState();
    closeUtilityOverlay();
    saveState();
    renderUi(now);
    showToast("That daily recap was already claimed.");
    return;
  }

  const reward = Math.max(0, Math.floor(Number(summary.reward) || 0));
  if (reward > 0) {
    state.coins = Math.min(MAX_WALLET_COINS, state.coins + reward);
  }
  if (!state.dailyBonus.claimedByTankDay || typeof state.dailyBonus.claimedByTankDay !== "object") {
    state.dailyBonus.claimedByTankDay = {};
  }
  if (claimedKey) {
    state.dailyBonus.claimedByTankDay[claimedKey] = true;
  }
  state.dailyBonus.summariesByTankId = {};
  state.dailyBonus.summary = null;
  state.dailyBonus.available = false;
  state.dailyBonus.lastClaimedDayKey = summary.dayKey || state.dailyBonus.lastQualifiedDayKey || null;
  syncActiveDailyBonusState();
  pushEvent(`Claimed a daily recap worth ${reward} ${pluralize("coin", reward)}.`, now, tank, { score: 1, type: "daily_recap", recapEligible: false });
  playToolbarButtonSoundEffect("press");
  playCoinSoundEffect();
  closeUtilityOverlay();
  saveState();
  renderUi(now);
  showToast(`Daily recap claimed. +${reward} coins.`);
}

function renderSettingsOverlay() {
  if (!dom.settingsOverlay) {
    return;
  }

  const settings = getContentSettings();
  const uiSettings = getUiSettings();
  const tutorialAvailable = isIntroTutorialEnabled();
  const mouseLockAvailable = isTankMouseLockFeatureEnabled();
  const mouseLockRow = dom.tankMouseLockToggleInput?.closest(".settings-toggle-row");
  dom.settingsOverlay.hidden = !runtime.settingsOverlayOpen;
  dom.settingsOverlay.classList.toggle("is-open", runtime.settingsOverlayOpen);
  if (dom.violenceGoreToggleInput) {
    dom.violenceGoreToggleInput.checked = settings.violenceAndGoreEnabled;
  }
  if (dom.soundMuteToggleInput) {
    dom.soundMuteToggleInput.checked = uiSettings.soundMuted;
  }
  if (dom.uiMuteToggleInput) {
    dom.uiMuteToggleInput.checked = uiSettings.uiSoundsMuted;
  }
  if (dom.ambientBubblesToggleInput) {
    dom.ambientBubblesToggleInput.checked = uiSettings.ambientBubblesEnabled;
  }
  if (dom.waterParticlesToggleInput) {
    dom.waterParticlesToggleInput.checked = uiSettings.waterParticlesEnabled;
  }
  if (dom.halloweenModeSelect instanceof HTMLSelectElement) {
    dom.halloweenModeSelect.value = uiSettings.halloweenMode;
  }
  const uvLightQualitySection = dom.uvLightQualitySelect?.closest(".settings-section");
  if (dom.uvLightQualitySelect instanceof HTMLSelectElement) {
    const uvLightSettingsVisible = isUvLightFeatureEnabled();
    dom.uvLightQualitySelect.value = uiSettings.uvLightQuality;
    dom.uvLightQualitySelect.disabled = !uvLightSettingsVisible;
    if (uvLightQualitySection instanceof HTMLElement) {
      uvLightQualitySection.hidden = !uvLightSettingsVisible;
    }
  }
  if (dom.tutorialSettingsSection) {
    dom.tutorialSettingsSection.hidden = !tutorialAvailable;
  }
  if (dom.replayTutorialButton) {
    dom.replayTutorialButton.disabled = !tutorialAvailable;
  }
  if (mouseLockRow instanceof HTMLElement) {
    mouseLockRow.hidden = !mouseLockAvailable;
  }
  if (dom.tankMouseLockToggleInput) {
    dom.tankMouseLockToggleInput.checked = uiSettings.tankMouseInputLocked;
    dom.tankMouseLockToggleInput.disabled = !mouseLockAvailable;
  }
  for (const input of dom.settingsOverlay.querySelectorAll("[data-toolbar-position-choice]")) {
    if (input instanceof HTMLInputElement) {
      input.checked = input.value === uiSettings.toolbarPosition;
      input.closest(".toolbar-position-option")?.classList.toggle("is-selected", input.checked);
    }
  }
  for (const input of dom.settingsOverlay.querySelectorAll("[data-display-position-choice]")) {
    if (input instanceof HTMLInputElement) {
      input.disabled = !DIGITAL_DISPLAY_ENABLED;
      input.checked = input.value === uiSettings.displayPosition;
      input.closest(".display-position-option")?.classList.toggle("is-selected", input.checked);
      input.closest(".display-position-option")?.classList.toggle("is-disabled", !DIGITAL_DISPLAY_ENABLED);
    }
  }
  syncWallpaperScrollControls(dom.settingsOverlay);
}

function renderEquipmentOverlay() {
  if (!dom.equipmentOverlay) {
    return;
  }

  dom.equipmentOverlay.hidden = !runtime.equipmentOverlayOpen;
  dom.equipmentOverlay.classList.toggle("is-open", runtime.equipmentOverlayOpen);
}

function buildTutorialTaskMarkup(popup) {
  const label = String(popup?.taskLabel || "");
  if (!label) {
    return "";
  }

  const letterCount = Math.max(1, label.length);
  const completeClass = popup.taskCompleted ? " is-complete" : "";
  return `
    <div class="tutorial-task-row${completeClass}" data-tutorial-task="${escapeHtml(popup.taskId || "")}" style="--task-letter-count: ${letterCount}">
      <span class="tutorial-task-box" aria-hidden="true"></span>
      <span class="tutorial-task-label">
        <span class="tutorial-task-text">${escapeHtml(label)}</span>
        <span class="tutorial-task-strike" aria-hidden="true"></span>
      </span>
    </div>
  `;
}

function getVisibleTutorialAvoidanceRect(element) {
  if (!(element instanceof HTMLElement) || element.hidden) {
    return null;
  }
  if (
    element.classList.contains("is-tutorial-hidden")
    || element.classList.contains("is-display-collapsed")
    || element.classList.contains("is-toolbar-collapsed")
    || element.getAttribute("aria-expanded") === "false"
  ) {
    return null;
  }

  const rect = element.getBoundingClientRect?.();
  return rect?.width && rect?.height ? rect : null;
}

function doRectsOverlap(left, right) {
  return Boolean(
    left
    && right
    && left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top
  );
}

function positionTutorialTaskPane() {
  const overlay = dom.introTutorialOverlay;
  const panel = dom.introTutorialPanel;
  if (!(overlay instanceof HTMLElement) || !(panel instanceof HTMLElement) || overlay.hidden || panel.hidden) {
    return;
  }

  const overlayRect = overlay.getBoundingClientRect?.();
  const panelRect = panel.getBoundingClientRect?.();
  if (!overlayRect?.width || !overlayRect?.height || !panelRect?.width || !panelRect?.height) {
    return;
  }

  const padding = 18;
  const gap = 14;
  const panelWidth = Math.min(panelRect.width, Math.max(1, overlayRect.width - padding * 2));
  const panelHeight = Math.min(panelRect.height, Math.max(1, overlayRect.height - padding * 2));
  const displayRect = getVisibleTutorialAvoidanceRect(dom.tankDisplay);
  const dockRect = getVisibleTutorialAvoidanceRect(dom.tankBottomDock);
  const avoidRects = [displayRect, dockRect].filter(Boolean);
  const clampCandidate = (candidate) => ({
    left: clamp(candidate.left, overlayRect.left + padding, overlayRect.right - padding - panelWidth),
    top: clamp(candidate.top, overlayRect.top + padding, overlayRect.bottom - padding - panelHeight)
  });
  const toRect = (candidate) => ({
    left: candidate.left,
    top: candidate.top,
    right: candidate.left + panelWidth,
    bottom: candidate.top + panelHeight
  });
  const adjustCandidate = (candidate) => {
    let next = clampCandidate(candidate);
    for (const avoidRect of avoidRects) {
      if (!doRectsOverlap(toRect(next), avoidRect)) {
        continue;
      }
      const rightOfAvoid = avoidRect.right + gap;
      const belowAvoid = avoidRect.bottom + gap;
      if (rightOfAvoid + panelWidth <= overlayRect.right - padding) {
        next.left = rightOfAvoid;
      } else if (belowAvoid + panelHeight <= overlayRect.bottom - padding) {
        next.top = belowAvoid;
      } else {
        next.left = overlayRect.right - padding - panelWidth;
      }
      next = clampCandidate(next);
    }
    return next;
  };
  const rawCandidates = [];
  if (displayRect) {
    const displayCenterX = displayRect.left + displayRect.width / 2;
    const displayCenterY = displayRect.top + displayRect.height / 2;
    const alignRight = displayCenterX > overlayRect.left + overlayRect.width / 2;
    const displayOnTop = displayCenterY <= overlayRect.top + overlayRect.height / 2;
    const displayInset = 16;
    const anchoredLeft = alignRight
      ? displayRect.right - panelWidth - displayInset
      : displayRect.left + displayInset;
    const leftAligned = displayRect.left + displayInset;
    const rightAligned = displayRect.right - panelWidth - displayInset;
    const preferredTop = displayOnTop
      ? displayRect.bottom + gap
      : displayRect.top - gap - panelHeight;
    const fallbackTop = displayOnTop
      ? displayRect.top - gap - panelHeight
      : displayRect.bottom + gap;
    rawCandidates.push(
      { left: anchoredLeft, top: preferredTop, priority: 0 },
      { left: leftAligned, top: preferredTop, priority: 1 },
      { left: rightAligned, top: preferredTop, priority: 1 },
      { left: anchoredLeft, top: fallbackTop, priority: 2 }
    );
  }
  rawCandidates.push(
    { left: overlayRect.left + padding, top: overlayRect.top + padding, priority: 3 },
    { left: overlayRect.right - padding - panelWidth, top: overlayRect.top + padding, priority: 3 },
    { left: overlayRect.left + padding, top: overlayRect.top + padding + 88, priority: 4 },
    { left: overlayRect.right - padding - panelWidth, top: overlayRect.top + padding + 88, priority: 4 }
  );
  const candidates = rawCandidates.map((candidate, index) => ({
    candidate: adjustCandidate(candidate),
    priority: candidate.priority,
    index
  }));
  const ranked = candidates
    .map(({ candidate, priority, index }) => {
      const rect = toRect(candidate);
      const overlaps = avoidRects.filter((avoidRect) => doRectsOverlap(rect, avoidRect)).length;
      return {
        candidate,
        score: overlaps * 10000
          + priority * 1000
          + Math.abs(candidate.top - overlayRect.top)
          + Math.abs(candidate.left - overlayRect.left) * 0.2
          + index
      };
    })
    .sort((left, right) => left.score - right.score);
  const best = ranked[0]?.candidate || candidates[0]?.candidate;
  panel.style.setProperty("--tutorial-pane-left", `${Math.round(best.left - overlayRect.left)}px`);
  panel.style.setProperty("--tutorial-pane-top", `${Math.round(best.top - overlayRect.top)}px`);
}

function renderIntroTutorial() {
  if (
    !dom.introTutorialOverlay
    || !dom.introTutorialPanel
    || !dom.introTutorialSplash
    || !dom.introTutorialKicker
    || !dom.introTutorialBody
    || !dom.introTutorialActions
    || !dom.introTutorialCloseButton
  ) {
    return;
  }

  const popup = getTutorialPopupConfig();
  const isSplash = popup?.mode === "splash";
  const loadingVisible = Boolean(dom.loadingOverlay && !dom.loadingOverlay.hidden);
  const isOpen = Boolean(popup);
  const isTask = popup?.mode === "task";
  const isBlocking = Boolean(popup?.blockInteraction);
  const closeAction = String(popup?.closeAction || "skip");

  dom.introTutorialOverlay.hidden = !isOpen;
  dom.introTutorialOverlay.classList.toggle("is-splash", isSplash);
  dom.introTutorialOverlay.classList.toggle("is-waiting-for-loading", isSplash && loadingVisible);
  dom.introTutorialOverlay.classList.toggle("is-task", isTask);
  dom.introTutorialOverlay.classList.toggle("is-blocking", isBlocking);
  dom.introTutorialPanel.classList.toggle("is-task-pane", isTask);
  dom.introTutorialPanel.classList.toggle("is-complete", Boolean(popup?.taskCompleted));

  if (!isOpen) {
    dom.introTutorialSplash.hidden = true;
    dom.introTutorialPanel.hidden = true;
    dom.introTutorialCloseButton.hidden = true;
    dom.introTutorialKicker.hidden = true;
    setTextIfChanged(dom.introTutorialKicker, "");
    setMarkupIfChanged("intro-tutorial-body", dom.introTutorialBody, "");
    setMarkupIfChanged("intro-tutorial-actions", dom.introTutorialActions, "");
    dom.introTutorialActions.hidden = true;
    return;
  }

  dom.introTutorialSplash.hidden = !isSplash;
  dom.introTutorialSplash.setAttribute("aria-hidden", String(!isSplash));
  dom.introTutorialPanel.hidden = isSplash;
  dom.introTutorialCloseButton.hidden = isSplash;
  if (isSplash) {
    dom.introTutorialActions.hidden = true;
    return;
  }

  const kicker = isTask ? "Tasks:" : "Tutorial";
  const bodyMarkup = isTask ? buildTutorialTaskMarkup(popup) : String(popup.body || "");
  const actionsMarkup = isTask ? "" : buildTutorialActionMarkup(popup.actions || []);

  if (isBlocking) {
    cancelTutorialBlockingTankInteractions();
  }

  dom.introTutorialKicker.hidden = false;
  setTextIfChanged(dom.introTutorialKicker, kicker);
  setMarkupIfChanged("intro-tutorial-body", dom.introTutorialBody, bodyMarkup);
  setMarkupIfChanged("intro-tutorial-actions", dom.introTutorialActions, actionsMarkup);
  dom.introTutorialActions.hidden = !actionsMarkup;
  positionTutorialTaskPane();
  dom.introTutorialCloseButton.setAttribute(
    "aria-label",
    closeAction === "dismiss-popup" ? "Close tutorial message" : "Skip tutorial"
  );
  dom.introTutorialCloseButton.onclick = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    advanceIntroTutorial(closeAction);
  };
  for (const button of dom.introTutorialActions.querySelectorAll("[data-tutorial-action]")) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    button.onclick = (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      advanceIntroTutorial(button.dataset.tutorialAction || "continue");
    };
  }
}

function findElementByDatasetValue(container, datasetKey, value) {
  if (!container || !value) {
    return null;
  }

  for (const element of container.querySelectorAll("*")) {
    if (element instanceof HTMLElement && element.dataset?.[datasetKey] === value) {
      return element;
    }
  }

  return null;
}

function renderTutorialGuidance() {
  const tutorialUi = getTutorialUiState();
  const dockButtonIds = [
    "openManagementButton",
    "overviewButton",
    "openStoreButton",
    "feedButton",
    "medicineButton",
    "spongeButton",
    "scoopButton",
    "careTaskPaneButton",
    "fishEditModeDockButton",
    "editModeDockButton",
    "openEquipmentButton",
    "openSettingsButton",
    "toggleMouseLockButton",
    "lightsOutToggleButton",
    "uvLightToggleButton"
  ];
  const clearSpotlights = () => {
    dom.tankDisplay?.classList.remove("is-tutorial-pulse");
    for (const container of [dom.editDecorTrayScroller, dom.foodTrayScroller, dom.fishShop, dom.decorShop]) {
      if (!container) {
        continue;
      }
      for (const element of container.querySelectorAll(".is-tutorial-pulse")) {
        element.classList.remove("is-tutorial-pulse");
      }
    }
  };

  dom.tankBottomDock?.classList.toggle("is-tutorial-hidden", Boolean(tutorialUi) && !tutorialUi.toolbarVisible);
  dom.tankDisplay?.classList.toggle("is-tutorial-hidden", Boolean(tutorialUi) && !tutorialUi.displayVisible);
  dom.tankDisplay?.classList.toggle("is-tutorial-pulse", Boolean(tutorialUi?.pulseDisplay));

  for (const buttonId of dockButtonIds) {
    const button = dom[buttonId];
    if (!button) {
      continue;
    }
    button.classList.toggle("is-tutorial-hidden", Boolean(tutorialUi) && !tutorialUi.visibleButtons.has(buttonId));
    button.classList.toggle("is-tutorial-pulse", Boolean(tutorialUi?.pulseButtons.has(buttonId)));
    button.classList.toggle("is-tutorial-reveal", Boolean(tutorialUi?.revealButtons.has(buttonId)));
  }

  const toolbarGroups = [
    {
      button: dom.careMenuButton,
      menu: dom.toolbarCareMenu,
      menuName: "care",
      childIds: ["medicineButton", "spongeButton", "scoopButton"]
    },
    {
      button: dom.editMenuButton,
      menu: dom.toolbarEditMenu,
      menuName: "edit",
      childIds: ["fishEditModeDockButton", "editModeDockButton", "openEquipmentButton"]
    }
  ];
  for (const group of toolbarGroups) {
    if (!group.button) {
      continue;
    }
    const groupVisible = !tutorialUi || group.childIds.some((buttonId) => tutorialUi.visibleButtons.has(buttonId));
    const groupPulse = Boolean(tutorialUi) && group.childIds.some((buttonId) => tutorialUi.pulseButtons.has(buttonId));
    const groupReveal = Boolean(tutorialUi) && group.childIds.some((buttonId) => tutorialUi.revealButtons.has(buttonId));
    group.button.classList.toggle("is-tutorial-hidden", !groupVisible);
    group.button.classList.toggle("is-tutorial-pulse", groupPulse);
    group.button.classList.toggle("is-tutorial-reveal", groupReveal);
    if (!groupVisible && runtime.toolbarActionMenu === group.menuName) {
      runtime.toolbarActionMenu = "";
      if (group.menu) {
        group.menu.hidden = true;
      }
    }
  }

  if (dom.toolbarTab) {
    dom.toolbarTab.classList.toggle("is-tutorial-hidden", Boolean(tutorialUi?.hideToolbarTab));
    dom.toolbarTab.classList.toggle("is-tutorial-pulse", false);
  }
  if (dom.displayTab) {
    dom.displayTab.classList.toggle("is-tutorial-hidden", Boolean(tutorialUi?.hideDisplayTab));
    dom.displayTab.classList.toggle("is-tutorial-pulse", false);
  }

  clearSpotlights();
  if (!tutorialUi) {
    return;
  }

  const decorTileButton = findElementByDatasetValue(dom.editDecorTrayScroller, "trayPlaceDecor", tutorialUi.pulseDecorKey);
  decorTileButton?.closest(".edit-decor-tile")?.classList.add("is-tutorial-pulse");

  const foodTileButton = findElementByDatasetValue(dom.foodTrayScroller, "selectFood", tutorialUi.pulseFoodKey);
  foodTileButton?.classList.add("is-tutorial-pulse");
  positionTutorialTaskPane();
}

function getStoredDecorEntries() {
  return Object.entries(state.decorInventory)
    .filter(([, count]) => count > 0)
    .sort(([leftKey], [rightKey]) => {
      const left = runtime.decorMap.get(leftKey)?.name || leftKey;
      const right = runtime.decorMap.get(rightKey)?.name || rightKey;
      return left.localeCompare(right);
    });
}

function getStoredDecorTrayEntryId(decorKey) {
  return `stored:${decorKey}`;
}

function normalizeDecorTrayEntryId(entryId) {
  const value = String(entryId || "");
  if (value.startsWith("stored:") || value.startsWith("placed:")) {
    return value;
  }
  return value ? getStoredDecorTrayEntryId(value) : "";
}

function getDecorTrayEntryById(entryId) {
  const normalizedId = normalizeDecorTrayEntryId(entryId);
  if (!normalizedId) {
    return null;
  }

  if (normalizedId.startsWith("placed:")) {
    const placedId = normalizedId.slice("placed:".length);
    const item = state.placedDecor.find((entry) => entry.id === placedId) || null;
    if (!item) {
      return null;
    }
    const decor = runtime.decorMap.get(item.decorKey) || {
      name: titleFromFile(item.decorKey),
      path: resolveAppUrl(`assets/decor/${encodeURIComponent(item.decorKey)}`),
      cost: 0
    };
    return {
      id: normalizedId,
      type: "placed",
      decorKey: item.decorKey,
      placedId,
      item,
      decor,
      count: 1
    };
  }

  const decorKey = normalizedId.slice("stored:".length);
  const count = Math.max(0, Number(state.decorInventory[decorKey]) || 0);
  if (!decorKey || count <= 0) {
    return null;
  }
  const decor = runtime.decorMap.get(decorKey) || {
    name: titleFromFile(decorKey),
    path: resolveAppUrl(`assets/decor/${encodeURIComponent(decorKey)}`),
    cost: 0
  };
  return {
    id: normalizedId,
    type: "stored",
    decorKey,
    placedId: "",
    item: null,
    decor,
    count
  };
}

function getDecorTrayEntries() {
  return getStoredDecorEntries().map(([decorKey, count]) => {
    const decor = runtime.decorMap.get(decorKey) || {
      name: titleFromFile(decorKey),
      path: resolveAppUrl(`assets/decor/${encodeURIComponent(decorKey)}`),
      cost: 0
    };
    return {
      id: getStoredDecorTrayEntryId(decorKey),
      type: "stored",
      decorKey,
      placedId: "",
      item: null,
      decor,
      count
    };
  });
}

function getInTankDecorTrayEntries() {
  return [...(Array.isArray(state.placedDecor) ? state.placedDecor : [])]
    .sort((left, right) => {
      const leftName = runtime.decorMap.get(left?.decorKey)?.name || titleFromFile(left?.decorKey || "");
      const rightName = runtime.decorMap.get(right?.decorKey)?.name || titleFromFile(right?.decorKey || "");
      return leftName.localeCompare(rightName) || getDecorTankLayer(left) - getDecorTankLayer(right) || String(left?.id || "").localeCompare(String(right?.id || ""));
    })
    .map((item) => {
      const decor = runtime.decorMap.get(item.decorKey) || {
        name: titleFromFile(item.decorKey),
        path: resolveAppUrl(`assets/decor/${encodeURIComponent(item.decorKey)}`),
        cost: 0
      };
      return {
        id: `placed:${item.id}`,
        type: "placed",
        decorKey: item.decorKey,
        placedId: item.id,
        item,
        decor,
        count: 1
      };
    });
}

function selectPlacedDecorFromTray(placedId, options = {}) {
  const item = setSelectedDecor(placedId, options);
  if (!item) {
    return;
  }

  runtime.placementMode = null;
  runtime.placementPreview = null;
  const decor = runtime.decorMap.get(item.decorKey);
  renderUi(Date.now());
  if (!options.additive && canConfigureDecorBubbler(item)) {
    openDecorSettings(item.id);
    return;
  }

  const selectedCount = getSelectedPlacedDecorItems().length;
  showToast(selectedCount > 1
    ? `${selectedCount} decor pieces selected.`
    : `${decor?.name || titleFromFile(item.decorKey)} selected.`);
}

function syncEditDecorTrayScrollControls() {
  if (!dom.editDecorTrayScroller || !dom.editDecorTrayPrev || !dom.editDecorTrayNext) {
    return;
  }

  const scroller = dom.editDecorTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const visible = !dom.editDecorTray?.hidden;

  dom.editDecorTrayPrev.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft <= 2;
  dom.editDecorTrayNext.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft >= maxScroll - 2;
}

function scrollEditDecorTray(direction) {
  if (!dom.editDecorTrayScroller) {
    return;
  }

  const distance = Math.max(180, Math.round(dom.editDecorTrayScroller.clientWidth * 0.72));
  dom.editDecorTrayScroller.scrollBy({
    left: distance * direction,
    behavior: "smooth"
  });

  window.setTimeout(() => syncEditDecorTrayScrollControls(), 180);
}

function clearEditDecorTrayLongPress(pointerId = null) {
  const pressState = runtime.editDecorTrayLongPress;
  if (
    pointerId !== null
    && Number.isInteger(pressState.pointerId)
    && pressState.pointerId !== pointerId
  ) {
    return;
  }

  if (pressState.timerId) {
    window.clearTimeout(pressState.timerId);
  }

  pressState.timerId = 0;
  pressState.pointerId = null;
  pressState.decorKey = null;
  pressState.entryId = null;
  pressState.startClientX = 0;
  pressState.startClientY = 0;
}

function shouldSuppressEditDecorTrayEntryClick(entryId) {
  const normalizedId = normalizeDecorTrayEntryId(entryId);
  if (!normalizedId || runtime.suppressEditDecorTrayClickEntryId !== normalizedId) {
    return false;
  }

  runtime.suppressEditDecorTrayClickEntryId = null;
  return true;
}

function shouldSuppressEditDecorTrayPlaceClick(decorKey) {
  if (!decorKey || runtime.suppressEditDecorTrayClickDecorKey !== decorKey) {
    return false;
  }

  runtime.suppressEditDecorTrayClickDecorKey = null;
  return true;
}

function closeEditDecorTrayContextMenu(options = {}) {
  runtime.editDecorTrayContextMenuState.entryId = null;
  runtime.editDecorTrayContextMenuState.decorKey = null;
  runtime.editDecorTrayContextMenuState.anchorX = 0;
  runtime.editDecorTrayContextMenuState.anchorY = 0;

  if (options.render !== false) {
    renderEditDecorTrayContextMenu();
  }
}

function resolveEditTrayContextMenuAnchor(tray, anchor = null) {
  const trayRect = tray?.getBoundingClientRect();
  if (!trayRect) {
    return { x: 0, y: 0 };
  }

  if (anchor instanceof Element && anchor.isConnected) {
    const buttonRect = anchor.getBoundingClientRect();
    return {
      x: buttonRect.left - trayRect.left + buttonRect.width / 2,
      y: buttonRect.top - trayRect.top
    };
  }

  const clientX = Number(anchor?.clientX);
  const clientY = Number(anchor?.clientY);
  if (Number.isFinite(clientX) && Number.isFinite(clientY)) {
    return {
      x: clientX - trayRect.left,
      y: clientY - trayRect.top
    };
  }

  return {
    x: trayRect.width / 2,
    y: trayRect.height / 2
  };
}

function positionEditTrayContextMenu(tray, menu, anchorX, anchorY) {
  const trayRect = tray.getBoundingClientRect();
  menu.style.left = "0px";
  menu.style.top = "0px";
  const menuRect = menu.getBoundingClientRect();
  const maxLeft = Math.max(
    EDIT_TRAY_CONTEXT_MENU_GUTTER_PX,
    trayRect.width - menuRect.width - EDIT_TRAY_CONTEXT_MENU_GUTTER_PX
  );
  const left = clamp(
    anchorX - menuRect.width / 2,
    EDIT_TRAY_CONTEXT_MENU_GUTTER_PX,
    maxLeft
  );
  const unclampedTop = anchorY - menuRect.height - 12;
  const top = clamp(
    unclampedTop,
    8 - trayRect.top,
    window.innerHeight - menuRect.height - 8 - trayRect.top
  );
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function openEditDecorTrayContextMenu(entryId, anchor = null) {
  if (getActiveTutorial() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION)) {
    closeEditDecorTrayContextMenu();
    return;
  }

  const entry = getDecorTrayEntryById(entryId);
  if (!entry) {
    closeEditDecorTrayContextMenu();
    return;
  }

  const nextAnchor = resolveEditTrayContextMenuAnchor(dom.editDecorTray, anchor);
  runtime.editDecorTrayContextMenuState.entryId = entry.id;
  runtime.editDecorTrayContextMenuState.decorKey = entry.decorKey;
  runtime.editDecorTrayContextMenuState.anchorX = nextAnchor.x;
  runtime.editDecorTrayContextMenuState.anchorY = nextAnchor.y;
  renderEditDecorTrayContextMenu();
}

function renderEditDecorTrayContextMenu() {
  const tray = dom.editDecorTray;
  const scroller = dom.editDecorTrayScroller;
  const menu = dom.editDecorTrayContextMenu;
  if (!tray || !menu) {
    return;
  }

  const entry = getDecorTrayEntryById(runtime.editDecorTrayContextMenuState.entryId);
  const decorKey = entry?.decorKey || "";
  const count = entry?.count || 0;
  const decor = entry?.decor || null;
  const isVisible = Boolean(runtime.editTankMode && !tray.hidden && entry && decor);

  tray.classList.toggle("has-context-menu", isVisible);
  if (scroller) {
    for (const button of scroller.querySelectorAll("[data-decor-tray-entry-id]")) {
      button.closest(".edit-decor-tile")?.classList.toggle("is-context-open", isVisible && normalizeDecorTrayEntryId(button.dataset.decorTrayEntryId) === entry?.id);
    }
  }

  if (!isVisible || !decor) {
    menu.hidden = true;
    menu.style.left = "";
    menu.style.top = "";
    return;
  }

  const resaleValue = getResaleValue(decor.cost || 0);
  const purchaseCost = getDecorPurchaseCost(decorKey);
  const decorTypeTone = getDecorTrayTypeTone(decor, decorKey);
  const canBuyAnotherDecor = entry.type === "stored";
  const canAffordAnotherDecor = state.coins >= purchaseCost;
  const grouped = entry.type === "placed" && isPlacedDecorGrouped(entry.item);
  const detailText = entry.type === "placed"
    ? `${grouped ? "Grouped - " : ""}Layer ${getDecorTankLayer(entry.item)} - ${formatDecorScale(entry.item.scale)}`
    : `${count} in storage`;
  const markup = `
    <div class="edit-fish-tray-context-card is-decor-context-card" data-decor-tone="${escapeHtml(decorTypeTone)}">
      <div class="edit-fish-tray-context-copy">
        <strong>${escapeHtml(decor.name)}</strong>
        <span>${escapeHtml(detailText)}</span>
      </div>
      ${entry.type === "placed" ? `
        <button
          class="edit-fish-tray-context-action"
          type="button"
          data-tray-select-placed-decor-action="${escapeHtml(entry.placedId)}"
        >
          Select In Tank
        </button>
        <button
          class="edit-fish-tray-context-action"
          type="button"
          data-tray-edit-decor-settings="${escapeHtml(entry.placedId)}"
        >
          Edit Settings
        </button>
        ${grouped ? `
          <button
            class="edit-fish-tray-context-action"
            type="button"
            data-tray-ungroup-decor="${escapeHtml(entry.placedId)}"
          >
            Ungroup
          </button>
        ` : ""}
        <button
          class="edit-fish-tray-context-action"
          type="button"
          data-tray-store-placed-decor="${escapeHtml(entry.placedId)}"
          ${grouped ? "disabled" : ""}
        >
          Put Away
        </button>
        <button
          class="edit-fish-tray-context-action warn sell-action"
          type="button"
          data-tray-sell-placed-decor="${escapeHtml(entry.placedId)}"
          ${grouped ? "disabled" : ""}
        >
          Sell For ${resaleValue} ${pluralize("coin", resaleValue)}
        </button>
      ` : `
        ${canBuyAnotherDecor ? `
          <button
            class="edit-fish-tray-context-action buy-another"
            type="button"
            data-tray-buy-another-decor="${escapeHtml(decorKey)}"
            title="Buy Another"
            ${canAffordAnotherDecor ? "" : "disabled"}
          >
            Buy Another ${purchaseCost} ${pluralize("coin", purchaseCost)}
          </button>
        ` : ""}
        <button
          class="edit-fish-tray-context-action warn sell-action"
          type="button"
          data-tray-sell-decor="${escapeHtml(decorKey)}"
        >
          Sell For ${resaleValue} ${pluralize("coin", resaleValue)}
        </button>
      `}
    </div>
  `;
  setMarkupIfChanged("edit-decor-tray-context-menu", menu, markup);
  menu.hidden = false;
  positionEditTrayContextMenu(
    tray,
    menu,
    runtime.editDecorTrayContextMenuState.anchorX,
    runtime.editDecorTrayContextMenuState.anchorY
  );
}

function hasInlineToolTrayOpen() {
  return runtime.editTankMode || runtime.fishEditMode || runtime.foodTrayOpen || runtime.medicineTrayOpen;
}

function getDecorTrayTypeTone(decor, decorKey) {
  const categories = deriveDecorCategories(decor, decorKey).map((category) => String(category || "").toLowerCase());
  if (categories.some((category) => category === "plants" || category === "plant")) {
    return "plants";
  }
  if (categories.some((category) => category === "caves" || category === "cave" || category === "hide")) {
    return "caves";
  }
  if (categories.some((category) => category === "bubbler" || category === "bubblers" || category === "bubble")) {
    return "bubbler";
  }
  if (categories.some((category) => category === "custom")) {
    return "custom";
  }
  return "ornaments";
}

function getDecorTrayTypeLabel(tone) {
  return ({
    caves: "Cave",
    plants: "Plant",
    ornaments: "Ornament",
    bubbler: "Bubbler",
    custom: "Custom"
  })[tone] || "Ornament";
}

function syncTankTrayStageClass() {
  dom.tankStage?.classList.toggle("has-edit-decor-tray", hasInlineToolTrayOpen());
}

function getResidenceAssignmentTarget() {
  return getPlacedDecorById(runtime.residenceSettingsDecorId) || getSelectedPlacedDecor();
}

function openDecorResidenceAssignment(placedId) {
  const item = setSelectedDecor(placedId);
  if (!item || !isDecorResidenceEligible(item)) {
    showToast("That structure cannot be used as a residence.");
    return false;
  }
  runtime.residenceSettingsDecorId = item.id;
  openUtilityOverlay("decor-residence", { clearPrimaryToolModes: false });
  return true;
}

function renderResidenceFishCard(fish, item, options = {}) {
  const species = getSpeciesForFish(fish);
  if (!fish || !species) {
    return "";
  }
  const now = Date.now();
  const fishAsset = getFishDisplayAssetPath(fish, species, now) || species.fallbackAsset || species.asset;
  const tank = getTankContainingFish(fish.id);
  const resident = options.resident === true;
  return `
    <article class="residence-fish-card ${resident ? "is-resident" : "is-nomadic"}">
      <img class="residence-fish-thumb" src="${escapeHtml(fishAsset)}" alt="${escapeHtml(fish.name)}" />
      <div class="residence-fish-copy">
        <strong>${escapeHtml(fish.name)}</strong>
        <span>${escapeHtml(getFishDisplaySpeciesName(fish, species))}</span>
        <small>${escapeHtml(getTankLabel(tank))}</small>
      </div>
      <button class="small-button ${resident ? "alt" : ""}" type="button"
        ${resident ? `data-unassign-residence-fish="${escapeHtml(fish.id)}"` : `data-assign-residence-fish="${escapeHtml(fish.id)}"`}
        data-residence-decor="${escapeHtml(item.id)}">
        ${resident ? "Unassign" : "Assign"}
      </button>
    </article>
  `;
}

function renderDecorResidenceAssignmentOverlay(item = getResidenceAssignmentTarget()) {
  if (!item || !isDecorResidenceEligible(item)) {
    return `<div class="empty-state">This residence is no longer available.</div>`;
  }
  const residents = getDecorResidents(item.id);
  const capacity = getDecorResidenceCapacity(item);
  const availableFish = getAllTankFish()
    .filter((fish) => fish && !isFishDead(fish) && !getFishResidenceDecorId(fish))
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  const openSlots = Math.max(0, capacity - residents.length);
  const residentMarkup = residents.length
    ? residents.map((fish) => renderResidenceFishCard(fish, item, { resident: true })).join("")
    : `<div class="empty-state compact">No fish live here yet.</div>`;
  const availableMarkup = openSlots <= 0
    ? `<div class="empty-state compact">This residence is full. Unassign a resident to make room.</div>`
    : availableFish.length
      ? availableFish.map((fish) => renderResidenceFishCard(fish, item)).join("")
      : `<div class="empty-state compact">Every living fish already has a residence. Unassigned fish remain nomadic.</div>`;
  return `
    <div class="residence-assignment-panel">
      <div class="residence-assignment-summary">
        <strong>${residents.length}/${capacity} resident ${pluralize("slot", capacity)}</strong>
        <span>Residents return here to sleep and rest. They still roam the borough for food, care, and friends.</span>
      </div>
      <section class="residence-assignment-section">
        <h3>Current Residents</h3>
        <div class="residence-fish-grid">${residentMarkup}</div>
      </section>
      <section class="residence-assignment-section">
        <h3>Nomadic Fish</h3>
        <p class="mini-note">Only fish without another residence appear here. Nomadic fish may temporarily use any unreserved shelter.</p>
        <div class="residence-fish-grid">${availableMarkup}</div>
      </section>
    </div>
  `;
}

function assignFishResidence(fishId, decorId) {
  const fish = getAllTankFish().find((entry) => entry?.id === fishId);
  const tank = getTankContainingDecor(decorId);
  const item = tank?.placedDecor?.find((entry) => entry.id === decorId) || null;
  if (!fish || !item || isFishDead(fish) || !isDecorResidenceEligible(item)) {
    showToast("That fish or residence is no longer available.");
    return false;
  }
  if (getFishResidenceDecorId(fish)) {
    showToast(`${fish.name} already has a residence.`);
    return false;
  }
  if (getDecorResidents(decorId).length >= getDecorResidenceCapacity(item)) {
    showToast("That residence is full.");
    return false;
  }
  fish.residenceDecorId = decorId;
  fish.favoriteSpot = {
    xNorm: clamp(Number(item.xNorm) || 0.5, 0.08, 0.92),
    yNorm: clamp((Number(item.yNorm) || 0.72) - 0.12, 0.14, 0.8),
    decorId,
    zoneType: isCaveDecorKey(item.decorKey) ? "hide" : "home",
    assignedAt: Date.now()
  };
  fish.coarseActivity = null;
  fish.behaviorNextThinkAt = 0;
  fish.lastNeighborhoodMoveAt = 0;
  const decorName = runtime.decorMap.get(item.decorKey)?.name || titleFromFile(item.decorKey);
  pushEvent(`${fish.name} moved into ${decorName}.`, Date.now(), tank, {
    type: "behavior",
    fishId: fish.id,
    decorKey: item.decorKey,
    placedDecorId: item.id
  });
  saveState();
  renderUi(Date.now());
  showToast(`${fish.name} now lives at ${decorName}.`);
  return true;
}

function unassignFishResidence(fishId, decorId = "") {
  const fish = getAllTankFish().find((entry) => entry?.id === fishId);
  const residenceDecorId = getFishResidenceDecorId(fish);
  if (!fish || !residenceDecorId || (decorId && residenceDecorId !== decorId)) {
    return false;
  }
  fish.residenceDecorId = null;
  if (fish.favoriteSpot?.decorId === residenceDecorId) {
    fish.favoriteSpot = null;
  }
  fish.behaviorNextThinkAt = 0;
  saveState();
  renderUi(Date.now());
  showToast(`${fish.name} is nomadic again.`);
  return true;
}

function handleDecorResidenceUtilityOverlayBodyClick(ctx, target) {
  const assignButton = target.closest("[data-assign-residence-fish]");
  if (assignButton) {
    assignFishResidence(assignButton.dataset.assignResidenceFish, assignButton.dataset.residenceDecor);
    return true;
  }
  const unassignButton = target.closest("[data-unassign-residence-fish]");
  if (unassignButton) {
    unassignFishResidence(unassignButton.dataset.unassignResidenceFish, unassignButton.dataset.residenceDecor);
    return true;
  }
  return false;
}

function setFreeDecorPlacementEnabled(enabled) {
  const tank = getCurrentTank();
  if (!tank) {
    return false;
  }

  const nextEnabled = enabled === true;
  if (tank.freeDecorPlacement === nextEnabled) {
    renderEditDecorTray();
    return false;
  }

  tank.freeDecorPlacement = nextEnabled;
  if (!nextEnabled) {
    for (const item of tank.placedDecor || []) {
      const placement = clampDecorPlacement(item.xNorm, item.yNorm, { item, tank, applyGravity: true });
      item.xNorm = placement.xNorm;
      item.yNorm = placement.yNorm;
      updatePlacedDecorResizeAnchor(item);
      applyDecorGravelInsertion(item);
    }
  }

  saveState();
  renderUi(Date.now());
  showToast(nextEnabled
    ? "Free Placement on. Grounded decor can now be positioned anywhere."
    : "Gravity on. Grounded decor dropped to its layer floor.");
  return true;
}

function renderEditDecorTray() {
  const visible = runtime.editTankMode;
  if (dom.editDecorTray) {
    dom.editDecorTray.hidden = !visible;
  }
  syncTankTrayStageClass();

  if (!visible || !dom.editDecorTrayScroller) {
    closeEditDecorTrayContextMenu({ render: false });
    renderEditDecorTrayContextMenu();
    syncEditDecorTrayScrollControls();
    return;
  }

  const validTabs = new Set(["all", "caves", "plants", "ornaments", "bubbler", "custom"]);
  if (!validTabs.has(runtime.editDecorTrayTab)) {
    runtime.editDecorTrayTab = "all";
  }
  for (const tab of dom.editDecorTray?.querySelectorAll?.("[data-decor-tray-tab]") || []) {
    const selected = tab.dataset.decorTrayTab === runtime.editDecorTrayTab;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  }
  const inTankToggle = dom.editDecorTray?.querySelector?.("[data-decor-in-tank-toggle]");
  if (inTankToggle) {
    inTankToggle.checked = Boolean(runtime.editDecorTrayInTank);
  }
  const freePlacementToggle = dom.editDecorTray?.querySelector?.("[data-decor-free-placement-toggle]");
  if (freePlacementToggle) {
    freePlacementToggle.checked = isFreeDecorPlacementEnabled();
  }

  const allTrayEntries = runtime.editDecorTrayInTank ? getInTankDecorTrayEntries() : getDecorTrayEntries();
  const trayEntries = runtime.editDecorTrayTab === "all"
    ? allTrayEntries
    : allTrayEntries.filter((entry) => getDecorTrayTypeTone(entry.decor, entry.decorKey) === runtime.editDecorTrayTab);
  const dataKey = [
    runtime.editTankMode ? "1" : "0",
    runtime.editDecorTrayTab,
    runtime.editDecorTrayInTank ? "tank" : "storage",
    isFreeDecorPlacementEnabled() ? "free" : "gravity",
    isViolenceAndGoreEnabled() ? "1" : "0",
    runtime.placementMode?.decorKey || "",
    runtime.selectedDecorId || "",
    (Array.isArray(runtime.selectedDecorIds) ? runtime.selectedDecorIds : []).join(","),
    ...trayEntries.map((entry) => [
      entry.id,
      entry.decorKey,
      entry.count,
      entry.type,
      entry.placedId || "",
      entry.item ? getDecorTankLayer(entry.item) : "",
      entry.item ? Number(entry.item.scale || 1).toFixed(2) : formatDecorScale(getDecorScaleDefault(entry.decorKey)),
      entry.item && isDecorHorizontallyFlipped(entry.item) ? 1 : 0,
      entry.item && isDecorVerticallyFlipped(entry.item) ? 1 : 0,
      entry.item?.groupId || ""
    ].join(":"))
  ].join("|");

  if (shouldRebuildRenderSection("edit-decor-tray-data", dataKey)) {
    const markup = trayEntries.length
      ? trayEntries
        .map((entry) => {
          const { decor, decorKey, count } = entry;
          const decorTypeTone = getDecorTrayTypeTone(decor, decorKey);
          const decorTypeLabel = getDecorTrayTypeLabel(decorTypeTone);
          const disabledByContent = entry.type === "stored" && !canUseDecorWithCurrentContentSettings(decorKey);
          const placing = entry.type === "stored" && !disabledByContent && runtime.placementMode?.decorKey === decorKey;
          const selected = entry.type === "placed" && getSelectedDecorIdSet().has(entry.placedId);
          const actionLabel = disabledByContent
            ? `${decor.name} is unavailable while Violence & Gore is off.`
            : entry.type === "placed"
              ? (selected ? `${decor.name} is selected` : `Select ${decor.name} in the tank`)
              : (placing ? `Cancel preview for ${decor.name}` : `Preview and place ${decor.name}`);
          const badge = entry.type === "placed"
            ? `${entry.item?.groupId ? "Group " : ""}Layer ${getDecorTankLayer(entry.item)}`
            : `x${count}`;
          const tileClasses = ["edit-decor-tile", "is-decor-type-tile"];
          if (placing || selected) {
            tileClasses.push("is-active");
          }
          if (disabledByContent) {
            tileClasses.push("is-disabled");
          }
          return `
            <article class="${tileClasses.join(" ")}" data-decor-tone="${decorTypeTone}" data-decor-name="${escapeHtml(decor.name)}">
              <button
                class="edit-decor-tile-menu-button"
                type="button"
                data-open-decor-tray-menu="${escapeHtml(entry.id)}"
                data-decor-tray-entry-id="${escapeHtml(entry.id)}"
                aria-label="More options for ${escapeHtml(decor.name)}"
                title="More options"
              >
                ...
              </button>
              <button
                class="edit-decor-tile-primary"
                type="button"
                data-decor-tray-entry-id="${escapeHtml(entry.id)}"
                ${entry.type === "placed" ? `data-tray-select-placed-decor="${escapeHtml(entry.placedId)}"` : `data-tray-place-decor="${escapeHtml(decorKey)}"`}
                title="${escapeHtml(actionLabel)}"
                aria-label="${escapeHtml(actionLabel)}"
              >
                <span class="edit-decor-tile-surface">
                  <img class="edit-decor-tile-thumb" src="${escapeHtml(getDecorThumbnailPath(decor))}" alt="${escapeHtml(decor.name)}"${entry.type === "placed" && (isDecorHorizontallyFlipped(entry.item) || isDecorVerticallyFlipped(entry.item)) ? ` style="transform: translate(-50%, -50%) scale(${isDecorHorizontallyFlipped(entry.item) ? -1 : 1}, ${isDecorVerticallyFlipped(entry.item) ? -1 : 1});"` : ""} />
                  <span class="inventory-tray-label">${escapeHtml(decorTypeLabel)}</span>
                  <span class="edit-decor-tile-count">${badge}</span>
                </span>
              </button>
            </article>
          `;
        })
        .join("")
      : `<div class="edit-decor-tray-empty">${allTrayEntries.length
        ? `No ${escapeHtml(getDecorTrayTypeLabel(runtime.editDecorTrayTab).toLowerCase())} decor is ${runtime.editDecorTrayInTank ? "currently in this tank" : "in storage"}.`
        : runtime.editDecorTrayInTank
          ? "No decor is currently in this tank."
          : "No decor is in storage. Open the store to buy something to place."}</div>`;

    setMarkupIfChanged("edit-decor-tray", dom.editDecorTrayScroller, markup);
  }

  renderEditDecorTrayContextMenu();
  syncEditDecorTrayScrollControls();
}

function getStoredFishEntries() {
  return [...state.storedFish].filter((fish) => !isFishDead(fish)).sort((left, right) => {
    const leftName = String(left.name || "").toLowerCase();
    const rightName = String(right.name || "").toLowerCase();
    return leftName.localeCompare(rightName) || left.acquiredAt - right.acquiredAt;
  });
}

function getFishTrayEntries() {
  if (runtime.fishEditTrayTab === "tank") {
    return [...state.fish]
      .filter((fish) => !isFishDead(fish))
      .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")) || left.acquiredAt - right.acquiredAt)
      .map((fish) => ({ fish, inStorage: false, dead: false }));
  }
  const livingStoredFish = getStoredFishEntries().map((fish) => ({
    fish,
    inStorage: true,
    dead: false
  }));
  const deadFish = [
    ...state.fish.filter((fish) => isFishDead(fish)).map((fish) => ({ fish, inStorage: false, dead: true })),
    ...state.storedFish.filter((fish) => isFishDead(fish)).map((fish) => ({ fish, inStorage: true, dead: true }))
  ].sort((left, right) => (left.fish.deadAt || 0) - (right.fish.deadAt || 0));
  return [...livingStoredFish, ...deadFish];
}

function getFishTrayMoodTone(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return "danger";
  }
  const moodValue = Number(getFishNeedsSnapshot(fish, now)?.mood?.value) || 0;
  return moodValue <= 19 ? "danger" : moodValue <= 49 ? "warn" : moodValue <= 69 ? "okay" : "good";
}

function syncEditFishTrayScrollControls() {
  if (!dom.editFishTrayScroller || !dom.editFishTrayPrev || !dom.editFishTrayNext) {
    return;
  }

  const scroller = dom.editFishTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const visible = !dom.editFishTray?.hidden;

  dom.editFishTrayPrev.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft <= 2;
  dom.editFishTrayNext.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft >= maxScroll - 2;
}

function scrollEditFishTray(direction) {
  if (!dom.editFishTrayScroller) {
    return;
  }

  const distance = Math.max(180, Math.round(dom.editFishTrayScroller.clientWidth * 0.72));
  dom.editFishTrayScroller.scrollBy({
    left: distance * direction,
    behavior: "smooth"
  });

  window.setTimeout(() => syncEditFishTrayScrollControls(), 180);
}

function clearEditFishTrayLongPress(pointerId = null) {
  const pressState = runtime.editFishTrayLongPress;
  if (
    pointerId !== null
    && Number.isInteger(pressState.pointerId)
    && pressState.pointerId !== pointerId
  ) {
    return;
  }

  if (pressState.timerId) {
    window.clearTimeout(pressState.timerId);
  }

  pressState.timerId = 0;
  pressState.pointerId = null;
  pressState.fishId = null;
  pressState.startClientX = 0;
  pressState.startClientY = 0;
}

function shouldSuppressEditFishTrayRestoreClick(fishId) {
  if (!fishId || runtime.suppressEditFishTrayClickFishId !== fishId) {
    return false;
  }

  runtime.suppressEditFishTrayClickFishId = null;
  return true;
}

function closeEditFishTrayContextMenu(options = {}) {
  runtime.editFishTrayContextMenuState.fishId = null;
  runtime.editFishTrayContextMenuState.anchorX = 0;
  runtime.editFishTrayContextMenuState.anchorY = 0;

  if (options.render !== false) {
    renderEditFishTrayContextMenu();
  }
}

function openEditFishTrayContextMenu(fishId, anchor = null) {
  const managed = getManagedFishById(fishId);
  if (!managed || (!managed.inStorage && !isFishDead(managed.fish))) {
    closeEditFishTrayContextMenu();
    return;
  }

  const nextAnchor = resolveEditTrayContextMenuAnchor(dom.editFishTray, anchor);
  runtime.editFishTrayContextMenuState.fishId = fishId;
  runtime.editFishTrayContextMenuState.anchorX = nextAnchor.x;
  runtime.editFishTrayContextMenuState.anchorY = nextAnchor.y;
  renderEditFishTrayContextMenu();
}

function renderEditFishTrayContextMenu() {
  const tray = dom.editFishTray;
  const scroller = dom.editFishTrayScroller;
  const menu = dom.editFishTrayContextMenu;
  if (!tray || !menu) {
    return;
  }

  const fishId = runtime.editFishTrayContextMenuState.fishId;
  const managed = fishId ? getManagedFishById(fishId) : null;
  const dead = isFishDead(managed?.fish);
  const isVisible = Boolean(runtime.fishEditMode && !tray.hidden && managed && (managed.inStorage || dead));

  tray.classList.toggle("has-context-menu", isVisible);
  if (scroller) {
    for (const button of scroller.querySelectorAll("[data-tray-restore-fish]")) {
      button.closest(".edit-decor-tile")?.classList.toggle("is-context-open", isVisible && button.dataset.trayRestoreFish === fishId);
    }
  }

  if (!isVisible) {
    menu.hidden = true;
    menu.style.left = "";
    menu.style.top = "";
    return;
  }

  const { fish } = managed;
  const species = getSpeciesForFish(fish);
  const displaySpeciesName = getFishDisplaySpeciesName(fish, species);
  const resaleValue = getResaleValue(species?.cost || 0);
  const canSell = Boolean(species) && !isFishJuvenile(fish);
  const markup = `
    <div class="edit-fish-tray-context-card">
      <div class="edit-fish-tray-context-copy">
        <strong>${escapeHtml(fish.name)}</strong>
        <span>${escapeHtml(displaySpeciesName)}</span>
      </div>
      ${dead ? `
        <button
          class="edit-fish-tray-context-action warn"
          type="button"
          data-tray-dispose-fish="${fish.id}"
        >
          Dispose Of Dead Fish
        </button>
      ` : `
        <button
          class="edit-fish-tray-context-action"
          type="button"
          data-tray-place-fish="${fish.id}"
        >
          Place In Tank
        </button>
        <button
          class="edit-fish-tray-context-action ${canSell ? "warn" : ""}"
          type="button"
          data-tray-sell-fish="${fish.id}"
          ${canSell ? "" : "disabled"}
        >
          ${canSell ? `Sell For ${resaleValue} ${pluralize("coin", resaleValue)}` : "Grow First"}
        </button>
      `}
    </div>
  `;
  setMarkupIfChanged("edit-fish-tray-context-menu", menu, markup);
  menu.hidden = false;
  positionEditTrayContextMenu(
    tray,
    menu,
    runtime.editFishTrayContextMenuState.anchorX,
    runtime.editFishTrayContextMenuState.anchorY
  );
}

function syncFoodTrayScrollControls() {
  if (!dom.foodTrayScroller || !dom.foodTrayPrev || !dom.foodTrayNext) {
    return;
  }

  const scroller = dom.foodTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const visible = !dom.foodTray?.hidden;

  dom.foodTrayPrev.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft <= 2;
  dom.foodTrayNext.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft >= maxScroll - 2;
}

function scrollFoodTray(direction) {
  if (!dom.foodTrayScroller) {
    return;
  }

  const distance = Math.max(180, Math.round(dom.foodTrayScroller.clientWidth * 0.72));
  dom.foodTrayScroller.scrollBy({
    left: distance * direction,
    behavior: "smooth"
  });

  window.setTimeout(() => syncFoodTrayScrollControls(), 180);
}

function syncMedicineTrayScrollControls() {
  if (!dom.medicineTrayScroller || !dom.medicineTrayPrev || !dom.medicineTrayNext) {
    return;
  }

  const scroller = dom.medicineTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const visible = !dom.medicineTray?.hidden;

  dom.medicineTrayPrev.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft <= 2;
  dom.medicineTrayNext.disabled = !visible || maxScroll <= 2 || scroller.scrollLeft >= maxScroll - 2;
}

function scrollMedicineTray(direction) {
  if (!dom.medicineTrayScroller) {
    return;
  }

  const distance = Math.max(180, Math.round(dom.medicineTrayScroller.clientWidth * 0.72));
  dom.medicineTrayScroller.scrollBy({
    left: distance * direction,
    behavior: "smooth"
  });

  window.setTimeout(() => syncMedicineTrayScrollControls(), 180);
}

function renderEditFishTray() {
  const visible = runtime.fishEditMode;
  if (dom.editFishTray) {
    dom.editFishTray.hidden = !visible;
  }
  syncTankTrayStageClass();

  if (!visible || !dom.editFishTrayScroller) {
    closeEditFishTrayContextMenu({ render: false });
    renderEditFishTrayContextMenu();
    syncEditFishTrayScrollControls();
    return;
  }

  for (const tab of dom.editFishTray?.querySelectorAll?.("[data-fish-tray-tab]") || []) {
    const selected = tab.dataset.fishTrayTab === runtime.fishEditTrayTab;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  }

  const trayEntries = getFishTrayEntries();
  const trayRenderNow = Date.now();
  const dataKey = [
    runtime.fishEditMode ? "1" : "0",
    runtime.fishEditTrayTab,
    ...trayEntries.map(({ fish, inStorage, dead }) => [fish.id, fish.name, fish.speciesId, fish.undeadTemplateSpeciesId || "", Number(fish.scale || 1).toFixed(2), inStorage ? "storage" : "tank", dead ? "dead" : "living", !inStorage && !dead ? getFishTrayMoodTone(fish, trayRenderNow) : "neutral"].join(":"))
  ].join("|");

  if (shouldRebuildRenderSection("edit-fish-tray-data", dataKey)) {
    const markup = trayEntries.length
      ? trayEntries.map(({ fish, inStorage, dead }) => {
        const species = runtime.fishMap.get(fish.speciesId);
        const displaySpeciesName = getFishDisplaySpeciesName(fish, species);
        const label = `${fish.name}${displaySpeciesName ? ` - ${displaySpeciesName}` : ""}`;
        const moodTone = !inStorage && !dead ? getFishTrayMoodTone(fish, trayRenderNow) : "";
        const actionLabel = !inStorage && !dead
          ? `Open behavior menu for ${fish.name}`
          : dead
          ? `Dispose of ${fish.name}`
          : `Place ${fish.name} in the tank`;
        return `
          <article class="edit-decor-tile ${dead ? "is-dead" : ""}${moodTone ? " is-fish-mood-tile" : ""}" ${moodTone ? `data-mood-tone="${moodTone}"` : ""} data-decor-name="${label}">
            ${inStorage || dead ? `<button
              class="edit-decor-tile-menu-button"
              type="button"
              data-open-fish-tray-menu="${fish.id}"
              aria-label="More options for ${fish.name}"
              title="More options"
            >
              ...
            </button>` : ""}
            <button
              class="edit-decor-tile-primary"
              type="button"
              ${!inStorage && !dead ? `data-tray-select-fish="${fish.id}"` : `data-tray-restore-fish="${fish.id}"`}
              title="${actionLabel}"
              aria-label="${actionLabel}"
            >
              <span class="edit-decor-tile-surface">
                <img class="edit-decor-tile-thumb" src="${getFishDisplayAssetPath(fish, species) || species?.asset || ""}" alt="${label}" />
                <span class="inventory-tray-label">${!inStorage && !dead ? escapeHtml(fish.name || "Fish") : dead ? (inStorage ? "Dead In Storage" : "Dead In Tank") : "Storage"}</span>
              </span>
            </button>
          </article>
        `;
      }).join("")
      : `<div class="edit-decor-tray-empty">${runtime.fishEditTrayTab === "tank" ? "No living fish are in this tank." : "No stored or deceased fish need attention right now."}</div>`;

    setMarkupIfChanged("edit-fish-tray", dom.editFishTrayScroller, markup);
  }

  renderEditFishTrayContextMenu();
  syncEditFishTrayScrollControls();
  if (!trayEntries.length) {
    dom.editFishTrayPrev.disabled = true;
    dom.editFishTrayNext.disabled = true;
  }
}

function renderFoodTray() {
  const visible = runtime.foodTrayOpen;
  if (dom.foodTray) {
    dom.foodTray.hidden = !visible;
  }
  syncTankTrayStageClass();

  if (!visible || !dom.foodTrayScroller) {
    syncFoodTrayScrollControls();
    return;
  }

  const items = getFoodCatalog().filter((food) => (
    shouldShowFoodInStore(food)
    && food.id !== "upgraded"
    && Math.max(0, Number(state.foodInventory?.[food.id]) || 0) > 0
  ));
  const dataKey = [
    runtime.foodTrayOpen ? "1" : "0",
    runtime.feedingModeFoodKey || "",
    ...getFoodCatalog().filter((food) => shouldShowFoodInStore(food)).map((food) => `${food.id}:${state.foodInventory?.[food.id] || 0}`)
  ].join("|");

  if (shouldRebuildRenderSection("food-tray-data", dataKey)) {
    const markup = items.length
      ? items.map((food) => {
        const quantity = Math.max(0, Number(state.foodInventory?.[food.id]) || 0);
        const active = runtime.feedingModeFoodKey === food.id;
        const label = `${food.name} - ${quantity} left`;
        return `
          <button
            class="edit-decor-tile ${active ? "is-active" : ""}"
            type="button"
            data-select-food="${food.id}"
            data-decor-name="${label}"
            title="${label}"
            aria-label="${active ? `Selected ${food.name}` : `Select ${food.name}`}"
            ${quantity > 0 ? "" : "disabled"}
            style="--tray-accent: #E0B24C;"
          >
            <span class="edit-decor-tile-surface inventory-tray-tile-surface">
              ${renderFoodAndMedImage("food", food.id, food.name, "edit-decor-tile-thumb inventory-tray-thumb")}
              <span class="inventory-tray-label">${food.name.replace(" Food", "")}</span>
              <span class="edit-decor-tile-count">x${quantity}</span>
            </span>
          </button>
        `;
      }).join("")
      : `<div class="edit-decor-tray-empty">No food is stocked yet. Open the store to buy a bottle first.</div>`;

    setMarkupIfChanged("food-tray", dom.foodTrayScroller, markup);
  }

  syncFoodTrayScrollControls();
}

function renderMedicineTray() {
  const visible = runtime.medicineTrayOpen;
  if (dom.medicineTray) {
    dom.medicineTray.hidden = !visible;
  }
  syncTankTrayStageClass();

  if (!visible || !dom.medicineTrayScroller) {
    syncMedicineTrayScrollControls();
    return;
  }

  const items = getMedicineCatalog().filter((medicine) => (
    shouldShowMedicineInStore(medicine)
    && Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0) > 0
  ));
  const dataKey = [
    runtime.medicineTrayOpen ? "1" : "0",
    runtime.medicineModeKey || "",
    ...getMedicineCatalog().map((medicine) => `${medicine.id}:${state.medicineInventory?.[medicine.id] || 0}`)
  ].join("|");

  if (shouldRebuildRenderSection("medicine-tray-data", dataKey)) {
    const markup = items.length
      ? items.map((medicine) => {
        const quantity = Math.max(0, Number(state.medicineInventory?.[medicine.id]) || 0);
        const active = runtime.medicineModeKey === medicine.id;
        const label = `${medicine.name} - ${quantity} left`;
        return `
          <button
            class="edit-decor-tile ${active ? "is-active" : ""}"
            type="button"
            data-select-medicine="${medicine.id}"
            data-decor-name="${label}"
            title="${label}"
            aria-label="${active ? `Selected ${medicine.name}` : `Select ${medicine.name}`}"
            ${quantity > 0 ? "" : "disabled"}
            style="--tray-accent: ${medicine.color};"
          >
            <span class="edit-decor-tile-surface inventory-tray-tile-surface">
              ${renderFoodAndMedImage("medicine", medicine.id, medicine.name, "edit-decor-tile-thumb inventory-tray-thumb")}
              <span class="inventory-tray-label">${medicine.name.replace(" Drops", "")}</span>
              <span class="edit-decor-tile-count">x${quantity}</span>
            </span>
          </button>
        `;
      }).join("")
      : `<div class="edit-decor-tray-empty">No medicine is stocked yet. Open the pharmacy to buy a bottle first.</div>`;

    setMarkupIfChanged("medicine-tray", dom.medicineTrayScroller, markup);
  }

  syncMedicineTrayScrollControls();
}

function renderFishList(now) {
  const starterSpecies = getStarterFishSpecies();
  const starterName = starterSpecies?.name || "starter fish";
  const emergencyStarter = starterSpecies ? getFishPurchaseCost(starterSpecies.id) === 0 : false;
  const starterCost = starterSpecies ? starterSpecies.cost : 1;
  const fishListDataKey = [
    getLocalDayKey(now),
    starterSpecies?.id || "",
    starterCost,
    emergencyStarter ? 1 : 0,
    runtime.collapsedSections.fishTank ? 1 : 0,
    runtime.collapsedSections.fishDead ? 1 : 0,
    runtime.collapsedSections.fishStorage ? 1 : 0,
    state.selectedFilterAsset,
    state.fish.map((fish) => [
      fish.id,
      fish.name,
      fish.speciesId,
      fish.undeadTemplateSpeciesId || "",
      fish.healthUnits,
      Number(fish.scale).toFixed(2),
      fish.acquiredAt,
      fish.growthEndsAt || "",
      fish.deadAt || "",
      fish.fedStreak || 0,
      FISH_NEED_KEYS.map((needKey) => Math.round(Number(fish.needs?.[needKey]) || 0)).join(":")
    ].join(",")).join(";"),
    state.storedFish.map((fish) => [
      fish.id,
      fish.name,
      fish.speciesId,
      fish.undeadTemplateSpeciesId || "",
      fish.healthUnits,
      Number(fish.scale).toFixed(2),
      fish.acquiredAt,
      fish.growthEndsAt || "",
      fish.deadAt || "",
      fish.fedStreak || 0,
      FISH_NEED_KEYS.map((needKey) => Math.round(Number(fish.needs?.[needKey]) || 0)).join(":")
    ].join(",")).join(";")
  ].join("|");
  if (!shouldRebuildRenderSection("fish-list-data", fishListDataKey)) {
    return;
  }

  const livingTankFish = state.fish.filter((fish) => !isFishDead(fish));
  const deadTankFish = state.fish.filter((fish) => isFishDead(fish));
  const deadStoredFish = state.storedFish.filter((fish) => isFishDead(fish));
  const livingStoredFish = getStoredFishEntries();
  const deadFishEntries = [
    ...deadTankFish.map((fish) => ({ fish, inStorage: false })),
    ...deadStoredFish.map((fish) => ({ fish, inStorage: true }))
  ];

  const tankCollapsed = isSidebarSectionCollapsed("fishTank");
  const deadCollapsed = deadFishEntries.length ? isSidebarSectionCollapsed("fishDead") : true;
  const storageCollapsed = isSidebarSectionCollapsed("fishStorage");

  const activeMarkup = livingTankFish.length
    ? [...livingTankFish]
      .sort((left, right) => getFishHealthRatio(left) - getFishHealthRatio(right) || left.healthUnits - right.healthUnits || left.acquiredAt - right.acquiredAt)
      .map((fish) => renderManagedFishCard(fish, now, {
        inStorage: false
      }))
      .join("")
    : `<div class="empty-state">The tank is empty. Open the cart and ${emergencyStarter ? `grab a free ${starterName} to get back on your feet.` : `grab a ${starterName} for ${starterCost} ${pluralize("coin", starterCost)} to get started.`}</div>`;

  const deadMarkup = deadFishEntries.length
    ? [...deadFishEntries]
      .sort((left, right) => (left.fish.deadAt || 0) - (right.fish.deadAt || 0))
      .map((entry) => renderManagedFishCard(entry.fish, now, {
        inStorage: entry.inStorage
      }))
      .join("")
    : `<div class="empty-state">No dead fish are in the tank or storage.</div>`;

  const storedMarkup = livingStoredFish.length
    ? [...livingStoredFish]
      .sort((left, right) => left.acquiredAt - right.acquiredAt)
      .map((fish) => renderManagedFishCard(fish, now, {
        inStorage: true
      }))
      .join("")
    : `<div class="empty-state">No living fish are in storage.</div>`;

  setMarkupIfChanged("fish-list", dom.fishList, `
    <section class="info-card stack-section collapsible-section ${tankCollapsed ? "is-collapsed" : ""}" data-collapsible-section="fishTank">
      <div class="collapsible-header">
        <button
          class="collapsible-toggle"
          type="button"
          data-collapsible-toggle="fishTank"
          aria-expanded="${String(!tankCollapsed)}"
        >
          <span class="collapsible-title">In Tank</span>
          <span class="collapsible-icon" data-collapsible-icon>${tankCollapsed ? "&#9660;" : "&#9650;"}</span>
        </button>
        <div class="collapsible-meta">
          <strong>${livingTankFish.length}</strong>
        </div>
      </div>
      <div class="card-stack" data-collapsible-body ${tankCollapsed ? "hidden" : ""}>${activeMarkup}</div>
    </section>

    ${deadFishEntries.length ? `
      <section class="info-card stack-section collapsible-section ${deadCollapsed ? "is-collapsed" : ""}" data-collapsible-section="fishDead">
        <div class="collapsible-header">
          <button
            class="collapsible-toggle"
            type="button"
            data-collapsible-toggle="fishDead"
            aria-expanded="${String(!deadCollapsed)}"
          >
            <span class="collapsible-title">Dead Fish</span>
            <span class="collapsible-icon" data-collapsible-icon>${deadCollapsed ? "&#9660;" : "&#9650;"}</span>
          </button>
          <div class="collapsible-meta">
            <button class="small-button warn" data-dispose-all-dead title="Dispose of all dead fish" aria-label="Dispose of all dead fish">&#128701;</button>
            <strong>${deadFishEntries.length}</strong>
          </div>
        </div>
        <div class="card-stack" data-collapsible-body ${deadCollapsed ? "hidden" : ""}>${deadMarkup}</div>
      </section>
    ` : ""}

    <section class="info-card stack-section collapsible-section ${storageCollapsed ? "is-collapsed" : ""}" data-collapsible-section="fishStorage">
      <div class="collapsible-header">
        <button
          class="collapsible-toggle"
          type="button"
          data-collapsible-toggle="fishStorage"
          aria-expanded="${String(!storageCollapsed)}"
        >
          <span class="collapsible-title">Storage</span>
          <span class="collapsible-icon" data-collapsible-icon>${storageCollapsed ? "&#9660;" : "&#9650;"}</span>
        </button>
        <div class="collapsible-meta">
          <strong>${livingStoredFish.length}</strong>
        </div>
      </div>
      <div class="card-stack" data-collapsible-body ${storageCollapsed ? "hidden" : ""}>${storedMarkup}</div>
    </section>
  `);
}

function renderManagedFishCard(fish, now, options = {}) {
  const species = runtime.fishMap.get(fish.speciesId);
  if (!species) {
    return "";
  }

  const dead = isFishDead(fish);
  const juvenile = !dead && isFishJuvenile(fish, now);
  const comfort = getFishComfort(fish, now);
  const age = formatFishAge(fish.acquiredAt, now);
  const defaultScale = getFishScaleDefault(fish.speciesId);
  const usesDefaultScale = Math.abs(defaultScale - fish.scale) < 0.001;
  const inStorage = Boolean(options.inStorage);
  const displaySpeciesName = getFishDisplaySpeciesName(fish, species);
  const detritusFish = isDetritusFish(fish);
  const mealFreeFish = isMealFreeFish(fish);
  const goreEnabled = isGoreEnabled();
  const undeadFish = goreEnabled && isUndeadFish(fish);
  const zombieHunterFish = !dead && usesZombieHunterBehavior(fish);
  const zombieBittenFish = hasZombieBiteInfection(fish);
  const piranhaFish = isPiranhaSpecies(fish);
  const maxHealthUnits = getFishMaxHealthUnits(fish, species);
  const criticalComfort = !inStorage && !dead && comfort.value <= 0;
  const needsSnapshot = (!dead && !inStorage) ? getFishNeedsSnapshot(fish, now) : null;
  const hungerLabel = needsSnapshot ? getFishHungerLabel(fish, now) : "";
  const hungerValue = needsSnapshot ? needsSnapshot.needs.hunger : 100;
  const fishAsset = getFishDisplayAssetPath(fish, species, now) || species.fallbackAsset || species.asset;
  const corpseState = getFishCorpseDisplayState(fish, now);
  const beingConsumed = corpseState === "devoured";
  const awaitingZombieRise = dead && hasPendingZombieRevival(fish);
  const corpsePressure = !inStorage && hasExposedDeadTankFish(now);
  const showDisposeButton = dead && !beingConsumed;
  const status = inStorage
    ? (dead
      ? awaitingZombieRise
        ? "Stored corpse will rise as a zombie soon."
        : corpseState === "skeleton"
          ? "Stored skeleton awaiting disposal."
          : corpseState === "zombie"
            ? "Stored zombie remains awaiting disposal."
            : (goreEnabled ? "Stored remains awaiting disposal." : "Stored dead fish awaiting disposal.")
      : "Stored safely outside the tank.")
    : dead
      ? beingConsumed
        ? (goreEnabled ? "Piranhas are stripping it to the bone." : "Piranhas are disposing of the remains.")
        : !goreEnabled
          ? "Dead and awaiting disposal."
          : awaitingZombieRise
            ? "A zombie bite is raising it back up."
            : corpseState === "skeleton"
              ? "Reduced to a skeleton."
              : corpseState === "zombie"
                ? "Rotting into a zombie."
                : "Freshly dead and floating at the surface."
      : criticalComfort
        ? corpsePressure
          ? "Panicking while a dead fish fouls the water."
          : "Tank conditions are dangerously filthy."
        : zombieBittenFish
          ? "Bleeding out from a zombie bite."
          : zombieHunterFish
            ? "Stalking living fish for a bite."
            : undeadFish
              ? "Ignores hunger and dirty water, but unnerves the living."
              : piranhaFish
                ? (goreEnabled ? (getActivePiranhaPrey(now) ? "Blood frenzy in progress." : "Hunting any non-undead fish or corpse.") : "Tracks chum without attacking tankmates.")
                : juvenile
                  ? "Growing into full size."
                  : detritusFish
                    ? "Suctioned to the back glass."
                    : hungerValue <= FISH_HUNGER_CRITICAL_THRESHOLD
                      ? "Starving"
                      : hungerValue <= FISH_HUNGER_LOW_THRESHOLD
                        ? hungerLabel
                        : needsSnapshot
                          ? `${needsSnapshot.mood.label} - ${hungerLabel}`
                          : "Waiting";
  const healthNote = dead
    ? beingConsumed
      ? (goreEnabled
        ? "Piranhas will carry this fish through the zombie and skeleton stages automatically, then finish it off. No disposal needed."
        : "Piranhas will finish disposing of this fish automatically. No manual disposal needed.")
      : !goreEnabled
        ? "This fish died. Gore is off, so it will not decay or rise again."
        : awaitingZombieRise
          ? "Dispose of this corpse before it rises again as a zombie variant."
          : corpseState === "skeleton"
            ? "This fish has reached the skeleton stage. The Skeleton Fish shop unlock triggers here."
            : corpseState === "zombie"
              ? "This fish has reached the zombie stage. Leave it another 12 hours to reach the skeleton unlock."
              : "Leave it for 12 hours to reach the zombie stage, then another 12 hours to become a skeleton."
    : criticalComfort
      ? corpsePressure
        ? "Comfort is 0% while a dead fish stays in the tank. Remove it fast."
        : "Comfort is 0% at maximum dirtiness. Clean the tank before health keeps dropping."
      : zombieBittenFish
        ? "A zombie bite makes this fish panic, spill blood every second, and die in about 30 seconds."
        : zombieHunterFish
          ? "Zombie hunters bite living non-undead fish, then their victims bleed out and may rise again in 1-2 minutes if left alone."
          : undeadFish
            ? "Undead fish ignore hunger, discomfort, and dirty water, but reduce nearby living fish comfort by about 10% and may lash out."
            : piranhaFish
              ? (goreEnabled ? "Piranhas ignore pellets, devour any non-undead fish in the tank, and cloud the water red while feeding." : "Piranhas still go after chum, but they will leave the rest of the tank alone.")
              : juvenile
                ? "Baby fish start at 25% size and grow to full size over a few days."
                : detritusFish
                  ? "Feeds on grime and poop instead of pellets."
                  : fish.healthUnits < maxHealthUnits
                    ? `Recovery streak: ${Math.min(fish.fedStreak, RECOVERY_FEED_STREAK)}/${RECOVERY_FEED_STREAK}`
                    : "Full hearts and thriving.";
  const rewardLabel = dead
    ? "No feeding care coins"
    : detritusFish
      ? "Cleans tank"
      : mealFreeFish
        ? "No feeding care coins"
        : `+${species.mealCoins} feeding care`;
  const dirtinessLoadPercent = Math.round(getFishDirtinessBonus(fish, species) * 100);

  return `
    <article class="fish-card">
      <img class="fish-thumb" src="${fishAsset}" alt="${fish.name}" />
      <div class="fish-card-main">
        <div class="fish-card-heading">
          <div class="fish-card-title">
            <strong>${fish.name}</strong>
            <div class="fish-species">${displaySpeciesName}</div>
          </div>
          ${showDisposeButton ? `<button class="small-button warn" data-dispose-fish="${fish.id}" title="Dispose of ${fish.name}" aria-label="Dispose of ${fish.name}">&#128701;</button>` : ""}
        </div>
        <div class="hearts">${renderHearts(fish.healthUnits, maxHealthUnits)}</div>
        <div class="fish-status-line">${status}</div>
        <div class="fish-trait-row">
          <span class="fish-trait">${inStorage ? (dead ? `Status: ${getFishCorpseStateLabel(fish, now)}` : "Storage") : dead ? `Status: ${getFishCorpseStateLabel(fish, now)}` : `Comfort: ${comfort.label}`}</span>
          ${juvenile ? `<span class="fish-trait">Stage: Baby</span>` : ""}
          ${detritusFish ? `<span class="fish-trait">Diet: grime + waste</span>` : ""}
          ${piranhaFish ? `<span class="fish-trait">Diet: live prey</span>` : ""}
          ${undeadFish ? `<span class="fish-trait">Diet: none</span>` : ""}
          ${zombieBittenFish && !dead ? `<span class="fish-trait">Status: Infected</span>` : ""}
          ${goreEnabled && dead && awaitingZombieRise ? `<span class="fish-trait">Decay: Rising zombie</span>` : ""}
          ${goreEnabled && dead && corpseState === "zombie" ? `<span class="fish-trait">Decay: Zombie</span>` : ""}
          ${goreEnabled && dead && corpseState === "skeleton" ? `<span class="fish-trait">Decay: Skeleton</span>` : ""}
          ${dead && corpseState === "devoured" ? `<span class="fish-trait">Decay: Piranha feeding</span>` : ""}
          ${!dead ? `<span class="fish-trait">Grime load: +${dirtinessLoadPercent}%</span>` : ""}
          <span class="fish-trait">Swim: ${zombieHunterFish ? "Undead hunter" : formatSwimStyle(species.swimStyle)}</span>
          <span class="fish-trait">Age: ${age}</span>
        </div>
        <div class="mini-note fish-health-note">${healthNote}</div>
      </div>
      <div class="fish-actions fish-card-actions">
        <div class="size-controls">
          <button class="small-button icon alt" data-size-fish="${fish.id}" data-size-direction="-1" aria-label="Make ${fish.name} smaller">-</button>
          <span class="size-badge">${formatFishScale(fish.scale)}</span>
          <button class="small-button icon alt" data-size-fish="${fish.id}" data-size-direction="1" aria-label="Make ${fish.name} larger">+</button>
        </div>
        <div class="fish-card-button-row">
          <span class="price-tag">${rewardLabel}</span>
          <button class="small-button" data-copy-fish-size="${fish.id}" title="Use ${formatFishScale(fish.scale)} as the default size for future ${displaySpeciesName.toLowerCase()}s">
            ${usesDefaultScale ? "Default Set" : "Set Default"}
          </button>
          <button class="small-button alt" data-open-fish="${fish.id}">Details</button>
          ${dead ? "" : `
            <button class="small-button alt" data-sell-fish="${fish.id}">
              Sell
            </button>
            <button class="small-button ${inStorage ? "" : "warn"}" data-${inStorage ? "restore-fish" : "store-fish"}="${fish.id}">
              ${inStorage ? "Return to Tank" : "Put Away"}
            </button>
          `}
        </div>
      </div>
    </article>
  `;
}

function clearFishInspectorDisplayDocking() {
  const inspector = dom.fishInspector;
  if (!inspector) {
    return;
  }

  inspector.classList.remove("is-docked-below-display");
  inspector.style.left = "";
  inspector.style.top = "";
  inspector.style.right = "";
  inspector.style.bottom = "";
  inspector.style.width = "";
  inspector.style.maxHeight = "";
}

function getTankNormStagePoint(xNorm, yNorm) {
  const dpr = getStageRenderDevicePixelRatio();
  const scale = Math.max(0.0001, Number(runtime.stageRenderScale) || dpr);
  const offsetX = Number(runtime.stageRenderOffsetX) || 0;
  const offsetY = Number(runtime.stageRenderOffsetY) || 0;
  return {
    x: ((clamp(Number(xNorm) || 0.5, 0, 1) * TANK_WIDTH) * scale + offsetX) / dpr,
    y: ((clamp(Number(yNorm) || 0.5, 0, 1) * TANK_HEIGHT) * scale + offsetY) / dpr
  };
}

function holdFishForActionMenu(fish, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  if (!fish || !species || isFishDead(fish)) {
    return false;
  }

  const activeQueueItem = getFishActionQueueState(fish.id)?.active || null;
  if (activeQueueItem?.action !== "eat") {
    releasePelletsTargetingFishIds(fish.id);
  }
  if (!activeQueueItem) {
    clearFishActionSteering(fish);
  }
  clearDebugBehaviorSteering(fish);
  clearFishSchoolFollowState(fish);
  clearForcedGravelDigPrompt(fish);
  clearFishGravelPebbleAction(fish, species, now, { resetTarget: false });
  if (fish.caveState) {
    abortFishCaveBehavior(fish, now, false);
  }

  fish.activity = "roam";
  if (activeQueueItem?.action !== "eat") {
    fish.feedingPelletId = null;
  }
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  fish.targetXNorm = clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92);
  fish.targetYNorm = clamp(Number(fish.yNorm) || 0.5, 0.14, 0.84);
  fish.targetAt = now + 60 * 60 * 1000;
  fish.motionLevel = Math.min(Number(fish.motionLevel) || 0.08, 0.08);
  if (species.speedMode === "dynamic") {
    fish.swimSpeed = normalizeFishSpeed(species, species.speedMin);
  }
  runtime.fishActionMenuHold = {
    fishId: fish.id,
    activeQueueItemId: activeQueueItem?.id || "",
    startedAt: now,
    xNorm: fish.targetXNorm,
    yNorm: fish.targetYNorm,
    tankLayer: getFishTankLayer(fish)
  };
  return true;
}

function releaseFishActionMenuHold(options = {}) {
  const hold = runtime.fishActionMenuHold;
  runtime.fishActionMenuHold = null;
  if (!hold?.fishId) {
    return;
  }
  const queue = getFishActionQueueState(hold.fishId);
  if (queue?.active && hold.activeQueueItemId === queue.active.id && Number.isFinite(Number(queue.active.endsAt))) {
    const heldMs = Math.max(0, Date.now() - (Number(hold.startedAt) || Date.now()));
    queue.active.endsAt += heldMs;
    queue.active.pausedMs = (Number(queue.active.pausedMs) || 0) + heldMs;
    const steering = runtime.fishActionSteeringByFishId.get(hold.fishId);
    if (steering && Number.isFinite(Number(steering.expiresAt))) {
      steering.expiresAt += heldMs;
    }
  }
  if (options.keepTarget === true) {
    return;
  }
  const fish = state?.fish?.find((entry) => entry?.id === hold.fishId) || null;
  if (!fish || isFishDead(fish)) {
    return;
  }
  fish.targetAt = Date.now();
}

function updateFishActionMenuHold(fish, species, now = Date.now(), deltaSeconds = 0) {
  const hold = runtime.fishActionMenuHold;
  if (!hold || !fish || fish.id !== hold.fishId || !species || isFishDead(fish)) {
    return false;
  }
  fish.activity = "roam";
  const activeQueueItem = getFishActionQueueState(fish.id)?.active || null;
  if (activeQueueItem?.action !== "eat") {
    fish.feedingPelletId = null;
  }
  fish.hangoutDecorId = null;
  fish.hangoutZoneType = null;
  fish.panicUntil = null;
  fish.panicSpeedBoost = null;
  fish.targetXNorm = hold.xNorm;
  fish.targetYNorm = hold.yNorm;
  fish.targetAt = now + 60 * 60 * 1000;
  setFishTankLayers(fish, hold.tankLayer, hold.tankLayer);
  fish.xNorm = hold.xNorm;
  fish.yNorm = hold.yNorm;
  fish.motionLevel = clamp((Number(fish.motionLevel) || 0.08) + (0.035 - (Number(fish.motionLevel) || 0.08)) * Math.min(1, deltaSeconds * 5), 0.02, 0.12);
  fish.wiggleClock += deltaSeconds * 0.08;
  return true;
}

function closeFishActionMenu(options = {}) {
  runtime.fishActionMenuFishId = null;
  runtime.fishActionMenuPoint = null;
  closeFishActionSubmenu();
  closeFishActionTargetMenu();
  releaseFishActionMenuHold(options);
  if (dom.fishActionFlyout) {
    dom.fishActionFlyout.hidden = true;
  }
}

function closeFishActionSubmenu() {
  runtime.fishActionCategory = "";
  runtime.fishActionCategoryAnchor = null;
  if (dom.fishActionSubmenu) {
    dom.fishActionSubmenu.hidden = true;
    dom.fishActionSubmenu.replaceChildren();
  }
}

function closeFishActionTargetMenu() {
  runtime.fishActionTargetAction = "";
  runtime.fishActionTargetFishId = "";
  if (dom.fishActionTargetMenu) {
    dom.fishActionTargetMenu.hidden = true;
    dom.fishActionTargetMenu.replaceChildren();
  }
}

function getFishActionCategoryAnchorFromElement(element) {
  const buttonRect = element?.getBoundingClientRect?.() || null;
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  if (!buttonRect?.width || !buttonRect?.height || !stageRect?.width || !stageRect?.height) {
    return null;
  }
  return {
    x: buttonRect.left - stageRect.left + buttonRect.width / 2,
    y: buttonRect.top - stageRect.top + buttonRect.height / 2,
    width: buttonRect.width,
    height: buttonRect.height,
    side: element.closest?.(".fish-action-flyout-right") ? "right" : "left"
  };
}

function openFishActionSubmenu(categoryId, fishId = runtime.fishActionMenuFishId, now = Date.now(), options = {}) {
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish || null;
  const category = getFishActionMenuCategory(categoryId);
  if (!category || !fish || managed.inStorage || isFishDead(fish)) {
    closeFishActionSubmenu();
    return false;
  }
  const actions = getAvailableFishActionsForCategory(category.id, fish, now);
  if (!actions.length) {
    showToast("No actions available in that folder right now.");
    closeFishActionSubmenu();
    return false;
  }
  runtime.fishActionCategory = category.id;
  runtime.fishActionCategoryAnchor = getFishActionCategoryAnchorFromElement(options.anchorElement) || runtime.fishActionCategoryAnchor;
  closeFishActionTargetMenu();
  renderFishActionSubmenu(now);
  return true;
}

function openFishActionTargetMenu(action, fishId = runtime.fishActionMenuFishId, now = Date.now()) {
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish || null;
  const config = getFishActionConfig(action);
  const availability = getFishActionAvailability(action, fish, now);
  if (!config || !isFishActionTargeted(action) || !fish || managed.inStorage || isFishDead(fish) || !availability.enabled) {
    showToast((availability.title || "That action is not available.").replace(/^.*?:\s*/, ""));
    closeFishActionTargetMenu();
    return false;
  }
  const options = getFishActionTargetOptions(action, fish, now);
  if (!options.length) {
    showToast("Add another living fish first.");
    closeFishActionTargetMenu();
    return false;
  }
  closeFishActionSubmenu();
  runtime.fishActionTargetAction = action;
  runtime.fishActionTargetFishId = fish.id;
  renderFishActionTargetMenu(now);
  return true;
}

function openFishActionMenu(fishId, point = null) {
  const managed = getManagedFishById(fishId);
  const fish = managed?.fish || null;
  if (!fish || managed.inStorage || isFishDead(fish)) {
    closeFishActionMenu();
    renderUi(Date.now(), { full: false });
    return;
  }
  runtime.fishActionMenuFishId = fish.id;
  runtime.fishActionMenuPoint = point
    ? { xNorm: clamp(Number(point.x) / TANK_WIDTH, 0.08, 0.92), yNorm: clamp(Number(point.y) / TANK_HEIGHT, 0.14, 0.84) }
    : { xNorm: clamp(Number(fish.xNorm) || 0.5, 0.08, 0.92), yNorm: clamp(Number(fish.yNorm) || 0.5, 0.14, 0.84) };
  runtime.selectedFishId = null;
  runtime.selectedFishStatusFishId = fish.id;
  runtime.fishInspectorSettingsOpen = false;
  clearFishInspectorDisplayDocking();
  holdFishForActionMenu(fish);
  renderUi(Date.now(), { full: false });
}

function getFishInspectorDockingBounds(referenceRect, padding, uiSettings) {
  const bounds = {
    left: padding,
    right: Math.max(padding, referenceRect.width - padding)
  };
  const toolbar = dom.tankBottomDock;
  const toolbarPosition = toolbar?.dataset?.toolbarPosition
    || document.documentElement?.dataset?.toolbarPosition
    || uiSettings?.toolbarPosition;
  if (
    !toolbar
    || (toolbarPosition !== "left-center" && toolbarPosition !== "right-center")
    || toolbar.classList.contains("is-toolbar-collapsed")
    || toolbar.classList.contains("is-tutorial-hidden")
    || toolbar.getAttribute("aria-expanded") === "false"
  ) {
    return bounds;
  }

  const toolbarRect = toolbar.getBoundingClientRect?.();
  if (
    !toolbarRect?.width
    || !toolbarRect?.height
    || toolbarRect.right <= referenceRect.left
    || toolbarRect.left >= referenceRect.left + referenceRect.width
  ) {
    return bounds;
  }

  const toolbarGap = 12;
  if (toolbarPosition === "right-center") {
    bounds.right = Math.max(
      bounds.left + 96,
      Math.min(bounds.right, Math.floor(toolbarRect.left - referenceRect.left - toolbarGap))
    );
  } else {
    bounds.left = Math.min(
      bounds.right - 96,
      Math.max(bounds.left, Math.ceil(toolbarRect.right - referenceRect.left + toolbarGap))
    );
  }

  return bounds;
}

function updateFishInspectorDisplayDocking() {
  const inspector = dom.fishInspector;
  const display = dom.tankDisplay;
  const stage = dom.tankStage;
  if (!inspector || inspector.hidden || !display || !stage) {
    clearFishInspectorDisplayDocking();
    return;
  }

  const uiSettings = getUiSettings();
  const displayCollapsed = getEffectiveDisplayCollapsed(uiSettings, getTutorialUiState());
  const displayRect = display.getBoundingClientRect?.();
  const stageRect = stage.getBoundingClientRect?.();
  if (
    displayCollapsed
    || display.classList.contains("is-tutorial-hidden")
    || !displayRect?.width
    || !displayRect?.height
    || !stageRect?.width
    || !stageRect?.height
    || displayRect.top + displayRect.height / 2 > stageRect.top + stageRect.height / 2
  ) {
    clearFishInspectorDisplayDocking();
    return;
  }

  clearFishInspectorDisplayDocking();

  const computedStyle = window.getComputedStyle?.(inspector);
  const fixedPosition = computedStyle?.position === "fixed";
  const referenceRect = fixedPosition
    ? {
      left: 0,
      top: 0,
      width: Math.max(1, window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || stageRect.width),
      height: Math.max(1, window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || stageRect.height)
    }
    : stageRect;
  const inspectorRect = inspector.getBoundingClientRect?.();
  const padding = 8;
  const gap = 8;
  const dockingBounds = getFishInspectorDockingBounds(referenceRect, padding, uiSettings);
  const availableWidth = Math.max(96, dockingBounds.right - dockingBounds.left);
  const inspectorWidth = Math.min(Math.max(96, Number(inspectorRect?.width) || 340), availableWidth);
  const displayCenterX = displayRect.left - referenceRect.left + displayRect.width / 2;
  const left = clamp(
    Math.round(displayCenterX - inspectorWidth / 2),
    dockingBounds.left,
    Math.max(dockingBounds.left, Math.round(dockingBounds.right - inspectorWidth))
  );
  const rawTop = displayRect.bottom - referenceRect.top + gap;
  const top = clamp(
    Math.round(rawTop),
    padding,
    Math.max(padding, Math.round(referenceRect.height - 96 - padding))
  );

  inspector.classList.add("is-docked-below-display");
  inspector.style.left = `${left}px`;
  inspector.style.top = `${top}px`;
  inspector.style.right = "auto";
  inspector.style.bottom = "auto";
  inspector.style.width = `${Math.round(inspectorWidth)}px`;
  inspector.style.maxHeight = `${Math.max(96, Math.floor(referenceRect.height - top - padding))}px`;
}

function renderFishActionFlyout(now = Date.now()) {
  const flyout = dom.fishActionFlyout;
  if (!flyout) {
    return;
  }

  const managed = getManagedFishById(runtime.fishActionMenuFishId);
  const fish = managed?.fish || null;
  if (!fish || managed.inStorage || isFishDead(fish)) {
    runtime.fishActionMenuFishId = null;
    runtime.fishActionMenuPoint = null;
    releaseFishActionMenuHold();
    flyout.hidden = true;
    dom.fishActionQueue?.replaceChildren();
    return;
  }

  const anchor = { xNorm: fish.xNorm, yNorm: fish.yNorm };
  const stagePoint = getTankNormStagePoint(anchor.xNorm, anchor.yNorm);
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  const maxWidth = stageRect?.width || TANK_WIDTH;
  const maxHeight = stageRect?.height || TANK_HEIGHT;
  const halfWidth = Math.min(300, Math.max(0, maxWidth / 2 - 10));
  const halfHeight = Math.min(185, Math.max(0, maxHeight / 2 - 10));
  const x = maxWidth > halfWidth * 2
    ? clamp(stagePoint.x, halfWidth + 10, maxWidth - halfWidth - 10)
    : maxWidth / 2;
  const y = maxHeight > halfHeight * 2
    ? clamp(stagePoint.y, halfHeight + 10, maxHeight - halfHeight - 10)
    : maxHeight / 2;
  flyout.style.setProperty("--fish-action-x", `${Math.round(x)}px`);
  flyout.style.setProperty("--fish-action-y", `${Math.round(y)}px`);
  flyout.hidden = false;

  if (dom.fishActionFlyoutName) {
    dom.fishActionFlyoutName.textContent = fish.name || "Fish";
    dom.fishActionFlyoutName.title = `Open details for ${fish.name || "fish"}`;
    dom.fishActionFlyoutName.setAttribute("aria-label", `Open details for ${fish.name || "fish"}`);
  }
  if (dom.fishActionFlyoutSettings) {
    dom.fishActionFlyoutSettings.title = `Open settings for ${fish.name || "fish"}`;
    dom.fishActionFlyoutSettings.setAttribute("aria-label", `Open settings for ${fish.name || "fish"}`);
  }
  if (dom.fishActionQueue) {
    const queuedActions = getFishActionQueueItems(fish.id);
    dom.fishActionQueue.replaceChildren(...queuedActions.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `fish-action-queue-button${item.active ? " is-active" : ""}${item.cancelling ? " is-cancelling" : ""}`;
      if (!item.rest && !item.cancelling) {
        button.dataset.cancelFishAction = item.id;
      } else {
        button.disabled = true;
      }
      const remaining = item.active || item.cancelling
        ? formatFishActionRemaining((Number(item.cancelEndsAt || item.endsAt) || now) - now)
        : "";
      const labelText = item.label || getFishActionConfig(item.action)?.label || "Action";
      const phaseText = getFishActionPhaseLabel(item);
      const content = document.createElement("span");
      content.className = "fish-action-queue-button-content";
      const primary = document.createElement("span");
      primary.className = "fish-action-queue-button-primary";
      const label = document.createElement("span");
      label.textContent = labelText;
      const time = document.createElement("span");
      time.className = "fish-action-queue-button-time";
      time.textContent = remaining;
      primary.append(label, time);
      content.append(primary);
      if (phaseText) {
        const phase = document.createElement("span");
        phase.className = "fish-action-queue-phase";
        phase.textContent = phaseText;
        content.append(phase);
      }
      const progress = document.createElement("span");
      progress.className = "fish-action-progress";
      progress.setAttribute("role", "progressbar");
      progress.setAttribute("aria-label", `${labelText} time remaining`);
      progress.setAttribute("aria-valuemin", "0");
      progress.setAttribute("aria-valuemax", "100");
      const remainingPercent = Math.round(getFishActionRemainingRatio(item, now) * 100);
      progress.setAttribute("aria-valuenow", String(remainingPercent));
      const fill = document.createElement("span");
      fill.className = "fish-action-progress-fill";
      fill.style.setProperty("--fish-action-progress", String(remainingPercent / 100));
      progress.append(fill);
      button.append(content, progress);
      button.title = item.cancelling ? "Cancelling action" : (item.rest ? "Next action starts soon" : (item.active ? "Cancel current action" : "Remove queued action"));
      button.setAttribute("aria-label", `${button.title}: ${labelText}${phaseText ? `, ${phaseText}` : ""}${remaining ? `, ${remaining} remaining` : ""}`);
      return button;
    }));
  }

  for (const button of flyout.querySelectorAll("[data-fish-action]")) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    const action = button.dataset.fishAction || "";
    const config = getFishActionConfig(action);
    const availability = getFishActionAvailability(action, fish, now);
    button.hidden = !availability.enabled;
    button.disabled = false;
    button.textContent = config?.label || action;
    button.title = availability.title || config?.title || "Fish action";
    button.setAttribute("aria-label", button.title);
  }
  for (const button of flyout.querySelectorAll("[data-fish-action-category]")) {
    if (!(button instanceof HTMLButtonElement)) {
      continue;
    }
    const categoryId = button.dataset.fishActionCategory || "";
    const category = getFishActionMenuCategory(categoryId);
    const availableActions = getAvailableFishActionsForCategory(categoryId, fish, now);
    button.hidden = !category || availableActions.length <= 0;
    button.disabled = false;
    button.textContent = getFishActionCategoryLabel(category) || categoryId;
    button.classList.toggle("is-active-folder", runtime.fishActionCategory === categoryId);
    button.title = category
      ? `${category.label}: ${availableActions.map((action) => getFishActionConfig(action)?.label || action).join(", ")}`
      : "Fish action folder";
    button.setAttribute("aria-label", button.title);
  }
  updateFishActionFlyoutBranchLayout(flyout);
}

function renderFishActionSubmenu(now = Date.now()) {
  const menu = dom.fishActionSubmenu;
  if (!menu) {
    return;
  }
  const category = getFishActionMenuCategory(runtime.fishActionCategory);
  const managed = getManagedFishById(runtime.fishActionMenuFishId);
  const fish = managed?.fish || null;
  if (!category || !fish || managed.inStorage || isFishDead(fish)) {
    closeFishActionSubmenu();
    return;
  }
  const actions = getAvailableFishActionsForCategory(category.id, fish, now);
  if (!actions.length) {
    closeFishActionSubmenu();
    return;
  }

  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  const maxWidth = stageRect?.width || TANK_WIDTH;
  const maxHeight = stageRect?.height || TANK_HEIGHT;
  const anchor = runtime.fishActionCategoryAnchor || getTankNormStagePoint(fish.xNorm || 0.5, fish.yNorm || 0.5);
  const submenuWidth = 206;
  const submenuHeight = 18 + actions.length * 40;
  const anchorX = Number(anchor.x) || maxWidth / 2;
  const anchorY = Number(anchor.y) || maxHeight / 2;
  const anchorWidth = Math.max(0, Number(anchor.width) || 0);
  const openRight = anchor.side === "right";
  const rawX = anchorX + (openRight ? 1 : -1) * (anchorWidth / 2 + submenuWidth / 2 + 10);
  const x = clamp(rawX, submenuWidth / 2 + 10, Math.max(submenuWidth / 2 + 10, maxWidth - submenuWidth / 2 - 10));
  const y = clamp(anchorY, submenuHeight / 2 + 10, Math.max(submenuHeight / 2 + 10, maxHeight - submenuHeight / 2 - 10));
  menu.style.setProperty("--fish-action-submenu-x", `${Math.round(x)}px`);
  menu.style.setProperty("--fish-action-submenu-y", `${Math.round(y)}px`);

  const list = document.createElement("div");
  list.className = "fish-action-submenu-list";
  list.append(...actions.map((action) => {
    const config = getFishActionConfig(action);
    const availability = getFishActionAvailability(action, fish, now);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `fish-action-submenu-button${action === "clear" ? " is-clear" : ""}`;
    button.dataset.fishSubmenuAction = action;
    button.title = availability.title || config?.title || "Fish action";
    button.setAttribute("aria-label", button.title);
    const label = document.createElement("span");
    label.className = "fish-action-submenu-label";
    label.textContent = config?.label || action;
    const tags = document.createElement("span");
    tags.className = "fish-action-submenu-tags";
    for (const tag of getFishActionEffectTags(action)) {
      const tagNode = document.createElement("span");
      tagNode.className = `fish-action-submenu-tag is-${tag.tone}`;
      tagNode.textContent = tag.text;
      tags.append(tagNode);
    }
    button.append(label, tags);
    return button;
  }));

  menu.replaceChildren(list);
  menu.hidden = false;
}

function renderFishActionTargetMenu(now = Date.now()) {
  const menu = dom.fishActionTargetMenu;
  if (!menu) {
    return;
  }
  const action = runtime.fishActionTargetAction || "";
  const managed = getManagedFishById(runtime.fishActionTargetFishId);
  const fish = managed?.fish || null;
  const config = getFishActionConfig(action);
  if (!isFishActionTargeted(action) || !fish || managed.inStorage || isFishDead(fish) || !config) {
    closeFishActionTargetMenu();
    return;
  }
  const options = getFishActionTargetOptions(action, fish, now);
  if (!options.length) {
    closeFishActionTargetMenu();
    return;
  }

  const stagePoint = getTankNormStagePoint(fish.xNorm || 0.5, fish.yNorm || 0.5);
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  const maxWidth = stageRect?.width || TANK_WIDTH;
  const maxHeight = stageRect?.height || TANK_HEIGHT;
  const direction = stagePoint.x < maxWidth * 0.58 ? 1 : -1;
  const x = clamp(stagePoint.x + direction * 210, 132, Math.max(132, maxWidth - 132));
  const y = clamp(stagePoint.y, 104, Math.max(104, maxHeight - 104));
  menu.style.setProperty("--fish-action-target-x", `${Math.round(x)}px`);
  menu.style.setProperty("--fish-action-target-y", `${Math.round(y)}px`);

  const title = document.createElement("p");
  title.className = "fish-action-target-title";
  title.textContent = `${config.label}: choose fish`;

  const list = document.createElement("div");
  list.className = "fish-action-target-list";
  list.append(...options.map((targetFish) => {
    const targetSpecies = getSpeciesForFish(targetFish);
    const mateChance = action === "breed" ? getFishMateChanceForTarget(fish, targetFish) : null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `fish-action-target-button${mateChance && mateChance.rating < 5 ? " is-risky-mate" : ""}`;
    button.dataset.fishActionTargetId = targetFish.id;
    button.title = mateChance
      ? `${config.label} with ${targetFish.name || "fish"}: relationship ${mateChance.rating}/10, ${mateChance.chancePercent}% chance`
      : `${config.label} with ${targetFish.name || "fish"}`;
    button.setAttribute("aria-label", button.title);

    const image = document.createElement("img");
    image.className = "fish-action-target-thumb";
    image.src = getFishDisplayAssetPath(targetFish, targetSpecies, now) || targetSpecies?.asset || "";
    image.alt = "";
    image.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "fish-action-target-name";
    name.textContent = targetFish.name || targetSpecies?.name || "Fish";
    const text = document.createElement("span");
    text.className = "fish-action-target-copy";
    text.append(name);
    if (mateChance) {
      const meta = document.createElement("span");
      meta.className = "fish-action-target-meta";
      meta.textContent = `Relationship ${mateChance.rating}/10 · ${mateChance.chancePercent}% chance`;
      text.append(meta);
    }
    button.append(image, text);
    return button;
  }));

  menu.replaceChildren(title, list);
  menu.hidden = false;
}

function updateFishActionFlyoutBranchLayout(flyout) {
  const offsetSets = {
    left: {
      1: [18],
      2: [24, 24],
      3: [28, 8, 28],
      4: [34, 14, 14, 34],
      5: [36, 14, 0, 14, 36]
    },
    right: {
      1: [18],
      2: [24, 24],
      3: [28, 8, 28],
      4: [34, 14, 14, 34],
      5: [36, 14, 0, 14, 36]
    }
  };
  let maxVisibleButtons = 0;
  for (const branch of flyout.querySelectorAll(".fish-action-flyout-branch")) {
    const side = branch.classList.contains("fish-action-flyout-right") ? "right" : "left";
    const buttons = [...branch.querySelectorAll("[data-fish-action], [data-fish-action-category]")]
      .filter((button) => button instanceof HTMLButtonElement && !button.hidden);
    maxVisibleButtons = Math.max(maxVisibleButtons, buttons.length);
    branch.style.gap = buttons.length > 5 ? "8px" : "";
    const offsets = offsetSets[side][buttons.length] || [];
    for (const button of branch.querySelectorAll("[data-fish-action], [data-fish-action-category]")) {
      if (!(button instanceof HTMLButtonElement)) {
        continue;
      }
      button.style.marginLeft = "";
      button.style.marginRight = "";
    }
    buttons.forEach((button, index) => {
      const offset = offsets[index] ?? Math.max(0, 28 - Math.abs(index - (buttons.length - 1) / 2) * 8);
      if (side === "right") {
        button.style.marginRight = `${offset}px`;
      } else {
        button.style.marginLeft = `${offset}px`;
      }
    });
  }
  flyout.classList.toggle("is-compact-actions", maxVisibleButtons > 4);
}

function renderFishActionQueueDock(now = Date.now()) {
  const dock = dom.fishActionQueueDock;
  if (!dock) {
    return;
  }

  const groups = [...runtime.fishActionQueuesByFishId.entries()]
    .map(([fishId]) => {
      const fish = state.fish.find((entry) => entry?.id === fishId && !isFishDead(entry)) || null;
      const items = getFishActionQueueItems(fishId);
      return fish && items.length ? { fish, items } : null;
    })
    .filter(Boolean)
    .sort((left, right) => String(left.fish.name || "").localeCompare(String(right.fish.name || "")));

  if (!groups.length) {
    dock.hidden = true;
    dock.replaceChildren();
    return;
  }

  dock.hidden = false;
  dock.replaceChildren(...groups.map(({ fish, items }) => {
    const collapsed = runtime.fishActionQueueCollapsedFishIds.has(fish.id);
    const group = document.createElement("article");
    group.className = "fish-action-queue-group";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "fish-action-queue-group-toggle";
    toggle.dataset.toggleFishActionQueue = fish.id;
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle.title = collapsed ? `Show ${fish.name || "fish"} actions` : `Hide ${fish.name || "fish"} actions`;

    const name = document.createElement("span");
    name.textContent = fish.name || "Fish";
    const count = document.createElement("span");
    count.className = "fish-action-queue-count";
    count.textContent = String(items.length);
    toggle.append(name, count);
    group.append(toggle);

    if (!collapsed) {
      const list = document.createElement("div");
      list.className = "fish-action-queue-list";
      list.append(...items.map((item) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `fish-action-queue-chip${item.active ? " is-active" : ""}${item.cancelling ? " is-cancelling" : ""}`;
        if (!item.rest && !item.cancelling) {
          chip.dataset.fishId = fish.id;
          chip.dataset.cancelFishAction = item.id;
        } else if (item.rest) {
          chip.disabled = true;
        }
        chip.title = item.cancelling ? "Cancelling action" : (item.rest ? "Next action starts soon" : (item.active ? "Cancel current action" : "Remove queued action"));
        chip.setAttribute("aria-label", chip.title);

        const label = document.createElement("span");
        label.textContent = item.label || getFishActionConfig(item.action)?.label || "Action";
        const time = document.createElement("span");
        time.className = "fish-action-queue-chip-time";
        time.textContent = item.active || item.cancelling
          ? formatFishActionRemaining((Number(item.cancelEndsAt || item.endsAt) || now) - now)
          : formatFishActionRemaining(item.durationMs);
        const primary = document.createElement("span");
        primary.className = "fish-action-queue-chip-primary";
        primary.append(label, time);
        chip.append(primary);
        const phaseText = getFishActionPhaseLabel(item);
        if (phaseText) {
          const phase = document.createElement("span");
          phase.className = "fish-action-queue-phase";
          phase.textContent = phaseText;
          chip.append(phase);
        }
        const progress = document.createElement("span");
        progress.className = "fish-action-progress";
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", `${label.textContent} time remaining`);
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        const remainingPercent = Math.round(getFishActionRemainingRatio(item, now) * 100);
        progress.setAttribute("aria-valuenow", String(remainingPercent));
        const fill = document.createElement("span");
        fill.className = "fish-action-progress-fill";
        fill.style.setProperty("--fish-action-progress", String(remainingPercent / 100));
        progress.append(fill);
        chip.append(progress);
        chip.setAttribute("aria-label", `${chip.title}: ${label.textContent}${phaseText ? `, ${phaseText}` : ""}, ${time.textContent} remaining`);
        return chip;
      }));
      group.append(list);
    }
    return group;
  }));
}

function renderFishNeedsBars(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return "";
  }
  const { needs } = getFishNeedsSnapshot(fish, now);
  const labels = {
    hunger: "Hunger",
    energy: "Energy",
    social: "Social",
    comfort: "Comfort",
    hygiene: "Hygiene",
    environment: "Environment"
  };
  const iconLabels = {
    hunger: "Hu",
    energy: "En",
    social: "So",
    comfort: "Co",
    hygiene: "Hy",
    environment: "Ev"
  };
  const trendDeltas = calculateFishNeedDeltas(fish, now, 1000) || {};
  return ["hunger", "energy", "social", "comfort", "hygiene", "environment"].map((key) => {
    const value = clamp(Number(needs[key]) || 0, 0, 100);
    const tone = value < 33 ? "danger" : value < 66 ? "warn" : "good";
    const trend = Number(trendDeltas[key]) || 0;
    const trendState = trend > 0.01 ? "rising" : trend < -0.01 ? "falling" : "flat";
    const trendLabel = trendState === "flat" ? "" : `${trend > 0 ? "+" : ""}${trend.toFixed(1)} /s`;
    const title = `${labels[key] || key}: ${Math.round(value)}%. ${fish.name || "This fish"} is ${getFishNeedLabel(key, value).toLowerCase()}${trendLabel ? `. ${trendLabel}` : ""}.`;
    return `
      <div class="fish-need-row" data-need-tone="${tone}" data-need-trend="${trendState}" title="${escapeHtml(title)}">
        <span class="fish-need-icon" aria-hidden="true">${escapeHtml(iconLabels[key] || "")}</span>
        <span class="fish-need-label">${escapeHtml(labels[key] || key)}</span>
        <span class="fish-need-meter" data-tone="${tone}">
          <span class="fish-need-fill" style="width:${Math.round(value)}%">
            <span class="fish-need-trend-marquee" aria-hidden="true">${trendState === "falling" ? "&lt;&lt;&lt;" : "&gt;&gt;&gt;"}</span>
          </span>
        </span>
        ${trendLabel ? `<span class="fish-need-trend-value">${escapeHtml(trendLabel)}</span>` : ""}
      </div>
    `;
  }).join("");
}

function getSelectedFishNeedsMoodLabel(fish, now = Date.now()) {
  if (!fish || isFishDead(fish)) {
    return "Miserable";
  }
  const snapshot = getFishNeedsSnapshot(fish, now);
  const value = Number(snapshot?.mood?.value) || 0;
  if (value >= 85) {
    return "Thriving";
  }
  if (value >= 70) {
    return "Good Vibes";
  }
  if (value >= 50) {
    return "Fine";
  }
  if (value >= 35) {
    return "Uneasy";
  }
  if (value >= 20) {
    return "Stressed";
  }
  return "Miserable";
}

function shouldShowSelectedFishNeedsPanel(managed) {
  if (!dom.selectedFishNeedsPanel || !managed?.fish || managed.inStorage || isFishDead(managed.fish)) {
    return false;
  }
  return !(
    runtime.storeOverlayOpen
    || runtime.utilityOverlayOpen
    || runtime.settingsOverlayOpen
    || runtime.equipmentOverlayOpen
    || runtime.fishInspectorSettingsOpen
    || isIntroTutorialActive()
  );
}

function renderSelectedFishNeedsPanel(now = Date.now()) {
  const panel = dom.selectedFishNeedsPanel;
  if (!panel) {
    return;
  }
  const managed = getManagedFishById(runtime.selectedFishStatusFishId || runtime.selectedFishId);
  if (!shouldShowSelectedFishNeedsPanel(managed)) {
    panel.hidden = true;
    setMarkupIfChanged("selected-fish-needs-panel", panel, "");
    return;
  }
  const fish = managed.fish;
  const moodSnapshot = getFishNeedsSnapshot(fish, now).mood;
  const moodLabel = getSelectedFishNeedsMoodLabel(fish, now);
  const moodTone = moodSnapshot.value <= 19 ? "danger" : moodSnapshot.value <= 49 ? "warn" : moodSnapshot.value <= 69 ? "okay" : "good";
  const markup = `
    <div class="selected-fish-needs-header">
      <strong class="selected-fish-needs-name">${escapeHtml(fish.name || "Fish")}</strong>
      <span class="selected-fish-mood-pill" data-mood-tone="${moodTone}">${escapeHtml(moodLabel)}</span>
    </div>
    <div class="fish-needs-bars selected-fish-needs-bars">
      ${renderFishNeedsBars(fish, now)}
    </div>
  `;
  panel.hidden = false;
  setMarkupIfChanged("selected-fish-needs-panel", panel, markup);
}

function renderFishInspector(now) {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    runtime.selectedFishId = null;
    runtime.fishInspectorSettingsOpen = false;
    clearFishInspectorDisplayDocking();
    dom.fishInspector.hidden = true;
    if (dom.inspectorSellFish) {
      dom.inspectorSellFish.hidden = true;
      delete dom.inspectorSellFish.dataset.sellFish;
    }
    if (dom.inspectorStoreFish) {
      dom.inspectorStoreFish.hidden = true;
      delete dom.inspectorStoreFish.dataset.storeFish;
    }
    if (dom.inspectorDisposeFish) {
      dom.inspectorDisposeFish.hidden = true;
      delete dom.inspectorDisposeFish.dataset.disposeFish;
    }
    if (dom.inspectorBuyAnotherFish) {
      dom.inspectorBuyAnotherFish.hidden = true;
      delete dom.inspectorBuyAnotherFish.dataset.buyAnotherFish;
    }
    runtime.fishNameKeyboardOpen = false;
    clearFishNameDraft();
    updateWallpaperFishNameKeyboard();
    return;
  }

  const { fish, inStorage } = managed;
  const baseSpecies = getBaseSpeciesForFish(fish);
  const species = getSpeciesForFish(fish);
  const dead = isFishDead(fish);
  const beingConsumed = dead && isFishBeingConsumedByPiranhas(fish, now);
  const corpseLabel = dead ? getFishCorpseStateLabel(fish, now) : null;
  const canBuyAnother = Boolean(baseSpecies && !dead && !inStorage && isFishSpeciesShopUnlocked(baseSpecies));
  const purchaseCost = canBuyAnother ? getFishPurchaseCost(fish.speciesId) : 0;
  const resaleValue = getResaleValue(baseSpecies?.cost || 0);
  const canSell = Boolean(baseSpecies) && !dead && !beingConsumed && !isFishJuvenile(fish);
  const canStore = !inStorage && !dead && !hasZombieBiteInfection(fish);
  const comfort = inStorage ? { label: "Stored", value: 1 } : getFishComfort(fish, now);
  const needsSnapshot = inStorage || dead ? null : getFishNeedsSnapshot(fish, now);
  dom.fishInspector.hidden = false;
  setTextIfChanged(dom.inspectorSpecies, getFishInspectorSpeciesLabel(fish, species));
  const inspectorHeartsMarkup = renderHearts(fish.healthUnits, getFishMaxHealthUnits(fish, baseSpecies));
  if (dom.inspectorHealth.innerHTML !== inspectorHeartsMarkup) {
    dom.inspectorHealth.innerHTML = inspectorHeartsMarkup;
  }
  setTextIfChanged(
    dom.inspectorComfort,
    inStorage
      ? (dead ? `${corpseLabel} in storage` : "Stored safely")
      : dead
        ? corpseLabel
        : `${needsSnapshot.mood.label} (${Math.round(needsSnapshot.mood.value)}%)`
  );
  if (dom.inspectorNeedsBars) {
    dom.inspectorNeedsBars.hidden = true;
    setMarkupIfChanged("fish-inspector-needs-bars", dom.inspectorNeedsBars, "");
  }
  if (dom.inspectorNeeds) {
    const needsMarkup = inStorage || dead
      ? `<span class="comfort-chip is-neutral">${inStorage ? "Stored" : "N/A"}</span>`
      : renderComfortTagChips(getFishNeedsStatus(fish, getCurrentTank(), now), { type: "need" });
    const activeConflicts = inStorage || dead
      ? []
      : getFishConflictStatus(fish, getCurrentTank(), now).filter((conflict) => conflict.active);
    const conflictsMarkup = activeConflicts.length
      ? `<span class="comfort-chip-label">Conflicts</span>${renderComfortTagChips(activeConflicts, { type: "conflict" })}`
      : "";
    setMarkupIfChanged("fish-inspector-needs", dom.inspectorNeeds, `${needsMarkup}${conflictsMarkup}`);
  }
  setTextIfChanged(dom.inspectorAge, formatFishAge(fish.acquiredAt, now));

  let mealLabel = isMealFreeFish(fish)
    ? "N/A"
    : getFishHungerLabel(fish, now);

  if (dom.inspectorMeal) {
    setTextIfChanged(dom.inspectorMeal, mealLabel);
  }
  if (dom.inspectorLifeStory) {
    setMarkupIfChanged("fish-inspector-life-story", dom.inspectorLifeStory, buildFishIndividualityMarkup(fish, now, { inStorage, dead }));
  }

  if (dom.inspectorDisposeFish) {
    dom.inspectorDisposeFish.hidden = !dead || beingConsumed;
    dom.inspectorDisposeFish.disabled = !dead || beingConsumed;
    if (dead && !beingConsumed) {
      dom.inspectorDisposeFish.dataset.disposeFish = fish.id;
      dom.inspectorDisposeFish.title = `Dispose of ${fish.name}`;
      dom.inspectorDisposeFish.setAttribute("aria-label", `Dispose of ${fish.name}`);
    } else {
      delete dom.inspectorDisposeFish.dataset.disposeFish;
      dom.inspectorDisposeFish.removeAttribute("title");
      dom.inspectorDisposeFish.setAttribute("aria-label", "Dispose of fish");
    }
  }

  if (dom.inspectorSellFish) {
    const showSell = Boolean(species) && !dead;
    dom.inspectorSellFish.hidden = !showSell;
    dom.inspectorSellFish.disabled = !canSell;
    if (showSell) {
      dom.inspectorSellFish.dataset.sellFish = fish.id;
      dom.inspectorSellFish.textContent = "SELL";
      dom.inspectorSellFish.title = canSell
        ? `Sell ${fish.name} for ${resaleValue} ${pluralize("coin", resaleValue)}`
        : `${fish.name} needs to grow before being sold`;
      dom.inspectorSellFish.setAttribute(
        "aria-label",
        canSell
          ? `Sell ${fish.name} for ${resaleValue} coins`
          : `${fish.name} needs to grow before being sold`
      );
    } else {
      delete dom.inspectorSellFish.dataset.sellFish;
      dom.inspectorSellFish.textContent = "SELL";
      dom.inspectorSellFish.title = "Sell Fish";
      dom.inspectorSellFish.setAttribute("aria-label", "Sell Fish");
    }
  }

  if (dom.inspectorStoreFish) {
    const showStore = !inStorage && !dead;
    dom.inspectorStoreFish.hidden = !showStore;
    dom.inspectorStoreFish.disabled = !canStore;
    if (showStore) {
      dom.inspectorStoreFish.dataset.storeFish = fish.id;
      dom.inspectorStoreFish.textContent = "PUT AWAY";
      dom.inspectorStoreFish.title = canStore
        ? `Move ${fish.name} to storage`
        : `${fish.name} can't be moved to storage right now`;
      dom.inspectorStoreFish.setAttribute(
        "aria-label",
        canStore
          ? `Move ${fish.name} to storage`
          : `${fish.name} can't be moved to storage right now`
      );
    } else {
      delete dom.inspectorStoreFish.dataset.storeFish;
      dom.inspectorStoreFish.textContent = "PUT AWAY";
      dom.inspectorStoreFish.title = "Move to Storage";
      dom.inspectorStoreFish.setAttribute("aria-label", "Move to Storage");
    }
  }

  if (dom.inspectorBuyAnotherFish) {
    dom.inspectorBuyAnotherFish.hidden = !canBuyAnother;
    dom.inspectorBuyAnotherFish.disabled = canBuyAnother && state.coins < purchaseCost;
    if (canBuyAnother) {
      dom.inspectorBuyAnotherFish.dataset.buyAnotherFish = fish.id;
      dom.inspectorBuyAnotherFish.textContent = "BUY";
      dom.inspectorBuyAnotherFish.title = `Buy another ${baseSpecies.name} for ${purchaseCost} ${pluralize("coin", purchaseCost)}`;
      dom.inspectorBuyAnotherFish.setAttribute("aria-label", `Buy another ${baseSpecies.name} for ${purchaseCost} coins`);
    } else {
      delete dom.inspectorBuyAnotherFish.dataset.buyAnotherFish;
      dom.inspectorBuyAnotherFish.textContent = "BUY";
      dom.inspectorBuyAnotherFish.title = "Buy One";
      dom.inspectorBuyAnotherFish.setAttribute("aria-label", "Buy One");
    }
  }

  const draftName = runtime.fishNameDraftId === fish.id ? runtime.fishNameDraftValue : null;
  const nextInputName = draftName ?? fish.name;
  if (dom.fishNameInput.dataset.fishId !== fish.id || dom.fishNameInput.value !== nextInputName) {
    dom.fishNameInput.value = nextInputName;
    dom.fishNameInput.dataset.fishId = fish.id;
  }
  if (dom.fishInspectorSettings) {
    dom.fishInspectorSettings.hidden = !runtime.fishInspectorSettingsOpen || dead;
  }
  if (dom.inspectorFishSettingsButton) {
    dom.inspectorFishSettingsButton.hidden = dead;
    dom.inspectorFishSettingsButton.textContent = "SETTINGS";
    dom.inspectorFishSettingsButton.classList.toggle("is-active", Boolean(runtime.fishInspectorSettingsOpen && !dead));
  }
  renderFishInspectorBehaviorOptions(fish, baseSpecies);
  updateInspectorFishReadouts(fish);
  updateWallpaperFishNameKeyboard();
  updateFishInspectorDisplayDocking();
}

function renderDecorShop() {
  const tutorialRestriction = getTutorialStoreRestriction("decor");
  if (!runtime.decorCatalog.length) {
    setMarkupIfChanged("decor-shop", dom.decorShop, `<div class="empty-state">No decor PNGs were found in the decor folder yet.</div>`);
    return;
  }

  const searchQuery = tutorialRestriction ? "" : getStoreSearchQuery("decor");
  const allCatalog = sortCatalogEntries(
    runtime.decorCatalog
      .filter((decor) => canUseDecorWithCurrentContentSettings(decor))
      .filter((decor) => {
        if (!tutorialRestriction) {
          return true;
        }
        if (
          tutorialRestriction.hideCustom
          && (
            isCustomDecorUploadShopKey(decor.key)
            || isCustomDecorAssetKey(decor.key)
            || isCustomBubblerDecorKey(decor.key)
          )
        ) {
          return false;
        }
        return getDecorPurchaseCost(decor.key) <= tutorialRestriction.maxCost;
      }),
    runtime.storeSorts.decor
  );
  if (!allCatalog.length) {
    setMarkupIfChanged(
      "decor-shop",
      dom.decorShop,
      `${renderShopToolbar("decor", 0, 0)}<div class="empty-state">No decor is available in the shop right now.</div>`
    );
    return;
  }
  const catalog = allCatalog.filter((decor) => matchesShopSearchQuery(getDecorShopSearchHaystack(decor), searchQuery));
  const tutorialPreviewOnly = tutorialRestriction?.previewOnly === true;
  if (!catalog.length) {
    setMarkupIfChanged(
      "decor-shop",
      dom.decorShop,
      `${renderShopToolbar("decor", 0, allCatalog.length)}<div class="empty-state">No decor matches "${escapeHtml(searchQuery.trim())}".</div>`
    );
    return;
  }
  const cardsMarkup = catalog
    .map((decor) => {
      const progressLocked = !isDecorProgressUnlocked(decor);
      const locked = !isDecorShopUnlocked(decor);
      const debugUnlocked = progressLocked && !locked;
      const affordable = !locked && !tutorialPreviewOnly && state.coins >= decor.cost;
      const owned = state.decorInventory[decor.key] || 0;
      const isCustomUploadProduct = isCustomDecorUploadShopKey(decor.key);
      const isCustomHideUpload = isCustomHideShopKey(decor.key);
      const lockedRequirementLabel = getDecorUnlockRequirementLabel(decor);
      const statusLabel = locked
        ? `Unlocks at ${lockedRequirementLabel}`
        : debugUnlocked
          ? `Debug unlocked (${lockedRequirementLabel})`
          : `${owned} in storage`;
      const serviceSummary = getDecorServiceSummary(decor.key);
      return `
        <article class="shop-card ${locked ? "is-locked" : ""}">
          <img class="shop-thumb ${locked ? "is-locked" : ""}" src="${escapeHtml(getDecorThumbnailPath(decor))}" alt="${escapeHtml(decor.name)}" />
          <div class="shop-meta">
            <div>
              <strong>${decor.name}</strong>
              ${renderShopThemePill(decor.theme)}
              <div class="fish-meta">${locked ? statusLabel : isCustomHideUpload ? "Upload front and background images for a hide." : isCustomUploadProduct ? "Upload a local image for this decor." : statusLabel}</div>
              ${serviceSummary ? `<div class="mini-note borough-service-note">${escapeHtml(serviceSummary)}</div>` : ""}
            </div>
            <div class="fish-meta"></div>
          </div>
          <div class="shop-meta">
            <span class="price-tag">${decor.cost} ${pluralize("coin", decor.cost)}</span>
            <button class="buy-button" data-buy-decor="${decor.key}" ${(affordable || tutorialPreviewOnly) ? "" : "disabled"} ${tutorialPreviewOnly ? "disabled" : ""}>
              ${locked ? "Locked" : tutorialPreviewOnly ? "Preview Only" : isCustomHideUpload ? "Choose Images" : isCustomUploadProduct ? "Choose Image" : "Buy Decor"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  setMarkupIfChanged(
    "decor-shop",
    dom.decorShop,
    `${renderShopToolbar("decor", catalog.length, allCatalog.length)}${cardsMarkup}`
  );
}

function renderEquipmentShop() {
  if (!dom.equipmentShop) {
    return;
  }

  const dispenserInstalled = hasAutoDispenserInstalled();
  const dispenserLoadedCount = getAutoDispenserLoadedCount(state.autoDispenser);
  const dispenserPortion = clamp(Number(state.autoDispenser?.mealPortion) || 0, 0, AUTO_DISPENSER_PORTION_MAX);
  const dispenserAffordable = state.coins >= AUTO_DISPENSER_COST;
  const shopFilters = ENABLE_FILTER
    ? runtime.filterCatalog.filter((filter) => filter.purchasable && filter.key !== BASIC_FILTER_KEY)
    : [];
  const filterMarkup = shopFilters.map((filter) => {
    const ownedCount = Math.max(0, Number(state.ownedFilterInventory?.[filter.key]) || 0);
    const equippedCount = getFilterAssignmentCount(filter.key);
    const unusedCount = getUnusedFilterCount(filter.key);
    const equippedHere = state.selectedFilterAsset === filter.key;
    const affordable = state.coins >= filter.cost;
    const resaleValue = getResaleValue(filter.cost);
    const buyLabel = ownedCount > 0 ? "Buy Another" : "Buy & Equip";
    const statusBits = [
      `${ownedCount} owned`,
      equippedCount > 0 ? `${equippedCount} in use` : "none in use",
      unusedCount > 0 ? `${unusedCount} spare` : "no spare copies"
    ];
    return `
      <article class="shop-card">
        <img class="shop-thumb" src="${filter.path}" alt="${filter.name}" />
        <div class="shop-meta shop-card-main">
          <div>
            <strong>${filter.name}</strong>
            <div class="fish-meta">${statusBits.join(" | ")}</div>
          </div>
          <div class="fish-meta">${filter.blurb}</div>
          <div class="fish-meta">Empty tank max grime: ${formatDuration(filter.cleanDays * DAY_MS)}. Mood boost: +${Math.round(filter.comfortBoost * 100)}%.</div>
          ${equippedHere ? `<div class="mini-note">Currently installed in this tank.</div>` : ""}
        </div>
        <div class="shop-meta shop-card-actions">
          <span class="price-tag">${filter.cost} ${pluralize("coin", filter.cost)}</span>
          <div class="shop-button-row">
            <button class="buy-button" data-buy-filter="${filter.key}" ${affordable ? "" : "disabled"}>${buyLabel}</button>
            <button class="small-button alt" data-sell-filter="${filter.key}" ${unusedCount > 0 ? "" : "disabled"}>Sell Spare (${resaleValue})</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  const dispenserMarkup = `
      <article class="shop-card">
        <img class="shop-thumb" src="${AUTO_DISPENSER_IMAGE_PATH}" alt="Automatic pellet dispenser" />
        <div class="shop-meta shop-card-main">
          <div>
            <strong>Pellet Dispenser</strong>
            <div class="fish-meta">${dispenserInstalled ? "Installed in this tank" : "Not installed in this tank"}</div>
          </div>
          <div class="fish-meta">Mounts at the center waterline, stores up to ${AUTO_DISPENSER_MAX_PELLETS} pellets, and feeds hungry fish on demand.</div>
          <div class="mini-note">${dispenserLoadedCount}/${AUTO_DISPENSER_MAX_PELLETS} loaded | Manual release ${String(dispenserPortion).padStart(2, "0")}</div>
        </div>
        <div class="shop-meta shop-card-actions">
          <span class="price-tag">${AUTO_DISPENSER_COST} ${pluralize("coin", AUTO_DISPENSER_COST)}</span>
          <div class="shop-button-row">
            <button class="buy-button" data-buy-auto-dispenser="true" ${dispenserInstalled || !dispenserAffordable ? "disabled" : ""}>${dispenserInstalled ? "Installed" : "Buy & Install"}</button>
          </div>
        </div>
      </article>
  `;

  const uvLightMarkup = isUvLightFeatureEnabled()
    ? (() => {
      const uvLightOwned = isUvLightOwned();
      const uvLightInstalled = isUvLightInstalled();
      const uvLightActive = isUvLightActive();
      const uvLightAffordable = state.coins >= UV_LIGHT_COST;
      return `
      <article class="shop-card">
        <img class="shop-thumb uv-light-shop-thumb" src="${UV_LIGHT_IMAGE_PATH}" alt="UV light" />
        <div class="shop-meta shop-card-main">
          <div>
            <strong>UV Light</strong>
            <div class="fish-meta">${uvLightOwned ? (uvLightInstalled ? `Added to this tank | ${uvLightActive ? "On" : "Off"}` : "Owned | Not added to this tank") : "Not owned"}</div>
          </div>
          <div class="fish-meta">Adds a blacklight glow pass for fish and decor colors that naturally react under UV.</div>
          <div class="mini-note">Once owned, add or remove it from the Edit Tank panel.</div>
        </div>
        <div class="shop-meta shop-card-actions">
          <span class="price-tag">${uvLightOwned ? "Unlocked" : `${UV_LIGHT_COST} ${pluralize("coin", UV_LIGHT_COST)}`}</span>
          <div class="shop-button-row">
            <button class="buy-button" data-buy-uv-light="true" ${uvLightOwned || !uvLightAffordable ? "disabled" : ""}>${uvLightOwned ? "Owned" : "Buy & Add"}</button>
          </div>
        </div>
      </article>
  `;
    })()
    : "";

  const backgroundMarkup = runtime.backgroundCatalog
    .filter((background) => !background.defaultUnlocked)
    .map((background) => {
      const owned = isBackgroundOwned(background.key);
      const selected = state.selectedBackground === background.key;
      const affordable = state.coins >= background.cost;
      const statusLabel = background.defaultUnlocked
        ? "Unlocked by default"
        : owned
          ? "Owned"
          : "Locked";
      const priceLabel = background.defaultUnlocked || owned
        ? "Unlocked"
        : `${background.cost} ${pluralize("coin", background.cost)}`;

      return `
      <article class="shop-card">
        ${renderBackgroundPreview(background, "shop-thumb background-shop-thumb")}
        <div class="shop-meta shop-card-main">
          <div>
            <strong>${background.name}</strong>
            <div class="fish-meta">${statusLabel}</div>
          </div>
        </div>
        <div class="shop-meta shop-card-actions">
          <span class="price-tag">${priceLabel}</span>
          <div class="shop-button-row">
            ${owned
          ? `<button class="small-button alt" data-use-background-shop="${background.key}">${selected ? "Using This Background" : "Use Now"}</button>`
          : `<button class="buy-button" data-buy-background="${background.key}" ${affordable ? "" : "disabled"}>Unlock & Use</button>`}
          </div>
        </div>
      </article>
      `;
    })
    .join("");

  const tankType = getTankTypeMeta("rectangular");
  const ownedCount = getAllTanks().length;
  const expansionCost = getAquariumExpansionCost();
  const affordable = state.coins >= expansionCost;
  const tankMarkup = `
    <article class="shop-card">
      ${renderTankProductImage(tankType.id, "Aquarium")}
      <div class="shop-meta shop-card-main">
        <div>
          <strong>Aquarium Extension</strong>
          <div class="fish-meta">${ownedCount} connected ${pluralize("section", ownedCount)}</div>
        </div>
        <div class="fish-meta">${tankType.description}</div>
        <div class="mini-note">Adds one full-sized neighborhood to any exposed side of Bubble Borough.</div>
      </div>
      <div class="shop-meta shop-card-actions">
        <span class="price-tag">${expansionCost} ${pluralize("coin", expansionCost)}</span>
        <div class="shop-button-row">
          <button class="buy-button" data-extend-aquarium-store ${affordable ? "" : "disabled"}>Extend Aquarium</button>
        </div>
      </div>
    </article>
  `;

  const markup = `
    ${ENABLE_FILTER ? `
    <section class="shop-section">
      <div class="shop-section-heading">
        <h3>Filters</h3>
        <p>Buy multiple filters, equip them per tank, and sell unused ones for 75% back.</p>
      </div>
      <div class="shop-section-cards">
        ${filterMarkup || `<div class="empty-state">No filter upgrades are available yet.</div>`}
      </div>
    </section>` : ""}
    ${uvLightMarkup ? `
    <section class="shop-section">
      <div class="shop-section-heading">
        <h3>Lighting</h3>
        <p>Unlock a blacklight effect and switch it per tank from the toolbar.</p>
      </div>
      <div class="shop-section-cards">
        ${uvLightMarkup}
      </div>
    </section>` : ""}
    <section class="shop-section">
      <div class="shop-section-heading">
        <h3>Backgrounds</h3>
        <p>Purchase more backdrops to further customize your fish tanks.</p>
      </div>
      <div class="shop-section-cards">
        ${backgroundMarkup || `<div class="empty-state">No backgrounds are available yet.</div>`}
      </div>
    </section>
    <section class="shop-section">
      <div class="shop-section-heading">
        <h3>Aquariums</h3>
        <p>Grow one continuous aquarium by choosing where its next neighborhood connects.</p>
      </div>
      <div class="shop-section-cards">
        ${tankMarkup}
      </div>
    </section>
  `;

  setMarkupIfChanged("equipment-shop", dom.equipmentShop, markup);
}

function renderDecorInventory() {
  const inventoryDataKey = [
    isViolenceAndGoreEnabled() ? "1" : "0",
    runtime.placementMode?.decorKey || "",
    ...Object.entries(state.decorInventory)
      .filter(([, count]) => count > 0)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, count]) => `${key}:${count}:${formatDecorScale(getDecorScaleDefault(key))}`)
  ].join("|");
  if (!shouldRebuildRenderSection("decor-inventory-data", inventoryDataKey)) {
    return;
  }

  const ownedItems = Object.entries(state.decorInventory)
    .filter(([, count]) => count > 0)
    .sort(([leftKey], [rightKey]) => {
      const left = runtime.decorMap.get(leftKey)?.name || leftKey;
      const right = runtime.decorMap.get(rightKey)?.name || rightKey;
      return left.localeCompare(right);
    });

  if (!ownedItems.length) {
    setMarkupIfChanged("decor-inventory", dom.decorInventory, `
      <div class="empty-state">
        Storage is empty. Open the decor cart to buy cute plants, shells, and props.
      </div>
    `);
    return;
  }

  const markup = ownedItems
    .map(([key, count]) => {
      const decor = runtime.decorMap.get(key) || {
        name: titleFromFile(key),
        path: resolveAppUrl(`assets/decor/${encodeURIComponent(key)}`)
      };
      const disabledByContent = !canUseDecorWithCurrentContentSettings(key);
      const placing = !disabledByContent && runtime.placementMode?.decorKey === key;
      const defaultScale = getDecorScaleDefault(key);

      return `
        <article class="mini-card">
          <img class="decor-thumb" src="${escapeHtml(getDecorThumbnailPath(decor))}" alt="${escapeHtml(decor.name)}" />
          <div>
            <strong>${decor.name}</strong>
            <div class="fish-meta">${count} in storage.</div>
            <div class="mini-note">Default size: ${formatDecorScale(defaultScale)}</div>
            ${disabledByContent ? `<div class="mini-note">Disabled while Violence & Gore is off.</div>` : ""}
          </div>
          <div class="mini-card-actions">
            <div class="size-controls">
              <button class="small-button icon alt" data-size-decor="${key}" data-size-direction="-1" aria-label="Make ${decor.name} smaller">-</button>
              <span class="size-badge">${formatDecorScale(defaultScale)}</span>
              <button class="small-button icon alt" data-size-decor="${key}" data-size-direction="1" aria-label="Make ${decor.name} larger">+</button>
            </div>
            <button class="small-button alt" data-sell-decor-inventory="${key}">Sell</button>
            <button class="small-button ${placing ? "alt" : ""}" data-place-decor="${key}" ${disabledByContent ? "disabled" : ""}>
              ${placing ? "Cancel Preview" : "Preview & Place"}
            </button>
          </div>
        </article>
      `;
    })
    .join("");
  setMarkupIfChanged("decor-inventory", dom.decorInventory, markup);
}
