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
  verifyCode: verifyCode_,
  getGallery: getGallery_,
  likePhoto: likePhoto_,
  getNotes: getNotes_,
  addNote: addNote_,
  getFaces: getFaces_,
  photoData: photoData_,
  guestJoin: guestJoin_,
  saveSet: saveSet_,
  getSet: getSet_,
  uploadMoment: uploadMoment_,
  myPosts: myPosts_,
  coupleQueue: coupleQueue_,
  couplePost: couplePost_,
  coupleThanks: coupleThanks_
};

// Actions that need a logged-in user: handler(params, user)
var USER_ROUTES = {
  logout: logout_,
  me: me_,
  placeOrder: placeOrder_,
  editOrder: editOrder_,
  cancelOrder: cancelOrder_,
  holdOrder: holdOrder_,
  resumeOrder: resumeOrder_,
  setGallery: setGallery_,
  facesStatus: facesStatus_,
  saveFaces: saveFaces_,
  facesProxy: facesProxy_,
  sendGallery: sendGallery_
};

// Admin or editor (order queue + delivery)
var EDITOR_ROUTES = {
  queue: queue_,
  setStatus: setStatus_,
  completeOrder: completeOrder_
};

// Admin only (money + studios)
var ADMIN_ROUTES = {
  adminOverview: adminOverview_,
  adminCompany: adminCompany_,
  recordPayment: recordPayment_,
  adjustQuota: adjustQuota_,
  addCredits: addCredits_,
  updateCompany: updateCompany_
};

