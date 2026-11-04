/**
 * PicGrades OS — Google Apps Script backend (Step 1: base).
 *
 * Bound to the "PicGrades OS" Google Sheet (Extensions → Apps Script).
 * Deployed as a Web App; the Vercel frontend calls it with
 *   GET  ?action=health
 *   POST body (text/plain JSON): {"action": "...", ...}
 * text/plain is used on purpose so browsers do not send a CORS preflight.
 *
 * Step 1 provides: sheet helpers, settings loader, router, health check.
 * Later steps add actions to ROUTES (login, orders, payments, editor).
 */

var TABS = ['Settings', 'Companies', 'Orders', 'Payments', 'CreditLog', 'Packages', 'Users', 'Sessions', 'EmailLog'];

// ---------- Web entry points ----------

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'health';
  return respond_(route_(action, e ? e.parameter : {}));
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return respond_({ ok: false, error: 'Bad JSON' });
  }
  return respond_(route_(body.action, body));
}

// action name → handler(params) returning a plain object
var ROUTES = {
  health: health_
};

function route_(action, params) {
  var fn = ROUTES[action];
  if (!fn) return { ok: false, error: 'Unknown action: ' + action };
  try {
    var out = fn(params || {});
    out.ok = out.ok !== false;
    return out;
  } catch (err) {
    console.error(action, err && err.stack);
    return { ok: false, error: String(err && err.message || err) };
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Actions ----------

function health_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var counts = {};
  var missing = [];
  TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) { missing.push(name); return; }
    counts[name] = Math.max(0, sh.getLastRow() - 1);
  });
  return {
    ok: missing.length === 0,
    service: 'picgrades-os',
    time: new Date().toISOString(),
    rows: counts,
    missingTabs: missing,
    settings: getSettings_()
  };
}

// ---------- Sheet helpers (used by all later steps) ----------

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing tab: ' + name);
  return sh;
}

/** All rows of a tab as objects keyed by the header row. Adds _row (sheet row number). */
function readTable_(name) {
  var values = sheet_(name).getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0];
  var out = [];
  for (var r = 1; r < values.length; r++) {
    var obj = { _row: r + 1 };
    var empty = true;
    for (var c = 0; c < head.length; c++) {
      if (!head[c]) continue;
      obj[head[c]] = values[r][c];
      if (values[r][c] !== '' && values[r][c] !== null) empty = false;
    }
    if (!empty) out.push(obj);
  }
  return out;
}

/** Append one object as a row, matching columns by header name. */
function appendRow_(name, obj) {
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
}

/** Update the first row where keyCol === keyVal with the fields in patch. Returns true if found. */
function updateRow_(name, keyCol, keyVal, patch) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var head = values[0];
  var k = head.indexOf(keyCol);
  if (k < 0) throw new Error('No column ' + keyCol + ' in ' + name);
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][k]) === String(keyVal)) {
      Object.keys(patch).forEach(function (f) {
        var c = head.indexOf(f);
        if (c >= 0) sh.getRange(r + 1, c + 1).setValue(patch[f]);
      });
      return true;
    }
  }
  return false;
}

/** Settings tab (key | value | note) → { key: value }. */
function getSettings_() {
  var out = {};
  readTable_('Settings').forEach(function (row) { out[row.key] = row.value; });
  return out;
}

/** Run once from the editor after importing: checks every tab and header exists. */
function setupCheck() {
  var res = health_();
  Logger.log(JSON.stringify(res, null, 2));
  if (res.missingTabs.length) throw new Error('Missing tabs: ' + res.missingTabs.join(', '));
}
