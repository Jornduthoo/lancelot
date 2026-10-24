const fs = require('fs');
const http = require('http');
const os = require('os');
const dgram = require('dgram');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { Game } = require('./src/game');
const QRCode = require('qrcode');
const quizzes = require('./src/quizzes');
const rondetafel = require('./src/rondetafel');
const { Toren } = require('./src/toren');
const { Schat } = require('./src/schat');
const { Laserslag } = require('./src/laserslag');
const { Ridderrace } = require('./src/ridderrace');
const { Kristalroof } = require('./src/kristalroof');
const { Burcht } = require('./src/burcht');
const { Duel } = require('./src/duel');
const { PacKnight } = require('./src/packnight');
const { Strijdrossen } = require('./src/strijdrossen');
const { NeonDuel } = require('./src/neonduel');
const { LeraarBaas } = require('./src/leraarbaas');
const { Gauntlet } = require('./src/gauntlet');
const { Royale } = require('./src/royale');
const rijken = require('./src/rijk');
const avatars = require('./src/avatars');
const { Verrader } = require('./src/verrader');
const oefenbladen = require('./src/oefenbladen');
const { OefenbladLive } = require('./src/oefenblad-live');
const settings = require('./src/settings');
const klas = require('./src/klas');
const doelen = require('./src/doelen');
const logboek = require('./src/logboek');
const results = require('./src/results');
const { execFile } = require('child_process');
const { generateQuiz } = require('./src/gemini');

const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
// Ruim genoeg voor lesstof (screenshots en pdf's) die naar Gemini gaat.
const io = new Server(server, { maxHttpBufferSize: 30e6 });
const game = new Game(io, g => {
  const file = results.save(g);
  io.to('host').emit('results', results.list());
  return file;
});
const rt = new rondetafel.RondeTafel(io, r => {
  const file = results.saveRondeTafel(r);
  io.to('host').emit('results', results.list());
  return file;
});
const toren = new Toren(io, t => {
  const file = results.saveToren(t);
  io.to('host').emit('results', results.list());
  return file;
});

const schat = new Schat(io, s => {
  const file = results.saveSchat(s);
  io.to('host').emit('results', results.list());
  return file;
});

const laserslag = new Laserslag(io, l => {
  const file = results.saveLaserslag(l);
  io.to('host').emit('results', results.list());
  return file;
});

const race = new Ridderrace(io, r => {
  const file = results.saveRace(r);
  io.to('host').emit('results', results.list());
  return file;
});

const roof = new Kristalroof(io, k => {
  const file = results.saveRoof(k);
  io.to('host').emit('results', results.list());
  return file;
});

const verrader = new Verrader(io, v => {
  const file = results.saveVerrader(v);
  io.to('host').emit('results', results.list());
  return file;
});

const burcht = new Burcht(io, b => {
  const file = results.saveBurcht(b);
  io.to('host').emit('results', results.list());
  return file;
});

const duel = new Duel(io, d => {
  const file = results.saveDuel(d);
  io.to('host').emit('results', results.list());
  return file;
});

const knight = new PacKnight(io, k => {
  const file = results.saveKnight(k);
  io.to('host').emit('results', results.list());
  return file;
});

const rossen = new Strijdrossen(io, r => {
  const file = results.saveRossen(r);
  io.to('host').emit('results', results.list());
  return file;
});

const neon = new NeonDuel(io, d => {
  const file = results.saveNeon(d);
  io.to('host').emit('results', results.list());
  return file;
});

const gauntlet = new Gauntlet(io, g => {
  const file = g.save();
  io.to('host').emit('results', results.list());
  return file;
});

const baas = new LeraarBaas(io, b => {
  const file = results.saveBaas(b);
  io.to('host').emit('results', results.list());
  return file;
});

const royale = new Royale(io, r => {
  const file = r.save();
  io.to('host').emit('results', results.list());
  return file;
});

const rijk = new rijken.Rijk(io, r => {
  const file = results.saveRijk(r);
  io.to('host').emit('results', results.list());
  return file;
});

const oefenblad = new OefenbladLive(io, o => {
  const file = results.saveOefenblad(o);
  io.to('host').emit('results', results.list());
  return file;
});

// Er loopt altijd hooguit één spel tegelijk.
const busyError = message => Object.assign(new Error(message), { busy: true });

// Alles stoppen wat nog loopt (behalve het spel dat je wil starten). De resultaten worden bewaard zoals bij Stop.
function stopOthers(except) {
  const all = { toernooi: game, rondetafel: rt, toren, schat, laserslag, race, roof, verrader, burcht, duel, knight, rossen, gauntlet, royale, neon, baas, rijk, oefenblad };
  for (const [key, mod] of Object.entries(all)) {
    if (key === except) continue;
    if (key === 'toernooi' ? game.phase !== 'idle' : mod.active) mod.stop();
  }
}

