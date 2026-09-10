// Source fragment: machinery/submarine.js
// Assembled into ../app.js by scripts/build-app-bundle.cjs.

function normalizeSubmarineResourceCount(value) {
  return clamp(Math.floor(Number(value) || 0), 0, SUBMARINE_RESOURCE_CAPACITY);
}

function sanitizeSubmarineInventory(rawInventory) {
  const source = rawInventory && typeof rawInventory === "object" ? rawInventory : {};
  return {
    food: normalizeSubmarineResourceCount(source.food),
    health: normalizeSubmarineResourceCount(source.health),
    calming: normalizeSubmarineResourceCount(source.calming)
  };
}

function normalizeBoatResourceCount(value) {
  return clamp(Math.floor(Number(value) || 0), 0, BOAT_RESOURCE_CAPACITY);
}

function sanitizeBoatInventory(rawInventory) {
  const source = rawInventory && typeof rawInventory === "object" ? rawInventory : {};
  return {
    chum: normalizeBoatResourceCount(source.chum)
  };
}

function getMachineryColorSetting(machinery) {
  return normalizeDecorColorSetting(machinery?.machineryColor ?? machinery?.colorSetting ?? "");
}

function getMachineryColorizeSetting(machinery) {
  return normalizeDecorColorizeSetting(machinery?.machineryColorize ?? false);
}

function getMachineryColorCycleFilter(machinery, now = Date.now()) {
  const color = getMachineryColorSetting(machinery);
  if (!isDecorRgbColorSetting(color)) return "none";
  return getMachineryColorizeSetting(machinery)
    ? getDecorRgbColorizeFilter(now)
    : getDecorRgbCycleFilter(now);
}

function getMachineryTintedImage(imagePath, sourceImage, machinery) {
  const color = getMachineryColorSetting(machinery);
  if (!color || isDecorRgbColorSetting(color)) return sourceImage;
  return getTintedCaveLayerImage(imagePath, color, {
    sourceImage,
    colorize: getMachineryColorizeSetting(machinery)
  }) || sourceImage;
}

function updateMachineryColorSetting(machinery, setting, rawValue) {
  if (!machinery || ![MACHINERY_TYPE_SUBMARINE, MACHINERY_TYPE_BOAT].includes(machinery.type)) return false;
  let changed = false;
  if (setting === "color") {
    const nextColor = normalizeDecorColorSetting(rawValue);
    if (getMachineryColorSetting(machinery) !== nextColor) {
      machinery.machineryColor = nextColor;
      changed = true;
    }
  } else if (setting === "colorize") {
    const nextColorize = normalizeDecorColorizeSetting(rawValue);
    if (getMachineryColorizeSetting(machinery) !== nextColorize) {
      machinery.machineryColorize = nextColorize;
      changed = true;
    }
  }
  if (changed) saveState();
  renderSubmarineManager();
  return changed;
}

