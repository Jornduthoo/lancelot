// LANcelot Junior: de wereld voor de 3e kleuterklas tot het 3e leerjaar, in dezelfde app.
// Dezelfde klaslijst en hetzelfde logboek als LANcelot. Kinderen loggen in met een dier, alles wordt voorgelezen,
// en de klas laat samen het klasdraakje groeien. Geen ranglijsten: elk kind krijgt stickers.
// Vier manieren van spelen: op het bord in 4 kleurteams, met twee op een tablet, om de beurt (hoekenwerk) of elk op een eigen tablet.
// Bewaard in klas/junior.json bij de gegevens (die map gaat mee in de back-up en staat in .gitignore).
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');
const logboek = require('./logboek');

const FILE = path.join(gegevens.pad('klas'), 'junior.json');
// Eigen symbooltjes van de klas (zoals aan de kapstok): één prent per kind, opgeladen door de leerkracht.
const SYMBOLEN = path.join(gegevens.pad('klas'), 'junior-symbolen');
const SOORTEN = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const DIEREN = 30; // public/img/junior/dier/1..30.webp
const STICKERS = 48; // public/img/junior/sticker/1..48.webp
// Elke bladzijde van het stickerboek heeft een thema (public/img/junior/boek): bos, zee, ruimte, kasteel, en dan weer van voor af.
// Op het bos en het kasteel komen de stickers 1-16 (en op het kasteel alle), op de zee 17-32, in de ruimte 33-48.
const PER_BLAD = 12;
const BLAD_STICKERS = [[1, 16], [17, 32], [33, 48], [1, 48]];
function nieuweSticker(lijst) {
  const [van, tot] = BLAD_STICKERS[Math.floor(lijst.length / PER_BLAD) % BLAD_STICKERS.length];
  const op = new Set(lijst.slice(lijst.length - (lijst.length % PER_BLAD)));
  const kan = [];
  for (let s = van; s <= tot; s++) if (!op.has(s)) kan.push(s);
  const uit = kan.length ? kan : Array.from({ length: tot - van + 1 }, (_, i) => van + i);
  return uit[Math.floor(Math.random() * uit.length)];
}
const PER_RONDE = 5; // zoveel opdrachten, en dan een sticker (de leerkracht kan 3, 5 of 8 kiezen)
const RONDES = [3, 5, 8];
// Hoeveel eten het klasdraakje nodig heeft voor elke fase: ei, ei dat openbreekt, baby, jong draakje, ridderdraak.
// Traag genoeg om er een heel schooljaar mee te doen (Jorn: na bijna niets was het al fase 2).
const FASEN = [0, 200, 800, 2000, 4000];
const MANIEREN = ['bord', 'duo', 'beurt', 'alleen']; // alleen: elk kind op een eigen tablet, zonder doorgeven
// Avonturen op het bord: de kinderen oefenen op de tablet (met twee of om de beurt), en elk juist antwoord
// laat op het bord iets gebeuren voor hun kleurteam. Het team van een kind volgt de klaslijst (rood, blauw, geel, groen...).
// race en ballon: vier kleurteams tegen elkaar; bouw: de hele klas bouwt samen één burcht.
const AVONTUREN = ['race', 'ballon', 'bouw'];
const SAMEN = ['bouw'];
const STAPPEN_PER_KIND = 3; // de race is gedaan als elk kind van het team ongeveer 3 keer juist antwoordde

