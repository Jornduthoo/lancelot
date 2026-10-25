// Cyber-Galaga tekenen: cyberdraken, de klasbaas, lasers, vuurballen, gloed en de sterrenhemel.
// Alles wordt één keer op een eigen canvas getekend (met gloed) en daarna alleen nog met drawImage gebruikt.
// Zo blijft het vloeiend, ook op een Chromebook. Gebruikt door het bord en de leerlingen.
const CgArt = (() => {
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff', '#9be15d', '#f2f2f2'];
  // Soorten draken: gewoon, vuur (schiet), pantser (sterk) en goud (zeldzaam, veel punten).
  const DRAGONS = [
    { body: '#0d3a2c', belly: '#1f7a5c', neon: '#2ee6a6', eye: '#eafff6' },
    { body: '#3a0b14', belly: '#8a1a2c', neon: '#ff4d6d', eye: '#fff1a8' },
    { body: '#21114a', belly: '#4a2a8c', neon: '#c77dff', eye: '#e9d5ff', armor: true },
    { body: '#3a2a05', belly: '#9a6b0c', neon: '#ffc94a', eye: '#ffffff', armor: true },
  ];
  const cache = new Map();

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  function cached(key, make) {
    if (cache.has(key)) return cache.get(key);
    if (cache.size > 160) cache.clear();
    const c = make();
    cache.set(key, c);
    return c;
  }

  // ---------- Cyberdraak (kijkt naar beneden, naar de ridders) ----------

  function wing(g, P, flap) {
    const tipY = -15 + flap * 7;
    g.beginPath();
    g.moveTo(5, -5);
    g.quadraticCurveTo(14, -16 + flap * 4, 25, tipY);
    g.lineTo(22, tipY + 6);
    g.quadraticCurveTo(21, tipY + 9, 24, tipY + 13);
    g.quadraticCurveTo(18, tipY + 13, 17, tipY + 17);
    g.quadraticCurveTo(13, tipY + 16, 11, tipY + 21);
    g.quadraticCurveTo(8, 4, 5, 5);
    g.closePath();
    const grad = g.createLinearGradient(5, 0, 25, tipY);
    grad.addColorStop(0, P.belly);
    grad.addColorStop(1, P.body);
    g.fillStyle = grad;
    g.globalAlpha = .92;
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = P.neon;
    g.lineWidth = 1.3;
    g.shadowColor = P.neon;
    g.shadowBlur = 6;
    g.stroke();
    // Ribben met lichtlijnen, zoals een printplaat.
    g.lineWidth = .7;
    g.beginPath();
    g.moveTo(6, -4); g.lineTo(22, tipY + 6);
    g.moveTo(6, -2); g.lineTo(17, tipY + 16);
    g.moveTo(6, 0); g.lineTo(11, tipY + 20);
    g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = P.neon;
    for (const [x, y] of [[22, tipY + 6], [17, tipY + 16], [11.5, tipY + 19]]) g.fillRect(x - .9, y - .9, 1.8, 1.8);
  }

  function drawDragon(g, type, frame) {
    const P = DRAGONS[type] || DRAGONS[0];
    const flap = frame ? 1 : -.6;
    // Staart (naar boven, weg van de ridders).
    g.strokeStyle = P.body;
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -4);
    g.quadraticCurveTo(frame ? 5 : -5, -14, 0, -21);
    g.stroke();
    g.strokeStyle = P.neon;
    g.lineWidth = 1;
    g.stroke();
    g.fillStyle = P.neon;
    g.beginPath();
    g.moveTo(0, -27); g.lineTo(4, -21); g.lineTo(0, -19); g.lineTo(-4, -21);
    g.closePath();
    g.fill();
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      wing(g, P, flap);
      g.restore();
    }
    // Lijf.
    const body = g.createRadialGradient(-2, -2, 1, 0, 0, 11);
    body.addColorStop(0, P.belly);
    body.addColorStop(1, P.body);
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(0, 0, 7.5, 10.5, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = P.neon;
    g.lineWidth = 1;
    g.shadowColor = P.neon;
    g.shadowBlur = 5;
    g.stroke();
    g.shadowBlur = 0;
    if (P.armor) {
      // Pantserplaten van staal.
      g.strokeStyle = '#cfd8ea';
      g.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc(0, -6 + i * 4.5, 6.5 - i * .6, Math.PI * .15, Math.PI * .85);
        g.stroke();
      }
    } else {
      g.strokeStyle = P.neon;
      g.globalAlpha = .7;
      g.lineWidth = .7;
      g.beginPath();
      g.moveTo(0, -8); g.lineTo(0, 6);
      g.moveTo(-4, -3); g.lineTo(0, -1); g.lineTo(4, -3);
      g.moveTo(-4, 3); g.lineTo(0, 5); g.lineTo(4, 3);
      g.stroke();
      g.globalAlpha = 1;
    }
    // Kop met hoorns, snuit naar beneden.
    g.fillStyle = P.body;
    g.beginPath();
    g.moveTo(-6.5, 7); g.lineTo(6.5, 7); g.lineTo(5, 15); g.lineTo(2, 19.5); g.lineTo(-2, 19.5); g.lineTo(-5, 15);
    g.closePath();
    g.fill();
    g.strokeStyle = P.neon;
    g.lineWidth = 1.1;
    g.shadowColor = P.neon;
    g.shadowBlur = 5;
    g.stroke();
    g.beginPath();
    g.moveTo(-5.5, 8); g.lineTo(-10, 2); g.lineTo(-7, 8.5);
    g.moveTo(5.5, 8); g.lineTo(10, 2); g.lineTo(7, 8.5);
    g.fillStyle = '#e8edf5';
    g.fill();
    // Gloeiende ogen.
    g.shadowColor = P.eye;
    g.shadowBlur = 8;
    g.fillStyle = P.eye;
    g.beginPath();
    g.moveTo(-4.5, 11); g.lineTo(-1.2, 12.5); g.lineTo(-4, 13.4);
    g.moveTo(4.5, 11); g.lineTo(1.2, 12.5); g.lineTo(4, 13.4);
    g.fill();
    g.shadowBlur = 0;
    if (type === 1) {
      // Vuurdraak: een gloed in de bek.
      const fire = g.createRadialGradient(0, 19, 0, 0, 19, 5);
      fire.addColorStop(0, 'rgba(255,240,170,1)');
      fire.addColorStop(1, 'rgba(255,90,40,0)');
      g.fillStyle = fire;
      g.fillRect(-5, 14, 10, 10);
    }
  }

  // Een draak op schaal s (pixels per eenheid). Twee beelden: vleugels op en neer. hit = wit opflitsen.
  function dragon(type, frame, s, hit = false) {
    return cached(`d${type}|${frame}|${s.toFixed(2)}|${hit ? 1 : 0}`, () => {
      const size = 58;
      const c = canvas(size * s, size * s);
      const g = c.getContext('2d');
      g.scale(s, s);
      g.translate(size / 2, size / 2);
      drawDragon(g, type, frame);
      if (hit) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(255,255,255,.85)';
        g.fillRect(-size / 2, -size / 2, size, size);
      }
      return c;
    });
  }

  // ---------- De klasbaas: een reuzendraak met een kroon en mechapantser ----------

  function drawBoss(g, frame, hurt) {
    const flap = frame ? 1 : 0;
    const neon = hurt ? '#ffffff' : '#ff4dd2';
    const neon2 = '#4cc9ff';
    // Vleugels.
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      const tip = -70 + flap * 16;
      g.beginPath();
      g.moveTo(30, -18);
      g.quadraticCurveTo(80, -70 + flap * 8, 140, tip);
      g.lineTo(128, tip + 22);
      g.quadraticCurveTo(132, tip + 38, 138, tip + 52);
      g.quadraticCurveTo(116, tip + 50, 110, tip + 66);
      g.quadraticCurveTo(92, tip + 62, 84, tip + 80);
      g.quadraticCurveTo(66, tip + 74, 56, tip + 92);
      g.quadraticCurveTo(44, 8, 30, 14);
      g.closePath();
      const grad = g.createLinearGradient(30, 0, 140, tip);
      grad.addColorStop(0, '#3a1250');
      grad.addColorStop(1, '#120720');
      g.fillStyle = grad;
      g.fill();
      g.strokeStyle = neon;
      g.lineWidth = 2.2;
      g.shadowColor = neon;
      g.shadowBlur = 14;
      g.stroke();
      g.lineWidth = 1.2;
      g.beginPath();
      for (const [x, y] of [[128, tip + 22], [110, tip + 66], [84, tip + 80], [56, tip + 92]]) { g.moveTo(34, -12); g.lineTo(x, y); }
      g.stroke();
      g.shadowBlur = 0;
      // Mechaklauw op de vleugelpunt.
      g.fillStyle = '#cfd8ea';
      g.beginPath();
      g.moveTo(140, tip); g.lineTo(150, tip - 10); g.lineTo(146, tip + 4);
      g.fill();
      g.restore();
    }
    // Staart achter het lijf.
    g.strokeStyle = '#2a0d3c';
    g.lineWidth = 12;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -20);
    g.bezierCurveTo(frame ? 30 : -30, -55, frame ? -24 : 24, -70, 0, -82);
    g.stroke();
    g.strokeStyle = neon;
    g.lineWidth = 2;
    g.stroke();
    // Lijf met pantserplaten.
    const body = g.createRadialGradient(-8, -8, 4, 0, 0, 44);
    body.addColorStop(0, '#6a2a8c');
    body.addColorStop(1, '#1a0a2a');
    g.fillStyle = body;
    g.beginPath();
    g.ellipse(0, 0, 36, 44, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = neon;
    g.lineWidth = 2;
    g.shadowColor = neon;
    g.shadowBlur = 12;
    g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = '#d6deee';
    g.lineWidth = 3.5;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(0, -26 + i * 11, 31 - i * 2, Math.PI * .18, Math.PI * .82);
      g.stroke();
    }
    // De kern: het zwakke punt.
    const core = g.createRadialGradient(0, 14, 1, 0, 14, 15);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(.35, neon2);
    core.addColorStop(1, 'rgba(76,201,255,0)');
    g.fillStyle = core;
    g.beginPath();
    g.arc(0, 14, 15, 0, Math.PI * 2);
    g.fill();
    // Kop.
    g.fillStyle = '#24103a';
    g.beginPath();
    g.moveTo(-26, 32); g.lineTo(26, 32); g.lineTo(22, 58); g.lineTo(10, 76); g.lineTo(-10, 76); g.lineTo(-22, 58);
    g.closePath();
    g.fill();
    g.strokeStyle = neon;
    g.lineWidth = 2.4;
    g.shadowColor = neon;
    g.shadowBlur = 12;
    g.stroke();
    g.shadowBlur = 0;
    // Mechakaak.
    g.fillStyle = '#9aa8c2';
    g.beginPath();
    g.moveTo(-14, 62); g.lineTo(14, 62); g.lineTo(9, 74); g.lineTo(-9, 74);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    for (let i = -2; i <= 2; i++) {
      g.beginPath();
      g.moveTo(i * 4 - 1.5, 74); g.lineTo(i * 4 + 1.5, 74); g.lineTo(i * 4, 79);
      g.fill();
    }
    // Hoorns en een donkere kroon.
    g.fillStyle = '#e8edf5';
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(side * 20, 34); g.quadraticCurveTo(side * 44, 20, side * 46, 2); g.quadraticCurveTo(side * 36, 22, side * 12, 32);
      g.fill();
    }
    g.fillStyle = '#ffc94a';
    g.shadowColor = '#ffc94a';
    g.shadowBlur = 10;
    g.beginPath();
    g.moveTo(-18, 34); g.lineTo(-18, 22); g.lineTo(-11, 28); g.lineTo(-5, 16); g.lineTo(0, 26); g.lineTo(5, 16); g.lineTo(11, 28); g.lineTo(18, 22); g.lineTo(18, 34);
    g.closePath();
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#ff4d6d';
    g.beginPath(); g.arc(0, 29, 2.6, 0, Math.PI * 2); g.fill();
    // Gloeiende ogen.
    g.fillStyle = hurt ? '#ffffff' : '#ff3b3b';
    g.shadowColor = '#ff3b3b';
    g.shadowBlur = 16;
    g.beginPath();
    g.moveTo(-18, 44); g.lineTo(-6, 49); g.lineTo(-16, 52);
    g.moveTo(18, 44); g.lineTo(6, 49); g.lineTo(16, 52);
    g.fill();
    g.shadowBlur = 0;
  }

  // De klasbaas is 320 breed en 220 hoog (in eenheden); het midden ligt op (160, 100).
  function boss(frame, s, hurt = false) {
    return cached(`b${frame}|${s.toFixed(2)}|${hurt ? 1 : 0}`, () => {
      const c = canvas(320 * s, 220 * s);
      const g = c.getContext('2d');
      g.scale(s, s);
      g.translate(160, 100);
      drawBoss(g, frame, hurt);
      return c;
    });
  }

  // ---------- Kleine dingen ----------

  // Een zachte gloed: voor deeltjes, kogels en ontploffingen. r in pixels.
  function glow(color, r) {
    r = Math.max(2, Math.round(r));
    return cached(`g${color}|${r}`, () => {
      const c = canvas(r * 2, r * 2);
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(.25, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, r * 2, r * 2);
      return c;
    });
  }

  // Een laserstraal (8 x 26 eenheden).
  function bolt(color, s) {
    return cached(`l${color}|${s.toFixed(2)}`, () => {
      const c = canvas(14 * s, 34 * s);
      const g = c.getContext('2d');
      g.scale(s, s);
      g.translate(7, 17);
      g.shadowColor = color;
      g.shadowBlur = 8;
      g.fillStyle = color;
      g.beginPath();
      g.roundRect(-3, -12, 6, 24, 3);
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.roundRect(-1.2, -10, 2.4, 20, 1.2);
      g.fill();
      return c;
    });
  }

  // Een vuurbal van een draak.
  function fireball(s, color = '#ff7a3d') {
    return cached(`f${color}|${s.toFixed(2)}`, () => {
      const c = canvas(22 * s, 22 * s);
      const g = c.getContext('2d');
      g.scale(s, s);
      const grad = g.createRadialGradient(11, 11, 0, 11, 11, 11);
      grad.addColorStop(0, '#fffbe0');
      grad.addColorStop(.3, '#ffd23f');
      grad.addColorStop(.6, color);
      grad.addColorStop(1, 'rgba(255,60,30,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 22, 22);
      return c;
    });
  }

  // ---------- De hemel: nevel, sterren en zwevende burchten ----------

  function nebula(w, h) {
    return cached(`n${w}x${h}`, () => {
      const c = canvas(w, h);
      const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#05030f');
      bg.addColorStop(.55, '#0a0820');
      bg.addColorStop(1, '#120a26');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, h);
      const blob = (x, y, r, col) => {
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, col);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(x - r, y - r, r * 2, r * 2);
      };
      blob(w * .2, h * .3, Math.max(w, h) * .45, 'rgba(120, 40, 200, .22)');
      blob(w * .85, h * .65, Math.max(w, h) * .4, 'rgba(30, 120, 255, .18)');
      blob(w * .5, h * 1.05, Math.max(w, h) * .5, 'rgba(255, 60, 140, .14)');
      return c;
    });
  }

  // De hemel met, op een breed scherm, de randen naast het speelveld: donkere burchttorens met neonramen,
  // banieren en lichtrails. Eén keer gebakken, zodat de randen niets kosten tijdens het spelen.
  function frame(w, h, ox, pw) {
    return cached(`f${w}x${h}|${ox}|${pw}`, () => {
      const c = canvas(w, h);
      const g = c.getContext('2d');
      g.drawImage(nebula(w, h), 0, 0);
      if (ox <= 4) return c;
      let r = 7;
      const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      for (const [x0, x1, side] of [[0, ox, 0], [ox + pw, w, 1]]) {
        const gw = x1 - x0;
        g.save();
        g.beginPath();
        g.rect(x0, 0, gw, h);
        g.clip();
        g.fillStyle = 'rgba(3, 2, 10, .6)';
        g.fillRect(x0, 0, gw, h);
        // Verre bergen en een burcht als silhouet achter de torens.
        g.fillStyle = '#0a0720';
        g.beginPath(); g.moveTo(x0, h);
        for (let x = x0; x <= x1 + 10; x += gw / 6) g.lineTo(x, h * (.5 + rnd() * .14));
        g.lineTo(x1, h); g.closePath(); g.fill();
        // Torens van ver naar dichtbij, aan de buitenkant het hoogst.
        const lit = side ? '#4cc9ff' : '#ff5fd2';
        for (let k = 0; k < 3; k++) {
          const tw = gw * (.28 + rnd() * .14);
          const edge = side ? x1 - tw * (k * 1.1 + .2) - tw : x0 + tw * (k * 1.1 + .2);
          const th = h * (.55 - k * .12 + rnd() * .08);
          const top = h - th;
          const body = ['#0b0820', '#120c2c', '#1a1238'][k];
          g.fillStyle = body;
          g.fillRect(edge, top, tw, th);
          // Gemetselde rijen: een lichte voeg om de zoveel, verspringend.
          const row = Math.max(6, tw * .16);
          g.fillStyle = 'rgba(160, 140, 255, .05)';
          for (let y = top + row, i = 0; y < h; y += row, i++) {
            g.fillRect(edge, y, tw, 1);
            for (let x = edge + (i % 2 ? row : row * 2); x < edge + tw; x += row * 2.2) g.fillRect(x, y - row, 1, row);
          }
          // Een lichtrand aan de kant van het speelveld, schaduw aan de andere kant.
          const rim = g.createLinearGradient(edge, 0, edge + tw, 0);
          rim.addColorStop(0, side ? Glow.rgba(lit, .16) : 'rgba(0,0,0,.35)');
          rim.addColorStop(.25, 'rgba(0,0,0,0)');
          rim.addColorStop(.75, 'rgba(0,0,0,0)');
          rim.addColorStop(1, side ? 'rgba(0,0,0,.35)' : Glow.rgba(lit, .16));
          g.fillStyle = rim;
          g.fillRect(edge, top, tw, th);
          g.fillStyle = body;
          for (let m = 0; m < 5; m += 2) g.fillRect(edge + m * tw / 5, top - tw * .14, tw / 5, tw * .14);
          g.fillStyle = ['#0d0a26', '#150f33', '#1e1642'][k];
          g.beginPath(); g.moveTo(edge - tw * .1, top - tw * .14); g.lineTo(edge + tw / 2, top - tw * .9); g.lineTo(edge + tw * 1.1, top - tw * .14); g.closePath(); g.fill();
          // Dak: een lichte kant en leien rijen.
          g.fillStyle = Glow.rgba(lit, .1);
          g.beginPath(); g.moveTo(edge + tw / 2, top - tw * .9);
          if (side) { g.lineTo(edge - tw * .1, top - tw * .14); g.lineTo(edge + tw * .5, top - tw * .14); } else { g.lineTo(edge + tw * 1.1, top - tw * .14); g.lineTo(edge + tw * .5, top - tw * .14); }
          g.closePath(); g.fill();
          g.strokeStyle = 'rgba(0, 0, 0, .35)';
          g.lineWidth = 1;
          for (let q = 1; q < 4; q++) {
            const yy = top - tw * .14 - tw * .76 * q / 4, half = tw * .6 * (1 - q / 4);
            g.beginPath(); g.moveTo(edge + tw / 2 - half, yy); g.lineTo(edge + tw / 2 + half, yy); g.stroke();
          }
          // Vlaggetje op de spits.
          g.strokeStyle = '#3a3460';
          g.beginPath(); g.moveTo(edge + tw / 2, top - tw * .9); g.lineTo(edge + tw / 2, top - tw * 1.15); g.stroke();
          g.fillStyle = Glow.rgba(lit, .8);
          g.beginPath(); g.moveTo(edge + tw / 2, top - tw * 1.15); g.lineTo(edge + tw / 2 + (side ? -1 : 1) * tw * .22, top - tw * 1.09); g.lineTo(edge + tw / 2, top - tw * 1.03); g.closePath(); g.fill();
          // Boogramen met neonlicht.
          for (let y = top + tw * .3; y < h - tw * .3; y += tw * .55) {
            if (rnd() < .45) continue;
            const col = rnd() < .5 ? '#4cc9ff' : '#ff5fd2';
            const wx = edge + tw * .4, ww = tw * .2, wh = tw * .28;
            glowDot(g, wx + ww / 2, y + wh / 2, tw * .5, col);
            g.fillStyle = '#05040c';
            g.beginPath(); g.moveTo(wx - 1, y + wh + 1); g.lineTo(wx - 1, y + ww / 2); g.arc(wx + ww / 2, y + ww / 2, ww / 2 + 1, Math.PI, 0); g.lineTo(wx + ww + 1, y + wh + 1); g.closePath(); g.fill();
            g.fillStyle = col;
            g.globalAlpha = .55 + rnd() * .4;
            g.beginPath(); g.moveTo(wx, y + wh); g.lineTo(wx, y + ww / 2); g.arc(wx + ww / 2, y + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, y + wh); g.closePath(); g.fill();
            g.globalAlpha = 1;
            g.fillStyle = 'rgba(5, 4, 12, .7)';
            g.fillRect(wx + ww / 2 - .5, y + ww * .2, 1, wh - ww * .2);
            g.fillRect(wx, y + wh * .6, ww, 1);
          }
          // Een uitbouw met een lampje naar de volgende toren.
          if (k < 2) {
            const by = top + th * (.25 + rnd() * .2);
            g.fillStyle = body;
            g.fillRect(side ? edge - tw * .2 : edge + tw, by, tw * .2, tw * .14);
            g.fillStyle = 'rgba(255, 201, 74, .5)';
            g.fillRect(side ? edge - tw * .14 : edge + tw * 1.04, by + tw * .05, tw * .03, tw * .04);
          }
        }
        // Een kantelmuur vooraan met fakkels.
        const wy = h * .9;
        g.fillStyle = '#161036';
        g.fillRect(x0, wy, gw, h - wy);
        const mw = Math.max(8, gw * .07);
        for (let x = x0; x < x1; x += mw * 2) g.fillRect(x, wy - mw * .7, mw, mw * .7);
        g.fillStyle = 'rgba(160, 140, 255, .07)';
        for (let x = x0; x < x1; x += mw * 2) g.fillRect(x, wy - mw * .7, mw, 1);
        for (let y = wy + mw * .8, i = 0; y < h; y += mw * .8, i++) {
          g.fillRect(x0, y, gw, 1);
          for (let x = x0 + (i % 2 ? mw : 0); x < x1; x += mw * 2) g.fillRect(x, y - mw * .8, 1, mw * .8);
        }
        g.fillStyle = Glow.rgba(lit, .35);
        g.fillRect(x0, wy, gw, 1.5);
        for (let x = x0 + gw * .25; x < x1; x += gw * .5) {
          glowDot(g, x, wy + mw * .6, mw * 2.4, '#ff8a2a');
          g.fillStyle = '#ffd27a';
          g.beginPath(); g.ellipse(x, wy + mw * .5, mw * .18, mw * .34, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#2a1c10';
          g.fillRect(x - mw * .08, wy + mw * .8, mw * .16, mw * .6);
        }
        // Banier aan de rail.
        const bx = side ? x0 + gw * .12 : x1 - gw * .12 - gw * .16;
        const bw = Math.min(gw * .16, 40), bh = h * .22;
        const bg = g.createLinearGradient(0, h * .06, 0, h * .06 + bh);
        bg.addColorStop(0, side ? 'rgba(255, 95, 210, .55)' : 'rgba(76, 201, 255, .55)');
        bg.addColorStop(1, 'rgba(20, 10, 40, .2)');
        g.fillStyle = bg;
        g.beginPath(); g.moveTo(bx, h * .06); g.lineTo(bx + bw, h * .06); g.lineTo(bx + bw, h * .06 + bh); g.lineTo(bx + bw / 2, h * .06 + bh * .85); g.lineTo(bx, h * .06 + bh); g.closePath(); g.fill();
        g.strokeStyle = side ? '#ff5fd2' : '#4cc9ff';
        g.lineWidth = 1.5;
        g.stroke();
        // De neonrail langs het speelveld.
        const rx = side ? x0 : x1 - 3;
        const rail = g.createLinearGradient(0, 0, 0, h);
        rail.addColorStop(0, 'rgba(76, 201, 255, .9)');
        rail.addColorStop(.5, 'rgba(199, 125, 255, .9)');
        rail.addColorStop(1, 'rgba(255, 95, 210, .9)');
        g.fillStyle = 'rgba(76, 201, 255, .12)';
        g.fillRect(side ? x0 : x1 - 14, 0, 14, h);
        g.fillStyle = rail;
        g.fillRect(rx, 0, 3, h);
        g.restore();
      }
      return c;
    });
  }

  function glowDot(g, x, y, r, col) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, col.length === 7 ? col + '55' : col);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Een laag sterren die je naar beneden laat schuiven. Herhaalt zich naadloos.
  function stars(w, h, count, size, seed) {
    return cached(`s${w}x${h}|${count}|${size}|${seed}`, () => {
      const c = canvas(w, h);
      const g = c.getContext('2d');
      let r = seed;
      const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < count; i++) {
        const x = rnd() * w, y = rnd() * h, k = size * (.5 + rnd());
        const tint = rnd();
        g.fillStyle = tint < .15 ? '#9fdcff' : tint < .25 ? '#ffd6f0' : '#ffffff';
        g.globalAlpha = .4 + rnd() * .6;
        g.fillRect(x, y, k, k);
        if (k > 1.8) {
          g.globalAlpha *= .35;
          g.fillRect(x - k, y + k / 2 - .5, k * 3, 1);
          g.fillRect(x + k / 2 - .5, y - k, 1, k * 3);
        }
      }
      return c;
    });
  }

  // Een zwevende burcht op een rotsblok, als silhouet in de verte.
  function castle(s) {
    return cached(`c${s.toFixed(2)}`, () => {
      const c = canvas(140 * s, 150 * s);
      const g = c.getContext('2d');
      g.scale(s, s);
      // Het rotsblok met lagen en hangende kristallen.
      const rock = g.createLinearGradient(0, 70, 0, 128);
      rock.addColorStop(0, '#241c4a');
      rock.addColorStop(1, '#0f0b26');
      g.fillStyle = rock;
      g.beginPath();
      g.moveTo(10, 70); g.lineTo(130, 70); g.lineTo(108, 92); g.lineTo(84, 104); g.lineTo(70, 128); g.lineTo(56, 104); g.lineTo(30, 92);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgba(0, 0, 0, .35)';
      g.lineWidth = 1;
      for (const [ax, ay, bx, by] of [[22, 80, 116, 80], [36, 92, 102, 92], [58, 104, 82, 104]]) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
      for (const [x, y, l, col] of [[40, 92, 12, '#4cc9ff'], [64, 112, 18, '#b26bff'], [92, 98, 10, '#ff5fd2']]) {
        glowDot(g, x, y + l * .6, l, col);
        g.fillStyle = col;
        g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.lineTo(x, y + l); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255, 255, 255, .5)';
        g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - .5, y); g.lineTo(x, y + l); g.closePath(); g.fill();
      }
      // Muur en torens met puntdaken.
      g.fillStyle = '#231c4a';
      g.fillRect(14, 54, 112, 16);
      for (let i = 14; i < 126; i += 8) g.fillRect(i, 50, 5, 4);
      const tower = (x, w, h, roof) => {
        g.fillStyle = '#2a2254';
        g.fillRect(x, 70 - h, w, h);
        g.fillStyle = 'rgba(76, 201, 255, .12)';
        g.fillRect(x, 70 - h, 2, h);
        g.fillStyle = 'rgba(0, 0, 0, .3)';
        g.fillRect(x + w - 3, 70 - h, 3, h);
        g.fillStyle = '#1b1540';
        g.beginPath(); g.moveTo(x - 2, 70 - h); g.lineTo(x + w / 2, 70 - h - roof); g.lineTo(x + w + 2, 70 - h); g.closePath(); g.fill();
        g.fillStyle = 'rgba(76, 201, 255, .18)';
        g.beginPath(); g.moveTo(x - 2, 70 - h); g.lineTo(x + w / 2, 70 - h - roof); g.lineTo(x + w / 2, 70 - h); g.closePath(); g.fill();
        g.strokeStyle = '#3a3460';
        g.beginPath(); g.moveTo(x + w / 2, 70 - h - roof); g.lineTo(x + w / 2, 70 - h - roof - 7); g.stroke();
        g.fillStyle = '#ff5fd2';
        g.beginPath(); g.moveTo(x + w / 2, 70 - h - roof - 7); g.lineTo(x + w / 2 + 7, 70 - h - roof - 5); g.lineTo(x + w / 2, 70 - h - roof - 3); g.closePath(); g.fill();
      };
      tower(20, 16, 36, 16);
      tower(100, 16, 32, 14);
      tower(42, 14, 28, 12);
      tower(60, 20, 50, 22);
      tower(82, 14, 26, 12);
      // Poort en ramen
      g.fillStyle = '#0a0818';
      g.beginPath(); g.moveTo(64, 70); g.lineTo(64, 60); g.arc(70, 60, 6, Math.PI, 0); g.lineTo(76, 70); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255, 201, 74, .85)';
      for (const [x, y] of [[66, 30], [73, 30], [69, 42], [26, 44], [106, 48], [47, 52], [86, 54]]) {
        glowDot(g, x + 1.2, y + 2, 5, '#ffc94a');
        g.fillStyle = 'rgba(255, 201, 74, .85)';
        g.fillRect(x, y, 2.5, 4);
      }
      g.strokeStyle = 'rgba(76, 201, 255, .5)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(10, 70); g.lineTo(130, 70);
      g.stroke();
      return c;
    });
  }

  // Het vuur van de jetpack: getekend per beeld (klein en snel).
  function flame(ctx, x, y, s, t, hot) {
    const len = (16 + Math.sin(t * 40) * 3 + Math.random() * 4) * s * (hot ? .55 : 1);
    for (const dx of [-5, 5]) {
      const grad = ctx.createLinearGradient(x, y, x, y + len);
      grad.addColorStop(0, hot ? '#ffffff' : '#ffffff');
      grad.addColorStop(.25, hot ? '#ff8c42' : '#4cc9ff');
      grad.addColorStop(1, 'rgba(76,201,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x + (dx - 3) * s, y);
      ctx.lineTo(x + (dx + 3) * s, y);
      ctx.lineTo(x + dx * s, y + len);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Een ridder op een jetpack, van achteren. Met een eigen ridder (Avatar) als die er is.
  function ship(ctx, x, y, s, opts = {}) {
    const t = opts.t || 0;
    const color = opts.color || '#4cc9ff';
    ctx.save();
    if (opts.blink && Math.floor(t * 10) % 2) ctx.globalAlpha = .35;
    flame(ctx, x, y + 14 * s, s, t, opts.hot);
    // De jetpack.
    ctx.fillStyle = '#8b97b3';
    ctx.fillRect(x - 10 * s, y - 2 * s, 7 * s, 16 * s);
    ctx.fillRect(x + 3 * s, y - 2 * s, 7 * s, 16 * s);
    ctx.fillStyle = color;
    ctx.fillRect(x - 10 * s, y + 9 * s, 7 * s, 3 * s);
    ctx.fillRect(x + 3 * s, y + 9 * s, 7 * s, 3 * s);
    const av = opts.av && typeof Avatar !== 'undefined' ? opts.av : null;
    if (av) {
      const k = Math.max(2, Math.round(3.4 * s));
      const img = Avatar.sprite(av, { back: true, k });
      const h = 50 * s;
      const w = h * img.width / img.height;
      ctx.drawImage(img, x - w / 2, y - h * .62, w, h);
    } else {
      ctx.fillStyle = '#cfd8ea';
      ctx.beginPath();
      ctx.ellipse(x, y - 4 * s, 9 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y - 18 * s, 7 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    if (opts.shield) {
      const r = 30 * s;
      ctx.globalAlpha = .55 + Math.sin(t * 6) * .15;
      ctx.drawImage(glow('#4cc9ff', r * 1.2), x - r * 1.2, y - 4 * s - r * 1.2, r * 2.4, r * 2.4);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(160, 230, 255, .9)';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(x, y - 4 * s, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  return { COLORS, DRAGONS, dragon, boss, glow, bolt, fireball, nebula, frame, stars, castle, ship, flame };
})();
