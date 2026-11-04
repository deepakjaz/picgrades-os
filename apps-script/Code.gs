/**
 * PicGrades OS — Google Apps Script backend.
 *
 * Bound to the "PicGrades OS" Google Sheet (Extensions → Apps Script).
 * Deployed as a Web App; the Vercel frontend calls it with
 *   GET  ?action=health
 *   POST body (text/plain JSON): {"action": "...", ...}
 * text/plain is used on purpose so browsers do not send a CORS preflight.
 *
 * Sections:
 *   1. Entry points + router
 *   2. Health
 *   3. Login (email code) + sessions
 *   4. Client: dashboard (me) + place order
 *   5. Order rules (same as the old Wix code)
 *   6. Email
 *   7. Sheet helpers
 */

var TABS = ['Settings', 'Companies', 'Orders', 'Payments', 'CreditLog', 'Packages', 'Users', 'Sessions', 'EmailLog'];
var ALL_OPTIONS = ['Human Touch', 'Human + AI', 'After AI', 'Retouching', 'Culling', 'Culling + Color Correction'];
var SAMPLE_OPTION = 'Sample (Color Correction)';

// =====================================================================
// 1. Entry points + router
// =====================================================================

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

// Public actions (no login needed)
var PUBLIC_ROUTES = {
  health: health_,
  requestCode: requestCode_,
  verifyCode: verifyCode_
};

// Actions that need a logged-in user: handler(params, user)
var USER_ROUTES = {
  logout: logout_,
  me: me_,
  placeOrder: placeOrder_
};

function route_(action, params) {
  params = params || {};
  try {
    var out;
    if (PUBLIC_ROUTES[action]) {
      out = PUBLIC_ROUTES[action](params);
    } else if (USER_ROUTES[action]) {
      var user = authUser_(params.token);
      if (!user) return { ok: false, error: 'Please log in again.', code: 'AUTH' };
      out = USER_ROUTES[action](params, user);
    } else {
      return { ok: false, error: 'Unknown action: ' + action };
    }
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

// =====================================================================
// 2. Health
// =====================================================================

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
    version: 'step2',
    time: new Date().toISOString(),
    rows: counts,
    missingTabs: missing,
    settings: getSettings_()
  };
}

/** Run once from the editor after importing: checks every tab exists. */
function setupCheck() {
  var res = health_();
  Logger.log(JSON.stringify(res, null, 2));
  if (res.missingTabs.length) throw new Error('Missing tabs: ' + res.missingTabs.join(', '));
}

// =====================================================================
// 3. Login (email code) + sessions
// =====================================================================

function requestCode_(p) {
  var email = normEmail_(p.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' };
  var user = findUser_(email);
  // Same answer whether or not the email exists, so nobody can test which emails are clients.
  var generic = { sent: true, message: 'If this email has a PicGrades account, a 6-digit code is on its way.' };
  if (!user || user.status !== 'Active') return generic;

  var s = getSettings_();
  var now = new Date();
  var recent = readTable_('Sessions').filter(function (r) {
    return r.type === 'otp' && r.email === email && (now - parseDate_(r.createdAt)) < 3600 * 1000;
  });
  if (recent.length >= 5) return { ok: false, error: 'Too many codes requested. Try again in an hour.' };

  var code = String(Math.floor(100000 + Math.random() * 900000));
  appendRow_('Sessions', {
    token: Utilities.getUuid(), email: email, type: 'otp', codeHash: hash_(email + ':' + code),
    createdAt: fmt_(now), expiresAt: fmt_(new Date(now.getTime() + Number(s.otpMinutes || 10) * 60000)), used: 0
  });
  sendEmail_(email, 'Your PicGrades login code: ' + code, 'Login code',
    ['Your login code is:', '<b style="font-size:28px;letter-spacing:6px">' + code + '</b>',
     'It works for ' + (s.otpMinutes || 10) + ' minutes. If you did not ask for it, ignore this email.'],
    'otp', '');
  return generic;
}

function verifyCode_(p) {
  var email = normEmail_(p.email);
  var code = String(p.code || '').replace(/\D/g, '');
  var now = new Date();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // "used" on a code row: 0 = fresh, -1..-4 = wrong tries so far, 1 = used up.
    var rows = readTable_('Sessions').filter(function (r) {
      return r.type === 'otp' && r.email === email && Number(r.used || 0) <= 0 && parseDate_(r.expiresAt) > now;
    });
    var last = rows[rows.length - 1];
    if (!last) return { ok: false, error: 'Code expired. Ask for a new one.' };
    if (last.codeHash !== hash_(email + ':' + code)) {
      var wrong = -Number(last.used || 0) + 1;
      updateRowByNumber_('Sessions', last._row, { used: wrong >= 5 ? 1 : -wrong });
      return { ok: false, error: wrong >= 5 ? 'Too many wrong tries. Ask for a new code.' : 'Wrong code.' };
    }
    updateRowByNumber_('Sessions', last._row, { used: 1 });
    var user = findUser_(email);
    if (!user || user.status !== 'Active') return { ok: false, error: 'This account is not active.' };
    var s = getSettings_();
    var token = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
    appendRow_('Sessions', {
      token: token, email: email, type: 'session', codeHash: '', createdAt: fmt_(now),
      expiresAt: fmt_(new Date(now.getTime() + Number(s.sessionDays || 30) * 86400000)), used: 0
    });
    return { token: token, user: publicUser_(user) };
  } finally {
    lock.releaseLock();
  }
}