// De spelletjes van fase 1. Elk spel heeft niveaus; de leerkracht kiest er één. Alles wat gezegd wordt, staat per taal
// in junior-inhoud(-en/-fr/-es/-de).js; hier staan alleen de namen voor de leerkracht (vertaald via lang/*/junior.json).
const SPELLEN = [
  { id: 'eieren', naam: 'Drakeneieren tellen', zin: 'Tel de eieren in het nest.', groep: 'getallen', jaar: '3e kl - 1e lj', beeld: 'stuk/1',
    niveaus: ['Tot 5', 'Tot 10', 'Tot 20'] },
  { id: 'splits', naam: 'Splitshuisjes', zin: 'Verdeel de draakjes over twee huisjes.', groep: 'getallen', jaar: '1e - 2e lj', beeld: 'stuk/3',
    niveaus: ['Tot 5', 'Tot 10', 'Tot 20'] },
  { id: 'rivier', naam: 'Rekenrivier', zin: 'Spring van steen naar steen met het juiste antwoord.', groep: 'getallen', jaar: '1e - 2e lj', beeld: 'stuk/6',
    niveaus: ['Plus tot 10', 'Plus en min tot 10', 'Plus en min tot 20', 'Tientallen tot 100'] },
  { id: 'groot', naam: 'Groot of klein', zin: 'Wat is het grootste, kleinste, langste of kortste?', groep: 'meten', jaar: '2e kl - 1e lj', beeld: 'dier/13',
    niveaus: ['Groot en klein', 'Groot, klein, lang en kort'] },
  { id: 'dagboog', naam: 'Dagboog', zin: 'Zet de prenten van de dag in de juiste volgorde.', groep: 'meten', jaar: '2e kl - 1e lj', beeld: 'sticker/11',
    niveaus: ['Ochtend, middag, avond', 'Mijn dag', 'De seizoenen', 'De dagen van de week'] },
  { id: 'vormen', naam: 'Vormenjacht', zin: 'Zoek de cirkels, driehoeken en vierkanten.', groep: 'meetkunde', jaar: '2e kl - 1e lj', beeld: 'sticker/7',
    niveaus: ['Cirkel, driehoek, vierkant', 'Met rechthoeken', 'Sorteer de vormen'] },
  { id: 'waar', naam: 'Waar is het draakje?', zin: 'Zet het draakje op, onder of naast de tafel.', groep: 'meetkunde', jaar: '2e kl - 1e lj', beeld: 'stuk/8',
    niveaus: ['Op, onder, naast', 'Ook boven, links en rechts'] },
  { id: 'geluiden', naam: 'Geluidenbos', zin: 'Luister goed: wie maakt dit geluid?', groep: 'taal', jaar: '2e - 3e kl', beeld: 'dier/2',
    niveaus: ['Dieren', 'Dieren en dingen'] },
  { id: 'trein', naam: 'Klankentrein', zin: 'Zet de letters op de wagons, en de trein rijdt weg.', groep: 'taal', jaar: '3e kl - 1e lj', beeld: 'stuk/4',
    niveaus: ['Beginklank', 'Korte woorden', 'Langere woorden'] },
  { id: 'woordbrug', naam: 'Woordbrug', zin: 'Lees het woord en tik de juiste prent.', groep: 'taal', jaar: '1e - 2e lj', beeld: 'stuk/7',
    niveaus: ['Korte woorden', 'Langere woorden', 'Moeilijke klanken'] },
  // Fase 2
  { id: 'lijn', naam: 'Getallenlijn', zin: 'Op welk getal staat het draakje?', groep: 'getallen', beeld: 'stuk/9',
    niveaus: ['Tot 10', 'Tot 20', 'Tot 100'] },
  { id: 'delen', naam: 'Eerlijk delen', zin: 'Verdeel de snoepjes eerlijk over de draakjes.', groep: 'getallen', beeld: 'stuk/10',
    niveaus: ['Over 2 draakjes', 'Over 2, 3 of 4 draakjes', 'Een half en een kwart'] },
  { id: 'tafel', naam: 'Tafeltoren', zin: 'Alle tafels, van 1 tot 10.', groep: 'getallen', beeld: 'stuk/11',
    niveaus: ['Tafel van 2', 'Tafels van 5 en 10', 'Tafels van 2, 5 en 10', 'Tafels van 3 en 4', 'Tafels van 6 en 7', 'Tafels van 8 en 9', 'Alle tafels'] },
  { id: 'klok', naam: 'Klokkentoren', zin: 'Hoe laat is het?', groep: 'meten', beeld: 'stuk/12',
    niveaus: ['Hele uren', 'Halve uren', 'Kwartieren'] },
  { id: 'geld', naam: 'Geldmarkt', zin: 'Hoeveel geld is dit?', groep: 'meten', beeld: 'stuk/13',
    niveaus: ['Tot 10', 'Tot 20', 'Tot 100'] },
  { id: 'stappen', naam: 'Drakenstappen', zin: 'Meet met drakenpootjes.', groep: 'meten', beeld: 'stuk/23',
    niveaus: ['Tot 5', 'Tot 10'] },
  { id: 'sorteer', naam: 'Sorteermand', zin: 'Sorteer de prentjes in de juiste mand.', groep: 'meetkunde', beeld: 'stuk/14',
    niveaus: ['Twee soorten', 'Op kleur', 'Drie soorten'] },
  { id: 'patroon', naam: 'Patronenpad', zin: 'Wat komt er nu? Maak het patroon af.', groep: 'meetkunde', beeld: 'stuk/15',
    niveaus: ['Makkelijk', 'Moeilijker', 'Uitdaging'] },
  { id: 'code', naam: 'Codeerdraakje', zin: 'Welke pijlen brengen het draakje naar de schat?', groep: 'meetkunde', beeld: 'stuk/16',
    niveaus: ['Eén stap', 'Twee stappen', 'Drie of vier stappen'] },
  { id: 'rijm', naam: 'Rijmkikker', zin: 'Wat rijmt er?', groep: 'taal', beeld: 'stuk/17',
    niveaus: ['Met prenten', 'Met prenten en woorden'] },
  { id: 'klap', naam: 'Klapdraak', zin: 'Klap mee: hoeveel stukjes heeft het woord?', groep: 'taal', beeld: 'stuk/18',
    niveaus: ['Korte woorden', 'Ook lange woorden'] },
  { id: 'zinnen', naam: 'Zinnenslinger', zin: 'Zet de woorden in de juiste volgorde.', groep: 'taal', beeld: 'stuk/19',
    niveaus: ['Korte zinnen', 'Langere zinnen'] },
  { id: 'dictee', naam: 'Dictee-draakje', zin: 'Luister en leg de letters van het woord.', groep: 'taal', beeld: 'stuk/20',
    niveaus: ['Korte woorden', 'Langere woorden', 'Moeilijke klanken'] },
  { id: 'naam', naam: 'Mijn naam', zin: 'De letters van je eigen naam.', groep: 'taal', beeld: 'stuk/25',
    niveaus: ['Eerste letter', 'Mijn naam leggen', 'Woord met mijn letter'] },
  { id: 'seizoen', naam: 'Seizoenenboom', zin: 'Bij welk seizoen hoort het?', groep: 'wereld', beeld: 'stuk/21',
    niveaus: ['Twee seizoenen', 'Vier seizoenen'] },
  { id: 'thuis', naam: 'Waar woont het dier?', zin: 'Sleep elk dier naar zijn thuis.', groep: 'wereld', beeld: 'stuk/26',
    niveaus: ['Twee plekken', 'Vier plekken'] },
  { id: 'beroep', naam: 'Wie werkt hiermee?', zin: 'Brandweer, dokter, kok ... wie gebruikt dit?', groep: 'wereld', beeld: 'stuk/27',
    niveaus: ['Zes beroepen', 'Alle beroepen'] },
  { id: 'gezond', naam: 'Gezond smullen', zin: 'Gezond, of maar af en toe?', groep: 'wereld', beeld: 'stuk/28',
    niveaus: ['Weinig eten', 'Veel eten'] },
  { id: 'helpen', naam: 'Goede vriendjes', zin: 'Wat doe je als iemand hulp nodig heeft?', groep: 'samen', beeld: 'stuk/29',
    niveaus: ['Helpen', 'Beleefd zijn'] },
  { id: 'gevoel', naam: 'Gevoelensspiegel', zin: 'Hoe voelt het draakje?', groep: 'samen', beeld: 'stuk/22',
    niveaus: ['Blij, verdrietig, boos, bang', 'Meer gevoelens'] },
  { id: 'dans', naam: 'Bewegingsdans', zin: 'Het draakje danst voor, de klas doet mee.', groep: 'samen', jaar: 'Iedereen', beeld: 'draak/4', bordAlleen: true,
    niveaus: ['Tellen tot 5', 'Tellen tot 10'] },
  { id: 'kring', naam: 'Kringvragen', zin: 'Een vraag op het bord, elk kind kiest een prent.', groep: 'samen', jaar: 'Iedereen', beeld: 'sticker/8', geenFout: true,
    niveaus: ['Hoe voel je je?', 'Wat vind jij leuk?'] },
  // De eigen vragen van de leerkracht (blok Maken, met of zonder AI). Elk niveau is één reeks vragen.
  { id: 'eigen', naam: 'Mijn vragen', zin: 'Je eigen vragen met prentjes, voorgelezen.', groep: 'eigen', jaar: 'Iedereen', beeld: 'stuk/7',
    niveaus: [] },
  // Geen tegel voor de leerkracht: kinderen starten dit zelf op de tablet, één keer per dag een sticker.
  { id: 'raadsel', naam: 'Raadsel van vandaag', zin: 'Drie korte raadsels, elke dag nieuw.', groep: 'raadsel', jaar: 'Iedereen', beeld: 'sticker/1', verborgen: true,
    niveaus: ['Vandaag'] },
];
const RAADSEL_VRAGEN = 3;
const SPEL = Object.fromEntries(SPELLEN.map(s => [s.id, s]));

