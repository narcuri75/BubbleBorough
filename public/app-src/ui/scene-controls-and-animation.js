// Source fragment: ui/scene-controls-and-animation.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderPlacedDecor() {
  const placedDecorDataKey = state.placedDecor
    .map((item) => [
      item.id,
      item.decorKey,
      getDecorTankLayer(item),
      Number(item.xNorm).toFixed(4),
      Number(item.yNorm).toFixed(4),
      Number(item.scale).toFixed(2),
      isDecorHorizontallyFlipped(item) ? 1 : 0,
      isDecorVerticallyFlipped(item) ? 1 : 0,
      item.groupId || ""
    ].join(","))
    .concat([
      (Array.isArray(runtime.selectedDecorIds) ? runtime.selectedDecorIds : []).join(",")
    ])
    .join("|");
  if (!shouldRebuildRenderSection("placed-decor-data", placedDecorDataKey)) {
    return;
  }

  if (!state.placedDecor.length) {
    setMarkupIfChanged("placed-decor", dom.placedDecorList, `
      <div class="empty-state">
        Nothing is placed yet.
      </div>
    `);
    return;
  }

  const sorted = [...state.placedDecor].sort((left, right) => {
    if (getDecorTankLayer(left) !== getDecorTankLayer(right)) {
      return getDecorTankLayer(right) - getDecorTankLayer(left);
    }
    return left.yNorm - right.yNorm;
  });
  const selectedItems = getSelectedPlacedDecorItems();
  const selectedGroupIds = getDecorGroupIdsForItems(selectedItems);
  const selectionMarkup = selectedItems.length > 1
    ? `
      <article class="mini-card decor-selection-card">
        <div>
          <strong>${selectedItems.length} Selected</strong>
          <div class="fish-meta">${selectedGroupIds.length ? "Grouped selection ready." : "Press G to group them."}</div>
          <div class="mini-note">Shift-click decor tray items to adjust the selection.</div>
        </div>
        <div class="mini-card-actions">
          <button class="small-button" data-group-selected-decor>Group / Add To Group</button>
          <button class="small-button alt" data-ungroup-selected-decor ${selectedGroupIds.length ? "" : "disabled"}>Ungroup</button>
        </div>
      </article>
    `
    : "";
  const markup = selectionMarkup + sorted
    .map((item) => {
      const decor = runtime.decorMap.get(item.decorKey) || {
        name: titleFromFile(item.decorKey),
        path: resolveAppUrl(`assets/decor/${encodeURIComponent(item.decorKey)}`)
      };
      const grouped = isPlacedDecorGrouped(item);
      const selected = getSelectedDecorIdSet().has(item.id);

      return `
        <article class="mini-card ${selected ? "is-selected" : ""}">
          <img class="decor-thumb" src="${escapeHtml(getDecorThumbnailPath(decor))}" alt="${escapeHtml(decor.name)}"${isDecorHorizontallyFlipped(item) || isDecorVerticallyFlipped(item) ? ` style="transform: scale(${isDecorHorizontallyFlipped(item) ? -1 : 1}, ${isDecorVerticallyFlipped(item) ? -1 : 1});"` : ""} />
          <div>
            <strong>${decor.name}</strong>
            <div class="fish-meta">${grouped ? "Grouped decor." : "Placed in the tank."}</div>
            <div class="mini-note">Layer ${getDecorTankLayer(item)}. Current size: ${formatDecorScale(item.scale)}</div>
          </div>
          <div class="mini-card-actions">
            <div class="size-controls">
              <button class="small-button icon alt" data-resize-placed="${item.id}" data-size-direction="-1" aria-label="Make ${decor.name} smaller">-</button>
              <span class="size-badge">${formatDecorScale(item.scale)}</span>
              <button class="small-button icon alt" data-resize-placed="${item.id}" data-size-direction="1" aria-label="Make ${decor.name} larger">+</button>
            </div>
            <button class="small-button" data-copy-size="${item.id}">Set Default</button>
            <button class="small-button alt" data-edit-decor-settings="${item.id}">Settings</button>
            <button class="small-button alt" data-ungroup-decor="${item.id}" ${grouped ? "" : "disabled"}>Ungroup</button>
            <button class="small-button alt" data-sell-decor-placed="${item.id}" ${grouped ? "disabled" : ""}>Sell</button>
            <button class="small-button alt" data-store-decor="${item.id}" ${grouped ? "disabled" : ""}>Put Away</button>
          </div>
        </article>
      `;
    })
    .join("");
  setMarkupIfChanged("placed-decor", dom.placedDecorList, markup);
}

function renderBackgrounds() {
  const buildBackgroundCardsMarkup = (backgrounds) => backgrounds
    .map((background) => {
      const selected = state.selectedBackground === background.key;
      return `
        <article class="background-card ${selected ? "is-selected" : ""}">
          ${renderBackgroundPreview(background, "background-thumb")}
          <div>
            <strong>${background.name}</strong>
          </div>
          <button data-select-background="${background.key}">
            ${selected
          ? "Using This Background"
          : isLocalImageBackgroundKey(background.key) && !hasLocalBackgroundImage()
            ? "Choose Image"
            : "Use Background"}
          </button>
        </article>
      `;
    })
    .join("");

  if (dom.backgroundList) {
    const sharedMarkup = buildBackgroundCardsMarkup(
      getOwnedBackgroundCatalog().filter((background) => !isCustomBackgroundKey(background.key))
    );
    setMarkupIfChanged(
      "background-list",
      dom.backgroundList,
      sharedMarkup || `<div class="empty-state">No image backgrounds are unlocked yet.</div>`
    );
  }

  if (dom.equipmentBackgroundList) {
    const localImageReady = hasLocalBackgroundImage();
    const localImageSelected = isLocalImageBackgroundKey(state.selectedBackground);
    const localBackground = runtime.backgroundMap.get(CUSTOM_IMAGE_BACKGROUND_ASSET_KEY);
    const localCardMarkup = localBackground
      ? `
        <article class="background-card local-background-card ${localImageSelected ? "is-selected" : ""}">
          ${renderBackgroundPreview(localBackground, "background-thumb")}
          <div>
            <strong>${localBackground.name}</strong>
            <div class="fish-meta">${localImageReady
        ? localImageSelected
          ? "Currently in use for this aquarium."
          : "Ready to use as a background image."
        : "Use your own image file for this aquarium."}</div>
          </div>
          <div class="shop-button-row">
            <button type="button" data-open-local-background-picker>${localImageReady ? "Replace Image" : "Choose Image"}</button>
            <button class="small-button alt" type="button" data-select-background="${CUSTOM_IMAGE_BACKGROUND_ASSET_KEY}" ${localImageReady ? "" : "disabled"}>${localImageSelected ? "Using This Image" : "Use Image"}</button>
            <button class="small-button alt" type="button" data-clear-local-background ${localImageReady ? "" : "disabled"}>Clear</button>
          </div>
        </article>
      `
      : "";
    const equipmentMarkup = `${localCardMarkup}${buildBackgroundCardsMarkup(
      getOwnedBackgroundCatalog().filter((background) => (
        !isCustomBackgroundKey(background.key)
        && !isLocalImageBackgroundKey(background.key)
      ))
    )}`;
    setMarkupIfChanged(
      "equipment-background-list",
      dom.equipmentBackgroundList,
      equipmentMarkup || `<div class="empty-state">No image backgrounds are unlocked yet.</div>`
    );
  }
}

