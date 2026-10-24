// Ridder-Royale tekenen, voor het bord en de leerling: de arena (één keer vooraf getekend), de neonstorm,
// ridders, schoten, kratten en buit, vonken en struiken. Gebruikt RyWorld en AK (arena-kit.js).
const RyDraw = (() => {
  const { R } = RyWorld;

  // ---------- De arena vooraf tekenen ----------
  function bake(ar) {
    const S = ar.size + 80;
    const q = Math.min(1, 3000 / (S * 2));
    const c = document.createElement('canvas');
    c.width = Math.ceil(S * 2 * q);
    c.height = Math.ceil(S * 2 * q);
    const ctx = c.getContext('2d');
    ctx.scale(q, q);
    ctx.translate(S, S);
    const rnd = RyWorld.rng(ar.seed + 5);
    // Grond: donker nachtgras met vlekken, stenen paden naar het midden en lichtende runen.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, ar.size, 0, Math.PI * 2);
    ctx.clip();
    const bg = ctx.createRadialGradient(0, 0, 50, 0, 0, ar.size);
    bg.addColorStop(0, '#1b2b2a');
    bg.addColorStop(1, '#0d1719');
    ctx.fillStyle = bg;
    ctx.fillRect(-S, -S, S * 2, S * 2);
    for (let i = 0; i < ar.size * 1.2; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * ar.size;
      ctx.fillStyle = rnd() < .5 ? 'rgba(60,110,80,.12)' : 'rgba(0,0,0,.14)';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, 10 + rnd() * 40, 6 + rnd() * 20, rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Grassprieten
    ctx.strokeStyle = 'rgba(110,180,130,.16)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < ar.size * 3; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * ar.size;
      const x = Math.cos(a) * d, y = Math.sin(a) * d;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - .5) * 6, y - 5 - rnd() * 6);
      ctx.stroke();
    }
    // Paden: vier stenen wegen naar de burcht
    for (let k = 0; k < 4; k++) {
      const a0 = (k / 4) * Math.PI * 2 + .4;
      for (let d = 190; d < ar.size - 40; d += 34) {
        const a = a0 + Math.sin(d / 180) * .12;
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        const v = 52 + Math.floor(rnd() * 16);
        ctx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
        ctx.beginPath();
        ctx.ellipse(x + (rnd() - .5) * 10, y + (rnd() - .5) * 10, 16 + rnd() * 6, 11 + rnd() * 4, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    // Runencirkels
    ctx.strokeStyle = 'rgba(76,201,255,.18)';
    ctx.lineWidth = 3;
    for (const r of [ar.size * .35, ar.size * .7]) {
      ctx.setLineDash([24, 18]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Burchtplein
    ctx.fillStyle = 'rgba(70,74,90,.55)';
    ctx.fillRect(-150, -150, 300, 300);
    ctx.strokeStyle = 'rgba(255,201,74,.25)';
    ctx.lineWidth = 2;
    for (let i = -150; i <= 150; i += 50) {
      ctx.beginPath(); ctx.moveTo(i, -150); ctx.lineTo(i, 150); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-150, i); ctx.lineTo(150, i); ctx.stroke();
    }
    ctx.restore();
    // Rand van de arena: een stenen muur met een neonband.
    ctx.lineWidth = 26;
    ctx.strokeStyle = '#2a3142';
    ctx.beginPath();
    ctx.arc(0, 0, ar.size + 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4cc9ff';
    ctx.shadowColor = '#4cc9ff';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, ar.size + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Schaduwen van muren en rotsen
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    for (const w of ar.walls) ctx.fillRect(w.x + 8, w.y + 10, w.w, w.h);
    for (const o of ar.rocks) { ctx.beginPath(); ctx.ellipse(o.x + 8, o.y + 10, o.r, o.r * .8, 0, 0, Math.PI * 2); ctx.fill(); }
    // Muren: blokken steen met een gouden of cyaan neonrand
    for (const w of ar.walls) {
      const g = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      g.addColorStop(0, '#5f6a80');
      g.addColorStop(1, '#343b4c');
      ctx.fillStyle = g;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 2;
      const horiz = w.w > w.h;
      const len = horiz ? w.w : w.h;
      for (let s = 26; s < len; s += 26) {
        ctx.beginPath();
        if (horiz) { ctx.moveTo(w.x + s, w.y); ctx.lineTo(w.x + s, w.y + w.h); } else { ctx.moveTo(w.x, w.y + s); ctx.lineTo(w.x + w.w, w.y + s); }
        ctx.stroke();
      }
      ctx.strokeStyle = rnd() < .5 ? 'rgba(255,201,74,.7)' : 'rgba(76,201,255,.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      // Kantelen
      ctx.fillStyle = '#727e96';
      for (let s = 4; s < len - 8; s += 20) {
        if (horiz) ctx.fillRect(w.x + s, w.y + 3, 10, 7); else ctx.fillRect(w.x + 3, w.y + s, 7, 10);
      }
    }
    for (const o of ar.rocks) {
      if (o.kind === 'zuil') {
        const g = ctx.createRadialGradient(o.x - o.r * .3, o.y - o.r * .3, 2, o.x, o.y, o.r);
        g.addColorStop(0, '#9aa6bd');
        g.addColorStop(1, '#2c3344');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c77dff';
        ctx.shadowColor = '#c77dff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * .55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#3e4553';
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2, rr = o.r * (.82 + rnd() * .22);
          ctx[i ? 'lineTo' : 'moveTo'](o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.beginPath();
        ctx.ellipse(o.x - o.r * .25, o.y - o.r * .3, o.r * .45, o.r * .28, -.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(80,140,90,.35)';
        ctx.beginPath();
        ctx.ellipse(o.x + o.r * .2, o.y + o.r * .35, o.r * .35, o.r * .18, .3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return { canvas: c, q, S };
  }

  // Struiken komen bovenop de ridders: daarom apart, met lichtende blaadjes.
  function bakeBushes(ar) {
    return ar.bushes.map(b => {
      const s = Math.ceil(b.r * 2 + 16);
      const c = document.createElement('canvas');
      c.width = c.height = s;
      const ctx = c.getContext('2d');
      const rnd = RyWorld.rng(Math.round(b.x * 7 + b.y));
      ctx.translate(s / 2, s / 2);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * b.r * .55, r = b.r * (.35 + rnd() * .3);
        const g = ctx.createRadialGradient(Math.cos(a) * d - r * .3, Math.sin(a) * d - r * .3, 1, Math.cos(a) * d, Math.sin(a) * d, r);
        g.addColorStop(0, '#2f7a4c');
        g.addColorStop(1, '#0f3322');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(120,255,180,.55)';
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2, d = rnd() * b.r * .8;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return { canvas: c, s };
    });
  }

  // ---------- Toestand ----------
  class Scene {
    constructor() {
      this.ar = null;
      this.baked = null;
      this.bushes = [];
      this.knights = new AK.Interp(100);
      this.shots = new Map();
      this.local = new Map();
      this.taken = new Set();
      this.loot = new Map(); // buit van uitgeschakelde ridders: id -> {x, y}
      this.fx = new AK.Particles();
      this.roundStart = 0;
      this.state = 'pauze';
      this.breakEnd = 0;
      this.alive = 0;
      this.shotAt = new Map();
      this.hurtAt = new Map();
      this.shake = 0;
      this.flash = 0;
      this.meN = -1;
      this.onEvent = null;
    }

    round(msg) {
      this.ar = RyWorld.makeArena(msg.seed, msg.players);
      this.baked = bake(this.ar);
      this.bushes = bakeBushes(this.ar);
      this.taken = new Set(msg.taken || []);
      this.loot = new Map((msg.loot || []).map(l => [l[0], { x: l[1], y: l[2] }]));
      this.shots.clear();
      this.local.clear();
      this.knights.clear();
      this.roundStart = performance.now() + (msg.at - msg.now);
      this.state = 'pauze';
      this.roundNo = msg.round;
    }

    zone(t = performance.now()) {
      if (!this.ar) return null;
      return RyWorld.zoneAt(this.ar, Math.max(0, (t - this.roundStart) / 1000));
    }

    apply(msg) {
      const t = performance.now();
      for (const k of msg.k) this.knights.push(k[0], [k[1], k[2], k[3], k[4], k[5]], t);
      this.knights.prune(t, 400);
      // Kleine afwijkingen van de klok bijsturen.
      if (msg.rs === 'pauze') this.roundStart = t + msg.ra;
      else if (msg.rs === 'strijd' && Math.abs(this.roundStart - (t + msg.ra)) > 250) this.roundStart = t + msg.ra;
      this.state = msg.rs;
      this.breakEnd = msg.br ? t + msg.br : 0;
      this.alive = msg.al;
      for (const e of msg.ev) this.event(e, t);
    }

    event(e, t) {
      const fx = this.fx;
      switch (e[0]) {
        case 'shot': {
          const [, id, x, y, vx, vy, life, owner, seq, big] = e;
          this.shotAt.set(owner, t);
          if (owner === this.meN && seq && this.local.has(seq)) {
            const s = this.local.get(seq);
            this.local.delete(seq);
            this.shots.set(id, s);
            break;
          }
          this.shots.set(id, { x, y, vx, vy, life, big, owner });
          break;
        }
        case 'weg': {
          const s = this.shots.get(e[1]);
          this.shots.delete(e[1]);
          fx.burst(e[2], e[3], { n: e[4] ? 12 : 5, color: s && s.big ? '#ffd166' : '#ff6b86', speed: 180, life: .35, size: 2.5 });
          break;
        }
        case 'au': {
          this.hurtAt.set(e[1], t);
          const k = this.knights.get(e[1], t);
          if (k) {
            fx.burst(k[0], k[1], { n: e[3] ? 3 : 8, color: e[3] ? '#c77dff' : '#ff4d6d', speed: 140, life: .35 });
            if (!e[3]) fx.text(k[0], k[1] - 28, `-${e[2]}`, '#ff8fa3');
          }
          if (e[1] === this.meN) { this.flash = e[3] ? .5 : 1; if (!e[3]) this.shake = Math.max(this.shake, 6); }
          break;
        }
        case 'uit':
          fx.burst(e[3], e[4], { n: 46, color: '#ffc94a', speed: 300, life: .9, size: 4 });
          fx.burst(e[3], e[4], { n: 20, color: '#ffffff', speed: 160, life: .4, size: 3 });
          fx.ring(e[3], e[4], 80, '#ff4d6d', .6);
          if (e[1] === this.meN || e[2] === this.meN) this.shake = Math.max(this.shake, 12);
          break;
        case 'buit': this.loot.set(e[1], { x: e[2], y: e[3] }); break;
        case 'pak': {
          this.taken.add(e[1]);
          const l = this.loot.get(e[1]) || (this.ar && this.ar.crates[e[1]]);
          this.loot.delete(e[1]);
          if (l) {
            fx.burst(l.x, l.y, { n: 16, color: e[3] === 'cel' ? '#4ade80' : '#ffd166', speed: 150, life: .6, up: 50 });
            fx.text(l.x, l.y - 12, e[3] === 'cel' ? '+30 ❤' : e[3] === 'buit' ? '+munitie' : '+4 ⚡', e[3] === 'cel' ? '#4ade80' : '#ffd166');
          }
          break;
        }
        case 'traag': { const k = this.knights.get(e[1], t); if (k) fx.ring(k[0], k[1], 34, '#4cc9ff', .6); break; }
        default: break;
      }
      if (this.onEvent) this.onEvent(e);
    }

    update(dt) {
      for (const [id, s] of this.shots) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= -.2 || (this.ar && RyWorld.solidAt(this.ar, s.x, s.y))) this.shots.delete(id);
      }
      for (const [seq, s] of this.local) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0 || (this.ar && RyWorld.solidAt(this.ar, s.x, s.y))) this.local.delete(seq);
      }
      this.fx.update(dt);
      this.shake = Math.max(0, this.shake - dt * 30);
      this.flash = Math.max(0, this.flash - dt * 2.5);
    }

    // Zie je deze ridder? Wie in een struik staat, is onzichtbaar tenzij je dichtbij bent of hij net schoot.
    visible(id, k, me, t) {
      if (!me || id === this.meN || !this.ar) return true;
      if (!RyWorld.inBush(this.ar, k[0], k[1])) return true;
      if (Math.hypot(k[0] - me.x, k[1] - me.y) < 140) return true;
      return t - (this.shotAt.get(id) || 0) < 900;
    }
  }

  function crate(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y + Math.sin(t * 2 + x) * 1.5);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(-14, 6, 30, 10);
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(-16, -14, 32, 28);
    ctx.strokeStyle = '#ffc94a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-16, -14, 32, 28);
    ctx.beginPath();
    ctx.moveTo(-16, -14); ctx.lineTo(16, 14);
    ctx.moveTo(16, -14); ctx.lineTo(-16, 14);
    ctx.stroke();
    ctx.shadowColor = '#4cc9ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#4cc9ff';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.restore();
  }

  function lootBag(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    const pulse = .7 + Math.sin(t * 6) * .3;
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 16 * pulse;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(0, -12); ctx.lineTo(10, 0); ctx.lineTo(0, 12); ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- Een beeld tekenen ----------
  // cam: { x, y, zoom, w, h }; opts: { roster, local: {n, x, y, a}, me (voor struiken), board }
  function render(ctx, s, cam, opts = {}) {
    const { w, h } = cam;
    const t = performance.now() / 1000;
    const now = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05040c';
    ctx.fillRect(0, 0, w, h);
    if (!s.ar) return;
    const ar = s.ar;
    const z = cam.zoom;
    const sx = s.shake ? (Math.random() - .5) * s.shake : 0, sy = s.shake ? (Math.random() - .5) * s.shake : 0;
    const ox = w / 2 - cam.x * z + sx, oy = h / 2 - cam.y * z + sy;
    ctx.setTransform(z, 0, 0, z, ox, oy);
    const vx0 = -ox / z, vy0 = -oy / z, vx1 = vx0 + w / z, vy1 = vy0 + h / z;
    const vis = (x, y, m = 80) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
    // Sterren buiten de arena
    ctx.fillStyle = 'rgba(200,220,255,.5)';
    const rs = RyWorld.rng(7);
    for (let i = 0; i < 160; i++) {
      const x = (rs() - .5) * ar.size * 3, y = (rs() - .5) * ar.size * 3;
      if (vis(x, y, 0) && Math.hypot(x, y) > ar.size + 40) ctx.fillRect(x, y, 2, 2);
    }
    const b = s.baked;
    const ax = Math.max(-b.S, vx0), ay = Math.max(-b.S, vy0), bx = Math.min(b.S, vx1), by = Math.min(b.S, vy1);
    if (bx > ax && by > ay) ctx.drawImage(b.canvas, (ax + b.S) * b.q, (ay + b.S) * b.q, (bx - ax) * b.q, (by - ay) * b.q, ax, ay, bx - ax, by - ay);
    // Kratten en buit
    ar.crates.forEach((c, i) => { if (!s.taken.has(i) && vis(c.x, c.y)) crate(ctx, c.x, c.y, t); });
    for (const l of s.loot.values()) if (vis(l.x, l.y)) lootBag(ctx, l.x, l.y, t);
    // Ridders
    const roster = opts.roster || new Map();
    const me = opts.local;
    const list = [];
    for (const id of s.knights.ids()) {
      let k = s.knights.get(id, now);
      if (!k) continue;
      if (me && me.n === id && !(k[4] & 1)) k = [me.x, me.y, me.a, k[3], k[4]];
      if (!vis(k[0], k[1])) continue;
      const shown = opts.board || s.visible(id, k, me, now);
      if (!shown) continue;
      list.push([id, k]);
    }
    const big = opts.board ? Math.max(1, .75 / z) : 1;
    for (const [id, k] of list) {
      if (k[4] & 1) continue;
      const info = roster.get(id) || {};
      const hurt = now - (s.hurtAt.get(id) || 0) < 140;
      const inBush = RyWorld.inBush(ar, k[0], k[1]);
      // Op het bord zie je de hele arena: dan tekenen we de ridders wat groter, zodat de klas ze herkent.
      ctx.save();
      ctx.translate(k[0], k[1]);
      ctx.scale(big, big);
      AK.knight(ctx, 0, 0, k[2], {
        r: R, color: info.color || '#4cc9ff', kind: 'royale', t, moving: true,
        glow: hurt ? 'rgba(255,77,109,.7)' : (k[4] & 2) ? 'rgba(76,201,255,.45)' : (k[4] & 4) ? 'rgba(120,200,255,.35)' : null,
        alpha: inBush ? .55 : 1,
      });
      ctx.restore();
      if (k[4] & 8) {
        // Schild
        ctx.save();
        ctx.strokeStyle = 'rgba(120,220,255,.75)';
        ctx.lineWidth = 2;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(k[0], k[1], R + 7, t * 2, t * 2 + 4.5);
        ctx.stroke();
        ctx.restore();
      }
      if (k[4] & 4) {
        // Traag: ijskristallen rond de ridder
        ctx.fillStyle = 'rgba(180,230,255,.85)';
        for (let i = 0; i < 4; i++) {
          const a = t * 1.5 + (i * Math.PI) / 2;
          ctx.fillRect(k[0] + Math.cos(a) * (R + 10) - 2, k[1] + Math.sin(a) * (R + 10) - 2, 4, 4);
        }
      }
    }
    // Schoten
    for (const sh of [...s.shots.values(), ...s.local.values()]) {
      if (vis(sh.x, sh.y)) AK.bolt(ctx, sh.x, sh.y, sh.vx, sh.vy, sh.big ? '#ffd166' : '#ff4d6d', sh.big ? 12 : 6, sh.big ? .08 : .04);
    }
    s.fx.draw(ctx);
    // Struiken bovenop
    ar.bushes.forEach((bu, i) => {
      if (!vis(bu.x, bu.y)) return;
      const img = s.bushes[i];
      const sway = Math.sin(t * 1.3 + i) * .03;
      ctx.save();
      ctx.translate(bu.x, bu.y);
      ctx.rotate(sway);
      ctx.globalAlpha = opts.board ? .8 : .95;
      ctx.drawImage(img.canvas, -img.s / 2, -img.s / 2);
      ctx.restore();
    });
    // Namen en levens bovenaan
    for (const [id, k] of list) {
      if (k[4] & 1) continue;
      const info = roster.get(id) || {};
      if (opts.names !== false) {
        AK.bar(ctx, k[0], k[1] - R * big - 12 * big, R * 2.4 * big, k[3] / 100);
        AK.label(ctx, (k[4] & 2) ? `${info.name || ''} ⚡` : info.name || '', k[0], k[1] - R * big - 18 * big, me && id === me.n ? '#ffc94a' : '#e8f1ff', Math.round(12 * big));
      }
    }
    // De neonstorm: alles buiten de cirkel paars en onrustig, met een lichtende rand.
    const zn = s.zone(now);
    if (zn) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(vx0 - 10, vy0 - 10, vx1 - vx0 + 20, vy1 - vy0 + 20);
      ctx.arc(zn.x, zn.y, Math.max(1, zn.r), 0, Math.PI * 2, true);
      ctx.fillStyle = 'rgba(90,20,140,.42)';
      ctx.fill('evenodd');
      ctx.clip('evenodd');
      ctx.strokeStyle = 'rgba(220,150,255,.18)';
      ctx.lineWidth = 3;
      const off = (t * 60) % 80;
      for (let x = Math.floor(vx0 / 80) * 80 - 400; x < vx1 + 400; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x + off, vy0 - 20);
        ctx.lineTo(x + off - 300, vy1 + 20);
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = '#e07bff';
      ctx.shadowColor = '#c77dff';
      ctx.shadowBlur = 20;
      ctx.lineWidth = 6 / Math.max(.4, z);
      ctx.beginPath();
      ctx.arc(zn.x, zn.y, Math.max(1, zn.r), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // De volgende cirkel, gestippeld
      const next = ar.zones[Math.min(ar.zones.length - 1, zn.phase + 1)];
      if (next && !zn.shrinking && zn.phase < ar.zones.length - 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.setLineDash([16, 12]);
        ctx.lineWidth = 3 / Math.max(.4, z);
        ctx.beginPath();
        ctx.arc(next.x, next.y, Math.max(1, next.r), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Rode rand bij schade
    if (s.flash > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .3, w / 2, h / 2, Math.max(w, h) * .7);
      g.addColorStop(0, 'rgba(255,0,40,0)');
      g.addColorStop(1, `rgba(255,0,40,${s.flash * .45})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Een kaartje van de arena met de storm en de ridders.
  function minimap(ctx, s, x, y, size, me = null) {
    if (!s.ar) return;
    const ar = s.ar;
    const k = size / (ar.size * 2);
    const cx = x + size / 2, cy = y + size / 2;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(3,6,13,.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,80,70,.8)';
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();
    const zn = s.zone();
    if (zn) {
      ctx.strokeStyle = '#e07bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + zn.x * k, cy + zn.y * k, Math.max(1, zn.r * k), 0, Math.PI * 2);
      ctx.stroke();
      const next = ar.zones[Math.min(ar.zones.length - 1, zn.phase + 1)];
      if (next && !zn.shrinking) {
        ctx.strokeStyle = 'rgba(255,255,255,.6)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx + next.x * k, cy + next.y * k, Math.max(1, next.r * k), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    if (me) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + me.x * k, cy + me.y * k, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  return { Scene, render, minimap };
})();
