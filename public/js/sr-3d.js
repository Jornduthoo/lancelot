// Strijdrossen in 3D: de camera hangt achter en boven je hoverros, zoals in Smash Karts.
// De vloer wordt per pixel getekend op een klein canvas; kratten, pilaren, schansen, de burcht en de torens rondom
// zijn echte 3D-vormen, van ver naar dichtbij getekend. Je kijkt van hoog genoeg om over de kratten heen te zien.
// Gebruikt SrWorld, SrDraw (de vloer) en RaceDraw.steed (het ros van achteren) uit race-draw.js.
const Sr3D = (() => {
  const Wd = SrWorld;
  const FOV = 1.25;
  const CAM_Z = 175;         // hoogte van de camera
  const BACK = 330;          // afstand achter het ros (op een gewoon scherm)
  const HORIZON = .3;
  const NEAR = 12;
  const FAR = 4200;
  const STEED_W = 110;       // breedte van een ros in arena-eenheden
  const FOG = [26, 18, 52];
  const LIGHT = [-.45, -.6, .66]; // licht van linksboven

  // ---------- De wereld rond de arena: torens met spitse daken en neonbomen ----------

  const TOWERS = [];
  const PINES = [];
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2 + .26;
    TOWERS.push({ x: Wd.CX + Math.cos(t) * Wd.RX * 1.2, y: Wd.CY + Math.sin(t) * Wd.RY * 1.25, r: 80, h: 380, roof: 200 });
  }
  for (let i = 0; i < 26; i++) {
    const t = (i / 26) * Math.PI * 2 + .1;
    const k = 1.07 + ((i * 37) % 10) / 100;
    PINES.push({ x: Wd.CX + Math.cos(t) * Wd.RX * k, y: Wd.CY + Math.sin(t) * Wd.RY * (k + .04), h: 150 + ((i * 53) % 70) });
  }

  // Een panorama aan de horizon: bergen en de silhouetten van burchten met verlichte ramen.
  const pano = document.createElement('canvas');
  pano.width = 2400;
  pano.height = 200;
  (() => {
    const g = pano.getContext('2d');
    const ridge = (base, amp, seed, color) => {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(0, 200);
      for (let x = 0; x <= 2400; x += 40) {
        const y = base - amp * (.5 + .5 * Math.sin(x / 190 + seed) * Math.cos(x / 83 + seed * 2));
        g.lineTo(x, y);
      }
      g.lineTo(2400, 200);
      g.fill();
    };
    ridge(120, 90, 1.3, '#2a1c4f');
    ridge(160, 60, 4.1, '#1d1538');
    for (const cx of [300, 1050, 1750, 2200]) {
      g.fillStyle = '#120d26';
      g.fillRect(cx - 90, 120, 180, 80);
      for (const tx of [-90, -20, 60]) {
        g.fillRect(cx + tx, 70, 30, 60);
        g.beginPath(); g.moveTo(cx + tx - 4, 72); g.lineTo(cx + tx + 15, 38); g.lineTo(cx + tx + 34, 72); g.fill();
      }
      g.fillStyle = '#ffd166';
      for (let k = 0; k < 7; k++) g.fillRect(cx - 80 + ((k * 47) % 160), 135 + ((k * 13) % 40), 4, 6);
    }
  })();
  const STARS = Array.from({ length: 120 }, (_, i) => ({ az: (i * 2.399) % (Math.PI * 2), h: ((i * 37) % 100) / 100, s: i % 7 === 0 ? 2 : 1 }));

  // ---------- Helpers ----------

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
  }
  // Hoe fel een vlak oplicht, uit zijn normaal.
  const lit = (nx, ny, nz) => .45 + .55 * Math.max(0, -(nx * LIGHT[0] + ny * LIGHT[1]) * .8 + nz * LIGHT[2]);

  function visible(ax, ay, bx, by) {
    return Wd.clearLine(ax, ay, bx, by, 40);
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
      const img = Avatar.sprite(av, { back, k: Avatar.kFor(hw / 12) });
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
  let img = null;
  let px = null;
  let skyRows = null;
  let floor = null;

  // De vloer van bovenaf (zonder kratten en schansen) als pixels om uit te lezen.
  function floorData(teams) {
    const key = (teams ? 'teams' : 'ieder') + SrDraw.artVer();
    if (floor && floor.key === key) return floor;
    // Grove vloer is genoeg voor het lage 3D-beeld en spaart geheugen op een Chromebook.
    const c = SrDraw.arenaImage(teams, false, .25);
    const g = c.getContext('2d');
    floor = { key, k: .25, w: c.width, h: c.height, px: new Uint32Array(g.getImageData(0, 0, c.width, c.height).data.buffer) };
    return floor;
  }

  // scene: { me: {x, y, z}, a (kijkrichting), self: {color, av, boost, bubble, asking, tilt} of null,
  //          others: [{x, y, z, a, v, color, name, hp, flags, av, n}], lasers, rockets, mines, teams, t, boost }
  function render(ctx, w, h, scene) {
    const { me, a } = scene;
    const ca = Math.cos(a), sa = Math.sin(a);
    const fov = FOV + (scene.boost ? .1 : 0);
    const half = Math.tan(fov / 2);
    const f = (w / 2) / half;
    // Zo ver achter het ros dat het onderaan in beeld staat, ook op een breed en laag gsm-scherm.
    const back = Math.max(BACK * .8, Math.min(BACK * 2, (CAM_Z * f) / ((.8 - HORIZON) * h)));
    const cam = { x: me.x - ca * back, y: me.y - sa * back, z: CAM_Z + (me.z || 0) * .5 };
    const hz = Math.round(HORIZON * h);

    // Hemel en vloer op een klein canvas, pixel per pixel. Alleen kopiëren in de lus: de mist komt er daarna
    // in één keer overheen als verloop, dat scheelt op een Chromebook de helft van de tijd.
    const resW = Math.max(160, Math.min(340, Math.round(w / 3.2)));
    const resH = Math.max(90, Math.round(resW * h / w));
    if (low.width !== resW || low.height !== resH) {
      low.width = resW;
      low.height = resH;
      img = lctx.createImageData(resW, resH);
      px = new Uint32Array(img.data.buffer);
      skyRows = null;
    }
    const lhz = Math.round(HORIZON * resH);
    const lf = resW / 2 / half;
    if (!skyRows) {
      skyRows = new Uint32Array(lhz + 1);
      for (let y = 0; y <= lhz; y++) {
        const k = y / Math.max(1, lhz);
        const r = Math.round(6 + k * 60), g = Math.round(4 + k * 24), b = Math.round(20 + k * 70);
        skyRows[y] = (255 << 24) | (b << 16) | (g << 8) | r;
      }
    }
    for (let y = 0; y < lhz; y++) px.fill(skyRows[y], y * resW, (y + 1) * resW);
    const fl = floorData(scene.teams);
    const tex = fl.px, tw = fl.w, th = fl.h, tk = fl.k;
    const plx = -sa * half, ply = ca * half;
    const lx = ca - plx, ly = sa - ply;
    const rx = ca + plx, ry = sa + ply;
    for (let y = lhz; y < resH; y++) {
      const rowD = (cam.z * lf) / Math.max(.5, y - lhz + .5);
      let wx = (cam.x + rowD * lx) * tk;
      let wy = (cam.y + rowD * ly) * tk;
      const sx = ((rowD * (rx - lx)) / resW) * tk;
      const sy = ((rowD * (ry - ly)) / resW) * tk;
      let i = y * resW;
      for (let x = 0; x < resW; x++, i++, wx += sx, wy += sy) {
        const tx = wx | 0, ty = wy | 0;
        px[i] = tx < 0 || ty < 0 || tx >= tw || ty >= th ? 0xff1a0f12 : tex[ty * tw + tx];
      }
    }
    lctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(low, 0, 0, w, h);
    {
      // De mist: dicht aan de horizon, weg vlak voor je neus.
      const fogAt = y => Math.min(.95, (((cam.z * f) / Math.max(.5, y - hz + .5)) / FAR) ** 1.3 * 1.6);
      const grad = ctx.createLinearGradient(0, hz, 0, h);
      for (const k of [0, .02, .05, .1, .2, .35, .6, 1]) grad.addColorStop(k, `rgba(${FOG[0]}, ${FOG[1]}, ${FOG[2]}, ${fogAt(hz + k * (h - hz)).toFixed(3)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, hz, w, h - hz);
    }

    // Sterren en het panorama, meedraaiend met de kijkrichting.
    ctx.fillStyle = '#d9ecff';
    for (const s of STARS) {
      let rel = s.az - a;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      if (Math.abs(rel) > fov) continue;
      ctx.globalAlpha = .35 + s.h * .6;
      ctx.fillRect(w / 2 + Math.tan(rel) * f, s.h * hz * .7, s.s * 1.5, s.s * 1.5);
    }
    ctx.globalAlpha = 1;
    {
      const span = pano.width;
      const perRad = span / (Math.PI * 2);
      const ph = hz * .55;
      const left = ((a - fov / 2) * perRad) % span;
      const width = fov * perRad;
      for (let start = ((left % span) + span) % span, x = 0, rest = width; rest > 0;) {
        const take = Math.min(rest, span - start);
        ctx.drawImage(pano, start, 0, take, pano.height, x, hz - ph + 2, (take / width) * w, ph);
        x += (take / width) * w;
        rest -= take;
        start = 0;
      }
      const glow = ctx.createLinearGradient(0, hz - 30, 0, hz + 10);
      glow.addColorStop(0, 'rgba(199, 125, 255, 0)');
      glow.addColorStop(1, 'rgba(199, 125, 255, .35)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, hz - 30, w, 40);
    }

    // ---------- 3D-vormen ----------

    const toCam = (x, y, z) => {
      const dx = x - cam.x, dy = y - cam.y;
      return [-dx * sa + dy * ca, z, dx * ca + dy * sa];
    };
    const proj = p => [w / 2 + (p[0] * f) / p[2], hz + ((cam.z - p[1]) * f) / p[2]];
    // Een veelhoek knippen tegen het vlak vlak voor de camera, dan projecteren.
    function polygon(pts) {
      const c = pts.map(p => toCam(p[0], p[1], p[2]));
      const out = [];
      for (let i = 0; i < c.length; i++) {
        const p = c[i], q = c[(i + 1) % c.length];
        if (p[2] >= NEAR) out.push(p);
        if ((p[2] >= NEAR) !== (q[2] >= NEAR)) {
          const t = (NEAR - p[2]) / (q[2] - p[2]);
          out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, NEAR]);
        }
      }
      return out.length >= 3 ? out.map(proj) : null;
    }
    function face(pts, fill, stroke, lw = 2) {
      const s = polygon(pts);
      if (!s) return;
      ctx.beginPath();
      ctx.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length; i++) ctx.lineTo(s[i][0], s[i][1]);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }
    // Kijkt een vlak (met normaal nx, ny en een punt erop) naar de camera?
    const facing = (x, y, nx, ny) => (cam.x - x) * nx + (cam.y - y) * ny > 0;
    const fogged = (hex, d) => shade(hex, Math.max(.25, 1 - d / FAR));

    function drawBox(b, d) {
      const x0 = b.x, x1 = b.x + b.w, y0 = b.y, y1 = b.y + b.d, z = b.h;
      const wood = '#7a5230';
      const sides = [
        [[x0, y0], [x1, y0], 0, -1], [[x1, y0], [x1, y1], 1, 0], [[x1, y1], [x0, y1], 0, 1], [[x0, y1], [x0, y0], -1, 0],
      ];
      for (const [p, q, nx, ny] of sides) {
        if (!facing(p[0], p[1], nx, ny)) continue;
        face([[p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], z], [p[0], p[1], z]], fogged(wood, d * 1.2 / lit(nx, ny, 0)), 'rgba(20, 10, 4, .6)', 2);
        // Planken en een kruis, zoals een krat.
        const m = (t, zz) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, zz];
        const s1 = polygon([m(.06, z * .1), m(.94, z * .9), m(.94, z * .84), m(.06, z * .04)]);
        if (s1) { ctx.fillStyle = 'rgba(40, 22, 8, .45)'; ctx.beginPath(); s1.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.fill(); }
      }
      face([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fogged('#a8743f', d), 'rgba(199, 125, 255, .95)', 3);
    }

    function drawCyl(c, d, n = 16) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        pts.push([c.x + Math.cos(t) * c.r, c.y + Math.sin(t) * c.r, Math.cos(t), Math.sin(t)]);
      }
      const stone = c.kind === 'burcht' ? '#8d93b8' : c.kind === 'toren' ? '#6e6890' : '#737aa3';
      for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        const nx = (p[2] + q[2]) / 2, ny = (p[3] + q[3]) / 2;
        if (!facing((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, nx, ny)) continue;
        face([[p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], c.h], [p[0], p[1], c.h]], fogged(stone, d * 1.1 / lit(nx, ny, 0)));
        // Een gloeiende band en ramen.
        const band = c.kind === 'burcht' ? '#ffd166' : '#c77dff';
        face([[p[0], p[1], c.h * .62], [q[0], q[1], c.h * .62], [q[0], q[1], c.h * .66], [p[0], p[1], c.h * .66]], fogged(band, d * .6));
        if (c.kind !== 'pilaar' && i % 3 === 0) {
          const m = (t, zz) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, zz];
          face([m(.3, c.h * .4), m(.7, c.h * .4), m(.7, c.h * .5), m(.3, c.h * .5)], fogged('#ffd166', d * .8));
        }
      }
      if (c.roof) {
        // Een spits dak.
        for (let i = 0; i < n; i++) {
          const p = pts[i], q = pts[(i + 1) % n];
          const nx = (p[2] + q[2]) / 2, ny = (p[3] + q[3]) / 2;
          if (!facing((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, nx, ny) && cam.z < c.h) continue;
          const e = 1.15;
          face([[c.x + (p[0] - c.x) * e, c.y + (p[1] - c.y) * e, c.h], [c.x + (q[0] - c.x) * e, c.y + (q[1] - c.y) * e, c.h], [c.x, c.y, c.h + c.roof]],
            fogged(i % 2 ? '#5b2a8c' : '#6d35a6', d * 1.1 / lit(nx, ny, .5)));
        }
        return;
      }
      face(pts.map(p => [p[0], p[1], c.h]), fogged(c.kind === 'burcht' ? '#a3a9cc' : '#8d93b8', d), c.kind === 'burcht' ? '#ffd166' : '#c77dff', 3);
      if (c.kind === 'burcht') {
        // Kantelen op de rand en een vlag.
        for (let i = 0; i < n; i += 2) {
          const p = pts[i], q = pts[(i + 1) % n];
          if (!facing(p[0], p[1], p[2], p[3]) && cam.z < c.h) continue;
          face([[p[0], p[1], c.h], [q[0], q[1], c.h], [q[0], q[1], c.h + 34], [p[0], p[1], c.h + 34]], fogged(stone, d * 1.1 / lit(p[2], p[3], 0)));
        }
        const pole = polygon([[c.x - 3, c.y, c.h], [c.x + 3, c.y, c.h], [c.x + 3, c.y, c.h + 150], [c.x - 3, c.y, c.h + 150]]);
        if (pole) {
          ctx.fillStyle = '#d7deef';
          ctx.beginPath(); pole.forEach((v, i) => (i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.fill();
        }
        const wave = Math.sin(scene.t * 4) * 12;
        face([[c.x, c.y, c.h + 150], [c.x + 90 * ca + wave, c.y + 90 * sa, c.h + 125], [c.x, c.y, c.h + 100]], '#ff4d6d');
      } else {
        // Een gloeiende bol op de pilaar.
        const p = place(c.x, c.y, c.h + 26);
        if (p) {
          const r = 26 * p.k;
          const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 2.2);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(.3, '#c77dff');
          g.addColorStop(1, 'rgba(199, 125, 255, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    function drawRamp(r, d) {
      const c = Math.cos(r.a), s = Math.sin(r.a);
      const pt = (u, v, z) => [r.x + u * c - v * s, r.y + u * s + v * c, z];
      const u0 = -r.w / 2, u1 = r.w / 2, v0 = -r.d / 2, v1 = r.d / 2;
      // Achterkant (de hoge kant) en de zijkanten.
      if (facing(...pt(u1, 0, 0).slice(0, 2), c, s)) face([pt(u1, v0, 0), pt(u1, v1, 0), pt(u1, v1, r.h), pt(u1, v0, r.h)], fogged('#3a2a12', d));
      for (const [v, sign] of [[v0, -1], [v1, 1]]) {
        if (!facing(...pt(0, v, 0).slice(0, 2), -s * sign, c * sign)) continue;
        face([pt(u0, v, 0), pt(u1, v, 0), pt(u1, v, r.h)], fogged('#4d3616', d * 1.2));
      }
      face([pt(u0, v0, 0), pt(u1, v0, r.h), pt(u1, v1, r.h), pt(u0, v1, 0)], fogged('#c9822a', d), '#ffd166', 3);
      // Pijlen op de helling.
      const zAt = u => (r.h * (u - u0)) / r.w;
      for (const off of [-.28, .08]) {
        const ua = off * r.w, ub = ua + r.w * .2;
        face([pt(ua, -r.d * .3, zAt(ua) + 1), pt(ub, 0, zAt(ub) + 1), pt(ua, r.d * .3, zAt(ua) + 1), pt(ua + r.w * .07, 0, zAt(ua + r.w * .07) + 1)], fogged('#fff3b0', d));
      }
    }

    // De rand: lage glazen wandjes met een felle bovenkant.
    const RIM = 64;
    function drawRim(i, d) {
      const t0 = (i / RIM) * Math.PI * 2, t1 = ((i + 1) / RIM) * Math.PI * 2;
      const p = [Wd.CX + Math.cos(t0) * (Wd.RX + 8), Wd.CY + Math.sin(t0) * (Wd.RY + 8)];
      const q = [Wd.CX + Math.cos(t1) * (Wd.RX + 8), Wd.CY + Math.sin(t1) * (Wd.RY + 8)];
      face([[p[0], p[1], 0], [q[0], q[1], 0], [q[0], q[1], 30], [p[0], p[1], 30]], 'rgba(76, 201, 255, .22)');
      const s = polygon([[p[0], p[1], 30], [q[0], q[1], 30], [q[0], q[1], 34], [p[0], p[1], 34]]);
      if (s) {
        ctx.fillStyle = `rgba(140, 230, 255, ${Math.max(.3, 1 - d / FAR)})`;
        ctx.beginPath(); s.forEach((v, k) => (k ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1]))); ctx.closePath(); ctx.fill();
      }
    }

    function drawPine(pn, d) {
      const p = place(pn.x, pn.y, 0);
      if (!p) return;
      const k = p.k;
      const fog = Math.max(.3, 1 - d / FAR);
      ctx.fillStyle = shade('#3b2a1a', fog);
      ctx.fillRect(p.x - 8 * k, p.y - 30 * k, 16 * k, 30 * k);
      for (let i = 0; i < 3; i++) {
        const y0 = p.y - (30 + i * pn.h * .25) * k;
        const wdt = (70 - i * 16) * k;
        ctx.fillStyle = shade(i % 2 ? '#1f6e5a' : '#25856b', fog);
        ctx.beginPath(); ctx.moveTo(p.x - wdt, y0); ctx.lineTo(p.x, y0 - pn.h * .45 * k); ctx.lineTo(p.x + wdt, y0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = `rgba(123, 241, 168, ${.5 * fog})`;
        ctx.lineWidth = Math.max(1, 2 * k);
        ctx.stroke();
      }
    }

    // Waar een punt in de wereld op het scherm staat, met k = pixels per arena-eenheid daar.
    function place(x, y, z = 0) {
      const c = toCam(x, y, z);
      if (c[2] < NEAR * 2 || Math.abs(c[0]) > c[2] * half * 1.4) return null;
      const s = proj(c);
      return { x: s[0], y: s[1], k: f / c[2], perp: c[2] };
    }

    // ---------- Alles op volgorde: van ver naar dichtbij ----------

    const things = [];
    const dist = (x, y) => {
      const c = toCam(x, y, 0);
      return { d: Math.hypot(x - cam.x, y - cam.y), ahead: c[2], side: c[0] };
    };
    const inView = (x, y, r) => {
      const c = toCam(x, y, 0);
      return c[2] > -r && Math.abs(c[0]) < (Math.max(c[2], 0) + r) * half * 1.3 + r;
    };
    for (const b of Wd.BOXES) {
      const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
      if (inView(cx, cy, Math.max(b.w, b.d))) things.push({ kind: 'box', o: b, d: dist(cx, cy).d });
    }
    for (const c of Wd.CYLS) if (inView(c.x, c.y, c.r * 2)) things.push({ kind: 'cyl', o: c, d: Math.max(1, dist(c.x, c.y).d - c.r * .6) });
    for (const r of Wd.RAMPS) if (inView(r.x, r.y, r.w)) things.push({ kind: 'ramp', o: r, d: dist(r.x, r.y).d });
    for (const t of TOWERS) if (inView(t.x, t.y, t.r * 2)) things.push({ kind: 'cyl', o: { ...t, kind: 'toren' }, d: dist(t.x, t.y).d });
    for (const pn of PINES) if (inView(pn.x, pn.y, 80)) things.push({ kind: 'pine', o: pn, d: dist(pn.x, pn.y).d });
    for (let i = 0; i < RIM; i++) {
      const t = ((i + .5) / RIM) * Math.PI * 2;
      const x = Wd.CX + Math.cos(t) * Wd.RX, y = Wd.CY + Math.sin(t) * Wd.RY;
      if (inView(x, y, 160)) things.push({ kind: 'rim', i, d: dist(x, y).d + 40 });
    }
    for (const o of scene.others) things.push({ kind: 'steed', o, d: dist(o.x, o.y).d });
    if (scene.self) things.push({ kind: 'steed', self: true, o: { ...scene.self, x: me.x, y: me.y, z: me.z || 0, a }, d: back });
    for (const m of scene.mines) things.push({ kind: 'mine', o: m, d: dist(m.x, m.y).d });
    for (const b of scene.lasers) things.push({ kind: 'laser', o: b, d: dist(b.x, b.y).d });
    for (const r of scene.rockets) things.push({ kind: 'rocket', o: r, d: dist(r.x, r.y).d });
    const clock = performance.now();
    for (let i = fx.length - 1; i >= 0; i--) {
      fx[i].age = (clock - fx[i].at) / 1000;
      if (fx[i].age >= fx[i].life) { fx.splice(i, 1); continue; }
      things.push({ kind: fx[i].kind, o: fx[i], d: dist(fx[i].x, fx[i].y).d - 1 });
    }
    things.sort((p, q) => q.d - p.d);

    const tags = [];
    for (const th of things) {
      const o = th.o;
      // Wat tussen de camera en je eigen ros staat, wordt doorzichtig.
      const between = scene.self && th.d < back - 40 && th.kind !== 'steed';
      // Bomen, torens en de rand vlak bij de camera (als je langs de rand rijdt) zouden het hele beeld vullen: weglaten.
      if (scene.self && th.kind === 'rim' && th.d < back) continue;
      if (scene.self && th.d < back * 1.4 && (th.kind === 'pine' || (th.kind === 'cyl' && o.kind === 'toren'))) continue;
      if (between) ctx.globalAlpha = .35;
      if (th.kind === 'box') drawBox(o, th.d);
      else if (th.kind === 'cyl') drawCyl(o, th.d);
      else if (th.kind === 'ramp') drawRamp(o, th.d);
      else if (th.kind === 'rim') drawRim(th.i, th.d);
      else if (th.kind === 'pine') drawPine(o, th.d);
      ctx.globalAlpha = 1;
      if (th.kind === 'steed') {
        const z = o.z || 0;
        const ground = Wd.groundAt(o.x, o.y);
        const p = place(o.x, o.y, z);
        if (!p) continue;
        // Schaduw op de grond, kleiner naarmate het ros hoger vliegt.
        const sh = place(o.x, o.y, ground);
        if (sh) {
          const r = STEED_W * .55 * sh.k * Math.max(.4, 1 - (z - ground) / 300);
          ctx.fillStyle = 'rgba(0, 0, 0, .35)';
          ctx.beginPath(); ctx.ellipse(sh.x, sh.y, r, r * .32, 0, 0, Math.PI * 2); ctx.fill();
        }
        let view = 'back';
        let dir = 1;
        if (!th.self) {
          let rel = o.a - Math.atan2(o.y - cam.y, o.x - cam.x);
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          if (Math.abs(rel) > 2.2) view = 'front';
          else if (Math.abs(rel) > .9) { view = 'side'; dir = rel > 0 ? 1 : -1; }
        }
        // Je eigen ros nooit breder dan 28% van het scherm.
        const scale = th.self ? Math.min((STEED_W * p.k) / 520, (w * .28) / 520) : (STEED_W * p.k) / 520;
        if (!th.self && o.flags & 4) ctx.globalAlpha = .75;
        // Een ander ros tussen de camera en jezelf: doorzichtig, anders zie je niets meer.
        if (!th.self && scene.self && th.d < back - 40) ctx.globalAlpha = .4;
        const boosting = o.boost || o.v > Wd.CAR.max + 20;
        const opts = { t: scene.t, seed: o.n || 0, turbo: boosting, boost: boosting, av: o.av, tilt: th.self ? o.tilt : 0 };
        if (view === 'back') RaceDraw.steed(ctx, p.x, p.y, scale, o.color, opts);
        else if (view === 'front') steedFront(ctx, p.x, p.y, scale, o.color, opts);
        else steedSide(ctx, p.x, p.y, scale, o.color, opts, dir);
        ctx.globalAlpha = 1;
        if (o.bubble || (o.flags & 6)) {
          const asking = o.asking || (o.flags & 4);
          ctx.strokeStyle = asking ? 'rgba(255, 201, 74, .85)' : 'rgba(76, 201, 255, .85)';
          ctx.fillStyle = asking ? 'rgba(255, 201, 74, .1)' : 'rgba(76, 201, 255, .1)';
          ctx.lineWidth = Math.max(1.5, 14 * scale);
          ctx.beginPath(); ctx.ellipse(p.x, p.y - 220 * scale, 330 * scale, 300 * scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        if (!th.self) tags.push({ o, x: p.x, y: p.y - 700 * scale, size: 460 * scale, fog: Math.min(.6, p.perp / FAR) });
      } else if (th.kind === 'mine') {
        const p = place(o.x, o.y, 4);
        if (!p) continue;
        const r = Math.max(2, 18 * p.k);
        const pulse = o.armed ? .5 + .5 * Math.sin(scene.t * 8) : 0;
        if (SrDraw.ART.mijn) {
          // Plat op de grond: het beeld van bovenaf, platgedrukt.
          ctx.strokeStyle = o.color;
          ctx.lineWidth = Math.max(1, r * .2);
          ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.35, r * .55, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.drawImage(SrDraw.ART.mijn, p.x - r * 1.25, p.y - r * .5, r * 2.5, r * 1.0);
          if (o.armed) Glow.glow(ctx, p.x, p.y - r * .2, r * 1.2, '#ff4d6d', .3 + pulse * .6);
          continue;
        }
        ctx.fillStyle = '#2a3150';
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.2, r * .45, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = o.color;
        ctx.lineWidth = Math.max(1, r * .2);
        ctx.stroke();
        if (o.armed) {
          ctx.fillStyle = `rgba(255, 77, 109, ${.3 * pulse})`;
          ctx.beginPath(); ctx.arc(p.x, p.y - r * .3, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = o.armed ? `rgba(255, 77, 109, ${.5 + pulse * .5})` : '#ffd166';
        ctx.beginPath(); ctx.arc(p.x, p.y - r * .3, r * .4, 0, Math.PI * 2); ctx.fill();
      } else if (th.kind === 'laser') {
        const z = o.z || 30;
        const p = place(o.x, o.y, z);
        const q = place(o.x - Math.cos(o.a) * 80, o.y - Math.sin(o.a) * 80, z);
        if (!p || !q) continue;
        // Een gloed met een brede, doorzichtige streep (shadowBlur is op een Chromebook veel te traag).
        ctx.strokeStyle = o.color;
        ctx.lineCap = 'round';
        ctx.globalAlpha = .35;
        ctx.lineWidth = Math.max(4, 20 * p.k);
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = Math.max(2, 9 * p.k);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = Math.max(1, 4 * p.k);
        ctx.stroke();
      } else if (th.kind === 'rocket') {
        const p = place(o.x, o.y, 40);
        if (!p) continue;
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
        const p = place(o.x, o.y, 40);
        if (!p) continue;
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
        if (SrDraw.ART.knal) ctx.drawImage(SrDraw.ART.knal, p.x - r * .8, p.y - r * .8, r * 1.6, r * 1.6);
        ctx.globalAlpha = 1;
      } else if (th.kind === 'spark') {
        const p = place(o.x, o.y, 34);
        if (!p) continue;
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
      const size = Math.max(11, Math.min(17, tg.size * .22)) * (w > 1400 ? 1.4 : 1);
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
