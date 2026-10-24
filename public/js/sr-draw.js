// Strijdrossen van bovenaf: de arena, de hoverrossen, lasers, raketten, mijnen en ontploffingen.
// Voor het bord, het kaartje in de hoek en het zicht 'van bovenaf' op de gsm. Gebruikt SrWorld uit sr-world.js.
const SrDraw = (() => {
  const Wd = SrWorld;
  const TEAM = { rood: '#ff4d6d', blauw: '#3d8bff' };
  const COLORS = ['#ff4d6d', '#4cc9ff', '#ffd166', '#7bf1a8', '#c77dff', '#ff9f1c', '#f15bb5', '#e8f1ff'];
  const colorOf = (team, color) => TEAM[team] || COLORS[((color % 8) + 8) % 8];

  // De arena één keer tekenen op een eigen canvas; daarna alleen nog kopiëren.
  // Met objects: false zonder kratten, pilaren en schansen (die tekent het 3D-zicht zelf), wel met hun schaduw.
  const cache = {};
  function arenaImage(teams, objects = true, k = .5) {
    const key = `${teams ? 'teams' : 'ieder'}/${objects}/${k}`;
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas');
    c.width = Math.round(Wd.W * k);
    c.height = Math.round(Wd.H * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    // Buiten de arena: de binnenplaats van de burcht, donkere kasseien.
    g.fillStyle = '#121022';
    g.fillRect(0, 0, Wd.W, Wd.H);
    g.fillStyle = '#1a1730';
    for (let y = 0; y < Wd.H; y += 40) {
      for (let x = (y / 40) % 2 ? 0 : 30; x < Wd.W; x += 60) g.fillRect(x + 2, y + 2, 54, 36);
    }
    const oval = (pad = 0) => { g.beginPath(); g.ellipse(Wd.CX, Wd.CY, Wd.RX + pad, Wd.RY + pad, 0, 0, Math.PI * 2); };
    // De vloer: zeshoekige tegels in staalblauw, met gloeiende naden.
    g.save();
    oval();
    g.clip();
    const floor = g.createRadialGradient(Wd.CX, Wd.CY, 100, Wd.CX, Wd.CY, Wd.RX);
    floor.addColorStop(0, '#2b2f5c');
    floor.addColorStop(.6, '#1f2448');
    floor.addColorStop(1, '#171a36');
    g.fillStyle = floor;
    g.fillRect(0, 0, Wd.W, Wd.H);
    const s = 70;
    const hh = s * Math.sqrt(3) / 2;
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(120, 220, 255, .22)';
    for (let row = 0, y = 0; y < Wd.H + s; row++, y += hh) {
      for (let x = row % 2 ? s * .75 : 0; x < Wd.W + s; x += s * 1.5) {
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const px = x + Math.cos(a) * s / 2, py = y + Math.sin(a) * s / 2;
          if (i) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
        g.stroke();
      }
    }
    if (teams) {
      g.fillStyle = 'rgba(255, 77, 109, .13)';
      g.fillRect(0, 0, Wd.CX, Wd.H);
      g.fillStyle = 'rgba(61, 139, 255, .13)';
      g.fillRect(Wd.CX, 0, Wd.CX, Wd.H);
    }
    // Banen op de vloer: een grote ring en een kruis, zoals een toernooiveld.
    g.strokeStyle = 'rgba(255, 209, 102, .55)';
    g.lineWidth = 10;
    g.beginPath(); g.ellipse(Wd.CX, Wd.CY, 520, 360, 0, 0, Math.PI * 2); g.stroke();
    g.setLineDash([40, 30]);
    g.lineWidth = 6;
    g.beginPath(); g.ellipse(Wd.CX, Wd.CY, Wd.RX - 120, Wd.RY - 110, 0, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = 'rgba(199, 125, 255, .45)';
    g.lineWidth = 8;
    g.beginPath(); g.moveTo(Wd.CX - Wd.RX, Wd.CY); g.lineTo(Wd.CX - 520, Wd.CY); g.moveTo(Wd.CX + 520, Wd.CY); g.lineTo(Wd.CX + Wd.RX, Wd.CY); g.stroke();
    if (teams) {
      for (const [team, b] of Object.entries(Wd.BASES)) {
        g.strokeStyle = TEAM[team];
        g.lineWidth = 6;
        g.setLineDash([24, 16]);
        g.strokeRect(b.x, b.y, b.w, b.h);
        g.setLineDash([]);
      }
    }
    g.restore();
    // De rand: een gloeiende band.
    g.strokeStyle = '#4cc9ff';
    g.shadowColor = '#4cc9ff';
    g.shadowBlur = 30;
    g.lineWidth = 16;
    oval(6);
    g.stroke();
    g.shadowBlur = 0;
    // Turbostroken met pijlen.
    for (const p of Wd.PADS) {
      g.fillStyle = 'rgba(255, 159, 28, .35)';
      g.fillRect(p.x, p.y, p.w, p.h);
      g.strokeStyle = '#ffd166';
      g.lineWidth = 5;
      g.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
      g.fillStyle = '#ffd166';
      const cx = p.x + p.w / 2, cy = p.y + p.h / 2, r = Math.min(p.w, p.h) * .3;
      g.beginPath(); g.moveTo(cx - r, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx - r, cy + r); g.closePath(); g.fill();
    }
    // Schaduwen van alles wat hoog is (licht van linksboven).
    g.fillStyle = 'rgba(0, 0, 0, .4)';
    for (const b of Wd.BOXES) g.fillRect(b.x + 14, b.y + 18, b.w, b.d);
    for (const cy of Wd.CYLS) { g.beginPath(); g.ellipse(cy.x + cy.r * .4, cy.y + cy.r * .5, cy.r * 1.15, cy.r, 0, 0, Math.PI * 2); g.fill(); }
    if (objects) {
      for (const r of Wd.RAMPS) {
        g.save();
        g.translate(r.x, r.y);
        g.rotate(r.a);
        const grad = g.createLinearGradient(-r.w / 2, 0, r.w / 2, 0);
        grad.addColorStop(0, '#3a2a12');
        grad.addColorStop(1, '#b8741c');
        g.fillStyle = grad;
        g.fillRect(-r.w / 2, -r.d / 2, r.w, r.d);
        g.strokeStyle = '#ffd166';
        g.lineWidth = 5;
        g.strokeRect(-r.w / 2, -r.d / 2, r.w, r.d);
        g.fillStyle = '#ffd166';
        for (const off of [-.25, .15]) {
          const x = off * r.w;
          g.beginPath(); g.moveTo(x, -r.d * .3); g.lineTo(x + r.w * .18, 0); g.lineTo(x, r.d * .3); g.lineTo(x + r.w * .06, 0); g.closePath(); g.fill();
        }
        g.restore();
      }
      for (const b of Wd.BOXES) {
        g.fillStyle = '#5a3d22';
        g.fillRect(b.x, b.y, b.w, b.d);
        g.strokeStyle = '#c77dff';
        g.lineWidth = 5;
        g.strokeRect(b.x + 2.5, b.y + 2.5, b.w - 5, b.d - 5);
        g.strokeStyle = 'rgba(0, 0, 0, .35)';
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(b.x + 6, b.y + 6); g.lineTo(b.x + b.w - 6, b.y + b.d - 6); g.stroke();
      }
      for (const cy of Wd.CYLS) {
        const grad = g.createRadialGradient(cy.x - cy.r * .3, cy.y - cy.r * .3, 4, cy.x, cy.y, cy.r);
        grad.addColorStop(0, cy.kind === 'burcht' ? '#8a90b8' : '#6d7397');
        grad.addColorStop(1, '#2b2f4c');
        g.fillStyle = grad;
        g.beginPath(); g.arc(cy.x, cy.y, cy.r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = cy.kind === 'burcht' ? '#ffd166' : '#c77dff';
        g.lineWidth = 6;
        g.stroke();
      }
    }
    cache[key] = c;
    return c;
  }

  function arena(ctx, cam, w, h, teams) {
    ctx.fillStyle = '#0b0a18';
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
    lasers.set(s.id, { x: s.x, y: s.y, z: s.z || 30, a: s.a, color, n: s.n, vx: Math.cos(s.a) * s.speed, vy: Math.sin(s.a) * s.speed, left: Wd.LASER.range });
  }
  function moveLasers(lasers, dt) {
    for (const [id, b] of lasers) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.left -= Math.hypot(b.vx, b.vy) * dt;
      if (b.left <= 0 || Wd.wallAt(b.x, b.y, b.z)) {
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
      steed(ctx, sx(o.x), sy(o.y), o.a, color, size * (1 + (o.z || 0) / 260), { bubble: o.flags & 6, asking: o.flags & 4, me: o.n === w.me, boost: o.v > Wd.CAR.max + 20 });
    }
    for (const o of w.players.values()) {
      if (o.flags & 1) continue;
      tag(ctx, sx(o.x), sy(o.y), o.name, o.hp, colorOf(o.team, o.color), Math.max(size, .9), o.n === w.top ? '🎯' : o.flags & 4 ? '⚡' : '');
    }
    effects(ctx, cam, dt);
  }

  // Een klein kaartje in de hoek: de arena en alle rossen.
  function minimap(ctx, x0, y0, mw, w) {
    const k = mw / Wd.W;
    const mh = Wd.H * k;
    ctx.save();
    ctx.globalAlpha = .85;
    ctx.drawImage(arenaImage(w.teams), x0, y0, mw, mh);
    for (const o of w.players.values()) {
      if (o.flags & 1) continue;
      const me = o.n === w.me;
      ctx.fillStyle = me ? '#fff' : colorOf(o.team, o.color);
      ctx.beginPath(); ctx.arc(x0 + o.x * k, y0 + o.y * k, me ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return mh;
  }

  return { TEAM, COLORS, colorOf, arena, arenaImage, steed, tag, laser, rocket, mine, burst, ring, boom, effects, addLaser, moveLasers, scene, minimap };
})();
