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
    const switchTankDisclaimer = "Use Overview to navigate the borough, or the arrow keys to move through adjacent neighborhoods.";

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
  return null;
}

function buildManagementCareQueue(stats) {
  // Care tasks are disabled; tank conditions remain available in the snapshot.
  return [];
}

function buildUniversalManagementCareQueue(now = Date.now()) {
  return [];
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
  return false;
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
  if (dom.careTaskPane) dom.careTaskPane.hidden = true;
  if (dom.careTaskList) dom.careTaskList.textContent = "";
  resetCareTaskPaneRuntime([], "borough");
}

function setCareTaskPaneOpen(open) {
  // Ignore legacy saved preferences and callers that attempt to reopen tasks.
  if (state?.uiSettings) state.uiSettings.careTaskPaneOpen = false;
  renderCareTaskPane();
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
        <img class="management-milestone-icon" ${assetImageAttributes(getMilestoneIconPath(milestone.id))} alt="${escapeHtml(`${milestone.label} medal`)}" />
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
    case "coral":
      return "Coral";
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
  const canBuyAnother = isCustomFishAssetKey(fish.speciesId)
    ? isFishSpeciesShopUnlocked(CUSTOM_FISH_SHOP_KEY)
    : isFishSpeciesShopUnlocked(baseSpecies);
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
      <img class="management-browser-thumb management-browser-thumb-fish" ${assetImageAttributes(fishAsset)} alt="${escapeHtml(fish.name)}" />
      <div class="management-browser-copy">
        <strong>${escapeHtml(fish.name)}</strong>
        <span>${escapeHtml(getFishDisplaySpeciesName(fish, species))}</span>
        <small>${escapeHtml(status)}</small>
      </div>
      <div class="management-browser-actions">
        <button class="small-button alt" type="button" data-management-select-fish="${escapeHtml(fish.id)}">Select</button>
        <button class="small-button alt" type="button" data-management-store-fish="${escapeHtml(fish.id)}" ${canStore ? "" : "disabled"}>Put Away</button>
        <button class="small-button alt" type="button" data-management-buy-another-fish="${escapeHtml(fish.id)}" ${canBuyAnother ? "" : "disabled"}>Buy Another</button>
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
  const resaleValue = getResaleValue(decor?.cost || 0);
  const canBuyAnother = canUseDecorWithCurrentContentSettings(item.decorKey)
    && isDecorShopUnlocked(item.decorKey) && isSeasonalDecorAvailable(decor);
  const serviceTypes = getDecorBoroughServiceTypes(item);
  const serviceSeatStatus = serviceTypes.length
    ? `Seats ${getDecorBoroughServiceSeatUsage(item)}/${getDecorBoroughServiceSeats(item).length}`
    : (grouped ? "Grouped decor" : "Placed in tank");

  return `
    <article class="management-browser-item">
      <img class="management-browser-thumb management-browser-thumb-decor" ${assetImageAttributes(getDecorThumbnailPath(decor))} alt="${escapeHtml(decor.name)}"${isDecorHorizontallyFlipped(item) || isDecorVerticallyFlipped(item) ? ` style="transform: scale(${isDecorHorizontallyFlipped(item) ? -1 : 1}, ${isDecorVerticallyFlipped(item) ? -1 : 1});"` : ""} />
      <div class="management-browser-copy">
        <strong>${escapeHtml(decor.name)}</strong>
        <span>${escapeHtml(`Layer ${getDecorTankLayer(item)} / ${formatDecorScale(item.scale)}`)}</span>
        <small>${escapeHtml(serviceSeatStatus)}</small>
      </div>
      <div class="management-browser-actions">
        <button class="small-button alt" type="button" data-management-select-decor="${escapeHtml(item.id)}">Select</button>
        <button class="small-button alt" type="button" data-management-store-decor="${escapeHtml(item.id)}" ${grouped ? "disabled" : ""}>Put Away</button>
        <button class="small-button alt" type="button" data-management-buy-another-decor="${escapeHtml(item.decorKey)}" ${canBuyAnother ? "" : "disabled"}>Buy Another</button>
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
  const maxDirtyInMs = Math.max(0, (1 - dirtiness) * getTankMaxDirtyDurationMs());
  const grimeLoad = Math.round((getTankFishDirtinessMultiplier() - 1) * 100);
  const feedingCare = getDailyFeedingCareStatus(tank, now);
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
    feedingCareEligible: feedingCare.eligibleCoins,
    feedingCareEarned: feedingCare.earned,
    feedingCareCap: FISH_DAILY_FEEDING_CARE_COIN_CAP,
    currentMealServed: hungerStable,
    deadFish,
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
        </div>
        <div class="management-care-body">
          <div class="management-snapshot-stats">
            ${buildManagementSnapshotStat("Hunger", stats.mealStatus, mealsTone)}
            ${buildManagementSnapshotStat("Health", healthValue, healthTone)}
            ${buildManagementSnapshotStat("Cleanliness", `${stats.cleanPercent}%`, cleanlinessTone)}
            ${buildManagementSnapshotStat("Waste", wasteValue, stats.wasteCount > 0 ? "warn" : stats.pendingWasteCount > 0 ? "neutral" : "")}
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
      const titleActions = typeof options.renderTitleActions === "function"
        ? options.renderTitleActions(item, decor)
        : String(options.titleActions || "");
      const headerActions = typeof options.renderHeaderActions === "function"
        ? options.renderHeaderActions(item, decor)
        : String(options.headerActions || "");
      return {
        kicker: String(options.kicker || "Decor"),
        title: item ? getPlacedDecorDisplayName(item, decor) : (decor?.name || options.fallbackTitle || "Decor Settings"),
        titleActions,
        headerActions,
        body: options.renderBody(item),
        footer: options.hideFooter ? "" : buildUtilityCloseFooter(options.footerLabel || "Done", "alt"),
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
            <span>Nathan Arcuri.</span>
          </div>
          <div class="credits-row">
            <strong>LLM assistance</strong>
            <span>ChatGPT.</span>
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
            <span>Bubble Borough is free-to-play. Optional donations are appreciated and handled through Buy Me a Coffee.</span>
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

function normalizeLegalOverlayTab(value) {
  const tab = String(value || "").trim().toLowerCase();
  return ["privacy", "terms", "services", "licenses"].includes(tab) ? tab : "privacy";
}

function renderLegalOverlayTabs(activeTab) {
  const selected = normalizeLegalOverlayTab(activeTab);
  const tabs = [
    ["privacy", "Privacy Policy"],
    ["terms", "Terms of Service"],
    ["services", "Data & Services"],
    ["licenses", "Licenses"]
  ];
  return `
    <div class="legal-tabs" role="tablist" aria-label="Legal information">
      ${tabs.map(([id, label]) => `<button class="legal-tab-button ${selected === id ? "is-active" : ""}" type="button" role="tab" aria-selected="${selected === id ? "true" : "false"}" data-legal-tab="${id}">${escapeHtml(label)}</button>`).join("")}
    </div>
  `;
}

function renderLegalPrivacyPolicy() {
  return `
    <article class="legal-document" aria-labelledby="legalPrivacyTitle">
      <header class="legal-document-heading">
        <div>
          <p class="legal-document-eyebrow">Last updated 09/13/2026</p>
          <h3 id="legalPrivacyTitle">Privacy Policy</h3>
        </div>
        <span class="legal-document-badge">Bubble Borough</span>
      </header>

      <section>
        <h4>Who operates Bubble Borough</h4>
        <p>Bubble Borough is operated by <strong>Nathan Arcuri</strong>. Questions about privacy, account data, or deletion requests can be sent to <strong>Dev@BubbleBorough.com</strong>.</p>
      </section>

      <section>
        <h4>Information used by Bubble Borough</h4>
        <ul>
          <li><strong>Account information:</strong> your email address, Supabase account identifier, and the username you enter.</li>
          <li><strong>Authentication information:</strong> passwords and authentication credentials are handled through Supabase Auth. Authentication credentials are not stored inside your Bubble Borough game save.</li>
          <li><strong>Cloud save information:</strong> your game progress, aquarium state, settings, inventory, timestamps, profile information stored in the save, and other gameplay data needed to synchronize or restore your aquarium.</li>
          <li><strong>Custom content:</strong> images you import for custom fish, decor, hides, or backgrounds, along with names and related settings. Custom images can be embedded in your cloud save as image data.</li>
          <li><strong>Local game information:</strong> Bubble Borough also uses browser storage, including local storage and IndexedDB, for local game data, session-related information, backups, and custom image storage.</li>
          <li><strong>Information you choose to submit:</strong> information you send through Feedback, email, or other contact methods.</li>
        </ul>
      </section>

      <section>
        <h4>How information is used</h4>
        <p>Information is used to create and authenticate accounts, synchronize and restore cloud saves, deliver account emails, provide custom-content features, protect account access, troubleshoot problems, respond to support or deletion requests, and operate Bubble Borough.</p>
      </section>

      <section>
        <h4>Custom images and private content</h4>
        <p>Bubble Borough allows you to import your own images for custom game content. The game does not provide a public gallery or moderation feed for those images, and imported images are not intentionally published to other players. When included in cloud saving, image files are stored as encoded image data inside the save associated with your account. <strong>Base64 encoding is not encryption.</strong></p>
        <p>Bubble Borough sends cloud-save requests using your authenticated Supabase session and requests the save associated with the signed-in account. Service administration may still provide access to stored data when reasonably necessary to maintain, secure, troubleshoot, or comply with legal obligations.</p>
      </section>

      <section>
        <h4>Service providers</h4>
        <p><strong>Supabase</strong> provides authentication, account management, and cloud save storage. <strong>Resend</strong> is currently used for transactional account email delivery through the Supabase email configuration. Feedback may open <strong>Google Forms</strong>. Optional donations are handled by <strong>Buy Me a Coffee</strong>. External links may also open <strong>nathanarcuri.com</strong>. Each external service has its own privacy practices.</p>
        <p>Supabase, Resend, and other infrastructure providers may process technical information such as IP addresses, browser or device information, timestamps, authentication events, request logs, and email-delivery logs as part of operating and securing their services.</p>
      </section>

      <section>
        <h4>Analytics, advertising, and sale of information</h4>
        <p>Bubble Borough does not currently include third-party analytics or behavioral tracking code in the game client, does not contain third-party advertising, and does not sell your personal information.</p>
      </section>

      <section>
        <h4>Account requirement and cloud saving</h4>
        <p>A Bubble Borough account is currently required to access the game, and cloud saving is part of the signed-in experience. Local browser data may also be used for performance, recovery, and backup purposes.</p>
      </section>

      <section>
        <h4>Children and families</h4>
        <p>Bubble Borough's game content is intended for a general audience and may be enjoyed by users of all ages. Because the online service requires an account and email address, children should use Bubble Borough with the involvement of a parent or guardian where required by applicable law. Bubble Borough does not use account or gameplay information for targeted advertising or behavioral profiling.</p>
      </section>

      <section>
        <h4>Retention and deletion</h4>
        <p>Account and cloud save information is generally retained while the account and service remain available, subject to Supabase storage, retention, and service limits. To request deletion of your Bubble Borough account and associated cloud save data, email <strong>Dev@BubbleBorough.com</strong> from, or identify, the account email address. Additional verification may be required before deletion is completed.</p>
        <p>Deleting cloud data does not necessarily erase local browser data already stored on a device. Local copies can be removed by clearing Bubble Borough site data in that browser.</p>
      </section>

      <section>
        <h4>Security</h4>
        <p>Reasonable technical measures are used to protect account and cloud save information, including authenticated access to cloud services. No online system can guarantee absolute security.</p>
      </section>

      <section>
        <h4>Changes to this policy</h4>
        <p>This policy may be updated as Bubble Borough changes. The date at the top of this page will be updated when material changes are made.</p>
      </section>
    </article>
  `;
}

function renderLegalTermsOfService() {
  return `
    <article class="legal-document" aria-labelledby="legalTermsTitle">
      <header class="legal-document-heading">
        <div>
          <p class="legal-document-eyebrow">Last updated 09/13/2026</p>
          <h3 id="legalTermsTitle">Terms of Service</h3>
        </div>
        <span class="legal-document-badge">Bubble Borough</span>
      </header>

      <section>
        <h4>Using Bubble Borough</h4>
        <p>These Terms of Service apply when you access or use Bubble Borough. Bubble Borough is operated by Nathan Arcuri. By creating an account or using the service, you agree to follow these terms.</p>
      </section>

      <section>
        <h4>Your account</h4>
        <p>A signed-in account is currently required to access Bubble Borough. You are responsible for the accuracy of information you provide, keeping your sign-in credentials secure, and activity performed through your account. Do not attempt to access another person's account or bypass account security.</p>
      </section>

      <section>
        <h4>Game license and ownership</h4>
        <p>Bubble Borough and its original code, artwork, interface, writing, game systems, names, and other original content are owned by Nathan Arcuri unless otherwise noted. You receive a personal, limited, revocable, non-transferable license to use Bubble Borough for its intended purpose. You may not sell, redistribute, impersonate, or commercially exploit Bubble Borough or its original assets without permission.</p>
      </section>

      <section>
        <h4>Your custom content</h4>
        <p>Bubble Borough lets you import images and other custom content for private use in your aquarium. You are responsible for the content you import and for having any rights or permissions needed to use it. Do not use the service to store content that is unlawful, malicious, or infringes another person's rights.</p>
        <p>Custom content is not proactively reviewed or moderated through an in-game moderation system. You grant Bubble Borough only the permission reasonably necessary to process, display, store, synchronize, back up, and restore the custom content needed to provide the feature you chose to use. If unlawful content or abuse is brought to the operator's attention, access or content may be restricted when reasonably necessary.</p>
      </section>

      <section>
        <h4>Acceptable use</h4>
        <p>Do not use Bubble Borough to break the law, interfere with the service, probe or bypass security, distribute malicious software, abuse account systems, send unwanted invitations, or deliberately disrupt other users or infrastructure.</p>
      </section>

      <section>
        <h4>Cloud saves and availability</h4>
        <p>Cloud saving is currently part of the required signed-in experience. Synchronization may occasionally be unavailable, delayed, interrupted, or limited by third-party services. Keep exported backups of save data that is important to you. Bubble Borough may be changed, suspended, or discontinued, and specific features may be added, removed, or modified over time.</p>
      </section>

      <section>
        <h4>Free-to-play and donations</h4>
        <p>Bubble Borough is currently free-to-play. Optional donations through Buy Me a Coffee are voluntary and do not purchase in-game goods, ownership rights, guaranteed service, or special account privileges unless a specific offer clearly states otherwise.</p>
      </section>

      <section>
        <h4>Third-party services and links</h4>
        <p>Bubble Borough relies on third-party services for authentication, cloud storage, email delivery, feedback, and optional external links. These include Supabase, Resend, Google Forms, Buy Me a Coffee, and links to nathanarcuri.com. Those services operate under their own terms and privacy policies. Bubble Borough is not responsible for third-party websites or services you choose to visit.</p>
      </section>

      <section>
        <h4>No warranty</h4>
        <p>Bubble Borough is provided on an "as available" basis. To the fullest extent permitted by law, no guarantee is made that the game will always be available, error-free, secure, or compatible with every device or browser.</p>
      </section>

      <section>
        <h4>Limitation of liability</h4>
        <p>To the fullest extent permitted by law, Bubble Borough and its creator will not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost data, lost progress, lost profits, or service interruption arising from use of the game.</p>
      </section>

      <section>
        <h4>Account deletion</h4>
        <p>You may request deletion of your Bubble Borough account and associated cloud save data by emailing <strong>Dev@BubbleBorough.com</strong>. Verification of account ownership may be required before a deletion request is completed.</p>
      </section>

      <section>
        <h4>Enforcement and changes</h4>
        <p>Access may be limited or terminated when reasonably necessary to protect the service, enforce these terms, or comply with law. These terms may be updated as Bubble Borough changes. Continued use after updated terms take effect means you accept the revised terms.</p>
      </section>
    </article>
  `;
}

function renderLegalDataServices() {
  return `
    <article class="legal-document legal-services-document" aria-labelledby="legalServicesTitle">
      <header class="legal-document-heading">
        <div>
          <p class="legal-document-eyebrow">Plain-language transparency</p>
          <h3 id="legalServicesTitle">Data & Services</h3>
        </div>
        <span class="legal-document-badge">Quick view</span>
      </header>

      <p class="legal-lead">This page is the short version of what happens when Bubble Borough connects to online services.</p>

      <div class="legal-service-grid">
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Operator</strong><span class="legal-status-pill is-local">Nathan Arcuri</span></div>
          <p>Bubble Borough is independently operated by Nathan Arcuri. Privacy and account deletion requests can be sent to Dev@BubbleBorough.com.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Authentication</strong><span class="legal-status-pill">Supabase</span></div>
          <p>Your email address and authentication credentials are handled through Supabase Auth for sign-in, verification, password reset, email changes, and account security.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Cloud saves</strong><span class="legal-status-pill">Supabase</span></div>
          <p>Signing in is required to play, and your Bubble Borough save is synchronized to Supabase as part of the account experience.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Custom images</strong><span class="legal-status-pill">Account save</span></div>
          <p>Custom fish, decor, hides, and background images can be stored as encoded image data inside your cloud save. They are not intentionally published to other players. Base64 encoding is not encryption.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Account email</strong><span class="legal-status-pill">Resend</span></div>
          <p>Verification, password reset, email change, and similar transactional messages are delivered through the email provider configured for Supabase, currently Resend.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Local storage</strong><span class="legal-status-pill is-local">Your device</span></div>
          <p>Bubble Borough uses browser storage for local game data, backups, session-related information, and custom image storage.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Analytics</strong><span class="legal-status-pill is-none">None</span></div>
          <p>The current game client does not include third-party analytics or behavioral tracking code.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Advertising</strong><span class="legal-status-pill is-none">None</span></div>
          <p>Bubble Borough does not currently contain third-party advertising.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Data sales</strong><span class="legal-status-pill is-none">No</span></div>
          <p>Bubble Borough does not sell your personal information.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Donations</strong><span class="legal-status-pill is-external">Buy Me a Coffee</span></div>
          <p>Bubble Borough is free-to-play. The Pizza Me link opens Buy Me a Coffee for optional donations.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>External links</strong><span class="legal-status-pill is-external">When opened</span></div>
          <p>Feedback can open Google Forms, Visit My Site opens nathanarcuri.com, and Pizza Me opens Buy Me a Coffee. Their own privacy practices apply after you leave Bubble Borough.</p>
        </div>
        <div class="legal-service-card">
          <div class="legal-service-card-heading"><strong>Account deletion</strong><span class="legal-status-pill is-local">By request</span></div>
          <p>Email Dev@BubbleBorough.com to request deletion of your account and associated cloud save data. Verification may be required.</p>
        </div>
      </div>

      <div class="legal-callout">
        <strong>What is tied to your account?</strong>
        <p>Your authenticated account is connected to its cloud save. That save can include your username, aquarium progress, settings, inventory, custom fish and decor data, imported images, and other gameplay state.</p>
      </div>
    </article>
  `;
}

function renderLegalLicenses() {
  return `
    <article class="legal-document" aria-labelledby="legalLicensesTitle">
      <header class="legal-document-heading">
        <div>
          <p class="legal-document-eyebrow">Attribution and third-party material</p>
          <h3 id="legalLicensesTitle">Licenses</h3>
        </div>
        <span class="legal-document-badge">Bubble Borough</span>
      </header>

      <section>
        <h4>Bubble Borough original content</h4>
        <p>Unless otherwise identified, original Bubble Borough code, game design, interface design, writing, and game assets are &copy; 2026 Nathan Arcuri. All rights reserved.</p>
      </section>

      <section>
        <h4>Sound effects</h4>
        <p>Some sound effects used by Bubble Borough were obtained from Pixabay and remain subject to the license terms that applied to those assets when obtained.</p>
      </section>

      <section>
        <h4>LLM assistance</h4>
        <p>Bubble Borough was developed with ChatGPT assistance. Artwork generated with ChatGPT was selected, edited, and integrated into the game by Nathan Arcuri.</p>
      </section>

      <section>
        <h4>Supabase</h4>
        <p>Bubble Borough uses Supabase for authentication and cloud save services. Supabase names, trademarks, services, and software remain subject to their respective owners and applicable terms or licenses.</p>
      </section>

      <section>
        <h4>Resend</h4>
        <p>Resend is used as the configured transactional email delivery provider for account-related messages. Resend's service, name, and trademarks remain the property of their respective owners.</p>
      </section>

      <section>
        <h4>Third-party websites and tools</h4>
        <p>Photopea is used as an editing tool during development. Feedback may open Google Forms, optional donations open Buy Me a Coffee, and the Visit My Site button opens nathanarcuri.com. These services and websites are governed by their own terms where applicable.</p>
      </section>

      <div class="legal-callout">
        <strong>Need a specific attribution?</strong>
        <p>Email Dev@BubbleBorough.com if you believe a required credit or license notice is missing.</p>
      </div>
    </article>
  `;
}

function renderLegalUtilityOverlay() {
  const activeTab = normalizeLegalOverlayTab(runtime.legalOverlayTab);
  const content = activeTab === "terms"
    ? renderLegalTermsOfService()
    : activeTab === "services"
      ? renderLegalDataServices()
      : activeTab === "licenses"
        ? renderLegalLicenses()
        : renderLegalPrivacyPolicy();
  return {
    kicker: "Legal",
    title: "Bubble Borough",
    headerActions: renderLegalOverlayTabs(activeTab),
    body: `
      <div class="legal-overlay-shell">
        <div class="legal-tab-panel" role="tabpanel">${content}</div>
      </div>
    `,
    footer: "",
    closable: true
  };
}

function handleLegalUtilityOverlayBodyClick(ctx, target, event) {
  const button = target.closest("[data-legal-tab]");
  if (!(button instanceof HTMLButtonElement)) {
    return false;
  }
  event?.preventDefault?.();
  runtime.legalOverlayTab = normalizeLegalOverlayTab(button.dataset.legalTab);
  renderUtilityOverlay();
  if (dom.utilityOverlayBody) {
    dom.utilityOverlayBody.scrollTop = 0;
    dom.utilityOverlayBody.querySelector(`[data-legal-tab="${runtime.legalOverlayTab}"]`)?.focus();
  }
  return true;
}

function parseInviteFriendEmails(rawValue) {
  const entries = String(rawValue || "")
    .split(/[,;\n]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  const invalid = [];
  for (const entry of entries) {
    const normalized = entry.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry)) {
      invalid.push(entry);
      continue;
    }
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(entry);
    }
  }
  return { emails: unique, invalid, total: entries.length };
}

function renderInviteFriendUtilityOverlay() {
  return {
    kicker: "Share",
    title: "Invite A Friend",
    body: `
      <div class="utility-confirm-card invite-friend-card">
        <div class="utility-confirm-copy">
          <strong>Think someone would like Bubble Borough?</strong>
          <div class="fish-meta">Enter up to 20 email addresses separated by commas. Each friend receives a private invite directly from Bubble Borough.</div>
        </div>
        <label class="invite-friend-field">
          <span>Email addresses</span>
          <textarea rows="5" placeholder="friend@example.com, another@example.com" data-invite-friend-emails></textarea>
        </label>
        <div class="invite-friend-meta">
          <span data-invite-friend-count>0 / 20</span>
          <span data-invite-friend-status role="status"></span>
        </div>
      </div>
    `,
    footer: buildUtilityActionsFooter([
      { label: "Send Invites", attribute: "data-send-friend-invite" },
      { label: "Cancel", variant: "alt", attribute: "data-close-utility" }
    ]),
    closable: true
  };
}

function handleInviteFriendUtilityOverlayInput(ctx, target) {
  const input = target?.closest?.("[data-invite-friend-emails]");
  if (!(input instanceof HTMLTextAreaElement)) return false;
  const result = parseInviteFriendEmails(input.value);
  const count = dom.utilityOverlayBody?.querySelector("[data-invite-friend-count]");
  const status = dom.utilityOverlayBody?.querySelector("[data-invite-friend-status]");
  if (count) count.textContent = `${result.emails.length} / 20`;
  if (status) {
    if (result.invalid.length) status.textContent = `${result.invalid.length} invalid ${result.invalid.length === 1 ? "address" : "addresses"}`;
    else if (result.emails.length > 20) status.textContent = "Use 20 or fewer addresses at a time.";
    else status.textContent = "";
  }
  return true;
}

async function sendInviteFriendEmails(button) {
  const input = dom.utilityOverlayBody?.querySelector("[data-invite-friend-emails]");
  const status = dom.utilityOverlayBody?.querySelector("[data-invite-friend-status]");
  const result = parseInviteFriendEmails(input instanceof HTMLTextAreaElement ? input.value : "");
  if (!result.emails.length) {
    if (status) status.textContent = "Enter at least one valid email address.";
    input?.focus?.();
    return false;
  }
  if (result.invalid.length) {
    if (status) status.textContent = `Fix ${result.invalid.length} invalid ${result.invalid.length === 1 ? "address" : "addresses"} first.`;
    input?.focus?.();
    return false;
  }
  if (result.emails.length > 20) {
    if (status) status.textContent = "Use 20 or fewer addresses at a time.";
    input?.focus?.();
    return false;
  }

  const session = await refreshCloudSessionIfNeeded();
  if (!session?.access_token) {
    if (status) status.textContent = "Sign in again before sending invites.";
    return false;
  }

  if (button instanceof HTMLButtonElement) button.disabled = true;
  if (input instanceof HTMLTextAreaElement) input.disabled = true;
  if (status) status.textContent = result.emails.length === 1 ? "Sending invite..." : `Sending ${result.emails.length} invites...`;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-friend-invite`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ emails: result.emails })
    });
    const responseText = await response.text();
    let data = null;
    try { data = responseText ? JSON.parse(responseText) : null; } catch { data = null; }
    if (!response.ok) throw new Error(data?.error || `Invite delivery failed (${response.status}).`);
    if (status) status.textContent = result.emails.length === 1 ? "Invite sent." : `${result.emails.length} invites sent.`;
    if (input instanceof HTMLTextAreaElement) input.value = "";
    const count = dom.utilityOverlayBody?.querySelector("[data-invite-friend-count]");
    if (count) count.textContent = "0 / 20";
    showToast(result.emails.length === 1 ? "Friend invite sent." : `${result.emails.length} friend invites sent.`);
    return true;
  } catch (error) {
    const message = error instanceof TypeError
      ? "Invite delivery service is unavailable."
      : (error?.message || "Could not send invites. Try again.");
    if (status) status.textContent = message;
    return false;
  } finally {
    if (button instanceof HTMLButtonElement) button.disabled = false;
    if (input instanceof HTMLTextAreaElement) input.disabled = false;
  }
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

