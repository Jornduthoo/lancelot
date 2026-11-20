// De Proef: de verbeterde toets van een leerling ook mailen, bv. naar de GON- of zorgbegeleider van dat kind.
// De leerkracht zet per leerling een adres. Na "Klaar met verbeteren" gaat de pdf (dezelfde als in Mijn lesmap)
// vanzelf naar dat adres, verstuurd met de eigen mailbox van de leerkracht (Gmail: met een app-wachtwoord).
// Alles staat alleen op deze pc, in settings.json. Het wachtwoord gaat nooit terug naar het scherm.
const fs = require('fs');
const path = require('path');
const net = require('net');
const tls = require('tls');
const os = require('os');
const settings = require('./settings');
const gegevens = require('./gegevens');

const STANDAARD = { host: 'smtp.gmail.com', port: 465 };
const ADRES = /^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[a-z]{2,}$/i;

const sleutel = naam => String(naam || '').trim().replace(/\s+/g, ' ').toLowerCase();
function cfg() {
  const s = settings.read();
  const m = s.toetsMail && typeof s.toetsMail === 'object' ? s.toetsMail : {};
  return {
    van: String(m.van || '').trim(), pass: String(m.pass || ''), naam: String(m.naam || '').trim(),
    host: String(m.host || STANDAARD.host).trim(), port: Number(m.port) || STANDAARD.port,
    adressen: m.adressen && typeof m.adressen === 'object' ? m.adressen : {},
    // Leerlingen met een adres maar zonder vinkje "automatisch mailen" (sleutel: true).
    uit: m.uit && typeof m.uit === 'object' ? m.uit : {},
    // Wanneer een leerling (of de mailbox, sleutel "_mailbox") laatst veranderde: bij het syncen via Mijn lesmap wint de laatste.
    tijd: m.tijd && typeof m.tijd === 'object' ? m.tijd : {},
  };
}
function bewaar(c) { settings.write({ toetsMail: c }); }

const klaar = c => !!(c.van && c.pass && c.host);
// Het adres voor deze leerling (of leeg, ook als het vinkje "automatisch mailen" uit staat).
const actief = (c, k) => (!c.uit[k] && c.adressen[k]) || '';
function adresVoor(naam) { return actief(cfg(), sleutel(naam)); }
// Moet er voor iemand uit deze afname gemaild worden?
function nodig(spelers) {
  const c = cfg();
  return klaar(c) && (spelers || []).some(s => actief(c, sleutel(s.naam)));
}

// Wat het scherm te zien krijgt: nooit het wachtwoord.
function view() {
  const c = cfg();
  return { van: c.van, naam: c.naam, host: c.host, port: c.port, heeftPass: !!c.pass, klaar: klaar(c), adressen: { ...c.adressen }, uit: { ...c.uit } };
}

// Afzender instellen. Een leeg wachtwoord laat het oude staan; wis: true haalt alles weg.
function zetAfzender({ van, pass, naam, host, port, wis } = {}) {
  const c = cfg();
  if (wis) { c.van = ''; c.pass = ''; c.naam = ''; c.tijd._mailbox = Date.now(); bewaar(c); return view(); }
  const v = String(van || '').trim();
  if (!ADRES.test(v)) throw new Error('Vul je eigen e-mailadres in.');
  c.van = v;
  if (pass) c.pass = String(pass).replace(/\s+/g, '');
  c.naam = String(naam || '').trim().slice(0, 60);
  if (host) c.host = String(host).trim();
  if (port) c.port = Number(port) || STANDAARD.port;
  if (!c.pass) throw new Error('Vul het app-wachtwoord in.');
  c.tijd._mailbox = Date.now();
  bewaar(c);
  return view();
}

// Een adres per leerling. Meerdere adressen mogen, gescheiden door een komma. Leeg = niet meer mailen.
function zetAdres(naam, adres) {
  const k = sleutel(naam);
  if (!k) throw new Error('Kies een leerling.');
  const lijst = String(adres || '').split(/[,;\s]+/).map(a => a.trim()).filter(Boolean);
  const fout = lijst.find(a => !ADRES.test(a));
  if (fout) throw new Error(`"${fout}" is geen geldig e-mailadres.`);
  const c = cfg();
  if (lijst.length) c.adressen[k] = lijst.join(', ');
  else { delete c.adressen[k]; delete c.uit[k]; }
  c.tijd[k] = Date.now();
  bewaar(c);
  return view();
}

