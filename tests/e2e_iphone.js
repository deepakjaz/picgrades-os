// Browser test (step 94): iPhone-first checks in Safari's engine (WebKit).
// Opens the Hub, Events, gallery, photo viewer, Reel Edits, Post Edits,
// the free editor and Control Panel at all three required iPhone sizes.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { call, mail, DRIVE } = require('./gas_mock');

const root = path.join(__dirname, '..');
const FX = path.join(__dirname, 'fixtures');
const files = fs.readdirSync(FX).filter(f => f.endsWith('.jpg'));
const PORT = 8903;
const BASE = 'http://localhost:' + PORT;

// Every made-up Drive folder ID is at least 20 characters long.
const W = 'IPHONE_WEDDING_FOLDER_00000094';
const EVENTS = [
  ['IPHONE_EVENT_HALDI_0000000001', 'Haldi'],
  ['IPHONE_EVENT_SANGEET_00000002', 'Sangeet'],
  ['IPHONE_EVENT_WEDDING_0000003', 'Wedding'],
  ['IPHONE_EVENT_RECEPTION_000004', 'Reception']
];

DRIVE.folders[W] = { name: W, access: 'ANYONE_WITH_LINK' };

EVENTS.forEach(([id, name], eventIndex) => {
  DRIVE.folders[id] = { name, parent: W };

  for (let i = 0; i < 8; i++) {
    const photoId =
      'IPHONE_PHOTO_' +
      String(eventIndex + 1).padStart(2, '0') +
      '_' +
      String(i + 1).padStart(3, '0');

    DRIVE.files[photoId] = {
      name: 'made-up-photo-' + (i + 1) + '.jpg',
      parent: id,
      mime: 'image/jpeg'
    };
  }
});

function login(email) {
  call('requestCode', { email });
  const code = /code: (\d{6})/.exec(mail[mail.length - 1].subject)[1];
  return call('verifyCode', { email, code }).token;
}

const admin = login('adcmediaa@gmail.com');
const queued = call('queue', { token: admin });
const pub = call('setGallery', {
  token: admin,
  orderId: queued.recentDone[0].orderId,
  folderUrl: W,
  title: 'Anika & Rohan',
  eventDate: '2026-12-14'
});

const ck = call('facesStatus', {
  token: admin,
  g: pub.galleryId
}).gallery.coupleKey;

const bytesOf = id => {
  const n = parseInt(String(id).replace(/\D/g, ''), 10) || 0;
  return fs.readFileSync(path.join(FX, files[n % files.length]));
};

global.__fetchBytes = bytesOf;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        res.end(JSON.stringify(call(payload.action, payload)));
      } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ ok: false, error: error.message }));
      }
    });
    return;
  }

  if (req.url === '/app/config.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end("window.PG_CONFIG={apiUrl:'/api'}");
    return;
  }

  let url = req.url.split('?')[0];

  if (/^\/(g|c|ph|pg)\/[a-z0-9]+(\/[A-Za-z0-9_-]+)?$/i.test(url)) {
    url = '/app/gallery.html';
  }

  const file = path.join(root, url);

  fs.readFile(file, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.end();
      return;
    }

    if (url.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
    else if (url.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
    else if (url.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    else res.setHeader('Content-Type', 'text/javascript');

    res.end(data);
  });
});

const sizes = [
  ['iPhone SE / mini', 375, 667],
  ['iPhone 15/16/17', 390, 844],
  ['iPhone Pro Max', 430, 932]
];

const errors = [];
let failures = 0;

function check(condition, message) {
  console.log((condition ? 'ok   ' : 'FAIL ') + message);
  if (!condition) failures++;
}

function photoRoute(page) {
  return page.route('https://lh3.googleusercontent.com/**', route => {
    const match = route.request().url().match(/\/d\/([^=?]+)/);
    const id = match ? match[1] : '';
    route.fulfill({
      contentType: 'image/jpeg',
      body: bytesOf(id)
    });
  });
}