function renderDecorSettingsTitleActions(item, decor) {
  if (!item || !decor || isTransitTubeDecorKey(item.decorKey)) {
    return "";
  }

  return `<button class="utility-header-icon-button" type="button" data-decor-settings-rename title="Rename this placed decor" aria-label="Rename this placed decor">✎</button>`;
}

function renderDecorSettingsHeaderActions(item, decor) {
  if (!item || !decor || isTransitTubeDecorKey(item.decorKey)) {
    return "";
  }

  return `
    <button class="utility-header-reset-button" type="button" data-decor-settings-reset title="Reset decor settings">
      <span aria-hidden="true">↻</span>
      <span>Reset</span>
    </button>
  `;
}

function handleDecorSettingsUtilityOverlayHeaderClick(ctx, target) {
  const item = getDecorSettingsTarget();
  if (!item) {
    return false;
  }

  if (target?.closest?.("[data-decor-settings-reset]")) {
    resetSelectedDecorSettings();
    return true;
  }

  if (target?.closest?.("[data-decor-settings-rename]")) {
    const decor = runtime.decorMap.get(item.decorKey);
    const currentName = getPlacedDecorDisplayName(item, decor);
    const nextName = window.prompt("Name this placed decor:", currentName);
    if (nextName !== null) {
      setSelectedDecorCustomName(nextName);
    }
    return true;
  }

  return false;
}

