# Gemini's design for F2 (Free editor + Template editor), F3 (Card editor), F4 (Reel Edits), 24 Nov 2026

Read it together with `../GEMINI-REVIEW.md`: Claude's corrections there win.

Here are the design specifications for **Jobs 4 → 6** (`F2`, `F3`, `F4`), keeping every existing button, control, and option while following the shared editor rule (`design visible ≥ 85%`).

---

## Job 4 — F2 · Free Editor & Template Editor (Phone + Laptop)

### Free Editor (Phone `390 × 844` & Laptop `1280 × 800`)

* **Top Bar (One Row, `52px`):**
* **Left:** `‹` (back) + `Undo` + `Redo` (`44px` tap targets).
* **Center/Right-Mid:** Compact zoom cluster (`−` `100%` `+` `Fit`) moved out of the canvas and out of the bottom sheet.
* **Right:** One main action pill (`Save` or `Apply`, keeping existing `► Play` accessible without wrapping onto a second row).


* **Drawer Heights & States (Phone):**
* **Collapsed (`64px` / ~7.6% of screen):** Single horizontal row of tool tabs (`Add`, `Style`, `Layers`, `Page`) + a collapse/expand chevron (`⌄` / `⌃`) on the right. The design stage expands to fill `728px` above it (`≥ 85%` visible).
* **Open (`max-height: 338px` / ~40% of screen):** Shows the active tab (`Add` tiles: `Photo`, `Names`, `Date`, `Text`, `Events · cards`, `Events · circles`, `Events · list`, `Photo strip`, `Blessing`, `Credit`, `Find me`, `Make a reel`, `Make a post`, `Add a moment`, `Root Moment`, `Blessings`, `Box`, `Circle`, `Line`; or `Style` controls: `Words (empty = the wedding's own)`, `Laptop has its own look (changes below stay on laptop)`, `Font`, `Size`, `Left` `Centre` `Right`, `Italic`, `CAPITALS`, `Weight 400`, `Letter spacing`, `Line height`, `Text colour`, `Background`, `Corners`, `Border`, `Shadow`, `See-through`, `Inner space`, `Motion`, `Rise up`; plus `Layers` and `Page`). The top stage shrinks to `~454px` (`design visible ≥ 85%` via proportional scaling).
* **Help Text:** *"Tap an element, then drag it"* appears once on entry and dismisses automatically after first interaction or 3 seconds.


* **Laptop (`1280 × 800`):** Left stage (`920px` wide) with zoom in the top bar; right tool panel (`360px` wide) holding `Add`, `Style`, `Layers`, `Page`.

### Template Editor (Phone `390 × 844` & Laptop `1280 × 800`)

* **Top Bar (One Row, `52px`):** `‹` (back) | `Undo` `Redo` | `Saved` status + `Apply`.
* **Drawer & "Choose a photo" Drawer:**
* **Phone Main Drawer (`max-height: 338px` / ~40%):** Top strip stays visible (`~454px` above drawer). Tabs: `Colours`, `Photos`, `Parts`, `Words`, `More`. Under `Photos`, `Cover photo`, `Haldi`, `Sangeet`, `Wedding`, `Reception`, `Reel`, `Post`, `Add a moment 1–3` sit in a horizontal scrolling row (`Automatic` label + `Frame` button placed cleanly below/beside the thumbnail rather than covering a corner or cutting text).
* **"Choose a photo" as a Drawer (Never Full-Screen):** Tapping a slot opens a **`338px` (`40%`) bottom drawer on phone** (or **`360px` right panel on laptop**) with `Choose a photo`, `Frame this one`, `✕`, and event rows (`Haldi`, `Sangeet`, `Wedding`, `Reception`) in a horizontal strip so the top `~454px` of the template stays visible while picking photos.


* **Exact Words (F2):**
* Top bar: `‹`, `Undo`, `Redo`, `−`, `100%`, `+`, `Fit`, `► Play`, `Save`, `Apply`
* Tabs: `Add`, `Style`, `Layers`, `Page` / `Colours`, `Photos`, `Parts`, `Words`, `More`
* Photo picker: `Choose a photo`, `Frame this one`, `Automatic`, `Frame`, `Haldi`, `Sangeet`, `Wedding`, `Reception`



### HTML/CSS Sketch (F2 Phone Drawer + Photo Drawer)

