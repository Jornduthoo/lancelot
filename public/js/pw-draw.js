// Poortwacht tekenen, voor het bord en voor de leerling: de kaart (één keer gebakken), de torens, de monsters en alle schoten.
// De server stuurt monsters als afstand langs het pad; wij schuiven ze tussen twee berichten vloeiend verder.
// Gebruikt AK (arena-kit.js), Glow (fx.js) en PwWorld.
const PwDraw = (() => {
  const { W, H } = PwWorld;
  const { glow, rgba } = Glow;
  const TAU = Math.PI * 2;
  const MCOL = { kruiper: '#ff4d6d', renner: '#ffc94a', pantser: '#c77dff', draak: '#ff3df0' };

  function rnd(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // ---------- De kaart, één keer getekend ----------
  let baked = null;
  let frameCache = null;
  function bake(k) {
    const c = document.createElement('canvas');
    c.width = Math.round(W * k);
    c.height = Math.round(H * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    const r = rnd(4242);
    // Grond: donker gras met vlekken, aarde, grassprietjes, bloemetjes en lichtgevende paddenstoelen.
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f2321');
    bg.addColorStop(.5, '#0c1c1c');
    bg.addColorStop(1, '#101a26');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) glow(g, r() * W, r() * H, 80 + r() * 160, ['#1d4a3a', '#1b2f5a', '#3a1f55'][i % 3], .22);
    // Zachte vlekken licht en donker gras, en kale plekken aarde
    for (let i = 0; i < 220; i++) glow(g, r() * W, r() * H, 20 + r() * 50, r() < .55 ? '#2f7a52' : '#05080a', .13, .6 + r() * .4);
    for (let i = 0; i < 30; i++) {
      const x = r() * W, y = r() * H;
      if (PwWorld.distToPath(x, y) < PwWorld.ROAD + 40) continue;
      glow(g, x, y, 26 + r() * 30, '#6b4a2b', .3, .55);
    }
    g.lineCap = 'round';
    for (let i = 0; i < 2600; i++) {
      const x = r() * W, y = r() * H;
      if (PwWorld.distToPath(x, y) < PwWorld.ROAD + 10) continue;
      const v = r();
      if (v < .82) {
        g.strokeStyle = `rgba(${50 + r() * 40}, ${120 + r() * 70}, ${90 + r() * 40}, ${.3 + r() * .35})`;
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - .5) * 4, y - 3 - r() * 5); g.moveTo(x + 2, y); g.lineTo(x + 2 + (r() - .5) * 4, y - 2 - r() * 4); g.stroke();
      } else if (v < .93) {
        g.fillStyle = ['#ffd6a5', '#ff6bd6', '#9be7ff', '#fff2b0'][Math.floor(r() * 4)];
        g.globalAlpha = .55;
        g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
        g.globalAlpha = 1;
      } else rock(g, x, y, 2 + r() * 4, r);
    }
    // Het pad: donkere berm, kasseien dicht naast elkaar, wielsporen, stoepranden en een dun neonlijntje.
    const path = () => { g.beginPath(); PwWorld.PTS.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); };
    g.lineCap = g.lineJoin = 'round';
    path();
    g.strokeStyle = 'rgba(2, 4, 8, .7)';
    g.lineWidth = PwWorld.ROAD * 2 + 22;
    g.stroke();
    path();
    g.strokeStyle = '#2a2a33';
    g.lineWidth = PwWorld.ROAD * 2;
    g.stroke();
    for (let d = 0; d < PwWorld.LENGTH; d += 9) {
      const p = PwWorld.pos(d), nx = -Math.sin(p.a), ny = Math.cos(p.a);
      for (let o = -PwWorld.ROAD + 6; o < PwWorld.ROAD - 4; o += 9) {
        const x = p.x + nx * (o + (r() - .5) * 3), y = p.y + ny * (o + (r() - .5) * 3);
        const v = 54 + r() * 30;
        g.save();
        g.translate(x, y);
        g.rotate(p.a + (r() - .5) * .4);
        g.fillStyle = `rgb(${v}, ${v - 2}, ${v + 8})`;
        AK.roundRect(g, -4, -3.5, 8, 7, 2.5); g.fill();
        g.fillStyle = 'rgba(255, 255, 255, .1)';
        g.fillRect(-3, -3, 6, 1.5);
        g.restore();
      }
    }
    for (const o of [-11, 11]) {
      g.beginPath();
      for (let i = 0; i < PwWorld.PTS.length; i++) {
        const q = PwWorld.pos(i * PwWorld.STEP);
        g[i ? 'lineTo' : 'moveTo'](q.x - Math.sin(q.a) * o, q.y + Math.cos(q.a) * o);
      }
      g.strokeStyle = 'rgba(10, 8, 14, .35)';
      g.lineWidth = 5;
      g.stroke();
    }
    for (const side of [-1, 1]) {
      // Stoepranden: lange blokken, afwisselend licht en donker
      let k2 = 0;
      for (let d = 0; d < PwWorld.LENGTH; d += 16, k2++) {
        const p = PwWorld.pos(d);
        const x = p.x - Math.sin(p.a) * (PwWorld.ROAD + 3) * side, y = p.y + Math.cos(p.a) * (PwWorld.ROAD + 3) * side;
        g.save();
        g.translate(x, y);
        g.rotate(p.a);
        g.fillStyle = k2 % 2 ? '#5a5d70' : '#4a4d60';
        g.fillRect(-8, -3.5, 15, 7);
        g.fillStyle = 'rgba(255, 255, 255, .14)';
        g.fillRect(-8, -3.5, 15, 2);
        g.restore();
      }
      g.beginPath();
      for (let i = 0; i < PwWorld.PTS.length; i += 2) {
        const q = PwWorld.pos(i * PwWorld.STEP);
        const x = q.x - Math.sin(q.a) * (PwWorld.ROAD - 2) * side, y = q.y + Math.cos(q.a) * (PwWorld.ROAD - 2) * side;
        g[i ? 'lineTo' : 'moveTo'](x, y);
        if (i % 14 === 0) glow(g, x, y, 12, '#4cc9ff', .18);
      }
      g.strokeStyle = 'rgba(120, 220, 255, .5)';
      g.lineWidth = 1.5;
      g.stroke();
    }
    // Runen in het midden van het pad
    g.fillStyle = 'rgba(255, 201, 74, .2)';
    for (let d = 60; d < PwWorld.LENGTH - 40; d += 70) {
      const p = PwWorld.pos(d);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.a);
      g.beginPath();
      g.moveTo(8, 0); g.lineTo(0, -5); g.lineTo(-8, 0); g.lineTo(0, 5);
      g.closePath();
      g.fill();
      g.restore();
    }
    // Bomen, dennen, struiken, ruïnes en kristallen (niet op het pad en niet op torenplaatsen)
    const free = (x, y, m) => PwWorld.distToPath(x, y) > PwWorld.ROAD + m && !PwWorld.SLOTS.some(s => Math.hypot(s.x - x, s.y - y) < 38 + m) && x < 1440 && Math.hypot(x - PwWorld.PORTAL.x, y - PwWorld.PORTAL.y) > 110;
    const props = [];
    for (let i = 0; i < 220; i++) {
      const x = 20 + r() * (W - 40), y = 20 + r() * (H - 40);
      if (!free(x, y, 18)) continue;
      props.push([x, y, r()]);
    }
    props.sort((a, b2) => a[1] - b2[1]);
    for (const [x, y, v] of props) {
      if (v < .38) pine(g, x, y, 12 + r() * 10, r);
      else if (v < .64) tree(g, x, y, 13 + r() * 9, r);
      else if (v < .8) bush(g, x, y, 6 + r() * 5, r);
      else if (v < .86) ruin(g, x, y, r);
      else if (v < .93) rock(g, x, y, 6 + r() * 6, r);
      else crystal(g, x, y, 6 + r() * 7, ['#4cc9ff', '#c77dff', '#2de2c8'][Math.floor(r() * 3)]);
    }
    // Staande stenen rond het portaal
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * TAU + .3, P0 = PwWorld.PORTAL;
      const x = P0.x + Math.cos(a) * 86, y = P0.y + Math.sin(a) * 76;
      if (x < 6 || y < 6 || PwWorld.distToPath(x, y) < PwWorld.ROAD + 6) continue;
      g.fillStyle = 'rgba(0, 0, 0, .4)';
      g.beginPath(); g.ellipse(x + 3, y + 6, 9, 4, 0, 0, TAU); g.fill();
      const sg = g.createLinearGradient(x - 6, 0, x + 6, 0);
      sg.addColorStop(0, '#6b6f86'); sg.addColorStop(1, '#2e3142');
      g.fillStyle = sg;
      AK.roundRect(g, x - 6, y - 18, 12, 24, 4); g.fill();
      g.fillStyle = 'rgba(199, 125, 255, .8)';
      g.fillRect(x - 1, y - 12, 2, 8);
      glow(g, x, y - 8, 12, '#c77dff', .35);
    }
    castle(g);
    // Portaalring (de draaiende kolk tekenen we live)
    const P = PwWorld.PORTAL;
    g.fillStyle = '#05060c';
    g.beginPath(); g.arc(P.x, P.y, 52, 0, TAU); g.fill();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      g.save();
      g.translate(P.x + Math.cos(a) * 50, P.y + Math.sin(a) * 50);
      g.rotate(a);
      g.fillStyle = i % 2 ? '#3b3f4f' : '#4a4f62';
      AK.roundRect(g, -9, -7, 18, 14, 3);
      g.fill();
      g.restore();
    }
    return c;
  }

  function pine(g, x, y, s, r) {
    g.fillStyle = 'rgba(0, 0, 0, .35)';
    g.beginPath(); g.ellipse(x + 4, y + s * .9, s * .8, s * .3, 0, 0, TAU); g.fill();
    for (let k = 0; k < 3; k++) {
      const yy = y - k * s * .45, w = s * (1 - k * .25);
      g.fillStyle = k === 2 ? '#1c4a44' : k ? '#163c3a' : '#112e30';
      g.beginPath(); g.moveTo(x, yy - s * .9); g.lineTo(x + w, yy + s * .5); g.lineTo(x - w, yy + s * .5); g.closePath(); g.fill();
      // Lichte kant links, zoals bij de bomen
      g.fillStyle = 'rgba(140, 230, 190, .12)';
      g.beginPath(); g.moveTo(x, yy - s * .9); g.lineTo(x, yy + s * .5); g.lineTo(x - w, yy + s * .5); g.closePath(); g.fill();
    }
    if (r() < .3) glow(g, x, y - s * 1.2, 6, '#7df9ff', .5);
  }

  function tree(g, x, y, s, r) {
    // Loofboom van bovenaf: schaduw, stam, drie lagen bladeren met een lichte kant.
    g.fillStyle = 'rgba(0, 0, 0, .38)';
    g.beginPath(); g.ellipse(x + s * .35, y + s * .45, s * 1.05, s * .6, 0, 0, TAU); g.fill();
    for (const [dx, dy, k, col] of [[0, 0, 1, '#123a2c'], [-.25, -.2, .78, '#1a4d38'], [-.4, -.38, .45, '#2a6a47']]) {
      g.fillStyle = col;
      g.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU, rr = s * k * (.86 + r() * .2);
        g.lineTo(x + dx * s + Math.cos(a) * rr, y + dy * s + Math.sin(a) * rr * .92);
      }
      g.closePath(); g.fill();
    }
    if (r() < .25) { g.fillStyle = '#ff6b6b'; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(x + (r() - .5) * s, y + (r() - .5) * s, 1.6, 0, TAU); g.fill(); } }
  }
  function bush(g, x, y, s, r) {
    g.fillStyle = 'rgba(0, 0, 0, .3)';
    g.beginPath(); g.ellipse(x + 2, y + s * .5, s * 1.3, s * .5, 0, 0, TAU); g.fill();
    for (let i = 0; i < 4; i++) {
      g.fillStyle = i < 2 ? '#174433' : '#23603f';
      g.beginPath(); g.arc(x + (r() - .5) * s * 1.2, y + (r() - .5) * s * .7 - i * .6, s * (.55 + r() * .25), 0, TAU); g.fill();
    }
  }
  function rock(g, x, y, s, r) {
    g.fillStyle = 'rgba(0, 0, 0, .35)';
    g.beginPath(); g.ellipse(x + s * .3, y + s * .4, s, s * .6, 0, 0, TAU); g.fill();
    const rg = g.createLinearGradient(x - s, y - s, x + s, y + s);
    rg.addColorStop(0, '#7a7f96'); rg.addColorStop(1, '#30334a');
    g.fillStyle = rg;
    g.beginPath();
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr = s * (.75 + r() * .3); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); }
    g.closePath(); g.fill();
  }
  function ruin(g, x, y, r) {
    // Een stuk oude muur met mos.
    const a = r() * Math.PI, len = 26 + r() * 22;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = 'rgba(0, 0, 0, .4)';
    g.fillRect(-len / 2 + 3, -3, len, 11);
    for (let i = 0; i < len; i += 7) {
      const h = 5 + r() * 4;
      g.fillStyle = i % 14 ? '#4a4d60' : '#5a5d72';
      g.fillRect(-len / 2 + i, -h / 2, 6.5, h);
      g.fillStyle = 'rgba(255, 255, 255, .12)';
      g.fillRect(-len / 2 + i, -h / 2, 6.5, 1.5);
    }
    g.fillStyle = 'rgba(70, 140, 80, .5)';
    for (let i = 0; i < 3; i++) g.fillRect(-len / 2 + r() * len, -3 + r() * 3, 4, 2);
    g.restore();
  }

  function crystal(g, x, y, s, col) {
    glow(g, x, y, s * 3.2, col, .35);
    g.fillStyle = rgba(col, .85);
    g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s * .6, y); g.lineTo(x, y + s * .5); g.lineTo(x - s * .6, y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x + s * .2, y - s * .2); g.lineTo(x - s * .15, y); g.closePath(); g.fill();
  }

  // Fakkels: langs de burchtmuur en langs het pad. De houders zitten in de kaart, de vlammen tekenen we live.
  const TORCHES = (() => {
    const out = [];
    const gx = PwWorld.GATE.x, gy = PwWorld.GATE.y;
    for (let y = 40; y < H; y += 105) if (Math.abs(y - gy) > 46 && Math.abs(Math.abs(y - gy) - 150) > 56) out.push({ x: gx + 2, y, wall: true });
    let side = 1;
    for (let d = 150; d < PwWorld.LENGTH - 120; d += 260, side = -side) {
      const p = PwWorld.pos(d);
      const x = p.x - Math.sin(p.a) * (PwWorld.ROAD + 14) * side, y = p.y + Math.cos(p.a) * (PwWorld.ROAD + 14) * side;
      if (PwWorld.SLOTS.some(s => Math.hypot(s.x - x, s.y - y) < 40) || PwWorld.distToPath(x, y) < PwWorld.ROAD + 8 || y < 50) continue;
      out.push({ x, y });
    }
    return out;
  })();

  // De burcht rechts: een dikke muur met kantelen en een weergang, ronde torens met spitse daken en vaandels,
  // een poortgebouw met twee vierkante torens, hangende banieren en de poort waar het pad eindigt.
  function castle(g) {
    const gx = PwWorld.GATE.x, gy = PwWorld.GATE.y;
    const r = rnd(77);
    const blocks = (x, y, w, h, base) => {
      g.fillStyle = base;
      g.fillRect(x, y, w, h);
      for (let yy = y; yy < y + h; yy += 11) {
        for (let xx = x + ((yy - y) / 11 % 2 ? 8 : 0); xx < x + w; xx += 16) {
          const v = (r() - .5) * 14;
          g.fillStyle = `rgba(${v > 0 ? 255 : 0}, ${v > 0 ? 255 : 0}, ${v > 0 ? 255 : 0}, ${Math.abs(v) / 140})`;
          g.fillRect(xx, yy, 15, 10);
        }
        g.fillStyle = 'rgba(0, 0, 0, .3)';
        g.fillRect(x, yy + 10, w, 1);
      }
    };
    // Schaduw van de muur op het gras
    const sh = g.createLinearGradient(gx - 40, 0, gx + 6, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.6)');
    g.fillStyle = sh;
    g.fillRect(gx - 40, 0, 46, H);
    // Muur, weergang met planken, kantelen aan de buitenkant
    blocks(gx + 4, 0, W - gx, H, '#3b3e52');
    g.fillStyle = '#2b2233';
    g.fillRect(gx + 30, 0, 30, H);
    for (let y = 0; y < H; y += 9) { g.fillStyle = y % 18 ? '#4a3626' : '#553e2b'; g.fillRect(gx + 31, y, 28, 8); }
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(gx + 30, 0, 3, H); g.fillRect(gx + 57, 0, 3, H);
    for (let y = 0; y < H; y += 22) {
      g.fillStyle = '#555a70';
      g.fillRect(gx + 4, y, 16, 13);
      g.fillStyle = 'rgba(255,255,255,.16)';
      g.fillRect(gx + 4, y, 16, 3);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(gx + 4, y + 13, 16, 3);
    }
    g.fillStyle = 'rgba(76, 201, 255, .6)';
    g.fillRect(gx + 3, 0, 1.5, H);
    // Hangende banieren aan de buitenkant
    for (const by of [gy - 250, gy + 250, gy - 95, gy + 95]) {
      if (by < 30 || by > H - 60) continue;
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.fillRect(gx - 9, by + 3, 15, 46);
      g.fillStyle = '#1f4fbf';
      g.beginPath(); g.moveTo(gx - 12, by); g.lineTo(gx + 4, by); g.lineTo(gx + 4, by + 44); g.lineTo(gx - 4, by + 36); g.lineTo(gx - 12, by + 44); g.closePath(); g.fill();
      g.strokeStyle = '#ffc94a'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = '#ffc94a';
      g.beginPath(); g.moveTo(gx - 4, by + 10); g.lineTo(gx, by + 17); g.lineTo(gx - 4, by + 24); g.lineTo(gx - 8, by + 17); g.closePath(); g.fill();
    }
    // Ronde torens met een spits leien dak, een vaandel en een lichtje
    const round = (tx, ty, rad) => {
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.beginPath(); g.ellipse(tx - 8, ty + 10, rad + 6, rad + 3, 0, 0, TAU); g.fill();
      g.fillStyle = '#4a4e64';
      g.beginPath(); g.arc(tx, ty, rad, 0, TAU); g.fill();
      for (let i = 0; i < 16; i++) {
        const a0 = i / 16 * TAU;
        g.fillStyle = i % 2 ? '#2f2548' : '#3a2d58';
        g.beginPath(); g.moveTo(tx, ty); g.arc(tx, ty, rad - 5, a0, a0 + TAU / 16); g.closePath(); g.fill();
      }
      const lg = g.createRadialGradient(tx - rad * .4, ty - rad * .4, 2, tx, ty, rad);
      lg.addColorStop(0, 'rgba(255,255,255,.28)'); lg.addColorStop(.6, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,0,.35)');
      g.fillStyle = lg;
      g.beginPath(); g.arc(tx, ty, rad - 5, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(76, 201, 255, .55)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(tx, ty, rad - 5, 0, TAU); g.stroke();
      g.fillStyle = '#ffc94a';
      g.beginPath(); g.arc(tx, ty, 4, 0, TAU); g.fill();
      g.strokeStyle = '#c9cfe0'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 4, ty - 22); g.stroke();
      g.fillStyle = '#ff4d6d';
      g.beginPath(); g.moveTo(tx - 4, ty - 22); g.lineTo(tx - 22, ty - 18); g.lineTo(tx - 4, ty - 13); g.closePath(); g.fill();
    };
    for (const ty of [70, gy - 150, gy + 150, H - 70]) round(gx + 42, ty, ty === 70 || ty === H - 70 ? 40 : 50);
    // Poortgebouw: twee vierkante torens met kantelen en een vuurkorf
    for (const ty of [gy - 72, gy + 72]) {
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(gx - 22, ty - 20, 56, 52);
      blocks(gx - 16, ty - 24, 52, 48, '#464a60');
      for (let i = 0; i < 4; i++) {
        g.fillStyle = '#5a5f78';
        g.fillRect(gx - 16 + i * 14, ty - 24, 10, 8);
        g.fillRect(gx - 16 + i * 14, ty + 16, 10, 8);
      }
      g.fillStyle = '#1a1626';
      g.beginPath(); g.arc(gx + 10, ty, 9, 0, TAU); g.fill();
      g.fillStyle = '#8a7a50';
      g.beginPath(); g.arc(gx + 10, ty, 6, 0, TAU); g.fill();
    }
    // De poortboog met valhek
    g.fillStyle = '#0b0d14';
    AK.roundRect(g, gx - 8, gy - 52, 40, 104, 10);
    g.fill();
    g.strokeStyle = '#ffc94a';
    g.lineWidth = 3;
    AK.roundRect(g, gx - 8, gy - 52, 40, 104, 10);
    g.stroke();
    g.strokeStyle = 'rgba(255, 201, 74, .45)';
    g.lineWidth = 2;
    for (let y = gy - 40; y <= gy + 40; y += 14) { g.beginPath(); g.moveTo(gx - 4, y); g.lineTo(gx + 28, y); g.stroke(); }
    for (let x = gx + 2; x < gx + 28; x += 9) { g.beginPath(); g.moveTo(x, gy - 46); g.lineTo(x, gy + 46); g.stroke(); }
    // Fakkelhouders
    for (const t of TORCHES) {
      g.fillStyle = 'rgba(0,0,0,.4)';
      g.beginPath(); g.ellipse(t.x + 3, t.y + 5, 6, 3, 0, 0, TAU); g.fill();
      g.fillStyle = '#3a2412';
      g.fillRect(t.x - 2, t.y - 2, 4, 8);
      g.fillStyle = '#8a7a50';
      g.beginPath(); g.moveTo(t.x - 5, t.y - 3); g.lineTo(t.x + 5, t.y - 3); g.lineTo(t.x + 3, t.y + 1); g.lineTo(t.x - 3, t.y + 1); g.closePath(); g.fill();
    }
  }

  // ---------- Torens ----------
  function towerDraw(ctx, x, y, type, lvl, color, t, aim, part) {
    const spec = PwWorld.TOWERS[type];
    const col = spec.color;
    const s = 1 + (lvl - 1) * .09;
    // Sokkel (bij 'live' staat die al in de gebakken toren)
    if (part !== 'live') {
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      ctx.beginPath(); ctx.ellipse(x + 3, y + 8, 24 * s, 12 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3d4256';
      poly(ctx, x, y + 2, 21 * s, 8);
      ctx.fill();
      ctx.fillStyle = '#2a2e3e';
      poly(ctx, x, y - 2, 17 * s, 8);
      ctx.fill();
      ctx.strokeStyle = lvl >= 3 ? '#ffc94a' : 'rgba(255, 201, 74, .55)';
      ctx.lineWidth = lvl >= 4 ? 2.5 : 1.5;
      poly(ctx, x, y - 2, 17 * s, 8);
      ctx.stroke();
    }
    if (type === 'laser') {
      const bob = Math.sin(t * 2.2 + x) * 2;
      glow(ctx, x, y - 16 + bob, 26 * s, col, .55);
      for (let i = 0; i < Math.min(lvl, 4); i++) {
        ctx.strokeStyle = rgba(col, .5 - i * .08);
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, y - 4, (9 + i * 4) * s, (4 + i * 2) * s, 0, 0, TAU); ctx.stroke();
      }
      const h = 20 * s, w = 8 * s, cy = y - 14 + bob;
      ctx.fillStyle = '#bff3ff';
      ctx.beginPath(); ctx.moveTo(x, cy - h); ctx.lineTo(x + w, cy); ctx.lineTo(x, cy + h * .45); ctx.lineTo(x - w, cy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(x, cy - h); ctx.lineTo(x + w, cy); ctx.lineTo(x, cy + h * .45); ctx.closePath(); ctx.fill();
      if (lvl >= 5) glow(ctx, x, cy - h, 12, '#ffffff', .8);
    } else if (type === 'katapult') {
      if (part === 'base') { glow(ctx, x, y - 4, 22 * s, col, .35); return pips(ctx, x, y, s, lvl); }
      ctx.save();
      ctx.translate(x, y - 6);
      ctx.rotate(aim);
      ctx.fillStyle = '#4b5068';
      AK.roundRect(ctx, -4 * s, -6 * s, 26 * s, 12 * s, 4);
      ctx.fill();
      ctx.fillStyle = '#1a1d28';
      ctx.fillRect(18 * s, -4 * s, 6 * s, 8 * s);
      ctx.fillStyle = col;
      ctx.fillRect(4 * s, -2 * s, 12 * s, 4 * s);
      ctx.restore();
      ctx.fillStyle = '#353a4e';
      ctx.beginPath(); ctx.arc(x, y - 6, 11 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd29a';
      ctx.beginPath(); ctx.arc(x, y - 6, 5 * s, 0, TAU); ctx.fill();
      glow(ctx, x, y - 6, 14 * s, col, .8);
    } else {
      const cy = y - 16 + Math.sin(t * 1.8 + y) * 2;
      glow(ctx, x, cy, 30 * s, col, .5);
      const n = 2 + lvl;
      for (let i = 0; i < n; i++) {
        const a = t * 1.4 + i / n * TAU;
        const sx = x + Math.cos(a) * 15 * s, sy = cy + Math.sin(a) * 7 * s;
        ctx.fillStyle = '#e6fbff';
        ctx.beginPath(); ctx.moveTo(sx, sy - 4); ctx.lineTo(sx + 2, sy); ctx.lineTo(sx, sy + 4); ctx.lineTo(sx - 2, sy); ctx.closePath(); ctx.fill();
      }
      const grad = ctx.createRadialGradient(x - 3, cy - 3, 1, x, cy, 10 * s);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(.5, col);
      grad.addColorStop(1, '#2a7fbf');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(x, cy, 9 * s, 0, TAU); ctx.fill();
    }
    if (type !== 'katapult') pips(ctx, x, y, s, lvl);
  }

  // Niveau: sterretjes onder de toren
  function pips(ctx, x, y, s, lvl) {
    for (let i = 0; i < lvl; i++) {
      const sx = x + (i - (lvl - 1) / 2) * 7, sy = y + 15 * s;
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.arc(sx, sy, 2.4, 0, TAU); ctx.fill();
    }
  }

  // Elke toren één keer tekenen per soort, niveau en schaal; daarna is het één drawImage per toren.
  // Alleen de draaiende loop van de katapult en een zachte gloed tekenen we elke frame.
  const towerCache = new Map();
  function towerSprite(type, lvl, sc) {
    const key = `${type}${lvl}@${sc.toFixed(2)}`;
    let c = towerCache.get(key);
    if (c) return c;
    if (towerCache.size > 60) towerCache.clear();
    c = document.createElement('canvas');
    c.width = Math.ceil(90 * sc);
    c.height = Math.ceil(100 * sc);
    const g = c.getContext('2d');
    g.scale(sc, sc);
    towerDraw(g, 45, 62, type, lvl, '#fff', 0, 0, 'base');
    c.ox = 45;
    c.oy = 62;
    towerCache.set(key, c);
    return c;
  }

  function poly(ctx, x, y, r, n) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + Math.PI / n;
      ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r * .62);
    }
    ctx.closePath();
  }

  // ---------- Monsters ----------
  // Een monster tekenen in zijn eigen assen (kijkt naar rechts). sp is de stap in de loopbeweging.
  function body(ctx, type, sp) {
    const col = MCOL[type];
    if (type === 'kruiper') {
      ctx.strokeStyle = '#2a0f18';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) {
        const w = Math.sin(sp + i * 2 + (s > 0 ? Math.PI : 0)) * 4;
        ctx.beginPath(); ctx.moveTo(-4 + i * 5, 0); ctx.lineTo(-6 + i * 6 + w, s * 13); ctx.lineTo(-8 + i * 7 + w, s * 17); ctx.stroke();
      }
      ctx.fillStyle = '#3a1520';
      ctx.beginPath(); ctx.ellipse(-2, 0, 12, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6b2534';
      ctx.beginPath(); ctx.ellipse(-4, -2, 7, 4, 0, 0, TAU); ctx.fill();
      glow(ctx, 8, 0, 12, col, .8);
      ctx.fillStyle = '#ffd0d8';
      ctx.beginPath(); ctx.arc(8, 0, 3, 0, TAU); ctx.fill();
    } else if (type === 'renner') {
      glow(ctx, -14, 0, 16 + Math.sin(sp) * 3, '#ff9a3d', .7);
      ctx.fillStyle = '#2c2410';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-5, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-4, -5); ctx.lineTo(0, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath(); ctx.arc(8, 0, 2, 0, TAU); ctx.fill();
    } else if (type === 'pantser') {
      const step = Math.sin(sp) * 3;
      ctx.fillStyle = '#1f1830';
      ctx.fillRect(-6 + step, -15, 9, 6);
      ctx.fillRect(-6 - step, 9, 9, 6);
      ctx.fillStyle = '#4a3f66';
      AK.roundRect(ctx, -14, -13, 26, 26, 7);
      ctx.fill();
      ctx.fillStyle = '#6c5c94';
      AK.roundRect(ctx, -11, -10, 18, 20, 5);
      ctx.fill();
      ctx.strokeStyle = '#2a2240';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(7, 0); ctx.stroke();
      glow(ctx, 10, 0, 14, col, .8);
      ctx.fillStyle = '#f0dcff';
      ctx.fillRect(8, -5, 4, 10);
    } else {
      // De draak: grote vleugels die klappen, een lange hals en lichtende ogen.
      const flap = Math.sin(sp) * .35;
      glow(ctx, 0, 0, 70, col, .35);
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.scale(1, s);
        ctx.rotate(-flap);
        ctx.fillStyle = '#3a1450';
        ctx.beginPath();
        ctx.moveTo(-4, 6);
        ctx.quadraticCurveTo(-10, 40, -34, 58);
        ctx.lineTo(-20, 40); ctx.lineTo(-30, 34); ctx.lineTo(-14, 26); ctx.lineTo(-20, 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 61, 240, .7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = '#2a0f3a';
      ctx.beginPath(); ctx.moveTo(-40, 0); ctx.quadraticCurveTo(-30, -6, -16, -2); ctx.lineTo(-16, 2); ctx.quadraticCurveTo(-30, 6, -40, 0); ctx.fill();
      ctx.fillStyle = '#4b1c66';
      ctx.beginPath(); ctx.ellipse(-4, 0, 22, 13, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5e2680';
      ctx.beginPath(); ctx.ellipse(18, 0, 13, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a3399';
      ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(26, -8); ctx.lineTo(24, 8); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = '#ffc94a'; ctx.beginPath(); ctx.arc(-16 + i * 6, 0, 2, 0, TAU); ctx.fill(); }
      glow(ctx, 30, -4, 9, '#ff3355', 1);
      glow(ctx, 30, 4, 9, '#ff3355', 1);
    }
  }

  // Elk monster in 6 standen van zijn loopbeweging, één keer getekend per schaal. Daarna: draaien en één drawImage.
  const FRAMES = 6;
  const monCache = new Map();
  function monsterSprite(type, f, sc) {
    const key = `${type}${f}@${sc}`;
    let c = monCache.get(key);
    if (c) return c;
    if (monCache.size > 120) monCache.clear();
    const size = type === 'draak' ? 170 : 60;
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(size * sc);
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    g.scale(sc, sc);
    body(g, type, f / FRAMES * TAU);
    c.size = size;
    monCache.set(key, c);
    return c;
  }

  function monster(ctx, type, x, y, a, t, slow, hp, id, sc = 1) {
    const speed = type === 'renner' ? 18 : type === 'pantser' ? 7 : type === 'draak' ? 5 : 12;
    const f = Math.floor(((t * speed + id) / TAU * FRAMES) % FRAMES + FRAMES) % FRAMES;
    const sp = monsterSprite(type, f, sc);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(3, 5, PwWorld.MONSTERS[type].r * 1.1, PwWorld.MONSTERS[type].r * .55, 0, 0, TAU); ctx.fill();
    ctx.rotate(a);
    ctx.drawImage(sp, -sp.size / 2, -sp.size / 2, sp.size, sp.size);
    ctx.restore();
    if (slow) {
      ctx.fillStyle = 'rgba(155, 231, 255, .22)';
      ctx.beginPath(); ctx.arc(x, y, PwWorld.MONSTERS[type].r + 3, 0, TAU); ctx.fill();
    }
    if (hp < 100 && type !== 'draak') {
      const w = PwWorld.MONSTERS[type].r * 2;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(x - w / 2, y - PwWorld.MONSTERS[type].r - 9, w, 4);
      ctx.fillStyle = hp > 50 ? '#4ade80' : hp > 25 ? '#ffc94a' : '#ff4d6d';
      ctx.fillRect(x - w / 2, y - PwWorld.MONSTERS[type].r - 9, w * hp / 100, 4);
    }
  }

  // ---------- De scène: wat er nu op de kaart staat ----------
  class Scene {
    constructor() {
      this.mons = new Map();   // id -> { type, d, v, hp, slow, td, tt }
      this.towers = new Map(); // slot -> { n, type, lvl, aim }
      this.slots = [];          // [slotIndex, owner]
      this.fx = new AK.Particles();
      this.beams = [];
      this.shots = [];
      this.bolts = [];
      this.gate = PwWorld.GATE_HP;
      this.gateHit = 0;
      this.wave = 0;
      this.boss = null;
      this.t = 0;
      this.meSlot = -1;
      this.onEvent = null;
    }

    setTowers(list, slots) {
      const old = this.towers;
      this.towers = new Map(list.map(([slot, n, type, lvl]) => [slot, { n, type, lvl, aim: old.get(slot) ? old.get(slot).aim : -Math.PI / 2 }]));
      if (slots) this.slots = slots;
    }

    monPos(m) {
      return PwWorld.pos(Math.max(0, m.d));
    }

    apply(msg) {
      const now = performance.now();
      if (msg.towers) this.setTowers(msg.towers, msg.slots);
      for (const e of msg.ev || []) this.event(e);
      const seen = new Set();
      for (const [id, ti, d, hp, slow, v] of msg.m) {
        seen.add(id);
        const m = this.mons.get(id);
        if (m) { m.td = d; m.tt = now; m.hp = hp; m.slow = slow; m.v = v; } else this.mons.set(id, { type: PwWorld.TYPES[ti], d, td: d, tt: now, v, hp, slow, born: now });
      }
      for (const id of this.mons.keys()) if (!seen.has(id)) this.mons.delete(id);
      if (msg.gate < this.gate) this.gateHit = 1;
      this.gate = msg.gate;
      this.wave = msg.wave;
      this.boss = msg.boss === undefined ? null : msg.boss;
    }

    event(e) {
      const kind = e[0];
      const slotXY = i => PwWorld.SLOTS[i] || { x: 0, y: 0 };
      if (kind === 's') {
        const m = this.mons.get(e[2]);
        if (!m) return;
        const s = slotXY(e[1]), p = this.monPos(m);
        this.beams.push({ x0: s.x, y0: s.y - 30, x1: p.x, y1: p.y, life: .12, max: .12, col: '#7fe3ff', w: 3 });
        if (Math.random() < .4) this.fx.sparks(p.x, p.y, { n: 2, color: '#bff3ff', speed: 220, life: .2 });
        this.aim(e[1], p);
      } else if (kind === 'i') {
        const s = slotXY(e[1]);
        let x0 = s.x, y0 = s.y - 16;
        for (const id of e.slice(2)) {
          const m = this.mons.get(id);
          if (!m) continue;
          const p = this.monPos(m);
          this.beams.push({ x0, y0, x1: p.x, y1: p.y, life: .2, max: .2, col: '#c8f5ff', w: 2, zig: true });
          this.fx.burst(p.x, p.y, { n: 2, color: '#e6fbff', speed: 80, life: .4, size: 2 });
          x0 = p.x; y0 = p.y;
        }
      } else if (kind === 'c') {
        const s = slotXY(e[1]);
        this.shots.push({ x0: s.x, y0: s.y - 8, x1: e[2], y1: e[3], t: 0, dur: .42 });
        this.aim(e[1], { x: e[2], y: e[3] });
      } else if (kind === 'k') {
        const m = this.mons.get(e[1]);
        if (!m) return;
        const p = this.monPos(m);
        const col = MCOL[m.type];
        this.fx.burst(p.x, p.y, { n: m.type === 'draak' ? 50 : 7, color: col, speed: m.type === 'draak' ? 420 : 200, life: .5, size: 3 });
        this.fx.sparks(p.x, p.y, { n: 4, color: '#ffe08a' });
        if (m.type === 'draak') { this.fx.shock(p.x, p.y, 160, col, .9); this.fx.pop(p.x, p.y - 30, 'DRAAK VERSLAGEN!', '#ffc94a', 30, 2); }
        else if (e[2] === this.meSlot) this.fx.text(p.x, p.y - 14, `+${PwWorld.MONSTERS[m.type].gold}`, '#ffc94a', 15);
        this.mons.delete(e[1]);
      } else if (kind === 'poort') {
        const g = PwWorld.GATE;
        this.fx.shock(g.x + 10, g.y, 70, '#ff4d6d', .5);
        this.fx.text(g.x - 10, g.y - 60, `-${e[2]}`, '#ff4d6d', 22);
        this.mons.delete(e[1]);
      } else if (kind === 'bliksem') {
        const s = slotXY(e[1]);
        this.bolts.push({ x0: s.x + 30, y0: s.y - 260, x1: s.x, y1: s.y - 20, life: .45, max: .45 });
        this.fx.shock(s.x, s.y, PwWorld.BOLT.range, '#d9a8ff', .7);
      } else if (kind === 'z') {
        const m = this.mons.get(e[2]);
        if (!m) return;
        const s = slotXY(e[1]), p = this.monPos(m);
        this.bolts.push({ x0: s.x, y0: s.y - 20, x1: p.x, y1: p.y, life: .35, max: .35 });
      } else if (kind === 'bouw' || kind === 'op') {
        const s = slotXY(e[1]);
        this.fx.shock(s.x, s.y, 50, '#ffc94a', .5);
        this.fx.sparks(s.x, s.y - 10, { n: 14, color: '#ffe08a' });
      } else if (kind === 'goud' && e[1] === this.meSlot) {
        const s = slotXY(e[1]);
        this.fx.text(s.x, s.y - 40, `+${e[2]} goud`, '#ffc94a', 18);
      }
      if (this.onEvent) this.onEvent(e);
    }

    aim(slot, p) {
      const t = this.towers.get(slot), s = PwWorld.SLOTS[slot];
      if (t && s) t.aim = Math.atan2(p.y - s.y, p.x - s.x);
    }

    update(dt) {
      this.t += dt;
      const now = performance.now();
      for (const m of this.mons.values()) {
        const want = m.td + m.v * Math.min(.3, (now - m.tt) / 1000);
        m.d += m.v * dt;
        m.d += (want - m.d) * Math.min(1, dt * 6);
      }
      this.fx.update(dt);
      for (const b of this.beams) b.life -= dt;
      this.beams = this.beams.filter(b => b.life > 0);
      for (const b of this.bolts) b.life -= dt;
      this.bolts = this.bolts.filter(b => b.life > 0);
      for (const s of this.shots) {
        s.t += dt;
        if (s.t >= s.dur && !s.done) {
          s.done = true;
          this.fx.shock(s.x1, s.y1, 50, '#ff8c42', .4);
          this.fx.sparks(s.x1, s.y1, { n: 5, color: '#ffb36b' });
          this.fx.smoke(s.x1, s.y1, { n: 2, size: 10 });
        }
      }
      this.shots = this.shots.filter(s => !s.done);
      this.gateHit = Math.max(0, this.gateHit - dt * 2);
    }
  }

  // De torenplaatsen met de naam van wie er bouwt. Op een klein scherm tekenen we alles wat groter, zodat je het nog ziet.
  function pads(ctx, scene, roster, opts, big, k) {
    for (const [slot, owner] of scene.slots) {
      const s = PwWorld.SLOTS[slot];
      if (!s) continue;
      const who = roster.get(owner);
      const col = who ? who.color : '#5b6280';
      // Stenen sokkel: schaduw, zijkant en een lichtere bovenkant
      ctx.fillStyle = 'rgba(0, 0, 0, .45)';
      poly(ctx, s.x + 4, s.y + 10, 28 * big, 6);
      ctx.fill();
      ctx.fillStyle = '#2c2f40';
      poly(ctx, s.x, s.y + 8, 27 * big, 6);
      ctx.fill();
      ctx.fillStyle = '#464a60';
      poly(ctx, s.x, s.y + 4, 27 * big, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(10, 12, 20, .55)';
      poly(ctx, s.x, s.y + 4, 20 * big, 6);
      ctx.fill();
      ctx.strokeStyle = rgba(col, slot === opts.me ? .95 : .55);
      ctx.lineWidth = slot === opts.me ? 3 : 2;
      poly(ctx, s.x, s.y + 4, 27 * big, 6);
      ctx.stroke();
    }
    // Naamplaatjes
    if (opts.labels !== false) {
      const fs = Math.max(12, (opts.labelPx || 12) / k);
      ctx.font = `700 ${Math.round(fs)}px Rajdhani, Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      for (const [slot, owner] of scene.slots) {
        const s = PwWorld.SLOTS[slot], who = roster.get(owner);
        if (!s || !who) continue;
        if (opts.labels === 'me' && slot !== opts.me) continue;
        const label = slot === opts.me ? 'JIJ' : who.name;
        const tw = ctx.measureText(label).width + 10, ly = s.y + 22 * big;
        ctx.fillStyle = 'rgba(4, 6, 12, .75)';
        ctx.fillRect(s.x - tw / 2, ly, tw, fs * 1.2);
        ctx.fillStyle = slot === opts.me ? '#ffc94a' : who.color;
        ctx.fillText(label, s.x, ly + fs * .95);
      }
    }
  }

  // ---------- Alles tekenen ----------
  // opts: { roster: Map n -> {name, color}, me: slot, labels: true/false }
  function render(ctx, scene, w, h, opts = {}) {
    const k = Math.min(w / W, h / H);
    const ox = (w - W * k) / 2, oy = (h - H * k) / 2;
    const want = Math.min(1.5, Math.max(.6, k * 1.15));
    if (!baked || Math.abs(baked.k - want) > .2) { baked = bake(want); baked.k = want; }
    // De kaart met daarrond dezelfde grond (wat donkerder), één keer per schermgrootte samengesteld: dan is het elke frame maar één drawImage.
    const big = Math.max(1, Math.min(1.7, Math.sqrt(.75 / k)));
    const roster = opts.roster || new Map();
    const padKey = JSON.stringify([scene.slots, opts.me, opts.labels, opts.labelPx, [...roster.values()].map(r => r.name + r.color)]);
    if (!frameCache || frameCache.width !== w || frameCache.height !== h || frameCache.src !== baked || frameCache.key !== padKey) {
      frameCache = document.createElement('canvas');
      frameCache.width = w;
      frameCache.height = h;
      frameCache.src = baked;
      const f = frameCache.getContext('2d');
      const cover = Math.max(w / W, h / H);
      f.drawImage(baked, (w - W * cover) / 2, (h - H * cover) / 2, W * cover, H * cover);
      f.fillStyle = 'rgba(3, 5, 10, .72)';
      f.fillRect(0, 0, w, h);
      f.drawImage(baked, ox, oy, W * k, H * k);
      f.strokeStyle = 'rgba(255, 201, 74, .35)';
      f.lineWidth = 2;
      f.strokeRect(ox, oy, W * k, H * k);
      frameCache.key = padKey;
      f.translate(ox, oy);
      f.scale(k, k);
      pads(f, scene, roster, opts, big, k);
    }
    ctx.drawImage(frameCache, 0, 0);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    const t = scene.t;

    // Het portaal: een draaiende paarse kolk
    const P = PwWorld.PORTAL;
    glow(ctx, P.x, P.y, 90, '#a855f7', .45 + Math.sin(t * 3) * .1);
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(t * 1.6 + i * 1.7);
      ctx.strokeStyle = rgba(i % 2 ? '#c77dff' : '#ff6bd6', .55);
      ctx.lineWidth = 4 - i * .6;
      ctx.beginPath(); ctx.arc(0, 0, 38 - i * 7, 0, Math.PI * 1.2); ctx.stroke();
    }
    ctx.restore();
    const G0 = PwWorld.GATE;
    // Fakkels en de vuurkorven van het poortgebouw flakkeren.
    for (const f of TORCHES) {
      const fl = .8 + Math.sin(t * 13 + f.x) * .1 + Math.sin(t * 7.3 + f.y * .37) * .1;
      glow(ctx, f.x, f.y - 4, 44 * fl, '#ff8a2a', .6 * fl);
      glow(ctx, f.x, f.y - 5, 10 * fl, '#fff2b0', .95);
    }
    for (const ty of [G0.y - 72, G0.y + 72]) {
      const fl = .85 + Math.sin(t * 11 + ty) * .1;
      glow(ctx, G0.x + 10, ty, 34 * fl, '#ff8a2a', .7 * fl);
      glow(ctx, G0.x + 10, ty, 10 * fl, '#fff2b0', .9);
    }
    // Het schild van de poort: hoe zwakker de poort, hoe roder en flakkerender.
    const G = PwWorld.GATE;
    const gk = scene.gate / PwWorld.GATE_HP;
    const gcol = gk > .5 ? '#4cc9ff' : gk > .25 ? '#ffc94a' : '#ff4d6d';
    const flick = gk < .25 ? .5 + Math.random() * .5 : 1;
    if (gk > 0) {
      glow(ctx, G.x + 4, G.y, 80, gcol, (.35 + scene.gateHit * .6) * flick);
      ctx.strokeStyle = rgba(gcol, .8 * flick);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(G.x - 14, G.y, 14, 62, 0, -Math.PI / 2, Math.PI / 2, true); ctx.stroke();
    }
    // Torenplaatsen: de plaatjes en namen zitten in de gebakken achtergrond, alleen jouw plaats pulseert.
    const me = PwWorld.SLOTS[opts.me];
    if (me && scene.slots.some(([slot]) => slot === opts.me)) {
      const pulse = .5 + Math.sin(t * 4) * .5;
      ctx.strokeStyle = rgba('#ffc94a', .4 + pulse * .5);
      ctx.lineWidth = 2;
      poly(ctx, me.x, me.y + 4, (33 + pulse * 4) * big, 6);
      ctx.stroke();
      const tw = scene.towers.get(opts.me);
      if (tw) {
        ctx.strokeStyle = 'rgba(255, 201, 74, .25)';
        ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.arc(me.x, me.y, PwWorld.TOWERS[tw.type].range[tw.lvl - 1], 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // Monsters (van ver naar dichtbij de poort, zodat de voorste bovenop liggen)
    const list = [...scene.mons.entries()].sort((a, b) => a[1].d - b[1].d);
    const msc = Math.max(.5, Math.round(k * big * 20) / 20);
    for (const [id, m] of list) {
      if (m.d < 0) continue;
      const p = PwWorld.pos(m.d);
      ctx.globalAlpha = Math.min(1, m.d / 40);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(big, big);
      monster(ctx, m.type, 0, 0, p.a, t, m.slow, m.hp, id, msc);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // Torens, van boven naar onder
    const towers = [...scene.towers.entries()].sort((a, b) => PwWorld.SLOTS[a[0]].y - PwWorld.SLOTS[b[0]].y);
    for (const [slot, tw] of towers) {
      const s = PwWorld.SLOTS[slot];
      const who = roster.get(tw.n);
      const sp = towerSprite(tw.type, tw.lvl, Math.max(.5, Math.round(k * big * 20) / 20));
      const sc = sp.width / 90;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(big / sc, big / sc);
      ctx.drawImage(sp, -sp.ox * sc, -sp.oy * sc);
      ctx.restore();
      if (tw.type === 'katapult') {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(big, big);
        towerDraw(ctx, 0, 0, tw.type, tw.lvl, '#fff', t, tw.aim, 'live');
        ctx.restore();
      }
    }
    // Schoten
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const b of scene.beams) {
      const a = b.life / b.max;
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.col;
      {
        ctx.lineWidth = b.w * 3;
        ctx.strokeStyle = rgba(b.col, .35);
        ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
        ctx.lineWidth = b.w * .7;
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (const s of scene.shots) {
      const f = Math.min(1, s.t / s.dur);
      const x = s.x0 + (s.x1 - s.x0) * f, y = s.y0 + (s.y1 - s.y0) * f - Math.sin(f * Math.PI) * 70;
      glow(ctx, x, y, 16, '#ff8c42', 1);
      glow(ctx, x, y, 6, '#ffffff', 1);
    }
    for (const b of scene.bolts) {
      ctx.globalAlpha = b.life / b.max;
      AK.lightning(ctx, b.x0, b.y0, b.x1, b.y1, '#d9a8ff', 3, .2);
    }
    ctx.restore();
    scene.fx.draw(ctx);
    ctx.restore();
    hud(ctx, scene, ox, oy, W * k, Math.max(.8, Math.min(2, W * k / 1000)));
  }

  // Bovenaan: de poort, de golf en (als hij er is) de draak.
  function hud(ctx, scene, ox, oy, w, u) {
    const bw = Math.min(w * .42, 420 * u), bh = 18 * u, x = ox + (w - bw) / 2, y = oy + 10 * u;
    const gk = scene.gate / PwWorld.GATE_HP;
    ctx.fillStyle = 'rgba(4, 6, 12, .78)';
    AK.roundRect(ctx, x - 4 * u, y - 4 * u, bw + 8 * u, bh + 8 * u, 8 * u);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 77, 109, .2)';
    ctx.fillRect(x, y, bw, bh);
    const grad = ctx.createLinearGradient(x, 0, x + bw, 0);
    grad.addColorStop(0, gk > .5 ? '#1fbf75' : gk > .25 ? '#e09b00' : '#c9183a');
    grad.addColorStop(1, gk > .5 ? '#6dffb3' : gk > .25 ? '#ffd166' : '#ff6b86');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, bw * gk, bh);
    ctx.font = `800 ${Math.round(12 * u)}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(`🏰 POORT ${scene.gate}`, ox + w / 2, y + bh / 2 + 1);
    if (scene.wave) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffc94a';
      ctx.fillText(`GOLF ${scene.wave}`, ox + 12 * u, y + bh / 2 + 1);
    }
    if (scene.boss !== null) {
      const by = y + bh + 12 * u;
      ctx.fillStyle = 'rgba(4, 6, 12, .78)';
      AK.roundRect(ctx, x - 4 * u, by - 4 * u, bw + 8 * u, 14 * u + 8 * u, 8 * u);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 61, 240, .2)';
      ctx.fillRect(x, by, bw, 14 * u);
      ctx.fillStyle = '#ff3df0';
      ctx.fillRect(x, by, bw * scene.boss / 100, 14 * u);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(10 * u)}px Orbitron, sans-serif`;
      ctx.fillText(`🐉 DRAAK ${scene.boss}%`, ox + w / 2, by + 7 * u + 1);
    }
    ctx.textBaseline = 'alphabetic';
  }

  // Voor het voorbeeld in de lobby en het tegelicoon: alleen de kaart.
  return { Scene, render, towerDraw, monster, MCOL };
})();
