# Vikadakavi — Claude Instructions

Pre-match tactical refresher PWA for a junior tennis player.

**Start here, in order:** `docs/PROGRESS.md` (where the work stands, how to
resume, what is waiting on the owner) → `docs/VISION.md` (locked decisions,
card budget, phase gates) → `docs/TRACEABILITY.md` (every requirement and
whether it is actually covered).

## Repo layout

```
/                     index.html (loader + unlock gate only), manifest.json, sw.js
/dist/payload.enc.js  the encrypted app bundle — the ONLY build output committed
/src/                 GITIGNORED plaintext: app/, content/, styles/
/assets/silhouettes/  source SVGs (see docs/ASSET-SPEC.md)
/tools/               build, encrypt, dev-server, check-payload, trace-silhouette
/tests/               Playwright specs
/docs/                PROGRESS, VISION, TRACEABILITY, ASSET-SPEC
/references/          GITIGNORED source material — never published (see Reference material)
/dev-tools/artifacts/ gitignored screenshots and reports
```

**Cleanliness rule.** Repo root holds only PWA entry points (`index.html`,
`manifest.json`, `sw.js`), config files, `README.md`, `CLAUDE.md`, `.gitignore`.
New docs → `docs/`. New scripts → `tools/`. Generated output →
`dev-tools/artifacts/`. Never add a file to the root without a reason it must be
top-level. Keep files compact; delete dead code rather than commenting it out.

**Edit files with the Write and Edit tools** (owner, 2026-09-17) — never with a
Python/sed/heredoc script from the shell. Shell scripting a file edit hides the
diff and makes a bad patch hard to see. Bash is for running things, not for
rewriting source.

## Architecture

The whole app is encrypted. `index.html` ships an unlock form and nothing else:

1. `tools/build.mjs` concatenates `src/` + inlined `assets/silhouettes/*.svg`
   into one JS bundle string.
2. `tools/encrypt.mjs` wraps it in AES-256-GCM (PBKDF2, SHA-256, 310k
   iterations) and writes `dist/payload.enc.js` as `window.PAYLOAD = '<b64>'`.
3. On correct passphrase, `index.html` decrypts in memory and injects the bundle
   via a Blob module URL. Plaintext never touches localStorage or the DOM as text.

Passphrase lives only in the operator's head and process memory. Never write it
to a file, a commit, a CI secret, or a transcript.

### Editing content

Edit files under `/src/` directly, then `npm run build`. There is no decrypt
step — `/src/` *is* the plaintext, and it is gitignored. **Run `npm run backup`
before any destructive git operation.**

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Serve `/src/` unencrypted at :8080 for fast iteration |
| `npm run build` | Bundle + encrypt → `dist/payload.enc.js` (prompts for passphrase) |
| `npm test` | Playwright suite against the built, encrypted app |
| `npm run visual` | Screenshot sweep → `dev-tools/artifacts/visual/` |
| `npm run scripts` | Verify card scripts in `src/content/scripts/` → review doc in `dev-tools/artifacts/scripts/`. Defaults to `module-a`; pass `-- module-b` etc. for the others |
| `npm run backup` | Mirror `src/` + `references/` into `../vikadakavi-src` (local git, never pushed) |
| `npm run ship` | test → build → verify. The real pre-commit gate. |

CI cannot test: `/src/` is gitignored, so the Action has nothing to build. It
only verifies `dist/payload.enc.js` and publishes. Never claim a change is
"verified by CI" — run `npm run ship` locally and say what it reported.

## Non-negotiable constraints

- **Aim for ~30 cards, ~5 minutes total.** A soft target since 2026-09-16 — the owner
  allows going over for now. Every card still has to earn its ~10 seconds.
  **The deck is at 29 + contents as of 2026-09-18, so the ceiling is reached:**
  a new card displaces one, or the owner lifts the limit. `cards.js` only warns.
- **Mobile first, 390 px portrait** is the design target; desktop is secondary.
- **Offline after first unlock.** Service worker caches the shell + payload.
- **Right-handed, one-handed backhand** reference frame. All court geometry must
  be authored mirrorable — never hardcode a side.
- **Court geometry comes from `src/app/court-geometry.js`** at real ITF
  proportions. Never hand-place a rectangle in a diagram.
- Icons are inline SVG, `currentColor`-driven. **No emoji in UI** — with one
  exception (owner, 2026-09-17): the oath cards keep the per-line emoji copied
  from the tennis-oath app, so the two apps read as one ritual.

## Charts must not need explaining

Section B (`The hidden math`) draws numbers instead of courts, via
`src/app/bars.js`. Two rules, both learned by shipping the mistake:

