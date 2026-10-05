// Source fragment: ui/tank-input.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function isTankOverlayTarget(target) {
  return (
    target instanceof Element &&
    Boolean(target.closest("#tankSidebar, #debugSidebar, #boroughOverview, .tank-display, .tank-nav-button, .tank-bottom-dock, #editDecorTray, #editFishTray, #editEquipmentTray, #editTankTray, #foodTray, #medicineTray, #careTaskPane, #tankContextMenu, .tank-overlay-hints, .tutorial-overlay, .store-overlay, .settings-overlay, .fish-inspector, .submarine-manager, .fish-action-flyout, .fish-action-submenu, .fish-action-target-menu, .fish-action-queue-dock, .selected-fish-needs-panel, .decor-settings-badge-button, .decor-action-top-bar, .decor-action-float-button, .decor-side-control-panel, .decor-side-control-button, .tab-buttons"))
  );
}

function hasActiveTankToolOrOverlay() {
  const fishInspectorOpen = Boolean(runtime.selectedFishId && dom.fishInspector && !dom.fishInspector.hidden);
  const submarineManagerOpen = Boolean(runtime.selectedMachineryId);
  return Boolean(
    runtime.storeOverlayOpen
    || runtime.utilityOverlayOpen
    || runtime.settingsOverlayOpen
    || runtime.equipmentOverlayOpen
    || runtime.debugSidebarOpen
    || isIntroTutorialActive()
    || !runtime.sidebarCollapsed
    || runtime.editTankMode
    || runtime.fishEditMode
    || runtime.equipmentEditMode
    || runtime.tankEditMode
    || runtime.foodTrayOpen
    || runtime.medicineTrayOpen
    || runtime.feedingModeFoodKey
    || runtime.medicineModeKey
    || runtime.cleaningMode
    || runtime.scoopMode
    || runtime.placementMode
    || runtime.dragState
    || runtime.fishDragState
    || runtime.eggDragState
    || runtime.pebbleDragState
    || fishInspectorOpen
    || submarineManagerOpen
  );
}

function clearGlassTapGesture() {
  runtime.glassTapGesture.pointerId = null;
  runtime.glassTapGesture.startedAt = 0;
  runtime.glassTapGesture.startX = 0;
  runtime.glassTapGesture.startY = 0;
  runtime.glassTapGesture.movedTooFar = false;
  runtime.glassTapGesture.allowNextClick = false;
}

function beginGlassTapGesture(event, point, now = Date.now()) {
  const primaryPointer = !(event instanceof MouseEvent) || event.button === 0;
  if (!primaryPointer || !point) {
    clearGlassTapGesture();
    return;
  }

  runtime.glassTapGesture.pointerId = Number.isInteger(event.pointerId) ? event.pointerId : null;
  runtime.glassTapGesture.startedAt = now;
  runtime.glassTapGesture.startX = point.x;
  runtime.glassTapGesture.startY = point.y;
  runtime.glassTapGesture.movedTooFar = false;
  runtime.glassTapGesture.allowNextClick = false;
}

function updateGlassTapGesture(event, point) {
  const gesture = runtime.glassTapGesture;
  if (!gesture.startedAt) {
    return;
  }

  if (
    Number.isInteger(gesture.pointerId)
    && Number.isInteger(event?.pointerId)
    && gesture.pointerId !== event.pointerId
  ) {
    return;
  }

  if (!point) {
    return;
  }

  if (Math.hypot(point.x - gesture.startX, point.y - gesture.startY) > GLASS_TAP_MAX_MOVE_PX) {
    gesture.movedTooFar = true;
  }
}

function finalizeGlassTapGesture(event, now = Date.now()) {
  const gesture = runtime.glassTapGesture;
  const pointerMatches = !Number.isInteger(gesture.pointerId)
    || !Number.isInteger(event?.pointerId)
    || gesture.pointerId === event.pointerId;
  const pressDuration = gesture.startedAt > 0 ? now - gesture.startedAt : Number.POSITIVE_INFINITY;
  const allowNextClick = Boolean(
    pointerMatches
    && gesture.startedAt > 0
    && !gesture.movedTooFar
    && pressDuration <= GLASS_TAP_MAX_HOLD_MS
    && !runtime.cleaningMode
    && !runtime.editTankMode
    && !runtime.equipmentEditMode
    && !runtime.tankEditMode
    && !runtime.scoopMode
    && !runtime.placementMode
    && !runtime.dragState
    && !runtime.fishDragState
    && !runtime.eggDragState
    && !runtime.pebbleDragState
  );
  clearGlassTapGesture();
  runtime.glassTapGesture.allowNextClick = allowNextClick;
}

