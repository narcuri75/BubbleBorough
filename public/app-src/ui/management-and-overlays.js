// Source fragment: ui/management-and-overlays.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function renderTankManagement() {
  const tank = getCurrentTank();
  if (!tank) {
    return;
  }

  if (dom.tankManagementCard) {
    setMarkupIfChanged("tank-management-card", dom.tankManagementCard, buildTankManagementCardMarkup(tank, { variant: "sidebar" }));
  }
}

function buildTankManagementCardMarkup(tank = getCurrentTank(), options = {}) {
  if (!tank) {
    return "";
  }

  const { variant = "sidebar", stats = null } = options;
  const currentTankIndex = getCurrentTankIndex();
  const livingFish = tank.fish.filter((fish) => !isFishDead(fish)).length;
  const fishCount = tank.fish.length;
  const decorCount = tank.placedDecor.length;
  const tankCount = getAllTanks().length;
  const sectionServices = getBoroughSectionServiceTypes(tank);
  const sectionServiceLabel = sectionServices.length
    ? sectionServices.map((serviceType) => getBoroughServiceLabel(serviceType)).join(", ")
    : "None yet";
  const resaleValue = getTankResaleValue(tank);
  const filterLabel = ENABLE_FILTER ? (runtime.filterMap.get(tank.selectedFilterAsset)?.name || "Basic Filter") : "None";
  const filterSummaryRow = ENABLE_FILTER
    ? `<div class="summary-row"><span>Filter</span><strong>${filterLabel}</strong></div>`
    : "";
  const tankMemoryNote = "All neighborhoods are connected. Fish can travel throughout Bubble Borough.";
  const editingName = runtime.editingTankNameId === tank.id;
  const tankLabel = getTankLabel(tank, currentTankIndex);
  const nameMarkup = editingName
    ? `
      <div class="tank-name-editor">
        <input
          class="tank-name-input"
          type="text"
          maxlength="28"
          data-tank-name-input
          value="${escapeHtml(runtime.editingTankNameValue || tankLabel)}"
          aria-label="Tank name" />
        <button class="small-button" type="button" data-save-tank-name>Save</button>
        <button class="small-button alt" type="button" data-cancel-tank-name>Cancel</button>
      </div>
    `
    : `
      <div class="tank-name-display">
        <strong>${escapeHtml(tankLabel)}</strong>
        <button class="small-button icon-only alt" type="button" data-edit-tank-name title="Rename tank" aria-label="Rename tank">&#9998;</button>
      </div>
    `;

  if (variant === "overlay") {
    const managementStats = stats || getManagementHubStats(Date.now());
    const status = getManagementTankStatus(managementStats);
    const switchTankDisclaimer = "Use Overview to navigate the borough, or WASD to move through adjacent neighborhoods.";

    return `
      <div class="management-summary-strip management-tone-${status.tone}">
        <div class="management-summary-head">
          <div class="management-summary-nameplate">
            ${nameMarkup}
          </div>
          <span class="management-status-pill management-tone-${status.tone}">${escapeHtml(status.label)}</span>
        </div>
        <div class="management-summary-meta">
          ${buildManagementSummaryChip(`Neighborhood ${currentTankIndex + 1} of ${tankCount}`)}
          ${buildManagementSummaryButton("Fish", fishCount, "fish")}
          ${buildManagementSummaryButton("Decor", decorCount, "decor")}
          ${buildManagementSummaryChip(`Services: ${sectionServiceLabel}`)}
        </div>
        <div class="tank-action-row management-summary-actions">
          <button class="small-button alt" type="button" data-open-equipment-overlay>Edit Tank</button>
          <button class="small-button alt" type="button" data-open-aquarium-overview>Overview</button>
          <button class="small-button alt" type="button" data-extend-aquarium>Extend Aquarium</button>
        </div>
        <p class="management-summary-disclaimer">${escapeHtml(switchTankDisclaimer)}</p>
      </div>
    `;
  }

  return `
    <div class="tank-summary-grid">
      <div class="summary-row tank-name-summary-row"><span>Tank Name</span>${nameMarkup}</div>
      <div class="summary-row"><span>Neighborhood</span><strong>${currentTankIndex + 1} of ${tankCount}</strong></div>
      <div class="summary-row"><span>Services</span><strong>${escapeHtml(sectionServiceLabel)}</strong></div>
      ${filterSummaryRow}
      <div class="summary-row"><span>Fish</span><strong>${livingFish}</strong></div>
      <div class="summary-row"><span>Decor</span><strong>${decorCount}</strong></div>
    </div>
    <div class="mini-note">${tankMemoryNote}</div>
    <div class="tank-action-row">
      <button class="small-button alt" type="button" data-open-equipment-overlay>Edit Tank</button>
      <button class="small-button alt" type="button" data-open-aquarium-overview>Overview</button>
      <button class="small-button alt" type="button" data-extend-aquarium>Extend Aquarium</button>
    </div>
  `;
}

function buildManagementSummaryChip(value) {
  return `
    <span class="management-summary-chip">${escapeHtml(String(value))}</span>
  `;
}

function buildManagementSummaryButton(label, value, view) {
  return `
    <button class="management-summary-button" type="button" data-management-view="${escapeHtml(view)}">
      ${escapeHtml(`${label} (${value})`)}
    </button>
  `;
}

function getManagementTankStatus(stats) {
  if (!stats) {
    return {
      label: "Stand By",
      note: "Tank data is still loading.",
      tone: "neutral"
    };
  }

  if (stats.deadFish > 0) {
    return {
      label: "Needs Care",
      note: `${stats.deadFish} dead ${pluralize("fish", stats.deadFish)} should be removed.`,
      tone: "danger"
    };
  }

  if (stats.injuredFish > 0) {
    return {
      label: "Needs Care",
      note: `${stats.injuredFish} ${pluralize("fish", stats.injuredFish)} healing. Medicine helps them recover faster.`,
      tone: "warn"
    };
  }

  if (stats.hungryFish > 0) {
    return {
      label: "Needs Food",
      note: `${stats.hungryFish} ${pluralize("fish", stats.hungryFish)} hungry. ${stats.mealNote}.`,
      tone: "warn"
    };
  }

  if (stats.cleanPercent <= 45) {
    return {
      label: "Needs Cleaning",
      note: `${stats.cleanPercent}% clean. Max grime in ${stats.maxDirtyIn}.`,
      tone: stats.cleanPercent <= 20 ? "danger" : "warn"
    };
  }

  if (stats.wasteCount > 0) {
    return {
      label: "Needs Cleaning",
      note: `${stats.wasteCount} waste ${stats.wasteCount === 1 ? "pile is" : "piles are"} sitting on the gravel.`,
      tone: "warn"
    };
  }

  if (stats.pendingWasteCount > 0) {
    return {
      label: "Needs Cleaning",
      note: `${stats.pendingWasteCount} more ${pluralize("waste drop", stats.pendingWasteCount)} will settle soon.`,
      tone: "neutral"
    };
  }

  if (!stats.livingFish) {
    return {
      label: "Ready To Stock",
      note: "This neighborhood is clean and ready for fish.",
      tone: "neutral"
    };
  }

  return {
    label: "Thriving",
    note: "Hunger, health, and cleanup are all on track.",
    tone: "good"
  };
}

function buildIllnessCareTask(now = Date.now()) {
  if (!state?.fish?.length) {
    return null;
  }

  const affectedFish = state.fish
    .filter((fish) => fish && !isFishDead(fish) && isFishDiseaseVisible(fish) && hasActiveFishDisease(fish))
    .sort((left, right) => Number(left.diseaseInfectedAt || 0) - Number(right.diseaseInfectedAt || 0));
  if (!affectedFish.length) {
    return null;
  }

  const count = affectedFish.length;
  const hasSevere = affectedFish.some((fish) => sanitizeDiseaseState(fish.diseaseState) === DISEASE_STATE_SEVERE);
  const allRecovering = affectedFish.every((fish) => sanitizeDiseaseState(fish.diseaseState) === DISEASE_STATE_RECOVERING);
  const firstFish = affectedFish[0];
  const label = count === 1
    ? allRecovering
      ? `${firstFish.name} is recovering.`
      : `${firstFish.name} looks off-color.`
    : allRecovering
      ? "Several fish are recovering."
      : "Several fish look off-color.";
  const note = allRecovering
    ? "Keep conditions steady until normal routines return."
    : count === 1
      ? "Give them quiet space and medicine if you can."
      : "Keep the tank calm, clean the water, and dose medicine if you can.";

  return {
    id: "illness-care",
    badge: hasSevere ? "Now" : "Care",
    label,
    value: count === 1 ? "Care" : `${count} fish`,
    note,
    tone: hasSevere ? "danger" : "warn"
  };
}

function buildManagementCareQueue(stats) {
  const tasks = [];
  if (stats.deadFish > 0) {
    tasks.push({
      id: "dispose-dead-fish",
      badge: "Now",
      label: "Dispose dead fish",
      value: `${stats.deadFish} waiting`,
      note: "Open the tank and scoop them out now.",
      tone: "danger"
    });
  }

  if (stats.injuredFish > 0) {
    tasks.push({
      id: "dose-medicine",
      badge: tasks.length ? "Soon" : "Now",
      label: "Dose medicine",
      value: `${stats.injuredFish} healing`,
      note: "Use medicine to speed recovery.",
      tone: "warn"
    });
  }

  if (stats.hungryFish > 0) {
    tasks.push({
      id: "feed-hungry-fish",
      badge: tasks.length ? "Soon" : "Now",
      label: "Feed hungry fish",
      value: `${stats.hungryFish} hungry`,
      note: stats.mealNote,
      tone: "warn"
    });
  }

  if (stats.cleanPercent <= 45) {
    tasks.push({
      id: "clean-tank",
      badge: tasks.length ? "Soon" : "Now",
      label: stats.cleanPercent <= 20 ? "Clean the tank" : "Schedule a scrub",
      value: `${stats.cleanPercent}% clean`,
      note: `Max grime in ${stats.maxDirtyIn}.`,
      tone: stats.cleanPercent <= 20 ? "danger" : "warn"
    });
  }

  if (stats.wasteCount > 0) {
    tasks.push({
      id: "scoop-floor",
      badge: tasks.length ? "Soon" : "Heads Up",
      label: "Scoop the floor",
      value: `${stats.wasteCount} waste`,
      note: stats.pendingWasteCount > 0
        ? `${stats.pendingWasteCount} more ${pluralize("drop", stats.pendingWasteCount)} pending soon.`
        : "Once scooped, the gravel is clear again.",
      tone: "warn"
    });
  }

  const illnessCareTask = buildIllnessCareTask(stats.now || Date.now());
  if (illnessCareTask && tasks.length < 6) {
    tasks.push({
      ...illnessCareTask,
      badge: tasks.length ? illnessCareTask.badge : (illnessCareTask.tone === "danger" ? "Now" : "Care")
    });
  }

  const comfortSuggestions = buildCurrentTankCareSuggestions(stats.now || Date.now())
    .filter((suggestion) => suggestion && suggestion.fulfilled !== true);
  for (const suggestion of comfortSuggestions) {
    if (tasks.length >= 6) {
      break;
    }
    const key = String(suggestion.key || "");
    const isNeedSuggestion = key.startsWith("need:");
    const isGlassStressSuggestion = key.startsWith("glass_tap_stress:");
    tasks.push({
      id: `comfort:${key || suggestion.label}`,
      badge: tasks.length ? "Comfort" : "Now",
      label: suggestion.label,
      value: isNeedSuggestion ? "Need" : isGlassStressSuggestion ? "Stress" : "Conflict",
      note: isGlassStressSuggestion
        ? "Avoid tapping nearby glass until the stress fades."
        : isNeedSuggestion
        ? "Add matching decor, space, or tankmates to satisfy this need."
        : "Adjust tankmates or decor to remove this comfort penalty.",
      tone: isNeedSuggestion ? "neutral" : "warn"
    });
  }

  if (!tasks.length) {
    const readyToStock = !stats?.livingFish;
    return [{
      id: "all-clear",
      badge: readyToStock ? "Ready" : "On Track",
      label: readyToStock ? "Ready to stock" : "Everything is on track",
      value: readyToStock ? "No fish" : "All clear",
      note: readyToStock ? "This neighborhood is clean and ready for fish." : "Hunger, health, comfort, and cleanup look good.",
      tone: readyToStock ? "neutral" : "good"
    }];
  }

  return tasks;
}

function buildUniversalManagementCareQueue(now = Date.now()) {
  const tasks = [];
  const hungryFish = [];
  const injuredFish = [];
  const diseasedFish = [];
  for (const tank of getAllTanks()) {
    const localTasks = withActiveTank(tank.id, () => buildManagementCareQueue(getManagementHubStats(now))) || [];
    for (const task of localTasks) {
      const localId = getCareTaskId(task);
      if (localId === "all-clear") {
        continue;
      }
      let targetFish = null;
      if (localId === "feed-hungry-fish") {
        hungryFish.push(...getHungryFishByNeeds(tank, now, FISH_HUNGER_LOW_THRESHOLD).map((fish) => ({ fish, tank })));
        continue;
      } else if (localId === "dose-medicine") {
        injuredFish.push(...tank.fish.filter((fish) => !isFishDead(fish) && fish.healthUnits < getFishMaxHealthUnits(fish)).map((fish) => ({ fish, tank })));
        continue;
      } else if (localId === "illness-care") {
        diseasedFish.push(...tank.fish.filter((fish) => !isFishDead(fish) && isFishDiseaseVisible(fish) && hasActiveFishDisease(fish)).map((fish) => ({ fish, tank })));
        continue;
      } else if (localId.startsWith("comfort:")) {
        targetFish = tank.fish.find((fish) => String(task.label || "").startsWith(`${fish.name} `)) || null;
      }
      tasks.push({
        ...task,
        // Fish-care task identity follows the fish, not its current tank. Tank
        // chores remain tied to the physical section that needs attention.
        id: targetFish ? localId : `${tank.id}:${localId}`,
        tankId: tank.id,
        fishId: targetFish?.id || "",
        tankLabel: getTankLabel(tank)
      });
    }
  }
  const pushAggregate = (id, entries, label, badge, valueLabel, tone, actionNote) => {
    if (!entries.length) return;
    const first = entries[0];
    tasks.unshift({
      id,
      badge,
      label,
      value: `${entries.length} ${valueLabel}`,
      note: actionNote,
      tone,
      tankId: first.tank.id,
      fishId: first.fish.id,
      tankLabel: getTankLabel(first.tank)
    });
  };
  pushAggregate("feed-hungry-fish", hungryFish, "Feed hungry fish", "Soon", "hungry", "warn", "Drop food in any reachable neighborhood; hungry fish will travel to it.");
  pushAggregate("dose-medicine", injuredFish, "Dose medicine", "Now", "healing", "warn", "Select a fish to jump to its current neighborhood.");
  pushAggregate("illness-care", diseasedFish, diseasedFish.length === 1 ? `${diseasedFish[0].fish.name} looks off-color.` : "Several fish look off-color.", "Care", "sick", "danger", "Select a fish to jump to its current neighborhood.");
  return tasks.length ? tasks : [{
    id: "all-clear",
    badge: "On Track",
    label: "Everything is on track",
    value: "All clear",
    note: "Hunger, health, comfort, and cleanup look good across the borough.",
    tone: "good"
  }];
}

function buildManagementSnapshotStat(label, value, tone = "") {
  const toneClass = tone ? ` management-tone-${tone}` : "";
  return `
    <article class="management-snapshot-stat${toneClass}">
      <span class="management-snapshot-label">${escapeHtml(label)}</span>
      <strong class="management-snapshot-value">${escapeHtml(String(value))}</strong>
    </article>
  `;
}

function getManagementCareTaskAction(task = {}) {
  const explicitTaskId = getCareTaskId(task);
  const taskId = explicitTaskId.includes(":") ? explicitTaskId.slice(explicitTaskId.lastIndexOf(":") + 1) : explicitTaskId;
  if (taskId === "stock-aquarium") {
    return "store-fish";
  }
  if (taskId === "feed-hungry-fish") {
    return "feed";
  }
  if (taskId === "dose-medicine" || taskId === "illness-care") {
    return "medicine";
  }
  if (taskId === "clean-tank") {
    return "clean";
  }
  if (taskId === "scoop-floor") {
    return "scoop";
  }
  return "";
}