function renderSolidBackgroundControls() {
  const container = dom.equipmentBackgroundColorPanel;
  if (!container) {
    return;
  }

  const solidEnabled = isSolidBackgroundEnabled();
  const gradientEnabled = isGradientBackgroundEnabled();
  const animatedEnabled = isAnimatedBackgroundEnabled();
  const colorChoices = getSolidBackgroundColorChoices();
  const activeColor = getActiveSolidBackgroundColor();
  const activeChoice = colorChoices.find((choice) => choice.color === activeColor)
    || { label: activeColor, color: activeColor };
  const gradientColors = getActiveGradientBackgroundColors();
  const gradientStartChoice = colorChoices.find((choice) => choice.color === gradientColors.start)
    || { label: gradientColors.start, color: gradientColors.start };
  const gradientEndChoice = colorChoices.find((choice) => choice.color === gradientColors.end)
    || { label: gradientColors.end, color: gradientColors.end };
  const animatedColors = getActiveAnimatedBackgroundColors();
  const animatedChoicesByKey = Object.fromEntries(
    ANIMATED_BACKGROUND_COLOR_GROUPS.map((group) => {
      const color = animatedColors[group.key];
      const choice = colorChoices.find((entry) => entry.color === color)
        || { label: color, color };
      return [group.key, choice];
    })
  );
  const swatches = solidEnabled
    ? colorChoices
      .map((choice) => {
        const selected = choice.color === activeColor;
        return `
        <button
          class="custom-gravel-color-swatch ${selected ? "is-selected" : ""}"
          type="button"
          data-solid-background-color="${choice.color}"
          aria-pressed="${selected}"
          aria-label="Set solid background color to ${choice.label}"
          title="${choice.label}"
          style="--swatch:${choice.color};">
        </button>
      `;
      })
      .join("")
    : "";
  const renderGradientSwatches = (role, activeColorValue) => colorChoices
    .map((choice) => {
      const selected = choice.color === activeColorValue;
      return `
        <button
          class="custom-gravel-color-swatch ${selected ? "is-selected" : ""}"
          type="button"
          data-gradient-background-role="${role}"
          data-gradient-background-color="${choice.color}"
          aria-pressed="${selected}"
          aria-label="Set gradient ${role === "end" ? "bottom right" : "top left"} color to ${choice.label}"
          title="${choice.label}"
          style="--swatch:${choice.color};">
        </button>
      `;
    })
    .join("");
  const renderAnimatedSwatches = (role, activeColorValue, roleLabel) => colorChoices
    .map((choice) => {
      const selected = choice.color === activeColorValue;
      return `
        <button
          class="custom-gravel-color-swatch ${selected ? "is-selected" : ""}"
          type="button"
          data-animated-background-role="${role}"
          data-animated-background-color="${choice.color}"
          aria-pressed="${selected}"
          aria-label="Set ${roleLabel} color to ${choice.label}"
          title="${choice.label}"
          style="--swatch:${choice.color};">
        </button>
      `;
    })
    .join("");
  const animatedGroupMarkup = ANIMATED_BACKGROUND_COLOR_GROUPS
    .map((group) => `
      <div class="background-gradient-color-group">
        <div class="custom-gravel-choice-summary">
          <span>${group.label}</span>
          <strong>${animatedChoicesByKey[group.key].label}</strong>
        </div>
        <div class="custom-gravel-swatches" role="group" aria-label="Animated background ${group.description} color choices">
          ${renderAnimatedSwatches(group.key, animatedColors[group.key], group.description)}
        </div>
      </div>
    `)
    .join("");

  const markup = `
    <div class="background-color-panel-shell">
      <label class="settings-toggle-row background-solid-toggle-row" for="solidBackgroundToggle">
        <div class="settings-toggle-copy">
          <span class="settings-toggle-label">Solid Color</span>
          <span class="settings-toggle-note">Use a flat backdrop instead of an image background.</span>
        </div>
        <div class="background-solid-toggle-controls">
          ${solidEnabled ? renderCustomBackgroundPreviewSwatch(getCurrentTank(), "background-solid-toggle-preview") : ""}
          <input
            id="solidBackgroundToggle"
            class="settings-checkbox"
            type="checkbox"
            data-toggle-solid-background
            ${solidEnabled ? "checked" : ""}
            aria-label="Use Solid Color background" />
        </div>
      </label>
      <label class="settings-toggle-row background-solid-toggle-row" for="gradientBackgroundToggle">
        <div class="settings-toggle-copy">
          <span class="settings-toggle-label">Gradient Background</span>
          <span class="settings-toggle-note">Blend two colors diagonally from the top left to the bottom right.</span>
        </div>
        <div class="background-solid-toggle-controls">
          ${gradientEnabled ? renderCustomBackgroundPreviewSwatch(getCurrentTank(), "background-solid-toggle-preview") : ""}
          <input
            id="gradientBackgroundToggle"
            class="settings-checkbox"
            type="checkbox"
            data-toggle-gradient-background
            ${gradientEnabled ? "checked" : ""}
            aria-label="Use Gradient background" />
        </div>
      </label>
      <label class="settings-toggle-row background-solid-toggle-row" for="animatedBackgroundToggle">
        <div class="settings-toggle-copy">
          <span class="settings-toggle-label">Animated Background</span>
          <span class="settings-toggle-note">Use a slow underwater wallpaper effect instead of a still image.</span>
        </div>
        <div class="background-solid-toggle-controls">
          ${animatedEnabled ? renderCustomBackgroundPreviewSwatch(getCurrentTank(), "background-solid-toggle-preview") : ""}
          <input
            id="animatedBackgroundToggle"
            class="settings-checkbox"
            type="checkbox"
            data-toggle-animated-background
            ${animatedEnabled ? "checked" : ""}
            aria-label="Use Animated background" />
        </div>
      </label>
      ${(solidEnabled || gradientEnabled || animatedEnabled) ? `
      <div class="settings-subsection-heading">
        <h4>Background Colors</h4>
      </div>
      ` : ""}
      ${solidEnabled ? `
      <article class="custom-gravel-layer-card background-solid-color-card">
        <div class="custom-gravel-layer-header background-color-preview-header">
          ${renderCustomBackgroundPreviewSwatch(getCurrentTank(), "background-mode-preview")}
        </div>
        <div class="custom-gravel-choice-summary">
          <span>Selected Color</span>
          <strong>${activeChoice.label}</strong>
        </div>
        <div class="custom-gravel-swatches" role="group" aria-label="Solid background color choices">
          ${swatches}
        </div>
      </article>
      ` : ""}
      ${gradientEnabled ? `
      <article class="custom-gravel-layer-card background-solid-color-card">
        <div class="custom-gravel-layer-header background-color-preview-header">
          ${renderCustomBackgroundPreviewSwatch(getCurrentTank(), "background-mode-preview")}
        </div>
        <div class="background-gradient-grid">
          <div class="background-gradient-color-group">
            <div class="custom-gravel-choice-summary">
              <span>Top Left</span>
              <strong>${gradientStartChoice.label}</strong>
            </div>
            <div class="custom-gravel-swatches" role="group" aria-label="Top left gradient color choices">
              ${renderGradientSwatches("start", gradientColors.start)}
            </div>
          </div>
          <div class="background-gradient-color-group">
            <div class="custom-gravel-choice-summary">
              <span>Bottom Right</span>
              <strong>${gradientEndChoice.label}</strong>
            </div>
            <div class="custom-gravel-swatches" role="group" aria-label="Bottom right gradient color choices">
              ${renderGradientSwatches("end", gradientColors.end)}
            </div>
          </div>
        </div>
      </article>
      ` : ""}
      ${animatedEnabled ? `
      <article class="custom-gravel-layer-card background-solid-color-card">
        <div class="custom-gravel-layer-header background-color-preview-header">
          ${renderCustomBackgroundPreviewSwatch(getCurrentTank(), "background-mode-preview")}
        </div>
        <div class="shop-button-row">
          <button class="small-button alt" type="button" data-reset-animated-background-colors>Reset Scheme</button>
        </div>
        <div class="background-gradient-grid">
          ${animatedGroupMarkup}
        </div>
      </article>
      ` : ""}
    </div>
  `;

  setMarkupIfChanged("equipment-background-color-panel", container, markup);
}

