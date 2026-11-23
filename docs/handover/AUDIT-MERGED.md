# One fix list — three audits merged (Claude + ChatGPT + Gemini, 24 Nov 2026)

**Sources:**
- **C** = Claude (measured in the browser)
- **G** = ChatGPT (read the code)
- **M** = Gemini (looked at 222 screenshots)

**Checked:**
- ✅ Claude confirmed it in the browser or in the code.
- ❌ It turned out not to be real.

Fix cards **F0–F6** are at the bottom. They come **before** the week-plan cards T1–T6.

## 1. The editors hide the design (the main problem)

| # | Where | Screen | What is wrong | How bad | From | Checked | Card |
|---|---|---|---|---|---|---|---|
| 1 | Living Story / Editorial Album → Design | both | Opens a list of switches, with no picture of the layout | 1 | C M | ✅ | F5 |
| 2 | Post Edits → Drawings (post + album) | both | A full-screen sheet; 0 % of the design visible | 1 | C M | ✅ | F1 |
| 3 | Post Edits → Template (album) | both | Covers 92 % (phone) / 79 % (laptop) | 1 | C G M | ✅ | F1 |
| 4 | Post Edits → Template (post) | phone | Covers 46 % | 2 | C M | ✅ | F1 |
| 5 | Post Edits → Text / Order / Filters | both | The sheet covers the bottom of the design (8–21 %), where the text often is | 2 | C G | ✅ | F1 |
| 6 | Free editor (every Minimal / In-progress layout opens here) | phone | The tool panel takes half the screen; you see only half the page | 1 | C G M | ✅ | F2 |
| 7 | Free editor → zoom pill | both | It floats over the cover photo | 3 | C M | ✅ | F2 |
| 8 | Free editor → top bar | phone | Apply drops to a second row; Undo/Redo are hard to see | 2 | M | ✅ | F2 |
| 9 | Template editor | phone | The design gets only the top half | 2 | C G | ✅ | F2 |
| 10 | Template editor → Choose a photo | both | The picker covers everything; you can't see where the photo goes | 2 | G M | ✅ | F2 |
| 11 | Card editor → a card selected | both | The tools cover about a third of the grid, and the grid doesn't move up | 2 | C G M | ✅ | F3 |
| 12 | Card editor → top controls | phone | 3 rows of controls; "Start again from a layout" is cut off | 2 | C M | ✅ | F3 |
| 13 | Reel Edits | laptop | The reel is tiny (8 % of the screen); lots of empty space | 2 | C M | ✅ | F4 |
| 14 | Reel Edits → Audio / Drawings | both | The sheet covers 21–25 % of the reel and the whole timeline | 2 | C M | ✅ | F4 |
| 15 | Reel Edits → Clip sheet | phone | The sheet is tall; the reel gets small | 2 | G M | partly (C measured the reel still 100 % visible) | F4 |
| 16 | Reel Edits → Add clip | both | The picker doesn't show which clips are already in the reel | 2 | M | not checked | F4 |

## 2. Broken