function buildManagementCompactTaskRow(task = {}) {
  const toneClass = task.tone ? ` management-tone-${task.tone}` : "";
  const badgeLabel = task.badge || "Task";
  const rightValue = task.value ? `<span class="management-task-value">${escapeHtml(String(task.value))}</span>` : "";
  const action = getManagementCareTaskAction(task);
  const tagName = action ? "button" : "article";
  const actionAttributes = action
    ? ` type="button" data-management-care-action="${escapeHtml(action)}" title="Start ${escapeHtml(task.label || "this task")}"`
    : "";
  return `
    <${tagName} class="management-task-row${toneClass}${action ? " is-actionable" : ""}"${actionAttributes}>
      <span class="management-task-badge">${escapeHtml(badgeLabel)}</span>
      <span class="management-task-text">${escapeHtml(task.label || "")}</span>
      ${rightValue}
    </${tagName}>
  `;
}

function runManagementCareTaskAction(action, tankId = "", fishId = "") {
  if (tankId && state.activeTankId !== tankId) {
    setActiveTank(tankId, { announce: false, preserveHorizontalOverlays: true });
  }
  if (fishId && getTankContainingFish(fishId)?.id === state.activeTankId) {
    openFishInspector(fishId);
  }
  switch (String(action || "")) {
    case "focus":
      return Boolean(tankId || fishId);
    case "store-fish":
      openStoreOverlay("fish");
      return true;
    case "feed":
      closeUtilityOverlay();
      toggleFoodTray(true, { source: "management", collapseSidebar: true });
      return true;
    case "medicine":
      if (!hasStockedMedicine()) {
        openStoreOverlay("pharmacy");
        showToast("No medicine is stocked. Opening the pharmacy.");
        return true;
      }
      closeUtilityOverlay();
      toggleMedicineTray(true, { source: "management", collapseSidebar: true });
      return true;
    case "clean":
      closeUtilityOverlay();
      toggleCleaningMode({ source: "management", collapseSidebar: true });
      return true;
    case "scoop":
      closeUtilityOverlay();
      toggleScoopMode({ source: "management", collapseSidebar: true });
      return true;
    default:
      return false;
  }
}

function getCareTaskId(task = {}) {
  const explicitId = String(task.id || "").trim();
  if (explicitId) {
    return explicitId;
  }
  return [
    task.badge || "",
    task.label || "",
    task.value || ""
  ].map((part) => String(part).trim().toLowerCase()).join("|");
}

function cloneCareTask(task = {}) {
  return {
    id: getCareTaskId(task),
    badge: String(task.badge || ""),
    label: String(task.label || ""),
    value: String(task.value || ""),
    note: String(task.note || ""),
    tone: String(task.tone || ""),
    tankId: String(task.tankId || ""),
    fishId: String(task.fishId || ""),
    tankLabel: String(task.tankLabel || "")
  };
}

function resetCareTaskPaneRuntime(tasks = [], tankId = "") {
  runtime.careTaskPaneTankId = tankId;
  runtime.careTaskPaneInitialized = true;
  runtime.careTaskPaneActiveTasks = new Map(tasks.map((task) => [getCareTaskId(task), cloneCareTask(task)]));
  runtime.careTaskPaneCompletingTasks.clear();
  if (runtime.careTaskPaneCleanupHandle) {
    clearTimeout(runtime.careTaskPaneCleanupHandle);
    runtime.careTaskPaneCleanupHandle = null;
  }
}

function scheduleCareTaskPaneCleanup(now = Date.now()) {
  if (runtime.careTaskPaneCleanupHandle || runtime.careTaskPaneCompletingTasks.size === 0) {
    return;
  }

  const nextExpiry = Math.min(
    ...Array.from(runtime.careTaskPaneCompletingTasks.values())
      .map((entry) => Number(entry.completedAt) + CARE_TASK_COMPLETE_HOLD_MS)
      .filter(Number.isFinite)
  );
  if (!Number.isFinite(nextExpiry)) {
    return;
  }

  runtime.careTaskPaneCleanupHandle = setTimeout(() => {
    runtime.careTaskPaneCleanupHandle = null;
    renderUi(Date.now(), { full: false });
  }, Math.max(0, nextExpiry - now));
}

function syncCareTaskPaneTasks(tasks = [], now = Date.now()) {
  const tankId = "borough";
  const isOpen = getUiSettings().careTaskPaneOpen === true;
  if (!isOpen || runtime.careTaskPaneTankId !== tankId || !runtime.careTaskPaneInitialized) {
    resetCareTaskPaneRuntime(tasks, tankId);
    return;
  }

  const nextTaskMap = new Map(tasks.map((task) => [getCareTaskId(task), cloneCareTask(task)]));
  for (const [taskId, previousTask] of runtime.careTaskPaneActiveTasks.entries()) {
    if (taskId === "all-clear" || nextTaskMap.has(taskId) || runtime.careTaskPaneCompletingTasks.has(taskId)) {
      continue;
    }
    runtime.careTaskPaneCompletingTasks.set(taskId, {
      task: previousTask,
      completedAt: now
    });
  }

  for (const taskId of nextTaskMap.keys()) {
    runtime.careTaskPaneCompletingTasks.delete(taskId);
  }

  for (const [taskId, entry] of Array.from(runtime.careTaskPaneCompletingTasks.entries())) {
    if (now - Number(entry.completedAt) >= CARE_TASK_COMPLETE_HOLD_MS) {
      runtime.careTaskPaneCompletingTasks.delete(taskId);
    }
  }

  runtime.careTaskPaneActiveTasks = nextTaskMap;
  scheduleCareTaskPaneCleanup(now);
}

function buildCareTaskPaneRow(task = {}, options = {}) {
  const completed = options.completed === true;
  const toneClass = task.tone ? ` care-task-tone-${escapeHtml(task.tone)} management-tone-${escapeHtml(task.tone)}` : "";
  const label = String(task.label || "Task");
  const value = task.value ? `<span class="care-task-value">${escapeHtml(String(task.value))}</span>` : "";
  const badge = task.badge ? `<span class="care-task-badge">${escapeHtml(String(task.badge))}</span>` : "";
  const action = getManagementCareTaskAction(task) || (task.tankId || task.fishId ? "focus" : "");
  const tagName = !completed && action ? "button" : "article";
  const actionAttributes = !completed && action
    ? ` type="button" data-care-task-action="${escapeHtml(action)}" data-care-task-tank-id="${escapeHtml(task.tankId || "")}" data-care-task-fish-id="${escapeHtml(task.fishId || "")}" title="Go to ${escapeHtml(task.fishId ? label : task.tankLabel || "this task")}"`
    : "";
  return `
    <${tagName} class="care-task-row${toneClass}${completed ? " is-complete" : ""}${action ? " is-actionable" : ""}"${actionAttributes} style="--task-letter-count:${Math.max(1, label.length)}">
      <span class="care-task-box" aria-hidden="true"></span>
      <span class="care-task-label">
        <span class="care-task-text${task.fishId ? " care-task-fish-link" : ""}">${escapeHtml(label)}</span>
        <span class="care-task-strike" aria-hidden="true"></span>
      </span>
      ${value || badge ? `<span class="care-task-meta">${value}${badge}</span>` : ""}
    </${tagName}>
  `;
}

function renderCareTaskPane(now = Date.now()) {
  if (!dom.careTaskPane || !dom.careTaskList) {
    return;
  }

  const isOpen = getUiSettings().careTaskPaneOpen === true && !isIntroTutorialActive();
  dom.careTaskPane.hidden = !isOpen;
  if (!isOpen) {
    resetCareTaskPaneRuntime([], "borough");
    setMarkupIfChanged("care-task-pane-list", dom.careTaskList, "");
    return;
  }

  const tasks = buildUniversalManagementCareQueue(now);
  syncCareTaskPaneTasks(tasks, now);
  const completedRows = Array.from(runtime.careTaskPaneCompletingTasks.values())
    .sort((left, right) => Number(left.completedAt) - Number(right.completedAt))
    .map((entry) => buildCareTaskPaneRow(entry.task, { completed: true }));
  const noActiveTasks = tasks.length === 1 && getCareTaskId(tasks[0]) === "all-clear";
  const activeTasks = noActiveTasks
    ? []
    : tasks;
  const activeRows = activeTasks.map((task) => buildCareTaskPaneRow(task));
  const emptyMarkup = !completedRows.length && noActiveTasks
    ? `<div class="care-task-empty">No tasks to display</div>`
    : "";
  setMarkupIfChanged("care-task-pane-list", dom.careTaskList, [...completedRows, ...activeRows, emptyMarkup].join(""));
}

function setCareTaskPaneOpen(open) {
  if (!state) {
    return;
  }

  const currentSettings = getUiSettings();
  const nextSettings = sanitizeUiSettings({
    ...currentSettings,
    careTaskPaneOpen: Boolean(open)
  });
  if (currentSettings.careTaskPaneOpen === nextSettings.careTaskPaneOpen) {
    return;
  }

  state.uiSettings = nextSettings;
  saveState();
  renderUi(Date.now(), { full: false });
}

function toggleCareTaskPane() {
  setCareTaskPaneOpen(!getUiSettings().careTaskPaneOpen);
}

function normalizeManagementHubView(view) {
  return ["fish", "decor", "history", "milestones"].includes(view) ? view : "overview";
}

function getMilestoneIconPath(milestoneId) {
  const safeId = String(milestoneId || "milestone").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `assets/milestones/${safeId || "milestone"}_milestone_icon.png`;
}

function getMilestoneRequirementText(milestoneId) {
  const milestone = PROGRESSION_MILESTONES.find((entry) => entry.id === String(milestoneId || ""));
  return milestone?.requirement || "Complete the listed care goal.";
}

function averageProgressParts(parts) {
  const usableParts = (Array.isArray(parts) ? parts : []).filter((part) => part && Number.isFinite(Number(part.value)));
  if (!usableParts.length) {
    return 0;
  }
  return clamp(usableParts.reduce((total, part) => total + clamp(Number(part.value) || 0, 0, 1), 0) / usableParts.length, 0, 1);
}

function getMilestoneProgressInfo(milestone, stats = getMilestoneStats(null, Date.now()), now = Date.now()) {
  const unlocked = Boolean(state?.dailyBonus?.milestones?.[milestone.id]);
  if (unlocked) {
    return {
      value: 1,
      details: ["Complete"]
    };
  }

  const parts = typeof milestone?.progress === "function"
    ? milestone.progress(stats, now)
    : [];
  return {
    value: averageProgressParts(parts),
    details: (Array.isArray(parts) ? parts : []).map((part) => part?.label).filter(Boolean)
  };
}
function getMilestoneDecorUnlockName(decorKey) {
  const key = normalizeDecorKey(decorKey);
  if (key === "__custom-decor-shop__") {
    return "Custom Decor";
  }
  if (key === "__custom-hide-shop__") {
    return "Custom Hides";
  }
  return runtime.decorMap.get(key)?.name || titleFromFile(key);
}

function getMilestoneUnlockLabels(milestone) {
  const fishLabels = (Array.isArray(milestone.unlocks) ? milestone.unlocks : [])
    .map((speciesId) => runtime.fishMap.get(speciesId)?.name || titleFromFile(speciesId))
    .filter(Boolean);
  const decorLabels = (Array.isArray(milestone.decorUnlocks) ? milestone.decorUnlocks : [])
    .map((decorKey) => getMilestoneDecorUnlockName(decorKey))
    .filter(Boolean);
  return [...fishLabels, ...decorLabels];
}

function buildTankManagementMilestonesBrowser(now = Date.now()) {
  const stats = getMilestoneStats(null, now);
  const sortedMilestones = PROGRESSION_MILESTONES
    .map((milestone, index) => {
      const unlocked = Boolean(state?.dailyBonus?.milestones?.[milestone.id]);
      const progress = getMilestoneProgressInfo(milestone, stats, now);
      return {
        milestone,
        index,
        unlocked,
        progress,
        progressValue: unlocked ? 1 : clamp(Number(progress.value) || 0, 0, 1)
      };
    })
    .sort((left, right) => (
      Number(right.unlocked) - Number(left.unlocked)
      || right.progressValue - left.progressValue
      || left.index - right.index
    ));
  const milestoneRows = sortedMilestones.map(({ milestone, unlocked, progress }) => {
    const progressPercent = unlocked ? 100 : Math.round(clamp(progress.value, 0, 1) * 100);
    const unlockLabels = getMilestoneUnlockLabels(milestone);
    return `
      <article class="management-milestone-card ${unlocked ? "is-complete" : "is-locked"}">
        <img class="management-milestone-icon" src="${escapeHtml(getMilestoneIconPath(milestone.id))}" alt="${escapeHtml(`${milestone.label} medal`)}" />
        <div class="management-milestone-copy">
          <div class="management-milestone-topline">
            <strong>${escapeHtml(milestone.label)}</strong>
            <span class="management-status-pill management-tone-${unlocked ? "good" : "neutral"}">${unlocked ? "Unlocked" : `${progressPercent}%`}</span>
          </div>
          <div class="management-milestone-requirement">${escapeHtml(getMilestoneRequirementText(milestone.id))}</div>
          ${unlocked ? "" : `
            <div class="management-progress-track" aria-label="${escapeHtml(`${milestone.label} progress ${progressPercent}%`)}">
              <span style="width: ${progressPercent}%"></span>
            </div>
          `}
          <div class="management-milestone-detail-list">
            ${progress.details.map((detail) => `<span>${escapeHtml(detail)}</span>`).join("")}
          </div>
          <div class="management-milestone-rewards">
            <span>${escapeHtml(`${milestone.reward} coin reward`)}</span>
            ${unlockLabels.length ? `<span>${escapeHtml(`Unlocks: ${unlockLabels.join(", ")}`)}</span>` : ""}
          </div>
        </div>
      </article>
    `;
  }).join("");

  return buildManagementBrowserShell(
    "Milestones",
    PROGRESSION_MILESTONES.length,
    milestoneRows,
    {
      emptyCopy: "No milestones are configured yet.",
      className: "management-milestones-browser"
    }
  );
}

function getManagementHistoryFilters() {
  const source = runtime.managementHistoryFilters && typeof runtime.managementHistoryFilters === "object"
    ? runtime.managementHistoryFilters
    : {};
  return {
    eventType: String(source.eventType || ""),
    fishType: String(source.fishType || ""),
    fishName: String(source.fishName || ""),
    decorType: String(source.decorType || ""),
    decorKey: String(source.decorKey || "")
  };
}

function resetManagementHistoryFilters() {
  runtime.managementHistoryFilters = {
    eventType: "",
    fishType: "",
    fishName: "",
    decorType: "",
    decorKey: ""
  };
}

function getHistoryEventType(event) {
  const rawType = String(event?.type || "").toLowerCase();
  const text = String(event?.text || "").toLowerCase();
  if (/daily_recap|recap/.test(rawType) || /daily recap/.test(text)) {
    return "daily_recap";
  }
  if (/unlock|milestone/.test(rawType) || /unlocked|milestone/.test(text)) {
    return "unlock";
  }
  if (/behavior|routine|observe/.test(rawType)) {
    return "behavior";
  }
  if (/illness|disease|symptom/.test(rawType)) {
    return "illness";
  }
  if (/feed|food|meal|ate|hungry|chum/.test(rawType) || / ate |meal|food|hungry|chum/.test(text)) {
    return "feeding";
  }
  if (/comfort|conflict|stress|glass_tap/.test(rawType) || /comfort|stressed|startled|uneasy|popular/.test(text)) {
    return "comfort";
  }
  if (/clean|waste|medicine|health|death|died|care/.test(rawType) || /clean|waste|medicine|health|died|dead fish|scoop/.test(text)) {
    return "care";
  }
  if (/decor|bubbler|cave/.test(rawType) || /decor|bubbler|cave|plant|rock|wood|castle|ship|plane|chest/.test(text)) {
    return "decor";
  }
  if (/coin|sell|buy|purchase|economy/.test(rawType) || /coin|sold|bought|purchased|earned/.test(text)) {
    return "economy";
  }
  if (/tank|aquarium/.test(rawType) || /tank|aquarium/.test(text)) {
    return "tank";
  }
  if (/debug/.test(rawType) || /debug/.test(text)) {
    return "debug";
  }
  if (/fish|added|stored|returned|gravel/.test(rawType) || /fish|added|put away|returned|gravel/.test(text)) {
    return "fish";
  }
  return "other";
}

function getHistoryEventTypeLabel(type) {
  switch (String(type || "")) {
    case "daily_recap":
      return "Daily Recap";
    case "behavior":
      return "Behavior";
    case "illness":
      return "Illness";
    case "feeding":
      return "Feeding";
    case "comfort":
      return "Comfort";
    case "care":
      return "Care";
    case "decor":
      return "Decor";
    case "economy":
      return "Economy";
    case "tank":
      return "Tank";
    case "debug":
      return "Debug";
    case "unlock":
      return "Unlocks";
    case "fish":
      return "Fish";
    default:
      return "Other";
  }
}

