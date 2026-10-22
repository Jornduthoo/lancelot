const fs = require('fs');
const http = require('http');
const os = require('os');
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
const settings = require('./src/settings');
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

// Er loopt altijd hooguit één spel tegelijk.
function busyWith(except) {
  if (except !== 'toernooi' && game.phase !== 'idle') return 'Er loopt nog een toernooi. Stop dat eerst.';
  if (except !== 'rondetafel' && rt.active) return 'De Ronde Tafel loopt nog. Stop die eerst.';
  if (except !== 'toren' && toren.active) return 'De prinses in de toren loopt nog. Stop dat spel eerst.';
  if (except !== 'schat' && schat.active) return 'Schattenjacht loopt nog. Stop dat spel eerst.';
  if (except !== 'laserslag' && laserslag.active) return 'Laserslag loopt nog. Stop dat spel eerst.';
  return null;
}

// Het docentenscherm werkt alleen op de pc waar de server draait.
function isLocal(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

for (const [route, page] of [['/host', 'host.html'], ['/rondetafel', 'rondetafel.html'], ['/toren', 'toren.html'], ['/schattenjacht', 'schattenjacht.html'], ['/laserslag', 'laserslag.html']]) {
  app.get(route, (req, res) => {
    if (!isLocal(req.socket.remoteAddress)) return res.status(403).send('Het docentenscherm is alleen bereikbaar op de pc van de leerkracht.');
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
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

// Virtuele netwerkkaarten (WSL, VirtualBox, VPN, hotspot, gsm via usb) komen achteraan, want leerlingen kunnen die meestal niet bereiken.
const VIRTUAL = /vethernet|virtualbox|vmware|wsl|docker|hyper-v|tailscale|zerotier|vpn|nordlynx|wireguard|openvpn|tap-|bluetooth|loopback|lokale verbinding\*|local area connection\*|rndis|remote ndis|tether|hotspot/i;
const REAL = /wi-?fi|wlan|wireless|draadloos|ethernet|^eth|^en/i;

// Hoe kleiner het getal, hoe eerder het adres op het bord komt.
function rank(i, preferred) {
  if (i.address === preferred) return -10;
  let score = 0;
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
  const urls = list.map(i => `http://${i.address}:${PORT}`);
  return Promise.all(urls.map(url => QRCode.toString(url, { type: 'svg', margin: 1 })))
    .then(qrs => target.emit('addresses', urls.map((url, k) => ({ url, qr: qrs[k], name: list[k].name }))));
}

io.on('connection', socket => {
  const host = socket.handshake.query.role === 'host' && isLocal(socket.handshake.address);

  if (host) {
    socket.join('host');
    socket.emit('quizzes', quizzes.list());
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
    socket.emit('rt-sessions', rondetafel.list());
    socket.emit('rt-state', rt.hostState());
    socket.emit('tw-state', toren.hostState());
    socket.emit('sj-state', schat.hostState());
    socket.emit('ls-state', laserslag.hostState());

    socket.on('load', (file, cb) => {
      try {
        const busy = busyWith('toernooi');
        if (busy) throw new Error(busy);
        game.load(quizzes.load(file));
        cb && cb({ ok: true });
      } catch (err) {
        cb && cb({ error: err.message });
      }
    });
    // Quizzen maken en bewerken. Elke handler antwoordt met { ok, ... } of { error }.
    const handle = fn => (arg, cb) => {
      try {
        cb && cb({ ok: true, ...fn(arg) });
      } catch (err) {
        cb && cb({ error: err.message });
      }
    };
    const refreshList = () => io.to('host').emit('quizzes', quizzes.list());
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
    const refreshSessions = () => io.to('host').emit('rt-sessions', rondetafel.list());
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
      if (busy) throw new Error(busy);
      rt.load(rondetafel.load(file));
      return {};
    }));
    socket.on('rt-go', index => Number.isInteger(index) && rt.go(index));
    socket.on('rt-lock', () => rt.toggleLock());
    socket.on('rt-results', () => rt.toggleResults());
    socket.on('rt-hide', key => rt.hide(key));
    socket.on('rt-stop', (_, cb) => cb && cb({ file: rt.stop() }));

    // De prinses in de toren
    socket.on('tw-load', handle(({ file, minutes } = {}) => {
      const busy = busyWith('toren');
      if (busy) throw new Error(busy);
      toren.load(quizzes.load(file), Number(minutes));
      return {};
    }));
    socket.on('tw-start', () => toren.start());
    socket.on('tw-kick', id => toren.kick(id));
    socket.on('tw-finish', () => toren.finish());
    socket.on('tw-restart', () => toren.quiz && toren.load(toren.quiz, toren.minutes));
    socket.on('tw-stop', (_, cb) => cb && cb({ file: toren.stop() }));

    // Schattenjacht
    socket.on('sj-load', handle(({ file, minutes } = {}) => {
      const busy = busyWith('schat');
      if (busy) throw new Error(busy);
      schat.load(quizzes.load(file), Number(minutes));
      return {};
    }));
    socket.on('sj-start', () => schat.start());
    socket.on('sj-kick', id => schat.kick(id));
    socket.on('sj-finish', () => schat.finish());
    socket.on('sj-restart', () => schat.quiz && schat.load(schat.quiz, schat.minutes));
    socket.on('sj-stop', (_, cb) => cb && cb({ file: schat.stop() }));

    // Laserslag
    socket.on('ls-load', handle(({ file, minutes, mode } = {}) => {
      const busy = busyWith('laserslag');
      if (busy) throw new Error(busy);
      laserslag.load(quizzes.load(file), Number(minutes), mode);
      return {};
    }));
    socket.on('ls-start', () => laserslag.start());
    socket.on('ls-kick', id => laserslag.kick(id));
    socket.on('ls-team', id => laserslag.switchTeam(id));
    socket.on('ls-finish', () => laserslag.finish());
    socket.on('ls-restart', () => laserslag.quiz && laserslag.load(laserslag.quiz, laserslag.minutes, laserslag.mode));
    socket.on('ls-stop', (_, cb) => cb && cb({ file: laserslag.stop() }));

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
  // Wie wegvalt tijdens een vraag, blijft niet onkwetsbaar staan.
  socket.on('disconnect', () => { if (socket.data.lsId) laserslag.asking(socket.data.lsId, false); });

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
