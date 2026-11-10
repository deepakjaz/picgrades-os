# Adds the brief-v2 design packs (phone + big screens) to app/themes/*.json — data only.
# Pack A = New_design.zip, pack B = PicGrades_Design_Brief_v2.zip (Deepak, 2026-11-10). Existing themes/layouts stay.
# Usage: python3 tools/merge_designs_v2.py "<pack A folder>" "<pack B folder>"
import json, sys, glob
def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
def cr(a, b): la, lb = lum(a), lum(b); return (max(la, lb) + .05) / (min(la, lb) + .05)
def mix(a, b, t):
    a, b = a.lstrip('#'), b.lstrip('#'); return '#' + ''.join('%02X' % round(int(a[i:i+2], 16) * (1 - t) + int(b[i:i+2], 16) * t) for i in (0, 2, 4))
def one(root, pat): return json.load(open(sorted(glob.glob(root + '/**/' + pat, recursive=True))[0]))
A, Bp = sys.argv[1], sys.argv[2]
T = json.load(open('app/themes/themes.json')); L = json.load(open('app/themes/layouts.json'))
tids = {t['id'] for t in T['themes']}; lids = {l['id'] for l in L['layouts']}
notes = []
for root, by in ((A, 'A'), (Bp, 'B')):
    for t in one(root, 'themes.json')['themes']:
        if t['id'] in tids: t['id'] += '-' + by.lower()
        tids.add(t['id']); t['by'] = by
        for m in ('light', 'dark'):
            c = t[m]
            if cr(c['onAccent'], c['accent']) < 4.5:   # button text: whichever reads best on the accent
                c['onAccent'] = max(['#111111', '#FFFFFF'], key=lambda x: cr(x, c['accent'])); notes.append(t['id'] + ' ' + m + ' onAccent fixed')
            for k in ('ink', 'ink2'):   # body text must read on page, cards and glass (WCAG AA 4.5:1)
                for bgk in ('bg', 'surface'):
                    n = 0
                    while cr(c[k], c[bgk]) < 4.5 and n < 20: c[k] = mix(c[k], '#000000' if lum(c[bgk]) > .4 else '#FFFFFF', .08); n += 1
                    if n: notes.append('%s %s %s darkened/lightened for %s (%d steps)' % (t['id'], m, k, bgk, n))
        T['themes'].append(t)
SIZE_OK = lambda v: isinstance(v, list) and len(v) == 2 and all(isinstance(x, int) and x > 0 for x in v)
for root, by in ((A, 'A'), (Bp, 'B')):
    for l in one(root, '*ayouts.json')['layouts']:
        if l['id'] in lids: l['id'] += '-' + by.lower()
        lids.add(l['id']); l['by'] = by
        if l['theme'] + '-' + by.lower() in tids and l['theme'] not in [t['id'] for t in T['themes'] if t.get('by') == by]: l['theme'] += '-' + by.lower()
        l['blocks'] = [x for x in l['blocks'] if x['block'] != 'stats' and all(SIZE_OK(x.get(k)) for k in ('phone', 'tall', 'wide'))]
        L['layouts'].append(l)
json.dump(T, open('app/themes/themes.json', 'w'), indent=1, ensure_ascii=False)
json.dump(L, open('app/themes/layouts.json', 'w'), indent=1, ensure_ascii=False)
print(len(T['themes']), 'themes;', len(L['layouts']), 'layouts'); print('\n'.join(notes) or 'no colour fixes needed')
for l in L['layouts'][-10:]: print(l['id'], '→', l['theme'], l['theme'] in tids, len(l['blocks']), 'blocks')
