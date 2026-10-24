// De Verrader tekenen: de burchtzaal bij nacht, de gebarsten kristalkern die heelt, en de Ronde Tafel.
// Alles met canvas; de zaal wordt één keer per schermgrootte gebakken. Gebruikt Glow (fx.js) en KrArt (kristal).
const VrArt = (() => {
  function rng(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  // Een spitsboogvenster met glas-in-lood en maanlicht.
  function windowArch(g, x, y, w, h, rnd) {
    g.save();
    const path = () => {
      g.beginPath();
      g.moveTo(x, y + h);
      g.lineTo(x, y + w * .5);
      g.quadraticCurveTo(x, y, x + w / 2, y - w * .25);
      g.quadraticCurveTo(x + w, y, x + w, y + w * .5);
      g.lineTo(x + w, y + h);
      g.closePath();
    };
    path();
    g.fillStyle = '#0a0d24';
    g.fill();
    g.clip();
    const sky = g.createLinearGradient(0, y, 0, y + h);
    sky.addColorStop(0, '#1d2a6a');
    sky.addColorStop(1, '#0a0d24');
    g.fillStyle = sky;
    g.fillRect(x, y - w, w, h + w);
    // Glas-in-lood: gekleurde ruitjes.
    const cols = ['#c0304f', '#3a56d4', '#7b3fc4', '#d49a2a', '#2a9d8f'];
    const cw = w / 4, ch = h / 7;
    for (let i = 0; i < 4; i++) {
      for (let j = -1; j < 7; j++) {
        g.fillStyle = cols[Math.floor(rnd() * cols.length)];
        g.globalAlpha = .35 + rnd() * .3;
        g.fillRect(x + i * cw + 1, y + j * ch + 1, cw - 2, ch - 2);
      }
    }
    g.globalAlpha = 1;
    // Maan.
    Glow.glow(g, x + w * .62, y + h * .18, w * .7, '#cfe0ff', .55);
    g.fillStyle = '#eef3ff';
    g.beginPath(); g.arc(x + w * .62, y + h * .18, w * .14, 0, Math.PI * 2); g.fill();
    g.restore();
    path();
    g.strokeStyle = '#3b3550';
    g.lineWidth = Math.max(3, w * .08);
    g.stroke();
    g.strokeStyle = '#191526';
    g.lineWidth = Math.max(1, w * .03);
    g.beginPath(); g.moveTo(x + w / 2, y - w * .2); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h * .45); g.lineTo(x + w, y + h * .45); g.stroke();
  }

  // Een baniere aan de muur; torn = gescheurd (de verrader was hier).
  function banner(g, x, y, w, h, color, torn) {
    const cl = g.createLinearGradient(x, 0, x + w, 0);
    cl.addColorStop(0, Glow.rgba(color, .55));
    cl.addColorStop(.5, color);
    cl.addColorStop(1, Glow.rgba(color, .55));
    g.fillStyle = '#c9a24a';
    g.fillRect(x - w * .1, y - 4, w * 1.2, 6);
    g.fillStyle = cl;
    g.beginPath();
    g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h);
    if (torn) { g.lineTo(x + w * .7, y + h * .8); g.lineTo(x + w * .55, y + h * .95); g.lineTo(x + w * .35, y + h * .7); g.lineTo(x + w * .15, y + h * .85); }
    else g.lineTo(x + w / 2, y + h * .82);
    g.lineTo(x, y + h);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(255, 211, 107, .8)';
    g.lineWidth = Math.max(1, w * .05);
    g.stroke();
    // Gekruiste zwaarden.
    g.strokeStyle = 'rgba(240, 245, 255, .85)';
    g.lineWidth = Math.max(1.5, w * .07);
    g.beginPath(); g.moveTo(x + w * .2, y + h * .2); g.lineTo(x + w * .8, y + h * .55); g.moveTo(x + w * .8, y + h * .2); g.lineTo(x + w * .2, y + h * .55); g.stroke();
  }

  // De zaal: muur met spitsbogen, pilaren met fakkels, banieren, een marmeren vloer en nevel.
  function hall(w, h, seed = 7) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const rnd = rng(seed);
    const u = Math.min(w, h) / 100;
    const floorY = h * .7;
    const bg = g.createLinearGradient(0, 0, 0, floorY);
    bg.addColorStop(0, '#07060f');
    bg.addColorStop(1, '#1a1428');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, floorY);
    // Stenen blokken op de muur.
    const bh = Math.max(14, h / 30), bw = bh * 2.4;
    for (let row = 0, y = 0; y < floorY; row++, y += bh) {
      for (let x = row % 2 ? -bw / 2 : 0; x < w; x += bw) {
        g.fillStyle = `hsl(${255 + rnd() * 15}, 14%, ${7 + rnd() * 6}%)`;
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
      }
    }
    // Ramen.
    const n = w > h ? 5 : 3;
    const windows = [];
    for (let i = 0; i < n; i++) {
      const ww = Math.min(w / (n * 2.4), u * 14);
      const x = (i + .5) * w / n - ww / 2;
      windowArch(g, x, h * .12, ww, h * .42, rnd);
      windows.push([x + ww / 2, h * .33, ww]);
    }
    // Lichtbundels door de ramen op de vloer.
    for (const [x, , ww] of windows) {
      const beam = g.createLinearGradient(0, h * .3, 0, h);
      beam.addColorStop(0, 'rgba(150, 170, 255, .12)');
      beam.addColorStop(1, 'rgba(150, 170, 255, 0)');
      g.fillStyle = beam;
      g.beginPath(); g.moveTo(x - ww / 2, h * .5); g.lineTo(x + ww / 2, h * .5); g.lineTo(x + ww * 1.6, h); g.lineTo(x - ww * .4, h); g.closePath(); g.fill();
    }
    // Pilaren tussen de ramen, met fakkels en banieren.
    const torches = [];
    for (let i = 0; i <= n; i++) {
      const x = (i * w) / n;
      const pw = u * 5;
      const pg = g.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
      pg.addColorStop(0, '#15111f');
      pg.addColorStop(.4, '#3a3352');
      pg.addColorStop(1, '#100c18');
      g.fillStyle = pg;
      g.fillRect(x - pw / 2, 0, pw, floorY);
      g.fillStyle = '#2a2440';
      g.fillRect(x - pw * .7, floorY - u * 3, pw * 1.4, u * 3);
      g.fillRect(x - pw * .7, h * .06, pw * 1.4, u * 2);
      if (i > 0 && i < n) {
        banner(g, x - u * 3, h * .1, u * 6, h * .22, i % 2 ? '#b8243f' : '#2445a8', i === Math.ceil(n / 2));
        g.fillStyle = '#2a2233';
        g.fillRect(x - u * .6, h * .42, u * 1.2, u * 4);
        g.fillStyle = '#8a7a50';
        g.beginPath(); g.moveTo(x - u * 1.6, h * .42); g.lineTo(x + u * 1.6, h * .42); g.lineTo(x + u * .8, h * .42 + u * 1.6); g.lineTo(x - u * .8, h * .42 + u * 1.6); g.closePath(); g.fill();
        torches.push([x, h * .42 - u * .5, u]);
      }
    }
    // Vloer: marmeren tegels in perspectief.
    const fg = g.createLinearGradient(0, floorY, 0, h);
    fg.addColorStop(0, '#1b1626');
    fg.addColorStop(1, '#0a0810');
    g.fillStyle = fg;
    g.fillRect(0, floorY, w, h - floorY);
    const vx = w / 2;
    g.strokeStyle = 'rgba(160, 150, 200, .12)';
    g.lineWidth = 1;
    for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(vx + i * w * .02, floorY); g.lineTo(vx + i * w * .16, h); g.stroke(); }
    for (let k = 1; k < 9; k++) { const y = floorY + (h - floorY) * (k / 9) ** 1.6; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    // Runencirkel op de vloer, waar de kern staat.
    g.save();
    g.translate(w / 2, floorY + (h - floorY) * .45);
    g.scale(1, .28);
    g.strokeStyle = 'rgba(76, 201, 255, .35)';
    g.lineWidth = u * .8;
    for (const r of [u * 26, u * 20]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    Glow.glow(g, w / 2, floorY + (h - floorY) * .45, u * 30, '#4cc9ff', .25);
    // Nevel over de vloer.
    const mist = g.createLinearGradient(0, floorY - u * 6, 0, h);
    mist.addColorStop(0, 'rgba(120, 100, 180, 0)');
    mist.addColorStop(.3, 'rgba(120, 100, 180, .12)');
    mist.addColorStop(1, 'rgba(20, 10, 40, .4)');
    g.fillStyle = mist;
    g.fillRect(0, floorY - u * 6, w, h - floorY + u * 6);
    return { c, torches, windows };
  }

  // Een fakkel die flakkert.
  function torch(ctx, x, y, u, t, i = 0) {
    const fl = .8 + Math.sin(t * 13 + i) * .1 + Math.sin(t * 7.3 + i * 2.1) * .1;
    Glow.glow(ctx, x, y - u, u * 14 * fl, '#ff8a2a', .55 * fl);
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.moveTo(x - u * 1.1, y);
    ctx.quadraticCurveTo(x - u * 1.2, y - u * 2.2 * fl, x + Math.sin(t * 9 + i) * u * .4, y - u * 3.6 * fl);
    ctx.quadraticCurveTo(x + u * 1.2, y - u * 2.2 * fl, x + u * 1.1, y);
    ctx.closePath();
    ctx.fill();
    Glow.glow(ctx, x, y - u * 1.2, u * 2.4, '#fff2b0', .9);
  }

  // De kristalkern op een sokkel: gebarsten zolang ze niet hersteld is, met splinters die eromheen draaien.
  function core(ctx, cx, cy, s, pct, t, hit = 0) {
    const p = Math.max(0, Math.min(1, pct));
    // Sokkel.
    ctx.fillStyle = '#2a2440';
    ctx.beginPath(); ctx.ellipse(cx, cy + s * 1.05, s * .75, s * .18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3d3560';
    ctx.fillRect(cx - s * .45, cy + s * .8, s * .9, s * .25);
    ctx.beginPath(); ctx.ellipse(cx, cy + s * .8, s * .45, s * .1, 0, 0, Math.PI * 2); ctx.fill();
    // Rood flakkeren als de kern nog zwak is.
    if (p < .35) Glow.glow(ctx, cx, cy, s * 1.4, '#ff4d6d', (.35 - p) * (1 + Math.sin(t * 6)) * .5);
    KrArt.crystal(ctx, cx, cy, s * .85, t, p, hit);
    // Barsten die verdwijnen naarmate de kern heelt.
    const crack = 1 - p;
    if (crack > .02) {
      ctx.save();
      ctx.strokeStyle = `rgba(20, 8, 40, ${crack * .9})`;
      ctx.lineWidth = Math.max(1.5, s * .03);
      const lines = [[[0, -.75], [.08, -.4], [-.06, -.1], [.1, .2], [0, .5]], [[-.3, -.2], [-.12, -.05], [-.2, .2]], [[.32, -.3], [.15, -.1], [.25, .15]]];
      for (const l of lines.slice(0, 1 + Math.round(crack * 2))) {
        ctx.beginPath();
        l.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s)));
        ctx.stroke();
      }
      ctx.restore();
    }
    // Splinters die rond de kern draaien: meer naarmate ze voller is.
    const shards = 3 + Math.round(p * 9);
    for (let i = 0; i < shards; i++) {
      const a = t * (.8 + (i % 3) * .2) + (i / shards) * Math.PI * 2;
      const r = s * (.95 + (i % 2) * .15);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .35 + s * .2;
      if (Math.sin(a) < 0) ctx.globalAlpha = .55;
      KrArt.gem(ctx, x, y, s * .07, KrArt.COLORS[i % 4], a * 3);
      ctx.globalAlpha = 1;
    }
  }

  // De Ronde Tafel van bovenaf schuin: houten blad, kaarsen, en een schild per ridder rondom.
  // seats: [{ name, out, mark }]; mark = tekst op het schild (aantal stemmen, ⚖️, 👻 ...).
  function table(ctx, cx, cy, rx, ry, seats, t) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, .45)';
    ctx.beginPath(); ctx.ellipse(cx, cy + ry * .25, rx * 1.05, ry * 1.05, 0, 0, Math.PI * 2); ctx.fill();
    // Rand en blad.
    ctx.fillStyle = '#3a2412';
    ctx.beginPath(); ctx.ellipse(cx, cy + ry * .12, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    const wood = ctx.createRadialGradient(cx - rx * .3, cy - ry * .4, 4, cx, cy, rx);
    wood.addColorStop(0, '#9a6230');
    wood.addColorStop(.7, '#6b3f1c');
    wood.addColorStop(1, '#4a2a12');
    ctx.fillStyle = wood;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 211, 107, .55)';
    ctx.lineWidth = Math.max(2, rx * .012);
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * .92, ry * .92, 0, 0, Math.PI * 2); ctx.stroke();
    // Houtnerf.
    ctx.strokeStyle = 'rgba(40, 20, 8, .25)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.ellipse(cx, cy, rx * k / 6.5, ry * k / 6.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    // Embleem in het midden.
    Glow.glow(ctx, cx, cy, rx * .35, '#ffc94a', .35);
    ctx.fillStyle = 'rgba(255, 211, 107, .7)';
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * .12, ry * .12, 0, 0, Math.PI * 2); ctx.fill();
    // Kaarsen.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + .3;
      const x = cx + Math.cos(a) * rx * .45, y = cy + Math.sin(a) * ry * .45;
      ctx.fillStyle = '#efe6d0';
      ctx.fillRect(x - rx * .012, y - ry * .14, rx * .024, ry * .14);
      const fl = .85 + Math.sin(t * 11 + i * 2) * .15;
      Glow.glow(ctx, x, y - ry * .17, rx * .09 * fl, '#ffb347', .7);
      Glow.glow(ctx, x, y - ry * .17, rx * .025, '#fff6d0', .95);
    }
    // Schilden rondom.
    const n = Math.max(1, seats.length);
    const s = Math.min(rx * .2, (Math.PI * 2 * rx) / n * .32);
    seats.forEach((p, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx * 1.1, y = cy + Math.sin(a) * ry * 1.18;
      ctx.globalAlpha = p.out ? .45 : 1;
      const col = p.color || '#3d8bff';
      ctx.fillStyle = '#141a30';
      ctx.beginPath();
      ctx.moveTo(x - s * .5, y - s * .55); ctx.lineTo(x + s * .5, y - s * .55); ctx.lineTo(x + s * .5, y);
      ctx.quadraticCurveTo(x + s * .5, y + s * .45, x, y + s * .65); ctx.quadraticCurveTo(x - s * .5, y + s * .45, x - s * .5, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = p.hot ? '#ffc94a' : col;
      ctx.lineWidth = Math.max(2, s * (p.hot ? .1 : .06));
      ctx.stroke();
      if (p.hot) Glow.glow(ctx, x, y, s * 1.2, '#ffc94a', .5);
      ctx.fillStyle = '#eaf4ff';
      ctx.font = `800 ${Math.round(s * .26)}px 'Exo 2', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const name = p.name.length > 9 ? `${p.name.slice(0, 8)}…` : p.name;
      ctx.fillText(name, x, y + s * .9);
      if (p.mark) {
        ctx.font = `900 ${Math.round(s * .42)}px Orbitron, sans-serif`;
        ctx.fillStyle = p.hot ? '#ffc94a' : '#eaf4ff';
        ctx.fillText(p.mark, x, y);
      }
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  return { hall, torch, core, table };
})();