function busyWith(except) {
  if (except !== 'toernooi' && game.phase !== 'idle') return 'Er loopt nog een toernooi. Stop dat eerst.';
  if (except !== 'rondetafel' && rt.active) return 'De Ronde Tafel loopt nog. Stop die eerst.';
  if (except !== 'toren' && toren.active) return 'De prinses in de toren loopt nog. Stop dat spel eerst.';
  if (except !== 'schat' && schat.active) return 'Schattenjacht loopt nog. Stop dat spel eerst.';
  if (except !== 'laserslag' && laserslag.active) return 'Laserslag loopt nog. Stop dat spel eerst.';
  if (except !== 'race' && race.active) return 'De Ridderrace loopt nog. Stop die eerst.';
  if (except !== 'roof' && roof.active) return 'Kristalroof loopt nog. Stop dat spel eerst.';
  if (except !== 'verrader' && verrader.active) return 'De Verrader loopt nog. Stop dat spel eerst.';
  if (except !== 'burcht' && burcht.active) return 'Burchtbouwers loopt nog. Stop dat spel eerst.';
  if (except !== 'duel' && duel.active) return 'Duel in de arena loopt nog. Stop dat eerst.';
  if (except !== 'knight' && knight.active) return 'Pac-Knight loopt nog. Stop dat spel eerst.';
  if (except !== 'rossen' && rossen.active) return 'Strijdrossen loopt nog. Stop dat spel eerst.';
  if (except !== 'neon' && neon.active) return 'Neon Duel loopt nog. Stop dat spel eerst.';
  if (except !== 'baas' && baas.active) return 'Leraar-baas loopt nog. Stop dat spel eerst.';
  if (except !== 'gauntlet' && gauntlet.active) return 'Gauntlet loopt nog. Stop dat spel eerst.';
  if (except !== 'royale' && royale.active) return 'Ridder-Royale loopt nog. Stop dat spel eerst.';
  if (except !== 'rijk' && rijk.active) return 'Het Rijk loopt nog. Stop dat spel eerst.';
  if (except !== 'oefenblad' && oefenblad.active) return 'Er staat nog een oefenblad open. Sluit dat eerst.';
  return null;
}

// Quizzen, oefenbladen en Ronde Tafel-sessies: lijst en mappen werken overal hetzelfde.
const LIBS = {
  quiz: { mod: quizzes, list: 'quizzes', folders: 'quiz-folders' },
  oefenblad: { mod: oefenbladen, list: 'ob-sheets', folders: 'ob-folders' },
  sessie: { mod: rondetafel, list: 'rt-sessions', folders: 'rt-folders' },
};

function sendLibrary(kind, target = io.to('host')) {
  const l = LIBS[kind];
  target.emit(l.folders, l.mod.lib.folders());
  target.emit(l.list, l.mod.list());
}

// Het docentenscherm werkt alleen op de pc waar de server draait.
function isLocal(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

for (const [route, page] of [['/host', 'host.html'], ['/rondetafel', 'rondetafel.html'], ['/toren', 'toren.html'], ['/schattenjacht', 'schattenjacht.html'], ['/laserslag', 'laserslag.html'], ['/ridderrace', 'ridderrace.html'], ['/kristalroof', 'kristalroof.html'], ['/verrader', 'verrader.html'], ['/burchtbouwers', 'burchtbouwers.html'], ['/duel', 'duel.html'], ['/packnight', 'packnight.html'], ['/strijdrossen', 'strijdrossen.html'], ['/gauntlet', 'gauntlet.html'], ['/ridder-royale', 'royale.html'], ['/neonduel', 'neonduel.html'], ['/leraarbaas', 'leraarbaas.html'], ['/rijk', 'rijk.html'], ['/oefenblad', 'oefenblad.html'], ['/oefenblad-print', 'oefenblad-print.html'], ['/klas', 'klas.html']]) {
  app.get(route, (req, res) => {
    if (!isLocal(req.socket.remoteAddress)) return res.status(403).send('Het docentenscherm is alleen bereikbaar op de pc van de leerkracht.');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(__dirname, 'public', page));
  });
}
// Resultaten downloaden kan alleen op de pc van de leerkracht.
app.get('/resultaten/:file', (req, res) => {
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).end();
  try {
    res.download(results.filePath(req.params.file));
  } catch {
    res.status(404).end();
  }
});
// Exporteren: één item (?file=), een map (?folder=) of alles, als bestand om op een andere pc te importeren.
app.get('/export/:kind', (req, res) => {
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).end();
  const l = LIBS[req.params.kind];
  if (!l) return res.status(404).end();
  try {
    const { name, bundle } = l.mod.lib.exportBundle({ file: req.query.file, folder: req.query.folder });
    res.attachment(name);
    res.type('application/json').send(JSON.stringify(bundle, null, 2));
  } catch (err) {
    res.status(400).type('text/plain; charset=utf-8').send(err.message);
  }
});
// Altijd even navragen of een bestand veranderd is, zodat gsm's en Chromebooks na een update meteen de nieuwe versie hebben.
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', setHeaders: res => res.setHeader('Cache-Control', 'no-cache') }));

// Virtuele netwerkkaarten (WSL, VirtualBox, VPN, hotspot, gsm via usb) komen achteraan, want leerlingen kunnen die meestal niet bereiken.
const VIRTUAL = /vethernet|virtualbox|vmware|wsl|docker|hyper-v|tailscale|zerotier|vpn|nordlynx|wireguard|openvpn|tap-|bluetooth|loopback|lokale verbinding\*|local area connection\*|rndis|remote ndis|tether|hotspot/i;
const REAL = /wi-?fi|wlan|wireless|draadloos|ethernet|^eth|^en/i;

// Het adres waarlangs Windows naar buiten gaat (de standaardroute). Een UDP-'verbinding' verstuurt niets,
// maar vertelt wel welke netwerkkaart het systeem kiest. Dat is bijna altijd het echte wifi- of kabelnetwerk.
let routeAddress = '';
function probeRoute() {
  const sock = dgram.createSocket('udp4');
  sock.on('error', () => sock.close());
  try {
    sock.connect(53, '8.8.8.8', err => {
      if (!err) {
        try { routeAddress = sock.address().address; } catch {}
      }
      sock.close();
    });
  } catch {
    sock.close();
  }
}
probeRoute();
setInterval(probeRoute, 60000).unref();