let data = null;
function load() {
  if (data) return data;
  try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { data = {}; }
  if (!data.dieren || typeof data.dieren !== 'object') data.dieren = {};
  if (!data.stickers || typeof data.stickers !== 'object') data.stickers = {};
  if (!data.symbolen || typeof data.symbolen !== 'object') data.symbolen = {};
  if (!data.raadsel || typeof data.raadsel !== 'object') data.raadsel = {};
  if (!Number.isFinite(data.eten)) data.eten = 0;
  if (typeof data.draakNaam !== 'string') data.draakNaam = '';
  if (!data.voortgang || typeof data.voortgang !== 'object') data.voortgang = {};
  if (!Array.isArray(data.sets)) data.sets = [];
  if (!Array.isArray(data.mappen)) data.mappen = []; // mapjes voor de eigen reeksen (ook lege)
  if (!data.instellingen || typeof data.instellingen !== 'object') data.instellingen = {};
  if (!data.burcht || typeof data.burcht !== 'object') data.burcht = {};
  // Het hol van het klasdraakje: de sterren van de klas, wat ze samen kochten, het hoedje en wat er in het hol staat.
  if (!data.hol || typeof data.hol !== 'object') data.hol = {};
  if (!Number.isFinite(data.hol.sterren)) data.hol.sterren = 0;
  if (!Array.isArray(data.hol.gekocht)) data.hol.gekocht = [];
  if (!Array.isArray(data.hol.uit)) data.hol.uit = [];
  if (typeof data.hol.hoed !== 'number') data.hol.hoed = 0;
  // Verjaardagen: { kind-id: 'MM-DD' }.
  if (!data.jarig || typeof data.jarig !== 'object') data.jarig = {};
  // Op maat per kind (buitengewoon onderwijs, zorg): { kind-id: { stap: -1 | 0 | 1, minder: true } }.
  if (!data.opMaat || typeof data.opMaat !== 'object') data.opMaat = {};
  return data;
}
function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(data));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (err) {
    console.error('Junior bewaren mislukt:', err.message);
  }
}

// Elk kind van de klaslijst krijgt een vast dier. Nieuwe kinderen krijgen het eerste vrije dier.
// Zijn er meer dan 30 kinderen, dan krijgen er twee hetzelfde dier (hun naam staat eronder).
// Het dier van elk kind groeit mee met de stickers: eerst gewoon, dan schildknaap (blauwe kap), dan ridder (helm met pluim).
const DIER_GROEI = [0, 10, 30]; // public/img/junior/dier, dier2, dier3
// De instellingen van de leerkracht (knop ⚙️): opdrachten per ronde, voorlezen op de tablets, dieren die meegroeien.
// Thema's: versiering op het bord en de tablets. 'auto' kiest volgens de datum.
const THEMAS = ['herfst', 'halloween', 'sint', 'kerst', 'winter', 'valentijn', 'carnaval', 'lente', 'pasen', 'moederdag', 'vaderdag', 'zomer', 'school'];
function instellingen() {
  const i = load().instellingen;
  return { perRonde: RONDES.includes(i.perRonde) ? i.perRonde : PER_RONDE, voorlezen: i.voorlezen !== false, groei: i.groei !== false, thema: ['auto', 'geen', ...THEMAS].includes(i.thema) ? i.thema : 'auto', rustig: i.rustig === true, munt: MUNTEN.includes(i.munt) ? i.munt : 'auto' };
}
// Het geld in Geldmarkt: euro, dollar of pond. 'auto' volgt het land van de doelen (VS: dollar, Engeland: pond), anders euro.
const MUNTEN = ['auto', 'eur', 'usd', 'gbp'];
function muntNu() {
  const m = instellingen().munt;
  if (m !== 'auto') return m;
  let l = 'be';
  try { l = require('./doelen').land(); } catch {}
  return l === 'us' ? 'usd' : l === 'en' ? 'gbp' : 'eur';
}
// Paaszondag (Gauss/Meeus), voor de datum van carnaval.
function pasen(j) {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const maand = Math.floor((h + l - 7 * m + 114) / 31), dag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(j, maand - 1, dag);
}
// Welk thema er nu is. Sinterklaas alleen in het Nederlands (Vlaanderen en Nederland).
function themaNu(nu = new Date()) {
  const t = instellingen().thema;
  if (t !== 'auto') return t === 'geen' ? '' : t;
  const md = (nu.getMonth() + 1) * 100 + nu.getDate();
  let nl = true;
  try { nl = !['en', 'fr', 'es', 'de'].includes(require('./taal').huidig()); } catch {}
  const j = nu.getFullYear(), dag = 864e5, t0 = new Date(j, nu.getMonth(), nu.getDate()).getTime();
  // De zoveelste zondag van een maand, en de week ervoor (zondag zelf telt mee).
  const zondag = (maand, n) => { const d = new Date(j, maand - 1, 1); d.setDate(1 + ((7 - d.getDay()) % 7) + (n - 1) * 7); return d.getTime(); };
  const weekVoor = z => t0 >= z - 6 * dag && t0 <= z;
  if (md >= 1025 && md <= 1031) return 'halloween';
  if (nl && md >= 1115 && md <= 1206) return 'sint';
  if (md >= (nl ? 1207 : 1201) || md <= 106) return 'kerst';
  if (md >= 922 && md <= 1114) return 'herfst';
  if (!nl && md >= 1115 && md <= 1130) return 'herfst';
  const p = pasen(j).getTime();
  if (t0 >= p - 60 * dag && t0 <= p - 46 * dag) return 'carnaval';
  if (md >= 210 && md <= 214) return 'valentijn';
  if (t0 >= p - 14 * dag && t0 <= p + 7 * dag) return 'pasen';
  if (weekVoor(zondag(5, 2))) return 'moederdag';
  // Vaderdag: in Vlaanderen de tweede zondag van juni, in veel andere landen de derde.
  if (weekVoor(zondag(6, nl ? 2 : 3))) return 'vaderdag';
  if (md >= 901 && md <= 921) return 'school';
  if (md <= 320) return 'winter';
  if (md <= 531) return 'lente';
  if (md <= 831) return 'zomer';
  return '';
}
function zetInstellingen(nieuw = {}) {
  const i = load().instellingen;
  if (RONDES.includes(Number(nieuw.perRonde))) i.perRonde = Number(nieuw.perRonde);
  if (typeof nieuw.voorlezen === 'boolean') i.voorlezen = nieuw.voorlezen;
  if (typeof nieuw.groei === 'boolean') i.groei = nieuw.groei;
  if (typeof nieuw.rustig === 'boolean') i.rustig = nieuw.rustig;
  if (['auto', 'geen', ...THEMAS].includes(nieuw.thema)) i.thema = nieuw.thema;
  if (MUNTEN.includes(nieuw.munt)) i.munt = nieuw.munt;
  save();
  return instellingen();
}
function dierFase(stickers) {
  let f = 1;
  while (f < DIER_GROEI.length && stickers >= DIER_GROEI[f]) f++;
  return f;
}
function kinderen() {
  const d = load();
  const lijst = klas.read().leerlingen;
  const groeit = instellingen().groei;
  const bezet = new Set(lijst.map(l => d.dieren[l.id]).filter(Boolean));
  let veranderd = false;
  const uit = lijst.map(l => {
    let dier = d.dieren[l.id];
    if (!(dier >= 1 && dier <= DIEREN)) {
      dier = 1;
      while (bezet.has(dier) && dier < DIEREN) dier++;
      if (bezet.has(dier)) dier = 1 + (Object.keys(d.dieren).length % DIEREN);
      d.dieren[l.id] = dier;
      bezet.add(dier);
      veranderd = true;
    }
    const sym = d.symbolen[l.id];
    const stickers = (d.stickers[l.id] || []).length;
    const groei = groeit ? dierFase(stickers) : 1;
    const map = groei === 1 ? 'dier' : `dier${groei}`;
    const jarig = d.jarig[l.id] || '';
    const m = d.opMaat[l.id] || {};
    const maat = { stap: [-1, 1].includes(m.stap) ? m.stap : 0, minder: m.minder === true };
    return { id: l.id, maat, naam: l.naam, team: lijst.indexOf(l) % 4, dier, groei, eigen: !!sym, beeld: sym ? `/junior/symbool/${l.id}?v=${sym.v}` : `/img/junior/${map}/${dier}.webp`, stickers, jarig, feest: !!jarig && jarig === maandDag() };
  });
  if (veranderd) save();
  return uit;
}

