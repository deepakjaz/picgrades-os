// Shared steps for the Reel Edits screens (step 22): styles feed → Use template → photo picker → editor → export.
exports.toEditor = async (pg, style) => {
  await pg.waitForSelector('.rl-wrap[data-view=inspo]', { timeout: 30000 });
  await pg.locator(style ? '.re-ins[data-style="' + style + '"] .re-use' : '.re-ins .re-use').first().click();
  await pg.waitForSelector('.rl-picker'); await pg.waitForTimeout(300);
  if (await pg.$eval('.rl-picker .re-next', b => b.disabled)) {   // the Hub reel starts with nothing chosen (step 28): choose 12
    const n = Math.min(12, await pg.locator('.rl-picker .rl-pick').count()); for (let k = 0; k < n; k++) await pg.locator('.rl-picker .rl-pick').nth(k).click();
  }
  await pg.click('.rl-picker .re-next');
  await pg.waitForSelector('.rl-wrap[data-view=edit]', { timeout: 30000 }); await pg.waitForTimeout(600);
};
exports.setLength = async (pg, label) => {
  await pg.click('.re-tool[data-tool=length]'); await pg.locator('.re-sheet .rl-chip', { hasText: label }).click(); await pg.click('.re-sh-done');
};
exports.exportReel = async (pg, timeout) => {
  await pg.click('.re-v-edit .re-next'); await pg.waitForSelector('.re-v-export video', { timeout: timeout || 90000 });
  return pg.textContent('.re-v-export .rl-msg');
};
exports.videoInfo = (pg) => pg.evaluate(() => new Promise(res => { const v = document.querySelector('.re-v-export video'); const go = () => res([v.videoWidth, v.videoHeight, Math.round(v.duration * 10) / 10]); if (v.readyState >= 1 && isFinite(v.duration)) go(); else { v.onloadedmetadata = go; setTimeout(go, 4000); } }));