function route_(action, params) {
  params = params || {};
  try {
    var out;
    if (PUBLIC_ROUTES[action]) {
      out = PUBLIC_ROUTES[action](params);
    } else if (USER_ROUTES[action] || EDITOR_ROUTES[action] || ADMIN_ROUTES[action]) {
      var user = authUser_(params.token);
      if (!user) return { ok: false, error: 'Please log in again.', code: 'AUTH' };
      var role = String(user.role || 'client').toLowerCase();
      if (ADMIN_ROUTES[action] && role !== 'admin') return { ok: false, error: 'Admins only.', code: 'ROLE' };
      if (EDITOR_ROUTES[action] && role !== 'admin' && role !== 'editor') return { ok: false, error: 'Editors only.', code: 'ROLE' };
      var fn = USER_ROUTES[action] || EDITOR_ROUTES[action] || ADMIN_ROUTES[action];
      out = fn(params, user);
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
    version: 'step10-guests',
    time: new Date().toISOString(),
    rows: counts,
    missingTabs: missing,
    settings: getSettings_()
  };
}

/**
 * Run once from the editor (select testEmail → Run) to give the script
 * permission to send emails, and to check that email works.
 * Sends a test email to the admin notify address from Settings.
 */
function testEmail() {
  var to = String(getSettings_().adminNotifyEmail || Session.getEffectiveUser().getEmail());
  sendEmail_(to, 'PicGrades OS test email', 'Email works', ['If you can read this, login codes will arrive too.'], 'test', '');
  Logger.log('Test email sent to ' + to + '. Check the EmailLog tab for the result.');
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
  var orders = companyOrders_(user.companyName).slice(0, 50).map(function (o) { return publicOrder_(o, s, user); });
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
    ensureOrderColumns_();
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
      lrFilesLink: '', completedAt: '', source: 'vercel', wixId: '', creditsEarned: calc.creditsEarned, pausedHours: 0
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
    return { order: publicOrder_(row, s, user), company: publicCompany_(Object.assign({}, company, patch), s) };
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

function publicOrder_(o, s, user) {
  var out = {
    orderId: o.orderId, placedAt: fmt_(parseDate_(o.placedAt)), deliveryDue: o.deliveryDue ? fmt_(parseDate_(o.deliveryDue)) : '',
    hours: Number(o.hours || 0), status: o.status, catalogName: o.catalogName,
    numberOfImages: Number(o.numberOfImages || 0), cullingImages: Number(o.cullingImages || 0),
    editingOptions: o.editingOptions, quotaUsed: Number(o.quotaUsed || 0), creditsRedeemed: Number(o.creditsRedeemed || 0),
    bwPercent: o.bwPercent, catalogLink: o.catalogLink || '', referenceLinks: o.referenceLinks || '', comments: o.comments || '',
    lrFilesLink: o.lrFilesLink || '', source: o.source, galleryId: o.galleryLink || '', holdReason: o.holdReason || '', heldBy: o.heldBy || '',
    companyName: o.companyName, fullName: o.fullName, email: o.email
  };
  if (s && user) {
    var f = orderFlags_(o, s, user);
    out.canEdit = f.canEdit; out.editUntil = f.editUntil ? fmt_(f.editUntil) : '';
    out.canHold = f.canHold; out.canResume = f.canResume;
  }
  return out;
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
function calcOrder_(c, o, s, existingOrders, baseDate) {
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
  var base = baseDate ? new Date(baseDate.getTime()) : new Date();
  var start = new Date(base.getTime());
  var open = existingOrders.filter(function (x) { return String(x.status).toLowerCase().indexOf('completed') < 0; });
  var openImages = open.reduce(function (t, x) { return t + Number(x.numberOfImages || 0); }, 0);
  if (open.length && openImages >= Number(s.busyShiftImages || 2000)) {
    var latest = open.reduce(function (m, x) { var d = parseDate_(x.placedAt); return d > m ? d : m; }, new Date(0));
    var shifted = new Date(latest.getTime() + Number(s.busyShiftDays || 2) * 86400000);
    if (shifted > base) base = shifted;
    else if (shifted < start) base = start;
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
// 5b. Order lifecycle: edit, cancel, hold, resume (client + staff)
// =====================================================================

var ORDER_EXTRA_COLUMNS = ['creditsEarned', 'holdReason', 'heldAt', 'heldBy', 'prevStatus', 'pausedHours', 'editedAt', 'cancelledAt', 'galleryLink'];
var EDIT_WINDOW_DEFAULT = { 96: 24, 72: 16, 48: 8, 24: 4 };

function ensureOrderColumns_() { ensureColumns_('Orders', ORDER_EXTRA_COLUMNS); }

function isStaff_(user) { var r = String(user.role || '').toLowerCase(); return r === 'admin' || r === 'editor'; }
function statusKey_(st) {
  st = String(st || '').toLowerCase();
  if (st.indexOf('cancel') > -1) return 'cancelled';
  if (st.indexOf('completed') > -1) return 'completed';
  if (st.indexOf('hold') > -1) return 'hold';
  if (st.indexOf('editing') > -1) return 'editing';
  return 'review';
}

/** Hours after placing during which the client may edit or cancel (by delivery speed). */
function editWindowHours_(hours, s) {
  var v = Number(s['editWindow.' + hours]);
  return v > 0 ? v : (EDIT_WINDOW_DEFAULT[hours] || 24);
}

function orderFlags_(o, s, user) {
  var key = statusKey_(o.status);
  var own = normEmail_(o.email) === normEmail_(user.email) || String(o.companyName).trim().toLowerCase() === String(user.companyName).trim().toLowerCase();
  var until = new Date(parseDate_(o.placedAt).getTime() + editWindowHours_(Number(o.hours || 96), s) * 3600000);
  var canEdit = own && key === 'review' && !o.lrFilesLink && new Date() < until;
  var canHold = (own || isStaff_(user)) && (key === 'review' || key === 'editing');
  var canResume = key === 'hold' && (isStaff_(user) || (own && normEmail_(o.heldBy) === normEmail_(user.email)));
  return { canEdit: canEdit, editUntil: canEdit ? until : null, canHold: canHold, canResume: canResume };
}

/** Load an order the user may act on. Staff may load any order. */
function loadOrder_(orderId, user) {
  var o = readTable_('Orders').filter(function (x) { return String(x.orderId) === String(orderId); })[0];
  if (!o) throw new Error('Order not found.');
  if (!isStaff_(user) && String(o.companyName).trim().toLowerCase() !== String(user.companyName).trim().toLowerCase()) throw new Error('Order not found.');
  return o;
}

function earnedFor_(o) { return Number(o.creditsEarned || 0); }

function editOrder_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    ensureOrderColumns_();
    var s = getSettings_();
    var o = loadOrder_(p.orderId, user);
    if (!orderFlags_(o, s, user).canEdit) return { ok: false, error: 'This order can no longer be edited.' };
    var company = findCompany_(o.companyName);
    // Give back the old order first, then check the new one against that balance.
    var base = Object.assign({}, company, {
      usedQuota: Number(company.usedQuota || 0) - Number(o.quotaUsed || 0),
      totalImagesCulled: Number(company.totalImagesCulled || 0) - Number(o.cullingImages || 0),
      credits: Number(company.credits || 0) + Number(o.creditsRedeemed || 0) - earnedFor_(o)
    });
    var others = companyOrders_(o.companyName).filter(function (x) { return x.orderId !== o.orderId; });
    var calc = calcOrder_(base, p.order || {}, s, others, parseDate_(o.placedAt));
    if (calc.error) return { ok: false, error: calc.error };
    var q = p.order || {};
    var patch = {
      catalogName: calc.catalogName, editingOptions: calc.option, numberOfImages: calc.images, cullingImages: calc.cullingImages,
      hours: calc.hours, deliveryDue: fmt_(calc.deliveryDue), bwPercent: calc.bw, creditsRedeemed: calc.creditsUsed,
      quotaUsed: calc.quotaUsed, creditsEarned: calc.creditsEarned, catalogLink: String(q.catalogLink || '').trim(),
      referenceLinks: String(q.referenceLinks || '').trim(), comments: String(q.comments || '').trim(), editedAt: fmt_(new Date())
    };
    updateRowByNumber_('Orders', o._row, patch);
    var cPatch = {
      usedQuota: base.usedQuota + calc.quotaUsed,
      totalImagesCulled: base.totalImagesCulled + calc.cullingImages,
      credits: base.credits - calc.creditsUsed + calc.creditsEarned
    };
    updateRowByNumber_('Companies', company._row, cPatch);
    logCreditChange_(o, Number(o.creditsRedeemed || 0), earnedFor_(o), calc.creditsUsed, calc.creditsEarned, 'edited');
    var updated = Object.assign({}, o, patch);
    var adm = String(s.adminNotifyEmail || '').trim();
    if (adm) sendEmail_(adm, 'Order edited by ' + o.companyName + ': ' + patch.catalogName, 'Order edited',
      ['Order ' + o.orderId + ' was changed by ' + esc_(user.email) + '.',
       'Images: ' + o.numberOfImages + ' → ' + patch.numberOfImages, 'Editing: ' + esc_(o.editingOptions) + ' → ' + esc_(patch.editingOptions),
       'Speed: ' + o.hours + 'h → ' + patch.hours + 'h', 'Quota used: ' + o.quotaUsed + ' → ' + patch.quotaUsed,
       'New delivery: ' + esc_(patch.deliveryDue)], 'order-edited', o.orderId);
    return { order: publicOrder_(updated, s, user), company: publicCompany_(Object.assign({}, company, cPatch), s) };
  } finally { lock.releaseLock(); }
}

function cancelOrder_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    ensureOrderColumns_();
    var s = getSettings_();
    var o = loadOrder_(p.orderId, user);
    if (!orderFlags_(o, s, user).canEdit) return { ok: false, error: 'This order can no longer be cancelled.' };
    var company = findCompany_(o.companyName);
    var cPatch = {
      usedQuota: Number(company.usedQuota || 0) - Number(o.quotaUsed || 0),
      totalImagesCulled: Number(company.totalImagesCulled || 0) - Number(o.cullingImages || 0),
      credits: Number(company.credits || 0) + Number(o.creditsRedeemed || 0) - earnedFor_(o)
    };
    updateRowByNumber_('Companies', company._row, cPatch);
    updateRowByNumber_('Orders', o._row, { status: 'Cancelled', cancelledAt: fmt_(new Date()), prevStatus: o.status });
    logCreditChange_(o, Number(o.creditsRedeemed || 0), earnedFor_(o), 0, 0, 'cancelled');
    var msg = ['Order <b>' + esc_(o.catalogName) + '</b> (' + o.orderId + ') was cancelled.', o.quotaUsed + ' images of quota were returned to the balance.'];
    sendEmail_(o.email, 'Order cancelled: ' + o.catalogName, 'Order cancelled', msg, 'order-cancelled', o.orderId);
    var adm = String(s.adminNotifyEmail || '').trim();
    if (adm) sendEmail_(adm, 'Order cancelled by ' + o.companyName + ': ' + o.catalogName, 'Order cancelled', msg, 'order-cancelled', o.orderId);
    return { cancelled: true, company: publicCompany_(Object.assign({}, company, cPatch), s) };
  } finally { lock.releaseLock(); }
}

/** Write CreditLog lines for the difference between old and new credit use. */
function logCreditChange_(o, oldUsed, oldEarned, newUsed, newEarned, why) {
  var now = fmt_(new Date());
  var back = oldUsed - newUsed;
  if (back > 0) appendRow_('CreditLog', { date: now, companyName: o.companyName, type: 'CREDITED', points: back, title: 'Credits returned (order ' + why + '): ' + o.catalogName, method: 'AUTOMATIC', relatedWixOrderId: o.orderId });
  if (back < 0) appendRow_('CreditLog', { date: now, companyName: o.companyName, type: 'DEBITED', points: -back, title: 'Credits redeemed (order ' + why + '): ' + o.catalogName, method: 'AUTOMATIC', relatedWixOrderId: o.orderId });
  var lost = oldEarned - newEarned;
  if (lost > 0) appendRow_('CreditLog', { date: now, companyName: o.companyName, type: 'DEBITED', points: lost, title: 'Bonus removed (order ' + why + '): ' + o.catalogName, method: 'AUTOMATIC', relatedWixOrderId: o.orderId });
  if (lost < 0) appendRow_('CreditLog', { date: now, companyName: o.companyName, type: 'CREDITED', points: -lost, title: 'Bonus credits earned (order ' + why + '): ' + o.catalogName, method: 'AUTOMATIC', relatedWixOrderId: o.orderId });
}

function holdOrder_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    ensureOrderColumns_();
    var s = getSettings_();
    var o = loadOrder_(p.orderId, user);
    if (!orderFlags_(o, s, user).canHold) return { ok: false, error: 'This order cannot be put on hold now.' };
    var reason = String(p.reason || '').trim();
    if (!reason) return { ok: false, error: 'Please add a reason for the hold.' };
    var patch = { status: 'On Hold', prevStatus: o.status, holdReason: reason, heldAt: fmt_(new Date()), heldBy: normEmail_(user.email) };
    updateRowByNumber_('Orders', o._row, patch);
    var who = isStaff_(user) ? 'PicGrades' : esc_(user.name || user.email);
    var lines = ['Order <b>' + esc_(o.catalogName) + '</b> is on hold.', 'Reason: ' + esc_(reason), 'Put on hold by: ' + who,
      'The delivery date moves forward by the time the order stays on hold.'];
    sendEmail_(o.email, 'Catalog order ' + o.catalogName + ' on HOLD', 'Order on hold', lines, 'order-hold', o.orderId);
    var adm = String(s.adminNotifyEmail || '').trim();
    if (adm && !isStaff_(user)) sendEmail_(adm, 'Client put order on hold: ' + o.catalogName, 'Order on hold · ' + esc_(o.companyName), lines, 'order-hold', o.orderId);
    return { order: publicOrder_(Object.assign({}, o, patch), s, user) };
  } finally { lock.releaseLock(); }
}