function logout_(p) {
  var row = readTable_('Sessions').filter(function (r) { return r.type === 'session' && r.token === p.token; })[0];
  if (row) updateRowByNumber_('Sessions', row._row, { used: 1 });
  return { loggedOut: true };
}

/** Token → user row (or null). */
function authUser_(token) {
  if (!token) return null;
  var now = new Date();
  var row = readTable_('Sessions').filter(function (r) {
    return r.type === 'session' && r.token === token && !Number(r.used) && parseDate_(r.expiresAt) > now;
  })[0];
  if (!row) return null;
  var user = findUser_(row.email);
  return user && user.status === 'Active' ? user : null;
}

function findUser_(email) {
  email = normEmail_(email);
  return readTable_('Users').filter(function (u) { return normEmail_(u.email) === email; })[0] || null;
}

function publicUser_(u) {
  return { email: normEmail_(u.email), name: u.name, companyName: u.companyName, role: u.role };
}

function hash_(s) {
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty('SALT');
  if (!salt) { salt = Utilities.getUuid(); props.setProperty('SALT', salt); }
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + s);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

// =====================================================================
// 4. Client: dashboard (me) + place order
// =====================================================================

function me_(p, user) {
  var s = getSettings_();
  var company = findCompany_(user.companyName);
  var orders = companyOrders_(user.companyName).slice(0, 50).map(publicOrder_);
  var out = { user: publicUser_(user), company: null, orders: orders, rules: publicRules_(s) };
  if (company) {
    out.company = publicCompany_(company, s);
    out.orderForm = orderForm_(company, s);
  }
  return out;
}

function placeOrder_(p, user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var s = getSettings_();
    var company = findCompany_(user.companyName);
    if (!company) return { ok: false, error: 'No company account found. Please contact PicGrades.' };
    var form = orderForm_(company, s);
    if (!form.canOrder) return { ok: false, error: form.blockedReason };

    var o = p.order || {};
    var calc = calcOrder_(company, o, s, companyOrders_(company.companyName));
    if (calc.error) return { ok: false, error: calc.error };

    var now = new Date();
    var orderId = nextOrderId_();
    var row = {
      orderId: orderId, placedAt: fmt_(now), deliveryDue: fmt_(calc.deliveryDue), hours: calc.hours,
      status: 'Under Review', companyName: company.companyName, email: normEmail_(user.email), fullName: user.name,
      mobile: String(o.mobile || user.phone || ''), catalogName: calc.catalogName, numberOfImages: calc.images,
      cullingImages: calc.cullingImages, editingOptions: calc.option, bwPercent: calc.bw,
      creditsRedeemed: calc.creditsUsed, quotaUsed: calc.quotaUsed, perImageRate: company.perImageRate,
      cullingRate: company.cullingRate, catalogLink: String(o.catalogLink || '').trim(),
      referenceLinks: String(o.referenceLinks || '').trim(), comments: String(o.comments || '').trim(),
      lrFilesLink: '', completedAt: '', source: 'vercel', wixId: ''
    };
    appendRow_('Orders', row);

    var before = companyNumbers_(company);
    var patch = {
      usedQuota: Number(company.usedQuota || 0) + calc.quotaUsed,
      totalImagesCulled: Number(company.totalImagesCulled || 0) + calc.cullingImages,
      credits: Number(company.credits || 0) - calc.creditsUsed + calc.creditsEarned
    };
    updateRowByNumber_('Companies', company._row, patch);
    if (calc.creditsUsed) appendRow_('CreditLog', { date: fmt_(now), companyName: company.companyName, type: 'DEBITED', points: calc.creditsUsed, title: 'Redeemed on order: ' + calc.catalogName, method: 'AUTOMATIC', relatedWixOrderId: orderId });
    if (calc.creditsEarned) appendRow_('CreditLog', { date: fmt_(now), companyName: company.companyName, type: 'CREDITED', points: calc.creditsEarned, title: 'Bonus credits earned on order: ' + calc.catalogName, method: 'AUTOMATIC', relatedWixOrderId: orderId });

    var after = companyNumbers_(Object.assign({}, company, patch));
    orderEmails_(row, company, before, after, s);
    return { order: publicOrder_(row), company: publicCompany_(Object.assign({}, company, patch), s) };
  } finally {
    lock.releaseLock();
  }
}

