# PicGrades — Design brief v2: the whole app, phone + big screen

**For:** ChatGPT and Gemini (each works alone, then we compare)
**From:** Deepak (PicGrades). Claude builds it: he plugs your designs into the app.
**What you deliver:** design data and mockups, **not app code**. Read the whole brief before you start.

This is a **fresh design**, not a rework of your last pack. Your last pack only worked on phones: on a laptop or a TV every layout opened as a thin phone column in the middle of an empty screen. This time **every screen must be designed for phone AND big screens**.

---

## 1. What PicGrades is

A **premium wedding gallery app**. It is a web app that installs on the phone like a normal app. There is one app per wedding. The couple, their families and their guests open it to:

- see every photo of every event (Haldi, Mehendi, Sangeet, Wedding, Reception…)
- find their own photos by face (**Find me**)
- make reels (**Reel Edits**) and Instagram posts / carousels (**Post Edits**)
- add their own photos and videos to the shared live feed (**Root Moment**)
- leave hearts and notes on photos

**Phones are used most.** But photographers show and share the wedding on laptops, big monitors and TVs, and families love seeing photos big. On a big screen the app must look **made for that screen**, not like a stretched phone.

The look: **a luxury product**. Calm, elegant, editorial, photos first, real typography. Think of Apple's own apps (iOS glass: clear frosted panels over photos), high-end wedding magazines and luxury hotel apps.

**Every function stays exactly the same.** You only change how the screens look and how things are arranged.

---

## 2. The main idea: cards that use the space

1. **Slideshow cards in a mosaic.** Build the screens from **photo cards of different sizes**, fitted together like a mosaic (no gaps). Many cards are **slideshow cards**: the photos inside slowly change, one after another (a soft fade or slow zoom, 4–6 seconds per photo). Deepak's other app, the TKG Hub, works like this, and he will attach a screenshot or recording of it. Use it as the reference for the card feel.
2. **More space = more cards and bigger cards.** As the screen gets bigger, add cards, make the important ones bigger, and show more photos per row. Never just stretch the phone design and never leave big empty side margins.
3. **The shape of the screen matters, not only the width:**
   - **Wide screens** (laptop, TV, tablet turned sideways) get **wide cards**: banners, side-by-side panels, long photo rows.
   - **Tall screens** (tablet held upright, a monitor turned upright, a tall TV stand) get **tall cards**: portrait photo cards, stacked panels. They are big screens too: use the extra space, don't show a thin phone column.
4. **No number boxes.** Do **not** show counts like "15 photos · 3 events · 21 hearts · 2 notes" in boxes or rows. The old `stats` block is gone. A small caption on a card is fine (for example "Sangeet · 48 photos").
5. **Photos first.** The interface steps back; the couple's photos lead.

---

## 3. Screen sizes we will test

Design one **responsive** HTML file per screen. We will open each file at these sizes:

| Name | Size (width × height) | Grid |
|---|---|---|
| Phone | 390 × 844 | 4 columns |
| Phone sideways | 844 × 390 | 8 columns, short screen: keep it to one or two rows of cards plus scrolling |
| Tablet upright (tall) | 820 × 1180 | 8 columns, tall cards |
| Tablet sideways / laptop (wide) | 1180 × 820 and 1440 × 900 | 12 columns, wide cards |
| Big monitor / TV (wide) | 1920 × 1080 | 12 columns, content up to about 1680 px wide |
| Tall big screen | 1080 × 1920 | 8 columns, tall cards |

Grid cells are **square**: a card of 2 × 2 cells is a square, 4 × 2 is a wide card, 2 × 3 is a tall card. Gap 10–16 px. Side margins 16 px on phone, 24–48 px on big screens.

---

## 4. The screens (design ALL of them)