function consumePendingGlassTapClick() {
  const allowNextClick = Boolean(runtime.glassTapGesture.allowNextClick);
  runtime.glassTapGesture.allowNextClick = false;
  return allowNextClick;
}

function canTriggerGlassTap(event) {
  const primaryMouseClick = !(event instanceof MouseEvent) || event.button === 0;
  return Boolean(
    primaryMouseClick
    && !isTankMouseInputLocked()
    && !isTankOverlayTarget(event?.target)
    && !hasActiveTankToolOrOverlay()
  );
}

function closeTankContextMenu() {
  runtime.tankContextMenu = { kind: "", id: "", anchorX: 0, anchorY: 0 };
  if (dom.tankContextMenu) {
    dom.tankContextMenu.hidden = true;
    dom.tankContextMenu.replaceChildren();
  }
}

function getMachineryContextName(machinery) {
  const fallback = machinery?.type === MACHINERY_TYPE_BOAT ? "Chum Skiff" : "Automated Care Submarine";
  return String(machinery?.customName || fallback).trim() || fallback;
}

function positionTankContextMenu(menu, point) {
  const stage = dom.tankStage;
  if (!menu || !stage || !point) return;
  const padding = 12;
  const x = Number(point.x) / TANK_WIDTH * stage.clientWidth;
  const y = Number(point.y) / TANK_HEIGHT * stage.clientHeight;
  const horizontalGap = 14;
  const verticalGap = 12;
  const roomBelow = stage.clientHeight - y - padding;
  // Prefer a familiar down-right menu, but deliberately flip above a low target
  // so every action remains visible instead of being clipped by the tank edge.
  const preferredTop = roomBelow >= menu.offsetHeight + verticalGap
    ? y + verticalGap
    : y - menu.offsetHeight - verticalGap;
  menu.style.left = `${Math.max(padding, Math.min(x + horizontalGap, stage.clientWidth - menu.offsetWidth - padding))}px`;
  menu.style.top = `${Math.max(padding, Math.min(preferredTop, stage.clientHeight - menu.offsetHeight - padding))}px`;
}

function openTankContextMenu(kind, item, point) {
  const menu = dom.tankContextMenu;
  if (!menu || !item || !point) return false;
  const isFish = kind === "fish";
  const isDecor = kind === "decor";
  const isMachinery = kind === "machinery";
  if (!isFish && !isDecor && !isMachinery) return false;

  let title = "";
  let subtitle = "";
  let headerImage = "";
  let actions = [];
  if (isFish) {
    const species = getSpeciesForFish(item);
    title = item.name || "Fish";
    subtitle = getFishDisplaySpeciesName(item, species);
    headerImage = getFishDisplayAssetPath(item, species) || species?.asset || "assets/icons/fish_box.png";
    actions = [["feed", "assets/icons/feed_fish.png", "Feed"], ["care", "assets/icons/fish_care.png", "Fish Care"], ["rename", "assets/icons/edit_tank.png", "Rename"], ["store", "assets/icons/scoop.png", "Scoop Out", "is-danger"], ["settings", "assets/icons/settings.png", "Settings"]];
  } else if (isDecor) {
    const decor = runtime.decorMap.get(item.decorKey);
    title = getPlacedDecorDisplayName(item, decor);
    subtitle = decor?.category || decor?.behavior || "Decoration";
    headerImage = getDecorThumbnailPath(decor) || "assets/icons/decor_box.png";
    actions = [["rename", "assets/icons/edit_tank.png", "Rename"], ["store", "assets/icons/store.png", "Put Away", "is-danger"], ["settings", "assets/icons/settings.png", "Settings"]];
  } else {
    title = getMachineryContextName(item);
    subtitle = item.type === MACHINERY_TYPE_BOAT ? "Machinery · Chum delivery" : "Machinery · Automated care";
    headerImage = getMachineryImagePath(item.type, Date.now(), item) || "assets/icons/tools.png";
    actions = [["rename", "assets/icons/edit_tank.png", "Rename"], ["store", "assets/icons/store.png", "Put Away", "is-danger"], ["settings", "assets/icons/settings.png", "Settings"]];
  }

  runtime.tankContextMenu = { kind, id: item.id, anchorX: point.x, anchorY: point.y };
  menu.innerHTML = `<div class="tank-context-menu-header"><span class="tank-context-menu-icon"><img ${assetImageAttributes(headerImage)} alt="" aria-hidden="true" /></span><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle)}</span></div></div><div class="tank-context-menu-actions">${actions.map(([action, actionIcon, label, className = ""]) => `<button class="tank-context-menu-action ${className}" type="button" data-tank-context-action="${action}"><img class="tank-context-menu-action-icon" ${assetImageAttributes(actionIcon)} alt="" aria-hidden="true" /><span>${label}</span></button>`).join("")}</div>`;
  menu.hidden = false;
  positionTankContextMenu(menu, point);
  return true;
}

