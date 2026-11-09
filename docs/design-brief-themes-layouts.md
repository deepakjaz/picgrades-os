# PicGrades — Design brief: themes and Hub layouts

**For:** ChatGPT and Gemini (each works alone, then we compare)
**From:** Deepak (PicGrades) — the build is done by Claude, who will plug your designs in
**What you deliver:** design data and mockups, **not app code**. Read the whole brief before starting.

---

## 1. What PicGrades is

A **premium wedding gallery app** (a web app that installs on the phone like a normal app). One app per wedding. The couple, their families and guests open it on their phones to:

- see every photo of every event (Haldi, Mehendi, Sangeet, Wedding, Reception…)
- find their own photos by face (**Find me**)
- make reels (**Reel Edits**) and Instagram posts / carousels (**Post Edits**)
- add their own photos to the shared feed (**Root Moment**)
- leave hearts and notes on photos

The look must feel like **a luxury product on an iPhone**: calm, elegant, editorial, lots of space, real typography, photos first. Think of Apple's own apps with the iOS glass design (clear frosted panels over photos), high-end wedding magazines, and luxury hotel apps.

**Every function stays exactly the same.** You only change *how the screens look and how the blocks are arranged*.

---

## 2. What you are designing

### A. Five themes (each of you)
A theme is the "skin" of the whole app: colours, fonts, glass, corners, icons, motion.

### B. Five Hub layouts (each of you)
The **Hub** is the home page. A layout decides **which blocks** appear, **in what order**, at **what size**, and in **which style (variant)**. Together you and the other assistant give us **10 layouts**.

### C. One icon set (each of you)
The icons for the bottom bar and the Hub tiles.

---

## 3. The Hub building blocks (use only these)

The Hub is a grid **4 columns wide** on a 390 px wide phone (16 px side margins, 10 px gaps). Each block takes a size from this list:

| Size | Grid cells | Use for |
|---|---|---|
| `S` | 1 × 1 | small icon tile |
| `W` | 2 × 1 | wide tile |
| `M` | 2 × 2 | medium square |
| `L` | 4 × 2 | full-width card |
| `XL` | 4 × 3 | big hero |
| `XXL` | 4 × 4 | full-screen hero |

Blocks (with the variants you may use). **Required** blocks must appear in every layout; **optional** ones may be left out.

| Block id | What it shows / does | Allowed sizes | Variants | Required |
|---|---|---|---|---|
| `hero` | The couple's best photos, names and date | L, XL, XXL | `collage-3`, `collage-5`, `full-bleed`, `slideshow`, `polaroid-stack`, `split` | yes |
| `stats` | 4 numbers: Photos, Events, Hearts, Notes (each is tappable) | W, L | `row`, `tiles`, `inline` | yes |
| `findme` | Find me (face search) | S, W, M | `icon`, `photo`, `glass` | yes |
| `reel` | Reel Edits | S, W, M | `icon`, `photo`, `glass` | yes |
| `post` | Post Edits (posts, carousels, album strips) | S, W, M | `icon`, `photo`, `glass` | yes |
| `upload` | Add photos to Root Moment | S, W | `icon`, `glass` | yes |
| `events` | The event galleries (5–10 events) | L, XL | `carousel`, `grid-2`, `list`, `stack` | yes |
| `loved` | Most loved photos | L, XL | `strip`, `mosaic` | optional |
| `notes` | Recent notes from family and friends | L | `cards`, `bubbles` | optional |
| `studio` | The photographer (name, logo, contact) | W, L | `card`, `banner` | yes |
| `install` | "Add to Home Screen" | W, L | `pill`, `card` | optional |
| `review` | Thank-you note to the photographer (couple only) | W, L | `card` | optional |