function renderMachineryColorSettingsMarkup(machinery) {
  const activeColor = getMachineryColorSetting(machinery);
  const originalSelected = !activeColor;
  const rgbSelected = isDecorRgbColorSetting(activeColor);
  const originalTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile ${originalSelected ? "is-selected" : ""}"
      type="button"
      data-machinery-color=""
      aria-pressed="${originalSelected}"
      aria-label="Use original machinery color"
      title="Original color">
      Original
    </button>
  `;
  const rgbTile = `
    <button
      class="custom-gravel-color-swatch bubbler-color-swatch bubbler-color-default-tile cave-color-rgb-tile ${rgbSelected ? "is-selected" : ""}"
      type="button"
      data-machinery-color="${DECOR_RGB_COLOR_SETTING}"
      aria-pressed="${rgbSelected}"
      aria-label="Fade machinery through RGB colors"
      title="RGB color cycle">
      RGB
    </button>
  `;
  const swatches = getCustomGravelColorChoices().map((choice) => {
    const selected = activeColor === choice.color;
    return `
      <button
        class="custom-gravel-color-swatch bubbler-color-swatch ${selected ? "is-selected" : ""}"
        type="button"
        style="--swatch:${choice.color};"
        data-machinery-color="${choice.color}"
        aria-pressed="${selected}"
        aria-label="Set machinery to ${escapeHtml(choice.label)}"
        title="${escapeHtml(choice.label)}"></button>
    `;
  }).join("");
  return `
    <div class="machinery-settings-panel fish-inspector-settings" ${runtime.machinerySettingsOpen ? "" : "hidden"}>
      <div class="fish-inspector-color-card">
        <div class="bubbler-color-row cave-color-layer-header">
          <span>Color</span>
          <strong>${escapeHtml(formatCaveColorChoiceLabel(activeColor))}</strong>
        </div>
        <div class="bubbler-color-swatches cave-color-swatches fish-inspector-color-swatches" role="group" aria-label="Machinery color choices">
          <div class="color-choice-mode-row">${originalTile}${rgbTile}</div>
          <div class="color-choice-swatch-row">${swatches}</div>
        </div>
        <label class="cave-colorize-toggle fish-inspector-colorize-toggle">
          <input type="checkbox" data-machinery-colorize ${getMachineryColorizeSetting(machinery) ? "checked" : ""} />
          <span>Colorize</span>
        </label>
      </div>
    </div>
  `;
}

function sanitizeStoredSubmarineState(rawStoredSubmarine, now = Date.now()) {
  if (!rawStoredSubmarine || typeof rawStoredSubmarine !== "object") return null;
  return {
    id: typeof rawStoredSubmarine.id === "string" && rawStoredSubmarine.id.trim()
      ? rawStoredSubmarine.id.trim()
      : createId("submarine"),
    direction: Number(rawStoredSubmarine.direction) < 0 ? -1 : 1,
    tankLayer: clampTankLayer(rawStoredSubmarine.tankLayer ?? SUBMARINE_DEFAULT_TANK_LAYER),
    createdAt: Math.max(0, Number(rawStoredSubmarine.createdAt) || now),
    autopilot: rawStoredSubmarine.autopilot !== false,
    machineryColor: normalizeDecorColorSetting(rawStoredSubmarine.machineryColor ?? rawStoredSubmarine.colorSetting ?? ""),
    machineryColorize: normalizeDecorColorizeSetting(rawStoredSubmarine.machineryColorize ?? false),
    appearanceVariantKey: typeof rawStoredSubmarine.appearanceVariantKey === "string" ? rawStoredSubmarine.appearanceVariantKey : null,
    inventory: sanitizeSubmarineInventory(rawStoredSubmarine.inventory)
  };
}

function createStoredSubmarineState(submarine, now = Date.now()) {
  if (!submarine || submarine.type !== MACHINERY_TYPE_SUBMARINE) return null;
  return sanitizeStoredSubmarineState({
    id: submarine.id,
    direction: submarine.direction,
    tankLayer: submarine.tankLayer,
    createdAt: submarine.createdAt,
    autopilot: submarine.autopilot,
    machineryColor: getMachineryColorSetting(submarine),
    machineryColorize: getMachineryColorizeSetting(submarine),
    appearanceVariantKey: submarine.appearanceVariantKey,
    inventory: submarine.inventory
  }, now);
}

function sanitizeStoredBoatState(rawStoredBoat, now = Date.now()) {
  if (!rawStoredBoat || typeof rawStoredBoat !== "object") return null;
  return {
    id: typeof rawStoredBoat.id === "string" && rawStoredBoat.id.trim()
      ? rawStoredBoat.id.trim()
      : createId("boat"),
    direction: Number(rawStoredBoat.direction) < 0 ? -1 : 1,
    tankLayer: BOAT_SURFACE_LAYER,
    createdAt: Math.max(0, Number(rawStoredBoat.createdAt) || now),
    autopilot: rawStoredBoat.autopilot !== false,
    machineryColor: normalizeDecorColorSetting(rawStoredBoat.machineryColor ?? rawStoredBoat.colorSetting ?? ""),
    machineryColorize: normalizeDecorColorizeSetting(rawStoredBoat.machineryColorize ?? false),
    appearanceVariantKey: typeof rawStoredBoat.appearanceVariantKey === "string" ? rawStoredBoat.appearanceVariantKey : null,
    inventory: sanitizeBoatInventory(rawStoredBoat.inventory)
  };
}

function createStoredBoatState(boat, now = Date.now()) {
  if (!boat || boat.type !== MACHINERY_TYPE_BOAT) return null;
  return sanitizeStoredBoatState({
    id: boat.id,
    direction: boat.direction,
    createdAt: boat.createdAt,
    autopilot: boat.autopilot,
    machineryColor: getMachineryColorSetting(boat),
    machineryColorize: getMachineryColorizeSetting(boat),
    appearanceVariantKey: boat.appearanceVariantKey,
    inventory: boat.inventory
  }, now);
}

function getStoredSubmarineState() {
  if (!state) return null;
  return getStoredSubmarineStates()[0] || null;
}

function getStoredSubmarineStates() {
  if (!state) return [];
  if (!Array.isArray(state.storedSubmarines)) {
    state.storedSubmarines = state.storedSubmarine ? [state.storedSubmarine] : [];
  }
  return state.storedSubmarines;
}

function getStoredBoatState() {
  if (!state) return null;
  return getStoredBoatStates()[0] || null;
}

function getStoredBoatStates() {
  if (!state) return [];
  if (!Array.isArray(state.storedBoats)) {
    state.storedBoats = state.storedBoat ? [state.storedBoat] : [];
  }
  return state.storedBoats;
}

function createSubmarineMachinery(tankId, now = Date.now(), options = {}) {
  return {
    id: typeof options.id === "string" && options.id.trim() ? options.id.trim() : createId("submarine"),
    type: MACHINERY_TYPE_SUBMARINE,
    tankId: String(tankId || ""),
    xNorm: clamp(Number(options.xNorm) || 0.5, 0.08, 0.92),
    yNorm: clamp(Number(options.yNorm) || 0.48, 0.16, 0.78),
    targetXNorm: clamp(Number(options.targetXNorm) || 0.68, 0.08, 0.92),
    targetYNorm: clamp(Number(options.targetYNorm) || 0.46, 0.16, 0.78),
    direction: Number(options.direction) < 0 ? -1 : 1,
    displayDirection: Number(options.direction) < 0 ? -1 : 1,
    turnStartedAt: null,
    turnDurationMs: 0,
    turnFromDirection: Number(options.direction) < 0 ? -1 : 1,
    turnToDirection: Number(options.direction) < 0 ? -1 : 1,
    turnSpinDirection: Number(options.direction) < 0 ? -1 : 1,
    tankLayer: clampTankLayer(Number.isFinite(Number(options.tankLayer)) ? Number(options.tankLayer) : SUBMARINE_DEFAULT_TANK_LAYER),
    manualVelocityXPxPerSecond: Number.isFinite(Number(options.manualVelocityXPxPerSecond)) ? Number(options.manualVelocityXPxPerSecond) : 0,
    manualVelocityYPxPerSecond: Number.isFinite(Number(options.manualVelocityYPxPerSecond)) ? Number(options.manualVelocityYPxPerSecond) : 0,
    motionVelocityXPxPerSecond: Number.isFinite(Number(options.motionVelocityXPxPerSecond)) ? Number(options.motionVelocityXPxPerSecond) : 0,
    motionVelocityYPxPerSecond: Number.isFinite(Number(options.motionVelocityYPxPerSecond)) ? Number(options.motionVelocityYPxPerSecond) : 0,
    idleUntil: Math.max(0, Number(options.idleUntil) || 0),
    targetAt: Math.max(0, Number(options.targetAt) || now),
    nextScanAt: Math.max(0, Number(options.nextScanAt) || now),
    createdAt: Math.max(0, Number(options.createdAt) || now),
    autopilot: options.autopilot !== false,
    machineryColor: normalizeDecorColorSetting(options.machineryColor ?? options.colorSetting ?? ""),
    machineryColorize: normalizeDecorColorizeSetting(options.machineryColorize ?? false),
    appearanceVariantKey: typeof options.appearanceVariantKey === "string" ? options.appearanceVariantKey : null,
    inventory: sanitizeSubmarineInventory(options.inventory),
    entryStartedAt: Number.isFinite(Number(options.entryStartedAt)) ? Number(options.entryStartedAt) : null,
    entryDurationMs: Math.max(0, Number(options.entryDurationMs) || 0),
    entryFromYNorm: Number.isFinite(Number(options.entryFromYNorm))
      ? clamp(Number(options.entryFromYNorm), 0.02, 0.18)
      : null,
    entrySplashTriggered: options.entrySplashTriggered === true,
    mission: null
  };
}

function createBoatMachinery(tankId, now = Date.now(), options = {}) {
  return {
    id: typeof options.id === "string" && options.id.trim() ? options.id.trim() : createId("boat"),
    type: MACHINERY_TYPE_BOAT,
    tankId: String(tankId || ""),
    xNorm: clamp(Number(options.xNorm) || 0.5, 0.08, 0.92),
    yNorm: 0.16,
    targetXNorm: clamp(Number(options.targetXNorm) || 0.74, 0.08, 0.92),
    targetYNorm: 0.16,
    direction: Number(options.direction) < 0 ? -1 : 1,
    displayDirection: Number(options.direction) < 0 ? -1 : 1,
    turnStartedAt: null,
    turnDurationMs: 0,
    turnFromDirection: Number(options.direction) < 0 ? -1 : 1,
    turnToDirection: Number(options.direction) < 0 ? -1 : 1,
    turnSpinDirection: Number(options.direction) < 0 ? -1 : 1,
    tankLayer: BOAT_SURFACE_LAYER,
    manualVelocityXPxPerSecond: Number.isFinite(Number(options.manualVelocityXPxPerSecond)) ? Number(options.manualVelocityXPxPerSecond) : 0,
    motionVelocityXPxPerSecond: Number.isFinite(Number(options.motionVelocityXPxPerSecond)) ? Number(options.motionVelocityXPxPerSecond) : 0,
    motionVelocityYPxPerSecond: 0,
    idleUntil: Math.max(0, Number(options.idleUntil) || 0),
    targetAt: Math.max(0, Number(options.targetAt) || now),
    createdAt: Math.max(0, Number(options.createdAt) || now),
    autopilot: options.autopilot !== false,
    machineryColor: normalizeDecorColorSetting(options.machineryColor ?? options.colorSetting ?? ""),
    machineryColorize: normalizeDecorColorizeSetting(options.machineryColorize ?? false),
    appearanceVariantKey: typeof options.appearanceVariantKey === "string" ? options.appearanceVariantKey : null,
    inventory: sanitizeBoatInventory(options.inventory),
    entryStartedAt: Number.isFinite(Number(options.entryStartedAt)) ? Number(options.entryStartedAt) : null,
    entryDurationMs: Math.max(0, Number(options.entryDurationMs) || 0),
    entryFromYNorm: Number.isFinite(Number(options.entryFromYNorm))
      ? clamp(Number(options.entryFromYNorm), 0.02, 0.18)
      : null,
    entrySplashTriggered: options.entrySplashTriggered === true,
    mission: null
  };
}

function sanitizeMachineryState(rawMachinery, tanks = getAllTanks(), now = Date.now()) {
  const validTanks = Array.isArray(tanks) ? tanks.filter(Boolean) : [];
  const fallbackTankId = validTanks[0]?.id || "";
  const validTankIds = new Set(validTanks.map((tank) => tank.id));
  const source = Array.isArray(rawMachinery) ? rawMachinery : [];
  const sanitized = [];
  for (const entry of source) {
    if (!entry || ![MACHINERY_TYPE_SUBMARINE, MACHINERY_TYPE_BOAT].includes(entry.type)) {
      continue;
    }
    const tankId = validTankIds.has(entry.tankId) ? entry.tankId : fallbackTankId;
    if (!tankId) {
      continue;
    }
    sanitized.push(
      entry.type === MACHINERY_TYPE_BOAT
        ? createBoatMachinery(tankId, now, entry)
        : createSubmarineMachinery(tankId, now, entry)
    );
  }
  return sanitized;
}

function getMachineryList() {
  if (!Array.isArray(state?.machinery)) {
    if (state) state.machinery = [];
  }
  return state?.machinery || [];
}

function getMachineryById(machineryId) {
  const id = String(machineryId || "");
  return id ? getMachineryList().find((item) => item?.id === id) || null : null;
}

function getSubmarine() {
  return getMachineryList().find((item) => item?.type === MACHINERY_TYPE_SUBMARINE) || null;
}

function getBoat() {
  return getMachineryList().find((item) => item?.type === MACHINERY_TYPE_BOAT) || null;
}

function isSubmarineOwned() {
  return Boolean(state?.submarineOwned || getSubmarine() || getStoredSubmarineState());
}

function isBoatOwned() {
  return Boolean(state?.boatOwned || getBoat() || getStoredBoatState());
}

function getMachineryForTank(tankId) {
  const id = String(tankId || "");
  return getMachineryList().filter((item) => item?.tankId === id);
}

function getSubmarineTank(submarine = getSubmarine()) {
  return submarine ? getTankById(submarine.tankId) : null;
}

function getBoatTank(boat = getBoat()) {
  return boat ? getTankById(boat.tankId) : null;
}

function getSubmarineFoodCount(submarine = getSubmarine()) {
  return normalizeSubmarineResourceCount(submarine?.inventory?.food);
}

function isSubmarineOutOfResources(submarine = getSubmarine()) {
  if (!submarine) return false;
  const inventory = sanitizeSubmarineInventory(submarine.inventory);
  return inventory.food <= 0 || inventory.health <= 0 || inventory.calming <= 0;
}

function getSubmarinePlayerFoodCount() {
  return getFoodCatalog()
    .filter((food) => shouldShowFoodInStore(food) && food.id !== "upgraded")
    .reduce((total, food) => total + Math.max(0, Math.floor(Number(state.foodInventory?.[food.id]) || 0)), 0);
}

function buySubmarine(options = {}) {
  const variant = getMachineryAppearanceVariants(MACHINERY_TYPE_SUBMARINE)
    .find((entry) => entry.key === options.appearanceVariantKey);
  if (options.appearanceVariantKey && !variant) {
    showToast("That submarine appearance is no longer available.", { tone: "error" });
    return false;
  }
  return performCoinTransaction({
    amount: SUBMARINE_COST,
    insufficientMessage: `You need ${SUBMARINE_COST} ${pluralize("coin", SUBMARINE_COST)} for the Automated Care Submarine.`,
    apply: () => {
      state.submarineOwned = true;
      const stored = sanitizeStoredSubmarineState({ appearanceVariantKey: variant?.key, inventory: null }, Date.now());
      state.storedSubmarines = [...getStoredSubmarineStates(), stored];
      state.storedSubmarine = state.storedSubmarines[0] || null;
      runtime.equipmentEditTrayTab = "storage";
    },
    event: {
      type: "equipment",
      tone: "positive",
      text: "Purchased the Automated Care Submarine. It is ready to deploy from Edit > Equipment."
    },
    toast: "Submarine purchased. Deploy it from Edit > Equipment."
  });
}

function deploySubmarine(targetTank = getCurrentTank(), now = Date.now()) {
  if (!isSubmarineOwned() || !targetTank) return false;
  const storedSubmarine = getStoredSubmarineState();
  const existing = getSubmarine();
  if (!storedSubmarine && existing) return moveSubmarineToTank(targetTank, now);
  const dropXNorm = randomBetween(0.26, 0.74);
  const submarine = createSubmarineMachinery(targetTank.id, now, {
    ...(storedSubmarine || {}),
    xNorm: dropXNorm,
    yNorm: 0.46,
    targetXNorm: dropXNorm,
    targetYNorm: 0.46,
    manualVelocityXPxPerSecond: 0,
    manualVelocityYPxPerSecond: 0,
    entryStartedAt: now,
    entryDurationMs: SUBMARINE_ENTRY_DURATION_MS,
    entryFromYNorm: SUBMARINE_ENTRY_FROM_Y_NORM,
    entrySplashTriggered: false
  });
  state.submarineOwned = true;
  state.storedSubmarines = getStoredSubmarineStates().slice(1);
  state.storedSubmarine = state.storedSubmarines[0] || null;
  state.machinery = [...getMachineryList(), submarine];
  runtime.equipmentEditTrayTab = "tank";
  pushEvent(`Automated Care Submarine deployed in ${getTankLabel(targetTank)}.`, now, targetTank, {
    type: "equipment",
    detail: "Automated care machinery"
  });
  saveState();
  renderUi(now);
  return true;
}

function moveSubmarineToTank(targetTank = getCurrentTank(), now = Date.now()) {
  const submarine = getSubmarine();
  if (!submarine || !targetTank) return false;
  runtime.pendingMachineryTravel.delete(submarine.id);
  submarine.tankId = targetTank.id;
  submarine.xNorm = 0.5;
  submarine.yNorm = 0.46;
  submarine.targetXNorm = 0.68;
  submarine.targetYNorm = 0.44;
  submarine.targetAt = now + 1800;
  submarine.idleUntil = now + 450;
  submarine.nextScanAt = now + 900;
  submarine.mission = null;
  submarine.manualVelocityXPxPerSecond = 0;
  submarine.manualVelocityYPxPerSecond = 0;
  submarine.tankLayer = SUBMARINE_DEFAULT_TANK_LAYER;
  pushEvent(`Automated Care Submarine moved to ${getTankLabel(targetTank)}.`, now, targetTank, {
    type: "equipment",
    detail: "Automated care machinery"
  });
  saveState();
  renderUi(now);
  return true;
}

function recallSubmarine(now = Date.now()) {
  const submarine = getSubmarine();
  if (!submarine) return false;
  const tank = getSubmarineTank(submarine);
  runtime.pendingMachineryTravel.delete(submarine.id);
  clearSubmarineManualDriveKeys();
  if (runtime.selectedMachineryId === submarine.id) closeSubmarineManager();
  closeEditEquipmentTrayContextMenu({ render: false });
  state.storedSubmarines = [...getStoredSubmarineStates(), createStoredSubmarineState(submarine, now)];
  state.storedSubmarine = state.storedSubmarines[0] || null;
  state.machinery = getMachineryList().filter((item) => item?.id !== submarine.id);
  state.submarineOwned = true;
  runtime.equipmentEditTrayTab = "storage";
  pushEvent(`Automated Care Submarine returned to equipment storage${tank ? ` from ${getTankLabel(tank)}` : ""}.`, now, tank || null, {
    type: "equipment",
    detail: "Automated care machinery"
  });
  saveState();
  renderUi(now);
  return true;
}

function buyBoat(options = {}) {
  const variant = getMachineryAppearanceVariants(MACHINERY_TYPE_BOAT)
    .find((entry) => entry.key === options.appearanceVariantKey);
  if (options.appearanceVariantKey && !variant) {
    showToast("That boat appearance is no longer available.", { tone: "error" });
    return false;
  }
  return performCoinTransaction({
    amount: BOAT_COST,
    insufficientMessage: `You need ${BOAT_COST} ${pluralize("coin", BOAT_COST)} for the Chum Skiff.`,
    apply: () => {
      state.boatOwned = true;
      const stored = sanitizeStoredBoatState({ appearanceVariantKey: variant?.key, inventory: null }, Date.now());
      state.storedBoats = [...getStoredBoatStates(), stored];
      state.storedBoat = state.storedBoats[0] || null;
      runtime.equipmentEditTrayTab = "storage";
    },
    event: {
      type: "equipment",
      tone: "positive",
      text: "Purchased the Chum Skiff. It is ready to deploy from Edit > Equipment."
    },
    toast: "Chum Skiff purchased. Deploy it from Edit > Equipment."
  });
}

function deployBoat(targetTank = getCurrentTank(), now = Date.now()) {
  if (!isBoatOwned() || !targetTank) return false;
  const storedBoat = getStoredBoatState();
  const existing = getBoat();
  if (!storedBoat && existing) return moveBoatToTank(targetTank, now);
  const dropXNorm = randomBetween(0.26, 0.74);
  const boat = createBoatMachinery(targetTank.id, now, {
    ...(storedBoat || {}),
    xNorm: dropXNorm,
    targetXNorm: dropXNorm,
    manualVelocityXPxPerSecond: 0,
    entryStartedAt: now,
    entryDurationMs: BOAT_ENTRY_DURATION_MS,
    entryFromYNorm: BOAT_ENTRY_FROM_Y_NORM,
    entrySplashTriggered: false
  });
  state.boatOwned = true;
  state.storedBoats = getStoredBoatStates().slice(1);
  state.storedBoat = state.storedBoats[0] || null;
  state.machinery = [...getMachineryList(), boat];
  runtime.equipmentEditTrayTab = "tank";
  pushEvent(`Chum Skiff deployed in ${getTankLabel(targetTank)}.`, now, targetTank, {
    type: "equipment",
    detail: "Surface chum machinery"
  });
  saveState();
  renderUi(now);
  return true;
}

function moveBoatToTank(targetTank = getCurrentTank(), now = Date.now()) {
  const boat = getBoat();
  if (!boat || !targetTank) return false;
  runtime.pendingMachineryTravel.delete(boat.id);
  boat.tankId = targetTank.id;
  boat.xNorm = 0.5;
  boat.yNorm = 0.16;
  boat.targetXNorm = 0.72;
  boat.targetYNorm = 0.16;
  boat.targetAt = now + 1200;
  boat.idleUntil = now + 450;
  boat.manualVelocityXPxPerSecond = 0;
  boat.motionVelocityXPxPerSecond = 0;
  boat.tankLayer = BOAT_SURFACE_LAYER;
  pushEvent(`Chum Skiff moved to ${getTankLabel(targetTank)}.`, now, targetTank, {
    type: "equipment",
    detail: "Surface chum machinery"
  });
  saveState();
  renderUi(now);
  return true;
}

function recallBoat(now = Date.now()) {
  const boat = getBoat();
  if (!boat) return false;
  const tank = getBoatTank(boat);
  runtime.pendingMachineryTravel.delete(boat.id);
  clearBoatManualDriveKeys();
  if (runtime.selectedMachineryId === boat.id) closeSubmarineManager();
  closeEditEquipmentTrayContextMenu({ render: false });
  state.storedBoats = [...getStoredBoatStates(), createStoredBoatState(boat, now)];
  state.storedBoat = state.storedBoats[0] || null;
  state.machinery = getMachineryList().filter((item) => item?.id !== boat.id);
  state.boatOwned = true;
  runtime.equipmentEditTrayTab = "storage";
  pushEvent(`Chum Skiff returned to equipment storage${tank ? ` from ${getTankLabel(tank)}` : ""}.`, now, tank || null, {
    type: "equipment",
    detail: "Surface chum machinery"
  });
  saveState();
  renderUi(now);
  return true;
}

function transferFoodIntoSubmarine(submarine = getSubmarine(), requestedAmount = SUBMARINE_RESOURCE_CAPACITY) {
  if (!submarine) return 0;
  submarine.inventory = sanitizeSubmarineInventory(submarine.inventory);
  let remainingCapacity = Math.min(
    SUBMARINE_RESOURCE_CAPACITY - submarine.inventory.food,
    Math.max(1, Math.floor(Number(requestedAmount) || 1))
  );
  if (remainingCapacity <= 0) return 0;
  let transferred = 0;
  const preferredKeys = ["basic", "chum", "frisky"];
  for (const foodKey of preferredKeys) {
    if (remainingCapacity <= 0) break;
    const available = Math.max(0, Math.floor(Number(state.foodInventory?.[foodKey]) || 0));
    if (available <= 0) continue;
    const amount = Math.min(available, remainingCapacity);
    state.foodInventory[foodKey] = available - amount;
    submarine.inventory.food += amount;
    transferred += amount;
    remainingCapacity -= amount;
  }
  if (transferred > 0) {
    pushEvent(`Loaded ${transferred} food ${pluralize("ration", transferred)} into the Automated Care Submarine.`, Date.now());
    saveState();
    renderSubmarineManager();
    renderFoodTray();
    renderFoodShop();
  }
  return transferred;
}

function getBoatPlayerChumCount() {
  return Math.max(0, Math.floor(Number(state?.foodInventory?.chum) || 0));
}

function transferChumIntoBoat(boat = getBoat(), requestedAmount = BOAT_RESOURCE_CAPACITY) {
  if (!boat) return 0;
  boat.inventory = sanitizeBoatInventory(boat.inventory);
  const available = getBoatPlayerChumCount();
  const remainingCapacity = Math.min(
    BOAT_RESOURCE_CAPACITY - boat.inventory.chum,
    Math.max(1, Math.floor(Number(requestedAmount) || 1))
  );
  const transferred = Math.min(available, remainingCapacity);
  if (transferred <= 0) return 0;
  state.foodInventory.chum = available - transferred;
  boat.inventory.chum += transferred;
  pushEvent(`Loaded ${transferred} chum ${pluralize("ration", transferred)} into the Chum Skiff.`, Date.now());
  saveState();
  renderSubmarineManager();
  renderFoodTray();
  renderFoodShop();
  return transferred;
}

function transferMedicineIntoSubmarine(resourceType, submarine = getSubmarine(), requestedAmount = SUBMARINE_RESOURCE_CAPACITY) {
  if (!submarine) return 0;
  submarine.inventory = sanitizeSubmarineInventory(submarine.inventory);
  const normalizedType = resourceType === "calming" ? "calming" : "health";
  const medicineKey = normalizedType === "calming" ? "betaBlocker" : "firstAid";
  const available = Math.max(0, Math.floor(Number(state.medicineInventory?.[medicineKey]) || 0));
  const remainingCapacity = Math.min(
    SUBMARINE_RESOURCE_CAPACITY - submarine.inventory[normalizedType],
    Math.max(1, Math.floor(Number(requestedAmount) || 1))
  );
  const transferred = Math.min(available, remainingCapacity);
  if (transferred <= 0) return 0;
  state.medicineInventory[medicineKey] = available - transferred;
  submarine.inventory[normalizedType] += transferred;
  pushEvent(`Loaded ${transferred} ${normalizedType === "calming" ? "calming" : "health"} ${pluralize("drop", transferred)} into the Automated Care Submarine.`, Date.now());
  saveState();
  renderSubmarineManager();
  renderMedicineTray();
  renderPharmacyShop();
  return transferred;
}


function isSubmarineAutopilotEnabled(submarine = getSubmarine()) {
  return submarine?.autopilot !== false;
}

function getSubmarineEntryProgress(submarine, now = Date.now()) {
  if (
    !submarine
    || !Number.isFinite(Number(submarine.entryStartedAt))
    || Number(submarine.entryDurationMs) <= 0
  ) {
    return null;
  }
  return clamp(
    (now - Number(submarine.entryStartedAt)) / Math.max(1, Number(submarine.entryDurationMs)),
    0,
    1
  );
}

function isSubmarineManualDriveActive(submarine = getSubmarine()) {
  return Boolean(
    submarine?.id
    && getSubmarineEntryProgress(submarine) === null
    && !isSubmarineAutopilotEnabled(submarine)
    && submarine.tankId === getCurrentTank()?.id
    && !runtime.boroughOverviewOpen
    && !runtime.editTankMode
    && !runtime.fishEditMode
    && !runtime.equipmentEditMode
    && !runtime.tankEditMode
    && !runtime.storeOverlayOpen
    && !runtime.settingsOverlayOpen
    && !runtime.utilityOverlayOpen
    && !runtime.equipmentOverlayOpen
    && !runtime.foodTrayOpen && !runtime.medicineTrayOpen
    && !runtime.cleaningMode && !runtime.scoopMode
  );
}

function suspendSubmarineManualDrive() {
  clearSubmarineManualDriveKeys();
  const sub = getSubmarine();
  if (!sub) return;
  sub.manualVelocityXPxPerSecond = sub.manualVelocityYPxPerSecond = 0;
  sub.motionVelocityXPxPerSecond = sub.motionVelocityYPxPerSecond = 0;
}

function beginSubmarineManualDrive(submarine = getSubmarine()) {
  if (!submarine) return false;
  const tank = getSubmarineTank(submarine);
  if (!tank) return false;
  clearPrimaryToolModes();
  setActiveTank(tank.id);
  setSubmarineAutopilot(submarine, false, { render: false });
  openSubmarineManager(submarine.id);
  renderUi(Date.now());
  document.activeElement?.blur?.();
  return true;
}

function clearSubmarineManualDriveKeys() {
  if (!(runtime.submarineManualDriveKeys instanceof Set)) {
    runtime.submarineManualDriveKeys = new Set();
    return;
  }
  runtime.submarineManualDriveKeys.clear();
}

function setSubmarineManualDriveKey(key, isDown) {
  const normalized = String(key || "").toLowerCase();
  const submarine = getSubmarine();
  if (!["w", "a", "s", "d"].includes(normalized) || !submarine) return false;
  if (!(runtime.submarineManualDriveKeys instanceof Set)) {
    runtime.submarineManualDriveKeys = new Set();
  }
  if (!isDown) {
    runtime.submarineManualDriveKeys.delete(normalized);
    return true;
  }
  if (!isSubmarineManualDriveActive(submarine)) return false;
  runtime.submarineManualDriveKeys.add(normalized);
  return true;
}

function setSubmarineAutopilot(submarine = getSubmarine(), enabled = true, options = {}) {
  if (!submarine || submarine.type !== MACHINERY_TYPE_SUBMARINE) return false;
  const nextEnabled = enabled !== false;
  if (isSubmarineAutopilotEnabled(submarine) === nextEnabled) {
    return false;
  }

  const now = Date.now();
  submarine.autopilot = nextEnabled;
  clearSubmarineManualDriveKeys();

  if (!nextEnabled) {
    const boat = getBoat();
    if (boat && !isBoatAutopilotEnabled(boat)) {
      setBoatAutopilot(boat, true, { render: false });
    }
  }

  if (nextEnabled) {
    submarine.targetXNorm = submarine.xNorm;
    submarine.targetYNorm = submarine.yNorm;
    submarine.targetAt = now + 500;
    submarine.idleUntil = now + 250;
    submarine.nextScanAt = Math.min(Number(submarine.nextScanAt) || now, now + 350);
    submarine.manualVelocityXPxPerSecond = 0;
    submarine.manualVelocityYPxPerSecond = 0;
    submarine.motionVelocityXPxPerSecond = 0;
    submarine.motionVelocityYPxPerSecond = 0;
  } else {
    runtime.pendingMachineryTravel.delete(submarine.id);
    submarine.xNorm = clamp(Number(submarine.xNorm) || 0.5, 0.08, 0.92);
    submarine.yNorm = clamp(Number(submarine.yNorm) || 0.48, 0.16, 0.78);
    submarine.targetXNorm = submarine.xNorm;
    submarine.targetYNorm = submarine.yNorm;
    submarine.targetAt = 0;
    submarine.idleUntil = 0;
    submarine.manualVelocityXPxPerSecond = 0;
    submarine.manualVelocityYPxPerSecond = 0;
    submarine.motionVelocityXPxPerSecond = 0;
    submarine.motionVelocityYPxPerSecond = 0;
  }

  requestDeferredStateSave();
  if (options.render !== false && runtime.selectedMachineryId === submarine.id) renderSubmarineManager();
  return true;
}

function getSubmarineManualInputVector() {
  const keys = runtime.submarineManualDriveKeys instanceof Set
    ? runtime.submarineManualDriveKeys
    : new Set();
  let x = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
  let y = (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0);
  const magnitude = Math.hypot(x, y);
  if (magnitude > 1) {
    x /= magnitude;
    y /= magnitude;
  }
  return { x, y };
}

function stepSubmarineDepthLayer(submarine = getSubmarine(), delta = 0) {
  if (!isSubmarineManualDriveActive(submarine)) return false;
  const currentLayer = clampTankLayer(submarine.tankLayer ?? SUBMARINE_DEFAULT_TANK_LAYER);
  const nextLayer = clampTankLayer(currentLayer + Math.sign(Number(delta) || 0));
  if (nextLayer === currentLayer) return true;
  submarine.tankLayer = nextLayer;
  requestDeferredStateSave();
  if (runtime.selectedMachineryId === submarine.id) renderSubmarineManager();
  return true;
}

function createSubmarineDroppedFoodPellet(submarine, foodKey = "basic", now = Date.now()) {
  if (!submarine) return null;
  const metrics = getSubmarineDrawMetrics(submarine, now);
  const sourceXNorm = clamp(
    Number.isFinite(Number(metrics?.x)) ? Number(metrics.x) / TANK_WIDTH : Number(submarine.xNorm),
    0.08,
    0.92
  );
  const sourceYNorm = clamp(
    Number.isFinite(Number(metrics?.y)) && Number.isFinite(Number(metrics?.height))
      ? (Number(metrics.y) + Number(metrics.height) * 0.3) / TANK_HEIGHT
      : Number(submarine.yNorm),
    0.09,
    0.84
  );
  const targetYNorm = clamp(sourceYNorm + 0.075, sourceYNorm + 0.025, 0.9);
  const pellet = createDroppedFoodPellet(foodKey, sourceXNorm, targetYNorm, now, {
    spreadNorm: 0,
    dropStartXNorm: sourceXNorm,
    dropStartYNorm: sourceYNorm,
    dropDurationMs: 420
  });
  if (pellet) {
    pellet.tankLayer = clampTankLayer(submarine.tankLayer ?? SUBMARINE_DEFAULT_TANK_LAYER);
  }
  return pellet;
}

function deployManualSubmarineFood(submarine = getSubmarine(), now = Date.now()) {
  if (!isSubmarineManualDriveActive(submarine)) return false;
  submarine.inventory = sanitizeSubmarineInventory(submarine.inventory);
  if (submarine.inventory.food <= 0) return true;
  if (now - (Number(runtime.submarineManualLastFoodDeployAt) || 0) < SUBMARINE_MANUAL_FOOD_COOLDOWN_MS) return true;
  const tank = getSubmarineTank(submarine);
  if (!tank) return false;
  let pellet = null;
  withActiveTank(tank.id, () => {
    pellet = createSubmarineDroppedFoodPellet(submarine, "basic", now);
    if (pellet) {
      state.floatingPellets.push(pellet);
    }
  });
  if (!pellet) return false;
  runtime.submarineManualLastFoodDeployAt = now;
  submarine.inventory.food = normalizeSubmarineResourceCount(submarine.inventory.food - 1);
  requestDeferredStateSave();
  if (runtime.selectedMachineryId === submarine.id) renderSubmarineManager();
  return true;
}

function getMachineryFacingDirection(machinery, now = Date.now()) {
  if (!machinery) return 1;
  if (machinery.turnStartedAt && Number(machinery.turnDurationMs) > 0) {
    const progress = clamp((now - Number(machinery.turnStartedAt)) / Number(machinery.turnDurationMs), 0, 1);
    const fromDirection = Number(machinery.turnFromDirection) < 0 ? -1 : 1;
    const toDirection = Number(machinery.turnToDirection) < 0 ? -1 : 1;
    return progress < 0.5 ? fromDirection : toDirection;
  }
  return Number(machinery.displayDirection ?? machinery.direction) < 0 ? -1 : 1;
}

function clearMachineryTurnState(machinery, direction = machinery?.direction) {
  if (!machinery) return;
  const settledDirection = Number(direction) < 0 ? -1 : 1;
  machinery.direction = settledDirection;
  machinery.displayDirection = settledDirection;
  machinery.turnStartedAt = null;
  machinery.turnDurationMs = 0;
  machinery.turnFromDirection = settledDirection;
  machinery.turnToDirection = settledDirection;
  machinery.turnSpinDirection = settledDirection;
}

function setMachineryDirection(machinery, desiredDirection, now = Date.now(), durationMs = 260) {
  if (!machinery) return false;
  const nextDirection = Number(desiredDirection) < 0 ? -1 : 1;
  const currentDisplayDirection = getMachineryFacingDirection(machinery, now);
  const activeTurn = Boolean(machinery.turnStartedAt && Number(machinery.turnDurationMs) > 0);
  machinery.direction = nextDirection;

  if (activeTurn) {
    const pendingDirection = Number(machinery.turnToDirection) < 0 ? -1 : 1;
    if (nextDirection === pendingDirection) return false;

    const progress = clamp((now - Number(machinery.turnStartedAt)) / Number(machinery.turnDurationMs), 0, 1);
    const fromDirection = Number(machinery.turnFromDirection) < 0 ? -1 : 1;
    if (nextDirection === fromDirection && progress < 0.5) {
      // The player/autopilot changed its mind before the visual flip. Ease the
      // current squash back out without ever snapping to the other side.
      const reverseProgress = 1 - progress;
      machinery.displayDirection = fromDirection;
      machinery.turnFromDirection = fromDirection;
      machinery.turnToDirection = fromDirection;
      machinery.turnStartedAt = now - reverseProgress * Math.max(1, Number(durationMs) || 1);
      machinery.turnDurationMs = Math.max(1, Number(durationMs) || 1);
      machinery.turnSpinDirection = -Number(machinery.turnSpinDirection || fromDirection);
      return true;
    }
  }

  if (!activeTurn && nextDirection === currentDisplayDirection) {
    clearMachineryTurnState(machinery, nextDirection);
    return false;
  }

  machinery.displayDirection = currentDisplayDirection;
  machinery.turnStartedAt = now;
  machinery.turnDurationMs = Math.max(1, Number(durationMs) || 1);
  machinery.turnFromDirection = currentDisplayDirection;
  machinery.turnToDirection = nextDirection;
  // Bank consistently toward the new heading instead of choosing a random
  // roll direction. It reads more like a vehicle carving through water.
  machinery.turnSpinDirection = nextDirection;
  return true;
}

function getMachineryTurnRenderState(machinery, now = Date.now(), leanRadians = 0) {
  if (!machinery) {
    return { direction: 1, scaleX: 1, scaleY: 1, lean: 0, swayX: 0 };
  }
  if (!machinery.turnStartedAt || Number(machinery.turnDurationMs) <= 0) {
    const direction = Number(machinery.direction) < 0 ? -1 : 1;
    machinery.displayDirection = direction;
    return { direction, scaleX: 1, scaleY: 1, lean: 0, swayX: 0 };
  }

  const progress = clamp((now - Number(machinery.turnStartedAt)) / Number(machinery.turnDurationMs), 0, 1);
  if (progress >= 1) {
    const direction = Number(machinery.direction) < 0 ? -1 : 1;
    clearMachineryTurnState(machinery, direction);
    return { direction, scaleX: 1, scaleY: 1, lean: 0, swayX: 0 };
  }

  const amount = Math.sin(progress * Math.PI);
  const fromDirection = Number(machinery.turnFromDirection) < 0 ? -1 : 1;
  const toDirection = Number(machinery.turnToDirection) < 0 ? -1 : 1;
  const direction = progress < 0.5 ? fromDirection : toDirection;
  const spinDirection = Number(machinery.turnSpinDirection) < 0 ? -1 : 1;
  machinery.displayDirection = direction;
  return {
    direction,
    scaleX: 1 - amount * (1 - FISH_TURN_MIN_SCALE_X),
    scaleY: 1 + amount * (FISH_TURN_MAX_SCALE_Y - 1),
    lean: spinDirection * amount * Math.max(0, Number(leanRadians) || 0),
    swayX: spinDirection * amount * 0.8
  };
}

function updateSubmarineManualDrive(submarine, deltaSeconds = 0.016) {
  if (!isSubmarineManualDriveActive(submarine)) return false;

  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.08);
  const input = getSubmarineManualInputVector();
  let velocityX = Number(submarine.manualVelocityXPxPerSecond) || 0;
  let velocityY = Number(submarine.manualVelocityYPxPerSecond) || 0;

  if (Math.abs(input.x) > 0.001) {
    velocityX += input.x * SUBMARINE_MANUAL_ACCELERATION_PX_PER_SECOND2 * dt;
  } else {
    velocityX *= Math.exp(-SUBMARINE_MANUAL_DRAG_PER_SECOND * dt);
  }
  if (Math.abs(input.y) > 0.001) {
    velocityY += input.y * SUBMARINE_MANUAL_VERTICAL_ACCELERATION_PX_PER_SECOND2 * dt;
  } else {
    velocityY *= Math.exp(-SUBMARINE_MANUAL_DRAG_PER_SECOND * dt);
  }

  const maxX = SUBMARINE_MANUAL_SPEED_PX_PER_SECOND;
  const maxY = SUBMARINE_MANUAL_SPEED_PX_PER_SECOND * SUBMARINE_MANUAL_VERTICAL_SPEED_SCALE;
  velocityX = clamp(velocityX, -maxX, maxX);
  velocityY = clamp(velocityY, -maxY, maxY);
  if (Math.abs(velocityX) < 0.35) velocityX = 0;
  if (Math.abs(velocityY) < 0.35) velocityY = 0;

  const previousX = Number(submarine.xNorm) || 0.5;
  const previousY = Number(submarine.yNorm) || 0.48;
  const nextX = clamp(previousX + velocityX * dt / TANK_WIDTH, 0.08, 0.92);
  const nextY = clamp(previousY + velocityY * dt / TANK_HEIGHT, 0.16, 0.78);
  if (Math.abs(nextX - previousX) < 0.000001 && Math.abs(velocityX) > 0) velocityX = 0;
  if (Math.abs(nextY - previousY) < 0.000001 && Math.abs(velocityY) > 0) velocityY = 0;

  submarine.xNorm = nextX;
  submarine.yNorm = nextY;
  submarine.manualVelocityXPxPerSecond = velocityX;
  submarine.manualVelocityYPxPerSecond = velocityY;
  submarine.motionVelocityXPxPerSecond = dt > 0 ? (nextX - previousX) * TANK_WIDTH / dt : 0;
  submarine.motionVelocityYPxPerSecond = dt > 0 ? (nextY - previousY) * TANK_HEIGHT / dt : 0;
  submarine.targetXNorm = submarine.xNorm;
  submarine.targetYNorm = submarine.yNorm;
  submarine.idleUntil = 0;
  if (Math.abs(input.x) > 0.05) setMachineryDirection(submarine, input.x < 0 ? -1 : 1, Date.now(), SUBMARINE_TURN_DURATION_MS);
  else if (Math.abs(velocityX) > 8) setMachineryDirection(submarine, velocityX < 0 ? -1 : 1, Date.now(), SUBMARINE_TURN_DURATION_MS);
  return true;
}

function getBoatEntryProgress(boat, now = Date.now()) {
  if (!boat || !Number.isFinite(Number(boat.entryStartedAt)) || Number(boat.entryDurationMs) <= 0) {
    return null;
  }
  return clamp((now - Number(boat.entryStartedAt)) / Math.max(1, Number(boat.entryDurationMs)), 0, 1);
}

function isBoatAutopilotEnabled(boat = getBoat()) {
  return boat?.autopilot !== false;
}

function isMachineryControlOverlayOpen() {
  return Boolean(
    runtime.boroughOverviewOpen
    || runtime.editTankMode
    || runtime.fishEditMode
    || runtime.equipmentEditMode
    || runtime.tankEditMode
    || runtime.storeOverlayOpen
    || runtime.settingsOverlayOpen
    || runtime.utilityOverlayOpen
    || runtime.equipmentOverlayOpen
    || runtime.foodTrayOpen
    || runtime.medicineTrayOpen
    || runtime.cleaningMode
    || runtime.scoopMode
  );
}

function isBoatManualDriveActive(boat = getBoat()) {
  return Boolean(
    boat?.id
    && getBoatEntryProgress(boat) === null
    && !isBoatAutopilotEnabled(boat)
    && boat.tankId === getCurrentTank()?.id
    && !isMachineryControlOverlayOpen()
  );
}

function clearBoatManualDriveKeys() {
  if (!(runtime.boatManualDriveKeys instanceof Set)) {
    runtime.boatManualDriveKeys = new Set();
    return;
  }
  runtime.boatManualDriveKeys.clear();
}

function suspendBoatManualDrive() {
  clearBoatManualDriveKeys();
  const boat = getBoat();
  if (!boat) return;
  boat.manualVelocityXPxPerSecond = 0;
  boat.motionVelocityXPxPerSecond = 0;
}

function beginBoatManualDrive(boat = getBoat()) {
  if (!boat) return false;
  const tank = getBoatTank(boat);
  if (!tank) return false;
  clearPrimaryToolModes();
  setActiveTank(tank.id);
  setBoatAutopilot(boat, false, { render: false });
  openSubmarineManager(boat.id);
  renderUi(Date.now());
  document.activeElement?.blur?.();
  return true;
}

function setBoatManualDriveKey(key, isDown) {
  const normalized = String(key || "").toLowerCase();
  const boat = getBoat();
  if (!["a", "d"].includes(normalized) || !boat) return false;
  if (!(runtime.boatManualDriveKeys instanceof Set)) {
    runtime.boatManualDriveKeys = new Set();
  }
  if (!isDown) {
    runtime.boatManualDriveKeys.delete(normalized);
    return true;
  }
  if (!isBoatManualDriveActive(boat)) return false;
  runtime.boatManualDriveKeys.add(normalized);
  return true;
}

function setBoatAutopilot(boat = getBoat(), enabled = true, options = {}) {
  if (!boat || boat.type !== MACHINERY_TYPE_BOAT) return false;
  const nextEnabled = enabled !== false;
  if (isBoatAutopilotEnabled(boat) === nextEnabled) return false;

  const now = Date.now();
  boat.autopilot = nextEnabled;
  clearBoatManualDriveKeys();
  if (!nextEnabled) {
    const submarine = getSubmarine();
    if (submarine && !isSubmarineAutopilotEnabled(submarine)) {
      setSubmarineAutopilot(submarine, true, { render: false });
    }
    runtime.pendingMachineryTravel.delete(boat.id);
    boat.xNorm = clamp(Number(boat.xNorm) || 0.5, 0.08, 0.92);
    boat.targetXNorm = boat.xNorm;
    boat.targetAt = 0;
    boat.idleUntil = 0;
    boat.manualVelocityXPxPerSecond = 0;
    boat.motionVelocityXPxPerSecond = 0;
  } else {
    boat.targetXNorm = boat.xNorm < 0.5 ? 0.82 : 0.18;
    boat.targetAt = now + 700;
    boat.idleUntil = now + 150;
    boat.manualVelocityXPxPerSecond = 0;
    boat.motionVelocityXPxPerSecond = 0;
  }

  requestDeferredStateSave();
  if (options.render !== false && runtime.selectedMachineryId === boat.id) renderSubmarineManager();
  return true;
}

function getBoatManualInputVector() {
  const keys = runtime.boatManualDriveKeys instanceof Set ? runtime.boatManualDriveKeys : new Set();
  return { x: (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0), y: 0 };
}

function createBoatDroppedFoodPellet(boat, now = Date.now()) {
  if (!boat) return null;
  const metrics = getBoatDrawMetrics(boat, now);
  const sourceXNorm = clamp(Number.isFinite(Number(metrics?.x)) ? Number(metrics.x) / TANK_WIDTH : Number(boat.xNorm), 0.08, 0.92);
  const sourceYNorm = clamp(
    Number.isFinite(Number(metrics?.y)) && Number.isFinite(Number(metrics?.height))
      ? (Number(metrics.y) + Number(metrics.height) * 0.34) / TANK_HEIGHT
      : Number(boat.yNorm),
    0.09,
    0.84
  );
  return createDroppedFoodPellet("chum", sourceXNorm, clamp(sourceYNorm + 0.07, sourceYNorm + 0.025, 0.9), now, {
    spreadNorm: 0,
    dropStartXNorm: sourceXNorm,
    dropStartYNorm: sourceYNorm,
    dropDurationMs: 420
  });
}

function deployManualBoatChum(boat = getBoat(), now = Date.now()) {
  if (!isBoatManualDriveActive(boat)) return false;
  boat.inventory = sanitizeBoatInventory(boat.inventory);
  if (boat.inventory.chum <= 0) return true;
  if (now - (Number(runtime.boatManualLastFoodDeployAt) || 0) < BOAT_MANUAL_FOOD_COOLDOWN_MS) return true;
  const tank = getBoatTank(boat);
  if (!tank) return false;
  let pellet = null;
  withActiveTank(tank.id, () => {
    pellet = createBoatDroppedFoodPellet(boat, now);
    if (pellet) state.floatingPellets.push(pellet);
  });
  if (!pellet) return false;
  runtime.boatManualLastFoodDeployAt = now;
  boat.inventory.chum = normalizeBoatResourceCount(boat.inventory.chum - 1);
  requestDeferredStateSave();
  if (runtime.selectedMachineryId === boat.id) renderSubmarineManager();
  return true;
}

function updateBoatManualDrive(boat, deltaSeconds = 0.016) {
  if (!isBoatManualDriveActive(boat)) return false;
  const dt = clamp(Number(deltaSeconds) || 0, 0, 0.08);
  const input = getBoatManualInputVector();
  let velocityX = Number(boat.manualVelocityXPxPerSecond) || 0;
  if (Math.abs(input.x) > 0.001) velocityX += input.x * BOAT_MANUAL_ACCELERATION_PX_PER_SECOND2 * dt;
  else velocityX *= Math.exp(-BOAT_MANUAL_DRAG_PER_SECOND * dt);
  velocityX = clamp(velocityX, -BOAT_MANUAL_SPEED_PX_PER_SECOND, BOAT_MANUAL_SPEED_PX_PER_SECOND);
  if (Math.abs(velocityX) < 0.35) velocityX = 0;
  const previousX = Number(boat.xNorm) || 0.5;
  const nextX = clamp(previousX + velocityX * dt / TANK_WIDTH, 0.08, 0.92);
  if (Math.abs(nextX - previousX) < 0.000001 && Math.abs(velocityX) > 0) velocityX = 0;
  boat.xNorm = nextX;
  boat.manualVelocityXPxPerSecond = velocityX;
  boat.motionVelocityXPxPerSecond = dt > 0 ? (nextX - previousX) * TANK_WIDTH / dt : 0;
  boat.targetXNorm = boat.xNorm;
  boat.targetYNorm = 0.16;
  boat.idleUntil = 0;
  if (Math.abs(input.x) > 0.05) setMachineryDirection(boat, input.x < 0 ? -1 : 1, Date.now(), BOAT_TURN_DURATION_MS);
  else if (Math.abs(velocityX) > 8) setMachineryDirection(boat, velocityX < 0 ? -1 : 1, Date.now(), BOAT_TURN_DURATION_MS);
  return true;
}

function handleManualMachineryActionKey(machinery, event) {
  const key = String(event.key || "").toLowerCase();
  const useNearby = event.code === "Space" || key === " " || key === "spacebar";
  if (!useNearby && key !== "f") return false;
  event.preventDefault();
  if (event.repeat) return true;
  if (useNearby) useNearbyMachineryTravel(machinery);
  else if (machinery.type === MACHINERY_TYPE_BOAT) deployManualBoatChum(machinery);
  else deployManualSubmarineFood(machinery);
  return true;
}

function useNearbyMachineryTravel(machinery = getActiveManualMachinery()) {
  const isBoat = machinery?.type === MACHINERY_TYPE_BOAT;
  if (!(isBoat ? isBoatManualDriveActive(machinery) : isSubmarineManualDriveActive(machinery))) return false;
  if (runtime.pendingMachineryTravel.has(machinery.id)) return false;
  const source = getTankById(machinery.tankId);
  if (!source) return false;
  const candidates = [];
  const tubes = getAllTransitTubes();
  for (const entry of tubes) {
    if (entry.tank.id !== source.id) continue;
    const target = tubes.find(other => other.item.id === entry.item.transitTubeLinkedId
      && other.item.transitTubeLinkedId === entry.item.id && other.tank.id !== source.id);
    if (!target) continue;
    const points = getTransitTubeTravelPoints(entry.item);
    const distance = getSubmarineDistanceToPointPx(machinery, points.opening.xNorm, points.opening.yNorm);
    if (distance <= Math.max(70, points.openingRadiusPx + 40)) {
      candidates.push({ tank: target.tank, distance, exit: getTransitTubeTravelPoints(target.item).exit });
    }
  }
  // Use the manual movement bounds so each edge is reachable by the pilot.
  for (const tank of getAdjacentAquariumSections(source)) {
    const direction = getBoroughTravelEdgeDirection(source, tank);
    if (isBoat && direction !== "left" && direction !== "right") continue;
    const distance = direction === "left" ? Math.abs(machinery.xNorm - 0.08) * TANK_WIDTH
      : direction === "right" ? Math.abs(machinery.xNorm - 0.92) * TANK_WIDTH
      : direction === "up" ? Math.abs(machinery.yNorm - 0.16) * TANK_HEIGHT
      : Math.abs(machinery.yNorm - 0.78) * TANK_HEIGHT;
    if (distance > 55) continue;
    candidates.push({ tank, distance, exit: {
      xNorm: direction === "left" ? 0.88 : direction === "right" ? 0.12 : machinery.xNorm,
      yNorm: direction === "up" ? 0.74 : direction === "down" ? 0.2 : machinery.yNorm
    } });
  }
  candidates.sort((a, b) => a.distance - b.distance);
  const destination = candidates[0];
  if (!destination) return false;
  clearBoatManualDriveKeys();
  clearSubmarineManualDriveKeys();
  machinery.tankId = destination.tank.id;
  machinery.xNorm = clamp(destination.exit.xNorm, 0.08, 0.92);
  machinery.yNorm = isBoat ? 0.16 : clamp(destination.exit.yNorm, 0.16, 0.78);
  machinery.targetXNorm = machinery.xNorm;
  machinery.targetYNorm = machinery.yNorm;
  machinery.manualVelocityXPxPerSecond = machinery.manualVelocityYPxPerSecond = 0;
  machinery.motionVelocityXPxPerSecond = machinery.motionVelocityYPxPerSecond = 0;
  setActiveTank(destination.tank.id);
  openSubmarineManager(machinery.id);
  requestDeferredStateSave();
  return true;
}

function getActiveManualMachinery() {
  const submarine = getSubmarine();
  if (isSubmarineManualDriveActive(submarine)) return submarine;
  const boat = getBoat();
  if (isBoatManualDriveActive(boat)) return boat;
  return null;
}

function suspendMachineryManualDrive() {
  suspendSubmarineManualDrive();
  suspendBoatManualDrive();
}

function getSubmarineMissionLabel(submarine = getSubmarine()) {
  if (!submarine?.mission) {
    const tank = getSubmarineTank(submarine);
    return tank ? `Patrolling ${getTankLabel(tank)}` : "Idle";
  }
  const mission = submarine.mission;
  const targetTank = getTankById(mission.targetTankId);
  const targetFish = targetTank?.fish?.find((fish) => fish.id === mission.fishId) || null;
  const fishName = targetFish?.name || "fish";
  if (mission.kind === "health") return `Treating ${fishName} in ${getTankLabel(targetTank)}`;
  if (mission.kind === "calming") return `Calming ${fishName} in ${getTankLabel(targetTank)}`;
  return `Feeding ${fishName} in ${getTankLabel(targetTank)}`;
}

function getSubmarineControlStatus(submarine = getSubmarine()) {
  if (getSubmarineEntryProgress(submarine) !== null) return "Entering tank…";
  if (isSubmarineAutopilotEnabled(submarine)) return getSubmarineMissionLabel(submarine);
  return isSubmarineManualDriveActive(submarine)
    ? "WASD move · Q/E depth · F feed · Space use nearby"
    : "Drive paused · close editing or care tools";
}

function syncSubmarineControlStatus(submarine) {
  if (runtime.selectedMachineryId !== submarine?.id) return;
  const label = document.querySelector(".submarine-drive-status span");
  const text = getSubmarineControlStatus(submarine);
  if (label && label.textContent !== text) label.textContent = text;
}

function syncMachineryControlStatus(machinery) {
  if (runtime.selectedMachineryId !== machinery?.id) return;
  const label = document.querySelector(".submarine-drive-status span");
  const text = machinery.type === MACHINERY_TYPE_BOAT
    ? getBoatControlStatus(machinery)
    : getSubmarineControlStatus(machinery);
  if (label && label.textContent !== text) label.textContent = text;
}

function ensureSubmarineManagerElement() {
  let element = document.querySelector(".submarine-manager");
  if (element instanceof HTMLElement) {
    return element;
  }
  element = document.createElement("aside");
  element.className = "submarine-manager";
  element.hidden = true;
  element.setAttribute("aria-label", "Automated Care Submarine controls");
  element.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest("[data-close-submarine-manager]")) {
      closeSubmarineManager();
      return;
    }
    if (target.closest("[data-machinery-settings]")) {
      runtime.machinerySettingsOpen = !runtime.machinerySettingsOpen;
      renderSubmarineManager();
      return;
    }
    const colorSwatch = target.closest("[data-machinery-color]");
    if (colorSwatch instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      updateMachineryColorSetting(
        getMachineryById(runtime.selectedMachineryId),
        "color",
        colorSwatch.dataset.machineryColor || ""
      );
      return;
    }
    const colorizeInput = target.closest("[data-machinery-colorize]");
    if (colorizeInput instanceof HTMLInputElement) {
      updateMachineryColorSetting(
        getMachineryById(runtime.selectedMachineryId),
        "colorize",
        colorizeInput.checked
      );
      return;
    }
    if (target.closest("[data-drive-submarine]")) { beginSubmarineManualDrive(); return; }
    if (target.closest("[data-drive-boat]")) { beginBoatManualDrive(); return; }
    const command = target.closest("[data-submarine-command]")?.dataset.submarineCommand;
    if (command) {
      if (command === "food") deployManualSubmarineFood();
      else stepSubmarineDepthLayer(getSubmarine(), command === "near" ? -1 : 1);
      return;
    }
    const boatCommand = target.closest("[data-boat-command]")?.dataset.boatCommand;
    if (boatCommand) {
      if (boatCommand === "chum") deployManualBoatChum();
      return;
    }
    const autopilotInput = target.closest("[data-submarine-autopilot]");
    if (autopilotInput instanceof HTMLInputElement) {
      setSubmarineAutopilot(getMachineryById(runtime.selectedMachineryId), autopilotInput.checked);
      return;
    }
    const boatAutopilotInput = target.closest("[data-boat-autopilot]");
    if (boatAutopilotInput instanceof HTMLInputElement) {
      setBoatAutopilot(getMachineryById(runtime.selectedMachineryId), boatAutopilotInput.checked);
      return;
    }
    const foodButton = target.closest("[data-load-submarine-food]");
    if (foodButton) {
      transferFoodIntoSubmarine(
        getMachineryById(runtime.selectedMachineryId),
        Number(foodButton.dataset.loadSubmarineFood) || SUBMARINE_RESOURCE_CAPACITY
      );
      return;
    }
    const chumButton = target.closest("[data-load-boat-chum]");
    if (chumButton) {
      transferChumIntoBoat(
        getMachineryById(runtime.selectedMachineryId),
        Number(chumButton.dataset.loadBoatChum) || BOAT_RESOURCE_CAPACITY
      );
      return;
    }
    const medicineButton = target.closest("[data-load-submarine-medicine]");
    if (medicineButton) {
      transferMedicineIntoSubmarine(
        medicineButton.dataset.loadSubmarineMedicine,
        getMachineryById(runtime.selectedMachineryId),
        Number(medicineButton.dataset.loadAmount) || SUBMARINE_RESOURCE_CAPACITY
      );
    }
  });
  element.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-drive-key]");
    if (!button || (!isSubmarineManualDriveActive() && !isBoatManualDriveActive())) return;
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    const activeMachinery = getActiveManualMachinery();
    if (activeMachinery?.type === MACHINERY_TYPE_BOAT) setBoatManualDriveKey(button.dataset.driveKey, true);
    else setSubmarineManualDriveKey(button.dataset.driveKey, true);
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    element.addEventListener(type, (event) => {
      const key = event.target.closest("[data-drive-key]")?.dataset.driveKey;
      if (key) {
        setSubmarineManualDriveKey(key, false);
        setBoatManualDriveKey(key, false);
      }
    });
  }
  document.body.appendChild(element);
  return element;
}

function openSubmarineManager(machineryId) {
  const machinery = getMachineryById(machineryId);
  if (!machinery || ![MACHINERY_TYPE_SUBMARINE, MACHINERY_TYPE_BOAT].includes(machinery.type)) return false;
  closeFishActionMenu();
  if (runtime.selectedFishId || runtime.selectedFishStatusFishId) closeFishInspector();
  if (runtime.selectedMachineryId !== machinery.id) runtime.machinerySettingsOpen = false;
  runtime.selectedMachineryId = machinery.id;
  renderSubmarineManager();
  return true;
}

function closeSubmarineManager() {
  runtime.selectedMachineryId = null;
  runtime.machinerySettingsOpen = false;
  const element = document.querySelector(".submarine-manager");
  if (element instanceof HTMLElement) element.hidden = true;
}

function renderSubmarineManager() {
  const element = ensureSubmarineManagerElement();
  const machinery = getMachineryById(runtime.selectedMachineryId);
  if (!machinery || ![MACHINERY_TYPE_SUBMARINE, MACHINERY_TYPE_BOAT].includes(machinery.type)) {
    element.hidden = true;
    return;
  }
  if (machinery.type === MACHINERY_TYPE_BOAT) {
    renderBoatManager(element, machinery);
    return;
  }
  const submarine = machinery;
  submarine.inventory = sanitizeSubmarineInventory(submarine.inventory);
  const foodAvailable = getSubmarinePlayerFoodCount();
  const healthAvailable = Math.max(0, Math.floor(Number(state.medicineInventory?.firstAid) || 0));
  const calmingAvailable = Math.max(0, Math.floor(Number(state.medicineInventory?.betaBlocker) || 0));
  const autopilotEnabled = isSubmarineAutopilotEnabled(submarine);
  const foodIcon = resolveFoodAndMedAssetPath("basic-food.png");
  const healthIcon = resolveFoodAndMedAssetPath("first-aid-drops.png");
  const calmingIcon = resolveFoodAndMedAssetPath("calming-serum.png");

  element.innerHTML = `
    <div class="submarine-manager-header">
      <div class="submarine-manager-title">
        <img ${assetImageAttributes(getMachineryImagePath(MACHINERY_TYPE_SUBMARINE))} alt="" onerror="this.onerror=null;this.removeAttribute('src');this.setAttribute('data-sprite-src','assets/icons/tools.png')" />
        <strong>Care Submarine</strong>
      </div>
      <div class="submarine-manager-header-actions">
        <button class="small-button submarine-settings-button ${runtime.machinerySettingsOpen ? "is-active" : ""}" type="button" data-machinery-settings aria-expanded="${runtime.machinerySettingsOpen}">SETTINGS</button>
        <button class="submarine-manager-close" type="button" data-close-submarine-manager aria-label="Close submarine controls">×</button>
      </div>
    </div>
    ${renderMachineryColorSettingsMarkup(submarine)}

    <label class="submarine-autopilot-toggle ${autopilotEnabled ? "is-on" : "is-off"}">
      <input class="submarine-autopilot-input" type="checkbox" data-submarine-autopilot ${autopilotEnabled ? "checked" : ""} />
      <span class="submarine-autopilot-copy">
        <strong>Autopilot</strong>
      </span>
      <span class="submarine-autopilot-switch" aria-hidden="true">
        <span class="submarine-autopilot-state">${autopilotEnabled ? "ON" : "OFF"}</span>
        <i></i>
      </span>
    </label>

    <div class="submarine-drive-status">
      <span>${escapeHtml(getSubmarineControlStatus(submarine))}</span>
      <button type="button" class="small-button" data-drive-submarine>Drive</button>
    </div>
    ${!autopilotEnabled ? `<div class="submarine-touch-controls" aria-label="Submarine driving controls">
      <button type="button" data-drive-key="w" aria-label="Move up">↑</button>
      <button type="button" data-drive-key="a" aria-label="Move left">←</button>
      <button type="button" data-drive-key="s" aria-label="Move down">↓</button>
      <button type="button" data-drive-key="d" aria-label="Move right">→</button>
      <button type="button" data-submarine-command="near">Near</button>
      <button type="button" data-submarine-command="far">Far</button>
      <button type="button" data-submarine-command="food">Feed</button>
      <span>Depth ${clampTankLayer(submarine.tankLayer)} / ${TANK_DEPTH_LAYERS}</span>
    </div>` : ""}
    <div class="submarine-resource-list">
      <div class="submarine-resource-row">
        <div class="submarine-resource-body">
          <div class="submarine-resource-main">
            <div class="submarine-resource-identity">
              <img class="submarine-resource-icon" ${assetImageAttributes(foodIcon)} alt="" />
              <div class="submarine-resource-copy">
                <div class="submarine-resource-topline"><strong>Food</strong><small>${foodAvailable} available</small></div>
              </div>
            </div>
            <span class="submarine-resource-count">${submarine.inventory.food}/${SUBMARINE_RESOURCE_CAPACITY}</span>
          </div>
          <div class="submarine-resource-meter"><i style="width:${(submarine.inventory.food / SUBMARINE_RESOURCE_CAPACITY * 100).toFixed(1)}%"></i></div>
        </div>
        <div class="submarine-load-buttons" aria-label="Load food, ${foodAvailable} available">
          <button class="small-button" type="button" data-load-submarine-food="1" ${foodAvailable <= 0 || submarine.inventory.food >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+1</button>
          <button class="small-button" type="button" data-load-submarine-food="10" ${foodAvailable <= 0 || submarine.inventory.food >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+10</button>
          <button class="small-button submarine-load-button-fill" type="button" data-load-submarine-food="99" ${foodAvailable <= 0 || submarine.inventory.food >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>Fill</button>
        </div>
      </div>

      <div class="submarine-resource-row">
        <div class="submarine-resource-body">
          <div class="submarine-resource-main">
            <div class="submarine-resource-identity">
              <img class="submarine-resource-icon" ${assetImageAttributes(healthIcon)} alt="" />
              <div class="submarine-resource-copy">
                <div class="submarine-resource-topline"><strong>Health Drops</strong><small>${healthAvailable} available</small></div>
              </div>
            </div>
            <span class="submarine-resource-count">${submarine.inventory.health}/${SUBMARINE_RESOURCE_CAPACITY}</span>
          </div>
          <div class="submarine-resource-meter"><i style="width:${(submarine.inventory.health / SUBMARINE_RESOURCE_CAPACITY * 100).toFixed(1)}%"></i></div>
        </div>
        <div class="submarine-load-buttons" aria-label="Load health drops, ${healthAvailable} available">
          <button class="small-button" type="button" data-load-submarine-medicine="health" data-load-amount="1" ${healthAvailable <= 0 || submarine.inventory.health >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+1</button>
          <button class="small-button" type="button" data-load-submarine-medicine="health" data-load-amount="10" ${healthAvailable <= 0 || submarine.inventory.health >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+10</button>
          <button class="small-button submarine-load-button-fill" type="button" data-load-submarine-medicine="health" data-load-amount="99" ${healthAvailable <= 0 || submarine.inventory.health >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>Fill</button>
        </div>
      </div>

      <div class="submarine-resource-row">
        <div class="submarine-resource-body">
          <div class="submarine-resource-main">
            <div class="submarine-resource-identity">
              <img class="submarine-resource-icon" ${assetImageAttributes(calmingIcon)} alt="" />
              <div class="submarine-resource-copy">
                <div class="submarine-resource-topline"><strong>Calming Drops</strong><small>${calmingAvailable} available</small></div>
              </div>
            </div>
            <span class="submarine-resource-count">${submarine.inventory.calming}/${SUBMARINE_RESOURCE_CAPACITY}</span>
          </div>
          <div class="submarine-resource-meter"><i style="width:${(submarine.inventory.calming / SUBMARINE_RESOURCE_CAPACITY * 100).toFixed(1)}%"></i></div>
        </div>
        <div class="submarine-load-buttons" aria-label="Load calming drops, ${calmingAvailable} available">
          <button class="small-button" type="button" data-load-submarine-medicine="calming" data-load-amount="1" ${calmingAvailable <= 0 || submarine.inventory.calming >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+1</button>
          <button class="small-button" type="button" data-load-submarine-medicine="calming" data-load-amount="10" ${calmingAvailable <= 0 || submarine.inventory.calming >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+10</button>
          <button class="small-button submarine-load-button-fill" type="button" data-load-submarine-medicine="calming" data-load-amount="99" ${calmingAvailable <= 0 || submarine.inventory.calming >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>Fill</button>
        </div>
      </div>
    </div>
  `;
  element.hidden = false;
}

function renderBoatManager(element = ensureSubmarineManagerElement(), boat = getBoat()) {
  if (!element || !boat || boat.type !== MACHINERY_TYPE_BOAT) {
    if (element) element.hidden = true;
    return;
  }
  boat.inventory = sanitizeBoatInventory(boat.inventory);
  const chumAvailable = getBoatPlayerChumCount();
  const autopilotEnabled = isBoatAutopilotEnabled(boat);
  const chumIcon = resolveFoodAndMedAssetPath("chum-food.png");
  element.innerHTML = `
    <div class="submarine-manager-header">
      <div class="submarine-manager-title">
        <img ${assetImageAttributes(getMachineryImagePath(MACHINERY_TYPE_BOAT))} alt="" onerror="this.onerror=null;this.removeAttribute('src');this.setAttribute('data-sprite-src','assets/icons/tools.png')" />
        <strong>Chum Skiff</strong>
      </div>
      <div class="submarine-manager-header-actions">
        <button class="small-button submarine-settings-button ${runtime.machinerySettingsOpen ? "is-active" : ""}" type="button" data-machinery-settings aria-expanded="${runtime.machinerySettingsOpen}">SETTINGS</button>
        <button class="submarine-manager-close" type="button" data-close-submarine-manager aria-label="Close boat controls">×</button>
      </div>
    </div>
    ${renderMachineryColorSettingsMarkup(boat)}
    <label class="submarine-autopilot-toggle ${autopilotEnabled ? "is-on" : "is-off"}">
      <input class="submarine-autopilot-input" type="checkbox" data-boat-autopilot ${autopilotEnabled ? "checked" : ""} />
      <span class="submarine-autopilot-copy"><strong>Autopilot</strong></span>
      <span class="submarine-autopilot-switch" aria-hidden="true"><span class="submarine-autopilot-state">${autopilotEnabled ? "ON" : "OFF"}</span><i></i></span>
    </label>
    <div class="submarine-drive-status">
      <span>${escapeHtml(getBoatControlStatus(boat))}</span>
      <button type="button" class="small-button" data-drive-boat>Drive</button>
    </div>
    ${!autopilotEnabled ? `<div class="submarine-touch-controls" aria-label="Boat driving controls">
      <button type="button" data-drive-key="a" aria-label="Move left">←</button>
      <button type="button" data-drive-key="d" aria-label="Move right">→</button>
      <button type="button" data-boat-command="chum">Drop Chum</button>
    </div>` : ""}
    <div class="submarine-resource-list">
      <div class="submarine-resource-row">
        <div class="submarine-resource-body">
          <div class="submarine-resource-main">
            <div class="submarine-resource-identity">
              <img class="submarine-resource-icon" ${assetImageAttributes(chumIcon)} alt="" />
              <div class="submarine-resource-copy"><div class="submarine-resource-topline"><strong>Chum</strong><small>${chumAvailable} available</small></div></div>
            </div>
            <span class="submarine-resource-count">${boat.inventory.chum}/${BOAT_RESOURCE_CAPACITY}</span>
          </div>
          <div class="submarine-resource-meter"><i style="width:${(boat.inventory.chum / BOAT_RESOURCE_CAPACITY * 100).toFixed(1)}%"></i></div>
        </div>
        <div class="submarine-load-buttons" aria-label="Load chum, ${chumAvailable} available">
          <button class="small-button" type="button" data-load-boat-chum="1" ${chumAvailable <= 0 || boat.inventory.chum >= BOAT_RESOURCE_CAPACITY ? "disabled" : ""}>+1</button>
          <button class="small-button" type="button" data-load-boat-chum="10" ${chumAvailable <= 0 || boat.inventory.chum >= BOAT_RESOURCE_CAPACITY ? "disabled" : ""}>+10</button>
          <button class="small-button submarine-load-button-fill" type="button" data-load-boat-chum="99" ${chumAvailable <= 0 || boat.inventory.chum >= BOAT_RESOURCE_CAPACITY ? "disabled" : ""}>Fill</button>
        </div>
      </div>
    </div>
  `;
  element.hidden = false;
}

function getBoatControlStatus(boat = getBoat()) {
  if (getBoatEntryProgress(boat) !== null) return "Entering tank…";
  if (isBoatAutopilotEnabled(boat)) return "Skipping the surface";
  return isBoatManualDriveActive(boat)
    ? "A/D move · H horn · F feed · Space use nearby"
    : "Drive paused · close editing or care tools";
}

function renderSubmarineShopCard() {
  const count = getMachineryList().filter((item) => item.type === MACHINERY_TYPE_SUBMARINE).length + getStoredSubmarineStates().length;
  const variants = getMachineryAppearanceVariants(MACHINERY_TYPE_SUBMARINE);
  const mainImage = variants[0]?.image || SUBMARINE_IMAGE_PATH;
  return `
    <article class="shop-card submarine-shop-card">
      <img class="shop-thumb submarine-shop-thumb" ${assetImageAttributes(mainImage)} alt="Automated Care Submarine" onerror="this.onerror=null;this.removeAttribute('src');this.setAttribute('data-sprite-src','assets/icons/tools.png')" />
      <div class="shop-meta shop-card-main">
        <div>
          <strong>Automated Care Submarine</strong>
          <div class="fish-meta">Available${count ? ` · You own ${count}` : ""}</div>
        </div>
        <div class="fish-meta">Automatic care machinery that travels between connected tanks to feed hungry fish and deploy health or calming medicine when needed.</div>
        <div class="mini-note">Carries 99 food, 99 health drops, and 99 calming drops. Choose an appearance and buy as many as you need.</div>
      </div>
      <div class="shop-meta shop-card-actions">
        <span class="price-tag">${SUBMARINE_COST} ${pluralize("coin", SUBMARINE_COST)}</span>
        <div class="shop-button-row">
          <button class="buy-button" data-buy-submarine="true" data-machinery-variants="${escapeHtml(JSON.stringify(variants))}">Buy Submarine</button>
        </div>
      </div>
    </article>
  `;
}

function renderBoatShopCard() {
  const count = getMachineryList().filter((item) => item.type === MACHINERY_TYPE_BOAT).length + getStoredBoatStates().length;
  const variants = getMachineryAppearanceVariants(MACHINERY_TYPE_BOAT);
  const mainImage = variants[0]?.image || BOAT_IMAGE_PATH;
  return `
    <article class="shop-card boat-shop-card">
      <img class="shop-thumb submarine-shop-thumb" ${assetImageAttributes(mainImage)} alt="Chum Skiff" onerror="this.onerror=null;this.removeAttribute('src');this.setAttribute('data-sprite-src','assets/icons/tools.png')" />
      <div class="shop-meta shop-card-main">
        <div><strong>Chum Skiff</strong><div class="fish-meta">Available${count ? ` · You own ${count}` : ""}</div></div>
        <div class="fish-meta">A surface skiff that skips back and forth across the water and drops chum on command.</div>
        <div class="mini-note">Carries ${BOAT_RESOURCE_CAPACITY} chum. Choose an appearance and buy as many as you need.</div>
      </div>
      <div class="shop-meta shop-card-actions">
        <span class="price-tag">${BOAT_COST} ${pluralize("coin", BOAT_COST)}</span>
        <div class="shop-button-row"><button class="buy-button" data-buy-boat="true" data-machinery-variants="${escapeHtml(JSON.stringify(variants))}">Buy Boat</button></div>
      </div>
    </article>
  `;
}

function closeEditEquipmentTrayContextMenu(options = {}) {
  runtime.editEquipmentTrayContextMenuState.machineryId = null;
  runtime.editEquipmentTrayContextMenuState.anchorX = 0;
  runtime.editEquipmentTrayContextMenuState.anchorY = 0;
  if (options.render !== false) renderEditEquipmentTrayContextMenu();
}

function openEditEquipmentTrayContextMenu(machineryId, anchor = null) {
  const machinery = getMachineryById(machineryId);
  const currentTank = getCurrentTank();
  if (!machinery || ![MACHINERY_TYPE_SUBMARINE, MACHINERY_TYPE_BOAT].includes(machinery.type) || machinery.tankId !== currentTank?.id) {
    closeEditEquipmentTrayContextMenu();
    return false;
  }
  const nextAnchor = resolveEditTrayContextMenuAnchor(dom.editEquipmentTray, anchor);
  runtime.editEquipmentTrayContextMenuState.machineryId = machinery.id;
  runtime.editEquipmentTrayContextMenuState.anchorX = nextAnchor.x;
  runtime.editEquipmentTrayContextMenuState.anchorY = nextAnchor.y;
  renderEditEquipmentTrayContextMenu();
  return true;
}

function renderEditEquipmentTrayContextMenu() {
  const tray = dom.editEquipmentTray;
  const scroller = dom.editEquipmentTrayScroller;
  const menu = dom.editEquipmentTrayContextMenu;
  if (!tray || !menu) return;

  const machinery = getMachineryById(runtime.editEquipmentTrayContextMenuState.machineryId);
  const currentTank = getCurrentTank();
  const isVisible = Boolean(
    runtime.equipmentEditMode
    && !tray.hidden
    && [MACHINERY_TYPE_SUBMARINE, MACHINERY_TYPE_BOAT].includes(machinery?.type)
    && machinery.tankId === currentTank?.id
  );

  tray.classList.toggle("has-context-menu", isVisible);
  if (scroller) {
    for (const button of scroller.querySelectorAll("[data-tray-select-submarine], [data-tray-select-boat]")) {
      button.closest(".edit-decor-tile")?.classList.toggle(
        "is-context-open",
        isVisible && (button.dataset.traySelectSubmarine || button.dataset.traySelectBoat) === machinery?.id
      );
    }
  }

  if (!isVisible || !machinery) {
    menu.hidden = true;
    menu.style.left = "";
    menu.style.top = "";
    return;
  }

  const isBoat = machinery.type === MACHINERY_TYPE_BOAT;
  const inventory = isBoat ? sanitizeBoatInventory(machinery.inventory) : sanitizeSubmarineInventory(machinery.inventory);
  const markup = `
    <div class="edit-fish-tray-context-card">
      <div class="edit-fish-tray-context-copy"><strong>${isBoat ? "Chum Skiff" : "Automated Care Submarine"}</strong><span>${isBoat ? `Chum ${inventory.chum}/99` : `Food ${inventory.food}/99 | Health ${inventory.health}/99 | Calm ${inventory.calming}/99`}</span></div>
      <button
        class="edit-fish-tray-context-action"
        type="button"
        ${isBoat ? `data-tray-store-boat="${escapeHtml(machinery.id)}"` : `data-tray-store-submarine="${escapeHtml(machinery.id)}"`}
      >
        Put Away
      </button>
    </div>
  `;
  setMarkupIfChanged("edit-equipment-tray-context-menu", menu, markup);
  menu.hidden = false;
  positionEditTrayContextMenu(
    tray,
    menu,
    runtime.editEquipmentTrayContextMenuState.anchorX,
    runtime.editEquipmentTrayContextMenuState.anchorY
  );
}

function renderEditEquipmentTray() {
  const visible = runtime.equipmentEditMode === true;
  if (dom.editEquipmentTray) dom.editEquipmentTray.hidden = !visible;
  syncTankTrayStageClass();
  if (!visible || !dom.editEquipmentTray || !dom.editEquipmentTrayScroller) {
    closeEditEquipmentTrayContextMenu();
    return;
  }

  for (const tab of dom.editEquipmentTray.querySelectorAll("[data-edit-overlay-mode]")) {
    const selected = tab.dataset.editOverlayMode === "equipment";
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  }

  const activeLocationTab = runtime.equipmentEditTrayTab === "tank" ? "tank" : "storage";
  for (const tab of dom.editEquipmentTray.querySelectorAll("[data-equipment-tray-tab]")) {
    const selected = tab.dataset.equipmentTrayTab === activeLocationTab;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
  }

  const submarine = getSubmarine();
  const boat = getBoat();
  const storedSubmarine = getStoredSubmarineState();
  const storedBoat = getStoredBoatState();
  const storedSubmarines = getStoredSubmarineStates();
  const storedBoats = getStoredBoatStates();
  const submarineOwned = isSubmarineOwned();
  const boatOwned = isBoatOwned();
  const currentTank = getCurrentTank();
  const submarineTank = getSubmarineTank(submarine);
  const boatTank = getBoatTank(boat);
  const machineryEntries = activeLocationTab === "storage"
    ? [
      ...storedSubmarines.map((item) => ({ item, type: MACHINERY_TYPE_SUBMARINE, stored: true })),
      // A newly purchased machine has ownership but no persisted storage
      // record until it is deployed once. Show that owned machine here so
      // purchase immediately exposes the same Place action as a recalled one.
      !storedSubmarine && !submarine && submarineOwned
        ? {
          item: { type: MACHINERY_TYPE_SUBMARINE, inventory: sanitizeSubmarineInventory(null) },
          type: MACHINERY_TYPE_SUBMARINE,
          stored: true
        }
        : null,
      ...storedBoats.map((item) => ({ item, type: MACHINERY_TYPE_BOAT, stored: true })),
      !storedBoat && !boat && boatOwned
        ? {
          item: { type: MACHINERY_TYPE_BOAT, inventory: sanitizeBoatInventory(null) },
          type: MACHINERY_TYPE_BOAT,
          stored: true
        }
        : null
    ].filter(Boolean)
    : [
      ...getMachineryList().filter((item) => item.type === MACHINERY_TYPE_SUBMARINE && item.tankId === currentTank?.id)
        .map((item) => ({ item, type: MACHINERY_TYPE_SUBMARINE, stored: false })),
      ...getMachineryList().filter((item) => item.type === MACHINERY_TYPE_BOAT && item.tankId === currentTank?.id)
        .map((item) => ({ item, type: MACHINERY_TYPE_BOAT, stored: false }))
    ].filter(Boolean);

  const renderMachineryTile = ({ item, type, stored }) => {
    const isBoat = type === MACHINERY_TYPE_BOAT;
    const inventory = isBoat ? sanitizeBoatInventory(item.inventory) : sanitizeSubmarineInventory(item.inventory);
    const label = isBoat ? "Chum Skiff" : "Automated Care Submarine";
    const imagePath = getMachineryImagePath(type, Date.now(), item);
    const actionLabel = stored ? `Place ${label} in this tank` : `Manage ${label}`;
    const selector = stored
      ? (isBoat ? "data-tray-place-boat=\"true\"" : "data-tray-place-submarine=\"true\"")
      : (isBoat ? `data-tray-select-boat="${escapeHtml(item.id)}"` : `data-tray-select-submarine="${escapeHtml(item.id)}"`);
    const resourceNote = isBoat
      ? `Chum ${inventory.chum}/${BOAT_RESOURCE_CAPACITY}`
      : `Food ${inventory.food}/${SUBMARINE_RESOURCE_CAPACITY} | Health ${inventory.health}/${SUBMARINE_RESOURCE_CAPACITY} | Calm ${inventory.calming}/${SUBMARINE_RESOURCE_CAPACITY}`;
    return `
      <article class="edit-decor-tile" data-decor-name="${label}">
        ${!stored ? `<button class="edit-decor-tile-menu-button" type="button" data-open-equipment-menu="${escapeHtml(item.id)}" aria-label="${label} options">…</button>` : ""}
        <button
          class="edit-decor-tile-primary"
          type="button"
          ${selector}
          title="${actionLabel}"
          aria-label="${actionLabel}"
        >
          <span class="edit-decor-tile-surface">
            <img class="edit-decor-tile-thumb" ${assetImageAttributes(imagePath)} alt="${label}" onerror="this.onerror=null;this.removeAttribute('src');this.setAttribute('data-sprite-src','assets/icons/tools.png')" />
            <span class="inventory-tray-label">${stored ? "Storage" : "In Tank"}</span>
          </span>
        </button>
        <div class="mini-note edit-equipment-resource-note">${resourceNote}</div>
      </article>
    `;
  };

  let markup = machineryEntries.map(renderMachineryTile).join("");
  if (!markup && activeLocationTab === "storage" && (submarineOwned || boatOwned)) {
    const foreignMachine = submarine && !machineryEntries.some((entry) => entry.item.id === submarine.id)
      ? { label: "submarine", tank: submarineTank, visitAttribute: "data-visit-submarine-tank" }
      : boat && !machineryEntries.some((entry) => entry.item.id === boat.id)
        ? { label: "boat", tank: boatTank, visitAttribute: "data-visit-boat-tank" }
        : null;
    if (foreignMachine?.tank) {
      markup = `<div class="edit-decor-tray-empty">Your ${foreignMachine.label} is deployed in ${escapeHtml(getTankLabel(foreignMachine.tank))}. Visit that tank to put it into storage. <button type="button" class="small-button" ${foreignMachine.visitAttribute}>Go to tank</button></div>`;
    }
  }
  if (!markup) {
    if (!submarineOwned && !boatOwned) {
      markup = `<div class="edit-decor-tray-empty">No equipment owned. Buy a submarine or boat in BubbleBodega &gt; Equipment.</div>`;
    } else {
      markup = `<div class="edit-decor-tray-empty">${activeLocationTab === "tank" ? "No equipment is deployed in this tank." : "Equipment storage is empty."}</div>`;
    }
  }

  const dataKey = [
    activeLocationTab,
    submarineOwned ? "sub-owned" : "sub-not-owned",
    boatOwned ? "boat-owned" : "boat-not-owned",
    submarine?.id || "",
    submarine?.tankId || "",
    submarine ? normalizeSubmarineResourceCount(submarine.inventory?.food) : 0,
    submarine ? normalizeSubmarineResourceCount(submarine.inventory?.health) : 0,
    submarine ? normalizeSubmarineResourceCount(submarine.inventory?.calming) : 0,
    storedSubmarine ? normalizeSubmarineResourceCount(storedSubmarine.inventory?.food) : 0,
    storedSubmarine ? normalizeSubmarineResourceCount(storedSubmarine.inventory?.health) : 0,
    storedSubmarine ? normalizeSubmarineResourceCount(storedSubmarine.inventory?.calming) : 0,
    currentTank?.id || "",
    submarineTank?.name || "",
    boat?.id || "",
    boat?.tankId || "",
    boat ? normalizeBoatResourceCount(boat.inventory?.chum) : 0,
    storedBoat ? normalizeBoatResourceCount(storedBoat.inventory?.chum) : 0,
    boatTank?.name || ""
  ].join("|");
  if (shouldRebuildRenderSection("edit-equipment-tray-data", dataKey)) {
    setMarkupIfChanged("edit-equipment-tray", dom.editEquipmentTrayScroller, markup);
  }
  renderEditEquipmentTrayContextMenu();
}

function getSubmarineDrawMetrics(submarine, now = Date.now()) {
  if (!submarine) return null;
  const imagePath = getMachineryImagePath(MACHINERY_TYPE_SUBMARINE, now, submarine);
  const image = runtime.images.get(imagePath) || null;
  if (!isUsableRuntimeImage(image)) {
    requestRuntimeImageRecovery(imagePath, { kind: "machinery", id: submarine.id });
  }
  const naturalWidth = Math.max(1, Number(image?.naturalWidth || image?.width) || 3);
  const naturalHeight = Math.max(1, Number(image?.naturalHeight || image?.height) || 1);
  const tankLayer = clampTankLayer(submarine.tankLayer ?? SUBMARINE_DEFAULT_TANK_LAYER);
  const depthScale = clamp(1 + (SUBMARINE_DEFAULT_TANK_LAYER - tankLayer) * 0.04, 0.86, 1.08);
  const baseWidth = SUBMARINE_DRAW_WIDTH_PX;
  const baseHeight = clamp(baseWidth * (naturalHeight / naturalWidth), 50, 124);
  const width = baseWidth * depthScale;
  const height = baseHeight * depthScale;
  const velocityX = Number(submarine.motionVelocityXPxPerSecond ?? submarine.manualVelocityXPxPerSecond) || 0;
  const velocityY = Number(submarine.motionVelocityYPxPerSecond ?? submarine.manualVelocityYPxPerSecond) || 0;
  const speedRatio = clamp(Math.hypot(velocityX, velocityY) / SUBMARINE_MANUAL_SPEED_PX_PER_SECOND, 0, 1);
  const phase = (hashStringToUint32(String(submarine.id || "submarine")) % 1000) / 1000 * Math.PI * 2;
  const entryProgress = getSubmarineEntryProgress(submarine, now);
  const easedEntry = entryProgress === null ? null : 1 - Math.pow(1 - entryProgress, 3);
  const renderYNorm = easedEntry === null || !Number.isFinite(Number(submarine.entryFromYNorm))
    ? Number(submarine.yNorm)
    : Number(submarine.entryFromYNorm) + (Number(submarine.yNorm) - Number(submarine.entryFromYNorm)) * easedEntry;
  const bobAmplitude = SUBMARINE_IDLE_BOB_AMPLITUDE_PX * (1 - speedRatio * 0.68) * depthScale * (entryProgress === null ? 1 : entryProgress);
  const bob = Math.sin(now / SUBMARINE_IDLE_BOB_PERIOD_MS * Math.PI * 2 + phase) * bobAmplitude;
  const idleRock = Math.sin(now / (SUBMARINE_IDLE_BOB_PERIOD_MS * 1.35) * Math.PI * 2 + phase * 0.7) * (Math.PI / 180) * 0.75 * (1 - speedRatio * 0.72);
  const verticalTilt = clamp(velocityY / Math.max(1, SUBMARINE_MANUAL_SPEED_PX_PER_SECOND), -1, 1) * (Math.PI / 180) * 2.2;
  const turn = getMachineryTurnRenderState(submarine, now, SUBMARINE_TURN_LEAN_RADIANS);
  return {
    image,
    x: Number(submarine.xNorm) * TANK_WIDTH + turn.swayX,
    y: renderYNorm * TANK_HEIGHT + bob,
    width,
    height,
    direction: turn.direction,
    turnScaleX: turn.scaleX,
    turnScaleY: turn.scaleY,
    tankLayer,
    rotation: idleRock + verticalTilt + turn.lean,
    entryProgress
  };
}

function getBoatDrawMetrics(boat, now = Date.now()) {
  if (!boat) return null;
  const imagePath = getMachineryImagePath(MACHINERY_TYPE_BOAT, now, boat);
  const image = runtime.images.get(imagePath) || null;
  if (!isUsableRuntimeImage(image)) {
    requestRuntimeImageRecovery(imagePath, { kind: "machinery", id: boat.id });
  }
  const naturalWidth = Math.max(1, Number(image?.naturalWidth || image?.width) || 1);
  const naturalHeight = Math.max(1, Number(image?.naturalHeight || image?.height) || 1);
  const width = BOAT_DRAW_WIDTH_PX;
  const height = clamp(width * (naturalHeight / naturalWidth), 86, 240);
  const velocityX = Number(boat.motionVelocityXPxPerSecond ?? boat.manualVelocityXPxPerSecond) || 0;
  const speedRatio = clamp(Math.abs(velocityX) / BOAT_MANUAL_SPEED_PX_PER_SECOND, 0, 1);
  const phase = (hashStringToUint32(String(boat.id || "boat")) % 1000) / 1000 * Math.PI * 2;
  const entryProgress = getBoatEntryProgress(boat, now);
  const easedEntry = entryProgress === null ? null : 1 - Math.pow(1 - entryProgress, 3);
  // The skiff rides low at the surface, with the hull settling below the
  // waterline while the cabin remains above it.
  const surfaceCenterY = WATER_SURFACE_Y - height * 0.5 + BOAT_SURFACE_BOTTOM_GAP_PX;
  const entryFromY = Number.isFinite(Number(boat.entryFromYNorm))
    ? Number(boat.entryFromYNorm) * TANK_HEIGHT
    : WATER_SURFACE_Y - height * 0.9;
  const renderY = easedEntry === null
    ? surfaceCenterY
    : entryFromY + (surfaceCenterY - entryFromY) * easedEntry;
  const bobAmplitude = BOAT_IDLE_BOB_AMPLITUDE_PX * (1 - speedRatio * 0.72) * (entryProgress === null ? 1 : entryProgress);
  const bob = Math.sin(now / BOAT_IDLE_BOB_PERIOD_MS * Math.PI * 2 + phase) * bobAmplitude;
  const rock = Math.sin(now / (BOAT_IDLE_BOB_PERIOD_MS * 1.25) * Math.PI * 2 + phase * 0.55)
    * (Math.PI / 180) * 1.15 * (1 - speedRatio * 0.8);
  const travelTilt = clamp(velocityX / Math.max(1, BOAT_MANUAL_SPEED_PX_PER_SECOND), -1, 1) * (Math.PI / 180) * 2.2;
  const turn = getMachineryTurnRenderState(boat, now, BOAT_TURN_LEAN_RADIANS);
  return {
    image,
    x: Number(boat.xNorm) * TANK_WIDTH + turn.swayX,
    y: renderY + bob,
    width,
    height,
    direction: turn.direction,
    turnScaleX: turn.scaleX,
    turnScaleY: turn.scaleY,
    tankLayer: BOAT_SURFACE_LAYER,
    rotation: rock + travelTilt + turn.lean,
    entryProgress
  };
}

function drawSubmarineSpotlight(submarine, metrics) {
  if (!submarine?.mission || !metrics || !isSubmarineAutopilotEnabled(submarine)) return;
  const direction = metrics.direction;
  const turnScaleX = Number(metrics.turnScaleX) || 1;
  const turnScaleY = Number(metrics.turnScaleY) || 1;
  const localX = (SUBMARINE_SPOTLIGHT_LAMP_X_NORM - 0.5) * metrics.width * direction * turnScaleX;
  const localY = (SUBMARINE_SPOTLIGHT_LAMP_Y_NORM - 0.5) * metrics.height * turnScaleY;
  const rotation = (Number(metrics.rotation) || 0) + (direction < 0 ? Math.PI : 0);
  const cosRotation = Math.cos(Number(metrics.rotation) || 0);
  const sinRotation = Math.sin(Number(metrics.rotation) || 0);
  const lampX = metrics.x + localX * cosRotation - localY * sinRotation;
  const lampY = metrics.y + localX * sinRotation + localY * cosRotation;
  const length = SUBMARINE_SPOTLIGHT_LENGTH_PX;
  const outerSpread = 84;
  const innerSpread = 42;
  tankContext.save();
  tankContext.globalCompositeOperation = "screen";
  tankContext.translate(lampX, lampY);
  tankContext.rotate(rotation);

  const outerGlow = tankContext.createRadialGradient(0, 0, 1, length * 0.24, 0, length);
  outerGlow.addColorStop(0, "rgba(205,241,255,0.2)");
  outerGlow.addColorStop(0.22, "rgba(176,224,255,0.1)");
  outerGlow.addColorStop(0.68, "rgba(149,211,255,0.028)");
  outerGlow.addColorStop(1, "rgba(149,211,255,0)");
  tankContext.fillStyle = outerGlow;
  tankContext.beginPath();
  tankContext.moveTo(0, -7);
  tankContext.quadraticCurveTo(length * 0.5, -outerSpread * 0.72, length, -outerSpread);
  tankContext.lineTo(length, outerSpread);
  tankContext.quadraticCurveTo(length * 0.5, outerSpread * 0.72, 0, 7);
  tankContext.closePath();
  tankContext.fill();

  const coreGlow = tankContext.createLinearGradient(0, 0, length, 0);
  coreGlow.addColorStop(0, "rgba(234,251,255,0.24)");
  coreGlow.addColorStop(0.34, "rgba(203,239,255,0.1)");
  coreGlow.addColorStop(1, "rgba(181,229,255,0)");
  tankContext.fillStyle = coreGlow;
  tankContext.beginPath();
  tankContext.moveTo(0, -4);
  tankContext.quadraticCurveTo(length * 0.52, -innerSpread * 0.7, length, -innerSpread);
  tankContext.lineTo(length, innerSpread);
  tankContext.quadraticCurveTo(length * 0.52, innerSpread * 0.7, 0, 4);
  tankContext.closePath();
  tankContext.fill();
  tankContext.restore();
}

function drawSubmarineWarningLight(submarine, metrics, now = Date.now()) {
  if (!isSubmarineOutOfResources(submarine) || !metrics) return;
  const blinkOn = Math.floor(now / SUBMARINE_RED_LIGHT_BLINK_MS) % 2 === 0;
  if (!blinkOn) return;
  const localX = (SUBMARINE_WARNING_LIGHT_X_NORM - 0.5) * metrics.width * metrics.direction * (Number(metrics.turnScaleX) || 1);
  const localY = (SUBMARINE_WARNING_LIGHT_Y_NORM - 0.5) * metrics.height * (Number(metrics.turnScaleY) || 1);
  const rotation = Number(metrics.rotation) || 0;
  const cosRotation = Math.cos(rotation);
  const sinRotation = Math.sin(rotation);
  const lightX = metrics.x + localX * cosRotation - localY * sinRotation;
  const lightY = metrics.y + localX * sinRotation + localY * cosRotation;
  tankContext.save();
  tankContext.globalCompositeOperation = "screen";
  const glowRadius = clamp(metrics.width * 0.095, 13, 22);
  const glow = tankContext.createRadialGradient(lightX, lightY, 1, lightX, lightY, glowRadius);
  glow.addColorStop(0, "rgba(255,245,245,1)");
  glow.addColorStop(0.2, "rgba(255,70,70,0.95)");
  glow.addColorStop(1, "rgba(255,0,0,0)");
  tankContext.fillStyle = glow;
  tankContext.beginPath();
  tankContext.arc(lightX, lightY, glowRadius, 0, Math.PI * 2);
  tankContext.fill();
  tankContext.fillStyle = "rgba(255,45,45,0.98)";
  tankContext.beginPath();
  tankContext.arc(lightX, lightY, clamp(metrics.width * 0.018, 3.1, 5.2), 0, Math.PI * 2);
  tankContext.fill();
  tankContext.restore();
}

function getSubmarineBubbleMotionState(submarine) {
  if (!submarine) return null;
  const velocityX = Number(submarine.motionVelocityXPxPerSecond ?? submarine.manualVelocityXPxPerSecond) || 0;
  const velocityY = Number(submarine.motionVelocityYPxPerSecond ?? submarine.manualVelocityYPxPerSecond) || 0;

  if (isSubmarineManualDriveActive(submarine)) {
    const input = getSubmarineManualInputVector();
    return {
      horizontalPower: Math.abs(input.x),
      verticalPower: Math.abs(input.y),
      ascending: input.y < 0,
      velocityX,
      velocityY
    };
  }

  if (!isSubmarineAutopilotEnabled(submarine)) return null;
  const cruiseReference = Math.max(1, SUBMARINE_CRUISE_SPEED_PX_PER_SECOND);
  const horizontalPower = Math.abs(velocityX) < 4
    ? 0
    : clamp(Math.abs(velocityX) / cruiseReference, 0, 1);
  const verticalPower = Math.abs(velocityY) < 4
    ? 0
    : clamp(Math.abs(velocityY) / cruiseReference, 0, 1);
  return {
    horizontalPower,
    verticalPower,
    ascending: velocityY < 0,
    velocityX,
    velocityY
  };
}

function buildSubmarineBubbleSpouts(submarine, metrics) {
  const motion = getSubmarineBubbleMotionState(submarine);
  if (!motion) return [];
  const spouts = [];

  if (motion.horizontalPower > 0.001) {
    const speedRatio = clamp(
      Math.abs(motion.velocityX) / Math.max(1, SUBMARINE_MANUAL_SPEED_PX_PER_SECOND),
      0,
      1
    );
    const rearDirection = metrics.direction > 0 ? "left" : "right";
    spouts.push(buildBubblerSpoutFromSettings({
      amount: clamp(21 + motion.horizontalPower * 3, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY),
      speed: clamp(2.4 + speedRatio * 1.6, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED),
      direction: rearDirection,
      bubblePopEnabled: true,
      bubbleMalformed: true,
      bubbleMalformedIntensity: MAX_BUBBLER_MALFORMED_INTENSITY,
      bubbleMalformedSpeed: 0.5
    }, {
      horizontalLocation: SUBMARINE_REAR_BUBBLE_X_NORM,
      horizontalOffsetPx: null,
      verticalLocation: SUBMARINE_REAR_BUBBLE_Y_NORM
    }));
  }

  if (motion.verticalPower > 0.001) {
    const verticalReference = Math.max(1, SUBMARINE_MANUAL_SPEED_PX_PER_SECOND * SUBMARINE_MANUAL_VERTICAL_SPEED_SCALE);
    const speedRatio = clamp(Math.abs(motion.velocityY) / verticalReference, 0, 1);
    const intensityFloor = motion.ascending ? 18 : 14;
    const intensityRange = motion.ascending ? 4 : 4;
    const pressureSettings = {
      amount: clamp(intensityFloor + motion.verticalPower * intensityRange, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY),
      speed: clamp((motion.ascending ? 1.15 : 0.9) + speedRatio * (motion.ascending ? 0.85 : 0.65), MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED),
      direction: "up",
      bubblePopEnabled: true,
      bubbleMalformed: true,
      bubbleMalformedIntensity: MAX_BUBBLER_MALFORMED_INTENSITY,
      bubbleMalformedSpeed: 0.5
    };
    for (const horizontalLocation of [SUBMARINE_PRESSURE_BUBBLE_LEFT_X_NORM, SUBMARINE_PRESSURE_BUBBLE_RIGHT_X_NORM]) {
      spouts.push(buildBubblerSpoutFromSettings(pressureSettings, {
        horizontalLocation,
        horizontalOffsetPx: null,
        verticalLocation: SUBMARINE_PRESSURE_BUBBLE_Y_NORM
      }));
    }
  }

  return spouts;
}

function getBoatBubbleMotionState(boat) {
  if (!boat) return null;
  const velocityX = Number(boat.motionVelocityXPxPerSecond ?? boat.manualVelocityXPxPerSecond) || 0;

  if (isBoatManualDriveActive(boat)) {
    const input = getBoatManualInputVector();
    return {
      horizontalPower: Math.abs(input.x),
      velocityX
    };
  }

  if (!isBoatAutopilotEnabled(boat)) return null;
  const cruiseReference = Math.max(1, BOAT_CRUISE_SPEED_PX_PER_SECOND);
  const horizontalPower = Math.abs(velocityX) < 4
    ? 0
    : clamp(Math.abs(velocityX) / cruiseReference, 0, 1);
  return { horizontalPower, velocityX };
}

function buildBoatBubbleSpouts(boat, metrics) {
  const motion = getBoatBubbleMotionState(boat);
  if (!motion || motion.horizontalPower <= 0.001) return [];
  const speedRatio = clamp(
    Math.abs(motion.velocityX) / Math.max(1, BOAT_MANUAL_SPEED_PX_PER_SECOND),
    0,
    1
  );
  const rearDirection = metrics.direction > 0 ? "left" : "right";
  return [buildBubblerSpoutFromSettings({
    amount: clamp(21 + motion.horizontalPower * 3, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY),
    speed: clamp(2.4 + speedRatio * 1.6, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED),
    direction: rearDirection,
    bubblePopEnabled: true,
    bubbleMalformed: true,
    bubbleMalformedIntensity: MAX_BUBBLER_MALFORMED_INTENSITY,
    bubbleMalformedSpeed: 0.5
  }, {
    horizontalLocation: BOAT_REAR_BUBBLE_X_NORM,
    horizontalOffsetPx: null,
    verticalLocation: BOAT_REAR_BUBBLE_Y_NORM
  })];
}

function queueBoatBubbleBurst(boat, metrics, now = Date.now()) {
  if (!boat || !metrics || getBoatEntryProgress(boat, now) !== null) return;
  if (!(runtime.boatBubbleEmitterState instanceof Map)) {
    runtime.boatBubbleEmitterState = new Map();
  }
  if (!Array.isArray(runtime.boatBubbleBursts)) {
    runtime.boatBubbleBursts = [];
  }

  const spouts = buildBoatBubbleSpouts(boat, metrics);
  const emitterKey = `${boat.id}|${boat.tankId}|${metrics.tankLayer}`;
  if (!spouts.length) {
    runtime.boatBubbleEmitterState.delete(emitterKey);
    return;
  }

  const previousSampleAt = Number(runtime.boatBubbleEmitterState.get(emitterKey));
  if (!Number.isFinite(previousSampleAt)) {
    runtime.boatBubbleEmitterState.set(emitterKey, now);
    return;
  }
  if (now - previousSampleAt < SUBMARINE_BUBBLE_EMITTER_SAMPLE_MS) return;

  const emissionStartedAtMs = previousSampleAt;
  const emissionEndedAtMs = now;
  runtime.boatBubbleEmitterState.set(emitterKey, now);
  const maxTravelDurationMs = Math.max(
    ...spouts.map((spout) => getBubblerTravelDurationFromSpeed(spout.speed))
  );
  runtime.boatBubbleBursts.push({
    id: `${boat.id}-bubble-jet`,
    tankId: boat.tankId,
    tankLayer: metrics.tankLayer,
    x: metrics.x,
    y: metrics.y,
    width: metrics.width * (Number(metrics.turnScaleX) || 1),
    height: metrics.height * (Number(metrics.turnScaleY) || 1),
    direction: metrics.direction,
    emissionStartedAtMs,
    emissionEndedAtMs,
    expiresAt: now + maxTravelDurationMs + SUBMARINE_BUBBLE_LINGER_PAD_MS,
    spouts
  });

  const oldestUsefulTime = now - MAX_BUBBLER_TRAVEL_DURATION_MS - SUBMARINE_BUBBLE_LINGER_PAD_MS;
  runtime.boatBubbleBursts = runtime.boatBubbleBursts.filter((burst) => (
    burst
    && Number(burst.expiresAt) > now
    && Number(burst.emissionEndedAtMs) >= oldestUsefulTime
  ));
}

function drawBoatBubbleBursts(now = Date.now(), layer = BOAT_SURFACE_LAYER) {
  if (!Array.isArray(runtime.boatBubbleBursts) || !runtime.boatBubbleBursts.length) return;
  const tank = getCurrentTank();
  if (!tank) return;
  runtime.boatBubbleBursts = runtime.boatBubbleBursts.filter((burst) => burst && Number(burst.expiresAt) > now);
  const image = runtime.images.get(getMachineryImagePath(MACHINERY_TYPE_BOAT)) || null;
  if (!isUsableRuntimeImage(image)) return;

  for (const burst of runtime.boatBubbleBursts) {
    if (burst.tankId !== tank.id || clampTankLayer(burst.tankLayer) !== layer || !burst.spouts?.length) continue;
    const item = {
      id: burst.id,
      decorKey: "boat-thruster",
      xNorm: burst.x / TANK_WIDTH,
      yNorm: burst.y / TANK_HEIGHT,
      scale: 1,
      flipped: Number(burst.direction) < 0,
      flippedY: false
    };
    const decor = {
      path: getMachineryImagePath(MACHINERY_TYPE_BOAT),
      bubbler: { spoutQty: burst.spouts.length, spouts: burst.spouts }
    };
    drawDecorBubblerEffectToContext(tankContext, item, decor, image, now, {
      width: burst.width,
      height: burst.height,
      drawX: burst.x - burst.width / 2,
      drawY: burst.y - burst.height / 2,
      alphaScale: 1,
      stableScale: getViewportStableAssetScale(),
      waterSurfaceY: WATER_SURFACE_Y,
      emissionStartedAtMs: burst.emissionStartedAtMs,
      emissionEndedAtMs: burst.emissionEndedAtMs,
      straightDirectionalTravel: true
    });
  }
}

function queueSubmarineBubbleBurst(submarine, metrics, now = Date.now()) {
  if (!submarine || !metrics || getSubmarineEntryProgress(submarine, now) !== null) return;
  if (!(runtime.submarineBubbleEmitterState instanceof Map)) {
    runtime.submarineBubbleEmitterState = new Map();
  }
  if (!Array.isArray(runtime.submarineBubbleBursts)) {
    runtime.submarineBubbleBursts = [];
  }

  const spouts = buildSubmarineBubbleSpouts(submarine, metrics);
  const emitterKey = `${submarine.id}|${submarine.tankId}|${metrics.tankLayer}`;
  if (!spouts.length) {
    runtime.submarineBubbleEmitterState.delete(emitterKey);
    return;
  }

  const previousSampleAt = Number(runtime.submarineBubbleEmitterState.get(emitterKey));
  if (!Number.isFinite(previousSampleAt)) {
    runtime.submarineBubbleEmitterState.set(emitterKey, now);
    return;
  }
  if (now - previousSampleAt < SUBMARINE_BUBBLE_EMITTER_SAMPLE_MS) return;

  const emissionStartedAtMs = previousSampleAt;
  const emissionEndedAtMs = now;
  runtime.submarineBubbleEmitterState.set(emitterKey, now);
  const maxTravelDurationMs = Math.max(
    ...spouts.map((spout) => getBubblerTravelDurationFromSpeed(spout.speed))
  );
  runtime.submarineBubbleBursts.push({
    id: `${submarine.id}-bubble-jet`,
    tankId: submarine.tankId,
    tankLayer: metrics.tankLayer,
    x: metrics.x,
    y: metrics.y,
    width: metrics.width * (Number(metrics.turnScaleX) || 1),
    height: metrics.height * (Number(metrics.turnScaleY) || 1),
    direction: metrics.direction,
    emissionStartedAtMs,
    emissionEndedAtMs,
    expiresAt: now + maxTravelDurationMs + SUBMARINE_BUBBLE_LINGER_PAD_MS,
    spouts
  });

  const oldestUsefulTime = now - MAX_BUBBLER_TRAVEL_DURATION_MS - SUBMARINE_BUBBLE_LINGER_PAD_MS;
  runtime.submarineBubbleBursts = runtime.submarineBubbleBursts.filter((burst) => (
    burst
    && Number(burst.expiresAt) > now
    && Number(burst.emissionEndedAtMs) >= oldestUsefulTime
  ));
}

function drawSubmarineBubbleBursts(now = Date.now(), layer = 2) {
  if (!Array.isArray(runtime.submarineBubbleBursts) || !runtime.submarineBubbleBursts.length) return;
  const tank = getCurrentTank();
  if (!tank) return;
  runtime.submarineBubbleBursts = runtime.submarineBubbleBursts.filter((burst) => burst && Number(burst.expiresAt) > now);
  const image = runtime.images.get(getMachineryImagePath(MACHINERY_TYPE_SUBMARINE)) || null;
  if (!isUsableRuntimeImage(image)) return;

  for (const burst of runtime.submarineBubbleBursts) {
    if (burst.tankId !== tank.id || clampTankLayer(burst.tankLayer) !== layer || !burst.spouts?.length) continue;
    const item = {
      id: burst.id,
      decorKey: "submarine-thruster",
      xNorm: burst.x / TANK_WIDTH,
      yNorm: burst.y / TANK_HEIGHT,
      scale: 1,
      flipped: Number(burst.direction) < 0,
      flippedY: false
    };
    const decor = {
      path: getMachineryImagePath(MACHINERY_TYPE_SUBMARINE),
      bubbler: { spoutQty: burst.spouts.length, spouts: burst.spouts }
    };
    drawDecorBubblerEffectToContext(tankContext, item, decor, image, now, {
      width: burst.width,
      height: burst.height,
      drawX: burst.x - burst.width / 2,
      drawY: burst.y - burst.height / 2,
      alphaScale: 1,
      stableScale: getViewportStableAssetScale(),
      waterSurfaceY: WATER_SURFACE_Y,
      emissionStartedAtMs: burst.emissionStartedAtMs,
      emissionEndedAtMs: burst.emissionEndedAtMs,
      smoothDirectionalTurn: true
    });
  }
}

function drawMachinery(now, layer = 2) {
  const tank = getCurrentTank();
  if (!tank) return;
  const machineryForLayer = [];
  for (const machinery of getMachineryForTank(tank.id)) {
    const metrics = machinery.type === MACHINERY_TYPE_BOAT
      ? getBoatDrawMetrics(machinery, now)
      : machinery.type === MACHINERY_TYPE_SUBMARINE
        ? getSubmarineDrawMetrics(machinery, now)
        : null;
    if (!metrics || metrics.tankLayer !== layer) continue;
    if (machinery.type === MACHINERY_TYPE_SUBMARINE) queueSubmarineBubbleBurst(machinery, metrics, now);
    if (machinery.type === MACHINERY_TYPE_BOAT) queueBoatBubbleBurst(machinery, metrics, now);
    machineryForLayer.push({ machinery, metrics });
  }
  drawSubmarineBubbleBursts(now, layer);
  drawBoatBubbleBursts(now, layer);
  for (const { machinery, metrics } of machineryForLayer) {
    const isBoat = machinery.type === MACHINERY_TYPE_BOAT;
    if (!isBoat) drawSubmarineSpotlight(machinery, metrics);
    tankContext.save();
    tankContext.translate(metrics.x, metrics.y);
    tankContext.rotate(metrics.rotation || 0);
    tankContext.scale(metrics.direction * (Number(metrics.turnScaleX) || 1), Number(metrics.turnScaleY) || 1);
    if (isUsableRuntimeImage(metrics.image)) {
      const imagePath = isBoat ? getMachineryImagePath(MACHINERY_TYPE_BOAT) : getMachineryImagePath(MACHINERY_TYPE_SUBMARINE);
      const drawImage = getMachineryTintedImage(imagePath, metrics.image, machinery);
      const colorFilter = getMachineryColorCycleFilter(machinery, now);
      if (colorFilter !== "none") tankContext.filter = colorFilter;
      tankContext.drawImage(drawImage, -metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height);
    } else {
      tankContext.fillStyle = "rgba(28,62,78,0.95)";
      tankContext.strokeStyle = "rgba(111,224,255,0.85)";
      tankContext.lineWidth = 3;
      tankContext.beginPath();
      tankContext.roundRect(-metrics.width / 2, -metrics.height / 3, metrics.width, metrics.height * 0.66, metrics.height / 3);
      tankContext.fill();
      tankContext.stroke();
    }
    tankContext.restore();
    if (!isBoat) drawSubmarineWarningLight(machinery, metrics, now);
    if (runtime.selectedMachineryId === machinery.id) {
      tankContext.save();
      tankContext.strokeStyle = "rgba(108,236,255,0.9)";
      tankContext.lineWidth = 3;
      tankContext.setLineDash([9, 7]);
      tankContext.strokeRect(metrics.x - metrics.width / 2 - 8, metrics.y - metrics.height / 2 - 8, metrics.width + 16, metrics.height + 16);
      tankContext.restore();
    }
  }
}

function findMachineryAtPoint(x, y, now = Date.now()) {
  const tank = getCurrentTank();
  if (!tank) return null;
  const candidates = getMachineryForTank(tank.id).slice().reverse();
  for (const machinery of candidates) {
    if (![MACHINERY_TYPE_SUBMARINE, MACHINERY_TYPE_BOAT].includes(machinery.type)) continue;
    const metrics = machinery.type === MACHINERY_TYPE_BOAT
      ? getBoatDrawMetrics(machinery, now)
      : getSubmarineDrawMetrics(machinery, now);
    if (!metrics) continue;
    const padding = 12;
    if (
      x >= metrics.x - metrics.width / 2 - padding
      && x <= metrics.x + metrics.width / 2 + padding
      && y >= metrics.y - metrics.height / 2 - padding
      && y <= metrics.y + metrics.height / 2 + padding
    ) return machinery;
  }
  return null;
}

function getSubmarineTravelNeighbors(tank) {
  if (!tank) return [];
  const result = [];
  const seen = new Set();
  for (const target of getAllTanks()) {
    if (!target || target.id === tank.id) continue;
    const tubeJourney = getTransitTubeJourney(tank, target);
    if (!tubeJourney) continue;
    result.push({ tank: target, mode: "tube", tubeJourney });
    seen.add(target.id);
  }
  for (const target of getAdjacentAquariumSections(tank)) {
    if (!target || seen.has(target.id)) continue;
    result.push({ tank: target, mode: "edge", tubeJourney: null });
    seen.add(target.id);
  }
  return result;
}

function findSubmarineTravelRoute(sourceTank, destinationTank) {
  if (!sourceTank || !destinationTank || sourceTank.id === destinationTank.id) return null;
  const visited = new Set([sourceTank.id]);
  const queue = getSubmarineTravelNeighbors(sourceTank).map((leg) => ({ tank: leg.tank, firstLeg: leg }));
  for (const entry of queue) visited.add(entry.tank.id);
  while (queue.length) {
    const entry = queue.shift();
    if (entry.tank.id === destinationTank.id) return entry.firstLeg;
    for (const leg of getSubmarineTravelNeighbors(entry.tank)) {
      if (visited.has(leg.tank.id)) continue;
      visited.add(leg.tank.id);
      queue.push({ tank: leg.tank, firstLeg: entry.firstLeg });
    }
  }
  return null;
}

function beginSubmarineTravelLeg(submarine, destinationTank, now = Date.now()) {
  if (!submarine || runtime.pendingMachineryTravel.has(submarine.id)) return false;
  const sourceTank = getSubmarineTank(submarine);
  const firstLeg = findSubmarineTravelRoute(sourceTank, destinationTank);
  if (!sourceTank || !firstLeg?.tank) return false;
  if (firstLeg.mode === "tube" && firstLeg.tubeJourney?.sourceTube && firstLeg.tubeJourney?.targetTube) {
    const points = getTransitTubeTravelPoints(firstLeg.tubeJourney.sourceTube);
    submarine.targetXNorm = points.opening.xNorm;
    submarine.targetYNorm = points.opening.yNorm;
    submarine.targetAt = now + 60 * 1000;
    submarine.idleUntil = 0;
    runtime.pendingMachineryTravel.set(submarine.id, {
      mode: "tube",
      phase: "approach",
      sourceTankId: sourceTank.id,
      destinationTankId: firstLeg.tank.id,
      sourceTubeId: firstLeg.tubeJourney.sourceTube.id,
      targetTubeId: firstLeg.tubeJourney.targetTube.id,
      startedAt: now
    });
    return true;
  }
  const direction = getBoroughTravelEdgeDirection(sourceTank, firstLeg.tank);
  if (direction === "right") submarine.targetXNorm = 1.12;
  else if (direction === "left") submarine.targetXNorm = -0.12;
  else if (direction === "down") submarine.targetYNorm = 1.12;
  else submarine.targetYNorm = -0.12;
  submarine.targetAt = now + 60 * 1000;
  submarine.idleUntil = 0;
  runtime.pendingMachineryTravel.set(submarine.id, {
    mode: "edge",
    phase: "leaving",
    sourceTankId: sourceTank.id,
    destinationTankId: firstLeg.tank.id,
    direction,
    startedAt: now
  });
  return true;
}

function getSubmarineDistanceToPointPx(submarine, xNorm, yNorm) {
  return Math.hypot(
    (Number(submarine?.xNorm) - Number(xNorm)) * TANK_WIDTH,
    (Number(submarine?.yNorm) - Number(yNorm)) * TANK_HEIGHT
  );
}

function processSubmarineTravel(submarine, now = Date.now()) {
  const pending = runtime.pendingMachineryTravel.get(submarine?.id);
  if (!submarine || !pending) return false;
  const source = getTankById(pending.sourceTankId);
  const destination = getTankById(pending.destinationTankId);
  if (!source || !destination) {
    runtime.pendingMachineryTravel.delete(submarine.id);
    return false;
  }
  if (pending.mode === "tube") {
    const sourceTube = source.placedDecor?.find((item) => item.id === pending.sourceTubeId);
    const targetTube = destination.placedDecor?.find((item) => item.id === pending.targetTubeId);
    if (!sourceTube || !targetTube) {
      runtime.pendingMachineryTravel.delete(submarine.id);
      return false;
    }
    if (pending.phase === "approach") {
      const points = getTransitTubeTravelPoints(sourceTube);
      submarine.targetXNorm = points.opening.xNorm;
      submarine.targetYNorm = points.opening.yNorm;
      if (getSubmarineDistanceToPointPx(submarine, points.opening.xNorm, points.opening.yNorm) <= points.openingRadiusPx) {
        pending.phase = "entering";
        submarine.targetXNorm = points.below.xNorm;
        submarine.targetYNorm = points.below.yNorm;
      }
      return true;
    }
    if (pending.phase === "entering") {
      const points = getTransitTubeTravelPoints(sourceTube);
      submarine.targetXNorm = points.below.xNorm;
      submarine.targetYNorm = points.below.yNorm;
      if (getSubmarineDistanceToPointPx(submarine, points.below.xNorm, points.below.yNorm) <= Math.max(26, points.openingRadiusPx * 0.72)) {
        const targetPoints = getTransitTubeTravelPoints(targetTube);
        submarine.tankId = destination.id;
        submarine.xNorm = targetPoints.below.xNorm;
        submarine.yNorm = targetPoints.below.yNorm;
        submarine.targetXNorm = targetPoints.exit.xNorm;
        submarine.targetYNorm = targetPoints.exit.yNorm;
        pending.phase = "emerging";
        requestDeferredStateSave();
      }
      return true;
    }
    const targetPoints = getTransitTubeTravelPoints(targetTube);
    submarine.targetXNorm = targetPoints.exit.xNorm;
    submarine.targetYNorm = targetPoints.exit.yNorm;
    if (getSubmarineDistanceToPointPx(submarine, targetPoints.exit.xNorm, targetPoints.exit.yNorm) <= Math.max(24, targetPoints.openingRadiusPx * 0.62)) {
      runtime.pendingMachineryTravel.delete(submarine.id);
      submarine.targetXNorm = clamp(targetPoints.exit.xNorm + randomBetween(-0.12, 0.12), 0.12, 0.88);
      submarine.targetYNorm = clamp(targetPoints.exit.yNorm + randomBetween(-0.05, 0.08), 0.16, 0.76);
      requestDeferredStateSave();
      return false;
    }
    return true;
  }

  if (pending.phase === "leaving") {
    const reached = pending.direction === "right"
      ? submarine.xNorm >= 1.08
      : pending.direction === "left"
        ? submarine.xNorm <= -0.08
        : pending.direction === "down"
          ? submarine.yNorm >= 1.08
          : submarine.yNorm <= -0.08;
    if (reached) {
      submarine.tankId = destination.id;
      if (pending.direction === "right") {
        submarine.xNorm = -0.2;
        submarine.targetXNorm = 0.22;
      } else if (pending.direction === "left") {
        submarine.xNorm = 1.2;
        submarine.targetXNorm = 0.78;
      } else if (pending.direction === "down") {
        submarine.yNorm = -0.2;
        submarine.targetYNorm = 0.23;
      } else {
        submarine.yNorm = 1.2;
        submarine.targetYNorm = 0.76;
      }
      pending.phase = "arriving";
      requestDeferredStateSave();
    }
    return true;
  }

  const arrived = pending.direction === "right"
    ? submarine.xNorm >= 0.2
    : pending.direction === "left"
      ? submarine.xNorm <= 0.8
      : pending.direction === "down"
        ? submarine.yNorm >= 0.22
        : submarine.yNorm <= 0.78;
  if (arrived) {
    runtime.pendingMachineryTravel.delete(submarine.id);
    submarine.xNorm = clamp(submarine.xNorm, 0.08, 0.92);
    submarine.yNorm = clamp(submarine.yNorm, 0.16, 0.78);
    requestDeferredStateSave();
    return false;
  }
  return true;
}

function hasSubmarineMedicineEffect(tank, effectType, now = Date.now()) {
  if (!tank) return false;
  return Boolean(withActiveTank(tank.id, () => hasActiveTankMedicineEffect(effectType, now)));
}

function getSubmarineFishComfort(tank, fish, now = Date.now()) {
  if (!tank || !fish) return 1;
  return Number(withActiveTank(tank.id, () => getFishComfort(fish, now).value)) || 0;
}

function getSubmarineFishHunger(tank, fish, now = Date.now()) {
  if (!tank || !fish) return 100;
  return Number(withActiveTank(tank.id, () => getFishNeedValue(fish, "hunger", now))) || 0;
}

function isSubmarineCalmingNeed(fish, comfort, now = Date.now()) {
  // A recent food refusal is an active distress signal. Sending another
  // pellet only repeats the failed interaction; settle the tank first.
  return Number(fish?.foodRefusalUntil) > now || comfort <= SUBMARINE_COMFORT_THRESHOLD;
}

function isTankReachableBySubmarine(submarine, tank) {
  const source = getSubmarineTank(submarine);
  return Boolean(source && tank && (source.id === tank.id || findSubmarineTravelRoute(source, tank)));
}

function findSubmarineCareCandidate(submarine, now = Date.now()) {
  if (!submarine) return null;
  const inventory = sanitizeSubmarineInventory(submarine.inventory);
  let best = null;
  for (const tank of getAllTanks()) {
    if (!isTankReachableBySubmarine(submarine, tank)) continue;
    for (const fish of tank.fish || []) {
      if (!fish || isFishDead(fish)) continue;
      const maxHealth = getFishMaxHealthUnits(fish);
      const health = Math.max(0, Number(fish.healthUnits) || 0);
      if (inventory.health > 0 && health < maxHealth && !hasSubmarineMedicineEffect(tank, "firstAid", now)) {
        const score = 400 + (1 - health / Math.max(1, maxHealth)) * 120;
        if (!best || score > best.score) best = { kind: "health", fishId: fish.id, targetTankId: tank.id, score };
      }
      if (inventory.calming > 0 && !hasSubmarineMedicineEffect(tank, "betaBlocker", now)) {
        const comfort = getSubmarineFishComfort(tank, fish, now);
        if (isSubmarineCalmingNeed(fish, comfort, now)) {
          const refusedFood = Number(fish.foodRefusalUntil) > now;
          const score = (refusedFood ? 520 : 200) + (SUBMARINE_COMFORT_THRESHOLD - comfort) * 100;
          if (!best || score > best.score) best = { kind: "calming", fishId: fish.id, targetTankId: tank.id, score };
        }
      }
      const hunger = getSubmarineFishHunger(tank, fish, now);
      if (inventory.food > 0 && hunger <= SUBMARINE_HUNGER_THRESHOLD) {
        const score = 300 + (SUBMARINE_HUNGER_THRESHOLD - hunger);
        if (!best || score > best.score) best = { kind: "food", fishId: fish.id, targetTankId: tank.id, score };
      }
    }
  }
  return best;
}

function startSubmarineMission(submarine, candidate, now = Date.now()) {
  if (!submarine || !candidate) return false;
  submarine.mission = {
    kind: candidate.kind,
    fishId: candidate.fishId,
    targetTankId: candidate.targetTankId,
    startedAt: now,
    nextDeployAt: now,
    pelletId: ""
  };
  submarine.idleUntil = 0;
  submarine.nextScanAt = now + SUBMARINE_SCAN_INTERVAL_MS;
  renderSubmarineManager();
  requestDeferredStateSave();
  return true;
}

function clearSubmarineMission(submarine, now = Date.now()) {
  if (!submarine?.mission) return false;
  submarine.mission = null;
  submarine.nextScanAt = now + 900;
  submarine.idleUntil = now + randomBetween(1200, 2600);
  renderSubmarineManager();
  requestDeferredStateSave();
  return true;
}

function getSubmarineMissionTarget(submarine) {
  const mission = submarine?.mission;
  if (!mission) return null;
  const tank = getTankContainingFish(mission.fishId);
  const fish = tank?.fish?.find((entry) => entry.id === mission.fishId) || null;
  if (!tank || !fish || isFishDead(fish)) return null;
  mission.targetTankId = tank.id;
  return { mission, tank, fish };
}

function isSubmarineMissionResolved(submarine, target, now = Date.now()) {
  if (!submarine?.mission || !target) return true;
  if (submarine.mission.kind === "health") {
    return hasSubmarineMedicineEffect(target.tank, "firstAid", now)
      || Number(target.fish.healthUnits) >= getFishMaxHealthUnits(target.fish);
  }
  if (submarine.mission.kind === "calming") {
    return hasSubmarineMedicineEffect(target.tank, "betaBlocker", now)
      || getSubmarineFishComfort(target.tank, target.fish, now) > SUBMARINE_COMFORT_THRESHOLD;
  }
  return getSubmarineFishHunger(target.tank, target.fish, now) > SUBMARINE_HUNGER_THRESHOLD;
}

function deploySubmarineFood(submarine, target, now = Date.now()) {
  if (!submarine || !target || normalizeSubmarineResourceCount(submarine.inventory?.food) <= 0) return false;
  let pellet = null;
  withActiveTank(target.tank.id, () => {
    const preferredFoodKey = canFoodSatisfyFishMeal(target.fish, "basic") ? "basic" : "chum";
    pellet = createSubmarineDroppedFoodPellet(submarine, preferredFoodKey, now);
    if (!pellet) return;
    state.floatingPellets.push(pellet);
    assignPelletToFish(target.fish, pellet, now);
  });
  if (!pellet) return false;
  submarine.inventory.food = normalizeSubmarineResourceCount(submarine.inventory.food - 1);
  submarine.mission.pelletId = pellet.id;
  submarine.mission.nextDeployAt = now + SUBMARINE_FOOD_RETRY_MS;
  pushEvent(`Automated Care Submarine deployed food for ${target.fish.name}.`, now, target.tank, {
    type: "feeding",
    fishId: target.fish.id,
    detail: "Automated submarine feeding"
  });
  renderSubmarineManager();
  requestDeferredStateSave();
  return true;
}

function deploySubmarineMedicine(submarine, target, medicineKey, resourceType, now = Date.now()) {
  if (!submarine || !target || normalizeSubmarineResourceCount(submarine.inventory?.[resourceType]) <= 0) return false;
  const medicine = getMedicineMeta(medicineKey);
  if (!medicine) return false;
  withActiveTank(target.tank.id, () => {
    state.medicineClouds.push({
      id: createId("med-cloud"),
      color: medicine.color,
      xNorm: clamp(submarine.xNorm, 0.08, 0.92),
      yNorm: clamp(submarine.yNorm, 0.12, 0.78),
      startedAt: now,
      endsAt: now + MEDICINE_CLOUD_DURATION_MS
    });
    state.medicineWaterTint = {
      color: medicine.color,
      startedAt: now,
      endsAt: now + MEDICINE_VISUAL_DURATION_MS
    };
    state.medicineEffects.push({
      id: createId("med-effect"),
      type: medicine.id,
      startedAt: now,
      endsAt: medicine.id === "betaBlocker" ? getNextDayStartTimestamp(now) : now + MEDICINE_HEAL_DURATION_MS,
      nextTickAt: now + MEDICINE_HEAL_INTERVAL_MS,
      resolvedAt: null
    });
  });
  submarine.inventory[resourceType] = normalizeSubmarineResourceCount(submarine.inventory[resourceType] - 1);
  submarine.mission.nextDeployAt = now + SUBMARINE_MEDICINE_RETRY_MS;
  pushEvent(`Automated Care Submarine deployed ${medicine.name} for ${target.fish.name}.`, now, target.tank, {
    type: "care",
    fishId: target.fish.id,
    detail: "Automated submarine medicine"
  });
  if (getCurrentTank()?.id === target.tank.id) playDropSoundEffect();
  renderSubmarineManager();
  requestDeferredStateSave();
  return true;
}

function serviceSubmarineMission(submarine, target, now = Date.now()) {
  if (!submarine?.mission || !target) return false;
  const mission = submarine.mission;
  if (mission.kind === "food") {
    const existingPellet = mission.pelletId
      ? target.tank.floatingPellets?.find((pellet) => pellet.id === mission.pelletId)
      : null;
    if (existingPellet) return true;
    mission.pelletId = "";
    if (now >= (Number(mission.nextDeployAt) || 0) && !deploySubmarineFood(submarine, target, now)) {
      mission.nextDeployAt = now + SUBMARINE_FOOD_RETRY_MS;
    }
    return true;
  }
  if (mission.kind === "health") {
    if (!hasSubmarineMedicineEffect(target.tank, "firstAid", now) && now >= (Number(mission.nextDeployAt) || 0)) {
      deploySubmarineMedicine(submarine, target, "firstAid", "health", now);
    }
    return true;
  }
  if (!hasSubmarineMedicineEffect(target.tank, "betaBlocker", now) && now >= (Number(mission.nextDeployAt) || 0)) {
    deploySubmarineMedicine(submarine, target, "betaBlocker", "calming", now);
  }
  return true;
}

function updateSubmarineMission(submarine, now = Date.now()) {
  if (!submarine) return false;
  if (!submarine.mission) {
    if (now >= (Number(submarine.nextScanAt) || 0)) {
      submarine.nextScanAt = now + SUBMARINE_SCAN_INTERVAL_MS;
      const candidate = findSubmarineCareCandidate(submarine, now);
      if (candidate) return startSubmarineMission(submarine, candidate, now);
    }
    return false;
  }
  const target = getSubmarineMissionTarget(submarine);
  const resource = submarine.mission.kind === "health" ? "health" : submarine.mission.kind === "calming" ? "calming" : "food";
  if (!target || !isTankReachableBySubmarine(submarine, target.tank)
    || normalizeSubmarineResourceCount(submarine.inventory?.[resource]) <= 0) {
    runtime.pendingMachineryTravel.delete(submarine.id);
    submarine.targetXNorm = submarine.xNorm;
    submarine.targetYNorm = submarine.yNorm;
    return clearSubmarineMission(submarine, now);
  }
  if (now >= (Number(submarine.nextScanAt) || 0)) {
    submarine.nextScanAt = now + SUBMARINE_SCAN_INTERVAL_MS;
    const urgent = findSubmarineCareCandidate(submarine, now);
    if (urgent?.kind === "health" && submarine.mission.kind !== "health") {
      runtime.pendingMachineryTravel.delete(submarine.id);
      return startSubmarineMission(submarine, urgent, now);
    }
  }
  if (!target || isSubmarineMissionResolved(submarine, target, now)) {
    return clearSubmarineMission(submarine, now);
  }
  if (runtime.pendingMachineryTravel.has(submarine.id)) return true;
  const currentTank = getSubmarineTank(submarine);
  if (!currentTank || currentTank.id !== target.tank.id) {
    return beginSubmarineTravelLeg(submarine, target.tank, now);
  }

  // Once it reaches the correct tank, care is tank-level. The submarine should
  // not tail or crowd an individual fish. Food is dropped from wherever the
  // submarine currently is and the hungry fish comes to it; medicine already
  // applies to the tank as a whole.
  serviceSubmarineMission(submarine, target, now);
  return true;
}

function updateSubmarineIdleCruise(submarine, now = Date.now()) {
  if (!submarine || submarine.mission || runtime.pendingMachineryTravel.has(submarine.id)) return;
  if (Number(submarine.idleUntil) > now) return;
  const distance = getSubmarineDistanceToPointPx(submarine, submarine.targetXNorm, submarine.targetYNorm);
  if (distance <= 14 || now >= (Number(submarine.targetAt) || 0)) {
    if (Math.random() < 0.48) {
      submarine.idleUntil = now + randomBetween(SUBMARINE_IDLE_MIN_MS, SUBMARINE_IDLE_MAX_MS);
      submarine.targetAt = submarine.idleUntil;
      return;
    }
    submarine.targetXNorm = randomBetween(0.14, 0.86);
    submarine.targetYNorm = randomBetween(0.24, 0.7);
    submarine.targetAt = now + randomBetween(7000, 15000);
  }
}

function moveSubmarineTowardTarget(submarine, deltaSeconds, now = Date.now()) {
  if (!submarine) return;
  submarine.motionVelocityXPxPerSecond = 0;
  submarine.motionVelocityYPxPerSecond = 0;
  if (Number(submarine.idleUntil) > now && !submarine.mission && !runtime.pendingMachineryTravel.has(submarine.id)) return;
  const targetX = Number(submarine.targetXNorm);
  const targetY = Number(submarine.targetYNorm);
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
  const dxPx = (targetX - submarine.xNorm) * TANK_WIDTH;
  const dyPx = (targetY - submarine.yNorm) * TANK_HEIGHT;
  const distancePx = Math.hypot(dxPx, dyPx);
  if (distancePx <= 0.5) return;
  if (Math.abs(dxPx) > 2) setMachineryDirection(submarine, dxPx < 0 ? -1 : 1, now, SUBMARINE_TURN_DURATION_MS);
  const pending = runtime.pendingMachineryTravel.has(submarine.id);
  const speed = pending
    ? SUBMARINE_TRAVEL_SPEED_PX_PER_SECOND
    : SUBMARINE_CRUISE_SPEED_PX_PER_SECOND;
  const dt = Math.max(0, Number(deltaSeconds) || 0);
  const stepPx = Math.min(distancePx, dt * speed);
  if (stepPx <= 0 || dt <= 0) return;
  const moveXPx = (dxPx / distancePx) * stepPx;
  const moveYPx = (dyPx / distancePx) * stepPx;
  submarine.xNorm += moveXPx / TANK_WIDTH;
  submarine.yNorm += moveYPx / TANK_HEIGHT;
  submarine.motionVelocityXPxPerSecond = moveXPx / dt;
  submarine.motionVelocityYPxPerSecond = moveYPx / dt;
}

function updateSubmarineEntry(submarine, now = Date.now()) {
  const entryProgress = getSubmarineEntryProgress(submarine, now);
  if (entryProgress === null) return false;

  submarine.manualVelocityXPxPerSecond = 0;
  submarine.manualVelocityYPxPerSecond = 0;
  submarine.motionVelocityXPxPerSecond = 0;
  submarine.motionVelocityYPxPerSecond = 0;
  clearSubmarineManualDriveKeys();

  const metrics = getSubmarineDrawMetrics(submarine, now);
  const hitWaterline = metrics
    ? metrics.y + metrics.height * 0.5 >= WATER_SURFACE_Y
    : entryProgress >= FISH_ENTRY_SPLASH_PROGRESS;
  if (!submarine.entrySplashTriggered && hitWaterline) {
    playFishEntrySplashSoundIfNeeded(submarine);
    submarine.entrySplashTriggered = true;
    spawnFishReturnSplash(submarine.xNorm);
  }

  if (entryProgress < 1) return true;

  submarine.entryStartedAt = null;
  submarine.entryDurationMs = 0;
  submarine.entryFromYNorm = null;
  submarine.entrySplashTriggered = false;
  submarine.idleUntil = now + 450;
  submarine.targetXNorm = submarine.xNorm;
  submarine.targetYNorm = submarine.yNorm;
  submarine.targetAt = now + 1200;
  submarine.nextScanAt = Math.max(Number(submarine.nextScanAt) || 0, now + 700);
  requestDeferredStateSave();
  return false;
}

function updateBoatIdleCruise(boat, now = Date.now()) {
  if (!boat || runtime.pendingMachineryTravel.has(boat.id)) return;
  if (Number(boat.idleUntil) > now) return;
  const distance = Math.abs((Number(boat.targetXNorm) || boat.xNorm) - (Number(boat.xNorm) || 0.5)) * TANK_WIDTH;
  if (distance <= 14 || now >= (Number(boat.targetAt) || 0)) {
    if (Math.random() < 0.22) {
      boat.idleUntil = now + randomBetween(900, 2200);
      boat.targetAt = boat.idleUntil;
      return;
    }
    boat.targetXNorm = boat.xNorm < 0.5 ? randomBetween(0.72, 0.9) : randomBetween(0.1, 0.28);
    boat.targetYNorm = 0.16;
    boat.targetAt = now + randomBetween(6000, 11000);
  }
}

function moveBoatTowardTarget(boat, deltaSeconds, now = Date.now()) {
  if (!boat) return;
  boat.motionVelocityXPxPerSecond = 0;
  boat.motionVelocityYPxPerSecond = 0;
  if (Number(boat.idleUntil) > now) return;
  const targetX = Number(boat.targetXNorm);
  if (!Number.isFinite(targetX)) return;
  const dxPx = (targetX - boat.xNorm) * TANK_WIDTH;
  if (Math.abs(dxPx) <= 0.5) return;
  setMachineryDirection(boat, dxPx < 0 ? -1 : 1, now, BOAT_TURN_DURATION_MS);
  const dt = Math.max(0, Number(deltaSeconds) || 0);
  const stepPx = Math.min(Math.abs(dxPx), dt * BOAT_CRUISE_SPEED_PX_PER_SECOND);
  if (stepPx <= 0 || dt <= 0) return;
  const moveXPx = Math.sign(dxPx) * stepPx;
  boat.xNorm = clamp(boat.xNorm + moveXPx / TANK_WIDTH, 0.08, 0.92);
  boat.motionVelocityXPxPerSecond = moveXPx / dt;
}

function updateBoatEntry(boat, now = Date.now()) {
  const entryProgress = getBoatEntryProgress(boat, now);
  if (entryProgress === null) return false;

  boat.manualVelocityXPxPerSecond = 0;
  boat.motionVelocityXPxPerSecond = 0;
  clearBoatManualDriveKeys();
  const metrics = getBoatDrawMetrics(boat, now);
  const hitWaterline = metrics
    ? metrics.y + metrics.height * 0.5 >= WATER_SURFACE_Y
    : entryProgress >= FISH_ENTRY_SPLASH_PROGRESS;
  if (!boat.entrySplashTriggered && hitWaterline) {
    playFishEntrySplashSoundIfNeeded(boat);
    boat.entrySplashTriggered = true;
    spawnFishReturnSplash(boat.xNorm);
  }
  if (entryProgress < 1) return true;

  boat.entryStartedAt = null;
  boat.entryDurationMs = 0;
  boat.entryFromYNorm = null;
  boat.entrySplashTriggered = false;
  boat.tankLayer = BOAT_SURFACE_LAYER;
  boat.yNorm = 0.16;
  boat.targetYNorm = 0.16;
  boat.idleUntil = now + 450;
  boat.targetXNorm = boat.xNorm;
  boat.targetAt = now + 1200;
  requestDeferredStateSave();
  return false;
}

function updateMachineryMotion(now = Date.now(), deltaSeconds = 0.016) {
  const submarine = getSubmarine();
  if (submarine) {
    syncMachineryControlStatus(submarine);
    if (!getTankById(submarine.tankId)) submarine.tankId = getAllTanks()[0]?.id || "";
    if (!updateSubmarineEntry(submarine, now)) {
      if (!isSubmarineAutopilotEnabled(submarine)) {
        if (isSubmarineManualDriveActive(submarine)) updateSubmarineManualDrive(submarine, deltaSeconds);
        else suspendSubmarineManualDrive();
      } else {
        clearSubmarineManualDriveKeys();
        processSubmarineTravel(submarine, now);
        updateSubmarineMission(submarine, now);
        updateSubmarineIdleCruise(submarine, now);
        moveSubmarineTowardTarget(submarine, deltaSeconds, now);
      }
    }
  }
  syncSubmarineSonarSound(submarine);

  const boat = getBoat();
  if (!boat) return;
  syncMachineryControlStatus(boat);
  if (!getTankById(boat.tankId)) boat.tankId = getAllTanks()[0]?.id || "";
  boat.tankLayer = BOAT_SURFACE_LAYER;
  if (updateBoatEntry(boat, now)) return;
  if (!isBoatAutopilotEnabled(boat)) {
    if (isBoatManualDriveActive(boat)) updateBoatManualDrive(boat, deltaSeconds);
    else suspendBoatManualDrive();
    return;
  }
  clearBoatManualDriveKeys();
  updateBoatIdleCruise(boat, now);
  moveBoatTowardTarget(boat, deltaSeconds, now);
}
