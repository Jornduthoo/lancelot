// De connector: Claude (of een andere AI-assistent) werkt rechtstreeks met LANcelot in plaats van op het scherm te
// klikken. LANcelot is zelf een MCP-server (Model Context Protocol, over HTTP) en heeft dezelfde tools als JSON-routes.
// De tools staan in src/connector-tools.js. Uitleg voor de leerkracht: docs/connector.md.
//
// Veiligheid:
// - Standaard uit. De leerkracht zet de connector aan en maakt zelf een sleutel (Instellingen › Connector). Die sleutel
//   staat maar één keer op het scherm; LANcelot bewaart enkel een hash. Intrekken kan altijd.
// - Standaard alleen lezen. Klaarzetten (toetsen bewaren, taken geven...) mag pas als de leerkracht dat aanvinkt.
// - Elke oproep komt in het logboek (connector/logboek.jsonl), zichtbaar in Instellingen › Connector.
// - De sleutels en de tunnel blijven op deze pc: niet in Mijn lesmap, niet in de back-up-zip.
// - Van buitenaf (Claude op het internet) kan alleen via een tunnel die de leerkracht zelf aanzet. Die tunnel komt op
//   een aparte, kleine server (alleen 127.0.0.1) met enkel de connector: nooit de leerkrachtschermen.
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const gegevens = require('./gegevens');
const tools = require('./connector-tools');
const T = tools.TEKST;

const DIR = () => gegevens.vast('connector');
const FILE = () => path.join(DIR(), 'connector.json');
const LOG = () => path.join(DIR(), 'logboek.jsonl');
const MAX_LOG = 1000;
const PROTOCOL = ['2025-06-18', '2025-03-26', '2024-11-05'];

// ---------- Instellingen ----------

function lees() {
  let d = {};
  try { d = JSON.parse(fs.readFileSync(FILE(), 'utf8')) || {}; } catch {}
  return {
    aan: d.aan === true,
    schrijven: d.schrijven === true,
    sleutels: Array.isArray(d.sleutels) ? d.sleutels.filter(s => s && typeof s.hash === 'string' && typeof s.id === 'string') : [],
    tunnel: d.tunnel === true,
    tunnelToken: typeof d.tunnelToken === 'string' ? d.tunnelToken : '',
    tunnelAdres: typeof d.tunnelAdres === 'string' ? d.tunnelAdres : '',
  };
}
function schrijf(d) {
  fs.mkdirSync(DIR(), { recursive: true });
  fs.writeFileSync(`${FILE()}.tmp`, JSON.stringify(d, null, 2) + '\n');
  fs.renameSync(`${FILE()}.tmp`, FILE());
}

const hash = k => crypto.createHash('sha256').update(String(k)).digest('hex');
const naamSchoon = n => String(n || '').replace(/[\x00-\x1f<>]/g, '').trim().replace(/\s+/g, ' ').slice(0, 40);

// Een nieuwe sleutel: alleen nu te zien. Bewaard wordt enkel de hash.
function maakSleutel(naam) {
  const d = lees();
  const sleutel = `lnc_${crypto.randomBytes(24).toString('base64url')}`;
  const s = { id: crypto.randomBytes(5).toString('hex'), naam: naamSchoon(naam) || 'Claude', hash: hash(sleutel), gemaakt: new Date().toISOString() };
  d.sleutels.push(s);
  schrijf(d);
  log({ actie: 'sleutel', naam: s.naam }, s.naam);
  return { id: s.id, naam: s.naam, sleutel };
}
function trekIn(id) {
  const d = lees();
  const s = d.sleutels.find(x => x.id === id);
  if (!s) throw new Error('Die sleutel bestaat niet meer.');
  if (!s.ingetrokken) s.ingetrokken = new Date().toISOString();
  schrijf(d);
  log({ actie: 'ingetrokken', naam: s.naam }, s.naam);
}
function zet({ aan, schrijven, tunnel, tunnelToken, tunnelAdres } = {}) {
  const d = lees();
  if (typeof aan === 'boolean') d.aan = aan;
  if (typeof schrijven === 'boolean') d.schrijven = schrijven;
  if (typeof tunnel === 'boolean') d.tunnel = tunnel;
  // Een vast adres via een eigen Cloudflare-tunnel: het token (een geheim) komt nooit terug op het scherm.
  if (typeof tunnelToken === 'string' && tunnelToken.trim()) {
    const t = tunnelToken.trim().replace(/^.*--token\s+/, '').replace(/\s.*$/, '');
    if (!/^[A-Za-z0-9_=+/.-]{40,4000}$/.test(t)) throw new Error('Dat is geen geldig tunnel-token. Kopieer het lange token uit Cloudflare.');
    d.tunnelToken = t;
  }
  if (tunnelToken === null) { d.tunnelToken = ''; d.tunnelAdres = ''; }
  if (typeof tunnelAdres === 'string') {
    const a = tunnelAdres.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
    if (a && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(a)) throw new Error('Vul enkel het adres in, bv. bord.mijnschool.be.');
    d.tunnelAdres = a;
  }
  schrijf(d);
  return d;
}