```html
<div class="pg-f2-wrap">
  <header class="pg-f2-topbar">
    <button class="pg-btn-44" aria-label="Back">‹</button>
    <button class="pg-btn-44" aria-label="Undo">↶</button>
    <button class="pg-btn-44" aria-label="Redo">↷</button>
    <div class="pg-zoom-bar">
      <button aria-label="Zoom out">−</button>
      <span>100%</span>
      <button aria-label="Zoom in">+</button>
      <button>Fit</button>
    </div>
    <button class="pg-apply-btn">Apply</button>
  </header>

  <div class="pg-f2-stage">
    <div class="pg-f2-canvas"><!-- Live layout scales to fit stage --></div>
  </div>

  <!-- Closed = 64px tab row; Open = max 40% height (338px on 844px phone) -->
  <section class="pg-f2-drawer is-open">
    <div class="pg-f2-tabs">
      <button class="is-active">Add</button>
      <button>Style</button>
      <button>Layers</button>
      <button>Page</button>
      <button class="pg-collapse-btn" aria-label="Toggle drawer">⌄</button>
    </div>
    <div class="pg-f2-drawer-body"><!-- Active controls or Choose a photo strip --></div>
  </section>
</div>

<style>
  .pg-f2-wrap { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
  .pg-f2-topbar { height: 52px; display: flex; align-items: center; gap: 6px; padding: 0 8px; white-space: nowrap; }
  .pg-btn-44 { min-width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
  .pg-f2-stage { flex: 1 1 auto; min-height: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .pg-f2-drawer { flex: 0 0 auto; max-height: 40vh; display: flex; flex-direction: column; overflow: hidden; }
  .pg-f2-drawer.is-collapsed .pg-f2-drawer-body { display: none; }
  .pg-f2-tabs { height: 64px; min-height: 64px; display: flex; align-items: center; overflow-x: auto; }
  .pg-f2-drawer-body { overflow-y: auto; max-height: calc(40vh - 64px); }
  @media (min-width: 900px) {
    .pg-f2-wrap { flex-direction: row; flex-wrap: wrap; }
    .pg-f2-topbar { width: 100%; }
    .pg-f2-stage { width: calc(100% - 360px); height: calc(100dvh - 52px); }
    .pg-f2-drawer { width: 360px; max-height: none; height: calc(100dvh - 52px); }
    .pg-f2-drawer.is-collapsed { width: 64px; }
  }
</style>

```

---

## Job 5 — F3 · Card Editor (Phone + Laptop)

### Header & "Page settings" Folding (Phone `390 × 844`)

* **Single Top Row (`52px`):** `‹` (back) | `Undo` `Redo` | `Preview` + `Publish` (keeping both existing actions without wrapping onto 3 rows).
* **One "Page settings" Button:** Fold `Logo` (`Left` / `Right`), `Light/dark` (`Left` / `Right`), `+ Add card`, `Colours`, and `Start again from a layout...` out of the header into a single **`Page settings`** pill button.
* **Page Settings Drawer (`max-height: 310px` / ~37% of screen):** Tapping `Page settings` opens a compact drawer with:
* `Logo`: `Left` | `Right`
* `Light/dark`: `Left` | `Right`
* `+ Add card` & `Colours` buttons
* `Start again from a layout...` dropdown/selector



### Card Selected State & Grid Visibility (`design visible ≥ 85%`)

* **Phone (`390 × 844`):**
* When a card (such as `Cover photos`) is selected, the card editor drawer opens at **`max-height: 290px` (~34% of screen)** and **the grid stage shrinks (`flex: 1; min-height: 0`) and scrolls to keep the selected card inside the upper `~502px` (`design visible ≥ 85%`)**.
* Keeps all existing controls inside the card drawer: `Style` (`One big photo`, etc.), `Card` (`Cover photos`, etc.), `Done`, size pills (`Small 1x1`, `Wide 2x1`, `Square 2x2`, `Tall 2x3`, `Large 4x2`), `Hide on Phone`, and `Remove from the Hub`.


* **Laptop (`1280 × 800`):**
* Left grid stage (`920px` wide) stays uncovered with the selected card highlighted; right panel (`360px` wide) or compact docked inspector holds `Page settings` and selected card options (`Small 2x2`, `Wide 4x2`, `Square 4x4`, `Tall 4x6`, `Large 6x4`, `Big 8x5`, `Full 12x4`, `Hide on Laptop`, `Remove from the Hub`, `Done`).


* **Exact Words (F3):**
* Top bar: `‹`, `Undo`, `Redo`, `Preview`, `Publish`
* Phone button: `Page settings`
* Inside Page settings: `Logo`, `Left`, `Right`, `Light/dark`, `Left`, `Right`, `+ Add card`, `Colours`, `Start again from a layout...`
* Inside Card panel: `Cover photos`, `Done`, `Style`, `One big photo`, `Card`, `Hide on Phone` / `Hide on Laptop`, `Remove from the Hub`



---

## Job 6 — F4 · Reel Edits (Phone + Laptop)

### Laptop Layout (`1280 × 800`) — Reel ≥ 3× Bigger

