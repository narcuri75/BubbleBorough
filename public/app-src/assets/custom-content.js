// Source fragment: assets/custom-content.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function syncViewportCssVariables(options = {}) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  if (!root) {
    return;
  }

  syncPortablePerformanceMode();
  const visualViewport = window.visualViewport;
  const viewportWidth = Math.max(
    1,
    Math.round(visualViewport?.width || window.innerWidth || root.clientWidth || TANK_WIDTH)
  );
  const viewportHeight = Math.max(
    1,
    Math.round(visualViewport?.height || window.innerHeight || root.clientHeight || TANK_HEIGHT)
  );
  const orientation = viewportWidth >= viewportHeight ? "landscape" : "portrait";
  const metrics = runtime.viewportMetrics;
  const widthJumped = Math.abs(viewportWidth - (metrics.width || viewportWidth)) > 120;
  const shouldResetStable = options.resetStable === true
    || metrics.orientation !== orientation
    || !metrics.stableHeight
    || widthJumped;

  metrics.orientation = orientation;
  metrics.width = viewportWidth;
  metrics.height = viewportHeight;

  if (shouldResetStable) {
    metrics.stableHeight = viewportHeight;
  } else if (!isFocusedTextEntry()) {
    metrics.stableHeight = Math.min(Math.max(1, metrics.stableHeight), viewportHeight);
  }

  root.style.setProperty("--app-viewport-width", `${viewportWidth}px`);
  root.style.setProperty("--app-viewport-height", `${viewportHeight}px`);
  root.style.setProperty("--app-stable-viewport-height", `${Math.max(1, metrics.stableHeight || viewportHeight)}px`);
}

function hasStockedMedicine() {
  return Object.values(state?.medicineInventory || {}).some((count) => Math.max(0, Number(count) || 0) > 0);
}

function toggleToolbarActionMenu(menuName) {
  const normalizedName = menuName === "care" || menuName === "edit" ? menuName : "";
  runtime.toolbarActionMenu = runtime.toolbarActionMenu === normalizedName ? "" : normalizedName;
  renderControls(Date.now());
}

function handleToolbarGroupButtonClick(menuName) {
  const normalizedName = menuName === "care" || menuName === "edit" ? menuName : "";
  const editModeActive = runtime.fishEditMode || runtime.editTankMode;

  if (normalizedName === "edit" && editModeActive) {
    runtime.fishEditMode ? toggleFishEditMode(false) : toggleEditTankMode(false);
    return;
  }

  if (normalizedName === "care" && editModeActive) {
    runtime.fishEditMode ? toggleFishEditMode(false) : toggleEditTankMode(false);
  }

  toggleToolbarActionMenu(normalizedName);
}

function closeToolbarActionMenu() {
  if (!runtime.toolbarActionMenu) {
    return false;
  }
  runtime.toolbarActionMenu = "";
  renderControls(Date.now());
  return true;
}

function handleToolbarActionMenuDocumentClick(event) {
  if (!runtime.toolbarActionMenu || !(event.target instanceof Element)) {
    return;
  }
  if (event.target.closest("#careMenuButton, #editMenuButton, #toolbarCareMenu, #toolbarEditMenu")) {
    return;
  }
  closeToolbarActionMenu();
}

function handleToolbarActionMenuKeyDown(event) {
  if (event.key !== "Escape") {
    return;
  }
  if (runtime.toolbarActionMenu) {
    event.preventDefault();
    const activeMenuName = runtime.toolbarActionMenu;
    closeToolbarActionMenu();
    (activeMenuName === "care" ? dom.careMenuButton : dom.editMenuButton)?.focus?.();
    return;
  }
  if (runtime.fishEditMode || runtime.editTankMode) {
    event.preventDefault();
    runtime.fishEditMode ? toggleFishEditMode(false) : toggleEditTankMode(false);
    dom.editMenuButton?.focus?.();
  }
}