function findCompany_(name) {
  var key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  return readTable_('Companies').filter(function (c) { return String(c.companyName).trim().toLowerCase() === key; })[0] || null;
}

function companyOrders_(name) {
  var key = String(name || '').trim().toLowerCase();
  return readTable_('Orders')
    .filter(function (o) { return String(o.companyName).trim().toLowerCase() === key; })
    .sort(function (a, b) { return parseDate_(b.placedAt) - parseDate_(a.placedAt); });
}

function companyNumbers_(c) {
  var total = Number(c.totalQuota || 0), used = Number(c.usedQuota || 0);
  var balance = total - used;
  var over = Math.max(0, -balance);
  var editDue = over * Number(c.perImageRate || 0);
  var cullDue = Number(c.totalImagesCulled || 0) * Number(c.cullingRate || 0);
  return { total: total, used: used, balance: balance, over: over, editDue: round2_(editDue), cullDue: round2_(cullDue), totalDue: round2_(editDue + cullDue) };
}

function publicCompany_(c, s) {
  var n = companyNumbers_(c);
  return {
    companyName: c.companyName, packageType: c.packageType, currency: c.currency || 'INR',
    perImageRate: Number(c.perImageRate || 0), cullingRate: Number(c.cullingRate || 0),
    totalQuota: n.total, usedQuota: n.used, balance: n.balance, overQuota: n.over,
    totalImagesCulled: Number(c.totalImagesCulled || 0),
    editingDue: n.editDue, cullingDue: n.cullDue, totalDue: n.totalDue,
    creditsEnabled: isTrue_(c.creditsEnabled), credits: Number(c.credits || 0),
    lowBalance: n.total > 0 && n.balance >= 0 && n.balance <= Number(s.lowQuotaWarning || 250)
  };
}

function publicOrder_(o) {
  return {
    orderId: o.orderId, placedAt: fmt_(parseDate_(o.placedAt)), deliveryDue: o.deliveryDue ? fmt_(parseDate_(o.deliveryDue)) : '',
    hours: Number(o.hours || 0), status: o.status, catalogName: o.catalogName,
    numberOfImages: Number(o.numberOfImages || 0), cullingImages: Number(o.cullingImages || 0),
    editingOptions: o.editingOptions, quotaUsed: Number(o.quotaUsed || 0), creditsRedeemed: Number(o.creditsRedeemed || 0),
    lrFilesLink: o.lrFilesLink || '', source: o.source
  };
}

function publicRules_(s) {
  return {
    speeds: [96, 72, 48, 24].map(function (h) { return { hours: h, multiplier: Number(s['speedMultiplier.' + h] || 1) }; }),
    cullingOnlyHours: Number(s.cullingOnlyHours || 72), cullingExtraDays: Number(s.cullingExtraDays || 3),
    lowQuotaWarning: Number(s.lowQuotaWarning || 250), sampleQuota: Number(s.sampleQuota || 150),
    creditBonusMinImages: Number(s.creditBonusMinImages || 1500), creditBonusPoints: Number(s.creditBonusPoints || 100)
  };
}

// =====================================================================
// 5. Order rules (same as the old Wix code)
// =====================================================================

