// Maakt de schermafbeeldingen van de website opnieuw, in elke taal, uit een echte LANcelot (zoals in de Microsoft Store).
// node website/bron/schermen.js   (start zelf per taal een LANcelot op poort 3999 met een lege demomap uit bron/demo.json)
// Nodig: playwright (npm i -g playwright) en python3 met Pillow om naar webp om te zetten.
'use strict';
const { chromium } = require('playwright');
const io = require('socket.io-client');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const POORT = 3999;
const ADRES = `http://localhost:${POORT}`;
const UIT = path.join(__dirname, '..', 'site', 'shots');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-shots-'));
const DEMO = JSON.parse(fs.readFileSync(path.join(__dirname, 'demo.json'), 'utf8'));
const TALEN = (process.env.TALEN || 'nl en fr es de').split(' ');
const wacht = ms => new Promise(r => setTimeout(r, ms));

// Een demoklas met twee toetsen: één om te proberen zoals een leerling, één met antwoorden om te verbeteren (blok Vandaag).
function vul(data, t) {
  const d = DEMO[t];
  const code = `
    const R = ${JSON.stringify(path.join(ROOT, 'src') + path.sep)};
    const proeven = require(R + 'proeven'), klas = require(R + 'klas');
    const d = ${JSON.stringify(d)}, namen = ${JSON.stringify(DEMO.namen)};
    klas.write({ naam: d.klas, leerjaar: 6, namen });
    const T = d.toets;
    proeven.save(proeven.K.validate({ titel: T.titel, vragen: [
      { type: 'sorteren', vraag: T.sorteren, kolommen: T.kolommen.map(([naam, woorden]) => ({ naam, woorden })), punten: 8 },
      { type: 'meerkeuze', vraag: T.meerkeuze[0], opties: T.meerkeuze[1], juist: 0, punten: 1, blijft: true },
      { type: 'juistfout', vraag: T.juistfout, juist: true, punten: 1, blijft: true },
      { type: 'open', vraag: T.open, punten: 2, blijft: true },
    ] }), 'demo-toets.json');
    const V = d.verbeter;
    const toets = proeven.K.validate({ titel: V.titel, vragen: [{ type: 'kort', vraag: V.kort[0], antwoord: V.kort[1], punten: 1 }, { type: 'open', vraag: V.open, punten: 2 }] });
    proeven.save(toets, 'demo-verbeter.json');
    proeven.bewaarAfname({ title: V.titel, datum: new Date().toISOString(), toets, klaar: false,
      spelers: namen.slice(0, 8).map(naam => ({ naam, antwoorden: {}, auto: { 0: 1 }, hand: {}, events: [] })) });
  `;
  execFileSync(process.execPath, ['-e', code], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, stdio: 'ignore' });
}

const zetTaal = t => new Promise(r => {
  const s = io(ADRES, { query: { role: 'host' } });
  s.on('connect', () => { s.emit('taal-zet', t); setTimeout(() => { s.close(); r(); }, 800); });
});

async function start(data) {
  const env = { ...process.env, LANCELOT_DATA: data, LANCELOT_STORE: '1', PORT: String(POORT) };
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) {
    await wacht(250);
    try { if ((await fetch(ADRES + '/host')).ok) return p; } catch {}
  }
  p.kill(); throw new Error('LANcelot start niet');
}

(async () => {
  const b = await chromium.launch();
  for (const t of TALEN) {
    const data = path.join(TMP, `data-${t}`);
    fs.mkdirSync(data, { recursive: true });
    vul(data, t);
    const server = await start(data);
    try {
      await zetTaal(t);
      const verberg = '#welkom-tip,#eerste-start{display:none!important}';
      const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
      await p.goto(ADRES + '/host'); await p.waitForTimeout(2500);
      await p.addStyleTag({ content: verberg }); await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(TMP, `${t}-host.png`) });
      await p.click('[data-realm=arena]'); await p.waitForTimeout(1000);
      await p.screenshot({ path: path.join(TMP, `${t}-arena.png`) });
      await p.goto(ADRES + '/host'); await p.waitForTimeout(1500);
      await p.addStyleTag({ content: verberg });
      await p.click('[data-realm=smidse]'); await p.waitForTimeout(1000);
      await p.screenshot({ path: path.join(TMP, `${t}-smidse.png`) });
      // Een toets zoals de leerling hem op de Chromebook maakt, met al een paar woorden in hun kolom.
      const c = await b.newPage({ viewport: { width: 1060, height: 662 }, deviceScaleFactor: 1.5 });
      await c.goto(ADRES + '/proef-proberen?scherm=1&file=demo-toets.json'); await c.waitForTimeout(2000);
      for (const [w, k] of DEMO[t].zet) {
        await c.locator('#pf-paper button').filter({ hasText: new RegExp(`^${w}$`) }).first().click(); await c.waitForTimeout(150);
        await c.locator('#pf-paper *').filter({ hasText: new RegExp(`^${k}$`) }).last().click(); await c.waitForTimeout(200);
      }
      await c.mouse.move(5, 5); await c.waitForTimeout(300);
      await c.screenshot({ path: path.join(TMP, `${t}-toets.png`) });
      const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      await m.goto(ADRES + '/'); await m.waitForTimeout(2500);
      await m.screenshot({ path: path.join(TMP, `${t}-gsm.png`) });
      await p.close(); await c.close(); await m.close();
    } finally { server.kill(); await wacht(500); }
  }
  await b.close();
  // Bijsnijden en verkleinen: de Arena en de Smidse enkel de bovenste rij (zo staan er geen andere tegels op).
  execFileSync('python3', ['-c', `
from PIL import Image
S, O = ${JSON.stringify(TMP + '/')}, ${JSON.stringify(UIT + '/')}
for t in ${JSON.stringify(TALEN)}:
  Image.open(S+t+'-host.png').convert('RGB').resize((1200,833),Image.LANCZOS).save(O+t+'-host.webp',quality=78,method=6)
  Image.open(S+t+'-arena.png').convert('RGB').crop((0,0,1440,560)).resize((1200,467),Image.LANCZOS).save(O+t+'-arena.webp',quality=78,method=6)
  Image.open(S+t+'-smidse.png').convert('RGB').crop((0,0,1440,520)).resize((1200,433),Image.LANCZOS).save(O+t+'-smidse.webp',quality=78,method=6)
  Image.open(S+t+'-toets.png').convert('RGB').resize((1200,750),Image.LANCZOS).save(O+t+'-toets.webp',quality=78,method=6)
  Image.open(S+t+'-gsm.png').convert('RGB').resize((390,844),Image.LANCZOS).save(O+t+'-gsm.webp',quality=80,method=6)
`], { stdio: 'inherit' });
  console.log('Schermafbeeldingen staan in website/site/shots.');
})();
