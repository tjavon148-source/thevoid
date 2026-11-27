#!/usr/bin/env python3
"""Cuts phone-sized close-ups from the 2160px sample-data screenshots in assets/screens into public/img/zoom-*.webp.
Run: python3 tools/crops.py   (then python3 tools/build.py). Boxes are (left, top, right, bottom) in source pixels."""
import pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
CROPS = {
    "zoom-stats":    ("dashboard",    (333, 167, 1503, 488)),   # Total P&L, trade win %, day win %, profit factor
    "zoom-calendar": ("dashboard",    (333, 508, 1285, 1058)),  # month header and the first three weeks
    "zoom-curve":    ("dashboard",    (1305, 508, 2097, 848)),  # equity curve card
    "zoom-trade":    ("trade-detail", (1453, 229, 2079, 1123)), # net P&L, times, review tags and notes
}
for name, (src, box) in CROPS.items():
    im = Image.open(root / "assets/screens" / f"{src}.png").convert("RGB").crop(box)
    out = root / "public/img" / f"{name}.webp"
    im.save(out, "WEBP", quality=82, method=6)
    print(out.name, im.size, out.stat().st_size // 1024, "KB")
