# Progress

**Updated:** 2026-09-18 · **LIVE** at https://cvanesh.github.io/vikadakavi/ · 155 tests green · **Contents + The oath (2) + Directionals (16) + Between points (1) + 5 Laws (5)**.

## Published 2026-09-18

Public repo `cvanesh/vikadakavi`, GitHub Pages via Actions, verified live
(HTTP 200, real payload, no `t:1` stamp).

**`main` is a single root commit, deliberately.** The earlier 35 commits were
never pushed: nine of them carried `/references/` (the copyrighted PDFs,
including `Pressure-Tennis.pdf`) in their tree, and every one carried a
test-passphrase payload that anyone could decrypt with `test`. Both are
disqualifying for a public repo. The old history is kept locally on branch
**`history-local`** — **never push it, and never `git push --all`.**

The remote is SSH (`git@github.com:cvanesh/vikadakavi.git`); the stored HTTPS
keychain credential is a dead password and fails.

⚠ **The live payload predates the 2026-09-18 mobile layout fix.** Shipping it
needs `npm run build` with the real passphrase (owner only, hidden prompt, in a
real terminal — the build tool needs a TTY), then commit and push.

Read `VISION.md` for the locked decisions and `TRACEABILITY.md` for goal
coverage. This file is the running state: what exists, what is next, what is
waiting on the owner.

## Resume in one minute

```bash
npm install
VIKADAKAVI_PASSPHRASE=test npm run build
npm run dev                      # http://localhost:8080/
npm test                         # 155 tests, 3 devices
npm run visual                   # screenshots -> dev-tools/artifacts/visual/
npm run scripts                  # check Module A scripts -> review page
npm run scripts -- module-c      # Between points;  -- module-d for the 5 Laws
npm run backup                   # commit src/ + references/ to ../vikadakavi-src
```

Unlock with `test`. Add `?static=1` to freeze every scene
on its final frame — use that when judging geometry rather than motion.

**There is no hot reload.** The browser is served the encrypted bundle, not
`src/`, so re-run the build after every source edit.

**Work in small reads.** Grep for the line, then read with offset/limit. Do not
re-read whole files or re-screenshot every card when one card changed.

### Where things live (all of `src/` is gitignored — back it up)

| What | Where |
| --- | --- |
| Card scripts (the signed-off content) | `src/content/scripts/module-a.js` (Directionals), `module-c.js` (Between points), `module-d.js` (5 Laws), `module-e.js` (the oath — not quote-checked; it is not from `references/`) |
| Book figures as data + owner rulings | `src/content/scripts/figures.js` |
| Figure crops bundled into the payload | `src/content/figures/` (from `python3 tools/extract-figures.py`) |
| Deck assembly: scenes, steps, contents card | `src/content/cards.js` |
| Views | `src/app/scene.js` (court), `sideview.js` (A16, D5, and step 1 of D2), `routine.js` (C1), `oath.js` (E1–E2), `contents.js` |
| Navigation and stepping | `src/app/main.js` — `go()` moves a card, `goStep()` a step |
| Review pages | `http://localhost:8080/dev-tools/artifacts/scripts/module-a.html` and `module-c.html` |

### How the owner reviews

He opens `localhost:8080`, reports a card by number with a screenshot. The loop is:
edit the script → `npm run scripts` → build → screenshot only that card → `npm test` → commit.

## Done

