#!/bin/sh
# Step 98: short previews for the Reel Edits template list.
# Each template plays a 12-second loop from the song's first beat (beat0). The list used to download the whole song
# (about 1 MB) before any sound; a 12-second mono preview is about 100 KB, so the sound starts in about a second.
# Run from the repo root after adding or changing a song:  sh tools/make-music-previews.sh
set -e
python3 - <<'PY'
import json, subprocess
p = 'app/music/tracks.json'; d = json.load(open(p))
for t in d['tracks']:
    src = t['file'].lstrip('/'); out = 'app/music/preview/' + t['id'] + '.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(t.get('beat0') or 0), '-t', '12', '-i', src, '-ac', '1', '-b:a', '64k', out], check=True)
    t['preview'] = '/' + out
open(p, 'w').write(json.dumps(d, indent=1, ensure_ascii=False))
print('previews made for', len(d['tracks']), 'songs')
PY
