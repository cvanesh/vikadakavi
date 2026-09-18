# Traceability

Every requirement from the original brief, where it lives, and how we know it
works. **Done** means built *and* covered by a test or a reviewed screenshot —
not "should work". Update this alongside `PROGRESS.md`.

## Platform

| ID | Requirement | Status | Where | Evidence |
| --- | --- | --- | --- | --- |
| P1 | Hosted at `cvanesh.github.io/vikadakavi` | **Done** | `manifest.json` scope | Live 2026-09-18; HTTP 200, real payload, no `t:1` stamp |
| P2 | Fully encrypted payload, decrypted only on passphrase | **Done** | `index.html`, `tools/encrypt.mjs` | `gate.spec.js` — payload contains no source; no lesson text pre-unlock |
| P3 | Deploys on push to `main` | **Done** | `.github/workflows/deploy.yml` | Guarded by `check-payload.mjs`; live payload SHA-256 matches the local build byte for byte |
| P4 | Mobile-first PWA | **Done** | `manifest.json`, `sw.js`, `app.css` | `mobile.spec.js` — no sideways scroll, court + nav on the first screen (copy may scroll on phones), 44px targets |
| P5 | Security | **Done** | `index.html` | Passphrase never stored; payload nulled after unlock; `gate.spec.js` |
| P6 | Speed | **Partial** | — | Bundle 35.9 KB; PBKDF2 310k ≈ 0.5 s unlock. Not yet measured on a real phone |
| P7 | Separate app from tennis-oath | **Done** | own repo/scope | By construction |
| P8 | Works offline after first unlock | **Partial** | `sw.js` | Registered and serving live; the airplane-mode walk on the phone is still the owner's to do. An installed copy needs no cache-version bump — `index.html` compares ETags at startup |
| P9 | Shell: where you are, and how to get elsewhere | **Done** | `main.js`, `app.css` | Section + position centred (`5 Laws 3/5`), one overall progress line, Home button to the contents. `mobile.spec.js` covers the line's fraction, Home, and that the deck stops at both ends |

## Content — Directionals (brief item a)

Source: `references/paul_waldrow_directonals.txt`. Card numbering per
`VISION.md` §A. **Scripted** = text verified by `npm run scripts`, awaiting coach
review. The built card shipped as A2 is script **A4**; script A2 is the definition card.

| ID | Requirement | Status | Card |
| --- | --- | --- | --- |
| C1 | The Big Three framework | **Built** | A1 |
| C2 | Inside vs outside — against the body, not the lines | **Built** | A2; rule checked against 35 book figures |
| C3 | When to change direction | **Built** | A3–A5 |
| C4 | Groundstrokes — outside, no COD | **Built** | A3 (square contact, margin folded in) |
| C5 | Groundstrokes — inside, change direction | **Built** | A4 |
| C6 | Why holding the angle is safest | **Built** | A3 cue + Why |
| C7 | When to go perpendicular — the 90° COD | **Built** | A5 |
| C8 | With a weapon (run-around forehand) | **Built** | A6 |
| C9 | Serves, first and second | **Built** | A7 |
| C10 | Return of serve, first and second | **Built** | A8, A9 |
| C11 | Approach shots | **Built** | A10 |
| C12 | Passing shots | **Built** | A11 |
| C13 | Volleys | **Built** | A12 |
| C14 | Recovery / anticipation | **Built** | A13, A14 |
| C15 | Court position — 3 zones | **Built** | A15 (zones as book fig 4.1) |
| C16 | Shot selection — drive / slice / loop | **Built** | A16 (side view) |

Built = in the encrypted app, all 16 cards pass `deck.spec.js` on 3 devices.
Deployed and live since 2026-09-18; not yet walked on the owner's phone.

## Content — Match rules and craft (brief item b)

