# Week plan — 24 to 28 Nov 2026 (ChatGPT + Gemini build, Claude guides)

> **Updated 24 Nov — after the three audits:** do the fix cards **F0–F4 and F6** in `AUDIT-MERGED.md` first (F0 first: it is small and unblocks the framing sheet). F5 waits for Deepak's A/B/C choice.
> Then T1–T6 below, in the same order. Every screen change must follow the Editor layout rule in `AGENTS.md`.

Claude's weekly limit is low until about Sat 28 Nov. This week ChatGPT and Gemini do the building, using Claude's rules (`AGENTS.md`) and these task cards.
Claude only reviews PR links and answers short questions.

## The loop (same for every card)

```
1. Deepak gives the card to Gemini           → Gemini: design (screens, words, motion) + raw code idea
2. Deepak gives the card + Gemini's answer to ChatGPT
                                              → ChatGPT: builds it in this repo's format, runs the tests, opens a PR
3. GitHub runs all tests on the PR (automatic) + Gemini Code Assist reviews it (if installed)
4. Deepak sends Claude one line: "review PR #N"
                                              → Claude reads only that PR and replies: ✅ merge, or a short fix list
5. Fix list → back to ChatGPT → same PR updated → Deepak merges
```

- **Each AI gets a different job.** Gemini designs and suggests; ChatGPT builds; Claude checks. Never give the same card to both to build.
- **Comparing ideas:** when both give suggestions, paste both to Claude in one message. Claude picks, or mixes them, in one reply.
- **If Gemini writes raw code** (not in our format), ChatGPT converts it. If ChatGPT can't, it waits for Claude.
- **Backend (`Code.gs`) changes:** Claude always checks these before you deploy.

## Copy-paste prompts

### Start a card with ChatGPT (Codex, connected to the repo)
```
Repo: deepakjaz/picgrades-os. First read AGENTS.md and docs/handover/WEEK-PLAN.md, card <T-number>.
Then in max 8 lines tell me: what you will change, which files, which tests you will add, anything unclear.
Wait for my "go". After "go": build only this card, run npm test, open one PR in the AGENTS.md format.
Don't change anything outside the card. Ideas go under "Suggestions" (max 3).
<paste Gemini's design here if the card has one>
```

### Start a card with Gemini (design)
```
You are the designer for PicGrades (wedding gallery app). Read AGENTS.md (rules) and docs/handover/WEEK-PLAN.md card <T-number>
in repo deepakjaz/picgrades-os. Give me ONLY the "Gemini gives" part of the card:
screens for phone (390 wide) and laptop (1200 wide), every word on screen, motion (what moves and why), and raw HTML/CSS if it helps.
Plain English. No new libraries. Do not change the repo.
```

### When ChatGPT starts going into details / finding flaws again
```
Stop. Go back to card <T-number> and its "Done when" list. Report only what breaks a test, a rule in AGENTS.md,
or the Done-when list. Everything else goes under "Suggestions" (max 3). Now continue building.
```

### When an AI wants to change something big
```
Not in this card. Write it as one suggestion in the PR. Claude decides next week.
```

## Day plan

| Day | ChatGPT builds | Gemini designs | Claude |
|---|---|---|---|
| Tue 24 | **T1** events from photo time (backend + naming screen) | T1 naming screen, then **T2** design | — |
| Wed 25 | T1 fixes, then **T3** Reel/Post element timing + sticker bug | **T5** Living Story as a free-canvas layout (data only) | review T1 (backend) |
| Thu 26 | **T2** "at this time on the wedding day" | T5 second layout (Editorial Album) | review T3 |
| Fri 27 | **T4** faces into Reel Edits + **T6** gaps in converted layouts | compare ideas, list the next designs | review T2, T4, T5, T6 |
| Sat 28+ | — | — | Claude's limit resets: big pieces (A3, D1–D7) |

---

## T1 — Events from photo time (step 80) · ChatGPT builds, Gemini designs the screen

**Why:** Some couples have only an edited export with no event folders. Today all those photos land in one event, "Highlights". Every photo knows when it was taken, so we can group the photos by time and the couple just names each group (Haldi, Mehndi, Wedding…). No AI is needed.