function bindEvents() {
  syncViewportCssVariables({ resetStable: true });

  let viewportLayoutRefreshHandle = 0;
  const refreshViewportLayoutNow = () => {
    syncViewportCssVariables();
    resizeDisplayCanvases();
    if (isIntroTutorialActive()) {
      renderUi(Date.now(), { full: false });
    }
  };
  const refreshViewportLayout = () => {
    const portablePerformanceActive = syncPortablePerformanceMode();
    if (!portablePerformanceActive) {
      if (viewportLayoutRefreshHandle) {
        window.clearTimeout(viewportLayoutRefreshHandle);
        viewportLayoutRefreshHandle = 0;
      }
      refreshViewportLayoutNow();
      return;
    }
    if (viewportLayoutRefreshHandle) {
      window.clearTimeout(viewportLayoutRefreshHandle);
    }
    viewportLayoutRefreshHandle = window.setTimeout(() => {
      viewportLayoutRefreshHandle = 0;
      refreshViewportLayoutNow();
    }, PORTABLE_PERFORMANCE_RESIZE_DEBOUNCE_MS);
  };

  window.addEventListener("resize", refreshViewportLayout);
  window.visualViewport?.addEventListener("resize", refreshViewportLayout);
  window.addEventListener("keydown", (event) => {
    const tagName = event.target instanceof Element ? event.target.tagName : "";
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tagName) || event.target?.isContentEditable) {
      return;
    }

    const keyRaw = String(event.key || "");
    if (handleHiddenKeySequence(event, keyRaw)) {
      return;
    }

    if (isIntroTutorialActive() && !runtime.editTankMode && !runtime.fishEditMode) {
      return;
    }

    if (keyRaw === "Escape") {
      if (runtime.boroughOverviewOpen) {
        closeAquariumOverview();
        return;
      }
      if (runtime.foodTrayOpen || runtime.medicineTrayOpen || runtime.feedingModeFoodKey || runtime.medicineModeKey) {
        clearPrimaryToolModes();
        renderUi(Date.now());
        return;
      }
      if (runtime.equipmentOverlayOpen) {
        closeEquipmentOverlay();
        return;
      }
      if (runtime.settingsOverlayOpen) {
        closeSettingsOverlay();
        return;
      }
      if (runtime.utilityOverlayOpen) {
        requestCloseUtilityOverlay();
        return;
      }
      if (runtime.storeOverlayOpen) {
        closeStoreOverlay();
        return;
      }
    }

    const key = keyRaw.toLowerCase();
    if (
      (keyRaw === "ArrowLeft" || keyRaw === "ArrowRight")
      && !runtime.editTankMode
      && !runtime.fishEditMode
      && !runtime.storeOverlayOpen
      && !runtime.settingsOverlayOpen
      && !runtime.utilityOverlayOpen
      && !runtime.equipmentOverlayOpen
    ) {
      event.preventDefault();
      moveCameraToAdjacentSection(keyRaw === "ArrowLeft" ? -1 : 1, 0);
      return;
    }

    if (!runtime.editTankMode && !runtime.fishEditMode && !runtime.boroughOverviewOpen
      && !runtime.storeOverlayOpen && !runtime.settingsOverlayOpen && !runtime.utilityOverlayOpen && !runtime.equipmentOverlayOpen) {
      const cameraMoves = { w: [0, -1], a: [-1, 0], s: [0, 1], d: [1, 0] };
      if (cameraMoves[key]) {
        event.preventDefault();
        moveCameraToAdjacentSection(...cameraMoves[key]);
        return;
      }
    }

    if (key === "z" || keyRaw === "ArrowUp") {
      if (stepDraggedSuckerFishLayer(1)) {
        event.preventDefault();
        return;
      }
    }

    if (key === "x" || keyRaw === "ArrowDown") {
      if (stepDraggedSuckerFishLayer(-1)) {
        event.preventDefault();
        return;
      }
    }

    if (!runtime.editTankMode) {
      return;
    }

    if (key === "g") {
      event.preventDefault();
      groupSelectedDecor();
      return;
    }

    if (key === "u") {
      event.preventDefault();
      ungroupSelectedDecor();
      return;
    }

    const activeDecorShortcutTarget = getActiveDecorShortcutTarget();
    if (!activeDecorShortcutTarget) {
      return;
    }

    if (key === "s") {
      if (canOpenDecorSettings(activeDecorShortcutTarget)) {
        event.preventDefault();
        openDecorSettings(activeDecorShortcutTarget.item.id);
        return;
      }
    }

    if (key === "f") {
      event.preventDefault();
      const flipped = toggleActiveDecorFlip();
      if (flipped !== null) {
        showToast(
          isTutorialDecorDoneStep()
            ? getTutorialDecorDoneToastText(flipped ? "Decor flipped." : "Decor flip cleared.")
            : (flipped ? "Decor flipped." : "Decor flip cleared."),
          {
            durationMs: isTutorialDecorDoneStep() ? 120000 : undefined,
            key: isTutorialDecorDoneStep() ? TUTORIAL_TOAST_DECOR_DONE : ""
          }
        );
      }
      return;
    }

    if (keyRaw === "+" || keyRaw === "=" || event.code === "NumpadAdd") {
      event.preventDefault();
      performDecorEditShortcutAction("scale-up");
      return;
    }

    if (keyRaw === "-" || keyRaw === "_" || event.code === "NumpadSubtract") {
      event.preventDefault();
      performDecorEditShortcutAction("scale-down");
      return;
    }

    if (key === "z" || keyRaw === "ArrowUp") {
      event.preventDefault();
      performDecorEditShortcutAction("layer-up");
      return;
    }

    if (key === "x" || keyRaw === "ArrowDown") {
      event.preventDefault();
      performDecorEditShortcutAction("layer-down");
      return;
    }
  });
  if (window.ResizeObserver) {
    runtime.resizeObserver?.disconnect?.();
    runtime.resizeObserver = new ResizeObserver(() => refreshViewportLayout());
    runtime.resizeObserver.observe(dom.tankStage);
  }
  window.addEventListener("pointerdown", () => {
    primeSoundEffects();
  }, true);
  window.addEventListener("keydown", () => {
    primeSoundEffects();
  }, true);
  document.addEventListener("pointerup", finishSoundRangeDrag, true);
  document.addEventListener("pointercancel", finishSoundRangeDrag, true);
  document.addEventListener("click", handleToolbarActionMenuDocumentClick);
  document.addEventListener("keydown", handleToolbarActionMenuKeyDown);
  dom.loadingOverlay?.addEventListener("click", (event) => {
    if (dom.loadingOverlay?.classList.contains("is-error")) {
      event.preventDefault();
      event.stopPropagation();
      window.location.reload();
      return;
    }
    if (!dom.loadingOverlay?.classList.contains("is-ready")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (isHardwareAccelerationNoticeBlockingStart()) {
      return;
    }
    primeSoundEffects();
    playRegularButtonSoundEffect();
    hideLoadingOverlay();
  });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      syncAmbienceAudio();
    });
    document.addEventListener("click", (event) => {
      const creditsButton = event.target instanceof Element ? event.target.closest("[data-open-credits]") : null;
      if (creditsButton) {
        event.preventDefault();
        openUtilityOverlay("credits");
        return;
      }

      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement)) {
        return;
      }
      const url = normalizeExternalUrl(link.href);
      if (!url) {
        return;
      }
      if (!shouldUseExternalLinkPrompt()) {
        return;
      }
      event.preventDefault();
      promptExternalLink(url, link.textContent);
    });
  }

  dom.prevTankButton?.addEventListener("click", () => switchTankByOffset(-1));
  dom.nextTankButton?.addEventListener("click", () => switchTankByOffset(1));
  dom.overviewButton?.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("overviewButton")) {
      return;
    }
    toggleAquariumOverview();
  });
  dom.closeBoroughOverview?.addEventListener("click", closeAquariumOverview);
  dom.boroughGrid?.addEventListener("click", (event) => {
    const extendButton = event.target.closest("[data-extend-grid-x]");
    if (extendButton) {
      extendAquariumAt(Number(extendButton.dataset.extendGridX), Number(extendButton.dataset.extendGridY));
      return;
    }
    const renameButton = event.target.closest("[data-rename-borough]");
    if (renameButton) {
      const tank = getTankById(renameButton.dataset.renameBorough);
      if (tank) {
        runtime.editingTankNameId = tank.id;
        runtime.editingTankNameValue = getTankLabel(tank);
        renderAquariumOverview();
        window.requestAnimationFrame(() => dom.boroughGrid?.querySelector("[data-borough-name-input]")?.focus());
      }
      return;
    }
    const saveNameButton = event.target.closest("[data-save-borough-name]");
    if (saveNameButton) {
      saveBoroughTankName(saveNameButton.dataset.saveBoroughName);
      return;
    }
    if (event.target.closest("[data-cancel-borough-name]")) {
      runtime.editingTankNameId = null;
      runtime.editingTankNameValue = "";
      renderAquariumOverview();
      return;
    }
    const sectionButton = event.target.closest("[data-visit-section]");
    if (sectionButton) {
      visitAquariumSection(sectionButton.dataset.visitSection);
    }
  });
  dom.boroughGrid?.addEventListener("input", (event) => {
    if (event.target.matches("[data-borough-name-input]")) {
      runtime.editingTankNameValue = event.target.value;
    }
  });
  dom.boroughGrid?.addEventListener("keydown", (event) => {
    const input = event.target.closest("[data-borough-name-input]");
    if (!input) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      saveBoroughTankName(input.dataset.boroughNameInput, input.value);
    } else if (event.key === "Escape") {
      event.stopPropagation();
      runtime.editingTankNameId = null;
      runtime.editingTankNameValue = "";
      renderAquariumOverview();
    }
  });
  dom.boroughGrid?.addEventListener("dragstart", (event) => {
    const section = event.target.closest("[data-borough-section]");
    if (!section || event.target.closest("input, button")) {
      event.preventDefault();
      return;
    }
    runtime.boroughOverviewDraggedTankId = section.dataset.boroughSection;
    section.classList.add("is-dragging");
    event.dataTransfer?.setData("text/plain", section.dataset.boroughSection);
  });
  dom.boroughGrid?.addEventListener("dragover", (event) => {
    if (runtime.boroughOverviewDraggedTankId && event.target.closest("[data-borough-section]")) {
      event.preventDefault();
    }
  });
  dom.boroughGrid?.addEventListener("drop", (event) => {
    const target = event.target.closest("[data-borough-section]");
    if (target && runtime.boroughOverviewDraggedTankId) {
      event.preventDefault();
      swapAquariumSectionPositions(runtime.boroughOverviewDraggedTankId, target.dataset.boroughSection);
    }
    runtime.boroughOverviewDraggedTankId = null;
  });
  dom.boroughGrid?.addEventListener("dragend", () => {
    runtime.boroughOverviewDraggedTankId = null;
    dom.boroughGrid?.querySelectorAll(".is-dragging").forEach((element) => element.classList.remove("is-dragging"));
  });
  dom.tankStage?.addEventListener("wheel", (event) => {
    if (isTankOverlayTarget(event.target) && !event.target.closest("#boroughOverview")) {
      return;
    }
    if (event.deltaY > 0 && !runtime.boroughOverviewOpen) {
      event.preventDefault();
      openAquariumOverview(false);
    } else if (event.deltaY < 0 && runtime.boroughOverviewOpen) {
      event.preventDefault();
      closeAquariumOverview();
    }
  }, { passive: false });
  dom.tankStage?.addEventListener("pointerdown", (event) => {
    if (event.button !== 1 || runtime.boroughOverviewOpen || isTankOverlayTarget(event.target)) {
      return;
    }
    event.preventDefault();
    runtime.boroughPanPointerId = event.pointerId;
    runtime.boroughPanStartX = event.clientX;
    runtime.boroughPanStartY = event.clientY;
    dom.tankStage.setPointerCapture?.(event.pointerId);
  });
  dom.tankStage?.addEventListener("pointerup", (event) => {
    if (runtime.boroughPanPointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - runtime.boroughPanStartX;
    const dy = event.clientY - runtime.boroughPanStartY;
    runtime.boroughPanPointerId = null;
    if (Math.hypot(dx, dy) < 40) {
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      moveCameraToAdjacentSection(dx > 0 ? -1 : 1, 0);
    } else {
      moveCameraToAdjacentSection(0, dy > 0 ? -1 : 1);
    }
  });
  dom.dailyBonusBell?.addEventListener("click", () => openUtilityOverlay("daily-bonus"));
  dom.toggleDebugMenuButton?.addEventListener("click", () => toggleDebugSidebar());
  dom.debugDailyRecapButton?.addEventListener("click", () => triggerDebugDailyRecap());
  dom.feedButton.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("feedButton")) {
      return;
    }
    toggleFoodTray(null, { source: "toolbar", collapseSidebar: true });
  });
  dom.careMenuButton?.addEventListener("click", () => handleToolbarGroupButtonClick("care"));
  dom.editMenuButton?.addEventListener("click", () => handleToolbarGroupButtonClick("edit"));
  dom.medicineButton?.addEventListener("click", () => {
    if (!hasStockedMedicine()) {
      openStoreOverlay("pharmacy");
      showToast("No medicine is stocked. Opening the pharmacy.");
      return;
    }
    toggleMedicineTray(null, { source: "toolbar", collapseSidebar: true });
  });
  dom.tipsButton?.addEventListener("click", () => openUtilityOverlay("tips"));
  dom.resetProgressButton?.addEventListener("click", () => openUtilityOverlay("reset-progress-confirm"));
  dom.exportDataButton?.addEventListener("click", () => {
    void exportSaveData();
  });
  dom.importDataButton?.addEventListener("click", () => openUtilityOverlay("import-confirm"));
  dom.importDataInput?.addEventListener("change", (event) => {
    void importSaveDataFromPicker(event);
  });
  dom.localBackgroundInput?.addEventListener("change", (event) => {
    void importLocalBackgroundFromPicker(event);
  });
  dom.localDecorInput?.addEventListener("change", (event) => {
    void importLocalDecorFromPicker(event);
  });
  dom.localHideFrontInput?.addEventListener("change", (event) => {
    void importLocalHideFrontFromPicker(event);
  });
  dom.localHideBackgroundInput?.addEventListener("change", (event) => {
    void importLocalHideBackgroundFromPicker(event);
  });
  dom.localFishInput?.addEventListener("change", (event) => {
    void importLocalFishFromPicker(event);
  });
  dom.resetMealsButton.addEventListener("click", () => resetMealsDebug());
  dom.completeMealsButton?.addEventListener("click", () => completeMealsDebug());
  dom.spongeButton.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("spongeButton")) {
      return;
    }
    toggleCleaningMode({ source: "toolbar", collapseSidebar: true });
  });
  dom.scoopButton?.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("scoopButton")) {
      return;
    }
    toggleScoopMode({ source: "toolbar", collapseSidebar: true });
  });
  dom.debugDamageFishButton.addEventListener("click", () => damageSelectedFish());
  dom.debugBreedButton?.addEventListener("click", () => triggerDebugBabySequence());
  dom.resetFishHealthButton?.addEventListener("click", () => restoreAllFishHealthDebug());
  dom.debugInfectFishButton?.addEventListener("click", () => infectSelectedFishDebug());
  dom.debugCureFishButton?.addEventListener("click", () => cureSelectedFishDebug());
  dom.addCoinsButton.addEventListener("click", () => addDebugCoins(10));
  dom.addHundredCoinsButton?.addEventListener("click", () => addDebugCoins(100));
  dom.maxDirtButton.addEventListener("click", () => increaseTankDirtinessDebug());
  dom.debugMaxDirtinessButton?.addEventListener("click", () => maxTankDirtinessDebug());
  dom.debugGravelDigButton?.addEventListener("click", () => triggerDebugGravelDigTest());
  dom.debugGravelPebbleButton?.addEventListener("click", () => triggerDebugGravelPebbleTest());
  dom.debugCaveButton.addEventListener("click", () => toggleDebugNightCaveMode());
  dom.debugFishBehaviorLogButton?.addEventListener("click", () => downloadDebugFishBehaviorLog());
  for (const config of DEBUG_BEHAVIOR_BUTTON_CONFIGS) {
    dom[config.domKey]?.addEventListener("click", () => triggerDebugBehaviorScenario(config.action));
  }
  dom.introTutorialOverlay?.addEventListener("pointerdown", (event) => {
    if (dom.introTutorialOverlay?.classList.contains("is-blocking")) {
      event.stopPropagation();
      return;
    }
    if (event.target === dom.introTutorialOverlay || event.target === dom.introTutorialSplash) {
      event.stopPropagation();
    }
  });
  dom.introTutorialOverlay?.addEventListener("click", (event) => {
    if (dom.introTutorialOverlay?.classList.contains("is-blocking")) {
      event.stopPropagation();
      return;
    }
    if (event.target === dom.introTutorialOverlay || event.target === dom.introTutorialSplash) {
      event.stopPropagation();
    }
  });
  dom.introTutorialPanel?.addEventListener("pointerdown", (event) => {
    if (dom.introTutorialOverlay?.classList.contains("is-blocking")) {
      event.stopPropagation();
    }
  });
  dom.introTutorialPanel?.addEventListener("click", (event) => {
    if (dom.introTutorialOverlay?.classList.contains("is-blocking")) {
      event.stopPropagation();
    }
  });
  dom.replayTutorialButton?.addEventListener("click", () => rerunIntroTutorial());
  dom.toggleFishShop.addEventListener("click", () => openStoreOverlay("fish"));
  dom.toggleDecorShop.addEventListener("click", () => openStoreOverlay("decor"));
  dom.tankBottomDock?.addEventListener("click", captureToolbarButtonSoundState, true);
  dom.tankBottomDock?.addEventListener("click", playToolbarButtonSoundForClick);
  dom.tankBottomDock?.addEventListener("pointerover", handleToolbarFastTooltipPointerOver);
  dom.tankBottomDock?.addEventListener("pointermove", handleToolbarFastTooltipPointerMove);
  dom.tankBottomDock?.addEventListener("pointerout", handleToolbarFastTooltipPointerOut);
  dom.tankBottomDock?.addEventListener("focusin", handleToolbarFastTooltipFocusIn);
  dom.tankBottomDock?.addEventListener("focusout", handleToolbarFastTooltipFocusOut);
  dom.tankBottomDock?.addEventListener("click", hideToolbarFastTooltip, true);
  dom.debugSidebar?.addEventListener("click", (event) => {
    playRegularButtonSoundForAction(event, ".debug-menu-button");
    handleLivingBoroughDebugAction(event);
  }, true);
  dom.debugSidebar?.addEventListener("change", handleLivingBoroughDebugChange);
  window.addEventListener("resize", hideToolbarFastTooltip);
  document.addEventListener("scroll", hideToolbarFastTooltip, true);
  dom.openStoreButton.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("openStoreButton")) {
      return;
    }
    if (runtime.storeOverlayOpen) {
      closeStoreOverlay();
      return;
    }
    if (openTutorialStoreForCurrentStage()) {
      return;
    }
    openStoreOverlay("food");
  });
  dom.toolbarTab?.addEventListener("click", () => toggleToolbarCollapsed());
  dom.displayTab?.addEventListener("click", () => toggleDisplayCollapsed());
  dom.fishActionFlyout?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const cancelButton = target?.closest("[data-cancel-fish-action]");
    if (cancelButton instanceof HTMLButtonElement) {
      event.preventDefault();
      cancelFishQueuedAction(runtime.fishActionMenuFishId, cancelButton.dataset.cancelFishAction || "");
      return;
    }
    const actionButton = target?.closest("[data-fish-action]");
    if (actionButton instanceof HTMLButtonElement) {
      event.preventDefault();
      handleFishActionButtonClick(actionButton.dataset.fishAction || "");
      return;
    }
    const categoryButton = target?.closest("[data-fish-action-category]");
    if (categoryButton instanceof HTMLButtonElement) {
      event.preventDefault();
      openFishActionSubmenu(categoryButton.dataset.fishActionCategory || "", runtime.fishActionMenuFishId, Date.now(), { anchorElement: categoryButton });
    }
  });
  dom.fishActionSubmenu?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const actionButton = target?.closest("[data-fish-submenu-action]");
    if (actionButton instanceof HTMLButtonElement) {
      event.preventDefault();
      handleFishActionButtonClick(actionButton.dataset.fishSubmenuAction || "");
    }
  });
  dom.fishActionTargetMenu?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const targetButton = target?.closest("[data-fish-action-target-id]");
    if (!(targetButton instanceof HTMLButtonElement)) {
      return;
    }
    event.preventDefault();
    const action = runtime.fishActionTargetAction || "";
    const fishId = runtime.fishActionTargetFishId || runtime.fishActionMenuFishId || "";
    const targetFishId = targetButton.dataset.fishActionTargetId || "";
    closeFishActionTargetMenu();
    triggerFishAction(action, fishId, { targetFishId });
  });
  dom.fishActionFlyoutName?.addEventListener("click", () => {
    const fishId = runtime.fishActionMenuFishId;
    closeFishActionMenu();
    if (fishId) {
      openFishInspector(fishId);
    }
  });
  dom.fishActionFlyoutSettings?.addEventListener("click", () => {
    const fishId = runtime.fishActionMenuFishId;
    closeFishActionMenu();
    if (fishId) {
      openFishInspector(fishId, { settingsOpen: true });
    }
  });
  dom.fishActionQueueDock?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const toggleButton = target?.closest("[data-toggle-fish-action-queue]");
    if (toggleButton instanceof HTMLButtonElement) {
      event.preventDefault();
      const fishId = toggleButton.dataset.toggleFishActionQueue || "";
      if (runtime.fishActionQueueCollapsedFishIds.has(fishId)) {
        runtime.fishActionQueueCollapsedFishIds.delete(fishId);
      } else if (fishId) {
        runtime.fishActionQueueCollapsedFishIds.add(fishId);
      }
      renderFishActionQueueDock(Date.now());
      return;
    }
    const cancelButton = target?.closest("[data-cancel-fish-action][data-fish-id]");
    if (cancelButton instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      cancelFishQueuedAction(cancelButton.dataset.fishId || "", cancelButton.dataset.cancelFishAction || "");
    }
  });
  dom.fishActionQueueDock?.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const cancelButton = target?.closest("[data-cancel-fish-action][data-fish-id]");
    if (cancelButton instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      cancelFishQueuedAction(cancelButton.dataset.fishId || "", cancelButton.dataset.cancelFishAction || "");
    }
  });
  dom.openManagementButton?.addEventListener("click", () => {
    if (runtime.utilityOverlayOpen && runtime.utilityOverlayMode === "tank-management") {
      closeUtilityOverlay();
      return;
    }
    openUtilityOverlay("tank-management");
  });
  dom.careTaskPaneButton?.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("careTaskPaneButton")) {
      return;
    }
    toggleCareTaskPane();
  });
  dom.openEquipmentButton?.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("openEquipmentButton")) {
      return;
    }
    if (runtime.equipmentOverlayOpen) {
      closeEquipmentOverlay();
      return;
    }
    openEquipmentOverlay();
  });
  dom.openSettingsButton?.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("openSettingsButton")) {
      return;
    }
    if (runtime.settingsOverlayOpen) {
      closeSettingsOverlay();
      return;
    }
    openSettingsOverlay();
  });
  dom.openSettingsSidebarButton?.addEventListener("click", () => openSettingsOverlay());
  dom.openEquipmentShopButton?.addEventListener("click", () => openStoreOverlay("equipment"));
  dom.openEquipmentStoreButton?.addEventListener("click", () => openStoreOverlay("equipment"));
  dom.toggleMouseLockButton?.addEventListener("click", () => toggleTankMouseInputLocked());
  dom.lightsOutToggleButton?.addEventListener("click", () => toggleLightsOutOverride());
  dom.uvLightToggleButton?.addEventListener("click", () => toggleUvLightPower());
  dom.editModeDockButton?.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("editModeDockButton")) {
      return;
    }
    toggleEditTankMode(null, { source: "toolbar", collapseSidebar: true });
  });
  dom.fishEditModeDockButton?.addEventListener("click", () => {
    if (!guardTutorialToolbarControl("fishEditModeDockButton")) {
      return;
    }
    toggleFishEditMode(null, { source: "toolbar", collapseSidebar: true });
  });
  dom.closeEditDecorTrayButton?.addEventListener("click", () => toggleEditTankMode(false));
  dom.closeEditFishTrayButton?.addEventListener("click", () => toggleFishEditMode(false));
  dom.editLayerUpButton?.addEventListener("click", () => performDecorEditShortcutAction("layer-up"));
  dom.editLayerDownButton?.addEventListener("click", () => performDecorEditShortcutAction("layer-down"));
  dom.editScaleUpButton?.addEventListener("click", () => performDecorEditShortcutAction("scale-up"));
  dom.editScaleDownButton?.addEventListener("click", () => performDecorEditShortcutAction("scale-down"));
  dom.closeStoreOverlay.addEventListener("click", () => {
    const wasOpen = runtime.storeOverlayOpen;
    const closed = closeStoreOverlay();
    if (wasOpen && closed !== false && !runtime.storeOverlayOpen) {
      playToolbarButtonExitSoundEffect();
    }
  });
  dom.storeOverlay?.addEventListener("wheel", handleOverlayWheelScroll, { passive: false });
  dom.storeOverlay?.addEventListener("scroll", syncWallpaperEngineStoreScrollControls, true);
  const clearStoreScrollPointer = () => {
    runtime.storeScrollPointerId = null;
    runtime.storeScrollPointerDirection = "";
  };
  const getStoreScrollButtonFromEvent = (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-store-scroll]") : null;
    return button instanceof HTMLButtonElement ? button : null;
  };
  dom.storeScrollControls?.addEventListener("click", (event) => {
    const button = getStoreScrollButtonFromEvent(event);
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return;
    }
    if (performance.now() < runtime.storeScrollSuppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    scrollActiveStoreDrawer(button.dataset.storeScroll === "up" ? "up" : "down");
  });
  dom.storeScrollControls?.addEventListener("pointerdown", (event) => {
    const button = getStoreScrollButtonFromEvent(event);
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    runtime.storeScrollPointerId = event.pointerId;
    runtime.storeScrollPointerDirection = button.dataset.storeScroll === "up" ? "up" : "down";
    button.setPointerCapture?.(event.pointerId);
  });
  dom.storeScrollControls?.addEventListener("pointerup", (event) => {
    const button = getStoreScrollButtonFromEvent(event);
    const direction = runtime.storeScrollPointerDirection;
    if (runtime.storeScrollPointerId !== event.pointerId || !direction) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    runtime.storeScrollSuppressClickUntil = performance.now() + 350;
    if (button instanceof HTMLButtonElement && !button.disabled) {
      scrollActiveStoreDrawer(direction);
    }
    clearStoreScrollPointer();
  });
  dom.storeScrollControls?.addEventListener("pointercancel", clearStoreScrollPointer);
  dom.storeScrollControls?.addEventListener("lostpointercapture", clearStoreScrollPointer);
  dom.storeScrollControls?.addEventListener("pointerleave", (event) => {
    if (runtime.storeScrollPointerId === event.pointerId) {
      clearStoreScrollPointer();
    }
  });
  dom.storeOverlay?.addEventListener("click", playStoreActionClickSound, true);
  dom.storeOverlay?.addEventListener("change", playStoreFilterChangeSound, true);
  dom.storeOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.storeOverlay) {
      const wasOpen = runtime.storeOverlayOpen;
      const closed = closeStoreOverlay();
      if (wasOpen && closed !== false && !runtime.storeOverlayOpen) {
        playToolbarButtonExitSoundEffect();
      }
    }
  });
  dom.closeUtilityOverlay?.addEventListener("click", () => {
    const wasOpen = runtime.utilityOverlayOpen;
    requestCloseUtilityOverlay();
    if (wasOpen && !runtime.utilityOverlayOpen) {
      playToolbarButtonExitSoundEffect();
    }
  });
  dom.utilityOverlay?.addEventListener("wheel", handleOverlayWheelScroll, { passive: false });
  dom.utilityOverlay?.addEventListener("scroll", () => syncWallpaperScrollControls(dom.utilityOverlayBody || dom.utilityOverlay), true);
  dom.utilityOverlay?.addEventListener("click", (event) => {
    const scrollButton = getWallpaperScrollButtonFromEvent(event);
    if (!scrollButton) {
      return;
    }
    event.preventDefault();
    scrollWallpaperTarget(scrollButton.targetId, scrollButton.button.dataset.wallpaperScroll === "up" ? "up" : "down");
  });
  dom.utilityOverlay?.addEventListener("pointerdown", (event) => {
    const scrollButton = getWallpaperScrollButtonFromEvent(event);
    if (!scrollButton) {
      return;
    }
    event.preventDefault();
    scrollButton.button.setPointerCapture?.(event.pointerId);
    startWallpaperScrollRepeat(scrollButton.targetId, scrollButton.button.dataset.wallpaperScroll === "up" ? "up" : "down");
  });
  dom.utilityOverlay?.addEventListener("pointerup", stopWallpaperScrollRepeat);
  dom.utilityOverlay?.addEventListener("pointercancel", stopWallpaperScrollRepeat);
  dom.utilityOverlay?.addEventListener("pointerleave", stopWallpaperScrollRepeat);
  dom.utilityOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.utilityOverlay) {
      const wasOpen = runtime.utilityOverlayOpen;
      requestCloseUtilityOverlay();
      if (wasOpen && !runtime.utilityOverlayOpen) {
        playToolbarButtonExitSoundEffect();
      }
    }
  });
  dom.closeSettingsOverlay?.addEventListener("click", () => {
    const wasOpen = runtime.settingsOverlayOpen;
    closeSettingsOverlay();
    if (wasOpen && !runtime.settingsOverlayOpen) {
      playToolbarButtonExitSoundEffect();
    }
  });
  dom.settingsOverlay?.addEventListener("wheel", handleOverlayWheelScroll, { passive: false });
  dom.settingsOverlay?.addEventListener("scroll", () => syncWallpaperScrollControls(dom.settingsOverlay), true);
  dom.settingsOverlay?.addEventListener("click", (event) => {
    const scrollButton = getWallpaperScrollButtonFromEvent(event);
    if (!scrollButton) {
      return;
    }
    event.preventDefault();
    scrollWallpaperTarget(scrollButton.targetId, scrollButton.button.dataset.wallpaperScroll === "up" ? "up" : "down");
  });
  dom.settingsOverlay?.addEventListener("pointerdown", (event) => {
    const scrollButton = getWallpaperScrollButtonFromEvent(event);
    if (!scrollButton) {
      return;
    }
    event.preventDefault();
    scrollButton.button.setPointerCapture?.(event.pointerId);
    startWallpaperScrollRepeat(scrollButton.targetId, scrollButton.button.dataset.wallpaperScroll === "up" ? "up" : "down");
  });
  dom.settingsOverlay?.addEventListener("pointerup", stopWallpaperScrollRepeat);
  dom.settingsOverlay?.addEventListener("pointercancel", stopWallpaperScrollRepeat);
  dom.settingsOverlay?.addEventListener("pointerleave", stopWallpaperScrollRepeat);
  dom.settingsOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.settingsOverlay) {
      const wasOpen = runtime.settingsOverlayOpen;
      closeSettingsOverlay();
      if (wasOpen && !runtime.settingsOverlayOpen) {
        playToolbarButtonExitSoundEffect();
      }
    }
  });
  dom.closeEquipmentOverlay?.addEventListener("click", () => {
    const wasOpen = runtime.equipmentOverlayOpen;
    closeEquipmentOverlay();
    if (wasOpen && !runtime.equipmentOverlayOpen) {
      playToolbarButtonExitSoundEffect();
    }
  });
  dom.equipmentOverlay?.addEventListener("wheel", handleOverlayWheelScroll, { passive: false });
  dom.equipmentOverlay?.addEventListener("click", (event) => {
    if (event.target === dom.equipmentOverlay) {
      const wasOpen = runtime.equipmentOverlayOpen;
      closeEquipmentOverlay();
      if (wasOpen && !runtime.equipmentOverlayOpen) {
        playToolbarButtonExitSoundEffect();
      }
    }
  });
  dom.violenceGoreToggleInput?.addEventListener("change", (event) => {
    setContentSetting("violenceAndGoreEnabled", event.currentTarget?.checked);
  });
  const handleSoundMuteToggleInput = (event) => {
    setSoundMuted(event.currentTarget?.checked);
  };
  dom.soundMuteToggleInput?.addEventListener("input", handleSoundMuteToggleInput);
  dom.soundMuteToggleInput?.addEventListener("change", handleSoundMuteToggleInput);
  const handleUiMuteToggleInput = (event) => {
    setUiSoundsMuted(event.currentTarget?.checked);
  };
  dom.uiMuteToggleInput?.addEventListener("input", handleUiMuteToggleInput);
  dom.uiMuteToggleInput?.addEventListener("change", handleUiMuteToggleInput);
  dom.ambientBubblesToggleInput?.addEventListener("change", (event) => {
    setAmbientBubblesEnabled(event.currentTarget?.checked);
  });
  dom.waterParticlesToggleInput?.addEventListener("change", (event) => {
    setWaterParticlesEnabled(event.currentTarget?.checked);
  });
  dom.uvLightQualitySelect?.addEventListener("change", (event) => {
    setUvLightRenderQuality(event.currentTarget?.value);
  });
  dom.halloweenModeSelect?.addEventListener("change", (event) => {
    setHalloweenMode(event.currentTarget?.value);
  });
  dom.tankMouseLockToggleInput?.addEventListener("change", (event) => {
    setTankMouseInputLocked(event.currentTarget?.checked);
  });
  dom.settingsOverlay?.addEventListener("change", (event) => {
    const toolbarInput = event.target.closest("[data-toolbar-position-choice]");
    if (toolbarInput instanceof HTMLInputElement) {
      setToolbarPosition(toolbarInput.value);
      return;
    }

    const displayInput = event.target.closest("[data-display-position-choice]");
    if (displayInput instanceof HTMLInputElement) {
      setDisplayPosition(displayInput.value);
    }
  });
  dom.storeFoodTab?.addEventListener("click", () => {
    runtime.storeTab = "food";
    renderUi(Date.now());
  });
  dom.storePharmacyTab?.addEventListener("click", () => {
    runtime.storeTab = "pharmacy";
    renderUi(Date.now());
  });
  dom.storeFishTab.addEventListener("click", () => {
    runtime.storeTab = "fish";
    renderUi(Date.now());
  });
  dom.storeDecorTab.addEventListener("click", () => {
    runtime.storeTab = "decor";
    renderUi(Date.now());
  });
  dom.storeEquipmentTab?.addEventListener("click", () => {
    runtime.storeTab = "equipment";
    renderUi(Date.now());
  });
  dom.tankManagementCard?.addEventListener("click", playTankInfoActionSound, true);
  dom.tankManagementCard?.addEventListener("click", (event) => {
    if (event.target.closest("[data-open-aquarium-overview]")) {
      openAquariumOverview(false);
      return;
    }
    if (event.target.closest("[data-extend-aquarium]")) {
      openAquariumOverview(true);
      return;
    }
    const openStoreButton = event.target.closest("[data-open-store-tab]");
    if (openStoreButton) {
      openStoreOverlay(openStoreButton.dataset.openStoreTab);
      return;
    }

    if (event.target.closest("[data-open-equipment-overlay]")) {
      openEquipmentOverlay();
      return;
    }

    if (event.target.closest("[data-edit-tank-name]")) {
      const tank = getCurrentTank();
      if (!tank) {
        return;
      }
      runtime.editingTankNameId = tank.id;
      runtime.editingTankNameValue = getTankLabel(tank);
      renderUi(Date.now());
      window.requestAnimationFrame(() => {
        const input = dom.tankManagementCard?.querySelector("[data-tank-name-input]");
        input?.focus?.();
        input?.select?.();
      });
      return;
    }

    if (event.target.closest("[data-save-tank-name]")) {
      saveCurrentTankName();
      return;
    }

    if (event.target.closest("[data-cancel-tank-name]")) {
      cancelCurrentTankNameEdit();
      return;
    }

    if (event.target.closest("[data-sell-current-tank]")) {
      sellCurrentTank();
    }
  });
  dom.tankManagementCard?.addEventListener("input", (event) => {
    const input = event.target.closest("[data-tank-name-input]");
    if (input) {
      runtime.editingTankNameValue = input.value;
    }
  });
  dom.tankManagementCard?.addEventListener("keydown", (event) => {
    const input = event.target.closest("[data-tank-name-input]");
    if (!input) {
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      saveCurrentTankName();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelCurrentTankNameEdit();
    }
  });
  dom.toggleEditMode.addEventListener("click", () => toggleEditTankMode(null, { source: "sidebar" }));
  dom.editDecorTray?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  dom.editDecorTray?.addEventListener("pointermove", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tile = target?.closest(".edit-decor-tile.is-decor-type-tile");
    if (!(tile instanceof HTMLElement)) {
      return;
    }
    const rect = tile.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const xPercent = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPercent = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    tile.style.setProperty("--decor-reflection-x", `${xPercent.toFixed(1)}%`);
    tile.style.setProperty("--decor-reflection-y", `${yPercent.toFixed(1)}%`);
  });
  dom.editDecorTray?.addEventListener("pointerleave", () => {
    for (const tile of dom.editDecorTray?.querySelectorAll?.(".edit-decor-tile.is-decor-type-tile") || []) {
      tile.style.removeProperty("--decor-reflection-x");
      tile.style.removeProperty("--decor-reflection-y");
    }
  });
  dom.editDecorTray?.addEventListener("click", (event) => {
    event.stopPropagation();
    const tab = event.target.closest("[data-decor-tray-tab]");
    if (tab) {
      const nextTab = ["caves", "plants", "ornaments", "bubbler", "custom"].includes(tab.dataset.decorTrayTab)
        ? tab.dataset.decorTrayTab
        : "all";
      if (runtime.editDecorTrayTab !== nextTab) {
        runtime.editDecorTrayTab = nextTab;
        closeEditDecorTrayContextMenu({ render: false });
        if (dom.editDecorTrayScroller) {
          dom.editDecorTrayScroller.scrollLeft = 0;
        }
        renderEditDecorTray();
      }
    }
  });
  dom.editDecorTray?.addEventListener("change", (event) => {
    const freePlacementToggle = event.target.closest("[data-decor-free-placement-toggle]");
    if (freePlacementToggle) {
      setFreeDecorPlacementEnabled(Boolean(freePlacementToggle.checked));
      return;
    }
    const toggle = event.target.closest("[data-decor-in-tank-toggle]");
    if (!toggle) {
      return;
    }
    runtime.editDecorTrayInTank = Boolean(toggle.checked);
    closeEditDecorTrayContextMenu({ render: false });
    if (dom.editDecorTrayScroller) {
      dom.editDecorTrayScroller.scrollLeft = 0;
    }
    renderEditDecorTray();
  });
  dom.editDecorTray?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  dom.editDecorTray?.addEventListener("wheel", handleEditDecorTrayWheel, { passive: false });
  dom.editDecorTrayContextMenu?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  dom.editDecorTrayContextMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
    const sellButton = event.target.closest("[data-tray-sell-decor]");
    if (sellButton) {
      closeEditDecorTrayContextMenu({ render: false });
      sellStoredDecor(sellButton.dataset.traySellDecor);
      return;
    }
    const buyAnotherButton = event.target.closest("[data-tray-buy-another-decor]");
    if (buyAnotherButton) {
      closeEditDecorTrayContextMenu({ render: false });
      openDecorBuyAnotherConfirmation(buyAnotherButton.dataset.trayBuyAnotherDecor);
      return;
    }
    const selectPlacedButton = event.target.closest("[data-tray-select-placed-decor-action]");
    if (selectPlacedButton) {
      closeEditDecorTrayContextMenu({ render: false });
      selectPlacedDecorFromTray(selectPlacedButton.dataset.traySelectPlacedDecorAction, {
        additive: isAdditiveDecorSelectionEvent(event)
      });
      return;
    }
    const editDecorSettingsButton = event.target.closest("[data-tray-edit-decor-settings]");
    if (editDecorSettingsButton) {
      closeEditDecorTrayContextMenu({ render: false });
      openDecorSettings(editDecorSettingsButton.dataset.trayEditDecorSettings);
      return;
    }
    const ungroupButton = event.target.closest("[data-tray-ungroup-decor]");
    if (ungroupButton) {
      closeEditDecorTrayContextMenu({ render: false });
      setSelectedDecor(ungroupButton.dataset.trayUngroupDecor);
      ungroupSelectedDecor();
      return;
    }
    const storePlacedButton = event.target.closest("[data-tray-store-placed-decor]");
    if (storePlacedButton) {
      closeEditDecorTrayContextMenu({ render: false });
      storeDecor(storePlacedButton.dataset.trayStorePlacedDecor);
      return;
    }
    const sellPlacedButton = event.target.closest("[data-tray-sell-placed-decor]");
    if (sellPlacedButton) {
      closeEditDecorTrayContextMenu({ render: false });
      sellPlacedDecor(sellPlacedButton.dataset.traySellPlacedDecor);
    }
  });
  dom.editDecorTrayContextMenu?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  dom.editDecorTrayScroller?.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-decor-tray-entry-id]");
    clearEditDecorTrayLongPress();
    if (!button || event.button !== 0) {
      return;
    }

    const entryId = normalizeDecorTrayEntryId(button.dataset.decorTrayEntryId);
    const entry = getDecorTrayEntryById(entryId);
    if (!entry) {
      return;
    }

    runtime.editDecorTrayLongPress.pointerId = Number.isInteger(event.pointerId) ? event.pointerId : null;
    runtime.editDecorTrayLongPress.decorKey = entry.decorKey;
    runtime.editDecorTrayLongPress.entryId = entry.id;
    runtime.editDecorTrayLongPress.startClientX = Number.isFinite(event.clientX) ? event.clientX : 0;
    runtime.editDecorTrayLongPress.startClientY = Number.isFinite(event.clientY) ? event.clientY : 0;
    runtime.editDecorTrayLongPress.timerId = window.setTimeout(() => {
      const entryId = runtime.editDecorTrayLongPress.entryId;
      const entry = getDecorTrayEntryById(entryId);
      runtime.editDecorTrayLongPress.timerId = 0;
      if (!entry) {
        return;
      }

      runtime.suppressEditDecorTrayClickDecorKey = entry.decorKey;
      runtime.suppressEditDecorTrayClickEntryId = entry.id;
      window.setTimeout(() => {
        if (runtime.suppressEditDecorTrayClickDecorKey === entry.decorKey) {
          runtime.suppressEditDecorTrayClickDecorKey = null;
        }
        if (runtime.suppressEditDecorTrayClickEntryId === entry.id) {
          runtime.suppressEditDecorTrayClickEntryId = null;
        }
      }, 700);
      openEditDecorTrayContextMenu(entry.id, button);
    }, EDIT_TRAY_LONG_PRESS_MS);
  });
  dom.editDecorTrayScroller?.addEventListener("pointermove", (event) => {
    if (!runtime.editDecorTrayLongPress.timerId) {
      return;
    }
    if (
      Number.isInteger(runtime.editDecorTrayLongPress.pointerId)
      && Number.isInteger(event.pointerId)
      && runtime.editDecorTrayLongPress.pointerId !== event.pointerId
    ) {
      return;
    }

    const moveDistance = Math.hypot(
      (Number.isFinite(event.clientX) ? event.clientX : 0) - runtime.editDecorTrayLongPress.startClientX,
      (Number.isFinite(event.clientY) ? event.clientY : 0) - runtime.editDecorTrayLongPress.startClientY
    );
    if (moveDistance > EDIT_TRAY_LONG_PRESS_MOVE_PX) {
      clearEditDecorTrayLongPress(event.pointerId);
    }
  });
  dom.editDecorTrayScroller?.addEventListener("pointerup", (event) => clearEditDecorTrayLongPress(event.pointerId));
  dom.editDecorTrayScroller?.addEventListener("pointercancel", (event) => clearEditDecorTrayLongPress(event.pointerId));
  dom.editDecorTrayScroller?.addEventListener("pointerleave", (event) => clearEditDecorTrayLongPress(event.pointerId));
  dom.editDecorTrayScroller?.addEventListener("contextmenu", (event) => {
    const button = event.target.closest("[data-decor-tray-entry-id]");
    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearEditDecorTrayLongPress();
    openEditDecorTrayContextMenu(button.dataset.decorTrayEntryId, {
      clientX: event.clientX,
      clientY: event.clientY
    });
  });
  dom.editDecorTrayScroller?.addEventListener("click", (event) => {
    const menuButton = event.target.closest("[data-open-decor-tray-menu]");
    if (menuButton) {
      event.stopPropagation();
      clearEditDecorTrayLongPress();
      openEditDecorTrayContextMenu(menuButton.dataset.openDecorTrayMenu, menuButton);
      return;
    }

    const button = event.target.closest("[data-tray-place-decor]");
    if (button) {
      event.stopPropagation();
      if (
        shouldSuppressEditDecorTrayEntryClick(button.dataset.decorTrayEntryId)
        || shouldSuppressEditDecorTrayPlaceClick(button.dataset.trayPlaceDecor)
      ) {
        return;
      }

      closeEditDecorTrayContextMenu({ render: false });
      playToolbarButtonSoundEffect("press");
      startPlacingDecor(button.dataset.trayPlaceDecor);
      return;
    }

    const placedButton = event.target.closest("[data-tray-select-placed-decor]");
    if (placedButton) {
      event.stopPropagation();
      if (isAdditiveDecorSelectionEvent(event)) {
        event.preventDefault();
      }
      if (shouldSuppressEditDecorTrayEntryClick(placedButton.dataset.decorTrayEntryId)) {
        return;
      }

      closeEditDecorTrayContextMenu({ render: false });
      playToolbarButtonSoundEffect("press");
      selectPlacedDecorFromTray(placedButton.dataset.traySelectPlacedDecor, {
        additive: isAdditiveDecorSelectionEvent(event)
      });
    }
  });
  dom.editDecorTrayScroller?.addEventListener("scroll", () => {
    clearEditDecorTrayLongPress();
    closeEditDecorTrayContextMenu();
    syncEditDecorTrayScrollControls();
  });
  dom.editDecorTrayPrev?.addEventListener("click", () => {
    closeEditDecorTrayContextMenu();
    scrollEditDecorTray(-1);
  });
  dom.editDecorTrayNext?.addEventListener("click", () => {
    closeEditDecorTrayContextMenu();
    scrollEditDecorTray(1);
  });
  dom.editFishTray?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  dom.editFishTray?.addEventListener("pointermove", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const tile = target?.closest(".edit-decor-tile.is-fish-mood-tile");
    if (!(tile instanceof HTMLElement)) {
      return;
    }
    const rect = tile.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const xPercent = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const yPercent = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
    tile.style.setProperty("--fish-reflection-x", `${xPercent.toFixed(1)}%`);
    tile.style.setProperty("--fish-reflection-y", `${yPercent.toFixed(1)}%`);
  });
  dom.editFishTray?.addEventListener("pointerleave", () => {
    for (const tile of dom.editFishTray?.querySelectorAll?.(".edit-decor-tile.is-fish-mood-tile") || []) {
      tile.style.removeProperty("--fish-reflection-x");
      tile.style.removeProperty("--fish-reflection-y");
    }
  });
  dom.editFishTray?.addEventListener("click", (event) => {
    event.stopPropagation();
    const tab = event.target.closest("[data-fish-tray-tab]");
    if (tab) {
      const nextTab = tab.dataset.fishTrayTab === "storage" ? "storage" : "tank";
      if (runtime.fishEditTrayTab !== nextTab) {
        runtime.fishEditTrayTab = nextTab;
        closeEditFishTrayContextMenu({ render: false });
        if (dom.editFishTrayScroller) {
          dom.editFishTrayScroller.scrollLeft = 0;
        }
        renderEditFishTray();
      }
    }
  });
  dom.editFishTray?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  dom.editFishTray?.addEventListener("wheel", handleEditFishTrayWheel, { passive: false });
  dom.editFishTrayContextMenu?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  dom.editFishTrayContextMenu?.addEventListener("click", (event) => {
    event.stopPropagation();
    const placeButton = event.target.closest("[data-tray-place-fish]");
    if (placeButton) {
      closeEditFishTrayContextMenu({ render: false });
      restoreFishToTank(placeButton.dataset.trayPlaceFish);
      return;
    }
    const sellButton = event.target.closest("[data-tray-sell-fish]");
    if (sellButton) {
      closeEditFishTrayContextMenu({ render: false });
      openFishSellConfirmation(sellButton.dataset.traySellFish);
      return;
    }
    const disposeButton = event.target.closest("[data-tray-dispose-fish]");
    if (disposeButton) {
      closeEditFishTrayContextMenu({ render: false });
      disposeFish(disposeButton.dataset.trayDisposeFish);
    }
  });
  dom.editFishTrayContextMenu?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  dom.editFishTrayScroller?.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-tray-restore-fish]");
    clearEditFishTrayLongPress();
    if (!button || event.button !== 0) {
      return;
    }

    runtime.editFishTrayLongPress.pointerId = Number.isInteger(event.pointerId) ? event.pointerId : null;
    runtime.editFishTrayLongPress.fishId = button.dataset.trayRestoreFish;
    runtime.editFishTrayLongPress.startClientX = Number.isFinite(event.clientX) ? event.clientX : 0;
    runtime.editFishTrayLongPress.startClientY = Number.isFinite(event.clientY) ? event.clientY : 0;
    runtime.editFishTrayLongPress.timerId = window.setTimeout(() => {
      const fishId = runtime.editFishTrayLongPress.fishId;
      runtime.editFishTrayLongPress.timerId = 0;
      if (!fishId) {
        return;
      }

      runtime.suppressEditFishTrayClickFishId = fishId;
      window.setTimeout(() => {
        if (runtime.suppressEditFishTrayClickFishId === fishId) {
          runtime.suppressEditFishTrayClickFishId = null;
        }
      }, 700);
      openEditFishTrayContextMenu(fishId, button);
    }, EDIT_TRAY_LONG_PRESS_MS);
  });
  dom.editFishTrayScroller?.addEventListener("pointermove", (event) => {
    if (!runtime.editFishTrayLongPress.timerId) {
      return;
    }
    if (
      Number.isInteger(runtime.editFishTrayLongPress.pointerId)
      && Number.isInteger(event.pointerId)
      && runtime.editFishTrayLongPress.pointerId !== event.pointerId
    ) {
      return;
    }

    const moveDistance = Math.hypot(
      (Number.isFinite(event.clientX) ? event.clientX : 0) - runtime.editFishTrayLongPress.startClientX,
      (Number.isFinite(event.clientY) ? event.clientY : 0) - runtime.editFishTrayLongPress.startClientY
    );
    if (moveDistance > EDIT_TRAY_LONG_PRESS_MOVE_PX) {
      clearEditFishTrayLongPress(event.pointerId);
    }
  });
  dom.editFishTrayScroller?.addEventListener("pointerup", (event) => clearEditFishTrayLongPress(event.pointerId));
  dom.editFishTrayScroller?.addEventListener("pointercancel", (event) => clearEditFishTrayLongPress(event.pointerId));
  dom.editFishTrayScroller?.addEventListener("pointerleave", (event) => clearEditFishTrayLongPress(event.pointerId));
  dom.editFishTrayScroller?.addEventListener("contextmenu", (event) => {
    const button = event.target.closest("[data-tray-restore-fish]");
    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    clearEditFishTrayLongPress();
    openEditFishTrayContextMenu(button.dataset.trayRestoreFish, {
      clientX: event.clientX,
      clientY: event.clientY
    });
  });
  dom.editFishTrayScroller?.addEventListener("click", (event) => {
    const selectButton = event.target.closest("[data-tray-select-fish]");
    if (selectButton) {
      event.stopPropagation();
      const fishId = selectButton.dataset.traySelectFish;
      clearPrimaryToolModes();
      openFishActionMenu(fishId);
      return;
    }
    const menuButton = event.target.closest("[data-open-fish-tray-menu]");
    if (menuButton) {
      event.stopPropagation();
      clearEditFishTrayLongPress();
      openEditFishTrayContextMenu(menuButton.dataset.openFishTrayMenu, menuButton);
      return;
    }

    const button = event.target.closest("[data-tray-restore-fish]");
    if (button) {
      event.stopPropagation();
      if (shouldSuppressEditFishTrayRestoreClick(button.dataset.trayRestoreFish)) {
        return;
      }

      closeEditFishTrayContextMenu({ render: false });
      const managed = getManagedFishById(button.dataset.trayRestoreFish);
      if (managed && isFishDead(managed.fish)) {
        disposeFish(button.dataset.trayRestoreFish);
      } else {
        restoreFishToTank(button.dataset.trayRestoreFish);
      }
    }
  });
  dom.editFishTrayScroller?.addEventListener("scroll", () => {
    clearEditFishTrayLongPress();
    closeEditFishTrayContextMenu();
    syncEditFishTrayScrollControls();
  });
  dom.editFishTrayPrev?.addEventListener("click", () => {
    closeEditFishTrayContextMenu();
    scrollEditFishTray(-1);
  });
  dom.editFishTrayNext?.addEventListener("click", () => {
    closeEditFishTrayContextMenu();
    scrollEditFishTray(1);
  });
  dom.foodTray?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  dom.foodTray?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  dom.foodTray?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  dom.foodTray?.addEventListener("wheel", handleFoodTrayWheel, { passive: false });
  dom.foodTrayScroller?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-food]");
    if (button) {
      event.stopPropagation();
      playToolbarButtonSoundEffect("press");
      selectFoodMode(button.dataset.selectFood);
    }
  });
  dom.foodTrayScroller?.addEventListener("scroll", () => syncFoodTrayScrollControls());
  dom.foodTrayPrev?.addEventListener("click", () => scrollFoodTray(-1));
  dom.foodTrayNext?.addEventListener("click", () => scrollFoodTray(1));
  dom.medicineTray?.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  dom.medicineTray?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  dom.medicineTray?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  dom.medicineTray?.addEventListener("wheel", handleMedicineTrayWheel, { passive: false });
  dom.medicineTrayScroller?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-medicine]");
    if (button) {
      event.stopPropagation();
      playToolbarButtonSoundEffect("press");
      selectMedicineMode(button.dataset.selectMedicine);
    }
  });
  dom.medicineTrayScroller?.addEventListener("scroll", () => syncMedicineTrayScrollControls());
  dom.medicineTrayPrev?.addEventListener("click", () => scrollMedicineTray(-1));
  dom.medicineTrayNext?.addEventListener("click", () => scrollMedicineTray(1));
  dom.toggleSidebar.addEventListener("click", () => {
    runtime.sidebarCollapsed = !runtime.sidebarCollapsed;
    renderUi(Date.now());
  });

  dom.tankSidebar.addEventListener("click", () => {
    if (!hasToolbarTriggeredToolMode()) {
      return;
    }

    clearPrimaryToolModes();
    renderToolCursor();
    renderUi(Date.now());
  });

  for (const button of dom.tabButtons) {
    button.addEventListener("click", () => {
      runtime.activeTab = button.dataset.tab;
      renderTabs();
      renderUi(Date.now());
    });
  }

  dom.fishShop.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-fish]");
    if (button) {
      buyFish(button.dataset.buyFish);
    }
  });
  dom.foodShop?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-food]");
    if (button) {
      buyFood(button.dataset.buyFood);
    }
  });
  dom.pharmacyShop?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-medicine]");
    if (button) {
      buyMedicine(button.dataset.buyMedicine);
    }
  });
  dom.utilityOverlayBody?.addEventListener("click", playUtilityOverlayActionSound, true);
  dom.utilityOverlayBody?.addEventListener("click", (event) => {
    dispatchUtilityOverlayTargetEvent("onBodyClick", event);
  });
  dom.utilityOverlayBody?.addEventListener("pointerdown", playUtilityOverlayPointerDownSound, true);
  dom.utilityOverlayBody?.addEventListener("pointerdown", (event) => {
    dispatchUtilityOverlayPointerEvent("onBodyPointerDown", event);
  });
  dom.utilityOverlayBody?.addEventListener("pointermove", (event) => {
    dispatchUtilityOverlayPointerEvent("onBodyPointerMove", event);
  });
  dom.utilityOverlayBody?.addEventListener("pointerup", playUtilityOverlayPointerUpSound, true);
  dom.utilityOverlayBody?.addEventListener("pointerup", (event) => {
    dispatchUtilityOverlayPointerEvent("onBodyPointerUp", event);
  });
  dom.utilityOverlayBody?.addEventListener("pointercancel", (event) => {
    dispatchUtilityOverlayPointerEvent("onBodyPointerCancel", event);
  });
  dom.utilityOverlayBody?.addEventListener("focusin", (event) => {
    dispatchUtilityOverlayTargetEvent("onBodyFocusIn", event);
    const keyboardInput = getWallpaperKeyboardNameInput(event.target);
    if (keyboardInput) {
      runtime.wallpaperUtilityKeyboardOpenId = keyboardInput.dataset.wallpaperKeyboardInput || "";
      syncWallpaperUtilityNameKeyboards();
    }
  });
  dom.utilityOverlayBody?.addEventListener("input", playUtilityOverlayInputSound, true);
  dom.utilityOverlayBody?.addEventListener("input", (event) => {
    const tubeName = event.target instanceof Element ? event.target.closest("[data-transit-tube-name]") : null;
    if (tubeName instanceof HTMLInputElement) {
      updateTransitTubeName(tubeName.dataset.transitTubeName, tubeName.value);
    }
    dispatchUtilityOverlayTargetEvent("onBodyInput", event);
    syncWallpaperUtilityNameKeyboards();
  });
  dom.utilityOverlayBody?.addEventListener("change", playUtilityOverlayChangeSound, true);
  dom.utilityOverlayBody?.addEventListener("change", (event) => {
    const tubeLink = event.target instanceof Element ? event.target.closest("[data-transit-tube-link]") : null;
    if (tubeLink instanceof HTMLSelectElement) {
      linkTransitTubes(tubeLink.dataset.transitTubeLink, tubeLink.value);
      return;
    }
    dispatchUtilityOverlayTargetEvent("onBodyChange", event);
  });
  dom.utilityOverlayBody?.addEventListener("keydown", (event) => {
    dispatchUtilityOverlayTargetEvent("onBodyKeyDown", event);
  });
  dom.utilityOverlayBody?.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-wallpaper-keyboard] [data-fish-name-key], [data-wallpaper-keyboard] [data-fish-name-action]")
      : null;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const keyboard = button.closest("[data-wallpaper-keyboard]");
    const input = keyboard instanceof HTMLElement
      ? [...(dom.utilityOverlayBody?.querySelectorAll?.("[data-wallpaper-keyboard-input]") || [])]
        .find((candidate) => candidate instanceof HTMLInputElement && candidate.dataset.wallpaperKeyboardInput === keyboard.dataset.wallpaperKeyboard)
      : null;
    if (!(input instanceof HTMLInputElement)) {
      return;
    }
    event.preventDefault();
    applyWallpaperNameKeyboardActionToInput(input, button.dataset.fishNameAction || button.dataset.fishNameKey || "");
    runtime.wallpaperUtilityKeyboardOpenId = input.dataset.wallpaperKeyboardInput || "";
    syncWallpaperUtilityNameKeyboards();
  });
  dom.utilityOverlayFooter?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }
    if (dispatchUtilityOverlayTargetEvent("onFooterClick", event)) {
      return;
    }
    if (target.closest("[data-close-utility]")) {
      requestCloseUtilityOverlay();
    }
  });

  dom.fishShop.addEventListener("change", (event) => {
    const select = event.target.closest("[data-shop-sort]");
    if (select) {
      setStoreSort(select.dataset.shopSort, select.value);
      return;
    }

    const filterSelect = event.target.closest("[data-shop-filter]");
    if (filterSelect) {
      setStoreFilter(filterSelect.dataset.shopFilter, filterSelect.value);
    }
  });
  dom.fishShop.addEventListener("input", (event) => {
    const input = event.target.closest("[data-shop-search]");
    if (input instanceof HTMLInputElement) {
      setStoreSearchQuery(input.dataset.shopSearch, input.value, {
        preserveFocus: true,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd
      });
    }
  });

  dom.decorShop.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-decor]");
    if (button) {
      buyDecor(button.dataset.buyDecor);
    }
  });

  dom.decorShop.addEventListener("change", (event) => {
    const select = event.target.closest("[data-shop-sort]");
    if (select) {
      setStoreSort(select.dataset.shopSort, select.value);
    }
  });
  dom.decorShop.addEventListener("input", (event) => {
    const input = event.target.closest("[data-shop-search]");
    if (input instanceof HTMLInputElement) {
      setStoreSearchQuery(input.dataset.shopSearch, input.value, {
        preserveFocus: true,
        selectionStart: input.selectionStart,
        selectionEnd: input.selectionEnd
      });
    }
  });

  dom.equipmentShop?.addEventListener("click", (event) => {
    const backgroundBuyButton = event.target.closest("[data-buy-background]");
    if (backgroundBuyButton) {
      buyBackground(backgroundBuyButton.dataset.buyBackground);
      return;
    }

    const backgroundUseButton = event.target.closest("[data-use-background-shop]");
    if (backgroundUseButton) {
      selectBackground(backgroundUseButton.dataset.useBackgroundShop);
      return;
    }

    const buyButton = event.target.closest("[data-buy-filter]");
    if (buyButton) {
      buyFilter(buyButton.dataset.buyFilter);
      return;
    }

    const buyAutoDispenserButton = event.target.closest("[data-buy-auto-dispenser]");
    if (buyAutoDispenserButton) {
      buyAutoDispenser();
      return;
    }

    const buyUvLightButton = event.target.closest("[data-buy-uv-light]");
    if (buyUvLightButton) {
      buyUvLight();
      return;
    }

    const sellButton = event.target.closest("[data-sell-filter]");
    if (sellButton) {
      sellFilter(sellButton.dataset.sellFilter);
      return;
    }

    const tankButton = event.target.closest("[data-extend-aquarium-store]");
    if (tankButton) {
      beginAquariumExpansionPurchase();
      return;
    }

    const equipButton = event.target.closest("[data-equip-filter]");
    if (equipButton) {
      selectFilterAsset(equipButton.dataset.equipFilter);
    }
  });

  dom.decorWorkspace.addEventListener("click", (event) => {
    const toggleButton = event.target.closest("[data-collapsible-toggle]");
    if (toggleButton) {
      toggleSidebarSection(toggleButton.dataset.collapsibleToggle);
    }
  });

  dom.decorInventory.addEventListener("click", playSelectedDecorActionSound, true);
  dom.decorInventory.addEventListener("click", (event) => {
    const sizeButton = event.target.closest("[data-size-decor]");
    if (sizeButton) {
      adjustDecorDefaultSize(sizeButton.dataset.sizeDecor, Number(sizeButton.dataset.sizeDirection) || 0);
      return;
    }

    const sellButton = event.target.closest("[data-sell-decor-inventory]");
    if (sellButton) {
      sellStoredDecor(sellButton.dataset.sellDecorInventory);
      return;
    }

    const button = event.target.closest("[data-place-decor]");
    if (button) {
      startPlacingDecor(button.dataset.placeDecor);
    }
  });

  dom.placedDecorList.addEventListener("click", playSelectedDecorActionSound, true);
  dom.placedDecorList.addEventListener("click", (event) => {
    if (event.target.closest("[data-group-selected-decor]")) {
      groupSelectedDecor();
      return;
    }

    if (event.target.closest("[data-ungroup-selected-decor]")) {
      ungroupSelectedDecor();
      return;
    }

    const ungroupButton = event.target.closest("[data-ungroup-decor]");
    if (ungroupButton) {
      setSelectedDecor(ungroupButton.dataset.ungroupDecor);
      ungroupSelectedDecor();
      return;
    }

    const decorSettingsButton = event.target.closest("[data-edit-decor-settings]");
    if (decorSettingsButton) {
      openDecorSettings(decorSettingsButton.dataset.editDecorSettings);
      return;
    }

    const resizeButton = event.target.closest("[data-resize-placed]");
    if (resizeButton) {
      adjustPlacedDecorSize(resizeButton.dataset.resizePlaced, Number(resizeButton.dataset.sizeDirection) || 0);
      return;
    }

    const sellButton = event.target.closest("[data-sell-decor-placed]");
    if (sellButton) {
      sellPlacedDecor(sellButton.dataset.sellDecorPlaced);
      return;
    }

    const defaultButton = event.target.closest("[data-copy-size]");
    if (defaultButton) {
      savePlacedDecorSizeAsDefault(defaultButton.dataset.copySize);
      return;
    }

    const button = event.target.closest("[data-store-decor]");
    if (button) {
      storeDecor(button.dataset.storeDecor);
    }
  });

  dom.fishList.addEventListener("click", (event) => {
    const toggleButton = event.target.closest("[data-collapsible-toggle]");
    if (toggleButton) {
      toggleSidebarSection(toggleButton.dataset.collapsibleToggle);
      return;
    }

    const disposeButton = event.target.closest("[data-dispose-fish]");
    if (disposeButton) {
      disposeFish(disposeButton.dataset.disposeFish);
      return;
    }

    const disposeAllDeadButton = event.target.closest("[data-dispose-all-dead]");
    if (disposeAllDeadButton) {
      disposeAllDeadFish();
      return;
    }

    const sellButton = event.target.closest("[data-sell-fish]");
    if (sellButton) {
      openFishSellConfirmation(sellButton.dataset.sellFish);
      return;
    }

    const storeButton = event.target.closest("[data-store-fish]");
    if (storeButton) {
      storeFish(storeButton.dataset.storeFish);
      return;
    }

    const restoreButton = event.target.closest("[data-restore-fish]");
    if (restoreButton) {
      restoreFishToTank(restoreButton.dataset.restoreFish);
      return;
    }

    const sizeButton = event.target.closest("[data-size-fish]");
    if (sizeButton) {
      adjustFishSize(sizeButton.dataset.sizeFish, Number(sizeButton.dataset.sizeDirection) || 0);
      return;
    }

    const defaultButton = event.target.closest("[data-copy-fish-size]");
    if (defaultButton) {
      saveFishSizeAsDefault(defaultButton.dataset.copyFishSize);
      return;
    }

    const button = event.target.closest("[data-open-fish]");
    if (button) {
      openFishInspector(button.dataset.openFish);
    }
  });

  const bindEquipmentSurface = (container) => {
    container?.addEventListener("click", playEquipmentSurfaceClickSound, true);
    container?.addEventListener("click", (event) => {
      const backgroundButton = event.target.closest("[data-select-background]");
      if (backgroundButton) {
        selectBackground(backgroundButton.dataset.selectBackground);
        return;
      }

      if (event.target.closest("[data-open-local-background-picker]")) {
        openLocalBackgroundPicker();
        return;
      }

      if (event.target.closest("[data-clear-local-background]")) {
        clearLocalBackgroundImage();
        return;
      }

      const solidBackgroundColorButton = event.target.closest("[data-solid-background-color]");
      if (solidBackgroundColorButton) {
        setSolidBackgroundColor(solidBackgroundColorButton.dataset.solidBackgroundColor);
        return;
      }

      const gradientBackgroundColorButton = event.target.closest("[data-gradient-background-color]");
      if (gradientBackgroundColorButton) {
        setGradientBackgroundColor(
          gradientBackgroundColorButton.dataset.gradientBackgroundRole,
          gradientBackgroundColorButton.dataset.gradientBackgroundColor
        );
        return;
      }

      const animatedBackgroundColorButton = event.target.closest("[data-animated-background-color]");
      if (animatedBackgroundColorButton) {
        setAnimatedBackgroundColor(
          animatedBackgroundColorButton.dataset.animatedBackgroundRole,
          animatedBackgroundColorButton.dataset.animatedBackgroundColor
        );
        return;
      }

      if (event.target.closest("[data-reset-animated-background-colors]")) {
        resetAnimatedBackgroundColors();
        return;
      }

      const tankButton = event.target.closest("[data-select-tank]");
      if (tankButton) {
        selectTankAsset(tankButton.dataset.selectTank);
        return;
      }

      const filterButton = event.target.closest("[data-select-filter]");
      if (filterButton) {
        selectFilterAsset(filterButton.dataset.selectFilter);
        return;
      }

      const uvLightButton = event.target.closest("[data-toggle-uv-light-install]");
      if (uvLightButton) {
        setUvLightInstalled(!isUvLightInstalled());
        return;
      }

      const swatchButton = event.target.closest("[data-custom-gravel-color]");
      if (swatchButton) {
        setCustomGravelLayerColor(
          Number(swatchButton.dataset.customGravelLayer),
          swatchButton.dataset.customGravelColor
        );
        return;
      }
    });

    container?.addEventListener("change", playEquipmentSurfaceChangeSound, true);
    container?.addEventListener("change", (event) => {
      const customGravelColorizeToggle = event.target.closest("[data-custom-gravel-colorize]");
      if (customGravelColorizeToggle instanceof HTMLInputElement) {
        setCustomGravelLayerColorize(
          Number(customGravelColorizeToggle.dataset.customGravelLayer),
          customGravelColorizeToggle.checked
        );
        return;
      }

      const solidBackgroundToggle = event.target.closest("[data-toggle-solid-background]");
      if (solidBackgroundToggle instanceof HTMLInputElement) {
        setSolidBackgroundEnabled(solidBackgroundToggle.checked);
        return;
      }

      const gradientBackgroundToggle = event.target.closest("[data-toggle-gradient-background]");
      if (gradientBackgroundToggle instanceof HTMLInputElement) {
        setGradientBackgroundEnabled(gradientBackgroundToggle.checked);
        return;
      }

      const animatedBackgroundToggle = event.target.closest("[data-toggle-animated-background]");
      if (animatedBackgroundToggle instanceof HTMLInputElement) {
        setAnimatedBackgroundEnabled(animatedBackgroundToggle.checked);
      }
    });
  };

  bindEquipmentSurface(dom.backgroundList);
  bindEquipmentSurface(dom.equipmentBackgroundList);
  bindEquipmentSurface(dom.equipmentBackgroundColorPanel);
  bindEquipmentSurface(dom.tankAssetList);
  bindEquipmentSurface(dom.filterAssetList);
  bindEquipmentSurface(dom.equipmentFilterList);
  bindEquipmentSurface(dom.uvLightList);
  bindEquipmentSurface(dom.equipmentUvLightList);
  bindEquipmentSurface(dom.customGravelPanel);
  bindEquipmentSurface(dom.equipmentCustomGravelPanel);

  const shouldCaptureTankDesktopInput = (target) => !isTankMouseInputLocked() && !isTankOverlayTarget(target);

  dom.tankStage.addEventListener("mousedown", (event) => {
    if (shouldCaptureTankDesktopInput(event.target)) {
      event.preventDefault();
    }
  });
  dom.tankStage.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  dom.tankStage.addEventListener("pointerdown", (event) => {
    clearGlassTapGesture();
    if (shouldCaptureTankDesktopInput(event.target)) {
      event.preventDefault();
    }
    if (isTankMouseInputLocked()) {
      runtime.pointerStagePx = null;
      renderToolCursor();
      return;
    }

    if (isTankOverlayTarget(event.target)) {
      return;
    }

    if (runtime.cleaningMode) {
      return;
    }

    const point = runtime.cleaningMode
      ? getTankPoint(event, { variant: "glass" })
      : getTankPoint(event);
    if (!point) {
      return;
    }
    renderToolCursor();
    runtime.lastTankPoint = point;

    if (runtime.scoopMode) {
      runtime.suppressNextTankClick = true;
      runtime.pointerDown = true;
      dom.tankStage.setPointerCapture(event.pointerId);
      rememberTankPointerCapture(event.pointerId);
      handleScoopAtPoint(point, Date.now());
      return;
    }

    if (runtime.editTankMode && runtime.placementMode) {
      placeDecorAtPoint(point.x / TANK_WIDTH, point.y / TANK_HEIGHT);
      return;
    }

    if (runtime.editTankMode) {
      const hitDecor = findPlacedDecorAtPoint(point.x, point.y);
      if (hitDecor) {
        playToolbarButtonReleaseSoundEffect();
        if (isAdditiveDecorSelectionEvent(event)) {
          event.preventDefault();
          runtime.suppressNextTankClick = true;
          runtime.placementMode = null;
          runtime.placementPreview = null;
          const item = setSelectedDecor(hitDecor.id, { additive: true });
          renderUi(Date.now(), { full: false });
          const selectedCount = getSelectedPlacedDecorItems().length;
          showToast(selectedCount > 1
            ? `${selectedCount} decor pieces selected.`
            : selectedCount === 1
              ? `${runtime.decorMap.get(item?.decorKey)?.name || titleFromFile(item?.decorKey || "Decor")} selected.`
              : "Decor selection cleared.");
          return;
        }
        beginDecorDrag(hitDecor, point, event.pointerId);
        return;
      }

      if (clearSelectedDecor()) {
        renderUi(Date.now(), { full: false });
      }

      //  const hitPebble = findLiveGravelPebbleAtPoint(point.x, point.y);
      //  if (hitPebble) {
      //    beginGravelPebbleDrag(hitPebble, point, event.pointerId, { existing: true });
      //    return;
      //  }
      //
      //  if (isPointNearGravelBed(point.x, point.y)) {
      //    const pluckedPebble = createLoosePebbleFromBed(point.x, point.y);
      //    beginGravelPebbleDrag(pluckedPebble, point, event.pointerId, { existing: false });
      //  }
      return;
    }

    const now = Date.now();
    const hitEgg = findFishEggAtPoint(point.x, point.y, now);
    if (hitEgg) {
      beginFishEggDrag(hitEgg, point, event.pointerId);
      return;
    }

    const hitFish = findFishAtPoint(point.x, point.y, now);
    if (hitFish && !isFishDead(hitFish)) {
      beginFishDrag(hitFish, point, event.pointerId);
      return;
    }

    beginGlassTapGesture(event, point, now);
  });

  dom.tankStage.addEventListener("click", (event) => {
    const quickGlassTapForThisClick = consumePendingGlassTapClick();
    if (isTankMouseInputLocked()) {
      runtime.suppressNextTankClick = false;
      runtime.suppressNextGlassTap = false;
      return;
    }

    if (runtime.suppressNextTankClick) {
      runtime.suppressNextTankClick = false;
      runtime.suppressNextGlassTap = false;
      return;
    }

    const suppressGlassTapForThisClick = runtime.suppressNextGlassTap;
    runtime.suppressNextGlassTap = false;

    if (
      isTankOverlayTarget(event.target)
      || runtime.editTankMode
      || runtime.cleaningMode
      || runtime.scoopMode
      || runtime.placementMode
      || runtime.dragState
      || runtime.fishDragState
      || runtime.eggDragState
      || runtime.pebbleDragState
    ) {
      return;
    }

    const point = getTankPoint(event);
    if (!point) {
      return;
    }
    runtime.lastTankPoint = point;

    if (handleAutoDispenserInteractionAtPoint(point, Date.now())) {
      return;
    }

    if (runtime.feedingModeFoodKey) {
      dropSelectedFoodAtPoint(point, Date.now());
      return;
    }

    if (runtime.medicineModeKey) {
      applySelectedMedicineAtPoint(point, Date.now());
      return;
    }

    const hitFish = findFishAtPoint(point.x, point.y, Date.now());
    if (hitFish) {
      openFishActionMenu(hitFish.id, point);
      return;
    }

    closeFishActionMenu();
    if (runtime.selectedFishId || runtime.selectedFishStatusFishId) {
      closeFishInspector();
    }
    if (!suppressGlassTapForThisClick && quickGlassTapForThisClick && canTriggerGlassTap(event)) {
      spawnGlassTapEffect(point);
    }
  });

  dom.tankStage.addEventListener("contextmenu", (event) => {
    if (isTankMouseInputLocked()) {
      return;
    }

    if (isTankOverlayTarget(event.target) || runtime.placementMode || runtime.dragState || runtime.fishDragState || runtime.eggDragState) {
      return;
    }

    if (shouldCaptureTankDesktopInput(event.target)) {
      event.preventDefault();
    }

    const point = getTankPoint(event);
    if (!point) {
      return;
    }

    if (runtime.fishEditMode) {
      const hitFish = findFishAtPoint(point.x, point.y, Date.now());
      if (!hitFish || isFishDead(hitFish)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      storeFish(hitFish.id);
      return;
    }

    if (runtime.editTankMode) {
      const hitDecor = findPlacedDecorAtPoint(point.x, point.y);
      if (!hitDecor) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      storeDecor(hitDecor.id);
    }
  });

  dom.tankStage.addEventListener("pointermove", (event) => {
    if (shouldCaptureTankDesktopInput(event.target)) {
      event.preventDefault();
    }
    if (isTankMouseInputLocked()) {
      runtime.pointerStagePx = null;
      runtime.lastScrubPoint = null;
      resetScrubWipeSoundState();
      renderToolCursor();
      return;
    }

    if (runtime.cleaningMode && isTankOverlayTarget(event.target)) {
      runtime.pointerStagePx = null;
      runtime.lastScrubPoint = null;
      resetScrubWipeSoundState();
      renderToolCursor();
      return;
    }

    const point = getTankPoint(event);
    updateGlassTapGesture(event, point);
    renderToolCursor();

    if (runtime.decorResizeState) {
      if (point) {
        updateDecorCornerResize(point);
      }
      return;
    }

    if (runtime.dragState) {
      if (point) {
        updateDraggedDecor(point);
      }
      return;
    }

    if (runtime.fishDragState) {
      if (point) {
        updateDraggedFish(point);
      }
      return;
    }

    if (runtime.eggDragState) {
      if (point) {
        updateDraggedFishEgg(point);
      }
      return;
    }

    //if (runtime.pebbleDragState) {
    //  if (point) {
    //    updateDraggedGravelPebble(point);
    //  }
    //  return;
    //}

    if (runtime.cleaningMode) {
      if (point) {
        scrubGlass(point.x, point.y);
      } else {
        runtime.lastScrubPoint = null;
        resetScrubWipeSoundState();
      }
      return;
    }

    if (runtime.scoopMode && runtime.pointerDown) {
      if (point) {
        handleScoopAtPoint(point, Date.now());
      }
      return;
    }

    if (runtime.editTankMode && runtime.placementMode) {
      if (isTankOverlayTarget(event.target)) {
        runtime.placementPreview = null;
        return;
      }

      runtime.lastTankPoint = point;
      runtime.placementPreview = point ? clampDecorPlacement(point.x / TANK_WIDTH, point.y / TANK_HEIGHT, {
        decorKey: runtime.placementMode.decorKey,
        tankLayer: runtime.placementMode.tankLayer,
        scale: runtime.placementMode.scale,
        flipped: runtime.placementMode.flipped,
        applyGravity: true
      }) : null;
    }
  });

  dom.tankStage.addEventListener("pointerleave", () => {
    runtime.pointerStagePx = null;
    runtime.lastScrubPoint = null;
    resetScrubWipeSoundState();
    renderToolCursor();
    if (!runtime.pointerDown && runtime.placementMode && !runtime.dragState && !runtime.fishDragState && !runtime.eggDragState && !runtime.pebbleDragState) {
      runtime.placementPreview = null;
    }
  });

  dom.closeInspector?.addEventListener("click", () => closeFishInspector());
  document.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    let consumedFishContextClick = false;
    if (
      (runtime.selectedFishId || runtime.selectedFishStatusFishId)
      && target
      && !target.closest(".fish-inspector, .selected-fish-needs-panel, [data-preserve-fish-selection]")
    ) {
      if (dom.tankStage?.contains(target) && !isTankOverlayTarget(target)) {
        runtime.suppressNextGlassTap = true;
      }
      closeFishInspector();
      consumedFishContextClick = true;
    }
    if (
      runtime.fishActionMenuFishId
      && dom.fishActionFlyout
      && !dom.fishActionFlyout.hidden
      && target
      && !target.closest(".fish-action-flyout, .fish-action-submenu, .fish-action-target-menu")
    ) {
      if (dom.tankStage?.contains(target) && !isTankOverlayTarget(target)) {
        runtime.suppressNextGlassTap = true;
      }
      closeFishActionMenu();
      consumedFishContextClick = true;
    } else if (
      runtime.fishActionTargetAction
      && target
      && !target.closest(".fish-action-flyout, .fish-action-submenu, .fish-action-target-menu")
    ) {
      closeFishActionTargetMenu();
      consumedFishContextClick = true;
    }
    if (consumedFishContextClick) {
      renderUi(Date.now(), { full: false });
    }
  });
  for (const container of [
    dom.selectedDecorActionBar,
    dom.selectedDecorScaleControls,
    dom.selectedDecorLayerControls,
    dom.selectedDecorResizeHandles
  ]) {
    container?.addEventListener("click", playSelectedDecorActionSound, true);
  }
  for (const handle of dom.selectedDecorResizeCornerHandles || []) {
    handle?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const corner = handle.dataset.selectedDecorResizeCorner;
      const placedId = handle.dataset.resizeDecor || runtime.selectedDecorId;
      const item = getPlacedDecorById(placedId);
      const point = getTankPoint(event);
      if (item && point) {
        playToolbarButtonReleaseSoundEffect();
        beginDecorCornerResize(item, corner, point, event.pointerId);
      }
    });
  }
  dom.selectedDecorScaleUpButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorScaleUpButton?.dataset.resizeDecor;
    if (placedId && placedId !== runtime.selectedDecorId) {
      setSelectedDecor(placedId);
    }
    performDecorEditShortcutAction("scale-up");
  });
  dom.selectedDecorScaleDownButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorScaleDownButton?.dataset.resizeDecor;
    if (placedId && placedId !== runtime.selectedDecorId) {
      setSelectedDecor(placedId);
    }
    performDecorEditShortcutAction("scale-down");
  });
  dom.selectedDecorLayerUpButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorLayerUpButton?.dataset.layerDecor;
    if (placedId && placedId !== runtime.selectedDecorId) {
      setSelectedDecor(placedId);
    }
    performDecorEditShortcutAction("layer-up");
  });
  dom.selectedDecorLayerDownButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorLayerDownButton?.dataset.layerDecor;
    if (placedId && placedId !== runtime.selectedDecorId) {
      setSelectedDecor(placedId);
    }
    performDecorEditShortcutAction("layer-down");
  });
  dom.selectedDecorBuyAnotherButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const decorKey = dom.selectedDecorBuyAnotherButton?.dataset.buyAnotherDecor;
    if (decorKey) {
      openDecorBuyAnotherConfirmation(decorKey);
    }
  });
  dom.selectedDecorSellButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorSellButton?.dataset.sellDecor;
    if (placedId) {
      openDecorSellConfirmation(placedId);
    }
  });
  dom.selectedDecorStoreButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorStoreButton?.dataset.storeDecor;
    if (placedId) {
      storeDecor(placedId);
    }
  });
  dom.selectedDecorAssignButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorAssignButton?.dataset.assignResidenceDecor;
    if (placedId) {
      openDecorResidenceAssignment(placedId);
    }
  });
  dom.selectedDecorSettingsButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const placedId = dom.selectedDecorSettingsButton?.dataset.editDecorSettings;
    if (placedId) {
      openDecorSettings(placedId);
    }
  });
  dom.inspectorBuyAnotherFish?.addEventListener("click", () => buyInspectorFish());
  dom.inspectorSellFish?.addEventListener("click", () => {
    const fishId = dom.inspectorSellFish?.dataset.sellFish;
    if (fishId) {
      openFishSellConfirmation(fishId);
    }
  });
  dom.inspectorStoreFish?.addEventListener("click", () => {
    const fishId = dom.inspectorStoreFish?.dataset.storeFish;
    if (fishId) {
      storeFish(fishId);
    }
  });
  dom.inspectorDisposeFish?.addEventListener("click", () => {
    const fishId = dom.inspectorDisposeFish?.dataset.disposeFish;
    if (fishId) {
      disposeFish(fishId);
    }
  });
  dom.saveFishName.addEventListener("click", () => saveInspectorName());
  dom.randomizeFishName?.addEventListener("click", () => randomizeInspectorName());
  dom.inspectorFishSettingsButton?.addEventListener("click", () => toggleFishInspectorSettings());
  dom.fishInspector?.addEventListener("click", playFishInspectorActionSound, true);
  dom.fishInspector?.addEventListener("pointerdown", beginFishInspectorSliderSound, true);
  dom.fishInspector?.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const actionButton = target?.closest("[data-fish-action]");
    if (actionButton instanceof HTMLButtonElement) {
      event.preventDefault();
      handleFishActionButtonClick(actionButton.dataset.fishAction || "");
      return;
    }
    const swatch = target?.closest("[data-inspector-fish-color]");
    if (swatch instanceof HTMLButtonElement) {
      event.preventDefault();
      updateInspectorFishSetting("color", swatch.dataset.inspectorFishColor || "");
    }
  });
  dom.fishInspector?.addEventListener("input", playFishInspectorSliderInputSound, true);
  dom.fishInspector?.addEventListener("input", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest("[data-inspector-fish-setting]");
    if (control instanceof HTMLInputElement) {
      updateInspectorFishSetting(
        control.dataset.inspectorFishSetting,
        control.type === "checkbox" ? control.checked : control.value
      );
    }
  });
  dom.fishInspector?.addEventListener("change", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const control = target?.closest("[data-inspector-fish-setting]");
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
      updateInspectorFishSetting(
        control.dataset.inspectorFishSetting,
        control instanceof HTMLInputElement && control.type === "checkbox" ? control.checked : control.value
      );
    }
  });
  dom.fishNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveInspectorName();
    }
  });
  dom.fishNameInput.addEventListener("focus", () => {
    runtime.fishNameKeyboardOpen = true;
    updateWallpaperFishNameKeyboard();
  });
  dom.fishNameInput.addEventListener("click", () => {
    runtime.fishNameKeyboardOpen = true;
    updateWallpaperFishNameKeyboard();
  });
  dom.fishNameInput.addEventListener("input", () => {
    setFishNameDraftFromInput();
    updateWallpaperFishNameKeyboard();
  });
  dom.clearFishName?.addEventListener("click", (event) => {
    event.preventDefault();
    runtime.fishNameKeyboardOpen = true;
    applyWallpaperFishNameKeyboardAction("clear");
  });
  dom.fishNameKeyboard?.addEventListener("click", (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-fish-name-key], [data-fish-name-action]")
      : null;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    event.preventDefault();
    applyWallpaperFishNameKeyboardAction(button.dataset.fishNameAction || button.dataset.fishNameKey || "");
  });

  const releasePointer = (event) => {
    clearEditDecorTrayLongPress(event && Number.isInteger(event.pointerId) ? event.pointerId : null);
    clearEditFishTrayLongPress(event && Number.isInteger(event.pointerId) ? event.pointerId : null);
    finalizeGlassTapGesture(event);
    runtime.pointerDown = false;
    runtime.lastScrubPoint = null;
    resetScrubWipeSoundState();
    if (runtime.decorResizeState) {
      finalizeDecorCornerResize();
    }
    if (runtime.dragState) {
      finalizeDecorDrag();
    }
    if (runtime.fishDragState) {
      finalizeFishDrag();
    }
    if (runtime.eggDragState) {
      finalizeFishEggDrag();
    }
    // if (runtime.pebbleDragState) {
    //   finalizeGravelPebbleDrag();
    // }

    releaseTankPointerCapture(event && Number.isInteger(event.pointerId) ? event.pointerId : runtime.capturedTankPointerId);

    if (!runtime.cleaningMode) {
      runtime.pointerStagePx = null;
    }
    renderToolCursor();
  };

  dom.tankStage.addEventListener("pointerup", (event) => {
    if (shouldCaptureTankDesktopInput(event.target)) {
      event.preventDefault();
    }
    releasePointer(event);
  });
  dom.tankStage.addEventListener("pointercancel", releasePointer);
  window.addEventListener("pointermove", (event) => {
    if (!runtime.decorResizeState) {
      return;
    }
    if (event.target instanceof Element && dom.tankStage?.contains(event.target)) {
      return;
    }
    event.preventDefault();
    const point = getTankPoint(event);
    if (point) {
      updateDecorCornerResize(point);
    }
  });
  const releaseActiveTankPointer = (event) => {
    if (
      runtime.pointerDown
      || runtime.decorResizeState
      || runtime.dragState
      || runtime.fishDragState
      || runtime.eggDragState
      || runtime.pebbleDragState
    ) {
      releasePointer(event);
    }
  };
  window.addEventListener("pointerup", releaseActiveTankPointer);
  window.addEventListener("pointercancel", releaseActiveTankPointer);
  window.addEventListener("pointerdown", (event) => {
    if (
      runtime.editDecorTrayContextMenuState.decorKey
      && !(event.target instanceof Element && event.target.closest("#editDecorTrayContextMenu"))
    ) {
      closeEditDecorTrayContextMenu();
    }
    if (!runtime.editFishTrayContextMenuState.fishId) {
      return;
    }
    if (event.target instanceof Element && event.target.closest("#editFishTrayContextMenu")) {
      return;
    }

    closeEditFishTrayContextMenu();
  });
  window.addEventListener("blur", releasePointer);
  window.addEventListener("beforeunload", saveState);
}

