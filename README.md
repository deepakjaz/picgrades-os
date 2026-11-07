# PicGrades OS

Order system for PicGrades: clients order editing, see their image balance and deliveries; admin records payments, runs the order queue and the editor hand-off.

```
Vercel (index.html + app)  ──►  Google Apps Script Web App  ──►  Google Sheet "PicGrades OS"
```

## Folders

| Path | What |
| --- | --- |
| `apps-script/Code.gs` | Backend. Paste into the Sheet's Apps Script editor. |
| `tools/build_db.py` | Builds the database workbook from a Wix export. Re-run any time the Wix data changes. |
| `app/gallery.html` | The wedding gallery app (Hub, Gallery, Root Moment, Find me, guests, uploads). Edit this file directly — it is the source (the old generator script was retired in step 14). |
| `app/reel.js`, `app/post.js`, `app/stickers.js` | Reel maker, Post / Album maker, flower & wedding drawings. |
| `app/faces.html`, `app/faces-core.js` | Studio page that reads faces for Find me. Matching of a guest's selfie happens on the server (`findFaces`). |
| `api/stream.js`, `api/manifest.js` | Vercel functions: guest video streaming (only approved videos of that gallery), per-wedding app manifest. |

## Sheet tabs

| Tab | Holds |
| --- | --- |
| Settings | Rules as editable values (speed multipliers, low-quota warning, sample quota, bonus credits, emails) |
| Companies | One row per studio: package, currency, rates, total / used quota, culled, credits |
| Orders | Every order (Wix history + new ones), with quota used, LR link, source |
| Payments | Every payment received (cash / deposit / UPI) → images added = amount ÷ rate |
| CreditLog | Bonus credits added / used |
| Packages | Plan codes and editing options |
| Users | Login emails, role (client / admin), status |
| Sessions | Login codes and sessions (managed by the app) |
| EmailLog | Every email the system sends |

Balance = totalQuota − usedQuota. Amount due = images over quota × perImageRate + culled images × cullingRate (same rule as Wix).

## Step 1 setup (one time)

1. Upload `PicGrades_OS_Database.xlsx` to Google Drive → open it → **File › Save as Google Sheets**. Rename it **PicGrades OS**.
2. In that sheet: **Extensions › Apps Script**. Delete the sample code, paste all of `apps-script/Code.gs`, save.
3. Select the function **setupCheck** → **Run** → allow the permissions. The log should show every tab with its row count.
4. **Deploy › New deployment › Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and copy the Web app URL.
5. Open `<Web app URL>?action=health` in the browser. You should see `"ok":true` and the row counts.

## Re-importing after Wix corrections

1. Export again from Wix (Claude does this through the Wix connection).
2. `python3 tools/build_db.py <export-folder> PicGrades_OS_Database.xlsx`
3. In the Google Sheet, replace the Companies, Orders, CreditLog, Packages and Users tabs with the new ones (File › Import › Replace current sheet, per tab). Keep Payments, Sessions, EmailLog.

## Nightly clean-up (one time)

In Apps Script select **setupNightly** → **Run**. Every night around 3 am `nightlyCleanup` then:

- removes old login codes and expired sessions,
- deletes guest uploads the couple hid, 7 days after hiding,
- removes guest phone numbers 6 months after the wedding date,
- removes face data (Find me) 12 months after the wedding date.

Photos, posts, albums, approved moments, names and notes are never deleted.

## Tests

`npm install && npx playwright install chromium`, then `npm test` (all tests) or `npm run test:quick` (backend only).
They run on GitHub for every pull request too (`.github/workflows/tests.yml`). The test database `tests/fixtures/db.json`
is made by `tools/make_test_db.py` with every client detail replaced by made-up ones.
