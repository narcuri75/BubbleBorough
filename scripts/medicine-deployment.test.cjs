"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..", "game");
const NOW = 1800000000000;
const DAY = 86400000;
const read = file => fs.readFileSync(path.join(root, "public/app-src", file), "utf8");

function loadFunctions(c, file, names) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  for (const node of source.statements) if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(source), c);
}

function fixture() {
  let id = 0;
  const nova = { id: "nova", name: "Nova", healthUnits: 2, diseaseState: "none", treatmentCourses: {}, careKnowledge: {} };
  const tank = { id: "tank", name: "Neighborhood 1", fish: [nova] };
  const medicines = JSON.parse(fs.readFileSync(path.join(root, "assets/foodandmeds/food-and-meds.json"), "utf8")).medicine;
  const c = vm.createContext({
    Date: class extends Date { static now() { return NOW; } }, Math, Set, Map,
    DAY_MS: DAY, DISEASE_RECOVERY_REQUIRED_MS: DAY, DISEASE_LOW_CLEANLINESS_THRESHOLD: 50, DISEASE_LOW_COMFORT_THRESHOLD: .4,
    DISEASE_STATE_NONE: "none", DISEASE_STATE_RECOVERING: "recovering", FISH_HEALTH_MAX_HEARTS: 8,
    MEDICINE_CLOUD_DURATION_MS: 8000, MEDICINE_VISUAL_DURATION_MS: 60000, CALMING_EFFECT_DURATION_MS: 600000,
    TANK_WIDTH: 1000, TANK_HEIGHT: 600,
    nova, tank, runtime: {},
    state: { fish: [nova], medicineInventory: { firstAid: 3, infectionTreatment: 5 }, medicineClouds: [], medicineEffects: [] },
    toasts: [], drops: 0, saves: 0, dragAttempts: 0,
    clamp: (v, min, max) => Math.min(max, Math.max(min, v)), createId: prefix => `${prefix}-${++id}`,
    getMedicineMeta: key => medicines[key], shouldShowMedicineInStore: () => true,
    getFishMaxHealthUnits: () => 8, isFishDead: fish => fish.dead === true,
    isPeacefulModeEnabled: () => false, isFishWaterTypeMismatch: fish => fish.wrongWater === true,
    hasActiveFishDisease: () => false, normalizeFishDiseaseType: type => type,
    formatFishConditionLabel: value => value === "injured" ? "Injured" : value,
    getDiseaseTankCleanliness: () => 100, getFishComfort: () => ({ value: 1 }),
    syncFishPrimaryCondition() {}, pushEvent() {}, renderUi() {}, renderToolCursor() {},
    clearGuidanceForModeChange() {}, closeSubmarineManager() {}, closeEditEquipmentTrayContextMenu() {}, suspendSubmarineManualDrive() {}, resetScrubWipeSoundState() {}, resetStageRenderViewAfterToolClose() {},
    shouldCaptureTankDesktopInput: () => true, isTankMouseInputLocked: () => false, isTankOverlayTarget: () => false,
    clearGlassTapGesture() {}, beginGlassTapGesture() {}, consumePendingGlassTapClick: () => false,
    getTankPoint: event => event.point, findMachineryAtPoint: () => null, findFishEggAtPoint: () => null,
    handleAutoDispenserInteractionAtPoint: () => false,
    placeDecorAtPoint() {},
    dom: { tankStage: { setPointerCapture() {} } },
    findFishAtPoint: () => nova
  });
  c.getCurrentTank = () => tank;
  c.getLivingTankFish = () => tank.fish.filter(fish => !fish.dead);
  c.getTankLabel = entry => entry.name;
  c.showToast = message => c.toasts.push(message);
  c.playDropSoundEffect = () => c.drops++;
  c.saveState = () => c.saves++;
  c.beginFishDrag = () => { c.dragAttempts++; c.runtime.pendingFishDrag = { fishId: nova.id }; };
  vm.runInContext(read("fish/care-and-vet.js"), c);
  vm.runInContext(read("fish/feeding-and-medicine.js"), c);
  loadFunctions(c, "store/purchases.js", ["selectMedicineMode"]);
  loadFunctions(c, "ui/tool-modes-and-debug-panels.js", ["clearPrimaryToolModes"]);
  const parsed = ts.createSourceFile("input.js", read("assets/custom-content.js"), ts.ScriptTarget.Latest, true);
  const handlers = {};
  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === "dom.tankStage.addEventListener" && ["pointerdown", "click"].includes(node.arguments[0]?.text)) handlers[node.arguments[0].text] = vm.runInContext(`(${node.arguments[1].getText(parsed)})`, c);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return { c, handlers };
}