function configureCanvasContext(context) {
  if (!context) {
    return;
  }

  context.imageSmoothingEnabled = true;
  if ("imageSmoothingQuality" in context) {
    context.imageSmoothingQuality = "high";
  }
}

function updatePlayfieldCssVariables() {
  if (!dom.tankStage) {
    return;
  }

  const playfield = runtime.playfield || {};
  const left = Number(playfield.left) || 0;
  const top = Number(playfield.top) || 0;
  const width = Number(playfield.width) || TANK_WIDTH;
  const height = Number(playfield.height) || TANK_HEIGHT;
  dom.tankStage.style.setProperty("--playfield-left", `${left}px`);
  dom.tankStage.style.setProperty("--playfield-top", `${top}px`);
  dom.tankStage.style.setProperty("--playfield-width", `${width}px`);
  dom.tankStage.style.setProperty("--playfield-height", `${height}px`);
  dom.tankStage.style.setProperty("--playfield-right", `${left + width}px`);
  dom.tankStage.style.setProperty("--playfield-bottom", `${top + height}px`);
}

function resizeDisplayCanvases() {
  const rect = dom.tankStage.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }

  const dpr = getStageRenderDevicePixelRatio();
  const displayWidth = Math.max(1, Math.round(rect.width * dpr));
  const displayHeight = Math.max(1, Math.round(rect.height * dpr));

  const tankSizeChanged = dom.tankCanvas.width !== displayWidth || dom.tankCanvas.height !== displayHeight;
  if (tankSizeChanged) {
    dom.tankCanvas.width = displayWidth;
    dom.tankCanvas.height = displayHeight;
  }
  if (dom.grimeCanvas.width !== displayWidth || dom.grimeCanvas.height !== displayHeight) {
    dom.grimeCanvas.width = displayWidth;
    dom.grimeCanvas.height = displayHeight;
  }
  if (dom.glassCanvas.width !== displayWidth || dom.glassCanvas.height !== displayHeight) {
    dom.glassCanvas.width = displayWidth;
    dom.glassCanvas.height = displayHeight;
  }
  const scrubMaskSizeChanged = runtime.scrubMaskCanvas.width !== TANK_WIDTH || runtime.scrubMaskCanvas.height !== TANK_HEIGHT;
  if (scrubMaskSizeChanged) {
    runtime.scrubMaskCanvas.width = TANK_WIDTH;
    runtime.scrubMaskCanvas.height = TANK_HEIGHT;
  }
  const grimeBaseSizeChanged = runtime.grimeBaseCanvas.width !== TANK_WIDTH || runtime.grimeBaseCanvas.height !== TANK_HEIGHT;
  if (grimeBaseSizeChanged) {
    runtime.grimeBaseCanvas.width = TANK_WIDTH;
    runtime.grimeBaseCanvas.height = TANK_HEIGHT;
  }

  const stageScale = Math.max(displayWidth / TANK_WIDTH, displayHeight / TANK_HEIGHT);
  const offsetX = Math.round((displayWidth - (TANK_WIDTH * stageScale)) / 2);
  const offsetY = Math.round((displayHeight - (TANK_HEIGHT * stageScale)) / 2);
  runtime.stageRenderScale = stageScale;
  runtime.stageRenderOffsetX = offsetX;
  runtime.stageRenderOffsetY = offsetY;
  runtime.playfield = {
    scale: 1,
    left: 0,
    top: 0,
    width: rect.width,
    height: rect.height,
    contentWidth: TANK_WIDTH,
    contentHeight: TANK_HEIGHT
  };
  updatePlayfieldCssVariables();
  const waterSurfaceChanged = syncViewportAnchoredWaterSurface();

  tankContext.setTransform(stageScale, 0, 0, stageScale, offsetX, offsetY);
  grimeContext.setTransform(stageScale, 0, 0, stageScale, offsetX, offsetY);
  glassContext.setTransform(stageScale, 0, 0, stageScale, offsetX, offsetY);
  scrubMaskContext?.setTransform(1, 0, 0, 1, 0, 0);
  grimeBaseContext?.setTransform(1, 0, 0, 1, 0, 0);
  configureCanvasContext(tankContext);
  configureCanvasContext(grimeContext);
  configureCanvasContext(glassContext);
  configureCanvasContext(scrubMaskContext);
  configureCanvasContext(grimeBaseContext);
  positionTransientMessages();

  if (tankSizeChanged || waterSurfaceChanged) {
    invalidateGravelBedCache(false);
  }
  syncPlacedDecorToResizeAnchors();
  if (scrubMaskSizeChanged) {
    rebuildScrubMaskCanvas();
  }
  if (grimeBaseSizeChanged) {
    runtime.grimeBaseCacheKey = "";
  }
}

