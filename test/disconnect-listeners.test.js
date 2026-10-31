// Elke socket mag maar een paar 'disconnect'-listeners krijgen. Vroeger voegde elk spel er een toe,
// waardoor Node bij elke verbinding "MaxListenersExceededWarning ... 11 disconnect listeners" toonde.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');

test('spellen registreren zelf geen disconnect-listener, server.js roept weg() aan', () => {
  const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const lijst = (server.match(/const SPELLEN_MET_WEG = \[([^\]]*)\]/) || [])[1];
  assert.ok(lijst, 'SPELLEN_MET_WEG ontbreekt in server.js');
  const namen = lijst.split(',').map(s => s.trim()).filter(Boolean);
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) {
    if (!f.endsWith('.js') || f === 'solo.js') continue;
    const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    assert.ok(!/socket\.on\(\s*['"]disconnect['"]/.test(src), `${f} voegt zelf een disconnect-listener toe; gebruik weg(socket)`);
    if (/\n  weg\(socket\)/.test(src)) {
      const klasse = (src.match(/\nclass (\w+)/) || [])[1];
      const varNaam = (server.match(new RegExp(`const (\\w+) = new ${klasse}\\(`)) || [])[1];
      assert.ok(namen.includes(varNaam), `${klasse} heeft weg() maar staat niet in SPELLEN_MET_WEG`);
    }
  }
});

test('verbinden geeft geen MaxListenersExceededWarning', async () => {
  const { io } = require('socket.io-client');
  const srv = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: '3927' } });
  let err = '', out = '';
  srv.stderr.on('data', d => { err += d; });
  srv.stdout.on('data', d => { out += d; });
  try {
    for (let i = 0; i < 50 && !/localhost:\d+/.test(out); i++) await new Promise(r => setTimeout(r, 100));
    const port = (out.match(/localhost:(\d+)/) || [])[1];
    assert.ok(port, 'server startte niet:\n' + out + err);
    const socks = Array.from({ length: 5 }, () => io('http://localhost:' + port, { transports: ['websocket'] }));
    await Promise.all(socks.map(s => new Promise(r => s.on('connect', r))));
    await new Promise(r => setTimeout(r, 500));
    socks.forEach(s => s.close());
    await new Promise(r => setTimeout(r, 300));
    assert.ok(!/MaxListenersExceeded/.test(err), err);
  } finally {
    srv.kill();
  }
});