function resumeOrder_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    ensureOrderColumns_();
    var s = getSettings_();
    var o = loadOrder_(p.orderId, user);
    if (!orderFlags_(o, s, user).canResume) return { ok: false, error: 'Only PicGrades or the person who put it on hold can resume it.' };
    var now = new Date();
    var pausedMs = Math.max(0, now - parseDate_(o.heldAt));
    var due = o.deliveryDue ? new Date(parseDate_(o.deliveryDue).getTime() + pausedMs) : '';
    var back = o.prevStatus && statusKey_(o.prevStatus) !== 'hold' ? o.prevStatus : 'Under Review';
    var patch = { status: back, deliveryDue: due ? fmt_(due) : '', heldAt: '', pausedHours: round2_(Number(o.pausedHours || 0) + pausedMs / 3600000) };
    updateRowByNumber_('Orders', o._row, patch);
    var lines = ['Order <b>' + esc_(o.catalogName) + '</b> is back in progress (' + esc_(back) + ').', 'New expected delivery: ' + esc_(patch.deliveryDue)];
    sendEmail_(o.email, 'Catalog order update: ' + o.catalogName, 'Order resumed', lines, 'order-resume', o.orderId);
    var adm = String(s.adminNotifyEmail || '').trim();
    if (adm && !isStaff_(user)) sendEmail_(adm, 'Client resumed order: ' + o.catalogName, 'Order resumed · ' + esc_(o.companyName), lines, 'order-resume', o.orderId);
    return { order: publicOrder_(Object.assign({}, o, patch), s, user) };
  } finally { lock.releaseLock(); }
}

// =====================================================================
// 5c. Editor: queue, status, delivery
// =====================================================================

function queue_(p, user) {
  var s = getSettings_();
  var all = readTable_('Orders');
  var open = all.filter(function (o) { var k = statusKey_(o.status); return k === 'review' || k === 'editing' || k === 'hold'; })
    .sort(function (a, b) { return parseDate_(a.deliveryDue || a.placedAt) - parseDate_(b.deliveryDue || b.placedAt); });
  var done = all.filter(function (o) { return statusKey_(o.status) === 'completed'; })
    .sort(function (a, b) { return parseDate_(b.completedAt || b.placedAt) - parseDate_(a.completedAt || a.placedAt); }).slice(0, 20);
  return { open: open.map(function (o) { return publicOrder_(o, s, user); }), recentDone: done.map(function (o) { return publicOrder_(o, s, user); }) };
}

var STATUS_SUBJECT = {
  review: 'Catalog under review: ', editing: 'Editing in progress: ', hold: 'Catalog order on HOLD: '
};

function setStatus_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    ensureOrderColumns_();
    var s = getSettings_();
    var o = loadOrder_(p.orderId, user);
    var to = String(p.status || '');
    if (['Under Review', 'Editing'].indexOf(to) < 0) return { ok: false, error: 'Use Hold or Complete for those steps.' };
    var k = statusKey_(o.status);
    if (k === 'completed' || k === 'cancelled') return { ok: false, error: 'This order is already ' + o.status + '.' };
    if (k === 'hold') return { ok: false, error: 'Resume the order first.' };
    updateRowByNumber_('Orders', o._row, { status: to });
    sendEmail_(o.email, STATUS_SUBJECT[statusKey_(to)] + o.catalogName, to === 'Editing' ? 'Editing in progress' : 'Under review',
      ['Your order <b>' + esc_(o.catalogName) + '</b> is now: <b>' + esc_(to) + '</b>.', 'Expected delivery: ' + esc_(o.deliveryDue || '—')], 'order-status', o.orderId);
    return { order: publicOrder_(Object.assign({}, o, { status: to }), s, user) };
  } finally { lock.releaseLock(); }
}

function completeOrder_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    ensureOrderColumns_();
    var s = getSettings_();
    var o = loadOrder_(p.orderId, user);
    var link = String(p.lrFilesLink || '').trim();
    if (!/^https?:\/\/\S+$/i.test(link)) return { ok: false, error: 'Paste a full link starting with https://' };
    var k = statusKey_(o.status);
    if (k === 'cancelled') return { ok: false, error: 'This order was cancelled.' };
    var patch = { status: 'Order Completed', lrFilesLink: link, completedAt: fmt_(new Date()), heldAt: '' };
    updateRowByNumber_('Orders', o._row, patch);
    var note = String(p.note || '').trim();
    sendEmail_(o.email, 'Catalog order for ' + o.catalogName + ' is complete!', 'Your order is ready',
      ['Dear ' + esc_(o.fullName || '') + ',', 'Your catalog <b>' + esc_(o.catalogName) + '</b> is complete.',
       '<a href="' + esc_(link) + '" style="display:inline-block;background:#E9B44C;color:#141413;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Download LR files</a>']
        .concat(note ? ['Note from the editor: ' + esc_(note)] : []), 'order-complete', o.orderId);
    return { order: publicOrder_(Object.assign({}, o, patch), s, user), resent: k === 'completed' };
  } finally { lock.releaseLock(); }
}

// =====================================================================
// 5d. Admin: overview, studios, payments
// =====================================================================

function adminOverview_(p, user) {
  var s = getSettings_();
  var companies = readTable_('Companies');
  var orders = readTable_('Orders').filter(function (o) { return statusKey_(o.status) !== 'cancelled'; });
  var byCo = {};
  orders.forEach(function (o) {
    var k = String(o.companyName).trim().toLowerCase();
    var x = byCo[k] || (byCo[k] = { orders: 0, open: 0, last: '' });
    x.orders++;
    var st = statusKey_(o.status); if (st !== 'completed') x.open++;
    if (String(o.placedAt) > x.last) x.last = String(o.placedAt);
  });
  var rows = companies.map(function (c) {
    var pc = publicCompany_(c, s), x = byCo[String(c.companyName).trim().toLowerCase()] || { orders: 0, open: 0, last: '' };
    pc.orders = x.orders; pc.openOrders = x.open; pc.lastOrder = x.last; pc.status = c.status || 'Active'; pc.adminEmail = c.adminEmail;
    return pc;
  }).sort(function (a, b) { return String(b.lastOrder).localeCompare(String(a.lastOrder)); });
  // Images received per month, last 12 months
  var months = [];
  var now = new Date();
  for (var i = 11; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: Utilities.formatDate(d, tz_(), 'yyyy-MM'), label: Utilities.formatDate(d, tz_(), 'MMM yy'), images: 0, orders: 0 });
  }
  var idx = {}; months.forEach(function (m, n) { idx[m.key] = n; });
  orders.forEach(function (o) { var k = String(o.placedAt).slice(0, 7); if (idx[k] !== undefined) { months[idx[k]].images += Number(o.numberOfImages || 0); months[idx[k]].orders++; } });
  var due = { INR: 0, USD: 0 };
  rows.forEach(function (r) { due[r.currency === 'USD' ? 'USD' : 'INR'] += r.totalDue; });
  var openCount = orders.filter(function (o) { return statusKey_(o.status) !== 'completed'; }).length;
  var payments = readTable_('Payments').sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); }).slice(0, 15);
  return {
    totals: { studios: rows.length, openOrders: openCount, dueINR: round2_(due.INR), dueUSD: round2_(due.USD),
      imagesThisMonth: months[11].images, overQuotaStudios: rows.filter(function (r) { return r.balance < 0; }).length },
    months: months, companies: rows, payments: payments.map(stripRow_)
  };
}

