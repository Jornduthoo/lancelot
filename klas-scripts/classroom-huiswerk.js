// Plant de wekelijkse Classroom-huiswerkpost via de Google Classroom API (geen browser nodig).
// Gebruik:  node classroom-huiswerk.js inloggen            (eenmalig, Jorn keurt zelf goed in de browser)
//           node classroom-huiswerk.js post week.json [--droog]
// Vereist Node 18+. Geen npm-pakketten nodig. Zie LEESMIJ.md.
// Nooit overschrijven: bestaat er al een opdracht met dezelfde titel, dan stopt het script.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const MAP = path.join(process.env.APPDATA || process.env.HOME, 'claude-classroom');
// Clientbestand (Google Cloud, Desktop-app): omgevingsvariabele, anders map van het script, map in %APPDATA%, anders Downloads
function zoekClient() {
  const kand = [process.env.CLASSROOM_CLIENT, path.join(__dirname, 'client_secret.json'), path.join(MAP, 'client_secret.json')];
  const dl = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads');
  try { for (const f of fs.readdirSync(dl)) if (/^client_secret.*\.json$/i.test(f)) kand.push(path.join(dl, f)); } catch {}
  return kand.find(p => p && fs.existsSync(p));
}
const TOKEN = path.join(MAP, 'token.json');
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.topics',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');
const KLAS = 'Zesde leerjaar 2026-2027';
const DRIVEMAP = 'Huiswerk Classroom 2026-2027';
const poort = 53682;

const leesJson = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
function client() {
  const p = zoekClient(); if (!p) throw new Error('client_secret*.json niet gevonden (zie LEESMIJ.md stap 1)');
  const c = leesJson(p); return c.installed || c.web;
}
async function tokenAanvraag(params) {
  const c = client();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, ...params }),
  });
  const j = await r.json(); if (!r.ok) throw new Error('Token: ' + JSON.stringify(j)); return j;
}
async function inloggen() {
  const c = client(), verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const redirect = `http://127.0.0.1:${poort}`;
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: c.client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPES,
    access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256',
    login_hint: 'jorn.duthoo@kleurenpalet.be' });
  console.log('Open dit adres in de browser en log in als jorn.duthoo@kleurenpalet.be:\n' + url);
  try { require('child_process').exec(`start "" "${url}"`); } catch {}
  const code = await new Promise((ok, nok) => {
    const s = http.createServer((q, a) => {
      const u = new URL(q.url, redirect); const cd = u.searchParams.get('code');
      a.end(cd ? 'Gelukt, dit venster mag dicht.' : 'Mislukt.'); s.close();
      cd ? ok(cd) : nok(new Error(u.searchParams.get('error') || 'geen code'));
    }).listen(poort, '127.0.0.1');
  });
  const t = await tokenAanvraag({ code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect });
  t.verloopt = Date.now() + t.expires_in * 1000; fs.mkdirSync(MAP, { recursive: true }); fs.writeFileSync(TOKEN, JSON.stringify(t, null, 2));
  console.log('Ingelogd; token bewaard in ' + TOKEN);
}
async function toegang() {
  if (!fs.existsSync(TOKEN)) throw new Error('Eerst: node classroom-huiswerk.js inloggen');
  let t = leesJson(TOKEN);
  if (Date.now() > t.verloopt - 60000) {
    const n = await tokenAanvraag({ refresh_token: t.refresh_token, grant_type: 'refresh_token' });
    t = { ...t, ...n, verloopt: Date.now() + n.expires_in * 1000 }; fs.writeFileSync(TOKEN, JSON.stringify(t, null, 2));
  }
  return t.access_token;
}
async function api(url, opt = {}) {
  const r = await fetch(url, { ...opt, headers: { Authorization: 'Bearer ' + await toegang(), ...(opt.headers || {}) } });
  const tekst = await r.text(); if (!r.ok) throw new Error(`${r.status} ${url}\n${tekst}`);
  return tekst ? JSON.parse(tekst) : {};
}
const CR = 'https://classroom.googleapis.com/v1';
const jsonOpt = (m, b) => ({ method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

async function driveMap() {
  const q = encodeURIComponent(`name='${DRIVEMAP}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const l = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`);
  if (l.files.length) return l.files[0].id;
  const m = await api('https://www.googleapis.com/drive/v3/files?fields=id',
    jsonOpt('POST', { name: DRIVEMAP, mimeType: 'application/vnd.google-apps.folder' })); return m.id;
}
async function upload(bestand, map, driveNaam) {
  const naam = driveNaam || path.basename(bestand);
  const q = encodeURIComponent(`name='${naam.replace(/'/g, "\\'")}' and '${map}' in parents and trashed=false`);
  const bestaat = await api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`);
  if (bestaat.files.length) return bestaat.files[0].id;          // nooit dubbel uploaden/overschrijven
  const grens = 'b' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify({ name: naam, parents: [map] });
  const inhoud = fs.readFileSync(bestand);
  const mime = bestand.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
  const body = Buffer.concat([
    Buffer.from(`--${grens}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${grens}\r\nContent-Type: ${mime}\r\n\r\n`),
    inhoud, Buffer.from(`\r\n--${grens}--`)]);
  const r = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
    { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${grens}` }, body });
  return r.id;
}

