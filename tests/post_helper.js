// Shared steps for Post Edits (step 25): New post → edit → share.
exports.toEdit = async (pg, mode) => {
  await pg.click('#pgcPost'); await pg.waitForSelector('.pe-wrap[data-view=pick]', { timeout: 30000 });
  if (mode === 'album') await pg.click('.pe-tab[data-mode=album]');
  await pg.click('.pe-v-pick .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=edit]', { timeout: 30000 });
  await pg.waitForFunction(() => PGPost.info(), null, { timeout: 20000 }); await pg.waitForTimeout(400);
};
exports.tool = (pg, name) => pg.click('.pe-tool[data-tool=' + name + ']');
exports.done = async (pg) => { if (await pg.isVisible('.pe-sheet .pe-done')) await pg.click('.pe-sheet .pe-done'); if (await pg.isVisible('.pe-pop .pe-done')) await pg.click('.pe-pop .pe-done'); };
exports.template = async (pg, name, group) => {   // step 29: a grid of small pictures with category tabs
  await pg.click('.pe-tool[data-tool=template]');
  if (group) await pg.locator('.pe-sheet .ps-chip', { hasText: new RegExp('^' + group + '$') }).first().click();
  await pg.locator('.pe-sheet .pe-tpl', { hasText: name }).first().click(); await pg.waitForTimeout(400); await exports.done(pg);
};
exports.drawings = async (pg) => { await pg.click('.pe-tool[data-tool=sticker]'); await pg.waitForSelector('.ps-sgrid'); };   // opens the collection straight away (step 29)
exports.tapPhoto = async (pg, k) => {
  const info = await pg.evaluate(() => PGPost.info()), h = info.hits[k || 0], r = await pg.locator('.pe-stage canvas').boundingBox();
  await pg.mouse.click(r.x + (h.x + h.w / 2) / info.W * r.width, r.y + (h.y + h.h / 2) / info.H * r.height); await pg.waitForTimeout(300);
  return { x: r.x + (h.x + h.w / 2) / info.W * r.width, y: r.y + (h.y + h.h / 2) / info.H * r.height };
};
exports.toShare = async (pg) => { await exports.done(pg); await pg.click('.pe-v-edit .pe-next'); await pg.waitForSelector('.pe-wrap[data-view=share]'); await pg.waitForTimeout(300); };
