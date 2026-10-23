// Eigen ridders: elke leerling stelt een ridder samen (helm, versiering, harnas, huid, wapen en schild).
// LANcelot onthoudt hem op de naam van de leerling, en de spellen tekenen hem.
// Avatar.byName(naam) geeft de ridder van een leerling (of null), Avatar.sprite(...) een tekening.
const Avatar = (() => {
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff', '#9be15d', '#e8edf5'];
  const VISORS = ['#4cc9ff', '#ff4d6d', '#ffc94a', '#2ee6a6', '#c77dff'];
  const SHIELDS = ['#3d8bff', '#ff4d6d', '#22c993', '#a66bff', '#1b2740', '#ffb703', '#ff8c42', '#e8edf5'];
  const SKINS = ['#ffdcc0', '#f1c19a', '#d79b6c', '#a96b43', '#6e4429'];
  const HAIR_COLORS = ['#f2d27a', '#8a5a33', '#2a1c16', '#c8452c', '#d9dee8', '#38d6ff', '#ff6fc8'];
  const TYPES = [{ name: 'Ridder' }, { name: 'Ridderes' }];
  const HAIRS = [{ name: 'Kort' }, { name: 'Lang' }, { name: 'Vlecht' }, { name: 'Paardenstaart' }, { name: 'Stekels' }, { name: 'Kaal' }];
  const ARMORS = [{ name: 'Klassiek' }, { name: 'Cyber' }, { name: 'Goud' }, { name: 'Mecha' }, { name: 'Kristal' }];
  const BACKS = [{ name: 'Cape' }, { name: 'Jetpack' }, { name: 'Lichtvleugels' }, { name: 'Niets' }, { name: 'Drone' }];
  const ARMS = [{ name: 'Gewone arm' }, { name: 'Robotarm' }];
  // Helmen waaronder je het gezicht en het haar ziet.
  const OPEN = [4, 5, 7, 8];

  // De rijen zijn de pixelversie (De prinses in de toren tekent die). De rest tekent LANcelot met lijnen en verlopen.
  // S = staal, s = schaduw, V = vizier, C = kleur van het harnas, F = gezicht, E = ogen, G = goud, O = vuur.
  const HELMS = [
    { name: 'Ridderhelm', rows: ['...SSSSSS...', '..SSSSSSSS..', '..SVVVVVVS..', '..SSSSSSSS..', '...SSSSSS...'] },
    { name: 'Emmerhelm', rows: ['..SSSSSSSS..', '..SSSSSSSS..', '..SVVsSVVS..', '..SSSSSSSS..', '..SsSSSSsS..'] },
    { name: 'Spitshelm', rows: ['....SSSS....', '...SSSSSS...', '..SSVVVVSS..', '..SsSSSSsS..', '...SSSSSS...'] },
    { name: 'Neonhelm', rows: ['...SSSSSS...', '..VSSSSSSV..', '..VVVVVVVV..', '..SSSSSSSS..', '...sSSSSs...'] },
    { name: 'Kap', rows: ['...CCCCCC...', '..CCCCCCCC..', '..CCFFFFCC..', '..CFEFFEFC..', '...CFFFFC...'] },
    { name: 'Open helm', rows: ['...SSSSSS...', '..SSSSSSSS..', '..SFEFFEFS..', '..SFFFFFFS..', '...SFFFFS...'] },
    { name: 'Drakenhelm', rows: ['..CSSSSSSC..', '..SSSSSSSS..', '..SVsSSsVS..', '..SSSSSSSS..', '...sSSSSs...'] },
    { name: 'Ruimtehelm', rows: ['...VVVVVV...', '..VFFFFFFV..', '..VFEFFEFV..', '..VFFFFFFV..', '...SSSSSS...'] },
    { name: 'Holovizier' },
    { name: 'Cyberhelm' },
  ];
  const ACCENTS = [
    { name: 'Geen', rows: ['............', '............'] },
    { name: 'Pluim', rows: ['.....CC.....', '....CCCC....'] },
    { name: 'Hoorns', rows: ['.W........W.', '.WW......WW.'] },
    { name: 'Kroon', rows: ['...G.GG.G...', '...GGGGGG...'] },
    { name: 'Antenne', rows: ['.......V....', '.......s....'] },
    { name: 'Vleugels', rows: ['.WW......WW.', '..WW....WW..'] },
    { name: 'Halo', rows: ['...VVVVVV...', '............'] },
    { name: 'Vlammen', rows: ['.....OG.....', '....OOOO....'] },
    { name: 'Neonkam' },
    { name: 'Robotoren' },
  ];
  const PATTERNS = [
    { name: 'Effen' }, { name: 'Gedeeld' }, { name: 'Kruis' }, { name: 'Schuine band' }, { name: 'Dambord' }, { name: 'Punt' },
  ];
  const WEAPONS = [{ name: 'Zwaard' }, { name: 'Lichtzwaard' }, { name: 'Bijl' }, { name: 'Strijdhamer' }, { name: 'Toverstaf' }, { name: 'Plasmablaster' }, { name: 'Energiespeer' }];
  const KEYS = {
    helm: HELMS.length, accent: ACCENTS.length, kleur: COLORS.length, vizier: VISORS.length,
    patroon: PATTERNS.length, schild: SHIELDS.length, wapen: WEAPONS.length, huid: SKINS.length,
    type: TYPES.length, haar: HAIRS.length, haarkleur: HAIR_COLORS.length, harnas: ARMORS.length, rug: BACKS.length, arm: ARMS.length,
  };

  const pick = n => Math.floor(Math.random() * n);
  function random() {
    const av = {};
    for (const [k, n] of Object.entries(KEYS)) av[k] = pick(n);
    if (av.schild === av.kleur % SHIELDS.length) av.schild = (av.schild + 1) % SHIELDS.length;
    return av;
  }

  function clean(av) {
    if (!av || typeof av !== 'object') return null;
    const out = {};
    for (const [k, n] of Object.entries(KEYS)) {
      const v = Number(av[k]);
      out[k] = Number.isInteger(v) && v >= 0 && v < n ? v : 0;
    }
    return out;
  }

  // ---------- Tekenhulp ----------

  // Een kleur lichter (f > 0) of donkerder (f < 0) maken.
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; gg *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; gg += (255 - gg) * f; b += (255 - b) * f; }
    return `rgb(${r | 0},${gg | 0},${b | 0})`;
  }
  const alpha = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  const LINE = '#0a1020';
  const GOLD = '#ffc94a';
  const BOOT = '#2b3550';

  // Elke tekening gebeurt in een raster van 12 breed en 17 hoog; k is het aantal pixels per eenheid.
  // Het metaal van harnas en helm, per soort harnas: licht en donker.
  const METALS = [
    [['#ffffff', '#d3dde9', '#97a6bc', '#5d6a82'], ['#c3ccda', '#8893a8', '#4a5468', '#2c3446']],
    [['#6b7590', '#3b4358', '#232a3c', '#141824'], ['#4a5268', '#2a3042', '#1a1f2e', '#0e111a']],
    [['#fff7d6', '#ffd76a', '#d39b2a', '#80571a'], ['#e8c36a', '#b9862a', '#7a5316', '#4a320c']],
    [['#ffffff', '#f1f4f9', '#c4cdda', '#8a95a8'], ['#dfe5ee', '#aab4c4', '#737f94', '#4a5466']],
    [['#f4fdff', '#c4f1ff', '#7fd0ee', '#3a86b0'], ['#a8e6fa', '#6cc2e2', '#3a8cb4', '#1f5a80']],
  ];

  function make(g, k, style = 0) {
    const d = {
      g, k,
      path(pts, closed = true) {
        g.beginPath();
        g.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
        if (closed) g.closePath();
      },
      fill(style, line = true, lw = .2) {
        g.fillStyle = style;
        g.fill();
        if (line) { g.lineWidth = lw; g.strokeStyle = LINE; g.lineJoin = 'round'; g.stroke(); }
      },
      lin(x0, y0, x1, y1, stops) {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c));
        return gr;
      },
      // Gepolijst staal: licht links, donker rechts.
      style,
      steel(x0, x1, dark = false) {
        return d.lin(x0, 0, x1, 0, METALS[style][dark ? 1 : 0]);
      },
      glow(color, size, fn) {
        g.save();
        g.shadowColor = color;
        g.shadowBlur = size * k;
        fn();
        g.restore();
      },
      ellipse(x, y, rx, ry, rot = 0) {
        g.beginPath();
        g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      },
      rrect(x, y, w, h, r) {
        g.beginPath();
        if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
      },
      line(x0, y0, x1, y1, style, lw) {
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
        g.strokeStyle = style; g.lineWidth = lw; g.lineCap = 'round'; g.stroke();
      },
    };
    return d;
  }

  // ---------- Onderdelen ----------

  function drawLegs(d, pal, fem) {
    const w = fem ? 1.7 : 2;
    for (const x of fem ? [3.75, 6.55] : [3.5, 6.5]) {
      d.rrect(x, 12, w, 3.7, .5);
      d.fill(d.steel(x, x + w));
      d.ellipse(x + w / 2, 13.3, w * .37, .5);
      d.fill(d.steel(x + .2, x + w - .2, true), true, .15);
      if (d.style === 1) d.glow(pal.V, .6, () => { d.ellipse(x + w / 2, 13.3, .18, .18); d.fill(pal.V, false); });
      d.rrect(x - .3, 15.2, w + .5, 1.55, [.7, .7, .3, .3]);
      d.fill(d.lin(0, 15.2, 0, 16.8, [shade(BOOT, .35), BOOT, shade(BOOT, -.4)]));
    }
  }

  function drawCapeBehind(d, C) {
    d.path([2.4, 7.7, 9.6, 7.7, 11.1, 15.9, 9.6, 15.6, 8, 16, 6, 15.7, 4, 16, 2.4, 15.6, .9, 15.9]);
    d.fill(d.lin(0, 8, 0, 16, [shade(C, -.35), shade(C, -.55)]));
  }

  function drawTorso(d, pal, fem) {
    const { g } = d;
    // Wapenrok onder het harnas: bij een ridderes een wijde rok, anders een smalle slip.
    if (fem) {
      g.beginPath();
      g.moveTo(4.2, 11.6);
      g.lineTo(7.8, 11.6);
      g.quadraticCurveTo(8.6, 12.8, 8.9, 14.2);
      g.quadraticCurveTo(6, 14.8, 3.1, 14.2);
      g.quadraticCurveTo(3.4, 12.8, 4.2, 11.6);
      d.fill(d.lin(0, 11.6, 0, 14.6, [pal.C, shade(pal.C, -.35)]));
      for (const x of [5, 6, 7]) d.line(x, 12.3, x + (x - 6) * .5, 14.2, shade(pal.C, -.3), .12);
    } else {
      d.path([4, 11.6, 8, 11.6, 7.9, 13.5, 6, 14.4, 4.1, 13.5]);
      d.fill(d.lin(0, 11.6, 0, 14.4, [pal.C, shade(pal.C, -.35)]));
      d.line(6, 12.2, 6, 14, shade(pal.C, .35), .18);
    }
    // Borstplaat, bij een ridderes met een smallere taille.
    const wx = fem ? .55 : 0;
    g.beginPath();
    g.moveTo(3.2, 7.9);
    g.quadraticCurveTo(6, 7.1, 8.8, 7.9);
    g.lineTo(8.6, 10.2);
    g.quadraticCurveTo(8.4 - wx, 11.2, 8 - wx, 12);
    g.lineTo(4 + wx, 12);
    g.quadraticCurveTo(3.6 + wx, 11.2, 3.4, 10.2);
    g.closePath();
    d.fill(d.steel(3.2, 8.8));
    if (d.style === 1) {
      // Cyberharnas: neonlijnen.
      d.glow(pal.V, .7, () => {
        d.line(3.9, 8.4, 4.6, 11.3, pal.V, .14);
        d.line(8.1, 8.4, 7.4, 11.3, pal.V, .14);
        d.line(4.6, 11.3, 7.4, 11.3, pal.V, .12);
      });
    } else if (d.style === 3) {
      // Mecha: koelribben en een gekleurde plaat.
      for (const y of [10.4, 10.8]) { d.line(4.5, y, 5.2, y, '#4a5466', .14); d.line(6.8, y, 7.5, y, '#4a5466', .14); }
      d.line(4.2, 8.1, 7.8, 8.1, pal.C, .3);
    } else if (d.style === 4) {
      d.g.fillStyle = 'rgba(255,255,255,.55)';
      d.path([7.4, 8.4, 7.6, 8.9, 8.1, 9.1, 7.6, 9.3, 7.4, 9.8, 7.2, 9.3, 6.7, 9.1, 7.2, 8.9]);
      d.g.fill();
    }
    // Glansrand en middenrib.
    d.line(4.1, 8.4, 4.4, 11.2, 'rgba(255,255,255,.7)', .22);
    d.line(6, 7.6, 6, 11.8, 'rgba(40,50,70,.35)', .14);
    // Kraag in de kleur van het harnas.
    d.path([4.3, 7.4, 7.7, 7.4, 7.3, 8.2, 4.7, 8.2]);
    d.fill(pal.C, true, .15);
    // Energiekern op de borst.
    d.ellipse(6, 9.5, .85, .85);
    d.fill(d.lin(5.2, 8.7, 6.8, 10.3, ['#56607a', '#232a3c']), true, .18);
    d.glow(pal.V, 1.2, () => {
      d.ellipse(6, 9.5, .5, .5);
      d.fill(d.lin(5.6, 9.1, 6.4, 9.9, ['#ffffff', pal.V]), false);
    });
    // Riem met gesp.
    d.rrect(3.85, 11.35, 4.3, .75, .2);
    d.fill(d.lin(0, 11.35, 0, 12.1, ['#5b4330', '#2e2118']), true, .15);
    d.rrect(5.5, 11.25, 1, .95, .2);
    d.fill(d.lin(5.5, 0, 6.5, 0, ['#fff1b8', GOLD, '#b8860b']), true, .15);
  }

  function drawPauldron(d, x, C, V) {
    const { g } = d;
    const b = d.style === 3 ? 1.25 : 1;
    g.beginPath();
    g.moveTo(x - 1.55 * b, 9.2);
    g.quadraticCurveTo(x - 1.6 * b, 7.5 - (b - 1) * 2, x, 7.4 - (b - 1) * 2);
    g.quadraticCurveTo(x + 1.6 * b, 7.5 - (b - 1) * 2, x + 1.55 * b, 9.2);
    g.quadraticCurveTo(x, 8.7, x - 1.55 * b, 9.2);
    d.fill(d.steel(x - 1.6 * b, x + 1.6 * b));
    if (d.style === 1) d.glow(V, .6, () => d.line(x - 1.2, 8.75, x + 1.2, 8.75, V, .2));
    else d.line(x - 1.2 * b, 8.75, x + 1.2 * b, 8.75, C, .32);
  }

  function drawArm(d, x, pal, robot) {
    if (!robot) {
      d.rrect(x, 8.4, 1.4, 3.2, .55);
      d.fill(d.steel(x, x + 1.4));
      return;
    }
    // Robotarm: dunne stangen met gloeiende gewrichten.
    const cx = x + .7;
    d.rrect(cx - .45, 8.4, .9, 1.7, .3);
    d.fill(d.lin(cx - .45, 0, cx + .45, 0, ['#9aa3b5', '#4a5266', '#262c3a']), true, .15);
    d.rrect(cx - .4, 10.2, .8, 1.5, .3);
    d.fill(d.lin(cx - .4, 0, cx + .4, 0, ['#9aa3b5', '#4a5266', '#262c3a']), true, .15);
    d.line(cx, 8.7, cx, 11.4, alpha(pal.V, .8), .1);
    d.glow(pal.V, .9, () => { d.ellipse(cx, 10.15, .42, .42); d.fill(pal.V, true, .12); });
  }

  function drawGauntlet(d, x, y, pal, robot) {
    if (robot) {
      d.rrect(x - .75, y - .6, 1.5, 1.15, .3);
      d.fill(d.lin(x - .75, 0, x + .75, 0, ['#7c8598', '#383f52', '#1d222e']), true, .18);
      d.glow(pal.V, .5, () => d.line(x - .5, y - .05, x + .5, y - .05, pal.V, .12));
      return;
    }
    d.rrect(x - .8, y - .65, 1.6, 1.25, .45);
    d.fill(d.steel(x - .8, x + .8, true), true, .18);
  }

  // Het wapen in de linkerhand (hand op 2.6, 11.8).
  function drawWeapon(d, pal, w) {
    const { g } = d;
    g.save();
    g.translate(2.6, 11.8);
    g.rotate(-.27);
    if (w === 0 || w === 1) {
      // Kling naar boven.
      if (w === 0) {
        d.path([-.32, -.6, .32, -.6, .3, -6.2, 0, -6.9, -.3, -6.2]);
        d.fill(d.lin(-.32, 0, .32, 0, ['#ffffff', '#cbd6e4', '#7d8aa2']));
        d.line(0, -.9, 0, -6, 'rgba(90,105,130,.6)', .1);
      } else {
        d.glow(pal.V, 1.6, () => {
          d.path([-.34, -.7, .34, -.7, .34, -6.4, 0, -7, -.34, -6.4]);
          d.fill(pal.V, false);
        });
        d.path([-.14, -.8, .14, -.8, .14, -6.3, 0, -6.6, -.14, -6.3]);
        d.fill('#ffffff', false);
      }
      // Pareerstang en knop.
      d.rrect(-1.05, -.85, 2.1, .45, .2);
      d.fill(d.lin(0, -.85, 0, -.4, ['#fff1b8', GOLD, '#a87410']), true, .15);
      d.rrect(-.2, -.45, .4, 1.4, .1);
      d.fill('#3a2a1c', true, .12);
      d.ellipse(0, 1.15, .32, .32);
      d.fill(GOLD, true, .12);
    } else if (w === 2 || w === 3) {
      // Steel.
      d.rrect(-.2, -5.4, .4, 7.2, .15);
      d.fill(d.lin(-.2, 0, .2, 0, ['#9a6a40', '#5b3a20']), true, .14);
      if (w === 2) {
        // Bijl: halve maan naar links.
        g.beginPath();
        g.moveTo(-.1, -5.2);
        g.quadraticCurveTo(-1, -5.5, -1.75, -6.1);
        g.quadraticCurveTo(-1.2, -4.6, -1.75, -3.1);
        g.quadraticCurveTo(-1, -3.7, -.1, -3.9);
        g.closePath();
        d.fill(d.lin(-1.75, 0, 0, 0, ['#ffffff', '#c3cedd', '#6c7890']));
        d.line(-1.55, -5.6, -1.55, -3.6, 'rgba(255,255,255,.9)', .12);
      } else {
        // Strijdhamer met een gloeiende rune.
        d.rrect(-1.25, -6.1, 2.5, 1.6, .25);
        d.fill(d.steel(-1.25, 1.25, true));
        d.glow(pal.V, 1, () => {
          d.path([-.3, -5.85, .3, -5.85, 0, -4.75]);
          d.fill(pal.V, false);
        });
      }
    } else if (w === 5) {
      // Plasmablaster: de loop schuin omhoog, een gloeiende energiecel.
      d.rrect(-.3, -.2, .6, 1.3, .2);
      d.fill('#2a3042', true, .14);
      d.rrect(-.55, -3.2, 1.1, 3.1, .35);
      d.fill(d.lin(-.55, 0, .55, 0, ['#e9eef5', '#a5b0c2', '#5b667c']));
      d.rrect(-.28, -4.3, .56, 1.2, .15);
      d.fill('#3a4256', true, .14);
      d.glow(pal.V, 1, () => { d.rrect(-.25, -2.6, .5, 1.6, .2); d.fill(pal.V, false); });
      d.glow(pal.V, 1.4, () => { d.ellipse(0, -4.45, .3, .3); d.fill('#ffffff', false); });
    } else if (w === 6) {
      // Energiespeer: lange schacht met een speerpunt van licht.
      d.rrect(-.15, -6.2, .3, 9, .12);
      d.fill(d.lin(-.15, 0, .15, 0, ['#e9eef5', '#6c7890']), true, .1);
      d.rrect(-.4, -6.3, .8, .4, .15);
      d.fill(GOLD, true, .1);
      d.glow(pal.V, 1.6, () => {
        d.path([0, -8.4, .55, -6.9, 0, -6.3, -.55, -6.9]);
        d.fill(pal.V, false);
      });
      d.path([0, -8, .25, -6.9, 0, -6.55, -.25, -6.9]);
      d.fill('#ffffff', false);
    } else {
      // Toverstaf met een zwevende bol.
      d.rrect(-.17, -6, .34, 9.6, .15);
      d.fill(d.lin(-.2, 0, .2, 0, ['#c8a2ff', '#4a2c7a']), true, .12);
      d.ellipse(0, -6.3, .75, .32);
      d.fill(GOLD, true, .12);
      d.glow(pal.V, 1.8, () => {
        d.ellipse(0, -7.25, .7, .7);
        d.fill(d.lin(-.7, -7.9, .7, -6.6, ['#ffffff', pal.V]), false);
      });
    }
    g.restore();
  }

  function shieldPath(d, x0, y0, s) {
    const { g } = d;
    const w = 4 * s, cx = x0 + w / 2;
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(cx, y0 - .45 * s, x0 + w, y0);
    g.lineTo(x0 + w, y0 + 2.8 * s);
    g.quadraticCurveTo(x0 + w - .2 * s, y0 + 4.6 * s, cx, y0 + 5.6 * s);
    g.quadraticCurveTo(x0 + .2 * s, y0 + 4.6 * s, x0, y0 + 2.8 * s);
    g.closePath();
  }

  function drawShield(d, pal, pat, x0, y0, s = 1) {
    const { g } = d;
    const w = 4 * s, h = 5.6 * s, cx = x0 + w / 2;
    shieldPath(d, x0, y0, s);
    g.save();
    g.clip();
    g.fillStyle = d.lin(x0, y0, x0 + w, y0 + h, [shade(pal.D, .25), pal.D, shade(pal.D, -.3)]);
    g.fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
    g.fillStyle = pal.E;
    if (pat === 1) g.fillRect(cx, y0 - 1, w, h + 2);
    if (pat === 2) { g.fillRect(cx - .4 * s, y0 - 1, .8 * s, h + 2); g.fillRect(x0 - 1, y0 + 1.75 * s, w + 2, .8 * s); }
    if (pat === 3) d.path([x0 - 1, y0 + .2 * s, x0 + .3 * s, y0 - 1, x0 + w + 1, y0 + 3.8 * s, x0 + w - .3 * s, y0 + 5 * s]), g.fill();
    if (pat === 4) {
      const q = w / 4;
      for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) g.fillRect(x0 + i * q, y0 - .2 + j * q, q, q);
    }
    if (pat === 5) d.path([x0 - 1, y0 + 3.6 * s, cx, y0 + 1.2 * s, x0 + w + 1, y0 + 3.6 * s, x0 + w + 1, y0 + 4.6 * s, cx, y0 + 2.2 * s, x0 - 1, y0 + 4.6 * s]), g.fill();
    // Glans bovenaan.
    g.fillStyle = 'rgba(255,255,255,.18)';
    d.ellipse(x0 + w * .35, y0 + h * .2, w * .45, h * .22, -.3);
    g.fill();
    g.restore();
    // Stalen rand.
    shieldPath(d, x0, y0, s);
    g.lineWidth = .32 * s; g.strokeStyle = '#d9e2ee'; g.stroke();
    g.lineWidth = .14; g.strokeStyle = LINE; g.stroke();
    if (pat === 0) {
      // Effen schild: een gouden knop in het midden.
      d.ellipse(cx, y0 + 2.3 * s, .65 * s, .65 * s);
      d.fill(d.lin(cx - .6, 0, cx + .6, 0, ['#fff1b8', GOLD, '#a87410']), true, .14);
    }
  }

  // Het gezicht onder een open helm, kap of glazen helm, met de pony van het haar.
  function drawFace(d, pal, y = 5.65, fringe = true) {
    const fem = pal.a.type === 1;
    d.ellipse(6, y, 1.55, 1.6);
    d.fill(d.lin(4.5, 0, 7.5, 0, [shade(pal.F, .15), pal.F, shade(pal.F, -.25)]), true, .15);
    for (const x of [5.35, 6.65]) {
      d.ellipse(x, y - .1, .2, fem ? .3 : .28);
      d.fill('#141826', false);
      d.ellipse(x + .07, y - .2, .07, .07);
      d.fill('#ffffff', false);
      if (fem) {
        const s = x < 6 ? -1 : 1;
        d.line(x + s * .12, y - .35, x + s * .32, y - .5, '#141826', .08);
        d.line(x + s * .18, y - .28, x + s * .38, y - .38, '#141826', .07);
      }
    }
    d.g.fillStyle = alpha('#ff7a8a', fem ? .45 : .35);
    d.ellipse(4.95, y + .45, .3, .18); d.g.fill();
    d.ellipse(7.05, y + .45, .3, .18); d.g.fill();
    d.g.beginPath();
    d.g.moveTo(5.6, y + .7);
    d.g.quadraticCurveTo(6, y + 1, 6.4, y + .7);
    d.g.strokeStyle = fem ? '#c2456a' : shade(pal.F, -.55); d.g.lineWidth = fem ? .18 : .14; d.g.stroke();
    if (fringe) drawFringe(d, pal, y);
  }

  // De pony boven het gezicht.
  function drawFringe(d, pal, y) {
    const { g } = d;
    const hair = pal.a.haar;
    if (hair === 5) return;
    const H = pal.H;
    g.beginPath();
    if (hair === 4) {
      g.moveTo(4.4, y - .3);
      const pts = [[4.6, y - 1.9], [5.1, y - .9], [5.5, y - 2.2], [5.9, y - 1], [6.3, y - 2.3], [6.7, y - 1], [7.1, y - 2.1], [7.4, y - .9], [7.7, y - 1.7], [7.6, y - .3]];
      for (const [px, py] of pts) g.lineTo(px, py);
      g.quadraticCurveTo(6, y - 1.1, 4.4, y - .3);
    } else {
      g.moveTo(4.4, y - .2);
      g.bezierCurveTo(4.2, y - 2.1, 7.8, y - 2.1, 7.6, y - .2);
      g.quadraticCurveTo(7.1, y - .9, 6.5, y - .7);
      g.quadraticCurveTo(6, y - 1.1, 5.4, y - .7);
      g.quadraticCurveTo(4.9, y - .9, 4.4, y - .2);
    }
    d.fill(d.lin(4.4, y - 2, 7.6, y, [shade(H, .3), H, shade(H, -.35)]), true, .14);
  }

  // Haar dat onder de helm uitkomt: lang, een vlecht of een paardenstaart.
  function drawHairBack(d, pal, back) {
    const { g } = d;
    const hair = pal.a.haar;
    const H = pal.H;
    const fillH = (x0, x1) => d.fill(d.lin(x0, 0, x1, 0, [shade(H, .25), H, shade(H, -.4)]), true, .15);
    if (hair === 1) {
      g.beginPath();
      g.moveTo(3.6, 3.8);
      g.quadraticCurveTo(2.2, 6.5, 2.6, 10.4);
      g.quadraticCurveTo(6, back ? 11.2 : 10.8, 9.4, 10.4);
      g.quadraticCurveTo(9.8, 6.5, 8.4, 3.8);
      g.closePath();
      fillH(2.8, 9.2);
    } else if (hair === 3) {
      g.beginPath();
      if (back) {
        g.moveTo(5.4, 5.6);
        g.quadraticCurveTo(5, 8.5, 5.8, 10.8);
        g.quadraticCurveTo(6.6, 8.5, 6.6, 5.6);
      } else {
        g.moveTo(8.4, 5);
        g.quadraticCurveTo(10.2, 6, 9.6, 9.2);
        g.quadraticCurveTo(9.3, 7, 8.4, 6.4);
      }
      g.closePath();
      fillH(5, 10);
    } else if (hair === 2 && back) {
      for (let i = 0; i < 6; i++) {
        d.ellipse(6, 6.2 + i * .85, .5 - i * .03, .5);
        fillH(5.4, 6.6);
      }
      d.ellipse(6, 11.3, .3, .25); d.fill(pal.C, true, .1);
    }
  }

  // Een vlecht over de schouder, van voren.
  function drawBraid(d, pal) {
    const H = pal.H;
    for (let i = 0; i < 5; i++) {
      d.ellipse(4.1 - i * .08, 6.6 + i * .8, .48, .46);
      d.fill(d.lin(3.6, 0, 4.6, 0, [shade(H, .25), H, shade(H, -.4)]), true, .14);
    }
    d.ellipse(3.75, 10.5, .28, .22);
    d.fill(pal.C, true, .1);
  }

  function domePath(d, top, bottom = 7.5) {
    const { g } = d;
    g.beginPath();
    g.moveTo(3.4, bottom);
    g.lineTo(3.3, 5);
    g.bezierCurveTo(3.3, top + .4, 8.7, top + .4, 8.7, 5);
    g.lineTo(8.6, bottom);
    g.closePath();
  }

  function slit(d, pal, x, y, w, h) {
    d.glow(pal.V, 1, () => {
      d.rrect(x, y, w, h, h / 2);
      d.fill(d.lin(0, y, 0, y + h, ['#ffffff', pal.V]), false);
    });
  }

  function drawHelm(d, pal, helm, back) {
    const { g } = d;
    if (helm === 0) {
      domePath(d, 2);
      d.fill(d.steel(3.3, 8.7));
      if (!back) {
        d.rrect(3.7, 4.45, 4.6, .75, .2);
        d.fill('#1a2030', true, .12);
        slit(d, pal, 3.95, 4.6, 4.1, .45);
        for (const y of [6.1, 6.6]) for (const x of [6.7, 7.2, 7.7]) { d.ellipse(x, y, .12, .12); d.fill('#3a4459', false); }
      }
      d.line(6, 2.5, 6, back ? 7.2 : 4.3, 'rgba(255,255,255,.55)', .2);
    } else if (helm === 1) {
      d.rrect(3.3, 2.5, 5.4, 5, [.6, .6, .2, .2]);
      d.fill(d.steel(3.3, 8.7));
      d.rrect(3.3, 2.5, 5.4, .8, [.6, .6, 0, 0]);
      d.fill(d.lin(0, 2.5, 0, 3.3, ['#fff1b8', GOLD, '#a87410']), true, .14);
      if (!back) {
        d.rrect(3.75, 4.25, 4.5, .7, .15); d.fill('#1a2030', true, .12);
        d.rrect(5.65, 4.25, .7, 2.6, .15); d.fill('#1a2030', true, .12);
        slit(d, pal, 3.95, 4.4, 1.55, .4);
        slit(d, pal, 6.5, 4.4, 1.55, .4);
      }
      for (const x of [3.8, 8.2]) { d.ellipse(x, 6.9, .14, .14); d.fill('#3a4459', false); }
    } else if (helm === 2) {
      g.beginPath();
      g.moveTo(3.5, 7.5);
      g.lineTo(3.35, 4.6);
      g.quadraticCurveTo(3.6, 2.4, 6, 1.4);
      g.quadraticCurveTo(8.4, 2.4, 8.65, 4.6);
      g.lineTo(8.5, 7.5);
      g.closePath();
      d.fill(d.steel(3.3, 8.7));
      if (!back) {
        d.path([3.7, 4.2, 8.3, 4.2, 7.8, 6.3, 6, 7.4, 4.2, 6.3]);
        d.fill(d.steel(3.7, 8.3, true), true, .16);
        slit(d, pal, 4.2, 4.75, 1.4, .38);
        slit(d, pal, 6.4, 4.75, 1.4, .38);
        for (const y of [5.9, 6.4]) d.line(5.3, y, 6.7, y, '#1a2030', .12);
      }
      d.line(6, 1.8, 6, 4, 'rgba(255,255,255,.6)', .18);
    } else if (helm === 3) {
      d.ellipse(6, 4.85, 2.8, 2.75);
      d.fill(d.lin(3.2, 2.5, 8.8, 7.5, ['#ffffff', '#dfe7f2', '#9aa9c0', '#5b6780']));
      d.rrect(4.4, 6.6, 3.2, 1, .3);
      d.fill(d.steel(4.4, 7.6, true), true, .14);
      if (!back) {
        g.beginPath();
        g.moveTo(3.5, 4.1);
        g.quadraticCurveTo(6, 3.5, 8.5, 4.1);
        g.lineTo(8.1, 5.9);
        g.quadraticCurveTo(6, 6.8, 3.9, 5.9);
        g.closePath();
        d.glow(pal.V, 1.2, () => d.fill(d.lin(0, 3.6, 0, 6.6, [shade(pal.V, .5), pal.V, shade(pal.V, -.45)]), true, .16));
        d.line(4.3, 4.35, 5.6, 4.2, 'rgba(255,255,255,.85)', .2);
      } else {
        d.line(6, 2.4, 6, 6.6, pal.V, .22);
      }
      for (const x of [3.25, 8.75]) d.glow(pal.V, .8, () => { d.ellipse(x, 5, .32, .55); d.fill(pal.V, true, .12); });
    } else if (helm === 4) {
      g.beginPath();
      g.moveTo(3, 7.7);
      g.quadraticCurveTo(2.9, 3.4, 6, 1.7);
      g.quadraticCurveTo(9.1, 3.4, 9, 7.7);
      g.closePath();
      d.fill(d.lin(3, 0, 9, 0, [shade(pal.C, .25), pal.C, shade(pal.C, -.4)]));
      if (!back) {
        d.ellipse(6, 5.35, 2, 2);
        d.fill(shade(pal.C, -.65), false);
        drawFace(d, pal, 5.75);
        // Schaduw van de kap op het voorhoofd.
        d.ellipse(6, 4.2, 1.9, .8);
        g.fillStyle = alpha('#000000', .35); g.fill();
      } else {
        d.line(6, 2.2, 6, 7.4, shade(pal.C, -.3), .2);
      }
    } else if (helm === 5) {
      if (!back) drawFace(d, pal, 5.7);
      g.beginPath();
      g.moveTo(3.35, 7.4);
      g.lineTo(3.3, 4.8);
      g.bezierCurveTo(3.3, 1.9, 8.7, 1.9, 8.7, 4.8);
      g.lineTo(8.65, 7.4);
      if (!back) {
        g.lineTo(7.7, 7.4);
        g.lineTo(7.6, 5.2);
        g.quadraticCurveTo(6, 4.2, 4.4, 5.2);
        g.lineTo(4.3, 7.4);
      }
      g.closePath();
      d.fill(d.steel(3.3, 8.7));
      if (!back) {
        d.rrect(5.78, 4.3, .44, 1.75, .15);
        d.fill(d.steel(5.78, 6.22), true, .12);
      }
      d.line(3.6, 4.65, 8.4, 4.65, pal.C, .35);
    } else if (helm === 6) {
      // Drakenhelm: donker staal met een kam van vinnen.
      for (let i = 0; i < 4; i++) {
        const y = 2.1 + i * .9;
        d.path([5.6, y + .3, 6, y - .9 + i * .05, 6.4, y + .3]);
        d.fill(d.lin(0, y - 1, 0, y + .3, [shade(pal.C, .3), shade(pal.C, -.3)]), true, .14);
      }
      domePath(d, 2.2);
      d.fill(d.steel(3.3, 8.7, true));
      d.path([3.3, 5.9, 2.5, 7.3, 3.5, 7.1]);
      d.fill(shade(pal.C, -.2), true, .14);
      d.path([8.7, 5.9, 9.5, 7.3, 8.5, 7.1]);
      d.fill(shade(pal.C, -.2), true, .14);
      if (!back) {
        d.path([3.8, 4.2, 5.6, 4.8, 5.4, 5.3, 3.9, 4.8]); d.fill('#11151f', true, .1);
        d.path([8.2, 4.2, 6.4, 4.8, 6.6, 5.3, 8.1, 4.8]); d.fill('#11151f', true, .1);
        d.glow(pal.V, 1, () => {
          d.path([4, 4.45, 5.45, 4.95, 5.3, 5.1, 4.05, 4.7]); d.fill(pal.V, false);
          d.path([8, 4.45, 6.55, 4.95, 6.7, 5.1, 7.95, 4.7]); d.fill(pal.V, false);
        });
        for (const x of [5.2, 6, 6.8]) d.line(x, 6.1, x, 7, '#11151f', .16);
      }
    } else if (helm === 8) {
      // Holovizier: open gezicht, haar, en een zwevende band van licht voor de ogen.
      if (!back) {
        if (pal.a.haar !== 5) { d.ellipse(6, 4.6, 1.75, 1.55); d.fill(pal.H, true, .15); }
        drawFace(d, pal, 5.5);
        d.glow(pal.V, 1, () => {
          d.rrect(3.9, 4.95, 4.2, .7, .3);
          d.fill(alpha(pal.V, .55), false);
        });
        d.rrect(3.9, 4.95, 4.2, .7, .3);
        g.lineWidth = .1; g.strokeStyle = '#ffffff'; g.stroke();
        d.line(4.3, 5.15, 5.2, 5.15, 'rgba(255,255,255,.8)', .08);
      } else {
        d.ellipse(6, 5, 1.7, 1.9);
        d.fill(pal.a.haar === 5 ? d.lin(4.3, 0, 7.7, 0, [shade(pal.F, .1), shade(pal.F, -.25)]) : d.lin(4.3, 0, 7.7, 0, [shade(pal.H, .2), shade(pal.H, -.35)]), true, .15);
        d.glow(pal.V, .8, () => d.line(4.2, 5.3, 7.8, 5.3, pal.V, .25));
      }
      for (const x of [4.05, 7.95]) {
        d.rrect(x - .35, 4.6, .7, 1.4, .3);
        d.fill(d.steel(x - .35, x + .35, true), true, .12);
        d.glow(pal.V, .6, () => { d.ellipse(x, 5.3, .14, .14); d.fill(pal.V, false); });
      }
    } else if (helm === 9) {
      // Cyberhelm: hoekige platen en een gloeiend V-vizier.
      d.path([3.3, 7.5, 3.15, 4.3, 4.1, 2.4, 7.9, 2.4, 8.85, 4.3, 8.7, 7.5]);
      d.fill(d.steel(3.2, 8.8));
      d.line(6, 2.5, 6, back ? 7.3 : 3.9, 'rgba(255,255,255,.5)', .16);
      for (const [x0, x1] of [[3.3, 4.6], [8.7, 7.4]]) d.line(x0, 6.2, x1, 7.4, 'rgba(10,16,32,.5)', .12);
      if (!back) {
        d.path([3.7, 4.2, 6, 5.4, 8.3, 4.2, 8.2, 5.1, 6, 6.3, 3.8, 5.1]);
        d.fill('#11151f', true, .12);
        d.glow(pal.V, 1.2, () => {
          d.path([3.95, 4.55, 6, 5.65, 8.05, 4.55, 8, 4.95, 6, 6, 4, 4.95]);
          d.fill(pal.V, false);
        });
        d.rrect(5.3, 6.6, 1.4, .5, .2); d.fill('#11151f', true, .1);
      } else {
        d.glow(pal.V, .7, () => { d.line(4.2, 4.6, 7.8, 4.6, pal.V, .16); d.line(4.2, 5.4, 7.8, 5.4, pal.V, .16); });
      }
    } else {
      // Ruimtehelm: een glazen bol met een stalen kraag.
      if (!back) drawFace(d, pal, 5.1);
      else { d.ellipse(6, 4.9, 1.7, 1.8); d.fill(pal.a.haar === 5 ? pal.F : pal.H, false); }
      d.ellipse(6, 4.75, 2.85, 2.85);
      d.glow(pal.V, .9, () => d.fill(alpha(pal.V, .22), true, .18));
      d.ellipse(6, 4.75, 2.85, 2.85);
      g.lineWidth = .26; g.strokeStyle = alpha(pal.V, .9); g.stroke();
      d.line(4.4, 3.2, 5.1, 2.65, 'rgba(255,255,255,.9)', .28);
      d.line(7.9, 6.3, 8.1, 5.9, 'rgba(255,255,255,.6)', .2);
      d.rrect(3.7, 6.9, 4.6, .9, .35);
      d.fill(d.steel(3.7, 8.3), true, .15);
      for (const x of [4.5, 6, 7.5]) d.glow(pal.V, .6, () => { d.ellipse(x, 7.35, .16, .16); d.fill(pal.V, false); });
    }
  }

  // Versieringen die achter de helm horen (pluim, hoorns, vleugels, vlammen) en ervoor (kroon, antenne, halo).
  function drawAccentBehind(d, pal, acc) {
    const { g } = d;
    if (acc === 1) {
      g.beginPath();
      g.moveTo(5.5, 3.2);
      g.bezierCurveTo(4.6, 1, 6.6, -.1, 9.4, .8);
      g.bezierCurveTo(8.6, 1.3, 9.2, 2.2, 10.2, 2.6);
      g.bezierCurveTo(8.6, 2.9, 7.4, 2.2, 6.6, 3.2);
      g.closePath();
      d.fill(d.lin(5, 0, 10, 3, [shade(pal.C, .35), pal.C, shade(pal.C, -.35)]));
      for (const t of [.3, .55, .8]) d.line(6.2 + t * 2, 1.2 + t * .5, 6.4 + t * 2.6, 2 + t * .4, shade(pal.C, -.4), .1);
    } else if (acc === 2) {
      for (const side of [-1, 1]) {
        g.beginPath();
        g.moveTo(6 + side * 2.4, 4.6);
        g.bezierCurveTo(6 + side * 4, 4.2, 6 + side * 4.6, 2.4, 6 + side * 4.4, .6);
        g.bezierCurveTo(6 + side * 3.9, 2, 6 + side * 3.2, 3, 6 + side * 2.2, 3.4);
        g.closePath();
        d.fill(d.lin(6 + side * 2, 4, 6 + side * 4.4, .6, ['#fffaf0', '#e9dcc0', '#a8916a']));
        for (const t of [.35, .6]) d.line(6 + side * (2.6 + t * 1.4), 4 - t * 1.6, 6 + side * (3 + t * 1.3), 3.4 - t * 1.6, '#8b7652', .1);
      }
    } else if (acc === 5) {
      for (const side of [-1, 1]) {
        const X = v => 6 + side * v;
        g.beginPath();
        g.moveTo(X(2.4), 5.1);
        g.bezierCurveTo(X(3.4), 3.8, X(4.4), 2.2, X(5.4), .4);
        g.quadraticCurveTo(X(5.5), 1.8, X(4.7), 2.3);
        g.quadraticCurveTo(X(5.1), 3, X(4.3), 3.4);
        g.quadraticCurveTo(X(4.6), 4.2, X(3.6), 4.4);
        g.quadraticCurveTo(X(3.6), 5.1, X(2.4), 5.1);
        g.closePath();
        d.fill(d.lin(X(2.4), 5, X(5.4), .4, ['#a9bbd6', '#e6eef8', '#ffffff']), true, .16);
        d.line(X(2.9), 4.6, X(4.6), 2.3, '#9fb2cf', .1);
        d.line(X(2.9), 4.7, X(4.2), 3.4, '#9fb2cf', .1);
      }
    } else if (acc === 7) {
      const flame = (w, h, c1, c2) => {
        g.beginPath();
        g.moveTo(6 - w, 3.3);
        g.bezierCurveTo(6 - w * 1.2, 2.2, 6 - w * .2, 1.6, 6 - w * .4, 3.3 - h);
        g.bezierCurveTo(6 + w * .1, 3.3 - h * .65, 6 + w * .4, 3.3 - h * .9, 6 + w * .6, 3.3 - h * .75);
        g.bezierCurveTo(6 + w * .5, 2.2, 6 + w * 1.3, 2.4, 6 + w, 3.3);
        g.closePath();
        d.fill(d.lin(0, 3.3 - h, 0, 3.3, [c1, c2]), false);
      };
      d.glow('#ff8c42', 1.4, () => flame(1.9, 3.4, '#ff4d2e', '#ffb703'));
      flame(1.2, 2.3, '#ffb703', '#fff3b0');
    }
  }

  function drawAccentFront(d, pal, acc) {
    const { g } = d;
    if (acc === 8) {
      // Neonkam: een rij lichtblokjes over de helm.
      d.glow(pal.V, 1.2, () => {
        for (let i = 0; i < 4; i++) {
          const y = 2.6 - i * .55;
          d.path([5.75, y + .4, 5.85, y, 6.15, y, 6.25, y + .4]);
          d.fill(i % 2 ? '#ffffff' : pal.V, false);
        }
      });
      return;
    }
    if (acc === 9) {
      // Robotoren: twee driehoekjes met een gloeiende binnenkant.
      for (const s of [-1, 1]) {
        d.path([6 + s * 1.2, 3.1, 6 + s * 2.6, .9, 6 + s * 2.8, 3.6]);
        d.fill(d.steel(6 + s * 1.2, 6 + s * 2.8, true), true, .14);
        d.glow(pal.V, .8, () => { d.path([6 + s * 1.65, 3.05, 6 + s * 2.5, 1.7, 6 + s * 2.55, 3.3]); d.fill(pal.V, false); });
      }
      return;
    }
    if (acc === 3) {
      d.path([4.1, 3.1, 4, 1.2, 4.9, 2.1, 5.45, .8, 6, 1.9, 6.55, .8, 7.1, 2.1, 8, 1.2, 7.9, 3.1]);
      d.fill(d.lin(4, 0, 8, 0, ['#fff1b8', GOLD, '#b8860b']), true, .16);
      d.ellipse(6, 2.45, .32, .32); d.fill('#ff4d6d', true, .1);
      d.ellipse(4.8, 2.6, .2, .2); d.fill(pal.V, false);
      d.ellipse(7.2, 2.6, .2, .2); d.fill(pal.V, false);
    } else if (acc === 4) {
      d.line(7.3, 3, 8.2, .9, '#4a5468', .2);
      d.glow(pal.V, 1.4, () => { d.ellipse(8.3, .7, .45, .45); d.fill(d.lin(7.9, .3, 8.7, 1.1, ['#ffffff', pal.V]), true, .12); });
    } else if (acc === 6) {
      d.glow(pal.V, 1.2, () => {
        d.ellipse(6, 1.15, 2.3, .55);
        g.lineWidth = .32; g.strokeStyle = pal.V; g.stroke();
      });
      d.ellipse(6, 1.15, 2.3, .55);
      g.lineWidth = .12; g.strokeStyle = '#ffffff'; g.stroke();
    }
  }

  function palette(a, opts) {
    const D = SHIELDS[a.schild];
    return {
      C: opts.armor || COLORS[a.kleur],
      V: VISORS[a.vizier],
      F: SKINS[a.huid],
      H: HAIR_COLORS[a.haarkleur],
      a,
      D,
      E: D === '#ffb703' || D === '#e8edf5' ? '#1b2740' : GOLD,
    };
  }

  // Op de rug: jetpack, energievleugels of een drone. Achter het lichaam getekend (back: van achteren gezien).
  function drawBackItem(d, pal, rug, back) {
    const { g } = d;
    if (rug === 1) {
      const flame = (x, y) => d.glow('#ff8c42', 1.2, () => {
        g.beginPath();
        g.moveTo(x - .45, y);
        g.quadraticCurveTo(x, y + 2.4, x + .45, y);
        g.closePath();
        d.fill(d.lin(0, y, 0, y + 2, ['#fff3b0', '#ffb703', 'rgba(255,77,46,0)']), false);
      });
      // Van voren steken de buizen boven de schouders uit, met de vlammen naast de benen.
      const xs = back ? [4.9, 7.1] : [1.5, 10.5];
      const top = back ? 7.2 : 5.6;
      for (const x of xs) {
        flame(x, 11.5);
        d.rrect(x - .75, top, 1.5, 11.6 - top, .6);
        d.fill(d.steel(x - .75, x + .75));
        d.line(x - .55, top + 1, x + .55, top + 1, pal.C, .3);
        d.rrect(x - .5, 11.2, 1, .5, .15);
        d.fill('#2a3042', true, .12);
        if (!back) d.glow(pal.V, .6, () => { d.ellipse(x, top + .45, .22, .22); d.fill(pal.V, false); });
      }
      if (back) {
        d.rrect(5.4, 8, 1.2, 2.6, .3);
        d.fill(d.steel(5.4, 6.6, true), true, .14);
        d.glow(pal.V, .8, () => { d.ellipse(6, 8.8, .25, .25); d.fill(pal.V, false); });
      }
    } else if (rug === 2) {
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(6 + s * 1.5, 8.6);
        g.bezierCurveTo(6 + s * 4, 4.6, 6 + s * 5.8, 4.4, 6 + s * 6, 5.2);
        g.bezierCurveTo(6 + s * 5.4, 7.2, 6 + s * 5.6, 9.4, 6 + s * 4.6, 12);
        g.bezierCurveTo(6 + s * 3.8, 10.8, 6 + s * 2.6, 10.2, 6 + s * 1.5, 10.4);
        g.closePath();
        d.glow(pal.V, 1.4, () => d.fill(d.lin(6, 0, 6 + s * 6, 0, [alpha(pal.V, .15), alpha(pal.V, .55)]), false));
        g.lineWidth = .14; g.strokeStyle = alpha(pal.V, .95); g.stroke();
        for (const t of [.35, .6, .85]) d.line(6 + s * 1.8, 9.2, 6 + s * (2 + t * 3.8), 5.4 + t * 5, alpha('#ffffff', .6), .07);
      }
    }
  }

  // Een drone die naast de ridder zweeft.
  function drawDrone(d, pal) {
    d.ellipse(10.7, 6.6, 1, .25);
    d.g.fillStyle = alpha(pal.V, .25); d.g.fill();
    d.ellipse(10.7, 5.5, .75, .65);
    d.fill(d.steel(10, 11.4), true, .14);
    d.line(10.1, 4.9, 9.7, 4.4, '#4a5468', .12);
    d.line(11.3, 4.9, 11.7, 4.4, '#4a5468', .12);
    d.glow(pal.V, 1, () => { d.ellipse(10.7, 5.5, .3, .28); d.fill(pal.V, false); });
    d.ellipse(10.78, 5.42, .1, .1); d.fill('#ffffff', false);
  }

  // De achterkant van het harnas, als er geen cape is.
  function drawBackPlate(d, pal, fem) {
    const { g } = d;
    const wx = fem ? .55 : 0;
    g.beginPath();
    g.moveTo(3.2, 7.9);
    g.quadraticCurveTo(6, 7.3, 8.8, 7.9);
    g.lineTo(8.6, 10.2);
    g.quadraticCurveTo(8.4 - wx, 11.2, 8 - wx, 12.2);
    g.lineTo(4 + wx, 12.2);
    g.quadraticCurveTo(3.6 + wx, 11.2, 3.4, 10.2);
    g.closePath();
    d.fill(d.steel(3.2, 8.8));
    d.line(6, 8, 6, 12, 'rgba(10,16,32,.35)', .14);
    d.rrect(3.85 + wx, 11.5, 4.3 - 2 * wx, .7, .2);
    d.fill(d.lin(0, 11.5, 0, 12.2, ['#5b4330', '#2e2118']), true, .14);
    if (fem) {
      g.beginPath();
      g.moveTo(4.2, 12.1); g.lineTo(7.8, 12.1);
      g.quadraticCurveTo(8.6, 13, 8.9, 14.2);
      g.quadraticCurveTo(6, 14.8, 3.1, 14.2);
      g.quadraticCurveTo(3.4, 13, 4.2, 12.1);
      d.fill(d.lin(0, 12, 0, 14.6, [pal.C, shade(pal.C, -.35)]));
    }
  }

  function drawKnight(g, k, av, opts) {
    const a = clean(av) || random();
    const pal = palette(a, opts);
    const d = make(g, k, a.harnas);
    const fem = a.type === 1;
    const robot = a.arm === 1;
    const cape = a.rug === 0 || a.rug === 4;
    g.save();
    g.scale(k, k);
    if (opts.back) {
      // Van achteren: het wapen over de schouder, de cape (of het rugstuk) met het schild erop.
      if (a.rug === 2) drawBackItem(d, pal, a.rug, true);
      g.save();
      g.translate(12, 0);
      g.scale(-1, 1);
      drawWeapon(d, pal, a.wapen);
      g.restore();
      drawLegs(d, pal, fem);
      drawArm(d, 2.1, pal, false);
      drawArm(d, 8.5, pal, robot);
      if (cape) {
        d.path([2.5, 7.6, 9.5, 7.6, 10.3, 15.1, 9, 14.8, 7.5, 15.4, 6, 15, 4.5, 15.4, 3, 14.8, 1.7, 15.1]);
        d.fill(d.lin(2, 0, 10, 0, [shade(pal.C, -.1), pal.C, shade(pal.C, -.45)]));
        for (const x of [4.1, 7.9]) d.line(x, 8.6, x + (x < 6 ? -.5 : .5), 14.6, shade(pal.C, -.35), .16);
      } else {
        drawBackPlate(d, pal, fem);
      }
      if (a.rug === 1) drawBackItem(d, pal, a.rug, true);
      else drawShield(d, pal, a.patroon, 4.6, 9.3, .7);
      if (a.helm !== 7) drawHairBack(d, pal, true);
      drawPauldron(d, 2.9, pal.C, pal.V);
      drawPauldron(d, 9.1, pal.C, pal.V);
      drawAccentBehind(d, pal, a.accent);
      drawHelm(d, pal, a.helm, true);
      drawAccentFront(d, pal, a.accent);
      if (a.rug === 4) drawDrone(d, pal);
    } else {
      drawBackItem(d, pal, a.rug, false);
      if (cape) drawCapeBehind(d, pal.C);
      if ((a.haar === 1 || a.haar === 3) && a.helm !== 7) drawHairBack(d, pal, false);
      drawLegs(d, pal, fem);
      drawArm(d, 1.9, pal, robot);
      drawArm(d, 8.7, pal, false);
      drawTorso(d, pal, fem);
      if (a.haar === 2 && !(a.helm === 7)) drawBraid(d, pal);
      drawWeapon(d, pal, a.wapen);
      drawGauntlet(d, 2.6, 11.8, pal, robot);
      drawPauldron(d, 2.9, pal.C, pal.V);
      drawShield(d, pal, a.patroon, 7.35, 9.1);
      drawPauldron(d, 9.1, pal.C, pal.V);
      drawAccentBehind(d, pal, a.accent);
      drawHelm(d, pal, a.helm, false);
      drawAccentFront(d, pal, a.accent);
      if (a.rug === 4) drawDrone(d, pal);
    }
    g.restore();
  }

  const cache = new Map();
  // Een canvas met de ridder, k pixels per eenheid (12 breed, 17 hoog).
  // opts.back: van achteren; opts.armor: harnaskleur opleggen (bijvoorbeeld de kleur van het team).
  function sprite(av, opts = {}) {
    const k = opts.k || 4;
    const key = JSON.stringify([clean(av), opts.back || false, opts.armor || '', k]);
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas');
    c.width = 12 * k;
    c.height = 17 * k;
    drawKnight(c.getContext('2d'), k, av, opts);
    if (cache.size > 400) cache.clear();
    cache.set(key, c);
    return c;
  }

  // Enkel het hoofd (versiering en helm), bijvoorbeeld voor kleine plaatsen.
  function head(av, k = 4) {
    const key = JSON.stringify(['hoofd', clean(av), k]);
    if (cache.has(key)) return cache.get(key);
    const full = sprite(av, { k });
    const c = document.createElement('canvas');
    c.width = full.width;
    c.height = Math.round(8 * k);
    c.getContext('2d').drawImage(full, 0, 0);
    cache.set(key, c);
    return c;
  }

  // Ridders van alle leerlingen, op naam (kleine letters). Komt van de server.
  let all = {};
  const listeners = [];
  function setAll(map) {
    all = map || {};
    for (const fn of listeners) fn();
  }
  const byName = name => (name ? all[String(name).trim().toLowerCase()] || null : null);
  // Op de gsm: je eigen ridder, ook als de server hem nog niet kent.
  let mine = null;
  const setMine = m => { mine = m; };

  // Een klein canvas als element, voor lijsten en lobby's.
  function chip(av, cls = 'av-chip') {
    const src = sprite(av, { k: 6 });
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    c.className = cls;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  }

  return {
    COLORS, VISORS, SHIELDS, SKINS, HAIR_COLORS, TYPES, HAIRS, ARMORS, BACKS, ARMS, OPEN, HELMS, ACCENTS, PATTERNS, WEAPONS, KEYS,
    random, clean, sprite, head, chip, byName, setAll, setMine, mine: () => mine, all: () => all, onChange: fn => listeners.push(fn),
  };
})();

