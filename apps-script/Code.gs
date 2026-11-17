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
  TBL_MEMO = {}; REQ_P = (e && e.parameter) || {};
  // Only the health check works as a plain link; everything else must be sent as a POST (keeps login tokens out of web addresses and logs).
  var action = (e && e.parameter && e.parameter.action) || 'health';
  if (action !== 'health') return respond_({ ok: false, error: 'Use POST for this action.' });
  return respond_(route_('health', {}));
}

function doPost(e) {
  TBL_MEMO = {}; REQ_P = {};
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return respond_({ ok: false, error: 'Bad JSON' });
  }
  REQ_P = body;
  return respond_(route_(body.action, body));
}

// Public actions (no login needed)
var PUBLIC_ROUTES = {
  health: health_,
  requestCode: requestCode_,
  signUp: signUp_,
  verifyCode: verifyCode_,
  getGallery: getGallery_,
  likePhoto: likePhoto_,
  getNotes: getNotes_,
  addNote: addNote_,
  findFaces: findFaces_,
  getStudio: getStudio_,
  faceBoxes: faceBoxes_,
  resolveHost: resolveHost_,
  videoOk: videoOk_,
  photoData: photoData_,
  guestJoin: guestJoin_,
  saveSet: saveSet_,
  getSet: getSet_,
  uploadMoment: uploadMoment_,
  savePost: savePost_,
  myPosts: myPosts_,
  coupleQueue: coupleQueue_,
  couplePost: couplePost_,
  storyPicks: storyPicks_,
  coupleThanks: coupleThanks_,
  coupleFeatures: coupleFeatures_,
  coupleLook: coupleLook_,
  myFind: myFind_,
  askDownload: askDownload_,
  askAccess: askAccess_,
  guestPhotos: guestPhotos_,
  foundList: foundList_,
  publishGallery: publishGallery_,
  dlRequests: dlRequests_,
  dlDecide: dlDecide_,
  dlGrant: dlGrant_
};

// Actions that need a logged-in user: handler(params, user)
var USER_ROUTES = {
  logout: logout_,
  me: me_,
  createWedding: createWedding_,
  editingEnquiry: editingEnquiry_,
  editOffers: editOffersFor_,
  enquiryStatus: enquiryStatus_,
  setAddress: setAddress_,
  domainRequest: domainRequest_,
  domainStatus: domainStatus_,
  myWeddings: myWeddings_,
  placeOrder: placeOrder_,
  editOrder: editOrder_,
  cancelOrder: cancelOrder_,
  holdOrder: holdOrder_,
  resumeOrder: resumeOrder_,
  setGallery: setGallery_,
  facesStatus: facesStatus_,
  saveFaces: saveFaces_,
  facesProxy: facesProxy_,
  sendGallery: sendGallery_,
  setFeatures: setFeatures_,
  setLook: setLook_,
  myRole: myRole_,
  setDemo: setDemo_,
  setPhotographer: setPhotographer_
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
  updateCompany: updateCompany_,
  setAllowed: setAllowed_,
  setPlan: setPlan_
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
    version: 'step67-domains',
    time: new Date().toISOString(),
    rows: counts,
    missingTabs: missing
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

  var rb = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
  var code = String(100000 + (((rb[0] & 0xff) << 16 | (rb[1] & 0xff) << 8 | (rb[2] & 0xff)) % 900000));
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

// ---------- Sign up yourself (step 65b) ----------
// A couple or a photographer makes their own account: one account (a "company" row with no editing package, so the editing
// order form stays closed) and one user. Then the normal email code signs them in. Always the same answer, so nobody can test
// which emails already have an account.
var TRIAL_DAYS = 30, TRIAL_PHOTOS = 500;
function signUp_(p) {
  var email = normEmail_(p.email), name = String(p.name || '').trim().slice(0, 60), kind = p.kind === 'photographer' ? 'photographer' : 'couple';
  var studio = String(p.studio || '').trim().slice(0, 60), phone = String(p.phone || '').replace(/[^\d+ ]/g, '').slice(0, 20);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a valid email.' };
  if (name.length < 2) return { ok: false, error: 'Please write your name.' };
  if (kind === 'photographer' && studio.length < 2) return { ok: false, error: 'Please write your studio or business name.' };
  if (String(getSettings_().signupOpen || 'on').toLowerCase() === 'off') return { ok: false, error: 'New sign-ups are paused. Please contact PicGrades.' };
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (!findUser_(email)) {
      var base = kind === 'photographer' ? studio : name, company = base, n = 2;
      while (findCompany_(company)) company = base + ' (' + n++ + ')';
      var ids = readTable_('Companies').map(function (c) { return +(String(c.companyId || '').replace(/\D/g, '')) || 0; });
      appendRow_('Companies', { companyId: 'C' + String(Math.max.apply(null, ids.concat([0])) + 1).padStart(3, '0'), companyName: company, adminEmail: email, contactName: name,
        phone: phone, packageType: '', currency: 'INR', status: 'Active', createdAt: fmt_(new Date()) });
      appendRow_('Users', { email: email, name: name, companyName: company, role: 'client', profession: kind, phone: phone, status: 'Active', joinedAt: fmt_(new Date()) });
      var adm = String(getSettings_().adminNotifyEmail || '').trim();
      if (adm) sendEmail_(adm, 'New sign-up: ' + name + ' (' + kind + ')', 'New sign-up',
        [esc_(name) + ' signed up as a <b>' + kind + '</b>.', 'Email: ' + esc_(email) + (phone ? ' · Mobile: ' + esc_(phone) : ''), kind === 'photographer' ? 'Studio: ' + esc_(company) : ''], 'signup', email);
    }
  } finally { lock.releaseLock(); }
  return requestCode_({ email: email });
}
/** A signed-in couple or photographer makes a wedding gallery from their Drive folder: a Draft with a 30-day trial. */
function createWedding_(p, user) {
  var keys = p.functions && typeof p.functions === 'object' ? p.functions : null, features = {};
  if (keys) FEATURE_KEYS.forEach(function (k) { if (k in keys) features[k] = keys[k] === 'off' || keys[k] === false ? 'off' : 'on'; });
  var now = new Date(), ends = new Date(now.getTime() + TRIAL_DAYS * 86400000);
  var r = makeGallery_({ orderId: 'W' + randomId_(10), folderUrl: p.folderUrl, title: p.title, eventDate: p.eventDate }, user,
    { made: true, limit: isStaff_(user) ? 0 : TRIAL_PHOTOS, extra: { plan: 'trial', trialEnds: fmt_(ends), features: JSON.stringify(features) } });
  if (r.ok === false || !r.galleryId) return r;
  var g = findGallery_(r.galleryId);
  var adm = String(getSettings_().adminNotifyEmail || '').trim();
  if (adm) sendEmail_(adm, 'New wedding: ' + g.title + ' (' + r.photoCount + ' photos)', 'New wedding gallery',
    [esc_(user.name || user.email) + ' made <b>' + esc_(g.title) + '</b> with ' + r.photoCount + ' photos in ' + r.events.length + ' collections.',
     'Trial ends ' + esc_(fmt_(ends).slice(0, 10)) + '.', featuresOf_(g).findme === 'on' ? 'Find me is on: faces should be read within 24 hours.' : 'Find me is off.'], 'wedding-new', g.galleryId);
  return Object.assign(r, weddingCard_(g));
}
/** The signed-in account's own weddings (the ones made by signing up). */
// ---------- Editing requests (step 65e, offers in step 66) ----------
// A couple or photographer who signed up themselves asks PicGrades to edit their photos. PicGrades is a promoter of the human
// touch — never an AI tool — so Human touch comes first; AI and AI + Human are offered because the market expects them.
//   human   — edited by hand, 4 days, ₹8 a photo
//   aihuman — AI first, then a person sets the tone they ask for, 48 hours, ₹7 a photo
//   afterai — photos already edited by another AI (Aftershoot, Imagen…) that did not come out right: a person corrects and
//             quality-checks them to the look they want, 48 hours, ₹3 a photo (the cost is only the human part). We can also
//             help train their own profile in the AI they use.
//   ai      — AI with one of our style profiles, 24 hours, ₹3 a photo
// Human touch, AI + Human and After AI need a style reference (links to photos or a profile they like).
// Prices and profiles live in Settings (editPriceHuman / editPriceAIHuman / editPriceAI, aiProfiles) so they can change.
// The first request of an account may take 150 photos free (AI or AI + Human) — in return they allow PicGrades to use those
// edits to improve its own editing (internal only). On paid requests that permission is optional. It is saved with each request.
var ENQ_COLUMNS = ['at', 'enqId', 'email', 'name', 'companyName', 'galleryId', 'title', 'photos', 'folderUrl', 'wantBy', 'phone', 'notes', 'status', 'repliedAt', 'repliedBy',
  'kind', 'profile', 'pricePer', 'freePhotos', 'total', 'consent', 'reference', 'aiTool', 'editKind', 'keep', 'fixes'];
var EDIT_DAYS = 4, FREE_SAMPLE = 150;
var EDIT_KINDS = ['human', 'aihuman', 'afterai', 'ai'], STUDIO_KINDS = ['cull', 'cullcc', 'retouch'];
// Retouching (step 67): the price covers any 3 fixes; each fix after that costs extra; a heavy fix counts as 2.
var RETOUCH_FIXES = [['spots', 'Spots'], ['blemish', 'Blemishes'], ['acne', 'Acne'], ['undereye', 'Under-eye'], ['teeth', 'Teeth whitening'], ['hair', 'Flyaway hair'],
  ['skin', 'Skin smoothing'], ['bgclean', 'Small background clean-up'], ['body', 'Body shaping', 2], ['remove', 'Remove a person or object', 2], ['bgchange', 'Background change', 2]]
  .map(function (x) { return { key: x[0], name: x[1], units: x[2] || 1 }; });