function renderFilterAssets() {
  if (!ENABLE_FILTER) {
    setMarkupIfChanged("scene-assets-filter", dom.filterAssetList, "");
    setMarkupIfChanged("equipment-scene-assets-filter", dom.equipmentFilterList, "");
    return;
  }
  renderSceneAssetCards(dom.filterAssetList, getOwnedFilterCatalog(), state.selectedFilterAsset, "data-select-filter", "Equip Filter", "Equipped");
  renderSceneAssetCards(dom.equipmentFilterList, getOwnedFilterCatalog(), state.selectedFilterAsset, "data-select-filter", "Equip Filter", "Equipped", "equipment-filter-assets");
}

function syncFilterFeatureVisibility() {
  const filterEnabled = ENABLE_FILTER;
  const uvLightEnabled = isUvLightFeatureEnabled();
  const showFilterPanels = filterEnabled || uvLightEnabled;

  if (dom.tankFilterSection instanceof HTMLElement) {
    dom.tankFilterSection.hidden = !showFilterPanels;
  }
  if (dom.equipmentFilterSection instanceof HTMLElement) {
    dom.equipmentFilterSection.hidden = !showFilterPanels;
  }
  if (dom.filterAssetList instanceof HTMLElement) {
    dom.filterAssetList.hidden = !filterEnabled;
  }
  if (dom.equipmentFilterList instanceof HTMLElement) {
    dom.equipmentFilterList.hidden = !filterEnabled;
  }
  if (dom.tankFilterSectionTitle) {
    dom.tankFilterSectionTitle.textContent = filterEnabled ? "Filter" : "Lighting";
  }
  if (dom.tankFilterSectionNote) {
    dom.tankFilterSectionNote.textContent = filterEnabled
      ? "Equip owned filters here. Buy stronger ones from the tank shop."
      : "Add or remove a UV light here. Buy tank gear from the tank shop.";
  }
  if (dom.equipmentFilterSectionTitle) {
    dom.equipmentFilterSectionTitle.textContent = filterEnabled ? "Change Filter" : "Lighting";
  }
  if (dom.equipmentFilterSectionNote) {
    dom.equipmentFilterSectionNote.textContent = filterEnabled
      ? "Equip owned filters here and buy stronger ones from the tank shop."
      : "Add or remove a UV light here. Buy tank gear from the tank shop.";
  }
  if (dom.equipmentPanelDescription) {
    dom.equipmentPanelDescription.textContent = filterEnabled
      ? (uvLightEnabled
        ? "Adjust the current aquarium's background, gravel, filter, and UV light."
        : "Adjust the current aquarium's background, gravel, and filter.")
      : (uvLightEnabled
        ? "Adjust the current aquarium's background, gravel, and UV light."
        : "Adjust the current aquarium's background and gravel.");
  }
}