| Area | State |
| --- | --- |
| Encryption | Whole app in one AES-256-GCM payload. `index.html` is a loader + unlock form only. PBKDF2-SHA256, 310k iterations. Verified by tests that no lesson text appears pre-unlock. |
| Build | `tools/build.mjs` (esbuild → one IIFE) → `tools/encrypt.mjs`. `check-payload.mjs` blocks deploying a test-passphrase build. |
| Deploy | `.github/workflows/deploy.yml` verifies the committed ciphertext and publishes to Pages. **Cannot run tests** — `/src/` is deliberately absent from the repo. |
| Court engine | Real ITF geometry from one module; cubic trajectories with bounce + easing; direction arrows; silhouette cross-fade; one rAF clock; reduced-motion support. No runtime dependencies. |
| Perspective | Our player far side, top of screen, facing the viewer. One constant (`OUR_SIDE`) flips the whole deck. |
| Silhouettes | Five poses traced via `tools/trace-silhouette.mjs --outline`: four from `strokes.png`, plus `slice.svg` from `slice.png` (`--height=138`, matched to the set's scale). No forehand volley pose. |
| PWA | `manifest.json` + `sw.js` (shell + payload cached; ciphertext, so caching leaks nothing). |
| Content | **Module A, 16 cards**, built by `src/content/cards.js` from the signed-off scripts. Engine: runs to the ball, multi-rally cards with step captions, serves, zone bands, court labels, a side view (A16). Optional **Why** panel (closes on card change) with the book figures (data URLs inside the payload). |
| Tests | 134 across 3 devices, incl. `deck.spec.js`: every card draws and fits, rally stepping, Why panel stickiness, replay resets the pose, runners move, oath ticks, topic tiles. |
| Sections (2026-09-17) | Deck is **24 cards in four sections**: The oath (2) → Directionals (16) → Between points (1) → 5 Laws (5). The contents card leads with a tappable topic tile per section (icon, blurb, card count), then the full list. |
| The oath | `module-e.js`, copied from the tennis-oath app: player and parent oaths, 12 lines each, a box to tick per line, an in-memory counter. No streaks, no signing, nothing stored. Keeps the source emoji — the owner's exception to the no-emoji rule. |
| Phone layout (2026-09-18) | The copy takes its natural height and the court fills the rest: `.stage{flex:1 1 auto;min-height:40svh}`. It replaced `min-height:calc(100svh - 150px)`, whose 150px covered only the bar (46) and nav (58) — so a 185px copy block sat under the sticky nav with a **36px peek**, and because it was a constant, a taller phone gave every extra pixel to the court and none to the text. Now nothing scrolls on any court card. Court is 66 % of an iPhone 16 Pro (402×874) and 40 % of a 360×640, the tightest shipped. The oath and routine cards still flow and scroll, by design. |
| 5 Laws | `module-d.js` from `references/5_laws_percentage_tennis.txt` (extracted from the PDF with pypdf). Five cards: crosscourt geometry (with a disclaimer that the Directionals decide change of direction), margins (two steps: the air over the net in side view, then the margins measured against their lines), spin, the invitation (two animated steps: dragged to the alley, then recover to the hash mark), your sword. Spin is card D5 and sits after the margins card, not in the book's numbering: it is what pays for the clearance D2 asks for. |

## Pick up here (next session)

**First thing: rebuild and ship the mobile layout fix** (see below) — it is
committed in `src/` but not in the live payload.

Then whichever of these the owner wants:

0. **Owner walks the deck on the phone** now that it is live, and reports cards
   by number. Worth watching whether the court at 40 % of a 360×640 screen
   still reads; on his iPhone 16 Pro it is 66 %.
1. **Owner walks the deck in the browser** and reports cards by number. The new
   pacing means he now has to move every step himself: arrow keys, a swipe, or a
   tap on the step counter. Worth watching whether that reads as obvious on the
   phone, or whether the `›` on the counter needs to be louder.
2. **Card numbers shifted.** Spin is card 22, so the invitation is 23 and the
   sword 24. Any older note that says "card 22" means the invitation.
3. **The side view is still a wide, short picture.** It now takes its own height
   instead of being letterboxed, but a phone still shows a lot of background
   around it. Raising `LIFT` in `sideview.js` (currently 3× vertical
   exaggeration) would make it taller and is the one lever left — it changes how
   steep every side-view flight looks, so it is the owner's call.
4. **The items under "Waiting on the owner"** below are unchanged: real
   passphrase, GitHub repo, push, verify live, remaining source texts, coach
   review of the Module A scripts.

## Next action — Module A content (Phase 1 on hold, owner's call)

Owner decisions 2026-09-16: player has a **forehand weapon**, cards show split-court
and weapon rules; book figures shown on the card (encrypted appendix only if that
does not work); returns get two cards; zones drawn as in fig 4.1.

| # | Task | State |
| --- | --- | --- |
| 1 | Book text (`High-Percentage Tactics.md`) becomes the only quote source | **done** — both hyphen readings accepted |
| 2 | Checker judges inside/outside where he hits the ball | **done** |
| 3 | Encode the 35 rally figures + captions; checker must agree with every caption | **done** — 33/35 agree; figs 3.15, 3.18 (T-serve returns) are open coach questions |
| 4 | Rewrite Module A scripts against the book, each citing figures | **done** — 16 cards (deck at 30/30), all pass; mutation-tested |
| 5 | Review doc: each script beside its book figure (local only) | **done** — `npm run scripts`, then open http://localhost:8080/dev-tools/artifacts/scripts/module-a.html |
| 5a | Tight figure crops: court, labels and caption only — no neighbouring figures or headings (fixed 45/150 px margins were wrong) | **done** — each crop fitted to its own ink |
| 5b | "Why" text for all 16 cards (≤ 90 words, from the book); on the card it sits with the book figure behind an optional Why button | **done** |
| 6 | Owner signs off crops, figures and scripts; answers coach questions | questions **answered** (T-serve and inside returns: show both options; passing shot unlabelled; 30-card ceiling kept for now) — sign-off of crops and scripts waiting on owner |
| 6a | Owner rulings applied: A8 servers/returners in the correct deuce/ad courts; T-serve return drawn as one line (no change and 90° coincide) | **done** |
| 7 | Animate all 16 cards; Why + book figures on demand | **done** — 114 tests green; screenshots in `dev-tools/artifacts/visual/`. Owner review in the browser pending |
| 8 | Known limits: volley/slice pose; court too small at 360×640 | **done** — `slice.svg` (owner's `slice.png`, middle figure) on the A10 backhand approach and A12 backhand volley. Phones: court keeps the screen, copy scrolls below, nav pinned (owner, 2026-09-17); near run-off trimmed to 2.4 m. Court is 77% of a 360×640 screen (was ~50%). Still no forehand volley pose |
| 9 | Contents card (tap to jump), tappable progress marks with section gaps, card counter | **done** |
| 10 | Between points section: C1 protocol card, only `between_point_routine.md`, nearly every line, scrolls. `npm run scripts -- module-c` | **done** — reformatted 2026-09-17 (owner): every line leads with a few bold words, the rest smaller and grey; more air between blocks; on phones the card flows into the page (one scroll) with the headline first |
| 11 | Card for the owner's two Prepare questions (score/pressure; 30–30 or deuce → high percentage) | deferred by owner |
| 12 | Back up `src/` outside the repo. Owner 2026-09-17: `references/` and figure crops go in too; local git only for now, no GitHub remote yet | **done** — `npm run backup` mirrors `src/` + `references/` into `../vikadakavi-src` (own git repo) and commits; never pushes. Adding a private GitHub remote waits on the owner |
| 13 | Owner 2026-09-17 on the 5 Laws cards: card 21 (D2) must show the air over the net as well as the margins; card 22 (D3) must not show the opening until he has recovered, and "line only" alone is misleading | **done** — D2 is two steps, the first a side view with a 3–5 ft band at the net; the margins are measured with a rule against their sideline and their baseline. D3 draws the opening after the recovery run and labels it "line only (hard)". `scene.js` gained a `rules` primitive and hidden marks that reveal in named groups |
| 14 | Owner 2026-09-17: the 5 Laws section shipped four cards. Add Law 3 (spin), visualised or not | **done** — D5, side view only: a topspin ball and a flat ball landing on the same deep spot, the first through D2's 3–5 ft band, the second scraping the tape. Deck is 24 cards + contents |
| 15 | Owner 2026-09-17: steps auto-advanced before they could be read; and the plain band on D2 step 1 did not say what its edges meant | **done** — steps no longer run on a timer. The arrow keys and swipes move a step at a time and roll into the next card at the end; the nav arrows still move a whole card; the step counter is itself a button (`1/2 · … ›`). The band is now dimensioned: each edge is measured back down to the tape and named there, so 3 ft and 5 ft read as clearance. A side view also stops being letterboxed in a portrait stage — it takes its own height and the card centres around it |
| 16 | Owner 2026-09-17: confetti when an oath is completed, player and parent alike | **done** — both oaths share `oath.js`, so one burst covers them. It fires on the tick that completes the list, not on later taps; it is fixed to the viewport (the list scrolls and would clip it); it uses the deck's own palette; `prefers-reduced-motion` skips it, and the count line still turns green and reads "walk on". Leaving the card clears it mid-fall |

## Waiting on the owner

1. ~~Real passphrase~~ · ~~GitHub repo~~ · ~~Push~~ · ~~Verify live~~ — **all done
   2026-09-18.** The passphrase lives only in the owner's head; every rebuild
   needs him at a real terminal.
2. **Rebuild and ship the phone layout fix.** `npm run build` (real passphrase),
   commit `dist/payload.enc.js`, push. Tests are already green — no need for
   `npm run ship`, which would only re-run them and prompt again.
3. **Walk the live deck on the phone**: unlock, airplane mode, Add to Home
   Screen. Standalone mode adds `env(safe-area-inset-top)` (~59 px on a
   Dynamic Island phone) that browser testing does not show.
4. **Text for the remaining sources** — see "Reference material" in `CLAUDE.md`.
5. **Coach review** of `dev-tools/artifacts/scripts/module-a.md` — 14 scripts plus
   8 questions. Cheaper to fix in text than in 14 finished scenes.

## Open questions

- In-app title — is it "Vikadakavi"?
- Share tennis-oath's green (`#2ecc71`) so the two read as a pair, or its own accent?
- Should the last card link onward to tennis-oath?
- Audio — assumed none.
- Resume position — assumed always card 1. (Oath is card 1 of the *ritual*;
  whether it is also card 1 *inside this app* is still unanswered.)

## Known deviations

Recorded in full in `VISION.md`. Short version: the backhand artwork is
two-handed while all content stays one-handed; the figure is female in a skirt;
the serve pose is a pre-serve stance, not contact.

## Bugs fixed that are worth not re-introducing

- Douglas-Peucker collapses closed loops — first and last points coincide, so
  every perpendicular distance is zero. Cut the loop before simplifying.
- Moore-neighbour tracing must resume scanning at the neighbour immediately
  after the backtrack. One step out and the walk doubles back.
- Eroding a flood-filled background clears the crop's outer ring; the figure
  then merges with the border and the traced "outline" is the crop rectangle.
- An SVG with a viewBox in normal flow forces its intrinsic aspect ratio and
  pushes the page taller than the screen. The court is absolutely positioned.
- WebKit reports `strokeDashoffset` as `"0px"`; read computed style, not the
  inline string.
- A scene must not report `done` while a reveal animation is still running.
- `.net-band` is the net in the *top* view (`court.js`). A second rule of the same
  name for the side view silently dimmed every court's net. Side-view paint is
  `.air-band`.
- On phones `.stage` is pinned to `calc(100svh - 150px)`, so a short diagram does
  not shrink the stage — the copy goes off the bottom of the screen instead. Any
  view that is not a full-height court needs an exemption there, as the routine,
  the oath and now the side view have.