// Mijn klas: per leerling twee adressen (bv. de GON-begeleider en een ouder) en het vinkje "automatisch mailen".
function zetLeerling(naam, { adres1, adres2, aan } = {}) {
  const k = sleutel(naam);
  if (!k) throw new Error('Kies een leerling.');
  const lijst = [adres1, adres2].flatMap(a => String(a || '').split(/[,;\s]+/)).map(a => a.trim()).filter(Boolean);
  const fout = lijst.find(a => !ADRES.test(a));
  if (fout) throw new Error(`"${fout}" is geen geldig e-mailadres.`);
  const c = cfg();
  if (lijst.length) c.adressen[k] = [...new Set(lijst)].join(', ');
  else delete c.adressen[k];
  if (lijst.length && aan === false) c.uit[k] = true;
  else delete c.uit[k];
  c.tijd[k] = Date.now();
  bewaar(c);
  return view();
}

/* ---------------- een mail opstellen ---------------- */
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const kop = s => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`);
const regels = s => s.replace(/.{1,76}/g, '$&\r\n');
function bericht({ van, naam, naar, onderwerp, tekst, bijlage }) {
  const grens = `lancelot-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const delen = [
    `From: ${naam ? `${kop(naam)} <${van}>` : van}`,
    `To: ${naar.join(', ')}`,
    `Reply-To: ${van}`,
    `Subject: ${kop(onderwerp)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${grens}@${van.split('@')[1] || 'lancelot'}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${grens}"`,
    '',
    `--${grens}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    regels(b64(tekst)),
  ];
  if (bijlage) {
    const bestand = bijlage.naam.replace(/["\\\r\n]/g, ' ');
    delen.push(
      `--${grens}`,
      `Content-Type: application/pdf; name="${kop(bestand)}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${kop(bestand)}"`,
      '',
      regels(fs.readFileSync(bijlage.pad).toString('base64')),
    );
  }
  delen.push(`--${grens}--`, '');
  return delen.join('\r\n');
}

/* ---------------- versturen (SMTP, zonder extra pakketten) ---------------- */
// Foutmeldingen in gewone taal, met de ene volgende stap.
const APP_WW = 'https://myaccount.google.com/apppasswords';
const GEEN_VERBINDING = 'Lancelot raakt niet bij de mailserver. Is er internet? Een schoolnetwerk blokkeert soms mail: probeer het thuis of vraag het aan je ICT.';
function uitleg({ code, tekst }) {
  const t = String(tekst || '');
  // Google: 534 5.7.9 "Application-specific password required" = je gewone wachtwoord werd gebruikt.
  if (code === 534 || /application-specific password/i.test(t)) {
    return `Google vraagt een app-wachtwoord, niet je gewone wachtwoord. Zet verificatie in 2 stappen aan en maak er een op ${APP_WW}`;
  }
  // 535 5.7.8 "Username and Password not accepted".
  if (code === 535) {
    return `Google weigert dit e-mailadres met dit wachtwoord. Maak een nieuw app-wachtwoord op ${APP_WW} en plak de 16 letters hier (lukt dat niet met een schooladres, probeer dan je eigen Gmail).`;
  }
  return `De mailserver weigerde: ${t.split(/\r?\n/).pop()}`;
}
// Poort 465: meteen TLS. Andere poort: eerst gewoon, dan STARTTLS (als de server dat aanbiedt).
// opties.onveilig: alleen voor de tests (een server op 127.0.0.1 zonder TLS).
function smtp(c, { van, naar, data }, opties = {}) {
  return new Promise((resolve, reject) => {
    let sock;
    let buf = '';
    let wacht = null;
    let klaarMet = false;
    const tijd = setTimeout(() => fout(new Error(`${GEEN_VERBINDING} (geen antwoord)`)), opties.timeout || 30000);
    function fout(err) {
      if (klaarMet) return;
      klaarMet = true; clearTimeout(tijd);
      try { sock && sock.destroy(); } catch {}
      reject(err);
    }
    function lees(chunk) {
      buf += chunk.toString('utf8');
      let m;
      // Een antwoord eindigt op een regel "123 tekst" (zonder streepje na de code).
      while ((m = /^(?:\d{3}-[^\r\n]*\r?\n)*(\d{3})(?: [^\r\n]*)?\r?\n/.exec(buf))) {
        const antwoord = { code: Number(m[1]), tekst: m[0].trim() };
        buf = buf.slice(m[0].length);
        const w = wacht; wacht = null;
        if (w) w(antwoord);
      }
    }
    const antwoord = () => new Promise(r => { wacht = r; });
    const stuur = async (regel, verwacht) => {
      if (regel !== null) sock.write(`${regel}\r\n`);
      const a = await antwoord();
      if (!verwacht.includes(Math.floor(a.code / 100) * 100) && !verwacht.includes(a.code)) {
        const e = new Error(uitleg(a));
        e.code = a.code;
        throw e;
      }
      return a;
    }
    function hang(s) { sock = s; s.on('data', lees); s.on('error', e => fout(new Error(`${GEEN_VERBINDING} (${e.code || e.message})`))); }
    const veilig = !opties.onveilig && c.port === 465;
    hang(veilig ? tls.connect({ host: c.host, port: c.port, servername: c.host }) : net.connect({ host: c.host, port: c.port }));
    (async () => {
      const ik = (os.hostname() || 'lancelot').replace(/[^a-z0-9.-]/gi, '') || 'lancelot';
      await stuur(null, [200]);
      let ehlo = await stuur(`EHLO ${ik}`, [200]);
      if (!veilig && !opties.onveilig) {
        if (!/STARTTLS/i.test(ehlo.tekst)) throw new Error('De mailserver biedt geen beveiligde verbinding aan.');
        await stuur('STARTTLS', [200]);
        sock.removeAllListeners('data');
        await new Promise((r, j) => { const t = tls.connect({ socket: sock, servername: c.host }, r); t.on('error', j); hang(t); });
        ehlo = await stuur(`EHLO ${ik}`, [200]);
      }
      await stuur(`AUTH PLAIN ${Buffer.from(`\u0000${c.van}\u0000${c.pass}`, 'utf8').toString('base64')}`, [235]);
      await stuur(`MAIL FROM:<${van}>`, [250]);
      for (const a of naar) await stuur(`RCPT TO:<${a}>`, [250, 251]);
      await stuur('DATA', [354]);
      // Punten aan het begin van een regel verdubbelen (zo eindigt de mail niet te vroeg).
      await stuur(`${data.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..')}\r\n.`, [250]);
      sock.write('QUIT\r\n');
      klaarMet = true; clearTimeout(tijd);
      setTimeout(() => { try { sock.end(); } catch {} }, 50);
      resolve({ ok: true });
    })().catch(fout);
  });
}