function getHistoryKnownFish() {
  const fishList = [
    ...getAllTankFish(state),
    ...(Array.isArray(state.storedFish) ? state.storedFish : [])
  ].filter(Boolean);
  const byId = new Map();
  for (const fish of fishList) {
    if (fish.id && !byId.has(fish.id)) {
      byId.set(fish.id, fish);
    }
  }
  return {
    fishList,
    byId
  };
}

function textContainsLoose(text, needle) {
  const haystack = String(text || "").toLowerCase();
  const target = String(needle || "").toLowerCase().trim();
  return Boolean(target && haystack.includes(target));
}

function getHistoryMatchingDecor(eventOrText) {
  const event = eventOrText && typeof eventOrText === "object" ? eventOrText : null;
  const text = event ? String(event.text || "") : String(eventOrText || "");
  const explicitKeys = new Set();
  if (event?.decorKey) {
    explicitKeys.add(normalizeDecorKey(event.decorKey));
  }
  if (event?.placedDecorId) {
    for (const item of getAllPlacedDecor(state)) {
      if (item?.id === event.placedDecorId && item.decorKey) {
        explicitKeys.add(normalizeDecorKey(item.decorKey));
      }
    }
  }
  return runtime.decorCatalog.filter((decor) => (
    decor
    && (
      explicitKeys.has(normalizeDecorKey(decor.key))
      || textContainsLoose(text, decor.name)
      || textContainsLoose(text, titleFromFile(decor.key))
      || textContainsLoose(text, decor.key)
    )
  ));
}

function getDecorCategoryLabel(category) {
  switch (String(category || "").toLowerCase()) {
    case "caves":
      return "Caves";
    case "plants":
      return "Plants";
    case "ornaments":
      return "Ornaments";
    case "bubbler":
      return "Bubblers";
    case "custom":
      return "Custom";
    default:
      return titleFromFile(category);
  }
}

function getAllManagementHistoryRecords() {
  const tanks = getAllTanks(state);
  const knownFish = getHistoryKnownFish();
  return tanks.flatMap((tank, index) => {
    const tankEvents = Array.isArray(tank?.events) ? tank.events : [];
    return tankEvents.map((event) => {
      const fish = event?.fishId ? knownFish.byId.get(event.fishId) : null;
      const species = fish ? getSpeciesForFish(fish) : null;
      const matchingDecor = getHistoryMatchingDecor(event);
      const decorCategories = new Set();
      for (const decor of matchingDecor) {
        for (const category of deriveDecorCategories(decor, decor.key)) {
          decorCategories.add(category);
        }
      }
      return {
        ...event,
        tankId: tank.id,
        tankLabel: getTankLabel(tank, index),
        eventType: getHistoryEventType(event),
        fish,
        species,
        decorMatches: matchingDecor,
        decorCategories: [...decorCategories]
      };
    });
  }).sort((left, right) => (Number(right.time) || 0) - (Number(left.time) || 0));
}

function recordMatchesManagementHistoryFilters(record, filters, knownFish) {
  const text = String(record?.text || "");
  if (filters.eventType && record.eventType !== filters.eventType) {
    return false;
  }
  if (filters.fishType) {
    const species = record.species || (record.fish ? getSpeciesForFish(record.fish) : null);
    const selectedSpecies = runtime.fishMap.get(filters.fishType);
    const speciesMatches = record.species?.id === filters.fishType
      || textContainsLoose(text, selectedSpecies?.name)
      || textContainsLoose(text, titleFromFile(filters.fishType));
    if (!speciesMatches && species?.id !== filters.fishType) {
      return false;
    }
  }
  if (filters.fishName) {
    const fishName = String(record.fish?.name || "");
    if (fishName !== filters.fishName && !textContainsLoose(text, filters.fishName)) {
      return false;
    }
  }
  if (filters.decorType && !record.decorCategories.includes(filters.decorType) && !textContainsLoose(text, getDecorCategoryLabel(filters.decorType))) {
    return false;
  }
  if (filters.decorKey) {
    const selectedDecor = runtime.decorMap.get(filters.decorKey);
    const decorMatches = record.decorMatches.some((decor) => decor.key === filters.decorKey)
      || textContainsLoose(text, selectedDecor?.name)
      || textContainsLoose(text, titleFromFile(filters.decorKey));
    if (!decorMatches) {
      return false;
    }
  }
  return true;
}

function buildManagementHistoryFilterOptions(records, knownFish) {
  const eventTypes = new Set();
  const fishTypes = new Map();
  const fishNames = new Set();
  const decorTypes = new Set();
  const decorKeys = new Map();

  for (const record of records) {
    eventTypes.add(record.eventType);
    if (record.species?.id) {
      fishTypes.set(record.species.id, record.species.name || titleFromFile(record.species.id));
    }
    if (record.fish?.name) {
      fishNames.add(record.fish.name);
    }
    for (const decor of record.decorMatches) {
      decorKeys.set(decor.key, decor.name || titleFromFile(decor.key));
      for (const category of deriveDecorCategories(decor, decor.key)) {
        decorTypes.add(category);
      }
    }
  }

  for (const fish of knownFish.fishList) {
    const species = getSpeciesForFish(fish);
    if (species?.id) {
      fishTypes.set(species.id, species.name || titleFromFile(species.id));
    }
    if (fish.name) {
      fishNames.add(fish.name);
    }
  }

  return {
    eventTypes: [...eventTypes].sort((left, right) => getHistoryEventTypeLabel(left).localeCompare(getHistoryEventTypeLabel(right))),
    fishTypes: [...fishTypes.entries()].sort((left, right) => left[1].localeCompare(right[1])),
    fishNames: [...fishNames].sort((left, right) => left.localeCompare(right)),
    decorTypes: [...decorTypes].sort((left, right) => getDecorCategoryLabel(left).localeCompare(getDecorCategoryLabel(right))),
    decorKeys: [...decorKeys.entries()].sort((left, right) => left[1].localeCompare(right[1]))
  };
}

