const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { Game } = require('./src/game');
const QRCode = require('qrcode');
const quizzes = require('./src/quizzes');
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

// Het docentenscherm werkt alleen op de pc waar de server draait.
function isLocal(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

app.get('/host', (req, res) => {
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).send('Het docentenscherm is alleen bereikbaar op de pc van de leerkracht.');
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});
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

// Virtuele netwerkkaarten (WSL, VirtualBox, VPN) komen achteraan, want leerlingen kunnen die niet bereiken.
const VIRTUAL = /vethernet|virtualbox|vmware|wsl|docker|hyper-v|tailscale|zerotier|vpn|nordlynx|wireguard|openvpn|tap-/i;

function lanAddresses() {
  return Object.entries(os.networkInterfaces())
    .flatMap(([name, list]) => (list || []).map(i => ({ name, ...i })))
    .filter(i => i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.'))
    .sort((a, b) => VIRTUAL.test(a.name) - VIRTUAL.test(b.name))
    .map(i => i.address);
}

io.on('connection', socket => {
  const host = socket.handshake.query.role === 'host' && isLocal(socket.handshake.address);

  if (host) {
    socket.join('host');
    socket.emit('quizzes', quizzes.list());
    const urls = lanAddresses().map(a => `http://${a}:${PORT}`);
    Promise.all(urls.map(url => QRCode.toString(url, { type: 'svg', margin: 1 })))
      .then(qrs => socket.emit('addresses', urls.map((url, i) => ({ url, qr: qrs[i] }))));
    socket.emit('settings', settings.publicView());
    socket.emit('results', results.list());
    socket.on('open-results-folder', () => {
      fs.mkdirSync(results.DIR, { recursive: true });
      if (process.platform === 'win32') execFile('explorer', [results.DIR]);
    });
    socket.emit('state', game.hostState());

    socket.on('load', (file, cb) => {
      try {
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
      if (typeof geminiKey === 'string') changes.geminiKey = geminiKey.trim().slice(0, 200);
      if (typeof geminiModel === 'string' && /^[\w.-]{1,80}$/.test(geminiModel.trim())) changes.geminiModel = geminiModel.trim();
      settings.write(changes);
      io.to('host').emit('settings', settings.publicView());
      return {};
    }));
    socket.on('generate', ({ prompt, files } = {}, cb) => {
      generateQuiz(prompt, files)
        .then(quiz => cb && cb({ ok: true, quiz }))
        .catch(err => cb && cb({ error: err.message }));
    });

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
});

server.listen(PORT, () => {
  console.log('\n  LANcelot draait!\n');
  console.log(`  Docentenscherm:  http://localhost:${PORT}/host`);
  for (const a of lanAddresses()) console.log(`  Leerlingen:      http://${a}:${PORT}`);
  console.log('\n  Sluit dit venster om te stoppen.\n');
});
