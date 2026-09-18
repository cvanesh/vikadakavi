# Silhouette Asset Spec

Drop files into `assets/silhouettes/`. The build inlines them into the encrypted
bundle — they are never fetched at runtime.

## Hard requirements

| Rule | Value |
| --- | --- |
| Format | SVG, hand-editable text (no embedded raster, no `<image>`) |
| viewBox | `0 0 200 200` exactly — square, so a full swing and racket fit |
| Anchor | Feet at `y=200`, body centred on `x=100`, head near `y=10` |
| Facing | Player faces **the viewer**, front-on — he is on the far side of the court looking back at us. Never a profile view, never mirrored per stroke: forehand and backhand are separate drawings, not the same drawing flipped |
| Fill | `fill="currentColor"` on every shape — no hex colours, no `style=` |
| Shapes | One `<g>` of `<path>`/`<circle>`; no `<defs>`, filters, gradients, shadows |
| Extras | No background rect, no text, no stroke-only outlines |
| Size | ≤ 8 KB each |
| Licence | CC0 / public domain / self-made only — the repo is public |

A conforming file looks like:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="currentColor"><path d="…"/><path d="…"/></g>
</svg>
```

The figure must fill the **height** (head ~y=10 to feet y=200). Horizontal space
is deliberately generous so an extended arm and racket are not clipped.

## The pose must be the moment of contact

For the three strokes, the racket must be **meeting the ball**, not drawn back.
The ball path in every directionals card terminates at the strike; a backswing
or trophy pose leaves the trajectory ending in empty space, pointing at a racket
aimed the wrong way.

## Files needed

Three frames per stroke — the animation cross-fades `prep → contact → finish`.
If you can only find one frame, give me `contact`; I'll interpolate a usable two-frame loop.

Four poses, one drawing each. Single frames rather than prep/contact/finish
sequences: at the size these render the extra frames bought nothing, and a
follow-through frame puts the racket where the ball is not.

| File | Pose |
| --- | --- |
| `ready.svg` | Ready position, racket in front, weight forward, feet apart |
| `forehand.svg` | Forehand **at contact**, racket meeting the ball |
| `backhand.svg` | **One-handed** backhand at contact |
| `serve.svg` | Serve at contact — full extension, racket overhead |
| `slice.svg` | Low one-handed backhand reach — backhand slice and backhand volley. From `slice.png` (middle figure), `--outline --height=138 --epsilon=1` to match the set's scale |

**Phase 1 needs only `ready.svg` and `forehand.svg`.**

A hitter can set `pose: 'slice'` to swap the drawing; `stroke` still sets the racket
side. Forehand volleys still reuse `forehand.svg` — none of the supplied figures is a
forehand volley, and mirroring the slice would put the racket in the wrong hand.

## Optional: top-down markers

If you find top-down (bird's-eye) player figures, name them `top-*.svg` with
viewBox `0 0 100 100`, facing up (−y). Nice-to-have, not required — the court
diagram uses side-view silhouettes scaled onto the court.

## If a file doesn't conform

Give it to me as-is. Normalising viewBox, stripping colours and re-anchoring is
a scripted step (`tools/normalize-svg.mjs`), not manual work. Don't hand-edit.
