// Tegen gokken, voor elk spel waarin leerlingen vragen beantwoorden.
// - Fout antwoord: even wachten (met het juiste antwoord in beeld) en die vraag komt een paar vragen later terug.
// - Drie keer na elkaar fout en veel te snel om de vraag gelezen te hebben: een langere pauze voor de leerling
//   en een seintje op het bord voor de leerkracht.
// server.js zet guard() rond de question/answer van een spel; judge() is voor spellen met één vraag voor iedereen.
const { factor } = require('./tempo');
const logboek = require('./logboek');

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
        return out;
      },
      answer(id, choice) {
        const p = game.players.get(id);
        const asked = p ? p.question : null;
        const out = game.answer(id, choice);
        if (!p || !out || out.error || typeof out.correct !== 'boolean') return out;
        const s = get(key, id);
        const now = Date.now();
        const ms = s.open ? now - s.askedAt : Infinity;
        s.open = false;
        const pause = Math.round(PAUSE_MS * scale(game.tempo));
        const gok = judge(key, id, { correct: out.correct, ms, limit: s.limit, name: p.name, socketId: p.socketId, spel, pause });
        if (out.correct) return out;
        let wait = own ? out.wait || 0 : Math.round(WRONG_MS * scale(game.tempo));
        if (!own) requeue(game, p, asked);
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

  return { guard, judge, fastMs };
}

module.exports = { create, fastMs };
