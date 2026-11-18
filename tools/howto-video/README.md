# Reel Edits how-to video (step 74)

Makes `app/demo/reel-howto.mp4`: real app screens inside a phone, a yellow arrow and a tap ripple on each button,
an English voice-over, the in-house "Road Trip" music, and tap / whoosh / ding sounds.

1. `python3 make_ph.py` — soft light placeholders for the photo holders (swap the files in `ph/` for real highlights later)
2. `node capture.js` — opens the real app (test server + mock backend) and saves the screens and tap targets to `shots/`
3. `python3 vo.py af_heart` — the voice lines in `lines.json` (kokoro-onnx; other voices: am_michael, bf_emma …)
4. `python3 sfx.py` — the sound effects
5. `node render.js` — draws every frame (`comp.html`) and writes the sound cues
6. `python3 mix.py` — voice + music (lowered under the voice) + effects
7. `ffmpeg -framerate 30 -i frames/f%05d.jpg -i mix.wav -c:v libx264 -crf 20 -pix_fmt yuv420p -c:a aac -shortest out.mp4`

The scripts use the working folder /home/claude/video; change `D` / `OUT` at the top to move it.
