// Source fragment: ui/tool-modes-and-debug-panels.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function resolveWallpaperScrollTarget(targetId) {
  let root = null;
  for (const candidate of document.querySelectorAll("[data-wallpaper-scroll-target]")) {
    if (candidate instanceof Element && candidate.dataset.wallpaperScrollTarget === targetId) {
      root = candidate;
      break;
    }
  }
  if (!(root instanceof Element)) {
    return null;
  }
  if (canWallpaperScrollerMove(root, "up") || canWallpaperScrollerMove(root, "down")) {
    return root;
  }
  const nested = root.querySelector(".management-history-full-list, .management-browser-list, .settings-panel-body, .utility-overlay-body");
  return nested instanceof Element ? nested : root;
}

function getScrollSnapTop(scroller, direction, selector, options = {}) {
  if (!(scroller instanceof Element) || !selector) {
    return null;
  }
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const currentTop = scroller.scrollTop;
  const items = [...scroller.querySelectorAll(selector)].filter((item) => item instanceof HTMLElement);
  if (!items.length) {
    return null;
  }
  const scrollerRect = scroller.getBoundingClientRect();
  const itemTops = items
    .map((item) => Math.round(item.getBoundingClientRect().top - scrollerRect.top + currentTop))
    .filter((top) => Number.isFinite(top))
    .map((top) => clamp(top, 0, maxScroll));
  const snapThreshold = Number.isFinite(Number(options.snapThreshold))
    ? Math.max(0, Number(options.snapThreshold))
    : 14;
  if (direction === "up") {
    for (let index = itemTops.length - 1; index >= 0; index -= 1) {
      if (itemTops[index] < currentTop - snapThreshold) {
        return itemTops[index];
      }
    }
    return 0;
  }
  for (const top of itemTops) {
    if (top > currentTop + snapThreshold) {
      return top;
    }
  }
  return maxScroll;
}

function scrollWallpaperScroller(scroller, direction, options = {}) {
  if (!(scroller instanceof Element)) {
    return false;
  }
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  if (maxScroll <= 1) {
    return false;
  }
  const snapTop = getScrollSnapTop(scroller, direction, options.itemSelector || "", options);
  const fallbackAmount = Math.max(120, Math.round(scroller.clientHeight * 0.72));
  const targetTop = snapTop ?? clamp(
    scroller.scrollTop + (direction === "up" ? -fallbackAmount : fallbackAmount),
    0,
    maxScroll
  );
  scroller.scrollTo({
    top: targetTop,
    behavior: options.smooth === false ? "auto" : "smooth"
  });
  return true;
}

function cancelStoreScrollAnimation() {
  if (runtime.storeScrollAnimationFrame) {
    window.cancelAnimationFrame(runtime.storeScrollAnimationFrame);
    runtime.storeScrollAnimationFrame = 0;
  }
}

function getStoreScrollItemBounds(scroller) {
  if (!(scroller instanceof Element)) {
    return [];
  }
  const scrollerRect = scroller.getBoundingClientRect();
  const currentTop = scroller.scrollTop;
  return [...scroller.querySelectorAll(".shop-card")]
    .filter((item) => item instanceof HTMLElement && !item.hidden)
    .map((item) => {
      const rect = item.getBoundingClientRect();
      return {
        top: Math.round(rect.top - scrollerRect.top + currentTop),
        bottom: Math.round(rect.bottom - scrollerRect.top + currentTop)
      };
    })
    .filter((bounds) => Number.isFinite(bounds.top) && Number.isFinite(bounds.bottom))
    .sort((a, b) => a.top - b.top);
}

function getStoreScrollTargetTop(scroller, direction) {
  if (!(scroller instanceof Element)) {
    return null;
  }
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  if (maxScroll <= 1) {
    return null;
  }
  const currentTop = scroller.scrollTop;
  const viewportBottom = currentTop + scroller.clientHeight;
  const itemBounds = getStoreScrollItemBounds(scroller);
  const threshold = 8;
  if (!itemBounds.length) {
    const fallbackAmount = Math.max(120, Math.round(scroller.clientHeight * 0.62));
    return clamp(currentTop + (direction === "up" ? -fallbackAmount : fallbackAmount), 0, maxScroll);
  }
  if (direction === "up") {
    const currentItem = [...itemBounds].reverse().find((bounds) =>
      bounds.top < currentTop - threshold && bounds.bottom > currentTop + threshold
    );
    if (currentItem) {
      return clamp(currentItem.top, 0, maxScroll);
    }
    for (let index = itemBounds.length - 1; index >= 0; index -= 1) {
      if (itemBounds[index].top < currentTop - threshold) {
        return clamp(itemBounds[index].top, 0, maxScroll);
      }
    }
    return 0;
  }
  const currentItem = itemBounds.find((bounds) =>
    bounds.top <= currentTop + threshold && bounds.bottom > viewportBottom + threshold
  );
  if (currentItem) {
    return clamp(
      Math.min(currentTop + Math.max(120, Math.round(scroller.clientHeight * 0.58)), currentItem.bottom - scroller.clientHeight + 16),
      0,
      maxScroll
    );
  }
  for (const bounds of itemBounds) {
    if (bounds.top > currentTop + threshold) {
      return clamp(bounds.top, 0, maxScroll);
    }
  }
  return maxScroll;
}

function animateStoreScrollerTo(scroller, targetTop, options = {}) {
  if (!(scroller instanceof Element) || !Number.isFinite(Number(targetTop))) {
    return false;
  }
  cancelStoreScrollAnimation();
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const startTop = scroller.scrollTop;
  const endTop = clamp(Number(targetTop), 0, maxScroll);
  if (Math.abs(endTop - startTop) < 1) {
    syncWallpaperEngineStoreScrollControls();
    return false;
  }
  const duration = options.smooth === false ? 0 : 180;
  if (!duration) {
    scroller.scrollTop = endTop;
    syncWallpaperEngineStoreScrollControls();
    return true;
  }
  const startedAt = performance.now();
  const step = (now) => {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    scroller.scrollTop = startTop + ((endTop - startTop) * eased);
    syncWallpaperEngineStoreScrollControls();
    if (progress < 1) {
      runtime.storeScrollAnimationFrame = window.requestAnimationFrame(step);
      return;
    }
    runtime.storeScrollAnimationFrame = 0;
    scroller.scrollTop = endTop;
    syncWallpaperEngineStoreScrollControls();
  };
  runtime.storeScrollAnimationFrame = window.requestAnimationFrame(step);
  return true;
}

function scrollActiveStoreDrawer(direction, options = {}) {
  const scroller = getActiveStoreScroller();
  if (!(scroller instanceof Element)) {
    return false;
  }
  const targetTop = getStoreScrollTargetTop(scroller, direction);
  return animateStoreScrollerTo(scroller, targetTop, options);
}

function syncWallpaperScrollControls(root = document) {
  const controls = root?.querySelectorAll?.("[data-wallpaper-scroll-controls]") || [];
  for (const control of controls) {
    if (!(control instanceof HTMLElement)) {
      continue;
    }
    const showControls = isWallpaperEngineInputAssistEnabled();
    control.hidden = !showControls;
    if (!showControls) {
      continue;
    }
    const scroller = resolveWallpaperScrollTarget(control.dataset.wallpaperScrollControls || "");
    const upButton = control.querySelector('[data-wallpaper-scroll="up"]');
    const downButton = control.querySelector('[data-wallpaper-scroll="down"]');
    if (upButton instanceof HTMLButtonElement) {
      upButton.disabled = !canWallpaperScrollerMove(scroller, "up");
    }
    if (downButton instanceof HTMLButtonElement) {
      downButton.disabled = !canWallpaperScrollerMove(scroller, "down");
    }
  }
}

function scrollWallpaperTarget(targetId, direction, options = {}) {
  const scroller = resolveWallpaperScrollTarget(targetId);
  const itemSelector = targetId === "settings"
    ? ".settings-section"
    : ".management-browser-item, .management-milestone-card, .management-event-row";
  const didScroll = scrollWallpaperScroller(scroller, direction, { ...options, itemSelector });
  window.setTimeout(() => syncWallpaperScrollControls(document), 90);
  return didScroll;
}

function syncWallpaperEngineStoreScrollControls() {
  if (!dom.storeScrollControls) {
    return;
  }
  const showControls = isWallpaperEngineInputAssistEnabled() && runtime.storeOverlayOpen;
  dom.storeScrollControls.hidden = !showControls;
  dom.storeOverlay?.classList.toggle("has-store-scroll-controls", showControls);
  if (!showControls) {
    return;
  }
  const scroller = getActiveStoreScroller();
  const upButton = dom.storeScrollControls.querySelector('[data-store-scroll="up"]');
  const downButton = dom.storeScrollControls.querySelector('[data-store-scroll="down"]');
  if (upButton instanceof HTMLButtonElement) {
    upButton.disabled = !canStoreScrollerMove(scroller, "up");
  }
  if (downButton instanceof HTMLButtonElement) {
    downButton.disabled = !canStoreScrollerMove(scroller, "down");
  }
}

