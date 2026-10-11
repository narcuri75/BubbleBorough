# Cave entrance calibration

All 36 built-in cave decor records have individually measured default entrances: 108 openings in total. Each opening is stored relative to the foreground artwork, so resizing decor scales both its marker and the physical opening. Size categories still depend on the opening's smaller axis, with fish silhouette and wall checks deciding actual admission.

The October 11 export in [cave-defaults-2026-10-11.json](data/cave-defaults-2026-10-11.json) supplies sizes, 97 entrances, and 119 seats for 31 caves, including entrance sides and seat facing. Depth remains centered at 50%. PVC Pipe, Crypt Cave, Haunted House Cave, Live Root Overhang, and Slate Stack retain their previous defaults because the export omits them. Exported size labels are descriptive; runtime categories still change when the decoration or entrance is resized.

The three sea anemones use their central bowl or disc as the shelter opening, with an approach from above. Their existing inside layer and layered rendering remain in place. Multi-tube, seashell, and slate-stack shelters keep their authored portal-to-seat assignments and stationary interior behavior.

Older placed decor inherit missing entrance dimensions from their matching catalog opening. Old untouched generic entrance templates use the newly authored defaults. User-edited positions and explicit dimensions are preserved.

Some artwork has transparent cutouts without a painted background behind them. Calibrated openings contribute to the interior mask so those holes remain usable; foreground wall collision and explicit interior masks retain their authority.

The remaining reviewed artwork includes all 36 base artwork items and three trypophobia-filtered variants. Generate numbered review sheets and a per-entrance CSV with:

```powershell
python scripts/review-cave-entrances.py --output cave-review --check
```

This requires Pillow. The check rejects entrances centered on opaque walls or with more than 20% sampled foreground overlap. It complements visual review and runtime collision checks.

For an in-game review, start the local server with `--debug-tools`, open `/.cave-behavior-audit.html`, and use **Review cave artwork**. This scene runs in memory without saving the review aquarium.

The original calibration passed 92 cave tests covering legacy settings, layered anemones, interior masks, portal movement, authored seats, and occlusion. Every base cave was also opened individually in the live editor before the October 11 defaults import.
