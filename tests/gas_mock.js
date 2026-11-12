// Minimal Apps Script mock over the exported workbook, for local testing only.
const fs = require('fs'); const crypto = require('crypto');
const DB = JSON.parse(fs.readFileSync(process.env.DB || (__dirname + '/fixtures/db.json')));
const mail = [];
function sheet(name) { const v = DB[name]; return {
  getLastRow: () => v.length, getLastColumn: () => v[0].length,
  getDataRange: () => ({ getValues: () => v.map(r => r.slice()) }),
  getRange: (r, c, nr, nc) => ({ getValues: () => v.slice(r - 1, r - 1 + (nr || 1)).map(row => row.slice(c - 1, c - 1 + (nc || 1))), setValue: x => { while (v[r - 1].length < c) v[r - 1].push(''); v[r - 1][c - 1] = x; },
    clearContent: () => { v.splice(r - 1, nr || 1); },                                     // mock: clearing rows at the end removes them
    setValues: rows => { rows.forEach((row, k) => { v[r - 1 + k] = row.slice(); }); } }),
  appendRow: row => v.push(row) }; }
const pad = n => String(n).padStart(2, '0');
global.SpreadsheetApp = { getActiveSpreadsheet: () => ({ getSheetByName: n => DB[n] ? sheet(n) : null, insertSheet: n => { DB[n] = [['']]; const sh = sheet(n); sh.getRange = (r, c, nr, nc) => ({ setValues: v => { DB[n][0] = v[0].slice(); }, getValues: () => [DB[n][r - 1].slice(c - 1, c - 1 + (nc || 1))], setValue: x => { DB[n][r - 1][c - 1] = x; } }); return sh; } }) };
// Fake Google Drive: folders/files kept in memory. DRIVE.folders[id] = {name, access, parent, trashed}
const DRIVE = { folders: {}, files: {}, n: 0 };
function iter(a) { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; }
function fileObj(id) { const f = DRIVE.files[id]; return { getId: () => id, getName: () => f.name, getMimeType: () => f.mime, isTrashed: () => !!f.trashed, setTrashed: t => { f.trashed = !!t; },
  setContent: c => { f.content = c; }, getThumbnail: () => ({ getContentType: () => 'image/png', getBytes: () => [137, 80, 78, 71] }), getBlob: () => ({ getDataAsString: () => f.content, getBytes: () => f.bytes || [] }),
  setSharing: (a, b) => { f.sharing = a + ':' + b; } }; }
function folderObj(id) { const f = DRIVE.folders[id]; if (!f) throw new Error('No item with the given ID could be found'); return {
  getId: () => id, getName: () => f.name, isTrashed: () => !!f.trashed, getSharingAccess: () => f.access || 'PRIVATE',
  getFolders: () => iter(Object.keys(DRIVE.folders).filter(k => DRIVE.folders[k].parent === id).map(folderObj)),
  getFiles: () => iter(Object.keys(DRIVE.files).filter(k => DRIVE.files[k].parent === id).map(fileObj)),
  createFile: (name, content, mime) => { if (f.readOnly) throw new Error('Access denied'); const fid = 'file' + (++DRIVE.n);
    if (name && typeof name === 'object') DRIVE.files[fid] = { name: name.name, mime: name.mime, bytes: name.bytes, parent: id };
    else DRIVE.files[fid] = { name, content, mime, parent: id }; return fileObj(fid); },
  getFoldersByName: n => iter(Object.keys(DRIVE.folders).filter(k => DRIVE.folders[k].parent === id && DRIVE.folders[k].name === n).map(folderObj)),
  createFolder: n => { if (f.readOnly) throw new Error('Access denied'); const nid = 'fold' + (++DRIVE.n); DRIVE.folders[nid] = { name: n, parent: id }; return folderObj(nid); } }; }