// Hoe kleiner het getal, hoe eerder het adres op het bord komt.
// Eerst het adres waarlangs leerlingen echt binnenkwamen (of dat de leerkracht koos), dan de standaardroute.
function rank(i, preferred) {
  if (i.address === preferred) return -10;
  let score = 0;
  if (i.address === routeAddress) score -= 4;
  if (VIRTUAL.test(i.name)) score += 10;
  else if (REAL.test(i.name)) score -= 2;
  // Windows-hotspot (192.168.137.x) en gsm-tethering (192.168.42.x, 192.168.225.x, 172.20.10.x) zijn zelden het schoolnetwerk.
  if (/^192\.168\.(137|42|225)\.|^172\.20\.10\./.test(i.address)) score += 5;
  return score;
}

function lanInterfaces() {
  const preferred = settings.read().preferredAddress;
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, list]) => (list || []).map(i => ({ name, ...i })))
    .filter(i => i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
    .sort((a, b) => rank(a, preferred) - rank(b, preferred));
}

function lanAddresses() {
  return lanInterfaces().map(i => i.address);
}

// Adressen met QR-code voor het docentenscherm. Het eerste is het grote adres op het bord.
function sendAddresses(target) {
  const list = lanInterfaces();
  const preferred = settings.read().preferredAddress;
  const urls = list.map(i => `http://${i.address}:${PORT}`);
  return Promise.all(urls.map(url => QRCode.toString(url, { type: 'svg', margin: 1 })))
    .then(qrs => target.emit('addresses', urls.map((url, k) => ({ url, qr: qrs[k], name: list[k].name, sure: list[k].address === preferred }))));
}