async function makePage(browser, width, height, couple) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  page.on('pageerror', error => {
    errors.push(width + 'x' + height + ': ' + error.message);
  });

  page.on('dialog', dialog => dialog.accept());

  await photoRoute(page);
  await require('./fonts_local').install(page);

  const url = BASE + '/g/' + pub.galleryId +
    (couple ? '?couple=' + encodeURIComponent(ck) + '&viewerstyle=classic'
            : '?viewerstyle=classic');

  await page.goto(url);
  await page.waitForSelector('#pgBoot.hide', {
    state: 'attached',
    timeout: 30000
  });
  await page.waitForTimeout(500);

  return { context, page };
}

// Collect small visible buttons and text. These are warnings only.
async function collectWarnings(page, screenName) {
  return page.evaluate(screenName => {
    const visible = element => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0;
    };

    const findings = [];

    document.querySelectorAll(
      'button, [role="button"], input[type="button"], input[type="submit"]'
    ).forEach(element => {
      if (!visible(element)) return;

      const rect = element.getBoundingClientRect();
      const shortSide = Math.min(rect.width, rect.height);

      if (rect.width < 44 || rect.height < 44) {
        findings.push({
          kind: 'button',
          screen: screenName,
          text: (element.innerText || element.getAttribute('aria-label') || '')
            .trim().replace(/\s+/g, ' ').slice(0, 70),
          width: Math.round(rect.width * 10) / 10,
          height: Math.round(rect.height * 10) / 10,
          deficit: Math.max(44 - rect.width, 44 - rect.height)
        });
      }
    });

    document.querySelectorAll('body *').forEach(element => {
      if (!visible(element)) return;

      const directText = [...element.childNodes]
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join(' ')
        .trim();

      if (!directText) return;

      const fontSize = parseFloat(getComputedStyle(element).fontSize);
      if (!Number.isFinite(fontSize) || fontSize >= 11) return;

      findings.push({
        kind: 'text',
        screen: screenName,
        text: directText.replace(/\s+/g, ' ').slice(0, 70),
        fontSize: Math.round(fontSize * 10) / 10,
        deficit: 11 - fontSize
      });
    });

    return findings;
  }, screenName);
}

async function checkScreen(page, screenName, width, warningRows) {
  const dimensions = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  const noOverflow = dimensions.scrollWidth <= dimensions.innerWidth + 1;

  check(
    noOverflow,
    screenName + ' at ' + width + 'px: no horizontal page overflow' +
      ' (scrollWidth ' + dimensions.scrollWidth +
      ', innerWidth ' + dimensions.innerWidth + ')'
  );

  warningRows.push(...await collectWarnings(page, screenName));
}

async function openHub(browser, width, height, couple, warningRows) {
  const label = couple ? 'Hub — couple' : 'Hub — guest';
  const { context, page } = await makePage(browser, width, height, couple);

  await page.waitForSelector('#view-hub.active', { timeout: 15000 });

  if (couple) {
    check(
      await page.evaluate(() =>
        typeof PGControl !== 'undefined' && PGControl.role() === 'couple'
      ),
      label + ': couple role is active'
    );
  }

  await checkScreen(page, label, width, warningRows);
  await context.close();
}

async function openEvents(browser, width, height, warningRows) {
  const { context, page } = await makePage(browser, width, height, true);

  await page.evaluate(() => switchViewFromNav('gallery'));
  await page.waitForSelector('#view-gallery.active', { timeout: 15000 });
  await page.waitForTimeout(400);

  check(
    await page.locator('#pgGalleryMasonry').count() === 1,
    'Events: gallery list is present'
  );

  await checkScreen(page, 'Events / gallery list', width, warningRows);
  await context.close();
}