global.DriveApp = { Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK', PRIVATE: 'PRIVATE' }, Permission: { VIEW: 'VIEW', NONE: 'NONE' }, getFolderById: folderObj, getFileById: id => { if (!DRIVE.files[id]) throw new Error('not found'); return fileObj(id); },
  createFolder: name => { const id = 'fold' + (++DRIVE.n); DRIVE.folders[id] = { name, parent: 'root' }; return folderObj(id); } };
const CACHE = {}; const cget = k => { const e = CACHE[k]; if (!e) return null; if (e.until < Date.now() + (global.__clockSkip || 0)) { delete CACHE[k]; return null; } return e.v; };
const cput = (k, v, sec) => { CACHE[k] = { v: String(v), until: Date.now() + (global.__clockSkip || 0) + (sec || 600) * 1000 }; };
global.CacheService = { getScriptCache: () => ({ get: cget, put: cput, remove: k => { delete CACHE[k]; },
  getAll: ks => { const o = {}; ks.forEach(k => { const v = cget(k); if (v !== null) o[k] = v; }); return o; }, putAll: (o, sec) => Object.keys(o).forEach(k => cput(k, o[k], sec)) }) };
global.__CACHE = CACHE;
global.ContentService = { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } };
global.Logger = { log: () => {} };
global.Session = { getScriptTimeZone: () => 'Asia/Kolkata' };
// Treat sheet times as UTC+5:30
global.Utilities = {
  getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 'sha256' },
  computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(b => b > 127 ? b - 256 : b),
  formatDate: (d, tz, f) => { const x = new Date(d.getTime() + 330 * 60000);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const t = { yyyy: x.getUTCFullYear(), yy: String(x.getUTCFullYear()).slice(2), MMM: M[x.getUTCMonth()], MM: pad(x.getUTCMonth() + 1), dd: pad(x.getUTCDate()), HH: pad(x.getUTCHours()), mm: pad(x.getUTCMinutes()), ss: pad(x.getUTCSeconds()) };
    return (f || 'yyyy-MM-dd HH:mm:ss').replace(/yyyy|yy|MMM|MM|dd|HH|mm|ss/g, k => t[k]); },
  parseDate: (s) => new Date(s.replace(' ', 'T') + '+05:30'),
  base64Encode: (b) => Buffer.from(b).toString('base64'),
  base64Decode: (s) => Array.from(Buffer.from(s, 'base64')),
  newBlob: (bytes, mime, name) => ({ bytes, mime, name })
};
global.UrlFetchApp = { fetch: (url) => { const id = (/\/d\/([^=]+)/.exec(url) || [])[1]; if (global.__fetchFail) throw new Error('blocked'); return { getResponseCode: () => 200, getBlob: () => ({ getContentType: () => 'image/jpeg', getBytes: () => Array.from(global.__fetchBytes ? global.__fetchBytes(id) : Buffer.from('img:' + id)) }) }; } };
const props = {}; global.PropertiesService = { getScriptProperties: () => ({ getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; } }) };
global.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
global.MailApp = { sendEmail: m => mail.push(m) };
global.ScriptApp = { __t: [], getProjectTriggers() { return this.__t; }, deleteTrigger(t) { this.__t = this.__t.filter(x => x !== t); },
  newTrigger(fn) { const self = this, t = { fn, getHandlerFunction: () => fn }; const b = { timeBased: () => b, everyDays: () => b, atHour: () => b, create: () => { self.__t.push(t); return t; } }; return b; } };
global.Logger = { log: () => {} };
global.console = console;
eval(fs.readFileSync(__dirname + '/../apps-script/Code.gs', 'utf8') + '\n;global.__route=route_;global.__nightly=nightlyCleanup;global.__setupNightly=setupNightly;');
global.__clock = 0; const RealDate = Date;
global.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + global.__clock); } static now() { return RealDate.now() + global.__clock; } };
module.exports = { DRIVE, advance: h => { global.__clock += h * 3600000; }, call: (action, p) => { if (!global.__keepTableCache) Object.keys(CACHE).forEach(k => { if (k.indexOf('tbl:') === 0) delete CACHE[k]; }); return JSON.parse(doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, p || {})) } }).s); }, DB, mail };
