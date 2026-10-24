// De prinses in de toren: de toren zelf. Dezelfde code draait in de browser en op de server,
// zodat iedereen met hetzelfde getal (seed) precies dezelfde toren krijgt.
(function (root) {
  const W = 400;            // breedte van de toren in wereld-eenheden
  const FLOORS = 80;        // aantal platforms tot de prinses
  const PLAYER = { w: 26, h: 34 };
  const PHYS = { gravity: 1800, jump: 780, speed: 230 };
  // Vier zones, elk met een eigen sfeer en eigen soorten platforms.
  const ZONES = [
    { key: 'kerker', name: 'De Vuurkerker', icon: '🔥', from: 0 },
    { key: 'storm', name: 'De Stormmuren', icon: '⚡', from: 21 },
    { key: 'neon', name: 'De Neon-citadel', icon: '💠', from: 41 },
    { key: 'hemel', name: 'De Hemelspits', icon: '☁️', from: 61 },
  ];
  // Kans per zone op elk soort platform (de rest is gewone steen).
  const KINDS = {
    kerker: { crumble: .16, spring: .08 },
    storm: { crumble: .2, hover: .14, ice: .1, spring: .06 },
    neon: { hover: .3, ice: .1, crumble: .1, spring: .08 },
    hemel: { ice: .24, hover: .2, crumble: .14, spring: .08 },
  };
  const SPRING = 1.42;      // een supersprong is zoveel keer sterker dan een gewone sprong

  // Kleine, voorspelbare toevalsgenerator.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build(seed) {
    const r = rng(seed);
    const between = (a, b) => a + r() * (b - a);
    const platforms = [{ x: 0, y: 0, w: W, floor: 0 }];
    const lasers = [];
    const drones = [];
    let y = 0;
    let cx = W / 2;
    for (let floor = 1; floor <= FLOORS; floor++) {
      const top = floor === FLOORS;
      y += top ? 120 : between(92, 122);
      const w = top ? W : between(Math.max(80, 150 - floor), 150);
      // Het volgende platform ligt altijd binnen springbereik van het vorige.
      cx = Math.min(W - w / 2, Math.max(w / 2, cx + between(-165, 165)));
      if (Math.abs(cx - W / 2) < 20 && r() < .5) cx += r() < .5 ? -60 : 60;
      const p = { x: top ? 0 : cx - w / 2, y, w, floor };
      // Stekels op een deel van het platform, vanaf verdieping 5 en steeds vaker.
      const danger = Math.min(.55, floor / 120);
      if (!top && floor >= 5 && w >= 110 && r() < danger) {
        const sw = 30;
        p.spikes = r() < .5 ? { x: p.x, w: sw } : { x: p.x + w - sw, w: sw };
      }
      platforms.push(p);
      if (top || floor < 8) continue;
      const mid = y - between(42, 58);
      const roll = r();
      if (roll < danger * .7) {
        // Laserpoort die aan- en uitflitst. Even wachten tot hij uit staat!
        const lw = between(140, 260);
        lasers.push({ x: between(0, W - lw), y: mid, w: lw, period: between(2.6, 3.6), on: .45, offset: r() * 4 });
      } else if (roll < danger * 1.3) {
        drones.push({ y: mid + between(-8, 8), period: between(3.2, 5.5), offset: r() * 6, r: 12 });
      }
    }
    // Soorten platforms en windstoten met een eigen toevalsreeks: de ligging van de platforms blijft dezelfde.
    const r2 = rng(seed ^ 0x5bd1e995);
    const winds = [];
    for (const p of platforms) {
      if (p.floor < 4 || p.floor === FLOORS) continue;
      const zone = ZONES[zoneOfFloor(p.floor)].key;
      let roll = r2();
      let kind = 'stone';
      for (const [k, chance] of Object.entries(KINDS[zone])) {
        if (roll < chance) { kind = k; break; }
        roll -= chance;
      }
      if (kind === 'hover') {
        // Zweeft heen en weer, maar nooit door de muur.
        const amp = Math.min(55, p.x, W - p.x - p.w);
        if (amp < 18) kind = 'stone';
        else p.move = { amp, period: 3 + r2() * 2.5, offset: r2() * 6 };
      }
      if (kind === 'spring') {
        if (p.w < 90) kind = 'stone';
        else {
          const free = p.spikes ? (p.spikes.x === p.x ? [p.x + 34, p.x + p.w - 16] : [p.x + 16, p.x + p.w - 34]) : [p.x + 16, p.x + p.w - 16];
          p.spring = { x: free[0] + r2() * (free[1] - free[0]) - 12, w: 24 };
        }
      }
      if (kind === 'hover' || kind === 'crumble') delete p.spikes;
      p.kind = kind;
    }
    // Windstoten in de Stormmuren: duwen je opzij terwijl je in de lucht bent.
    for (let i = 1; i < platforms.length - 1; i++) {
      const p = platforms[i];
      if (ZONES[zoneOfFloor(p.floor)].key !== 'storm' || r2() > .4) continue;
      winds.push({ y: p.y + 20, h: platforms[i + 1].y - p.y - 30, dir: r2() < .5 ? -1 : 1, period: 4 + r2() * 2, offset: r2() * 6 });
    }
    // Grenzen van de zones in wereldhoogte: net boven het laatste platform van de zone.
    const zones = ZONES.map((z, i) => {
      const next = ZONES[i + 1];
      const lastFloor = next ? next.from - 1 : FLOORS;
      return { ...z, y0: i === 0 ? -1000 : platforms[z.from - 1].y + 40, y1: next ? platforms[lastFloor].y + 40 : y + 1000 };
    });
    return { seed, W, FLOORS, platforms, lasers, drones, winds, zones, top: y, PLAYER, PHYS };
  }

  function zoneOfFloor(floor) {
    let z = 0;
    ZONES.forEach((d, i) => { if (floor >= d.from) z = i; });
    return z;
  }

  // Zone (0-3) op hoogte y.
  function zoneAt(world, y) {
    let z = 0;
    world.zones.forEach((d, i) => { if (y >= d.y0) z = i; });
    return z;
  }

  // Waar staat een (eventueel zwevend) platform op tijdstip t?
  function platformX(p, t) {
    return p.move ? p.x + Math.sin(((t + p.move.offset) / p.move.period) * Math.PI * 2) * p.move.amp : p.x;
  }

  // Duw van de wind op hoogte y (eenheden per seconde), 0 als het daar niet waait.
  function windAt(world, y, t) {
    for (const w of world.winds) {
      if (y < w.y || y > w.y + w.h) continue;
      const phase = ((t + w.offset) % w.period) / w.period;
      return phase < .5 ? w.dir * 120 * Math.sin(phase * 2 * Math.PI) : 0;
    }
    return 0;
  }

  // Staat de laser aan op tijdstip t (seconden sinds de start)? Ook 'bijna' voor de waarschuwing.
  function laserState(l, t) {
    const phase = ((t + l.offset) % l.period) / l.period;
    return { on: phase < l.on, warn: phase > .85 };
  }

  function droneX(d, t, W) {
    return W / 2 + Math.sin(((t + d.offset) / d.period) * Math.PI * 2) * (W / 2 - 30);
  }

  // Verdieping waarop iemand staat bij hoogte y.
  function floorAt(world, y) {
    let floor = 0;
    for (const p of world.platforms) if (p.y <= y + 1) floor = p.floor;
    return floor;
  }

  const api = { build, laserState, droneX, floorAt, zoneAt, zoneOfFloor, platformX, windAt, W, FLOORS, ZONES, SPRING };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Toren = api;
})(this);
