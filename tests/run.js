// Runs every test, one after another, and says clearly which passed. Usage: npm test   (or: npm run test:quick for the fast ones)
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const quick = process.argv.includes('--quick');
const dir = __dirname;
const unit = fs.readdirSync(dir).filter(f => /\.test\.js$/.test(f)).sort();
const browser = quick ? [] : fs.readdirSync(dir).filter(f => /^e2e_.*\.js$/.test(f)).sort();
let failed = [];
for (const f of unit.concat(browser)) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 600000, env: process.env });
  const out = (r.stdout || '') + (r.stderr || '');
  const e2e = f.startsWith('e2e_');
  const ok = r.status === 0 && !/^FAIL|\bFAIL\b/m.test(out) && !/Error: (Timeout|page\.)|TypeError|ReferenceError/.test(out) && (!e2e || /page errors: \[\]/.test(out));
  console.log((ok ? 'PASS ' : 'FAIL ') + f + '  (' + Math.round((Date.now() - t0) / 1000) + ' s)');
  if (!ok) { failed.push(f); console.log(out.split('\n').filter(l => /FAIL|Error|page errors/.test(l)).slice(0, 8).map(l => '     ' + l).join('\n')); }
}
console.log(failed.length ? '\n' + failed.length + ' test file(s) failed: ' + failed.join(', ') : '\nAll ' + (unit.length + browser.length) + ' test files passed.');
process.exit(failed.length ? 1 : 0);
