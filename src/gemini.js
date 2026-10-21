// Optioneel: quizvragen direct laten maken door Google Gemini met de eigen API-sleutel van de leerkracht.
// Modellen verdwijnen af en toe bij Google. Daarom vragen we met de sleutel op welke modellen er zijn
// en kiezen we automatisch het beste "flash"-model, tenzij de leerkracht zelf een model invult.
const settings = require('./settings');
const quizzes = require('./quizzes');

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const AUTO = 'auto';

function baseUrl() {
  return process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
}

async function call(path, key, options = {}) {
  let res;
  try {
    res = await fetch(`${baseUrl()}/v1beta/${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(options.timeout || 90000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new Error('Gemini reageerde niet op tijd. Probeer het opnieuw.');
    throw new Error('Geen verbinding met Gemini. Heeft deze pc internet?');
  }
  const data = await res.json().catch(() => ({}));
  return { res, data, detail: data.error && data.error.message ? data.error.message : '' };
}

function keyError(status, detail) {
  if ((status === 400 && /api key/i.test(detail)) || status === 401) {
    return new Error('De Gemini-sleutel is ongeldig. Controleer hem bij Instellingen.');
  }
  if (status === 403) return new Error(`Deze sleutel mag Gemini niet gebruiken${detail ? ` (${detail})` : ''}.`);
  return null;
}

// Rangschikt modellen: stabiele flash-modellen eerst, de nieuwste versie bovenaan.
function score(name) {
  const id = name.replace(/^models\//, '');
  if (!/^gemini-/.test(id)) return -1;
  if (/(image|tts|audio|live|embedding|vision|thinking|computer|robotics|learnlm|aqa)/.test(id)) return -1;
  const version = parseFloat((id.match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0');
  let s = version * 100;
  if (/flash/.test(id)) s += 50;
  if (/lite/.test(id)) s -= 30;
  if (/pro/.test(id)) s -= 20;
  if (/(preview|exp)/.test(id)) s -= 40;
  if (/-latest$/.test(id)) s += 5;
  return s;
}

async function pickModel(key) {
  const { res, data, detail } = await call('models?pageSize=1000', key, { timeout: 20000 });
  if (!res.ok) {
    throw keyError(res.status, detail) || new Error(`Kon de lijst met Gemini-modellen niet ophalen${detail ? ` (${detail})` : ''}.`);
  }
  const usable = (data.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => m.name)
    .filter(name => score(name) >= 0)
    .sort((a, b) => score(b) - score(a));
  if (usable.length === 0) throw new Error('Met deze sleutel is geen geschikt Gemini-model beschikbaar.');
  return usable[0].replace(/^models\//, '');
}

// files: [{ mimeType, data }] met base64-data, bijvoorbeeld een screenshot van het bordboek of een pdf.
async function generateQuiz(prompt, files = []) {
  const { geminiKey, geminiModel, geminiAutoModel } = settings.read();
  if (!geminiKey) throw new Error('Er is nog geen Gemini-sleutel ingesteld. Kies Instellingen op het startscherm.');
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('De prompt is leeg.');

  if (!Array.isArray(files) || files.length > 10) throw new Error('Kies hooguit 10 bestanden.');
  let total = 0;
  const fileParts = files.map(f => {
    if (!f || typeof f.data !== 'string' || !/^(image\/[\w.+-]+|application\/pdf)$/.test(f.mimeType)) {
      throw new Error('Alleen afbeeldingen en pdf\'s kunnen als lesstof.');
    }
    total += f.data.length * 0.75;
    return { inline_data: { mime_type: f.mimeType, data: f.data } };
  });
  if (total > MAX_FILE_BYTES) throw new Error('De lesstof is te groot (meer dan 20 MB).');

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [...fileParts, { text: prompt.slice(0, 20000) }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });

  const auto = !geminiModel || geminiModel === AUTO;
  let model = auto ? geminiAutoModel || (await pickModel(geminiKey)) : geminiModel;
  let attempt = await call(`models/${encodeURIComponent(model)}:generateContent`, geminiKey, { method: 'POST', body });

  // Model verdwenen? Zoek een nieuw model en probeer het één keer opnieuw.
  if (attempt.res.status === 404) {
    const fresh = await pickModel(geminiKey);
    if (fresh !== model) {
      model = fresh;
      attempt = await call(`models/${encodeURIComponent(model)}:generateContent`, geminiKey, { method: 'POST', body });
    }
  }

  const { res, data, detail } = attempt;
  if (!res.ok) {
    throw keyError(res.status, detail)
      || (res.status === 404 && new Error(`Het model "${model}" bestaat niet (meer). Zet het model bij Instellingen op "auto".`))
      || (res.status === 429 && new Error('De gratis limiet van Gemini is even bereikt. Wacht een minuut of gebruik kopiëren en plakken.'))
      || new Error(`Gemini gaf een fout${detail ? ` (${detail})` : ''}.`);
  }

  // Het werkende model onthouden, zodat de lijst niet elke keer opgehaald hoeft te worden.
  if (auto && model !== geminiAutoModel) settings.write({ geminiAutoModel: model });
  if (!auto && model !== geminiModel) settings.write({ geminiModel: AUTO, geminiAutoModel: model });

  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  if (!text) throw new Error('Gemini gaf een leeg antwoord. Probeer het opnieuw of pas het onderwerp aan.');
  return quizzes.parseAiText(text);
}

module.exports = { generateQuiz, AUTO };
