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
    tankLayer: clampTankLayer(Number.isFinite(Number(options.tankLayer)) ? Number(options.tankLayer) : SUBMARINE_DEFAULT_TANK_LAYER),
    manualVelocityXPxPerSecond: Number.isFinite(Number(options.manualVelocityXPxPerSecond)) ? Number(options.manualVelocityXPxPerSecond) : 0,
    manualVelocityYPxPerSecond: Number.isFinite(Number(options.manualVelocityYPxPerSecond)) ? Number(options.manualVelocityYPxPerSecond) : 0,
    idleUntil: Math.max(0, Number(options.idleUntil) || 0),
    targetAt: Math.max(0, Number(options.targetAt) || now),
    nextScanAt: Math.max(0, Number(options.nextScanAt) || now),
    createdAt: Math.max(0, Number(options.createdAt) || now),
    autopilot: options.autopilot !== false,
    inventory: sanitizeSubmarineInventory(options.inventory),
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
    if (!entry || entry.type !== MACHINERY_TYPE_SUBMARINE || sanitized.some((item) => item.type === MACHINERY_TYPE_SUBMARINE)) {
      continue;
    }
    const tankId = validTankIds.has(entry.tankId) ? entry.tankId : fallbackTankId;
    if (!tankId) {
      continue;
    }
    sanitized.push(createSubmarineMachinery(tankId, now, entry));
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

function isSubmarineOwned() {
  return Boolean(state?.submarineOwned || getSubmarine());
}

function getMachineryForTank(tankId) {
  const id = String(tankId || "");
  return getMachineryList().filter((item) => item?.tankId === id);
}

