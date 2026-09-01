// Source fragment: ui/notifications.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function getMessageAnchorRect() {
  return dom.tankDisplay?.getBoundingClientRect?.() || document.querySelector(".tank-display")?.getBoundingClientRect?.() || null;
}

function getTransientMessageAnchor(gap = 14) {
  const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
  const anchorRect = getMessageAnchorRect();
  if (anchorRect?.width && anchorRect?.height) {
    const viewportLeft = Math.round(anchorRect.left);
    const viewportTop = Math.round(anchorRect.bottom + gap);
    const stageLeft = stageRect ? Math.round(anchorRect.left - stageRect.left) : 8;
    const stageTop = stageRect ? Math.round(anchorRect.bottom - stageRect.top + gap) : viewportTop;
    return {
      viewportLeft,
      viewportTop,
      stageLeft,
      stageTop,
      toastMaxWidth: Math.max(220, Math.min(420, Math.round(window.innerWidth - viewportLeft - 12))),
      hintMaxWidth: Math.max(220, Math.min(420, Math.round((stageRect?.width || window.innerWidth) - stageLeft - 12)))
    };
  }

  return {
    viewportLeft: 12,
    viewportTop: 86,
    stageLeft: 8,
    stageTop: 86,
    toastMaxWidth: Math.max(220, Math.min(420, window.innerWidth - 24)),
    hintMaxWidth: Math.max(220, Math.min(420, Math.round((stageRect?.width || window.innerWidth) - 16)))
  };
}

function getVisibleTransientRect(element) {
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
  if (!rect?.width || !rect?.height) {
    return null;
  }
  const viewportWidth = Math.max(1, window.innerWidth || 1);
  const viewportHeight = Math.max(1, window.innerHeight || 1);
  if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= viewportWidth || rect.top >= viewportHeight) {
    return null;
  }
  return rect;
}

function getToastAvoidanceRects() {
  const viewportArea = Math.max(1, (window.innerWidth || 1) * (window.innerHeight || 1));
  return [
    dom.tankDisplay,
    dom.careTaskPane,
    dom.dailyBonusBell,
    dom.introTutorialPanel,
    dom.tankBottomDock,
    dom.editDecorTray,
    dom.editFishTray,
    dom.foodTray,
    dom.medicineTray,
    dom.placementHintContainer,
    dom.fishInspector,
    dom.storeOverlay,
    dom.utilityOverlay,
    dom.settingsOverlay,
    dom.equipmentOverlay
  ]
    .map(getVisibleTransientRect)
    .filter((rect) => rect && (rect.width * rect.height) < viewportArea * 0.72);
}

function getRectOverlapArea(left, right) {
  if (!doRectsOverlap(left, right)) {
    return 0;
  }
  return Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
    * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
}