// ---------- Logboek ----------

let logRegels = null;
function logboek(n = 100) {
  if (!logRegels) {
    logRegels = [];
    try {
      for (const r of fs.readFileSync(LOG(), 'utf8').split('\n')) if (r.trim()) try { logRegels.push(JSON.parse(r)); } catch {}
    } catch {}
  }
  return logRegels.slice(-n).reverse();
}
function log(regel, wie) {
  const r = { t: new Date().toISOString(), wie: wie || '', ...regel };
  logboek(1);
  logRegels.push(r);
  try {
    fs.mkdirSync(DIR(), { recursive: true });
    if (logRegels.length > MAX_LOG * 1.5) {
      logRegels = logRegels.slice(-MAX_LOG);
      fs.writeFileSync(LOG(), logRegels.map(x => JSON.stringify(x)).join('\n') + '\n');
    } else fs.appendFileSync(LOG(), JSON.stringify(r) + '\n');
  } catch (err) {
    console.error('Logboek van de connector schrijven mislukt:', err.message);
  }
  naLog(r);
}
let naLog = () => {};

// ---------- Aanmelden ----------

// Te veel foute sleutels kort na elkaar: even niets meer (tegen raden).
let fouten = [];
function sleutelVan(req) {
  const h = String(req.headers.authorization || '');
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  if (m) return m[1];
  if (req.headers['x-lancelot-sleutel']) return String(req.headers['x-lancelot-sleutel']);
  return req.params && req.params.sleutel ? String(req.params.sleutel) : '';
}
let laatstGezien = new Map();
function wie(req) {
  const d = lees();
  if (!d.aan) return { fout: 403, tekst: T.uit };
  const nu = Date.now();
  fouten = fouten.filter(t => nu - t < 60000);
  if (fouten.length >= 20) return { fout: 429, tekst: T.teVeel };
  const k = sleutelVan(req);
  const h = k ? Buffer.from(hash(k), 'hex') : null;
  const s = h && d.sleutels.find(x => !x.ingetrokken && crypto.timingSafeEqual(Buffer.from(x.hash, 'hex'), h));
  if (!s) {
    fouten.push(nu);
    return { fout: 401, tekst: k ? T.ongeldig : T.geen };
  }
  // Wanneer de sleutel laatst gebruikt werd (hooguit eens per minuut wegschrijven).
  if (nu - (laatstGezien.get(s.id) || 0) > 60000) {
    laatstGezien.set(s.id, nu);
    try { const d2 = lees(); const x = d2.sleutels.find(y => y.id === s.id); if (x) { x.laatst = new Date(nu).toISOString(); schrijf(d2); } } catch {}
  }
  return { sleutel: s, schrijven: d.schrijven };
}

// ---------- Tools uitvoeren ----------

const TOOL = new Map(tools.TOOLS.map(t => [t.name, t]));
function toolLijst() {
  return tools.TOOLS.map(t => ({
    name: t.name, title: t.title, description: t.description, inputSchema: t.inputSchema,
    annotations: { title: t.title, readOnlyHint: !t.schrijft, destructiveHint: false, idempotentHint: !t.schrijft, openWorldHint: false },
  }));
}