function stopWallpaperScrollRepeat() {
  if (runtime.wallpaperScrollRepeatTimer) {
    window.clearInterval(runtime.wallpaperScrollRepeatTimer);
    runtime.wallpaperScrollRepeatTimer = 0;
  }
  runtime.wallpaperScrollRepeatTarget = "";
  runtime.wallpaperScrollRepeatDirection = "";
}

function startWallpaperScrollRepeat(targetId, direction) {
  stopWallpaperScrollRepeat();
  runtime.wallpaperScrollRepeatTarget = targetId;
  runtime.wallpaperScrollRepeatDirection = direction;
  scrollWallpaperTarget(targetId, direction, { smooth: false });
  runtime.wallpaperScrollRepeatTimer = window.setInterval(() => {
    if (!runtime.wallpaperScrollRepeatTarget || !runtime.wallpaperScrollRepeatDirection) {
      stopWallpaperScrollRepeat();
      return;
    }
    if (!scrollWallpaperTarget(runtime.wallpaperScrollRepeatTarget, runtime.wallpaperScrollRepeatDirection, { smooth: false })) {
      stopWallpaperScrollRepeat();
    }
  }, 130);
}

function getWallpaperScrollButtonFromEvent(event) {
  const button = event.target instanceof Element ? event.target.closest("[data-wallpaper-scroll]") : null;
  if (!(button instanceof HTMLButtonElement) || button.disabled) {
    return null;
  }
  const controls = button.closest("[data-wallpaper-scroll-controls]");
  if (!(controls instanceof HTMLElement)) {
    return null;
  }
  return { button, targetId: controls.dataset.wallpaperScrollControls || "" };
}

function handleEditDecorTrayWheel(event) {
  if (dom.editDecorTray?.hidden || !dom.editDecorTrayScroller) {
    return;
  }

  const scroller = dom.editDecorTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  if (maxScroll <= 0) {
    return;
  }

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  scroller.scrollLeft += delta;
  syncEditDecorTrayScrollControls();
}

function normalizeEditOverlayMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["fish", "decor", "tank"].includes(normalized) ? normalized : "fish";
}

function getRememberedEditOverlayMode() {
  return normalizeEditOverlayMode(getUiSettings().editOverlayMode || runtime.editOverlayMode);
}

function rememberEditOverlayMode(mode, options = {}) {
  const normalized = normalizeEditOverlayMode(mode);
  runtime.editOverlayMode = normalized;
  const settings = state.uiSettings && typeof state.uiSettings === "object"
    ? state.uiSettings
    : (state.uiSettings = {});
  const changed = settings.editOverlayMode !== normalized;
  settings.editOverlayMode = normalized;
  if (changed && options.save !== false) {
    saveState();
  }
  return normalized;
}

function closeActiveEditOverlay() {
  if (runtime.fishEditMode) {
    toggleFishEditMode(false);
    return true;
  }
  if (runtime.editTankMode) {
    toggleEditTankMode(false);
    return true;
  }
  if (runtime.tankEditMode) {
    toggleTankEditMode(false);
    return true;
  }
  return false;
}

function openEditOverlayMode(mode = null, options = {}) {
  const nextMode = rememberEditOverlayMode(mode || getRememberedEditOverlayMode());
  const openOptions = {
    source: options.source || "toolbar",
    collapseSidebar: options.collapseSidebar !== false
  };
  if (nextMode === "decor") {
    toggleEditTankMode(true, openOptions);
  } else if (nextMode === "tank") {
    toggleTankEditMode(true, openOptions);
  } else {
    toggleFishEditMode(true, openOptions);
  }
  return nextMode;
}

function toggleEditTankMode(force = null, options = {}) {
  const nextMode = typeof force === "boolean" ? force : !runtime.editTankMode;
  clearPrimaryToolModes();
  if (!nextMode) {
    hideToast({ key: TUTORIAL_TOAST_DECOR_DONE });
  }
  const now = Date.now();
  let tutorialChanged = false;

  if (nextMode) {
    rememberEditOverlayMode("decor");
    runtime.editTankMode = true;
    runtime.selectedFishId = null;
    runtime.toolModeSource = options.source || "toolbar";
    if (options.collapseSidebar) {
      runtime.sidebarCollapsed = true;
    }
  }

  if (tutorialChanged) {
    saveState();
  }
  renderUi(now);
}

function handleEditFishTrayWheel(event) {
  if (dom.editFishTray?.hidden || !dom.editFishTrayScroller) {
    return;
  }

  const scroller = dom.editFishTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  if (maxScroll <= 0) {
    return;
  }

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  scroller.scrollLeft += delta;
  syncEditFishTrayScrollControls();
}

function handleFoodTrayWheel(event) {
  if (dom.foodTray?.hidden || !dom.foodTrayScroller) {
    return;
  }

  const scroller = dom.foodTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  if (maxScroll <= 0) {
    return;
  }

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  scroller.scrollLeft += delta;
  syncFoodTrayScrollControls();
}

function handleMedicineTrayWheel(event) {
  if (dom.medicineTray?.hidden || !dom.medicineTrayScroller) {
    return;
  }

  const scroller = dom.medicineTrayScroller;
  const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  if (maxScroll <= 0) {
    return;
  }

  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (!delta) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  scroller.scrollLeft += delta;
  syncMedicineTrayScrollControls();
}

function clearPrimaryToolModes() {
  clearGuidanceForModeChange("primary-tools");
  runtime.toolbarActionMenu = "";
  runtime.editTankMode = false;
  runtime.fishEditMode = false;
  runtime.tankEditMode = false;
  runtime.foodTrayOpen = false;
  runtime.medicineTrayOpen = false;
  runtime.feedingModeFoodKey = "";
  runtime.medicineModeKey = "";
  runtime.toolModeSource = null;
  runtime.placementMode = null;
  runtime.placementPreview = null;
  runtime.cleaningMode = false;
  runtime.scoopMode = false;
  runtime.scrubAutoCompleteAt = 0;
  runtime.dragState = null;
  runtime.decorResizeState = null;
  runtime.fishDragState = null;
  runtime.eggDragState = null;
  runtime.pebbleDragState = null;
  runtime.selectedDecorId = null;
  runtime.selectedDecorIds = [];
  runtime.bubblerSettingsDecorId = null;
  runtime.customDecorSettingsDecorId = null;
  runtime.pointerDown = false;
  runtime.lastScrubPoint = null;
  resetScrubWipeSoundState();
}

function getPlacedDecorById(placedId) {
  const id = placedId ? String(placedId) : "";
  return id && Array.isArray(state?.placedDecor)
    ? state.placedDecor.find((entry) => entry.id === id) || null
    : null;
}

function normalizeDecorGroupId(groupId) {
  const value = typeof groupId === "string" ? groupId.trim() : "";
  return value || "";
}

function getDecorGroupMembers(groupId) {
  const normalizedGroupId = normalizeDecorGroupId(groupId);
  if (!normalizedGroupId || !Array.isArray(state?.placedDecor)) {
    return [];
  }
  return state.placedDecor.filter((item) => normalizeDecorGroupId(item.groupId) === normalizedGroupId);
}

function getDecorSelectionIdsForItem(item) {
  if (!item) {
    return [];
  }
  const groupId = normalizeDecorGroupId(item.groupId);
  const ids = groupId
    ? getDecorGroupMembers(groupId).map((entry) => entry.id)
    : [item.id];
  return [...new Set(ids.filter(Boolean))];
}

function getSelectedDecorIdSet() {
  return new Set((Array.isArray(runtime.selectedDecorIds) ? runtime.selectedDecorIds : [])
    .map((id) => String(id || ""))
    .filter(Boolean));
}

function getSelectedPlacedDecorItems() {
  const selectedIds = getSelectedDecorIdSet();
  if (!selectedIds.size || !Array.isArray(state?.placedDecor)) {
    return [];
  }
  return state.placedDecor.filter((item) => selectedIds.has(item.id));
}

function getDecorGroupIdsForItems(items) {
  return [...new Set((items || [])
    .map((item) => normalizeDecorGroupId(item?.groupId))
    .filter(Boolean))];
}

function isPlacedDecorGrouped(itemOrId) {
  const item = typeof itemOrId === "string" ? getPlacedDecorById(itemOrId) : itemOrId;
  return Boolean(normalizeDecorGroupId(item?.groupId));
}

