// Source fragment: decor/placement-and-dragging.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function startPlacingDecor(decorKey) {
  if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION)) {
    setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION_DONE, {
      now: Date.now(),
      decorKey: String(decorKey || "")
    });
    saveState();
    renderUi(Date.now());
    return;
  }

  if (!state.decorInventory[decorKey]) {
    return;
  }

  if (!canUseDecorWithCurrentContentSettings(decorKey)) {
    runtime.placementMode = null;
    runtime.placementPreview = null;
    renderUi(Date.now());
    showToast("Enable Violence & Gore to place that decor.");
    return;
  }

  if (runtime.placementMode?.decorKey === decorKey) {
    runtime.placementMode = null;
    runtime.placementPreview = null;
    renderUi(Date.now());
    showToast("Placement preview cleared.");
    return;
  }

  const initialLayer = getDecorFrontLayer(decorKey, runtime.decorPlacementLayer);
  const span = getDecorLayerSpan(decorKey, initialLayer);

  runtime.editTankMode = true;
  runtime.fishEditMode = false;
  runtime.selectedFishId = null;
  runtime.selectedDecorId = null;
  runtime.selectedDecorIds = [];
  runtime.bubblerSettingsDecorId = null;
  runtime.customDecorSettingsDecorId = null;
  runtime.placementMode = {
    decorKey,
    tankLayer: initialLayer,
    scale: getDecorScaleDefault(decorKey),
    flipped: false,
    flippedY: false,
    freePlacementEnabled: isFreeDecorPlacementEnabled(getCurrentTank())
  };
  runtime.placementPreview = runtime.lastTankPoint
    ? clampDecorPlacement(runtime.lastTankPoint.x / TANK_WIDTH, runtime.lastTankPoint.y / TANK_HEIGHT, {
      decorKey,
      tankLayer: initialLayer,
      scale: runtime.placementMode.scale,
      flipped: runtime.placementMode.flipped,
      flippedY: runtime.placementMode.flippedY,
      freePlacementEnabled: runtime.placementMode.freePlacementEnabled,
      applyGravity: true
    })
    : clampDecorPlacement(0.5, 0.8, {
      decorKey,
      tankLayer: initialLayer,
      scale: runtime.placementMode.scale,
      flipped: runtime.placementMode.flipped,
      flippedY: runtime.placementMode.flippedY,
      freePlacementEnabled: runtime.placementMode.freePlacementEnabled,
      applyGravity: true
    });
  runtime.cleaningMode = false;
  runtime.scrubAutoCompleteAt = 0;
  runtime.dragState = null;
  runtime.decorResizeState = null;
  runtime.fishDragState = null;
  runtime.eggDragState = null;
  runtime.activeTab = "decor";
  runtime.sidebarCollapsed = true;
  const now = Date.now();
  if (isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION)) {
    setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION, {
      now,
      decorKey
    });
    saveState();
  }
  renderUi(now);

  showToast(
    isBubblerDecorKey(decorKey)
      ? `Move over the tank to preview it, then click to place. Z/X or Up/Down changes layer (${initialLayer}/5).`
      : isCaveDecorKey(decorKey)
        ? `Move over the tank to preview it, then click to place. Z/X or Up/Down changes cave range (${span.label}).`
        : `Move over the tank to preview it, then click to place. Z/X or Up/Down changes layer (${initialLayer}/5).`
  );
}

function createPlacedDecor(decorKey, xNorm, yNorm, tankLayer = runtime.placementMode?.tankLayer ?? runtime.decorPlacementLayer) {
  if (!state.decorInventory[decorKey]) {
    return null;
  }

  if (!canUseDecorWithCurrentContentSettings(decorKey)) {
    return null;
  }

  if (!canDecorLiveInCurrentTank(decorKey)) {
    return null;
  }

  const decor = runtime.decorMap.get(decorKey);
  const scaleBase = clamp(Number(runtime.placementMode?.scale) || getDecorScaleDefault(decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  const flipped = Boolean(runtime.placementMode?.flipped);
  const flippedY = Boolean(runtime.placementMode?.flippedY);
  const freePlacementEnabled = runtime.placementMode?.freePlacementEnabled === true;
  const finalLayer = getDecorFrontLayer(decorKey, tankLayer);
  const placement = clampDecorPlacement(xNorm, yNorm, {
    decorKey,
    tankLayer: finalLayer,
    scale: scaleBase,
    flipped,
    flippedY,
    freePlacementEnabled,
    applyGravity: true
  });

  state.decorInventory[decorKey] -= 1;
  if (state.decorInventory[decorKey] <= 0) {
    delete state.decorInventory[decorKey];
  }

  const placedItem = {
    id: createId("placed"),
    decorKey,
    xNorm: placement.xNorm,
    yNorm: placement.yNorm,
    scale: scaleBase,
    tankLayer: finalLayer,
    flipped,
    flippedY,
    freePlacementEnabled
  };
  if (isCustomBubblerDecorKey(decorKey)) {
    placedItem.bubblerSettings = createDefaultBubblerSettings();
  }
  if (isCaveDecorKey(decorKey)) {
    placedItem.caveSettings = getDecorDefaultCaveSettings(decorKey);
    const defaultCaveColorSettings = getDecorDefaultCaveColorSettings(decorKey);
    if (defaultCaveColorSettings) {
      placedItem.caveColorSettings = defaultCaveColorSettings;
    }
  }
  updatePlacedDecorResizeAnchor(placedItem);

  state.placedDecor.push(placedItem);
  applyDecorGravelInsertion(placedItem);
  return { decor, placedItem };
}

function placeDecorAtPoint(xNorm, yNorm) {
  if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION)) {
    setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION_DONE, { now: Date.now() });
    saveState();
    renderUi(Date.now());
    return;
  }

  const placement = runtime.placementMode;
  if (!placement) {
    return;
  }

  if (!state.decorInventory[placement.decorKey]) {
    runtime.placementMode = null;
    runtime.placementPreview = null;
    renderUi(Date.now());
    return;
  }

  const created = createPlacedDecor(placement.decorKey, xNorm, yNorm, placement.tankLayer);
  if (!created) {
    runtime.placementMode = null;
    runtime.placementPreview = null;
    renderUi(Date.now());
    return;
  }

  runtime.placementMode = null;
  runtime.placementPreview = null;
  setSelectedDecor(created.placedItem.id);
  runtime.suppressNextTankClick = true;
  const now = Date.now();
  pushEvent(`Placed ${created.decor?.name || titleFromFile(created.placedItem.decorKey)} in the aquarium.`, now, getCurrentTank(), {
    type: "decor",
    decorKey: created.placedItem.decorKey,
    placedDecorId: created.placedItem.id
  });
  if (isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION)) {
    setTutorialStage(TUTORIAL_STAGE_PLACE_DECORATION_DONE, {
      now,
      placedDecorId: created.placedItem.id
    });
  }
  saveState();
  renderUi(now);
  showToast(`${created.decor?.name || "Decor"} placed.`);
}

function isDecorLayerShortcutEndpoint(decorKey, layer, step) {
  if (isCaveDecorKey(decorKey)) {
    return false;
  }

  const currentLayer = clampTankLayer(layer);
  return step > 0
    ? currentLayer >= TANK_DEPTH_LAYERS
    : currentLayer <= 1;
}

function canStepPlacedDecorLayer(item, direction) {
  const step = Math.sign(Number(direction) || 0);
  if (!item || !step) {
    return false;
  }

  const currentLayer = getDecorFrontLayer(item.decorKey, item.tankLayer ?? DEFAULT_TANK_LAYER);
  return getDecorFrontLayer(item.decorKey, currentLayer + step) !== currentLayer;
}

function triggerLayerLimitPulse(layer) {
  const now = Date.now();
  runtime.layerLimitPulseLayer = clampTankLayer(layer);
  runtime.layerLimitPulseStartedAt = now;
  runtime.layerLimitPulseUntil = now + LAYER_LIMIT_PULSE_MS;
  renderUi(now, { full: false });
}

function syncDecorDragLayerState(primaryItem = null) {
  if (!runtime.dragState) {
    return;
  }

  let primaryLayer = primaryItem ? getDecorTankLayer(primaryItem) : null;
  if (Array.isArray(runtime.dragState.items)) {
    for (const dragItem of runtime.dragState.items) {
      const placed = getPlacedDecorById(dragItem.id);
      if (!placed) {
        continue;
      }
      dragItem.tankLayer = getDecorTankLayer(placed);
      if (placed.id === runtime.dragState.placedId) {
        primaryLayer = dragItem.tankLayer;
      }
    }
  }

  if (primaryLayer === null) {
    const placed = getPlacedDecorById(runtime.dragState.placedId);
    primaryLayer = placed ? getDecorTankLayer(placed) : null;
  }

  if (primaryLayer !== null) {
    runtime.dragState.tankLayer = primaryLayer;
  }
}

function getDecorGroupTransformItems(item) {
  const groupId = normalizeDecorGroupId(item?.groupId);
  return groupId ? getDecorGroupMembers(groupId) : [];
}

function getDecorItemsCenter(items) {
  const validItems = (items || []).filter(Boolean);
  if (!validItems.length) {
    return { xNorm: 0.5, yNorm: 0.5 };
  }

  return {
    xNorm: validItems.reduce((total, item) => total + item.xNorm, 0) / validItems.length,
    yNorm: validItems.reduce((total, item) => total + item.yNorm, 0) / validItems.length
  };
}

