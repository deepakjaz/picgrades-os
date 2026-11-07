"""Original wedding music recipes for PicGrades (pure numpy at 44100 Hz).
Each function uses the existing synthesis helpers in tools/make_music.py
(ks_pluck, tanpura, thump, ring, reed, kick, noise_hit, saw, dhol_bass, dhol_tilli, master)
and returns a stereo/mono float array 'mix' between -1 and 1 with an exact BPM,
beat0 = 0.0, and a clean 2-second fade-out."""
import numpy as np

SR = 44100


def _fade_out(mix, seconds_fade=2.0):
    n_fade = int(SR * seconds_fade)
    if len(mix) > n_fade:
        env = np.linspace(1.0, 0.0, n_fade, dtype=np.float32)
        if mix.ndim == 2:
            mix[-n_fade:] *= env[:, None]
        else:
            mix[-n_fade:] *= env
    return np.clip(mix, -1.0, 1.0)


def _add(buf, pos_sec, clip, gain=1.0):
    i = int(pos_sec * SR)
    if i < 0 or i >= len(buf):
        return
    end = min(len(buf), i + len(clip))
    buf[i:end] += clip[: end - i] * gain


def track_sangeet_spark(seconds=64, bpm=120):
    """Energetic Sangeet & Baraat dance track — dhol_bass + dhol_tilli + punchy kick + warm synth plucks."""
    n = int(seconds * SR)
    mix = np.zeros(n, dtype=np.float32)
    beat = 60.0 / bpm
    total_beats = int(seconds / beat)

    # Pentatonic scale in D major (Hz)
    notes = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33]
    melody_pattern = [0, 2, 3, 5, 3, 2, 1, 2]

    for b in range(total_beats):
        t0 = b * beat
        # Four-on-the-floor kick + dhol bass on beat
        _add(mix, t0, kick(0.18), 0.55)
        _add(mix, t0, dhol_bass(0.22), 0.60)

        # Syncopated Bhangra dhol tilli on off-beats
        _add(mix, t0 + 0.5 * beat, dhol_tilli(0.09), 0.45)
        if b % 2 == 1:
            _add(mix, t0 + 0.75 * beat, dhol_tilli(0.08), 0.38)
            _add(mix, t0 + 0.25 * beat, noise_hit(0.06), 0.22)

        # Plucked synth / tumbi riff every half beat
        f1 = notes[melody_pattern[b % len(melody_pattern)]]
        f2 = notes[melody_pattern[(b + 3) % len(melody_pattern)]]
        _add(mix, t0, ks_pluck(f1, beat * 0.9), 0.35)
        _add(mix, t0 + 0.5 * beat, ks_pluck(f2, beat * 0.45), 0.28)

        # Warm bass saw on bar starts
        if b % 4 == 0:
            _add(mix, t0, saw(146.83, beat * 3.8) * 0.22, 1.0)

    return _fade_out(master(mix), 2.0)


def track_pheras_serenity(seconds=68, bpm=84):
    """Soft, sacred & emotional track for Pheras, Anand Karaj, or Nikah — tanpura drone + veena plucks + gentle mridangam."""
    n = int(seconds * SR)
    mix = np.zeros(n, dtype=np.float32)
    beat = 60.0 / bpm
    total_beats = int(seconds / beat)

    # Continuous warm tanpura drone (C and G)
    mix += tanpura(130.81, seconds) * 0.25
    mix += tanpura(196.00, seconds) * 0.18

    # Raag Yaman / auspicious evening intervals
    scale = [261.63, 293.66, 329.63, 370.00, 392.00, 440.00, 493.88, 523.25]
    phrase = [0, 2, 4, 3, 4, 6, 7, 4]

    for b in range(total_beats):
        t0 = b * beat
        # Soft mridangam pulse from beat 0
        if b % 4 in (0, 2):
            _add(mix, t0, thump(0.24), 0.38)
        else:
            _add(mix, t0, ring(0.20), 0.30)

        # Expressive veena pluck on every beat
        freq = scale[phrase[b % len(phrase)]]
        _add(mix, t0, ks_pluck(freq, beat * 1.6), 0.42)
        if b % 2 == 0:
            _add(mix, t0 + 0.5 * beat, ks_pluck(freq * 1.5, beat * 0.8), 0.20)

    return _fade_out(master(mix), 2.0)


