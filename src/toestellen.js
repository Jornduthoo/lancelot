// Dezelfde stand op elke pc (wensenlijst 20 nov, punt 2). Elke pc met Mijn lesmap zet daar een klein bestand
// toestellen/<id>.json met zijn naam en wanneer hij het laatst synchroniseerde. Zo toont elk scherm
// "Bijgewerkt van: Thuis (2 min geleden), dit toestel (nu)", alleen als er meer dan één toestel is.
// De id (de naam van de computer) blijft altijd dezelfde; de naam kiest de leerkracht zelf (Instellingen › Lesmap).
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const settings = require('./settings');
const proeven = require('./proeven');

const DIR = () => gegevens.pad('toestellen');
const ID = proeven.PC;
// Om de twee minuten opnieuw schrijven is genoeg (de lesmap synchroniseert elke minuut).
const ELKE = 2 * 60000;
// Een toestel dat 30 dagen niets stuurde, tonen we niet meer.
const WEG = 30 * 864e5;
// Rood: een toestel waar leerlingen bezig zijn, stuurde al zo lang niets.
const STIL = 5 * 60000;

const schoon = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
const naam = () => schoon(settings.read().toestelNaam) || ID;

function zetNaam(n) {
  const nieuw = schoon(n);
  settings.write({ toestelNaam: nieuw });
  hartslag(true);
  return { naam: nieuw || ID };
}

function geldig(d) {
  if (!d || typeof d.id !== 'string' || typeof d.tijd !== 'string') throw new Error('Ongeldig toestel.');
}

// Bij elke synchronisatie: laten weten dat dit toestel er is (alleen met een lesmap).
function hartslag(nu = false) {
  if (!settings.read().lesmap) return;
  const file = path.join(DIR(), `${ID}.json`);
  let oud = null;
  try { oud = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (!nu && oud && oud.naam === naam() && Date.now() - Date.parse(oud.tijd) < ELKE) return;
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ id: ID, naam: naam(), tijd: new Date().toISOString() }) + '\n');
  memo = null;
}

// Kort onthouden: "werkt op …" vraagt de namen voor elke leerling op.
let memo = null;
function alle() {
  if (memo && Date.now() - memo.t < 5000) return memo.lijst;
  const uit = [];
  let namen = [];
  try { namen = fs.readdirSync(DIR()).filter(n => n.endsWith('.json')); } catch {}
  for (const n of namen) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(DIR(), n), 'utf8'));
      geldig(d);
      uit.push({ id: d.id, naam: schoon(d.naam) || d.id, tijd: d.tijd });
    } catch {}
  }
  memo = { t: Date.now(), lijst: uit };
  return uit;
}

// De naam van een toestel uit zijn id (voor "werkt op …").
function naamVan(id) {
  if (id === ID) return naam();
  const t = alle().find(x => x.id === id);
  return t ? t.naam : id;
}

// Voor de statusregel. standen: de stand van de taken op de andere pc's (taken.standen()), voor wie daar bezig is.
function stand(standen, lesmapView) {
  const lm = lesmapView || {};
  if (!lm.lesmap) return { toon: false, dit: { naam: naam() } };
  const nu = Date.now();
  const bezig = new Map();
  for (const lijst of (standen ? standen.values() : [])) {
    for (const s of lijst) {
      const n = Object.values(s.werk || {}).filter(w => w && w.status === 'bezig').length;
      if (n) bezig.set(s.pc, (bezig.get(s.pc) || 0) + n);
    }
  }
  const anderen = alle().filter(t => t.id !== ID && nu - Date.parse(t.tijd) < WEG).map(t => {
    const geleden = nu - Date.parse(t.tijd);
    return { naam: t.naam, tijd: t.tijd, bezig: bezig.get(t.id) || 0, stil: !!bezig.get(t.id) && geleden > STIL };
  }).sort((a, b) => b.tijd.localeCompare(a.tijd));
  return {
    toon: anderen.length > 0,
    dit: { naam: naam(), tijd: lm.at ? new Date(lm.at).toISOString() : null, fout: lm.error || '' },
    anderen,
  };
}

module.exports = { DIR, ID, naam, zetNaam, hartslag, geldig, alle, naamVan, stand };
