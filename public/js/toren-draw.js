// De prinses in de toren: tekenen van de toren, de ridders en de prinses (pixelkunst, geen afbeeldingen nodig).
const TorenDraw = (() => {
  // Kleuren van de capes, per speler.
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff'];

  // Geschilderde beelden (public/img/toren/). Is een beeld er (nog) niet, dan tekenen we dat stuk zelf zoals vroeger.
  const ART = {};
  const ART_NAMEN = ['steen', 'zweef', 'ijs', 'veer', 'stekels', 'fakkel', 'banier', 'prinses',
    'muur-kerker', 'muur-storm', 'muur-neon', 'muur-hemel', 'lucht-kerker', 'lucht-storm', 'lucht-neon', 'lucht-hemel'];
  const onArt = [];
  if (typeof Image !== 'undefined') {
    for (const n of ART_NAMEN) {
      const img = new Image();
      img.onload = () => { ART[n] = img; for (const f of onArt) f(); };
      img.src = `/img/toren/${n}.webp`;
    }
  }

  // Ridder, kijkt naar rechts. C = cape (kleur van de speler), V = vizier.
  const KNIGHT = [
    '....CC......',
    '...CCC......',
    '...SSSS.....',
    '..SSSSSS....',
    '..SsVVVV....',
    '..SSSSSS....',
    '...SSSS.....',
    '.CSSGGSS....',
    'CCSSSSSSSL..',
    'CCsSSSSSsL..',
    'CC.SSSSS.L..',
    'C..SGGGS.L..',
    '...SS.SS....',
    '...Ss.sS....',
    '...BB.BB....',
    '..BBB.BBB...',
  ];
  // Benen tijdens het lopen en springen.
  const LEGS_RUN = ['...SS..SS...', '..Ss...sS...', '..BB....BB..', '.BBB....BBB.'];
  const LEGS_AIR = ['...SSSSS....', '..SS...SS...', '..BB...BB...', '.........BB.'];

  const PRINCESS = [
    '....G.G.G...',
    '....GGGGG...',
    '...YYYYYY...',
    '..YYFFFFYY..',
    '..YYEFFEYY..',
    '..YYFFFFYY..',
    '...YFFFFY...',
    '....PPPP....',
    '...PPPPPP...',
    '..PPpPPpPP..',
    '..PPPPPPPP..',
    '.PPPpPPpPPP.',
    '.PPPPPPPPPP.',
    'PPPpPPPPpPPP',
    'PPPPPPPPPPPP',
    '.PPPPPPPPPP.',
  ];

  const BASE = { S: '#c9d6e6', s: '#7d8ba3', V: '#4cc9ff', G: '#ffc94a', B: '#2b3550', L: '#ffe08a', Y: '#ffd166', F: '#ffd8b8', E: '#1a1a2e', P: '#ff5fd2', p: '#ff9be6' };

  function pixels(ctx, map, x, y, px, palette, flip) {
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        ctx.fillStyle = palette[ch] || BASE[ch];
        const cx = flip ? row.length - 1 - c : c;
        ctx.fillRect(Math.floor(x + cx * px), Math.floor(y + r * px), Math.ceil(px), Math.ceil(px));
      }
    }
  }

  // x, y: linksonder van de ridder op het scherm. act: 0 staan, 1 lopen, 2 in de lucht, 3 geraakt.
  // Met een eigen ridder (av) tekenen we die, in de stijl van de riddermaker.
  function knight(ctx, x, y, w, h, color, face, act, t, alpha = 1, av = null) {
    const px = w / 12;
    if (av && typeof Avatar !== 'undefined') {
      // De eigen ridder in de nieuwe tekenstijl: wiebelt bij het lopen en kantelt in de lucht.
      const img = Avatar.sprite(av, { k: 8 });
      const hgt = w * 17 / 12;
      const bob = act === 1 ? Math.abs(Math.sin(t * 14)) * px * .8 : 0;
      ctx.save();
      ctx.globalAlpha = alpha * (act === 3 && Math.floor(t * 16) % 2 ? .35 : 1);
      ctx.translate(x + w / 2, y - bob);
      if (face < 0) ctx.scale(-1, 1);
      if (act === 2) ctx.rotate(.12);
      ctx.drawImage(img, -w / 2, -hgt, w, hgt);
      ctx.restore();
      return;
    }
    const map = KNIGHT.slice();
    if (act === 1 && Math.floor(t * 10) % 2) map.splice(12, 4, ...LEGS_RUN);
    if (act === 2) map.splice(12, 4, ...LEGS_AIR);
    ctx.save();
    ctx.globalAlpha = alpha * (act === 3 && Math.floor(t * 16) % 2 ? .35 : 1);
    pixels(ctx, map, x, y - px * 16, px, { C: color }, face < 0);
    ctx.restore();
  }

  function princess(ctx, x, y, w, t) {
    if (ART.prinses) {
      const img = ART.prinses, pw = w * 1.7, ph = pw * img.height / img.width;
      ctx.drawImage(img, x + w / 2 - pw / 2, y - ph + Math.sin(t * 3) * w * .02, pw, ph);
      return;
    }
    const px = w / 12;
    const bob = Math.sin(t * 3) * px * .6;
    pixels(ctx, PRINCESS, x, y - px * 16 + bob, px, {}, false);
  }

  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d);
    return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
  }


  // ---------- Sfeer per zone ----------
  const LOOK = {
    kerker: { sky: ['#12030a', '#3a0d08', '#8a2a0c'], glow: '#ff6a1a', glow2: '#ff3d5a', accent: '#ff8a3d', brick: [70, 44, 40], mortar: '#170907', flame: ['#ff9a3a', '#fff0b0'] },
    storm: { sky: ['#05031a', '#1c1450', '#3a2a7a'], glow: '#b37bff', glow2: '#5e7bff', accent: '#c39bff', brick: [50, 54, 78], mortar: '#0b0c18', flame: ['#b37bff', '#f0e4ff'] },
    neon: { sky: ['#010610', '#06284a', '#0b4a78'], glow: '#5ee7ff', glow2: '#ff5fd2', accent: '#5ee7ff', brick: [24, 40, 62], mortar: '#040a14', metal: true, flame: ['#5ee7ff', '#e8fdff'] },
    hemel: { sky: ['#0b1440', '#4a3a8a', '#ffb08a'], glow: '#ffd166', glow2: '#ff9ad5', accent: '#ffd166', brick: [92, 92, 118], mortar: '#2a2a3c', open: true, flame: ['#ffd166', '#fffbe0'] },
  };
  const lookOf = (world, i) => LOOK[world.zones[i].key];

  function seeded(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Een zachte lichtvlek, één keer getekend en daarna alleen nog gekopieerd (veel lichter dan shadowBlur).
  const glows = new Map();
  function glowSprite(color) {
    if (!glows.has(color)) {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, color);
      gr.addColorStop(.35, color + '88');
      gr.addColorStop(1, color + '00');
      g.fillStyle = gr;
      g.fillRect(0, 0, 128, 128);
      glows.set(color, c);
    }
    return glows.get(color);
  }
  function glow(ctx, x, y, r, color, alpha = 1) {
    if (r <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  // ---------- Lucht: één keer per zone en schermgrootte getekend ----------
  const skies = new Map();
  let artVer = 0;
  onArt.push(() => { skies.clear(); tiles.clear(); chunks.clear(); artVer++; });
  function skyCanvas(key, w, h) {
    const id = `${key}:${w}x${h}`;
    if (skies.has(id)) return skies.get(id);
    if (skies.size > 8) skies.clear();
    const L = LOOK[key];
    const c = document.createElement('canvas');
    const H = Math.round(h * 1.4);
    c.width = w;
    c.height = H;
    const g = c.getContext('2d');
    const paint = ART['lucht-' + key];
    if (paint) {
      // Het schilderij vult de hele lucht (bijsnijden waar nodig).
      const f = Math.max(w / paint.width, H / paint.height);
      g.drawImage(paint, (w - paint.width * f) / 2, (H - paint.height * f) / 2, paint.width * f, paint.height * f);
      skies.set(id, c);
      return c;
    }
    const r = seeded(key.length * 7919 + 3);
    const u = Math.min(w, h);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, L.sky[0]);
    gr.addColorStop(.55, L.sky[1]);
    gr.addColorStop(1, L.sky[2]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, H);
    for (let i = 0; i < 7; i++) glow(g, r() * w, r() * H * .8, u * (.2 + r() * .35), i % 3 ? L.glow : L.glow2, .1 + r() * .1);
    for (let i = 0; i < Math.round(w * H / 5000); i++) {
      g.fillStyle = `rgba(255,255,255,${.25 + r() * .75})`;
      const s = r() < .1 ? 2.2 : 1.2;
      g.fillRect(r() * w, r() * H * .85, s, s);
    }
    // Maan, planeet of zon.
    const mx = w * .78;
    const my = H * .2;
    const mr = u * (key === 'hemel' ? .1 : .085);
    glow(g, mx, my, mr * 4, L.glow, .5);
    const mg = g.createRadialGradient(mx - mr * .4, my - mr * .4, mr * .1, mx, my, mr);
    mg.addColorStop(0, '#fff6e6');
    mg.addColorStop(.55, L.accent);
    mg.addColorStop(1, key === 'hemel' ? '#ff9a5a' : '#1a0a20');
    g.fillStyle = mg;
    g.beginPath();
    g.arc(mx, my, mr, 0, Math.PI * 2);
    g.fill();
    if (key === 'neon' || key === 'storm') {
      g.save();
      g.translate(mx, my);
      g.rotate(-.35);
      g.strokeStyle = L.accent;
      g.globalAlpha = .7;
      g.lineWidth = Math.max(2, u * .006);
      g.beginPath();
      g.ellipse(0, 0, mr * 1.9, mr * .45, 0, Math.PI * .05, Math.PI * .95, true);
      g.stroke();
      g.restore();
    }
    // Verre wereld onderaan: drie lagen, hoe dichter hoe donkerder.
    const darks = { kerker: ['#2a0c10', '#1a070c', '#0c0306'], storm: ['#1a1440', '#120d2c', '#08061a'], neon: ['#06203a', '#041628', '#020a14'], hemel: ['#ffd8e0', '#f6c6e6', '#e8b0dc'] }[key];
    for (let layer = 0; layer < 3; layer++) {
      const base = H * (.78 + layer * .08);
      g.fillStyle = darks[layer];
      if (key === 'hemel') {
        // Wolkenzee.
        g.globalAlpha = .55 + layer * .15;
        for (let x = -40; x < w + 40; x += 40 + r() * 50) {
          g.beginPath();
          g.ellipse(x, base, 50 + r() * 60, 22 + r() * 26, 0, 0, Math.PI * 2);
          g.fill();
        }
        g.fillRect(0, base, w, H - base);
        g.globalAlpha = 1;
        continue;
      }
      g.beginPath();
      g.moveTo(0, H);
      g.lineTo(0, base);
      let x = 0;
      while (x < w) {
        x += 18 + r() * 40;
        if (key === 'neon') {
          // Stad met torens.
          const bh = u * (.05 + r() * .18) * (1 - layer * .25);
          g.lineTo(x, base - bh);
          x += 14 + r() * 30;
          g.lineTo(x, base - bh);
          g.lineTo(x, base);
        } else {
          g.lineTo(x, base - r() * u * .14 * (1 - layer * .3));
        }
      }
      g.lineTo(w, H);
      g.fill();
      // Lichtjes en kasteeltorens.
      for (let k = 0; k < (key === 'neon' ? 40 : 3 - layer); k++) {
        if (key === 'neon') {
          g.fillStyle = r() < .3 ? L.glow2 : L.glow;
          g.globalAlpha = .5 + r() * .5;
          g.fillRect(r() * w, base - r() * u * .14, 2, 3);
          g.globalAlpha = 1;
          continue;
        }
        const tx = r() * w;
        const th = u * (.12 + r() * .14);
        const tw = u * (.025 + r() * .02);
        g.fillStyle = darks[layer];
        g.fillRect(tx, base - th, tw, th + 10);
        g.beginPath();
        g.moveTo(tx - tw * .3, base - th);
        g.lineTo(tx + tw / 2, base - th - tw * 1.6);
        g.lineTo(tx + tw * 1.3, base - th);
        g.fill();
        g.fillStyle = L.glow;
        for (let wi = 0; wi < 3; wi++) g.fillRect(tx + tw / 2 - 1.5, base - th + 10 + wi * tw * .9, 3, 6);
        glow(g, tx + tw / 2, base - th - tw * 1.6, tw * 1.5, L.glow, .7);
      }
    }
    if (key === 'kerker') {
      // Vulkaan met gloed.
      glow(g, w * .2, H * .8, u * .35, '#ff5a1a', .6);
      glow(g, w * .2, H * .8, u * .12, '#ffd27a', .7);
    }
    if (key === 'kerker' || key === 'storm') dragon(g, w * .28, H * .42, u * .0028);
    skies.set(id, c);
    return c;
  }

  function dragon(g, x, y, s) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    g.fillStyle = '#0a0512';
    g.beginPath();
    g.moveTo(-140, 10);
    g.quadraticCurveTo(-60, -10, 0, 0);
    g.quadraticCurveTo(40, -5, 70, -20);
    g.lineTo(95, -24);
    g.lineTo(80, -12);
    g.quadraticCurveTo(50, 10, 10, 18);
    g.quadraticCurveTo(-60, 26, -140, 10);
    g.fill();
    g.beginPath();
    g.moveTo(-20, 0);
    g.lineTo(-70, -110);
    g.lineTo(-40, -80);
    g.lineTo(-10, -120);
    g.lineTo(5, -80);
    g.lineTo(40, -105);
    g.lineTo(25, 0);
    g.fill();
    g.restore();
    glow(g, x + 90 * s, y - 22 * s, 12 * s * 3, '#ff3d3d', .9);
  }

  // Bewegende extra's in de lucht: gloeiende vonken, bliksem en regen, zoeklichten of wolken.
  function skyFx(ctx, key, w, h, t) {
    const L = LOOK[key];
    if (key === 'kerker') {
      for (let i = 0; i < 28; i++) {
        const sp = 30 + hash(i * 3) * 50;
        const y = h - ((t * sp + hash(i) * h * 1.2) % (h * 1.2));
        const x = hash(i * 7) * w + Math.sin(t + i) * 12;
        ctx.globalAlpha = .4 + .6 * hash(i * 11);
        ctx.fillStyle = i % 3 ? '#ffb347' : '#ffe08a';
        ctx.fillRect(x, y, 2.5, 2.5);
      }
      ctx.globalAlpha = 1;
    } else if (key === 'storm') {
      ctx.strokeStyle = 'rgba(200, 190, 255, .28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 60; i++) {
        const x = (hash(i) * w + t * 120) % (w + 40) - 20;
        const y = (hash(i * 5) * h + t * 700) % h;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 5, y + 16);
      }
      ctx.stroke();
      const n = Math.floor(t / 6.3);
      const ph = t - n * 6.3;
      if (ph < .22) {
        ctx.fillStyle = `rgba(220, 200, 255, ${.18 * (1 - ph / .22)})`;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#f0e6ff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let x = w * (.2 + hash(n) * .6);
        let y = 0;
        ctx.moveTo(x, y);
        let i = 0;
        while (y < h * .6) {
          x += (hash(n * 31 + i++) - .5) * 60;
          y += 25 + hash(n * 17 + i) * 25;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
        glow(ctx, x, y * .5, w * .3, '#c9a8ff', .35);
      }
    } else if (key === 'neon') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const a = Math.sin(t * .5 + i * 2) * .5 - Math.PI / 2;
        const bx = w * (.25 + i * .5);
        ctx.fillStyle = i ? 'rgba(255, 95, 210, .07)' : 'rgba(94, 231, 255, .08)';
        ctx.beginPath();
        ctx.moveTo(bx, h);
        ctx.lineTo(bx + Math.cos(a - .08) * h * 1.4, h + Math.sin(a - .08) * h * 1.4);
        ctx.lineTo(bx + Math.cos(a + .08) * h * 1.4, h + Math.sin(a + .08) * h * 1.4);
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255, 240, 250, .35)';
      for (let i = 0; i < 6; i++) {
        const cw = w * (.12 + hash(i) * .12);
        const x = ((hash(i * 3) * w + t * (8 + i * 3)) % (w + cw * 2)) - cw;
        const y = h * (.15 + hash(i * 9) * .6);
        ctx.beginPath();
        ctx.ellipse(x, y, cw, cw * .18, 0, 0, Math.PI * 2);
        ctx.ellipse(x + cw * .3, y - cw * .1, cw * .5, cw * .16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    void L;
  }

  // ---------- Muurtegels: één keer per zone en zoomniveau ----------
  const tiles = new Map();
  const TILE = { w: 208, h: 104 };
  function wallPattern(ctx, key, scale) {
    const id = `${key}:${Math.round(scale * 100)}`;
    if (!tiles.has(id) && ART['muur-' + key]) {
      if (tiles.size > 12) tiles.clear();
      const c = document.createElement('canvas');
      c.width = c.height = Math.max(8, Math.round(TILE.w * 1.25 * scale));
      c.getContext('2d').drawImage(ART['muur-' + key], 0, 0, c.width, c.height);
      tiles.set(id, ctx.createPattern(c, 'repeat'));
    }
    if (!tiles.has(id)) {
      if (tiles.size > 12) tiles.clear();
      const L = LOOK[key];
      const c = document.createElement('canvas');
      c.width = Math.max(8, Math.round(TILE.w * scale));
      c.height = Math.max(8, Math.round(TILE.h * scale));
      const g = c.getContext('2d');
      const sx = c.width / TILE.w;
      const sy = c.height / TILE.h;
      g.fillStyle = L.mortar;
      g.fillRect(0, 0, c.width, c.height);
      const [R, G, B] = L.brick;
      if (L.metal) {
        // Metalen panelen met klinknagels en dunne neonlijnen.
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            const v = hash(row * 13 + col * 5 + 1) * 12;
            const x = col * 104 * sx;
            const y = row * 52 * sy;
            g.fillStyle = `rgb(${R + v},${G + v},${B + v})`;
            g.fillRect(x + 2 * sx, y + 2 * sy, 100 * sx, 48 * sy);
            g.fillStyle = 'rgba(255,255,255,.06)';
            g.fillRect(x + 2 * sx, y + 2 * sy, 100 * sx, 3 * sy);
            g.fillStyle = 'rgba(0,0,0,.3)';
            g.fillRect(x + 2 * sx, y + 46 * sy, 100 * sx, 4 * sy);
            g.fillStyle = '#5a7090';
            for (const [rx, ry] of [[7, 7], [95, 7], [7, 43], [95, 43]]) g.fillRect(x + rx * sx, y + ry * sy, 2.5 * sx, 2.5 * sy);
            if ((row + col) % 2) {
              g.fillStyle = 'rgba(94, 231, 255, .35)';
              g.fillRect(x + 20 * sx, y + 25 * sy, 64 * sx, 1.5 * sy);
            }
          }
        }
      } else {
        // Stenen in verband, elk net iets anders van kleur, hier en daar een barst of een gloeiende rune.
        const bw = 52;
        const bh = 26;
        for (let row = 0; row < 4; row++) {
          for (let col = -1; col < 4; col++) {
            const v = hash(row * 31 + col * 7 + key.length);
            const x = (col * bw + (row % 2 ? bw / 2 : 0)) * sx;
            const y = row * bh * sy;
            const d = Math.floor(v * 22) - 8;
            g.fillStyle = `rgb(${R + d},${G + d},${B + d})`;
            g.fillRect(x + 1.5 * sx, y + 1.5 * sy, (bw - 3) * sx, (bh - 3) * sy);
            g.fillStyle = 'rgba(255,255,255,.07)';
            g.fillRect(x + 1.5 * sx, y + 1.5 * sy, (bw - 3) * sx, 3 * sy);
            g.fillStyle = 'rgba(0,0,0,.28)';
            g.fillRect(x + 1.5 * sx, y + (bh - 5) * sy, (bw - 3) * sx, 3.5 * sy);
            if (v > .85) {
              g.strokeStyle = 'rgba(0,0,0,.55)';
              g.lineWidth = Math.max(1, sx);
              g.beginPath();
              g.moveTo(x + 10 * sx, y + 4 * sy);
              g.lineTo(x + 20 * sx, y + 13 * sy);
              g.lineTo(x + 16 * sx, y + 22 * sy);
              g.stroke();
            }
            if (v < .05) {
              g.fillStyle = L.accent;
              g.globalAlpha = .55;
              g.fillRect(x + 22 * sx, y + 8 * sy, 8 * sx, 1.5 * sy);
              g.fillRect(x + 25 * sx, y + 5 * sy, 1.5 * sx, 14 * sy);
              g.globalAlpha = 1;
            }
          }
        }
      }
      tiles.set(id, ctx.createPattern(c, 'repeat'));
    }
    return tiles.get(id);
  }

  // Openingen in de muur (ramen, gaten), in wereldmaten. Elke 320 eenheden een nieuw stuk muur.
  const SEG = 320;
  function holes(key, k, W) {
    const left = k % 2 === 0;
    if (key === 'kerker') return [{ type: 'arch', x: left ? 34 : W - 154, y: k * SEG + 120, w: 120, h: 170 }];
    if (key === 'neon') return [{ type: 'rect', x: left ? 40 : W - 180, y: k * SEG + 110, w: 140, h: 150 }];
    if (key === 'storm') return [{ type: 'rag', x: left ? 20 : W - 220, y: k * SEG + 60, w: 200, h: 220, k }];
    return [];
  }
  function holePath(path, hole, X, Y, scale) {
    const x = X(hole.x);
    const yb = Y(hole.y);
    const w = hole.w * scale;
    const h = hole.h * scale;
    if (hole.type === 'arch') {
      path.moveTo(x, yb);
      path.lineTo(x, yb - h + w / 2);
      path.arc(x + w / 2, yb - h + w / 2, w / 2, Math.PI, 0);
      path.lineTo(x + w, yb);
      path.closePath();
    } else if (hole.type === 'rect') {
      path.rect(x, yb - h, w, h);
    } else {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = .7 + hash(hole.k * 19 + i) * .3;
        const px = x + w / 2 + Math.cos(a) * w / 2 * rr;
        const py = yb - h / 2 + Math.sin(a) * h / 2 * rr;
        if (i) path.lineTo(px, py); else path.moveTo(px, py);
      }
      path.closePath();
    }
  }

  function torch(ctx, x, y, s, L, t, k) {
    if (ART.fakkel) {
      const f = 1 + Math.sin(t * 13 + k * 3) * .12 + Math.sin(t * 7.3 + k) * .08;
      glow(ctx, x, y - 14 * s, 42 * s * f, L.flame[0], .5);
      const img = ART.fakkel, th = 44 * s, tw = th * img.width / img.height;
      ctx.drawImage(img, x - tw / 2, y - th * .55, tw, th);
      return;
    }
    ctx.fillStyle = '#2a2230';
    ctx.fillRect(x - 3 * s, y, 6 * s, 18 * s);
    ctx.fillStyle = '#6b6b7a';
    ctx.fillRect(x - 7 * s, y - 2 * s, 14 * s, 4 * s);
    const f = 1 + Math.sin(t * 13 + k * 3) * .12 + Math.sin(t * 7.3 + k) * .08;
    glow(ctx, x, y - 10 * s, 42 * s * f, L.flame[0], .55);
    ctx.fillStyle = L.flame[0];
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - 2 * s);
    ctx.quadraticCurveTo(x - 9 * s, y - 16 * s * f, x, y - 28 * s * f);
    ctx.quadraticCurveTo(x + 9 * s, y - 15 * s * f, x + 7 * s, y - 2 * s);
    ctx.fill();
    ctx.fillStyle = L.flame[1];
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, y - 2 * s);
    ctx.quadraticCurveTo(x - 4 * s, y - 9 * s, x, y - 16 * s * f);
    ctx.quadraticCurveTo(x + 4 * s, y - 8 * s, x + 3 * s, y - 2 * s);
    ctx.fill();
  }

  function banner(ctx, x, y, s, color) {
    if (ART.banier) {
      const img = ART.banier, bh = 74 * s, bw = bh * img.width / img.height;
      ctx.drawImage(img, x - bw / 2, y - 3 * s, bw, bh);
      return;
    }
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(x - 20 * s, y - 2 * s, 40 * s, 4 * s);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - 16 * s, y);
    ctx.lineTo(x + 16 * s, y);
    ctx.lineTo(x + 16 * s, y + 70 * s);
    ctx.lineTo(x, y + 58 * s);
    ctx.lineTo(x - 16 * s, y + 70 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(x + 7 * s, y, 9 * s, 68 * s);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(x, y + 16 * s);
    ctx.lineTo(x + 8 * s, y + 28 * s);
    ctx.lineTo(x, y + 40 * s);
    ctx.lineTo(x - 8 * s, y + 28 * s);
    ctx.fill();
  }

  function vine(ctx, x, y, len, s, k) {
    ctx.strokeStyle = '#2f6b3a';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < len; i += 10) ctx.lineTo(x + Math.sin(i / 14 + k) * 6 * s, y + i * s);
    ctx.stroke();
    for (let i = 8; i < len; i += 16) {
      ctx.fillStyle = (i / 16) % 2 < 1 ? '#4caf50' : '#7bdc6a';
      ctx.beginPath();
      ctx.ellipse(x + (Math.sin(i / 14 + k) * 6 + ((i / 16) % 2 < 1 ? 6 : -6)) * s, y + i * s, 6 * s, 3 * s, .6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------- Platforms ----------
  function platform(ctx, p, x, y, w, s, L, world, t, rail) {
    const kind = p.kind || 'stone';
    const top = p.floor === world.FLOORS;
    if (kind === 'hover' || kind === 'lift') {
      const h = 13 * s;
      // Rail die toont waar het platform heen gaat.
      ctx.fillStyle = L.accent;
      ctx.globalAlpha = .28;
      if (p.move) ctx.fillRect(x - rail.dx - p.move.amp * s, y + h / 2 - 1 * s, w + p.move.amp * 2 * s, 2 * s);
      if (p.lift) {
        ctx.fillRect(x + 6 * s, rail.y0, 2 * s, rail.y1 - rail.y0);
        ctx.fillRect(x + w - 8 * s, rail.y0, 2 * s, rail.y1 - rail.y0);
      }
      ctx.globalAlpha = 1;
      glow(ctx, x + w / 2, y + 22 * s, w * .55, L.glow, .45);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const tx of [x + 14 * s, x + w - 14 * s]) {
        const len = (26 + Math.sin(t * 30 + tx) * 5) * s;
        ctx.fillStyle = L.glow + '99';
        ctx.beginPath();
        ctx.moveTo(tx - 6 * s, y + h);
        ctx.lineTo(tx + 6 * s, y + h);
        ctx.lineTo(tx, y + h + len);
        ctx.fill();
        ctx.fillStyle = '#ffffffaa';
        ctx.beginPath();
        ctx.moveTo(tx - 2.5 * s, y + h);
        ctx.lineTo(tx + 2.5 * s, y + h);
        ctx.lineTo(tx, y + h + len * .5);
        ctx.fill();
      }
      ctx.restore();
      if (ART.zweef) {
        const img = ART.zweef, ph = w * .42 * img.height / img.width;
        ctx.drawImage(img, x - 3 * s, y - 4 * s, w + 6 * s, Math.min(ph, 34 * s));
      } else {
      ctx.fillStyle = '#3a4a6c';
      ctx.beginPath();
      ctx.moveTo(x + 8 * s, y);
      ctx.lineTo(x + w - 8 * s, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w - 8 * s, y + h);
      ctx.lineTo(x + 8 * s, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.fill();
      ctx.fillStyle = '#c8d8f4';
      ctx.fillRect(x + 6 * s, y, w - 12 * s, 3 * s);
      ctx.fillStyle = L.glow;
      ctx.fillRect(x + 12 * s, y + h / 2 - 1 * s, w - 24 * s, 2 * s);
      }
      // Pijltjes: op en neer of heen en weer.
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = .85;
      const cx = x + w / 2;
      const cy = y + h / 2;
      const a = 4 * s;
      ctx.beginPath();
      if (p.lift) {
        ctx.moveTo(cx - a, cy - 1 * s); ctx.lineTo(cx, cy - a - 2 * s); ctx.lineTo(cx + a, cy - 1 * s);
        ctx.moveTo(cx - a, cy + 1 * s); ctx.lineTo(cx, cy + a + 2 * s); ctx.lineTo(cx + a, cy + 1 * s);
      } else {
        ctx.moveTo(cx - 6 * s, cy - a); ctx.lineTo(cx - 6 * s - a - 2 * s, cy); ctx.lineTo(cx - 6 * s, cy + a);
        ctx.moveTo(cx + 6 * s, cy - a); ctx.lineTo(cx + 6 * s + a + 2 * s, cy); ctx.lineTo(cx + 6 * s, cy + a);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    if (kind === 'ice' && ART.ijs) {
      glow(ctx, x + w / 2, y + 6 * s, w * .5, '#8fe3ff', .25);
      ctx.drawImage(ART.ijs, x - 2 * s, y - 3 * s, w + 4 * s, 20 * s);
      return;
    }
    if (kind === 'ice') {
      const h = 15 * s;
      glow(ctx, x + w / 2, y + 6 * s, w * .5, '#8fe3ff', .25);
      ctx.fillStyle = '#4aa8d8';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#9fe8ff';
      ctx.fillRect(x, y, w, h * .55);
      ctx.fillStyle = '#f2fdff';
      ctx.fillRect(x, y, w, 3 * s);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fillRect(x + w * .12, y + 5 * s, w * .25, 1.5 * s);
      ctx.fillStyle = '#bff1ff';
      for (let i = 8; i < p.w - 4; i += 14) {
        const l = (6 + hash(p.floor * 41 + i) * 18) * s;
        ctx.beginPath();
        ctx.moveTo(x + (i - 4) * s, y + h);
        ctx.lineTo(x + (i + 4) * s, y + h);
        ctx.lineTo(x + i * s, y + h + l);
        ctx.fill();
      }
      return;
    }
    // Steen (ook de vloer en het bovenste platform).
    const th = (p.floor === 0 ? 40 : 18) * s;
    if (ART.steen && p.floor !== 0 && !top) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(x + 5 * s, y + th, w - 5 * s, 7 * s);
      ctx.drawImage(ART.steen, x - 2 * s, y - 2 * s, w + 4 * s, th + 6 * s);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(x + 5 * s, y + th, w - 5 * s, 7 * s);
    ctx.fillStyle = top ? '#6a5320' : '#34324a';
    ctx.fillRect(x, y, w, th);
    ctx.fillStyle = top ? '#b8922e' : '#5c5a76';
    ctx.fillRect(x, y, w, th * .45);
    ctx.fillStyle = top ? '#ffe08a' : '#a9a6c6';
    ctx.fillRect(x, y, w, 3 * s);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    for (let bx = 28; bx < p.w; bx += 30) ctx.fillRect(x + bx * s, y + 4 * s, Math.max(1, 1.2 * s), th - 4 * s);
    if (!top && L !== LOOK.neon && L !== LOOK.hemel) {
      for (let i = 4; i < p.w - 6; i += 9) {
        const v = hash(p.floor * 97 + i);
        if (v < .45) continue;
        ctx.fillStyle = v < .7 ? '#3f8f46' : '#6fcf5f';
        ctx.fillRect(x + i * s, y - 1.5 * s, 6 * s, 3 * s);
        if (v > .92) ctx.fillRect(x + (i + 2) * s, y + th, 2 * s, (5 + v * 10) * s);
      }
    }
    ctx.fillStyle = top ? '#ffd166' : L.accent;
    ctx.globalAlpha = .85;
    ctx.fillRect(x, y + th - 2 * s, w, 1.5 * s);
    ctx.globalAlpha = 1;
  }

  function springPad(ctx, x, y, s, t) {
    const pulse = .7 + Math.sin(t * 6) * .3;
    glow(ctx, x, y - 8 * s, 40 * s * pulse, '#ff5fd2', .8);
    if (ART.veer) {
      const sq = 1 - Math.max(0, Math.sin(t * 6)) * .12, ph = 26 * s * sq;
      ctx.drawImage(ART.veer, x - 13 * s, y - ph, 26 * s, ph);
      return;
    }
    ctx.fillStyle = '#ff5fd2';
    ctx.beginPath();
    ctx.moveTo(x - 12 * s, y);
    ctx.lineTo(x, y - 18 * s);
    ctx.lineTo(x + 12 * s, y);
    ctx.fill();
    ctx.fillStyle = '#ffd0f4';
    ctx.beginPath();
    ctx.moveTo(x - 4 * s, y - 3 * s);
    ctx.lineTo(x, y - 14 * s);
    ctx.lineTo(x + 1.5 * s, y - 3 * s);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 160, 230, ${pulse})`;
    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 2; i++) {
      const cy = y - (26 + i * 8 + (t * 20) % 8) * s;
      ctx.beginPath();
      ctx.moveTo(x - 6 * s, cy + 4 * s);
      ctx.lineTo(x, cy);
      ctx.lineTo(x + 6 * s, cy + 4 * s);
      ctx.stroke();
    }
  }

  function spikes(ctx, x, y, w, s) {
    glow(ctx, x + w / 2, y - 6 * s, w * .8, '#ff3d5a', .35);
    if (ART.stekels) {
      const img = ART.stekels, n = Math.max(1, Math.round(w / (40 * s))), sw = w / n, sh = sw * img.height / img.width;
      for (let i = 0; i < n; i++) ctx.drawImage(img, x + i * sw, y - sh + 1 * s, sw, sh);
      return;
    }
    const n = Math.max(3, Math.round(w / (9 * s)));
    const sw = w / n;
    for (let i = 0; i < n; i++) {
      const sx = x + i * sw;
      ctx.fillStyle = '#c8cde0';
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + sw / 2, y - 15 * s);
      ctx.lineTo(sx + sw, y);
      ctx.fill();
      ctx.fillStyle = '#ff3d5a';
      ctx.beginPath();
      ctx.moveTo(sx + sw * .3, y - 9 * s);
      ctx.lineTo(sx + sw / 2, y - 15 * s);
      ctx.lineTo(sx + sw * .7, y - 9 * s);
      ctx.fill();
    }
  }

  // De lucht staat op twee eigen canvassen achter het spelcanvas (de tweede voor de overgang naar de volgende zone).
  function backdrop(canvas, key, f, nextKey, fade) {
    let bd = canvas._backdrop;
    if (!bd) {
      const parent = canvas.parentElement;
      parent.style.isolation = 'isolate';
      parent.style.overflow = 'hidden';
      const make = () => {
        const c = document.createElement('canvas');
        c.style.cssText = 'position:absolute;left:0;top:0;right:auto;bottom:auto;width:100%;height:140%;z-index:-1;pointer-events:none';
        parent.insertBefore(c, canvas);
        return c;
      };
      bd = canvas._backdrop = [make(), make()];
    }
    const w = canvas.width;
    const h = canvas.height;
    const cssH = canvas.clientHeight || h;
    const paint = (el, k) => {
      const id = `${k}:${w}x${h}:${artVer}`;
      if (el._id === id) return;
      el._id = id;
      const sky = skyCanvas(k, w, h);
      el.width = sky.width;
      el.height = sky.height;
      el.getContext('2d').drawImage(sky, 0, 0);
    };
    paint(bd[0], key);
    // Alleen bijwerken als de lucht echt verschuift (scheelt werk voor de browser).
    const shift = Math.round(-.4 * (1 - f) * cssH);
    if (bd[0]._shift !== shift) {
      bd[0]._shift = shift;
      bd[0].style.transform = `translateY(${shift}px)`;
    }
    if (nextKey) {
      paint(bd[1], nextKey);
      bd[1].style.transform = `translateY(${(-.4 * cssH).toFixed(1)}px)`;
    }
    const op = nextKey ? fade.toFixed(2) : '0';
    if (bd[1].style.opacity !== op) {
      bd[1].style.opacity = op;
      bd[1].style.display = nextKey ? '' : 'none';
    }
  }

  // Eén stuk achtermuur (320 hoog), met ramen, versiering en schaduw. Doorzichtig waar je de lucht ziet.
  const chunks = new Map();
  function wallChunk(world, k, s) {
    const id = `${world.seed}:${k}:${Math.round(s * 1000)}`;
    if (chunks.has(id)) return chunks.get(id);
    if (chunks.size >= 8) chunks.delete(chunks.keys().next().value);
    const W = world.W;
    const y0 = k * SEG;
    const y1 = y0 + SEG;
    let c = null;
    for (const zone of world.zones) {
      const L = LOOK[zone.key];
      if (L.open || zone.y1 <= y0 || zone.y0 >= y1) continue;
      if (!c) {
        c = document.createElement('canvas');
        c.width = Math.ceil(W * s);
        c.height = Math.ceil(SEG * s);
      }
      const g = c.getContext('2d');
      const X = wx => wx * s;
      const sy = wy => (y1 - wy) * s;
      const yTop = sy(Math.min(zone.y1, y1));
      const yBot = sy(Math.max(zone.y0, y0));
      const path = new Path2D();
      path.rect(0, yTop, c.width, yBot - yTop);
      const list = [];
      // Ramen van dit stuk en het stuk eronder (die kunnen tot hier reiken).
      for (const kk of [k - 1, k]) {
        if (kk < 1) continue;
        for (const hole of holes(zone.key, kk, W)) {
          if (hole.y < zone.y0 + 30 || hole.y + hole.h > zone.y1 - 30) continue;
          holePath(path, hole, X, sy, s);
          list.push(hole);
        }
      }
      const pat = wallPattern(g, zone.key, s);
      if (pat.setTransform) pat.setTransform(new DOMMatrix([1, 0, 0, 1, 0, sy(0)]));
      g.save();
      g.beginPath();
      g.rect(0, yTop, c.width, yBot - yTop);
      g.clip();
      g.fillStyle = pat;
      g.fill(path, 'evenodd');
      for (const hole of list) {
        const hp = new Path2D();
        holePath(hp, hole, X, sy, s);
        g.lineWidth = 7 * s;
        g.strokeStyle = 'rgba(0,0,0,.5)';
        g.stroke(hp);
        g.globalAlpha = .6;
        g.lineWidth = 2 * s;
        g.strokeStyle = L.accent;
        g.stroke(hp);
        if (hole.type === 'rect') {
          g.globalAlpha = .5;
          g.fillStyle = L.accent;
          g.fillRect(X(hole.x + hole.w / 2) - 1, sy(hole.y + hole.h), 2, hole.h * s);
          g.fillRect(X(hole.x), sy(hole.y + hole.h / 2) - 1, hole.w * s, 2);
        }
        g.globalAlpha = 1;
      }
      // Versiering: banieren, klimop, neontekens.
      for (const kk of [k - 1, k]) {
        if (kk < 1) continue;
        const left = kk % 2 === 0;
        if (zone.key === 'kerker' && kk % 3 === 1) banner(g, X(W / 2 + (left ? 40 : -40)), sy(kk * SEG + 300), s, kk % 2 ? '#b8222a' : '#1c4aa8');
        if ((zone.key === 'kerker' || zone.key === 'storm') && hash(kk * 7) < .6) vine(g, X(left ? W - 18 : 18), sy(kk * SEG + 310), 160 + hash(kk) * 120, s, kk);
        if (zone.key === 'neon') {
          const nx = X(W / 2);
          const ny = sy(kk * SEG + 250);
          glow(g, nx, ny, 50 * s, L.glow2, .4);
          g.strokeStyle = L.glow2;
          g.lineWidth = 2 * s;
          g.beginPath();
          g.arc(nx, ny, 16 * s, 0, Math.PI * 2);
          g.moveTo(nx, ny - 10 * s);
          g.lineTo(nx, ny + 10 * s);
          g.moveTo(nx - 8 * s, ny - 2 * s);
          g.lineTo(nx + 8 * s, ny - 2 * s);
          g.stroke();
        }
      }
      // Schaduw langs de zijkanten.
      const sh = g.createLinearGradient(0, 0, c.width, 0);
      sh.addColorStop(0, 'rgba(0,0,0,.55)');
      sh.addColorStop(.12, 'rgba(0,0,0,0)');
      sh.addColorStop(.88, 'rgba(0,0,0,0)');
      sh.addColorStop(1, 'rgba(0,0,0,.55)');
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = sh;
      g.fillRect(0, yTop, c.width, yBot - yTop);
      g.restore();
    }
    chunks.set(id, c);
    return c;
  }

  // Tekent de toren tussen wereldhoogte cam.y (onderkant scherm) en cam.y + H / scale.
  // ox: linkerrand van de toren op het scherm.
  function scene(ctx, world, cam, t) {
    const { scale: s, H, ox } = cam;
    const W = world.W;
    const CW = ctx.canvas.width;
    const sy = wy => H - (wy - cam.y) * s;
    const X = wx => ox + wx * s;
    const top = cam.y + H / s;
    const bottom = cam.y;
    const mid = (top + bottom) / 2;

    // 1. Lucht van de zone: een aparte laag achter het spel, die de browser niet elke keer opnieuw hoeft te tekenen.
    const zi = Toren.zoneAt(world, mid);
    const z = world.zones[zi];
    const f = Math.max(0, Math.min(1, (mid - Math.max(0, z.y0)) / (Math.min(z.y1, world.top) - Math.max(0, z.y0))));
    const next = world.zones[zi + 1];
    const fade = next ? Math.max(0, Math.min(1, (mid - (z.y1 - 260)) / 260)) : 0;
    backdrop(ctx.canvas, z.key, f, next && fade > 0 ? next.key : null, fade);
    ctx.clearRect(0, 0, CW, H);
    skyFx(ctx, z.key, CW, H, t);

    // 2. Achtermuur met ramen en gaten: per stuk van 320 hoog één keer getekend en daarna gekopieerd.
    const k0 = Math.max(0, Math.floor(bottom / SEG));
    for (let k = k0; k * SEG < top; k++) {
      const chunk = wallChunk(world, k, s);
      if (chunk) ctx.drawImage(chunk, Math.round(X(0)), Math.round(sy((k + 1) * SEG)));
      // Fakkels flakkeren, dus die tekenen we telkens opnieuw.
      const ty = k * SEG + 200;
      const zone = world.zones[Toren.zoneAt(world, ty)];
      if (k >= 1 && !LOOK[zone.key].open && ty > zone.y0 && ty < zone.y1) torch(ctx, X(k % 2 === 0 ? W - 50 : 50), sy(ty), s, LOOK[zone.key], t, k);
    }
    // In de Hemelspits drijven kristallen in de lucht.
    const hz = world.zones[3];
    if (hz && hz.y0 < top) {
      for (let k = Math.max(0, Math.floor(Math.max(bottom, hz.y0) / 260)); k * 260 < top + 100; k++) {
        const cx = X(30 + hash(k * 5) * (W - 60));
        const cy = sy(k * 260 + 120) + Math.sin(t * 1.5 + k) * 6 * s;
        glow(ctx, cx, cy, 34 * s, '#ffd166', .5);
        ctx.fillStyle = k % 2 ? '#ffe7a0' : '#ffd0f4';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 14 * s);
        ctx.lineTo(cx + 6 * s, cy);
        ctx.lineTo(cx, cy + 14 * s);
        ctx.lineTo(cx - 6 * s, cy);
        ctx.fill();
      }
    }

    // 3. Poort tussen de zones: een gloeiende balk met de naam van de zone erboven.
    for (let i = 1; i < world.zones.length; i++) {
      const zz = world.zones[i];
      if (zz.y0 < bottom - 40 || zz.y0 > top + 40) continue;
      const L = LOOK[zz.key];
      const y = sy(zz.y0);
      glow(ctx, X(W / 2), y, W * s * .5, L.glow, .35);
      ctx.fillStyle = L.accent;
      ctx.globalAlpha = .7;
      ctx.fillRect(X(0), y - 1 * s, W * s, 2 * s);
      ctx.globalAlpha = 1;
      ctx.font = `900 ${15 * s}px Cinzel, serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.strokeText(zz.name.toUpperCase(), X(W / 2), y - 8 * s);
      ctx.fillStyle = '#fff';
      ctx.fillText(zz.name.toUpperCase(), X(W / 2), y - 8 * s);
    }

    // 4. Wind, lasers en drones.
    for (const wd of world.winds) {
      if (wd.y > top || wd.y + wd.h < bottom) continue;
      const push = Toren.windAt(world, wd.y + 1, t);
      const k = Math.abs(push) / 120;
      ctx.strokeStyle = `rgba(225, 215, 255, ${.12 + k * .5})`;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const yy = sy(wd.y + 10 + hash(i * 3 + wd.y) * (wd.h - 20));
        const span = W + 120;
        const off = ((t * 260 * wd.dir + i * 97) % span + span) % span - 60;
        const x0 = X(off);
        const len = (30 + k * 50) * s * wd.dir;
        ctx.moveTo(x0, yy);
        ctx.quadraticCurveTo(x0 + len / 2, yy - 4 * s, x0 + len, yy);
      }
      ctx.stroke();
      if (k > .2) {
        ctx.fillStyle = `rgba(240, 230, 255, ${k})`;
        ctx.font = `800 ${14 * s}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(wd.dir > 0 ? '»»»' : '«««', X(wd.dir > 0 ? 24 : W - 24), sy(wd.y + wd.h / 2));
      }
    }
    for (const l of world.lasers) {
      if (l.y < bottom - 20 || l.y > top + 20) continue;
      const st = Toren.laserState(l, t);
      const y = sy(l.y);
      const x1 = X(l.x);
      const x2 = X(l.x + l.w);
      ctx.fillStyle = '#3a4058';
      ctx.fillRect(x1 - 10 * s, y - 9 * s, 10 * s, 18 * s);
      ctx.fillRect(x2, y - 9 * s, 10 * s, 18 * s);
      ctx.fillStyle = '#6a7290';
      ctx.fillRect(x1 - 10 * s, y - 9 * s, 10 * s, 2 * s);
      ctx.fillRect(x2, y - 9 * s, 10 * s, 2 * s);
      // Lampje: groen = je mag erdoor, geel knipperend = hij gaat zo aan, rood = aan.
      ctx.fillStyle = st.on ? '#ff3d5a' : st.warn ? (Math.floor(t * 8) % 2 ? '#ffd166' : '#5a4a20') : '#3ddc84';
      ctx.fillRect(x1 - 4 * s, y - 2.5 * s, 4 * s, 5 * s);
      ctx.fillRect(x2, y - 2.5 * s, 4 * s, 5 * s);
      if (st.on) {
        ctx.fillStyle = 'rgba(255, 61, 90, .22)';
        ctx.fillRect(x1, y - 7 * s, x2 - x1, 14 * s);
        ctx.fillStyle = 'rgba(255, 61, 90, .75)';
        ctx.fillRect(x1, y - 3 * s, x2 - x1, 6 * s);
        ctx.fillStyle = '#ffe4ea';
        ctx.fillRect(x1, y - 1 * s, x2 - x1, 2 * s);
        glow(ctx, x1, y, 22 * s, '#ff3d5a', .9);
        glow(ctx, x2, y, 22 * s, '#ff3d5a', .9);
      } else {
        ctx.setLineDash([6 * s, 8 * s]);
        ctx.strokeStyle = st.warn ? (Math.floor(t * 8) % 2 ? 'rgba(255, 209, 102, .9)' : 'rgba(255, 209, 102, .3)') : 'rgba(61, 220, 132, .25)';
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    for (const d of world.drones) {
      if (d.y < bottom - 40 || d.y > top + 40) continue;
      const x = X(Toren.droneX(d, t, W));
      const y = sy(d.y);
      const r = d.r * s;
      ctx.fillStyle = 'rgba(255, 61, 90, .07)';
      ctx.beginPath();
      ctx.moveTo(x - 3 * s, y + r);
      ctx.lineTo(x + 3 * s, y + r);
      ctx.lineTo(x + 28 * s, y + 90 * s);
      ctx.lineTo(x - 28 * s, y + 90 * s);
      ctx.fill();
      glow(ctx, x, y, r * 3.2, '#ff3d5a', .4);
      ctx.strokeStyle = '#8a93b0';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x - r * 1.8, y - r * .9);
      ctx.lineTo(x + r * 1.8, y - r * .9);
      ctx.stroke();
      const spin = Math.abs(Math.sin(t * 40));
      ctx.fillStyle = 'rgba(210, 225, 255, .45)';
      for (const rx of [x - r * 1.8, x + r * 1.8]) {
        ctx.beginPath();
        ctx.ellipse(rx, y - r, r * .9 * spin + 1, r * .2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#1c2236';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a6488';
      ctx.beginPath();
      ctx.arc(x - r * .3, y - r * .3, r * .55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff3d5a';
      ctx.beginPath();
      ctx.arc(x + r * .2, y + r * .1, r * .38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + r * .25, y - r * .1, r * .15, r * .15);
    }

    // 5. Platforms.
    for (const p of world.platforms) {
      if (p.y < bottom - 60 || p.y > top + 30) continue;
      const L = lookOf(world, Toren.zoneAt(world, p.y));
      const px = Toren.platformX(p, t);
      const x = X(px);
      const y = sy(Toren.platformY(p, t));
      const w = p.w * s;
      const rail = { dx: x - X(p.x), y0: p.lift ? sy(p.y + p.lift.amp) : 0, y1: p.lift ? sy(p.y - p.lift.amp) + 13 * s : 0 };
      platform(ctx, p, x, y, w, s, L, world, t, rail);
      if (p.spikes) spikes(ctx, X(p.spikes.x), y, p.spikes.w * s, s);
      if (p.spring) springPad(ctx, X(p.spring.x + p.spring.w / 2), y, s, t);
      if (p.floor > 0 && p.floor % 10 === 0 && p.floor < world.FLOORS && !p.lift) {
        ctx.fillStyle = '#ffd166';
        ctx.font = `800 ${11 * s}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.floor, x + w / 2, y + 13 * s);
      }
    }

    // 6. Lava onder de vloer.
    if (bottom < 0) {
      const y = sy(0) + 40 * s;
      if (y < H) {
        glow(ctx, X(W / 2), y, W * s * .7, '#ff5a1a', .5);
        ctx.fillStyle = '#ff7a1a';
        ctx.fillRect(0, y, CW, H - y);
        ctx.fillStyle = '#ffd34a';
        ctx.beginPath();
        ctx.moveTo(0, y + 6 * s);
        for (let i = 0; i <= CW; i += 16 * s) ctx.lineTo(i, y + (Math.sin(i / (16 * s) + t * 3) * 3 + 2) * s);
        ctx.lineTo(CW, y + 6 * s);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
          const bx = hash(i) * CW;
          const ph = (t * .7 + hash(i * 3)) % 1;
          ctx.fillStyle = `rgba(255, 240, 150, ${1 - ph})`;
          ctx.beginPath();
          ctx.arc(bx, y + (14 - ph * 12) * s, (2 + ph * 4) * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 7. De torenkamer met de prinses.
    if (world.top < top + 80) {
      const y = sy(world.top);
      glow(ctx, X(W / 2), y - 40 * s, 180 * s, '#ffd166', .55);
      ctx.fillStyle = 'rgba(255, 220, 140, .25)';
      for (const dx of [-60, 60]) {
        ctx.beginPath();
        ctx.moveTo(X(W / 2 + dx) - 10 * s, y);
        ctx.lineTo(X(W / 2 + dx), y - 90 * s);
        ctx.lineTo(X(W / 2 + dx) + 10 * s, y);
        ctx.fill();
      }
      princess(ctx, X(W / 2 - 15), y, 30 * s, t);
      ctx.fillStyle = '#ffd166';
      ctx.font = `800 ${11 * s}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      if (Math.floor(t * 2) % 2) ctx.fillText('HELP!', X(W / 2), y - 48 * s);
    }

    // 8. Dikke stenen zuilen aan beide kanten, met een gloeiende rand in de kleur van de zone.
    const L = LOOK[z.key];
    const pw = 22 * s;
    for (const [px, inner] of [[X(0) - pw, X(0) - 2 * s], [X(W), X(W)]]) {
      ctx.fillStyle = '#1a1826';
      ctx.fillRect(px, 0, pw, H);
      ctx.fillStyle = '#34314a';
      ctx.fillRect(px + pw * .2, 0, pw * .45, H);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      const step = 30 * s;
      for (let y = sy(Math.ceil(top / 30) * 30); y < H; y += step) ctx.fillRect(px, y, pw, Math.max(1, 1.5 * s));
      ctx.fillStyle = L.accent;
      ctx.globalAlpha = .25;
      ctx.fillRect(inner - 2 * s, 0, 6 * s, H);
      ctx.globalAlpha = .9;
      ctx.fillRect(inner, 0, 2 * s, H);
      ctx.globalAlpha = 1;
    }
  }

  return { COLORS, LOOK, knight, princess, scene, glow };
})();
