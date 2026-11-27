// Chromebooks met de LANcelot-extensie (src/chromebook-extensie/). Jorn 27 nov: "ik wil controle over welke sites
// ze bezoeken". De extensie meldt per Chromebook welke tabbladen openstaan (alleen de site en de titel, nooit het
// volledige adres) en wie er aangemeld is (het schoolaccount). LANcelot koppelt dat account aan een naam van de klas:
// vanzelf (dezelfde Chromebook zit met die naam in LANcelot) of met de hand.
// De leerkracht kan (Namen › Chromebooks):
//  - tonen: op elk leerkrachtenscherm komt de naam van wie op een andere site dan LANcelot zit, met die sites;
//  - iedereen of één leerling terug naar LANcelot sturen, een link openen, een tabblad sluiten;
//  - LANcelot vastzetten: alleen LANcelot (en links die de leerkracht stuurde) gaan open;
//  - "Kijk naar het bord" is de pauzeknop: elke Chromebook toont dan het logo en het bericht;
//  - de surfgeschiedenis per dag bekijken: wie wanneer op welke site zat (standaard 30 dagen bewaard).
// Alles staat alleen op deze pc (chromebooks/), nooit in de lesmap en niet in de back-up-zip.
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');
const settings = require('./settings');
const klas = require('./klas');

const DIR = () => gegevens.pad('chromebooks');
const KOPPEL = () => path.join(DIR(), 'koppel.json');
const GESCH = () => path.join(DIR(), 'geschiedenis');
const STANDAARD = { tonen: false, vast: false, geschiedenis: true, dagen: 30, leerkrachten: [] };
const DAGEN = [7, 30, 90, 365];
// Twee meldingen van dezelfde site met meer dan 3 minuten ertussen: twee bezoeken (de Chromebook stond uit of dicht).
const NIEUW_BEZOEK = 3 * 60000;

const kort = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const sleutel = e => kort(e, 120).toLowerCase();
const dag = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const geldigeDag = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ''));

function leesJson(f, standaard) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return standaard; }
}
function schrijfJson(f, data) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, f);
}

