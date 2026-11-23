# PicGrades OS — everything still open (backlog)

Made 23 Nov 2026 from the whole project chat (Oct–Nov 2026) and checked against the code on `main` (after PR #105).

**Status:**
- **Partly** = some of it is built.
- **Not started**
- **Parked** = Deepak said "later".
- **Check** = Claude is not sure it is finished; someone must check it in the app first.

**Who:**
- **C** = Claude (risky or core).
- **G** = ChatGPT (builder).
- **M** = Gemini (design / raw code).

Done work is not listed. Steps 1–79 are merged: gallery, Hub, Find me, Moments, Reel Edits, Post Edits, Control Panel, links per role, the free editor with phases 1–3, and photo framing.

## A. Hub layouts and the editor (current focus)

| # | Point | Status | Who |
|---|---|---|---|
| A1 | Rebuild the Story layouts (Living Story, Editorial Album, the 8 hidden templates) as free-canvas layouts in the editor, one by one. Keep the old version until Deepak approves. | Not started | M designs the doc → G adds → C checks |
| A2 | Desktop (laptop) versions of every layout | Partly (canvas layouts auto-make a laptop spot) | M |
| A3 | Editor extras 5–8: select several and align; copy between layouts; connect photo collections to elements (like Wix datasets); other pages (Events, Notes, gallery), not only the Hub | Not started | C (5–6 G) |
| A4 | Converted card layouts leave an empty gap when a card is hidden for a guest | Not started | G |
| A5 | Background photos in the editor: drag to frame (today: sliders) | Not started | G |
| A6 | Layouts change every page (Events, Notes, gallery), not only the Hub | Not started | C plans, then G |
| A7 | Venue templates (10) | Parked until Deepak finds free elements | M |
| A8 | Hub vision pieces: video card that keeps streaming, a small pop "make a Reel/Post" after a guest scrolls past their own photo, the wedding timeline (vertical on phone, horizontal on laptop) | Not started | M designs → G |
| A9 | Theme picker like Android: preview every page before applying | Check | G |
| A10 | Event page styles: shapes by event (e.g. wine glass for Cocktail), collage inside an event, comments typed in front of a photo | Not started | M |
| A11 | PicGrades designs a custom Hub for a client on request (a service, no code) | Idea | — |

## B. Collections and the timeline (new: Deepak's 23 Nov vision)

| # | Point | Status | Who |
|---|---|---|---|
| B1 | **Events from photo time.** If a couple has only an export with no event folders, group the photos by the date and time they were taken (from the photo's own data). Example: 500 photos → 4 groups like "Sat morning", "Sat evening", "Sun". The couple just names each group (Haldi, Mehndi…). No AI needed. Photographer folders stay as they are; the couple can hide folders and choose highlights (already built). | Not started | **G this week** (card T1) |
| B2 | **"At this time on the wedding day."** When a guest opens the gallery, match the guest's clock (time of day, not the date) to photo times and show "Right now, on the wedding day, this was happening…" with that moment. An idea to make the gallery feel alive. | Not started | M designs → G (card T2) |
| B3 | Collection export: smart-preview copies (~2048 px / small) into a hidden folder in the customer's own Drive | Parked (old plan used the relay — must be redone without the relay) | C |
| B4 | AI-made collections and highlight pre-picks (paid service) | Parked | C |
| B5 | Data supply chain written in plain words, then automated (photos arrive in a fixed Drive folder order like an order form) | Not started | C |
| B6 | Public highlight flow: couple picks 50 + 15 per event → separate public folder → couple approves | Check (picks are built; the separate public folder is not) | C |

## C. Reel Edits / Post Edits

| # | Point | Status | Who |
|---|---|---|---|
| C1 | Stickers: delete button hidden for stickers in Post Edits (bug) | Check | G (card T3) |
| C2 | Element timing: choose when a text/sticker appears and disappears (timeline control) | Not started | G (card T3) |
| C3 | Crop/resize placed elements | Check | G (card T3) |
| C4 | Pass the wedding's face boxes into Reel Edits so automatic framing keeps faces | Not started (`PGReel.setFaces` exists) | G (card T4) |
| C5 | Several audio layers: one background track plus top layers, fade in/out | Check | C |
| C6 | Better music library (instrumental/upbeat, by theme); licensing later | Not started | Deepak + M |
| C7 | Mix up to 2 templates in one reel; template demos use varied photos | Check | G |
| C8 | Reels for whole events/moments made by Reel Edits | Not started | later |
| C9 | Print albums (today Instagram sizes only) | Parked | — |

## D. Guests, privacy and access

| # | Point | Status | Who |
|---|---|---|---|
| D1 | Email OTP for guests | Check | C |
| D2 | Phone OTP, WhatsApp/Meta "send us a message" verify, push notifications, authenticator | Parked | C |
| D3 | Live check in Find me (blink / turn head) — "a must" | Check (only a trace in code) | C |
| D4 | Close match with fewer than 3 photos → "needs approval" with email/WhatsApp link | Check | C |
| D5 | Guest asks the couple for other photos by email; the couple approves (download requests) | Partly (route `dlRequests` exists) | Check |
| D6 | Delete guest phone numbers 6 months and face data 12 months after the wedding; hidden uploads after 7 days | Check | C |
| D7 | Two guest levels (verified vs link only); one-time full-wedding link for 5–10 phones | Check | C |

## E. Photographer side and PicGrades' own app

| # | Point | Status | Who |
|---|---|---|---|
| E1 | Photographer page: tools shown as moving videos, cinematic explainer with English voice, made in the reel template style | Not started | M |
| E2 | Photographer page shows their Instagram posts in the same grid | Not started | later |
| E3 | Doorway: "Create your wedding gallery" → couple or photographer → demo + tour, ask only "events per year" | Parked | M designs |
| E4 | Guide book, tour and help chat for the Control Panel; then cut the parts that aren't needed | Not started | M (words) + G |
| E5 | PicGrades' own hub site (picgrades.in / .com), black/yellow/white brand, picture-led, promotes the gallery + post-production | Not started | M designs → G |
| E6 | Post-production orders inside the app (Human ₹8, AI+Human ₹7, AI ₹3, After AI ₹3, 150 free sample) | Not started | C |
| E7 | PicGrades' own Control Panel (some parts phone, some big screen) | Partly | C |
| E8 | Questionnaire in the photographer profile for couples (answers shown in the Hub) | Not started | later |

## F. Big modules (after the season / after the core)

| # | Point | Status |
|---|---|---|
| F1 | Games: Mr White first, then a memory game (simple for elders), Mafia, Ludo, poker (Shaadibaazi), Chhupa Chhupi, "Dulhaji" | Not started (old Gemini/ChatGPT games removed) |
| F2 | Chat rooms (family/friends the couple allows) | Not started |
| F3 | Family tree (Ashish & Muskan plan) | Not started |
| F4 | Events people create with RSVP and invitations | Not started |
| F5 | Pre-wedding flow (bride or groom side, how you know them, mascot Q&A, testimonials, surprises) | Parked (Ashish & Muskan showcase) |
| F6 | Video → subtitles → transcript → blog; voice/video stories | Not started |
| F7 | Lifetime journey / "life app" (birthdays, anniversaries) | Vision |

## G. Business and setup (no code yet)

| # | Point | Status |
|---|---|---|
| G1 | Setup automation: sign in with the client's Gmail → Sheet, Apps Script, Vercel made on their account within 24 h | Not started |
| G2 | Domains: couplenames.picgrades.in; customer domains after payment | Not started |
| G3 | 30-day trial, promotion codes per campaign, one bill per customer, pricing | Parked |
| G4 | Play Store / App Store: encryption, compliance, privacy pages | Not started |
| G5 | Moving picgrades.com off Wix (orders/quota data) | Parked |
| G6 | Branch protection: switch "1 approving review" to "tests must pass" so Deepak doesn't need the bypass | Waiting for Deepak's yes |
