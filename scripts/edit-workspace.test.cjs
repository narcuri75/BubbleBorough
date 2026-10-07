"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");
const root = path.resolve(__dirname, "../game/public/app-src");
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function load(file, names, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text));
  assert.equal(declarations.length, names.length);
  return vm.runInNewContext(`${declarations.map(node => node.getText(source)).join("\n")}\n({${names.join(",")}})`, context);
}

test("editor layout uses saved logical stage dimensions, regardless of the browser's presentation size", () => {
  const runtime = { fishEditMode: true };
  const layout = { width: 1366, height: 768 };
  const api = load("ui/tool-modes-and-debug-panels.js", ["isEditWorkspaceActive", "isEditWorkspaceSidebarLayout"], {
    runtime, getTankStageLayoutSize: () => layout, window: { innerWidth: 390, innerHeight: 844 }
  });
  assert.equal(api.isEditWorkspaceSidebarLayout(), true);
  layout.width = 800;
  assert.equal(api.isEditWorkspaceSidebarLayout(), false);
  layout.width = 1366; layout.height = 400;
  assert.equal(api.isEditWorkspaceSidebarLayout(), false);
  layout.height = 768; runtime.fishEditMode = false;
  assert.equal(api.isEditWorkspaceSidebarLayout(), false);
});

test("expanded and collapsed panels leave a usable tank rectangle inside every supported workspace", () => {
  const { getEditWorkspaceGeometry } = load("assets/custom-content.js", ["getEditWorkspaceGeometry"], { clamp });
  for (const [width, height] of [[900,480], [1024,768], [1366,768], [1920,1080], [2560,1440]]) {
    const expanded = getEditWorkspaceGeometry({ width, height });
    assert.ok(expanded.viewportWidth > 400);
    assert.ok(expanded.viewportHeight > 200);
    assert.equal(expanded.top + expanded.sideHeight + expanded.gap + expanded.bottomHeight + expanded.bottom, height);
    assert.equal(expanded.viewportLeft + expanded.viewportWidth + expanded.gap + expanded.rightWidth + expanded.edge, width);
    for (const options of [{leftCollapsed:true}, {rightCollapsed:true}, {leftCollapsed:true,rightCollapsed:true}]) {
      const collapsed = getEditWorkspaceGeometry({width,height}, options);
      assert.ok(collapsed.viewportWidth > expanded.viewportWidth);
      assert.equal(collapsed.viewportHeight, expanded.viewportHeight);
      assert.ok(collapsed.viewportLeft >= expanded.edge);
      assert.ok(collapsed.viewportLeft + collapsed.viewportWidth <= width - expanded.edge);
    }
  }
});

test("tank camera fits the full framed tank into the center without changing virtual tank proportions", () => {
  const geometry = load("assets/custom-content.js", ["getEditWorkspaceGeometry"], { clamp });
  const layout = {width:1366,height:768};
  const runtime = { fishEditMode: true, editWorkspaceGeometry: geometry.getEditWorkspaceGeometry(layout) };
  const api = load("assets/custom-content.js", ["getStageRenderViewTarget"], {
    runtime, dom: {editFishTray:{}}, TANK_WIDTH:1600, TANK_HEIGHT:900, clamp,
    getTankStageLayoutSize: () => layout, getStageRenderDevicePixelRatio: () => 2,
    isStageEditTrayActuallyVisible: tray => Boolean(tray),
    getElementRectInTankStageLayout: () => ({top:18}),
    getDecorEditTankFrameGeometry: () => ({height:880,top:10}),
    window: {BubbleBoroughTankFrame:{FRAME_CONFIG:{horizontalBarHeight:79}}}
  });
  const target = api.getStageRenderViewTarget();
  const region = runtime.editWorkspaceGeometry;
  assert.equal(target.editAmount, 1);
  assert.ok(target.offsetX >= region.viewportLeft * 2);
  assert.ok(target.offsetX + 1600 * target.scale <= (region.viewportLeft + region.viewportWidth) * 2 + 0.001);
  const barHeight = 79 * 1600 / layout.width;
  const frameTop = target.offsetY - (barHeight - 10) * target.scale;
  assert.ok(frameTop >= region.top * 2 - 0.001);
  assert.ok(frameTop + (880 + barHeight * 2) * target.scale <= (region.top + region.viewportHeight) * 2 + 0.001);
  runtime.fishEditMode = false;
  const normal = api.getStageRenderViewTarget();
  assert.equal(normal.editAmount, 0);
  assert.equal(normal.scale, Math.max(layout.width * 2 / 1600, layout.height * 2 / 900));
});