// ---------- Instellingen ----------
function instellingen() {
  const s = { ...STANDAARD, ...(settings.read().chromebooks || {}) };
  if (!DAGEN.includes(Number(s.dagen))) s.dagen = STANDAARD.dagen;
  const leerkrachten = (Array.isArray(s.leerkrachten) ? s.leerkrachten : []).map(sleutel).filter(e => /^[^@\s]+@[^@\s]+$/.test(e));
  return { tonen: !!s.tonen, vast: !!s.vast, geschiedenis: !!s.geschiedenis, dagen: Number(s.dagen), leerkrachten };
}
// Een leerkracht met de extensie: zijn Chrome wordt een bedieningspaneel en wordt zelf niet gevolgd of vastgezet.
const isLeerkracht = email => !!email && instellingen().leerkrachten.includes(sleutel(email));
function zet(wijz = {}) {
  const nu = instellingen();
  for (const k of ['tonen', 'vast', 'geschiedenis']) if (k in wijz) nu[k] = !!wijz[k];
  if ('dagen' in wijz && DAGEN.includes(Number(wijz.dagen))) nu.dagen = Number(wijz.dagen);
  if ('leerkrachten' in wijz) {
    const l = (Array.isArray(wijz.leerkrachten) ? wijz.leerkrachten : String(wijz.leerkrachten || '').split(/[\s,;]+/)).map(sleutel).filter(Boolean);
    const fout = l.find(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    if (fout) throw new Error(`"${fout}" is geen e-mailadres.`);
    nu.leerkrachten = [...new Set(l)].slice(0, 20);
  }
  settings.write({ chromebooks: nu });
  // Losgemaakt: de links die tijdens het vastzetten mochten, vervallen.
  if (!nu.vast) toegestaan.clear();
  if ('dagen' in wijz) opruimen();
  return nu;
}

// ---------- Wie is wie ----------
let koppelCache = null;
function koppelingen() {
  if (!koppelCache) koppelCache = leesJson(KOPPEL(), {}) || {};
  return koppelCache;
}
function koppel(email, naam, auto = false) {
  const k = sleutel(email);
  if (!k) throw new Error('Geen account.');
  const l = koppelingen();
  if (!naam) delete l[k];
  else {
    const m = klas.match(naam);
    if (!m) throw new Error('Die naam staat niet op de klaslijst.');
    l[k] = { naam: m.naam, auto: !!auto };
  }
  schrijfJson(KOPPEL(), l);
  return l[k] || null;
}
// Een account dat nog niet gekoppeld is: lijkt het begin op precies één voornaam van de klas? (emma.peeters@… → Emma)
function raad(email) {
  const voor = sleutel(email).split('@')[0].split(/[._\-\d]+/)[0];
  if (!voor || voor.length < 2) return '';
  const hits = klas.names().filter(n => n.toLowerCase().split(/\s+/)[0] === voor);
  return hits.length === 1 ? hits[0] : '';
}
function naamVan(email) {
  const k = koppelingen()[sleutel(email)];
  if (k && k.naam) return { naam: k.naam, gekoppeld: true, auto: !!k.auto };
  const r = raad(email);
  return r ? { naam: r, gekoppeld: false, geraden: true } : { naam: '', gekoppeld: false };
}

// ---------- Wat nu openstaat ----------
const live = new Map(); // socket-id -> { email, ip, tabs, versie, sinds, laatst }
const toegestaan = new Set(); // sites die mogen terwijl LANcelot vastzit (de leerkracht stuurde er een link naartoe)

function schoonTabs(tabs) {
  if (!Array.isArray(tabs)) return [];
  return tabs.slice(0, 40).filter(t => t && Number.isInteger(t.id)).map(t => ({
    id: t.id,
    host: kort(t.host, 100).toLowerCase().replace(/[^a-z0-9.:-]/g, ''),
    titel: kort(t.titel, 150),
    soort: ['lancelot', 'web', 'intern'].includes(t.soort) ? t.soort : 'intern',
    actief: !!t.actief,
  }));
}

// Een Chromebook meldt zich (bij elke wissel van tabblad en elke halve minuut).
function meld(sid, data = {}, ip = '', naamOpIp = () => '') {
  const email = kort(data.email, 120);
  if (isLeerkracht(email)) { live.delete(sid); return { leerkracht: true }; }
  const tabs = schoonTabs(data.tabs);
  const nu = Date.now();
  const oud = live.get(sid);
  live.set(sid, { email, ip: String(ip || '').replace(/^::ffff:/, ''), tabs, versie: kort(data.versie, 20), sinds: oud ? oud.sinds : nu, laatst: nu });
  // Vanzelf koppelen: op dezelfde Chromebook zit iemand met een naam in LANcelot.
  if (email && !koppelingen()[sleutel(email)]) {
    const n = naamOpIp(String(ip || '').replace(/^::ffff:/, ''));
    if (n && klas.match(n)) try { koppel(email, n, true); } catch {}
  }
  bewaarBezoek(email, tabs.find(t => t.actief), nu);
  return { leerkracht: false };
}
function weg(sid) {
  const t = live.get(sid);
  live.delete(sid);
  if (t) bewaarBezoek(t.email, null, Date.now());
}

function toestellen() {
  return [...live.entries()].map(([sid, t]) => {
    const n = naamVan(t.email);
    const actief = t.tabs.find(x => x.actief) || null;
    return { sid, email: t.email, ...n, ip: t.ip, versie: t.versie, tabs: t.tabs, actief, elders: !!(actief && actief.soort === 'web'), sinds: t.sinds };
  }).sort((a, b) => (a.naam || a.email).localeCompare(b.naam || b.email, 'nl'));
}

// Op het bord (als "tonen" aanstaat): wie zit nu op een andere site dan LANcelot, met de sites die openstaan.
function bord() {
  if (!instellingen().tonen) return [];
  return toestellen().filter(t => t.elders).map(t => ({
    sid: t.sid,
    naam: t.naam || t.email.split('@')[0] || 'Chromebook',
    actief: t.actief.host,
    titel: t.actief.titel,
    sites: [...new Set(t.tabs.filter(x => x.soort === 'web').map(x => x.host).filter(Boolean))],
  }));
}

// ---------- Geschiedenis ----------
// Per dag één bestand: { "<account>": [{ van, tot, host, titel, naam }] }. Alleen het tabblad waar de leerling naar kijkt.
const open = new Map(); // account -> het bezoek dat nu loopt
const dagCache = new Map(); // datum -> inhoud (alleen vandaag en wat net gelezen werd)
let schrijfTimer = null;
const vuil = new Set();

function dagData(d) {
  if (!dagCache.has(d)) dagCache.set(d, leesJson(path.join(GESCH(), d + '.json'), {}) || {});
  return dagCache.get(d);
}
function bewaarBezoek(email, tab, nu) {
  const k = sleutel(email);
  if (!k) return;
  const loopt = open.get(k);
  const host = tab ? (tab.soort === 'lancelot' ? 'LANcelot' : tab.soort === 'web' ? tab.host : '') : '';
  if (loopt && loopt.host === host && host && nu - loopt.tot < NIEUW_BEZOEK && dag(loopt.van) === dag(nu)) {
    loopt.tot = nu;
    if (tab.titel) loopt.titel = tab.titel;
    vuil.add(dag(nu));
    return planSchrijven();
  }
  if (loopt) { loopt.tot = Math.max(loopt.tot, Math.min(nu, loopt.tot + NIEUW_BEZOEK)); vuil.add(dag(loopt.van)); open.delete(k); }
  if (!host || !instellingen().geschiedenis) return planSchrijven();
  const b = { van: nu, tot: nu, host, titel: tab.titel || '', naam: naamVan(email).naam || '' };
  const d = dagData(dag(nu));
  (d[k] = d[k] || []).push(b);
  open.set(k, b);
  vuil.add(dag(nu));
  planSchrijven();
}
function planSchrijven() {
  if (schrijfTimer) return;
  schrijfTimer = setTimeout(schrijfNu, 20000);
  if (schrijfTimer.unref) schrijfTimer.unref();
}
function schrijfNu() {
  clearTimeout(schrijfTimer);
  schrijfTimer = null;
  for (const d of vuil) try { schrijfJson(path.join(GESCH(), d + '.json'), dagData(d)); } catch (err) { console.error('Surfgeschiedenis bewaren mislukt:', err.message); }
  vuil.clear();
  // Alleen vandaag in het geheugen houden.
  for (const d of dagCache.keys()) if (d !== dag()) dagCache.delete(d);
}

function dagen() {
  let f = [];
  try { f = fs.readdirSync(GESCH()).filter(x => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).map(x => x.slice(0, 10)); } catch {}
  if (vuil.size) f.push(...vuil);
  return [...new Set(f)].sort().reverse();
}
// De geschiedenis van één dag: per bezoek wie, van wanneer tot wanneer, welke site.
function geschiedenis(d, wie = '') {
  if (!geldigeDag(d)) d = dag();
  const data = dagData(d);
  const filter = sleutel(wie);
  const rij = [];
  for (const [k, lijst] of Object.entries(data)) {
    const n = naamVan(k);
    const naam = n.naam || (lijst.find(b => b.naam) || {}).naam || k.split('@')[0];
    if (filter && filter !== k && filter !== naam.toLowerCase()) continue;
    for (const b of lijst) rij.push({ naam, email: k, van: b.van, tot: b.tot, host: b.host, titel: b.titel });
  }
  rij.sort((a, b) => a.van - b.van);
  return { datum: d, bezoeken: rij };
}
function opruimen() {
  const grens = dag(Date.now() - instellingen().dagen * 864e5);
  let n = 0;
  for (const d of dagen()) if (d < grens) {
    try { fs.unlinkSync(path.join(GESCH(), d + '.json')); n++; } catch {}
    dagCache.delete(d);
  }
  return n;
}
function wisGeschiedenis() {
  for (const d of dagen()) try { fs.unlinkSync(path.join(GESCH(), d + '.json')); } catch {}
  dagCache.clear();
  open.clear();
  vuil.clear();
}

// ---------- Wat de Chromebooks moeten doen ----------
function stand(pauzeStand = { aan: false, tekst: '' }) {
  const s = instellingen();
  return { vast: s.vast, toegestaan: s.vast ? [...toegestaan] : [], pauze: { aan: !!pauzeStand.aan, tekst: pauzeStand.tekst || '' } };
}
// Een link die de leerkracht stuurt: geldig http(s)-adres (zonder http ervoor mag ook).
function link(url) {
  let s = String(url || '').trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    return u;
  } catch { return null; }
}
function staToe(host) {
  if (instellingen().vast && host) toegestaan.add(host.replace(/^www\./, ''));
}

