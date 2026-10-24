// Gauntlet tekenen, voor het bord en de leerling: de kerker (één keer vooraf getekend), monsters, poorten, schatten,
// schoten, vonken en het licht van fakkels en ridders in het donker. Gebruikt GtWorld en AK (arena-kit.js).
const GtDraw = (() => {
  const { T, R, CLASSES, MONSTERS, POORT } = GtWorld;
  const SHOT_COLORS = { bol: '#d59cff', pijl: '#7dffb0', plasma: '#6fe3ff', vijand: '#ff4d6d' };

  // ---------- De kerker vooraf tekenen ----------
  function bake(d) {
    const max = 4096;
    const q = Math.min(1.25, max / (d.W * T), max / (d.H * T));
    const c = document.createElement('canvas');
    c.width = Math.ceil(d.W * T * q);
    c.height = Math.ceil(d.H * T * q);
    const ctx = c.getContext('2d');
    ctx.scale(q, q);
    const g = GtWorld.grid(d);
    const rnd = GtWorld.rng(d.seed + d.level * 31);
    // Vloer: donkere stalen platen met naden, wat slijtage en hier en daar een lichtende rune.
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(0, 0, d.W * T, d.H * T);
    for (let y = 0; y < d.H; y++) {
      for (let x = 0; x < d.W; x++) {
        if (g[y][x] === 1) continue;
        const X = x * T, Y = y * T;
        const v = 18 + Math.floor(rnd() * 10);
        ctx.fillStyle = `rgb(${v},${v + 6},${v + 18})`;
        ctx.fillRect(X + 1, Y + 1, T - 2, T - 2);
        ctx.fillStyle = 'rgba(255,255,255,.035)';
        ctx.fillRect(X + 1, Y + 1, T - 2, 2);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(X + 1, Y + T - 3, T - 2, 2);
        // Klinknagels
        ctx.fillStyle = 'rgba(160,190,230,.12)';
        for (const [a, b] of [[5, 5], [T - 7, 5], [5, T - 7], [T - 7, T - 7]]) ctx.fillRect(X + a, Y + b, 2, 2);
        if (rnd() < .05) {
          ctx.strokeStyle = 'rgba(76,201,255,.22)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(X + T / 2, Y + T / 2, T * .28, 0, Math.PI * 2);
          ctx.moveTo(X + T / 2, Y + T * .15);
          ctx.lineTo(X + T / 2, Y + T * .85);
          ctx.moveTo(X + T * .2, Y + T / 2);
          ctx.lineTo(X + T * .8, Y + T / 2);
          ctx.stroke();
        } else if (rnd() < .08) {
          ctx.fillStyle = 'rgba(0,0,0,.25)';
          ctx.beginPath();
          ctx.ellipse(X + rnd() * T, Y + rnd() * T, 6 + rnd() * 8, 3 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // Elke zaal krijgt een eigen sfeer: lavaspleten, techplaten met lichtende voegen of een crypte met mos en botten.
    const isFloor = (x, y) => x >= 0 && y >= 0 && x < d.W && y < d.H && g[y][x] === 0;
    (d.rooms || []).forEach(([rx, ry, rw, rh], ri) => {
      const theme = ri === 0 ? 'tech' : ['lava', 'tech', 'crypte'][Math.floor(rnd() * 3)];
      const X0 = rx * T, Y0 = ry * T, W0 = rw * T, H0 = rh * T;
      const cx = X0 + W0 / 2, cy = Y0 + H0 / 2;
      if (theme === 'lava') {
        AK.glow(ctx, cx, cy, Math.max(W0, H0) * .7, '#ff5a1f', .18);
        for (let n = 0; n < 3 + rw * rh / 12; n++) {
          let x = X0 + rnd() * W0, y = Y0 + rnd() * H0, a = rnd() * Math.PI * 2;
          const pts = [[x, y]];
          for (let i = 0; i < 5 + rnd() * 6; i++) {
            a += (rnd() - .5) * 1.4;
            x += Math.cos(a) * (10 + rnd() * 14);
            y += Math.sin(a) * (10 + rnd() * 14);
            if (!isFloor(Math.floor(x / T), Math.floor(y / T))) break;
            pts.push([x, y]);
          }
          if (pts.length < 2) continue;
          for (const [lw, col] of [[9, 'rgba(255,90,20,.18)'], [4, 'rgba(255,120,30,.7)'], [1.5, 'rgba(255,230,140,.95)']]) {
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            ctx.lineCap = ctx.lineJoin = 'round';
            ctx.beginPath();
            pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
            ctx.stroke();
          }
        }
      } else if (theme === 'tech') {
        AK.glow(ctx, cx, cy, Math.max(W0, H0) * .6, '#1e7fd6', .14);
        ctx.strokeStyle = 'rgba(76,201,255,.22)';
        ctx.lineWidth = 1.5;
        for (let x = rx; x <= rx + rw; x++) { ctx.beginPath(); ctx.moveTo(x * T, Y0); ctx.lineTo(x * T, Y0 + H0); ctx.stroke(); }
        for (let y = ry; y <= ry + rh; y++) { ctx.beginPath(); ctx.moveTo(X0, y * T); ctx.lineTo(X0 + W0, y * T); ctx.stroke(); }
        // Roosters met licht eronder
        for (let n = 0; n < Math.max(1, rw * rh / 25); n++) {
          const gx = rx + 1 + Math.floor(rnd() * Math.max(1, rw - 2)), gy = ry + 1 + Math.floor(rnd() * Math.max(1, rh - 2));
          const X = gx * T, Y = gy * T;
          AK.glow(ctx, X + T / 2, Y + T / 2, T * .9, '#4cc9ff', .45);
          ctx.fillStyle = 'rgba(5,10,20,.8)';
          for (let i = 0; i < 5; i++) ctx.fillRect(X + 6, Y + 7 + i * 8, T - 12, 3);
          ctx.strokeStyle = 'rgba(140,200,255,.45)';
          ctx.strokeRect(X + 4, Y + 4, T - 8, T - 8);
        }
      } else {
        AK.glow(ctx, cx, cy, Math.max(W0, H0) * .6, '#3fae6a', .1);
        for (let n = 0; n < rw * rh / 2; n++) {
          ctx.fillStyle = rnd() < .6 ? 'rgba(60,140,80,.16)' : 'rgba(30,80,50,.22)';
          ctx.beginPath();
          ctx.ellipse(X0 + rnd() * W0, Y0 + rnd() * H0, 6 + rnd() * 18, 4 + rnd() * 10, rnd() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // Botten en schedels
        for (let n = 0; n < 2 + rw * rh / 18; n++) {
          const x = X0 + 10 + rnd() * (W0 - 20), y = Y0 + 10 + rnd() * (H0 - 20), a = rnd() * Math.PI;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a);
          ctx.fillStyle = 'rgba(220,212,190,.55)';
          ctx.fillRect(-7, -1.5, 14, 3);
          for (const sx of [-7, 7]) { ctx.beginPath(); ctx.arc(sx, -2, 2.2, 0, Math.PI * 2); ctx.arc(sx, 2, 2.2, 0, Math.PI * 2); ctx.fill(); }
          if (rnd() < .35) {
            ctx.beginPath(); ctx.arc(0, -10, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(10,10,10,.7)';
            ctx.fillRect(-3, -11, 2, 2); ctx.fillRect(1, -11, 2, 2);
          }
          ctx.restore();
        }
      }
      // Een runencirkel in het midden van de grotere zalen
      if (rw * rh >= 30 && rnd() < .7) {
        const col = theme === 'lava' ? '#ff8c3a' : theme === 'tech' ? '#4cc9ff' : '#7dffb0';
        const rr = Math.min(W0, H0) * .32;
        AK.glow(ctx, cx, cy, rr * 1.6, col, .25);
        ctx.strokeStyle = AK.rgba(col, .5);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, rr * .78, 0, Math.PI * 2); ctx.stroke();
        // Een ruit met tekens op de windrichtingen
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) { const a = i * Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr * .78, cy + Math.sin(a) * rr * .78); }
        ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, rr * .3, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + Math.PI / 8;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * rr * .84, cy + Math.sin(a) * rr * .84);
          ctx.lineTo(cx + Math.cos(a) * rr * .94, cy + Math.sin(a) * rr * .94);
          ctx.stroke();
        }
      }
    });
    // Zachte schaduw van de muren op de vloer.
    for (let y = 1; y < d.H; y++) {
      for (let x = 0; x < d.W; x++) {
        if (g[y][x] !== 0 || g[y - 1][x] !== 1) continue;
        const gr = ctx.createLinearGradient(0, y * T, 0, y * T + 18);
        gr.addColorStop(0, 'rgba(0,0,0,.55)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(x * T, y * T, T, 18);
      }
    }
    // Muren: blokken steen met een lichtere bovenkant en een neonrand waar ze aan de vloer grenzen.
    const floorAt = (x, y) => x >= 0 && y >= 0 && x < d.W && y < d.H && g[y][x] === 0;
    for (let y = 0; y < d.H; y++) {
      for (let x = 0; x < d.W; x++) {
        if (g[y][x] !== 1) continue;
        const X = x * T, Y = y * T;
        const edge = floorAt(x, y + 1) || floorAt(x, y - 1) || floorAt(x + 1, y) || floorAt(x - 1, y);
        if (!edge) {
          ctx.fillStyle = '#05070d';
          ctx.fillRect(X, Y, T, T);
          continue;
        }
        const v = 40 + Math.floor(rnd() * 12);
        ctx.fillStyle = `rgb(${v - 8},${v - 2},${v + 14})`;
        ctx.fillRect(X, Y, T, T);
        // Stenen
        ctx.strokeStyle = 'rgba(0,0,0,.45)';
        ctx.lineWidth = 2;
        const off = (y % 2) * (T / 2);
        ctx.beginPath();
        ctx.moveTo(X, Y + T / 2);
        ctx.lineTo(X + T, Y + T / 2);
        for (const sx of [off, off + T / 2]) {
          const px = X + (sx % T);
          ctx.moveTo(px, Y);
          ctx.lineTo(px, Y + T / 2);
          ctx.moveTo(X + ((sx + T / 4) % T), Y + T / 2);
          ctx.lineTo(X + ((sx + T / 4) % T), Y + T);
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        ctx.fillRect(X, Y, T, 3);
        // Voorkant van de muur (naar de vloer eronder): donkerder, met een neonrand.
        if (floorAt(x, y + 1)) {
          const fg = ctx.createLinearGradient(0, Y + T * .55, 0, Y + T);
          fg.addColorStop(0, `rgb(${v - 18},${v - 14},${v})`);
          fg.addColorStop(1, `rgb(${v - 30},${v - 26},${v - 10})`);
          ctx.fillStyle = fg;
          ctx.fillRect(X, Y + T * .55, T, T * .45);
          ctx.fillStyle = 'rgba(76,201,255,.25)';
          ctx.fillRect(X, Y + T - 5, T, 5);
          ctx.fillStyle = 'rgba(120,220,255,.9)';
          ctx.fillRect(X, Y + T - 2, T, 2);
          // Hier en daar een vaandel of een lichtend kristal in de muur
          const deco = rnd();
          if (deco < .09 && !d.torches.some(([tx, ty]) => tx === x && ty === y)) {
            const col = ['#b3122e', '#1d4fa8', '#6a1b9a'][Math.floor(rnd() * 3)];
            ctx.fillStyle = '#ffc94a';
            ctx.fillRect(X + 8, Y + T * .5, T - 16, 3);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(X + 11, Y + T * .5 + 3); ctx.lineTo(X + T - 11, Y + T * .5 + 3); ctx.lineTo(X + T - 11, Y + T + 14); ctx.lineTo(X + T / 2, Y + T + 8); ctx.lineTo(X + 11, Y + T + 14);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffc94a';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#ffc94a';
            ctx.beginPath();
            ctx.moveTo(X + T / 2, Y + T * .62); ctx.lineTo(X + T / 2 + 6, Y + T * .78); ctx.lineTo(X + T / 2, Y + T * .95); ctx.lineTo(X + T / 2 - 6, Y + T * .78);
            ctx.closePath();
            ctx.fill();
          } else if (deco < .14) {
            AK.glow(ctx, X + T / 2, Y + T * .72, 26, '#c77dff', .8);
            ctx.fillStyle = '#e3c2ff';
            ctx.beginPath();
            ctx.moveTo(X + T / 2, Y + T * .58); ctx.lineTo(X + T / 2 + 5, Y + T * .74); ctx.lineTo(X + T / 2, Y + T * .88); ctx.lineTo(X + T / 2 - 5, Y + T * .74);
            ctx.closePath();
            ctx.fill();
          }
        }
        ctx.fillStyle = 'rgba(76,201,255,.18)';
        if (floorAt(x + 1, y)) ctx.fillRect(X + T - 2, Y, 2, T);
        if (floorAt(x - 1, y)) ctx.fillRect(X, Y, 2, T);
        if (floorAt(x, y - 1)) ctx.fillRect(X, Y, T, 2);
      }
    }
    // Pilaren
    for (const [x, y] of d.pillars) {
      const cx = (x + .5) * T, cy = (y + .5) * T;
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath();
      ctx.ellipse(cx + 4, cy + 8, T * .48, T * .3, 0, 0, Math.PI * 2);
      ctx.fill();
      const pg = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, T * .5);
      pg.addColorStop(0, '#6c7a92');
      pg.addColorStop(1, '#1b2232');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(cx, cy, T * .44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,201,74,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, T * .3, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Fakkelhouders
    for (const [x, y] of d.torches) {
      ctx.fillStyle = '#3b2a1a';
      ctx.fillRect(x * T + T / 2 - 3, y * T + T * .55, 6, T * .4);
      ctx.fillStyle = '#7a5a2a';
      ctx.fillRect(x * T + T / 2 - 6, y * T + T * .55, 12, 5);
    }
    // Startcirkel
    ctx.strokeStyle = 'rgba(76,201,255,.35)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.arc(d.start.x, d.start.y, T * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    return { canvas: c, q };
  }

  // Op het bord spelen alle ploegen dezelfde kerkers: één keer tekenen is genoeg.
  const baked = new Map();
  function bakeOnce(d) {
    const key = `${d.seed}:${d.level}`;
    if (!baked.has(key)) {
      baked.set(key, bake(d));
      if (baked.size > 3) baked.delete(baked.keys().next().value);
    }
    return baked.get(key);
  }

  // ---------- Toestand van een ploeg (bord en leerling) ----------
  class Scene {
    constructor() {
      this.d = null;
      this.baked = null;
      this.knights = new AK.Interp(100);
      this.monsters = new AK.Interp(100);
      this.kinds = new Map();
      this.shots = new Map();
      this.local = new Map(); // eigen schoten die al vliegen voor de server ze bevestigt (seq -> schot)
      this.taken = new Set();
      this.poorten = [];
      this.turrets = [];
      this.swings = new Map();
      this.hurtAt = new Map();
      this.fx = new AK.Particles();
      this.info = { lv: 1, g: 0, sh: 0, ex: 0, nx: 0, wp: 0 };
      this.shake = 0;
      this.flash = 0;
      this.onEvent = null;
      this.meN = -1;
      this.mini = false;
    }

    level(msg) {
      const d = GtWorld.makeDungeon(msg.seed, msg.level);
      this.d = d;
      this.baked = this.mini ? null : bakeOnce(d);
      this.taken = new Set(msg.taken || []);
      this.poorten = msg.poorten || d.poorten.map(() => 100);
      this.shots.clear();
      this.local.clear();
      this.monsters.clear();
      this.kinds.clear();
      this.turrets = [];
    }

    apply(msg) {
      const t = performance.now();
      for (const k of msg.k) this.knights.push(k[0], [k[1], k[2], k[3], k[4], k[5]], t);
      for (const m of msg.m) {
        this.monsters.push(m[0], [m[2], m[3], m[5], m[4]], t);
        this.kinds.set(m[0], m[1]);
      }
      this.monsters.prune(t, 300);
      for (const id of this.kinds.keys()) if (!this.monsters.snaps.has(id)) this.kinds.delete(id);
      this.poorten = msg.p;
      this.turrets = msg.tu.map(x => ({ x: x[0], y: x[1], end: t + x[2] }));
      this.info = { lv: msg.lv, g: msg.g, sh: msg.sh, ex: msg.ex, nx: msg.nx, wp: msg.wp, at: t };
      for (const e of msg.ev) this.event(e, t);
    }

    event(e, t) {
      const fx = this.fx;
      switch (e[0]) {
        case 'shot': {
          const [, id, kind, x, y, vx, vy, life, owner, seq] = e;
          if (owner === this.meN && seq && this.local.has(seq)) {
            // Ons eigen schot vliegt al: alleen de id koppelen.
            const s = this.local.get(seq);
            this.local.delete(seq);
            this.shots.set(id, s);
            break;
          }
          this.shots.set(id, { kind, x, y, vx, vy, life });
          break;
        }
        case 'weg': {
          const s = this.shots.get(e[1]);
          this.shots.delete(e[1]);
          const color = SHOT_COLORS[s ? s.kind : 'vijand'];
          fx.sparks(e[2], e[3], { n: e[4] ? 9 : 4, color, speed: 300, life: .25 });
          if (e[4]) fx.ring(e[2], e[3], 22, color, .25);
          break;
        }
        case 'slag': this.swings.set(e[1], { t, a: e[2] }); break;
        case 'boem': {
          const color = e[3] === 'kolos' ? '#ff6bd6' : e[3] === 'vonk' ? '#ffb703' : '#ff4d6d';
          fx.burst(e[1], e[2], { n: e[3] === 'kolos' ? 40 : 20, color, speed: 260, life: .7, size: 4 });
          fx.sparks(e[1], e[2], { n: 12, color: '#ffffff', speed: 380, life: .3 });
          fx.smoke(e[1], e[2], { n: e[3] === 'kolos' ? 10 : 4, size: e[3] === 'kolos' ? 26 : 14 });
          fx.shock(e[1], e[2], e[3] === 'kolos' ? 80 : 44, color, .45);
          if (e[3] === 'kolos') this.shake = Math.max(this.shake, 10);
          break;
        }
        case 'poort':
          fx.burst(e[2], e[3], { n: 60, color: '#ff4d6d', speed: 340, life: 1, size: 5 });
          fx.smoke(e[2], e[3], { n: 12, size: 28, life: 1.3, speed: 100 });
          fx.shock(e[2], e[3], 120, '#ffc94a', .7);
          fx.sparks(e[2], e[3], { n: 26, color: '#ffe08a', speed: 620, life: .5, width: 2.5 });
          fx.pop(e[2], e[3] - 40, 'POORT KAPOT!', '#ffc94a', 26, 1.4);
          this.shake = Math.max(this.shake, 14);
          break;
        case 'nova': fx.ring(e[1], e[2], 250, '#d59cff', .6); fx.ring(e[1], e[2], 180, '#ffffff', .4); fx.burst(e[1], e[2], { n: 70, color: '#c77dff', speed: 520, life: .7, size: 4 }); this.shake = Math.max(this.shake, 12); break;
        case 'pak': this.taken.add(e[1]); if (this.d) { const it = this.d.items[e[1]]; fx.burst(it.x, it.y, { n: 14, color: it.kind === 'cel' ? '#4ade80' : '#ffc94a', speed: 140, life: .6, up: 60 }); fx.text(it.x, it.y - 10, it.kind === 'cel' ? '+45 ❤' : it.kind === 'kist' ? '+25' : '+8', it.kind === 'cel' ? '#4ade80' : '#ffc94a'); } break;
        case 'heal': {
          // Een groene golf over de hele ploeg.
          for (const id of this.knights.ids()) {
            const k = this.knights.get(id, t);
            if (k && !(k[4] & 1)) { fx.burst(k[0], k[1], { n: 10, color: '#4ade80', speed: 90, life: .8, up: 80, size: 3 }); fx.text(k[0], k[1] - 26, `+${e[2]}`, '#4ade80'); }
          }
          break;
        }
        case 'au': this.hurtAt.set(e[1], t); { const k = this.knights.get(e[1], t); if (k) fx.sparks(k[0], k[1], { n: 7, color: '#ff8fa3', speed: 280 }); } if (e[1] === this.meN) { this.flash = 1; this.shake = Math.max(this.shake, 5); } break;
        case 'val': { const k = this.knights.get(e[1], t); if (k) { fx.burst(k[0], k[1], { n: 30, color: '#9fb3c8', speed: 200, life: .8 }); fx.ring(k[0], k[1], 50, '#ff4d6d'); } break; }
        case 'terug': { const k = this.knights.get(e[1], t); if (k) { fx.ring(k[0], k[1], 60, '#ffc94a', .7); fx.burst(k[0], k[1], { n: 30, color: '#ffc94a', speed: 160, life: .9, up: 60 }); } break; }
        case 'toren': fx.ring(e[1], e[2], 50, '#4cc9ff'); break;
        case 'schild': { for (const id of this.knights.ids()) { const k = this.knights.get(id, t); if (k) fx.ring(k[0], k[1], 40, '#ffc94a', .6); } break; }
        case 'regen': break;
        default: break;
      }
      if (this.onEvent) this.onEvent(e);
    }

    update(dt) {
      for (const [id, s] of this.shots) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= -.2 || (this.d && GtWorld.solid(this.d, Math.floor(s.x / T), Math.floor(s.y / T)))) this.shots.delete(id);
      }
      for (const [seq, s] of this.local) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0 || (this.d && GtWorld.solid(this.d, Math.floor(s.x / T), Math.floor(s.y / T)))) this.local.delete(seq);
      }
      this.fx.update(dt);
      this.shake = Math.max(0, this.shake - dt * 30);
      this.flash = Math.max(0, this.flash - dt * 3);
    }
  }

  // ---------- Monsters en poorten ----------
  function monster(ctx, kind, x, y, a, hp, t) {
    const k = MONSTERS[kind];
    const r = k.r;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath();
    ctx.ellipse(2, r * .6, r, r * .5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(a);
    if (kind === 'bot') {
      // Skeletbot: botwitte schedel met rode ogen en ribben.
      ctx.fillStyle = '#d8d2c0';
      ctx.beginPath();
      ctx.ellipse(-2, 0, r * .8, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6b6455';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * .6, i * r * .4); ctx.lineTo(r * .1, i * r * .4); ctx.stroke(); }
      ctx.fillStyle = '#efe9d8';
      ctx.beginPath();
      ctx.arc(r * .35, 0, r * .55, 0, Math.PI * 2);
      ctx.fill();
      // Klauwen
      const sw = Math.sin(t * 10) * 3;
      ctx.strokeStyle = '#d8d2c0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r * .8); ctx.lineTo(r * .9, -r * .9 + sw);
      ctx.moveTo(0, r * .8); ctx.lineTo(r * .9, r * .9 - sw);
      ctx.stroke();
      AK.glow(ctx, r * .6, -r * .21, r * .6, '#ff2040', .9);
      AK.glow(ctx, r * .6, r * .21, r * .6, '#ff2040', .9);
      ctx.fillStyle = '#ff6b80';
      ctx.fillRect(r * .5, -r * .3, r * .22, r * .18);
      ctx.fillRect(r * .5, r * .12, r * .22, r * .18);
    } else if (kind === 'vonk') {
      // Vonkdrone: draaiende rotor en een oranje kern.
      ctx.rotate(t * 14);
      ctx.strokeStyle = 'rgba(255,183,3,.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#3a2a10';
      for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillRect(0, -2, r * 1.1, 4); }
      AK.glow(ctx, 0, 0, r * 1.8, '#ffb703', .8);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, r * .5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'kanon') {
      // Kanonnier: gepantserd, met een loop.
      ctx.fillStyle = '#2b2f3e';
      AK.roundRect(ctx, -r, -r, r * 1.8, r * 2, 6);
      ctx.fill();
      ctx.strokeStyle = '#ff4d6d';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#596079';
      ctx.fillRect(r * .2, -r * .25, r * 1.3, r * .5);
      AK.glow(ctx, -r * .1, 0, r * 1.1, '#ff2040', .8);
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(-r * .1, 0, r * .35, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'kolos') {
      // Kolos: een stenen reus met een gloeiende kern.
      const pulse = .75 + Math.sin(t * 5) * .25;
      ctx.fillStyle = '#3d2d4a';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2, rr = r * (i % 2 ? .85 : 1.05);
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ff6bd6';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#5a456b';
      ctx.beginPath(); ctx.arc(r * .2, -r * 1, r * .45, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * .2, r * 1, r * .45, 0, Math.PI * 2); ctx.fill();
      AK.glow(ctx, 0, 0, r * 2.2 * pulse, '#ff6bd6', .6);
      ctx.fillStyle = `rgba(255,140,230,${pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, r * .38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(r * .55, -r * .25, r * .2, r * .14);
      ctx.fillRect(r * .55, r * .11, r * .2, r * .14);
    }
    ctx.restore();
    if (hp < 100) AK.bar(ctx, x, y - r - 9, r * 1.8, hp / 100, '#ff4d6d');
  }

  function poort(ctx, x, y, hp, t) {
    if (hp <= 0) {
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.beginPath();
      ctx.arc(x, y, POORT.r * .9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a3f52';
      ctx.lineWidth = 4;
      ctx.stroke();
      return;
    }
    AK.glow(ctx, x, y, POORT.r * 3, '#ff2d55', .55 + Math.sin(t * 4) * .15);
    ctx.save();
    ctx.translate(x, y);
    const r = POORT.r;
    ctx.fillStyle = '#20263a';
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(t * 1.6);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(.25, '#ff4d6d');
    g.addColorStop(1, '#3a0012');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,210,.7)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.arc(r * .3, 0, r * .55, -1, 1.2);
      ctx.stroke();
    }
    ctx.rotate(-t * 3.2);
    ctx.strokeStyle = '#ffc94a';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(r + 2, 0);
      ctx.lineTo(r + 8, 0);
      ctx.stroke();
    }
    ctx.restore();
    if (hp < 100) AK.bar(ctx, x, y - r - 16, r * 2.4, hp / 100, '#ffc94a');
  }

  function exitPortal(ctx, x, y, t, k) {
    AK.glow(ctx, x, y, T * 3.2, '#ffc94a', .35);
    // Lichtdeeltjes die naar het midden worden gezogen
    for (let i = 0; i < 14; i++) {
      const age = (t * .6 + i / 14) % 1;
      const a = i * 2.4 + t * .8, d = T * 2.2 * (1 - age);
      AK.glow(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d, 6 + age * 4, i % 2 ? '#ffe9a8' : '#8fe3ff', age);
    }
    ctx.save();
    ctx.translate(x, y);
    const r = T * 1.15;
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, r * 1.6);
    g.addColorStop(0, 'rgba(255,240,180,.9)');
    g.addColorStop(.4, 'rgba(255,201,74,.45)');
    g.addColorStop(1, 'rgba(255,201,74,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i === 1 ? '#4cc9ff' : '#ffc94a';
      ctx.beginPath();
      ctx.arc(0, 0, r * (.5 + i * .22), t * (1 + i * .6) * (i % 2 ? -1 : 1), t * (1 + i * .6) * (i % 2 ? -1 : 1) + 4.2);
      ctx.stroke();
    }
    if (k > 0) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function item(ctx, it, t) {
    const bob = Math.sin(t * 3 + it.x) * 3;
    ctx.save();
    ctx.translate(it.x, it.y + bob);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(0, 12 - bob, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    if (it.kind === 'cel') {
      AK.glow(ctx, 0, 0, 30, '#4ade80', .7);
      ctx.fillStyle = '#123a22';
      AK.roundRect(ctx, -8, -12, 16, 22, 4);
      ctx.fill();
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-5, -8, 10, 14);
      ctx.fillStyle = '#eafff1';
      ctx.fillRect(-1.5, -6, 3, 10);
      ctx.fillRect(-5, -2.5, 10, 3);
    } else if (it.kind === 'kist') {
      ctx.fillStyle = '#6b3f1d';
      ctx.fillRect(-13, -9, 26, 18);
      ctx.fillStyle = '#ffc94a';
      ctx.fillRect(-13, -2, 26, 3);
      ctx.fillRect(-2, -9, 4, 18);
      AK.glow(ctx, 0, -2, 22, '#ffc94a', .7);
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(-2, -3, 4, 5);
    } else {
      AK.glow(ctx, 0, 0, 24, '#ffc94a', .7);
      ctx.fillStyle = '#ffc94a';
      for (const [dx, dy] of [[-5, 2], [5, 2], [0, -4]]) {
        ctx.beginPath();
        ctx.ellipse(dx, dy, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3b0';
      ctx.fillRect(-1, -6, 2, 2);
      // Twinkeling
      const tw = Math.max(0, Math.sin(t * 4 + it.y));
      if (tw > .8) { ctx.fillStyle = `rgba(255,255,255,${(tw - .8) * 5})`; ctx.fillRect(-1, -12, 2, 10); ctx.fillRect(-5, -8, 10, 2); }
    }
    ctx.restore();
  }

  function turret(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#1d2633';
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4cc9ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.rotate(t * 4);
    ctx.fillStyle = '#9fb3c8';
    ctx.fillRect(0, -4, 22, 8);
    AK.glow(ctx, 0, 0, 22, '#4cc9ff', .8);
    ctx.fillStyle = '#4cc9ff';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Een beeld tekenen ----------
  // cam: { x, y, zoom, w, h } in pixels; opts: { names, light (0..1 donker), local: {n, x, y, a, swing} }
  let darkCanvas = null;
  function render(ctx, s, cam, opts = {}) {
    const { w, h } = cam;
    const t = performance.now() / 1000;
    const now = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#03050b';
    ctx.fillRect(0, 0, w, h);
    if (!s.d) return;
    const d = s.d;
    const z = cam.zoom;
    const sx = s.shake ? (Math.random() - .5) * s.shake : 0, sy = s.shake ? (Math.random() - .5) * s.shake : 0;
    const ox = w / 2 - cam.x * z + sx, oy = h / 2 - cam.y * z + sy;
    ctx.setTransform(z, 0, 0, z, ox, oy);
    // Zichtbaar stuk van de wereld
    const vx0 = -ox / z, vy0 = -oy / z, vx1 = vx0 + w / z, vy1 = vy0 + h / z;
    const vis = (x, y, m = 60) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
    if (s.baked) {
      const q = s.baked.q;
      const ax = Math.max(0, vx0), ay = Math.max(0, vy0);
      const bx = Math.min(d.W * T, vx1), by = Math.min(d.H * T, vy1);
      if (bx > ax && by > ay) ctx.drawImage(s.baked.canvas, ax * q, ay * q, (bx - ax) * q, (by - ay) * q, ax, ay, bx - ax, by - ay);
    } else {
      // Klein overzicht op het bord: alleen vloer en muren.
      const g = GtWorld.grid(d);
      ctx.fillStyle = '#1c2436';
      for (let y = 0; y < d.H; y++) for (let x = 0; x < d.W; x++) if (g[y][x] === 0) ctx.fillRect(x * T, y * T, T + .5, T + .5);
    }
    exitPortal(ctx, d.exit.x, d.exit.y, t, Math.min(1, s.info.ex / 1200));
    d.items.forEach((it, i) => { if (!s.taken.has(i) && vis(it.x, it.y)) item(ctx, it, t); });
    d.poorten.forEach((q, i) => { if (vis(q.x, q.y)) poort(ctx, q.x, q.y, s.poorten[i] === undefined ? 100 : s.poorten[i], t); });
    for (const tu of s.turrets) turret(ctx, tu.x, tu.y, t);
    // Monsters
    for (const id of s.monsters.ids()) {
      const m = s.monsters.get(id, now);
      if (m && vis(m[0], m[1])) monster(ctx, s.kinds.get(id) || 'bot', m[0], m[1], m[2], m[3], t + id);
    }
    // Ridders
    const roster = opts.roster || new Map();
    const shield = s.info.sh > 0 && now - (s.info.at || 0) < s.info.sh;
    for (const id of s.knights.ids()) {
      let k = s.knights.get(id, now);
      if (!k) continue;
      const me = opts.local && opts.local.n === id;
      if (me) k = [opts.local.x, opts.local.y, opts.local.a, k[3], k[4]];
      if (!vis(k[0], k[1])) continue;
      const info = roster.get(id) || {};
      const cls = info.cls || 'paladijn';
      const down = k[4] & 1, asking = k[4] & 2;
      const sw = s.swings.get(id);
      const swing = sw && now - sw.t < 220 ? (now - sw.t) / 220 : 0;
      const hurt = now - (s.hurtAt.get(id) || 0) < 150;
      if (down) {
        // Geveld: een grafsteen-geest die zacht zweeft.
        ctx.save();
        ctx.globalAlpha = .55 + Math.sin(t * 3) * .15;
        AK.knight(ctx, k[0], k[1] - 6 + Math.sin(t * 2) * 3, -Math.PI / 2, { color: '#7a8aa6', kind: cls, t, visor: '#ff4d6d' });
        ctx.restore();
        if (opts.names !== false) AK.label(ctx, `${info.name || ''} 💀`, k[0], k[1] - 30, '#ff8fa3');
        continue;
      }
      if (sw && swing) {
        // De slag van het zwaard: een lichtende boog.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,230,150,${1 - swing})`;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(k[0], k[1], 58, sw.a - 1.1, sw.a - 1.1 + 2.2 * Math.min(1, swing * 1.6));
        ctx.stroke();
        ctx.restore();
      }
      const c = CLASSES[cls];
      AK.knight(ctx, k[0], k[1], k[2], {
        r: R, color: c.color, kind: cls, t, moving: true, swing,
        glow: shield ? 'rgba(255,201,74,.55)' : asking ? 'rgba(76,201,255,.45)' : hurt ? 'rgba(255,77,109,.6)' : null,
        hp: k[3], name: opts.names === false ? null : (asking ? `${info.name || ''} ⚡` : info.name), me,
      });
    }
    // Schoten
    for (const sh of [...s.shots.values(), ...s.local.values()]) {
      if (vis(sh.x, sh.y)) AK.bolt(ctx, sh.x, sh.y, sh.vx, sh.vy, SHOT_COLORS[sh.kind] || '#fff', sh.kind === 'bol' ? 9 : sh.kind === 'vijand' ? 7 : 5, sh.kind === 'pijl' ? .06 : .035);
    }
    s.fx.draw(ctx);
    // Fakkelvlammen
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y] of d.torches) {
      const fx = (x + .5) * T, fy = y * T + T * .5;
      if (!vis(fx, fy)) continue;
      const fl = Math.sin(t * 13 + x * 3) * 2;
      ctx.fillStyle = 'rgba(255,90,20,.7)';
      ctx.beginPath();
      ctx.ellipse(fx, fy - 4, 7, 13 + fl, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,170,60,.9)';
      ctx.beginPath();
      ctx.ellipse(fx, fy - 2, 5, 9 + fl, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,245,200,.95)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 2.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        const age = (t * .9 + k / 3 + x * .17) % 1;
        AK.glow(ctx, fx + Math.sin(age * 8 + k + x) * 6, fy - 8 - age * 34, 4 * (1 - age) + 1, '#ffb347', 1 - age);
      }
    }
    ctx.restore();
    // Het donker van de kerker, met licht rond ridders, fakkels, schoten, poorten en de uitgang.
    const dark = opts.light === undefined ? .78 : opts.light;
    if (dark > 0) {
      const ds = .5;
      if (!darkCanvas) darkCanvas = document.createElement('canvas');
      const dw = Math.ceil(w * ds), dh = Math.ceil(h * ds);
      if (darkCanvas.width !== dw || darkCanvas.height !== dh) { darkCanvas.width = dw; darkCanvas.height = dh; }
      const dc = darkCanvas.getContext('2d');
      dc.setTransform(1, 0, 0, 1, 0, 0);
      dc.globalCompositeOperation = 'source-over';
      dc.clearRect(0, 0, dw, dh);
      dc.fillStyle = `rgba(2,3,10,${dark})`;
      dc.fillRect(0, 0, dw, dh);
      dc.globalCompositeOperation = 'destination-out';
      dc.setTransform(z * ds, 0, 0, z * ds, ox * ds, oy * ds);
      const light = (x, y, r, a = 1) => {
        if (!vis(x, y, r)) return;
        const g = dc.createRadialGradient(x, y, r * .15, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        dc.fillStyle = g;
        dc.beginPath();
        dc.arc(x, y, r, 0, Math.PI * 2);
        dc.fill();
      };
      for (const id of s.knights.ids()) {
        const k = opts.local && opts.local.n === id ? [opts.local.x, opts.local.y] : s.knights.get(id, now);
        if (k) light(k[0], k[1], id === s.meN ? 330 : 260);
      }
      for (const [x, y] of d.torches) light((x + .5) * T, y * T + T * .6, 150 + Math.sin(t * 9 + x) * 8, .85);
      light(d.exit.x, d.exit.y, 220, .9);
      d.poorten.forEach((q, i) => { if ((s.poorten[i] ?? 100) > 0) light(q.x, q.y, 120, .7); });
      for (const sh of s.shots.values()) light(sh.x, sh.y, 70, .6);
      for (const sh of s.local.values()) light(sh.x, sh.y, 70, .6);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(darkCanvas, 0, 0, w, h);
      // Warm licht van de fakkels, rood van de poorten en goud van de uitgang, bovenop het donker.
      ctx.setTransform(z, 0, 0, z, ox, oy);
      for (const [x, y] of d.torches) { const fx = (x + .5) * T, fy = y * T + T * .6; if (vis(fx, fy, 140)) AK.glow(ctx, fx, fy, 130 + Math.sin(t * 9 + x) * 8, '#ff8a2a', .16); }
      if (vis(d.exit.x, d.exit.y, 200)) AK.glow(ctx, d.exit.x, d.exit.y, 200, '#ffc94a', .14);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    AK.vignette(ctx, w, h, opts.names === false ? .35 : .5);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (s.flash > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7);
      g.addColorStop(0, 'rgba(255,0,40,0)');
      g.addColorStop(1, `rgba(255,0,40,${s.flash * .45})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Een klein kaartje van de kerker met de ploeg erop (rechtsboven op de gsm, en op het bord).
  function minimap(ctx, s, x, y, w, h, meN = -1) {
    if (!s.d) return;
    const d = s.d;
    const k = Math.min(w / d.W, h / d.H);
    const g = GtWorld.grid(d);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(3,6,13,.75)';
    ctx.fillRect(x - 4, y - 4, d.W * k + 8, d.H * k + 8);
    ctx.fillStyle = 'rgba(120,150,200,.35)';
    for (let ty = 0; ty < d.H; ty++) for (let tx = 0; tx < d.W; tx++) if (g[ty][tx] === 0) ctx.fillRect(x + tx * k, y + ty * k, k + .3, k + .3);
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath();
    ctx.arc(x + (d.exit.x / T) * k, y + (d.exit.y / T) * k, Math.max(3, k * 1.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4d6d';
    d.poorten.forEach((q, i) => { if ((s.poorten[i] ?? 100) > 0) ctx.fillRect(x + (q.x / T) * k - 2, y + (q.y / T) * k - 2, 4, 4); });
    const now = performance.now();
    for (const id of s.knights.ids()) {
      const kn = s.knights.get(id, now);
      if (!kn) continue;
      ctx.fillStyle = id === meN ? '#ffffff' : (kn[4] & 1 ? '#7a8aa6' : '#4cc9ff');
      ctx.beginPath();
      ctx.arc(x + (kn[0] / T) * k, y + (kn[1] / T) * k, id === meN ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return { Scene, render, minimap, bake, SHOT_COLORS };
})();
