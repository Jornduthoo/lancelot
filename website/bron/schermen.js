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
function vul(data, t, blad) {
  const d = DEMO[t];
  const code = `
    const BLAD = ${JSON.stringify(blad)};
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
    // Een blad met meetkunde en rekenen (kleurveld, veelhoek op stippen, rekenrooster) en drie vragen voor de galerij.
    proeven.save(proeven.K.validate({ titel: d.blad.toets, vragen: [{ type: 'blad', beeld: BLAD, verhouding: 0.56, velden: [
      { soort: 'kleur', x: 5, y: 20, w: 70, h: 10, kol: 10, rij: 1, kleuren: [{ kleur: 'rood', aantal: '3/5' }] },
      { soort: 'veelhoek', x: 5, y: 43, w: 42, h: 53, kol: 8, rij: 6, figuur: 'rechthoek' },
      { soort: 'rooster', x: 53, y: 43, w: 40, h: 38, kol: 6, rij: 3, nakijk: 'uitkomst', uitkomst: '3845' },
    ] }] }), 'demo-blad.json');
    const L = d.taal;
    proeven.save(proeven.K.validate({ titel: L.toets, vragen: [
      { type: 'markeren', vraag: L.markeren, kleuren: [{ kleur: 'geel', uitleg: L.kleuren[0] }, { kleur: 'groen', uitleg: L.kleuren[1] }], tekst: L.tekst },
      { type: 'groeperen', vraag: L.groeperen, groepen: [['1/2', '2/4', '50%'], ['1/4', '25%', L.komma], ['3/4', '75%', '6/8']], blijft: true },
      { type: 'getallenas', vraag: L.getallenas, min: '0', max: '2', stap: '0.25', antwoord: '0.75', breuk: true, getallen: 'alle', blijft: true },
    ] }), 'demo-taal.json');
    require(R + 'oefenbladen').save(d.oefenblad, 'demo-oefenblad.json');
  `;
  execFileSync(process.execPath, ['-e', code], { cwd: ROOT, env: { ...process.env, LANCELOT_DATA: data }, stdio: 'ignore' });
}

