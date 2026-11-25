# Plan card — Access links, Dashboard, How-to guide, Journey

Status: **PLAN — waiting for Deepak's approval. Nothing here is built yet.**
Written: 2026-11-25 (from the discussion of 24–25 Nov). Builder: **Claude** (core + security work), after the weekly reset (Sat 28 Nov).
Gemini helps with scripts / storyboards; ChatGPT does not touch this (it changes access rules and the backend).

---

## 0. Why

Deepak (25 Nov): when we give the app to everyone, guests need to see and use it, and it must **stay forever** for family and friends —
"generate a code and then they are able to use it after the trial … family and friend link will not have find me restriction …
we have to share the permission rights with couples and photographers so that they can manage whom they wish".
And: "one code can be access to 50 people — this way we don't have to cross the email limit for a single user".

---

## 1. Who sees what (decided)

There are only **two kinds of people**, plus the owners.

| | **Guest** (the plain wedding link) | **Invited** (a link the couple / photographer creates) | **Couple · Photographer · PicGrades** |
|---|---|---|---|
| **Sees** | Their own photos (after Find me) + **15 highlights per event** + the wedding highlight | **All photos** — no Find me restriction | Everything |
| **Reels · Posts · Albums** | ✅ from their own photos (after Find me) | ✅ from **any** photo | ✅ |
| **Download** | ✅ their own photos | ✅ / ❌ — **one tick box per link** | ✅ full rights |
| **Moments** | Only after the couple approves | Only after the couple approves | They approve. **No one posts directly** in the couple's / photographer's Hub — not even PicGrades |

- Family and Friends are **the same rights**. The name of a link is only for the couple to understand it
  ("it can be family or it can be friend or unknown — that's their lookout").
- Download quality: **the current file** (no separate high / low quality for now).

## 2. Trial vs a bought year (decided)

- **During the trial:** the table above.
- **After the trial:** everyone (guests and invited links) sees **only the highlights** of each event. No reels, posts or albums.
- **If the couple buys a year:** guests and invited links see **everything** for that year.

## 3. Access links (decided)