function renderUvLightControls() {
  const containers = [
    ["uv-light-controls", dom.uvLightList],
    ["equipment-uv-light-controls", dom.equipmentUvLightList]
  ].filter(([, container]) => container);
  if (!containers.length) {
    return;
  }

  const uvLightVisible = isUvLightFeatureEnabled();
  for (const [, container] of containers) {
    if (container instanceof HTMLElement) {
      container.hidden = !uvLightVisible;
    }
  }
  if (!uvLightVisible) {
    for (const [cacheKey, container] of containers) {
      setMarkupIfChanged(cacheKey, container, "");
    }
    return;
  }

  const owned = isUvLightOwned();
  const installed = isUvLightInstalled();
  const active = isUvLightActive();
  const markup = owned
    ? `
      <article class="background-card uv-light-card ${installed ? "is-selected" : ""}">
        <img class="scene-thumb" src="${UV_LIGHT_IMAGE_PATH}" alt="UV light" />
        <div>
          <strong>UV Light</strong>
          <div class="fish-meta">${installed ? `Added to this tank. Toolbar switch is ${active ? "on" : "off"}.` : "Owned and ready to add."}</div>
        </div>
        <div class="shop-button-row">
          <button type="button" data-toggle-uv-light-install>${installed ? "Remove from Tank" : "Add to Tank"}</button>
        </div>
      </article>
    `
    : `<div class="empty-state">Buy a UV light from the Tank Shop to add blacklight glow to this aquarium.</div>`;

  for (const [cacheKey, container] of containers) {
    setMarkupIfChanged(cacheKey, container, markup);
  }
}

function renderCustomGravelControls() {
  const containers = [
    ["custom-gravel-panel", dom.customGravelPanel],
    ["equipment-custom-gravel-panel", dom.equipmentCustomGravelPanel]
  ].filter(([, container]) => container);
  if (!containers.length) {
    return;
  }

  const layerCatalog = runtime.customGravelLayerCatalog || [];
  const layersReady = hasReadyCustomGravelLayers();

  if (!layersReady) {
    for (const [cacheKey, container] of containers) {
      setMarkupIfChanged(
        cacheKey,
        container,
        `<div class="empty-state">Custom gravel layers were not found. Add the three layer PNGs to <code>assets/gravel</code>.</div>`
      );
    }
    return;
  }

  const choices = getCustomGravelColorChoices();
  const activeColors = getActiveCustomGravelLayerColors();
  const activeColorizeSettings = getActiveCustomGravelLayerColorizeSettings();
  const layerMarkup = layerCatalog
    .map((layer, index) => {
        const activeColor = activeColors[index] || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
        const activeChoice = choices.find((choice) => choice.color === activeColor) || { label: activeColor, color: activeColor };
        const colorizeChecked = activeColorizeSettings[index] === true;
        const swatchMarkup = choices
          .map((choice) => {
            const selected = choice.color === activeColor;
            return `
              <button
                class="custom-gravel-color-swatch ${selected ? "is-selected" : ""}"
                type="button"
                data-custom-gravel-layer="${index}"
                data-custom-gravel-color="${choice.color}"
                aria-pressed="${selected}"
                aria-label="Set ${layer.label} to ${choice.label}"
                title="${choice.label}"
                style="--swatch:${choice.color};">
              </button>
            `;
          })
          .join("");

        return `
          <article class="custom-gravel-layer-card">
            <div class="custom-gravel-layer-header">
              <div>
                <strong>${layer.label}</strong>
              </div>
              <span class="custom-gravel-layer-swatch" style="--swatch:${activeColor};"></span>
            </div>
            <div class="custom-gravel-choice-summary">
              <span>Selected Color</span>
              <strong>${activeChoice.label}</strong>
            </div>
            <div class="custom-gravel-swatches" role="group" aria-label="${layer.label} color choices">
              ${swatchMarkup}
            </div>
            <label class="cave-colorize-toggle custom-gravel-colorize-toggle">
              <input
                type="checkbox"
                data-custom-gravel-layer="${index}"
                data-custom-gravel-colorize="true"
                ${colorizeChecked ? "checked" : ""} />
              <span>Colorize</span>
            </label>
          </article>
        `;
    })
    .join("");

  const markup = `
    <div class="custom-gravel-panel-shell">
      <div class="custom-gravel-layer-list">${layerMarkup}</div>
    </div>
  `;

  for (const [cacheKey, container] of containers) {
    setMarkupIfChanged(cacheKey, container, markup);
  }
}

function renderSceneAssetCards(container, items, selectedKey, attributeName, useLabel, activeLabel, cacheKeyOverride = "") {
  if (!container) {
    return;
  }

  if (!items.length) {
    setMarkupIfChanged(cacheKeyOverride || `scene-assets-${attributeName}`, container, `<div class="empty-state">No PNG assets were found in this folder yet.</div>`);
    return;
  }

  const markup = items
    .map((item) => {
      const selected = selectedKey === item.key;
      return `
        <article class="background-card ${selected ? "is-selected" : ""}">
          <img class="scene-thumb" src="${item.path}" alt="${item.name}" />
          <div>
            <strong>${item.name}</strong>
            <div class="fish-meta">${item.blurb}</div>
          </div>
          <button ${attributeName}="${item.key}">
            ${selected ? activeLabel : useLabel}
          </button>
        </article>
      `;
    })
    .join("");
  setMarkupIfChanged(cacheKeyOverride || `scene-assets-${attributeName}`, container, markup);
}

