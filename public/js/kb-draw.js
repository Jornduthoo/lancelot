// Kegelridder tekenen: de kegelhal, de baan in diepte, de runenkegels en de bal. Gedeeld door de leerling en het bord.
// De baan tekenen we in smalle reepjes (van ver naar dichtbij): zo krijgt een plat beeld van de baan diepte, zonder 3D-bibliotheek.
// Staan de geschilderde beelden in /img/kegelridder/ (hal, baan, kegel, bal, runenbal), dan tekenen we die; anders een getekende versie.
// Gebruikt KbWorld en Glow (fx.js).
const KbDraw = (() => {
  const W = KbWorld;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const TAU = Math.PI * 2;

  // ---------- Geschilderde beelden ----------
  const ART = {};
  if (typeof Image !== 'undefined') {
    for (const n of ['hal', 'baan', 'kegel', 'bal', 'runenbal', 'pindeck']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; baked.clear(); };
      img.src = `/img/kegelridder/${n}.webp`;
    }
  }
  const baked = new Map();
  const bake = (key, fn) => { if (!baked.has(key)) baked.set(key, fn()); return baked.get(key); };

  // De baan van boven: houten planken, gouden randen, neonpijltjes. Eén keer gebakken, daarna alleen nog geknipt.
  function laneTex() {
    return bake('baan', () => {
      const c = mk(256, 1024), g = c.getContext('2d');
      if (ART.baan) {
        // Het geschilderde beeld één keer over de hele lengte (de pijltjes komen zo één keer, in de aanloop).
        // Zonder de buitenrand van het beeld: de baan krijgt in het spel zelf een gouden rand.
        const cut = ART.baan.width * .07;
        g.drawImage(ART.baan, cut, 0, ART.baan.width - cut * 2, ART.baan.height, 0, 0, 256, 1024);
        return c;
      }
      const boards = 13, bw = 256 / boards;
      for (let i = 0; i < boards; i++) {
        const l = 52 + ((i * 37) % 11);
        g.fillStyle = `hsl(32, 55%, ${l}%)`;
        g.fillRect(i * bw, 0, bw + 1, 1024);
        for (let k = 0; k < 18; k++) {
          g.fillStyle = `rgba(90,50,20,${.06 + ((i * 7 + k * 13) % 5) * .02})`;
          g.fillRect(i * bw + ((k * 5) % bw), ((i * 131 + k * 97) % 1024), 1.4, 40 + (k % 4) * 30);
        }
        g.fillStyle = 'rgba(60,30,10,.45)';
        g.fillRect(i * bw, 0, 1, 1024);
      }
      const shine = g.createLinearGradient(0, 0, 256, 0);
      shine.addColorStop(0, 'rgba(255,255,255,0)'); shine.addColorStop(.5, 'rgba(255,245,220,.18)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = shine; g.fillRect(0, 0, 256, 1024);
      // Gouden randen met neonstipjes
      g.fillStyle = '#c9952b'; g.fillRect(0, 0, 7, 1024); g.fillRect(249, 0, 7, 1024);
      g.fillStyle = '#5ee7ff';
      for (let y = 20; y < 1024; y += 64) { g.fillRect(2, y, 3, 6); g.fillRect(251, y, 3, 6); }
      return c;
    });
  }

  // Een kegel: ivoorwit met een gouden hals en een band van cyaan runen.
  function pinSprite() {
    if (ART.kegel) return ART.kegel;
    return bake('kegel', () => {
      const w = 64, h = 200, c = mk(w, h), g = c.getContext('2d');
      const path = () => {
        g.beginPath();
        g.moveTo(w * .5, 4);
        g.bezierCurveTo(w * .78, 4, w * .8, 34, w * .7, 52);
        g.bezierCurveTo(w * .62, 66, w * .6, 76, w * .72, 96);
        g.bezierCurveTo(w * .98, 130, w * .92, 176, w * .7, 196);
        g.lineTo(w * .3, 196);
        g.bezierCurveTo(w * .08, 176, w * .02, 130, w * .28, 96);
        g.bezierCurveTo(w * .4, 76, w * .38, 66, w * .3, 52);
        g.bezierCurveTo(w * .2, 34, w * .22, 4, w * .5, 4);
        g.closePath();
      };
      const body = g.createLinearGradient(0, 0, w, 0);
      body.addColorStop(0, '#b9b1a4'); body.addColorStop(.35, '#fffaf0'); body.addColorStop(.6, '#f1e9da'); body.addColorStop(1, '#8f877c');
      path(); g.fillStyle = body; g.fill();
      g.save(); path(); g.clip();
      g.fillStyle = '#d4a63a'; g.fillRect(0, 58, w, 9);
      g.fillStyle = 'rgba(94,231,255,.9)'; g.fillRect(0, 118, w, 12);
      g.fillStyle = '#0b1a33';
      for (let x = 6; x < w; x += 12) g.fillRect(x, 121, 5, 6);
      g.restore();
      path(); g.lineWidth = 3; g.strokeStyle = '#1a1622'; g.stroke();
      return c;
    });
  }

  // De bal: donker staal met cyaan runengroeven, of goud (runenbal).
  function ballSprite(gold) {
    if (gold && ART.runenbal) return ART.runenbal;
    if (!gold && ART.bal) return ART.bal;
    return bake(gold ? 'goudbal' : 'bal', () => {
      const s = 128, c = mk(s, s), g = c.getContext('2d');
      const grd = g.createRadialGradient(s * .38, s * .34, 4, s * .5, s * .5, s * .5);
      if (gold) { grd.addColorStop(0, '#fff6c9'); grd.addColorStop(.45, '#f0b93a'); grd.addColorStop(1, '#7a4a08'); }
      else { grd.addColorStop(0, '#7fa7d8'); grd.addColorStop(.45, '#24406f'); grd.addColorStop(1, '#0a1226'); }
      g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, TAU); g.fillStyle = grd; g.fill();
      g.lineWidth = 4; g.strokeStyle = gold ? '#fff2b0' : '#5ee7ff';
      g.globalAlpha = .85;
      g.beginPath(); g.arc(s / 2, s / 2, s * .3, -.9, 1.4); g.stroke();
      g.beginPath(); g.moveTo(s * .3, s * .7); g.lineTo(s * .45, s * .52); g.lineTo(s * .62, s * .72); g.stroke();
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,.7)';
      for (const [x, y] of [[.42, .3], [.56, .3], [.49, .44]]) { g.beginPath(); g.arc(s * x, s * y, s * .045, 0, TAU); g.fill(); }
      g.lineWidth = 3; g.strokeStyle = '#05060f';
      g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 3, 0, TAU); g.stroke();
      return c;
    });
  }

  // ---------- Diepte ----------
  // De aanloop tonen we korter dan hij is (anders zijn de kegels piepklein); vanaf de kegels is alles op ware grootte.
  const BEND = W.HEAD - 1.6;
  const vy = y => (y < BEND ? y * .5 : BEND * .5 + (y - BEND));
  const V_HEAD = vy(W.HEAD), V_END = vy(W.END);

  // Camera: zoals een tv-camera vlak achter de speler. In rust staat hij laag achter de bal en kijkt hij een beetje
  // naar beneden (de kegels groot, bijna geen hal). Tijdens de worp rijdt hij mee en kantelt hij omhoog: dan komt de hal
  // in beeld. Bij de kegels zie je ze van dichtbij, met het kegeldek als achtergrond.
  const REST = -6;               // waar de camera in rust staat (6 m achter de foutlijn, in de ingekorte aanloop)
  const CLOSE = V_HEAD - 6;      // het dichtst bij de kegels
  function camera(w, h, cam) {
    const y = cam.y === undefined ? REST : cam.y;
    const lw = Math.min(.86 * w, .95 * h);  // zo breed is de baan aan de foutlijn in rust
    const p = Math.max(0, Math.min(1, (y - REST) / (CLOSE - REST)));
    // Op een smal (staand) scherm staat de camera in rust verder weg en zoomt hij in: zo zijn de kegels groter in
    // beeld. Bij de kegels is hij overal even dichtbij.
    const far = h / w > 1.25 ? 3 : 0;
    const back = far * (1 - p);
    const d0 = -REST + back;
    const F = lw * d0 / 1.06;
    const hz = h * (-.06 + .2 * p);
    // De bal staat in rust onderaan (88 %); bij de kegels zakt de camera, zodat de kegels mooi in het midden staan.
    const target = h * (.88 - .2 * p);
    const camH = (target - hz) * d0 / F;
    return { w, h, hz, F, camH, x: cam.x || 0, y: y - back, p };
  }
  function proj(C, x, y, z = 0) {
    const d = Math.max(.25, vy(y) - C.y);
    return { x: C.w / 2 + (x - C.x) * C.F / d, y: C.hz + (C.camH - z) * C.F / d, s: C.F / d, d };
  }
  // Waar de camera staat als de bal op y rolt (de camera volgt hem tot vlak voor de kegels).
  function camFor(y) {
    return Math.min(CLOSE, Math.max(REST, vy(y) + REST));
  }

  // ---------- Tekenen ----------
  // De hal achter de baan. Wat niet beweegt (lucht, bogen, vloer), bakken we één keer per schermgrootte.
  function hall(ctx, C) {
    const { w, h } = C;
    // Gebakken met de horizon op 30 % van een 1,3 keer zo hoog beeld: zo kan de camera kantelen zonder opnieuw te bakken.
    const HZB = h * .3;
    const bg = bake(['hal', w, h, ART.hal ? 'a' : ''].join('|'), () => {
      // 80 px breder, zodat de hal opzij kan schuiven als de camera de bal volgt (zonder te schalen per beeld).
      const c = mk(w + 80, h * 1.3), g = c.getContext('2d');
      g.translate(40, 0);
      g.fillStyle = '#05060f'; g.fillRect(-40, 0, w + 80, h * 1.3);
      if (ART.hal) {
        const img = ART.hal;
        const sw = Math.max(w + 80, h * .62 * img.width / img.height) * 1.1, sh = sw * img.height / img.width;
        g.drawImage(img, w / 2 - sw / 2, HZB - sh * .5, sw, sh);
      } else {
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#0a0b1f'); sky.addColorStop(.35, '#171436'); sky.addColorStop(1, '#07060f');
        g.fillStyle = sky; g.fillRect(-40, 0, w + 80, h * 1.3);
        g.strokeStyle = 'rgba(94,231,255,.35)';
        g.lineWidth = 2;
        for (let i = 1; i <= 4; i++) {
          const r = Math.min(w, h) / (2 + i);
          g.beginPath(); g.arc(w / 2, HZB, r * 1.4, Math.PI, 0); g.stroke();
        }
      }
      const fl = g.createLinearGradient(0, HZB, 0, h * 1.3);
      fl.addColorStop(0, 'rgba(10,8,24,.0)'); fl.addColorStop(.12, 'rgba(10,8,24,.85)'); fl.addColorStop(1, '#05040c');
      g.fillStyle = fl; g.fillRect(-40, HZB, w + 80, h);
      return c;
    });
    if (baked.size > 14) for (const k of [...baked.keys()]) if (/^(hal|dek)\|/.test(k) && !k.includes(`|${w}|${h}|`)) baked.delete(k);
    ctx.fillStyle = '#05040c';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bg, Math.round(-40 - Math.max(-1, Math.min(1, C.x)) * 40), Math.round(C.hz - HZB));
    // Dicht bij de kegels: het kegeldek van dichtbij als achtergrond (de close-up).
    if (ART.pindeck && C.p > .55) {
      const end = proj(C, 0, W.END);
      const dek = bake(['dek', w, h].join('|'), () => {
        const img = ART.pindeck;
        const sw = Math.max(w, h * 1.1 * img.width / img.height), sh = sw * img.height / img.width;
        const c = mk(sw, sh);
        c.getContext('2d').drawImage(img, 0, 0, sw, sh);
        return c;
      });
      ctx.save();
      ctx.globalAlpha = Math.min(1, (C.p - .55) / .35);
      // De put van het beeld (op ~62 % van zijn hoogte) komt op het einde van onze baan.
      ctx.drawImage(dek, Math.round(w / 2 - dek.width / 2), Math.round(end.y - dek.height * .62));
      ctx.restore();
    }
  }

  function lane(ctx, C) {
    const tex = laneTex();
    // Van ver naar dichtbij, in reepjes die dichtbij groter worden.
    const v0 = Math.max(C.y + .3, -0.6);
    const inv = v => (v < BEND * .5 ? v / .5 : v - BEND * .5 + BEND);
    // In dunne reepjes op het scherm (van onder naar boven): elke reep krijgt de breedte van zijn midden.
    // Dichtbij zijn de reepjes het smalst, daar zie je trapjes in de planken het eerst.
    const yBot = Math.min(C.h, proj(C, 0, inv(v0)).y), yTop = Math.max(0, proj(C, 0, W.END).y);
    const depth = sy => C.camH * C.F / Math.max(.5, sy - C.hz);
    // Hoe ver een plank aan de rand verschuift per pixel hoogte: daarop kiezen we de dikte van een reep (max ~1 px fout).
    const per = W.HALF / C.camH;
    // Hooguit ~80 reepjes (snel genoeg op een Chromebook), ook als de camera laag bij de kegels staat.
    const step = Math.max(2, (yBot - yTop) / 80, Math.min(12, 1.2 / per));
    for (let sy = yBot; sy > yTop + .2; sy -= step) {
      const s0 = Math.max(yTop, sy - step);
      const ya = inv(C.y + depth(sy)), yb = inv(C.y + depth(s0)), ym = inv(C.y + depth((sy + s0) / 2));
      const pm = proj(C, -W.HALF, ym);
      const wm = W.HALF * 2 * pm.s;
      const ty0 = 1024 * (1 - Math.min(1, yb / W.END)), ty1 = 1024 * (1 - Math.min(1, ya / W.END));
      ctx.drawImage(tex, 0, ty0, 256, Math.max(1, ty1 - ty0), pm.x, s0, wm, sy - s0 + .7);
    }
    // Goten en zijwanden na de baan: hun rechte randen bedekken de trapjes van de reepjes.
    const quad = (x0, x1, col) => {
      const a = proj(C, x0, inv(v0)), b = proj(C, x1, inv(v0)), c = proj(C, x1, W.END), d = proj(C, x0, W.END);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill();
    };
    quad(-W.HALF - W.GUTTER - .25, -W.HALF - W.GUTTER, '#1b1530');
    quad(W.HALF + W.GUTTER, W.HALF + W.GUTTER + .25, '#1b1530');
    quad(-W.HALF - W.GUTTER, -W.HALF, '#0d0b1a');
    quad(W.HALF, W.HALF + W.GUTTER, '#0d0b1a');
    // Neonrand langs de goten
    for (const s of [-1, 1]) {
      const a0 = proj(C, s * W.HALF, inv(v0)), b0 = proj(C, s * W.HALF, W.PIT);
      ctx.strokeStyle = '#c9952b'; ctx.lineWidth = Math.max(2, Math.min(6, C.w / 300));
      ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y); ctx.stroke();
    }
    for (const s of [-1, 1]) {
      const a = proj(C, s * (W.HALF + W.GUTTER), inv(v0)), b = proj(C, s * (W.HALF + W.GUTTER), W.PIT);
      ctx.strokeStyle = 'rgba(94,231,255,.7)'; ctx.lineWidth = Math.max(1.5, Math.min(4, C.w / 500));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // De foutlijn en de pin-plek
    const f0 = proj(C, -W.HALF, 0), f1 = proj(C, W.HALF, 0);
    if (C.p < .3) { ctx.fillStyle = 'rgba(94,231,255,.9)'; ctx.fillRect(f0.x, f0.y - Math.max(1, f0.s * .015), f1.x - f0.x, Math.max(2, f0.s * .03)); }
    // Achter de kegels: de donkere put onder een lage achterwand met een neonrand.
    const p0 = proj(C, -W.WALL, W.PIT), p1 = proj(C, W.WALL, W.PIT), top = proj(C, 0, W.PIT, .62);
    const wall = ctx.createLinearGradient(0, top.y, 0, p0.y);
    wall.addColorStop(0, '#120f2a'); wall.addColorStop(1, '#020107');
    ctx.fillStyle = wall;
    ctx.fillRect(p0.x, top.y, p1.x - p0.x, p0.y - top.y);
    ctx.save();
    // Gloed zonder shadowBlur (die is traag op een Chromebook): eerst breed en doorschijnend, dan smal en fel.
    const lw = Math.max(2, Math.min(5, p0.s * .02));
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p0.x, top.y); ctx.lineTo(p1.x, top.y); ctx.lineTo(p1.x, p0.y);
    ctx.strokeStyle = 'rgba(94,231,255,.25)'; ctx.lineWidth = lw * 3; ctx.stroke();
    ctx.strokeStyle = '#5ee7ff'; ctx.lineWidth = lw; ctx.stroke();
    // Drie runen op de achterwand
    ctx.fillStyle = 'rgba(255,201,74,.85)';
    ctx.font = `${Math.max(8, Math.round((p0.y - top.y) * .45))}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ᚱ ᛟ ᚠ', (p0.x + p1.x) / 2, (top.y * .6 + p0.y * .4));
    ctx.restore();
  }

  // Een kegel (staand, wiebelend of vallend).
  function pin(ctx, C, p, t, fade) {
    const P = proj(C, p.x, p.y);
    if (P.d < .3) return;
    const img = pinSprite();
    const hh = .38 * P.s, ww = hh * img.width / img.height;
    ctx.save();
    ctx.globalAlpha = fade;
    // Schaduw
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(P.x, P.y, ww * .55, ww * .18, 0, 0, TAU); ctx.fill();
    ctx.translate(P.x, P.y);
    if (p.down) {
      const k = Math.min(1, (t - p.fallAt) / .28);
      let side = Math.abs(p.fx) > .35 ? Math.sign(p.fx) : 0;
      // Een kegel tegen de zijwand valt niet over de wand heen (dan zou hij naast de baan liggen): hij valt naar binnen.
      if (side && Math.abs(p.x + side * .38) > W.WALL + .04) side = -side;
      if (side) ctx.rotate(side * k * Math.PI / 2 * .95);
      else { ctx.scale(1, 1 - k * .7); ctx.rotate((p.fx >= 0 ? 1 : -1) * k * .25); }
      ctx.rotate(((p.i * 0.7) % 1 - .5) * k * .3);
    } else if (p.wob >= 0 && t - p.wob < .6) {
      ctx.rotate(Math.sin((t - p.wob) * 30) * .12 * (1 - (t - p.wob) / .6));
    }
    ctx.drawImage(img, -ww / 2, -hh, ww, hh);
    ctx.restore();
  }

  function ball(ctx, C, b, R, gold, t) {
    const P = proj(C, b.x, b.y, R);
    if (P.d < .3) return;
    const r = R * P.s * 1.05;
    const g = proj(C, b.x, b.y);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(g.x, g.y, r * .95, r * .3, 0, 0, TAU); ctx.fill();
    // Gloed
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(P.x, P.y, r * .4, P.x, P.y, r * 2.2);
    glow.addColorStop(0, gold ? 'rgba(255,201,74,.5)' : 'rgba(94,231,255,.4)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(P.x - r * 2.2, P.y - r * 2.2, r * 4.4, r * 4.4);
    ctx.restore();
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.rotate(b.roll || 0);
    const img = ballSprite(gold);
    ctx.drawImage(img, -r, -r, r * 2, r * 2);
    ctx.restore();
  }

  // Een richtlijn van de bal naar de kegels (alleen bij het mikken). Met effect buigt hij af zoals de bal (kb-world.js),
  // en na ongeveer een derde van de baan vervaagt hij: de rest moet je zelf inschatten.
  function aimLine(ctx, C, x, a, power, t, spin = 0) {
    ctx.save();
    const v = W.LIMITS.vMin + power * (W.LIMITS.vMax - W.LIMITS.vMin);
    let px = x, py = 0, vx = v * a;
    const vyy = v * Math.sqrt(1 - a * a);
    const dt = 1 / 60;
    let next = .9, i = 0;
    while (py < 12.5) {
      if (py > 8) vx += spin * 1.25 * dt;
      px += vx * dt;
      py += vyy * dt;
      if (py < next) continue;
      next += .9;
      i++;
      const p = proj(C, px, py);
      const fade = py < 6 ? 1 : Math.max(0, 1 - (py - 6) / 6.5);
      ctx.globalAlpha = fade * (.75 + .25 * Math.sin(t * 6 - i * .7));
      ctx.fillStyle = spin ? '#ffc94a' : '#5ee7ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.s * .03), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // De zijwanden van het kegeldek: lage panelen met een neonrand, zodat omgevallen kegels op het dek blijven.
  function deckWalls(ctx, C) {
    for (const sx of [-1, 1]) {
      const x = sx * (W.WALL + .06);
      const a = proj(C, x, W.HEAD - 1), b = proj(C, x, W.PIT), at = proj(C, x, W.HEAD - 1, .3), bt = proj(C, x, W.PIT, .3);
      if (a.d < .4) continue;
      ctx.fillStyle = '#100c22';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(bt.x, bt.y); ctx.lineTo(at.x, at.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(94,231,255,.8)'; ctx.lineWidth = Math.max(1.5, Math.min(4, a.s * .012));
      ctx.beginPath(); ctx.moveTo(at.x, at.y); ctx.lineTo(bt.x, bt.y); ctx.stroke();
    }
  }

  // Alles tekenen. o: { sim (lopende worp), standing (kegels zonder worp), ball: {x}, gold, aim: {x, a, power}, t, camY, camX }
  function render(ctx, w, h, o) {
    const C = camera(w, h, { x: o.camX || 0, y: o.camY === undefined ? REST : o.camY });
    hall(ctx, C);
    lane(ctx, C);
    deckWalls(ctx, C);
    const items = [];
    const t = o.sim ? o.sim.t : 0;
    if (o.sim) {
      for (const p of o.sim.pins) {
        if (p.gone && !(p.down && !p.pit)) continue;
        if (p.pit) continue;
        items.push({ y: p.y, draw: () => pin(ctx, C, p, t, o.fade === undefined ? 1 : (p.down ? o.fade : 1)) });
      }
      const b = o.sim.b;
      if (!b.pit) items.push({ y: b.y, draw: () => ball(ctx, C, b, o.sim.R, o.sim.gold, t) });
    } else {
      W.PINS.forEach((q, i) => {
        if (o.standing && !o.standing[i]) return;
        items.push({ y: q.y, draw: () => pin(ctx, C, { i, x: q.x, y: q.y, down: false, wob: -1 }, 0, 1) });
      });
      if (o.ball && !o.hideBall) {
        const R = o.gold ? W.GOLD.R : W.BALL.R;
        items.push({ y: 0, draw: () => ball(ctx, C, { x: o.ball.x, y: 0, roll: 0 }, R, o.gold, 0) });
      }
    }
    if (o.aim) aimLine(ctx, C, o.aim.x, o.aim.a, o.aim.power, o.t || 0, o.aim.spin || 0);
    items.sort((a, b) => b.y - a.y);
    for (const it of items) it.draw();
    return C;
  }

  // Waar staat een punt van de baan op het scherm (voor vonken en het mikken)?
  function toScreen(w, h, o, x, y, z = 0) {
    const C = camera(w, h, { x: o.camX || 0, y: o.camY === undefined ? REST : o.camY });
    return proj(C, x, y, z);
  }
  // Omgekeerd: welke x op de foutlijn hoort bij een plek op het scherm?
  function laneX(w, h, sx) {
    const C = camera(w, h, { x: 0, y: REST });
    const s = C.F / -C.y;
    return (sx - w / 2) / s;
  }

  return { REST, render, toScreen, laneX, camFor, pinSprite, ballSprite, has: n => Boolean(ART[n]) };
})();