function reset() { live.clear(); open.clear(); dagCache.clear(); vuil.clear(); toegestaan.clear(); koppelCache = null; clearTimeout(schrijfTimer); schrijfTimer = null; }

// ---------- Aan de server hangen ----------
// io: de socket.io-server. naamOpIp(ip): de naam waarmee iemand vanaf dat adres in LANcelot zit.
// pauze: src/pauze.js (de pauzeknop is ook "Kijk naar het bord"). adres(): het adres van deze pc voor de Chromebooks.
function start({ io, naamOpIp, pauze, adres }) {
  const ns = io.of('/cb');
  let bordTimer = null;
  const naarBord = () => {
    if (bordTimer) return;
    bordTimer = setTimeout(() => { bordTimer = null; io.to('host').emit('cb-bord', bord()); }, 600);
  };
  // Alleen naar de leerlingen: de Chromebook van de leerkracht gaat nooit op slot.
  const leerlingen = () => ns.except('lk');
  const naarChromebooks = () => leerlingen().emit('stand', stand(pauze.stand()));
  ns.on('connection', socket => {
    const ip = socket.handshake.address;
    socket.emit('stand', stand(pauze.stand()));
    socket.on('meld', data => {
      try {
        const { leerkracht } = meld(socket.id, data, ip, naamOpIp);
        if (leerkracht !== socket.data.leerkracht) {
          socket.data.leerkracht = leerkracht;
          if (leerkracht) socket.join('lk'); else socket.leave('lk');
          socket.emit('rol', { leerkracht });
          if (!leerkracht) socket.emit('stand', stand(pauze.stand()));
        }
      } catch (err) { console.error('Chromebook-melding:', err.message); }
      naarBord();
    });
    // Eigen kanaal /cb: dit is de enige disconnect-listener op deze socket (de spellen gebruiken weg(socket)).
    socket.once('disconnect', () => { weg(socket.id); naarBord(); });
  });
  pauze.opWijziging(naarChromebooks);
  opruimen();
  setInterval(opruimen, 6 * 3600000).unref();
  // Bij het afsluiten wat nog in het geheugen staat bewaren.
  process.once('exit', schrijfNu);

  // De handlers voor een leerkrachtenscherm.
  function leerkracht(socket) {
    const cb = f => (arg, antwoord) => {
      if (typeof antwoord !== 'function') return;
      try { antwoord(f(arg || {})); } catch (err) { antwoord({ error: err.message }); }
    };
    socket.on('cb-bord', cb(() => bord()));
    socket.on('cb-lijst', cb(() => ({ instellingen: instellingen(), toestellen: toestellen(), namen: klas.names(), adres: adres(), pauze: pauze.stand() })));
    socket.on('cb-zet', cb(w => {
      const r = zet(w);
      naarChromebooks();
      naarBord();
      io.to('host').emit('cb-instellingen', r);
      return r;
    }));
    socket.on('cb-terug', cb(({ sid }) => {
      if (sid) ns.to(sid).emit('terug'); else leerlingen().emit('terug');
      return { ok: true };
    }));
    socket.on('cb-open', cb(({ url, sid }) => {
      const u = link(url);
      if (!u) throw new Error('Dat is geen geldig adres.');
      staToe(u.hostname);
      naarChromebooks();
      if (sid) ns.to(sid).emit('open', { url: u.href }); else leerlingen().emit('open', { url: u.href });
      return { ok: true };
    }));
    socket.on('cb-sluit', cb(({ sid, tab }) => {
      if (!sid || !Number.isInteger(tab)) throw new Error('Welk tabblad?');
      ns.to(sid).emit('sluit', { tab });
      return { ok: true };
    }));
    socket.on('cb-koppel', cb(({ email, naam }) => { const r = koppel(email, naam); naarBord(); return { ok: true, koppeling: r }; }));
    socket.on('cb-dagen', cb(() => dagen()));
    socket.on('cb-geschiedenis', cb(({ datum, wie }) => geschiedenis(datum, wie)));
    socket.on('cb-wis', cb(() => { wisGeschiedenis(); return { ok: true }; }));
  }
  return { leerkracht, naarBord };
}

module.exports = { start, instellingen, zet, isLeerkracht, koppel, naamVan, raad, meld, weg, toestellen, bord, geschiedenis, dagen, opruimen, wisGeschiedenis, schrijfNu, stand, link, staToe, reset, dag, DAGEN };
