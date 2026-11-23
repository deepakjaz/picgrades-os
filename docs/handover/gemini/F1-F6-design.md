# Gemini's design for F1 (Post Edits) and F6 (Control Panel), 24 Nov 2026

Read it together with `../GEMINI-REVIEW.md`: Claude's corrections there win.

Here are the three design deliverables in order (`Job 1` → `Job 2` → `Job 3`). Everything uses plain HTML/CSS/JS patterns, keeps 100% of existing features, and follows the shared editor rule (`design visible ≥ 85%`).

---

## Job 1 — F1 · Post Edits Tools

### Layout Architecture (Phone vs. Laptop)

* **Global Rule:** Inside Post Edits, the app bar, `COUPLE` pill, and floating hints are hidden. Top bar is one 52px row: `‹` (left) | `Undo` `Redo` (center) | `Next` (right).
* **Phone (`390 × 844`):**
* **Closed state (Idle):** Top bar (`52px`) + Stage (`728px`, canvas scaled via `object-fit: contain` so 100% of a post or full album spread width fits inside `390px` with zero horizontal clipping) + Tool Dock (`64px`, single horizontal row of icons: `Template`, `Colours`, `Text`, `Drawings`, `Filters`, `Order`, `Shape`).
* **Open state (Tool active):** Tool Dock expands into a bottom drawer capped at **`max-height: 36vh` (`~304px`)**. The Stage container shrinks smoothly to **`calc(100vh - 52px - drawerHeight)`** (`~488px`), keeping the entire post/album centered and **95%+ visible** above the drawer.


* **Laptop (`1280 × 800`):**
* **Split Shell:** Left Stage (`calc(100% - 360px)` = `920px` wide) centers the canvas with `32px` padding. Right Sidebar (`360px` fixed width) holds the tool tabs at the top and the active tool controls below—**100% of the design stays uncovered** at all times.


* **Help Text Rule:** *"Tap a photo to move, zoom, or replace"* appears once as a subtle toast inside the Stage on first open, then fades out permanently after 3 seconds or first tap (`localStorage` flag).

### Tool-by-Tool Spec (Post & Album)

| Tool | Phone Drawer Height | What One Row Shows (Phone & Laptop) | How Design Shrinks & Updates | Exact Words |
| --- | --- | --- | --- | --- |
| **Template** | **Phone:** `176px` (`21%` of screen)<br>

<br>**Laptop:** Right panel (`360px`) | **Row 1 (Album only):** Category filter pills (`All`, `Haldi`, `Mehendi`, `Sangeet`, `Baraat`, `Wedding`, `Reception`, `Cocktail`).<br>

<br>**Row 2 (Post & Album):** Single horizontal scrolling row of `64 × 80px` live mini-thumbnails using the couple's actual photo (`Clean`, `Names below`, `Names on photo`, `Gallery frame`, `Night` for Post; `Album Classic`, `Seamless`, `Film Strip`, `Polaroid String`, `Magazine`, `Minimal White`, `Arch Windows`, `Kasavu Border`, `Floral` for Album). | Stage height shrinks from `728px` to `616px`; canvas scales down proportionally (`transform: scale(...)` or CSS `aspect-ratio` box) and updates live on every thumbnail tap. | Header: `Template` + `Done`<br>

<br>Pills: `All`, `Haldi`, `Mehendi`, `Sangeet`, `Baraat`, `Wedding`, `Reception`, `Cocktail`<br>

<br>Post names: `Clean`, `Names below`, `Names on photo`, `Gallery frame`, `Night` |
| **Colours** | **Phone:** `116px` (`14%` of screen)<br>

<br>**Laptop:** Right panel (`360px`) | **Single row:** Horizontal scrolling row of `40 × 40px` split-tone colour circles (`44px` tap target). | Stage height is `676px`; background, borders, and text accents recolour immediately on tap. | Header: `Colours` + `Done` |
| **Text** | **Phone:** `188px` (`22%` of screen)<br>

<br>**Laptop:** Right panel (`360px`) | **Two compact inputs stacked (no scrolling):** `Names` input (`44px` tall) and `Date` input (`44px` tall). *(Note: When mobile keyboard opens, `visualViewport` height keeps the canvas pinned above the keyboard).* | Stage height is `604px`; typing updates the names and date live on the card. | Header: `Text` + `Done`<br>

