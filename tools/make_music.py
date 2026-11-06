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

if __name__ == '__main__' and len(sys.argv) == 2:
    out = sys.argv[1]; meta = {}
    for slug, title, bpm, sa, lead in [('kasavu-morning', 'Kasavu Morning (veena)', 84, 146.83, 'veena'),
                                       ('temple-procession', 'Temple Procession (nadaswaram)', 104, 155.56, 'reed')]:
        x, m = track(slug, bpm, sa, 64, lead); wav(f'{out}/{slug}.wav', x); m['title'] = title; meta[slug] = m
        print(slug, 'peak', round(float(np.abs(x).max()), 3), 'rms', round(float(np.sqrt((x ** 2).mean())), 3))
    json.dump(meta, open(f'{out}/meta.json', 'w'), indent=1)


# ---------------------------------------------------------------------------------------------
# Energetic tracks for the newer reel templates (party / festival / travel). Also fully ours.
def lp(x, k):  # simple low-pass (moving average)
    k = max(1, int(k)); return np.convolve(x, np.ones(k) / k, 'same')

def kick(dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.001, 0.12)

def noise_hit(dur, decay, smooth=1, hp=False):
    n = int(dur * SR); x = rng.uniform(-1, 1, n)
    if hp: x = x - lp(x, 6)
    elif smooth > 1: x = lp(x, smooth)
    return x * env(n, 0.001, decay)

def saw(freq, dur, detune=0.004, voices=3):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for v in range(voices):
        f = freq * (1 + detune * (v - (voices - 1) / 2))
        out += 2 * ((t * f + rng.uniform()) % 1) - 1
    return out / voices

def dhol_bass(dur=0.4):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 70 + 60 * np.exp(-t * 18); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + 0.3 * np.sin(2 * ph)) * env(n, 0.002, 0.14)

def dhol_tilli(dur=0.2):
    n = int(dur * SR); t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 420 * t) * 0.5 + np.sin(2 * np.pi * 690 * t) * 0.3
    return (tone + noise_hit(dur, 0.02, hp=True)[:n] * 0.6) * env(n, 0.001, 0.05)

def master(mix, seconds):
    n = len(mix); tt = np.arange(n) / SR
    mix *= np.minimum(1, tt / 0.6) * np.minimum(1, (seconds - tt) / 2.5).clip(0, 1)
    mix = np.tanh(mix * 1.6) / np.tanh(1.6)
    mix /= max(1e-9, np.abs(mix).max()) / 0.88
    return np.stack([mix, np.roll(mix, int(SR * 0.009)) * 0.97], 1)

def party(seconds=64, bpm=124, root=110.0):
    beat = 60 / bpm; n = int(seconds * SR); mix = np.zeros(n); nb = int(seconds / beat)
    prog = [0, -4, 3, -2]  # i - VI - III - VII (minor feel)
    for b in range(nb):
        t = b * beat; bar = b // 4; ch = root * 2 ** (prog[bar % 4] / 12)
        if b >= 4: add(mix, kick() * 0.9, t)
        if b >= 4 and b % 2 == 1: add(mix, noise_hit(0.25, 0.06, smooth=3) * 0.35, t)          # clap
        if b >= 8: add(mix, noise_hit(0.08, 0.015, hp=True) * 0.18, t + beat / 2)               # off-beat hat
        if b >= 8: add(mix, lp(saw(ch / 2, beat * 0.45, 0.002, 2), 18) * 0.35 * env(int(beat * 0.45 * SR), 0.003, 0.12), t + beat / 2)  # bass
        if b % 4 == 0:
            pad = sum(lp(saw(ch * 2 ** (iv / 12), beat * 4, 0.006), 30) for iv in (0, 3, 7)) / 3
            add(mix, pad * 0.18 * env(int(beat * 4 * SR), 0.05, beat * 3), t)
        if b >= 16 and b % 8 in (0, 3, 6): add(mix, dhol_bass() * 0.45, t)                      # a little dhol
        if b >= 16 and b % 2 == 0: add(mix, dhol_tilli() * 0.25, t + beat * 0.75)
        if b % 16 == 15: add(mix, noise_hit(beat, beat * 0.9, hp=True) * np.linspace(0, .25, int(beat * SR)), t)  # riser
    return master(mix, seconds), {'bpm': bpm, 'beat0': 0.0, 'seconds': seconds}

def festival(seconds=64, bpm=118, sa=146.83):
    beat = 60 / bpm; n = int(seconds * SR); mix = np.zeros(n); nb = int(seconds / beat)
    # bhangra chaal in 8ths: D . . t D . t .
    chaal = 'D..tD.t.'
    for e in range(nb * 2):
        t = e * beat / 2; c = chaal[e % 8]
        if c == 'D': add(mix, dhol_bass() * 0.8, t)
        if c == 't': add(mix, dhol_tilli() * 0.6, t)
        if e >= 16 and e % 2 == 1: add(mix, noise_hit(0.06, 0.012, hp=True) * 0.15, t)  # chimta-ish
    for b in range(0, nb, 4): add(mix, tanpura(sa, beat * 4) * 0.7, b * beat)
    scale = [0, 2, 4, 5, 7, 9, 11, 12]
    phrase = [(4, 1), (5, .5), (4, .5), (2, 1), (0, 1), (2, .5), (4, .5), (5, 1), (7, 2), (5, 1), (4, 1), (2, 2)]
    t = beat * 8
    while t < seconds - beat * 4:
        for d, ln in phrase:
            add(mix, reed(sa * 2 ** (scale[d % 8] / 12), beat * ln * 0.92) * 0.8, t); t += beat * ln
        t += beat * 2
    return master(mix, seconds), {'bpm': bpm, 'beat0': 0.0, 'seconds': seconds}

def travel(seconds=64, bpm=100, root=196.0):
    beat = 60 / bpm; n = int(seconds * SR); mix = np.zeros(n); nb = int(seconds / beat)
    chords = [(0, 4, 7), (7, 11, 14), (9, 12, 16), (5, 9, 12)]  # I V vi IV
    for b in range(nb):
        t = b * beat; ch = chords[(b // 4) % 4]
        for k, iv in enumerate(ch):  # strum
            add(mix, ks_pluck(root * 2 ** (iv / 12), beat * 1.4, bright=0.45, decay=0.995) * 0.35, t + k * 0.018)
        if b % 2 == 0 and b >= 4: add(mix, kick() * 0.5, t)
        if b >= 4: add(mix, noise_hit(0.1, 0.03, smooth=2) * 0.12, t + beat / 2)  # shaker
        if b >= 8 and b % 4 == 2: add(mix, noise_hit(0.2, 0.05, smooth=3) * 0.25, t)  # snare-ish
    return master(mix, seconds), {'bpm': bpm, 'beat0': 0.0, 'seconds': seconds}

if __name__ == '__main__' and len(sys.argv) > 2 and sys.argv[2] == 'energetic':
    out = sys.argv[1]; meta = json.load(open(f'{out}/meta.json')) if __import__('os').path.exists(f'{out}/meta.json') else {}
    for slug, title, fn in [('cocktail-night', 'Cocktail Night (party)', party), ('dhol-festival', 'Dhol Festival (bhangra)', festival), ('road-trip', 'Road Trip (acoustic)', travel)]:
        x, m = fn(); wav(f'{out}/{slug}.wav', x); m['title'] = title; meta[slug] = m
        print(slug, 'peak', round(float(np.abs(x).max()), 3), 'rms', round(float(np.sqrt((x ** 2).mean())), 3))
    json.dump(meta, open(f'{out}/meta.json', 'w'), indent=1)
