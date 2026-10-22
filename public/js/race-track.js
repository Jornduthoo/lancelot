// Het circuit van de Ridderrace, gedeeld door de server, de leerling en het bord.
// De weg is een lus van stukjes (segmenten) met een bocht en een hoogte, zoals in oude arcaderaces.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Track = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const SEG = 200;           // lengte van één segment
  const ROAD = 2000;         // halve breedte van de weg
  const MAX_SPEED = 9600;    // eenheden per seconde, met brandstof (een ronde duurt zo'n 35 seconden)
  const TURBO_SPEED = 14000; // met turbo of over een boostpad
  const CRAWL = .25;         // zonder brandstof rijd je hooguit een kwart zo snel
  const TURBO_MS = 3000;
  const BOOST_MS = 1200;
  const segments = [];

  const easeIn = (a, b, p) => a + (b - a) * p * p;
  const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + .5);
  const lastY = () => (segments.length ? segments[segments.length - 1].y2 : 0);

  function add(curve, y) {
    const i = segments.length;
    segments.push({ i, curve, y1: lastY(), y2: y, sprites: [], boost: null, crystal: null });
  }

  function road(enter, hold, leave, curve, height) {
    const start = lastY();
    const end = start + height * SEG;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++) add(easeIn(0, curve, n / enter), easeInOut(start, end, n / total));
    for (let n = 0; n < hold; n++) add(curve, easeInOut(start, end, (enter + n) / total));
    for (let n = 0; n < leave; n++) add(easeInOut(curve, 0, n / leave), easeInOut(start, end, (enter + hold + n) / total));
  }

  // Het parcours: start, heuvels, S-bochten, een lange bocht rond de burcht en een afdaling naar de finish.
  road(30, 30, 30, 0, 0);
  road(40, 40, 40, 0, 25);
  road(25, 25, 25, -3, 0);
  road(25, 25, 25, 4, -10);
  road(25, 25, 25, -3, 10);
  road(40, 40, 40, 0, -20);
  road(50, 60, 50, 5, 30);
  road(30, 30, 30, 0, 15);
  road(30, 40, 30, 3, -30);
  road(25, 25, 25, -5, 0);
  road(25, 40, 25, 6, 10);
  road(40, 40, 40, 0, -40);
  road(30, 50, 30, 4, 20);
  road(25, 25, 25, -3, -15);
  road(40, 60, 40, 3.5, 0);
  road(40, 40, 40, 0, -lastY() / SEG);
  road(20, 20, 20, 0, 0);

  const COUNT = segments.length;
  const LENGTH = COUNT * SEG;
  // Een volle tank is goed voor iets meer dan een halve ronde.
  const FUEL_RATE = 100 / (LENGTH * .55);

  // Versiering langs de weg: fakkels, vaandels en torens. Kristallen en boostpads op de weg.
  for (const s of segments) {
    if (s.i % 14 === 0 && s.i > 6) { s.sprites.push({ type: 'torch', x: -1.25 }, { type: 'torch', x: 1.25 }); }
    if (s.i % 70 === 35) s.sprites.push({ type: 'banner', x: (s.i / 70) % 2 ? 1.6 : -1.6 });
    if (s.i % 160 === 100) s.sprites.push({ type: 'tower', x: (s.i / 160) % 2 < 1 ? -3 : 3 });
    if (s.i % 45 === 20 && s.i > 60) s.sprites.push({ type: 'pine', x: s.i % 2 ? -2.2 : 2.2 });
  }
  const LANES = [-.55, 0, .55];
  for (let i = 60, k = 0; i < COUNT - 20; i += 160, k++) {
    // Drie kristallen na elkaar, telkens op een andere rijstrook.
    for (let j = 0; j < 3; j++) segments[i + j * 4].crystal = { x: LANES[(k * 2) % 3] };
  }
  for (let i = 140, k = 0; i < COUNT - 20; i += 190, k++) {
    for (let j = 0; j < 5; j++) segments[i + j].boost = { x: LANES[(k + 1) % 3] };
  }
  segments[0].sprites.push({ type: 'gate', x: 0 });

  // Een kaartje van bovenaf: de bochten optellen tot een gesloten lus.
  function map() {
    const total = segments.reduce((sum, s) => sum + s.curve, 0) || 1;
    const k = (Math.PI * 2) / total;
    let a = 0;
    let x = 0;
    let y = 0;
    const pts = [];
    for (const s of segments) {
      pts.push([x, y]);
      a += s.curve * k;
      x += Math.sin(a);
      y -= Math.cos(a);
    }
    const ex = x - pts[0][0];
    const ey = y - pts[0][1];
    pts.forEach((p, i) => { p[0] -= (ex * i) / COUNT; p[1] -= (ey * i) / COUNT; });
    const xs = pts.map(p => p[0]);
    const ys = pts.map(p => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY);
    const w = (Math.max(...xs) - minX) / size;
    const h = (Math.max(...ys) - minY) / size;
    return { w, h, pts: pts.map(([px, py]) => [(px - minX) / size, (py - minY) / size]) };
  }

  const wrap = z => ((z % LENGTH) + LENGTH) % LENGTH;
  const segmentAt = z => segments[Math.floor(wrap(z) / SEG) % COUNT];

  return { SEG, ROAD, MAX_SPEED, TURBO_SPEED, CRAWL, TURBO_MS, BOOST_MS, FUEL_RATE, COUNT, LENGTH, segments, map, wrap, segmentAt };
});