function buildManagementHistorySelect(label, key, value, options, getLabel = (entry) => String(entry)) {
  const rows = (Array.isArray(options) ? options : []).map((entry) => {
    const optionValue = Array.isArray(entry) ? entry[0] : entry;
    const optionLabel = Array.isArray(entry) ? entry[1] : getLabel(entry);
    return `<option value="${escapeHtml(optionValue)}" ${String(value) === String(optionValue) ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
  }).join("");
  return `
    <label class="management-history-filter">
      <span>${escapeHtml(label)}</span>
      <select data-management-history-filter="${escapeHtml(key)}">
        <option value="">All</option>
        ${rows}
      </select>
    </label>
  `;
}

function buildManagementHistoryRecordRow(record) {
  return `
    <article class="management-event-row management-history-record">
      <span class="management-event-time-pill">${escapeHtml(timeAgo(record.time))}</span>
      <div class="management-event-text">
        <strong>${escapeHtml(record.tankLabel)}</strong>
        <span>${escapeHtml(record.text)}</span>
        <small>${escapeHtml(getHistoryEventTypeLabel(record.eventType))}</small>
      </div>
    </article>
  `;
}

function buildTankManagementHistoryBrowser() {
  const records = getAllManagementHistoryRecords();
  const knownFish = getHistoryKnownFish();
  const filters = getManagementHistoryFilters();
  const options = buildManagementHistoryFilterOptions(records, knownFish);
  const filteredRecords = records.filter((record) => recordMatchesManagementHistoryFilters(record, filters, knownFish));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const filterMarkup = `
    <div class="management-history-filters">
      ${buildManagementHistorySelect("Event Type", "eventType", filters.eventType, options.eventTypes, getHistoryEventTypeLabel)}
      ${buildManagementHistorySelect("Fish Type", "fishType", filters.fishType, options.fishTypes)}
      ${buildManagementHistorySelect("Fish Name", "fishName", filters.fishName, options.fishNames)}
      ${buildManagementHistorySelect("Decor Type", "decorType", filters.decorType, options.decorTypes, getDecorCategoryLabel)}
      ${buildManagementHistorySelect("Specific Decor", "decorKey", filters.decorKey, options.decorKeys)}
      <button class="small-button alt" type="button" data-management-history-reset ${activeFilterCount ? "" : "disabled"}>Reset</button>
    </div>
  `;
  const listMarkup = filteredRecords.length
    ? filteredRecords.map((record) => buildManagementHistoryRecordRow(record)).join("")
    : `<div class="empty-state management-history-empty">No history matches those filters.</div>`;

  return buildManagementBrowserShell(
    "History",
    filteredRecords.length,
    `${buildMemorialHistoryMarkup()}${filterMarkup}<div class="management-event-feed management-history-full-list">${listMarkup}</div>`,
    {
      emptyCopy: "Nothing has happened yet.",
      className: "management-history-browser",
      countSuffix: records.length === filteredRecords.length ? "" : ` of ${records.length}`,
      alwaysShowList: true
    }
  );
}

function buyAnotherFishFromManagement(fishId) {
  openFishBuyAnotherConfirmation(fishId);
}

function selectFishInTankFromManagement(fishId) {
  const managed = getManagedFishById(fishId);
  if (!managed || managed.inStorage || isFishDead(managed.fish)) {
    return;
  }

  closeUtilityOverlay();
  openFishActionMenu(fishId);
}

function selectDecorInTankFromManagement(placedId) {
  const item = getPlacedDecorById(placedId);
  if (!item) {
    return;
  }

  closeUtilityOverlay();
  toggleEditTankMode(true, { source: "management", collapseSidebar: true });
  setSelectedDecor(item.id);
  renderUi(Date.now());
}

function buildManagementBrowserShell(title, count, listMarkup, options = {}) {
  const emptyCopy = typeof options.emptyCopy === "string" ? options.emptyCopy : "";
  const className = typeof options.className === "string" && options.className.trim() ? ` ${options.className.trim()}` : "";
  const countSuffix = typeof options.countSuffix === "string" ? options.countSuffix : "";
  const showList = count || options.alwaysShowList === true;
  const scrollTargetId = `tank-management-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "list"}`;

  return `
    <section class="settings-section management-browser${className}">
      <div class="management-browser-head">
        <button class="small-button icon-only alt management-browser-back" type="button" data-management-view="overview" aria-label="Back to tank info">&#8592;</button>
        <h3>${escapeHtml(`${title} (${count}${countSuffix})`)}</h3>
      </div>
      ${showList
      ? `
          <div class="wallpaper-scroll-shell management-browser-scroll-shell">
            <div class="management-browser-list" data-wallpaper-scroll-target="${escapeHtml(scrollTargetId)}">${listMarkup}</div>
            ${getWallpaperScrollControlMarkup(scrollTargetId, title)}
          </div>
        `
      : `
          <div class="empty-state management-browser-empty">
            <div>${escapeHtml(emptyCopy)}</div>
          </div>
        `}
    </section>
  `;
}

function buildManagementFishRow(fish, now = Date.now()) {
  const species = getSpeciesForFish(fish);
  if (!species) {
    return "";
  }

  const baseSpecies = getBaseSpeciesForFish(fish) || species;
  const dead = isFishDead(fish);
  const juvenile = !dead && isFishJuvenile(fish, now);
  const infected = !dead && hasZombieBiteInfection(fish);
  const maxHealthUnits = getFishMaxHealthUnits(fish, species);
  const fishAsset = getFishDisplayAssetPath(fish, species, now) || species.fallbackAsset || species.asset;
  const resaleValue = getResaleValue(baseSpecies?.cost || 0);
  const purchaseCost = getFishPurchaseCost(fish.speciesId);
  const canBuyAnother = isCustomFishAssetKey(fish.speciesId) || isFishSpeciesShopUnlocked(baseSpecies);
  const canSell = Boolean(baseSpecies) && !dead && !isFishBeingConsumedByPiranhas(fish, now) && !juvenile;
  const canStore = !dead && !infected;
  const status = dead
    ? getFishCorpseStateLabel(fish, now)
    : infected
      ? "Infected"
      : juvenile
        ? "Growing"
        : fish.healthUnits < maxHealthUnits
          ? `${fish.healthUnits}/${maxHealthUnits} health`
          : "Healthy";

  return `
    <article class="management-browser-item">
      <img class="management-browser-thumb management-browser-thumb-fish" src="${escapeHtml(fishAsset)}" alt="${escapeHtml(fish.name)}" />
      <div class="management-browser-copy">
        <strong>${escapeHtml(fish.name)}</strong>
        <span>${escapeHtml(getFishDisplaySpeciesName(fish, species))}</span>
        <small>${escapeHtml(status)}</small>
      </div>
      <div class="management-browser-actions">
        <button class="small-button alt" type="button" data-management-select-fish="${escapeHtml(fish.id)}">Select</button>
        <button class="small-button alt" type="button" data-management-store-fish="${escapeHtml(fish.id)}" ${canStore ? "" : "disabled"}>Put Away</button>
        <button class="small-button alt" type="button" data-management-buy-another-fish="${escapeHtml(fish.id)}" ${(canBuyAnother && state.coins >= purchaseCost) ? "" : "disabled"}>Buy Another</button>
        <button class="small-button warn" type="button" data-management-sell-fish="${escapeHtml(fish.id)}" ${canSell ? "" : "disabled"}>Sell</button>
      </div>
    </article>
  `;
}

function buildTankManagementFishBrowser(now = Date.now()) {
  const fishList = [...(Array.isArray(state.fish) ? state.fish : [])]
    .sort((left, right) => {
      const deadDelta = Number(isFishDead(left)) - Number(isFishDead(right));
      if (deadDelta) {
        return deadDelta;
      }
      return String(left?.name || "").localeCompare(String(right?.name || ""));
    });

  return buildManagementBrowserShell(
    "Fish",
    fishList.length,
    fishList.map((fish) => buildManagementFishRow(fish, now)).join(""),
    {
      emptyCopy: "This tank has no fish yet."
    }
  );
}

function buildManagementDecorRow(item) {
  const decor = runtime.decorMap.get(item.decorKey) || {
    name: titleFromFile(item.decorKey),
    path: resolveAppUrl(`assets/decor/${encodeURIComponent(item.decorKey)}`)
  };
  const grouped = isPlacedDecorGrouped(item);
  const cost = getDecorPurchaseCost(item.decorKey);
  const resaleValue = getResaleValue(decor?.cost || 0);
  const canBuyAnother = canUseDecorWithCurrentContentSettings(item.decorKey);
  const serviceTypes = getDecorBoroughServiceTypes(item);
  const serviceSeatStatus = serviceTypes.length
    ? `Seats ${getDecorBoroughServiceSeatUsage(item)}/${getDecorBoroughServiceSeats(item).length}`
    : (grouped ? "Grouped decor" : "Placed in tank");

  return `
    <article class="management-browser-item">
      <img class="management-browser-thumb management-browser-thumb-decor" src="${escapeHtml(getDecorThumbnailPath(decor))}" alt="${escapeHtml(decor.name)}"${isDecorHorizontallyFlipped(item) || isDecorVerticallyFlipped(item) ? ` style="transform: scale(${isDecorHorizontallyFlipped(item) ? -1 : 1}, ${isDecorVerticallyFlipped(item) ? -1 : 1});"` : ""} />
      <div class="management-browser-copy">
        <strong>${escapeHtml(decor.name)}</strong>
        <span>${escapeHtml(`Layer ${getDecorTankLayer(item)} / ${formatDecorScale(item.scale)}`)}</span>
        <small>${escapeHtml(serviceSeatStatus)}</small>
      </div>
      <div class="management-browser-actions">
        <button class="small-button alt" type="button" data-management-select-decor="${escapeHtml(item.id)}">Select</button>
        <button class="small-button alt" type="button" data-management-store-decor="${escapeHtml(item.id)}" ${grouped ? "disabled" : ""}>Put Away</button>
        <button class="small-button alt" type="button" data-management-buy-another-decor="${escapeHtml(item.decorKey)}" ${(canBuyAnother && state.coins >= cost) ? "" : "disabled"}>Buy Another</button>
        <button class="small-button warn" type="button" data-management-sell-decor="${escapeHtml(item.id)}" ${grouped ? "disabled" : ""}>Sell</button>
      </div>
    </article>
  `;
}

function buildTankManagementDecorBrowser() {
  const decorItems = [...(Array.isArray(state.placedDecor) ? state.placedDecor : [])]
    .sort((left, right) => {
      const leftName = runtime.decorMap.get(left?.decorKey)?.name || titleFromFile(left?.decorKey || "");
      const rightName = runtime.decorMap.get(right?.decorKey)?.name || titleFromFile(right?.decorKey || "");
      return leftName.localeCompare(rightName);
    });

  return buildManagementBrowserShell(
    "Decor",
    decorItems.length,
    decorItems.map((item) => buildManagementDecorRow(item)).join(""),
    {
      emptyCopy: "This tank has no decor placed yet."
    }
  );
}

function getManagementHubStats(now = Date.now()) {
  const tank = getCurrentTank();
  const tankFish = Array.isArray(state.fish) ? state.fish : [];
  const storedFishList = Array.isArray(state.storedFish) ? state.storedFish : [];
  const placedDecorList = Array.isArray(state.placedDecor) ? state.placedDecor : [];
  const livingFish = tankFish.filter((fish) => !isFishDead(fish)).length;
  const storedFish = storedFishList.filter((fish) => !isFishDead(fish)).length;
  const deadFish = [...tankFish, ...storedFishList].filter((fish) => isFishDead(fish)).length;
  const injuredFish = tankFish.filter((fish) => !isFishDead(fish) && fish.healthUnits < getFishMaxHealthUnits(fish)).length;
  const placedDecor = placedDecorList.length;
  const storedDecor = Object.values(state.decorInventory || {}).reduce((total, count) => total + Math.max(0, Math.floor(Number(count) || 0)), 0);
  const dirtiness = getTankDirtiness(now);
  const cleanPercent = Math.round((1 - dirtiness) * 100);
  const maxDirtyInMs = Math.max(0, (1 - dirtiness) * getFilterMaxDirtyDurationMs());
  const grimeLoad = Math.round((getTankFishDirtinessMultiplier() - 1) * 100);
  const filterLabel = ENABLE_FILTER ? (runtime.filterMap.get(state.selectedFilterAsset)?.name || "Basic Filter") : "None";
  const feedingCareCoins = getLivingTankFish().reduce((total, fish) => (
    total + (isMealFreeFish(fish) ? 0 : (getSpeciesForFish(fish)?.mealCoins || 0))
  ), 0);
  const hungryFish = getHungryFishByNeeds(tank, now, FISH_HUNGER_LOW_THRESHOLD).length;
  const starvingFish = getHungryFishByNeeds(tank, now, FISH_HUNGER_CRITICAL_THRESHOLD).length;
  const hungerStable = hungryFish <= 0;
  const mealStatus = !livingFish
    ? "No fish yet"
    : starvingFish > 0
      ? `${starvingFish} starving`
      : hungryFish > 0
        ? `${hungryFish} hungry`
        : "Fed";
  const mealNote = hungryFish > 0
    ? "Drop food in this neighborhood. Food structures will provide later borough automation."
    : "Hunger is stable.";

  return {
    cleanPercent,
    coinsPerMeal: feedingCareCoins,
    currentMealServed: hungerStable,
    deadFish,
    filterLabel,
    grimeLoad,
    hungryFish,
    starvingFish,
    injuredFish,
    livingFish,
    maxDirtyIn: maxDirtyInMs > 0 ? formatDuration(maxDirtyInMs) : "Now",
    mealNote,
    mealStatus,
    now,
    placedDecor,
    storedDecor,
    storedFish,
    tank,
    wasteCount: state.poops.length,
    pendingWasteCount: state.pendingPoops.length
  };
}

function buildTankManagementOverlayBody(now = Date.now()) {
  const tank = getCurrentTank();
  if (!tank) {
    return `<div class="empty-state">No aquarium is selected.</div>`;
  }

  const managementView = normalizeManagementHubView(runtime.managementHubView);
  if (managementView === "fish") {
    return buildTankManagementFishBrowser(now);
  }
  if (managementView === "decor") {
    return buildTankManagementDecorBrowser();
  }
  if (managementView === "history") {
    return buildTankManagementHistoryBrowser();
  }
  if (managementView === "milestones") {
    return buildTankManagementMilestonesBrowser(now);
  }

  const stats = getManagementHubStats(now);
  const careQueue = buildManagementCareQueue(stats);
  const cleanlinessTone = stats.cleanPercent <= 20 ? "danger" : stats.cleanPercent <= 45 ? "warn" : "good";
  const mealsTone = !stats.livingFish ? "neutral" : stats.hungryFish > 0 ? "warn" : stats.currentMealServed ? "good" : "neutral";
  const healthTone = stats.deadFish > 0 ? "danger" : stats.injuredFish > 0 ? "warn" : stats.livingFish ? "good" : "neutral";
  const healthValue = stats.deadFish > 0
    ? `${stats.deadFish} lost`
    : stats.injuredFish > 0
      ? `${stats.injuredFish} healing`
      : stats.livingFish
        ? "Stable"
        : "No fish";
  const wasteValue = stats.wasteCount > 0
    ? stats.wasteCount
    : stats.pendingWasteCount > 0
      ? `${stats.pendingWasteCount} pending`
      : 0;

  return `
    <div class="management-hub">
      <section class="settings-section management-summary-panel">
        ${buildTankManagementCardMarkup(tank, { variant: "overlay", stats })}
      </section>

      <section class="settings-section management-care-panel">
        <div class="compact-heading management-care-heading">
          <h3>Care Snapshot</h3>
          <button class="small-button alt" type="button" data-toggle-care-task-pane>
            ${getUiSettings().careTaskPaneOpen === true ? "Hide Pinned Tasks" : "Pin Tasks"}
          </button>
        </div>
        <div class="management-care-body">
          <div class="management-snapshot-stats">
            ${buildManagementSnapshotStat("Hunger", stats.mealStatus, mealsTone)}
            ${buildManagementSnapshotStat("Health", healthValue, healthTone)}
            ${buildManagementSnapshotStat("Cleanliness", `${stats.cleanPercent}%`, cleanlinessTone)}
            ${buildManagementSnapshotStat("Waste", wasteValue, stats.wasteCount > 0 ? "warn" : stats.pendingWasteCount > 0 ? "neutral" : "")}
          </div>
          <div class="management-task-stack">
            <div class="management-task-heading">Suggested Tasks</div>
            <div class="management-task-list">
              ${careQueue.map((task) => buildManagementCompactTaskRow(task)).join("")}
            </div>
          </div>
        </div>
      </section>

      <section class="settings-section management-happenings-panel">
        <div class="compact-heading">
          <h3>Borough Happenings</h3>
          <p>Real moments from around the aquarium.</p>
        </div>
        ${buildBoroughHappeningsFeedMarkup(5)}
      </section>

      <section class="settings-section management-records-panel">
        <div class="compact-heading">
          <h3>Records</h3>
        </div>
        <div class="management-record-button-grid">
          <button class="management-record-button" type="button" data-management-view="milestones">
            <strong>Milestones</strong>
            <span>See unlock goals, progress, rewards, and medals.</span>
          </button>
          <button class="management-record-button" type="button" data-management-view="history">
            <strong>History</strong>
            <span>Review saved events across every aquarium.</span>
          </button>
        </div>
      </section>
    </div>
  `;
}

function buildDefaultUtilityOverlayConfig() {
  return {
    kicker: "Tank Tools",
    title: "Details",
    body: "",
    footer: "",
    closable: true
  };
}

function buildUtilityActionButtonMarkup(action = {}) {
  const variantClass = action.variant ? ` ${action.variant}` : "";
  const attributes = [];
  const attribute = String(action.attribute || "").trim();
  if (attribute) {
    attributes.push(attribute);
  }
  if (Array.isArray(action.attributes)) {
    attributes.push(...action.attributes.filter(Boolean));
  }
  if (action.disabled) {
    attributes.push("disabled");
  }
  const attributeMarkup = attributes.length ? ` ${attributes.join(" ")}` : "";
  return `<button class="small-button${variantClass}"${attributeMarkup}>${escapeHtml(action.label || "Okay")}</button>`;
}

function buildUtilityActionsFooter(actions = []) {
  const buttons = (Array.isArray(actions) ? actions : [])
    .map((action) => buildUtilityActionButtonMarkup(action))
    .join("");
  return buttons ? `<div class="utility-confirm-actions">${buttons}</div>` : "";
}

function buildUtilityCloseFooter(label = "Close", variant = "alt") {
  return buildUtilityActionsFooter([
    { label, variant, attribute: "data-close-utility" }
  ]);
}

function buildUtilityConfirmCardMarkup(options = {}) {
  const classes = ["utility-confirm-card", String(options.cardClass || "").trim()].filter(Boolean).join(" ");
  const headline = String(options.headline || "").trim();
  const detail = String(options.detail || "").trim();
  const extraMarkup = String(options.extraMarkup || "");
  return `
    <div class="${classes}">
      <div class="utility-confirm-copy">
        ${headline ? `<strong>${headline}</strong>` : ""}
        ${detail ? `<div class="fish-meta">${detail}</div>` : ""}
      </div>
      ${extraMarkup}
    </div>
  `;
}

function createPendingStateUtilityMode(options = {}) {
  const {
    pendingStateKey: rawPendingStateKey,
    onClose: onCloseOption,
    exclusive,
    ...modeDef
  } = options;
  const pendingStateKey = String(rawPendingStateKey || "").trim();
  const onClose = typeof onCloseOption === "function" ? onCloseOption : null;
  return {
    ...modeDef,
    exclusive: exclusive !== false,
    preservePendingState: pendingStateKey ? [pendingStateKey] : modeDef.preservePendingState,
    onClose: () => {
      if (pendingStateKey) {
        runtime[pendingStateKey] = null;
      }
      onClose?.();
    }
  };
}

function createPlacedDecorUtilityMode(options = {}) {
  const runtimeKey = String(options.runtimeKey || "").trim();
  return {
    id: options.id,
    exclusive: true,
    onClose: () => {
      if (runtimeKey) {
        runtime[runtimeKey] = null;
      }
      options.onClose?.();
    },
    render: () => {
      const item = options.getItem?.() || null;
      const decor = item ? runtime.decorMap.get(item.decorKey) : null;
      return {
        kicker: String(options.kicker || "Decor"),
        title: decor?.name || options.fallbackTitle || "Decor Settings",
        body: options.renderBody(item),
        footer: buildUtilityCloseFooter(options.footerLabel || "Done", "alt"),
        closable: true
      };
    },
    ...DECOR_SETTINGS_UTILITY_MODE_HANDLERS,
    ...(options.handlers || {})
  };
}

function renderTutorialSkipConfirmUtilityOverlay() {
  const replayMode = isInfoOnlyTutorialActive();
  return {
    kicker: "Tutorial",
    title: "Skip Tutorial?",
    body: buildUtilityConfirmCardMarkup({
      headline: "Are you sure?",
      detail: replayMode
        ? "Skipping exits the replay tutorial right away."
        : `Skipping restores the full toolbar${DIGITAL_DISPLAY_ENABLED ? " and digital display" : ""} right away.`
    }),
    footer: buildUtilityActionsFooter([
      { label: "Yes", variant: "warn", attribute: "data-confirm-tutorial-skip" },
      { label: "No", variant: "alt", attribute: "data-cancel-tutorial-skip" }
    ])
  };
}

function renderHardwareAccelerationUtilityOverlay() {
  const issue = runtime.hardwareAccelerationIssue;
  const reason = String(issue?.reason || "first-visit");
  const rendererText = issue?.renderer
    ? `<div class="external-link-url">${escapeHtml(issue.renderer)}</div>`
    : "";
  const detailText = reason === "webgl-unavailable"
    ? "WebGL is unavailable in this browser session, which usually means hardware acceleration is off or blocked."
    : reason === "software-renderer"
      ? "This browser appears to be using a software renderer for graphics work."
      : "Before you start playing, make sure browser hardware acceleration is enabled for the smoothest aquarium experience.";
  return {
    kicker: false,
    title: "Enable Hardware Acceleration",
    body: `
      <div class="utility-confirm-card external-link-card hardware-acceleration-card">
        <div class="utility-confirm-copy">
          <strong>Bubble Borough runs best with browser hardware acceleration enabled.</strong>
          <div class="fish-meta">${detailText}</div>
          <div class="fish-meta">If the aquarium looks blank, stutters, or feels unusually slow, enable hardware acceleration and fully restart the browser.</div>
          <div class="hardware-acceleration-instructions">
            <details class="hardware-acceleration-details" name="hardware-acceleration-browser" open>
              <summary>Chrome / Edge</summary>
              <ol>
                <li>Open Settings.</li>
                <li>Go to System.</li>
                <li>Enable Use hardware acceleration when available.</li>
                <li>Fully restart the browser.</li>
              </ol>
            </details>
            <details class="hardware-acceleration-details" name="hardware-acceleration-browser">
              <summary>Firefox</summary>
              <ol>
                <li>Open Settings.</li>
                <li>Go to General, then Performance.</li>
                <li>Use recommended performance settings, or enable hardware acceleration when available.</li>
                <li>Fully restart the browser.</li>
              </ol>
            </details>
            <details class="hardware-acceleration-details" name="hardware-acceleration-browser">
              <summary>Safari</summary>
              <ol>
                <li>Safari uses hardware acceleration automatically when it is available.</li>
                <li>Keep Safari and macOS updated.</li>
                <li>If the aquarium still looks wrong, try Chrome or Edge with hardware acceleration enabled.</li>
              </ol>
            </details>
          </div>
        </div>
        ${rendererText}
      </div>
    `,
    footer: `
      <label class="hardware-acceleration-dismiss-row">
        <input class="settings-checkbox" type="checkbox" data-hardware-acceleration-dont-show />
        <span>Don't show this again</span>
      </label>
      <div class="utility-confirm-actions">
        <button class="small-button" data-acknowledge-hardware-acceleration-notice>Continue</button>
      </div>
    `,
    closable: false
  };
}

function handleHardwareAccelerationUtilityOverlayBodyClick(ctx, target) {
  const summary = target?.closest?.(".hardware-acceleration-details > summary");
  if (!summary) {
    return false;
  }

  const selectedDetails = summary.closest(".hardware-acceleration-details");
  if (!(selectedDetails instanceof HTMLDetailsElement)) {
    return false;
  }

  window.requestAnimationFrame(() => {
    if (!selectedDetails.open) {
      return;
    }

    for (const details of dom.utilityOverlayBody?.querySelectorAll(".hardware-acceleration-details") || []) {
      if (details !== selectedDetails && details instanceof HTMLDetailsElement) {
        details.open = false;
      }
    }
  });
  return true;
}

function renderDispenserResetUtilityOverlay() {
  const pelletCount = getAutoDispenserLoadedCount(state.autoDispenser);
  return {
    kicker: "Pellet Dispenser",
    title: "Reset Dispenser",
    body: pelletCount > 0
      ? buildUtilityConfirmCardMarkup({
        headline: "Return stored pellets?",
        detail: `Are you sure you want to put the dispenser's ${pelletCount} pellet${pelletCount === 1 ? "" : "s"} back into your food inventory?`
      })
      : `<div class="empty-state">The pellet dispenser is already empty.</div>`,
    footer: pelletCount > 0
      ? buildUtilityActionsFooter([
        { label: "Yes", attribute: "data-confirm-dispenser-reset" },
        { label: "No", variant: "alt", attribute: "data-close-utility" }
      ])
      : buildUtilityCloseFooter("Close")
  };
}

function renderCreditsUtilityOverlay() {
  return {
    kicker: "Credits",
    title: "Bubble Borough",
    body: `
      <div class="utility-confirm-card credits-card">
        <div class="credits-list">
          <div class="credits-row">
            <strong>Created and directed by</strong>
            <span>Nathan Arcuri.</span>
          </div>
          <div class="credits-row">
            <strong>Game design and code</strong>
            <span>Nathan Arcuri, made with OpenAI Codex assistance.</span>
          </div>
          <div class="credits-row">
            <strong>Artwork</strong>
            <span>Generated with ChatGPT and edited in Photopea by Nathan Arcuri.</span>
          </div>
          <div class="credits-row">
            <strong>Sound effects</strong>
            <span>Obtained from Pixabay.</span>
          </div>
          <div class="credits-row">
            <strong>Availability</strong>
            <span>Bubble Borough is free-to-play while it is available on the internet.</span>
          </div>
          <div class="credits-row">
            <strong>Copyright</strong>
            <span>&copy; 2026 Nathan Arcuri.</span>
          </div>
        </div>
      </div>
    `,
    footer: buildUtilityCloseFooter("Close")
  };
}