The **bottom bar** is fixed and is not part of the layout: 5 buttons — Gallery, Moments, **Hub (centre, shows the couple's initials, e.g. "A&R")**, Notes, Studio. It curls into a small round button when scrolling. You may restyle it (glass, colours, icon style) but not change what it does.

---

## 4. Exact format to deliver

Reply with **one message** containing three parts. Do not add anything else.

### Part 1 — themes (JSON)

```json
{
  "themes": [
    {
      "id": "ivory-glass",
      "name": "Ivory Glass",
      "mood": "one short line",
      "fonts": { "display": "Cormorant Garamond", "body": "Inter" },
      "radius": { "tile": 22, "button": 14, "sheet": 28 },
      "glass": { "blur": 18, "opacity": 0.55, "border": 0.35 },
      "shadow": "none | soft | lifted",
      "motion": { "duration": 240, "easing": "cubic-bezier(.2,.8,.2,1)" },
      "light": { "bg": "#F7F3EE", "surface": "#FFFFFF", "glass": "#FFFFFF", "ink": "#1E1A17", "ink2": "#6B625A", "line": "#E7DFD6", "accent": "#B8945A", "accent2": "#7A5C4A", "onAccent": "#FFFFFF" },
      "dark":  { "bg": "#0F0D0C", "surface": "#1A1715", "glass": "#2A2622", "ink": "#F4EFE9", "ink2": "#A69C92", "line": "#2E2925", "accent": "#D6B57A", "accent2": "#C49A7A", "onAccent": "#111111" },
      "icons": "line | duotone | filled-soft"
    }
  ]
}
```

Rules:
- Fonts must be on **Google Fonts**. Max **2 families** per theme.
- Every theme needs **both** light and dark, and text colours must pass **WCAG AA** contrast (4.5 : 1 for body text, 3 : 1 for big titles) on `bg`, `surface` and `glass`.
- `glass.blur` between 0 and 24.

### Part 2 — layouts (JSON)

```json
{
  "layouts": [
    {
      "id": "magazine-cover",
      "name": "Magazine Cover",
      "idea": "one line: why this layout feels different",
      "theme": "ivory-glass",
      "blocks": [
        { "block": "hero", "size": "XXL", "variant": "full-bleed" },
        { "block": "stats", "size": "L", "variant": "inline" },
        { "block": "findme", "size": "M", "variant": "photo" },
        { "block": "reel", "size": "S", "variant": "glass" },
        { "block": "post", "size": "S", "variant": "glass" },
        { "block": "upload", "size": "W", "variant": "glass" },
        { "block": "events", "size": "XL", "variant": "stack" },
        { "block": "studio", "size": "L", "variant": "banner" }
      ]
    }
  ]
}
```

Rules:
- Blocks fill the 4-column grid **row by row, left to right**. Make sure every row is full — no holes (e.g. `M` + `S` + `S` works only if the two `S` tiles stack; say so with `"stack": true` on the second `S`).
- Use only the block ids, sizes and variants from section 3.
- All **required** blocks must be present.
- The five layouts must be **clearly different from each other** (not the same thing with new colours). Ideas to explore: magazine cover, photo collage wall, iOS widget home screen, editorial timeline, minimal "one big photo", polaroid scrapbook, cinematic dark, gallery museum.

### Part 3 — mockups and icons (files)

1. **One static HTML file per layout** (`layout-<id>.html`), 390 × 844, showing the Hub with its theme in light mode. Use grey boxes or `https://picsum.photos/seed/<word>/<w>/<h>` for photos. Plain HTML + CSS only, **no JavaScript, no frameworks, no external CSS libraries**. This is only so we can see your idea.
2. **One icon set** as a single JSON file: `{"icons": {"gallery": "<svg…>", "moments": "…", "notes": "…", "studio": "…", "findme": "…", "reel": "…", "post": "…", "upload": "…", "heart": "…", "note": "…", "share": "…", "download": "…", "close": "…", "back": "…", "settings": "…", "search": "…"}}`
   - `viewBox="0 0 24 24"`, stroke 1.75, round caps and joins, colour only `currentColor`, no text inside icons, no embedded images.

---

## 5. Quality bar (read twice)

**This is a premium product. The last round of templates and games was rejected for looking cheap. Do not repeat that.**

Do:
- Photos first. The couple's photos are the hero; the interface steps back.
- Generous white space, a clear type hierarchy (one display size, one title size, body, caption).
- Glass only where it sits over a photo or colour; keep **at most 3 blurred panels on screen** at once (iPhones slow down with more).
- Text on photos always gets a soft dark gradient behind it so it can be read.
- Tap targets at least **44 × 44 px**.
- Motion short and soft (≤ 300 ms), and nothing that moves forever.
- Indian wedding feel through **colour, type and photography**, not through clip-art.

Do not:
- No emoji, no clip-art, no cartoon icons, no stock "wedding" graphics (rings, doves, bells, shehnai drawings).
- No neon, no rainbow gradients, no glitter, no drop shadows on text, no Comic/handwriting fonts for body text.
- No more than 2 accent colours in a theme.
- No Instagram, Apple or other brand logos or names inside the designs.
- Do not invent new features, rename functions, or remove required blocks.
- Do not write app JavaScript or "integration code". Data and mockups only.

---

## 6. Check before you send

- [ ] 5 themes, each with light **and** dark, fonts from Google Fonts, contrast checked
- [ ] 5 layouts, each with all required blocks, rows full, only allowed sizes and variants
- [ ] The 5 layouts look clearly different from each other
- [ ] 5 HTML mockups, no JavaScript
- [ ] 1 icon set, 16 icons, `currentColor` only
- [ ] Nothing from the "Do not" list