test("switching panel tools uses existing mode transitions and does nothing outside the workspace", () => {
  const runtime = { editTankMode:true };
  let workspace = true;
  const calls = [];
  const { activateEditWorkspaceTool } = load("ui/tool-modes-and-debug-panels.js", ["activateEditWorkspaceTool"], {
    runtime, isEditWorkspaceSidebarLayout: () => workspace,
    openEditOverlayMode: mode => { calls.push(mode); }
  });
  activateEditWorkspaceTool("decor");
  assert.equal(calls.length,0);
  activateEditWorkspaceTool("fish");
  assert.deepEqual(calls,["fish"]);
  workspace = false;
  activateEditWorkspaceTool("equipment");
  assert.deepEqual(calls,["fish"]);
  assert.equal(runtime.editTankMode,true);
});

test("decor dropdown supports every existing type and resets the correct scroll axis", () => {
  const runtime = {editDecorTrayTab:"all"};
  const scroller = {scrollTop:150,scrollLeft:90};
  let closes=0, renders=0;
  const { setEditDecorTypeFilter } = load("ui/customization-actions-and-inventory.js", ["setEditDecorTypeFilter"], {
    runtime, dom:{editDecorTrayScroller:scroller},
    closeEditDecorTrayContextMenu: () => closes++, renderEditDecorTray: () => renders++
  });
  const types=["plants","caves","coral","rocks","wood","ornaments","bubbler","seasonal","custom","all"];
  for (const type of types) {
    setEditDecorTypeFilter(type);
    assert.equal(runtime.editDecorTrayTab,type);
    assert.equal(scroller.scrollTop,0); assert.equal(scroller.scrollLeft,0);
  }
  assert.equal(closes,types.length); assert.equal(renders,types.length);
  setEditDecorTypeFilter("all"); assert.equal(renders,types.length);
  setEditDecorTypeFilter("plants"); setEditDecorTypeFilter("invalid");
  assert.equal(runtime.editDecorTrayTab,"all");
});

test("sidebar menus stay inside the logical stage when Ratio Lock scales their screen coordinates", () => {
  const tray = {getBoundingClientRect: () => ({width:130,left:1000,top:10})};
  const menu = {style:{},getBoundingClientRect: () => ({width:150,height:200})};
  const { positionEditTrayContextMenu } = load("ui/customization-actions-and-inventory.js", ["positionEditTrayContextMenu"], {
    runtime:{editWorkspaceGeometry:{}},clamp,
    getTankStageVisualMetrics: () => ({visualToLayoutX:2,visualToLayoutY:2,layoutWidth:1920,layoutHeight:1080}),
    getElementRectInTankStageLayout: () => ({left:1646,top:18})
  });
  positionEditTrayContextMenu(tray,menu,120,400);
  const x=1646+parseFloat(menu.style.left),y=18+parseFloat(menu.style.top);
  assert.ok(x>=8 && x+300<=1912); assert.ok(y>=8 && y+400<=1072);
});

test("opening a fish menu from another tool retains its anchor across the sidebar rebuild", () => {
  const menuState = {};
  let anchorAttached = true;
  let rendered = false;
  const { openEditFishTrayContextMenu } = load("ui/customization-actions-and-inventory.js", ["openEditFishTrayContextMenu"], {
    dom: { editFishTray: {} }, runtime: { editFishTrayContextMenuState: menuState },
    resolveEditTrayContextMenuAnchor: () => anchorAttached ? { x: 130, y: 260 } : { x: 0, y: 0 },
    activateEditWorkspaceTool: () => { anchorAttached = false; },
    getManagedFishById: () => ({ inStorage: true, fish: {} }),
    isFishDead: () => false, closeEditFishTrayContextMenu: () => {},
    renderEditFishTrayContextMenu: () => { rendered = true; }
  });
  openEditFishTrayContextMenu("stored-fish", {});
  assert.equal(menuState.anchorX, 130);
  assert.equal(menuState.anchorY, 260);
  assert.equal(menuState.fishId, "stored-fish");
  assert.equal(rendered, true);
});
