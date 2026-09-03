// Source fragment: ui/notifications.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function buildDefaultNotificationCenterState() {
  return { entries: [] };
}

function sanitizeNotificationCenterEntry(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.title !== "string" || !entry.title.trim()) {
    return null;
  }
  return {
    id: String(entry.id || createId("notification")),
    type: String(entry.type || "activity").slice(0, 40),
    title: entry.title.trim().slice(0, 180),
    detail: typeof entry.detail === "string" ? entry.detail.trim().slice(0, 360) : "",
    createdAt: Number.isFinite(Number(entry.createdAt)) ? Math.max(0, Number(entry.createdAt)) : Date.now(),
    readAt: Number.isFinite(Number(entry.readAt)) ? Math.max(0, Number(entry.readAt)) : null,
    signature: typeof entry.signature === "string" ? entry.signature.slice(0, 240) : "",
    tankId: typeof entry.tankId === "string" ? entry.tankId : "",
    fishId: typeof entry.fishId === "string" ? entry.fishId : "",
    achievementId: typeof entry.achievementId === "string" ? entry.achievementId : "",
    recapDayKey: typeof entry.recapDayKey === "string" ? entry.recapDayKey : "",
    coinReward: Math.max(0, Math.floor(Number(entry.coinReward) || 0)),
    iconPath: typeof entry.iconPath === "string" ? entry.iconPath.slice(0, 260) : "",
    unlockedItems: Array.isArray(entry.unlockedItems)
      ? entry.unlockedItems.map((value) => String(value).slice(0, 100)).filter(Boolean).slice(0, 20)
      : []
  };
}

function sanitizeNotificationCenterState(rawState) {
  const entries = Array.isArray(rawState?.entries)
    ? rawState.entries.map(sanitizeNotificationCenterEntry).filter(Boolean).slice(0, NOTIFICATION_CENTER_HISTORY_LIMIT)
    : [];
  return { entries };
}

function getNotificationCenterEntries() {
  return Array.isArray(state?.notificationCenter?.entries) ? state.notificationCenter.entries : [];
}

function enqueueNotificationCenterEntry(entry, options = {}) {
  if (!state) {
    return null;
  }
  if (!state.notificationCenter || typeof state.notificationCenter !== "object") {
    state.notificationCenter = buildDefaultNotificationCenterState();
  }
  if (!Array.isArray(state.notificationCenter.entries)) {
    state.notificationCenter.entries = [];
  }
  const sanitized = sanitizeNotificationCenterEntry({
    ...entry,
    id: entry?.id || createId("notification"),
    createdAt: Number.isFinite(Number(entry?.createdAt)) ? Number(entry.createdAt) : Date.now()
  });
  if (!sanitized) {
    return null;
  }
  if (sanitized.signature) {
    const existing = state.notificationCenter.entries.find((item) => item?.signature === sanitized.signature);
    if (existing) {
      return existing;
    }
  }
  state.notificationCenter.entries.unshift(sanitized);
  state.notificationCenter.entries = state.notificationCenter.entries.slice(0, NOTIFICATION_CENTER_HISTORY_LIMIT);
  if (options.surface === true) {
    queueBoroughActivityNotification(sanitized.title, sanitized.detail, {
      force: true,
      persist: false,
      durationMs: options.durationMs
    });
  }
  return sanitized;
}

function getUnreadNotificationCount() {
  return getNotificationCenterEntries().filter((entry) => !entry?.readAt).length;
}

function getPendingDailyRecapSummaries() {
  const summary = state?.dailyBonus?.summariesByTankId?.[BOROUGH_DAILY_RECAP_ID]
    || state?.dailyBonus?.summary
    || null;
  return summary?.dayKey && !isDailyBonusSummaryClaimed(summary) ? [summary] : [];
}

function markNotificationCenterRead(now = Date.now()) {
  let changed = false;
  for (const entry of getNotificationCenterEntries()) {
    if (!entry.readAt) {
      entry.readAt = now;
      changed = true;
    }
  }
  if (changed) {
    saveState();
    renderUi(now, { full: false });
  }
  return changed;
}

function clearNotificationCenter(now = Date.now()) {
  if (!state?.notificationCenter) {
    return false;
  }
  const pendingRecapSignatures = new Set(getPendingDailyRecapSummaries()
    .map((summary) => `daily-recap:${BOROUGH_DAILY_RECAP_ID}:${summary.dayKey}`));
  const retained = getNotificationCenterEntries().filter((entry) => pendingRecapSignatures.has(entry.signature));
  if (retained.length === getNotificationCenterEntries().length) {
    return false;
  }
  state.notificationCenter.entries = retained;
  saveState();
  renderUi(now, { full: false });
  return true;
}