| # | Screen | What is on it (keep every item) |
|---|---|---|
| 1 | **Welcome** | First open: the couple's names, a cover photo, guest types their name to enter. |
| 2 | **Hub** (home) | Couple's names, date and city; cover / slideshow; Find me; Reel Edits; Post Edits; Add a moment; the events; most-loved photos; recent notes; the photographer (studio name, logo, contact); "Add to Home Screen". |
| 3 | **Root Moment** | Live feed of moments added by guests and the couple (photos and short videos), full-screen story style on phone. Tap to like and note. |
| 4 | **Events** (Gallery) | All event galleries (Haldi, Mehendi…) as cards. |
| 5 | **One event** | The photos of one event, as a mosaic / grid. Sorting chips. |
| 6 | **Photo viewer** | One photo big. Buttons: heart, note, share, download, info, next / previous. On big screens: the photo large with notes in a side panel. |
| 7 | **Find me** | Take or choose a selfie → "Your photos" results grid. |
| 8 | **Loved photos** | The most-hearted photos. |
| 9 | **Notes** | Blessings and notes from family and friends, each linked to a photo. |
| 10 | **Reel Edits and Post Edits** | Editors that look like the Instagram Edits app. **Do not redesign the tools on phone.** Show only how a big screen holds them: the phone-shaped preview in the middle, tools and templates in side panels. |
| 11 | **Control Panel** | For the couple, the photographer and PicGrades only (opened from the gear). Two tabs: **Look** (theme cards, Hub layout cards) and **Functions** (on/off switches; PicGrades also has a small "Plan" switch per row). On phone it is a bottom sheet; on big screens a side panel or centred window. |
| 12 | **Pop-ups** | Add a moment (upload), Add to Home Screen steps, write a note. |
| 13 | **Photographer's page** | The studio's own public page: logo, name, contact, its weddings as cards. |

