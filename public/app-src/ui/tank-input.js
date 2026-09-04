// Source fragment: ui/tank-input.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function isTankOverlayTarget(target) {
  return (
    target instanceof Element &&
    Boolean(target.closest("#tankSidebar, #debugSidebar, #boroughOverview, .tank-display, .tank-nav-button, .tank-bottom-dock, #editDecorTray, #editFishTray, #editTankTray, #foodTray, #medicineTray, #careTaskPane, .tank-overlay-hints, .tutorial-overlay, .store-overlay, .settings-overlay, .fish-inspector, .fish-action-flyout, .fish-action-submenu, .fish-action-target-menu, .fish-action-queue-dock, .selected-fish-needs-panel, .decor-settings-badge-button, .decor-action-top-bar, .decor-action-float-button, .decor-side-control-panel, .decor-side-control-button, .tab-buttons"))
  );
}

function hasActiveTankToolOrOverlay() {
  const fishInspectorOpen = Boolean(runtime.selectedFishId && dom.fishInspector && !dom.fishInspector.hidden);
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
