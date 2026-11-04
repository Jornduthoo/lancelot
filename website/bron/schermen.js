// Maakt de schermafbeeldingen van de website opnieuw, in elke taal, uit een draaiende LANcelot.
// 1. Start LANcelot (bv. PORT=3999 node server.js)  2. node website/bron/schermen.js http://localhost:3999
// Nodig: playwright (npm i -g playwright) en python3 met Pillow om naar webp om te zetten.
'use strict';
const { chromium } = require('playwright');
const io = require('socket.io-client');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ADRES = process.argv[2] || 'http://localhost:3000';
const UIT = path.join(__dirname, '..', 'site', 'shots');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-shots-'));
const zet = t => new Promise(r => {
  const s = io(ADRES, { query: { role: 'host' } });
  s.on('connect', () => { s.emit('taal-zet', t); setTimeout(() => { s.close(); r(); }, 800); });
});

(async () => {
  const b = await chromium.launch();
  for (const t of ['nl', 'en', 'fr', 'es', 'de']) {
    await zet(t);
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await p.goto(ADRES + '/host'); await p.waitForTimeout(2500);
    await p.addStyleTag({ content: '#welkom-tip{display:none!important}' });
    await p.screenshot({ path: path.join(TMP, `${t}-host.png`) });
    await p.click('[data-realm=arena]'); await p.waitForTimeout(1000);
    await p.screenshot({ path: path.join(TMP, `${t}-arena.png`) });
    await p.goto(ADRES + '/host'); await p.waitForTimeout(1500);
    await p.click('[data-realm=smidse]'); await p.waitForTimeout(1000);
    await p.screenshot({ path: path.join(TMP, `${t}-smidse.png`) });
    const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await m.goto(ADRES + '/'); await m.waitForTimeout(2500);
    await m.screenshot({ path: path.join(TMP, `${t}-gsm.png`) });
    await p.close(); await m.close();
  }
  await zet('nl');
  await b.close();
  // Bijsnijden en verkleinen: de Arena en de Smidse enkel de bovenste rij (zo staan er geen andere tegels op).
  execFileSync('python3', ['-c', `
from PIL import Image
S, O = ${JSON.stringify(TMP + '/')}, ${JSON.stringify(UIT + '/')}
for t in ['nl','en','fr','es','de']:
  Image.open(S+t+'-host.png').convert('RGB').resize((1200,750),Image.LANCZOS).save(O+t+'-host.webp',quality=78,method=6)
  Image.open(S+t+'-arena.png').convert('RGB').crop((0,0,1440,560)).resize((1200,467),Image.LANCZOS).save(O+t+'-arena.webp',quality=78,method=6)
  Image.open(S+t+'-smidse.png').convert('RGB').crop((0,0,1440,520)).resize((1200,433),Image.LANCZOS).save(O+t+'-smidse.webp',quality=78,method=6)
  Image.open(S+t+'-gsm.png').convert('RGB').resize((390,844),Image.LANCZOS).save(O+t+'-gsm.webp',quality=80,method=6)
`], { stdio: 'inherit' });
  console.log('Schermafbeeldingen staan in website/site/shots.');
})();
