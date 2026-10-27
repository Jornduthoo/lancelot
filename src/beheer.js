// Beheer op het docentenscherm: waar de gegevens staan, back-ups, bijwerken, eigen posters, de eerste-keer-wizard en de firewall.
// Alles wat de bestanden echt omgooit (verhuizen, terugzetten, bijwerken), gebeurt pas bij de volgende start van LANcelot.
const fs = require('fs');
const path = require('path');
const express = require('express');
const { execFile } = require('child_process');
const gegevens = require('./gegevens');
const bijwerken = require('./bijwerken');
const settings = require('./settings');
const klas = require('./klas');

const POSTERS = gegevens.pad('posters');
const MAX_POSTERS = 40;
const POSTER_NAAM = /^[\w.-]+\.(png|jpe?g|webp|gif)$/i;

function openMap(dir) {
  fs.mkdirSync(dir, { recursive: true });
  if (process.platform === 'win32') execFile('explorer', [dir]);
}

function posters() {
  try { return fs.readdirSync(POSTERS).filter(f => POSTER_NAAM.test(f)).sort(); } catch { return []; }
}

// Een poster komt al verkleind (600 x 600) uit de browser. Hier alleen nakijken dat het echt een foto is.
function posterErbij(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data || []);
  if (buf.length > 800 * 1024) throw new Error('Die foto is te groot.');
  const jpg = buf[0] === 0xff && buf[1] === 0xd8;
  const webp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  if (!jpg && !webp) throw new Error('Dat is geen foto.');
  const lijst = posters();
  if (lijst.length >= MAX_POSTERS) throw new Error(`Er hangen al ${MAX_POSTERS} posters. Haal er eerst een weg.`);
  let n = 1;
  while (lijst.some(f => f.replace(/\.\w+$/, '') === `poster-${n}`)) n++;
  const file = `poster-${n}.${jpg ? 'jpg' : 'webp'}`;
  fs.mkdirSync(POSTERS, { recursive: true });
  fs.writeFileSync(path.join(POSTERS, file), buf);
  return file;
}

function posterWeg(file) {
  if (!POSTER_NAAM.test(String(file || ''))) throw new Error('Onbekende poster.');
  fs.rmSync(path.join(POSTERS, file), { force: true });
}

// De eerste keer: nog geen klaslijst, geen sleutel en de wizard nooit afgerond.
function welkomNodig() {
  const s = settings.read();
  return !s.welkom && !s.geminiKey && !s.claudeKey && !s.openaiKey && klas.read().leerlingen.length === 0;
}

// PowerShell-opdrachten gaan gecodeerd mee, zodat paden met spaties of aanhalingstekens niets kapotmaken.
const psCode = script => Buffer.from(script, 'utf16le').toString('base64');
const psTekst = t => `'${String(t).replace(/'/g, "''")}'`;

// Windows Firewall: één regel die leerlingen binnenlaat op de poorten van LANcelot. Dit is het enige dat
// beheerdersrechten vraagt: Windows vraagt zelf één keer toestemming. Weigerde iemand ooit het venster van Windows
// voor Node.js, dan staat er een blokkeerregel die alles tegenhoudt: die gaat er ook af.
function firewall(port, cb) {
  if (process.platform !== 'win32') return cb({ error: 'Dit kan alleen op Windows.' });
  const poorten = port >= 3000 && port <= 3010 ? '3000-3010' : String(Number(port));
  const regel = [
    `Get-NetFirewallApplicationFilter -Program ${psTekst(process.execPath)} -ErrorAction SilentlyContinue | Get-NetFirewallRule | Where-Object { $_.Action -eq 'Block' -and $_.Direction -eq 'Inbound' } | Remove-NetFirewallRule`,
    `Remove-NetFirewallRule -DisplayName 'LANcelot' -ErrorAction SilentlyContinue`,
    `New-NetFirewallRule -DisplayName 'LANcelot' -Direction Inbound -Protocol TCP -LocalPort ${poorten} -Action Allow -Profile Any | Out-Null`,
  ].join('; ');
  const ps = `$p = Start-Process powershell -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList '-NoProfile','-EncodedCommand','${psCode(regel)}'; exit $p.ExitCode`;
  execFile('powershell', ['-NoProfile', '-Command', ps], { windowsHide: true }, err => {
    cb(err ? { error: 'Het lukte niet. Klikte je op Ja toen Windows om toestemming vroeg?' } : { ok: true });
  });
}