async function verstuur({ naar, onderwerp, tekst, bijlage }, opties) {
  const c = cfg();
  if (!klaar(c)) throw new Error('Stel eerst in met welk e-mailadres Lancelot mag mailen.');
  const lijst = String(Array.isArray(naar) ? naar.join(',') : naar || '').split(/[,;\s]+/).filter(Boolean);
  if (!lijst.length) throw new Error('Geen adres.');
  const data = bericht({ van: c.van, naam: c.naam, naar: lijst, onderwerp, tekst, bijlage });
  return smtp(c, { van: c.van, naar: lijst, data }, opties);
}

function datumTekst(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}

// De mail met de toets van één leerling.
function toets({ naam, titel, datum, stand, pdf, bestand }, opties) {
  const c = cfg();
  const naar = adresVoor(naam);
  if (!naar) return Promise.resolve({ ok: false, overgeslagen: true });
  const wanneer = datumTekst(datum);
  const score = stand && stand.max ? `\nScore: ${stand.punten} op ${stand.max}.` : '';
  const tekst = `Beste,\n\nIn bijlage vind je de verbeterde toets "${titel}" van ${naam}${wanneer ? ` (${wanneer})` : ''}.${score}\n\nMet vriendelijke groeten${c.naam ? `,\n${c.naam}` : ''}\n`;
  return verstuur({ naar, onderwerp: `Toets ${naam}: ${titel}${wanneer ? ` (${wanneer})` : ''}`, tekst, bijlage: { naam: bestand, pad: pdf } }, opties);
}

// Een proefmail naar de leerkracht zelf, om de instellingen te testen.
function test(opties) {
  const c = cfg();
  return verstuur({ naar: c.van, onderwerp: 'Lancelot: proefmail', tekst: 'Het werkt. Lancelot kan toetsen mailen vanuit deze mailbox.\n' }, opties);
}

/* ---------------- meesyncen via Mijn lesmap ---------------- */
// De adressen en vinkjes per leerling en de mailbox (adres, naam, server) gaan mee naar Mijn lesmap, zodat je ze maar
// één keer invult. Het app-wachtwoord gaat NOOIT mee: dat vul je op elke pc één keer in.
// Per leerling wint de laatste wijziging (ook een gewist adres: dat staat er dan leeg met een tijd).
const LESMAP_DIR = () => gegevens.vast('toetsmail-lesmap');
const LESMAP_BESTAND = () => path.join(LESMAP_DIR(), 'adressen.json');

