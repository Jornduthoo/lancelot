// Kristalroof tekenen: een kristalgrot als achtergrond, een groot kristal dat meegroeit en kleine vliegende kristallen.
// Alles met canvas; de grot wordt één keer per schermgrootte gebakken.
const KrArt = (() => {
  const COLORS = ['#4cc9ff', '#b26bff', '#ff5fd2', '#5ef0c8'];
  function rng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }
  const glow = (g, x, y, r, c, a) => Glow.glow(g, x, y, r, c, a);

  // Een tros kristallen die uit de rots groeit. dir = groeirichting in radialen (−π/2 = omhoog).
  function cluster(g, x, y, s, dir, color, rnd) {
    glow(g, x, y, s * 2.6, color, .35);
    const n = 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const a = dir + (rnd() - .5) * 1.3;
      const len = s * (.5 + rnd() * .9);
      const wd = len * (.18 + rnd() * .1);
      prism(g, x + (rnd() - .5) * s * .5, y + (rnd() - .5) * s * .2, a, len, wd, color);
    }
  }

  // Eén zeskantig kristal: een donkere en een lichte kant, een witte rand.
  function prism(g, x, y, a, len, wd, color) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const px = -sa * wd, py = ca * wd;
    const tx = x + ca * len, ty = y + sa * len;
    const bx = x + ca * len * .78, by = y + sa * len * .78;
    g.fillStyle = color;
    g.beginPath(); g.moveTo(x - px, y - py); g.lineTo(bx - px, by - py); g.lineTo(tx, ty); g.lineTo(x, y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(10, 6, 30, .45)';
    g.beginPath(); g.moveTo(x + px, y + py); g.lineTo(bx + px, by + py); g.lineTo(tx, ty); g.lineTo(x, y); g.closePath(); g.fill();
    g.fillStyle = color;
    g.globalAlpha = .55;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255, 255, 255, .75)';
    g.lineWidth = Math.max(1, wd * .12);
    g.beginPath(); g.moveTo(x - px * .3, y - py * .3); g.lineTo(bx - px * .3, by - py * .3); g.lineTo(tx, ty); g.stroke();
  }

  // De grot: rots, druipstenen, kristallen in de wanden, gloeiende aders, mijnbalken met lantaarns en sporen met een karretje.
  // Geeft { c, glints, lamps } terug: plekken die glinsteren of zacht gloeien.
  function cave(w, h, seed = 5) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const rnd = rng(seed);
    const u = Math.min(w, h) / 100;
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#05030e');
    bg.addColorStop(.55, '#120a2a');
    bg.addColorStop(1, '#0a0618');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // Diepe gloed achterin de grot.
    glow(g, w * .5, h * .55, Math.max(w, h) * .45, '#5b2dbf', .35);
    glow(g, w * .2, h * .7, Math.max(w, h) * .25, '#1b7fd1', .3);
    glow(g, w * .82, h * .4, Math.max(w, h) * .22, '#c23bb0', .22);
    // Rotslagen: onregelmatige vormen, van ver (licht) naar dichtbij (donker).
    const layers = [['#1d1440', .32], ['#150e30', .22], ['#0d0820', .12]];
    layers.forEach(([col, depth], li) => {
      g.fillStyle = col;
      // Plafond met druipstenen.
      g.beginPath();
      g.moveTo(0, 0);
      for (let x = 0; x <= w + 20; x += u * (3 + rnd() * 4)) {
        const yy = h * depth * (.25 + rnd() * .35);
        g.lineTo(x, yy * .6);
        if (rnd() < .45) { g.lineTo(x + u * 1.2, yy + u * (2 + rnd() * 6) * (li + 1)); }
      }
      g.lineTo(w, 0);
      g.closePath();
      g.fill();
      // Wanden links en rechts.
      for (const side of [0, 1]) {
        g.beginPath();
        const x0 = side ? w : 0;
        g.moveTo(x0, 0);
        for (let y = 0; y <= h; y += u * (4 + rnd() * 5)) g.lineTo(side ? w - w * depth * (.3 + rnd() * .35) : w * depth * (.3 + rnd() * .35), y);
        g.lineTo(x0, h);
        g.closePath();
        g.fill();
      }
      // Bodem.
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w + 20; x += u * (4 + rnd() * 5)) g.lineTo(x, h - h * depth * (.25 + rnd() * .3));
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    });
    // Gloeiende aders in de rots.
    for (let i = 0; i < 7; i++) {
      const col = COLORS[i % COLORS.length];
      let x = rnd() * w, y = rnd() < .5 ? rnd() * h * .25 : h - rnd() * h * .2;
      if (rnd() < .5) { x = rnd() < .5 ? rnd() * w * .12 : w - rnd() * w * .12; y = rnd() * h; }
      g.strokeStyle = Glow.rgba(col, .55);
      g.lineWidth = Math.max(1, u * .25);
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += (rnd() - .5) * u * 10; y += (rnd() - .5) * u * 8; g.lineTo(x, y); }
      g.stroke();
    }
    // Kristallen in de wanden, het plafond en de bodem.
    const glints = [];
    const spots = [];
    for (let i = 0; i < 9; i++) spots.push([rnd() * w * .14, h * (.15 + rnd() * .8), 0]);
    for (let i = 0; i < 9; i++) spots.push([w - rnd() * w * .14, h * (.15 + rnd() * .8), Math.PI]);
    for (let i = 0; i < 10; i++) spots.push([w * (.1 + rnd() * .8), h - rnd() * h * .07, -Math.PI / 2]);
    for (let i = 0; i < 6; i++) spots.push([w * (.3 + rnd() * .4), rnd() * h * .06, Math.PI / 2]);
    for (const [x, y, d] of spots) {
      const col = COLORS[Math.floor(rnd() * COLORS.length)];
      const s = u * (2.5 + rnd() * 5);
      cluster(g, x, y, s, d === Math.PI / 2 ? d : d === -Math.PI / 2 ? d : d + (d ? 1 : -1) * (rnd() - .5) * .8 - (d ? 0 : 0), col, rnd);
      glints.push([x + Math.cos(d) * s * .6, y + Math.sin(d) * s * .6, col]);
    }
    // Grote kristallen op de hoeken van de bodem.
    cluster(g, w * .06, h * .98, u * 14, -Math.PI / 2 + .35, '#4cc9ff', rnd);
    cluster(g, w * .95, h * .98, u * 13, -Math.PI / 2 - .35, '#b26bff', rnd);
    glints.push([w * .07, h * .86, '#bff0ff'], [w * .94, h * .87, '#e3c4ff']);
    // Mijnbalken met lantaarns.
    const lamps = [];
    for (const fx of [.2, .8]) {
      const x = w * fx, bw = u * 2.2;
      const wood = g.createLinearGradient(x - bw, 0, x + bw, 0);
      wood.addColorStop(0, '#2a1a10');
      wood.addColorStop(.5, '#4a2f1a');
      wood.addColorStop(1, '#22140c');
      g.fillStyle = wood;
      g.fillRect(x - bw / 2, h * .1, bw, h * .82);
      g.fillStyle = '#5a3a20';
      g.fillRect(x - bw * 2.5, h * .1, bw * 5, bw * .9);
      g.fillStyle = '#8a8fa8';
      for (let y = h * .16; y < h * .9; y += h * .12) { g.beginPath(); g.arc(x, y, bw * .18, 0, Math.PI * 2); g.fill(); }
      const ly = h * .26;
      g.strokeStyle = '#3a3f55';
      g.lineWidth = Math.max(1, u * .2);
      g.beginPath(); g.moveTo(x + bw * .5, ly - u * 2); g.lineTo(x + bw * 1.6, ly - u * 2); g.lineTo(x + bw * 1.6, ly); g.stroke();
      g.fillStyle = '#20243a';
      g.fillRect(x + bw * 1.6 - u, ly, u * 2, u * 2.6);
      lamps.push([x + bw * 1.6, ly + u * 1.3]);
    }
    // Sporen met een karretje vol kristallen.
    const ry = h * .93;
    g.strokeStyle = '#3d2a1a';
    g.lineWidth = u * .9;
    for (let x = 0; x < w; x += u * 4) { g.beginPath(); g.moveTo(x, ry - u * .2); g.lineTo(x + u * 1.4, ry + u * 1.6); g.stroke(); }
    g.strokeStyle = '#8a92b0';
    g.lineWidth = Math.max(1, u * .4);
    g.beginPath(); g.moveTo(0, ry); g.lineTo(w, ry); g.moveTo(0, ry + u * 1.4); g.lineTo(w, ry + u * 1.4); g.stroke();
    const cx = w * .3, cw = u * 12, chh = u * 6;
    for (let i = 0; i < 7; i++) prism(g, cx - cw * .35 + i * cw * .12, ry - chh * .9, -Math.PI / 2 + (rnd() - .5) * .9, u * (3 + rnd() * 3), u * .8, COLORS[i % 4]);
    glow(g, cx, ry - chh, u * 10, '#4cc9ff', .35);
    g.fillStyle = '#3a3f58';
    g.beginPath(); g.moveTo(cx - cw / 2, ry - chh); g.lineTo(cx + cw / 2, ry - chh); g.lineTo(cx + cw * .4, ry - u); g.lineTo(cx - cw * .4, ry - u); g.closePath(); g.fill();
    g.fillStyle = '#5a6080';
    g.fillRect(cx - cw / 2, ry - chh, cw, u * .9);
    g.fillStyle = '#4cc9ff';
    g.fillRect(cx - cw * .38, ry - chh * .55, cw * .76, u * .35);
    g.fillStyle = '#15182a';
    for (const k of [-.28, .28]) { g.beginPath(); g.arc(cx + cw * k, ry - u * .4, u * 1.3, 0, Math.PI * 2); g.fill(); }
    return { c, glints, lamps };
  }

  // Het grote kristal van de klas: draait langzaam, gloeit meer naarmate het voller is.
  function crystal(ctx, cx, cy, s, t, fill, flash = 0) {
    const pulse = 1 + Math.sin(t * 2) * .04 + flash * .15;
    glow(ctx, cx, cy, s * (1.3 + fill * .9) * pulse, '#4cc9ff', .45 + fill * .3);
    glow(ctx, cx, cy, s * .9 * pulse, '#b26bff', .3 + flash * .5);
    // Zwevende ringen.
    ctx.save();
    ctx.translate(cx, cy + s * .55);
    ctx.scale(1, .3);
    ctx.strokeStyle = `rgba(255, 209, 102, ${.35 + fill * .4})`;
    ctx.lineWidth = s * .04;
    for (let i = 0; i < 3; i++) {
      const a = t * .9 + i * 2.1;
      ctx.beginPath(); ctx.arc(0, 0, s * .75, a, a + 1.4); ctx.stroke();
    }
    ctx.restore();
    // Het kristal: facetten die meedraaien.
    const H = s * pulse, W = s * .55 * pulse;
    const turn = t * .6;
    const faces = 6;
    const pts = [];
    for (let i = 0; i < faces; i++) {
      const a = turn + (i / faces) * Math.PI * 2;
      pts.push({ x: Math.cos(a) * W, z: Math.sin(a), a });
    }
    const top = [cx, cy - H * .95], bot = [cx, cy + H * .75];
    const mid = cy - H * .1;
    const order = pts.map((p, i) => ({ p, q: pts[(i + 1) % faces], z: (p.z + pts[(i + 1) % faces].z) / 2 })).filter(f => f.z < .2).sort((a, b) => b.z - a.z);
    const hue = ['#4cc9ff', '#7fdcff', '#3a8fe0', '#9fe6ff', '#2f6fd0', '#6bc4ff'];
    order.forEach((f, i) => {
      const light = .55 - f.z * .45;
      for (const [tip, dir] of [[top, -1], [bot, 1]]) {
        ctx.fillStyle = hue[(i + (dir > 0 ? 2 : 0)) % hue.length];
        ctx.globalAlpha = .85;
        ctx.beginPath(); ctx.moveTo(cx + f.p.x, mid); ctx.lineTo(cx + f.q.x, mid); ctx.lineTo(tip[0], tip[1]); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = Math.max(0, light) * (dir < 0 ? .7 : .35);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(230, 250, 255, .8)';
    ctx.lineWidth = Math.max(1, s * .015);
    for (const f of order) {
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(cx + f.p.x, mid); ctx.lineTo(bot[0], bot[1]); ctx.stroke();
    }
    // Hoe voller, hoe feller de kern.
    glow(ctx, cx, mid, s * (.25 + fill * .35), '#ffffff', .4 + fill * .5);
  }

  // Een klein kristal dat vliegt of glinstert.
  function gem(ctx, x, y, s, color, spin = 0) {
    const w = s * .7 * Math.max(.25, Math.abs(Math.cos(spin)));
    glow(ctx, x, y, s * 2.4, color, .55);
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + w, y - s * .1); ctx.lineTo(x, y + s * .9); ctx.lineTo(x - w, y - s * .1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, .75)';
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + w, y - s * .1); ctx.lineTo(x, y - s * .1); ctx.closePath(); ctx.fill();
  }

  function sparkle(ctx, x, y, s, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * .2, y - s * .2); ctx.lineTo(x + s, y); ctx.lineTo(x + s * .2, y + s * .2);
    ctx.lineTo(x, y + s); ctx.lineTo(x - s * .2, y + s * .2); ctx.lineTo(x - s, y); ctx.lineTo(x - s * .2, y - s * .2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return { COLORS, cave, crystal, gem, sparkle, prism };
})();