// Een snelkoppeling op het bureaublad en in het startmenu (zonder beheerdersrechten). De installer maakt ze later zelf.
function snelkoppeling(cb) {
  if (process.platform !== 'win32') return cb({ error: 'Dit kan alleen op Windows.' });
  const app = gegevens.APP;
  const script = [
    '$s = New-Object -ComObject WScript.Shell',
    "foreach ($d in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {",
    "  $l = $s.CreateShortcut((Join-Path $d 'LANcelot.lnk'))",
    `  $l.TargetPath = ${psTekst(path.join(app, 'Start LANcelot.bat'))}`,
    `  $l.WorkingDirectory = ${psTekst(app)}`,
    `  $l.IconLocation = ${psTekst(path.join(app, 'public', 'img', 'lancelot.ico'))}`,
    "  $l.Description = 'LANcelot starten'",
    '  $l.Save()',
    '}',
  ].join('\n');
  execFile('powershell', ['-NoProfile', '-EncodedCommand', psCode(script)], { windowsHide: true }, err => {
    cb(err ? { error: `De snelkoppeling maken lukte niet: ${err.message.split('\n')[0]}` } : { ok: true });
  });
}

function routes(app, isLeerkracht) {
  // Een back-up downloaden: alles van de klas in één zip (zonder de Gemini-sleutel).
  app.get('/back-up', (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).end();
    try {
      const buf = gegevens.maakBackup();
      res.attachment(`LANcelot-back-up_${gegevens.stempel()}.zip`);
      res.type('application/zip').send(buf);
    } catch (err) {
      res.status(500).type('text/plain; charset=utf-8').send(`Back-up maken lukte niet: ${err.message}`);
    }
  });
  // Een bewaarde back-up uit de map back-ups.
  app.get('/back-up/:file', (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).end();
    const file = String(req.params.file);
    if (!/^[\w.-]+\.zip$/.test(file)) return res.status(404).end();
    res.download(path.join(gegevens.backupDir(), file), err => err && !res.headersSent && res.status(404).end());
  });
  // Een back-up terugzetten: klaarzetten voor de volgende start.
  app.post('/back-up/terugzetten', express.raw({ type: () => true, limit: '500mb' }), (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).end();
    try {
      res.json({ ok: true, ...gegevens.zetKlaar(req.body), ...gegevens.view() });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  // Bijwerken met een zip-bestand: klaarzetten voor de volgende start.
  app.post('/bijwerken/bestand', express.raw({ type: () => true, limit: '300mb' }), (req, res) => {
    if (!isLeerkracht(req)) return res.status(403).end();
    try {
      res.json({ ok: true, ...bijwerken.uitBestand(req.body, req.query.naam) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}

function host(socket, { port, extern }) {
  const handle = fn => (arg, cb) => {
    Promise.resolve().then(() => fn(arg)).then(r => cb && cb({ ok: true, ...(r || {}) }), err => cb && cb({ error: err.message }));
  };
  socket.emit('welkom-nodig', welkomNodig());
  socket.on('welkom-klaar', handle(() => { settings.write({ welkom: true }); }));
  socket.on('gegevens-get', handle(() => gegevens.view()));
  socket.on('gegevens-kies', handle(map => { gegevens.kiesMap(map); return gegevens.view(); }));
  socket.on('gegevens-open', () => openMap(gegevens.DATA));
  socket.on('backups-open', () => openMap(gegevens.backupDir()));
  socket.on('backup-nu', handle(() => ({ file: gegevens.bewaar('hand'), ...gegevens.view() })));
  socket.on('terugzetten-annuleer', handle(() => { gegevens.annuleerTerugzetten(); return gegevens.view(); }));
  socket.on('update-get', handle(() => bijwerken.view()));
  socket.on('update-zoek', handle(() => bijwerken.zoek()));
  socket.on('update-download', handle(() => bijwerken.download()));
  socket.on('update-annuleer', handle(() => bijwerken.annuleer()));
  socket.on('update-bron', handle(url => bijwerken.kiesBron(url)));
  const posterView = () => ({ posters: posters(), max: MAX_POSTERS, aan: settings.read().posters !== false, grappig: settings.read().grappigePosters !== false });
  socket.on('posters-get', handle(posterView));
  socket.on('poster-add', handle(data => { posterErbij(data); return posterView(); }));
  socket.on('poster-del', handle(file => { posterWeg(file); return posterView(); }));
  socket.on('posters-aan', handle(aan => { settings.write({ posters: aan !== false }); return posterView(); }));
  socket.on('posters-grappig', handle(aan => { settings.write({ grappigePosters: aan !== false }); return posterView(); }));
  // Op een gekoppelde bureau-pc zou dit op het digibord gebeuren: daar doe je het beter zelf.
  const opBord = { error: 'Dit doe je op het digibord zelf (de pc waar LANcelot draait).' };
  socket.on('firewall-zet', (_, cb) => (extern ? cb && cb(opBord) : firewall(port, r => cb && cb(r))));
  socket.on('snelkoppeling', (_, cb) => (extern ? cb && cb(opBord) : snelkoppeling(r => cb && cb(r))));
}

module.exports = { routes, host };
