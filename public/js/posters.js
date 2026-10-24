// Posters en banieren voor aan de muren van de arena.
// Eigen foto's staan in de map posters/ naast LANcelot (nooit op GitHub). De server geeft de lijst via /posters/lijst.
// Elke foto krijgt een ijzeren lijst met gouden rand en een naambordje; tussen de posters hangen banieren van de teams.
const Posters = (() => {
  const list = [];
  const subs = [];
  let version = 0;

  function cover(g, img, x, y, w, h) {
    const s = Math.max(w / img.width, h / img.height);
    const sw = w / s, sh = h / s;
    g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  }

  // Een ingelijste poster: 200 x 236 pixels.
  function frame(img) {
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
    g.font = "900 18px 'Orbitron', 'Exo 2', sans-serif";
    g.textAlign = 'center';
    g.fillText('LEGENDE', 100, 221);
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

  function load(name) {
    return new Promise(done => {
      const img = new Image();
      img.onload = () => done(img);
      img.onerror = () => done(null);
      img.src = `/posters/${encodeURIComponent(name)}`;
    });
  }

  if (typeof fetch !== 'undefined') {
    fetch('/posters/lijst')
      .then(r => (r.ok ? r.json() : []))
      .then(names => Promise.all(names.map(load)))
      .then(imgs => {
        for (const img of imgs) if (img) list.push(frame(img));
        if (!list.length) return;
        version++;
        for (const f of subs) f();
      })
      .catch(() => {});
  }

  return {
    list,
    banner,
    get version() { return version; },
    onChange(f) { subs.push(f); },
  };
})();
