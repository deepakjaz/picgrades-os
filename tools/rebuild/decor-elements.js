// Draws the decorations of the rebuilt story templates (step 99b) as transparent PNGs; tools/rebuild/story-canvas.py places them.
// Run from a folder of your own: node tools/rebuild/decor-elements.js, then convert to WebP into app/elements/decor/.
// draws each decoration (SVG) to a transparent PNG
const { chromium } = require('playwright');
const blob = (cx, cy, r, seed, k = 9, j = .28) => { let s = seed * 9301; const R = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; const pts = []; for (let i = 0; i < k; i++) { const a = 2 * Math.PI * i / k, rr = r * (1 + (R() * 2 - 1) * j); pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
  let d = ''; for (let i = 0; i < k; i++) { const a = pts[i], b = pts[(i + 1) % k], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; d += i ? `Q${a[0].toFixed(1)},${a[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)} ` : `M${m[0].toFixed(1)},${m[1].toFixed(1)} `; }
  const a = pts[0], m = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]; return d + `Q${a[0].toFixed(1)},${a[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}Z`; };
const cloud = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r}" cy="${y + 10}" r="${r * .8}" fill="#fff"/><circle cx="${x - r}" cy="${y + 14}" r="${r * .7}" fill="#fff"/>`;
const ART = {
  'dc-cloud': [460, 260, `<g opacity=".96">${cloud(230, 130, 90)}</g>`],
  'dc-cloud-soft': [460, 260, `<g opacity=".7" filter="url(#b)">${cloud(230, 130, 90)}</g><defs><filter id="b"><feGaussianBlur stdDeviation="6"/></filter></defs>`],
  'dc-mountains-far': [1200, 400, `<path d="M0,190 L240,40 L460,140 L700,0 L940,120 L1200,40 V400 H0Z" fill="#5D6C70" opacity=".55"/>`],
  'dc-mountains-near': [1200, 380, `<path d="M0,170 L340,30 L620,130 L900,30 L1200,110 V380 H0Z" fill="#1E3A2C"/>`],
  'dc-drop-yellow': [240, 240, `<path d="${blob(120, 120, 95, 4)}" fill="#E8B931"/>`],
  'dc-drop-pink': [240, 240, `<path d="${blob(120, 120, 95, 7)}" fill="#E46E8C"/>`],
  'dc-drop-green': [240, 240, `<path d="${blob(120, 120, 95, 3)}" fill="#55623A"/>`],
  'dc-splash-ring': [320, 320, `<path d="${blob(160, 160, 138, 2)}" fill="none" stroke="#E8B931" stroke-width="12" opacity=".8"/>`],
  'dc-gold-glow': [500, 500, `<defs><radialGradient id="g"><stop offset="0" stop-color="#D8C197" stop-opacity=".55"/><stop offset=".7" stop-color="#D8C197" stop-opacity="0"/></radialGradient></defs><circle cx="250" cy="250" r="250" fill="url(#g)"/>`],
  'dc-gold-dust': [600, 600, Array.from({ length: 40 }, (_, i) => { const x = (i * 137.5) % 600, y = (i * 83.3 + i * i * 7) % 600, r = 1 + (i % 4) * .8; return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r}" fill="#D8C197" opacity="${.35 + (i % 5) * .12}"/>`; }).join('')],
  'dc-iris-ring': [600, 600, `<circle cx="300" cy="300" r="296" fill="none" stroke="#D8C197" stroke-width="3" opacity=".55"/>`],
  'dc-keyhole-arch': [300, 460, `<path d="M20,455 V170 A130,130 0 0 1 280,170 V455" fill="none" stroke="#B8925A" stroke-width="2.5"/><path d="M40,455 V178 A110,110 0 0 1 260,178 V455" fill="none" stroke="#B8925A" stroke-width="1" opacity=".6"/>`],
  'dc-lattice': [400, 120, Array.from({ length: 8 }, (_, i) => `<path d="M${i * 50 + 25},10 l20,50 l-20,50 l-20,-50z" fill="none" stroke="#B8925A" stroke-width="1.4" opacity=".7"/>`).join('')],
  'dc-mist': [800, 400, `<defs><radialGradient id="m" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffffff" stop-opacity=".92"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><ellipse cx="400" cy="200" rx="400" ry="200" fill="url(#m)"/>`],
  'dc-tea-hills': [1200, 360, `<path d="M0,180 C200,90 380,200 600,120 C820,40 1000,170 1200,100 V360 H0Z" fill="#8C9E90" opacity=".5"/><path d="M0,250 C220,170 420,280 640,210 C860,140 1020,250 1200,200 V360 H0Z" fill="#4B6B56" opacity=".75"/>` + Array.from({ length: 14 }, (_, i) => `<path d="M0,${270 + i * 7} C300,${230 + i * 7} 600,${300 + i * 7} 1200,${250 + i * 7}" fill="none" stroke="#18261E" stroke-opacity=".12" stroke-width="2"/>`).join('')],
  'dc-hairline-frame': [400, 520, `<rect x="6" y="6" width="388" height="508" fill="none" stroke="#8E795E" stroke-width="1.5"/><rect x="22" y="22" width="356" height="476" fill="none" stroke="#8E795E" stroke-width=".8" opacity=".6"/>`]
};
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ deviceScaleFactor: 2 });
  for (const [id, [w, h, svg]] of Object.entries(ART)) {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svg}</svg></body></html>`);
    await p.screenshot({ path: id + '.png', omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
  }
  await b.close(); console.log(Object.keys(ART).length, 'drawn');
})();
