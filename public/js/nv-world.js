// Neonvlucht: de baan door de neonburcht, gedeeld door de server, de leerlingen en het bord.
// Drie banen; afstanden in meter. De hindernissen volgen uit een getal (seed) per spel, zodat iedereen dezelfde baan loopt
// en het bord de anderen als schimmen op de juiste plek kan tekenen.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.NvWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const LANE_X = [-2.2, 0, 2.2];
  const SEG = 30;
  const MAX_MULT = 5;
  const TURBO = { mult: 1.35, s: 3 };
  const STUMBLE = { k: .35, s: 1.1 };
  const JUMP = { v: 7.6, g: 22 };
  const SLIDE_S = .72;
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];
  // Wie genoeg munten verzamelt, krijgt een mooier lichtspoor.
  const TRAILS = [
    { coins: 0, name: 'neon', color: '#4cc9ff' },
    { coins: 40, name: 'goud', color: '#ffc94a' },
    { coins: 120, name: 'regenboog', color: 'rainbow' },
    { coins: 250, name: 'bliksemvleugels', color: '#d9a8ff', wings: true },
  ];
  const trailOf = coins => { let t = TRAILS[0]; for (const x of TRAILS) if (coins >= x.coins) t = x; return t; };

  // Hoe snel je loopt: sneller naarmate het spel vordert (f van 0 tot 1).
  const speed = f => 15 + 13 * Math.max(0, Math.min(1, f));

  function rng(seed) {
    let s = (seed >>> 0) % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // De hindernissen van één stuk baan. type: blok (opzij), laag (springen), hoog (onderdoor glijden), munt.
  const cache = new Map();
  function segment(seed, i) {
    const key = seed * 100000 + i;
    let out = cache.get(key);
    if (out) return out;
    out = [];
    const r = rng(seed * 7919 + i * 104729 + 13);
    if (i >= 2) {
      const hard = Math.min(1, i / 40);
      for (const row of [6, 19]) {
        if (r() > .55 + hard * .4) continue;
        const z = i * SEG + row + Math.floor(r() * 4);
        const p = r();
        const free = Math.floor(r() * 3);
        let id = 0;
        const add = (lane, type) => out.push({ id: `${i}.${out.length}.${id++}`, z, lane, type });
        if (p < .3) add((free + 1 + Math.floor(r() * 2)) % 3, 'blok');
        else if (p < .5 && hard > .15) { for (let l = 0; l < 3; l++) if (l !== free) add(l, 'blok'); }
        else if (p < .66) { for (let l = 0; l < 3; l++) add(l, 'laag'); }
        else if (p < .82) { for (let l = 0; l < 3; l++) add(l, 'hoog'); }
        else { add((free + 1) % 3, 'laag'); add((free + 2) % 3, 'blok'); }
        // Munten in de vrije baan, soms in een boog over een lage hindernis.
        const arc = out.some(o => o.z === z && o.lane === free && o.type === 'laag');
        for (let c = 0; c < 5; c++) out.push({ id: `${i}.m${row}.${c}`, z: z - 6 + c * 2.4, lane: free, type: 'munt', y: arc ? .4 + Math.sin(c / 4 * Math.PI) * 1.1 : .5 });
      }
    }
    if (cache.size > 400) cache.clear();
    cache.set(key, out);
    return out;
  }

  // Alles tussen z0 en z1.
  function between(seed, z0, z1) {
    const list = [];
    for (let i = Math.max(0, Math.floor(z0 / SEG)); i <= Math.floor(z1 / SEG); i++) {
      for (const o of segment(seed, i)) if (o.z >= z0 && o.z <= z1) list.push(o);
    }
    return list;
  }

  return { LANE_X, SEG, MAX_MULT, TURBO, STUMBLE, JUMP, SLIDE_S, COLORS, TRAILS, trailOf, speed, rng, segment, between };
});
