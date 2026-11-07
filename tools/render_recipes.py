"""Make WAV files from the music recipes in tools/music_recipes/ (Gemini and ChatGPT wrote them in the format from the helpers brief).
Usage: python3 tools/render_recipes.py tools/music_recipes/gemini_tracks.py /tmp/wav   then convert with ffmpeg -i x.wav -b:a 128k app/music/x.mp3
Some recipes call our sound helpers slightly differently, so two small adapters are added."""
import sys, numpy as np, importlib.util, types, inspect
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_music as mm
def run(path, out):
    src = open(path).read()
    ns = {k: getattr(mm, k) for k in dir(mm) if not k.startswith('__')}
    _nh, _ms = mm.noise_hit, mm.master
    ns['noise_hit'] = lambda dur, decay=40, *a, **k: _nh(dur, decay, *a, **k)
    ns['master'] = lambda mix, seconds=None: _ms(mix, seconds if seconds is not None else len(mix) / 44100)
    exec(compile(src, path, 'exec'), ns)
    for name, f in list(ns.items()):
        if name.startswith('track_') and callable(f):
            try:
                x = np.asarray(f(), dtype=np.float32)
                if x.ndim == 2: x = x.mean(axis=1) if x.shape[1] <= 2 else x.mean(axis=0)
                peak = float(np.abs(x).max()); rms = float(np.sqrt((x**2).mean()))
                q = int(len(x) / 44100); silent = sum(1 for k in range(q) if np.abs(x[k*44100:(k+1)*44100]).max() < 0.01)
                mm.wav(out + '/' + name[6:].replace('_', '-') + '.wav', x)
                print(f'{name:28s} {len(x)/44100:5.1f}s peak {peak:.2f} rms {rms:.3f} silent-seconds {silent} clipped {int((np.abs(x) > 0.999).sum())}')
            except Exception as e:
                print(f'{name:28s} ERROR {type(e).__name__}: {str(e)[:100]}')
import os; os.makedirs(sys.argv[2], exist_ok=True); run(sys.argv[1], sys.argv[2])