async function openEventAndViewer(browser, width, height, warningRows) {
  const { context, page } = await makePage(browser, width, height, true);

  await page.waitForSelector('#pghEvents .pgh-tile', { timeout: 15000 });
  await page.locator('#pghEvents .pgh-tile').first().click();
  await page.waitForTimeout(400);

  await checkScreen(page, 'Event opened from Hub', width, warningRows);

  // GALLERY is a page-level lexical variable, not window.GALLERY.
  const viewerReady = await page.evaluate(() => {
    if (typeof GALLERY === 'undefined' || !GALLERY) return false;
    return !!(
      window.pgViewerClassic &&
      typeof window.pgViewerClassic.open === 'function' &&
      (GALLERY.events || []).some(event =>
        event.photos && event.photos.length > 1
      )
    );
  });

  check(viewerReady, 'Photo viewer: gallery data and viewer are available');

  if (viewerReady) {
    await page.evaluate(() => {
      const event = GALLERY.events.find(
        item => item.photos && item.photos.length > 1
      );
      window.pgViewerClassic.open(event.name, 0);
    });

    await page.waitForSelector('.pgcv-stage', { timeout: 15000 });
    await page.waitForTimeout(250);

    const before = await page.evaluate(() =>
      window.pgViewerClassic.current().i
    );

    // Try a real touch swipe first. If WebKit does not deliver it,
    // use the viewer's own Next button as the supported fallback.
    const swiped = await page.evaluate(() => {
      const stage = document.querySelector('.pgcv-stage');
      if (!stage || typeof Touch !== 'function' ||
          typeof TouchEvent !== 'function') return false;

      const rect = stage.getBoundingClientRect();
      const startX = rect.left + rect.width * 0.75;
      const endX = rect.left + rect.width * 0.25;
      const y = rect.top + rect.height * 0.5;

      try {
        const start = new Touch({
          identifier: 1,
          target: stage,
          clientX: startX,
          clientY: y
        });

        const end = new Touch({
          identifier: 1,
          target: stage,
          clientX: endX,
          clientY: y
        });

        stage.dispatchEvent(new TouchEvent('touchstart', {
          touches: [start],
          targetTouches: [start],
          changedTouches: [start],
          bubbles: true
        }));

        stage.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          targetTouches: [],
          changedTouches: [end],
          bubbles: true
        }));

        return true;
      } catch (error) {
        return false;
      }
    });

    await page.waitForTimeout(300);

    let after = await page.evaluate(() =>
      window.pgViewerClassic.current().i
    );

    if (after === before) {
      await page.locator('.pgcv-next').click();
      await page.waitForTimeout(200);
      after = await page.evaluate(() =>
        window.pgViewerClassic.current().i
      );
    }

    check(
      after === before + 1,
      'Photo viewer: touch swipe or Next button advances to the next photo' +
        (swiped ? ' (touch event attempted)' : ' (Next button fallback)')
    );

    await checkScreen(page, 'Photo viewer', width, warningRows);
  }

  await context.close();
}

async function openReel(browser, width, height, warningRows) {
  const { context, page } = await makePage(browser, width, height, true);

  await page.locator('#pghReel').click();
  await page.waitForSelector('.rl-wrap[data-view=inspo]', {
    timeout: 30000
  });

  check(
    await page.locator('.rl-wrap[data-view=inspo]').count() === 1,
    'Reel Edits: opening screen is present'
  );

  await checkScreen(page, 'Reel Edits', width, warningRows);
  await context.close();
}

async function openPost(browser, width, height, warningRows) {
  const { context, page } = await makePage(browser, width, height, true);

  await page.locator('#pgcPost').click();
  await page.waitForSelector('.pe-wrap[data-view=pick]', {
    timeout: 30000
  });

  check(
    await page.locator('.pe-wrap[data-view=pick]').count() === 1,
    'Post Edits: opening screen is present'
  );

  await checkScreen(page, 'Post Edits', width, warningRows);
  await context.close();
}