function renderControls(now) {
  const selectedActiveFish = state.fish.find((fish) => fish.id === (runtime.selectedFishId || runtime.selectedFishStatusFishId));
  const hasCaveDecor = state.placedDecor.some((item) => isCaveDecorKey(item.decorKey));
  const hasCaveFishCandidate = hasCaveDecor && state.fish.some((fish) => {
    const species = getSpeciesForFish(fish);
    return species && species.behavior !== "sucker" && species.caveEnabled !== false && !isFishDead(fish);
  });
  const hasGravelPebbleCandidate = hasFishGravelPebbleCandidate(now);
  const hasGravelDigCandidate = hasFishGravelDigCandidate(now);
  const debugMode = isDebugModeEnabled();
  if (!debugMode && runtime.debugSidebarOpen) {
    runtime.debugSidebarOpen = false;
  }

  dom.feedButton.disabled = false;
  if (dom.medicineButton) {
    dom.medicineButton.disabled = false;
  }

  if (dom.toggleDebugMenuButton) {
    const debugSidebarOpen = debugMode && runtime.debugSidebarOpen;
    dom.toggleDebugMenuButton.hidden = !debugMode;
    dom.toggleDebugMenuButton.disabled = !debugMode;
    dom.toggleDebugMenuButton.classList.toggle("is-active", debugSidebarOpen);
    dom.toggleDebugMenuButton.title = debugSidebarOpen ? "Close Debug Menu" : "Debug Menu";
    dom.toggleDebugMenuButton.setAttribute("aria-label", debugSidebarOpen ? "Close Debug Menu" : "Debug Menu");
    dom.toggleDebugMenuButton.setAttribute("aria-expanded", String(debugSidebarOpen));
  }
  if (dom.debugSidebar) {
    dom.debugSidebar.hidden = !debugMode || !runtime.debugSidebarOpen;
  }
  renderLivingBoroughDebugPanel(now);
  dom.resetMealsButton.hidden = !debugMode;
  if (dom.completeMealsButton) {
    dom.completeMealsButton.hidden = !debugMode;
  }
  dom.debugDamageFishButton.hidden = !debugMode;
  dom.debugBreedButton.hidden = !debugMode;
  dom.resetFishHealthButton.hidden = !debugMode;
  if (dom.debugInfectFishButton) {
    dom.debugInfectFishButton.hidden = !debugMode;
  }
  if (dom.debugCureFishButton) {
    dom.debugCureFishButton.hidden = !debugMode;
  }
  dom.addCoinsButton.hidden = !debugMode;
  if (dom.addHundredCoinsButton) {
    dom.addHundredCoinsButton.hidden = !debugMode;
  }
  dom.maxDirtButton.hidden = !debugMode;
  if (dom.debugMaxDirtinessButton) {
    dom.debugMaxDirtinessButton.hidden = !debugMode;
  }
  dom.debugGravelDigButton.hidden = !debugMode;
  dom.debugGravelPebbleButton.hidden = !debugMode;
  dom.debugCaveButton.hidden = !debugMode;
  if (dom.debugDailyRecapButton) {
    dom.debugDailyRecapButton.hidden = !debugMode;
  }
  if (dom.debugFishBehaviorLogButton) {
    dom.debugFishBehaviorLogButton.hidden = !debugMode;
  }
  syncDebugBehaviorLabButtons(debugMode, selectedActiveFish, now);

  dom.resetMealsButton.disabled = !debugMode;
  if (dom.completeMealsButton) {
    dom.completeMealsButton.disabled = !debugMode;
  }
  dom.resetFishHealthButton.disabled = !debugMode;
  dom.addCoinsButton.disabled = !debugMode;
  if (dom.addHundredCoinsButton) {
    dom.addHundredCoinsButton.disabled = !debugMode;
  }
  dom.maxDirtButton.disabled = !debugMode;
  if (dom.debugMaxDirtinessButton) {
    dom.debugMaxDirtinessButton.disabled = !debugMode;
  }
  dom.debugGravelDigButton.disabled = !debugMode || !hasGravelDigCandidate;
  dom.debugGravelPebbleButton.disabled = !debugMode || !hasGravelPebbleCandidate;
  dom.debugDamageFishButton.disabled = !debugMode || !selectedActiveFish || isFishDead(selectedActiveFish);
  if (dom.debugInfectFishButton) {
    dom.debugInfectFishButton.disabled = !debugMode || !selectedActiveFish || isFishDead(selectedActiveFish);
  }
  if (dom.debugCureFishButton) {
    dom.debugCureFishButton.disabled = !debugMode || !selectedActiveFish || isFishDead(selectedActiveFish);
  }
  dom.debugBreedButton.disabled = !debugMode || (!hasDebugBreedingPairCandidate(now) && !runtime.debugBreedingSequence);
  if (dom.debugDailyRecapButton) {
    dom.debugDailyRecapButton.disabled = !debugMode || !getCurrentTank();
  }
  if (dom.debugFishBehaviorLogButton) {
    dom.debugFishBehaviorLogButton.disabled = !debugMode || runtime.debugFishBehaviorLog.length === 0;
  }
  dom.debugBreedButton.classList.toggle("is-active", Boolean(runtime.debugBreedingSequence));
  dom.debugBreedButton.title = runtime.debugBreedingSequence
    ? "Debug: Baby Sequence Running"
    : "Debug: Make a Baby";
  dom.debugBreedButton.setAttribute(
    "aria-label",
    runtime.debugBreedingSequence
      ? "Debug: Baby Sequence Running"
      : "Debug: Make a Baby"
  );
  dom.debugCaveButton.disabled = !debugMode || (!hasCaveFishCandidate && !runtime.debugNightCaveMode);
  dom.debugCaveButton.classList.toggle("is-active", runtime.debugNightCaveMode);
  dom.debugCaveButton.title = runtime.debugNightCaveMode
    ? "Debug: Disable Cave Test Loop"
    : "Debug: Cave";
  dom.debugCaveButton.setAttribute(
    "aria-label",
    runtime.debugNightCaveMode
      ? "Debug: Disable Cave Test Loop"
      : "Debug: Cave"
  );
  if (dom.debugGravelPebbleButton) {
    dom.debugGravelPebbleButton.title = hasGravelPebbleCandidate
      ? "Debug: Pebble"
      : "Debug: Keep gravel pebble assets and a living non-sucker fish in the tank";
    dom.debugGravelPebbleButton.setAttribute(
      "aria-label",
      hasGravelPebbleCandidate
        ? "Debug: Pebble"
        : "Debug: Keep gravel pebble assets and a living non-sucker fish in the tank"
    );
  }
  if (dom.debugGravelDigButton) {
    dom.debugGravelDigButton.title = hasGravelDigCandidate
      ? "Debug: Dig"
      : "Debug: Keep a living non-sucker fish in the tank";
    dom.debugGravelDigButton.setAttribute(
      "aria-label",
      hasGravelDigCandidate
        ? "Debug: Dig"
        : "Debug: Keep a living non-sucker fish in the tank"
    );
  }

  dom.spongeButton.classList.toggle("is-active", runtime.cleaningMode);
  dom.scoopButton?.classList.toggle("is-active", runtime.scoopMode);
  dom.feedButton.classList.toggle("is-active", runtime.foodTrayOpen || Boolean(runtime.feedingModeFoodKey));
  dom.medicineButton?.classList.toggle("is-active", runtime.medicineTrayOpen || Boolean(runtime.medicineModeKey));
  dom.openEquipmentButton?.classList.toggle("is-active", runtime.equipmentOverlayOpen);
  dom.openSettingsButton?.classList.toggle("is-active", runtime.settingsOverlayOpen);
  dom.openManagementButton?.classList.toggle("is-active", runtime.utilityOverlayOpen && runtime.utilityOverlayMode === "tank-management");
  dom.careTaskPaneButton?.classList.toggle("is-active", getUiSettings().careTaskPaneOpen === true);
  dom.toggleMouseLockButton?.classList.toggle("is-active", isTankMouseInputLocked());
  const toolbarCareMenuOpen = runtime.toolbarActionMenu === "care";
  const toolbarEditMenuOpen = runtime.toolbarActionMenu === "edit";
  const careToolActive = runtime.medicineTrayOpen || Boolean(runtime.medicineModeKey) || runtime.cleaningMode || runtime.scoopMode;
  const editToolActive = runtime.fishEditMode || runtime.editTankMode || runtime.equipmentOverlayOpen;
  if (dom.toolbarCareMenu) {
    dom.toolbarCareMenu.hidden = !toolbarCareMenuOpen;
  }
  if (dom.toolbarEditMenu) {
    dom.toolbarEditMenu.hidden = !toolbarEditMenuOpen;
  }
  dom.careMenuButton?.classList.toggle("is-active", toolbarCareMenuOpen || careToolActive);
  dom.editMenuButton?.classList.toggle("is-active", toolbarEditMenuOpen || editToolActive);
  dom.careMenuButton?.setAttribute("aria-expanded", String(toolbarCareMenuOpen));
  dom.editMenuButton?.setAttribute("aria-expanded", String(toolbarEditMenuOpen));
  dom.tankBottomDock?.classList.toggle("has-open-action-menu", Boolean(dom.toolbarCareMenu || dom.toolbarEditMenu) && (toolbarCareMenuOpen || toolbarEditMenuOpen));
  if (dom.lightsOutToggleButton) {
    const override = getLightsOutOverride();
    const active = isTankLightsOut(now);
    const modeText = override === LIGHTS_OUT_OVERRIDE_AUTO
      ? "Auto"
      : override === LIGHTS_OUT_OVERRIDE_ON
        ? "On"
        : "Off";
    dom.lightsOutToggleButton.hidden = false;
    dom.lightsOutToggleButton.classList.toggle("is-active", active);
    dom.lightsOutToggleButton.dataset.mode = override;
    dom.lightsOutToggleButton.title = `Lights Out: ${modeText}`;
    dom.lightsOutToggleButton.setAttribute("aria-label", `Lights Out ${modeText}`);
    dom.lightsOutToggleButton.setAttribute("aria-pressed", String(active));
    if (dom.lightsOutModeBadge) {
      dom.lightsOutModeBadge.textContent = override === LIGHTS_OUT_OVERRIDE_AUTO ? "A" : override === LIGHTS_OUT_OVERRIDE_ON ? "ON" : "OFF";
    }
  }
  if (dom.uvLightToggleButton) {
    const uvLightVisible = isUvLightFeatureEnabled();
    const uvInstalled = isUvLightInstalled();
    const uvActive = isUvLightActive();
    dom.uvLightToggleButton.hidden = !uvLightVisible || !uvInstalled;
    dom.uvLightToggleButton.classList.toggle("is-active", uvActive);
    dom.uvLightToggleButton.title = uvActive ? "Turn UV Light Off" : "Turn UV Light On";
    dom.uvLightToggleButton.setAttribute("aria-label", uvActive ? "Turn UV Light Off" : "Turn UV Light On");
    dom.uvLightToggleButton.setAttribute("aria-pressed", String(uvActive));
  }
  if (dom.toolbarTab) {
    const uiSettings = getUiSettings();
    const toolbarCollapsed = uiSettings.toolbarCollapsed;
    const tabLabel = toolbarCollapsed ? "Show Toolbar" : "Hide Toolbar";
    const tabIconMap = {
      "right-center": toolbarCollapsed ? "<" : ">",
      "left-center": toolbarCollapsed ? ">" : "<",
      "bottom-center": toolbarCollapsed ? "^" : "v"
    };
    dom.toolbarTab.textContent = tabIconMap[uiSettings.toolbarPosition] || ">";
    dom.toolbarTab.title = tabLabel;
    dom.toolbarTab.setAttribute("aria-label", tabLabel);
    dom.toolbarTab.setAttribute("aria-pressed", String(toolbarCollapsed));
  }
  if (dom.displayTab) {
    const uiSettings = getUiSettings();
    const displayCollapsed = getEffectiveDisplayCollapsed(uiSettings, getTutorialUiState());
    const displayAtBottom = uiSettings.displayPosition.startsWith("bottom-");
    const displayLabel = displayCollapsed ? "Show Display" : "Hide Display";
    dom.displayTab.textContent = displayAtBottom
      ? (displayCollapsed ? "^" : "v")
      : (displayCollapsed ? "v" : "^");
    dom.displayTab.title = displayLabel;
    dom.displayTab.setAttribute("aria-label", displayLabel);
    dom.displayTab.setAttribute("aria-pressed", String(displayCollapsed));
  }
  if (dom.openEquipmentButton) {
    dom.openEquipmentButton.title = runtime.equipmentOverlayOpen ? "Edit Tank (Open)" : "Edit Tank";
    dom.openEquipmentButton.setAttribute("aria-label", runtime.equipmentOverlayOpen ? "Edit Tank open" : "Edit Tank");
  }
  if (dom.openSettingsButton) {
    dom.openSettingsButton.title = runtime.settingsOverlayOpen ? "Settings (Open)" : "Settings";
    dom.openSettingsButton.setAttribute("aria-label", runtime.settingsOverlayOpen ? "Settings open" : "Settings");
  }
  if (dom.overviewButton) {
    const overviewOpen = runtime.boroughOverviewOpen === true;
    if (!runtime.toolbarCareTaskCountAt || now - runtime.toolbarCareTaskCountAt >= 1000) {
      runtime.toolbarCareTaskCount = buildUniversalManagementCareQueue(now)
        .filter((task) => getCareTaskId(task) !== "all-clear").length;
      runtime.toolbarCareTaskCountAt = now;
    }
    const taskCount = runtime.toolbarCareTaskCount;
    const overviewLabel = taskCount
      ? `Borough Overview, ${taskCount} care ${pluralize("task", taskCount)}`
      : "Borough Overview, all clear";
    dom.overviewButton.title = overviewOpen ? `${overviewLabel} (Open)` : overviewLabel;
    dom.overviewButton.setAttribute("aria-label", overviewOpen ? `${overviewLabel}, open` : overviewLabel);
    dom.overviewButton.classList.toggle("is-active", overviewOpen);
    if (dom.aquariumTaskBadge) {
      dom.aquariumTaskBadge.hidden = taskCount <= 0;
      dom.aquariumTaskBadge.textContent = taskCount > 9 ? "9+" : String(taskCount);
    }
  }
  if (dom.careTaskPaneButton) {
    const tasksOpen = getUiSettings().careTaskPaneOpen === true;
    dom.careTaskPaneButton.title = tasksOpen ? "Hide Tasks" : "Show Tasks";
    dom.careTaskPaneButton.setAttribute("aria-label", tasksOpen ? "Hide Tasks" : "Show Tasks");
    dom.careTaskPaneButton.setAttribute("aria-pressed", String(tasksOpen));
  }
  if (dom.toggleMouseLockButton) {
    const mouseLockAvailable = isTankMouseLockFeatureEnabled();
    const locked = isTankMouseInputLocked();
    if (dom.mouseLockSettingsRow) {
      dom.mouseLockSettingsRow.hidden = !mouseLockAvailable;
    }
    dom.toggleMouseLockButton.hidden = !mouseLockAvailable;
    dom.toggleMouseLockButton.disabled = !mouseLockAvailable;
    dom.toggleMouseLockButton.title = locked ? "Unlock Tank Mouse Input" : "Lock Tank Mouse Input";
    dom.toggleMouseLockButton.setAttribute("aria-label", locked ? "Unlock Tank Mouse Input" : "Lock Tank Mouse Input");
    dom.toggleMouseLockButton.setAttribute("aria-pressed", String(locked));
    if (dom.toggleMouseLockButton.classList.contains("settings-action-button")) {
      dom.toggleMouseLockButton.textContent = locked ? "Unlock Input" : "Lock Input";
    }
  }
  dom.editModeDockButton?.classList.toggle("is-active", runtime.editTankMode);
  if (dom.editModeDockButton) {
    dom.editModeDockButton.title = runtime.editTankMode ? "Edit Decor (Active)" : "Edit Decor";
    dom.editModeDockButton.setAttribute("aria-label", runtime.editTankMode ? "Edit Decor (Active)" : "Edit Decor");
  }
  const activeDecorShortcutTarget = getActiveDecorShortcutTarget();
  const activeDecorShortcutKey = activeDecorShortcutTarget?.decorKey || "";
  const hasActiveDecorShortcutTarget = Boolean(activeDecorShortcutKey);
  const layerShortcutsDisabled = !hasActiveDecorShortcutTarget;
  const scaleShortcutsDisabled = !hasActiveDecorShortcutTarget;
  const layerShortcutHint = !hasActiveDecorShortcutTarget
    ? "Select or drag decor to change its layer"
    : "";
  if (dom.editLayerUpButton) {
    dom.editLayerUpButton.hidden = !runtime.editTankMode;
    dom.editLayerUpButton.disabled = layerShortcutsDisabled;
    dom.editLayerUpButton.title = layerShortcutsDisabled ? layerShortcutHint : "Next decor layer (Z / Up)";
    dom.editLayerUpButton.setAttribute("aria-label", layerShortcutsDisabled ? layerShortcutHint : "Next decor layer (Z / Up)");
  }
  if (dom.editLayerDownButton) {
    dom.editLayerDownButton.hidden = !runtime.editTankMode;
    dom.editLayerDownButton.disabled = layerShortcutsDisabled;
    dom.editLayerDownButton.title = layerShortcutsDisabled ? layerShortcutHint : "Previous decor layer (X / Down)";
    dom.editLayerDownButton.setAttribute("aria-label", layerShortcutsDisabled ? layerShortcutHint : "Previous decor layer (X / Down)");
  }
  if (dom.editScaleUpButton) {
    dom.editScaleUpButton.hidden = !runtime.editTankMode;
    dom.editScaleUpButton.disabled = scaleShortcutsDisabled;
    dom.editScaleUpButton.title = scaleShortcutsDisabled ? "Select or drag decor to resize it" : "Increase decor size (+ / =)";
    dom.editScaleUpButton.setAttribute("aria-label", scaleShortcutsDisabled ? "Select or drag decor to resize it" : "Increase decor size (+ / =)");
  }
  if (dom.editScaleDownButton) {
    dom.editScaleDownButton.hidden = !runtime.editTankMode;
    dom.editScaleDownButton.disabled = scaleShortcutsDisabled;
    dom.editScaleDownButton.title = scaleShortcutsDisabled ? "Select or drag decor to resize it" : "Decrease decor size (-)";
    dom.editScaleDownButton.setAttribute("aria-label", scaleShortcutsDisabled ? "Select or drag decor to resize it" : "Decrease decor size (-)");
  }
  dom.fishEditModeDockButton?.classList.toggle("is-active", runtime.fishEditMode);
  if (dom.fishEditModeDockButton) {
    dom.fishEditModeDockButton.title = runtime.fishEditMode ? "Manage Fish (Active)" : "Manage Fish";
    dom.fishEditModeDockButton.setAttribute("aria-label", runtime.fishEditMode ? "Manage Fish (Active)" : "Manage Fish");
  }
  dom.toggleEditMode.classList.toggle("is-active", runtime.editTankMode);
  dom.toggleEditMode.textContent = runtime.editTankMode ? "Editing" : "Edit";
  renderScrubProgress();

  renderPlacementHint();

  dom.tankStage.style.cursor = (runtime.cleaningMode || runtime.scoopMode || runtime.feedingModeFoodKey || runtime.medicineModeKey)
    ? "none"
    : (runtime.dragState || runtime.decorResizeState || runtime.fishDragState || runtime.eggDragState)
      ? "grabbing"
      : (runtime.editTankMode || runtime.fishEditMode)
        ? "grab"
        : "default";
  syncToolbarFastTooltipExperiment();
  renderToolCursor();
}

