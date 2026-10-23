// Laserslag in 3D: dezelfde arena, door de ogen van je ridder (first person, zoals de oude Wolfenstein)
// of met de camera net achter en boven je ridder (third person, over de schouder).
// Een eenvoudige raycaster op een klein canvas dat uitvergroot wordt: snel genoeg voor een Chromebook.
// Gebruikt Arena uit laserslag-world.js en SlagDraw (kleuren).
const Slag3D = (() => {
  const FOV = 1.15;          // ongeveer 66 graden
  const WALL_H = 74;
  const FP_EYE = 28;
  const KNIGHT_H = 48;
  const FAR = 1900;
  // Third person: hoe ver en hoe hoog de camera achter je ridder hangt, en een tikje naar rechts.
  const TP_BACK = 200;
  const TP_SIDE = 26;
  const TP_EYE = 44;
  const TP_HORIZON = .42;

  // De rand van de arena als vier extra muren.
  const RECTS = [
    ...Arena.WALLS,
    { x: -60, y: -60, w: Arena.W + 120, h: 60 },
    { x: -60, y: Arena.H, w: Arena.W + 120, h: 60 },
    { x: -60, y: 0, w: 60, h: Arena.H },
    { x: Arena.W, y: 0, w: 60, h: Arena.H },
  ];

  // Steentextuur met neonrandjes, één keer getekend.
  const tex = document.createElement('canvas');
  tex.width = 64;
  tex.height = 64;
  (() => {
    const g = tex.getContext('2d');
    g.fillStyle = '#22304d';
    g.fillRect(0, 0, 64, 64);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 4; col++) {
        const x = col * 20 + (row % 2 ? 10 : 0);
        const shade = 30 + ((row * 7 + col * 13) % 5) * 4;
        g.fillStyle = `rgb(${shade}, ${shade + 12}, ${shade + 32})`;
        g.fillRect(x + 1, row * 8 + 1, 18, 6);
      }
    }
    g.fillStyle = '#4cc9ff';
    g.fillRect(0, 0, 64, 2);
    g.fillRect(0, 62, 64, 2);
    g.fillStyle = 'rgba(76, 201, 255, .35)';
    g.fillRect(0, 2, 64, 1);
    g.fillRect(0, 61, 64, 1);
    // Een verticale neonstreep per blok, zodat je ziet dat je beweegt.
    g.fillStyle = 'rgba(76, 201, 255, .5)';
    g.fillRect(0, 0, 1, 64);
    g.fillStyle = 'rgba(255, 201, 74, .7)';
    g.fillRect(31, 30, 2, 4);
  })();

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
  function cast(ox, oy, dx, dy) {
    let best = FAR;
    let u = 0;
    let side = 0;
    for (const r of RECTS) {
      let t1 = (r.x - ox) / dx;
      let t2 = (r.x + r.w - ox) / dx;
      let t3 = (r.y - oy) / dy;
      let t4 = (r.y + r.h - oy) / dy;
      const txMin = Math.min(t1, t2);
      const txMax = Math.max(t1, t2);
      const tyMin = Math.min(t3, t4);
      const tyMax = Math.max(t3, t4);
      const tNear = Math.max(txMin, tyMin);
      const tFar = Math.min(txMax, tyMax);
      if (!(tNear <= tFar) || tFar < 0 || tNear < 0 || tNear >= best) continue;
      best = tNear;
      if (txMin > tyMin) { side = 0; u = oy + dy * tNear - r.y; } else { side = 1; u = ox + dx * tNear - r.x; }
    }
    return { d: best, u, side };
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

    // Hemel en vloer.
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#02040a');
    sky.addColorStop(1, '#0d1830');
    g.fillStyle = sky;
    g.fillRect(0, 0, resW, horizon);
    g.fillStyle = '#c9e6ff';
    for (const s of STARS) {
      let rel = s.az - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > FOV) continue;
      g.globalAlpha = .4 + (s.h * .6);
      g.fillRect(resW / 2 + Math.tan(rel) * proj, s.h * horizon * .9, s.s, s.s);
    }
    g.globalAlpha = 1;
    const floor = g.createLinearGradient(0, horizon, 0, resH);
    floor.addColorStop(0, '#060b16');
    floor.addColorStop(1, '#12243f');
    g.fillStyle = floor;
    g.fillRect(0, horizon, resW, resH - horizon);
    // Vloerlijnen die meebewegen met je positie.
    g.strokeStyle = 'rgba(76, 201, 255, .12)';
    g.lineWidth = 1;
    const fx = Math.cos(a);
    const fy = Math.sin(a);
    const along = cam.x * fx + cam.y * fy;
    for (let k = 1; k < 30; k++) {
      const dist = k * 50 - (along % 50);
      if (dist < 12) continue;
      const y = horizon + (EYE * proj) / dist;
      if (y > resH) continue;
      g.globalAlpha = Math.max(0, 1 - dist / 900);
      g.beginPath(); g.moveTo(0, y); g.lineTo(resW, y); g.stroke();
    }
    g.globalAlpha = 1;

    // Muren, kolom per kolom.
    for (let x = 0; x < resW; x++) {
      const col = (x / resW) * 2 - 1;
      const ra = a + Math.atan(col * half);
      const dx = Math.cos(ra);
      const dy = Math.sin(ra);
      const hit = cast(cam.x, cam.y, dx, dy);
      const perp = hit.d * Math.cos(ra - a);
      zbuf[x] = perp;
      if (hit.d >= FAR) continue;
      const top = horizon - ((WALL_H - EYE) * proj) / perp;
      const bottom = horizon + (EYE * proj) / perp;
      const tu = Math.floor(((hit.u % 64) + 64) % 64);
      g.drawImage(tex, tu, 0, 1, 64, x, top, 1, bottom - top);
      const fog = Math.min(.88, perp / 1500 + (hit.side ? .18 : 0));
      g.fillStyle = `rgba(3, 6, 14, ${fog})`;
      g.fillRect(x, top, 1, bottom - top);
    }

    // Ridders, kogels en het kristal: van ver naar dichtbij, achter muren verborgen.
    const things = [];
    for (const o of scene.others) things.push({ kind: 'knight', o, x: o.x, y: o.y });
    for (const b of scene.bullets) things.push({ kind: 'bullet', o: b, x: b.x, y: b.y });
    if (scene.crystal) things.push({ kind: 'crystal', x: scene.crystal.x, y: scene.crystal.y });
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
        g.fillStyle = '#ffc94a';
        g.beginPath(); g.moveTo(sx, y - s); g.lineTo(sx + s * .65, y - s * .2); g.lineTo(sx, y + s); g.lineTo(sx - s * .65, y - s * .2); g.closePath(); g.fill();
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
