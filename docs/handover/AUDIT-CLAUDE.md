# Audit 1 of 3 — Claude (23 Nov 2026)

Made with `tools/audit/overlay-audit.js` (made-up photos) on `main` after PR #105, plus Deepak's own notes. The phone screen is 390 × 844 and the laptop screen is 1280 × 800.

**How to read the numbers.** "Visible" = how much of the design part that is on screen is not covered by tools. It is measured over 576 points.

**What this covers.** It covers the main editors. It does **not** cover:
- every Reel/Post tool sheet,
- the Control Panel sheets,
- each of the 35 layouts one by one.

ChatGPT's and Gemini's audits cover those.

## Measured

| Editor | Phone: visible | Laptop: visible | What covers it |
|---|---|---|---|
| Free editor (any layout) | **51 %** | 99 % | Phone: the bottom panel (Add/Style/Layers/Page) takes about half the screen |
| Card editor — Living Story / Editorial | **no preview at all** | **no preview at all** | It opens as a list of switches ("Sections, Find me button, Icon bar…") with no picture of the layout |
| Card editor — grid layouts | 100 % | 100 % | Phone: the top controls take about 45 % of the screen before the preview starts |
| Template editor (in-progress templates) | 100 % (but the preview is only the top half of the screen) | 100 % | Laptop is good: design left, tools right |
| Post Edits — album, editing | 96 % | 100 % | — |
| Post Edits — album, **Template sheet open** | **8 %** | **21 %** | The template sheet lies over the album (big thumbnails) |
| Post Edits — album, Text sheet open | 88 % | 79 % | The sheet covers the lower part of the album, where the text often is |
| Reel Edits — editing | 100 % | 100 % (but the reel is tiny: 8 % of the laptop screen) | — |

## Report

### Overlay and preview

| # | Where | Screen | What is wrong | How bad | Fix idea |
|---|---|---|---|---|---|
| 1 | Control Panel → Look → Living Story / Editorial Album → Design | both | No preview: you edit a list of switches and can't see the layout | 1 | Show the live layout next to the list (laptop) or above it (phone), updating on every change; or move these layouts into the free editor (backlog A1) |
| 2 | Post Edits → Album → Template | both | The sheet covers 92 % (phone) / 79 % (laptop) of the album | 1 | A short drawer with one row of small template thumbnails; the album shrinks above it and changes live |
| 3 | Free editor (Design your own Hub) | phone | The tool panel covers half the screen; you see only the top half of the page | 1 | Panel max ~35 % high and collapsible to a single tab bar; the page shrinks to fit above it; "Fit" shows the whole section |
| 4 | Post Edits → Album → Text (and other sheets) | both | The sheet covers the bottom of the album, often where the text is | 2 | The same drawer rule as #2; scroll the design so the selected item sits above the drawer |
| 5 | Template editor | phone | The preview is only the top half of the screen; you can't see the whole page while changing photos or colours | 2 | Same as #3 (collapsible drawer + "see whole page") |
| 6 | Card editor (grid) | phone | The top controls (logo / light-dark / layout / colours rows) push the preview down to under half the screen | 2 | Fold the header settings into one "Header" button |
| 7 | Reel Edits | laptop | The reel preview is tiny (8 % of the screen) with lots of empty space | 2 | Scale the preview to the free height (like the template editor on laptop) |
| 8 | Free editor | laptop | The zoom bar floats over the page (small) | 3 | Put zoom in the top bar |

### Broken / small bugs

| # | Where | Screen | What is wrong | How bad | Fix idea |
|---|---|---|---|---|---|
| 9 | Template editor → Photos | both | The new "Frame" button (step 79) covers the photo's corner and its own word gets cut ("rame") | 3 | Put "Frame" under the photo name, not on the photo |
| 10 | Reel Edits / Post Edits header | phone | The "COUPLE" role badge sits in the middle of the tool's header: a distraction while editing | 3 | Show the role badge once on arrival only (as decided on 13 Nov), never inside editors |

### Incomplete (from the backlog, seen while testing)

| # | Where | What | How bad |
|---|---|---|---|
| 11 | Story layouts | Living Story and Editorial Album are not in the free editor yet (A1). That is why #1 has no preview | 1 |
| 12 | Editors overall | Every editor has its own layout rules (free editor, card editor, template editor, Post, Reel). There is no common "design visible + tools drawer" rule | 1 |

## Top 5 (my order)

1. **#1** — Living Story / Editorial show no preview.
2. **#2** — Post Edits template sheet covers the album.
3. **#3** — the free editor on phone shows only half the page.
4. **#12** — one common editor rule for every editor (see below), then fix #4–#7 with it.
5. **#9** and **#10** — small, quick.

## My fix pattern for the overlay (one rule for every editor)

- **Laptop (≥ 700 px):** design on the left (as big as fits), tools on the right in a fixed column (~360 px). Nothing floats over the design. The template editor already does this; copy it.
- **Phone:**
  - The **design is always fully visible at the top**, shrunk to fit if needed.
  - The **tools are a bottom drawer**:
    - closed = one row of tool icons (~64 px);
    - open = at most **40 %** of the screen.
  - Opening a sheet makes the design **smaller**; it never covers it.
  - The selected item scrolls into view above the drawer.
  - Option grids (templates, stickers, fonts) use **one horizontal row of small thumbnails**, not a full-screen grid.
- **Preview always on:** every change shows in the design at once, so no editor is a list without a picture.
- **Calm:** no badges, hints or floating buttons over the design while editing; hints show once and then go.

## Extra ideas (max 3)

1. Swipe the drawer down to see the full design for a moment; let go and it comes back (like CapCut).
2. A "before / after" hold button in every editor.
3. Keep the measuring script and add it to the tests, so "visible ≥ 85 %" becomes a rule nobody can break again.
