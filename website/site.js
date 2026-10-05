(() => {
  const canvas = document.querySelector(".ambient-bubbles");
  if (canvas && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const ctx = canvas.getContext("2d"), image = new Image();
    // requestAnimationFrame timestamps restart on every static-page load. Map
    // them onto wall-clock time so the deterministic game particle field keeps
    // its current phase when navigating between GitHub Pages documents.
    const motionEpoch = Date.now() - performance.now();
    let scrollPhase = 0, scrollVelocity = 0, lastScrollY = scrollY, lastScrollTime = performance.now(), lastFrameTime = performance.now();
    addEventListener("scroll", () => {
      const now = performance.now(), delta = scrollY - lastScrollY, elapsed = Math.max(8, now - lastScrollTime);
      scrollVelocity = Math.max(-4, Math.min(4, delta / elapsed));
      scrollPhase += delta * 1.8;
      lastScrollY = scrollY;
      lastScrollTime = now;
    }, { passive: true });
    const requestAnimationFrame = callback => window.requestAnimationFrame(timestamp => {
      const elapsed = Math.min(100, Math.max(0, timestamp - lastFrameTime));
      scrollPhase += scrollVelocity * elapsed * .42;
      scrollVelocity *= Math.pow(.84, elapsed / 16.67);
      lastFrameTime = timestamp;
      callback(timestamp + motionEpoch + scrollPhase);
    });
    let seed = 34127;
    const rand = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let value = Math.imul(seed ^ seed >>> 15, 1 | seed); value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value; return ((value ^ value >>> 14) >>> 0) / 4294967296; };
    const profiles = { 1: [.42, .84, .76, 3.5, 7600], 2: [.68, 1, .94, 6.2, 6100], 3: [.94, 1.15, 1.12, 8.4, 4700] };
    // These are the same 30 seeded particles and motion ranges as createSceneSeeds().
    const bubbles = Array.from({ length: 30 }, () => { const roll = rand(); return { x: .08 + rand() * .84, size: 3.2 + rand() * 9.2, speed: .03 + rand() * .08, offset: rand(), wobble: 6 + rand() * 18, wave: 4 + rand() * 6, alpha: .18 + rand() * .32, spriteScale: 2.8 + rand() * 2.6, count: 2 + Math.floor(rand() * 3), style: roll < .22 ? "sprite" : roll < .52 ? "cluster" : roll < .78 ? "fizz" : "ring", layer: 1 + Math.min(4, Math.floor(Math.pow(rand(), .86) * 5)) }; });
    const resize = () => { const ratio = Math.min(2, devicePixelRatio || 1); canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); };
    const orb = (x, y, radius, alpha, stretch = 1) => { y = (y - innerHeight / 2) * 1.18 + innerHeight / 2; const size = radius * 2.3; ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(stretch, 1); ctx.drawImage(image, -size / 2, -size / 2, size, size); ctx.restore(); };
    const frame = now => { ctx.clearRect(0, 0, innerWidth, innerHeight); for (const bubble of bubbles) { const [alphaScale, sizeScale, wobbleScale, parallaxPx, parallaxMs] = profiles[Math.min(3, bubble.layer)] || profiles[3]; const progress = ((now / 1000) * bubble.speed + bubble.offset) % 1; const radius = bubble.size * sizeScale, alpha = bubble.alpha * alphaScale; const x = bubble.x * innerWidth + Math.sin(progress * bubble.wave + bubble.offset * 8) * bubble.wobble * wobbleScale + Math.cos(now / parallaxMs + bubble.offset * 11) * parallaxPx; const y = innerHeight + 18 - progress * (innerHeight + 54); if (bubble.style === "cluster") { orb(x, y, radius * .78, alpha); orb(x + radius * .74, y - radius * .48, radius * .5, alpha * .84, 1.04); orb(x - radius * .6, y + radius * .46, radius * .42, alpha * .74, .92); } else if (bubble.style === "fizz") { for (let index = 0; index < bubble.count; index += 1) orb(x + Math.sin(now / 460 + bubble.offset * 14 + index) * 1.8 * wobbleScale, y + index * radius * .95, radius * (.26 + index * .08), alpha * (.85 - index * .1)); } else orb(x, y, bubble.style === "sprite" ? radius * bubble.spriteScale : radius, alpha); } requestAnimationFrame(frame); };
    image.addEventListener("load", () => { resize(); addEventListener("resize", resize, { passive: true }); requestAnimationFrame(frame); }, { once: true });
    image.src = "/game/assets/misc/bubble.webp";
  }
  const setupFilters = selector => {
    const root = document.querySelector(selector);
    if (!root) return;
    const search = root.querySelector("[type=search]");
    const buttons = [...root.querySelectorAll("[data-filter]")];
    const cards = [...root.querySelectorAll("[data-search]")];
    const filters = { water: "all", category: "all", genetics: "all", behavior: "all", diet: "all" };
    const update = () => cards.forEach(card => {
      const matchesSearch = !search.value || card.dataset.search.includes(search.value.trim().toLowerCase());
      const matchesFilter = Object.entries(filters).every(([field, value]) => value === "all" || card.dataset[field] === value);
      card.hidden = !(matchesSearch && matchesFilter);
    });
    root.querySelectorAll(".decor-category").forEach(section => { section.hidden = ![...section.querySelectorAll("[data-search]")].some(card => !card.hidden); });
    search?.addEventListener("input", update);
    buttons.forEach(button => button.addEventListener("click", () => {
      const field = button.dataset.filterField || (root.matches("[data-fish-catalog]") ? "water" : "category");
      filters[field] = button.dataset.filter;
      buttons.filter(item => (item.dataset.filterField || (root.matches("[data-fish-catalog]") ? "water" : "category")) === field).forEach(item => item.setAttribute("aria-pressed", String(item === button)));
      update();
    }));
  };
  const initializeCatalogs = () => {
    setupFilters("[data-fish-catalog]");
    setupFilters("[data-decor-catalog]");
  };
  initializeCatalogs();
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-variant-src]");
    if (!button) return;
    const card = button.closest(".fish-card");
    const image = card?.querySelector("[data-main-fish-image]");
    if (!image) return;
    image.src = button.dataset.variantSrc;
    image.alt = button.dataset.variantAlt;
    card.querySelectorAll("[data-variant-src]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
  });
  document.querySelectorAll("[data-crossfade-video]").forEach(container => {
    const videos = [...container.querySelectorAll("video")];
    if (videos.length !== 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const fadeDuration = 1000;
    let active = 0;
    let loopTimer;
    const queueTransition = () => {
      window.clearTimeout(loopTimer);
      const current = videos[active];
      if (!Number.isFinite(current.duration) || current.duration <= 1) return;
      loopTimer = window.setTimeout(() => {
        const next = (active + 1) % videos.length;
        const incoming = videos[next];
        incoming.currentTime = 0;
        incoming.play().catch(() => {});
        incoming.classList.add("is-visible");
        window.setTimeout(() => {
          current.pause();
          current.currentTime = 0;
          current.classList.remove("is-visible");
          active = next;
          queueTransition();
        }, fadeDuration);
      }, Math.max(0, (current.duration * 1000) - fadeDuration));
    };
    const first = videos[0];
    first.addEventListener("loadedmetadata", queueTransition, { once: true });
    first.play().catch(() => {});
  });
  const isPublicPage = url => /^\/(?:index\.html|website\/(?:fish\/fish|decor\/decor|about\/about|faqs\/faqs|news\/news)\.html)?$/.test(url.pathname);
  const loadPublicPage = async (url, pushState = true) => {
    const response = await fetch(url.href, { headers: { Accept: "text/html" } });
    if (!response.ok) throw new Error(`Could not load ${url.pathname}`);
    const next = new DOMParser().parseFromString(await response.text(), "text/html");
    const nextMain = next.querySelector("main");
    const currentMain = document.querySelector("main");
    if (!nextMain || !currentMain) throw new Error("Page content is missing");
    currentMain.innerHTML = nextMain.innerHTML;
    document.title = next.title;
    const nextDescription = next.querySelector('meta[name="description"]')?.content;
    const description = document.querySelector('meta[name="description"]');
    if (description && nextDescription) description.content = nextDescription;
    const nextCanonical = next.querySelector('link[rel="canonical"]')?.href;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && nextCanonical) canonical.href = nextCanonical;
    document.querySelectorAll(".site-header nav a").forEach(link => {
      const active = new URL(link.href).pathname === url.pathname;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (pushState) history.pushState({}, "", url.href);
    initializeCatalogs();
    if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView();
    else scrollTo(0, 0);
  };
  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0 || link.target || link.hasAttribute("download") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !isPublicPage(url) || (url.pathname === location.pathname && url.hash)) return;
    event.preventDefault();
    loadPublicPage(url).catch(() => { location.href = url.href; });
  });
  addEventListener("popstate", () => {
    const url = new URL(location.href);
    if (isPublicPage(url)) loadPublicPage(url, false).catch(() => { location.reload(); });
  });
})();
