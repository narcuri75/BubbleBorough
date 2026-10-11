# Fish cave support and size review

Review only: the game's cave thresholds and fish behavior have not been changed.

Measured all 59 built-in live fish types: 54 main-catalog species, four Davy mutations, and Proteus Z-01. This covers 380 whole-animal appearance variants. Custom uploaded fish have no fixed catalog dimensions and must be measured at runtime. The older `small_fish/fish-types.json` is not the active species catalog.

## Proposed ranges

| Entrance category | Narrower entrance dimension, normalized pixels |
| --- | --- |
| Small | Below 100 |
| Medium | 100 to below 180 |
| Large | 180 and above |

These replace the current 72/144 boundaries if implemented. The current boundaries label a normal guppy with larger fins and several other medium-bodied species as Large when allowing clearance. The proposed boundaries leave slim fish Small, most community fish Medium, and deeper-bodied fish or large predators Large. These are design thresholds informed by the measurements, not natural biological boundaries.

Categories are summaries. Check both axes, the full current silhouette, the foreground wall, the route, and the interior before admission. A Small fish still needs enough room within a Small entrance. A Large label does not guarantee an opening fits every Large fish. Use geometry as the final authority; a fixed species category must not block a valid fit in an unusually wide or tall oval.

## Measurement method

Reference: adult at its normal 100% size, neutral side pose, middle tank depth, reference desktop object scale 1. Catalog `displayWidth` takes precedence over `width`; current global fish scale is 0.85 and middle depth scale is 1.2. Visible pixels use the same alpha threshold of 40 as collision. The suggested oval encloses the silhouette around the current sprite origin with a proposed 10% clearance margin. Dimensions are rounded up. These normalized measurements are not literal monitor pixels on every device.

The first appearance is the default. Suggested band uses the narrower axis of its required oval rounded up to whole pixels. Alternative appearances can change that band; the final column lists their observed bands. Required oval axes are one conservative fit with the silhouette's proportions, not a unique mathematical minimum. Real game poses, turns and mask checks remain authoritative.

## Every fish

