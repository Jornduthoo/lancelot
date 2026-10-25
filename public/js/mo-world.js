// Robomol: het burchtplein met negen putten, gedeeld door de server, de leerlingen en het bord.
// Wanneer welke robotmol uit welke put komt, volgt uit een getal (seed) per spel. Zo ziet iedereen dezelfde mollen
// op hetzelfde moment, kan het bord ze mee tonen en kan de server nakijken of een slag echt raak was.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MoWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  // Soorten: een gewone mol (1 slag), een goudhelm (2 slagen, meer punten) en een bomdrone (niet raken!).
  const TYPES = {
    mol: { pts: 10, hp: 1 },
    goud: { pts: 30, hp: 2 },
    bom: { pts: -20, hp: 1 },
  };
  const RISE = 160; // ms omhoog
  const SINK = 200; // ms terug de put in
  const GRACE = 450; // zoveel later telt een slag nog (wifi)
  const STUN_MS = 1300; // na een bomdrone
  const FIRE_MS = 8000; // Vuurzwaard na een juist antwoord
  const ENERGY_MS = 20000; // zo lang gaat een volle zwaardlading mee (maal het tempo)
  const SWING_MS = 110; // sneller kan je niet slaan

  // De buren van een put (boven, onder, links, rechts) voor de vuurslag. Putten: 0 1 2 achteraan, 6 7 8 vooraan.
  const neighbours = h => [h - 3, h + 3, h % 3 ? h - 1 : -1, h % 3 < 2 ? h + 1 : -1].filter(x => x >= 0 && x < 9);

  // Reeks op rij geeft een hogere vermenigvuldiger: ×1, ×2 vanaf 5, ×3 vanaf 10, ×4 vanaf 20.
  const comboMult = c => (c >= 20 ? 4 : c >= 10 ? 3 : c >= 5 ? 2 : 1);

  function rng(seed) {
    let s = (seed >>> 0) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // Alle mollen voor een spel van ms milliseconden: [{ id, hole, t0, up, type }]. t0 en up in ms vanaf de start.
  // Het wordt sneller naarmate het spel vordert: korter boven en vaker, soms twee of drie tegelijk.
  function schedule(seed, ms) {
    const r = rng(seed);
    const list = [];
    const free = new Array(9).fill(0);
    let t = 1200;
    while (t < ms - 600) {
      const f = t / ms;
      const open = [];
      for (let h = 0; h < 9; h++) if (free[h] <= t) open.push(h);
      if (!open.length) { t += 120; continue; }
      const hole = open[Math.floor(r() * open.length)];
      const roll = r();
      const type = f > .04 && roll < .1 ? 'bom' : f > .04 && roll < .23 ? 'goud' : 'mol';
      let up = (1450 - 620 * f) * (.85 + r() * .3);
      if (type === 'goud') up *= 1.35;
      if (type === 'bom') up *= 1.1;
      up = Math.round(up);
      list.push({ id: list.length, hole, t0: Math.round(t), up, type });
      free[hole] = t + up + 380;
      // Soms komt er meteen nog een (meer kans op het einde).
      t += r() < .22 + .3 * f ? 90 : (620 - 300 * f) * (.55 + r() * .8);
    }
    return list;
  }

  // De mollen die op tijdstip t (ms vanaf de start) boven of bezig zijn. from: index om vanaf te zoeken (sneller).
  function active(list, t, from = 0) {
    const out = [];
    let i = from;
    while (i < list.length && list[i].t0 + list[i].up + SINK < t - 3000) i++;
    const first = i;
    for (; i < list.length && list[i].t0 <= t; i++) {
      const m = list[i];
      if (t < m.t0 + m.up + SINK) out.push(m);
    }
    return { list: out, first };
  }

  // Hoe ver de mol uit zijn put staat (0 tot 1) op tijdstip t.
  function rise(m, t) {
    const a = t - m.t0;
    if (a < 0) return 0;
    if (a < RISE) { const k = a / RISE - 1; return 1 + 2.2 * k * k * k + 1.2 * k * k; } // schiet even door
    const end = m.t0 + m.up;
    if (t < end) return 1;
    return Math.max(0, 1 - (t - end) / SINK);
  }

  // Kan je deze mol op tijdstip t raken? Een beetje speling voor wie net te laat is.
  const hittable = (m, t, grace = 0) => t >= m.t0 + 40 && t <= m.t0 + m.up + grace;

  return { COLORS, TYPES, RISE, SINK, GRACE, STUN_MS, FIRE_MS, ENERGY_MS, SWING_MS, neighbours, comboMult, schedule, active, rise, hittable };
});
