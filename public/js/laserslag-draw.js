// Laserslag tekenen: de arena, de ridders van bovenaf, laserschoten, het kristal en vonken.
// Gebruikt Arena uit laserslag-world.js. Gedeeld door de leerling en het bord.
const SlagDraw = (() => {
  const TEAM = { rood: '#ff4d6d', blauw: '#3d8bff' };
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff'];
  // Net na het herverbinden kent de gsm zijn eigen kleur soms nog niet: dan even de eerste kleur.
  const colorOf = (team, color) => TEAM[team] || COLORS[((color % 8) + 8) % 8] || COLORS[0];

  // De burchtmuur rond de arena. Bovenaan is ze dieper: daar zie je de voorkant, met posters en fakkels.
  const EDGE = { n: 230, s: 64, w: 64, e: 64 };
  const FACE = 175; // hoogte van de voorkant van de noordmuur
  const wallNeon = w => (w.x + w.w / 2 < Arena.W * .4 ? '#ff6b86' : w.x + w.w / 2 > Arena.W * .6 ? '#5ea3ff' : '#4cc9ff');
  const isPillar = w => Math.abs(w.w - w.h) < Math.min(w.w, w.h) * .4;
  const rand = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // Wat er beweegt op de arena (fakkels, bakens, reactoren, energiebanen), één keer per maat uitgerekend.
  let deco = null;
  function decoNow() {
    const key = `${Arena.tier}/${typeof Posters !== 'undefined' ? Posters.version : 0}`;
    if (deco && deco.key === key) return deco;
    const W = Arena.W, H = Arena.H, C = Arena.CRYSTAL;
    const grow = 1 + Arena.tier * .15;
    // Energiebanen van elk kamp naar het kristal.
    const lanes = [];
    for (const [team, b] of Object.entries(Arena.BASES)) {
      const x0 = b.x + b.w / 2, y0 = b.y + b.h / 2, dir = x0 < C.x ? 1 : -1;
      for (const off of [-60 * grow, 60 * grow]) {
        lanes.push({ color: TEAM[team], pts: [[x0, y0 + off], [(x0 + C.x) / 2, y0 + off], [C.x - dir * 130, C.y]] });
      }
    }
    for (const l of lanes) {
      l.len = 0;
      for (let i = 1; i < l.pts.length; i++) l.len += Math.hypot(l.pts[i][0] - l.pts[i - 1][0], l.pts[i][1] - l.pts[i - 1][1]);
    }
    // Posters en fakkels op de voorkant van de noordmuur.
    const slots = Math.max(4, Math.floor(W / 250));
    const art = [];
    const torches = [];
    const photos = typeof Posters !== 'undefined' ? Posters.list : [];
    for (let i = 0; i < slots; i++) {
      const cx = (i + .5) * W / slots;
      const img = photos.length ? photos[i % photos.length] : Posters.banner(cx < W / 2 ? TEAM.rood : TEAM.blauw);
      art.push({ cx, img, photo: photos.length > 0 });
      if (i) torches.push({ x: i * W / slots, y: -FACE * .62 });
    }
    torches.push({ x: 26, y: -FACE * .62 }, { x: W - 26, y: -FACE * .62 });
    const beacons = [
      { x: -EDGE.w * .5, y: -EDGE.n + 52, color: TEAM.rood }, { x: W + EDGE.e * .5, y: -EDGE.n + 52, color: TEAM.blauw },
      { x: -EDGE.w * .5, y: H + EDGE.s * .5, color: TEAM.rood }, { x: W + EDGE.e * .5, y: H + EDGE.s * .5, color: TEAM.blauw },
    ];
    const cores = Arena.WALLS.filter(isPillar).map(w => ({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: Math.min(w.w, w.h) * .32, color: wallNeon(w) }));
    deco = { key, lanes, art, torches, beacons, cores };
    return deco;
  }

  // Stenen blokken in een rechthoek, met voegen.
  function stones(g, x, y, w, h, bw, bh, base, r) {
    g.fillStyle = base;
    g.fillRect(x, y, w, h);
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    for (let yy = y, row = 0; yy < y + h; yy += bh, row++) {
      for (let xx = x - (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) {
        const v = r();
        g.fillStyle = `rgba(${v < .5 ? '255,240,255' : '0,0,10'}, ${.03 + v * .06})`;
        g.fillRect(xx + 1.5, yy + 1.5, bw - 3, bh - 3);
        g.fillStyle = 'rgba(255,255,255,.06)';
        g.fillRect(xx + 1.5, yy + 1.5, bw - 3, 1.5);
      }
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(x, yy, w, 1.5);
      for (let xx = x - (row % 2 ? bw / 2 : 0); xx < x + w; xx += bw) g.fillRect(xx, yy, 1.5, bh);
    }
    g.restore();
  }

  // De vloer: metalen platen, roosters, brandplekken, energiebanen, het midden en de kampen.
  function paintFloor(g) {
    const W = Arena.W, H = Arena.H, C = Arena.CRYSTAL, r = rand(11);
    const bg = g.createLinearGradient(0, 0, W, 0);
    bg.addColorStop(0, '#2a1222');
    bg.addColorStop(.4, '#121628');
    bg.addColorStop(.6, '#0f1a34');
    bg.addColorStop(1, '#0b1c40');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const P = 100;
    for (let x = 0; x < W; x += P) {
      for (let y = 0; y < H; y += P) {
        const v = r();
        const pw = Math.min(P, W - x), ph = Math.min(P, H - y);
        const pg = g.createLinearGradient(x, y, x + pw, y + ph);
        pg.addColorStop(0, `rgba(170, 195, 255, ${.06 + v * .05})`);
        pg.addColorStop(1, `rgba(0, 0, 0, ${.1 + v * .12})`);
        g.fillStyle = pg;
        g.fillRect(x + 3, y + 3, pw - 6, ph - 6);
        g.fillStyle = 'rgba(0, 0, 0, .6)';
        g.fillRect(x, y, pw, 3);
        g.fillRect(x, y, 3, ph);
        g.fillStyle = 'rgba(200, 225, 255, .09)';
        g.fillRect(x + 3, y + 3, pw - 6, 1.5);
        g.fillRect(x + 3, y + 3, 1.5, ph - 6);
        g.fillStyle = 'rgba(0, 0, 0, .28)';
        g.fillRect(x + pw / 2 - 1, y + 3, 2, ph - 6);
        g.fillRect(x + 3, y + ph / 2 - 1, pw - 6, 2);
        g.fillStyle = 'rgba(205, 220, 245, .25)';
        for (const [a, b] of [[9, 9], [pw - 9, 9], [9, ph - 9], [pw - 9, ph - 9]]) { g.beginPath(); g.arc(x + a, y + b, 2.3, 0, Math.PI * 2); g.fill(); }
        if (v < .09) {
          // Rooster met licht eronder.
          Glow.glow(g, x + pw / 2, y + ph / 2, 40, x < W / 2 ? '#ff6b3c' : '#3cc8ff', .35);
          g.fillStyle = 'rgba(0, 0, 0, .55)';
          for (let i = y + 22; i < y + ph - 20; i += 8) g.fillRect(x + 20, i, pw - 40, 4);
        } else if (v < .15) {
          Glow.glow(g, x + pw / 2, y + ph / 2, 62, x < W / 2 ? '#ff4d6d' : '#3d8bff', .3);
        } else if (v < .22) {
          // Brandplek van een laserschot.
          const s = g.createRadialGradient(x + pw / 2, y + ph / 2, 2, x + pw / 2, y + ph / 2, 46);
          s.addColorStop(0, 'rgba(0, 0, 0, .55)');
          s.addColorStop(1, 'rgba(0, 0, 0, 0)');
          g.fillStyle = s;
          g.fillRect(x, y, pw, ph);
        }
      }
    }
    for (const [team, b] of Object.entries(Arena.BASES)) Glow.glow(g, b.x + b.w / 2, b.y + b.h / 2, H * .7, TEAM[team], .2);
    // Energiebanen: een gleuf in de vloer met een gloeiende kern.
    for (const l of decoNow().lanes) {
      g.lineJoin = 'round';
      g.beginPath();
      l.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.strokeStyle = 'rgba(0, 0, 0, .6)';
      g.lineWidth = 18;
      g.stroke();
      g.strokeStyle = Glow.rgba(l.color, .22);
      g.lineWidth = 12;
      g.stroke();
      g.strokeStyle = Glow.rgba(l.color, .85);
      g.lineWidth = 3;
      g.stroke();
    }
    // Het midden: een runenschijf waar het kristal verschijnt.
    Glow.glow(g, C.x, C.y, 220, '#ffc94a', .3);
    const disc = g.createRadialGradient(C.x, C.y, 10, C.x, C.y, 140);
    disc.addColorStop(0, 'rgba(60, 44, 10, .9)');
    disc.addColorStop(.7, 'rgba(30, 26, 20, .85)');
    disc.addColorStop(1, 'rgba(20, 20, 30, 0)');
    g.fillStyle = disc;
    g.beginPath(); g.arc(C.x, C.y, 140, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255, 201, 74, .55)';
    g.lineWidth = 4;
    g.beginPath(); g.arc(C.x, C.y, 112, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.arc(C.x, C.y, 72, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(C.x, C.y, 40, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(255, 220, 140, .75)';
    g.font = "700 16px 'Orbitron', sans-serif";
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.save();
      g.translate(C.x + Math.cos(a) * 92, C.y + Math.sin(a) * 92);
      g.rotate(a + Math.PI / 2);
      g.fillText(RUNES[i], 0, 0);
      g.restore();
      g.strokeStyle = 'rgba(255, 201, 74, .35)';
      g.beginPath(); g.moveTo(C.x + Math.cos(a) * 42, C.y + Math.sin(a) * 42); g.lineTo(C.x + Math.cos(a) * 70, C.y + Math.sin(a) * 70); g.stroke();
    }
    g.textBaseline = 'alphabetic';
    // De kampen: een landingsplatform met pijlen naar het midden, een schild en gevarenstrepen.
    for (const [team, b] of Object.entries(Arena.BASES)) {
      const col = TEAM[team], dir = team === 'rood' ? 1 : -1;
      g.fillStyle = Glow.rgba(col, .16);
      g.fillRect(b.x, b.y, b.w, b.h);
      g.save();
      g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
      // Pijlen.
      g.strokeStyle = Glow.rgba(col, .35);
      g.lineWidth = 8;
      for (let i = 0; i < 3; i++) {
        const x = b.x + b.w / 2 + dir * (i * 26 - 26);
        g.beginPath(); g.moveTo(x - dir * 14, b.y + b.h * .14); g.lineTo(x + dir * 8, b.y + b.h * .22); g.lineTo(x - dir * 14, b.y + b.h * .3); g.stroke();
        g.beginPath(); g.moveTo(x - dir * 14, b.y + b.h * .7); g.lineTo(x + dir * 8, b.y + b.h * .78); g.lineTo(x - dir * 14, b.y + b.h * .86); g.stroke();
      }
      // Gevarenstrepen langs de kant van de arena.
      const ex = team === 'rood' ? b.x + b.w - 14 : b.x;
      for (let y = b.y - 20; y < b.y + b.h; y += 20) {
        g.fillStyle = '#ffc94a';
        g.beginPath(); g.moveTo(ex, y); g.lineTo(ex + 14, y - 14); g.lineTo(ex + 14, y - 4); g.lineTo(ex, y + 10); g.closePath(); g.fill();
      }
      g.restore();
      // Schild van het team.
      const sx = b.x + b.w / 2, sy = b.y + b.h / 2, s = Math.min(b.w, b.h) * .3;
      g.fillStyle = Glow.rgba(col, .28);
      g.strokeStyle = Glow.rgba(col, .8);
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(sx - s, sy - s); g.lineTo(sx + s, sy - s); g.lineTo(sx + s, sy);
      g.quadraticCurveTo(sx + s, sy + s * .9, sx, sy + s * 1.3); g.quadraticCurveTo(sx - s, sy + s * .9, sx - s, sy);
      g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255, 255, 255, .55)';
      g.beginPath(); g.moveTo(sx - s * .6, sy - s * .6); g.lineTo(sx + s * .6, sy + s * .6); g.moveTo(sx + s * .6, sy - s * .6); g.lineTo(sx - s * .6, sy + s * .6); g.stroke();
      g.strokeStyle = col;
      g.lineWidth = 2;
      g.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
      g.globalAlpha = .7;
      g.fillStyle = col;
      g.font = "800 22px 'Orbitron', 'Exo 2', sans-serif";
      g.textAlign = 'center';
      g.save();
      g.translate(team === 'rood' ? b.x + 18 : b.x + b.w - 18, sy);
      g.rotate(team === 'rood' ? -Math.PI / 2 : Math.PI / 2);
      g.fillText(team.toUpperCase(), 0, 8);
      g.restore();
      g.globalAlpha = 1;
    }
  }

  // De muren binnen de arena: stenen blokken met een gloeiende kern; vierkante pilaren zijn reactoren.
  function paintWalls(g) {
    const D = 20;
    const r = rand(23);
    for (const w of Arena.WALLS) {
      g.fillStyle = 'rgba(0, 0, 0, .5)';
      g.fillRect(w.x + 10, w.y + 16, w.w + 4, w.h + D);
    }
    for (const w of Arena.WALLS) {
      const neon = wallNeon(w);
      // Voorkant met gloeiende spleten.
      const fg = g.createLinearGradient(0, w.y + w.h, 0, w.y + w.h + D);
      fg.addColorStop(0, '#222b47');
      fg.addColorStop(1, '#0b1020');
      g.fillStyle = fg;
      g.fillRect(w.x, w.y + w.h, w.w, D);
      for (let x = w.x + 8; x < w.x + w.w - 10; x += 20) {
        Glow.glow(g, x + 5, w.y + w.h + 8, 9, neon, .5);
        g.fillStyle = neon;
        g.fillRect(x + 1, w.y + w.h + 7, 8, 3);
      }
      g.fillStyle = Glow.rgba(neon, .7);
      g.fillRect(w.x, w.y + w.h + D - 2, w.w, 2);
      // Bovenkant.
      stones(g, w.x, w.y, w.w, w.h, 26, 14, '#34405f', r);
      const tg = g.createLinearGradient(w.x, w.y, w.x + w.w, w.y + w.h);
      tg.addColorStop(0, 'rgba(255, 255, 255, .12)');
      tg.addColorStop(1, 'rgba(0, 0, 0, .3)');
      g.fillStyle = tg;
      g.fillRect(w.x, w.y, w.w, w.h);
      g.fillStyle = 'rgba(255, 255, 255, .22)';
      g.fillRect(w.x, w.y, w.w, 2.5);
      g.fillRect(w.x, w.y, 2.5, w.h);
      g.fillStyle = 'rgba(0, 0, 0, .45)';
      g.fillRect(w.x, w.y + w.h - 2.5, w.w, 2.5);
      g.fillRect(w.x + w.w - 2.5, w.y, 2.5, w.h);
      if (isPillar(w)) {
        // Reactor: een ring met een gloeiende kern (die pulseert, zie arena()).
        const cx = w.x + w.w / 2, cy = w.y + w.h / 2, rr = Math.min(w.w, w.h) * .36;
        g.fillStyle = '#10162a';
        g.beginPath(); g.arc(cx, cy, rr + 4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#8796b8';
        g.lineWidth = 3;
        g.stroke();
        const core = g.createRadialGradient(cx, cy, 1, cx, cy, rr);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(.35, neon);
        core.addColorStop(1, 'rgba(0, 0, 0, .6)');
        g.fillStyle = core;
        g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0, 0, 0, .55)';
        g.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + Math.PI / 4;
          g.beginPath(); g.moveTo(cx + Math.cos(a) * rr * .45, cy + Math.sin(a) * rr * .45); g.lineTo(cx + Math.cos(a) * (rr + 4), cy + Math.sin(a) * (rr + 4)); g.stroke();
        }
      } else {
        // Lange muur: kantelen langs de randen en een energiekanaal in het midden.
        const horiz = w.w > w.h;
        const len = horiz ? w.w : w.h, thick = horiz ? w.h : w.w;
        const m = Math.min(12, thick * .3);
        for (let p = 6; p + m < len - 4; p += m * 2.2) {
          for (const side of [0, 1]) {
            const x = horiz ? w.x + p : side ? w.x + w.w - m - 2 : w.x + 2;
            const y = horiz ? (side ? w.y + w.h - m - 2 : w.y + 2) : w.y + p;
            g.fillStyle = 'rgba(0, 0, 0, .5)';
            g.fillRect(x + 2, y + 3, m, m);
            g.fillStyle = '#56648a';
            g.fillRect(x, y, m, m);
            g.fillStyle = 'rgba(255, 255, 255, .25)';
            g.fillRect(x, y, m, 1.5);
          }
        }
        const cx0 = horiz ? w.x + 8 : w.x + w.w / 2, cy0 = horiz ? w.y + w.h / 2 : w.y + 8;
        const cx1 = horiz ? w.x + w.w - 8 : cx0, cy1 = horiz ? cy0 : w.y + w.h - 8;
        g.lineCap = 'round';
        g.strokeStyle = 'rgba(0, 0, 0, .7)';
        g.lineWidth = Math.max(5, thick * .22);
        g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx1, cy1); g.stroke();
        g.strokeStyle = Glow.rgba(neon, .35);
        g.lineWidth = Math.max(4, thick * .16);
        g.stroke();
        g.strokeStyle = neon;
        g.lineWidth = 2;
        g.stroke();
        g.lineCap = 'butt';
      }
      g.strokeStyle = Glow.rgba(neon, .3);
      g.lineWidth = 5;
      g.strokeRect(w.x, w.y, w.w, w.h + D);
      g.strokeStyle = Glow.rgba(neon, .9);
      g.lineWidth = 1.5;
      g.strokeRect(w.x + .5, w.y + .5, w.w - 1, w.h - 1);
      for (const [cx, cy] of [[w.x, w.y], [w.x + w.w, w.y], [w.x, w.y + w.h], [w.x + w.w, w.y + w.h]]) Glow.glow(g, cx, cy, 13, neon, .8);
    }
  }

  // De burchtmuur rond de arena, met torens op de hoeken en posters op de voorkant van de noordmuur.
  function paintRampart(g) {
    const W = Arena.W, H = Arena.H, E = EDGE, r = rand(37);
    const stone = '#3b3550';
    // Bovenkant van de muren.
    stones(g, -E.w, -E.n, W + E.w + E.e, E.n - FACE, 40, 20, stone, r);
    stones(g, -E.w, -FACE, E.w, H + FACE + E.s, 40, 20, stone, r);
    stones(g, W, -FACE, E.e, H + FACE + E.s, 40, 20, stone, r);
    stones(g, 0, H, W, E.s, 40, 20, stone, r);
    // Kantelen langs de buitenkant.
    const merlon = (x, y, w, h) => {
      g.fillStyle = 'rgba(0, 0, 0, .5)';
      g.fillRect(x + 3, y + 4, w, h);
      g.fillStyle = '#58507a';
      g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255, 255, 255, .2)';
      g.fillRect(x, y, w, 2);
    };
    for (let x = -E.w + 6; x < W + E.e - 20; x += 40) { merlon(x, -E.n + 4, 20, 16); merlon(x, H + E.s - 20, 20, 16); }
    for (let y = -E.n + 40; y < H + E.s - 30; y += 40) { merlon(-E.w + 4, y, 16, 20); merlon(W + E.e - 20, y, 16, 20); }
    // Rand aan de binnenkant van de muren: een neonlijn.
    g.fillStyle = 'rgba(0, 0, 0, .5)';
    g.fillRect(0, H, W, 6);
    g.fillRect(0, 0, 8, H);
    g.fillRect(W - 8, 0, 8, H);
    // Voorkant van de noordmuur: grote blokken, lampen en posters.
    const fg = g.createLinearGradient(0, -FACE, 0, 0);
    fg.addColorStop(0, '#2c2740');
    fg.addColorStop(1, '#141123');
    g.fillStyle = fg;
    g.fillRect(0, -FACE, W, FACE);
    g.strokeStyle = 'rgba(0, 0, 0, .5)';
    g.lineWidth = 1.5;
    for (let y = -FACE + 25; y < 0; y += 25) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let y = -FACE, row = 0; y < 0; y += 25, row++) {
      for (let x = row % 2 ? 30 : 0; x < W; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 25); g.stroke(); }
    }
    g.fillStyle = 'rgba(255, 255, 255, .14)';
    g.fillRect(0, -FACE, W, 3);
    const d = decoNow();
    for (const a of d.art) {
      const ph = a.photo ? FACE - 30 : FACE - 26;
      const pw = ph * a.img.width / a.img.height;
      const x = a.cx - pw / 2, y = -FACE + 12;
      // Een lampje erboven met een lichtkegel.
      const cone = g.createLinearGradient(0, -FACE, 0, 0);
      cone.addColorStop(0, 'rgba(255, 236, 190, .28)');
      cone.addColorStop(1, 'rgba(255, 236, 190, 0)');
      g.fillStyle = cone;
      g.beginPath(); g.moveTo(a.cx - 10, -FACE); g.lineTo(a.cx + 10, -FACE); g.lineTo(a.cx + pw * .75, -2); g.lineTo(a.cx - pw * .75, -2); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0, 0, 0, .55)';
      g.fillRect(x + 4, y + 5, pw, ph);
      g.drawImage(a.img, x, y, pw, ph);
    }
    for (const t of d.torches) {
      // Fakkelhouder (de vlam flakkert in arena()).
      g.fillStyle = '#1a1626';
      g.fillRect(t.x - 4, t.y, 8, 26);
      g.fillStyle = '#8a7a50';
      g.beginPath(); g.moveTo(t.x - 10, t.y); g.lineTo(t.x + 10, t.y); g.lineTo(t.x + 5, t.y + 9); g.lineTo(t.x - 5, t.y + 9); g.closePath(); g.fill();
    }
    g.fillStyle = 'rgba(76, 201, 255, .9)';
    g.fillRect(0, -4, W, 3);
    // Torens op de hoeken.
    for (const b of d.beacons) {
      const R = 54;
      g.fillStyle = 'rgba(0, 0, 0, .5)';
      g.beginPath(); g.arc(b.x + 6, b.y + 8, R, 0, Math.PI * 2); g.fill();
      const tg = g.createRadialGradient(b.x - R * .3, b.y - R * .3, 4, b.x, b.y, R);
      tg.addColorStop(0, '#6a6290');
      tg.addColorStop(1, '#2a253e');
      g.fillStyle = tg;
      g.beginPath(); g.arc(b.x, b.y, R, 0, Math.PI * 2); g.fill();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.fillStyle = '#7a72a4';
        g.save();
        g.translate(b.x + Math.cos(a) * (R - 8), b.y + Math.sin(a) * (R - 8));
        g.rotate(a);
        g.fillRect(-6, -8, 12, 16);
        g.restore();
      }
      g.fillStyle = '#16122a';
      g.beginPath(); g.arc(b.x, b.y, R * .55, 0, Math.PI * 2); g.fill();
      g.strokeStyle = b.color;
      g.lineWidth = 3;
      g.stroke();
    }
  }

  // De arena één keer tekenen op een eigen canvas; daarna alleen nog kopiëren.
  // walls: false geeft alleen de vloer (voor het 3D-zicht), precies van (0, 0) tot (W, H).
  const caches = new Map();
  function arenaImage(opts = {}) {
    const walls = opts.walls !== false;
    const W = Arena.W, H = Arena.H;
    const fullW = W + (walls ? EDGE.w + EDGE.e : 0), fullH = H + (walls ? EDGE.n + EDGE.s : 0);
    // Niet groter dan nodig: een grote arena wordt iets grover getekend, zodat een Chromebook het aankan.
    const k = opts.k || Math.min(1.5, 3000 / fullW);
    const key = `${Arena.tier}/${walls}/${k}/${typeof Posters !== 'undefined' ? Posters.version : 0}`;
    if (caches.has(key)) return caches.get(key);
    for (const old of [...caches.keys()]) if (old.split('/')[1] === String(walls)) caches.delete(old);
    const c = document.createElement('canvas');
    c.width = Math.round(fullW * k);
    c.height = Math.round(fullH * k);
    const g = c.getContext('2d');
    g.fillStyle = '#05070f';
    g.fillRect(0, 0, c.width, c.height);
    g.scale(k, k);
    const ox = walls ? EDGE.w : 0, oy = walls ? EDGE.n : 0;
    g.translate(ox, oy);
    paintFloor(g);
    if (walls) {
      paintWalls(g);
      paintRampart(g);
    }
    const img = { c, ox, oy, k, key };
    caches.set(key, img);
    return img;
  }

  // Een punt langs een energiebaan (d = afstand vanaf het kamp).
  function along(l, d) {
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, ay] = l.pts[i - 1], [bx, by] = l.pts[i];
      const s = Math.hypot(bx - ax, by - ay);
      if (d <= s) return [ax + (bx - ax) * d / s, ay + (by - ay) * d / s];
      d -= s;
    }
    return l.pts[l.pts.length - 1];
  }

  // cam: { x, y, scale } — linksboven van het beeld in arena-eenheden.
  function arena(ctx, cam, w, h) {
    Glow.space(ctx, w, h, -cam.x * cam.scale * .3, -cam.y * cam.scale * .3);
    const img = arenaImage();
    const sc = cam.scale;
    ctx.drawImage(img.c, (-img.ox - cam.x) * sc, (-img.oy - cam.y) * sc, (img.c.width / img.k) * sc, (img.c.height / img.k) * sc);
    const t = performance.now() / 1000;
    const d = decoNow();
    const on = (px, py, m) => px > -m && py > -m && px < w + m && py < h + m;
    const P = (x, y) => [(x - cam.x) * sc, (y - cam.y) * sc];
    // Energie die door de banen naar het kristal stroomt.
    for (const l of d.lanes) {
      for (let j = 0; j < 3; j++) {
        const [x, y] = along(l, (t * 240 + (j * l.len) / 3) % l.len);
        const [px, py] = P(x, y);
        if (on(px, py, 40)) { Glow.glow(ctx, px, py, 26 * sc + 3, l.color, .9); Glow.glow(ctx, px, py, 8 * sc + 2, '#ffffff', .8); }
      }
    }
    // Reactoren in de pilaren pulseren.
    for (const c of d.cores) {
      const [px, py] = P(c.x, c.y);
      if (on(px, py, 60)) Glow.glow(ctx, px, py, c.r * sc * (2.2 + Math.sin(t * 3 + c.x) * .5), c.color, .55);
    }
    // Lichtjes die langs de rand van de arena lopen.
    const per = 2 * (Arena.W + Arena.H);
    for (let i = 0; i < 36; i++) {
      let dd = ((i / 36) * per + t * 140) % per, x, y;
      if (dd < Arena.W) { x = dd; y = 2; } else if ((dd -= Arena.W) < Arena.H) { x = Arena.W - 4; y = dd; } else if ((dd -= Arena.H) < Arena.W) { x = Arena.W - dd; y = Arena.H - 2; } else { x = 4; y = Arena.H - (dd - Arena.W); }
      const [px, py] = P(x, y);
      if (on(px, py, 30)) Glow.glow(ctx, px, py, 18 * sc + 4, '#bff0ff', .75);
    }
    // Fakkels flakkeren, bakens op de torens zwellen aan en af.
    for (const f of d.torches) {
      const [px, py] = P(f.x, f.y);
      if (!on(px, py, 60)) continue;
      const fl = .8 + Math.sin(t * 13 + f.x) * .1 + Math.sin(t * 7.3 + f.x * .37) * .1;
      Glow.glow(ctx, px, py - 4 * sc, 46 * sc * fl + 4, '#ff8a2a', .75 * fl);
      Glow.glow(ctx, px, py - 6 * sc, 14 * sc * fl + 2, '#fff2b0', .95);
    }
    for (const b of d.beacons) {
      const [px, py] = P(b.x, b.y);
      if (on(px, py, 100)) Glow.glow(ctx, px, py, (34 + Math.sin(t * 2 + b.x) * 8) * sc + 4, b.color, .8);
    }
    // Kampen: een krachtveld dat zacht pulseert, met een lichtrand die rondloopt.
    for (const [team, b] of Object.entries(Arena.BASES)) {
      const [px, py] = P(b.x, b.y);
      Glow.glow(ctx, px + b.w * sc / 2, py + b.h * sc / 2, Math.max(b.w, b.h) * sc * .7, TEAM[team], .12 + Math.sin(t * 2.5) * .06);
      ctx.save();
      ctx.strokeStyle = TEAM[team];
      ctx.globalAlpha = .7;
      ctx.lineWidth = 3 * sc;
      ctx.setLineDash([18 * sc, 14 * sc]);
      ctx.lineDashOffset = -t * 60 * sc;
      ctx.strokeRect(px, py, b.w * sc, b.h * sc);
      ctx.restore();
    }
    // De runenring in het midden draait langzaam.
    {
      const [px, py] = P(Arena.CRYSTAL.x, Arena.CRYSTAL.y);
      if (on(px, py, 160 * sc)) {
        ctx.save();
        ctx.translate(px, py);
        ctx.strokeStyle = 'rgba(255, 201, 74, .6)';
        ctx.lineWidth = 3 * sc;
        for (const [rr, dir] of [[126, 1], [56, -1.6]]) {
          for (let i = 0; i < 3; i++) {
            const a = t * .5 * dir + (i * Math.PI * 2) / 3;
            ctx.beginPath(); ctx.arc(0, 0, rr * sc, a, a + 1.2); ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
    // Zwevende vonkjes boven de arena.
    for (let i = 0; i < 28; i++) {
      const sx = (i * 0.618 + .13) % 1, sy = (i * 0.382 + .41) % 1;
      const x = (sx * Arena.W + t * (18 + (i % 5) * 9)) % Arena.W;
      const y = (sy * Arena.H - t * (10 + (i % 3) * 7) + Arena.H * 4) % Arena.H;
      const [px, py] = P(x + Math.sin(t + i) * 20, y);
      if (on(px, py, 20)) Glow.glow(ctx, px, py, 7 * sc + 2, i % 2 ? '#ffb46b' : '#9fe6ff', .5 + Math.sin(t * 3 + i) * .3);
    }
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
    Glow.glow(ctx, 0, 0, R * 2.4, color, .55);
    ctx.strokeStyle = Glow.rgba(color, .6);
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.35, performance.now() / 500, performance.now() / 500 + 4.4); ctx.stroke();
    ctx.rotate(a);
    // Cape achteraan, met een lichtere zoom.
    const wave = Math.sin(performance.now() / 110) * R * .12;
    const cg = ctx.createLinearGradient(0, 0, -R * 2, 0);
    cg.addColorStop(0, color);
    cg.addColorStop(1, 'rgba(10,10,30,.9)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-R * .1, -R * 1.05);
    ctx.quadraticCurveTo(-R * 1.6, -R * .9 + wave, -R * 2.1, wave);
    ctx.quadraticCurveTo(-R * 1.6, R * .9 + wave, -R * .1, R * 1.05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    // Lans.
    ctx.fillStyle = '#7d8ba3';
    ctx.fillRect(R * .2, R * .35, R * 1.3, R * .32);
    Glow.glow(ctx, R * 1.55, R * .51, R * .9, color, .8);
    ctx.fillStyle = color;
    ctx.fillRect(R * 1.3, R * .3, R * .45, R * .42);
    // Schouders en helm.
    const bg = ctx.createLinearGradient(-R, -R, R, R);
    bg.addColorStop(0, '#f4f8ff');
    bg.addColorStop(.5, '#9fb0c8');
    bg.addColorStop(1, '#3a4659');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(0, 0, R * .7, R * .95, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.lineWidth = 4 * s;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    const hg = ctx.createRadialGradient(-R * .05, -R * .2, 1, R * .1, 0, R * .6);
    hg.addColorStop(0, '#ffffff');
    hg.addColorStop(1, '#8695ad');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(R * .1, 0, R * .55, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 1.5 * s;
    ctx.stroke();
    Glow.glow(ctx, R * .48, 0, R * .7, '#4cc9ff', .8);
    ctx.fillStyle = '#bff0ff';
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
    ctx.save();
    ctx.scale(2.4, 1);
    Glow.glow(ctx, -2 * s, 0, 12 * s, color, .9, .5);
    ctx.restore();
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
    sparks.push({ x, y, flash: true, life: .25, max: .25, color });
  }
  function effects(ctx, cam, dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.life -= dt;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      const sx = (p.x - cam.x) * cam.scale;
      const sy = (p.y - cam.y) * cam.scale;
      ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
      if (p.flash) {
        Glow.glow(ctx, sx, sy, 90 * cam.scale * (1.3 - p.life / p.max), p.color, p.life / p.max);
      } else if (p.ring) {
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
        Glow.glow(ctx, sx, sy, 10 * cam.scale + 2, p.color, Math.min(1, p.life / p.max) * .7);
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

  return { TEAM, COLORS, EDGE, colorOf, arena, arenaImage, knight, tag, bullet, crystal, burst, ring, effects, moveBullets, addBullet };
})();