function adminCompany_(p, user) {
  var s = getSettings_();
  var c = findCompany_(p.companyName);
  if (!c) return { ok: false, error: 'Studio not found.' };
  var key = String(c.companyName).trim().toLowerCase();
  var users = readTable_('Users').filter(function (u) { return String(u.companyName).trim().toLowerCase() === key; }).map(stripRow_);
  return {
    company: Object.assign(publicCompany_(c, s), { adminEmail: c.adminEmail, contactName: c.contactName, phone: c.phone, status: c.status || 'Active' }),
    orders: companyOrders_(c.companyName).slice(0, 100).map(function (o) { return publicOrder_(o, s, user); }),
    payments: readTable_('Payments').filter(function (x) { return String(x.companyName).trim().toLowerCase() === key; }).reverse().map(stripRow_),
    credits: readTable_('CreditLog').filter(function (x) { return String(x.companyName).trim().toLowerCase() === key; }).reverse().slice(0, 50).map(stripRow_),
    users: users
  };
}

function recordPayment_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = getSettings_();
    var c = findCompany_(p.companyName);
    if (!c) return { ok: false, error: 'Studio not found.' };
    var amount = Number(p.amount), rate = Number(p.rate);
    if (!(amount > 0)) return { ok: false, error: 'Enter the amount received.' };
    if (!(rate > 0)) return { ok: false, error: 'Enter the rate per image.' };
    var method = String(p.method || '').trim() || 'UPI';
    var images = Math.floor(amount / rate + 1e-9);
    var date = /^\d{4}-\d{2}-\d{2}$/.test(String(p.date || '')) ? p.date + ' 12:00:00' : fmt_(new Date());
    var pay = { paymentId: 'PAY' + Utilities.formatDate(new Date(), tz_(), 'yyMMddHHmmss'), date: date, companyName: c.companyName,
      amount: amount, currency: c.currency || 'INR', method: method, ratePerImage: rate, imagesAdded: images,
      note: String(p.note || '').trim(), recordedBy: normEmail_(user.email) };
    appendRow_('Payments', pay);
    var patch = { totalQuota: Number(c.totalQuota || 0) + images };
    if (p.updateRate) patch.perImageRate = rate;
    updateRowByNumber_('Companies', c._row, patch);
    var after = publicCompany_(Object.assign({}, c, patch), s);
    if (p.sendReceipt !== false && c.adminEmail) {
      sendEmail_(c.adminEmail, 'Payment received: ' + money_(amount, pay.currency), 'Payment received',
        ['Thank you. We received <b>' + money_(amount, pay.currency) + '</b> (' + esc_(method) + ').',
         'Added to your balance: <b>' + images + ' images</b> at ' + money_(rate, pay.currency) + ' per image.',
         'New balance: ' + after.balance + ' images.'], 'payment', pay.paymentId);
    }
    return { payment: pay, company: after };
  } finally { lock.releaseLock(); }
}

/** Manual correction of images (+ or −) with a note, logged in Payments as an Adjustment. */
function adjustQuota_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = getSettings_();
    var c = findCompany_(p.companyName);
    if (!c) return { ok: false, error: 'Studio not found.' };
    var images = parseInt(p.images, 10);
    if (!images) return { ok: false, error: 'Enter images to add (or a minus number to remove).' };
    var note = String(p.note || '').trim();
    if (!note) return { ok: false, error: 'Add a note so the change is clear later.' };
    appendRow_('Payments', { paymentId: 'ADJ' + Utilities.formatDate(new Date(), tz_(), 'yyMMddHHmmss'), date: fmt_(new Date()), companyName: c.companyName,
      amount: 0, currency: c.currency || 'INR', method: 'Adjustment', ratePerImage: '', imagesAdded: images, note: note, recordedBy: normEmail_(user.email) });
    var patch = { totalQuota: Number(c.totalQuota || 0) + images };
    updateRowByNumber_('Companies', c._row, patch);
    return { company: publicCompany_(Object.assign({}, c, patch), s) };
  } finally { lock.releaseLock(); }
}

function addCredits_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var s = getSettings_();
    var c = findCompany_(p.companyName);
    if (!c) return { ok: false, error: 'Studio not found.' };
    var pts = parseInt(p.points, 10), title = String(p.title || '').trim();
    if (!pts) return { ok: false, error: 'Enter credit points (minus to remove).' };
    if (!title) return { ok: false, error: 'Add a title.' };
    appendRow_('CreditLog', { date: fmt_(new Date()), companyName: c.companyName, type: pts > 0 ? 'CREDITED' : 'DEBITED', points: Math.abs(pts), title: title, method: 'MANUAL', relatedWixOrderId: '' });
    var patch = { credits: Number(c.credits || 0) + pts };
    updateRowByNumber_('Companies', c._row, patch);
    return { company: publicCompany_(Object.assign({}, c, patch), s) };
  } finally { lock.releaseLock(); }
}

var COMPANY_EDITABLE = ['packageType', 'currency', 'perImageRate', 'cullingRate', 'creditsEnabled', 'status', 'adminEmail', 'contactName', 'phone'];

function updateCompany_(p, user) {
  var s = getSettings_();
  var c = findCompany_(p.companyName);
  if (!c) return { ok: false, error: 'Studio not found.' };
  var patch = {};
  Object.keys(p.patch || {}).forEach(function (k) { if (COMPANY_EDITABLE.indexOf(k) > -1) patch[k] = p.patch[k]; });
  ['perImageRate', 'cullingRate'].forEach(function (k) { if (k in patch) { patch[k] = Number(patch[k]); if (!(patch[k] >= 0)) throw new Error(k + ' must be a number.'); } });
  if ('creditsEnabled' in patch) patch.creditsEnabled = isTrue_(patch.creditsEnabled);
  if (!Object.keys(patch).length) return { ok: false, error: 'Nothing to change.' };
  updateRowByNumber_('Companies', c._row, patch);
  return { company: publicCompany_(Object.assign({}, c, patch), s) };
}

function stripRow_(r) { var o = Object.assign({}, r); delete o._row; return o; }
function money_(v, cur) { return (cur === 'USD' ? '$' : '₹') + round2_(Number(v || 0)); }

/** Add any missing header columns to a tab (keeps old sheets working). */
function ensureColumns_(name, cols) {
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = cols.filter(function (c) { return head.indexOf(c) < 0; });
  missing.forEach(function (c, i) { sh.getRange(1, head.length + i + 1).setValue(c); });
}

// =====================================================================
// 5e. Galleries (Drive folder → Root Moment + event galleries)
// =====================================================================

var GALLERY_COLUMNS = ['galleryId', 'orderId', 'companyName', 'title', 'eventDate', 'folderId', 'folderUrl', 'manifestFileId',
  'photoCount', 'rootCount', 'status', 'createdAt', 'updatedAt', 'createdBy',
  'facesFileId', 'facesStatus', 'faceCount', 'facesPhotos', 'facesAt', 'sentAt', 'sentTo',
  'coupleKey', 'thanksNote', 'guestFolderId'];
var NOTE_COLUMNS = ['at', 'galleryId', 'photoId', 'type', 'device', 'name', 'text', 'status'];
var EVENT_ORDER = ['haldi', 'mehendi', 'mehndi', 'sangeet', 'wedding', 'pheras', 'reception'];
var ROOT_FOLDER_RE = /^0*_?root[ _-]*moments?$/i;
var GUEST_FOLDER_NAME = '01_Guest_Moments';

function ensureTab_(name, cols) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(name)) ss.insertSheet(name).getRange(1, 1, 1, cols.length).setValues([cols]);
  else ensureColumns_(name, cols);
}

