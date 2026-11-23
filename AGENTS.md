# AGENTS.md — rules for every AI that works on this repo

Read this whole file before you change anything. ChatGPT (Codex), Gemini and Claude all follow it.
If a task card and this file disagree, this file wins. If something is unclear, write a question in the PR — do not guess.

## 1. What this project is

PicGrades OS = the PicGrades order system + the **wedding gallery app** (a PWA) that couples, guests and photographers use.

- Front end: plain HTML, CSS and JavaScript. **No framework, no build step, no bundler, no TypeScript.**
- Back end: Google Apps Script — one file, `apps-script/Code.gs`, with a Google Sheet as the database.
- Hosting: Vercel, auto-deploy from `main`.
- Photos stay on the customer's own Google Drive. PicGrades never stores wedding photos.

## 2. Who does what

- **Deepak** (owner) decides. His English is simple; write everything for him in short, plain English.
- **Claude** is the architect. Claude writes the task cards, reviews PRs and does the risky parts.
- **ChatGPT** builds. It turns a task card (and Gemini's design or raw code) into code in this repo's format and opens a PR.
- **Gemini** designs. It gives screens, layouts, motion ideas and raw code samples. Code that Gemini writes in the repo follows these same rules.

**Stay inside the task card.** Do only what the card asks.
- Better ideas go in the PR under **Suggestions**, at most 3. Do not build them.
- Do not refactor, rename or "clean up" code the card does not mention.
- Do not report style nitpicks. Report a problem only if it does one of these:
  - breaks a test,
  - breaks a rule in this file,
  - stops the card's **Done when** list from being true.

## 3. Hard rules (never break these)

1. **No relay.** Do not add relay functionality, relay dependencies, relay configuration or new relay code anywhere. Do not touch Cloudflare.
2. **No real client photos** (for example Oshin & Vedant) in the repo, in tests or in screenshots you post. Never send client photos to any outside service. Tests use the made-up fixtures in `tests/`.
3. Do not change Drive folder permissions, publish real client photos, rotate secrets or change production settings. Repo settings and branch protection count too. Write a proposal in the PR instead.
4. **Do not remove features or rewrite working parts.** We are redesigning the app, not replacing what it does. Touch a working file only where the card says.
5. **No secrets** in code, tests, PRs or this file.
6. **No new libraries** in the app (no npm packages in `app/`, no CDN scripts). Fonts come from the local list in `app/gallery/34-canvas.js` (`FONTS`). Canva stock elements never go into the app. Images made with Canva AI, Gemini or ChatGPT are fine.
7. **Never push to `main` and never merge.** Open a PR; Deepak merges.
8. Data rules: guest reels and uploaded music are never stored. Posts, albums and moments are permanent. Keep only the data that is needed.

## 4. Where things are

| Path | What it is |
|---|---|
| `app/gallery.html` | The gallery app page. Loads every `app/gallery/NN-name.js` with a `<script>` tag, in number order. |
| `app/gallery/NN-name.js` | One feature per file, each wrapped in `(function () { … })();`. It shares through `window.PGSomething`. |
| `app/gallery/01-core.js` | Shared helpers: `pgApi(route, body)` (calls the backend), `pgImg(id, width)` (photo URL), `pgEsc(text)` (safe HTML), `GALLERY` (this wedding's data). |
| `app/gallery/15-layout.js` | Hub layouts: grid cards, Story layouts, `PGLayout`. |
| `app/gallery/17-control.js` | Control Panel. `ROLE` is `guest` / `couple` / `photographer` / `picgrades` / `demo`. |
| `app/gallery/34-canvas.js` | Free-canvas layout renderer, `PGCanvas`. |
| `app/gallery/35-canvas-editor.js` | The drag-and-drop Hub editor, `PGCanvasEditor`. |
| `app/gallery/47-frame.js` | Frame a photo inside its holder, `PGFrame`. |
| `app/gallery/gallery.css` | All gallery styles. Add new rules at the end, after a `/* step NN: what */` comment. |
| `app/reel.js`, `app/post.js` | Reel Edits and Post Edits. |
| `app/themes/layouts.json` | The list of Hub layouts. Free-canvas layouts sit in `group: "canvas"` with a `canvas` doc. |
| `apps-script/Code.gs` | The backend. Every route is listed in the `route_` table near the top. |
| `tests/` | `*.test.js` = backend tests run with `gas_mock.js`. `e2e_*.js` = browser tests with Playwright. |

## 5. How to write code here

- **A new feature is a new file.** Use the next free number: `app/gallery/48-name.js`. Add its `<script>` tag in `app/gallery.html` after the last one.
- **Comments are plain English** that Deepak can read. Start each file with 2–4 lines on what it does, for whom, and the step number.
- **CSS class names** get a short prefix for the feature (`pce-`, `pgc-`, `pgfr-`, …). Never style bare tags globally.
- **Backend:**
  - Add a route to the `route_` table.
  - Check and clean every value that comes in: clamp numbers, allow-list keys, strip HTML.
  - Check the caller's role (couple key, staff token) the same way nearby routes do.
  - Return `{ ok: false, error: 'plain sentence' }` on failure.
  - If you change `Code.gs`, say **"Backend changed — paste Code.gs and deploy"** at the top of the PR.
- **Screens:**
  - Every screen works on phone (design width **390**) and laptop (**1200**). Screens 700 px and wider use the laptop design.
  - Tap targets are at least 44 px.
  - Light and dark mode both work.
- **Editor layout rule** (every editor: Hub editors, template editor, Post Edits, Reel Edits, Control Panel previews, and any new editor). The design you edit is **never covered by a tool**.
  - **Phone:**
    - The design sits in a "stage" at the top. It shrinks to fit and stays fully visible.
    - Tools live in a bottom drawer:
      - closed = one row of tool icons (about 64 px);
      - open = at most **40 %** of the screen height.
    - Opening a tool makes the stage smaller; it never covers it.
    - The selected item scrolls into view above the drawer.
    - Option lists (templates, stickers, fonts, photos) are one row of small thumbnails, not a full-screen grid.
  - **Laptop (≥ 700 px):** the stage on the left, the tools in a fixed right panel (about 360 px). Nothing floats over the stage.
  - **Full-screen editors:** inside them, hide the app's bottom bar, role badges and floating buttons.
  - **Top bar:** the same in every editor: ‹ back on the left, Undo/Redo, one main button on the right (Save / Apply / Next). Everything fits on one row.
  - **Help text** shows once, then goes.
  - **Check:** `node tools/audit/overlay-audit.js --only=<editor>` must show **design visible ≥ 85 %** for your editor on phone and laptop. Photo pickers are the only exception.
- **Words on screen:**
  - Short, plain English, sentence case.
  - No photo/collection counts in the guest or couple interface (counts live only in the Control Panel).
  - No "coming soon" placeholders.
- **Motion:**
  - Each motion must serve the element's purpose. An element may have no motion at all.
  - Glow or shine plays once, then stops.
  - No scroll-jacking. Do not reuse the "opening doors" reveal.
  - Respect `prefers-reduced-motion`.
- **Layouts** never assume event names (Haldi, Sangeet, …). A wedding may have one event or twenty. Content standard: each event shows 15–30 photos; the whole-wedding highlight is at least 50.

## 6. Tests (must pass before a PR)

```
npm install && npx playwright install chromium
npm run test:quick    # backend tests, about 1 minute
npm test              # everything, about 35 minutes — the PR must pass this (GitHub runs it on every PR)
```

- Every new feature gets a test.
  - A backend change gets a `tests/stepNN.test.js`.
  - A screen change gets a check added to the nearest `e2e_*.js`, or a new `e2e_name.js`.
- A browser test must end by printing `page errors: []`. Copy the start of `tests/e2e_canvas_editor.js` for the set-up: test server, `gas_mock`, made-up photos, `fonts_local`.
- Each browser test listens on its own port. Use a free one from **8900–8999**.
- Never weaken or delete an existing test to make it pass. If an old test is truly wrong because the card changed the behaviour, change only that check and explain why in the PR.

## 7. Pull requests

- One task card = one branch = one PR. Branch name: `step-NN-short-name` (NN from the card).
- Keep PRs small. If a card turns out to be bigger than one day, stop and ask in the PR.
- PR description, in this order:
  1. **What changed** — 3–6 bullets in plain English.
  2. **How Deepak checks it** — steps on his phone, for example: "Open the couple link → Control Panel → Events → …".
  3. **Backend changed?** Yes/No. If yes: paste `Code.gs` and deploy.
  4. **Tests** — which tests were added, and the result of `npm test`.
  5. **Screenshots** — phone and laptop, with made-up photos only.
  6. **Not done / questions.**
  7. **Suggestions** (at most 3, not built).

## Review guidelines

Use this list when you review a PR (ChatGPT/Codex review, Gemini Code Assist and Claude). Report only these:

- Any relay or Cloudflare code, real client photos, secrets, or new libraries in `app/`.
- A feature or test that was removed, or an existing test that was weakened.
- Something outside the task card was changed.
- A backend route that trusts input without cleaning it, or skips the role check.
- An editor or sheet that covers the design (breaks the Editor layout rule; check with `tools/audit/overlay-audit.js`).
- A screen that breaks at 390 px or 1200 px, has text that overflows or gets cut, or doesn't work in dark mode.
- A browser test without `page errors: []`, or one that reuses another test's port.
- A missing "Backend changed" line when `Code.gs` changed.
