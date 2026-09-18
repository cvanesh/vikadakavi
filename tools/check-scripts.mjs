// Verifies card scripts against Pressure Tennis and the court, and verifies the
// inside/outside rule itself against the book's own figures. Renders a review
// doc for the coach. Usage: node tools/check-scripts.mjs [module-a]
// Output: dev-tools/artifacts/scripts/<name>.md (gitignored — it is lesson text).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { COURT, OURS, FOREHAND_X, classifyBall } from '../src/app/court-geometry.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2] ?? 'module-a';
const load = (file) => import(pathToFileURL(resolve(root, 'src/content/scripts', file)));
const { SCRIPTS, UNCOVERED = [], COACH_QUESTIONS = [], LIMITS,
        SOURCES = ['references/High-Percentage Tactics.md'] } = await load(`${name}.js`);
const { FIGURES } = await load('figures.js');
const BOOK = SOURCES.map((s) => readFileSync(resolve(root, s), 'utf8')).join('\n\n');
const TITLE = name === 'module-a' ? 'Module A — Directionals' : `Section ${name.slice(-1).toUpperCase()}`;

const TOL = { none: 6, ninety: 4, change: 10 };        // degrees, scripts (real metres)
const FIG_TOL = { none: 10, ninety: 5, change: 12 };   // degrees, schematic book drawings
const FIG_ASPECT = 0.43;  // book courts: singles half-width / half-length, as drawn
const SHORT_MAX = 0.75, DEEP_MIN = 0.8;

// The book text is a scan transcription: hyphenated line breaks, stray asterisks.
// A line-end hyphen is either a word break ("pen-/etration") or a real hyphen
// ("three-/quarter"), so the book is normalised both ways.
const norm = (s, join = '') => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\*\*/g, '')
  .replace(/-\s*\n\s*/g, join).replace(/[—–]/g, '-').replace(/\s+/g, ' ');
