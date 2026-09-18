# Vikadakavi

A five-minute tactical refresher a junior player swipes through before walking
on court: where to hit the ball, which points actually matter, and how to
behave out there.

Live at **cvanesh.github.io/vikadakavi** — passphrase required.
It is the second half of a ritual; the first is
[tennis-oath](https://cvanesh.github.io/tennis-oath).

## How it is put together

The entire app is encrypted. `index.html` contains an unlock form and nothing
else — no lesson text, no court code. On the right passphrase the browser
derives an AES-256-GCM key (PBKDF2-SHA256, 310 000 iterations), decrypts the
bundle in memory and runs it. Nothing is written to storage; a reload means
unlocking again.

Court diagrams are inline SVG at real ITF dimensions, animated with the Web
Animations API. No canvas, no animation library, no runtime dependencies.

## Working on it

```bash
npm install
npm run build     # bundle + encrypt -> dist/payload.enc.js (prompts for passphrase)
npm test          # Playwright: phone, phone-safari, desktop
npm run visual    # screenshot sweep -> dev-tools/artifacts/visual/
```

`/src/` holds the plaintext app and **is gitignored**. Only the ciphertext in
`dist/payload.enc.js` is committed. Back `/src/` up somewhere outside the repo —
git will not do it for you.

### Shipping

```bash
npm run ship      # test -> build with the real passphrase -> verify
git add dist/payload.enc.js && git commit
```

Because `/src/` never leaves your machine, **CI cannot run the tests** — there
is no source in the repo to build from. `npm run ship` is the real gate; the
GitHub Action only verifies the committed ciphertext and publishes
`index.html`, `manifest.json`, `sw.js` and the payload to Pages. A payload built
with the test passphrase is refused.

## Layout

| Path | What |
| --- | --- |
| `docs/VISION.md` | Locked decisions, card budget, phase gates. Read first. |
| `docs/ASSET-SPEC.md` | The contract silhouette SVGs must meet. |
| `src/app/court-geometry.js` | Every court dimension, in one place. |
| `src/content/cards.js` | The deck. Hard ceiling of 30 cards. |
| `references/` | Source material behind the content. |
