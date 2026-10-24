// Strijdrossen in 3D: de camera hangt achter en boven je hoverros, zoals in Smash Karts.
// Muren met een raycaster, de vloer met de arena erop (turbostroken, cirkels) per pixel op een klein canvas,
// en de rossen scherp erbovenop. Snel genoeg voor een Chromebook.
// Gebruikt SrWorld, SrDraw (de vloer en kleuren) en RaceDraw.steed (het ros van achteren) uit race-draw.js.
const Sr3D = (() => {
  const Wd = SrWorld;
  const FOV = 1.2;
  const WALL_H = 130;
  const EYE = 96;
  const BACK = 310;
  const HORIZON = .36;
  const FAR = 2600;
  const STEED_W = 100;       // breedte van een ros in arena-eenheden
  const FOG = [10, 8, 28];

  const RECTS = [
    ...Wd.WALLS,
    { x: -80, y: -80, w: Wd.W + 160, h: 80 },
    { x: -80, y: Wd.H, w: Wd.W + 160, h: 80 },
    { x: -80, y: 0, w: 80, h: Wd.H },
    { x: Wd.W, y: 0, w: 80, h: Wd.H },
  ];
  const BORDER = new Set(RECTS.slice(Wd.WALLS.length));

  // Steentextuur met neonrandjes; de rand van de arena krijgt cyaan, de blokken paars.
  function wallTex(edge) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#1b1636';
    g.fillRect(0, 0, 64, 64);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 4; col++) {
        const x = col * 20 + (row % 2 ? 10 : 0);
        const shade = 28 + ((row * 7 + col * 13) % 5) * 4;
        g.fillStyle = `rgb(${shade + 14}, ${shade}, ${shade + 40})`;
        g.fillRect(x + 1, row * 8 + 1, 18, 6);
      }
    }
    g.fillStyle = edge;
    g.fillRect(0, 0, 64, 3);
    g.fillRect(0, 61, 64, 3);
    g.globalAlpha = .5;
    g.fillRect(0, 0, 1, 64);
    g.globalAlpha = 1;
    return c;
  }
  const TEX = { blok: wallTex('#c77dff'), rand: wallTex('#4cc9ff') };

  // De vloer: de arena van bovenaf (uit SrDraw) op halve grootte, als pixels om uit te lezen.
  let floor = null;
  function floorData(teams) {
    const key = teams ? 'teams' : 'ieder';
    if (floor && floor.key === key) return floor;
    const k = .5;
    const c = document.createElement('canvas');
    c.width = Math.round(Wd.W * k);
    c.height = Math.round(Wd.H * k);
    const g = c.getContext('2d');
    SrDraw.arena(g, { x: 0, y: 0, scale: k }, c.width, c.height, teams);
    floor = { key, k, w: c.width, h: c.height, px: new Uint32Array(g.getImageData(0, 0, c.width, c.height).data.buffer) };
    return floor;
  }

  const STARS = Array.from({ length: 110 }, (_, i) => ({ az: (i * 2.399) % (Math.PI * 2), h: ((i * 37) % 100) / 100, s: i % 7 === 0 ? 2 : 1 }));

  function cast(ox, oy, dx, dy) {
    let best = FAR;
    let u = 0;
    let side = 0;
    let rect = null;
    for (const r of RECTS) {
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
      rect = r;
      if (txMin > tyMin) { side = 0; u = oy + dy * tNear - r.y; } else { side = 1; u = ox + dx * tNear - r.x; }
    }
    return { d: best, u, side, rect };
  }

  function visible(ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay);
    if (d < 1) return true;
    return cast(ax, ay, (bx - ax) / d, (by - ay) / d).d > d - 4;
  }

  // Richthulp: een vijand vlak voor je neus wordt geraakt, ook als je niet perfect mikt.
  function assist(me, a, enemies) {
    let best = null;
    let bestErr = Infinity;
    for (const o of enemies) {
      const dist = Math.hypot(o.x - me.x, o.y - me.y);
      if (dist > Wd.LASER.range) continue;
      let rel = Math.atan2(o.y - me.y, o.x - me.x) - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const allow = Math.min(.3, Math.atan2(Wd.R * 2.2, dist) + .05);
      if (Math.abs(rel) < allow && Math.abs(rel) < bestErr && visible(me.x, me.y, o.x, o.y)) { best = a + rel; bestErr = Math.abs(rel); }
    }
    return best;
  }

  // Waar de camera hangt: achter je ros, niet door een muur heen.
  function chase(me, a) {
    const bx = -Math.cos(a);
    const by = -Math.sin(a);
    const back = Math.max(20, Math.min(BACK, cast(me.x, me.y, bx, by).d - 14));
    return { x: me.x + bx * back, y: me.y + by * back, back };
  }

  // ---------- De rossen van voren en opzij ----------

  function poly(ctx, pts, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
  }

  function head(ctx, av, cx, top, hw, back) {
    if (av && typeof Avatar !== 'undefined') {
      const img = Avatar.sprite(av, { back, k: 8 });
      const hh = hw * (8 / 12);
      ctx.drawImage(img, 0, 0, img.width, img.height * (8 / 17), cx - hw / 2, top - hh, hw, hh);
    } else {
      ctx.fillStyle = '#c9d2e6';
      ctx.beginPath(); ctx.arc(cx, top - hw * .32, hw * .36, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4cc9ff';
      if (!back) ctx.fillRect(cx - hw * .22, top - hw * .38, hw * .44, hw * .08);
    }
  }

  // Van voren: koplampen, de punt van de slee en de lans die naar je wijst. Zelfde maat als RaceDraw.steed.
  function steedFront(ctx, x, y, k, color, o = {}) {
    const w = 520 * k;
    const h = 460 * k;
    if (w < 3) return;
    const t = o.t || 0;
    ctx.save();
    ctx.translate(x, y - .1 * h + Math.sin(t * 7 + (o.seed || 0)) * .03 * h);
    const glow = ctx.createRadialGradient(0, .08 * h, 2, 0, .08 * h, w * .7);
    glow.addColorStop(0, `${color}cc`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(0, .1 * h, w * .7, h * .16, 0, 0, Math.PI * 2); ctx.fill();
    const metal = ctx.createLinearGradient(0, -.42 * h, 0, -.02 * h);
    metal.addColorStop(0, '#525d8c');
    metal.addColorStop(1, '#151a2e');
    poly(ctx, [-.42 * w, -.05 * h, .42 * w, -.05 * h, .3 * w, -.34 * h, -.3 * w, -.34 * h], metal);
    poly(ctx, [-.42 * w, -.1 * h, -.62 * w, 0, -.38 * w, -.26 * h], color);
    poly(ctx, [.42 * w, -.1 * h, .62 * w, 0, .38 * w, -.26 * h], color);
    poly(ctx, [-.12 * w, -.05 * h, .12 * w, -.05 * h, 0, .06 * h], color);
    for (const side of [-1, 1]) {
      const lx = side * .24 * w, ly = -.18 * h;
      const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, .12 * w);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(.4, '#9fe6ff');
      g.addColorStop(1, 'rgba(76, 201, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, ly, .12 * w, 0, Math.PI * 2); ctx.fill();
    }
    // De ridder: borstharnas in zijn kleur, het hoofd van zijn eigen ridder.
    poly(ctx, [-.17 * w, -.78 * h, .17 * w, -.78 * h, .2 * w, -.34 * h, -.2 * w, -.34 * h], '#c9d6e6');
    poly(ctx, [-.1 * w, -.74 * h, .1 * w, -.74 * h, .12 * w, -.42 * h, -.12 * w, -.42 * h], color);
    head(ctx, o.av, 0, -.78 * h, .34 * w, false);
    ctx.strokeStyle = '#d7deef';
    ctx.lineWidth = Math.max(1, 26 * k);
    ctx.beginPath(); ctx.moveTo(-.18 * w, -.5 * h); ctx.lineTo(-.42 * w, -.95 * h); ctx.stroke();
    ctx.fillStyle = '#9fe6ff';
    ctx.beginPath(); ctx.arc(-.42 * w, -.95 * h, 26 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Opzij: een lange slee met de neus naar links (dir -1) of rechts (dir 1).
  function steedSide(ctx, x, y, k, color, o = {}, dir = 1) {
    const w = 520 * k;
    const h = 460 * k;
    if (w < 3) return;
    const t = o.t || 0;
    ctx.save();
    ctx.translate(x, y - .1 * h + Math.sin(t * 7 + (o.seed || 0)) * .03 * h);
    ctx.scale(dir, 1);
    const L = w * .75;
    const glow = ctx.createRadialGradient(0, .08 * h, 2, 0, .08 * h, L);
    glow.addColorStop(0, `${color}bb`);
    glow.addColorStop(1, `${color}00`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.ellipse(0, .1 * h, L, h * .14, 0, 0, Math.PI * 2); ctx.fill();
    const flame = o.boost ? 1.9 : 1;
    const g = ctx.createRadialGradient(-L * .95, -.2 * h, 1, -L * .95, -.2 * h, .2 * w * flame);
    g.addColorStop(0, '#fff');
    g.addColorStop(.35, o.boost ? '#ffd166' : color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(-L * .95, -.2 * h, .2 * w * flame, 0, Math.PI * 2); ctx.fill();
    const metal = ctx.createLinearGradient(0, -.4 * h, 0, -.02 * h);
    metal.addColorStop(0, '#525d8c');
    metal.addColorStop(1, '#151a2e');
    poly(ctx, [-L * .9, -.06 * h, L * .55, -.06 * h, L, -.2 * h, L * .5, -.32 * h, -L * .85, -.34 * h], metal);
    poly(ctx, [-L * .9, -.2 * h, -L * .6, -.34 * h, -L * .95, -.52 * h], color);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, 12 * k);
    ctx.beginPath(); ctx.moveTo(-L * .9, -.06 * h); ctx.lineTo(L * .55, -.06 * h); ctx.lineTo(L, -.2 * h); ctx.stroke();
    poly(ctx, [-.14 * w, -.78 * h, .12 * w, -.78 * h, .16 * w, -.34 * h, -.18 * w, -.34 * h], '#c9d6e6');
    poly(ctx, [-.3 * w + Math.sin(t * 9) * .03 * w, -.4 * h, -.14 * w, -.76 * h, -.12 * w, -.36 * h], color);
    head(ctx, o.av, 0, -.78 * h, .32 * w, false);
    ctx.strokeStyle = '#d7deef';
    ctx.lineWidth = Math.max(1, 22 * k);
    ctx.beginPath(); ctx.moveTo(.05 * w, -.5 * h); ctx.lineTo(L * 1.25, -.62 * h); ctx.stroke();
    ctx.fillStyle = '#9fe6ff';
    ctx.beginPath(); ctx.arc(L * 1.25, -.62 * h, 20 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- Effecten in 3D ----------

  const fx = [];
  function add(e) {
    fx.push({ ...e, at: performance.now() });
    if (fx.length > 80) fx.shift();
  }
  const boom = (x, y, r) => add({ x, y, r, life: .6, kind: 'boom' });
  const spark = (x, y, color) => add({ x, y, r: 26, life: .3, kind: 'spark', color });

  // ---------- Alles tekenen ----------

  const low = document.createElement('canvas');
  const lctx = low.getContext('2d');
  let zbuf = new Float32Array(0);
  let img = null;
  let px = null;
  let skyRows = null;

  // scene: { me: {x, y}, a (kijkrichting), self: {color, av, boost, bubble, asking}, others: [{x, y, a, v, color, name, hp, flags, av, n}],
  //          lasers: [{x, y, a, color}], rockets: [{x, y, a, color}], mines: [{x, y, color, armed}], teams, t, dt, boost }
  function render(ctx, w, h, scene) {
    const resW = Math.max(220, Math.min(460, Math.round(w / 2.6)));
    const resH = Math.max(120, Math.round(resW * h / w));
    if (low.width !== resW || low.height !== resH) {
      low.width = resW;
      low.height = resH;
      zbuf = new Float32Array(resW);
      img = lctx.createImageData(resW, resH);
      px = new Uint32Array(img.data.buffer);
      skyRows = null;
    }
    const { me, a } = scene;
    const cam = chase(me, a);
    const fov = FOV + (scene.boost ? .12 : 0);
    const half = Math.tan(fov / 2);
    const proj = resW / 2 / half;
    const horizon = Math.round(HORIZON * resH);
    const fl = floorData(scene.teams);

    // Hemel (één keer per maat) en vloer, pixel per pixel.
    if (!skyRows) {
      skyRows = new Uint32Array(horizon + 1);
      for (let y = 0; y <= horizon; y++) {
        const f = y / Math.max(1, horizon);
        const r = Math.round(2 + f * 28), g = Math.round(3 + f * 12), b = Math.round(10 + f * 46);
        skyRows[y] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }
    for (let y = 0; y < horizon; y++) px.fill(skyRows[y], y * resW, (y + 1) * resW);
    const dx = Math.cos(a), dy = Math.sin(a);
    const plx = -dy * half, ply = dx * half;
    const lx = dx - plx, ly = dy - ply;
    const rx = dx + plx, ry = dy + ply;
    const fk = fl.k;
    for (let y = horizon; y < resH; y++) {
      const rowD = (EYE * proj) / Math.max(.5, y - horizon + .5);
      let wx = cam.x + rowD * lx;
      let wy = cam.y + rowD * ly;
      const sx = (rowD * (rx - lx)) / resW;
      const sy = (rowD * (ry - ly)) / resW;
      const fog = Math.min(.92, rowD / FAR * 1.4);
      const keep = 1 - fog;
      const fr = FOG[0] * fog, fg = FOG[1] * fog, fb = FOG[2] * fog;
      let i = y * resW;
      for (let x = 0; x < resW; x++, i++, wx += sx, wy += sy) {
        const tx = (wx * fk) | 0, ty = (wy * fk) | 0;
        let c;
        if (tx < 0 || ty < 0 || tx >= fl.w || ty >= fl.h) c = 0xff100a05;
        else c = fl.px[ty * fl.w + tx];
        const r = (c & 255) * keep + fr, g = ((c >> 8) & 255) * keep + fg, b = ((c >> 16) & 255) * keep + fb;
        px[i] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }
    lctx.putImageData(img, 0, 0);
    const g = lctx;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#c9e6ff';
    for (const s of STARS) {
      let rel = s.az - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > fov) continue;
      g.globalAlpha = .35 + s.h * .6;
      g.fillRect(resW / 2 + Math.tan(rel) * proj, s.h * horizon * .85, s.s, s.s);
    }
    g.globalAlpha = 1;

    // Muren, kolom per kolom.
    for (let x = 0; x < resW; x++) {
      const col = (x / resW) * 2 - 1;
      const ra = a + Math.atan(col * half);
      const hit = cast(cam.x, cam.y, Math.cos(ra), Math.sin(ra));
      const perp = hit.d * Math.cos(ra - a);
      zbuf[x] = perp;
      if (hit.d >= FAR) continue;
      const top = horizon - ((WALL_H - EYE) * proj) / perp;
      const bottom = horizon + (EYE * proj) / perp;
      const tex = BORDER.has(hit.rect) ? TEX.rand : TEX.blok;
      const tu = Math.floor(((hit.u % 64) + 64) % 64);
      g.drawImage(tex, tu, 0, 1, 64, x, top, 1, bottom - top);
      const fog = Math.min(.85, perp / FAR * 1.3 + (hit.side ? .15 : 0));
      g.fillStyle = `rgba(10, 8, 28, ${fog})`;
      g.fillRect(x, top, 1, bottom - top);
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low, 0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    const kx = w / resW;
    const ky = h / resH;

    // Waar een punt in de wereld op het grote scherm staat (en hoe ver het is), of null buiten beeld.
    const place = (x, y, height = 0) => {
      let rel = Math.atan2(y - cam.y, x - cam.x) - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const d = Math.hypot(x - cam.x, y - cam.y);
      if (Math.abs(rel) > fov * .8 || d < 8) return null;
      const perp = d * Math.cos(rel);
      const sx = resW / 2 + Math.tan(rel) * proj;
      return { x: sx * kx, y: (horizon + ((EYE - height) * proj) / perp) * ky, col: Math.round(sx), perp, k: (proj / perp) * kx, rel };
    };
    const seen = (p, pad = 0) => {
      for (let c = Math.max(0, p.col - pad); c <= Math.min(resW - 1, p.col + pad); c++) if (zbuf[c] >= p.perp - 2) return true;
      return false;
    };

    // Rossen, schoten, mijnen en ontploffingen: van ver naar dichtbij.
    const things = [];
    for (const o of scene.others) things.push({ kind: 'steed', o, x: o.x, y: o.y });
    if (scene.self) things.push({ kind: 'steed', self: true, o: { ...scene.self, x: me.x, y: me.y, a }, x: me.x, y: me.y });
    for (const m of scene.mines) things.push({ kind: 'mine', o: m, x: m.x, y: m.y });
    for (const b of scene.lasers) things.push({ kind: 'laser', o: b, x: b.x, y: b.y });
    for (const r of scene.rockets) things.push({ kind: 'rocket', o: r, x: r.x, y: r.y });
    const clock = performance.now();
    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].age = (clock - fx[i].at) / 1000;
      if (fx[i].age >= fx[i].life) { fx.splice(i, 1); continue; }
      things.push({ kind: fx[i].kind, o: fx[i], x: fx[i].x, y: fx[i].y });
    }
    for (const th of things) th.d = Math.hypot(th.x - cam.x, th.y - cam.y);
    things.sort((p, q) => q.d - p.d);
    const tags = [];
    for (const th of things) {
      const o = th.o;
      if (th.kind === 'steed') {
        const p = place(th.x, th.y);
        if (!p) continue;
        // Welke kant van het ros zie je? rel = zijn richting tegenover de kijklijn.
        let view = 'back';
        let dir = 1;
        if (!th.self) {
          let rel = o.a - Math.atan2(th.y - cam.y, th.x - cam.x);
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          if (Math.abs(rel) > 2.2) view = 'front';
          else if (Math.abs(rel) > .9) { view = 'side'; dir = rel > 0 ? 1 : -1; }
        }
        // Je eigen ros nooit breder dan 30% van het scherm, ook als de camera tegen een muur zit.
        const scale = th.self ? Math.min((STEED_W * p.k) / 520, (w * .3) / 520) : (STEED_W * p.k) / 520;
        const bw = 520 * scale * (view === 'side' ? 1.6 : 1.3);
        // Alleen tekenen in de kolommen waar geen muur voor staat.
        const c0 = Math.max(0, Math.floor((p.x - bw / 2) / kx));
        const c1 = Math.min(resW - 1, Math.ceil((p.x + bw / 2) / kx));
        const runs = [];
        for (let c = c0; c <= c1; c++) {
          if (zbuf[c] < p.perp - 4) continue;
          const last = runs[runs.length - 1];
          if (last && last[1] === c - 1) last[1] = c; else runs.push([c, c]);
        }
        if (!runs.length) continue;
        ctx.save();
        ctx.beginPath();
        for (const [s0, s1] of runs) ctx.rect(s0 * kx, 0, (s1 - s0 + 1) * kx, h);
        ctx.clip();
        if (!th.self && o.flags & 4) ctx.globalAlpha = .75;
        const opts = { t: scene.t, seed: o.n || 0, turbo: o.boost || o.v > Wd.CAR.max + 20, boost: o.boost || o.v > Wd.CAR.max + 20, av: o.av, tilt: th.self ? o.tilt : 0 };
        if (view === 'back') RaceDraw.steed(ctx, p.x, p.y, scale, o.color, opts);
        else if (view === 'front') steedFront(ctx, p.x, p.y, scale, o.color, opts);
        else steedSide(ctx, p.x, p.y, scale, o.color, opts, dir);
        if (o.bubble || (o.flags & 6)) {
          const asking = o.asking || (o.flags & 4);
          ctx.strokeStyle = asking ? 'rgba(255, 201, 74, .85)' : 'rgba(76, 201, 255, .85)';
          ctx.fillStyle = asking ? 'rgba(255, 201, 74, .1)' : 'rgba(76, 201, 255, .1)';
          ctx.lineWidth = Math.max(1.5, 3 * scale * 10);
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 230 * scale, 360 * scale, 330 * scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        const fog = Math.min(.6, p.perp / FAR);
        if (!th.self) tags.push({ o, x: p.x, y: p.y - 700 * scale, size: 460 * scale, fog });
      } else if (th.kind === 'mine') {
        const p = place(th.x, th.y, 6);
        if (!p || !seen(p, 1)) continue;
        const r = Math.max(2, 16 * p.k);
        const pulse = o.armed ? .5 + .5 * Math.sin(scene.t * 8) : 0;
        ctx.fillStyle = '#2a3150';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.2, r * .45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = o.color;
        ctx.lineWidth = Math.max(1, r * .2);
        ctx.stroke();
        ctx.fillStyle = o.armed ? `rgba(255, 77, 109, ${.5 + pulse * .5})` : '#ffd166';
        ctx.shadowColor = '#ff4d6d';
        ctx.shadowBlur = o.armed ? 16 * pulse : 0;
        ctx.beginPath(); ctx.arc(p.x, p.y - r * .3, r * .38, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else if (th.kind === 'laser') {
        const p = place(th.x, th.y, 34);
        const q = place(th.x - Math.cos(o.a) * 70, th.y - Math.sin(o.a) * 70, 34);
        if (!p || !q || !seen(p)) continue;
        ctx.strokeStyle = o.color;
        ctx.shadowColor = o.color;
        ctx.shadowBlur = 12;
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(2, 9 * p.k);
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(1, 4 * p.k);
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (th.kind === 'rocket') {
        const p = place(th.x, th.y, 38);
        if (!p || !seen(p)) continue;
        const r = Math.max(3, 16 * p.k);
        const gl = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 2.4);
        gl.addColorStop(0, '#fff');
        gl.addColorStop(.3, '#ffd166');
        gl.addColorStop(.6, 'rgba(255, 107, 53, .6)');
        gl.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * (2.2 + Math.sin(scene.t * 40) * .3), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = o.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * .7, 0, Math.PI * 2); ctx.fill();
      } else if (th.kind === 'boom') {
        const p = place(th.x, th.y, 40);
        if (!p || !seen(p, 2)) continue;
        const k = o.age / o.life;
        const r = o.r * (.4 + k * .9) * p.k;
        ctx.globalAlpha = 1 - k;
        const gl = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
        gl.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gl.addColorStop(.3, 'rgba(255, 209, 102, .9)');
        gl.addColorStop(.65, 'rgba(255, 107, 53, .6)');
        gl.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = gl;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (th.kind === 'spark') {
        const p = place(th.x, th.y, 34);
        if (!p || !seen(p)) continue;
        const k = o.age / o.life;
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = o.color;
        ctx.lineWidth = Math.max(1.5, 5 * p.k);
        ctx.beginPath(); ctx.arc(p.x, p.y, (8 + k * o.r) * p.k, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Naamkaartjes met levens boven de andere rossen.
    for (const tg of tags) {
      if (tg.size < 10) continue;
      const size = Math.max(11, Math.min(17, tg.size * .22));
      ctx.font = `700 ${size}px 'Exo 2', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      const label = `${tg.o.flags & 4 ? '⚡ ' : ''}${tg.o.name}`;
      const tw = ctx.measureText(label).width + size;
      ctx.globalAlpha = 1 - tg.fog * .6;
      ctx.fillStyle = 'rgba(5, 8, 20, .7)';
      ctx.fillRect(tg.x - tw / 2, tg.y - size * 1.1, tw, size * 1.45);
      ctx.fillStyle = tg.o.color;
      ctx.fillText(label, tg.x, tg.y);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < tg.o.hp ? tg.o.color : 'rgba(255, 255, 255, .2)';
        ctx.fillRect(tg.x - size * 1.1 + i * size * .78, tg.y + size * .45, size * .65, size * .22);
      }
      ctx.globalAlpha = 1;
    }
    return { cam, place };
  }

  // Het vizier: waar je laser heen gaat (rood als de richthulp iemand vastheeft).
  function crosshair(ctx, at, locked, dpr) {
    if (!at) return;
    const r = 10 * dpr;
    ctx.save();
    ctx.strokeStyle = locked ? '#ff4d6d' : 'rgba(255, 255, 255, .7)';
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath();
    ctx.moveTo(at.x - r * 1.6, at.y); ctx.lineTo(at.x - r * .5, at.y);
    ctx.moveTo(at.x + r * .5, at.y); ctx.lineTo(at.x + r * 1.6, at.y);
    ctx.moveTo(at.x, at.y - r * 1.6); ctx.lineTo(at.x, at.y - r * .5);
    ctx.moveTo(at.x, at.y + r * .5); ctx.lineTo(at.x, at.y + r * 1.6);
    ctx.stroke();
    if (locked) { ctx.beginPath(); ctx.arc(at.x, at.y, r * 1.9, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
  }

  return { render, crosshair, assist, visible, boom, spark };
})();