| # | Where | Screen | What is wrong | How bad | From | Checked | Card |
|---|---|---|---|---|---|---|---|
| 17 | Framing sheet (template photos, cover photo) | phone | **The app's bottom bar covers Reset and Done**, so you can't save | 1 | M | ✅ (Claude's bug, step 79) | F0 |
| 18 | Template editor → Photos → "Frame" button | both | It covers the photo's corner and its own word gets cut | 3 | C | ✅ | F0 |
| 19 | Post Edits → Order on a single-photo post | laptop | An empty bar with only "Done" | 3 | M | not checked | F0 |
| 20 | Small buttons in the editor top bars | phone | 38 px; our rule is 44 px | 3 | G | ✅ (in CSS) | F0 |
| 21 | Hub on laptop: "Guest moments" + "Add to Root Moment" pop-ups stacked | laptop | Only in full-page screenshots; a normal screen is clean | — | M | ❌ not real | — |

## 3. Distractions

| # | Where | What is wrong | How bad | From | Card |
|---|---|---|---|---|---|
| 22 | Reel Edits / Post Edits header | The "COUPLE" badge sits inside the editor | 3 | C M | F0 |
| 23 | All editors | The app's bottom bar and badges stay visible inside full-screen editors | 2 | M | F0 |
| 24 | All editors | Each editor has a different top bar (✕ vs ‹, Publish vs Apply vs Next) | 2 | M | F0 (shared rule) |
| 25 | Free editor / Post Edits | Help sentences ("Tap an element…") stay forever | 3 | M | F2 / F1 |

## 4. Control Panel

| # | Where | What is wrong | How bad | From | Card |
|---|---|---|---|---|---|
| 26 | Control Panel → Theme | Says "Tap one to see every page in it first", but the panel covers the whole app | 1 | M | F6 |
| 27 | Control Panel → Look vs Theme | Two screens with the same theme cards | 2 | M | F6 |
| 28 | Control Panel → Hub layout | Grey wireframe boxes instead of the couple's real photos | 2 | M | F6 |

## 5. Incomplete (already in BACKLOG.md, no new card)
Story layouts in the free editor (A1), desktop versions (A2), editor extras (A3), gaps when a card is hidden (A4/T6), background drag (A5), layouts for other pages (A6), the timeline and video ideas (A8).

---

## The fix cards (in order)

All of them follow the **Editor layout rule** in `AGENTS.md` §5.

| Card | What | Who | Size |
|---|---|---|---|
| **F0** | Quick fixes, one PR: hide the app's bottom bar and badges while any full-screen editor or sheet is open (#17, #22, #23); move the "Frame" button under the photo (#18); hide Order on single posts (#19); 44 px buttons (#20); one shared top bar look for all editors (#24): ‹ back left, Undo/Redo, one main button right | ChatGPT | small |
| **F1** | Post Edits: every tool opens as a short drawer; the design shrinks above it; Template and Drawings become one row of small thumbnails (#2–#5, #25) | Gemini designs → ChatGPT | medium |
| **F2** | Free editor + template editor on phone: collapsible drawer, zoom in the top bar, one-row top bar, the photo picker as a drawer with the design visible (#6–#10, #25) | ChatGPT | medium |
| **F3** | Card editor: the tools don't cover the grid; the header settings fold into one "Page settings" button (#11, #12) | ChatGPT | small |
| **F4** | Reel Edits: on laptop the tools move to a right side panel and the reel grows; drawer height capped; the picker shows the chosen clips (#13–#16) | ChatGPT | medium |
| **F5** | Living Story / Editorial show the real layout while editing (#1) — **Deepak chooses A or B, below** | Claude (Sat) | medium |
| **F6** | Control Panel: Theme previews live behind a slim bottom bar; merge Look + Theme; layout cards show the couple's real cover photo (#26–#28) | Gemini designs → ChatGPT | medium |

**F5 — choose one:**
- **A. Add a live preview to the current Living Story / Editorial editor.** Fast. It keeps the old editor (switches + list) and adds the picture next to it.
- **B. Move them into the free editor** (backlog A1 / card T5). Slower, but every layout then uses one editor, as Deepak wanted on 23 Nov.
- **C. Both:** A now, so couples see something today; B later; A goes away when B is ready.

## Done when (for ChatGPT, one PR per card, branch `step-86-f0-quick-fixes`, `step-87-f1-post`, …)

- **F0 (step 86):**
  - On phone, the framing sheet's Reset and Done can be tapped (no bar over them).
  - No app bottom bar or role badge shows inside Post Edits, Reel Edits, the Hub editors, the template editor or the framing sheet.
  - The "Frame" button no longer covers the photo, and its word isn't cut.
  - Order is hidden on single-photo posts.
  - Top-bar buttons are 44 px or more.
  - Every editor's top bar is on one row.
  - `npm test` passes.
- **F1 (step 87):** `overlay-audit.js --only="Post Edits"` shows design visible ≥ 85 % for every tool, on phone and laptop. Template and Drawings choices change the design live while the drawer is open.
- **F2 (step 88):** `--only="Free editor"` and `--only="Template editor (tpl"` show ≥ 85 % on phone. The drawer can be closed to the tool row. Zoom is in the top bar. Choose a photo opens as a drawer with the design visible.
- **F3 (step 89):** `--only="Card editor"` ≥ 85 % with a card selected. The phone header is one row with a "Page settings" button.
- **F4 (step 90):** `--only="Reel Edits"` ≥ 85 % for every sheet. On laptop the reel is at least 3× bigger than today, with the tools in a right panel. The Add-clip picker shows the clips already in the reel.
- **F6 (step 91):**
  - Tapping a theme shows it on the real pages behind a slim bottom bar.
  - Look and Theme are one screen.
  - The layout cards show the couple's cover photo.
- **Every card:** don't remove any tool or feature; only where it sits and how big it is changes.
