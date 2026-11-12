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
      e.f.forEach(function (fc) { out.push({ pid: pid, box: fc[0], d: unpack(fc[1], faces.scale), w: e.w, h: e.h }); });
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

  /** Group faces into people. Returns [{faces:[…], photos:[pid…], cover:face}] biggest first. */
  function cluster(flat, minPhotos) {
    var groups = [];
    flat.forEach(function (x) {
      var g = null, gd = 1e9;
      groups.forEach(function (c) { var d = dist(x.d, c.mean); if (d < gd) { gd = d; g = c; } });
      if (g && gd <= 0.48) {
        g.faces.push(x); var n = g.faces.length;
        for (var i = 0; i < 128; i++) g.mean[i] += (x.d[i] - g.mean[i]) / n;
      } else groups.push({ faces: [x], mean: Float32Array.from(x.d) });
    });
    return groups.map(function (c) {
      var seen = {}, photos = [];
      c.faces.forEach(function (x) { if (!seen[x.pid]) { seen[x.pid] = 1; photos.push(x.pid); } });
      var cover = c.faces.slice().sort(function (a, b) { return b.box[2] * b.w - a.box[2] * a.w; })[0];
      return { faces: c.faces, photos: photos, cover: cover };
    }).filter(function (c) { return c.photos.length >= (minPhotos || 2); })
      .sort(function (a, b) { return b.photos.length - a.photos.length; });
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
    mergeEntry: mergeEntry, flatten: flatten, match: match, cluster: cluster, cropStyle: cropStyle, SURE: SURE, MAYBE: MAYBE };
})();
