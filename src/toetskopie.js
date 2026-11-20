// De Proef: van een verbeterde toets een kopie per leerling (pdf) in Mijn lesmap, in een mapje per kind:
//   <lesmap>/Toetsen per leerling/<Naam>/<datum> <toets>.pdf        (met meerdere klassen: .../<Klas>/<Naam>/...)
// Zo komt hij vanzelf in OneDrive of Google Drive. Het is een keuze van de leerkracht (settings.toetsKopie).
// De pdf maakt de browser die al op de pc staat (Edge of Chrome, zonder venster): geen extra programma's nodig.
// Zonder lesmap of zonder browser: niets, met een duidelijke melding, nooit een fout in de toets zelf.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const settings = require('./settings');
const toetsmail = require('./toetsmail');

const MAP = 'Toetsen per leerling';

// Een naam die in elke map mag (Windows, Drive): geen / \ : * ? " < > |, niet te lang.
function veilig(s, standaard = 'zonder naam') {
  const t = String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').replace(/^[.\s]+|[.\s]+$/g, '').slice(0, 80);
  return t || standaard;
}

function datumTekst(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Waar de pdf van één leerling komt.
function pad(root, { klas, naam, datum, titel }) {
  const delen = [root, MAP];
  if (klas) delen.push(veilig(klas, 'klas'));
  delen.push(veilig(naam), `${[datumTekst(datum), veilig(titel, 'toets')].filter(Boolean).join(' ')}.pdf`);
  return path.join(...delen);
}

// Edge staat op elke Windows-pc; Chrome of Chromium mag ook. LANCELOT_BROWSER gaat voor (en voor de tests).
function zoekBrowser() {
  const kandidaten = [];
  if (process.env.LANCELOT_BROWSER) kandidaten.push(process.env.LANCELOT_BROWSER);
  if (process.platform === 'win32') {
    for (const basis of [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA].filter(Boolean)) {
      kandidaten.push(path.join(basis, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
      kandidaten.push(path.join(basis, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
  } else if (process.platform === 'darwin') {
    kandidaten.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    kandidaten.push('/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }
  return kandidaten.find(p => { try { return fs.statSync(p).isFile(); } catch { return false; } }) || '';
}

// Eén pagina als pdf bewaren. Een eigen, tijdelijk profiel: zo stoort het een open Edge-venster niet.
function pdf(browser, url, uit) {
  return new Promise((resolve, reject) => {
    const profiel = fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-pdf-'));
    const tmp = `${uit}.tmp.pdf`;
    const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--no-sandbox',
      `--user-data-dir=${profiel}`, '--no-pdf-header-footer', '--print-to-pdf-no-header', '--virtual-time-budget=8000', `--print-to-pdf=${tmp}`, url];
    execFile(browser, args, { windowsHide: true, timeout: 90000 }, err => {
      fs.rm(profiel, { recursive: true, force: true }, () => {});
      try {
        if (!fs.statSync(tmp).size) throw new Error('lege pdf');
        fs.renameSync(tmp, uit);
        resolve(uit);
      } catch (e) {
        fs.rm(tmp, { force: true }, () => {});
        reject(err || e);
      }
    });
  });
}

const aan = () => settings.read().toetsKopie === true;
function zet(waarde) {
  settings.write({ toetsKopie: !!waarde });
  return view();
}
function view() {
  return { aan: aan(), lesmap: settings.read().lesmap || '', map: MAP };
}

let bezig = Promise.resolve();
// Kopieën maken voor alle leerlingen van een afname, één na één (een schoolpc heeft niet veel geheugen).
// Heeft een leerling een mailadres (zie src/toetsmail.js), dan gaat zijn pdf ook naar dat adres.
// Staat de kopie in de lesmap uit, dan maken we alleen een tijdelijke pdf voor wie gemaild moet worden.
// Wie al gemaild werd (s.gemaild, bv. bij een toets als taak die later nog eens Klaar is), krijgt geen tweede mail.
// opties: { rec, klas, url: i => 'http://127.0.0.1:3000/proef-kopie?...', browser, stand: s => ({punten, max}),
//          gemaildBij: i => {} (na een gelukte mail, om dat te onthouden), mailOpties }
function maak({ rec, klas, url, browser, stand, mailOpties, gemaildBij } = {}) {
  const root = settings.read().lesmap;
  const werk = bezig.then(async () => {
    const mailen = toetsmail.nodig(rec.spelers);
    // Zonder mail: zoals altijd naar de lesmap. Met mail: naar de lesmap alleen als die kopie aan staat.
    const inLesmap = !mailen || aan();
    if (inLesmap && !mailen) {
      if (!root) return { gemaakt: 0, fout: 'Kies eerst Mijn lesmap (bij Instellingen).' };
      if (!fs.existsSync(root)) return { gemaakt: 0, fout: 'Je lesmap is niet te vinden. Staat OneDrive of Google Drive aan?' };
    }
    const lesmapOk = inLesmap && !!root && fs.existsSync(root);
    const b = browser || zoekBrowser();
    if (!b) return { gemaakt: 0, fout: 'Geen Edge of Chrome gevonden om de pdf te maken.' };
    let gemaakt = 0;
    let gemaild = 0;
    const mislukt = [];
    const mailMislukt = [];
    const tmpMap = mailen ? fs.mkdtempSync(path.join(os.tmpdir(), 'lancelot-mail-')) : '';
    for (let i = 0; i < rec.spelers.length; i++) {
      const s = rec.spelers[i];
      const mailNaar = mailen && !s.gemaild && toetsmail.adresVoor(s.naam);
      if (!lesmapOk && !mailNaar) continue;
      const uit = lesmapOk ? pad(root, { klas, naam: s.naam, datum: rec.datum, titel: rec.title })
        : path.join(tmpMap, `${i}.pdf`);
      try {
        fs.mkdirSync(path.dirname(uit), { recursive: true });
        await pdf(b, url(i), uit);
        if (lesmapOk) gemaakt++;
      } catch (err) {
        console.error(`Kopie van de toets voor ${s.naam} mislukt:`, err.message);
        mislukt.push(s.naam);
        continue;
      }
      if (!mailNaar) continue;
      try {
        await toetsmail.toets({ naam: s.naam, titel: rec.title, datum: rec.datum, stand: stand ? stand(s) : null, pdf: uit, bestand: path.basename(pad('', { naam: s.naam, datum: rec.datum, titel: rec.title })) }, mailOpties);
        gemaild++;
        if (gemaildBij) gemaildBij(i);
      } catch (err) {
        console.error(`Mail van de toets voor ${s.naam} mislukt:`, err.message);
        mailMislukt.push(`${s.naam} (${err.message})`);
      }
    }
    if (tmpMap) fs.rm(tmpMap, { recursive: true, force: true }, () => {});
    const fout = [mislukt.length ? `Niet gelukt voor ${mislukt.join(', ')}.` : '', mailMislukt.length ? `Mailen niet gelukt voor ${mailMislukt.join(', ')}` : ''].filter(Boolean).join(' ');
    return { gemaakt, gemaild, map: lesmapOk ? path.join(root, MAP) : '', fout };
  });
  bezig = werk.catch(() => {});
  return werk;
}

module.exports = { MAP, veilig, pad, zoekBrowser, maak, aan, zet, view };
