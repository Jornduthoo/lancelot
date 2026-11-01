// Laserslag in 3D: dezelfde arena, door de ogen van je ridder (first person, zoals de oude Wolfenstein)
// of met de camera net achter en boven je ridder (third person, over de schouder).
// Een eenvoudige raycaster op een klein canvas dat uitvergroot wordt: snel genoeg voor een Chromebook.
// Gebruikt Arena uit laserslag-world.js en SlagDraw (kleuren).
const Slag3D = (() => {
  const FOV = 1.15;          // ongeveer 66 graden
  const WALL_H = 92;
  const FP_EYE = 28;
  const KNIGHT_H = 48;
  const FAR = 1900;
  // Third person: hoe ver en hoe hoog de camera achter je ridder hangt, en een tikje naar rechts.
  const TP_BACK = 200;
  const TP_SIDE = 26;
  const TP_EYE = 44;
  const TP_HORIZON = .42;

  // De burchtmuur errond is veel hoger dan de muren binnenin: je staat echt binnen de burcht.
  const OUT_H = 220;
  const TOWER_H = 330;       // de torens op de hoeken
  const GATE_H = 290;        // de poort achter elk kamp
  const GATE_W = 220;        // even lang als de poort van bovenaf (SlagDraw)
  const TOWER_W = 100;       // zo ver loopt een hoektoren langs elke muur
  const RED = '#ff4d6d', BLUE = '#3d8bff';
  const neonOf = r => (r.x + r.w / 2 < Arena.W * .4 ? '#ff6b86' : r.x + r.w / 2 > Arena.W * .6 ? '#5ea3ff' : '#4cc9ff');
  const rand = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // Een textuur één keer tekenen. cren: hoe hoog de kantelen bovenaan zijn; open[u] zegt of kolom u daar een gat heeft,
  // zodat de mist verre muren donkerder maakt zonder de hemel tussen de kantelen mee te kleuren.
  function paint(w, h, fn, cren = 0) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    fn(g, w, h);
    c.cren = cren;
    c.open = new Uint8Array(w);
    if (cren) {
      const row = g.getImageData(0, Math.floor(cren / 2), w, 1).data;
      for (let u = 0; u < w; u++) c.open[u] = row[u * 4 + 3] < 128 ? 1 : 0;
    }
    return c;
  }

  // Gekapte stenen: elk blok een eigen tint, voegen, een lichte bovenrand, hier en daar een barst of wat mos.
  function blocks(g, x, y, w, h, bw, bh, base, r, moss = 0) {
    if (SlagDraw.ART.muur) {
      // Geschilderde steen, licht gekleurd naar dit stuk muur.
      const pat = g.createPattern(SlagDraw.ART.muur, 'repeat');
      const k = bw / 52;
      pat.setTransform(new DOMMatrix([k, 0, 0, k, x, y]));
      g.fillStyle = pat;
      g.fillRect(x, y, w, h);
      g.globalAlpha = .25;
      g.fillStyle = `rgb(${base[0]}, ${base[1]}, ${base[2]})`;
      g.fillRect(x, y, w, h);
      g.globalAlpha = 1;
      return;
    }
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = '#100d1c';
    g.fillRect(x, y, w, h);
    for (let yy = y, row = 0; yy < y + h; yy += bh, row++) {
      for (let xx = x - (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
        const v = r();
        const s = (v - .5) * 26;
        g.fillStyle = `rgb(${base[0] + s | 0}, ${base[1] + s | 0}, ${base[2] + s | 0})`;
        g.fillRect(xx + 1, yy + 1, bw - 2, bh - 2);
        g.fillStyle = 'rgba(255, 255, 255, .1)';
        g.fillRect(xx + 1, yy + 1, bw - 2, 1);
        g.fillStyle = 'rgba(0, 0, 0, .25)';
        g.fillRect(xx + 1, yy + bh - 2, bw - 2, 1);
        if (v > .9) {
          const cx = xx + 4 + r() * (bw - 8);
          g.fillStyle = 'rgba(0, 0, 0, .5)';
          g.fillRect(cx, yy + 2, 1, bh * .45);
          g.fillRect(cx + 1, yy + 2 + bh * .45, 1, bh * .35);
        }
        if (moss && r() < moss) {
          g.fillStyle = `rgba(80, 130, 70, ${.25 + r() * .2})`;
          g.fillRect(xx + 1, yy + bh - 4 - r() * 3, bw - 2, 3 + r() * 3);
        }
      }
    }
    g.restore();
  }
  // Kantelen bovenaan: blokken met gaten waar je de hemel door ziet, elk met een smalle schietspleet.
  function crenels(g, w, h, mw, gap, base, r) {
    for (let x = gap / 2; x < w; x += mw + gap) {
      blocks(g, x, 0, mw, h, mw / 2, h / 2, base, r);
      g.fillStyle = 'rgba(255, 255, 255, .2)';
      g.fillRect(x, 0, mw, 2);
      g.fillStyle = 'rgba(0, 0, 0, .3)';
      g.fillRect(x + mw - 3, 0, 3, h);
      g.fillStyle = '#05040c';
      if (mw > 20) g.fillRect(x + mw / 2 - 1.5, h * .3, 3, h * .5);
    }
  }
  // Mezekouwen onder de weergang: uitstekende stenen met gaten ertussen, en de schaduw eronder.
  function corbels(g, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(0, y, w, h);
    g.fillStyle = 'rgba(255, 255, 255, .14)';
    g.fillRect(0, y, w, 2);
    g.fillStyle = '#06050c';
    for (let x = 4; x < w; x += 16) g.fillRect(x, y + h * .45, 8, h * .55);
    const sh = g.createLinearGradient(0, y + h, 0, y + h + 22);
    sh.addColorStop(0, 'rgba(0, 0, 0, .55)');
    sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
    g.fillStyle = sh;
    g.fillRect(0, y + h, w, 22);
  }
  // Een kruisvormig schietgat, met een vleugje licht van binnenuit.
  function slit(g, x, y, h, light) {
    g.fillStyle = 'rgba(0, 0, 0, .35)';
    g.fillRect(x - 4, y - 3, 8, h + 6);
    g.fillStyle = '#04030a';
    g.fillRect(x - 1.5, y, 3, h);
    g.fillRect(x - 7, y + h * .36, 14, 3);
    if (light) {
      g.fillStyle = light;
      g.fillRect(x - .5, y + 4, 1, h - 8);
    }
  }
  // Onderaan een smalle neonband: de sci-fi kant van de burcht.
  function neonFoot(g, w, h, color) {
    g.fillStyle = '#0c0a18';
    g.fillRect(0, h - 15, w, 7);
    g.fillStyle = color;
    g.fillRect(0, h - 14, w, 2);
    g.globalAlpha = .3;
    g.fillRect(0, h - 18, w, 3);
    g.globalAlpha = 1;
  }

  // De burchtmuur: kantelen, mezekouwen, grote stenen, regensporen, een schietgat en een sokkel met mos.
  const makeRamp = () => paint(128, OUT_H, (g, w, h) => {
    const r = rand(5);
    blocks(g, 0, 40, w, h - 40, 32, 18, [58, 52, 78], r, .08);
    blocks(g, 0, h - 36, w, 36, 42, 18, [44, 40, 60], r, .55);
    crenels(g, w, 26, 44, 20, [72, 66, 96], r);
    corbels(g, 26, w, 14, '#3e3858');
    for (let i = 0; i < 7; i++) {
      const x = r() * w, len = 60 + r() * 90;
      const gr = g.createLinearGradient(0, 40, 0, 40 + len);
      gr.addColorStop(0, 'rgba(0, 0, 0, .25)');
      gr.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = gr;
      g.fillRect(x, 40, 3 + r() * 5, len);
    }
    slit(g, 96, 66, 46, 'rgba(255, 150, 70, .55)');
    neonFoot(g, w, h, '#4cc9ff');
  }, 26);
  let rampTex = makeRamp();
  // Zodra de geschilderde steen er is: alle muurtexturen opnieuw.
  let texVer = 0;
  function freshTextures() {
    const v = SlagDraw.artVer();
    if (v === texVer) return;
    texVer = v;
    for (const c of [towerCache, gateCache, texCache]) for (const k of Object.keys(c)) delete c[k];
    rampTex = makeRamp();
    lay = null;
  }

  // Een hoektoren: hoger, met grotere kantelen, een verlicht boograam en een band in de kleur van het team.
  const towerCache = {};
  function towerTex(color) {
    if (towerCache[color]) return towerCache[color];
    towerCache[color] = paint(TOWER_W, TOWER_H, (g, w, h) => {
      const r = rand(color === RED ? 7 : 8);
      blocks(g, 0, 48, w, h - 48, 25, 20, [66, 60, 90], r, .15);
      blocks(g, 0, h - 40, w, 40, 33, 20, [46, 42, 64], r, .6);
      crenels(g, w, 34, 21, 4, [78, 72, 106], r);
      corbels(g, 34, w, 14, '#453e62');
      // Verlicht raam met een boog.
      const cx = w / 2, top = 104, ww = 24, wh = 48;
      g.fillStyle = '#2a2440';
      g.beginPath(); g.arc(cx, top, ww / 2 + 6, Math.PI, 0); g.lineTo(cx + ww / 2 + 6, top + wh + 4); g.lineTo(cx - ww / 2 - 6, top + wh + 4); g.closePath(); g.fill();
      const lg = g.createLinearGradient(0, top - ww / 2, 0, top + wh);
      lg.addColorStop(0, '#ffe2a0');
      lg.addColorStop(1, '#ff8a2a');
      g.fillStyle = lg;
      g.beginPath(); g.arc(cx, top, ww / 2, Math.PI, 0); g.lineTo(cx + ww / 2, top + wh); g.lineTo(cx - ww / 2, top + wh); g.closePath(); g.fill();
      g.fillStyle = '#2a2034';
      g.fillRect(cx - 1.5, top - ww / 2, 3, wh + ww / 2);
      g.fillRect(cx - ww / 2, top + wh * .35, ww, 3);
      // Band en schild in de kleur van het team.
      g.fillStyle = '#0c0a18';
      g.fillRect(0, 186, w, 8);
      g.fillStyle = color;
      g.fillRect(0, 188, w, 3);
      const s = 13, sy = 222;
      g.fillStyle = color;
      g.strokeStyle = '#ffd36b';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(cx - s, sy - s); g.lineTo(cx + s, sy - s); g.lineTo(cx + s, sy);
      g.quadraticCurveTo(cx + s, sy + s * .9, cx, sy + s * 1.3); g.quadraticCurveTo(cx - s, sy + s * .9, cx - s, sy);
      g.closePath(); g.fill(); g.stroke();
      slit(g, 18, 140, 40);
      slit(g, w - 18, 140, 40);
      neonFoot(g, w, h, color);
    }, 34);
    return towerCache[color];
  }

  // De poort achter een kamp: een spitsboog met een ijzeren valhek, en daarachter het krachtveld van het team.
  const gateCache = {};
  function gateTex(color) {
    if (gateCache[color]) return gateCache[color];
    gateCache[color] = paint(GATE_W, GATE_H, (g, w, h) => {
      const r = rand(color === RED ? 11 : 12);
      blocks(g, 0, 44, w, h - 44, 30, 20, [62, 56, 84], r, .12);
      blocks(g, 0, h - 36, w, 36, 40, 18, [46, 42, 64], r, .5);
      crenels(g, w, 30, 26, 10, [76, 70, 102], r);
      corbels(g, 30, w, 14, '#433c60');
      const cx = w / 2, aw = 112, top = 120, bot = h - 8;
      const arch = () => {
        g.beginPath();
        g.moveTo(cx - aw / 2, bot);
        g.lineTo(cx - aw / 2, top + 40);
        g.quadraticCurveTo(cx - aw / 2, top - 4, cx, top - 22);
        g.quadraticCurveTo(cx + aw / 2, top - 4, cx + aw / 2, top + 40);
        g.lineTo(cx + aw / 2, bot);
        g.closePath();
      };
      // Boogstenen.
      arch();
      g.strokeStyle = '#7a7298';
      g.lineWidth = 16;
      g.stroke();
      g.strokeStyle = '#262036';
      g.lineWidth = 2;
      g.stroke();
      // Het krachtveld achter het hek.
      arch();
      const fg = g.createLinearGradient(0, top - 22, 0, bot);
      fg.addColorStop(0, '#05040a');
      fg.addColorStop(.55, Glow.rgba(color, .55));
      fg.addColorStop(1, color);
      g.fillStyle = fg;
      g.fill();
      g.save();
      arch();
      g.clip();
      g.fillStyle = 'rgba(255, 255, 255, .35)';
      for (let y = top; y < bot; y += 9) g.fillRect(cx - aw / 2, y, aw, 1);
      // Het valhek.
      for (let x = cx - aw / 2 + 6; x < cx + aw / 2; x += 14) {
        g.fillStyle = '#1a1722';
        g.fillRect(x, top - 30, 5, bot - top + 22);
        g.fillStyle = '#8a90a8';
        g.fillRect(x, top - 30, 1.5, bot - top + 22);
        g.fillStyle = '#1a1722';
        g.beginPath(); g.moveTo(x - 1, bot - 8); g.lineTo(x + 6, bot - 8); g.lineTo(x + 2.5, bot); g.closePath(); g.fill();
      }
      for (let y = top - 6; y < bot - 10; y += 22) {
        g.fillStyle = '#1a1722';
        g.fillRect(cx - aw / 2, y, aw, 5);
        g.fillStyle = 'rgba(160, 170, 200, .5)';
        g.fillRect(cx - aw / 2, y, aw, 1.5);
      }
      g.restore();
      // Schild boven de poort.
      const s = 16, sy = 70;
      g.fillStyle = color;
      g.strokeStyle = '#ffd36b';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(cx - s, sy - s); g.lineTo(cx + s, sy - s); g.lineTo(cx + s, sy);
      g.quadraticCurveTo(cx + s, sy + s * .9, cx, sy + s * 1.3); g.quadraticCurveTo(cx - s, sy + s * .9, cx - s, sy);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255, 255, 255, .7)';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - 8, sy - 8); g.lineTo(cx + 8, sy + 8); g.moveTo(cx + 8, sy - 8); g.lineTo(cx - 8, sy + 8); g.stroke();
      slit(g, 26, 90, 44, 'rgba(255, 150, 70, .55)');
      slit(g, w - 26, 90, 44, 'rgba(255, 150, 70, .55)');
      neonFoot(g, w, h, color);
    }, 30);
    return gateCache[color];
  }

  // Steunbeer: een smalle pijler die uit de muur springt, iets hoger dan de muur.
  const buttTex = paint(32, OUT_H + 20, (g, w, h) => {
    const r = rand(21);
    blocks(g, 0, 0, w, h, 16, 16, [66, 60, 88], r, .2);
    g.fillStyle = 'rgba(255, 255, 255, .22)';
    g.fillRect(0, 0, w, 3);
    g.fillStyle = 'rgba(0, 0, 0, .3)';
    g.fillRect(w - 4, 0, 4, h);
    g.fillStyle = 'rgba(255, 255, 255, .08)';
    g.fillRect(0, 0, 3, h);
    neonFoot(g, w, h, '#4cc9ff');
  });

  // Een lange vaandel in de kleur van het team, met een gouden kroon en een zwaluwstaart onderaan.
  const flagCache = {};
  function pennant(color) {
    if (flagCache[color]) return flagCache[color];
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 200;
    const g = c.getContext('2d');
    const cl = g.createLinearGradient(0, 0, 48, 0);
    cl.addColorStop(0, Glow.rgba(color, .55));
    cl.addColorStop(.5, color);
    cl.addColorStop(1, Glow.rgba(color, .55));
    g.fillStyle = '#16121e';
    g.fillRect(0, 0, 48, 200);
    g.fillStyle = cl;
    g.beginPath(); g.moveTo(4, 8); g.lineTo(44, 8); g.lineTo(44, 196); g.lineTo(24, 168); g.lineTo(4, 196); g.closePath(); g.fill();
    // Schaduw van de plooien.
    for (const x of [14, 30]) {
      g.fillStyle = 'rgba(0, 0, 0, .18)';
      g.fillRect(x, 8, 4, 170);
    }
    g.fillStyle = '#ffd36b';
    g.fillRect(4, 18, 40, 3);
    g.fillRect(4, 150, 40, 3);
    g.beginPath();
    g.moveTo(12, 70); g.lineTo(12, 52); g.lineTo(18, 60); g.lineTo(24, 46); g.lineTo(30, 60); g.lineTo(36, 52); g.lineTo(36, 70);
    g.closePath(); g.fill();
    g.fillRect(12, 74, 24, 4);
    g.fillStyle = '#c9a24a';
    g.fillRect(0, 2, 48, 7);
    // Waar geen doek hangt, zie je de muur: doorzichtig maken.
    g.globalCompositeOperation = 'destination-out';
    g.fillRect(0, 0, 48, 2);
    g.beginPath(); g.moveTo(4, 200); g.lineTo(24, 168); g.lineTo(44, 200); g.closePath(); g.fill();
    g.fillRect(0, 9, 4, 191);
    g.fillRect(44, 9, 4, 191);
    flagCache[color] = c;
    return c;
  }

  // Muren binnenin: steen met kantelen bovenaan en een band met gloeiende spleten in de kleur van hun kant.
  const texCache = {};
  function wallTex(neon) {
    if (texCache[neon]) return texCache[neon];
    texCache[neon] = paint(64, WALL_H, (g, w, h) => {
      const r = rand(neon.charCodeAt(2) * 31 + 3);
      blocks(g, 0, 16, w, h - 16, 32, 13, [50, 56, 84], r, .2);
      crenels(g, w, 14, 22, 10, [64, 70, 102], r);
      // Afdekstenen onder de kantelen.
      g.fillStyle = '#5a6290';
      g.fillRect(0, 13, w, 5);
      g.fillStyle = 'rgba(255, 255, 255, .25)';
      g.fillRect(0, 13, w, 1);
      g.fillStyle = 'rgba(0, 0, 0, .4)';
      g.fillRect(0, 18, w, 3);
      g.fillStyle = '#0a0f1e';
      g.fillRect(0, 48, w, 9);
      g.fillStyle = neon;
      g.fillRect(6, 51, 20, 3);
      g.fillRect(38, 51, 20, 3);
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.fillRect(10, 52, 12, 1);
      g.fillRect(42, 52, 12, 1);
      g.fillStyle = 'rgba(0, 0, 0, .3)';
      g.fillRect(0, 16, 1, h);
      neonFoot(g, w, h + 6, neon);
    }, 13);
    return texCache[neon];
  }

  // Hoe de burcht erbij staat voor deze maat van de arena: muren, torens, poorten en steunberen,
  // met de posters, vaandels en fakkels die eraan hangen.
  let lay = null;
  function layout() {
    freshTextures();
    const key = `${Arena.tier}/${typeof Posters !== 'undefined' ? Posters.version : 0}`;
    if (lay && lay.key === key) return lay;
    const W = Arena.W, H = Arena.H;
    const photos = typeof Posters !== 'undefined' ? Posters.list : [];
    const banner = side => (typeof Posters !== 'undefined' ? Posters.banner(side) : null);
    let n = 0;
    // face: de kant van de muur waar het hangt (N, S, W of O), u0..u1 langs die kant, v0..v1 de hoogte.
    const hang = (r, face, center, v0, v1, img) => {
      if (!img) return;
      const pw = (v1 - v0) * img.width / img.height;
      r.deco.push({ face, u0: center - pw / 2, u1: center + pw / 2, v0, v1, img });
    };
    const torches = [];
    // Een plek langs een muur (c = afstand vanaf de hoek) als punt in de arena, d eenheden van de muur af.
    const at = (face, c, d) => (face === 'S' ? [c, d] : face === 'N' ? [c, H - d] : face === 'E' ? [d, c] : [W - d, c]);
    const outer = [
      { x: -60, y: -60, w: W + 120, h: 60, face: 'S', len: W, off: 60 },
      { x: -60, y: H, w: W + 120, h: 60, face: 'N', len: W, off: 60 },
      { x: -60, y: 0, w: 60, h: H, face: 'E', len: H, off: 0 },
      { x: W, y: 0, w: 60, h: H, face: 'W', len: H, off: 0 },
    ];
    // Wat uit de muur springt: een klein stukje de arena in, nooit tot waar een ridder kan komen.
    const parts = [];
    const part = (x, y, w, h, main, tex, wh, extra) => {
      const p = { x, y, w, h, main, tex, wh, deco: [], ...extra };
      parts.push(p);
      return p;
    };
    // Hoektorens: aan elke hoek een stuk langs beide muren.
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) {
      const tex = towerTex(cx ? BLUE : RED);
      part(cx ? W - TOWER_W : -60, cy ? H - 10 : -60, TOWER_W + 60, 70, cy ? 'N' : 'S', tex, TOWER_H, { uo: cx ? 0 : -60, sideU: 8 });
      part(cx ? W - 10 : -60, cy ? H - TOWER_W : -60, 70, TOWER_W + 60, cx ? 'W' : 'E', tex, TOWER_H, { uo: cy ? 0 : -60, sideU: 8 });
    }
    // De poorten achter de kampen, met een fakkel aan elke kant.
    for (const [face, color] of [['E', RED], ['W', BLUE]]) {
      part(face === 'E' ? -60 : W - 14, H / 2 - GATE_W / 2, 74, GATE_W, face, gateTex(color), GATE_H, { sideU: 8 });
      for (const s of [-1, 1]) torches.push([...at(face, H / 2 + s * (GATE_W / 2 + 22), 5), 112]);
    }
    for (const r of outer) {
      r.tex = rampTex;
      r.wh = OUT_H;
      r.deco = [];
      const vert = r.face === 'E' || r.face === 'W';
      const color = c => (r.face === 'E' ? RED : r.face === 'W' ? BLUE : c < W / 2 ? RED : BLUE);
      const cnt = Math.max(2, Math.round(r.len / 320));
      const step = r.len / cnt;
      for (let i = 0; i < cnt; i++) {
        const c = (i + .5) * step;
        if (vert && Math.abs(c - H / 2) < GATE_W / 2 + 50) continue;
        if (photos.length && i % 3 !== 2) hang(r, r.face, r.off + c, 30, 132, photos[n++ % photos.length]);
        else hang(r, r.face, r.off + c, 36, 136, banner(color(c)));
        for (const s of [-1, 1]) if (c + s * 74 > TOWER_W + 20 && c + s * 74 < r.len - TOWER_W - 20) torches.push([...at(r.face, c + s * 74, 5), 104]);
      }
      // Steunberen tussen de posters, met een vaandel.
      for (let i = 1; i < cnt; i++) {
        const c = i * step;
        if (vert && Math.abs(c - H / 2) < GATE_W / 2 + 30) continue;
        const [px, py] = at(r.face, c, 0);
        const b = vert
          ? part(r.face === 'E' ? -60 : W - 12, py - 16, 72, 32, r.face, buttTex, OUT_H + 20, { sideU: 4 })
          : part(px - 16, r.face === 'S' ? -60 : H - 12, 32, 72, r.face, buttTex, OUT_H + 20, { sideU: 4 });
        hang(b, r.face, 16, 62, 196, pennant(color(c)));
      }
    }
    const inner = Arena.WALLS.map(w => ({ ...w, tex: wallTex(neonOf(w)), wh: WALL_H, deco: [] }));
    // Lange muren binnenin krijgen aan elke lange kant een poster.
    if (photos.length) {
      for (const r of inner) {
        if (r.w >= 190) for (const f of ['N', 'S']) hang(r, f, r.w / 2, 12, 70, photos[n++ % photos.length]);
        else if (r.h >= 190) for (const f of ['W', 'E']) hang(r, f, r.h / 2, 12, 70, photos[n++ % photos.length]);
      }
    }
    const all = [...parts, ...outer];
    lay = { key, outer: all, inner, all: [...inner, ...all], torches: torches.map(([x, y, z]) => ({ x, y, z })) };
    return lay;
  }

  // Een fakkelvlam, in vier standen om te flakkeren.
  const flames = [0, 1, 2, 3].map(i => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 28;
    const g = c.getContext('2d');
    const lean = (i - 1.5) * 1.2;
    const fl = (col, s, y0) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(8 + lean * 2, y0);
      g.quadraticCurveTo(8 + 7 * s, 18, 8, 27);
      g.quadraticCurveTo(8 - 7 * s, 18, 8 + lean * 2, y0);
      g.fill();
    };
    fl('#ff6a1a', 1, 1 + i);
    fl('#ffb43c', .7, 7 + i);
    fl('#fff3c0', .4, 14);
    return c;
  });
  // Ridder van voren, in pixelkunst. C = kleur van het team.
  const FRONT = [
    '.....CC.....',
    '....CCCC....',
    '...SSSSSS...',
    '..SSSSSSSS..',
    '..SVVVVVVS..',
    '..SSSSSSSS..',
    '...SSSSSS...',
    '.CCSSGGSSCC.',
    'CCSSSSSSSSCC',
    'CsSSSCCSSSsC',
    'C.sSSCCSSs.C',
    '..SSSSSSSS..',
    '..SSGGGGSS..',
    '..SS....SS..',
    '..SS....SS..',
    '..BB....BB..',
    '.BBB....BBB.',
  ];
  // Van achteren: geen vizier, wel een cape in de kleur van het team.
  const BACK = [
    '.....CC.....',
    '....CCCC....',
    '...SSSSSS...',
    '..SSSSSSSS..',
    '..SSSSSSSS..',
    '..sSSSSSSs..',
    '...SSSSSS...',
    '.CCCCCCCCCC.',
    'CCCCCCCCCCCC',
    'CsCCCCCCCCsC',
    'C.CCCCCCCC.C',
    '..CCCCCCCC..',
    '..SCCCCCCS..',
    '..SS....SS..',
    '..SS....SS..',
    '..BB....BB..',
    '.BBB....BBB.',
  ];
  const PAL = { S: '#c9d6e6', s: '#7d8ba3', V: '#4cc9ff', G: '#ffc94a', B: '#2b3550' };
  const sprites = new Map();
  function sprite(color, back) {
    const key = back ? `${color}/achter` : color;
    if (sprites.has(key)) return sprites.get(key);
    const art = SlagDraw.tinted(back ? 'ridder-achter' : 'ridder-voor', color, 120);
    if (art) { sprites.set(key, art); return art; }
    const rows = back ? BACK : FRONT;
    const k = 4;
    const c = document.createElement('canvas');
    c.width = 12 * k;
    c.height = rows.length * k;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'C' ? color : PAL[ch];
      g.fillRect(x * k, y * k, k, k);
    }));
    sprites.set(key, c);
    return c;
  }

  // Sterren aan de hemel, vast per richting zodat ze meedraaien.
  const STARS = Array.from({ length: 90 }, (_, i) => ({ az: (i * 2.399) % (Math.PI * 2), h: ((i * 37) % 100) / 100, s: i % 7 === 0 ? 2 : 1 }));

  // Afstand tot de eerste muur langs een straal, met de plek op de muur (voor de textuur).
  function castIn(list, ox, oy, dx, dy) {
    let best = FAR;
    let u = 0;
    let side = 0;
    let hit = null;
    for (const r of list) {
      const t1 = (r.x - ox) / dx;
      const t2 = (r.x + r.w - ox) / dx;
      const t3 = (r.y - oy) / dy;
      const t4 = (r.y + r.h - oy) / dy;
      const txMin = Math.min(t1, t2);
      const txMax = Math.max(t1, t2);
      const tyMin = Math.min(t3, t4);
      const tyMax = Math.max(t3, t4);
      const tNear = Math.max(txMin, tyMin);
      const tFar = Math.min(txMax, tyMax);
      if (!(tNear <= tFar) || tFar < 0 || tNear < 0 || tNear >= best) continue;
      best = tNear;
      hit = r;
      if (txMin > tyMin) { side = 0; u = oy + dy * tNear - r.y; } else { side = 1; u = ox + dx * tNear - r.x; }
    }
    return { d: best, u, side, r: hit };
  }
  const cast = (ox, oy, dx, dy) => castIn(layout().all, ox, oy, dx, dy);

  // De vloer van bovenaf als pixels, om in 3D uit te lezen (grof genoeg voor het lage beeld).
  let floor = null;
  function floorData() {
    const img = SlagDraw.arenaImage({ walls: false, k: .5 });
    if (floor && floor.key === img.key) return floor;
    const g = img.c.getContext('2d');
    floor = { key: img.key, k: img.k, w: img.c.width, h: img.c.height, px: new Uint32Array(g.getImageData(0, 0, img.c.width, img.c.height).data.buffer) };
    return floor;
  }

  // Het verre landschap: bergen, burchten met verlichte ramen en een planeet met ringen. Eén keer getekend, rondom.
  const pano = document.createElement('canvas');
  pano.width = 1536;
  pano.height = 160;
  (() => {
    const g = pano.getContext('2d');
    const W = pano.width, H = pano.height;
    let seed = 9;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    // Planeet met een ring.
    const px = W * .3, py = H * .28;
    const pg = g.createRadialGradient(px - 14, py - 14, 4, px, py, 40);
    pg.addColorStop(0, '#ffd2f2');
    pg.addColorStop(.5, '#a35bd6');
    pg.addColorStop(1, '#2a1250');
    g.fillStyle = pg;
    g.beginPath(); g.arc(px, py, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255, 210, 160, .7)';
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(px, py, 62, 12, -.25, 0, Math.PI * 2); g.stroke();
    // Een tweede, kleine maan.
    g.fillStyle = '#bfe8ff';
    g.beginPath(); g.arc(W * .78, H * .2, 10, 0, Math.PI * 2); g.fill();
    // Bergen in twee lagen.
    for (const [base, amp, col] of [[.55, .3, '#1c1638'], [.7, .22, '#120f26']]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 16) {
        const y = H * (base - amp * (.5 + .5 * Math.sin(x * .011) * Math.sin(x * .0047 + 1.3)) - rnd() * .03);
        g.lineTo(x, y);
      }
      g.lineTo(W, H);
      g.closePath();
      g.fill();
    }
    // Burchten aan de horizon.
    for (let i = 0; i < 9; i++) {
      const cx = (i + .3 + rnd() * .4) * W / 9;
      const bw = 50 + rnd() * 50, bh = 30 + rnd() * 30;
      const by = H * .82;
      g.fillStyle = '#0b0918';
      g.fillRect(cx - bw / 2, by - bh, bw, bh + H);
      for (let k = 0; k < 3; k++) {
        const tx = cx - bw / 2 + (k * bw) / 2 - 7, th = bh + 18 + rnd() * 26;
        g.fillRect(tx, by - th, 14, th);
        g.beginPath(); g.moveTo(tx - 3, by - th); g.lineTo(tx + 7, by - th - 16); g.lineTo(tx + 17, by - th); g.closePath(); g.fill();
        g.fillStyle = rnd() < .5 ? '#ffb85c' : '#7fe0ff';
        g.fillRect(tx + 5, by - th + 8, 3, 4);
        g.fillStyle = '#0b0918';
      }
      for (let k = 0; k < 4; k++) {
        g.fillStyle = rnd() < .6 ? '#ffb85c' : '#7fe0ff';
        g.fillRect(cx - bw / 2 + 6 + rnd() * (bw - 12), by - bh + 6 + rnd() * (bh - 10), 3, 4);
      }
    }
    g.fillStyle = '#0b0918';
    g.fillRect(0, H * .82, W, H);
  })();
  // De geschilderde hemel rondom: het beeld en daarnaast gespiegeld, zodat de naad nooit opvalt.
  let skyArt = null;
  function paintedSky() {
    const img = SlagDraw.ART.hemel;
    if (!img) return null;
    if (skyArt && skyArt.img === img) return skyArt.c;
    const h = 220, w = Math.round(img.width * h / img.height);
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, w, h);
    g.translate(w * 2, 0); g.scale(-1, 1);
    g.drawImage(img, 0, 0, w, h);
    skyArt = { img, c };
    return c;
  }

  // Zit er een muur tussen twee punten?
  function visible(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay);
    const hit = cast(ax, ay, (bx - ax) / d, (by - ay) / d);
    return hit.d > d - 4;
  }

  // Richthulp: wie vlak bij het vizier staat, wordt geraakt.
  function assist(me, a, enemies) {
    let best = null;
    let bestErr = Infinity;
    for (const o of enemies) {
      const dist = Math.hypot(o.x - me.x, o.y - me.y);
      let rel = Math.atan2(o.y - me.y, o.x - me.x) - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const allow = Math.atan2(Arena.R * 1.6, dist) + .03;
      if (Math.abs(rel) < allow && Math.abs(rel) < bestErr && visible(me.x, me.y, o.x, o.y)) { best = a + rel; bestErr = Math.abs(rel); }
    }
    return best === null ? a : best;
  }

  const low = document.createElement('canvas');
  const lctx = low.getContext('2d');
  let zbuf = new Float32Array(0);
  let img = null;
  let px = null;
  let skyRows = null;

  // Teken de wereld. Geeft terug waar elke ridder op het scherm staat (voor de naamkaartjes).
  // scene: { me, a, others: [{x, y, color, flags, ...}], bullets, crystal, t, booms }
  // Met scene.self ({ color, bubble, asking }) hangt de camera achter je ridder (third person) en zie je hem zelf.
  // Waar de camera staat in third person: achter je ridder, niet door een muur heen.
  function chase(me, a) {
    const bx = -Math.cos(a);
    const by = -Math.sin(a);
    const back = Math.max(0, Math.min(TP_BACK, cast(me.x, me.y, bx, by).d - 12));
    let x = me.x + bx * back;
    let y = me.y + by * back;
    const rx = -Math.sin(a);
    const ry = Math.cos(a);
    const side = Math.max(0, Math.min(TP_SIDE * (back / TP_BACK), cast(x, y, rx, ry).d - 10));
    x += rx * side;
    y += ry * side;
    return { x, y };
  }

  function render(ctx, w, h, scene) {
    const resW = Math.max(240, Math.min(520, Math.round(w / 2.4)));
    const resH = Math.round(resW * h / w);
    if (low.width !== resW || low.height !== resH) {
      low.width = resW;
      low.height = resH;
      zbuf = new Float32Array(resW);
    }
    const g = lctx;
    g.imageSmoothingEnabled = false;
    const sharp = [];
    const { me, a } = scene;
    const tp = !!scene.self;
    const cam = tp ? chase(me, a) : me;
    const EYE = tp ? TP_EYE : FP_EYE;
    const half = Math.tan(FOV / 2);
    const proj = resW / 2 / half;
    const horizon = (tp ? TP_HORIZON : .5) * resH + (scene.bob || 0) * resH;

    // Hemel en vloer, pixel per pixel op het kleine canvas.
    if (!img || img.width !== resW || img.height !== resH) {
      img = g.createImageData(resW, resH);
      px = new Uint32Array(img.data.buffer);
      skyRows = null;
    }
    const hz = Math.max(1, Math.min(resH - 1, Math.round(horizon)));
    if (!skyRows || skyRows.length !== resH) {
      skyRows = new Uint32Array(resH);
      for (let y = 0; y < resH; y++) {
        const k = Math.min(1, y / Math.max(1, resH * .5));
        const r = Math.round(4 + k * 46), gg = Math.round(4 + k * 18), b = Math.round(14 + k * 62);
        skyRows[y] = (255 << 24) | (b << 16) | (gg << 8) | r;
      }
    }
    for (let y = 0; y < hz; y++) px.fill(skyRows[Math.min(resH - 1, Math.round(y * (resH * .5) / hz))], y * resW, (y + 1) * resW);
    {
      const fl = floorData();
      const tex = fl.px, tw = fl.w, th = fl.h, tk = fl.k;
      const ca = Math.cos(a), sa = Math.sin(a);
      const plx = -sa * half, ply = ca * half;
      const lx = ca - plx, ly = sa - ply;
      const rx = ca + plx, ry = sa + ply;
      for (let y = hz; y < resH; y++) {
        const rowD = (EYE * proj) / Math.max(.5, y - horizon + .5);
        let wx = (cam.x + rowD * lx) * tk;
        let wy = (cam.y + rowD * ly) * tk;
        const sx = ((rowD * (rx - lx)) / resW) * tk;
        const sy = ((rowD * (ry - ly)) / resW) * tk;
        let i = y * resW;
        for (let x = 0; x < resW; x++, i++, wx += sx, wy += sy) {
          const tx = wx | 0, ty = wy | 0;
          px[i] = tx < 0 || ty < 0 || tx >= tw || ty >= th ? 0xff180f10 : tex[ty * tw + tx];
        }
      }
    }
    g.putImageData(img, 0, 0);
    // Mist over de vloer: dicht aan de horizon, weg vlak voor je neus.
    {
      const fogAt = y => Math.min(.92, (((EYE * proj) / Math.max(.5, y - horizon + .5)) / 1500) ** 1.2);
      const grad = g.createLinearGradient(0, hz, 0, resH);
      for (const k of [0, .03, .08, .16, .3, .55, 1]) grad.addColorStop(k, `rgba(6, 8, 22, ${fogAt(hz + k * (resH - hz)).toFixed(3)})`);
      g.fillStyle = grad;
      g.fillRect(0, hz, resW, resH - hz);
    }
    // Sterren en het verre landschap, meedraaiend met de kijkrichting.
    const sky = paintedSky();
    g.fillStyle = '#d9ecff';
    for (const s of sky ? [] : STARS) {
      let rel = s.az - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > FOV) continue;
      g.globalAlpha = .4 + (s.h * .6);
      g.fillRect(resW / 2 + Math.tan(rel) * proj, s.h * horizon * .8, s.s, s.s);
    }
    g.globalAlpha = 1;
    {
      const src = sky || pano;
      const span = src.width;
      const perRad = span / (Math.PI * 2);
      const ph = sky ? horizon + 2 : horizon * .7;
      const width = FOV * perRad;
      for (let start = ((((a - FOV / 2) * perRad) % span) + span) % span, x = 0, rest = width; rest > 0;) {
        const take = Math.min(rest, span - start);
        g.drawImage(src, start, 0, take, src.height, x, horizon - ph, (take / width) * resW, ph);
        x += (take / width) * resW;
        rest -= take;
        start = 0;
      }
    }

    // Muren, kolom per kolom: eerst de burchtmuur errond, dan een muur binnenin als die dichterbij staat.
    const L = layout();
    const yAt = (z, perp) => horizon + ((EYE - z) * proj) / perp;
    // cut: waar een muur ervoor begint (onder de kantelen); wat daaronder zit, tekenen we niet voor niets.
    const column = (x, hit, ra, dx, dy, cut = Infinity) => {
      const perp = hit.d * Math.cos(ra - a);
      const r = hit.r;
      const top = yAt(r.wh, perp);
      const bottom = yAt(0, perp);
      const end = Math.min(bottom, cut);
      if (end <= top) return perp;
      const face = hit.side ? (dy > 0 ? 'N' : 'S') : (dx > 0 ? 'W' : 'E');
      // Op de smalle zijkant van wat uit de muur springt: gewone steen.
      const tw = r.tex.width;
      const tu = !r.main || r.main === face ? Math.floor((((hit.u + (r.uo || 0)) % tw) + tw) % tw) : r.sideU + (Math.floor(hit.u) & 7);
      g.drawImage(r.tex, tu, 0, 1, r.tex.height * (end - top) / (bottom - top), x, top, 1, end - top);
      if (r.deco.length) {
        for (const d of r.deco) {
          if (d.face !== face || hit.u < d.u0 || hit.u >= d.u1) continue;
          const y1 = yAt(d.v1, perp);
          const y0 = yAt(d.v0, perp);
          if (y1 >= end) continue;
          // Op de noord- en oostkant loopt u van rechts naar links (voor wie ernaar kijkt): spiegel terug.
          let k = (hit.u - d.u0) / (d.u1 - d.u0);
          if (face === 'N' || face === 'E') k = 1 - k;
          const y2 = Math.min(y0, end);
          g.drawImage(d.img, Math.min(d.img.width - 1, Math.floor(k * d.img.width)), 0, 1, d.img.height * (y2 - y1) / (y0 - y1), x, y1, 1, y2 - y1);
        }
      }
      // Mist: tussen twee kantelen niet over de hemel heen.
      const fogTop = r.tex.open[tu] ? top + (bottom - top) * r.tex.cren / r.tex.height : top;
      g.fillStyle = `rgba(6, 8, 22, ${Math.min(.85, perp / 1700 + (hit.side ? .16 : 0))})`;
      g.fillRect(x, fogTop, 1, end - fogTop);
      return perp;
    };
    for (let x = 0; x < resW; x++) {
      const col = (x / resW) * 2 - 1;
      const ra = a + Math.atan(col * half);
      const dx = Math.cos(ra);
      const dy = Math.sin(ra);
      const ho = castIn(L.outer, cam.x, cam.y, dx, dy);
      const hi = castIn(L.inner, cam.x, cam.y, dx, dy);
      let perp = FAR;
      const front = hi.r && hi.d < ho.d;
      // Achter een muur binnenin zie je van de burchtmuur alleen wat erboven uitsteekt (en tussen de kantelen door).
      const cut = front ? yAt(WALL_H - hi.r.tex.cren * WALL_H / hi.r.tex.height, hi.d * Math.cos(ra - a)) : Infinity;
      if (ho.r) perp = column(x, ho, ra, dx, dy, cut);
      if (front) perp = column(x, hi, ra, dx, dy);
      zbuf[x] = perp;
    }
    // Ridders, kogels en het kristal: van ver naar dichtbij, achter muren verborgen.
    const things = [];
    for (const o of scene.others) things.push({ kind: 'knight', o, x: o.x, y: o.y });
    for (const b of scene.bullets) things.push({ kind: 'bullet', o: b, x: b.x, y: b.y });
    if (scene.crystal) things.push({ kind: 'crystal', x: scene.crystal.x, y: scene.crystal.y });
    for (const tc of L.torches) things.push({ kind: 'torch', x: tc.x, y: tc.y, z: tc.z });
    for (const b of scene.booms) things.push({ kind: 'boom', o: b, x: b.x, y: b.y });
    if (tp) things.push({ kind: 'knight', self: true, o: { ...scene.self, x: me.x, y: me.y }, x: me.x, y: me.y });
    for (const th of things) th.d = Math.hypot(th.x - cam.x, th.y - cam.y);
    things.sort((p, q) => q.d - p.d);
    const tags = [];
    // In third person: wie tussen de camera en je ridder staat, wordt doorzichtig.
    const selfD = tp ? Math.hypot(me.x - cam.x, me.y - cam.y) : 0;
    for (const th of things) {
      let rel = Math.atan2(th.y - cam.y, th.x - cam.x) - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > FOV * .75 || th.d < 6) continue;
      const perp = th.d * Math.cos(rel);
      const sx = resW / 2 + Math.tan(rel) * proj;
      const k = proj / perp;
      if (th.kind === 'knight') {
        // Met een eigen ridder: zijn helm en schild, in de kleur van zijn team.
        const own = th.o.av && typeof Avatar !== 'undefined';
        const img = own ? Avatar.sprite(th.o.av, { back: th.self, armor: th.o.color, k: 8 }) : sprite(th.o.color, th.self);
        // Je eigen ridder nooit groter dan 40% van het scherm, ook als de camera tegen een muur zit.
        const hgt = th.self ? Math.min(KNIGHT_H * k, resH * .4) : KNIGHT_H * k;
        const wid = hgt * (img.width / img.height);
        const y0 = horizon + EYE * (hgt / KNIGHT_H) - hgt;
        const x0 = Math.round(sx - wid / 2);
        let shown = false;
        g.globalAlpha = tp && !th.self && th.d < selfD + 10 ? .3 : 1;
        for (let c = Math.max(0, x0); c < Math.min(resW, x0 + wid); c++) {
          if (zbuf[c] < perp) continue;
          shown = true;
          // Een eigen ridder tekenen we straks scherp op het grote scherm, de rest hier in lage resolutie.
          // Aaneengesloten zichtbare kolommen worden één strook.
          if (own) {
            const last = sharp[sharp.length - 1];
            if (last && last.img === img && last.x0 === x0 && last.c + last.n === c) last.n++;
            else sharp.push({ img, x0, wid, c, n: 1, y0, hgt, alpha: g.globalAlpha });
          } else g.drawImage(img, ((c - x0) / wid) * img.width, 0, Math.max(1, img.width / wid), img.height, c, y0, 1, hgt);
        }
        g.globalAlpha = 1;
        if (shown) {
          if (th.o.bubble) {
            g.strokeStyle = th.o.asking ? 'rgba(255, 201, 74, .8)' : 'rgba(76, 201, 255, .8)';
            g.lineWidth = Math.max(1, k * 2);
            g.beginPath(); g.ellipse(sx, y0 + hgt / 2, wid * .85, hgt * .62, 0, 0, Math.PI * 2); g.stroke();
          }
          const fog = Math.min(.7, perp / 1800);
          if (fog > .05) { g.fillStyle = `rgba(3, 6, 14, ${fog})`; g.fillRect(x0, y0, wid, hgt); }
          if (!th.self) tags.push({ o: th.o, x: sx / resW, y: y0 / resH, size: hgt / resH });
        }
      } else if (th.kind === 'bullet') {
        const c = Math.round(sx);
        if (c < 0 || c >= resW || zbuf[c] < perp) continue;
        const r = Math.max(1.5, 5 * k);
        const y = horizon + (EYE - 24) * k;
        g.fillStyle = th.o.color;
        g.shadowColor = th.o.color;
        g.shadowBlur = 8;
        g.beginPath(); g.arc(sx, y, r, 0, Math.PI * 2); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(sx, y, r * .45, 0, Math.PI * 2); g.fill();
      } else if (th.kind === 'crystal') {
        const c = Math.round(sx);
        if (c < 0 || c >= resW || zbuf[c] < perp) continue;
        const y = horizon + (EYE - 30 + Math.sin(scene.t * 3) * 4) * k;
        const s = 18 * k;
        g.fillStyle = 'rgba(255, 201, 74, .25)';
        g.beginPath(); g.arc(sx, y, s * 1.8, 0, Math.PI * 2); g.fill();
        if (SlagDraw.ART.kristal) {
          const ci = SlagDraw.ART.kristal, ch = s * 2.8, cw = ch * ci.width / ci.height;
          g.drawImage(ci, sx - cw / 2, y - ch * .55, cw, ch);
          continue;
        }
        g.fillStyle = '#ffc94a';
        g.beginPath(); g.moveTo(sx, y - s); g.lineTo(sx + s * .65, y - s * .2); g.lineTo(sx, y + s); g.lineTo(sx - s * .65, y - s * .2); g.closePath(); g.fill();
      } else if (th.kind === 'torch') {
        // Fakkel aan de muur: een ijzeren houder, een flakkerende vlam en een gloed op de stenen errond.
        const c = Math.round(sx);
        if (c < 0 || c >= resW || zbuf[c] < perp - 10 || perp > 1500) continue;
        const fl = .88 + Math.sin(scene.t * 13 + th.x * .7) * .07 + Math.sin(scene.t * 7.7 + th.y) * .05;
        const y = horizon + (EYE - th.z) * k;
        const fade = 1 - perp / 1500;
        g.fillStyle = '#2a2230';
        g.fillRect(sx - 2 * k, y, 4 * k, 18 * k);
        g.fillStyle = '#8a7046';
        g.fillRect(sx - 5 * k, y - 2 * k, 10 * k, 4 * k);
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = .6 * fl * fade;
        const R = 56 * k * fl;
        g.drawImage(Glow.glowSprite('#ff8a2a'), sx - R, y - R * .85, R * 2, R * 2);
        g.globalCompositeOperation = 'source-over';
        g.globalAlpha = .5 + fade * .5;
        const fw = 9 * k * fl, fh = 17 * k * fl;
        g.drawImage(flames[Math.floor(scene.t * 9 + th.x) & 3], sx - fw / 2, y - fh, fw, fh);
        g.globalAlpha = 1;
      } else if (th.kind === 'boom') {
        const c = Math.round(sx);
        if (c < 0 || c >= resW || zbuf[c] < perp) continue;
        const p = th.o.age / th.o.life;
        const y = horizon + (EYE - 24) * k;
        g.globalAlpha = 1 - p;
        g.strokeStyle = th.o.color;
        g.lineWidth = Math.max(1, 4 * k);
        g.beginPath(); g.arc(sx, y, (10 + p * 60) * k, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(sx, y, (14 * (1 - p)) * k, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    const sxF = w / resW, syF = h / resH;
    for (const p of sharp) {
      ctx.globalAlpha = p.alpha;
      const sx = ((p.c - p.x0) / p.wid) * p.img.width;
      ctx.drawImage(p.img, sx, 0, (p.n / p.wid) * p.img.width, p.img.height, p.c * sxF, p.y0 * syF, p.n * sxF, p.hgt * syF);
    }
    ctx.globalAlpha = 1;
    return tags.map(tg => ({ ...tg, x: tg.x * w, y: tg.y * h, size: tg.size * h }));
  }

  // Waar het vizier staat: in het midden, of in third person op de horizon.
  const aimY = (h, tp) => h * (tp ? TP_HORIZON : .5);

  // Je eigen laserlans rechtsonder, met terugslag en een flits bij elk schot.
  function weapon(ctx, w, h, color, recoil, walk) {
    const s = Math.min(w, h * 1.4) / 1500;
    const bx = w * .62 + Math.sin(walk) * 8 * s;
    const by = h + Math.abs(Math.cos(walk)) * 8 * s + recoil * 40 * s;
    const art = SlagDraw.ART.wapen;
    if (art) {
      // Geschilderde lans in je handen, rechtsonder; de punt zit linksboven in het beeld.
      const ww = Math.min(w * .62, h * 1.0), hh = ww * art.height / art.width;
      const x0 = w - ww * .92 + Math.sin(walk) * 8 * s, y0 = h - hh * .95 + Math.abs(Math.cos(walk)) * 8 * s + recoil * 40 * s;
      ctx.drawImage(art, x0, y0, ww, hh);
      const tx = x0 + ww * .03, ty = y0 + hh * .03;
      Glow.glow(ctx, tx, ty, 60 * s + recoil * 220 * s, color, .55 + recoil * .4);
      if (recoil > .5) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(tx, ty, 34 * s * recoil, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(-.42);
    ctx.fillStyle = '#56637c';
    ctx.fillRect(-30 * s, -330 * s, 60 * s, 330 * s);
    ctx.fillStyle = '#c9d6e6';
    ctx.fillRect(-20 * s, -320 * s, 40 * s, 300 * s);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24 * s;
    ctx.fillRect(-14 * s, -380 * s, 28 * s, 70 * s);
    ctx.fillRect(-36 * s, -120 * s, 72 * s, 26 * s);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffc94a';
    ctx.fillRect(-26 * s, -60 * s, 52 * s, 18 * s);
    if (recoil > .5) {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = color;
      ctx.shadowBlur = 40 * s;
      ctx.beginPath(); ctx.arc(0, -400 * s, 34 * s * recoil, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function crosshair(ctx, w, h, onTarget, dpr, tp) {
    const x = w / 2;
    const y = aimY(h, tp);
    const r = 9 * dpr;
    ctx.save();
    ctx.strokeStyle = onTarget ? '#ff4d6d' : 'rgba(255, 255, 255, .85)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.6, y); ctx.lineTo(x - r * .5, y);
    ctx.moveTo(x + r * .5, y); ctx.lineTo(x + r * 1.6, y);
    ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x, y - r * .5);
    ctx.moveTo(x, y + r * .5); ctx.lineTo(x, y + r * 1.6);
    ctx.stroke();
    if (onTarget) { ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  return { render, weapon, crosshair, assist, visible, aimY };
})();