| Fish | Normal visible body W × H | Suggested entrance W × H | Default band | Bands across variants |
| --- | ---: | ---: | --- | --- |
| Tang | 261 × 207 | 294 × 243 | Large | Medium/Large |
| Goldfish | 250 × 159 | 343 × 219 | Large | Large |
| Guppy | 173 × 92 | 256 × 142 | Medium | Medium |
| Betta | 217 × 160 | 255 × 188 | Large | Medium/Large |
| Clownfish | 162 × 95 | 186 × 109 | Medium | Medium |
| Angelfish | 228 × 234 | 324 × 330 | Large | Large |
| Pufferfish | 147 × 50 | 180 × 67 | Small | Small |
| Rainbowfish | 235 × 93 | 314 × 129 | Medium | Medium |
| Discus | 223 × 194 | 259 × 223 | Large | Large |
| Black Moor Goldfish | 250 × 183 | 369 × 272 | Large | Large |
| Pencilfish | 160 × 50 | 212 × 71 | Small | Small |
| Dwarf Sucker Catfish † | 170 × 60 | 229 × 82 | Small | Small |
| Gourami | 154 × 95 | 188 × 119 | Medium | Medium |
| Tetra | 135 × 63 | 171 × 85 | Small | Small/Medium |
| Molly | 274 × 174 | 340 × 220 | Large | Large |
| Swordtail | 216 × 85 | 291 × 133 | Medium | Medium |
| Piranha | 279 × 162 | 361 × 217 | Large | Medium/Large |
| Koi | 276 × 132 | 374 × 192 | Large | Medium/Large |
| Lionfish | 272 × 268 | 324 × 320 | Large | Large |
| Bull Shark | 309 × 165 | 429 × 229 | Large | Large |
| Great White Shark | 308 × 157 | 427 × 217 | Large | Large |
| Hammerhead Shark | 307 × 159 | 411 × 213 | Large | Large |
| Orca | 324 × 151 | 418 × 196 | Large | Large |
| Ocean Sunfish | 230 × 224 | 274 × 269 | Large | Large |
| Seahorse | 94 × 152 | 111 × 176 | Medium | Medium |
| Pilot Fish | 246 × 126 | 325 × 168 | Medium | Medium |
| Freshwater Shrimp | 105 × 28 | 174 × 61 | Small | Small |
| Marine Shrimp | 105 × 28 | 174 × 61 | Small | Small |
| Nerite Snail † | 104 × 58 | 134 × 79 | Small | Small |
| Firefish | 111 × 73 | 141 × 92 | Small | Small |
| Six-Line Wrasse | 126 × 59 | 156 × 73 | Small | Small |
| Coral Beauty Angelfish | 140 × 103 | 157 × 120 | Medium | Medium |
| Cleaner Shrimp | 85 × 34 | 155 × 85 | Small | Small |
| Pistol Shrimp | 93 × 24 | 154 × 53 | Small | Small |
| Turbo Snail † | 108 × 100 | 149 × 136 | Medium | Medium |
| Assessor | 177 × 95 | 217 × 119 | Medium | Medium |
| Barb | 179 × 98 | 228 × 126 | Medium | Medium |
| Basslets & Grammas | 179 × 94 | 222 × 121 | Medium | Small/Medium |
| Cardinal | 174 × 115 | 213 × 144 | Medium | Medium/Large |
| Chromis | 176 × 91 | 230 × 130 | Medium | Medium |
| Lookdown | 231 × 218 | 316 × 296 | Large | Large |
| Cichlid | 178 × 119 | 210 × 148 | Medium | Medium |
| Danio | 172 × 82 | 223 × 113 | Medium | Small/Medium |
| Dottyback | 176 × 86 | 216 × 113 | Medium | Small/Medium |
| Endler | 170 × 65 | 226 × 100 | Medium | Small/Medium |
| Mosquitofish | 178 × 65 | 225 × 84 | Small | Small |
| Platy | 176 × 104 | 214 × 132 | Medium | Medium |
| Rasbora | 173 × 76 | 228 × 104 | Medium | Medium |
| Killifish | 172 × 66 | 207 × 79 | Small | Small/Medium |
| Neon Angelfish | 96 × 100 | 137 × 142 | Medium | Medium |
| Neon Barb | 90 × 71 | 113 × 86 | Small | Small |
| Neon Rainbow Shark | 115 × 52 | 154 × 74 | Small | Small |
| Neon Tetra | 90 × 75 | 115 × 95 | Small | Small |
| Neon Zebra Danio | 91 × 38 | 116 × 50 | Small | Small |
| Dwarf Siren Pike | 181 × 118 | 241 × 158 | Medium | Medium |
| Glass Needle Spitter | 169 × 66 | 246 × 95 | Small | Small |
| Dwarf Chimera Barracuda | 190 × 101 | 253 × 135 | Medium | Medium |
| Dwarf Hyperfin | 189 × 66 | 294 × 103 | Medium | Medium |
| Z-01 Post-Mortem Aquatic Specimen | 163 × 120 | 209 × 154 | Medium | Small/Medium/Large |

† Otocinclus and both snails are currently excluded from cave visits. Otocinclus was measured using its free-swimming side sprite. Their dimensions are reviewed here, but they need controller changes before cave support can be enabled.

## Implementation requirements

1. Derive sizing from the actual selected sprite and current fish scale/growth, including custom fish. Do not inherit a Large-only restriction from a behavior profile attached to a much smaller custom image. Keep labels stable across viewport changes and validate geometry at the actual entrance depth.
2. Expand the normalizers beyond the current Large-only `caveMinSize` value if explicit bands are stored. Prefer measured requirements over permanent species locks. Update custom fish builders and behavior-profile merging together.
3. Otocinclus: allow entry during free swimming, suspend glass attachment and gravel scan ownership during the visit, and restore its normal controller after exiting. Snails: add crawling approach/interior movement and surface attachment; avoid routing them through ordinary swimming motion.
4. Keep current puffer inflation and orca surfacing handoffs. Review Davy displays, Z-01 attacks, feeding, panic, breeding, and queued actions so pose/size or movement changes first finish or safely cancel a cave visit. Recheck growth and user resizing while inside.
5. Cleaner Shrimp currently lists its antenna and legs as appearance variants. Treat these as layers and review that catalog issue; the audit measures its body only. Decide whether appendages need clearance, because current collision uses the body sprite. Long fins are already included in the body mask.
6. Validate multi-entrance caves individually, seat and turning clearance, entry/exit routes, and front/inside layering. Keep anemone openings tied to their central shelter. Large predators will need some decor enlarged: the default reference orca oval is approximately 418 × 196, and the three shark species need roughly 410–435 × 210–235.

## Reproduce

```powershell
node scripts/review-fish-cave-sizes.cjs fish-size-audit.json
```

This read-only tool loads current catalog and atlas definitions, decodes local frames, and records per-variant measurements. It does not edit fish, caves, save data, or runtime thresholds.