- The couple **and** the photographer can create links.
- Each link has: a **name** (any name), a **size** — **10 / 25 / 50 / 100** people (never 1 or 2), and **Download ✅/❌**.
- Whoever receives the link can pass it on — that is their choice. When it is full, the couple makes a new one.
- A wedding of 1000 guests (rare) = several links, in batches of 50 or 100.
- **Copy link** · **QR code** (for the venue or the invitation card) · **Turn off** (if it leaks) · **+ New link**.
- The access is **inside the link** (`/g/<wedding>?k=<code>`) — one tap, no typing. Someone without the link can still type the code.
- New phone: open **the same link** again → back in. Couple / photographer: **sign in** → all their settings come back
  (they are saved on the server and the couple's own Google Sheet, not on the phone).

### Screen: "Who can see" (in the Control Panel)
```
Who can see
  Family            18 of 50    Download ✅   [Copy] [QR] [Turn off]
  College friends    7 of 25    Download ❌   [Copy] [QR] [Turn off]
  + New link   (name · size 10/25/50/100 · download on/off)
```

### Backend (Code.gs) — to design carefully, then send as a file + PR (Deepak deploys)
- New sheet tab **Links**: wedding, code, name, size, used, download, on/off, made by, made on.
- `makeLink` / `listLinks` / `setLink` (couple, photographer, PicGrades only).
- `joinLink(code)` → counts the phone once (a random id kept on the phone), refuses when full or turned off,
  returns the rights (all photos / download).
- `getGallery` / photo lists respect the rights (guest: own + highlights; invited: all; after trial: highlights only).
- No change to real wedding folder permissions on Drive. Security rules in AGENTS.md stay.

---

## 4. Dashboard (decided: **its own screen** + **a glance strip on the Hub**)

Deepak: "the Dashboard sounds like a privilege … if we use the Control Panel screen that will put the controls below,
which will again lead to too much scrolling … like iPhone or Android Settings, the Dashboard is placed on top to get the overview …
a glance is really a good idea too."

### 4a. Dashboard — a separate screen (menu → Dashboard), for the couple and the photographer
Overview only — **watching, not changing**. Each block taps through to the right place in the Control Panel.
```
Dashboard
  To do            3 Moments · 2 comments waiting           → Approve
  Today            42 visits · 9 new people                 → Traffic
  Links            Family 18/50 · College friends 7/25      → Who can see
  Live now         Cinema Chapters · Ivory Glass · Dark     → Hub layout
  Functions        Find me ✅ Reels ✅ Posts ✅ At this time ✅ → Functions
  Plan             Trial · 6 days left                      → Plan
  (later)          Games · Chat room activity
```

### 4b. Glance strip — on the couple's / photographer's own Hub (guests never see it)
A thin line at the top: **"3 to approve · 42 visits today · Cinema Chapters live"** → tap → the Dashboard.

### Decided (25 Nov)
- An invited link asks for a **name on the first visit** ("Who are you? — Priya, Mama's side") — harmless, and the Dashboard can show names.

---

## 5. How-to videos + Guide (decided direction)

- The function cards on the Hub stay **still** (done — clean-up #9, PR #129).
- Tapping a function **the first time** (Reel, Post, Album, Add a moment) opens a **short how-to video** with **Skip**.
  It shows **once per phone**; afterwards it lives in the **menu → Guide** (walkthroughs) to watch again.
- Videos are made from **real screens of the app** + a voice-over, like the Reel how-to Claude made.
- **Who:** Gemini writes the story / script for each video → Claude captures the app's screens automatically and joins them
  → voice-over by Gemini or a voice tool (Deepak chooses) → Claude builds the player, Skip, once-only, and the Guide menu.
- Voice-over: **English and Hindi** for now (decided 25 Nov).

## 6. The Journey — later (from Deepak's idea, kept as he said it)

A cinematic scroll section for some templates: "an image gets selected from the event → the post-making screen (1–2 steps)
→ it goes to the album — show how the carousel looks scrolling horizontally → those images get selected for the reel —
from one image to a carousel of 10 images, and those 10 images go to a reel, a random template video is made —
this makes a whole journey". Like the "What couples get" screen on the photographer page, using videos while scrolling.
Idea to consider: build it from **the couple's own photos** so it feels personal.
Where it shows: **make it first, then decide** (decided 25 Nov). It is marketing, so it can sit in both places, or one at a time — like an on/off part of the system.

### The "TV" (from TKG Day Cycle TV — Deepak, 25 Nov)
"Like our TKG — whether it becomes a TV and a video plays — the same feature here too", for the photographer, guests / family / friends and couples.
A TV block where the how-to videos, the Journey and other clips play. Which templates and which part of the page it sits in: **decide later**.

---

## 7. Build order (after the reset, one PR each, screenshots before merge)

1. **Access links — backend** (Links sheet, make / list / set / join) + tests. → Code.gs file + PR.
2. **Rights in the app** (guest / invited / owners; trial vs bought year) + tests.
3. **"Who can see" screen** (links list, + New link, Copy, QR, Turn off).
4. **Dashboard screen** + **glance strip**.
5. **How-to player + Guide menu** (with one finished video first — Reel).
6. Videos for Post, Album, Add a moment (Gemini scripts → Claude).
7. **Journey** scroll section (after the videos exist).

## 8. Deepak's answers (25 Nov)
- [x] Name on first visit for invited links: **yes**.
- [x] Voice-over: **English and Hindi**.
- [x] Journey: **make first, decide placement later**; a TKG-style **TV** block to play videos — placement later.
- [ ] This plan, as written — approve.

## 9. Who builds what — the outside-help workflow (Deepak, 25 Nov)

ChatGPT and Gemini **help from outside GitHub**: they write files in their own chat and **do not push**.
Deepak pastes their work here → **Claude checks it tightly against AGENTS.md** ("nothing messy — less, but clean") → Claude fixes or sends it back →
Deepak approves → Claude puts it in a PR with tests → Deepak merges.

| Part | Gemini (design) | ChatGPT (code, outside GitHub) | Claude |
|---|---|---|---|
| "Who can see" screen | HTML mockup (flat v2 style) | — | backend + build |
| Dashboard + glance strip | HTML mockup | screen code from the mockup, on a data contract Claude writes | data + rights + integrate |
| How-to player + Guide menu | look of the player | **`app/gallery/49-guide.js`** on Claude's contract | review, tests, menu hook |
| How-to videos | story + script, **English and Hindi** | — | capture app screens, join video |
| QR code for a link | — | small QR maker, no libraries, with test values | review + tests |
| Journey + TV block | storyboard + TV look | — | build (core template work) |
| Backend (Code.gs), access rights, security | — | — | **Claude only** |

### Claude's check before anything goes in (every file from outside)
1. Follows AGENTS.md: no libraries, no relay, no secrets, no real client photos, plain-English comments, one feature per file.
2. Only the files the card asked for; nothing else touched.
3. Phone 375 / 390 / 430 and laptop 1200, light and dark; text ≥ 11 px; tap areas ≥ 44 px; nothing covers the design.
4. Works with the real app: runs in the test server, `page errors: []`, all existing tests still pass.
5. Clean: no dead code, no copy-paste duplicates, CSS with its own prefix, no `!important` war.