<br>Labels: `NAMES`, `DATE` |
| **Drawings** | **Phone:** `176px` (`21%` of screen)<br>

<br>**Laptop:** Right panel (`360px`) | **Row 1:** Toggle pill (`Template drawings` on/off) + category pills (`Flowers`, `Wedding`, `Ceremony`, `Love`, `Party`, `Lettering`).<br>

<br>**Row 2:** Single horizontal scrolling row of `56 × 56px` sticker cards (`Rose`, `Lotus`, `Marigold`, `Jasmine`, etc.). | Replaces the old 100% blocking black modal. Stage shrinks to `616px`; tapping a sticker drops it directly onto the center of the visible design where the user can drag/pinch it. | Header: `Drawings` + `Done`<br>

<br>Toggle: `Template drawings`<br>

<br>Tabs: `Flowers`, `Wedding`, `Ceremony`, `Love`, `Party`, `Lettering` |
| **Filters** | **Phone:** `148px` (`18%` of screen)<br>

<br>**Laptop:** Right panel (`360px`) | **Single row:** Horizontal scrolling row of `56 × 68px` photo filter previews (`Original`, `Warm`, `Golden`, `Film`, `Vivid`, `Cool`, `Fade`, `B&W`, `Noir`). | Stage height is `644px`; filter applies live to all photos in the post or active album slide. | Header: `Filters` + `Done`<br>

<br>Items: `Original`, `Warm`, `Golden`, `Film`, `Vivid`, `Cool`, `Fade`, `B&W`, `Noir` |
| **Order** | **Phone:** `148px` (`18%` of screen)<br>

<br>**Laptop:** Right panel (`360px`)<br>

<br>*(Hidden when `photos.length === 1`)* | **Single row:** Horizontal row of `52 × 64px` numbered photo thumbnails with `‹` `›` nudge arrows underneath each thumbnail (plus drag-to-reorder). | Stage height is `644px`; swapping slots updates the collage/carousel slide order live. | Header: `Order` + `Done` |
| **Shape** | **Phone:** `136px` (`16%` of screen)<br>

<br>**Laptop:** Right panel (`360px`) | **Single row:** Horizontal pill buttons (`3:4 · Profile grid`, `4:5 · Tall`, `1:1 · Square`, and `1.91:1 · Wide` for single posts). | Stage height is `656px`; canvas frame morphs smoothly to the new aspect ratio and auto-fits inside the stage. | Header: `Shape` + `Done`<br>

<br>Pills: `3:4 · Profile grid`, `4:5 · Tall`, `1:1 · Square`, `1.91:1 · Wide` |

### Reference HTML/CSS Shell (F1)

```html
<div class="pg-editor-shell" data-mode="post-edits">
  <!-- Unified 1-Row Top Bar (52px) -->
  <header class="pg-ed-top">
    <button class="pg-icon-btn" aria-label="Back">‹</button>
    <div class="pg-ed-history">
      <button class="pg-icon-btn" aria-label="Undo">↶</button>
      <button class="pg-icon-btn" aria-label="Redo">↷</button>
    </div>
    <button class="pg-primary-pill">Next</button>
  </header>

  <!-- Workspace: Stage + Non-Overlapping Tool Zone -->
  <main class="pg-ed-body">
    <section class="pg-ed-stage">
      <div class="pg-canvas-fit" id="postCanvas">
        <!-- Live Post / Album Spread renders here -->
      </div>
      <div class="pg-once-hint" id="onceHint">Tap a photo to move, zoom, or replace</div>
    </section>

    <aside class="pg-ed-drawer" data-open="true">
      <div class="pg-drawer-head">
        <span class="pg-drawer-title">Template</span>
        <button class="pg-done-pill">Done</button>
      </div>
      <!-- Row 1: Category Pills (Album only) -->
      <div class="pg-h-scroll pg-pills-row">
        <button class="pg-pill is-active">All</button>
        <button class="pg-pill">Haldi</button>
        <button class="pg-pill">Mehendi</button>
        <button class="pg-pill">Sangeet</button>
      </div>
      <!-- Row 2: Single Horizontal Thumbnail Strip -->
      <div class="pg-h-scroll pg-thumbs-row">
        <button class="pg-thumb-card is-active">
          <div class="pg-thumb-preview"></div>
          <span>Album Classic</span>
        </button>
        <!-- ...more cards -->
      </div>
    </aside>
  </main>
</div>

<style>
  .pg-editor-shell {
    position: fixed; inset: 0; background: #0e0d0c; color: #f6f2eb;
    display: flex; flex-direction: column; z-index: 900;
  }
  .pg-ed-top {
    height: 52px; padding: 0 12px; display: flex; align-items: center;
    justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08);
  }
  .pg-icon-btn { min-width: 44px; min-height: 44px; border-radius: 22px; }
  .pg-ed-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .pg-ed-stage {
    flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;
    padding: 12px; position: relative; transition: flex 0.2s ease;
  }
  .pg-canvas-fit {
    max-width: 100%; max-height: 100%; aspect-ratio: 3 / 4;
    display: flex; align-items: center; justify-content: center;
  }
  .pg-ed-drawer {
    background: #181614; border-top: 1px solid rgba(255,255,255,0.1);
    max-height: 40vh; padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; gap: 8px;
  }
  .pg-h-scroll {
    display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none;
  }
  .pg-h-scroll::-webkit-scrollbar { display: none; }
  .pg-thumb-card { flex: 0 0 68px; text-align: center; font-size: 11px; }

  /* Laptop Split Layout (>= 900px) */
  @media (min-width: 900px) {
    .pg-ed-body { flex-direction: row; }
    .pg-ed-drawer {
      width: 360px; max-height: none; height: 100%;
      border-top: none; border-left: 1px solid rgba(255,255,255,0.1);
    }
  }
</style>

```

