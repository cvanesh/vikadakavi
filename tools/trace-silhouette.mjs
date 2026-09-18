// Traces bitmap artwork into silhouette SVGs meeting docs/ASSET-SPEC.md:
// viewBox 0 0 200 200, feet at y=200, centred on x=100, fill="currentColor".
//
// Two modes:
//   --outline  keep the drawing as drawn — every stroke becomes a filled path
//              and every space it encloses stays a hole. This is what the app
//              ships; it preserves the source artwork exactly.
//   (default)  fill the figure solid, keeping only holes above --hole-min.
//              Reads heavier at small sizes but throws away interior detail.
//
//   node tools/trace-silhouette.mjs in.png out.svg [opts]   --height=N sets figure height in units (default 190)
//   node tools/trace-silhouette.mjs sheet.png out/ --split --names=a,b,c,d --outline
//
// In --split mode every figure is scaled by one shared factor taken from the
// tallest, so a crouched ready position stays shorter than a standing serve.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { join } from 'node:path';

/* ── PNG decode (8-bit, non-interlaced) ─────────────────────────────── */

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG');
  let pos = 8, ihdr = null;
  const idat = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0), height: data.readUInt32BE(4),
        bitDepth: data[8], colorType: data[9], interlace: data[12]
      };
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }

  if (!ihdr) throw new Error('No IHDR');
  if (ihdr.bitDepth !== 8) throw new Error(`Unsupported bit depth ${ihdr.bitDepth}`);
  if (ihdr.interlace !== 0) throw new Error('Interlaced PNG unsupported');
  const ch = CHANNELS[ihdr.colorType];
  if (!ch) throw new Error(`Unsupported colour type ${ihdr.colorType}`);

  const { width: w, height: h } = ihdr;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);

  const paeth = (a, b, c) => {
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  for (let y = 0, rp = 0; y < h; y++) {
    const filter = raw[rp++];
    for (let x = 0; x < stride; x++) {
      const v = raw[rp + x];
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= ch && y > 0 ? out[(y - 1) * stride + x - ch] : 0;
      let r;
      switch (filter) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + b; break;
        case 3: r = v + ((a + b) >> 1); break;
        case 4: r = v + paeth(a, b, c); break;
        default: throw new Error(`Bad filter ${filter}`);
      }
      out[y * stride + x] = r & 0xff;
    }
    rp += stride;
  }
  return { width: w, height: h, channels: ch, data: out, colorType: ihdr.colorType };
}

/* ── masks ──────────────────────────────────────────────────────────── */

/** Ink is anything opaque and darker than `threshold`; artwork colour is ignored. */
function inkMask({ width: w, height: h, channels: ch, data, colorType }, threshold) {
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * ch;
    let lum, alpha = 255;
    if (colorType === 0) lum = data[o];
    else if (colorType === 4) { lum = data[o]; alpha = data[o + 1]; }
    else {
      lum = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      if (colorType === 6) alpha = data[o + 3];
    }
    ink[i] = alpha >= 128 && lum < threshold ? 1 : 0;
  }
  return ink;
}

/**
 * Crop to a figure's box with a blank margin. The margin matters: cropped
 * tight, the artwork's outline runs along the very edge and the background
 * flood has nowhere clean to start, so it never gets around the figure and the
 * interior is mistaken for outside.
 */
const PAD = 3;

function crop(mask, w, box) {
  const cw = box.w + PAD * 2, chh = box.h + PAD * 2;
  const out = new Uint8Array(cw * chh);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      out[(y + PAD) * cw + x + PAD] = mask[(box.y + y) * w + box.x + x];
    }
  }
  return { mask: out, w: cw, h: chh };
}

/** Split a sheet into figures on fully blank columns. */
function figureBoxes(ink, w, h, minGap = 6) {
  const used = [];
  for (let x = 0; x < w; x++) {
    let any = 0;
    for (let y = 0; y < h && !any; y++) if (ink[y * w + x]) any = 1;
    used.push(any);
  }
  const spans = [];
  let start = -1, gap = 0;
  for (let x = 0; x <= w; x++) {
    if (x < w && used[x]) {
      if (start < 0) start = x;
      gap = 0;
    } else if (start >= 0) {
      if (++gap >= minGap || x === w) { spans.push([start, x - gap]); start = -1; gap = 0; }
    }
  }
  return spans.map(([x0, x1]) => {
    let top = h, bottom = -1;
    for (let y = 0; y < h; y++) {
      for (let x = x0; x <= x1; x++) {
        if (ink[y * w + x]) { if (y < top) top = y; if (y > bottom) bottom = y; break; }
      }
    }
    return { x: x0, y: top, w: x1 - x0 + 1, h: bottom - top + 1 };
  });
}