function isAdditiveDecorSelectionEvent(event) {
  return Boolean(event?.shiftKey || event?.ctrlKey || event?.metaKey);
}

function syncSelectedDecorIds() {
  if (!Array.isArray(state?.placedDecor) || !state.placedDecor.length) {
    runtime.selectedDecorId = null;
    runtime.selectedDecorIds = [];
    runtime.bubblerSettingsDecorId = null;
    runtime.customDecorSettingsDecorId = null;
    return [];
  }

  const existingIds = new Set(state.placedDecor.map((item) => item.id));
  const requestedIds = [
    runtime.selectedDecorId,
    ...(Array.isArray(runtime.selectedDecorIds) ? runtime.selectedDecorIds : [])
  ].map((id) => String(id || "")).filter((id) => id && existingIds.has(id));
  const expandedIds = [];
  for (const id of requestedIds) {
    const item = getPlacedDecorById(id);
    for (const expandedId of getDecorSelectionIdsForItem(item)) {
      if (existingIds.has(expandedId) && !expandedIds.includes(expandedId)) {
        expandedIds.push(expandedId);
      }
    }
  }

  runtime.selectedDecorIds = expandedIds;
  runtime.selectedDecorId = expandedIds.includes(runtime.selectedDecorId)
    ? runtime.selectedDecorId
    : (expandedIds[0] || null);
  if (runtime.bubblerSettingsDecorId && !existingIds.has(runtime.bubblerSettingsDecorId)) {
    runtime.bubblerSettingsDecorId = null;
  }
  if (runtime.customDecorSettingsDecorId && !existingIds.has(runtime.customDecorSettingsDecorId)) {
    runtime.customDecorSettingsDecorId = null;
  }
  return expandedIds;
}

function groupSelectedDecor() {
  const selectedItems = getSelectedPlacedDecorItems();
  if (selectedItems.length < 2) {
    showToast("Shift-click at least two decor pieces first.");
    return false;
  }

  const existingGroupIds = getDecorGroupIdsForItems(selectedItems);
  const targetGroupId = existingGroupIds[0] || createId("decor-group");
  const affectedIds = new Set(selectedItems.map((item) => item.id));
  for (const groupId of existingGroupIds) {
    for (const member of getDecorGroupMembers(groupId)) {
      affectedIds.add(member.id);
    }
  }

  const affectedItems = state.placedDecor.filter((item) => affectedIds.has(item.id));
  for (const item of affectedItems) {
    item.groupId = targetGroupId;
  }
  syncDecorGroupToLargestResizeAnchor(affectedItems, { deriveMissing: true });

  runtime.selectedDecorIds = affectedItems.map((item) => item.id);
  runtime.selectedDecorId = selectedItems[0]?.id || affectedItems[0]?.id || null;
  saveState();
  renderUi(Date.now());
  showToast(existingGroupIds.length ? "Added decor to the group." : "Decor grouped.");
  return true;
}

function ungroupSelectedDecor() {
  const selectedItems = getSelectedPlacedDecorItems();
  const groupIds = getDecorGroupIdsForItems(selectedItems);
  if (!groupIds.length) {
    showToast("Select a grouped decor piece first.");
    return false;
  }

  const ungroupedIds = [];
  for (const item of state.placedDecor) {
    if (groupIds.includes(normalizeDecorGroupId(item.groupId))) {
      delete item.groupId;
      ungroupedIds.push(item.id);
    }
  }

  runtime.selectedDecorIds = ungroupedIds.length ? [ungroupedIds[0]] : [];
  runtime.selectedDecorId = runtime.selectedDecorIds[0] || null;
  saveState();
  renderUi(Date.now());
  showToast("Decor ungrouped.");
  return true;
}

function getSelectedPlacedDecor() {
  syncSelectedDecorIds();
  if (!runtime.selectedDecorId) {
    return null;
  }

  const item = getPlacedDecorById(runtime.selectedDecorId);
  if (!item) {
    runtime.selectedDecorId = null;
    runtime.selectedDecorIds = [];
  }
  return item;
}

function setSelectedDecor(placedId, options = {}) {
  const nextId = placedId ? String(placedId) : null;
  if (!nextId) {
    runtime.selectedDecorId = null;
    runtime.selectedDecorIds = [];
    runtime.bubblerSettingsDecorId = null;
    runtime.customDecorSettingsDecorId = null;
    return null;
  }

  const item = getPlacedDecorById(nextId);
  const itemSelectionIds = getDecorSelectionIdsForItem(item);
  if (item && options.additive) {
    const currentIds = getSelectedDecorIdSet();
    const alreadySelected = itemSelectionIds.every((id) => currentIds.has(id));
    for (const id of itemSelectionIds) {
      if (alreadySelected) {
        currentIds.delete(id);
      } else {
        currentIds.add(id);
      }
    }
    runtime.selectedDecorIds = [...currentIds].filter((id) => getPlacedDecorById(id));
    runtime.selectedDecorId = runtime.selectedDecorIds.includes(item.id)
      ? item.id
      : (runtime.selectedDecorIds[0] || null);
  } else {
    runtime.selectedDecorIds = item ? itemSelectionIds : [];
    runtime.selectedDecorId = item ? item.id : null;
  }

  if (item) {
    runtime.decorPlacementLayer = getDecorTankLayer(item);
  }
  return item;
}

function clearSelectedDecor(placedId = null) {
  const selectedIds = syncSelectedDecorIds();
  if (!selectedIds.length) {
    return false;
  }

  if (placedId && !selectedIds.includes(String(placedId))) {
    return false;
  }

  runtime.selectedDecorId = null;
  runtime.selectedDecorIds = [];
  if (!placedId || selectedIds.includes(runtime.bubblerSettingsDecorId)) {
    runtime.bubblerSettingsDecorId = null;
  }
  if (!placedId || selectedIds.includes(runtime.customDecorSettingsDecorId)) {
    runtime.customDecorSettingsDecorId = null;
  }
  return true;
}

function getActiveDecorShortcutTarget() {
  if (runtime.dragState) {
    return {
      mode: "drag",
      decorKey: runtime.dragState.decorKey,
      item: state?.placedDecor?.find((entry) => entry.id === runtime.dragState.placedId) || null
    };
  }

  if (runtime.placementMode) {
    return {
      mode: "placement",
      decorKey: runtime.placementMode.decorKey,
      item: null
    };
  }

  const item = getSelectedPlacedDecor();
  if (!item) {
    return null;
  }

  return {
    mode: "selected",
    decorKey: item.decorKey,
    item
  };
}

function hasToolbarTriggeredToolMode() {
  return runtime.cleaningMode
    || runtime.scoopMode
    || runtime.foodTrayOpen
    || runtime.medicineTrayOpen
    || Boolean(runtime.feedingModeFoodKey)
    || Boolean(runtime.medicineModeKey)
    || runtime.fishEditMode
    || (runtime.editTankMode && runtime.toolModeSource === "toolbar");
}

function toggleFishEditMode(force = null, options = {}) {
  const nextMode = typeof force === "boolean" ? force : !runtime.fishEditMode;
  clearPrimaryToolModes();
  const now = Date.now();
  let tutorialChanged = false;

  if (nextMode) {
    rememberEditOverlayMode("fish");
    runtime.fishEditMode = true;
    runtime.toolModeSource = options.source || "toolbar";
    if (options.collapseSidebar) {
      runtime.sidebarCollapsed = true;
    }
    tutorialChanged = beginTutorialFeatureStep(TUTORIAL_FEATURE_MANAGE_FISH) || tutorialChanged;
  } else {
    tutorialChanged = finishTutorialFeatureStep(TUTORIAL_FEATURE_MANAGE_FISH, now) || tutorialChanged;
  }

  if (tutorialChanged) {
    saveState();
  }
  renderUi(now);
}

function toggleTankEditMode(force = null, options = {}) {
  const nextMode = typeof force === "boolean" ? force : !runtime.tankEditMode;
  clearPrimaryToolModes();
  const now = Date.now();

  if (nextMode) {
    rememberEditOverlayMode("tank");
    runtime.tankEditMode = true;
    runtime.selectedFishId = null;
    runtime.toolModeSource = options.source || "toolbar";
    if (options.collapseSidebar) {
      runtime.sidebarCollapsed = true;
    }
  }

  renderUi(now);
}

function toggleToolbarTrayMode(config, force = null, options = {}) {
  const forcedOpen = typeof config.forceOpen === "function" ? config.forceOpen() : false;
  const nextMode = forcedOpen
    ? true
    : (typeof force === "boolean" ? force : !(config.isOpen() || config.hasSelection()));
  clearPrimaryToolModes();
  const now = Date.now();
  let tutorialChanged = false;
  resetCompetingOverlayState({
    now,
    reason: config.reason,
    clearPendingState: false,
    clearExternalLink: false
  });

  if (nextMode) {
    tutorialChanged = config.onOpen(now, options) || tutorialChanged;
  }

  if (tutorialChanged) {
    saveState();
  }
  renderUi(now);
}

