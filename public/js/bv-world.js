// Banierveld: het vierkante toernooiveld, verdeeld in vakjes. Gedeeld door de server, de leerlingen en het bord.
// Elk vakje is van niemand of van één ridder. Wie buiten zijn land rijdt, laat een lichtspoor achter;
// komt hij terug in zijn land, dan wordt het spoor en alles wat het insluit van hem.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BvWorld = factory();
})(typeof self !== 'undefined' ? self : this, () => {
  const STEP_MS = 130;         // zo lang doet een ros over één vakje
  const TURBO_MS = 88;         // met turbo
  const TURBO_S = 5;
  const ENERGY = 150;          // zoveel vakjes rijden voor de volgende vraag
  const WRONG_ENERGY = 50;     // na een fout antwoord krijg je toch een beetje
  const RESPAWN_MS = 2200;
  const SAFE_MS = 2000;
  const START_R = 2;           // het startland is (2R+1) x (2R+1)
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // rechts, onder, links, boven
  const COLORS = ['#4cc9ff', '#ff4d6d', '#ffc94a', '#4ade80', '#c77dff', '#ff8c42', '#2de2c8', '#ff6bd6', '#a3e635', '#7aa2ff', '#ffd6a5', '#f472b6'];

  // Hoe groot het veld is: groter met meer ridders, maar nooit te groot voor een trage Chromebook.
  const size = n => Math.max(44, Math.min(130, Math.round(34 + 15 * Math.sqrt(Math.max(1, n)))));

  // Lengte-gecodeerd: [waarde, aantal, waarde, aantal, ...]. Zo is het hele veld een klein bericht.
  function rle(arr) {
    const out = [];
    let v = arr[0], c = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === v) c++;
      else { out.push(v, c); v = arr[i]; c = 1; }
    }
    out.push(v, c);
    return out;
  }
  function unrle(list, arr) {
    let i = 0;
    for (let j = 0; j < list.length; j += 2) {
      arr.fill(list[j], i, i + list[j + 1]);
      i += list[j + 1];
    }
    return arr;
  }

  return { STEP_MS, TURBO_MS, TURBO_S, ENERGY, WRONG_ENERGY, RESPAWN_MS, SAFE_MS, START_R, DIRS, COLORS, size, rle, unrle };
});