function renderToolCursor() {
  const visible = (runtime.cleaningMode || runtime.scoopMode || runtime.feedingModeFoodKey || runtime.medicineModeKey) && runtime.pointerStagePx;
  dom.toolCursor.hidden = !visible;

  if (!visible) {
    dom.toolCursor.replaceChildren();
    return;
  }

  const iconPath = getActiveToolCursorIconPath();
  if (iconPath) {
    let image = dom.toolCursor.firstElementChild;
    if (!image || image.tagName !== "IMG") {
      image = document.createElement("img");
      image.alt = "";
      image.draggable = false;
      image.setAttribute("aria-hidden", "true");
      dom.toolCursor.replaceChildren(image);
    }
    if (image.getAttribute("src") !== iconPath) {
      image.setAttribute("src", iconPath);
    }
  } else {
    dom.toolCursor.replaceChildren();
  }

  dom.toolCursor.style.left = `${runtime.pointerStagePx.x}px`;
  dom.toolCursor.style.top = `${runtime.pointerStagePx.y}px`;
}

function getActiveToolCursorIconPath() {
  if (runtime.medicineModeKey) {
    return TOOL_CURSOR_ICON_PATHS.medicine;
  }
  if (runtime.feedingModeFoodKey) {
    return TOOL_CURSOR_ICON_PATHS.feed;
  }
  if (runtime.scoopMode) {
    return TOOL_CURSOR_ICON_PATHS.scoop;
  }
  if (runtime.cleaningMode) {
    return TOOL_CURSOR_ICON_PATHS.cleaning;
  }
  return "";
}

