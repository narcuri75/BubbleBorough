// Opt-in local Chrome benchmark. Uses an isolated save and blocks remote requests.
// Set PLAYWRIGHT_MODULE if Playwright is not installed locally or in the Codex runtime.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createServer } = require('./start-web.cjs');
let playwright;
for (const candidate of [process.env.PLAYWRIGHT_MODULE, 'playwright', path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean)) {
  try { playwright = require(candidate); break; } catch {}
}
if (!playwright) throw new Error('Install Playwright separately or set PLAYWRIGHT_MODULE to its module path.');
const root = path.resolve(__dirname, '..');
const option = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const output = path.resolve(root, option('--output', '.review-artifacts/laptop-benchmark'));
const bundle = path.resolve(root, option('--bundle', 'game/public/app.js'));
const duration = Number(option('--duration', '8000'));
fs.mkdirSync(output, { recursive: true });
const stats = values => {
  const a = values.filter(Number.isFinite).sort((a, b) => a - b);
  const q = p => a[Math.max(0, Math.ceil(a.length * p) - 1)] || 0;
  return { n: a.length, mean: a.reduce((sum, n) => sum + n, 0) / (a.length || 1), p50: q(.5), p95: q(.95), p99: q(.99), max: q(1) };
};
const hooks = `
const benchOriginalDrawBroadcast = drawDebugFishBehaviorBroadcast;
const benchOriginalSyncBroadcast = syncDebugFishBehaviorBroadcast;
window.__bench = { runtime, get state(){return state}, getCurrentTank, createFishRecord, createPlacedDecor, preloadDecorArtwork, preloadImages, getTankSwitchPreloadPaths, renderUi, getSpeciesForFish, setFishDirection, createTankState, setActiveTank, openStoreOverlay, saveState, loadState, getEffectiveAnimationFpsLimit, getTankStageLayoutSize,
  restoreDiagnostics() { drawDebugFishBehaviorBroadcast = benchOriginalDrawBroadcast; syncDebugFishBehaviorBroadcast = benchOriginalSyncBroadcast; },
  diagnostics(on) {
    runtime.debugFishBehaviorBroadcastEnabled = on;
    runtime.debugFishBehaviorLoggingEnabled = on;
    drawDebugFishBehaviorBroadcast = on ? benchOriginalDrawBroadcast : () => {};
    syncDebugFishBehaviorBroadcast = on ? benchOriginalSyncBroadcast : () => {};
  }
};
window.__benchFrames = [];
runtime.debugFrameProfilerEnabled = true;
const benchFinish = finishDebugFrameProfile;
finishDebugFrameProfile = function(){const sample = runtime.frameProfilerCurrent; const result = benchFinish(); if(sample) __benchFrames.push(sample); return result;};
window.__benchCalls = {};
${['getFishNeedValue','sanitizeFishNeeds','getDerivedFishNeedDefaults','getTankComfortFacts','getFishComfort','getFishDisposition','getFishSocialProfile','getDebugFishBehaviorSnapshot','getBaseTankDirtiness','getTankMaxDirtyDurationMs','getTankStageLayoutSize','getFishAssetPath'].map(name => `const benchOriginal_${name} = ${name}; ${name} = function(...args){window.__benchCalls['${name}'] = (window.__benchCalls['${name}'] || 0) + 1; return benchOriginal_${name}(...args);};`).join('\n')}
${process.argv.includes('--verify-social') ? `
window.__bench.verifySocial = ((currentProfile, currentDisposition) => {
  ${fs.readFileSync(path.join(__dirname, 'fixtures/runtime-before-batch3.js'), 'utf8')}
  return () => {
    if (currentProfile === getFishSocialProfile || currentDisposition === getFishDisposition) {
      throw new Error('Social verifier requires distinct current and reference functions');
    }
    const now = Date.now();
    let catalogProfiles = 0, moods = 0, liveEdits = 0;
    const compare = (actual, expected, label) => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Social parity failed: ' + label);
    };
    for (const species of runtime.fishMap.values()) {
      for (const input of [species.id, species, { id: 'parity-' + species.id, speciesId: species.id }]) {
        compare(currentProfile(input), getFishSocialProfile(input), species.id);
        catalogProfiles++;
      }
    }
    for (const fish of state.fish) {
      compare(currentDisposition(fish, now), getFishDisposition(fish, now), fish.id);
      moods++;
    }
    const fish = state.fish[0];
    if (fish) {
      const keys = ['socialMode', 'socialHostSpeciesIds'];
      const saved = keys.map(key => ({ key, present: Object.hasOwn(fish, key), value: fish[key] }));
      try {
        fish.socialMode = 'host'; fish.socialHostSpeciesIds = ['guppy'];
        compare(currentProfile(fish), getFishSocialProfile(fish), 'live override'); liveEdits++;
        fish.socialHostSpeciesIds.push('betta');
        compare(currentProfile(fish), getFishSocialProfile(fish), 'in-place host edit'); liveEdits++;
        fish.socialMode = 'solitary';
        compare(currentDisposition(fish, now), getFishDisposition(fish, now), 'live mood'); liveEdits++;
      } finally {
        for (const entry of saved) {
          if (entry.present) fish[entry.key] = entry.value;
          else delete fish[entry.key];
        }
      }
      compare(currentProfile(fish), getFishSocialProfile(fish), 'restored override'); liveEdits++;
    }
    // This fixed-input comparison runs after all gameplay timings and profiling.
    // Use the unwrapped getter on both sides to exclude call-counter overhead.
    const profileTiming = [];
    const timeProfiles = fn => {
      let checksum = 0;
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        const value = fn(state.fish[i % state.fish.length]);
        checksum += value.socialMinimum + value.hostSpeciesIds.length + value.affinityGroups.length;
      }
      return { ms: performance.now() - start, checksum };
    };
    if (state.fish.length) {
      timeProfiles(getFishSocialProfile); timeProfiles(benchOriginal_getFishSocialProfile);
      for (let round = 0; round < 4; round++) {
        const order = round % 2 ? ['after', 'before'] : ['before', 'after'];
        const row = {};
        for (const name of order) row[name] = timeProfiles(name === 'before' ? getFishSocialProfile : benchOriginal_getFishSocialProfile);
        if (row.before.checksum !== row.after.checksum) throw new Error('Profile timing checksum mismatch');
        profileTiming.push(row);
      }
    }
    return { verifierVersion: 2, catalogProfiles, moods, liveEdits, profileTiming };
  };
})(benchOriginal_getFishSocialProfile, benchOriginal_getFishDisposition);` : ''}
`;
(async () => {
  const server = createServer({ production: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const report = { date: new Date().toISOString(), bundle, duration, environment: { viewport: '1280x800', dpr: 1, cpuThrottle: 1, headless: !process.argv.includes('--headed'), save: 'isolated local playtest', seed: 77119, network: 'local; remote requests blocked' }, scenarios: [] };
  const errors = [], failed = [];
  const write = () => fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  try {
    browser = await playwright.chromium.launch({ channel: 'chrome', headless: report.environment.headless });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failed.push({ url: response.url(), status: response.status() }); });
    await page.addInitScript(() => {
      let seed = 77119;
      Math.random = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
      window.__benchLongTasks = [];
      try { new PerformanceObserver(list => __benchLongTasks.push(...list.getEntries().map(e => e.toJSON()))).observe({ type: 'longtask', buffered: true }); } catch {}
    });
    await page.route('**/*', route => {
      const url = route.request().url();
      if (!url.startsWith(origin + '/')) return route.abort();
      if (/\/public\/app\.js\?/.test(url)) return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(bundle, 'utf8') + '\n' + hooks });
      return route.continue();
    });
    const cdp = await page.context().newCDPSession(page);
    await page.goto(origin + '/play?playtest=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__bench?.runtime.lastAnimationFrameAt > 0 && document.querySelector('#loadingOverlay')?.hidden, { timeout: 90000 });
    if (await page.locator('#introTutorialCloseButton').isVisible()) await page.locator('#introTutorialCloseButton').click();
    await page.locator('[data-tank-setup-username]').fill('PerformanceTest');
    await page.locator('[data-tank-setup-confirm]').click();
    await page.locator('[data-tank-setup-dialog]').waitFor({ state: 'detached' });
    await page.locator('[data-acknowledge-hardware-acceleration-notice]').click();
    await page.locator('[data-acknowledge-hardware-acceleration-notice]').waitFor({ state: 'hidden' });
    report.environment.browser = browser.version();
    report.defaultDiagnostics = await page.evaluate(() => ({ labels: __bench.runtime.debugFishBehaviorBroadcastEnabled ?? 'legacy automatic', recording: __bench.runtime.debugFishBehaviorLoggingEnabled ?? 'legacy automatic' }));
    report.environment.hardware = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl'), ext = gl?.getExtension('WEBGL_debug_renderer_info');
      return { cores: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null };
    });
    async function scene(count) {
      await page.evaluate(async count => {
        const p = __bench, tank = p.getCurrentTank();
        tank.fish = Array.from({ length: count }, (_, i) => p.createFishRecord(['guppy', 'neon-tetra', 'goldfish', 'betta'][i % 4], { id: 'bench-' + i, xNorm: .15 + (i % 6) * .13, yNorm: .2 + Math.floor(i / 6) * .12, tankLayer: 3, direction: 1, targetXNorm: .85 }));
        if (tank.fish.some(f => !f)) throw new Error('Invalid benchmark fish fixture');
        for (const fish of tank.fish) { fish.entryStartedAt = 0; fish.entryDurationMs = 0; }
        if (p.state.tutorial) p.state.tutorial.completed = true;
        p.runtime.freshGameSaveLocked = false;
        p.state.foodInventory.basic = 1000; p.state.coins = 10000;
        await p.preloadImages(p.getTankSwitchPreloadPaths(tank)); p.renderUi();
      }, count);
      await page.waitForTimeout(5000);
    }
    await scene(8);
    report.decor = await page.evaluate(async () => {
      const p = __bench, selected = [...p.runtime.decorMap.values()].filter(d => /amazon.sword|broken.terracotta|treasure.chest/.test(d.key)).slice(0, 3);
      if (selected.length !== 3) throw new Error('Invalid benchmark decor fixture');
      for (let i = 0; i < selected.length; i++) { const d = selected[i]; p.state.decorInventory[d.key] = 1; await p.preloadDecorArtwork(d); if (!p.createPlacedDecor(d.key, .25 + i * .25, .8, 3)) throw new Error('Decor placement failed'); }
      p.renderUi(); return selected.map(d => d.key);
    });
    await page.waitForTimeout(5000);
    async function measure(name, action) {
      const start = await page.evaluate(() => { window.__benchFrames = []; window.__benchCalls = {}; return performance.now(); });
      if (action) await action();
      await page.waitForTimeout(duration);
      const data = await page.evaluate(start => ({ elapsed: performance.now() - start, frames: __benchFrames, calls: __benchCalls, longTasks: __benchLongTasks.filter(e => e.startTime >= start), fish: __bench.state.fish.length, cap: __bench.getEffectiveAnimationFpsLimit() }), start);
      const keys = [...new Set(data.frames.flatMap(f => Object.keys(f.sections)))];
      const counterKeys = [...new Set(data.frames.flatMap(f => Object.keys(f.counters || {})))];
      const row = { name, elapsedMs: data.elapsed, fish: data.fish, cap: data.cap, processedFps: data.frames.length / (data.elapsed / 1000), work: stats(data.frames.map(f => f.workMs)), gap: stats(data.frames.map(f => f.renderGapMs)), sections: Object.fromEntries(keys.map(key => [key, stats(data.frames.map(f => f.sections[key] || 0))])), counters: Object.fromEntries(counterKeys.map(key => [key, stats(data.frames.map(f => f.counters?.[key] || 0))])), calls: data.calls, callsPerFrame: Object.fromEntries(Object.entries(data.calls).map(([key, n]) => [key, n / data.frames.length])), longTasks: stats(data.longTasks.map(e => e.duration)) };
      report.scenarios.push(row); write();
      console.log(name, JSON.stringify({ fps: row.processedFps, work: row.work, motion: row.sections.fishMotion?.mean, draw: row.sections.fishDraw?.mean, callsPerFrame: row.callsPerFrame }));
      await page.screenshot({ path: path.join(output, name + '.png') });
    }
    await page.evaluate(() => __bench.diagnostics(false));
    await measure('decorated-8');
    await scene(20);
    await measure('decorated-20');
    await page.evaluate(() => __bench.diagnostics(true));
    await measure('decorated-20-diagnostics');
    await page.evaluate(() => __bench.diagnostics(false));
    await measure('turning-20', () => page.evaluate(() => { const p = __bench; for (const f of p.state.fish) p.setFishDirection(f, -f.displayDirection, p.getSpeciesForFish(f), Date.now(), { bypassTurnCommitment: true, allowStationaryTurn: true }); }));
    await measure('feeding-20', async () => { await page.locator('#careMenuButton').click(); await page.locator('#medicineTrayScroller [data-select-food="basic"]').click(); await page.mouse.click(500, 250); await page.mouse.click(650, 250); });
    await measure('editing-20', () => page.locator('#editMenuButton').click());
    await page.keyboard.press('Escape');
    await measure('shop-20', () => page.evaluate(() => __bench.openStoreOverlay('fish', { forceCategory: true })));
    await page.locator('#closeStoreOverlay').click();
    await page.keyboard.press('Escape');
    if (process.argv.includes('--social-fixture')) {
      await scene(20);
      await page.evaluate(() => {
        const fish = __bench.state.fish;
        for (let i = 0; i < fish.length; i++) {
          const partner = fish[(i + 4) % fish.length];
          fish[i].relationships = { [partner.id]: { kind: 'friend', score: 80, updatedAt: Date.now() } };
          fish[i].xNorm = .2 + Math.floor(i / 4) * .12;
          fish[i].yNorm = .35 + (i % 4) * .06;
        }
      });
      await page.waitForTimeout(5000);
      await measure('social-20');
    }
    report.switches = [];
    const ids = await page.evaluate(() => { const p = __bench, first = p.getCurrentTank(), second = p.createTankState({ name: 'Benchmark alternate', gridX: 1, setupPending: false }); second.fish = ['danio', 'guppy'].map((s, i) => p.createFishRecord(s, { id: 'alternate-' + i })); if (second.fish.some(f => !f)) throw new Error('Invalid alternate fixture'); p.state.tanks.push(second); return [first.id, second.id]; });
    for (let i = 0; i < 6; i++) {
      const id = ids[i % 2 ? 0 : 1], start = Date.now();
      await page.evaluate(id => __bench.setActiveTank(id), id);
      await page.waitForFunction(id => __bench.state.activeTankId === id && !__bench.runtime.tankSwitchTransitionActive, id, { timeout: 30000 });
      const switchMs = Date.now() - start;
      await page.waitForTimeout(750); await cdp.send('HeapProfiler.collectGarbage');
      report.switches.push({ switchMs, ...await page.evaluate(() => ({ fish: __bench.state.fish.length, heap: performance.memory?.usedJSHeapSize, images: __bench.runtime.images.size, bodyShapes: __bench.runtime.fishTurnV26BodyShapeCache?.size })) });
    }
    report.saveRoundTrip = await page.evaluate(() => {
      const p = __bench; p.saveState(); const loaded = p.loadState();
      const tank = loaded?.tanks?.find(t => t.id === p.state.activeTankId);
      return { tanks: loaded?.tanks?.length, activeFish: tank?.fish?.length, needsShape: tank?.fish?.every(f => ['hunger','energy','social','comfort','hygiene','environment','stimulation'].every(key => Number.isFinite(Number(f.needs?.[key])))) };
    });
    if (report.saveRoundTrip.activeFish !== 20 || !report.saveRoundTrip.needsShape) throw new Error('Save round-trip failed');
    if (process.argv.includes('--verify-ui')) {
      await page.evaluate(() => __bench.restoreDiagnostics());
      await page.locator('#toggleDebugMenuButton').click();
      await page.locator('#debugFishBehaviorLabelsToggle').click();
      await page.locator('#debugFishBehaviorRecordingToggle').click();
      await page.waitForTimeout(600);
      report.diagnosticsControls = await page.evaluate(() => ({ labels: __bench.runtime.debugFishBehaviorBroadcastEnabled, recording: __bench.runtime.debugFishBehaviorLoggingEnabled, snapshots: __bench.runtime.debugFishBehaviorSnapshots.size, labelPressed: document.querySelector('#debugFishBehaviorLabelsToggle').getAttribute('aria-pressed'), recordPressed: document.querySelector('#debugFishBehaviorRecordingToggle').getAttribute('aria-pressed') }));
      if (!report.diagnosticsControls.labels || !report.diagnosticsControls.recording || !report.diagnosticsControls.snapshots || report.diagnosticsControls.labelPressed !== 'true' || report.diagnosticsControls.recordPressed !== 'true') throw new Error('Diagnostic controls failed');
      await page.screenshot({ path: path.join(output, 'diagnostics-controls.png') });
      await page.locator('#debugFishBehaviorLabelsToggle').click();
      await page.locator('#debugFishBehaviorRecordingToggle').click();
      await page.locator('#toggleDebugMenuButton').click();
    }
    if (process.argv.includes('--profile')) {
      await cdp.send('Profiler.enable'); await cdp.send('Profiler.start');
      await page.waitForTimeout(6000);
      const { profile } = await cdp.send('Profiler.stop');
      fs.writeFileSync(path.join(output, 'steady-20.cpuprofile'), JSON.stringify(profile));
    }
    if (process.argv.includes('--verify-ui')) {
      report.layoutResize = [];
      for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(750);
        const layout = await page.evaluate(() => {
          const p = __bench, stage = document.querySelector('#tankStage'), measured = p.getTankStageLayoutSize();
          return { width: measured.width, height: measured.height, actualWidth: stage.clientWidth, actualHeight: stage.clientHeight,
            evaluationSnapshotReleased: !p.runtime.tankStageEvaluationLayout, renderSnapshotReleased: !p.runtime.tankStageRenderLayout };
        });
        report.layoutResize.push({ viewport, ...layout });
        if (layout.width !== layout.actualWidth || layout.height !== layout.actualHeight || !layout.evaluationSnapshotReleased || !layout.renderSnapshotReleased) throw new Error('Stale stage layout after resize');
      }
      await page.screenshot({ path: path.join(output, 'resize-restored.png') });
    }
    if (process.argv.includes('--verify-social')) {
      report.socialParity = await page.evaluate(() => __bench.verifySocial());
    }
    report.errors = errors; report.failedResponses = failed;
    write();
    if (errors.length || failed.length) throw new Error('Browser errors or failed local resources; see results.json');
    console.log('COMPLETE', JSON.stringify({ switches: report.switches, errors, failed }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
