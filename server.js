const http = require('http');
const os = require('os');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');
const { Game } = require('./src/game');
const quizzes = require('./src/quizzes');

const PORT = Number(process.env.PORT) || 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const game = new Game(io);

// Het docentenscherm werkt alleen op de pc waar de server draait.
function isLocal(address) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
}

app.get('/host', (req, res) => {
  if (!isLocal(req.socket.remoteAddress)) return res.status(403).send('Het docentenscherm is alleen bereikbaar op de pc van de leerkracht.');
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .map(i => i.address);
}

io.on('connection', socket => {
  const host = socket.handshake.query.role === 'host' && isLocal(socket.handshake.address);

  if (host) {
    socket.join('host');
    socket.emit('quizzes', quizzes.list());
    socket.emit('addresses', lanAddresses().map(a => `http://${a}:${PORT}`));
    socket.emit('state', game.hostState());

    socket.on('load', (file, cb) => {
      try {
        game.load(quizzes.load(file));
        cb && cb({ ok: true });
      } catch (err) {
        cb && cb({ error: err.message });
      }
    });
    socket.on('start', () => game.start());
    socket.on('next', () => game.next());
    socket.on('reveal', () => game.reveal());
    socket.on('kick', id => game.kick(id));
    socket.on('restart', () => game.quiz && game.load(game.quiz));
    socket.on('close', () => { game.reset(); io.to('players').emit('reset', { open: false }); game.broadcast(); });
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