io.on('connection', socket => {
  // De namen op de klaslijst, om bij het aanmelden aan te tikken. Meteen meesturen, nog voor de stand van
  // een spel: zo weet de leerling al of een onthouden naam op de lijst staat voordat hij automatisch meedoet.
  socket.emit('klas-namen', klas.names());
  socket.on('klas-namen', (_, cb) => typeof cb === 'function' && cb(klas.names()));
  const host = socket.handshake.query.role === 'host' && isLocal(socket.handshake.address);

  // Een leerling kwam binnen: via welk adres van deze pc? Dat adres werkt dus, en komt voortaan vooraan.
  if (!isLocal(socket.handshake.address)) {
    const local = String(socket.request.socket.localAddress || '').replace(/^::ffff:/, '');
    if (local && local !== settings.read().preferredAddress && lanAddresses().includes(local)) {
      settings.write({ preferredAddress: local });
      sendAddresses(io.to('host'));
    }
  }

  // Eigen ridders: iedereen mag ze zien, een leerling stelt de zijne in.
  socket.on('avatars-get', (_, cb) => typeof cb === 'function' && cb(avatars.all()));
  socket.on('avatar-set', ({ name, avatar } = {}) => {
    if (avatars.set(name, avatar)) io.emit('avatars', avatars.all());
  });



  if (host) {
    socket.join('host');
    for (const kind of Object.keys(LIBS)) sendLibrary(kind, socket);
    sendAddresses(socket);
    // De leerkracht kiest het adres dat werkt; dat onthouden we voor de volgende keer.
    socket.on('choose-address', address => {
      if (!lanAddresses().includes(address)) return;
      settings.write({ preferredAddress: address });
      sendAddresses(io.to('host'));
    });
    socket.emit('settings', settings.publicView());
    socket.emit('results', results.list());
    socket.on('open-results-folder', () => {
      fs.mkdirSync(results.DIR, { recursive: true });
      if (process.platform === 'win32') execFile('explorer', [results.DIR]);
    });
    socket.emit('state', game.hostState());
    socket.emit('rt-state', rt.hostState());
    socket.emit('tw-state', toren.hostState());
    socket.emit('sj-state', schat.hostState());
    socket.emit('ls-state', laserslag.hostState());
    socket.emit('rr-state', race.hostState());
    socket.emit('kr-state', roof.hostState());
    socket.emit('bb-state', burcht.hostState());
    socket.emit('du-state', duel.hostState());
    socket.emit('pk-state', knight.hostState());
    socket.emit('sr-state', rossen.hostState());
    socket.emit('nd-state', neon.hostState());
    socket.emit('lb-state', baas.hostState());
    socket.emit('rk-state', rijk.hostState());
    socket.emit('vr-state', verrader.hostState());
    socket.emit('ob-state', oefenblad.hostState());

    socket.on('stop-others', (except, cb) => {
      stopOthers(String(except || ''));
      if (typeof cb === 'function') cb({ ok: true });
    });
    socket.on('load', (file, cb) => {
      try {
        const busy = busyWith('toernooi');
        if (busy) throw busyError(busy);
        game.load(quizzes.load(file));
        cb && cb({ ok: true });
      } catch (err) {
        cb && cb({ error: err.message, busy: !!err.busy });
      }
    });
    // Quizzen maken en bewerken. Elke handler antwoordt met { ok, ... } of { error }.
    const handle = fn => (arg, cb) => {
      try {
        cb && cb({ ok: true, ...fn(arg) });
      } catch (err) {
        cb && cb({ error: err.message, busy: !!err.busy });
      }
    };
    const refreshList = () => sendLibrary('quiz');
    // Mijn klas: de klaslijst, de leerplandoelen en wat het logboek al weet.
    socket.on('klas-get', handle(() => ({ klas: klas.read() })));
    socket.on('klas-save', handle(data => {
      const saved = klas.write(data);
      io.emit('klas-namen', klas.names());
      return { klas: saved };
    }));
    socket.on('doelen-get', handle(() => ({ doelen: doelen.all(), leerjaar: klas.read().leerjaar })));
    socket.on('logboek-get', handle(() => ({ logboek: logboek.summary() })));
    socket.on('open-logboek-folder', () => {
      fs.mkdirSync(logboek.DIR, { recursive: true });
      if (process.platform === 'win32') execFile('explorer', [logboek.DIR]);
    });
    // Quizzen, oefenbladen en sessies ordenen in mappen, en importeren van een andere pc.
    const lib = fn => handle(({ kind, ...arg } = {}) => {
      if (!LIBS[kind]) throw new Error('Onbekende soort.');
      const res = fn(LIBS[kind].mod.lib, arg);
      sendLibrary(kind);
      return res || {};
    });
    socket.on('lib-folder-add', lib((l, { name, parent }) => l.addFolder(name, parent || '')));
    socket.on('lib-folder-move', lib((l, { from, into }) => l.moveFolder(from, into || '')));
    socket.on('lib-folder-rename', lib((l, { from, to }) => l.renameFolder(from, to)));
    socket.on('lib-folder-remove', lib((l, { name }) => l.removeFolder(name)));
    socket.on('lib-move', lib((l, { file, folder }) => l.move(file, folder || '')));
    socket.on('lib-import', lib((l, { text, folder }) => l.importBundle(text, folder || '')));
    socket.on('parse', handle(text => ({ quiz: quizzes.parseAiText(text) })));
    socket.on('open-quiz', handle(file => ({ quiz: quizzes.load(file) })));
    socket.on('save', handle(({ quiz, file } = {}) => {
      const saved = quizzes.save(quiz, file);
      refreshList();
      return { file: saved };
    }));
    socket.on('delete', handle(file => {
      quizzes.remove(file);
      refreshList();
      return {};
    }));

    // Eigen Gemini-sleutel (optioneel). De sleutel gaat nooit terug naar de browser.
    socket.on('save-settings', handle(({ geminiKey, geminiModel } = {}) => {
      const changes = {};
      if (typeof geminiKey === 'string') {
        changes.geminiKey = geminiKey.trim().slice(0, 200);
        changes.geminiAutoModel = '';
      }
      if (typeof geminiModel === 'string') {
        const model = geminiModel.trim() || 'auto';
        if (/^[\w.-]{1,80}$/.test(model)) changes.geminiModel = model;
      }
      settings.write(changes);
      io.to('host').emit('settings', settings.publicView());
      return {};
    }));
    socket.on('generate', ({ prompt, files } = {}, cb) => {
      generateQuiz(prompt, files)
        .then(quiz => cb && cb({ ok: true, quiz }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });

    socket.on('rt-generate', ({ prompt } = {}, cb) => {
      generateQuiz(prompt, [], rondetafel.parseAiText)
        .then(session => cb && cb({ ok: true, session }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });

    // De Ronde Tafel
    const refreshSessions = () => sendLibrary('sessie');
    socket.on('rt-parse', handle(text => ({ session: rondetafel.parseAiText(text) })));
    socket.on('rt-open', handle(file => ({ session: rondetafel.load(file) })));
    socket.on('rt-save', handle(({ session, file } = {}) => {
      const saved = rondetafel.save(session, file);
      refreshSessions();
      return { file: saved };
    }));
    socket.on('rt-delete', handle(file => {
      rondetafel.remove(file);
      refreshSessions();
      return {};
    }));
    socket.on('rt-load', handle(file => {
      const busy = busyWith('rondetafel');
      if (busy) throw busyError(busy);
      rt.load(rondetafel.load(file));
      return {};
    }));
    socket.on('rt-go', index => Number.isInteger(index) && rt.go(index));
    socket.on('rt-lock', () => rt.toggleLock());
    socket.on('rt-results', () => rt.toggleResults());
    socket.on('rt-hide', key => rt.hide(key));
    socket.on('rt-stop', (_, cb) => cb && cb({ file: rt.stop() }));

    // De prinses in de toren
    socket.on('tw-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('toren');
      if (busy) throw busyError(busy);
      toren.load(quizzes.load(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('tw-start', () => toren.start());
    socket.on('tw-kick', id => toren.kick(id));
    socket.on('tw-finish', () => toren.finish());
    socket.on('tw-restart', () => toren.quiz && toren.load(toren.quiz, toren.minutes, toren.tempo));
    socket.on('tw-stop', (_, cb) => cb && cb({ file: toren.stop() }));

    // Schattenjacht
    socket.on('sj-load', handle(({ file, minutes } = {}) => {
      const busy = busyWith('schat');
      if (busy) throw busyError(busy);
      schat.load(quizzes.load(file), Number(minutes));
      return {};
    }));
    socket.on('sj-start', () => schat.start());
    socket.on('sj-kick', id => schat.kick(id));
    socket.on('sj-finish', () => schat.finish());
    socket.on('sj-restart', () => schat.quiz && schat.load(schat.quiz, schat.minutes));
    socket.on('sj-stop', (_, cb) => cb && cb({ file: schat.stop() }));

    // Laserslag
    socket.on('ls-load', handle(({ file, minutes, mode, tempo } = {}) => {
      const busy = busyWith('laserslag');
      if (busy) throw busyError(busy);
      laserslag.load(quizzes.load(file), Number(minutes), mode, tempo);
      return {};
    }));
    socket.on('ls-start', () => laserslag.start());
    socket.on('ls-kick', id => laserslag.kick(id));
    socket.on('ls-team', id => laserslag.switchTeam(id));
    socket.on('ls-finish', () => laserslag.finish());
    socket.on('ls-restart', () => laserslag.quiz && laserslag.load(laserslag.quiz, laserslag.minutes, laserslag.mode, laserslag.tempo));
    socket.on('ls-stop', (_, cb) => cb && cb({ file: laserslag.stop() }));

    // Ridderrace
    socket.on('rr-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('race');
      if (busy) throw busyError(busy);
      race.load(quizzes.load(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('rr-start', () => race.start());
    socket.on('rr-kick', id => race.kick(id));
    socket.on('rr-finish', () => race.finish());
    socket.on('rr-restart', () => race.quiz && race.load(race.quiz, race.minutes, race.tempo));
    socket.on('rr-stop', (_, cb) => cb && cb({ file: race.stop() }));

    // Burchtbouwers
    socket.on('bb-load', handle(({ file, minutes, level } = {}) => {
      const busy = busyWith('burcht');
      if (busy) throw busyError(busy);
      burcht.load(quizzes.load(file), Number(minutes), level);
      return {};
    }));
    socket.on('bb-start', () => burcht.start());
    socket.on('bb-kick', id => burcht.kick(id));
    socket.on('bb-dragon', () => burcht.dragon());
    socket.on('bb-restart', () => burcht.quiz && burcht.load(burcht.quiz, burcht.minutes, burcht.level));
    socket.on('bb-stop', (_, cb) => cb && cb({ file: burcht.stop() }));

    // Duel in de arena
    socket.on('du-load', handle(({ file, hearts } = {}) => {
      const busy = busyWith('duel');
      if (busy) throw busyError(busy);
      duel.load(quizzes.load(file), Number(hearts));
      return {};
    }));
    socket.on('du-start', (_, cb) => { const res = duel.start(); if (typeof cb === 'function') cb(res || {}); });
    socket.on('du-kick', id => duel.kick(id));
    socket.on('du-decide', () => duel.decide());
    socket.on('du-finish', () => duel.finish());
    socket.on('du-restart', () => duel.quiz && duel.load(duel.quiz, duel.hearts));
    socket.on('du-stop', (_, cb) => cb && cb({ file: duel.stop() }));

    // Pac-Knight
    socket.on('pk-load', handle(({ file, minutes, tempo } = {}) => {
      const busy = busyWith('knight');
      if (busy) throw busyError(busy);
      knight.load(quizzes.load(file), Number(minutes), tempo);
      return {};
    }));
    socket.on('pk-start', () => knight.start());
    socket.on('pk-kick', id => knight.kick(id));
    socket.on('pk-finish', () => knight.finish());
    socket.on('pk-restart', () => knight.quiz && knight.load(knight.quiz, knight.minutes, knight.tempo));
    socket.on('pk-stop', (_, cb) => cb && cb({ file: knight.stop() }));

    // Neon Duel
    socket.on('nd-load', handle(({ file, rounds, seconds, tempo } = {}) => {
      const busy = busyWith('neon');
      if (busy) throw busyError(busy);
      neon.load(quizzes.load(file), Number(rounds), Number(seconds), tempo);
      return {};
    }));
    socket.on('nd-start', (_, cb) => { const res = neon.start(); if (typeof cb === 'function') cb(res || {}); });
    socket.on('nd-kick', id => neon.kick(id));
    socket.on('nd-swap', id => neon.swap(id));
    socket.on('nd-shuffle', () => neon.shuffle());
    socket.on('nd-finish', () => neon.finish());
    socket.on('nd-restart', () => neon.quiz && neon.load(neon.quiz, neon.bestOf, neon.roundSec, neon.tempo));
    socket.on('nd-stop', (_, cb) => cb && cb({ file: neon.stop() }));

    // Leraar-baas, met de eindbaas die de leerkracht zelf samenstelt (bewaard in settings.json).
    socket.on('lb-load', handle(({ file, minutes, tempo, auto } = {}) => {
      const busy = busyWith('baas');
      if (busy) throw busyError(busy);
      baas.load(quizzes.load(file), Number(minutes), tempo, auto !== false);
      return {};
    }));
    socket.on('lb-start', () => baas.start());
    socket.on('lb-kick', id => baas.kick(id));
    socket.on('lb-move', (move, cb) => { const res = baas.teacherMove(String(move || '')); if (typeof cb === 'function') cb(res || {}); });
    socket.on('lb-auto', on => baas.setAuto(Boolean(on)));
    socket.on('lb-finish', () => baas.finish());
    socket.on('lb-restart', () => baas.quiz && baas.load(baas.quiz, baas.minutes, baas.tempo, baas.auto));
    socket.on('lb-stop', (_, cb) => cb && cb({ file: baas.stop() }));
    socket.on('lb-boss-get', (_, cb) => typeof cb === 'function' && cb(settings.read().teacherBoss || null));
    socket.on('lb-boss-set', (boss, cb) => {
      const clean = LeraarBaas.cleanBoss(boss);
      if (clean) {
        settings.write({ teacherBoss: clean });
        baas.boss = clean;
        baas.broadcast();
      }
      if (typeof cb === 'function') cb(clean ? { ok: true, boss: clean } : { error: 'Ongeldige eindbaas.' });
    });

    // Gauntlet en Ridder-Royale
    gauntlet.attachHost(socket, handle, busyWith, busyError, quizzes);
    royale.attachHost(socket, handle, busyWith, busyError, quizzes);

    // Strijdrossen
    socket.on('sr-load', handle(({ file, minutes, mode, tempo } = {}) => {
      const busy = busyWith('rossen');
      if (busy) throw busyError(busy);
      rossen.load(quizzes.load(file), Number(minutes), mode, tempo);
      return {};
    }));
    socket.on('sr-start', () => rossen.start());
    socket.on('sr-kick', id => rossen.kick(id));
    socket.on('sr-team', id => rossen.switchTeam(id));
    socket.on('sr-finish', () => rossen.finish());
    socket.on('sr-restart', () => rossen.quiz && rossen.load(rossen.quiz, rossen.minutes, rossen.mode, rossen.tempo));
    socket.on('sr-stop', (_, cb) => cb && cb({ file: rossen.stop() }));

    // Het Rijk
    socket.on('rk-list', (_, cb) => cb && cb(rijken.list()));
    socket.on('rk-create', handle(({ name, teams, names } = {}) => ({ file: rijken.create(name, Number(teams), names) })));
    socket.on('rk-delete', handle(({ file } = {}) => {
      if (rijk.active && rijk.file === file) throw new Error('Dit rijk is nu in gebruik. Stop eerst het spel.');
      rijken.remove(file);
      return {};
    }));
    socket.on('rk-peek', handle(({ file } = {}) => {
      const d = rijken.read(file);
      const titles = {};
      for (const [id, q] of Object.entries(d.quizzes)) titles[id] = q.title;
      return { name: d.name, teams: d.teams, cells: d.cells, cols: d.cols, rows: d.rows, lessons: d.lessons, titles, members: Object.values(d.members) };
    }));
    socket.on('rk-load', handle(({ rijk: file, quiz, minutes } = {}) => {
      const busy = busyWith('rijk');
      if (busy) throw busyError(busy);
      rijk.load(file, quizzes.load(quiz), quiz, Number(minutes));
      return {};
    }));
    socket.on('rk-start', () => rijk.start());
    socket.on('rk-kick', id => rijk.kick(id));
    socket.on('rk-move', id => rijk.move(id));
    socket.on('rk-finish', () => rijk.finish());
    socket.on('rk-stop', (_, cb) => cb && cb({ file: rijk.stop() }));

    // Kristalroof
    socket.on('kr-load', handle(({ file, minutes } = {}) => {
      const busy = busyWith('roof');
      if (busy) throw busyError(busy);
      roof.load(quizzes.load(file), Number(minutes));
      return {};
    }));
    socket.on('kr-start', () => roof.start());
    socket.on('kr-kick', id => roof.kick(id));
    socket.on('kr-finish', () => roof.finish());
    socket.on('kr-restart', () => roof.quiz && roof.load(roof.quiz, roof.minutes));
    socket.on('kr-stop', (_, cb) => cb && cb({ file: roof.stop() }));

    // De Verrader
    socket.on('vr-load', handle(({ file, ...opts } = {}) => {
      const busy = busyWith('verrader');
      if (busy) throw busyError(busy);
      verrader.load(quizzes.load(file), { ...opts, minutes: Number(opts.minutes) });
      return {};
    }));
    socket.on('vr-start', (_, cb) => { const res = verrader.start(); if (typeof cb === 'function') cb(res || {}); });
    socket.on('vr-kick', id => verrader.kick(id));
    socket.on('vr-horn', () => verrader.horn(null));
    socket.on('vr-skip', () => verrader.skipTalk());
    socket.on('vr-finish', () => verrader.finish('verrader', 'De leerkracht stopte het spel.'));
    socket.on('vr-restart', () => verrader.quiz && verrader.load(verrader.quiz, { minutes: verrader.minutes, traitors: verrader.traitorSetting, length: verrader.length, talk: verrader.talk }));
    socket.on('vr-stop', (_, cb) => cb && cb({ file: verrader.stop() }));

    // Oefenbladen maken, bewaren en live openzetten
    const refreshSheets = () => sendLibrary('oefenblad');
    socket.on('ob-parse', handle(text => ({ sheet: oefenbladen.parseAiText(text) })));
    socket.on('ob-check', handle(sheet => ({ sheet: oefenbladen.validate(sheet) })));
    socket.on('ob-open', handle(file => ({ sheet: oefenbladen.load(file) })));
    socket.on('ob-save', handle(({ sheet, file } = {}) => {
      const saved = oefenbladen.save(sheet, file);
      refreshSheets();
      return { file: saved };
    }));
    socket.on('ob-delete', handle(file => {
      oefenbladen.remove(file);
      refreshSheets();
      return {};
    }));
    // Printblad en verbeterblad: vaste volgorde bij verbinden, zodat ze overeenkomen.
    socket.on('ob-print', handle(file => {
      const sheet = oefenbladen.load(file);
      const shuffles = oefenbladen.shufflesFor(sheet, sheet.title);
      return { view: oefenbladen.studentView(sheet, shuffles), solutions: oefenbladen.solutions(sheet, shuffles) };
    }));
    socket.on('ob-generate', ({ prompt, files } = {}, cb) => {
      generateQuiz(prompt, files, oefenbladen.parseAiText)
        .then(sheet => cb && cb({ ok: true, sheet }))
        .finally(() => io.to('host').emit('settings', settings.publicView()))
        .catch(err => cb && cb({ error: err.message }));
    });
    socket.on('ob-load', handle(({ file, feedback } = {}) => {
      const busy = busyWith('oefenblad');
      if (busy) throw busyError(busy);
      oefenblad.load(oefenbladen.load(file), file, feedback);
      return {};
    }));
    socket.on('ob-reveal', () => oefenblad.reveal());
    socket.on('ob-kick', id => oefenblad.kick(id));
    socket.on('ob-finish', () => oefenblad.finish());
    socket.on('ob-reopen', (id, cb) => { const res = oefenblad.reopen(id); if (typeof cb === 'function') cb(res); });
    socket.on('ob-detail', (id, cb) => cb && cb(oefenblad.detail(id)));
    socket.on('ob-stop', (_, cb) => cb && cb({ file: oefenblad.stop() }));

    socket.on('start', () => game.start());
    socket.on('next', () => game.next());
    socket.on('reveal', () => game.reveal());
    socket.on('kick', id => game.kick(id));
    socket.on('restart', () => game.quiz && game.load(game.quiz));
    socket.on('close', () => game.stop());
    socket.on('stop', (_, cb) => cb && cb({ file: game.stop() }));
    return;
  }

  socket.join('players');
  const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 64;
  socket.emit('state', { phase: game.phase === 'idle' ? 'idle' : 'join' });

  socket.on('join', ({ playerId, name } = {}, cb) => {
    if (typeof playerId !== 'string' || playerId.length > 64) return cb && cb({ error: 'Ongeldige speler.' });
    const result = game.join(playerId, name, socket.id);
    socket.data.playerId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('state', game.playerState(playerId));
  });

  socket.on('answer', choice => {
    if (socket.data.playerId) game.answer(socket.data.playerId, choice);
  });

  // De prinses in de toren
  socket.emit('tw-state', toren.base());
  socket.on('tw-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = toren.join(playerId, name, socket.id);
    socket.data.twId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('tw-state', toren.playerState(playerId));
  });
  const tw = fn => (arg, cb) => {
    const out = socket.data.twId ? fn(socket.data.twId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('tw-jump', tw(id => toren.jump(id)));
  socket.on('tw-move', tw((id, pos) => toren.move(id, pos)));
  socket.on('tw-hit', tw((id, what) => toren.hit(id, what)));
  socket.on('tw-question', tw(id => toren.question(id)));
  socket.on('tw-answer', tw((id, choice) => toren.answer(id, choice)));

  // Schattenjacht
  socket.emit('sj-state', schat.base());
  socket.on('sj-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = schat.join(playerId, name, socket.id);
    socket.data.sjId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('sj-state', schat.playerState(playerId));
  });
  const sj = fn => (arg, cb) => {
    const out = socket.data.sjId ? fn(socket.data.sjId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('sj-question', sj(id => schat.question(id)));
  socket.on('sj-answer', sj((id, choice) => schat.answer(id, choice)));
  socket.on('sj-buy', sj((id, item) => schat.buy(id, item)));

  // Laserslag
  socket.emit('ls-state', laserslag.base());
  socket.on('ls-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = laserslag.join(playerId, name, socket.id);
    socket.data.lsId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) {
      socket.emit('ls-state', laserslag.playerState(playerId));
      const p = laserslag.players.get(playerId);
      if (laserslag.phase === 'play') laserslag.sendMe(p);
    }
  });
  const ls = fn => (arg, cb) => {
    const out = socket.data.lsId ? fn(socket.data.lsId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('ls-move', ls((id, pos) => laserslag.move(id, pos)));
  socket.on('ls-shoot', ls((id, angle) => laserslag.shoot(id, angle)));
  socket.on('ls-asking', ls((id, on) => laserslag.asking(id, on)));
  socket.on('ls-question', ls(id => laserslag.question(id)));
  socket.on('ls-answer', ls((id, choice) => laserslag.answer(id, choice)));
  // Ridderrace
  socket.emit('rr-state', race.base());
  socket.on('rr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = race.join(playerId, name, socket.id);
    socket.data.rrId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) {
      socket.emit('rr-state', race.playerState(playerId));
      if (race.phase === 'play') race.sendMe(race.players.get(playerId));
    }
  });
  const rr = fn => (arg, cb) => {
    const out = socket.data.rrId ? fn(socket.data.rrId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('rr-move', rr((id, pos) => race.move(id, pos)));
  socket.on('rr-crystal', rr((id, seg) => race.crystal(id, seg)));
  socket.on('rr-turbo', rr(id => race.turbo(id)));
  socket.on('rr-asking', rr((id, on) => race.asking(id, on)));
  socket.on('rr-question', rr(id => race.question(id)));
  socket.on('rr-answer', rr((id, choice) => race.answer(id, choice)));

  // Burchtbouwers
  socket.emit('bb-state', burcht.base());
  socket.on('bb-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = burcht.join(playerId, name, socket.id);
    socket.data.bbId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('bb-state', burcht.playerState(playerId));
  });
  const bb = fn => (arg, cb) => {
    const out = socket.data.bbId ? fn(socket.data.bbId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('bb-question', bb(id => burcht.question(id)));
  socket.on('bb-answer', bb((id, choice) => burcht.answer(id, choice)));
  socket.on('bb-place', bb((id, i) => burcht.place(id, Number(i))));

  // Duel in de arena
  socket.emit('du-state', duel.base());
  socket.on('du-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = duel.join(playerId, name, socket.id);
    socket.data.duId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('du-state', duel.playerState(playerId));
  });
  socket.on('du-answer', (choice, cb) => {
    const out = socket.data.duId ? duel.answer(socket.data.duId, choice) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  });

  // Pac-Knight
  socket.emit('pk-state', knight.base());
  socket.on('pk-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = knight.join(playerId, name, socket.id);
    socket.data.pkId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('pk-state', knight.playerState(playerId));
  });
  const pk = fn => (arg, cb) => {
    const out = socket.data.pkId ? fn(socket.data.pkId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('pk-dir', pk((id, dir) => knight.steer(id, Number(dir))));
  socket.on('pk-power', pk(id => knight.power(id)));
  socket.on('pk-asking', pk((id, on) => knight.asking(id, on)));
  socket.on('pk-question', pk(id => knight.question(id)));
  socket.on('pk-answer', pk((id, choice) => knight.answer(id, choice)));

  // Gauntlet en Ridder-Royale
  gauntlet.attachPlayer(socket, validId);
  royale.attachPlayer(socket, validId);

  // Strijdrossen
  socket.emit('sr-state', rossen.base());
  socket.on('sr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = rossen.join(playerId, name, socket.id);
    socket.data.srId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('sr-state', rossen.playerState(playerId));
  });
  const sr = fn => (arg, cb) => {
    const out = socket.data.srId ? fn(socket.data.srId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('sr-move', sr((id, pos) => rossen.move(id, pos)));
  socket.on('sr-fire', sr((id, shot) => rossen.fire(id, shot)));
  socket.on('sr-asking', sr((id, on) => rossen.asking(id, on)));
  socket.on('sr-question', sr(id => rossen.question(id)));
  socket.on('sr-answer', sr((id, choice) => rossen.answer(id, choice)));

  // Neon Duel
  socket.emit('nd-state', neon.base());
  socket.on('nd-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = neon.join(playerId, name, socket.id);
    socket.data.ndId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('nd-state', neon.playerState(playerId));
  });
  const nd = fn => (arg, cb) => {
    const out = socket.data.ndId ? fn(socket.data.ndId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('nd-question', nd(id => neon.question(id)));
  socket.on('nd-answer', nd((id, choice) => neon.answer(id, choice)));

  // Leraar-baas
  socket.emit('lb-state', baas.base());
  socket.on('lb-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = baas.join(playerId, name, socket.id);
    socket.data.lbId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('lb-state', baas.playerState(playerId));
  });
  const lb = fn => (arg, cb) => {
    const out = socket.data.lbId ? fn(socket.data.lbId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('lb-question', lb(id => baas.question(id)));
  socket.on('lb-answer', lb((id, choice) => baas.answer(id, choice)));

  // Het Rijk
  socket.emit('rk-state', rijk.base());
  socket.on('rk-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = rijk.join(playerId, name, socket.id);
    socket.data.rkId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('rk-state', rijk.playerState(playerId));
  });
  const rk = fn => (arg, cb) => {
    const out = socket.data.rkId ? fn(socket.data.rkId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('rk-question', rk(id => rijk.question(id)));
  socket.on('rk-answer', rk((id, choice) => rijk.answer(id, choice)));
  socket.on('rk-act', rk((id, i) => rijk.act(id, Number(i))));

  // Kristalroof
  socket.emit('kr-state', roof.base());
  socket.on('kr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = roof.join(playerId, name, socket.id);
    socket.data.krId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('kr-state', roof.playerState(playerId));
  });
  const kr = fn => (arg, cb) => {
    const out = socket.data.krId ? fn(socket.data.krId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('kr-secret', kr((id, word) => roof.secret(id, word)));
  socket.on('kr-question', kr(id => roof.question(id)));
  socket.on('kr-answer', kr((id, choice) => roof.answer(id, choice)));
  socket.on('kr-open', kr((id, i) => roof.open(id, i)));
  socket.on('kr-target', kr((id, t) => roof.target(id, t)));
  socket.on('kr-guess', kr((id, w) => roof.guess(id, w)));
  socket.on('kr-skip', kr(id => roof.skip(id)));

  // De Verrader
  socket.emit('vr-state', verrader.base());
  socket.on('vr-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = verrader.join(playerId, name, socket.id);
    socket.data.vrId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('vr-state', verrader.playerState(playerId));
  });
  const vr = fn => (arg, cb) => {
    const out = socket.data.vrId ? fn(socket.data.vrId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('vr-question', vr(id => verrader.question(id)));
  socket.on('vr-answer', vr((id, choice) => verrader.answer(id, choice)));
  socket.on('vr-spell', vr((id, t) => verrader.spell(id, t)));
  socket.on('vr-horn', vr(id => verrader.horn(id)));
  socket.on('vr-vote', vr((id, t) => verrader.vote(id, t === null ? null : String(t))));

  // Oefenblad
  socket.emit('ob-state', oefenblad.base());
  socket.on('ob-join', ({ playerId, name } = {}, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    const result = oefenblad.join(playerId, name, socket.id);
    socket.data.obId = result.ok ? playerId : null;
    cb && cb(result);
    if (result.ok) socket.emit('ob-state', oefenblad.playerState(playerId));
  });
  const ob = fn => (arg, cb) => {
    const out = socket.data.obId ? fn(socket.data.obId, arg) : { error: 'Meld je eerst aan.' };
    if (typeof cb === 'function') cb(out || {});
  };
  socket.on('ob-answer', ob((id, a) => oefenblad.answer(id, a)));
  socket.on('ob-submit', ob(id => oefenblad.submit(id)));

  // Wie wegvalt tijdens een vraag, blijft niet onkwetsbaar staan.
  socket.on('disconnect', () => {
    if (socket.data.lsId) laserslag.asking(socket.data.lsId, false);
    if (socket.data.rrId) race.asking(socket.data.rrId, false);
    if (socket.data.pkId) knight.asking(socket.data.pkId, false);
    if (socket.data.srId) rossen.asking(socket.data.srId, false);
  });

  // De Ronde Tafel: anoniem, alleen een vaste id per browser.
  socket.emit('rt-state', rt.playerState());
  socket.on('rt-join', (playerId, cb) => {
    if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
    socket.data.rtId = playerId;
    cb && cb({ ok: true, mine: rt.join(playerId) });
  });
  socket.on('rt-answer', (value, cb) => {
    if (!socket.data.rtId) return cb && cb({ error: 'Herlaad de pagina en probeer opnieuw.' });
    cb && cb(rt.answer(socket.data.rtId, value));
  });
});

server.listen(PORT, () => {
  console.log('\n  LANcelot draait!\n');
  console.log(`  Docentenscherm:  http://localhost:${PORT}/host`);
  for (const a of lanAddresses()) console.log(`  Leerlingen:      http://${a}:${PORT}`);
  console.log('\n  Sluit dit venster om te stoppen.\n');
});