function toggleFoodTray(force = null, options = {}) {
  toggleToolbarTrayMode({
    reason: "food-tray",
    forceOpen: () => isGuidedTutorialActive() && isTutorialStage(TUTORIAL_STAGE_FEED_FISH),
    isOpen: () => runtime.foodTrayOpen,
    hasSelection: () => Boolean(runtime.feedingModeFoodKey),
    onOpen(now, toggleOptions) {
      let tutorialChanged = false;
      if (isInfoOnlyTutorialActive() && isTutorialStage(TUTORIAL_STAGE_FEED_FISH)) {
        runtime.foodTrayOpen = false;
        runtime.feedingModeFoodKey = "";
        runtime.toolModeSource = null;
        return setTutorialStage(TUTORIAL_STAGE_FEED_FISH_DONE, { now });
      }
      runtime.foodTrayOpen = true;
      runtime.toolModeSource = toggleOptions.source || "toolbar";
      if (toggleOptions.collapseSidebar) {
        runtime.sidebarCollapsed = true;
      }
      return tutorialChanged;
    }
  }, force, options);
}

function toggleMedicineTray(force = null, options = {}) {
  toggleToolbarTrayMode({
    reason: "medicine-tray",
    isOpen: () => runtime.medicineTrayOpen,
    hasSelection: () => Boolean(runtime.medicineModeKey),
    onOpen(_now, toggleOptions) {
      runtime.medicineTrayOpen = true;
      runtime.toolModeSource = toggleOptions.source || "toolbar";
      if (toggleOptions.collapseSidebar) {
        runtime.sidebarCollapsed = true;
      }
      return false;
    }
  }, force, options);
}

function renderCollapsibleSections() {
  const deadFishExists = state.fish.some((fish) => isFishDead(fish));

  document.querySelectorAll("[data-collapsible-section]").forEach((section) => {
    const key = section.dataset.collapsibleSection;
    const button = section.querySelector("[data-collapsible-toggle]");
    const body = section.querySelector("[data-collapsible-body]");
    const icon = section.querySelector("[data-collapsible-icon]");

    if (!button || !body) {
      return;
    }

    const disabled = false;
    const collapsed = disabled ? true : isSidebarSectionCollapsed(key);

    section.classList.toggle("is-collapsed", collapsed);
    button.disabled = disabled;
    button.classList.toggle("is-disabled", disabled);
    button.setAttribute("aria-expanded", String(!collapsed));

    if (disabled) {
      button.setAttribute("aria-disabled", "true");
    } else {
      button.removeAttribute("aria-disabled");
    }

    body.hidden = collapsed;

    if (icon) {
      icon.textContent = collapsed ? "\u25BE" : "\u25B4";
    }
  });
}

async function init() {
  await loadAppConfig();
  await prepareDesktopSaveStorage();
  installDesktopCloseBackupHandler();
  applyAspectRatioMode();
  setupDebugMenuButtons();
  bindEvents();
  syncFilterFeatureVisibility();
  const earlyRawState = loadState();
  applyLoadingOverlayBackground(getSavedActiveTankCandidate(earlyRawState));

  const [backgroundResponse, tankResponse, filterResponse, fishResponse, gravelResponse, bubbleResponse, decorResponse, suckerFishResponse, fishCatalog, zombieSkeletonFishCatalog, decorCatalog, filterCatalogMeta, backgroundCatalogMeta, foodAndMedCatalog] = await Promise.all([
    fetchAssetList("backgrounds"),
    fetchAssetList("tank"),
    fetchAssetList("filter"),
    fetchAssetList("fish"),
    fetchAssetList("gravel"),
    fetchAssetList("bubbles"),
    fetchAssetList("decor"),
    fetchAssetList("sucker-fish"),
    fetchFishCatalog(),
    fetchZombieSkeletonFishCatalog(),
    fetchDecorCatalog(),
    fetchFilterCatalogMeta(),
    fetchBackgroundCatalogMeta(),
    fetchFoodAndMedCatalog()
  ]);

  runtime.suckerFishCatalog = suckerFishResponse;
  const baseFishResponse = fishResponse.filter((item) => !isZombieSkeletonAssetFile(item));
  const normalizedDecorMeta = normalizeDecorMeta(decorCatalog);
  const normalizedFilterMeta = normalizeFilterMeta(filterCatalogMeta);
  runtime.decorMeta = normalizedDecorMeta;
  runtime.foodAndMedCatalog = normalizeFoodAndMedCatalog(foodAndMedCatalog);
  const normalizedBaseFishCatalog = normalizeFishCatalog(fishCatalog, {
    assetFolders: {
      fish: baseFishResponse,
      "sucker-fish": suckerFishResponse
    },
    includeZombieSkeletonStageAssets: false,
    allowZombieSkeletonFish: false
  });
  const normalizedZombieSkeletonFishCatalog = ZOMBIE_SKELETON_BEHAVIOR_ENABLED
    ? normalizeFishCatalog(zombieSkeletonFishCatalog, {
      assetFolders: {},
      includeZombieSkeletonStageAssets: false,
      allowZombieSkeletonFish: true
    })
    : [];
  // Seasonal artwork is merged into ordinary species metadata even while the
  // separate undead gameplay/catalog feature remains disabled. This exposes
  // images to the display resolver without changing species or behavior.
  const normalizedFishCatalog = [
    ...mergeZombieSkeletonStageAssets(normalizedBaseFishCatalog, zombieSkeletonFishCatalog, { resolveAppUrl }),
    ...normalizedZombieSkeletonFishCatalog
  ];
  runtime.fishCatalog = [
    ...normalizedFishCatalog,
    ...buildVirtualFishCatalogEntries()
  ];
  runtime.fishMap = new Map(normalizedFishCatalog.map((fish) => [fish.id, fish]));
  runtime.fishSizeRange = buildFishSizeRange(runtime.fishCatalog);
  runtime.fishCostRange = buildFishCostRange(runtime.fishCatalog);
  const normalizedBackgroundMeta = normalizeBackgroundMeta(backgroundCatalogMeta);
  runtime.backgroundCatalog = buildBackgroundCatalog(backgroundResponse, normalizedBackgroundMeta);
  runtime.tankCatalog = buildSimpleAssetCatalog(tankResponse, {}, "");
  runtime.filterCatalog = buildFilterCatalog(filterResponse, normalizedFilterMeta);
  runtime.customGravelLayerCatalog = buildCustomGravelLayerCatalog(gravelResponse);
  runtime.customGravelPebbleCatalog = buildCustomGravelPebbleCatalog(gravelResponse);
  runtime.gravelCatalog = [...runtime.customGravelPebbleCatalog];
  runtime.bubbleCatalog = buildSimpleAssetCatalog(bubbleResponse, BUBBLE_META, "");
  runtime.decorCatalog = [
    ...buildDecorCatalog(decorResponse, normalizedDecorMeta),
    ...buildVirtualDecorCatalogEntries()
  ];
  runtime.backgroundMap = new Map(runtime.backgroundCatalog.map((item) => [item.key, item]));
  runtime.tankMap = new Map(runtime.tankCatalog.map((item) => [item.key, item]));
  runtime.filterMap = new Map(runtime.filterCatalog.map((item) => [item.key, item]));
  runtime.gravelMap = new Map(runtime.gravelCatalog.map((item) => [item.key, item]));
  runtime.bubbleMap = new Map(runtime.bubbleCatalog.map((item) => [item.key, item]));
  runtime.decorMap = new Map(runtime.decorCatalog.map((item) => [item.key, item]));
  runtime.scene = createSceneSeeds();

  const rawState = earlyRawState || loadState();
  const needsReconcileSave = shouldPersistReconciledState(rawState);
  state = reconcileState(rawState);
  const customImagesChanged = await hydrateCustomImagesFromStorage(state);
  const wallpaperEnginePropertyChanged = applyPendingWallpaperEngineUserProperties({
    save: false,
    render: false,
    showToast: false
  });
  syncRuntimeCustomFishAssetsFromState(state);
  syncRuntimeCustomDecorAssetsFromState(state);
  const tutorialResumeChanged = restoreTutorialRuntimeState(Date.now());
  applyContentSettingsEffects(Date.now());

  await preloadImages(filterPreloadPathsForCurrentContentSettings([
    ...runtime.backgroundCatalog
      .filter((item) => !isLocalImageBackgroundKey(item.key))
      .map((item) => item.path),
    ...getAllTanks().map((tank) => getLocalBackgroundImageDataUrl(tank)).filter(Boolean),
    ...runtime.tankCatalog.map((item) => item.path),
    ...runtime.filterCatalog.map((item) => item.path),
    ...runtime.gravelCatalog.map((item) => item.path),
    ...runtime.customGravelLayerCatalog.map((item) => item.path),
    ...runtime.customGravelPebbleCatalog.map((item) => item.path),
    ...runtime.bubbleCatalog.map((item) => item.path),
    AUTO_DISPENSER_IMAGE_PATH,
    AUTO_DISPENSER_BG_PATH,
    ...(ENABLE_UV_LIGHT ? [UV_LIGHT_IMAGE_PATH] : []),
    resolveAppUrl(OPTIONAL_BUBBLE_ORB_ASSET_PATH),
    CAUSTIC_LIGHT_ASSET_PATH,
    resolveAppUrl(POOP_ASSET_PATH),
    FISH_EGG_ASSET_PATH,
    FISH_EGG_CRACKED_ASSET_PATH,
    FISH_EGG_SHELL_ASSET_PATH,
    ...GRIME_OVERLAY_ASSET_PATHS,
    ...WATER_PARTICLE_ASSET_PATHS,
    ...Object.values(TOOL_CURSOR_ICON_PATHS),
    ...runtime.decorCatalog.flatMap((item) => [
      item.path,
      item.thumbnailPath,
      item.bgPath,
      item.midPath,
      item.maskPath,
      item.triggerPath,
      item.seatsPath,
      ...(Array.isArray(item.caveColorLayers)
        ? item.caveColorLayers.flatMap((layer) => [
          ...(Array.isArray(layer.paths) ? layer.paths : [layer.path]),
          ...(Array.isArray(layer.legacyPaths) ? layer.legacyPaths : [])
        ])
        : [])
    ].filter(Boolean)),
    ...getCustomDecorCatalogEntries(state).flatMap((item) => [item.path, item.bgPath].filter(Boolean)),
    ...getCustomFishCatalogEntries(state).map((item) => item.asset),
    runtime.foodAndMedCatalog?.fallbackImage,
    FOOD_PELLET_IMAGE_PATH,
    ...Object.values(runtime.foodAndMedCatalog?.items?.food || {}).flatMap((entry) => [
      entry.image ? resolveFoodAndMedAssetPath(entry.image) : "",
      ...(Array.isArray(entry.dropImages) ? entry.dropImages : [])
    ].filter(Boolean)),
    ...Object.values(runtime.foodAndMedCatalog?.items?.medicine || {}).flatMap((entry) => [
      entry.image ? resolveFoodAndMedAssetPath(entry.image) : ""
    ].filter(Boolean)),
    ...new Set(runtime.fishCatalog.flatMap((fish) => [
      ...getFishAssetVariants(fish),
      ...getFishSeasonalAssetCandidates(fish),
      ...getFishDeathAssetCandidates(fish, "zombie"),
      ...getFishDeathAssetCandidates(fish, "skeleton")
    ])),
    ...Object.values(SUCKER_FISH_FRONT_GLASS_ASSET_BY_SPECIES).map((path) => resolveAppUrl(path)),
    ...Object.values(SUCKER_FISH_FREE_SWIM_ASSET_BY_SPECIES).map((path) => resolveAppUrl(path))
  ]), { maxAttempts: 1 });

  const criticalFishImagePaths = [...new Set(getAllTankFish(state)
    .map((fish) => {
      const species = getSpeciesForFish(fish);
      return species ? (getFishDisplayAssetPath(fish, species, Date.now()) || species.asset) : "";
    })
    .filter(Boolean))];
  const criticalFishImageResults = await preloadImages(criticalFishImagePaths, {
    maxAttempts: 3,
    timeoutMs: 8000,
    retryDelayMs: 350
  });
  const unavailableFishImages = criticalFishImageResults.filter((result) => !result.loaded);
  if (unavailableFishImages.length) {
    console.error("Some active fish artwork is unavailable after startup recovery.", unavailableFishImages);
  }

  resizeDisplayCanvases();
  const now = Date.now();
  const decorPlacementChanged = normalizePlacedDecorState();
  const stateChanged = syncState(now);
  if (needsReconcileSave || customImagesChanged || wallpaperEnginePropertyChanged || tutorialResumeChanged || decorPlacementChanged || stateChanged) {
    saveState();
  }
  renderUi(now);
  applyLoadingOverlayBackground();
  renderTank(now);
  syncAmbienceAudio();
  window.setInterval(() => tick(), 1000);
  window.requestAnimationFrame(animationLoop);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(showLoadingOverlayReadyState);
  });
}