| ID | Requirement | Status | Source |
| --- | --- | --- | --- |
| C17 | Not all points are equal | **Built** | B2, step 1 |
| C18 | 30–30 and deuce are the hinge (leverage 0.46) | **Built** | B2, step 1 |
| C19 | First to 30 → raise margin, stop going for lines | **Built** | B3 — and it delivers most of C29, which the owner deferred; his call whether C29 still needs its own card |
| C20 | Break point is the biggest point (0.69) | **Built** | B2, step 2 |
| C21 | Small consistent edges: 55% of points ≈ 90% of matches | **Built** | B1 |
| C22 | Second serve — two risky serves is the losing bet | **Built** | B4 |
| C23 | Serve direction — mix wide and T | **Built** | B5 |
| C24 | Fast server → step back to return, recover to baseline | **Backlog** | Owner, 2026-09-18: the trigger is "when you are framing it", not the server's speed. Nothing in `references/` to quote — needs his words first. See the backlog in `PROGRESS.md` |
| C25 | Stay calm — the between-point routine | **Built** | C1: the routine file as a strict protocol — four steps, reset cue, breathing, what winning the routine looks like. Only that file (owner, 2026-09-17) |
| C29 | Prepare questions: score / who is under pressure; 30–30 or deuce → play high percentage | **Covered by B3** | Owner, 2026-09-18: B3 says it, so no separate card is wanted. Closed |
| C26 | Sanctity of court, balls, equipment — never kick a ball | Planned | owner's brief |
| C27 | Smile and shake hands whatever the score | Planned | owner's brief |
| C28 | Percentage tennis — crosscourt geometry, law of margins | Planned | `5_Laws_Percentage_Tennis.pdf` |

## Visualisation

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| V1 | 2D top-view court | **Done** | `court.js`; `visual.spec.js` asserts viewBox + 11 lines |
| V2 | Stationed player on court | **Done** | `silhouette.js` |
| V3 | Inside and outside balls shown | **Done** | A2–A5; labels on A2 |
| V4 | Forehand and backhand response | **Done** | Backhand on A8, A11 |
| V5 | Incoming and outgoing trajectories | **Done** | `trajectory.js`; `visual.spec.js` |
| V6 | Silhouette swaps with animation | **Done** | `visual.spec.js` — ready → stroke cross-fade |
| V7 | Ball travels the court | **Done** | `scene.js`; bounce markers asserted |
| V8 | FH, BH, volley, slice, serve poses | **Partial** | ready/forehand/backhand/serve/slice traced; `slice` also draws the backhand volley. No forehand volley pose |
| V9 | Direction obvious without a legend | **Done** | Arrows; `visual.spec.js` asserts they point the right way |
| V10 | Industry-standard clarity | **Done for A2** | Reviewed screenshots in `dev-tools/artifacts/visual/` |

## Quality and process

| ID | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| Q1 | ~5 minutes (soft since 2026-09-16) | **Partial** | Elapsed clock, now dimmed at the bar's right edge; `cards.js` and `npm run scripts` warn past 30 cards / module budget. **The deck is at 29 + contents, so the ceiling is reached** — a new card displaces one. Still never timed by the owner end to end |
| Q2 | ~10 seconds per card | **Partial** | Design target; nothing advances on a timer. Arrow keys and swipes move one step, then on to the next card, and stop at both ends of the deck (owner, 2026-09-18); the nav arrows move a whole card; the step counter is a button (owner, 2026-09-17) |
| Q3 | Strict Playwright testing | **Done** | 181 tests, 6 spec files, 3 devices |
| Q4 | Mobile rendering verified | **Done** | Pixel 5 + iPhone 13 projects |
| Q5 | Incremental phases, gate at 100% | **Done (process)** | `VISION.md` §Phasing; Phase 1 still open |
| Q6 | Vision file | **Done** | `docs/VISION.md` |
| Q7 | CLAUDE.md summary | **Done** | `CLAUDE.md` |
| Q8 | Proper folder organisation | **Done** | Cleanliness rule in `CLAUDE.md` |
| Q9 | Agents / skills as needed | **N/A so far** | No task has warranted one |

## Content — the hidden math (2026-09-18)