function folderIdFromUrl_(url) {
  var s = String(url || '').trim();
  var m = /\/folders\/([a-zA-Z0-9_-]{10,})/.exec(s) || /[?&]id=([a-zA-Z0-9_-]{10,})/.exec(s) || /^([a-zA-Z0-9_-]{20,})$/.exec(s);
  return m ? m[1] : null;
}

function cleanEventName_(name) {
  return String(name).replace(/^\d+[\s._-]*/, '').replace(/[_]+/g, ' ').trim() || String(name);
}

function eventRank_(name) {
  var i = EVENT_ORDER.indexOf(cleanEventName_(name).toLowerCase());
  return i < 0 ? 100 : i;
}

function isImage_(f) { return /^image\/(jpeg|png|webp|gif)$/i.test(f.getMimeType()); }

function listImages_(folder) {
  var out = [], it = folder.getFiles();
  while (it.hasNext()) { var f = it.next(); if (isImage_(f) && !f.isTrashed()) out.push({ id: f.getId(), name: f.getName() }); }
  return out.sort(function (a, b) { return a.name.localeCompare(b.name, 'en', { numeric: true }); });
}

/** Read a wedding folder: subfolders = events, 00_Root_Moment = Root Moment. */
function scanWeddingFolder_(folderId) {
  var folder;
  try { folder = DriveApp.getFolderById(folderId); } catch (err) {
    throw new Error('Cannot open this Drive folder. Share it as "Anyone with the link – Viewer" and try again.');
  }
  var access = String(folder.getSharingAccess());
  if (access !== 'ANYONE_WITH_LINK' && access !== 'ANYONE') {
    throw new Error('The folder is not shared publicly yet. In Drive: Share → General access → "Anyone with the link" → Viewer.');
  }
  var events = [], root = [], subs = folder.getFolders();
  while (subs.hasNext()) {
    var sf = subs.next();
    if (sf.isTrashed() || sf.getName() === GUEST_FOLDER_NAME) continue; // guest uploads are shown only after approval
    var photos = listImages_(sf);
    if (ROOT_FOLDER_RE.test(sf.getName().replace(/\s+/g, '_'))) { root = photos; continue; }
    if (photos.length) events.push({ name: cleanEventName_(sf.getName()), folder: sf.getName(), photos: photos });
  }
  var loose = listImages_(folder);
  if (loose.length) events.push({ name: 'Highlights', folder: '', photos: loose });
  var rank = function (e) { return e.folder ? eventRank_(e.folder) : 1000; };
  events.sort(function (a, b) { return rank(a) - rank(b) || a.folder.localeCompare(b.folder, 'en', { numeric: true }); });
  var count = events.reduce(function (t, e) { return t + e.photos.length; }, 0) + root.length;
  if (!count) throw new Error('No photos found. Put JPG/PNG photos in event folders (Haldi, Wedding…) inside the shared folder.');
  return { folderName: folder.getName(), events: events, root: root, photoCount: count };
}

function manifestFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('MANIFEST_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('PicGrades OS · gallery data (do not edit)');
  props.setProperty('MANIFEST_FOLDER', f.getId());
  return f;
}

function randomId_(n) {
  var abc = 'abcdefghijkmnopqrstuvwxyz23456789', s = '';
  for (var i = 0; i < n; i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
  return s;
}

/** Create or refresh the gallery for an order. Staff: any order. Client: own studio's orders. */
function setGallery_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    ensureOrderColumns_(); ensureTab_('Galleries', GALLERY_COLUMNS);
    var o = loadOrder_(p.orderId, user);
    if (statusKey_(o.status) === 'cancelled') return { ok: false, error: 'This order was cancelled.' };
    var existing = readTable_('Galleries').filter(function (g) { return String(g.orderId) === String(o.orderId); })[0];
    var folderId = folderIdFromUrl_(p.folderUrl) || (existing && existing.folderId);
    if (!folderId) return { ok: false, error: 'Paste the Google Drive folder link (it contains /folders/).' };
    var scan = scanWeddingFolder_(folderId);
    var title = String(p.title || (existing && existing.title) || scan.folderName.replace(/[_]+/g, ' ')).trim().slice(0, 80);
    var eventDate = /^\d{4}-\d{2}-\d{2}$/.test(String(p.eventDate || '')) ? p.eventDate : (existing ? existing.eventDate : '');
    var manifest = {
      v: 1, title: title, eventDate: eventDate, studio: o.companyName, folderName: scan.folderName,
      root: scan.root, events: scan.events, updatedAt: fmt_(new Date())
    };
    var json = JSON.stringify(manifest);
    var fileId;
    if (existing && existing.manifestFileId) {
      try { DriveApp.getFileById(existing.manifestFileId).setContent(json); fileId = existing.manifestFileId; } catch (e) { fileId = null; }
    }
    if (!fileId) fileId = manifestFolder_().createFile('gallery-' + o.orderId + '.json', json, 'application/json').getId();
    var row = {
      orderId: o.orderId, companyName: o.companyName, title: title, eventDate: eventDate, folderId: folderId,
      folderUrl: 'https://drive.google.com/drive/folders/' + folderId, manifestFileId: fileId,
      photoCount: scan.photoCount, rootCount: scan.root.length, status: 'Published', updatedAt: fmt_(new Date())
    };
    var gid;
    if (existing) { gid = existing.galleryId; updateRowByNumber_('Galleries', existing._row, row); }
    else {
      gid = randomId_(12);
      appendRow_('Galleries', Object.assign({ galleryId: gid, createdAt: fmt_(new Date()), createdBy: normEmail_(user.email) }, row));
    }
    if (existing && existing.facesFileId) {
      var known = readFacesFile_(existing).pass, ids = allPhotoIds_(manifest);
      var missing = ids.filter(function (id) { return !known[id]; }).length;
      if (missing) updateRowByNumber_('Galleries', existing._row, { facesStatus: 'Needs update' });
    }
    CacheService.getScriptCache().remove('gal:' + gid);
    updateRowByNumber_('Orders', o._row, { galleryLink: gid });
    return { galleryId: gid, photoCount: scan.photoCount, rootCount: scan.root.length,
      events: scan.events.map(function (e) { return { name: e.name, count: e.photos.length }; }) };
  } finally { lock.releaseLock(); }
}

function findGallery_(gid) {
  ensureTab_('Galleries', GALLERY_COLUMNS);
  return readTable_('Galleries').filter(function (g) { return String(g.galleryId) === String(gid || ''); })[0] || null;
}

function loadManifest_(g) {
  var cache = CacheService.getScriptCache(), key = 'gal:' + g.galleryId;
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var json = DriveApp.getFileById(g.manifestFileId).getBlob().getDataAsString();
  if (json.length < 95000) cache.put(key, json, 21600);
  return JSON.parse(json);
}

/** Public: everything the gallery page needs. */
function getGallery_(p) {
  var g = findGallery_(p.g);
  if (!g || g.status !== 'Published') return { ok: false, error: 'This gallery is not available.' };
  var m = loadManifest_(g);
  ensureTab_('MomentNotes', NOTE_COLUMNS);
  var device = String(p.device || '').slice(0, 40);
  var likes = {}, notes = {}, mine = {}, recent = [];
  readTable_('MomentNotes').forEach(function (n) {
    if (String(n.galleryId) !== g.galleryId || n.status === 'hidden') return;
    if (n.type === 'like') { likes[n.photoId] = (likes[n.photoId] || 0) + 1; if (device && n.device === device) mine[n.photoId] = true; }
    if (n.type === 'note') { notes[n.photoId] = (notes[n.photoId] || 0) + 1; recent.push({ photoId: n.photoId, name: n.name, text: n.text, at: n.at }); }
  });
  recent.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  m.recentNotes = recent.slice(0, 30);
  m.galleryId = g.galleryId;
  m.likes = likes; m.notes = notes; m.mine = mine;
  m.faceSearch = g.facesStatus === 'Ready' || g.facesStatus === 'Needs update';
  ensureTab_('GuestPosts', POST_COLUMNS);
  m.guestPosts = readTable_('GuestPosts').filter(function (x) { return x.galleryId === g.galleryId && x.status === 'approved'; })
    .map(function (x) { return { postId: x.postId, fileId: x.fileId, type: x.type, name: x.name, caption: x.caption, at: x.at }; })
    .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  m.isCouple = !!(p.coupleKey && g.coupleKey && String(p.coupleKey) === String(g.coupleKey));
  return { gallery: m };
}

