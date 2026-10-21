// De prinses in de toren: tekenen van de toren, de ridders en de prinses (pixelkunst, geen afbeeldingen nodig).
const TorenDraw = (() => {
  // Kleuren van de capes, per speler.
  const COLORS = ['#ff4d6d', '#3d8bff', '#ffb703', '#22c993', '#a66bff', '#ff8c42', '#ff5fd2', '#4cc9ff'];

  // Ridder, kijkt naar rechts. C = cape (kleur van de speler), V = vizier.
  const KNIGHT = [
    '....CC......',
    '...CCC......',
    '...SSSS.....',
    '..SSSSSS....',
    '..SsVVVV....',
    '..SSSSSS....',
    '...SSSS.....',
    '.CSSGGSS....',
    'CCSSSSSSSL..',
    'CCsSSSSSsL..',
    'CC.SSSSS.L..',
    'C..SGGGS.L..',
    '...SS.SS....',
    '...Ss.sS....',
    '...BB.BB....',
    '..BBB.BBB...',
  ];
  // Benen tijdens het lopen en springen.
  const LEGS_RUN = ['...SS..SS...', '..Ss...sS...', '..BB....BB..', '.BBB....BBB.'];
  const LEGS_AIR = ['...SSSSS....', '..SS...SS...', '..BB...BB...', '.........BB.'];

  const PRINCESS = [
    '....G.G.G...',
    '....GGGGG...',
    '...YYYYYY...',
    '..YYFFFFYY..',
    '..YYEFFEYY..',
    '..YYFFFFYY..',
    '...YFFFFY...',
    '....PPPP....',
    '...PPPPPP...',
    '..PPpPPpPP..',
    '..PPPPPPPP..',
    '.PPPpPPpPPP.',
    '.PPPPPPPPPP.',
    'PPPpPPPPpPPP',
    'PPPPPPPPPPPP',
    '.PPPPPPPPPP.',
  ];

  const BASE = { S: '#c9d6e6', s: '#7d8ba3', V: '#4cc9ff', G: '#ffc94a', B: '#2b3550', L: '#ffe08a', Y: '#ffd166', F: '#ffd8b8', E: '#1a1a2e', P: '#ff5fd2', p: '#ff9be6' };

  function pixels(ctx, map, x, y, px, palette, flip) {
    for (let r = 0; r < map.length; r++) {
      const row = map[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        ctx.fillStyle = palette[ch] || BASE[ch];
        const cx = flip ? row.length - 1 - c : c;
        ctx.fillRect(Math.floor(x + cx * px), Math.floor(y + r * px), Math.ceil(px), Math.ceil(px));
      }
    }
  }

  // x, y: linksonder van de ridder op het scherm. act: 0 staan, 1 lopen, 2 in de lucht, 3 geraakt.
  function knight(ctx, x, y, w, h, color, face, act, t, alpha = 1) {
    const px = w / 12;
    const map = KNIGHT.slice();
    if (act === 1 && Math.floor(t * 10) % 2) map.splice(12, 4, ...LEGS_RUN);
    if (act === 2) map.splice(12, 4, ...LEGS_AIR);
    ctx.save();
    ctx.globalAlpha = alpha * (act === 3 && Math.floor(t * 16) % 2 ? .35 : 1);
    pixels(ctx, map, x, y - px * 16, px, { C: color }, face < 0);
    ctx.restore();
  }

  function princess(ctx, x, y, w, t) {
    const px = w / 12;
    const bob = Math.sin(t * 3) * px * .6;
    pixels(ctx, PRINCESS, x, y - px * 16 + bob, px, {}, false);
  }

  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n ^= n >>> 4;
    n = Math.imul(n, 0x27d4eb2d);
    return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
  }

  // Tekent de toren tussen wereldhoogte cam.y (onderkant scherm) en cam.y + H / scale.
  // ox: linkerrand van de toren op het scherm.
  function scene(ctx, world, cam, t) {
    const { scale, H, ox } = cam;
    const W = world.W;
    const sy = wy => H - (wy - cam.y) * scale;
    const top = cam.y + H / scale;
    const bottom = cam.y;

    // Achtergrond: donkere stenen muur met neon-voegen.
    ctx.fillStyle = '#0a1120';
    ctx.fillRect(0, 0, ctx.canvas.width, H);
    const bh = 26;
    const bw = 52;
    for (let row = Math.floor(bottom / bh); row * bh < top; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col * bw < W + bw; col++) {
        const v = hash(row * 131 + col * 7);
        const shade = 18 + Math.floor(v * 10);
        ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 24})`;
        ctx.fillRect(ox + (col * bw + off) * scale + 1, sy((row + 1) * bh) + 1, bw * scale - 2, bh * scale - 2);
      }
    }
    // Ramen met sterren en fakkels met blauwe vlammen.
    for (let k = Math.floor(bottom / 420) - 1; k * 420 < top + 420; k++) {
      if (k < 0) continue;
      const wy = k * 420 + 200;
      const left = k % 2 === 0;
      const wx = left ? 40 : W - 120;
      const x = ox + wx * scale;
      const y = sy(wy + 130);
      const ww = 80 * scale;
      const wh = 130 * scale;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, y + wh);
      ctx.lineTo(x, y + ww / 2);
      ctx.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0);
      ctx.lineTo(x + ww, y + wh);
      ctx.closePath();
      ctx.fillStyle = '#050816';
      ctx.fill();
      ctx.clip();
      for (let i = 0; i < 14; i++) {
        const sx = x + hash(k * 97 + i) * ww;
        const st = y + hash(k * 53 + i * 3) * wh;
        ctx.fillStyle = `rgba(255,255,255,${.4 + .6 * Math.abs(Math.sin(t * 1.5 + i))})`;
        ctx.fillRect(sx, st, 2, 2);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(76, 201, 255, .5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Fakkel aan de andere kant.
      const tx = ox + (left ? W - 40 : 40) * scale;
      const ty = sy(wy + 60);
      ctx.fillStyle = '#3a4560';
      ctx.fillRect(tx - 4 * scale, ty, 8 * scale, 16 * scale);
      const flick = 1 + Math.sin(t * 13 + k) * .15;
      const g = ctx.createRadialGradient(tx, ty - 6 * scale, 1, tx, ty - 6 * scale, 40 * scale * flick);
      g.addColorStop(0, 'rgba(120, 220, 255, .55)');
      g.addColorStop(1, 'rgba(76, 201, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(tx - 45 * scale, ty - 50 * scale, 90 * scale, 90 * scale);
      ctx.fillStyle = '#bff0ff';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 5 * scale, 4 * scale, 9 * scale * flick, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lasers en drones.
    for (const l of world.lasers) {
      if (l.y < bottom - 20 || l.y > top + 20) continue;
      const st = Toren.laserState(l, t);
      const y = sy(l.y);
      const x1 = ox + l.x * scale;
      const x2 = ox + (l.x + l.w) * scale;
      ctx.fillStyle = '#56607a';
      ctx.fillRect(x1 - 8 * scale, y - 7 * scale, 8 * scale, 14 * scale);
      ctx.fillRect(x2, y - 7 * scale, 8 * scale, 14 * scale);
      ctx.fillStyle = st.on || st.warn ? '#ff4d6d' : '#38425a';
      ctx.fillRect(x1 - 5 * scale, y - 2 * scale, 3 * scale, 4 * scale);
      ctx.fillRect(x2 + 2 * scale, y - 2 * scale, 3 * scale, 4 * scale);
      if (st.on) {
        ctx.save();
        ctx.shadowColor = '#ff4d6d';
        ctx.shadowBlur = 16;
        ctx.fillStyle = 'rgba(255, 77, 109, .9)';
        ctx.fillRect(x1, y - 3 * scale, x2 - x1, 6 * scale);
        ctx.fillStyle = '#ffe1e7';
        ctx.fillRect(x1, y - 1 * scale, x2 - x1, 2 * scale);
        ctx.restore();
      } else {
        ctx.setLineDash([6, 8]);
        ctx.strokeStyle = st.warn ? 'rgba(255, 77, 109, .8)' : 'rgba(255, 77, 109, .25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    for (const d of world.drones) {
      if (d.y < bottom - 30 || d.y > top + 30) continue;
      const x = ox + Toren.droneX(d, t, W) * scale;
      const y = sy(d.y);
      const r = d.r * scale;
      ctx.save();
      ctx.shadowColor = '#4cc9ff';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#1b2438';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#4cc9ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r * .45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff4d6d';
      ctx.beginPath();
      ctx.arc(x, y, r * .35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Platforms: stenen richels met een gloeiende rand.
    for (const p of world.platforms) {
      if (p.y < bottom - 40 || p.y > top + 10) continue;
      const x = ox + p.x * scale;
      const y = sy(p.y);
      const w = p.w * scale;
      const th = (p.floor === 0 ? 40 : 16) * scale;
      ctx.fillStyle = '#24304a';
      ctx.fillRect(x, y, w, th);
      ctx.fillStyle = '#3a4a66';
      ctx.fillRect(x, y, w, 5 * scale);
      for (let bx = 0; bx < p.w; bx += 26) ctx.fillRect(x + bx * scale, y + 6 * scale, 1, th - 6 * scale);
      ctx.save();
      ctx.shadowColor = p.floor === world.FLOORS ? '#ffc94a' : '#4cc9ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.floor === world.FLOORS ? '#ffc94a' : '#4cc9ff';
      ctx.fillRect(x, y, w, 2);
      ctx.restore();
      if (p.floor > 0 && p.floor % 10 === 0 && p.floor < world.FLOORS) {
        ctx.fillStyle = 'rgba(255, 201, 74, .9)';
        ctx.font = `800 ${12 * scale}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(p.floor, x + w / 2, y + 13 * scale);
      }
      if (p.spikes) {
        ctx.fillStyle = '#ff4d6d';
        ctx.save();
        ctx.shadowColor = '#ff4d6d';
        ctx.shadowBlur = 8;
        const n = 4;
        const sw = p.spikes.w / n;
        for (let i = 0; i < n; i++) {
          const sx = ox + (p.spikes.x + i * sw) * scale;
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.lineTo(sx + sw * scale / 2, y - 14 * scale);
          ctx.lineTo(sx + sw * scale, y);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // De torenkamer met de prinses.
    if (world.top < top + 60) {
      const y = sy(world.top);
      const g = ctx.createRadialGradient(ox + W / 2 * scale, y - 30 * scale, 4, ox + W / 2 * scale, y - 30 * scale, 140 * scale);
      g.addColorStop(0, 'rgba(255, 201, 74, .35)');
      g.addColorStop(1, 'rgba(255, 201, 74, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(ox, y - 200 * scale, W * scale, 200 * scale);
      princess(ctx, ox + (W / 2 - 15) * scale, y, 30 * scale, t);
      ctx.fillStyle = '#ffc94a';
      ctx.font = `800 ${11 * scale}px Orbitron, sans-serif`;
      ctx.textAlign = 'center';
      if (Math.floor(t * 2) % 2) ctx.fillText('HELP!', ox + W / 2 * scale, y - 46 * scale);
    }

    // Zijmuren van de toren.
    ctx.fillStyle = '#121a2c';
    ctx.fillRect(0, 0, ox, H);
    ctx.fillRect(ox + W * scale, 0, ctx.canvas.width - ox - W * scale, H);
    ctx.fillStyle = 'rgba(76, 201, 255, .6)';
    ctx.fillRect(ox - 2, 0, 2, H);
    ctx.fillRect(ox + W * scale, 0, 2, H);
  }

  return { COLORS, knight, princess, scene };
})();