function ensurePendingRecapNotifications() {
  if (!state?.dailyBonus) {
    return false;
  }
  let changed = false;
  const pendingDayKeys = new Set(getPendingDailyRecapSummaries().map((summary) => summary.dayKey));
  const entriesBeforeCleanup = getNotificationCenterEntries().length;
  state.notificationCenter.entries = getNotificationCenterEntries().filter((entry) => (
    entry.type !== "daily_recap"
    || !pendingDayKeys.has(entry.recapDayKey)
    || entry.signature === `daily-recap:${BOROUGH_DAILY_RECAP_ID}:${entry.recapDayKey}`
  ));
  changed = state.notificationCenter.entries.length !== entriesBeforeCleanup;
  for (const summary of getPendingDailyRecapSummaries()) {
    const signature = `daily-recap:${BOROUGH_DAILY_RECAP_ID}:${summary.dayKey}`;
    if (getNotificationCenterEntries().some((entry) => entry.signature === signature)) {
      continue;
    }
    changed = Boolean(enqueueNotificationCenterEntry({
      type: "daily_recap",
      title: "Daily Recap ready",
      detail: `Bubble Borough · ${summary.reward || 0} coin bonus`,
      createdAt: summary.generatedAt || Date.now(),
      signature,
      tankId: "",
      recapDayKey: summary.dayKey || ""
    })) || changed;
  }
  return changed;
}

function syncNotificationBellPresentation() {
  if (!dom.dailyBonusBell) {
    return;
  }
  ensurePendingRecapNotifications();
  const unreadCount = getUnreadNotificationCount();
  const hasRecap = getPendingDailyRecapSummaries().length > 0;
  dom.dailyBonusBell.hidden = false;
  dom.dailyBonusBell.classList.toggle("has-daily-recap", hasRecap);
  dom.dailyBonusBell.classList.toggle("has-unread-notifications", unreadCount > 0);
  dom.dailyBonusBell.title = unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "Notifications";
  dom.dailyBonusBell.setAttribute("aria-label", dom.dailyBonusBell.title);
  if (dom.notificationBellBadge) {
    dom.notificationBellBadge.hidden = unreadCount <= 0;
    dom.notificationBellBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
  }
}

