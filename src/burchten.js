// Eer en burchten: het beloningssysteem van de klas.
// Eer verdien je met inzet en groei: elke vraag die je ernstig beantwoordt, beter doen dan je vorige keren,
// een herhaalquiz uitspelen, dagen na elkaar meedoen. Gokken levert niets op. Page, Schildknaap en Ridder verdienen evenveel.
// De Eer komt uit het logboek (dus uit elk spel, zonder dat een spel er iets voor moet doen), plus de Eer die de leerkracht geeft.
// Met Eer bouwt een leerling zijn eigen burcht. Alle burchten samen vormen het Klaseiland op het bord.
// Bewaard in burchten/burchten.json bij de gegevens (staat in .gitignore), alleen op deze pc.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const klas = require('./klas');
const logboek = require('./logboek');
const cat = require('../public/js/bu-catalogus');

const DIR = gegevens.pad('burchten');
const FILE = path.join(DIR, 'burchten.json');

const SESSIE_MAX = 40; // zo levert een spel met heel veel vragen niet oneindig veel Eer op
const MEEGESTREDEN = 5; // een spel uitspelen (minstens 5 vragen)
const GROEI = 10;
const HERHAAL = 10;
const DAG = 3;
const REEKS = 15; // elke 5 schooldagen na elkaar
const GOK = 5;
const ONTDEK_EER = 3; // per opgelost raadsel in de ontdekwereld
const ONTDEK_MAX = 5; // zoveel raadsels per dag geven Eer
const GIFT_MAX = 50;
const POSTEN = 40;

let data = null;
function load() {
  if (data) return data;
  try {
    data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    data = {};
  }
  if (!data.burchten || typeof data.burchten !== 'object') data.burchten = {};
  if (!Array.isArray(data.giften)) data.giften = [];
  if (!data.klasdoel || typeof data.klasdoel !== 'object') data.klasdoel = null;
  return data;
}

// Verandert bij elke gift, zodat de Eer opnieuw geteld wordt.
let giftVersie = 0;
function save() {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(data));
    fs.renameSync(FILE + '.tmp', FILE);
  } catch (err) {
    console.error('Burchten bewaren mislukt:', err.message);
  }
}

// Kasteeltijd zet de leerkracht aan. Daarbuiten kan je je burcht bekijken, maar niet bouwen.
let kasteeltijd = false;

