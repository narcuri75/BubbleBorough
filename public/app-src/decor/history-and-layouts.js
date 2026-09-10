// Decoration history and reusable layouts. History is session-only; layouts travel with saves.

function copyDecorEditItem(item) {
  const keys = ["id", "decorKey", "xNorm", "yNorm", "scale", "tankLayer", "flipped", "flippedY",
    "freePlacementEnabled", "groupId", "xAnchorMode", "xCenterOffsetWorld", "yAnchorMode", "yAnchorValue",
    "bubblerSettings", "decorSettings", "caveSettings", "caveColorSettings", "transitTubeName", "transitTubeColor", "transitTubeLinkedId"];
  return JSON.parse(JSON.stringify(Object.fromEntries(keys.filter((key) => item[key] !== undefined).map((key) => [key, item[key]]))));
}

function getDecorEditHistory() {
  const tank = getCurrentTank();
  if (!tank) return null;
  runtime.decorEditHistories ||= new WeakMap();
  if (!runtime.decorEditHistories.has(tank)) runtime.decorEditHistories.set(tank, { undo: [], redo: [], pending: null });
  return runtime.decorEditHistories.get(tank);
}

function beginDecorEditHistory(label = "Edit decorations") {
  const history = getDecorEditHistory();
  if (!history || history.applying) return;
  if (history.pending && (runtime.dragState || runtime.decorResizeState)) return;
  commitDecorEditHistory();
  history.pending = {
    label,
    before: state.placedDecor.map(copyDecorEditItem),
    beforeGravelHillSeed: Number(getCurrentTank()?.gravelHillSeed) || null
  };
}

function commitDecorEditHistory() {
  const history = getDecorEditHistory();
  if (!history?.pending || history.applying || runtime.dragState || runtime.decorResizeState) return;
  const { label, before, beforeGravelHillSeed } = history.pending;
  history.pending = null;
  const after = state.placedDecor.map(copyDecorEditItem);
  const ids = new Set([...before, ...after].map((item) => item.id));
  const changes = [...ids].map((id) => ({ before: before.find((item) => item.id === id), after: after.find((item) => item.id === id) }))
    .filter((change) => JSON.stringify(change.before) !== JSON.stringify(change.after));
  const afterGravelHillSeed = Number(getCurrentTank()?.gravelHillSeed) || null;
  const gravelHillChange = beforeGravelHillSeed === afterGravelHillSeed
    ? null
    : { before: beforeGravelHillSeed, after: afterGravelHillSeed };
  if (!changes.length && !gravelHillChange) return;
  history.undo.push({ label, changes, gravelHillChange });
  history.undo = history.undo.slice(-50);
  history.redo = [];
}

function decorEditIsBusy() {
  return Boolean(runtime.dragState || runtime.decorResizeState || runtime.placementMode);
}

function replayDecorEdit(direction) {
  if (decorEditIsBusy()) return false;
  commitDecorEditHistory();
  const history = getDecorEditHistory();
  const entry = history?.[direction]?.at(-1);
  if (!entry) return false;
  const undo = direction === "undo";
  const inventory = { ...state.decorInventory };
  const changes = entry.changes.map((change) => ({ from: undo ? change.after : change.before, to: undo ? change.before : change.after }));
  const hillFrom = undo ? entry.gravelHillChange?.after : entry.gravelHillChange?.before;
  const hillTo = undo ? entry.gravelHillChange?.before : entry.gravelHillChange?.after;
  if (entry.gravelHillChange && (Number(getCurrentTank()?.gravelHillSeed) || null) !== hillFrom) {
    history.undo = []; history.redo = [];
    showToast("The gravel hill changed outside the editor. Start a new edit to use undo.");
    renderDecorHistoryControls();
    return false;
  }
  for (const { from, to } of changes) {
    const current = state.placedDecor.find((item) => item.id === (from || to).id);
    // An item removed or edited outside this history must never be resurrected or overwritten.
    if (from ? !current || JSON.stringify(copyDecorEditItem(current)) !== JSON.stringify(from) : current) {
      history.undo = []; history.redo = [];
      showToast("Decorations changed outside the editor. Start a new edit to use undo.");
      renderDecorHistoryControls();
      return false;
    }
    if (from && !to) inventory[from.decorKey] = (inventory[from.decorKey] || 0) + 1;
    if (to && !from) inventory[to.decorKey] = (inventory[to.decorKey] || 0) - 1;
  }
  if (Object.values(inventory).some((count) => count < 0) || changes.some(({ to }) => to &&
    (!runtime.decorMap.has(to.decorKey) || !canUseDecorWithCurrentContentSettings(to.decorKey) || !canDecorLiveInCurrentTank(to.decorKey)))) {
    showToast("This edit needs decorations that are no longer available in this tank.");
    return false;
  }
  history.applying = true;
  try {
    for (const { from, to } of changes) {
      const index = state.placedDecor.findIndex((item) => item.id === (from || to).id);
      if (!to) {
        clearDecorResidenceAssignments(from.id, { save: false });
        clearDecorBoroughServiceReservations(from.id);
        state.placedDecor.splice(index, 1);
      } else if (index < 0) {
        state.placedDecor.push(copyDecorEditItem(to));
      } else {
        const item = state.placedDecor[index];
        for (const key of Object.keys(copyDecorEditItem(item))) if (!(key in to)) delete item[key];
        Object.assign(item, copyDecorEditItem(to));
      }
    }
    state.decorInventory = Object.fromEntries(Object.entries(inventory).filter(([, count]) => count > 0));
    if (entry.gravelHillChange) {
      getCurrentTank().gravelHillSeed = hillTo;
      runtime.gravelHillProfile = null;
    }
    history[direction].pop();
    history[undo ? "redo" : "undo"].push(entry);
    finishDecorLayoutChange();
    showToast(`${undo ? "Undid" : "Redid"}: ${entry.label}.`);
  } finally {
    history.applying = false;
  }
  return true;
}