/** Grow (r > 0) or shrink (r < 0) a mask by a square kernel. */
function grow(mask, w, h, r) {
  if (r === 0) return mask;
  const want = r > 0 ? 1 : 0;
  const rad = Math.abs(r);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = 0;
      for (let dy = -rad; dy <= rad && !hit; dy++) {
        for (let dx = -rad; dx <= rad && !hit; dx++) {
          const nx = x + dx, ny = y + dy;
          const v = nx < 0 || ny < 0 || nx >= w || ny >= h ? 0 : mask[ny * w + nx];
          if (v === want) hit = 1;
        }
      }
      out[y * w + x] = r > 0 ? (hit ? 1 : mask[y * w + x])
                             : (hit ? 0 : mask[y * w + x]);
    }
  }
  return out;
}

function floodBackground(ink, w, h) {
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const i = y * w + x;
    if (x < 0 || y < 0 || x >= w || y >= h || bg[i] || ink[i]) return;
    bg[i] = 1; stack.push(i);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const i = stack.pop(), x = i % w, y = (i - x) / w;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  return bg;
}

function components(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const found = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    const px = [], stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % w, y = (i - x) / w;
      px.push(i);
      const step = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const n = ny * w + nx;
        if (mask[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      };
      step(x + 1, y); step(x - 1, y); step(x, y + 1); step(x, y - 1);
    }
    found.push(px);
  }
  return found.sort((a, b) => b.length - a.length);
}

/* ── contour tracing ────────────────────────────────────────────────── */

const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/**
 * Moore-neighbour boundary trace of the region containing `start`, which must
 * be its topmost-leftmost pixel so the pixel to the left is outside.
 *
 * The backtrack pixel is tracked explicitly rather than inferred from the
 * direction of travel: scanning has to resume at the neighbour immediately
 * after the backtrack, and being one step out sends the walk back on itself.
 */
function traceContour(mask, w, h, start) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  const sx = start % w, sy = (start - sx) / w;
  const contour = [[sx, sy]];

  let px = sx, py = sy, bx = sx - 1, by = sy;

  for (let guard = 0; guard < w * h * 8; guard++) {
    let bi = DIRS.findIndex(([dx, dy]) => px + dx === bx && py + dy === by);
    if (bi < 0) bi = 4;

    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (bi + k) % 8;
      const nx = px + DIRS[d][0], ny = py + DIRS[d][1];
      if (!inside(nx, ny)) continue;
      const prev = (bi + k - 1) % 8;
      bx = px + DIRS[prev][0]; by = py + DIRS[prev][1];
      px = nx; py = ny;
      moved = true;
      break;
    }
    if (!moved) break;
    if (px === sx && py === sy) break;
    contour.push([px, py]);
  }
  return contour;
}

/* ── simplification ─────────────────────────────────────────────────── */

function simplifyOpen(points, epsilon) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;

  const dp = (lo, hi) => {
    if (hi <= lo + 1) return;
    const [ax, ay] = points[lo], [bx, by] = points[hi];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let worst = -1, idx = -1;
    for (let i = lo + 1; i < hi; i++) {
      const [x, y] = points[i];
      const d = Math.abs(dy * x - dx * y + bx * ay - by * ax) / len;
      if (d > worst) { worst = d; idx = i; }
    }
    if (worst > epsilon) { keep[idx] = 1; dp(lo, idx); dp(idx, hi); }
  };
  dp(0, points.length - 1);
  return points.filter((_, i) => keep[i]);
}

/**
 * Douglas-Peucker on a closed loop. Run straight across, it collapses the
 * loop: first and last points sit on top of each other, so every perpendicular
 * distance is zero. Cut at the two most distant points and simplify each half.
 */
function simplify(points, epsilon) {
  if (points.length < 4) return points;
  let far = 1, best = -1;
  const [x0, y0] = points[0];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - x0, points[i][1] - y0);
    if (d > best) { best = d; far = i; }
  }
  const head = simplifyOpen(points.slice(0, far + 1), epsilon);
  const tail = simplifyOpen(points.slice(far), epsilon);
  return head.concat(tail.slice(1, -1));
}

/* ── one figure ─────────────────────────────────────────────────────── */

