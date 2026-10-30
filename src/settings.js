// Instellingen van de leerkracht, alleen op deze pc opgeslagen in settings.json (staat in .gitignore).
const fs = require('fs');
const path = require('path');
const gegevens = require('./gegevens');

const FILE = gegevens.pad('settings.json');
// Welke AI de quiz direct maakt. Gemini blijft de standaard omdat die gratis kan.
const DIENSTEN = {
  gemini: { naam: 'Gemini', key: 'geminiKey', model: 'geminiModel' },
  claude: { naam: 'Claude', key: 'claudeKey', model: 'claudeModel' },
  openai: { naam: 'ChatGPT', key: 'openaiKey', model: 'openaiModel' },
};
const SLEUTELS = Object.values(DIENSTEN).map(d => d.key);
const DEFAULTS = {
  aiDienst: 'gemini',
  geminiKey: '', geminiModel: 'auto', geminiAutoModel: '',
  claudeKey: '', claudeModel: 'claude-opus-5-5',
  openaiKey: '', openaiModel: 'gpt-6.1-sol',
  preferredAddress: '',
};

function read() {
  let s;
  try {
    s = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {
    s = { ...DEFAULTS };
  }
  if (!DIENSTEN[s.aiDienst]) s.aiDienst = 'gemini';
  return s;
}

function write(changes) {
  const next = { ...read(), ...changes };
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n');
  return next;
}

// De sleutel van de gekozen dienst (leeg als er geen is).
function actief() {
  const s = read();
  const d = DIENSTEN[s.aiDienst];
  return { dienst: s.aiDienst, naam: d.naam, key: s[d.key], model: s[d.model] };
}

// Wat het leerkrachtenscherm te zien krijgt: nooit de hele sleutel.
function publicView() {
  const s = read();
  const diensten = {};
  for (const [id, d] of Object.entries(DIENSTEN)) {
    diensten[id] = { naam: d.naam, hasKey: Boolean(s[d.key]), keyHint: s[d.key] ? `…${s[d.key].slice(-4)}` : '', model: s[d.model] };
  }
  const nu = diensten[s.aiDienst];
  return {
    aiDienst: s.aiDienst,
    aiNaam: nu.naam,
    hasKey: nu.hasKey,
    keyHint: nu.keyHint,
    diensten,
    geminiModel: s.geminiModel,
    geminiAutoModel: s.geminiAutoModel,
  };
}

module.exports = { read, write, actief, publicView, DIENSTEN, SLEUTELS, DEFAULTS };
