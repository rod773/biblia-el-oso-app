from PIL import Image, ImageDraw
import math, os

OUT = "public"
os.makedirs(OUT, exist_ok=True)

BG = (7, 26, 51)        # #071a33
GOLD = (240, 180, 41)   # #f0b429
GOLD_DIM = (200, 148, 30)

def draw_icon(size, padding_ratio):
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    inner = size * (1 - 2 * padding_ratio)
    x0 = (size - inner) / 2
    y_center = size / 2
    for amp_ratio, color, width_ratio, phase, cycles in [
        (0.28, GOLD, 0.055, 0.0, 2.0),
        (0.18, GOLD_DIM, 0.035, 0.5, 2.0),
        (0.10, (170, 120, 25), 0.025, 1.0, 2.0),
    ]:
        amp = inner * amp_ratio
        half_w = max(1.0, size * width_ratio / 2)
        steps = 256
        top, bottom = [], []
        for s in range(steps + 1):
            t = s / steps
            x = x0 + t * inner
            y = y_center + amp * math.sin(2 * math.pi * (t * cycles + phase))
            top.append((x, y - half_w))
            bottom.append((x, y + half_w))
        d.polygon(top + bottom[::-1], fill=color)
    return img

draw_icon(192, 0.10).save(f"{OUT}/icon-192x192.png", "PNG")
draw_icon(512, 0.10).save(f"{OUT}/icon-512x512.png", "PNG")
draw_icon(512, 0.18).save(f"{OUT}/icon-maskable-512x512.png", "PNG")
draw_icon(180, 0.10).save(f"{OUT}/apple-touch-icon.png", "PNG")

for f in ["icon-192x192.png", "icon-512x512.png", "icon-maskable-512x512.png", "apple-touch-icon.png"]:
    p = os.path.join(OUT, f)
    print(f, os.path.getsize(p), "bytes")