function isPhotographer_(user) { return isStaff_(user) || String(user.profession || '').toLowerCase() === 'photographer'; }
/** Retouching price for one image with these fixes. */
function retouchPer_(offer, keys) {
  var units = RETOUCH_FIXES.filter(function (f) { return keys.indexOf(f.key) > -1; }).reduce(function (t, f) { return t + f.units; }, 0);
  return { units: units, per: offer.price + Math.max(0, units - offer.included) * offer.extraFix };
}
function editOffers_() {
  var s = getSettings_(), num = function (v, d) { var n = Number(v); return n > 0 ? n : d; };
  var profiles = String(s.aiProfiles || 'Natural,Warm & golden,Bright & airy,Rich & moody').split(',').map(function (x) { return x.trim(); }).filter(String).slice(0, 12);
  return {
    human: { name: 'Human touch', price: num(s.editPriceHuman, 8), hours: 96, free: false },
    aihuman: { name: 'AI + Human', price: num(s.editPriceAIHuman, 7), hours: 48, free: true },
    afterai: { name: 'After AI', price: num(s.editPriceAfterAI, 3), hours: 48, free: false },
    ai: { name: 'AI', price: num(s.editPriceAI, 3), hours: 24, free: true },
    // step 67: for photographers only (couples never see these). Package clients keep ordering in the portal at their own rates.
    cull: { name: 'Culling', price: num(s.cullPrice, 0.8), hours: num(s.cullingOnlyHours, 72), free: false, studio: true },
    cullcc: { name: 'Culling + Colour Correction', price: num(s.cullComboPrice, 0.7), extraDays: num(s.cullingExtraDays, 3), free: false, studio: true },
    retouch: { name: 'Retouching', price: num(s.retouchPrice, 120), included: 3, extraFix: num(s.retouchExtraFix, 40), hours: num(s.retouchHours, 72), free: false, studio: true },
    fixes: RETOUCH_FIXES, profiles: profiles, freeSample: FREE_SAMPLE
  };
}
function freeLeft_(user) {
  ensureTab_('Enquiries', ENQ_COLUMNS);
  var used = readTable_('Enquiries').some(function (x) { return normEmail_(x.email) === normEmail_(user.email) && Number(x.freePhotos) > 0 && x.status !== 'closed'; });
  var c = findCompany_(user.companyName);
  return used || (c && c.packageType) ? 0 : FREE_SAMPLE;   // studios with an editing package already have their own terms
}
/** What the portal shows before a request: the three offers, the profiles and whether the free sample is still there. */
function editOffersFor_(p, user) {
  var o = editOffers_(); o.freeLeft = freeLeft_(user); o.photographer = isPhotographer_(user);
  if (!o.photographer) STUDIO_KINDS.forEach(function (k) { delete o[k]; });
  return o;
}
function editingEnquiry_(p, user) {
  var photos = Math.floor(Number(p.photos) || 0), folder = String(p.folderUrl || '').trim().slice(0, 300), notes = String(p.notes || '').trim().slice(0, 1000);
  var phone = String(p.phone || '').replace(/[^\d+ ]/g, '').slice(0, 20), wantBy = String(p.wantBy || '').slice(0, 10);
  var offers = editOffers_(), kind = EDIT_KINDS.concat(STUDIO_KINDS).indexOf(p.kind) > -1 ? p.kind : 'human', offer = offers[kind];
  var studio = STUDIO_KINDS.indexOf(kind) > -1;
  if (studio && !isPhotographer_(user)) return { ok: false, error: 'Culling and retouching are for photographers.' };
  // Culling + Colour Correction: the culling price for the whole catalog, plus the editing they choose for the photos kept
  var editKind = kind === 'cullcc' ? (EDIT_KINDS.indexOf(p.editKind) > -1 ? p.editKind : 'human') : '', ed = editKind ? offers[editKind] : null;
  var look = ed ? editKind : kind;   // what the style reference / profile rules follow
  var profile = look === 'ai' ? String(p.profile || '') : '';
  var reference = String(p.reference || '').trim().slice(0, 600), aiTool = look === 'afterai' ? String(p.aiTool || '').trim().slice(0, 40) : '';
  if (EDIT_KINDS.indexOf(look) > -1 && look !== 'ai' && reference.length < 5) return { ok: false, error: 'Add a style reference: a link to photos or a profile you like, so we match your look.' };
  if (look === 'ai' && offers.profiles.indexOf(profile) < 0) return { ok: false, error: 'Choose a style profile.' };
  if (photos < 1 || photos > 20000) return { ok: false, error: 'About how many photos? Please write a number.' };
  var keep = kind === 'cullcc' ? Math.floor(Number(p.keep) || 0) : 0;
  if (kind === 'cullcc' && (keep < 1 || keep > photos)) return { ok: false, error: 'About how many photos should we keep and edit? It can’t be more than the catalog.' };
  var fixKeys = kind === 'retouch' ? (Array.isArray(p.fixes) ? p.fixes : String(p.fixes || '').split(',')).map(String).filter(function (k) { return RETOUCH_FIXES.some(function (f) { return f.key === k; }); }) : [];
  if (kind === 'retouch' && !fixKeys.length) return { ok: false, error: 'Choose what to retouch.' };
  var rt = kind === 'retouch' ? retouchPer_(offer, fixKeys) : null;
  offer = Object.assign({}, offer, { hours: ed ? ed.hours + offer.extraDays * 24 : offer.hours });
  if (!folderIdFromUrl_(folder)) return { ok: false, error: 'Paste the Google Drive folder link of the photos to edit.' };
  if (wantBy && !/^\d{4}-\d{2}-\d{2}$/.test(wantBy)) return { ok: false, error: 'Choose a date.' };
  var days = Math.ceil(offer.hours / 24), earliest = fmt_(new Date(Date.now() + days * 86400000)).slice(0, 10);
  if (wantBy && wantBy < earliest) return { ok: false, error: offer.name + ' takes ' + (offer.hours < 72 ? offer.hours + ' hours' : days + ' days') + ' — the earliest date is ' + earliest + '.' };
  var consent = p.consent === true || p.consent === 'yes';
  var free = !studio && offer.free && p.useFree !== false && p.useFree !== 'no' ? Math.min(photos, freeLeft_(user)) : 0;
  if (free && !consent) return { ok: false, error: 'The free sample needs your permission to use these edits to improve our editing (tick the box), or choose to pay for all photos.' };
  if (!limitOk_('enq:' + normEmail_(user.email), 5, 86400)) return { ok: false, error: 'You have sent several requests today. We will reply soon.' };
  var g = null;
  if (p.galleryId) { g = findGallery_(p.galleryId); if (!g || String(g.companyName).trim().toLowerCase() !== String(user.companyName).trim().toLowerCase()) g = null; }
  var per = rt ? rt.per : offer.price;
  var total = Math.round(((photos - free) * per + (ed ? keep * ed.price : 0)) * 100) / 100;
  ensureTab_('Enquiries', ENQ_COLUMNS);
  var id = 'E' + randomId_(8);
  appendRow_('Enquiries', { at: fmt_(new Date()), enqId: id, email: normEmail_(user.email), name: user.name || '', companyName: user.companyName || '', galleryId: g ? g.galleryId : '',
    title: g ? g.title : '', photos: photos, folderUrl: folder, wantBy: wantBy, phone: phone ? "'" + phone : '', notes: notes, status: 'new', repliedAt: '', repliedBy: '',
    kind: kind, profile: profile, pricePer: per, freePhotos: free, total: total, consent: consent ? 'yes' : 'no', reference: reference, aiTool: aiTool,
    editKind: editKind, keep: keep || '', fixes: fixKeys.join(',') });
  var money = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };
  var what = offer.name + (ed ? ', edited ' + ed.name : '') + (profile ? ' (' + profile + ')' : '') + ' · ' + photos + ' photos' + (ed ? ', keep about ' + keep : '') + (free ? ' · first ' + free + ' free' : '') +
    (rt ? ' · ' + fixKeys.length + ' fix' + (fixKeys.length === 1 ? '' : 'es') + ', ' + money(rt.per) + ' an image' : '') + ' · ' + money(total) + ' estimated';
  var adm = String(getSettings_().adminNotifyEmail || '').trim();
  if (adm) sendEmail_(adm, 'Editing request: ' + offer.name + ', ' + photos + ' photos from ' + (user.name || user.email), 'Editing request',
    [esc_(user.name || user.email) + ' (' + esc_(user.email) + (phone ? ' · ' + esc_(phone) : '') + ') asks for editing.', '<b>' + esc_(what) + '</b>',
     (g ? 'Wedding: ' + esc_(g.title) + ' · ' : '') + (wantBy ? 'wanted by ' + esc_(wantBy) : 'no date given'),
     'Photos: <a href="' + esc_(folder) + '">' + esc_(folder) + '</a>', reference ? 'Style reference: ' + esc_(reference) : '', aiTool ? 'AI they used: ' + esc_(aiTool) : '', notes ? (kind === 'aihuman' ? 'Tone they want: ' : 'Notes: ') + esc_(notes) : '',
     'May PicGrades use these edits to improve its editing: <b>' + (consent ? 'yes' : 'no') + '</b>.'], 'enquiry', id);
  sendEmail_(user.email, 'We got your editing request', 'We got your editing request',
    ['Thank you' + (user.name ? ', ' + esc_(String(user.name).split(' ')[0]) : '') + '. You asked for: <b>' + esc_(what) + '</b>.',
     kind === 'cull' ? 'A person on our team picks the best photos of your catalog.' : kind === 'cullcc' ? 'We pick the best photos, then edit the ones we keep.' :
       kind === 'retouch' ? 'Each photo is retouched by hand: ' + esc_(RETOUCH_FIXES.filter(function (f) { return fixKeys.indexOf(f.key) > -1; }).map(function (f) { return f.name; }).join(', ')) + '.' :
     kind === 'human' ? 'Every photo will be edited by a person on our team — because the emotion in a photo is read and understood by people.' :
       kind === 'aihuman' ? 'AI does the first pass and a person on our team sets the tone you asked for.' :
       kind === 'afterai' ? 'A person on our team corrects and quality-checks your AI-edited photos to the look you want. We can also help you train your own profile in the AI you use.' : 'Edited with our AI using the “' + esc_(profile) + '” profile.',
     'We will confirm within a day. Ready about ' + (offer.hours < 72 ? offer.hours + ' hours' : days + ' days') + ' after you confirm. Your photos stay in your own Google Drive.'], 'enquiry-thanks', id);
  return { enqId: id, earliest: earliest, free: free, total: total };
}
/** PicGrades staff: mark an enquiry replied or closed. */
function enquiryStatus_(p, user) {
  if (!isStaff_(user)) return { ok: false, error: 'Only PicGrades can do this.' };
  var st = p.status === 'closed' ? 'closed' : p.status === 'new' ? 'new' : 'replied';
  ensureTab_('Enquiries', ENQ_COLUMNS);
  var e = readTable_('Enquiries').filter(function (x) { return x.enqId === p.enqId; })[0];
  if (!e) return { ok: false, error: 'Enquiry not found.' };
  updateRowByNumber_('Enquiries', e._row, { status: st, repliedAt: st === 'new' ? '' : fmt_(new Date()), repliedBy: st === 'new' ? '' : normEmail_(user.email) });
  return { enqId: e.enqId, status: st };
}
// ---------- Addresses and own domains (step 67) ----------
// Every wedding has its own address, the couple's names first: anika-rohan.picgrades.in (the wildcard *.picgrades.in points
// to the app on Vercel). After they pay, a couple can use their own domain (anikaandrohan.com) and a photographer one domain
// for all their weddings (studioname.com/anika-rohan). Either they already have one (we show the DNS records to add) or we
// buy it for them — always registered in the customer's name, so it is theirs forever. They pay what the domain costs us
// plus our yearly fee (Settings domainFee, ₹100) + GST on our fee. Our team adds the domain in Vercel and marks it live.
var DOMAIN_COLUMNS = ['at', 'domainId', 'host', 'mode', 'galleryId', 'companyName', 'email', 'name', 'phone', 'status', 'price', 'renewal', 'expires', 'liveAt', 'remindedAt', 'notes'];
var RESERVED_SLUGS = ['www', 'app', 'api', 'admin', 'mail', 'hub', 'studio', 'picgrades', 'g', 'c', 'p', 'ph', 'pg', 'help', 'support', 'blog'];
function galleryDomain_() { return String(getSettings_().galleryDomain || 'picgrades.in').trim().toLowerCase().replace(/^\.+|\/.*$/g, ''); }
function domainFee_() { var n = Number(getSettings_().domainFee); return n >= 0 && String(getSettings_().domainFee || '') !== '' ? n : 100; }
function slugBase_(title) {
  var t = String(title || '').toLowerCase().replace(/&|\+|\bweds\b|\band\b|\bwith\b|\bwedding\b|\bshaadi\b|\bthe\b/g, ' ');
  t = t.normalize ? t.normalize('NFKD').replace(/[̀-ͯ]/g, '') : t;
  t = t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '');
  return t.length >= 3 && RESERVED_SLUGS.indexOf(t) < 0 ? t : (t ? t + '-wedding' : 'wedding');
}
function slugTaken_(slug, exceptGid) {
  ensureTab_('Galleries', GALLERY_COLUMNS);
  return RESERVED_SLUGS.indexOf(slug) > -1 || readTable_('Galleries').some(function (g) { return String(g.slug) === slug && String(g.galleryId) !== String(exceptGid || ''); });
}
function newSlug_(title, exceptGid) {
  var base = slugBase_(title), slug = base, n = 2;
  while (slugTaken_(slug, exceptGid)) slug = base.slice(0, 36) + '-' + (n++);
  return slug;
}
/** A wedding's slug; older weddings get one the first time it is needed. */
function slugOf_(g) {
  if (g.slug) return String(g.slug);
  var slug = newSlug_(g.title, g.galleryId);
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { slug: slug }); g.slug = slug;
  return slug;
}
/** Paid = not on the free trial or the free basic gallery (weddings made with an editing order are paid). */
/** Settings addressesLive = on once *.picgrades.in points to the app (until then the PicGrades links are shared). */
function addressesLive_() { return String(getSettings_().addressesLive || '').toLowerCase() === 'on'; }
function shareAddress_(g) {
  var d = domainRows_().filter(function (x) { return String(x.galleryId) === String(g.galleryId) && x.status === 'live'; })[0];
  return d ? 'https://' + cleanHost_(d.host) : g.slug && addressesLive_() ? 'https://' + g.slug + '.' + galleryDomain_() : '';
}
function isPaid_(g) { var pl = planOf_(g).plan; return pl !== 'trial' && pl !== 'basic'; }
function ownsGallery_(g, user) { return g && (isStaff_(user) || String(g.companyName).trim().toLowerCase() === String(user.companyName).trim().toLowerCase()); }
/** The couple (owner account) or PicGrades: change the wedding's address. */
function setAddress_(p, user) {
  var g = findGallery_(p.g || p.galleryId);
  if (!ownsGallery_(g, user)) return { ok: false, error: 'Wedding not found.' };
  var slug = String(p.slug || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 40) return { ok: false, error: 'Use 3 to 40 small letters, numbers and dashes — for example anika-rohan.' };
  if (slugTaken_(slug, g.galleryId)) return { ok: false, error: slug + '.' + galleryDomain_() + ' is already taken. Try another, for example ' + slug + '-' + String(g.eventDate || '').slice(0, 4) + '.' };
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { slug: slug });
  return { slug: slug, address: 'https://' + slug + '.' + galleryDomain_() };
}
function cleanHost_(h) { return String(h || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[\/:?#].*$/, '').replace(/^www\./, '').replace(/\.+$/, ''); }
function apexOf_(host) { var parts = host.split('.'), n = /\.(co|net|org|gov|ac|edu|firm|gen|ind)\.[a-z]{2}$/.test(host) ? 3 : 2; return parts.slice(-n).join('.'); }
/** The records a customer adds at their domain company so the domain opens their wedding app. */
function dnsRecords_(host) {
  host = cleanHost_(host); var s = getSettings_(), a = String(s.dnsA || '76.76.21.21'), cname = String(s.dnsCname || 'cname.vercel-dns.com');
  if (!host) return [];
  var apex = apexOf_(host);
  if (apex === host) return [{ type: 'A', name: '@', value: a }, { type: 'CNAME', name: 'www', value: cname }];
  return [{ type: 'CNAME', name: host.slice(0, host.length - apex.length - 1), value: cname }];
}
function domainRows_() { ensureTab_('Domains', DOMAIN_COLUMNS); return readTable_('Domains'); }
function domainOfGallery_(gid) {
  var d = domainRows_().filter(function (x) { return String(x.galleryId) === String(gid) && x.status !== 'closed'; }).pop();
  return d ? { host: d.host, status: d.status, mode: d.mode, price: d.price, renewal: d.renewal, expires: d.expires, records: dnsRecords_(d.host) } : null;
}
/** Public: which wedding (or photographer page) does this address open? */
function resolveHost_(p) {
  var host = cleanHost_(p.host), path = String(p.path || '').replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase(), gd = galleryDomain_();
  if (!host) return { ok: false, error: 'No address.' };
  ensureTab_('Galleries', GALLERY_COLUMNS);
  var bySlug = function (slug, company) { return readTable_('Galleries').filter(function (g) { return String(g.slug) === slug && (!company || String(g.companyName).trim().toLowerCase() === String(company).trim().toLowerCase()); })[0]; };
  if (host === gd) return { home: true };
  if (host.slice(-gd.length - 1) === '.' + gd) {
    var g = bySlug(host.slice(0, -gd.length - 1));
    return g ? { galleryId: g.galleryId } : { ok: false, error: 'This wedding address is not set up.' };
  }
  var d = domainRows_().filter(function (x) { return cleanHost_(x.host) === host && x.status === 'live'; })[0];
  if (!d) return { ok: false, error: 'This address is not set up yet.' };
  if (d.galleryId) return { galleryId: d.galleryId };
  if (path) { var w = bySlug(path, d.companyName); return w ? { galleryId: w.galleryId } : { ok: false, error: 'This wedding is not on this page.' }; }
  ensureTab_('Studios', STUDIO_COLUMNS);
  var st = readTable_('Studios').filter(function (x) { return String(x.companyName).trim().toLowerCase() === String(d.companyName).trim().toLowerCase() && x.status !== 'Off'; })[0];
  return st ? { studio: String(st.slug) } : { ok: false, error: 'This photographer page is not ready yet.' };
}
/** A couple (one wedding) or a photographer (all their weddings) asks for their own domain — only after they pay. */
function domainRequest_(p, user) {
  var host = cleanHost_(p.host), mode = p.mode === 'buy' ? 'buy' : 'own';
  if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host) || host.length > 80) return { ok: false, error: 'Write the domain like anikaandrohan.com' };
  if (host.indexOf('picgrades') > -1 || host.slice(-galleryDomain_().length) === galleryDomain_()) return { ok: false, error: 'Write your own domain, not a PicGrades address.' };
  var g = null, company = '';
  if (p.studio) {
    if (!isPhotographer_(user)) return { ok: false, error: 'One domain for all weddings is for photographers.' };
    company = String(user.companyName || '');
    var c = findCompany_(company), mine = readTable_('Galleries').filter(function (x) { return String(x.companyName).trim().toLowerCase() === company.trim().toLowerCase(); });
    if (!isStaff_(user) && !(c && c.packageType) && !mine.some(isPaid_)) return { ok: false, error: 'Your own domain comes with the paid plan. Please upgrade first.', upgrade: upgradeLink_() };
  } else {
    g = findGallery_(p.g || p.galleryId);
    if (!ownsGallery_(g, user)) return { ok: false, error: 'Wedding not found.' };
    if (!isStaff_(user) && !isPaid_(g)) return { ok: false, error: 'Your own domain comes with the paid plan. Please upgrade first.', upgrade: upgradeLink_() };
  }
  if (domainRows_().some(function (x) { return cleanHost_(x.host) === host && x.status !== 'closed'; })) return { ok: false, error: host + ' is already asked for. We will be in touch.' };
  if (!limitOk_('dom:' + normEmail_(user.email), 5, 86400)) return { ok: false, error: 'You have sent several requests today. We will reply soon.' };
  var phone = String(p.phone || '').replace(/[^\d+ ]/g, '').slice(0, 20), id = 'D' + randomId_(8), fee = domainFee_(), records = dnsRecords_(host);
  appendRow_('Domains', { at: fmt_(new Date()), domainId: id, host: host, mode: mode, galleryId: g ? g.galleryId : '', companyName: g ? g.companyName : company, email: normEmail_(user.email),
    name: user.name || '', phone: phone ? "'" + phone : '', status: 'requested', price: '', renewal: '', expires: '', liveAt: '', remindedAt: '', notes: String(p.notes || '').trim().slice(0, 500) });
  var what = host + (g ? ' for ' + g.title : ' for all weddings of ' + company), recs = records.map(function (r) { return r.type + ' · ' + r.name + ' → ' + r.value; });
  var adm = String(getSettings_().adminNotifyEmail || '').trim();
  if (adm) sendEmail_(adm, 'Domain request: ' + host + (mode === 'buy' ? ' (buy for them)' : ' (they have it)'), 'Domain request',
    [esc_(user.name || user.email) + ' (' + esc_(user.email) + (phone ? ' · ' + esc_(phone) : '') + ') asks for <b>' + esc_(what) + '</b>.',
     mode === 'buy' ? 'Buy it in the customer’s name, then tell them the price: the domain price + ₹' + fee + ' a year + GST on our fee.' : 'They already have it. Add it to the project in Vercel; they add these records:',
     mode === 'own' ? recs.map(esc_).join('<br>') : '', 'Then mark it live on the admin page.'], 'domain', id);
  sendEmail_(user.email, 'We got your domain request: ' + host, 'Your own domain',
    ['Thank you' + (user.name ? ', ' + esc_(String(user.name).split(' ')[0]) : '') + '. You asked for <b>' + esc_(what) + '</b>.',
     mode === 'buy' ? 'We check the price and reply within a day. The domain is registered in <b>your name</b>, so it is yours forever. You pay what the domain costs + ₹' + fee + ' a year for us to look after it (+ GST on our fee). We show the renewal price too.' :
       'At the company where you bought it, add these records:<br>' + recs.map(esc_).join('<br>') + '<br>It can take a few hours to start working. We tell you when it is live.',
     'Your PicGrades address keeps working too.'], 'domain-thanks', id);
  return { domainId: id, host: host, mode: mode, records: mode === 'own' ? records : [], fee: fee };
}
/** PicGrades staff: move a domain request along. Live sends the customer their new address. */
function domainStatus_(p, user) {
  if (!isStaff_(user)) return { ok: false, error: 'Only PicGrades can do this.' };
  var d = domainRows_().filter(function (x) { return x.domainId === p.domainId; })[0];
  if (!d) return { ok: false, error: 'Domain request not found.' };
  var st = ['requested', 'waiting', 'live', 'closed'].indexOf(p.status) > -1 ? p.status : d.status, patch = { status: st };
  ['price', 'renewal'].forEach(function (k) { if (p[k] !== undefined && p[k] !== '') { var n = Number(p[k]); if (!(n >= 0)) throw new Error(k + ' must be a number.'); patch[k] = n; } });
  if (p.expires !== undefined && p.expires !== '') { if (!/^\d{4}-\d{2}-\d{2}$/.test(p.expires)) throw new Error('Expiry date like 2027-11-17.'); patch.expires = p.expires; patch.remindedAt = ''; }
  if (st === 'live' && d.status !== 'live') {
    patch.liveAt = fmt_(new Date());
    sendEmail_(d.email, 'Your own address is live: ' + d.host, 'Your address is live',
      ['Your wedding app now opens at <a href="https://' + esc_(d.host) + '">https://' + esc_(d.host) + '</a>' + (d.galleryId ? '' : ' — each wedding at https://' + esc_(d.host) + '/couple-names') + '.',
       'Share it with your guests. Your PicGrades address keeps working too.'], 'domain-live', d.domainId);
  }
  updateRowByNumber_('Domains', d._row, patch);
  return { domainId: d.domainId, status: st };
}
/** Nightly: remind 30 days and 7 days before an own domain expires, so a wedding site never goes offline by mistake. */
function domainMails_(now) {
  var sent = 0, day = 86400000, adm = String(getSettings_().adminNotifyEmail || '').trim();
  domainRows_().forEach(function (d) {
    if (d.status !== 'live' || !/^\d{4}-\d{2}-\d{2}/.test(String(d.expires))) return;
    var left = Math.ceil((parseDate_(String(d.expires).slice(0, 10) + ' 00:00:00') - now) / day), step = left <= 7 ? '7' : left <= 30 ? '30' : '';
    if (!step || left < 0 || String(d.remindedAt) === step || (step === '30' && String(d.remindedAt) === '7')) return;
    var price = Number(d.renewal) > 0 ? ' Renewal: ₹' + Number(d.renewal).toLocaleString('en-IN') + ' + ₹' + domainFee_() + ' (+ GST on our fee).' : '';
    [d.email, adm].filter(String).forEach(function (to) {
      sendEmail_(to, d.host + ' expires in ' + left + ' days', 'Renew your domain', ['<b>' + esc_(d.host) + '</b> expires on ' + esc_(String(d.expires).slice(0, 10)) + '.' + esc_(price),
        'Reply to this email and we renew it for you, so your wedding app stays online.'], 'domain-renew', d.domainId);
    });
    updateRowByNumber_('Domains', d._row, { remindedAt: step }); sent++;
  });
  return sent;
}
/** PicGrades (admin): mark a wedding paid (unlocks everything and its own domain) or back to its trial. */
function setPlan_(p, user) {
  var g = findGallery_(p.g); if (!g) throw new Error('Gallery not found.');
  var plan = p.plan === 'paid' ? 'paid' : 'trial';
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { plan: plan }); g.plan = plan;
  return { plan: planOf_(g).plan, paid: isPaid_(g) };
}
function myWeddings_(p, user) {
  ensureTab_('Galleries', GALLERY_COLUMNS);
  var key = String(user.companyName).trim().toLowerCase();
  return { weddings: readTable_('Galleries').filter(function (g) { return /^W/.test(String(g.orderId)) && String(g.companyName).trim().toLowerCase() === key; })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).map(weddingCard_) };
}
function weddingCard_(g) {
  var ends = g.trialEnds ? parseDate_(g.trialEnds) : null, left = ends ? Math.max(0, Math.ceil((ends - new Date()) / 86400000)) : null;
  var site = String(getSettings_().siteUrl || 'https://picgrades-os.vercel.app').replace(/\/+$/, '');
  return { galleryId: g.galleryId, title: g.title, eventDate: g.eventDate, photoCount: Number(g.photoCount || 0), status: g.status === 'Draft' ? 'Draft' : 'Published',
    plan: planOf_(g).plan, trialEnds: g.trialEnds || '', daysLeft: left, basicEnds: planOf_(g).basicEnds || '', upgrade: upgradeLink_(), facesStatus: g.facesStatus || '', features: featuresOf_(g),
    guestLink: site + '/g/' + g.galleryId, coupleLink: site + '/c/' + g.galleryId + '/' + coupleKey_(g), photographerLink: site + '/ph/' + g.galleryId,
    address: 'https://' + slugOf_(g) + '.' + galleryDomain_(), slug: slugOf_(g), addressLive: addressesLive_(), paid: isPaid_(g), domain: domainOfGallery_(g.galleryId), domainFee: domainFee_() };
}

