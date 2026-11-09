# Merges the Gemini (G) and ChatGPT (C) design packs into app/themes/*.json (data only).
# Usage: python3 tools/merge_designs.py <gemini-folder> <chatgpt-folder>
import json, sys, glob, os
def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def cr(a, b): la, lb = lum(a), lum(b); return (max(la, lb) + .05) / (min(la, lb) + .05)
def one(root, name): return json.load(open(glob.glob(root + '/**/' + name, recursive=True)[0]))
G, C = sys.argv[1], sys.argv[2]
themes, seen = [], set()
for root, by in ((G, 'G'), (C, 'C')):
    for t in one(root, 'themes.json')['themes']:
        if t['id'] in seen: t['id'] += '-' + by.lower()
        seen.add(t['id']); t['by'] = by
        for m in ('light', 'dark'):   # button text: whichever of near-black / white reads best on the accent
            c = t[m]; best = max(['#111111', '#FFFFFF'], key=lambda x: cr(x, c['accent']))
            if cr(c['onAccent'], c['accent']) < 4.5: c['onAccent'] = best
        themes.append(t)
layouts = []
for root, by in ((G, 'G'), (C, 'C')):
    ren = {t: t + '-' + by.lower() for t in ('ivory-glass',)} if by == 'C' else {}
    for l in one(root, 'layouts.json')['layouts']:
        if any(x['id'] == l['id'] for x in layouts): l['id'] += '-' + by.lower()
        l['theme'] = ren.get(l['theme'], l['theme']); l['by'] = by
        l['blocks'] = [x for x in l['blocks'] if x['block'] != 'stats']   # the number box is optional, not in the starting layouts (Deepak, 2026-11-09)
        layouts.append(l)
os.makedirs('app/themes', exist_ok=True)
json.dump({'themes': themes}, open('app/themes/themes.json', 'w'), indent=1, ensure_ascii=False)
json.dump({'layouts': layouts}, open('app/themes/layouts.json', 'w'), indent=1, ensure_ascii=False)
json.dump({'G': one(G, 'icons.json')['icons'], 'C': one(C, 'icons.json')['icons']}, open('app/themes/icons.json', 'w'), indent=1, ensure_ascii=False)
print(len(themes), 'themes:', ', '.join(t['id'] + '/' + t['by'] for t in themes)); print(len(layouts), 'layouts:', ', '.join(l['id'] + '/' + l['by'] for l in layouts))
