import json, numpy as np, soundfile as sf
sr = 44100; C = json.load(open('cues.json')); END = C['END']; n = int(END * sr)
def rd(f):
    a, r = sf.read(f, dtype='float32', always_2d=True)
    if r != sr:  # resample linearly
        idx = np.arange(0, len(a), r / sr); a = np.stack([np.interp(idx, np.arange(len(a)), a[:, c]) for c in range(a.shape[1])], 1).astype(np.float32)
    if a.shape[1] == 1: a = np.repeat(a, 2, 1)
    return a
voice = np.zeros((n, 2), np.float32); fx = np.zeros((n, 2), np.float32)
for f, at, g in C['cues']:
    a = rd(f) * g; i = int(at * sr); j = min(n, i + len(a))
    if i >= n: continue
    (voice if '/l' in f else fx)[i:j] += a[:j - i]
m = rd('music.wav')[:n]
if len(m) < n: m = np.concatenate([m, np.zeros((n - len(m), 2), np.float32)])
# duck the music under the voice (smooth envelope)
lvl = np.abs(voice).max(1); w = int(0.25 * sr)
k = np.convolve((lvl > 0.01).astype(np.float32), np.ones(w) / w, 'same')
duck = 0.55 - 0.33 * np.clip(k * 3, 0, 1)
t = np.arange(n) / sr; fade = np.clip(t / 0.8, 0, 1) * np.clip((END - t) / 2.0, 0, 1)
mix = m * (duck * fade)[:, None] + voice * 1.15 + fx * 0.8
peak = np.abs(mix).max(); mix = mix / max(1, peak / 0.95)
sf.write('mix.wav', mix, sr); print('peak', round(float(peak), 2))
