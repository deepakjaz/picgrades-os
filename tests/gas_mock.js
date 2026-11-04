// Minimal Apps Script mock over the exported workbook, for local testing only.
const fs = require('fs'); const crypto = require('crypto');
const DB = JSON.parse(fs.readFileSync(process.env.DB || '/tmp/db.json'));
const mail = [];
function sheet(name) { const v = DB[name]; return {
  getLastRow: () => v.length, getLastColumn: () => v[0].length,
  getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }),
  getRange: (r, c, nr, nc) => ({ getValues: () => [v[r - 1].slice(c - 1, c - 1 + (nc || 1))], setValue: x => { while (v[r - 1].length < c) v[r - 1].push(''); v[r - 1][c - 1] = x; } }),
  appendRow: row => v.push(row) }; }
const pad = n => String(n).padStart(2, '0');
global.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: n => DB[n] ? sheet(n) : null }) };
global.ContentService = { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } };
global.Logger = { log: () => {} };
global.Session = { getScriptTimeZone: () => 'Asia/Kolkata' };
// Treat sheet times as UTC+5:30
global.Utilities = {
  getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 'sha256' },
  computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(b => b > 127 ? b - 256 : b),
  formatDate: (d) => { const x = new Date(d.getTime() + 330 * 60000); return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())} ${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}:${pad(x.getUTCSeconds())}`; },
  parseDate: (s) => new Date(s.replace(' ', 'T') + '+05:30')
};
const props = {}; global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; } }) };
global.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
global.MailApp = { sendEmail: m => mail.push(m) };
global.console = console;
eval(fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8') + '\n;global.__route=route_;');
module.exports = { call: (action, p) => JSON.parse(doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, p || {})) } }).s), DB, mail };
