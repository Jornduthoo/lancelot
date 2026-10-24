// Schattenjacht tekenen: de schatkamer als achtergrond (bord en leerling), munten, fakkels en de schatkist.
// De stenen kamer wordt één keer per schermgrootte getekend; alleen fakkels, glinsters en munten bewegen.
// Gebruikt Glow uit fx.js.
const SjArt = (() => {
  const { glow } = Glow;

  function rng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  // Een berg munten: een gouden heuvel met losse muntjes erop.
  function heap(g, cx, cy, w, h, rnd) {
    const grad = g.createRadialGradient(cx, cy - h * .6, 2, cx, cy, w * .6);
    grad.addColorStop(0, '#fff1b0');
    grad.addColorStop(.35, '#ffc94a');
    grad.addColorStop(.75, '#b67d12');
    grad.addColorStop(1, '#4a2e05');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(cx - w / 2, cy);
    g.quadraticCurveTo(cx - w * .25, cy - h * 1.1, cx, cy - h);
    g.quadraticCurveTo(cx + w * .25, cy - h * 1.1, cx + w / 2, cy);
    g.closePath();
    g.fill();
    for (let i = 0; i < w / 5; i++) {
      const px = cx + (rnd() - .5) * w * .8;
      const top = cy - h * (1 - ((px - cx) / (w / 2)) ** 2) * .95;
      const py = top + rnd() * (cy - top);
      const r = 2 + rnd() * Math.max(2, w / 40);
      g.fillStyle = rnd() < .5 ? '#ffe08a' : '#d99a1e';
      g.beginPath(); g.ellipse(px, py, r, r * .45, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(120, 75, 8, .35)';
      g.lineWidth = .8;
      g.stroke();
      g.fillStyle = 'rgba(255, 250, 220, .5)';
      g.beginPath(); g.ellipse(px - r * .3, py - r * .12, r * .35, r * .14, 0, 0, Math.PI * 2); g.fill();
    }
  }

  function gem(g, x, y, s, color) {
    glow(g, x, y, s * 3, color, .5);
    g.fillStyle = color;
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * .7, y); g.lineTo(x, y + s * .8); g.lineTo(x - s * .7, y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255, 255, 255, .7)';
    g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s * .7, y); g.lineTo(x, y); g.closePath(); g.fill();
  }

  // De kamer: stenen muur, bogen met schatten erachter, pilaren met fakkels en een vloer vol goud.
  // Geeft { c, torches, sparkles } terug: c is het canvas, de rest zijn plekken die bewegen.
  function vault(w, h, seed = 3) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const rnd = rng(seed);
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#07050f');
    bg.addColorStop(.6, '#140d22');
    bg.addColorStop(1, '#22140b');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // Stenen blokken.
    const bh = Math.max(18, h / 24);
    const bw = bh * 2.3;
    for (let row = 0, y = 0; y < h; row++, y += bh) {
      for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
        const l = 8 + rnd() * 6;
        g.fillStyle = `hsl(${250 + rnd() * 20}, 18%, ${l}%)`;
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        g.fillStyle = 'rgba(255, 255, 255, .035)';
        g.fillRect(x + 1, y + 1, bw - 2, 2);
      }
    }
    // Bogen: donkere nissen met een gouden rand en schatten erin.
    const n = w > h ? 4 : 2;
    const torches = [];
    const sparkles = [];
    const aw = w / n;
    for (let i = 0; i < n; i++) {
      const cx = aw * (i + .5);
      const ww = aw * .62;
      const top = h * .2;
      const base = h * .8;
      g.save();
      g.beginPath();
      g.moveTo(cx - ww / 2, base);
      g.lineTo(cx - ww / 2, top + ww / 2);
      g.arc(cx, top + ww / 2, ww / 2, Math.PI, 0);
      g.lineTo(cx + ww / 2, base);
      g.closePath();
      const nis = g.createLinearGradient(0, top, 0, base);
      nis.addColorStop(0, '#030208');
      nis.addColorStop(1, '#1b1006');
      g.fillStyle = nis;
      g.fill();
      g.clip();
      glow(g, cx, base, ww * .9, '#ffb21c', .35, .6);
      heap(g, cx - ww * .15, base, ww * .7, ww * .32, rnd);
      heap(g, cx + ww * .22, base, ww * .5, ww * .22, rnd);
      for (let k = 0; k < 3; k++) sparkles.push([cx + (rnd() - .5) * ww * .6, base - rnd() * ww * .3]);
      g.restore();
      g.strokeStyle = 'rgba(255, 201, 74, .55)';
      g.lineWidth = Math.max(2, bh * .18);
      g.beginPath();
      g.moveTo(cx - ww / 2, base);
      g.lineTo(cx - ww / 2, top + ww / 2);
      g.arc(cx, top + ww / 2, ww / 2, Math.PI, 0);
      g.lineTo(cx + ww / 2, base);
      g.stroke();
      // Sluitsteen met een cyaan rune.
      g.fillStyle = '#2a2140';
      g.fillRect(cx - bh * .5, top - bh * .2, bh, bh * 1.1);
      g.fillStyle = '#4cc9ff';
      g.fillRect(cx - bh * .08, top + bh * .05, bh * .16, bh * .6);
      glow(g, cx, top + bh * .35, bh * 1.4, '#4cc9ff', .5);
    }
    // Pilaren tussen de bogen met een fakkelhouder.
    for (let i = 0; i <= n; i++) {
      const x = aw * i;
      const pw = Math.max(16, aw * .1);
      const pg = g.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
      pg.addColorStop(0, '#1d1630');
      pg.addColorStop(.5, '#3a2f55');
      pg.addColorStop(1, '#16112a');
      g.fillStyle = pg;
      g.fillRect(x - pw / 2, 0, pw, h);
      g.fillStyle = 'rgba(255, 201, 74, .3)';
      g.fillRect(x - pw / 2, h * .12, pw, 3);
      g.fillRect(x - pw / 2, h * .78, pw, 3);
      const ty = h * .42;
      g.fillStyle = '#4a3b22';
      g.fillRect(x - pw * .2, ty, pw * .4, pw * .9);
      g.fillStyle = '#2b2236';
      g.beginPath(); g.moveTo(x - pw * .45, ty); g.lineTo(x + pw * .45, ty); g.lineTo(x + pw * .25, ty + pw * .35); g.lineTo(x - pw * .25, ty + pw * .35); g.closePath(); g.fill();
      torches.push([x, ty, pw]);
    }
    // Vloer: goudbergen en losse edelstenen.
    const floor = h * .8;
    const fg = g.createLinearGradient(0, floor, 0, h);
    fg.addColorStop(0, '#2a1a0c');
    fg.addColorStop(1, '#0c0705');
    g.fillStyle = fg;
    g.fillRect(0, floor, w, h - floor);
    for (let i = 0; i < Math.max(5, w / 140); i++) {
      const x = rnd() * w;
      const hw = w / 9 + rnd() * w / 10;
      heap(g, x, h + 4, hw, hw * (.25 + rnd() * .15), rnd);
      sparkles.push([x + (rnd() - .5) * hw * .4, h - hw * .12]);
    }
    const colors = ['#4cc9ff', '#ff4d6d', '#7bf1a8', '#c77dff'];
    for (let i = 0; i < w / 90; i++) gem(g, rnd() * w, floor + 12 + rnd() * (h - floor - 16), 4 + rnd() * 6, colors[i % 4]);
    // Bovenaan donker, zodat tekst leesbaar blijft.
    const top = g.createLinearGradient(0, 0, 0, h * .35);
    top.addColorStop(0, 'rgba(4, 3, 10, .75)');
    top.addColorStop(1, 'rgba(4, 3, 10, 0)');
    g.fillStyle = top;
    g.fillRect(0, 0, w, h * .35);
    return { c, torches, sparkles };
  }

  // Fakkel met flakkerende vlam en een lichtkring op de muur.
  function torch(ctx, x, y, s, t, seed = 0) {
    const f = 1 + .12 * Math.sin(t * 13 + seed) + .06 * Math.sin(t * 29 + seed * 3);
    glow(ctx, x, y - s * .5, s * 5 * f, '#ff9a3c', .55);
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath();
    ctx.moveTo(x - s * .35, y);
    ctx.quadraticCurveTo(x - s * .4, y - s * .7 * f, x + Math.sin(t * 9 + seed) * s * .1, y - s * 1.3 * f);
    ctx.quadraticCurveTo(x + s * .4, y - s * .7 * f, x + s * .35, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(x - s * .18, y);
    ctx.quadraticCurveTo(x, y - s * .9 * f, x + s * .18, y);
    ctx.closePath();
    ctx.fill();
  }

  // Een glinster: een klein kruisje licht dat aan en uit gaat.
  function sparkle(ctx, x, y, s, a) {
    if (a <= 0) return;
    glow(ctx, x, y, s * 2.4, '#fff1b0', a * .8);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x, y - s); ctx.lineTo(x + s * .18, y - s * .18); ctx.lineTo(x + s, y); ctx.lineTo(x + s * .18, y + s * .18);
    ctx.lineTo(x, y + s); ctx.lineTo(x - s * .18, y + s * .18); ctx.lineTo(x - s, y); ctx.lineTo(x - s * .18, y - s * .18);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Een draaiende munt: spin bepaalt hoe breed hij is.
  function coin(ctx, x, y, r, spin) {
    const sx = Math.max(.12, Math.abs(Math.cos(spin)));
    ctx.fillStyle = '#9a6a0c';
    ctx.beginPath(); ctx.ellipse(x + r * .08 * sx, y, r * sx, r, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    g.addColorStop(0, '#fff3b8');
    g.addColorStop(.5, '#ffc94a');
    g.addColorStop(1, '#c78a12');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r * sx * .92, r * .92, 0, 0, Math.PI * 2); ctx.fill();
    if (sx > .4) {
      ctx.strokeStyle = 'rgba(140, 90, 10, .7)';
      ctx.lineWidth = Math.max(1, r * .12);
      ctx.beginPath(); ctx.ellipse(x, y, r * sx * .6, r * .6, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // De schatkist: open 0..1 tilt het deksel, fill 0..1 is hoe vol hij zit.
  function chest(ctx, cx, cy, s, open, fill, t) {
    const w = s;
    const h = s * .55;
    glow(ctx, cx, cy + h * .5, w * .9, '#ffb21c', .35 + fill * .3, .35);
    // Deksel, scharnier achteraan: kantelt naar achteren (wordt platter en donkerder) als hij opengaat.
    const lh = h * .75;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, Math.max(.2, 1 - open * .8));
    const lid = ctx.createLinearGradient(0, -lh, 0, 0);
    lid.addColorStop(0, open > .3 ? '#5a3210' : '#b9722a');
    lid.addColorStop(1, open > .3 ? '#2e1806' : '#6a3a10');
    ctx.fillStyle = lid;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -lh * .45);
    ctx.quadraticCurveTo(0, -lh * 1.25, w / 2, -lh * .45);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffc94a';
    ctx.lineWidth = Math.max(2, w * .025);
    ctx.stroke();
    ctx.fillStyle = '#ffc94a';
    for (const bx of [-.38, .38]) ctx.fillRect(bx * w - w * .04, -lh * .9, w * .08, lh * .9);
    ctx.restore();
    // Goud dat uit de kist puilt als hij open is.
    if (open > .05) {
      glow(ctx, cx, cy, w * .7 * (.6 + open * .6), '#ffd166', .7 * open);
      const mound = h * (.25 + fill * .45) * open;
      const gg = ctx.createRadialGradient(cx, cy - mound, 2, cx, cy, w * .5);
      gg.addColorStop(0, '#fff6c9');
      gg.addColorStop(.5, '#ffc94a');
      gg.addColorStop(1, '#a86e0e');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.moveTo(cx - w * .46, cy + 2);
      ctx.quadraticCurveTo(cx, cy - mound * 1.6, cx + w * .46, cy + 2);
      ctx.closePath();
      ctx.fill();
    }
    // Kist.
    const body = ctx.createLinearGradient(0, cy, 0, cy + h);
    body.addColorStop(0, '#9a5c1c');
    body.addColorStop(1, '#4e2a0a');
    ctx.fillStyle = body;
    ctx.fillRect(cx - w / 2, cy, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, .25)';
    for (let i = 1; i < 4; i++) ctx.fillRect(cx - w / 2, cy + (h * i) / 4, w, 2);
    // Metalen banden en het slot.
    ctx.fillStyle = '#ffc94a';
    for (const bx of [-.38, .38]) ctx.fillRect(cx + bx * w - w * .04, cy, w * .08, h);
    ctx.strokeStyle = '#ffc94a';
    ctx.lineWidth = Math.max(2, w * .025);
    ctx.strokeRect(cx - w / 2, cy, w, h);
    ctx.fillStyle = '#4cc9ff';
    ctx.fillRect(cx - w / 2, cy, w, h * .09);
    glow(ctx, cx, cy + h * .05, w * .5, '#4cc9ff', .3, .2);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(cx - w * .07, cy + h * .12, w * .14, h * .32);
    ctx.fillStyle = '#3a2205';
    ctx.beginPath(); ctx.arc(cx, cy + h * .25, w * .025, 0, Math.PI * 2); ctx.fill();
    // Glinsters rond de kist.
    for (let i = 0; i < 4; i++) {
      const a = Math.sin(t * 2.3 + i * 1.7);
      sparkle(ctx, cx + Math.cos(i * 2.1) * w * .55, cy - h * .2 + Math.sin(i * 1.3) * h * .5, w * .05, a);
    }
  }

  return { vault, torch, sparkle, coin, chest, heap, gem };
})();