def track_royal_shehnai(seconds=64, bpm=96):
    """Regal palace entry & Varmala track — nadaswaram/shehnai reed + ceremonial dhol + plucked strings."""
    n = int(seconds * SR)
    mix = np.zeros(n, dtype=np.float32)
    beat = 60.0 / bpm
    total_beats = int(seconds / beat)

    mix += tanpura(146.83, seconds) * 0.20
    scale = [293.66, 329.63, 369.99, 440.00, 493.88, 587.33]
    motif = [0, 1, 2, 3, 4, 3, 2, 0]

    for b in range(total_beats):
        t0 = b * beat
        # Processional royal drum beat
        _add(mix, t0, dhol_bass(0.26), 0.52)
        if b % 2 == 1:
            _add(mix, t0 + 0.5 * beat, thump(0.18), 0.35)
            _add(mix, t0 + 0.75 * beat, dhol_tilli(0.08), 0.28)

        # Soaring reed melody every 2 beats
        freq = scale[motif[b % len(motif)]]
        if b % 2 == 0:
            _add(mix, t0, reed(freq, beat * 1.8), 0.36)
        _add(mix, t0, ks_pluck(freq * 0.5, beat * 0.9), 0.30)

    return _fade_out(master(mix), 2.0)


def track_mehendi_grooves(seconds=64, bpm=108):
    """Breezy afternoon Mehendi & Haldi groove — acoustic plucks + light folk percussion."""
    n = int(seconds * SR)
    mix = np.zeros(n, dtype=np.float32)
    beat = 60.0 / bpm
    total_beats = int(seconds / beat)

    chords = [
        [261.63, 329.63, 392.00],
        [220.00, 261.63, 329.63],
        [174.61, 220.00, 261.63],
        [196.00, 246.94, 293.66],
    ]

    for b in range(total_beats):
        t0 = b * beat
        chord = chords[(b // 4) % len(chords)]

        # Light folk percussion
        _add(mix, t0, thump(0.18), 0.45)
        _add(mix, t0 + 0.5 * beat, ring(0.14), 0.32)
        _add(mix, t0 + 0.75 * beat, dhol_tilli(0.07), 0.25)

        # Arpeggiated bright plucks
        _add(mix, t0, ks_pluck(chord[0] * 2, beat * 0.8), 0.34)
        _add(mix, t0 + 0.33 * beat, ks_pluck(chord[1] * 2, beat * 0.6), 0.28)
        _add(mix, t0 + 0.66 * beat, ks_pluck(chord[2] * 2, beat * 0.6), 0.28)

    return _fade_out(master(mix), 2.0)


def track_vidaai_strings(seconds=72, bpm=76):
    """Cinematic, emotional acoustic & string piece for Vidaai, portraits, and white weddings."""
    n = int(seconds * SR)
    mix = np.zeros(n, dtype=np.float32)
    beat = 60.0 / bpm
    total_beats = int(seconds / beat)

    progression = [
        [261.63, 329.63, 392.00, 493.88],
        [220.00, 261.63, 329.63, 392.00],
        [174.61, 220.00, 261.63, 349.23],
        [196.00, 246.94, 293.66, 392.00],
    ]

    for b in range(total_beats):
        t0 = b * beat
        chord = progression[(b // 4) % len(progression)]

        # Gentle heartbeat pulse from beat 0
        _add(mix, t0, thump(0.28), 0.30)

        # Warm harp/guitar arpeggio
        note = chord[b % 4]
        _add(mix, t0, ks_pluck(note, beat * 1.8), 0.38)
        _add(mix, t0 + 0.5 * beat, ks_pluck(note * 1.5, beat * 1.2), 0.22)

    return _fade_out(master(mix), 2.0)


def track_afterparty_bass(seconds=60, bpm=126):
    """Modern Cocktail & Reception afterparty — crisp house kick + synth bassline + rhythmic claps."""
    n = int(seconds * SR)
    mix = np.zeros(n, dtype=np.float32)
    beat = 60.0 / bpm
    total_beats = int(seconds / beat)

    bass_notes = [110.0, 110.0, 130.81, 146.83]

    for b in range(total_beats):
        t0 = b * beat
        # Club kick on every beat
        _add(mix, t0, kick(0.16), 0.65)
        # Clap/snare on beats 2 and 4
        if b % 2 == 1:
            _add(mix, t0, noise_hit(0.09), 0.36)
        # Off-beat synth bass + pluck
        bf = bass_notes[(b // 4) % len(bass_notes)]
        _add(mix, t0 + 0.5 * beat, saw(bf, beat * 0.45) * 0.35, 1.0)
        _add(mix, t0 + 0.25 * beat, ks_pluck(bf * 4, beat * 0.4), 0.26)

    return _fade_out(master(mix), 2.0)