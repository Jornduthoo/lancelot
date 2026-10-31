// Welk programma houdt een poort bezet? Alleen op Windows (netstat + tasklist), zonder extra onderdelen.
// Geeft { pid, naam } terug, of null als het niet te achterhalen is.
const { execFileSync } = require('child_process');

function pidUitNetstat(tekst, poort) {
  for (const regel of String(tekst).split(/\r?\n/)) {
    const d = regel.trim().split(/\s+/);
    // TCP  0.0.0.0:3000  0.0.0.0:0  LISTENING  1234
    if (d.length >= 5 && /^TCP/i.test(d[0]) && d[1].endsWith(':' + poort) && /LISTEN/i.test(d[3])) {
      const pid = Number(d[4]);
      if (pid > 0) return pid;
    }
  }
  return null;
}

function naamUitTasklist(tekst) {
  const m = String(tekst).match(/^"([^"]+)"/m);
  return m ? m[1] : null;
}

function wieGebruiktPoort(poort) {
  if (process.platform !== 'win32') return null;
  try {
    const opties = { encoding: 'utf8', timeout: 4000, windowsHide: true };
    const pid = pidUitNetstat(execFileSync('netstat', ['-ano', '-p', 'tcp'], opties), poort);
    if (!pid) return null;
    let naam = null;
    try { naam = naamUitTasklist(execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'], opties)); } catch {}
    return { pid, naam };
  } catch { return null; }
}

// Een korte, begrijpelijke zin voor in het venster.
function uitleg(poort) {
  const wie = wieGebruiktPoort(poort);
  if (!wie) return null;
  const naam = wie.naam || 'een onbekend programma';
  const tip = /^node(\.exe)?$/i.test(wie.naam || '')
    ? 'Dat is Node.js: waarschijnlijk een ouder LANcelot-venster dat nog open staat, of een ander Node-programma. Sluit dat venster, of herstart de pc.'
    : 'Sluit dat programma als je LANcelot weer op poort ' + poort + ' wil, of laat het zo: LANcelot werkt ook op deze poort.';
  return `  Poort ${poort} wordt gebruikt door: ${naam} (proces ${wie.pid}).\n  ${tip}\n  Sluiten kan ook via Taakbeheer > Details > proces ${wie.pid} > Taak beëindigen.`;
}

module.exports = { wieGebruiktPoort, uitleg, pidUitNetstat, naamUitTasklist };
