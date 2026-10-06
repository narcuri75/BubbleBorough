"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.join(__dirname, "..", "game");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
function functions(file, names) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  const found = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(found.length, names.length);
  return found.map(node => node.getText(source)).join("\n");
}
const DAY = 86400000;
const START = 1800000000000;
function fixture() {
  let id = 0;
  const tank = { id: "tank-a", name: "Test tank", fish: [] };
  const context = vm.createContext({
    Date, Math, Set, Map, URL, DAY_MS: DAY, DISEASE_RECOVERY_REQUIRED_MS: DAY, WATER_STRESS_RECOVERY_REQUIRED_MS: DAY,
    FISH_HEALTH_MAX_HEARTS: 8, DISEASE_LOW_CLEANLINESS_THRESHOLD: 50, DISEASE_LOW_COMFORT_THRESHOLD: 30,
    DISEASE_STATE_NONE: "none", DISEASE_STATE_CARRIER: "carrier", DISEASE_STATE_INCUBATING: "incubating",
    DISEASE_STATE_EARLY: "earlySymptoms", DISEASE_STATE_VISIBLE: "visibleSymptoms", DISEASE_STATE_SEVERE: "severe",
    DISEASE_STATE_RECOVERING: "recovering", DISEASE_STATE_IMMUNE: "temporaryImmunity",
    DISEASE_TYPE_PARASITES: "parasites", DISEASE_TYPE_INFECTION: "infection", DISEASE_TYPE_GENERIC: "generic", DISEASE_TYPE_VIRAL: "viral",
    state: { coins: 100, medicineInventory: { antiParasite: 2, firstAid: 1 }, vetConsultations: [], webSurfSentEmails: [], walletTransactions: [], webSurfMailStates: {} },
    runtime: {}, tank, events: [], clean: 100, comfort: 100, peaceful: false,
    clamp: (v, min, max) => Math.min(max, Math.max(min, v)),
    createId: prefix => `${prefix}-${++id}`, isFishDead: fish => fish.dead === true,
    sanitizeDiseaseState: value => value || "none", isActiveDiseaseState: value => !["none", "temporaryImmunity"].includes(value),
    getFishMaxHealthUnits: () => 8, getSpeciesForFish: () => ({ name: "Guppy" }),
    isTrypophobiaEnabled: () => true, isGoreEnabled: () => true,
    getDebugDiseaseProgressForStage: stage => stage === "severe" ? 4 * DAY : 3 * DAY,
    resetFishDiseaseFields: (fish, stage) => { fish.diseaseState = stage; fish.diseaseRecoveryProgressMs = 0; },
    syncFishPrimaryCondition: () => {}, getTankLabel: entry => entry.name,
    getMedicineMeta: key => JSON.parse(read("assets/foodandmeds/food-and-meds.json")).medicine[key],
    MAX_WALLET_COINS: 99999, showToast: () => {}, getInsufficientFundsMessage: () => "Insufficient coins",
    completeGameAction: () => {}, saveState: () => {}, syncWebSurfUnreadBadge: () => {},
    getLegacyWebSurfReadMailIds: () => new Set(), escapeHtml: text => String(text).replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  });
  context.getCurrentTank = () => tank;
  context.isPeacefulModeEnabled = () => context.peaceful;
  context.isFishWaterTypeMismatch = fish => fish.wrongWater === true;
  context.getDiseaseTankCleanliness = () => context.clean;
  context.getFishComfort = () => ({ value: context.comfort });
  context.pushEvent = text => context.events.push(text);
  context.recordWalletTransaction = entry => { context.state.walletTransactions.push(entry); if (context.failReceipt) throw Error("receipt failed"); };
  vm.runInContext(read("public/app-src/fish/care-and-vet.js"), context);
  vm.runInContext(functions("public/app-src/fish/needs-disease-and-behavior.js", ["normalizeFishDiseaseType", "hasActiveFishDisease", "formatFishConditionLabel"]), context);
  vm.runInContext(functions("public/app-src/store/purchases.js", ["performCoinTransaction"]), context);
  vm.runInContext(functions("public/app-src/ui/management-and-overlays.js", ["ensureWebSurfMailState"]), context);
  vm.runInContext(functions("public/app-src/core/settings-and-persistence.js", ["sanitizeWebSurfSentEmails"]), context);
  return context;
}
function fish(overrides = {}) {
  return { id: "nova", name: "Nova", healthUnits: 8, diseaseState: "visibleSymptoms", diseaseType: "parasites", diseaseInfectedAt: START - DAY, treatmentCourses: {}, careKnowledge: {}, ...overrides };
}
test("five daily doses need a final healing day; extra doses are refused", () => {
  const c = fixture(), f = fish();
  for (let dose = 0; dose < 5; dose++) {
    assert.equal(c.applyFishCourseDose({ id: "antiParasite" }, f, START + dose * DAY).ok, true);
    assert.equal(c.applyFishCourseDose({ id: "antiParasite" }, f, START + dose * DAY + 1000).ok, false);
  }
  assert.equal(f.treatmentCourses.disease.status, "observing");
  c.reconcileFishTreatmentCourses(f, START + 5 * DAY - 1);
  assert.equal(f.diseaseState, "recovering");
  c.reconcileFishTreatmentCourses(f, START + 5 * DAY);
  assert.equal(f.treatmentCourses.disease.status, "complete");
  assert.equal(f.diseaseState, "temporaryImmunity");
});
test("one missed day preserves credit, two misses restart once at the exact boundary", () => {
  const c = fixture(), f = fish();
  c.applyFishCourseDose({ id: "antiParasite" }, f, START);
  c.reconcileFishTreatmentCourses(f, START + 2 * DAY);
  assert.equal(f.treatmentCourses.disease.status, "delayed");
  assert.equal(f.treatmentCourses.disease.healingProgressMs, DAY);
  c.reconcileFishTreatmentCourses(f, START + 3 * DAY - 1);
  assert.equal(f.treatmentCourses.disease.dosesGiven, 1);
  c.reconcileFishTreatmentCourses(f, START + 3 * DAY);
  assert.equal(f.diseaseState, "severe");
  assert.equal(f.treatmentCourses.disease.status, "restartRequired");
  assert.equal(f.treatmentCourses.disease.dosesGiven, 0);
  c.reconcileFishTreatmentCourses(f, START + 4 * DAY);
  assert.equal(c.events.length, 1);
  assert.equal(c.applyFishCourseDose({ id: "antiParasite" }, f, START + 4 * DAY).ok, true);
  assert.equal(f.treatmentCourses.disease.dosesGiven, 1);
});
test("a delayed dose continues the same course with preserved healing", () => {
  const c = fixture(), f = fish();
  c.applyFishCourseDose({ id: "antiParasite" }, f, START);
  const id = f.treatmentCourses.disease.courseId;
  c.applyFishCourseDose({ id: "antiParasite" }, f, START + 2.5 * DAY);
  assert.equal(f.treatmentCourses.disease.courseId, id);
  assert.equal(f.treatmentCourses.disease.dosesGiven, 2);
  assert.equal(f.treatmentCourses.disease.healingProgressMs, DAY);
});
test("poor conditions pause healing and all doses given cannot trigger a missed-dose relapse", () => {
  const c = fixture(), f = fish(); c.clean = 0;
  for (let dose = 0; dose < 5; dose++) c.applyFishCourseDose({ id: "antiParasite" }, f, START + dose * DAY);
  c.reconcileFishTreatmentCourses(f, START + 20 * DAY);
  assert.equal(f.treatmentCourses.disease.status, "observing");
  assert.equal(f.treatmentCourses.disease.healingProgressMs, 0);
  c.clean = 100; c.reconcileFishTreatmentCourses(f, START + 25 * DAY);
  assert.equal(f.treatmentCourses.disease.status, "complete");
});
test("wrong treatment and legacy recovery do not create a course", () => {
  const c = fixture(), f = fish();
  assert.equal(c.applyFishCourseDose({ id: "infectionTreatment" }, f, START).ok, false);
  assert.equal(Object.keys(f.treatmentCourses).length, 0);
  f.diseaseState = "recovering";
  assert.equal(c.applyFishCourseDose({ id: "antiParasite" }, f, START).ok, false);
});
test("injury and disease can be treated independently, without erasing new damage", () => {
  const c = fixture(), f = fish({ healthUnits: 5 });
  c.applyFishCourseDose({ id: "antiParasite" }, f, START);
  c.applyFishCourseDose({ id: "firstAid" }, f, START);
  c.applyFishCourseDose({ id: "firstAid" }, f, START + DAY);
  f.healthUnits -= 2;
  c.applyFishCourseDose({ id: "firstAid" }, f, START + 2 * DAY);
  c.reconcileFishTreatmentCourses(f, START + 3 * DAY);
  assert.equal(f.treatmentCourses.injury.status, "complete");
  assert.equal(f.healthUnits, 6);
});
test("missed injury treatment worsens health once and restarts", () => {
  const c = fixture(), f = fish({ healthUnits: 5, diseaseState: "none" });
  c.applyFishCourseDose({ id: "firstAid" }, f, START);
  c.reconcileFishTreatmentCourses(f, START + 3 * DAY);
  assert.equal(f.healthUnits, 5); // One healed unit, then one relapse unit.
  c.reconcileFishTreatmentCourses(f, START + 4 * DAY);
  assert.equal(f.healthUnits, 5);
  assert.equal(f.treatmentCourses.injury.status, "restartRequired");
});
test("storage, Peaceful Mode and backwards clocks preserve treatment intervals", () => {
  const c = fixture(), f = fish(); c.applyFishCourseDose({ id: "antiParasite" }, f, START);
  f.storageFrozen = true; c.reconcileFishTreatmentCourses(f, START + 10 * DAY);
  assert.equal(f.treatmentCourses.disease.dosesGiven, 1);
  c.shiftFishTreatmentTimes(f, 10 * DAY); f.storageFrozen = false;
  c.reconcileFishTreatmentCourses(f, START + 10 * DAY + DAY / 2);
  assert.equal(f.treatmentCourses.disease.healingProgressMs, DAY / 2);
  c.peaceful = true; c.reconcileFishTreatmentCourses(f, START + 20 * DAY);
  c.shiftFishTreatmentTimes(f, 10 * DAY); c.peaceful = false;
  c.reconcileFishTreatmentCourses(f, START + 20 * DAY);
  assert.equal(f.treatmentCourses.disease.status, "active");
});
test("courses, care knowledge and consultation emails survive canonical sanitation", () => {
  const c = fixture(), f = fish(); c.tank.fish = [f];
  c.applyFishCourseDose({ id: "antiParasite" }, f, START);
  const saved = JSON.parse(JSON.stringify(f));
  assert.equal(c.sanitizeFishTreatmentCourses(saved.treatmentCourses).disease.dosesGiven, 1);
  assert.equal(c.sanitizeFishCareKnowledge(saved.careKnowledge).disease.condition, "parasites");
  assert.equal(c.purchaseStillwaterConsultation(c.tank.id, [f.id], "visit", START).ok, true);
  c.state.vetConsultations = c.sanitizeStillwaterConsultations(JSON.parse(JSON.stringify(c.state.vetConsultations)));
  c.state.webSurfSentEmails = c.sanitizeWebSurfSentEmails(JSON.parse(JSON.stringify(c.state.webSurfSentEmails)));
  assert.equal(c.state.webSurfSentEmails[0].data.consultationId, "visit");
  assert.match(c.renderStillwaterEmailBody(c.state.webSurfSentEmails[0]), /Nova.*Diagnosis/s);
});
test("multi-fish consultation charges once, grants exact doses, sends one email and deduplicates retries", () => {
  const c = fixture(), a = fish(), b = fish({ id: "luna", name: "Luna", healthUnits: 6, diseaseState: "none" });
  c.tank.fish = [a, b];
  const result = c.purchaseStillwaterConsultation(c.tank.id, [a.id, b.id, a.id], "visit", START);
  assert.equal(result.ok, true);
  assert.equal(c.state.coins, 60);
  assert.equal(c.state.walletTransactions.length, 1);
  assert.equal(c.state.medicineInventory.antiParasite, 7);
  assert.equal(c.state.medicineInventory.firstAid, 4);
  assert.equal(Object.keys(a.treatmentCourses).length, 0);
  assert.equal(c.state.webSurfSentEmails.length, 1);
  assert.equal(c.state.webSurfSentEmails[0].sender, "consultation@stillwatervet.swim");
  assert.equal(c.state.webSurfMailStates["stillwater-visit"].status, 1);
  c.purchaseStillwaterConsultation(c.tank.id, [a.id, b.id], "visit", START + 1);
  assert.equal(c.state.coins, 60);
  assert.equal(c.state.webSurfSentEmails.length, 1);
  const body = c.renderStillwaterEmailBody(c.state.webSurfSentEmails[0]);
  assert.match(body, /Services rendered.*Nova.*Diagnosis.*Medication provided.*Treatment instructions.*Luna/s);
});
test("clinic preserves stock and prescribes only remaining course doses", () => {
  const c = fixture(), f = fish(); c.tank.fish = [f];
  c.applyFishCourseDose({ id: "antiParasite" }, f, START);
  c.applyFishCourseDose({ id: "antiParasite" }, f, START + DAY);
  c.purchaseStillwaterConsultation(c.tank.id, [f.id], "visit", START + DAY);
  assert.equal(c.state.medicineInventory.antiParasite, 5);
});
test("healthy consultation is billed without invented medicine", () => {
  const c = fixture(), f = fish({ diseaseState: "none" }); c.tank.fish = [f];
  c.purchaseStillwaterConsultation(c.tank.id, [f.id], "visit", START);
  assert.equal(c.state.coins, 80);
  assert.equal(c.state.vetConsultations[0].fishReports[0].prescriptions.length, 0);
});
test("legacy one-drop disease recovery gets an assessment without unnecessary new medicine", () => {
  const c = fixture(), f = fish({ diseaseState: "recovering" }); c.tank.fish = [f];
  c.purchaseStillwaterConsultation(c.tank.id, [f.id], "visit", START);
  assert.equal(c.state.vetConsultations[0].fishReports[0].prescriptions.length, 0);
  assert.equal(c.state.medicineInventory.antiParasite, 2);
});
test("stale tank, unavailable fish and insufficient coins leave all purchase state unchanged", () => {
  for (const reason of ["tank", "dead", "missing", "funds"]) {
    const c = fixture(), f = fish(); c.tank.fish = [f];
    if (reason === "dead") f.dead = true;
    if (reason === "funds") c.state.coins = 19;
    const before = JSON.stringify(c.state);
    assert.equal(c.purchaseStillwaterConsultation(reason === "tank" ? "other" : c.tank.id, [reason === "missing" ? "missing" : f.id], "visit", START).ok, false);
    assert.equal(JSON.stringify(c.state), before);
  }
});
test("failed purchase rolls coins, receipt, delivered medicine, diagnosis and report back", () => {
  const c = fixture(), f = fish(); c.tank.fish = [f]; c.failReceipt = true;
  assert.throws(() => c.purchaseStillwaterConsultation(c.tank.id, [f.id], "visit", START), /receipt failed/);
  assert.equal(c.state.coins, 100);
  assert.equal(c.state.walletTransactions.length, 0);
  assert.equal(c.state.medicineInventory.antiParasite, 2);
  assert.equal(c.state.vetConsultations.length, 0);
  assert.equal(c.state.webSurfSentEmails.length, 0);
  assert.equal(Object.keys(f.careKnowledge).length, 0);
});
test("quiz follows selected clues and resolves ambiguous disease clues without inspecting fish", () => {
  const c = fixture();
  assert.deepEqual(Array.from(c.getPharmacyQuizRecommendations(["specks"]).medicineIds), ["antiParasite"]);
  assert.deepEqual(Array.from(c.getPharmacyQuizRecommendations(["lesions", "wounds"]).medicineIds), ["infectionTreatment", "firstAid"]);
  assert.deepEqual(Array.from(c.getPharmacyQuizRecommendations(["color", "behavior"]).medicineIds), []);
  assert.deepEqual(Array.from(c.getPharmacyQuizRecommendations(["specks", "lesions"]).medicineIds), []);
  assert.deepEqual(Array.from(c.getPharmacyQuizRecommendations([], true).medicineIds), []); // An assumed water mismatch is not a symptom.
  const sheets = require("./generate-sprite-sheets.cjs").buildDefinitions();
  for (const clue of c.getPharmacySymptomCatalog()) if (clue.image) {
    const physical = fs.existsSync(path.join(root, clue.image));
    const atlas = sheets.find(sheet => sheet.path.startsWith(path.posix.dirname(clue.image) + "/") && Object.hasOwn(sheet.frames, path.basename(clue.image)));
    assert.ok(physical || atlas, `Missing symptom artwork: ${clue.image}`);
  }
});
test("undiscovered causes are generic until the matching episode is assessed", () => {
  const c = fixture(), f = fish();
  assert.equal(c.getFishCareConditionText(f), "Cause not identified");
  c.discoverFishCareCondition(f, "parasites"); assert.equal(c.getFishCareConditionText(f), "Parasites");
  f.diseaseInfectedAt += DAY; assert.equal(c.getFishCareConditionText(f), "Cause not identified");
});
test("side marks follow rendered progress in both directions and are zero across the flip", () => {
  const c = fixture();
  vm.runInContext(functions("public/app-src/rendering/fish-motion-and-floor.js", ["normalizeFishHorizontalDirection", "getFishFacingDirection", "getFishLogicalDirection", "getFishHorizontalTurnState", "getFishRenderedHorizontalTurnState"]), c);
  vm.runInContext(functions("public/app-src/rendering/fish-and-effects.js", ["normalizeFishInjuryDisplaySide", "getFishInjuryDisplaySide", "getFishSymptomSideVisibility"]), c);
  for (const from of [-1, 1]) for (const mark of ["left", "right"]) {
    const f = fish({ injuryDisplaySide: mark, displayDirection: from, turnStartedAt: START, turnDurationMs: 1000, turnFromDirection: from, turnToDirection: -from });
    const values = [0, .35, .49, .5, .51, .65, 1].map(p => c.getFishSymptomSideVisibility(f, { facingScaleX: from }, START + p * 1000));
    const startsMarked = (mark === "left" ? -1 : 1) === from;
    assert.equal(values[0], startsMarked ? 1 : 0);
    assert.equal(values[6], startsMarked ? 0 : 1);
    assert.ok(values[2] < .02 && values[3] < .02 && values[4] < .02);
    for (let i = 1; i < values.length; i++) assert.ok(startsMarked ? values[i] <= values[i - 1] : values[i] >= values[i - 1]);
    assert.equal(f.injuryDisplaySide, mark);
  }
});
test("volume marks use the rendered clock and actual style yaw despite latched display direction", () => {
  const c = fixture();
  vm.runInContext(functions("public/app-src/rendering/fish-and-effects.js", ["normalizeFishInjuryDisplaySide", "getFishInjuryDisplaySide", "getFishSymptomSideVisibility"]), c);
  c.getFishRenderedHorizontalTurnState = () => ({ active: true, reversing: true, progress: .6, fromDirection: 1, toDirection: -1 });
  c.getFishTurnV26VisualProgress = (_, p) => p;
  c.getFishTurnV26Style = () => "test"; c.getFishTurnV26SourceDirection = () => 1; c.getFishTurnV26DepthSign = () => 1;
  c.computeFishTurnV26StyleTransform = () => ({ rotationY: Math.PI });
  const f = fish({ injuryDisplaySide: "left", displayDirection: 1 });
  assert.equal(c.getFishSymptomSideVisibility(f, { facingScaleX: 1 }, START, true), 1);
  c.computeFishTurnV26StyleTransform = () => ({ rotationY: Math.PI / 2 });
  assert.ok(c.getFishSymptomSideVisibility(f, { facingScaleX: 1 }, START, true) < .0001);
});
test("Stillwater routes, discovery and bookmarks retain an independent domain after saving", () => {
  const c = fixture();
  vm.runInContext(functions("public/app-src/decor/customization.js", ["getWebSurfSiteRegistry", "normalizeWebSurfUrl", "resolveWebSurfUrl", "normalizeWebSurfSessionPage"]), c);
  vm.runInContext(functions("public/app-src/core/settings-and-persistence.js", ["sanitizeWebSurfBrowserState"]), c);
  const route = c.resolveWebSurfUrl("stillwatervet.swim");
  assert.equal(route.site.id, "stillwater");
  assert.equal(route.site.bookmarkable, true);
  assert.equal(c.normalizeWebSurfSessionPage("stillwater"), "stillwater");
  const saved = c.sanitizeWebSurfBrowserState({ bookmarkDefaultsSeeded: true, discoveredSites: { "stillwatervet.swim": START }, bookmarks: [{ url: "stillwatervet.swim", createdAt: START }], history: [{ url: "stillwatervet.swim", visitedAt: START }] });
  assert.equal(saved.bookmarks[0].url, "stillwatervet.swim/");
  assert.equal(saved.history[0].siteId, "stillwater");
  assert.ok(!saved.bookmarks.some(entry => /bubblebodega/.test(entry.url)));
});
test("every actual Bodega category click updates its address synchronously", () => {
  const c = fixture(); const routes = [];
  c.dom = {}; c.renderUi = () => {}; c.updateWebSurfRoute = url => routes.push(url);
  const source = ts.createSourceFile("events", read("public/app-src/assets/custom-content.js"), ts.ScriptTarget.Latest, true);
  const ids = ["storeFoodTab", "storePharmacyTab", "storeFishTab", "storeDecorTab", "storeEquipmentTab"];
  const categories = ["food", "pharmacy", "fish", "decor", "equipment"];
  const handlers = new Map();
  for (const id of ids) c.dom[id] = { addEventListener: (event, fn) => handlers.set(id, fn) };
  function visit(node) {
    if (ts.isExpressionStatement(node) && ids.some(id => node.getText(source).startsWith(`dom.${id}`))) vm.runInContext(node.getText(source), c);
    else ts.forEachChild(node, visit);
  }
  visit(source);
  ids.forEach((id, index) => {
    handlers.get(id)();
    assert.equal(c.runtime.storeTab, categories[index]);
    assert.equal(routes.at(-1), `bubblebodega.swim/shop/${categories[index]}`);
  });
});
test("Storage preserves both a course deadline and previously discovered diagnosis", () => {
  const c = fixture(), f = fish(); c.applyFishCourseDose({ id: "antiParasite" }, f, START);
  vm.runInContext(functions("public/app-src/fish/lifecycle-and-breeding.js", ["clearFishTemporaryBreedingActivation", "prepareFishForStorageState", "shiftFishStoragePausedTimestamp", "resumeFishFromStorageState"]), c);
  c.prepareFishForStorageState(f, START);
  c.resumeFishFromStorageState(f, START + 10 * DAY);
  assert.equal(f.treatmentCourses.disease.lastDoseAt, START + 10 * DAY);
  assert.equal(c.getFishCareConditionText(f), "Parasites");
  c.reconcileFishTreatmentCourses(f, START + 10 * DAY);
  assert.equal(f.treatmentCourses.disease.dosesGiven, 1);
});

