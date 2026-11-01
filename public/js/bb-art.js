// Burchtbouwers tekenen: het landschap bij nacht, stenen met de kleur van wie ze legde, torens met daken,
// een poort met valhek, de donjon met baniere, en een echte draak met vuur. Gebruikt Glow (fx.js).
const BbArt = (() => {
  // Geschilderde beelden (public/img/burchtbouwers/). Is een beeld er (nog) niet, dan tekenen we dat stuk zelf zoals vroeger.
  const ART = {};
  if (typeof Image !== 'undefined') {
    for (const n of ['landschap', 'steen', 'draak', 'dak-toren', 'dak-donjon']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; sceneCache = null; blockCache = null; roofCache.clear(); };
      img.src = `/img/burchtbouwers/${n}.webp`;
    }
  }
  function rng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  // Het landschap één keer per maat: hemel met noorderlicht, maan, bergen, bos, heuvel en het pad.
  let sceneCache = null;
  function scene(w, h, ground, dark = false) {
    const key = `${w}x${h}/${dark}`;
    if (sceneCache && sceneCache.key === key) return sceneCache.c;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    if (ART.landschap) {
      // Het schilderij vult het hele bord; de onderkant blijft op de grond staan.
      const img = ART.landschap, f = Math.max(w / img.width, h / img.height);
      g.drawImage(img, (w - img.width * f) / 2, h - img.height * f, img.width * f, img.height * f);
      if (dark) { g.fillStyle = 'rgba(3, 4, 12, .45)'; g.fillRect(0, 0, w, h); }
      sceneCache = { key, c };
      return c;
    }
    const rnd = rng(21);
    const sky = g.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, '#030611');
    sky.addColorStop(.6, '#0d1a38');
    sky.addColorStop(1, '#1d2b52');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // Noorderlicht.
    for (let k = 0; k < 3; k++) {
      g.strokeStyle = ['rgba(60, 230, 170, .10)', 'rgba(120, 140, 255, .09)', 'rgba(200, 100, 255, .07)'][k];
      g.lineWidth = h * (.05 + k * .02);
      g.beginPath();
      for (let x = 0; x <= w; x += w / 40) {
        const y = h * (.16 + k * .05) + Math.sin(x / w * 6 + k) * h * .04 + Math.sin(x / w * 13 + k * 2) * h * .015;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    }
    // Sterren.
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(220, 235, 255, ${.3 + rnd() * .7})`;
      const s = rnd() < .1 ? 2 : 1;
      g.fillRect(rnd() * w, rnd() * ground * .7, s * Math.max(1, w / 1200), s * Math.max(1, w / 1200));
    }
    // Maan.
    const mx = w * .88, my = h * .15, mr = h * .06;
    Glow.glow(g, mx, my, mr * 5, '#cfe0ff', .35);
    const mg = g.createRadialGradient(mx - mr * .3, my - mr * .3, mr * .1, mx, my, mr);
    mg.addColorStop(0, '#fffbe8');
    mg.addColorStop(1, '#d9d2b0');
    g.fillStyle = mg;
    g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(150, 140, 110, .35)';
    for (const [dx, dy, r] of [[-.3, -.2, .2], [.25, .15, .15], [-.05, .35, .12]]) { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); g.fill(); }
    // Bergen in twee lagen.
    for (const [base, amp, col] of [[.5, .2, '#16203e'], [.62, .16, '#101830']]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, ground);
      for (let x = 0; x <= w + 10; x += w / 30) g.lineTo(x, ground * (base + amp * (.5 - .5 * Math.sin(x / w * 7 + base * 9)) * (.6 + rnd() * .4)));
      g.lineTo(w, ground);
      g.closePath();
      g.fill();
    }
    // Sneeuwtoppen: een lichte rand.
    // Bos.
    g.fillStyle = '#0a1224';
    for (let x = -10; x < w + 10; x += w / 90) {
      const th = ground * (.06 + rnd() * .07);
      g.beginPath(); g.moveTo(x, ground * .92); g.lineTo(x + w / 160, ground * .92 - th); g.lineTo(x + w / 80, ground * .92); g.closePath(); g.fill();
    }
    g.fillRect(0, ground * .91, w, ground * .1);
    // Heuvel waarop de burcht staat.
    const hill = g.createLinearGradient(0, ground * .9, 0, ground);
    hill.addColorStop(0, '#13233a');
    hill.addColorStop(1, '#0c1a2c');
    g.fillStyle = hill;
    g.beginPath();
    g.moveTo(0, ground);
    g.quadraticCurveTo(w * .5, ground * .88, w, ground);
    g.closePath();
    g.fill();
    // Grond met gras en een stenen pad.
    const gr = g.createLinearGradient(0, ground, 0, h);
    gr.addColorStop(0, '#173022');
    gr.addColorStop(1, '#08130e');
    g.fillStyle = gr;
    g.fillRect(0, ground, w, h - ground);
    g.fillStyle = '#2c5a3a';
    for (let x = 0; x < w; x += Math.max(3, w / 400)) {
      const bl = (h - ground) * (.05 + rnd() * .08);
      g.fillRect(x, ground - bl * .4, Math.max(1, w / 900), bl);
    }
    g.fillStyle = 'rgba(0, 0, 0, .35)';
    g.fillRect(0, ground + (h - ground) * .15, w, (h - ground) * .85);
    if (dark) { g.fillStyle = 'rgba(3, 4, 12, .45)'; g.fillRect(0, 0, w, h); }
    sceneCache = { key, c };
    return c;
  }

  // Steenblokken als kleine plaatjes, per maat gebakken: vier varianten.
  let blockCache = null;
  function blocks(bw, bh) {
    const key = `${Math.round(bw)}x${Math.round(bh)}`;
    if (blockCache && blockCache.key === key) return blockCache.list;
    const rnd = rng(3);
    const list = [];
    for (let v = 0; v < 4; v++) {
      const c = document.createElement('canvas');
      c.width = Math.max(4, Math.ceil(bw));
      c.height = Math.max(4, Math.ceil(bh));
      const g = c.getContext('2d');
      const base = 92 + v * 9;
      const sg = g.createLinearGradient(0, 0, 0, c.height);
      sg.addColorStop(0, `rgb(${base + 26}, ${base + 30}, ${base + 46})`);
      sg.addColorStop(1, `rgb(${base - 24}, ${base - 22}, ${base - 6})`);
      g.fillStyle = '#2a2f40';
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = sg;
      g.fillRect(1, 1, c.width - 2, c.height - 2);
      if (ART.steen) {
        // Een stukje van Jorns steentegel, voor elke variant een ander stuk.
        const img = ART.steen, cw = img.width / 4, ch = cw * c.height / c.width;
        g.globalAlpha = .9;
        g.drawImage(img, v * cw, (v * 97) % Math.max(1, img.height - ch), cw, ch, 1, 1, c.width - 2, c.height - 2);
        g.globalAlpha = 1;
      }
      // Spikkels en een barstje.
      for (let i = 0; i < 6; i++) {
        g.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '0,0,0'}, ${.06 + rnd() * .08})`;
        g.fillRect(rnd() * c.width, rnd() * c.height, Math.max(1, c.width * .08), Math.max(1, c.height * .1));
      }
      g.fillStyle = 'rgba(255, 255, 255, .25)';
      g.fillRect(1, 1, c.width - 2, Math.max(1, c.height * .1));
      g.fillStyle = 'rgba(0, 0, 0, .3)';
      g.fillRect(1, c.height - Math.max(1, c.height * .14), c.width - 2, Math.max(1, c.height * .14));
      list.push(c);
    }
    blockCache = { key, list };
    return list;
  }

  // Een kegeldak met dakpannen en een vlaggetje.
  // Geschilderde daken, per kleur één keer bijgekleurd (de blauwe pannen krijgen de kleur van het dak).
  const roofCache = new Map();
  function paintedRoof(name, color) {
    const key = name + color;
    if (roofCache.has(key)) return roofCache.get(key);
    const img = ART[name];
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    if (color.toLowerCase() !== '#3d6bff') {
      const n = parseInt(color.slice(1), 16), tr = n >> 16, tg = (n >> 8) & 255, tb = n & 255;
      const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const r = p[i], gg = p[i + 1], b = p[i + 2];
        if (p[i + 3] < 8 || b < r + 25 || b < gg + 10) continue; // alleen blauw
        const l = (r + gg + b) / 3 / 140;
        p[i] = Math.min(255, tr * l); p[i + 1] = Math.min(255, tg * l); p[i + 2] = Math.min(255, tb * l);
      }
      g.putImageData(d, 0, 0);
    }
    roofCache.set(key, c);
    return c;
  }
  function roof(g, cx, base, w, hgt, color, t) {
    const name = color === '#ff4d6d' ? 'dak-donjon' : 'dak-toren';
    if (ART[name]) {
      const img = paintedRoof(name, color), rw = w * .92, rh = rw * img.height / img.width;
      g.drawImage(img, cx - rw / 2, base - rh * .94, rw, rh);
      flag(g, cx, base - rh * .9, hgt * .4, color, t);
      return;
    }
    const rg = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    rg.addColorStop(0, color);
    rg.addColorStop(.45, color);
    rg.addColorStop(1, '#1a0a14');
    g.fillStyle = rg;
    g.beginPath(); g.moveTo(cx - w / 2, base); g.lineTo(cx, base - hgt); g.lineTo(cx + w / 2, base); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0, 0, 0, .3)';
    g.lineWidth = Math.max(1, w * .02);
    for (let k = 1; k < 5; k++) {
      const y = base - (hgt * k) / 5, half = (w / 2) * (1 - k / 5);
      g.beginPath(); g.moveTo(cx - half, y); g.lineTo(cx + half, y); g.stroke();
    }
    g.fillStyle = 'rgba(255, 255, 255, .15)';
    g.beginPath(); g.moveTo(cx - w * .1, base); g.lineTo(cx, base - hgt); g.lineTo(cx - w * .3, base); g.closePath(); g.fill();
    flag(g, cx, base - hgt, hgt * .5, color, t);
  }
  function flag(g, x, y, len, color, t) {
    g.strokeStyle = '#d6dde8';
    g.lineWidth = Math.max(1.5, len * .05);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - len); g.stroke();
    const fw = len * .7, fh = len * .35;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x, y - len);
    for (let k = 0; k <= 6; k++) {
      const px = x + (fw * k) / 6;
      g.lineTo(px, y - len + Math.sin(t * 6 - k * .9) * fh * .15 * (k / 6));
    }
    for (let k = 6; k >= 0; k--) {
      const px = x + (fw * k) / 6;
      g.lineTo(px, y - len + fh + Math.sin(t * 6 - k * .9) * fh * .15 * (k / 6));
    }
    g.closePath();
    g.fill();
  }

  // De draak: lijf, nek, kop met hoorns, fladderende vleugels en een staart. Kijkt naar links.
  function dragon(g, x, y, s, t, breath) {
    if (ART.draak) {
      const img = ART.draak, dw = s * 2.35, dh = dw * img.height / img.width;
      g.save();
      g.translate(x, y + Math.sin(t * 3) * s * .05);
      Glow.glow(g, 0, 0, s * 1.4, '#ff3a1a', .2);
      g.drawImage(img, -s * .98, -dh * .62, dw, dh);
      g.restore();
      return;
    }
    const flap = Math.sin(t * 7);
    g.save();
    g.translate(x, y);
    Glow.glow(g, 0, 0, s * 1.4, '#ff3a1a', .25);
    const scale = (c1, c2) => {
      const gr = g.createLinearGradient(0, -s * .4, 0, s * .4);
      gr.addColorStop(0, c1);
      gr.addColorStop(1, c2);
      return gr;
    };
    // Vleugel: drie vingerbotten met vlies ertussen en een geschulpte achterrand.
    const wing = (lift, alpha, dx) => {
      const f = lift;
      const root = [s * (.05 + dx), -s * .12];
      const tip = [s * (.35 + dx), -s * (.95 + f * .45)];
      const fingers = [
        [s * (.75 + dx), -s * (.75 + f * .35)],
        [s * (.9 + dx), -s * (.4 + f * .2)],
        [s * (.7 + dx), -s * (.08 + f * .05)],
      ];
      g.globalAlpha = alpha;
      g.fillStyle = scale('#9a1830', '#3a0814');
      g.beginPath();
      g.moveTo(root[0], root[1]);
      g.lineTo(tip[0], tip[1]);
      let prev = tip;
      for (const fp of fingers) {
        const mx = (prev[0] + fp[0]) / 2 + s * .06, my = (prev[1] + fp[1]) / 2 + s * .1;
        g.quadraticCurveTo(mx, my, fp[0], fp[1]);
        prev = fp;
      }
      g.quadraticCurveTo(s * (.4 + dx), s * .02, s * (.25 + dx), -s * .02);
      g.closePath();
      g.fill();
      g.strokeStyle = '#ffb36b';
      g.globalAlpha = alpha * .7;
      g.lineWidth = s * .025;
      g.beginPath();
      g.moveTo(root[0], root[1]); g.lineTo(tip[0], tip[1]);
      for (const fp of fingers) { g.moveTo(tip[0], tip[1]); g.lineTo(fp[0], fp[1]); }
      g.stroke();
      g.globalAlpha = 1;
    };
    wing(Math.sin(t * 7 + .6), .55, .12);
    // Staart.
    g.strokeStyle = '#8a1428';
    g.lineCap = 'round';
    g.lineWidth = s * .12;
    g.beginPath();
    g.moveTo(s * .3, s * .05);
    g.bezierCurveTo(s * .7, s * .25, s * .9, -s * .1 + Math.sin(t * 3) * s * .1, s * 1.15, s * .1);
    g.stroke();
    g.fillStyle = '#ffb347';
    g.beginPath(); g.moveTo(s * 1.15, s * .1); g.lineTo(s * 1.3, 0); g.lineTo(s * 1.28, s * .2); g.closePath(); g.fill();
    // Lijf.
    g.fillStyle = scale('#c0263f', '#4a0a18');
    g.beginPath(); g.ellipse(s * .1, 0, s * .42, s * .2, -.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffb36b';
    g.beginPath(); g.ellipse(s * .05, s * .1, s * .3, s * .08, -.1, 0, Math.PI); g.fill();
    // Nek en kop.
    g.strokeStyle = '#a81c34';
    g.lineWidth = s * .16;
    g.beginPath(); g.moveTo(-s * .2, -s * .05); g.quadraticCurveTo(-s * .4, -s * .3, -s * .55, -s * .22); g.stroke();
    g.lineCap = 'butt';
    g.fillStyle = scale('#d0304a', '#5a0c1c');
    g.beginPath();
    g.moveTo(-s * .5, -s * .32); g.lineTo(-s * .85, -s * .22); g.lineTo(-s * .88, -s * .14);
    g.lineTo(-s * .6, -s * .1); g.lineTo(-s * .48, -s * .14); g.closePath();
    g.fill();
    // Kaak gaat open bij het vuur spuwen.
    if (breath) {
      g.fillStyle = '#5a0c1c';
      g.beginPath(); g.moveTo(-s * .6, -s * .12); g.lineTo(-s * .84, -s * .02); g.lineTo(-s * .5, -s * .08); g.closePath(); g.fill();
    }
    g.fillStyle = '#e8dcc0';
    g.beginPath(); g.moveTo(-s * .52, -s * .3); g.lineTo(-s * .4, -s * .5); g.lineTo(-s * .46, -s * .29); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-s * .58, -s * .3); g.lineTo(-s * .5, -s * .47); g.lineTo(-s * .53, -s * .3); g.closePath(); g.fill();
    Glow.glow(g, -s * .66, -s * .24, s * .1, '#ffe066', .95);
    g.fillStyle = '#fff6a0';
    g.beginPath(); g.arc(-s * .66, -s * .24, s * .025, 0, Math.PI * 2); g.fill();
    // Voorste vleugel.
    // Stekels op de rug.
    g.fillStyle = '#ffb36b';
    for (let k = 0; k < 5; k++) {
      const px = -s * .15 + k * s * .12;
      g.beginPath(); g.moveTo(px, -s * .17); g.lineTo(px + s * .04, -s * .28); g.lineTo(px + s * .08, -s * .16); g.closePath(); g.fill();
    }
    wing(flap, 1, 0);
    g.restore();
  }

  // Vuur van de bek naar een doel: een kegel van vlammetjes.
  function fire(g, x0, y0, x1, y1, s, t) {
    const n = 46;
    for (let k = 0; k < n; k++) {
      const p = (t * 1.6 + k / n) % 1;
      const x = x0 + (x1 - x0) * p + Math.sin(k * 7.3 + t * 9) * s * .25 * p;
      const y = y0 + (y1 - y0) * p + Math.cos(k * 5.1 + t * 7) * s * .2 * p;
      const r = s * (.06 + p * .28);
      const col = p < .3 ? '#fff2b0' : p < .6 ? '#ffb347' : '#ff4a1a';
      Glow.glow(g, x, y, r * 2.2, col, (1 - p) * .9);
    }
  }

  // De hele burcht. s: toestand van de server; fx: aanval (dragon, fire, fallen, result).
  function castle(g, w, h, dpr, s, fx, SHAPE, COLORS) {
    const t = performance.now() / 1000;
    const ground = h * .82;
    g.drawImage(scene(w, h, ground), 0, 0);
    if (fx.fire !== undefined) { g.fillStyle = 'rgba(255, 70, 20, .12)'; g.fillRect(0, 0, w, h); }
    const parts = s.parts;
    const need = Math.max(1, s.need);
    const totalW = parts.reduce((a, p) => a + SHAPE[p.kind].w, 0);
    const margin = w * .05;
    const unit = (w - margin * 2) / totalW;
    const rowsOf = (n, kind) => n / SHAPE[kind].perRow;
    const maxRows = Math.max(...parts.map(p => Math.max(rowsOf(p.height, p.kind), rowsOf(need, p.kind) * 1.35)), 4);
    const bh = Math.min(30 * dpr, (ground - h * .16) / maxRows);
    const stones = s.stones || [];
    const geo = [];
    let x = margin;
    // Eerst alles berekenen, dan in lagen tekenen.
    parts.forEach((p, i) => {
      const shape = SHAPE[p.kind];
      const pw = unit * shape.w;
      const inset = p.kind === 'toren' || p.kind === 'donjon' ? pw * .08 : pw * .02;
      const fall = fx.fallen ? fx.fallen[i] || 0 : 0;
      const shown = Math.round(p.height * (1 - fall * .75));
      const rows = Math.ceil(shown / shape.perRow);
      geo.push({ p, i, x, pw, left: x + inset, width: pw - inset * 2, shape, shown, rows, top: ground - rows * bh, needY: ground - rowsOf(need, p.kind) * bh, ok: p.height >= need, fall });
      x += pw;
    });
    // Blauwdruk: hoe hoog elk deel moet worden, als een lichtend silhouet.
    for (const d of geo) {
      if (d.ok) continue;
      g.fillStyle = 'rgba(76, 201, 255, .07)';
      g.fillRect(d.left, d.needY, d.width, ground - d.needY);
      g.strokeStyle = 'rgba(76, 201, 255, .35)';
      g.lineWidth = 1.5 * dpr;
      g.setLineDash([4 * dpr, 5 * dpr]);
      g.strokeRect(d.left, d.needY, d.width, ground - d.needY);
      g.setLineDash([]);
    }
    // Stenen.
    for (const d of geo) {
      const bw = d.width / d.shape.perRow;
      const tiles = blocks(bw, bh);
      const colors = stones[d.i] || [];
      for (let k = 0; k < d.shown; k++) {
        const row = Math.floor(k / d.shape.perRow);
        const col = k % d.shape.perRow;
        const shift = row % 2 ? bw / 2 : 0;
        let bx = d.left + col * bw + shift;
        if (bx + bw > d.left + d.width + 1) bx -= d.width;
        const by = ground - (row + 1) * bh;
        g.drawImage(tiles[(k * 7 + d.i) % 4], bx, by, bw, bh);
        const c = COLORS[colors[k] % COLORS.length] || '#9fb4d9';
        g.fillStyle = c;
        g.globalAlpha = .7;
        g.fillRect(bx + dpr, by + bh - 3 * dpr, bw - 2 * dpr, 2 * dpr);
        g.globalAlpha = 1;
      }
      // Schaduw aan de rechterkant voor diepte.
      if (d.rows) {
        const sh = g.createLinearGradient(d.left, 0, d.left + d.width, 0);
        sh.addColorStop(0, 'rgba(255, 240, 200, .06)');
        sh.addColorStop(.6, 'rgba(0, 0, 0, 0)');
        sh.addColorStop(1, 'rgba(0, 0, 20, .35)');
        g.fillStyle = sh;
        g.fillRect(d.left, d.top, d.width, ground - d.top);
      }
      // Lichtende ramen in torens en donjon.
      if ((d.p.kind === 'toren' || d.p.kind === 'donjon') && d.rows >= 3) {
        for (let r = 2; r < d.rows - 1; r += 3) {
          const wy = ground - (r + 1) * bh;
          const ww = Math.max(3 * dpr, d.width * .1);
          const flick = .7 + Math.sin(t * 5 + r + d.i) * .15;
          Glow.glow(g, d.left + d.width / 2, wy + bh * .5, ww * 2.5, '#ffb347', .45 * flick);
          g.fillStyle = '#ffcf6b';
          g.beginPath();
          g.moveTo(d.left + d.width / 2 - ww / 2, wy + bh);
          g.lineTo(d.left + d.width / 2 - ww / 2, wy + ww * .5);
          g.arc(d.left + d.width / 2, wy + ww * .5, ww / 2, Math.PI, 0);
          g.lineTo(d.left + d.width / 2 + ww / 2, wy + bh);
          g.fill();
        }
      }
      // Kantelen.
      if (d.rows > 0 && (d.p.kind === 'toren' || d.p.kind === 'donjon' || d.p.kind === 'muur' || d.p.kind === 'poort')) {
        const n = d.p.kind === 'muur' || d.p.kind === 'poort' ? 5 : 3;
        const mw = d.width / (n * 2 - 1);
        const tiles = blocks(mw, bh * .7);
        for (let k = 0; k < n; k++) g.drawImage(tiles[k % 4], d.left + k * mw * 2, d.top - bh * .7, mw, bh * .7);
      }
      // Poort met valhek en houten deuren.
      if (d.p.kind === 'poort' && d.rows >= 2) {
        const gw = d.width * .45;
        const gh = Math.min(d.rows, 4) * bh * .85;
        const gx = d.left + (d.width - gw) / 2;
        const arch = () => {
          g.beginPath();
          g.moveTo(gx, ground);
          g.lineTo(gx, ground - gh + gw / 2);
          g.arc(gx + gw / 2, ground - gh + gw / 2, gw / 2, Math.PI, 0);
          g.lineTo(gx + gw, ground);
          g.closePath();
        };
        arch();
        g.fillStyle = '#05070e';
        g.fill();
        g.save();
        arch();
        g.clip();
        Glow.glow(g, gx + gw / 2, ground - gh * .3, gw * .8, '#ff9a3c', .35);
        g.strokeStyle = '#3a3f50';
        g.lineWidth = Math.max(2, gw * .05);
        for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(gx + (gw * k) / 5, ground - gh); g.lineTo(gx + (gw * k) / 5, ground); g.stroke(); }
        for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(gx, ground - (gh * k) / 5); g.lineTo(gx + gw, ground - (gh * k) / 5); g.stroke(); }
        g.restore();
        arch();
        g.strokeStyle = '#c9a24a';
        g.lineWidth = Math.max(2, 3 * dpr);
        g.stroke();
      }
      // Daken op afgewerkte torens, baniere op de donjon.
      if (d.ok && d.fall === 0 && d.p.kind === 'toren') roof(g, d.left + d.width / 2, d.top - bh * .7, d.width * 1.15, d.width * 1.1, '#3d6bff', t);
      if (d.p.kind === 'donjon' && d.rows > 0) {
        if (d.ok && d.fall === 0) roof(g, d.left + d.width / 2, d.top - bh * .7, d.width * .55, d.width * .6, '#ff4d6d', t);
        else flag(g, d.left + d.width / 2, d.top - bh * .7, bh * 2.4, '#ffc94a', t);
        // Baniere aan de voorkant.
        if (d.rows >= 4) {
          const bwid = d.width * .28, bhgt = Math.min(d.rows - 2, 6) * bh;
          const by = d.top + bh * .6;
          g.fillStyle = '#b8243f';
          g.beginPath(); g.moveTo(d.left + d.width / 2 - bwid / 2, by); g.lineTo(d.left + d.width / 2 + bwid / 2, by); g.lineTo(d.left + d.width / 2 + bwid / 2, by + bhgt); g.lineTo(d.left + d.width / 2, by + bhgt * .85); g.lineTo(d.left + d.width / 2 - bwid / 2, by + bhgt); g.closePath(); g.fill();
          g.strokeStyle = '#ffd36b';
          g.lineWidth = Math.max(1, dpr * 1.5);
          g.stroke();
          g.fillStyle = '#ffd36b';
          g.beginPath(); g.arc(d.left + d.width / 2, by + bhgt * .35, bwid * .22, 0, Math.PI * 2); g.fill();
        }
      }
      // Fakkels op afgewerkte muren.
      if (d.ok && d.fall === 0 && (d.p.kind === 'muur' || d.p.kind === 'poort')) {
        for (const fx2 of [.12, .88]) {
          const tx = d.left + d.width * fx2, ty = d.top - bh * .9;
          const fl = .8 + Math.sin(t * 12 + d.i * 3 + fx2 * 9) * .2;
          Glow.glow(g, tx, ty, bh * 2.2 * fl, '#ff8a2a', .6);
          Glow.glow(g, tx, ty, bh * .5, '#fff2b0', .9);
        }
      }
    }
    // De streep van de draak en het label onder elk deel.
    for (const d of geo) {
      g.setLineDash([8 * dpr, 6 * dpr]);
      g.strokeStyle = d.ok ? 'rgba(46, 230, 166, .9)' : 'rgba(255, 120, 60, .95)';
      g.lineWidth = 3 * dpr;
      g.beginPath(); g.moveTo(d.x + 2 * dpr, d.needY); g.lineTo(d.x + d.pw - 2 * dpr, d.needY); g.stroke();
      g.setLineDash([]);
      if (!d.ok) {
        // Een klein drakenkopje aan het eind van de streep.
        Glow.glow(g, d.x + d.pw - 6 * dpr, d.needY, 10 * dpr, '#ff6a2a', .7);
      }
      g.textAlign = 'center';
      g.fillStyle = '#eaf4ff';
      g.font = `700 ${Math.round(Math.min(18 * dpr, unit * .16))}px 'Exo 2', sans-serif`;
      g.fillText(d.p.name, d.x + d.pw / 2, ground + (h - ground) * .4);
      g.fillStyle = d.ok ? '#2ee6a6' : '#ff9a5c';
      g.font = `800 ${Math.round(Math.min(20 * dpr, unit * .18))}px 'Exo 2', sans-serif`;
      g.fillText(`${d.p.height} / ${need}${d.ok ? ' ✔' : ''}`, d.x + d.pw / 2, ground + (h - ground) * .78);
      // Na de aanval: schild of puin.
      if (fx.result && fx.result[d.i] === 'held') {
        const r = Math.max(d.pw * .55, (ground - Math.min(d.top, d.needY)) * .75);
        const sh = .6 + Math.sin(t * 4 + d.i) * .2;
        g.strokeStyle = `rgba(120, 220, 255, ${sh})`;
        g.lineWidth = 3 * dpr;
        g.beginPath(); g.ellipse(d.x + d.pw / 2, ground, d.pw * .55, r, 0, Math.PI, 0); g.stroke();
        g.fillStyle = `rgba(76, 201, 255, ${sh * .12})`;
        g.fill();
      } else if (fx.result && fx.result[d.i] === 'fallen') {
        g.fillStyle = 'rgba(40, 40, 50, .55)';
        for (let k = 0; k < 6; k++) {
          const sy = d.top - bh * (1 + (k % 3)) - ((t * 20 + k * 13) % 30) * dpr;
          g.beginPath(); g.arc(d.x + d.pw * (.2 + k * .13), sy, bh * 1.4, 0, Math.PI * 2); g.fill();
        }
        Glow.glow(g, d.x + d.pw / 2, ground - bh, d.pw * .5, '#ff5a1a', .35 + Math.sin(t * 9) * .1);
      }
    }
    // Vuurvliegjes.
    for (let i = 0; i < 16; i++) {
      const fx3 = ((i * .618 + t * .01 * (i % 3 + 1)) % 1) * w;
      const fy = ground - ((i * .37) % 1) * h * .2 + Math.sin(t + i) * 10 * dpr;
      Glow.glow(g, fx3, fy, 5 * dpr, '#d6ff7a', .3 + .3 * Math.sin(t * 3 + i * 2));
    }
    // De draak, met vuur naar het deel dat nu aangevallen wordt.
    if (fx.dragon) {
      const dx = fx.dragon.x * w, dy = fx.dragon.y * h, ds = h * .22;
      const target = fx.fire !== undefined ? geo[fx.fire] : null;
      if (target) fire(g, dx - ds * .82, dy - ds * .14, target.x + target.pw / 2, Math.min(target.top, target.needY), ds * .6, t);
      dragon(g, dx, dy, ds, t, !!target);
    }
  }

  return { scene, castle, dragon, fire };
})();