function likePhoto_(p) {
  var g = findGallery_(p.g);
  if (!g || g.status !== 'Published') return { ok: false, error: 'This gallery is not available.' };
  var device = String(p.device || '').slice(0, 40), photo = String(p.photoId || '');
  if (device.length < 8 || !photo) return { ok: false, error: 'Missing details.' };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    ensureTab_('MomentNotes', NOTE_COLUMNS);
    var rows = readTable_('MomentNotes');
    var mineRow = rows.filter(function (n) { return n.galleryId === g.galleryId && n.photoId === photo && n.type === 'like' && n.device === device && n.status !== 'hidden'; })[0];
    if (mineRow) updateRowByNumber_('MomentNotes', mineRow._row, { status: 'hidden' });
    else appendRow_('MomentNotes', { at: fmt_(new Date()), galleryId: g.galleryId, photoId: photo, type: 'like', device: device, status: 'ok' });
    var count = rows.filter(function (n) { return n.galleryId === g.galleryId && n.photoId === photo && n.type === 'like' && n.status !== 'hidden'; }).length + (mineRow ? -1 : 1);
    return { liked: !mineRow, likes: count };
  } finally { lock.releaseLock(); }
}

function getNotes_(p) {
  var g = findGallery_(p.g);
  if (!g || g.status !== 'Published') return { ok: false, error: 'This gallery is not available.' };
  ensureTab_('MomentNotes', NOTE_COLUMNS);
  var list = readTable_('MomentNotes').filter(function (n) { return n.galleryId === g.galleryId && n.photoId === String(p.photoId || '') && n.type === 'note' && n.status !== 'hidden'; })
    .map(function (n) { return { at: n.at, name: n.name, text: n.text }; });
  return { notes: list };
}

function addNote_(p) {
  var g = findGallery_(p.g);
  if (!g || g.status !== 'Published') return { ok: false, error: 'This gallery is not available.' };
  var name = String(p.name || '').trim().slice(0, 40), text = String(p.text || '').trim().slice(0, 280);
  var device = String(p.device || '').slice(0, 40), photo = String(p.photoId || '');
  if (!name) return { ok: false, error: 'Add your name.' };
  if (!text) return { ok: false, error: 'Write a note first.' };
  if (device.length < 8 || !photo) return { ok: false, error: 'Missing details.' };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    ensureTab_('MomentNotes', NOTE_COLUMNS);
    var hourAgo = new Date(Date.now() - 3600000);
    var recent = readTable_('MomentNotes').filter(function (n) { return n.device === device && n.type === 'note' && parseDate_(n.at) > hourAgo; }).length;
    if (recent >= 20) return { ok: false, error: 'Too many notes in a short time. Please try again later.' };
    appendRow_('MomentNotes', { at: fmt_(new Date()), galleryId: g.galleryId, photoId: photo, type: 'note', device: device, name: name, text: text, status: 'ok' });
    return { note: { at: fmt_(new Date()), name: name, text: text } };
  } finally { lock.releaseLock(); }
}

// =====================================================================
// 6b. Face reading (runs in the admin's browser; results stored here) + send to client
// =====================================================================
// Faces file (JSON in the gallery data folder):
//   { v:1, scale:250, pass:{photoId:1|2}, photos:{photoId:{w,h,f:[[x,y,w,h], 'base64 int8 x128'], ...]}} }
// Boxes are 0..1000 of the photo size. Descriptor values are multiplied by `scale` and stored as int8.

var FACE_DUE_HOURS = 5;

function emptyFaces_() { return { v: 1, scale: 250, pass: {}, photos: {} }; }

function readFacesFile_(g) {
  if (!g.facesFileId) return emptyFaces_();
  try { var f = JSON.parse(DriveApp.getFileById(g.facesFileId).getBlob().getDataAsString()); f.pass = f.pass || {}; f.photos = f.photos || {}; return f; }
  catch (e) { return emptyFaces_(); }
}

function allPhotoIds_(m) {
  var seen = {}, out = [];
  var add = function (p) { if (!seen[p.id]) { seen[p.id] = true; out.push(p.id); } };
  (m.root || []).forEach(add);
  (m.events || []).forEach(function (e) { e.photos.forEach(add); });
  return out;
}

function staffGallery_(gid, user) {
  var g = findGallery_(gid);
  if (!g) throw new Error('Gallery not found.');
  var o = loadOrder_(g.orderId, user); // clients only reach their own studio's galleries
  return { g: g, o: o };
}

/** Logged in: what the face-reading page needs (photo list, progress, faces so far, due time). */
function facesStatus_(p, user) {
  var x = staffGallery_(p.g, user), g = x.g, o = x.o, m = loadManifest_(g), f = readFacesFile_(g);
  var photos = [], seen = {};
  (m.root || []).forEach(function (ph) { if (!seen[ph.id]) { seen[ph.id] = 1; photos.push({ id: ph.id, set: 'Root Moment' }); } });
  (m.events || []).forEach(function (e) { e.photos.forEach(function (ph) { if (!seen[ph.id]) { seen[ph.id] = 1; photos.push({ id: ph.id, set: e.name }); } }); });
  var done = parseDate_(o.completedAt);
  var due = done.getTime() > 0 ? fmt_(new Date(done.getTime() + FACE_DUE_HOURS * 3600000)) : '';
  return {
    gallery: { galleryId: g.galleryId, title: g.title, studio: g.companyName, catalogName: o.catalogName,
      status: g.facesStatus || '', faceCount: Number(g.faceCount || 0), sentAt: g.sentAt || '', sentTo: g.sentTo || '',
      dueAt: due, clientEmail: o.email || '', coupleKey: coupleKey_(g) },
    photos: photos, faces: f
  };
}

function validFaceEntry_(v) {
  if (!v || typeof v !== 'object' || !(v.w > 0) || !(v.h > 0) || !Array.isArray(v.f) || v.f.length > 80) return false;
  return v.f.every(function (fc) {
    return Array.isArray(fc) && Array.isArray(fc[0]) && fc[0].length === 4 && fc[0].every(function (n) { return typeof n === 'number' && n >= -50 && n <= 1050; }) &&
      typeof fc[1] === 'string' && /^[A-Za-z0-9+/=]{170,176}$/.test(fc[1]);
  });
}

