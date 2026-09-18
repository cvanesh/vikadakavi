# Vikadakavi — Vision

**Status:** Phase 0 (scaffold). Written 2026-09-16.

## What this is

A pre-match refresher PWA for a junior player. He opens it courtside, swipes
through animated cards about **where to hit the ball** and **which points
matter**, and walks on court with the geometry fresh.

It is the second of two apps in a ritual:

1. `cvanesh.github.io/tennis-oath` — the mindset oath.
2. `cvanesh.github.io/vikadakavi` — this: the tactical refresher.

Separate apps, separate repos, same visual family.

## Non-negotiables

| Constraint | Value |
| --- | --- |
| Total review time | **~5 minutes, target** (hard limit lifted by owner 2026-09-16, for now) |
| Per-card dwell | ~10 seconds |
| Card budget | **~30 cards** (30 × 10s = 5:00) — going over warns, does not fail |
| Card face | Chip, title, cue (≤ 32 words) and the animated court — always shown. |
| Why panel | One **Why** button reveals the Why text (≤ 90 words, the book's reasoning) with the book figure(s). Optional: it opens on tap and closes when the card changes, so every card first shows its court (owner, 2026-09-16). Figures ship only inside the encrypted payload. |
| Primary device | Phone, portrait, one-handed, outdoors in sun |
| Network | Must work fully offline after first unlock |
| Security | Nothing readable in view-source before unlock |

The card budget was a hard ceiling until 2026-09-16; the owner has allowed going past
5 minutes for now. Every new card must still justify the seconds it costs.

## Decisions (locked 2026-09-16)

| Decision | Choice |
| --- | --- |
| Encryption scope | **Whole app payload.** `index.html` is a thin loader + unlock gate. All app code, styles, content and inlined SVG live in one AES-256-GCM blob decrypted in memory after the passphrase. |
| Passphrase | New, distinct from tennis-conditioning. Owner runs the encrypt step locally; the passphrase never enters the repo, CI, or an agent transcript. |
| Repo | **Public.** Only ciphertext is committed. Plaintext lives in gitignored `/src/` plus an off-repo backup. Consequence: CI has no source, so **it cannot run the tests** — `npm run ship` on the operator's machine is the real gate, and the Action only verifies and publishes the committed payload. Revisit if the suite ever needs to block a push. |
| Session flow | **Manual swipe.** A visible elapsed timer nudges toward 5:00 but never forces advance. Auto-advance is deliberately deferred — revisit after he uses it for real. |
| Rendering | **Inline SVG + Web Animations API.** No canvas, no animation library. Real DOM nodes so Playwright can assert on geometry, not just pixels. |
| Player frame | Right-handed, **one-handed backhand**. All court geometry authored mirrorable so a lefty toggle is additive, not a rewrite. |
| Point of view | **Our player is always on the far side**, at the top of the screen, facing the viewer; the opponent is at the near baseline. Chosen because the silhouettes are drawn front-on, which only reads correctly for a player facing us. Because he faces us, his racket hand — and so his forehand — appears on screen **left**. Every card inherits this; it lives in `OUR_SIDE` in `court-geometry.js` and flipping that one value mirrors the whole deck. Never write a raw baseline sign into a card. |
| Directionals doctrine | **Wardlaw Directionals**, named and credited, so the vocabulary matches what he hears from coaches. |

## Content plan

Three modules, ~30 cards (Module A grew to 16 on the owner's decisions).

**Deck order (owner, 2026-09-17):** a Contents card first (every title, tap to jump),
then the **Directionals** section, then **Between points** — the between-point protocol
and the other single cards from Module C. Sections are marked by gaps in the progress bar,
whose marks are also tappable. Cards are numbered 1…N; Contents is not numbered.

### A — Directionals (14 cards, animated)

The spine of the app. Every card is a top-view court with an incoming
trajectory, a stationed player silhouette, and an outgoing trajectory.

Source: `references/paul_waldrow_directonals.txt` (Paul Wardlaw's system, as
taught in *Pressure Tennis*). Follow it — do not improvise the doctrine.

**The classification is body-relative.** An OUTSIDE ball crosses your body's
centreline as it reaches you; an INSIDE ball never does. Wardlaw is explicit
that this is about the ball against your body, *not* the court lines. Outside →
no change of direction. Inside → change direction.

1. The Big Three: directionals, court position, shot selection
2. Inside vs outside — against your body, not the lines
3. Outside groundstroke → no change of direction, back where it came from
4. Inside groundstroke → change direction; the hips and shoulders clear out
5. Why holding the line is safest: square contact, biggest margin
6. The 90° change of direction — perpendicular to their baseline
7. Short outside ball → 90° down the line, not a sharp angle
8. With a weapon: deep run-around = inside-out, no COD; short = 90° COD
9. Serve: first offensive, second security and depth; then normal directionals
10. Return: first = deep and back in; second = attack by the same rules
11. Approach: inside → change direction; outside → 90° down the line
12. Passing shot: hold the angle. Exception when they approach down the middle
13. Volleys: low outside no COD; high outside optional; inside always COD
14. Recovery: force an inside ball and you know they must change direction

### B — Not all points are equal (8 cards)

Grounded in `references/tennis-math-guide.md` §6 and §10. Numbers shown are the
guide's, at p = 0.6.

1. Leverage — some points swing the game far more than others
2. First to 30 → raise your margin, stop going for lines
3. 30–30 and deuce are the hinge (leverage 0.46)
4. Break point is the biggest point in the game (leverage 0.69)
5. 40–0 and 0–40 barely move the needle (0.05) — don't gamble, don't panic
6. Small consistent edges amplify: 55% of points ≈ 90% of matches
7. Second serve: two risky serves is the losing bet
8. Serve direction: mix wide and T, stay unpredictable

### C — Craft and respect (6 cards)

1. Fast server, late timing → step back to return, then recover to the baseline
2. The three Rs — Release, Recover, Refocus — on the midpoint route
3. Between-point routine and time discipline
4. Sanctity of the court, the balls, the equipment — never kick a ball
5. Honest calls; the doubt goes to your opponent
6. Smile and shake hands, whatever the score

## Visual standard

Industry standard means, concretely:

- Court drawn to **real ITF proportions** (23.77 m × 8.23 m singles, 6.40 m
  service boxes) from one geometry module — never hand-placed rectangles.
- Ball travels a **curved path** along an SVG `<path>` with easing that
  decelerates into the bounce, not a straight linear tween.
- Incoming and outgoing trajectories visually distinct (weight + dash), with the
  bounce point marked.
- Silhouette swaps FH↔BH by cross-fade on a timed keyframe, not an instant cut.
- Legible at 390 px wide in direct sunlight: minimum stroke weight, high
  contrast, no thin grey-on-green.
- Respects `prefers-reduced-motion` by showing the final composed frame.

## Phasing

**No phase starts until the previous one is 100% green.** Green means: Playwright
suite passes, visual review screenshots reviewed, deployed build verified live.

- **Phase 1 — pipeline.** Unlock gate, encrypted bundle, PWA shell, GitHub Pages
  deploy on push to main, Playwright suite, and exactly **one** finished card
  (A2, inside-ball change of direction) at full visual standard. Proves
  everything end-to-end before content volume.
- **Phase 2 — directionals engine.** Generalise card A2 into the court/trajectory
  system; ship module A complete.
- **Phase 3 — modules B and C.**
- **Phase 4 — polish.** Themes, install prompt, reduced-motion pass, lefty toggle.

## Known deviations

- **The backhand artwork is two-handed; the coaching content is not.** All
  concepts stay written for a one-handed backhand — only the drawing differs.
  Swap `assets/silhouettes/backhand.svg` when a one-handed source turns up.
- **The figure is female, in a skirt**, and the player is a boy. Visible at
  render size. Same fix: better source art, no code change.
- **The serve pose is a pre-serve stance**, not contact overhead. Fine as a
  marker; a serve card that shows the ball leaving the racket will need a real
  contact pose.

## Open questions

- **Name.** "Vikadakavi" (விகடகவி — the palindrome) is the URL. Is that also the
  in-app title, or does the app want a plainer name like tennis-oath's
  "Djoker Mindset"?
- **Icon/theme.** Reuse tennis-oath's green (`#2ecc71`) so the two apps read as a
  pair, or give this one its own accent?
- **Cross-linking.** Should the last card link onward to tennis-oath (or the oath
  link here), closing the ritual loop?
- **Audio.** tennis-conditioning has voice playback. Assumed not wanted here —
  courtside, 5 minutes, silent. Confirm.
- **Progress memory.** Should it remember where he stopped, or always start at
  card 1? Assumed: always card 1.
