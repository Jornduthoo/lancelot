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

  function rand(seed) {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  // De raadzaal van bovenaf: stenen vloerplaten, een rond tapijt onder de tafel,
  // vier zuilen met een vuurschaal in de hoeken. Geeft de plaats van de vuurschalen terug (voor de CSS-vlammen).
  function vloer(g, w, h, m) {
    const r = rand(1215);
    g.fillStyle = '#1b1820';
    g.fillRect(0, 0, w, h);
    // Vloerplaten in rijen, elk met een eigen tint en een donkere voeg.
    const ph = Math.max(46, Math.min(w, h) * .09);
    for (let y = -ph * r(), rij = 0; y < h; y += ph, rij++) {
      for (let x = -(rij % 2) * ph * .7; x < w; ) {
        const pw = ph * (1 + r() * .9);
        const t = 46 + Math.floor(r() * 18);
        g.fillStyle = `rgb(${t} ${t - 4} ${t + 6})`;
        g.fillRect(x + 2, y + 2, pw - 4, ph - 4);
        g.fillStyle = 'rgb(255 255 255 / .05)';
        g.fillRect(x + 2, y + 2, pw - 4, 2);
        g.fillStyle = 'rgb(0 0 0 / .25)';
        g.fillRect(x + 2, y + ph - 5, pw - 4, 3);
        if (r() < .12) {
          g.strokeStyle = 'rgb(0 0 0 / .4)';
          g.lineWidth = 1;
          g.beginPath();
          let cx = x + pw * r(), cy = y + 4;
          g.moveTo(cx, cy);
          for (let i = 0; i < 4; i++) { cx += (r() - .5) * pw * .3; cy += ph * .22; g.lineTo(cx, cy); }
          g.stroke();
        }
        x += pw;
      }
    }
    // Het ronde tapijt: diep rood met een gouden boord en een fijne runenlijn in neon.
    const tx = m.sx * 1.08, ty = m.sy * 1.09;
    g.save();
    g.shadowColor = 'rgb(0 0 0 / .6)';
    g.shadowBlur = 30;
    g.fillStyle = '#4a0d18';
    g.beginPath(); g.ellipse(m.cx, m.cy, tx, ty, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    const tapijt = g.createRadialGradient(m.cx, m.cy, m.rx * .5, m.cx, m.cy, tx);
    tapijt.addColorStop(0, '#7a1424'); tapijt.addColorStop(.85, '#5a0f1c'); tapijt.addColorStop(1, '#3a0912');
    g.fillStyle = tapijt;
    g.beginPath(); g.ellipse(m.cx, m.cy, tx * .985, ty * .985, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = Math.max(3, Math.min(w, h) * .008);
    g.strokeStyle = kleur('--k-goud-d', .9);
    g.beginPath(); g.ellipse(m.cx, m.cy, tx * .955, ty * .955, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(m.cx, m.cy, tx * .92, ty * .92, 0, 0, Math.PI * 2); g.stroke();
    // Gouden lelies op de boord.
    g.fillStyle = kleur('--k-goud', .75);
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      const x = m.cx + Math.cos(a) * tx * .937, y = m.cy + Math.sin(a) * ty * .937;
      g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 3, y); g.lineTo(x, y + 4); g.lineTo(x - 3, y); g.closePath(); g.fill();
    }
    g.save();
    g.strokeStyle = kleur('--k-cyan', .55);
    g.shadowColor = kleur('--k-cyan');
    g.shadowBlur = 10;
    g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(m.cx, m.cy, tx * 1.015, ty * 1.015, 0, 0, Math.PI * 2); g.stroke();
    g.restore();
    // Vier zuilen met een vuurschaal, in de hoeken van de zaal.
    const zs = Math.max(22, Math.min(w, h) * .05);
    const schalen = [[zs * 1.5, zs * 1.5], [w - zs * 1.5, zs * 1.5], [zs * 1.5, h - zs * 1.5], [w - zs * 1.5, h - zs * 1.5]];
    for (const [x, y] of schalen) {
      const licht = g.createRadialGradient(x, y, 0, x, y, zs * 7);
      licht.addColorStop(0, 'rgb(255 154 60 / .35)'); licht.addColorStop(1, 'rgb(255 154 60 / 0)');
      g.fillStyle = licht;
      g.fillRect(x - zs * 7, y - zs * 7, zs * 14, zs * 14);
      g.fillStyle = 'rgb(0 0 0 / .45)';
      g.beginPath(); g.arc(x + zs * .25, y + zs * .3, zs * 1.15, 0, Math.PI * 2); g.fill();
      const steen = g.createRadialGradient(x - zs * .4, y - zs * .4, 0, x, y, zs * 1.1);
      steen.addColorStop(0, '#8a8494'); steen.addColorStop(1, '#3b3744');
      g.fillStyle = steen;
      g.beginPath(); g.arc(x, y, zs * 1.1, 0, Math.PI * 2); g.fill();
      g.strokeStyle = kleur('--k-goud-d', .8);
      g.lineWidth = 3;
      g.beginPath(); g.arc(x, y, zs * .78, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#1a0d05';
      g.beginPath(); g.arc(x, y, zs * .62, 0, Math.PI * 2); g.fill();
      const kool = g.createRadialGradient(x, y, 0, x, y, zs * .6);
      kool.addColorStop(0, '#ffd27a'); kool.addColorStop(.5, '#ff6a1a'); kool.addColorStop(1, '#5a1a05');
      g.fillStyle = kool;
      g.beginPath(); g.arc(x, y, zs * .5, 0, Math.PI * 2); g.fill();
    }
    // Koel licht van de tafel, donkere randen.
    const gloed = g.createRadialGradient(m.cx, m.cy, m.rx * .3, m.cx, m.cy, m.rx * 1.5);
    gloed.addColorStop(0, kleur('--k-cyan', .1)); gloed.addColorStop(1, 'rgb(0 0 0 / 0)');
    g.fillStyle = gloed;
    g.fillRect(0, 0, w, h);
    const rand2 = g.createRadialGradient(m.cx, m.cy, Math.min(w, h) * .45, m.cx, m.cy, Math.hypot(w, h) * .6);
    rand2.addColorStop(0, 'rgb(0 0 0 / 0)'); rand2.addColorStop(1, 'rgb(0 0 0 / .55)');
    g.fillStyle = rand2;
    g.fillRect(0, 0, w, h);
    return schalen.map(([x, y]) => [x, y, zs]);
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
    m.vuur = vloer(g, w, h, m);
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