**Today's code:**
- `apps-script/Code.gs` → `scanWeddingFolder_()` reads the subfolders as events.
- Loose photos in the main folder become one event, `'Highlights'`.
- `listImages_()` gets only `id` and `name`.

**Build:**
1. **Backend: read the time each photo was taken.**
   - In `listImages_()` (or a helper it calls), ask Drive for each photo's capture time:
     - `UrlFetchApp` to `https://www.googleapis.com/drive/v3/files?q='<folderId>' in parents and trashed=false&fields=nextPageToken,files(id,imageMediaMetadata/time,createdTime)&pageSize=1000`
     - Use the header `Authorization: Bearer ` + `ScriptApp.getOAuthToken()`.
     - Follow `nextPageToken`.
   - Save it on each photo as `t` (`'YYYY-MM-DD HH:MM'`; Drive gives `'YYYY:MM:DD HH:MM:SS'`).
   - No time → no `t`. Never fail the scan because of time.
2. **Backend: make time groups, only for the loose photos** (the `Highlights` event when the wedding has no event folders).
   - Sort by `t`. Start a new group when the gap is more than **3 hours** or the date changes.
   - Groups smaller than 5 photos join the nearest group.
   - Each group gets:
     - a key: `'g' + first photo date + hour`, e.g. `g2026-11-20-09`,
     - a default name: weekday + part of day, e.g. "Fri morning" / "Fri evening".
   - Photos without `t` stay in "Highlights".
3. **Backend: names.**
   - New column `timeGroups` at the end of `GALLERY_COLUMNS`. It holds JSON `{ key: name }`.
   - New route `nameTimeGroups` (couple key or staff only) saves names. Clean each name: max 40 characters, no HTML.
   - When the manifest is built, the time groups become normal events with the couple's names (or the default name), in time order. Event folders that photographers made are **never** changed.
4. **Front end: a naming screen** in the Control Panel (`17-control.js`) for the couple and the photographer. Show it only when the wedding has time groups.
   - Each group shows 4 small photos, its date and time ("Fri 20 Nov, 9 am – 1 pm") and a name box.
   - Below the boxes: quick name chips (Haldi, Mehndi, Sangeet, Wedding, Reception, Mayra, Cocktail, Other). Tapping a chip fills the box.
   - "Save names" button. After saving, the Events page shows the new event names.
5. **Tests:**
   - `tests/step80.test.js`:
     - groups are made correctly, including a gap across midnight and a tiny group that joins its neighbour,
     - names are saved and cleaned,
     - folder events stay untouched,
     - a guest cannot save names.
   - In `gas_mock.js`, add a fake reply for the Drive files call.
   - Add one browser check (the couple renames a group and the Events page shows it).

**Gemini gave:** `gemini/T1-T2-design.md`. Follow it with Claude's changes in `GEMINI-REVIEW.md`.

**Done when:**
- A wedding with only loose photos shows events grouped by time.
- The couple can rename them and the names stay.
- Folder weddings look exactly as before.
- `npm test` passes.

**Flag in the PR, don't solve:** two cameras with different clocks, and photos with no time.

---

## T2 — "At this time on the wedding day" (step 81) · Gemini designs, ChatGPT builds

**Why:** It makes the gallery feel alive. When a guest opens it, look at the guest's clock (time of day only, not the date). If photos were taken at about the same time of day on the wedding days, show a small moment: "Right now, on the wedding day… (Haldi, 10:40 am)" with 1–3 of those photos.

**Build:**
1. Needs `t` on photos (from T1). Use only photos the viewer is allowed to see. Respect the guest rules: if the wedding is "only after Find me", a guest who hasn't found themselves sees nothing.
2. Match window: ±20 minutes of the current time of day, on any wedding day. No match → show nothing (no empty card).
3. Show it once per visit as a small card on the Hub (`15-layout.js` / `34-canvas.js` "card" element), or as a pop that the guest can close. Gemini decides which. Tapping it opens those photos in the viewer.
4. A switch in the Control Panel features list (on by default). The couple can turn it off.
5. A new file, `app/gallery/48-same-time.js`, with its own CSS at the end of `gallery.css`.
6. Test: a browser test with a fixed clock (`page.clock` or an override `window.PG_NOW`) — the card shows on a match, shows nothing when there's no match, and the switch hides it.

