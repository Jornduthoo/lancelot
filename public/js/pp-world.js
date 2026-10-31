// Plasmapoort: de regels van het strafschopspel, gedeeld door de server, de leerlingen en het bord.
// De poort: x van -1 (linkerpaal) tot 1 (rechterpaal), y van 0 (grond) tot 1 (de lat).
// Elke leerling speelt een toernooi tegen een rij robotridders, telkens 5 strafschoppen per kant, daarna sudden death.
// Om beurt: jij schiet, dan keep jij. De server beslist of het doelpunt is (zie src/plasmapoort.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PpWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const KICKS = 5;
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // De robotridders van het toernooi, van makkelijk naar moeilijk.
  const ROBOTS = [
    { name: 'Roestbout', color: '#c7773a', eye: '#ffb347', tip: 'Een oude robot: traag en hij gokt vaak.' },
    { name: 'Koperkop', color: '#d99a4e', eye: '#7cf2ff', tip: 'Hij duikt al wat sneller.' },
    { name: 'Stoomridder', color: '#8f9bb0', eye: '#ff6b6b', tip: 'Let op zijn stoomwolkjes.' },
    { name: 'Neonwachter', color: '#2de2c8', eye: '#ff6bd6', tip: 'Snelle reflexen.' },
    { name: 'Kristalgolem', color: '#7aa2ff', eye: '#e8f1ff', tip: 'Groot en sterk. Mik in de hoeken!' },
    { name: 'Donderdrone', color: '#c77dff', eye: '#ffe066', tip: 'Hij leest je schoten.' },
    { name: 'Plasmaprins', color: '#ff4d6d', eye: '#5ee7ff', tip: 'Bijna niet te kloppen.' },
    { name: 'De Gouden Mech', color: '#ffc94a', eye: '#ff3b3b', tip: 'De kampioen van de burcht.' },
  ];

  // Hoe sterk is robot k in toernooironde (ster) tier: 0 = makkelijk, 1 = zeer sterk.
  function level(k, tier = 0) {
    return Math.min(1, k / (ROBOTS.length - 1) * .85 + tier * .12);
  }

  // Links, midden of rechts in de poort.
  function zoneOf(x) {
    return x < -.36 ? -1 : x > .36 ? 1 : 0;
  }

  // Hoe gaat een schot? 'goal', 'save', 'paal' (paal of lat), 'naast' of 'over'.
  function outOf(x, y) {
    const ax = Math.abs(x);
    if (ax > 1.05) return 'naast';
    if (y > 1.05) return 'over';
    if (ax > .95 || y > .95) return 'paal';
    return null;
  }

  // Is de wedstrijd beslist? a = jouw reeks, b = die van de robot (true = raak). Jij schiet eerst.
  // Geeft 1 (jij wint), -1 (robot wint) of 0 (nog niet beslist).
  function decided(a, b) {
    const ga = a.filter(Boolean).length, gb = b.filter(Boolean).length;
    if (a.length <= KICKS && b.length <= KICKS) {
      const leftA = KICKS - a.length, leftB = KICKS - b.length;
      if (ga > gb + leftB) return 1;
      if (gb > ga + leftA) return -1;
      if (a.length === KICKS && b.length === KICKS) return ga > gb ? 1 : ga < gb ? -1 : 0;
      return 0;
    }
    // Sudden death: pas beslist als beide evenveel keer schoten.
    if (a.length !== b.length) return 0;
    return ga > gb ? 1 : ga < gb ? -1 : 0;
  }

  // Wie is aan de beurt: 'shoot' (jij schiet) of 'keep' (jij keept).
  function turnOf(a, b) {
    return a.length <= b.length ? 'shoot' : 'keep';
  }

  // Het aanlegpunt van het vizier: hoe snel zwaait het (periode in seconden). De gouden bal zwaait trager.
  function sweep(gold) {
    return gold ? { x: 2.5, y: 2.1 } : { x: 1.55, y: 1.3 };
  }
  // Het vizier op tijdstip t (seconden sinds het begin van dat deel): x van -1.25 tot 1.25, y van 0 tot 1.25.
  function aimX(t, gold) {
    return Math.sin(t / sweep(gold).x * Math.PI * 2) * 1.25;
  }
  function aimY(t, gold) {
    return (1 - Math.cos(t / sweep(gold).y * Math.PI * 2)) / 2 * 1.25;
  }

  const POINTS = { goal: 100, gold: 50, save: 120, gemist: 30, win: 200, perRobot: 40, kampioen: 600, vraag: 60 };
  const KEEP = { windMs: 1500, early: 450 }; // aanloop van de robot; wie meer dan 450 ms te vroeg duikt, wordt gefopt

  return { KICKS, COLORS, ROBOTS, POINTS, KEEP, level, zoneOf, outOf, decided, turnOf, sweep, aimX, aimY };
});
