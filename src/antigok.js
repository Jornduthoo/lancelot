// Tegen gokken, voor elk spel waarin leerlingen vragen beantwoorden.
// - Fout antwoord: even wachten (met het juiste antwoord in beeld) en die vraag komt een paar vragen later terug.
// - Drie keer na elkaar fout en veel te snel om de vraag gelezen te hebben: een langere pauze voor de leerling
//   en een seintje op het bord voor de leerkracht.
// server.js zet guard() rond de question/answer van een spel; judge() is voor spellen met één vraag voor iedereen.
const { Date, setTimeout, setInterval, clearTimeout, clearInterval } = require('./pauze').klok; // stil tijdens de pauzeknop
const { factor } = require('./tempo');
const logboek = require('./logboek');
const quizzes = require('./quizzes');
const getal = require('./getal');

const WRONG_MS = 3000;
const PAUSE_MS = 12000;
const FAST_IN_A_ROW = 3;
const FORGET_MS = 10 * 60 * 1000;

// Zo snel kan niemand de vraag en de antwoorden lezen: langere vragen krijgen wat meer tijd.
const fastMs = (q, answers) => Math.min(3500, 1200 + 20 * (String(q || '').length + (answers || []).join('').length));
const scale = tempo => Math.sqrt(factor(tempo));

function create(io) {
  const state = new Map();

  function get(key, id) {
    const now = Date.now();
    let s = state.get(`${key}:${id}`);
    if (!s || now - s.at > FORGET_MS) {
      s = { waitUntil: 0, askedAt: 0, open: false, fast: 0, flags: 0, limit: 0 };
      state.set(`${key}:${id}`, s);
    }
    s.at = now;
    return s;
  }

  // Geeft true als de leerling net voor de derde keer na elkaar snel en fout antwoordde.
  function judge(key, id, { correct, ms, limit, name, socketId, spel, pause = 0 }) {
    const s = get(key, id);
    if (correct || ms >= limit) {
      s.fast = 0;
      return false;
    }
    if (++s.fast < FAST_IN_A_ROW) return false;
    s.fast = 0;
    s.flags++;
    io.to('host').emit('gok', { name, spel, flags: s.flags });
    logboek.gok(spel, name);
    if (socketId) io.to(socketId).emit('gok-pauze', { ms: pause || 4000 });
    return true;
  }

  // Een vraag die fout was, schuift een paar plaatsen op in de eigen volgorde van de leerling.
  function requeue(game, p, asked) {
    let index = asked;
    if (asked && typeof asked === 'object') index = asked.id === game.quizId ? asked.index : null;
    if (!Number.isInteger(index) || !Array.isArray(p.order) || p.order.length < 2) return;
    if (p.order.slice(0, 3).includes(index)) return;
    p.order.splice(2, 0, index);
  }

  // own: het spel wacht en herhaalt zelf al; dan voegen we alleen de gokcontrole toe.
  function guard(game, key, spel, { own = false } = {}) {
    return {
      question(id) {
        const s = get(key, id);
        const now = Date.now();
        if (now < s.waitUntil) return { error: 'Even wachten.', wait: s.waitUntil - now };
        const out = game.question(id);
        if (out && out.question && !s.open) {
          s.open = true;
          s.askedAt = now;
          s.limit = fastMs(out.question, out.answers);
        }
        if (out && out.question) {
          // Wat de leerling nu ziet: voor de getalvragen, de uitleg en de veelgemaakte fouten.
          s.vraag = out.question;
          s.answers = Array.isArray(out.answers) ? out.answers : null;
          const ex = quizzes.extraVoor(out.question);
          if (ex && ex.typ === 'getal') out.typ = 'getal';
        }
        return out;
      },
      answer(id, choice) {
        const p = game.players.get(id);
        const asked = p ? p.question : null;
        const s0 = get(key, id);
        const ex = s0.vraag ? quizzes.extraVoor(s0.vraag) : null;
        // Een getalvraag: de leerling typte { getal: '3,5' }. Dat wordt het nummer van het juiste of een fout antwoord.
        let getypt = null;
        if (choice && typeof choice === 'object') {
          if (!ex || ex.typ !== 'getal' || !s0.answers) return { error: 'Deze vraag is meerkeuze.' };
          getypt = String(choice.getal ?? '').trim().slice(0, 30);
          if (!getypt) return { error: 'Typ eerst een getal.' };
          choice = getal.kies(s0.answers, ex.juist, getypt);
        }
        const out = game.answer(id, choice);
        if (!p || !out || out.error || typeof out.correct !== 'boolean') return out;
        if (!out.correct) fout(game, p, spel, s0, ex, getypt ?? (s0.answers || [])[choice], out);
        if (getypt !== null) out.getypt = getypt;
        const s = get(key, id);
        const now = Date.now();
        const ms = s.open ? now - s.askedAt : Infinity;
        s.open = false;
        const pause = Math.round(PAUSE_MS * scale(game.tempo));
        const gok = judge(key, id, { correct: out.correct, ms, limit: s.limit, name: p.name, socketId: p.socketId, spel, pause });
        if (out.correct) return out;
        let wait = own ? out.wait || 0 : Math.round(WRONG_MS * scale(game.tempo));
        if (!own) requeue(game, p, asked);
        // Met uitleg erbij: wat langer, zodat de leerling ze kan lezen.
        if (out.uitleg) wait += Math.min(4000, 1000 + 25 * out.uitleg.length);
        if (gok) {
          wait = Math.max(wait, pause);
          out.gok = true;
        }
        s.waitUntil = now + wait;
        out.wait = wait;
        return out;
      },
    };
  }

  // Een fout antwoord: de uitleg naar de leerling, en wat hij koos naar de veelgemaakte fouten.
  function fout(game, p, spel, s, ex, gekozen, out) {
    const juist = s.answers && Number.isInteger(out.right) ? s.answers[out.right] : ex ? ex.juist : '';
    if (ex && ex.uitleg) {
      out.uitleg = ex.uitleg;
      uitleg(p.socketId, ex.uitleg, juist);
    }
    logboek.keuze({ naam: p.name, spel, bron: game.quiz && game.quiz.title, vraag: s.vraag, doel: ex ? ex.doel : '', gekozen, juist });
  }

  // Elk scherm toont de uitleg met ui.js, welk spel er ook loopt.
  function uitleg(socketId, tekst, juist) {
    if (socketId && tekst) io.to(socketId).emit('uitleg', { tekst, juist });
  }

  return { guard, judge, fastMs, uitleg };
}

module.exports = { create, fastMs };