function stepDecorGroupLayer(item, step, save = false) {
  const groupItems = getDecorGroupTransformItems(item);
  if (groupItems.length <= 1) {
    return null;
  }

  let changed = false;
  let nextLayer = getDecorTankLayer(item);
  for (const groupItem of groupItems) {
    const currentLayer = getDecorFrontLayer(groupItem.decorKey, groupItem.tankLayer ?? DEFAULT_TANK_LAYER);
    const itemLayer = getDecorFrontLayer(groupItem.decorKey, currentLayer + step);
    groupItem.tankLayer = currentLayer;
    if (itemLayer === currentLayer) {
      continue;
    }
    groupItem.tankLayer = itemLayer;
    const placement = clampDecorPlacement(groupItem.xNorm, groupItem.yNorm, { item: groupItem, applyGravity: true });
    groupItem.xNorm = placement.xNorm;
    groupItem.yNorm = placement.yNorm;
    updatePlacedDecorResizeAnchor(groupItem);
    nextLayer = itemLayer;
    changed = true;
  }

  if (changed) {
    runtime.decorPlacementLayer = nextLayer;
    if (save) {
      saveState();
    }
    renderUi(Date.now());
  }

  return {
    changed,
    layer: nextLayer,
    atLimit: !changed && isDecorLayerShortcutEndpoint(item.decorKey, getDecorTankLayer(item), step)
  };
}

