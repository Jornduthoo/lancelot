// Optioneel: quizvragen direct laten maken door Google Gemini met de eigen API-sleutel van de leerkracht.
const settings = require('./settings');
const quizzes = require('./quizzes');

const MAX_FILE_BYTES = 20 * 1024 * 1024;

// files: [{ mimeType, data }] met base64-data, bijvoorbeeld een screenshot van het bordboek of een pdf.
async function generateQuiz(prompt, files = []) {
  const { geminiKey, geminiModel } = settings.read();
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

  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  const url = `${base}/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [...fileParts, { text: prompt.slice(0, 20000) }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(90000),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new Error('Gemini reageerde niet op tijd. Probeer het opnieuw.');
    throw new Error('Geen verbinding met Gemini. Heeft deze pc internet?');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error && data.error.message ? ` (${data.error.message})` : '';
    if (res.status === 400 && /api key/i.test(detail)) throw new Error('De Gemini-sleutel is ongeldig. Controleer hem bij Instellingen.');
    if (res.status === 403) throw new Error(`Deze sleutel mag Gemini niet gebruiken${detail}.`);
    if (res.status === 404) throw new Error(`Het model "${geminiModel}" bestaat niet (meer). Kies een ander model bij Instellingen.`);
    if (res.status === 429) throw new Error('De gratis limiet van Gemini is even bereikt. Wacht een minuut of gebruik kopiëren en plakken.');
    throw new Error(`Gemini gaf een fout${detail}.`);
  }

  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
  if (!text) throw new Error('Gemini gaf een leeg antwoord. Probeer het opnieuw of pas het onderwerp aan.');
  return quizzes.parseAiText(text);
}

module.exports = { generateQuiz };