/** Logged in: store the faces read for a batch of photos. done=true marks the gallery Ready. */
function saveFaces_(p, user) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    ensureTab_('Galleries', GALLERY_COLUMNS);
    var x = staffGallery_(p.g, user), g = x.g, m = loadManifest_(g);
    var ids = {}; allPhotoIds_(m).forEach(function (id) { ids[id] = true; });
    var pass = Number(p.pass) === 2 ? 2 : 1, batch = p.photos || {}, keys = Object.keys(batch);
    if (keys.length > 60) return { ok: false, error: 'Too many photos in one batch.' };
    var f = readFacesFile_(g);
    for (var i = 0; i < keys.length; i++) {
      var id = keys[i];
      if (!ids[id]) return { ok: false, error: 'Photo is not part of this gallery: ' + id };
      if (!validFaceEntry_(batch[id])) return { ok: false, error: 'Face data looks wrong for photo ' + id };
      f.photos[id] = { w: Math.round(batch[id].w), h: Math.round(batch[id].h), f: batch[id].f };
      f.pass[id] = Math.max(pass, Number(f.pass[id] || 0));
    }
    var json = JSON.stringify(f), fileId = g.facesFileId;
    if (fileId) { try { DriveApp.getFileById(fileId).setContent(json); } catch (e) { fileId = ''; } }
    if (!fileId) fileId = manifestFolder_().createFile('faces-' + g.galleryId + '.json', json, 'application/json').getId();
    var faceCount = Object.keys(f.photos).reduce(function (t, k) { return t + f.photos[k].f.length; }, 0);
    var read = Object.keys(f.pass).filter(function (k) { return ids[k]; }).length;
    var total = Object.keys(ids).length;
    var status = p.done && read >= total ? 'Ready' : 'Reading';
    var patch = { facesFileId: fileId, faceCount: faceCount, facesPhotos: read, facesStatus: status, updatedAt: fmt_(new Date()) };
    if (status === 'Ready') patch.facesAt = fmt_(new Date());
    updateRowByNumber_('Galleries', g._row, patch);
    return { status: status, faceCount: faceCount, photosRead: read, photosTotal: total };
  } finally { lock.releaseLock(); }
}

/** Logged in: photo bytes for face reading when the browser cannot read Drive images directly. */
function facesProxy_(p, user) {
  var x = staffGallery_(p.g, user), m = loadManifest_(x.g);
  var ids = {}; allPhotoIds_(m).forEach(function (id) { ids[id] = true; });
  var want = (p.ids || []).slice(0, 4), out = {};
  want.forEach(function (id) {
    if (!ids[id]) return;
    var blob = null;
    try {
      var r = UrlFetchApp.fetch('https://lh3.googleusercontent.com/d/' + id + '=w1600', { muteHttpExceptions: true, followRedirects: true });
      if (r.getResponseCode() === 200) blob = r.getBlob();
    } catch (e) {}
    if (!blob) { try { blob = DriveApp.getFileById(id).getBlob(); } catch (e) {} }
    if (blob) out[id] = 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  });
  return { images: out };
}

// =====================================================================
// 6c. Guests: name + phone (OTP later), saved "Find me" collections, Root Moment uploads with couple approval
// =====================================================================
var GUEST_COLUMNS = ['at', 'galleryId', 'guestId', 'keyHash', 'name', 'phone', 'device', 'status'];
var SET_COLUMNS = ['at', 'galleryId', 'code', 'name', 'guestId', 'device', 'ids'];
var POST_COLUMNS = ['at', 'galleryId', 'postId', 'guestId', 'name', 'phone', 'caption', 'fileId', 'mime', 'type', 'status', 'reviewedAt'];
var MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // same as TKG Moments: Apps Script request bodies stay well under ~50 MB

function publishedGallery_(gid) {
  var g = findGallery_(gid);
  if (!g || g.status !== 'Published') throw new Error('This gallery is not available.');
  return g;
}
function coupleKey_(g) {
  if (g.coupleKey) return g.coupleKey;
  var k = randomId_(20);
  updateRowByNumber_('Galleries', g._row, { coupleKey: k }); g.coupleKey = k;
  return k;
}
function guestFor_(g, p) {
  ensureTab_('Guests', GUEST_COLUMNS);
  var id = String(p.guestId || ''), key = String(p.guestKey || '');
  if (!id || !key) throw new Error('Please add your name and phone number first.');
  var row = readTable_('Guests').filter(function (x) { return x.galleryId === g.galleryId && x.guestId === id; })[0];
  if (!row || row.keyHash !== hash_(key) || row.status === 'blocked') throw new Error('Please add your name and phone number again.');
  return row;
}

/** Public: a guest says who they are (name + phone). Returns an id + key kept on their phone. */
function guestJoin_(p) {
  var g = publishedGallery_(p.g);
  var name = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 40), phone = String(p.phone || '').replace(/[^\d+]/g, '');
  if (name.length < 2) return { ok: false, error: 'Please write your name.' };
  if (phone.replace(/\D/g, '').length < 10 || phone.replace(/\D/g, '').length > 13) return { ok: false, error: 'Please write a valid mobile number.' };
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    ensureTab_('Guests', GUEST_COLUMNS);
    var key = randomId_(24), id = 'gst_' + randomId_(10);
    appendRow_('Guests', { at: fmt_(new Date()), galleryId: g.galleryId, guestId: id, keyHash: hash_(key), name: name, phone: phone, device: String(p.device || '').slice(0, 40), status: 'ok' });
    return { guestId: id, guestKey: key, name: name };
  } finally { lock.releaseLock(); }
}

/** Public: save a "Find me" result with a name → short code for a link that opens it on any phone. */
function saveSet_(p) {
  var g = publishedGallery_(p.g), name = String(p.name || '').trim().slice(0, 50);
  if (!name) return { ok: false, error: 'Give this collection a name.' };
  var m = loadManifest_(g), ids = {}; allPhotoIds_(m).forEach(function (id) { ids[id] = true; });
  var list = (p.ids || []).filter(function (id) { return ids[id]; }).slice(0, 600);
  if (!list.length) return { ok: false, error: 'No photos to save.' };
  ensureTab_('SavedSets', SET_COLUMNS);
  var code = randomId_(8);
  appendRow_('SavedSets', { at: fmt_(new Date()), galleryId: g.galleryId, code: code, name: name, guestId: String(p.guestId || ''), device: String(p.device || '').slice(0, 40), ids: list.join(',') });
  return { code: code, name: name, count: list.length };
}
/** Public: open a saved collection by its code. */
function getSet_(p) {
  var g = publishedGallery_(p.g);
  ensureTab_('SavedSets', SET_COLUMNS);
  var row = readTable_('SavedSets').filter(function (x) { return x.galleryId === g.galleryId && x.code === String(p.code || ''); })[0];
  if (!row) return { ok: false, error: 'This saved collection was not found.' };
  return { name: row.name, ids: String(row.ids || '').split(',').filter(String) };
}

function guestFolder_(g) {
  if (g.guestFolderId) { try { return DriveApp.getFolderById(g.guestFolderId); } catch (e) {} }
  var parent;
  try { parent = DriveApp.getFolderById(g.folderId); } catch (e) { throw new Error('The wedding folder cannot be opened by PicGrades.'); }
  var it = parent.getFoldersByName(GUEST_FOLDER_NAME), f;
  try { f = it.hasNext() ? it.next() : parent.createFolder(GUEST_FOLDER_NAME); }
  catch (e) { throw new Error('Uploads are not switched on for this wedding yet (PicGrades needs edit access to the wedding folder).'); }
  updateRowByNumber_('Galleries', g._row, { guestFolderId: f.getId() });
  return f;
}