function getTankContextTargetName(kind, id) {
  if (kind === "fish") return getManagedFishById(id)?.fish?.name || "Fish";
  if (kind === "decor") {
    const item = getPlacedDecorById(id);
    return item ? getPlacedDecorDisplayName(item, runtime.decorMap.get(item.decorKey)) : "Decoration";
  }
  return getMachineryContextName(getMachineryById(id));
}

function beginTankContextMenuRename() {
  const { kind, id, anchorX, anchorY } = runtime.tankContextMenu || {};
  const menu = dom.tankContextMenu;
  if (!menu || !kind || !id) return false;
  const currentName = getTankContextTargetName(kind, id);
  const label = kind === "fish" ? "Fish name" : kind === "decor" ? "Decoration name" : "Machinery name";
  const maxLength = kind === "fish" ? 20 : kind === "machinery" ? 30 : 36;
  const actions = menu.querySelector(".tank-context-menu-actions");
  if (!actions) return false;
  actions.innerHTML = `<form class="tank-context-menu-rename" data-tank-context-rename-form><label>${label}<input type="text" maxlength="${maxLength}" value="${escapeHtml(currentName)}" data-tank-context-name-input /></label><div><button type="submit" class="tank-context-menu-save">Save</button><button type="button" class="tank-context-menu-cancel" data-tank-context-rename-cancel>Cancel</button></div></form>`;
  positionTankContextMenu(menu, { x: anchorX, y: anchorY });
  requestAnimationFrame(() => {
    const input = menu.querySelector("[data-tank-context-name-input]");
    input?.focus?.();
    input?.select?.();
  });
  return true;
}

function renameTankContextTarget(kind, id, nextName) {
  if (kind === "fish") {
    const fish = getManagedFishById(id)?.fish;
    if (!fish) return false;
    const name = String(nextName).trim().slice(0, 20);
    if (!name) {
      showToast("Fish names cannot be blank.");
      return false;
    }
    fish.name = name;
    saveState();
    renderUi(Date.now());
    showToast(`${name} has been renamed.`);
    return true;
  }
  if (kind === "decor") {
    const item = setSelectedDecor(id);
    if (!item) return false;
    setSelectedDecorCustomName(nextName);
    return true;
  }
  const machinery = getMachineryById(id);
  if (!machinery) return false;
  const name = String(nextName).trim().slice(0, 30);
  if (!name) {
    showToast("Machinery names cannot be blank.");
    return false;
  }
  machinery.customName = name;
  saveState();
  renderUi(Date.now());
  return true;
}

function handleTankContextMenuAction(action) {
  const { kind, id } = runtime.tankContextMenu || {};
  const point = { x: runtime.tankContextMenu?.anchorX || 0, y: runtime.tankContextMenu?.anchorY || 0 };
  if (!kind || !id) return false;
  if (action === "rename") {
    return beginTankContextMenuRename();
  }
  let succeeded = false;
  if (action === "store") {
    if (kind === "fish") succeeded = storeFish(id, { allowDead: true, source: "context" });
    if (kind === "decor") {
      const existed = Boolean(getPlacedDecorById(id));
      storeDecor(id);
      succeeded = existed && !getPlacedDecorById(id);
    }
    if (kind === "machinery") {
      const machinery = getMachineryById(id);
      if (machinery?.type === MACHINERY_TYPE_BOAT) succeeded = recallBoat(Date.now());
      if (machinery?.type === MACHINERY_TYPE_SUBMARINE) succeeded = recallSubmarine(Date.now());
    }
  } else if (action === "settings") {
    if (kind === "fish" && getManagedFishById(id)) {
      openFishInspector(id, { settingsOpen: true });
      succeeded = true;
    }
    if (kind === "decor" && getPlacedDecorById(id)) {
      openDecorSettings(id);
      succeeded = true;
    }
    if (kind === "machinery") succeeded = openSubmarineManager(id);
  } else if (kind === "fish" && action === "feed") {
    if (getManagedFishById(id)) {
      openFishActionMenu(id, point);
      openFishActionSubmenu("food", id, Date.now());
      succeeded = true;
    }
  } else if (kind === "fish" && action === "care") {
    if (getManagedFishById(id)) {
      openFishInspector(id, { settingsOpen: false });
      succeeded = true;
    }
  }
  if (succeeded) {
    closeTankContextMenu();
  } else if (action !== "store") {
    showToast("That object is no longer available.");
  }
  return succeeded;
}
