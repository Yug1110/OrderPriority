#!/usr/bin/env python3
"""
Build the link-preview image (WhatsApp / Instagram / Facebook) and the
home-screen icon from product photos, using the brand name in config.js.

    python3 scripts/make-share-image.py

Writes assets/brand/og.jpg (1200x630) and assets/brand/apple-touch-icon.png.
Re-run after changing the brand name or tagline.
"""
import os
import re

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "scripts", "fonts")
CFG = open(os.path.join(ROOT, "config.js")).read()
NAME = re.search(r'name:\s*"([^"]+)"', CFG).group(1)
TAGLINE = re.search(r'tagline:\s*"([^"]+)"', CFG).group(1)

CREAM, OAT, WALNUT, WALNUT2, TERRA = "#fbf6ef", "#efe4d6", "#5b4636", "#7d6656", "#c8795a"
PHOTOS = [
    "star-cloud-jogger-set/rust-1",
    "zip-bomber-jogger-set/olive-3",
    "double-top-set/mustard-1",
]


def font(name, size, weight):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    try:
        f.set_variation_by_axes([weight] if name.startswith("nunito") else [144, weight, 0, 0])
    except Exception:
        pass
    return f


def rounded(im, radius, top_arch=False):
    mask = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(mask)
    w, h = im.size
    if top_arch:
        d.ellipse((0, 0, w, w), fill=255)
        d.rounded_rectangle((0, w // 2, w, h), radius, fill=255)
    else:
        d.rounded_rectangle((0, 0, w, h), radius, fill=255)
    im.putalpha(mask)
    return im


def photo(path, size):
    im = Image.open(os.path.join(ROOT, "assets", "products", path + ".webp")).convert("RGB")
    return ImageOps.fit(im, size, Image.LANCZOS, centering=(0.5, 0.35))


def og():
    W, H = 1200, 630
    c = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(c)
    d.ellipse((780, -260, 1380, 340), fill="#f6e1da")
    d.ellipse((-220, 420, 260, 900), fill="#dfe5d6")

    big = rounded(photo(PHOTOS[0], (300, 470)), 26, top_arch=True)
    c.paste(big, (600, 80), big)
    for i, p in enumerate(PHOTOS[1:]):
        sm = rounded(photo(p, (230, 222)), 24)
        c.paste(sm, (920, 80 + i * 248), sm)

    d.text((70, 150), "BABY CLOTHING · 0–24 MONTHS", font=font("nunito.ttf", 20, 800), fill=TERRA)
    title = font("fraunces.ttf", 88, 500)
    d.text((66, 190), NAME, font=title, fill=WALNUT)
    body = font("nunito.ttf", 30, 500)
    y = 310
    for line in wrap(TAGLINE if TAGLINE[-1] in ".!?" else TAGLINE + ".", body, 470):
        d.text((70, y), line, font=body, fill=WALNUT2)
        y += 42
    pill = font("nunito.ttf", 24, 800)
    d.rounded_rectangle((70, y + 34, 382, y + 96), 31, fill=WALNUT)
    d.text((100, y + 49), "Order on WhatsApp", font=pill, fill=CREAM)
    c.save(os.path.join(ROOT, "assets", "brand", "og.jpg"), quality=86)


def wrap(text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if f.getlength(t) > width and cur:
            lines.append(cur)
            cur = w
        else:
            cur = t
    return lines + [cur]


def icon():
    # acorn mark, matching assets/brand/favicon.svg (drawn at 4x, then downsampled)
    k, s = 4, 180
    c = Image.new("RGB", (s * k, s * k), OAT)
    d = ImageDraw.Draw(c)
    u = s * k / 40  # svg units -> pixels
    d.rounded_rectangle((12.8 * u, 17 * u, 27.2 * u, 24 * u), 1 * u, fill=TERRA)
    d.chord((12.8 * u, 12 * u, 27.2 * u, 32.4 * u), 0, 180, fill=TERRA)
    d.chord((11.2 * u, 12.4 * u, 28.8 * u, 26.4 * u), 180, 360, fill=WALNUT)
    d.line((20 * u, 12.8 * u, 21.2 * u, 8.6 * u), fill=WALNUT, width=int(1.6 * u))
    d.ellipse((22.2 * u, 7.2 * u, 29 * u, 10 * u), fill="#8a9a7b")
    c.resize((s, s), Image.LANCZOS).save(os.path.join(ROOT, "assets", "brand", "apple-touch-icon.png"))


if __name__ == "__main__":
    og()
    icon()
    print("wrote assets/brand/og.jpg and apple-touch-icon.png for", NAME)