function handleCaveSettingsUtilityOverlayBodyClick(ctx, target) {
  const caveTabButton = target?.closest?.("[data-decor-cave-tab]");
  if (caveTabButton) {
    const nextTab = String(caveTabButton.dataset.decorCaveTab || "entries");
    runtime.decorSettingsCaveTab = ["entries", "seats", "preview"].includes(nextTab) ? nextTab : "entries";
    renderUtilityOverlay();
    return true;
  }
  if (target?.closest?.("[data-cave-add-entry]")) {
    addSelectedCavePoint("entry");
    return true;
  }
  const removeEntryButton = target?.closest?.("[data-cave-remove-entry]");
  if (removeEntryButton) {
    removeSelectedCavePoint("entry", removeEntryButton.dataset.caveRemoveEntry);
    return true;
  }
  if (target?.closest?.("[data-cave-add-seat]")) {
    addSelectedCavePoint("seat");
    return true;
  }
  const removeSeatButton = target?.closest?.("[data-cave-remove-seat]");
  if (removeSeatButton) {
    removeSelectedCavePoint("seat", removeSeatButton.dataset.caveRemoveSeat);
    return true;
  }
  const layerStepButton = target?.closest?.("[data-decor-layer-step]");
  if (layerStepButton) {
    stepSelectedDecorLayer(layerStepButton.dataset.decorLayerStep);
    return true;
  }
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
  const caveColorPicker = target?.closest?.("[data-cave-color-picker]");
  if (caveColorPicker instanceof HTMLInputElement && caveColorPicker.type === "color") {
    updateSelectedCaveColorSetting(
      caveColorPicker.dataset.caveColorPicker,
      caveColorPicker.value,
      { live: true, persist: false }
    );
    return true;
  }
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
  const turnToggle = target?.closest?.("[data-custom-fish-turn-toggle]");
  if (turnToggle instanceof HTMLInputElement && runtime.pendingCustomFishUpload) {
    runtime.pendingCustomFishUpload.turnAnimation = turnToggle.checked ? "complex" : "simple";
    return true;
  }
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
  const caveColorPicker = target?.closest?.("[data-cave-color-picker]");
  if (caveColorPicker instanceof HTMLInputElement && caveColorPicker.type === "color") {
    updateSelectedCaveColorSetting(
      caveColorPicker.dataset.caveColorPicker,
      caveColorPicker.value,
      { forcePersist: true }
    );
    return true;
  }
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
    const profileId = normalizeCustomFishBehaviorProfileId(customFishBehaviorSelect.value);
    const profile = getCustomFishBehaviorProfile(profileId) || getDefaultCustomFishBehaviorProfile();
    runtime.pendingCustomFishUpload.behaviorProfileId = profileId;
    runtime.pendingCustomFishUpload.diet = getDefaultCustomFishDiet(profile);
    runtime.pendingCustomFishUpload.activityRegulation = "";
    runtime.pendingCustomFishUpload.swimZone = "";
    runtime.pendingCustomFishUpload.socialAffinity = "adaptive";
    if (runtime.proteusDesignerOpen === true) {
      runtime.proteusDesignerRenderRevision = (Number(runtime.proteusDesignerRenderRevision) || 0) + 1;
      renderStoreOverlay();
    }
    return true;
  }
  const customFishDietSelect = target?.closest?.("[data-custom-fish-diet-select]");
  if (customFishDietSelect instanceof HTMLSelectElement && runtime.pendingCustomFishUpload) {
    runtime.pendingCustomFishUpload.diet = normalizeCustomFishDiet(customFishDietSelect.value);
    return true;
  }
  const customFishActivitySelect = target?.closest?.("[data-custom-fish-activity-select]");
  if (customFishActivitySelect instanceof HTMLSelectElement && runtime.pendingCustomFishUpload) {
    runtime.pendingCustomFishUpload.activityRegulation = normalizeCustomFishActivityRegulation(customFishActivitySelect.value);
    return true;
  }
  const customFishSwimZoneSelect = target?.closest?.("[data-custom-fish-swim-zone-select]");
  if (customFishSwimZoneSelect instanceof HTMLSelectElement && runtime.pendingCustomFishUpload) {
    runtime.pendingCustomFishUpload.swimZone = normalizeCustomFishSwimZone(customFishSwimZoneSelect.value);
    return true;
  }
  const customFishSocialSelect = target?.closest?.("[data-custom-fish-social-select]");
  if (customFishSocialSelect instanceof HTMLSelectElement && runtime.pendingCustomFishUpload) {
    runtime.pendingCustomFishUpload.socialAffinity = normalizeCustomFishSocialAffinity(customFishSocialSelect.value);
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

function syncUtilityOverlayEditTraySafeArea() {
  if (!dom.utilityOverlay) {
    return;
  }

  const isDecorSettings = runtime.utilityOverlayOpen
    && (runtime.utilityOverlayMode === "decor-settings" || runtime.utilityOverlayMode === "custom-decor-settings");
  if (!isDecorSettings) {
    dom.utilityOverlay.style.removeProperty("--utility-edit-tray-reserve");
    return;
  }

  const visibleTray = [dom.editDecorTray, dom.editFishTray, dom.editEquipmentTray, dom.editTankTray]
    .find((tray) => tray instanceof HTMLElement && !tray.hidden && tray.getClientRects().length);
  if (!visibleTray) {
    dom.utilityOverlay.style.setProperty("--utility-edit-tray-reserve", "0px");
    return;
  }

  const overlayRect = dom.utilityOverlay.getBoundingClientRect();
  const trayRect = visibleTray.getBoundingClientRect();
  const reserve = Math.max(0, Math.ceil(overlayRect.bottom - trayRect.top + 12));
  dom.utilityOverlay.style.setProperty("--utility-edit-tray-reserve", `${reserve}px`);
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
  const titleActions = String(config.titleActions || "");
  const headerActions = String(config.headerActions || "");
  const body = String(config.body || "");
  const footer = String(config.footer || "");

  setTextIfChanged(dom.utilityOverlayTitle, title);
  if (dom.utilityOverlayKicker) {
    setTextIfChanged(dom.utilityOverlayKicker, kicker);
    dom.utilityOverlayKicker.hidden = hideKicker;
  }
  if (dom.utilityOverlayTitleActions) {
    setMarkupIfChanged("utility-overlay-title-actions", dom.utilityOverlayTitleActions, titleActions);
    dom.utilityOverlayTitleActions.hidden = !titleActions.trim();
  }
  if (dom.utilityOverlayHeaderActions) {
    setMarkupIfChanged("utility-overlay-header-actions", dom.utilityOverlayHeaderActions, headerActions);
    dom.utilityOverlayHeaderActions.hidden = !headerActions.trim();
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
  syncUtilityOverlayEditTraySafeArea();
}

function normalizeBubbleBankTab(value = "account") {
  return ["account", "rewards", "milestones"].includes(value) ? value : "account";
}

function formatBubbleBankTime(timestamp, options = {}) {
  const value = Number(timestamp) || Date.now();
  return new Date(value).toLocaleString([], options.dateOnly
    ? { month: "short", day: "numeric", year: "numeric" }
    : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getBubbleBankMilestoneForTransaction(entry) {
  const label = String(entry?.label || "").toLowerCase();
  return PROGRESSION_MILESTONES.find((milestone) => (
    label.includes(`${String(milestone.label).toLowerCase()} milestone`)
  )) || null;
}

function getBubbleBankRewardForTransaction(entry) {
  if (!/daily (?:award|reward)/i.test(String(entry?.label || ""))) return null;
  const time = Number(entry?.time) || 0;
  const history = Array.isArray(state?.dailyBonus?.recapHistory) ? state.dailyBonus.recapHistory : [];
  return history.find((summary) => Math.abs((Number(summary.generatedAt) || 0) - time) < 2000) || null;
}

function getBubbleBankTransactionCategory(entry) {
  const text = `${String(entry?.label || "")} ${String(entry?.place || "")}`.toLowerCase();
  if (/milestone/.test(text)) return "milestones";
  if (/feed|fed|feeding/.test(text)) return "feeding";
  if (/clean|cleaning|scrub/.test(text)) return "cleaning";
  if (/sold|sale|sell/.test(text)) return "sales";
  if (/daily|award|bonus|reward|coin/.test(text)) return "awards";
  if (/fish|shark|catfish|custom fish|species/.test(text)) return "fish";
  if (/decor|seaweed|cave|anemone|mound|plant|background/.test(text)) return "decor";
  if (/equipment|expansion|dispenser|boat|submarine|skiff/.test(text)) return "equipment";
  if (/food|medicine|medication|cure|pellet/.test(text)) return "food-medication";
  return entry?.direction === "credit" ? "awards" : "decor";
}

function getBubbleBankTransactionFilterMarkup() {
  const active = String(runtime.bubbleBankTransactionFilter || "all");
  return `<select class="bubble-bank-filter" data-bank-transaction-filter aria-label="Filter transactions">
    <option value="all" ${active === "all" ? "selected" : ""}>All transactions</option>
    <optgroup label="All Earned Money">
      <option value="earned" ${active === "earned" ? "selected" : ""}>All earned money</option>
      <option value="feeding" ${active === "feeding" ? "selected" : ""}>Feeding</option>
      <option value="cleaning" ${active === "cleaning" ? "selected" : ""}>Cleaning</option>
      <option value="awards" ${active === "awards" ? "selected" : ""}>Awards</option>
      <option value="milestones" ${active === "milestones" ? "selected" : ""}>Milestones</option>
      <option value="sales" ${active === "sales" ? "selected" : ""}>Sales</option>
    </optgroup>
    <optgroup label="All Spent Money">
      <option value="spent" ${active === "spent" ? "selected" : ""}>All spent money</option>
      <option value="fish" ${active === "fish" ? "selected" : ""}>Fish</option>
      <option value="decor" ${active === "decor" ? "selected" : ""}>Decor</option>
      <option value="equipment" ${active === "equipment" ? "selected" : ""}>Equipment</option>
      <option value="food-medication" ${active === "food-medication" ? "selected" : ""}>Food &amp; Medication</option>
    </optgroup>
  </select>`;
}

function bubbleBankTransactionMatchesFilter(entry, filter) {
  if (!filter || filter === "all") return true;
  const earned = entry.direction === "credit";
  if (filter === "earned") return earned;
  if (filter === "spent") return !earned && entry.direction === "debit";
  if (["feeding", "cleaning", "awards", "milestones", "sales"].includes(filter)) return earned && getBubbleBankTransactionCategory(entry) === filter;
  return !earned && entry.direction === "debit" && getBubbleBankTransactionCategory(entry) === filter;
}

function getWebSurfReadMailIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEBSURF_MAIL_READ_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String).slice(-120) : []);
  } catch {
    return new Set();
  }
}

function saveWebSurfReadMailIds(readIds) {
  try {
    localStorage.setItem(WEBSURF_MAIL_READ_STORAGE_KEY, JSON.stringify([...readIds].slice(-120)));
  } catch {}
}

