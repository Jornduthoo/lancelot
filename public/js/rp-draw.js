// Robopaarden tekenen: het robotpaard (opzij, van achter en van voor, met galop), de baan van bovenaf
// en het kleine paardje op de kaart van het bord. Alles wordt één keer gebakken en daarna alleen nog gekopieerd.
// Gebruikt RpWorld en (als die er is) Avatar voor het hoofd van de ruiter.
const RpDraw = (() => {
  const Wd = RpWorld;
  const BW = 200, BH = 170; // tekenvak van een paard; de hoeven staan op y = 160
  const FRAMES = 4;

  // ---------- Geschilderde plaatjes voor de kaart van het bord ----------
  // Zolang ze laden, tekent de kaart zich met code; onArt meldt wanneer opnieuw bakken mooier wordt.
  const ART = {};
  const onArt = [];
  if (typeof Image !== 'undefined') {
    for (const n of ['gras', 'kroon-1', 'kroon-2', 'kroon-3', 'burcht']) {
      const img = new Image();
      img.onload = () => { ART[n] = img; for (const f of onArt) f(n); };
      img.src = `/img/robopaarden/${n}.webp`;
    }
  }

  // ---------- Kleuren ----------
  function rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  function shade(hex, f) {
    const [r, g, b] = rgb(hex);
    const c = v => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f)));
    return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
  }
  const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r}, ${g}, ${b}, ${a})`; };
  const colors = look => ({ body: Wd.LOOK.romp[look.romp].c, neon: Wd.LOOK.neon[look.neon].c });

  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function glowLine(ctx, color, w, draw) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(color, .28);
    ctx.lineWidth = w * 3;
    ctx.beginPath(); draw(); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath(); draw(); ctx.stroke();
    ctx.restore();
  }
  function dot(ctx, x, y, r, color, glow = true) {
    if (glow) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
      g.addColorStop(0, rgba(color, .7));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r * .55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.globalAlpha = .75; ctx.fill(); ctx.globalAlpha = 1;
  }

  // Een metalen vlak: licht van boven, met een patroon erover (binnen het vlak geknipt).
  function plate(ctx, path, look, y0, y1) {
    const { body, neon } = colors(look);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, shade(body, 1.35));
    g.addColorStop(.45, body);
    g.addColorStop(1, shade(body, .45));
    ctx.save();
    path();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    const p = look.patroon;
    ctx.globalAlpha = .32;
    if (p === 1) {
      ctx.fillStyle = neon;
      for (let x = -40; x < 260; x += 26) poly(ctx, [x, y0 - 10, x + 9, y0 - 10, x - 31, y1 + 10, x - 40, y1 + 10], neon);
    } else if (p === 2) {
      ctx.fillStyle = shade(body, .5);
      for (let x = 0; x < 220; x += 16) for (let y = y0 - 16; y < y1 + 16; y += 16) if (((x + y) / 16) % 2 === 0) ctx.fillRect(x, y, 16, 16);
    } else if (p === 3) {
      ctx.strokeStyle = neon;
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = .55;
      for (let x = 20, k = 0; x < 200; x += 24, k++) {
        const y = (y0 + y1) / 2 + (k % 2 ? -4 : 4);
        ctx.beginPath();
        if (k % 3 === 0) { ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.moveTo(x, y - 7); ctx.lineTo(x + 6, y - 2); }
        else if (k % 3 === 1) { ctx.moveTo(x - 5, y + 7); ctx.lineTo(x, y - 7); ctx.lineTo(x + 5, y + 7); }
        else { ctx.moveTo(x - 5, y - 7); ctx.lineTo(x + 5, y + 7); ctx.moveTo(x + 5, y - 7); ctx.lineTo(x - 5, y + 7); }
        ctx.stroke();
      }
    } else if (p === 4) {
      ctx.globalAlpha = .7;
      for (let x = 10; x < 200; x += 52) poly(ctx, [x, y0, x + 14, y0, x + 6, (y0 + y1) / 2, x + 18, (y0 + y1) / 2, x - 2, y1, x + 4, (y0 + y1) / 2 + 2, x - 6, (y0 + y1) / 2 + 2], neon);
    }
    ctx.globalAlpha = 1;
    // Glanslijn bovenaan
    ctx.fillStyle = 'rgba(255, 255, 255, .18)';
    ctx.fillRect(0, y0, 260, (y1 - y0) * .16);
    ctx.restore();
    ctx.save();
    path();
    ctx.strokeStyle = 'rgba(8, 10, 22, .75)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  function head(ctx, av, cx, top, hw, back) {
    if (av && typeof Avatar !== 'undefined') {
      try {
        const img = Avatar.sprite(av, { back, k: 8 });
        const hh = hw * (8 / 12);
        ctx.drawImage(img, 0, 0, img.width, img.height * (8 / 17), cx - hw / 2, top - hh, hw, hh);
        return;
      } catch {}
    }
    ctx.fillStyle = '#c9d2e6';
    ctx.beginPath(); ctx.arc(cx, top - hw * .34, hw * .4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(8, 10, 22, .7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!back) { ctx.fillStyle = '#4cc9ff'; ctx.fillRect(cx - hw * .26, top - hw * .42, hw * .52, hw * .1); }
  }

  // Een poot: heup, knie, hoef. ang = zwaai van het bovenbeen, bend = hoe ver de knie plooit.
  function leg(ctx, x, y, ang, bend, look, far, front) {
    const { body, neon } = colors(look);
    const k1x = x + Math.sin(ang) * 30, k1y = y + Math.cos(ang) * 30;
    const a2 = ang + (front ? -bend : bend);
    const hx = k1x + Math.sin(a2) * 33, hy = k1y + Math.cos(a2) * 33;
    ctx.lineCap = 'round';
    ctx.strokeStyle = shade(body, far ? .42 : .8);
    ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(k1x, k1y); ctx.stroke();
    ctx.strokeStyle = shade('#5a6280', far ? .55 : 1);
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(k1x, k1y); ctx.lineTo(hx, hy); ctx.stroke();
    // Zuiger langs het onderbeen
    ctx.strokeStyle = far ? 'rgba(160, 170, 200, .4)' : '#c9d2e6';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(k1x + 4, k1y); ctx.lineTo(hx + 3, hy - 4); ctx.stroke();
    ctx.fillStyle = far ? '#2a2f48' : '#8b93b5';
    ctx.beginPath(); ctx.arc(k1x, k1y, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = far ? rgba(neon, .5) : neon;
    ctx.beginPath(); ctx.arc(k1x, k1y, 2.6, 0, Math.PI * 2); ctx.fill();
    // Hoef met neongloed
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a2 * .5);
    poly(ctx, [-8, -3, 8, -3, 10, 6, -10, 6], far ? '#1e2236' : '#2b3150');
    ctx.fillStyle = far ? rgba(neon, .45) : neon;
    ctx.fillRect(-9, 4, 18, 3);
    ctx.restore();
  }

  // Manen of staart: vlammen, kabels, kristal of een hanenkam, langs een reeks punten.
  function hair(ctx, pts, look, size, t, tail) {
    const { neon, body } = colors(look);
    let kind = look.manen;
    if (kind === 4) { if (!tail) return; kind = 1; }
    if (tail && kind === 3) kind = 1;
    for (let i = 0; i < pts.length; i++) {
      const [x, y, nx, ny] = pts[i];
      const wob = Math.sin(t * 9 + i * 1.3) * size * .18;
      const len = size * (tail ? 1 : .8 + .4 * Math.sin(i * 2.1 + 1));
      if (kind === 0) {
        const g = ctx.createLinearGradient(x, y, x + nx * len, y + ny * len);
        g.addColorStop(0, '#fff6c8');
        g.addColorStop(.35, neon);
        g.addColorStop(1, rgba(neon, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - ny * size * .3, y + nx * size * .3);
        ctx.quadraticCurveTo(x + nx * len * .6 + wob, y + ny * len * .6, x + nx * len + wob * 1.5, y + ny * len - size * .2);
        ctx.quadraticCurveTo(x + nx * len * .4, y + ny * len * .5 + wob, x + ny * size * .3, y - nx * size * .3);
        ctx.fill();
      } else if (kind === 1) {
        glowLine(ctx, i % 2 ? neon : shade(neon, .7), 2.6, () => {
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + nx * len * .5 + wob, y + ny * len * .5 + Math.abs(wob), x + nx * len + wob * 1.4, y + ny * len + size * .1);
        });
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x + nx * len + wob * 1.4, y + ny * len + size * .1, 2.2, 0, Math.PI * 2); ctx.fill();
      } else if (kind === 2) {
        const tip = [x + nx * len * .9, y + ny * len * .9];
        poly(ctx, [x - ny * size * .25, y + nx * size * .25, tip[0], tip[1], x + ny * size * .25, y - nx * size * .25], rgba(neon, .75), '#ffffff', 1.2);
        poly(ctx, [x, y, tip[0], tip[1], x + ny * size * .25, y - nx * size * .25], 'rgba(255, 255, 255, .35)');
      } else {
        poly(ctx, [x - ny * size * .28, y + nx * size * .28, x + nx * len * .75, y + ny * len * .75, x + ny * size * .28, y - nx * size * .28], shade(body, .55), neon, 1.6);
      }
    }
  }

  // ---------- Het paard opzij (neus naar rechts) ----------
  function side(ctx, look, p, t, av, opts = {}) {
    const { body, neon } = colors(look);
    const bob = Math.sin(p * Math.PI * 2) * 3;
    const tw = (o, amp = .62) => Math.sin((p + o) * Math.PI * 2) * amp;
    const bend = o => .25 + Math.max(0, Math.cos((p + o) * Math.PI * 2)) * .95;
    ctx.save();
    // Schaduw
    ctx.fillStyle = 'rgba(0, 0, 0, .35)';
    ctx.beginPath(); ctx.ellipse(98, 161, 70, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, bob);
    // Vleugels achteraan
    if (look.extra === 2) wings(ctx, look, 104, 68, p, true);
    // Verre poten
    leg(ctx, 64, 98, tw(.6), bend(.6), look, true, false);
    leg(ctx, 130, 96, tw(.1), bend(.1), look, true, true);
    // Staart
    const tail = [];
    for (let i = 0; i < 4; i++) tail.push([48 - i * 2, 72 + i * 3, -.85, .5 + i * .08]);
    hair(ctx, tail, look, 34, t + p, true);
    // Raketten
    if (look.extra === 4) {
      poly(ctx, [40, 70, 62, 66, 62, 80, 40, 82], '#3a4060', neon, 1.5);
      ctx.fillStyle = neon;
      ctx.fillRect(36, 72, 5, 8);
    }
    // Romp
    plate(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(52, 70);
      ctx.bezierCurveTo(60, 56, 120, 54, 140, 64);
      ctx.bezierCurveTo(152, 72, 150, 100, 136, 106);
      ctx.bezierCurveTo(110, 114, 72, 114, 56, 104);
      ctx.bezierCurveTo(44, 96, 44, 80, 52, 70);
      ctx.closePath();
    }, look, 56, 112);
    // Naden en een neonstrip langs de buik
    ctx.strokeStyle = 'rgba(8, 10, 22, .55)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(84, 58); ctx.quadraticCurveTo(80, 86, 86, 112); ctx.moveTo(116, 58); ctx.quadraticCurveTo(120, 86, 114, 112); ctx.stroke();
    glowLine(ctx, neon, 3, () => { ctx.moveTo(60, 102); ctx.quadraticCurveTo(98, 114, 136, 100); });
    dot(ctx, 100, 84, 4, neon);
    // Hals en hoofd
    plate(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(124, 70); ctx.lineTo(150, 24); ctx.lineTo(168, 26); ctx.lineTo(150, 82); ctx.closePath();
    }, look, 22, 84);
    plate(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(150, 16); ctx.lineTo(171, 16); ctx.lineTo(194, 36); ctx.lineTo(194, 46); ctx.lineTo(176, 50); ctx.lineTo(154, 40); ctx.closePath();
    }, look, 14, 50);
    // Snuit met ademgaten
    ctx.fillStyle = shade(body, .4);
    ctx.fillRect(184, 40, 9, 5);
    ctx.fillStyle = neon;
    ctx.fillRect(188, 41, 3, 2);
    // Oren
    poly(ctx, [154, 18, 158, 2, 164, 18], shade(body, .85), 'rgba(8,10,22,.7)', 1.5);
    poly(ctx, [158, 15, 159, 7, 161, 15], neon);
    eyesSide(ctx, look, 172, 27);
    if (look.extra === 1) horn(ctx, neon, 166, 15, 186, -10);
    if (look.extra === 3) antennas(ctx, neon, [[158, 4, 152, -12], [161, 4, 170, -10]]);
    // Manen langs de hals
    const mane = [];
    for (let i = 0; i < 6; i++) { const k = i / 5; mane.push([150 - k * 26, 20 + k * 48, -.9, -.2 + k * .2]); }
    hair(ctx, mane, look, 22, t + p, false);
    // Nabije poten
    leg(ctx, 70, 100, tw(.5), bend(.5), look, false, false);
    leg(ctx, 136, 98, tw(0), bend(0), look, false, true);
    // De ruiter
    if (opts.rider !== false) {
      ctx.fillStyle = '#c9d6e6';
      poly(ctx, [86, 66, 108, 66, 112, 30, 92, 30], '#c9d6e6', 'rgba(8,10,22,.7)', 1.5);
      poly(ctx, [94, 60, 106, 60, 108, 36, 96, 36], neon);
      ctx.strokeStyle = '#9aa6c8';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(98, 64); ctx.lineTo(104, 84); ctx.lineTo(98, 96); ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(104, 40); ctx.lineTo(124, 52); ctx.lineTo(140, 44); ctx.stroke();
      head(ctx, av, 102, 31, 30, false);
    }
    if (look.extra === 2) wings(ctx, look, 98, 66, p, false);
    ctx.restore();
  }

  function eyesSide(ctx, look, x, y) {
    const { neon } = colors(look);
    if (look.ogen === 0) { glowLine(ctx, neon, 4, () => { ctx.moveTo(x - 10, y); ctx.lineTo(x + 12, y + 3); }); return; }
    if (look.ogen === 2) { dot(ctx, x + 2, y + 1, 5.5, neon); return; }
    if (look.ogen === 3) { poly(ctx, [x - 7, y - 4, x + 8, y + 1, x - 5, y + 4], neon); dot(ctx, x, y + 1, 2.5, neon); return; }
    dot(ctx, x, y + 1, 3.8, neon);
  }
  function horn(ctx, neon, x0, y0, x1, y1) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, neon);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0 - 4, y0); ctx.lineTo(x1, y1); ctx.lineTo(x0 + 4, y0 + 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(neon, .5);
    ctx.lineWidth = 1;
    for (let k = .2; k < .9; k += .2) { ctx.beginPath(); ctx.moveTo(x0 + (x1 - x0) * k - 3, y0 + (y1 - y0) * k); ctx.lineTo(x0 + (x1 - x0) * k + 3, y0 + (y1 - y0) * k + 1); ctx.stroke(); }
  }
  function antennas(ctx, neon, list) {
    for (const [x0, y0, x1, y1] of list) {
      ctx.strokeStyle = '#9aa6c8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      dot(ctx, x1, y1, 3.5, neon);
    }
  }
  function wings(ctx, look, x, y, p, far) {
    const { neon, body } = colors(look);
    const flap = Math.sin(p * Math.PI * 2) * .35;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-.4 + flap + (far ? -.15 : 0));
    ctx.globalAlpha = far ? .55 : .95;
    for (let i = 0; i < 4; i++) {
      const len = 70 - i * 12;
      poly(ctx, [0, 0, -len, -14 - i * 10, -len + 8, -4 - i * 10, 0, 6], i % 2 ? rgba(neon, .55) : shade(body, .7), neon, 1.4);
    }
    ctx.restore();
  }

  // ---------- Van achter (je eigen paard) ----------
  function back(ctx, look, p, t, av, opts = {}) {
    const { body, neon } = colors(look);
    const bob = Math.sin(p * Math.PI * 2) * 3;
    const lift = o => Math.max(0, Math.sin((p + o) * Math.PI * 2));
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, .38)';
    ctx.beginPath(); ctx.ellipse(100, 161, 56, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, bob);
    if (look.extra === 2) for (const s of [-1, 1]) { ctx.save(); ctx.translate(100, 0); ctx.scale(s, 1); ctx.translate(-100, 0); wingsBack(ctx, look, p); ctx.restore(); }
    // Voorpoten in de verte, tussen de achterpoten
    for (const [x, o] of [[88, .1], [112, .6]]) {
      const l = lift(o);
      ctx.strokeStyle = shade(body, .4);
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, 96); ctx.lineTo(x, 146 - l * 16); ctx.stroke();
      ctx.fillStyle = rgba(neon, .55);
      ctx.fillRect(x - 6, 146 - l * 16, 12, 3);
    }
    // Hals en hoofd boven de rug
    plate(ctx, () => { ctx.beginPath(); ctx.moveTo(86, 64); ctx.lineTo(92, 20); ctx.lineTo(108, 20); ctx.lineTo(114, 64); ctx.closePath(); }, look, 18, 64);
    poly(ctx, [90, 22, 92, 4, 98, 20], shade(body, .8));
    poly(ctx, [102, 20, 108, 4, 110, 22], shade(body, .8));
    if (look.extra === 1) horn(ctx, neon, 100, 18, 100, -6);
    if (look.extra === 3) antennas(ctx, neon, [[93, 6, 84, -10], [107, 6, 116, -10]]);
    const mane = [];
    for (let i = 0; i < 5; i++) mane.push([100, 22 + i * 9, Math.sin(i * 2.3) * .4, -1]);
    if (look.manen !== 4) hair(ctx, mane, look, 16, t + p, false);
    // Achterpoten
    for (const [x, o, s] of [[72, .5, -1], [128, 0, 1]]) {
      const l = lift(o);
      const ky = 124 - l * 10;
      ctx.strokeStyle = shade(body, .78);
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, 100); ctx.lineTo(x + s * 3, ky); ctx.stroke();
      ctx.strokeStyle = '#5a6280';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x + s * 3, ky); ctx.lineTo(x + s * 2, 152 - l * 22); ctx.stroke();
      ctx.fillStyle = '#8b93b5';
      ctx.beginPath(); ctx.arc(x + s * 3, ky, 6.5, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [x + s * 2 - 9, 150 - l * 22, x + s * 2 + 9, 150 - l * 22, x + s * 2 + 10, 158 - l * 22, x + s * 2 - 10, 158 - l * 22], '#2b3150');
      ctx.fillStyle = neon;
      ctx.fillRect(x + s * 2 - 9, 156 - l * 22, 18, 3);
    }
    // De achterhand: breed en rond
    plate(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(58, 80);
      ctx.bezierCurveTo(56, 56, 144, 56, 142, 80);
      ctx.bezierCurveTo(146, 104, 126, 118, 100, 118);
      ctx.bezierCurveTo(74, 118, 54, 104, 58, 80);
      ctx.closePath();
    }, look, 58, 118);
    ctx.strokeStyle = 'rgba(8, 10, 22, .5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(100, 60); ctx.lineTo(100, 116); ctx.stroke();
    glowLine(ctx, neon, 3, () => { ctx.moveTo(64, 98); ctx.quadraticCurveTo(100, 116, 136, 98); });
    // Achterlichten
    dot(ctx, 76, 82, 4.5, '#ff4d6d');
    dot(ctx, 124, 82, 4.5, '#ff4d6d');
    if (look.extra === 4) for (const x of [70, 130]) { poly(ctx, [x - 8, 62, x + 8, 62, x + 7, 80, x - 7, 80], '#3a4060', neon, 1.5); dot(ctx, x, 82, 4, neon); }
    // Staart
    const tail = [];
    for (let i = 0; i < 3; i++) tail.push([96 + i * 4, 76 + i * 2, (i - 1) * .3, 1]);
    hair(ctx, tail, look, 30, t + p, true);
    // De ruiter van achter
    if (opts.rider !== false) {
      poly(ctx, [86, 70, 114, 70, 112, 36, 88, 36], '#c9d6e6', 'rgba(8,10,22,.7)', 1.5);
      poly(ctx, [92, 66, 108, 66, 107, 42, 93, 42], neon);
      ctx.strokeStyle = '#9aa6c8';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(88, 68); ctx.lineTo(70, 84); ctx.moveTo(112, 68); ctx.lineTo(130, 84); ctx.stroke();
      head(ctx, av, 100, 37, 30, true);
    }
    ctx.restore();
  }
  function wingsBack(ctx, look, p) {
    const { neon, body } = colors(look);
    const flap = Math.sin(p * Math.PI * 2) * .3;
    ctx.save();
    ctx.translate(84, 62);
    ctx.rotate(.15 - flap);
    for (let i = 0; i < 4; i++) {
      const len = 72 - i * 12;
      poly(ctx, [0, 0, -len, -20 - i * 9, -len + 8, -8 - i * 9, 0, 8], i % 2 ? rgba(neon, .55) : shade(body, .7), neon, 1.4);
    }
    ctx.restore();
  }

  // ---------- Van voor ----------
  function front(ctx, look, p, t, av, opts = {}) {
    const { body, neon } = colors(look);
    const bob = Math.sin(p * Math.PI * 2) * 3;
    const lift = o => Math.max(0, Math.sin((p + o) * Math.PI * 2));
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, .38)';
    ctx.beginPath(); ctx.ellipse(100, 161, 52, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, bob);
    if (look.extra === 2) for (const s of [-1, 1]) { ctx.save(); ctx.translate(100, 0); ctx.scale(s, 1); ctx.translate(-100, 0); wingsBack(ctx, look, p); ctx.restore(); }
    // De ruiter achter het hoofd
    if (opts.rider !== false) {
      poly(ctx, [84, 74, 116, 74, 113, 40, 87, 40], '#c9d6e6', 'rgba(8,10,22,.7)', 1.5);
      poly(ctx, [92, 70, 108, 70, 107, 46, 93, 46], neon);
      head(ctx, av, 100, 41, 30, false);
    }
    // Borst
    plate(ctx, () => { ctx.beginPath(); ctx.moveTo(66, 84); ctx.bezierCurveTo(66, 64, 134, 64, 134, 84); ctx.lineTo(128, 116); ctx.lineTo(72, 116); ctx.closePath(); }, look, 64, 116);
    glowLine(ctx, neon, 3, () => { ctx.moveTo(76, 108); ctx.lineTo(100, 114); ctx.lineTo(124, 108); });
    // Voorpoten
    for (const [x, o] of [[80, 0], [120, .5]]) {
      const l = lift(o);
      ctx.strokeStyle = shade(body, .78);
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, 130 - l * 12); ctx.stroke();
      ctx.strokeStyle = '#5a6280';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x, 130 - l * 12); ctx.lineTo(x, 152 - l * 24); ctx.stroke();
      ctx.fillStyle = '#8b93b5';
      ctx.beginPath(); ctx.arc(x, 130 - l * 12, 6.5, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [x - 9, 150 - l * 24, x + 9, 150 - l * 24, x + 10, 158 - l * 24, x - 10, 158 - l * 24], '#2b3150');
      ctx.fillStyle = neon;
      ctx.fillRect(x - 9, 156 - l * 24, 18, 3);
    }
    // Het hoofd, recht naar je toe
    plate(ctx, () => { ctx.beginPath(); ctx.moveTo(84, 28); ctx.lineTo(116, 28); ctx.lineTo(112, 84); ctx.lineTo(100, 92); ctx.lineTo(88, 84); ctx.closePath(); }, look, 24, 92);
    poly(ctx, [84, 30, 86, 8, 94, 28], shade(body, .85), 'rgba(8,10,22,.7)', 1.5);
    poly(ctx, [106, 28, 114, 8, 116, 30], shade(body, .85), 'rgba(8,10,22,.7)', 1.5);
    ctx.fillStyle = shade(body, .4);
    ctx.fillRect(92, 80, 5, 5);
    ctx.fillRect(103, 80, 5, 5);
    if (look.ogen === 0) glowLine(ctx, neon, 5, () => { ctx.moveTo(88, 46); ctx.lineTo(112, 46); });
    else if (look.ogen === 2) dot(ctx, 100, 46, 7, neon);
    else if (look.ogen === 3) { poly(ctx, [86, 40, 97, 46, 87, 50], neon); poly(ctx, [114, 40, 103, 46, 113, 50], neon); }
    else { dot(ctx, 91, 46, 4.5, neon); dot(ctx, 109, 46, 4.5, neon); }
    if (look.extra === 1) horn(ctx, neon, 100, 28, 100, -2);
    if (look.extra === 3) antennas(ctx, neon, [[88, 10, 80, -8], [112, 10, 120, -8]]);
    if (look.manen !== 4 && look.manen !== 3) {
      const mane = [];
      for (let i = 0; i < 3; i++) mane.push([94 + i * 6, 28, (i - 1) * .5, -1]);
      hair(ctx, mane, look, 14, t + p, false);
    } else if (look.manen === 3) poly(ctx, [96, 28, 100, 8, 104, 28], shade(body, .55), neon, 1.5);
    ctx.restore();
  }

  const VIEWS = { side, back, front };

  // ---------- Gebakken plaatjes ----------
  // Een paard per kijkrichting en galopbeeld, in twee maten (groot voor je eigen paard en dichtbij).
  const cache = new Map();
  let cacheCount = 0;
  function keyOf(look) { return Wd.LOOK_KEYS.map(k => look[k]).join('.'); }
  const avKeys = new WeakMap();
  const avKey = av => {
    if (!av || typeof av !== 'object') return '';
    let k = avKeys.get(av);
    if (!k) { k = JSON.stringify(av); avKeys.set(av, k); }
    return k;
  };
  function sprite(look, av, view, frame, big) {
    const key = `${keyOf(look)}|${avKey(av)}|${view}|${frame}|${big ? 1 : 0}`;
    let c = cache.get(key);
    if (c) return c;
    if (cacheCount > 900) { cache.clear(); cacheCount = 0; }
    const scale = big ? 1.5 : .8;
    c = document.createElement('canvas');
    c.width = Math.round(BW * scale);
    c.height = Math.round(BH * scale + 30 * scale);
    const g = c.getContext('2d');
    g.scale(scale, scale);
    g.translate(0, 30);
    VIEWS[view](g, look, frame / FRAMES, frame * .35, av);
    cache.set(key, c);
    cacheCount++;
    return c;
  }
  // Teken een paard met de hoeven op (x, y), w breed. dir -1 = opzij met de neus naar links.
  function horse(ctx, x, y, w, look, av, view, frame, dir = 1, big = false) {
    const img = sprite(look, av, view, frame % FRAMES, big);
    const h = (w * img.height) / img.width;
    const foot = (190 / 200) * h; // de hoeven staan op y = 160 + 30 van 200
    if (dir < 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -foot, w, h);
      ctx.restore();
    } else ctx.drawImage(img, x - w / 2, y - foot, w, h);
  }
  // Live tekenen (voor de wachtzaal, waar het paard steeds verandert).
  function live(ctx, look, av, view, p, t, x, y, scale) {
    ctx.save();
    ctx.translate(x - (BW / 2) * scale, y - 160 * scale);
    ctx.scale(scale, scale);
    VIEWS[view](ctx, look, p, t, av);
    ctx.restore();
  }

  // ---------- De baan van bovenaf ----------
  const rand = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  function pathLine(g, path, k, from = path.first, to = path.last) {
    g.beginPath();
    const pre = Wd.PREV[path.first], post = Wd.NEXT[path.last];
    if (!path.closed && pre >= 0) g.moveTo(Wd.X[pre] * k, Wd.Y[pre] * k);
    else g.moveTo(Wd.X[from] * k, Wd.Y[from] * k);
    for (let i = from; i <= to; i++) g.lineTo(Wd.X[i] * k, Wd.Y[i] * k);
    if (path.closed) g.closePath();
    else if (post >= 0) g.lineTo(Wd.X[post] * k, Wd.Y[post] * k);
  }
  function onMain(x, y, p) {
    for (const end of [p.from, p.to]) {
      for (let m = -25, i = Wd.step(end, -25); m <= 25; m++, i = Wd.NEXT[i]) {
        if ((Wd.X[i] - x) ** 2 + (Wd.Y[i] - y) ** 2 < (Wd.HALF[i] + 4) ** 2) return true;
      }
    }
    return false;
  }
  const EDGE = { hoofd: '#4cf0ff', burcht: '#ffd34f', kloof: '#ff8c42', bos: null };

  // k = pixels per baaneenheid. secret: het bospad lichter tonen (op het bord wil je het geheim niet verklappen).
  function mapImage(k, opts = {}) {
    const c = document.createElement('canvas');
    c.width = Math.round(Wd.W * k);
    c.height = Math.round(Wd.H * k);
    const g = c.getContext('2d');
    // Grasland in de schemering, met vlekken.
    const bg = g.createLinearGradient(0, 0, 0, c.height);
    bg.addColorStop(0, '#16352f');
    bg.addColorStop(1, '#0f2a2a');
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);
    if (ART.gras) {
      // Geschilderd gras als tegelpatroon, met de verloop er licht overheen voor diepte.
      const pat = g.createPattern(ART.gras, 'repeat');
      const t = (1400 * k) / ART.gras.width;
      if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(t));
      g.fillStyle = pat;
      g.fillRect(0, 0, c.width, c.height);
      g.globalAlpha = .35;
      g.fillStyle = bg;
      g.fillRect(0, 0, c.width, c.height);
      g.globalAlpha = 1;
    }
    for (let i = 0; i < (ART.gras ? 0 : 900); i++) {
      g.fillStyle = rand() < .5 ? 'rgba(40, 90, 60, .22)' : 'rgba(8, 20, 24, .25)';
      g.beginPath(); g.arc(rand() * c.width, rand() * c.height, (20 + rand() * 120) * k * 2, 0, Math.PI * 2); g.fill();
    }
    // Het burchtmeer met een eiland.
    const lake = (cx, cy, rx, ry, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(cx * k, cy * k, rx * k, ry * k, 0, 0, Math.PI * 2); g.fill(); };
    lake(4900, 3350, 2050, 1000, '#1b4a4a');
    const water = g.createRadialGradient(4900 * k, 3350 * k, 100 * k, 4900 * k, 3350 * k, 2000 * k);
    water.addColorStop(0, '#2a7aa0');
    water.addColorStop(1, '#123e5c');
    g.fillStyle = water;
    g.beginPath(); g.ellipse(4900 * k, 3350 * k, 1950 * k, 920 * k, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(160, 230, 255, .25)';
    g.lineWidth = Math.max(1, 6 * k);
    for (let i = 0; i < 40; i++) {
      const a = rand() * Math.PI * 2, r = rand() * .85;
      const x = 4900 + Math.cos(a) * 1950 * r, y = 3350 + Math.sin(a) * 920 * r;
      g.beginPath(); g.moveTo((x - 60) * k, y * k); g.quadraticCurveTo(x * k, (y - 14) * k, (x + 60) * k, y * k); g.stroke();
    }
    lake(4900, 3350, 520, 330, '#3d5a3a');
    lake(4900, 3350, 430, 260, '#596a76');
    // De bomen van bovenaf, op dezelfde plekken als in 3D.
    if (opts.trees && ART['kroon-1']) {
      for (const t of opts.trees) {
        const img = ART[t.v === 0 ? 'kroon-1' : 'kroon-2'] || ART['kroon-1'];
        const d = t.h * .85 * k;
        g.drawImage(img, t.x * k - d / 2, t.y * k - d / 2, d, d);
      }
    }
    if (ART.burcht) {
      const bw = 620 * k, bh = bw * (ART.burcht.height / ART.burcht.width);
      g.drawImage(ART.burcht, 4900 * k - bw / 2, 3350 * k - bh / 2, bw, bh);
    }
    // Zijwegen en hoofdbaan: eerst de bermen, dan de wegen, dan de lijnen.
    const order = [...Wd.PATHS].sort((a, b) => (a.key === 'hoofd' ? 1 : 0) - (b.key === 'hoofd' ? 1 : 0));
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (const p of order) {
      pathLine(g, p, k);
      g.strokeStyle = p.key === 'bos' ? '#203a26' : '#3b4a32';
      g.lineWidth = 2 * (p.half + Wd.OFF) * k;
      g.stroke();
      g.strokeStyle = p.key === 'bos' ? '#2a4a2c' : '#4f5e3c';
      g.lineWidth = 2 * (p.half + Wd.OFF * .55) * k;
      g.stroke();
    }
    for (const p of order) {
      pathLine(g, p, k);
      g.strokeStyle = 'rgba(8, 8, 16, .8)';
      g.lineWidth = 2 * (p.half + 14) * k;
      g.stroke();
      g.strokeStyle = p.key === 'bos' ? '#4a3a2a' : p.key === 'burcht' ? '#4d4a5c' : '#2c2b3d';
      g.lineWidth = 2 * p.half * k;
      g.stroke();
    }
    // Kasseien: kleine tegels op de weg.
    for (let i = 0; i < Wd.X.length; i++) {
      if (i % 2) continue;
      const half = Wd.HALF[i];
      for (let m = 0; m < 5; m++) {
        const off = (rand() * 2 - 1) * half * .9;
        const x = Wd.X[i] - Wd.TY[i] * off, y = Wd.Y[i] + Wd.TX[i] * off;
        g.fillStyle = rand() < .5 ? 'rgba(255, 255, 255, .05)' : 'rgba(0, 0, 0, .18)';
        g.fillRect((x - 16) * k, (y - 10) * k, 32 * k, 20 * k);
      }
    }
    // Neonranden en rood-witte boordstenen in de bochten.
    for (const p of Wd.PATHS) {
      const color = EDGE[p.key];
      for (const side of [-1, 1]) {
        g.beginPath();
        let pen = false;
        for (let i = p.first; i <= p.last; i++) {
          const off = side * (p.half - 6);
          const wx = Wd.X[i] - Wd.TY[i] * off, wy = Wd.Y[i] + Wd.TX[i] * off;
          // Een zijweg krijgt geen rand waar hij nog over de hoofdbaan loopt.
          if (!p.closed && onMain(wx, wy, p)) { pen = false; continue; }
          if (!pen) g.moveTo(wx * k, wy * k); else g.lineTo(wx * k, wy * k);
          pen = true;
        }
        if (p.closed) g.closePath();
        if (color) {
          g.strokeStyle = `${color}55`;
          g.lineWidth = Math.max(2, 22 * k);
          g.stroke();
          g.strokeStyle = color;
          g.lineWidth = Math.max(1, 7 * k);
          g.stroke();
        } else {
          g.strokeStyle = 'rgba(140, 255, 170, .25)';
          g.lineWidth = Math.max(1, 5 * k);
          g.stroke();
        }
      }
      if (p.key !== 'hoofd') continue;
      // Boordstenen waar de weg sterk draait.
      for (let i = p.first; i <= p.last; i++) {
        const j = Wd.NEXT[i], q = Wd.PREV[i];
        const turn = Wd.TX[q] * Wd.TY[j] - Wd.TY[q] * Wd.TX[j];
        if (Math.abs(turn) < .05) continue;
        const side = turn > 0 ? -1 : 1;
        const off = side * (p.half + 10);
        const x = Wd.X[i] - Wd.TY[i] * off, y = Wd.Y[i] + Wd.TX[i] * off;
        g.save();
        g.translate(x * k, y * k);
        g.rotate(Math.atan2(Wd.TY[i], Wd.TX[i]));
        g.fillStyle = Math.floor(i / 1) % 2 ? '#f2f2f8' : '#d6334f';
        g.fillRect(-15 * k, -14 * k, 30 * k, 28 * k);
        g.restore();
      }
    }
    // De Drakenkloof: een diepe spleet met gloeiende lava onderin.
    {
      const p0 = Wd.GAP.from, p1 = Wd.GAP.to;
      const pts = [];
      for (let i = p0; i <= p1; i++) pts.push(i);
      g.save();
      g.beginPath();
      const w = Wd.HALF[p0] + Wd.OFF + 30;
      pts.forEach((i, m) => { const x = Wd.X[i] - Wd.TY[i] * w, y = Wd.Y[i] + Wd.TX[i] * w; if (m) g.lineTo(x * k, y * k); else g.moveTo(x * k, y * k); });
      [...pts].reverse().forEach(i => g.lineTo((Wd.X[i] + Wd.TY[i] * w) * k, (Wd.Y[i] - Wd.TX[i] * w) * k));
      g.closePath();
      g.fillStyle = '#05030a';
      g.fill();
      g.clip();
      const mid = pts[pts.length >> 1];
      const lava = g.createRadialGradient(Wd.X[mid] * k, Wd.Y[mid] * k, 10 * k, Wd.X[mid] * k, Wd.Y[mid] * k, 500 * k);
      lava.addColorStop(0, 'rgba(255, 120, 40, .55)');
      lava.addColorStop(.5, 'rgba(160, 30, 20, .35)');
      lava.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = lava;
      g.fillRect(0, 0, c.width, c.height);
      g.strokeStyle = 'rgba(255, 150, 60, .6)';
      g.lineWidth = Math.max(1, 8 * k);
      for (let m = 0; m < 9; m++) {
        const i = pts[Math.floor(rand() * pts.length)];
        const off = (rand() * 2 - 1) * w;
        const x = Wd.X[i] - Wd.TY[i] * off, y = Wd.Y[i] + Wd.TX[i] * off;
        g.beginPath(); g.moveTo(x * k, y * k); g.lineTo((x + (rand() - .5) * 160) * k, (y + (rand() - .5) * 160) * k); g.stroke();
      }
      g.restore();
      // Rotsranden
      for (const i of [p0, p1]) {
        const a = Math.atan2(Wd.TY[i], Wd.TX[i]);
        g.save();
        g.translate(Wd.X[i] * k, Wd.Y[i] * k);
        g.rotate(a);
        g.fillStyle = '#6a5a4a';
        g.fillRect(-8 * k, -w * k, 16 * k, 2 * w * k);
        g.restore();
      }
    }
    // Schansen: oranje hellingen met pijlen.
    for (const r of Wd.RAMPS) {
      for (let m = 0; m < r.len; m++) {
        const i = Wd.step(r.i, m);
        const a = Math.atan2(Wd.TY[i], Wd.TX[i]);
        g.save();
        g.translate(Wd.X[i] * k, Wd.Y[i] * k);
        g.rotate(a);
        const hw = Wd.HALF[i];
        const lightK = .55 + (m / r.len) * .45;
        g.fillStyle = `rgb(${Math.round(201 * lightK)}, ${Math.round(130 * lightK)}, ${Math.round(42 * lightK)})`;
        g.fillRect(-16 * k, -hw * k, 32 * k, 2 * hw * k);
        if (m % 2 === 0) {
          g.fillStyle = '#fff3b0';
          for (const v of [-.5, 0, .5]) { g.beginPath(); g.moveTo(-8 * k, (v * hw - 18) * k); g.lineTo(10 * k, v * hw * k); g.lineTo(-8 * k, (v * hw + 18) * k); g.fill(); }
        }
        g.restore();
      }
    }
    // Nitrostroken: cyaan pijlen.
    for (const pd of Wd.PADS) {
      for (let m = 0; m < pd.n; m++) {
        const i = Wd.step(pd.i, m);
        g.save();
        g.translate(Wd.X[i] * k, Wd.Y[i] * k);
        g.rotate(Math.atan2(Wd.TY[i], Wd.TX[i]));
        const hw = Wd.HALF[i] * .62;
        g.fillStyle = 'rgba(76, 240, 255, .28)';
        g.fillRect(-16 * k, -hw * k, 32 * k, 2 * hw * k);
        g.strokeStyle = '#7ff6ff';
        g.lineWidth = Math.max(1.5, 7 * k);
        g.beginPath(); g.moveTo(-10 * k, -hw * .8 * k); g.lineTo(10 * k, 0); g.lineTo(-10 * k, hw * .8 * k); g.stroke();
        g.restore();
      }
    }
    // Rune-cirkels onder de kisten.
    for (const b of Wd.BOXES) {
      g.strokeStyle = 'rgba(255, 211, 79, .5)';
      g.lineWidth = Math.max(1, 5 * k);
      g.beginPath(); g.arc(b.x * k, b.y * k, 44 * k, 0, Math.PI * 2); g.stroke();
    }
    // Start en finish: een dambord over de weg en vakjes voor de startopstelling.
    {
      const i = Wd.START;
      g.save();
      g.translate(Wd.X[i] * k, Wd.Y[i] * k);
      g.rotate(Math.atan2(Wd.TY[i], Wd.TX[i]));
      const hw = Wd.HALF[i];
      const n = 10, sz = (2 * hw) / n;
      for (let r = 0; r < 2; r++) for (let q = 0; q < n; q++) {
        g.fillStyle = (r + q) % 2 ? '#111' : '#f4f4f4';
        g.fillRect((-sz + r * sz) * k, (-hw + q * sz) * k, sz * k, sz * k);
      }
      g.restore();
      for (let n2 = 0; n2 < 24; n2++) {
        const s = Wd.grid(n2);
        g.save();
        g.translate(s.x * k, s.y * k);
        g.rotate(s.a);
        g.strokeStyle = 'rgba(255, 255, 255, .35)';
        g.lineWidth = Math.max(1, 4 * k);
        g.strokeRect(-30 * k, -32 * k, 60 * k, 64 * k);
        g.restore();
      }
    }
    // Het bospad op het bord: wat donkerder, zodat je het moet ontdekken.
    if (opts.hideSecret) {
      const p = Wd.PATHS.find(q => q.secret);
      pathLine(g, p, k);
      g.strokeStyle = 'rgba(16, 40, 24, .55)';
      g.lineWidth = 2 * (p.half + 30) * k;
      g.stroke();
    }
    return c;
  }

  // Het kleine paard op de kaart: een gekleurd lijfje met de neus vooruit.
  function marker(ctx, x, y, a, size, look, o = {}) {
    const { body, neon } = colors(look);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    if (o.shield) {
      ctx.strokeStyle = 'rgba(120, 220, 255, .9)';
      ctx.lineWidth = size * .14;
      ctx.beginPath(); ctx.arc(0, 0, size * 1.05, 0, Math.PI * 2); ctx.stroke();
    }
    if (o.boost) {
      const g = ctx.createLinearGradient(-size * 2.2, 0, -size * .6, 0);
      g.addColorStop(0, 'rgba(255, 120, 40, 0)');
      g.addColorStop(1, 'rgba(255, 211, 79, .95)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(-size * .6, -size * .3); ctx.lineTo(-size * 2.2, 0); ctx.lineTo(-size * .6, size * .3); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0, 0, 0, .4)';
    ctx.beginPath(); ctx.ellipse(size * .12, size * .15, size * .95, size * .48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = body;
    ctx.strokeStyle = neon;
    ctx.lineWidth = Math.max(1.5, size * .14);
    ctx.beginPath(); ctx.ellipse(-size * .1, 0, size * .78, size * .4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * .5, -size * .16); ctx.lineTo(size * 1.15, -size * .12); ctx.lineTo(size * 1.15, size * .12); ctx.lineTo(size * .5, size * .16); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = neon;
    ctx.beginPath(); ctx.arc(-size * .1, 0, size * .2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  return { ART, onArt, horse, sprite, live, mapImage, marker, colors, shade, rgba, dot, glowLine, onMain, EDGE, FRAMES, BW, BH };
})();