async function voerUit(naam, args, w) {
  const t = TOOL.get(naam);
  if (!t) throw Object.assign(new Error(T.onbekendeTool(naam)), { onbekend: true });
  if (t.schrijft && !w.schrijven) {
    log({ actie: naam, geweigerd: true }, w.sleutel.naam);
    throw new Error(T.alleenLezen);
  }
  const a = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  if (naam === 'logboek') return { logboek: logboek(Math.min(200, Math.max(1, Number(a.aantal) || 30))) };
  try {
    const uit = await t.fn(a);
    let kort = {};
    try { kort = t.log ? t.log(a, uit) : {}; } catch {}
    log({ actie: naam, ...kort }, w.sleutel.naam);
    return uit;
  } catch (err) {
    log({ actie: naam, fout: String(err.message).slice(0, 200) }, w.sleutel.naam);
    throw err;
  }
}

// ---------- MCP (JSON-RPC 2.0 over HTTP, zonder sessies) ----------

const UITLEG = tools.UITLEG;

async function rpc(msg, w) {
  const antwoord = result => ({ jsonrpc: '2.0', id: msg.id, result });
  const fout = (code, message) => ({ jsonrpc: '2.0', id: msg.id === undefined ? null : msg.id, error: { code, message } });
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fout(-32600, T.verzoek);
  const melding = msg.id === undefined || msg.id === null;
  switch (msg.method) {
    case 'initialize': {
      const gevraagd = msg.params && msg.params.protocolVersion;
      return antwoord({
        protocolVersion: PROTOCOL.includes(gevraagd) ? gevraagd : PROTOCOL[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'lancelot', title: 'LANcelot', version: versie() },
        instructions: UITLEG,
      });
    }
    case 'ping': return antwoord({});
    case 'tools/list': return antwoord({ tools: toolLijst() });
    case 'resources/list': return antwoord({ resources: [] });
    case 'resources/templates/list': return antwoord({ resourceTemplates: [] });
    case 'prompts/list': return antwoord({ prompts: [] });
    case 'tools/call': {
      const p = msg.params || {};
      try {
        const uit = await voerUit(p.name, p.arguments, w);
        const tekst = JSON.stringify(uit, null, 1);
        return antwoord({ content: [{ type: 'text', text: tekst }], ...(uit && typeof uit === 'object' && !Array.isArray(uit) ? { structuredContent: uit } : {}), isError: false });
      } catch (err) {
        if (err.onbekend) return fout(-32602, err.message);
        return antwoord({ content: [{ type: 'text', text: err.message }], isError: true });
      }
    }
    default:
      if (melding || msg.method.startsWith('notifications/')) return null;
      return fout(-32601, T.methode(msg.method));
  }
}

let versie = () => '';

// ---------- De routes ----------

function routes(app, express) {
  const json = express.json({ limit: '40mb' });
  const aanmelden = (req, res) => {
    const w = wie(req);
    if (w.fout) {
      res.status(w.fout).json({ error: w.tekst });
      return null;
    }
    return w;
  };
  const mcp = async (req, res) => {
    const w = aanmelden(req, res);
    if (!w) return;
    const body = req.body;
    if (Array.isArray(body)) {
      const uit = (await Promise.all(body.map(m => rpc(m, w)))).filter(Boolean);
      return uit.length ? res.json(uit) : res.status(202).end();
    }
    const uit = await rpc(body, w);
    if (!uit) return res.status(202).end();
    res.json(uit);
  };
  const geenStream = (req, res) => res.status(405).set('Allow', 'POST').json({ error: T.stream });
  app.post('/mcp', json, mcp);
  app.post('/mcp/:sleutel', json, mcp);
  app.get(['/mcp', '/mcp/:sleutel'], geenStream);
  app.delete(['/mcp', '/mcp/:sleutel'], (req, res) => res.status(405).end());

  // Dezelfde tools als gewone JSON-routes.
  app.get('/api/v1', (req, res) => {
    if (!aanmelden(req, res)) return;
    res.json({ tools: toolLijst() });
  });
  app.post('/api/v1/:tool', json, async (req, res) => {
    const w = aanmelden(req, res);
    if (!w) return;
    try {
      res.json({ ok: true, ...(await voerUit(req.params.tool, req.body, w)) });
    } catch (err) {
      res.status(err.onbekend ? 404 : 400).json({ ok: false, error: err.message });
    }
  });
  // Een JSON-fout in het verzoek: een nette fout in JSON.
  app.use(['/mcp', '/api/v1'], (err, req, res, next) => {
    if (!err) return next();
    res.status(err.status || 400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: err.type === 'entity.too.large' ? T.groot : T.json } });
  });
}