function getWebSurfSilencedSenders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEBSURF_SILENCED_SENDERS_STORAGE_KEY) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map((sender) => String(sender).toLowerCase()).slice(-80) : []);
  } catch {
    return new Set();
  }
}

function saveWebSurfSilencedSenders(senders) {
  try {
    localStorage.setItem(WEBSURF_SILENCED_SENDERS_STORAGE_KEY, JSON.stringify([...senders].slice(-80)));
  } catch {}
}

function toggleWebSurfSenderSilenced(sender) {
  const normalized = String(sender || "").trim().toLowerCase();
  if (!normalized) return;
  const senders = getWebSurfSilencedSenders();
  if (senders.has(normalized)) senders.delete(normalized);
  else senders.add(normalized);
  saveWebSurfSilencedSenders(senders);
}

function isWebSurfMailUnread(message, readIds = getWebSurfReadMailIds(), silencedSenders = getWebSurfSilencedSenders()) {
  return !readIds.has(message.id) && !silencedSenders.has(String(message.sender || "").toLowerCase());
}

function markWebSurfMailRead(mailId) {
  const id = String(mailId || "");
  if (!id) return;
  const readIds = getWebSurfReadMailIds();
  readIds.add(id);
  saveWebSurfReadMailIds(readIds);
}

function markAllWebSurfMailRead() {
  const readIds = getWebSurfReadMailIds();
  getWebSurfInboxMessages().forEach((message) => readIds.add(message.id));
  saveWebSurfReadMailIds(readIds);
}

function loadWebSurfAutoEmailConfig() {
  if (globalThis.webSurfAutoEmailConfigPromise) return globalThis.webSurfAutoEmailConfigPromise;
  globalThis.webSurfAutoEmailConfigPromise = fetch("assets/web/websurf/auto_emails.json", { cache: "no-cache" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error(`Automatic email templates unavailable (${response.status})`)))
    .then((config) => {
      globalThis.webSurfAutoEmailConfig = config && typeof config === "object" ? config : null;
      if (runtime?.storeOverlayOpen && runtime?.webHomeOpen) renderStoreOverlay();
      return globalThis.webSurfAutoEmailConfig;
    })
    .catch((error) => {
      console.warn("Bubble Borough automatic email templates could not be loaded.", error);
      return null;
    });
  return globalThis.webSurfAutoEmailConfigPromise;
}

function getWebSurfAutoEmailTemplate(templateId) {
  loadWebSurfAutoEmailConfig();
  return globalThis.webSurfAutoEmailConfig?.templates?.[templateId] || null;
}

function interpolateWebSurfEmailValue(value, data = {}) {
  return String(value ?? "").replace(/{{\s*([\w.:]+)\s*}}/g, (_match, key) => {
    const coinField = key.match(/^coin:(.+)$/)?.[1];
    if (coinField) return interpolateWebSurfEmailValue(`{{${coinField}}}`, data);
    const result = key.split(".").reduce((current, part) => current?.[part], data);
    return result == null ? "" : String(result);
  });
}

function renderWebSurfEmailInlineText(value, data = {}) {
  const parts = String(value ?? "").split(/({{\s*coin:[\w.]+\s*}})/g);
  return parts.map((part) => {
    const field = part.match(/^{{\s*coin:([\w.]+)\s*}}$/)?.[1];
    if (!field) return escapeHtml(interpolateWebSurfEmailValue(part, data));
    const amount = field.split(".").reduce((current, key) => current?.[key], data);
    return `<span class="websurf-email-coin-amount"><img ${assetImageAttributes("assets/misc/coin_unicode.png")} alt="Fish Coin" /><strong>${escapeHtml(amount == null ? "" : String(amount))}</strong></span>`;
  }).join("");
}