function publicUser_(u) {
  return { email: normEmail_(u.email), name: u.name, companyName: u.companyName, role: u.role, profession: u.profession || '' };
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

function galleryStatusOf_(gid) {
  try { var g = findGallery_(gid); return g ? (g.status === 'Draft' ? 'Draft' : 'Published') : ''; } catch (e) { return ''; }
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
  if (out.galleryId) out.galleryStatus = galleryStatusOf_(out.galleryId);   // step 62b: Draft / Published on the order and admin pages
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
  if (!/^https:\/\/\S+$/i.test(String(o.catalogLink).trim())) return { error: 'The catalog link must be a web link starting with https://' };
  if (String(o.referenceLinks || '').split(/[\s,]+/).filter(String).some(function (l) { return !/^https:\/\/\S+$/i.test(l); })) return { error: 'Reference links must be web links starting with https://' };

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
  if (bw !== '' && Number(bw) > 100) return { error: 'Black & white must be between 0 and 100 %.' };
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
/** step 65b: the owner of a gallery. Weddings made with an editing order use the order; weddings made by signing up yourself
 *  ('W…' ids, no editing order) belong to the account that made them. Billing and credits never see the 'W' weddings. */
function ownerOrder_(orderId, user, makeNew) {
  if (/^W[A-Za-z0-9]+$/.test(String(orderId || ''))) {
    if (makeNew) return { orderId: orderId, companyName: user.companyName, status: 'Gallery', _row: 0 };
    ensureTab_('Galleries', GALLERY_COLUMNS);
    var g = readTable_('Galleries').filter(function (x) { return String(x.orderId) === String(orderId); })[0];
    if (!g || (!isStaff_(user) && String(g.companyName).trim().toLowerCase() !== String(user.companyName).trim().toLowerCase())) throw new Error('Wedding not found.');
    return { orderId: orderId, companyName: g.companyName, status: 'Gallery', _row: 0 };
  }
  return loadOrder_(orderId, user);
}
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
  // step 65b: weddings people made themselves (no editing order) — Find me faces are due within 24 hours
  ensureTab_('Galleries', GALLERY_COLUMNS);
  var self = readTable_('Galleries').filter(function (g) { return /^W/.test(String(g.orderId)); })
    .sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }).slice(0, 30)
    .map(function (g) { var c = weddingCard_(g); c.companyName = g.companyName; c.createdAt = g.createdAt; c.createdBy = g.createdBy;
      c.facesDue = fmt_(new Date(parseDate_(g.createdAt).getTime() + 24 * 3600000)); return c; });
  ensureTab_('Enquiries', ENQ_COLUMNS);
  var enq = readTable_('Enquiries').sort(function (a, b) { return (a.status === 'new' ? 0 : 1) - (b.status === 'new' ? 0 : 1) || String(b.at).localeCompare(String(a.at)); }).slice(0, 30)
    .map(function (e) { var o = {}; ENQ_COLUMNS.forEach(function (k) { o[k] = e[k]; }); o.phone = String(o.phone || '').replace(/^'/, ''); return o; });
  ensureTab_('Domains', DOMAIN_COLUMNS);
  var doms = readTable_('Domains').sort(function (a, b) { return (a.status === 'live' || a.status === 'closed' ? 1 : 0) - (b.status === 'live' || b.status === 'closed' ? 1 : 0) || String(b.at).localeCompare(String(a.at)); }).slice(0, 30)
    .map(function (d) { var o = {}; DOMAIN_COLUMNS.forEach(function (k) { o[k] = d[k]; }); o.records = dnsRecords_(d.host); return o; });
  return { open: open.map(function (o) { return publicOrder_(o, s, user); }), recentDone: done.map(function (o) { return publicOrder_(o, s, user); }), weddings: self, enquiries: enq, domains: doms };
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
    var pay = { paymentId: 'PAY' + Utilities.formatDate(new Date(), tz_(), 'yyMMddHHmmss') + '-' + randomId_(4), date: date, companyName: c.companyName,
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
    appendRow_('Payments', { paymentId: 'ADJ' + Utilities.formatDate(new Date(), tz_(), 'yyMMddHHmmss') + '-' + randomId_(4), date: fmt_(new Date()), companyName: c.companyName,
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
  if (TBL_MEMO[name + ':cols'] === cols.join()) return;   // already checked in this request (step 59)
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = cols.filter(function (c) { return head.indexOf(c) < 0; });
  missing.forEach(function (c, i) { sh.getRange(1, head.length + i + 1).setValue(c); });
  if (missing.length) tableChanged_(name);
  TBL_MEMO[name + ':cols'] = cols.join();
}

// =====================================================================
// 5e. Galleries (Drive folder → Root Moment + event galleries)
// =====================================================================

var GALLERY_COLUMNS = ['galleryId', 'orderId', 'companyName', 'title', 'eventDate', 'folderId', 'folderUrl', 'manifestFileId',
  'photoCount', 'rootCount', 'status', 'createdAt', 'updatedAt', 'createdBy',
  'facesFileId', 'facesStatus', 'faceCount', 'facesPhotos', 'facesAt', 'sentAt', 'sentTo', 'publishedAt', 'publishedBy',
  'coupleKey', 'thanksNote', 'guestFolderId', 'portfolio',
  'features', 'allowed', 'theme', 'layout', 'pages', 'demo', 'photographer', 'credit', 'custom', 'storyPicks', 'guestPhotos', 'plan', 'trialEnds', 'trialMail', 'slug'];   // slug (step 67): the wedding's own address, couple's names first — anika-rohan.picgrades.in   // trialMail (step 65d): 'warned' / 'ended' — the trial emails already sent   // plan / trialEnds (step 65b): a self-made wedding starts a 30-day trial   // guestPhotos (step 63b): 'findme' = guests see photos only after Find me · '' / 'open' = open gallery   // storyPicks: photos the couple / photographer chose for the story (JSON, step 56)   // custom: the wedding's own Hub from the Hub editor (JSON, step 44)
   // photographer: who photographed this wedding (JSON, step 42); credit: 'off' hides PicGrades' name
   // demo: 'yes' = a demo wedding where anyone can try the Control Panel (changes stay on their phone, step 39)
   // theme / layout: the wedding's look ('' = the original look); pages: style of each page, e.g. {"event":"collage"} (step 36) — all chosen in the app's Control Panel
   // features: the couple's / photographer's on-off per function (JSON); allowed: PicGrades' master switches by plan (JSON, empty = all allowed)   // portfolio: '' = shown on the photographer's page (default), 'off' = the couple turned it off
var NOTE_COLUMNS = ['at', 'galleryId', 'photoId', 'type', 'device', 'name', 'text', 'status'];
var EVENT_ORDER = ['haldi', 'mehendi', 'mehndi', 'sangeet', 'wedding', 'pheras', 'reception'];
var ROOT_FOLDER_RE = /^0*_?root[ _-]*moments?$/i;
var GUEST_FOLDER_NAME = '01_Guest_Moments';
var POSTS_FOLDER_NAME = '02_Posts_Albums';

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
  var events = [], root = [], portfolio = [], subs = folder.getFolders();
  while (subs.hasNext()) {
    var sf = subs.next();
    if (sf.isTrashed() || sf.getName() === GUEST_FOLDER_NAME || sf.getName() === POSTS_FOLDER_NAME) continue; // guest uploads are shown only after approval
    var photos = listImages_(sf);
    if (ROOT_FOLDER_RE.test(sf.getName().replace(/\s+/g, '_'))) { root = photos; continue; }
    if (PORTFOLIO_FOLDER_RE.test(sf.getName().replace(/\s+/g, '_'))) { portfolio = photos; continue; }   // the photographer's picks for their portfolio
    if (photos.length) events.push({ name: cleanEventName_(sf.getName()), folder: sf.getName(), photos: photos });
  }
  var loose = listImages_(folder);
  if (loose.length) events.push({ name: 'Highlights', folder: '', photos: loose });
  var rank = function (e) { return e.folder ? eventRank_(e.folder) : 1000; };
  events.sort(function (a, b) { return rank(a) - rank(b) || a.folder.localeCompare(b.folder, 'en', { numeric: true }); });
  var count = events.reduce(function (t, e) { return t + e.photos.length; }, 0) + root.length;
  if (!count) throw new Error('No photos found. Put JPG/PNG photos in event folders (Haldi, Wedding…) inside the shared folder.');
  return { folderName: folder.getName(), events: events, root: root, portfolio: portfolio, photoCount: count };
}

function manifestFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('MANIFEST_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder('PicGrades OS · gallery data (do not edit)');
  props.setProperty('MANIFEST_FOLDER', f.getId());
  return f;
}

/** Random id from Google's secure random source (Math.random is not safe for keys). */
function randomId_(n) {
  var abc = 'abcdefghijkmnopqrstuvwxyz23456789', s = '';
  while (s.length < n) {
    var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid());
    for (var i = 0; i < bytes.length && s.length < n; i++) { var b = bytes[i] & 0xff; if (b < 231) s += abc.charAt(b % 33); }  // 231 = 7×33, keeps every letter equally likely
  }
  return s;
}

/** Create or refresh the gallery for an order. Staff: any order. Client: own studio's orders. */
function setGallery_(p, user) { return makeGallery_(p, user, {}); }
/** opts (step 65b, never from the browser): made = a new 'W' wedding, limit = most photos allowed, extra = more columns for a new row. */
function makeGallery_(p, user, opts) {
  // Reading the wedding folder can take a minute for 2,000 photos, so it happens before the lock:
  // other studios and guests are not kept waiting meanwhile. Only the Sheet writes are locked.
  {
    ensureOrderColumns_(); ensureTab_('Galleries', GALLERY_COLUMNS);
    var o = ownerOrder_(p.orderId, user, !!opts.made);
    if (statusKey_(o.status) === 'cancelled') return { ok: false, error: 'This order was cancelled.' };
    var existing = readTable_('Galleries').filter(function (g) { return String(g.orderId) === String(o.orderId); })[0];
    var folderId = folderIdFromUrl_(p.folderUrl) || (existing && existing.folderId);
    if (!folderId) return { ok: false, error: 'Paste the Google Drive folder link (it contains /folders/).' };
    var scan = scanWeddingFolder_(folderId);
    var lim = opts.limit || (existing && existing.plan === 'trial' && !isStaff_(user) ? TRIAL_PHOTOS : 0);   // trial weddings stay within 500 photos, also when refreshed
    if (lim && scan.photoCount > lim) return { ok: false, tooMany: true, photoCount: scan.photoCount,
      error: 'The free trial is for weddings up to ' + lim + ' photos. This folder has ' + scan.photoCount + '. Please share a folder with your best ' + lim + ' photos, or contact PicGrades for more.' };
    var title = String(p.title || (existing && existing.title) || scan.folderName.replace(/[_]+/g, ' ')).trim().slice(0, 80);
    var eventDate = /^\d{4}-\d{2}-\d{2}$/.test(String(p.eventDate || '')) ? p.eventDate : (existing ? existing.eventDate : '');
    var manifest = {
      v: 1, title: title, eventDate: eventDate, studio: o.companyName, folderName: scan.folderName,
      root: scan.root, events: scan.events, portfolio: scan.portfolio || [], updatedAt: fmt_(new Date())
    };
    var json = JSON.stringify(manifest);
  }
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    existing = readTable_('Galleries').filter(function (g) { return String(g.orderId) === String(o.orderId); })[0];   // read again inside the lock
    var fileId;
    if (existing && existing.manifestFileId) {
      try { DriveApp.getFileById(existing.manifestFileId).setContent(json); fileId = existing.manifestFileId; } catch (e) { fileId = null; }
    }
    if (!fileId) fileId = manifestFolder_().createFile('gallery-' + o.orderId + '.json', json, 'application/json').getId();
    var row = {
      orderId: o.orderId, companyName: o.companyName, title: title, eventDate: eventDate, folderId: folderId,
      folderUrl: 'https://drive.google.com/drive/folders/' + folderId, manifestFileId: fileId,
      photoCount: scan.photoCount, rootCount: scan.root.length, status: existing ? (existing.status || 'Published') : 'Draft', updatedAt: fmt_(new Date())   // step 62b: new = Draft
    };
    var gid;
    if (existing) { gid = existing.galleryId; updateRowByNumber_('Galleries', existing._row, row); }
    else {
      gid = randomId_(12);
      appendRow_('Galleries', Object.assign({ galleryId: gid, createdAt: fmt_(new Date()), createdBy: normEmail_(user.email), guestPhotos: 'findme', slug: newSlug_(row.title || p.title) }, opts.extra || {}, row));   // step 63b: new weddings: photos only after Find me
    }
    if (existing && existing.facesFileId) {
      var known = readFacesFile_(existing).pass, ids = allPhotoIds_(manifest);
      var missing = ids.filter(function (id) { return !known[id]; }).length;
      if (missing) updateRowByNumber_('Galleries', existing._row, { facesStatus: 'Needs update' });
    }
    cacheRemoveBig_('gal:' + gid); dropSummary_(gid);
    if (o._row) updateRowByNumber_('Orders', o._row, { galleryLink: gid });
    return { galleryId: gid, status: row.status, photoCount: scan.photoCount, rootCount: scan.root.length,
      events: scan.events.map(function (e) { return { name: e.name, count: e.photos.length }; }) };
  } finally { lock.releaseLock(); }
}

function findGallery_(gid) {
  ensureTab_('Galleries', GALLERY_COLUMNS);
  return readTable_('Galleries').filter(function (g) { return String(g.galleryId) === String(gid || ''); })[0] || null;
}

function loadManifest_(g) {
  var cache = CacheService.getScriptCache(), key = 'gal:' + g.galleryId;
  var hit = cacheGetBig_(key);
  if (hit) return JSON.parse(hit);
  var json = DriveApp.getFileById(g.manifestFileId).getBlob().getDataAsString();
  cachePutBig_(key, json, 21600);
  return JSON.parse(json);
}

/** Public: everything the gallery page needs. */
function getGallery_(p) {
  var g = findGallery_(p.g);
  if (g && g.status === 'Draft' && !privileged_(g, p)) return { ok: false, draft: true, title: g.title, error: 'This wedding is being prepared. Please come back soon.' };
  if (!openTo_(g, p)) return { ok: false, error: 'This gallery is not available.' };
  var m = loadManifest_(g), sum = gallerySummary_(g);
  m.status = g.status === 'Draft' ? 'Draft' : 'Published';   // step 62b
  m.galleryId = g.galleryId;
  m.likes = sum.likes; m.notes = sum.noteCount; m.recentNotes = sum.recent; m.guestPosts = sum.posts;
  m.mine = {};   // each phone remembers its own hearts (no per-phone scan on the server)
  m.faceSearch = g.facesStatus === 'Ready' || g.facesStatus === 'Needs update';
  m.isCouple = !!(p.coupleKey && g.coupleKey && String(p.coupleKey) === String(g.coupleKey));
  m.features = featuresOf_(g);
  m.theme = lookId_(g.theme); m.layout = lookId_(g.layout); m.pages = pagesOf_(g.pages); m.demo = isDemo_(g);
  m.custom = customOf_(g.custom);
  m.story = picksOf_(g.storyPicks);
  m.photographer = photographerOf_(g.photographer); if (m.photographer.name) m.studio = m.photographer.name; m.credit = String(g.credit || '').toLowerCase() !== 'off';
  // Demo period: 'open' = reels and Find me for everyone without name/phone. Set Settings › guestGate = on to require them.
  m.guestGate = String(getSettings_().guestGate || 'open').toLowerCase() === 'on' ? 'on' : 'open';
  m.guestPhotos = guestPhotosOf_(g);
  if (gatedFor_(g, p)) gateManifest_(g, m, p);
  if (g.plan && privileged_(g, p)) { m.plan = planOf_(g); m.plan.upgrade = upgradeLink_(); }   // step 65d: only the couple / photographer see the plan
  m.address = shareAddress_(g);   // step 67: the link guests share — their own domain, or anika-rohan.picgrades.in once that is switched on
  return { gallery: m };
}

// ---------- No photos without Find me (step 63b) ----------
// A wedding set to 'findme': a guest's phone receives only the photos it may see. Before Find me: the Wedding Highlights and the
// photos the couple chose for the Hub's look (cover, bride, groom). After Find me: also each event's highlights and their own photos,
// and every photo of an event the couple opened for them (a 'more' request). Root Moment (the couple's posts) stays open.
function guestPhotosOf_(g) { return String(g && g.guestPhotos || '') === 'findme' ? 'findme' : 'open'; }
function gatedFor_(g, p) { return guestPhotosOf_(g) === 'findme' && !isDemo_(g) && !privileged_(g, p || REQ_P || {}); }
function photoMap_(m) { var o = {}; (m.root || []).forEach(function (x) { o[x.id] = x; }); (m.events || []).forEach(function (e) { (e.photos || []).forEach(function (x) { if (!o[x.id]) o[x.id] = x; }); }); return o; }
/** What this guest may see: { found, ids (set), events (event name → true for events opened in full) }. */
function guestSees_(g, m, p) {
  var st = picksOf_(g.storyPicks), ids = {}, add = function (l) { (l || []).forEach(function (id) { if (id) ids[id] = true; }); };
  add(st.wh); add(st.cover); add([st.bride, st.groom, st.welcome]);
  var guest = null, row = null, full = {};
  try { guest = guestFor_(g, p); row = foundRow_(g, guest.phone); } catch (e) {}
  if (row) {
    add(String(row.sure || '').split(',').filter(String));
    Object.keys(st.hl || {}).forEach(function (k) { add(st.hl[k]); });
    ensureTab_('DownloadRequests', DLREQ_COLUMNS);
    var d = digits_(guest.phone);
    readTable_('DownloadRequests').forEach(function (x) { if (x.galleryId === g.galleryId && x.kind === 'more' && x.status === 'approved' && digits_(x.phone) === d) full[x.event] = true; });
    (m.events || []).forEach(function (e) { if (full[e.name]) add((e.photos || []).map(function (x) { return x.id; })); });
  }
  return { found: !!row, sure: row ? String(row.sure || '').split(',').filter(String) : [], ids: ids, full: full, story: st };
}
function gateManifest_(g, m, p) {
  var map = photoMap_(m), see = guestSees_(g, m, p), st = see.story;
  var pick = function (l) { return (l || []).map(function (id) { return map[id]; }).filter(Boolean); };
  var whSet = {}; (st.wh || []).forEach(function (id) { whSet[id] = true; });
  m.highlights = pick(st.wh);
  m.events = (m.events || []).map(function (e) {
    var o = {}; Object.keys(e).forEach(function (k) { if (k !== 'photos') o[k] = e[k]; });
    var own = (e.photos || []).filter(function (x) { return whSet[x.id]; });   // this event's Wedding Highlights: public, used as its cover
    o.photos = see.full[e.name] ? e.photos : see.found ? pick((st.hl || {})[e.name]) : [];
    o.teaser = (o.photos.length ? o.photos : own).slice(0, 3);
    o.locked = !see.full[e.name]; o.full = !!see.full[e.name];
    return o;
  });
  m.root = (m.root || []).filter(function (x) { return see.ids[x.id]; });
  m.pool = pick(Object.keys(see.ids));   // every photo this phone may open (Find me results, cover photos…)
  m.found = see.found; m.gated = true;
  var keep = function (o) { var out = {}; Object.keys(o || {}).forEach(function (id) { if (see.ids[id]) out[id] = o[id]; }); return out; };
  m.likes = keep(m.likes); m.notes = keep(m.notes);
  m.recentNotes = (m.recentNotes || []).filter(function (n) { return see.ids[n.photoId]; });
  return m;
}
// ---------- Found with Find me (step 65a) ----------
// The couple sees every guest Find me found: their face from a wedding photo (never their selfie), name, mobile, side,
// whether they attended, how many photos and when. Only the couple — and PicGrades staff, for support. Not the photographer.
function foundList_(p) {
  var g = findGallery_(p.g); if (!g) return { ok: false, error: 'This gallery is not available.' };
  var who = privileged_(g, p), staff = false;
  if (who !== 'couple' && p.token) { var u = authUser_(p.token); staff = !!(u && isStaff_(u)); }
  if (who !== 'couple' && !staff) return { ok: false, error: 'Only the couple can see this list.' };
  ensureTab_('FindMe', FIND_COLUMNS); ensureTab_('Guests', GUEST_COLUMNS);
  var guests = {}; readTable_('Guests').forEach(function (x) { if (x.galleryId === g.galleryId) guests[x.guestId] = x; });
  var f = readFacesFile_(g), last = {};
  readTable_('FindMe').forEach(function (x) {   // the latest found / close row per mobile number
    if (x.galleryId !== g.galleryId || (x.status !== 'ok' && x.status !== 'close')) return;
    last[digits_(x.phone)] = x;
  });
  var list = Object.keys(last).map(function (k) {
    var x = last[k], gu = guests[x.guestId] || {}, sure = String(x.sure || '').split(',').filter(String);
    return { name: x.name, phone: String(x.phone || '').replace(/^'/, ''), side: gu.side || '', attended: gu.attended || '',
      status: x.status, count: sure.length, at: x.at, photos: sure, face: faceOf_(f, x.face, sure) };
  });
  list.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  return { guests: list };
}
/** The guest's face in a wedding photo: the saved 'photoId:n', or — for finds from before step 65a — the face that appears
 *  in all of their photos (the one closest to faces in their other photos). */
function faceOf_(f, ref, sure) {
  var ph = f.photos || {}, pick = function (pid, k) { var e = ph[pid]; if (!e || !e.f || !e.f[k]) return null; return { pid: pid, box: e.f[k][0], w: e.w, h: e.h }; };
  if (ref) { var r = String(ref).split(':'); var out = pick(r[0], +r[1]); if (out) return out; }
  var ids = sure.filter(function (id) { return ph[id] && (ph[id].f || []).length; }).slice(0, 6); if (!ids.length) return null;
  var first = ph[ids[0]].f, best = 0, bestScore = Infinity;
  if (first.length > 1 && ids.length > 1) first.forEach(function (fc, k) {
    var a = faceBytes_(fc[1]); if (!a) return; var score = 0;
    ids.slice(1).forEach(function (id) { var m = Infinity; ph[id].f.forEach(function (o) { var b = faceBytes_(o[1]); if (b) m = Math.min(m, faceDist_(a, b)); }); score += m; });
    if (score < bestScore) { bestScore = score; best = k; }
  });
  return pick(ids[0], best);
}

/** Couple link or staff login: guests see photos only after Find me ('findme') or the gallery is open to everyone ('open'). */
function guestPhotos_(p) {
  var g = findGallery_(p.g); if (!g) return { ok: false, error: 'This gallery is not available.' };
  if (!privileged_(g, p)) return { ok: false, error: 'Only the couple or the photographer can change this.' };
  var mode = p.mode === 'open' ? 'open' : 'findme';
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { guestPhotos: mode });
  return { guestPhotos: mode };
}

/** Likes, notes and approved posts of one gallery, worked out once and kept for a minute.
 *  On the wedding day hundreds of guests open the gallery together: they share this instead of each reading the Sheet. */
function gallerySummary_(g) {
  var key = 'sum:' + g.galleryId, hit = cacheGetBig_(key);
  if (hit) return JSON.parse(hit);
  ensureTab_('MomentNotes', NOTE_COLUMNS); ensureTab_('GuestPosts', POST_COLUMNS);
  var taps = {}, likes = {}, noteCount = {}, notes = {}, recent = [];
  readTable_('MomentNotes').forEach(function (n) {
    if (String(n.galleryId) !== g.galleryId) return;
    if (n.type === 'likeTotal') { likes[n.photoId] = (likes[n.photoId] || 0) + Number(n.text || 0); return; }   // hearts packed by the nightly clean-up
    if (n.type === 'like' || n.type === 'unlike') { var k = n.photoId + '|' + n.device; (taps[k] = taps[k] || []).push(n.status === 'hidden' ? 'unlike' : n.type); return; }
    if (n.type === 'note' && n.status !== 'hidden') {
      noteCount[n.photoId] = (noteCount[n.photoId] || 0) + 1;
      var x = { photoId: n.photoId, name: n.name, text: n.text, at: n.at };
      (notes[n.photoId] = notes[n.photoId] || []).push(x); recent.push(x);
    }
  });
  Object.keys(taps).forEach(function (k) { var id = k.split('|')[0]; likes[id] = Math.max(0, (likes[id] || 0) + tapsNet_(taps[k])); });
  recent.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  var posts = readTable_('GuestPosts').filter(function (x) { return x.galleryId === g.galleryId && x.status === 'approved'; })
    .map(function (x) { return { postId: x.postId, fileId: x.fileId, type: x.type, name: x.name, caption: x.caption, at: x.at }; })
    .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  var sum = { stamp: randomId_(6), likes: likes, noteCount: noteCount, notes: notes, recent: recent.slice(0, 30), posts: posts };
  cachePutBig_(key, JSON.stringify(sum), 60);
  return sum;
}
function dropSummary_(gid) { cacheRemoveBig_('sum:' + gid); }

function likePhoto_(p) {
  var g = findGallery_(p.g);
  if (!openTo_(g, p)) return { ok: false, error: 'This gallery is not available.' };
  var device = String(p.device || '').slice(0, 40), photo = String(p.photoId || '');
  if (device.length < 8 || !photo) return { ok: false, error: 'Missing details.' };
  var want = p.liked === undefined ? true : !!p.liked;   // the phone says heart on or off
  if (!limitOk_('lk:' + g.galleryId, 6000, 3600) || !limitOk_('lkd:' + device, 400, 3600)) return { ok: false, error: 'Too many hearts for now. Please try again later.' };
  var sum = gallerySummary_(g);
  ensureTab_('MomentNotes', NOTE_COLUMNS);
  // no lock and no Sheet scan: one new row; the summary counts each phone's last tap
  appendRow_('MomentNotes', { at: fmt_(new Date()), galleryId: g.galleryId, photoId: photo, type: want ? 'like' : 'unlike', device: device, status: 'ok' });
  // hearts since the summary was made are counted on the side, so the number the guest sees stays right
  var c = CacheService.getScriptCache(), dk = 'ld:' + g.galleryId + ':' + sum.stamp + ':' + photo, delta = Number(c.get(dk) || 0) + (want ? 1 : -1);
  c.put(dk, String(delta), 120);
  var count = Math.max(0, (sum.likes[photo] || 0) + delta);
  return { liked: want, likes: count };
}

function getNotes_(p) {
  var g = findGallery_(p.g);
  if (!openTo_(g, p)) return { ok: false, error: 'This gallery is not available.' };
  var list = (gallerySummary_(g).notes[String(p.photoId || '')] || []).map(function (n) { return { at: n.at, name: n.name, text: n.text }; });
  return { notes: list };
}

function addNote_(p) {
  var g = findGallery_(p.g);
  if (!openTo_(g, p)) return { ok: false, error: 'This gallery is not available.' };
  var name = String(p.name || '').trim().slice(0, 40), text = String(p.text || '').trim().slice(0, 280);
  var device = String(p.device || '').slice(0, 40), photo = String(p.photoId || '');
  if (!name) return { ok: false, error: 'Add your name.' };
  if (!text) return { ok: false, error: 'Write a note first.' };
  if (device.length < 8 || !photo) return { ok: false, error: 'Missing details.' };
  if (!limitOk_('nt:' + device, 20, 3600) || !limitOk_('ntg:' + g.galleryId, 500, 3600)) return { ok: false, error: 'Too many notes in a short time. Please try again later.' };
  ensureTab_('MomentNotes', NOTE_COLUMNS);
  appendRow_('MomentNotes', { at: fmt_(new Date()), galleryId: g.galleryId, photoId: photo, type: 'note', device: device, name: name, text: text, status: 'ok' });
  dropSummary_(g.galleryId);
  return { note: { at: fmt_(new Date()), name: name, text: text } };
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
  var o = ownerOrder_(g.orderId, user); // clients only reach their own studio's galleries (step 65b: also their own 'W' weddings)
  return { g: g, o: o };
}

/** Logged in: what the face-reading page needs (photo list, progress, faces so far, due time). */
function facesStatus_(p, user) {
  var x = staffGallery_(p.g, user), g = x.g, o = x.o, m = loadManifest_(g), f = readFacesFile_(g);
  var photos = [], seen = {};
  (m.root || []).forEach(function (ph) { if (!seen[ph.id]) { seen[ph.id] = 1; photos.push({ id: ph.id, set: 'Root Moment' }); } });
  (m.events || []).forEach(function (e) { e.photos.forEach(function (ph) { if (!seen[ph.id]) { seen[ph.id] = 1; photos.push({ id: ph.id, set: e.name }); } }); });
  var self = /^W/.test(String(g.orderId)), done = parseDate_(self ? g.createdAt : o.completedAt);   // step 65c: sign-up weddings: due 24 h after they were made
  var due = done.getTime() > 0 ? fmt_(new Date(done.getTime() + (self ? 24 : FACE_DUE_HOURS) * 3600000)) : '';
  return {
    gallery: { galleryId: g.galleryId, title: g.title, studio: g.companyName, catalogName: o.catalogName,
      status: g.facesStatus || '', faceCount: Number(g.faceCount || 0), sentAt: g.sentAt || '', sentTo: g.sentTo || '',
      dueAt: due, clientEmail: o.email || '', coupleKey: coupleKey_(g), features: featuresOf_(g), demo: isDemo_(g), published: g.status !== 'Draft',
      selfMade: self, staff: isStaff_(user), plan: g.plan || '' },   // step 65c: the couple / photographer who made it reads faces on their own phone (simple page)
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
var GUEST_COLUMNS = ['at', 'galleryId', 'guestId', 'keyHash', 'name', 'phone', 'device', 'status', 'side', 'attended'];   // side / attended: the guest welcome (step 63c)
var SET_COLUMNS = ['at', 'galleryId', 'code', 'name', 'guestId', 'device', 'ids'];
var POST_COLUMNS = ['at', 'galleryId', 'postId', 'guestId', 'name', 'phone', 'caption', 'fileId', 'mime', 'type', 'status', 'reviewedAt'];
var MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // same as TKG Moments: Apps Script request bodies stay well under ~50 MB

// Step 62b: a new wedding starts as a Draft. Guests see it only once the couple, the photographer or PicGrades publishes it;
// those three see the draft (couple key, or a staff login of this studio). Older weddings have no status change: they stay Published.
var REQ_P = {};
function openTo_(g, p) {
  if (!g) return false;
  if (g.status === 'Published') return true;
  return g.status === 'Draft' && !!privileged_(g, p || REQ_P || {});
}
function publishedGallery_(gid) {
  var g = findGallery_(gid);
  if (!openTo_(g)) throw new Error(g && g.status === 'Draft' ? 'This wedding is being prepared. Please come back soon.' : 'This gallery is not available.');
  return g;
}
/** Couple link or staff login: publish the wedding (guests can open it) or take it back to a draft. */
function publishGallery_(p) {
  var g = findGallery_(p.g);
  if (!g) return { ok: false, error: 'This gallery is not available.' };
  var who = privileged_(g, p);
  if (!who) return { ok: false, error: 'Only the couple, the photographer or PicGrades can publish this wedding.' };
  var on = !(p.publish === false || p.publish === 'false');
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { status: on ? 'Published' : 'Draft', publishedAt: on ? fmt_(new Date()) : '', publishedBy: on ? who : '' });
  return { status: on ? 'Published' : 'Draft' };
}
function coupleKey_(g) {
  if (g.coupleKey) return g.coupleKey;
  var k = randomId_(20);
  updateRowByNumber_('Galleries', g._row, { coupleKey: k }); g.coupleKey = k;
  return k;
}
/** step 63c: the guest welcome asks "Which side are you from?" */
function sideOf_(v) { v = String(v || ''); return v === 'bride' || v === 'groom' || v === 'both' ? v : ''; }
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
  if (!limitOk_('gj:' + String(p.device || phone).slice(0, 40), 5, 3600) || !limitOk_('gjg:' + g.galleryId, 600, 3600)) return { ok: false, error: 'Too many sign-ins for now. Please try again later.' };
  ensureTab_('Guests', GUEST_COLUMNS);
  var key = randomId_(24), id = 'gst_' + randomId_(10);
  appendRow_('Guests', { at: fmt_(new Date()), galleryId: g.galleryId, guestId: id, keyHash: hash_(key), name: name, phone: phone, device: String(p.device || '').slice(0, 40), status: 'ok', side: sideOf_(p.side), attended: p.attended === 'yes' || p.attended === 'no' ? p.attended : '' });
  var out = { guestId: id, guestKey: key, name: name }, done = foundRow_(g, phone);
  if (done) out.found = foundOut_(done, true);   // same number on a new phone: their photos come back, no second search
  return out;
}

/** Public: save a "Find me" result with a name → short code for a link that opens it on any phone. */
function saveSet_(p) {
  var g = publishedGallery_(p.g), name = String(p.name || '').trim().slice(0, 50);
  if (!name) return { ok: false, error: 'Give this collection a name.' };
  if (!limitOk_('ss:' + String(p.device || '').slice(0, 40), 20, 3600) || !limitOk_('ssg:' + g.galleryId, 400, 3600)) return { ok: false, error: 'Too many saved collections for now. Please try again later.' };
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
  var g = publishedGallery_(p.g); needFeature_(g, 'upload');   // step 65d
  var guest = guestFor_(g, p);
  var mime = String(p.mime || ''), isVideo = /^video\//.test(mime), isPhoto = /^image\/(jpeg|png|webp|heic|heif)$/.test(mime);
  if (!isVideo && !isPhoto) return { ok: false, error: 'Only photos and videos can be uploaded.' };
  var data = String(p.base64 || '').replace(/^data:[^,]*,/, '');
  if (!data) return { ok: false, error: 'The file is empty.' };
  if (data.length * 0.75 > MAX_UPLOAD_BYTES) return { ok: false, error: 'This file is too big (max 20 MB). Try a shorter video.' };
  var cache = CacheService.getScriptCache(), rk = 'up:' + guest.guestId, used = Number(cache.get(rk) || 0);
  if (used >= 30) return { ok: false, error: 'Too many uploads for now. Please try again in an hour.' };
  if (!limitOk_('upg:' + g.galleryId, 300, 3600)) return { ok: false, error: 'Many guests are uploading right now. Please try again in a little while.' };
  cache.put(rk, String(used + 1), 3600);
  var folder = guestFolder_(g);
  var ext = isVideo ? (/quicktime/.test(mime) ? 'mov' : 'mp4') : (/png/.test(mime) ? 'png' : 'jpg');
  var postId = 'pst_' + randomId_(10);
  var blob = Utilities.newBlob(Utilities.base64Decode(data), mime, guest.name.replace(/[^\w ]+/g, '').slice(0, 20) + '_' + postId + '.' + ext);
  var file = folder.createFile(blob);
  // step 50: a guest upload waits for the couple — it is NOT opened to "anyone with the link" here; couplePost_ opens it on approval
  try { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (e) {}
  ensureTab_('GuestPosts', POST_COLUMNS);
  appendRow_('GuestPosts', { at: fmt_(new Date()), galleryId: g.galleryId, postId: postId, guestId: guest.guestId, name: guest.name, phone: guest.phone,
    caption: String(p.caption || '').slice(0, 300), fileId: file.getId(), mime: mime, type: isVideo ? 'video' : 'photo', status: 'review', reviewedAt: '' });
  return { postId: postId, status: 'review' };
}

function subFolder_(g, name) {
  var parent;
  try { parent = DriveApp.getFolderById(g.folderId); } catch (e) { throw new Error('The wedding folder cannot be opened by PicGrades.'); }
  var it = parent.getFoldersByName(name);
  try { return it.hasNext() ? it.next() : parent.createFolder(name); }
  catch (e) { throw new Error('Saving is not switched on for this wedding yet (PicGrades needs edit access to the wedding folder).'); }
}

/** Public: save a post / album made in the gallery (up to 10 slide images). The couple and the photographer
 *  post straight away; anyone else needs name + phone and the couple's approval (like uploads). */
function savePost_(p) {
  var g = publishedGallery_(p.g), who = null, status = 'review';
  if (p.coupleKey && g.coupleKey && String(p.coupleKey) === String(g.coupleKey)) { who = { guestId: 'couple', name: g.title, phone: '' }; status = 'approved'; }
  if (!who && p.token) {
    var u = authUser_(p.token);
    if (u) { try { ownerOrder_(g.orderId, u); who = { guestId: 'staff:' + u.email, name: g.companyName || 'Photographer', phone: '' }; status = 'approved'; } catch (e) {} }
  }
  if (!who) { who = guestFor_(g, p); if (!limitOk_('spg:' + g.galleryId, 200, 3600)) return { ok: false, error: 'Many guests are posting right now. Please try again in a little while.' }; }
  var kind = p.kind === 'post' ? 'post' : 'album';   // step 53: a post is ONE picture; an album is many slides
  var slides = (p.slides || []).slice(0, kind === 'post' ? 1 : 10);
  if (!slides.length) return { ok: false, error: 'Nothing to save.' };
  var total = slides.reduce(function (t, x) { return t + String(x || '').length; }, 0);
  if (total * 0.75 > 30 * 1024 * 1024) return { ok: false, error: 'This post is too big. Try fewer slides.' };
  var folder = subFolder_(g, POSTS_FOLDER_NAME), postId = (kind === 'post' ? 'pst_' : 'alb_') + randomId_(10), ids = [];
  slides.forEach(function (d, i) {
    var data = String(d).replace(/^data:[^,]*,/, '');
    var f = folder.createFile(Utilities.newBlob(Utilities.base64Decode(data), 'image/jpeg', postId + '_' + (i + 1) + '.jpg'));
    // step 50: open to "anyone with the link" only once approved (the couple's own albums are approved straight away)
    try { f.setSharing(status === 'approved' ? DriveApp.Access.ANYONE_WITH_LINK : DriveApp.Access.PRIVATE, status === 'approved' ? DriveApp.Permission.VIEW : DriveApp.Permission.NONE); } catch (e) {}
    ids.push(f.getId());
  });
  ensureTab_('GuestPosts', POST_COLUMNS);
  appendRow_('GuestPosts', { at: fmt_(new Date()), galleryId: g.galleryId, postId: postId, guestId: who.guestId, name: who.name, phone: who.phone || '',
    caption: String(p.caption || '').slice(0, 300), fileId: ids.join(','), mime: 'image/jpeg', type: kind, status: status, reviewedAt: status === 'approved' ? fmt_(new Date()) : '' });
  if (status === 'approved') dropSummary_(g.galleryId);
  return { postId: postId, status: status, slides: ids.length };
}

/** Public (guest): my uploads and their status, plus the couple's thank-you note once approved. */
function myPosts_(p) {
  var g = publishedGallery_(p.g), guest = guestFor_(g, p);
  ensureTab_('GuestPosts', POST_COLUMNS);
  var posts = readTable_('GuestPosts').filter(function (x) { return x.galleryId === g.galleryId && x.guestId === guest.guestId; })
    .map(function (x) { return { postId: x.postId, fileId: x.fileId, type: x.type, caption: x.caption, status: x.status, at: x.at, reviewedAt: x.reviewedAt }; });
  return { posts: withThumbs_(posts), thanks: g.thanksNote || defaultThanks_(g) };
}
/** Step 50: a small preview of a post that is still private (waiting for the couple) — made by Drive for the file's owner, so no public link is needed. */
function reviewThumb_(fileId) {
  try { var b = DriveApp.getFileById(String(fileId).split(',')[0]).getThumbnail(); return b ? 'data:' + (b.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(b.getBytes()) : ''; } catch (e) { return ''; }
}
function withThumbs_(list) {   // only posts that are not open (waiting or hidden), at most 12 per answer
  var n = 0; return list.map(function (x) { if ((x.status === 'review' || x.status === 'hidden') && x.fileId && n++ < 12) x.thumb = reviewThumb_(x.fileId); return x; });
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
  return { waiting: withThumbs_(all.filter(function (x) { return x.status === 'review'; })), decided: withThumbs_(all.filter(function (x) { return x.status !== 'review'; }).slice(0, 40)), thanks: g.thanksNote || defaultThanks_(g) };
}
/** Couple link: approve or hide a guest post. */
function couplePost_(p) {
  var g = coupleGallery_(p), decision = p.decision === 'approve' ? 'approved' : p.decision === 'hide' ? 'hidden' : '';
  if (!decision) return { ok: false, error: 'Choose approve or hide.' };
  ensureTab_('GuestPosts', POST_COLUMNS);
  var row = readTable_('GuestPosts').filter(function (x) { return x.galleryId === g.galleryId && x.postId === String(p.postId || ''); })[0];
  if (!row) return { ok: false, error: 'Post not found.' };
  if (row.status === 'deleted' || !row.fileId) return { ok: false, error: 'This moment was already deleted.' };
  // step 52: Hide = the file goes to Drive's trash at once (a trashed file cannot be opened by its link, even inside a
  // shared folder), unless the couple chose to keep hidden moments 7 days. Show again within 7 days takes it back out.
  var keep = p.keep === '7d';
  updateRowByNumber_('GuestPosts', row._row, { status: decision, reviewedAt: fmt_(new Date()) });
  String(row.fileId || '').split(',').filter(String).forEach(function (id) {
    try {
      var f = DriveApp.getFileById(id);
      if (decision === 'approved') { try { f.setTrashed(false); } catch (e) {} f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); }
      else { f.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); if (!keep) f.setTrashed(true); }
    } catch (e) {}
  });
  dropSummary_(g.galleryId);
  return { postId: row.postId, status: decision };
}
/** Couple link: the thank-you note guests see once their moment is approved. */
function coupleThanks_(p) {
  var g = coupleGallery_(p), text = String(p.text || '').trim().slice(0, 400);
  if (!text) return { ok: false, error: 'Write a short note.' };
  updateRowByNumber_('Galleries', g._row, { thanksNote: text });
  return { thanks: text };
}

// ---------- Find me once per guest + guest downloads by request (step 45) ----------
// Guests may download only the photos Find me found of them. For any other photo they send a request with their email;
// the couple (or the photographer / PicGrades) approves it and the guest gets an email with a download link.
// This is PicGrades' privacy policy for every wedding, so the couple never has to be the one who says no.
var FIND_COLUMNS = ['at', 'galleryId', 'phone', 'guestId', 'name', 'sure', 'maybe', 'status', 'face'];   // face (step 65a): 'photoId:n' — which face in which wedding photo is this guest
var DLREQ_COLUMNS = ['at', 'galleryId', 'reqId', 'guestId', 'name', 'phone', 'email', 'ids', 'status', 'grant', 'decidedAt', 'decidedBy', 'kind', 'event'];   // kind 'more' (step 63b): a found guest asks for all photos of one event
var DL_MAX_IDS = 50;
function digits_(v) { return String(v == null ? '' : v).replace(/\D/g, '').slice(-10); }
/** 'couple' (couple link) · 'staff' (photographer / PicGrades login for this wedding) · '' (a guest). */
function privileged_(g, p) {
  if (p.coupleKey && g.coupleKey && String(p.coupleKey) === String(g.coupleKey)) return 'couple';
  if (p.token) {
    var u = authUser_(p.token);
    if (u) { try { staffGallery_(g.galleryId, u); return 'staff'; } catch (e) {} }
  }
  return '';
}
function foundRow_(g, phone) {
  var d = digits_(phone); if (!d) return null;
  ensureTab_('FindMe', FIND_COLUMNS);
  return readTable_('FindMe').filter(function (x) { return x.galleryId === g.galleryId && digits_(x.phone) === d && x.status === 'ok'; })[0] || null;
}
function foundOut_(row, again) {
  var ids = function (s) { return String(s || '').split(',').filter(String); };
  return { sure: ids(row.sure), maybe: ids(row.maybe), again: !!again };
}
/** Public (guest): the photos Find me already found for this mobile number, if any. */
function myFind_(p) {
  var g = publishedGallery_(p.g), guest = guestFor_(g, p), row = foundRow_(g, guest.phone);
  return row ? { found: withItems_(g, foundOut_(row, true)) } : { found: null };
}
/** Public (guest): ask for photos that are not theirs. */
function askDownload_(p) {
  var g = publishedGallery_(p.g), guest = guestFor_(g, p);
  var email = String(p.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Please write a valid email address.' };
  if (!limitOk_('dl:' + guest.guestId, 30, 3600) || !limitOk_('dlg:' + g.galleryId, 500, 3600)) return { ok: false, error: 'Too many requests for now. Please try again later.' };
  var m = loadManifest_(g), all = {}; allPhotoIds_(m).forEach(function (id) { all[id] = true; });
  var ids = (p.ids || []).map(String).filter(function (id, i, a) { return all[id] && a.indexOf(id) === i; }).slice(0, DL_MAX_IDS);
  if (!ids.length) return { ok: false, error: 'No photos to ask for.' };
  ensureTab_('DownloadRequests', DLREQ_COLUMNS);
  var reqId = 'dl_' + randomId_(10);
  appendRow_('DownloadRequests', { at: fmt_(new Date()), galleryId: g.galleryId, reqId: reqId, guestId: guest.guestId, name: guest.name, phone: "'" + guest.phone, email: email, ids: ids.join(','), status: 'waiting', grant: '', decidedAt: '', decidedBy: '' });
  return { reqId: reqId, count: ids.length };
}
/** Public (guest, step 60): after a close match, ask the couple to let them see their photos. The photos come from the
 *  server's own close-match record, never from the phone. */
function askAccess_(p) {
  var g = publishedGallery_(p.g), guest = guestFor_(g, p);
  var email = String(p.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Please write a valid email address.' };
  if (!limitOk_('acc:' + guest.guestId, 5, 3600)) return { ok: false, error: 'Too many requests for now. Please try again later.' };
  ensureTab_('FindMe', FIND_COLUMNS);
  var d = digits_(guest.phone);
  if (p.event) return askMore_(g, guest, email, String(p.event).slice(0, 80));
  var row = readTable_('FindMe').filter(function (x) { return x.galleryId === g.galleryId && digits_(x.phone) === d && x.status === 'close'; }).pop();
  // step 60d: no close match, but 2 searches found nobody → a request for help (no photos: the couple or photographer replies)
  var kind = row ? 'access' : guestMisses_(g, guest.phone) >= GUEST_TRIES_BEFORE_HELP ? 'help' : '';
  if (!kind) return { ok: false, error: 'Please use Find me first.' };
  ensureTab_('DownloadRequests', DLREQ_COLUMNS);
  var old = readTable_('DownloadRequests').filter(function (x) { return x.galleryId === g.galleryId && (x.kind === 'access' || x.kind === 'help') && digits_(x.phone) === d && x.status === 'waiting'; })[0];
  if (old) return { reqId: old.reqId, already: true };
  var reqId = (kind === 'help' ? 'hp_' : 'ac_') + randomId_(10);
  appendRow_('DownloadRequests', { at: fmt_(new Date()), galleryId: g.galleryId, reqId: reqId, guestId: guest.guestId, name: guest.name, phone: "'" + guest.phone, email: email, ids: kind === 'access' ? row.sure : '', status: 'waiting', grant: '', decidedAt: '', decidedBy: '', kind: kind });
  return { reqId: reqId };
}
/** step 63b: a guest Find me found asks to see every photo of one event. Approving opens that event for their mobile number. */
function askMore_(g, guest, email, event) {
  if (!foundRow_(g, guest.phone)) return { ok: false, error: 'Please use Find me first.' };
  if (!(loadManifest_(g).events || []).some(function (e) { return e.name === event; })) return { ok: false, error: 'Event not found.' };
  var d = digits_(guest.phone);
  ensureTab_('DownloadRequests', DLREQ_COLUMNS);
  var old = readTable_('DownloadRequests').filter(function (x) { return x.galleryId === g.galleryId && x.kind === 'more' && x.event === event && digits_(x.phone) === d && (x.status === 'waiting' || x.status === 'approved'); })[0];
  if (old) return { reqId: old.reqId, already: true, status: old.status };
  var reqId = 'mo_' + randomId_(10);
  appendRow_('DownloadRequests', { at: fmt_(new Date()), galleryId: g.galleryId, reqId: reqId, guestId: guest.guestId, name: guest.name, phone: "'" + guest.phone, email: email, ids: '', status: 'waiting', grant: '', decidedAt: '', decidedBy: '', kind: 'more', event: event });
  return { reqId: reqId };
}
/** Couple link or staff login: download requests of this wedding (waiting first). */
function dlRequests_(p) {
  var g = publishedGallery_(p.g);
  if (!privileged_(g, p)) return { ok: false, error: 'Only the couple can see download requests.' };
  ensureTab_('DownloadRequests', DLREQ_COLUMNS);
  var all = readTable_('DownloadRequests').filter(function (x) { return x.galleryId === g.galleryId; })
    .map(function (x) { return { reqId: x.reqId, name: x.name, email: x.email, ids: String(x.ids || '').split(',').filter(String), status: x.status, at: x.at, decidedAt: x.decidedAt, kind: x.kind === 'access' || x.kind === 'help' || x.kind === 'more' ? x.kind : 'download', event: x.event || '' }; })
    .sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  return { waiting: all.filter(function (x) { return x.status === 'waiting'; }), decided: all.filter(function (x) { return x.status !== 'waiting'; }).slice(0, 40) };
}
/** Couple link or staff login: approve (the guest gets an email with a download link) or decline. */
function dlDecide_(p) {
  var g = publishedGallery_(p.g), who = privileged_(g, p);
  if (!who) return { ok: false, error: 'Only the couple can answer download requests.' };
  var decision = p.decision === 'approve' ? 'approved' : p.decision === 'decline' ? 'declined' : '';
  if (!decision) return { ok: false, error: 'Choose approve or decline.' };
  ensureTab_('DownloadRequests', DLREQ_COLUMNS);
  var row = readTable_('DownloadRequests').filter(function (x) { return x.galleryId === g.galleryId && x.reqId === String(p.reqId || ''); })[0];
  if (!row) return { ok: false, error: 'Request not found.' };
  if (row.status !== 'waiting') return { reqId: row.reqId, status: row.status };
  if (row.kind === 'help' && decision === 'approved') return { ok: false, error: 'This guest was not found: email them, then mark the request as done.' };
  var grant = decision === 'approved' ? randomId_(16) : '';
  updateRowByNumber_('DownloadRequests', row._row, { status: decision, grant: grant, decidedAt: fmt_(new Date()), decidedBy: who });
  var n = String(row.ids || '').split(',').filter(String).length;
  if (decision === 'approved' && row.kind === 'more') {
    var link3 = String(getSettings_().siteUrl || 'https://picgrades-os.vercel.app').replace(/\/+$/, '') + '/g/' + g.galleryId;
    sendEmail_(row.email, 'All ' + row.event + ' photos from ' + g.title, 'You can see all ' + esc_(row.event) + ' photos now',
      ['Hi ' + esc_(String(row.name || '').split(' ')[0]) + ',', esc_(g.title) + ' opened all ' + esc_(row.event) + ' photos for you.',
       '<a href="' + esc_(link3) + '" style="display:inline-block;padding:12px 22px;border-radius:24px;background:#141413;color:#fff;text-decoration:none">Open the wedding</a>',
       'Use the same phone where you did Find me.'], 'more-approved', row.reqId);
  } else if (decision === 'approved' && row.kind === 'access') {
    // a close match the couple recognised: this mobile number now has its photos, like a normal Find me
    ensureTab_('FindMe', FIND_COLUMNS);
    var d = digits_(row.phone), fm = readTable_('FindMe').filter(function (x) { return x.galleryId === g.galleryId && digits_(x.phone) === d && x.status === 'close'; }).pop();
    if (fm) updateRowByNumber_('FindMe', fm._row, { status: 'ok' });
    var link2 = String(getSettings_().siteUrl || 'https://picgrades-os.vercel.app').replace(/\/+$/, '') + '/g/' + g.galleryId + '?dl=' + grant;
    sendEmail_(row.email, 'Your photos from ' + g.title, 'You can see your photos now',
      ['Hi ' + esc_(String(row.name || '').split(' ')[0]) + ',',
       esc_(g.title) + ' approved your Find me request. ' + n + ' photo' + (n === 1 ? '' : 's') + ' of you ' + (n === 1 ? 'is' : 'are') + ' ready.',
       '<a href="' + esc_(link2) + '" style="display:inline-block;padding:12px 22px;border-radius:24px;background:#141413;color:#fff;text-decoration:none">See my photos</a>',
       'The link works for 30 days. On the same phone number, Find me now shows these photos too.'], 'access-approved', row.reqId);
  } else if (decision === 'approved') {
    var link = String(getSettings_().siteUrl || 'https://picgrades-os.vercel.app').replace(/\/+$/, '') + '/g/' + g.galleryId + '?dl=' + grant;
    sendEmail_(row.email, 'Your photos from ' + g.title, 'Your photos are ready',
      ['Hi ' + esc_(String(row.name || '').split(' ')[0]) + ',',
       'Your request for ' + n + ' photo' + (n === 1 ? '' : 's') + ' from ' + esc_(g.title) + ' was approved.',
       '<a href="' + esc_(link) + '" style="display:inline-block;padding:12px 22px;border-radius:24px;background:#141413;color:#fff;text-decoration:none">Open and download</a>',
       'The link works for 30 days.'], 'download-approved', row.reqId);
  }
  return { reqId: row.reqId, status: decision };
}
/** Public: the photos an approved request lets this guest download (from the emailed link). */
function dlGrant_(p) {
  var g = publishedGallery_(p.g), code = String(p.grant || '');
  if (code.length < 10) return { ok: false, error: 'This download link is not valid.' };
  ensureTab_('DownloadRequests', DLREQ_COLUMNS);
  var row = readTable_('DownloadRequests').filter(function (x) { return x.galleryId === g.galleryId && x.grant === code && x.status === 'approved'; })[0];
  if (!row) return { ok: false, error: 'This download link is not valid.' };
  if (Date.now() - Number(parseDate_(row.decidedAt)) > 30 * 86400000) return { ok: false, error: 'This download link has expired. Please ask again.' };
  return { ids: String(row.ids || '').split(',').filter(String), name: row.name };
}

// ---------- Feature switches (step 33) ----------
// Each function of a wedding app can be switched on or off. Root Moment itself is always on.
// Three levels: PicGrades' master switches ('allowed', by plan — set later from the admin side) → the photographer and the couple ('features').
// A function PicGrades has not allowed is 'locked': nobody else can switch it on.
var FEATURE_KEYS = ['findme', 'reel', 'post', 'upload', 'notes', 'hearts', 'download', 'share', 'install'];
function jsonObj_(s) { try { var o = JSON.parse(String(s || '') || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } }
/** on / off / locked for every function of this wedding. */
function featuresOf_(g) {
  var f = jsonObj_(g.features), a = jsonObj_(g.allowed), out = {}, basic = planOf_(g).plan === 'basic';
  FEATURE_KEYS.forEach(function (k) { out[k] = a[k] === 'off' || (basic && TRIAL_EXTRAS.indexOf(k) > -1) ? 'locked' : f[k] === 'off' ? 'off' : 'on'; });
  return out;
}
// ---------- After the free trial (step 65d) ----------
// A wedding made by signing up is a 30-day trial with everything on. After that it is the free basic gallery for a year
// (counted from when it was made): the photos, layouts, highlights, Root Moment, notes and hearts stay; the paid functions lock.
var TRIAL_EXTRAS = ['findme', 'reel', 'post', 'upload'];
function planOf_(g) {
  if (!g || g.plan !== 'trial') return { plan: g && g.plan || '' };
  var now = new Date(), ends = parseDate_(g.trialEnds), made = parseDate_(g.createdAt), day = 86400000;
  var basicEnds = made.getTime() > 0 ? new Date(made.getTime() + 365 * day) : null;
  var over = ends.getTime() > 0 && now > ends;
  return { plan: over ? 'basic' : 'trial', trialEnds: g.trialEnds || '', daysLeft: over ? 0 : Math.max(0, Math.ceil((ends - now) / day)),
    basicEnds: basicEnds ? fmt_(basicEnds) : '' };
}
function needFeature_(g, k) { if (featuresOf_(g)[k] !== 'on') throw new Error(k === 'findme' ? 'Find me is not on for this wedding.' : 'This function is not on for this wedding.'); }
function upgradeLink_() {
  var s = getSettings_();
  return String(s.upgradeUrl || '').trim() || (s.supportEmail ? 'mailto:' + String(s.supportEmail).trim() + '?subject=' + encodeURIComponent('Upgrade my wedding app') : 'https://picgrades-os.vercel.app/app/');
}
function saveFeatures_(g, input) {
  var want = typeof input === 'string' ? jsonObj_(input) : (input || {}), cur = jsonObj_(g.features), a = jsonObj_(g.allowed);
  FEATURE_KEYS.forEach(function (k) {
    if (!(k in want) || a[k] === 'off') return;   // locked ones stay as they are
    cur[k] = String(want[k]) === 'off' ? 'off' : 'on';
  });
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { features: JSON.stringify(cur) }); g.features = JSON.stringify(cur);
  return { features: featuresOf_(g) };
}
/** Couple link: switch functions on or off. */
function coupleFeatures_(p) { return saveFeatures_(coupleGallery_(p), p.features); }
/** Photographer (logged in, own studio only) or PicGrades staff: switch functions on or off. */
function setFeatures_(p, user) { var x = staffGallery_(p.g, user); return saveFeatures_(x.g, p.features); }

/** PicGrades (admin): master switches by plan. A function set 'off' here is locked for the couple and the photographer. */
function setAllowed_(p, user) {
  var g = findGallery_(p.g); if (!g) throw new Error('Gallery not found.');
  var want = typeof p.allowed === 'string' ? jsonObj_(p.allowed) : (p.allowed || {}), cur = jsonObj_(g.allowed);
  FEATURE_KEYS.forEach(function (k) { if (k in want) { if (String(want[k]) === 'off') cur[k] = 'off'; else delete cur[k]; } });
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { allowed: JSON.stringify(cur) }); g.allowed = JSON.stringify(cur);
  return { features: featuresOf_(g), allowed: cur };
}

// ---------- Control Panel (step 34) ----------
// The gear in the app's bottom bar opens the Control Panel for PicGrades, the photographer and the couple (guests never see it).
// It holds the wedding's look (theme + Hub layout) and the function switches. Whoever changes something last wins.
function lookId_(v) { v = String(v || '').trim().toLowerCase(); return /^[a-z0-9-]{1,40}$/.test(v) ? v : ''; }
function saveLook_(g, p) {
  var out = {};
  if ('theme' in p) out.theme = lookId_(p.theme);
  if ('layout' in p) out.layout = lookId_(p.layout);
  if ('pages' in p) { var cur = pagesOf_(g.pages), want = pagesOf_(p.pages); Object.keys(want).forEach(function (k) { cur[k] = want[k]; }); out.pages = JSON.stringify(cur); }
  if ('custom' in p) { var c = customOf_(p.custom); if (!c.blocks.length && !c.story) return { ok: false, error: 'Your Hub has no cards yet.' }; out.custom = JSON.stringify(c); }
  if (!('theme' in out) && !('layout' in out) && !('pages' in out) && !('custom' in out)) return { ok: false, error: 'Choose a theme, a layout or a page style.' };
  out.updatedAt = fmt_(new Date());
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, out);
  return { theme: 'theme' in out ? out.theme : lookId_(g.theme), layout: 'layout' in out ? out.layout : lookId_(g.layout), pages: pagesOf_('pages' in out ? out.pages : g.pages), custom: customOf_('custom' in out ? out.custom : g.custom) };
}
// Story photos (step 56): the couple or the photographer chooses which photos the story shows: cover photos (up to 15),
// the bride's and the groom's portraits (the varmala moment) and 10–15 highlights for each event. Nothing is guessed:
// until something is chosen, the story leaves that part out. Couple link or staff login (the wedding's photographer / PicGrades).
var STORY_MAX = 15;
function picksOf_(v) {
  var o = v; if (typeof o === 'string') { try { o = JSON.parse(o || '{}'); } catch (e) { o = {}; } }
  o = o || {};
  var id = function (x) { x = String(x || ''); return /^[A-Za-z0-9_-]{3,120}$/.test(x) ? x : ''; };
  var list = function (a) { var out = []; (Array.isArray(a) ? a : []).forEach(function (x) { x = id(x); if (x && out.indexOf(x) < 0 && out.length < STORY_MAX) out.push(x); }); return out; };
  var hl = {}, n = 0;
  Object.keys(o.hl || {}).forEach(function (k) { var ids = list(o.hl[k]), name = String(k).slice(0, 80); if (ids.length && n < 40) { hl[name] = ids; n++; } });
  return { cover: list(o.cover), bride: id(o.bride), groom: id(o.groom), hl: hl, wh: list(o.wh), welcome: id(o.welcome) };   // welcome (step 63c): the full-length couple photo of the guest welcome   // wh: Wedding Highlights (step 63a) — 10–15 photos of the whole wedding, the public ones
}
/** Couple link or staff login: save the story photos (the whole choice at once; only photos of this wedding are kept). */
function storyPicks_(p) {
  var g = publishedGallery_(p.g);
  if (!privileged_(g, p)) throw new Error('Only the couple or the photographer can choose the story photos.');
  var m = loadManifest_(g), all = {}, evs = {};
  allPhotoIds_(m).forEach(function (x) { all[x] = true; });
  (m.events || []).forEach(function (e) { evs[e.name] = {}; e.photos.forEach(function (ph) { evs[e.name][ph.id] = true; }); });
  var want = picksOf_(p.picks), hl = {};
  Object.keys(want.hl).forEach(function (k) { if (evs[k]) { var ids = want.hl[k].filter(function (x) { return evs[k][x]; }); if (ids.length) hl[k] = ids; } });
  var out = { cover: want.cover.filter(function (x) { return all[x]; }), bride: all[want.bride] ? want.bride : '', groom: all[want.groom] ? want.groom : '', hl: hl, wh: want.wh.filter(function (x) { return all[x]; }), welcome: all[want.welcome] ? want.welcome : '' };
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', g._row, { storyPicks: JSON.stringify(out), updatedAt: fmt_(new Date()) });
  return { story: out };
}
// The wedding's photographer (step 42): shown as "Photographed by", on the photographer page and in the Hub.
// Empty = the studio of the order. Set in the app's Control Panel by PicGrades or the wedding's photographer.
var PHOTOGRAPHER_FIELDS = { name: 60, instagram: 40, website: 120, phone: 24, email: 80, city: 60, about: 400 };
function photographerOf_(v) {
  var o = typeof v === 'string' ? jsonObj_(v) : (v || {}), out = {};
  Object.keys(PHOTOGRAPHER_FIELDS).forEach(function (k) { var s = String(o[k] == null ? '' : o[k]).trim().slice(0, PHOTOGRAPHER_FIELDS[k]); if (s) out[k] = s; });
  if (out.instagram) { var m = out.instagram.match(/instagram\.com\/([A-Za-z0-9._]+)/); out.instagram = (m ? m[1] : out.instagram).replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '').slice(0, 30); if (!out.instagram) delete out.instagram; }
  if (out.website && !/^https?:\/\//i.test(out.website)) out.website = 'https://' + out.website;
  if (out.website && !/^https?:\/\/[^\s<>"]+\.[^\s<>"]+$/i.test(out.website)) delete out.website;
  if (out.phone) { out.phone = out.phone.replace(/-/g, ' ').replace(/[^0-9+ ]/g, '').replace(/ +/g, ' ').trim(); if (!out.phone) delete out.phone; }
  if (out.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(out.email)) delete out.email;
  return out;
}
/** PicGrades staff or the wedding's photographer: who photographed it, and (PicGrades only) whether PicGrades' name shows. */
function setPhotographer_(p, user) {
  var x = staffGallery_(p.g, user), patch = {};
  if ('photographer' in p) patch.photographer = JSON.stringify(photographerOf_(p.photographer));
  if ('credit' in p) { if (!isStaff_(user)) throw new Error('Only PicGrades can change this.'); patch.credit = /^(off|no|false|0)$/i.test(String(p.credit)) ? 'off' : ''; }
  if (!Object.keys(patch).length) return { ok: false, error: 'Nothing to change.' };
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', x.g._row, patch);
  var g = Object.assign({}, x.g, patch);
  return { photographer: photographerOf_(g.photographer), credit: String(g.credit || '').toLowerCase() !== 'off', studio: x.g.companyName || '' };
}
// Demo wedding (step 39): anyone with the link gets the Control Panel to try every setting; their changes stay on their own phone.
function isDemo_(g) { return /^(yes|true|1|on)$/i.test(String(g.demo || '').trim()); }
/** Photographer (own studio) or PicGrades staff: make this wedding a demo, or a normal wedding again. */
function setDemo_(p, user) {
  var x = staffGallery_(p.g, user), on = /^(yes|true|1|on)$/i.test(String(p.on));
  ensureTab_('Galleries', GALLERY_COLUMNS);
  updateRowByNumber_('Galleries', x.g._row, { demo: on ? 'yes' : '' });
  return { demo: on };
}
// The wedding's own Hub (step 44): cards placed on the grid in the app's Hub editor. Only known cards and whole numbers are kept.
var HUB_BLOCKS = ['hero', 'findme', 'reel', 'post', 'upload', 'install', 'review', 'events', 'loved', 'notes', 'studio', 'x-world', 'x-journey', 'x-chapter'];   // x-…: experience cards (step 57)
// the words / photos / choices a couple sets on a card (step 57): short texts, photo ids, small numbers — nothing else is kept
function cardSet_(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null;
  var out = {}, n = 0;
  Object.keys(o).slice(0, 40).forEach(function (k) {
    if (!/^[a-z][a-z0-9]{0,15}$/i.test(k) || n >= 30) return;
    var v = o[k];
    if (typeof v === 'number' && isFinite(v)) { out[k] = Math.max(-1000, Math.min(1000, Math.round(v))); n++; }
    else if (typeof v === 'string') { v = v.replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 200); if (v) { out[k] = v; n++; } }
  });
  return n ? out : null;
}
// the Hub's colours (step 57): a ready palette by name, or four #rrggbb colours
function paletteOf_(p) {
  if (!p || typeof p !== 'object') return null;
  var id = String(p.id || ''); if (!/^[a-z0-9-]{1,20}$/.test(id)) return null;
  var out = { id: id };
  ['bg', 'ink', 'acc', 'acc2'].forEach(function (k) { if (/^#[0-9a-f]{6}$/i.test(String(p[k] || ''))) out[k] = String(p[k]); });
  return out;
}
var HUB_COLS = { phone: 4, tall: 8, wide: 12 };
function customOf_(v) {
  var o = typeof v === 'string' ? jsonObj_(v) : (v || {}), out = { blocks: [] };
  (Array.isArray(o.blocks) ? o.blocks : []).slice(0, 24).forEach(function (b) {
    if (!b || HUB_BLOCKS.indexOf(String(b.block)) < 0) return;
    var x = { block: String(b.block), variant: /^[a-z0-9-]{1,24}$/.test(String(b.variant || '')) ? String(b.variant) : '' , pos: {} };
    Object.keys(HUB_COLS).forEach(function (s) {
      var p = b.pos && b.pos[s]; if (!Array.isArray(p) || p.length !== 4) return;
      var n = p.map(function (v) { return Math.round(Number(v)); });
      if (n.some(function (v) { return !(v >= 0); }) || n[2] < 1 || n[3] < 1 || n[0] + n[2] > HUB_COLS[s] || n[3] > 12 || n[1] > 200) return;
      x.pos[s] = n;
    });
    if (Array.isArray(b.hide)) x.hide = b.hide.filter(function (s) { return s in HUB_COLS; });
    var st = cardSet_(b.set); if (st) x.set = st;
    out.blocks.push(x);
  });
  if (o.base && /^[a-z0-9-]{1,40}$/.test(String(o.base))) out.base = String(o.base);
  var pal = paletteOf_(o.palette); if (pal) out.palette = pal;
  // a Story Hub (step 54): which story, its sections (shown / hidden, order), the floating Find me, the icon bar and reworded headings
  var st = o.story;
  if (st && (st.kind === 'living' || st.kind === 'editorial')) {
    var key = /^[a-z0-9-]{1,32}(:\d{1,3})?$/, texts = {}, n = 0;
    Object.keys(st.texts || {}).forEach(function (k) { var v = String(st.texts[k] || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 120); if (key.test(k) && k.indexOf(':') > 0 && v && n < 60) { texts[k] = v; n++; } });
    out.story = { kind: st.kind, findme: ['left', 'right', 'off'].indexOf(st.findme) > -1 ? st.findme : 'right', bar: st.bar === 'on' ? 'on' : 'off', texts: texts,
      sections: (Array.isArray(st.sections) ? st.sections : []).slice(0, 20).filter(function (q) { return q && key.test(String(q.k)) && String(q.k).indexOf(':') < 0; }).map(function (q) { return { k: String(q.k), on: q.on !== false }; }) };
    out.blocks = [];
  }
  return out;
}
// Page styles (step 36): which style each page uses. Only known pages and styles are kept.
var PAGE_STYLES = { event: ['collage', 'mosaic', 'grid'], events: ['cards', 'shapes', 'carousel', 'mosaic'], viewer: ['live', 'classic'], header: ['right', 'left'], comments: ['below', 'typing', 'off'], watermark: ['off', 'on'], modeside: ['right', 'left'] };   // header: where the couple's logo sits (step 44)   // events: the list of all events (step 37)
function pagesOf_(v) {
  var o = typeof v === 'string' ? jsonObj_(v) : (v || {}), out = {};
  Object.keys(PAGE_STYLES).forEach(function (k) { if (PAGE_STYLES[k].indexOf(String(o[k])) > -1) out[k] = String(o[k]); });
  if (typeof o.wmtext === 'string') out.wmtext = o.wmtext.replace(/[<>"\u0000-\u001f]/g, '').trim().slice(0, 40);   // the watermark words (step 48)
  return out;
}
/** Couple link: change the wedding's look. */
function coupleLook_(p) { return saveLook_(coupleGallery_(p), p); }
/** Photographer (own studio only) or PicGrades staff: change the wedding's look. */
function setLook_(p, user) { var x = staffGallery_(p.g, user); return saveLook_(x.g, p); }
/** Logged in: who you are for this wedding — 'picgrades' (staff) or 'photographer' (its own studio). Anyone else gets an error. */
function myRole_(p, user) {
  var x = staffGallery_(p.g, user), role = String(user.role || '').toLowerCase();
  return { role: isStaff_(user) ? 'picgrades' : 'photographer', canLock: role === 'admin', name: user.name || '', companyName: x.g.companyName || '',
    features: featuresOf_(x.g), allowed: jsonObj_(x.g.allowed), theme: lookId_(x.g.theme), layout: lookId_(x.g.layout), pages: pagesOf_(x.g.pages),
    custom: customOf_(x.g.custom), photographer: photographerOf_(x.g.photographer), studio: x.g.companyName || '', credit: String(x.g.credit || '').toLowerCase() !== 'off' };
}

/** Public: photo bytes for the reel maker when the phone cannot read Drive photos directly.
 *  Only photos of a published gallery; at most 4 per call and 150 per device per hour. */
function photoData_(p) {
  var g = findGallery_(p.g);
  if (!openTo_(g, p)) return { ok: false, error: 'This gallery is not available.' };
  var device = String(p.device || '').slice(0, 40);
  if (device.length < 8) return { ok: false, error: 'Missing details.' };
  var m = loadManifest_(g), ids = {};
  if (gatedFor_(g, p)) ids = guestSees_(g, m, p).ids; else allPhotoIds_(m).forEach(function (id) { ids[id] = true; });   // step 63b
  var want = (p.ids || []).slice(0, 4).filter(function (id) { return ids[id]; });
  var cache = CacheService.getScriptCache(), key = 'pd:' + g.galleryId + ':' + device, used = Number(cache.get(key) || 0);
  if (used + want.length > 150) return { ok: false, error: 'Too many photos for now. Please try again in an hour.' };
  if (!limitOk_('pdg:' + g.galleryId, 1500, 3600)) return { ok: false, error: 'This gallery is very busy. Please try again in a little while.' };   // ≈6,000 photos an hour for the whole wedding
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
/** Public: Find me. The phone reads the guest's selfie and sends only that one face code; matching happens here,
 *  so nobody can download the face codes of everyone in the wedding. Returns photo ids only. */
var FACE_SURE = 0.5, FACE_MAYBE = 0.58;
// Step 60: stricter rules for guests (the couple and the photographer keep the rules above, with "Maybe you").
// A guest is let in only when: every face counted is very close (0.42, Settings "findmeLimit"), the selfie is clearly ONE person
// (the closest faces are not two different people, as with brothers), and at least 3 photos match (Settings "findmeMin").
// 1 or 2 close photos = a "close match": nothing is shown; the guest may leave an email and the couple approves.
var FACE_GUEST = 0.42, FACE_GUEST_MIN = 3, FACE_TIGHT = 0.08, FACE_BAND = 0.12, FACE_OTHER = 0.55;
function guestFaceRules_() {
  var st = getSettings_(), lim = Number(st.findmeLimit), min = Number(st.findmeMin);
  return { lim: lim >= 0.3 && lim <= 0.55 ? lim : FACE_GUEST, min: min >= 1 && min <= 10 ? Math.round(min) : FACE_GUEST_MIN };
}
function faceDist_(a, b, stop) {
  var t = 0; for (var i = 0; i < 128; i++) { var d = a[i] - b[i]; t += d * d; if (stop && t > stop * stop) return 1e9; }
  return Math.sqrt(t);
}
function findFaces_(p) {
  var g = faceGallery_(p.g), device = String(p.device || '').slice(0, 40);
  if (device.length < 8) return { ok: false, error: 'Missing details.' };
  if (!privileged_(g, p)) needFeature_(g, 'findme');   // step 65d: the server refuses too, not only the button
  if (!limitOk_('ff:' + device, 20, 3600) || !limitOk_('ffg:' + g.galleryId, 1500, 3600)) return { ok: false, error: 'Too many searches for now. Please try again in an hour.' };
  // Step 45: guests need their name + mobile first, and get one search per mobile number (the couple and staff search freely)
  var guest = null;
  if (!privileged_(g, p)) {
    guest = guestFor_(g, p);
    var done = foundRow_(g, guest.phone);
    if (done) return withItems_(g, foundOut_(done, true));
  }
  var f = readFacesFile_(g), scale = f.scale || 250, me = faceBytes_(String(p.d || ''));
  if (!me) return { ok: false, error: 'The face could not be read. Please try again.' };
  if (guest) return withItems_(g, guestFind_(g, f, scale, me, guest));
  var limSure = FACE_SURE * scale, limMaybe = FACE_MAYBE * scale, sure = [], maybe = [], best = {};
  Object.keys(f.photos || {}).forEach(function (pid) {
    var b = 1e9;
    (f.photos[pid].f || []).forEach(function (fc) {
      var x = faceBytes_(fc[1]); if (!x) return;
      var t = faceDist_(me, x, limMaybe); if (t < b) b = t;
    });
    if (b <= limMaybe) best[pid] = b;
  });
  Object.keys(best).sort(function (a, c) { return best[a] - best[c]; }).forEach(function (pid) { (best[pid] <= limSure ? sure : maybe).push(pid); });
  return { sure: sure, maybe: maybe, photos: Object.keys(f.photos || {}).length };
}
var GUEST_TRIES_BEFORE_HELP = 2;
function guestMisses_(g, phone) {
  var d = digits_(phone);
  return readTable_('FindMe').filter(function (x) { return x.galleryId === g.galleryId && digits_(x.phone) === d && (x.status === 'none' || x.status === 'unclear'); }).length;
}
/** step 63b: a gated guest's phone has no event photo lists, so Find me sends the found photos themselves. */
function withItems_(g, out) {
  if (guestPhotosOf_(g) !== 'findme' || !out || !(out.sure || []).length) return out;
  var map = photoMap_(loadManifest_(g));
  out.items = out.sure.map(function (id) { return map[id]; }).filter(Boolean);
  return out;
}
function guestFind_(g, f, scale, me, guest) {
  var R = guestFaceRules_(), scan = (R.lim + FACE_BAND) * scale, near = [];
  Object.keys(f.photos || {}).forEach(function (pid) {
    (f.photos[pid].f || []).forEach(function (fc, k) {
      var x = faceBytes_(fc[1]); if (!x) return;
      var t = faceDist_(me, x, scan); if (t <= scan) near.push({ pid: pid, d: t, x: x, k: k });
    });
  });
  near.sort(function (a, b) { return a.d - b.d; });
  var out = { sure: [], maybe: [], photos: Object.keys(f.photos || {}).length };
  // step 60d: every miss is written down; after 2 the guest may ask the couple or the photographer for help
  var miss = function (why) {
    ensureTab_('FindMe', FIND_COLUMNS);
    appendRow_('FindMe', { at: fmt_(new Date()), galleryId: g.galleryId, phone: "'" + guest.phone, guestId: guest.guestId, name: guest.name, sure: '', maybe: '', status: why });
    out.tries = guestMisses_(g, guest.phone); out.canAsk = out.tries >= GUEST_TRIES_BEFORE_HELP;
    return out;
  };
  if (!near.length || near[0].d > R.lim * scale) return miss('none');
  // one clear person: the faces closest to the selfie must all be the same person
  var d1 = near[0].d, band = near.filter(function (n) { return n.d <= d1 + FACE_BAND * scale; }).slice(0, 16);
  for (var i = 0; i < band.length; i++) for (var j = i + 1; j < band.length; j++) {
    if (band[i].pid !== band[j].pid && faceDist_(band[i].x, band[j].x) > FACE_OTHER * scale) { out.unclear = true; return miss('unclear'); }
    if (band[i].pid === band[j].pid) { out.unclear = true; return miss('unclear'); }   // two faces of one photo = two different people
  }
  var keep = Math.min(R.lim, d1 / scale + FACE_TIGHT) * scale, ids = [];
  near.forEach(function (n) { if (n.d <= keep && ids.indexOf(n.pid) < 0) ids.push(n.pid); });
  ensureTab_('FindMe', FIND_COLUMNS);
  if (ids.length >= R.min) {
    appendRow_('FindMe', { at: fmt_(new Date()), galleryId: g.galleryId, phone: "'" + guest.phone, guestId: guest.guestId, name: guest.name, sure: ids.join(','), maybe: '', status: 'ok', face: near[0].pid + ':' + near[0].k });
    out.sure = ids; return out;
  }
  // a close match: the photos stay hidden; they are kept here for the couple to approve
  appendRow_('FindMe', { at: fmt_(new Date()), galleryId: g.galleryId, phone: "'" + guest.phone, guestId: guest.guestId, name: guest.name, sure: ids.join(','), maybe: '', status: 'close', face: near[0].pid + ':' + near[0].k });
  out.close = true; out.need = R.min;
  return out;
}
/** Public: where faces are in each photo (boxes only, no face codes) so the album maker keeps people in frame. */
function faceBoxes_(p) {
  var g = faceGallery_(p.g), f = readFacesFile_(g), out = {};
  var only = gatedFor_(g, p) ? guestSees_(g, loadManifest_(g), p).ids : null;   // step 63b
  Object.keys(f.photos || {}).forEach(function (pid) {
    if (only && !only[pid]) return; out[pid] = (f.photos[pid].f || []).map(function (fc) { return fc[0]; }); });
  return { boxes: out };
}
function faceGallery_(gid) {
  var g = findGallery_(gid);
  if (!openTo_(g)) throw new Error('This gallery is not available.');
  if (g.facesStatus !== 'Ready' && g.facesStatus !== 'Needs update') throw new Error('Face search is not ready for this gallery yet.');
  return g;
}
/** 128 numbers from a saved face code (base64 of 128 signed bytes). */
function faceBytes_(b64) {
  try { var b = Utilities.base64Decode(b64); if (b.length !== 128) return null; var o = new Array(128); for (var i = 0; i < 128; i++) o[i] = b[i] > 127 ? b[i] - 256 : b[i]; return o; }
  catch (e) { return null; }
}
/** Public (used by the video player on Vercel): is this an approved video of this gallery? */
function videoOk_(p) {
  var g = findGallery_(p.g);
  if (!openTo_(g, p)) return { ok: true, allowed: false };
  var id = String(p.id || '');
  if (gallerySummary_(g).posts.some(function (x) { return x.type === 'video' && x.fileId === id; })) return { allowed: true };
  // a video still waiting for the couple's review (the couple has to watch it to decide)
  var c = CacheService.getScriptCache(), k = 'vok:' + g.galleryId + ':' + id, hit = c.get(k);
  if (hit) return { allowed: hit === '1' };
  ensureTab_('GuestPosts', POST_COLUMNS);
  var ok = readTable_('GuestPosts').some(function (x) { return x.galleryId === g.galleryId && x.fileId === id && x.type === 'video' && x.status === 'review'; });
  c.put(k, ok ? '1' : '0', 300);
  return { allowed: ok };
}

/** Counts requests in a time window (shared by everyone). false = over the limit. */
function limitOk_(key, max, seconds) {
  var c = CacheService.getScriptCache(), used = Number(c.get('lim:' + key) || 0);
  if (used >= max) return false;
  c.put('lim:' + key, String(used + 1), seconds);
  return true;
}
/** CacheService keeps at most 100 KB per value: big values are stored in pieces. */
function cachePutBig_(key, str, seconds) {
  var c = CacheService.getScriptCache(), size = 90000, n = Math.ceil(str.length / size);
  if (n > 40) return;   // too big to keep (over ~3.5 MB): read it fresh
  var all = {}; for (var i = 0; i < n; i++) all[key + ':' + i] = str.substr(i * size, size);
  all[key + ':n'] = String(n);
  try { c.putAll(all, seconds); } catch (e) {}
}
function cacheGetBig_(key) {
  var c = CacheService.getScriptCache(), n = Number(c.get(key + ':n') || 0);
  if (!n) return null;
  var keys = []; for (var i = 0; i < n; i++) keys.push(key + ':' + i);
  var got = c.getAll(keys), out = '';
  for (var k = 0; k < n; k++) { if (got[keys[k]] == null) return null; out += got[keys[k]]; }
  return out;
}
function cacheRemoveBig_(key) { CacheService.getScriptCache().remove(key + ':n'); }

/** Logged in: email the gallery link to the client (you press "Send to client"). */
function sendGallery_(p, user) {
  var x = staffGallery_(p.g, user), g = x.g, s = getSettings_();
  var to = normEmail_(p.to);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: 'Enter a valid email address.' };
  // step 61: the couple gets their own private link (/c/<id>/<key>) and the guest link to share
  var site = String(s.siteUrl || 'https://picgrades-os.vercel.app').replace(/\/+$/, ''), url = site + '/g/' + g.galleryId, mine = site + '/c/' + g.galleryId + '/' + coupleKey_(g);
  sendEmail_(to, 'Your wedding gallery is ready · ' + g.title, esc_(g.title),
    ['Your photos from <b>' + esc_(g.companyName) + '</b> are ready.',
     '<b>Your private couple link</b> (only for the two of you: it opens your Control Panel, all your photos and your guests\' requests):',
     '<a href="' + esc_(mine) + '" style="display:inline-block;background:#141413;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open our wedding app</a>',
     '<span style="color:#777">' + esc_(mine) + '</span>',
     g.status === 'Draft' ? '<b>Check everything in your app, then tap Publish</b> (Control Panel, the gear). Until then guests see \u201cbeing prepared\u201d. After that, share the guest link.' : '',
     '<b>The guest link</b> (share it with family and friends: they find their own photos with <b>Find me</b>):',
     '<a href="' + esc_(url) + '" style="display:inline-block;background:#E9B44C;color:#141413;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Guest link</a>',
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
// Step 59: the wedding rows and Settings are read on almost every request (opening a gallery, every Control Panel save).
// They are kept for a short time: in this request (TBL_MEMO) and for every request (the script cache, 2 / 5 minutes).
// Every write through updateRowByNumber_ / appendRow_ / keepRows_ / ensureColumns_ clears them at once;
// a change typed by hand into the Sheet shows within those minutes.
var TABLE_CACHE = { Galleries: 120, Settings: 300 };
var TBL_MEMO = {};
function tableChanged_(name) {
  if (!TABLE_CACHE[name]) return;
  delete TBL_MEMO[name];
  try { CacheService.getScriptCache().remove('tbl:' + name + ':n'); } catch (e) {}
}
function readTable_(name) {
  var keep = TABLE_CACHE[name];
  if (keep) {
    if (TBL_MEMO[name]) return JSON.parse(TBL_MEMO[name]);
    var hit = cacheGetBig_('tbl:' + name);
    if (hit) { TBL_MEMO[name] = hit; return JSON.parse(hit); }
  }
  var rows = readTableFresh_(name);
  if (keep) { var str = JSON.stringify(rows); TBL_MEMO[name] = str; cachePutBig_('tbl:' + name, str, keep); }
  return rows;
}
function readTableFresh_(name) {
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
  tableChanged_(name);
  var sh = sheet_(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(function (h) { return obj[h] === undefined ? '' : obj[h]; }));
}


/** Update cells of one sheet row (row number from readTable_ _row). */
/** Keep only the rows where keep(row) is true (rewrites the tab once: fast even for thousands of rows). Returns how many were removed. */
function keepRows_(name, keep) {
  tableChanged_(name);
  var sh = sheet_(name), last = sh.getLastRow(), cols = sh.getLastColumn();
  if (last < 2) return 0;
  var values = sh.getRange(1, 1, last, cols).getValues(), head = values[0], kept = [];
  for (var r = 1; r < values.length; r++) {
    var obj = {}; head.forEach(function (h, c) { var v = values[r][c]; obj[h] = v instanceof Date ? fmt_(v) : v; });
    if (keep(obj)) kept.push(values[r]);
  }
  var removed = values.length - 1 - kept.length;
  if (!removed) return 0;
  sh.getRange(2, 1, last - 1, cols).clearContent();
  if (kept.length) sh.getRange(2, 1, kept.length, cols).setValues(kept);
  return removed;
}

function updateRowByNumber_(name, rowNumber, patch) {
  tableChanged_(name);
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

// =====================================================================
// Nightly clean-up (run setupNightly once: Apps Script › select setupNightly › Run)
// =====================================================================
var KEEP_HIDDEN_DAYS = 7, KEEP_PHONE_MONTHS = 6, KEEP_FACES_MONTHS = 12;

function setupNightly() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'nightlyCleanup') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('nightlyCleanup').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Nightly clean-up switched on (every night around 3 am).');
}

/** Every night: old login codes and sessions go; hidden guest uploads are deleted after 7 days;
 *  guest phone numbers are removed 6 months after the wedding and face data 12 months after it.
 *  Posts, albums, approved moments, names and notes stay. */
/** step 65d: one email 7 days before the free trial ends, one when it has ended (to whoever made the wedding). */
function trialMails_(now) {
  var sent = 0, day = 86400000;
  readTable_('Galleries').forEach(function (g) {
    if (g.plan !== 'trial' || !g.createdBy) return;
    var ends = parseDate_(g.trialEnds); if (!(ends.getTime() > 0)) return;
    var left = (ends - now) / day, pl = planOf_(g), up = upgradeLink_(), site = String(getSettings_().siteUrl || 'https://picgrades-os.vercel.app').replace(/\/+$/, '');
    var keep = 'Your photos, layouts, highlights, Root Moment, notes and hearts stay free until ' + esc_(String(pl.basicEnds).slice(0, 10)) + '.';
    if (left <= 0 && g.trialMail !== 'ended') {
      sendEmail_(g.createdBy, 'Your free trial has ended: ' + g.title, 'Your free trial has ended',
        ['Your wedding app <b>' + esc_(g.title) + '</b> is now the free basic gallery.', keep,
         'Find me, Reel Edits, Post Edits and guest moments are switched off. To keep them, upgrade your wedding app.',
         '<a href="' + esc_(up) + '" style="display:inline-block;padding:12px 22px;border-radius:24px;background:#141413;color:#fff;text-decoration:none">Upgrade</a>',
         'Your galleries: <a href="' + site + '/app/">' + site + '/app/</a>'], 'trial-ended', g.galleryId);
      updateRowByNumber_('Galleries', g._row, { trialMail: 'ended' }); sent++;
    } else if (left > 0 && left <= 7 && !g.trialMail) {
      sendEmail_(g.createdBy, Math.ceil(left) + ' days left in your free trial: ' + g.title, 'Your free trial ends soon',
        ['Your free trial of <b>' + esc_(g.title) + '</b> ends on ' + esc_(String(g.trialEnds).slice(0, 10)) + '.', keep,
         'After that, Find me, Reel Edits, Post Edits and guest moments switch off unless you upgrade.',
         '<a href="' + esc_(up) + '" style="display:inline-block;padding:12px 22px;border-radius:24px;background:#141413;color:#fff;text-decoration:none">Upgrade</a>'], 'trial-warn', g.galleryId);
      updateRowByNumber_('Galleries', g._row, { trialMail: 'warned' }); sent++;
    }
  });
  return sent;
}
function nightlyCleanup() {
  var lock = LockService.getScriptLock(); lock.waitLock(60000);
  var out = { sessions: 0, hiddenDeleted: 0, phonesRemoved: 0, facesRemoved: 0 };
  try {
    var now = new Date(), day = 86400000;
    out.sessions = keepRows_('Sessions', function (r) { var e = parseDate_(r.expiresAt); return !(e.getTime() > 0 && e.getTime() < now.getTime() - day); });

    ensureTab_('GuestPosts', POST_COLUMNS);
    readTable_('GuestPosts').forEach(function (x) {
      if (x.status !== 'hidden') return;
      var at = parseDate_(x.reviewedAt || x.at); if (!(at.getTime() > 0) || now - at < KEEP_HIDDEN_DAYS * day) return;
      String(x.fileId || '').split(',').filter(String).forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} });
      updateRowByNumber_('GuestPosts', x._row, { status: 'deleted', fileId: '' }); out.hiddenDeleted++;
    });

    ensureTab_('Galleries', GALLERY_COLUMNS); ensureTab_('Guests', GUEST_COLUMNS);
    out.trialMails = trialMails_(now);
    out.domainMails = domainMails_(now);
    var phoneGone = {}, guests = readTable_('Guests'), posts = readTable_('GuestPosts');
    readTable_('Galleries').forEach(function (g) {
      var wed = parseDate_(String(g.eventDate || '').length === 10 ? g.eventDate + ' 00:00:00' : g.createdAt); if (!(wed.getTime() > 0)) return;   // no date known: keep
      if (monthsSince_(wed, now) >= KEEP_PHONE_MONTHS) phoneGone[g.galleryId] = true;
      if (monthsSince_(wed, now) >= KEEP_FACES_MONTHS && g.facesFileId) {
        try { DriveApp.getFileById(g.facesFileId).setTrashed(true); } catch (e) {}
        updateRowByNumber_('Galleries', g._row, { facesFileId: '', facesStatus: 'Expired' }); out.facesRemoved++;
      }
    });
    guests.forEach(function (x) { if (phoneGone[x.galleryId] && x.phone) { updateRowByNumber_('Guests', x._row, { phone: '' }); out.phonesRemoved++; } });
    posts.forEach(function (x) { if (phoneGone[x.galleryId] && x.phone) updateRowByNumber_('GuestPosts', x._row, { phone: '' }); });
    // step 50: the Find me record and download requests also forget the mobile number (and the email) after the same months
    ensureTab_('FindMe', FIND_COLUMNS); ensureTab_('DownloadRequests', DLREQ_COLUMNS);
    readTable_('FindMe').forEach(function (x) { if (phoneGone[x.galleryId] && String(x.phone || '').replace(/'/g, '')) { updateRowByNumber_('FindMe', x._row, { phone: '' }); out.phonesRemoved++; } });
    readTable_('DownloadRequests').forEach(function (x) { if (phoneGone[x.galleryId] && (String(x.phone || '').replace(/'/g, '') || x.email)) { updateRowByNumber_('DownloadRequests', x._row, { phone: '', email: '' }); out.emailsRemoved = (out.emailsRemoved || 0) + 1; } });
    out.heartRowsSaved = packHearts_();
  } finally { lock.releaseLock(); }
  Logger.log(JSON.stringify(out));
  return out;
}
/** What a phone's taps on one photo add up to: +1 if it ends on a heart; -1 if it starts by taking a heart away
 *  (that heart was already counted, e.g. packed the night before). Works the same before and after packing. */
function tapsNet_(list) { return (list[list.length - 1] === 'like' ? 1 : 0) - (list[0] === 'unlike' ? 1 : 0); }

/** Nightly: hearts older than 2 days are packed into one 'likeTotal' row per photo, so the notes tab stays small
 *  (one row per photo with hearts instead of one row per tap). */
function packHearts_() {
  ensureTab_('MomentNotes', NOTE_COLUMNS);
  var sh = sheet_('MomentNotes'), last = sh.getLastRow(), cols = sh.getLastColumn();
  if (last < 2) return 0;
  var values = sh.getRange(1, 1, last, cols).getValues(), head = values[0], ix = {};
  head.forEach(function (h, c) { ix[h] = c; });
  var cutoff = Date.now() - 2 * 86400000, keep = [], totals = {}, taps = {}, packed = 0;
  for (var r = 1; r < values.length; r++) {
    var v = values[r], type = v[ix.type], at = parseDate_(v[ix.at] instanceof Date ? fmt_(v[ix.at]) : v[ix.at]).getTime();
    var gp = v[ix.galleryId] + '|' + v[ix.photoId];
    if (type === 'likeTotal') { totals[gp] = (totals[gp] || 0) + Number(v[ix.text] || 0); packed++; continue; }
    if ((type === 'like' || type === 'unlike') && at > 0 && at < cutoff) {
      var k = gp + '|' + v[ix.device]; (taps[k] = taps[k] || []).push(v[ix.status] === 'hidden' ? 'unlike' : type); packed++; continue;
    }
    keep.push(v);
  }
  if (!packed) return 0;
  Object.keys(taps).forEach(function (k) { var gp = k.split('|').slice(0, 2).join('|'); totals[gp] = (totals[gp] || 0) + tapsNet_(taps[k]); });
  var stamp = fmt_(new Date());
  Object.keys(totals).forEach(function (gp) {
    if (totals[gp] <= 0) return;
    var row = head.map(function () { return ''; }), parts = gp.split('|');
    row[ix.at] = stamp; row[ix.galleryId] = parts[0]; row[ix.photoId] = parts[1]; row[ix.type] = 'likeTotal'; row[ix.text] = totals[gp]; row[ix.status] = 'ok';
    keep.push(row);
  });
  sh.getRange(2, 1, last - 1, cols).clearContent();
  if (keep.length) sh.getRange(2, 1, keep.length, cols).setValues(keep);
  return (last - 1) - keep.length;
}

function monthsSince_(d, now) { return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()) - (now.getDate() < d.getDate() ? 1 : 0); }

// =====================================================================
// Photographer app (/p/<slug>): the photographer's portfolio, in the same app as the weddings
// =====================================================================
var STUDIO_COLUMNS = ['slug', 'companyName', 'name', 'tagline', 'about', 'city', 'phone', 'email', 'instagram', 'website', 'galleries', 'status', 'createdAt'];
var PORTFOLIO_FOLDER_RE = /^0*0?[_\s-]*portfolio$/i;   // "00_Portfolio" inside a wedding folder
// PicGrades' own profile is made the first time it is opened (edit the row in the Studios tab any time)
var PICGRADES_STUDIO = { slug: 'picgrades', companyName: 'AD Creative Mediaa', name: 'PicGrades', tagline: 'Wedding stories, edited with care',
  about: 'PicGrades edits and delivers wedding photographs for studios across India, and gives every couple their own wedding app: the gallery, Root Moment, Find me, reels, albums and more.',
  city: 'Surat, Gujarat', phone: '', email: 'adcmediaa@gmail.com', instagram: '', website: 'https://picgrades.com', galleries: 'c9w9wicn54f9', status: 'Live' };

function studioRow_(slug) {
  ensureTab_('Studios', STUDIO_COLUMNS);
  slug = String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
  var row = readTable_('Studios').filter(function (x) { return String(x.slug).toLowerCase() === slug; })[0];
  if (!row && slug === PICGRADES_STUDIO.slug) { appendRow_('Studios', Object.assign({}, PICGRADES_STUDIO, { createdAt: fmt_(new Date()) })); row = PICGRADES_STUDIO; }
  return row && row.status !== 'Off' ? row : null;
}

/** Public: the photographer's app. Weddings = their published galleries the couple has not hidden (portfolio on by default)
 *  plus any listed in the 'galleries' column. Each wedding shows only the photographer's picks (00_Portfolio), never the full wedding. */
function getStudio_(p) {
  var st = studioRow_(p.slug);
  if (!st) return { ok: false, error: 'This photographer page is not available.' };
  var key = 'studio:' + st.slug, hit = cacheGetBig_(key);
  if (hit) return { gallery: JSON.parse(hit) };
  var listed = String(st.galleries || '').split(/[\s,]+/).filter(String);
  ensureTab_('Galleries', GALLERY_COLUMNS);
  var gals = readTable_('Galleries').filter(function (g) {
    if (g.status !== 'Published' || String(g.portfolio || '').toLowerCase() === 'off') return false;
    return listed.indexOf(g.galleryId) > -1 || (st.companyName && String(g.companyName) === String(st.companyName));
  }).sort(function (a, b) { return String(b.eventDate || b.createdAt).localeCompare(String(a.eventDate || a.createdAt)); });
  var events = [], posts = [], reviews = [];
  gals.forEach(function (g) {
    var m; try { m = loadManifest_(g); } catch (e) { return; }
    var picks = (m.portfolio && m.portfolio.length) ? m.portfolio : [];
    if (!picks.length) {   // no 00_Portfolio folder yet: a few photos from each event
      var seen = {}, pool = (m.root || []).slice();
      (m.events || []).forEach(function (e) { pool = pool.concat(e.photos.slice(0, 5)); });
      pool.forEach(function (x) { if (!seen[x.id] && picks.length < 30) { seen[x.id] = 1; picks.push(x); } });
    }
    if (!picks.length) return;
    var title = g.title || m.title || 'Wedding';
    events.push({ name: title, folder: g.galleryId, date: g.eventDate || '', photos: picks.slice(0, 60) });
    posts.push({ postId: 'w-' + g.galleryId, fileId: picks.slice(0, 10).map(function (x) { return x.id; }).join(','), type: 'album', name: st.name, caption: title, at: g.eventDate || g.createdAt });
    if (String(g.thanksNote || '').trim()) reviews.push({ photoId: picks[0].id, name: title, text: String(g.thanksNote).slice(0, 400), at: g.eventDate || g.createdAt });
  });
  var out = { isStudio: true, title: st.name, studio: st.name, eventDate: '', events: events, personal: [], root: [], guestPosts: posts,
    likes: {}, notes: {}, recentNotes: reviews, mine: {}, faceSearch: false, isCouple: false, guestGate: 'open',
    studioInfo: { slug: st.slug, name: st.name, tagline: st.tagline || '', about: st.about || '', city: st.city || '', phone: st.phone || '', email: st.email || '', instagram: st.instagram || '', website: st.website || '' } };
  cachePutBig_(key, JSON.stringify(out), 300);
  return { gallery: out };
}
