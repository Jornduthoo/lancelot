// Zwermwacht: de regels, gedeeld door de server, de leerlingen en het bord.
// Elke leerling verdedigt op zijn eigen scherm een ridder tegen zwermen roestrobots. De wapens vuren vanzelf,
// de leerling stuurt alleen waar de ridder loopt. Robots laten kristallen vallen; is de balk vol, dan komt er een vraag
// en daarna een upgrade. Hoe verder in het spel (f = 0..1 van de speeltijd), hoe meer en sterkere robots.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ZmWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // Wapens: elk tot niveau 5. Per niveau de waarden (index = niveau - 1).
  const WEAPONS = {
    pijl: { name: 'Plasmapijl', icon: '🏹', item: 1, text: 'Schiet vanzelf naar de dichtste robot.',
      cd: [.75, .7, .65, .58, .5], n: [1, 1, 2, 2, 3], dmg: [13, 16, 18, 22, 26], pierce: [1, 1, 2, 2, 3], speed: 620 },
    zwaard: { name: 'Zwaardcirkel', icon: '🗡️', item: 0, text: 'Zwaarden draaien rond je ridder.',
      n: [2, 3, 3, 4, 5], dmg: [9, 11, 14, 16, 20], rad: [74, 80, 92, 100, 110], spin: [3.2, 3.4, 3.7, 4, 4.4] },
    puls: { name: 'Schildpuls', icon: '🛡️', item: 2, text: 'Een schokgolf duwt alles van je weg.',
      cd: [3.4, 3.1, 2.8, 2.5, 2.1], rad: [120, 140, 160, 180, 205], dmg: [12, 16, 20, 25, 32] },
    bliksem: { name: 'Bliksemrune', icon: '⚡', item: 3, text: 'Bliksem slaat in op robots rondom.',
      cd: [2.3, 2.1, 1.9, 1.7, 1.4], n: [1, 2, 2, 3, 4], dmg: [26, 30, 38, 44, 55], rad: 46 },
    valk: { name: 'Valkdrone', icon: '🦅', item: 4, text: 'Een robotvalk vliegt mee en schiet.',
      cd: [.6, .52, .45, .38, .3], dmg: [7, 8, 10, 11, 13], range: 340 },
  };
  const WEAPON_IDS = Object.keys(WEAPONS);
  const MAX_W = 5;

  // Hulpjes: tot niveau 3.
  const PASSIVES = {
    laars: { name: 'Snelle laarzen', icon: '👢', text: 'Je loopt sneller.', per: .12 },
    magneet: { name: 'Kristalmagneet', icon: '🧲', text: 'Je trekt kristallen van verder aan.', per: .45 },
    hart: { name: 'Hartgem', icon: '❤️', text: 'Een extra hartje en al je hartjes vol.', per: 1 },
    kracht: { name: 'Krachtrune', icon: '💪', text: 'Al je wapens doen meer schade.', per: .18 },
    haast: { name: 'Zandloper', icon: '⏳', text: 'Je wapens zijn sneller klaar.', per: .1 },
  };
  const PASSIVE_IDS = Object.keys(PASSIVES);
  const MAX_P = 3;

  // Robots. r = straal, sp = snelheid, xp = waarde van het kristal, at = vanaf welk deel van de speeltijd.
  const ENEMIES = {
    kever: { name: 'Roestkever', hp: 12, sp: 62, r: 17, xp: 1, at: 0, w: 10 },
    bij: { name: 'Vonkbij', hp: 7, sp: 138, r: 12, xp: 1, at: .1, w: 6 },
    slijm: { name: 'Slijmdroid', hp: 46, sp: 46, r: 23, xp: 3, at: .22, w: 4 },
    schild: { name: 'Schildrobot', hp: 85, sp: 60, r: 21, xp: 3, at: .38, w: 3 },
    drone: { name: 'Schedeldrone', hp: 34, sp: 98, r: 16, xp: 5, at: .52, w: 3 },
    kolos: { name: 'De IJzeren Kolos', hp: 900, sp: 52, r: 62, xp: 40, at: 2, w: 0, boss: true },
  };
  const ENEMY_IDS = Object.keys(ENEMIES).filter(k => !ENEMIES[k].boss);

  const PLAYER = { r: 18, sp: 230, hp: 5, pickup: 80, hurtS: 1.3 };
  const MAX_ALIVE = 150;
  const BOSS_AT = .7;          // de eerste Kolos komt op 70 % van de speeltijd
  const BOSS_AGAIN_S = 35;     // na een verslagen Kolos komt er zo veel later een sterkere
  const POINTS = { kill: 2, xp: 1, boss: 300, vraag: 60 };
  const MAX_KILLS_S = 45;      // controle op de server: zo veel robots per seconde kan niemand

  // Zoveel kristalwaarde heb je nodig voor het volgende niveau.
  const need = lvl => Math.round(5 + lvl * 4 + lvl * lvl * .45);

  // Hoe druk het is op deel f van de speeltijd (0..1) en op niveau lvl van de ridder.
  function wave(f, lvl) {
    const rate = .8 + f * 3.6 + lvl * .14;          // robots per seconde
    const hpMul = 1 + f * 1.3 + lvl * .06;
    const types = ENEMY_IDS.filter(k => ENEMIES[k].at <= f);
    return { rate, hpMul, types };
  }

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // De upgrades die nog kunnen: [{ kind: 'w'|'p', id, lvl (nieuw niveau) }].
  function options(build) {
    const out = [];
    for (const id of WEAPON_IDS) { const l = build.w[id] || 0; if (l < MAX_W) out.push({ kind: 'w', id, lvl: l + 1 }); }
    for (const id of PASSIVE_IDS) { const l = build.p[id] || 0; if (l < MAX_P) out.push({ kind: 'p', id, lvl: l + 1 }); }
    return out;
  }

  // Drie kaarten om uit te kiezen (bij een juist antwoord). gold: één kaart geeft twee niveaus.
  function cards(build, rand, gold) {
    const all = options(build);
    const pick = [];
    // Liefst minstens één wapen erbij.
    const ws = all.filter(o => o.kind === 'w');
    if (ws.length) pick.push(ws[Math.floor(rand() * ws.length)]);
    while (pick.length < 3 && pick.length < all.length) {
      const o = all[Math.floor(rand() * all.length)];
      if (!pick.includes(o)) pick.push(o);
    }
    if (gold && pick.length) {
      const i = Math.floor(rand() * pick.length);
      const o = pick[i];
      const max = o.kind === 'w' ? MAX_W : MAX_P;
      pick[i] = { ...o, lvl: Math.min(max, o.lvl + 1), gold: true };
    }
    return pick;
  }

  function label(o) {
    const d = o.kind === 'w' ? WEAPONS[o.id] : PASSIVES[o.id];
    return { name: d.name, icon: d.icon, text: o.lvl === 1 ? d.text : o.kind === 'w' ? 'Sterker en sneller.' : d.text, lvl: o.lvl };
  }

  // Een korte code van je wapens voor het bord: niveau per wapen, bv. "21003".
  const code = build => WEAPON_IDS.map(id => build.w[id] || 0).join('');

  return { COLORS, WEAPONS, WEAPON_IDS, MAX_W, PASSIVES, PASSIVE_IDS, MAX_P, ENEMIES, ENEMY_IDS, PLAYER, MAX_ALIVE, BOSS_AT, BOSS_AGAIN_S, POINTS, MAX_KILLS_S, need, wave, rng, options, cards, label, code };
});
