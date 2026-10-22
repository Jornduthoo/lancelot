// Instellingen van de leerkracht, alleen op deze pc opgeslagen in settings.json (staat in .gitignore).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'settings.json');
const DEFAULTS = { geminiKey: '', geminiModel: 'auto', geminiAutoModel: '', preferredAddress: '' };

function read() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(changes) {
  const next = { ...read(), ...changes };
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n');
  return next;
}

// Wat het docentenscherm te zien krijgt: nooit de hele sleutel.
function publicView() {
  const s = read();
  return {
    hasKey: Boolean(s.geminiKey),
    keyHint: s.geminiKey ? `…${s.geminiKey.slice(-4)}` : '',
    geminiModel: s.geminiModel,
    geminiAutoModel: s.geminiAutoModel,
  };
}

module.exports = { read, write, publicView };