// De pagina van het meetkundeblad (zoals een eigen toets-pdf), als beeld.
async function bladBeeld(b, B) {
  const p = await b.newPage({ viewport: { width: 1200, height: 672 } });
  const regel = (x, y, nr, tekst) => `<div style="position:absolute;left:${x}px;top:${y}px;font-size:26px"><b>${nr}</b>&nbsp; ${tekst}</div>`;
  await p.setContent(`<body style="margin:0;width:1200px;height:672px;background:#fff;font-family:'DejaVu Sans',Arial,sans-serif;color:#222">
    <div style="position:absolute;left:60px;top:18px;font-size:32px;font-weight:bold">${B.titel}</div>
    <div style="position:absolute;left:60px;top:64px;width:1080px;border-top:2px solid #333"></div>
    ${regel(60, 84, 1, B.o[0])}${regel(60, 228, 2, B.o[1])}${regel(640, 228, 3, B.o[2])}</body>`);
  const jpg = await p.screenshot({ type: 'jpeg', quality: 85 });
  await p.close();
  return 'data:image/jpeg;base64,' + jpg.toString('base64');
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

let TAAL = 'nl';
const png = naam => path.join(TMP, `${TAAL}-${naam}.png`);
const vak = async (p, sel) => p.locator(sel).first().boundingBox();
const klikTekst = async (p, sel, tekst) => p.locator(sel).filter({ hasText: new RegExp(`^${tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).first().click();

// Toetsen zoals de leerling ze ziet, deels ingevuld: het meetkundeblad, aanduiden in kleur, groeperen en de getallenas.
async function toetsGalerij(b, t) {
  let c = await b.newPage({ viewport: { width: 1060, height: 1100 }, deviceScaleFactor: 1.5 });
  // Het blad zelf, afgesneden net onder de laatste inhoud zodat er geen lege papierrand overblijft.
  const papier = async (naam, pagina = c) => {
    await pagina.mouse.click(3, 300); await pagina.mouse.move(2, 2); await pagina.waitForTimeout(400);
    const k = await vak(pagina, '#pf-paper');
    const onder = await pagina.evaluate(() => {
      let m = 0;
      for (const e of document.querySelectorAll('#pf-paper *')) {
        const r = e.getBoundingClientRect(), st = getComputedStyle(e);
        if (r.width && r.height && st.visibility !== 'hidden' && st.display !== 'none' && r.height < 900) m = Math.max(m, r.bottom + scrollY);
      }
      return m;
    });
    const h = Math.min(k.height, Math.max(120, onder - k.y + 26));
    await pagina.screenshot({ path: png(naam), fullPage: true, clip: { x: k.x, y: k.y, width: k.width, height: h } });
  };
  await c.goto(ADRES + '/proef-proberen?scherm=1&file=demo-blad.json'); await c.waitForTimeout(2200);
  const kv = await vak(c, '.kleurveld');
  for (let i = 0; i < 6; i++) { await c.mouse.click(kv.x + kv.width * (i + 0.5) / 10, kv.y + kv.height / 2); await c.waitForTimeout(80); }
  const stip = c.locator('.veelhoek .pf-stip');
  for (const i of [9, 13, 37, 33]) { const s = await stip.nth(i).boundingBox(); await c.mouse.click(s.x + s.width / 2, s.y + s.height / 2); await c.waitForTimeout(120); }
  const cellen = c.locator('.pf-veld input');
  const rooster = ['', '', '2', '4', '5', '6', '', '+', '1', '3', '8', '9', '', '', '3', '8', '4', '5'];
  for (let i = 0; i < rooster.length; i++) if (rooster[i]) await cellen.nth(i).fill(rooster[i]);
  await papier('toets-blad');
  await c.close();
  c = await b.newPage({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 2 });
  await c.goto(ADRES + '/proef-proberen?scherm=1&file=demo-taal.json'); await c.waitForTimeout(2200);
  const L = DEMO[t].taal;
  const stukken = [...L.tekst.matchAll(/\[([^\]|]+)(\|2)?\]/g)];
  for (const k of [1, 2]) {
    await c.click(`.pf-stift[data-k="${k}"]`);
    for (const m of stukken) if (!!m[2] === (k === 2)) { await klikTekst(c, '.pf-woord', m[1]); await c.waitForTimeout(100); }
  }
  await papier('toets-markeren');
  await c.click('#pf-volgende'); await c.waitForTimeout(600);
  for (const [k, kaarten] of [[0, ['1/2', '2/4', '50%']], [1, ['1/4', '25%']]]) {
    await c.click(`.pf-groep-kleur[data-c="${k}"]`);
    for (const x of kaarten) { await klikTekst(c, '.pf-groep-k', x); await c.waitForTimeout(100); }
  }
  await papier('toets-groeperen');
  await c.click('#pf-volgende'); await c.waitForTimeout(600);
  const as = await vak(c, '.pf-as');
  await c.mouse.click(as.x + as.width * (0.06 + 0.88 * 0.375), as.y + as.height * 0.35);
  await papier('toets-getallenas');
  await c.close();
}

// De klastools op het bord, met de demoklas.
async function klastools(b) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [tool, klik, ms] of [['lot', '#lot-draai', 6500], ['banieren', '#ban-maak', 2500], ['zandloper', '#zl-start', 3500], ['runensteen', '#rs-gooi', 3000], ['indeling', '#ki-verdeel', 2000], ['wachtlijst', null, 800]]) {
    await p.goto(ADRES + '/wapenkamer#' + tool); await p.waitForTimeout(1800);
    if (klik) await p.click(klik);
    await p.waitForTimeout(ms);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.mouse.move(2, 2); await p.waitForTimeout(300);
    await p.screenshot({ path: png(`kt-${tool}`), clip: { x: 0, y: 90, width: 1440, height: 810 } });
  }
  await p.close();
}

// Werken met AI: de opdracht voor de chatbot, een hele reeks per les en een oefenblad zoals het uit de AI komt.
async function aiBeelden(b, t) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(ADRES + '/host'); await p.waitForTimeout(2000);
  await p.evaluate(() => openMaker()); await p.waitForTimeout(800);
  await p.fill('#m-topic', DEMO[t].ai); await p.dispatchEvent('#m-topic', 'input'); await p.waitForTimeout(600);
  let a = await vak(p, '#maker');
  let z = await vak(p, '#m-copy');
  await p.mouse.move(2, 2);
  await p.screenshot({ path: png('ai-maker'), fullPage: true, clip: { x: a.x, y: a.y, width: a.width, height: z.y + z.height + 24 - a.y } });
  await p.goto(ADRES + '/reeks'); await p.waitForTimeout(2000);
  await p.fill('#r-vak', DEMO[t].reeks.vak);
  await p.fill('#r-lessen', DEMO[t].reeks.lessen.join('\n')); await p.dispatchEvent('#r-lessen', 'input'); await p.waitForTimeout(400);
  const panelen = p.locator('.panel');
  a = await panelen.nth(0).boundingBox(); z = await panelen.nth(2).boundingBox();
  await p.screenshot({ path: png('ai-reeks'), fullPage: true, clip: { x: a.x, y: a.y, width: a.width, height: z.y + z.height - a.y } });
  await p.goto(ADRES + '/oefenblad-print?file=demo-oefenblad.json'); await p.waitForTimeout(2000);
  a = await vak(p, '.ob-paper');
  await p.screenshot({ path: png('ai-oefenblad'), fullPage: true, clip: { x: a.x, y: a.y, width: a.width, height: Math.min(a.height, a.width * 1.1) } });
  await p.close();
}

(async () => {
  const b = await chromium.launch();
  for (const t of TALEN) {
    const data = path.join(TMP, `data-${t}`);
    fs.mkdirSync(data, { recursive: true });
    vul(data, t, await bladBeeld(b, DEMO[t].blad));
    const server = await start(data);
    TAAL = t;
    try {
      await zetTaal(t);
      const verberg = '#welkom-tip,#eerste-start{display:none!important}';
      const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
      await p.goto(ADRES + '/host'); await p.waitForTimeout(2500);
      await p.addStyleTag({ content: verberg }); await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(TMP, `${t}-host.png`) });
      await p.click('[data-realm=arena]'); await p.waitForTimeout(1000);
      await p.screenshot({ path: path.join(TMP, `${t}-arena.png`) });
      const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
      await m.goto(ADRES + '/'); await m.waitForTimeout(2500);
      await m.screenshot({ path: path.join(TMP, `${t}-gsm.png`) });
      await p.close(); await m.close();
      await toetsGalerij(b, t);
      await klastools(b);
      await aiBeelden(b, t);
    } finally { server.kill(); await wacht(500); }
  }
  await b.close();
  // Bijsnijden en verkleinen: de Arena enkel de bovenste rij (zo staan er geen andere tegels op).
  execFileSync('python3', ['-c', `
import json, os
from PIL import Image
S, O = ${JSON.stringify(TMP + '/')}, ${JSON.stringify(UIT + '/')}
maten = json.load(open(O+'maten.json')) if os.path.exists(O+'maten.json') else {}
for t in ${JSON.stringify(TALEN)}:
  Image.open(S+t+'-host.png').convert('RGB').resize((1200,833),Image.LANCZOS).save(O+t+'-host.webp',quality=78,method=6)
  Image.open(S+t+'-arena.png').convert('RGB').crop((0,0,1440,560)).resize((1200,467),Image.LANCZOS).save(O+t+'-arena.webp',quality=78,method=6)
  Image.open(S+t+'-gsm.png').convert('RGB').resize((390,844),Image.LANCZOS).save(O+t+'-gsm.webp',quality=80,method=6)
  # Galerijen: de breedte vast, de hoogte zoals het beeld; de maten gaan naar maten.json voor bouw.js.
  for n, w in [('toets-blad',1200),('toets-markeren',800),('toets-groeperen',800),('toets-getallenas',800),('kt-lot',960),('kt-banieren',960),('kt-zandloper',960),('kt-runensteen',960),('kt-indeling',960),('kt-wachtlijst',960),('ai-maker',1000),('ai-reeks',800),('ai-oefenblad',800)]:
    im = Image.open(S+t+'-'+n+'.png').convert('RGB')
    h = round(im.height * w / im.width)
    im.resize((w,h),Image.LANCZOS).save(O+t+'-'+n+'.webp',quality=76,method=6)
    maten[t+'-'+n] = [w, h]
json.dump(maten, open(O+'maten.json','w'), indent=1, sort_keys=True)
`], { stdio: 'inherit' });
  console.log('Schermafbeeldingen staan in website/site/shots.');
})();
