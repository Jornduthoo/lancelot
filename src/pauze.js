// De pauzeknop: de leerkracht zet alles even stil. Elk spel gebruikt de klok hieronder in plaats van de echte:
// tijdens een pauze staat die klok stil, lopen er geen tikken en wachten timers. Na de pauze loopt alles
// verder waar het was, zonder dat er tijd of punten verloren gaan.
const echt = { now: Date.now, setTimeout, clearTimeout, setInterval, clearInterval };

let gepauzeerdSinds = 0; // echte tijd waarop de pauze begon, 0 = geen pauze
let stilTotaal = 0;      // hoe lang alle pauzes samen al duurden
let tekst = '';
const wachtend = new Set(); // timers die tijdens de pauze afliepen
const luisteraars = [];

const now = () => (gepauzeerdSinds || echt.now()) - stilTotaal;

class Timer {
  constructor(fn, ms, args) {
    this.fn = fn;
    this.args = args;
    this.op = now() + Math.max(0, Number(ms) || 0);
    this.plan();
  }
  plan() {
    this.echt = echt.setTimeout(() => this.af(), Math.max(0, this.op - now()));
  }
  af() {
    this.echt = null;
    if (this.weg) return;
    // In pauze, of de pauze schoof de klok op: later opnieuw proberen.
    if (gepauzeerdSinds) return wachtend.add(this);
    if (now() < this.op) return this.plan();
    this.weg = true;
    this.fn(...this.args);
  }
  stop() {
    this.weg = true;
    if (this.echt) echt.clearTimeout(this.echt);
    wachtend.delete(this);
  }
  // Zodat de timer net als een echte timer de server niet openhoudt.
  unref() { if (this.echt) this.echt.unref(); return this; }
  ref() { return this; }
  hasRef() { return true; }
}

class Tikker {
  constructor(fn, ms, args) {
    this.echt = echt.setInterval(() => { if (!gepauzeerdSinds) fn(...args); }, ms);
  }
  stop() { echt.clearInterval(this.echt); }
  unref() { this.echt.unref(); return this; }
  ref() { return this; }
  hasRef() { return true; }
}

const stop = t => { if (t && typeof t.stop === 'function') t.stop(); else if (t) echt.clearTimeout(t); };

// Date met een stilstaande now(); new Date() blijft de echte datum geven (voor bestandsnamen en het logboek).
class KlokDate extends Date {
  static now() { return now(); }
}

const klok = {
  Date: KlokDate,
  setTimeout: (fn, ms, ...args) => new Timer(fn, ms, args),
  setInterval: (fn, ms, ...args) => new Tikker(fn, ms, args),
  clearTimeout: stop,
  clearInterval: stop,
};

function zet(aan, nieuweTekst) {
  aan = !!aan;
  if (aan) {
    tekst = String(nieuweTekst || '').trim().slice(0, 120);
    if (!gepauzeerdSinds) gepauzeerdSinds = echt.now();
  } else if (gepauzeerdSinds) {
    stilTotaal += echt.now() - gepauzeerdSinds;
    gepauzeerdSinds = 0;
    tekst = '';
    const lijst = [...wachtend];
    wachtend.clear();
    for (const t of lijst) if (!t.weg) t.plan();
  }
  for (const fn of luisteraars) fn(stand());
  return stand();
}

const stand = () => ({ aan: !!gepauzeerdSinds, tekst, sinds: gepauzeerdSinds });

module.exports = { klok, now, zet, stand, opWijziging: fn => luisteraars.push(fn) };
