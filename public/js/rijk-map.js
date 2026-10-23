// De kaart van Het Rijk tekenen: zeshoeken in rijen, voor het bord en voor de gsm of Chromebook.
// draw(canvas, map, opts) geeft de schikking terug; hit(layout, x, y) zegt welk gebied er onder een klik ligt.
// map: { cols, rows, cells, teams, maxPower, neutralCost }
// opts: { targets: {index: soort}, focus: [index] (inzoomen op die gebieden), team, recent: [{i, kind, at}], now, lessonOf: {quizId: nummer}, names: true }
const RijkMap = (() => {
  const SQ3 = Math.sqrt(3);

  function layout(canvas, map, focusList) {
    const dpr = window.devicePixelRatio || 1;
    // clientWidth in plaats van getBoundingClientRect: een inzoom-animatie mag de maat niet verkleinen.
    const w = Math.max(10, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(10, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const pad = 10 * dpr;
    // Middelpunten met zijde 1; daarna schalen zodat alles (of enkel de focus) past.
    const unit = map.cells.map((_, i) => {
      const c = i % map.cols;
      const row = Math.floor(i / map.cols);
      return { x: SQ3 * (c + (row % 2) * .5), y: 1.5 * row };
    });
    const focus = focusList && focusList.length ? focusList : null;
    const pts = focus ? focus.map(i => unit[i]) : unit;
    const minX = Math.min(...pts.map(p => p.x)) - SQ3 * (focus ? 1 : .5);
    const maxX = Math.max(...pts.map(p => p.x)) + SQ3 * (focus ? 1 : .5);
    const minY = Math.min(...pts.map(p => p.y)) - (focus ? 1.8 : 1);
    const maxY = Math.max(...pts.map(p => p.y)) + (focus ? 1.8 : 1);
    let size = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxY - minY));
    if (focus) size = Math.min(size, w / 4.5, h / 4.5);
    const ox = w / 2 - size * (minX + maxX) / 2;
    const oy = h / 2 - size * (minY + maxY) / 2;
    const centers = unit.map(p => ({ x: ox + p.x * size, y: oy + p.y * size }));
    return { w, h, dpr, size, centers };
  }

  function hexPath(g, x, y, s) {
    g.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 180 * (60 * k - 30);
      const px = x + s * Math.cos(a);
      const py = y + s * Math.sin(a);
      if (k === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }

  function draw(canvas, map, opts = {}) {
    const L = layout(canvas, map, opts.focus);
    const g = canvas.getContext('2d');
    const { size, dpr } = L;
    const now = opts.now || Date.now();
    g.clearRect(0, 0, L.w, L.h);
    const bg = g.createRadialGradient(L.w / 2, L.h / 2, 0, L.w / 2, L.h / 2, Math.max(L.w, L.h) * .7);
    bg.addColorStop(0, '#0d1a33');
    bg.addColorStop(1, '#050911');
    g.fillStyle = bg;
    g.fillRect(0, 0, L.w, L.h);
    const targets = opts.targets || null;
    const flashes = {};
    for (const f of opts.recent || []) {
      const age = now - f.at;
      if (age < 1600 && flashes[f.i] === undefined) flashes[f.i] = { age, kind: f.kind };
    }
    map.cells.forEach((cell, i) => {
      const { x, y } = L.centers[i];
      const s = size * .96;
      hexPath(g, x, y, s);
      if (!cell.land) {
        g.fillStyle = '#0a2342';
        g.fill();
        g.strokeStyle = 'rgba(76, 201, 255, .18)';
        g.lineWidth = dpr;
        g.beginPath();
        for (let k = -1; k <= 1; k++) {
          g.moveTo(x - s * .45, y + k * s * .28);
          g.quadraticCurveTo(x - s * .2, y + k * s * .28 - s * .12, x, y + k * s * .28);
          g.quadraticCurveTo(x + s * .2, y + k * s * .28 + s * .12, x + s * .45, y + k * s * .28);
        }
        g.stroke();
        return;
      }
      const team = cell.owner !== null && cell.owner !== undefined ? map.teams[cell.owner] : null;
      const kind = targets ? targets[i] : null;
      const dim = targets && !kind;
      g.fillStyle = team ? team.color : '#1b2740';
      g.globalAlpha = team ? (cell.castle !== null ? .85 : .25 + .1 * cell.power) : 1;
      if (dim) g.globalAlpha *= .45;
      g.fill();
      g.globalAlpha = 1;
      g.lineWidth = Math.max(1, size * .05);
      g.strokeStyle = team ? team.color : 'rgba(159, 180, 217, .35)';
      if (dim) g.strokeStyle = 'rgba(159, 180, 217, .15)';
      g.stroke();
      // Wat je hier kan doen (op de gsm): aanvallen of versterken.
      if (kind) {
        hexPath(g, x, y, s * .86);
        g.lineWidth = Math.max(2, size * .09);
        g.setLineDash(kind === 'versterk' ? [size * .12, size * .1] : []);
        g.strokeStyle = kind === 'versterk' ? 'rgba(255, 255, 255, .55)' : kind === 'vijand' ? '#ff8fa3' : '#4cc9ff';
        g.stroke();
        g.setLineDash([]);
      }
      // Flits bij een verandering.
      const fl = flashes[i];
      if (fl) {
        const p = fl.age / 1600;
        hexPath(g, x, y, s * (1 + p * .5));
        g.lineWidth = size * .12 * (1 - p);
        g.strokeStyle = fl.kind === 'veroverd' ? '#ffc94a' : fl.kind === 'zwak' ? '#ff4d6d' : '#ffffff';
        g.globalAlpha = 1 - p;
        g.stroke();
        g.globalAlpha = 1;
      }
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      if (cell.castle !== null) {
        g.font = `${size * .8}px serif`;
        g.fillText('🏰', x, y - size * .05);
      } else if (team) {
        // Kracht als bolletjes, en het nummer van de les waarin het veroverd werd.
        const n = cell.power;
        const r = size * .09;
        for (let k = 0; k < n; k++) {
          g.beginPath();
          g.arc(x + (k - (n - 1) / 2) * r * 2.6, y + size * .38, r, 0, Math.PI * 2);
          g.fillStyle = '#fff';
          g.fill();
        }
        const les = opts.lessonOf && cell.quiz ? opts.lessonOf[cell.quiz] : null;
        if (les) {
          g.font = `800 ${size * .42}px 'Orbitron', 'Exo 2', sans-serif`;
          g.fillStyle = 'rgba(255, 255, 255, .92)';
          g.fillText(les, x, y - size * .02);
        }
      } else if (cell.siege) {
        // Belegering van een vrij gebied: een vlaggetje per stap.
        let k = 0;
        for (const [t, v] of Object.entries(cell.siege)) {
          for (let j = 0; j < v; j++, k++) {
            g.fillStyle = map.teams[t] ? map.teams[t].color : '#fff';
            g.fillRect(x - size * .3 + k * size * .22, y + size * .3, size * .14, size * .2);
          }
        }
      }
      if (opts.names && size > 26 * dpr) {
        g.font = `600 ${Math.max(9 * dpr, size * .2)}px 'Exo 2', sans-serif`;
        g.fillStyle = 'rgba(234, 244, 255, .8)';
        g.fillText(cell.castle !== null ? '' : cell.name, x, y - size * .52);
      }
    });
    return L;
  }

  function hit(L, x, y) {
    let best = -1;
    let bestD = Infinity;
    L.centers.forEach((c, i) => {
      const d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return bestD <= L.size ? best : -1;
  }

  return { draw, hit };
})();