const inBook = (q) => [norm(BOOK), norm(BOOK, '-')].some((b) => b.includes(norm(q)));
const words = (s) => s.replace(/\*\*/g, '').split(/\s+/).filter(Boolean).length;
const deg = (r) => (r * 180) / Math.PI;
const angleBetween = (a, b) => {
  const r = Math.abs(Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
  return deg(Math.min(r, 2 * Math.PI - r));
};
function direction(contact, from, to, tol) {
  const back = { x: from.x - contact.x, y: from.y - contact.y };
  const v = { x: to.x - contact.x, y: to.y - contact.y };
  const offBack = angleBetween(v, back);
  const offAxis = deg(Math.atan2(Math.abs(v.x), Math.abs(v.y)));
  const backAxis = deg(Math.atan2(Math.abs(back.x), Math.abs(back.y)));
  // A ball that came straight down the court and goes straight back is both
  // "no change" and "90°" (book fig 3.17 vs 3.29), so it satisfies either claim.
  const dir = offAxis <= tol.ninety && backAxis <= tol.change ? 'straight'
    : offAxis <= tol.ninety && offBack > tol.none ? 'ninety'
    : offBack <= tol.none ? 'none' : offBack >= tol.change ? 'change' : 'ambiguous';
  return { dir, offBack, offAxis };
}
const matches = (claim, dir) => claim === dir || (dir === 'straight' && (claim === 'none' || claim === 'ninety'));

const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

// ---- 1. The rule against the book's figures ---------------------------------
// Every figure's caption must agree with what our classifier and direction test
// say about the drawing. A figure with a `ruling` is a disagreement the owner has
// settled: it is reported with the ruling, and must still disagree.
const figReport = [];
const figStatus = new Map();
for (const fig of FIGURES) {
  let ok = true;
  const notes = [];
  for (const [i, s] of fig.shots.entries()) {
    const tag = `fig ${fig.id}${fig.shots.length > 1 ? ` shot ${i + 1}` : ''}`;
    const P = ([u, v]) => ({ x: u * FIG_ASPECT, y: v });
    const contact = P(s.contact), from = P(s.from);
    // Handedness: a right-hander at the top faces the reader, so his forehand is screen-left.
    const fhLeft = s.side === 'top';
    const racketLeft = s.contact[0] < s.body;
    if ((s.glyph === 'single') !== (racketLeft === fhLeft)) {
      fail(tag, `racket glyph (${s.glyph}) is on the wrong side for a right-hander`);
    }
    const ball = classifyBall(from, contact, s.body * FIG_ASPECT);
    let dir;
    if (s.to) dir = direction(contact, from, P(s.to), FIG_TOL);
    const agrees = ball === s.ball && (!s.dir || matches(s.dir, dir.dir));
    const said = `${ball}${dir ? `, ${dir.dir} (${dir.offBack.toFixed(0)}° off the way back)` : ''}`;
    if (s.ruling) {
      if (agrees) fail(tag, 'has a ruling but now agrees with the caption — remove the ruling');
      notes.push(`${tag}: RULED — caption says ${s.ball}${s.dir ? `/${s.dir}` : ''}, rule says ${said}. ${s.ruling}`);
      ok = 'ruled';
    } else if (!agrees) {
      fail(tag, `caption says ${s.ball}${s.dir ? `/${s.dir}` : ''}, rule says ${said}`);
      ok = false;
    } else {
      notes.push(`${tag}: ${said}`);
    }
  }
  figStatus.set(fig.id, ok === true ? 'agrees' : ok === 'ruled' ? 'owner ruling' : 'disagrees');
  figReport.push(...notes);
}

// ---- 2. The scripts ----------------------------------------------------------
// Positions: t = -1..+1 across the singles court, +1 = OUR player's forehand
// sideline (screen-fixed, used on both halves); d = 0 (net) .. 1 (baseline).
const pt = ({ t, d }, side) => ({
  x: FOREHAND_X * t * COURT.SINGLES_HALF,
  y: (side === 'ours' ? OURS : -OURS) * d * COURT.HALF_LENGTH
});
const other = (side) => (side === 'ours' ? 'theirs' : 'ours');

// Inside/outside is judged where he HITS the ball (book figs 3.13, 3.21): `stance`
// is his hitting position; contact sits 0.3 m to his racket side, 0.5 m toward
// the net. The opponent faces the other way, so his forehand is -t.
function contactOf(hitter, side) {
  const at = pt(hitter.stance, side);
  const racket = (hitter.stroke === 'forehand' ? 1 : -1) * (side === 'ours' ? 1 : -1);
  return { x: at.x + FOREHAND_X * racket * 0.3, y: at.y - Math.sign(at.y) * 0.5 };
}

if (SCRIPTS.length > LIMITS.cards) console.warn(`Warning: ${SCRIPTS.length} cards; module target is ${LIMITS.cards} (soft since 2026-09-16).`);
const ids = SCRIPTS.map((s) => s.id);
if (new Set(ids).size !== ids.length) fail('deck', 'duplicate card ids');

const report = new Map();
for (const card of SCRIPTS) {
  const lines = [];
  report.set(card.id, lines);
  if (words(card.title) > LIMITS.titleWords) fail(card.id, `title is ${words(card.title)} words (max ${LIMITS.titleWords})`);
  if (words(card.cue) > LIMITS.cueWords) fail(card.id, `cue is ${words(card.cue)} words (max ${LIMITS.cueWords})`);
  if (!card.why) fail(card.id, 'no Why text');
  else if (words(card.why) > LIMITS.whyWords) fail(card.id, `Why is ${words(card.why)} words (max ${LIMITS.whyWords})`);
  if (!card.quotes.length) fail(card.id, 'no book quote');
  for (const q of card.quotes) {
    if (!inBook(q)) fail(card.id, `quote not found verbatim in ${SOURCES.join(' or ')}: "${q}"`);
  }
  for (const f of card.figures ?? []) {
    if (f === '4.1') continue;
    if (!figStatus.has(f)) fail(card.id, `cites figure ${f}, which is not encoded`);
    else if (figStatus.get(f) === 'owner ruling') lines.push(`cites fig ${f} (settled by owner ruling)`);
  }

  for (const s of card.serves ?? []) {
    const inBox = s.to.d <= COURT.SERVICE_LINE / COURT.HALF_LENGTH && Math.abs(s.to.t) <= 1
      && Math.sign(s.to.t) !== Math.sign(s.from.t);
    if (!inBox) fail(card.id, 'serve does not land in the diagonal service box');
  }
  if (card.serves) lines.push(`${card.serves.length} serves land in the diagonal box`);

  for (const [i, r] of (card.rallies ?? []).entries()) {
    const side = r.side ?? 'ours';
    const tag = `${card.id} rally ${i + 1}`;
    const from = pt(r.from, other(side));
    const stance = pt(r.hitter.stance, side);
    const contact = contactOf(r.hitter, side);
    // Balls must land in the singles court. The player may be dragged outside it,
    // as far as the doubles sideline (5.485 / 4.115 = 1.33 of a singles half).
    const balls = [r.from, ...(r.replies ?? []).map((x) => x.to)].filter(Boolean);
    const stands = [r.hitter.stance, r.hitter.movesFrom].filter(Boolean);
    if (balls.some(({ t, d }) => Math.abs(t) > 1.05 || d < 0 || d > 1.05)) fail(tag, 'a ball lands outside the singles court');
    if (stands.some(({ t, d }) => Math.abs(t) > 1.33 || d < 0 || d > 1.05)) fail(tag, 'the player stands outside the doubles court');

    const ball = classifyBall(from, contact, stance.x);
    if (r.ball && ball !== r.ball) fail(tag, `claims ${r.ball}, geometry says ${ball}`);

    const depth = Math.abs(contact.y) / COURT.HALF_LENGTH;
    const actualDepth = depth <= SHORT_MAX ? 'short' : depth >= DEEP_MIN ? 'deep' : 'mid';
    if (r.depth && r.depth !== actualDepth) fail(tag, `claims ${r.depth}, contact is ${actualDepth} (${depth.toFixed(2)})`);

    const who = side === 'ours' ? 'him' : 'the opponent';
    const parts = [`${ball} for ${who} (${actualDepth}, contact at ${depth.toFixed(2)} of the half)`];
    for (const rep of r.replies ?? []) {
      const { dir, offBack, offAxis } = direction(contact, from, pt(rep.to, other(side)), TOL);
      if (rep.dir && !matches(rep.dir, dir)) fail(tag, `reply claims ${rep.dir}, geometry says ${dir} (${offBack.toFixed(1)}° off the way it came, ${offAxis.toFixed(1)}° off straight)`);
      parts.push(`${rep.ghost ? 'ghost ' : ''}reply ${dir} (${offBack.toFixed(0)}° from the way it came)`);
    }
    lines.push(parts.join('; '));
  }
}

// ---- 3. Review doc -----------------------------------------------------------
const md = [
  `# ${TITLE} — card scripts for coach review`, '',
  `Sources: ${SOURCES.map((s) => `\`${s}\``).join(', ')}. ${SCRIPTS.length} cards.`,
  'Every quote appears word for word in the book. Every diagram is checked by code, and the code is itself checked against the book\'s figures.', '',
  'Our player is right-handed, one-handed backhand, **forehand weapon**. Inside or outside is judged against his body where he hits the ball.', ''
];
for (const c of SCRIPTS) {
  md.push(`## ${c.id} · ${c.chip}`, '', `**${c.title}**`, '', `> ${c.cue}`, '', `**Why.** ${c.why}`, '', `*Diagram:* ${c.shows}`, '');
  for (const s of c.stages ?? []) {
    md.push(`- **${s.name}** (${s.secs})${(s.questions ?? []).map((q, i) => ` — Q${i + 1}: ${q}`).join('')} — ${s.lines.join('; ')}`);
  }
  if (c.stages) md.push('');
  if (c.figures?.length) md.push(`*Book figures:* ${c.figures.join(', ')}`, '');
  const checks = report.get(c.id);
  if (checks.length) md.push(...checks.map((l) => `- ✓ ${l}`), '');
  md.push(...c.quotes.map((q) => `- Book: “${q}”`), '');
}
if (UNCOVERED.length) md.push('## In the book, not on a card', '', ...UNCOVERED.map((u) => `- ${u}`), '');
if (COACH_QUESTIONS.length) md.push('## Questions for the coach', '', ...COACH_QUESTIONS.map((q, i) => `${i + 1}. ${q}`), '');
md.push('## The rule checked against the book\'s figures', '', ...figReport.map((l) => `- ${l}`), '');

