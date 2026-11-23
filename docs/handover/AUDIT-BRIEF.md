# Audit brief — current state of the app (before any new work)

Deepak wants three separate audits of the app **as it is now**: one by Claude, one by ChatGPT, one by Gemini. The weekly plan (`WEEK-PLAN.md`) waits until all three are in.
**Do not change any code in this audit.** Report only.

## What Deepak noticed (start here)

- **The editor tools cover the layout.** In the Hub editors and in Post Edits (album), the tool panels and sheets lie on top of the template. You can't see what you're editing.
  - Good apps (Instagram Edits, Canva, CapCut) never hide the design behind the tools: the design moves up or shrinks, or the tools stay small at the bottom.
- **Some templates show no preview while editing.** For example, with Living Story the editor opens and you have no idea how the template looks.
- More things are not correct. Find them.

## What to check

1. **Overlay.** Open every editor and tool sheet on a phone (390 × 844) and a laptop (1280 × 800):
   - the free editor,
   - the template editor,
   - the card editor,
   - Post Edits (post and album, every tool),
   - Reel Edits (every sheet),
   - the Control Panel sheets,
   - the framing sheet.

   For each one, answer: **can you still see the thing you are editing?** How much is hidden, and by what?
2. **Preview.** For every layout in the layout picker: when you tap Design, do you see the layout itself, or only a list or panel?
3. **Broken.** Buttons that do nothing, errors, things that don't save, text that overflows or gets cut, dark mode problems.
4. **Incomplete.** Features that are half-done compared with `docs/handover/BACKLOG.md`.
5. **Distractions.** Anything that sits on top of the content and doesn't need to: badges, floating buttons, hints that never go away, two bars where one is enough.

## How to look

- **Live app:** Deepak gives you the demo wedding link.
- **Local, with made-up photos:**
  - run `npm install && npx playwright install chromium`,
  - then `node tools/audit/overlay-audit.js`.
  - It opens every editor on phone and laptop, saves screenshots in `/tmp/audit/`, and writes `/tmp/audit/overlay.json` with **how much of the preview stays visible** and what covers it. You can add more cases to that file.

## Report format (use exactly this — Claude merges the three reports)

One table per area. One row per problem.

| # | Where (page → editor → tool) | Screen (phone / laptop / both) | What is wrong (one line) | How bad (1 = blocks work, 2 = annoying, 3 = small) | Fix idea (one line) |
|---|---|---|---|---|---|

Then, at the end:
- **Top 5** — the five things to fix first, in order.
- **Your fix pattern for the overlay** — one rule that every editor should follow, for example: "the design always stays fully visible above a bottom tool bar no taller than 35 % of the screen; sheets open as a short drawer and the design shrinks to fit above it". Add a small sketch if it helps.
- **Max 3 extra ideas** (not fixes).

## Rules for the auditors

- **Report, don't fix.** No PRs in this audit.
- No style nitpicks. Every row must be something a couple, guest or photographer would actually notice.
- Plain English, short lines; Deepak reads this.
- Made-up photos only in screenshots (see `AGENTS.md`).

## Copy-paste prompt (for ChatGPT and for Gemini)

```
Read AGENTS.md and docs/handover/AUDIT-BRIEF.md in repo deepakjaz/picgrades-os (branch handover-ai-team).
Do the audit exactly as the brief says. Don't change any code. Answer in the report format of the brief:
tables, then Top 5, then your fix pattern for the overlay, then max 3 ideas. Plain English, short lines.
```
