// De AI die de leerkracht bij Instellingen koos: Gemini (standaard, kan gratis), Claude of ChatGPT.
// Elke dienst gebruikt de eigen sleutel van de leerkracht. Gewone fetch, geen extra bibliotheken.
const settings = require('./settings');
const quizzes = require('./quizzes');
const gemini = require('./gemini');

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const BUSY = new Set([429, 500, 503, 504, 529]);

function checkFiles(files) {
  if (!Array.isArray(files) || files.length > 10) throw new Error('Kies hooguit 10 bestanden.');
  let total = 0;
  for (const f of files) {
    if (!f || typeof f.data !== 'string' || !/^(image\/[\w.+-]+|application\/pdf)$/.test(f.mimeType)) {
      throw new Error('Alleen afbeeldingen en pdf\'s kunnen als lesstof.');
    }
    total += f.data.length * 0.75;
  }
  if (total > MAX_FILE_BYTES) throw new Error('De lesstof is te groot (meer dan 20 MB).');
}

// Eén POST met twee herkansingen als de dienst het even druk heeft.
async function post(naam, url, headers, body) {
  let res, data;
  for (let wait = 2000; ; wait *= 2) {
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180000),
      });
    } catch (err) {
      if (err.name === 'TimeoutError') throw new Error(`${naam} reageerde niet op tijd. Probeer het opnieuw.`);
      throw new Error(`Geen verbinding met ${naam}. Heeft deze pc internet?`);
    }
    data = await res.json().catch(() => ({}));
    if (!BUSY.has(res.status) || wait > 4000) break;
    await sleep(wait);
  }
  if (!res.ok) {
    const detail = (data.error && (data.error.message || data.error)) || '';
    const kort = typeof detail === 'string' ? detail.split('\n')[0].slice(0, 160) : '';
    if (res.status === 401) throw new Error(`De ${naam}-sleutel is ongeldig. Controleer hem bij Instellingen.`);
    if (res.status === 403) throw new Error(`Deze sleutel mag ${naam} niet gebruiken${kort ? ` (${kort})` : ''}.`);
    if (res.status === 404) throw new Error(`Het model bestaat niet (meer) bij ${naam}. Kies bij Instellingen een ander model.`);
    if (res.status === 402 || /credit|quota|billing|balance/i.test(kort)) throw new Error(`Er is geen tegoed meer op je ${naam}-account. Vul het aan of kies Gemini bij Instellingen.${kort ? ` (${kort})` : ''}`);
    if (BUSY.has(res.status)) throw new Error(`${naam} heeft het nu te druk. Probeer het over enkele minuten opnieuw, of gebruik de knoppen hierboven (kopiëren en plakken).`);
    throw new Error(`${naam} gaf een fout${kort ? ` (${kort})` : ''}.`);
  }
  return data;
}

// Claude (Anthropic). Op modellen die het kennen vangt een ander Claude-model een weigering op.
const FALLBACK = /^claude-(opus-5-5|opus-5|sonnet-5-5|fable-5-1)$/;
async function claude(prompt, files, key, model) {
  const content = files.map(f => f.mimeType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: f.mimeType, data: f.data } }
    : { type: 'image', source: { type: 'base64', media_type: f.mimeType, data: f.data } });
  content.push({ type: 'text', text: prompt });
  const headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  const body = { model, max_tokens: 16000, output_config: { effort: 'medium' }, messages: [{ role: 'user', content }] };
  if (FALLBACK.test(model)) {
    headers['anthropic-beta'] = 'server-side-fallback-2026-07-01';
    body.fallbacks = 'default';
  }
  const base = process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com';
  const data = await post('Claude', `${base}/v1/messages`, headers, body);
  if (data.stop_reason === 'refusal') throw new Error('Claude wilde deze vraag niet beantwoorden. Pas het onderwerp aan.');
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

// ChatGPT (OpenAI), via de Responses API: die neemt ook pdf's aan.
async function openai(prompt, files, key, model) {
  const content = files.map((f, i) => f.mimeType === 'application/pdf'
    ? { type: 'input_file', filename: `lesstof-${i + 1}.pdf`, file_data: `data:${f.mimeType};base64,${f.data}` }
    : { type: 'input_image', image_url: `data:${f.mimeType};base64,${f.data}` });
  content.push({ type: 'input_text', text: prompt });
  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
  const data = await post('ChatGPT', `${base}/v1/responses`, { Authorization: `Bearer ${key}` },
    { model, input: [{ role: 'user', content }] });
  return (data.output || []).filter(o => o.type === 'message')
    .flatMap(o => o.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('');
}

// files: [{ mimeType, data }] met base64-data. parse zet de tekst om (standaard een Toernooi-quiz).
async function generateQuiz(prompt, files = [], parse = quizzes.parseAiText) {
  const { dienst, naam, key, model } = settings.actief();
  if (dienst === 'gemini') return gemini.generateQuiz(prompt, files, parse);
  if (!key) throw new Error(`Er is nog geen ${naam}-sleutel ingesteld. Kies Instellingen op het startscherm.`);
  if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('De prompt is leeg.');
  checkFiles(files);
  const vraag = `${prompt.slice(0, 20000)}\n\nAntwoord alleen met de JSON, zonder uitleg ervoor of erna.`;
  const text = await (dienst === 'claude' ? claude : openai)(vraag, files, key, model);
  if (!text) throw new Error(`${naam} gaf een leeg antwoord. Probeer het opnieuw of pas het onderwerp aan.`);
  return parse(text);
}

module.exports = { generateQuiz };