async function fetchAssetList(type) {
  try {
    const manifest = await fetchAssetManifest();
    return Array.isArray(manifest[type]) ? manifest[type] : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function fetchAssetManifest() {
  if (!assetManifestPromise) {
    assetManifestPromise = (async () => {
      const response = await fetch(resolveAppUrl(STATIC_ASSET_MANIFEST), { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Could not load the asset manifest");
      }

      const payload = await response.json();
      return payload && typeof payload === "object" ? payload : {};
    })().catch((error) => {
      console.error(error);
      return {};
    });
  }

  return assetManifestPromise;
}

async function fetchFishCatalog() {
  try {
    const response = await fetch(resolveAppUrl(FISH_CATALOG_PATH), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load fish catalog");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return { fish: FISH_TYPES };
  }
}

async function fetchZombieSkeletonFishCatalog() {
  try {
    // The catalog also maps normal species to their Halloween artwork.  It is
    // safe to load this metadata while undead gameplay is disabled; the
    // gameplay-only species are still excluded when the runtime catalog is
    // normalized.
    const response = await fetch(resolveAppUrl(ZOMBIE_SKELETON_FISH_CATALOG_PATH), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load zombie/skeleton fish catalog");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return { fish: [], variants: [] };
  }
}

async function fetchDecorCatalog() {
  try {
    const response = await fetch(resolveAppUrl(DECOR_CATALOG_PATH), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load decor catalog");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return {
      decor: Object.entries(DECOR_META).map(([file, meta]) => ({
        file,
        ...meta
      }))
    };
  }
}

async function fetchFilterCatalogMeta() {
  try {
    const response = await fetch(resolveAppUrl(FILTER_CATALOG_PATH), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load filter catalog");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return {
      filters: Object.entries(FILTER_META).map(([key, meta]) => ({
        key,
        ...meta
      }))
    };
  }
}

async function fetchBackgroundCatalogMeta() {
  try {
    const response = await fetch(resolveAppUrl(BACKGROUND_CATALOG_PATH), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load background catalog");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return { backgrounds: [] };
  }
}

async function fetchFoodAndMedCatalog() {
  try {
    const response = await fetch(resolveAppUrl(FOOD_AND_MEDS_CATALOG_PATH), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load food and medicine catalog");
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return {
      fallbackImage: FOOD_AND_MEDS_FALLBACK_IMAGE_NAME,
      food: {},
      medicine: {}
    };
  }
}

function normalizeFoodAndMedCatalog(payload) {
  const source = payload && typeof payload === "object" ? payload : {};
  const fallbackImage = typeof source.fallbackImage === "string" && source.fallbackImage.trim()
    ? source.fallbackImage.trim()
    : FOOD_AND_MEDS_FALLBACK_IMAGE_NAME;
  const normalizeFoodSection = (section) => {
    const rawSection = section && typeof section === "object" ? section : {};
    const entries = {};

    for (const [key, value] of Object.entries(rawSection)) {
      const entry = value && typeof value === "object" ? value : {};
      const id = typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : String(key || "").trim();
      if (!id) {
        continue;
      }
      entries[id] = {
        id,
        name: typeof entry.name === "string" && entry.name.trim()
          ? entry.name.trim()
          : titleFromFile(id),
        description: typeof entry.description === "string" && entry.description.trim()
          ? entry.description.trim()
          : "",
        cost: Number.isFinite(entry.cost) ? Math.max(0, Math.floor(entry.cost)) : 0,
        bottlePellets: Number.isFinite(entry.bottlePellets) ? Math.max(0, Math.floor(entry.bottlePellets)) : 0,
        image: typeof entry.image === "string" && entry.image.trim() ? entry.image.trim() : "",
        thumb: typeof entry.thumb === "string" && entry.thumb.trim() ? entry.thumb.trim() : "",
        dropStyle: typeof entry.dropStyle === "string" && entry.dropStyle.trim().toLowerCase() === "sprite"
          ? "sprite"
          : "pellet",
        pelletColor: normalizeHexColor(entry.pelletColor) || "",
        pelletAccentColor: normalizeHexColor(entry.pelletAccentColor) || "",
        pelletHighlightColor: normalizeHexColor(entry.pelletHighlightColor) || "",
        dispenserAllowed: entry.dispenserAllowed !== false,
        piecesPerDrop: Number.isFinite(Number(entry.piecesPerDrop)) ? Math.max(1, Math.floor(Number(entry.piecesPerDrop))) : 1,
        pelletScale: Number.isFinite(Number(entry.pelletScale)) ? clamp(Number(entry.pelletScale), 0.12, 1.5) : 1,
        dropImages: (Array.isArray(entry.dropImages) ? entry.dropImages : [entry.dropImage])
          .filter((value) => typeof value === "string" && value.trim())
          .map((value) => resolveFoodAndMedAssetPath(value))
      };
    }

    return entries;
  };
  const normalizeMedicineSection = (section) => {
    const rawSection = section && typeof section === "object" ? section : {};
    const entries = {};

    for (const [key, value] of Object.entries(rawSection)) {
      const entry = value && typeof value === "object" ? value : {};
      const id = typeof entry.id === "string" && entry.id.trim()
        ? entry.id.trim()
        : String(key || "").trim();
      if (!id) {
        continue;
      }
      entries[id] = {
        id,
        name: typeof entry.name === "string" && entry.name.trim()
          ? entry.name.trim()
          : titleFromFile(id),
        description: typeof entry.description === "string" && entry.description.trim()
          ? entry.description.trim()
          : "",
        color: typeof entry.color === "string" && entry.color.trim()
          ? entry.color.trim()
          : "#E0B24C",
        cost: Number.isFinite(entry.cost) ? Math.max(0, Math.floor(entry.cost)) : 0,
        bottleDrops: Number.isFinite(entry.bottleDrops) ? Math.max(0, Math.floor(entry.bottleDrops)) : 0,
        image: typeof entry.image === "string" && entry.image.trim() ? entry.image.trim() : "",
        thumb: typeof entry.thumb === "string" && entry.thumb.trim() ? entry.thumb.trim() : ""
      };
    }

    return entries;
  };

  return {
    fallbackImage: resolveFoodAndMedAssetPath(fallbackImage),
    items: {
      food: normalizeFoodSection(source.food),
      medicine: normalizeMedicineSection(source.medicine)
    }
  };
}

function normalizeBackgroundMeta(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.backgrounds)
      ? payload.backgrounds
      : [];

  const map = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const key = String(entry.key || entry.file || "").trim();
    if (!key) {
      continue;
    }

    map[key] = {
      name: typeof entry.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : titleFromFile(key),
      cost: Math.max(0, Math.floor(Number(entry.cost) || 0)),
      defaultUnlocked: entry.defaultUnlocked === true,
      sortOrder: Number.isFinite(entry.sortOrder) ? Number(entry.sortOrder) : 999
    };
  }

  return map;
}

function normalizeDecorMeta(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.decor)
      ? payload.decor
      : [];

  const map = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const key = normalizeDecorKey(entry.file || entry.key || "");
    if (!key) {
      continue;
    }

    map[key] = {
      name: typeof entry.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : titleFromFile(key),
      theme: normalizeCatalogTheme(entry.theme),
      cost: Number.isFinite(entry.cost) ? entry.cost : 8,
      width: Number.isFinite(entry.width) ? entry.width : 140,
      defaultScale: Number.isFinite(entry.defaultScale) ? entry.defaultScale : DEFAULT_DECOR_SCALE,
      waterTypes: normalizeStringList(entry.waterTypes || entry.waterType).map((value) => normalizeWaterType(value)).filter(Boolean),
      categories: deriveDecorCategories(entry, key),
      fishBehavior: normalizeDecorFishBehaviorMeta(entry, key),
      moodDelta: clamp(Number(entry.moodDelta) || 0, -0.2, 0.2),
      caveBehavior: normalizeCaveBehaviorMeta(entry.caveBehavior),
      caveSettings: entry?.caveSettings && typeof entry.caveSettings === "object"
        ? sanitizePlacedCaveSettings(entry.caveSettings)
        : null,
      bubbler: normalizeBubblerMeta(
        entry?.bubbler && typeof entry.bubbler === "object"
          ? entry.bubbler
          : (hasBubblerMetaFields(entry) ? entry : null),
        key
      )
    };
  }

  return map;
}

function normalizeFilterMeta(payload) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.filters)
      ? payload.filters
      : [];

  const map = {};

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const key = String(entry.key || entry.file || "").trim();
    if (!key) {
      continue;
    }

    map[key] = {
      name: typeof entry.name === "string" && entry.name.trim()
        ? entry.name.trim()
        : titleFromFile(key),
      blurb: typeof entry.blurb === "string" && entry.blurb.trim()
        ? entry.blurb.trim()
        : "",
      cleanDays: Math.max(1.2, Number(entry.cleanDays) || BASE_TANK_DIRTY_DAYS),
      comfortBoost: clamp(Number(entry.comfortBoost) || 0, 0, 0.25),
      cost: Math.max(0, Math.floor(Number(entry.cost) || 0)),
      purchasable: entry.purchasable === true,
      tier: Math.max(0, Math.floor(Number(entry.tier) || 0)),
      flow: clamp(Number(entry.flow) || 1, 0.8, 1.3)
    };
  }

  return map;
}

