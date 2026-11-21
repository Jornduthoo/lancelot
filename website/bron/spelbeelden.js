// Maakt de beelden van een spelpagina (website/site/beelden/<taal>/<id>-bord|cb|gsm.webp) uit een echte LANcelot:
// het bord, een Chromebook en een gsm spelen mee met een paar proefleerlingen die (meestal juist) antwoorden.
// node website/bron/spelbeelden.js kegelridder drakenjacht   (TALEN="nl en" om minder talen te doen)
// Nodig: playwright en python3 met Pillow. Start zelf per taal een LANcelot op poort 3998 met een lege demomap.
'use strict';
const { chromium } = require('playwright');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const POORT = 3998;
const ADRES = `http://localhost:${POORT}`;
const UIT = path.join(__dirname, '..', 'site', 'beelden');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-spelbeelden-'));
const DEMO = JSON.parse(fs.readFileSync(path.join(__dirname, 'demo.json'), 'utf8'));
const TALEN = (process.env.TALEN || 'nl en fr es de').split(' ');
const wacht = ms => new Promise(r => setTimeout(r, ms));
const PIJLEN = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const LOPEN = { hold: PIJLEN, tap: [' ', 'e'], tapP: 0.3 };
// Per spel: de pagina, het voorvoegsel van de socket-berichten en welke toetsen de proefleerlingen indrukken.
const SPELLEN = {
  drakenjacht: { route: '/cybergalaga', pf: 'cg', keys: { hold: ['ArrowLeft', 'ArrowRight'], tap: [' '], tapP: 0.7 } },
  doolhofridder: { route: '/packnight', pf: 'pk', keys: LOPEN },
  kruitridder: { route: '/bomberknight', pf: 'bk', keys: LOPEN },
  schaduwburcht: { route: '/gauntlet', pf: 'gt', keys: { hold: PIJLEN, tap: [' '], tapP: 0.5 } },
  kegelridder: { route: '/kegelridder', pf: 'kb', keys: { hold: [], tap: [' '], tapP: 0.25 } },
};
const NAMEN = ['Noor', 'Lucas', 'Emma', 'Milan', 'Lina', 'Adam'];

// Draait in elke leerlingpagina: meldt aan, antwoordt meestal juist en speelt met de toetsen.
function bot({ juist, keys, naam }) {
  const zichtbaar = el => el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
  const druk = (type, key) => {
    const code = key === ' ' ? 'Space' : key.length === 1 ? `Key${key.toUpperCase()}` : key;
    for (const doel of [document.body, window]) doel.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true }));
  };
  const vast = new Set();
  let binnen = false, laatst = 0;
  setInterval(() => {
    if (!binnen) {
      const veld = [...document.querySelectorAll('input[maxlength="20"]')].find(zichtbaar);
      if (veld) { veld.value = naam; veld.dispatchEvent(new Event('input', { bubbles: true })); const f = veld.closest('form'); if (f) f.requestSubmit(); binnen = true; }
      return;
    }
    const keuze = [...document.querySelectorAll('.ar-pick button')].filter(b => zichtbaar(b) && !b.disabled);
    if (keuze.length) return keuze[Math.floor(Math.random() * keuze.length)].click();
    const knoppen = [...document.querySelectorAll('.answers button, .answers .answer')].filter(b => zichtbaar(b) && !b.disabled);
    if (knoppen.length >= 2) {
      if (Date.now() - laatst < 1200) return;
      for (const k of vast) druk('keyup', k);
      vast.clear();
      const n = t => t.replace(/\s+/g, ' ').trim().toLowerCase();
      const goed = knoppen.find(b => juist.some(j => n(b.textContent).endsWith(n(j))));
      (goed && Math.random() < 0.9 ? goed : knoppen[Math.floor(Math.random() * knoppen.length)]).click();
      laatst = Date.now();
      return;
    }
    if (keys.hold.length && Math.random() < 0.35) {
      for (const k of vast) druk('keyup', k);
      vast.clear();
      const k = keys.hold[Math.floor(Math.random() * keys.hold.length)];
      vast.add(k); druk('keydown', k);
    }
    for (const k of keys.tap) if (Math.random() < keys.tapP) { druk('keydown', k); setTimeout(() => druk('keyup', k), 60); }
  }, 180);
}