function positionCareTaskPane() {
  if (!dom.careTaskPane || dom.careTaskPane.hidden || !dom.tankStage) {
    return;
  }

  const stageRect = dom.tankStage.getBoundingClientRect?.();
  if (!stageRect?.width || !stageRect?.height) {
    return;
  }

  const padding = 12;
  const gap = 12;
  const paneRect = dom.careTaskPane.getBoundingClientRect?.();
  const maxPaneWidth = Math.max(1, stageRect.width - padding * 2);
  const maxPaneHeight = Math.max(1, stageRect.height - padding * 2);
  const paneWidth = Math.min(Math.max(240, Math.ceil(paneRect?.width || 330)), maxPaneWidth);
  const paneHeight = Math.min(Math.max(70, Math.ceil(paneRect?.height || 120)), maxPaneHeight);
  const viewport = {
    left: stageRect.left + padding,
    top: stageRect.top + padding,
    right: stageRect.right - padding,
    bottom: stageRect.bottom - padding
  };
  const displayRect = getVisibleTransientRect(dom.tankDisplay);
  const toolbarRect = getVisibleTransientRect(dom.tankBottomDock);
  const candidateFromRect = (rect) => rect
    ? [
      { left: rect.left, top: rect.bottom + gap, priority: 0 },
      { left: rect.right + gap, top: rect.top, priority: 2 },
      { left: rect.left, top: rect.top - paneHeight - gap, priority: 4 }
    ]
    : [];
  const rawCandidates = [
    ...candidateFromRect(displayRect),
    { left: viewport.left, top: viewport.top, priority: 5 },
    { left: viewport.right - paneWidth, top: viewport.top, priority: 6 },
    { left: viewport.left, top: viewport.bottom - paneHeight, priority: 8 }
  ];
  const avoidRects = [
    displayRect,
    toolbarRect,
    getVisibleTransientRect(dom.foodTray),
    getVisibleTransientRect(dom.medicineTray),
    getVisibleTransientRect(dom.editDecorTray),
    getVisibleTransientRect(dom.editFishTray),
    getVisibleTransientRect(dom.fishInspector)
  ].filter(Boolean);
  const clampCandidate = (candidate) => ({
    left: clamp(candidate.left, viewport.left, Math.max(viewport.left, viewport.right - paneWidth)),
    top: clamp(candidate.top, viewport.top, Math.max(viewport.top, viewport.bottom - paneHeight))
  });
  const toRect = (candidate) => ({
    left: candidate.left,
    top: candidate.top,
    right: candidate.left + paneWidth,
    bottom: candidate.top + paneHeight
  });
  const best = rawCandidates
    .map((candidate, index) => {
      const clamped = clampCandidate(candidate);
      const rect = toRect(clamped);
      const overlapArea = avoidRects.reduce((total, avoidRect) => total + getRectOverlapArea(rect, avoidRect), 0);
      const anchorDistance = displayRect
        ? Math.abs(clamped.left - displayRect.left) + Math.abs(clamped.top - (displayRect.bottom + gap))
        : 0;
      return {
        candidate: clamped,
        score: overlapArea * 1000 + candidate.priority * 10000 + anchorDistance + index
      };
    })
    .sort((left, right) => left.score - right.score)[0]?.candidate || clampCandidate(rawCandidates[0]);

  dom.careTaskPane.style.setProperty("--care-task-pane-left", `${Math.round(best.left - stageRect.left)}px`);
  dom.careTaskPane.style.setProperty("--care-task-pane-top", `${Math.round(best.top - stageRect.top)}px`);
  dom.careTaskPane.style.setProperty("--care-task-pane-width", `${Math.round(paneWidth)}px`);
}

function positionDailyBonusBell() {
  if (!dom.dailyBonusBell || dom.dailyBonusBell.hidden || !dom.tankStage) {
    return;
  }

  const stageRect = dom.tankStage.getBoundingClientRect?.();
  if (!stageRect?.width || !stageRect?.height) {
    return;
  }

  const padding = 12;
  const gap = 10;
  const measuredRect = dom.dailyBonusBell.getBoundingClientRect?.();
  const bellWidth = Math.max(28, Math.ceil(measuredRect?.width || 44));
  const bellHeight = Math.max(28, Math.ceil(measuredRect?.height || 44));
  const viewport = {
    left: stageRect.left + padding,
    top: stageRect.top + padding,
    right: stageRect.right - padding,
    bottom: stageRect.bottom - padding
  };
  const preferredLeft = viewport.right - bellWidth;
  const preferredTop = viewport.top;
  const displayRect = getVisibleTransientRect(dom.tankDisplay);
  const taskPaneRect = getVisibleTransientRect(dom.careTaskPane);
  const avoidRects = [
    displayRect,
    taskPaneRect,
    getVisibleTransientRect(dom.tankBottomDock),
    getVisibleTransientRect(dom.foodTray),
    getVisibleTransientRect(dom.medicineTray),
    getVisibleTransientRect(dom.editDecorTray),
    getVisibleTransientRect(dom.editFishTray),
    getVisibleTransientRect(dom.placementHintContainer),
    getVisibleTransientRect(dom.fishInspector)
  ].filter(Boolean);
  const rawCandidates = [
    { left: preferredLeft, top: preferredTop, priority: 0 },
    { left: preferredLeft, top: (displayRect?.bottom || preferredTop) + gap, priority: 1 },
    { left: preferredLeft, top: (taskPaneRect?.bottom || displayRect?.bottom || preferredTop) + gap, priority: 2 },
    { left: displayRect ? displayRect.left - bellWidth - gap : preferredLeft, top: displayRect?.top || preferredTop, priority: 3 },
    { left: viewport.left, top: viewport.top, priority: 8 },
    { left: preferredLeft, top: viewport.bottom - bellHeight, priority: 9 }
  ];
  for (const rect of avoidRects) {
    rawCandidates.push(
      { left: preferredLeft, top: rect.bottom + gap, priority: 2 },
      { left: rect.left - bellWidth - gap, top: rect.top, priority: 4 },
      { left: rect.right + gap, top: rect.top, priority: 5 }
    );
  }

  const clampCandidate = (candidate) => ({
    left: clamp(candidate.left, viewport.left, Math.max(viewport.left, viewport.right - bellWidth)),
    top: clamp(candidate.top, viewport.top, Math.max(viewport.top, viewport.bottom - bellHeight))
  });
  const toRect = (candidate) => ({
    left: candidate.left,
    top: candidate.top,
    right: candidate.left + bellWidth,
    bottom: candidate.top + bellHeight
  });
  const best = rawCandidates
    .map((candidate, index) => {
      const clamped = clampCandidate(candidate);
      const rect = toRect(clamped);
      const overlapArea = avoidRects.reduce((total, avoidRect) => total + getRectOverlapArea(rect, avoidRect), 0);
      const topRightDistance = Math.abs(clamped.left - preferredLeft) + Math.abs(clamped.top - preferredTop);
      return {
        candidate: clamped,
        score: overlapArea * 1000 + candidate.priority * 10000 + topRightDistance + index
      };
    })
    .sort((left, right) => left.score - right.score)[0]?.candidate || clampCandidate(rawCandidates[0]);

  dom.dailyBonusBell.style.setProperty("--daily-bonus-bell-left", `${Math.round(best.left - stageRect.left)}px`);
  dom.dailyBonusBell.style.setProperty("--daily-bonus-bell-top", `${Math.round(best.top - stageRect.top)}px`);
}