function hasBubblerMetaFields(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  return Number.isFinite(Number(entry.spoutQty))
    || Number.isFinite(Number(entry.spoutCount))
    || Array.isArray(entry.spouts)
    || hasBubblerSpoutMetaFields(entry);
}

function hasBubblerSpoutMetaFields(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }

  return [
    entry.horizontalLocation,
    entry.spoutHorizontalLocation,
    entry.horizontal,
    entry.x,
    entry.xNorm,
    entry.offsetPx,
    entry.horizontalOffsetPx,
    entry.spoutOffsetPx,
    entry.amount,
    entry.intensity,
    entry.bubblerIntensity,
    entry.spread,
    entry.bubblerSpread,
    entry.distance,
    entry.fadeDistance,
    entry.bubblerFadeDistance,
    entry.direction,
    entry.bubbleColor,
    entry.bubbleColors,
    entry.color,
    entry.colors,
    entry.bubbleSize,
    entry.size,
    entry.radiusScale,
    entry.bubbleOpacity,
    entry.opacity,
    entry.alpha,
    entry.speed,
    entry.bubbleSpeed,
    entry.bubblerSpeed
  ].some((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function isBubblerDecorFileKey(decorKey = "") {
  return /_bubbler\.[^.]+$/i.test(String(decorKey || "").trim());
}

function normalizeBubblerHorizontalPosition(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return { horizontalLocation: null, horizontalOffsetPx: null };
    }

    if (trimmed.endsWith("%")) {
      const percent = Number.parseFloat(trimmed.slice(0, -1));
      if (Number.isFinite(percent)) {
        return {
          horizontalLocation: clamp(percent / 100, 0, 1),
          horizontalOffsetPx: null
        };
      }
    }
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return { horizontalLocation: null, horizontalOffsetPx: null };
  }

  if (numeric >= 0 && numeric <= 1) {
    return {
      horizontalLocation: clamp(numeric, 0, 1),
      horizontalOffsetPx: null
    };
  }

  return {
    horizontalLocation: null,
    horizontalOffsetPx: Math.max(0, numeric)
  };
}

function getBubblerCadenceFromIntensity(intensity = DEFAULT_BUBBLER_INTENSITY) {
  const resolvedIntensity = clamp(Number(intensity) || DEFAULT_BUBBLER_INTENSITY, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY);
  const intensityRatio = clamp(
    (resolvedIntensity - MIN_CUSTOM_BUBBLER_AMOUNT) / Math.max(0.0001, MAX_BUBBLER_INTENSITY - MIN_CUSTOM_BUBBLER_AMOUNT),
    0,
    1
  );
  const speedRatio = Math.pow(intensityRatio, 0.58);
  return clamp(
    MAX_BUBBLER_STREAM_CADENCE_MS
    + (MIN_BUBBLER_STREAM_CADENCE_MS - MAX_BUBBLER_STREAM_CADENCE_MS) * speedRatio,
    MIN_BUBBLER_STREAM_CADENCE_MS,
    MAX_BUBBLER_STREAM_CADENCE_MS
  );
}

function getBubblerTravelDurationFromSpeed(speed = DEFAULT_BUBBLER_SPEED) {
  const resolvedSpeed = clamp(Number(speed) || DEFAULT_BUBBLER_SPEED, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED);
  return clamp(
    DEFAULT_BUBBLER_TRAVEL_DURATION_MS / resolvedSpeed,
    MIN_BUBBLER_TRAVEL_DURATION_MS,
    MAX_BUBBLER_TRAVEL_DURATION_MS
  );
}

function buildDefaultBubblerSpoutMeta(index = 0, spoutQty = DEFAULT_BUBBLER_SPOUT_QTY) {
  const resolvedSpoutQty = Math.max(1, Math.floor(Number(spoutQty) || DEFAULT_BUBBLER_SPOUT_QTY));
  return {
    horizontalLocation: resolvedSpoutQty === 1
      ? 0.5
      : clamp((index + 1) / (resolvedSpoutQty + 1), 0.05, 0.95),
    horizontalOffsetPx: null,
    intensity: DEFAULT_BUBBLER_INTENSITY,
    spread: DEFAULT_BUBBLER_SPREAD_PX,
    fadeDistance: DEFAULT_BUBBLER_FADE_DISTANCE_PX,
    bubbleColor: DEFAULT_BUBBLER_BUBBLE_COLOR,
    bubbleColors: [DEFAULT_BUBBLER_BUBBLE_COLOR],
    bubbleColorize: false,
    bubbleSize: DEFAULT_CUSTOM_BUBBLER_BUBBLE_SIZE,
    bubbleOpacity: DEFAULT_BUBBLER_BUBBLE_OPACITY,
    bubbleFillTintEnabled: DEFAULT_BUBBLER_FILL_TINT_ENABLED,
    bubbleFillOpacity: DEFAULT_BUBBLER_FILL_OPACITY,
    bubblePopEnabled: DEFAULT_BUBBLER_POP_ENABLED,
    bubbleMalformed: DEFAULT_BUBBLER_MALFORMED_ENABLED,
    bubbleMalformedIntensity: DEFAULT_BUBBLER_MALFORMED_INTENSITY,
    bubbleMalformedSpeed: DEFAULT_BUBBLER_MALFORMED_SPEED,
    speed: DEFAULT_BUBBLER_SPEED,
    direction: DEFAULT_CUSTOM_BUBBLER_DIRECTION
  };
}

