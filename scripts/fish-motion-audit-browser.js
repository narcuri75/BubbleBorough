/* Local observational harness; loaded only by .fish-motion-audit.html. */
(() => {
  const panel = document.createElement("pre");
  panel.id = "fishMotionAudit";
  panel.style.cssText = "position:fixed;top:8px;left:8px;z-index:2147483647;max-width:560px;max-height:35vh;overflow:auto;padding:12px;background:#07151fee;color:#a7f3d0;font:12px monospace;pointer-events:none";
  panel.textContent = "Motion audit: waiting for aquarium";
  document.body.append(panel);
  const previous = new Map();
  const stats = { seconds: 0, frames: 0, fishSamples: 0, turns: 0, detourSamples: 0,
    invalidPoses: 0, largeSteps: 0, rapidReturnTurns: 0, maxStepNorm: 0, maxTurnMs: 0 };
  let lastAt = 0, nextReport = 0;
  const recent = [];
  function sample(at) {
    requestAnimationFrame(sample);
    try {
      if (typeof state === "undefined" || !state?.fish?.length) return;
      const overlay = document.getElementById("loadingOverlay");
      if (overlay && getComputedStyle(overlay).display !== "none" && getComputedStyle(overlay).visibility !== "hidden" && Number(getComputedStyle(overlay).opacity) > 0.1) {
        lastAt = 0;
        return;
      }
      const dt = lastAt ? (at - lastAt) / 1000 : 0;
      lastAt = at;
      if (!dt || dt > 0.2) { previous.clear(); return; }
      stats.seconds += dt;
      stats.frames++;
      const now = Date.now();
      recent.length = 0;
      for (const [index, fish] of state.fish.entries()) {
        const p = previous.get(fish.id);
        stats.fishSamples++;
        if (!Number.isFinite(fish.xNorm) || !Number.isFinite(fish.yNorm)) stats.invalidPoses++;
        if (Number(fish.traversalObstacleUntil) > now) stats.detourSamples++;
        const started = Number(fish.turnStartedAt) || 0;
        let lastTurn = p?.lastTurn || 0;
        if (started && started !== p?.started) {
          stats.turns++;
          if (lastTurn && started - lastTurn < Number(fish.turnDurationMs) + 150) stats.rapidReturnTurns++;
          lastTurn = started;
        }
        if (started) stats.maxTurnMs = Math.max(stats.maxTurnMs, now - started);
        if (p) {
          const step = Math.hypot(fish.xNorm - p.x, fish.yNorm - p.y);
          stats.maxStepNorm = Math.max(stats.maxStepNorm, step);
          if (step > 0.025) stats.largeSteps++;
        }
        previous.set(fish.id, { x: fish.xNorm, y: fish.yNorm, started, lastTurn });
        recent.push(`${index + 1} ${fish.activity} ${fish.behaviorBrain?.intention || "-"} x=${fish.xNorm.toFixed(3)} y=${fish.yNorm.toFixed(3)} ${started ? "turn" : "swim"}`);
      }
      if (at >= nextReport) {
        nextReport = at + 1000;
        panel.textContent = "LIVE MOTION AUDIT (read-only)\n" + JSON.stringify({ ...stats,
          seconds: +stats.seconds.toFixed(1), sampledFps: +(stats.frames / stats.seconds).toFixed(1),
          maxStepNorm: +stats.maxStepNorm.toFixed(5) }, null, 2) + "\n" + recent.join("\n");
      }
    } catch (error) { panel.textContent = `Motion audit error: ${error.message}`; }
  }
  requestAnimationFrame(sample);
})();