function formatNotificationCenterTime(timestamp) {
  const value = Number(timestamp) || Date.now();
  return new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function renderNotificationCenterOverlay() {
  ensurePendingRecapNotifications();
  const entries = getNotificationCenterEntries();
  const body = entries.length ? entries.map((entry) => {
    const inferredFish = entry.fishId
      ? getAllTankFish(state).find((fish) => fish.id === entry.fishId)
      : getAllTankFish(state).find((fish) => String(entry.title || "").startsWith(`${fish.name} `));
    const targetFishId = inferredFish?.id || "";
    const targetTankId = entry.tankId || getTankContainingFish(targetFishId)?.id || "";
    const typeLabel = entry.type === "achievement" ? "Achievement" : entry.type === "daily_recap" ? "Daily Recap" : "Borough";
    const icon = entry.iconPath
      ? `<img class="notification-center-icon" src="${escapeHtml(entry.iconPath)}" alt="" />`
      : `<span class="notification-center-symbol" aria-hidden="true">${entry.type === "daily_recap" ? "☀" : "•"}</span>`;
    const rewards = [
      entry.coinReward > 0 ? `+${entry.coinReward} coins` : "",
      ...(entry.unlockedItems || []).slice(0, 4)
    ].filter(Boolean);
    const recapPending = entry.type === "daily_recap" && getPendingDailyRecapSummaries().some((summary) => (
      summary.dayKey === entry.recapDayKey
    ));
    return `
      <article class="notification-center-entry ${entry.readAt ? "is-read" : "is-unread"}${targetTankId || targetFishId ? " is-actionable" : ""}"${targetTankId || targetFishId ? ` data-notification-tank-id="${escapeHtml(targetTankId)}" data-notification-fish-id="${escapeHtml(targetFishId)}" tabindex="0" role="button"` : ""}>
        ${icon}
        <div class="notification-center-copy">
          <div class="notification-center-meta"><span>${escapeHtml(typeLabel)}</span><time>${escapeHtml(formatNotificationCenterTime(entry.createdAt))}</time></div>
          <strong>${escapeHtml(entry.title)}</strong>
          ${entry.detail ? `<p>${escapeHtml(entry.detail)}</p>` : ""}
          ${rewards.length ? `<div class="notification-center-rewards">${rewards.map((reward) => `<span>${escapeHtml(reward)}</span>`).join("")}</div>` : ""}
          ${recapPending ? `<button class="small-button" type="button" data-open-daily-recap="borough">View Recap</button>` : ""}
        </div>
      </article>`;
  }).join("") : `<div class="empty-state">No recent notifications yet.</div>`;
  return {
    kicker: "Borough Inbox",
    title: "Notifications",
    body: `<div class="notification-center-list">${body}</div>`,
    footer: `<button class="small-button alt" type="button" data-mark-notifications-read>Mark all read</button><button class="small-button alt" type="button" data-clear-notifications>Clear history</button>`,
    closable: true
  };
}

function handleNotificationCenterBodyClick(ctx, target) {
  const recapButton = target?.closest?.("[data-open-daily-recap]");
  if (recapButton instanceof HTMLElement) {
    openUtilityOverlay("daily-bonus");
    return true;
  }
  const entry = target?.closest?.("[data-notification-tank-id], [data-notification-fish-id]");
  if (!(entry instanceof HTMLElement)) {
    return false;
  }
  const tankId = entry.dataset.notificationTankId || getTankContainingFish(entry.dataset.notificationFishId)?.id || "";
  const fishId = entry.dataset.notificationFishId || "";
  closeUtilityOverlay();
  if (tankId && state.activeTankId !== tankId) {
    setActiveTank(tankId, { announce: false });
  }
  if (fishId && getTankContainingFish(fishId)?.id === state.activeTankId) {
    openFishInspector(fishId);
  }
  return true;
}

function ensureBoroughNotificationHost() {
  let host = document.querySelector("#boroughActivityNotifications");
  if (!host) {
    host = document.createElement("div");
    host.id = "boroughActivityNotifications";
    host.className = "borough-activity-notifications";
    host.setAttribute("aria-live", "polite");
    host.setAttribute("aria-atomic", "false");
    document.body.append(host);
  }
  return host;
}

function queueBoroughActivityNotification(title, detail = "", options = {}) {
  const now = Number.isFinite(Number(options.time)) ? Number(options.time) : Date.now();
  const signature = String(options.signature || `${title}|${detail}`).toLowerCase();
  const lastDuplicateAt = Number(runtime.boroughNotificationSignatures.get(signature)) || 0;
  if (!options.force && (now - runtime.lastBoroughNotificationAt < BOROUGH_NOTIFICATION_COOLDOWN_MS || now - lastDuplicateAt < BOROUGH_NOTIFICATION_DUPLICATE_MS)) {
    return false;
  }
  runtime.lastBoroughNotificationAt = now;
  runtime.boroughNotificationSignatures.set(signature, now);
  for (const [key, timestamp] of runtime.boroughNotificationSignatures) {
    if (now - timestamp > BOROUGH_NOTIFICATION_DUPLICATE_MS * 2) {
      runtime.boroughNotificationSignatures.delete(key);
    }
  }
  if (options.persist !== false) {
    enqueueNotificationCenterEntry({
      type: options.type || "borough",
      title,
      detail,
      createdAt: now,
      signature,
      tankId: options.tankId || "",
      fishId: options.fishId || ""
    });
  }
  const host = ensureBoroughNotificationHost();
  const notification = document.createElement("div");
  notification.className = "borough-activity-notification";
  notification.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<span>${escapeHtml(detail)}</span>` : ""}`;
  host.append(notification);
  while (host.children.length > 3) {
    host.firstElementChild?.remove();
  }
  requestAnimationFrame(() => notification.classList.add("is-visible"));
  window.setTimeout(() => {
    notification.classList.remove("is-visible");
    window.setTimeout(() => notification.remove(), 350);
  }, Math.max(2400, Number(options.durationMs) || 4200));
  return true;
}

function publishBoroughActivityEvent(event, tank = getCurrentTank()) {
  const happening = maybeRecordBoroughHappeningFromEvent(event, tank);
  const type = String(event?.type || "").toLowerCase();
  if (["travel", "service", "residence", "birthday", "recovery", "birth"].includes(type)) {
    queueBoroughActivityNotification(event.text, event.detail || "", {
      time: event.time,
      signature: `${type}:${event.fishId || ""}:${event.destinationTankId || event.placedDecorId || event.text}`,
      type,
      tankId: tank?.id || "",
      fishId: event.fishId || ""
    });
  }
  return happening;
}

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

function resetToastState() {
  if (runtime.toastHandle) {
    clearTimeout(runtime.toastHandle);
  }
  runtime.toastHandle = null;
  runtime.toastKey = "";
  runtime.guidanceToastOwner = "";
  dom.toast?.classList.remove("is-visible");
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