// Vandaag als 'MM-DD' (de klok van deze pc).
function maandDag(d = new Date()) { return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
// De verjaardag van een kind zetten ('MM-DD') of wissen (leeg).
function zetJarig(id, datum) {
  if (!klas.read().leerlingen.some(l => l.id === id)) throw new Error('Dat kind staat niet meer op de klaslijst.');
  const d = load();
  const m = /^(\d{2})-(\d{2})$/.exec(String(datum || ''));
  if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) d.jarig[id] = datum; else delete d.jarig[id];
  save();
  return kinderen();
}

// Op maat: dit kind speelt een niveau makkelijker of moeilijker dan de klas, en/of met minder prenten om uit te kiezen.
function zetMaat(id, { stap, minder } = {}) {
  if (!klas.read().leerlingen.some(l => l.id === id)) throw new Error('Dat kind staat niet meer op de klaslijst.');
  const d = load();
  const oud = d.opMaat[id] || {};
  const m = { stap: [-1, 0, 1].includes(Number(stap)) ? Number(stap) : (oud.stap || 0), minder: typeof minder === 'boolean' ? minder : oud.minder === true };
  if (!m.stap && !m.minder) delete d.opMaat[id]; else d.opMaat[id] = m;
  save();
  return kinderen();
}
// Het niveau dat een kind echt speelt: dat van de klas, met de stap van Op maat (niet bij eigen vragen: dat zijn reeksen, geen niveaus).
function niveauVoor(kind, spel, basis) {
  const s = SPEL[spel];
  if (!s || s.id === 'eigen' || !kind || !kind.maat || !kind.maat.stap) return basis;
  return Math.max(0, Math.min(niveausVan(s).length - 1, basis + kind.maat.stap));
}

// De leerkracht tikt op het dier van een kind: het volgende vrije dier.
function wisselDier(id) {
  const lijst = kinderen();
  const kind = lijst.find(k => k.id === id);
  if (!kind) throw new Error('Dat kind staat niet meer op de klaslijst.');
  const bezet = new Set(lijst.filter(k => k.id !== id).map(k => k.dier));
  let dier = kind.dier;
  for (let i = 0; i < DIEREN; i++) {
    dier = (dier % DIEREN) + 1;
    if (!bezet.has(dier)) break;
  }
  load().dieren[id] = dier;
  save();
  return kinderen();
}

// Een eigen symbooltje opladen (data-URL van een png, jpg of webp, al verkleind door het scherm van de leerkracht) of wissen (leeg).
function zetSymbool(id, dataUrl) {
  if (!klas.read().leerlingen.some(l => l.id === id)) throw new Error('Dat kind staat niet meer op de klaslijst.');
  const d = load();
  const oud = d.symbolen[id];
  if (oud) { try { fs.unlinkSync(path.join(SYMBOLEN, `${id}.${oud.ext}`)); } catch {} }
  delete d.symbolen[id];
  if (dataUrl) {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
    if (!m) throw new Error('Kies een prent (png, jpg of webp).');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 400 * 1024) throw new Error('Die prent is te groot.');
    const ext = SOORTEN[m[1]];
    fs.mkdirSync(SYMBOLEN, { recursive: true });
    fs.writeFileSync(path.join(SYMBOLEN, `${id}.${ext}`), buf);
    d.symbolen[id] = { ext, v: Date.now().toString(36) };
  }
  save();
  return kinderen();
}
function symboolBestand(id) {
  const s = load().symbolen[id];
  return s ? { file: path.join(SYMBOLEN, `${id}.${s.ext}`), ext: s.ext } : null;
}

