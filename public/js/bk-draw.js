// Bomber-Knight tekenen: de burchtarena met pilaren en kratten, de mijnen, de ontploffingen en de ridders.
// De vloer en pilaren worden één keer getekend; kratten worden alleen bijgewerkt waar iets verandert.
// Posities komen van de server per vakje; we tekenen ze vloeiend tussen het vorige en het huidige vakje.
// Gebruikt door het bord en de leerlingen.
const BomberDraw = (() => {
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff', '#9be15d', '#f2f2f2'];
  const PICKUPS = { 1: { icon: '💎', color: '#4cc9ff' }, 2: { icon: '🔥', color: '#ff8c42' }, 3: { icon: '🛡️', color: '#2ee6a6' }, 4: { icon: '⚡', color: '#ffc94a' } };
  const sprites = new Map();

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  function sprite(key, w, h, draw) {
    if (sprites.has(key)) return sprites.get(key);
    if (sprites.size > 120) sprites.clear();
    const c = canvas(w, h);
    draw(c.getContext('2d'), c.width, c.height);
    sprites.set(key, c);
    return c;
  }

  // ---------- Vakjes ----------

  // Vaste toevalsgetallen per vakje: elk scherm ziet dezelfde vloer.
  const hash = (x, y, s = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };

  // Een plavuis met voeg, licht randje boven en schaduw onder.
  function slab(g, x, y, w, h, base, t) {
    g.fillStyle = 'rgba(4, 6, 14, .55)';
    g.fillRect(x, y, w, h);
    const m = Math.max(1, t * .03);
    const grad = g.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, base[0]);
    grad.addColorStop(1, base[1]);
    g.fillStyle = grad;
    g.fillRect(x + m, y + m, w - m * 2, h - m * 2);
    g.fillStyle = 'rgba(190, 210, 255, .07)';
    g.fillRect(x + m, y + m, w - m * 2, Math.max(1, t * .03));
    g.fillStyle = 'rgba(0, 0, 0, .25)';
    g.fillRect(x + m, y + h - m - Math.max(1, t * .04), w - m * 2, Math.max(1, t * .04));
  }

  // Vloer: plavuizen in verschillende tinten, barstjes, gruis, een plek mos en hier en daar een lichtende rune.
  // n en w: staat er een muur of pilaar boven of links, dan valt er schaduw op dit vakje.
  function floorTile(g, x, y, t, cx, cy, n, w) {
    const h = hash(cx, cy), v = hash(cx, cy, 1);
    const tone = (k) => {
      const l = 22 + Math.round(k * 9);
      return [`hsl(226, 32%, ${l * .6}%)`, `hsl(228, 34%, ${l * .42}%)`];
    };
    if (v < .45) slab(g, x, y, t, t, tone(hash(cx, cy, 2)), t);
    else if (v < .75) {
      slab(g, x, y, t, t / 2, tone(hash(cx, cy, 2)), t);
      slab(g, x, y + t / 2, t, t / 2, tone(hash(cx, cy, 3)), t);
    } else {
      slab(g, x, y, t / 2, t, tone(hash(cx, cy, 2)), t);
      slab(g, x + t / 2, y, t / 2, t, tone(hash(cx, cy, 3)), t);
    }
    // Gruis
    g.fillStyle = 'rgba(160, 180, 230, .12)';
    for (let i = 0; i < 4; i++) {
      const s = Math.max(1, t * .04);
      g.fillRect(x + hash(cx, cy, 10 + i) * (t - s), y + hash(cx, cy, 20 + i) * (t - s), s, s);
    }
    if (hash(cx, cy, 4) < .22) {
      // Een barst
      g.strokeStyle = 'rgba(0, 0, 0, .45)';
      g.lineWidth = Math.max(1, t * .025);
      let px = x + t * (.2 + hash(cx, cy, 5) * .3), py = y + t * (.15 + hash(cx, cy, 6) * .2);
      g.beginPath(); g.moveTo(px, py);
      for (let i = 0; i < 3; i++) { px += t * (.08 + hash(cx, cy, 30 + i) * .14); py += t * (hash(cx, cy, 40 + i) * .24); g.lineTo(px, py); }
      g.stroke();
    }
    if (hash(cx, cy, 7) < .1) {
      // Mos tussen de stenen
      g.fillStyle = 'rgba(46, 160, 120, .18)';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.arc(x + t * (.1 + hash(cx, cy, 50 + i) * .8), y + t * (.6 + hash(cx, cy, 60 + i) * .35), t * (.05 + hash(cx, cy, 70 + i) * .06), 0, Math.PI * 2);
        g.fill();
      }
    }
    if (h < .06) {
      Glow.glow(g, x + t / 2, y + t / 2, t * .55, '#4cc9ff', .4);
      g.strokeStyle = 'rgba(127, 220, 255, .6)';
      g.lineWidth = Math.max(1, t * .04);
      g.beginPath(); g.arc(x + t / 2, y + t / 2, t * .22, 0, Math.PI * 2);
      g.moveTo(x + t / 2, y + t * .2); g.lineTo(x + t / 2, y + t * .8); g.stroke();
    } else if (h < .1) {
      Glow.glow(g, x + t / 2, y + t / 2, t * .6, '#ff5fd2', .28);
      g.strokeStyle = 'rgba(255, 140, 220, .55)';
      g.lineWidth = Math.max(1, t * .035);
      g.beginPath(); g.moveTo(x + t * .1, y + t * .7); g.lineTo(x + t * .4, y + t * .5); g.lineTo(x + t * .6, y + t * .6); g.lineTo(x + t * .9, y + t * .3); g.stroke();
    }
    // Schaduw van muren en pilaren (licht van linksboven).
    if (n) {
      const s = g.createLinearGradient(0, y, 0, y + t * .4);
      s.addColorStop(0, 'rgba(0, 0, 0, .5)');
      s.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = s;
      g.fillRect(x, y, t, t * .4);
    }
    if (w) {
      const s = g.createLinearGradient(x, 0, x + t * .25, 0);
      s.addColorStop(0, 'rgba(0, 0, 0, .3)');
      s.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = s;
      g.fillRect(x, y, t * .25, t);
    }
  }

  // Rijen stenen met wisselende tint, verspringend gemetseld.
  function bricks(g, x, y, w, h, rows, t, seed, light, dark) {
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const n = 2 + (r % 2), bw = w / n, off = r % 2 ? -bw / 2 : 0;
      for (let i = 0; i <= n; i++) {
        const bx = Math.max(x, x + off + i * bw), ex = Math.min(x + w, x + off + (i + 1) * bw);
        if (ex <= bx) continue;
        const k = hash(seed, r * 7 + i);
        g.fillStyle = k < .5 ? light : dark;
        g.fillRect(bx, y + r * rh, ex - bx, rh);
        if (k > .85) { g.fillStyle = 'rgba(0, 0, 0, .18)'; g.fillRect(bx, y + r * rh, ex - bx, rh); }
        g.fillStyle = 'rgba(255, 255, 255, .08)';
        g.fillRect(bx, y + r * rh, ex - bx, Math.max(1, t * .025));
      }
      g.fillStyle = 'rgba(0, 0, 0, .45)';
      g.fillRect(x, y + (r + 1) * rh - Math.max(1, t * .025), w, Math.max(1, t * .025));
      for (let i = 1; i <= n; i++) {
        const jx = x + off + i * bw;
        if (jx > x && jx < x + w) g.fillRect(jx - Math.max(.5, t * .012), y + r * rh, Math.max(1, t * .025), rh);
      }
    }
  }

  // Een stenen torentje met kantelen en een gloeiend kristal: de pilaren.
  function pillar(t, v) {
    return sprite(`p${t}|${v}`, t, t, g => {
      g.fillStyle = 'rgba(0, 0, 0, .4)';
      g.fillRect(t * .14, t * .16, t * .9, t * .86);
      bricks(g, t * .06, t * .34, t * .88, t * .62, 4, t, 90 + v, '#4a5474', '#353d58');
      // Rand rechts donker, links licht: zo staat hij recht op.
      g.fillStyle = 'rgba(0, 0, 0, .3)';
      g.fillRect(t * .82, t * .34, t * .12, t * .62);
      g.fillStyle = 'rgba(200, 220, 255, .1)';
      g.fillRect(t * .06, t * .34, t * .06, t * .62);
      // Bovenkant met vier kantelen
      g.fillStyle = '#5f6a8f';
      g.fillRect(t * .04, t * .14, t * .92, t * .22);
      g.fillStyle = '#7480a8';
      for (let i = 0; i < 4; i++) g.fillRect(t * (.04 + i * .25), t * .02, t * .17, t * .16);
      g.fillStyle = 'rgba(255, 255, 255, .14)';
      for (let i = 0; i < 4; i++) g.fillRect(t * (.04 + i * .25), t * .02, t * .17, Math.max(1, t * .03));
      g.fillStyle = 'rgba(0, 0, 0, .35)';
      g.fillRect(t * .04, t * .33, t * .92, Math.max(1, t * .03));
      // Schietgat
      g.fillStyle = '#10141f';
      g.fillRect(t * .46, t * .6, t * .08, t * .22);
      g.fillRect(t * .4, t * .68, t * .2, t * .05);
      Glow.glow(g, t * .5, t * .22, t * .42, '#4cc9ff', .85);
      g.fillStyle = '#bff0ff';
      g.beginPath();
      g.moveTo(t * .5, t * .04); g.lineTo(t * .62, t * .22); g.lineTo(t * .5, t * .4); g.lineTo(t * .38, t * .22);
      g.closePath();
      g.fill();
      g.fillStyle = '#4cc9ff';
      g.beginPath();
      g.moveTo(t * .5, t * .04); g.lineTo(t * .62, t * .22); g.lineTo(t * .5, t * .4);
      g.closePath();
      g.fill();
    });
  }

  // De buitenmuur, getekend zoals de bovenste muur (buitenkant boven) en voor de andere kanten gedraaid.
  // side: 0 boven, 1 rechts, 2 onder, 3 links.
  function wall(t, side, v) {
    return sprite(`w${t}|${side}|${v}`, t, t, g => {
      g.translate(t / 2, t / 2);
      g.rotate(side * Math.PI / 2);
      g.translate(-t / 2, -t / 2);
      g.fillStyle = '#141827';
      g.fillRect(0, 0, t, t);
      // Kantelen aan de buitenkant
      g.fillStyle = '#4a5476';
      g.fillRect(0, 0, t * .38, t * .2);
      g.fillRect(t * .62, 0, t * .38, t * .2);
      g.fillStyle = 'rgba(255, 255, 255, .12)';
      g.fillRect(0, 0, t * .38, Math.max(1, t * .03));
      g.fillRect(t * .62, 0, t * .38, Math.max(1, t * .03));
      // Weergang: platte stenen
      g.fillStyle = '#323a57';
      g.fillRect(0, t * .2, t, t * .36);
      g.fillStyle = 'rgba(0, 0, 0, .35)';
      g.fillRect(t * (.3 + hash(v, side) * .4), t * .2, Math.max(1, t * .025), t * .36);
      g.fillRect(0, t * .2, t, Math.max(1, t * .03));
      // Binnenkant: gemetselde muur naar de arena toe
      bricks(g, 0, t * .56, t, t * .36, 3, t, 40 + v * 4 + side, '#3c4565', '#2b324c');
      const sh = g.createLinearGradient(0, t * .56, 0, t * .92);
      sh.addColorStop(0, 'rgba(0, 0, 0, 0)');
      sh.addColorStop(1, 'rgba(0, 0, 0, .35)');
      g.fillStyle = sh;
      g.fillRect(0, t * .56, t, t * .36);
      g.fillStyle = 'rgba(255, 77, 210, .25)';
      g.fillRect(0, t * .9, t, t * .1);
      g.fillStyle = '#ff7ae0';
      g.fillRect(0, t * .96, t, t * .04);
    });
  }

  // Een ronde hoektoren met een leien dak en een vlag.
  function tower(t) {
    return sprite(`tw${t}`, t, t, g => {
      const c = t / 2, r = t * .5;
      g.fillStyle = '#141827';
      g.fillRect(0, 0, t, t);
      g.fillStyle = '#4a5476';
      g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a3150';
      g.beginPath(); g.arc(c, c, r * .86, 0, Math.PI * 2); g.fill();
      // Leien dak van bovenaf: punten naar het midden, licht van linksboven
      for (let i = 0; i < 12; i++) {
        const a0 = i * Math.PI / 6, a1 = a0 + Math.PI / 6;
        const lit = Math.cos(a0 + Math.PI / 12 + Math.PI * .75);
        g.fillStyle = `hsl(222, 30%, ${26 + lit * 12}%)`;
        g.beginPath(); g.moveTo(c, c);
        g.lineTo(c + Math.cos(a0) * r * .8, c + Math.sin(a0) * r * .8);
        g.lineTo(c + Math.cos(a1) * r * .8, c + Math.sin(a1) * r * .8);
        g.closePath(); g.fill();
      }
      g.strokeStyle = 'rgba(0, 0, 0, .3)';
      g.lineWidth = Math.max(1, t * .02);
      for (const k of [.35, .58]) { g.beginPath(); g.arc(c, c, r * k, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = '#ffc94a';
      g.beginPath(); g.arc(c, c, t * .06, 0, Math.PI * 2); g.fill();
      // Vlag
      g.fillStyle = '#ff4d6d';
      g.beginPath(); g.moveTo(c, c - t * .02); g.lineTo(c + t * .3, c + t * .05); g.lineTo(c, c + t * .14); g.closePath(); g.fill();
    });
  }

  // Een fakkelhouder op de muur; de vlam zelf tekenen we elke beeld.
  function torch(g, x, y, t) {
    g.fillStyle = '#1b1f2c';
    g.fillRect(x - t * .12, y + t * .22, t * .24, t * .08);
    g.fillStyle = '#5b3a1e';
    g.fillRect(x - t * .04, y + t * .02, t * .08, t * .26);
    g.fillStyle = '#8b97b3';
    g.fillRect(x - t * .09, y - t * .02, t * .18, t * .07);
  }

  // Een krat: planken hout met nerven, stalen hoeken en een gloeiende rune. Drie soorten.
  function crate(t, v) {
    return sprite(`c${t}|${v}`, t, t, g => {
      const p = t * .08;
      g.fillStyle = 'rgba(0, 0, 0, .4)';
      g.fillRect(p + t * .06, p + t * .07, t - p * 2, t - p * 2);
      const wood = [['#b07a42', '#6b4422'], ['#9c6a3a', '#5e3b1e'], ['#b88a4e', '#77502a']][v];
      const grad = g.createLinearGradient(0, p, 0, t - p);
      grad.addColorStop(0, wood[0]);
      grad.addColorStop(1, wood[1]);
      g.fillStyle = grad;
      g.fillRect(p, p, t - p * 2, t - p * 2);
      const across = v !== 1;
      g.strokeStyle = 'rgba(40, 20, 5, .6)';
      g.lineWidth = Math.max(1, t * .025);
      for (let i = 1; i < 4; i++) {
        const k = p + (t - p * 2) * i / 4;
        g.beginPath();
        if (across) { g.moveTo(p, k); g.lineTo(t - p, k); } else { g.moveTo(k, p); g.lineTo(k, t - p); }
        g.stroke();
      }
      // Nerven
      g.strokeStyle = 'rgba(255, 220, 170, .12)';
      g.lineWidth = Math.max(1, t * .015);
      for (let i = 0; i < 6; i++) {
        const k = p + (t - p * 2) * (i + .5) / 6, w = t * .03 * Math.sin(i * 2.1 + v);
        g.beginPath();
        if (across) { g.moveTo(p, k); g.quadraticCurveTo(t / 2, k + w, t - p, k); } else { g.moveTo(k, p); g.quadraticCurveTo(k + w, t / 2, k, t - p); }
        g.stroke();
      }
      if (v === 2) {
        // Een kruisbalk
        g.strokeStyle = 'rgba(60, 32, 12, .8)';
        g.lineWidth = Math.max(2, t * .07);
        g.beginPath(); g.moveTo(p * 1.6, p * 1.6); g.lineTo(t - p * 1.6, t - p * 1.6); g.stroke();
      }
      // Stalen hoeken met klinknagels en een band in het midden.
      g.strokeStyle = '#8b97b3';
      g.lineWidth = Math.max(2, t * .07);
      g.strokeRect(p + g.lineWidth / 2, p + g.lineWidth / 2, t - p * 2 - g.lineWidth, t - p * 2 - g.lineWidth);
      g.strokeStyle = 'rgba(255, 255, 255, .25)';
      g.lineWidth = Math.max(1, t * .02);
      g.beginPath(); g.moveTo(p, p + t * .01); g.lineTo(t - p, p + t * .01); g.stroke();
      g.fillStyle = '#5d6884';
      if (across) g.fillRect(t * .44, p, t * .12, t - p * 2); else g.fillRect(p, t * .44, t - p * 2, t * .12);
      g.fillStyle = '#cfd8ea';
      for (const [x, y] of [[.17, .17], [.83, .17], [.17, .83], [.83, .83]]) {
        g.beginPath();
        g.arc(t * x, t * y, Math.max(1, t * .035), 0, Math.PI * 2);
        g.fill();
      }
      Glow.glow(g, t / 2, t / 2, t * .3, '#4cc9ff', .9);
      g.fillStyle = '#bff0ff';
      g.beginPath();
      g.arc(t / 2, t / 2, t * .08, 0, Math.PI * 2);
      g.fill();
    });
  }

  function glow(color, r) {
    r = Math.max(2, Math.round(r));
    return sprite(`g${color}${r}`, r * 2, r * 2, g => {
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(.3, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, r * 2, r * 2);
    });
  }

  // Een upgrade op de grond: een gloed met het icoon erin.
  function pickup(k, t) {
    return sprite(`u${k}|${t}`, t, t, g => {
      const r = t / 2;
      const grad = g.createRadialGradient(r, r, 0, r, r, r);
      grad.addColorStop(0, 'rgba(255,255,255,.9)');
      grad.addColorStop(.3, PICKUPS[k].color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, t, t);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `${Math.round(t * .5)}px system-ui, sans-serif`;
      g.fillText(PICKUPS[k].icon, r, r + t * .03);
    });
  }

  // Een mijn: een stalen bol met punten en een lampje in de kleur van wie hem legde.
  function mineSprite(t, color) {
    return sprite(`m${t}${color}`, t, t, g => {
      const c = t / 2, r = t * .26;
      g.strokeStyle = '#7d89a8';
      g.lineWidth = Math.max(2, t * .07);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        g.beginPath();
        g.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
        g.lineTo(c + Math.cos(a) * r * 1.5, c + Math.sin(a) * r * 1.5);
        g.stroke();
      }
      const grad = g.createRadialGradient(c - r * .4, c - r * .4, r * .1, c, c, r);
      grad.addColorStop(0, '#9aa8c2');
      grad.addColorStop(1, '#1c2236');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(c, c, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = color;
      g.lineWidth = Math.max(1.5, t * .045);
      g.stroke();
    });
  }

  // ---------- Scène ----------

  function fromState(s, old) {
    if (!s.arena) return old || null;
    const same = old && old.run === s.run && old.W === s.W && old.H === s.H;
    const sc = same ? old : {
      run: s.run, W: s.W, H: s.H, arena: s.arena, step: s.step || 175, mineMs: s.mineMs || 2300, blastMs: s.blastMs || 550,
      knights: new Map(), mines: [], fires: [], parts: [], pops: [], layer: null, layerTile: 0, dirty: new Set(),
    };
    sc.arena = s.arena;
    sc.crates = Uint8Array.from(String(s.crates || ''), ch => Number(ch));
    sc.pickups = Uint8Array.from(String(s.pickups || ''), ch => Number(ch));
    sc.roster = new Map((s.roster || []).map(([n, name, color]) => [n, { name, color }]));
    sc.layer = null;
    return sc;
  }

  // Een tick van de server verwerken.
  function apply(sc, msg) {
    const now = performance.now();
    const seen = new Set();
    for (const [n, x, y, px, py, age, face, flags] of msg.k || []) {
      seen.add(n);
      const k = sc.knights.get(n) || { n };
      Object.assign(k, { x, y, px, py, age, face, flags, recv: now });
      sc.knights.set(n, k);
    }
    // Wie stilstaat, komt niet in elke tick mee; één keer per seconde komt iedereen (en verdwijnt wie weg is).
    if (msg.full) for (const n of [...sc.knights.keys()]) if (!seen.has(n)) sc.knights.delete(n);
    if (msg.m) sc.mines = msg.m.map(([id, x, y, left, owner]) => ({ id, x, y, end: now + left, owner }));
    for (const [i, c, p] of msg.c || []) {
      if (sc.crates[i] && !c) {
        // Krat springt open: splinters.
        const x = i % sc.W + .5, y = Math.floor(i / sc.W) + .5;
        for (let j = 0; j < 8; j++) sc.parts.push({ x, y, vx: (Math.random() - .5) * 6, vy: (Math.random() - .5) * 6, life: .5, max: .5, color: '#c98a4a', size: .14 });
      }
      sc.crates[i] = c;
      sc.pickups[i] = p;
      sc.dirty.add(i);
    }
    const events = [];
    for (const e of msg.e || []) {
      if (e[0] === 'x') {
        const [, x, y, cells, owner] = e;
        sc.fires.push({ x, y, cells: cells.map(i => [i % sc.W, Math.floor(i / sc.W)]), start: now, owner });
        for (let j = 0; j < 14; j++) sc.parts.push({ x: x + .5, y: y + .5, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9, life: .6, max: .6, color: Math.random() < .5 ? '#ffd23f' : '#ff6b3d', size: .3 });
      }
      events.push(e);
    }
    if (sc.parts.length > 300) sc.parts.splice(0, sc.parts.length - 300);
    return events;
  }

  function pos(k, now) {
    const p = Math.max(0, Math.min(1, (k.age + (now - k.recv)) / k.ms));
    return { x: k.px + (k.x - k.px) * p, y: k.py + (k.y - k.py) * p, moving: p < 1 && (k.x !== k.px || k.y !== k.py) };
  }

  // De arena als één canvas: vloer, muren, pilaren en kratten. Alleen veranderde vakjes worden opnieuw getekend.
  function layer(sc, t) {
    const solid = (x, y) => x >= 0 && y >= 0 && sc.arena[y][x] === '#';
    const paintCell = (g, x, y) => {
      const c = sc.arena[y][x];
      const L = x * t, T = y * t;
      const edge = x === 0 || y === 0 || x === sc.W - 1 || y === sc.H - 1;
      const v = Math.floor(hash(x, y, 9) * 3);
      if (c === '#') {
        if (edge) {
          const corner = (x === 0 || x === sc.W - 1) && (y === 0 || y === sc.H - 1);
          if (corner) g.drawImage(tower(t), L, T);
          else g.drawImage(wall(t, y === 0 ? 0 : x === sc.W - 1 ? 1 : y === sc.H - 1 ? 2 : 3, v), L, T);
          if (!corner && (y === 0 || y === sc.H - 1) && x >= 2 && x < sc.W - 2 && (x - 2) % 4 === 0) torch(g, L + t / 2, T + t * .45, t);
        } else {
          floorTile(g, L, T, t, x, y, solid(x, y - 1), solid(x - 1, y));
          g.drawImage(pillar(t, v % 2), L, T);
        }
        return;
      }
      floorTile(g, L, T, t, x, y, solid(x, y - 1), solid(x - 1, y));
      if (sc.crates[y * sc.W + x]) g.drawImage(crate(t, v), L, T);
    };
    if (!sc.layer || sc.layerTile !== t) {
      sc.layer = canvas(sc.W * t, sc.H * t);
      sc.layerTile = t;
      const g = sc.layer.getContext('2d');
      for (let y = 0; y < sc.H; y++) for (let x = 0; x < sc.W; x++) paintCell(g, x, y);
      sc.dirty.clear();
    } else if (sc.dirty.size) {
      const g = sc.layer.getContext('2d');
      for (const i of sc.dirty) paintCell(g, i % sc.W, Math.floor(i / sc.W));
      sc.dirty.clear();
    }
    return sc.layer;
  }

  function knight(ctx, cx, cy, t, k, info, time, opts) {
    const color = COLORS[(info && info.color) % COLORS.length] || '#4cc9ff';
    const asking = k.flags & 1, safe = k.flags & 4, shield = k.flags & 8;
    ctx.save();
    if (safe && !asking && Math.floor(time * 8) % 2) ctx.globalAlpha = .45;
    Glow.glow(ctx, cx, cy + t * .3, t * .6, color, .45, .45);
    // Schaduw en een gekleurde ring.
    ctx.fillStyle = 'rgba(0, 0, 0, .35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + t * .32, t * .3, t * .1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, t * .06);
    ctx.beginPath();
    ctx.ellipse(cx, cy + t * .32, t * .32, t * .12, 0, 0, Math.PI * 2);
    ctx.stroke();
    const bob = opts.moving ? Math.abs(Math.sin(time * 14)) * t * .08 : 0;
    const av = info && typeof Avatar !== 'undefined' ? (opts.me ? Avatar.mine() : Avatar.byName(info.name)) : null;
    if (av) {
      const kk = Math.max(2, Math.round(t / 16));
      const img = Avatar.sprite(av, { k: kk, back: k.face === 0 });
      const h = t * .95, w = h * img.width / img.height;
      ctx.save();
      if (k.face === 3) { ctx.translate(cx, 0); ctx.scale(-1, 1); ctx.translate(-cx, 0); }
      ctx.drawImage(img, cx - w / 2, cy - h * .62 - bob, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#cfd8ea';
      ctx.beginPath();
      ctx.roundRect(cx - t * .2, cy - t * .1 - bob, t * .4, t * .4, t * .08);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy - t * .22 - bob, t * .2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b0f1c';
      ctx.fillRect(cx - t * .13, cy - t * .25 - bob, t * .26, t * .06);
    }
    if (shield) {
      ctx.globalAlpha = .5 + Math.sin(time * 6) * .15;
      ctx.drawImage(glow('#2ee6a6', t * .55), cx - t * .55, cy - t * .62, t * 1.1, t * 1.1);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#7fffd4';
      ctx.lineWidth = Math.max(1.5, t * .04);
      ctx.beginPath();
      ctx.arc(cx, cy - t * .08, t * .48, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (asking) {
      // Aan het antwoorden: in een beschermende bel, met een vraagteken.
      ctx.globalAlpha = .85;
      ctx.strokeStyle = '#ffc94a';
      ctx.lineWidth = Math.max(2, t * .05);
      ctx.beginPath();
      ctx.arc(cx, cy - t * .08, t * .5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffc94a';
      ctx.font = `900 ${Math.round(t * .45)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('?', cx + t * .38, cy - t * .5);
    }
    ctx.restore();
    if (opts.names && info) {
      ctx.font = `700 ${Math.max(10, Math.round(t * .3))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, .75)';
      ctx.strokeText(info.name, cx, cy - t * .7);
      ctx.fillStyle = opts.me ? '#ffc94a' : '#ffffff';
      ctx.fillText(info.name, cx, cy - t * .7);
    }
    if (opts.me) {
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath();
      const ay = cy - t * (opts.names ? 1.05 : .8) + Math.sin(time * 5) * t * .05;
      ctx.moveTo(cx - t * .12, ay - t * .12); ctx.lineTo(cx + t * .12, ay - t * .12); ctx.lineTo(cx, ay);
      ctx.fill();
    }
  }

  // Alles tekenen. cam = { tile, ox, oy } in pixels.
  function scene(ctx, sc, cam, opts = {}) {
    const now = performance.now();
    const time = now / 1000;
    const t = cam.tile;
    Glow.space(ctx, ctx.canvas.width, ctx.canvas.height);
    const lay = layer(sc, t);
    Glow.glow(ctx, cam.ox + lay.width / 2, cam.oy + lay.height / 2, Math.max(lay.width, lay.height) * .75, '#4cc9ff', .12);
    ctx.drawImage(lay, cam.ox, cam.oy);
    // Fakkels op de buitenmuur
    for (let i = 2; i < sc.W - 2; i += 4) {
      for (const yy of [0, sc.H - 1]) {
        const x = cam.ox + (i + .5) * t, y = cam.oy + (yy + .45) * t;
        const f = 1 + Math.sin(time * 12 + i * 3 + yy) * .12;
        Glow.glow(ctx, x, y, t * 1.3 * f, '#ff8a2a', .45);
        Glow.glow(ctx, x, y - t * .05, t * .32 * f, '#fff1b8', .9);
      }
    }
    const at = (x, y) => ({ x: cam.ox + (x + .5) * t, y: cam.oy + (y + .5) * t });
    // Upgrades die op de grond liggen.
    for (let i = 0; i < sc.pickups.length; i++) {
      const k = sc.pickups[i];
      if (!k || sc.crates[i]) continue;
      const p = at(i % sc.W, Math.floor(i / sc.W));
      const bob = Math.sin(time * 4 + i) * t * .06;
      ctx.drawImage(pickup(k, t), p.x - t / 2, p.y - t / 2 + bob);
    }
    // Mijnen: knipperen sneller vlak voor ze ontploffen.
    for (const m of sc.mines) {
      const p = at(m.x, m.y);
      const left = Math.max(0, m.end - now);
      const info = sc.roster.get(m.owner);
      const color = COLORS[(info && info.color) % COLORS.length] || '#ff4d6d';
      const pulse = 1 + Math.sin(time * (left < 800 ? 40 : 12)) * .08;
      const img = mineSprite(t, color);
      ctx.drawImage(img, p.x - t / 2 * pulse, p.y - t / 2 * pulse, t * pulse, t * pulse);
      const blink = Math.floor(now / (left < 800 ? 70 : 220)) % 2;
      ctx.drawImage(glow(blink ? '#ff3b3b' : color, t * .25), p.x - t * .25, p.y - t * .25, t * .5, t * .5);
    }
    // Ontploffingen: een kruis van plasma.
    ctx.globalCompositeOperation = 'lighter';
    sc.fires = sc.fires.filter(f => now - f.start < sc.blastMs + 150);
    for (const f of sc.fires) {
      const k = 1 - (now - f.start) / (sc.blastMs + 150);
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.6));
      for (const [x, y] of f.cells) {
        const p = at(x, y);
        const r = t * (.62 + Math.sin(time * 30 + x + y) * .05);
        ctx.drawImage(glow('#ff6b3d', r), p.x - r, p.y - r, r * 2, r * 2);
        const r2 = t * .38;
        ctx.drawImage(glow('#ffd23f', r2), p.x - r2, p.y - r2, r2 * 2, r2 * 2);
      }
      const c = at(f.x, f.y);
      const r = t * (1.1 * k + .3);
      ctx.drawImage(glow('#ffffff', r), c.x - r, c.y - r, r * 2, r * 2);
      // Schokgolf
      ctx.strokeStyle = `rgba(255, 210, 120, ${k})`;
      ctx.lineWidth = t * .12 * k + 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, t * (2.4 - k * 2), 0, Math.PI * 2);
      ctx.stroke();
    }
    // Splinters en vonken.
    for (const p of sc.parts) {
      p.life -= 1 / 60;
      p.x += p.vx / 60;
      p.y += p.vy / 60;
      const kk = Math.max(0, p.life / p.max);
      ctx.globalAlpha = kk;
      const r = p.size * t * (.5 + kk * .5);
      ctx.drawImage(glow(p.color, 12), cam.ox + p.x * t - r, cam.oy + p.y * t - r, r * 2, r * 2);
    }
    sc.parts = sc.parts.filter(p => p.life > 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Ridders, van boven naar onder (wie lager staat, staat ervoor). De eigen ridder als laatste.
    const list = [];
    for (const k of sc.knights.values()) {
      if (k.flags & 2) continue;
      k.ms = sc.step;
      const p = pos(k, now);
      list.push({ k, p });
    }
    list.sort((a, b) => (a.k.n === opts.me) - (b.k.n === opts.me) || a.p.y - b.p.y);
    for (const { k, p } of list) {
      const s = at(p.x, p.y);
      knight(ctx, s.x, s.y, t, k, sc.roster.get(k.n), time, { names: opts.names, me: k.n === opts.me, moving: p.moving });
    }
    // Uitgeschakelde ridders: een geestje dat opstijgt.
    for (const k of sc.knights.values()) {
      if (!(k.flags & 2)) continue;
      const s = at(k.x, k.y);
      ctx.globalAlpha = .55;
      ctx.font = `${Math.round(t * .6)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('👻', s.x, s.y - ((time * 20) % 10) * t * .03);
      ctx.globalAlpha = 1;
    }
    Glow.vignette(ctx, ctx.canvas.width, ctx.canvas.height, .45);
  }

  // Klein overzicht van de hele arena voor op de gsm.
  function minimap(ctx, sc, x, y, w, h, me) {
    ctx.fillStyle = 'rgba(5, 7, 15, .8)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    const cw = w / sc.W, ch = h / sc.H;
    for (let yy = 0; yy < sc.H; yy++) {
      for (let xx = 0; xx < sc.W; xx++) {
        const i = yy * sc.W + xx;
        if (sc.arena[yy][xx] === '#') ctx.fillStyle = '#39415f';
        else if (sc.crates[i]) ctx.fillStyle = '#6b4422';
        else continue;
        ctx.fillRect(x + xx * cw, y + yy * ch, cw + .3, ch + .3);
      }
    }
    for (const m of sc.mines) {
      ctx.fillStyle = '#ff3b3b';
      ctx.fillRect(x + m.x * cw, y + m.y * ch, cw, ch);
    }
    for (const k of sc.knights.values()) {
      if (k.flags & 2) continue;
      const info = sc.roster.get(k.n);
      ctx.fillStyle = k.n === me ? '#ffffff' : COLORS[(info && info.color) % COLORS.length];
      const r = Math.max(2, cw * (k.n === me ? .9 : .6));
      ctx.beginPath();
      ctx.arc(x + (k.x + .5) * cw, y + (k.y + .5) * ch, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { COLORS, PICKUPS, fromState, apply, scene, minimap, pos, crate, pillar, mine: mineSprite, glow };
})();
