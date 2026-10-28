// Het Kringgesprek: de ronde tafel zelf. Eén keer getekend op een canvas (opnieuw bij een andere
// schermgrootte of als er stoelen bijkomen), zodat er tijdens het gesprek niets hertekend moet worden.
// De gouden rand en de runen nemen de themakleuren (--k-goud, --k-cyan) over.
const KgTafel = (() => {
  const kleur = (naam, alfa = 1) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(naam).trim() || '255 255 255';
    return `rgb(${v} / ${alfa})`;
  };
  const RUNEN = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

  // De maten van de tafel en de stoelen, ook gebruikt om de namen en de steen te plaatsen.
  function maten(w, h) {
    const cx = w / 2;
    const cy = h / 2;
    const sx = Math.max(120, w / 2 - Math.min(110, w * .09));
    const sy = Math.max(90, h / 2 - Math.min(44, h * .07));
    return { cx, cy, sx, sy, rx: sx * .8, ry: sy * .74 };
  }

  function vloer(g, w, h, m) {
    g.fillStyle = '#05080f';
    g.fillRect(0, 0, w, h);
    // Stenen tegels in een kring rond de tafel, met een fijn holo-raster erover.
    g.save();
    g.translate(m.cx, m.cy);
    g.scale(1, m.ry / m.rx);
    g.strokeStyle = 'rgb(255 255 255 / .035)';
    g.lineWidth = 2;
    const rMax = Math.hypot(w, h);
    for (let r = m.rx * 1.12; r < rMax; r += m.rx * .22) {
      g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    }
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      g.beginPath(); g.moveTo(Math.cos(a) * m.rx * 1.12, Math.sin(a) * m.rx * 1.12); g.lineTo(Math.cos(a) * rMax, Math.sin(a) * rMax); g.stroke();
    }
    g.restore();
    g.strokeStyle = kleur('--k-cyan', .05);
    g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
    // Licht van boven op de tafel, donker naar de randen.
    const licht = g.createRadialGradient(m.cx, m.cy, m.rx * .3, m.cx, m.cy, Math.max(w, h) * .7);
    licht.addColorStop(0, kleur('--k-cyan', .12));
    licht.addColorStop(.45, 'rgb(0 0 0 / 0)');
    licht.addColorStop(1, 'rgb(0 0 0 / .7)');
    g.fillStyle = licht;
    g.fillRect(0, 0, w, h);
  }

  // Een hoge ridderstoel, met de rugleuning naar buiten en een schildje erop.
  function stoel(g, x, y, hoek, s) {
    g.save();
    g.translate(x, y);
    g.rotate(hoek + Math.PI / 2);
    g.shadowColor = 'rgb(0 0 0 / .7)';
    g.shadowBlur = s * .4;
    g.shadowOffsetY = s * .1;
    const hout = g.createLinearGradient(-s * .5, 0, s * .5, 0);
    hout.addColorStop(0, '#2a170a'); hout.addColorStop(.5, '#6b4220'); hout.addColorStop(1, '#2a170a');
    g.fillStyle = hout;
    g.beginPath();
    g.moveTo(-s * .5, s * .35);
    g.lineTo(-s * .5, -s * .45);
    g.quadraticCurveTo(-s * .5, -s * .95, 0, -s * 1.05);
    g.quadraticCurveTo(s * .5, -s * .95, s * .5, -s * .45);
    g.lineTo(s * .5, s * .35);
    g.closePath();
    g.fill();
    g.shadowColor = 'rgb(0 0 0 / 0)';
    g.strokeStyle = kleur('--k-goud-d', .9);
    g.lineWidth = Math.max(1.5, s * .05);
    g.stroke();
    // Het schildje met een rune-gloed.
    g.fillStyle = '#121a2e';
    g.beginPath();
    g.moveTo(-s * .22, -s * .62); g.lineTo(s * .22, -s * .62); g.lineTo(s * .22, -s * .4);
    g.quadraticCurveTo(s * .2, -s * .2, 0, -s * .12); g.quadraticCurveTo(-s * .2, -s * .2, -s * .22, -s * .4);
    g.closePath();
    g.fill();
    g.strokeStyle = kleur('--k-goud', .9);
    g.lineWidth = Math.max(1, s * .035);
    g.stroke();
    g.fillStyle = kleur('--k-cyan', .8);
    g.fillRect(-s * .03, -s * .55, s * .06, s * .3);
    g.fillRect(-s * .12, -s * .45, s * .24, s * .06);
    g.restore();
  }

  function tafel(g, m) {
    const { cx, cy, rx, ry } = m;
    const ellips = (f, rot = 0) => { g.beginPath(); g.ellipse(cx, cy, rx * f, ry * f, rot, 0, Math.PI * 2); };
    // Dikte van het blad: een donkere schijf iets lager.
    g.save();
    g.shadowColor = 'rgb(0 0 0 / .8)';
    g.shadowBlur = rx * .12;
    g.shadowOffsetY = ry * .08;
    g.fillStyle = '#1b0f06';
    g.beginPath(); g.ellipse(cx, cy + ry * .06, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    // Gouden rand.
    const goud = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    goud.addColorStop(0, kleur('--k-goud-l'));
    goud.addColorStop(.35, kleur('--k-goud-d'));
    goud.addColorStop(.6, kleur('--k-goud'));
    goud.addColorStop(1, kleur('--k-goud-d'));
    ellips(1.02);
    g.fillStyle = goud;
    g.fill();
    // Het eiken blad: planken als taartpunten, elk met een iets andere tint.
    g.save();
    ellips(.975);
    g.clip();
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2;
      const a1 = (i + 1) / n * Math.PI * 2;
      const t = 30 + (i * 37 % 7) * 4;
      g.fillStyle = `rgb(${t + 70} ${t + 32} ${t - 6})`;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a0) * rx * 1.1, cy + Math.sin(a0) * ry * 1.1);
      g.lineTo(cx + Math.cos(a1) * rx * 1.1, cy + Math.sin(a1) * ry * 1.1);
      g.closePath();
      g.fill();
      g.strokeStyle = 'rgb(20 10 2 / .6)';
      g.lineWidth = 1.5;
      g.stroke();
    }
    // Nerf: dunne ringen.
    g.strokeStyle = 'rgb(255 220 170 / .05)';
    g.lineWidth = 1;
    for (let f = .2; f < 1; f += .045) { ellips(f); g.stroke(); }
    // Glans van het licht erboven.
    const glans = g.createRadialGradient(cx - rx * .2, cy - ry * .35, 0, cx, cy, rx);
    glans.addColorStop(0, 'rgb(255 240 210 / .22)');
    glans.addColorStop(.6, 'rgb(255 240 210 / 0)');
    glans.addColorStop(1, 'rgb(0 0 0 / .35)');
    g.fillStyle = glans;
    g.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    g.restore();
    // Runenring in neon.
    g.save();
    g.lineWidth = Math.max(2, rx * .006);
    g.strokeStyle = kleur('--k-cyan', .85);
    g.shadowColor = kleur('--k-cyan');
    g.shadowBlur = rx * .03;
    ellips(.72); g.stroke();
    ellips(.6); g.stroke();
    g.fillStyle = kleur('--k-cyan', .9);
    g.font = `${Math.round(ry * .075)}px serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const tel = 40;
    for (let i = 0; i < tel; i++) {
      const a = i / tel * Math.PI * 2;
      g.fillText(RUNEN[i % RUNEN.length], cx + Math.cos(a) * rx * .66, cy + Math.sin(a) * ry * .66);
    }
    g.restore();
    // Het hart van de tafel: een holoschijf waarop de vraag en de naam komen.
    g.save();
    ellips(.58);
    const hart = g.createRadialGradient(cx, cy, 0, cx, cy, rx * .58);
    hart.addColorStop(0, 'rgb(14 26 48 / .96)');
    hart.addColorStop(1, 'rgb(6 12 24 / .96)');
    g.fillStyle = hart;
    g.fill();
    g.clip();
    g.strokeStyle = kleur('--k-cyan', .07);
    g.lineWidth = 1;
    for (let x = cx - rx; x < cx + rx; x += 22) { g.beginPath(); g.moveTo(x, cy - ry); g.lineTo(x, cy + ry); g.stroke(); }
    for (let y = cy - ry; y < cy + ry; y += 22) { g.beginPath(); g.moveTo(cx - rx, y); g.lineTo(cx + rx, y); g.stroke(); }
    g.restore();
  }

  // hoeken: waar de stoelen staan (in radialen, 0 = rechts, met de klok mee).
  function teken(canvas, w, h, hoeken) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2, 3000 / Math.max(1, w));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const m = maten(w, h);
    vloer(g, w, h, m);
    const s = Math.max(26, Math.min(64, Math.min(w, h) * .075, (2 * Math.PI * (m.sx + m.sy) / 2) / Math.max(1, hoeken.length) * .55));
    // Eerst de stoelen achteraan (bovenaan), dan de tafel, dan de stoelen vooraan: zo staat alles goed voor elkaar.
    const achter = hoeken.filter(a => Math.sin(a) < 0);
    const voor = hoeken.filter(a => Math.sin(a) >= 0);
    for (const a of achter) stoel(g, m.cx + Math.cos(a) * m.sx * .94, m.cy + Math.sin(a) * m.sy * .94, a, s);
    tafel(g, m);
    for (const a of voor) stoel(g, m.cx + Math.cos(a) * m.sx * .94, m.cy + Math.sin(a) * m.sy * .94, a, s);
    return m;
  }

  return { teken, maten };
})();