**Navigation:**
- **Phone:** the bottom bar stays.
  - Guests get **4 buttons**: Gallery, Moments, **Hub (centre, shows the couple's initials, e.g. "A&R")**, Notes. When they scroll it curls into a **half circle** (Hub in the middle, the other three on the arc).
  - The couple, the photographer and PicGrades get a **5th button, the gear** (Control Panel).
  - You may restyle the bar but not change what it does.
- **Big screens:** propose the best navigation for a wide screen (for example a side rail or a top bar) with the same buttons.

---

## 5. Exact format to deliver

Send it in **several messages** if it is long (Part 1, Part 2…). Nothing else besides these parts.

### Part 1 — themes (JSON, 3 fresh themes)

Same format as before:

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
- Fonts must be on **Google Fonts**, maximum **2 families** per theme.
- Both light and dark are needed. Text must pass **WCAG AA** contrast (4.5 : 1 body, 3 : 1 big titles) on `bg`, `surface` and `glass`.
- `glass.blur` must be between 0 and 24.

### Part 2 — Hub layouts (JSON, 5 fresh layouts, each with phone + tall + wide)

Each block gives its size **per screen type** as `[columns, rows]` of square cells:
- `phone` is the 4-column grid.
- `tall` is the 8-column grid for upright big screens (tablet upright, tall big screen, phone sideways).
- `wide` is the 12-column grid for wide big screens.

```json
{
  "layouts": [
    {
      "id": "mosaic-salon",
      "name": "Mosaic Salon",
      "idea": "one line: why this layout feels different",
      "theme": "ivory-glass",
      "blocks": [
        { "block": "hero",   "variant": "slideshow",    "phone": [4, 4], "tall": [8, 6], "wide": [8, 5] },
        { "block": "findme", "variant": "photo",        "phone": [2, 2], "tall": [4, 3], "wide": [4, 3] },
        { "block": "reel",   "variant": "glass",        "phone": [2, 1], "tall": [4, 2], "wide": [2, 2] },
        { "block": "post",   "variant": "glass",        "phone": [2, 1], "tall": [4, 2], "wide": [2, 2] },
        { "block": "events", "variant": "mosaic-slideshow", "phone": [4, 4], "tall": [8, 6], "wide": [12, 4] },
        { "block": "notes",  "variant": "cards",        "phone": [4, 2], "tall": [8, 2], "wide": [6, 3], "hide": [] }
      ]
    }
  ]
}
```

Blocks you may use (`stats` no longer exists):

| Block id | What it shows / does | Required |
|---|---|---|
| `hero` | The couple's best photos, names, date, city | yes |
| `findme` | Find me (face search) | yes |
| `reel` | Reel Edits | yes |
| `post` | Post Edits | yes |
| `upload` | Add a moment (to Root Moment) | yes |
| `events` | The event galleries | yes |
| `loved` | Most-loved photos | optional |
| `notes` | Recent notes | optional |
| `studio` | The photographer | yes |
| `install` | Add to Home Screen (hidden on big screens is fine: `"hide": ["wide"]`) | optional |
| `review` | Thank-you note to the photographer (couple only) | optional |

Variants:
- Existing variants:
  - `hero`: `collage-3`, `collage-5`, `full-bleed`, `slideshow`, `polaroid-stack`, `split`
  - tiles (`findme`, `reel`, `post`, `upload`): `icon`, `photo`, `glass`
  - `events`: `carousel`, `grid-2`, `list`, `stack`
  - `loved`: `strip`, `mosaic`
  - `notes`: `cards`, `bubbles`
  - `studio`: `card`, `banner`
  - `install`, `review`: `pill`, `card`
- **New variants are welcome**, especially slideshow and mosaic ones (for example `mosaic-slideshow` for events, `slideshow` for a tile). For each new variant, write one line saying exactly what it shows and how it moves, and show it in a mockup.

Layout rules:
- Blocks fill the grid row by row, left to right. **Every row must be full, with no holes**, at every size. Check each of the three grids.
- Blocks keep the same order on every size. To hide a block on a size, use `"hide": ["phone"]` (or `"tall"`, `"wide"`).
- The 5 layouts must be **clearly different from each other**, not the same thing with new colours.

### Part 3 — mockups (files)

1. **Hub:** one responsive HTML file per layout (`hub-<layout-id>.html`). It must look right at every size in section 3.
2. **All other screens** (section 4, screens 1 and 3–13): one responsive HTML file per screen, in **your best theme** (`screen-<name>.html`).
3. Rules for the files:
   - Plain HTML + CSS only: **no JavaScript**, no frameworks, no external CSS libraries.
   - Slideshow cards: show the movement with **CSS animation** only.
   - Photos: use `https://picsum.photos/seed/<word>/<w>/<h>` or grey boxes.
4. For each screen, add **2–4 lines** in your message: what changes from phone to tall to wide.

---

## 6. Quality bar (read twice)

**This is a premium product. Earlier templates and games were rejected for looking cheap. Do not repeat that.**

Do:
- Photos first, generous space, a clear type hierarchy (one display size, one title size, body, caption).
- Use glass only where it sits over a photo or colour, with **at most 3 blurred panels on screen** at once.
- Text on photos always gets a soft dark gradient behind it.
- Tap targets at least **44 × 44 px**. On big screens, hover states for mouse users.
- Motion: short and soft (≤ 300 ms) for taps; slideshows slow and calm. Nothing flashing.
- Indian wedding feel through **colour, type and photography**, not clip-art.

Do not:
- No number boxes or stat rows (see section 2).
- No thin phone column on a big screen, and no big empty side margins.
- No emoji, clip-art, cartoon icons or stock wedding graphics (rings, doves, bells, shehnai drawings).
- No neon, rainbow gradients, glitter, text shadows, or handwriting fonts for body text.
- No more than 2 accent colours per theme.
- No Instagram, Apple or other brand logos or names inside the designs.
- Do not invent new features, rename functions or remove required blocks.
- Do not write app JavaScript or "integration code". Data and mockups only.

---

## 7. Check before you send

- [ ] 3 themes, light **and** dark, Google Fonts, contrast checked
- [ ] 5 Hub layouts, each with `phone`, `tall` and `wide` sizes, every row full on all three grids, all required blocks, no `stats`
- [ ] New variants (if any) described in one line each
- [ ] 5 Hub HTML files + one HTML file for each other screen, responsive, no JavaScript
- [ ] Checked at 390 × 844, 844 × 390, 820 × 1180, 1440 × 900, 1920 × 1080 and 1080 × 1920
- [ ] Wide screens use wide cards; tall screens use tall cards; no thin phone column anywhere
- [ ] Nothing from the "Do not" list