/** Which editing options a company may order, and whether ordering is allowed at all. */
function orderForm_(c, s) {
  var pkg = String(c.packageType || '').trim();
  var bal = companyNumbers_(c).balance;
  if (!pkg) return { canOrder: false, blockedReason: 'No active package. Please contact PicGrades.', options: [] };
  if (pkg.toUpperCase().indexOf('EXPIRED') > -1) return { canOrder: false, blockedReason: 'Your package has expired. Please contact PicGrades.', options: [] };
  if (pkg === 'SAMPLE') {
    if (bal <= 0) return { canOrder: false, blockedReason: 'Your free sample images are used up. Contact PicGrades to choose a package.', options: [] };
    return { canOrder: true, options: [SAMPLE_OPTION], maxImages: bal };
  }
  if (pkg === 'CUSTOM') return { canOrder: true, options: ALL_OPTIONS.slice() };
  if (pkg.indexOf('-') > -1) {
    var p = readTable_('Packages').filter(function (x) { return x.planCode === pkg; })[0];
    var opts = p ? String(p.editingOptions || '').split(',').map(function (x) { return x.trim(); }).filter(String) : [];
    if (!opts.length) return { canOrder: false, blockedReason: 'Package details not found. Please contact PicGrades.', options: [] };
    if (bal <= 0) return { canOrder: false, blockedReason: 'Your image balance is used up. Please top up to keep ordering.', options: opts };
    return { canOrder: true, options: opts, maxImages: bal };
  }
  return { canOrder: false, blockedReason: 'Unknown package type. Please contact PicGrades.', options: [] };
}

/** Server-side order maths. Never trusts numbers sent by the browser. */
function calcOrder_(c, o, s, existingOrders) {
  var form = orderForm_(c, s);
  var option = String(o.option || '').trim();
  if (form.options.indexOf(option) < 0) return { error: 'Choose an editing option.' };
  var catalogName = String(o.catalogName || '').trim();
  if (!catalogName) return { error: 'Add a catalog name.' };
  if (!String(o.catalogLink || '').trim()) return { error: 'Add the catalog link.' };

  var images = Math.max(0, parseInt(o.images, 10) || 0);
  var cullOnly = option === 'Culling';
  var hasCull = option.indexOf('Culling') > -1;
  var cullingImages = hasCull ? Math.max(0, parseInt(o.cullingImages, 10) || 0) : 0;
  if (hasCull && cullingImages <= 0) return { error: 'Enter the number of images in the catalog.' };
  if (images <= 0) return { error: 'Enter the number of images.' };
  if (hasCull && images > cullingImages) return { error: 'Images to keep cannot be more than the catalog size.' };

  var hours = cullOnly ? Number(s.cullingOnlyHours || 72) : (parseInt(o.hours, 10) || 96);
  var mult = Number(s['speedMultiplier.' + hours]);
  if (!mult) return { error: 'Choose a delivery speed.' };

  var quota = cullOnly ? 0 : Math.ceil(images * mult);
  var creditsUsed = 0;
  if (o.useCredits && isTrue_(c.creditsEnabled) && !cullOnly) creditsUsed = Math.min(Number(c.credits || 0), images, quota);
  var quotaUsed = Math.max(0, quota - creditsUsed);
  if (form.maxImages !== undefined && quotaUsed > form.maxImages) {
    return { error: 'This order needs ' + quotaUsed + ' images of balance; you have ' + form.maxImages + ' left.' };
  }
  var creditsEarned = (String(c.packageType) === 'CUSTOM' && isTrue_(c.creditsEnabled) && images >= Number(s.creditBonusMinImages || 1500)) ? Number(s.creditBonusPoints || 100) : 0;

  // Busy shift: if the studio already has many open images, start after their latest open order + N days.
  var base = new Date();
  var open = existingOrders.filter(function (x) { return String(x.status).toLowerCase().indexOf('completed') < 0; });
  var openImages = open.reduce(function (t, x) { return t + Number(x.numberOfImages || 0); }, 0);
  if (open.length && openImages >= Number(s.busyShiftImages || 2000)) {
    var latest = open.reduce(function (m, x) { var d = parseDate_(x.placedAt); return d > m ? d : m; }, new Date(0));
    var shifted = new Date(latest.getTime() + Number(s.busyShiftDays || 2) * 86400000);
    if (shifted > base) base = shifted;
  }
  var extraDays = option === 'Culling + Color Correction' ? Number(s.cullingExtraDays || 3) : 0;
  var deliveryDue = new Date(base.getTime() + hours * 3600000 + extraDays * 86400000);

  var bw = String(o.bwPercent == null ? '' : o.bwPercent).replace(/[^\d]/g, '');
  return {
    option: option, catalogName: catalogName, images: images, cullingImages: cullingImages, hours: hours,
    quotaUsed: quotaUsed, creditsUsed: creditsUsed, creditsEarned: creditsEarned, deliveryDue: deliveryDue,
    bw: cullOnly ? '0' : bw
  };
}

