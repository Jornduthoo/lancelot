// Leraar-baas: de eindbaas tekenen (een reuzenridder met kroon, drakenmantel, gloeiende ogen en mech-troon)
// en de troonzaal op het bord, met de ridders van de klas die aanvallen.
// BossDraw.boss(...) tekent alleen de baas (ook voor de bouwer en de gsm). BossDraw.create(canvas) geeft de scène voor het bord.
// Gebruikt Avatar uit avatar.js.
const BossDraw = (() => {
  const AURAS = [
    { name: 'Paars', c: '#c23cff', glow: 'rgba(194,60,255,' },
    { name: 'Rood', c: '#ff2d55', glow: 'rgba(255,45,85,' },
    { name: 'Gifgroen', c: '#39ff88', glow: 'rgba(57,255,136,' },
    { name: 'Goud', c: '#ffc94a', glow: 'rgba(255,201,74,' },
  ];
  const EYES = [
    { name: 'Rood', c: '#ff2d2d' },
    { name: 'Groen', c: '#5dff6a' },
    { name: 'Blauw', c: '#3fd8ff' },
    { name: 'Goud', c: '#ffd84a' },
  ];
  const EXTRAS = [
    { key: 'harnas', name: 'Reuzenharnas', icon: '🛡️' },
    { key: 'kroon', name: 'Duistere kroon', icon: '👑' },
    { key: 'mantel', name: 'Drakenmantel', icon: '🐉' },
    { key: 'ogen', name: 'Gloeiende ogen', icon: '👁️' },
    { key: 'troon', name: 'Mech-troon', icon: '🤖' },
  ];
  const DEFAULT = {
    av: { helm: 6, accent: 2, kleur: 4, vizier: 1, patroon: 3, schild: 4, wapen: 3, huid: 1, type: 0, haar: 0, haarkleur: 2, harnas: 3, rug: 3, arm: 1 },
    extra: { harnas: 1, kroon: 1, mantel: 1, ogen: 1, troon: 1, ogenkleur: 0, aura: 0 },
    naam: 'De leerkracht',
    titel: 'de Onverslaanbare',
  };
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const rand = (a, b) => a + Math.random() * (b - a);

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const k = f < 0 ? 0 : 255, p = Math.abs(f);
    r = Math.round(r + (k - r) * p); g = Math.round(g + (k - g) * p); b = Math.round(b + (k - b) * p);
    return `rgb(${r},${g},${b})`;
  }

  // ---------- De baas ----------
  // x: midden, gy: de vloer, h: hoogte van de ridder zelf. fx: { t, flash, raise (0-1), shield, weak, angry, dead (0-1) }.
  // De ridder met zijn gloed, één keer gebakken: een schaduwgloed op een grote afbeelding elk beeld opnieuw tekenen
  // is het duurste wat een Chromebook kan doen.
  const glowCache = new Map();
  function glowSprite(img, color, s) {
    const key = `${img.width}x${img.height}:${color}:${Math.round(s * 4)}`;
    let c = glowCache.get(key);
    if (c && c.src === img) return c;
    if (glowCache.size > 12) glowCache.clear();
    const pad = Math.ceil(s * 3);
    c = document.createElement('canvas');
    c.width = Math.ceil(12 * s) + pad * 2;
    c.height = Math.ceil(17 * s) + pad * 2;
    c.pad = pad;
    c.src = img;
    const g = c.getContext('2d');
    g.shadowColor = color;
    g.shadowBlur = s * 1.4;
    g.drawImage(img, pad, pad, 12 * s, 17 * s);
    glowCache.set(key, c);
    return c;
  }

  function boss(g, b, x, gy, h, fx = {}) {
    b = b || DEFAULT;
    const ex = b.extra || DEFAULT.extra;
    const aura = AURAS[ex.aura || 0];
    const t = fx.t ?? performance.now();
    const s = h / 17;                // een eenheid van de ridder
    const lift = ex.troon ? 3.4 * s : 0;
    const breathe = Math.sin(t / 700) * s * .12;
    const dead = fx.dead || 0;
    g.save();
    if (dead) {
      g.globalAlpha = Math.max(0, 1 - dead * 1.1);
      g.translate(Math.sin(t / 25) * s * .3 * (1 - dead), dead * s * 2);
    }
    // Aura achter alles.
    const glow = g.createRadialGradient(x, gy - h * .55 - lift, h * .1, x, gy - h * .5 - lift, h * 1.05);
    const strength = .35 + (fx.angry || 0) * .15 + Math.sin(t / 260) * .06;
    glow.addColorStop(0, `${aura.glow}${strength.toFixed(3)})`);
    glow.addColorStop(1, `${aura.glow}0)`);
    g.fillStyle = glow;
    g.fillRect(x - h * 1.2, gy - h * 1.8 - lift, h * 2.4, h * 2);
    // Ox en oy: linksboven van de ridder in eenheden.
    const ox = x - 6 * s, oy = gy - 17 * s - lift + breathe;
    const U = (ux, uy) => [ox + ux * s, oy + uy * s];
    if (ex.troon) drawThroneBack(g, U, s, aura, t);
    if (ex.mantel) drawWings(g, U, s, aura, t, fx);
    // De ridder zelf (met wat meer massa als reuzenharnas).
    const img = Avatar.sprite(b.av, { k: Math.max(4, Math.min(16, Math.round(s))) });
    const bulk = ex.harnas ? 1.1 : 1;
    g.save();
    g.translate(x, oy + 17 * s);
    g.scale(bulk, 1);
    const raise = fx.raise || 0;
    g.rotate(-raise * .06);
    if (fx.flash && 'filter' in g) g.filter = 'brightness(2.6) saturate(.3)';
    const lit = glowSprite(img, aura.c, s);
    g.drawImage(lit, -6 * s - lit.pad, -17 * s - lit.pad);
    g.restore();
    if (ex.harnas) drawGiantArmour(g, U, s, aura, t);
    if (ex.kroon) drawCrown(g, U, s, aura, t);
    if (ex.ogen) drawEyes(g, U, s, EYES[ex.ogenkleur || 0].c, t, b.av, fx);
    if (ex.troon) drawThroneFront(g, U, s, aura, t);
    if (fx.shield) drawShield(g, x, gy - (17 * s + lift) * .5, (17 * s + lift) * .72, aura, t, fx.shield);
    if (fx.weak) drawDizzy(g, U, s, t);
    g.restore();
    return { head: U(6, 4), chest: U(6, 9.5), top: U(6, ex.kroon ? 1 : 2.5), s, lift };
  }

  function metal(g, y0, y1, base) {
    const m = g.createLinearGradient(0, y0, 0, y1);
    m.addColorStop(0, shade(base, .35));
    m.addColorStop(.5, base);
    m.addColorStop(1, shade(base, -.55));
    return m;
  }

  function drawThroneBack(g, U, s, aura, t) {
    // Een hoge rugleuning met punten en neonranden.
    g.save();
    const [l, top] = U(-.6, -3.2);
    const [r] = U(12.6, 0);
    const [, seat] = U(0, 14);
    const mid = (l + r) / 2;
    g.beginPath();
    g.moveTo(l, seat);
    g.lineTo(l, top + 4 * s);
    g.lineTo(l + 1.4 * s, top + 1.5 * s);
    g.lineTo(mid - 2.2 * s, top + 2.4 * s);
    g.lineTo(mid, top - 1.5 * s);
    g.lineTo(mid + 2.2 * s, top + 2.4 * s);
    g.lineTo(r - 1.4 * s, top + 1.5 * s);
    g.lineTo(r, top + 4 * s);
    g.lineTo(r, seat);
    g.closePath();
    g.fillStyle = metal(g, top, seat, '#2a2440');
    g.fill();
    g.lineWidth = s * .25;
    g.strokeStyle = aura.c;
    g.shadowColor = aura.c;
    g.shadowBlur = s * 1.2;
    g.stroke();
    g.shadowBlur = 0;
    // Gloeiende runen en buizen.
    g.strokeStyle = `${aura.glow}${(.55 + .35 * Math.sin(t / 300)).toFixed(3)})`;
    g.lineWidth = s * .18;
    for (const k of [-1, 1]) {
      g.beginPath();
      g.moveTo(mid + k * 4.6 * s, seat - s);
      g.lineTo(mid + k * 4.6 * s, top + 4.6 * s);
      g.lineTo(mid + k * 3 * s, top + 3.2 * s);
      g.stroke();
    }
    g.beginPath();
    g.arc(mid, top + .8 * s, s * .8, 0, Math.PI * 2);
    g.fillStyle = aura.c;
    g.shadowColor = aura.c;
    g.shadowBlur = s * 2;
    g.fill();
    g.restore();
  }

  function drawThroneFront(g, U, s, aura, t) {
    // Armleuningen, het platform onder de voeten en de mechanische poten met stuwers.
    g.save();
    const [l] = U(-1.4, 0);
    const [r] = U(13.4, 0);
    const [, arm] = U(0, 11.6);
    const [, plat] = U(0, 16.6);
    const [, floor] = U(0, 20.2);
    for (const [x0, x1] of [[l, l + 2.2 * s], [r - 2.2 * s, r]]) {
      g.fillStyle = metal(g, arm, arm + 1.6 * s, '#3a3358');
      g.beginPath();
      g.roundRect(x0, arm, x1 - x0, 1.4 * s, s * .5);
      g.fill();
      g.fillStyle = aura.c;
      g.shadowColor = aura.c;
      g.shadowBlur = s;
      g.fillRect(x0 + s * .3, arm + s * .55, x1 - x0 - s * .6, s * .22);
      g.shadowBlur = 0;
    }
    // Het zwevende platform.
    g.fillStyle = metal(g, plat, plat + 1.8 * s, '#2f2a4a');
    g.beginPath();
    g.moveTo(l - s, plat);
    g.lineTo(r + s, plat);
    g.lineTo(r - s * .5, plat + 1.8 * s);
    g.lineTo(l + s * .5, plat + 1.8 * s);
    g.closePath();
    g.fill();
    g.strokeStyle = aura.c;
    g.lineWidth = s * .18;
    g.stroke();
    // Lichtjes langs de rand.
    for (let k = 0; k < 9; k++) {
      const on = Math.sin(t / 150 - k) > 0;
      g.fillStyle = on ? '#fff' : aura.c;
      g.beginPath();
      g.arc(l + (r - l) * (k + .5) / 9, plat + s * .9, s * .2, 0, Math.PI * 2);
      g.fill();
    }
    // Poten met zuigers.
    g.lineCap = 'round';
    for (const k of [-1, 1]) {
      const hip = [(l + r) / 2 + k * 4.5 * s, plat + 1.6 * s];
      const knee = [hip[0] + k * 2.4 * s, hip[1] + 1.2 * s + Math.sin(t / 500 + k) * s * .15];
      const foot = [knee[0] + k * .6 * s, floor];
      g.strokeStyle = '#4a4470';
      g.lineWidth = s * .9;
      g.beginPath();
      g.moveTo(...hip);
      g.lineTo(...knee);
      g.lineTo(...foot);
      g.stroke();
      g.strokeStyle = '#9fb0d0';
      g.lineWidth = s * .25;
      g.beginPath();
      g.moveTo(...hip);
      g.lineTo(knee[0], knee[1]);
      g.stroke();
      g.fillStyle = aura.c;
      g.beginPath();
      g.arc(knee[0], knee[1], s * .45, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#2a2440';
      g.beginPath();
      g.ellipse(foot[0], foot[1], s * 1.1, s * .35, 0, 0, Math.PI * 2);
      g.fill();
    }
    // Stuwers onder het platform.
    g.globalCompositeOperation = 'lighter';
    for (const k of [-1.6, 1.6]) {
      const fx = (l + r) / 2 + k * s;
      const fl = (1.2 + Math.sin(t / 40 + k) * .3) * s;
      const flame = g.createLinearGradient(0, plat + 1.8 * s, 0, plat + 1.8 * s + fl * 1.6);
      flame.addColorStop(0, '#fff');
      flame.addColorStop(.3, aura.c);
      flame.addColorStop(1, `${aura.glow}0)`);
      g.fillStyle = flame;
      g.beginPath();
      g.moveTo(fx - s * .5, plat + 1.8 * s);
      g.quadraticCurveTo(fx, plat + 1.8 * s + fl * 2, fx + s * .5, plat + 1.8 * s);
      g.fill();
    }
    g.restore();
  }

  function drawWings(g, U, s, aura, t, fx) {
    const flap = Math.sin(t / 600) * .08 + (fx.raise || 0) * .15;
    for (const k of [-1, 1]) {
      g.save();
      const [sx, sy] = U(6 + k * 3.2, 8);
      g.translate(sx, sy);
      g.rotate(k * (-.1 - flap));
      g.scale(k, 1);
      // Vleugelvlies tussen de botten.
      const tips = [[9.5, -7], [11.5, -2.5], [10.5, 2.5], [7.5, 6.5]];
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(tips[0][0] * s, tips[0][1] * s);
      for (let i = 1; i < tips.length; i++) {
        const [px, py] = tips[i - 1], [qx, qy] = tips[i];
        g.quadraticCurveTo(((px + qx) / 2 - 1.2) * s, ((py + qy) / 2 - .2) * s, qx * s, qy * s);
      }
      g.quadraticCurveTo(3 * s, 5 * s, 0, 3 * s);
      g.closePath();
      const mem = g.createLinearGradient(0, -7 * s, 0, 7 * s);
      mem.addColorStop(0, '#3a0a3f');
      mem.addColorStop(.6, '#1a0420');
      mem.addColorStop(1, shade(aura.c, -.6));
      g.fillStyle = mem;
      g.shadowColor = aura.c;
      g.shadowBlur = s * 1.5;
      g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = `${aura.glow}.7)`;
      g.lineWidth = s * .12;
      g.stroke();
      // Botten.
      g.strokeStyle = '#6b5a7a';
      g.lineWidth = s * .35;
      g.lineCap = 'round';
      for (const [tx, ty] of tips) {
        g.beginPath();
        g.moveTo(.4 * s, 0);
        g.lineTo(tx * s, ty * s);
        g.stroke();
      }
      // Een klauw bovenaan.
      g.fillStyle = '#d9cfe8';
      g.beginPath();
      g.moveTo(9.5 * s, -7 * s);
      g.lineTo(10.4 * s, -8.4 * s);
      g.lineTo(9.9 * s, -6.6 * s);
      g.fill();
      g.restore();
    }
  }

  function drawGiantArmour(g, U, s, aura, t) {
    // Grote stekelige schouderstukken en een gloeiende kern op de borst.
    for (const k of [-1, 1]) {
      const [cx, cy] = U(6 + k * 4.4, 8.1);
      g.save();
      g.translate(cx, cy);
      g.scale(k, 1);
      g.beginPath();
      g.moveTo(-2.2 * s, .9 * s);
      g.quadraticCurveTo(-2.4 * s, -1.8 * s, .4 * s, -1.9 * s);
      g.quadraticCurveTo(2.8 * s, -1.6 * s, 2.6 * s, 1.1 * s);
      g.closePath();
      g.fillStyle = metal(g, -2 * s, 1.2 * s, '#5a5f78');
      g.fill();
      g.strokeStyle = '#141020';
      g.lineWidth = s * .2;
      g.stroke();
      // Stekels.
      g.fillStyle = '#d6dbe8';
      for (const [bx, len, a] of [[-1.2, 1.6, -.5], [.2, 2.1, -.15], [1.5, 1.6, .25]]) {
        g.save();
        g.translate(bx * s, -1.6 * s);
        g.rotate(a);
        g.beginPath();
        g.moveTo(-.38 * s, 0);
        g.lineTo(0, -len * s);
        g.lineTo(.38 * s, 0);
        g.closePath();
        g.fill();
        g.restore();
      }
      g.fillStyle = aura.c;
      g.shadowColor = aura.c;
      g.shadowBlur = s;
      g.fillRect(-1.6 * s, .2 * s, 3.6 * s, .25 * s);
      g.restore();
    }
    const [cx, cy] = U(6, 9.6);
    const pulse = .7 + .3 * Math.sin(t / 220);
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, 1.4 * s);
    core.addColorStop(0, '#fff');
    core.addColorStop(.35, aura.c);
    core.addColorStop(1, `${aura.glow}0)`);
    g.save();
    g.globalAlpha = pulse;
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = core;
    g.beginPath();
    g.arc(cx, cy, 1.4 * s, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  function drawCrown(g, U, s, aura, t) {
    const [l, base] = U(3.4, 3.3);
    const [r] = U(8.6, 0);
    const w = r - l;
    g.save();
    g.beginPath();
    g.moveTo(l, base);
    const spikes = 5;
    for (let k = 0; k <= spikes * 2; k++) {
      const x = l + (w * k) / (spikes * 2);
      const tall = k % 2 ? (k === spikes ? 2.6 : k === spikes - 2 || k === spikes + 2 ? 2 : 1.5) : .5;
      g.lineTo(x, base - tall * s);
    }
    g.lineTo(r, base);
    g.lineTo(r, base + .7 * s);
    g.lineTo(l, base + .7 * s);
    g.closePath();
    g.fillStyle = metal(g, base - 2.6 * s, base + .7 * s, '#2b2535');
    g.shadowColor = aura.c;
    g.shadowBlur = s * 1.2;
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = '#7d6f95';
    g.lineWidth = s * .14;
    g.stroke();
    // Edelstenen.
    g.globalCompositeOperation = 'lighter';
    for (let k = 1; k < spikes * 2; k += 2) {
      const x = l + (w * k) / (spikes * 2);
      g.fillStyle = aura.c;
      g.shadowColor = aura.c;
      g.shadowBlur = s * (1 + .5 * Math.sin(t / 200 + k));
      g.beginPath();
      g.arc(x, base + .3 * s, s * .28, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  function drawEyes(g, U, s, color, t, av, fx) {
    const open = Avatar.OPEN.includes(av && av.helm);
    const y = open ? 5.5 : 4.9;
    const big = 1 + (fx.raise || 0) * .6 + (fx.angry || 0) * .15;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const ux of [4.9, 7.1]) {
      const [cx, cy] = U(ux, y);
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, s * 1.6 * big);
      halo.addColorStop(0, color);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = halo;
      g.beginPath();
      g.arc(cx, cy, s * 1.6 * big, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.ellipse(cx, cy, s * .42 * big, s * .2 * big, 0, 0, Math.PI * 2);
      g.fill();
      // Lichtstraal opzij.
      g.strokeStyle = color;
      g.globalAlpha = .55 + .3 * Math.sin(t / 120);
      g.lineWidth = s * .12;
      g.beginPath();
      g.moveTo(cx - s * 1.8 * big, cy);
      g.lineTo(cx + s * 1.8 * big, cy);
      g.stroke();
      g.globalAlpha = 1;
    }
    g.restore();
  }

  function drawShield(g, x, y, r, aura, t, sh) {
    // Een koepel van zeshoeken; hoe minder sterkte, hoe meer barsten.
    g.save();
    g.globalCompositeOperation = 'lighter';
    const k = sh.frac ?? 1;
    const dome = g.createRadialGradient(x, y, r * .6, x, y, r);
    dome.addColorStop(0, `${aura.glow}0)`);
    dome.addColorStop(1, `${aura.glow}${(.25 + .2 * k).toFixed(3)})`);
    g.fillStyle = dome;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `${aura.glow}${(.35 + .4 * k).toFixed(3)})`;
    g.lineWidth = Math.max(1, r * .006);
    const hx = r * .16;
    g.save();
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.clip();
    for (let row = -7; row <= 7; row++) {
      for (let col = -7; col <= 7; col++) {
        const cx = x + col * hx * 1.5, cy = y + row * hx * 1.73 + (col % 2 ? hx * .866 : 0) + Math.sin(t / 900) * 2;
        g.beginPath();
        for (let a = 0; a < 6; a++) g.lineTo(cx + hx * .95 * Math.cos(a * Math.PI / 3), cy + hx * .95 * Math.sin(a * Math.PI / 3));
        g.closePath();
        g.stroke();
      }
    }
    g.restore();
    g.lineWidth = r * .02;
    g.strokeStyle = aura.c;
    g.shadowColor = aura.c;
    g.shadowBlur = r * .08;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.stroke();
    // Barsten.
    g.shadowBlur = 0;
    g.strokeStyle = '#fff';
    g.lineWidth = r * .008;
    const cracks = Math.round((1 - k) * 10);
    for (let c = 0; c < cracks; c++) {
      let a = c * 2.4, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      g.beginPath();
      g.moveTo(px, py);
      for (let j = 1; j < 4; j++) {
        a += .35 * (j % 2 ? 1 : -1);
        px = x + Math.cos(a) * r * (1 - j * .16);
        py = y + Math.sin(a) * r * (1 - j * .16);
        g.lineTo(px, py);
      }
      g.stroke();
    }
    g.restore();
  }

  function drawDizzy(g, U, s, t) {
    const [cx, cy] = U(6, 1.6);
    g.save();
    g.font = `${Math.round(s * 1.6)}px sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let k = 0; k < 4; k++) {
      const a = t / 300 + k * Math.PI / 2;
      g.fillText('✦', cx + Math.cos(a) * s * 3.2, cy + Math.sin(a) * s * .9);
    }
    g.restore();
  }

  // ---------- De troonzaal op het bord ----------

  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const S = {
      W: 0, H: 0, bg: null, state: null, offset: 0,
      hp: 100, ghost: 100, ghostAt: 0, moed: 100,
      knights: new Map(), bolts: [], parts: [], numbers: [], rings: [],
      bossFx: { flash: 0, raise: 0 }, attack: null, shakeUntil: 0, shakePow: 0, flashUntil: 0, flashMs: 1, flashColor: '#fff',
      announce: null, reveal: null, deadAt: 0, embers: Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: rand(.2, .8), p: Math.random() * 6 })),
    };

    function resize() {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.round(r.width * dpr));
      const h = Math.max(200, Math.round(r.height * dpr));
      const auraKey = S.state && S.state.boss ? S.state.boss.extra.aura : 0;
      if (canvas.width === w && canvas.height === h && S.bg && S.bgAura === auraKey) return;
      canvas.width = w;
      canvas.height = h;
      S.W = w;
      S.H = h;
      S.bgAura = auraKey;
      S.bg = paintHall(w, h, AURAS[auraKey || 0]);
    }

    function paintHall(W, H, aura) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#05010c');
      bg.addColorStop(.6, '#160622');
      bg.addColorStop(1, '#050108');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      // Groot roosvenster met een printplaat-patroon achter de troon.
      const rx = W / 2, ry = H * .34, rr = H * .3;
      const win = g.createRadialGradient(rx, ry, 0, rx, ry, rr);
      win.addColorStop(0, `${aura.glow}.45)`);
      win.addColorStop(.7, `${aura.glow}.12)`);
      win.addColorStop(1, `${aura.glow}0)`);
      g.fillStyle = win;
      g.beginPath();
      g.arc(rx, ry, rr * 1.2, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = `${aura.glow}.5)`;
      g.lineWidth = Math.max(1, H * .003);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        g.beginPath();
        g.moveTo(rx + Math.cos(a) * rr * .2, ry + Math.sin(a) * rr * .2);
        g.lineTo(rx + Math.cos(a) * rr * .6, ry + Math.sin(a) * rr * .6);
        g.lineTo(rx + Math.cos(a + .2) * rr * .8, ry + Math.sin(a + .2) * rr * .8);
        g.lineTo(rx + Math.cos(a + .2) * rr, ry + Math.sin(a + .2) * rr);
        g.stroke();
        g.beginPath();
        g.arc(rx + Math.cos(a) * rr * .6, ry + Math.sin(a) * rr * .6, H * .005, 0, Math.PI * 2);
        g.fillStyle = aura.c;
        g.fill();
      }
      for (const f of [.2, .6, 1]) {
        g.beginPath();
        g.arc(rx, ry, rr * f, 0, Math.PI * 2);
        g.stroke();
      }
      // Gotische pilaren met bogen.
      const cols = 6;
      for (let k = 0; k < cols; k++) {
        const side = k < cols / 2 ? -1 : 1;
        const i = k < cols / 2 ? k : cols - 1 - k;
        const x = side < 0 ? W * (.04 + i * .11) : W * (.96 - i * .11);
        const w = W * .035 * (1 - i * .15);
        const top = H * (.02 + i * .07);
        const colG = g.createLinearGradient(x - w, 0, x + w, 0);
        colG.addColorStop(0, '#0d0716');
        colG.addColorStop(.5, '#2a1d3a');
        colG.addColorStop(1, '#0d0716');
        g.fillStyle = colG;
        g.fillRect(x - w / 2, top, w, H * .72 - top);
        g.fillStyle = aura.c;
        g.shadowColor = aura.c;
        g.shadowBlur = H * .015;
        g.fillRect(x - w * .06, top + H * .05, w * .12, H * .72 - top - H * .1);
        g.shadowBlur = 0;
        // Boog naar de volgende pilaar.
        if (i < 2) {
          const nx = side < 0 ? W * (.04 + (i + 1) * .11) : W * (.96 - (i + 1) * .11);
          g.strokeStyle = '#2a1d3a';
          g.lineWidth = H * .018;
          g.beginPath();
          g.moveTo(x, top + H * .06);
          g.quadraticCurveTo((x + nx) / 2, top - H * .06, nx, top + H * .13);
          g.stroke();
        }
      }
      // De vloer met tegels die in de verte verdwijnen.
      const fy = H * .66;
      const floor = g.createLinearGradient(0, fy, 0, H);
      floor.addColorStop(0, '#1d0c2b');
      floor.addColorStop(1, '#060209');
      g.fillStyle = floor;
      g.fillRect(0, fy, W, H - fy);
      g.strokeStyle = `${aura.glow}.18)`;
      g.lineWidth = 1;
      for (let i = -12; i <= 12; i++) {
        g.beginPath();
        g.moveTo(W / 2 + i * W * .03, fy);
        g.lineTo(W / 2 + i * W * .14, H);
        g.stroke();
      }
      for (let k = 1; k < 9; k++) {
        const y = fy + Math.pow(k / 9, 1.8) * (H - fy);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      // Een rode loper naar de troon.
      g.fillStyle = 'rgba(120,10,40,.45)';
      g.beginPath();
      g.moveTo(W * .46, fy);
      g.lineTo(W * .54, fy);
      g.lineTo(W * .7, H);
      g.lineTo(W * .3, H);
      g.closePath();
      g.fill();
      return c;
    }

    // ---------- Ridders van de klas ----------

    function layout() {
      const roster = (S.state && S.state.roster) || [];
      const n = roster.length;
      const { W, H } = S;
      const perRow = n <= 14 ? Math.max(1, n) : Math.ceil(n / 2);
      const rows = n > perRow ? 2 : 1;
      const kh = Math.min(H * .16, (W * .92 / perRow) * 1.25) * (rows > 1 ? .85 : 1);
      const seen = new Set();
      roster.forEach(([num, name], idx) => {
        const row = rows > 1 ? (idx % 2) : 0;
        const col = rows > 1 ? Math.floor(idx / 2) : idx;
        const cnt = rows > 1 ? Math.ceil((n - row) / 2) : n;
        const span = Math.min(W * .92, cnt * kh * 1.1);
        const x = W / 2 - span / 2 + (col + .5) * (span / cnt);
        const y = H * (rows > 1 ? (row ? .995 : .9) : .97);
        let k = S.knights.get(num);
        if (!k) { k = { num, name, hitAt: 0, stun: false, jump: 0 }; S.knights.set(num, k); }
        Object.assign(k, { x, y: y - (row ? 0 : 0), h: kh, name, row });
        seen.add(num);
      });
      for (const num of [...S.knights.keys()]) if (!seen.has(num)) S.knights.delete(num);
    }

    function drawKnights(t) {
      const list = [...S.knights.values()].sort((a, b) => a.row - b.row);
      for (const k of list) {
        const av = Avatar.byName(k.name) || null;
        const img = Avatar.sprite(av || seeded(k.name), { k: Math.max(3, Math.round(k.h / 17)), back: true });
        const w = img.width * (k.h / img.height);
        const jump = t - k.jump < 300 ? Math.sin(((t - k.jump) / 300) * Math.PI) * k.h * .18 : 0;
        const shake = k.stun ? Math.sin(t / 40) * k.h * .02 : 0;
        ctx.save();
        ctx.globalAlpha = k.stun ? .55 : 1;
        if (k.stun && 'filter' in ctx) ctx.filter = 'grayscale(.9) brightness(.7)';
        ctx.drawImage(img, k.x - w / 2 + shake, k.y - k.h - jump, w, k.h);
        ctx.restore();
        if (k.stun) {
          ctx.save();
          ctx.font = `${Math.round(k.h * .2)}px sans-serif`;
          ctx.textAlign = 'center';
          for (let j = 0; j < 3; j++) {
            const a = t / 250 + j * 2.1;
            ctx.fillText('💫', k.x + Math.cos(a) * w * .35, k.y - k.h * 1.02 + Math.sin(a) * k.h * .05);
          }
          ctx.restore();
        }
        ctx.save();
        ctx.font = `800 ${Math.round(Math.max(S.H * .016, k.h * .13))}px 'Exo 2', sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = S.H * .005;
        ctx.strokeStyle = '#05010c';
        ctx.strokeText(k.name, k.x, k.y - k.h * .02);
        ctx.fillStyle = t - k.hitAt < 600 ? '#ffc94a' : '#eaf4ff';
        ctx.fillText(k.name, k.x, k.y - k.h * .02);
        ctx.restore();
      }
    }

    function hash(text) {
      let h = 2166136261;
      for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
      return h >>> 0;
    }
    function seeded(name) {
      const av = {};
      for (const [k, n] of Object.entries(Avatar.KEYS)) av[k] = hash(`${name}|${k}`) % n;
      return av;
    }

    // ---------- Gebeurtenissen van de server ----------

    const bossPos = () => ({ x: S.W / 2, gy: S.H * .66, h: S.H * (S.state && S.state.boss && S.state.boss.extra.troon ? .4 : .5) });

    function hit(ev) {
      const t = performance.now();
      const k = S.knights.get(ev.n);
      const from = k ? { x: k.x, y: k.y - k.h * .7 } : { x: S.W / 2, y: S.H };
      if (k) { k.jump = t; k.hitAt = t; }
      const av = k && Avatar.byName(k.name);
      const color = ev.kind === 'super' || ev.kind === 'boss' ? '#ffc94a' : av ? Avatar.COLORS[av.kleur] : '#4cc9ff';
      S.bolts.push({ from, t0: t, dur: ev.kind === 'super' || ev.kind === 'boss' ? 520 : 380, ev, color });
    }

    function land(b) {
      const t = performance.now();
      const ev = b.ev;
      const tgt = S.bossHit || { x: S.W / 2, y: S.H * .4 };
      const big = ev.kind === 'super' || ev.kind === 'boss';
      sparks(tgt.x + rand(-S.H * .04, S.H * .04), tgt.y + rand(-S.H * .05, S.H * .05), ev.shield ? (S.auraC || '#c23cff') : b.color, big ? 30 : 10, big ? 1.8 : 1);
      if (ev.shield) {
        S.shieldHitAt = t;
        sfx.tick();
        return;
      }
      S.bossFx.flashAt = t;
      if (ev.hp !== undefined) setHp(ev.hp);
      S.numbers.push({ x: tgt.x + rand(-S.W * .06, S.W * .06), y: tgt.y - S.H * .05, t0: t, text: `-${Math.round(ev.dmg)}`, name: ev.name, big, c: b.color });
      if (S.numbers.length > 18) S.numbers.splice(0, S.numbers.length - 18);
      if (big) {
        ring(tgt.x, tgt.y, '#ffc94a', S.H * .25, 500);
        shake(300, S.H * .012);
        sfx.boom();
      } else sfx.laser();
    }

    // De baas slaat terug: eerst de arm omhoog, dan een schokgolf over de vloer.
    function attack(ev) {
      const t = performance.now();
      S.attack = { t0: t, kind: ev.kind, stunned: ev.stunned || [], parried: ev.parried || [] };
      announce(ev.kind === 'auto' ? 'DE BAAS SLAAT TOE!' : 'TEGENAANVAL!', `${(ev.stunned || []).length} verdoofd${(ev.parried || []).length ? ` · ${ev.parried.length} gepareerd` : ''}`, '#ff2d55', 1800);
      sfx.whoosh();
      setTimeout(() => {
        const { x, gy } = bossPos();
        ring(x, gy, '#ff2d55', S.W * .6, 900);
        ring(x, gy, '#fff', S.W * .4, 600);
        shake(700, S.H * .02);
        flash('#ff2d55', 200);
        sfx.boom();
        for (const num of ev.parried || []) {
          const k = S.knights.get(num);
          if (k) sparks(k.x, k.y - k.h * .6, '#4cc9ff', 12);
        }
      }, 550);
    }

    function event(ev) {
      if (ev.kind === 'kwaad') { announce('DE BAAS WORDT KWAAD', 'Hij slaat nu vaker terug!', '#ff2d55', 2200); sfx.gong(); flash('#ff2d55', 300); }
      if (ev.kind === 'bijna') { announce('BIJNA!', 'Nog één laatste duw!', '#ffc94a', 2200); sfx.gong(); }
      if (ev.kind === 'schild-stuk') { announce('SCHILD GEBROKEN!', 'De baas is kwetsbaar: dubbele schade', '#4cc9ff', 2200); sfx.boom(); flash('#fff', 200); shake(500, S.H * .015); }
      if (ev.kind === 'schild-heel') { announce('HET SCHILD HOUDT STAND', 'De baas geneest…', '#c23cff', 2200); sfx.bad(); }
      if (ev.kind === 'vraag-uit') {
        S.reveal = { t0: performance.now(), answer: ev.answer, right: ev.right, wrong: ev.wrong };
        sfx.gong();
      }
    }

    function setHp(hp) {
      if (hp < S.hp) S.ghostAt = performance.now() + 500;
      S.hp = hp;
    }

    function sparks(x, y, color, n, power = 1) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2;
        const v = rand(2, 9) * power * S.H / 800;
        S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: rand(250, 650), t0: performance.now(), c: Math.random() < .3 ? '#fff' : color, size: rand(1.5, 3) * S.H / 800 });
      }
    }
    function ring(x, y, color, size, dur) { S.rings.push({ x, y, color, size, dur, t0: performance.now() }); }
    function shake(ms, pow) { S.shakeUntil = performance.now() + ms; S.shakePow = pow; }
    function flash(color, ms) { S.flashUntil = performance.now() + ms; S.flashMs = ms; S.flashColor = color; }
    function announce(text, sub, color, ms = 1800) { S.announce = { text, sub, color, ms, t0: performance.now() }; }

    function setState(s, offset) {
      const prev = S.state;
      S.state = s;
      S.offset = offset || 0;
      if (s.hp !== undefined && (!S.bolts.length || s.hp > S.hp)) setHp(s.hp);
      if (s.moed !== undefined) S.moed = s.moed;
      if (s.stunned) {
        const set = new Set(s.stunned);
        for (const k of S.knights.values()) k.stun = set.has(k.num);
      }
      if (prev && prev.phase === 'play' && s.phase === 'einde') {
        S.deadAt = s.outcome === 'klas' ? performance.now() : 0;
        if (s.outcome === 'klas') { announce('VERSLAGEN!', 'De klas wint!', '#ffc94a', 3200); shake(1500, S.H * .025); }
        else announce(s.why === 'moed' ? 'DE MOED IS OP' : s.why === 'tijd' ? 'DE TIJD IS OM' : 'GESTOPT', `${(s.boss || DEFAULT).naam} wint deze keer`, '#ff2d55', 3200);
      }
      if (s.phase === 'play' && prev && prev.phase !== 'play') announce('DE EINDBAAS', `${(s.boss || DEFAULT).naam}, ${(s.boss || DEFAULT).titel}`, (AURAS[(s.boss || DEFAULT).extra.aura] || AURAS[0]).c, 2600);
      if (s.move && (!prev || !prev.move || prev.move.kind !== s.move.kind)) {
        if (s.move.kind === 'vraag') { S.reveal = null; announce('MOEILIJKE VRAAG!', 'Iedereen dezelfde vraag: juist = driedubbele schade', '#ff2d55', 1600); sfx.gong(); }
        if (s.move.kind === 'schild') { announce('SCHILDRONDE', 'Breek samen het schild!', '#c23cff', 1600); sfx.power(); }
      }
    }

    // ---------- Tekenen ----------

    function frame() {
      resize();
      layout();
      const t = performance.now();
      const { W, H } = S;
      const s = S.state || {};
      const b = s.boss || DEFAULT;
      const aura = AURAS[b.extra.aura || 0];
      S.auraC = aura.c;
      ctx.save();
      if (t < S.shakeUntil) ctx.translate(rand(-1, 1) * S.shakePow, rand(-1, 1) * S.shakePow);
      ctx.drawImage(S.bg, 0, 0);
      // Zwevende sintels en flakkerende fakkels.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const e of S.embers) {
        e.y -= e.v * .0012;
        if (e.y < -.05) { e.y = 1.02; e.x = Math.random(); }
        ctx.globalAlpha = .4 + .4 * Math.sin(t / 300 + e.p);
        ctx.fillStyle = s.angry ? '#ff4d2e' : aura.c;
        ctx.beginPath();
        ctx.arc(e.x * W + Math.sin(t / 900 + e.p) * W * .01, e.y * H, H * .003, 0, Math.PI * 2);
        ctx.fill();
      }
      for (const fx of [.15, .85]) {
        const x = W * fx, y = H * .28;
        const fl = H * (.05 + Math.sin(t / 70 + fx * 9) * .008);
        const fire = ctx.createRadialGradient(x, y, 0, x, y - fl * .4, fl);
        fire.addColorStop(0, '#fff');
        fire.addColorStop(.3, aura.c);
        fire.addColorStop(1, `${aura.glow}0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = fire;
        ctx.beginPath();
        ctx.ellipse(x, y - fl * .3, fl * .45, fl, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // De baas.
      const bp = bossPos();
      let raise = 0;
      if (S.attack) {
        const p = (t - S.attack.t0) / 1100;
        if (p >= 1) S.attack = null;
        else raise = p < .5 ? ease(p / .5) : 1 - ease((p - .5) / .5);
      }
      const dead = S.deadAt ? Math.min(1, (t - S.deadAt) / 2600) : 0;
      if (dead && dead < 1 && Math.random() < .5) sparks(bp.x + rand(-H * .15, H * .15), bp.gy - rand(0, bp.h), Math.random() < .5 ? '#ffc94a' : aura.c, 6, 2);
      const move = s.move || null;
      const bfx = {
        t, flash: t - (S.bossFx.flashAt || 0) < 90, raise, angry: s.angry || 0, dead,
        shield: move && move.kind === 'schild' ? { frac: move.max ? move.hp / move.max : 1 } : null,
        weak: s.weak > 0,
      };
      // De baas met al zijn gloed is duur om te tekenen. We tekenen hem in een eigen canvas, zo vaak als de computer
      // aankan: hooguit een zesde van de tijd gaat naar de baas (een snel bord ververst hem 20 keer per seconde,
      // een trage Chromebook enkele keren). Alleen tijdens een slag, een flits of de val tekenen we hem elk beeld.
      let info;
      if (bfx.flash || raise > 0 || dead > 0) {
        info = boss(ctx, b, bp.x, bp.gy, bp.h, bfx);
      } else {
        const cw = Math.ceil(bp.h * 2.6), ch = Math.ceil(bp.h * 2.45);
        const ox = Math.round(bp.x - cw / 2), oy = Math.round(bp.gy - bp.h * 2.1);
        if (!S.bossC) S.bossC = document.createElement('canvas');
        const bc = S.bossC;
        const key = [cw, ch, ox, oy, JSON.stringify(b), bfx.angry, bfx.weak, bfx.shield && bfx.shield.frac].join('|');
        if (bc.width !== cw || bc.height !== ch || S.bossKey !== key || t - S.bossAt > Math.min(300, Math.max(50, (S.bossCost || 0) * 6))) {
          if (bc.width !== cw || bc.height !== ch) { bc.width = cw; bc.height = ch; }
          const bg = bc.getContext('2d');
          bg.clearRect(0, 0, cw, ch);
          bg.save();
          bg.translate(-ox, -oy);
          S.bossInfo = boss(bg, b, bp.x, bp.gy, bp.h, bfx);
          bg.restore();
          S.bossKey = key;
          S.bossAt = t;
          // Het echte tekenwerk gebeurt pas bij het overzetten; dat meten we.
          const t0 = performance.now();
          ctx.drawImage(bc, ox, oy);
          S.bossCost = (S.bossCost || 0) * .7 + (performance.now() - t0) * .3;
        } else {
          ctx.drawImage(bc, ox, oy);
        }
        info = S.bossInfo;
      }
      S.bossHit = { x: info.chest[0], y: info.chest[1] };
      // Weerspiegeling van de baas op de vloer.
      drawKnights(t);
      // Aanvallen van de klas: lichtflitsen van de ridders naar de baas.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      S.bolts = S.bolts.filter(bl => {
        const p = (t - bl.t0) / bl.dur;
        if (p >= 1) { land(bl); return false; }
        const to = S.bossHit;
        const q = ease(p);
        const x = bl.from.x + (to.x - bl.from.x) * q;
        const y = bl.from.y + (to.y - bl.from.y) * q - Math.sin(q * Math.PI) * H * .12;
        const big = bl.ev.kind === 'super' || bl.ev.kind === 'boss';
        const r = H * (big ? .03 : .012);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, '#fff');
        g.addColorStop(.3, bl.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();
        if (Math.random() < .6) S.parts.push({ x, y, vx: rand(-.5, .5), vy: rand(-.5, .5), life: 300, t0: t, c: bl.color, size: r * .5 });
        return true;
      });
      // Schokgolven en vonken.
      S.rings = S.rings.filter(r => t - r.t0 < r.dur);
      for (const r of S.rings) {
        const p = (t - r.t0) / r.dur;
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = H * .014 * (1 - p);
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.size * ease(p), r.size * ease(p) * .28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      S.parts = S.parts.filter(p => t - p.t0 < p.life);
      if (S.parts.length > 600) S.parts.splice(0, S.parts.length - 600);
      for (const p of S.parts) {
        const k = (t - p.t0) / p.life;
        p.x += p.vx; p.y += p.vy; p.vy += .15 * H / 800;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // Schadegetallen.
      S.numbers = S.numbers.filter(n => t - n.t0 < 1100);
      ctx.save();
      ctx.textAlign = 'center';
      for (const n of S.numbers) {
        const p = (t - n.t0) / 1100;
        const size = H * (n.big ? .06 : .036) * (p < .12 ? 1 + (1 - p / .12) * .6 : 1);
        const y = n.y - ease(p) * H * .1;
        ctx.globalAlpha = p > .7 ? (1 - p) / .3 : 1;
        ctx.font = `italic 900 ${Math.round(size)}px Orbitron, sans-serif`;
        ctx.lineWidth = size * .15;
        ctx.strokeStyle = '#05010c';
        ctx.strokeText(n.text, n.x, y);
        ctx.fillStyle = n.big ? '#ffc94a' : '#fff';
        ctx.shadowColor = n.c;
        ctx.shadowBlur = H * .02;
        ctx.fillText(n.text, n.x, y);
        ctx.shadowBlur = 0;
        ctx.font = `800 ${Math.round(H * .02)}px 'Exo 2', sans-serif`;
        ctx.lineWidth = H * .005;
        ctx.strokeText(n.name, n.x, y + size * .6);
        ctx.fillStyle = '#eaf4ff';
        ctx.fillText(n.name, n.x, y + size * .6);
      }
      ctx.restore();
      ctx.restore();
      // Vignet, rood als de baas kwaad is.
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, W * .7);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, s.angry ? `rgba(90,0,20,${.55 + .15 * Math.sin(t / 300)})` : 'rgba(0,0,0,.6)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
      drawHud(t, s, b, aura);
      if (move && move.kind === 'vraag' && s.bossQ) drawBossQuestion(t, s, move);
      else if (S.reveal && t - S.reveal.t0 < 4000) drawReveal(t);
      drawAnnounce(t);
      if (t < S.flashUntil) {
        ctx.globalAlpha = ((S.flashUntil - t) / S.flashMs) * .6;
        ctx.fillStyle = S.flashColor;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    }

    function bar(x, y, w, h, frac, colors, ghost) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, h / 2);
      ctx.fillStyle = 'rgba(5,1,12,.85)';
      ctx.fill();
      ctx.clip();
      if (ghost !== undefined) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, w * ghost / 100, h);
      }
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w * Math.max(0, frac) / 100, h);
      ctx.restore();
    }

    function drawHud(t, s, b, aura) {
      const { W, H } = S;
      // Naam en levensbalk van de baas.
      if (t > S.ghostAt) S.ghost += (S.hp - S.ghost) * .06;
      if (S.ghost < S.hp) S.ghost = S.hp;
      const bw = W * .62, bh = H * .04, bx = (W - bw) / 2, by = H * .07;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(H * .042)}px Cinzel, serif`;
      ctx.fillStyle = '#fff';
      ctx.shadowColor = aura.c;
      ctx.shadowBlur = H * .025;
      ctx.fillText(b.naam.toUpperCase(), W / 2, by - H * .02);
      ctx.shadowBlur = 0;
      ctx.font = `700 ${Math.round(H * .02)}px Orbitron, sans-serif`;
      ctx.fillStyle = aura.c;
      ctx.restore();
      bar(bx, by, bw, bh, S.hp, ['#fff3b0', s.angry ? '#ff2d55' : aura.c, '#2a0636'], S.ghost);
      ctx.save();
      ctx.strokeStyle = aura.c;
      ctx.lineWidth = H * .003;
      ctx.shadowColor = aura.c;
      ctx.shadowBlur = H * .015;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bh / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Merktekens bij 50% en 20%.
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (const f of [.5, .2]) ctx.fillRect(bx + bw * f - 1, by - H * .006, 2, bh + H * .012);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(bh * .6)}px Orbitron, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.lineWidth = H * .004;
      ctx.strokeStyle = '#05010c';
      const label = `${b.titel.toUpperCase()} · ${Math.ceil(S.hp)}%`;
      ctx.strokeText(label, W / 2, by + bh / 2);
      ctx.fillText(label, W / 2, by + bh / 2);
      ctx.restore();
      // Schildbalk, kwetsbaar en de klok.
      const move = s.move;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(H * .024)}px Orbitron, sans-serif`;
      if (move && move.kind === 'schild') {
        bar(W * .35, by + bh + H * .015, W * .3, H * .018, (move.hp / move.max) * 100, ['#e8d5ff', aura.c]);
        ctx.fillStyle = '#e8d5ff';
        ctx.fillText(`🛡️ SCHILD ${move.hp}/${move.max} · ${Math.ceil(move.left / 1000)}s`, W / 2, by + bh + H * .065);
      } else if (s.weak > 0) {
        ctx.fillStyle = '#4cc9ff';
        ctx.fillText(`KWETSBAAR · DUBBELE SCHADE · ${Math.ceil(s.weak / 1000)}s`, W / 2, by + bh + H * .04);
      }
      const now = Date.now() + S.offset;
      const left = Math.max(0, (s.endsAt || 0) - now);
      ctx.textAlign = 'right';
      ctx.font = `900 ${Math.round(H * .04)}px Orbitron, sans-serif`;
      ctx.fillStyle = left < 30000 && Math.sin(t / 150) > 0 ? '#ff4d6d' : '#ffc94a';
      ctx.fillText(`${Math.floor(left / 60000)}:${String(Math.floor(left / 1000) % 60).padStart(2, '0')}`, W * .97, H * .06);
      if (s.auto && s.nextAuto && !move) {
        ctx.font = `700 ${Math.round(H * .018)}px 'Exo 2', sans-serif`;
        ctx.fillStyle = '#ff8fa3';
        ctx.fillText(`⚡ de baas slaat toe over ${Math.ceil(s.nextAuto / 1000)}s`, W * .97, H * .095);
      }
      ctx.restore();
      // De moed van de klas, links onder de baas.
      const mw = W * .22, mh = H * .022, mx = W * .03, my = H * .62;
      ctx.save();
      ctx.font = `800 ${Math.round(H * .02)}px Orbitron, sans-serif`;
      ctx.fillStyle = '#9be8ff';
      ctx.fillText('🛡 MOED VAN DE KLAS', mx, my - H * .012);
      ctx.restore();
      bar(mx, my, mw, mh, S.moed, ['#e0fbff', S.moed < 25 ? '#ff2d55' : '#3fd8ff', '#063a52']);
      ctx.save();
      ctx.font = `800 ${Math.round(H * .02)}px Orbitron, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText(`${Math.ceil(S.moed)}%`, mx + mw + H * .01, my + mh * .85);
      ctx.restore();
    }

    function drawBossQuestion(t, s, move) {
      const { W, H } = S;
      const q = s.bossQ;
      const pw = W * .62, ph = H * .36, px = (W - pw) / 2, py = H * .17;
      ctx.save();
      ctx.fillStyle = 'rgba(10,0,8,.86)';
      ctx.strokeStyle = '#ff2d55';
      ctx.lineWidth = H * .004;
      ctx.shadowColor = '#ff2d55';
      ctx.shadowBlur = H * .04;
      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, H * .02);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.font = `900 ${Math.round(H * .026)}px Orbitron, sans-serif`;
      ctx.fillStyle = '#ff2d55';
      ctx.fillText(`💀 MOEILIJKE VRAAG · ${Math.ceil(move.left / 1000)}s · ${(move.right || 0) + (move.wrong || 0)}/${(s.roster || []).length} geantwoord`, W / 2, py + H * .045);
      ctx.font = `800 ${Math.round(H * .036)}px 'Exo 2', sans-serif`;
      ctx.fillStyle = '#fff';
      wrap(q.question, W / 2, py + H * .1, pw * .9, H * .042);
      const cols = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993'];
      const aw = (pw - H * .06) / 2, ah = H * .06;
      q.answers.forEach((a, i) => {
        const ax = px + H * .02 + (i % 2) * (aw + H * .02), ay = py + ph - H * .02 - (2 - Math.floor(i / 2)) * (ah + H * .012);
        ctx.fillStyle = cols[i];
        ctx.beginPath();
        ctx.roundRect(ax, ay, aw, ah, H * .01);
        ctx.fill();
        ctx.fillStyle = i === 2 ? '#2a1a00' : '#fff';
        ctx.font = `800 ${Math.round(H * .026)}px 'Exo 2', sans-serif`;
        ctx.fillText(`${i + 1}. ${a}`.slice(0, 48), ax + aw / 2, ay + ah * .64);
      });
      // De tijd loopt weg.
      ctx.fillStyle = '#ff2d55';
      ctx.fillRect(px, py + ph - H * .006, pw * (move.left / 20000), H * .006);
      ctx.restore();
    }

    function drawReveal(t) {
      const { W, H } = S;
      const r = S.reveal;
      const p = (t - r.t0) / 4000;
      ctx.save();
      ctx.globalAlpha = p > .85 ? (1 - p) / .15 : 1;
      ctx.fillStyle = 'rgba(10,0,8,.85)';
      ctx.beginPath();
      ctx.roundRect(W * .3, H * .2, W * .4, H * .16, H * .02);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(H * .024)}px Orbitron, sans-serif`;
      ctx.fillStyle = '#ff8fa3';
      ctx.fillText('HET JUISTE ANTWOORD', W / 2, H * .245);
      ctx.font = `900 ${Math.round(H * .04)}px 'Exo 2', sans-serif`;
      ctx.fillStyle = '#2ee6a6';
      ctx.fillText(r.answer, W / 2, H * .3);
      ctx.font = `700 ${Math.round(H * .022)}px 'Exo 2', sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText(`${r.right} juist · ${r.wrong} fout`, W / 2, H * .34);
      ctx.restore();
    }

    function wrap(text, x, y, maxW, lh) {
      const words = String(text).split(' ');
      let line = '';
      let yy = y;
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (ctx.measureText(test).width > maxW && line) {
          ctx.fillText(line, x, yy);
          line = w;
          yy += lh;
        } else line = test;
      }
      ctx.fillText(line, x, yy);
    }

    function drawAnnounce(t) {
      const a = S.announce;
      if (!a) return;
      const p = (t - a.t0) / a.ms;
      if (p >= 1) { S.announce = null; return; }
      const { W, H } = S;
      const scale = p < .12 ? 2.2 - 1.2 * ease(p / .12) : 1;
      ctx.save();
      ctx.globalAlpha = p > .8 ? (1 - p) / .2 : 1;
      ctx.translate(W / 2, H * .5);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const size = Math.round(H * (a.text.length > 14 ? .075 : .1));
      ctx.font = `900 ${size}px Cinzel, serif`;
      ctx.lineWidth = size * .09;
      ctx.strokeStyle = '#05010c';
      ctx.strokeText(a.text, 0, 0);
      const g = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
      g.addColorStop(0, '#fff');
      g.addColorStop(1, a.color);
      ctx.fillStyle = g;
      ctx.shadowColor = a.color;
      ctx.shadowBlur = H * .04;
      ctx.fillText(a.text, 0, 0);
      if (a.sub) {
        ctx.shadowBlur = H * .015;
        ctx.font = `800 ${Math.round(H * .034)}px 'Exo 2', sans-serif`;
        ctx.lineWidth = H * .008;
        ctx.strokeText(a.sub, 0, size * .75);
        ctx.fillStyle = '#fff';
        ctx.fillText(a.sub, 0, size * .75);
      }
      ctx.restore();
    }

    return { setState, hit, attack, event, frame };
  }

  return { boss, create, AURAS, EYES, EXTRAS, DEFAULT };
})();
