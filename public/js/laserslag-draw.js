// Laserslag tekenen: de arena, de ridders van bovenaf, laserschoten, het kristal en vonken.
// Gebruikt Arena uit laserslag-world.js. Gedeeld door de leerling en het bord.
const SlagDraw = (() => {
  const TEAM = { rood: '#ff4d6d', blauw: '#3d8bff' };
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff'];
  const colorOf = (team, color) => TEAM[team] || COLORS[color % 8];

  // De arena één keer tekenen op een eigen canvas; daarna alleen nog kopiëren.
  let floorCache = null;
  function arenaImage() {
    if (floorCache) return floorCache;
    const k = 1.5;
    const c = document.createElement('canvas');
    c.width = Arena.W * k;
    c.height = Arena.H * k;
    const g = c.getContext('2d');
    g.scale(k, k);
    g.fillStyle = '#0a1222';
    g.fillRect(0, 0, Arena.W, Arena.H);
    // Vloertegels met fijne scifi-lijnen.
    g.strokeStyle = 'rgba(76, 201, 255, .07)';
    g.lineWidth = 1;
    for (let x = 0; x <= Arena.W; x += 50) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Arena.H); g.stroke(); }
    for (let y = 0; y <= Arena.H; y += 50) { g.beginPath(); g.moveTo(0, y); g.lineTo(Arena.W, y); g.stroke(); }
    // Middencirkel waar het kristal verschijnt.
    g.strokeStyle = 'rgba(255, 201, 74, .25)';
    g.lineWidth = 3;
    g.beginPath(); g.arc(Arena.CRYSTAL.x, Arena.CRYSTAL.y, 70, 0, Math.PI * 2); g.stroke();
    g.setLineDash([10, 12]);
    g.beginPath(); g.arc(Arena.CRYSTAL.x, Arena.CRYSTAL.y, 110, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);
    // De kampen.
    for (const [team, b] of Object.entries(Arena.BASES)) {
      const col = TEAM[team];
      g.fillStyle = team === 'rood' ? 'rgba(255, 77, 109, .1)' : 'rgba(61, 139, 255, .1)';
      g.fillRect(b.x, b.y, b.w, b.h);
      g.strokeStyle = col;
      g.globalAlpha = .5;
      g.lineWidth = 2;
      g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      g.globalAlpha = .15;
      g.save();
      g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
      for (let i = -b.h; i < b.w; i += 24) {
        g.beginPath(); g.moveTo(b.x + i, b.y + b.h); g.lineTo(b.x + i + b.h, b.y); g.stroke();
      }
      g.restore();
      g.globalAlpha = .55;
      g.fillStyle = col;
      g.font = "800 22px 'Orbitron', 'Exo 2', sans-serif";
      g.textAlign = 'center';
      g.save();
      g.translate(b.x + b.w / 2, b.y + b.h / 2);
      g.rotate(team === 'rood' ? -Math.PI / 2 : Math.PI / 2);
      g.fillText(team.toUpperCase(), 0, 8);
      g.restore();
      g.globalAlpha = 1;
    }
    // Muren: stenen blokken met een gloeiende rand.
    for (const w of Arena.WALLS) {
      g.fillStyle = 'rgba(0, 0, 0, .45)';
      g.fillRect(w.x + 6, w.y + 8, w.w, w.h);
      g.fillStyle = '#1f2b45';
      g.fillRect(w.x, w.y, w.w, w.h);
      g.strokeStyle = 'rgba(0, 0, 0, .35)';
      g.lineWidth = 1;
      for (let y = w.y + 14; y < w.y + w.h; y += 14) { g.beginPath(); g.moveTo(w.x, y); g.lineTo(w.x + w.w, y); g.stroke(); }
      for (let y = w.y, row = 0; y < w.y + w.h; y += 14, row++) {
        for (let x = w.x + (row % 2 ? 12 : 24); x < w.x + w.w; x += 24) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, Math.min(y + 14, w.y + w.h)); g.stroke(); }
      }
      g.strokeStyle = 'rgba(76, 201, 255, .65)';
      g.lineWidth = 2;
      g.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    }
    g.strokeStyle = 'rgba(76, 201, 255, .6)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, Arena.W - 6, Arena.H - 6);
    floorCache = c;
    return c;
  }

  // cam: { x, y, scale } — linksboven van het beeld in arena-eenheden.
  function arena(ctx, cam, w, h) {
    ctx.fillStyle = '#050911';
    ctx.fillRect(0, 0, w, h);
    const img = arenaImage();
    ctx.drawImage(img, -cam.x * cam.scale, -cam.y * cam.scale, Arena.W * cam.scale, Arena.H * cam.scale);
  }

  // Een ridder van bovenaf: cape, harnas, helm met vizier en een laserlans in de kijkrichting.
  function knight(ctx, sx, sy, a, color, s, opts = {}) {
    const R = Arena.R * s;
    ctx.save();
    ctx.translate(sx, sy);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.fillStyle = 'rgba(0, 0, 0, .4)';
    ctx.beginPath(); ctx.ellipse(3 * s, 5 * s, R, R * .8, 0, 0, Math.PI * 2); ctx.fill();
    if (opts.me) {
      ctx.strokeStyle = 'rgba(255, 255, 255, .85)';
      ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.arc(0, 0, R + 7 * s, 0, Math.PI * 2); ctx.stroke();
    }
    // Gloed in de kleur van het team, zodat je vriend en vijand meteen herkent.
    ctx.fillStyle = color;
    ctx.globalAlpha *= .35;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 * s;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = opts.alpha !== undefined ? opts.alpha : 1;
    ctx.rotate(a);
    // Cape achteraan.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-R * .1, -R * 1.05);
    ctx.quadraticCurveTo(-R * 2.1, 0, -R * .1, R * 1.05);
    ctx.closePath();
    ctx.fill();
    // Lans.
    ctx.fillStyle = '#7d8ba3';
    ctx.fillRect(R * .2, R * .35, R * 1.3, R * .32);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * s;
    ctx.fillRect(R * 1.3, R * .3, R * .45, R * .42);
    ctx.shadowBlur = 0;
    // Schouders en helm.
    ctx.fillStyle = '#c9d6e6';
    ctx.beginPath(); ctx.ellipse(0, 0, R * .7, R * .95, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    ctx.fillStyle = '#e4edf7';
    ctx.beginPath(); ctx.arc(R * .1, 0, R * .55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4cc9ff';
    ctx.fillRect(R * .38, -R * .3, R * .2, R * .6);
    // Pluim in de kleur van het team.
    ctx.fillStyle = color;
    ctx.fillRect(-R * .35, -R * .1, R * .5, R * .2);
    ctx.restore();
    // Schild (vraag of net teruggekomen).
    if (opts.bubble) {
      ctx.save();
      ctx.strokeStyle = opts.asking ? 'rgba(255, 201, 74, .9)' : 'rgba(76, 201, 255, .85)';
      ctx.fillStyle = opts.asking ? 'rgba(255, 201, 74, .12)' : 'rgba(76, 201, 255, .12)';
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath(); ctx.arc(sx, sy, R + 10 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    if (opts.armor) {
      ctx.save();
      ctx.strokeStyle = 'rgba(166, 107, 255, .9)';
      ctx.lineWidth = 3 * s;
      ctx.setLineDash([6 * s, 4 * s]);
      ctx.beginPath(); ctx.arc(sx, sy, R + 4 * s, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
  }

  // Naam en levens boven de ridder.
  function tag(ctx, sx, sy, name, hp, color, s, extra = '') {
    const R = Arena.R * s;
    ctx.save();
    ctx.font = `700 ${Math.max(10, 12 * s)}px 'Exo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0, 0, 0, .75)';
    const text = extra ? `${extra} ${name}` : name;
    ctx.strokeText(text, sx, sy - R - 16 * s);
    ctx.fillStyle = '#eaf4ff';
    ctx.fillText(text, sx, sy - R - 16 * s);
    // Het hoofd van de eigen ridder naast de naam.
    const av = typeof Avatar !== 'undefined' ? Avatar.byName(name) : null;
    if (av) {
      const img = Avatar.head(av, 4);
      const hh = Math.max(14, 20 * s);
      const hw = hh * img.width / img.height;
      ctx.drawImage(img, sx - ctx.measureText(text).width / 2 - hw - 2 * s, sy - R - 16 * s - hh * .8, hw, hh);
    }
    if (hp !== null) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < hp ? color : 'rgba(255, 255, 255, .18)';
        ctx.fillRect(sx - 16 * s + i * 11 * s, sy - R - 12 * s, 9 * s, 4 * s);
      }
    }
    ctx.restore();
  }

  function bullet(ctx, sx, sy, a, color, s) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * s;
    ctx.fillStyle = color;
    ctx.fillRect(-16 * s, -3 * s, 22 * s, 6 * s);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-8 * s, -1.5 * s, 14 * s, 3 * s);
    ctx.restore();
  }

  function crystal(ctx, sx, sy, s, t) {
    const bob = Math.sin(t * 3) * 4 * s;
    ctx.save();
    ctx.translate(sx, sy + bob);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 46 * s);
    glow.addColorStop(0, 'rgba(255, 201, 74, .55)');
    glow.addColorStop(1, 'rgba(255, 201, 74, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-46 * s, -46 * s, 92 * s, 92 * s);
    ctx.rotate(Math.sin(t * 1.5) * .2);
    ctx.fillStyle = '#ffc94a';
    ctx.beginPath();
    ctx.moveTo(0, -20 * s); ctx.lineTo(13 * s, -4 * s); ctx.lineTo(0, 20 * s); ctx.lineTo(-13 * s, -4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(0, -20 * s); ctx.lineTo(5 * s, -4 * s); ctx.lineTo(0, 8 * s); ctx.lineTo(-6 * s, -4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Vonken en ontploffingen.
  const sparks = [];
  function burst(x, y, color, n = 10, speed = 220) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (.4 + Math.random() * .8);
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .35 + Math.random() * .35, max: .7, color });
    }
  }
  function ring(x, y, color) {
    sparks.push({ x, y, ring: true, life: .45, max: .45, color });
  }
  function effects(ctx, cam, dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      const sx = (p.x - cam.x) * cam.scale;
      const sy = (p.y - cam.y) * cam.scale;
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      if (p.ring) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 4 * cam.scale;
        ctx.beginPath(); ctx.arc(sx, sy, (1 - p.life / p.max) * 70 * cam.scale, 0, Math.PI * 2); ctx.stroke();
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= .9;
        p.vy *= .9;
        ctx.fillStyle = p.color;
        ctx.fillRect(sx - 2.5 * cam.scale, sy - 2.5 * cam.scale, 5 * cam.scale, 5 * cam.scale);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Kogels lokaal laten vliegen tussen de berichten van de server door.
  function moveBullets(bullets, dt) {
    for (const [id, b] of bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.left -= Arena.BULLET.speed * dt;
      if (b.left <= 0 || Arena.wallAt(b.x, b.y)) {
        if (b.left > 0) burst(b.x - b.vx * .01, b.y - b.vy * .01, b.color, 4, 120);
        bullets.delete(id);
      }
    }
  }
  function addBullet(bullets, s, color) {
    bullets.set(s.id, {
      x: s.x, y: s.y, a: s.a, color,
      vx: Math.cos(s.a) * Arena.BULLET.speed, vy: Math.sin(s.a) * Arena.BULLET.speed, left: Arena.BULLET.range,
    });
  }

  return { TEAM, COLORS, colorOf, arena, knight, tag, bullet, crystal, burst, ring, effects, moveBullets, addBullet };
})();