function syncData(c) {
  const leerlingen = {};
  for (const k of new Set([...Object.keys(c.adressen), ...Object.keys(c.tijd).filter(k => k !== '_mailbox')])) {
    leerlingen[k] = { adressen: c.adressen[k] || '', aan: !c.uit[k], tijd: Number(c.tijd[k]) || 0 };
  }
  return { mailbox: { van: c.van, naam: c.naam, host: c.host, port: c.port, tijd: Number(c.tijd._mailbox) || 0 }, leerlingen };
}
const syncTekst = d => `${JSON.stringify(d, null, 2)}\n`;

function syncGeldig(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d) || !d.leerlingen || typeof d.leerlingen !== 'object' || Array.isArray(d.leerlingen)) throw new Error('Ongeldig bestand.');
  for (const [k, l] of Object.entries(d.leerlingen)) {
    if (!k || !l || typeof l !== 'object' || typeof l.adressen !== 'string') throw new Error('Ongeldig bestand.');
    if (l.adressen && l.adressen.split(/,\s*/).some(a => !ADRES.test(a))) throw new Error('Ongeldig bestand.');
  }
  if (d.mailbox && (typeof d.mailbox !== 'object' || (d.mailbox.van && !ADRES.test(d.mailbox.van)))) throw new Error('Ongeldig bestand.');
}

// Twee versies samenvoegen: per leerling en voor de mailbox wint de laatste wijziging.
function samen(a, b) {
  const nieuwste = (x, y) => (!x ? y : !y ? x : (Number(y.tijd) || 0) > (Number(x.tijd) || 0) ? y : x);
  const leerlingen = { ...(a.leerlingen || {}) };
  for (const [k, l] of Object.entries(b.leerlingen || {})) leerlingen[k] = nieuwste(leerlingen[k], l);
  return { mailbox: nieuwste(a.mailbox, b.mailbox) || {}, leerlingen };
}
function lesmapSamen(hier, daar) { return syncTekst(samen(JSON.parse(hier), JSON.parse(daar))); }

// Vóór het syncen: wat hier staat in het bestand voor Mijn lesmap zetten (alleen als er iets is).
function naarLesmap() {
  const c = cfg();
  const d = syncData(c);
  if (!Object.keys(d.leerlingen).length && !d.mailbox.tijd) return;
  let oud = '';
  try { oud = fs.readFileSync(LESMAP_BESTAND(), 'utf8'); } catch {}
  // Wat al in het bestand stond (van een andere pc) en hier nog niet verwerkt is, niet overschrijven.
  let text = syncTekst(d);
  try { const o = JSON.parse(oud); syncGeldig(o); text = syncTekst(samen(o, d)); } catch {}
  if (oud === text) return;
  fs.mkdirSync(LESMAP_DIR(), { recursive: true });
  fs.writeFileSync(LESMAP_BESTAND(), text);
}

// Na het syncen: wat nieuwer is dan hier, overnemen. Geeft terug of er iets veranderde.
function uitLesmap() {
  let d;
  try { d = JSON.parse(fs.readFileSync(LESMAP_BESTAND(), 'utf8')); syncGeldig(d); } catch { return false; }
  const c = cfg();
  let anders = false;
  for (const [k, l] of Object.entries(d.leerlingen)) {
    const t = Number(l.tijd) || 0;
    if (t <= (Number(c.tijd[k]) || 0)) continue;
    if (l.adressen) c.adressen[k] = l.adressen; else delete c.adressen[k];
    if (l.adressen && l.aan === false) c.uit[k] = true; else delete c.uit[k];
    c.tijd[k] = t;
    anders = true;
  }
  const m = d.mailbox || {};
  if ((Number(m.tijd) || 0) > (Number(c.tijd._mailbox) || 0)) {
    // Een ander e-mailadres: het wachtwoord van hier hoort daar niet bij.
    if (String(m.van || '') !== c.van) c.pass = '';
    c.van = String(m.van || ''); c.naam = String(m.naam || '');
    c.host = String(m.host || STANDAARD.host); c.port = Number(m.port) || STANDAARD.port;
    c.tijd._mailbox = Number(m.tijd);
    anders = true;
  }
  if (anders) bewaar(c);
  return anders;
}

module.exports = { LESMAP_DIR, syncGeldig, lesmapSamen, naarLesmap, uitLesmap, uitleg, view, zetAfzender, zetAdres, zetLeerling, adresVoor, nodig, toets, test, verstuur, bericht, sleutel, STANDAARD };