// ---------- De tunnel (van buitenaf bereikbaar) ----------
// Cloudflare Tunnel (cloudflared) maakt een uitgaande verbinding: geen poort openzetten in de schoolrouter.
// Zonder token: een snel adres (…trycloudflare.com) dat verandert als de pc herstart.
// Met een token van een eigen tunnel (gratis Cloudflare-account met een eigen domein): altijd hetzelfde adres.
// De tunnel wijst naar een aparte server op 127.0.0.1 met enkel de connector, nooit naar de leerkrachtschermen.

const POORT = Number(process.env.LANCELOT_CONNECTOR_POORT) || 47821;
const tunnel = { status: 'uit', adres: '', fout: '', proces: null, server: null, pogingen: 0 };
let naTunnel = () => {};

function binNaam() { return process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared'; }
function binPad() {
  if (process.env.LANCELOT_CLOUDFLARED) return process.env.LANCELOT_CLOUDFLARED;
  const eigen = path.join(DIR(), binNaam());
  if (fs.existsSync(eigen)) return eigen;
  for (const p of String(process.env.PATH || '').split(path.delimiter)) {
    const f = path.join(p, binNaam());
    if (p && fs.existsSync(f)) return f;
  }
  return null;
}
// cloudflared van de officiële pagina van Cloudflare (GitHub) halen, één keer, in de map van de connector.
async function haalBinary() {
  // De Store-versie haalt geen programma's van het internet (beleid van de Store): dan installeert de leerkracht cloudflared zelf.
  if (process.platform !== 'win32' || require('./store').ACTIEF) throw new Error('Installeer cloudflared op deze computer (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).');
  const url = `https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-${process.arch === 'ia32' ? '386' : 'amd64'}.exe`;
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`Cloudflare-tunnel downloaden mislukt (fout ${res.status}).`);
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length < 1e6 || data.subarray(0, 2).toString() !== 'MZ') throw new Error('Cloudflare-tunnel downloaden mislukt (geen programma).');
  fs.mkdirSync(DIR(), { recursive: true });
  const doel = path.join(DIR(), binNaam());
  fs.writeFileSync(`${doel}.tmp`, data);
  fs.renameSync(`${doel}.tmp`, doel);
  return doel;
}

function zetTunnel(st) {
  Object.assign(tunnel, st);
  naTunnel(tunnelView());
}
function tunnelView() {
  const d = lees();
  return { aan: d.tunnel, status: tunnel.status, adres: tunnel.adres, fout: tunnel.fout, vast: !!d.tunnelToken, vastAdres: d.tunnelAdres };
}

let appVoorTunnel = null;
function startServer() {
  if (tunnel.server) return Promise.resolve();
  return new Promise((ok, nok) => {
    const s = http.createServer(appVoorTunnel);
    s.once('error', err => nok(new Error(err.code === 'EADDRINUSE' ? `Poort ${POORT} is al in gebruik op deze pc.` : err.message)));
    s.listen(POORT, '127.0.0.1', () => { tunnel.server = s; ok(); });
  });
}