Source: `references/tennis-math-guide.md`; B3 also quotes
`references/5_laws_percentage_tennis.txt` for the margin numbers. Checked by
`npm run scripts -- module-b`. The guide is a maths explainer, so every card has
to land on something he does on court; the four topics that are only derivation
(scoring, the game-win formula, the Markov chain, the IID caveat) are listed
under `UNCOVERED` and deliberately have no card.

| ID | Requirement | Status | Card |
| --- | --- | --- | --- |
| M1 | The amplifier — 55% of points is ~91% of matches | **Built** | B1, bars |
| M2 | Leverage — how much a point is worth, by score | **Built** | B2. Drawn as spans between the two outcomes (lose this point → win it), never as a bare leverage number: the owner read `0.46` as "a 46% chance", which is wrong. Step 1 is the cheap end, step 2 the two that decide the game |
| M3 | Break point is the biggest point, and beats deuce for any server over 50% | **Built** | B2 step 2 — 0% → 69% |
| M4 | Play the hinge scores differently: bigger target, more clearance | **Built** | B3, court. Both balls still obey the Directionals — an outside ball goes back the way it came — so what separates them is where they land, not their direction |
| M5 | Two risky serves is the losing bet | **Built** | B4. Double faults counted out of 25 service points (1 vs 4), not as 4% and 16%; the `(lands × wins)` rule is stated in words, not drawn |
| M6 | Serve as a guessing game — mix wide and T | **Built** | B5, court |

Nothing here overrides the Directionals. B3 is the only card that touches shot
choice and it only asks for more margin on the shot the Directionals already
picked.

## Coverage summary

- **Platform:** 7 of 8 done; offline partial, pending the owner's phone walk.
- **Content:** Contents card + Directionals (16) + Between points (1 of ~6) + 5 Laws (5) + the hidden math (5). Deck is 29 + contents, at the 30 ceiling.
- **Visualisation:** engine complete; breadth limited by card count and two
  missing poses (volley, slice).
- **Process:** in place.

## Content — 5 Laws of Percentage Tennis (owner, 2026-09-17)

Source: `references/5_laws_percentage_tennis.txt`, extracted from the PDF. Checked
by `npm run scripts -- module-d`.

| ID | Requirement | Status | Card |
| --- | --- | --- | --- |
| L1 | Crosscourt geometry — 82.5 ft vs 78, net 3' vs 3'6" | **Built** | D1, with the disclaimer that the Directionals decide change of direction |
| L2 | Margins — 3–5 ft over the net, 3–4 ft inside the lines, miss long not net | **Built** | D2, two steps: the air over the net in side view (a height a top view cannot show), then the margins measured with a rule against their sideline and their baseline |
| L3 | Spin — swing faster with topspin; the spin is what creates the control | **Built** | D5, side view only: a topspin ball and a flat ball landing on the same deep spot, the first through D2's 3–5 ft band, the second scraping the tape. Dropped on 2026-09-17 as technique rather than tactics, restored the same day (owner): the section is called the 5 Laws, and spin is what pays for the clearance D2 asks for. It sits after D2, not in the book's numbering |
| L4 | The sword — build points around the weapon | **Built** | D4 |
| L5 | The invitation — recover on the crosscourt side, near the hash mark | **Built** | D3, two animated steps (one per wing). The opening is drawn only once he has recovered — it is a consequence of where he stands — and reads "line only (hard)" |

## Content — the oath (owner, 2026-09-17)

Copied from the tennis-oath app; not from `references/`, so it is not quote-checked.

| ID | Requirement | Status | Card |
| --- | --- | --- | --- |
| O1 | Player oath, 12 lines, tick each | **Built** | E1 |
| O2 | Parent oath, 12 lines, tick each | **Built** | E2 |
| O3 | No streaks, no signing, nothing stored | **Done** | Ticks live in memory for the session only |
| O4 | Confetti on finishing an oath (owner, 2026-09-17) | **Built** | Both E1 and E2 — one burst in `oath.js`, on the tick that completes the list. Skipped under `prefers-reduced-motion`, where the count line still turns green and reads "walk on" |
