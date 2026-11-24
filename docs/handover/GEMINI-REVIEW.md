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

5. **Layout and theme are now one choice (Deepak chose A, 24 Nov).**
   - A layout may carry `"theme": "<theme id>"`.
   - Picking that layout also sets the app theme (all pages, light + dark) to it.
   - The "Look & theme" screen shows **layouts first**; each card shows the layout in its own colours.
   - Under them is one **"Change colours"** button, which opens the theme list with the live preview. It is for couples who want the layout with another palette.
   - If the couple changed colours and later picks another layout, ask once: "Use this layout's colours?" (Yes / Keep mine).
   - Layouts without a `theme` keep today's behaviour.
   - Backend: the layout's `theme` is saved the same way the theme is saved today. Check `saveLook_` in `Code.gs` (Claude reviews this part).

## F2 — Free editor + Template editor: ✅ approved, with these changes (Gemini's file: `gemini/F2-F4-design.md`)
1. **Laptop starts at 700 px**, not 900 (again).
2. **The phone top bar must fit one row at 390 px.** Gemini's bar (back, undo, redo, − 100 % + Fit, Play, Save, Apply) is about 440 px, too wide. Instead:
   - Zoom becomes **one "100 %" chip**; tapping it shows − / + / Fit in a small pop.
   - Play becomes an icon button.
   - Order: ‹ ↶ ↷ · 100 % · ▶ · Save · Apply.
   - **Save and Apply both stay.**
3. Closed drawer = the tab row (Add, Style, Layers, Page) + the open/close chevron, 64 px. Open = at most 40 %.
4. Template editor: the photo slot names come from the wedding's own events. Don't hard-code Haldi/Sangeet.

## F3 — Card editor: ✅ approved, with one change
1. **"+ Add card" stays one tap away.** Put it in the bottom tool row next to "Page settings" (closed drawer), not inside Page settings.
2. Everything else as Gemini says:
   - top bar ‹ ↶ ↷ Preview Publish;
   - logo side, light/dark, colours and "Start again from a layout" inside Page settings;
   - with a card selected, the drawer is at most 34 % and the grid scrolls so the card stays in view.

## F4 — Reel Edits: ✅ approved, with these changes
1. **Phone: don't make the reel smaller than today.**
   - Gemini's 270 px reel is smaller than today's (~416 px).
   - With no drawer open, the reel keeps today's size.
   - With a drawer open, the reel shrinks to fit above it, but never below 60 % of today's size.
   - Every drawer is at most 40 %.
2. **Laptop: the timeline goes full width under the reel**, not inside the 360 px right panel. The timeline needs width to drag clips on the beat.
   - Layout: reel stage on the left (at least 3× bigger than today), tool controls in the right panel, timeline under both (~140 px).
3. **Add clip:**
   - Clips already in the reel get a number badge (#1, #2…) and a highlight.
   - Tapping works as today (choose / un-choose). No "jump to clip" for now.
4. Gemini's two suggestions (a length badge, an "In reel" filter) are parked. Don't build them.

## T1 — Events from photo time: ✅ approved, with these changes (Gemini's file: `gemini/T1-T2-design.md`)
1. It opens **inside the Control Panel sheet** (a new section, "Events from photo time"), not as a new modal. Laptop starts at 700 px, with 2 columns of groups.
2. Photo counts per group ("18 photos") are fine here, because counts are allowed in the Control Panel.
3. The quick chips are only suggestions to fill the box. The event list never depends on these names.
4. Gemini's idea to guess the name from the time of day is **parked** (a wrong guess is worse than none).

## T2 — At this time on the wedding day: ✅ the **small pop** (Gemini's option B), with these changes
1. **Phone:** the pop sits just above the bottom bar, as Gemini designed it. It also **hides itself after 10 seconds** if nobody touches it, so it never stays over the photos.
2. Tapping the pop opens those 1–3 photos in the viewer. ✕ closes it for this visit.
3. **Follow the guest rules:** if this wedding shows photos only after Find me, a guest who hasn't found themselves sees no pop.
4. **Accepted from Gemini's suggestions:** a small time pill on each photo (e.g. "6:42 pm"), so the guest understands why these photos appear.
5. **English by default.** Hindi only when the wedding's language is set to Hindi. For the action, use «पल देखें» ("see the moment").
6. The Control Panel switch "At this time on the wedding day" is on by default.

## T2 code (Gemini, `gemini/T2-code.md`): ✅ approved, with these corrections
Claude checked every app function it uses. They all exist (`pgAfter`, `pgRenderHub`, `switchView`, `pgOpenEvent`, `pgImgFallback`, `GALLERY.gated/found/pool/personal`, the CSS variables), except as noted below.

ChatGPT applies Gemini's FIND/REPLACE blocks, plus these corrections, in one PR: `step-81-t2-same-time`.
1. **The switch must save.** The backend only keeps known switches. In `apps-script/Code.gs`, add `'sameTime'` to `FEATURE_KEYS` (line ~2150). → **Backend changed — paste Code.gs and deploy.**
2. **Put the switch in the normal list**, not a special case in `17-control.js`.
   - Add `['sameTime', 'At this time on the wedding day', 'Show guests 1–3 photos from around this time of day']` to the `KEYS` list in `app/gallery/16-features.js`.
   - Drop Gemini's `cpFeats` change to `17-control.js`.
   - In `48-same-time.js`, use `window.pgFeatureOn ? pgFeatureOn('sameTime') : true` for `featureEnabled()`.
3. **Guest rule: use the app's real flags only.** In `guestAllowed()`, the gate is `if (GALLERY.gated && !GALLERY.found) return false;`. Remove the guesses (`GALLERY.guestPhotos === 'findme'`, `PGRules.found`, `pgStore('found')`).
4. **Don't add a fake collection.**
   - In `openMatchedPhotos()`, delete the lines that add "At this time" to `GALLERY.personal`; it would show up as a new collection in the gallery.
   - Use `pgOpenEvent(name, subset)` instead, where `name` is the event of the first photo (or "Right now"). `pgOpenEvent(name, photos)` already exists in `18-grids.js`.
5. **Close button 44 px:** `.pgst-x{width:44px;height:44px;margin:-8px -8px -8px 0}`.
6. **Laptop at 700 px:** change `@media (min-width:900px)` to `700px`.
7. **Also hide the pop in Reel Edits and Post Edits:** add `body.rl-on .pgst-pop, body.ps-on .pgst-pop` to the hide rule.
8. **Replace Gemini's test.** Its own fake server doesn't answer like our backend.
   - Write `tests/e2e_same_time.js` (port 8902) with the normal set-up from `tests/e2e_canvas_editor.js` (gas_mock + made-up photos).
   - Photos have no `t` until T1, so the test sets `t` on a few photos with `page.evaluate` and then calls `PGSameTime.resetVisit(); PGSameTime.check()`.
   - Checks:
     - pop shows on a match (±20 min);
     - no pop without a match;
     - no pop when the switch is off;
     - no pop for a gated guest who hasn't found themselves;
     - it hides itself after 10 s (fake the timer);
     - the close button is ≥ 44 px;
     - `page errors: []`.
   - Add a line to `tests/step79.test.js` (or a new `tests/step81.test.js`) that the backend keeps `sameTime: 'off'`.

## Order for ChatGPT
F0 → F1 → F2 → F3 → F4 → F5 → F6, one PR each. F5 is small and data only, so it can go any time after F0.
