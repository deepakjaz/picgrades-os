# For Gemini — design the ONE universal editor (design only, no code)

## Why
Today the app has several editors: the card editor, the free editor ("Design your own Hub") and the template editor (plus Reel Edits and Post Edits, which stay separate because they are photo and video tools). Deepak wants **one editor** that works for every layout, every page and every theme. It should be as easy as the editors people already know (Wix, Canva), with small clear icons and a short label under each.

**The bigger picture:** PicGrades is an **OS**, not a website builder.
- Weddings come first. Later, artists, freelancers and studios use it under their own domain.
- **Hub** = their own feed. **Root Moment** = their own posts. They have their own crowd, not bound to social media's interface.
- So use **general words** where possible ("Title", "Page", "Collection"), not wedding-only words.

## Decisions so far
- **Everyone sees every tool for now** (couples, photographers, PicGrades), so we learn what people really use. (Deepak, 24 Nov)
- **One editor with two modes.** Claude's default; Deepak may change it.
  - **Simple:** parts snap to rows and columns.
  - **Free:** drag anywhere.
  - A switch in the top bar changes the mode. Both edit the same layout.
- It must follow the **editor layout rule** (in your earlier brief):
  - the design is never covered;
  - phone: the design on top, tools in a bottom drawer of at most 40 %;
  - laptop: the design on the left, the panel on the right;
  - one-row top bar.
- **Layout and theme are one choice** (Deepak chose A): picking a layout gives the whole app its look, and "Change colours" picks another.

## What to design (phone 390 and laptop 1200, exact words, icons described or as simple SVG)
1. **Left rail** (on laptop a thin icon column; on phone the first row of the bottom drawer). Each icon has a label under it:
   - **Add** (parts: photo, title, date, text, events, photo strip, buttons such as Find me / Reel / Post / Moment, blessings, credit, box / line / circle)
   - **Layers** (list, an eye to hide/show, drag to reorder)
   - **Pages** (Hub, Events, Gallery, Notes, Moments, each editable, plus a small **site map** view of them)
   - **Collections** (the wedding's photo groups: highlights, events, Root Moment… and "connect" a part to one)
   - **Theme** (the layout's colours and fonts, "Change colours", light / dark)
   - **Media** (the couple's photos plus our design pictures for the venues)
2. **Right panel / drawer for the selected part, with 3 tabs:**
   - **Design 🖌:** size (W/H), padding, background colour and picture, corners, border, shadow, see-through; for words: font, size, align, weight, spacing.
   - **Motion ⚡:**
     - **Animation type:** In · Loop · Scroll.
     - A **grid of picture tiles**, each with its name under it and a tiny preview that plays on tap: None, Fade, Move (with a direction), Grow, Blur, Reveal, Shape, Unfold, Shine; loops Zoom, Float; Scroll = parallax depth.
     - **New tiles, as Claude's suggestion:** Shrink, Shutters (like window blinds) and Flip (like an invitation card turning).
     - At the bottom, **Adjust:** speed and wait.
   - **Connect 🔗:** "This photo shows → Highlights / Event / Root Moment / a chosen photo", "This button opens → Find me / Reel / Post / …", "This text shows → Couple names / Date / my own words".
3. **A section selected:** "Section layout" with rows × columns (like 2×4), add/remove a row or column, padding, background, and "Stays on screen while scrolling".
4. **Top bar (one row):** ‹ back · Undo · Redo · mode switch (Simple / Free) · Phone / Laptop · zoom chip (100 %) · ▶ Play · Save · Apply.
5. **First-time help:** 3 short tips that show once (e.g. "Tap a part to change it"), then never again.

## Rules
- **Pictures first:** the design you edit is always the biggest thing on screen.
- **Plain English** labels of 1–2 words. Icons must be understandable without the label, and the label confirms them.
- **Nothing is lost:** every option the free editor has today must still be somewhere. The rest of the app stays as it is.
- **No new libraries.**

## Answer format
- One section per point (1–5): phone layout, laptop layout, exact words, icon descriptions (or simple SVG), and drawer heights.
- Then **one** reference sketch of HTML/CSS for the shell (rail + panel + top bar).
- Then at most 3 suggestions, clearly marked.