test("paused care and incompatible water reject doses without changing the course", () => {
  const c = fixture(), f = fish();
  f.wrongWater = true;
  assert.equal(c.applyFishCourseDose({ id: "antiParasite" }, f, START).ok, false);
  assert.equal(Object.keys(f.treatmentCourses).length, 0);
  f.wrongWater = false; c.peaceful = true; c.tank.fish = [f];
  assert.equal(c.applyFishCourseDose({ id: "antiParasite" }, f, START).ok, false);
  assert.equal(c.purchaseStillwaterConsultation(c.tank.id, [f.id], "paused", START).ok, false);
  assert.equal(c.state.coins, 100);
  assert.equal(c.state.webSurfSentEmails.length, 0);
});
test("completed-dose and legacy reports retain instructions without prescribing extra drops", () => {
  const c = fixture(), f = fish(); c.tank.fish = [f];
  for (let i = 0; i < 5; i++) c.applyFishCourseDose({ id: "antiParasite" }, f, START + i * DAY);
  c.purchaseStillwaterConsultation(c.tank.id, [f.id], "healing", START + 4 * DAY);
  assert.equal(c.state.vetConsultations[0].fishReports[0].prescriptions.length, 0);
  let html = c.renderStillwaterEmailBody(c.state.webSurfSentEmails[0]);
  assert.match(html, /5 doses were already given/);
  assert.match(html, /final 24-hour healing interval/);
  const legacy = fish({ diseaseState: "recovering" }); c.tank.fish = [legacy];
  c.purchaseStillwaterConsultation(c.tank.id, [legacy.id], "legacy", START);
  html = c.renderStillwaterEmailBody(c.state.webSurfSentEmails[0]);
  assert.match(html, /No additional drops are required/);
  assert.doesNotMatch(html, /Give one drop/);
});
test("malformed saved courses and report entries are discarded safely", () => {
  const c = fixture();
  assert.deepEqual(Object.keys(c.sanitizeFishTreatmentCourses({ disease: { medicineId: "antiParasite", status: "active", lastDoseAt: Infinity, startedAt: START, dosesGiven: 1 } })), []);
  const reports = c.sanitizeStillwaterConsultations([{ id: "bad", fishReports: [null, { prescriptions: [null, { id: "unknown" }], carePlans: [null] }] }]);
  assert.equal(reports[0].fishReports.length, 1);
  assert.equal(reports[0].fishReports[0].prescriptions.length, 0);
  assert.equal(reports[0].fishReports[0].carePlans.length, 0);
});
test("live guides preserve legacy recovery and support effect expiry", () => {
  const c = fixture(), f = fish({ diseaseState: "recovering", diseaseRecoveryProgressMs: DAY / 2, calmedUntil: START + 600000 });
  assert.match(c.getFishCareConditionText(f), /Parasites/);
  let html = c.getFishTreatmentGuideMarkup(f, START);
  assert.match(html, /12 hours of recovery remain/);
  assert.match(html, /Calming effect active/);
  f.osmoticStressProgressMs = 100; f.osmoticRecoveryProgressMs = DAY / 4; f.osmoticStressStartedAt = START;
  c.discoverFishCareCondition(f, "osmotic-stress");
  html = c.getFishTreatmentGuideMarkup(f, START + 600001);
  assert.match(html, /18 hours of normal recovery remain/);
  assert.doesNotMatch(html, /Calming effect active/);
});
test("Bodega home only recommends medicine for a discovered current episode", () => {
  const c = fixture(), f = fish();
  c.getFishPrimaryCondition = () => "parasites";
  vm.runInContext(functions("public/app-src/ui/management-and-overlays.js", ["getBubbleBodegaDiseaseTreatmentId"]), c);
  assert.equal(c.getBubbleBodegaDiseaseTreatmentId(f, START), "");
  c.discoverFishCareCondition(f, "parasites");
  assert.equal(c.getBubbleBodegaDiseaseTreatmentId(f, START), "antiParasite");
  f.diseaseInfectedAt += 1;
  assert.equal(c.getBubbleBodegaDiseaseTreatmentId(f, START), "");
  assert.deepEqual(Array.from(c.getPharmacyQuizRecommendations(["specks", "lesions", "wounds"]).medicineIds), ["firstAid"]);
});
test("Peaceful Mode captures support and recovery timers without inventing inactive effects", () => {
  const c = fixture(), f = fish({ calmedUntil: START + 600000, waterStressBoostUntil: 0, osmoticRecoveryLastAt: START });
  vm.runInContext(functions("public/app-src/core/settings-and-persistence.js", ["getPeacefulModeFishSnapshot"]), c);
  const timers = c.getPeacefulModeFishSnapshot(f).timers;
  assert.equal(timers.calmedUntil, START + 600000);
  assert.equal(timers.osmoticRecoveryLastAt, START);
  assert.equal(timers.waterStressBoostUntil, undefined);
});

test("consultation covers simultaneous behavior and illness with existing medicines", () => {
  const c = fixture(), f = fish({ panicUntil: START + 600000 }); c.tank.fish = [f];
  c.purchaseStillwaterConsultation(c.tank.id, [f.id], "mixed", START);
  const report = c.state.vetConsultations[0].fishReports[0];
  assert.equal(report.behaviorConcern, true);
  assert.ok(report.prescriptions.some(entry => entry.id === "antiParasite"));
  assert.ok(report.prescriptions.some(entry => entry.id === "betaBlocker"));
  assert.match(c.renderStillwaterEmailBody(c.state.webSurfSentEmails[0]), /Panic or aggressive behavior observed/);
  f.calmedUntil = START + 600000;
  assert.ok(!c.buildStillwaterFishReport(f, START).prescriptions.some(entry => entry.id === "betaBlocker"));
});
