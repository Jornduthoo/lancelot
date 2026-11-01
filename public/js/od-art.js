// Geschilderde beelden voor Het rijk van Lancelot: hemel, grondtexturen, rotswanden, bomen en plekken.
// Een beeld wordt pas geladen als een eiland het nodig heeft (OdArt.laad). Zolang het laadt of ontbreekt,
// tekent OdWereld gewoon de oude code-versie. Is een reeks binnen, dan bakt de speler de wereld opnieuw.
const OdArt = (() => {
  // Alle beelden in /img/rijk/ (naam = bestand zonder .webp).
  const ALLE = new Set(`hemel gras pad rots
    eik1 eik2 eik3 den1 den2 den3 kristal labo burcht rune fakkel rots-blok uil schuif robot licht code steen
    zand water sneeuw ijsvloer as lava basalt plank wolk goudpad mijn maan cyber neonpad dek plein
    palm1 palm2 robodraak molen beeld nest smidse draak duikboot luchtschip ruimteschip ijsraket
    sneeuw1 sneeuw2 sneeuw3 klokkentoren ijsmeer ijsbeeld lavarots1 lavarots2 lavapoort vuurkristal vuurtoren kampvuur
    koraal1 koraal2 koraal3 parelschelp wrak schatkaart wolkentoren windorgel luchthaven luchtballon maanraket lantaarn
    mijnrots mijnkar kar edelsteenwand mijnspoor mijnlift krater maankoepel maanlab koepelbouw sterrenkijker shuttle
    neontoren1 neontoren2 holobord datatoren stroompoort hyperloop zonnepaneel antenne seinpost vrachtruim aftelling
    koepel goudtoren donjon sterrenpoort lichtpaal jager stroom tandwiel wip kast drijfbak thermometer`.split(/\s+/));
  const beelden = {};
  const bezig = new Set();
  const wachters = [];

  function klaar() {
    if (bezig.size) return;
    for (const f of wachters.splice(0)) f();
  }

  // Laad deze beelden; f() als ze allemaal binnen zijn (ook als ze er al waren).
  function laad(namen, f) {
    if (f) wachters.push(f);
    for (const n of namen) {
      if (!ALLE.has(n) || n in beelden || bezig.has(n)) continue;
      bezig.add(n);
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { beelden[n] = im; bezig.delete(n); klaar(); };
      im.onerror = () => { beelden[n] = null; bezig.delete(n); klaar(); };
      im.src = `/img/rijk/${n}.webp`;
    }
    klaar();
  }

  // Een textuur gespiegeld tot een naadloos blok van 2 op 2 (Gemini-texturen sluiten niet altijd mooi aan).
  const tegelCache = {};
  function tegel(n) {
    if (tegelCache[n]) return tegelCache[n];
    const im = beelden[n];
    if (!im) return null;
    const w = im.naturalWidth;
    const h = im.naturalHeight;
    const c = document.createElement('canvas');
    c.width = w * 2;
    c.height = h * 2;
    const g = c.getContext('2d');
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      g.setTransform(sx, 0, 0, sy, sx < 0 ? w * 2 : 0, sy < 0 ? h * 2 : 0);
      g.drawImage(im, 0, 0);
    }
    tegelCache[n] = c;
    return c;
  }

  // Een sprite op maat: zo hoog (in tegels), met de voet op het midden van het vakje.
  const spriteCache = new Map();
  function sprite(n, T, hoog, opt = {}) {
    const im = beelden[n];
    if (!im) return null;
    const key = `${n}|${T}|${hoog}|${opt.spiegel ? 1 : 0}|${opt.breed}`;
    if (spriteCache.has(key)) return spriteCache.get(key);
    let h = Math.round(T * hoog);
    let w = Math.round((h * im.naturalWidth) / im.naturalHeight);
    const maxB = T * (opt.breed || 1.25);
    if (w > maxB) {
      w = Math.round(maxB);
      h = Math.round((w * im.naturalHeight) / im.naturalWidth);
    }
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    if (opt.spiegel) g.setTransform(-1, 0, 0, 1, w, 0);
    g.drawImage(im, 0, 0, w, h);
    const uit = { c, ax: w / 2, ay: h - T * (opt.voet ?? 0.12) };
    spriteCache.set(key, uit);
    return uit;
  }

  return {
    heeft: n => Boolean(beelden[n]),
    bestaat: n => ALLE.has(n),
    beeld: n => beelden[n] || null,
    laad,
    tegel,
    sprite,
  };
})();