function traceFigure(ink, w, h, { holeMin, epsilon, close, outline, minArea }) {
  // Outline mode keeps the drawing as drawn: every stroke becomes a filled
  // path and every space it encloses stays a hole. No flood fill, no guessing
  // which gaps are meant to be solid.
  if (outline) {
    const bg = floodBackground(ink, w, h);
    const enclosed = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) enclosed[i] = !ink[i] && !bg[i] ? 1 : 0;

    const strokes = components(ink, w, h).filter((c) => c.length >= minArea);
    if (!strokes.length) throw new Error('No artwork found — try a different --threshold');
    const holes = components(enclosed, w, h).filter((c) => c.length >= 2);

    const loops = [];
    for (const part of [...strokes, ...holes]) {
      const m = new Uint8Array(w * h);
      for (const i of part) m[i] = 1;
      loops.push(simplify(traceContour(m, w, h, part[0]), epsilon));
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const part of strokes) {
      for (const i of part) {
        const x = i % w, y = (i - x) / w;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    return { loops, minX, maxX, minY, maxY, holes: holes.length };
  }

  // Seal hairline breaks in the artwork first. Hand-drawn outlines rarely join
  // perfectly, and a single missing pixel lets the background flood the whole
  // interior, which leaves nothing to fill.
  const sealed = close > 0 ? grow(ink, w, h, close) : ink;
  const bg = grow(floodBackground(sealed, w, h), w, h, -close);

  // Eroding the background nibbles away its outermost ring, which would let
  // the figure touch the crop border and merge with it — the traced "outline"
  // then comes back as the crop rectangle. The padded border is background by
  // construction, so say so.
  for (let x = 0; x < w; x++) { bg[x] = 1; bg[(h - 1) * w + x] = 1; }
  for (let y = 0; y < h; y++) { bg[y * w] = 1; bg[y * w + w - 1] = 1; }

  // Whatever the background could not reach is the figure: ink plus what it encloses.
  const figure = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) figure[i] = bg[i] ? 0 : 1;

  const enclosed = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) enclosed[i] = !ink[i] && !bg[i] ? 1 : 0;
  const holes = components(enclosed, w, h).filter((c) => c.length >= holeMin);

  const solid = figure.slice();
  for (const hole of holes) for (const i of hole) solid[i] = 0;

  const body = components(solid, w, h)[0];
  if (!body) throw new Error('No figure found — try a different --threshold');

  const bodyMask = new Uint8Array(w * h);
  for (const i of body) bodyMask[i] = 1;

  const loops = [simplify(traceContour(bodyMask, w, h, body[0]), epsilon)];
  for (const hole of holes) {
    const m = new Uint8Array(w * h);
    for (const i of hole) m[i] = 1;
    loops.push(simplify(traceContour(m, w, h, hole[0]), epsilon));
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const i of body) {
    const x = i % w, y = (i - x) / w;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { loops, minX, maxX, minY, maxY, holes: holes.length };
}

function writeSVG(path, fig, scale) {
  const midX = (fig.minX + fig.maxX) / 2;
  const n = (v) => Number(v.toFixed(2));
  const map = ([x, y]) => [100 + (x - midX) * scale, 200 - (fig.maxY - y) * scale];
  const d = fig.loops
    .map((loop) => 'M' + loop.map((p) => { const [x, y] = map(p); return `${n(x)} ${n(y)}`; }).join('L') + 'Z')
    .join('');
  writeFileSync(path,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">\n` +
    `  <g fill="currentColor" fill-rule="evenodd"><path d="${d}"/></g>\n` +
    `</svg>\n`);
  return { height: (fig.maxY - fig.minY) * scale, width: (fig.maxX - fig.minX) * scale };
}

/* ── main ───────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const [input, output] = args.filter((a) => !a.startsWith('--'));
const num = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const str = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

if (!input || !output) {
  console.error('usage: trace-silhouette.mjs <in.png> <out.svg|out-dir/> [--split --names=a,b,c] [--height=N] [--hole-min=N] [--epsilon=N] [--threshold=N]');
  process.exit(1);
}

const opts = { holeMin: num('hole-min', 180), epsilon: num('epsilon', 0.75), close: num('close', 1), outline: args.includes('--outline'), minArea: num('min-area', 6) };
const img = decodePNG(readFileSync(input));
const ink = inkMask(img, num('threshold', 160));

if (args.includes('--split')) {
  const boxes = figureBoxes(ink, img.width, img.height, num('min-gap', 6));
  const names = (str('names') ?? '').split(',').filter(Boolean);
  if (names.length && names.length !== boxes.length) {
    console.error(`Found ${boxes.length} figures but got ${names.length} names.`);
    process.exit(1);
  }
  mkdirSync(output, { recursive: true });

  if (process.env.TRACE_DEBUG) {
    boxes.forEach((b, i) => console.log(`  [debug] box ${i}: ${b.w}x${b.h} at ${b.x},${b.y}`));
  }
  const figs = boxes.map((box, i) => {
    const c = crop(ink, img.width, box);
    const fig = traceFigure(c.mask, c.w, c.h, opts);
    const covered = (fig.maxY - fig.minY) / box.h;
    if (covered < 0.8) {
      console.warn(`  ! figure ${i} traced only ${Math.round(covered * 100)}% of its box — ` +
                   `the outline probably has a gap letting the fill escape`);
    }
    return fig;
  });

  // One scale for the whole set, so relative heights survive.
  const tallest = Math.max(...figs.map((f) => f.maxY - f.minY));
  const scale = 190 / tallest;

  figs.forEach((fig, i) => {
    const name = names[i] ?? `figure-${i + 1}`;
    const { height, width } = writeSVG(join(output, `${name}.svg`), fig, scale);
    console.log(`${name}.svg  ${Math.round(width)}x${Math.round(height)} units  ` +
                `holes ${fig.holes}  points ${fig.loops.reduce((a, l) => a + l.length, 0)}`);
  });
} else {
  const fig = traceFigure(ink, img.width, img.height, opts);
  // --height matches a figure from another sheet to an existing set's scale.
  const { height, width } = writeSVG(output, fig, num('height', 190) / (fig.maxY - fig.minY));
  console.log(`${output}  ${Math.round(width)}x${Math.round(height)} units  holes ${fig.holes}`);
}
