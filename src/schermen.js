// Een tweede leerkrachtscherm: de bureau-pc (of een laptop) koppelen aan LANcelot op het digibord.
// Het bord toont een koppelcode van 6 cijfers. Wie die op /koppel intikt, krijgt een geheime sleutel in een cookie
// en mag daarna overal waar de leerkracht mag. Leerlingen kunnen dat niet: de code geldt 10 minuten, één keer,
// en na 5 foute pogingen vervalt ze. Een gekoppeld scherm is altijd weer te ontkoppelen.
const fs = require('fs');
const crypto = require('crypto');
const gegevens = require('./gegevens');

const FILE = gegevens.pad('schermen.json');
const COOKIE = 'lancelot-scherm';
const GELDIG = 10 * 60 * 1000;
const MAX_FOUT = 5;
const MAX_SCHERMEN = 10;

let code = null; // { code, tot, fout }
let lijstCache = null;

function hash(sleutel) {
  return crypto.createHash('sha256').update(String(sleutel)).digest('hex');
}

function lees() {
  if (lijstCache) return lijstCache;
  try {
    const l = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    lijstCache = Array.isArray(l) ? l : [];
  } catch {
    lijstCache = [];
  }
  return lijstCache;
}

function schrijf(l) {
  lijstCache = l;
  fs.writeFileSync(FILE, JSON.stringify(l, null, 2) + '\n');
}

// Een nieuwe code: de vorige vervalt meteen.
function nieuweCode() {
  code = { code: String(crypto.randomInt(0, 1e6)).padStart(6, '0'), tot: Date.now() + GELDIG, fout: 0 };
  return codeView();
}

function codeView() {
  if (!code || Date.now() > code.tot) return null;
  return { code: code.code, tot: code.tot };
}

function stopCode() {
  code = null;
}

// De bureau-pc tikt de code in. Lukt het, dan krijgt hij een sleutel die alleen hij kent.
function koppel(ingetikt, naam, ip) {
  if (!code || Date.now() > code.tot) throw new Error('Er is geen geldige koppelcode. Vraag een nieuwe code op het digibord.');
  if (String(ingetikt || '').replace(/\D/g, '') !== code.code) {
    if (++code.fout >= MAX_FOUT) code = null;
    throw new Error(code ? 'Die code klopt niet. Kijk nog eens op het digibord.' : 'Te veel foute pogingen. Vraag een nieuwe code op het digibord.');
  }
  code = null;
  const sleutel = crypto.randomBytes(32).toString('hex');
  const l = lees().slice(-(MAX_SCHERMEN - 1));
  const scherm = {
    id: crypto.randomBytes(6).toString('hex'),
    naam: String(naam || '').trim().slice(0, 40) || 'Bureau-pc',
    hash: hash(sleutel),
    ip: String(ip || '').replace(/^::ffff:/, ''),
    sinds: new Date().toISOString(),
    laatst: new Date().toISOString(),
  };
  schrijf([...l, scherm]);
  return { sleutel, scherm };
}

// Welk gekoppeld scherm hoort bij deze cookies? Zo niet: null.
function uitCookie(cookieHeader) {
  const m = new RegExp(`(?:^|;\\s*)${COOKIE}=([a-f0-9]{64})`).exec(String(cookieHeader || ''));
  if (!m) return null;
  const h = hash(m[1]);
  const scherm = lees().find(s => s.hash === h);
  if (!scherm) return null;
  // Hooguit één keer per uur wegschrijven wanneer het scherm laatst kwam.
  if (Date.now() - Date.parse(scherm.laatst || 0) > 3600e3) {
    scherm.laatst = new Date().toISOString();
    try { schrijf(lees()); } catch {}
  }
  return scherm;
}

function ontkoppel(id) {
  const l = lees();
  if (!l.some(s => s.id === id)) throw new Error('Dat scherm is al ontkoppeld.');
  schrijf(l.filter(s => s.id !== id));
}

function lijst() {
  return lees().map(({ id, naam, ip, sinds, laatst }) => ({ id, naam, ip, sinds, laatst }));
}

module.exports = { COOKIE, nieuweCode, codeView, stopCode, koppel, uitCookie, ontkoppel, lijst };
