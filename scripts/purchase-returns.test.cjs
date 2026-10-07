"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..", "game", "public", "app-src");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const NOW = new Date(2026, 9, 7, 12).getTime();

function fixture() {
  let id = 0;
  const c = vm.createContext({
    Date, Map, Set, Math, MAX_WALLET_COINS: 99999,
    state: { coins: 100, purchaseHistory: [], medicineInventory: { firstAid: 0 }, decorInventory: {}, walletTransactions: [] },
    runtime: { decorMap: new Map([["rock", {}], ["blue-rock", {}]]) },
    getMedicineMeta: key => key === "firstAid" ? { id: key, name: "First Aid", bottleDrops: 3, cost: 20 } : null,
    normalizeDecorKey: key => key,
    pluralize: (word, count) => count === 1 ? word : `${word}s`,
    getDecorStoreVariantEntries: () => [{ key: "rock" }, { key: "blue-rock" }],
    normalizeWebSurfThumbnailPath: value => value,
    createId: prefix => `${prefix}-${++id}`,
    clamp: (v, min, max) => Math.min(max, Math.max(min, v)),
    isPeacefulModeEnabled: () => false,
    saveState: () => {}, showToast: () => {},
    completeGameAction: () => { c.saveState(); },
    recordWalletTransaction: entry => { c.state.walletTransactions.push(entry); if (c.failReceipt) throw Error("receipt failed"); }
  });
  const settings = read("core/settings-and-persistence.js");
  const parsed = ts.createSourceFile("settings.js", settings, ts.ScriptTarget.Latest, true);
  const sanitizer = parsed.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === "sanitizePurchaseHistory");
  vm.runInContext(settings.slice(sanitizer.getStart(parsed), sanitizer.end), c);
  vm.runInContext(read("store/purchases.js"), c);
  vm.runInContext(read("fish/feeding-and-medicine.js"), c);
  c.recordWalletTransaction = entry => { c.state.walletTransactions.push(entry); if (c.failReceipt) throw Error("receipt failed"); };
  return c;
}

function purchase(c, key = "buyMedicine:firstAid", quantity = 1, placedAt = NOW) {
  c.ensurePurchaseReturnTracking();
  const medicine = key.startsWith("buyMedicine:");
  const inventoryKey = medicine ? "firstAid" : key.includes(":variant:") ? key.split(":variant:")[1] : key.split(":")[1];
  const inventory = medicine ? c.state.medicineInventory : c.state.decorInventory;
  inventory[inventoryKey] = (inventory[inventoryKey] || 0) + quantity * (medicine ? 3 : 1);
  const order = c.recordBubbleBodegaOrder([{ key, category: medicine ? "pharmacy" : "decor", name: inventoryKey, cost: 20, quantity }]);
  order.placedAt = placedAt;
  return order;
}

test("unused medicine has no expiry and refunds exactly once with a receipt", () => {
  const c = fixture(), order = purchase(c);
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW + 90 * 86400000).ok, true);
  assert.equal(c.state.coins, 120);
  assert.equal(c.state.medicineInventory.firstAid, 0);
  assert.equal(c.state.walletTransactions.at(-1).direction, "credit");
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW).ok, false);
  assert.equal(c.state.coins, 120);
  assert.match(c.getPurchaseItemReturnStatus(order, order.items[0], NOW).message, /Returned/);
});

test("opening one of two bottles leaves only the other eligible; replenishing does not reset use", () => {
  const c = fixture(), order = purchase(c, "buyMedicine:firstAid", 2);
  c.consumeSelectedMedicineDose({ id: "firstAid" });
  assert.equal(c.getPurchaseItemReturnStatus(order, order.items[0], NOW).quantity, 1);
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW).ok, true);
  purchase(c);
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW).ok, false);
  assert.equal(c.state.medicineInventory.firstAid, 5);
});

test("use follows oldest bottles across separate orders, including submarine transfers", () => {
  const c = fixture(), old = purchase(c, "buyMedicine:firstAid", 1, NOW - 1000), recent = purchase(c);
  c.recordPurchaseProductUse("medicine", "firstAid", 4);
  c.state.medicineInventory.firstAid -= 4;
  assert.equal(c.getPurchaseItemReturnStatus(old, old.items[0], NOW).eligible, false);
  assert.equal(c.getPurchaseItemReturnStatus(recent, recent.items[0], NOW).eligible, false);
});

test("decor returns use calendar midnight rather than a rolling 24 hours", () => {
  const c = fixture(), date = new Date(2026, 9, 7, 23, 59), order = purchase(c, "buyDecor:rock", 1, date.getTime());
  assert.equal(c.getPurchaseItemReturnStatus(order, order.items[0], date.getTime() + 59000).eligible, true);
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, new Date(2026, 9, 8).getTime()).ok, false);
  assert.equal(c.state.coins, 100);
});

