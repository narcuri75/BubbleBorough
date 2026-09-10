// Catalog photo selectors share the same appearance keys as detail pages/cart.
(() => {
  const overlay = document.getElementById("storeOverlay");
  if (!overlay) return;
  const selections = new Map();
  const cards = new Map();
  let scheduled = false;
  const position = ({ image, dots }) => {
    const style = `left:${image.offsetLeft}px;top:${image.offsetTop + image.offsetHeight - 28}px;width:${image.offsetWidth}px`;
    if (dots.getAttribute("style") !== style) dots.setAttribute("style", style);
  };
  const resize = new ResizeObserver(() => cards.forEach(position));
  const productKey = button => ["buyFish", "buySubmarine", "buyBoat"]
    .filter(key => button.dataset[key] !== undefined)
    .map(key => `${key}:${button.dataset[key]}`).join("");

  function select(entry, key) {
    const variant = entry.variants.find(variant => variant.key === key) || entry.variants[0];
    if (!variant) return;
    selections.set(entry.id, variant.key);
    entry.button.dataset.shopVariantKey = variant.key;
    if (entry.image.getAttribute("data-sprite-src") !== variant.image) {
      entry.image.setAttribute("data-sprite-src", variant.image);
    }
    for (const dot of entry.dots.children) {
      const pressed = String(dot.dataset.shopVariant === variant.key);
      if (dot.getAttribute("aria-pressed") !== pressed) dot.setAttribute("aria-pressed", pressed);
    }
  }

  function sync() {
    scheduled = false;
    for (const [card, entry] of cards) {
      if (!card.isConnected || !card.contains(entry.image)) {
        resize.unobserve(entry.image);
        entry.dots.remove();
        cards.delete(card);
      }
    }
    for (const button of overlay.querySelectorAll("[data-fish-variants], [data-machinery-variants]")) {
      const card = button.closest(".shop-card");
      const image = card?.querySelector("img.shop-thumb");
      const raw = button.dataset.fishVariants || button.dataset.machineryVariants;
      if (!image) continue;
      let entry = cards.get(card);
      if (entry?.raw === raw && entry.button === button) {
        select(entry, selections.get(entry.id));
        continue;
      }
      let variants;
      try { variants = JSON.parse(raw); } catch { continue; }
      if (!Array.isArray(variants) || variants.length < 2) continue;
      if (entry) { resize.unobserve(entry.image); entry.dots.remove(); }
      const dots = document.createElement("div");
      dots.className = "shop-variant-dots";
      dots.setAttribute("role", "group");
      dots.setAttribute("aria-label", `${image.alt || "Product"} appearance`);
      for (const variant of variants) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.dataset.shopVariant = variant.key;
        dot.setAttribute("aria-label", `Show ${variant.label}`);
        dot.title = variant.label;
        dots.append(dot);
      }
      image.after(dots);
      entry = { id: productKey(button), button, image, dots, variants, raw };
      cards.set(card, entry);
      select(entry, selections.get(entry.id));
      position(entry);
      resize.observe(image);
    }
  }

  overlay.addEventListener("click", event => {
    const dot = event.target.closest?.("[data-shop-variant]");
    if (!dot) return;
    event.preventDefault();
    event.stopPropagation();
    const entry = cards.get(dot.closest(".shop-card"));
    if (entry) select(entry, dot.dataset.shopVariant);
  });
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }).observe(overlay, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-fish-variants", "data-machinery-variants"] });
  sync();
})();