async function post(weekBestand, droog) {
  const w = leesJson(weekBestand);   // { titel, tekst, onderwerp, plan, links:[{url,titel}], bestanden:[{pad,naam}] }
  const cur = await api(`${CR}/courses?courseStates=ACTIVE&pageSize=100`);
  const klas = (cur.courses || []).find(c => c.name.trim() === KLAS);
  if (!klas) throw new Error('Klas niet gevonden: ' + KLAS);
  const bestaand = [];
  for (const st of ['DRAFT', 'PUBLISHED']) {
    const l = await api(`${CR}/courses/${klas.id}/courseWork?courseWorkStates=${st}&pageSize=100`);
    bestaand.push(...(l.courseWork || []));
  }
  if (bestaand.some(c => c.title === w.titel)) { console.log(`Bestaat al, niets gedaan: "${w.titel}"`); return; }
  const onderwerpNaam = w.onderwerp || '🏠 HUISWERK';
  const tl = await api(`${CR}/courses/${klas.id}/topics?pageSize=100`);
  const sleutel = (w.onderwerp ? w.onderwerp.replace(/[^\p{L}\p{N} ]/gu, '').trim() : 'HUISWERK').toUpperCase();
  let topic = (tl.topic || []).find(t => t.name.toUpperCase().includes(sleutel));
  const tijd = w.plan ? new Date(w.plan).toISOString() : null;   // geen plan = direct plaatsen
  if (droog) { console.log('DROOG: zou plannen', w.titel, 'op', tijd, 'met', (w.bestanden || []).length, 'bestanden,', (w.links || []).length, 'links; onderwerp', topic ? topic.name : '(nieuw) ' + onderwerpNaam); return; }
  if (!topic) topic = await api(`${CR}/courses/${klas.id}/topics`, jsonOpt('POST', { name: onderwerpNaam }));
  const map = await driveMap();
  const materials = [];
  // Sjabloon-spreadsheet kopiëren (Snelle werkers): kopie met nieuwe titel, cellen invullen, vinkjes leegmaken
  if (w.sjabloon) {
    const k = await api(`https://www.googleapis.com/drive/v3/files/${w.sjabloon}/copy?fields=id`, jsonOpt('POST', { name: w.sheetTitel || w.titel }));
    const sh = await api(`https://sheets.googleapis.com/v4/spreadsheets/${k.id}?fields=sheets.properties.title`);
    const blad = sh.sheets[0].properties.title, q = `'${blad.replace(/'/g, "''")}'!`;
    const data = Object.entries(w.cellen || {}).map(([c, v]) => ({ range: q + c, values: Array.isArray(v) ? v : [[v]] }));
    const leeg = r => { const [a, b] = r.split(':'); const rij = +b.replace(/\D/g, '') - +a.replace(/\D/g, '') + 1, kol = b.charCodeAt(0) - a.charCodeAt(0) + 1;
      return { range: q + r, values: Array.from({ length: rij }, () => Array(kol).fill(false)) }; };
    data.push(leeg('F4:R8'), leeg('F11:R11'));
    await api(`https://sheets.googleapis.com/v4/spreadsheets/${k.id}/values:batchUpdate`, jsonOpt('POST', { valueInputOption: 'USER_ENTERED', data }));
    materials.push({ driveFile: { driveFile: { id: k.id }, shareMode: 'EDIT' } });
    console.log('Sheet gekopieerd: https://docs.google.com/spreadsheets/d/' + k.id);
  }
  for (const b of w.bestanden || []) {
    const id = await upload(b.pad, map, b.naam); materials.push({ driveFile: { driveFile: { id } } });
  }
  for (const l of w.links || []) materials.push({ link: { url: l.url, title: l.titel } });
  const r = await api(`${CR}/courses/${klas.id}/courseWork`, jsonOpt('POST', {
    title: w.titel, description: w.tekst, workType: 'ASSIGNMENT', state: tijd ? 'DRAFT' : 'PUBLISHED', scheduledTime: tijd || undefined,
    topicId: topic.topicId, materials, maxPoints: w.punten ?? undefined, assigneeMode: 'ALL_STUDENTS' }));
  console.log(`${tijd ? 'Gepland' : 'Geplaatst'}: "${r.title}" ${tijd ? 'op ' + tijd : ''} (${r.alternateLink})`);
}

(async () => {
  const [, , cmd, a, b] = process.argv;
  if (cmd === 'inloggen') return inloggen();
  if (cmd === 'post' && a) return post(a, b === '--droog');
  console.log('Gebruik: inloggen | post week.json [--droog]');
})().catch(e => { console.error('FOUT:', e.message); process.exit(1); });