test("using and storing decor again does not reset eligibility; variants remove the correct inventory", () => {
  const c = fixture(), order = purchase(c, "buyDecor:rock:variant:blue-rock");
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW).ok, true);
  assert.equal(c.state.decorInventory["blue-rock"], 0);
  const used = purchase(c, "buyDecor:rock");
  c.recordPurchaseProductUse("decor", "rock");
  assert.equal(c.returnBubbleBodegaPurchase(used.id, 0, NOW).ok, false);
});

test("fish, food, equipment, invalid indices, and unknown purchases are not returnable", () => {
  const c = fixture();
  for (const [key, category] of [["buyFish:goldfish", "fish"], ["buyFood:basic", "food"], ["buyAutoDispenser:auto", "equipment"]]) {
    const order = c.recordBubbleBodegaOrder([{ key, category, cost: 20 }]);
    assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW).ok, false);
    assert.equal(c.returnBubbleBodegaPurchase(order.id, -1, NOW).ok, false);
  }
  assert.equal(c.returnBubbleBodegaPurchase("missing", 0, NOW).ok, false);
  assert.equal(c.state.coins, 100);
});

test("reusing old decor from storage preserves a fresh unused purchase of the same product", () => {
  const c = fixture(), old = purchase(c, "buyDecor:rock");
  c.recordPurchaseProductUse("decor", "rock");
  c.state.decorInventory.rock -= 1;
  const recent = purchase(c, "buyDecor:rock", 1, NOW + 1);
  c.state.decorInventory.rock += 1; // Put the previously used item away.
  c.recordPurchaseProductUse("decor", "rock");
  c.state.decorInventory.rock -= 1;
  assert.equal(c.getPurchaseItemReturnStatus(old, old.items[0], NOW + 2).eligible, false);
  assert.equal(c.getPurchaseItemReturnStatus(recent, recent.items[0], NOW + 2).eligible, true);
});

test("Buy Another decor appears in purchase history and can be returned before use", () => {
  const c = fixture();
  c.runtime.decorMap.set("rock", { key: "rock", name: "Rock", cost: 20 });
  c.isSeasonalDecorAvailable = () => true;
  c.canUseDecorWithCurrentContentSettings = () => true;
  c.isDecorShopUnlocked = () => true;
  assert.equal(c.buyAnotherDecor("rock").ok, true);
  const order = c.state.purchaseHistory[0];
  assert.equal(order.items[0].key, "buyDecor:rock");
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, order.placedAt).ok, true);
  assert.equal(c.state.coins, 100);
  assert.equal(c.state.decorInventory.rock, 0);
});

test("buying each actual medication supplies the catalog's full bottle quantity", () => {
  const c = fixture();
  const catalog = JSON.parse(fs.readFileSync(path.resolve(root, "..", "..", "assets/foodandmeds/food-and-meds.json"), "utf8")).medicine;
  c.getMedicineMeta = key => catalog[key];
  c.shouldShowMedicineInStore = () => true;
  for (const medicine of Object.values(catalog)) {
    c.state.medicineInventory[medicine.id] = 0;
    assert.equal(c.buyMedicine(medicine.id).ok, true);
    assert.equal(c.state.medicineInventory[medicine.id], medicine.bottleDrops);
  }
});

test("old three-drop and new five-drop bottles each refund their actual purchased quantity", () => {
  const c = fixture();
  c.getMedicineMeta = key => key === "antiParasite" ? { id: key, name: "Anti-Parasite Treatment", bottleDrops: 5, cost: 12 } : null;
  c.shouldShowMedicineInStore = () => true;
  c.state.medicineInventory.antiParasite = 3;
  c.state.purchaseHistory = c.sanitizePurchaseHistory([{ id: "legacy", placedAt: NOW, items: [{ key: "buyMedicine:antiParasite", quantity: 1, cost: 12 }] }]);
  assert.equal(c.buyMedicine("antiParasite").ok, true);
  const recent = c.recordBubbleBodegaOrder([{ key: "buyMedicine:antiParasite", quantity: 1, cost: 12 }]);
  const old = c.state.purchaseHistory.find(order => order.id === "legacy");
  assert.equal(old.items[0].unitsPerProduct, 3);
  assert.equal(recent.items[0].unitsPerProduct, 5);
  assert.equal(c.returnBubbleBodegaPurchase(old.id, 0, NOW).ok, true);
  assert.equal(c.state.medicineInventory.antiParasite, 5);
  c.state.purchaseHistory = c.sanitizePurchaseHistory(JSON.parse(JSON.stringify(c.state.purchaseHistory)));
  assert.equal(c.returnBubbleBodegaPurchase(recent.id, 0, NOW).ok, true);
  assert.equal(c.state.medicineInventory.antiParasite, 0);
});