const out = resolve(root, 'dev-tools/artifacts/scripts', `${name}.md`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, md.join('\n'));

// Local review page: each script beside the book's own figures. Served by
// `npm run dev` at /dev-tools/artifacts/scripts/<name>.html — never published.
const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const figFile = (f) => { const [a, b] = f.split('.'); return `../../../src/content/figures/fig-${a}.${b.padStart(2, '0')}.png`; };
const cardHtml = (c) => `
<section id="${c.id}">
  <p class="chip">${c.id} · ${esc(c.chip)}</p>
  <h2>${esc(c.title)}</h2>
  <p class="cue">${rich(c.cue)}</p>
  <p class="why"><strong>Why.</strong> ${esc(c.why)}</p>
  <p><em>Diagram:</em> ${esc(c.shows)}</p>
  ${c.figures?.length ? `<div class="figs">${c.figures.map((f) => `<figure><img src="${figFile(f)}" alt="Figure ${f}"><figcaption>Fig ${f} — ${figStatus.get(f) ?? 'zones'}</figcaption></figure>`).join('')}</div>` : ''}
  <ul class="checks">${report.get(c.id).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
  <ul class="quotes">${c.quotes.map((q) => `<li>“${esc(q)}”</li>`).join('')}</ul>
</section>`;
const html = `<!doctype html><meta charset="utf-8"><title>${TITLE} review</title>
<style>
 body{font:15px/1.5 system-ui,sans-serif;max-width:1100px;margin:0 auto;padding:16px;color:#111;background:#fafaf7}
 section{border-top:1px solid #ccc;padding:12px 0}
 .chip{font:600 12px system-ui;text-transform:uppercase;letter-spacing:.05em;color:#555;margin:0}
 h2{margin:4px 0}.cue{font-size:17px}.why{max-width:70ch;color:#222}
 .figs{display:flex;flex-wrap:wrap;gap:12px}.figs figure{margin:0;width:210px}.figs img{width:100%;border:1px solid #ddd;background:#fff}
 figcaption{font-size:12px;color:#555}.checks{color:#1a6b2f;font-size:13px}.quotes{color:#444;font-size:13px}
 .q li{margin-bottom:6px}
</style>
<h1>${TITLE} — scripts beside the sources</h1>
<p>${SCRIPTS.length} cards. Right-handed, one-handed backhand, forehand weapon. Local review only.</p>
${COACH_QUESTIONS.length ? `<h2>Questions for the coach</h2><ol class="q">${COACH_QUESTIONS.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>` : ''}
${SCRIPTS.map(cardHtml).join('')}`;
writeFileSync(out.replace(/\.md$/, '.html'), html);

const ruled = [...figStatus.values()].filter((v) => v === 'owner ruling').length;
console.log(`Figures: ${FIGURES.length - ruled} of ${FIGURES.length} agree with the rule; ${ruled} settled by owner ruling.`);
for (const l of figReport.filter((l) => l.includes('RULED'))) console.log(`  ${l}`);
for (const [id, lines] of report) for (const l of lines) console.log(`  ${id.padEnd(4)} ${l}`);
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`\n${SCRIPTS.length} scripts verified → ${out.replace(root + '/', '')}`);
console.log(`Review beside the book (with npm run dev): http://localhost:8080/dev-tools/artifacts/scripts/${name}.html`);