function showLoadingOverlayReadyState() {
  const overlay = dom.loadingOverlay;
  if (!overlay || overlay.hidden || overlay.classList.contains("is-hiding")) {
    return;
  }

  if (isHardwareAccelerationNoticeBlockingStart()) {
    overlay.classList.remove("is-ready");
    overlay.classList.remove("is-error");
    if (dom.loadingOverlayText) {
      dom.loadingOverlayText.textContent = "Loading Aquarium";
    }
    return;
  }

  overlay.classList.remove("is-error");
  overlay.classList.add("is-ready");
  if (dom.loadingOverlayText) {
    dom.loadingOverlayText.textContent = isWallpaperEngineModeEnabled() ? "Starting Aquarium" : "Click to play";
  }

  if (isWallpaperEngineModeEnabled()) {
    primeSoundEffects();
    window.requestAnimationFrame(hideLoadingOverlay);
  }
}

function quoteCssUrl(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function getSavedActiveTankCandidate(rawState) {
  const source = rawState && typeof rawState === "object" ? rawState : null;
  if (!source) {
    return null;
  }
  if (Array.isArray(source.tanks) && source.tanks.length) {
    return source.tanks.find((tank) => tank?.id === source.activeTankId) || source.tanks[0] || null;
  }
  return source;
}

function getLoadingOverlayBackgroundConfig(target = getCurrentTank()) {
  if (!target) {
    return null;
  }

  const backgroundKey = target.selectedBackground || DEFAULT_TANK_BACKGROUND_ASSET_KEY;
  const background = runtime.backgroundMap.get(backgroundKey) || {
    key: backgroundKey,
    path: resolveAppUrl(`assets/backgrounds/${encodeURIComponent(backgroundKey)}`)
  };
  if (isLocalImageBackgroundKey(backgroundKey)) {
    const localImageUrl = getLocalBackgroundImageDataUrl(target);
    if (localImageUrl) {
      return { type: "image", imageUrl: localImageUrl };
    }
  }

  if (backgroundKey && !isCustomBackgroundKey(backgroundKey) && !isLocalImageBackgroundKey(backgroundKey) && background.path) {
    return { type: "image", imageUrl: background.path };
  }

  if (isCustomBackgroundKey(backgroundKey)) {
    const mode = getActiveCustomBackgroundMode(target);
    if (mode === CUSTOM_BACKGROUND_MODE_GRADIENT) {
      const { start, end } = getActiveGradientBackgroundColors(target);
      return {
        type: "fill",
        backgroundImage: `linear-gradient(135deg, ${start}, ${end})`,
        disableUnderwater: true
      };
    }
    if (mode === CUSTOM_BACKGROUND_MODE_SOLID) {
      const color = getActiveSolidBackgroundColor(target);
      return {
        type: "fill",
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${color} 88%, white 12%), ${color})`,
        disableUnderwater: true
      };
    }
  }

  return {
    type: "animated",
    declarations: getAnimatedBackgroundCssDeclarations(target)
  };
}

function applyLoadingOverlayBackground(target = getCurrentTank()) {
  const backgroundLayer = dom.loadingOverlayBackground;
  const underwaterLayer = dom.loadingOverlayUnderwater;
  if (!(backgroundLayer instanceof HTMLElement)) {
    return;
  }

  const config = getLoadingOverlayBackgroundConfig(target);
  backgroundLayer.classList.remove("is-image-background");
  backgroundLayer.style.removeProperty("background-image");
  backgroundLayer.style.removeProperty("background-size");
  backgroundLayer.style.removeProperty("background-position");
  backgroundLayer.style.removeProperty("background-repeat");
  if (underwaterLayer instanceof HTMLElement) {
    underwaterLayer.hidden = false;
  }

  for (const property of [
    "--underwater-surface-bloom-rgb",
    "--underwater-shadow-bloom-rgb",
    "--underwater-surface",
    "--underwater-mid",
    "--underwater-deep",
    "--underwater-abyss",
    "--underwater-highlight-rgb",
    "--underwater-drift-a-rgb",
    "--underwater-drift-b-rgb",
    "--underwater-drift-c-rgb"
  ]) {
    backgroundLayer.style.removeProperty(property);
    underwaterLayer?.style?.removeProperty?.(property);
  }

  if (!config) {
    return;
  }

  if (config.type === "image") {
    backgroundLayer.classList.add("is-image-background");
    backgroundLayer.style.backgroundImage = [
      "linear-gradient(180deg, rgba(2, 10, 18, 0.12), rgba(2, 10, 18, 0.42))",
      `url(${quoteCssUrl(config.imageUrl)})`
    ].join(", ");
    backgroundLayer.style.backgroundSize = "cover";
    backgroundLayer.style.backgroundPosition = "center";
    backgroundLayer.style.backgroundRepeat = "no-repeat";
    return;
  }

  if (config.backgroundImage) {
    backgroundLayer.style.backgroundImage = config.backgroundImage;
  }

  if (underwaterLayer instanceof HTMLElement && config.disableUnderwater) {
    underwaterLayer.hidden = true;
  }

  if (Array.isArray(config.declarations)) {
    for (const declaration of config.declarations) {
      const [rawName, ...rawValueParts] = String(declaration || "").split(":");
      const propertyName = rawName?.trim();
      const value = rawValueParts.join(":").trim();
      if (propertyName && value) {
        backgroundLayer.style.setProperty(propertyName, value);
        underwaterLayer?.style?.setProperty?.(propertyName, value);
      }
    }
  }
}

function hideLoadingOverlay() {
  const overlay = dom.loadingOverlay;
  if (!overlay || overlay.hidden || overlay.classList.contains("is-hiding")) {
    return;
  }

  let completed = false;
  const complete = () => {
    if (completed) {
      return;
    }
    completed = true;
    overlay.classList.remove("is-ready");
    overlay.hidden = true;
    overlay.removeEventListener("transitionend", complete);
    if (isTutorialStage(TUTORIAL_STAGE_SPLASH) && state?.tutorial) {
      const now = Date.now();
      state.tutorial.stageEnteredAt = now;
      saveState();
      renderUi(now, { full: false });
    }
    syncAmbienceAudio();
    maybeShowHardwareAccelerationNotice();
  };

  if (isTutorialStage(TUTORIAL_STAGE_SPLASH) && state?.tutorial) {
    renderUi(Date.now(), { full: false });
  }
  overlay.addEventListener("transitionend", complete, { once: true });
  overlay.classList.remove("is-ready");
  overlay.classList.add("is-hiding");
  syncAmbienceAudio();

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    complete();
    return;
  }

  window.setTimeout(complete, 1200);
}

function showLoadingOverlayError(error = null) {
  const overlay = dom.loadingOverlay;
  if (!overlay) {
    return;
  }

  overlay.hidden = false;
  overlay.classList.remove("is-ready");
  overlay.classList.remove("is-hiding");
  overlay.classList.add("is-error");
  const errorMessage = String(error?.message || error || "Aquarium startup failed");
  const errorStack = typeof error?.stack === "string" ? error.stack : "";
  const errorDetails = [errorMessage, errorStack]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 6000);
  overlay.title = errorMessage;
  overlay.dataset.startupError = errorDetails;
  const text = dom.loadingOverlayText || overlay.querySelector(".loading-overlay-text");
  if (text) {
    text.textContent = window.location.protocol === "file:"
      ? "Open with Launch Bubble Borough Web.bat"
      : "Aquarium failed to load";
  }
  const details = overlay.querySelector("[data-loading-error-details]");
  if (details) {
    details.textContent = errorDetails;
    details.hidden = !errorDetails;
  }
  const actions = overlay.querySelector("[data-loading-error-actions]");
  if (actions) {
    actions.hidden = window.location.protocol === "file:";
  }
}

function applyAspectRatioMode() {
  const aspectRatioLocked = isAspectRatioLocked();
  document.body.classList.toggle("fixed-16-9-aspect-ratio", aspectRatioLocked);
}

function isDebugModeEnabled() {
  return runtime.debugToolsEnabled === true;
}

function setupDebugMenuButtons() {
  const moveButton = (button, container, iconMarkup, label, extraClass = "", before = null) => {
    if (!button || !container) {
      return;
    }

    button.className = `debug-menu-button${extraClass ? ` ${extraClass}` : ""}`;
    button.innerHTML = `
      <span class="debug-menu-icon">${iconMarkup}</span>
      <span>${label}</span>
    `;
    if (before && before.parentElement === container) {
      container.insertBefore(button, before);
    } else {
      container.appendChild(button);
    }
  };
  const ensureBehaviorButton = (config) => {
    if (!config?.id || !config?.domKey) {
      return null;
    }

    let button = dom[config.domKey] || document.querySelector(`#${config.id}`);
    if (!button) {
      button = document.createElement("button");
      button.id = config.id;
      button.type = "button";
    }
    button.dataset.debugBehaviorAction = config.action;
    button.setAttribute("data-preserve-fish-selection", "");
    button.title = config.title || `Debug: ${config.label}`;
    button.setAttribute("aria-label", config.title || `Debug: ${config.label}`);
    dom[config.domKey] = button;
    return button;
  };

  moveButton(
    dom.addCoinsButton,
    dom.debugMenuGameState,
    buildCoinIconMarkup("debug-menu-coin-icon", { decorative: true }),
    "Add 10 coins",
    "",
    dom.addHundredCoinsButton
  );
  moveButton(dom.resetMealsButton, dom.debugMenuGameState, "&#127860;", "Reset Meals", "", dom.completeMealsButton);
  moveButton(dom.debugDailyRecapButton, dom.debugMenuGameState, "&#128276;", "Daily Bonus Prompt", "wide");
  moveButton(dom.debugFishBehaviorLogButton, dom.debugMenuGameState, "&#128200;", "Export Log Data", "wide");

  moveButton(dom.debugBreedButton, dom.debugMenuFish, "&#129370;", "Make Baby", "", dom.debugInfectFishButton);
  moveButton(dom.debugDamageFishButton, dom.debugMenuFish, "&#128148;", "Hurt Selected Fish", "", dom.debugInfectFishButton);
  moveButton(dom.resetFishHealthButton, dom.debugMenuFish, "&#128150;", "Restore Fish Health", "", dom.debugInfectFishButton);

  moveButton(dom.maxDirtButton, dom.debugMenuDirtiness, "&#128169;", "+10% Dirtiness");
  if (dom.maxDirtButton && dom.debugMaxDirtinessButton && dom.debugMenuDirtiness) {
    dom.debugMenuDirtiness.insertBefore(dom.maxDirtButton, dom.debugMaxDirtinessButton);
  }

  moveButton(dom.debugGravelDigButton, dom.debugMenuBehaviors, "&#128371;&#65039;", "Dig");
  moveButton(dom.debugGravelPebbleButton, dom.debugMenuBehaviors, "&#129704;", "Pebble");
  moveButton(dom.debugCaveButton, dom.debugMenuBehaviors, "&#9968;&#65039;", "Cave");
  // TODO(debug-menu behavior): Additional Fish Behaviors will go here.
  for (const config of DEBUG_BEHAVIOR_BUTTON_CONFIGS) {
    moveButton(
      ensureBehaviorButton(config),
      dom.debugMenuBehaviors,
      config.icon,
      config.label,
      config.extraClass || ""
    );
  }
}

function toggleDebugSidebar() {
  if (!isDebugModeEnabled()) {
    runtime.debugSidebarOpen = false;
    return;
  }

  runtime.debugSidebarOpen = !runtime.debugSidebarOpen;
  renderUi(Date.now(), { full: false });
}

function isAspectRatioLocked() {
  return runtime.aspectRatioLocked === true;
}

function getDebugFishDisplayName(fish, species = getSpeciesForFish(fish)) {
  const name = typeof fish?.name === "string" && fish.name.trim()
    ? fish.name.trim()
    : "";
  return name || species?.name || "Fish";
}

function getDebugFishBehaviorSnapshot(fish, species = getSpeciesForFish(fish), now = Date.now()) {
  if (!fish || !species) {
    return null;
  }

  const effectiveBehavior = getEffectiveFishBehavior(fish, species) || "steady";
  const activity = typeof fish.activity === "string" && fish.activity
    ? fish.activity
    : "roam";
  const activeLayer = getFishTankLayer(fish);
  const desiredLayer = getDesiredFishTankLayer(fish);
  const targetX = clamp(Number(fish.targetXNorm) || Number(fish.xNorm) || 0.5, 0, 1);
  const targetY = clamp(Number(fish.targetYNorm) || Number(fish.yNorm) || 0.5, 0, 1);
  const targetBucket = `${Math.round(targetX * 20)},${Math.round(targetY * 20)}`;
  const targetText = `${Math.round(targetX * 100)},${Math.round(targetY * 100)}`;
  const comfort = getFishComfort(fish, now);
  const comfortValue = clamp(Number(comfort?.value) || 0, 0, 1);
  const healthUnits = Math.max(0, Math.round(Number(fish.healthUnits) || 0));
  const maxHealthUnits = Math.max(1, Math.round(Number(getFishMaxHealthUnits(fish)) || 1));
  const displayName = getDebugFishDisplayName(fish, species);
  const detailParts = [];
  const signatureParts = [
    effectiveBehavior,
    activity,
    `layer:${activeLayer}>${desiredLayer}`,
    `health:${healthUnits}`,
    `comfort:${Math.round(comfortValue * 10)}`
  ];

  const breedingSequence = runtime.fishBreedingSequence || runtime.debugBreedingSequence;
  const breedingRole = breedingSequence
    ? (fish.id === breedingSequence.leftFishId
      ? "left"
      : (fish.id === breedingSequence.rightFishId ? "right" : ""))
    : "";
  const gravelAction = getFishGravelPebbleAction(fish);
  const caveState = typeof fish.caveState === "string" && fish.caveState ? fish.caveState : "";
  const panicActive = Number.isFinite(Number(fish.panicUntil)) && now < Number(fish.panicUntil);
  const feedingPelletId = typeof fish.feedingPelletId === "string" && fish.feedingPelletId
    ? fish.feedingPelletId
    : "";
  const hangoutDecorId = typeof fish.hangoutDecorId === "string" && fish.hangoutDecorId
    ? fish.hangoutDecorId
    : "";
  const blockedDecorId = typeof fish.blockedDecorId === "string" && fish.blockedDecorId
    ? fish.blockedDecorId
    : "";

  if (hasPendingZombieRevival(fish)) {
    detailParts.push("reviving soon");
  } else if (isFishDead(fish)) {
    detailParts.push(isFishBeingConsumedByPiranhas(fish, now) ? "being consumed" : "dead drift");
  } else if (breedingRole) {
    detailParts.push(`debug breeding ${breedingRole}`);
  } else if (caveState) {
    detailParts.push(`cave ${caveState}`);
  } else if (activity === "feeding") {
    detailParts.push(feedingPelletId ? "chasing pellet" : "seeking food");
  } else if (activity === FISH_GRAVEL_PEBBLE_ACTIVITY) {
    detailParts.push(`gravel ${gravelAction?.stage || "play"}`);
  } else if (panicActive) {
    detailParts.push("panic swim");
  } else if (hasZombieBiteInfection(fish)) {
    detailParts.push("zombie bite reaction");
  } else if (hangoutDecorId) {
    detailParts.push(`hangout ${fish.hangoutZoneType || "decor"}`);
  } else if (blockedDecorId) {
    detailParts.push("rerouting around decor");
  } else if (effectiveBehavior === "sucker") {
    detailParts.push("glass grazing");
  } else if (effectiveBehavior === "piranha") {
    detailParts.push(getActivePiranhaPrey(now) ? "swarm hunting" : "predator patrol");
  } else if (effectiveBehavior === "zombie") {
    detailParts.push("zombie hunt");
  } else if (effectiveBehavior === "skeleton") {
    detailParts.push("skeleton patrol");
  } else {
    detailParts.push("free swim");
  }

  if (runtime.debugNightCaveMode && isDebugCaveTestFish(fish)) {
    detailParts.push("debug cave loop");
  }
  if (feedingPelletId) {
    detailParts.push(`pellet ${feedingPelletId.slice(-6)}`);
  }
  if (caveState) {
    signatureParts.push(`cave:${caveState}`);
  }
  if (breedingRole) {
    signatureParts.push(`breed:${breedingRole}`);
  }
  if (gravelAction?.stage) {
    signatureParts.push(`gravel:${gravelAction.stage}`);
  }
  if (feedingPelletId) {
    signatureParts.push(`pellet:${feedingPelletId}`);
  }
  if (hangoutDecorId) {
    signatureParts.push(`hangout:${hangoutDecorId}:${fish.hangoutZoneType || ""}`);
  }
  if (blockedDecorId) {
    signatureParts.push(`blocked:${blockedDecorId}`);
  }
  if (panicActive) {
    signatureParts.push("panic");
  }
  if (runtime.debugNightCaveMode && isDebugCaveTestFish(fish)) {
    signatureParts.push("debug-cave");
  }
  if (activity !== "feeding") {
    signatureParts.push(`target:${targetBucket}`);
  }
  const diseaseState = sanitizeDiseaseState(fish.diseaseState);
  const recentDiseaseSignals = getRecentDiseaseSignals(fish, now);
  const behaviorIntent = getFishBehaviorIntent(fish, now);
  if (behaviorIntent?.type) {
    detailParts.unshift(`${behaviorIntent.type}${behaviorIntent.cause ? ` | ${behaviorIntent.cause}` : ""}`);
    signatureParts.push(`intent:${behaviorIntent.type}:${behaviorIntent.cause || ""}`);
  }
  const behaviorSignals = Object.values(sanitizeBehaviorSignals(fish.behaviorSignals, now))
    .sort((left, right) => Number(right.lastSeenAt) - Number(left.lastSeenAt));
  if (behaviorSignals[0]?.debugText) {
    detailParts.unshift(behaviorSignals[0].debugText);
    signatureParts.push(`behavior-signal:${behaviorSignals[0].type}`);
  }
  if (isTankLightsOut(now)) {
    detailParts.push(isNightActiveFish(fish) ? "lights out active" : "lights out dim");
    signatureParts.push("lights-out");
  }
  if (fish.personality) {
    detailParts.push(`trait ${fish.personality}`);
    signatureParts.push(`personality:${fish.personality}:${fish.personalityRarity || ""}`);
  }
  if (diseaseState !== DISEASE_STATE_NONE) {
    const exposure = Math.round(Number(fish.diseaseExposureLevel) || 0);
    const contagiousness = getDiseaseStageSpreadMultiplier(diseaseState);
    const treated = (Number(fish.diseaseTreatedUntil) || 0) > now;
    detailParts.push(`disease ${diseaseState}`);
    detailParts.push(`exposure ${exposure}/${DISEASE_EXPOSURE_MAX}`);
    detailParts.push(`contagious ${contagiousness.toFixed(1)}x${treated ? " treated" : ""}`);
    signatureParts.push(`disease:${diseaseState}:${exposure}:${Math.round(contagiousness * 10)}`);
  } else if ((Number(fish.diseaseExposureLevel) || 0) > 0) {
    const exposure = Math.round(Number(fish.diseaseExposureLevel) || 0);
    detailParts.push(`exposure ${exposure}/${DISEASE_EXPOSURE_MAX}`);
    signatureParts.push(`exposure:${exposure}`);
  }
  if (recentDiseaseSignals.length) {
    detailParts.push(`signal ${recentDiseaseSignals[0]}`);
    signatureParts.push(`signal:${recentDiseaseSignals[0]}`);
  }

  const behaviorLine = `${effectiveBehavior} / ${activity}`;
  const detailText = detailParts.join(" | ");
  const layerText = `L${activeLayer}->${desiredLayer} T${targetText}`;
  const conditionText = `H ${healthUnits}/${maxHealthUnits} C ${Math.round(comfortValue * 100)}%`;
  const illnessLine = `Illness: ${diseaseState} E ${Math.round(Number(fish.diseaseExposureLevel) || 0)}/${DISEASE_EXPOSURE_MAX}`;

  return {
    signature: signatureParts.join("|"),
    displayName,
    behavior: effectiveBehavior,
    activity,
    detailText,
    layerText,
    conditionText,
    labelLines: [
      displayName,
      behaviorLine,
      illnessLine,
      detailText,
      `${layerText} ${conditionText}`
    ],
    logText: `${displayName}: ${behaviorLine} - ${detailText} - ${layerText} - ${conditionText}`
  };
}

function resetDebugFishBehaviorBroadcastState() {
  runtime.debugFishBehaviorSignatures.clear();
}

function pushDebugFishBehaviorLog(fish, snapshot, now = Date.now()) {
  if (!isDebugModeEnabled() || !fish || !snapshot) {
    return;
  }

  const tank = getCurrentTank();
  const entry = {
    time: now,
    tankId: tank?.id || state?.activeTankId || "",
    fishId: fish.id || "",
    text: snapshot.logText
  };
  runtime.debugFishBehaviorLog.push(entry);
  if (runtime.debugFishBehaviorLog.length > DEBUG_FISH_BEHAVIOR_LOG_LIMIT) {
    runtime.debugFishBehaviorLog.splice(
      0,
      runtime.debugFishBehaviorLog.length - DEBUG_FISH_BEHAVIOR_LOG_LIMIT
    );
  }

  console.debug(`[fish behavior] ${formatDebugFishBehaviorLogEntry(entry)}`);
}

function syncDebugFishBehaviorBroadcast(now = Date.now()) {
  if (!isDebugModeEnabled() || !state?.fish?.length) {
    resetDebugFishBehaviorBroadcastState();
    return;
  }

  const seenFishIds = new Set();
  for (const fish of state.fish) {
    const species = getSpeciesForFish(fish);
    if (!species || !fish?.id) {
      continue;
    }

    seenFishIds.add(fish.id);
    const snapshot = getDebugFishBehaviorSnapshot(fish, species, now);
    if (!snapshot) {
      continue;
    }

    const previousSignature = runtime.debugFishBehaviorSignatures.get(fish.id);
    if (previousSignature !== snapshot.signature) {
      runtime.debugFishBehaviorSignatures.set(fish.id, snapshot.signature);
      pushDebugFishBehaviorLog(fish, snapshot, now);
    }
  }

  for (const fishId of runtime.debugFishBehaviorSignatures.keys()) {
    if (!seenFishIds.has(fishId)) {
      runtime.debugFishBehaviorSignatures.delete(fishId);
    }
  }
}

function formatDebugFishBehaviorLogEntry(entry) {
  const time = new Date(Number(entry?.time) || Date.now()).toLocaleString();
  const tankText = entry?.tankId ? ` tank=${entry.tankId}` : "";
  const fishText = entry?.fishId ? ` fish=${entry.fishId}` : "";
  return `[${time}]${tankText}${fishText} ${entry?.text || ""}`.trim();
}

function buildDebugFishBehaviorLogText() {
  const lines = runtime.debugFishBehaviorLog.map((entry) => formatDebugFishBehaviorLogEntry(entry));
  return [
    "Bubble Borough fish behavior debug log",
    `Generated: ${new Date().toLocaleString()}`,
    `Entries: ${lines.length}`,
    "",
    ...lines
  ].join("\n");
}

function createDebugFishBehaviorLogFilename(timestamp = Date.now()) {
  const exportedAt = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `bubble-borough-fish-behavior-${exportedAt.getFullYear()}-${pad(exportedAt.getMonth() + 1)}-${pad(exportedAt.getDate())}-${pad(exportedAt.getHours())}${pad(exportedAt.getMinutes())}${pad(exportedAt.getSeconds())}.txt`;
}

function downloadDebugFishBehaviorLog() {
  if (!isDebugModeEnabled()) {
    return;
  }

  if (!runtime.debugFishBehaviorLog.length) {
    showToast("No fish behavior log yet.");
    return;
  }

  downloadTextFile(
    buildDebugFishBehaviorLogText(),
    createDebugFishBehaviorLogFilename(),
    "text/plain"
  );
  showToast("Fish behavior log download started.");
}

function toggleDebugTools() {
  runtime.debugToolsEnabled = !runtime.debugToolsEnabled;
  if (!runtime.debugToolsEnabled) {
    runtime.debugSidebarOpen = false;
    resetDebugFishBehaviorBroadcastState();
  }
  runtime.uvGlowMaskCache.clear();
  renderUi(Date.now());
  showToast(runtime.debugToolsEnabled ? "Debug tools enabled." : "Debug tools hidden.");
}

function toggleAspectRatioLock() {
  runtime.aspectRatioLocked = !runtime.aspectRatioLocked;
  applyAspectRatioMode();
  resizeDisplayCanvases();
  renderUi(Date.now(), { full: false });
  showToast(runtime.aspectRatioLocked ? "View locked to 16:9." : "View fills screen.");
}

function handleHiddenKeySequence(event, keyRaw) {
  if (event.ctrlKey || event.altKey || event.metaKey || keyRaw.length !== 1) {
    return false;
  }

  const key = keyRaw.toLowerCase();
  if (!/^[a-z0-9]$/.test(key)) {
    runtime.hiddenKeySequenceBuffer = "";
    return false;
  }

  runtime.hiddenKeySequenceBuffer = `${runtime.hiddenKeySequenceBuffer}${key}`.slice(-HIDDEN_KEY_SEQUENCE_BUFFER_LENGTH);
  if (runtime.hiddenKeySequenceBuffer.endsWith(DEBUG_UNLOCK_SEQUENCE)) {
    runtime.hiddenKeySequenceBuffer = "";
    toggleDebugTools();
    event.preventDefault();
    return true;
  }

  if (runtime.hiddenKeySequenceBuffer.endsWith(VIEW_LOCK_SEQUENCE)) {
    runtime.hiddenKeySequenceBuffer = "";
    toggleAspectRatioLock();
    event.preventDefault();
    return true;
  }

  return false;
}

function isFocusedTextEntry() {
  if (typeof document === "undefined") {
    return false;
  }

  const activeElement = document.activeElement;
  return Boolean(
    activeElement instanceof Element
    && (/^(INPUT|TEXTAREA|SELECT)$/.test(activeElement.tagName) || activeElement.isContentEditable)
  );
}

function syncPortablePerformanceMode() {
  const active = ENABLE_PORTABLE_PERFORMANCE_MODE
    && Boolean(window.matchMedia?.(PORTABLE_PERFORMANCE_MEDIA_QUERY)?.matches);
  runtime.portablePerformanceActive = active;
  return active;
}

function isPortablePerformanceModeActive() {
  return typeof runtime.portablePerformanceActive === "boolean"
    ? runtime.portablePerformanceActive
    : syncPortablePerformanceMode();
}

function getStageRenderDevicePixelRatio() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  return isPortablePerformanceModeActive()
    ? Math.min(dpr, PORTABLE_PERFORMANCE_MAX_RENDER_DPR)
    : dpr;
}