const event = () => ({ target: {}, point: { x: 100, y: 200 }, pointerId: 1, preventDefault() {} });

test("First Aid selected from the editor can deploy one dose and create its healing course", () => {
  const { c, handlers } = fixture();
  c.runtime.editTankMode = true;
  c.runtime.placementMode = { decorKey: "rock" };
  c.runtime.suppressNextTankClick = true;
  c.selectMedicineMode("firstAid");
  assert.equal(c.runtime.editTankMode, false);
  assert.equal(c.runtime.placementMode, null);
  handlers.pointerdown(event());
  handlers.click(event());
  assert.equal(c.state.medicineInventory.firstAid, 2);
  assert.equal(c.nova.treatmentCourses.injury.dosesGiven, 1);
  assert.equal(c.state.medicineClouds.length, 1);
  assert.equal(c.drops, 1);
  assert.match(c.toasts.at(-1), /Nova: dose 1 of 3 given/);
});

test("medicine targets the fish pressed even if it swims away before the click", () => {
  const { c, handlers } = fixture();
  c.selectMedicineMode("firstAid");
  handlers.pointerdown(event());
  assert.equal(c.dragAttempts, 0, "medicating must not start dragging a fish");
  c.findFishAtPoint = () => null;
  handlers.click(event());
  assert.equal(c.state.medicineInventory.firstAid, 2);
  assert.equal(c.nova.treatmentCourses.injury.dosesGiven, 1);
});

test("an extra same-day First Aid click reports the wait without spending another drop", () => {
  const { c, handlers } = fixture();
  c.selectMedicineMode("firstAid");
  handlers.pointerdown(event()); handlers.click(event());
  handlers.pointerdown(event()); handlers.click(event());
  assert.equal(c.state.medicineInventory.firstAid, 2);
  assert.equal(c.drops, 1);
  assert.match(c.toasts.at(-1), /Today's dose is already given/);
});

test("a mistargeted or wrong medicine dose stays in inventory and explains why", () => {
  const { c, handlers } = fixture();
  c.selectMedicineMode("infectionTreatment");
  handlers.pointerdown(event()); handlers.click(event());
  assert.equal(c.state.medicineInventory.infectionTreatment, 5);
  assert.match(c.toasts.at(-1), /does not treat Injured/);
  c.selectMedicineMode("firstAid");
  c.findFishAtPoint = () => null;
  handlers.pointerdown(event()); handlers.click(event());
  assert.equal(c.state.medicineInventory.firstAid, 3);
  assert.match(c.toasts.at(-1), /Click a fish to treat/);
});

test("medicine reaches its fish instead of opening an overlapping dispenser", () => {
  const { c, handlers } = fixture();
  c.handleAutoDispenserInteractionAtPoint = () => true;
  c.selectMedicineMode("firstAid");
  handlers.pointerdown(event()); handlers.click(event());
  assert.equal(c.state.medicineInventory.firstAid, 2);
  assert.equal(c.nova.treatmentCourses.injury.dosesGiven, 1);
});

test("a fish removed between press and click cannot redirect the dose to a different fish", () => {
  const { c, handlers } = fixture();
  c.selectMedicineMode("firstAid");
  handlers.pointerdown(event());
  c.state.fish = [{ ...c.nova, id: "other" }];
  c.findFishAtPoint = () => c.state.fish[0];
  handlers.click(event());
  assert.equal(c.state.medicineInventory.firstAid, 3);
  assert.equal(c.state.medicineClouds.length, 0);
});

test("selecting medicine closes the inventory overlay while retaining the selected drop", () => {
  const { c } = fixture();
  c.runtime.utilityOverlayOpen = true;
  c.closeUtilityOverlayState = () => { c.runtime.utilityOverlayOpen = false; };
  c.selectMedicineMode("firstAid");
  assert.equal(c.runtime.utilityOverlayOpen, false);
  assert.equal(c.runtime.medicineModeKey, "firstAid");
  assert.equal(c.runtime.medicineTrayOpen, true);
  c.selectMedicineMode("firstAid");
  assert.equal(c.runtime.medicineModeKey, "");
});

test("Calming Serum still deploys to the tank without hitting a fish", () => {
  const { c, handlers } = fixture();
  c.state.medicineInventory.betaBlocker = 3;
  c.findFishAtPoint = () => null;
  c.selectMedicineMode("betaBlocker");
  handlers.pointerdown(event()); handlers.click(event());
  assert.equal(c.state.medicineInventory.betaBlocker, 2);
  assert.equal(c.nova.calmedUntil, NOW + 600000);
  assert.equal(c.drops, 1);
});
