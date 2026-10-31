// Een quiz-taak alleen spelen in een spel zonder tegenstanders (De prinses in de toren, Pixelridder, Diepboor ...).
// Elke leerling krijgt zijn eigen exemplaar van het spel, los van wat er op het bord loopt: er hoeft geen spel te lopen,
// en een spel op het bord stoort niet. Het spel krijgt de vragen die de leerling nog niet beantwoordde, op zijn niveau.
// De eerste poging op elke vraag telt voor de taak (taken.soloAntwoord); in het spel komt een foute vraag later terug, om te oefenen.
// Het leerlingscherm is het gewone startscherm met ?taak=... (player.js); de verbinding krijgt hier alleen de handlers van dat ene spel.
const taken = require('./taken');
const { Toren } = require('./toren');
const { Schat } = require('./schat');
const { Pixelridder } = require('./pixelridder');
const { Diepboor } = require('./diepboor');
const { Neonvlucht } = require('./neonvlucht');
const { Raketridder } = require('./raketridder');
const { Splijtzwaard } = require('./splijtzwaard');
const { Wankelwagen } = require('./wankelwagen');
const { Plasmapoort } = require('./plasmapoort');
const { Tuimelridder } = require('./tuimelridder');
const { Hooibergjacht } = require('./hooibergjacht');
const { Zwermwacht } = require('./zwermwacht');
const { Haakridder } = require('./haakridder');
const { Robomol } = require('./robomol');

// Spellen met attachPlayer koppelen zichzelf; de toren en de schattenjacht hangen we hier zelf aan de verbinding.
const SPELLEN = {
  toren: { Klasse: Toren, pre: 'tw', acties: ['jump', 'move', 'hit'] },
  schat: { Klasse: Schat, pre: 'sj', acties: ['buy'] },
  pixel: { Klasse: Pixelridder, eigen: true },
  diep: { Klasse: Diepboor, eigen: true },
  vlucht: { Klasse: Neonvlucht, eigen: true },
  raket: { Klasse: Raketridder, eigen: true },
  zwaard: { Klasse: Splijtzwaard, eigen: true },
  wankel: { Klasse: Wankelwagen, eigen: true },
  plasma: { Klasse: Plasmapoort, eigen: true },
  tuimel: { Klasse: Tuimelridder, eigen: true },
  hooi: { Klasse: Hooibergjacht, eigen: true },
  zwerm: { Klasse: Zwermwacht, eigen: true },
  haak: { Klasse: Haakridder, eigen: true },
  robomol: { Klasse: Robomol, eigen: true },
};
const START_MS = 4000;      // even de uitleg in de wachtzaal lezen, dan start het vanzelf
const WEG_MS = 3 * 60000;   // zo lang wacht een spel op een leerling die de verbinding kwijt is

const validId = id => typeof id === 'string' && id.length > 0 && id.length <= 64;

