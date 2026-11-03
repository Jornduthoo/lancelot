// Neon-Camelot tekenen, van bovenaf. De grond (met alles wat plat ligt en de schaduwen) wordt per stuk van 32 x 32 m één keer gebakken.
// De gebouwen leunen een beetje mee met de camera: het dak schuift weg van het midden van het scherm en je ziet de muren aan de kant
// naar het midden toe. Zo lijkt de stad 3D, met weinig werk: per gebouw twee muren en één dak.
// Jorns geschilderde beelden staan in /img/neoncamelot/. Ze laden pas als het spel start (laad()).
// Gebruikt NcWorld en AK (arena-kit.js).
const NcDraw = (() => {
  const W = NcWorld;
  const IMG = {};
  let gen = 0;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
  const BEELDEN = [...W.DAKEN, ...W.NEONDAK, 'burcht', 'boom', 'den', 'rots', 'fontein', 'kraam', 'kisten', 'lantaarn', 'boot',
    'muur-hout', 'muur-steen', 'muur-neon', ...W.VOERTUIGEN.map(v => v.beeld), ...W.AUTOS.map(a => a[0]), 'dief', 'dief-zak', 'drone',
    'gnoom', 'vuur', 'marker', 'waterdraak', 'pakket', 'zeppelin', 'turbo-v', 't-gras', 't-plein', 't-water', 't-weg'];
  let geladen = false;
  function laad(klaar) {
    if (geladen) return;
    geladen = true;
    let open = BEELDEN.length;
    for (const n of BEELDEN) {
      const img = new Image();
      img.onload = () => { IMG[n] = img; gen++; patronen.clear(); if (--open === 0 && klaar) klaar(); };
      img.onerror = () => { if (--open === 0 && klaar) klaar(); };
      img.src = `/img/neoncamelot/${n}.webp`;
    }
  }

  // ---------- Beelden op maat ----------
  // Elk beeld wordt per grootte één keer verkleind: drawImage van een groot beeld kost veel op een Chromebook.
  const cache = new Map();
  function spr(name, wpx, hpx) {
    const img = IMG[name];
    if (!img) return null;
    const w = Math.max(2, Math.round(wpx)), h = Math.max(2, Math.round(hpx || w * img.height / img.width));
    const key = `${name}|${w}|${h}|${gen}`;
    let c = cache.get(key);
    if (c) return c;
    let src = img, sw = img.width, sh = img.height;
    while (sw > w * 2.2 && sh > h * 2.2) {
      const half = mk(sw / 2, sh / 2);
      half.getContext('2d').drawImage(src, 0, 0, half.width, half.height);
      src = half; sw = half.width; sh = half.height;
    }
    c = mk(w, h);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    if (cache.size > 700) cache.clear();
    cache.set(key, c);
    return c;
  }
  // Een beeld gedraaid tekenen (voertuigen): het beeld kijkt naar rechts, lengte in pixels.
  function draai(ctx, name, x, y, a, lpx, alpha = 1, schaal = 1) {
    const c = spr(name, lpx);
    if (!c) return false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    if (schaal !== 1) ctx.scale(schaal, schaal);
    if (alpha < 1) ctx.globalAlpha = alpha;
    ctx.drawImage(c, -c.width / 2, -c.height / 2);
    ctx.restore();
    return true;
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

  // ---------- De grond ----------
  const CH = 32, NC = Math.ceil(W.L / CH);
  const TEX = { [W.G.gras]: ['t-gras', 14, '#3f8f3a'], [W.G.weg]: ['t-weg', 10, '#3a4458'], [W.G.plein]: ['t-plein', 9, '#8d8270'], [W.G.water]: ['t-water', 18, '#1d6f86'] };
  const GR = W.STAD.grond;
  const gAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W.N || ty >= W.N ? -1 : GR[ty * W.N + tx]);
  // Eén stuk grond van CH x CH meter op S pixels per meter (S zo gekozen dat een stuk een heel aantal pixels is).
  function bakStuk(cx, cy, S) {
    const TI = W.TILE;
    const c = mk(Math.round(CH * S), Math.round(CH * S)), g = c.getContext('2d');
    g.fillStyle = '#123c4a';
    g.fillRect(0, 0, c.width, c.height);
    g.save();
    g.scale(S, S);
    g.translate(-cx * CH, -cy * CH);
    const t0x = cx * CH / TI, t0y = cy * CH / TI, n = CH / TI;
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
    // Randen: stoeprand langs de straat (cyaan neon), schuim langs het water.
    const rand = (soort, buur, kleur, breed, glow) => {
      const pad = () => { for (let ty = t0y; ty < t0y + n; ty++) for (let tx = t0x; tx < t0x + n; tx++) {
        if (gAt(tx, ty) !== soort) continue;
        const x = tx * TI, y = ty * TI;
        for (const [dx, dy, x1, y1, x2, y2] of [[0, -1, 0, 0, TI, 0], [0, 1, 0, TI, TI, TI], [-1, 0, 0, 0, 0, TI], [1, 0, TI, 0, TI, TI]]) {
          const b = gAt(tx + dx, ty + dy);
          if (b >= 0 && b !== soort && buur(b)) { g.moveTo(x + x1, y + y1); g.lineTo(x + x2, y + y2); }
        }
      } };
      if (glow) {
        g.strokeStyle = kleur.replace(/[\d.]+\)$/, '.18)');
        g.lineWidth = breed * 4;
        g.beginPath(); pad(); g.stroke();
      }
      g.strokeStyle = kleur;
      g.lineWidth = breed;
      g.beginPath(); pad(); g.stroke();
    };
    rand(W.G.water, b => b !== W.G.water, 'rgba(255,255,255,.55)', .35, .4);
    rand(W.G.weg, b => b !== W.G.weg, 'rgba(36,40,52,.9)', .5, 0);
    rand(W.G.weg, b => b !== W.G.weg, 'rgba(110,235,255,.85)', .16, .5);
    // Middenlijn: gouden streepjes
    g.fillStyle = 'rgba(255,205,90,.75)';
    for (let ty = t0y; ty < t0y + n; ty++) for (let tx = t0x; tx < t0x + n; tx++) {
      if (gAt(tx, ty) !== W.G.weg) continue;
      const vx = W.isWeg(tx), vy = W.isWeg(ty);
      if (vx && vy) continue;
      if (vx && tx % W.BLOK === 11) for (const d of [.4, 2.4]) g.fillRect(tx * TI + TI - .1, ty * TI + d, .2, 1.2);
      if (vy && ty % W.BLOK === 11) for (const d of [.4, 2.4]) g.fillRect(tx * TI + d, ty * TI + TI - .1, 1.2, .2);
    }
    const bx0 = cx * CH, by0 = cy * CH;
    const bij = (x, y, m) => x > bx0 - m && x < bx0 + CH + m && y > by0 - m && y < by0 + CH + m;
    // Schaduwen van de gebouwen en bomen (de zon staat linksboven)
    g.fillStyle = 'rgba(10,14,30,.32)';
    for (const o of W.STAD.gebouwen) {
      if (!bij(o.x, o.y, 30)) continue;
      const dx = Math.min(5, o.h * .22), dy = Math.min(6, o.h * .3);
      g.beginPath();
      if (o.soort === 'rond') g.ellipse(o.x + dx * .6, o.y + dy * .6, o.r, o.r, 0, 0, Math.PI * 2);
      else { g.moveTo(o.x0, o.y0); g.lineTo(o.x1, o.y0); g.lineTo(o.x1 + dx, o.y0 + dy); g.lineTo(o.x1 + dx, o.y1 + dy); g.lineTo(o.x0 + dx, o.y1 + dy); g.lineTo(o.x0, o.y1); g.closePath(); }
      g.fill();
    }
    // Turboplaten en schansen
    for (const tp of W.TURBO) {
      if (!bij(tp.x, tp.y, 5) || !IMG['turbo-v']) continue;
      g.drawImage(IMG['turbo-v'], tp.x - 2.6, tp.y - 3.4, 5.2, 6.8);
    }
    for (const sc of W.SCHANSEN) if (bij(sc.x, sc.y, 4)) schans(g, sc);
    g.restore();
    // Wat plat op de grond staat: kramen, kisten, fonteinen, lantaarns, bootjes
    for (const o of W.STAD.platte) {
      if (!bij(o.x, o.y, 8)) continue;
      const c2 = spr(o.beeld, o.w * S, o.d * S);
      if (c2) g.drawImage(c2, Math.round((o.x - bx0 - o.w / 2) * S), Math.round((o.y - by0 - o.d / 2) * S));
    }
    return c;
  }
  // Een schans van bovenaf: een staalplaat met goud en lichtpijlen, de hoge kant in de rijrichting.
  function schans(g, sc) {
    const x0 = sc.x - 1.8, y0 = sc.y - 1.7;
    const gr = g.createLinearGradient(sc.x - 1.8 * sc.r, 0, sc.x + 1.8 * sc.r, 0);
    gr.addColorStop(0, '#4a5568'); gr.addColorStop(1, '#c7d2e0');
    g.fillStyle = gr; g.fillRect(x0, y0, 3.6, 3.4);
    g.fillStyle = '#e8b64a'; g.fillRect(x0, y0, 3.6, .3); g.fillRect(x0, y0 + 3.1, 3.6, .3);
    g.fillRect(sc.r > 0 ? x0 + 3.3 : x0, y0, .3, 3.4);
    g.strokeStyle = '#6ff3ff'; g.lineWidth = .28; g.lineCap = 'round';
    for (const k of [-.8, .3]) {
      const ax = sc.x + k * sc.r;
      g.beginPath(); g.moveTo(ax, sc.y - .9); g.lineTo(ax + .7 * sc.r, sc.y); g.lineTo(ax, sc.y + .9); g.stroke();
    }
    g.lineCap = 'butt';
  }
  const stukken = new Map();
  let stukS = 0;
  // De projectie: wereld (m) -> scherm (px). ox/oy zijn hele pixels, zodat gebakken stukken precies passen.
  function proj(cam) {
    const S = Math.round(cam.S * CH) / CH;
    return { S, ox: Math.floor(cam.w / 2 - cam.x * S), oy: Math.floor(cam.h / 2 - cam.y * S) };
  }
  function grond(ctx, cam, P) {
    grond.wacht = grond.wacht || 0;
    const { w, h } = cam;
    const { S, ox, oy } = P;
    const key = `${S}|${gen}`;
    if (key !== stukS) { stukken.clear(); stukS = key; }
    if (ox > 0 || oy > 0 || ox + W.L * S < w || oy + W.L * S < h) { ctx.fillStyle = '#123c4a'; ctx.fillRect(0, 0, w, h); }
    const c0 = Math.max(0, Math.floor(-ox / S / CH)), c1 = Math.min(NC - 1, Math.floor((w - ox) / S / CH));
    const r0 = Math.max(0, Math.floor(-oy / S / CH)), r1 = Math.min(NC - 1, Math.floor((h - oy) / S / CH));
    let gebakken = 0;
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const k = cy * NC + cx;
        let c = stukken.get(k);
        if (!c) {
          c = bakStuk(cx, cy, S);
          gebakken++;
          stukken.set(k, c);
          if (stukken.size > 30) stukken.delete(stukken.keys().next().value);
        } else { stukken.delete(k); stukken.set(k, c); }
        ctx.drawImage(c, ox + Math.round(cx * CH * S), oy + Math.round(cy * CH * S));
      }
    }
    // Rustig moment: alvast een stuk ernaast bakken, dan hapert het niet als je verder rijdt.
    if (!gebakken && ++grond.wacht % 5 === 0) {
      for (let cy = r0 - 1; cy <= r1 + 1 && !gebakken; cy++) for (let cx = c0 - 1; cx <= c1 + 1 && !gebakken; cx++) {
        if (cx < 0 || cy < 0 || cx >= NC || cy >= NC) continue;
        const k = cy * NC + cx;
        if (!stukken.has(k)) { stukken.set(k, bakStuk(cx, cy, S)); gebakken++; }
      }
    }
  }

  // ---------- Gebouwen die meeleunen ----------
  const patronen = new Map();
  // Een muurpatroon, al wat donkerder gemaakt voor muren in de schaduw (één keer per grootte).
  function patroon(ctx, naam, S, donker) {
    const key = `${naam}|${S}|${donker}`;
    let p = patronen.get(key);
    if (p === undefined) {
      const img = IMG[naam];
      // Eén rij ramen is ongeveer 3,3 m hoog
      const c0 = img ? spr(naam, 9.9 * S * img.width / img.height, 9.9 * S) : null;
      let c = null;
      if (c0) {
        c = mk(c0.width, c0.height);
        const g = c.getContext('2d');
        g.drawImage(c0, 0, 0);
        g.fillStyle = `rgba(8,10,24,${donker})`;
        g.fillRect(0, 0, c.width, c.height);
      }
      p = c ? ctx.createPattern(c, 'repeat') : null;
      patronen.set(key, p);
    }
    return p;
  }
  // Teken één gebouw. cx, cy = waar de camera op het scherm staat (px). bake = alles naar het midden toe leunen (bord).
  // Het dak schuift weg van het midden (zoals bij een echte camera), en wordt een heel klein beetje groter.
  function gebouw(ctx, o, P, cx, cy, brandt) {
    const S = P.S, f = o.h / W.CAM_H, k = 1 + o.h / 260;
    const scr = (x, y) => [P.ox + x * S, P.oy + y * S];
    const mx = P.ox + o.x * S, my = P.oy + o.y * S;
    const dx = (mx - cx) * f, dy = (my - cy) * f;
    const lean = (X, Y) => [mx + dx + (X - mx) * k, my + dy + (Y - my) * k];
    if (o.soort === 'rond') {
      const RX = mx + dx, RY = my + dy;
      const d = o.r * 2 * S * k * 1.12;
      const c = spr(o.dak, d, d);
      if (c) ctx.drawImage(c, Math.round(RX - c.width / 2), Math.round(RY - c.height / 2));
      return;
    }
    const [fx0, fy0] = scr(o.x0, o.y0), [fx1, fy1] = scr(o.x1, o.y1);
    const [rx0, ry0] = lean(fx0, fy0), [rx1, ry1] = lean(fx1, fy1);
    // De muren aan de kant naar de camera toe
    const muur = (pts, donker, ankX, ankY) => {
      const p = patroon(ctx, o.muur, S, donker);
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]); ctx.lineTo(pts[2], pts[3]); ctx.lineTo(pts[4], pts[5]); ctx.lineTo(pts[6], pts[7]); ctx.closePath();
      if (p) { if (p.setTransform) p.setTransform(new DOMMatrix([1, 0, 0, 1, Math.round(ankX), Math.round(ankY)])); ctx.fillStyle = p; } else ctx.fillStyle = '#5b5560';
      ctx.fill();
    };
    if (fy1 > ry1) muur([fx0, fy1, fx1, fy1, rx1, ry1, rx0, ry1], .08, fx0, ry1);       // zuidmuur (onder)
    if (fy0 < ry0) muur([fx0, fy0, fx1, fy0, rx1, ry0, rx0, ry0], .4, fx0, fy0);        // noordmuur
    if (fx1 > rx1) muur([fx1, fy0, fx1, fy1, rx1, ry1, rx1, ry0], .26, rx1, fy0);       // oostmuur
    if (fx0 < rx0) muur([fx0, fy0, fx0, fy1, rx0, ry1, rx0, ry0], .26, fx0, fy0);       // westmuur
    const c = spr(o.dak, rx1 - rx0, ry1 - ry0);
    if (c) ctx.drawImage(c, Math.round(rx0), Math.round(ry0));
    else { ctx.fillStyle = '#7a5a48'; ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0); }
    // Een rand van licht langs de dakrand van de neontorens
    if (o.soort === 'neon') { ctx.strokeStyle = 'rgba(120,240,255,.55)'; ctx.lineWidth = Math.max(1, S * .12); ctx.strokeRect(rx0 + .5, ry0 + .5, rx1 - rx0 - 1, ry1 - ry0 - 1); }
    if (brandt) {
      const t = performance.now() / 1000, f = 1 + Math.sin(t * 13) * .06;
      const fw = (rx1 - rx0) * .9;
      const v = spr('vuur', fw);
      if (v) { ctx.save(); ctx.translate((rx0 + rx1) / 2, (ry0 + ry1) / 2); ctx.scale(f, f); ctx.drawImage(v, -v.width / 2, -v.height * .7); ctx.restore(); }
    }
  }
  // Het dak op het scherm (voor een brand, een label of het licht 's nachts)
  function dakMidden(o, P, cx, cy) {
    const f = o.h / W.CAM_H;
    const X = P.ox + o.x * P.S, Y = P.oy + o.y * P.S;
    return [X + (X - cx) * f, Y + (Y - cy) * f];
  }

  // ---------- De scène (wat de server stuurt) ----------
  class Scene {
    constructor() {
      this.spelers = new AK.Interp(100);
      this.gnomen = new AK.Interp(100);
      this.dieven = new AK.Interp(100);
      this.wereld = null;
      this.onEvent = null;
      this.spuit = []; // {n, t}
      this.vangst = []; // {x, y, t}
      this.sporen = []; // remsporen [x1, y1, x2, y2, t]
    }
    apply(msg) {
      const t = performance.now();
      for (const p of msg.p) this.spelers.push(p[0], [p[1] / 10, p[2] / 10, p[3] / 100, p[4], p[5], p[6] / 10], t);
      this.spelers.prune(t, 1500);
      for (const g of msg.g) this.gnomen.push(g[0], [g[1] / 10, g[2] / 10, 0], t);
      this.gnomen.prune(t, 300);
      for (const d of msg.d || []) this.dieven.push(d[0], [d[1] / 10, d[2] / 10, d[3] / 100, d[4] / 100], t);
      this.dieven.prune(t, 300);
      if (msg.w) this.wereld = msg.w;
      for (const e of msg.ev) {
        if (e[0] === 'b') this.spuit.push({ n: e[1], t: t / 1000 });
        else if (e[0] === 'c' && this.wereld && this.wereld.regen) {
          const s = this.wereld.regen.stukjes, i = s.findIndex(x => x[0] === e[1]);
          if (i >= 0) { this.vangst.push({ x: s[i][1], y: s[i][2], t: t / 1000, kleur: '#7ff3ff' }); s.splice(i, 1); }
        } else if (e[0] === 'k') {
          const g = this.gnomen.get(e[1], t);
          if (g) this.vangst.push({ x: g[0], y: g[1], t: t / 1000, kleur: '#ffc94a' });
        }
        if (this.onEvent) this.onEvent(e);
      }
    }
    speler(n, t = performance.now()) { return this.spelers.get(n, t); }
    spoor(x1, y1, x2, y2) {
      this.sporen.push([x1, y1, x2, y2, performance.now() / 1000]);
      if (this.sporen.length > 500) this.sporen.splice(0, 100);
    }
  }

  // ---------- Voertuigen ----------
  // Een voertuig: schaduw, een ring in de kleur van de leerling, het beeld gedraaid. z = hoogte (sprong of vliegen).
  function rijder(ctx, x, y, S, a, veh, z, kleur, t, n, alpha = 1, groot = 1) {
    const V = W.VOERTUIGEN[veh];
    const vlieg = V.vliegt;
    const hoog = vlieg ? 3.5 + Math.sin(t * 2.4 + n) * .35 : z;
    const sch = 1 + hoog * .05;
    ctx.globalAlpha = alpha * .35;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x + hoog * S * .25, y + hoog * S * .35, V.lang * .42 * S * groot, V.lang * .28 * S * groot, a, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = kleur;
    ctx.lineWidth = Math.max(2, S * .2);
    ctx.beginPath(); ctx.arc(x, y, V.lang * .62 * S * groot * sch, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    if (!draai(ctx, V.beeld, x, y, a, V.lang * S * groot, alpha, sch)) {
      ctx.fillStyle = kleur; ctx.beginPath(); ctx.arc(x, y, S, 0, Math.PI * 2); ctx.fill();
    }
    return y - V.lang * .7 * S * groot * sch;
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
    return [x - w / 2 - 2, y - h - 2, w + 4, h + 4];
  }

  // ---------- Effecten ----------
  function kristal(ctx, x, y, r, t, k) {
    const b = Math.sin(t * 4 + k) * r * .2;
    const gr = ctx.createRadialGradient(x, y + b, 0, x, y + b, r * 2.2);
    gr.addColorStop(0, 'rgba(160,250,255,.75)'); gr.addColorStop(1, 'rgba(90,230,255,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y + b, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7ff3ff';
    ctx.beginPath(); ctx.moveTo(x, y - r + b); ctx.lineTo(x + r * .7, y + b); ctx.lineTo(x, y + r + b); ctx.lineTo(x - r * .7, y + b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.moveTo(x, y - r + b); ctx.lineTo(x + r * .25, y + b); ctx.lineTo(x, y + r * .2 + b); ctx.closePath(); ctx.fill();
  }
  // Een lichtring op de grond (racepoort of doel)
  function poort(ctx, x, y, r, kleur, t, sterk) {
    ctx.strokeStyle = kleur;
    ctx.lineWidth = Math.max(2, r * .12);
    ctx.globalAlpha = sterk ? 1 : .35;
    const k = (t * .9) % 1;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    if (sterk) {
      ctx.globalAlpha = 1 - k;
      ctx.beginPath(); ctx.arc(x, y, r * (1 + k * .6), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = .18;
      ctx.fillStyle = kleur;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // Een pijl aan de rand van het scherm naar een doel buiten beeld.
  function pijl(ctx, cam, P, tx, ty, kleur, tekst, fs) {
    const { w, h } = cam;
    const px = P.ox + tx * P.S, py = P.oy + ty * P.S;
    fs *= 1.5;
    const m = fs * 2.2;
    if (px > m && px < w - m && py > m * 1.4 && py < h - m) return null;
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
    return [x - fs * 3.5, y - fs * 2.5, fs * 7, fs * 5];
  }

  // ---------- Alles tekenen ----------
  // opts: { t, tt, me, ik (eigen kart: {x,y,a,z,veh}), roster, missie, fs, nacht (doek), gat }
  function render(ctx, scene, cam, opts) {
    const { w, h } = cam;
    const t = opts.t;
    const P = proj(cam);
    const S = P.S;
    const sx = x => P.ox + x * S;
    const sy = y => P.oy + y * S;
    const ccx = P.ox + cam.x * S, ccy = P.oy + cam.y * S;
    if (cam.bake) bord(ctx, cam, P); else grond(ctx, cam, P);
    const now = performance.now();
    const x0 = cam.x - w / 2 / S - 12, x1 = cam.x + w / 2 / S + 12, y0 = cam.y - h / 2 / S - 12, y1 = cam.y + h / 2 / S + 12;
    const zicht = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
    const wereld = scene.wereld || {};
    const fs = opts.fs || 12;
    // Remsporen
    const nu = now / 1000;
    if (scene.sporen.length) {
      ctx.strokeStyle = 'rgba(20,16,28,.42)';
      ctx.lineWidth = Math.max(1.5, S * .35);
      ctx.lineCap = 'round';
      ctx.beginPath();
      let weg = 0;
      for (const s of scene.sporen) {
        if (nu - s[4] > 8) { weg++; continue; }
        if (!zicht(s[0], s[1])) continue;
        ctx.moveTo(sx(s[0]), sy(s[1])); ctx.lineTo(sx(s[2]), sy(s[3]));
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
      if (weg) scene.sporen.splice(0, weg);
    }
    // Missieplekken
    const mijnMissie = opts.missie;
    const dim = mijnMissie || (opts.cool > 0);
    W.STAD.markers.forEach((m, i) => {
      if (!zicht(m.x, m.y)) return;
      const x = sx(m.x), y = sy(m.y);
      const kleur = m.soort === 'dief' ? '#c77dff' : m.soort === 'race' ? '#5ae6ff' : '#ffc94a';
      ctx.fillStyle = rgba(kleur, dim ? .08 : .2);
      ctx.beginPath(); ctx.arc(x, y, S * 5, 0, Math.PI * 2); ctx.fill();
      if (!dim) {
        ctx.strokeStyle = rgba(kleur, .9);
        ctx.lineWidth = Math.max(1.5, S * .16);
        ctx.setLineDash([S * .9, S * .6]);
        ctx.lineDashOffset = -t * S * 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
    // Kristalregen
    if (wereld.regen) for (const s of wereld.regen.stukjes) if (zicht(s[1], s[2])) kristal(ctx, sx(s[1]), sy(s[2]), S * .8, t, s[0]);
    // Gnomen
    for (const i of scene.gnomen.ids()) {
      const g = scene.gnomen.get(i, now);
      if (!g || !zicht(g[0], g[1])) continue;
      const x = sx(g[0]), y = sy(g[1]);
      const hop = Math.abs(Math.sin(t * 9 + i)) * S * .35;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(x, y + S * .5, S * .8, S * .5, 0, 0, Math.PI * 2); ctx.fill();
      const c = spr('gnoom', S * 2.2);
      if (c) ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height * .75 - hop));
    }
    // Verkeer
    const tt = opts.tt || 0;
    const autos = [];
    for (const c of W.VERKEER) {
      const a = W.autoOp(c, tt);
      if (!zicht(a.x, a.y)) continue;
      const A = W.AUTOS[c.a];
      autos.push(a);
      const x = sx(a.x), y = sy(a.y);
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath(); ctx.ellipse(x + S * .5, y + S * .7, A[1] * .5 * S, A[2] * .45 * S, a.a, 0, Math.PI * 2); ctx.fill();
      draai(ctx, A[0], x, y, a.a, A[1] * S);
    }
    // Glitchdieven
    for (const i of scene.dieven.ids()) {
      const d = scene.dieven.get(i, now);
      if (!d || !zicht(d[0], d[1])) continue;
      const x = sx(d[0]), y = sy(d[1]);
      // Glitchspoor
      for (let k = 1; k <= 4; k++) {
        ctx.fillStyle = `rgba(255,80,230,${.35 - k * .07})`;
        ctx.fillRect(x - Math.cos(d[2]) * S * k * 1.1 - S * .4 + Math.sin(t * 30 + k) * S * .3, y - Math.sin(d[2]) * S * k * 1.1 - S * .4, S * .8, S * .8);
      }
      if (i === opts.me && !cam.bake) {
        // Vangcirkel: blijf hierbinnen tot de balk vol is
        ctx.save();
        ctx.strokeStyle = `rgba(255,107,214,${.55 + Math.sin(t * 6) * .25})`;
        ctx.lineWidth = Math.max(2, S * .22);
        ctx.setLineDash([S * .9, S * .6]);
        ctx.beginPath(); ctx.arc(x, y, S * 7, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.save(); ctx.shadowColor = '#ff4fd8'; ctx.shadowBlur = Math.max(8, S * 1.4);
      draai(ctx, 'dief-zak', x, y, d[2], S * 5);
      ctx.restore();
      if (!cam.bake) AK.bar(ctx, x, y - S * 3, Math.max(40, S * 5), d[3], '#ff6bd6');
    }
    // Spelers op de grond (wie vliegt komt na de gebouwen)
    const namen = [], vliegers = [];
    const eigen = opts.ik;
    const spelers = [];
    for (const n of scene.spelers.ids()) {
      if (eigen && n === opts.me) continue;
      const p = scene.spelers.get(n, now);
      if (p && zicht(p[0], p[1])) spelers.push([n, p[0], p[1], p[2], p[3], p[4], p[5]]);
    }
    if (eigen) spelers.push([opts.me, eigen.x, eigen.y, eigen.a, eigen.veh, eigen.flags || 0, eigen.z || 0]);
    const tekenSpeler = (sp, alpha = 1) => {
      const [n, px, py, a, veh, flags, z] = sp;
      const who = opts.roster && opts.roster.get(n);
      const kleur = (who && who.color) || '#4cc9ff';
      const x = sx(px), y = sy(py);
      if (flags & 32) {
        // Nitro: een vlam achteraan
        ctx.fillStyle = 'rgba(120,230,255,.55)';
        ctx.beginPath(); ctx.ellipse(x - Math.cos(a) * S * 2.6, y - Math.sin(a) * S * 2.6, S * 1.6, S * .7, a, 0, Math.PI * 2); ctx.fill();
      }
      const top = rijder(ctx, x, y, S, a, veh, z, kleur, t, n, alpha, cam.bake ? 1.5 : 1);
      if (flags & 4) { const c = spr('pakket', S * 1.6); if (c) ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2)); }
      // Blussen: de waterdraak vliegt even mee en spuit naar de brand
      const spu = scene.spuit.find(s => s.n === n && t - s.t < 1.4);
      if (spu && wereld.brand) {
        const o = W.STAD.gebouwen[wereld.brand.o];
        const [bx, by] = o ? dakMidden(o, P, ccx, ccy) : [sx(wereld.brand.x), sy(wereld.brand.y)];
        const k = (t - spu.t) / 1.4;
        const c = spr('waterdraak', S * 3.6);
        if (c) ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - S * 4 - c.height / 2));
        ctx.strokeStyle = 'rgba(140,230,255,.85)';
        ctx.lineWidth = S * .5 * (1 - k);
        ctx.beginPath(); ctx.moveTo(x, y - S * 4); ctx.quadraticCurveTo((x + bx) / 2, Math.min(y, by) - S * 6, bx, by); ctx.stroke();
      }
      if (who) namen.push([who.name, x, top - S * .3, kleur, fs, n === opts.me, flags]);
    };
    for (const sp of spelers) {
      if (W.VOERTUIGEN[sp[4]] && W.VOERTUIGEN[sp[4]].vliegt) vliegers.push(sp);
      else tekenSpeler(sp);
    }
    // De gebouwen en bomen: van ver naar dichtbij het midden, zodat de dichtste muren bovenop liggen
    const brandO = wereld.brand ? wereld.brand.o : -1;
    if (!cam.bake) {
      const lijst = [];
      for (const o of W.STAD.gebouwen) {
        const ox = o.soort === 'rond' ? o.x : o.x, oy = o.y;
        if (ox < x0 - 6 || ox > x1 + 6 || oy < y0 - 6 || oy > y1 + 6) continue;
        lijst.push([Math.abs(ox - cam.x) + Math.abs(oy - cam.y), o]);
      }
      lijst.sort((a, b) => b[0] - a[0]);
      for (const [, o] of lijst) gebouw(ctx, o, P, ccx, ccy, o.i === brandO);
    } else if (brandO >= 0) gebouw(ctx, W.STAD.gebouwen[brandO], P, ccx, ccy, true);
    if (wereld.brand && !cam.bake) {
      const o = W.STAD.gebouwen[brandO];
      if (o) { const [bx, by] = dakMidden(o, P, ccx, ccy); AK.bar(ctx, bx, by - S * 4, Math.max(40, S * 8), wereld.brand.hp / wereld.brand.max, '#5ae6ff'); }
    }
    // Wie vliegt, zweeft boven de daken
    for (const sp of vliegers) tekenSpeler(sp);
    // Je eigen kart onder een dak? Dan een schim erover, zodat je jezelf nooit kwijt bent.
    if (eigen && !W.VOERTUIGEN[eigen.veh].vliegt) {
      ctx.globalAlpha = .3;
      draai(ctx, W.VOERTUIGEN[eigen.veh].beeld, sx(eigen.x), sy(eigen.y), eigen.a, W.VOERTUIGEN[eigen.veh].lang * S);
      ctx.globalAlpha = 1;
    }
    // Missiepinnen boven alles, zodat je ze altijd ziet
    W.STAD.markers.forEach((m, i) => {
      if (!zicht(m.x, m.y) || cam.bake) return;
      const x = sx(m.x), y = sy(m.y), b = Math.sin(t * 3 + i) * S * .3;
      const c = spr('marker', S * 3, null);
      if (c) { ctx.globalAlpha = dim ? .45 : 1; ctx.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height + b)); ctx.globalAlpha = 1; }
      if (!dim) namen.push([m.soort === 'race' ? '🏁 Race' : m.soort === 'dief' ? '🦹 Vang de dief' : '📦 Koerier', x, y - S * 4.2 + b, m.soort === 'dief' ? '#e2b6ff' : m.soort === 'race' ? '#8ff1ff' : '#ffc94a', fs]);
    });
    // Zeppelins drijven hoog boven de stad
    for (let i = 0; i < 2; i++) {
      const zx = ((t * 2.2 + i * 150) % (W.L + 120)) - 60, zy = 60 + i * 120;
      if (zx < x0 - 30 || zx > x1 + 30) continue;
      const X = sx(zx) + (sx(zx) - ccx) * .4, Y = sy(zy) + (sy(zy) - ccy) * .4;
      const c = spr('zeppelin', S * 12);
      if (c) { ctx.globalAlpha = .9; ctx.drawImage(c, Math.round(X - c.width / 2), Math.round(Y - c.height / 2)); ctx.globalAlpha = 1; }
    }
    // Opgeraapte kristallen en gevangen gnomen: een ringetje
    for (let i = scene.vangst.length - 1; i >= 0; i--) {
      const v = scene.vangst[i], k = (t - v.t) / .7;
      if (k >= 1) { scene.vangst.splice(i, 1); continue; }
      ctx.strokeStyle = v.kleur; ctx.globalAlpha = 1 - k; ctx.lineWidth = Math.max(2, S * .3);
      ctx.beginPath(); ctx.arc(sx(v.x), sy(v.y), S * (1 + k * 3), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let i = scene.spuit.length - 1; i >= 0; i--) if (t - scene.spuit[i].t > 1.5) scene.spuit.splice(i, 1);
    const gaten = [];
    // Mijn missie: ringen, het doel of de dief, en een pijl als het buiten beeld is
    if (mijnMissie) {
      if (mijnMissie.soort === 'race') {
        mijnMissie.ringen.forEach(([rx, ry], i) => {
          if (i < mijnMissie.ri || i > mijnMissie.ri + 2) return;
          poort(ctx, sx(rx), sy(ry), S * 4.2 * (i === mijnMissie.ri ? 1 + Math.sin(t * 6) * .05 : .8), '#5ae6ff', t, i === mijnMissie.ri);
        });
        const [rx, ry] = mijnMissie.ringen[mijnMissie.ri] || [0, 0];
        gaten.push(pijl(ctx, cam, P, rx, ry, '#5ae6ff', `🏁 ${mijnMissie.ri + 1}/${mijnMissie.ringen.length}`, fs));
      } else if (mijnMissie.soort === 'dief') {
        const d = scene.dieven.get(opts.me, now);
        if (d) gaten.push(pijl(ctx, cam, P, d[0], d[1], '#ff6bd6', '🦹', fs));
      } else {
        poort(ctx, sx(mijnMissie.tx), sy(mijnMissie.ty), S * 4.5, '#ffc94a', t, true);
        gaten.push(pijl(ctx, cam, P, mijnMissie.tx, mijnMissie.ty, '#ffc94a', '📦', fs));
      }
    }
    if (wereld.brand && !cam.bake) gaten.push(pijl(ctx, cam, P, wereld.brand.x, wereld.brand.y, '#ff7a3d', '🔥', fs));
    for (const [text, x, y, kleur, f, ik, flags] of namen) {
      gaten.push(label(ctx, (flags & 1) ? `❓ ${text}` : (flags & 2) ? `⚡ ${text}` : text, x, y, kleur, f, ik));
    }
    if (opts.nacht) nachtLaag(opts.nacht, cam, P, opts, scene, spelers, autos, [...gaten.filter(Boolean), ...(opts.gat ? [opts.gat] : [])], ccx, ccy);
  }

  // ---------- Dag en nacht ----------
  // 's Nachts wordt de stad donkerblauw en gaan de lantaarns, de neon, de koplampen en de ridders gloeien.
  const gloed = new Map();
  function gloedBeeld(kleur) {
    let c = gloed.get(kleur);
    if (c) return c;
    c = mk(64, 64);
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(kleur, .9)); gr.addColorStop(.35, rgba(kleur, .35)); gr.addColorStop(1, rgba(kleur, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    gloed.set(kleur, c);
    return c;
  }
  const NEONKL = ['#ff4fd8', '#4cf0ff', '#b46bff', '#ff8a3d'];
  // Alles gebeurt op een klein doek (een kwart van het scherm) dat de browser zelf vergroot over het spel legt:
  // donker, met gaten waar licht is, en wat kleur rond elk licht. Zo blijft de nacht snel op een Chromebook.
  function nachtLaag(doek, cam, P, opts, scene, spelers, autos, gaten, ccx, ccy) {
    const n = W.nacht(opts.tt || 0);
    const g = doek.getContext('2d');
    if (n < .02) {
      if (!doek.leeg) { g.clearRect(0, 0, doek.width, doek.height); doek.leeg = true; }
      return;
    }
    doek.leeg = false;
    const { w, h } = cam, S = P.S, K = 4;
    const lw = Math.ceil(w / K), lh = Math.ceil(h / K);
    if (doek.width !== lw || doek.height !== lh) { doek.width = lw; doek.height = lh; }
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, lw, lh);
    g.fillStyle = `rgba(8,10,40,${(.72 * n).toFixed(3)})`;
    g.fillRect(0, 0, lw, lh);
    const lichten = [];
    const schermLicht = (X, Y, R, kleur, sterk = 1) => {
      X /= K; Y /= K; R /= K;
      if (X < -R || X > lw + R || Y < -R || Y > lh + R) return;
      lichten.push([X - R, Y - R, R * 2, R * 2, kleur, sterk]);
    };
    const licht = (x, y, r, kleur, sterk) => schermLicht(P.ox + x * S, P.oy + y * S, r * S, kleur, sterk);
    const x0 = cam.x - w / 2 / S - 20, x1 = cam.x + w / 2 / S + 20, y0 = cam.y - h / 2 / S - 20, y1 = cam.y + h / 2 / S + 20;
    for (const o of W.STAD.platte) {
      if (o.x < x0 || o.x > x1 || o.y < y0 || o.y > y1) continue;
      if (o.beeld === 'lantaarn') licht(o.x, o.y, 6, '#ffc66b');
      else if (o.beeld === 'fontein') licht(o.x, o.y, 5, '#6fe9ff');
      else if (o.beeld === 'kraam') licht(o.x, o.y, 4.5, '#ffb347', .7);
    }
    for (const o of W.STAD.gebouwen) {
      if (o.x < x0 || o.x > x1 || o.y < y0 || o.y > y1 || o.soort === 'rond') continue;
      const [X, Y] = dakMidden(o, P, ccx, ccy);
      if (o.soort === 'neon') schermLicht(X, Y, 10 * S, NEONKL[o.i % 4]);
      else if (o.soort === 'burcht') schermLicht(X, Y, 18 * S, '#7fd8ff');
      else if (o.soort === 'toren') schermLicht(X, Y, 8 * S, '#c08bff');
      else schermLicht(X, Y, 5 * S, '#ffcf7a', .5);
    }
    for (const a of autos) {
      licht(a.x + Math.cos(a.a) * 4.5, a.y + Math.sin(a.a) * 4.5, 4.5, '#fff1b8', .8);
      licht(a.x, a.y, 3.5, '#5fe7ff', .6);
    }
    for (const [nn, px, py, a] of spelers) {
      const kleur = ((opts.roster && opts.roster.get(nn)) || {}).color || '#4cc9ff';
      licht(px, py, 5, kleur);
      licht(px + Math.cos(a) * 7, py + Math.sin(a) * 7, 6.5, '#fff1b8', .85);
    }
    const wereld = scene.wereld || {};
    if (wereld.regen) for (const s of wereld.regen.stukjes) licht(s[1], s[2], 3, '#7ff3ff');
    if (wereld.brand) licht(wereld.brand.x, wereld.brand.y, 14, '#ff8a3d');
    for (const m of W.STAD.markers) licht(m.x, m.y, 6, m.soort === 'dief' ? '#c77dff' : '#ffc94a');
    const mi = opts.missie;
    if (mi && mi.soort !== 'dief') {
      const [tx, ty] = mi.soort === 'race' ? (mi.ringen[mi.ri] || [0, 0]) : [mi.tx, mi.ty];
      licht(tx, ty, 7, mi.soort === 'race' ? '#5ae6ff' : '#ffc94a');
    }
    for (const i of scene.dieven.ids()) { const d = scene.dieven.get(i); if (d) licht(d[0], d[1], 6, '#ff6bd6'); }
    g.globalCompositeOperation = 'destination-out';
    const wit = gloedBeeld('#ffffff');
    for (const l of lichten) { g.globalAlpha = l[5]; g.drawImage(wit, l[0], l[1], l[2], l[3]); }
    g.globalAlpha = 1;
    g.fillStyle = '#000';
    for (const r of gaten) g.fillRect(r[0] / K, r[1] / K, r[2] / K, r[3] / K);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = .38 * n;
    for (const l of lichten) g.drawImage(gloedBeeld(l[4]), l[0], l[1], l[2], l[3]);
    g.globalAlpha = 1;
  }

  // ---------- Het bord: de hele stad één keer gebakken ----------
  let bordLaag = null;
  function bord(ctx, cam, P) {
    const key = `${cam.w}|${cam.h}|${cam.S}|${cam.x}|${cam.y}|${gen}`;
    if (!bordLaag || bordLaag.key !== key) {
      const c = mk(cam.w, cam.h), g = c.getContext('2d');
      g.fillStyle = '#123c4a';
      g.fillRect(0, 0, cam.w, cam.h);
      for (let cy = 0; cy < NC; cy++) for (let cx = 0; cx < NC; cx++) {
        const st = bakStuk(cx, cy, P.S);
        g.drawImage(st, P.ox + Math.round(cx * CH * P.S), P.oy + Math.round(cy * CH * P.S));
      }
      const ccx = P.ox + cam.x * P.S, ccy = P.oy + cam.y * P.S;
      const lijst = W.STAD.gebouwen.map(o => [Math.abs(o.x - cam.x) + Math.abs(o.y - cam.y), o]).sort((a, b) => b[0] - a[0]);
      for (const [, o] of lijst) gebouw(g, o, P, ccx, ccy, false);
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
      const m = W.STAD.massief[y * n + x];
      g.fillStyle = m === 1 ? '#6b5646' : m === 2 ? '#24572a' : kl[GR[y * n + x]];
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
    if (!opts.missie) for (const m of W.STAD.markers) dot(m.x, m.y, Math.max(2, size * .018), m.soort === 'dief' ? '#c77dff' : m.soort === 'race' ? '#5ae6ff' : '#ffc94a');
    if (wereld.brand) dot(wereld.brand.x, wereld.brand.y, Math.max(3, size * .03) * (1 + Math.sin(opts.t * 8) * .2), '#ff6a2a');
    if (opts.missie) {
      const m = opts.missie;
      if (m.soort === 'dief') { const d = scene.dieven.get(opts.me); if (d) dot(d[0], d[1], Math.max(3, size * .03), '#ff6bd6', '#fff'); }
      else {
        const [tx, ty] = m.soort === 'race' ? (m.ringen[m.ri] || [0, 0]) : [m.tx, m.ty];
        dot(tx, ty, Math.max(3, size * .03), m.soort === 'race' ? '#5ae6ff' : '#ffc94a', '#fff');
      }
    }
    for (const n of scene.spelers.ids()) {
      if (opts.ik && n === opts.me) continue;
      const p = scene.spelers.get(n);
      if (!p) continue;
      const c = ((opts.roster && opts.roster.get(n)) || {}).color || '#4cc9ff';
      dot(p[0], p[1], Math.max(2, size * .02), c);
    }
    if (opts.ik) dot(opts.ik.x, opts.ik.y, Math.max(3.5, size * .035), '#fff', '#000');
    ctx.restore();
  }

  // Turbo en nitro: witte streepjes die langs de randen van het scherm voorbij flitsen, in de rijrichting.
  function snelheidslijnen(ctx, w, h, t, a) {
    ctx.strokeStyle = 'rgba(210,250,255,.45)';
    ctx.lineWidth = Math.max(1.5, h / 320);
    ctx.beginPath();
    const cx = w / 2, cy = h / 2, ca = Math.cos(a), sa = Math.sin(a);
    for (let i = 0; i < 16; i++) {
      const hoek = i / 16 * Math.PI * 2 + Math.floor(t * 8 + i) * .7;
      const r0 = Math.min(w, h) * (.38 + ((t * 2.3 + i * .37) % 1) * .3);
      const x = cx + Math.cos(hoek) * r0 * (w / h > 1 ? 1.4 : 1), y = cy + Math.sin(hoek) * r0;
      ctx.moveTo(x, y); ctx.lineTo(x - ca * h * .08, y - sa * h * .08);
    }
    ctx.stroke();
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

  return { Scene, render, minimap, laad, Res, IMG, snelheidslijnen, klaar: () => gen };
})();
