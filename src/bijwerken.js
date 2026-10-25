// Bijwerken vanuit de app: de nieuwste versie van GitHub ophalen en bij de volgende start installeren.
// Alleen de bestanden van de app worden vervangen. De gegevens van de klas (zie gegevens.js) blijven altijd staan,
// en wat er werd vervangen, wordt tot de volgende update bewaard in _update/oud.
// Installeren gebeurt nooit terwijl LANcelot draait: zo gaat er nooit een lopend spel verloren.
const fs = require('fs');
const path = require('path');
const zip = require('./zip');
const gegevens = require('./gegevens');

const REPO = 'Jornduthoo/lancelot';
const TAK = 'main';
const APP = gegevens.APP;
const DIR = path.join(APP, '_update');
const KLAAR = path.join(DIR, 'klaar.zip');
const KLAAR_INFO = path.join(DIR, 'klaar.json');
const VERSIE = path.join(APP, 'versie.json');
// Nooit vervangen: van de leerkracht, of eigen aan deze pc.
const BEHOUD = new Set([...gegevens.ITEMS, 'node_modules', '_update', 'versie.json', 'gegevensmap.json', 'installatie.json', '.env', '.git']);
// In deze mappen zitten de voorbeelden: die komen er alleen bij als ze er nog niet zijn.
const VOORBEELDEN = new Set(['quizzes', 'oefenbladen', 'rondetafel']);

function leesJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

let status = { bezig: false, fout: '', nieuwste: null, gecontroleerd: 0 };

function view() {
  return { ...status, huidig: leesJson(VERSIE), klaar: fs.existsSync(KLAAR) ? leesJson(KLAAR_INFO) : null, melding: laatsteMelding || (process.env.LANCELOT_BIJGEWERKT ? 'LANcelot is bijgewerkt naar de nieuwste versie.' : '') };
}

async function haal(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'LANcelot', Accept: 'application/vnd.github+json' } });
  if (res.status === 404) throw new Error('De update-bron op GitHub is niet bereikbaar (staat de repository op privé?).');
  if (!res.ok) throw new Error(`GitHub antwoordde met fout ${res.status}. Probeer later opnieuw.`);
  return res;
}

// Welke versie staat er nu op GitHub?
async function zoek() {
  status = { ...status, bezig: true, fout: '' };
  try {
    const c = await (await haal(`https://api.github.com/repos/${REPO}/commits/${TAK}`)).json();
    status.nieuwste = { sha: c.sha, datum: c.commit && c.commit.committer && c.commit.committer.date, bericht: String((c.commit && c.commit.message) || '').split('\n')[0].slice(0, 120) };
    status.gecontroleerd = Date.now();
  } catch (err) {
    status.fout = /fetch failed|ENOTFOUND|ECONN/i.test(err.message) ? 'Geen internet: bijwerken lukt alleen met internet.' : err.message;
  } finally {
    status.bezig = false;
  }
  return view();
}

// De nieuwste versie downloaden en klaarzetten. Installeren gebeurt bij de volgende start.
async function download() {
  if (!status.nieuwste) await zoek();
  if (!status.nieuwste) return view();
  const { sha, datum, bericht } = status.nieuwste;
  status = { ...status, bezig: true, fout: '' };
  try {
    const buf = Buffer.from(await (await haal(`https://codeload.github.com/${REPO}/zip/${sha}`)).arrayBuffer());
    const files = zip.read(buf);
    if (!files.some(f => /^[^/]+\/server\.js$/.test(f.name)) || !files.some(f => /^[^/]+\/package\.json$/.test(f.name))) throw new Error('De download is onvolledig. Probeer opnieuw.');
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(KLAAR + '.tmp', buf);
    fs.renameSync(KLAAR + '.tmp', KLAAR);
    fs.writeFileSync(KLAAR_INFO, JSON.stringify({ sha, datum, bericht, gedownload: new Date().toISOString() }, null, 2) + '\n');
  } catch (err) {
    status.fout = /fetch failed|ENOTFOUND|ECONN/i.test(err.message) ? 'Geen internet: bijwerken lukt alleen met internet.' : err.message;
  } finally {
    status.bezig = false;
  }
  return view();
}

function annuleer() {
  for (const f of [KLAAR, KLAAR_INFO]) {
    try { fs.unlinkSync(f); } catch {}
  }
  return view();
}

let laatsteMelding = '';

// Bij het opstarten, nog voor de server: een klaargezette update installeren.
// Geeft { npm } terug als er geïnstalleerd werd (npm: de onderdelen moeten opnieuw geïnstalleerd worden), anders null.
function pasToe() {
  if (!fs.existsSync(KLAAR)) return null;
  const info = leesJson(KLAAR_INFO) || {};
  const nieuw = path.join(DIR, 'nieuw');
  const oud = path.join(DIR, 'oud');
  const gedaan = [];
  try {
    const files = zip.read(fs.readFileSync(KLAAR));
    fs.rmSync(nieuw, { recursive: true, force: true });
    fs.rmSync(oud, { recursive: true, force: true });
    const tops = new Set();
    for (const f of files) {
      const rel = f.name.split('/').slice(1);
      if (!rel.length || !rel[rel.length - 1]) continue;
      const top = rel[0];
      if (VOORBEELDEN.has(top) && rel.length === 2 && gegevens.DATA === APP) {
        // Een nieuw voorbeeld erbij, nooit een eigen quiz overschrijven.
        const target = path.join(APP, ...rel);
        if (!fs.existsSync(target)) {
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, f.data);
        }
        continue;
      }
      if (BEHOUD.has(top)) continue;
      tops.add(top);
      const target = path.join(nieuw, ...rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, f.data);
    }
    if (!fs.existsSync(path.join(nieuw, 'server.js'))) throw new Error('server.js ontbreekt in de update.');
    const lockVoor = (() => { try { return fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8'); } catch { return ''; } })();
    fs.mkdirSync(oud, { recursive: true });
    for (const top of tops) {
      const src = path.join(nieuw, top);
      const dst = path.join(APP, top);
      // Een .bat die cmd nog aan het lezen is, vervangen we alleen als hij echt veranderde.
      if (top.endsWith('.bat') && fs.existsSync(dst) && fs.readFileSync(dst).equals(fs.readFileSync(src))) continue;
      const had = fs.existsSync(dst);
      if (had) fs.renameSync(dst, path.join(oud, top));
      fs.renameSync(src, dst);
      gedaan.push({ top, had });
    }
    fs.writeFileSync(VERSIE, JSON.stringify({ sha: info.sha || '', datum: info.datum || '', bericht: info.bericht || '', geinstalleerd: new Date().toISOString() }, null, 2) + '\n');
    const lockNa = (() => { try { return fs.readFileSync(path.join(APP, 'package-lock.json'), 'utf8'); } catch { return ''; } })();
    laatsteMelding = 'LANcelot is bijgewerkt.';
    return { npm: lockVoor !== lockNa };
  } catch (err) {
    // Alles terugzetten zoals het was.
    for (const { top, had } of gedaan.reverse()) {
      try {
        fs.rmSync(path.join(APP, top), { recursive: true, force: true });
        if (had) fs.renameSync(path.join(oud, top), path.join(APP, top));
      } catch {}
    }
    laatsteMelding = `Bijwerken lukte niet: ${err.message}. LANcelot draait verder met de vorige versie.`;
    console.error(`  ${laatsteMelding}`);
    return null;
  } finally {
    fs.rmSync(nieuw, { recursive: true, force: true });
    for (const f of [KLAAR, KLAAR_INFO]) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

module.exports = { view, zoek, download, annuleer, pasToe };
