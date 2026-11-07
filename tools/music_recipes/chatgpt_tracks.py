import numpy as np
SR = 44100

def track_haldi_sunrise(seconds=68, bpm=112):
    """Original festive Haldi groove: warm plucks, low drum pulse and bright accents."""
    n=int(SR*seconds); t=np.arange(n,dtype=np.float64)/SR; beat=60.0/bpm
    phase=np.mod(t,beat); rng=np.random.default_rng(1207)
    mix=.72*np.exp(-28*phase)*np.sin(2*np.pi*(78+38*np.exp(-20*phase))*t)
    off=np.mod(t+beat*.5,beat)
    mix+=.22*np.exp(-28*off)*np.sin(2*np.pi*(78+38*np.exp(-20*off))*t)
    scale=np.array([392.,440.,523.25,587.33,659.25,783.99])
    step=np.floor(t/(beat*.5)).astype(int); f=scale[(step*3+step//8)%len(scale)]
    local=np.mod(t,beat*.5); mix+=.20*np.sin(2*np.pi*f*local)*np.exp(-8*local)
    mix+=.055*np.sin(2*np.pi*196*t)+.035*np.sin(2*np.pi*293.66*t)
    for k in range(1,int(seconds/(beat*.5))):
        if k%4 in (1,3):
            start=int(k*beat*.5*SR); length=min(int(.07*SR),n-start)
            if length>0:
                noise=rng.standard_normal(length)*np.exp(-np.linspace(0,8,length))
                mix[start:start+length]+=.035*noise
    fade=int(1.8*SR); mix[-fade:]*=np.linspace(1,0,fade)
    return (.88*mix/(np.max(np.abs(mix))+1e-9)).astype(np.float32)

def track_evening_glow(seconds=72, bpm=96):
    """Original soft cinematic groove for Pheras, portraits and highlights."""
    n=int(SR*seconds); t=np.arange(n,dtype=np.float64)/SR; beat=60.0/bpm
    phase=np.mod(t,beat)
    mix=.34*np.exp(-28*phase)*np.sin(2*np.pi*(75+28*np.exp(-18*phase))*t)
    mix+=.045*np.sin(2*np.pi*110*t)+.035*np.sin(2*np.pi*164.81*t)
    notes=np.array([261.63,329.63,392.,440.,523.25])
    step=np.floor(t/(beat*.5)).astype(int); f=notes[(step//2+step)%len(notes)]
    local=np.mod(t,beat*.5)
    mix+=.16*np.sin(2*np.pi*f*local)*np.exp(-5.5*local)
    mix+=.035*np.sin(2*np.pi*f*2*local)*np.exp(-9*local)
    bar=np.mod(t,beat*4); mix+=.018*np.sin(2*np.pi*880*t)*np.exp(-2.5*bar)
    fade=int(1.8*SR); mix[-fade:]*=np.linspace(1,0,fade)
    return (.86*mix/(np.max(np.abs(mix))+1e-9)).astype(np.float32)