function finishDecorLayoutChange() {
  if (runtime.selectedDecorId && !state.placedDecor.some((item) => item.id === runtime.selectedDecorId)) clearSelectedDecor();
  state.gravelLivePebbles = [];
  runtime.boroughOverviewSnapshotCache?.clear();
  saveState();
  renderUi(Date.now());
}

function sanitizeSavedDecorLayouts(value) {
  const seen = new Set();
  return (Array.isArray(value) ? value : []).slice(0, 30).flatMap((layout) => {
    if (!layout || typeof layout.id !== "string" || !layout.id.trim() || seen.has(layout.id.slice(0, 100)) || !Array.isArray(layout.items)) return [];
    seen.add(layout.id.slice(0, 100));
    return [{ id: layout.id.slice(0, 100), name: String(layout.name || "Untitled layout").trim().slice(0, 40) || "Untitled layout",
      tankTypeId: String(layout.tankTypeId || ""),
      items: layout.items.slice(0, 500).map((source) => {
        const item = sanitizePlacedDecor(source);
        if (!item) return null;
        if (Number.isFinite(Number(source.xNorm))) item.xNorm = clamp(Number(source.xNorm), 0, 1);
        if (Number.isFinite(Number(source.yNorm))) item.yNorm = clamp(Number(source.yNorm), 0, 1);
        delete item.transitTubeLinkedId;
        return copyDecorEditItem(item);
      }).filter(Boolean) }];
  });
}

function saveNamedDecorLayout(name) {
  const cleanName = String(name || "").trim().slice(0, 40);
  if (!cleanName) return "Enter a name for this layout.";
  if (decorEditIsBusy()) return "Finish placing or moving decorations first.";
  state.savedDecorLayouts ||= [];
  if (state.savedDecorLayouts.length >= 30) return "You can save 30 layouts. Delete one to make room.";
  if (state.savedDecorLayouts.some((layout) => layout.name.toLowerCase() === cleanName.toLowerCase())) return "That name is already used. Choose a different name.";
  if (state.placedDecor.length > 500) return "Layouts can contain up to 500 decorations.";
  state.savedDecorLayouts.push({ id: createId("layout"), name: cleanName, tankTypeId: getCurrentTank().tankTypeId,
    items: state.placedDecor.map((source) => {
      const item = copyDecorEditItem(source);
      delete item.transitTubeLinkedId;
      return item;
    }) });
  saveState();
  return "";
}

function planSavedDecorLayout(layout) {
  const errors = [];
  if (layout.tankTypeId !== getCurrentTank().tankTypeId) errors.push("Use this layout in the same tank type it was saved from.");
  const available = { ...state.decorInventory };
  for (const item of state.placedDecor) available[item.decorKey] = (available[item.decorKey] || 0) + 1;
  const required = new Map();
  for (const item of layout.items) required.set(item.decorKey, (required.get(item.decorKey) || 0) + 1);
  for (const [key, count] of required) {
    const name = runtime.decorMap.get(key)?.name || titleFromFile(key);
    if (!runtime.decorMap.has(key) || !canUseDecorWithCurrentContentSettings(key) || !canDecorLiveInCurrentTank(key)) errors.push(`${name} is unavailable in this tank.`);
    else if ((available[key] || 0) < count) errors.push(`Missing ${count - (available[key] || 0)} × ${name}.`);
  }
  return { errors, available, required };
}