function renderDecorBuyConfirmUtilityOverlay() {
  const details = getPendingDecorBuyAnotherDetails();
  return {
    kicker: "Decor",
    title: "Buy Another",
    body: details
      ? `
        <div class="utility-confirm-card">
          <div class="utility-confirm-copy">
            <strong>Spend ${details.cost} ${pluralize("coin", details.cost)} to buy another ${escapeHtml(details.decor.name)}?</strong>
            <div class="fish-meta">${details.canAfford ? "A new copy will be added to storage." : "You do not have enough coins right now."}</div>
          </div>
        </div>
      `
      : `<div class="empty-state">That decor is no longer available.</div>`,
    footer: details
      ? `<div class="utility-confirm-actions"><button class="small-button" data-confirm-decor-buy-another ${details.canAfford ? "" : "disabled"}>Yes</button><button class="small-button alt" data-close-utility>No</button></div>`
      : `<button class="small-button" data-close-utility>Close</button>`
  };
}

function renderDecorSellConfirmUtilityOverlay() {
  const details = getPendingDecorSellDetails();
  return {
    kicker: "Decor",
    title: "Sell Decor",
    body: details
      ? `
        <div class="utility-confirm-card">
          <div class="utility-confirm-copy">
            <strong>Sell ${escapeHtml(details.decor.name)} for ${details.resaleValue} ${pluralize("coin", details.resaleValue)}?</strong>
            <div class="fish-meta">${details.grouped ? "Ungroup this decor before selling it." : "This will remove it from the tank."}</div>
          </div>
        </div>
      `
      : `<div class="empty-state">That decor is no longer in the tank.</div>`,
    footer: details
      ? `<div class="utility-confirm-actions"><button class="small-button warn" data-confirm-decor-sell ${details.grouped ? "disabled" : ""}>Yes</button><button class="small-button alt" data-close-utility>No</button></div>`
      : `<button class="small-button" data-close-utility>Close</button>`
  };
}

function renderFishBuyConfirmUtilityOverlay() {
  const details = getPendingFishBuyAnotherDetails();
  return {
    kicker: "Fish",
    title: "Buy Another",
    body: details
      ? buildUtilityConfirmCardMarkup({
        headline: `Spend ${details.cost} ${pluralize("coin", details.cost)} to buy another ${escapeHtml(details.baseSpecies.name)}?`,
        detail: details.canAfford
          ? "A new fish will join the aquarium."
          : "You do not have enough coins right now."
      })
      : `<div class="empty-state">That fish is no longer available.</div>`,
    footer: details
      ? buildUtilityActionsFooter([
        { label: "Yes", attribute: "data-confirm-fish-buy-another", disabled: !details.canBuy || !details.canAfford },
        { label: "No", variant: "alt", attribute: "data-close-utility" }
      ])
      : `<button class="small-button" data-close-utility>Close</button>`
  };
}

function renderFishSellConfirmUtilityOverlay() {
  const details = getPendingFishSellDetails();
  const detail = details
    ? details.dead
      ? "Dead fish cannot be sold."
      : details.juvenile
        ? "Baby fish need time to grow before they can be sold."
        : details.inStorage
          ? "This will remove it from storage."
          : "This will remove it from the tank."
    : "";
  return {
    kicker: "Fish",
    title: "Sell Fish",
    body: details
      ? buildUtilityConfirmCardMarkup({
        headline: `Sell ${escapeHtml(details.fish.name)} for ${details.resaleValue} ${pluralize("coin", details.resaleValue)}?`,
        detail
      })
      : `<div class="empty-state">That fish is no longer available.</div>`,
    footer: details
      ? buildUtilityActionsFooter([
        { label: "Yes", variant: "warn", attribute: "data-confirm-fish-sell", disabled: !details.canSell },
        { label: "No", variant: "alt", attribute: "data-close-utility" }
      ])
      : `<button class="small-button" data-close-utility>Close</button>`
  };
}

function renderImportConfirmUtilityOverlay() {
  return {
    kicker: "Save Data",
    title: "Import Save File",
    body: buildUtilityConfirmCardMarkup({
      headline: "Importing a save file will overwrite your current progress.",
      detail: "Continue?"
    }),
    footer: buildUtilityActionsFooter([
      { label: "Yes", attribute: "data-confirm-import-save" },
      { label: "No", variant: "alt", attribute: "data-close-utility" }
    ])
  };
}

