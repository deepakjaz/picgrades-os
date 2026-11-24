# iPhone first (decided by Deepak, 24 Nov 2026)

Most guests, and the pilot couple, use iPhones. Deepak tests first on an iPhone 17 Pro. **Way A:** one app, built and checked iPhone-first, with a light mode for Safari. There is no separate iPhone version for now.

## The iPhone sizes every screen must work at
| Phone | Size (CSS px) |
|---|---|
| iPhone SE / mini (smallest) | 375 × 667 |
| iPhone 15/16/17 | 390–393 × 844–852 |
| iPhone Pro Max | 430 × 932 |

Rules (also in AGENTS.md):
- Labels at least **11 px**.
- Buttons at least **44 × 44 px**.
- Nothing wider than the screen (no sideways scrolling).
- Editors keep the design visible (the editor layout rule).

## Card I1 — Safari's engine in the GitHub tests (ChatGPT, small, step 94)
1. In `.github/workflows/tests.yml`:
   - install WebKit too: `npx playwright install --with-deps chromium webkit`;
   - raise `timeout-minutes` from 40 to **60**. The full run already takes about 35 minutes, and one run was cancelled at 40.
2. New test `tests/e2e_iphone.js` (port 8903, set-up copied from `tests/e2e_canvas_editor.js`), using Playwright's **`webkit`** with `isMobile: true, hasTouch: true` at 375×667, 390×844 and 430×932. On each size, open:
   - the Hub (as a guest and as the couple),
   - Events, the gallery, and the photo viewer (swipe),
   - Reel Edits and Post Edits (open only),
   - the free editor with a part selected,
   - the Control Panel.

   Check:
   - no page errors;
   - nothing wider than the screen (`document.documentElement.scrollWidth <= innerWidth + 1`);
   - visible buttons are at least 44 px and visible text at least 11 px (report the worst 5; **warn, don't fail, for now**; Claude decides what to fix);
   - in the free editor, `tools/audit/overlay-audit.js`-style "design visible" is measured and printed.
3. **Done when:** the workflow runs both browsers, the new test passes or prints clear warnings, and nothing else changes.

## Card I2 — "Light mode" for Safari and slower phones (Claude, after Saturday)
- When the phone is an iPhone/Safari, has low memory, asks for less motion, or is on a slow connection, the app adds `pg-lite` to the page. The app then:
  - stops heavy effects: blur and glass filters, parallax, looping motion;
  - plays videos only on tap, or on Wi-Fi;
  - uses smaller pictures (caps the photo width);
  - lets motion play once and stop.
- Measured before and after on the audit tool and on Deepak's iPhone.

## Later (parked)
- A separate iPhone version (like Meta): only if the app grows a lot.
- App Store app: a native shell around the same app (backlog G4).
- **Premium:** new layouts, templates and advanced editing can be marked premium using the existing "locked" feature system. This is decided at the pricing step.
