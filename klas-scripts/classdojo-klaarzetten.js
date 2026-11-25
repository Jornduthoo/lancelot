// Zet de weekplanner klaar als Class Story in ClassDojo (drukt NOOIT op Post; Jorn doet dat zelf).
// Gebruik:  node classdojo-klaarzetten.js inloggen                 (eenmalig, Jorn logt zelf in)
//           node classdojo-klaarzetten.js klaar <planner.jpg> ["tekst"] [--verken]
// Eigen profielmap (raakt Jorns Chrome niet aan). Playwright wordt gezocht in ..\bingel\node_modules.
// Het venster blijft open tot Jorn het sluit; Post-knop = Jorn. Eén eindscreenshot in logs\.
'use strict';
const fs = require('fs'), path = require('path'), { createRequire } = require('module');
const PROFIEL = path.join(process.env.APPDATA || process.env.HOME, 'claude-classdojo-profiel');
const LOGS = path.join(__dirname, 'logs'); fs.mkdirSync(LOGS, { recursive: true });
const KLAS = /Zesde leerjaar 2026-2027/i;
const TEKST = 'Hierbij de nieuwe weekplanner. Prettig weekend!';
const req = createRequire(path.join(__dirname, '..', 'bingel', 'x.js'));
const { chromium } = (() => { try { return require('playwright'); } catch { return req('playwright'); } })();
const log = m => { const r = `${new Date().toISOString()} ${m}`; console.log(r); fs.appendFileSync(path.join(LOGS, 'classdojo.log'), r + '\n'); };

(async () => {
  const [, , cmd, jpg, tekstArg] = process.argv;
  const verken = process.argv.includes('--verken');
  const ctx = await chromium.launchPersistentContext(PROFIEL, { channel: 'chrome', headless: false, viewport: { width: 1400, height: 900 } });
  const page = ctx.pages()[0] || await ctx.newPage();
  const gesloten = new Promise(ok => ctx.on('close', ok));
  await page.goto('https://teach.classdojo.com/');
  if (cmd === 'inloggen') { log('Log in in het venster; sluit het daarna.'); return gesloten; }
  if (cmd !== 'klaar' || !jpg || !fs.existsSync(jpg)) { log('Gebruik: inloggen | klaar <planner.jpg>'); await ctx.close(); return; }
  try {
    await page.waitForLoadState('networkidle').catch(() => {});
    if (/login|signin/i.test(page.url())) throw new Error('ClassDojo is uitgelogd: eerst "inloggen" laten doen door Jorn.');
    const klas = page.getByText(KLAS).first();
    if (await klas.count()) await klas.click().catch(() => {});
    await page.waitForTimeout(2500);
    // Class Story openen
    const story = page.getByText(/class story/i).first();
    if (await story.count()) await story.click().catch(() => {});
    await page.waitForTimeout(2500);
    // Bestaat de post al? (bijschrift of bestandsnaam van planner)
    const al = await page.getByText(/nieuwe weekplanner|new weekly planner/i).count();
    if (al && !verken) log('LET OP: er lijkt al een weekplanner-post te staan; controleer zelf voor je post.');
    // Photo/Video-dialoog
    const knop = page.getByRole('button', { name: /photo|video|foto/i }).first();
    if (await knop.count()) await knop.click().catch(() => {});
    await page.waitForTimeout(1500);
    const inp = page.locator('input[type=file]').first();
    await inp.setInputFiles(path.resolve(jpg));
    await page.waitForTimeout(3000);
    const vak = page.locator('textarea, [contenteditable=true], input[type=text]').filter({ visible: true }).first();
    if (await vak.count()) { await vak.click(); await page.keyboard.type(tekstArg && !tekstArg.startsWith('--') ? tekstArg : TEKST); }
    else log('Tekstvak niet gevonden; typ de tekst zelf.');
    const foto = path.join(LOGS, 'klaargezet.png'); await page.screenshot({ path: foto });
    log('Klaargezet, NIET gepost. Controle-screenshot: ' + foto);
  } catch (e) {
    log('FOUT: ' + e.message); await page.screenshot({ path: path.join(LOGS, 'fout.png') }).catch(() => {});
  }
  await gesloten;   // venster blijft open voor Jorn (Post-knop)
})();
