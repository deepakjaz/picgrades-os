// For screenshots only: answers Google Fonts requests from local Fontsource copies when /tmp/fontsrc exists (no internet in the test box).
const fs = require('fs'), path = require('path');
const ROOT = '/tmp/fontsrc/node_modules/@fontsource';
exports.install = async (pg) => {
  if (!fs.existsSync(ROOT)) return false;
  await pg.route('https://fonts.googleapis.com/**', r => {
    const u = new URL(r.request().url()); let css = '';
    u.searchParams.getAll('family').forEach(f => {
      const name = f.split(':')[0], pkg = name.toLowerCase().replace(/ /g, '-'), dir = path.join(ROOT, pkg, 'files'); if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir).filter(x => /^.*-latin-\d+-(normal|italic)\.woff2$/.test(x)).forEach(x => {
        const m = x.match(/-latin-(\d+)-(normal|italic)\.woff2$/);
        css += `@font-face{font-family:'${name}';font-style:${m[2]};font-weight:${m[1]};font-display:swap;src:url(https://fonts.gstatic.com/local/${pkg}/${x}) format('woff2')}\n`;
      });
    });
    r.fulfill({ contentType: 'text/css', body: css });
  });
  await pg.route('https://fonts.gstatic.com/local/**', r => { const p = new URL(r.request().url()).pathname.split('/').slice(2); r.fulfill({ contentType: 'font/woff2', body: fs.readFileSync(path.join(ROOT, p[0], 'files', p[1])) }); });
  return true;
};