async function start(data) {
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data, PORT: String(POORT) }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    await wacht(250);
    try { if ((await fetch(ADRES + '/host')).ok) return p; } catch {}
  }
  p.kill(); throw new Error('LANcelot start niet');
}

(async () => {
  const ids = process.argv.slice(2);
  if (!ids.length || ids.some(id => !SPELLEN[id])) throw new Error(`Kies uit: ${Object.keys(SPELLEN).join(' ')}`);
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const t of TALEN) {
    const data = path.join(TMP, `data-${t}`);
    fs.mkdirSync(path.join(data, 'quizzes'), { recursive: true });
    fs.writeFileSync(path.join(data, 'quizzes', 'demo-quiz.json'), JSON.stringify(DEMO[t].quiz));
    const juist = DEMO[t].quiz.questions.map(q => q.answers[q.correct]);
    const server = await start(data);
    try {
      const host = await b.newPage();
      await host.goto(ADRES + '/host'); await host.waitForTimeout(800);
      await host.evaluate(t => socket.emit('taal-zet', t), t); await host.waitForTimeout(800); await host.close();
      for (const id of ids) {
        const g = SPELLEN[id];
        const ctxs = [];
        const bord = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
        ctxs.push(bord.context());
        await bord.goto(ADRES + g.route); await bord.waitForTimeout(1500);
        console.log(t, id, JSON.stringify(await bord.evaluate(({ pf }) => new Promise(r => {
          socket.emit(`${pf}-stop`, null, () => {});
          setTimeout(() => socket.emit(`${pf}-load`, { file: 'demo-quiz.json', minutes: 5 }, r), 300);
        }), g)));
        const leerling = async (opties, naam) => {
          const ctx = await b.newContext(opties); ctxs.push(ctx);
          const p = await ctx.newPage();
          await p.goto(ADRES + '/'); await p.waitForTimeout(700);
          await p.evaluate(bot, { juist, keys: g.keys, naam });
          return p;
        };
        const cb = await leerling({ viewport: { width: 1366, height: 768 } }, NAMEN[0]);
        const gsm = await leerling({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, NAMEN[1]);
        for (const n of NAMEN.slice(2)) await leerling({ viewport: { width: 400, height: 300 } }, n);
        await bord.waitForTimeout(2500);
        await bord.evaluate(({ pf }) => socket.emit(`${pf}-start`, null, () => {}), g);
        await bord.waitForTimeout(Number(process.env.SECONDEN || 17) * 1000);
        const dir = path.join(TMP, t);
        fs.mkdirSync(dir, { recursive: true });
        await bord.screenshot({ path: path.join(dir, `${id}-bord.png`) });
        await cb.screenshot({ path: path.join(dir, `${id}-cb.png`) });
        await gsm.screenshot({ path: path.join(dir, `${id}-gsm.png`) });
        await bord.evaluate(({ pf }) => new Promise(r => { socket.emit(`${pf}-stop`, null, () => r()); setTimeout(r, 1500); }), g);
        for (const c of ctxs) await c.close();
      }
    } finally { server.kill(); await wacht(500); }
  }
  await b.close();
  execFileSync('python3', ['-c', `
from PIL import Image
S, O = ${JSON.stringify(TMP + '/')}, ${JSON.stringify(UIT + '/')}
for t in ${JSON.stringify(TALEN)}:
  for g in ${JSON.stringify(ids)}:
    for v, size, q in (('bord', (960, 540), 55), ('cb', (800, 450), 55), ('gsm', (270, 585), 58)):
      Image.open(S+t+'/'+g+'-'+v+'.png').convert('RGB').resize(size, Image.LANCZOS).save(O+t+'/'+g+'-'+v+'.webp', quality=q, method=6)
`], { stdio: 'inherit' });
  console.log(`Beelden staan in website/site/beelden (${TMP} heeft de grote png's). Bouw daarna de site: node website/bron/bouw.js`);
})();
