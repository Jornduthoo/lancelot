// Neon-Camelot tekenen in 2,5D: de grond schuin van boven, alle gebouwen en voertuigen rechtop als geschilderde beelden,
// van achter naar voor getekend. De grond wordt per stuk van 32 x 32 m één keer gebakken; elk beeld één keer per grootte.
// Jorns geschilderde beelden staan in /img/neoncamelot/. Ze laden pas als het spel start (laad()).
// Gebruikt NcWorld en AK (arena-kit.js).
const NcDraw = (() => {
  const W = NcWorld;
  const T = W.TILT;
  const IMG = {};
  let gen = 0;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const BEELDEN = [...W.SOORTEN.map(s => s[0]), 'gnoom', 'vuur', 'marker', 'ring', 'waterdraak', 'pakket', 'zeppelin',
    'v-paard', 'v-board', 'v-kar', 'v-griffioen', 't-gras', 't-plein', 't-water', 't-weg'];
  let geladen = false;
  function laad(klaar) {
    if (geladen) return;
    geladen = true;
    let open = BEELDEN.length;
    for (const n of BEELDEN) {
      const img = new Image();
      img.onload = () => { IMG[n] = img; gen++; if (--open === 0 && klaar) klaar(); };
      img.onerror = () => { if (--open === 0 && klaar) klaar(); };
      img.src = `/img/neoncamelot/${n}.webp`;
    }
  }

  // ---------- Beelden op maat ----------
  // Elk beeld wordt per breedte (in stapjes) één keer verkleind: drawImage van een groot beeld kost veel op een Chromebook.
  const cache = new Map();
  function spr(name, wpx, flip) {
    const img = IMG[name];
    if (!img) return null;
    const w = Math.max(2, Math.round(wpx));
    const key = `${name}|${w}|${flip ? 1 : 0}|${gen}`;
    let c = cache.get(key);
    if (c) return c;
    // Groot verkleinen in stappen van de helft: dan blijft het beeld scherp.
    let src = img, sw = img.width, sh = img.height;
    while (sw > w * 2.2) {
      const half = mk(sw / 2, sh / 2);
      half.getContext('2d').drawImage(src, 0, 0, half.width, half.height);
      src = half; sw = half.width; sh = half.height;
    }
    c = mk(w, w * img.height / img.width);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    if (flip) { g.translate(c.width, 0); g.scale(-1, 1); }
    g.drawImage(src, 0, 0, c.width, c.height);
    if (cache.size > 600) cache.clear();
    cache.set(key, c);
    return c;
  }
  // Teken een beeld met de onderkant (min voetje) op (x, y) en breedte wpx.
  function zet(ctx, name, x, y, wpx, voet = 0, flip = false, alpha = 1) {
    const c = spr(name, wpx, flip);
    if (!c) return false;
    if (alpha < 1) ctx.globalAlpha = alpha;
    // Op hele pixels en op ware grootte: dat is een snelle kopie, zonder herschalen.
    ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height * (1 - voet)));
    if (alpha < 1) ctx.globalAlpha = 1;
    return true;
  }

  // ---------- De grond ----------
  const TEX = { [W.G.gras]: ['t-gras', 14, '#3f8f3a'], [W.G.weg]: ['t-weg', 10, '#3a4458'], [W.G.plein]: ['t-plein', 9, '#8d8270'], [W.G.water]: ['t-water', 18, '#1d6f86'] };
  const GR = W.STAD.grond;
  const gAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W.N || ty >= W.N ? -1 : GR[ty * W.N + tx]);
  // Eén stuk grond van CHUNK x CHUNK meter op S pixels per meter.
  // S en Sy: pixels per meter in de breedte en de diepte, zo gekozen dat een stuk precies een heel aantal pixels is.
  // voorwerpen: ook de gebouwen erin bakken (leerlingscherm), elk dat in dit stuk uitsteekt, van achter naar voor.
  function bakStuk(cx, cy, S, Sy, voorwerpen) {
    const CH = W.CHUNK, TI = W.TILE;
    const c = mk(Math.round(CH * S), Math.round(CH * Sy)), g = c.getContext('2d');
    g.fillStyle = '#123c4a';
    g.fillRect(0, 0, c.width, c.height);
    g.save();
    g.scale(S, Sy);
    g.translate(-cx * CH, -cy * CH);
    const t0x = cx * CH / TI, t0y = cy * CH / TI, n = CH / TI;
    // Tegels per soort, met het patroon vast aan de wereld (geen naden tussen stukken)
    for (const soort of [W.G.gras, W.G.plein, W.G.water, W.G.weg]) {
      const [naam, m, kleur] = TEX[soort];
      const img = IMG[naam];
      let fill = kleur;
      if (img) {
        const p = g.createPattern(img, 'repeat');
        const k = m / img.width;
        if (p.setTransform) p.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
        fill = p;
      }
      g.fillStyle = fill;
      g.beginPath();
      for (let ty = t0y; ty < t0y + n; ty++) for (let tx = t0x; tx < t0x + n; tx++) if (gAt(tx, ty) === soort) g.rect(tx * TI - .02, ty * TI - .02, TI + .04, TI + .04);
      g.fill();
    }
    // Randen: stoeprand langs de straat (cyaan neon), schuim langs het water, een donker randje rond het gras.
    // Zachte gloed: eerst breed en doorzichtig, dan de lijn zelf (shadowBlur is te traag)
    const rand = (soort, buur, kleur, breed, glow) => {
      const pad = () => { for (let ty = t0y; ty < t0y + n; ty++) for (let tx = t0x; tx < t0x + n; tx++) {
        if (gAt(tx, ty) !== soort) continue;
        const x = tx * TI, y = ty * TI;
        for (const [dx, dy, x1, y1, x2, y2] of [[0, -1, 0, 0, TI, 0], [0, 1, 0, TI, TI, TI], [-1, 0, 0, 0, 0, TI], [1, 0, TI, 0, TI, TI]]) {
          const b = gAt(tx + dx, ty + dy);
          if (b >= 0 && b !== soort && buur(b)) { g.moveTo(x + x1, y + y1); g.lineTo(x + x2, y + y2); }
        }
      } };
      g.strokeStyle = kleur;
      g.lineWidth = breed;
      if (glow) {
        g.strokeStyle = kleur.replace(/[\d.]+\)$/, '.18)');
        g.lineWidth = breed * 4;
        g.beginPath(); pad(); g.stroke();
        g.strokeStyle = kleur;
        g.lineWidth = breed;
      }
      g.beginPath();
      pad();
      g.stroke();
    };
    rand(W.G.water, b => b !== W.G.water, 'rgba(255,255,255,.55)', .35, .4);
    rand(W.G.weg, b => b !== W.G.weg, 'rgba(36,40,52,.9)', .5, 0);
    rand(W.G.weg, b => b !== W.G.weg, 'rgba(110,235,255,.8)', .14, .5);
    rand(W.G.gras, b => b === W.G.plein, 'rgba(40,30,20,.35)', .25, 0);
    // Middenlijn op de straten: gouden streepjes
    g.fillStyle = 'rgba(255,205,90,.7)';
    for (let ty = t0y; ty < t0y + n; ty++) for (let tx = t0x; tx < t0x + n; tx++) {
      if (gAt(tx, ty) !== W.G.weg) continue;
      const vx = W.isWeg(tx), vy = W.isWeg(ty);
      if (vx && vy) continue;
      if (vx && tx % W.BLOK === 11) for (const d of [.4, 2.4]) g.fillRect(tx * TI + TI - .1, ty * TI + d, .2, 1.2);
      if (vy && ty % W.BLOK === 11) for (const d of [.4, 2.4]) g.fillRect(tx * TI + d, ty * TI + TI - .1, 1.2, .2);
    }
    g.restore();
    if (voorwerpen) {
      const bx = cx * CH, by = cy * CH;
      for (const o of W.STAD.objs) {
        const r = rect(o, S, Sy);
        if (!r) continue;
        const lx = (o.x - bx) * S, ly = (W.front(o) - by) * Sy;
        if (lx + r.w / 2 < 0 || lx - r.w / 2 > c.width || ly + r.onder < 0 || ly - r.boven > c.height) continue;
        const s = W.SOORTEN[o.k];
        zet(g, s[0], lx, ly, s[1] * S, s[5]);
      }
    }
    return c;
  }
  // Hoe ver een voorwerp op het scherm uitsteekt rond zijn voorkant (in pixels).
  function rect(o, S) {
    const s = W.SOORTEN[o.k];
    const c = spr(s[0], s[1] * S);
    if (!c) return null;
    return { w: c.width, boven: c.height * (1 - s[5]), onder: c.height * s[5] };
  }
  const stukken = new Map();
  let stukS = 0;
  // De projectie: wereld (m) -> scherm (px). ox/oy zijn hele pixels, zodat gebakken stukken en losse beelden precies op elkaar passen.
  function proj(cam) {
    const CH = W.CHUNK;
    const S = Math.round(cam.S * CH) / CH, Sy = Math.round(cam.S * T * CH) / CH;
    return { S, Sy, ox: Math.floor(cam.w / 2 - cam.x * S), oy: Math.floor(cam.h / 2 - cam.y * Sy) };
  }
  function grond(ctx, cam, P) {
    grond.wacht = grond.wacht || 0;
    const { w, h } = cam;
    const { S, Sy, ox, oy } = P;
    const key = `${S}|${Sy}|${gen}`;
    if (key !== stukS) { stukken.clear(); stukS = key; }
    const CH = W.CHUNK;
    if (ox > 0 || oy > -CH * Sy || ox + W.L * S < w || oy + W.L * Sy < h) { ctx.fillStyle = '#123c4a'; ctx.fillRect(0, 0, w, h); }
    const c0 = Math.max(0, Math.floor(-ox / S / CH)), c1 = Math.min(W.NC - 1, Math.floor((w - ox) / S / CH));
    const r0 = Math.max(-1, Math.floor(-oy / Sy / CH)), r1 = Math.min(W.NC - 1, Math.floor((h - oy) / Sy / CH));
    let gebakken = 0;
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const k = cy * W.NC + cx;
        let c = stukken.get(k);
        if (!c) {
          c = bakStuk(cx, cy, S, Sy, true);
          gebakken++;
          stukken.set(k, c);
          if (stukken.size > 28) stukken.delete(stukken.keys().next().value);
        } else { stukken.delete(k); stukken.set(k, c); }
        ctx.drawImage(c, ox + Math.round(cx * CH * S), oy + Math.round(cy * CH * Sy));
      }
    }
    // Rustig moment: alvast een stuk ernaast bakken, dan hapert het niet als je verder rijdt.
    // Niet elk beeld: zo blijft het vloeiend terwijl je rijdt.
    if (!gebakken && ++grond.wacht % 6 === 0) {
      for (let cy = r0 - 1; cy <= r1 + 1 && !gebakken; cy++) for (let cx = c0 - 1; cx <= c1 + 1 && !gebakken; cx++) {
        if (cx < 0 || cy < -1 || cx >= W.NC || cy >= W.NC) continue;
        const k = cy * W.NC + cx;
        if (!stukken.has(k)) { stukken.set(k, bakStuk(cx, cy, S, Sy, true)); gebakken++; }
      }
    }
  }

  // ---------- De scène (wat de server stuurt) ----------
  class Scene {
    constructor() {
      this.spelers = new AK.Interp(90);
      this.gnomen = new AK.Interp(90);
      this.wereld = null;
      this.onEvent = null;
      this.spuit = []; // {n, t}
      this.vangst = []; // {x, y, t}
    }
    apply(msg) {
      const t = performance.now();
      for (const p of msg.p) this.spelers.push(p[0], [p[1] / 10, p[2] / 10, 0, p[3], p[4], p[5]], t);
      this.spelers.prune(t, 1500);
      for (const g of msg.g) this.gnomen.push(g[0], [g[1] / 10, g[2] / 10, 0], t);
      this.gnomen.prune(t, 300);
      if (msg.w) this.wereld = msg.w;
      for (const e of msg.ev) {
        if (e[0] === 'b') this.spuit.push({ n: e[1], t: t / 1000 });
        else if (e[0] === 'c' && this.wereld && this.wereld.regen) {
          const s = this.wereld.regen.stukjes, i = s.findIndex(x => x[0] === e[1]);
          if (i >= 0) { this.vangst.push({ x: s[i][1], y: s[i][2], t: t / 1000, kleur: '#7ff3ff' }); s.splice(i, 1); }
        } else if (e[0] === 'k') {
          const g = this.gnomen.get(e[1], t);
          if (g) this.vangst.push({ x: g[0], y: g[1], t: t / 1000, kleur: '#ffc94a', gnoom: true });
        }
        if (this.onEvent) this.onEvent(e);
      }
    }
    speler(n, t = performance.now()) { return this.spelers.get(n, t); }
  }

  // ---------- Voertuigen ----------
  const VBEELD = ['v-paard', 'v-board', 'v-kar', 'v-griffioen'];
  const VBREED = [4.2, 3.6, 4, 5.6];
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  function rijder(ctx, x, y, S, veh, flags, dir, kleur, t, n, groot) {
    const vlieg = W.VOERTUIGEN[veh].vliegt;
    const hoog = vlieg ? (3.2 + Math.sin(t * 2.4 + n) * .35) * S : veh === 1 ? (.35 + Math.sin(t * 5 + n) * .12) * S : 0;
    // Schaduw en ring in de kleur van de leerling
    ctx.fillStyle = 'rgba(0,0,0,.32)';
    ctx.beginPath(); ctx.ellipse(x, y, 1.6 * S * (vlieg ? .8 : 1), 1.6 * S * T * (vlieg ? .8 : 1), 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = kleur;
    ctx.lineWidth = Math.max(2, S * .22);
    ctx.beginPath(); ctx.ellipse(x, y, 1.9 * S, 1.9 * S * T, 0, 0, Math.PI * 2); ctx.stroke();
    const wpx = VBREED[veh] * S * (groot || 1);
    // Rakettenkar: vlammetje als hij rijdt; hoverboard: gloed onder
    if (veh === 1) {
      const gr = ctx.createRadialGradient(x, y - hoog * .3, 0, x, y - hoog * .3, S * 1.6);
      gr.addColorStop(0, 'rgba(110,240,255,.55)'); gr.addColorStop(1, 'rgba(110,240,255,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - hoog * .3, S * 1.6, S * 1.6 * T, 0, 0, Math.PI * 2); ctx.fill();
    }
    const leeg = flags & 2;
    if (!zet(ctx, VBEELD[veh], x, y - hoog, wpx, .04, dir < 0, leeg ? .75 : 1)) {
      ctx.fillStyle = kleur; ctx.beginPath(); ctx.arc(x, y - S, S, 0, Math.PI * 2); ctx.fill();
    }
    return y - hoog - wpx * .9;
  }
  function label(ctx, text, x, y, kleur, fs, ik) {
    ctx.font = `800 ${fs}px "Exo 2", sans-serif`;
    const w = ctx.measureText(text).width + fs * .9, h = fs * 1.45;
    ctx.fillStyle = 'rgba(8,10,20,.72)';
    AK.roundRect(ctx, x - w / 2, y - h, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = kleur;
    ctx.lineWidth = ik ? 2.5 : 1.5;
    ctx.stroke();
    ctx.fillStyle = ik ? '#ffffff' : kleur;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y - h / 2 + 1);
  }

  // ---------- Effecten ----------
  function kristal(ctx, x, y, r, t, k) {
    const b = Math.sin(t * 4 + k) * r * .25;
    const gr = ctx.createRadialGradient(x, y - r * 1.6 + b, 0, x, y - r * 1.6 + b, r * 2.2);
    gr.addColorStop(0, 'rgba(160,250,255,.75)'); gr.addColorStop(1, 'rgba(90,230,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y - r * 1.6 + b, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7ff3ff';
    ctx.beginPath(); ctx.moveTo(x, y - r * 2.7 + b); ctx.lineTo(x + r * .7, y - r * 1.6 + b); ctx.lineTo(x, y - r * .5 + b); ctx.lineTo(x - r * .7, y - r * 1.6 + b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.moveTo(x, y - r * 2.7 + b); ctx.lineTo(x + r * .25, y - r * 1.6 + b); ctx.lineTo(x, y - r * 1.4 + b); ctx.closePath(); ctx.fill();
  }
  function baken(ctx, x, y, S, kleur, t) {
    const h = S * 26;
    const gr = ctx.createLinearGradient(0, y - h, 0, y);
    gr.addColorStop(0, rgba(kleur, 0)); gr.addColorStop(1, rgba(kleur, .55));
    ctx.fillStyle = gr;
    ctx.fillRect(x - S * .9, y - h, S * 1.8, h);
    ctx.strokeStyle = kleur;
    ctx.lineWidth = Math.max(2, S * .25);
    const k = (t * .8) % 1;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath(); ctx.ellipse(x, y, S * (2 + k * 3), S * (2 + k * 3) * T, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.ellipse(x, y, S * 2.2, S * 2.2 * T, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // Een pijl aan de rand van het scherm naar een doel buiten beeld.
  function pijl(ctx, cam, P, tx, ty, kleur, tekst, fs) {
    const { w, h } = cam;
    const px = P.ox + tx * P.S, py = P.oy + ty * P.Sy;
    fs *= 1.5;
    const m = fs * 2.2;
    if (px > m && px < w - m && py > m * 1.4 && py < h - m) return;
    const a = Math.atan2(py - h / 2, px - w / 2);
    const k = Math.min((w / 2 - m) / Math.max(1e-3, Math.abs(Math.cos(a))), (h / 2 - m * 1.2) / Math.max(1e-3, Math.abs(Math.sin(a))));
    const x = w / 2 + Math.cos(a) * k, y = h / 2 + Math.sin(a) * k;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = kleur;
    ctx.shadowColor = kleur; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(fs * 1.3, 0); ctx.lineTo(-fs * .6, -fs * .85); ctx.lineTo(-fs * .25, 0); ctx.lineTo(-fs * .6, fs * .85); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (tekst) label(ctx, tekst, x - Math.cos(a) * fs * 2.2, y - Math.sin(a) * fs * 1.6 + fs * .7, kleur, fs * .8);
  }

  // ---------- Alles tekenen ----------
  // opts: { t, me, roster, missie, fs, board, stil }
  function render(ctx, scene, cam, opts) {
    const { w, h } = cam;
    const t = opts.t;
    const P = proj(cam);
    const S = P.S, Sy = P.Sy;
    const sx = x => P.ox + x * S;
    const sy = y => P.oy + y * Sy;
    if (cam.bake) bord(ctx, cam); else grond(ctx, cam, P);
    const now = performance.now();
    const x0 = cam.x - w / 2 / S - 16, x1 = cam.x + w / 2 / S + 16, y0 = cam.y - h / 2 / (S * T) - 4, y1 = cam.y + h / 2 / (S * T) + 30;
    const lijst = [];
    const wereld = scene.wereld || {};
    const brandO = wereld.brand ? wereld.brand.o : -1;
    // De vaste voorwerpen zitten al in de gebakken grond. Alleen wat vóór iets bewegends staat, tekenen we opnieuw
    // (zo rijdt een ridder netjes achter een huis), plus het huis dat brandt.
    const opnieuw = new Set();
    if (brandO >= 0) opnieuw.add(W.STAD.objs[brandO]);
    // Missieplekken
    W.STAD.markers.forEach((m, i) => { if (m.x > x0 && m.x < x1 && m.y > y0 && m.y < y1) lijst.push([m.y, 1, m, i]); });
    // Kristalregen
    if (wereld.regen) for (const s of wereld.regen.stukjes) if (s[1] > x0 && s[1] < x1) lijst.push([s[2], 2, s]);
    // Gnomen
    for (const i of scene.gnomen.ids()) { const g = scene.gnomen.get(i, now); if (g) lijst.push([g[1], 3, g, i]); }
    // Spelers
    for (const n of scene.spelers.ids()) { const p = scene.spelers.get(n, now); if (p && p[0] > x0 && p[0] < x1) lijst.push([p[1] + (W.VOERTUIGEN[p[3]].vliegt ? 20 : 0), 4, p, n]); }
    if (!cam.bake) {
      for (const it of lijst) {
        const ex = it[1] === 2 ? it[2][1] : it[1] === 1 ? it[2].x : it[2][0], ey = it[0] - (it[1] === 4 && W.VOERTUIGEN[it[2][3]].vliegt ? 20 : 0);
        const X = sx(ex), Y = sy(ey), r0 = X - S * 3.2, r1 = X + S * 3.2, t0 = Y - S * (it[1] === 4 && W.VOERTUIGEN[it[2][3]].vliegt ? 9 : 6.5);
        const cx = Math.floor(ex / W.CHUNK);
        for (let cy = Math.max(0, Math.floor(ey / W.CHUNK)); cy <= Math.min(W.NC - 1, Math.floor((ey + 34) / W.CHUNK)); cy++) {
          for (let c = Math.max(0, cx - 1); c <= Math.min(W.NC - 1, cx + 1); c++) {
            for (const o of W.PER_STUK[cy * W.NC + c]) {
              const f = W.front(o);
              if (f <= ey || opnieuw.has(o)) continue;
              const r = rect(o, S);
              if (!r) continue;
              const OX = sx(o.x), OY = sy(f);
              if (OX + r.w / 2 < r0 || OX - r.w / 2 > r1 || OY - r.boven > Y + S || OY + r.onder < t0) continue;
              opnieuw.add(o);
            }
          }
        }
      }
    }
    for (const o of opnieuw) lijst.push([W.front(o), 0, o]);
    lijst.sort((a, b) => a[0] - b[0]);
    const fs = opts.fs || 12;
    const namen = [];
    const mijnMissie = opts.missie;
    for (const it of lijst) {
      const soort = it[1];
      if (soort === 0) {
        const o = it[2], s = W.SOORTEN[o.k];
        let x = sx(o.x), y = sy(W.front(o));
        if (o.deco) y += Math.sin(t * 1.6 + o.x) * S * .15;
        zet(ctx, s[0], x, y, s[1] * S, s[5]);
        if (o.i === brandO) brand(ctx, x, y, s, S, t, wereld.brand);
      } else if (soort === 1) {
        const m = it[2], x = sx(m.x), y = sy(m.y);
        const dim = mijnMissie || (opts.cool > 0);
        ctx.fillStyle = dim ? 'rgba(255,201,74,.1)' : 'rgba(255,201,74,.22)';
        ctx.beginPath(); ctx.ellipse(x, y, S * 5.5, S * 5.5 * T, 0, 0, Math.PI * 2); ctx.fill();
        if (!dim) {
          ctx.strokeStyle = 'rgba(255,214,110,.85)';
          ctx.lineWidth = Math.max(1.5, S * .14);
          ctx.setLineDash([S * .9, S * .6]);
          ctx.lineDashOffset = -t * S * 2;
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const b = Math.sin(t * 3 + it[3]) * S * .3;
        zet(ctx, 'marker', x, y - S * 1.2 + b, S * (cam.bake ? 3.4 : 3.1), 0, false, dim ? .45 : 1);
        if (!cam.bake && !dim) namen.push([m.soort === 'race' ? '🏁 Race' : '📦 Koerier', x, y - S * 7.6 + b, '#ffc94a', fs]);
      } else if (soort === 2) {
        const s = it[2];
        kristal(ctx, sx(s[1]), sy(s[2]), S * .7, t, s[0]);
      } else if (soort === 3) {
        const g = it[2], x = sx(g[0]), y = sy(g[1]);
        const hop = Math.abs(Math.sin(t * 9 + it[3])) * S * .4;
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(x, y, S * .8, S * .8 * T, 0, 0, Math.PI * 2); ctx.fill();
        const vorige = scene.gnomen.get(it[3], now - 120);
        const flip = vorige ? g[0] < vorige[0] : false;
        zet(ctx, 'gnoom', x, y - hop, S * (cam.bake ? 3.2 : 2), .02, flip);
      } else {
        const [px, py, , veh, flags, dir] = it[2], n = it[3];
        const who = opts.roster && opts.roster.get(n);
        const kleur = (who && who.color) || '#4cc9ff';
        const x = sx(px), y = sy(py);
        const top = rijder(ctx, x, y, S, veh, flags, dir, kleur, t, n, cam.bake ? 1.6 : 1);
        if (flags & 4) zet(ctx, 'pakket', x - dir * S * .6, top + S * 1.4, S * 1.5);
        // Blussen: de waterdraak vliegt even mee en spuit naar de brand
        const sp = scene.spuit.find(s => s.n === n && t - s.t < 1.4);
        if (sp && wereld.brand) {
          const bx = sx(wereld.brand.x), by = sy(wereld.brand.y) - S * 6;
          const k = (t - sp.t) / 1.4;
          zet(ctx, 'waterdraak', x - dir * S * 2.5, y - S * 3.5, S * 3.6, 0, bx < x);
          ctx.strokeStyle = 'rgba(140,230,255,.8)';
          ctx.lineWidth = S * .5 * (1 - k);
          ctx.beginPath(); ctx.moveTo(x - dir * S * 2.5, y - S * 5); ctx.quadraticCurveTo((x + bx) / 2, Math.min(y, by) - S * 6, bx, by); ctx.stroke();
        }
        if (who) namen.push([who.name, x, top - S * .2, kleur, fs, n === opts.me, flags]);
      }
    }
    // Zeppelins drijven boven de stad
    for (let i = 0; i < 2; i++) {
      const zx = ((t * 2.2 + i * 150) % (W.L + 120)) - 60, zy = 60 + i * 120;
      if (zx < x0 - 20 || zx > x1 + 20) continue;
      ctx.fillStyle = 'rgba(0,0,0,.14)';
      ctx.beginPath(); ctx.ellipse(sx(zx), sy(zy), S * 4.5, S * 4.5 * T, 0, 0, Math.PI * 2); ctx.fill();
      zet(ctx, 'zeppelin', sx(zx), sy(zy) - S * 30, S * 10, 0, true, .9);
    }
    // Opgeraapte kristallen en gevangen gnomen: een ringetje en wat vonken
    for (let i = scene.vangst.length - 1; i >= 0; i--) {
      const v = scene.vangst[i], k = (t - v.t) / .7;
      if (k >= 1) { scene.vangst.splice(i, 1); continue; }
      ctx.strokeStyle = v.kleur; ctx.globalAlpha = 1 - k; ctx.lineWidth = Math.max(2, S * .3);
      ctx.beginPath(); ctx.ellipse(sx(v.x), sy(v.y) - S, S * (1 + k * 3), S * (1 + k * 3) * T, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = scene.spuit.length - 1; i >= 0; i--) if (t - scene.spuit[i].t > 1.5) scene.spuit.splice(i, 1);
    // Mijn missie: ringen of het baken, en een pijl als het buiten beeld is
    if (mijnMissie) {
      if (mijnMissie.soort === 'race') {
        mijnMissie.ringen.forEach(([rx, ry], i) => {
          if (i < mijnMissie.ri) return;
          const volgende = i === mijnMissie.ri;
          const pulse = volgende ? 1 + Math.sin(t * 6) * .06 : .8;
          zet(ctx, 'ring', sx(rx), sy(ry) + S * .4, S * 5.2 * pulse, 0, false, volgende ? 1 : .35);
        });
        const [rx, ry] = mijnMissie.ringen[mijnMissie.ri] || [0, 0];
        pijl(ctx, cam, P, rx, ry, '#5ae6ff', `🏁 ${mijnMissie.ri + 1}/${mijnMissie.ringen.length}`, fs);
      } else {
        baken(ctx, sx(mijnMissie.tx), sy(mijnMissie.ty), S, '#ffc94a', t);
        pijl(ctx, cam, P, mijnMissie.tx, mijnMissie.ty, '#ffc94a', '📦', fs);
      }
    }
    if (wereld.brand && !cam.bake) pijl(ctx, cam, P, wereld.brand.x, wereld.brand.y, '#ff7a3d', '🔥', fs);
    // Namen bovenaan
    for (const [text, x, y, kleur, f, ik, flags] of namen) {
      label(ctx, (flags & 1) ? `❓ ${text}` : (flags & 2) ? `⚡ ${text}` : text, x, y, kleur, f, ik);
    }
    // Mijn ridder achter een gebouw: een schim erover, zodat je jezelf nooit kwijt bent
    if (opts.me !== undefined && !cam.bake) {
      const p = scene.spelers.get(opts.me, now);
      if (p) {
        ctx.globalAlpha = .35;
        rijder(ctx, sx(p[0]), sy(p[1]), S, p[3], p[4], p[5], '#ffffff', t, opts.me);
        ctx.globalAlpha = 1;
      }
    }
  }

  function brand(ctx, x, y, s, S, t, b) {
    const wpx = s[1] * S * .8;
    const f = 1 + Math.sin(t * 13) * .05;
    ctx.save();
    ctx.translate(x, y - s[1] * S * .55);
    ctx.scale(1, f);
    zet(ctx, 'vuur', 0, 0, wpx * (1 + Math.sin(t * 7) * .04));
    ctx.restore();
    if (b) AK.bar(ctx, x, y - s[1] * S * 1.25, Math.max(40, S * 8), b.hp / b.max, '#5ae6ff');
  }

  // ---------- Het bord: de hele stad één keer gebakken ----------
  let bordLaag = null;
  function bord(ctx, cam) {
    const key = `${cam.w}|${cam.h}|${cam.S}|${cam.x}|${cam.y}|${gen}`;
    if (!bordLaag || bordLaag.key !== key) {
      const c = mk(cam.w, cam.h), g = c.getContext('2d');
      const P = proj(cam);
      // Grond op de juiste schaal in één keer (alle stukken)
      g.fillStyle = '#123c4a';
      g.fillRect(0, 0, cam.w, cam.h);
      for (let cy = 0; cy < W.NC; cy++) for (let cx = 0; cx < W.NC; cx++) {
        const st = bakStuk(cx, cy, P.S, P.Sy, false);
        g.drawImage(st, P.ox + Math.round(cx * W.CHUNK * P.S), P.oy + Math.round(cy * W.CHUNK * P.Sy));
      }
      for (const o of W.STAD.objs) {
        const s = W.SOORTEN[o.k];
        zet(g, s[0], P.ox + o.x * P.S, P.oy + W.front(o) * P.Sy, s[1] * P.S, s[5]);
      }
      bordLaag = { key, c };
    }
    ctx.drawImage(bordLaag.c, 0, 0);
  }

  // ---------- Kaartje in de hoek ----------
  let kaart = null;
  function kaartje() {
    if (kaart && kaart.gen === gen) return kaart;
    const n = W.N, c = mk(n * 2, n * 2), g = c.getContext('2d');
    const kl = { [W.G.gras]: '#3c7d3a', [W.G.weg]: '#2a3245', [W.G.plein]: '#8a7d68', [W.G.water]: '#1c6c86' };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = W.STAD.massief[y * n + x] ? '#5b4c3e' : kl[GR[y * n + x]];
      g.fillRect(x * 2, y * 2, 2, 2);
    }
    c.gen = gen;
    kaart = c;
    return c;
  }
  function minimap(ctx, scene, x, y, size, opts) {
    const k = size / W.L;
    ctx.save();
    ctx.globalAlpha = .9;
    ctx.drawImage(kaartje(), x, y, size, size);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(90,230,255,.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, size, size);
    const wereld = scene.wereld || {};
    const dot = (px, py, r, kleur, rand) => { ctx.fillStyle = kleur; ctx.beginPath(); ctx.arc(x + px * k, y + py * k, r, 0, Math.PI * 2); ctx.fill(); if (rand) { ctx.strokeStyle = rand; ctx.lineWidth = 1.5; ctx.stroke(); } };
    if (!opts.missie) for (const m of W.STAD.markers) dot(m.x, m.y, Math.max(2, size * .018), '#ffc94a');
    if (wereld.brand) dot(wereld.brand.x, wereld.brand.y, Math.max(3, size * .03) * (1 + Math.sin(opts.t * 8) * .2), '#ff6a2a');
    if (opts.missie) {
      const m = opts.missie;
      const [tx, ty] = m.soort === 'race' ? (m.ringen[m.ri] || [0, 0]) : [m.tx, m.ty];
      dot(tx, ty, Math.max(3, size * .03), m.soort === 'race' ? '#5ae6ff' : '#ffc94a', '#fff');
    }
    for (const n of scene.spelers.ids()) {
      const p = scene.spelers.get(n);
      if (!p) continue;
      const c = ((opts.roster && opts.roster.get(n)) || {}).color || '#4cc9ff';
      dot(p[0], p[1], n === opts.me ? Math.max(3.5, size * .035) : Math.max(2, size * .02), c, n === opts.me ? '#fff' : null);
    }
    ctx.restore();
  }

  class Res {
    constructor(min = .6) { this.scale = 1; this.min = min; this.n = 0; this.t = 0; this.good = 0; }
    frame(dt) {
      this.n++;
      this.t += dt;
      if (this.t < 1.5) return;
      const fps = this.n / this.t;
      this.n = 0;
      this.t = 0;
      if (fps < 40 && this.scale > this.min) { this.scale = Math.max(this.min, this.scale * .85); this.good = 0; }
      else if (fps > 56 && this.scale < 1 && ++this.good >= 3) { this.scale = Math.min(1, this.scale + .1); this.good = 0; }
    }
    dpr(max) { return Math.min(max, window.devicePixelRatio || 1) * this.scale; }
  }

  return { Scene, render, minimap, laad, Res, IMG, klaar: () => gen };
})();