* **Split Workspace:**
* **Left Stage (`calc(100% - 360px)` = `920px` wide):** Displays a tall `9:16` vertical reel preview (~`580px` tall instead of ~`160px`—over **3× larger** than today's small preview) with play/pause and timecode (`00:00` / `00:29`) cleanly below it.
* **Right Panel (`360px` fixed width):** Houses the timeline tracks (`Flashes on the beat · Zoom on the beat`, `Road Trip (acoustic)`, `Title`, clip strip), tool buttons (`Audio`, `Text`, `Drawings`, `Filters`, `Adjust`, `Style`, `Length`, `Title`, `Add clip`), and active tool controls so **100% of the reel preview stays visible** while editing.



### Phone Drawers (`390 × 844`) — All Under 40% (`≤ 338px`)

* **Top Bar (One Row, `52px`):** `‹` | `Reel Edits` (`1080p` selector) | `Next ›`.
* **Stage + Timeline + Drawer (`max-height: 40%` = `338px` max):**
* Keep the reel preview compact (`~270px` tall) at the top and timeline compact (`~110px` tall) so **every drawer stays `≤ 338px` (`< 40%`)** and **≥ 85% of the reel/workspace remains unobstructed**:
* **Audio drawer (`max-height: 310px` / ~37%):** *"Cuts land on the beat of the music. Your own song stays on this phone and is gone when you close."* + `Done` + track list (`Cocktail Night (party) 124 bpm`, `Dhol Festival (bhangra) 118 bpm`, `Road Trip (acoustic) 100 bpm`, `Renegade 129 bpm`, `Tere Sang (with you) 96 bpm`, `Celebration Groove 112 bpm`, `Sitar Instrumental 92 bpm`).
* **Drawings drawer (`max-height: 290px` / ~34%):** `Drawings` + `Done`, category pills (`Flowers`, `Wedding`, `Love`, `Party`), and a horizontal row of sticker icons (`Rose`, `Lotus`, `Marigold`, `Jasmine`, etc.) so the reel preview above stays visible.
* **Other drawers (`Filters`, `Length`, `Style`, `Add text`, `Title & ending`, `Clip 1`):** Capped at `≤ 338px` (`< 40%`) with horizontal scrolling rows where needed.





### "Add clip" — Showing Clips Already in the Reel

* Both on phone (`338px` drawer/sheet above the reel preview) and laptop (`360px` right panel):
* Each photo/video tile in the picker that is **already in the reel** displays a **numbered badge (`#1`, `#2`, `#3`…)** and a highlighted border/check indicator (and tapping it can either jump to that clip in the reel or add another instance if allowed), while keeping *"From your phone — Photos and videos from your phone stay on your phone — nothing is uploaded, and they are let go when you close Reel Edits"*, `0/80` counter, and `Next`.



### Exact Words (F4)

* Top bar: `‹`, `Reel Edits`, `1080p`, `Next ›`, `Done`
* Tools: `Audio`, `Text`, `Drawings`, `Filters`, `Adjust`, `Style`, `Length`, `Title`, `Add clip`
* Audio copy: `Cuts land on the beat of the music. Your own song stays on this phone and is gone when you close.`
* Length copy: `Builds the reel again for this length. Text and drawings stay.` (`15 s`, `30 s`, `60 s`)
* Style copy: `A new style rebuilds the layouts and transitions. Your text, drawings and filter stay.` (`South · Kasavu`, `Soft`, `Dynamic`, `Travel`, `Festival`, `Party · Cocktail`, `Haldi · Sunshine`, `Mehendi · Courtyard`, `Sangeet · Glitz`, `Baraat · Royal Dhol`, `Pheras · Sa`, `Shuffle the order of the photos`)
* Clip sheet: `Clip 1`, `This photo`, `Replace`, `FRAME · DRAG THE PHOTO ON THE REEL TO MOVE IT`, `Zoom`, `Reset`, `Longer`, `Shorter`, `Move left`, `Move right`, `Delete`, `4 BEATS · 2.4 S · LOOK`, `single`, `punch`, `polaroid`, `tv`, `strobe`, `rgb jharokha`

---

### Suggestions (Not Part of Jobs 4–6)

1. **Syncing `15 s` / `30 s` / `60 s` Length with Audio Duration:** In `Reel Edits → Length`, showing a subtle badge next to `15 s`, `30 s`, or `60 s` when a chosen song is shorter than `60 s` helps couples avoid silent tail-ends before exporting.
2. **Quick "In Reel" Filter Toggle in `Add clip`:** Adding a small `In reel (N)` filter pill alongside `From your phone` lets couples quickly spot or remove a clip already placed in a long reel without scrolling back through 80 photos.