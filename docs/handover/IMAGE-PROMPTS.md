# PicGrades — image & video prompt pack for the venue templates

For **Gemini, ChatGPT and Canva AI**. These pictures are the **setting** (stone, water, light, drapes, lanterns). The **couple's own photos stay the hero**, so these never show people.

The 10 venue templates (Temple, Lake Palace, Garba, Desert, Kerala, Rooftop, Vineyard, Fort, Ballroom, Ghats) were paused until we had pictures. With these, they come back.

## Rules for every picture (so nothing is wasted)
1. **No people, no faces, no hands, no text, no logos, no watermarks.** People and text are what usually spoil a generation.
2. **Mood over detail:** describe the place, the light and the feeling, not exact objects. Generators do mood well and exact objects badly.
3. **Quiet space:** keep the **centre and lower third calm**, because names and a couple's photo go there.
4. **Real photo look:** photorealistic, soft natural light, fine-art wedding photography, gentle depth of field.
5. **Colours:** use the palette given for each venue.
6. **Never upload client photos** (for example Oshin & Vedant) to any of these tools.
7. **Test before batching.** Make the first venue's background in **all three tools once**, compare, and then use the best tool for each kind of asset. Make at most **2 tries per prompt**. If both miss, change **one line** of the prompt and don't just press again.

## Fill-in prompts (copy, then fill the [ ])

**A. Background plate** (make 2: phone 9:16 and laptop 16:9)
```
Photorealistic wide photograph of [SCENE], [LIGHT]. Mood: [MOOD]. An Indian wedding setting, decorated and empty —
no people, no text, no logos. Keep the centre and lower third calm and uncluttered. Soft natural light, gentle depth
of field, fine-art wedding photography, colour palette [PALETTE]. Full-frame camera, 35mm, high detail.
Aspect ratio [9:16 / 16:9].
```

**B. Framing element** (one object: an arch, a drape, a lantern…)
```
A single [OBJECT], photorealistic, straight front view, centred with a small margin, [MATERIAL AND COLOURS].
Isolated on a transparent background (PNG). No floor, no shadow, no people, no text. Even soft light.
```
- **Gemini or Canva:** replace the transparent background with "on a plain pure white background", then use Canva's **Background remover**.
- **ChatGPT:** it can make transparent PNGs directly.

**C. Texture** (a soft pattern behind cards)
```
Seamless tileable texture of [MATERIAL], top-down, flat even light, no objects, no shadows, subtle and calm,
colours [PALETTE], square 1:1, high detail.
```

**D. Ambient video loop** (Gemini / Canva video; keep it short)
```
Cinematic ambient shot of [SCENE DETAIL], static camera (or a very slow push-in), no people, no text.
Only gentle natural movement: [WHAT MOVES]. [LIGHT], colours [PALETTE]. 6 seconds, the last frame matches the
first so it loops seamlessly, 1080p, aspect ratio [9:16 / 16:9].
```

## The 10 venues

