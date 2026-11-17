import numpy as np, soundfile as sf
sr = 44100
def env(n, a, d): t = np.arange(n) / sr; return np.minimum(1, t / a) * np.exp(-t / d)
def tap():
    n = int(0.12 * sr); t = np.arange(n) / sr
    s = np.sin(2 * np.pi * (900 * np.exp(-t * 25) + 300) * t) * env(n, 0.002, 0.025) * 0.6
    s += np.random.default_rng(1).normal(0, 1, n) * env(n, 0.001, 0.006) * 0.25
    return s
def whoosh(dur=0.45, up=True):
    n = int(dur * sr); t = np.arange(n) / sr; w = np.random.default_rng(2).normal(0, 1, n)
    # band-ish: moving average filters of changing width
    out = np.zeros(n); k = 1
    from numpy.lib.stride_tricks import sliding_window_view
    lp = np.convolve(w, np.ones(12) / 12, 'same'); hp = w - np.convolve(w, np.ones(40) / 40, 'same')
    mix = (t / dur) if up else (1 - t / dur)
    out = lp * (1 - mix) + hp * mix * 0.6
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return out * e * 0.35
def ding():
    n = int(1.2 * sr); t = np.arange(n) / sr; s = np.zeros(n)
    for f, a, st in [(1318.5, .5, 0), (1760, .45, .09)]:
        m = t >= st; tt = t[m] - st; s[m] += a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.45) + a * 0.3 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt / 0.2)
    return s * 0.45
def pop():
    n = int(0.09 * sr); t = np.arange(n) / sr
    return np.sin(2 * np.pi * (500 + 1400 * t / 0.09) * t) * env(n, 0.003, 0.03) * 0.45
for name, s in [('tap', tap()), ('whoosh', whoosh()), ('swipe', whoosh(0.35, False)), ('ding', ding()), ('pop', pop())]:
    sf.write(f'vo/sfx_{name}.wav', s.astype(np.float32), sr)
print('ok')