---

## Job 2 — F6 · Control Panel Theme & Layout Cards

### 1. Merging "Look" and "Theme"

* In Control Panel Home, remove the duplicate `Look` row and route directly to **`Theme`** (subtitle shows the active theme name, e.g., `Midnight Cinema`).
* **Hub Layout Cards:** Replace the generic orange/grey wireframe rectangles in `Control Panel → Hub layout` with live mini-renders of each layout populated with the couple's actual cover photo (`src.k === 'cover'`), couple names, and wedding date.

### 2. Live Theme Preview Behind a Slim Bottom Bar

Instead of a full-screen blocking modal (`0% visible`), tapping **Theme** opens the couple's actual live app behind a compact floating bottom dock (`168px` tall on phone, `144px` tall on laptop), leaving **80%+ of the real wedding app uncovered**.

* **Phone (`390 × 844`):**
* **Top Mini Switcher Pill (`40px` tall, centered at top):** Allows the couple to switch which real page they are previewing while testing themes: `Hub` | `Events` | `Gallery`.
* **Center Viewport (`~620px` tall, interactive):** The real wedding page renders live with the tapped theme's `--bg`, `--ink`, `--acc`, `--card`, fonts, and icons. Couples can scroll the page normally to check readability.
* **Slim Bottom Theme Bar (`168px` tall):**
* **Row 1:** Active theme name (`Ivory Glass`) on the left + two action buttons on the right: `Cancel` (ghost pill, `44px` tall) and `Apply` (accent pill, `44px` tall).
* **Row 2:** Single horizontal scrolling strip of theme cards (`88 × 76px`), each showing a tiny swatch of background + accent colour + heading font sample (`Aa`) + theme name (`Original`, `Ivory Glass`, `Udaipur Sandstone`, `Malabar Kasavu`, etc.).




* **Laptop (`1280 × 800`):**
* **Top Mini Switcher Pill:** `Hub` | `Events` | `Gallery` centered at top (`y: 16px`).
* **Center Viewport (`100%` width):** Full desktop view of the live wedding page updating instantaneously as themes are clicked.
* **Slim Bottom Dock (`132px` tall, centered `max-width: 960px` floating pill bar):** Shows the horizontal row of theme cards on the left, and `Cancel` + `Apply` buttons on the right.



### Exact Words (F6)

* **Control Panel Home Row:** `Theme` · `Original` (or active theme name)
* **Top Page Switcher:** `Hub` · `Events` · `Gallery`
* **Bottom Bar Header:** `{Selected Theme Name}` (e.g., `Ivory Glass`) · `Cancel` · `Apply`
* **One-time helper caption (shown once above swatches, fades after first tap):** `Tap a theme to preview your pages. Press Apply when ready.`
* **Hub Layout Cards:** `{Couple's Real Cover Photo}` + `{Layout Name}` + `In use` (or `Tap to design`)

---

