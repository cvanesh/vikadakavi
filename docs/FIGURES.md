# Book figures — Pressure Tennis, chapters 3 and 4

Text: `references/High-Percentage Tactics.md`. Images: `references/Pressure-Tennis.pdf`
(27 pages, one 1224×1584 greyscale scan each, stored rotated 180°).

## Inventory — confirmed 2026-09-16

36 numbered figures: 3.1–3.35 and 4.1. Every one is cited in the text and has a
readable caption on the scan. The 7 photos carry no figure number and are out of scope.

| PDF page | Book page | Figures |
| --- | --- | --- |
| 3 | 21 | 3.1, 3.2 |
| 4 | 22 | 3.3, 3.4 (+ photo) |
| 5 | 23 | 3.5, 3.6 (+ photo) |
| 6 | 24 | 3.7, 3.8 |
| 7 | 25 | 3.9, 3.10 |
| 8 | 26 | 3.11, 3.12 (+ photo) |
| 10 | 28 | 3.13, 3.14 |
| 12 | 30 | 3.15, 3.16, 3.17 |
| 13 | 31 | 3.18, 3.19, 3.20 |
| 14 | 32 | 3.21 |
| 15 | 33 | 3.22, 3.23 (numbered 4-shot sequences) |
| 16 | 34 | 3.24, 3.25 |
| 17 | 35 | 3.26, 3.27, 3.28, 3.29 |
| 18 | 36 | 3.30, 3.31 |
| 19 | 37 | 3.32, 3.33 |
| 20 | 38 | 3.34, 3.35 |
| 24 | 42 | 4.1 (zones, not a rally) |

Diagram conventions: dashed = incoming ball, solid = reply. Dot = player, bar =
racket side (so handedness is readable). **Orientation varies** — P1 is at the
top in most figures but at the bottom in 3.13 and 3.14, so each one needs its own reading.

## Validation steps

Crops and captions are book content: they go under `dev-tools/artifacts/figures/`
(gitignored), never into the public repo.

1. **Count.** Every figure number cited in the text is one of 3.1–3.35 or 4.1, with no gaps and no extras. *(Done: 36/36.)*
2. **Page map.** Each figure is on the PDF page shown in the table above, and each figure page is listed. *(Done.)*
3. **Extract.** Rotate each page 180° and crop every figure together with its caption. A contact sheet of all 36 goes to the owner, who ticks each crop as complete. *(Crops done: `python3 tools/extract-figures.py` → `dev-tools/artifacts/figures/`, including `contact-sheet.png`. Owner tick-off pending.)*
4. **Caption.** Copy each caption word for word into a gitignored manifest, along with the section of the text that cites that figure. *(Done: `src/content/scripts/figures.js`.)*
5. **Encode.** Record each rally figure as data in the scripts' coordinate frame. That covers which way up the court is drawn, the hitter's position when he hits, the racket side, where the incoming ball starts and where the reply lands, and how deep the ball is. *(Done: 35 figures, read against a grid overlay to about ±0.1.)*
6. **Classify.** Run `classifyBall` and the direction check on each encoded figure. The result must match the caption, for example "inside forehand, no change of direction". Any mismatch means either the encoding or our rule is wrong, and it stops the work until resolved. *(Done: 33/35 agree. Figs 3.15 and 3.18 — T-serve returns — disagree and are open coach questions; the checker also verifies the racket glyph matches a right-hander.)*
7. **Compare.** Render our court engine's version beside the crop at the same scale. The owner (a coach) signs off each figure, and the sign-off is recorded in the manifest. *(Review page built; sign-off pending.)*
8. **Trace.** Each card script cites the figure numbers it relies on. `npm run scripts` fails on a citation to a figure that isn't signed off, or on a direction claim backed by neither a figure nor a quote. *(Citations checked against encoded figures now; the sign-off gate is added once sign-offs exist.)*

## What the figures already settle

- **Inside or outside is judged where he hits the ball, not where he stood when the opponent hit it.**
  In 3.13 and 3.21 a crosscourt ball is an *inside* forehand because the player has run around it.
  The text agrees: "Inside-out forehands are simply inside forehands hit with no change of direction."
