# Gemini's design for T1 (events from photo time) and T2 (at this time on the wedding day), 24 Nov 2026

Read it together with `../GEMINI-REVIEW.md`: Claude's corrections there win.

Here are the design specifications for **Jobs 7 → 8** (`T1` and `T2`), following the same rules, plain-English style, and phone + laptop layouts.

---

## Job 7 — T1 · "Events from photo time" (Control Panel)

### How It Fits the Screen (Phone `390 × 844` & Laptop `1280 × 800`)

* **Phone (`390 × 844`):** Opens as a full-height sheet inside Control Panel with a sticky `52px` top bar (`‹` on left, `Events from photo time` in center), a compact summary strip below it, a scrollable list of time-grouped cards, and a sticky bottom bar (`72px` tall) with a full-width **`Save names`** button.
* **Laptop (`1280 × 800`):** Opens as a centered modal card (`max-width: 780px`, `max-height: 86vh`) or inside the Control Panel sheet with a sticky header (`‹`, `Events from photo time`), a 2-column grid of time-grouped cards on desktop when space allows (or single column for easy scanning), and a pinned **`Save names`** button in the footer.

### Card Layout Inside Each Time Group

* **Top Line:** Day and time range badge/label (`Fri 20 Nov, 9 am – 1 pm`) + photo count (`18 photos`) + optional `Already named` / `Unnamed` indicator.
* **4 Small Photos Strip:** Four square/4:3 thumbnail tiles (`64 × 64px` on phone, `72 × 72px` on laptop) showing sample moments from that time window (`+N more` badge on the 4th tile if more than 4 photos exist).
* **Name Input Box:** Single-line text field (`44px` min height) with placeholder `Name this event (e.g. Haldi)` and a clear `×` button when filled.
* **Quick Name Chips:** Horizontal row (or compact wrap on laptop) of quick-fill pills: `Haldi`, `Mehndi`, `Sangeet`, `Wedding`, `Reception`, `Mayra`, `Cocktail`, `Other`. Tapping a chip fills the name box immediately (and if `Other` is tapped, focuses the text box so the couple/photographer can type a custom name).

### Exact Words (T1)

* **Header:** `‹`, `Events from photo time`
* **Intro / Helper line:** `Grouped by photo time (3+ hour gap or new day). Name each group to create events.`
* **Time example:** `Fri 20 Nov, 9 am – 1 pm`
* **Input placeholder:** `Name this event`
* **Quick chips:** `Haldi`, `Mehndi`, `Sangeet`, `Wedding`, `Reception`, `Mayra`, `Cocktail`, `Other`
* **Primary action:** `Save names` (shows `Saved` confirmation state once saved)

### HTML/CSS Sketch (T1)

```html
<section class="pg-t1-sheet">
  <header class="pg-t1-head">
    <button class="pg-btn-44" aria-label="Back">‹</button>
    <h2>Events from photo time</h2>
  </header>

  <div class="pg-t1-body">
    <p class="pg-t1-sub">Grouped by photo time (3+ hour gap or new day). Name each group to create events.</p>

    <article class="pg-time-group">
      <div class="pg-tg-meta">
        <strong>Fri 20 Nov, 9 am – 1 pm</strong>
        <span>24 photos</span>
      </div>
      <div class="pg-tg-thumbs">
        <img alt="" /><img alt="" /><img alt="" /><img alt="" />
      </div>
      <input type="text" class="pg-tg-input" placeholder="Name this event" />
      <div class="pg-tg-chips">
        <button type="button">Haldi</button>
        <button type="button">Mehndi</button>
        <button type="button">Sangeet</button>
        <button type="button">Wedding</button>
        <button type="button">Reception</button>
        <button type="button">Mayra</button>
        <button type="button">Cocktail</button>
        <button type="button">Other</button>
      </div>
    </article>
  </div>

  <footer class="pg-t1-foot">
    <button type="button" class="pg-save-btn">Save names</button>
  </footer>
</section>

<style>
  .pg-t1-sheet { display: flex; flex-direction: column; height: 100dvh; }
  .pg-t1-head { height: 52px; display: flex; align-items: center; gap: 8px; padding: 0 12px; }
  .pg-btn-44 { min-width: 44px; min-height: 44px; }
  .pg-t1-body { flex: 1; overflow-y: auto; padding: 12px 16px 24px; display: grid; gap: 14px; }
  .pg-tg-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
  .pg-tg-thumbs img { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 8px; }
  .pg-tg-input { width: 100%; min-height: 44px; padding: 0 12px; border-radius: 10px; }
  .pg-tg-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .pg-tg-chips button { min-height: 36px; padding: 0 12px; border-radius: 999px; }
  .pg-t1-foot { padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); }
  .pg-save-btn { width: 100%; min-height: 46px; border-radius: 999px; }
  @media (min-width: 900px) {
    .pg-t1-body { grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: start; }
    .pg-t1-sub { grid-column: 1 / -1; }
  }
</style>

```

