// De prinses in de toren: de toren zelf. Dezelfde code draait in de browser en op de server,
// zodat iedereen met hetzelfde getal (seed) precies dezelfde toren krijgt.
(function (root) {
  const W = 400;            // breedte van de toren in wereld-eenheden
  const FLOORS = 80;        // aantal platforms tot de prinses
  const PLAYER = { w: 26, h: 34 };
  const PHYS = { gravity: 1800, jump: 780, speed: 230 };

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
    return { seed, W, FLOORS, platforms, lasers, drones, top: y, PLAYER, PHYS };
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

  const api = { build, laserState, droneX, floorAt, W, FLOORS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Toren = api;
})(this);
