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
    for (const n of ['hal', 'baan', 'kegel', 'bal', 'runenbal']) {
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
        // Het geschilderde stuk herhalen over de hele lengte.
        const hh = 256 * ART.baan.height / ART.baan.width;
        for (let y = 0; y < 1024; y += hh) g.drawImage(ART.baan, 0, y, 256, hh);
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

  // Camera: waar je staat (x, y in de baan), hoe hoog, en hoe sterk het beeld vergroot.
  function camera(w, h, cam) {
    const d0 = 2.2;
    const k = Math.min(.8 * w / 1.06, .62 * h / .62);
    const camH = Math.max(.55, Math.min(2.4, (.64 * h) / k));
    return { w, h, hz: h * .27, F: k * d0, camH, x: cam.x || 0, y: cam.y };
  }
  function proj(C, x, y, z = 0) {
    const d = Math.max(.25, vy(y) - C.y);
    return { x: C.w / 2 + (x - C.x) * C.F / d, y: C.hz + (C.camH - z) * C.F / d, s: C.F / d, d };
  }
  // Waar de camera staat als de bal op y rolt (de camera volgt hem tot vlak voor de kegels).
  function camFor(y) {
    return Math.min(V_HEAD - 3.1, Math.max(-2.2, vy(y) - 2.4));
  }

  // ---------- Tekenen ----------
  // De hal achter de baan. Wat niet beweegt (lucht, bogen, vloer), bakken we één keer per schermgrootte.
  function hall(ctx, C) {
    const { w, h } = C;
    if (ART.hal) {
      const img = ART.hal;
      // Wat dichter bij de kegels: de hal komt iets dichterbij.
      const zoom = 1 + Math.max(0, (C.y + 2.2) / (V_HEAD + 2)) * .25;
      const sw = Math.max(w, h * .62 * img.width / img.height) * zoom, sh = sw * img.height / img.width;
      ctx.drawImage(img, w / 2 - sw / 2 - C.x * 40, C.hz - sh * .5, sw, sh);
      if (C.hz - sh * .5 > 0) { ctx.fillStyle = '#05060f'; ctx.fillRect(0, 0, w, C.hz - sh * .5 + 1); }
    }
    const bg = bake(['hal', w, h, ART.hal ? 'a' : ''].join('|'), () => {
      const c = mk(w, h), g = c.getContext('2d');
      if (!ART.hal) {
        const sky = g.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#0a0b1f'); sky.addColorStop(.35, '#171436'); sky.addColorStop(1, '#07060f');
        g.fillStyle = sky; g.fillRect(0, 0, w, h);
        g.strokeStyle = 'rgba(94,231,255,.35)';
        g.lineWidth = 2;
        for (let i = 1; i <= 4; i++) {
          const r = C.F / (6 + i * 3);
          g.beginPath(); g.arc(w / 2, C.hz, r * 3, Math.PI, 0); g.stroke();
        }
        g.fillStyle = 'rgba(255,201,74,.12)';
        g.beginPath(); g.arc(w / 2, C.hz * .7, C.F * .05, 0, TAU); g.fill();
      }
      const fl = g.createLinearGradient(0, C.hz, 0, h);
      fl.addColorStop(0, 'rgba(10,8,24,.0)'); fl.addColorStop(.15, 'rgba(10,8,24,.85)'); fl.addColorStop(1, '#05040c');
      g.fillStyle = fl; g.fillRect(0, C.hz, w, h - C.hz);
      return c;
    });
    if (baked.size > 12) for (const k of [...baked.keys()]) if (k.startsWith('hal|') && !k.startsWith(['hal', w, h].join('|'))) baked.delete(k);
    ctx.drawImage(bg, 0, 0);
  }

  function lane(ctx, C) {
    const tex = laneTex();
    // Van ver naar dichtbij, in reepjes die dichtbij groter worden.
    const ys = [];
    const v0 = Math.max(C.y + .3, -0.6), v1 = V_END;
    const N = 44;
    for (let i = 0; i <= N; i++) { const k = i / N; ys.push(v0 + (v1 - v0) * (1 - Math.pow(1 - k, 2.2))); }
    const inv = v => (v < BEND * .5 ? v / .5 : v - BEND * .5 + BEND);
    for (let i = N - 1; i >= 0; i--) {
      const ya = inv(ys[i]), yb = inv(ys[i + 1]);
      const pa = proj(C, -W.HALF, ya), pb = proj(C, -W.HALF, yb);
      const wa = W.HALF * 2 * pa.s;
      const top = pb.y, hgt = pa.y - pb.y + .8;
      if (pa.y < 0 || top > C.h) continue;
      // Stuk textuur dat bij deze reep hoort (de textuur is de hele baan lang).
      const ty0 = 1024 * (1 - Math.min(1, yb / W.END)), ty1 = 1024 * (1 - Math.min(1, ya / W.END));
      ctx.drawImage(tex, 0, ty0, 256, Math.max(1, ty1 - ty0), pa.x, top, wa, hgt);
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
    if (C.y < -0.3) { ctx.fillStyle = 'rgba(94,231,255,.9)'; ctx.fillRect(f0.x, f0.y - Math.max(1, f0.s * .015), f1.x - f0.x, Math.max(2, f0.s * .03)); }
    // Achter de kegels: de donkere put onder een lage achterwand met een neonrand.
    const p0 = proj(C, -W.WALL, W.PIT), p1 = proj(C, W.WALL, W.PIT), top = proj(C, 0, W.PIT, .62);
    const wall = ctx.createLinearGradient(0, top.y, 0, p0.y);
    wall.addColorStop(0, '#120f2a'); wall.addColorStop(1, '#020107');
    ctx.fillStyle = wall;
    ctx.fillRect(p0.x, top.y, p1.x - p0.x, p0.y - top.y);
    ctx.save();
    ctx.shadowColor = '#5ee7ff'; ctx.shadowBlur = 10;
    ctx.strokeStyle = '#5ee7ff'; ctx.lineWidth = Math.max(2, Math.min(5, p0.s * .02));
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p0.x, top.y); ctx.lineTo(p1.x, top.y); ctx.lineTo(p1.x, p0.y); ctx.stroke();
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
      const side = Math.abs(p.fx) > .35 ? Math.sign(p.fx) : 0;
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

  // Een richtlijn van de bal naar de kegels (alleen bij het mikken).
  function aimLine(ctx, C, x, a, power, t) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 1; i <= 14; i++) {
      const y = i * 1.25 * (.55 + power * .45);
      if (y > W.HEAD - .5) break;
      const p = proj(C, x + a * y, y);
      ctx.globalAlpha = Math.max(0, .9 - i * .055) * (.7 + .3 * Math.sin(t * 6 - i * .7));
      ctx.fillStyle = '#5ee7ff';
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.5, p.s * .025), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // Alles tekenen. o: { sim (lopende worp), standing (kegels zonder worp), ball: {x}, gold, aim: {x, a, power}, t, camY, camX }
  function render(ctx, w, h, o) {
    const C = camera(w, h, { x: o.camX || 0, y: o.camY === undefined ? -2.2 : o.camY });
    hall(ctx, C);
    lane(ctx, C);
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
      if (o.ball) {
        const R = o.gold ? W.GOLD.R : W.BALL.R;
        items.push({ y: 0, draw: () => ball(ctx, C, { x: o.ball.x, y: 0, roll: 0 }, R, o.gold, 0) });
      }
    }
    if (o.aim) aimLine(ctx, C, o.aim.x, o.aim.a, o.aim.power, o.t || 0);
    items.sort((a, b) => b.y - a.y);
    for (const it of items) it.draw();
    return C;
  }

  // Waar staat een punt van de baan op het scherm (voor vonken en het mikken)?
  function toScreen(w, h, o, x, y, z = 0) {
    const C = camera(w, h, { x: o.camX || 0, y: o.camY === undefined ? -2.2 : o.camY });
    return proj(C, x, y, z);
  }
  // Omgekeerd: welke x op de foutlijn hoort bij een plek op het scherm?
  function laneX(w, h, sx) {
    const C = camera(w, h, { x: 0, y: -2.2 });
    const s = C.F / 2.2;
    return (sx - w / 2) / s;
  }

  return { render, toScreen, laneX, camFor, pinSprite, ballSprite, has: n => Boolean(ART[n]) };
})();
