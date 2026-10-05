// BubbleBodega compact facet strip. Filters stay mounted for the shopping session
// and are applied directly to the existing cards instead of rebuilding the catalog.
(() => {
  const selections = new Map();
  const autoWaterTankKeys = new Map();
  const facetCache = new WeakMap();
  let selectedScope = "food";
  let frame = 0;
  const overlay = document.getElementById("storeOverlay");
  if (!overlay) return;

  const sidebar = document.createElement("aside");
  sidebar.className = "store-facets";
  sidebar.setAttribute("aria-label", "Filter products");
  overlay.querySelector(".store-panel-body")?.prepend(sidebar);

  const drawers = () => [...overlay.querySelectorAll(".store-drawer")];
  const category = drawer => drawer.dataset.tankazonCategory || drawer.id.replace(/Shop$/, "");
  const cardCategory = card => card?.dataset?.tankazonVirtualCategory
    || card?.closest?.("[data-tankazon-category]")?.dataset?.tankazonCategory
    || "equipment";
  const allCards = scope => {
    const managed = window.getBubbleBodegaCatalogCards?.(scope || "all");
    if (Array.isArray(managed)) return managed;
    return drawers()
      .filter(drawer => !scope || scope === "all" || category(drawer) === scope)
      .flatMap(drawer => [...drawer.querySelectorAll(".shop-card")]);
  };
  function normalizeFacetValue(group, value) {
    const raw = String(value || "").trim();
    const normalizedGroup = String(group || "").trim().toLowerCase();
    if (normalizedGroup === "type" && /^caves?$/i.test(raw)) return "Cave";
    if (normalizedGroup === "water type") {
      const compact = raw.toLowerCase().replace(/[\s_-]+/g, "");
      if (compact === "freshwater" || compact === "fresh") return "Freshwater";
      if (compact === "saltwater" || compact === "marine") return "Saltwater";
      if (compact === "universal" || compact === "both") return "Universal";
    }
    return raw;
  }

  function getPriceBand(card) {
    const match = String(card?.dataset?.tankazonCost || "").match(/\d+/);
    const cost = match ? Number(match[0]) : NaN;
    if (!Number.isFinite(cost)) return "";
    if (cost < 10) return "Under 10 coins";
    if (cost < 25) return "10–24 coins";
    if (cost < 50) return "25–49 coins";
    return "50+ coins";
  }

  const values = card => {
    const raw = card.dataset.storeFacets || "";
    const priceBand = getPriceBand(card);
    const cacheKey = `${raw}|${priceBand}`;
    const cached = facetCache.get(card);
    if (cached?.raw === cacheKey) return cached.facets;

    let facets = {};
    if (raw) {
      try { facets = JSON.parse(raw); } catch { facets = {}; }
    }
    if (!Object.keys(facets).length) {
      const type = card.querySelector("[data-buy-background], [data-use-background-shop]") ? "Backgrounds"
        : card.querySelector("[data-buy-auto-dispenser]") ? "Feeding equipment"
          : card.querySelector("[data-buy-boat], [data-buy-submarine]") ? "Vehicles" : "Aquarium upgrades";
      facets = { Type: [type] };
    }

    for (const [group, list] of Object.entries(facets)) {
      if (!Array.isArray(list)) continue;
      facets[group] = [...new Set(list
        .filter(value => !/^(?:undead|non[- ]?undead)$/i.test(String(value || "").trim()))
        .map(value => normalizeFacetValue(group, value))
        .filter(Boolean))];
    }
    if (priceBand) facets.Price = [priceBand];
    facetCache.set(card, { raw: cacheKey, facets });
    return facets;
  };

  const current = () => {
    if (!selections.has(selectedScope)) selections.set(selectedScope, {});
    return selections.get(selectedScope);
  };

  function syncAutomaticWaterFacet(scope) {
    if (scope !== "fish" && scope !== "decor") return;
    const active = window.getBubbleBodegaActiveTankFilter?.();
    const tankId = String(active?.id || "").trim();
    const compact = String(active?.waterType || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    if (!tankId || (compact !== "freshwater" && compact !== "saltwater")) return;

    const label = compact === "saltwater" ? "Saltwater" : "Freshwater";
    const contextKey = `${tankId}|${compact}`;
    if (autoWaterTankKeys.get(scope) === contextKey) return;

    autoWaterTankKeys.set(scope, contextKey);
    if (!selections.has(scope)) selections.set(scope, {});
    const scopeSelections = selections.get(scope);
    scopeSelections["Water type"] = new Set([label]);
  }

  function matches(card, exceptGroup = "") {
    const facets = values(card);
    return Object.entries(current()).every(([group, selected]) => {
      if (group === exceptGroup || !selected.size) return true;
      const cardValues = facets[group] || [];
      if (group === "Water type" && cardValues.includes("Universal")) return true;
      return cardValues.some(value => selected.has(value));
    });
  }

  function renderFacetStrip(cards, groups, visibleCount) {
    const focus = document.activeElement;
    const focusGroup = focus?.dataset?.facetGroup;
    const focusValue = focus?.value;
    const openGroups = new Set([...sidebar.querySelectorAll("details[open][data-facet-details]")].map(node => node.dataset.facetDetails));

    const head = document.createElement("div");
    head.className = "store-facet-head";
    const label = document.createElement("strong");
    label.textContent = "Filters";
    const count = document.createElement("span");
    count.className = "store-facet-count";
    count.setAttribute("role", "status");
    count.textContent = `${visibleCount} result${visibleCount === 1 ? "" : "s"}`;
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "store-facet-clear";
    clear.textContent = "Clear";
    clear.disabled = !Object.values(current()).some(set => set.size);
    clear.addEventListener("click", () => {
      selections.delete(selectedScope);
      apply({ resetScroll: true });
    });
    head.append(label, count, clear);

    const groupHost = document.createElement("div");
    groupHost.className = "store-facet-groups";
    for (const [group, options] of groups) {
      if (!options.size) continue;
      const selected = current()[group] || new Set();
      const details = document.createElement("details");
      details.className = "store-facet-group";
      details.dataset.facetDetails = group;
      details.open = openGroups.has(group);
      const summary = document.createElement("summary");
      summary.textContent = selected.size ? `${group} (${selected.size})` : group;
      const optionHost = document.createElement("div");
      optionHost.className = "store-facet-options";

      for (const value of [...options].sort((a, b) => a.localeCompare(b))) {
        const optionLabel = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = value;
        input.dataset.facetGroup = group;
        input.checked = selected.has(value);
        const total = cards.filter(card => !card.classList.contains("tankazon-search-hidden") && matches(card, group) && values(card)[group]?.includes(value)).length;
        const text = document.createElement("span");
        text.textContent = value.replace(/[_-]+/g, " ").replace(/^./, char => char.toUpperCase());
        const badge = document.createElement("small");
        badge.textContent = String(total);
        optionLabel.append(input, text, badge);
        optionHost.append(optionLabel);
      }
      details.append(summary, optionHost);
      groupHost.append(details);
    }

    let sortHost = null;
    if (selectedScope === "fish" || selectedScope === "decor") {
      const activeDrawer = drawers().find(drawer => category(drawer) === selectedScope);
      const sourceSelect = activeDrawer?.querySelector(`.shop-sort-select[data-shop-sort="${selectedScope}"]`);
      if (sourceSelect) {
        sortHost = document.createElement("label");
        sortHost.className = "store-facet-sort";
        const sortLabel = document.createElement("span");
        sortLabel.textContent = "Sort by";
        const sortSelect = document.createElement("select");
        sortSelect.className = "store-facet-sort-select";
        sortSelect.setAttribute("aria-label", `Sort ${selectedScope} shop`);
        sortSelect.innerHTML = sourceSelect.innerHTML;
        sortSelect.value = sourceSelect.value;
        sortSelect.addEventListener("change", () => {
          const latestDrawer = drawers().find(drawer => category(drawer) === selectedScope);
          const latestSource = latestDrawer?.querySelector(`.shop-sort-select[data-shop-sort="${selectedScope}"]`);
          if (!latestSource) return;
          latestSource.value = sortSelect.value;
          latestSource.dispatchEvent(new Event("change", { bubbles: true }));
        });
        sortHost.append(sortLabel, sortSelect);
        head.append(sortHost);
      }
    }

    const next = document.createDocumentFragment();
    next.append(head, groupHost);
    const signature = `${selectedScope}|${head.textContent}|${groupHost.innerHTML}|${sortHost?.innerHTML || ""}`;
    if (sidebar.dataset.signature !== signature) {
      sidebar.replaceChildren(next);
      sidebar.dataset.signature = signature;
      if (focusGroup) {
        [...sidebar.querySelectorAll("input")]
          .find(input => input.dataset.facetGroup === focusGroup && input.value === focusValue)
          ?.focus({ preventScroll: true });
      }
    }
  }

  function refresh(scope) {
    selectedScope = scope || overlay.dataset.tankazonCategory || selectedScope;
    syncAutomaticWaterFacet(selectedScope);
    const cards = allCards(selectedScope);

    const groups = new Map();
    for (const card of cards) {
      for (const [group, list] of Object.entries(values(card))) {
        if (!groups.has(group)) groups.set(group, new Set());
        for (const value of list) if (value) groups.get(group).add(value);
      }
    }
    // Preserve active selections even when a catalog refresh temporarily removes
    // an option, such as immediately after a purchase rerender.
    for (const [group, selected] of Object.entries(current())) {
      if (!selected.size) continue;
      if (!groups.has(group)) groups.set(group, new Set());
      selected.forEach(value => {
        if (!/^(?:undead|non[- ]?undead)$/i.test(String(value || "").trim())) groups.get(group).add(value);
      });
    }

    for (const drawer of drawers()) {
      const drawerInScope = selectedScope === "all" || category(drawer) === selectedScope;
      for (const card of allCards(category(drawer))) {
        card.classList.toggle("store-facet-hidden", drawerInScope && !matches(card));
      }
      // Keep subcategory headings with their products. Decor is intentionally
      // not virtualized, so a filtered-out group otherwise left an empty
      // heading/description strip (for example, Coral) in the catalog.
      drawer.querySelectorAll(".shop-section").forEach(section => {
        const sectionCards = [...section.querySelectorAll(".shop-card")];
        const hasVisibleCard = sectionCards.some(card => !card.classList.contains("store-facet-hidden")
          && !card.classList.contains("tankazon-search-hidden"));
        section.classList.toggle("store-facet-empty-section", drawerInScope && !hasVisibleCard);
      });
    }

    const visibleCount = cards.filter(card => !card.classList.contains("tankazon-search-hidden") && matches(card)).length;
    renderFacetStrip(cards, groups, visibleCount);

    let empty = overlay.querySelector(".store-facet-empty");
    if (!empty) {
      empty = document.createElement("p");
      empty.className = "store-facet-empty";
      empty.textContent = "No products match these filters. Try clearing a filter or changing your search.";
      (document.getElementById("tankazonCatalogArea") || overlay.querySelector(".store-panel-body"))?.append(empty);
    }
    empty.hidden = visibleCount > 0 || cards.length === 0;
    window.refreshBubbleBodegaVirtualCatalog?.({ sync: true });
  }

  function refreshSearchResults(scope) {
    selectedScope = scope || overlay.dataset.tankazonCategory || selectedScope;
    const cards = allCards(selectedScope);
    const visibleCount = cards.filter(card => !card.classList.contains("tankazon-search-hidden") && matches(card)).length;
    const count = sidebar.querySelector(".store-facet-count");
    if (count) count.textContent = `${visibleCount} result${visibleCount === 1 ? "" : "s"}`;
    let empty = overlay.querySelector(".store-facet-empty");
    if (!empty) {
      empty = document.createElement("p");
      empty.className = "store-facet-empty";
      empty.textContent = "No products match these filters. Try clearing a filter or changing your search.";
      (document.getElementById("tankazonCatalogArea") || overlay.querySelector(".store-panel-body"))?.append(empty);
    }
    empty.hidden = visibleCount > 0 || cards.length === 0;
  }

  function apply({ resetScroll = false } = {}) {
    refresh(selectedScope);
    if (resetScroll) document.getElementById("tankazonCatalogArea")?.scrollTo({ top: 0 });
  }

  sidebar.addEventListener("change", event => {
    const input = event.target.closest("[data-facet-group]");
    if (!input) return;
    const group = input.dataset.facetGroup;
    current()[group] ||= new Set();
    if (input.checked) current()[group].add(input.value);
    else current()[group].delete(input.value);
    apply({ resetScroll: true });
  });

  window.refreshStoreFacets = refresh;
  window.refreshBubbleBodegaFacetResults = refreshSearchResults;
  window.getBubbleBodegaFacetState = () => Object.fromEntries(
    [...selections.entries()].map(([scope, groups]) => [scope, Object.fromEntries(
      Object.entries(groups).map(([group, selected]) => [group, [...selected]])
    )])
  );
  window.addEventListener("bubbleborough:store-tab", event => refresh(event.detail.category));

  const isVirtualNode = node => !(node instanceof Element)
    || node.matches(".tankazon-virtual-host, .tankazon-virtual-slice, .shop-card[data-tankazon-virtualized='true']")
    || Boolean(node.closest?.(".tankazon-virtual-host"));
  const schedule = (records = []) => {
    if (records.length && records.every(record => [...record.addedNodes, ...record.removedNodes].every(isVirtualNode))) return;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      refresh(selectedScope);
    });
  };
  // Bubble Borough replaces each drawer's direct children when a catalog changes.
  // Watching only that boundary avoids rerunning facet work for every nested card
  // mutation, cart update, thumbnail load, or unrelated WebSurf change.
  for (const drawer of drawers()) new MutationObserver(schedule).observe(drawer, { childList: true });
  refresh();
})();
