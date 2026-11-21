// Start LANcelot zonder zwart venster: Start LANcelot.bat roept dit op. Het zet het schild van LANcelot naast de klok
// (src/systeemvak.ps1, met PowerShell dat in elke Windows zit) en dat start de server verborgen.
// Lukt dat niet binnen 15 seconden (bv. PowerShell geblokkeerd op een school-pc), dan stopt dit met code 1 en start
// Start LANcelot.bat de server gewoon in het venster, zoals vroeger.
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, execFile } = require('child_process');

const APP = path.join(__dirname, '..');

// Het script gaat mee als -EncodedCommand: zo geldt de uitvoeringsbeleid-instelling voor .ps1-bestanden niet.
function opdracht() {
  const script = fs.readFileSync(path.join(__dirname, 'systeemvak.ps1'), 'utf8');
  return ['-NoProfile', '-STA', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
}

// Draait LANcelot al? Dan geen tweede schild: gewoon het leerkrachtenscherm openen.
function draaitAl(cb) {
  const eerste = Number(process.env.PORT) || 3000;
  let open = 11, gevonden = 0;
  for (let p = eerste; p <= eerste + 10; p++) {
    const klaar = ok => { if (ok && !gevonden) gevonden = p; if (--open === 0) cb(gevonden); };
    const r = http.get({ host: '127.0.0.1', port: p, path: '/lancelot-ping', timeout: 800 }, res => {
      let b = '';
      res.on('data', d => { b += d; });
      res.on('end', () => klaar(b.includes('"lancelot":true')));
    });
    r.on('timeout', () => r.destroy());
    r.on('error', () => klaar(false));
  }
}

function start() {
  if (process.platform !== 'win32') process.exit(1);
  draaitAl(poort => {
    if (!poort) return startSchild();
    execFile('cmd', ['/c', 'start', '', `http://localhost:${poort}/host`], { windowsHide: true }, () => process.exit(0));
  });
}

function startSchild() {
  const klaar = path.join(os.tmpdir(), `lancelot-systeemvak-${process.pid}.klaar`);
  let ps;
  try {
    ps = spawn('powershell.exe', opdracht(), {
      cwd: APP, detached: true, windowsHide: true, stdio: 'ignore',
      env: { ...process.env, LANCELOT_APP: APP, LANCELOT_NODE: process.execPath, LANCELOT_KLAAR: klaar, LANCELOT_VERBORGEN: '1' },
    });
  } catch { process.exit(1); }
  const gelukt = () => { try { fs.unlinkSync(klaar); return true; } catch { return false; } };
  const einde = code => { clearInterval(kijk); clearTimeout(stop); process.exit(code); };
  ps.on('error', () => einde(1));
  ps.on('exit', () => einde(gelukt() ? 0 : 1));
  const kijk = setInterval(() => { if (gelukt()) { ps.unref(); einde(0); } }, 200);
  const stop = setTimeout(() => { try { ps.kill(); } catch {} einde(1); }, 15000);
}

if (require.main === module) start();
module.exports = { opdracht, draaitAl };