function applySavedDecorLayout(layoutId, tankId) {
  if (getCurrentTank()?.id !== tankId || decorEditIsBusy()) return "The tank changed. Close this preview and try again.";
  const layout = state.savedDecorLayouts?.find((entry) => entry.id === layoutId);
  if (!layout) return "This layout is no longer available.";
  const plan = planSavedDecorLayout(layout);
  if (plan.errors.length) return plan.errors.join(" ");
  const remaining = [...state.placedDecor];
  const groups = new Map();
  const placed = layout.items.map((saved) => {
    let index = remaining.findIndex((item) => item.id === saved.id && item.decorKey === saved.decorKey);
    if (index < 0) index = remaining.findIndex((item) => item.decorKey === saved.decorKey);
    const existing = index >= 0 ? remaining.splice(index, 1)[0] : null;
    const item = { ...existing };
    for (const key of Object.keys(copyDecorEditItem(item))) {
      if (key !== "transitTubeLinkedId") delete item[key];
    }
    Object.assign(item, copyDecorEditItem(saved), { id: existing?.id || createId("placed") });
    delete item.groupId;
    if (saved.groupId) {
      if (!groups.has(saved.groupId)) groups.set(saved.groupId, createId("decor-group"));
      item.groupId = groups.get(saved.groupId);
    }
    // Anchors are relative to the destination tank's current dimensions.
    updatePlacedDecorResizeAnchor(item);
    return item;
  });
  beginDecorEditHistory(`Apply ${layout.name}`);
  for (const item of remaining) {
    clearDecorResidenceAssignments(item.id, { save: false });
    clearDecorBoroughServiceReservations(item.id);
  }
  state.placedDecor = placed;
  state.decorInventory = Object.fromEntries(Object.entries(plan.available)
    .map(([key, count]) => [key, count - (plan.required.get(key) || 0)]).filter(([, count]) => count > 0));
  commitDecorEditHistory();
  finishDecorLayoutChange();
  showToast(`Applied ${layout.name}. You can undo this layout.`);
  return "";
}

function renderDecorHistoryControls() {
  const tray = dom.editDecorTray;
  if (!tray?.querySelector || !runtime.editTankMode) return;
  let controls = tray.querySelector(".decor-history-controls");
  if (!controls) {
    controls = document.createElement("div");
    controls.className = "decor-history-controls";
    controls.setAttribute("aria-label", "Decoration history and layouts");
    controls.innerHTML = '<button type="button" class="small-button alt" data-decor-history="undo">↶ Undo</button><button type="button" class="small-button alt" data-decor-history="redo">↷ Redo</button><button type="button" class="small-button" data-decor-layouts>Saved layouts</button>';
    tray.querySelector(".edit-decor-tray-header").append(controls);
    controls.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (button?.dataset.decorHistory) replayDecorEdit(button.dataset.decorHistory);
      if (button?.hasAttribute("data-decor-layouts")) openDecorLayoutsDialog();
    });
  }
  const history = getDecorEditHistory();
  for (const button of controls.querySelectorAll("[data-decor-history]")) {
    const direction = button.dataset.decorHistory;
    const entry = history?.[direction]?.at(-1);
    button.disabled = decorEditIsBusy() || !entry;
    const shortcut = direction === "undo" ? "Ctrl/Cmd+Z" : "Ctrl/Cmd+Shift+Z or Ctrl+Y";
    button.setAttribute("aria-keyshortcuts", direction === "undo" ? "Control+Z Meta+Z" : "Control+Shift+Z Meta+Shift+Z Control+Y");
    button.title = `${entry ? `${direction === "undo" ? "Undo" : "Redo"}: ${entry.label}` : `Nothing to ${direction}`} (${shortcut})`;
  }
  controls.querySelector("[data-decor-layouts]").disabled = decorEditIsBusy();
}

function handleDecorHistoryKey(event) {
  if (!runtime.editTankMode || !(event.ctrlKey || event.metaKey) || event.altKey) return false;
  if (document.querySelector(".decor-layout-dialog[open]")) return false;
  const key = String(event.key).toLowerCase();
  if (key !== "z" && key !== "y") return false;
  event.preventDefault();
  replayDecorEdit(key === "y" || event.shiftKey ? "redo" : "undo");
  return true;
}

