// De JSON halen uit het antwoord van een chatbot. Chatbots zetten er soms tekst of ```json omheen,
// gebruiken krulletjes-aanhalingstekens of laten een komma te veel staan. Soms maakt Gemini zelfs een
// interactieve quiz (een app met code) in plaats van JSON; dan geven we een duidelijke tip.

(function () {
// Alle stukken {...} met kloppende haakjes (en rekening houdend met tekst tussen aanhalingstekens).
function candidates(str) {
  const out = [];
  for (let start = str.indexOf('{'); start !== -1 && out.length < 50; start = str.indexOf('{', start + 1)) {
    let depth = 0;
    let quote = null;
    for (let i = start; i < str.length; i++) {
      const ch = str[i];
      if (quote) {
        if (ch === '\\') i++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"') quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) {
        out.push(str.slice(start, i + 1));
        break;
      }
    }
  }
  return out.sort((a, b) => b.length - a.length);
}

function tryParse(text) {
  const attempts = [
    text,
    text.replace(/[“”„]/g, '"').replace(/[‘’]/g, "'"),
    text.replace(/[“”„]/g, '"').replace(/,\s*([}\]])/g, '$1'),
    // Kopiëren als markdown zet soms \[ of \_ in de tekst: geen geldige JSON-escape, dus de backslash weg.
    text.replace(/[“”„]/g, '"').replace(/,\s*([}\]])/g, '$1').replace(/\\([^"\\/bfnrtu])/g, '$1'),
  ];
  for (const t of attempts) {
    try {
      const data = JSON.parse(t);
      if (data && typeof data === 'object' && !Array.isArray(data)) return data;
    } catch {
      // volgende poging
    }
  }
  return null;
}

const looksLikeApp = str => /<!doctype|<html|<script|<div|import\s+react|export\s+default|function\s+\w+\s*\(|const\s+\w+\s*=|useState|document\./i.test(str);

// Wat een chatbot of een kopieerknop er soms bij doet: HTML-tekens (&#x20; &nbsp; &quot; ...), een backslash op het einde van
// elke regel (kopiëren als markdown), harde spaties en onzichtbare tekens. Dat halen we eerst weg.
const ENT = { nbsp: ' ', quot: '"', amp: '&', lt: '<', gt: '>', apos: "'", '#39': "'" };
function opschonen(raw) {
  let s = String(raw == null ? '' : raw).replace(/^\uFEFF/, '');
  for (let i = 0; i < 2 && /&(#x?[0-9a-f]+|[a-z]+);/i.test(s); i++) {
    s = s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
      .replace(/&([a-z]+|#39);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
  }
  return s
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[\u200B-\u200D\u2060]/g, '')
    .replace(/\\[ \t]*(?=\r?\n|$)/g, '');
}

const zonderBronnen = str => str
  .replace(/\s*\[cite(?:_start|_end)?(?::[^\]\n]*)?\]/gi, '')
  .replace(/\s*【[^】\n]*】/g, '');

// what: 'quiz', 'oefenblad' of 'sessie' (voor de foutmeldingen). check(data) zegt of het de juiste soort is.
function extract(raw, what, check = () => true) {
  // Gemini zet bronverwijzingen in de tekst: [cite: 14, 16], [cite_start], [cite_end], 【4†bron】. Die horen er niet in.
  const str = zonderBronnen(opschonen(raw));
  // Eerst de codeblokken met json, dan alles.
  const fences = [...str.matchAll(/```(?:json|JSON)?\s*([\s\S]*?)```/g)].map(m => m[1]);
  for (const part of [...fences, str]) {
    for (const c of candidates(part)) {
      const data = tryParse(c);
      if (data && check(data)) return data;
    }
  }
  if (looksLikeApp(str)) {
    throw new Error(`Dit is een app of interactieve ${what}, geen JSON. Vraag in Gemini: "Geef me enkel de JSON als tekst, geen interactieve ${what} en geen code." Zet Canvas uit als dat aan staat.`);
  }
  if (str.indexOf('{') === -1) throw new Error(`Geen ${what} gevonden in de geplakte tekst. Plak het hele antwoord van de AI.`);
  throw new Error(`De geplakte tekst is geen geldige JSON. Vraag de AI om "enkel de JSON als tekst" en probeer opnieuw.`);
}

const AiJson = { extract, zonderBronnen, opschonen };
if (typeof module !== 'undefined' && module.exports) module.exports = AiJson;
else window.AiJson = AiJson;
})();
