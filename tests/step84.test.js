// Step 84: the two approved story designs are registered as staff-only free-canvas layouts.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const layouts = JSON.parse(fs.readFileSync(path.join(root, 'app/themes/layouts.json'), 'utf8')).layouts;
const allowedTypes = new Set(['photo', 'names', 'date', 'text', 'events', 'strip', 'action', 'blessings', 'credit', 'shape', 'card']);
const allowedMotions = new Set(['fade', 'rise', 'drop', 'left', 'right', 'grow', 'blur', 'wipe', 'iris', 'unfold', 'shine', 'zoom', 'float']);
const allowedFonts = new Set(['Cormorant Garamond', 'Pinyon Script', 'Marcellus', 'Jost', 'Instrument Serif', 'Parisienne', 'Bodoni Moda', 'Playfair Display', 'Great Vibes', 'Montserrat']);
for (const [id, name, source] of [
  ['canvas-living', 'Living Story (editor)', 'canvas-living.json'],
  ['canvas-editorial', 'Editorial Album (editor)', 'canvas-editorial.json']
]) {
  const item = layouts.find(x => x.id === id);
  assert(item, id + ' is registered');
  assert.strictEqual(layouts.filter(x => x.id === id).length, 1, id + ' is in the list only once');
  assert.strictEqual(item.name, name, id + ' has the approved name');
  assert.strictEqual(item.group, 'progress', id + ' is staff-only / in progress');
  assert.deepStrictEqual(item.blocks, [], id + ' is a free-canvas document, not a block layout');
  const sourceDoc = JSON.parse(fs.readFileSync(path.join(root, 'docs/handover/gemini', source), 'utf8'));
  assert.deepStrictEqual(item.canvas, sourceDoc, id + ' matches the approved Gemini document');
  assert.strictEqual(item.canvas.v, 1, id + ' uses canvas document v1');
  assert(allowedFonts.has(item.canvas.fonts.head) && allowedFonts.has(item.canvas.fonts.body), id + ' uses approved local fonts');
  assert(item.canvas.sections.length > 0 && item.canvas.sections.length <= 24, id + ' has valid sections');
  // the app header (couple badge, dark mode, menu) sits over the top of the first section: no words start under it
  for (const el of item.canvas.sections[0].els) if (['text', 'names', 'date'].includes(el.t)) {
    assert(el.p.y >= 64, id + '/' + el.id + ' starts below the app header on the phone');
    if (el.l) assert(el.l.y >= 88, id + '/' + el.id + ' starts below the app header on the laptop');
  }
  let findme = false;
  for (const sec of item.canvas.sections) {
    assert(sec.h && sec.h.p >= 40 && sec.h.p <= 4000, id + '/' + sec.id + ' has phone section height');
    assert(sec.h.l >= 40 && sec.h.l <= 4000, id + '/' + sec.id + ' has laptop section height');
    assert(Array.isArray(sec.els) && sec.els.length <= 60, id + '/' + sec.id + ' has valid elements');
    for (const el of sec.els) {
      assert(allowedTypes.has(el.t), id + '/' + sec.id + '/' + el.id + ' has a supported element type');
      assert(el.p && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(el.p[k])), id + '/' + el.id + ' has phone placement');
      if (el.l) assert(['x', 'y', 'w', 'h'].every(k => Number.isFinite(el.l[k])), id + '/' + el.id + ' has laptop placement');
      if (el.m) assert(allowedMotions.has(el.m), id + '/' + el.id + ' has supported motion');
      if (el.s && el.s.font) assert(allowedFonts.has(el.s.font), id + '/' + el.id + ' uses an approved font');
      if (el.sl && el.sl.font) assert(allowedFonts.has(el.sl.font), id + '/' + el.id + ' uses an approved laptop font');
      if (el.t === 'action' && el.act === 'findme') findme = true;
      if (el.src) assert(['cover', 'hl', 'ev', 'id', 'auto'].includes(el.src.k), id + '/' + el.id + ' uses a supported photo source');
    }
  }
  assert(findme, id + ' includes the required Find me action');
}
assert(!layouts.some(x => x.id === 'cv-canvas-living' || x.id === 'cv-canvas-editorial'), 'new layout IDs do not use the reserved cv- prefix');
console.log('Step 84: both approved story layouts are registered and valid.');
