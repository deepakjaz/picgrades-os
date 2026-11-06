"""Makes PicGrades' own instrumental reel tracks (South Indian feel). Fully synthesised here, so we own them.
Usage: python3 tools/make_music.py <out_dir>   → writes .wav files (encode to mp3 with ffmpeg)."""
import sys, json, numpy as np
SR = 44100
rng = np.random.default_rng(7)

def env(n, a, d):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
    return e

def ks_pluck(freq, dur, bright=0.5, decay=0.996):
    """Karplus-Strong plucked string (veena-like)."""
    n = int(dur * SR); p = max(2, int(SR / freq))
    buf = rng.uniform(-1, 1, p) * 0.6
    k = max(2, int(p * (1 - bright) * 0.25)); buf = np.convolve(np.concatenate([buf, buf]), np.ones(k) / k, 'same')[p // 2: p // 2 + p]  # soft pick, no click
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = decay * 0.5 * (buf[i % p] + buf[(i + 1) % p])
    return out * env(n, 0.006, dur * 0.45)

def tanpura(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for h in range(1, 14):
        amp = (1 / h) * (1.0 if h % 2 else 0.8)
        jaw = 1 + 0.002 * np.sin(2 * np.pi * 0.6 * t + h)
        out += amp * np.sin(2 * np.pi * freq * h * jaw * t + rng.uniform(0, 6))
    return out * env(n, 0.02, dur * 0.55) * 0.12

def thump(dur=0.45):  # mridangam "tha" (bass side)
    n = int(dur * SR); t = np.arange(n) / SR
    f = 95 * np.exp(-t * 6) + 60
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.002, 0.16) * 0.9

def ring(freq, dur=0.35):  # mridangam "nam/thi" (tuned treble side)
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for k, a in [(1, 1), (2, .5), (3, .32), (4, .2), (5.1, .12)]:
        out += a * np.sin(2 * np.pi * freq * k * t)
    click = rng.uniform(-1, 1, n) * env(n, 0.0005, 0.004)
    click = np.convolve(click, np.ones(12) / 12, 'same')
    return (out * env(n, 0.002, 0.11) + click * 0.15) * 0.35

def reed(freq, dur, vib=5.2):  # nadaswaram-ish reed
    n = int(dur * SR); t = np.arange(n) / SR
    f = freq * (1 + 0.006 * np.sin(2 * np.pi * vib * t) * np.minimum(1, t / 0.25))
    ph = 2 * np.pi * np.cumsum(f) / SR
    out = sum((1 / k) * np.sin(k * ph) for k in range(1, 9))
    # soften
    k = int(SR * 0.0006); out = np.convolve(out, np.ones(k) / k, 'same')
    e = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08).clip(0, 1)
    return out * e * 0.16

def add(mix, sig, at):
    r = min(len(sig), int(SR * 0.03))
    if r > 1: sig = sig.copy(); sig[-r:] *= np.linspace(1, 0, r)  # no clicks at note ends
    i = int(at * SR)
    if i >= len(mix): return
    j = min(len(mix), i + len(sig)); mix[i:j] += sig[: j - i]

MOHANAM = [0, 2, 4, 7, 9]
def note(sa, deg):  # deg: index in scale, can go beyond 5 (next octave)
    o, d = divmod(deg, 5)
    return sa * 2 ** ((MOHANAM[d] + 12 * o) / 12)

def track(name, bpm, sa, seconds, lead):
    beat = 60 / bpm; n = int(seconds * SR); mix = np.zeros(n)
    nbeats = int(seconds / beat)
    # tanpura cycle: Pa Sa Sa Sa(low) — one pluck every beat
    tcycle = [sa * 1.5 / 2, sa, sa, sa / 2]
    for b in range(nbeats):
        add(mix, tanpura(tcycle[b % 4], beat * 3.5), b * beat)
    # mridangam, adi talam feel over 8 beats (in half-beats)
    pat = 'T.n.tnT.n.T.tnn.'  # T=thump n=ring(sa*2) t=ring(sa*3)
    for b in range(nbeats * 2):
        if b < 8: continue  # intro: drone + melody only
        c = pat[b % len(pat)]
        if c == 'T': add(mix, thump(), b * beat / 2)
        elif c == 'n': add(mix, ring(sa * 2), b * beat / 2)
        elif c == 't': add(mix, ring(sa * 3) * .8, b * beat / 2)
    # melody phrases (scale degrees, length in beats); 0 = Sa
    phrases = [[(5, 1), (6, 1), (7, 2), (6, 1), (5, 1), (4, 2)],
               [(3, 1), (4, 1), (5, 1), (7, 1), (6, 2), (5, 2)],
               [(7, 1), (8, 1), (9, 2), (8, 1), (7, 1), (6, 1), (5, 1)],
               [(4, 1), (3, 1), (2, 1), (3, 1), (4, 2), (5, 2)]]
    t = beat * 4; k = 0
    while t < seconds - beat * 6:
        for deg, ln in phrases[k % len(phrases)]:
            f = note(sa, deg)
            if lead == 'veena':
                s = ks_pluck(f, min(beat * ln * 1.6, 2.2), bright=0.35) * 0.55
                add(mix, s, t)
                if ln >= 2: add(mix, ks_pluck(f * 2, beat, bright=0.2) * 0.12, t + beat)
            else:
                add(mix, reed(f, beat * ln * 0.95), t)
            t += beat * ln
        k += 1
        if k % 4 == 0: t += beat * 2  # breath
    # gentle master: fade in/out, soft limit
    tt = np.arange(n) / SR
    mix *= np.minimum(1, tt / 1.5) * np.minimum(1, (seconds - tt) / 3).clip(0, 1)
    mix = np.tanh(mix * 1.4) / np.tanh(1.4)
    mix /= max(1e-9, np.abs(mix).max()) / 0.85
    stereo = np.stack([mix, np.roll(mix, int(SR * 0.012)) * 0.97], 1)
    return stereo, {'bpm': bpm, 'beat0': 0.0, 'seconds': seconds}

def wav(path, x):
    import wave
    d = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(d.tobytes())

if __name__ == '__main__':
    out = sys.argv[1]; meta = {}
    for slug, title, bpm, sa, lead in [('kasavu-morning', 'Kasavu Morning (veena)', 84, 146.83, 'veena'),
                                       ('temple-procession', 'Temple Procession (nadaswaram)', 104, 155.56, 'reed')]:
        x, m = track(slug, bpm, sa, 64, lead); wav(f'{out}/{slug}.wav', x); m['title'] = title; meta[slug] = m
        print(slug, 'peak', round(float(np.abs(x).max()), 3), 'rms', round(float(np.sqrt((x ** 2).mean())), 3))
    json.dump(meta, open(f'{out}/meta.json', 'w'), indent=1)