function fase(eten) {
  let f = 0;
  while (f + 1 < FASEN.length && eten >= FASEN[f + 1]) f++;
  return f;
}
function draak() {
  const d = load();
  const f = fase(d.eten);
  const van = FASEN[f], tot = FASEN[f + 1];
  const h = d.hol;
  return { naam: d.draakNaam, eten: d.eten, fase: f + 1, fasen: FASEN.length, tot: tot ? Math.round(((d.eten - van) / (tot - van)) * 100) : 100,
    sterren: h.sterren, gekocht: h.gekocht, uit: h.uit, hoed: h.hoed };
}
// De winkel van het hol: 1-6 zijn hoedjes (er past er één op het draakje), 7-16 komen in het hol.
const HOL_SPUL = [
  { id: 1, prijs: 60, hoed: true }, { id: 2, prijs: 40, hoed: true }, { id: 3, prijs: 20, hoed: true },
  { id: 4, prijs: 25, hoed: true }, { id: 5, prijs: 15, hoed: true }, { id: 6, prijs: 35, hoed: true },
  { id: 7, prijs: 30 }, { id: 8, prijs: 80 }, { id: 9, prijs: 10 }, { id: 10, prijs: 20 }, { id: 11, prijs: 15 },
  { id: 12, prijs: 50 }, { id: 13, prijs: 25 }, { id: 14, prijs: 45 }, { id: 15, prijs: 70 }, { id: 16, prijs: 40 },
];
function holKoop(id) {
  const h = load().hol;
  const stuk = HOL_SPUL.find(x => x.id === Number(id));
  if (!stuk) throw new Error('Dat bestaat niet.');
  if (h.gekocht.includes(stuk.id)) return draak();
  if (h.sterren < stuk.prijs) throw new Error('Nog niet genoeg sterren.');
  h.sterren -= stuk.prijs;
  h.gekocht.push(stuk.id);
  if (stuk.hoed) h.hoed = stuk.id;
  save();
  return draak();
}
// Een hoedje opzetten of afzetten, of iets uit het hol halen en terugzetten.
function holZet(id) {
  const h = load().hol;
  const stuk = HOL_SPUL.find(x => x.id === Number(id));
  if (!stuk || !h.gekocht.includes(stuk.id)) throw new Error('Dat bestaat niet.');
  if (stuk.hoed) h.hoed = h.hoed === stuk.id ? 0 : stuk.id;
  else h.uit = h.uit.includes(stuk.id) ? h.uit.filter(x => x !== stuk.id) : [...h.uit, stuk.id];
  save();
  return draak();
}
function noemDraak(naam) {
  load().draakNaam = String(naam || '').replace(/\s+/g, ' ').trim().slice(0, 20);
  save();
  return draak();
}
// Het klasdraakje eet bij elk goed antwoord. Zegt of het net een fase groeide.
function voer(n = 1) {
  const d = load();
  const voor = fase(d.eten);
  const bij = Math.max(0, Math.min(20, Math.round(n) || 0));
  d.eten += bij;
  d.hol.sterren += bij;
  save();
  return fase(d.eten) > voor;
}

// ---------- De les die nu loopt ----------
// Er loopt hooguit één Junior-les tegelijk. Per kind: hoeveel opdrachten, hoeveel meteen goed, en of het al geweest is.
let les = null;
function nieuweKring() { return { vraag: 0, keuzes: {} }; }

function niveausVan(s) {
  return s.id === 'eigen' ? load().sets.map(x => x.naam) : s.niveaus;
}
function start({ spel, niveau, manier, avontuur } = {}) {
  const s = SPEL[spel];
  if (!s) throw new Error('Kies een spel.');
  if (s.id === 'eigen' && !load().sets.length) throw new Error('Maak eerst een reeks vragen bij Maken.');
  const n = Math.max(0, Math.min(niveausVan(s).length - 1, Number(niveau) || 0));
  const m = s.bordAlleen ? 'bord' : MANIEREN.includes(manier) ? manier : 'beurt';
  les = { spel: s.id, niveau: n, manier: m, seed: Math.floor(Math.random() * 1e9), sinds: Date.now(), kinderen: {}, teams: [0, 0, 0, 0], kring: nieuweKring() };
  const kan = m !== 'bord' && !s.bordAlleen && !s.geenFout && s.id !== 'raadsel';
  if (kan && AVONTUREN.includes(avontuur)) les.avontuur = { id: avontuur, stap: [0, 0, 0, 0], winst: [0, 0, 0, 0], ronde: 1 };
  return stand();
}
function stop() {
  logboek.flush();
  les = null;
}
function stand() {
  // Rustig: geen versiering aan de randen.
  const thema = instellingen().rustig ? '' : themaNu();
  if (!les) return { actief: false, draak: draak(), voorlezen: instellingen().voorlezen, rustig: instellingen().rustig, thema, munt: muntNu() };
  const s = SPEL[les.spel];
  return {
    actief: true, spel: les.spel, naam: s.naam, niveau: les.niveau, niveauNaam: niveausVan(s)[les.niveau], manier: les.manier, seed: les.seed,
    eigen: les.spel === 'eigen' ? load().sets[les.niveau] || null : undefined,
    perRonde: instellingen().perRonde, voorlezen: instellingen().voorlezen, teams: les.teams, avontuur: avontuurStand(), kring: { vraag: les.kring.vraag }, draak: draak(), rustig: instellingen().rustig, thema, munt: muntNu(),
  };
}
// Hoe ver elk team is (0 tot 1). Een team met meer kinderen moet ook meer stappen zetten: zo blijft het eerlijk.
function teamGrootte() {
  const n = [0, 0, 0, 0];
  for (const k of kinderen()) n[k.team]++;
  return n.map(x => Math.max(1, x));
}
function avontuurStand() {
  const a = les && les.avontuur;
  if (!a) return null;
  if (SAMEN.includes(a.id)) {
    const doel = Math.max(4, kinderen().length * STAPPEN_PER_KIND);
    return { id: a.id, samen: true, ver: [Math.min(1, a.stap[0] / doel), 0, 0, 0], winst: a.winst, ronde: a.ronde };
  }
  const g = teamGrootte();
  return { id: a.id, ver: a.stap.map((x, i) => Math.min(1, x / (g[i] * STAPPEN_PER_KIND))), winst: a.winst, ronde: a.ronde };
}
// Een kind antwoordde juist: zijn team zet een stap. Is het team aan de finish, dan wint het en begint een nieuwe ronde.
function avontuurStap(kind) {
  const a = les.avontuur;
  const samen = SAMEN.includes(a.id);
  const t = samen ? 0 : kind.team;
  a.stap[t]++;
  const g = teamGrootte();
  const doel = samen ? Math.max(4, kinderen().length * STAPPEN_PER_KIND) : g[t] * STAPPEN_PER_KIND;
  let winnaar = null;
  if (a.stap[t] >= doel) {
    winnaar = t;
    a.winst[t]++;
    const uit = avontuurStand();
    a.stap = [0, 0, 0, 0];
    a.ronde++;
    return { team: kind.team, kind: { naam: kind.naam, beeld: kind.beeld }, winnaar, ...uit, na: avontuurStand() };
  }
  return { team: kind.team, kind: { naam: kind.naam, beeld: kind.beeld }, winnaar, ...avontuurStand() };
}

