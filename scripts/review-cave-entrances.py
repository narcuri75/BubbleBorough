"""Render catalog cave artwork and its entrance ovals for visual calibration."""
import argparse
import csv
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--output", type=Path, required=True)
parser.add_argument("--check", action="store_true", help="Fail when an oval is centered on a wall or overlaps too much solid artwork.")
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
catalog = json.loads((ROOT / "game/assets/decor/decor_types.json").read_text(encoding="utf-8"))["decor"]
caves = [d for d in catalog if d.get("behavior") == "cave_layered" or "cave" in d.get("categories", [])]
for decor in list(caves):
    name = decor["file"].replace(".png", ".webp")
    for variant in (ROOT / "game/assets/decor/cave_layered").glob(name.replace("__front.webp", "__trypophobia__front*.webp")):
        if "__color" not in variant.name or "coral-shelf-9__" in variant.name:
            caves.append({**decor, "name": decor["name"] + " (filtered)", "previewFile": variant.name})
report = []
try:
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 16)
    small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 11)
except OSError:
    font = ImageFont.load_default(size=16)
    small = ImageFont.load_default(size=11)
cell_w, cell_h, art = 420, 455, 400
for page in range((len(caves) + 5) // 6):
    sheet = Image.new("RGB", (cell_w * 3, cell_h * 2), "#102530")
    for slot, decor in enumerate(caves[page * 6:page * 6 + 6]):
        x, y = (slot % 3) * cell_w + 10, (slot // 3) * cell_h + 36
        name = decor.get("previewFile", decor["file"].replace(".png", ".webp"))
        front_path = ROOT / "game/assets/decor/cave_layered" / name
        source = Image.open(front_path).convert("RGBA")
        front = source.copy()
        width, height = front.size
        scale = min(art / width, art / height)
        w, h = round(width * scale), round(height * scale)
        bg_path = front_path.with_name(decor["file"].replace(".png", ".webp").replace("__front", "__bg"))
        if bg_path.exists():
            bg = Image.open(bg_path).convert("RGBA")
            bg = bg.resize((w, round(bg.height * w / bg.width)))
            sheet.paste(bg, (x, y + h - bg.height), bg)
        front = front.resize((w, h))
        sheet.paste(front, (x, y), front)
        draw = ImageDraw.Draw(sheet)
        draw.text((x, y - 28), f"{page * 6 + slot + 1:02} {decor['name']}", font=font, fill="white")
        for tick in range(11):
            gx, gy = x + w * tick / 10, y + h * tick / 10
            draw.line((gx, y, gx, y + h), fill="#386070", width=1)
            draw.line((x, gy, x + w, gy), fill="#386070", width=1)
            draw.text((gx + 1, y + 1), str(tick), font=small, fill="#8ed6f2")
            draw.text((x + 1, gy + 1), str(tick), font=small, fill="#8ed6f2")
        settings = decor.get("caveSettings", {})
        entries = settings.get("entries", [])
        if not entries:
            entries = [dict(x=p["mouthX"], y=p["mouthY"], width=p.get("entranceWidth"), height=p.get("entranceHeight")) for p in decor.get("caveBehavior", {}).get("portals", [])]
        for index, entry in enumerate(entries):
            cx, cy = x + entry["x"] * w, y + entry["y"] * h
            ew, eh = entry.get("width"), entry.get("height")
            if ew and eh:
                draw.ellipse((cx - ew * w / 2, cy - eh * h / 2, cx + ew * w / 2, cy + eh * h / 2), outline="#fff44f", width=2)
                solid = total = 0
                for dy in range(-10, 11):
                    for dx in range(-10, 11):
                        if dx * dx + dy * dy > 100:
                            continue
                        px = min(width - 1, max(0, round((entry["x"] + dx / 10 * ew / 2) * width)))
                        py = min(height - 1, max(0, round((entry["y"] + dy / 10 * eh / 2) * height)))
                        solid += source.getpixel((px, py))[3] >= 40
                        total += 1
                center_alpha = source.getpixel((min(width-1, round(entry["x"] * width)), min(height-1, round(entry["y"] * height))))[3]
                report.append({"decor": decor["name"], "entry": index+1, "x": entry["x"], "y": entry["y"], "width": ew, "height": eh, "center_alpha": center_alpha, "wall_percent": round(solid / total * 100, 1)})
            draw.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill="#ff5263")
            draw.text((cx + 5, cy), str(index + 1), font=font, fill="white")
    target = args.output / f"cave-entrances-{page + 1}.png"
    sheet.save(target)
    print(target)
with (args.output / "entrance-audit.csv").open("w", newline="", encoding="utf-8") as output:
    writer = csv.DictWriter(output, fieldnames=list(report[0]))
    writer.writeheader()
    writer.writerows(report)
for entry in report:
    if entry["center_alpha"] >= 40 or entry["wall_percent"] > 20:
        print("CHECK", entry)
print(f"Reviewed artwork inventory: {len(caves)} cave-layered artwork, {len(report)} entrance ovals")
if args.check and any(entry["center_alpha"] >= 40 or entry["wall_percent"] > 20 for entry in report):
    raise SystemExit("Entrance artwork check failed; inspect entrance-audit.csv.")
