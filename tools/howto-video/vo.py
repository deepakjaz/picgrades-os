import json, soundfile as sf, sys
from kokoro_onnx import Kokoro
k = Kokoro('/tmp/voice/kokoro.onnx', '/tmp/voice/voices.bin')
V = sys.argv[1] if len(sys.argv) > 1 else 'af_heart'
L = json.load(open('lines.json')); out = {}
for key, text in L.items():
    a, sr = k.create(text, voice=V, speed=1.0, lang='en-us')
    sf.write(f'vo/{key}.wav', a, sr); out[key] = round(len(a) / sr, 2)
json.dump(out, open('vo/dur.json', 'w')); print(out)
