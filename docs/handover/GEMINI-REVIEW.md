# Claude's review of Gemini's design jobs (24 Nov 2026)

Gemini's files:
- `gemini/F1-F6-design.md`: the design for F1 (Post Edits) and F6 (Control Panel).
- `gemini/canvas-living.json` and `gemini/canvas-editorial.json`: the layouts for F5.

**Where Gemini and this review disagree, this review wins.**

## F5 — Living Story / Editorial Album layouts: ✅ approved, with one fix (already made)
- Both docs pass the backend check (`cvStyle_`). They render cleanly on phone and laptop: hero, photo strip, events, actions, blessings, credit.
- **Fixed:** Gemini used `t: "card"` for plain white boxes. In our format, `card` means a real app Hub card, so it would have broken. Both are now `t: "shape"` in the JSON files here.
- **ChatGPT's job (card F5, step 92):**
  - Add both docs to `app/themes/layouts.json` with `group: "progress"` (staff only), ids `canvas-living` and `canvas-editorial`, names "Living Story (editor)" / "Editorial Album (editor)". Copy the shape of `canvas-quiet`.
  - Never start an id with `cv-`. Don't touch the old Living Story / Editorial Album.
- **Done when:**
  - Staff see both under "In progress".
  - Design opens them in the free editor.
  - `node tools/audit/overlay-audit.js --layouts --only=canvas-living` (and `canvas-editorial`) shows no errors.
  - `npm test` passes. Some tests count layouts per group: update only those counts, and say so in the PR.
- **Then Deepak looks.** If he likes them, a later card makes them the layouts couples see when they pick Living Story / Editorial.

## F1 — Post Edits: ✅ approved, with these changes
1. **Laptop starts at 700 px**, not 900 (our rule in AGENTS.md).
2. **Album on phone:** fitting the whole spread into 390 px makes each photo tiny. Instead:
   - show **one slide fully**, with dots (1/4);
   - swipe between slides;
   - add a small "Whole album" button that shows the full spread for a moment.
3. Keep our class prefixes (`pe-` in post.js). Gemini's `pg-editor-shell` code is a reference for sizes only, not names to copy.
4. The help hint uses `localStorage`: wrap it in try/catch.
5. Keep every tool and option that exists today. Gemini's lists are examples; if today's app has more options, keep them.
6. **Accepted:** Gemini's suggestion to use `visualViewport` so the design stays above the phone keyboard in Text.
7. Order stays hidden for single-photo posts (that's card F0).

## F6 — Control Panel Theme: ✅ approved, with these changes
1. **"Merge Look into Theme":** today Look also leads to Hub layout and other look settings. Nothing may become unreachable. Make one "Look & theme" screen; tapping Theme opens the live preview.
2. **Live preview:** use the Control Panel's existing page preview (iframe, phone/laptop, light/dark). Don't build a second preview system.
3. Cancel must put the old theme back exactly; only Apply saves.
4. Layout cards with the couple's cover photo: use the cover from `GALLERY` (`pgImg`), and fall back to today's card when there is no cover.

## Order for ChatGPT
F0 → F1 → F2 → F3 → F4 → F5 → F6, one PR each. F5 is small and data only, so it can go any time after F0.
