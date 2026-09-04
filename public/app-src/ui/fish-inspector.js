// Source fragment: ui/fish-inspector.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function adjustFishSize(fishId, direction) {
  const managed = getManagedFishById(fishId);
  if (!managed) {
    return;
  }

  const { fish, inStorage } = managed;
  const now = Date.now();
  const nextScale = clamp(fish.scale + direction * SIZE_STEP, FISH_SCALE_MIN, FISH_SCALE_MAX);
  if (Math.abs(nextScale - fish.scale) < 0.0001) {
    return;
  }

  if (inStorage) {
    fish.scale = nextScale;
  } else {
    preserveTankDirtinessThroughChange(now, () => {
      fish.scale = nextScale;
    });
  }
  saveState();
  renderUi(now);
}

function saveFishSizeAsDefault(fishId) {
  const managed = getManagedFishById(fishId);
  if (!managed) {
    return;
  }

  const { fish } = managed;
  state.fishScaleDefaults[fish.speciesId] = clamp(fish.scale, FISH_SCALE_MIN, FISH_SCALE_MAX);
  saveState();
  renderUi(Date.now());
}

function openFishInspector(fishId, options = {}) {
  if (!getManagedFishById(fishId)) {
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
  if (options.settingsOpen === true) {
    runtime.fishInspectorSettingsOpen = true;
  }
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
  const managed = getManagedFishById(runtime.selectedFishId);
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
  if (!getManagedFishById(runtime.selectedFishId)) {
    return;
  }
  runtime.fishInspectorSettingsOpen = !runtime.fishInspectorSettingsOpen;
  renderUi(Date.now());
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
    && (!isUndeadSpecies(species) || isViolenceAndGoreEnabled())
  ));
}

function renderFishInspectorBehaviorOptions(fish, baseSpecies) {
  const profiles = getFishInspectorBehaviorProfiles();
  const options = [
    `<option value="">Original (${escapeHtml(baseSpecies?.name || "Fish")})</option>`,
    ...profiles.map((profile) => `
      <option value="${escapeHtml(profile.id)}">${escapeHtml(profile.name)}</option>
    `)
  ].join("");
  setMarkupIfChanged("fish-inspector-behavior-options", dom.inspectorFishBehaviorSelect, options);
  if (dom.inspectorFishBehaviorSelect) {
    dom.inspectorFishBehaviorSelect.value = sanitizeFishBehaviorSpeciesId(fish?.behaviorSpeciesId, fish?.speciesId);
  }
}

function setInspectorInputValue(input, value) {
  if (input instanceof HTMLInputElement && document.activeElement !== input) {
    input.value = String(value);
  }
}

function renderFishInspectorColorControls(fish) {
  if (!dom.inspectorFishColorSwatches) {
    return;
  }

  const activeColor = getFishColorSetting(fish);
  const originalSelected = !activeColor;
  const rgbSelected = isDecorRgbColorSetting(activeColor);
  const originalTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${originalSelected ? "is-selected" : ""}"
      type="button"
      data-inspector-fish-color=""
      aria-pressed="${originalSelected}"
      aria-label="Use original fish color"
      title="Original color">
      Original
    </button>
  `;
  const rgbTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile cave-color-rgb-tile ${rgbSelected ? "is-selected" : ""}"
      type="button"
      data-inspector-fish-color="${DECOR_RGB_COLOR_SETTING}"
      aria-pressed="${rgbSelected}"
      aria-label="Fade fish through RGB colors"
      title="RGB color cycle">
      RGB
    </button>
  `;
  const swatches = getCustomGravelColorChoices().map((choice) => {
    const selected = activeColor === choice.color;
    return `
      <button
        class="custom-gravel-color-swatch bubbler-color-swatch ${selected ? "is-selected" : ""}"
        type="button"
        style="--swatch:${choice.color};"
        data-inspector-fish-color="${choice.color}"
        aria-pressed="${selected}"
        aria-label="Set fish to ${escapeHtml(choice.label)}"
        title="${escapeHtml(choice.label)}"></button>
    `;
  }).join("");

  setMarkupIfChanged(
    "fish-inspector-color-swatches",
    dom.inspectorFishColorSwatches,
    `
      <div class="color-choice-mode-row">
        ${originalTile}
        ${rgbTile}
      </div>
      <div class="color-choice-swatch-row">
        ${swatches}
      </div>
    `
  );
}

function updateInspectorFishReadouts(fish) {
  const sizePercent = Math.round(clamp(Number(fish?.scale) || DEFAULT_FISH_SCALE, FISH_SCALE_MIN, FISH_SCALE_MAX) * 100);
  const activeColor = getFishColorSetting(fish);
  setInspectorInputValue(dom.inspectorFishSizeInput, sizePercent);
  setTextIfChanged(dom.inspectorFishSizeValue, `${sizePercent}%`);
  setTextIfChanged(dom.inspectorFishColorValue, formatCaveColorChoiceLabel(activeColor));
  if (dom.inspectorFishColorizeInput instanceof HTMLInputElement) {
    dom.inspectorFishColorizeInput.checked = getFishColorizeSetting(fish);
  }
  renderFishInspectorColorControls(fish);
}

function updateInspectorFishSetting(setting, rawValue) {
  const managed = getManagedFishById(runtime.selectedFishId);
  if (!managed) {
    return;
  }

  const { fish, inStorage } = managed;
  const now = Date.now();
  let changed = false;
  const applyChange = () => {
    switch (setting) {
      case "size": {
        const nextScale = clamp((Number(rawValue) || 100) / 100, FISH_SCALE_MIN, FISH_SCALE_MAX);
        if (Math.abs(nextScale - fish.scale) > 0.0001) {
          fish.scale = nextScale;
          changed = true;
        }
        break;
      }
      case "behavior": {
        const nextBehaviorSpeciesId = sanitizeFishBehaviorSpeciesId(rawValue, fish.speciesId);
        if ((fish.behaviorSpeciesId || "") !== nextBehaviorSpeciesId) {
          fish.behaviorSpeciesId = nextBehaviorSpeciesId;
          fish.activity = "roam";
          fish.feedingPelletId = null;
          fish.hangoutDecorId = null;
          clearFishSchoolFollowState(fish);
          clearFishCaveBehavior(fish);
          const effectiveSpecies = getSpeciesForFish(fish);
          if (effectiveSpecies) {
            fish.swimSpeed = normalizeFishSpeed(effectiveSpecies);
          }
          fish.targetAt = now;
          if (effectiveSpecies) {
            enforceFishLayerBoundary(fish, effectiveSpecies);
          }
          changed = true;
        }
        break;
      }
      case "color": {
        const nextColor = normalizeDecorColorSetting(rawValue);
        if (getFishColorSetting(fish) !== nextColor) {
          fish.fishColor = nextColor;
          fish.hueShift = 0;
          fish.saturation = 100;
          fish.brightness = 100;
          changed = true;
        }
        break;
      }
      case "colorize": {
        const nextColorize = normalizeDecorColorizeSetting(rawValue);
        if (getFishColorizeSetting(fish) !== nextColorize) {
          fish.fishColorize = nextColorize;
          changed = true;
        }
        break;
      }
      default:
        break;
    }
  };

  if (setting === "size" && !inStorage) {
    preserveTankDirtinessThroughChange(now, applyChange);
  } else {
    applyChange();
  }

  if (!changed) {
    updateInspectorFishReadouts(fish);
    return;
  }
  saveState();
  renderUi(now);
}