function renderScrubProgress() {
  const scrubPercent = Math.round(getScrubCoverage() * 100);
  if (dom.scrubProgressLabel) {
    const autoCompleteSeconds = runtime.cleaningMode && runtime.scrubAutoCompleteAt
      ? Math.max(0, Math.ceil((runtime.scrubAutoCompleteAt - Date.now()) / 1000))
      : 0;
    dom.scrubProgressLabel.textContent = autoCompleteSeconds
      ? `${scrubPercent}% - auto in ${autoCompleteSeconds}s`
      : `${scrubPercent}%`;
  }
  if (dom.scrubProgressBar) {
    dom.scrubProgressBar.style.width = `${scrubPercent}%`;
  }
}

function animationLoop(frameTime) {
  window.requestAnimationFrame(animationLoop);
  const rafDeltaSeconds = runtime.lastAnimationFrameAt
    ? Math.min(1, (frameTime - runtime.lastAnimationFrameAt) / 1000)
    : 0.016;
  runtime.lastAnimationFrameAt = frameTime;
  if (isWallpaperEnginePauseActive()) {
    runtime.lastAnimationUpdateAt = frameTime;
    runtime.wallpaperEngineFpsCarrySeconds = 0;
    return;
  }
  const animationFpsLimit = getEffectiveAnimationFpsLimit();
  if (animationFpsLimit > 0) {
    runtime.wallpaperEngineFpsCarrySeconds += rafDeltaSeconds;
    const fpsThreshold = 1 / animationFpsLimit;
    if (runtime.wallpaperEngineFpsCarrySeconds < fpsThreshold) {
      return;
    }
    runtime.wallpaperEngineFpsCarrySeconds = Math.max(0, runtime.wallpaperEngineFpsCarrySeconds - fpsThreshold);
  }

  const now = advanceDebugSimulationClock(Date.now());
  const deltaSeconds = runtime.lastAnimationUpdateAt
    ? Math.min(0.05, (frameTime - runtime.lastAnimationUpdateAt) / 1000)
    : 0.016;
  runtime.lastAnimationUpdateAt = frameTime;
  updateAmbienceAudioLoop();
  if (runtime.boroughOverviewOpen) {
    paintBoroughSnapshots(getAllTanks(), now);
    renderBoroughOverviewFish(now);
    return;
  }
  if (runtime.cleaningMode && runtime.scrubAutoCompleteAt && now >= runtime.scrubAutoCompleteAt) {
    if (getScrubCoverage() >= SCRUB_AUTO_COMPLETE_GRACE_THRESHOLD) {
      completeCleaning({ source: "scrub-timer" });
    } else {
      runtime.scrubAutoCompleteAt = 0;
    }
  }
  if (runtime.cleaningMode && runtime.scrubAutoCompleteAt) {
    renderScrubProgress();
  }
  updateCleaningTransition(now);
  updateSplashBursts(now);
  updateGlassTapEffects(now);
  updateFishMotion(now, deltaSeconds);
  syncDebugFishBehaviorBroadcast(now);
  updateWaterLifeEffects(now, deltaSeconds);
  renderTank(now);
  renderFishActionQueueDock(now);
  updateSelectedDecorActionButtons();
  renderCustomDecorMotionPreview(now);
  renderCustomHidePreview(now);
  renderDecorSettingsMotionPreview(now);
}
