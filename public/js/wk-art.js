// De Wapenkamer tekenen: de zaal achter de tools. Een stenen wapenzaal met ramen naar de sterren,
// wapenrekken met zwaarden, bijlen en speren, schilden aan de muur, banieren, een neonleiding en een tegelvloer.
// De zaal wordt één keer per schermgrootte getekend; alleen de fakkelvlammen bewegen (met CSS, dat kost bijna niets).
// Gebruikt Glow uit fx.js.
const WkArt = (() => {
  const { glow } = Glow;

  function rand(seed) {
    let s = seed % 2147483647 || 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const mix = (a, b, k) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = i => Math.round(((pa >> i) & 255) * (1 - k) + ((pb >> i) & 255) * k);
    return '#' + [c(16), c(8), c(0)].map(n => n.toString(16).padStart(2, '0')).join('');
  };

  function muur(g, w, floorY, h, r) {
    const wall = g.createLinearGradient(0, 0, 0, floorY);
    wall.addColorStop(0, '#0f1424');
    wall.addColorStop(1, '#222a3e');
    g.fillStyle = wall;
    g.fillRect(0, 0, w, floorY);
    const bh = Math.max(16, h * .042), bw = bh * 2.3;
    for (let row = 0, y = 0; y < floorY; row++, y += bh) {
      for (let x = (row % 2) * -bw / 2; x < w; x += bw) {
        const v = r();
        g.fillStyle = `hsl(${222 + r() * 12}, ${12 + r() * 8}%, ${(25 + v * 15) * .6}%)`;
        g.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
        g.fillStyle = 'rgba(255,255,255,.05)';
        g.fillRect(x + 1.5, y + 1.5, bw - 3, Math.max(1, bh * .12));
        g.fillStyle = 'rgba(0,0,0,.24)';
        g.fillRect(x + 1.5, y + bh - 1.5 - bh * .12, bw - 3, bh * .12);
        if (v > .86) {
          g.strokeStyle = 'rgba(0,0,0,.35)';
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x + bw * r(), y + 2);
          g.lineTo(x + bw * r(), y + bh * .6);
          g.lineTo(x + bw * r(), y + bh - 2);
          g.stroke();
        }
      }
    }
    // Donkerder naar boven: het plafond verdwijnt in het donker.
    const top = g.createLinearGradient(0, 0, 0, floorY * .45);
    top.addColorStop(0, 'rgba(3,5,12,.75)');
    top.addColorStop(1, 'rgba(3,5,12,0)');
    g.fillStyle = top;
    g.fillRect(0, 0, w, floorY * .45);
  }

  function raam(g, wx, winY, winW, winH, r, planeet) {
    const x = wx - winW / 2;
    g.save();
    g.beginPath();
    g.moveTo(x, winY + winH);
    g.lineTo(x, winY + winW * .5);
    g.quadraticCurveTo(x, winY, x + winW / 2, winY - winW * .25);
    g.quadraticCurveTo(x + winW, winY, x + winW, winY + winW * .5);
    g.lineTo(x + winW, winY + winH);
    g.closePath();
    g.save();
    g.clip();
    const sky = g.createLinearGradient(0, winY, 0, winY + winH);
    sky.addColorStop(0, '#0d0830');
    sky.addColorStop(.6, '#1d1150');
    sky.addColorStop(1, '#3b1d6e');
    g.fillStyle = sky;
    g.fillRect(x, winY - winW, winW, winH + winW);
    glow(g, x + winW * .3, winY + winH * .3, winW * .9, '#b07cff', .45);
    glow(g, x + winW * .7, winY + winH * .7, winW * .7, '#4fe3ff', .3);
    for (let i = 0; i < 30; i++) {
      g.fillStyle = `rgba(255,255,255,${.4 + r() * .6})`;
      const sz = r() < .15 ? 2 : 1;
      g.fillRect(x + r() * winW, winY - winW * .2 + r() * winH, sz, sz);
    }
    if (planeet) {
      const px = x + winW * .62, py = winY + winH * .3, pr = winW * .2;
      const pg = g.createRadialGradient(px - pr * .4, py - pr * .4, 0, px, py, pr);
      pg.addColorStop(0, '#ffd9a8'); pg.addColorStop(1, '#a8452c');
      g.fillStyle = pg;
      g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,220,170,.7)';
      g.lineWidth = Math.max(1, pr * .12);
      g.beginPath(); g.ellipse(px, py, pr * 1.7, pr * .45, -.3, 0, Math.PI * 2); g.stroke();
    } else {
      const px = x + winW * .38, py = winY + winH * .24, pr = winW * .16;
      glow(g, px, py, pr * 3, '#cfe8ff', .4);
      g.fillStyle = '#e9f2ff';
      g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1d1150';
      g.beginPath(); g.arc(px + pr * .45, py - pr * .2, pr * .9, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.strokeStyle = '#0b0e17';
    g.lineWidth = Math.max(2, winW * .035);
    g.stroke();
    g.beginPath();
    g.moveTo(x + winW / 2, winY - winW * .25); g.lineTo(x + winW / 2, winY + winH);
    for (let k = 1; k < 4; k++) { g.moveTo(x, winY + winH * k / 4 + winW * .1); g.lineTo(x + winW, winY + winH * k / 4 + winW * .1); }
    g.lineWidth = Math.max(1, winW * .02);
    g.stroke();
    g.strokeStyle = '#4a5370';
    g.lineWidth = Math.max(3, winW * .09);
    g.beginPath();
    g.moveTo(x - winW * .06, winY + winH);
    g.lineTo(x - winW * .06, winY + winW * .5);
    g.quadraticCurveTo(x - winW * .06, winY - winW * .1, x + winW / 2, winY - winW * .35);
    g.quadraticCurveTo(x + winW * 1.06, winY - winW * .1, x + winW * 1.06, winY + winW * .5);
    g.lineTo(x + winW * 1.06, winY + winH);
    g.stroke();
    g.fillStyle = '#56607e';
    g.fillRect(x - winW * .16, winY + winH, winW * 1.32, winW * .1);
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(x - winW * .16, winY + winH + winW * .1, winW * 1.32, winW * .05);
    glow(g, wx, winY + winH * 1.1, winW * 1.3, '#7a4dff', .2, .5);
    g.restore();
  }

  // Een zwaard, punt naar boven, met een neonrand op het blad.
  function zwaard(g, x, y, len, hoek) {
    g.save();
    g.translate(x, y);
    g.rotate(hoek);
    const b = len * .07;
    const blad = g.createLinearGradient(-b, 0, b, 0);
    blad.addColorStop(0, '#8b9bb4'); blad.addColorStop(.5, '#eef4ff'); blad.addColorStop(1, '#5d6b85');
    g.fillStyle = blad;
    g.beginPath();
    g.moveTo(-b, 0); g.lineTo(-b, -len * .66); g.lineTo(0, -len * .76); g.lineTo(b, -len * .66); g.lineTo(b, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(94,231,255,.9)';
    g.lineWidth = Math.max(1, b * .3);
    g.beginPath(); g.moveTo(0, -len * .04); g.lineTo(0, -len * .7); g.stroke();
    glow(g, 0, -len * .38, len * .3, '#38e1ff', .18, 1.6);
    g.fillStyle = '#d6a640';
    g.fillRect(-len * .16, 0, len * .32, len * .045);
    g.fillStyle = '#4a2e18';
    g.fillRect(-b * .7, len * .045, b * 1.4, len * .17);
    g.fillStyle = '#e0b04a';
    g.beginPath(); g.arc(0, len * .235, b * 1.1, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function bijl(g, x, y, len, hoek) {
    g.save();
    g.translate(x, y);
    g.rotate(hoek);
    g.fillStyle = '#5b3a1e';
    g.fillRect(-len * .03, -len * .75, len * .06, len);
    const kop = g.createLinearGradient(0, -len * .75, len * .3, -len * .5);
    kop.addColorStop(0, '#dfe7f3'); kop.addColorStop(1, '#5d6b85');
    g.fillStyle = kop;
    g.beginPath();
    g.moveTo(len * .03, -len * .72);
    g.quadraticCurveTo(len * .32, -len * .82, len * .3, -len * .5);
    g.quadraticCurveTo(len * .18, -len * .56, len * .03, -len * .55);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(94,231,255,.9)';
    g.lineWidth = Math.max(1, len * .015);
    g.beginPath(); g.moveTo(len * .28, -len * .78); g.quadraticCurveTo(len * .33, -len * .65, len * .3, -len * .5); g.stroke();
    g.fillStyle = '#c99a3a';
    g.fillRect(-len * .045, -len * .76, len * .09, len * .05);
    g.restore();
  }

  function speer(g, x, y, len) {
    g.fillStyle = '#5b3a1e';
    g.fillRect(x - len * .018, y - len, len * .036, len);
    g.fillStyle = '#dfe7f3';
    g.beginPath();
    g.moveTo(x, y - len * 1.14); g.lineTo(x + len * .045, y - len * .98); g.lineTo(x, y - len * .94); g.lineTo(x - len * .045, y - len * .98);
    g.closePath();
    g.fill();
    glow(g, x, y - len * 1.03, len * .1, '#5ee7ff', .6);
    g.fillStyle = '#c99a3a';
    g.fillRect(x - len * .03, y - len * .95, len * .06, len * .025);
  }

  // Een wapenschild aan de muur: twee kleuren, gouden rand en een lichtend teken.
  function schild(g, x, y, s, kleur, kleur2, teken) {
    g.save();
    g.translate(x, y);
    g.beginPath();
    g.moveTo(-s, -s); g.lineTo(s, -s); g.lineTo(s, 0);
    g.quadraticCurveTo(s, s * .9, 0, s * 1.35);
    g.quadraticCurveTo(-s, s * .9, -s, 0);
    g.closePath();
    g.save();
    g.clip();
    g.fillStyle = kleur;
    g.fillRect(-s, -s, s * 2, s * 2.5);
    g.fillStyle = kleur2;
    g.fillRect(0, -s, s, s * 2.5);
    const glans = g.createLinearGradient(-s, -s, s, s);
    glans.addColorStop(0, 'rgba(255,255,255,.25)'); glans.addColorStop(.5, 'rgba(255,255,255,0)'); glans.addColorStop(1, 'rgba(0,0,0,.35)');
    g.fillStyle = glans;
    g.fillRect(-s, -s, s * 2, s * 2.5);
    g.restore();
    g.strokeStyle = '#e0b04a';
    g.lineWidth = Math.max(2, s * .12);
    g.stroke();
    g.fillStyle = '#fff4cf';
    g.globalAlpha = .92;
    if (teken === 'ster') {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * .2 : s * .48;
        g.lineTo(Math.cos(a) * rr, s * .1 + Math.sin(a) * rr);
      }
      g.closePath();
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(0, -s * .45); g.lineTo(s * .32, s * .15); g.lineTo(0, s * .75); g.lineTo(-s * .32, s * .15);
      g.closePath();
      g.fill();
    }
    g.globalAlpha = 1;
    glow(g, 0, s * .15, s * 1.3, '#5ee7ff', .12);
    g.restore();
  }

  function rek(g, cx, y, bw, hgt, r) {
    // Houten rek met twee dwarsbalken en ijzeren bouten; erop zwaarden, een bijl en speren.
    const plank = (x, yy, ww, hh) => {
      const hout = g.createLinearGradient(0, yy, 0, yy + hh);
      hout.addColorStop(0, '#7a4f2a'); hout.addColorStop(1, '#3b2412');
      g.fillStyle = hout;
      g.fillRect(x, yy, ww, hh);
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(x, yy + hh - 2, ww, 2);
      g.fillStyle = '#9aa3b5';
      for (const bx of [x + hh * .6, x + ww - hh * .6]) { g.beginPath(); g.arc(bx, yy + hh / 2, hh * .18, 0, Math.PI * 2); g.fill(); }
    };
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = cx - bw / 2 + bw * (i + .5) / n;
      const soort = (i + Math.floor(r() * 3)) % 3;
      if (soort === 0) zwaard(g, x, y + hgt * .72, hgt * .9, (r() - .5) * .05);
      else if (soort === 1) speer(g, x, y + hgt * .95, hgt * .85);
      else bijl(g, x, y + hgt * .92, hgt * .85, (r() - .5) * .05);
    }
    plank(cx - bw / 2, y + hgt * .2, bw, hgt * .06);
    plank(cx - bw / 2, y + hgt * .78, bw, hgt * .08);
    glow(g, cx, y + hgt * .5, bw * .7, '#38e1ff', .06);
  }

  function banier(g, bx, by, bw, bh, kleur) {
    g.fillStyle = '#6b4a10';
    g.fillRect(bx - bw * .65, by - bh * .03, bw * 1.3, Math.max(3, bh * .025));
    const doek = g.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
    doek.addColorStop(0, mix(kleur, '#000000', .45));
    doek.addColorStop(.5, kleur);
    doek.addColorStop(1, mix(kleur, '#000000', .5));
    g.fillStyle = doek;
    g.beginPath();
    g.moveTo(bx - bw / 2, by); g.lineTo(bx + bw / 2, by); g.lineTo(bx + bw / 2, by + bh);
    g.lineTo(bx, by + bh * .88); g.lineTo(bx - bw / 2, by + bh);
    g.closePath();
    g.fill();
    g.strokeStyle = '#e0b04a';
    g.lineWidth = Math.max(1.5, bw * .05);
    g.stroke();
    // Gekruiste zwaarden
    const cy = by + bh * .4, s = bw * .3;
    g.lineCap = 'round';
    g.lineWidth = Math.max(2, s * .16);
    g.strokeStyle = '#dfe8f5';
    g.beginPath(); g.moveTo(bx - s, cy + s); g.lineTo(bx + s, cy - s); g.moveTo(bx + s, cy + s); g.lineTo(bx - s, cy - s); g.stroke();
    g.strokeStyle = '#ffd76a';
    g.beginPath(); g.moveTo(bx - s * .5, cy + s * .2); g.lineTo(bx - s * .2, cy + s * .5); g.moveTo(bx + s * .5, cy + s * .2); g.lineTo(bx + s * .2, cy + s * .5); g.stroke();
    g.strokeStyle = 'rgba(255,224,150,.6)';
    g.lineWidth = Math.max(1, bw * .03);
    g.strokeRect(bx - bw * .36, by + bh * .08, bw * .72, bh * .66);
  }

  function houder(g, tx, ty, s) {
    g.fillStyle = '#3a3f4e';
    g.fillRect(tx - s * .5, ty + s * .3, s, s * .25);
    g.fillStyle = '#5b5f73';
    g.beginPath();
    g.moveTo(tx - s * .55, ty); g.lineTo(tx + s * .55, ty); g.lineTo(tx + s * .2, ty + s * 1.1); g.lineTo(tx - s * .2, ty + s * 1.1);
    g.closePath();
    g.fill();
    g.fillStyle = '#2a2d3c';
    g.fillRect(tx - s * .12, ty + s * 1.1, s * .24, s * 1.2);
    glow(g, tx, ty, s * 7, '#ff9a3c', .18);
  }

  // Tekent de zaal op w x h pixels. Geeft het canvas en de plaats van de fakkels (voor de CSS-vlammen).
  function zaal(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const r = rand(4711);
    const floorY = h * .84;
    muur(g, w, floorY, h, r);
    // Ramen helemaal links en rechts, wapenrekken en schilden daartussen.
    const winW = Math.min(w * .075, h * .13), winH = floorY * .5, winY = floorY * .14;
    raam(g, w * .055, winY, winW, winH, r, true);
    raam(g, w * .945, winY, winW, winH, r, false);
    const rh = floorY * .34, rw = Math.min(w * .16, rh * 1.3);
    rek(g, w * .2, floorY * .5, rw, rh, r);
    rek(g, w * .8, floorY * .5, rw, rh, r);
    const sS = Math.min(w * .028, h * .045);
    schild(g, w * .2, floorY * .36, sS, '#9c1534', '#1d3f9c', 'ster');
    schild(g, w * .8, floorY * .36, sS, '#0f7a57', '#a8781c', 'ruit');
    const bw = Math.min(w * .04, h * .07), bh = floorY * .42;
    banier(g, w * .345, floorY * .03, bw, bh, '#a8152f');
    banier(g, w * .655, floorY * .03, bw, bh, '#1f4fc4');
    // Neonleiding langs de muur
    const pipeY = floorY * .93;
    g.fillStyle = '#0c1220';
    g.fillRect(0, pipeY - h * .006, w, h * .012);
    g.fillStyle = 'rgba(94,231,255,.85)';
    g.fillRect(0, pipeY - 1, w, 2);
    for (let x = w * .04; x < w; x += w * .09) {
      g.fillStyle = '#3a4560';
      g.fillRect(x - h * .008, pipeY - h * .014, h * .016, h * .028);
      glow(g, x, pipeY, h * .02, '#5ee7ff', .8);
    }
    const fakkels = [[w * .345 - bw * 1.6, floorY * .52], [w * .655 + bw * 1.6, floorY * .52], [w * .13, floorY * .82], [w * .87, floorY * .82]];
    const ts = h * .03;
    for (const [tx, ty] of fakkels) houder(g, tx, ty, ts);
    // Vloer met tegels in perspectief en een rode loper
    const fl = g.createLinearGradient(0, floorY, 0, h);
    fl.addColorStop(0, '#2a2433');
    fl.addColorStop(1, '#100d16');
    g.fillStyle = fl;
    g.fillRect(0, floorY, w, h - floorY);
    g.strokeStyle = 'rgba(0,0,0,.45)';
    g.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = floorY + (h - floorY) * Math.pow(i / 6, 1.6);
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    for (let i = -16; i <= 16; i++) {
      g.beginPath(); g.moveTo(w / 2 + i * w * .035, floorY); g.lineTo(w / 2 + i * w * .12, h); g.stroke();
    }
    g.fillStyle = 'rgba(140,24,40,.75)';
    g.beginPath();
    g.moveTo(w / 2 - w * .1, floorY); g.lineTo(w / 2 + w * .1, floorY); g.lineTo(w / 2 + w * .2, h); g.lineTo(w / 2 - w * .2, h);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(224,176,74,.7)';
    g.lineWidth = Math.max(1.5, h * .004);
    g.stroke();
    g.fillStyle = '#39405a';
    g.fillRect(0, floorY - h * .012, w, h * .016);
    for (const [tx, ty] of fakkels) glow(g, tx, Math.min(ty + h * .25, floorY + (h - floorY) * .3), h * .18, '#ff9a3c', .14, .4);
    glow(g, w / 2, floorY * .5, Math.min(w, h) * .5, '#38e1ff', .07);
    const vg = g.createRadialGradient(w / 2, h * .45, Math.min(w, h) * .35, w / 2, h * .45, Math.hypot(w, h) * .62);
    vg.addColorStop(0, 'rgba(2,3,10,0)');
    vg.addColorStop(1, 'rgba(2,3,10,.65)');
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
    return { canvas: c, fakkels: fakkels.map(([x, y]) => [x / w, y / h]) };
  }

  return { zaal };
})();