function normalizeBubblerSpoutMeta(entry, index = 0, spoutQty = DEFAULT_BUBBLER_SPOUT_QTY) {
  if (!entry || typeof entry !== "object") {
    return buildDefaultBubblerSpoutMeta(index, spoutQty);
  }

  const defaultSpout = buildDefaultBubblerSpoutMeta(index, spoutQty);
  const horizontalInput = entry.horizontalLocation
    ?? entry.spoutHorizontalLocation
    ?? entry.horizontal
    ?? entry.xNorm
    ?? entry.horizontalOffsetPx
    ?? entry.spoutOffsetPx
    ?? entry.offsetPx
    ?? entry.x;
  const horizontalPosition = normalizeBubblerHorizontalPosition(horizontalInput);
  const bubbleColors = normalizeDecorColorSettingList(
    entry.bubbleColors
    ?? entry.colors
    ?? entry.bubbleColor
    ?? entry.color
  );
  const resolvedBubbleColors = bubbleColors.length ? bubbleColors : defaultSpout.bubbleColors;
  const resolvedIntensity = clamp(
    Number.isFinite(Number(entry.amount))
      ? Number(entry.amount)
      : Number.isFinite(Number(entry.intensity))
        ? Number(entry.intensity)
        : Number.isFinite(Number(entry.bubblerIntensity))
          ? Number(entry.bubblerIntensity)
          : defaultSpout.intensity,
    MIN_CUSTOM_BUBBLER_AMOUNT,
    MAX_BUBBLER_INTENSITY
  );

  return {
    horizontalLocation: horizontalPosition.horizontalLocation ?? defaultSpout.horizontalLocation,
    horizontalOffsetPx: Number.isFinite(horizontalPosition.horizontalOffsetPx)
      ? horizontalPosition.horizontalOffsetPx
      : defaultSpout.horizontalOffsetPx,
    intensity: resolvedIntensity,
    spread: clamp(
      Number.isFinite(Number(entry.width))
        ? Number(entry.width)
        : Number.isFinite(Number(entry.spread))
          ? Number(entry.spread)
          : Number.isFinite(Number(entry.bubblerSpread))
            ? Number(entry.bubblerSpread)
            : defaultSpout.spread,
      0,
      320
    ),
    fadeDistance: clamp(
      Number.isFinite(Number(entry.distance))
        ? Number(entry.distance)
        : Number.isFinite(Number(entry.fadeDistance))
          ? Number(entry.fadeDistance)
          : Number.isFinite(Number(entry.bubblerFadeDistance))
            ? Number(entry.bubblerFadeDistance)
            : defaultSpout.fadeDistance,
      24,
      MAX_CUSTOM_BUBBLER_DISTANCE_PX
    ),
    bubbleColor: resolvedBubbleColors[0] || defaultSpout.bubbleColor,
    bubbleColors: resolvedBubbleColors,
    bubbleColorize: normalizeDecorColorizeSetting(
      entry.bubbleColorize
      ?? entry.colorize
      ?? entry.bubbleColorized
      ?? entry.colorized
      ?? defaultSpout.bubbleColorize
    ),
    bubbleSize: clamp(
      Number.isFinite(Number(entry.bubbleSize))
        ? Number(entry.bubbleSize)
        : Number.isFinite(Number(entry.size))
          ? Number(entry.size)
          : Number.isFinite(Number(entry.radiusScale))
            ? Number(entry.radiusScale)
            : defaultSpout.bubbleSize,
      MIN_CUSTOM_BUBBLER_BUBBLE_SIZE,
      MAX_CUSTOM_BUBBLER_BUBBLE_SIZE
    ),
    bubbleOpacity: clamp(
      Number.isFinite(Number(entry.bubbleOpacity))
        ? Number(entry.bubbleOpacity)
        : Number.isFinite(Number(entry.opacity))
          ? Number(entry.opacity)
          : Number.isFinite(Number(entry.alpha))
            ? Number(entry.alpha)
            : defaultSpout.bubbleOpacity,
      MIN_CUSTOM_BUBBLER_OPACITY,
      MAX_CUSTOM_BUBBLER_OPACITY
    ),
    bubbleFillTintEnabled: typeof entry.bubbleFillTintEnabled === "boolean"
      ? entry.bubbleFillTintEnabled
      : typeof entry.insideTintEnabled === "boolean"
        ? entry.insideTintEnabled
        : String(entry.bubbleFillTintEnabled ?? entry.insideTintEnabled ?? "").toLowerCase() === "false"
          ? false
          : String(entry.bubbleFillTintEnabled ?? entry.insideTintEnabled ?? "").toLowerCase() === "true"
            ? true
            : defaultSpout.bubbleFillTintEnabled,
    bubbleFillOpacity: clamp(
      Number.isFinite(Number(entry.bubbleFillOpacity))
        ? Number(entry.bubbleFillOpacity)
        : Number.isFinite(Number(entry.insideTintOpacity))
          ? Number(entry.insideTintOpacity)
          : Number.isFinite(Number(entry.fillOpacity))
            ? Number(entry.fillOpacity)
            : defaultSpout.bubbleFillOpacity,
      0,
      1
    ),
    bubblePopEnabled: normalizeWallpaperEngineBooleanPropertyValue(
      entry.bubblePopEnabled
      ?? entry.popBubbles
      ?? entry.pop
    ) ?? defaultSpout.bubblePopEnabled,
    bubbleMalformed: normalizeWallpaperEngineBooleanPropertyValue(
      entry.bubbleMalformed
      ?? entry.malformedBubbles
      ?? entry.malform
    ) ?? defaultSpout.bubbleMalformed,
    bubbleMalformedIntensity: clamp(
      Number.isFinite(Number(entry.bubbleMalformedIntensity))
        ? Number(entry.bubbleMalformedIntensity)
        : Number.isFinite(Number(entry.malformIntensity))
          ? Number(entry.malformIntensity)
          : defaultSpout.bubbleMalformedIntensity,
      MIN_BUBBLER_MALFORMED_INTENSITY,
      MAX_BUBBLER_MALFORMED_INTENSITY
    ),
    bubbleMalformedSpeed: clamp(
      Number.isFinite(Number(entry.bubbleMalformedSpeed))
        ? Number(entry.bubbleMalformedSpeed)
        : Number.isFinite(Number(entry.malformSpeed))
          ? Number(entry.malformSpeed)
          : defaultSpout.bubbleMalformedSpeed,
      MIN_BUBBLER_MALFORMED_SPEED,
      MAX_BUBBLER_MALFORMED_SPEED
    ),
    speed: clamp(
      Number.isFinite(Number(entry.speed))
        ? Number(entry.speed)
        : Number.isFinite(Number(entry.bubbleSpeed))
          ? Number(entry.bubbleSpeed)
          : Number.isFinite(Number(entry.bubblerSpeed))
            ? Number(entry.bubblerSpeed)
            : defaultSpout.speed,
      MIN_BUBBLER_SPEED,
      MAX_BUBBLER_SPEED
    ),
    direction: normalizeBubblerDirection(entry.direction ?? defaultSpout.direction)
  };
}

function normalizeBubblerMeta(entry, decorKey = "") {
  const isSuffixBubbler = isBubblerDecorFileKey(decorKey);
  const candidate = entry && typeof entry === "object" ? entry : null;
  if (!candidate && !isSuffixBubbler) {
    return null;
  }

  const declaredSpoutQty = Number.isFinite(Number(candidate?.spoutQty))
    ? Math.max(0, Math.floor(Number(candidate.spoutQty)))
    : Number.isFinite(Number(candidate?.spoutCount))
      ? Math.max(0, Math.floor(Number(candidate.spoutCount)))
      : 0;
  const sourceSpouts = Array.isArray(candidate?.spouts)
    ? candidate.spouts
    : hasBubblerSpoutMetaFields(candidate)
      ? [candidate]
      : [];
  const spoutQty = Math.max(
    declaredSpoutQty,
    sourceSpouts.length,
    isSuffixBubbler ? DEFAULT_BUBBLER_SPOUT_QTY : 0
  );
  if (!spoutQty) {
    return null;
  }

  const spouts = Array.from({ length: spoutQty }, (_, index) =>
    normalizeBubblerSpoutMeta(sourceSpouts[index], index, spoutQty)
  );

  return {
    spoutQty,
    spouts
  };
}

function normalizeCavePortalMeta(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const approachX = Number(entry.approachX);
  const approachY = Number(entry.approachY);
  const mouthX = Number(entry.mouthX);
  const mouthY = Number(entry.mouthY);
  if (![approachX, approachY, mouthX, mouthY].every(Number.isFinite)) {
    return null;
  }

  const path = Array.isArray(entry.path)
    ? entry.path
      .map((node) => {
        if (!node || typeof node !== "object") {
          return null;
        }

        const x = Number.isFinite(Number(node.x)) ? Number(node.x) : Number(node.xNorm);
        const y = Number.isFinite(Number(node.y)) ? Number(node.y) : Number(node.yNorm);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          return null;
        }

        return {
          x: clamp(x, 0.02, 0.98),
          y: clamp(y, 0.02, 0.98)
        };
      })
      .filter(Boolean)
    : [];
  const requestedOutsideLayer = clampTankLayer(Number.isFinite(Number(entry.outsideLayer)) ? Number(entry.outsideLayer) : 2);

  return {
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : createId("portal"),
    approachX: clamp(approachX, 0.02, 0.98),
    approachY: clamp(approachY, 0.02, 0.98),
    mouthX: clamp(mouthX, 0.02, 0.98),
    mouthY: clamp(mouthY, 0.02, 0.98),
    outsideLayer: CAVE_ALLOWED_OUTSIDE_LAYERS.includes(requestedOutsideLayer) ? requestedOutsideLayer : 2,
    insideLayer: clampTankLayer(CAVE_SEAT_LOCKED_LAYER),
    path
  };
}

function normalizeCaveInsideSlotMeta(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const x = Number.isFinite(Number(entry.x)) ? Number(entry.x) : Number(entry.xNorm);
  const y = Number.isFinite(Number(entry.y)) ? Number(entry.y) : Number(entry.yNorm);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  const portalIds = Array.isArray(entry.portalIds)
    ? entry.portalIds.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const normalized = {
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : createId("slot"),
    x: clamp(x, 0.04, 0.96),
    y: clamp(y, 0.04, 0.96),
    layer: clampTankLayer(CAVE_SEAT_LOCKED_LAYER),
    portalIds
  };

  if (entry.facing !== undefined || entry.direction !== undefined || entry.seatFacing !== undefined) {
    normalized.facing = normalizeCaveSeatFacing(entry.facing ?? entry.direction ?? entry.seatFacing);
  }

  return normalized;
}

function normalizeCaveBehaviorMeta(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const portals = Array.isArray(entry.portals)
    ? entry.portals.map((portal) => normalizeCavePortalMeta(portal)).filter(Boolean)
    : [];

  const interiorZones = Array.isArray(entry.interiorZones)
    ? entry.interiorZones
      .map((zone) => {
        if (!zone || typeof zone !== "object") {
          return null;
        }

        const xMin = Number(zone.xMin);
        const xMax = Number(zone.xMax);
        const yMin = Number(zone.yMin);
        const yMax = Number(zone.yMax);
        if (![xMin, xMax, yMin, yMax].every(Number.isFinite)) {
          return null;
        }

        return {
          id: typeof zone.id === "string" && zone.id.trim() ? zone.id.trim() : createId("zone"),
          xMin: clamp(Math.min(xMin, xMax), 0, 1),
          xMax: clamp(Math.max(xMin, xMax), 0, 1),
          yMin: clamp(Math.min(yMin, yMax), 0, 1),
          yMax: clamp(Math.max(yMin, yMax), 0, 1)
        };
      })
      .filter(Boolean)
    : [];

  const insideSlots = Array.isArray(entry.insideSlots)
    ? entry.insideSlots.map((slot) => normalizeCaveInsideSlotMeta(slot)).filter(Boolean)
    : [];

  return {
    portals,
    insideSlots,
    interiorZones,
    lingerMinMs: Number.isFinite(entry.lingerMinMs) ? entry.lingerMinMs : undefined,
    lingerMaxMs: Number.isFinite(entry.lingerMaxMs) ? entry.lingerMaxMs : undefined
  };
}

function buildBackgroundCatalog(items, metaMap = {}) {
  const itemMap = new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.key)
      .map((item) => [String(item.key), item])
  );

  return [...new Set([NONE_BACKGROUND_ASSET_KEY, CUSTOM_IMAGE_BACKGROUND_ASSET_KEY, ...itemMap.keys(), ...Object.keys(metaMap)])]
    .map((key) => {
      const item = itemMap.get(key);
      const fallbackMeta = key === NONE_BACKGROUND_ASSET_KEY
        ? { name: "Custom Background", cost: 0, defaultUnlocked: true, sortOrder: 0 }
        : key === CUSTOM_IMAGE_BACKGROUND_ASSET_KEY
          ? { name: "Local Image", cost: 0, defaultUnlocked: true, sortOrder: 1 }
          : {};
      const meta = { ...fallbackMeta, ...(metaMap[key] || {}) };
      return {
        key,
        path: item?.path || resolveAppUrl(`assets/backgrounds/${encodeURIComponent(key)}`),
        name: meta.name || titleFromFile(key),
        cost: Math.max(0, Math.floor(Number(meta.cost) || 0)),
        defaultUnlocked: meta.defaultUnlocked === true,
        sortOrder: Number.isFinite(meta.sortOrder) ? Number(meta.sortOrder) : 999
      };
    })
    .sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }
      return left.name.localeCompare(right.name);
    });
}

function buildSimpleAssetCatalog(items, meta, fallbackBlurb) {
  return items.map((item) => {
    const details = meta[item.key] || {};
    return {
      ...details,
      key: item.key,
      path: item.path,
      name: details.name || titleFromFile(item.key),
      blurb: details.blurb || fallbackBlurb
    };
  });
}

function buildCustomGravelAssetCatalog(specs = [], items = []) {
  const itemMap = new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.key)
      .map((item) => [String(item.key).toLowerCase(), item])
  );

  return specs.map((asset, index) => {
    const manifestItem = (asset.manifestKeys || [asset.fileName])
      .map((fileName) => itemMap.get(fileName.toLowerCase()))
      .find(Boolean);
    const path = manifestItem?.path || resolveAppUrl(`assets/gravel/${encodeURIComponent(asset.fileName)}`);

    return {
      ...asset,
      assetIndex: index,
      key: manifestItem?.key || asset.fileName,
      path
    };
  });
}

function buildCustomGravelLayerCatalog(items = []) {
  return buildCustomGravelAssetCatalog(CUSTOM_GRAVEL_LAYER_SPECS, items).map((layer, index) => ({
    ...layer,
    layerIndex: index
  }));
}

function buildCustomGravelPebbleCatalog(items = []) {
  return buildCustomGravelAssetCatalog(CUSTOM_GRAVEL_TOP_PEBBLE_SPECS, items).map((pebble, index) => ({
    ...pebble,
    pebbleIndex: index
  }));
}

function buildFilterCatalog(items, metaMap = {}) {
  const itemMap = new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item?.key)
      .map((item) => [String(item.key), item])
  );

  return [...new Set([...itemMap.keys(), ...Object.keys(metaMap)])]
    .map((key) => {
      const details = metaMap[key] || {};
      return {
        key,
        path: itemMap.get(key)?.path || resolveAppUrl(`assets/filter/${encodeURIComponent(key)}`),
        name: details.name || titleFromFile(key),
        blurb: details.blurb || (key === BASIC_FILTER_KEY ? "Starter filtration for a new aquarium." : "A filter upgrade."),
        cleanDays: Math.max(1.2, Number(details.cleanDays) || BASE_TANK_DIRTY_DAYS),
        comfortBoost: clamp(Number(details.comfortBoost) || 0, 0, 0.25),
        cost: Math.max(0, Math.floor(Number(details.cost) || 0)),
        purchasable: details.purchasable === true,
        tier: Math.max(0, Math.floor(Number(details.tier) || 0)),
        flow: clamp(Number(details.flow) || 1, 0.8, 1.3)
      };
    })
    .sort((left, right) => {
      if (left.tier !== right.tier) {
        return left.tier - right.tier;
      }
      return left.name.localeCompare(right.name);
    });
}

function buildFishSizeRange(entries = runtime.fishCatalog) {
  const sizes = (Array.isArray(entries) ? entries : [])
    .map((entry) => clamp(Number(entry?.width) || 128, FISH_CATALOG_WIDTH_MIN, FISH_CATALOG_WIDTH_MAX))
    .filter(Number.isFinite);
  if (!sizes.length) {
    return { min: FISH_CATALOG_WIDTH_MIN, max: FISH_CATALOG_WIDTH_MAX };
  }

  return {
    min: Math.min(...sizes),
    max: Math.max(...sizes)
  };
}

function buildFishCostRange(entries = runtime.fishCatalog) {
  const costs = (Array.isArray(entries) ? entries : [])
    .map((entry) => Math.max(1, Math.floor(Number(entry?.cost) || 1)))
    .filter(Number.isFinite);
  if (!costs.length) {
    return { min: 1, max: 1 };
  }

  return {
    min: Math.min(...costs),
    max: Math.max(...costs)
  };
}

function resolveSpeciesMealCoins(species) {
  if (!species) {
    return 0;
  }

  const profileMealCoins = getSpeciesComfortProfile(species).mealCoins;
  if (Number.isFinite(Number(profileMealCoins))) {
    return clamp(Math.max(0, Math.round(Number(profileMealCoins))), 0, 2);
  }

  if (isMealFreeFish(species)) {
    return 0;
  }

  const explicitOverride = Number(species.mealCoinOverride ?? species.coinsPerMealOverride);
  if (Number.isFinite(explicitOverride)) {
    return clamp(Math.max(0, Math.round(explicitOverride)), 0, 2);
  }

  const cost = Math.max(1, Math.floor(Number(species.cost) || 1));
  return clamp(Math.ceil(cost / FISH_MEAL_COIN_COST_DIVISOR), 1, 2);
}

function getDecorCompanionType(decorKey = "") {
  const key = String(decorKey || "").toLowerCase();

  if (/_color1\.[^.]+$/.test(key)) {
    return "color1";
  }

  if (/_color2\.[^.]+$/.test(key)) {
    return "color2";
  }

  if (/_color3\.[^.]+$/.test(key)) {
    return "color3";
  }

  if (/_(?:triggers|trigger)\.[^.]+$/.test(key)) {
    return "trigger";
  }

  if (/_(?:seats|seat)\.[^.]+$/.test(key)) {
    return "seats";
  }

  if (/_bg\.[^.]+$/.test(key)) {
    return "bg";
  }

  if (/_mask\.[^.]+$/.test(key)) {
    return "mask";
  }

  if (/_mid\.[^.]+$/.test(key)) {
    return "mid";
  }

  return "base";
}

function getDecorBaseKey(decorKey = "") {
  const key = String(decorKey || "").toLowerCase();
  return key
    .replace(/_color[123](?=\.[^.]+$)/, "")
    .replace(/_(?:triggers|trigger)(?=\.[^.]+$)/, "")
    .replace(/_(?:seats|seat)(?=\.[^.]+$)/, "")
    .replace(/_bg(?=\.[^.]+$)/, "")
    .replace(/_mask(?=\.[^.]+$)/, "")
    .replace(/_mid(?=\.[^.]+$)/, "")
    .replace(/_cave(?=\.[^.]+$)/, "");
}

function buildDecorCaveColorLayers(group) {
  if (!group?.base) {
    return [];
  }

  const buildCompanionCandidates = (companion = null) => {
    const candidates = [];
    if (companion?.path) {
      candidates.push({
        path: companion.path,
        sourceKey: companion.key
      });
    }

    const uniqueCandidates = [];
    const seenPaths = new Set();
    for (const candidate of candidates) {
      if (!candidate.path || seenPaths.has(candidate.path)) {
        continue;
      }
      seenPaths.add(candidate.path);
      uniqueCandidates.push(candidate);
    }

    return uniqueCandidates;
  };

  const buildOverlayLayer = (id, label, candidates = [], legacyCandidates = []) => {
    const primary = candidates[0] || legacyCandidates[0] || null;
    return {
      id,
      label,
      path: primary?.path || "",
      paths: candidates.map((candidate) => candidate.path),
      legacyPaths: legacyCandidates.map((candidate) => candidate.path),
      sourceKey: primary?.sourceKey || ""
    };
  };

  const color1Candidates = buildCompanionCandidates(group.color1);
  const color2Candidates = buildCompanionCandidates(group.color2);
  const color3Candidates = buildCompanionCandidates(group.color3);

  return [
    {
      id: "color1",
      label: "Color 1",
      path: group.base.path,
      paths: [group.base.path],
      sourceKey: group.base.key,
      isBaseLayer: true
    },
    buildOverlayLayer("color2", "Color 2", color2Candidates, color1Candidates),
    buildOverlayLayer("color3", "Color 3", color3Candidates, color2Candidates)
  ];
}