const p2 = n => String(n).padStart(2, '0');
const dagVan = t => {
  const d = new Date(t);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
// De volgende schooldag (het weekend telt niet mee voor een reeks).
function volgendeSchooldag(dag) {
  const d = new Date(`${dag}T12:00:00`);
  do d.setDate(d.getDate() + 1); while (d.getDay() === 0 || d.getDay() === 6);
  return dagVan(d.getTime());
}

// Alles uitrekenen voor alle leerlingen. Alleen opnieuw als het logboek, het gokken of de giften veranderden.
let cache = { key: '', per: new Map() };
function telling() {
  const entries = logboek.read();
  const gokken = logboek.readGok();
  const d = load();
  const key = `${entries.length}|${gokken.length}|${giftVersie}`;
  if (cache.key === key) return cache.per;

  const per = new Map();
  const van = id => {
    let s = per.get(id);
    if (!s) {
      s = { eer: 0, posten: [], sessies: new Map(), dagen: new Set(), antwoorden: 0, groei: 0, herhaal: 0, runen: 0, reeks: 0, besteReeks: 0, gift: 0, eerste: '', ontdek: {} };
      per.set(id, s);
    }
    return s;
  };
  const post = (s, t, wat, n) => {
    s.eer += n;
    s.posten.push({ t, wat, n });
  };

  for (const e of entries) {
    if (!e.leerling || e.leeg) continue;
    const s = van(e.leerling);
    s.antwoorden++;
    if (!s.eerste) s.eerste = e.t;
    s.dagen.add(dagVan(e.t));
    // De ontdekwereld: 3 Eer per opgelost raadsel, hooguit 5 per dag (herkenbaar aan de eigen sessie per dag).
    if (String(e.sessie || '').startsWith('ontdek-')) {
      const dag = e.sessie.slice(7);
      s.ontdek[dag] = (s.ontdek[dag] || 0) + 1;
      if (s.ontdek[dag] <= ONTDEK_MAX) post(s, e.t, `Raadsel opgelost: ${e.vraag.replace(/ \(.*\)$/, '')}`, ONTDEK_EER);
      continue;
    }
    if (e.spel === 'Runenraadsel') {
      if (e.juist) s.runen++;
      post(s, e.t, e.juist ? 'Runenraadsel gekraakt' : 'Runenraadsel geprobeerd', e.juist ? 5 : 2);
      continue;
    }
    let ss = s.sessies.get(e.sessie);
    if (!ss) s.sessies.set(e.sessie, ss = { spel: e.spel, bron: e.bron || '', n: 0, juist: 0, t: e.t });
    ss.n++;
    if (e.juist) ss.juist++;
    ss.t = e.t;
  }

  for (const s of per.values()) {
    // Per gespeeld spel: een punt per vraag, een extra per juist antwoord, en een beetje voor het uitspelen.
    const scores = [];
    for (const ss of [...s.sessies.values()].sort((a, b) => (a.t < b.t ? -1 : 1))) {
      const n = Math.min(SESSIE_MAX, ss.n + ss.juist) + (ss.n >= 5 ? MEEGESTREDEN : 0);
      post(s, ss.t, `${ss.spel}: ${ss.n} ${ss.n === 1 ? 'vraag' : 'vragen'}`, n);
      if (ss.n < 5) continue;
      const pct = ss.juist / ss.n;
      // Groei: beter dan het gemiddelde van je vorige drie spellen.
      const vorige = scores.slice(-3);
      if (vorige.length >= 2 && pct >= vorige.reduce((a, b) => a + b, 0) / vorige.length + 0.1) {
        s.groei++;
        post(s, ss.t, 'Groeier: beter dan je vorige spellen', GROEI);
      }
      scores.push(pct);
      if (/^herhaling\b/i.test(ss.bron)) {
        s.herhaal++;
        post(s, ss.t, 'Herhaalquiz uitgespeeld', HERHAAL);
      }
    }
    // Elke dag dat je meedoet, en elke 5 schooldagen na elkaar een bonus.
    let vorige = '';
    for (const dag of [...s.dagen].sort()) {
      s.reeks = vorige && volgendeSchooldag(vorige) === dag ? s.reeks + 1 : 1;
      s.besteReeks = Math.max(s.besteReeks, s.reeks);
      const naam = new Date(`${dag}T12:00:00`).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
      post(s, `${dag}T23:59:00.000Z`, `Meegedaan op ${naam}`, DAG);
      if (s.reeks % 5 === 0) post(s, `${dag}T23:59:30.000Z`, `${s.reeks} schooldagen na elkaar`, REEKS);
      vorige = dag;
    }
    // Is de laatste dag langer dan een schooldag geleden, dan loopt de reeks niet meer.
    if (vorige && vorige !== dagVan(Date.now()) && volgendeSchooldag(vorige) < dagVan(Date.now())) s.reeks = 0;
    s.sessies = null;
  }

  for (const g of gokken) {
    if (!g.leerling) continue;
    post(van(g.leerling), g.t, `Gokken in ${g.spel}`, -GOK);
  }
  for (const g of d.giften) {
    const s = van(g.leerling);
    s.gift++;
    post(s, g.t, g.reden ? `Van je leerkracht: ${g.reden}` : 'Eer van je leerkracht', g.n);
  }

  for (const s of per.values()) {
    s.eer = Math.max(0, s.eer);
    s.posten.sort((a, b) => (a.t < b.t ? 1 : -1));
    s.alle = s.posten;
    s.posten = s.alle.slice(0, POSTEN);
  }
  cache = { key, per };
  return per;
}

const leeg = () => ({ naam: '', kleur: 0, grond: {}, stukken: {} });
const burchtVan = id => load().burchten[id] || leeg();

// Je rang zakt nooit (ook niet als er Eer af gaat voor gokken): we onthouden de hoogste.
function rangVan(id, eer) {
  const nu = cat.rangVan(eer);
  const d = load();
  const b = d.burchten[id];
  if (b && (b.rang || 0) >= nu) return b.rang || 0;
  if (nu > 0) {
    (d.burchten[id] || (d.burchten[id] = leeg())).rang = nu;
    save();
  }
  return nu;
}

function schilden(s, b) {
  const gebouwd = Object.keys(b.stukken).length + Object.keys(b.grond).length;
  const ok = {
    eerste: s.antwoorden > 0,
    trouw: s.besteReeks >= 5,
    groeier: s.groei >= 3,
    herhaler: s.herhaal >= 1,
    runen: s.runen >= 10,
    volhouder: s.antwoorden >= 500,
    bouwmeester: gebouwd >= 25,
    geeerd: s.gift >= 1,
  };
  return cat.SCHILDEN.filter(x => ok[x.id]).map(x => x.id);
}

function stand(leerling) {
  const s = telling().get(leerling.id) || { eer: 0, posten: [], reeks: 0, besteReeks: 0, antwoorden: 0, groei: 0, herhaal: 0, runen: 0, gift: 0 };
  const rang = rangVan(leerling.id, s.eer);
  const b = burchtVan(leerling.id);
  const uitgegeven = cat.kost(b);
  return {
    id: leerling.id,
    naam: leerling.naam,
    eer: s.eer,
    saldo: Math.max(0, s.eer - uitgegeven),
    uitgegeven,
    rang,
    volgende: cat.RANGEN[rang + 1] ? cat.RANGEN[rang + 1].vanaf : null,
    reeks: s.reeks,
    schilden: schilden(s, b),
    posten: s.posten,
    burcht: b,
  };
}

function wie(naam) {
  const l = klas.match(naam);
  if (!l) throw new Error('Kies je naam uit de klaslijst. Alleen leerlingen van de klas hebben een burcht.');
  return l;
}

// Wat een leerling op zijn eigen toestel ziet.
function view(naam) {
  return { ...stand(wie(naam)), kasteeltijd };
}

// Bouwen of weghalen. stuk: een id uit de catalogus, of '' om het vakje leeg te maken (je krijgt alles terug).
function zet(naam, { x, y, stuk, laag, eiland } = {}) {
  if (!kasteeltijd) throw new Error('Het is nu geen Kasteeltijd. Je leerkracht zet die aan.');
  const l = wie(naam);
  x = Number(x);
  y = Number(y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('Dat vakje bestaat niet.');
  const st = stand(l);
  const d = load();
  const b = d.burchten[l.id] || (d.burchten[l.id] = leeg());
  let k;
  if (eiland) {
    const n = cat.EILANDJE.grond;
    if (!b.eiland) throw new Error('Je hebt nog geen eilandje.');
    if (x < 0 || y < 0 || x >= n || y >= n) throw new Error('Dat vakje bestaat niet.');
    k = cat.eSleutel(x, y);
  } else {
    if (!cat.binnen(st.rang, x, y)) throw new Error('Dat stuk grond is nog niet van jou. Met een hogere rang wordt je grond groter.');
    k = cat.sleutel(x, y);
  }
  if (!stuk) {
    // Eerst wat erop staat, dan de vloer.
    if (laag !== 'grond' && b.stukken[k]) delete b.stukken[k];
    else delete b.grond[k];
  } else {
    const item = cat.BY_ID[stuk];
    if (!item) throw new Error('Dat kan je niet bouwen.');
    if (item.rang > st.rang) throw new Error(`Daarvoor moet je ${cat.RANGEN[item.rang].naam} zijn.`);
    const laagNaam = item.soort === 'grond' ? 'grond' : 'stukken';
    const oud = b[laagNaam][k];
    if (oud === stuk) return view(naam);
    const terug = oud && cat.BY_ID[oud] ? cat.BY_ID[oud].prijs : 0;
    if (item.prijs - terug > st.saldo) throw new Error(`Daarvoor heb je nog ${item.prijs - terug - st.saldo} Eer te weinig.`);
    if (laagNaam === 'stukken' && b.grond[k] === 'water') throw new Error('Op water kan je niet bouwen.');
    if (laagNaam === 'grond' && stuk === 'water' && b.stukken[k]) throw new Error('Haal eerst weg wat op dat vakje staat.');
    b[laagNaam][k] = stuk;
  }
  save();
  return view(naam);
}

// Een zwevend eilandje kopen (vanaf de hoogste rang). Verkopen kan als het leeg is: dan krijg je alles terug.
function eilandje(naam, { koop } = {}) {
  if (!kasteeltijd) throw new Error('Het is nu geen Kasteeltijd. Je leerkracht zet die aan.');
  const l = wie(naam);
  const st = stand(l);
  const d = load();
  const b = d.burchten[l.id] || (d.burchten[l.id] = leeg());
  const E = cat.EILANDJE;
  if (koop) {
    if (b.eiland) return view(naam);
    if (st.rang < E.rang) throw new Error(`Een eilandje kan je kopen vanaf ${cat.RANGEN[E.rang].naam}.`);
    if (E.prijs > st.saldo) throw new Error(`Daarvoor heb je nog ${E.prijs - st.saldo} Eer te weinig.`);
    b.eiland = true;
  } else {
    if (!b.eiland) return view(naam);
    const bezet = k => k.startsWith('e:');
    if (Object.keys(b.stukken).some(bezet) || Object.keys(b.grond).some(bezet)) throw new Error('Haal eerst alles van je eilandje weg.');
    delete b.eiland;
  }
  save();
  return view(naam);
}

function cleanNaam(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().slice(0, 24);
}

// De naam van je burcht en de kleur van je daken en banieren. Mag altijd.
function stijl(naam, { burchtnaam, kleur } = {}) {
  const l = wie(naam);
  const d = load();
  const b = d.burchten[l.id] || (d.burchten[l.id] = leeg());
  if (burchtnaam !== undefined) b.naam = cleanNaam(burchtnaam);
  if (kleur !== undefined) {
    const k = Number(kleur);
    if (Number.isInteger(k) && k >= 0 && k < cat.KLEUREN.length) b.kleur = k;
  }
  save();
  return view(naam);
}

// ---------- De leerkracht ----------

function setKasteeltijd(aan) {
  kasteeltijd = !!aan;
}

// Eer geven aan één of meer leerlingen, voor inzet, gedrag, een mooie taak...
function geef({ leerlingen, n, reden } = {}) {
  const ids = new Set(klas.read().leerlingen.map(l => l.id));
  const lijst = (Array.isArray(leerlingen) ? leerlingen : []).filter(id => ids.has(id));
  if (!lijst.length) throw new Error('Kies eerst een of meer leerlingen.');
  const aantal = Math.round(Number(n));
  if (!Number.isFinite(aantal) || aantal < 1 || aantal > GIFT_MAX) throw new Error(`Geef 1 tot ${GIFT_MAX} Eer.`);
  const d = load();
  const t = new Date().toISOString();
  for (const id of lijst) d.giften.push({ t, leerling: id, n: aantal, reden: cleanNaam(reden).slice(0, 40) });
  giftVersie++;
  save();
  return { gegeven: lijst.length };
}

// De laatste gift aan een leerling terugnemen (een vergissing).
function neemTerug(leerling) {
  const d = load();
  for (let i = d.giften.length - 1; i >= 0; i--) {
    if (d.giften[i].leerling === leerling) {
      d.giften.splice(i, 1);
      giftVersie++;
      save();
      return {};
    }
  }
  throw new Error('Deze leerling kreeg nog geen Eer van jou.');
}

// Een burchtnaam die niet door de beugel kan, wissen.
function wisNaam(leerling) {
  const d = load();
  if (d.burchten[leerling]) d.burchten[leerling].naam = '';
  save();
  return {};
}

// Het klasdoel: samen zoveel Eer verdienen vanaf nu. De burcht in het midden van het eiland groeit mee.
function setKlasdoel({ tekst, doel } = {}) {
  const n = Math.round(Number(doel));
  if (!Number.isFinite(n) || n < 50 || n > 100000) throw new Error('Kies een doel tussen 50 en 100 000 Eer.');
  const d = load();
  d.klasdoel = { tekst: String(tekst || '').replace(/\s+/g, ' ').trim().slice(0, 80), doel: n, start: new Date().toISOString() };
  save();
  return {};
}

function klasdoelView(per) {
  const d = load().klasdoel;
  if (!d) return null;
  let samen = 0;
  for (const s of per.values()) for (const p of s.alle) if (p.t >= d.start && p.n > 0) samen += p.n;
  return { ...d, samen, gehaald: samen >= d.doel };
}

// Het Klaseiland op het bord: elke burcht met naam, kleur en ridder. Geen Eer of rangen: geen ranglijst in de klas.
function eiland() {
  const per = telling();
  const burchten = klas.read().leerlingen.map(l => {
    const s = per.get(l.id);
    const rang = rangVan(l.id, s ? s.eer : 0);
    const b = burchtVan(l.id);
    return { id: l.id, leerling: l.naam, naam: b.naam, kleur: b.kleur, grond: b.grond, stukken: b.stukken, eiland: !!b.eiland, rang };
  });
  return { burchten, klasdoel: klasdoelView(per), kasteeltijd };
}

// Het ridderboek voor de leerkracht: Eer, rang en wat er recent bijkwam, per leerling.
function ridderboek() {
  return klas.read().leerlingen.map(l => {
    const s = stand(l);
    return { id: l.id, naam: l.naam, eer: s.eer, saldo: s.saldo, rang: s.rang, reeks: s.reeks, schilden: s.schilden, posten: s.posten.slice(0, 12), burchtnaam: s.burcht.naam };
  });
}

module.exports = { view, zet, eilandje, stijl, setKasteeltijd, kasteeltijd: () => kasteeltijd, geef, neemTerug, wisNaam, setKlasdoel, eiland, ridderboek, DIR };