// Overal waar een leerling bij naam staat, zijn ridder ervoor zetten:
// lobby's (.names .name), eindstanden (ol.ranking li), het podium (.pillar .who) en alles met data-av="naam".
(() => {
  if (typeof document === 'undefined') return;
  const firstText = el => {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return n.textContent.trim();
    return el.textContent.trim();
  };
  function decorate(el, name) {
    const av = Avatar.byName(name);
    const old = el.querySelector(':scope > .av-chip');
    if (old && old.dataset.for === JSON.stringify(av)) return;
    if (old) old.remove();
    if (!av) return;
    const c = Avatar.chip(av);
    c.dataset.for = JSON.stringify(av);
    el.prepend(c);
  }
  function scan(root = document) {
    for (const el of root.querySelectorAll('.names .name')) decorate(el, firstText(el));
    for (const el of root.querySelectorAll('ol.ranking li')) {
      const span = el.querySelector('.pos + span') || el;
      decorate(span, span.textContent);
    }
    for (const el of root.querySelectorAll('.pillar .who')) decorate(el, el.textContent);
    for (const el of root.querySelectorAll('[data-av]')) decorate(el, el.dataset.av);
  }
  let queued = false;
  const later = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; scan(); });
  };
  Avatar.onChange(later);
  const start = () => new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  // Elke pagina heeft een socket; daarlangs komen de ridders van de server.
  const hook = () => {
    if (typeof socket === 'undefined') return setTimeout(hook, 50);
    socket.on('avatars', map => Avatar.setAll(map));
    socket.emit('avatars-get', null, map => Avatar.setAll(map));
  };
  hook();
})();