// gok: de gokcontrole van server.js. onWerk: een leerling beantwoordde iets (het bord van Taken bijwerken).
function create(io, gok, onWerk) {
  const sessies = new Map();

  // Wat het spel naar "het bord" of "alle spelers" stuurt, gaat alleen naar deze leerling.
  function nepIo(s) {
    const keten = (rooms, skip) => ({
      to: r => keten(rooms.concat(r), skip),
      in: r => keten(rooms.concat(r), skip),
      except: l => keten(rooms, skip.concat(l)),
      emit: (...a) => {
        if (rooms.some(r => r === 'players' || r === s.sid) && !skip.includes(s.sid)) io.to(s.sid).emit(...a);
      },
    });
    return { to: r => keten([r], []), in: r => keten([r], []), emit: (...a) => io.to(s.sid).emit(...a), sockets: io.sockets };
  }

  function stand(s, extra = {}) {
    try {
      const r = taken.open({ id: s.id, naam: s.naam });
      io.to(s.sid).emit('tk-solo', { titel: r.titel, spel: s.spel, gedaan: r.gedaan, totaal: r.totaal, klaar: r.klaar, ...extra });
    } catch (err) {
      io.to(s.sid).emit('tk-solo', { fout: err.message, ...extra });
    }
  }

  function laad(s, ronde) {
    s.nr = ronde.nr;
    s.inst.load(ronde.quiz, ronde.minuten, 'normaal');
    s.inst.stil = true;
    if (s.inst.vragen) s.inst.vragen.stil = true;
  }

  function maak(s, ronde) {
    const { Klasse } = SPELLEN[ronde.spel];
    s.spel = ronde.spel;
    s.naam = ronde.naam;
    // Geen eindstand in resultaten/: de antwoorden staan al bij de taak en in het logboek.
    const inst = new Klasse(nepIo(s), () => {
      setTimeout(() => stand(s, { einde: true }), 1500);
      return null;
    });
    s.inst = inst;
    // Alleen deze leerling speelt mee, met zijn naam uit de taak. In de wachtzaal start het spel vanzelf.
    const join = inst.join.bind(inst);
    inst.join = (playerId, _naam, socketId) => {
      for (const k of [...inst.players.keys()]) if (k !== playerId) inst.players.delete(k);
      const res = join(playerId, s.naam, socketId);
      if (res.ok && inst.phase === 'lobby') {
        clearTimeout(s.start);
        s.start = setTimeout(() => inst.phase === 'lobby' && inst.start(), START_MS);
      }
      return res;
    };
    // De gokcontrole zoals in de gewone spellen, en daarna de eerste poging naar de taak.
    const g = gok.guard(inst, 'solo', 'Taak', { own: SPELLEN[s.spel].eigen === true });
    s.guard = {
      question: id => g.question(id),
      answer: (id, keuze) => {
        const p = inst.players.get(id);
        const gevraagd = p ? p.question : null;
        const out = g.answer(id, keuze);
        if (!out || typeof out.correct !== 'boolean' || !Number.isInteger(gevraagd) || s.nr[gevraagd] === undefined) return out;
        try {
          const q = inst.quiz.questions[gevraagd];
          const res = taken.soloAntwoord({ id: s.id, naam: s.naam, i: s.nr[gevraagd], keuze: out.correct ? q.correct : keuze, juist: out.correct });
          if (res) {
            io.to(s.sid).emit('tk-solo', { gedaan: res.gedaan, totaal: res.totaal, klaar: res.klaar, net: res.klaar });
            onWerk();
          }
        } catch { /* de taak is intussen gewist */ }
        return out;
      },
    };
    laad(s, ronde);
  }

  function koppel(s, socket) {
    const def = SPELLEN[s.spel];
    if (def.eigen) return s.inst.attachPlayer(socket, validId, s.guard);
    const { pre } = def;
    socket.emit(`${pre}-state`, s.inst.base());
    socket.on(`${pre}-join`, ({ playerId } = {}, cb) => {
      if (!validId(playerId)) return cb && cb({ error: 'Ongeldige speler.' });
      const result = s.inst.join(playerId, s.naam, socket.id);
      socket.data.soloId = result.ok ? playerId : null;
      cb && cb(result);
      if (result.ok) socket.emit(`${pre}-state`, s.inst.playerState(playerId));
    });
    const on = (event, fn) => socket.on(event, (arg, cb) => {
      const out = socket.data.soloId ? fn(socket.data.soloId, arg) : { error: 'Meld je eerst aan.' };
      if (typeof cb === 'function') cb(out || {});
    });
    for (const a of def.acties) on(`${pre}-${a}`, (id, arg) => s.inst[a](id, arg));
    on(`${pre}-question`, id => s.guard.question(id));
    on(`${pre}-answer`, (id, keuze) => s.guard.answer(id, keuze));
  }

  function stopSessie(sleutel, s) {
    clearTimeout(s.start);
    clearTimeout(s.weg);
    s.inst.stop();
    sessies.delete(sleutel);
  }

  // Een leerling opent zijn taak in het spel. Geeft false als de verbinding geen taak vraagt.
  function verbind(socket) {
    const { taak: id, naam } = socket.handshake.query;
    if (typeof id !== 'string' || !id) return false;
    let ronde;
    try {
      ronde = taken.soloRonde({ id, naam });
    } catch (err) {
      // Klaar, afgesloten of gewist: het spel van die taak mag weg.
      const sleutel = `${id}:${String(naam || '').trim().replace(/\s+/g, ' ').toLowerCase()}`;
      const oud = sessies.get(sleutel);
      if (oud && oud.inst.phase !== 'play') stopSessie(sleutel, oud);
      socket.emit('tk-solo', { fout: err.message });
      return true;
    }
    if (!SPELLEN[ronde.spel]) {
      socket.emit('tk-solo', { fout: 'Dat spel bestaat niet meer.' });
      return true;
    }
    const sleutel = `${id}:${ronde.naam.toLowerCase()}`;
    let s = sessies.get(sleutel);
    if (s) {
      clearTimeout(s.weg);
      s.sid = socket.id;
    } else {
      s = { id, sid: socket.id };
      sessies.set(sleutel, s);
      maak(s, ronde);
    }
    koppel(s, socket);
    stand(s, { einde: s.inst.phase === 'einde' });

    // Nog een ronde: met de vragen die nog openstaan.
    socket.on('tk-solo-opnieuw', (_, cb) => {
      try {
        if (s.inst.phase === 'play') throw new Error('Het spel loopt nog.');
        laad(s, taken.soloRonde({ id, naam: s.naam }));
        if (typeof cb === 'function') cb({ ok: true });
      } catch (err) {
        if (typeof cb === 'function') cb({ error: err.message });
      }
    });
    socket.on('disconnect', () => {
      if (s.sid !== socket.id) return;
      s.weg = setTimeout(() => stopSessie(sleutel, s), WEG_MS);
    });
    return true;
  }

  return { verbind, aantal: () => sessies.size };
}

module.exports = { create, SPELLEN };