function getEffectiveAnimationFpsLimit() {
  const portableLimit = isPortablePerformanceModeActive() ? PORTABLE_PERFORMANCE_MAX_FPS : 0;
  const wallpaperLimit = Math.max(0, Number(runtime.wallpaperEngineFpsLimit) || 0);
  if (portableLimit > 0 && wallpaperLimit > 0) {
    return Math.min(portableLimit, wallpaperLimit);
  }
  return portableLimit || wallpaperLimit;
}

function getWaterParticleTargetCount() {
  return isPortablePerformanceModeActive()
    ? Math.min(WATER_PARTICLE_COUNT, PORTABLE_PERFORMANCE_WATER_PARTICLE_COUNT)
    : WATER_PARTICLE_COUNT;
}

function getWaterParticleCleanVisibleCount() {
  return isPortablePerformanceModeActive()
    ? Math.min(WATER_PARTICLE_CLEAN_VISIBLE_COUNT, PORTABLE_PERFORMANCE_WATER_PARTICLE_CLEAN_VISIBLE_COUNT)
    : WATER_PARTICLE_CLEAN_VISIBLE_COUNT;
}

function getWaterParticleDirtyVisibleCount() {
  return isPortablePerformanceModeActive()
    ? Math.min(WATER_PARTICLE_DIRTY_VISIBLE_COUNT, PORTABLE_PERFORMANCE_WATER_PARTICLE_DIRTY_VISIBLE_COUNT)
    : WATER_PARTICLE_DIRTY_VISIBLE_COUNT;
}