function normalizeWebSurfThumbnailPath(value) {
  const fallback = "assets/misc/Store_Logo.png";
  let raw = typeof value === "string" ? value.trim() : "";
  if (!raw || raw.startsWith("data:")) return raw || fallback;
  raw = raw.replace(/\\/g, "/");
  try {
    raw = new URL(raw, window.location.href).pathname;
  } catch {}
  const assetIndex = raw.toLowerCase().indexOf("assets/");
  if (assetIndex >= 0) raw = raw.slice(assetIndex);
  raw = raw.split(/[?#]/, 1)[0];
  return raw.startsWith("assets/") ? raw : fallback;
}

function getWebSurfThumbnailAttributes(value) {
  const path = normalizeWebSurfThumbnailPath(value);
  const fallback = escapeHtml(resolveAppUrl("assets/misc/Store_Logo.png"));
  return `${assetImageAttributes(path)} onerror="this.onerror=null;this.src='${fallback}'"`;
}

function getWebSurfOrderItems(order) {
  return (order?.items || []).map((item) => ({
    itemId: item.key || item.id || item.name,
    itemName: item.name || "Store item",
    thumbnail: normalizeWebSurfThumbnailPath(item.image),
    quantity: Math.max(1, Number(item.quantity) || 1)
  }));
}

function isProteusOrder(order) {
  return (order?.items || []).some((item) => /proteus biodyne/i.test(String(item.seller || item.vendor || item.category || "")));
}

function isDavyMutationOrder(order) {
  return (order?.items || []).some((item) => {
    const key = String(item?.key || "");
    const image = String(item?.image || "");
    return /(?:^|:)davy-/.test(key) || /web\/davy\/mutations/i.test(image);
  });
}

function isEngineeredAquaticSpecimenOrder(order) {
  return (order?.items || []).some((item) => {
    const key = String(item.key || "");
    const name = String(item.name || item.itemName || "");
    const seller = String(item.seller || item.vendor || "");
    return key === `buyFish:${CUSTOM_FISH_SHOP_KEY}`
      || key === CUSTOM_FISH_SHOP_KEY
      || /engineered aquatic specimen/i.test(name)
      || (/proteus biodyne/i.test(seller) && /custom fish|engineered specimen/i.test(`${key} ${name}`));
  });
}

function isEngineeredAquaticSpecimenAwaitingDesign(order) {
  if (!isEngineeredAquaticSpecimenOrder(order)) return false;
  return getEngineeredAquaticSpecimenOrderStatus(String(order?.id || "")) === "design-required";
}

function getWebSurfStatementSnapshotStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem("bubble-borough-websurf-statement-snapshots-v1") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveWebSurfStatementSnapshotStore(store) {
  try {
    const entries = Object.entries(store || {}).sort((left, right) => left[0].localeCompare(right[0])).slice(-12);
    localStorage.setItem("bubble-borough-websurf-statement-snapshots-v1", JSON.stringify(Object.fromEntries(entries)));
  } catch {}
}

function getWebSurfStatementData() {
  const transactions = Array.isArray(state?.walletTransactions) ? state.walletTransactions : [];
  const currentSunday = new Date();
  currentSunday.setHours(0, 0, 0, 0);
  currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay());
  const periodStart = new Date(currentSunday);
  periodStart.setDate(periodStart.getDate() - 7);
  const periodEnd = currentSunday.getTime() - 1;
  const statementKey = periodStart.toISOString().slice(0, 10);
  const snapshots = getWebSurfStatementSnapshotStore();
  if (snapshots[statementKey]?.snapshotVersion === 3) return snapshots[statementKey];
  const rows = transactions.filter((entry) => {
    const time = Number(entry.time) || 0;
    return time >= periodStart.getTime() && time <= periodEnd;
  }).map((entry) => {
    const debit = entry.direction === "debit";
    const amount = Math.max(0, Number(entry.amount) || 0);
    return {
      transactionId: entry.id || entry.time,
      date: new Date(Number(entry.time) || Date.now()).toLocaleDateString([], { month: "2-digit", day: "2-digit" }),
      signedAmount: entry.direction === "neutral" ? "•" : `${debit ? "−" : "+"}${amount}`,
      description: String(entry.label || "Aquarium activity").replace(/tankazon/ig, "BubbleBodega"),
      time: Number(entry.time) || 0,
      type: entry.direction
    };
  });
  const income = rows.reduce((sum, row) => sum + (row.signedAmount.startsWith("+") ? Number(row.signedAmount.slice(1)) : 0), 0);
  const spending = rows.reduce((sum, row) => sum + (row.signedAmount.startsWith("−") ? Number(row.signedAmount.slice(1)) : 0), 0);
  const snapshot = {
    snapshotVersion: 3,
    statementKey,
    sentAt: currentSunday.getTime(),
    periodStart: periodStart.getTime(),
    periodEnd,
    dateRange: `${periodStart.toLocaleDateString([], { month: "2-digit", day: "2-digit" })}–${new Date(periodEnd).toLocaleDateString([], { month: "2-digit", day: "2-digit" })}`,
    transactionCount: rows.length,
    transactions: rows,
    income,
    spending,
    balance: Math.max(0, Number(state?.coins) || 0)
  };
  snapshots[statementKey] = snapshot;
  saveWebSurfStatementSnapshotStore(snapshots);
  return snapshot;
}

function getWebSurfMilestoneBalance(milestoneId, fallbackBalance) {
  const storageKey = "bubble-borough-websurf-milestone-snapshots-v1";
  try {
    const snapshots = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (snapshots && Number.isFinite(Number(snapshots[milestoneId]))) return Number(snapshots[milestoneId]);
    const balance = Math.max(0, Number(fallbackBalance) || 0);
    localStorage.setItem(storageKey, JSON.stringify({ ...(snapshots || {}), [milestoneId]: balance }));
    return balance;
  } catch {
    return Math.max(0, Number(fallbackBalance) || 0);
  }
}

function getWebSurfInboxMessages() {
  // Automatic sender registry: statements@bubbleboroughbank.swim, orders@bubblebodega.swim, rewards@bubbleboroughbank.swim, research@proteusbiodyne.swim.
  const messages = [];
  const rescueOffer = ensureBubbleBodegaRescueOffer(Date.now());
  const welcomeSentAt = Math.max(0, Number(state?.webSurfWelcomeSentAt) || 0);
  if (Number(state?.webSurfWelcomeVersion) >= 1 && welcomeSentAt) {
    const profile = sanitizeAccountProfile(state?.accountProfile);
    const username = profile.username || getAccountUsernameForUser(profile.userId);
    const addressName = String(username || "user").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "user";
    const webSurfTemplate = getWebSurfAutoEmailTemplate("welcome_to_websurf");
    const webSurfData = { emailAddress: `${addressName}@websurf.swim` };
    messages.push({
      id: `auto-welcome_to_websurf-${welcomeSentAt}`,
      templateId: "welcome_to_websurf",
      data: webSurfData,
      sender: webSurfTemplate?.sender || "welcome@websurf.swim",
      subject: webSurfTemplate?.subject || "Welcome to WebSurf!",
      preview: webSurfTemplate?.preview || "Your new WebSurf email address is ready.",
      destination: "home",
      icon: "assets/icons/WebSurf_icon.png",
      time: welcomeSentAt
    });
    const template = getWebSurfAutoEmailTemplate("welcome_to_bubble_borough");
    const data = { startingCoins: STARTING_COINS };
    messages.push({
      id: `auto-welcome_to_bubble_borough-${welcomeSentAt}`,
      templateId: "welcome_to_bubble_borough",
      favorite: true,
      favoriteIcon: "assets/icons/other.png",
      data,
      sender: template?.sender || "welcome@websurf.swim",
      subject: template?.subject || "Welcome to Bubble Borough",
      preview: template?.preview || "Your aquarium is ready. Let's get you started.",
      destination: "home",
      icon: "assets/icons/WebSurf_icon.png",
      time: welcomeSentAt + 1
    });
  }
  if (rescueOffer.issued) {
    const template = getWebSurfAutoEmailTemplate("bubblebodega_rescue_offer");
    messages.push({
      id: `auto-bubblebodega_rescue_offer-${rescueOffer.cycle}-${state.bubbleBodegaRescueOffer.issuedAt}`,
      templateId: "bubblebodega_rescue_offer",
      data: {},
      sender: template?.sender || "offers@bubblebodega.swim",
      subject: template?.subject || "A Fresh Start, On Us",
      preview: template?.preview || "A free Goldfish and food are waiting for you.",
      destination: "rescue-offer",
      icon: "assets/misc/Store_Logo.png",
      time: Number(state.bubbleBodegaRescueOffer.issuedAt) || Date.now()
    });
  }
  const orders = sanitizePurchaseHistory(state?.purchaseHistory);
  const now = Date.now();
  orders.filter((order) => (Number(order.placedAt) || 0) <= now).forEach((order) => {
    const engineeredSpecimen = isEngineeredAquaticSpecimenOrder(order);
    const proteusOrderStatus = engineeredSpecimen
      ? getEngineeredAquaticSpecimenOrderStatus(order.id)
      : "";
    const designPending = proteusOrderStatus === "design-required";
    const designConfigured = proteusOrderStatus === "specimen-configured";
    const designComplete = proteusOrderStatus === "fulfillment-complete";
    // The legacy proteus_engineered_specimen_fulfillment template remains in the registry for old saves,
    // but commissioned specimen mail now updates this original message in place when fulfillment completes.
    const templateId = engineeredSpecimen
      ? "proteus_engineered_specimen_design"
      : isProteusOrder(order)
        ? "proteus_asset_fulfillment"
        : "bubblebodega_order_confirmation";
    const template = getWebSurfAutoEmailTemplate(templateId);
    const items = getWebSurfOrderItems(order);
    const data = {
      orderId: order.id,
      itemQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items,
      total: order.total,
      designPending,
      designConfigured,
      designComplete,
      proteusOrderStatus,
      designStatus: designPending ? "DESIGN REQUIRED" : designConfigured ? "SPECIMEN CONFIGURED" : "FULFILLMENT COMPLETE",
      appearanceStatus: designPending ? "Pending" : "Approved",
      behaviorStatus: designPending ? "Pending" : "Approved",
      fulfillmentStatus: designPending ? "Awaiting design" : designConfigured ? "Processing" : "Complete",
      designPreview: designPending
        ? "Design required for your Engineered Aquatic Specimen commission."
        : designConfigured
          ? "Your Engineered Aquatic Specimen is being fulfilled."
          : "Your Engineered Aquatic Specimen fulfillment is complete."
    };
    messages.push({ id: `auto-${templateId}-${order.id}`, templateId, data, sender: template?.sender || (isProteusOrder(order) ? "designer@proteusbiodyne.swim" : "orders@bubblebodega.swim"), subject: template ? interpolateWebSurfEmailValue(data.itemQuantity === 1 && template.subjectSingular ? template.subjectSingular : template.subject, data) : "Order Confirmed", preview: template ? interpolateWebSurfEmailValue(template.preview, data) : "Your order has been completed and delivered.", destination: template?.action?.destination || "store", icon: isProteusOrder(order) ? "assets/web/proteus/Proteus_Logo_Icon.png" : "assets/misc/Box.png", time: Number(order.placedAt) || 0 });
  });

  const firstDavyPurchase = orders
    .filter((order) => (Number(order.placedAt) || 0) <= now && isDavyMutationOrder(order))
    .sort((left, right) => (Number(left.placedAt) || 0) - (Number(right.placedAt) || 0))[0] || null;
  if (firstDavyPurchase) {
    const template = getWebSurfAutoEmailTemplate("davy_jones_invitation");
    const data = { orderId: firstDavyPurchase.id, siteAddress: "davyjoneslocker.hadal" };
    messages.push({
      id: `auto-davy_jones_invitation-${firstDavyPurchase.id}`,
      templateId: "davy_jones_invitation",
      data,
      sender: template?.sender || "FIN",
      subject: template?.subject || "Regarding Your Purchase",
      preview: template?.preview || "A private seller left you a message.",
      destination: "davy-locker-unlock",
      icon: "assets/web/davy/icons/davy_icon.png",
      time: (Number(firstDavyPurchase.placedAt) || 0) + 1
    });
  }

  const transactions = Array.isArray(state?.walletTransactions) ? state.walletTransactions : [];
  const seenMilestones = new Set();
  transactions.filter((entry) => (Number(entry.time) || 0) <= now).forEach((entry) => {
    const milestone = getBubbleBankMilestoneForTransaction(entry);
    if (!milestone || seenMilestones.has(milestone.id)) return;
    seenMilestones.add(milestone.id);
    const milestoneId = `milestone-${milestone.id}`;
    const data = { milestoneId, milestoneName: milestone.label, milestoneRequirement: milestone.requirement, reward: milestone.reward, balance: getWebSurfMilestoneBalance(milestoneId, state?.coins || 0) };
    const template = getWebSurfAutoEmailTemplate("milestone_reward");
    messages.push({ id: `auto-milestone_reward-${milestone.id}`, templateId: "milestone_reward", data, sender: template?.sender || "rewards@bubbleboroughbank.swim", subject: template ? interpolateWebSurfEmailValue(template.subject, data) : `Milestone Unlocked: ${milestone.label}`, preview: template ? interpolateWebSurfEmailValue(template.preview, data) : `${milestone.reward} Fish Coins earned.`, destination: "bank", icon: "assets/misc/coin_unicode.png", time: Number(entry.time) || 0 });
  });

  const statementData = getWebSurfStatementData();
  const statementTemplate = getWebSurfAutoEmailTemplate("weekly_bank_statement");
  messages.push({
    id: `auto-weekly_bank_statement-${statementData.dateRange}`,
    templateId: "weekly_bank_statement",
    data: statementData,
    sender: statementTemplate?.sender || "statements@bubbleboroughbank.swim",
    subject: statementTemplate ? interpolateWebSurfEmailValue(statementTemplate.subject, statementData) : `Weekly Statement: ${statementData.dateRange}`,
    preview: statementTemplate ? interpolateWebSurfEmailValue(statementTemplate.preview, statementData) : `${statementData.transactionCount} transactions • Balance: ${statementData.balance} Fish Coins`,
    destination: "bank",
    icon: "assets/misc/coin_unicode.png",
    time: Number(statementData.sentAt) || 0
  });

  if (window.hasDiscoveredProteus?.()) {
    const proteusDiscoveredAt = Math.min(now, Math.max(1, Number(window.getProteusDiscoveredAt?.()) || now));
    messages.push({
      id: "proteus-research-bulletin-1",
      sender: "research@proteusbiodyne.swim",
      subject: "Research Bulletin: Adaptive Marine Life",
      preview: "New specimen and directed-adaptation records are available.",
      destination: "proteus",
      icon: "assets/web/proteus/Proteus_Logo_Icon.png",
      time: proteusDiscoveredAt
    });
  }

  return messages
    .sort((left, right) => (Number(right.time) || 0) - (Number(left.time) || 0))
    .slice(0, 40);
}

function syncWebSurfUnreadBadge() {
  if (!dom.webSurfUnreadBadge) return;
  const readIds = getWebSurfReadMailIds();
  const silencedSenders = getWebSurfSilencedSenders();
  const unreadCount = getWebSurfInboxMessages().filter((message) => isWebSurfMailUnread(message, readIds, silencedSenders)).length;
  dom.webSurfUnreadBadge.hidden = unreadCount === 0;
  dom.webSurfUnreadBadge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
  dom.webSurfUnreadBadge.setAttribute("aria-label", `${unreadCount} unread WebSurf ${unreadCount === 1 ? "message" : "messages"}`);
}

function formatWebSurfMailTime(timestamp) {
  const rawTimestamp = Number(timestamp);
  if (!Number.isFinite(rawTimestamp) || rawTimestamp <= 0) return "Saved";
  const now = new Date();
  const date = new Date(Math.min(rawTimestamp, now.getTime()));
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function renderWebSurfProteusAuthorizationEmail(message) {
  const data = message.data || {};
  const designPending = data.proteusOrderStatus === "design-required" && data.designPending === true;
  return `<section class="websurf-proteus-authorization" data-proteus-order-status="${escapeHtml(data.proteusOrderStatus || "")}">
    <header class="websurf-proteus-auth-brand">
      <img ${assetImageAttributes("assets/web/proteus/Proteus_Title_Logo.png")} alt="Proteus Biodyne" />
      <span>BESPOKE AQUATIC SPECIMEN PROGRAM</span>
    </header>
    <div class="websurf-proteus-auth-intro">
      <h3>ENGINEERED SPECIMEN AUTHORIZATION</h3>
      <p>Your BubbleBodega commission has been received.</p>
    </div>
    <div class="websurf-proteus-auth-status-grid">
      <section class="websurf-proteus-auth-order-status">
        <h4>ORDER STATUS</h4>
        <strong>${escapeHtml(data.designStatus || "DESIGN REQUIRED")}</strong>
      </section>
      <section class="websurf-proteus-auth-configuration">
        <h4>CONFIGURATION</h4>
        <div><span>Appearance</span><i aria-hidden="true"></i><strong>${escapeHtml(data.appearanceStatus || "Pending")}</strong></div>
        <div><span>Behavior</span><i aria-hidden="true"></i><strong>${escapeHtml(data.behaviorStatus || "Pending")}</strong></div>
        <div><span>Fulfillment</span><i aria-hidden="true"></i><strong>${escapeHtml(data.fulfillmentStatus || "Awaiting design")}</strong></div>
      </section>
    </div>
    <div class="websurf-proteus-auth-response">
      ${designPending
        ? `<button type="button" data-websurf-email-action="${escapeHtml(message.id)}">CONFIGURE SPECIMEN</button><p>Fulfillment begins automatically after submission.</p>`
        : `<strong class="websurf-proteus-auth-thanks">WE APPRECIATE YOUR BUSINESS.</strong>`}
    </div>
    <footer><span>All commissioned specimens are final.</span><strong>PROTEUS BIODYNE // RESTRICTED FULFILLMENT</strong></footer>
  </section>`;
}

function renderWebSurfAutoEmailBody(message) {
  const template = getWebSurfAutoEmailTemplate(message.templateId);
  if (!template) return `<p>${escapeHtml(message.preview || "This automatic message is unavailable.")}</p>`;
  const data = message.data || {};
  return (template.body || []).map((block) => {
    if (block.when && !data[block.when]) return "";
    if (block.type === "proteus_authorization") return renderWebSurfProteusAuthorizationEmail(message);
    if (block.type === "heading") return `<h3 class="websurf-email-heading">${renderWebSurfEmailInlineText(block.text, data)}</h3>`;
    if (block.type === "section_label") return `<div class="websurf-email-section-label">${escapeHtml(block.text || "")}</div>`;
    if (block.type === "guide_section") return `<section class="websurf-email-guide-section"><img ${assetImageAttributes(block.icon)} alt="" aria-hidden="true" /><div><h4>${escapeHtml(block.title || "")}</h4><p>${renderWebSurfEmailInlineText(block.text, data)}</p></div></section>`;
    if (block.type === "link_row") return `<nav class="websurf-email-guide-links" aria-label="Getting started links">${(block.links || []).map((link) => `<button type="button" data-websurf-guide-destination="${escapeHtml(link.destination || "store")}" data-websurf-guide-section="${escapeHtml(link.section || "")}">${link.icon ? `<img ${assetImageAttributes(link.icon)} alt="" aria-hidden="true" />` : ""}<span>${escapeHtml(link.label || "Open")}</span></button>`).join("")}</nav>`;
    if (block.type === "feature_list") return `<section class="websurf-email-feature-list"><header><img ${assetImageAttributes(block.icon)} alt="" aria-hidden="true" /><h4>${escapeHtml(block.title || "")}</h4></header>${(block.items || []).map((item) => `<div class="websurf-email-feature-row"><img ${assetImageAttributes(item.icon)} alt="" aria-hidden="true" /><p><strong>${escapeHtml(item.label || "")}:</strong> ${escapeHtml(item.text || "")}</p></div>`).join("")}</section>`;
    if (block.type === "item_list") {
      const items = Array.isArray(data[block.source]) ? data[block.source] : [];
      return `<div class="websurf-email-item-list">${items.map((item) => `<div class="websurf-email-item-row" data-item-id="${escapeHtml(item.itemId)}"><img ${getWebSurfThumbnailAttributes(item[block.thumbnailField])} alt="" aria-hidden="true" /><strong>${escapeHtml(item[block.nameField] || "Store item")}</strong><span>×${escapeHtml(item[block.quantityField] || 1)}</span></div>`).join("")}</div>`;
    }
    if (block.type === "transaction_list") {
      const rows = Array.isArray(data[block.source]) ? data[block.source] : [];
      return `<div class="websurf-email-transaction-list">${rows.map((row) => {
        const signedAmount = String(row[block.amountField] || "");
        const numericAmount = Number.parseFloat(signedAmount.replace(/−/g, "-").replace(/,/g, ""));
        const amountClass = numericAmount > 0 ? "is-money-in" : numericAmount < 0 ? "is-money-out" : "";
        return `<div class="websurf-email-transaction-row"><time>${escapeHtml(row[block.dateField] || "")}</time><strong class="${amountClass}">${escapeHtml(signedAmount)}</strong><span>${escapeHtml(row[block.descriptionField] || "")}</span></div>`;
      }).join("") || `<p class="websurf-email-empty">No transactions in this statement period.</p>`}</div>`;
    }
    if (block.type === "summary" || block.type === "status") {
      const label = interpolateWebSurfEmailValue(block.label, data);
      const normalizedLabel = String(label).trim().toLowerCase();
      const summaryClass = normalizedLabel === "money in" ? "is-money-in" : normalizedLabel === "money out" ? "is-money-out" : "";
      const typeClass = block.type === "status" ? "is-status" : "";
      return `<p class="websurf-email-summary ${summaryClass} ${typeClass}"><strong>${escapeHtml(label)}</strong><span>${renderWebSurfEmailInlineText(block.value, data)}</span></p>`;
    }
    if (block.type === "completion_note") {
      return `<div class="websurf-email-completion-note">${renderWebSurfEmailInlineText(block.text, data)}</div>`;
    }
    if (block.type === "action") {
      const action = template.action || {};
      if (action.destination === "davy-locker-unlock") {
        return `<div class="websurf-email-inline-action"><a class="websurf-email-hyperlink" href="#davyjoneslocker.hadal" data-websurf-email-action="${escapeHtml(message.id)}">${escapeHtml(action.label || "davyjoneslocker.hadal")}</a></div>`;
      }
      return `<div class="websurf-email-inline-action"><button type="button" data-websurf-email-action="${escapeHtml(message.id)}">${escapeHtml(action.label || "Open")}</button></div>`;
    }
    return `<p>${renderWebSurfEmailInlineText(block.text, data)}</p>`;
  }).join("");
}

function handleWebSurfEmailAction(message) {
  const template = getWebSurfAutoEmailTemplate(message.templateId);
  const action = template?.action || {};
  captureWebSurfSessionState();
  if (action.destination === "rescue-offer") {
    const offer = activateBubbleBodegaRescueOffer(Date.now());
    if (!offer.accepted) {
      showToast("This recovery email has already been used.");
      return;
    }
    openStoreOverlay("fish", { forceCategory: true });
    window.requestAnimationFrame(() => void window.openBubbleBodegaRescueOffer?.(offer));
    return;
  }
  if (action.destination === "bank") {
    openBubbleBank(action.section || "account");
    if (message.data?.milestoneId) {
      runtime.bubbleBankTargetId = message.data.milestoneId;
      renderStoreOverlay();
      window.requestAnimationFrame(() => document.getElementById(message.data.milestoneId)?.scrollIntoView?.({ behavior: "smooth", block: "center" }));
    }
    return;
  }
  if (action.destination === "davy-locker-unlock") {
    const now = Date.now();
    const firstUnlock = state.davyJonesLockerUnlocked !== true;
    state.davyJonesLockerUnlocked = true;
    if (firstUnlock || !(Number(state.davyJonesLockerUnlockedAt) > 0)) {
      state.davyJonesLockerUnlockedAt = now;
      pushEvent("Davy Jones' Locker was added to WebSurf bookmarks.", now);
      saveState();
    }
    openDavyJonesLockerPage();
    return;
  }
  if (action.destination === "proteus-designer") {
    const orderId = String(message.data?.orderId || "");
    if (getEngineeredAquaticSpecimenOrderStatus(orderId) !== "design-required") {
      showToast("This Proteus commission has already been configured or fulfilled.");
      return;
    }
    openProteusDesignerPage(orderId);
    return;
  }
  if (action.destination === "store") {
    openStoreOverlay(runtime.storeTab || "food");
    window.requestAnimationFrame(() => window.showBubbleBodegaOrder?.(message.data?.orderId));
  }
}

function renderWebSurfHomePage() {
  const profile = sanitizeAccountProfile(state?.accountProfile);
  const username = profile.username || getAccountUsernameForUser(profile.userId);
  const addressName = String(username || "user").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || "user";
  const messages = getWebSurfInboxMessages();
  const readIds = getWebSurfReadMailIds();
  const silencedSenders = getWebSurfSilencedSenders();
  const unreadCount = messages.filter((message) => isWebSurfMailUnread(message, readIds, silencedSenders)).length;
  const proteusDiscovered = Boolean(window.hasDiscoveredProteus?.());
  const davyLockerUnlocked = state?.davyJonesLockerUnlocked === true;
  const mailMarkup = messages.map((message) => {
    const senderKey = String(message.sender || "").toLowerCase();
    const silenced = silencedSenders.has(senderKey);
    const unread = isWebSurfMailUnread(message, readIds, silencedSenders);
    const selected = runtime.webSurfSelectedMailId === message.id;
    return `<article class="websurf-mail-item ${selected ? "is-open" : ""}">
      <button type="button" class="websurf-mail-row ${unread ? "is-unread" : ""} ${silenced ? "is-silenced" : ""}" data-websurf-mail-id="${escapeHtml(message.id)}" aria-expanded="${selected}">
        ${message.favorite
          ? `<span class="websurf-mail-favorite" title="Favorited" aria-label="Favorited"><img ${assetImageAttributes(message.favoriteIcon || "assets/icons/other.png")} alt="" aria-hidden="true" /></span>`
          : `<span class="websurf-mail-status" aria-hidden="true"></span>`}
        <img ${assetImageAttributes(message.icon)} alt="" aria-hidden="true" />
        <span class="websurf-mail-sender">${escapeHtml(message.sender)}${silenced ? `<small>Silenced</small>` : ""}</span>
        <span class="websurf-mail-copy"><strong>${escapeHtml(message.subject)}</strong><small>${message.templateId ? renderWebSurfEmailInlineText(getWebSurfAutoEmailTemplate(message.templateId)?.preview || message.preview, message.data) : escapeHtml(message.preview)}</small></span>
        <time>${escapeHtml(formatWebSurfMailTime(message.time))}</time>
      </button>
      ${selected ? `<div class="websurf-mail-detail"><div class="websurf-mail-body"><div class="websurf-email-scroll">${message.templateId ? renderWebSurfAutoEmailBody(message) : `<p>${escapeHtml(message.preview)}</p>`}</div></div><div class="websurf-mail-actions">${!message.templateId ? `<button type="button" data-webpage-destination="${escapeHtml(message.destination)}">Open sender site</button>` : ""}<button type="button" class="websurf-silence-button" data-websurf-silence-sender="${escapeHtml(message.sender)}">${silenced ? "Unsilence sender" : "Silence sender"}</button></div></div>` : ""}
    </article>`;
  }).join("");
  return `<header class="websurf-home-header">
      <img ${assetImageAttributes("assets/icons/WebSurf_icon.png")} alt="WebSurf" />
      <div><span>WEBSURF.SWIM</span><h1 id="webHomeTitle">Welcome, ${escapeHtml(username)}</h1><p>${escapeHtml(addressName)}@WebSurf.swim</p></div>
    </header>
    <main class="websurf-home-main">
      <section class="websurf-bookmarks" aria-labelledby="websurfBookmarksTitle">
        <h2 id="websurfBookmarksTitle">Bookmarks</h2>
        <div class="websurf-bookmark-row">
          <button type="button" class="websurf-bookmark" data-webpage-destination="bank"><img ${assetImageAttributes("assets/misc/coin_unicode.png")} alt="" /><span><strong>Bubble Borough Bank</strong><small>Balance, rewards, and statements</small></span></button>
          <button type="button" class="websurf-bookmark" data-webpage-destination="store"><img ${assetImageAttributes("assets/misc/Box.png")} alt="" /><span><strong>BubbleBodega</strong><small>Food, fish, and aquarium supplies</small></span></button>
          <button type="button" class="websurf-bookmark" data-webpage-destination="proteus" data-proteus-home-link ${proteusDiscovered ? "" : "hidden"}><img ${assetImageAttributes("assets/web/proteus/Proteus_Logo_Icon.png")} alt="" /><span><strong>Proteus Biodyne</strong><small>Adaptive biology and marine research</small></span></button>
          ${davyLockerUnlocked ? `<button type="button" class="websurf-bookmark" data-webpage-destination="locker"><img ${assetImageAttributes("assets/web/davy/icons/davy_icon.png")} alt="" /><span><strong>Davy Jones' Locker</strong><small>Private catalogue · davyjoneslocker.hadal</small></span></button>` : ""}
          <span class="websurf-bookmark is-coming-soon"><span aria-hidden="true">◈</span><span><strong>More coming soon</strong><small>New destinations on the horizon</small></span></span>
        </div>
      </section>
      <div class="websurf-dashboard-grid">
        <section class="websurf-inbox" aria-labelledby="websurfInboxTitle">
          <header><div><span class="websurf-inbox-icon" aria-hidden="true">✉</span><h2 id="websurfInboxTitle">Inbox</h2><span class="websurf-unread-count">${unreadCount}</span></div><button type="button" data-websurf-mark-all-read ${unreadCount ? "" : "disabled"}>Mark all read</button></header>
          <div class="websurf-mail-list">${mailMarkup}</div>
        </section>
        <aside class="websurf-account-card" aria-label="WebSurf account">
          <header><img ${assetImageAttributes("assets/icons/WebSurf_icon.png")} alt="" /><span><strong>WebSurf Account</strong><small>Connected to Bubble Borough</small></span></header>
          <div class="websurf-account-stats"><span><strong>${unreadCount}</strong><small>Unread</small></span><span><strong>${Math.min(99, messages.length * 2)} / 100 MB</strong><small>Mail storage</small></span></div>
          <footer><span>${escapeHtml(addressName)}@WebSurf.swim</span><span>WebSurf 1.4 · Secure</span></footer>
        </aside>
      </div>
    </main>`;
}

function getBubbleBankOrderForTransaction(entry) {
  if (entry?.direction !== "debit" || !/bubblebodega/i.test(String(entry?.place || ""))) return null;
  const orders = sanitizePurchaseHistory(state?.purchaseHistory);
  const linkedOrder = orders.find((order) => order.id === entry.orderId);
  if (linkedOrder) return linkedOrder;
  const entryTime = Number(entry.time) || 0;
  const entryAmount = Math.max(0, Math.floor(Number(entry.amount) || 0));
  const entryLabel = String(entry.label || "").toLowerCase();
  return orders
    .filter((order) => Math.abs((Number(order.placedAt) || 0) - entryTime) <= 120000)
    .map((order) => ({
      order,
      distance: Math.abs((Number(order.placedAt) || 0) - entryTime),
      matchesItem: (order.items || []).some((item) => {
        const name = String(item.name || "").toLowerCase();
        return Math.max(0, Math.floor(Number(item.cost) || 0)) === entryAmount
          && (!name || entryLabel.includes(name) || name.includes(entryLabel.replace(/^(?:bought|purchased|created)\s+/, "")));
      })
    }))
    .filter((candidate) => candidate.matchesItem || Math.floor(Number(candidate.order.total) || 0) === entryAmount)
    .sort((left, right) => left.distance - right.distance)[0]?.order || null;
}

function renderBubbleBankTabs(activeTab) {
  const tabs = [
    ["account", "Account", `<img class="bubble-bank-tab-icon" ${assetImageAttributes("assets/misc/coin_unicode.png")} alt="" />`],
    ["rewards", "Rewards", "✚"],
    ["milestones", "Milestones", "★"]
  ];
  return `<nav class="bubble-bank-tabs" aria-label="Bank sections">${tabs.map(([id, label, icon]) => `
    <button type="button" class="bubble-bank-tab ${activeTab === id ? "is-active" : ""}" data-bank-tab="${id}" aria-current="${activeTab === id ? "page" : "false"}">
      <span aria-hidden="true">${icon}</span>${label}
    </button>`).join("")}</nav>`;
}

function renderBubbleBankCoinAmount(amount, options = {}) {
  return `<span class="bubble-bank-coin-amount ${options.debit ? "is-debit" : options.credit ? "is-credit" : ""}"><img ${assetImageAttributes("assets/icons/coin.png")} alt="Fish Coin" /><strong>${escapeHtml(String(amount))}</strong></span>`;
}

function renderBubbleBankAccount() {
  const filter = String(runtime.bubbleBankTransactionFilter || "all");
  const entries = (Array.isArray(state.walletTransactions) ? state.walletTransactions.slice(0, 60) : [])
    .filter((entry) => bubbleBankTransactionMatchesFilter(entry, filter));
  const transactions = entries.length ? entries.map((entry) => {
    const debit = entry.direction === "debit";
    const neutral = entry.direction === "neutral" || Number(entry.amount) <= 0;
    const milestone = getBubbleBankMilestoneForTransaction(entry);
    const reward = getBubbleBankRewardForTransaction(entry);
    const order = getBubbleBankOrderForTransaction(entry);
    const target = milestone
      ? `<button type="button" class="bubble-bank-row-link" data-bank-tab="milestones" data-bank-target-id="milestone-${escapeHtml(milestone.id)}">View Milestone <span aria-hidden="true">→</span></button>`
      : reward
        ? `<button type="button" class="bubble-bank-row-link" data-bank-tab="rewards" data-bank-target-id="reward-${escapeHtml(reward.dayKey || String(reward.generatedAt))}">View Reward <span aria-hidden="true">→</span></button>`
        : order
          ? `<button type="button" class="bubble-bank-row-link" data-bank-order-id="${escapeHtml(order.id)}">View Purchase <span aria-hidden="true">→</span></button>`
          : "";
    const signedAmount = neutral ? "•" : `${debit ? "−" : "+"}${Math.max(0, Number(entry.amount) || 0)}`;
    return `<article class="bubble-bank-transaction ${neutral ? "is-neutral" : debit ? "is-debit" : "is-credit"}">
      ${renderBubbleBankCoinAmount(signedAmount, { debit, credit: !debit && !neutral })}
      <div class="bubble-bank-transaction-copy"><strong>${escapeHtml(entry.label || "Aquarium activity")}</strong><span>${escapeHtml(String(entry.place || "Aquarium").replace(/tankazon/ig, "BubbleBodega"))}</span></div>
      <time>${escapeHtml(formatBubbleBankTime(entry.time))}</time>${target}
    </article>`;
  }).join("") : `<div class="bubble-bank-empty"><strong>No transactions yet.</strong><span>Feed a fish or visit BubbleBodega to start your account history.</span></div>`;
  return `<section class="bubble-bank-account">
    <div class="bubble-bank-balance-card">
      <div><span>Current Account Balance</span>${renderBubbleBankCoinAmount(state.coins)}<small>Fish Coins</small></div>
    </div>
    <div class="bubble-bank-ledger"><header><div><span aria-hidden="true">▤</span><h3>Transaction history</h3></div>${getBubbleBankTransactionFilterMarkup()}</header>${transactions}</div>
  </section>`;
}

function renderBubbleBankRewards() {
  const history = Array.isArray(state?.dailyBonus?.recapHistory) ? state.dailyBonus.recapHistory : [];
  if (!history.length) {
    return `<div class="bubble-bank-empty"><strong>No daily rewards yet.</strong><span>Your completed daily recaps and their exact score math will appear here.</span></div>`;
  }
  return `<section class="bubble-bank-card-list">${history.map((summary) => {
    const rewardId = `reward-${summary.dayKey || String(summary.generatedAt)}`;
    const positiveRows = (summary.rows || []).filter((row) => Number(row.score) > 0);
    const negativeRows = (summary.rows || []).filter((row) => Number(row.score) < 0);
    const scoreModelNote = summary.scoreModel
      ? `${Number(summary.rawScore) || 0} raw points normalized across ${Math.max(1, Number(summary.fishCount) || Number(summary.tankCount) || 1)} fish/tanks.`
      : "Each listed item contributes directly to the recap score.";
    return `<details class="bubble-bank-reward-card" id="${escapeHtml(rewardId)}" ${runtime.bubbleBankTargetId === rewardId ? "open" : ""}>
      <summary><div><strong>${escapeHtml(formatBubbleBankTime(summary.generatedAt, { dateOnly: true }))}</strong><span>${escapeHtml(formatBubbleBankTime(summary.generatedAt))} · ${escapeHtml(summary.overall || "Daily reward")}</span></div>${renderBubbleBankCoinAmount(`+${Math.max(0, Number(summary.reward) || 0)}`, { credit: true })}<span class="bubble-bank-chevron" aria-hidden="true">⌄</span></summary>
      <div class="bubble-bank-reward-math"><p>${escapeHtml(scoreModelNote)} Reward = max(0, score), capped at ${DAILY_RECAP_REWARD_CAP} coins.</p>
        <div class="bubble-bank-math-columns"><div><h4>Added</h4>${positiveRows.length ? positiveRows.map((row) => `<span><b>+${Math.abs(Number(row.score) || 0)}</b>${escapeHtml(row.text)}</span>`).join("") : "<span>Nothing added that day.</span>"}</div>
        <div><h4>Subtracted</h4>${negativeRows.length ? negativeRows.map((row) => `<span><b>−${Math.abs(Number(row.score) || 0)}</b>${escapeHtml(row.text)}</span>`).join("") : "<span>No negative events.</span>"}</div></div>
      </div>
    </details>`;
  }).join("")}</section>`;
}

function renderBubbleBankMilestones() {
  const unlocked = state?.dailyBonus?.milestones || {};
  const milestones = PROGRESSION_MILESTONES.filter((milestone) => unlocked[milestone.id]);
  if (!milestones.length) {
    return `<div class="bubble-bank-empty"><strong>No milestones unlocked yet.</strong><span>Your completed achievements and Fish Coin payouts will appear here.</span></div>`;
  }
  return `<section class="bubble-bank-card-list">${milestones.map((milestone) => {
    const milestoneId = `milestone-${milestone.id}`;
    const receipt = (state.walletTransactions || []).find((entry) => getBubbleBankMilestoneForTransaction(entry)?.id === milestone.id);
    const unlockedFish = (milestone.unlocks || []).map((id) => runtime.fishMap.get(id)?.name || titleFromFile(id));
    return `<article class="bubble-bank-milestone-card ${runtime.bubbleBankTargetId === milestoneId ? "is-target" : ""}" id="${escapeHtml(milestoneId)}">
      <span class="bubble-bank-milestone-star" aria-hidden="true">★</span><div><span>Milestone unlocked</span><h3>${escapeHtml(milestone.label)}</h3><p>${escapeHtml(milestone.requirement)}</p>${unlockedFish.length ? `<small>Unlocked fish: ${escapeHtml(unlockedFish.join(", "))}</small>` : ""}</div>
      <div>${renderBubbleBankCoinAmount(`+${milestone.reward}`, { credit: true })}${receipt ? `<time>${escapeHtml(formatBubbleBankTime(receipt.time))}</time>` : ""}</div>
    </article>`;
  }).join("")}</section>`;
}

function renderBubbleBankPage() {
  const activeTab = normalizeBubbleBankTab(runtime.bubbleBankTab);
  const profile = sanitizeAccountProfile(state?.accountProfile);
  const username = profile.username || getAccountUsernameForUser(profile.userId);
  const content = activeTab === "rewards" ? renderBubbleBankRewards() : activeTab === "milestones" ? renderBubbleBankMilestones() : renderBubbleBankAccount();
  return `<div class="bubble-bank-window-header">
    <img class="bubble-bank-logo" ${assetImageAttributes("assets/misc/bank_logo.png")} alt="Bubble Borough Bank" />
    ${renderBubbleBankTabs(activeTab)}
    <div class="bubble-bank-window-actions">${renderBubbleBankCoinAmount(state.coins)}</div>
  </div>
  <div class="bubble-bank-scroll"><div class="bubble-bank-shell"><header class="bubble-bank-welcome"><div><span>Hello,</span><h2>${escapeHtml(username)}.</h2><p>Manage your Fish Coins and review your account activity.</p></div><strong>Save small. Swim big.</strong></header>${content}<footer>Fish Coins are earned through feeding, caring for your neighborhood, and completing milestones.</footer></div></div>`;
}

function handleBubbleBankPageClick(event) {
  const target = event?.target instanceof Element ? event.target : null;
  const purchaseButton = target?.closest?.("[data-bank-order-id]");
  if (purchaseButton) {
    const orderId = String(purchaseButton.dataset.bankOrderId || "");
    runtime.bubbleBankOpen = false;
    renderStoreOverlay();
    window.showBubbleBodegaOrder?.(orderId);
    return true;
  }
  const tabButton = target?.closest?.("[data-bank-tab]");
  if (!tabButton) return false;
  runtime.bubbleBankTab = normalizeBubbleBankTab(tabButton.dataset.bankTab);
  runtime.bubbleBankTargetId = String(tabButton.dataset.bankTargetId || "");
  renderStoreOverlay();
  if (runtime.bubbleBankTargetId) {
    window.requestAnimationFrame(() => {
      document.getElementById(runtime.bubbleBankTargetId)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    });
  }
  return true;
}

function handleBubbleBankPageChange(event) {
  const target = event?.target instanceof Element ? event.target : null;
  const filter = target?.closest?.("[data-bank-transaction-filter]");
  if (!filter) return false;
  runtime.bubbleBankTransactionFilter = String(filter.value || "all");
  runtime.bubbleBankTargetId = "";
  renderStoreOverlay();
  return true;
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
                  ${assetImageAttributes(previewImageSrc)}
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
  const layerControls = layers.map((layer) => {
    const activeColor = normalizeDecorColorSetting(settings[layer.id] || "");
    const activeCustomColor = normalizeHexColor(activeColor);
    const originalSelected = !activeColor;
    const rgbSelected = isDecorRgbColorSetting(activeColor);
    const customSelected = Boolean(activeCustomColor);
    const colorizeChecked = colorizeSettings[layer.id] === true;
    const layerLabel = getCaveColorLayerLabel(layer, layers, decor);
    const pickerColor = activeCustomColor || DEFAULT_CUSTOM_GRAVEL_LAYER_COLOR;
    const originalTile = `
      <button
        class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${originalSelected ? "is-selected" : ""}"
        type="button"
        data-cave-color-layer="${escapeHtml(layer.id)}"
        data-cave-color=""
        aria-pressed="${originalSelected}"
        aria-label="Use original ${escapeHtml(layerLabel)} color"
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
        aria-label="Fade ${escapeHtml(layerLabel)} through RGB colors"
        title="RGB color cycle">
        RGB
      </button>
    `;
    const customColorPicker = `
      <label
        class="cave-color-picker-shell ${customSelected ? "is-selected" : ""}"
        data-cave-color-picker-shell="${escapeHtml(layer.id)}"
        title="Choose custom ${escapeHtml(layerLabel)} color">
        <input
          class="cave-color-picker-input"
          type="color"
          value="${escapeHtml(pickerColor)}"
          data-cave-color-picker="${escapeHtml(layer.id)}"
          aria-label="Choose custom ${escapeHtml(layerLabel)} color" />
      </label>
    `;

    return `
      <div class="cave-color-layer-card" data-cave-color-card="${escapeHtml(layer.id)}">
        <div class="bubbler-color-row cave-color-layer-header">
          <span>${escapeHtml(layerLabel)}</span>
          <strong data-cave-color-layer-value="${escapeHtml(layer.id)}">${escapeHtml(formatCaveColorChoiceLabel(activeColor))}</strong>
        </div>
        <div class="bubbler-color-swatches cave-color-swatches">
          <div class="color-choice-mode-row">
            ${originalTile}
            ${rgbTile}
            ${customColorPicker}
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
      <div class="custom-decor-type-summary">Choose Original, RGB cycle, or any custom color.</div>
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
          ${assetImageAttributes(pending.frontDataUrl)}
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
          ? `<img ${assetImageAttributes(pending.frontDataUrl)} alt="Uploaded custom hide front preview" style="aspect-ratio: ${escapeHtml(frontAspectRatio)};" />`
          : `<span class="custom-hide-upload-empty">Choose front image</span>`}
      </button>
      <button
        class="custom-hide-upload-tile ${hasBackgroundImage ? "has-image" : ""}"
        type="button"
        data-choose-custom-hide-background
        ${hasFrontImage ? "" : "disabled"}>
        <span class="custom-hide-upload-label">Background</span>
        ${hasBackgroundImage
          ? `<img ${assetImageAttributes(pending.bgDataUrl)} alt="Uploaded custom hide background preview" style="aspect-ratio: ${escapeHtml(bgAspectRatio)};" />`
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
              ${assetImageAttributes(pending.bgDataUrl)}
              alt="Uploaded custom hide background preview"
              data-custom-hide-bg-preview />
            <img
              class="custom-decor-motion-source custom-hide-overlay-image custom-hide-overlay-front"
              ${assetImageAttributes(pending.frontDataUrl)}
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
          <em>Choose the front layer. The cave interior and background remain on their required layers behind it.</em>
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
    <div class="custom-decor-name-panel decor-settings-panel decor-settings-compact-panel">
      <div class="custom-decor-create-layout decor-settings-layout decor-settings-compact-layout">
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

function renderLegacyCaveSettingsControls(item) {
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


function renderCaveSettingsControls(item) {
  const compactMode = runtime.utilityOverlayMode === "decor-settings" || runtime.utilityOverlayMode === "custom-decor-settings";
  if (!compactMode) {
    return renderLegacyCaveSettingsControls(item);
  }

  const settings = getPlacedCaveSettings(item) || sanitizePlacedCaveSettings();
  const currentTab = ["entries", "seats", "preview"].includes(runtime.decorSettingsCaveTab)
    ? runtime.decorSettingsCaveTab
    : "entries";
  const tabButton = (id, label, icon) => `
    <button
      class="decor-cave-tab ${currentTab === id ? "is-active" : ""}"
      type="button"
      role="tab"
      data-decor-cave-tab="${id}"
      aria-selected="${currentTab === id ? "true" : "false"}">
      <span class="decor-cave-tab-icon" aria-hidden="true">${icon}</span>
      <span>${label}</span>
    </button>
  `;

  const entryRows = settings.entries.map((entry, index) => {
    const active = index === settings.activeEntryIndex;
    const side = normalizeCaveEntrySide(entry.side);
    const sideOptions = CAVE_ENTRY_SIDE_OPTIONS.map((option) => `
      <option value="${escapeHtml(option.id)}" ${side === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>
    `).join("");
    return `
      <div class="decor-cave-point-row ${active ? "is-active" : ""}" data-cave-entry-card="${index}">
        <button class="decor-cave-point-badge is-entry" type="button" data-cave-entry-select="${index}" aria-label="Select entry ${index + 1}">${index + 1}</button>
        <label class="decor-cave-side-control">
          <span class="sr-only">Entry ${index + 1} side</span>
          <select class="shop-sort-select" data-cave-setting="entrySide" data-cave-entry-index="${index}" aria-label="Cave entry ${index + 1} side">
            ${sideOptions}
          </select>
        </label>
        <label class="decor-cave-coordinate-control">
          <span>X <strong data-cave-setting-value="entryX" data-cave-entry-index="${index}">${formatCaveSettingPercent(entry.x)}</strong></span>
          <input type="range" min="0.02" max="0.98" step="0.01" value="${entry.x}" data-cave-setting="entryX" data-cave-entry-index="${index}" />
        </label>
        <label class="decor-cave-coordinate-control">
          <span>Y <strong data-cave-setting-value="entryY" data-cave-entry-index="${index}">${formatCaveSettingPercent(entry.y)}</strong></span>
          <input type="range" min="0.02" max="0.98" step="0.01" value="${entry.y}" data-cave-setting="entryY" data-cave-entry-index="${index}" />
        </label>
        <button class="decor-cave-delete-button" type="button" data-cave-remove-entry="${index}" aria-label="Delete entry ${index + 1}" title="Delete entry" ${settings.entryCount <= CAVE_SETTINGS_MIN_ENTRIES ? "disabled" : ""}>×</button>
      </div>
    `;
  }).join("");

  const seatRows = settings.seats.map((seat, index) => {
    const active = index === settings.activeSeatIndex;
    const facing = normalizeCaveSeatFacing(seat.facing);
    return `
      <div class="decor-cave-point-row ${active ? "is-active" : ""}" data-cave-seat-card="${index}">
        <button class="decor-cave-point-badge is-seat" type="button" data-cave-seat-select="${index}" aria-label="Select seat ${index + 1}">${index + 1}</button>
        <div class="decor-cave-facing-control" role="group" aria-label="Seat ${index + 1} facing">
          <button class="cave-seat-facing-button ${facing < 0 ? "is-selected" : ""}" type="button" data-cave-seat-facing="-1" data-cave-seat-index="${index}" aria-pressed="${facing < 0 ? "true" : "false"}" title="Face left">‹</button>
          <button class="cave-seat-facing-button ${facing > 0 ? "is-selected" : ""}" type="button" data-cave-seat-facing="1" data-cave-seat-index="${index}" aria-pressed="${facing > 0 ? "true" : "false"}" title="Face right">›</button>
        </div>
        <label class="decor-cave-coordinate-control">
          <span>X <strong data-cave-setting-value="seatX" data-cave-seat-index="${index}">${formatCaveSettingPercent(seat.x)}</strong></span>
          <input type="range" min="0.02" max="0.98" step="0.01" value="${seat.x}" data-cave-setting="seatX" data-cave-seat-index="${index}" />
        </label>
        <label class="decor-cave-coordinate-control">
          <span>Y <strong data-cave-setting-value="seatY" data-cave-seat-index="${index}">${formatCaveSettingPercent(seat.y)}</strong></span>
          <input type="range" min="0.02" max="0.98" step="0.01" value="${seat.y}" data-cave-setting="seatY" data-cave-seat-index="${index}" />
        </label>
        <button class="decor-cave-delete-button" type="button" data-cave-remove-seat="${index}" aria-label="Delete seat ${index + 1}" title="Delete seat" ${settings.seatCount <= CAVE_SETTINGS_MIN_SEATS ? "disabled" : ""}>×</button>
      </div>
    `;
  }).join("");

  let panelMarkup = "";
  if (currentTab === "entries") {
    panelMarkup = `
      <div class="decor-cave-list-header">
        <strong>${settings.entryCount} ${settings.entryCount === 1 ? "Entry" : "Entries"}</strong>
        <button class="decor-cave-add-button" type="button" data-cave-add-entry ${settings.entryCount >= CAVE_SETTINGS_MAX_ENTRIES ? "disabled" : ""}>+ Add Entry</button>
      </div>
      <div class="decor-cave-compact-list">${entryRows}</div>
    `;
  } else if (currentTab === "seats") {
    panelMarkup = `
      <div class="decor-cave-list-header">
        <strong>${settings.seatCount} ${pluralize("Seat", settings.seatCount)}</strong>
        <button class="decor-cave-add-button" type="button" data-cave-add-seat ${settings.seatCount >= CAVE_SETTINGS_MAX_SEATS ? "disabled" : ""}>+ Add Seat</button>
      </div>
      <div class="decor-cave-compact-list">${seatRows}</div>
    `;
  } else {
    panelMarkup = `
      <div class="decor-cave-preview-summary">
        <strong>Position cave points directly on the preview.</strong>
        <span>Drag the numbered entry and seat markers on the decor image. The X and Y values update live.</span>
        <div class="decor-cave-preview-stats">
          <span><b>${settings.entryCount}</b> ${settings.entryCount === 1 ? "entry" : "entries"}</span>
          <span><b>${settings.seatCount}</b> ${pluralize("seat", settings.seatCount)}</span>
        </div>
      </div>
    `;
  }

  return `
    <section class="decor-settings-cave-panel">
      <div class="decor-cave-tabs" role="tablist" aria-label="Cave settings">
        ${tabButton("entries", "Entries", "↪")}
        ${tabButton("seats", "Seats", "●")}
        ${tabButton("preview", "Preview", "◉")}
      </div>
      <div class="decor-cave-tab-panel" role="tabpanel">${panelMarkup}</div>
    </section>
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
    return `<div class="custom-decor-name-panel decor-settings-panel transit-tube-settings"><div class="custom-decor-create-layout decor-settings-layout"><div class="custom-decor-preview-column"><div class="custom-decor-size-window"><img class="transit-tube-settings-preview" ${assetImageAttributes(getDecorThumbnailPath(decor))} alt="Clear transit tube"></div><div class="mini-note">Fish use a linked pair as a shortcut when traveling to services or home. Bubbles only run during transit.</div></div><div class="custom-decor-controls-column"><label class="custom-decor-name-row"><span>Tube name</span><input type="text" maxlength="36" value="${escapeHtml(getTransitTubeDisplayName(item, currentTank))}" data-transit-tube-name="${escapeHtml(item.id)}"></label><label class="custom-decor-name-row"><span>Connect to</span><select class="shop-sort-select" data-transit-tube-link="${escapeHtml(item.id)}"><option value="">Not connected</option>${options}</select></label><div class="custom-decor-type-summary">${linked ? `Linked to ${escapeHtml(getTransitTubeDisplayName(linked.item, linked.tank))} in ${escapeHtml(getTankLabel(linked.tank))}.` : "Place another tube in a different neighborhood, then select it here."}</div><div class="bubbler-color-row"><span>Glass color</span><strong>${escapeHtml(formatCaveColorChoiceLabel(activeColor))}</strong></div><div class="bubbler-color-swatches"><button class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${!activeColor ? "is-selected" : ""}" type="button" data-transit-tube-color="" aria-pressed="${!activeColor}">Original</button>${colorSwatches}</div></div></div></div>`;
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
  const layerHelpText = isThreeLayerCaveDecorKey(item.decorKey)
    ? "Choose the cave's front layer. Its interior stays one layer behind and its background stays two layers behind."
    : isCaveDecorKey(item.decorKey)
    ? "Choose the cave's front layer. Its interior stays one layer behind."
    : "Layer 1 draws closest to the glass. Layer 5 draws deepest in the tank.";
  const swaySideOptions = DECOR_SWAY_SIDE_OPTIONS.map((option) => `
    <option value="${escapeHtml(option.id)}" ${motionSettings.swaySide === option.id ? "selected" : ""}>
      ${escapeHtml(option.label)}
    </option>
  `).join("");
  const motionControls = hasMotionControls ? `
    <section class="decor-settings-control-section decor-settings-motion-section">
      <div class="decor-settings-section-title">
        <span>${capabilities.hasSway ? "Sway" : "Motion"}</span>
        <small>${escapeHtml(capabilities.summary)}</small>
      </div>
      <div class="decor-settings-motion-grid">
        ${capabilities.hasSway ? `
          <label class="decor-settings-compact-control decor-settings-select-control">
            <span><b class="decor-settings-control-glyph" aria-hidden="true">≈</b>Area</span>
            <select class="shop-sort-select" data-decor-setting="swaySide" aria-label="Decor sway area">
              ${swaySideOptions}
            </select>
          </label>
          <label class="decor-settings-compact-control">
            <span><b class="decor-settings-control-glyph" aria-hidden="true">≋</b>Starts <strong data-decor-setting-value="swaySplitY">${Math.round(motionSettings.swaySplitY * 100)}%</strong></span>
            <input type="range" min="8" max="92" step="1" value="${Math.round(motionSettings.swaySplitY * 100)}" data-decor-setting="swaySplitY" />
          </label>
          <label class="decor-settings-compact-control">
            <span><b class="decor-settings-control-glyph" aria-hidden="true">≋</b>Intensity <strong data-decor-setting-value="swayIntensity">${motionSettings.swayIntensity.toFixed(2)}x</strong></span>
            <input type="range" min="${MIN_CUSTOM_DECOR_MOTION_INTENSITY}" max="${MAX_CUSTOM_DECOR_MOTION_INTENSITY}" step="0.05" value="${motionSettings.swayIntensity}" data-decor-setting="swayIntensity" />
          </label>
          <label class="decor-settings-compact-control">
            <span><b class="decor-settings-control-glyph" aria-hidden="true">∿</b>Speed <strong data-decor-setting-value="swaySpeed">${motionSettings.swaySpeed.toFixed(2)}x</strong></span>
            <input type="range" min="${MIN_DECOR_MOTION_SPEED}" max="${MAX_DECOR_MOTION_SPEED}" step="0.05" value="${motionSettings.swaySpeed}" data-decor-setting="swaySpeed" />
          </label>
        ` : ""}
        ${capabilities.hasBob ? `
          <label class="decor-settings-compact-control">
            <span><b class="decor-settings-control-glyph" aria-hidden="true">↕</b>Bob <strong data-decor-setting-value="bobIntensity">${motionSettings.bobIntensity.toFixed(2)}x</strong></span>
            <input type="range" min="${MIN_CUSTOM_DECOR_MOTION_INTENSITY}" max="${MAX_CUSTOM_DECOR_MOTION_INTENSITY}" step="0.05" value="${motionSettings.bobIntensity}" data-decor-setting="bobIntensity" />
          </label>
          <label class="decor-settings-compact-control">
            <span><b class="decor-settings-control-glyph" aria-hidden="true">⌁</b>Bob Speed <strong data-decor-setting-value="bobSpeed">${motionSettings.bobSpeed.toFixed(2)}x</strong></span>
            <input type="range" min="${MIN_DECOR_MOTION_SPEED}" max="${MAX_DECOR_MOTION_SPEED}" step="0.05" value="${motionSettings.bobSpeed}" data-decor-setting="bobSpeed" />
          </label>
        ` : ""}
      </div>
    </section>
  ` : hasBubblerControls
    ? `<div class="mini-note decor-settings-inline-note">The object stays still while the bubble stream preview updates live.</div>`
    : hasCaveControls
      ? ""
      : `<div class="mini-note decor-settings-inline-note">This decor is still, so only size and layer are available.</div>`;
  const controlsMarkup = `
    <div class="custom-decor-controls-column decor-settings-controls-column">
      <div class="decor-settings-top-grid">
        <label class="decor-settings-control-card">
          <span class="decor-settings-card-heading">Size <strong data-decor-setting-value="size">${formatDecorScale(sizeValue)}</strong></span>
          <input type="range" min="${DECOR_SCALE_MIN}" max="${DECOR_SCALE_MAX}" step="0.01" value="${sizeValue}" data-decor-setting="size" />
        </label>
        <div class="decor-settings-control-card decor-settings-layer-card">
          <span class="decor-settings-card-heading">Layer <strong data-decor-setting-value="tankLayer">${escapeHtml(layerReadout)}</strong></span>
          <div class="decor-settings-layer-row">
            <select class="shop-sort-select" data-decor-setting="tankLayer" aria-label="Decor layer" title="${escapeHtml(layerHelpText)}">
              ${layerOptions}
            </select>
            <div class="decor-settings-layer-stepper" role="group" aria-label="Move decor layer">
              <button type="button" data-decor-layer-step="-1" aria-label="Move one layer closer" title="Move one layer closer">▲</button>
              <button type="button" data-decor-layer-step="1" aria-label="Move one layer deeper" title="Move one layer deeper">▼</button>
            </div>
          </div>
        </div>
      </div>
      ${motionControls}
      ${hasCaveColorControls ? `<section class="decor-settings-control-section decor-settings-color-section"><div class="decor-settings-section-title"><span>Color</span></div>${renderCaveColorSettingsControls(item, decor)}</section>` : ""}
      ${hasCaveControls ? renderCaveSettingsControls(item) : ""}
      ${hasBubblerControls ? `<section class="decor-settings-control-section decor-settings-bubbler-section">${renderBubblerSettingsOverlay(item)}</section>` : ""}
    </div>
  `;

  return `
    <div class="custom-decor-name-panel decor-settings-panel decor-settings-compact-panel">
      <div class="custom-decor-create-layout decor-settings-layout decor-settings-compact-layout">
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
                  ${assetImageAttributes(imageSrc)}
                  alt="Selected decor preview"
                  data-decor-settings-preview />
                ${capabilities.hasSway ? `<div class="custom-decor-motion-split-line" style="top: ${(motionSettings.swaySplitY * 100).toFixed(2)}%;" data-decor-settings-split-line></div>` : ""}
                ${hasCaveControls ? renderCaveSettingsMarkers(caveSettings) : ""}
              </div>
            </div>
            ${hasCaveControls ? `<div class="decor-settings-preview-hint">Drag the numbered markers to position entries and seats.</div>` : ""}
          </div>
        </div>
        ${controlsMarkup}
      </div>
    </div>
  `;
}
