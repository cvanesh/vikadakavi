"""Cut the numbered figures (with captions) out of the Pressure Tennis scans.

Crops go to src/content/figures/ (gitignored; bundled only into the encrypted
payload) with an index.js the app imports. The contact sheet and manifest go to
dev-tools/artifacts/figures/. Book content is never published, see CLAUDE.md.
Needs Python 3 + Pillow + pypdf.
Usage: python3 tools/extract-figures.py
"""
import io, json, pathlib
from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dev-tools/artifacts/figures"
APP = ROOT / "src/content/figures"

# pdf page -> [(figure, court box x0, y0, x1, y1)] on the page rotated upright.
# Boxes seed the court outline; fit() grows each to its labels and caption only.
FIGURES = {
    3: [("3.1", 372, 629, 695, 1220), ("3.2", 733, 635, 1015, 1221)],
    4: [("3.3", 200, 759, 492, 1313), ("3.4", 526, 740, 850, 1320)],
    5: [("3.5", 376, 758, 695, 1341), ("3.6", 745, 754, 1067, 1332)],
    6: [("3.7", 153, 756, 472, 1343), ("3.8", 549, 759, 835, 1343)],
    7: [("3.9", 386, 243, 701, 808), ("3.10", 741, 241, 1060, 808)],
    8: [("3.11", 156, 778, 475, 1348), ("3.12", 522, 779, 839, 1349)],
    10: [("3.13", 157, 257, 485, 814), ("3.14", 519, 261, 840, 816)],
    12: [("3.15", 549, 225, 817, 721), ("3.16", 178, 813, 450, 1319), ("3.17", 545, 817, 816, 1307)],
    13: [("3.18", 782, 234, 1054, 735), ("3.19", 387, 822, 658, 1320), ("3.20", 775, 823, 1045, 1321)],
    14: [("3.21", 349, 261, 669, 859)],
    15: [("3.22", 377, 270, 699, 828), ("3.23", 738, 250, 1061, 830)],
    16: [("3.24", 175, 233, 496, 803), ("3.25", 528, 231, 848, 803)],
    17: [("3.26", 411, 227, 688, 708), ("3.27", 743, 228, 1020, 733),
         ("3.28", 409, 830, 686, 1310), ("3.29", 738, 831, 1016, 1314)],
    18: [("3.30", 168, 239, 461, 752), ("3.31", 552, 228, 839, 745)],
    19: [("3.32", 371, 744, 694, 1315), ("3.33", 728, 746, 1053, 1314)],
    20: [("3.34", 163, 232, 483, 802), ("3.35", 523, 231, 841, 794)],
    24: [("4.1", 340, 745, 684, 1330)],
}
INK, SPECK = 130, 2   # a row/column counts as ink with at least SPECK pixels darker than INK
GAP_LABEL = 16        # blank rows that end the player labels above the court
GAP_CAPTION = 70      # blank rows allowed between the court and its caption
GAP_END = 14          # blank rows that end the caption


def ink_rows(px, x0, x1, y0, y1):
    return [sum(1 for x in range(x0, x1) if px[x, y] < INK) >= SPECK for y in range(y0, y1)]


def fit(scan, fig, box, neighbours):
    """Tight box: the court, the labels touching it, and its own caption — no more."""
    px, W, H = scan.load(), scan.width, scan.height
    x0, y0, x1, y1 = box
    left, right = (x0 - 215, x1 + 90) if fig == "4.1" else (x0 - 45, x1 + 45)
    for nx0, ny0, nx1, ny1 in neighbours:        # never reach into a figure beside this one
        if ny0 < y1 and ny1 > y0:
            if nx1 <= x0: left = max(left, (nx1 + x0) // 2)
            if nx0 >= x1: right = min(right, (x1 + nx0) // 2)
    left, right = max(0, left), min(W, right)

    top, blank = y0, 0                            # walk up through the labels
    for y in range(y0 - 1, -1, -1):
        if ink_rows(px, left, right, y, y + 1)[0]: top, blank = y, 0
        else:
            blank += 1
            if blank >= GAP_LABEL: break

    bottom, blank, seen_gap = y1, 0, fig == "4.1"  # walk down to the end of the caption
    for y in range(y1 + 1, H):
        if ink_rows(px, left, right, y, y + 1)[0]:
            if blank >= 8: seen_gap = True
            bottom, blank = y, 0
        else:
            blank += 1
            if blank >= (GAP_END if seen_gap else GAP_CAPTION): break

    ink = 215 if fig == "4.1" else INK            # fig 4.1's zones are pale grey bands
    cols = [x for x in range(left, right) if sum(1 for y in range(top, bottom + 1) if px[x, y] < ink) >= SPECK]
    m = 8
    return (max(0, cols[0] - m), max(0, top - m), min(W, cols[-1] + m + 1), min(H, bottom + m + 1))


def clean(im):
    """Paper to pure white, then 8 grey levels: crisper on a phone, ~4x smaller."""
    return im.point(lambda v: 255 if v > 200 else v).quantize(8).convert("L")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    APP.mkdir(parents=True, exist_ok=True)
    pages = PdfReader(str(ROOT / "references/Pressure-Tennis.pdf")).pages
    crops = []
    for page, figs in FIGURES.items():
        scan = Image.open(io.BytesIO(pages[page - 1].images[0].data)).rotate(180).convert("L")
        for fig, *box in figs:
            others = [tuple(o[1:]) for o in figs if o[0] != fig]
            crop = fit(scan, fig, tuple(box), others)
            major, minor = fig.split(".")
            name = f"fig-{major}.{int(minor):02d}.png"
            clean(scan.crop(crop)).save(APP / name, optimize=True)
            crops.append({"figure": fig, "pdfPage": page, "box": crop, "file": name})

    # Contact sheet for the owner's tick-off (validation step 3).
    cell, cols = (300, 420), 9
    rows = -(-len(crops) // cols)
    sheet = Image.new("L", (cell[0] * cols, cell[1] * rows), 255)
    draw = ImageDraw.Draw(sheet)
    for i, c in enumerate(crops):
        im = Image.open(APP / c["file"])
        im.thumbnail((cell[0] - 10, cell[1] - 30))
        x, y = (i % cols) * cell[0], (i // cols) * cell[1]
        sheet.paste(im, (x + 5, y + 25))
        draw.rectangle([x, y, x + 60, y + 20], fill=0)
        draw.text((x + 5, y + 4), c["figure"], fill=255)
    sheet.save(OUT / "contact-sheet.png", optimize=True)
    (OUT / "manifest.json").write_text(json.dumps(crops, indent=1))
    names = [(c["figure"], "fig" + c["figure"].replace(".", "_"), c["file"]) for c in crops]
    (APP / "index.js").write_text(
        "// Generated by tools/extract-figures.py — do not edit.\n"
        + "".join(f"import {v} from './{f}';\n" for _, v, f in names)
        + "\nexport const FIGURE_IMAGES = {\n"
        + ",\n".join(f"  '{k}': {v}" for k, v, _ in names) + "\n};\n")
    print(f"{len(crops)} figures -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