async function startTunnel() {
  const d = lees();
  if (!d.tunnel || tunnel.proces) return;
  zetTunnel({ status: 'start', fout: '', adres: '' });
  try {
    await startServer();
    let bin = binPad();
    if (!bin) bin = await haalBinary();
    if (!lees().tunnel) return stopTunnel();
    const args = d.tunnelToken
      ? ['tunnel', '--no-autoupdate', 'run', '--token', d.tunnelToken]
      : ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${POORT}`];
    const p = spawn(bin, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    tunnel.proces = p;
    const lees2 = buf => {
      const tekst = buf.toString();
      const m = tekst.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (m && !d.tunnelToken) zetTunnel({ status: 'aan', adres: m[0], fout: '' });
      if (/Registered tunnel connection/i.test(tekst)) {
        tunnel.pogingen = 0;
        if (d.tunnelToken) zetTunnel({ status: 'aan', adres: d.tunnelAdres ? `https://${d.tunnelAdres}` : '', fout: '' });
      }
    };
    p.stdout.on('data', lees2);
    p.stderr.on('data', lees2);
    p.on('error', err => zetTunnel({ status: 'fout', fout: err.message }));
    p.on('exit', () => {
      if (tunnel.proces !== p) return;
      tunnel.proces = null;
      if (!lees().tunnel) return zetTunnel({ status: 'uit', adres: '' });
      // Weggevallen (geen internet?): opnieuw proberen, steeds wat later (tot 5 minuten).
      tunnel.pogingen++;
      zetTunnel({ status: 'fout', adres: '', fout: 'De tunnel viel weg. LANcelot probeert het zo opnieuw (internet nodig).' });
      setTimeout(() => startTunnel().catch(() => {}), Math.min(300000, 5000 * 2 ** Math.min(6, tunnel.pogingen))).unref();
    });
  } catch (err) {
    zetTunnel({ status: 'fout', fout: err.message });
  }
}
function stopTunnel() {
  const p = tunnel.proces;
  tunnel.proces = null;
  if (p) try { p.kill(); } catch {}
  if (tunnel.server) { tunnel.server.close(); tunnel.server = null; }
  zetTunnel({ status: 'uit', adres: '', fout: '' });
}
process.on('exit', () => { if (tunnel.proces) try { tunnel.proces.kill(); } catch {} });

// ---------- Voor het scherm ----------

function view(lanAdres) {
  const d = lees();
  return {
    aan: d.aan, schrijven: d.schrijven,
    sleutels: d.sleutels.map(s => ({ id: s.id, naam: s.naam, gemaakt: s.gemaakt, laatst: s.laatst || null, ingetrokken: s.ingetrokken || null })).reverse(),
    lan: lanAdres ? `${lanAdres}/mcp` : '', poort: POORT,
    tunnel: tunnelView(),
    logboek: logboek(50),
  };
}

// server.js: de hooks (bord bijwerken na een wijziging), de versie en wie het scherm bijwerkt.
function init({ express, hooks, versie: v, bijLog, bijTunnel }) {
  tools.init(hooks || {});
  if (v) versie = v;
  if (bijLog) naLog = bijLog;
  if (bijTunnel) naTunnel = bijTunnel;
  appVoorTunnel = express();
  appVoorTunnel.disable('x-powered-by');
  routes(appVoorTunnel, express);
  appVoorTunnel.use((req, res) => res.status(404).json({ error: T.niet }));
  if (lees().tunnel && lees().aan) startTunnel().catch(() => {});
}

function zetEnStart(arg) {
  const voor = lees();
  const d = zet(arg);
  const tunnelAnders = voor.tunnel !== d.tunnel || voor.tunnelToken !== d.tunnelToken;
  if (tunnelAnders) {
    stopTunnel();
    if (d.tunnel && d.aan) startTunnel().catch(() => {});
  } else if (voor.aan !== d.aan) {
    if (!d.aan) stopTunnel();
    else if (d.tunnel) startTunnel().catch(() => {});
  }
  if (voor.aan !== d.aan || voor.schrijven !== d.schrijven) log({ actie: 'instellingen', aan: d.aan, schrijven: d.schrijven });
  return d;
}

module.exports = { DIR, POORT, lees, zet: zetEnStart, maakSleutel, trekIn, logboek, log, wie, rpc, routes, init, view, toolLijst, startTunnel, stopTunnel, tunnelView, presentatieVan: tools.presentatieVan };