| # | Venue (template) | Scene (A) | Light · mood | Palette | Element (B) | Texture (C) | Video (D): what moves |
|---|---|---|---|---|---|---|---|
| 1 | Temple Mandir · Silk Thread | carved sandstone temple courtyard with a flower mandap, marigold garlands, brass diyas | warm late morning · sacred, serene | ivory, saffron, deep maroon, antique gold | ✅ already have: carved sandstone arch | aged carved sandstone | diya flames flicker, incense smoke drifts |
| 2 | Lake Palace · Rising Water | white marble palace on a still lake | golden hour · romantic, regal | ivory marble, soft peach, lake blue-grey, gold | ✅ already have: carved marble arch | white marble, faint veins | soft ripples reflecting palace lights |
| 3 | Garba Night · Turning Circle | open festive ground with colourful lanterns, string lights, a mirror-work canopy | night · joyful, festive | magenta, marigold, emerald, mirror silver | a hanging mirror-work lantern | bandhani fabric with mirror work | lanterns sway, light bokeh twinkles |
| 4 | Desert Camp · Sand Reveal | dunes with luxury tents and lanterns | dusk · vast, warm, quiet | sand gold, terracotta, indigo dusk | a brass Moroccan-style lantern | rippled desert sand | sand blows softly over a dune ridge, lantern glow |
| 5 | Kerala Backwaters · Houseboat | palm-lined backwater with a wooden houseboat | early morning mist · calm, green | jade, palm green, mist white, kasavu gold | a brass uruli bowl with floating flowers | cream kasavu cotton with a gold border | still water, drifting petals, moving mist |
| 6 | City Rooftop · Elevator | rooftop terrace with a city skyline and fairy lights | blue hour · modern, chic | midnight blue, champagne, warm amber lights | an arch of white roses on a slim metal frame | dark glossy terrazzo | city lights twinkle, clouds pass slowly |
| 7 | Vineyard Estate · Hanging Tags | rows of vines and a long rustic table under trees | late afternoon sun · relaxed, romantic | olive green, wine red, linen, soft gold | a garland of vine leaves with small kraft tags | natural linen | vine leaves move in a breeze, soft sun flare |
| 8 | Royal Fort · Royal Scroll | sandstone fort ramparts lit by oil lamps | blue hour · grand, dramatic | deep blue, amber lamplight, sandstone | an empty old parchment scroll with gold edges | weathered fort stone | lamps flicker along the wall, clouds drift |
| 9 | Grand Ballroom · Silk Drapes | 5-star ballroom with crystal chandeliers, white florals, draped ceiling | evening, warm glow · elegant, luxurious | champagne, ivory, crystal, soft gold | one tall champagne silk drape panel | champagne silk satin | chandelier crystals sparkle, drapes sway slowly |
| 10 | Riverside Ghats · Aarti Steps | stone ghat steps down to a river, floating diyas | evening aarti · spiritual, glowing | river slate, saffron, brass, ember | a single diya floating on a leaf | worn stone steps | diyas drift on dark water, flame reflections |

## The other templates (second round, same prompts)
| Template | Scene · mood | Element | Video |
|---|---|---|---|
| Darbar Invitation | haveli courtyard with a jharokha, velvet and brass · royal, warm | a carved wooden jharokha window | curtain sways in the window |
| Tide Journey | quiet beach shore at sunrise · open, fresh | sea-shell and driftwood arrangement | foam washes in and out |
| Cloud Pages | misty hill station, pine slopes · dreamy | white cloud wisps (on white, then remove the background) | mist rolls over the hills |
| Haldi Splash | marigold petals and turmeric powder in the air · bright, playful | a burst of yellow powder (on white) | petals fall in slow motion |
| Cinema Chapters | velvet theatre curtain, warm stage light · dramatic | an old film reel | soft film-grain flicker, curtain sways |
| Heritage Courtyard (Gemini) | sandstone courtyard with arches at dusk · calm, timeless | an arched doorway | lamp glow, a bird crosses the sky |
| Misty Tea Estate (Gemini) | tea garden terraces in morning mist · fresh, green | a tea leaf sprig | mist drifts over the rows |
| Alabaster Gallery (Gemini) | minimal white stone gallery, soft daylight · quiet luxury | a white stone plinth | light moves slowly across the wall |

## How many, and which tool does what
- **Per venue:**
  - 2 backgrounds (phone + laptop)
  - 1 element
  - 1 texture
  - 1 video
- **Total:** 40 images and 10 videos for the 10 venues. Temple and Lake Palace already have their arch, so 38 images.
- **Suggested split** (change it after the first test):
  - **Gemini:** photoreal backgrounds + videos.
  - **ChatGPT:** elements as transparent PNGs.
  - **Canva AI:** textures + extra videos + background removal.
- **Pace:** 2–3 venues a day stays inside the daily limits without rushing.

## Delivery
- **File names:** `v03-garba_bg-phone.jpg`, `v03-garba_bg-laptop.jpg`, `v03-garba_element.png`, `v03-garba_texture.jpg`, `v03-garba_loop.mp4`.
- **Sizes:** images at least 2048 px on the long side; videos 6–10 s MP4.
- **Where to send:** put them in one Drive folder (e.g. "PicGrades venue assets") and send Claude the files.
  - Claude makes them light for the web (images about 300 KB, videos about 3 MB) and adds them to the app.
  - They are our own design assets, not client photos, so they can live in the app.