function getSubmarineTank(submarine = getSubmarine()) {
  return submarine ? getTankById(submarine.tankId) : null;
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

function buySubmarine() {
  if (isSubmarineOwned()) {
    return false;
  }
  return performCoinTransaction({
    amount: SUBMARINE_COST,
    insufficientMessage: `You need ${SUBMARINE_COST} ${pluralize("coin", SUBMARINE_COST)} for the Automated Care Submarine.`,
    apply: () => {
      state.submarineOwned = true;
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
  const existing = getSubmarine();
  if (existing) return moveSubmarineToTank(targetTank, now);
  const submarine = createSubmarineMachinery(targetTank.id, now, {
    xNorm: 0.5,
    yNorm: 0.46,
    targetXNorm: 0.68,
    targetYNorm: 0.44
  });
  state.submarineOwned = true;
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
  runtime.submarineManualDriveId = "";
  runtime.submarineManualDriveStartedAt = 0;
  clearSubmarineManualDriveKeys();
  if (runtime.selectedMachineryId === submarine.id) closeSubmarineManager();
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

function isSubmarineManualDriveActive(submarine = getSubmarine()) {
  return Boolean(
    submarine?.id
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
  );
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
  runtime.submarineManualDriveId = submarine.id;
  runtime.submarineManualDriveKeys.add(normalized);
  return true;
}

function setSubmarineAutopilot(submarine = getSubmarine(), enabled = true, options = {}) {
  if (!submarine || submarine.type !== MACHINERY_TYPE_SUBMARINE) return false;
  const nextEnabled = enabled !== false;
  if (isSubmarineAutopilotEnabled(submarine) === nextEnabled) {
    if (!nextEnabled && isSubmarineManualDriveActive(submarine)) runtime.submarineManualDriveId = submarine.id;
    return false;
  }

  const now = Date.now();
  submarine.autopilot = nextEnabled;
  clearSubmarineManualDriveKeys();

  if (nextEnabled) {
    runtime.submarineManualDriveId = "";
    runtime.submarineManualDriveStartedAt = 0;
    submarine.targetXNorm = submarine.xNorm;
    submarine.targetYNorm = submarine.yNorm;
    submarine.targetAt = now + 500;
    submarine.idleUntil = now + 250;
    submarine.nextScanAt = Math.min(Number(submarine.nextScanAt) || now, now + 350);
    submarine.manualVelocityXPxPerSecond = 0;
    submarine.manualVelocityYPxPerSecond = 0;
  } else {
    runtime.submarineManualDriveId = submarine.id;
    runtime.submarineManualDriveStartedAt = now;
    runtime.pendingMachineryTravel.delete(submarine.id);
    submarine.xNorm = clamp(Number(submarine.xNorm) || 0.5, 0.08, 0.92);
    submarine.yNorm = clamp(Number(submarine.yNorm) || 0.48, 0.16, 0.78);
    submarine.targetXNorm = submarine.xNorm;
    submarine.targetYNorm = submarine.yNorm;
    submarine.targetAt = 0;
    submarine.idleUntil = 0;
    submarine.manualVelocityXPxPerSecond = 0;
    submarine.manualVelocityYPxPerSecond = 0;
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

function deployManualSubmarineFood(submarine = getSubmarine(), now = Date.now()) {
  if (!isSubmarineManualDriveActive(submarine)) return false;
  submarine.inventory = sanitizeSubmarineInventory(submarine.inventory);
  if (submarine.inventory.food <= 0) return true;
  if (now - (Number(runtime.submarineManualLastFoodDeployAt) || 0) < SUBMARINE_MANUAL_FOOD_COOLDOWN_MS) return true;
  const tank = getSubmarineTank(submarine);
  if (!tank) return false;
  let pellet = null;
  withActiveTank(tank.id, () => {
    pellet = createDroppedFoodPellet("basic", submarine.xNorm, submarine.yNorm, now);
    if (pellet) {
      pellet.tankLayer = clampTankLayer(submarine.tankLayer ?? SUBMARINE_DEFAULT_TANK_LAYER);
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

function updateSubmarineManualDrive(submarine, deltaSeconds = 0.016) {
  if (!isSubmarineManualDriveActive(submarine)) return false;

  runtime.submarineManualDriveId = submarine.id;
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
  submarine.targetXNorm = submarine.xNorm;
  submarine.targetYNorm = submarine.yNorm;
  submarine.idleUntil = 0;
  if (Math.abs(input.x) > 0.05) submarine.direction = input.x < 0 ? -1 : 1;
  else if (Math.abs(velocityX) > 8) submarine.direction = velocityX < 0 ? -1 : 1;
  return true;
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
    const autopilotInput = target.closest("[data-submarine-autopilot]");
    if (autopilotInput instanceof HTMLInputElement) {
      setSubmarineAutopilot(getMachineryById(runtime.selectedMachineryId), autopilotInput.checked);
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
    const medicineButton = target.closest("[data-load-submarine-medicine]");
    if (medicineButton) {
      transferMedicineIntoSubmarine(
        medicineButton.dataset.loadSubmarineMedicine,
        getMachineryById(runtime.selectedMachineryId),
        Number(medicineButton.dataset.loadAmount) || SUBMARINE_RESOURCE_CAPACITY
      );
    }
  });
  document.body.appendChild(element);
  return element;
}

function openSubmarineManager(machineryId) {
  const submarine = getMachineryById(machineryId);
  if (!submarine || submarine.type !== MACHINERY_TYPE_SUBMARINE) return false;
  closeFishActionMenu();
  if (runtime.selectedFishId || runtime.selectedFishStatusFishId) closeFishInspector();
  runtime.selectedMachineryId = submarine.id;
  renderSubmarineManager();
  return true;
}

function closeSubmarineManager() {
  runtime.selectedMachineryId = null;
  const element = document.querySelector(".submarine-manager");
  if (element instanceof HTMLElement) element.hidden = true;
}

function renderSubmarineManager() {
  const element = ensureSubmarineManagerElement();
  const submarine = getMachineryById(runtime.selectedMachineryId);
  if (!submarine || submarine.type !== MACHINERY_TYPE_SUBMARINE) {
    element.hidden = true;
    return;
  }
  submarine.inventory = sanitizeSubmarineInventory(submarine.inventory);
  const foodAvailable = getSubmarinePlayerFoodCount();
  const healthAvailable = Math.max(0, Math.floor(Number(state.medicineInventory?.firstAid) || 0));
  const calmingAvailable = Math.max(0, Math.floor(Number(state.medicineInventory?.betaBlocker) || 0));
  const warning = isSubmarineOutOfResources(submarine);
  const autopilotEnabled = isSubmarineAutopilotEnabled(submarine);
  const manualDriveActive = isSubmarineManualDriveActive(submarine);
  const submarineTank = getSubmarineTank(submarine);
  const driveHint = autopilotEnabled
    ? "Automatic care is enabled. The submarine controls itself and responds to fish needs."
    : manualDriveActive
      ? `Manual control active: WASD drives, Q/E changes depth, and Space drops food. Layer ${clampTankLayer(submarine.tankLayer ?? SUBMARINE_DEFAULT_TANK_LAYER)} of ${TANK_DEPTH_LAYERS}.`
      : `Manual control is enabled. Go to ${escapeHtml(getTankLabel(submarineTank))} to drive with WASD, change depth with Q/E, and drop food with Space.`;
  element.innerHTML = `
    <div class="submarine-manager-header">
      <div class="submarine-manager-title">
        <img src="${escapeHtml(SUBMARINE_IMAGE_PATH)}" alt="" onerror="this.src='assets/icons/tools.png'" />
        <div><strong>Automated Care Submarine</strong><span>${escapeHtml(autopilotEnabled ? getSubmarineMissionLabel(submarine) : "Manual control")}</span></div>
      </div>
      <div class="submarine-manager-actions">
        <button class="small-button alt" type="button" data-close-submarine-manager aria-label="Close submarine controls">Close</button>
      </div>
    </div>
    <label class="submarine-autopilot-toggle">
      <input type="checkbox" data-submarine-autopilot ${autopilotEnabled ? "checked" : ""} />
      <span><strong>Autopilot</strong><small>${autopilotEnabled ? "ON" : "OFF"}</small></span>
    </label>
    <div class="submarine-manager-warning ${warning ? "is-warning" : ""}">${warning ? "Supply warning: one or more resources are empty." : "All automatic-care supplies stocked."}</div>
    <div class="submarine-resource-list">
      <div class="submarine-resource-row">
        <div><strong>Food <small>${foodAvailable} available</small></strong><span>${submarine.inventory.food}/${SUBMARINE_RESOURCE_CAPACITY}</span></div>
        <div class="submarine-resource-meter"><i style="width:${(submarine.inventory.food / SUBMARINE_RESOURCE_CAPACITY * 100).toFixed(1)}%"></i></div>
        <div class="submarine-load-buttons" aria-label="Load food, ${foodAvailable} available">
          <button class="small-button" type="button" data-load-submarine-food="1" ${foodAvailable <= 0 || submarine.inventory.food >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+1</button>
          <button class="small-button" type="button" data-load-submarine-food="10" ${foodAvailable <= 0 || submarine.inventory.food >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+10</button>
          <button class="small-button" type="button" data-load-submarine-food="99" ${foodAvailable <= 0 || submarine.inventory.food >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>Fill</button>
        </div>
      </div>
      <div class="submarine-resource-row">
        <div><strong>Health Drops <small>${healthAvailable} available</small></strong><span>${submarine.inventory.health}/${SUBMARINE_RESOURCE_CAPACITY}</span></div>
        <div class="submarine-resource-meter"><i style="width:${(submarine.inventory.health / SUBMARINE_RESOURCE_CAPACITY * 100).toFixed(1)}%"></i></div>
        <div class="submarine-load-buttons" aria-label="Load health drops, ${healthAvailable} available">
          <button class="small-button" type="button" data-load-submarine-medicine="health" data-load-amount="1" ${healthAvailable <= 0 || submarine.inventory.health >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+1</button>
          <button class="small-button" type="button" data-load-submarine-medicine="health" data-load-amount="10" ${healthAvailable <= 0 || submarine.inventory.health >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+10</button>
          <button class="small-button" type="button" data-load-submarine-medicine="health" data-load-amount="99" ${healthAvailable <= 0 || submarine.inventory.health >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>Fill</button>
        </div>
      </div>
      <div class="submarine-resource-row">
        <div><strong>Calming Drops <small>${calmingAvailable} available</small></strong><span>${submarine.inventory.calming}/${SUBMARINE_RESOURCE_CAPACITY}</span></div>
        <div class="submarine-resource-meter"><i style="width:${(submarine.inventory.calming / SUBMARINE_RESOURCE_CAPACITY * 100).toFixed(1)}%"></i></div>
        <div class="submarine-load-buttons" aria-label="Load calming drops, ${calmingAvailable} available">
          <button class="small-button" type="button" data-load-submarine-medicine="calming" data-load-amount="1" ${calmingAvailable <= 0 || submarine.inventory.calming >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+1</button>
          <button class="small-button" type="button" data-load-submarine-medicine="calming" data-load-amount="10" ${calmingAvailable <= 0 || submarine.inventory.calming >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>+10</button>
          <button class="small-button" type="button" data-load-submarine-medicine="calming" data-load-amount="99" ${calmingAvailable <= 0 || submarine.inventory.calming >= SUBMARINE_RESOURCE_CAPACITY ? "disabled" : ""}>Fill</button>
        </div>
      </div>
    </div>
    <div class="mini-note submarine-manager-note">${driveHint} Food is stored as universal care rations.</div>
  `;
  element.hidden = false;
}

function renderSubmarineShopCard() {
  const submarine = getSubmarine();
  const owned = isSubmarineOwned();
  const affordable = state.coins >= SUBMARINE_COST;
  const status = !owned
    ? "Available"
    : submarine
      ? `Sold out | Yours is deployed in ${getTankLabel(getSubmarineTank(submarine))}`
      : "Sold out | Yours is in equipment storage";
  return `
    <article class="shop-card submarine-shop-card ${owned ? "is-sold-out" : ""}">
      <img class="shop-thumb submarine-shop-thumb" src="${escapeHtml(SUBMARINE_IMAGE_PATH)}" alt="Automated Care Submarine" onerror="this.src='assets/icons/tools.png'" />
      <div class="shop-meta shop-card-main">
        <div>
          <strong>Automated Care Submarine</strong>
          <div class="fish-meta">${escapeHtml(status)}</div>
        </div>
        <div class="fish-meta">Automatic care machinery that travels between connected tanks to feed hungry fish and deploy health or calming medicine when needed.</div>
        <div class="mini-note">Carries 99 food, 99 health drops, and 99 calming drops. Only one submarine can be purchased.</div>
      </div>
      <div class="shop-meta shop-card-actions">
        <span class="price-tag">${SUBMARINE_COST} ${pluralize("coin", SUBMARINE_COST)}</span>
        <div class="shop-button-row">
          <button class="buy-button" data-buy-submarine="true" ${owned || !affordable ? "disabled" : ""}>${owned ? "Sold Out" : "Buy Submarine"}</button>
        </div>
      </div>
    </article>
  `;
}

function renderEditEquipmentTray() {
  const visible = runtime.equipmentEditMode === true;
  if (dom.editEquipmentTray) dom.editEquipmentTray.hidden = !visible;
  syncTankTrayStageClass();
  if (!visible || !dom.editEquipmentTray || !dom.editEquipmentTrayScroller) return;

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
  const owned = isSubmarineOwned();
  const currentTank = getCurrentTank();
  const submarineTank = getSubmarineTank(submarine);
  const deployedHere = Boolean(submarine && currentTank && submarine.tankId === currentTank.id);
  const stored = Boolean(owned && !submarine);
  const shouldShowTile = activeLocationTab === "storage" ? stored : deployedHere;

  let markup = "";
  if (shouldShowTile) {
    const food = submarine ? normalizeSubmarineResourceCount(submarine.inventory?.food) : 0;
    const health = submarine ? normalizeSubmarineResourceCount(submarine.inventory?.health) : 0;
    const calming = submarine ? normalizeSubmarineResourceCount(submarine.inventory?.calming) : 0;
    const actionLabel = stored
      ? "Place Automated Care Submarine in this tank"
      : "Manage Automated Care Submarine";
    markup = `
      <article class="edit-decor-tile" data-decor-name="Automated Care Submarine">
        <button
          class="edit-decor-tile-primary"
          type="button"
          ${stored ? "data-tray-place-submarine=\"true\"" : `data-tray-select-submarine="${escapeHtml(submarine.id)}"`}
          title="${actionLabel}"
          aria-label="${actionLabel}"
        >
          <span class="edit-decor-tile-surface">
            <img class="edit-decor-tile-thumb" src="${escapeHtml(SUBMARINE_IMAGE_PATH)}" alt="Automated Care Submarine" onerror="this.src='assets/icons/tools.png'" />
            <span class="inventory-tray-label">${stored ? "Storage" : "In Tank"}</span>
          </span>
        </button>
        ${submarine ? `<div class="mini-note edit-equipment-resource-note">Food ${food}/99 | Health ${health}/99 | Calm ${calming}/99</div>` : ""}
      </article>
    `;
  } else if (!owned) {
    markup = `<div class="edit-decor-tray-empty">No equipment owned. Buy the Automated Care Submarine in Tankazon &gt; Equipment.</div>`;
  } else if (submarine && !deployedHere) {
    const otherTankLabel = getTankLabel(submarineTank);
    markup = `<div class="edit-decor-tray-empty">Your submarine is deployed in ${escapeHtml(otherTankLabel)}. Visit that tank and scoop it into storage before placing it here.</div>`;
  } else {
    markup = `<div class="edit-decor-tray-empty">${activeLocationTab === "tank" ? "No equipment is deployed in this tank." : "Equipment storage is empty."}</div>`;
  }

  const dataKey = [
    activeLocationTab,
    owned ? "owned" : "not-owned",
    submarine?.id || "",
    submarine?.tankId || "",
    submarine ? normalizeSubmarineResourceCount(submarine.inventory?.food) : 0,
    submarine ? normalizeSubmarineResourceCount(submarine.inventory?.health) : 0,
    submarine ? normalizeSubmarineResourceCount(submarine.inventory?.calming) : 0,
    currentTank?.id || ""
  ].join("|");
  if (shouldRebuildRenderSection("edit-equipment-tray-data", dataKey)) {
    setMarkupIfChanged("edit-equipment-tray", dom.editEquipmentTrayScroller, markup);
  }
}

function getSubmarineDrawMetrics(submarine, now = Date.now()) {
  if (!submarine) return null;
  const image = runtime.images.get(SUBMARINE_IMAGE_PATH) || null;
  if (!isUsableRuntimeImage(image)) {
    requestRuntimeImageRecovery(SUBMARINE_IMAGE_PATH, { kind: "machinery", id: MACHINERY_TYPE_SUBMARINE });
  }
  const naturalWidth = Math.max(1, Number(image?.naturalWidth || image?.width) || 3);
  const naturalHeight = Math.max(1, Number(image?.naturalHeight || image?.height) || 1);
  const tankLayer = clampTankLayer(submarine.tankLayer ?? SUBMARINE_DEFAULT_TANK_LAYER);
  const depthScale = clamp(1 + (SUBMARINE_DEFAULT_TANK_LAYER - tankLayer) * 0.04, 0.86, 1.08);
  const width = SUBMARINE_DRAW_WIDTH_PX * depthScale;
  const height = clamp(width * (naturalHeight / naturalWidth), 50, 124);
  const velocityX = Number(submarine.manualVelocityXPxPerSecond) || 0;
  const velocityY = Number(submarine.manualVelocityYPxPerSecond) || 0;
  const speedRatio = clamp(Math.hypot(velocityX, velocityY) / SUBMARINE_MANUAL_SPEED_PX_PER_SECOND, 0, 1);
  const phase = (hashStringToUint32(String(submarine.id || "submarine")) % 1000) / 1000 * Math.PI * 2;
  const bobAmplitude = SUBMARINE_IDLE_BOB_AMPLITUDE_PX * (1 - speedRatio * 0.68) * depthScale;
  const bob = Math.sin(now / SUBMARINE_IDLE_BOB_PERIOD_MS * Math.PI * 2 + phase) * bobAmplitude;
  const idleRock = Math.sin(now / (SUBMARINE_IDLE_BOB_PERIOD_MS * 1.35) * Math.PI * 2 + phase * 0.7) * (Math.PI / 180) * 0.75 * (1 - speedRatio * 0.72);
  const verticalTilt = clamp(velocityY / Math.max(1, SUBMARINE_MANUAL_SPEED_PX_PER_SECOND), -1, 1) * (Math.PI / 180) * 2.2;
  return {
    image,
    x: Number(submarine.xNorm) * TANK_WIDTH,
    y: Number(submarine.yNorm) * TANK_HEIGHT + bob,
    width,
    height,
    direction: Number(submarine.direction) < 0 ? -1 : 1,
    tankLayer,
    rotation: idleRock + verticalTilt
  };
}

function drawSubmarineSpotlight(submarine, metrics) {
  if (!submarine?.mission || !metrics || !isSubmarineAutopilotEnabled(submarine)) return;
  const direction = metrics.direction;
  const noseX = metrics.x + direction * metrics.width * 0.47;
  const noseY = metrics.y + metrics.height * 0.05;
  const endX = noseX + direction * SUBMARINE_SPOTLIGHT_LENGTH_PX;
  const spread = 105;
  tankContext.save();
  tankContext.globalCompositeOperation = "screen";
  const gradient = tankContext.createLinearGradient(noseX, noseY, endX, noseY);
  gradient.addColorStop(0, "rgba(210,244,255,0.25)");
  gradient.addColorStop(0.38, "rgba(176,226,255,0.13)");
  gradient.addColorStop(1, "rgba(160,220,255,0)");
  tankContext.fillStyle = gradient;
  tankContext.beginPath();
  tankContext.moveTo(noseX, noseY - 10);
  tankContext.lineTo(endX, noseY - spread);
  tankContext.lineTo(endX, noseY + spread);
  tankContext.lineTo(noseX, noseY + 10);
  tankContext.closePath();
  tankContext.fill();
  tankContext.restore();
}

function drawSubmarineWarningLight(submarine, metrics, now = Date.now()) {
  if (!isSubmarineOutOfResources(submarine) || !metrics) return;
  const blinkOn = Math.floor(now / SUBMARINE_RED_LIGHT_BLINK_MS) % 2 === 0;
  if (!blinkOn) return;
  const direction = metrics.direction;
  const lightX = metrics.x - direction * metrics.width * 0.06;
  const lightY = metrics.y - metrics.height * 0.48;
  tankContext.save();
  tankContext.globalCompositeOperation = "screen";
  const glow = tankContext.createRadialGradient(lightX, lightY, 1, lightX, lightY, 22);
  glow.addColorStop(0, "rgba(255,245,245,1)");
  glow.addColorStop(0.2, "rgba(255,70,70,0.95)");
  glow.addColorStop(1, "rgba(255,0,0,0)");
  tankContext.fillStyle = glow;
  tankContext.beginPath();
  tankContext.arc(lightX, lightY, 22, 0, Math.PI * 2);
  tankContext.fill();
  tankContext.fillStyle = "rgba(255,45,45,0.98)";
  tankContext.beginPath();
  tankContext.arc(lightX, lightY, 5.5, 0, Math.PI * 2);
  tankContext.fill();
  tankContext.restore();
}

function drawSubmarineBubbleJets(submarine, metrics, now = Date.now()) {
  if (!submarine || !metrics || !isSubmarineManualDriveActive(submarine)) return;
  const input = getSubmarineManualInputVector();
  const horizontalThrust = Math.abs(input.x);
  const verticalThrust = Math.abs(input.y);
  if (horizontalThrust <= 0.001 && verticalThrust <= 0.001) return;

  const velocityX = Math.abs(Number(submarine.manualVelocityXPxPerSecond) || 0);
  const velocityY = Math.abs(Number(submarine.manualVelocityYPxPerSecond) || 0);
  const horizontalSpeedRatio = clamp(velocityX / SUBMARINE_MANUAL_SPEED_PX_PER_SECOND, 0, 1);
  const verticalSpeedRatio = clamp(velocityY / Math.max(1, SUBMARINE_MANUAL_SPEED_PX_PER_SECOND * SUBMARINE_MANUAL_VERTICAL_SPEED_SCALE), 0, 1);
  const item = {
    id: `${submarine.id}-thruster`,
    decorKey: "submarine-thruster",
    xNorm: submarine.xNorm,
    yNorm: submarine.yNorm,
    scale: 1,
    flipped: metrics.direction < 0,
    flippedY: false
  };
  const spouts = [];

  if (horizontalThrust > 0.001) {
    const rearDirection = metrics.direction > 0 ? "left" : "right";
    spouts.push({
      horizontalLocation: 0.055,
      horizontalOffsetPx: null,
      intensity: clamp(10 + horizontalSpeedRatio * 13, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY),
      spread: 13 + horizontalSpeedRatio * 12,
      fadeDistance: 92 + horizontalSpeedRatio * 74,
      bubbleColor: DEFAULT_BUBBLER_BUBBLE_COLOR,
      bubbleColors: [DEFAULT_BUBBLER_BUBBLE_COLOR],
      bubbleColorize: false,
      bubbleSize: 0.8 + horizontalSpeedRatio * 0.32,
      bubbleOpacity: clamp(DEFAULT_BUBBLER_BUBBLE_OPACITY * 1.06, MIN_CUSTOM_BUBBLER_OPACITY, MAX_CUSTOM_BUBBLER_OPACITY),
      bubbleFillTintEnabled: DEFAULT_BUBBLER_FILL_TINT_ENABLED,
      bubbleFillOpacity: DEFAULT_BUBBLER_FILL_OPACITY,
      bubblePopEnabled: false,
      bubbleMalformed: DEFAULT_BUBBLER_MALFORMED_ENABLED,
      bubbleMalformedIntensity: DEFAULT_BUBBLER_MALFORMED_INTENSITY,
      bubbleMalformedSpeed: DEFAULT_BUBBLER_MALFORMED_SPEED,
      speed: clamp(2.15 + horizontalSpeedRatio * 1.35, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED),
      direction: rearDirection
    });
  }

  if (verticalThrust > 0.001) {
    spouts.push({
      horizontalLocation: 0.5,
      horizontalOffsetPx: null,
      intensity: clamp(3.8 + verticalSpeedRatio * 5.8, MIN_CUSTOM_BUBBLER_AMOUNT, MAX_BUBBLER_INTENSITY),
      spread: 18 + verticalSpeedRatio * 9,
      fadeDistance: 70 + verticalSpeedRatio * 48,
      bubbleColor: DEFAULT_BUBBLER_BUBBLE_COLOR,
      bubbleColors: [DEFAULT_BUBBLER_BUBBLE_COLOR],
      bubbleColorize: false,
      bubbleSize: 0.64 + verticalSpeedRatio * 0.2,
      bubbleOpacity: clamp(DEFAULT_BUBBLER_BUBBLE_OPACITY * 0.86, MIN_CUSTOM_BUBBLER_OPACITY, MAX_CUSTOM_BUBBLER_OPACITY),
      bubbleFillTintEnabled: DEFAULT_BUBBLER_FILL_TINT_ENABLED,
      bubbleFillOpacity: DEFAULT_BUBBLER_FILL_OPACITY,
      bubblePopEnabled: false,
      bubbleMalformed: DEFAULT_BUBBLER_MALFORMED_ENABLED,
      bubbleMalformedIntensity: DEFAULT_BUBBLER_MALFORMED_INTENSITY,
      bubbleMalformedSpeed: DEFAULT_BUBBLER_MALFORMED_SPEED,
      speed: clamp(0.78 + verticalSpeedRatio * 0.62, MIN_BUBBLER_SPEED, MAX_BUBBLER_SPEED),
      direction: "up"
    });
  }

  if (!spouts.length) return;
  const decor = {
    path: SUBMARINE_IMAGE_PATH,
    bubbler: { spoutQty: spouts.length, spouts }
  };
  drawDecorBubblerEffectToContext(tankContext, item, decor, metrics.image, now, {
    width: metrics.width,
    height: metrics.height,
    drawX: metrics.x - metrics.width / 2,
    drawY: metrics.y - metrics.height / 2,
    alphaScale: 1,
    stableScale: getViewportStableAssetScale(),
    waterSurfaceY: WATER_SURFACE_Y
  });
}

function drawMachinery(now, layer = 2) {
  const tank = getCurrentTank();
  if (!tank) return;
  for (const submarine of getMachineryForTank(tank.id)) {
    if (submarine.type !== MACHINERY_TYPE_SUBMARINE) continue;
    const metrics = getSubmarineDrawMetrics(submarine, now);
    if (!metrics || metrics.tankLayer !== layer) continue;
    drawSubmarineSpotlight(submarine, metrics);
    drawSubmarineBubbleJets(submarine, metrics, now);
    tankContext.save();
    tankContext.translate(metrics.x, metrics.y);
    tankContext.rotate(metrics.rotation || 0);
    tankContext.scale(metrics.direction, 1);
    if (isUsableRuntimeImage(metrics.image)) {
      tankContext.drawImage(metrics.image, -metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height);
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
    drawSubmarineWarningLight(submarine, metrics, now);
    if (runtime.selectedMachineryId === submarine.id) {
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
    if (machinery.type !== MACHINERY_TYPE_SUBMARINE) continue;
    const metrics = getSubmarineDrawMetrics(machinery, now);
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
      if (inventory.health > 0 && health < maxHealth) {
        const score = 400 + (1 - health / Math.max(1, maxHealth)) * 120;
        if (!best || score > best.score) best = { kind: "health", fishId: fish.id, targetTankId: tank.id, score };
      }
      const hunger = getSubmarineFishHunger(tank, fish, now);
      if (inventory.food > 0 && hunger <= SUBMARINE_HUNGER_THRESHOLD) {
        const score = 300 + (SUBMARINE_HUNGER_THRESHOLD - hunger);
        if (!best || score > best.score) best = { kind: "food", fishId: fish.id, targetTankId: tank.id, score };
      }
      if (inventory.calming > 0 && !hasSubmarineMedicineEffect(tank, "betaBlocker", now)) {
        const comfort = getSubmarineFishComfort(tank, fish, now);
        if (comfort <= SUBMARINE_COMFORT_THRESHOLD) {
          const score = 200 + (SUBMARINE_COMFORT_THRESHOLD - comfort) * 100;
          if (!best || score > best.score) best = { kind: "calming", fishId: fish.id, targetTankId: tank.id, score };
        }
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
    return Number(target.fish.healthUnits) >= getFishMaxHealthUnits(target.fish);
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
    pellet = createDroppedFoodPellet(preferredFoodKey, submarine.xNorm, submarine.yNorm, now);
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
    if (now >= (Number(mission.nextDeployAt) || 0)) deploySubmarineFood(submarine, target, now);
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
  if (!submarine || (Number(submarine.idleUntil) > now && !submarine.mission && !runtime.pendingMachineryTravel.has(submarine.id))) return;
  const targetX = Number(submarine.targetXNorm);
  const targetY = Number(submarine.targetYNorm);
  if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;
  const dxPx = (targetX - submarine.xNorm) * TANK_WIDTH;
  const dyPx = (targetY - submarine.yNorm) * TANK_HEIGHT;
  const distancePx = Math.hypot(dxPx, dyPx);
  if (distancePx <= 0.5) return;
  if (Math.abs(dxPx) > 2) submarine.direction = dxPx < 0 ? -1 : 1;
  const pending = runtime.pendingMachineryTravel.has(submarine.id);
  const speed = pending
    ? SUBMARINE_TRAVEL_SPEED_PX_PER_SECOND
    : SUBMARINE_CRUISE_SPEED_PX_PER_SECOND;
  const stepPx = Math.min(distancePx, Math.max(0, Number(deltaSeconds) || 0) * speed);
  submarine.xNorm += (dxPx / distancePx) * stepPx / TANK_WIDTH;
  submarine.yNorm += (dyPx / distancePx) * stepPx / TANK_HEIGHT;
}

function updateMachineryMotion(now = Date.now(), deltaSeconds = 0.016) {
  const submarine = getSubmarine();
  if (!submarine) return;
  submarine.inventory = sanitizeSubmarineInventory(submarine.inventory);
  if (!getTankById(submarine.tankId)) submarine.tankId = getAllTanks()[0]?.id || "";
  if (!isSubmarineAutopilotEnabled(submarine)) {
    if (isSubmarineManualDriveActive(submarine)) updateSubmarineManualDrive(submarine, deltaSeconds);
    return;
  }
  runtime.submarineManualDriveId = "";
  clearSubmarineManualDriveKeys();
  processSubmarineTravel(submarine, now);
  updateSubmarineMission(submarine, now);
  updateSubmarineIdleCruise(submarine, now);
  moveSubmarineTowardTarget(submarine, deltaSeconds, now);
}
