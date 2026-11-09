/* PicGrades Reel Edits — makes a vertical 1080×1920 video from gallery photos, cut on the beat of the music.
   Screens work like the phone video editors people know: styles feed → choose photos → editor (preview, timeline with
   text / drawings / music / clips, tools row, undo) → export and share.
   Runs on the guest's phone (canvas + Web Audio + MediaRecorder). Nothing is uploaded. Music: /app/music/tracks.json. */
(function () {
  'use strict';
  var W = 1080, H = 1920, FPS = 30;
  var S = null; // current session

  // ---------- small helpers ----------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function slug(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'wedding'; }
  function ease(t) { return t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  var CSS = '' +
    '.rl-wrap{position:fixed;inset:0;z-index:300;background:#0b0908;color:#f3eee6;font-family:"Plus Jakarta Sans",system-ui,sans-serif;overflow:hidden}' +
    '.re-view{position:absolute;inset:0;display:none;flex-direction:column}' +
    '.rl-wrap[data-view=load] .re-v-load,.rl-wrap[data-view=inspo] .re-v-inspo,.rl-wrap[data-view=edit] .re-v-edit,.rl-wrap[data-view=export] .re-v-export{display:flex}' +
    '.re-v-load{align-items:center;justify-content:center;gap:12px}' +
    '.re-bar{display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px 8px;flex:none}' +
    '.re-bar-float{position:absolute;left:0;right:0;top:0;z-index:3;background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,0))}' +
    '.re-ib{flex:none;width:40px;height:40px;border-radius:20px;border:0;background:rgba(255,255,255,.08);color:#fff;font-size:22px;display:grid;place-items:center;cursor:pointer}.re-ib svg{width:22px;height:22px}.re-ib:disabled{opacity:.3}' +
    '.re-logo{display:flex;align-items:center;gap:7px;font:700 15px/1 "Plus Jakarta Sans",system-ui,sans-serif;letter-spacing:-.01em;margin-right:auto}.re-logo svg{width:26px;height:26px;color:#fff}' +
    '.re-logo-big{font-size:22px;margin:0}.re-logo-big svg{width:44px;height:44px}' +
    '.re-colsel{flex:none;max-width:44vw;height:36px;border-radius:18px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.35);color:#fff;font:600 13px/1 inherit;padding:0 12px}' +
    '.re-next{flex:none;height:38px;padding:0 16px;border-radius:12px;border:0;background:#fff;color:#111;font:800 15px/1 inherit;cursor:pointer}.re-next:disabled{opacity:.4}' +
    '.re-q{font:700 14px/1 inherit;color:rgba(255,255,255,.85)}' +
    // styles feed
    '.re-feed{flex:1;overflow-y:auto;scroll-snap-type:y mandatory;-webkit-overflow-scrolling:touch;scrollbar-width:none}.re-feed::-webkit-scrollbar{display:none}' +
    '.re-ins{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center;background:#000}' +
    '.re-ins-slot{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}.re-ins-slot canvas{height:100%;max-width:100%;object-fit:contain}' +
    '.re-ins-info{position:absolute;left:0;right:0;bottom:0;padding:60px 16px calc(env(safe-area-inset-bottom,0px) + 18px);background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.75));display:grid;gap:6px}' +
    '.re-cats{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0 12px 10px}.re-cats::-webkit-scrollbar{display:none}' +
    '.re-cat{flex:none;height:32px;padding:0 14px;border-radius:16px;border:1px solid rgba(255,255,255,.3);background:rgba(0,0,0,.35);color:#fff;font:700 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}.re-cat.on{background:#fff;color:#111;border-color:#fff}' +
    '.re-mute{position:absolute;right:14px;top:calc(env(safe-area-inset-top,0px) + 106px);z-index:2;display:flex;align-items:center;gap:6px;height:40px;padding:0 12px;border-radius:20px;border:0;background:rgba(0,0,0,.6);color:#fff;font:700 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}' +
    '.re-mute svg{width:20px;height:20px}.re-mute.on{padding:0 10px}.re-mute.glow{background:#FAC646;color:#111;animation:reGlow 1.4s ease-in-out infinite}' +
    '@keyframes reGlow{0%,100%{box-shadow:0 0 0 0 rgba(250,198,70,.7)}50%{box-shadow:0 0 0 10px rgba(250,198,70,0)}}' +
    '.re-ins-info b{font-size:19px}.re-ins-info span{font-size:13px;color:rgba(255,255,255,.8)}' +
    '.re-use{margin-top:8px;height:50px;border-radius:14px;border:0;background:#fff;color:#111;font:800 16px/1 inherit;cursor:pointer}' +
    // editor
    '.re-stage{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:2px 12px;position:relative}' +
    '.re-stage canvas,.re-stage video{height:100%;max-height:100%;max-width:100%;aspect-ratio:9/16;background:#000;border-radius:12px}' +
    '.re-ctl{flex:none;display:flex;align-items:center;gap:12px;padding:6px 12px}' +
    '.re-play{width:40px;height:40px;border:0;background:none;color:#fff;font-size:22px;cursor:pointer}' +
    '.re-time{margin:0 auto;text-align:center;font:500 13px/1.3 "IBM Plex Mono",monospace}.re-time b{display:block;color:#fff;font-weight:600}.re-time span{color:rgba(255,255,255,.5)}' +
    '.re-ur{display:flex;gap:6px}' +
    '.re-tlwrap{flex:none;position:relative;background:#121010}' +
    '.re-tl{overflow-x:auto;overflow-y:hidden;scrollbar-width:none;-webkit-overflow-scrolling:touch}.re-tl::-webkit-scrollbar{display:none}' +
    '.re-tl-in{position:relative;padding:6px 0}' +
    '.re-r-fx{height:26px}.re-fxb{background:linear-gradient(90deg,rgba(250,198,70,.35),rgba(255,79,121,.35))!important;color:#fff}.re-fxb.off{background:rgba(255,255,255,.08)!important;color:rgba(255,255,255,.6)}' +
    '.re-fxrow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)}.re-fxrow span{font-size:14px}' +
    '.re-fxbtn{height:34px;padding:0 14px;border-radius:17px;border:0;background:#D33A2C;color:#fff;font:700 13px/1 "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}.re-fxbtn.off{background:#FAC646;color:#111}' +
    '.re-row{position:relative;height:34px;margin:3px 0}.re-r-clip{height:52px}' +
    '.re-head{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:#fff;border-radius:1px;pointer-events:none;box-shadow:0 0 6px rgba(0,0,0,.6)}' +
    '.re-blk{position:absolute;top:0;bottom:0;border:0;border-radius:8px;padding:0 8px;display:flex;align-items:center;gap:2px;overflow:hidden;color:#fff;font:700 12px/1 inherit;white-space:nowrap;cursor:pointer;text-align:left}' +
    '.re-txt{background:#7B3FE4}.re-stkb{background:#2A9D8F}.re-aud{background:#A0137A;padding:0}.re-aud span{position:relative;z-index:1;padding:0 8px}' +
    '.re-aud i{position:absolute;bottom:0;width:2px;background:rgba(255,255,255,.35);border-radius:1px}' +
    '.re-clip{padding:0;background:#2a2622;border:2px solid #0b0908}.re-clip img{height:100%;width:52px;object-fit:cover;flex:none}.re-card{background:#3a332d;justify-content:center;color:#E7C873}' +
    '.re-addclip{width:110px;background:#2a2622;justify-content:center;gap:6px;color:#fff}.re-addclip svg{width:18px;height:18px}' +
    '.re-tools{flex:none;display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:8px 6px calc(env(safe-area-inset-bottom,0px) + 10px);background:#0b0908}.re-tools::-webkit-scrollbar{display:none}' +
    '.re-tool{flex:none;width:68px;display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:none;color:#fff;font:600 11.5px/1 inherit;cursor:pointer;padding:4px 0}.re-tool svg{width:25px;height:25px}.re-tool:disabled{opacity:.3}' +
    '.rl-msg{font-size:.8rem;color:rgba(255,255,255,.75);margin:0;padding:0 14px;display:none}.rl-msg.on{display:block;padding:4px 14px}' +
    // tool sheets
    '.re-sheet{position:absolute;left:0;right:0;bottom:0;z-index:6;max-height:56%;display:flex;flex-direction:column;background:#17130f;border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.6);animation:reUp .22s ease}' +
    '@keyframes reUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}' +
    '.re-sh-top{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 6px}.re-sh-top b{font-size:16px}' +
    '.re-sh-done{height:34px;padding:0 16px;border-radius:17px;border:0;background:#fff;color:#111;font:800 13px/1 inherit;cursor:pointer}' +
    '.re-sh-body{overflow-y:auto;padding:6px 16px calc(env(safe-area-inset-bottom,0px) + 16px)}' +
    '.re-hint{font-size:12px;color:rgba(255,255,255,.6);margin:0 0 10px}' +
    '.re-track{width:100%;display:flex;align-items:center;gap:12px;min-height:50px;padding:6px 10px;border:0;border-radius:12px;background:none;color:#fff;font:600 14px/1.2 inherit;text-align:left;cursor:pointer}' +
    '.re-track i{width:38px;height:38px;border-radius:10px;background:#2a2622;display:grid;place-items:center;flex:none}.re-track i svg{width:20px;height:20px}.re-track span{flex:1}.re-track small{color:rgba(255,255,255,.5)}' +
    '.re-track.on{background:rgba(250,198,70,.12)}.re-track.on i{background:#FAC646;color:#111}' +
    '.re-ta{min-height:64px;padding:10px 12px;resize:none;font-size:18px}' +
    '.re-dot{flex:none;width:32px;height:32px;border-radius:16px;border:2px solid rgba(255,255,255,.25);cursor:pointer}.re-dot.on{border-color:#fff;box-shadow:0 0 0 2px #FAC646}' +
    '.re-sl{display:grid;grid-template-columns:96px 1fr 34px;align-items:center;gap:8px;font-size:12.5px;margin:8px 0}.re-sl span:last-child{text-align:right;color:rgba(255,255,255,.6)}.re-range{width:100%;accent-color:#FAC646}' +
    '.re-del{display:flex;align-items:center;justify-content:center;gap:8px;color:#ff8a80;border-color:rgba(255,138,128,.4)}.re-del svg{width:18px;height:18px}' +
    '.re-stk-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.re-stk{aspect-ratio:1;border:0;border-radius:12px;background:#2a2622;color:#fff;display:grid;place-items:center;cursor:pointer}.re-stk svg{width:60%;height:60%}' +
    '.re-filters{display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;padding-bottom:6px}.re-filter{flex:none;width:74px;border:0;background:none;color:#fff;font:600 11px/1 inherit;display:grid;gap:6px;cursor:pointer}' +
    '.re-filter img{width:74px;height:98px;object-fit:cover;border-radius:10px;border:2px solid transparent}.re-filter.on img{border-color:#FAC646}' +
    '.re-clipbar{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;margin-bottom:6px}' +
    // shared bits
    '.rl-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:2px 0 10px}.rl-row::-webkit-scrollbar{display:none}' +
    '.rl-lbl{font:500 .62rem/1 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.55);margin:6px 0 8px}' +
    '.rl-chip{flex:none;min-height:38px;padding:0 14px;border-radius:19px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;font:600 .78rem/1 inherit;cursor:pointer;white-space:nowrap}' +
    '.rl-chip.on{background:#fff;color:#111;border-color:#fff}' +
    '.rl-in{width:100%;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:#0b0908;color:#fff;padding:0 12px;font:inherit;font-size:16px;margin-bottom:8px;box-sizing:border-box}' +
    '.rl-tog{display:flex;align-items:center;gap:10px;min-height:44px;font-size:.85rem;cursor:pointer}.rl-tog input{width:20px;height:20px;accent-color:#FAC646}' +
    '.rl-go{width:100%;min-height:50px;border:0;border-radius:14px;background:#fff;color:#111;font:800 1rem/1 inherit;cursor:pointer;margin-top:8px}' +
    '.rl-sub{width:100%;min-height:46px;border-radius:14px;border:1px solid rgba(255,255,255,.2);background:none;color:#fff;font:600 .9rem/1 inherit;cursor:pointer;margin-top:8px}' +
    'body.rl-on .tkg-global-nav,body.rl-on .pgv-top,body.rl-on .pgv-bar{display:none!important}' +
    // export
    '.re-exp-panel{flex:none;padding:10px 16px calc(env(safe-area-inset-bottom,0px) + 16px)}' +
    '.rl-status{position:absolute;inset:2px 12px;display:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(0,0,0,.35);text-align:center;pointer-events:none;border-radius:12px}' +
    '.rl-status.on{display:flex}.rl-status b{font:400 4rem/1 "Cormorant Garamond",serif;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.6)}' +
    '.rl-status span{font:600 .95rem/1.3 inherit;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.7)}.rl-status small{font:500 .75rem/1 "IBM Plex Mono",monospace;color:#FAC646;letter-spacing:.06em;text-transform:uppercase}' +
    '.rl-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;margin-top:6px}.rl-bar i{display:block;height:100%;width:0;background:#FAC646}' +
    // photo picker
    '.rl-picker{position:absolute;inset:0;z-index:7;background:#0b0908;display:flex;flex-direction:column}' +
    '.rl-pcount{margin-left:auto;font:500 .75rem/1 "IBM Plex Mono",monospace;color:rgba(255,255,255,.7)}' +
    '.rl-pgrid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:2px;padding:0 0 calc(env(safe-area-inset-bottom,0px) + 10px);align-content:start}' +
    '.rl-pick{position:relative;aspect-ratio:3/4;border:0;padding:0;background:#222;cursor:pointer}.rl-pick img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.rl-pick i{position:absolute;right:6px;top:6px;width:24px;height:24px;border-radius:12px;border:2px solid #fff;background:rgba(0,0,0,.25);font:800 12px/20px inherit;font-style:normal;text-align:center;color:#111}' +
    '.rl-pick.on i{background:#FAC646;border-color:#FAC646}.rl-pick.on img{opacity:.75}' +
    '.rl-pick u{position:absolute;left:6px;bottom:6px;padding:2px 6px;border-radius:8px;background:rgba(0,0,0,.6);color:#fff;font:600 11px/1.3 inherit;text-decoration:none}' +
    '.re-phone{flex:none;display:inline-flex;align-items:center;gap:5px;height:36px;padding:0 12px;border-radius:18px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:600 13px/1 inherit}.re-phone svg{width:16px;height:16px}' +
    '.re-pnote{margin:0;padding:0 14px 8px;font:500 12px/1.4 inherit;color:rgba(255,255,255,.6)}' +
    '.re-sel{position:absolute;border:3px solid #FAC646;border-radius:6px;box-shadow:0 0 0 2px rgba(0,0,0,.35);pointer-events:none;z-index:3}' +
    '.re-thisone{display:flex;align-items:center;gap:12px;padding:0 0 12px}.re-thisone img{width:48px;height:64px;object-fit:cover;border-radius:6px;border:2px solid #FAC646}.re-thisone span{flex:1;font:600 14px/1.2 inherit;color:#fff}' +
    '.re-repl{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 16px;border-radius:19px;border:0;background:#FAC646;color:#111;font:700 14px/1 inherit}.re-repl svg{width:16px;height:16px}' +
    '.re-clip{position:relative}.re-vmark{position:absolute;left:6px;top:6px;width:18px;height:18px;border-radius:9px;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center}.re-vmark svg{width:10px;height:10px;color:#fff}';

  // ---------- loading photos (direct from Drive, else through the gallery server) ----------
  // Photos are kept as small compressed files; the phone decodes them only while drawing (a big list of decoded
  // bitmaps made iPhones reload the page).
  var URLS = [];
  function bitmapFromBlob(b) { return new Promise(function (res, rej) { var i = new Image(), u = URL.createObjectURL(b); URLS.push(u); i.onload = function () { res(i); }; i.onerror = rej; i.src = u; }); }
  function freeUrls() { URLS.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); URLS = []; }
  function imgFromSrc(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
  function loadPhotos(ids, onProgress) {
    var out = {}, done = 0, viaServer = false;
    function direct(id) {
      return fetch('https://lh3.googleusercontent.com/d/' + id + '=w1080').then(function (r) { if (!r.ok) throw new Error('x'); return r.blob(); }).then(bitmapFromBlob);
    }
    function server(batch) {
      return S.opt.api('photoData', { ids: batch }).then(function (r) {
        return Promise.all(batch.map(function (id) { return r.images[id] ? imgFromSrc(r.images[id]).then(function (im) { out[id] = im; }) : null; }));
      });
    }
    var queue = ids.slice();
    function next() {
      if (!queue.length) return Promise.resolve();
      var batch = queue.splice(0, 4);
      var p = viaServer ? server(batch) : Promise.all(batch.map(function (id) { return direct(id).then(function (b) { out[id] = b; }, function () { return 'fail'; }); }))
        .then(function (r) { var failed = batch.filter(function (id) { return !out[id]; }); if (failed.length && r.indexOf('fail') > -1) { viaServer = true; return server(failed); } });
      return p.then(function () { done += batch.length; onProgress(done, ids.length); return next(); });
    }
    return next().then(function () { return out; });
  }

  // ---------- photos and videos from the phone (step 23) ----------
  // They never leave the phone: read straight from the file, kept only while Reel Edits is open, freed on close.
  var PHONE_MAX = 40, VIDEO_MAX = 10, CLIP_MAX = 8;   // files per reel · videos per reel · seconds a video clip starts with
  function isPhone(id) { return String(id).indexOf('ph:') === 0; }
  function isVideo(id) { return !!(S && S.vids && S.vids[id]); }
  function thumbUrl(id, w) { return isPhone(id) ? (S.thumbs[id] || '') : 'https://lh3.googleusercontent.com/d/' + id + '=w' + w; }
  function smallThumb(src, w, h) { var c = document.createElement('canvas'), r = Math.min(1, 240 / Math.max(w, h)); c.width = Math.max(1, Math.round(w * r)); c.height = Math.max(1, Math.round(h * r)); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.7); }
  function vidHolder() { if (!S.vidBox) { S.vidBox = el('div', { 'aria-hidden': 'true', style: 'position:fixed;left:0;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none' }); S.wrap.appendChild(S.vidBox); } return S.vidBox; }
  function loadPhoneFile(f) {
    var id = 'ph:' + (S.phoneN = (S.phoneN || 0) + 1), u = URL.createObjectURL(f); URLS.push(u);
    if (/^video\//.test(f.type) || /\.(mov|mp4|m4v|webm)$/i.test(f.name)) {
      return new Promise(function (res, rej) {
        var v = document.createElement('video'), done = false;
        v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', ''); v.preload = 'auto'; v.loop = false;
        var fail = function () { if (!done) { done = true; rej(new Error('video')); } };
        setTimeout(fail, 20000); v.onerror = fail;
        v.addEventListener('loadeddata', function () {
          if (done) return; v.width = v.videoWidth; v.height = v.videoHeight;
          v.addEventListener('seeked', function once() { v.removeEventListener('seeked', once); if (done) return; done = true;
            try { S.thumbs[id] = smallThumb(v, v.videoWidth, v.videoHeight); } catch (e) { S.thumbs[id] = ''; }
            v.addEventListener('seeked', function () { if (S && !S.raf && !S.busy) seek(S.t, true); });   // paused: show the new frame once it is ready
            S.bitmaps[id] = v; S.vids[id] = Math.max(0.5, v.duration || 1); res(id);
          });
          try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch (e) { fail(); }
        });
        vidHolder().appendChild(v); v.src = u;
      });
    }
    return imgFromSrc(u).then(function (im) {   // phone photos are made smaller first (a 12 MP photo would eat the phone's memory)
      var r = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * r); c.height = Math.round(im.naturalHeight * r); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      S.thumbs[id] = smallThumb(c, c.width, c.height);
      return new Promise(function (res) { c.toBlob(function (b) { c.width = c.height = 1; res(b); }, 'image/jpeg', 0.88); });
    }).then(bitmapFromBlob).then(function (im) { S.bitmaps[id] = im; return id; });
  }
  function videoBeats(id, beat) { return Math.max(2, Math.min(16, Math.round(Math.min(S.vids[id] || CLIP_MAX, CLIP_MAX) / beat))); }
  // videos follow the reel's clock: playing while the reel plays or is being made, still on the right frame when paused
  function syncVideos(P, t) {
    if (!S.vids) return; var live = !!S.raf || !!S.busy, want = {};
    P.segs.forEach(function (sg) {
      if (sg.type !== 'shot' || t < sg.start - 0.6 || t > sg.start + sg.dur + 0.1) return;
      sg.ids.forEach(function (id) { if (S.vids[id] && want[id] == null) want[id] = Math.min(S.vids[id] - 0.05, Math.max(0, (sg.vt || 0) + Math.max(0, t - sg.start))); });
    });
    Object.keys(S.vids).forEach(function (id) {
      var v = S.bitmaps[id]; if (!v) return;
      if (want[id] == null) { if (!v.paused) v.pause(); return; }
      if (live) { if (Math.abs(v.currentTime - want[id]) > 0.3) v.currentTime = want[id]; if (v.paused && want[id] < S.vids[id] - 0.1) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } }
      else { if (!v.paused) v.pause(); if (Math.abs(v.currentTime - want[id]) > 0.04 && !v.seeking) v.currentTime = want[id]; }
    });
  }
  function pauseVideos() { if (S && S.vids) Object.keys(S.vids).forEach(function (id) { var v = S.bitmaps[id]; if (v && !v.paused) v.pause(); }); }
  function freeVideos() { if (S && S.vids) Object.keys(S.vids).forEach(function (id) { var v = S.bitmaps[id]; if (v) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} } }); }

  // ---------- templates ----------
  // layouts: how photos are placed in one shot. trans: how one shot changes to the next. fx: effects on the beat.
  var SERIF = '"Cormorant Garamond", Georgia, serif', MONO = '"IBM Plex Mono", monospace', SANS = '"Plus Jakarta Sans", system-ui, sans-serif';
  var TEMPLATES = {
    south: { name: 'South · Kasavu', music: 'road-trip', beats: [4], layouts: ['single'], trans: ['slide', 'fade'], card: 'kasavu', frame: true,
      fx: { pulse: 0.012, flashEvery: 8, flash: '231,200,115', flashA: 0.18 }, paper: '#F3EAD9', ink: '#3B2A1A', gold: '#C9A24A', gold2: '#E7C873', deep: '#5B1F14' },
    soft: { name: 'Soft', music: 'road-trip', beats: [4, 6], layouts: ['single', 'single', 'duo'], trans: ['fade', 'zoomfade'], card: 'minimal',
      fx: { pulse: 0, leak: true }, paper: '#F6EFEA', ink: '#2B2522', gold: '#B89A6A', deep: '#7A5C4A' },
    dynamic: { name: 'Dynamic', music: 'cocktail-night', beats: [2, 2, 1], layouts: ['punch', 'split2', 'single', 'grid3', 'punch'], trans: ['cut', 'whip', 'zoom', 'cut'], card: 'bold',
      fx: { pulse: 0.03, shake: 10, flashEvery: 4, flash: '255,255,255', flashA: 0.35 }, paper: '#0E0E0E', ink: '#FFFFFF', gold: '#FFD23F', deep: '#FFD23F' },
    travel: { name: 'Travel', music: 'road-trip', beats: [4, 2], layouts: ['strip', 'polaroid', 'single', 'tv', 'polaroid'], trans: ['whip', 'slide', 'cut'], card: 'film',
      fx: { pulse: 0.01, leak: true }, paper: '#EFE6D6', ink: '#1E1A16', gold: '#D9822B', deep: '#1E1A16' },
    festival: { name: 'Festival', music: 'dhol-festival', beats: [2, 4, 2], layouts: ['grid4', 'polaroid', 'punch', 'grid3', 'single'], trans: ['flash', 'cut', 'zoom'], card: 'festive',
      fx: { pulse: 0.025, confetti: true, flashEvery: 8, flash: '255,170,40', flashA: 0.3 }, paper: '#FFF4E0', ink: '#3A0D2E', gold: '#FF9F1C', deep: '#C2185B' },
    party: { name: 'Party · Cocktail', music: 'cocktail-night', beats: [1, 1, 2], layouts: ['punch', 'grid4', 'split2', 'strobe', 'rgb', 'punch'], trans: ['cut', 'glitch', 'flash', 'cut'], card: 'neon',
      fx: { pulse: 0.045, shake: 14, flashEvery: 2, flash: '255,255,255', flashA: 0.22, rgb: true }, paper: '#07060B', ink: '#FFFFFF', gold: '#FF2E88', deep: '#21D4FD' }
  };
  var ORDER = ['south', 'soft', 'dynamic', 'travel', 'festival', 'party'];
  var LAYOUT_N = { single: 1, punch: 1, polaroid: 1, tv: 1, strobe: 1, rgb: 1, duo: 2, split2: 2, grid3: 3, grid4: 4, strip: 4, jharokha: 1, triptych: 3 };
  var LAYOUT_MIN = { grid4: 2, grid3: 2, strip: 4, polaroid: 2, tv: 2, duo: 2, split2: 2, jharokha: 2, triptych: 3 };
  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- timeline ----------
  function plan() {
    var T = S.T, tr = S.track, bpm = tr ? tr.bpm : 110, beat = 60 / bpm;
    var total = Math.round(S.length / beat), titleB = 4, endB = S.endCard ? 4 : 0;
    var ids = S.photos.filter(function (p) { return p.on && S.bitmaps[p.id]; }).map(function (p) { return p.id; });
    var segs = [{ type: 'title', start: 0, dur: titleB * beat }], t = titleB * beat, bodyEnd = Math.max(t + beat * 2, (total - endB) * beat);
    var r = rng(S.seed), pick = function (a) { return a[Math.floor(r() * a.length)]; }, k = 0, used = {};
    while (ids.length && t < bodyEnd - beat * 0.5) {
      var layout = pick(T.layouts), n = LAYOUT_N[layout], beats = Math.max(pick(T.beats), LAYOUT_MIN[layout] || 1);
      var first = ids[k % ids.length];
      if (isVideo(first)) { layout = 'single'; n = 1; beats = videoBeats(first, beat); }
      beats = Math.min(beats, Math.round((bodyEnd - t) / beat)); if (beats < 1) break;
      var ph = [first]; used[first] = 1; k++;
      for (var j = 1, tries = 0; j < n && tries < ids.length * 2; tries++) { var id = ids[k % ids.length]; k++; if (isVideo(id)) continue; ph.push(id); used[id] = 1; j++; }
      if (ph.length < n) { layout = 'single'; ph = [first]; }
      segs.push({ type: 'shot', layout: layout, ids: ph, start: t, dur: beats * beat, trans: segs.length === 1 ? 'fade' : pick(T.trans), k: segs.length, r: r() });
      t += beats * beat;
    }
    if (endB) { segs.push({ type: 'end', start: t, dur: endB * beat }); t += endB * beat; }
    return { segs: segs, dur: t, beat: beat, used: Object.keys(used).length, shots: segs.length - 1 - (endB ? 1 : 0) };
  }

  // ---------- drawing helpers ----------
  function blurOf(img) {   // small, softly blurred copy of the photo (box blur ×3) — smooth when stretched
    var cw = 72, ch = 128, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    var x = c.getContext('2d'), r = Math.max(cw / img.width, ch / img.height);
    x.drawImage(img, (cw - img.width * r) / 2, (ch - img.height * r) / 2, img.width * r, img.height * r);
    try {
      var d = x.getImageData(0, 0, cw, ch), a = d.data, tmp = new Uint8ClampedArray(a.length), R = 4;
      for (var pass = 0; pass < 3; pass++) {
        for (var y = 0; y < ch; y++) for (var xx = 0; xx < cw; xx++) { var s0 = 0, s1 = 0, s2 = 0, n = 0;
          for (var k = -R; k <= R; k++) { var q = Math.min(cw - 1, Math.max(0, xx + k)); var o = (y * cw + q) * 4; s0 += a[o]; s1 += a[o + 1]; s2 += a[o + 2]; n++; }
          var w = (y * cw + xx) * 4; tmp[w] = s0 / n; tmp[w + 1] = s1 / n; tmp[w + 2] = s2 / n; tmp[w + 3] = 255; }
        for (var y2 = 0; y2 < ch; y2++) for (var x2 = 0; x2 < cw; x2++) { var t0 = 0, t1 = 0, t2 = 0, m = 0;
          for (var k2 = -R; k2 <= R; k2++) { var q2 = Math.min(ch - 1, Math.max(0, y2 + k2)); var o2 = (q2 * cw + x2) * 4; t0 += tmp[o2]; t1 += tmp[o2 + 1]; t2 += tmp[o2 + 2]; m++; }
          var w2 = (y2 * cw + x2) * 4; a[w2] = t0 / m; a[w2 + 1] = t1 / m; a[w2 + 2] = t2 / m; a[w2 + 3] = 255; }
      }
      x.putImageData(d, 0, 0);
    } catch (e) {}
    return c;
  }
  function blurBg(ctx, id, shade) {
    var img = S.bitmaps[id]; if (!img) return;
    if (!S.blurs[id]) S.blurs[id] = blurOf(img);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(S.blurs[id], -40, -40, W + 80, H + 80);
    ctx.fillStyle = 'rgba(10,8,6,' + (shade == null ? 0.5 : shade) + ')'; ctx.fillRect(0, 0, W, H);
  }
  // where each photo lands on the screen, so a tap on the preview can find it (step 24)
  function hitRec(ctx, id, x, y, w, h) {
    if (!S.hits) return; var m = ctx.getTransform(), xs = [], ys = [];
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(function (q) { xs.push(m.a * q[0] + m.c * q[1] + m.e); ys.push(m.b * q[0] + m.d * q[1] + m.f); });
    S.hits.push({ id: id, x0: Math.max(0, Math.min.apply(0, xs)), y0: Math.max(0, Math.min.apply(0, ys)), x1: Math.min(W, Math.max.apply(0, xs)), y1: Math.min(H, Math.max.apply(0, ys)) });
  }
  function contain(ctx, id, bx, by, bw, bh, zoom, panX) {   // whole photo, never cut
    var img = S.bitmaps[id]; if (!img) return;
    var r = Math.min(bw / img.width, bh / img.height) * (zoom || 1), w = img.width * r, h = img.height * r;
    ctx.drawImage(img, bx + (bw - w) / 2 + (panX || 0), by + (bh - h) / 2, w, h); hitRec(ctx, id, bx + (bw - w) / 2 + (panX || 0), by + (bh - h) / 2, w, h);
  }
  function cover(ctx, id, bx, by, bw, bh, zoom) {            // fills a tile (collage layouts)
    var img = S.bitmaps[id]; if (!img) return;
    var r = Math.max(bw / img.width, bh / img.height) * (zoom || 1), w = img.width * r, h = img.height * r;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    ctx.drawImage(img, bx + (bw - w) / 2, by + (bh - h) * 0.4, w, h); hitRec(ctx, id, bx, by, bw, bh); ctx.restore();
  }
  function pop(u) { if (u <= 0) return 0; if (u >= 1) return 1; var c = 1.70158 * 1.4; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); } // overshoot
  function scaled(ctx, cx, cy, s, fn) { ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore(); }

  // ---------- one shot ----------
  function drawShot(ctx, sg, t, beat) {
    var T = S.T, u = Math.max(0, Math.min(1, (t - sg.start) / sg.dur)), lt = t - sg.start, ids = sg.ids, id = ids[0];
    switch (sg.layout) {
      case 'single':
        blurBg(ctx, id, 0.5); contain(ctx, id, 70, 90, W - 140, H - 300, 1 + 0.06 * u, (sg.k % 2 ? -1 : 1) * 24 * (u - 0.5)); break;
      case 'punch': {
        blurBg(ctx, id, 0.45); var s = 1 + 0.22 * Math.exp(-lt / (beat * 0.18));
        contain(ctx, id, 40, 60, W - 80, H - 240, s); break; }
      case 'duo': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var a2 = Math.min(1, lt / (beat * 0.6)), b2 = Math.max(0, Math.min(1, (lt - sg.dur * 0.45) / (beat * 0.6)));
        ctx.globalAlpha = a2; cover(ctx, ids[0], 60, 90, W - 120, (H - 270) / 2, 1 + 0.04 * u);
        ctx.globalAlpha = b2; cover(ctx, ids[1], 60, 90 + (H - 270) / 2 + 30, W - 120, (H - 270) / 2, 1.04 - 0.04 * u); ctx.globalAlpha = 1; break; }
      case 'split2': {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
        var e1 = 1 - pop(Math.min(1, lt / (beat * 0.5))), e2 = 1 - pop(Math.max(0, Math.min(1, (lt - beat * 0.5) / (beat * 0.5))));
        cover(ctx, ids[0], -W * e1, 0, W, H / 2 - 6, 1.05); cover(ctx, ids[1], W * e2, H / 2 + 6, W, H / 2 - 6, 1.05); break; }
      case 'grid3': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var g = 18, boxes = [[g, g, W - 2 * g, H * 0.52], [g, H * 0.52 + 2 * g, (W - 3 * g) / 2, H * 0.48 - 3 * g], [W / 2 + g / 2, H * 0.52 + 2 * g, (W - 3 * g) / 2, H * 0.48 - 3 * g]];
        boxes.forEach(function (b, i) { var p = pop(Math.max(0, Math.min(1, (lt - i * sg.dur / 3.2) / (beat * 0.45)))); if (p <= 0) return;
          scaled(ctx, b[0] + b[2] / 2, b[1] + b[3] / 2, 0.6 + 0.4 * p, function () { cover(ctx, ids[i], b[0], b[1], b[2], b[3], 1.03); }); });
        break; }
      case 'grid4': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var g4 = 16, cw = (W - 3 * g4) / 2, chh = (H - 3 * g4) / 2;
        [[g4, g4], [2 * g4 + cw, g4], [g4, 2 * g4 + chh], [2 * g4 + cw, 2 * g4 + chh]].forEach(function (b, i) {
          var p = pop(Math.max(0, Math.min(1, (lt - i * sg.dur / 4.5) / (beat * 0.35)))); if (p <= 0) return;
          scaled(ctx, b[0] + cw / 2, b[1] + chh / 2, 0.5 + 0.5 * p, function () { cover(ctx, ids[i], b[0], b[1], cw, chh, 1.04); });
        });
        break; }
      case 'polaroid': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var rot = (sg.r - 0.5) * 0.18, drop = 1 - pop(Math.min(1, lt / (beat * 0.7)));
        var img = S.bitmaps[id]; if (!img) break;
        var pw = W * 0.78, ph = Math.min(H * 0.62, pw * img.height / img.width), fw = pw + 50, fh = ph + 170;
        ctx.save(); ctx.translate(W / 2, H * 0.46 - drop * H * 0.6); ctx.rotate(rot + drop * 0.3);
        ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 40; ctx.fillStyle = '#fff'; ctx.fillRect(-fw / 2, -fh / 2, fw, fh); ctx.shadowBlur = 0;
        cover(ctx, id, -pw / 2, -fh / 2 + 25, pw, ph, 1 + 0.03 * u);
        ctx.fillStyle = '#3a332c'; ctx.font = 'italic 500 46px ' + SERIF; ctx.textAlign = 'center'; ctx.fillText(S.names, 0, fh / 2 - 60);
        ctx.restore(); break; }
      case 'strip': {
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
        var fh2 = 560, gap = 40, y0 = H / 2 - fh2 / 2 - 60, pos = (lt / sg.dur) * (fh2 * 0.8 + gap) * ids.length * 0.55;
        ctx.fillStyle = '#000'; ctx.fillRect(0, y0 - 70, W, fh2 + 140);
        for (var hx = -((pos * 1.1) % 80); hx < W; hx += 80) { ctx.fillStyle = '#EDE3CF'; ctx.fillRect(hx + 20, y0 - 52, 36, 26); ctx.fillRect(hx + 20, y0 + fh2 + 26, 36, 26); }
        ids.forEach(function (pid, i) { var x = 60 + i * (fh2 * 0.8 + gap) - pos; if (x > W || x < -fh2) return; cover(ctx, pid, x, y0, fh2 * 0.8, fh2, 1.02); });
        ctx.fillStyle = '#EDE3CF'; ctx.font = '500 34px ' + MONO; ctx.textAlign = 'center'; ctx.fillText(S.names.toUpperCase() + (S.date ? '  ·  ' + S.date : ''), W / 2, y0 + fh2 + 170);
        break; }
      case 'tv': {
        ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
        var roll = Math.max(0, 1 - lt / (beat * 0.6)), jit = Math.sin(t * 90) * 3;
        ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(50, 260, W - 100, H - 620, 60) : ctx.rect(50, 260, W - 100, H - 620); ctx.clip();
        blurBg(ctx, id, 0.55); contain(ctx, id, 50 + jit, 260 - roll * (H - 620), W - 100, H - 620, 1.02);
        if (roll > 0) contain(ctx, id, 50, 260 + (1 - roll) * (H - 620), W - 100, H - 620, 1.02);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (var yy = 260; yy < H - 360; yy += 6) ctx.fillRect(50, yy, W - 100, 2);
        ctx.restore();
        ctx.fillStyle = '#ff3b30'; ctx.beginPath(); ctx.arc(120, 330, 12, 0, Math.PI * 2); if (Math.floor(t * 2) % 2) ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '600 34px ' + MONO; ctx.textAlign = 'left'; ctx.fillText('PLAY ▶', 145, 342);
        ctx.textAlign = 'right'; ctx.fillText(S.date || '', W - 110, H - 400); break; }
      case 'strobe': {
        var half = beat / 2, on = (lt % half) < half * 0.7;
        if (on) { blurBg(ctx, id, 0.35); contain(ctx, id, 30, 50, W - 60, H - 220, 1.04); } else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
        break; }
      // the next two layouts were designed by Gemini (palace arch window, three cinema panels)
      case 'jharokha': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var jx = 110, jy = 210, jw = W - 220, jh = H - 560;
        var arch = function (pad) { var ax = jx - pad, ay = jy - pad, aw = jw + pad * 2, ah = jh + pad * 2, ar = aw / 2;
          ctx.beginPath(); ctx.moveTo(ax, ay + ah); ctx.lineTo(ax, ay + ar); ctx.quadraticCurveTo(ax, ay + ar * 0.25, ax + ar, ay); ctx.quadraticCurveTo(ax + aw, ay + ar * 0.25, ax + aw, ay + ar); ctx.lineTo(ax + aw, ay + ah); ctx.closePath(); };
        ctx.save(); arch(0); ctx.clip(); cover(ctx, id, jx, jy, jw, jh, 1 + 0.05 * u); ctx.restore();
        ctx.strokeStyle = T.gold; ctx.lineWidth = 4; arch(16); ctx.stroke(); ctx.lineWidth = 1.5; arch(28); ctx.stroke(); break; }
      case 'triptych': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var tp = 64, tg = 24, tw = W - tp * 2, th = Math.floor((H - 340 - tg * 2) / 3);
        for (var ti = 0; ti < 3; ti++) {
          var lp = Math.max(0, Math.min(1, (u - ti * 0.12) / 0.45)), te = 1 - Math.pow(1 - lp, 3), tox = (1 - te) * 140 * (ti % 2 ? -1 : 1), tby = 150 + ti * (th + tg);
          ctx.globalAlpha = te; cover(ctx, ids[ti % ids.length], tp + tox, tby, tw, th, 1.03); ctx.strokeStyle = T.gold; ctx.lineWidth = 2; ctx.strokeRect(tp + tox, tby, tw, th); ctx.globalAlpha = 1;
        }
        break; }
      case 'rgb': {
        blurBg(ctx, id, 0.5); var off = 18 * Math.exp(-(lt % beat) / (beat * 0.2));
        ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'screen';
        contain(ctx, id, 40 - off, 60, W - 80, H - 240, 1.02); contain(ctx, id, 40 + off, 60, W - 80, H - 240, 1.02);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; contain(ctx, id, 40, 60, W - 80, H - 240, 1.02);
        if (off > 6) { for (var sl = 0; sl < 5; sl++) { var sy = ((sg.r * 997 + sl * 331) % 1) * H, sh = 30 + sl * 12; try { ctx.drawImage(S.canvas, 0, sy, W, sh, (sl % 2 ? 1 : -1) * off * 2, sy, W, sh); } catch (e) {} } }
        break; }
    }
    if (T.frame && sg.layout === 'single') frameBorder(ctx, T, 0.55);
  }

  // ---------- title / end cards (one look per template) ----------
  function frameBorder(ctx, T, alpha) {
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.strokeStyle = T.gold; ctx.lineWidth = 6; ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.lineWidth = 2; ctx.strokeRect(52, 52, W - 104, H - 104);
    ctx.fillStyle = T.gold; ctx.fillRect(36, H - 150, W - 72, 26); ctx.fillStyle = T.gold2 || T.gold; ctx.fillRect(36, H - 118, W - 72, 8);
    ctx.restore();
  }
  function kolam(ctx, cx, cy, r, col) {
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3;
    for (var i = -2; i <= 2; i++) for (var j = -2; j <= 2; j++) { if (Math.abs(i) + Math.abs(j) > 2) continue; ctx.beginPath(); ctx.arc(cx + i * r, cy + j * r, 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); for (var a = 0; a < 4; a++) { var ang = a * Math.PI / 2; ctx.moveTo(cx + Math.cos(ang) * r * 2.6, cy + Math.sin(ang) * r * 2.6); ctx.arc(cx, cy, r * 2.6, ang, ang + Math.PI / 2 * 0.8); }
    ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function wrapText(ctx, text, x, y, maxW, lh) {
    var words = String(text || '').split(' '), line = '', lines = [];
    words.forEach(function (w) { var tt = line ? line + ' ' + w : w; if (ctx.measureText(tt).width > maxW && line) { lines.push(line); line = w; } else line = tt; });
    if (line) lines.push(line);
    lines.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); });
    return lines.length;
  }
  function drawCard(ctx, sg, t, beat, isEnd) { try { drawCard0(ctx, sg, t, beat, isEnd); } finally { delete ctx.fillText; } }
  // the card's names and date / "Photos by" line: drawn where they were dragged, remembered so a tap can find them
  function keyText(ctx, pre, sub) {
    var orig = CanvasRenderingContext2D.prototype.fillText;
    ctx.fillText = function (str, x, y) {
      var key = sub && str === sub ? 'sub' : /made with PicGrades|^PicGrades$/.test(str) ? null : 'names';
      if (!key) return orig.call(ctx, str, x, y);
      var o = (S.tx || {})[pre + key] || {}, X = x + (o.dx || 0), Y = y + (o.dy || 0);
      orig.call(ctx, str, X, Y);
      if (S.textHits) {
        var w = ctx.measureText(str).width, a = ctx.textAlign, fs = +((/(\d+)px/.exec(ctx.font) || [0, 40])[1]), x0 = a === 'center' ? X - w / 2 : a === 'right' || a === 'end' ? X - w : X;
        var m = ctx.getTransform(), pts = [[x0 - 12, Y - fs * 0.9], [x0 + w + 12, Y - fs * 0.9], [x0 - 12, Y + fs * 0.3], [x0 + w + 12, Y + fs * 0.3]], xs = [], ys = [];
        pts.forEach(function (q) { xs.push(m.a * q[0] + m.c * q[1] + m.e); ys.push(m.b * q[0] + m.d * q[1] + m.f); });
        S.textHits.push({ key: pre + key, x0: Math.min.apply(0, xs), y0: Math.min.apply(0, ys), x1: Math.max.apply(0, xs), y1: Math.max.apply(0, ys) });
      }
    };
  }
  function drawCard0(ctx, sg, t, beat, isEnd) {
    var T = S.T, a = ease((t - sg.start) / (beat * (isEnd ? 1 : 1.5))), lt = t - sg.start;
    var pre = isEnd ? 'end.' : 'title.', subO = (S.tx || {})[pre + 'sub'] || {};
    var sub = subO.text != null ? subO.text : isEnd ? (S.studio ? 'Photos by ' + S.studio : '') : S.date;
    keyText(ctx, pre, sub);
    ctx.save(); ctx.textAlign = 'center';
    switch (T.card) {
      case 'kasavu':
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H); frameBorder(ctx, T, 1); kolam(ctx, W / 2, H * 0.3, 34, T.gold);
        ctx.globalAlpha = a; ctx.fillStyle = T.ink; ctx.font = '500 ' + (isEnd ? 92 : 118) + 'px ' + SERIF;
        var n1 = wrapText(ctx, S.names, W / 2, H * 0.47, W - 220, 124);
        ctx.fillStyle = T.deep; ctx.font = '500 ' + (isEnd ? 34 : 38) + 'px ' + MONO; ctx.fillText(sub, W / 2, H * 0.47 + n1 * 124 + 50);
        if (isEnd) { ctx.fillStyle = T.ink; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.47 + n1 * 124 + 110); }
        break;
      case 'minimal':
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = a; ctx.strokeStyle = T.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(W / 2 - 160 * a, H * 0.4); ctx.lineTo(W / 2 + 160 * a, H * 0.4); ctx.stroke();
        ctx.fillStyle = T.ink; ctx.font = 'italic 400 110px ' + SERIF; var n2 = wrapText(ctx, S.names, W / 2, H * 0.5, W - 200, 116);
        ctx.fillStyle = T.deep; ctx.font = '500 32px ' + MONO; ctx.fillText(sub, W / 2, H * 0.5 + n2 * 116 + 30);
        if (isEnd) ctx.fillText('made with PicGrades', W / 2, H * 0.5 + n2 * 116 + 80);
        break;
      case 'bold': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var slide = (1 - ease(lt / (beat * 0.6))) * W;
        ctx.fillStyle = T.gold; ctx.fillRect(-slide, H * 0.43, W * 0.7, 18);
        ctx.fillStyle = '#fff'; ctx.font = '800 130px ' + SANS; ctx.textAlign = 'left';
        var parts = String(S.names).toUpperCase().split(/\s*&\s*/);
        parts.forEach(function (p, i) { ctx.fillText((i ? '& ' : '') + p, 80 + (i % 2 ? -slide : slide) * 0.5, H * 0.5 + i * 140); });
        ctx.fillStyle = T.gold; ctx.font = '600 36px ' + MONO; ctx.fillText(sub, 84, H * 0.5 + parts.length * 140 + 20);
        if (isEnd) { ctx.fillStyle = '#bbb'; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', 84, H * 0.5 + parts.length * 140 + 76); }
        break; }
      case 'film': {
        ctx.fillStyle = '#141210'; ctx.fillRect(0, 0, W, H);
        for (var y = 30; y < H; y += 90) { ctx.fillStyle = '#EDE3CF'; ctx.fillRect(26, y, 34, 50); ctx.fillRect(W - 60, y, 34, 50); }
        var txt = S.names.toUpperCase(), shown = Math.floor(txt.length * Math.min(1, lt / (beat * 2)));
        ctx.fillStyle = '#EDE3CF'; ctx.font = '600 72px ' + MONO; var n3 = wrapText(ctx, txt.slice(0, shown) + (shown < txt.length && Math.floor(t * 4) % 2 ? '▍' : ''), W / 2, H * 0.46, W - 200, 90);
        ctx.globalAlpha = a; ctx.fillStyle = T.gold; ctx.font = '500 34px ' + MONO; ctx.fillText(sub, W / 2, H * 0.46 + n3 * 90 + 40);
        if (isEnd) { ctx.fillStyle = '#aaa'; ctx.font = '500 26px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.46 + n3 * 90 + 96); }
        break; }
      case 'festive': {
        var gr = ctx.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#FF9F1C'); gr.addColorStop(0.55, '#E4572E'); gr.addColorStop(1, '#C2185B');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2, H * 0.3); ctx.rotate(lt * 0.4);
        for (var i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? '#FFE66D' : '#fff'; ctx.beginPath(); ctx.arc(110, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(170, 0, 7, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.font = '600 120px ' + SERIF; var n4 = wrapText(ctx, S.names, W / 2, H * 0.5, W - 180, 126);
        ctx.fillStyle = '#FFE66D'; ctx.font = '600 38px ' + MONO; ctx.fillText(sub, W / 2, H * 0.5 + n4 * 126 + 40);
        if (isEnd) { ctx.fillStyle = '#fff'; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.5 + n4 * 126 + 96); }
        break; }
      case 'neon': {
        ctx.fillStyle = T.paper; ctx.fillRect(0, 0, W, H);
        var flick = (Math.sin(t * 37) > -0.85) ? 1 : 0.35;
        ctx.globalAlpha = a * flick; ctx.shadowBlur = 40; ctx.shadowColor = T.gold; ctx.fillStyle = '#FFE0F0'; ctx.font = '800 120px ' + SANS;
        var n5 = wrapText(ctx, String(S.names).toUpperCase(), W / 2, H * 0.48, W - 160, 130);
        ctx.shadowColor = T.deep; ctx.fillStyle = '#D9FAFF'; ctx.font = '600 40px ' + MONO; ctx.fillText(sub, W / 2, H * 0.48 + n5 * 130 + 40);
        if (isEnd) { ctx.shadowBlur = 0; ctx.fillStyle = '#aaa'; ctx.font = '500 28px ' + MONO; ctx.fillText('made with PicGrades', W / 2, H * 0.48 + n5 * 130 + 100); }
        break; }
    }
    ctx.restore();
  }
  function lightCard() { return ['kasavu', 'minimal'].indexOf(S.T.card) > -1; }
  function watermark(ctx, onPaper) {
    ctx.save(); ctx.font = '500 26px ' + MONO; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    if (onPaper) ctx.fillStyle = 'rgba(59,42,26,0.35)'; else { ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6; }
    ctx.fillText('PicGrades', W - 70, H - 170); ctx.restore();
  }

  // ---------- one frame ----------
  // the style's effects, minus the ones removed in the Effects layer
  var FX_LIST = [['confetti', 'Confetti falling'], ['leak', 'Light glow'], ['flash', 'Flashes on the beat'], ['shake', 'Shake on the beat'], ['pulse', 'Zoom on the beat']];
  function fxHas(k, f) { f = f || S.T.fx; return k === 'flash' ? !!f.flashEvery : !!f[k]; }
  function fxOf() {
    var f = S.T.fx, o = S.view === 'edit' || S.view === 'export' ? (S.fxOff || {}) : {};
    return { pulse: o.pulse ? 0 : f.pulse, shake: o.shake ? 0 : f.shake, flashEvery: o.flash ? 0 : f.flashEvery, flash: f.flash, flashA: f.flashA, leak: !o.leak && f.leak, confetti: !o.confetti && f.confetti, rgb: f.rgb };
  }
  function one(ctx, sg, t, beat) { if (sg.type === 'shot') drawShot(ctx, sg, t, beat); else drawCard(ctx, sg, t, beat, sg.type === 'end'); }
  function draw(ctx, P, t) {
    var T = S.T, fx = fxOf(), segs = P.segs, beat = P.beat;
    syncVideos(P, t); S.hits = []; S.textHits = [];
    ctx.save();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (S.fcss && S.fcss !== 'none') ctx.filter = S.fcss;   // the chosen filter + adjustments
    var i = 0; while (i < segs.length - 1 && t >= segs[i + 1].start) i++;
    var seg = segs[i], prev = segs[i - 1], into = t - seg.start, bp = (t % beat) / beat, bn = Math.floor(t / beat);
    // beat pulse + shake on the bar
    var pulse = 1 + (fx.pulse || 0) * Math.exp(-bp * 6);
    var sh = fx.shake && seg.type === 'shot' && bn % 4 === 0 ? fx.shake * Math.exp(-bp * 8) : 0;
    ctx.translate(W / 2 + (sh ? Math.sin(t * 80) * sh : 0), H / 2 + (sh ? Math.cos(t * 70) * sh : 0)); ctx.scale(pulse, pulse); ctx.translate(-W / 2, -H / 2);
    var tr = seg.trans || 'fade', dur = tr === 'cut' ? 0 : tr === 'glitch' || tr === 'flash' ? beat * 0.25 : Math.min(0.45, beat * 0.6);
    if (prev && into < dur) {
      var p = ease(into / dur);
      if (tr === 'slide') { ctx.save(); ctx.translate(0, -H * p); one(ctx, prev, t, beat); ctx.restore(); ctx.save(); ctx.translate(0, H * (1 - p)); one(ctx, seg, t, beat); ctx.restore(); }
      else if (tr === 'whip') { ctx.save(); ctx.translate(-W * p, 0); one(ctx, prev, t, beat); ctx.restore(); ctx.save(); ctx.translate(W * (1 - p), 0); one(ctx, seg, t, beat); ctx.restore();
        ctx.globalAlpha = 0.25 * Math.sin(p * Math.PI); try { ctx.drawImage(S.canvas, 40, 0); ctx.drawImage(S.canvas, -40, 0); } catch (e) {} ctx.globalAlpha = 1; }
      else if (tr === 'zoom' || tr === 'zoomfade') { scaled(ctx, W / 2, H / 2, 1 + p * 0.5, function () { ctx.globalAlpha = 1 - p; one(ctx, prev, t, beat); }); ctx.globalAlpha = p;
        scaled(ctx, W / 2, H / 2, 0.85 + 0.15 * p, function () { one(ctx, seg, t, beat); }); ctx.globalAlpha = 1; }
      else if (tr === 'iris') {   // Gemini's circle reveal: the next shot opens from the middle
        one(ctx, prev, t, beat); ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.max(1, 1150 * p), 0, Math.PI * 2); ctx.clip(); one(ctx, seg, t, beat); ctx.restore(); }
      else if (tr === 'flash') { one(ctx, seg, t, beat); ctx.fillStyle = 'rgba(255,255,255,' + (1 - p) + ')'; ctx.fillRect(0, 0, W, H); }
      else if (tr === 'glitch') { one(ctx, seg, t, beat); for (var g = 0; g < 7; g++) { var gy = ((g * 0.137 + seg.r) % 1) * H, gh = 40 + g * 15, gx = (g % 2 ? 1 : -1) * 60 * (1 - p); try { ctx.drawImage(S.canvas, 0, gy, W, gh, gx, gy, W, gh); } catch (e) {} } }
      else { one(ctx, prev, t, beat); ctx.globalAlpha = p; one(ctx, seg, t, beat); ctx.globalAlpha = 1; }
    } else one(ctx, seg, t, beat);
    ctx.restore();
    // effects over the frame
    if (fx.flashEvery && seg.type === 'shot' && bn > 0 && bn % fx.flashEvery === 0 && bp < 0.5) { ctx.fillStyle = 'rgba(' + fx.flash + ',' + (fx.flashA * (1 - bp * 2)) + ')'; ctx.fillRect(0, 0, W, H); }
    if (fx.leak && seg.type === 'shot') {
      var lx = W * (0.5 + 0.5 * Math.sin(t * 0.35)), lg = ctx.createRadialGradient(lx, H * 0.15, 10, lx, H * 0.15, W * 0.9);
      lg.addColorStop(0, 'rgba(255,190,120,0.28)'); lg.addColorStop(1, 'rgba(255,190,120,0)'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
    }
    if (fx.confetti && seg.type === 'shot') {
      var cols = ['#FFE66D', '#FF9F1C', '#FF4F79', '#7AE7C7', '#ffffff'];
      for (var c = 0; c < 46; c++) { var sx = ((c * 0.6180339) % 1) * W, sp = 180 + (c % 7) * 40, sy = ((t * sp + c * 211) % (H + 80)) - 40, rot = t * (2 + c % 5) + c;
        ctx.save(); ctx.translate(sx + Math.sin(t * 2 + c) * 30, sy); ctx.rotate(rot); ctx.fillStyle = cols[c % cols.length]; ctx.fillRect(-9, -4, 18, 8); ctx.restore(); }
    }
    ctx.filter = 'none';
    drawOverlays(ctx, t);
    var showing = (prev && into < dur && into / dur < 0.5) ? prev : seg;
    watermark(ctx, showing.type !== 'shot' && lightCard());
  }

  // ---------- audio ----------
  function audioCtx() { if (!S.ac) S.ac = new (window.AudioContext || window.webkitAudioContext)(); return S.ac; }
  function loadTrack(tr) {
    if (!tr) return Promise.resolve(null);
    if (S.buffers[tr.id]) return Promise.resolve(S.buffers[tr.id]);
    return fetch(tr.file).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
      return new Promise(function (res, rej) { audioCtx().decodeAudioData(ab, res, rej); });
    }).then(function (buf) { S.buffers[tr.id] = buf; return buf; });
  }
  function startAudio(buf, dest, dur, at) {   // at = where in the reel to start (seconds)
    var ac = audioCtx(); if (!buf) return null; at = at || 0;
    var src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.connect(g); g.connect(dest);
    var t0 = ac.currentTime + 0.05, left = Math.max(0.1, dur - at);
    g.gain.setValueAtTime(1, t0); g.gain.setValueAtTime(1, t0 + Math.max(0, left - 1.5)); g.gain.linearRampToValueAtTime(0.0001, t0 + left);
    var from = (S.track && S.track.beat0) || 0;   // your own song: start on its first beat
    if (buf.duration - from < dur) from = 0;
    src.start(t0, Math.min(buf.duration - 0.05, from + at), left + 0.1);
    return { src: src, t0: t0 - at };
  }
  function clock(aud) { var ac = S.ac; var base = aud ? aud.t0 : null; var p0 = performance.now(); return function () { return aud && ac ? ac.currentTime - base : (performance.now() - p0) / 1000; }; }

  // ---------- preview ----------
  function stopPreview() { if (!S) return; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; if (S.aud) { try { S.aud.src.stop(); } catch (e) {} S.aud = null; } if (S.playBtn) S.playBtn.innerHTML = '&#9654;'; pauseVideos(); }


  // ---------- export ----------
  function pickType() {
    var list = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (var i = 0; i < list.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(list[i])) return list[i];
    return '';
  }
  function exportReel() {
    stopPreview();
    var msg = function (t) { S.expMsg.textContent = t || ''; };
    var P = curPlan(); if (!P.used) { msg('Choose at least one photo.'); return; }
    if (!window.MediaRecorder || !S.canvas.captureStream) { msg('This phone cannot make videos in the browser. Please update the phone or try Chrome.'); S.done.style.display = 'block'; return; }
    var type = pickType(), ac = audioCtx(); if (ac.state === 'suspended') ac.resume();
    S.goBtn.disabled = true; S.busy = true; msg('Making your reel… keep this screen open.'); S.bar.style.width = '0%'; S.barWrap.style.display = 'block';
    S.status.classList.add('on');
    loadTrack(S.track).then(function (buf) {
      var vstream = S.canvas.captureStream(FPS), tracks = vstream.getVideoTracks();
      var dest = null; if (buf) { dest = ac.createMediaStreamDestination(); dest.stream.getAudioTracks().forEach(function (t) { tracks.push(t); }); }
      var stream = new MediaStream(tracks), chunks = [];
      var rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 8000000 } : undefined);
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      var ctx = S.canvas.getContext('2d'); draw(ctx, P, 0);
      rec.onstop = function () {
        S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none'; S.status.classList.remove('on');
        var mt = (rec.mimeType || type || 'video/webm').split(';')[0], blob = new Blob(chunks, { type: mt });
        var ext = mt.indexOf('mp4') > -1 ? 'mp4' : 'webm';
        S.result = new File([blob], slug(S.names) + '_reel.' + ext, { type: mt });
        showResult();
      };
      rec.start(500);
      var lock = null; try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }, function () {}); } catch (e) {}
      var left = false, onHide = function () { if (document.hidden && !left) { left = true; rec.onstop = function () { stopped('The reel stopped because the phone left this screen. Keep the screen open and try again.'); }; try { rec.stop(); } catch (e) {} } };
      document.addEventListener('visibilitychange', onHide);
      var release = function () { document.removeEventListener('visibilitychange', onHide); try { if (lock) lock.release(); } catch (e) {} };
      var stopped = function (t) { release(); cancelAnimationFrame(S.raf); if (aud && aud.src) try { aud.src.stop(); } catch (e) {} chunks = []; S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none'; S.status.classList.remove('on'); msg(t); S.done.style.display = 'block'; };
      var _onstop = rec.onstop; rec.onstop = function () { release(); _onstop(); };
      var aud = buf ? startAudio(buf, dest, P.dur) : null, now = clock(aud);
      (function loop() {
        var t = now();
        if (left || !S) return;
        if (t >= P.dur) { draw(ctx, P, P.dur - 0.001); setTimeout(function () { rec.stop(); }, 120); return; }
        draw(ctx, P, Math.max(0, t)); var pc = Math.min(100, t / P.dur * 100); S.bar.style.width = pc.toFixed(1) + '%';
        S.status.firstChild.textContent = Math.floor(pc) + '%'; S.status.children[1].textContent = 'Making your reel · ' + Math.floor(t) + ' / ' + Math.round(P.dur) + ' s';
        msg('Making your reel… ' + Math.floor(t) + ' / ' + Math.round(P.dur) + ' s · keep this screen open');
        S.raf = requestAnimationFrame(loop);
      })();
    }).catch(function (e) { S.busy = false; S.goBtn.disabled = false; S.barWrap.style.display = 'none'; S.status.classList.remove('on'); S.done.style.display = 'block'; msg('Could not make the reel: ' + (e && e.message || e)); });
  }
  function showResult() {
    var url = URL.createObjectURL(S.result); URLS.push(url);   // freed when the maker closes
    S.video = el('video', { src: url, controls: '', playsinline: '', loop: '' });
    S.canvas.style.display = 'none'; S.expStage.appendChild(S.video);
    S.done.style.display = 'block';
    S.expMsg.textContent = ('Your reel is ready (' + Math.round(S.result.size / 1048576 * 10) / 10 + ' MB).' + (S.result.type.indexOf('mp4') < 0 ? ' This phone made a .webm video — Instagram may need it converted.' : ''));
  }
  function shareResult() {
    var f = S.result; if (!f) return;
    if (navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: S.names }).catch(function () {}); return; }
    downloadResult();
  }
  var IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  function downloadResult() {
    var f = S.result; if (!f) return;
    // iPhone: only the share menu can put a video in Photos ("Save Video"); a normal download goes to the Files app
    if (IOS && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(function () {}); return; }
    var u = URL.createObjectURL(f), a = el('a', { href: u, download: f.name }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 10000);
  }

  function msg(t) { if (S && S.msg) { S.msg.textContent = t || ''; S.msg.classList.toggle('on', !!t); } }

  // =====================================================================================
  // Reel Edits — the screens work like the phone video editors people already know:
  //   1. Styles feed (swipe through styles, "Use template")  2. Choose photos (numbered)
  //   3. Editor: preview, play bar, timeline (text, drawings, music, clips), tools row   4. Export + share
  // =====================================================================================
  var PX = 48;   // timeline: pixels for one second
  var FILTERS = [['none', 'Original', ''], ['warm', 'Warm', 'sepia(.22) saturate(1.15) brightness(1.03)'], ['golden', 'Golden', 'sepia(.35) saturate(1.3) hue-rotate(-8deg)'],
    ['film', 'Film', 'contrast(1.08) saturate(.85) sepia(.15)'], ['vivid', 'Vivid', 'saturate(1.4) contrast(1.08)'], ['cool', 'Cool', 'hue-rotate(-12deg) saturate(.9) brightness(1.02)'],
    ['fade', 'Fade', 'contrast(.85) brightness(1.08) saturate(.8)'], ['bw', 'B&W', 'grayscale(1) contrast(1.12)'], ['noir', 'Noir', 'grayscale(1) contrast(1.35) brightness(.92)']];
  var TEXT_STYLES = [['classic', 'Classic'], ['box', 'Box'], ['script', 'Script'], ['type', 'Typewriter'], ['neon', 'Glow']];
  var COLOURS = ['#FFFFFF', '#1E1916', '#FAC646', '#E7C873', '#F2A7B8', '#D33A2C', '#7AE7C7'];
  var LOGO = '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="2.5" y="2.5" width="27" height="27" rx="8" fill="none" stroke="currentColor" stroke-width="1.8"/><text x="16" y="18" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="13" fill="currentColor">PG</text><path d="M7.5 23.5h6M18.5 23.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M14.5 21.2l3 4.6M17.5 21.2l-3 4.6" stroke="#FAC646" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var ICON = {
    audio: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    text: '<path d="M4 7V4h16v3M9 20h6M12 4v16"/>',
    sticker: '<path d="M14 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h8l7-7V6a3 3 0 0 0-3-3h-4z"/><path d="M14 21v-4a3 3 0 0 1 3-3h4"/><path d="M8.5 10h.01M14.5 10h.01M9 14c1.5 1 4.5 1 6 0"/>',
    filters: '<circle cx="9" cy="9" r="6"/><circle cx="15" cy="9" r="6"/><circle cx="12" cy="15" r="6"/>',
    adjust: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
    style: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><path d="M17 13v8M13 17h8"/>',
    title: '<path d="M4 6h16M4 12h10M4 18h7"/>',
    length: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
    add: '<path d="M12 5v14M5 12h14"/>',
    replace: '<path d="M4 4h6v6H4zM14 14h6v6h-6z"/><path d="M14 7h3a3 3 0 0 1 3 3v1M10 17H7a3 3 0 0 1-3-3v-1"/>',
    longer: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    shorter: '<path d="M3 12h7M14 12h7M7 8l4 4-4 4M17 8l-4 4 4 4"/>',
    left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
    phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>'
  };
  function ic(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[k] + '</svg>'; }
  function fmt(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = Math.floor(t % 60); return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }
  function curPlan() { return S.P || plan(); }
  function filterCss() {
    var f = (FILTERS.filter(function (x) { return x[0] === S.filter; })[0] || FILTERS[0])[2], a = S.adj || {};
    var adj = (a.b ? ' brightness(' + (1 + a.b / 100) + ')' : '') + (a.c ? ' contrast(' + (1 + a.c / 100) + ')' : '') + (a.s ? ' saturate(' + (1 + a.s / 100) + ')' : '') + (a.w ? ' sepia(' + Math.max(0, a.w) / 100 + ')' : '');
    return (f + adj).trim() || 'none';
  }

  // ---------- the editable plan: every shot keeps its number of beats, so changing the music keeps the cuts on the beat ----------
  function relayout() {
    var P = S.P, beat = 60 / (S.track ? S.track.bpm : 110), t = 0, used = {};
    P.segs = P.segs.filter(function (sg) { return sg.type !== 'end'; });
    if (S.endCard) P.segs.push({ type: 'end', beats: 4 });
    P.beat = beat;
    P.segs.forEach(function (sg, i) { sg.beats = Math.max(1, sg.beats || 2); sg.dur = sg.beats * beat; sg.start = t; t += sg.dur; sg.k = i; if (sg.r == null) sg.r = Math.random(); (sg.ids || []).forEach(function (id) { used[id] = 1; }); });
    P.dur = t; P.used = Object.keys(used).length; P.shots = P.segs.filter(function (s) { return s.type === 'shot'; }).length;
  }
  function freshPlan() { S.P = plan(); S.P.segs.forEach(function (sg) { sg.beats = Math.max(1, Math.round(sg.dur / S.P.beat)); }); relayout(); }
  function snapshot() { return JSON.stringify({ tx: S.tx || {}, fxOff: S.fxOff || {}, segs: S.P.segs, texts: S.texts, stks: S.stks, filter: S.filter, adj: S.adj, tid: S.tid, track: S.track ? S.track.id : '', names: S.names, date: S.date, endCard: S.endCard }); }
  function changed() { if (!S || !S.P) return; S.undo.push(S.last); if (S.undo.length > 50) S.undo.shift(); S.redo = []; S.last = snapshot(); relayout(); renderTimeline(); seek(Math.min(S.t, S.P.dur - 0.01)); updUndo(); }
  function restore(js) {
    var o = JSON.parse(js); S.tx = o.tx || {}; S.fxOff = o.fxOff || {}; S.P.segs = o.segs; S.texts = o.texts; S.stks = o.stks; S.filter = o.filter; S.adj = o.adj; S.tid = o.tid; S.T = TEMPLATES[o.tid] || S.T;
    S.track = S.tracks.filter(function (t) { return t.id === o.track; })[0] || null; S.names = o.names; S.date = o.date; S.endCard = o.endCard; S.fcss = filterCss();
    relayout(); renderTimeline(); seek(Math.min(S.t, S.P.dur - 0.01)); updUndo();
  }
  function undo() { if (!S.undo.length) return; stopPreview(); S.redo.push(snapshot()); var js = S.undo.pop(); S.last = js; restore(js); }
  function redo() { if (!S.redo.length) return; stopPreview(); S.undo.push(snapshot()); var js = S.redo.pop(); S.last = js; restore(js); }

  // ---------- text and drawings on top of the video ----------
  function drawOverlays(ctx, t) {
    (S.texts || []).forEach(function (x) {
      if (t < x.start || t > x.start + x.dur) return;
      var a = Math.min(1, (t - x.start) / 0.25, (x.start + x.dur - t) / 0.25), y = x.y * H, size = x.size || 84;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var font = x.style === 'script' ? 'italic 500 ' + size * 1.15 + 'px ' + SERIF : x.style === 'type' ? '500 ' + size * 0.8 + 'px ' + MONO : x.style === 'classic' ? '500 ' + size + 'px ' + SERIF : '800 ' + size * 0.85 + 'px ' + SANS;
      ctx.font = font;
      var lines = String(x.text || '').split('\n').slice(0, 4), lh = size * 1.12, top = y - (lines.length - 1) * lh / 2;
      lines.forEach(function (l, i) {
        var ly = top + i * lh, w = ctx.measureText(l).width;
        if (x.style === 'box') { ctx.fillStyle = x.color === '#1E1916' ? '#FFFFFF' : '#FAC646'; var pad = size * 0.22; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(W / 2 - w / 2 - pad, ly - lh / 2, w + pad * 2, lh, 14); else ctx.rect(W / 2 - w / 2 - pad, ly - lh / 2, w + pad * 2, lh); ctx.fill(); ctx.fillStyle = x.color === '#FFFFFF' || x.color === '#FAC646' ? '#1E1916' : x.color; }
        else { ctx.fillStyle = x.color || '#FFFFFF'; ctx.shadowColor = x.style === 'neon' ? (x.color || '#FFFFFF') : 'rgba(0,0,0,.55)'; ctx.shadowBlur = x.style === 'neon' ? 28 : 14; }
        ctx.fillText(l, W / 2, ly);
      });
      ctx.restore();
    });
    if (window.Path2D && window.PG_STICKERS) (S.stks || []).forEach(function (x) {
      if (t < x.start || t > x.start + x.dur) return;
      var def = window.PG_STICKERS.filter(function (s) { return s.k === x.k; })[0]; if (!def) return;
      var a = Math.min(1, (t - x.start) / 0.2, (x.start + x.dur - t) / 0.2), s = (x.size || 220) / 24, bob = Math.sin(t * 3) * 6;
      ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(x.x * W, x.y * H + bob); ctx.scale(s, s); ctx.translate(-12, -12);
      ctx.strokeStyle = x.color || '#FFFFFF'; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 3;
      try { ctx.stroke(new Path2D(def.d)); } catch (e) {} ctx.restore();
    });
  }
  function stickersReady() {
    if (window.PG_STICKERS) return Promise.resolve();
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = '/app/stickers.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }

  // ---------- small bottom sheets for each tool ----------
  function sheet(title, build, onDone) {
    closeSheet();
    var body = el('div', { class: 're-sh-body' });
    var box = el('div', { class: 're-sheet', role: 'dialog', 'aria-label': title }, [
      el('div', { class: 're-sh-top' }, [el('b', { text: title }), el('button', { type: 'button', class: 're-sh-done', text: 'Done', onclick: function () { closeSheet(); if (onDone) onDone(); } })]), body]);
    build(body); S.edit.appendChild(box); S.sheetEl = box;
    return body;
  }
  function closeSheet() { if (S && S.sheetEl) { S.sheetEl.remove(); S.sheetEl = null; } if (S && S.selEl) { S.selEl.remove(); S.selEl = null; } }
  function chips(row, list, cur, onPick) {
    row.innerHTML = '';
    list.forEach(function (it) {
      var b = el('button', { type: 'button', class: 'rl-chip' + (it.v === cur ? ' on' : ''), text: it.t, 'data-v': String(it.v), onclick: function () { row.querySelectorAll('.rl-chip').forEach(function (c) { c.classList.remove('on'); }); b.classList.add('on'); onPick(it.v); } });
      row.appendChild(b);
    });
  }
  function slider(label, min, max, val, onInput) {
    var r = el('input', { type: 'range', min: String(min), max: String(max), value: String(val), class: 're-range', 'aria-label': label });
    var v = el('span', { text: String(val) });
    r.addEventListener('input', function () { v.textContent = r.value; onInput(+r.value); });
    return el('label', { class: 're-sl' }, [el('span', { text: label }), r, v]);
  }
  function toolAudio() {
    sheet('Audio', function (b) {
      b.appendChild(el('p', { class: 're-hint', text: 'Cuts land on the beat of the music. Your own song stays on this phone and is gone when you close.' }));
      S.tracks.concat([{ id: '', title: 'No music' }]).forEach(function (t) {
        b.appendChild(el('button', { type: 'button', class: 're-track' + ((S.track ? S.track.id : '') === t.id ? ' on' : ''), onclick: function () {
          stopPreview(); S.track = t.id ? t : null; changed(); toolAudio();
        } }, [el('i', { html: ic('audio') }), el('span', { text: t.title }), el('small', { text: t.bpm ? Math.round(t.bpm) + ' bpm' : '' })]));
      });
      b.appendChild(el('button', { type: 'button', class: 're-track re-own', onclick: function () { S.ownInput.click(); } }, [el('i', { html: ic('add') }), el('span', { text: 'Your music…' }), el('small', { text: 'MP3, M4A' })]));
    });
  }
  function toolText(item) {
    var x = item || { text: '', style: 'box', color: '#FFFFFF', size: 84, y: 0.3, start: Math.min(S.t, Math.max(0, S.P.dur - 3)), dur: 3 };
    var isNew = !item;
    sheet(isNew ? 'Add text' : 'Edit text', function (b) {
      var inp = el('textarea', { class: 'rl-in re-ta', rows: '2', placeholder: 'Type here', maxlength: '120' }); inp.value = x.text;
      inp.addEventListener('input', function () { x.text = inp.value; if (!isNew || x.text) { if (isNew && S.texts.indexOf(x) < 0) S.texts.push(x); seek(Math.max(S.t, x.start + 0.3)); } });
      var st = el('div', { class: 'rl-row' }), co = el('div', { class: 'rl-row' });
      chips(st, TEXT_STYLES.map(function (s) { return { t: s[1], v: s[0] }; }), x.style, function (v) { x.style = v; seek(S.t); });
      COLOURS.forEach(function (c) { co.appendChild(el('button', { type: 'button', class: 're-dot' + (x.color === c ? ' on' : ''), style: 'background:' + c, 'aria-label': 'Colour ' + c, onclick: function (e) { x.color = c; co.querySelectorAll('.re-dot').forEach(function (d) { d.classList.remove('on'); }); e.currentTarget.classList.add('on'); seek(S.t); } })); });
      b.append(inp, st, co,
        slider('Size', 40, 160, x.size, function (v) { x.size = v; seek(S.t); }),
        slider('Up / down', 8, 92, Math.round(x.y * 100), function (v) { x.y = v / 100; seek(S.t); }),
        slider('Seconds', 1, Math.max(2, Math.floor(S.P.dur)), Math.round(x.dur), function (v) { x.dur = v; renderTimeline(); }));
      if (!isNew) b.appendChild(el('button', { type: 'button', class: 'rl-sub re-del', html: ic('trash') + ' Delete text', onclick: function () { S.texts = S.texts.filter(function (y) { return y !== x; }); closeSheet(); changed(); } }));
      setTimeout(function () { inp.focus(); }, 50);
    }, function () { if (isNew && x.text && S.texts.indexOf(x) < 0) S.texts.push(x); S.texts = S.texts.filter(function (y) { return String(y.text).trim(); }); changed(); });
  }
  function toolSticker(item) {
    stickersReady().then(function () {
      if (item) {
        sheet('Drawing', function (b) {
          var co = el('div', { class: 'rl-row' });
          COLOURS.forEach(function (c) { co.appendChild(el('button', { type: 'button', class: 're-dot' + (item.color === c ? ' on' : ''), style: 'background:' + c, 'aria-label': 'Colour ' + c, onclick: function (e) { item.color = c; co.querySelectorAll('.re-dot').forEach(function (d) { d.classList.remove('on'); }); e.currentTarget.classList.add('on'); seek(S.t); } })); });
          b.append(co, slider('Size', 80, 600, item.size, function (v) { item.size = v; seek(S.t); }),
            slider('Left / right', 5, 95, Math.round(item.x * 100), function (v) { item.x = v / 100; seek(S.t); }),
            slider('Up / down', 5, 95, Math.round(item.y * 100), function (v) { item.y = v / 100; seek(S.t); }),
            slider('Seconds', 1, Math.max(2, Math.floor(S.P.dur)), Math.round(item.dur), function (v) { item.dur = v; renderTimeline(); }),
            el('button', { type: 'button', class: 'rl-sub re-del', html: ic('trash') + ' Delete drawing', onclick: function () { S.stks = S.stks.filter(function (y) { return y !== item; }); closeSheet(); changed(); } }));
        }, changed);
        return;
      }
      sheet('Drawings', function (b) {
        var cats = ['Flowers', 'Wedding', 'Ceremony', 'Love', 'Party', 'Lettering'].filter(function (c) { return window.PG_STICKERS.some(function (x) { return x.c === c; }); });
        var tabs = el('div', { class: 'rl-row' }), grid = el('div', { class: 're-stk-grid' });
        function show(c) {
          grid.innerHTML = '';
          window.PG_STICKERS.filter(function (x) { return x.c === c; }).forEach(function (x) {
            grid.appendChild(el('button', { type: 'button', class: 're-stk', title: x.n, 'aria-label': x.n, html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="' + x.d + '"/></svg>', onclick: function () {
              var it = { k: x.k, start: Math.min(S.t, Math.max(0, S.P.dur - 3)), dur: 3, x: 0.5, y: 0.7, size: 260, color: '#FFFFFF' };
              S.stks.push(it); closeSheet(); changed(); seek(it.start + 0.4); toolSticker(it);
            } }));
          });
        }
        chips(tabs, cats.map(function (c) { return { t: c, v: c }; }), cats[0], show); show(cats[0]);
        b.append(tabs, grid);
      });
    }).catch(function () { msg('The drawings could not load. Check the internet.'); });
  }
  function toolFilters() {
    sheet('Filters', function (b) {
      var row = el('div', { class: 're-filters' });
      var thumb = S.P.segs.filter(function (s) { return s.type === 'shot'; })[0], src = thumb ? thumbUrl(thumb.ids[0], 160) : '';
      FILTERS.forEach(function (f) {
        var bt = el('button', { type: 'button', class: 're-filter' + (S.filter === f[0] ? ' on' : ''), onclick: function () { S.filter = f[0]; S.fcss = filterCss(); row.querySelectorAll('.re-filter').forEach(function (x) { x.classList.remove('on'); }); bt.classList.add('on'); seek(S.t); } },
          [el('img', { src: src, alt: '', style: 'filter:' + (f[2] || 'none') }), el('span', { text: f[1] })]);
        row.appendChild(bt);
      });
      b.appendChild(row);
    }, changed);
  }
  function toolAdjust() {
    sheet('Adjust', function (b) {
      var a = S.adj, upd = function () { S.fcss = filterCss(); seek(S.t); };
      b.append(slider('Brightness', -40, 40, a.b || 0, function (v) { a.b = v; upd(); }), slider('Contrast', -40, 40, a.c || 0, function (v) { a.c = v; upd(); }),
        slider('Saturation', -60, 60, a.s || 0, function (v) { a.s = v; upd(); }), slider('Warmth', 0, 60, a.w || 0, function (v) { a.w = v; upd(); }));
    }, changed);
  }
  function applyStyle(v) { stopPreview(); S.fxOff = {}; pickStyle(v); freshPlan(); changed(); seek(0); }
  function toolStyle() {
    sheet('Style', function (b) {
      b.appendChild(el('p', { class: 're-hint', text: 'A new style rebuilds the layouts and transitions. Your text, drawings and filter stay.' }));
      var row = el('div', { class: 'rl-row' });
      chips(row, ORDER.map(function (k) { return { t: label(TEMPLATES[k]), v: k }; }), S.tid, function (v) {
        applyStyle(v);
      });
      b.append(row, el('button', { type: 'button', class: 'rl-sub', text: 'Shuffle the order of the photos', onclick: function () { stopPreview(); S.photos = shuffle(S.photos); S.seed = Math.floor(Math.random() * 1e9); freshPlan(); changed(); seek(0); } }));
    });
  }
  function toolTitle() {
    sheet('Title & ending', function (b) {
      var names = el('input', { class: 'rl-in', value: S.names, 'aria-label': 'Names', maxlength: '40' }), date = el('input', { class: 'rl-in', value: S.date, 'aria-label': 'Date', maxlength: '30' });
      names.addEventListener('input', function () { S.names = names.value || ' '; seek(0.9); }); date.addEventListener('input', function () { S.date = date.value; seek(0.9); });
      var end = el('input', { type: 'checkbox' }); end.checked = S.endCard; end.addEventListener('change', function () { S.endCard = end.checked; changed(); });
      b.append(el('div', { class: 'rl-lbl', text: 'Names on the opening card' }), names, el('div', { class: 'rl-lbl', text: 'Date' }), date,
        el('label', { class: 'rl-tog' }, [end, el('span', { text: 'Ending card with the photographer’s name (the small watermark always stays)' })]));
    }, changed);
  }
  // one piece of card text: change the words, drag it on the screen, or put it back
  function toolCardText(key) {
    var isNames = /names$/.test(key), isEnd = key.indexOf('end.') === 0;
    sheet(isNames ? 'Names' : isEnd ? 'Ending line' : 'Date', function (b) {
      var cur = isNames ? S.names : ((S.tx || {})[key] || {}).text != null ? S.tx[key].text : isEnd ? (S.studio ? 'Photos by ' + S.studio : '') : S.date;
      var inp = el('input', { class: 'rl-in', value: cur, maxlength: '50', 'aria-label': 'Text' });
      inp.addEventListener('input', function () {
        if (isNames) S.names = inp.value || ' ';
        else if (!isEnd) S.date = inp.value;
        else { S.tx = Object.assign({}, S.tx); S.tx[key] = Object.assign({}, S.tx[key], { text: inp.value }); }
        seek(S.t);
      });
      b.append(el('div', { class: 'rl-lbl', text: 'Change the words' }), inp,
        el('p', { class: 're-hint', text: 'Drag it on the screen to place it anywhere. Only the reel changes — not the event or file names.' }),
        el('button', { type: 'button', class: 'rl-sub', text: 'Put it back where it was', onclick: function () { S.tx = Object.assign({}, S.tx); var o = Object.assign({}, S.tx[key]); delete o.dx; delete o.dy; S.tx[key] = o; changed(); toolCardText(key); } }));
    }, changed);
  }
  function bindTextDrag() {   // paused on a title card: drag its words
    var d = null;
    var pt = function (e) { var rc = S.canvas.getBoundingClientRect(); return { x: (e.clientX - rc.left) * W / rc.width, y: (e.clientY - rc.top) * H / rc.height }; };
    S.canvas.addEventListener('pointerdown', function (e) {
      if (S.view !== 'edit' || S.raf || !S.P) return;
      var p = pt(e), h = (S.textHits || []).filter(function (h) { return p.x >= h.x0 && p.x <= h.x1 && p.y >= h.y0 && p.y <= h.y1; }).pop();
      if (!h) return; d = { key: h.key, last: p, moved: false }; S.canvas.setPointerCapture(e.pointerId); e.preventDefault();
    });
    S.canvas.addEventListener('pointermove', function (e) {
      if (!d) return; var p = pt(e), dx = p.x - d.last.x, dy = p.y - d.last.y; d.last = p;
      if (Math.abs(dx) + Math.abs(dy) < 0.5) return; d.moved = true;
      S.tx = Object.assign({}, S.tx); var o = Object.assign({}, S.tx[d.key]); o.dx = (o.dx || 0) + dx; o.dy = (o.dy || 0) + dy; S.tx[d.key] = o;
      if (S.selEl) { S.selEl.remove(); S.selEl = null; } seek(S.t);
    });
    var up = function () { if (!d) return; if (d.moved) { S.noTap = true; changed(); setTimeout(function () { S.noTap = false; }, 0); } d = null; };
    S.canvas.addEventListener('pointerup', up); S.canvas.addEventListener('pointercancel', up);
  }
  function toolLength() {
    sheet('Length', function (b) {
      var row = el('div', { class: 'rl-row' });
      chips(row, [{ t: '15 s', v: 15 }, { t: '30 s', v: 30 }, { t: '60 s', v: 60 }], S.length, function (v) { stopPreview(); S.length = v; freshPlan(); changed(); seek(0); });
      b.append(el('p', { class: 're-hint', text: 'Builds the reel again for this length. Text and drawings stay.' }), row);
    });
  }
  // tap a clip on the timeline
  function toolClip(i, slot) {
    var sg = S.P.segs[i]; if (!sg || sg.type !== 'shot') return;
    slot = slot > 0 && slot < sg.ids.length ? slot : 0; var many = sg.ids.length > 1, vid = isVideo(sg.ids[slot]);
    sheet('Clip ' + (S.P.segs.filter(function (s, k) { return s.type === 'shot' && k <= i; }).length) + (many ? ' · photo ' + (slot + 1) + ' of ' + sg.ids.length : ''), function (b) {
      b.appendChild(el('div', { class: 're-thisone' }, [el('img', { src: thumbUrl(sg.ids[slot], 160), alt: '' }), el('span', { text: vid ? 'This video' : 'This photo' }),
        el('button', { type: 'button', class: 're-repl', html: ic('replace') + '<span>Replace</span>', onclick: function () { replaceIn(i, slot); } })]));
      var row = el('div', { class: 're-clipbar' });
      var act = function (k, t, fn, off) { var bt = el('button', { type: 'button', class: 're-tool', html: ic(k) + '<span>' + t + '</span>', onclick: fn }); if (off) bt.disabled = true; row.appendChild(bt); };
      act('longer', 'Longer', function () { sg.beats++; changed(); toolClip(i, slot); }, sg.beats >= 16);
      act('shorter', 'Shorter', function () { sg.beats = Math.max(LAYOUT_MIN[sg.layout] || 1, sg.beats - 1); changed(); toolClip(i, slot); }, sg.beats <= (LAYOUT_MIN[sg.layout] || 1));
      act('left', 'Move left', function () { var j = i - 1; if (S.P.segs[j] && S.P.segs[j].type === 'shot') { S.P.segs[i] = S.P.segs[j]; S.P.segs[j] = sg; changed(); toolClip(j, slot); } }, !(S.P.segs[i - 1] && S.P.segs[i - 1].type === 'shot'));
      act('right', 'Move right', function () { var j = i + 1; if (S.P.segs[j] && S.P.segs[j].type === 'shot') { S.P.segs[i] = S.P.segs[j]; S.P.segs[j] = sg; changed(); toolClip(j, slot); } }, !(S.P.segs[i + 1] && S.P.segs[i + 1].type === 'shot'));
      if (vid && slot === 0) {
        act('left', 'Start earlier', function () { sg.vt = Math.max(0, (sg.vt || 0) - 1); changed(); toolClip(i, slot); seek(sg.start + 0.05); }, !(sg.vt > 0));
        act('right', 'Start later', function () { sg.vt = Math.min(Math.max(0, S.vids[sg.ids[0]] - 1), (sg.vt || 0) + 1); sg.beats = Math.min(sg.beats, Math.max(1, Math.floor((S.vids[sg.ids[0]] - sg.vt) / S.P.beat))); changed(); toolClip(i, slot); seek(sg.start + 0.05); }, (sg.vt || 0) >= S.vids[sg.ids[0]] - 1);
      }
      act('trash', 'Delete', function () { if (S.P.shots <= 1) { msg('A reel needs at least one clip.'); return; } S.P.segs.splice(i, 1); closeSheet(); changed(); }, S.P.shots <= 1);
      var lay = el('div', { class: 'rl-row' });
      chips(lay, Object.keys(LAYOUT_N).filter(function (k) { return LAYOUT_N[k] === 1 || LAYOUT_N[k] <= sg.ids.length; }).map(function (k) { return { t: k, v: k }; }), sg.layout, function (v) { sg.layout = v; sg.beats = Math.max(sg.beats, LAYOUT_MIN[v] || 1); changed(); });
      b.append(row, el('div', { class: 'rl-lbl', text: sg.beats + ' beats · ' + sg.dur.toFixed(1) + ' s' + (isVideo(sg.ids[0]) ? ' · video from ' + fmt(sg.vt || 0) + ' (of ' + fmt(S.vids[sg.ids[0]]) + ') · its sound is off, the reel uses the music' : '') + ' · look' }), lay);
    });
  }

  function replaceIn(i, slot) {
    var sg = S.P.segs[i]; if (!sg) return; closeSheet();
    openPicker({ single: true, onPick: function (id) {
      sg.ids[slot] = id;
      if (slot === 0) { delete sg.vt; if (isVideo(id)) { sg.layout = 'single'; sg.ids = [id]; sg.beats = videoBeats(id, S.P.beat); } }
      if (!S.photos.some(function (p) { return p.id === id; })) S.photos.push({ id: id, on: true });
      changed(); seek(S.P.segs[i].start + Math.min(0.6, S.P.segs[i].dur / 2)); toolClip(i, slot);
    } });
  }
  // tap the paused preview: the photo under your finger gets a gold outline and its own pop-up
  function tapPreview(e) {
    if (!S || S.view !== 'edit' || !S.P || S.noTap) return;
    if (S.raf) { stopPreview(); return; }                     // playing: the first tap pauses
    var rc = S.canvas.getBoundingClientRect(), x = (e.clientX - rc.left) * W / rc.width, y = (e.clientY - rc.top) * H / rc.height;
    var segs = S.P.segs, i = 0; while (i < segs.length - 1 && S.t >= segs[i + 1].start) i++;
    var sg = segs[i];
    if (sg.type !== 'shot') {
      draw(S.canvas.getContext('2d'), S.P, S.t);
      var th = (S.textHits || []).filter(function (h) { return x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1; }).pop();
      if (th) { toolCardText(th.key); selBox(th, rc); return; }
      selBox(null); toolTitle(); return;
    }
    draw(S.canvas.getContext('2d'), S.P, S.t);
    var hits = (S.hits || []).filter(function (h) { return sg.ids.indexOf(h.id) > -1; }), hit = null;
    for (var k = hits.length - 1; k >= 0; k--) { var h = hits[k]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) { hit = h; break; } }
    if (!hit && hits.length) hit = hits.reduce(function (a, h) { var da = Math.pow((a.x0 + a.x1) / 2 - x, 2) + Math.pow((a.y0 + a.y1) / 2 - y, 2), dh = Math.pow((h.x0 + h.x1) / 2 - x, 2) + Math.pow((h.y0 + h.y1) / 2 - y, 2); return dh < da ? h : a; });
    var slot = hit ? sg.ids.indexOf(hit.id) : 0;
    toolClip(i, slot); selBox(hit, rc);
  }
  function selBox(h, rc) {
    if (S.selEl) { S.selEl.remove(); S.selEl = null; } if (!h) return;
    var sr = S.stage.getBoundingClientRect(), k = rc.width / W;
    S.selEl = el('div', { class: 're-sel', style: 'left:' + (rc.left - sr.left + h.x0 * k) + 'px;top:' + (rc.top - sr.top + h.y0 * k) + 'px;width:' + ((h.x1 - h.x0) * k) + 'px;height:' + ((h.y1 - h.y0) * k) + 'px' });
    S.stage.appendChild(S.selEl);
  }

  function toolEffects() {
    sheet('Effects', function (b) {
      var list = FX_LIST.filter(function (e) { return fxHas(e[0]); });
      list.forEach(function (e) {
        var off = !!(S.fxOff || {})[e[0]];
        var row = el('div', { class: 're-fxrow' }, [el('span', { text: e[1] }),
          el('button', { type: 'button', class: 're-fxbtn' + (off ? ' off' : ''), 'data-fx': e[0], text: off ? 'Add back' : 'Remove', onclick: function () { S.fxOff = Object.assign({}, S.fxOff); if (off) delete S.fxOff[e[0]]; else S.fxOff[e[0]] = 1; changed(); toolEffects(); } })]);
        b.appendChild(row);
      });
      if (list.length > 1) b.appendChild(el('button', { type: 'button', class: 'rl-sub', text: 'Remove all effects', onclick: function () { S.fxOff = {}; list.forEach(function (e) { S.fxOff[e[0]] = 1; }); changed(); toolEffects(); } }));
      b.appendChild(el('p', { class: 're-pnote', style: 'padding:8px 0 0', text: 'These come with the style. Undo brings them back too.' }));
    });
  }
  // ---------- timeline ----------
  function renderTimeline() {
    if (!S || !S.tlIn) return;
    var P = S.P, pad = Math.round(S.tl.clientWidth / 2) || 180, w = Math.ceil(P.dur * PX);
    S.tlIn.style.width = (pad * 2 + w + 120) + 'px'; S.pad = pad;
    var fxRow = S.tlIn.querySelector('.re-r-fx'); fxRow.innerHTML = '';
    var rows = S.tlIn.querySelectorAll('.re-row:not(.re-r-fx)'); rows.forEach(function (r) { r.innerHTML = ''; });
    var place = function (row, start, dur, cls, html, onTap) { var d = el('button', { type: 'button', class: 're-blk ' + cls, html: html, style: 'left:' + (pad + start * PX) + 'px;width:' + Math.max(18, dur * PX - 3) + 'px', onclick: onTap }); row.appendChild(d); return d; };
    (S.texts || []).forEach(function (x) { place(rows[0], x.start, x.dur, 're-txt', '<span>' + String(x.text).replace(/[<&]/g, ' ').slice(0, 40) + '</span>', function () { stopPreview(); toolText(x); }); });
    (S.stks || []).forEach(function (x) { var d = (window.PG_STICKERS || []).filter(function (s) { return s.k === x.k; })[0]; place(rows[1], x.start, x.dur, 're-stkb', '<span>' + (d ? d.n : 'Drawing') + '</span>', function () { stopPreview(); toolSticker(x); }); });
    // effects that come with the style: one layer; tap to remove them (or bring them back)
    var have = FX_LIST.filter(function (e) { return fxHas(e[0]); });
    if (have.length) {
      var on = have.filter(function (e) { return !(S.fxOff || {})[e[0]]; });
      place(fxRow, 0, P.dur, 're-fxb' + (on.length ? '' : ' off'), '<span>✦ ' + (on.length ? on.map(function (e) { return e[1]; }).join(' · ') : 'Effects removed · tap to bring back') + '</span>', function () { stopPreview(); toolEffects(); });
    }
    fxRow.style.display = have.length ? '' : 'none';
    // music: bars that pulse on every beat (the cuts follow these)
    var au = place(rows[2], 0, P.dur, 're-aud', '<span>' + (S.track ? '♪ ' + String(S.track.title).replace(/[<&]/g, ' ') : 'No music · tap to add') + '</span>', function () { stopPreview(); toolAudio(); });
    if (S.track) { var beats = Math.floor(P.dur / P.beat), bars = ''; for (var k = 0; k < beats; k++) bars += '<i style="left:' + (k * P.beat * PX) + 'px;height:' + (k % 4 === 0 ? 70 : 38) + '%"></i>'; au.insertAdjacentHTML('beforeend', bars); }
    P.segs.forEach(function (sg, i) {
      var html = sg.type === 'shot' ? sg.ids.slice(0, 3).map(function (id) { return '<img alt="" loading="lazy" src="' + thumbUrl(id, 120) + '">'; }).join('') + (isVideo(sg.ids[0]) ? '<b class="re-vmark">' + ic('play') + '</b>' : '') : '<span>' + (sg.type === 'title' ? 'Title' : 'Ending') + '</span>';
      place(rows[3], sg.start, sg.dur, 're-clip' + (sg.type !== 'shot' ? ' re-card' : ''), html, function () { stopPreview(); if (sg.type === 'shot') toolClip(i); else toolTitle(); });
    });
    var add = el('button', { type: 'button', class: 're-blk re-addclip', html: ic('add') + '<span>Add clip</span>', style: 'left:' + (pad + w + 8) + 'px', onclick: function () { stopPreview(); openPicker({ add: true }); } });
    rows[3].appendChild(add);
    S.timeEl.lastChild.textContent = fmt(P.dur);
  }
  var seekRaf = 0;
  function seek(t, fromScroll) {
    if (!S || !S.P) return; S.t = Math.max(0, Math.min(t, S.P.dur - 0.01));
    if (!fromScroll && S.tl) { S.tl.scrollLeft = S.t * PX; S.progLeft = S.tl.scrollLeft; }
    S.timeEl.firstChild.textContent = fmt(S.t);
    if (seekRaf) return;
    seekRaf = requestAnimationFrame(function () { seekRaf = 0; if (S && S.P && !S.raf) draw(S.canvas.getContext('2d'), S.P, S.t); });
  }
  function updUndo() { if (S.undoBtn) { S.undoBtn.disabled = !S.undo.length; S.redoBtn.disabled = !S.redo.length; } }

  // ---------- 1. styles feed ----------
  function showInspo() {
    stopPreview(); S.view = 'inspo'; S.wrap.dataset.view = 'inspo';
    var feed = S.feed; feed.innerHTML = '';
    var group = S.group || 'all', keys = ORDER.filter(function (k) { return inGroup(TEMPLATES[k], group); });
    keys.forEach(function (k) {
      var T = TEMPLATES[k], tr = S.tracks.filter(function (t) { return t.id === T.music; })[0];
      var card = el('section', { class: 're-ins', 'data-style': k }, [
        el('div', { class: 're-ins-slot' }),
        el('div', { class: 're-ins-info' }, [
          el('b', { text: label(T) }),
          el('span', { text: '0:' + (S.length < 10 ? '0' : '') + S.length + ' · ' + (tr ? '♪ ' + tr.title : '') }),
          el('button', { type: 'button', class: 're-use', text: 'Use template', onclick: function () { pickStyle(k); showPick(); } })])]);
      feed.appendChild(card);
    });
    if (S.io) S.io.disconnect();
    S.io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio > 0.6) previewStyle(e.target.dataset.style, e.target); }); }, { root: feed, threshold: [0.6] });
    feed.querySelectorAll('.re-ins').forEach(function (c) { S.io.observe(c); });
    feed.scrollTop = 0;
  }
  function pickStyle(k) { S.tid = k; S.T = TEMPLATES[k]; var rec = S.tracks.filter(function (t) { return t.id === S.T.music; })[0]; if (rec && !(S.track && S.track.own)) S.track = rec; }
  // the visible style plays in its card (one canvas and one sound button, moved from card to card).
  // Sound starts muted; the button glows until it is tapped. Once unmuted, every style plays with its music —
  // and only the one on screen: scrolling on, leaving the feed or switching apps stops it.
  function previewStyle(k, card) {
    if (S.view !== 'inspo') return;
    stopLoop(); pickStyle(k); S.inspoK = k; S.inspoCard = card;
    card.querySelector('.re-ins-slot').appendChild(S.canvas); card.appendChild(muteBtn()); paintMute();
    var P = plan(), L = Math.max(1, Math.min(P.dur, 12)), t0 = performance.now(), ctx = S.canvas.getContext('2d'), my = S.inspoRun = {};
    var clockNow = function () { return (performance.now() - t0) / 1000; };
    if (S.inspoSound) {
      var tr = S.tracks.filter(function (t) { return t.id === TEMPLATES[k].music; })[0];
      loadTrack(tr).then(function (buf) {
        if (!buf || !S || S.inspoRun !== my || !S.inspoSound || S.view !== 'inspo') return;
        var ac = audioCtx(); if (ac.resume) ac.resume();
        var src = ac.createBufferSource(), g = ac.createGain(), at = ac.currentTime + 0.05, from = Math.min(tr.beat0 || 0, Math.max(0, buf.duration - L));
        src.buffer = buf; src.loop = true; src.loopStart = from; src.loopEnd = Math.min(buf.duration, from + L);
        src.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(1, at + 0.25);
        src.start(at, from); S.inspoAud = { src: src, g: g };
        clockNow = function () { return Math.max(0, ac.currentTime - at); };   // pictures follow the music
      }).catch(function () {});
    }
    (function loop() { if (!S || S.view !== 'inspo' || S.inspoRun !== my) return; draw(ctx, P, clockNow() % L); S.loop = requestAnimationFrame(loop); })();
  }
  function stopInspoSound() {
    if (S && S.inspoAud) { var a = S.inspoAud, ac = S.ac; S.inspoAud = null; try { a.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05); a.src.stop(ac.currentTime + 0.2); } catch (e) { try { a.src.stop(); } catch (e2) {} } }
  }
  function stopLoop() { if (S) { if (S.loop) { cancelAnimationFrame(S.loop); S.loop = 0; } S.inspoRun = null; stopInspoSound(); } }
  var SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4V5z"/>';
  function muteBtn() {
    if (!S.muteEl) S.muteEl = el('button', { type: 'button', class: 're-mute', onclick: function (e) {
      e.stopPropagation(); S.inspoSound = !S.inspoSound; S.soundTried = true;
      if (S.inspoSound) { var ac = audioCtx(); if (ac.resume) ac.resume(); }   // the tap itself lets the phone play sound
      if (S.inspoK && S.inspoCard) previewStyle(S.inspoK, S.inspoCard);
    } });
    return S.muteEl;
  }
  function paintMute() {
    var on = !!S.inspoSound, b = S.muteEl; if (!b) return;
    b.innerHTML = SPK + (on ? '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>' : '<path d="M16 9l5 6M21 9l-5 6"/></svg><span>Tap for sound</span>');
    b.setAttribute('aria-label', on ? 'Mute' : 'Turn sound on'); b.classList.toggle('on', on); b.classList.toggle('glow', !on && !S.soundTried);
  }
  document.addEventListener('visibilitychange', function () {
    if (!S || S.view !== 'inspo') return;
    if (document.hidden) stopLoop(); else if (S.inspoK && S.inspoCard) previewStyle(S.inspoK, S.inspoCard);
  });

  // ---------- 2. choose photos (numbered, like a phone photo picker) ----------
  function openPicker(o) {
    o = o || {};
    stopLoop(); stopPreview();
    var cols = (S.opt.collections || []).slice(); if (!cols.length) cols = [{ name: 'Your photos', photos: S.photos.map(function (p) { return { id: p.id }; }) }];
    if (S.phoneCol) cols.push(S.phoneCol);
    // opt.choose: the photos given are only for the style previews — you pick the reel's photos yourself (up to 80)
    var order = o.single || o.add || (S.opt.choose && !S.P) ? [] : S.photos.filter(function (p) { return p.on; }).map(function (p) { return p.id; });
    var grid = el('div', { class: 'rl-pgrid' }), sel = el('select', { class: 're-colsel', 'aria-label': 'Collection' }), next = el('button', { type: 'button', class: 're-next', text: o.single ? 'Use' : 'Next' });
    cols.forEach(function (c, i) { sel.appendChild(el('option', { value: String(i), text: c.name + ' (' + c.photos.length + ')' })); });
    var count = el('span', { class: 'rl-pcount' });
    // from your phone: photos and videos are read here only — nothing is uploaded, all of it is let go when Reel Edits closes
    var pin = el('input', { type: 'file', accept: 'image/*,video/*', multiple: '', class: 're-pin', style: 'display:none' });
    var pbtn = el('button', { type: 'button', class: 're-phone', html: ic('phone') + '<span>From your phone</span>', onclick: function () { pin.click(); } });
    var pnote = el('p', { class: 're-pnote', text: 'Photos and videos from your phone stay on your phone — nothing is uploaded, and they are let go when you close Reel Edits.' });
    var phoneRow = el('div', {}, [el('div', { class: 'rl-row', style: 'padding:0 14px 6px' }, [pbtn]), pnote, pin]);
    pin.addEventListener('change', function () {
      var files = Array.prototype.slice.call(pin.files || []); pin.value = ''; if (!files.length) return;
      var have = S.phoneCol ? S.phoneCol.photos.length : 0, vids = Object.keys(S.vids).length, skip = 0;
      files = files.filter(function (f) { var v = /^video\//.test(f.type) || /\.(mov|mp4|m4v|webm)$/i.test(f.name); if (have >= PHONE_MAX || (v && vids >= VIDEO_MAX)) { skip++; return false; } have++; if (v) vids++; return true; });
      pbtn.disabled = true; var done = 0, bad = 0, got = [];
      var step = function () {
        if (!files.length) {
          pbtn.disabled = false; pbtn.querySelector('span').textContent = 'From your phone';
          if (!S.phoneCol) { S.phoneCol = { name: 'From your phone', photos: [] }; cols.push(S.phoneCol); sel.appendChild(el('option', { value: String(cols.length - 1) })); }
          got.forEach(function (id) { S.phoneCol.photos.push({ id: id }); });
          if (o.single) { if (got.length) order = [got[0]]; } else order = got.concat(order).slice(0, 80);   // what you bring from the phone comes first in the reel
          var ix = cols.indexOf(S.phoneCol); sel.options[ix].textContent = S.phoneCol.name + ' (' + S.phoneCol.photos.length + ')'; sel.value = String(ix); show(ix);
          pnote.textContent = (bad ? bad + ' file(s) could not be opened on this phone. ' : '') + (skip ? 'Up to ' + PHONE_MAX + ' files and ' + VIDEO_MAX + ' videos per reel. ' : '') + 'They stay on your phone — nothing is uploaded.';
          return;
        }
        pbtn.querySelector('span').textContent = 'Opening ' + (++done) + '…';
        loadPhoneFile(files.shift()).then(function (id) { got.push(id); }, function () { bad++; }).then(step);
      };
      step();
    });
    var box = el('div', { class: 'rl-picker', role: 'dialog', 'aria-label': 'Choose photos' }, [
      el('div', { class: 're-bar' }, [el('button', { type: 'button', class: 're-ib', 'aria-label': 'Back', html: ic('left'), onclick: function () { box.remove(); if (!S.P) showInspo(); } }), sel, count, next]), phoneRow, grid]);
    function upd() { count.textContent = o.single ? 'Choose one' : order.length ? order.length + ' chosen' : 'Choose up to 80'; grid.querySelectorAll('.rl-pick').forEach(function (t) { var n = order.indexOf(t.dataset.id); t.classList.toggle('on', n > -1); t.querySelector('i').textContent = n > -1 ? String(n + 1) : ''; }); next.disabled = !order.length; }
    function show(i) {
      grid.innerHTML = '';
      (cols[i].photos || []).forEach(function (p) {
        var t = el('button', { type: 'button', class: 'rl-pick', 'data-id': p.id }, [el('img', { src: thumbUrl(p.id, 240), alt: '', loading: 'lazy' }), el('i')].concat(isVideo(p.id) ? [el('u', { text: '▶ ' + fmt(S.vids[p.id]) })] : []));
        t.addEventListener('click', function () { var n = order.indexOf(p.id); if (o.single) order = [p.id]; else if (n > -1) order.splice(n, 1); else if (order.length < 80) order.push(p.id); upd(); });
        grid.appendChild(t);
      });
      grid.scrollTop = 0; upd();
    }
    sel.addEventListener('change', function () { show(+sel.value); });
    next.addEventListener('click', function () {
      if (!order.length) return;
      var need = order.filter(function (id) { return !S.bitmaps[id]; });
      next.disabled = true; next.textContent = need.length ? '0 / ' + need.length : '…';
      loadPhotos(need, function (d, n) { next.textContent = d + ' / ' + n; }).then(function (got) {
        Object.keys(got).forEach(function (id) { S.bitmaps[id] = got[id]; });
        var ok = order.filter(function (id) { return S.bitmaps[id]; }); box.remove();
        if (!ok.length) { msg('Those photos could not be loaded. Check the internet.'); return; }
        if (o.single) { o.onPick(ok[0]); return; }
        if (o.add) {   // new clips at the end, before the ending card
          var at = S.P.segs.filter(function (s) { return s.type !== 'end'; }).length;
          ok.forEach(function (id, k) { S.P.segs.splice(at + k, 0, { type: 'shot', layout: 'single', ids: [id], beats: isVideo(id) ? videoBeats(id, S.P.beat) : Math.max(2, S.T.beats[0] || 2), trans: S.T.trans[k % S.T.trans.length], r: Math.random() }); if (!S.photos.some(function (p) { return p.id === id; })) S.photos.push({ id: id, on: true }); });
          changed(); seek(S.P.segs[at].start + 0.1); return;
        }
        var have = {}; S.photos = ok.map(function (id) { have[id] = 1; return { id: id, on: true }; });
        openEditor();
      });
    });
    S.wrap.appendChild(box);
    var start = 0; if (!o.single && order.length) { cols.some(function (c, i) { if (c.photos.some(function (p) { return p.id === order[0]; })) { start = i; return true; } }); }
    sel.value = String(start); show(start);
  }
  function showPick() { openPicker({}); }

  // ---------- 3. editor ----------
  function openEditor() {
    stopLoop(); S.view = 'edit'; S.wrap.dataset.view = 'edit';
    S.stage.insertBefore(S.canvas, S.stage.firstChild);
    freshPlan(); S.texts = S.texts || []; S.stks = S.stks || []; S.undo = []; S.redo = []; S.last = snapshot(); S.fcss = filterCss();
    renderTimeline(); updUndo(); seek(0.9); S.tl.scrollLeft = 0; S.t = 0;
    setTimeout(function () { renderTimeline(); seek(0); }, 60);
    var seen = false; try { seen = localStorage.getItem('pg_re_tap') === '1'; localStorage.setItem('pg_re_tap', '1'); } catch (e) {}
    if (!seen) { var hint = 'Tip: pause, then tap a photo on the screen to change it.'; msg(hint); setTimeout(function () { if (S && S.msg && S.msg.textContent === hint) msg(''); }, 6000); }
  }
  function play() {
    if (!S.P) return;
    if (S.raf) { stopPreview(); return; }
    var P = S.P, at = S.t >= P.dur - 0.1 ? 0 : S.t;
    S.playBtn.innerHTML = '&#10074;&#10074;'; msg('');
    var ac = audioCtx(); if (ac.state === 'suspended') ac.resume();
    loadTrack(S.track).then(function (buf) {
      S.aud = startAudio(buf, ac.destination, P.dur, at); var now = clock(S.aud), p0 = performance.now(), ctx = S.canvas.getContext('2d');
      (function loop() {
        var t = S.aud ? now() : at + (performance.now() - p0) / 1000;
        if (t >= P.dur) { stopPreview(); seek(P.dur - 0.01); return; }
        draw(ctx, P, Math.max(0, t)); S.t = t; S.tl.scrollLeft = t * PX; S.progLeft = S.tl.scrollLeft; S.timeEl.firstChild.textContent = fmt(t);
        S.raf = requestAnimationFrame(loop);
      })();
    }).catch(function () { msg('The music could not load. Check the internet and try again.'); stopPreview(); });
  }

  // ---------- 4. export ----------
  function goExport() {
    if (!S.P || !S.P.used) { msg('Add at least one clip.'); return; }
    closeSheet(); stopPreview(); S.view = 'export'; S.wrap.dataset.view = 'export';
    S.expStage.appendChild(S.canvas); S.done.style.display = 'none'; S.expMsg.textContent = '';
    exportReel();
  }
  function backToEdit() {
    if (S.video) { URL.revokeObjectURL(S.video.src); S.video.removeAttribute('src'); S.video.remove(); } S.video = null; S.result = null;
    S.canvas.style.display = ''; S.stage.insertBefore(S.canvas, S.stage.firstChild); S.view = 'edit'; S.wrap.dataset.view = 'edit'; renderTimeline(); seek(S.t);
  }

  // ---------- your own music: stays on this phone, never uploaded; gone when the reel maker closes ----------
  function findBeat(buf) {
    var sr = buf.sampleRate, n = Math.min(buf.length, Math.round(sr * 90)), hop = Math.round(sr * 0.01), chs = [];
    for (var c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c));
    var a = Math.exp(-2 * Math.PI * 160 / sr), y = 0, acc = 0, env = [];
    for (var i = 0; i < n; i++) { var x = chs.length > 1 ? (chs[0][i] + chs[1][i]) / 2 : chs[0][i]; y = (1 - a) * x + a * y; acc += y * y; if ((i + 1) % hop === 0) { env.push(Math.sqrt(acc / hop)); acc = 0; } }
    var on = env.map(function (v, k) { return k ? Math.max(0, v - env[k - 1]) : 0; });
    var best = 0, bestL = 50;
    for (var L = 33; L <= 100; L++) {      // 60–180 beats per minute
      var r = 0; for (var k = 0; k + L < on.length; k++) r += on[k] * on[k + L];
      var bpm = 6000 / L, w = Math.exp(-Math.pow(Math.log2(bpm / 118), 2) / 0.5); r *= w;
      if (r > best) { best = r; bestL = L; }
    }
    // the beat rarely lands on a whole 10 ms step, so fine-tune the gap and the start together
    function comb(P, o) { var sum = 0; for (var q = o; q < on.length; q += P) { var j = Math.round(q); sum += on[j] + 0.5 * ((on[j - 1] || 0) + (on[j + 1] || 0)); } return sum; }
    var P = bestL, phase = 0, pb = -1;
    for (var p = bestL - 1; p <= bestL + 1; p += 0.02) for (var o = 0; o < p; o += 0.5) { var v = comb(p, o); if (v > pb) { pb = v; P = p; phase = o; } }
    var bpm2 = 6000 / P; while (bpm2 < 75) bpm2 *= 2; while (bpm2 > 165) bpm2 /= 2;
    return { bpm: Math.round(bpm2 * 10) / 10, beat0: Math.round(phase * hop / sr * 1000) / 1000 };
  }
  function addOwnMusic(file) {
    if (!file) return;
    stopPreview(); msg('Listening to your music for its beat…');
    file.arrayBuffer().then(function (ab) { return new Promise(function (res, rej) { audioCtx().decodeAudioData(ab, res, rej); }); }).then(function (buf) {
      var b = findBeat(buf), id = 'own';
      S.buffers[id] = buf;
      var tr = { id: id, title: 'Yours: ' + String(file.name || 'music').replace(/\.[^.]+$/, '').slice(0, 24), bpm: b.bpm, beat0: b.beat0, own: true };
      S.tracks = S.tracks.filter(function (t) { return t.id !== id; }).concat([tr]); S.track = tr;
      if (S.P) { changed(); toolAudio(); }
      msg('Your music: about ' + Math.round(b.bpm) + ' beats per minute — the photos will change on its beat. It stays on this phone only.');
    }).catch(function () { msg('This music file could not be read. Try an MP3 or M4A song.'); });
  }
  // ---------- groups by event (styles and templates from the packs say which events they suit) ----------
  var GROUPS = [['all', 'All'], ['haldi', 'Haldi', ['haldi']], ['mehendi', 'Mehendi', ['mehendi']], ['sangeet', 'Sangeet', ['sangeet']], ['baraat', 'Baraat', ['baraat']],
    ['wedding', 'Wedding', ['wedding', 'pheras', 'ceremony', 'muhurtham', 'vidaai']], ['reception', 'Reception', ['reception', 'highlights']], ['cocktail', 'Cocktail', ['cocktail']]];
  function inGroup(x, g) { if (g === 'all') return true; var G = GROUPS.filter(function (r) { return r[0] === g; })[0]; return !!(G && (x.forWhat || []).some(function (f) { return G[2].indexOf(f) > -1; })); }
  // add ?packinfo to the gallery address to see who made each style (G = Gemini, C = ChatGPT) while testing
  var PACKINFO = /[?&]packinfo\b/.test(location.search);
  function label(x) { return x.name + (PACKINFO && x.by ? (x.by === 'gemini' ? ' · G' : x.by === 'chatgpt' ? ' · C' : '') : ''); }
  // ---------- extra styles from /app/packs/reel-styles.json (format: see the helpers' brief) ----------
  var KNOWN = { layouts: LAYOUT_N, trans: { fade: 1, zoomfade: 1, slide: 1, cut: 1, whip: 1, zoom: 1, flash: 1, glitch: 1, iris: 1 }, cards: { kasavu: 1, minimal: 1, bold: 1, film: 1, festive: 1, neon: 1 } };
  var packsP = null;
  function addStyle(x) {
    if (!x || !x.id || TEMPLATES[x.id] || !x.name) return false;
    var c = x.colours || x.colors || {}, hex = function (v, d) { return /^#[0-9a-f]{6}$/i.test(v || '') ? v : d; };
    var lay = (x.layouts || []).filter(function (k) { return KNOWN.layouts[k]; }), tr = (x.trans || []).filter(function (k) { return KNOWN.trans[k]; });
    var beats = (x.beats || []).map(Number).filter(function (b) { return b >= 1 && b <= 8; });
    if (!lay.length || !tr.length || !beats.length) return false;
    var fx = x.fx || {};
    TEMPLATES[x.id] = { name: String(x.name).slice(0, 30), music: x.music || 'road-trip', beats: beats, layouts: lay, trans: tr, card: KNOWN.cards[x.card] ? x.card : 'minimal', frame: !!x.frame,
      fx: { pulse: Math.min(0.05, +fx.pulse || 0), shake: Math.min(16, +fx.shake || 0), flashEvery: +fx.flashEvery || 0, flash: /^\d+,\d+,\d+$/.test(fx.flash || '') ? fx.flash : '255,255,255',
        flashA: Math.min(0.4, +fx.flashA || 0), leak: !!fx.leak, confetti: !!fx.confetti, rgb: !!fx.rgb },
      paper: hex(c.paper, '#F6EFEA'), ink: hex(c.ink, '#2B2522'), gold: hex(c.gold, '#B89A6A'), gold2: hex(c.gold2, hex(c.gold, '#B89A6A')), deep: hex(c.deep, '#7A5C4A'), forWhat: x.for || [], by: x.by || '' };
    ORDER.push(x.id); return true;
  }
  function loadPacks() {
    if (!packsP) packsP = Promise.race([
      fetch('/app/packs/reel-styles.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (list) { (Array.isArray(list) ? list : []).forEach(addStyle); }).catch(function () {}),
      new Promise(function (res) { setTimeout(res, 2500); })   // never wait long for extras
    ]);
    return packsP;
  }
  function open(opt) { return loadPacks().then(function () { return openNow(opt); }); }
  function openNow(opt) {
    if (S && S.wrap) close();
    if (!document.getElementById('rl-css')) document.head.appendChild(el('style', { id: 'rl-css', text: CSS }));
    S = { opt: opt, tid: opt.style && TEMPLATES[opt.style] ? opt.style : 'south', seed: Math.floor(Math.random() * 1e9), T: null, photos: opt.photos.slice(0, 80).map(function (p) { return { id: p.id, on: true }; }), bitmaps: {}, blurs: {}, buffers: {}, vids: {}, thumbs: {},
      names: opt.title || 'Our Wedding', date: opt.date || '', studio: opt.studio || '', length: 30, endCard: true, tracks: [], track: null,
      texts: [], stks: [], filter: 'none', adj: {}, fcss: 'none', t: 0, undo: [], redo: [], group: 'all' };
    S.T = TEMPLATES[S.tid];
    var wrap = el('div', { class: 'rl-wrap', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Reel Edits', 'data-view': 'load' });
    document.body.classList.add('rl-on'); S.wrap = wrap;
    var x = function () { if (S.busy && !confirm('Stop making the reel?')) return; close(); };
    S.canvas = el('canvas', { width: W, height: H, 'aria-label': 'Reel preview' });
    S.ownInput = el('input', { type: 'file', accept: 'audio/*', style: 'display:none' });
    S.ownInput.addEventListener('change', function () { var f = this.files[0]; this.value = ''; addOwnMusic(f); });

    // 1. styles feed
    // categories as tabs over the endless feed (each style says which events it suits)
    var cats = el('div', { class: 're-cats', role: 'tablist' });
    GROUPS.filter(function (g) { return ORDER.some(function (k) { return inGroup(TEMPLATES[k], g[0]); }); }).forEach(function (g) {
      cats.appendChild(el('button', { type: 'button', role: 'tab', class: 're-cat' + ((S.group || 'all') === g[0] ? ' on' : ''), 'data-g': g[0], text: g[1], onclick: function () {
        S.group = g[0]; cats.querySelectorAll('.re-cat').forEach(function (b) { b.classList.toggle('on', b.dataset.g === g[0]); }); showInspo(); } }));
    });
    S.feed = el('div', { class: 're-feed' });
    var inspo = el('div', { class: 're-view re-v-inspo' }, [
      el('div', { class: 're-bar-float' }, [el('div', { class: 're-bar' }, [el('button', { type: 'button', class: 're-ib', 'aria-label': 'Close', text: '×', onclick: x }), el('div', { class: 're-logo', html: LOGO + '<span>Reel Edits</span>' })]), cats]),
      S.feed]);

    // 3. editor
    S.stage = el('div', { class: 're-stage' });
    S.playBtn = el('button', { type: 'button', class: 're-play', 'aria-label': 'Play', html: '&#9654;', onclick: play });
    S.canvas.addEventListener('click', tapPreview); bindTextDrag();
    S.undoBtn = el('button', { type: 'button', class: 're-ib', 'aria-label': 'Undo', html: '&#8630;', onclick: undo });
    S.redoBtn = el('button', { type: 'button', class: 're-ib', 'aria-label': 'Redo', html: '&#8631;', onclick: redo });
    S.timeEl = el('div', { class: 're-time' }, [el('b', { text: '00:00' }), el('span', { text: '00:00' })]);
    S.tl = el('div', { class: 're-tl' }); S.tlIn = el('div', { class: 're-tl-in' }, [el('div', { class: 're-row re-r-fx' }), el('div', { class: 're-row re-r-txt' }), el('div', { class: 're-row re-r-stk' }), el('div', { class: 're-row re-r-aud' }), el('div', { class: 're-row re-r-clip' })]);
    S.tl.appendChild(S.tlIn);
    S.tl.addEventListener('scroll', function () { if (Math.abs(S.tl.scrollLeft - (S.progLeft == null ? -9 : S.progLeft)) < 1.5) return; S.progLeft = null; if (S.raf) stopPreview(); seek(S.tl.scrollLeft / PX, true); }, { passive: true });
    var tools = el('div', { class: 're-tools' });
    [['audio', 'Audio', toolAudio], ['text', 'Text', function () { toolText(); }], ['sticker', 'Drawings', function () { toolSticker(); }], ['filters', 'Filters', toolFilters], ['adjust', 'Adjust', toolAdjust],
      ['style', 'Style', toolStyle], ['length', 'Length', toolLength], ['title', 'Title', toolTitle], ['add', 'Add clip', function () { openPicker({ add: true }); }]].forEach(function (t) {
      tools.appendChild(el('button', { type: 'button', class: 're-tool', 'data-tool': t[0], html: ic(t[0]) + '<span>' + t[1] + '</span>', onclick: function () { stopPreview(); t[2](); } }));
    });
    S.msg = el('p', { class: 'rl-msg', 'aria-live': 'polite' });
    S.edit = el('div', { class: 're-view re-v-edit' }, [
      el('div', { class: 're-bar' }, [el('button', { type: 'button', class: 're-ib', 'aria-label': 'Back to styles', html: ic('left'), onclick: function () { if (confirm('Leave this reel and choose another style?')) { S.P = null; closeSheet(); showInspo(); } } }),
        el('div', { class: 're-logo', html: LOGO + '<span>Reel Edits</span>' }), el('span', { class: 're-q', text: '1080p' }), el('button', { type: 'button', class: 're-next', html: 'Next &#8250;', onclick: goExport })]),
      S.stage,
      el('div', { class: 're-ctl' }, [S.playBtn, S.timeEl, el('div', { class: 're-ur' }, [S.undoBtn, S.redoBtn])]),
      el('div', { class: 're-tlwrap' }, [S.tl, el('i', { class: 're-head' })]),
      S.msg, tools, S.ownInput]);

    // 4. export
    S.expStage = el('div', { class: 're-stage' });
    S.status = el('div', { class: 'rl-status', 'aria-live': 'polite' }, [el('b', { text: '0%' }), el('span', { text: 'Making your reel' }), el('small', { text: 'Keep this screen open' })]);
    S.expStage.appendChild(S.status);
    S.barWrap = el('div', { class: 'rl-bar', style: 'display:none' }); S.bar = el('i'); S.barWrap.appendChild(S.bar);
    S.expMsg = el('p', { class: 'rl-msg on' });
    S.done = el('div', { class: 're-done', style: 'display:none' }, [
      el('button', { type: 'button', class: 'rl-go', text: 'Share (Instagram, WhatsApp…)', onclick: shareResult }),
      el('button', { type: 'button', class: 'rl-sub', text: 'Download video', onclick: downloadResult }),
      el('button', { type: 'button', class: 'rl-sub', text: 'Back to editing', onclick: backToEdit })]);
    var exp = el('div', { class: 're-view re-v-export' }, [
      el('div', { class: 're-bar' }, [el('button', { type: 'button', class: 're-ib', 'aria-label': 'Close', text: '×', onclick: x }), el('div', { class: 're-logo', html: LOGO + '<span>Reel Edits</span>' }), el('span')]),
      S.expStage, el('div', { class: 're-exp-panel' }, [S.barWrap, S.expMsg, S.done])]);
    S.goBtn = el('button'); S.ctrls = el('div');   // kept for the video maker below

    var load = el('div', { class: 're-view re-v-load' }, [el('div', { class: 're-logo re-logo-big', html: LOGO + '<span>Reel Edits</span>' }), el('p', { class: 'rl-msg on', text: 'Getting your photos ready…' })]);
    wrap.append(load, inspo, S.edit, exp);
    document.body.appendChild(wrap);
    audioCtx(); // created on the tap that opened Reel Edits (needed on iPhone)
    var loadMsg = load.querySelector('.rl-msg');
    var fontsReady = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('500 100px "Cormorant Garamond"'), document.fonts.load('500 30px "IBM Plex Mono"')]).catch(function () {}) : Promise.resolve();
    Promise.all([
      fetch('/app/music/tracks.json').then(function (r) { return r.json(); }).catch(function () { return { tracks: [] }; }),
      loadPhotos(S.photos.map(function (p) { return p.id; }), function (d, n) { loadMsg.textContent = 'Getting your photos ready… ' + d + ' / ' + n; }),
      fontsReady
    ]).then(function (r) {
      if (!S || S.wrap !== wrap) return;
      S.tracks = r[0].tracks || []; S.bitmaps = r[1];
      S.track = S.tracks.filter(function (t) { return t.id === S.T.music; })[0] || S.tracks[0] || null;
      S.photos = S.photos.filter(function (p) { return S.bitmaps[p.id]; });
      if (!S.photos.length) { loadMsg.textContent = 'The photos could not be loaded. Check the internet and try again.'; return; }
      if (opt.style && TEMPLATES[opt.style]) { pickStyle(opt.style); openEditor(); } else showInspo();
    }).catch(function (e) { loadMsg.textContent = 'Something went wrong: ' + (e && e.message || e); });
  }
  function close() {
    if (!S) return; stopPreview(); stopLoop(); if (S.io) S.io.disconnect();
    if (S.wrap) S.wrap.remove(); document.body.classList.remove('rl-on');
    if (S.ac && S.ac.close) S.ac.close().catch(function () {});
    if (S.buffers) delete S.buffers.own;   // your own music is let go right away
    freeVideos(); freeUrls(); S = null;    // photos and videos from the phone are let go too — nothing is uploaded or kept
  }
  // the phone's back gesture: one step back inside Reel Edits; true = still open
  function back() {
    if (!S) return false;
    if (S.sheetEl) { closeSheet(); return true; }
    var pk = S.wrap.querySelector('.rl-picker'); if (pk) { var bb = pk.querySelector('.re-ib'); if (bb) bb.click(); else pk.remove(); return !!S; }
    if (S.view === 'export') { if (!S.busy) backToEdit(); return true; }
    if (S.view === 'edit') { var eb = S.wrap.querySelector('.re-v-edit .re-ib'); if (eb) eb.click(); return !!S; }   // asks before leaving the reel
    close(); return false;
  }
  window.PGReel = { back: back, open: open, close: close, styles: ORDER, addStyle: addStyle,
    frame: function (t) { if (S) draw(S.canvas.getContext('2d'), curPlan(), t); return S ? curPlan().dur : 0; },  // used by tests
    setStyle: function (k) { if (S && TEMPLATES[k]) { if (S.view === 'edit' && S.P) applyStyle(k); else pickStyle(k); } },
    state: function () { return S ? { tx: S.tx || {}, names: S.names, date: S.date, textHits: (S.textHits || []).slice(), t: S.t, fxOff: S.fxOff || {}, sound: !!S.inspoSound, soundPlaying: !!S.inspoAud, segs: S.P ? S.P.segs.map(function (g) { return { type: g.type, layout: g.layout, ids: (g.ids || []).slice(), start: g.start, dur: g.dur }; }) : [], view: S.view, style: S.tid, track: S.track, own: !!(S.buffers && S.buffers.own), dur: S.P ? S.P.dur : 0, shots: S.P ? S.P.shots : 0, texts: (S.texts || []).length, stks: (S.stks || []).length, filter: S.filter, undo: (S.undo || []).length } : null; } };
})();
