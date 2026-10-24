// Strijdrossen van bovenaf: de arena, de hoverrossen, lasers, raketten, mijnen en ontploffingen.
// Voor het bord, het kaartje in de hoek en het zicht 'van bovenaf' op de gsm. Gebruikt SrWorld uit sr-world.js.
const SrDraw = (() => {
  const Wd = SrWorld;
  const TEAM = { rood: '#ff4d6d', blauw: '#3d8bff' };
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffd166', '#7bf1a8', '#c77dff', '#ff9f1c', '#f15bb5', '#e8f1ff'];
  const colorOf = (team, color) => TEAM[team] || COLORS[((color % 8) + 8) % 8];

  // De arena één keer tekenen op een eigen canvas; daarna alleen nog kopiëren.
  const cache = {};
  function arenaImage(teams) {
    const key = teams ? 'teams' : 'ieder';
    if (cache[key]) return cache[key];
    const k = 1;
    const c = document.createElement('canvas');
    c.width = Wd.W * k;
    c.height = Wd.H * k;
    const g = c.getContext('2d');
    g.scale(k, k);
    g.fillStyle = '#0a1020';
    g.fillRect(0, 0, Wd.W, Wd.H);
    g.strokeStyle = 'rgba(199, 125, 255, .16)';
    g.lineWidth = 2;
    for (let x = 0; x <= Wd.W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Wd.H); g.stroke(); }
    for (let y = 0; y <= Wd.H; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(Wd.W, y); g.stroke(); }
    // Een grote cirkel in het midden, zoals een toernooiveld.
    g.strokeStyle = 'rgba(255, 201, 74, .22)';
    g.lineWidth = 6;
    g.beginPath(); g.arc(Wd.W / 2, Wd.H / 2, 260, 0, Math.PI * 2); g.stroke();
    g.setLineDash([18, 20]);
    g.beginPath(); g.arc(Wd.W / 2, Wd.H / 2, 360, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    if (teams) {
      for (const [team, b] of Object.entries(Wd.BASES)) {
        g.fillStyle = team === 'rood' ? 'rgba(255, 77, 109, .1)' : 'rgba(61, 139, 255, .1)';
        g.fillRect(b.x, b.y, b.w, b.h);
        g.strokeStyle = TEAM[team];
        g.globalAlpha = .55;
        g.lineWidth = 3;
        g.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
        g.globalAlpha = 1;
      }
    }
    // Turbostroken met pijlen.
    for (const p of Wd.PADS) {
      g.fillStyle = 'rgba(255, 159, 28, .18)';
      g.fillRect(p.x, p.y, p.w, p.h);
      g.strokeStyle = 'rgba(255, 209, 102, .8)';
      g.lineWidth = 3;
      g.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
      g.fillStyle = 'rgba(255, 209, 102, .7)';
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const s = Math.min(p.w, p.h) * .32;
      for (const d of [-1, 1]) {
        g.beginPath();
        g.moveTo(cx + d * s * .2 - s * .4, cy - s);
        g.lineTo(cx + d * s * .2 + s * .5, cy);
        g.lineTo(cx + d * s * .2 - s * .4, cy + s);
        g.lineTo(cx + d * s * .2 - s * .1, cy);
        g.closePath();
        g.fill();
      }
    }
    // Muren: blokken met een gloeiende paarse rand.
    for (const w of Wd.WALLS) {
      g.fillStyle = 'rgba(0, 0, 0, .45)';
      g.fillRect(w.x + 8, w.y + 10, w.w, w.h);
      const grad = g.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      grad.addColorStop(0, '#3a2c66');
      grad.addColorStop(1, '#1d1638');
      g.fillStyle = grad;
      g.fillRect(w.x, w.y, w.w, w.h);
      g.strokeStyle = '#c77dff';
      g.shadowColor = '#c77dff';
      g.shadowBlur = 14;
      g.lineWidth = 3;
      g.strokeRect(w.x + 1.5, w.y + 1.5, w.w - 3, w.h - 3);
      g.shadowBlur = 0;
    }
    // De rand van de arena.
    g.strokeStyle = '#4cc9ff';
    g.shadowColor = '#4cc9ff';
    g.shadowBlur = 20;
    g.lineWidth = 8;
    g.strokeRect(4, 4, Wd.W - 8, Wd.H - 8);
    g.shadowBlur = 0;
    cache[key] = c;
    return c;
  }

  function arena(ctx, cam, w, h, teams) {
    ctx.fillStyle = '#050911';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(arenaImage(teams), -cam.x * cam.scale, -cam.y * cam.scale, Wd.W * cam.scale, Wd.H * cam.scale);
  }

  // Een hoverros van bovenaf: een slee met vinnen, de ridder erop en een gloed in zijn kleur.
  function steed(ctx, sx, sy, a, color, s, opts = {}) {
    const R = Wd.R * s;
    ctx.save();
    ctx.translate(sx, sy);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.fillStyle = 'rgba(0, 0, 0, .4)';
    ctx.beginPath(); ctx.ellipse(4 * s, 6 * s, R * 1.2, R * .8, a, 0, Math.PI * 2); ctx.fill();
    if (opts.me) {
      ctx.strokeStyle = 'rgba(255, 255, 255, .85)';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.45, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.rotate(a);
    // Uitlaatvlammen achteraan, groot met turbo.
    const flame = opts.boost ? 1.9 : 1;
    for (const side of [-1, 1]) {
      const g = ctx.createRadialGradient(-R * 1.05, side * R * .42, 1, -R * 1.05, side * R * .42, R * .7 * flame);
      g.addColorStop(0, '#fff');
      g.addColorStop(.35, opts.boost ? '#ffd166' : color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(-R * 1.05, side * R * .42, R * .7 * flame, 0, Math.PI * 2); ctx.fill();
    }
    // De slee.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(R * 1.3, 0);
    ctx.lineTo(R * .3, -R * .75);
    ctx.lineTo(-R * 1.05, -R * .95);
    ctx.lineTo(-R * .8, 0);
    ctx.lineTo(-R * 1.05, R * .95);
    ctx.lineTo(R * .3, R * .75);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a2038';
    ctx.beginPath();
    ctx.moveTo(R * 1.0, 0);
    ctx.lineTo(R * .2, -R * .52);
    ctx.lineTo(-R * .75, -R * .6);
    ctx.lineTo(-R * .55, 0);
    ctx.lineTo(-R * .75, R * .6);
    ctx.lineTo(R * .2, R * .52);
    ctx.closePath();
    ctx.fill();
    // De lans naar voren en de ridder met helm.
    ctx.fillStyle = '#d7deef';
    ctx.fillRect(R * .1, R * .3, R * 1.5, R * .16);
    ctx.fillStyle = '#9fe6ff';
    ctx.beginPath(); ctx.arc(R * 1.62, R * .38, R * .14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9d6e6';
    ctx.beginPath(); ctx.ellipse(-R * .1, 0, R * .42, R * .55, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8eff8';
    ctx.beginPath(); ctx.arc(R * .02, 0, R * .3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-R * .3, -R * .07, R * .34, R * .14);
    ctx.restore();
    if (opts.bubble) {
      ctx.save();
      ctx.strokeStyle = opts.asking ? 'rgba(255, 201, 74, .9)' : 'rgba(76, 201, 255, .85)';
      ctx.fillStyle = opts.asking ? 'rgba(255, 201, 74, .12)' : 'rgba(76, 201, 255, .12)';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath(); ctx.arc(sx, sy, R * 1.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  // Naam, levens en het hoofd van de eigen ridder boven het ros.
  function tag(ctx, sx, sy, name, hp, color, s, extra = '') {
    const R = Wd.R * s;
    ctx.save();
    ctx.font = `700 ${Math.max(11, 13 * s)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, .75)';
    const text = extra ? `${extra} ${name}` : name;
    const ty = sy - R * 1.5 - 12 * s;
    ctx.strokeText(text, sx, ty);
    ctx.fillStyle = '#eaf4ff';
    ctx.fillText(text, sx, ty);
    const av = typeof Avatar !== 'undefined' ? Avatar.byName(name) : null;
    if (av) {
      const img = Avatar.head(av, 4);
      const hh = Math.max(14, 20 * s);
      const hw = hh * img.width / img.height;
      ctx.drawImage(img, sx - ctx.measureText(text).width / 2 - hw - 2 * s, ty - hh * .8, hw, hh);
    }
    if (hp !== null) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < hp ? color : 'rgba(255, 255, 255, .18)';
        ctx.fillRect(sx - 16 * s + i * 11 * s, ty + 4 * s, 9 * s, 4 * s);
      }
    }
    ctx.restore();
  }

  function laser(ctx, sx, sy, a, color, s) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * s;
    ctx.fillStyle = color;
    ctx.fillRect(-22 * s, -4 * s, 30 * s, 8 * s);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-12 * s, -2 * s, 20 * s, 4 * s);
    ctx.restore();
  }

  function rocket(ctx, sx, sy, a, color, s, t) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    const g = ctx.createRadialGradient(-20 * s, 0, 1, -20 * s, 0, 22 * s);
    g.addColorStop(0, '#fff');
    g.addColorStop(.4, '#ff9f1c');
    g.addColorStop(1, 'rgba(255, 80, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(-20 * s, 0, (18 + Math.sin(t * 40) * 4) * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8eff8';
    ctx.beginPath();
    ctx.moveTo(18 * s, 0); ctx.lineTo(4 * s, -7 * s); ctx.lineTo(-14 * s, -7 * s); ctx.lineTo(-14 * s, 7 * s); ctx.lineTo(4 * s, 7 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-14 * s, -11 * s, 8 * s, 22 * s);
    ctx.restore();
  }

  function mine(ctx, sx, sy, color, s, armed, t) {
    ctx.save();
    ctx.translate(sx, sy);
    const pulse = armed ? .5 + .5 * Math.sin(t * 8) : 0;
    ctx.fillStyle = 'rgba(0, 0, 0, .45)';
    ctx.beginPath(); ctx.arc(3 * s, 4 * s, 17 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a3150';
    ctx.beginPath(); ctx.arc(0, 0, 16 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = '#7d8ba3';
      ctx.fillRect(Math.cos(a) * 16 * s - 3 * s, Math.sin(a) * 16 * s - 3 * s, 6 * s, 6 * s);
    }
    ctx.fillStyle = armed ? `rgba(255, 77, 109, ${.5 + pulse * .5})` : '#ffd166';
    ctx.shadowColor = '#ff4d6d';
    ctx.shadowBlur = armed ? 14 * s * pulse : 0;
    ctx.beginPath(); ctx.arc(0, 0, 6 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Vonken, schokgolven en ontploffingen, in arena-eenheden.
  const sparks = [];
  // Wie de effecten even niet tekent (het 3D-zicht), laat ze niet ophopen.
  const trim = () => { if (sparks.length > 400) sparks.splice(0, sparks.length - 400); };
  function burst(x, y, color, n = 10, speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (.4 + Math.random() * .8);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .35 + Math.random() * .35, max: .7, color });
    }
    trim();
  }
  function ring(x, y, color, r = 90) {
    sparks.push({ x, y, ring: true, r, life: .5, max: .5, color });
  }
  function boom(x, y, r) {
    sparks.push({ x, y, fire: true, r, life: .55, max: .55 });
    burst(x, y, '#ffd166', 22, 420);
    burst(x, y, '#ff6b35', 14, 300);
  }
  function effects(ctx, cam, dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      const sx = (p.x - cam.x) * cam.scale;
      const sy = (p.y - cam.y) * cam.scale;
      const k = p.life / p.max;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      if (p.fire) {
        const r = p.r * (1.1 - k * .6) * cam.scale;
        const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, r);
        g.addColorStop(0, 'rgba(255, 255, 255, .95)');
        g.addColorStop(.35, 'rgba(255, 209, 102, .85)');
        g.addColorStop(.7, 'rgba(255, 107, 53, .5)');
        g.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      } else if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5 * cam.scale;
        ctx.beginPath(); ctx.arc(sx, sy, (1 - k) * p.r * cam.scale, 0, Math.PI * 2); ctx.stroke();
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= .9;
        p.vy *= .9;
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - 3 * cam.scale, sy - 3 * cam.scale, 6 * cam.scale, 6 * cam.scale);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Lasers lokaal laten vliegen tussen de berichten van de server door.
  function addLaser(lasers, s, color) {
    lasers.set(s.id, { x: s.x, y: s.y, a: s.a, color, n: s.n, vx: Math.cos(s.a) * s.speed, vy: Math.sin(s.a) * s.speed, left: Wd.LASER.range });
  }
  function moveLasers(lasers, dt) {
    for (const [id, b] of lasers) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.left -= Math.hypot(b.vx, b.vy) * dt;
      if (b.left <= 0 || Wd.wallAt(b.x, b.y)) {
        if (b.left > 0) burst(b.x - b.vx * .01, b.y - b.vy * .01, b.color, 4, 140);
        lasers.delete(id);
      }
    }
  }

  // Alles samen, met de camera { x, y, scale } (linksboven in arena-eenheden).
  // w: { players: Map, lasers: Map, rockets: [], mines: [], teams, me (n), t, top (n met de langste reeks) }
  function scene(ctx, cam, W, H, w, dt) {
    const s = cam.scale;
    const sx = x => (x - cam.x) * s;
    const sy = y => (y - cam.y) * s;
    arena(ctx, cam, W, H, w.teams);
    for (const m of w.mines) {
      const o = w.players.get(m.n);
      mine(ctx, sx(m.x), sy(m.y), o ? colorOf(o.team, o.color) : '#fff', s * 1.2, m.armed, w.t);
    }
    moveLasers(w.lasers, dt);
    for (const b of w.lasers.values()) laser(ctx, sx(b.x), sy(b.y), b.a, b.color, s * 1.3);
    for (const r of w.rockets) {
      const o = w.players.get(r.n);
      rocket(ctx, sx(r.x), sy(r.y), r.a, o ? colorOf(o.team, o.color) : '#fff', s * 1.3, w.t);
    }
    const size = Math.max(s * 1.15, .55);
    for (const o of w.players.values()) {
      if (o.flags & 1) continue;
      const color = colorOf(o.team, o.color);
      steed(ctx, sx(o.x), sy(o.y), o.a, color, size, { bubble: o.flags & 6, asking: o.flags & 4, me: o.n === w.me, boost: o.v > Wd.CAR.max + 20 });
    }
    for (const o of w.players.values()) {
      if (o.flags & 1) continue;
      tag(ctx, sx(o.x), sy(o.y), o.name, o.hp, colorOf(o.team, o.color), Math.max(size, .9), o.n === w.top ? '🎯' : o.flags & 4 ? '⚡' : '');
    }
    effects(ctx, cam, dt);
  }

  // Een klein kaartje in de hoek: muren, mijnen van jezelf en alle rossen.
  function minimap(ctx, x0, y0, mw, w) {
    const k = mw / Wd.W;
    const mh = Wd.H * k;
    ctx.save();
    ctx.globalAlpha = .85;
    ctx.fillStyle = 'rgba(5, 9, 17, .75)';
    ctx.fillRect(x0, y0, mw, mh);
    ctx.strokeStyle = 'rgba(76, 201, 255, .6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + .5, y0 + .5, mw - 1, mh - 1);
    ctx.fillStyle = 'rgba(199, 125, 255, .6)';
    for (const r of Wd.WALLS) ctx.fillRect(x0 + r.x * k, y0 + r.y * k, Math.max(1, r.w * k), Math.max(1, r.h * k));
    ctx.fillStyle = 'rgba(255, 209, 102, .4)';
    for (const p of Wd.PADS) ctx.fillRect(x0 + p.x * k, y0 + p.y * k, p.w * k, p.h * k);
    for (const o of w.players.values()) {
      if (o.flags & 1) continue;
      const me = o.n === w.me;
      ctx.fillStyle = me ? '#fff' : colorOf(o.team, o.color);
      ctx.beginPath(); ctx.arc(x0 + o.x * k, y0 + o.y * k, me ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return mh;
  }

  return { TEAM, COLORS, colorOf, arena, steed, tag, laser, rocket, mine, burst, ring, boom, effects, addLaser, moveLasers, scene, minimap };
})();