function buildDecorCatalog(items, catalogMeta = {}) {
  const grouped = new Map();

  for (const item of items) {
    const type = getDecorCompanionType(item.key);
    const baseKey = getDecorBaseKey(item.key);

    if (!grouped.has(baseKey)) {
      grouped.set(baseKey, {
        base: null,
        bg: null,
        mask: null,
        mid: null,
        color1: null,
        color2: null,
        color3: null,
        trigger: null,
        seats: null
      });
    }

    const entry = grouped.get(baseKey);
    entry[type] = item;
  }

  for (const [key] of Object.entries(catalogMeta)) {
    if (getDecorCompanionType(key) !== "base") {
      continue;
    }

    const baseKey = getDecorBaseKey(key);
    if (!grouped.has(baseKey)) {
      grouped.set(baseKey, {
        base: {
          key,
          path: resolveAppUrl(`assets/decor/${encodeURIComponent(key)}`)
        },
        bg: null,
        mask: null,
        mid: null,
        color1: null,
        color2: null,
        color3: null,
        trigger: null,
        seats: null
      });
    }
  }

  return [...grouped.entries()]
    .map(([baseKey, group]) => {
      if (!group.base) {
        return null;
      }

      const meta = runtime.decorMeta[group.base.key] || runtime.decorMeta[baseKey] || {};
      const caveColorLayers = buildDecorCaveColorLayers(group);

      return {
        key: group.base.key,
        path: group.base.path,
        bgPath: group.bg?.path || null,
        maskPath: group.mask?.path || null,
        midPath: group.mid?.path || null,
        triggerPath: group.trigger?.path || null,
        seatsPath: group.seats?.path || null,
        hasBg: Boolean(group.bg),
        hasMask: Boolean(group.mask),
        hasMid: Boolean(group.mid),
        hasTrigger: Boolean(group.trigger),
        hasSeats: Boolean(group.seats),
        caveColorLayers,
        hasCaveColorLayers: caveColorLayers.length > 0,
        name: meta.name || titleFromFile(group.base.key),
        theme: normalizeCatalogTheme(meta.theme),
        cost: Number.isFinite(meta.cost) ? meta.cost : 8,
        width: Number.isFinite(meta.width) ? meta.width : 140,
        defaultScale: Number.isFinite(meta.defaultScale) ? meta.defaultScale : DEFAULT_DECOR_SCALE,
        caveBehavior: meta.caveBehavior || null,
        caveSettings: meta.caveSettings || null,
        bubbler: meta.bubbler || normalizeBubblerMeta(null, group.base.key)
      };
    })
    .filter(Boolean);
}

function isCustomDecorShopKey(decorKey = "") {
  return String(decorKey || "") === CUSTOM_DECOR_SHOP_KEY;
}

function isCustomHideShopKey(decorKey = "") {
  return String(decorKey || "") === CUSTOM_HIDE_SHOP_KEY;
}

function isCustomDecorUploadShopKey(decorKey = "") {
  return isCustomDecorShopKey(decorKey) || isCustomHideShopKey(decorKey);
}

function isCustomHideAssetKey(decorKey = "") {
  const key = String(decorKey || "");
  return key.startsWith(CUSTOM_HIDE_KEY_PREFIX) && key !== CUSTOM_HIDE_SHOP_KEY;
}

function isCustomDecorAssetKey(decorKey = "") {
  const key = String(decorKey || "");
  return (key.startsWith(CUSTOM_DECOR_KEY_PREFIX) && key !== CUSTOM_DECOR_SHOP_KEY) || isCustomHideAssetKey(key);
}

function isCustomBubblerDecorKey(decorKey = "") {
  return String(decorKey || "") === CUSTOM_BUBBLER_DECOR_KEY;
}

function getDecorThumbnailPath(decor) {
  return decor?.thumbnailPath || decor?.path || "";
}

function buildVirtualDecorCatalogEntries() {
  return [
    {
      key: CUSTOM_BUBBLER_DECOR_KEY,
      path: CUSTOM_BUBBLER_DECOR_IMAGE,
      thumbnailPath: CUSTOM_BUBBLER_THUMBNAIL_IMAGE,
      bgPath: null,
      maskPath: null,
      midPath: null,
      triggerPath: null,
      seatsPath: null,
      hasBg: false,
      hasMask: false,
      hasMid: false,
      hasTrigger: false,
      hasSeats: false,
      name: "Bubbler",
      theme: "Custom",
      cost: CUSTOM_BUBBLER_COST,
      width: 47,
      defaultScale: 1,
      categories: ["bubbler"],
      fishBehavior: {
        explicitHangout: true,
        hangoutTypes: [],
        occupancyLimit: null,
        note: ""
      },
      caveBehavior: null,
      bubbler: normalizeBubblerMeta(createDefaultBubblerSettings(), CUSTOM_BUBBLER_DECOR_KEY)
    },
    {
      key: CUSTOM_DECOR_SHOP_KEY,
      path: CUSTOM_DECOR_SHOP_IMAGE,
      bgPath: null,
      maskPath: null,
      midPath: null,
      triggerPath: null,
      seatsPath: null,
      hasBg: false,
      hasMask: false,
      hasMid: false,
      hasTrigger: false,
      hasSeats: false,
      name: "Custom Decor",
      theme: "Custom",
      cost: CUSTOM_DECOR_COST,
      width: CUSTOM_DECOR_DEFAULT_WIDTH,
      defaultScale: 1,
      categories: ["custom"],
      fishBehavior: {
        explicitHangout: true,
        hangoutTypes: [],
        occupancyLimit: null,
        note: ""
      },
      caveBehavior: null,
      bubbler: null,
      customUploadProduct: true
    },
    {
      key: CUSTOM_HIDE_SHOP_KEY,
      path: CUSTOM_HIDE_SHOP_IMAGE,
      bgPath: null,
      maskPath: null,
      midPath: null,
      triggerPath: null,
      seatsPath: null,
      hasBg: false,
      hasMask: false,
      hasMid: false,
      hasTrigger: false,
      hasSeats: false,
      name: "Custom Hide",
      theme: "Custom",
      cost: CUSTOM_HIDE_COST,
      width: CUSTOM_DECOR_DEFAULT_WIDTH,
      defaultScale: 1,
      categories: ["custom", "caves"],
      fishBehavior: {
        explicitHangout: false,
        hangoutTypes: ["hide"],
        occupancyLimit: null,
        note: ""
      },
      caveBehavior: null,
      bubbler: null,
      customUploadProduct: true,
      customHideUploadProduct: true
    }
  ];
}

function sanitizeCustomDecorAssetEntry(entry, key) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const decorKey = isCustomDecorAssetKey(key)
    ? key
    : isCustomDecorAssetKey(entry.key)
      ? String(entry.key)
      : "";
  const customType = isCustomHideAssetKey(decorKey) || entry.customType === "hide" || entry.type === "hide"
    ? "hide"
    : "decor";
  const imageRefId = sanitizeCustomImageRefId(entry.imageRefId);
  const bgImageRefId = sanitizeCustomImageRefId(entry.bgImageRefId);
  const path = typeof entry.path === "string" && entry.path.startsWith("data:image/")
    ? entry.path
    : typeof entry.dataUrl === "string" && entry.dataUrl.startsWith("data:image/")
      ? entry.dataUrl
      : "";
  const bgPath = typeof entry.bgPath === "string" && entry.bgPath.startsWith("data:image/")
    ? entry.bgPath
    : typeof entry.backgroundPath === "string" && entry.backgroundPath.startsWith("data:image/")
      ? entry.backgroundPath
      : typeof entry.backgroundDataUrl === "string" && entry.backgroundDataUrl.startsWith("data:image/")
        ? entry.backgroundDataUrl
        : "";
  if (!decorKey || (!path && !imageRefId) || (customType === "hide" && !bgPath && !bgImageRefId)) {
    return null;
  }
  const caveColorLayers = customType === "hide"
    ? buildCustomDecorColorLayers({
      key: decorKey,
      customType: "hide",
      path,
      bgPath
    })
    : [];

  return {
    key: decorKey,
    name: typeof entry.name === "string" && entry.name.trim()
      ? entry.name.trim().slice(0, 48)
      : customType === "hide" ? "Custom Hide" : "Custom Decor",
    customType,
    path,
    imageRefId,
    bgPath: customType === "hide" ? bgPath : "",
    bgImageRefId: customType === "hide" ? bgImageRefId : "",
    width: clamp(Number(entry.width) || CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH),
    defaultScale: clamp(Number(entry.defaultScale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX),
    motionType: normalizeCustomDecorMotionType(entry.motionType),
    motionSplitY: sanitizeCustomDecorMotionSplit(entry.motionSplitY),
    motionSwaySide: normalizeDecorSwaySide(entry.motionSwaySide),
    motionIntensity: sanitizeCustomDecorMotionIntensity(entry.motionIntensity),
    caveSettings: customType === "hide" ? sanitizePlacedCaveSettings(entry.caveSettings) : null,
    caveColorSettings: customType === "hide"
      ? sanitizePlacedCaveColorSettings(entry.caveColorSettings, { caveColorLayers })
      : null,
    cost: customType === "hide" ? CUSTOM_HIDE_COST : CUSTOM_DECOR_COST,
    createdAt: Number.isFinite(Number(entry.createdAt)) ? Number(entry.createdAt) : Date.now()
  };
}

function sanitizeCustomDecorAssets(assets) {
  if (!assets || typeof assets !== "object") {
    return {};
  }

  const sanitized = {};
  for (const [key, entry] of Object.entries(assets)) {
    const asset = sanitizeCustomDecorAssetEntry(entry, key);
    if (asset) {
      sanitized[asset.key] = asset;
    }
  }
  return sanitized;
}

function buildCustomDecorColorLayers(asset) {
  const path = getStoredImageSource(
    asset,
    "runtimePath",
    "path",
    asset?.customType === "hide" || isCustomHideAssetKey(asset?.key) ? CUSTOM_HIDE_SHOP_IMAGE : CUSTOM_DECOR_SHOP_IMAGE
  );
  if (!path) {
    return [];
  }

  return [
    {
      id: "color1",
      label: "Color",
      path,
      paths: [path],
      legacyPaths: [],
      sourceKey: asset.key,
      isBaseLayer: true
    }
  ];
}

function buildCustomDecorCatalogEntry(asset) {
  const isHide = asset.customType === "hide" || isCustomHideAssetKey(asset.key);
  const caveSettings = isHide ? sanitizePlacedCaveSettings(asset.caveSettings) : null;
  const caveColorLayers = buildCustomDecorColorLayers(asset);
  const caveColorSettings = isHide ? sanitizePlacedCaveColorSettings(asset.caveColorSettings, { caveColorLayers }) : null;
  const path = getStoredImageSource(asset, "runtimePath", "path", isHide ? CUSTOM_HIDE_SHOP_IMAGE : CUSTOM_DECOR_SHOP_IMAGE);
  const bgPath = isHide ? getStoredImageSource(asset, "runtimeBgPath", "bgPath", path) : null;
  return {
    key: asset.key,
    path,
    bgPath,
    maskPath: null,
    midPath: null,
    triggerPath: null,
    seatsPath: null,
    hasBg: isHide,
    hasMask: false,
    hasMid: false,
    hasTrigger: false,
    hasSeats: false,
    caveColorLayers,
    hasCaveColorLayers: caveColorLayers.length > 0,
    name: asset.name || (isHide ? "Custom Hide" : "Custom Decor"),
    theme: "Custom",
    cost: isHide ? CUSTOM_HIDE_COST : CUSTOM_DECOR_COST,
    width: clamp(Number(asset.width) || CUSTOM_DECOR_DEFAULT_WIDTH, CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH),
    defaultScale: clamp(Number(asset.defaultScale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX),
    customType: isHide ? "hide" : "decor",
    motionType: isHide ? DEFAULT_CUSTOM_DECOR_MOTION_TYPE : normalizeCustomDecorMotionType(asset.motionType),
    motionSplitY: sanitizeCustomDecorMotionSplit(asset.motionSplitY),
    motionSwaySide: normalizeDecorSwaySide(asset.motionSwaySide),
    motionIntensity: sanitizeCustomDecorMotionIntensity(asset.motionIntensity),
    categories: isHide ? ["custom", "caves"] : ["custom"],
    fishBehavior: {
      explicitHangout: !isHide,
      hangoutTypes: isHide ? ["hide"] : [],
      occupancyLimit: null,
      note: ""
    },
    caveBehavior: isHide ? buildCaveBehaviorProfileFromSettings(caveSettings) : null,
    defaultCaveSettings: caveSettings,
    defaultCaveColorSettings: caveColorSettings,
    bubbler: null,
    customAsset: true
  };
}

function getCustomDecorCatalogEntries(targetState = state) {
  return Object.values(targetState?.customDecorAssets || {})
    .map((asset) => buildCustomDecorCatalogEntry(asset))
    .filter(Boolean);
}

function syncRuntimeCustomDecorAssetsFromState(targetState = state) {
  for (const key of [...runtime.decorMap.keys()]) {
    if (isCustomDecorAssetKey(key)) {
      runtime.decorMap.delete(key);
    }
  }

  for (const entry of getCustomDecorCatalogEntries(targetState)) {
    runtime.decorMap.set(entry.key, entry);
  }
}

function isCustomFishShopKey(speciesId = "") {
  return String(speciesId || "") === CUSTOM_FISH_SHOP_KEY;
}

function isCustomFishAssetKey(speciesId = "") {
  const key = String(speciesId || "");
  return key.startsWith(CUSTOM_FISH_KEY_PREFIX) && key !== CUSTOM_FISH_SHOP_KEY;
}

function buildVirtualFishCatalogEntries() {
  return [
    {
      id: CUSTOM_FISH_SHOP_KEY,
      name: "Custom Fish",
      theme: "Custom",
      waterType: "freshwater",
      cost: CUSTOM_FISH_COST,
      mealCoins: 0,
      mealCoinOverride: null,
      asset: CUSTOM_FISH_SHOP_IMAGE,
      assetVariants: [CUSTOM_FISH_SHOP_IMAGE],
      zombieAssetVariants: [],
      skeletonAssetVariants: [],
      fallbackAsset: CUSTOM_FISH_SHOP_IMAGE,
      assetFolder: "misc",
      description: "Upload an image, name a fish type, choose its size, and pick a behavior profile.",
      width: CUSTOM_FISH_DEFAULT_WIDTH,
      cycleSeconds: 26,
      bobSpeed: 1.2,
      swimStyle: "steady",
      speedMode: SWIM_STYLE_DEFAULTS.steady.speedMode,
      speedMin: SWIM_STYLE_DEFAULTS.steady.speedMin,
      speedMax: SWIM_STYLE_DEFAULTS.steady.speedMax,
      targetMinMs: SWIM_STYLE_DEFAULTS.steady.targetMinMs,
      targetMaxMs: SWIM_STYLE_DEFAULTS.steady.targetMaxMs,
      behavior: "custom",
      diet: "pellet",
      cleanupMinMs: 12 * 60 * 1000,
      cleanupMaxMs: 24 * 60 * 1000,
      cleanupStrength: 0.12,
      poopCleanupChance: 0,
      shadowScale: 0.28,
      defaultScale: DEFAULT_FISH_SCALE,
      unlockRequirement: null,
      undeadType: null,
      heartCount: null,
      needs: {
        decor: [],
        friends: {
          min: 0,
          alikeOnly: false
        }
      },
      dislikedTypes: [],
      caveEnabled: false,
      defaultNames: [],
      customUploadProduct: true
    }
  ];
}

function getCustomFishBehaviorProfiles() {
  const profiles = runtime.fishCatalog.filter((species) => (
    species
    && !species.customUploadProduct
    && !isCustomFishShopKey(species.id)
    && !isCustomFishAssetKey(species.id)
  ));
  const seen = new Set();
  return profiles.filter((species) => {
    const key = getCustomFishBehaviorKey(species);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getCustomFishBehaviorKey(profile) {
  if (typeof profile?.undeadType === "string" && profile.undeadType.trim()) {
    return profile.undeadType.trim().toLowerCase();
  }
  if (typeof profile?.behavior === "string" && profile.behavior.trim() && profile.behavior.trim().toLowerCase() !== "free") {
    return profile.behavior.trim().toLowerCase();
  }
  if (typeof profile?.swimStyle === "string" && profile.swimStyle.trim()) {
    return profile.swimStyle.trim().toLowerCase();
  }
  return "steady";
}

function formatCustomFishBehaviorLabel(profile) {
  const key = getCustomFishBehaviorKey(profile);
  return key
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDefaultCustomFishBehaviorProfile() {
  return getCustomFishBehaviorProfiles().find((species) => species.id === "goldfish")
    || getCustomFishBehaviorProfiles()[0]
    || null;
}

function getCustomFishBehaviorProfile(profileId) {
  const normalizedId = String(profileId || "").trim();
  if (!normalizedId) {
    return null;
  }

  return getCustomFishBehaviorProfiles().find((species) => species.id === normalizedId) || null;
}

function normalizeCustomFishBehaviorProfileId(value) {
  return getCustomFishBehaviorProfile(value)?.id
    || getDefaultCustomFishBehaviorProfile()?.id
    || "";
}

function sanitizeCustomFishName(value, fallback = "Custom Fish") {
  const trimmed = String(value || "").replace(/\s+/g, " ").trim();
  if (trimmed) {
    return trimmed.slice(0, 48);
  }
  return String(fallback || "Custom Fish").replace(/\s+/g, " ").trim().slice(0, 48) || "Custom Fish";
}

function formatCustomFishBehaviorOption(profile) {
  if (!profile) {
    return "Steady";
  }

  return `${formatCustomFishBehaviorLabel(profile)} (${profile.name})`;
}

function openCustomFishCreationOverlay(dataUrl, suggestedName = "Custom Fish", dimensions = {}) {
  const naturalWidth = Math.max(1, Math.round(Number(dimensions.width) || CUSTOM_FISH_DEFAULT_WIDTH));
  const naturalHeight = Math.max(1, Math.round(Number(dimensions.height) || CUSTOM_FISH_DEFAULT_WIDTH));
  openCustomAssetEditorOverlay("fish", {
    dataUrl,
    flipX: false,
    rotation: 0,
    suggestedName: sanitizeCustomFishName(suggestedName, "Custom Fish"),
    name: sanitizeCustomFishName(suggestedName, "Custom Fish"),
    width: clamp(CUSTOM_FISH_DEFAULT_WIDTH, CUSTOM_FISH_MIN_WIDTH, CUSTOM_FISH_MAX_WIDTH),
    naturalWidth,
    naturalHeight,
    behaviorProfileId: normalizeCustomFishBehaviorProfileId("")
  });
}

function getCustomAssetTypeDef(type) {
  const assetType = String(type || "").trim();
  return assetType && Object.prototype.hasOwnProperty.call(CUSTOM_ASSET_TYPES, assetType)
    ? CUSTOM_ASSET_TYPES[assetType]
    : null;
}

function getCustomAssetInput(type, step = "primary") {
  const typeDef = getCustomAssetTypeDef(type);
  const stepDef = typeDef?.pickerSteps?.[step];
  const inputKey = stepDef?.inputKey;
  return inputKey ? dom[inputKey] : null;
}

function resetCustomAssetInput(input) {
  if (input instanceof HTMLInputElement) {
    input.value = "";
  }
}

function ensureCustomAssetCost(type) {
  const typeDef = getCustomAssetTypeDef(type);
  if (!typeDef || Math.max(0, Number(typeDef.cost) || 0) <= 0) {
    return true;
  }
  if (state.coins >= typeDef.cost) {
    return true;
  }
  showToast(`You need ${typeDef.cost} ${pluralize("coin", typeDef.cost)} for ${typeDef.label}.`);
  return false;
}

function getPendingCustomAsset(type) {
  const typeDef = getCustomAssetTypeDef(type);
  return typeDef ? runtime[typeDef.pendingStateKey] : null;
}

function finalizeCustomAssetCreation(type, options = {}) {
  const typeDef = getCustomAssetTypeDef(type);
  if (!typeDef) {
    return false;
  }
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  runtime[typeDef.pendingStateKey] = null;
  closeUtilityOverlayState({ now, reason: "complete" });
  if (typeof options.eventText === "string" && options.eventText) {
    pushEvent(options.eventText, now);
  }
  saveState();
  playPurchaseSoundEffect();
  renderUi(now);
  if (typeof options.toastText === "string" && options.toastText) {
    showToast(options.toastText);
  }
  return true;
}

function openCustomAssetPicker(type, step = "primary") {
  const typeDef = getCustomAssetTypeDef(type);
  const stepDef = typeDef?.pickerSteps?.[step];
  if (!typeDef || !stepDef) {
    return false;
  }
  if (stepDef.checkCost !== false && !ensureCustomAssetCost(type)) {
    return false;
  }
  const input = getCustomAssetInput(type, step);
  if (!(input instanceof HTMLInputElement)) {
    showToast(stepDef.unavailableMessage || `${typeDef.label} picker unavailable.`);
    return false;
  }
  if (typeof stepDef.beforeOpen === "function") {
    stepDef.beforeOpen();
  }
  resetCustomAssetInput(input);
  input.click();
  return true;
}

async function importCustomAssetFromPicker(type, step = "primary", event) {
  const typeDef = getCustomAssetTypeDef(type);
  const stepDef = typeDef?.pickerSteps?.[step];
  const input = event?.currentTarget instanceof HTMLInputElement
    ? event.currentTarget
    : getCustomAssetInput(type, step);
  const file = input?.files?.[0];
  if (!typeDef || !stepDef || !file) {
    return;
  }

  try {
    if (stepDef.checkCost !== false && !ensureCustomAssetCost(type)) {
      return;
    }
    await stepDef.importStep({
      typeDef,
      stepDef,
      file,
      input,
      now: Date.now()
    });
  } catch (error) {
    console.error(error);
    if (typeof stepDef.onError === "function") {
      stepDef.onError(error);
    } else {
      showToast(error?.message || typeDef.failureToast);
    }
  } finally {
    resetCustomAssetInput(input);
  }
}

async function savePendingCustomAsset(type) {
  const typeDef = getCustomAssetTypeDef(type);
  if (!typeDef) {
    return false;
  }
  const pending = getPendingCustomAsset(type);
  const validation = typeof typeDef.validatePending === "function"
    ? typeDef.validatePending(pending)
    : { ok: true };
  if (!validation?.ok) {
    if (validation?.message) {
      showToast(validation.message);
    }
    if (validation?.focusSelector) {
      dom.utilityOverlayBody?.querySelector(validation.focusSelector)?.focus?.();
    }
    return false;
  }
  if (!ensureCustomAssetCost(type)) {
    return false;
  }
  return typeDef.save({
    pending,
    now: Date.now()
  });
}

function sanitizeCustomFishRotation(value) {
  return clamp(
    Math.round(Number(value) || 0),
    CUSTOM_FISH_ROTATION_MIN_DEGREES,
    CUSTOM_FISH_ROTATION_MAX_DEGREES
  );
}

function getPendingCustomFishTransform(pending) {
  const rotation = sanitizeCustomFishRotation(pending?.rotation);
  const scale = pending?.flipX ? -1 : 1;
  return `rotate(${rotation}deg) scaleX(${scale})`;
}

function updatePendingCustomFishTransformControls(pending) {
  const rotation = sanitizeCustomFishRotation(pending?.rotation);
  const rotationLabels = dom.utilityOverlayBody?.querySelectorAll("[data-custom-fish-rotation-label]") || [];
  const rotationSlider = dom.utilityOverlayBody?.querySelector("[data-custom-fish-rotation-input]");
  const flipToggle = dom.utilityOverlayBody?.querySelector("[data-custom-fish-flip-toggle]");

  for (const label of rotationLabels) {
    label.textContent = `${rotation} deg`;
  }
  if (rotationSlider instanceof HTMLInputElement && Number(rotationSlider.value) !== rotation) {
    rotationSlider.value = String(rotation);
  }
  if (flipToggle instanceof HTMLInputElement) {
    const flipped = Boolean(pending?.flipX);
    flipToggle.checked = flipped;
  }
}

async function getPendingCustomFishOutputDataUrl(pending) {
  const sourceDataUrl = pending?.dataUrl;
  if (!isDataImageUrl(sourceDataUrl)) {
    return "";
  }

  const rotation = sanitizeCustomFishRotation(pending.rotation);
  const flipX = Boolean(pending.flipX);
  if (!rotation && !flipX) {
    return sourceDataUrl;
  }

  const image = await loadImageElement(sourceDataUrl);
  const sourceWidth = Math.max(1, Math.round(image.naturalWidth || image.width || 1));
  const sourceHeight = Math.max(1, Math.round(image.naturalHeight || image.height || 1));
  const radians = rotation * Math.PI / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const outputWidth = Math.max(1, Math.ceil(sourceWidth * cos + sourceHeight * sin));
  const outputHeight = Math.max(1, Math.ceil(sourceWidth * sin + sourceHeight * cos));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return sourceDataUrl;
  }

  context.clearRect(0, 0, outputWidth, outputHeight);
  context.translate(outputWidth / 2, outputHeight / 2);
  context.rotate(radians);
  context.scale(flipX ? -1 : 1, 1);
  context.drawImage(image, -sourceWidth / 2, -sourceHeight / 2, sourceWidth, sourceHeight);
  return canvas.toDataURL("image/png");
}

function updatePendingCustomFishPreview() {
  const pending = runtime.pendingCustomFishUpload;
  if (!pending) {
    return;
  }

  const width = clamp(Number(pending.width) || CUSTOM_FISH_DEFAULT_WIDTH, CUSTOM_FISH_MIN_WIDTH, CUSTOM_FISH_MAX_WIDTH);
  const labels = dom.utilityOverlayBody?.querySelectorAll("[data-custom-fish-size-label]") || [];
  const preview = dom.utilityOverlayBody?.querySelector("[data-custom-fish-preview]");
  const slider = dom.utilityOverlayBody?.querySelector("[data-custom-fish-size-input]");
  for (const label of labels) {
    label.textContent = `${Math.round(width)} px`;
  }
  if (preview instanceof HTMLElement) {
    preview.style.width = `${Math.round(width)}px`;
    preview.style.transform = getPendingCustomFishTransform(pending);
  }
  if (slider instanceof HTMLInputElement && Number(slider.value) !== Math.round(width)) {
    slider.value = String(Math.round(width));
  }
  updatePendingCustomFishTransformControls(pending);
}

function updatePendingCustomFishSize(value) {
  if (!runtime.pendingCustomFishUpload) {
    return;
  }

  runtime.pendingCustomFishUpload.width = clamp(
    Math.round(Number(value) || CUSTOM_FISH_DEFAULT_WIDTH),
    CUSTOM_FISH_MIN_WIDTH,
    CUSTOM_FISH_MAX_WIDTH
  );
  updatePendingCustomFishPreview();
}

function updatePendingCustomFishFlip(value) {
  if (!runtime.pendingCustomFishUpload) {
    return;
  }

  runtime.pendingCustomFishUpload.flipX = Boolean(value);
  updatePendingCustomFishPreview();
}

function updatePendingCustomFishRotation(value) {
  if (!runtime.pendingCustomFishUpload) {
    return;
  }

  runtime.pendingCustomFishUpload.rotation = sanitizeCustomFishRotation(value);
  updatePendingCustomFishPreview();
}

function sanitizeCustomFishAssetEntry(entry, key) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const fishKey = isCustomFishAssetKey(key)
    ? key
    : isCustomFishAssetKey(entry.key)
      ? String(entry.key)
      : "";
  const imageRefId = sanitizeCustomImageRefId(entry.imageRefId);
  const path = typeof entry.path === "string" && entry.path.startsWith("data:image/")
    ? entry.path
    : typeof entry.dataUrl === "string" && entry.dataUrl.startsWith("data:image/")
      ? entry.dataUrl
      : "";
  if (!fishKey || (!path && !imageRefId)) {
    return null;
  }

  const behaviorProfileId = normalizeCustomFishBehaviorProfileId(
    entry.behaviorProfileId || entry.behaviorId || entry.profileId
  );

  return {
    key: fishKey,
    name: sanitizeCustomFishName(entry.name, "Custom Fish"),
    path,
    imageRefId,
    width: clamp(Math.round(Number(entry.width) || CUSTOM_FISH_DEFAULT_WIDTH), CUSTOM_FISH_MIN_WIDTH, CUSTOM_FISH_MAX_WIDTH),
    behaviorProfileId,
    createdAt: Number.isFinite(Number(entry.createdAt)) ? Number(entry.createdAt) : Date.now()
  };
}

function sanitizeCustomFishAssets(assets) {
  if (!assets || typeof assets !== "object") {
    return {};
  }

  const sanitized = {};
  for (const [key, entry] of Object.entries(assets)) {
    const asset = sanitizeCustomFishAssetEntry(entry, key);
    if (asset) {
      sanitized[asset.key] = asset;
    }
  }
  return sanitized;
}

function buildCustomFishCatalogEntry(asset) {
  const profile = getCustomFishBehaviorProfile(asset.behaviorProfileId) || getDefaultCustomFishBehaviorProfile();
  const imagePath = getStoredImageSource(asset, "runtimePath", "path", CUSTOM_FISH_SHOP_IMAGE);
  const swimStyle = typeof profile?.swimStyle === "string" && profile.swimStyle.trim()
    ? profile.swimStyle
    : "steady";
  const defaults = SWIM_STYLE_DEFAULTS[swimStyle] || SWIM_STYLE_DEFAULTS.steady;
  const speedMin = Number.isFinite(Number(profile?.speedMin)) ? Number(profile.speedMin) : defaults.speedMin;
  const speedMax = Number.isFinite(Number(profile?.speedMax)) ? Number(profile.speedMax) : defaults.speedMax;
  const cleanupMinMs = Math.max(60 * 1000, Math.floor(Number(profile?.cleanupMinMs) || 12 * 60 * 1000));
  const cleanupMaxMs = Math.max(cleanupMinMs + 60 * 1000, Math.floor(Number(profile?.cleanupMaxMs) || 24 * 60 * 1000));
  const species = {
    id: asset.key,
    name: asset.name || "Custom Fish",
    theme: "Custom",
    waterType: profile?.waterType || "freshwater",
    cost: CUSTOM_FISH_COST,
    mealCoins: 0,
    mealCoinOverride: null,
    asset: imagePath,
    assetVariants: [imagePath],
    zombieAssetVariants: [],
    skeletonAssetVariants: [],
    fallbackAsset: imagePath,
    assetFolder: "custom",
    description: profile
      ? `A custom fish using the ${profile.name} behavior profile.`
      : "A custom fish using a steady behavior profile.",
    width: clamp(Math.round(Number(asset.width) || CUSTOM_FISH_DEFAULT_WIDTH), CUSTOM_FISH_MIN_WIDTH, CUSTOM_FISH_MAX_WIDTH),
    cycleSeconds: clamp(Number(profile?.cycleSeconds) || 26, 12, 60),
    bobSpeed: clamp(Number(profile?.bobSpeed) || 1.2, 0.6, 2.2),
    swimStyle,
    speedMode: profile?.speedMode === "dynamic" ? "dynamic" : defaults.speedMode,
    speedMin: clamp(speedMin, 0.00005, 0.095),
    speedMax: clamp(speedMax, Math.max(0.00005, speedMin), 0.095),
    targetMinMs: Math.max(800, Math.floor(Number(profile?.targetMinMs) || defaults.targetMinMs)),
    targetMaxMs: Math.max(1400, Math.floor(Number(profile?.targetMaxMs) || defaults.targetMaxMs)),
    behavior: typeof profile?.behavior === "string" && profile.behavior.trim() ? profile.behavior : "free",
    diet: typeof profile?.diet === "string" && profile.diet.trim() ? profile.diet : "pellet",
    cleanupMinMs,
    cleanupMaxMs,
    cleanupStrength: clamp(Number(profile?.cleanupStrength) || 0.12, 0.005, 0.45),
    poopCleanupChance: Number.isFinite(Number(profile?.poopCleanupChance))
      ? clamp(Number(profile.poopCleanupChance), 0, 1)
      : (profile?.diet === "detritus" ? 1 : 0),
    shadowScale: clamp(Number(profile?.shadowScale) || 0.28, 0.14, 0.5),
    defaultScale: DEFAULT_FISH_SCALE,
    unlockRequirement: null,
    undeadType: typeof profile?.undeadType === "string" && profile.undeadType.trim() ? profile.undeadType : null,
    heartCount: null,
    needs: {
      decor: [],
      friends: {
        min: 0,
        alikeOnly: false
      }
    },
    dislikedTypes: [],
    caveEnabled: profile?.caveEnabled !== false,
    defaultNames: [asset.name || "Custom Fish"],
    customAsset: true,
    behaviorProfileId: profile?.id || ""
  };
  species.mealCoins = resolveSpeciesMealCoins(species);
  return species;
}

function getCustomFishCatalogEntries(targetState = state) {
  return Object.values(targetState?.customFishAssets || {})
    .map((asset) => buildCustomFishCatalogEntry(asset))
    .filter(Boolean);
}

function syncRuntimeCustomFishAssetsFromState(targetState = state) {
  for (const key of [...runtime.fishMap.keys()]) {
    if (isCustomFishAssetKey(key)) {
      runtime.fishMap.delete(key);
    }
  }

  for (const entry of getCustomFishCatalogEntries(targetState)) {
    runtime.fishMap.set(entry.id, entry);
  }
}

async function savePendingCustomFishUpload() {
  runtime.wallpaperUtilityKeyboardOpenId = "";
  syncWallpaperUtilityNameKeyboards();
  return savePendingCustomAsset("fish");
}

function normalizeFishCatalog(payload, options = {}) {
  const entries = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.fish)
      ? payload.fish
      : [];
  const allowZombieSkeletonFish = options.allowZombieSkeletonFish === true;

  return entries
    .filter((entry) => allowZombieSkeletonFish || !isZombieSkeletonCatalogSpecies(entry))
    .map((entry, index) => normalizeFishDefinition(entry, index, options))
    .filter(Boolean);
}

function collectFishCatalogAssetFiles(...values) {
  return values
    .flatMap((value) => normalizeStringList(value))
    .map((value) => String(value || "").trim())
    .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}

function normalizeCatalogAssetLookupKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[\s_-]+/g, "");
}