---

## Job 8 — T2 · "At this time on the wedding day" (Gallery Moment)

### Option A: Hub Card

* **Phone (`390 × 844`):** Sits inside the Hub/gallery flow as a soft editorial card (`width: 100%`, `padding: 14px`, `border-radius: 16px`) with a top-right `×` close button (`44px` tap target), heading `Right now, on the wedding day…`, a 1–3 photo strip (`aspect-ratio: 4 / 3` or `1 / 1`, capped at 3 photos, never shown when 0 matching photos exist), and a subtle `View photos` / `Open gallery` tap target.
* **Laptop (`1280 × 800`):** Renders at `max-width: 680px` (or inside the top gallery stream) with 2–3 side-by-side photo tiles (`140px` tall), calm `fade` + gentle `6px` `rise` motion that plays **once** when entering view (`once: true`), then stays still.

### Option B: Small Pop (Compact Corner/Bottom Toast Card)

* **Phone (`390 × 844`):** Appears as a lightweight compact card (`max-height: 164px`, `margin: 0 12px 16px`, sitting cleanly above the bottom bar without covering the main gallery grid) with `×` dismiss button, heading `Right now, on the wedding day…`, and 1–3 small square thumbnails (`56 × 56px`) on the right or below.
* **Laptop (`1280 × 800`):** Appears as a small floating card in the bottom-right corner (`width: 340px`, `right: 24px`, `bottom: 24px`) with `×` dismiss button, heading `Right now, on the wedding day…`, and 1–3 small thumbnails (`64 × 64px`), playing a single calm entrance once per visit.

### Which One Is Better and Why?

* **The small pop is better** for this feature:
1. **Matches "a small moment" & "once per visit":** A compact dismissible pop feels like an unexpected memory nudge rather than a permanent block inside the page layout.
2. **Never leaves an empty gap or shifts layout:** Because it only mounts when 1–3 matching photos exist and is dismissed with `×` (or once per visit), it never creates awkward empty space on the page.
3. **Keeps the gallery front and center:** Guests opening the gallery come to browse photos first—a small pop gives the moment without pushing the main grid down.
4. **Couple toggle in Control Panel:** Under Control Panel features/moments, add a simple toggle (`At this time on the wedding day` — `On` / `Off`) so couples can disable it anytime.



### Exact Words (T2 — English & Hindi Option)

| UI Slot | English | Hindi (Option) |
| --- | --- | --- |
| **Heading** | `Right now, on the wedding day…` | `शादी के दिन इस समय…` |
| **Close button (`aria-label`)** | `Close` | `बंद करें` |
| **Action / Cue** | `See moment` | `तस्वीरें देखें` |
| **Control Panel Toggle Title** | `At this time on the wedding day` | `शादी के दिन इस समय` |
| **Control Panel Toggle Subtitle** | `Show guests 1–3 photos from around this time of day` | `मेहमानों को दिन के इस समय की 1–3 तस्वीरें दिखाएँ` |

---

### Suggestions (Not Part of Jobs 7–8)

1. **Auto-Suggest Event Names From Time of Day (T1):** When a group falls in the late morning (`9 am – 1 pm`) or evening (`7 pm – 11 pm`), subtly highlighting or sorting the most likely quick chip (`Haldi` / `Mehndi` vs. `Sangeet` / `Cocktail` / `Reception`) can speed up naming without replacing the text input or all 8 chips.
2. **Showing the Exact Capture Time on Each T2 Photo:** Adding a tiny timestamp pill (e.g., `6:42 PM`) on the 1–3 photos in `Right now, on the wedding day…` makes the `±20 min` connection immediately clear to guests.