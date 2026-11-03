// Vragenstorm: de leerkracht drukt op het bord en elke leerling in het spel krijgt meteen een paar vragen na elkaar.
// Op het leerlingenscherm staat het spel even stil (public/js/vragenstorm.js). De vragen lopen langs het spel zelf
// (met de regels tegen gokken), dus elk juist antwoord geeft de gewone beloning van dat spel en komt in het logboek.
const AANTAL = 3;
const MAX_MS = 3 * 60 * 1000; // een storm stopt vanzelf als iemand niet verder antwoordt
// Spellen waar een losse vraag niet past (een vraag hoort daar bij een deur, een kaart of een kist).
const NIET = new Set(['kerker', 'rijk', 'verrader', 'burcht', 'roof']);

function create(io, spellen, guarded) {
  let storm = null; // { pad, g, spel, per: Map(id -> { left, juist, k }), timer }

  const guardVoor = spel => Object.entries(guarded).find(([key, g]) => g.game === spel && !NIET.has(key));
  const kan = pad => {
    const spel = spellen[pad];
    return !!(spel && spel.phase === 'play' && spel.players instanceof Map && guardVoor(spel));
  };

  function stand() {
    if (!storm) return { aan: false };
    const rij = [...storm.per.values()];
    return { aan: true, pad: storm.pad, n: AANTAL, klaar: rij.filter(r => r.left === 0).length, totaal: rij.length, juist: rij.reduce((a, r) => a + r.juist, 0) };
  }
  const meld = () => io.to('host').emit('storm-stand', stand());

  function start(pad) {
    if (storm) return { error: 'Er loopt al een Vragenstorm.' };
    if (!kan(pad)) return { error: 'Een Vragenstorm kan alleen tijdens een spel.' };
    const spel = spellen[pad];
    const [, g] = guardVoor(spel);
    const per = new Map();
    for (const [id, p] of spel.players) {
      if (!p.socketId || !io.sockets.sockets.get(p.socketId)) continue;
      per.set(id, { left: AANTAL, juist: 0, sock: p.socketId });
    }
    if (!per.size) return { error: 'Er speelt nog niemand mee.' };
    storm = { pad, spel, g, per, timer: setTimeout(() => stop(), MAX_MS) };
    for (const r of per.values()) io.to(r.sock).emit('storm', { n: AANTAL });
    meld();
    return stand();
  }

  function stop() {
    if (!storm) return;
    clearTimeout(storm.timer);
    for (const [id, r] of storm.per) {
      if (r.left > 0) io.to(r.sock).emit('storm', { uit: true });
      los(id);
    }
    storm = null;
    meld();
  }

  // Na de storm staat er in het spel geen vraag meer open voor deze leerling.
  function los(id) {
    if (storm && typeof storm.spel.asking === 'function') {
      try { storm.spel.asking(id, false); } catch { /* niet elk spel kent dit */ }
    }
  }

  // De leerling achter deze verbinding, als die in de storm zit.
  function wie(socket) {
    if (!storm) return null;
    for (const [id, r] of storm.per) {
      const p = storm.spel.players.get(id);
      if (p && p.socketId === socket.id) { r.sock = socket.id; return { id, r }; }
    }
    return null;
  }

  function klaar(id, r) {
    r.left = 0;
    los(id);
    meld();
    if ([...storm.per.values()].every(x => x.left === 0)) stop();
  }

  function vraag(socket) {
    const w = wie(socket);
    if (!w || w.r.left === 0) return { klaar: true };
    if (storm.spel.phase !== 'play') { stop(); return { klaar: true }; }
    const res = storm.g.question(w.id);
    if (res && res.wait && !res.question) return { wait: res.wait };
    if (!res || res.error || !res.question) { klaar(w.id, w.r); return { klaar: true }; }
    return { question: res.question, answers: res.answers, typ: res.typ };
  }

  function antwoord(socket, choice) {
    const w = wie(socket);
    if (!w || w.r.left === 0) return { error: 'Er staat geen vraag open.' };
    const res = storm.g.answer(w.id, choice);
    if (!res || res.error || typeof res.correct !== 'boolean') { klaar(w.id, w.r); return { error: 'Er staat geen vraag open.' }; }
    w.r.left--;
    if (res.correct) w.r.juist++;
    const left = w.r.left;
    if (left === 0) klaar(w.id, w.r);
    else meld();
    return { correct: res.correct, right: res.right, wait: res.wait || 0, left };
  }

  return { start, stop, stand, kan, vraag, antwoord };
}

module.exports = { create, AANTAL };
