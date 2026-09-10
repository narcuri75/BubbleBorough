// The store shell and mobile shop share catalog-authored, tab-specific facets.
(() => {
  const selections = new Map();
  const facetCache = new WeakMap();
  let selectedScope = "food";
  let frame = 0;
  const overlay = document.getElementById("storeOverlay");
  if (!overlay) return;
  const sidebar = document.createElement("aside");
  sidebar.className = "store-facets";
  sidebar.setAttribute("aria-label", "Filter products");
  overlay.querySelector(".store-panel-body").prepend(sidebar);
  const drawers = () => [...overlay.querySelectorAll(".store-drawer")];
  const category = drawer => drawer.dataset.tankazonCategory || drawer.id.replace(/Shop$/, "");
  const values = card => {
    const raw = card.dataset.storeFacets || "";
    const cached = facetCache.get(card);
    if (cached?.raw === raw) return cached.facets;
    if (card.dataset.storeFacets) {
      try {
        const facets = JSON.parse(raw);
        facetCache.set(card, { raw, facets });
        return facets;
      } catch { return {}; }
    }
    const type = card.querySelector("[data-buy-background], [data-use-background-shop]") ? "Backgrounds"
      : card.querySelector("[data-buy-uv-light]") ? "Lighting"
      : card.querySelector("[data-buy-auto-dispenser]") ? "Feeding equipment"
      : card.querySelector("[data-buy-boat], [data-buy-submarine]") ? "Vehicles" : "Aquarium upgrades";
    const facets = { Type: [type] };
    facetCache.set(card, { raw, facets });
    return facets;
  };
  const current = () => {
    if (!selections.has(selectedScope)) selections.set(selectedScope, {});
    return selections.get(selectedScope);
  };
  function matches(card, exceptGroup = "") {
    const facets = values(card);
    return Object.entries(current()).every(([group, selected]) => group === exceptGroup || !selected.size
      || (facets[group] || []).some(value => selected.has(value)));
  }
  function refresh(scope) {
    selectedScope = scope || overlay.dataset.tankazonCategory || selectedScope;
    const cards = drawers().filter(drawer => selectedScope === "all" || category(drawer) === selectedScope)
      .flatMap(drawer => [...drawer.querySelectorAll(".shop-card")]);
    const groups = new Map();
    for (const card of cards) {
      for (const [group, list] of Object.entries(values(card))) {
        if (!groups.has(group)) groups.set(group, new Set());
        for (const value of list) if (value) groups.get(group).add(value);
      }
    }
    // Preserve selections even if a catalog refresh temporarily removes an option.
    for (const [group, selected] of Object.entries(current())) {
      if (!selected.size) continue;
      if (!groups.has(group)) groups.set(group, new Set());
      selected.forEach(value => groups.get(group).add(value));
    }
    const focus = document.activeElement;
    const focusGroup = focus?.dataset.facetGroup;
    const focusValue = focus?.value;
    const expanded = sidebar.querySelector("details")?.open;
    const body = document.createElement("details");
    body.open = expanded ?? true;
    const summary = document.createElement("summary");
    summary.textContent = "Filter results";
    body.append(summary);
    const count = document.createElement("p");
    count.className = "store-facet-count";
    count.setAttribute("role", "status");
    const visibleCount = cards.filter(card => !card.classList.contains("tankazon-search-hidden") && matches(card)).length;
    count.textContent = `${visibleCount} result${visibleCount === 1 ? "" : "s"}`;
    body.append(count);
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "store-facet-clear";
    clear.textContent = "Clear filters";
    clear.disabled = !Object.values(current()).some(set => set.size);
    clear.addEventListener("click", () => { selections.delete(selectedScope); apply(); });
    body.append(clear);
    for (const [group, options] of groups) {
      if (!options.size) continue;
      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = group;
      fieldset.append(legend);
      for (const value of [...options].sort((a, b) => a.localeCompare(b))) {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = value;
        input.dataset.facetGroup = group;
        input.checked = current()[group]?.has(value) || false;
        if (input.checked) input.setAttribute("checked", "");
        const total = cards.filter(card => !card.classList.contains("tankazon-search-hidden") && matches(card, group) && values(card)[group]?.includes(value)).length;
        const text = document.createElement("span");
        text.textContent = value.replace(/[_-]+/g, " ").replace(/^./, char => char.toUpperCase());
        const badge = document.createElement("small");
        badge.textContent = `(${total})`;
        label.append(input, text, badge);
        fieldset.append(label);
      }
      body.append(fieldset);
    }
    // Avoid replacing focused controls on routine renders with identical content.
    const signature = body.outerHTML;
    if (sidebar.dataset.signature !== signature) {
      sidebar.replaceChildren(body);
      sidebar.dataset.signature = signature;
      if (focusGroup) [...sidebar.querySelectorAll("input")].find(input => input.dataset.facetGroup === focusGroup && input.value === focusValue)?.focus({ preventScroll: true });
    }
    for (const drawer of drawers()) {
      for (const card of drawer.querySelectorAll(".shop-card")) {
        card.classList.toggle("store-facet-hidden", (selectedScope === "all" || category(drawer) === selectedScope) && !matches(card));
      }
      for (const section of drawer.querySelectorAll(".shop-section")) {
        section.classList.toggle("store-facet-empty-section", [...section.querySelectorAll(".shop-card")].every(card => card.classList.contains("store-facet-hidden") || card.classList.contains("tankazon-search-hidden")));
      }
    }
    let empty = overlay.querySelector(".store-facet-empty");
    if (!empty) {
      empty = document.createElement("p");
      empty.className = "store-facet-empty";
      empty.textContent = "No products match these filters. Try clearing a filter or changing your search.";
      (document.getElementById("tankazonCatalogArea") || overlay.querySelector(".store-panel-body")).append(empty);
    }
    empty.hidden = visibleCount > 0 || cards.length === 0;
  }
  function apply() {
    refresh(selectedScope);
    document.getElementById("tankazonCatalogArea")?.scrollTo({ top: 0 });
  }
  sidebar.addEventListener("change", event => {
    const input = event.target.closest("[data-facet-group]");
    if (!input) return;
    const group = input.dataset.facetGroup;
    current()[group] ||= new Set();
    if (input.checked) current()[group].add(input.value); else current()[group].delete(input.value);
    apply();
  });
  window.refreshStoreFacets = refresh;
  window.addEventListener("bubbleborough:store-tab", event => refresh(event.detail.category));
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; refresh(selectedScope); });
  };
  // Only watch catalog content, so updating the sidebar cannot retrigger itself.
  for (const drawer of drawers()) new MutationObserver(schedule).observe(drawer, { childList: true, subtree: true });
  refresh();
})();