function getDynamicToastAnchor(baseAnchor) {
  const padding = 12;
  const gap = 12;
  const viewport = {
    left: padding,
    top: padding,
    right: Math.max(padding, (window.innerWidth || 0) - padding),
    bottom: Math.max(padding, (window.innerHeight || 0) - padding)
  };
  const maxWidth = Math.max(220, Math.min(420, Math.round(viewport.right - viewport.left)));
  dom.toast.style.maxWidth = `${maxWidth}px`;
  const measuredRect = dom.toast.getBoundingClientRect?.();
  const toastWidth = Math.max(220, Math.min(maxWidth, Math.ceil(measuredRect?.width || 320)));
  const toastHeight = Math.max(38, Math.ceil(measuredRect?.height || 48));
  const clampCandidate = (candidate) => ({
    left: clamp(candidate.left, viewport.left, Math.max(viewport.left, viewport.right - toastWidth)),
    top: clamp(candidate.top, viewport.top, Math.max(viewport.top, viewport.bottom - toastHeight))
  });
  const toRect = (candidate) => ({
    left: candidate.left,
    top: candidate.top,
    right: candidate.left + toastWidth,
    bottom: candidate.top + toastHeight
  });
  const avoidRects = getToastAvoidanceRects();
  const rawCandidates = [
    { left: baseAnchor.viewportLeft, top: baseAnchor.viewportTop, priority: 0 },
    { left: viewport.left, top: viewport.top, priority: 4 },
    { left: viewport.right - toastWidth, top: viewport.top, priority: 5 },
    { left: viewport.left, top: viewport.bottom - toastHeight, priority: 7 },
    { left: viewport.right - toastWidth, top: viewport.bottom - toastHeight, priority: 8 },
    { left: viewport.left + (viewport.right - viewport.left - toastWidth) / 2, top: viewport.top, priority: 6 }
  ];
  for (const rect of avoidRects) {
    rawCandidates.push(
      { left: rect.left, top: rect.bottom + gap, priority: 1 },
      { left: rect.right + gap, top: rect.top, priority: 2 },
      { left: rect.left, top: rect.top - toastHeight - gap, priority: 3 },
      { left: rect.left - toastWidth - gap, top: rect.top, priority: 6 }
    );
  }

  const best = rawCandidates
    .map((candidate, index) => {
      const clamped = clampCandidate(candidate);
      const rect = toRect(clamped);
      const overlapArea = avoidRects.reduce((total, avoidRect) => total + getRectOverlapArea(rect, avoidRect), 0);
      const anchorDistance = Math.abs(clamped.left - baseAnchor.viewportLeft) + Math.abs(clamped.top - baseAnchor.viewportTop);
      return {
        candidate: clamped,
        score: overlapArea * 1000 + candidate.priority * 10000 + anchorDistance + index
      };
    })
    .sort((left, right) => left.score - right.score)[0]?.candidate || clampCandidate(rawCandidates[0]);

  return {
    viewportLeft: Math.round(best.left),
    viewportTop: Math.round(best.top),
    toastMaxWidth: Math.max(220, Math.min(maxWidth, Math.round(viewport.right - best.left)))
  };
}

