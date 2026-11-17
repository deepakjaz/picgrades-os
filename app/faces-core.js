/* PicGrades face reading core — shared by the face-reading page (faces.html) and the gallery (Find me).
   Uses face-api (MIT, /app/vendor/face-api.js) with models in /app/models. Faces are read in the browser:
   photos and selfies are never uploaded. For Find me only the selfie's face code (128 numbers) is sent, and the
   PicGrades server matches it, so nobody can download the face codes of everyone in a wedding. */
(function () {
  'use strict';
  var MODEL_URL = '/app/models';
  var SCALE = 250;               // descriptor value × 250 → int8
  var SURE = 0.5, MAYBE = 0.58;  // face distance limits for "Your photos" / "Maybe you"
  var ready = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.faceapi) return res();
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load face search. Check the internet and try again.')); };
      document.head.appendChild(s);
    });
  }

  /** Load the library + the three models once. Resolves with the backend name (webgl is fast, cpu is slow). */
  function load() {
    if (!ready) {
      ready = loadScript('/app/vendor/face-api.js').then(function () {
        var tf = faceapi.tf;
        return tf.setBackend('webgl').catch(function () { return false; }).then(function (ok) {
          if (!ok || tf.getBackend() !== 'webgl') return tf.setBackend('cpu');
        }).then(function () { return tf.ready(); });
      }).then(function () {
        return Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
      }).then(function () { return faceapi.tf.getBackend(); });
      ready.catch(function () { ready = null; });
    }
    return ready;
  }

  /** All faces in an image/canvas/video: [{box:{x,y,width,height}, score, descriptor}] */
  function detect(input, minConfidence) {
    return faceapi.detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: minConfidence || 0.5, maxResults: 80 }))
      .withFaceLandmarks().withFaceDescriptors()
      .then(function (list) { return list.map(function (r) { return { box: r.detection.box, score: r.detection.score, descriptor: r.descriptor }; }); });
  }

  /** Only find faces (no descriptor) — fast, used for the live camera box. */
  function locate(input, minConfidence) {
    return faceapi.detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: minConfidence || 0.5, maxResults: 5 }));
  }

  /** Step 60 live check: the biggest face and which way it is turned. yaw ≈ 0 looking straight; about ±0.15 or more turned to a side.
   *  (Where the nose tip sits between the eyes, as a share of the eye distance. A flat photo tilted in front of the camera stays near 0.) */
  function pose(input, minConfidence) {
    return faceapi.detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: minConfidence || 0.5 })).withFaceLandmarks().then(function (r) {
      if (!r) return null;
      var L = r.landmarks, c = function (pts) { var x = 0, y = 0; pts.forEach(function (q) { x += q.x; y += q.y; }); return { x: x / pts.length, y: y / pts.length }; };
      var le = c(L.getLeftEye()), re = c(L.getRightEye()), tip = L.getNose()[3], span = Math.abs(re.x - le.x) || 1;
      return { box: r.detection.box, score: r.detection.score, yaw: (tip.x - (le.x + re.x) / 2) / span };
    });
  }

  function pack(desc) {
    var b = new Int8Array(128);
    for (var i = 0; i < 128; i++) b[i] = Math.max(-127, Math.min(127, Math.round(desc[i] * SCALE)));
    var u = new Uint8Array(b.buffer), s = '';
    for (var j = 0; j < u.length; j++) s += String.fromCharCode(u[j]);
    return btoa(s);
  }
  function unpack(str, scale) {
    var bin = atob(str), out = new Float32Array(128), sc = scale || SCALE;
    for (var i = 0; i < 128; i++) { var v = bin.charCodeAt(i); out[i] = (v > 127 ? v - 256 : v) / sc; }
    return out;
  }
  function dist(a, b) { var t = 0; for (var i = 0; i < 128; i++) { var d = a[i] - b[i]; t += d * d; } return Math.sqrt(t); }

  /** Faces of one photo → stored entry {w,h,f:[[x,y,w,h (0..1000)], packed]} (tiny faces skipped). */
  function toEntry(faces, w, h, minPx) {
    return {
      w: w, h: h,
      f: faces.filter(function (fc) { return fc.box.width >= (minPx || 24); }).map(function (fc) {
        var b = fc.box;
        return [[Math.round(b.x / w * 1000), Math.round(b.y / h * 1000), Math.round(b.width / w * 1000), Math.round(b.height / h * 1000)], pack(fc.descriptor)];
      })
    };
  }

  function iou(a, b) {
    var x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]), x2 = Math.min(a[0] + a[2], b[0] + b[2]), y2 = Math.min(a[1] + a[3], b[1] + b[3]);
    var inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    return inter / (a[2] * a[3] + b[2] * b[3] - inter || 1);
  }
  /** Pass 2: keep pass-1 faces, add faces pass 2 found that are not already there. */
  function mergeEntry(oldE, newE) {
    if (!oldE) return newE;
    var f = oldE.f.slice();
    newE.f.forEach(function (n) { if (!f.some(function (o) { return iou(o[0], n[0]) > 0.3; })) f.push(n); });
    return { w: oldE.w || newE.w, h: oldE.h || newE.h, f: f };
  }

  /** Unpack a faces file into a flat list [{pid, box, d}] */
  function flatten(faces) {
    var out = [];
    Object.keys(faces.photos || {}).forEach(function (pid) {
      var e = faces.photos[pid];
      e.f.forEach(function (fc, k) { out.push({ pid: pid, k: k, key: pid + ':' + k, box: fc[0], d: unpack(fc[1], faces.scale), w: e.w, h: e.h }); });
    });
    return out;
  }

  /** Photos of the person in `desc`: { sure:[pid…], maybe:[pid…] } sorted by closeness. */
  function match(desc, flat) {
    var best = {};
    flat.forEach(function (x) { var d = dist(desc, x.d); if (best[x.pid] === undefined || d < best[x.pid]) best[x.pid] = d; });
    var ids = Object.keys(best).sort(function (a, b) { return best[a] - best[b]; });
    return {
      sure: ids.filter(function (id) { return best[id] <= SURE; }),
      maybe: ids.filter(function (id) { return best[id] > SURE && best[id] <= MAYBE; }),
      best: best
    };
  }

  // Step 73: grouping in two passes.
  //  1. each face joins the closest group (strict, 0.48), else starts a new one;
  //  2. groups that look alike are joined (0.52 between their averages) — this catches the same person split by a side pose,
  //     make-up or light. Two groups that share a photo are never joined: two faces in one photo are two different people
  //     (this keeps brothers, a father and son, sisters apart).
  var JOIN = 0.48, JOIN2 = 0.52;
  function distUpTo(a, b, lim) { var t = 0, l2 = lim * lim; for (var i = 0; i < 128; i++) { var d = a[i] - b[i]; t += d * d; if (t > l2) return 1e9; } return Math.sqrt(t); }
  function makeGroups(flat) {
    var groups = [];
    flat.forEach(function (x) {
      var g = null, gd = 1e9;
      groups.forEach(function (c) { var d = distUpTo(x.d, c.mean, Math.min(gd, JOIN)); if (d < gd) { gd = d; g = c; } });
      if (g && gd <= JOIN) {
        g.faces.push(x); g.pids[x.pid] = (g.pids[x.pid] || 0) + 1; var n = g.faces.length;
        for (var i = 0; i < 128; i++) g.mean[i] += (x.d[i] - g.mean[i]) / n;
      } else { var p = {}; p[x.pid] = 1; groups.push({ faces: [x], mean: Float32Array.from(x.d), pids: p }); }
    });
    // pass 2: join look-alike groups, closest first
    var pairs = [];
    for (var i = 0; i < groups.length; i++) for (var j = i + 1; j < groups.length; j++) {
      var d = distUpTo(groups[i].mean, groups[j].mean, JOIN2); if (d <= JOIN2) pairs.push([d, i, j]);
    }
    pairs.sort(function (a, b) { return a[0] - b[0]; });
    var root = function (i) { while (groups[i].into !== undefined) i = groups[i].into; return i; };
    pairs.forEach(function (pr) {
      var a = root(pr[1]), b = root(pr[2]); if (a === b) return;
      var A = groups[a], B = groups[b];
      if (distUpTo(A.mean, B.mean, JOIN2) > JOIN2) return;
      for (var pid in B.pids) if (A.pids[pid]) return;        // they share a photo: two different people
      var na = A.faces.length, nb = B.faces.length;
      for (var k = 0; k < 128; k++) A.mean[k] = (A.mean[k] * na + B.mean[k] * nb) / (na + nb);
      A.faces = A.faces.concat(B.faces); for (pid in B.pids) A.pids[pid] = (A.pids[pid] || 0) + B.pids[pid];
      B.into = a;
    });
    return groups.filter(function (c) { return c.into === undefined; });
  }
  function describe(faces) {
    var seen = {}, photos = [];
    faces.forEach(function (x) { if (!seen[x.pid]) { seen[x.pid] = 1; photos.push(x.pid); } });
    var cover = faces.slice().sort(function (a, b) { return b.box[2] * b.w - a.box[2] * a.w; })[0];
    return { faces: faces, photos: photos, cover: cover };
  }
  /** Group faces into people. Returns [{faces:[…], photos:[pid…], cover:face}] biggest first. */
  function cluster(flat, minPhotos) {
    return makeGroups(flat).map(function (c) { return describe(c.faces); })
      .filter(function (c) { return c.photos.length >= (minPhotos || 2); })
      .sort(function (a, b) { return b.photos.length - a.photos.length; });
  }

  /** Step 73: people as the photographer fixed them by hand (joined, named, hidden, wrong faces taken out).
   *  saved = [{id, name, hide, faces:['photoId:n'…], out:['photoId:n'…]}]. Each automatic group goes to the saved person it
   *  shares the most faces with; groups nobody touched stay as they are. Returns [{id|null, name, hide, faces, photos, cover}]. */
  function people(flat, saved, minPhotos) {
    saved = saved || [];
    var byKey = {}, owner = {}, outOf = {};
    flat.forEach(function (x) { byKey[x.key] = x; });
    saved.forEach(function (p, i) { (p.faces || []).forEach(function (k) { owner[k] = i; }); (p.out || []).forEach(function (k) { outOf[i + '|' + k] = 1; }); });
    var extra = saved.map(function () { return []; }), auto = [];
    makeGroups(flat).forEach(function (c) {
      var votes = {}, best = -1, bv = 0;
      c.faces.forEach(function (x) { var o = owner[x.key]; if (o !== undefined) votes[o] = (votes[o] || 0) + 1; });
      Object.keys(votes).forEach(function (o) { if (votes[o] > bv) { bv = votes[o]; best = +o; } });
      if (best >= 0) c.faces.forEach(function (x) { if (owner[x.key] === undefined) extra[best].push(x); });
      else auto.push(c.faces);
    });
    var out = [];
    saved.forEach(function (p, i) {
      var faces = [], seen = {};
      (p.faces || []).concat(extra[i].map(function (x) { return x.key; })).forEach(function (k) {
        if (seen[k] || outOf[i + '|' + k] || !byKey[k]) return; seen[k] = 1; faces.push(byKey[k]);
      });
      if (!faces.length) return;
      var d = describe(faces); d.id = p.id; d.name = p.name || ''; d.hide = !!p.hide; d.out = (p.out || []).slice(); out.push(d);
    });
    auto.forEach(function (faces) { var d = describe(faces); if (d.photos.length < (minPhotos || 2)) return; d.id = null; d.name = ''; d.hide = false; d.out = []; out.push(d); });
    return out.sort(function (a, b) { return (b.name ? 1 : 0) - (a.name ? 1 : 0) || b.photos.length - a.photos.length; });
  }

  /** Step 73: what a GUEST gets from Find me (same rules as the server: very close faces only, one clear person, at least 3 photos),
   *  plus every photo of the person the photographer joined by hand. Returns {status:'ok'|'close'|'none'|'unclear', ids}. */
  var G_LIM = 0.42, G_MIN = 3, G_TIGHT = 0.08, G_BAND = 0.12, G_OTHER = 0.55;
  function guestMatch(desc, flat, saved) {
    var near = [];
    flat.forEach(function (x) { var d = distUpTo(desc, x.d, G_LIM + G_BAND); if (d <= G_LIM + G_BAND) near.push({ x: x, d: d }); });
    near.sort(function (a, b) { return a.d - b.d; });
    if (!near.length || near[0].d > G_LIM) return { status: 'none', ids: [] };
    var d1 = near[0].d, band = near.filter(function (n) { return n.d <= d1 + G_BAND; }).slice(0, 16);
    for (var i = 0; i < band.length; i++) for (var j = i + 1; j < band.length; j++) {
      if (band[i].x.pid === band[j].x.pid || (band[i].x.pid !== band[j].x.pid && dist(band[i].x.d, band[j].x.d) > G_OTHER)) return { status: 'unclear', ids: [] };
    }
    var keep = Math.min(G_LIM, d1 + G_TIGHT), ids = [];
    near.forEach(function (n) { if (n.d <= keep && ids.indexOf(n.x.pid) < 0) ids.push(n.x.pid); });
    var plain = ids.length;
    personPhotos(saved, near[0].x.key).forEach(function (pid) { if (ids.indexOf(pid) < 0) ids.push(pid); });
    return { status: ids.length >= G_MIN ? 'ok' : 'close', ids: ids, plain: plain };
  }
  /** Photos of the hand-fixed person a face belongs to (not hidden ones). */
  function personPhotos(saved, key) {
    var p = (saved || []).filter(function (p) { return !p.hide && (p.faces || []).indexOf(key) >= 0 && (p.out || []).indexOf(key) < 0; })[0];
    if (!p) return [];
    var seen = {}, out = [];
    p.faces.forEach(function (k) { if ((p.out || []).indexOf(k) >= 0) return; var pid = k.slice(0, k.lastIndexOf(':')); if (!seen[pid]) { seen[pid] = 1; out.push(pid); } });
    return out;
  }

  /** CSS for a round face crop from a Drive image (no download needed). */
  function cropStyle(x, size, imgUrl) {
    var bw = x.box[2] / 1000, bh = x.box[3] / 1000, bx = x.box[0] / 1000, by = x.box[1] / 1000;
    var pad = 1.5, Wi = size / (bw * pad), Hi = Wi * (x.h / x.w);
    var cx = (bx + bw / 2) * Wi, cy = (by + bh / 2) * Hi;
    return 'background-image:url("' + imgUrl + '");background-size:' + Wi.toFixed(1) + 'px ' + Hi.toFixed(1) + 'px;background-position:' +
      (size / 2 - cx).toFixed(1) + 'px ' + (size / 2 - cy).toFixed(1) + 'px;background-repeat:no-repeat';
  }

  window.PGFaces = { load: load, detect: detect, locate: locate, pose: pose, pack: pack, unpack: unpack, dist: dist, toEntry: toEntry,
    mergeEntry: mergeEntry, flatten: flatten, match: match, cluster: cluster, people: people, guestMatch: guestMatch, personPhotos: personPhotos, cropStyle: cropStyle, SURE: SURE, MAYBE: MAYBE };
})();