- **Never put a single derived statistic on a bar.** A leverage of `0.46` was
  read as "you have a 46% chance", which is wrong — it is the *swing* between
  88% if you win the point and 42% if you lose it. Draw both ends of a range, or
  a count of something real ("1 double fault in every 25 service points"), and
  let the length of the bar carry the magnitude.
- **Check what the chart implies, not just whether the numbers are right.**
  64.8% against 63.0% drawn on the same axis as 4% against 16% was accurate in
  every value and argued the exact opposite of the card it sat on.

If a card cannot answer "so what does that mean for me?" in one sentence, it is
not finished.

## The content doctrine — do not improvise it

The tactical system is **Paul Wardlaw's Directionals**, from
`references/paul_waldrow_directonals.txt`. Work from that file. Reconstructing
it from general tennis knowledge has already produced two wrong definitions in
this project; both shipped before being caught.

**Inside vs outside is measured against the PLAYER'S BODY, never the court
lines.** Wardlaw is explicit. Draw the line through the player, perpendicular to
the net:

- **Outside ball** — its flight crosses that line as it reaches him. Do **not**
  change direction; send it back the way it came. Square contact, biggest margin.
- **Inside ball** — it starts and finishes on the same side of the line. **Do**
  change direction; the hips and shoulders clear out naturally, so this is the
  high-percentage play, not the brave one.

Two consequences that are easy to lose (confirmed against the book's figures, `docs/FIGURES.md`):

1. **Judge from where he hits the ball**, with contact a small offset to his racket
   side — see `A2_STANCE` vs `A2_CONTACT` in `src/content/cards.js`. The line
   moves with the player: in a run-around forehand he steps round a crosscourt
   ball, so it does not cross him — it is an **inside** forehand (book fig 3.13,
   3.21), and hitting it inside-out is inside with no change of direction.
2. **Players with a weapon have their own rules.** Deep inside forehand: inside-out,
   no change of direction. Three-quarter-court or shorter, from inside the
   baseline: 90° change of direction (fig 3.14).

`classifyBall(from, to, centreX)` implements this, and `cards.js` throws at
build time if a card's diagram does not match the label it claims.

**"Perpendicular" means the 90° change of direction** — hitting perpendicular to
the opponent's baseline, straight down the court. It is for *short outside
balls*, where a sharp angle is a gamble: go 90° down the line for margin and
spend everything on depth.

## Reference material

**STRICT: nothing under `/references/` is ever published** — not committed, not
pushed, not deployed, not put in an artifact, not pasted into a public doc. That
covers derived copies too: figure crops, captions and extended quotes. They live
only in gitignored paths (`/references/`, `/src/`, `/dev-tools/artifacts/`).
Shipping a derived image inside the encrypted payload needs the owner's explicit OK first.


| File | State |
| --- | --- |
| `High-Percentage Tactics.md` | Book text, ch. 3–4. **The** source for Module A. Figures indexed in `docs/FIGURES.md`. Untracked — do not commit. |
| `paul_waldrow_directonals.txt` | Secondary summary. Quote the book instead. |
| `tennis-math-guide.md` | Text. Source for Module B, **built and shipped 2026-09-18**. The leverage table at p=0.6 gives hold-chance-if-won and if-lost per score; cards B2 quotes both columns, never the derived leverage alone. |
| `between_point_routine.md` | Text. Four stages — REACT, RECOVER, PREPARE, RITUAL. Use this, not the "three Rs" from the original brief. |
| `5_Laws_Percentage_Tennis.pdf` | Text-extractable. Crosscourt geometry, law of margins. |
| `Pressure-Tennis.pdf` | **Scanned, rotated 180°.** No text layer. Page images extract as JPEGs (DCTDecode) and contain court diagrams worth using as visual reference. Owner is providing text. |
| `tennis_handbook.pdf`, and the three "Guide"/"Strategy" PDFs | Text uses per-font subset encodings. A merged ToUnicode map decodes them with collisions (spaces become `p`). Do **not** build content off that output — ask for text versions. |

## Tooling notes

- `tools/trace-silhouette.mjs` vectorises bitmap artwork with no dependencies —
  there is no potrace, Ghostscript, ImageMagick or Inkscape on this machine.
  `--outline` keeps the drawing as drawn and is what the app ships. `--split`
  cuts a sprite sheet and scales every figure by one shared factor so a crouched
  pose stays shorter than an upright one.
- Default ink threshold is 160. Artwork drawn in mid-tone colour falls below a
  128 threshold and fragments.

## Phase gate

Do not start a phase until the previous one is 100% green: Playwright passing,
visual screenshots reviewed, deployed build verified live. Say a phase is done
only when all three are true — never "should work".

## Git

- Commit freely. **Never push without explicit confirmation from the operator.**
- `/src/` is gitignored on purpose. If git ever reports it as untracked-and-
  about-to-be-cleaned, stop and ask.