function positionToast() {
  if (!dom.toast) {
    return;
  }

  const anchor = getDynamicToastAnchor(getTransientMessageAnchor());
  dom.toast.style.left = `${anchor.viewportLeft}px`;
  dom.toast.style.top = `${anchor.viewportTop}px`;
  dom.toast.style.bottom = "auto";
  dom.toast.style.maxWidth = `${anchor.toastMaxWidth}px`;
}

function positionPlacementHint() {
  if (!dom.placementHintContainer) {
    return;
  }

  if (shouldShowDecorSwimGuide()) {
    const stageRect = dom.tankStage?.getBoundingClientRect?.() || null;
    const trayRect = dom.editDecorTray && !dom.editDecorTray.hidden
      ? dom.editDecorTray.getBoundingClientRect?.() || null
      : null;
    if (stageRect?.width && trayRect?.width) {
      const hintWidth = Math.max(260, Math.min(520, Math.round(trayRect.width - 28)));
      const hintHeight = Math.max(
        dom.placementHintContainer.offsetHeight || 0,
        dom.placementHint?.offsetHeight || 0,
        44
      );
      const maxLeft = Math.max(8, Math.round(stageRect.width - hintWidth - 8));
      const centeredLeft = Math.round(trayRect.left - stageRect.left + (trayRect.width - hintWidth) / 2);
      dom.placementHintContainer.style.left = `${clamp(centeredLeft, 8, maxLeft)}px`;
      dom.placementHintContainer.style.top = `${Math.max(12, Math.round(trayRect.top - stageRect.top - hintHeight - 12))}px`;
      dom.placementHintContainer.style.right = "auto";
      dom.placementHintContainer.style.bottom = "auto";
      dom.placementHintContainer.style.transform = "none";
      dom.placementHintContainer.style.maxWidth = `${hintWidth}px`;
      dom.placementHintContainer.style.width = `${hintWidth}px`;
      return;
    }
  }

  const anchor = getTransientMessageAnchor();
  dom.placementHintContainer.style.left = `${anchor.stageLeft}px`;
  dom.placementHintContainer.style.top = `${anchor.stageTop}px`;
  dom.placementHintContainer.style.right = "auto";
  dom.placementHintContainer.style.bottom = "auto";
  dom.placementHintContainer.style.transform = "none";
  dom.placementHintContainer.style.maxWidth = `${anchor.hintMaxWidth}px`;
  dom.placementHintContainer.style.width = `${anchor.hintMaxWidth}px`;
}

function positionTransientMessages() {
  positionCareTaskPane();
  positionPlacementHint();
  positionDailyBonusBell();
  positionToast();
}

function hideToast(options = {}) {
  const targetKey = typeof options.key === "string" ? options.key : "";
  if (targetKey && runtime.toastKey !== targetKey) {
    return false;
  }
  if (runtime.toastHandle) {
    clearTimeout(runtime.toastHandle);
    runtime.toastHandle = null;
  }
  runtime.toastKey = "";
  runtime.guidanceToastOwner = "";
  dom.toast?.classList.remove("is-visible");
  return true;
}

function showGuidanceToast(owner, message, options = {}) {
  return showToast(message, {
    ...options,
    owner
  });
}

function showToast(message, options = {}) {
  runtime.toastKey = typeof options.key === "string" ? options.key : "";
  runtime.guidanceToastOwner = typeof options.owner === "string" ? options.owner : "toast:general";
  dom.toast.textContent = message;
  positionToast();
  dom.toast.classList.add("is-visible");

  if (runtime.toastHandle) {
    clearTimeout(runtime.toastHandle);
  }

  const durationMs = Math.max(0, Number.isFinite(Number(options.durationMs)) ? Number(options.durationMs) : 2200);
  runtime.toastHandle = setTimeout(() => {
    dom.toast.classList.remove("is-visible");
    runtime.toastHandle = null;
    runtime.toastKey = "";
    runtime.guidanceToastOwner = "";
  }, durationMs);
}
