// Duel in de arena tekenen: een colosseum bij avond, met tribunes vol publiek, banieren, fakkels en een zandvloer
// in het licht van schijnwerpers. Eén keer per schermgrootte gebakken; fakkels en flitsen bewegen. Gebruikt Glow.
const DuArt = (() => {
  function rng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  function colosseum(w, h, seed = 9) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const rnd = rng(seed);
    const u = Math.min(w, h) / 100;
    const cx = w / 2;
    // Hemel bij avond.
    const sky = g.createLinearGradient(0, 0, 0, h * .4);
    sky.addColorStop(0, '#05030e');
    sky.addColorStop(1, '#2a0f2e');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(230, 220, 255, ${.3 + rnd() * .6})`;
      g.fillRect(rnd() * w, rnd() * h * .25, Math.max(1, u * .2), Math.max(1, u * .2));
    }
    // Tribunes: rijen in bogen, van ver (boven) naar dichtbij (onder), met publiek.
    const floorY = h * .62;
    const rows = 9;
    const crowd = [];
    for (let r = 0; r < rows; r++) {
      const y0 = h * .14 + (r / rows) * (floorY - h * .14);
      const y1 = h * .14 + ((r + 1) / rows) * (floorY - h * .14);
      const curve = (x, y) => y + Math.pow((x - cx) / (w * .5), 2) * h * .05;
      g.fillStyle = `hsl(${270 + r * 3}, 22%, ${10 + r * 2}%)`;
      g.beginPath();
      g.moveTo(0, curve(0, y0));
      for (let x = 0; x <= w; x += w / 40) g.lineTo(x, curve(x, y0));
      for (let x = w; x >= 0; x -= w / 40) g.lineTo(x, curve(x, y1));
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255, 255, 255, .06)';
      g.beginPath();
      for (let x = 0; x <= w; x += w / 40) g.lineTo(x, curve(x, y0) + 1);
      g.lineTo(w, curve(w, y0) + Math.max(1, u * .3));
      g.lineTo(0, curve(0, y0) + Math.max(1, u * .3));
      g.closePath();
      g.fill();
      // Publiek: hoofdjes en schouders in de kleuren van de twee kanten.
      const step = Math.max(4, u * (1.1 + r * .12));
      for (let x = rnd() * step; x < w; x += step * (.8 + rnd() * .5)) {
        if (rnd() < .12) continue;
        const y = curve(x, y0) + (y1 - y0) * .55;
        const sz = step * .32;
        const side = x < cx ? 0 : 1;
        const col = rnd() < .65 ? (side ? '#3d6bff' : '#ff4d6d') : ['#ffc94a', '#e6e0f0', '#5ef0c8'][Math.floor(rnd() * 3)];
        g.fillStyle = col;
        g.globalAlpha = .35 + r * .05;
        g.beginPath(); g.ellipse(x, y + sz * 1.1, sz * 1.05, sz * .75, 0, Math.PI, 0); g.fill();
        g.fillStyle = '#c9a07a';
        g.beginPath(); g.arc(x, y, sz * .55, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
        if (rnd() < .2) crowd.push([x, y]);
      }
    }
    // Pilaren met bogen aan de achterkant, en banieren.
    const torches = [];
    const n = 7;
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * w;
      const top = h * .06, bot = h * .18 + Math.pow((x - cx) / (w * .5), 2) * h * .05;
      g.fillStyle = '#3a2f4a';
      g.fillRect(x - u * 1.4, top, u * 2.8, bot - top);
      if (i < n) {
        const mx = x + w / n / 2;
        g.strokeStyle = '#3a2f4a';
        g.lineWidth = u * 1.6;
        g.beginPath(); g.arc(mx, top + u * 3, w / n / 2 - u * 1.4, Math.PI, 0); g.stroke();
        const col = i % 2 ? '#3d6bff' : '#ff4d6d';
        const bw = u * 3.2, bh = (bot - top) * .8;
        g.fillStyle = col;
        g.beginPath(); g.moveTo(mx - bw / 2, top + u * 4); g.lineTo(mx + bw / 2, top + u * 4); g.lineTo(mx + bw / 2, top + u * 4 + bh); g.lineTo(mx, top + u * 4 + bh * .8); g.lineTo(mx - bw / 2, top + u * 4 + bh); g.closePath(); g.fill();
        g.strokeStyle = '#ffd36b';
        g.lineWidth = Math.max(1, u * .3);
        g.stroke();
        g.fillStyle = '#ffd36b';
        g.beginPath(); g.arc(mx, top + u * 4 + bh * .4, bw * .22, 0, Math.PI * 2); g.fill();
      }
      torches.push([x, top - u * .5, u]);
    }
    // De muur rond de arena met een poort in het midden.
    const wallTop = floorY - h * .05;
    const wg = g.createLinearGradient(0, wallTop, 0, floorY);
    wg.addColorStop(0, '#5a4a3a');
    wg.addColorStop(1, '#2a2018');
    g.fillStyle = wg;
    g.fillRect(0, wallTop, w, floorY - wallTop);
    g.fillStyle = 'rgba(0, 0, 0, .35)';
    for (let x = 0; x < w; x += u * 5) g.fillRect(x, wallTop, Math.max(1, u * .2), floorY - wallTop);
    g.fillStyle = '#ffd36b';
    g.fillRect(0, wallTop, w, Math.max(1, u * .35));
    const gw = w * .08, gh = (floorY - wallTop) * 1.6;
    g.fillStyle = '#0a0608';
    g.beginPath(); g.moveTo(cx - gw / 2, floorY); g.lineTo(cx - gw / 2, floorY - gh + gw / 2); g.arc(cx, floorY - gh + gw / 2, gw / 2, Math.PI, 0); g.lineTo(cx + gw / 2, floorY); g.closePath(); g.fill();
    // Zandvloer met lichtcirkel.
    const sand = g.createLinearGradient(0, floorY, 0, h);
    sand.addColorStop(0, '#6a4a2a');
    sand.addColorStop(1, '#2a1a0e');
    g.fillStyle = sand;
    g.fillRect(0, floorY, w, h - floorY);
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(${rnd() < .5 ? '255,220,170' : '30,15,5'}, ${.08 + rnd() * .1})`;
      g.fillRect(rnd() * w, floorY + rnd() * (h - floorY), Math.max(1, u * .3), Math.max(1, u * .2));
    }
    g.save();
    g.translate(cx, floorY + (h - floorY) * .45);
    g.scale(1, .3);
    const pool = g.createRadialGradient(0, 0, 0, 0, 0, w * .35);
    pool.addColorStop(0, 'rgba(255, 230, 170, .45)');
    pool.addColorStop(1, 'rgba(255, 230, 170, 0)');
    g.fillStyle = pool;
    g.beginPath(); g.arc(0, 0, w * .35, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255, 211, 107, .35)';
    g.lineWidth = u * 1.2;
    g.beginPath(); g.arc(0, 0, w * .2, 0, Math.PI * 2); g.stroke();
    g.restore();
    return { c, torches, crowd, floorY };
  }

  function torch(ctx, x, y, u, t, i = 0) {
    const fl = .8 + Math.sin(t * 12 + i) * .12 + Math.sin(t * 7.7 + i * 1.9) * .08;
    Glow.glow(ctx, x, y, u * 9 * fl, '#ff8a2a', .6 * fl);
    Glow.glow(ctx, x, y, u * 2, '#fff2b0', .9);
  }

  return { colosseum, torch };
})();
