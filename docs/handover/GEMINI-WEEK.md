# For Gemini — layout week (24–28 Nov 2026)

You did Living Story and Editorial Album well. They are now in the app, in the free editor. This week you rebuild the remaining layouts in the same format, one by one, so couples and Deepak can edit every part by drag and drop.

## How each layout goes
1. You give **one JSON doc** (format below) + 3 lines on the idea.
2. Deepak sends it to Claude. Claude draws it in the real app on phone and laptop, fixes format mistakes, and sends Deepak the screenshots.
3. Deepak approves the look (or asks you for changes).
4. ChatGPT adds it to the app as staff-only. Deepak decides when couples see it.

**At most 3 layouts per answer**, so each one gets care.

## The list, in order

### Batch A — templates that exist but are hidden (Deepak didn't like how their parts were placed)
Keep each one's idea, colours and feel (see `PicGrades-audit-screens.pdf`, pages "Layout progress tpl-…", and their code in pack 2, file `app/gallery/32-story-studio.js`), but place the parts properly for phone **and** laptop:
1. **Horizon** (`x-horizon`): for couples who don't want to show photos. Names, date, events as words, actions. **Few or no photos.** Deepak wants to keep this one.
2. Darbar Invitation (`tpl-c1`)
3. Tide Journey (`tpl-c2`)
4. Cloud Pages (`tpl-c3`)
5. Haldi Splash (`tpl-c4`): keep the colour idea, but never write the word "Haldi" in it (any event can use it).
6. Cinema Chapters (`tpl-c5`)
7. Heritage Courtyard (`tpl-g1`)
8. Misty Tea Estate (`tpl-g2`)
9. Alabaster Gallery (`tpl-g3`)

### Batch B — pick the best 5 of the 18 other hidden layouts
`x-royal-journey, x-palace-window, bento-concierge, archive-monograph, atelier-scrapbook, cinema-panorama, magazine-cover-c, photo-collage-wall, cinematic-one-photo, mosaic-salon, grand-palace-frieze, editorial-triptych, bento-atelier, nocturne-cinema, mosaic-salon-b, editorial-columns, cinema-gallery, modern-pavilion`
- First, only **name your 5 and say why in one line each.** Wait.
- Deepak confirms, then you rebuild them. The rest stay hidden.

### Batch C — new ideas (only after A and B)
- **Wedding timeline layout:** the events one after another (vertical on phone, horizontal feel on laptop), using the `events` part, never fixed event names.
- Your own idea: 1 new layout that looks like nothing in the app yet.
- (The venue layouts stay paused until Deepak finds free elements.)

## The format (doc v1) — copy the shape of your Living Story exactly
```
{ "v":1, "name":"…", "colors":{"bg","ink","acc","acc2","card"}, "fonts":{"head","body"},
  "sections":[{ "id", "h":{"p":phone height,"l":laptop height}, "stay":0, "bg":{"c","src","dim","fx","fy","z"},
    "els":[{ "id","t", "p":{"x","y","w","h","r","z","hide"}, "l":{…laptop spot}, "s":{style}, "sl":{laptop style},
             "m":"motion", "mo":{"d","t","p"}, "text", "src":{"k","n","i","id"}, "act", "v", "per" }] }] }
```
- **Widths:** phone design is 390 wide, laptop design is 1200 wide. Give every part both `p` (phone) and `l` (laptop).
- **Part types (`t`):**
  - `photo`
  - `names`
  - `date`
  - `text`
  - `events` (`v`: `row` / `circles` / `list`, `per`: how many show at once, `{"p":1.6,"l":3.2}`)
  - `strip` (a row of photos)
  - `action` (`act`: `findme` / `reel` / `post` / `memory` / `moments` / `notes`)
  - `blessings`
  - `credit`
  - `shape` (boxes, lines, circles; `s.shape`: `arch` / `circle`)
- ⚠️ **Never use `t:"card"`** for a box. `card` means a real app card. For a white box, use `shape` with `s.bg`.
- **Photos come only from `src`:** `{"k":"cover","n":0}`, `{"k":"hl","n":2}` (highlights), `{"k":"ev","i":0,"n":1}` (event 0, photo 1), `{"k":"auto"}`. Never file names or links.
- **Style keys (`s`, `sl`), and only these:**
  - text: `font`, `size`, `weight`, `ls`, `lh`, `italic`, `upper`, `align` (`left` / `center` / `right`)
  - boxes: `radius`, `border`, `bcolor`, `shadow`, `opacity`, `pad`, `color`, `bg`
  - photo framing: `fx`, `fy`, `zm`
- **Fonts, and only these:** Cormorant Garamond, Pinyon Script, Marcellus, Jost, Instrument Serif, Parisienne, Bodoni Moda, Playfair Display, Great Vibes, Montserrat.
- **Motion (`m`):**
  - one-time: `fade rise drop left right grow blur wipe iris unfold shine`
  - repeating: `zoom float`
  - `mo`: `d` = wait (ms), `t` = speed (ms), `p` = scroll depth
- **Every layout must have a `findme` action.**

## Design rules (Deepak's)
- **The couple's photos are the hero.** Decoration supports, never competes.
- **Motion serves a purpose:**
  - each motion must fit what the part does, and a part may have no motion;
  - shine plays once;
  - no scroll-jacking;
  - no "opening doors" reveal.
- **Never write event names** (Haldi, Sangeet…) into a layout. A wedding may have 1 event or 20; use the `events` part.
- **Content standard:** events show 15–30 photos each; the whole-wedding highlight is at least 50.
- **Text that fits:** text must never overflow or be cut, including long couple names (try "Anika & Rohan" and "Shreyanshi & Venkataraman").
- **Wedding-like look:** no typewriter fonts. Sentence case for words on screen. Short, plain English.
- **Laptop gets a real laptop layout:** use the width (side-by-side), not a stretched phone.

## Answer format
For each layout:
1. The name.
2. 3 lines on the idea.
3. **One JSON block with nothing else in it.**

Then up to 3 suggestions, clearly marked as suggestions.
