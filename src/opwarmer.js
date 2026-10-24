// De Opwarmer: een paar snelle herhaalvragen bij de start van de les.
// LANcelot kiest ze zelf uit de bewaarde quizzen, met het logboek als geheugen:
// - vragen en doelen die vaak fout gingen komen eerder terug;
// - wat lang geleden geoefend is, komt eerder terug (gespreid herhalen);
// - wat de klas de laatste uren al zag, schuift naar achteren;
// - de vragen worden gemengd over doelen en quizzen heen (afwisselend herhalen).
const fs = require('fs');
const path = require('path');
const quizzes = require('./quizzes');
const logboek = require('./logboek');
const doelen = require('./doelen');

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const RECENT = 18 * HOUR; // vandaag al gezien: niet meteen opnieuw
const MAX_PER_GROUP = 2; // hooguit twee vragen per doel en per quiz, zolang er genoeg keuze is

const key = text => String(text || '').trim().toLowerCase().slice(0, 160);

function vakVan(code) {
  const d = code && doelen.find(code);
  return d ? d.vak : '';
}

// Alle vragen uit alle quizzen, met wat het logboek erover weet.
function pool(now) {
  const perVraag = new Map();
  for (const e of logboek.read()) {
    const k = key(e.vraag);
    if (!k) continue;
    const s = perVraag.get(k) || { n: 0, juist: 0, laatst: 0 };
    if (!e.leeg) {
      s.n++;
      if (e.juist) s.juist++;
    }
    s.laatst = Math.max(s.laatst, Date.parse(e.t) || 0);
    perVraag.set(k, s);
  }
  const perDoel = logboek.summary().perDoel;

  const items = [];
  const seen = new Set();
  for (const info of quizzes.list()) {
    let quiz;
    try { quiz = quizzes.load(info.file); } catch { continue; }
    let made = now;
    try { made = fs.statSync(path.join(quizzes.DIR, info.file)).mtimeMs; } catch {}
    for (const q of quiz.questions) {
      const k = key(q.question);
      if (seen.has(k)) continue; // dezelfde vraag in twee quizzen telt één keer
      seen.add(k);
      const vraag = perVraag.get(k) || null;
      const doel = q.doel ? perDoel[q.doel] || null : null;
      items.push({ q, bron: quiz.title, file: info.file, made, vraag, doel, vak: vakVan(q.doel) });
    }
  }
  return items;
}

// Hoe dringend moet deze vraag terugkomen? Hoger = eerder. Plus een korte uitleg voor de leerkracht.
function weigh(item, now) {
  const { vraag, doel } = item;
  const reasons = [];
  let w = 0;
  if (vraag && vraag.n) {
    const fout = 1 - vraag.juist / vraag.n;
    w += 2 * fout;
    reasons.push(`${Math.round((vraag.juist / vraag.n) * 100)}% juist bij deze vraag`);
  } else {
    w += 0.6; // nog nooit gespeeld: een gewone kans
  }
  if (doel && doel.antwoorden) {
    const acc = doel.juist / doel.antwoorden;
    w += 1 - acc;
    if (!vraag || !vraag.n) reasons.push(`doel ${item.q.doel}: ${Math.round(acc * 100)}% juist`);
  }
  const last = vraag && vraag.laatst ? vraag.laatst : item.made;
  const days = (now - last) / DAY;
  w += Math.min(days, 30) / 15; // tot 2 punten erbij voor wat lang geleden is
  if (vraag && vraag.laatst) reasons.push(days < 1 ? 'vandaag gespeeld' : `${Math.round(days)} ${Math.round(days) === 1 ? 'dag' : 'dagen'} geleden`);
  else reasons.push('nog niet gespeeld');
  if (now - last < RECENT) w -= 3; // vandaag al gezien of net gemaakt: liever iets ouders
  w += Math.random() * 0.4; // een beetje toeval, zodat het niet elke keer hetzelfde rijtje is
  return { w, reden: reasons.join(' · ') };
}

// Kies de vragen: de dringendste eerst, maar niet te veel van hetzelfde doel of dezelfde quiz.
function pick(items, aantal) {
  const chosen = [];
  const count = new Map();
  const bump = k => count.set(k, (count.get(k) || 0) + 1);
  for (const limit of [MAX_PER_GROUP, Infinity]) {
    for (const it of items) {
      if (chosen.length >= aantal) break;
      if (chosen.includes(it)) continue;
      const groups = [`quiz:${it.file}`, ...(it.q.doel ? [`doel:${it.q.doel}`] : [])];
      if (groups.some(g => (count.get(g) || 0) >= limit)) continue;
      chosen.push(it);
      groups.forEach(bump);
    }
  }
  // Mengen: nooit twee vragen uit dezelfde quiz na elkaar als het anders kan.
  const out = [];
  const rest = chosen.slice();
  while (rest.length) {
    const prev = out[out.length - 1];
    let i = rest.findIndex(it => !prev || it.file !== prev.file);
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

// opts: { aantal, vak }. Geeft een speelklare quiz terug en per vraag waarom ze gekozen is.
function make({ aantal = 6, vak = '' } = {}, now = Date.now()) {
  const n = Math.max(3, Math.min(15, Math.round(Number(aantal)) || 6));
  let items = pool(now);
  const vakken = [...new Set(items.map(it => it.vak).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
  if (vak) items = items.filter(it => it.vak === vak);
  if (!items.length) {
    throw new Error(vak
      ? `Er zijn nog geen vragen met een doel voor ${vak}. Kies "Alle vakken" of geef je vragen een leerplandoel.`
      : 'Er zijn nog geen quizzen. Maak eerst een quiz, dan kan de Opwarmer er later vragen uit herhalen.');
  }
  const scored = items.map(it => ({ ...it, ...weigh(it, now) })).sort((a, b) => b.w - a.w);
  const chosen = pick(scored, n);
  const quiz = {
    title: 'Opwarmer',
    spel: 'Opwarmer',
    questions: chosen.map(it => ({ ...it.q, time: Math.min(it.q.time, 30) })),
  };
  const uitleg = chosen.map(it => ({ bron: it.bron, doel: it.q.doel || '', reden: it.reden }));
  return { quiz, uitleg, vakken, beschikbaar: items.length };
}

// Een (eventueel door de leerkracht ingekorte) Opwarmer opnieuw controleren voor hij start.
function prepare(quiz) {
  const clean = quizzes.validate({ ...quiz, title: 'Opwarmer' });
  return { ...clean, spel: 'Opwarmer' };
}

module.exports = { make, prepare };