function renderResetProgressUtilityOverlay() {
  return {
    kicker: "Data",
    title: "Reset Progress",
    body: buildUtilityConfirmCardMarkup({
      headline: "Are you sure you want to reset all progress?",
      detail: "This will delete your fish, decor, coins, tanks, care history, and saved progress."
    }),
    footer: buildUtilityActionsFooter([
      { label: "Yes", variant: "warn", attribute: "data-confirm-reset-progress" },
      { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
    ])
  };
}

function renderResetProgressSaveChoiceUtilityOverlay() {
  return {
    kicker: "Data",
    title: "Save Before Reset",
    body: buildUtilityConfirmCardMarkup({
      headline: "Do you want to save your current aquarium first?",
      detail: "Choose Save First to export your current state before resetting."
    }),
    footer: buildUtilityActionsFooter([
      { label: "Save First", attribute: "data-reset-save-first" },
      { label: "Reset Without Saving", variant: "warn", attribute: "data-reset-without-saving" },
      { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
    ])
  };
}

function renderResetProgressSaveExportUtilityOverlay() {
  const exportData = runtime.pendingSaveExport;
  return {
    kicker: "Data",
    title: "Save Before Reset",
    body: renderSaveExportOverlay(exportData),
    footer: exportData
      ? renderSaveExportActionsFooter({ includeReset: true, doneLabel: "Cancel" })
      : `<button class="small-button alt" data-close-utility>Cancel</button>`,
    closable: true
  };
}

function createUtilityOverlayActionHandler(actions) {
  return (ctx, target, event) => {
    for (const action of actions) {
      const matched = target?.closest?.(action.selector);
      if (!matched) {
        continue;
      }
      action.run(ctx, matched, event);
      return true;
    }
    return false;
  };
}

function handleFoodUtilityOverlayBodyClick(ctx, target) {
  const foodButton = target?.closest?.("[data-select-food]");
  if (!foodButton) {
    return false;
  }
  selectFoodMode(foodButton.dataset.selectFood);
  return true;
}

function handleMedicineUtilityOverlayBodyClick(ctx, target) {
  const medicineButton = target?.closest?.("[data-select-medicine]");
  if (!medicineButton) {
    return false;
  }
  selectMedicineMode(medicineButton.dataset.selectMedicine);
  return true;
}

function handleTankManagementUtilityOverlayBodyClick(ctx, target) {
  if (target?.closest?.("[data-open-aquarium-overview]")) {
    closeUtilityOverlay();
    openAquariumOverview(false);
    return true;
  }
  if (target?.closest?.("[data-extend-aquarium]")) {
    closeUtilityOverlay();
    openAquariumOverview(true);
    return true;
  }
  if (target?.closest?.("[data-toggle-care-task-pane]")) {
    toggleCareTaskPane();
    return true;
  }
  const careTaskActionButton = target?.closest?.("[data-management-care-action]");
  if (careTaskActionButton) {
    return runManagementCareTaskAction(careTaskActionButton.dataset.managementCareAction);
  }
  const managementViewButton = target?.closest?.("[data-management-view]");
  if (managementViewButton) {
    runtime.managementHubView = normalizeManagementHubView(managementViewButton.dataset.managementView);
    renderUi(Date.now());
    return true;
  }
  const managementSelectFishButton = target?.closest?.("[data-management-select-fish]");
  if (managementSelectFishButton) {
    selectFishInTankFromManagement(managementSelectFishButton.dataset.managementSelectFish);
    return true;
  }
  const managementStoreFishButton = target?.closest?.("[data-management-store-fish]");
  if (managementStoreFishButton) {
    storeFish(managementStoreFishButton.dataset.managementStoreFish);
    return true;
  }
  const managementBuyFishButton = target?.closest?.("[data-management-buy-another-fish]");
  if (managementBuyFishButton) {
    buyAnotherFishFromManagement(managementBuyFishButton.dataset.managementBuyAnotherFish);
    return true;
  }
  const managementSellFishButton = target?.closest?.("[data-management-sell-fish]");
  if (managementSellFishButton) {
    openFishSellConfirmation(managementSellFishButton.dataset.managementSellFish);
    return true;
  }
  const managementSelectDecorButton = target?.closest?.("[data-management-select-decor]");
  if (managementSelectDecorButton) {
    selectDecorInTankFromManagement(managementSelectDecorButton.dataset.managementSelectDecor);
    return true;
  }
  const managementStoreDecorButton = target?.closest?.("[data-management-store-decor]");
  if (managementStoreDecorButton) {
    storeDecor(managementStoreDecorButton.dataset.managementStoreDecor);
    return true;
  }
  const managementBuyDecorButton = target?.closest?.("[data-management-buy-another-decor]");
  if (managementBuyDecorButton) {
    buyAnotherDecor(managementBuyDecorButton.dataset.managementBuyAnotherDecor);
    return true;
  }
  const managementSellDecorButton = target?.closest?.("[data-management-sell-decor]");
  if (managementSellDecorButton) {
    sellPlacedDecor(managementSellDecorButton.dataset.managementSellDecor);
    return true;
  }
  if (target?.closest?.("[data-management-history-reset]")) {
    resetManagementHistoryFilters();
    renderUi(Date.now());
    return true;
  }
  const openStoreButton = target?.closest?.("[data-open-store-tab]");
  if (openStoreButton) {
    openStoreOverlay(openStoreButton.dataset.openStoreTab);
    return true;
  }
  if (target?.closest?.("[data-open-equipment-overlay]")) {
    openEquipmentOverlay();
    return true;
  }
  if (target?.closest?.("[data-open-settings-from-management]")) {
    openSettingsOverlay();
    return true;
  }
  if (target?.closest?.("[data-edit-tank-name]")) {
    const tank = getCurrentTank();
    if (!tank) {
      return true;
    }
    runtime.editingTankNameId = tank.id;
    runtime.editingTankNameValue = getTankLabel(tank);
    renderUi(Date.now());
    window.requestAnimationFrame(() => {
      const input = dom.utilityOverlayBody?.querySelector("[data-tank-name-input]");
      input?.focus?.();
      input?.select?.();
    });
    return true;
  }
  if (target?.closest?.("[data-save-tank-name]")) {
    saveCurrentTankName();
    return true;
  }
  if (target?.closest?.("[data-cancel-tank-name]")) {
    cancelCurrentTankNameEdit();
    return true;
  }
  if (target?.closest?.("[data-sell-current-tank]")) {
    sellCurrentTank();
    return true;
  }
  return false;
}

function handleCaveSettingsUtilityOverlayBodyClick(ctx, target) {
  const transitTubeColorButton = target?.closest?.("[data-transit-tube-color]");
  if (transitTubeColorButton) {
    const item = getDecorSettingsTarget();
    if (item && isTransitTubeDecorKey(item.decorKey)) {
      item.transitTubeColor = normalizeDecorColorSetting(transitTubeColorButton.dataset.transitTubeColor || "");
      saveState();
      renderUtilityOverlay();
    }
    return true;
  }
  if (target?.closest?.("[data-reset-bubbler-settings]")) {
    resetSelectedBubblerSettings();
    return true;
  }
  const bubblerColorButton = target?.closest?.("[data-bubbler-color]");
  if (bubblerColorButton) {
    updateSelectedBubblerSetting("bubbleColor", bubblerColorButton.dataset.bubblerColor);
    return true;
  }
  const caveColorButton = target?.closest?.("[data-cave-color-layer]");
  if (caveColorButton) {
    updateSelectedCaveColorSetting(
      caveColorButton.dataset.caveColorLayer,
      caveColorButton.dataset.caveColor || ""
    );
    return true;
  }
  const caveEntryButton = target?.closest?.("[data-cave-entry-select]");
  if (caveEntryButton) {
    updateSelectedCaveSetting("activeEntryIndex", caveEntryButton.dataset.caveEntrySelect);
    return true;
  }
  const caveSeatButton = target?.closest?.("[data-cave-seat-select]");
  if (caveSeatButton) {
    updateSelectedCaveSetting("activeSeatIndex", caveSeatButton.dataset.caveSeatSelect);
    return true;
  }
  const caveSeatFacingButton = target?.closest?.("[data-cave-seat-facing]");
  if (caveSeatFacingButton) {
    updateSelectedCaveSetting(
      "seatFacing",
      caveSeatFacingButton.dataset.caveSeatFacing,
      caveSeatFacingButton.dataset.caveSeatIndex
    );
    return true;
  }
  return false;
}

function handleCaveSettingsUtilityOverlayPointerDown(ctx, event) {
  const previewFrame = event.target.closest("[data-decor-settings-preview-frame]");
  const caveTarget = getEditableCaveSettingsTarget();
  if (
    previewFrame instanceof HTMLElement
    && (runtime.utilityOverlayMode === "decor-settings" || runtime.utilityOverlayMode === "custom-hide-create")
    && isCaveDecorKey(caveTarget?.item?.decorKey)
  ) {
    const pointTarget = getCaveSettingsPreviewPointerTarget(event);
    const point = getCaveSettingsPreviewLocalPoint(event);
    if (pointTarget && point) {
      runtime.caveSettingsDrag = {
        kind: pointTarget.kind,
        index: pointTarget.index,
        pointerId: event.pointerId
      };
      previewFrame.setPointerCapture?.(event.pointerId);
      applyCaveSettingsPreviewPoint(pointTarget.kind, pointTarget.index, point, { commit: false });
      event.preventDefault();
      return true;
    }
  }
  const caveEntryControl = event.target.closest("[data-cave-setting][data-cave-entry-index]");
  if (caveEntryControl instanceof HTMLInputElement || caveEntryControl instanceof HTMLSelectElement) {
    updateSelectedCaveSetting("activeEntryIndex", caveEntryControl.dataset.caveEntryIndex);
    return true;
  }
  const caveSeatControl = event.target.closest("[data-cave-setting][data-cave-seat-index]");
  if (caveSeatControl instanceof HTMLInputElement || caveSeatControl instanceof HTMLSelectElement) {
    updateSelectedCaveSetting("activeSeatIndex", caveSeatControl.dataset.caveSeatIndex);
    return true;
  }
  return false;
}

function handleCaveSettingsUtilityOverlayPointerMove(ctx, event) {
  const drag = runtime.caveSettingsDrag;
  if (!drag || drag.pointerId !== event.pointerId) {
    return false;
  }
  const point = getCaveSettingsPreviewLocalPoint(event);
  if (point) {
    applyCaveSettingsPreviewPoint(drag.kind, drag.index, point, { commit: false });
    event.preventDefault();
    return true;
  }
  return false;
}

function handleCaveSettingsUtilityOverlayPointerEnd(ctx, event) {
  finishCaveSettingsPreviewDrag(event);
  return true;
}

function handleCaveSettingsUtilityOverlayFocusIn(ctx, target) {
  const caveEntryControl = target?.closest?.("[data-cave-setting][data-cave-entry-index]");
  if (caveEntryControl instanceof HTMLInputElement || caveEntryControl instanceof HTMLSelectElement) {
    updateSelectedCaveSetting("activeEntryIndex", caveEntryControl.dataset.caveEntryIndex);
    return true;
  }
  const caveSeatControl = target?.closest?.("[data-cave-setting][data-cave-seat-index]");
  if (caveSeatControl instanceof HTMLInputElement || caveSeatControl instanceof HTMLSelectElement) {
    updateSelectedCaveSetting("activeSeatIndex", caveSeatControl.dataset.caveSeatIndex);
    return true;
  }
  return false;
}

function handleCommonUtilityOverlayInput(ctx, target) {
  const caveSettingInput = target?.closest?.("[data-cave-setting]");
  if (caveSettingInput instanceof HTMLInputElement) {
    updateSelectedCaveSetting(
      caveSettingInput.dataset.caveSetting,
      caveSettingInput.type === "checkbox" ? caveSettingInput.checked : caveSettingInput.value,
      caveSettingInput.dataset.caveSeatIndex,
      caveSettingInput.dataset.caveEntryIndex
    );
    return true;
  }
  const bubblerInput = target?.closest?.("[data-bubbler-setting]");
  if (bubblerInput instanceof HTMLInputElement) {
    updateSelectedBubblerSetting(
      bubblerInput.dataset.bubblerSetting,
      bubblerInput.type === "checkbox" ? bubblerInput.checked : bubblerInput.value
    );
    return true;
  }
  const decorSettingInput = target?.closest?.("[data-decor-setting]");
  if (decorSettingInput instanceof HTMLInputElement) {
    if (decorSettingInput.dataset.decorSetting === "size") {
      updateSelectedDecorSetting(decorSettingInput.dataset.decorSetting, decorSettingInput.value);
    } else {
      updateSelectedDecorMotionSetting(decorSettingInput.dataset.decorSetting, decorSettingInput.value);
    }
    return true;
  }
  const customDecorSettingInput = target?.closest?.("[data-custom-decor-setting]");
  if (customDecorSettingInput instanceof HTMLInputElement) {
    updateSelectedCustomDecorSetting(
      customDecorSettingInput.dataset.customDecorSetting,
      customDecorSettingInput.value
    );
    return true;
  }
  return false;
}

function handleCustomDecorUtilityOverlayInput(ctx, target) {
  const customDecorInput = target?.closest?.("[data-custom-decor-name-input]");
  if (customDecorInput instanceof HTMLInputElement && runtime.pendingCustomDecorUpload) {
    runtime.pendingCustomDecorUpload.name = customDecorInput.value;
    return true;
  }
  const customDecorSizeInput = target?.closest?.("[data-custom-decor-size-input]");
  if (customDecorSizeInput instanceof HTMLInputElement && runtime.pendingCustomDecorUpload) {
    updatePendingCustomDecorSize(customDecorSizeInput.value);
    return true;
  }
  const customDecorSplitInput = target?.closest?.("[data-custom-decor-split-input]");
  if (customDecorSplitInput instanceof HTMLInputElement && runtime.pendingCustomDecorUpload) {
    updatePendingCustomDecorMotionSplit(customDecorSplitInput.value);
    return true;
  }
  const customDecorIntensityInput = target?.closest?.("[data-custom-decor-intensity-input]");
  if (customDecorIntensityInput instanceof HTMLInputElement && runtime.pendingCustomDecorUpload) {
    updatePendingCustomDecorMotionIntensity(customDecorIntensityInput.value);
    return true;
  }
  return false;
}

function handleCustomHideUtilityOverlayInput(ctx, target) {
  const customHideNameInput = target?.closest?.("[data-custom-hide-name-input]");
  if (customHideNameInput instanceof HTMLInputElement && runtime.pendingCustomHideUpload) {
    runtime.pendingCustomHideUpload.name = customHideNameInput.value;
    return true;
  }
  const customHideSizeInput = target?.closest?.("[data-custom-hide-size-input]");
  if (customHideSizeInput instanceof HTMLInputElement && runtime.pendingCustomHideUpload) {
    updatePendingCustomHideScale(customHideSizeInput.value);
    return true;
  }
  return false;
}

function handleTankManagementUtilityOverlayChange(ctx, target) {
  const filterControl = target?.closest?.("[data-management-history-filter]");
  if (filterControl instanceof HTMLSelectElement) {
    const key = String(filterControl.dataset.managementHistoryFilter || "");
    if (Object.prototype.hasOwnProperty.call(getManagementHistoryFilters(), key)) {
      runtime.managementHistoryFilters = {
        ...getManagementHistoryFilters(),
        [key]: filterControl.value
      };
      renderUi(Date.now());
      return true;
    }
  }
  return false;
}

function handleCustomHideUtilityOverlayChange(ctx, target) {
  const customHideLayerSelect = target?.closest?.("[data-custom-hide-setting='tankLayer']");
  if (customHideLayerSelect instanceof HTMLSelectElement && runtime.pendingCustomHideUpload) {
    updatePendingCustomHideLayer(customHideLayerSelect.value);
    return true;
  }
  return false;
}

function handleCustomHideUtilityOverlayBodyClick(ctx, target) {
  const chooseFrontButton = target?.closest?.("[data-choose-custom-hide-front]");
  if (chooseFrontButton) {
    openLocalHideFrontPicker();
    return true;
  }
  const chooseBackgroundButton = target?.closest?.("[data-choose-custom-hide-background]");
  if (chooseBackgroundButton) {
    openLocalHideBackgroundPicker();
    return true;
  }
  return false;
}

function handleCustomFishUtilityOverlayInput(ctx, target) {
  const customFishNameInput = target?.closest?.("[data-custom-fish-name-input]");
  if (customFishNameInput instanceof HTMLInputElement && runtime.pendingCustomFishUpload) {
    runtime.pendingCustomFishUpload.name = customFishNameInput.value;
    return true;
  }
  const customFishSizeInput = target?.closest?.("[data-custom-fish-size-input]");
  if (customFishSizeInput instanceof HTMLInputElement && runtime.pendingCustomFishUpload) {
    updatePendingCustomFishSize(customFishSizeInput.value);
    return true;
  }
  const customFishRotationInput = target?.closest?.("[data-custom-fish-rotation-input]");
  if (customFishRotationInput instanceof HTMLInputElement && runtime.pendingCustomFishUpload) {
    updatePendingCustomFishRotation(customFishRotationInput.value);
    return true;
  }
  return false;
}

function handleCustomFishUtilityOverlayBodyClick(ctx, target) {
  return false;
}

function handleCustomFishUtilityOverlayChange(ctx, target) {
  const flipToggle = target?.closest?.("[data-custom-fish-flip-toggle]");
  if (flipToggle instanceof HTMLInputElement && runtime.pendingCustomFishUpload) {
    updatePendingCustomFishFlip(flipToggle.checked);
    return true;
  }
  return handleCommonUtilityOverlayChange(ctx, target);
}

function handleTankManagementUtilityOverlayInput(ctx, target) {
  const input = target?.closest?.("[data-tank-name-input]");
  if (input instanceof HTMLInputElement) {
    runtime.editingTankNameValue = input.value;
    return true;
  }
  return false;
}

function handleCommonUtilityOverlayChange(ctx, target) {
  const caveColorizeControl = target?.closest?.("[data-cave-colorize-layer]");
  if (caveColorizeControl instanceof HTMLInputElement) {
    updateSelectedCaveColorizeSetting(
      caveColorizeControl.dataset.caveColorizeLayer,
      caveColorizeControl.checked
    );
    return true;
  }
  const caveSettingControl = target?.closest?.("[data-cave-setting]");
  if (caveSettingControl instanceof HTMLInputElement || caveSettingControl instanceof HTMLSelectElement) {
    updateSelectedCaveSetting(
      caveSettingControl.dataset.caveSetting,
      caveSettingControl.value,
      caveSettingControl.dataset.caveSeatIndex,
      caveSettingControl.dataset.caveEntryIndex
    );
    return true;
  }
  const bubblerControl = target?.closest?.("[data-bubbler-setting]");
  if (bubblerControl instanceof HTMLInputElement || bubblerControl instanceof HTMLSelectElement) {
    updateSelectedBubblerSetting(
      bubblerControl.dataset.bubblerSetting,
      bubblerControl instanceof HTMLInputElement && bubblerControl.type === "checkbox"
        ? bubblerControl.checked
        : bubblerControl.value
    );
    return true;
  }
  const customDecorSettingControl = target?.closest?.("[data-custom-decor-setting]");
  if (customDecorSettingControl instanceof HTMLInputElement || customDecorSettingControl instanceof HTMLSelectElement) {
    updateSelectedCustomDecorSetting(
      customDecorSettingControl.dataset.customDecorSetting,
      customDecorSettingControl.value
    );
    return true;
  }
  const decorSettingControl = target?.closest?.("[data-decor-setting]");
  if (decorSettingControl instanceof HTMLInputElement || decorSettingControl instanceof HTMLSelectElement) {
    const decorSetting = decorSettingControl.dataset.decorSetting;
    if (decorSetting === "size" || decorSetting === "tankLayer") {
      updateSelectedDecorSetting(decorSetting, decorSettingControl.value);
    } else {
      updateSelectedDecorMotionSetting(decorSetting, decorSettingControl.value);
    }
    return true;
  }
  const customFishBehaviorSelect = target?.closest?.("[data-custom-fish-behavior-select]");
  if (customFishBehaviorSelect instanceof HTMLSelectElement && runtime.pendingCustomFishUpload) {
    runtime.pendingCustomFishUpload.behaviorProfileId = normalizeCustomFishBehaviorProfileId(customFishBehaviorSelect.value);
    return true;
  }
  const customDecorTypeSelect = target?.closest?.("[data-custom-decor-type-select]");
  if (customDecorTypeSelect instanceof HTMLSelectElement && runtime.pendingCustomDecorUpload) {
    setPendingCustomDecorMotionType(customDecorTypeSelect.value);
    return true;
  }
  const customDecorSwaySideSelect = target?.closest?.("[data-custom-decor-sway-side-select]");
  if (customDecorSwaySideSelect instanceof HTMLSelectElement && runtime.pendingCustomDecorUpload) {
    setPendingCustomDecorSwaySide(customDecorSwaySideSelect.value);
    return true;
  }
  return false;
}

function handleTankManagementUtilityOverlayKeyDown(ctx, target, event) {
  const input = target?.closest?.("[data-tank-name-input]");
  if (!(input instanceof HTMLInputElement)) {
    return false;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    saveCurrentTankName();
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    cancelCurrentTankNameEdit();
    return true;
  }
  return false;
}

function handleCustomDecorUtilityOverlayKeyDown(ctx, target, event) {
  const customDecorInput = target?.closest?.("[data-custom-decor-name-input]");
  if (!(customDecorInput instanceof HTMLInputElement)) {
    return false;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    void savePendingCustomDecorUpload();
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    requestCloseUtilityOverlay();
    return true;
  }
  return false;
}

function handleCustomHideUtilityOverlayKeyDown(ctx, target, event) {
  const customHideInput = target?.closest?.("[data-custom-hide-name-input]");
  if (!(customHideInput instanceof HTMLInputElement)) {
    return false;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    void savePendingCustomHideUpload();
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    requestCloseUtilityOverlay();
    return true;
  }
  return false;
}

function handleCustomFishUtilityOverlayKeyDown(ctx, target, event) {
  const customFishInput = target?.closest?.("[data-custom-fish-name-input]");
  if (!(customFishInput instanceof HTMLInputElement)) {
    return false;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    void savePendingCustomFishUpload();
    return true;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    requestCloseUtilityOverlay();
    return true;
  }
  return false;
}

function requestCloseUtilityOverlay() {
  const modeDef = getUtilityOverlayModeDef(runtime.utilityOverlayMode);
  if (modeDef?.onRequestClose?.(getUtilityOverlayContext(Date.now())) === true) {
    return true;
  }
  closeUtilityOverlay();
  return true;
}

function dispatchUtilityOverlayTargetEvent(handlerKey, event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return false;
  }
  const modeDef = getUtilityOverlayModeDef(runtime.utilityOverlayMode);
  const handler = modeDef?.[handlerKey];
  return handler ? handler(getUtilityOverlayContext(Date.now()), target, event) === true : false;
}

function dispatchUtilityOverlayPointerEvent(handlerKey, event) {
  const modeDef = getUtilityOverlayModeDef(runtime.utilityOverlayMode);
  const handler = modeDef?.[handlerKey];
  return handler ? handler(getUtilityOverlayContext(Date.now()), event) === true : false;
}

function renderUtilityOverlay() {
  if (!dom.utilityOverlay) {
    return;
  }

  dom.utilityOverlay.hidden = !runtime.utilityOverlayOpen;
  dom.utilityOverlay.classList.toggle("is-open", runtime.utilityOverlayOpen);
  if (!runtime.utilityOverlayOpen) {
    return;
  }

  const modeDef = getUtilityOverlayModeDef(runtime.utilityOverlayMode);
  const config = modeDef?.render?.(getUtilityOverlayContext(Date.now())) || buildDefaultUtilityOverlayConfig();
  const hideKicker = config.kicker === false;
  const kicker = hideKicker ? "" : String(config.kicker || "Tank Tools");
  const title = String(config.title || "Details");
  const body = String(config.body || "");
  const footer = String(config.footer || "");

  setTextIfChanged(dom.utilityOverlayTitle, title);
  if (dom.utilityOverlayKicker) {
    setTextIfChanged(dom.utilityOverlayKicker, kicker);
    dom.utilityOverlayKicker.hidden = hideKicker;
  }
  if (dom.utilityOverlayBody) {
    setMarkupIfChanged("utility-overlay-body", dom.utilityOverlayBody, body);
    syncWallpaperUtilityNameKeyboards();
    syncWallpaperScrollControls(dom.utilityOverlayBody);
  }
  if (dom.utilityOverlayFooter) {
    setMarkupIfChanged("utility-overlay-footer", dom.utilityOverlayFooter, footer);
    dom.utilityOverlayFooter.hidden = !footer.trim();
  }
  if (dom.closeUtilityOverlay) {
    dom.closeUtilityOverlay.hidden = config.closable === false;
  }
}

function renderExternalLinkOverlay(link) {
  if (!link?.url) {
    return `<div class="empty-state">That link is no longer available.</div>`;
  }

  return `
    <div class="utility-confirm-card external-link-card">
      <div class="utility-confirm-copy">
        <strong>${escapeHtml(link.label || "Open this link")}?</strong>
        <div class="fish-meta">External browser windows may be blocked. If Open Link does not work, copy the URL.</div>
      </div>
      <div class="external-link-url">${escapeHtml(link.url)}</div>
    </div>
  `;
}

function renderSaveExportOverlay(exportData) {
  if (!exportData?.contents) {
    return `<div class="empty-state">No aquarium data is loaded yet.</div>`;
  }

  const showInlineData = isWallpaperEngineModeEnabled();
  return `
    <div class="save-export-panel">
      <div class="utility-confirm-card save-export-summary">
        <div class="utility-confirm-copy">
          <strong>Save file ready.</strong>
          <div class="fish-meta">${showInlineData ? "Downloads may be blocked, so this export is also available here." : "A download should start automatically. Use Download File to try again."}</div>
        </div>
        <div class="save-export-meta">
          <span class="save-export-pill">${escapeHtml(exportData.filename)}</span>
          <span class="save-export-pill">${escapeHtml(exportData.sizeLabel)}</span>
        </div>
      </div>
      ${showInlineData ? `<textarea class="save-export-textarea" data-save-export-text readonly spellcheck="false">${escapeHtml(exportData.contents)}</textarea>` : ""}
    </div>
  `;
}

function renderSaveExportActionsFooter(options = {}) {
  const showInlineData = isWallpaperEngineModeEnabled();
  const doneLabel = options.doneLabel || "Done";
  return `
    <div class="utility-confirm-actions">
      ${showInlineData ? `<button class="small-button" data-copy-save-export>Copy Data</button><button class="small-button alt" data-select-save-export>Select All</button>` : ""}
      <button class="small-button alt" data-download-save-export>Download File</button>
      ${options.includeReset ? `<button class="small-button warn" data-reset-after-save-export>Reset Now</button>` : ""}
      <button class="small-button alt" data-close-utility>${escapeHtml(doneLabel)}</button>
    </div>
  `;
}

function renderCustomDecorNameOverlay() {
  const pending = runtime.pendingCustomDecorUpload;
  if (!pending?.dataUrl) {
    return `<div class="empty-state">Choose an image from the decor shop first.</div>`;
  }

  const width = clamp(Math.round(Number(pending.width) || CUSTOM_DECOR_DEFAULT_WIDTH), CUSTOM_DECOR_MIN_WIDTH, CUSTOM_DECOR_MAX_WIDTH);
  const motionType = normalizeCustomDecorMotionType(pending.motionType);
  const motionConfig = getCustomDecorMotionTypeConfig(motionType);
  const usesSplit = customDecorMotionTypeUsesSplit(motionType);
  const splitY = sanitizeCustomDecorMotionSplit(pending.motionSplitY);
  const splitPercent = Math.round(splitY * 100);
  const swaySide = normalizeDecorSwaySide(pending.motionSwaySide);
  const motionIntensity = sanitizeCustomDecorMotionIntensity(pending.motionIntensity);
  const hasSway = Boolean(motionConfig.hasSway);
  const hasBob = Boolean(motionConfig.hasBob);
  const hasMotionIntensity = hasSway || hasBob;
  const motionIntensityLabel = getCustomDecorMotionIntensityLabel(motionConfig);
  const aspectRatio = pending.naturalHeight && pending.naturalWidth
    ? `${Math.max(1, Number(pending.naturalWidth))} / ${Math.max(1, Number(pending.naturalHeight))}`
    : "1 / 1";
  const motionOptions = CUSTOM_DECOR_MOTION_TYPES.map((option) => `
    <option value="${escapeHtml(option.id)}" ${motionType === option.id ? "selected" : ""}>
      ${escapeHtml(option.label)}
    </option>
  `).join("");
  const swaySideOptions = DECOR_SWAY_SIDE_OPTIONS.map((option) => `
    <option value="${escapeHtml(option.id)}" ${swaySide === option.id ? "selected" : ""}>
      ${escapeHtml(option.label)}
    </option>
  `).join("");
  const swaySideCopy = swaySide === "below" ? "Below the red line sways." : "Above the red line sways.";
  const splitGuidance = motionType === "standard-seaweed"
    ? `${swaySideCopy} The other side stays planted.`
    : motionType === "floating-seaweed"
      ? `${swaySideCopy} The full image keeps its gentle bob.`
      : `${swaySideCopy} The other side keeps the suspended bob.`;
  const previewClass = [
    "custom-decor-motion-preview",
    hasSway ? "has-sway" : "",
    hasBob ? "is-bobbing" : "",
    `motion-${motionType}`
  ].filter(Boolean).join(" ");
  const previewStyle = [
    `width: ${width}px`,
    `aspect-ratio: ${escapeHtml(aspectRatio)}`,
    `--custom-decor-motion-split: ${(splitY * 100).toFixed(2)}%`
  ].join("; ");
  const previewImageSrc = escapeHtml(pending.dataUrl);

  return `
    <div class="custom-decor-name-panel">
      <div class="custom-decor-create-layout">
        <div class="custom-decor-preview-column">
          <div class="custom-decor-size-window">
            <div class="custom-decor-size-stage">
              <div
                class="${previewClass}"
                style="${previewStyle};"
                data-custom-decor-motion-type="${escapeHtml(motionType)}"
                data-custom-decor-preview-frame>
                <canvas
                  class="custom-decor-motion-canvas"
                  data-custom-decor-preview-canvas
                  aria-label="Uploaded custom decor animated preview"></canvas>
                <img
                  class="custom-decor-motion-source"
                  src="${previewImageSrc}"
                  alt="Uploaded custom decor preview"
                  data-custom-decor-preview />
                ${usesSplit ? `<div class="custom-decor-motion-split-line" style="top: ${(splitY * 100).toFixed(2)}%;" data-custom-decor-split-line></div>` : ""}
              </div>
            </div>
            <div class="custom-fish-size-readout">
              <span>Actual decor width</span>
              <strong data-custom-decor-size-label>${width} px</strong>
            </div>
          </div>
        </div>
        <div class="custom-decor-controls-column">
          <label class="custom-decor-name-row">
            <span>Decor Name</span>
            <input
              class="tank-name-input custom-decor-name-input"
              type="text"
              maxlength="48"
              value="${escapeHtml(pending.name || pending.suggestedName || "Custom Decor")}"
              data-wallpaper-keyboard-input="custom-decor"
              data-custom-decor-name-input
              aria-label="Custom decor name" />
            <div class="wallpaper-name-keyboard" data-wallpaper-keyboard="custom-decor" hidden aria-label="Custom decor name keyboard"></div>
          </label>
          <label class="custom-decor-name-row">
            <span>Decor Type</span>
            <select class="shop-sort-select" data-custom-decor-type-select aria-label="Custom decor type">
              ${motionOptions}
            </select>
          </label>
          <div class="custom-decor-type-summary">${escapeHtml(motionConfig.summary)}</div>
          <label class="bubbler-control-row custom-fish-size-control">
            <span>Default Size <strong data-custom-decor-size-label>${width} px</strong></span>
            <input
              type="range"
              min="${CUSTOM_DECOR_MIN_WIDTH}"
              max="${CUSTOM_DECOR_MAX_WIDTH}"
              step="1"
              value="${width}"
              data-custom-decor-size-input />
          </label>
          ${usesSplit ? `
            <label class="custom-decor-name-row">
              <span>Sway Area</span>
              <select class="shop-sort-select" data-custom-decor-sway-side-select aria-label="Custom decor sway area">
                ${swaySideOptions}
              </select>
            </label>
            <label class="bubbler-control-row custom-decor-split-control">
              <span>Sway Starts <strong data-custom-decor-split-label>${splitPercent}%</strong></span>
              <input
                type="range"
                min="8"
                max="92"
                step="1"
                value="${splitPercent}"
                data-custom-decor-split-input />
              <em>${escapeHtml(splitGuidance)}</em>
            </label>
          ` : ""}
          ${hasMotionIntensity ? `
            <label class="bubbler-control-row custom-decor-intensity-control">
              <span>${escapeHtml(motionIntensityLabel)} <strong data-custom-decor-intensity-label>${motionIntensity.toFixed(2)}x</strong></span>
              <input
                type="range"
                min="${MIN_CUSTOM_DECOR_MOTION_INTENSITY}"
                max="${MAX_CUSTOM_DECOR_MOTION_INTENSITY}"
                step="0.05"
                value="${motionIntensity}"
                data-custom-decor-intensity-input />
            </label>
          ` : ""}
          <div class="mini-note">This will create one custom decor item for ${CUSTOM_DECOR_COST} ${pluralize("coin", CUSTOM_DECOR_COST)} and place it in storage.</div>
        </div>
      </div>
    </div>
  `;
}

function renderCaveColorSettingsControls(item, decor) {
  const layers = getVisibleDecorColorLayers(decor);
  if (!item || !layers.length) {
    return "";
  }

  const settings = getPlacedCaveColorSettings(item, decor);
  const colorizeSettings = getPlacedCaveColorizeSettings(item, decor);
  const colorChoices = getCustomGravelColorChoices();
  const layerControls = layers.map((layer) => {
    const activeColor = normalizeDecorColorSetting(settings[layer.id] || "");
    const originalSelected = !activeColor;
    const rgbSelected = isDecorRgbColorSetting(activeColor);
    const colorizeChecked = colorizeSettings[layer.id] === true;
    const originalTile = `
      <button
        class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${originalSelected ? "is-selected" : ""}"
        type="button"
        data-cave-color-layer="${escapeHtml(layer.id)}"
        data-cave-color=""
        aria-pressed="${originalSelected}"
        aria-label="Use original ${escapeHtml(getCaveColorLayerLabel(layer, layers, decor))} color"
        title="Original color">
        Original
      </button>
    `;
    const rgbTile = `
      <button
        class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile cave-color-rgb-tile ${rgbSelected ? "is-selected" : ""}"
        type="button"
        data-cave-color-layer="${escapeHtml(layer.id)}"
        data-cave-color="${DECOR_RGB_COLOR_SETTING}"
        aria-pressed="${rgbSelected}"
        aria-label="Fade ${escapeHtml(getCaveColorLayerLabel(layer, layers, decor))} through RGB colors"
        title="RGB color cycle">
        RGB
      </button>
    `;
    const swatches = colorChoices.map((choice) => {
      const selected = activeColor === choice.color;
      return `
        <button
          class="custom-gravel-color-swatch bubbler-color-swatch ${selected ? "is-selected" : ""}"
          type="button"
          style="--swatch:${choice.color};"
          data-cave-color-layer="${escapeHtml(layer.id)}"
          data-cave-color="${choice.color}"
          aria-pressed="${selected}"
          aria-label="Set ${escapeHtml(getCaveColorLayerLabel(layer, layers, decor))} to ${escapeHtml(choice.label)}"
          title="${escapeHtml(choice.label)}"></button>
      `;
    }).join("");

    return `
      <div class="cave-color-layer-card" data-cave-color-card="${escapeHtml(layer.id)}">
        <div class="bubbler-color-row cave-color-layer-header">
          <span>${escapeHtml(getCaveColorLayerLabel(layer, layers, decor))}</span>
          <strong data-cave-color-layer-value="${escapeHtml(layer.id)}">${escapeHtml(formatCaveColorChoiceLabel(activeColor))}</strong>
        </div>
        <div class="bubbler-color-swatches cave-color-swatches">
          <div class="color-choice-mode-row">
            ${originalTile}
            ${rgbTile}
          </div>
          <div class="color-choice-swatch-row">
            ${swatches}
          </div>
        </div>
        <label class="cave-colorize-toggle">
          <input
            type="checkbox"
            data-cave-colorize-layer="${escapeHtml(layer.id)}"
            ${colorizeChecked ? "checked" : ""} />
          <span>Colorize</span>
        </label>
      </div>
    `;
  }).join("");

  return `
    <div class="cave-color-controls">
      <div class="custom-decor-type-summary">Decor color layers use the shared color palette.</div>
      ${layerControls}
    </div>
  `;
}

function renderCustomHideBackgroundPrompt() {
  const pending = runtime.pendingCustomHideUpload;
  if (!pending?.frontDataUrl) {
    return `<div class="empty-state">Choose a front image for Custom Hide first.</div>`;
  }

  const aspectRatio = pending.frontNaturalHeight && pending.frontNaturalWidth
    ? `${Math.max(1, Number(pending.frontNaturalWidth))} / ${Math.max(1, Number(pending.frontNaturalHeight))}`
    : "1 / 1";

  return `
    <div class="custom-decor-name-panel">
      <div class="custom-decor-upload-preview">
        <img
          src="${escapeHtml(pending.frontDataUrl)}"
          alt="Uploaded custom hide front preview"
          style="aspect-ratio: ${escapeHtml(aspectRatio)};" />
      </div>
      <div class="utility-confirm-card">
        <div class="utility-confirm-copy">
          <strong>Front image selected.</strong>
          <div class="fish-meta">Choose the background image that should sit behind this front layer.</div>
        </div>
      </div>
    </div>
  `;
}

function renderCustomHideCreationOverlay() {
  const pending = buildPendingCustomHideUpload(runtime.pendingCustomHideUpload);
  runtime.pendingCustomHideUpload = pending;
  const hasFrontImage = Boolean(pending.frontDataUrl);
  const hasBackgroundImage = Boolean(pending.bgDataUrl);
  const hasBothImages = hasFrontImage && hasBackgroundImage;
  const previewItem = hasBothImages ? getPendingCustomHidePreviewItem() : null;
  const previewDecor = hasBothImages ? getPendingCustomHidePreviewDecor() : null;
  const scale = clamp(Number(pending.scale) || 1, DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  const displayWidth = hasBothImages && previewItem && previewDecor
    ? getDecorPreviewPaneWidth(previewDecor, previewItem)
    : Math.max(1, Math.round((Number(pending.width) || CUSTOM_DECOR_DEFAULT_WIDTH) * scale));
  const frontHeight = Math.max(1, Math.round(displayWidth * (pending.frontNaturalHeight / Math.max(1, pending.frontNaturalWidth))));
  const bgHeight = Math.max(1, Math.round(displayWidth * (pending.bgNaturalHeight / Math.max(1, pending.bgNaturalWidth))));
  const layerReadout = previewItem ? formatDecorSettingReadout("tankLayer", previewItem) : "Layers 3-4";
  const layerOptions = previewItem ? renderDecorLayerOptions(previewItem) : `<option selected>Layer 3</option>`;
  const caveSettings = pending.caveSettings;
  const frontAspectRatio = pending.frontNaturalHeight && pending.frontNaturalWidth
    ? `${Math.max(1, Number(pending.frontNaturalWidth))} / ${Math.max(1, Number(pending.frontNaturalHeight))}`
    : "1 / 1";
  const bgAspectRatio = pending.bgNaturalHeight && pending.bgNaturalWidth
    ? `${Math.max(1, Number(pending.bgNaturalWidth))} / ${Math.max(1, Number(pending.bgNaturalHeight))}`
    : "1 / 1";
  const uploadChooserMarkup = `
    <div class="custom-hide-upload-grid">
      <button
        class="custom-hide-upload-tile ${hasFrontImage ? "has-image" : ""}"
        type="button"
        data-choose-custom-hide-front>
        <span class="custom-hide-upload-label">Front</span>
        ${hasFrontImage
          ? `<img src="${escapeHtml(pending.frontDataUrl)}" alt="Uploaded custom hide front preview" style="aspect-ratio: ${escapeHtml(frontAspectRatio)};" />`
          : `<span class="custom-hide-upload-empty">Choose front image</span>`}
      </button>
      <button
        class="custom-hide-upload-tile ${hasBackgroundImage ? "has-image" : ""}"
        type="button"
        data-choose-custom-hide-background
        ${hasFrontImage ? "" : "disabled"}>
        <span class="custom-hide-upload-label">Background</span>
        ${hasBackgroundImage
          ? `<img src="${escapeHtml(pending.bgDataUrl)}" alt="Uploaded custom hide background preview" style="aspect-ratio: ${escapeHtml(bgAspectRatio)};" />`
          : `<span class="custom-hide-upload-empty">${hasFrontImage ? "Choose background image" : "Choose front first"}</span>`}
      </button>
    </div>
  `;
  const combinedPreviewMarkup = hasBothImages
    ? `
      <div class="custom-decor-size-window">
        <div class="custom-decor-size-stage" data-custom-hide-preview-stage>
          <div
            class="custom-decor-motion-preview custom-hide-overlay-preview"
            style="width: ${displayWidth}px; height: ${Math.max(frontHeight, bgHeight)}px;"
            data-custom-hide-preview-shell>
            <canvas
              class="custom-decor-motion-canvas"
              data-custom-hide-preview-canvas
              aria-label="Uploaded custom hide preview"></canvas>
            <img
              class="custom-decor-motion-source custom-hide-overlay-image custom-hide-overlay-bg"
              src="${escapeHtml(pending.bgDataUrl)}"
              alt="Uploaded custom hide background preview"
              data-custom-hide-bg-preview />
            <img
              class="custom-decor-motion-source custom-hide-overlay-image custom-hide-overlay-front"
              src="${escapeHtml(pending.frontDataUrl)}"
              alt="Uploaded custom hide front preview"
              data-custom-hide-front-preview />
            <div
              class="custom-hide-preview-hitbox"
              style="width: ${displayWidth}px; height: ${frontHeight}px;"
              data-custom-hide-preview-frame
              data-decor-settings-preview-frame>
              ${renderCaveSettingsMarkers(caveSettings)}
            </div>
          </div>
        </div>
        <div class="custom-fish-size-readout">
          <span>Hide Points</span>
          <strong data-custom-hide-size-label>${formatDecorScale(scale)}</strong>
        </div>
      </div>
    `
    : `
      <div class="utility-confirm-card custom-hide-upload-note">
        <div class="utility-confirm-copy">
          <strong>Choose a front and background image to continue.</strong>
          <div class="fish-meta">Once both are selected, we'll overlay them here so you can set size, layer, colors, entry points, and seats before creating the hide.</div>
        </div>
      </div>
    `;
  const controlsMarkup = hasBothImages
    ? `
      <div class="custom-decor-controls-column">
        <label class="custom-decor-name-row">
          <span>Hide Name</span>
          <input
            class="tank-name-input custom-decor-name-input"
            type="text"
            maxlength="48"
            value="${escapeHtml(pending.name || pending.suggestedName || "Custom Hide")}"
            data-wallpaper-keyboard-input="custom-hide"
            data-custom-hide-name-input
            aria-label="Custom hide name" />
          <div class="wallpaper-name-keyboard" data-wallpaper-keyboard="custom-hide" hidden aria-label="Custom hide name keyboard"></div>
        </label>
        <label class="bubbler-control-row">
          <span>Size <strong data-custom-hide-size-label>${formatDecorScale(scale)}</strong></span>
          <input
            type="range"
            min="${DECOR_SCALE_MIN}"
            max="${DECOR_SCALE_MAX}"
            step="0.01"
            value="${scale}"
            data-custom-hide-size-input />
        </label>
        <label class="bubbler-control-row">
          <span>Layer <strong>${escapeHtml(layerReadout)}</strong></span>
          <select class="shop-sort-select" data-custom-hide-setting="tankLayer" aria-label="Custom hide layer">
            ${layerOptions}
          </select>
          <em>Caves span layers 3-4 for fish entrances and interiors, so their front layer is locked.</em>
        </label>
        ${previewItem && previewDecor ? renderCaveColorSettingsControls(previewItem, previewDecor) : ""}
        ${previewItem ? renderCaveSettingsControls(previewItem) : ""}
        <div class="mini-note">This will create one custom hide for ${CUSTOM_HIDE_COST} ${pluralize("coin", CUSTOM_HIDE_COST)} and place it in storage.</div>
      </div>
    `
    : `
      <div class="custom-decor-controls-column">
        <div class="mini-note">Choose the front image first, then the background image. Creation stays locked until both are ready.</div>
      </div>
    `;

  return `
    <div class="custom-decor-name-panel decor-settings-panel">
      <div class="custom-decor-create-layout decor-settings-layout">
        <div class="custom-decor-preview-column">
          ${uploadChooserMarkup}
          ${combinedPreviewMarkup}
        </div>
        ${controlsMarkup}
      </div>
    </div>
  `;
}

function renderCaveSettingsMarkers(settings) {
  const resolved = sanitizePlacedCaveSettings(settings);
  const entryMarkers = resolved.entries.map((entry, index) => `
    <button
      class="cave-settings-marker cave-settings-entry-marker ${index === resolved.activeEntryIndex ? "is-active" : ""}"
      type="button"
      style="left: ${(entry.x * 100).toFixed(2)}%; top: ${(entry.y * 100).toFixed(2)}%;"
      data-cave-entry-select="${index}"
      data-cave-settings-entry-marker="${index}"
      aria-label="Select cave entry ${index + 1}"
      title="Entry ${index + 1}">
      ${index + 1}
    </button>
  `).join("");
  const seatMarkers = resolved.seats.map((seat, index) => `
    <button
      class="cave-settings-marker cave-settings-seat-marker ${index === resolved.activeSeatIndex ? "is-active" : ""}"
      type="button"
      style="left: ${(seat.x * 100).toFixed(2)}%; top: ${(seat.y * 100).toFixed(2)}%;"
      data-cave-seat-select="${index}"
      data-cave-settings-seat-marker="${index}"
      aria-label="Select cave seat ${index + 1}"
      title="Seat ${index + 1}">
      ${index + 1}
    </button>
  `).join("");

  return `
    ${entryMarkers}
    ${seatMarkers}
  `;
}

function renderCaveSettingsControls(item) {
  const settings = getPlacedCaveSettings(item) || sanitizePlacedCaveSettings();
  const entryCountOptions = Array.from({ length: CAVE_SETTINGS_MAX_ENTRIES - CAVE_SETTINGS_MIN_ENTRIES + 1 }, (_, index) => {
    const count = CAVE_SETTINGS_MIN_ENTRIES + index;
    return `<option value="${count}" ${settings.entryCount === count ? "selected" : ""}>${count}</option>`;
  }).join("");
  const seatCountOptions = Array.from({ length: CAVE_SETTINGS_MAX_SEATS - CAVE_SETTINGS_MIN_SEATS + 1 }, (_, index) => {
    const count = CAVE_SETTINGS_MIN_SEATS + index;
    return `<option value="${count}" ${settings.seatCount === count ? "selected" : ""}>${count}</option>`;
  }).join("");
  const entryControls = settings.entries.map((entry, index) => {
    const active = index === settings.activeEntryIndex;
    const side = normalizeCaveEntrySide(entry.side);
    const sideOptions = CAVE_ENTRY_SIDE_OPTIONS.map((option) => `
      <option value="${escapeHtml(option.id)}" ${side === option.id ? "selected" : ""}>
        ${escapeHtml(option.label)}
      </option>
    `).join("");
    return `
      <div class="cave-seat-card cave-entry-card ${active ? "is-active" : ""}" data-cave-entry-card="${index}">
        <div class="cave-seat-card-header">
          <button class="small-button alt cave-seat-select-button" type="button" data-cave-entry-select="${index}">
            Entry ${index + 1}
          </button>
          <strong>${active ? "Active" : ""}</strong>
        </div>
        <label class="custom-decor-name-row cave-entry-side-row">
          <span>Side</span>
          <select class="shop-sort-select" data-cave-setting="entrySide" data-cave-entry-index="${index}" aria-label="Cave entry ${index + 1} side">
            ${sideOptions}
          </select>
        </label>
        <label class="bubbler-control-row cave-coordinate-row">
          <span>X <strong data-cave-setting-value="entryX" data-cave-entry-index="${index}">${formatCaveSettingPercent(entry.x)}</strong></span>
          <input
            type="range"
            min="0.02"
            max="0.98"
            step="0.01"
            value="${entry.x}"
            data-cave-setting="entryX"
            data-cave-entry-index="${index}" />
        </label>
        <label class="bubbler-control-row cave-coordinate-row">
          <span>Y <strong data-cave-setting-value="entryY" data-cave-entry-index="${index}">${formatCaveSettingPercent(entry.y)}</strong></span>
          <input
            type="range"
            min="0.02"
            max="0.98"
            step="0.01"
            value="${entry.y}"
            data-cave-setting="entryY"
            data-cave-entry-index="${index}" />
        </label>
      </div>
    `;
  }).join("");
  const seatControls = settings.seats.map((seat, index) => {
    const active = index === settings.activeSeatIndex;
    const facing = normalizeCaveSeatFacing(seat.facing);
    return `
      <div class="cave-seat-card ${active ? "is-active" : ""}" data-cave-seat-card="${index}">
        <div class="cave-seat-card-header">
          <button class="small-button alt cave-seat-select-button" type="button" data-cave-seat-select="${index}">
            Seat ${index + 1}
          </button>
          <div class="cave-seat-card-actions">
            <div class="cave-seat-facing-toggle" role="group" aria-label="Seat ${index + 1} facing">
              <button
                class="cave-seat-facing-button ${facing < 0 ? "is-selected" : ""}"
                type="button"
                data-cave-seat-facing="-1"
                data-cave-seat-index="${index}"
                aria-pressed="${facing < 0 ? "true" : "false"}"
                title="Face left">&lt;</button>
              <button
                class="cave-seat-facing-button ${facing > 0 ? "is-selected" : ""}"
                type="button"
                data-cave-seat-facing="1"
                data-cave-seat-index="${index}"
                aria-pressed="${facing > 0 ? "true" : "false"}"
                title="Face right">&gt;</button>
            </div>
            <strong>${active ? "Active" : ""}</strong>
          </div>
        </div>
        <label class="bubbler-control-row cave-coordinate-row">
          <span>X <strong data-cave-setting-value="seatX" data-cave-seat-index="${index}">${formatCaveSettingPercent(seat.x)}</strong></span>
          <input
            type="range"
            min="0.02"
            max="0.98"
            step="0.01"
            value="${seat.x}"
            data-cave-setting="seatX"
            data-cave-seat-index="${index}" />
        </label>
        <label class="bubbler-control-row cave-coordinate-row">
          <span>Y <strong data-cave-setting-value="seatY" data-cave-seat-index="${index}">${formatCaveSettingPercent(seat.y)}</strong></span>
          <input
            type="range"
            min="0.02"
            max="0.98"
            step="0.01"
            value="${seat.y}"
            data-cave-setting="seatY"
            data-cave-seat-index="${index}" />
        </label>
      </div>
    `;
  }).join("");

  return `
    <div class="cave-settings-controls">
      <label class="bubbler-control-row">
        <span>Entries <strong data-cave-setting-value="entryCount">${settings.entryCount}</strong></span>
        <select class="shop-sort-select" data-cave-setting="entryCount" aria-label="Cave entry count">
          ${entryCountOptions}
        </select>
      </label>
      <div class="cave-entry-list">
        ${entryControls}
      </div>
      <label class="bubbler-control-row">
        <span>Seats <strong data-cave-setting-value="seatCount">${settings.seatCount}</strong></span>
        <select class="shop-sort-select" data-cave-setting="seatCount" aria-label="Cave seat count">
          ${seatCountOptions}
        </select>
      </label>
      <div class="cave-seat-list">
        ${seatControls}
      </div>
    </div>
  `;
}

function renderDecorSettingsOverlay(item) {
  if (!item) {
    return `<div class="empty-state">Select a placed decor item first.</div>`;
  }

  const decor = runtime.decorMap.get(item.decorKey);
  if (!decor) {
    return `<div class="empty-state">That decor could not be found.</div>`;
  }

  if (isTransitTubeDecorKey(item.decorKey)) {
    const currentTank = getTankContainingDecor(item.id);
    const linked = getAllTransitTubes().find((entry) => entry.item.id === item.transitTubeLinkedId);
    const options = getAllTransitTubes()
      .filter((entry) => entry.item.id !== item.id)
      .map((entry) => `<option value="${escapeHtml(entry.item.id)}" ${linked?.item.id === entry.item.id ? "selected" : ""}>${escapeHtml(getTransitTubeDisplayName(entry.item, entry.tank))} — ${escapeHtml(getTankLabel(entry.tank))}</option>`)
      .join("");
    const activeColor = normalizeDecorColorSetting(item.transitTubeColor || "");
    const colorSwatches = getCustomGravelColorChoices().map((choice) => `<button class="custom-gravel-color-swatch bubbler-color-swatch ${activeColor === choice.color ? "is-selected" : ""}" type="button" style="--swatch:${choice.color}" data-transit-tube-color="${choice.color}" aria-pressed="${activeColor === choice.color}" title="${escapeHtml(choice.label)}"></button>`).join("");
    return `<div class="custom-decor-name-panel decor-settings-panel transit-tube-settings"><div class="custom-decor-create-layout decor-settings-layout"><div class="custom-decor-preview-column"><div class="custom-decor-size-window"><img class="transit-tube-settings-preview" src="${escapeHtml(getDecorThumbnailPath(decor))}" alt="Clear transit tube"></div><div class="mini-note">Fish use a linked pair as a shortcut when traveling to services or home. Bubbles only run during transit.</div></div><div class="custom-decor-controls-column"><label class="custom-decor-name-row"><span>Tube name</span><input type="text" maxlength="36" value="${escapeHtml(getTransitTubeDisplayName(item, currentTank))}" data-transit-tube-name="${escapeHtml(item.id)}"></label><label class="custom-decor-name-row"><span>Connect to</span><select class="shop-sort-select" data-transit-tube-link="${escapeHtml(item.id)}"><option value="">Not connected</option>${options}</select></label><div class="custom-decor-type-summary">${linked ? `Linked to ${escapeHtml(getTransitTubeDisplayName(linked.item, linked.tank))} in ${escapeHtml(getTankLabel(linked.tank))}.` : "Place another tube in a different neighborhood, then select it here."}</div><div class="bubbler-color-row"><span>Glass color</span><strong>${escapeHtml(formatCaveColorChoiceLabel(activeColor))}</strong></div><div class="bubbler-color-swatches"><button class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${!activeColor ? "is-selected" : ""}" type="button" data-transit-tube-color="" aria-pressed="${!activeColor}">Original</button>${colorSwatches}</div></div></div></div>`;
  }

  const imageSrc = escapeHtml(getDecorThumbnailPath(decor));
  const capabilities = getDecorMotionCapabilities(item);
  const motionSettings = getPlacedDecorMotionSettings(item);
  const hasMotionControls = capabilities.hasBob || capabilities.hasSway;
  const hasBubblerControls = canConfigureDecorBubbler(item);
  const hasCaveControls = isCaveDecorKey(item.decorKey);
  const hasCaveColorControls = hasDecorCaveColorLayers(decor);
  const caveSettings = hasCaveControls ? (getPlacedCaveSettings(item) || sanitizePlacedCaveSettings()) : null;
  const sizeValue = clamp(Number(item.scale) || getDecorScaleDefault(item.decorKey), DECOR_SCALE_MIN, DECOR_SCALE_MAX);
  const layerReadout = formatDecorSettingReadout("tankLayer", item);
  const layerOptions = renderDecorLayerOptions(item);
  const layerHelpText = isCaveDecorKey(item.decorKey)
    ? "Caves span layers 3-4 for fish entrances and interiors, so their front layer is locked."
    : "Layer 1 draws closest to the glass. Layer 5 draws deepest in the tank.";
  const swaySideOptions = DECOR_SWAY_SIDE_OPTIONS.map((option) => `
    <option value="${escapeHtml(option.id)}" ${motionSettings.swaySide === option.id ? "selected" : ""}>
      ${escapeHtml(option.label)}
    </option>
  `).join("");
  const motionControls = hasMotionControls ? `
    <div class="custom-decor-type-summary">${escapeHtml(capabilities.summary)}</div>
    ${capabilities.hasSway ? `
      <label class="custom-decor-name-row">
        <span>Sway Area</span>
        <select class="shop-sort-select" data-decor-setting="swaySide" aria-label="Decor sway area">
          ${swaySideOptions}
        </select>
      </label>
      <label class="bubbler-control-row">
        <span>Sway Starts <strong data-decor-setting-value="swaySplitY">${Math.round(motionSettings.swaySplitY * 100)}%</strong></span>
        <input
          type="range"
          min="8"
          max="92"
          step="1"
          value="${Math.round(motionSettings.swaySplitY * 100)}"
          data-decor-setting="swaySplitY" />
      </label>
      <label class="bubbler-control-row">
        <span>Sway Intensity <strong data-decor-setting-value="swayIntensity">${motionSettings.swayIntensity.toFixed(2)}x</strong></span>
        <input
          type="range"
          min="${MIN_CUSTOM_DECOR_MOTION_INTENSITY}"
          max="${MAX_CUSTOM_DECOR_MOTION_INTENSITY}"
          step="0.05"
          value="${motionSettings.swayIntensity}"
          data-decor-setting="swayIntensity" />
      </label>
      <label class="bubbler-control-row">
        <span>Sway Speed <strong data-decor-setting-value="swaySpeed">${motionSettings.swaySpeed.toFixed(2)}x</strong></span>
        <input
          type="range"
          min="${MIN_DECOR_MOTION_SPEED}"
          max="${MAX_DECOR_MOTION_SPEED}"
          step="0.05"
          value="${motionSettings.swaySpeed}"
          data-decor-setting="swaySpeed" />
      </label>
    ` : ""}
    ${capabilities.hasBob ? `
      <label class="bubbler-control-row">
        <span>Bob Intensity <strong data-decor-setting-value="bobIntensity">${motionSettings.bobIntensity.toFixed(2)}x</strong></span>
        <input
          type="range"
          min="${MIN_CUSTOM_DECOR_MOTION_INTENSITY}"
          max="${MAX_CUSTOM_DECOR_MOTION_INTENSITY}"
          step="0.05"
          value="${motionSettings.bobIntensity}"
          data-decor-setting="bobIntensity" />
      </label>
      <label class="bubbler-control-row">
        <span>Bob Speed <strong data-decor-setting-value="bobSpeed">${motionSettings.bobSpeed.toFixed(2)}x</strong></span>
        <input
          type="range"
          min="${MIN_DECOR_MOTION_SPEED}"
          max="${MAX_DECOR_MOTION_SPEED}"
          step="0.05"
          value="${motionSettings.bobSpeed}"
          data-decor-setting="bobSpeed" />
      </label>
    ` : ""}
  ` : hasBubblerControls
    ? `<div class="mini-note">The object stays still while the bubble stream preview updates live.</div>`
    : hasCaveControls
      ? ""
      : `<div class="mini-note">This decor is still, so only size is available.</div>`;
  const controlsMarkup = `
    <div class="custom-decor-controls-column">
      <label class="bubbler-control-row">
        <span>Size <strong data-decor-setting-value="size">${formatDecorScale(sizeValue)}</strong></span>
        <input
          type="range"
          min="${DECOR_SCALE_MIN}"
          max="${DECOR_SCALE_MAX}"
          step="0.01"
          value="${sizeValue}"
          data-decor-setting="size" />
      </label>
      <label class="bubbler-control-row">
        <span>Layer <strong data-decor-setting-value="tankLayer">${escapeHtml(layerReadout)}</strong></span>
        <select class="shop-sort-select" data-decor-setting="tankLayer" aria-label="Decor layer">
          ${layerOptions}
        </select>
        <em>${escapeHtml(layerHelpText)}</em>
      </label>
      ${motionControls}
      ${hasCaveColorControls ? renderCaveColorSettingsControls(item, decor) : ""}
      ${hasCaveControls ? renderCaveSettingsControls(item) : ""}
      ${hasBubblerControls ? renderBubblerSettingsOverlay(item) : ""}
    </div>
  `;

  return `
    <div class="custom-decor-name-panel decor-settings-panel">
      <div class="custom-decor-create-layout decor-settings-layout">
        <div class="custom-decor-preview-column">
          <div class="custom-decor-size-window">
            <div class="custom-decor-size-stage">
              <div
                class="custom-decor-motion-preview decor-settings-motion-preview"
                data-decor-settings-preview-frame>
                <canvas
                  class="custom-decor-motion-canvas"
                  data-decor-settings-preview-canvas
                  aria-label="Selected decor animated preview"></canvas>
                <img
                  class="custom-decor-motion-source"
                  src="${imageSrc}"
                  alt="Selected decor preview"
                  data-decor-settings-preview />
                ${capabilities.hasSway ? `<div class="custom-decor-motion-split-line" style="top: ${(motionSettings.swaySplitY * 100).toFixed(2)}%;" data-decor-settings-split-line></div>` : ""}
                ${hasCaveControls ? renderCaveSettingsMarkers(caveSettings) : ""}
              </div>
            </div>
            <div class="custom-fish-size-readout">
              <span>${escapeHtml(hasCaveControls ? "Cave Points" : hasBubblerControls ? "Live Preview" : capabilities.label || "Preview")}</span>
              <strong>${escapeHtml(formatDecorScale(sizeValue))}</strong>
            </div>
          </div>
        </div>
        ${controlsMarkup}
      </div>
    </div>
  `;
}