function findCatalogAssetManifestItem(folderAssets, assetFile) {
  if (typeof assetFile !== "string" || !assetFile.trim()) {
    return null;
  }

  const normalizedAssetFile = assetFile.trim();
  const normalizedAssetKey = normalizeCatalogAssetLookupKey(normalizedAssetFile);
  const entries = Array.isArray(folderAssets) ? folderAssets : [];

  return entries.find((item) => item?.key && String(item.key).toLowerCase() === normalizedAssetFile.toLowerCase())
    || entries.find((item) => (
      item?.key
      && normalizeCatalogAssetLookupKey(item.key) === normalizedAssetKey
    ))
    || null;
}

function resolveFishCatalogAssetFolderPath(assetFolder = "fish") {
  const normalizedAssetFolder = typeof assetFolder === "string" && assetFolder.trim()
    ? assetFolder.trim().replace(/^\/+|\/+$/g, "").replaceAll("\\", "/")
    : "fish";
  return normalizedAssetFolder.startsWith("assets/")
    ? normalizedAssetFolder
    : `assets/${normalizedAssetFolder}`;
}

function encodeCatalogAssetPath(assetFile = "") {
  return String(assetFile || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function resolveFishCatalogAsset(assetFile, assetFolder, folderAssets, fallbackAsset, options = {}) {
  const allowFallback = options.allowFallback !== false;
  const allowDirect = options.allowDirect !== false;
  if (typeof assetFile !== "string" || !assetFile.trim()) {
    return allowFallback ? (fallbackAsset || null) : null;
  }

  const normalizedAssetFile = assetFile.trim();
  const matchedFolderAsset = findCatalogAssetManifestItem(folderAssets, normalizedAssetFile);
  return /[\\/]/.test(normalizedAssetFile) || /^[a-z]+:/i.test(normalizedAssetFile)
    ? resolveAppUrl(normalizedAssetFile)
    : matchedFolderAsset?.path
    || (allowFallback ? fallbackAsset : null)
    || (allowDirect ? resolveAppUrl(`${resolveFishCatalogAssetFolderPath(assetFolder)}/${encodeCatalogAssetPath(normalizedAssetFile)}`) : null);
}

function resolveFishCatalogStageAssets(assetFiles, assetFolder, folderAssets, stage) {
  const normalizedStage = String(stage || "").trim().toLowerCase();
  if (!["zombie", "skeleton"].includes(normalizedStage)) {
    return [];
  }

  return collectFishCatalogAssetFiles(assetFiles)
    .map((assetFile) => deriveFishStageAssetFile(assetFile, normalizedStage))
    .map((assetFile) => resolveFishCatalogAsset(assetFile, assetFolder, folderAssets, null, {
      allowFallback: false,
      allowDirect: false
    }))
    .filter((value, index, list) => Boolean(value) && list.indexOf(value) === index);
}

function normalizeFishDefinition(entry, index, options = {}) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : `fish-${index + 1}`;
  const swimStyleSource = typeof entry.swimStyle === "string" ? entry.swimStyle : entry.style;
  const swimStyle = typeof swimStyleSource === "string" ? swimStyleSource.trim().toLowerCase() : "steady";
  const defaults = SWIM_STYLE_DEFAULTS[swimStyle] || SWIM_STYLE_DEFAULTS.steady;
  const rawAssetVariantFiles = collectFishCatalogAssetFiles(entry.assetVariants, entry.assets);
  const rawAssetFile = [entry.asset, entry.image, entry.file, ...rawAssetVariantFiles].find((value) => typeof value === "string" && value.trim());
  const assetFile = rawAssetFile ? rawAssetFile.trim() : `${id}.png`;
  const assetFolder = typeof entry.assetFolder === "string" && entry.assetFolder.trim()
    ? entry.assetFolder.trim().replace(/^\/+|\/+$/g, "")
    : "fish";
  const behavior = typeof entry.behavior === "string" && entry.behavior.trim() ? entry.behavior.trim().toLowerCase() : "free";
  const diet = typeof entry.diet === "string" && entry.diet.trim() ? entry.diet.trim().toLowerCase() : "pellet";
  const explicitHeartCount = Number(entry.heartCount ?? entry.hearts);
  const explicitMealCoinOverride = Number(entry.mealCoinOverride ?? entry.coinsPerMealOverride ?? entry.mealCoins ?? entry.mealcoins);
  const folderAssets = Array.isArray(options.assetFolders?.[assetFolder]) ? options.assetFolders[assetFolder] : [];
  const explicitCleanupStrength = Number(entry.cleanupStrength);
  const explicitPoopCleanupChance = Number(entry.poopCleanupChance);
  const fallbackAssetSource = typeof entry.fallbackAsset === "string" && entry.fallbackAsset.trim()
    ? entry.fallbackAsset.trim()
    : null;
  const fallbackAsset = fallbackAssetSource
    ? (/[\\/]/.test(fallbackAssetSource) || /^[a-z]+:/i.test(fallbackAssetSource)
      ? resolveAppUrl(fallbackAssetSource)
      : resolveAppUrl(`assets/fish/${encodeURIComponent(fallbackAssetSource)}`))
    : null;
  const resolvedAsset = resolveFishCatalogAsset(assetFile, assetFolder, folderAssets, fallbackAsset);
  const assetSourceFiles = collectFishCatalogAssetFiles(assetFile, rawAssetVariantFiles);
  const resolvedAssetVariants = [resolvedAsset, ...rawAssetVariantFiles
    .map((value) => resolveFishCatalogAsset(value, assetFolder, folderAssets, fallbackAsset))
    .filter(Boolean)]
    .filter((value, assetIndex, list) => list.indexOf(value) === assetIndex);
  const includeZombieSkeletonStageAssets = options.includeZombieSkeletonStageAssets === true;
  const explicitZombieAssetFiles = collectFishCatalogAssetFiles(entry.zombieAsset, entry.zombieImage, entry.zombieFile, entry.zombieAssetVariants, entry.zombieAssets);
  const explicitSkeletonAssetFiles = collectFishCatalogAssetFiles(entry.skeletonAsset, entry.skeletonImage, entry.skeletonFile, entry.skeletonAssetVariants, entry.skeletonAssets);
  const zombieAssetVariants = includeZombieSkeletonStageAssets
    ? (explicitZombieAssetFiles.length
      ? explicitZombieAssetFiles.map((value) => resolveFishCatalogAsset(value, assetFolder, folderAssets, null, {
        allowFallback: false,
        allowDirect: false
      }))
      : resolveFishCatalogStageAssets(assetSourceFiles, assetFolder, folderAssets, "zombie"))
      .filter((value, assetIndex, list) => Boolean(value) && list.indexOf(value) === assetIndex)
    : [];
  const skeletonAssetVariants = includeZombieSkeletonStageAssets
    ? (explicitSkeletonAssetFiles.length
      ? explicitSkeletonAssetFiles.map((value) => resolveFishCatalogAsset(value, assetFolder, folderAssets, null, {
        allowFallback: false,
        allowDirect: false
      }))
      : resolveFishCatalogStageAssets(assetSourceFiles, assetFolder, folderAssets, "skeleton"))
      .filter((value, assetIndex, list) => Boolean(value) && list.indexOf(value) === assetIndex)
    : [];

  const speedMinFloor = behavior === "sucker" ? 0.00005 : 0.012;
  const speedMaxCeiling = behavior === "sucker" ? 0.006 : 0.095;
  const needs = normalizeFishNeeds(entry);

  const normalized = {
    id,
    name: typeof entry.name === "string" && entry.name.trim() ? entry.name.trim() : titleFromFile(id),
    theme: normalizeCatalogTheme(entry.theme),
    waterType: normalizeWaterType(entry.waterType, inferWaterTypeFromTheme(entry.theme, "freshwater")),
    cost: Math.max(1, Math.floor(Number(entry.cost ?? entry.price) || 1)),
    mealCoins: 0,
    mealCoinOverride: Number.isFinite(explicitMealCoinOverride) ? Math.max(0, Math.round(explicitMealCoinOverride)) : null,
    asset: resolvedAsset,
    assetVariants: resolvedAssetVariants,
    zombieAssetVariants,
    skeletonAssetVariants,
    fallbackAsset,
    assetFolder,
    description: typeof entry.description === "string" && entry.description.trim()
      ? entry.description.trim()
      : "A custom fish from your fish catalog.",
    width: clamp(Number(entry.width) || 128, FISH_CATALOG_WIDTH_MIN, FISH_CATALOG_WIDTH_MAX),
    cycleSeconds: clamp(Number(entry.cycleSeconds) || 26, 12, 60),
    bobSpeed: clamp(Number(entry.bobSpeed) || 1.2, 0.6, 2.2),
    swimStyle,
    speedMode: entry.speedMode === "dynamic" ? "dynamic" : defaults.speedMode,
    speedMin: clamp(Number(entry.speedMin) || defaults.speedMin, speedMinFloor, speedMaxCeiling),
    speedMax: clamp(Number(entry.speedMax) || defaults.speedMax, Math.max(speedMinFloor, speedMinFloor * 1.25), speedMaxCeiling),
    targetMinMs: Math.max(800, Math.floor(Number(entry.targetMinMs) || defaults.targetMinMs)),
    targetMaxMs: Math.max(1400, Math.floor(Number(entry.targetMaxMs) || defaults.targetMaxMs)),
    behavior,
    diet,
    cleanupMinMs: Math.max(60 * 1000, Math.floor(Number(entry.cleanupMinMs) || Number(entry.cleanupMinutesMin) * 60 * 1000 || 12 * 60 * 1000)),
    cleanupMaxMs: Math.max(2 * 60 * 1000, Math.floor(Number(entry.cleanupMaxMs) || Number(entry.cleanupMinutesMax) * 60 * 1000 || 24 * 60 * 1000)),
    cleanupStrength: clamp(Number.isFinite(explicitCleanupStrength) ? explicitCleanupStrength : 0.12, 0.005, 0.45),
    poopCleanupChance: Number.isFinite(explicitPoopCleanupChance)
      ? clamp(explicitPoopCleanupChance, 0, 1)
      : (diet === "detritus" ? 1 : 0),
    shadowScale: clamp(Number(entry.shadowScale) || 0.28, 0.14, 0.5),
    defaultScale: clamp(Number(entry.defaultScale) || DEFAULT_FISH_SCALE, FISH_SCALE_MIN, FISH_SCALE_MAX),
    unlockRequirement: getSpeciesUnlockRequirement(id) || (
      typeof entry.unlockRequirement === "string" && entry.unlockRequirement.trim()
        ? entry.unlockRequirement.trim().toLowerCase()
        : null
    ),
    undeadType: typeof entry.undeadType === "string" && entry.undeadType.trim()
      ? entry.undeadType.trim().toLowerCase()
      : null,
    heartCount: Number.isFinite(explicitHeartCount)
      ? clamp(Math.round(explicitHeartCount), MIN_FISH_HEARTS, MAX_FISH_HEARTS)
      : null,
    needs,
    dislikedTypes: normalizeStringList(entry.dislikedTypes || entry.dislikes || entry.dislikedFishTypes)
      .map((value) => value.toLowerCase()),
    caveEnabled: entry.caveEnabled !== false,
    defaultNames: Array.isArray(entry.defaultNames) && entry.defaultNames.length
      ? entry.defaultNames.map((name) => String(name).trim()).filter(Boolean)
      : []
  };

  normalized.mealCoins = resolveSpeciesMealCoins(normalized);
  return normalized;
}