function openDecorLayoutsDialog() {
  if (decorEditIsBusy() || document.querySelector(".decor-layout-dialog")) return;
  const tankId = getCurrentTank().id;
  const dialog = document.createElement("dialog");
  dialog.className = "decor-layout-dialog";
  dialog.setAttribute("aria-labelledby", "decor-layout-title");
  dialog.innerHTML = `<div class="decor-layout-heading"><h2 id="decor-layout-title">Saved layouts</h2><button class="small-button alt" type="button" data-layout-close aria-label="Close saved layouts">Close</button></div>
    <p>Save decoration positions, sizes, flips, layers, and appearance. Apply a layout using decorations in this tank and your inventory. Extra decorations return to storage.</p>
    <form class="decor-layout-save"><label for="decor-layout-name">Layout name</label><div><input id="decor-layout-name" maxlength="40" required placeholder="e.g. Planted retreat"><button class="small-button" type="submit">Save current layout</button></div></form>
    <p data-layout-status role="status" aria-live="polite"></p><div class="decor-layout-list"></div><section class="decor-layout-detail" hidden></section>`;
  document.body.append(dialog);
  dialog.addEventListener("close", () => { dialog.remove(); dom.editDecorTray?.querySelector("[data-decor-layouts]")?.focus(); });
  dialog.querySelector("[data-layout-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => event.stopPropagation());
  dialog.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = dialog.querySelector("input");
    const error = getCurrentTank().id !== tankId ? "The tank changed. Reopen saved layouts." : saveNamedDecorLayout(input.value);
    dialog.querySelector("[data-layout-status]").textContent = error || `Saved ${input.value.trim()}.`;
    if (!error) { input.value = ""; renderSavedDecorLayoutList(dialog, tankId); }
  });
  renderSavedDecorLayoutList(dialog, tankId);
  dialog.showModal();
}

function renderSavedDecorLayoutList(dialog, tankId) {
  const list = dialog.querySelector(".decor-layout-list");
  const layouts = state.savedDecorLayouts || [];
  list.innerHTML = layouts.length ? layouts.map((layout) => `<button class="small-button alt" type="button" data-layout-preview="${escapeHtml(layout.id)}">${escapeHtml(layout.name)} <span>(${layout.items.length})</span></button>`).join("") : '<p>No saved layouts yet. Name your current arrangement to keep it.</p>';
  list.onclick = (event) => {
    const button = event.target.closest("[data-layout-preview]");
    const layout = layouts.find((entry) => entry.id === button?.dataset.layoutPreview);
    if (layout) renderSavedDecorLayoutPreview(dialog, layout, tankId);
  };
}

function renderSavedDecorLayoutPreview(dialog, layout, tankId) {
  const detail = dialog.querySelector(".decor-layout-detail");
  const plan = planSavedDecorLayout(layout);
  detail.hidden = false;
  detail.innerHTML = `<h3>${escapeHtml(layout.name)}</h3><div class="decor-layout-preview" role="img" aria-label="Decoration arrangement preview"></div>
    <p>Decoration preview · ${layout.items.length} items. Fish, equipment, background, and gravel stay as they are.</p>
    <div data-layout-errors role="status">${plan.errors.map((error) => `<p>${escapeHtml(error)}</p>`).join("")}</div>
    <div class="decor-layout-actions"><button type="button" class="small-button" data-layout-apply ${plan.errors.length ? "disabled" : ""}>Apply layout</button><button type="button" class="small-button alt" data-layout-delete>Delete layout</button></div>`;
  const preview = detail.querySelector(".decor-layout-preview");
  preview.style.aspectRatio = `${TANK_WIDTH} / ${TANK_HEIGHT}`;
  for (const item of [...layout.items].sort((a, b) => b.tankLayer - a.tankLayer || a.yNorm - b.yNorm)) {
    const decor = runtime.decorMap.get(item.decorKey);
    if (!decor) continue;
    const bounds = getPlacedDecorBounds(item);
    if (!bounds) continue;
    const img = document.createElement("img");
    void setAssetImageSource(img, getDecorThumbnailPath(decor));
    img.alt = decor.name || titleFromFile(item.decorKey);
    img.style.cssText = `left:${bounds.left / TANK_WIDTH * 100}%;top:${bounds.top / TANK_HEIGHT * 100}%;width:${(bounds.right - bounds.left) / TANK_WIDTH * 100}%;height:${(bounds.bottom - bounds.top) / TANK_HEIGHT * 100}%;transform:scale(${item.flipped ? -1 : 1},${item.flippedY ? -1 : 1})`;
    preview.append(img);
  }
  detail.querySelector("[data-layout-apply]").onclick = () => {
    const error = applySavedDecorLayout(layout.id, tankId);
    if (error) detail.querySelector("[data-layout-errors]").textContent = error;
    else dialog.close();
  };
  detail.querySelector("[data-layout-delete]").onclick = (event) => {
    if (event.target.dataset.confirm !== "yes") {
      event.target.dataset.confirm = "yes";
      event.target.textContent = "Confirm delete";
      return;
    }
    state.savedDecorLayouts = state.savedDecorLayouts.filter((entry) => entry.id !== layout.id);
    saveState();
    detail.hidden = true;
    dialog.querySelector("[data-layout-status]").textContent = `Deleted ${layout.name}.`;
    renderSavedDecorLayoutList(dialog, tankId);
  };
  detail.scrollIntoView({ block: "nearest" });
}