function stepDecorGroupScale(item, step, save = false) {
  const groupItems = getDecorGroupTransformItems(item);
  if (groupItems.length <= 1) {
    return null;
  }

  const currentScale = Number(item.scale) || getDecorScaleDefault(item.decorKey);
  const nextScale = clamp(currentScale + step * SIZE_STEP, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  if (nextScale === currentScale) {
    return null;
  }

  const factor = nextScale / Math.max(0.0001, currentScale);
  const center = getDecorItemsCenter(groupItems);
  for (const groupItem of groupItems) {
    groupItem.scale = clamp((Number(groupItem.scale) || getDecorScaleDefault(groupItem.decorKey)) * factor, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
    groupItem.xNorm = center.xNorm + (groupItem.xNorm - center.xNorm) * factor;
    groupItem.yNorm = center.yNorm + (groupItem.yNorm - center.yNorm) * factor;
    const placement = clampDecorPlacement(groupItem.xNorm, groupItem.yNorm, { item: groupItem, applyGravity: true });
    groupItem.xNorm = placement.xNorm;
    groupItem.yNorm = placement.yNorm;
    updatePlacedDecorResizeAnchor(groupItem);
  }

  if (save) {
    saveState();
  }
  renderUi(Date.now(), { full: false });
  return nextScale;
}

function toggleDecorGroupFlip(item, save = false, axis = "horizontal") {
  const groupItems = getDecorGroupTransformItems(item);
  if (groupItems.length <= 1) {
    return null;
  }

  const center = getDecorItemsCenter(groupItems);
  const vertical = axis === "vertical";
  for (const groupItem of groupItems) {
    if (vertical) {
      groupItem.yNorm = center.yNorm - (groupItem.yNorm - center.yNorm);
      groupItem.flippedY = !Boolean(groupItem.flippedY);
    } else {
      groupItem.xNorm = center.xNorm - (groupItem.xNorm - center.xNorm);
      groupItem.flipped = !Boolean(groupItem.flipped);
    }
    const placement = clampDecorPlacement(groupItem.xNorm, groupItem.yNorm, { item: groupItem, applyGravity: true });
    groupItem.xNorm = placement.xNorm;
    groupItem.yNorm = placement.yNorm;
    updatePlacedDecorResizeAnchor(groupItem);
  }

  if (save) {
    saveState();
  }
  renderUi(Date.now());
  return true;
}

function stepActiveDecorLayer(direction) {
  const step = Math.sign(Number(direction) || 0);
  if (!step) {
    return { changed: false, layer: runtime.decorPlacementLayer, atLimit: false };
  }

  const activeTarget = getActiveDecorShortcutTarget();
  if (!activeTarget) {
    return { changed: false, layer: runtime.decorPlacementLayer, atLimit: false };
  }

  let changed = false;
  let nextLayer = runtime.decorPlacementLayer;
  let currentLayer = null;
  let decorKey = activeTarget.decorKey || "";
  let shouldSave = false;

  if (activeTarget.mode === "placement") {
    decorKey = runtime.placementMode.decorKey;
    currentLayer = getDecorFrontLayer(decorKey, runtime.placementMode.tankLayer ?? runtime.decorPlacementLayer);
    const placementLayer = getDecorFrontLayer(decorKey, currentLayer + step);
    runtime.placementMode.tankLayer = currentLayer;
    if (placementLayer !== currentLayer) {
      runtime.placementMode.tankLayer = placementLayer;
      if (runtime.placementPreview) {
        runtime.placementPreview = clampDecorPlacement(runtime.placementPreview.xNorm, runtime.placementPreview.yNorm, {
          decorKey,
          tankLayer: placementLayer,
          scale: runtime.placementMode.scale,
          flipped: runtime.placementMode.flipped,
          flippedY: runtime.placementMode.flippedY,
          applyGravity: true
        });
      }
      nextLayer = placementLayer;
      changed = true;
    }
  } else if (activeTarget.mode === "drag") {
    const item = activeTarget.item;
    if (item) {
      const groupResult = stepDecorGroupLayer(item, step, false);
      if (groupResult) {
        syncDecorDragLayerState(item);
        if (groupResult.changed) {
          renderUi(Date.now(), { full: false });
        }
        return groupResult;
      }
      decorKey = item.decorKey;
      currentLayer = getDecorFrontLayer(item.decorKey, runtime.dragState.tankLayer ?? item.tankLayer ?? DEFAULT_TANK_LAYER);
      const itemLayer = getDecorFrontLayer(item.decorKey, currentLayer + step);
      runtime.dragState.tankLayer = currentLayer;
      item.tankLayer = currentLayer;
      if (itemLayer !== currentLayer) {
        runtime.dragState.tankLayer = itemLayer;
        item.tankLayer = itemLayer;
        const placement = clampDecorPlacement(item.xNorm, item.yNorm, { item, applyGravity: true });
        item.xNorm = placement.xNorm;
        item.yNorm = placement.yNorm;
        updatePlacedDecorResizeAnchor(item);
        nextLayer = itemLayer;
        changed = true;
      }
      syncDecorDragLayerState(item);
    }
  } else {
    const item = activeTarget.item;
    if (item) {
      const groupResult = stepDecorGroupLayer(item, step, true);
      if (groupResult) {
        return groupResult;
      }
      decorKey = item.decorKey;
      currentLayer = getDecorFrontLayer(item.decorKey, item.tankLayer ?? DEFAULT_TANK_LAYER);
      const itemLayer = getDecorFrontLayer(item.decorKey, currentLayer + step);
      item.tankLayer = currentLayer;
      if (itemLayer !== currentLayer) {
        item.tankLayer = itemLayer;
        const placement = clampDecorPlacement(item.xNorm, item.yNorm, { item, applyGravity: true });
        item.xNorm = placement.xNorm;
        item.yNorm = placement.yNorm;
        updatePlacedDecorResizeAnchor(item);
        nextLayer = itemLayer;
        changed = true;
        shouldSave = true;
      }
    }
  }

  if (!changed) {
    const resolvedLayer = currentLayer === null ? clampTankLayer(runtime.decorPlacementLayer) : currentLayer;
    runtime.decorPlacementLayer = resolvedLayer;
    return {
      changed: false,
      layer: resolvedLayer,
      atLimit: isDecorLayerShortcutEndpoint(decorKey, resolvedLayer, step)
    };
  }

  runtime.decorPlacementLayer = nextLayer;
  if (shouldSave) {
    saveState();
  }
  renderUi(Date.now());
  return { changed: true, layer: nextLayer, atLimit: false };
}

function stepActiveDecorScale(direction) {
  const step = Number(direction) || 0;
  if (!step) {
    return null;
  }

  const activeTarget = getActiveDecorShortcutTarget();
  if (!activeTarget) {
    return null;
  }

  let changed = false;
  let nextScale = null;
  let shouldSave = false;

  if (activeTarget.mode === "placement") {
    const decorKey = runtime.placementMode.decorKey;
    const currentScale = Number(runtime.placementMode.scale) || getDecorScaleDefault(decorKey);
    const placementScale = clamp(currentScale + step * SIZE_STEP, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
    if (placementScale !== currentScale) {
      runtime.placementMode.scale = placementScale;
      if (runtime.placementPreview) {
        runtime.placementPreview = clampDecorPlacement(runtime.placementPreview.xNorm, runtime.placementPreview.yNorm, {
          decorKey,
          tankLayer: runtime.placementMode.tankLayer,
          scale: placementScale,
          flipped: runtime.placementMode.flipped,
          flippedY: runtime.placementMode.flippedY,
          applyGravity: true
        });
      }
      nextScale = placementScale;
      changed = true;
    }
  } else {
    const item = activeTarget.item;
    if (item) {
      const groupScale = stepDecorGroupScale(item, step, activeTarget.mode === "selected");
      if (groupScale !== null) {
        return groupScale;
      }
      const currentScale = Number(item.scale) || getDecorScaleDefault(item.decorKey);
      const itemScale = clamp(currentScale + step * SIZE_STEP, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
      if (itemScale !== currentScale) {
        item.scale = itemScale;
        const placement = clampDecorPlacement(item.xNorm, item.yNorm, {
          item,
          applyGravity: true
        });
        item.xNorm = placement.xNorm;
        item.yNorm = placement.yNorm;
        updatePlacedDecorResizeAnchor(item);
        nextScale = itemScale;
        changed = true;
        shouldSave = activeTarget.mode === "selected";
      }
    }
  }

  if (!changed) {
    return null;
  }

  if (shouldSave) {
    saveState();
  }
  renderUi(Date.now(), { full: false });
  return nextScale;
}

function toggleActiveDecorFlip(axis = "horizontal") {
  const activeTarget = getActiveDecorShortcutTarget();
  if (!activeTarget) {
    return null;
  }

  const vertical = axis === "vertical";
  const property = vertical ? "flippedY" : "flipped";

  if (activeTarget.mode === "placement") {
    runtime.placementMode[property] = !Boolean(runtime.placementMode[property]);
    if (runtime.placementPreview) {
      runtime.placementPreview = clampDecorPlacement(runtime.placementPreview.xNorm, runtime.placementPreview.yNorm, {
        decorKey: runtime.placementMode.decorKey,
        tankLayer: runtime.placementMode.tankLayer,
        scale: runtime.placementMode.scale,
        flipped: runtime.placementMode.flipped,
        flippedY: runtime.placementMode.flippedY,
        applyGravity: true
      });
    }
    renderUi(Date.now());
    return runtime.placementMode[property];
  }

  const item = activeTarget.item;
  if (!item) {
    if (activeTarget.mode === "drag") {
      runtime.dragState = null;
      renderUi(Date.now());
    }
    return null;
  }

  const groupFlip = toggleDecorGroupFlip(item, activeTarget.mode === "selected", axis);
  if (groupFlip !== null) {
    return groupFlip;
  }

  item[property] = !Boolean(item[property]);
  const placement = clampDecorPlacement(item.xNorm, item.yNorm, { item, applyGravity: true });
  item.xNorm = placement.xNorm;
  item.yNorm = placement.yNorm;
  updatePlacedDecorResizeAnchor(item);
  if (activeTarget.mode === "selected") {
    saveState();
  }
  renderUi(Date.now());
  return item[property];
}

function performDecorEditShortcutAction(action) {
  if (!runtime.editTankMode || !getActiveDecorShortcutTarget()) {
    return false;
  }

  if (action === "scale-up" || action === "scale-down") {
    const nextScale = stepActiveDecorScale(action === "scale-up" ? 1 : -1);
    if (nextScale !== null) {
      showToast(
        isTutorialDecorDoneStep()
          ? getTutorialDecorDoneToastText(`Decor size ${formatDecorScale(nextScale)}.`)
          : `Decor size ${formatDecorScale(nextScale)}.`,
        {
          durationMs: isTutorialDecorDoneStep() ? 120000 : undefined,
          key: isTutorialDecorDoneStep() ? TUTORIAL_TOAST_DECOR_DONE : ""
        }
      );
      return true;
    }
    return false;
  }

  if (action === "layer-up" || action === "layer-down") {
    const result = stepActiveDecorLayer(action === "layer-up" ? 1 : -1);
    if (result.changed) {
      showToast(
        isTutorialDecorDoneStep()
          ? getTutorialDecorDoneToastText(`Layer ${result.layer} of ${TANK_DEPTH_LAYERS}.`)
          : `Layer ${result.layer} of ${TANK_DEPTH_LAYERS}.`,
        {
          durationMs: isTutorialDecorDoneStep() ? 120000 : undefined,
          key: isTutorialDecorDoneStep() ? TUTORIAL_TOAST_DECOR_DONE : ""
        }
      );
      return true;
    }
    if (result.atLimit) {
      triggerLayerLimitPulse(result.layer);
    }
    return false;
  }

  return false;
}

function stepDraggedSuckerFishLayer(direction) {
  const drag = runtime.fishDragState;
  if (!drag) {
    return false;
  }

  const fish = state.fish.find((entry) => entry.id === drag.fishId);
  const species = getSpeciesForFish(fish);
  if (!fish || isFishDead(fish) || getEffectiveFishBehavior(fish, species) !== "sucker") {
    return false;
  }

  const nextLayer = getSuckerFishLayerForShortcut(direction);
  if (getSuckerFishGlassLayer(fish) === nextLayer) {
    triggerLayerLimitPulse(nextLayer);
    return true;
  }

  setFishTankLayers(fish, nextLayer, nextLayer);
  fish.targetXNorm = fish.xNorm;
  fish.targetYNorm = fish.yNorm;
  fish.targetAt = Date.now() + 1200;
  fish.hangoutDecorId = null;
  drag.moved = true;
  runtime.suppressNextTankClick = true;
  triggerLayerLimitPulse(nextLayer);
  renderUi(Date.now());
  return true;
}

function getPlacementHintState() {
  if (runtime.cleaningMode) {
    return {
      owner: "hint:cleaning",
      text: `Move the sponge around until ${getRequiredScrubPercent()}% of the glass is clear to clean the tank.`
    };
  }

  if (runtime.scoopMode) {
    return {
      owner: "hint:scoop",
      text: "Click or drag across fish, food, or waste to scoop it out. (Fish -> Storage | Waste/Food -> Trash)"
    };
  }

  if (shouldShowDecorSwimGuide()) {
    return {
      owner: "hint:decor-layer",
      text: "*Current layer bottom boundary. Higher layers stop closer to the gravel edge."
    };
  }

  if (runtime.editTankMode) {
    return {
      owner: "",
      text: ""
    };
  }

  if (runtime.dragState) {
    return {
      owner: "hint:decor-drag",
      text: !isCaveDecorKey(runtime.dragState.decorKey)
        ? "Press [z]/[x] or [up]/[down] to change layer."
        : ""
    };
  }

  if (runtime.fishDragState) {
    return {
      owner: "hint:fish-drag",
      text: "Drag the fish anywhere inside the tank, then release to let it swim again."
    };
  }

  return {
    owner: "",
    text: ""
  };
}

function clearGuidance(options = {}) {
  const surface = String(options.surface || "").trim();
  const owner = typeof options.owner === "string" ? options.owner : "";
  if (!surface || surface === "toast") {
    if (!owner || runtime.guidanceToastOwner === owner) {
      hideToast({ key: options.key });
      runtime.guidanceToastOwner = "";
    }
  }
  if (!surface || surface === "hint") {
    if (!owner || runtime.guidanceHintOwner === owner) {
      runtime.guidanceHintOwner = "";
      if (dom.placementHint) {
        dom.placementHint.textContent = "";
        dom.placementHint.style.opacity = "0";
        dom.placementHint.style.visibility = "hidden";
      }
      if (dom.placementHint?.parentElement) {
        dom.placementHint.parentElement.hidden = true;
      }
    }
  }
}

function clearGuidanceForModeChange(reason = "") {
  runtime.guidanceHintOwner = "";
  if (runtime.guidanceToastOwner.startsWith("hint:")) {
    clearGuidance({
      surface: "toast",
      owner: runtime.guidanceToastOwner
    });
  }
  if (reason && runtime.guidanceToastOwner.startsWith("tutorial:") && !isTutorialDecorDoneStep()) {
    clearGuidance({
      surface: "toast",
      owner: runtime.guidanceToastOwner,
      key: TUTORIAL_TOAST_DECOR_DONE
    });
  }
}

function reconcileGuidanceState() {
  if (runtime.guidanceToastOwner === "tutorial:decor-done" && !isTutorialDecorDoneStep()) {
    clearGuidance({
      surface: "toast",
      owner: "tutorial:decor-done",
      key: TUTORIAL_TOAST_DECOR_DONE
    });
  }

  const popup = getTutorialPopupConfig?.();
  const suppressHint = runtime.utilityOverlayOpen || Boolean(popup?.blockInteraction);
  if (suppressHint) {
    clearGuidance({ surface: "hint" });
    if (runtime.guidanceToastOwner.startsWith("hint:")) {
      clearGuidance({
        surface: "toast",
        owner: runtime.guidanceToastOwner
      });
    }
  }
}

function renderPlacementHint() {
  const hintState = getPlacementHintState();
  const popup = getTutorialPopupConfig?.();
  const hintText = runtime.utilityOverlayOpen || Boolean(popup?.blockInteraction)
    ? ""
    : hintState.text;
  const hintContainer = dom.placementHint?.parentElement;
  if (dom.placementHint) {
    dom.placementHint.textContent = "";
    dom.placementHint.style.opacity = "0";
    dom.placementHint.style.visibility = "hidden";
  }
  if (hintContainer) {
    hintContainer.hidden = true;
  }
  runtime.guidanceHintOwner = "";

  if (!hintText) {
    if (runtime.guidanceToastOwner.startsWith("hint:")) {
      clearGuidance({
        surface: "toast",
        owner: runtime.guidanceToastOwner
      });
    }
    return;
  }

  if (
    runtime.guidanceToastOwner !== hintState.owner
    || dom.toast?.textContent !== hintText
    || !dom.toast?.classList.contains("is-visible")
  ) {
    showGuidanceToast(hintState.owner, hintText, { durationMs: 120000 });
  } else {
    positionToast();
  }
}

function buildEditQuickRefRowMarkup(key, description) {
  return `
    <div class="edit-quick-ref-row">
      <span class="edit-quick-ref-key">${key}</span>
      <span class="edit-quick-ref-copy">${description}</span>
    </div>
  `;
}

function getEditQuickRefItems() {
  if (runtime.fishEditMode) {
    return [
      { key: "Drag Fish", description: "Reposition in tank" },
      { key: "Store Button", description: "Move to storage" }
    ];
  }

  const selectedItems = runtime.editTankMode ? getSelectedPlacedDecorItems() : [];
  const selectionCount = selectedItems.length;
  const groupedSelectionCount = getDecorGroupIdsForItems(selectedItems).length;
  const activeDecorTarget = getActiveDecorShortcutTarget();
  const hasSingleTarget = Boolean(activeDecorTarget && selectionCount <= 1);
  const items = [];

  if (runtime.placementMode) {
    items.push(
      { key: "Click", description: "Place decor" },
      { key: "Right Click", description: "Cancel placement" },
      { key: "[Z]/[X] or [Up]/[Down]", description: "Change layer" },
      { key: "[-]/[+]", description: "Change size" },
      { key: "[F]", description: "Flip decor" }
    );
    return items;
  }

  if (runtime.dragState) {
    items.push({ key: "Drag", description: "Reposition selected decor" });
  } else if (runtime.decorResizeState) {
    items.push({ key: "Drag Corner", description: "Resize selected decor" });
  } else if (selectionCount > 1) {
    items.push({ key: "Drag", description: "Move selected decor" });
  } else if (hasSingleTarget) {
    items.push({ key: "Drag", description: "Reposition decor" });
  } else {
    items.push(
      { key: "Click Decor", description: "Select to edit" },
      { key: "Shift/Ctrl Click", description: "Select multiple decor" }
    );
    return items;
  }

  items.push(
    { key: "[Z]/[X] or [Up]/[Down]", description: "Change layer" },
    { key: "[-]/[+]", description: "Change size" }
  );

  if (hasSingleTarget) {
    items.push({ key: "[F]", description: "Flip decor" });
    if (activeDecorTarget?.item && canOpenDecorSettings(activeDecorTarget)) {
      items.push({ key: "[S]", description: "Open decor settings" });
    }
  }

  items.push({ key: "Shift/Ctrl Click", description: "Adjust selection" });

  if (selectionCount > 1) {
    items.push({
      key: "[G]",
      description: groupedSelectionCount ? "Add selected decor to group" : "Group selected decor"
    });
  }

  if (groupedSelectionCount) {
    items.push({ key: "[U]", description: "Ungroup selected decor" });
  }

  if (hasSingleTarget) {
    items.push({ key: "Store Button", description: "Move to storage" });
  }

  return items;
}

function updateEditQuickRefLayout() {
  if (!dom.editQuickRef || dom.editQuickRef.hidden) {
    return;
  }

  dom.editQuickRef.classList.remove("is-compact");
  dom.editQuickRef.style.removeProperty("--edit-quick-ref-right");
  dom.editQuickRef.style.removeProperty("--edit-quick-ref-max-width");

  const stageRect = dom.tankStage?.getBoundingClientRect?.();
  if (!stageRect?.width || !stageRect?.height) {
    return;
  }

  const computedStyle = window.getComputedStyle(dom.editQuickRef);
  const baseRight = Number.parseFloat(computedStyle.right) || 24;
  const stageWidth = Math.max(0, stageRect.width);
  let rightOffset = baseRight;
  let maxWidth = Math.max(200, Math.floor(stageWidth - baseRight - 20));

  const toolbar = dom.tankBottomDock;
  const toolbarPosition = toolbar?.dataset?.toolbarPosition
    || document.documentElement?.dataset?.toolbarPosition
    || getUiSettings()?.toolbarPosition;

  if (
    toolbar
    && toolbarPosition === "right-center"
    && !toolbar.classList.contains("is-toolbar-collapsed")
    && !toolbar.classList.contains("is-tutorial-hidden")
    && toolbar.getAttribute("aria-expanded") !== "false"
  ) {
    const toolbarRect = toolbar.getBoundingClientRect?.();
    if (
      toolbarRect?.width
      && toolbarRect?.height
      && toolbarRect.right > stageRect.left
      && toolbarRect.left < stageRect.right
    ) {
      const toolbarGap = 14;
      rightOffset = Math.max(
        baseRight,
        Math.round(stageRect.right - toolbarRect.left + toolbarGap)
      );
      maxWidth = Math.max(
        176,
        Math.floor(toolbarRect.left - stageRect.left - 20)
      );
    }
  }

  dom.editQuickRef.style.setProperty("--edit-quick-ref-right", `${rightOffset}px`);
  dom.editQuickRef.style.setProperty("--edit-quick-ref-max-width", `${maxWidth}px`);
  dom.editQuickRef.classList.toggle("is-compact", maxWidth < 260);
}

function renderEditQuickRef() {
  if (!dom.editQuickRef) {
    return;
  }

  const visible = runtime.editTankMode || runtime.fishEditMode;
  dom.editQuickRef.hidden = !visible;
  if (!visible || !dom.editQuickRefCard) {
    dom.editQuickRef.classList.remove("is-compact");
    dom.editQuickRef.style.removeProperty("--edit-quick-ref-right");
    dom.editQuickRef.style.removeProperty("--edit-quick-ref-max-width");
    return;
  }

  const markup = getEditQuickRefItems()
    .map((item) => buildEditQuickRefRowMarkup(item.key, item.description))
    .join("");
  setMarkupIfChanged("edit-quick-ref", dom.editQuickRefCard, markup);
  updateEditQuickRefLayout();
}

function normalizeDecorResizeCorner(value) {
  const corner = String(value || "").toLowerCase();
  return ["nw", "ne", "sw", "se"].includes(corner) ? corner : "";
}

function snapDecorScaleToStep(value) {
  const snapped = Math.round((Number(value) || DEFAULT_DECOR_SCALE) / SIZE_STEP) * SIZE_STEP;
  return clamp(Number(snapped.toFixed(2)), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
}

function beginDecorCornerResize(item, corner, point, pointerId) {
  const resizeCorner = normalizeDecorResizeCorner(corner);
  const bounds = getPlacedDecorOpaqueBounds(item) || getPlacedDecorBounds(item);
  if (!item || !resizeCorner || !point || !bounds) {
    return;
  }

  const width = Math.max(1, bounds.right - bounds.left);
  const height = Math.max(1, bounds.bottom - bounds.top);
  const anchorX = item.xNorm * TANK_WIDTH;
  const anchorY = item.yNorm * TANK_HEIGHT;
  const west = resizeCorner.includes("w");
  const north = resizeCorner.includes("n");
  runtime.pointerDown = true;
  runtime.suppressNextTankClick = true;
  setSelectedDecor(item.id);
  runtime.decorResizeState = {
    placedId: item.id,
    corner: resizeCorner,
    pointerId: Number.isInteger(pointerId) ? pointerId : null,
    startScale: clamp(Number(item.scale) || getDecorScaleDefault(item.decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX),
    startBounds: { ...bounds },
    startWidth: width,
    startHeight: height,
    oppositeX: west ? bounds.right : bounds.left,
    oppositeY: north ? bounds.bottom : bounds.top,
    anchorUnitX: clamp((anchorX - bounds.left) / width, -2, 2),
    anchorUnitY: clamp((anchorY - bounds.top) / height, -2, 2),
    decorName: runtime.decorMap.get(item.decorKey)?.name || titleFromFile(item.decorKey),
    currentScale: clamp(Number(item.scale) || getDecorScaleDefault(item.decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX)
  };

  try {
    dom.tankStage.setPointerCapture(pointerId);
    rememberTankPointerCapture(pointerId);
  } catch (error) {
    console.debug("Pointer capture skipped.", error);
  }

  updateDecorCornerResize(point);
  renderUi(Date.now(), { full: false });
}

function updateDecorCornerResize(point) {
  const resize = runtime.decorResizeState;
  if (!resize || !point) {
    return;
  }

  const item = getPlacedDecorById(resize.placedId);
  if (!item) {
    runtime.decorResizeState = null;
    renderUi(Date.now(), { full: false });
    return;
  }

  const east = resize.corner.includes("e");
  const south = resize.corner.includes("s");
  const rawWidth = east ? point.x - resize.oppositeX : resize.oppositeX - point.x;
  const rawHeight = south ? point.y - resize.oppositeY : resize.oppositeY - point.y;
  const widthRatio = rawWidth / Math.max(1, resize.startWidth);
  const heightRatio = rawHeight / Math.max(1, resize.startHeight);
  const scaleRatio = Math.max(widthRatio, heightRatio, DECOR_SCALE_MIN / Math.max(0.01, resize.startScale));
  const nextScale = snapDecorScaleToStep(resize.startScale * scaleRatio);
  const appliedRatio = nextScale / Math.max(0.01, resize.startScale);
  const nextWidth = resize.startWidth * appliedRatio;
  const nextHeight = resize.startHeight * appliedRatio;
  const nextLeft = east ? resize.oppositeX : resize.oppositeX - nextWidth;
  const nextTop = south ? resize.oppositeY : resize.oppositeY - nextHeight;
  const nextAnchorX = nextLeft + resize.anchorUnitX * nextWidth;
  const nextAnchorY = nextTop + resize.anchorUnitY * nextHeight;

  item.scale = nextScale;
  const placement = clampDecorPlacement(nextAnchorX / TANK_WIDTH, nextAnchorY / TANK_HEIGHT, { item, applyGravity: true });
  item.xNorm = placement.xNorm;
  item.yNorm = placement.yNorm;
  resize.currentScale = nextScale;
  updatePlacedDecorResizeAnchor(item);
  renderPlacementHint();
  renderUi(Date.now(), { full: false });
}

function finalizeDecorCornerResize() {
  const resize = runtime.decorResizeState;
  if (!resize) {
    return;
  }

  const item = getPlacedDecorById(resize.placedId);
  runtime.decorResizeState = null;
  const now = Date.now();
  if (item) {
    applyDecorGravelInsertion(item);
    updatePlacedDecorResizeAnchor(item);
    showToast(`${resize.decorName || "Decor"} size ${formatDecorScale(item.scale)}.`);
  }
  saveState();
  renderUi(now);
}

function beginDecorDrag(item, point, pointerId, options = {}) {
  runtime.pointerDown = true;
  runtime.suppressNextTankClick = true;
  setSelectedDecor(item.id);
  const dragItems = normalizeDecorGroupId(item.groupId)
    ? getDecorGroupMembers(item.groupId)
    : [item];
  runtime.dragState = {
    placedId: item.id,
    startPointerXNorm: point.x / TANK_WIDTH,
    startPointerYNorm: point.y / TANK_HEIGHT,
    offsetXNorm: item.xNorm - point.x / TANK_WIDTH,
    offsetYNorm: item.yNorm - point.y / TANK_HEIGHT,
    items: dragItems.map((entry) => ({
      id: entry.id,
      startXNorm: entry.xNorm,
      startYNorm: entry.yNorm,
      offsetXNorm: entry.xNorm - point.x / TANK_WIDTH,
      offsetYNorm: entry.yNorm - point.y / TANK_HEIGHT,
      tankLayer: getDecorTankLayer(entry)
    })),
    isNewPlacement: Boolean(options.isNewPlacement),
    tankLayer: getDecorTankLayer(item),
    decorName: options.decorName || runtime.decorMap.get(item.decorKey)?.name || titleFromFile(item.decorKey),
    decorKey: item.decorKey
  };

  try {
    dom.tankStage.setPointerCapture(pointerId);
    rememberTankPointerCapture(pointerId);
  } catch (error) {
    console.debug("Pointer capture skipped.", error);
  }

  updateDraggedDecor(point);
  renderPlacementHint();
  renderUi(Date.now());
}

function clampSharedDecorDragDelta(valuePx, minPx, maxPx) {
  if (!Number.isFinite(minPx) || !Number.isFinite(maxPx)) {
    return Number.isFinite(Number(valuePx)) ? Number(valuePx) : 0;
  }
  if (minPx <= maxPx) {
    return clamp(valuePx, minPx, maxPx);
  }
  return clamp(valuePx, maxPx, minPx);
}

function getDraggedDecorStartNorm(dragItem, item, axis) {
  const key = axis === "x" ? "startXNorm" : "startYNorm";
  const offsetKey = axis === "x" ? "offsetXNorm" : "offsetYNorm";
  const fallback = axis === "x" ? item?.xNorm : item?.yNorm;
  if (Number.isFinite(Number(dragItem?.[key]))) {
    return Number(dragItem[key]);
  }
  if (Number.isFinite(Number(dragItem?.[offsetKey]))) {
    const pointerStart = axis === "x"
      ? runtime.dragState?.startPointerXNorm
      : runtime.dragState?.startPointerYNorm;
    if (Number.isFinite(Number(pointerStart))) {
      return Number(pointerStart) + Number(dragItem[offsetKey]);
    }
  }
  return Number.isFinite(Number(fallback)) ? Number(fallback) : 0.5;
}

function updateDraggedDecorGroup(drag, dragItems, pointerXNorm, pointerYNorm) {
  const records = dragItems
    .map((dragItem) => {
      const item = getPlacedDecorById(dragItem.id);
      return item ? { dragItem, item } : null;
    })
    .filter(Boolean);
  if (!records.length) {
    return;
  }

  const startPointerXNorm = Number.isFinite(Number(drag.startPointerXNorm))
    ? Number(drag.startPointerXNorm)
    : pointerXNorm;
  const startPointerYNorm = Number.isFinite(Number(drag.startPointerYNorm))
    ? Number(drag.startPointerYNorm)
    : pointerYNorm;
  const rawDeltaX = (pointerXNorm - startPointerXNorm) * TANK_WIDTH;
  const rawDeltaY = (pointerYNorm - startPointerYNorm) * TANK_HEIGHT;
  const constraintRecords = records.map(({ dragItem, item }) => ({
    item,
    startXNorm: getDraggedDecorStartNorm(dragItem, item, "x"),
    startYNorm: getDraggedDecorStartNorm(dragItem, item, "y"),
    tankLayer: clampTankLayer(dragItem.tankLayer ?? item.tankLayer ?? DEFAULT_TANK_LAYER)
  }));
  const { deltaX, deltaY } = resolveSharedDecorGroupDelta(constraintRecords, rawDeltaX, rawDeltaY);

  for (const record of constraintRecords) {
    record.item.tankLayer = record.tankLayer;
    record.item.xNorm = clamp((record.startXNorm * TANK_WIDTH + deltaX) / TANK_WIDTH, 0, 1);
    record.item.yNorm = clamp((record.startYNorm * TANK_HEIGHT + deltaY) / TANK_HEIGHT, 0, 1);
    const placement = clampDecorPlacement(record.item.xNorm, record.item.yNorm, {
      item: record.item,
      applyGravity: true
    });
    record.item.xNorm = placement.xNorm;
    record.item.yNorm = placement.yNorm;
  }
}

function updateDraggedDecor(point) {
  const drag = runtime.dragState;
  if (!drag) {
    return;
  }

  const item = state.placedDecor.find((placed) => placed.id === drag.placedId);
  if (!item) {
    runtime.dragState = null;
    renderUi(Date.now());
    return;
  }

  const dragItems = Array.isArray(drag.items) && drag.items.length
    ? drag.items
    : [{
      id: drag.placedId,
      offsetXNorm: drag.offsetXNorm,
      offsetYNorm: drag.offsetYNorm,
      tankLayer: drag.tankLayer
    }];

  if (dragItems.length > 1) {
    updateDraggedDecorGroup(drag, dragItems, point.x / TANK_WIDTH, point.y / TANK_HEIGHT);
    renderPlacementHint();
    return;
  }

  for (const dragItem of dragItems) {
    const draggedItem = state.placedDecor.find((placed) => placed.id === dragItem.id);
    if (!draggedItem) {
      continue;
    }
    draggedItem.tankLayer = clampTankLayer(dragItem.tankLayer ?? draggedItem.tankLayer ?? DEFAULT_TANK_LAYER);
    const placement = clampDecorPlacement(point.x / TANK_WIDTH + dragItem.offsetXNorm, point.y / TANK_HEIGHT + dragItem.offsetYNorm, {
      item: draggedItem,
      applyGravity: true
    });
    draggedItem.xNorm = placement.xNorm;
    draggedItem.yNorm = placement.yNorm;
  }
  renderPlacementHint();
}

function finalizeDecorDrag() {
  const drag = runtime.dragState;
  if (!drag) {
    return;
  }

  const item = state.placedDecor.find((placed) => placed.id === drag.placedId);
  runtime.dragState = null;
  const now = Date.now();

  if (drag.isNewPlacement) {
    pushEvent(`Placed ${drag.decorName} in the aquarium.`, now, getCurrentTank(), {
      type: "decor",
      decorKey: drag.decorKey,
      placedDecorId: drag.placedId
    });
    showToast(`${drag.decorName} placed.`);
  }

  const draggedIds = Array.isArray(drag.items) && drag.items.length
    ? drag.items.map((entry) => entry.id)
    : [drag.placedId];
  for (const draggedId of draggedIds) {
    const draggedItem = state.placedDecor.find((placed) => placed.id === draggedId);
    if (draggedItem) {
      applyDecorGravelInsertion(draggedItem);
      updatePlacedDecorResizeAnchor(draggedItem);
    }
  }

  saveState();
  renderUi(now);
}

function clampFishPlacement(xNorm, yNorm, species = null, options = {}) {
  const fish = options.fish || null;
  const suckerBehaviorActive = getEffectiveFishBehavior(fish, species) === "sucker";
  const layer = suckerBehaviorActive
    ? normalizeSuckerFishGlassLayer(options.layer ?? getSuckerFishGlassLayer(fish))
    : clampTankLayer(options.layer ?? getFishTankLayer(fish) ?? DEFAULT_TANK_LAYER);
  const suckerPlacementOptions = suckerBehaviorActive
    ? getSuckerFishPlacementOptionsForLayer(layer)
    : null;
  const baseXNorm = clampFishXNormToMobileViewport(xNorm, fish, species);
  const basePlacement = suckerBehaviorActive
    ? {
      xNorm: baseXNorm,
      yNorm: clampFishYNormToLayer(yNorm, fish, species, layer, suckerPlacementOptions)
    }
    : {
      xNorm: baseXNorm,
      yNorm: clampFishYNormToLayer(yNorm, fish, species, layer, { minYNorm: 0.14, maxYNorm: 0.8 })
    };

  if (!isBowlTank()) {
    return basePlacement;
  }

  const constrained = constrainNormalizedPointToTankShell(basePlacement.xNorm, basePlacement.yNorm, { variant: "inner" });
  if (suckerBehaviorActive) {
    return {
      xNorm: clampFishXNormToMobileViewport(constrained.xNorm, fish, species),
      yNorm: clampFishYNormToLayer(constrained.yNorm, fish, species, layer, suckerPlacementOptions)
    };
  }

  return {
    xNorm: clampFishXNormToMobileViewport(constrained.xNorm, fish, species),
    yNorm: clampFishYNormToLayer(constrained.yNorm, fish, species, layer, { minYNorm: 0.14, maxYNorm: 0.8 })
  };
}

function enforceFishLayerBoundary(fish, species = getSpeciesForFish(fish)) {
  if (!fish || !species || isFishDead(fish)) {
    return false;
  }

  if (fish.activity === FISH_GRAVEL_DIG_ACTIVITY && getForcedGravelDigPrompt(fish)) {
    const minYNorm = getFishSurfaceMinYNorm(fish, species, 0.14);
    const maxYNorm = 0.96;
    const xNorm = clampFishXNormToMobileViewport(Number.isFinite(Number(fish.xNorm)) ? fish.xNorm : 0.5, fish, species);
    const yNorm = clamp(Number.isFinite(Number(fish.yNorm)) ? fish.yNorm : minYNorm, minYNorm, maxYNorm);
    const targetXNorm = clampFishXNormToMobileViewport(Number.isFinite(Number(fish.targetXNorm)) ? fish.targetXNorm : xNorm, fish, species);
    const targetYNorm = clamp(Number.isFinite(Number(fish.targetYNorm)) ? fish.targetYNorm : yNorm, minYNorm, maxYNorm);
    const changed = Math.abs(xNorm - fish.xNorm) > 0.000001
      || Math.abs(yNorm - fish.yNorm) > 0.000001
      || Math.abs(targetXNorm - fish.targetXNorm) > 0.000001
      || Math.abs(targetYNorm - fish.targetYNorm) > 0.000001;
    fish.xNorm = xNorm;
    fish.yNorm = yNorm;
    fish.targetXNorm = targetXNorm;
    fish.targetYNorm = targetYNorm;
    return changed;
  }

  const suckerBehaviorActive = getEffectiveFishBehavior(fish, species) === "sucker";
  const currentLayer = suckerBehaviorActive ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish);
  const targetLayer = suckerBehaviorActive ? getDesiredSuckerFishGlassLayer(fish) : getDesiredFishTankLayer(fish);
  const position = clampFishPlacement(fish.xNorm, fish.yNorm, species, {
    fish,
    layer: currentLayer
  });
  const target = clampFishPlacement(
    Number.isFinite(Number(fish.targetXNorm)) ? fish.targetXNorm : fish.xNorm,
    Number.isFinite(Number(fish.targetYNorm)) ? fish.targetYNorm : fish.yNorm,
    species,
    {
      fish,
      layer: targetLayer
    }
  );
  const changed = Math.abs(position.xNorm - fish.xNorm) > 0.000001
    || Math.abs(position.yNorm - fish.yNorm) > 0.000001
    || Math.abs(target.xNorm - fish.targetXNorm) > 0.000001
    || Math.abs(target.yNorm - fish.targetYNorm) > 0.000001;

  fish.xNorm = position.xNorm;
  fish.yNorm = position.yNorm;
  fish.targetXNorm = target.xNorm;
  fish.targetYNorm = target.yNorm;
  return changed;
}

function beginFishDrag(fish, point, pointerId) {
  if (!fish || isFishDead(fish)) {
    return;
  }

  const species = getSpeciesForFish(fish);
  if (!species) {
    return;
  }

  const now = Date.now();
  fish.activity = "roam";
  fish.feedingPelletId = null;
  clearFishCaveBehavior(fish);
  fish.hangoutDecorId = null;
  fish.targetAt = now + 1200;
  fish.targetXNorm = fish.xNorm;
  fish.targetYNorm = fish.yNorm;
  setFishTankLayers(fish, species.behavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish), species.behavior === "sucker" ? getSuckerFishGlassLayer(fish) : getFishTankLayer(fish));

  runtime.pointerDown = true;
  runtime.fishDragState = {
    fishId: fish.id,
    offsetXNorm: fish.xNorm - point.x / TANK_WIDTH,
    offsetYNorm: fish.yNorm - point.y / TANK_HEIGHT,
    moved: false
  };

  try {
    dom.tankStage.setPointerCapture(pointerId);
    rememberTankPointerCapture(pointerId);
  } catch (error) {
    console.debug("Pointer capture skipped.", error);
  }

  updateDraggedFish(point);
  renderUi(now);
}

function updateDraggedFish(point) {
  const drag = runtime.fishDragState;
  if (!drag || !point) {
    return;
  }

  const fish = state.fish.find((entry) => entry.id === drag.fishId);
  if (!fish || isFishDead(fish)) {
    runtime.fishDragState = null;
    renderUi(Date.now());
    return;
  }

  const species = getSpeciesForFish(fish);
  const requestedPlacement = clampFishPlacement(
    point.x / TANK_WIDTH + drag.offsetXNorm,
    point.y / TANK_HEIGHT + drag.offsetYNorm,
    species,
    {
      fish,
      layer: getFishTankLayer(fish)
    }
  );
  const now = Date.now();
  const placement = resolveDraggedFishCaveCollision(
    fish,
    species,
    requestedPlacement.xNorm,
    requestedPlacement.yNorm,
    now
  );
  const movedDistance = Math.hypot((placement.xNorm - fish.xNorm) * TANK_WIDTH, (placement.yNorm - fish.yNorm) * TANK_HEIGHT);
  const intendedDistance = Math.hypot((requestedPlacement.xNorm - fish.xNorm) * TANK_WIDTH, (requestedPlacement.yNorm - fish.yNorm) * TANK_HEIGHT);
  if (movedDistance >= 4 || intendedDistance >= 4) {
    drag.moved = true;
    runtime.suppressNextTankClick = true;
  }

  fish.xNorm = placement.xNorm;
  fish.yNorm = placement.yNorm;
  fish.targetXNorm = placement.xNorm;
  fish.targetYNorm = placement.yNorm;
  fish.targetAt = now + 1200;
  clearFishCaveBehavior(fish);
  fish.hangoutDecorId = null;
  if (species?.behavior === "sucker") {
    const glassLayer = getSuckerFishGlassLayer(fish);
    setFishTankLayers(fish, glassLayer, glassLayer);
    resolveSuckerFishGlassCollisions(now, { draggedFishId: fish.id });
  }
}

function finalizeFishDrag() {
  const drag = runtime.fishDragState;
  if (!drag) {
    return;
  }

  runtime.fishDragState = null;
  const now = Date.now();
  const fish = state.fish.find((entry) => entry.id === drag.fishId);
  if (!fish || isFishDead(fish)) {
    renderUi(now);
    return;
  }

  const species = getSpeciesForFish(fish);
  fish.targetAt = now + 900 + Math.random() * 1400;
  fish.hangoutDecorId = null;
  if (species?.behavior === "sucker") {
    const glassLayer = getSuckerFishGlassLayer(fish);
    setFishTankLayers(fish, glassLayer, glassLayer);
  } else {
    setFishTankLayers(fish, getFishTankLayer(fish), getFishTankLayer(fish));
  }

  if (drag.moved) {
    saveState();
  }
  renderUi(now);
}

function beginFishEggDrag(egg, point, pointerId) {
  if (!egg || egg.hatchedAt || !point) {
    return;
  }

  const now = Date.now();
  const tankLayer = getFishEggTankLayer(egg);
  const targetYNorm = getFishEggTargetYNorm(egg.xNorm, tankLayer);
  const pose = getFishEggPose(egg, now);
  const currentXNorm = clamp(Number(egg.xNorm) || 0.5, 0.08, 0.92);
  const currentYNorm = clamp((pose?.y ?? targetYNorm * TANK_HEIGHT) / TANK_HEIGHT, 0.12, targetYNorm);

  runtime.pointerDown = true;
  if (!runtime.feedingModeFoodKey && !runtime.medicineModeKey) {
    runtime.suppressNextTankClick = true;
  }
  runtime.eggDragState = {
    eggId: String(egg.id || ""),
    startXNorm: currentXNorm,
    startYNorm: currentYNorm,
    offsetXNorm: currentXNorm - point.x / TANK_WIDTH,
    offsetYNorm: currentYNorm - point.y / TANK_HEIGHT,
    originalXNorm: currentXNorm,
    originalStartYNorm: Number.isFinite(Number(egg.startYNorm)) ? Number(egg.startYNorm) : currentYNorm,
    originalYNorm: Number.isFinite(Number(egg.yNorm)) ? Number(egg.yNorm) : targetYNorm,
    originalReleasedAt: Number.isFinite(Number(egg.releasedAt)) ? Number(egg.releasedAt) : null,
    moved: false
  };

  egg.dragYNorm = currentYNorm;

  try {
    dom.tankStage.setPointerCapture(pointerId);
    rememberTankPointerCapture(pointerId);
  } catch (error) {
    console.debug("Pointer capture skipped.", error);
  }

  updateDraggedFishEgg(point);
  renderUi(now);
}

function updateDraggedFishEgg(point) {
  const drag = runtime.eggDragState;
  if (!drag || !point) {
    return;
  }

  const egg = Array.isArray(state.fishEggs)
    ? state.fishEggs.find((entry) => entry?.id === drag.eggId)
    : null;
  if (!egg || egg.hatchedAt) {
    runtime.eggDragState = null;
    renderUi(Date.now());
    return;
  }

  const xNorm = clamp(point.x / TANK_WIDTH + drag.offsetXNorm, 0.08, 0.92);
  const tankLayer = getFishEggTankLayer(egg);
  const targetYNorm = getFishEggTargetYNorm(xNorm, tankLayer);
  const yNorm = clamp(point.y / TANK_HEIGHT + drag.offsetYNorm, 0.12, targetYNorm);
  const movedDistance = Math.hypot(
    (xNorm - drag.startXNorm) * TANK_WIDTH,
    (yNorm - drag.startYNorm) * TANK_HEIGHT
  );
  if (movedDistance >= 4) {
    drag.moved = true;
    runtime.suppressNextTankClick = true;
  }

  egg.xNorm = xNorm;
  egg.startYNorm = yNorm;
  egg.yNorm = targetYNorm;
  egg.dragYNorm = yNorm;
  egg.releasedAt = null;
}

function finalizeFishEggDrag() {
  const drag = runtime.eggDragState;
  if (!drag) {
    return;
  }

  runtime.eggDragState = null;
  const now = Date.now();
  const egg = Array.isArray(state.fishEggs)
    ? state.fishEggs.find((entry) => entry?.id === drag.eggId)
    : null;
  if (!egg || egg.hatchedAt) {
    renderUi(now);
    return;
  }

  if (!drag.moved) {
    egg.xNorm = drag.originalXNorm;
    egg.startYNorm = drag.originalStartYNorm;
    egg.yNorm = drag.originalYNorm;
    egg.releasedAt = drag.originalReleasedAt;
    delete egg.dragYNorm;
    renderUi(now);
    return;
  }

  const tankLayer = getFishEggTankLayer(egg);
  const xNorm = clamp(Number(egg.xNorm) || drag.startXNorm || 0.5, 0.08, 0.92);
  const targetYNorm = getFishEggTargetYNorm(xNorm, tankLayer);
  const currentYNorm = clamp(
    Number.isFinite(Number(egg.dragYNorm)) ? Number(egg.dragYNorm) : targetYNorm,
    0.12,
    targetYNorm
  );

  egg.xNorm = xNorm;
  egg.startYNorm = currentYNorm;
  egg.yNorm = targetYNorm;
  egg.releasedAt = now;
  delete egg.dragYNorm;

  saveState();
  renderUi(now);
}

function storeDecor(placedId) {
  const index = state.placedDecor.findIndex((item) => item.id === placedId);
  if (index === -1) {
    return;
  }

  if (isPlacedDecorGrouped(state.placedDecor[index])) {
    showToast("Ungroup that decor before putting it away.");
    return;
  }

  const [removed] = state.placedDecor.splice(index, 1);
  clearDecorResidenceAssignments(removed.id, { save: false });
  clearDecorBoroughServiceReservations(removed.id);
  if (runtime.dragState?.placedId === removed.id) {
    runtime.dragState = null;
  }
  if (runtime.decorResizeState?.placedId === removed.id) {
    runtime.decorResizeState = null;
  }
  clearSelectedDecor(removed.id);
  state.gravelLivePebbles = [];
  state.decorInventory[removed.decorKey] = (state.decorInventory[removed.decorKey] || 0) + 1;
  pushEvent(`Stored ${runtime.decorMap.get(removed.decorKey)?.name || titleFromFile(removed.decorKey)} for later.`, Date.now(), getCurrentTank(), {
    type: "decor",
    decorKey: removed.decorKey,
    placedDecorId: removed.id
  });
  saveState();
  renderUi(Date.now());
}

function storeFish(fishId, options = {}) {
  const allowDead = Boolean(options.allowDead);
  const index = state.fish.findIndex((entry) => entry.id === fishId);
  if (index === -1) {
    return false;
  }

  const fish = state.fish[index];
  const dead = isFishDead(fish);
  if (!dead && hasZombieBiteInfection(fish)) {
    showToast(`${fish.name} is panicking from a zombie bite and can't be stored right now.`);
    return false;
  }
  if (dead && isFishBeingConsumedByPiranhas(fish)) {
    showToast(`${fish.name} is already being devoured by piranhas.`);
    return false;
  }
  if (dead && !allowDead) {
    showToast("Use the toilet button to dispose of a deceased fish.");
    return false;
  }

  if (runtime.debugForcedCaveFishId === fishId) {
    clearDebugCaveTestSelection();
  }

  const now = Date.now();
  preserveTankDirtinessThroughChange(now, () => {
    state.fish.splice(index, 1);
    clearPiranhaAttackState(fish);
    clearZombieAttackState(fish);
    fish.feedingPelletId = null;
    fish.comfortDamageProgressMs = 0;
    clearFishCaveBehavior(fish);
    if (dead) {
      fish.activity = "dead";
    } else {
      fish.activity = "roam";
      const effectiveBehavior = getEffectiveFishBehavior(fish);
      setFishTankLayers(
        fish,
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : fish.tankLayer || DEFAULT_TANK_LAYER,
        effectiveBehavior === "sucker" ? getSuckerFishGlassLayer(fish) : fish.tankLayer || DEFAULT_TANK_LAYER
      );
    }
    fish.hangoutDecorId = null;
    fish.residenceDecorId = null;
    fish.favoriteSpot = null;
    fish.entryStartedAt = null;
    fish.entryDurationMs = 0;
    fish.entryFromYNorm = null;
    fish.entrySplashTriggered = false;
    fish.turnStartedAt = null;
    fish.turnDurationMs = 0;
    fish.displayDirection = Number(fish.direction) < 0 ? -1 : 1;
    fish.displayAngle = fish.displayDirection < 0 ? Math.PI : 0;
    fish.turnFromDirection = fish.displayDirection;
    fish.turnToDirection = fish.displayDirection;
    fish.turnFromAngle = fish.displayAngle;
    fish.turnToAngle = fish.displayAngle;
    fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
    state.pendingPoops = state.pendingPoops.filter((poop) => poop.fishId !== fishId);
    releasePelletsTargetingFishIds(fishId);
    clearPiranhaAttackState(fish);
    fish.piranhaConsumptionStartedAt = null;
    fish.piranhaConsumptionEndsAt = null;
    fish.piranhaLastBloodAt = null;
    fish.storageFrozen = true;
    fish.storedAt = now;
    fish.frozenMealSlotKey = getCurrentMealSlot(now)?.key || "";
    fish.frozenLastSimulatedAt = now;
    state.storedFish.push(fish);
  });
  if (dead && !hasExposedDeadTankFish(now) && getBaseTankDirtiness(now) < CRITICAL_TANK_DIRTINESS) {
    resetLivingFishComfortDamageProgress();
  }
  if (runtime.selectedFishId === fishId) {
    runtime.selectedFishId = null;
  }

  pushEvent(`${fish.name} was moved into fish storage.`, now);
  saveState();
  renderUi(now);
  showToast(dead ? `${fish.name} moved to storage.` : `${fish.name} stored.`);
  return true;
}

function sellFish(fishId) {
  const activeIndex = state.fish.findIndex((entry) => entry.id === fishId);
  const storedIndex = state.storedFish.findIndex((entry) => entry.id === fishId);
  const isActive = activeIndex !== -1;
  const index = isActive ? activeIndex : storedIndex;
  const list = isActive ? state.fish : state.storedFish;

  if (index === -1) {
    return;
  }

  const fish = list[index];
  if (isFishDead(fish)) {
    showToast("Dead fish cannot be sold.");
    return;
  }
  if (isFishJuvenile(fish)) {
    showToast("Baby fish need time to grow before they can be sold.");
    return;
  }

  const species = getSpeciesForFish(fish);
  if (!species) {
    return;
  }

  const resaleValue = getResaleValue(species.cost);
  const now = Date.now();
  return performCoinTransaction({
    direction: "credit",
    amount: resaleValue,
    now,
    apply: () => {
      const removeFish = () => {
        list.splice(index, 1);
        state.pendingPoops = state.pendingPoops.filter((poop) => poop.fishId !== fishId);
        releasePelletsTargetingFishIds(fishId);
      };
      if (isActive) {
        preserveTankDirtinessThroughChange(now, removeFish);
      } else {
        removeFish();
      }
      if (runtime.selectedFishId === fishId) {
        runtime.selectedFishId = null;
      }
    },
    event: {
      type: "sale",
      tone: "neutral",
      fishId,
      text: `Sold ${fish.name} for ${resaleValue} ${pluralize("coin", resaleValue)}.`
    },
    toast: `Sold ${fish.name} for ${resaleValue} ${pluralize("coin", resaleValue)}.`
  });
}

function sellStoredDecor(decorKey) {
  const count = Math.max(0, Number(state.decorInventory[decorKey]) || 0);
  if (count <= 0) {
    return;
  }

  const decor = runtime.decorMap.get(decorKey);
  const resaleValue = getResaleValue(decor?.cost || 0);

  const displayName = decor?.name || titleFromFile(decorKey);
  return performCoinTransaction({
    direction: "credit",
    amount: resaleValue,
    apply: () => {
      if (count <= 1) {
        delete state.decorInventory[decorKey];
      } else {
        state.decorInventory[decorKey] = count - 1;
      }
    },
    event: {
      type: "sale",
      tone: "neutral",
      decorKey,
      text: `Sold ${displayName} for ${resaleValue} ${pluralize("coin", resaleValue)}.`
    },
    toast: `Sold ${displayName} for ${resaleValue} ${pluralize("coin", resaleValue)}.`
  });
}

function sellPlacedDecor(placedId) {
  const index = state.placedDecor.findIndex((item) => item.id === placedId);
  if (index === -1) {
    return;
  }

  if (isPlacedDecorGrouped(state.placedDecor[index])) {
    showToast("Ungroup that decor before selling it.");
    return;
  }

  const item = state.placedDecor[index];
  const decor = runtime.decorMap.get(item.decorKey);
  const resaleValue = getResaleValue(decor?.cost || 0);
  const displayName = decor?.name || titleFromFile(item.decorKey);
  return performCoinTransaction({
    direction: "credit",
    amount: resaleValue,
    apply: () => {
      const [removed] = state.placedDecor.splice(index, 1);
      clearDecorResidenceAssignments(removed.id, { save: false });
      clearDecorBoroughServiceReservations(removed.id);
      if (runtime.dragState?.placedId === removed.id) {
        runtime.dragState = null;
      }
      if (runtime.decorResizeState?.placedId === removed.id) {
        runtime.decorResizeState = null;
      }
      clearSelectedDecor(removed.id);
      state.gravelLivePebbles = [];
    },
    event: {
      type: "sale",
      tone: "neutral",
      decorKey: item.decorKey,
      placedDecorId: item.id,
      text: `Sold ${displayName} for ${resaleValue} ${pluralize("coin", resaleValue)}.`
    },
    toast: `Sold ${displayName} for ${resaleValue} ${pluralize("coin", resaleValue)}.`
  });
}

function disposeFish(fishId) {
  const activeIndex = state.fish.findIndex((entry) => entry.id === fishId);
  const storedIndex = state.storedFish.findIndex((entry) => entry.id === fishId);
  const isActive = activeIndex !== -1;
  const index = isActive ? activeIndex : storedIndex;
  const list = isActive ? state.fish : state.storedFish;
  if (index === -1) {
    return;
  }

  const fish = list[index];
  if (!isFishDead(fish)) {
    showToast("Only deceased fish can be disposed of.");
    return;
  }

  if (isFishBeingConsumedByPiranhas(fish)) {
    showToast("Piranhas are already taking care of that fish.");
    return;
  }

  if (runtime.debugForcedCaveFishId === fishId) {
    clearDebugCaveTestSelection();
  }

  list.splice(index, 1);
  state.pendingPoops = state.pendingPoops.filter((poop) => poop.fishId !== fishId);
  releasePelletsTargetingFishIds(fishId);
  if (!hasExposedDeadTankFish()) {
    state.lastCorpseSicknessAt = null;
    if (getBaseTankDirtiness(Date.now()) < CRITICAL_TANK_DIRTINESS) {
      resetLivingFishComfortDamageProgress();
    }
  }
  if (runtime.selectedFishId === fishId) {
    runtime.selectedFishId = null;
  }

  const now = Date.now();
  pushEvent(`${fish.name} was disposed of.`, now);
  saveState();
  renderUi(now);
  showToast(`${fish.name} was disposed of.`);
}

function disposeAllDeadFish() {
  const deadFish = [
    ...state.fish.filter((fish) => isFishDead(fish) && !isFishBeingConsumedByPiranhas(fish)),
    ...state.storedFish.filter((fish) => isFishDead(fish))
  ];
  if (!deadFish.length) {
    showToast(hasExposedDeadTankFish() ? "There are no dead fish to dispose of." : "Piranhas are already taking care of the current corpse.");
    return;
  }

  const deadIds = new Set(deadFish.map((fish) => fish.id));
  state.fish = state.fish.filter((fish) => !deadIds.has(fish.id));
  state.storedFish = state.storedFish.filter((fish) => !deadIds.has(fish.id));
  state.pendingPoops = state.pendingPoops.filter((poop) => !deadIds.has(poop.fishId));
  releasePelletsTargetingFishIds(deadIds);

  if (!hasExposedDeadTankFish()) {
    state.lastCorpseSicknessAt = null;
    if (getBaseTankDirtiness(Date.now()) < CRITICAL_TANK_DIRTINESS) {
      resetLivingFishComfortDamageProgress();
    }
  }

  if (runtime.selectedFishId && deadIds.has(runtime.selectedFishId)) {
    runtime.selectedFishId = null;
  }

  const now = Date.now();
  pushEvent(`${deadFish.length} dead ${pluralize("fish", deadFish.length)} were disposed of.`, now);
  saveState();
  renderUi(now);
  showToast(`Disposed of ${deadFish.length} dead ${pluralize("fish", deadFish.length)}.`);
}

function restoreFishToTank(fishId) {
  const index = state.storedFish.findIndex((entry) => entry.id === fishId);
  if (index === -1) {
    return;
  }

  const fish = state.storedFish[index];
  if (isFishDead(fish)) {
    showToast("Use the toilet button to dispose of a deceased fish.");
    return;
  }

  const now = Date.now();
  preserveTankDirtinessThroughChange(now, () => {
    state.storedFish.splice(index, 1);
    resetLivingFishPredatorState(fish, now, {
      entryAnimation: true,
      entryDurationMs: FISH_ENTRY_DURATION_MS,
      entryFromYNorm: FISH_ENTRY_FROM_Y_NORM
    });
    fish.xNorm = randomSwimX();
    fish.yNorm = randomBetween(0.2, 0.72);
    fish.targetXNorm = randomSwimX();
    fish.targetYNorm = randomSwimY();
    fish.targetAt = now + 2200;
    fish.direction = Math.random() > 0.5 ? 1 : -1;
    fish.displayDirection = fish.direction;
    fish.displayAngle = fish.displayDirection < 0 ? Math.PI : 0;
    fish.activity = "roam";
    fish.feedingPelletId = null;
    fish.comfortDamageProgressMs = 0;
    clearFishCaveBehavior(fish);
    const returnLayer = getEffectiveFishBehavior(fish) === "sucker"
      ? SUCKER_FISH_BACK_GLASS_LAYER
      : clampTankLayer(1 + Math.floor(Math.random() * TANK_DEPTH_LAYERS));
    setFishTankLayers(fish, returnLayer, returnLayer);
    fish.hangoutDecorId = null;
    const returnSpecies = getSpeciesForFish(fish);
    fish.nextDetritusSnackAt = now + (returnSpecies?.cleanupMinMs || 12 * 60 * 1000);
    fish.turnStartedAt = null;
    fish.turnDurationMs = 0;
    fish.turnFromDirection = fish.displayDirection;
    fish.turnToDirection = fish.displayDirection;
    fish.turnFromAngle = fish.displayAngle;
    fish.turnToAngle = fish.displayAngle;
    fish.turnSpinDirection = fish.displayDirection < 0 ? 1 : -1;
    if (returnSpecies?.speedMode === "dynamic") {
      fish.swimSpeed = normalizeFishSpeed(returnSpecies);
    }

    fish.storageFrozen = false;
    fish.storedAt = null;
    fish.frozenLastSimulatedAt = now;
    state.fish.push(fish);
  });
  pushEvent(`${fish.name} splashed back into the aquarium.`, now);
  saveState();
  renderUi(now);
  showToast(`${fish.name} returned to the tank.`);
}

function adjustDecorDefaultSize(decorKey, direction) {
  if (!runtime.decorMap.has(decorKey)) {
    return;
  }

  const nextScale = clamp(getDecorScaleDefault(decorKey) + direction * SIZE_STEP, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  state.decorScaleDefaults[decorKey] = nextScale;
  saveState();
  renderUi(Date.now());
}

function adjustPlacedDecorSize(placedId, direction) {
  const item = state.placedDecor.find((entry) => entry.id === placedId);
  if (!item) {
    return;
  }

  if (isPlacedDecorGrouped(item)) {
    stepDecorGroupScale(item, Math.sign(Number(direction) || 0), true);
    return;
  }

  item.scale = clamp(item.scale + direction * SIZE_STEP, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  const placement = clampDecorPlacement(item.xNorm, item.yNorm, { item, applyGravity: true });
  item.xNorm = placement.xNorm;
  item.yNorm = placement.yNorm;
  updatePlacedDecorResizeAnchor(item);
  saveState();
  renderUi(Date.now());
}

function savePlacedDecorSizeAsDefault(placedId) {
  const item = state.placedDecor.find((entry) => entry.id === placedId);
  if (!item) {
    return;
  }

  state.decorScaleDefaults[item.decorKey] = clamp(item.scale, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  saveState();
  renderUi(Date.now());
}

function getManagedFishById(fishId) {
  const activeFish = state.fish.find((entry) => entry.id === fishId);
  if (activeFish) {
    return { fish: activeFish, inStorage: false };
  }

  const storedFish = state.storedFish.find((entry) => entry.id === fishId);
  if (storedFish) {
    return { fish: storedFish, inStorage: true };
  }

  return null;
}
