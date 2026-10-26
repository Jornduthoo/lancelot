// Posters en banieren voor de arena's: muren in Laserslag, Robomol en Leraar-baas, megaschermen in Neon Duel, borden langs de baan in Robopaarden.
// Eigen foto's staan in de map posters/ naast LANcelot (nooit op GitHub). De server geeft de lijst via /posters/lijst.
// Daarnaast hangen er grappige standaardposters uit public/img/posters (uit te zetten in de instellingen):
// zonder eigen foto's alleen die, met eigen foto's één grappige na elke twee foto's.
// Elke poster krijgt een ijzeren lijst met gouden rand en een naambordje; tussen de posters hangen banieren van de teams.
const Posters = (() => {
  const list = [];
  const subs = [];
  const GRAPPIG = [
    ['varken', 'ZONNEBANK'], ['gans', 'DE GANS!'], ['dikbuik', 'SIR DIKBUIK'], ['stokpaard', 'STOKPAARD'],
    ['draak', 'HATSJOE'], ['zorp', 'SIR ZORP'], ['miauw', 'SIR MIAUW'], ['selfie', 'SELFIE'],
    ['krieeep', 'OLIE NODIG'], ['prinses', 'PRINSES PAN'], ['kip', 'DAPPERE KIP'], ['wasdag', 'WASDAG'],
    ['slak', 'TURBOSLAK'], ['tanden', 'POETSEN!'], ['spook', 'BANG SPOOKJE'], ['robopaard', 'STROOMHAVER'],
    ['koning', 'KONING BLIND'], ['kaasdief', 'KAASDIEF'],
  ];
  let version = 0;

  function cover(g, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }

  // Een ingelijste poster: 200 x 236 pixels.
  function frame(img, label = 'LEGENDE') {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 236;
    const g = c.getContext('2d');
    // IJzeren lijst met klinknagels.
    const fr = g.createLinearGradient(0, 0, 200, 236);
    fr.addColorStop(0, '#5b5f73');
    fr.addColorStop(.5, '#2a2d3c');
    fr.addColorStop(1, '#4a4e62');
    g.fillStyle = fr;
    g.fillRect(0, 0, 200, 236);
    g.fillStyle = '#e0b04a';
    g.fillRect(8, 8, 184, 184);
    g.fillStyle = '#7a5a1c';
    g.fillRect(11, 11, 178, 178);
    cover(g, img, 13, 13, 174, 174);
    // Een vleugje glans over de foto.
    const sh = g.createLinearGradient(13, 13, 187, 187);
    sh.addColorStop(0, 'rgba(255,255,255,.18)');
    sh.addColorStop(.35, 'rgba(255,255,255,0)');
    sh.addColorStop(1, 'rgba(0,0,0,.18)');
    g.fillStyle = sh;
    g.fillRect(13, 13, 174, 174);
    // Neonrand binnen de lijst.
    g.strokeStyle = '#4cc9ff';
    g.lineWidth = 2;
    g.strokeRect(5, 5, 190, 190);
    // Naambordje.
    const pl = g.createLinearGradient(0, 200, 0, 228);
    pl.addColorStop(0, '#ffe08a');
    pl.addColorStop(1, '#b07a1e');
    g.fillStyle = pl;
    g.fillRect(34, 200, 132, 28);
    g.fillStyle = '#3a2508';
    let size = 18;
    g.font = `900 ${size}px 'Orbitron', 'Exo 2', sans-serif`;
    while (size > 10 && g.measureText(label).width > 122) g.font = `900 ${--size}px 'Orbitron', 'Exo 2', sans-serif`;
    g.textAlign = 'center';
    g.fillText(label, 100, 214 + size * .38);
    g.fillStyle = '#c9d6e6';
    for (const [x, y] of [[4, 4], [190, 4], [4, 226], [190, 226], [4, 116], [190, 116]]) {
      g.beginPath(); g.arc(x + 3, y + 3, 3, 0, Math.PI * 2); g.fill();
    }
    return c;
  }

  // Een baniere in de kleur van een team, met een schild en gekruiste lansen: 100 x 220 pixels.
  const banners = {};
  function banner(color) {
    if (banners[color]) return banners[color];
    const c = document.createElement('canvas');
    c.width = 100;
    c.height = 220;
    const g = c.getContext('2d');
    g.fillStyle = '#c9a24a';
    g.fillRect(0, 0, 100, 8);
    const cl = g.createLinearGradient(0, 0, 100, 0);
    cl.addColorStop(0, shade(color, -.45));
    cl.addColorStop(.5, color);
    cl.addColorStop(1, shade(color, -.45));
    g.fillStyle = cl;
    g.beginPath();
    g.moveTo(6, 8); g.lineTo(94, 8); g.lineTo(94, 214); g.lineTo(50, 186); g.lineTo(6, 214); g.closePath();
    g.fill();
    g.strokeStyle = '#ffd36b';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(13, 14); g.lineTo(87, 14); g.lineTo(87, 200); g.lineTo(50, 176); g.lineTo(13, 200); g.closePath();
    g.stroke();
    // Gekruiste lansen.
    g.strokeStyle = '#e6eef8';
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(22, 40); g.lineTo(78, 140); g.moveTo(78, 40); g.lineTo(22, 140); g.stroke();
    // Schild.
    g.fillStyle = '#1b2236';
    g.beginPath();
    g.moveTo(30, 62); g.lineTo(70, 62); g.lineTo(70, 100); g.quadraticCurveTo(70, 124, 50, 134); g.quadraticCurveTo(30, 124, 30, 100); g.closePath();
    g.fill();
    g.strokeStyle = '#ffd36b';
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#4cc9ff';
    g.beginPath(); g.moveTo(50, 72); g.lineTo(60, 96); g.lineTo(50, 122); g.lineTo(40, 96); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.12)';
    g.fillRect(6, 8, 30, 200);
    banners[color] = c;
    return c;
  }

  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = v => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
    return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  }

  function load(src) {
    return new Promise(done => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = src;
    });
  }

  // Twee eigen foto's, dan een grappige; wat overblijft komt achteraan.
  function mix(own, fun) {
    if (!own.length || !fun.length) return [...own, ...fun];
    const out = [];
    let f = 0;
    own.forEach((p, i) => { out.push(p); if (i % 2 && f < fun.length) out.push(fun[f++]); });
    return out.concat(fun.slice(f));
  }

  // Pas laden als een spel de posters echt nodig heeft: zo haalt de leerlingpagina ze niet op voor elk spel.
  let started = false;
  function start() {
    if (started || typeof fetch === 'undefined') return;
    started = true;
    fetch('/posters/lijst')
      .then(r => (r.ok ? r.json() : []))
      .then(res => {
        const names = Array.isArray(res) ? res : res.eigen || [];
        const fun = res.grappig === false ? [] : GRAPPIG;
        return Promise.all([
          Promise.all(names.map(n => load(`/posters/${encodeURIComponent(n)}`))),
          Promise.all(fun.map(([file]) => load(`/img/posters/${file}.webp`))),
        ]).then(([own, funny]) => mix(
          own.filter(Boolean).map(img => frame(img)),
          funny.map((img, i) => img && frame(img, fun[i][1])).filter(Boolean),
        ));
      })
      .then(frames => {
        if (!frames.length) return;
        list.push(...frames);
        version++;
        for (const f of subs) f();
      })
      .catch(() => {});
  }

  // Een poster op een schuin vlak (een zijmuur in perspectief), in smalle verticale stroken.
  // P(u, v) geeft het scherm-punt voor u (0 links, 1 rechts) en v (0 onder, 1 boven) van de poster.
  function plane(g, img, P, n = 14) {
    for (let k = 0; k < n; k++) {
      const a = k / n, b = (k + 1) / n;
      const [x0, b0] = P(a, 0), [, t0] = P(a, 1), [x1, b1] = P(b, 0), [, t1] = P(b, 1);
      const top = (t0 + t1) / 2, h = (b0 + b1) / 2 - top;
      if (h > 0) g.drawImage(img, a * img.width, 0, img.width / n, img.height, Math.min(x0, x1), top, Math.abs(x1 - x0) + .7, h);
    }
  }

  // De i-de poster (rondgaand), of null als er geen zijn.
  const pick = i => (start(), list.length ? list[((i % list.length) + list.length) % list.length] : null);

  return {
    get list() { start(); return list; },
    pick,
    plane,
    banner,
    get version() { start(); return version; },
    onChange(f) { subs.push(f); },
  };
})();