/** Public (guest with name + phone): upload one photo or short video to Root Moment. It waits for the couple's approval. */
function uploadMoment_(p) {
  var g = publishedGallery_(p.g), guest = guestFor_(g, p);
  var mime = String(p.mime || ''), isVideo = /^video\//.test(mime), isPhoto = /^image\/(jpeg|png|webp|heic|heif)$/.test(mime);
  if (!isVideo && !isPhoto) return { ok: false, error: 'Only photos and videos can be uploaded.' };
  var data = String(p.base64 || '').replace(/^data:[^,]*,/, '');
  if (!data) return { ok: false, error: 'The file is empty.' };
  if (data.length * 0.75 > MAX_UPLOAD_BYTES) return { ok: false, error: 'This file is too big (max 20 MB). Try a shorter video.' };
  var cache = CacheService.getScriptCache(), rk = 'up:' + guest.guestId, used = Number(cache.get(rk) || 0);
  if (used >= 30) return { ok: false, error: 'Too many uploads for now. Please try again in an hour.' };
  cache.put(rk, String(used + 1), 3600);
  var folder = guestFolder_(g);
  var ext = isVideo ? (/quicktime/.test(mime) ? 'mov' : 'mp4') : (/png/.test(mime) ? 'png' : 'jpg');
  var postId = 'pst_' + randomId_(10);
  var blob = Utilities.newBlob(Utilities.base64Decode(data), mime, guest.name.replace(/[^\w ]+/g, '').slice(0, 20) + '_' + postId + '.' + ext);
  var file = folder.createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    ensureTab_('GuestPosts', POST_COLUMNS);
    appendRow_('GuestPosts', { at: fmt_(new Date()), galleryId: g.galleryId, postId: postId, guestId: guest.guestId, name: guest.name, phone: guest.phone,
      caption: String(p.caption || '').slice(0, 300), fileId: file.getId(), mime: mime, type: isVideo ? 'video' : 'photo', status: 'review', reviewedAt: '' });
  } finally { lock.releaseLock(); }
  return { postId: postId, status: 'review' };
}

/** Public (guest): my uploads and their status, plus the couple's thank-you note once approved. */
function myPosts_(p) {
  var g = publishedGallery_(p.g), guest = guestFor_(g, p);
  ensureTab_('GuestPosts', POST_COLUMNS);
  var posts = readTable_('GuestPosts').filter(function (x) { return x.galleryId === g.galleryId && x.guestId === guest.guestId; })
    .map(function (x) { return { postId: x.postId, fileId: x.fileId, type: x.type, caption: x.caption, status: x.status, at: x.at, reviewedAt: x.reviewedAt }; });
  return { posts: posts, thanks: g.thanksNote || defaultThanks_(g) };
}
function defaultThanks_(g) { return 'Thank you for capturing this moment and sharing it with us. It means the world to us. — ' + g.title; }

function coupleGallery_(p) {
  var g = publishedGallery_(p.g);
  if (!p.coupleKey || !g.coupleKey || String(p.coupleKey) !== String(g.coupleKey)) throw new Error('This couple link is not valid.');
  return g;
}
/** Couple link: posts waiting for approval (and recent decisions). */
function coupleQueue_(p) {
  var g = coupleGallery_(p);
  ensureTab_('GuestPosts', POST_COLUMNS);
  var all = readTable_('GuestPosts').filter(function (x) { return x.galleryId === g.galleryId; })
    .map(function (x) { return { postId: x.postId, fileId: x.fileId, type: x.type, name: x.name, caption: x.caption, status: x.status, at: x.at }; })
    .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  return { waiting: all.filter(function (x) { return x.status === 'review'; }), decided: all.filter(function (x) { return x.status !== 'review'; }).slice(0, 40), thanks: g.thanksNote || defaultThanks_(g) };
}
/** Couple link: approve or hide a guest post. */
function couplePost_(p) {
  var g = coupleGallery_(p), decision = p.decision === 'approve' ? 'approved' : p.decision === 'hide' ? 'hidden' : '';
  if (!decision) return { ok: false, error: 'Choose approve or hide.' };
  ensureTab_('GuestPosts', POST_COLUMNS);
  var row = readTable_('GuestPosts').filter(function (x) { return x.galleryId === g.galleryId && x.postId === String(p.postId || ''); })[0];
  if (!row) return { ok: false, error: 'Post not found.' };
  updateRowByNumber_('GuestPosts', row._row, { status: decision, reviewedAt: fmt_(new Date()) });
  return { postId: row.postId, status: decision };
}
/** Couple link: the thank-you note guests see once their moment is approved. */
function coupleThanks_(p) {
  var g = coupleGallery_(p), text = String(p.text || '').trim().slice(0, 400);
  if (!text) return { ok: false, error: 'Write a short note.' };
  updateRowByNumber_('Galleries', g._row, { thanksNote: text });
  return { thanks: text };
}

/** Public: photo bytes for the reel maker when the phone cannot read Drive photos directly.
 *  Only photos of a published gallery; at most 4 per call and 150 per device per hour. */
function photoData_(p) {
  var g = findGallery_(p.g);
  if (!g || g.status !== 'Published') return { ok: false, error: 'This gallery is not available.' };
  var device = String(p.device || '').slice(0, 40);
  if (device.length < 8) return { ok: false, error: 'Missing details.' };
  var m = loadManifest_(g), ids = {}; allPhotoIds_(m).forEach(function (id) { ids[id] = true; });
  var want = (p.ids || []).slice(0, 4).filter(function (id) { return ids[id]; });
  var cache = CacheService.getScriptCache(), key = 'pd:' + g.galleryId + ':' + device, used = Number(cache.get(key) || 0);
  if (used + want.length > 150) return { ok: false, error: 'Too many photos for now. Please try again in an hour.' };
  cache.put(key, String(used + want.length), 3600);
  var out = {};
  want.forEach(function (id) {
    try {
      var r = UrlFetchApp.fetch('https://lh3.googleusercontent.com/d/' + id + '=w1080', { muteHttpExceptions: true, followRedirects: true });
      if (r.getResponseCode() === 200) out[id] = 'data:' + (r.getBlob().getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(r.getBlob().getBytes());
    } catch (e) {}
  });
  return { images: out };
}

/** Public: faces of a gallery for "Find me" (the selfie never leaves the guest's phone). */
function getFaces_(p) {
  var g = findGallery_(p.g);
  if (!g || g.status !== 'Published') return { ok: false, error: 'This gallery is not available.' };
  if (g.facesStatus !== 'Ready' && g.facesStatus !== 'Needs update') return { ok: false, error: 'Face search is not ready for this gallery yet.' };
  var f = readFacesFile_(g);
  return { faces: { scale: f.scale, photos: f.photos } };
}

/** Logged in: email the gallery link to the client (you press "Send to client"). */
function sendGallery_(p, user) {
  var x = staffGallery_(p.g, user), g = x.g, s = getSettings_();
  var to = normEmail_(p.to);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: 'Enter a valid email address.' };
  var url = String(s.siteUrl || 'https://picgrades-os.vercel.app').replace(/\/+$/, '') + '/g/' + g.galleryId;
  sendEmail_(to, 'Your wedding gallery is ready · ' + g.title, esc_(g.title),
    ['Your photos from <b>' + esc_(g.companyName) + '</b> are ready to view.',
     '<a href="' + esc_(url) + '" style="display:inline-block;background:#E9B44C;color:#141413;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open the gallery</a>',
     'Tip: tap <b>Find me</b> in the gallery and take a selfie to see every photo you are in.',
     '<span style="color:#777">' + esc_(url) + '</span>'], 'gallery-send', g.galleryId);
  var at = fmt_(new Date());
  updateRowByNumber_('Galleries', g._row, { sentAt: at, sentTo: to });
  return { sentAt: at, sentTo: to, url: url };
}

/** Run once from the editor (select authorizeDrive → Run) so the script may read Drive folders. */
function authorizeDrive() {
  Logger.log('Drive access OK. Gallery data folder: ' + manifestFolder_().getName());
  try { UrlFetchApp.fetch('https://lh3.googleusercontent.com/', { muteHttpExceptions: true }); Logger.log('Photo fetch access OK.'); } catch (e) { Logger.log('Photo fetch: ' + e); }
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