function nextOrderId_() {
  var max = 0;
  readTable_('Orders').forEach(function (o) {
    var m = /^PG(\d+)$/.exec(String(o.orderId));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'PG' + ('00000' + (max + 1)).slice(-5);
}

// =====================================================================
// 6. Email
// =====================================================================

function orderEmails_(o, c, before, after, s) {
  var details = [
    'Catalog: <b>' + esc_(o.catalogName) + '</b>',
    'Editing: ' + esc_(o.editingOptions),
    'Images: ' + o.numberOfImages + (o.cullingImages ? ' (to keep, out of ' + o.cullingImages + ' to cull)' : ''),
    'Delivery speed: ' + o.hours + ' hours',
    'Expected delivery: ' + esc_(o.deliveryDue),
    'B&amp;W: ' + esc_(o.bwPercent || '0') + '%',
    'Credits used: ' + o.creditsRedeemed,
    'Catalog link: ' + esc_(o.catalogLink),
    'Comments: ' + esc_(o.comments || '—')
  ];
  sendEmail_(o.email, 'New catalog order placed: ' + o.catalogName, 'Order received',
    ['Dear ' + esc_(o.fullName) + ',', 'We have received your order and will email you when it is complete.'].concat(details),
    'order-client', o.orderId);
  var admin = String(s.adminNotifyEmail || '').trim();
  if (admin) {
    sendEmail_(admin, 'New order by ' + c.companyName + ': ' + o.catalogName, 'New order · ' + esc_(c.companyName),
      [esc_(o.fullName) + ' · ' + esc_(o.email) + ' · ' + esc_(o.mobile)].concat(details).concat([
        'Quota before: total ' + before.total + ', used ' + before.used + ', balance ' + before.balance,
        'Quota after: total ' + after.total + ', used ' + after.used + ', balance ' + after.balance,
        'Rates: ' + c.perImageRate + ' per image, ' + c.cullingRate + ' culling'
      ]), 'order-admin', o.orderId);
  }
}

function sendEmail_(to, subject, title, lines, kind, relatedId) {
  var s = getSettings_();
  var html = '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#141413">' +
    '<h2 style="font-weight:normal;font-family:Georgia,serif">' + title + '</h2>' +
    lines.map(function (l) { return '<p style="margin:6px 0">' + l + '</p>'; }).join('') +
    '<p style="color:#777;font-size:12px;margin-top:24px">PicGrades · automated email, please do not reply.</p></div>';
  var result = 'sent';
  try {
    MailApp.sendEmail({ to: to, subject: subject, htmlBody: html, name: s.emailFromName || 'PicGrades Alerts' });
  } catch (err) {
    result = 'error: ' + (err && err.message || err);
  }
  appendRow_('EmailLog', { sentAt: fmt_(new Date()), to: to, subject: subject, kind: kind, relatedId: relatedId, result: result });
}

function esc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// =====================================================================
// 7. Sheet helpers
// =====================================================================

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
      var v = values[r][c];
      if (v instanceof Date) v = fmt_(v);
      obj[head[c]] = v;
      if (v !== '' && v !== null) empty = false;
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
  var row = readTable_(name).filter(function (r) { return String(r[keyCol]) === String(keyVal); })[0];
  if (!row) return false;
  updateRowByNumber_(name, row._row, patch);
  return true;
}

/** Update cells of one sheet row (row number from readTable_ _row). */
function updateRowByNumber_(name, rowNumber, patch) {
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.keys(patch).forEach(function (f) {
    var c = head.indexOf(f);
    if (c >= 0) sh.getRange(rowNumber, c + 1).setValue(patch[f]);
  });
}

/** Settings tab (key | value | note) → { key: value }. */
function getSettings_() {
  var out = {};
  readTable_('Settings').forEach(function (row) { out[row.key] = row.value; });
  return out;
}

function tz_() {
  return Session.getScriptTimeZone() || 'Asia/Kolkata';
}

/** Date → 'yyyy-MM-dd HH:mm:ss' in the script's time zone. */
function fmt_(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd HH:mm:ss');
}

/** 'yyyy-MM-dd HH:mm:ss' (script time zone) or Date → Date. */
function parseDate_(v) {
  if (v instanceof Date) return v;
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(v || ''));
  if (!m) return new Date(0);
  return Utilities.parseDate(m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5] + ':' + (m[6] || '00'), tz_(), 'yyyy-MM-dd HH:mm:ss');
}

function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function isTrue_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function round2_(n) { return Math.round(n * 100) / 100; }