**Gemini gave:** `gemini/T1-T2-design.md`. Decision: the **small pop** (not a Hub card). Follow `GEMINI-REVIEW.md`.

**Done when:** the card shows only on a real match, opens the right photos, can be turned off, and the tests pass.

---

## T3 — Reel Edits / Post Edits: element timing + sticker bug (step 82) · ChatGPT builds

**First check, then build.**
1. **Bug (check first):** in Post Edits (`app/post.js`), the delete button is hidden for stickers. If it is still true, fix it.
2. **Timing in Reel Edits** (`app/reel.js`): a text or sticker has a start and an end on the timeline.
   - Add a "Show from … to …" control in its pop-up sheet (two sliders, or drag handles on the timeline). The default is the whole clip.
   - Save it in `snapshot()` / `restore()` so Undo and drafts keep it.
   - The preview and the exported video follow it.
3. **Resize and crop placed elements:** check if this already works. If not, add pinch/drag-corner resize for stickers.
4. Tests: extend `tests/e2e_reel_*.js` / the post tests. Text shown at 1 s, hidden at 3 s; Undo works; the sticker delete works.

**Done when:** each element shows only in its time range, in the preview and the export; stickers can be deleted; the tests pass.

---

## T4 — Faces into Reel Edits (step 83) · ChatGPT builds (small)

`app/reel.js` has `PGReel.setFaces({ photoId: [[x,y,w,h], …] })` (0–1 boxes).
- `app/gallery/07-reel-open.js` opens Reel Edits but passes no faces. Pass the wedding's face boxes for the chosen photos (`faceBoxes` route, the same data Post Edits uses), so the automatic framing keeps faces in view.
- No faces → nothing changes.
- Test: a photo with a face box near the top is drawn with that area visible.

---

## T5 — Story layouts as free-canvas layouts (step 84) · Gemini writes the layout, ChatGPT adds it

**Why:** Deepak wants every layout inside the free editor. Living Story and Editorial Album are rebuilt as **free-canvas docs** (data, not code). The old versions stay until Deepak approves.

**Format (doc v1):** see `app/themes/layouts.json`, ids `canvas-quiet` and `canvas-night`.
```
{ v, name, colors{bg,ink,acc,acc2,card}, fonts{head,body},
  sections:[{ id, h:{p,l}, stay, bg:{c,src,dim,fx,fy,z},
    els:[{ id, t, p:{x,y,w,h,r,z,hide}, l:{…laptop spot}, s:{style}, sl:{laptop style}, m (motion), mo:{d,t,p},
           text, src:{k:'cover'|'hl'|'ev'|'id'|'auto', n, i, id}, act, … }] }] }
```

**Rules:**
- Phone design width 390, laptop 1200.
- Element types: `photo, names, date, text, events, strip, action (findme/reel/post/memory/moments/notes), blessings, credit, shape, card`.
- Motions: `fade rise drop left right grow blur wipe iris unfold shine` + loops `zoom float`.
- Fonts only from `FONTS` in `34-canvas.js`.
- Photos only by `src` (never a file or a URL).
- Must include a `findme` action element.

**Gemini gives:** the JSON doc for "Living Story (editor)" (and on Thu "Editorial Album (editor)"), copying the feel of the current layouts.

**ChatGPT does:**
- Adds the doc to `layouts.json` with `group: "progress"` (staff-only, hidden from couples), id `canvas-living` / `canvas-editorial`. Never start an id with `cv-`.
- Opens it in the editor to check it, takes phone and laptop screenshots, and runs `npm test`.

**Done when:** the doc opens in the editor on phone and laptop with nothing overflowing, and staff can see it under "In progress".

---

## T6 — Gaps in converted layouts (step 85) · ChatGPT builds (small)

When a card element (`t: 'card'`) in a free-canvas layout is hidden at run time (for example Reel for a guest before Find me), it leaves an empty hole.
- In `34-canvas.js`, when a card hides itself and the section is not in editing mode, move the elements below it up by its height (same section only).
- Test in `e2e_canvas.js`: a guest who hasn't done Find me sees no hole.

---

## Not this week (Claude after the reset)

See `BACKLOG.md`: A3 editor extras, A6 layouts for every page, B3 export, B5 data supply chain, C5 audio layers, D1–D7 guest security.