function getAmbientBubbleSeedCount() {
  return isPortablePerformanceModeActive()
    ? Math.min(AMBIENT_BUBBLE_COUNT, PORTABLE_PERFORMANCE_AMBIENT_BUBBLE_COUNT)
    : AMBIENT_BUBBLE_COUNT;
}

function getVisibleAmbientSceneBubbles() {
  if (!areAmbientBubblesEnabled()) {
    return [];
  }

  const bubbles = Array.isArray(runtime.scene?.bubbles) ? runtime.scene.bubbles : [];
  return isPortablePerformanceModeActive()
    ? bubbles.slice(0, Math.min(PORTABLE_PERFORMANCE_AMBIENT_BUBBLE_COUNT, bubbles.length))
    : bubbles.slice(0, Math.min(AMBIENT_BUBBLE_COUNT, bubbles.length));
}

function getMaxVisibleBubblerBubblesPerSpout() {
  return isPortablePerformanceModeActive()
    ? Math.min(MAX_BUBBLER_VISIBLE_BUBBLES_PER_SPOUT, PORTABLE_PERFORMANCE_MAX_BUBBLER_VISIBLE_BUBBLES_PER_SPOUT)
    : MAX_BUBBLER_VISIBLE_BUBBLES_PER_SPOUT;
}

function getPortableTankBlurScale() {
  return isPortablePerformanceModeActive() ? PORTABLE_PERFORMANCE_TANK_BLUR_SCALE : 1;
}

function getPortableGrimeBlurScale() {
  return isPortablePerformanceModeActive() ? PORTABLE_PERFORMANCE_GRIME_BLUR_SCALE : 1;
}
