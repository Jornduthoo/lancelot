// Standaardkeuzes voor taken (wensenlijst 20 nov, punt 5): Instellingen › Taken. Wat je bij een nieuwe taak
// vooraf ingevuld krijgt: voorlezen, volgorde, punten tonen, verbeteren (oefenblad) en het startuur van een
// geplande taak. Per vak (wiskunde, Nederlands, Frans, WO) kan een uitzondering. Gaat mee met Mijn lesmap.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const niveaus = require('./niveaus');

const DIR = () => gegevens.pad('taken-standaard');
const FILE = () => path.join(DIR(), 'standaard.json');

// Goede standaarden voor wie begint: Page-leerlingen krijgen voorgelezen, alles door elkaar, punten pas na
// het verbeteren, meteen groen of rood bij een oefenblad, en een geplande taak start om half negen.
const STANDAARD = { voorlees: 'page', volgorde: 'schud', uitslag: false, feedback: 'direct', startuur: '08:30' };
const KEUZES = {
  voorlees: ['uit', 'page', 'iedereen'],
  volgorde: ['schud', 'vragen', 'alles'],
  feedback: ['direct', 'inleveren'],
};
const UUR = /^([01]\d|2[0-3]):[0-5]\d$/;

// Alleen geldige keuzes houden. volledig: elk veld ingevuld (de algemene standaard); anders alleen wat afwijkt.
function schoon(d, volledig) {
  const uit = {};
  const x = d && typeof d === 'object' ? d : {};
  for (const [k, lijst] of Object.entries(KEUZES)) if (lijst.includes(x[k])) uit[k] = x[k];
  if (typeof x.uitslag === 'boolean') uit.uitslag = x.uitslag;
  if (UUR.test(String(x.startuur || ''))) uit.startuur = x.startuur;
  return volledig ? { ...STANDAARD, ...uit } : uit;
}

function geldig(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || (d.vakken && typeof d.vakken !== 'object')) throw new Error('Ongeldige standaard.');
}

function read() {
  let d = null;
  try { d = JSON.parse(fs.readFileSync(FILE(), 'utf8')); } catch {}
  const vakken = {};
  for (const g of niveaus.VAKGROEPEN) {
    const v = schoon(d && d.vakken && d.vakken[g.id], false);
    if (Object.keys(v).length) vakken[g.id] = v;
  }
  return { bewaard: !!d, algemeen: schoon(d && d.algemeen, true), vakken, vakgroepen: niveaus.VAKGROEPEN.map(g => ({ id: g.id, naam: g.naam })) };
}

function write({ algemeen, vakken } = {}) {
  const uit = { algemeen: schoon(algemeen, true), vakken: {}, gewijzigd: new Date().toISOString() };
  for (const g of niveaus.VAKGROEPEN) {
    const v = schoon(vakken && vakken[g.id], false);
    if (Object.keys(v).length) uit.vakken[g.id] = v;
  }
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(FILE(), JSON.stringify(uit, null, 2) + '\n');
  return read();
}

// De keuzes voor een taak van dit vak (bv. 'Frans' of 'Geschiedenis'): de algemene standaard met de uitzondering erover.
function voor(vak) {
  const d = read();
  const g = niveaus.groep(vak);
  return { ...d.algemeen, ...(g && d.vakken[g] ? d.vakken[g] : {}), vakgroep: g && d.vakken[g] ? g : '' };
}

module.exports = { DIR, STANDAARD, read, write, voor, geldig };