test("legacy pooled inventory is allocated once and tracking survives saving", () => {
  const c = fixture();
  c.state.medicineInventory.firstAid = 4;
  c.state.purchaseHistory = c.sanitizePurchaseHistory([
    { id: "old", placedAt: NOW - 1000, items: [{ key: "buyMedicine:firstAid", quantity: 1, cost: 20 }] },
    { id: "new", placedAt: NOW, items: [{ key: "buyMedicine:firstAid", quantity: 1, cost: 20 }] }
  ]);
  c.ensurePurchaseReturnTracking();
  const [recent, old] = c.state.purchaseHistory;
  assert.equal(c.getPurchaseItemReturnStatus(recent, recent.items[0], NOW).eligible, true);
  assert.equal(c.getPurchaseItemReturnStatus(old, old.items[0], NOW).eligible, false);
  c.consumeSelectedMedicineDose({ id: "firstAid" });
  c.state.purchaseHistory = c.sanitizePurchaseHistory(JSON.parse(JSON.stringify(c.state.purchaseHistory)));
  c.state.medicineInventory.firstAid += 3;
  c.ensurePurchaseReturnTracking();
  assert.equal(c.state.purchaseHistory[1].items[0].usedUnits, 3);
});

test("refunds work in Peaceful Mode and a full wallet cannot discard refund coins", () => {
  const c = fixture(), order = purchase(c);
  c.isPeacefulModeEnabled = () => true;
  c.state.coins = 99998;
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW).reason, "wallet-full");
  assert.equal(c.state.medicineInventory.firstAid, 3);
  c.state.coins = 100;
  assert.equal(c.returnBubbleBodegaPurchase(order.id, 0, NOW).ok, true);
});

test("a failed refund restores inventory, coins, return status, and wallet receipts", () => {
  const c = fixture(), order = purchase(c);
  c.failReceipt = true;
  assert.throws(() => c.returnBubbleBodegaPurchase(order.id, 0, NOW), /receipt failed/);
  assert.equal(c.state.coins, 100);
  assert.equal(c.state.medicineInventory.firstAid, 3);
  assert.equal(order.items[0].returnedQuantity, 0);
  assert.equal(c.state.walletTransactions.length, 0);
});

test("purchase history renders the return action and its click updates inventory and the displayed status", () => {
  const c = fixture(), order = purchase(c);
  const nodes = new Map(["tankazonOrderSummary", "tankazonOrderList", "tankazonOrderPagination"].map(id => [id, { innerHTML: "", textContent: "" }]));
  Object.assign(c, {
    orderSearchQuery: "", orderPage: 1, highlightedOrderId: "", TANKAZON_ORDERS_PER_PAGE: 10,
    categoryLabels: { pharmacy: "Pharmacy" }, formatTankazonOrderDate: () => "October 7, 2026",
    escapeTankazonOrderText: text => String(text || "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;"),
    document: { getElementById: id => nodes.get(id) },
    getTankazonAccountData: () => ({ orders: c.state.purchaseHistory.map(o => ({ ...o, items: o.items.map(item => ({ ...item, returnStatus: c.getPurchaseItemReturnStatus(o, item, NOW) })) })) }),
    window: { returnBubbleBodegaPurchase: (id, index) => c.returnBubbleBodegaPurchase(id, index, NOW), showToast: () => {} }
  });
  const source = fs.readFileSync(path.resolve(root, "..", "websurf-store.js"), "utf8");
  const parsed = ts.createSourceFile("shell.js", source, ts.ScriptTarget.Latest, true);
  let handler;
  const visit = node => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "renderTankazonOrders") vm.runInContext(node.getText(parsed), c);
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === "document.addEventListener" && node.arguments[0]?.text === "click") handler = vm.runInContext(`(${node.arguments[1].getText(parsed)})`, c);
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  c.renderTankazonOrders();
  assert.match(nodes.get("tankazonOrderList").innerHTML, /Return one · 20 coins refund/);
  let stopped = false;
  const button = { dataset: { returnOrder: order.id, returnItem: "0" } };
  handler({ target: { closest: selector => selector === "[data-return-order]" ? button : null }, preventDefault() {}, stopImmediatePropagation() { stopped = true; } });
  assert.equal(stopped, true);
  assert.equal(c.state.coins, 120);
  assert.equal(c.state.medicineInventory.firstAid, 0);
  assert.match(nodes.get("tankazonOrderList").innerHTML, /class="tankazon-return-status">RETURNED<\/span>/);
  assert.match(nodes.get("tankazonOrderList").innerHTML, /20 coins refunded/);
  assert.doesNotMatch(nodes.get("tankazonOrderList").innerHTML, /data-return-order/);
});