// Voor de leerkracht: per kind hoe het gaat. Bezig = nu op een tablet ingelogd.
function overzicht(bezig = new Set()) {
  return kinderen().map(k => {
    const p = les && les.kinderen[k.id];
    return { ...k, bezig: bezig.has(k.id), gedaan: p ? p.gedaan : 0, goed: p ? p.goed : 0, rondes: p ? p.rondes : 0 };
  });
}

// Een kind antwoordde (meteen goed of niet). Na elke ronde van 5: een sticker.
// Apart oefenen (een ondersteuner met één kind, los van de klas): het spel en niveau komen van de tablet.
const apartTel = new Map();
function antwoord(id, { vraag, juist, apart } = {}) {
  const eigen = apart && SPEL[apart.spel] ? { spel: apart.spel, niveau: Math.max(0, Math.min(niveausVan(SPEL[apart.spel]).length - 1, Number(apart.niveau) || 0)) } : null;
  if (!les && !eigen) throw new Error('Er loopt geen spel.');
  const kind = kinderen().find(k => k.id === id);
  if (!kind) throw new Error('Tik op je dier.');
  const p = eigen
    ? (apartTel.get(`${id}:${eigen.spel}`) || apartTel.set(`${id}:${eigen.spel}`, { gedaan: 0, goed: 0, rondes: 0 }).get(`${id}:${eigen.spel}`))
    : (les.kinderen[id] || (les.kinderen[id] = { gedaan: 0, goed: 0, rondes: 0 }));
  p.gedaan++;
  if (juist) p.goed++;
  const s = SPEL[eigen ? eigen.spel : les.spel];
  const niveau = eigen ? eigen.niveau : niveauVoor(kind, les.spel, les.niveau);
  if (!s.geenFout) logboek.answer(`Junior · ${s.naam}`, `LANcelot Junior · ${niveausVan(s)[niveau]}${eigen ? ' · apart' : ''}`, kind.naam, { question: String(vraag || s.naam).slice(0, 160), doel: '' }, !!juist);
  // De opvolging: per kind en per spel hoeveel opdrachten, hoeveel meteen goed, en wanneer het laatst.
  if (!s.geenFout && s.id !== 'raadsel') {
    const v = load().voortgang;
    const rij = v[id] || (v[id] = {});
    const c = rij[s.id] || (rij[s.id] = { n: 0, g: 0, t: '' });
    c.n++;
    if (juist) c.g++;
    c.t = new Date().toISOString().slice(0, 10);
  }
  burchtVan(id).stenen += juist ? 2 : 1;
  const gegroeid = juist ? voer(1) : (save(), false);
  const avontuur = juist && !eigen && les.avontuur ? avontuurStap(kind) : null;
  let sticker = null;
  // Het raadsel van vandaag: na de derde opdracht een sticker, maar maar één keer per dag.
  const vandaag = new Date().toISOString().slice(0, 10);
  const raadsel = eigen && eigen.spel === 'raadsel';
  const verdiend = raadsel
    ? p.gedaan % RAADSEL_VRAGEN === 0 && load().raadsel[id] !== vandaag
    : p.gedaan % (eigen ? PER_RONDE : instellingen().perRonde) === 0;
  if (raadsel && verdiend) load().raadsel[id] = vandaag;
  if (verdiend) {
    p.rondes++;
    const d = load();
    sticker = nieuweSticker(d.stickers[id] || []);
    (d.stickers[id] = d.stickers[id] || []).push(sticker);
    if (d.stickers[id].length > 500) d.stickers[id] = d.stickers[id].slice(-500);
    save();
  }
  return { sticker, gegroeid, draak: draak(), team: kind.team, avontuur, stenen: burchtVan(id).stenen };
}

// ---------- Mijn burcht: elk kind bouwt zelf ----------
// Elke opdracht levert bouwstenen op (2 als het meteen goed is, anders 1). Op de tablet kiest het kind een plekje
// op het burchtplein en zet daar een gebouw. Een ander gebouw op dezelfde plek kost opnieuw stenen.
// Prenten: public/img/junior/burcht/<stuk>.webp (1-15) en steen.webp; het plein is bg/burcht.webp.
const BURCHT_PLEKKEN = 9;
const BURCHT_STUKKEN = [
  { id: 13, prijs: 2 }, { id: 11, prijs: 2 }, { id: 14, prijs: 3 }, { id: 10, prijs: 3 }, { id: 9, prijs: 4 },
  { id: 15, prijs: 4 }, { id: 12, prijs: 5 }, { id: 2, prijs: 5 }, { id: 8, prijs: 5 }, { id: 5, prijs: 6 },
  { id: 6, prijs: 6 }, { id: 3, prijs: 6 }, { id: 4, prijs: 7 }, { id: 1, prijs: 8 }, { id: 7, prijs: 10 },
];
function burchtVan(id) {
  const d = load();
  const b = d.burcht[id] || (d.burcht[id] = { stenen: 0, plek: [] });
  if (!Number.isFinite(b.stenen)) b.stenen = 0;
  if (!Array.isArray(b.plek)) b.plek = [];
  b.plek = Array.from({ length: BURCHT_PLEKKEN }, (_, i) => (BURCHT_STUKKEN.some(x => x.id === b.plek[i]) ? b.plek[i] : 0));
  return b;
}
function burcht(id) {
  if (!kinderen().some(k => k.id === id)) throw new Error('Tik op je dier.');
  const b = burchtVan(id);
  return { stenen: b.stenen, plek: b.plek, stukken: BURCHT_STUKKEN };
}
// Het klaseiland: de burcht van elk kind van de klas, voor op het bord.
function eiland() {
  return kinderen().map(k => { const b = burchtVan(k.id); return { id: k.id, stenen: b.stenen, plek: b.plek }; });
}
function burchtBouw(id, plek, stuk) {
  if (!kinderen().some(k => k.id === id)) throw new Error('Tik op je dier.');
  const p = Number(plek);
  if (!(Number.isInteger(p) && p >= 0 && p < BURCHT_PLEKKEN)) throw new Error('Dat plekje bestaat niet.');
  const s = BURCHT_STUKKEN.find(x => x.id === Number(stuk));
  if (!s) throw new Error('Dat gebouw bestaat niet.');
  const b = burchtVan(id);
  if (b.plek[p] === s.id) return burcht(id);
  if (b.stenen < s.prijs) throw new Error('Nog niet genoeg stenen.');
  b.stenen -= s.prijs;
  b.plek[p] = s.id;
  save();
  return burcht(id);
}

