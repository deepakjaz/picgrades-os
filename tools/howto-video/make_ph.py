# soft bokeh "photos" for the template holders (no real faces): warm wedding light colours
import random, math
from PIL import Image, ImageDraw, ImageFilter
pals = [((92,18,32),(196,120,60)), ((40,14,40),(230,170,90)), ((120,40,20),(250,210,130)), ((20,30,60),(220,180,110)),
        ((70,10,30),(250,150,120)), ((30,40,30),(240,200,120)), ((110,60,20),(255,230,170)), ((50,20,60),(250,180,200))]
random.seed(4)
for i in range(16):
    w, h = (1600, 1067) if i % 3 else (1067, 1600)
    a, b = pals[i % len(pals)]
    im = Image.new('RGB', (w, h)); d = ImageDraw.Draw(im)
    ang = random.random() * math.pi
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=tuple(int(a[k] + (b[k] - a[k]) * (t * 0.8)) for k in range(3)))
    lay = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ld = ImageDraw.Draw(lay)
    for _ in range(26):
        r = random.randint(40, 150); x = random.randint(-50, w + 50); y = random.randint(-50, int(h * 0.85))
        c = random.choice([(255, 214, 140), (255, 236, 200), (250, 180, 120), (255, 200, 210), b])
        ld.ellipse([x - r, y - r, x + r, y + r], fill=c + (random.randint(50, 110),), outline=c + (160,), width=3)
    lay = lay.filter(ImageFilter.GaussianBlur(16))
    im = Image.alpha_composite(im.convert('RGBA'), lay).convert('RGB').filter(ImageFilter.GaussianBlur(2))
    im.save('ph/ph%02d.jpg' % i, quality=86)
print('ok')