async function openFreeEditor(browser, width, height, warningRows) {
  const { context, page } = await makePage(browser, width, height, true);

  await page.evaluate(() => {
    if (typeof PGCanvasEditor === 'undefined') {
      throw new Error('PGCanvasEditor is not available');
    }
    PGCanvasEditor.open('canvas-quiet');
  });

  await page.waitForSelector('.pce .pgc-sec', { timeout: 20000 });
  await page.waitForTimeout(400);

  const selected = await page.evaluate(() => {
    if (typeof PGCanvasEditor === 'undefined') return false;

    const state = PGCanvasEditor.state();
    if (!state || !state.doc || !state.doc.sections.length) return false;

    const part = state.doc.sections
      .flatMap(section => section.els)
      .find(element => !(element.p && element.p.hide));

    if (!part) return false;

    PGCanvasEditor.select(part.id);
    return !!PGCanvasEditor.state().sel;
  });

  check(selected, 'Free editor: a part is selected');

  const visibility = await page.evaluate(() => {
    const preview = document.querySelector('.pce-page');
    if (!preview) return { missing: true, visible: 0 };

    const rect = preview.getBoundingClientRect();
    const x0 = Math.max(0, rect.left);
    const y0 = Math.max(0, rect.top);
    const x1 = Math.min(innerWidth, rect.right);
    const y1 = Math.min(innerHeight, rect.bottom);

    if (x1 <= x0 || y1 <= y0) {
      return { missing: false, visible: 0 };
    }

    let visible = 0;
    let total = 0;

    // Same 24 × 24 elementFromPoint sampling method as overlay-audit.js.
    for (let row = 0; row < 24; row++) {
      for (let col = 0; col < 24; col++) {
        const x = x0 + (col + 0.5) * (x1 - x0) / 24;
        const y = y0 + (row + 0.5) * (y1 - y0) / 24;
        const hit = document.elementFromPoint(x, y);
        total++;

        if (hit && (preview === hit || preview.contains(hit))) {
          visible++;
        }
      }
    }

    return {
      missing: false,
      visible: Math.round(visible / total * 100),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  });

  console.log(
    'DESIGN VISIBLE — ' + width + 'px: ' + JSON.stringify(visibility)
  );

  await checkScreen(page, 'Free editor — part selected', width, warningRows);
  await context.close();
}

async function openControlPanel(browser, width, height, warningRows) {
  const { context, page } = await makePage(browser, width, height, true);

  await page.evaluate(() => {
    if (typeof PGControl === 'undefined') {
      throw new Error('PGControl is not available');
    }
    PGControl.open();
  });

  await page.waitForSelector('.pgcp-sheet', { timeout: 15000 });

  check(
    await page.locator('.pgcp-sheet').count() === 1,
    'Control Panel: panel is open'
  );

  await checkScreen(page, 'Control Panel', width, warningRows);
  await context.close();
}

function printWarnings(width, rows) {
  const worst = rows
    .sort((a, b) => b.deficit - a.deficit)
    .slice(0, 5);

  console.log('\nWARNINGS — ' + width + 'px viewport — worst 5');

  if (!worst.length) {
    console.log('None. No visible buttons or text below the size rules.');
    return;
  }

  worst.forEach((item, index) => {
    if (item.kind === 'button') {
      console.log(
        (index + 1) + '. WARN button — ' + item.screen +
        ' — ' + JSON.stringify(item.text) +
        ' — ' + item.width + ' × ' + item.height + ' px'
      );
    } else {
      console.log(
        (index + 1) + '. WARN text — ' + item.screen +
        ' — ' + JSON.stringify(item.text) +
        ' — ' + item.fontSize + ' px'
      );
    }
  });
}

async function run() {
  const { webkit } = require('playwright');
  const browser = await webkit.launch();

  try {
    for (const [name, width, height] of sizes) {
      console.log(
        '\n========== ' + name + ' (' + width + ' × ' + height + ') =========='
      );

      const warningRows = [];

      await openHub(browser, width, height, false, warningRows);
      await openHub(browser, width, height, true, warningRows);
      await openEvents(browser, width, height, warningRows);
      await openEventAndViewer(browser, width, height, warningRows);
      await openReel(browser, width, height, warningRows);
      await openPost(browser, width, height, warningRows);
      await openFreeEditor(browser, width, height, warningRows);
      await openControlPanel(browser, width, height, warningRows);

      printWarnings(width, warningRows);
    }
  } finally {
    await browser.close();
  }

  console.log('\npage errors: ' + JSON.stringify(errors));

  check(errors.length === 0, 'no page errors');

  console.log(
    failures ? '\n' + failures + ' check(s) failed.' : '\nAll iPhone checks passed.'
  );

  process.exitCode = failures ? 1 : 0;
  server.close();
}

server.listen(PORT, '127.0.0.1', () => {
  run().catch(error => {
    console.error(error);
    console.log('page errors: ' + JSON.stringify(errors));
    process.exitCode = 1;
    server.close();
  });
});