// Op het bord: een team antwoordde goed.
function teamGoed(team) {
  if (!les) throw new Error('Er loopt geen spel.');
  const t = Number(team);
  if (!(t >= 0 && t < 4)) throw new Error('Onbekend team.');
  les.teams[t]++;
  return { gegroeid: voer(1), draak: draak(), teams: les.teams };
}
// Na de bewegingsdans of een kringgesprek krijgt het draakje een beloning voor de hele klas.
function klasBeloning(n) {
  return { gegroeid: voer(n), draak: draak() };
}

// Opvolging voor de leerkracht: elk kind, elk spel (zonder de samen-spelletjes en het raadsel).
function voortgang() {
  const d = load();
  const spellen = SPELLEN.filter(s => !s.geenFout && !s.bordAlleen && !s.verborgen).map(({ id, naam, beeld, groep }) => ({ id, naam, beeld, groep }));
  return { kinderen: kinderen().map(({ id, naam, beeld, stickers: st }) => ({ id, naam, beeld, stickers: st })), spellen, cellen: d.voortgang };
}

// ---------- Eigen vragen (blok Maken) ----------
// Een reeks: { id, naam, vragen: [{ vraag, opties: [{ e: emoji, w: woord, f: foto, fb: bron van de foto }], juist }] }. Elke vraag heeft 2 tot 4 opties.
const MAX_SETS = 40;
const MAX_VRAGEN = 30;
const FOTO = /^[a-f0-9]{16}\.(jpg|png)$/; // een echte foto uit src/jr-foto.js
const STEM = /^[a-f0-9]{16}\.(webm|ogg|m4a)$/; // een eigen opname uit src/jr-foto.js
const kort = (x, n) => String(x == null ? '' : x).replace(/\s+/g, ' ').trim().slice(0, n);
function schoonSet(set = {}) {
  const naam = kort(set.naam, 40);
  if (!naam) throw new Error('Geef de reeks een naam.');
  const vragen = (Array.isArray(set.vragen) ? set.vragen : []).map(v => {
    const opties = (Array.isArray(v && v.opties) ? v.opties : []).map(o => {
      const x = { e: kort(o && (o.e || o.emoji), 16), w: kort(o && (o.w || o.woord), 30) };
      if (o && FOTO.test(String(o.f))) { x.f = o.f; x.fb = kort(o.fb, 120); }
      return x;
    })
      .filter(o => o.e || o.w || o.f).slice(0, 4);
    const juist = Math.max(0, Math.min(opties.length - 1, Number(v && v.juist) || 0));
    const x = { vraag: kort(v && v.vraag, 160), opties, juist };
    if (v && STEM.test(String(v.s))) x.s = v.s; // eigen stem van de leerkracht
    if (v && FOTO.test(String(v.f))) { x.f = v.f; x.fb = kort(v.fb, 120); } // een prent bij de vraag zelf
    return x;
  }).filter(v => v.vraag && v.opties.length >= 2).slice(0, MAX_VRAGEN);
  if (!vragen.length) throw new Error('Zet minstens één vraag met twee antwoorden in de reeks.');
  const uit = { id: kort(set.id, 20) || Date.now().toString(36), naam, vragen };
  const map = kort(set.map, 30);
  if (map) uit.map = map;
  return uit;
}
function sets() { return load().sets; }
function bewaarSet(set) {
  const s = schoonSet(set);
  const d = load();
  const i = d.sets.findIndex(x => x.id === s.id);
  if (i >= 0) d.sets[i] = s;
  else {
    if (d.sets.length >= MAX_SETS) throw new Error(`Je hebt al ${MAX_SETS} reeksen. Wis er eerst een.`);
    d.sets.push(s);
  }
  save();
  return d.sets;
}
// De verkenner van de eigen reeksen: mapjes. Een map bestaat zolang hij in de lijst staat of er een reeks in zit.
const MAX_MAPPEN = 30;
function mappen() {
  const d = load();
  return [...new Set([...d.mappen, ...d.sets.map(x => x.map).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'nl'));
}
function nieuweMap(naam) {
  const n = kort(naam, 30);
  if (!n) throw new Error('Geef de map een naam.');
  const d = load();
  if (!mappen().includes(n)) {
    if (mappen().length >= MAX_MAPPEN) throw new Error(`Je hebt al ${MAX_MAPPEN} mappen.`);
    d.mappen.push(n);
    save();
  }
  return n;
}
function hernoemMap(oud, nieuw) {
  const o = kort(oud, 30), n = kort(nieuw, 30);
  if (!n) throw new Error('Geef de map een naam.');
  const d = load();
  d.mappen = [...new Set(d.mappen.map(x => (x === o ? n : x)))];
  for (const s of d.sets) if (s.map === o) s.map = n;
  save();
}
// Een map wissen: de reeksen erin blijven, ze staan dan gewoon bij Mijn reeksen.
function wisMap(naam) {
  const o = kort(naam, 30);
  const d = load();
  d.mappen = d.mappen.filter(x => x !== o);
  for (const s of d.sets) if (s.map === o) delete s.map;
  save();
}
function zetMap(id, naam) {
  const d = load();
  const s = d.sets.find(x => x.id === id);
  if (!s) throw new Error('Die reeks bestaat niet meer.');
  const n = kort(naam, 30);
  if (n) { s.map = n; if (!d.mappen.includes(n)) d.mappen.push(n); } else delete s.map;
  save();
  return d.sets;
}
function wisSet(id) {
  const d = load();
  if (les && les.spel === 'eigen') throw new Error('Stop eerst het spel dat nu loopt.');
  d.sets = d.sets.filter(x => x.id !== id);
  save();
  return d.sets;
}
const TAALNAAM = { nl: 'Nederlands (Vlaams)', en: 'English', fr: 'français', es: 'español', de: 'Deutsch' };
// Voor wie de vragen zijn: dat bepaalt hoe moeilijk en of de kinderen al wat kunnen lezen.
const KLASSEN = {
  k1: { wie: 'peuters en de 1e kleuterklas (3-4 jaar)', niveau: 'Heel eenvoudig: kleuren, dieren, dingen uit hun eigen leefwereld, tellen tot 3. De kinderen lezen nog niet: alles zit in de prent.' },
  k2: { wie: 'de 2e kleuterklas (4-5 jaar)', niveau: 'Eenvoudig: dieren, seizoenen, vormen, tellen tot 5, groot en klein. De kinderen lezen nog niet: alles zit in de prent.' },
  k3: { wie: 'de 3e kleuterklas (5-6 jaar)', niveau: 'Tellen tot 10, eerste klanken (met welke klank begint het woord?), rijmen, tegenstellingen, wereldoriëntatie. De kinderen lezen nog niet: alles zit in de prent.' },
  l1: { wie: 'het 1e leerjaar (6-7 jaar)', niveau: 'Rekenen tot 20, korte klankzuivere woorden lezen (zoals maan, vis, boom), klanken en letters. Het woord bij de prent mag gelezen worden.' },
  l2: { wie: 'het 2e leerjaar (7-8 jaar)', niveau: 'Rekenen tot 100, de tafels van 2, 5 en 10, de klok (uur en half), korte zinnen lezen, spelling van eenvoudige woorden.' },
};
function eigenPrompt({ onderwerp, aantal, klas: kl, taal: t } = {}) {
  const ond = kort(onderwerp, 200);
  if (!ond) throw new Error('Typ eerst een onderwerp, bijvoorbeeld: de herfst.');
  const n = Math.max(3, Math.min(MAX_VRAGEN, Number(aantal) || 8));
  const k = KLASSEN[kl] || KLASSEN.k3;
  return `Je maakt vragen voor kinderen uit ${k.wie}.
Niveau: ${k.niveau}
Onderwerp: ${ond}
Taal van de vragen: ${TAALNAAM[t] || TAALNAAM.nl}

Maak ${n} korte vragen. Elke vraag wordt voorgelezen, dus schrijf ze zoals een leerkracht ze zegt: kort, eenvoudig en vriendelijk.
Elke vraag heeft 3 antwoorden. Elk antwoord is één duidelijke emoji en één kort woord (de emoji moet het woord tonen, kinderen kiezen op de prent).
Precies één antwoord is juist. Wissel de plaats van het juiste antwoord af. Geen strikvragen, geen negatieve vragen.

Geef ALLEEN deze JSON, zonder uitleg en zonder codeblok:
{"naam": "korte titel van de reeks", "vragen": [{"vraag": "Welk dier zegt miauw?", "opties": [{"emoji": "🐶", "woord": "hond"}, {"emoji": "🐱", "woord": "kat"}, {"emoji": "🐮", "woord": "koe"}], "juist": 1}]}
"juist" is de plaats van het juiste antwoord (0, 1 of 2).`;
}
function leesEigen(data) {
  const s = schoonSet({ naam: data && data.naam, vragen: data && data.vragen });
  delete s.id;
  return s;
}

function stickers(id) {
  return (load().stickers[id] || []).slice(-60);
}

// Kringvragen: elk kind kiest een prent. Het bord toont hoeveel kinderen elke prent kozen (nooit wie).
function kringKies(id, keuze) {
  if (!les || les.spel !== 'kring') throw new Error('Er loopt geen kringgesprek.');
  if (!kinderen().some(k => k.id === id)) throw new Error('Tik op je dier.');
  les.kring.keuzes[id] = Math.max(0, Math.min(5, Number(keuze) || 0));
  return kringStand();
}
function kringStand() {
  if (!les || les.spel !== 'kring') return null;
  const tel = [0, 0, 0, 0, 0, 0];
  for (const k of Object.values(les.kring.keuzes)) tel[k]++;
  return { vraag: les.kring.vraag, tel, aantal: Object.keys(les.kring.keuzes).length };
}
function kringVolgende(stap = 1) {
  if (!les || les.spel !== 'kring') throw new Error('Er loopt geen kringgesprek.');
  les.kring = { vraag: Math.max(0, les.kring.vraag + (stap < 0 ? -1 : 1)), keuzes: {} };
  return kringStand();
}

// De inhoud (zinnen, woorden, geluiden...) in de taal van LANcelot.
function inhoud(taalId) {
  const id = ['en', 'fr', 'es', 'de'].includes(taalId) ? taalId : 'nl';
  return require(id === 'nl' ? './junior-inhoud' : `./junior-inhoud-${id}`);
}

module.exports = {
  zetJarig, themaNu, muntNu, pasen, THEMAS,
  SPELLEN, AVONTUREN, FASEN, PER_RONDE, RONDES, DIEREN, instellingen, zetInstellingen, STICKERS, nieuweSticker, DIER_GROEI, dierFase,
  kinderen, wisselDier, zetSymbool, symboolBestand, draak, noemDraak, holKoop, holZet, HOL_SPUL, eiland, start, stop, stand, overzicht, antwoord, teamGoed, klasBeloning, stickers,
  kringKies, kringStand, kringVolgende, inhoud, fase, niveausVan, zetMaat, niveauVoor,
  burcht, burchtBouw, BURCHT_PLEKKEN, BURCHT_STUKKEN,
  voortgang, sets, bewaarSet, wisSet, mappen, nieuweMap, hernoemMap, wisMap, zetMap, eigenPrompt, leesEigen,
  get actief() { return !!les; },
};
