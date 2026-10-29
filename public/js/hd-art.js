// Mijn huisdier tekenen: vijf soorten (draakje, lichtvos, sterrenuil, griffioen en robodiertje) in vijf fasen
// (ei, baby, jong, groot, ridder), met een kleur, een stemming en een hoedje. Alles met lijnen en verlopen, geen plaatjes.
// HdArt.teken(g, dier, x, y, h, opts) tekent met de voetjes op (x, y), ongeveer h pixels hoog.
// HdArt.sprite(dier, h) geeft een gebakken canvas (voor het Klaseiland, Mijn burcht en Het rijk van Lancelot).
// Ook op de server bruikbaar voor de lijsten (SOORTEN, KLEUREN, HOEDEN, FASEN).
(function (root) {
  const SOORTEN = [
    { id: 'draak', naam: 'Draakje', kunst: 'Vuurspuwen' },
    { id: 'vos', naam: 'Lichtvos', kunst: 'Lichtflits' },
    { id: 'uil', naam: 'Sterrenuil', kunst: 'Sterrenregen' },
    { id: 'griffioen', naam: 'Griffioen', kunst: 'Windvlaag' },
    { id: 'robo', naam: 'Robodiertje', kunst: 'Laserlicht' },
  ];
  // a: de kleur van het lijf, b: de buik en de lichte stukken, g: het neonlicht.
  const KLEUREN = [
    { naam: 'Robijn', a: '#ff5a6e', b: '#ffd9c2', g: '#ffb84a' },
    { naam: 'Saffier', a: '#3d8bff', b: '#d6ecff', g: '#4cf0ff' },
    { naam: 'Smaragd', a: '#2fc48a', b: '#dcf7d0', g: '#9bff6a' },
    { naam: 'Amethist', a: '#9a6bff', b: '#ece0ff', g: '#ff7ce6' },
    { naam: 'Goud', a: '#ffb321', b: '#fff1c4', g: '#fff27a' },
    { naam: 'Vuur', a: '#ff7a33', b: '#ffe2b8', g: '#ffd23f' },
    { naam: 'Roze', a: '#ff74c8', b: '#ffe3f3', g: '#b48cff' },
    { naam: 'IJs', a: '#7fd7ff', b: '#f0fbff', g: '#a3fff1' },
    { naam: 'Nacht', a: '#3b4466', b: '#c7cde6', g: '#4cc9ff' },
    { naam: 'Sneeuw', a: '#eef1f8', b: '#ffffff', g: '#7fd0ff' },
  ];
  // Hoedjes verdien je met je wapenschilden en je rang (de server zegt welke van jou zijn).
  const HOEDEN = [
    { id: '', naam: 'Geen', teken: '∅', hoe: '' },
    { id: 'strik', naam: 'Strikje', teken: '🎀', hoe: 'Heb je meteen' },
    { id: 'sjaal', naam: 'Sjaaltje', teken: '🧣', hoe: 'Wapenschild Eerste zwaardslag' },
    { id: 'helm', naam: 'Ridderhelmpje', teken: '⛑️', hoe: 'Word Wapenknecht' },
    { id: 'krans', naam: 'Bloemenkrans', teken: '🌸', hoe: 'Wapenschild Trouwe ridder' },
    { id: 'bril', naam: 'Cyberbril', teken: '🥽', hoe: 'Wapenschild Groeier' },
    { id: 'koptel', naam: 'Koptelefoon', teken: '🎧', hoe: 'Wapenschild Herhaler' },
    { id: 'tover', naam: 'Tovenaarshoed', teken: '🧙', hoe: 'Wapenschild Runenlezer' },
    { id: 'bouw', naam: 'Bouwhelm', teken: '👷', hoe: 'Wapenschild Bouwmeester' },
    { id: 'cape', naam: 'Ridderscape', teken: '🦸', hoe: 'Wapenschild Volhouder' },
    { id: 'kroon', naam: 'Kroontje', teken: '👑', hoe: 'Wapenschild Geëerd' },
  ];
  const FASEN = [
    { naam: 'Ei', vanaf: 0 },
    { naam: 'Baby', vanaf: 0 },
    { naam: 'Jong', vanaf: 150 },
    { naam: 'Groot', vanaf: 500 },
    { naam: 'Ridder', vanaf: 1200 },
  ];
  // Trucjes: één per fase erbij.
  const TRUCS = [
    { id: 'hop', naam: 'Huppelen', fase: 1, teken: '🐾' },
    { id: 'salto', naam: 'Salto', fase: 2, teken: '🤸' },
    { id: 'kunst', naam: 'Kunstje', fase: 3, teken: '✨' },
    { id: 'vlieg', naam: 'Rondvliegen', fase: 4, teken: '🪽' },
  ];

  const api = { SOORTEN, KLEUREN, HOEDEN, FASEN, TRUCS };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    return;
  }

  const PI = Math.PI;
  function mix(hex, naar, f) {
    const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const a = p(hex);
    const b = p(naar);
    return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(',')})`;
  }
  const donker = (h, f = 0.35) => mix(h, '#1a1030', f);
  const licht = (h, f = 0.35) => mix(h, '#ffffff', f);
  const rgba = (hex, a) => `rgba(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',')},${a})`;

  function ovaal(g, x, y, rx, ry, rot = 0) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, PI * 2);
  }
  function vul(g, kleur, lijn, w = 2.6) {
    g.fillStyle = kleur;
    g.fill();
    if (lijn) {
      g.strokeStyle = lijn;
      g.lineWidth = w;
      g.lineJoin = 'round';
      g.lineCap = 'round';
      g.stroke();
    }
  }
  // Een bol met licht van linksboven.
  function bol(g, x, y, r, kleur) {
    const v = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
    v.addColorStop(0, licht(kleur, 0.35));
    v.addColorStop(0.6, kleur);
    v.addColorStop(1, mix(kleur, '#1a1030', 0.2));
    return v;
  }
  function gloei(g, kleur, blur) {
    g.shadowColor = kleur;
    g.shadowBlur = blur;
  }
  function geenGloed(g) {
    g.shadowBlur = 0;
    g.shadowColor = 'transparent';
  }

  // De maten van het lijf per fase (in eenheden: het dier is ongeveer 100 hoog).
  function maten(fase) {
    const f = Math.max(1, Math.min(4, fase));
    const lijf = [0, 20, 25, 29, 31][f];
    const kop = [0, 29, 29, 29, 29][f];
    const lijfY = -lijf * 0.92;
    const kopY = lijfY * 2 - kop * 0.5;
    return { lijf, kop, lijfY, kopY, schaal: [0, 0.66, 0.8, 0.92, 1][f], fase: f };
  }

  // ---------- Achter het lijf: staart, vleugels, cape ----------

  function staart(g, d, m, K, o) {
    const zwaai = Math.sin(o.t / 380) * 0.12;
    const lijn = donker(K.a, 0.45);
    g.save();
    g.translate(m.lijf * 0.7, m.lijfY + m.lijf * 0.45);
    g.rotate(zwaai);
    if (d.soort === 'draak') {
      g.beginPath();
      g.moveTo(-6, -4);
      g.quadraticCurveTo(22, 4, 30, -18);
      g.quadraticCurveTo(24, -2, -4, 6);
      g.closePath();
      vul(g, K.a, lijn);
      // de punt als een schoppen
      g.beginPath();
      g.moveTo(30, -18);
      g.lineTo(23, -26);
      g.lineTo(31, -34);
      g.lineTo(39, -24);
      g.closePath();
      if (m.fase >= 3) gloei(g, K.g, 10);
      vul(g, m.fase >= 3 ? K.g : licht(K.a, 0.2), lijn);
      geenGloed(g);
    } else if (d.soort === 'vos') {
      g.beginPath();
      g.moveTo(-6, 2);
      g.bezierCurveTo(10, 16, 40, 8, 38, -22);
      g.bezierCurveTo(36, -38, 24, -40, 22, -30);
      g.bezierCurveTo(26, -14, 12, -4, -4, -8);
      g.closePath();
      vul(g, K.a, lijn);
      // de lichtgevende punt
      g.save();
      g.clip();
      gloei(g, K.g, 14);
      ovaal(g, 32, -30, 13, 12);
      g.fillStyle = m.fase >= 2 ? licht(K.g, 0.45) : K.b;
      g.fill();
      g.restore();
      geenGloed(g);
    } else if (d.soort === 'griffioen') {
      g.beginPath();
      g.moveTo(-4, 0);
      g.quadraticCurveTo(20, 10, 26, -14);
      g.strokeStyle = lijn;
      g.lineWidth = 6.5;
      g.lineCap = 'round';
      g.stroke();
      g.strokeStyle = K.a;
      g.lineWidth = 3.6;
      g.stroke();
      ovaal(g, 27, -18, 6, 8, 0.4);
      vul(g, K.b, lijn);
    } else if (d.soort === 'uil') {
      for (let i = -1; i <= 1; i++) {
        ovaal(g, -2 + i * 5, 8, 4, 9, 0.4 + i * 0.35);
        vul(g, donker(K.a, 0.15), lijn, 2);
      }
    } else if (d.soort === 'robo') {
      // een veertje met een lampje
      g.beginPath();
      g.moveTo(-4, 0);
      for (let i = 0; i < 4; i++) g.lineTo(4 + i * 5, (i % 2 ? -4 : 4) - i * 4);
      g.strokeStyle = '#8b93ab';
      g.lineWidth = 3;
      g.stroke();
      gloei(g, K.g, 10);
      ovaal(g, 22, -16, 4.5, 4.5);
      vul(g, K.g, null);
      geenGloed(g);
    }
    g.restore();
  }

  function vleugels(g, d, m, K, o) {
    if (!['draak', 'griffioen'].includes(d.soort)) return;
    const flap = o.flap != null ? o.flap : Math.sin(o.t / 600) * 0.08;
    const groot = 0.6 + m.fase * 0.16;
    const lijn = donker(K.a, 0.45);
    for (const kant of [-1, 1]) {
      g.save();
      g.translate(kant * m.lijf * 0.45, m.lijfY - m.lijf * 0.45);
      g.scale(kant * groot, groot);
      g.rotate(-0.25 - flap);
      if (d.soort === 'draak') {
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(26, -26);
        g.quadraticCurveTo(30, -10, 34, -6);
        g.quadraticCurveTo(26, -4, 24, 2);
        g.quadraticCurveTo(16, -2, 12, 6);
        g.quadraticCurveTo(6, 2, 0, 8);
        g.closePath();
        vul(g, donker(K.a, 0.18), lijn);
        g.beginPath();
        g.moveTo(2, 2);
        g.lineTo(24, -20);
        g.moveTo(4, 4);
        g.lineTo(18, -4);
        g.strokeStyle = lijn;
        g.lineWidth = 1.6;
        g.stroke();
        if (m.fase >= 3) {
          gloei(g, K.g, 8);
          g.beginPath();
          g.moveTo(26, -26);
          g.quadraticCurveTo(30, -10, 34, -6);
          g.strokeStyle = K.g;
          g.lineWidth = 2;
          g.stroke();
          geenGloed(g);
        }
      } else {
        // veren in drie rijen
        for (let i = 3; i >= 0; i--) {
          ovaal(g, 10 + i * 6, -12 + i * 4, 7, 19 - i * 2, 0.9);
          vul(g, i % 2 ? K.b : licht(K.a, 0.25), lijn, 2);
        }
        if (m.fase >= 3) {
          gloei(g, K.g, 8);
          ovaal(g, 30, 2, 4, 9, 0.9);
          vul(g, K.g, null);
          geenGloed(g);
        }
      }
      g.restore();
    }
  }

  function cape(g, m, K) {
    const y = m.lijfY - m.lijf * 0.75;
    g.beginPath();
    g.moveTo(-m.lijf * 0.6, y);
    g.quadraticCurveTo(-m.lijf * 1.25, -4, -m.lijf * 0.95, -2);
    g.lineTo(m.lijf * 0.95, -2);
    g.quadraticCurveTo(m.lijf * 1.25, -4, m.lijf * 0.6, y);
    g.closePath();
    vul(g, '#c4304a', '#6a1424');
  }

  // ---------- Lijf en kop ----------

  function lijf(g, d, m, K, o) {
    const lijn = donker(K.a, 0.45);
    const { lijf: r, lijfY: y } = m;
    // pootjes
    for (const kant of [-1, 1]) {
      ovaal(g, kant * r * 0.45, -3, r * 0.34, r * 0.22);
      vul(g, d.soort === 'robo' ? '#6c7590' : d.soort === 'griffioen' || d.soort === 'uil' ? '#ffb321' : donker(K.a, 0.1), lijn);
    }
    if (d.soort === 'robo') {
      g.beginPath();
      g.roundRect(-r * 0.92, y - r * 0.85, r * 1.84, r * 1.75, r * 0.45);
      const v = g.createLinearGradient(-r, 0, r, 0);
      v.addColorStop(0, licht(K.a, 0.25));
      v.addColorStop(1, mix(K.a, '#5a6380', 0.45));
      vul(g, v, '#2b3048');
      // borstlampje
      gloei(g, K.g, 12);
      ovaal(g, 0, y + r * 0.05, r * 0.26, r * 0.26);
      vul(g, K.g, '#2b3048', 2);
      geenGloed(g);
      for (const kant of [-1, 1]) {
        ovaal(g, kant * r * 0.62, y - r * 0.55, 2, 2);
        vul(g, '#2b3048', null);
      }
    } else {
      ovaal(g, 0, y, r * 0.98, r * 0.95);
      vul(g, bol(g, 0, y, r, K.a), lijn);
      // buik
      ovaal(g, 0, y + r * 0.18, r * 0.62, r * 0.66);
      vul(g, K.b, null);
      if (d.soort === 'draak') {
        g.strokeStyle = rgba('#000000', 0.12);
        g.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(-r * 0.45, y - r * 0.05 + i * r * 0.28);
          g.quadraticCurveTo(0, y + r * 0.08 + i * r * 0.28, r * 0.45, y - r * 0.05 + i * r * 0.28);
          g.stroke();
        }
      } else if (d.soort === 'uil') {
        g.strokeStyle = 'rgba(0,0,0,.14)';
        g.lineWidth = 1.6;
        for (let j = 0; j < 3; j++) for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.arc(i * r * 0.25 + (j % 2) * r * 0.12, y + r * 0.0 + j * r * 0.22, r * 0.1, 0.2, PI - 0.2);
          g.stroke();
        }
      }
    }
    // armpjes (bij de uil vleugeltjes)
    for (const kant of [-1, 1]) {
      g.save();
      g.translate(kant * r * 0.9, y - r * 0.05);
      g.rotate(kant * (0.5 + (o.armen || 0)));
      if (d.soort === 'uil') ovaal(g, 0, 6, r * 0.24, r * 0.5);
      else ovaal(g, 0, 4, r * 0.2, r * 0.3);
      vul(g, d.soort === 'robo' ? '#8b93ab' : d.soort === 'uil' ? donker(K.a, 0.12) : K.a, d.soort === 'robo' ? '#2b3048' : lijn);
      g.restore();
    }
    // Ridder: een borstplaat van staal met een neon-embleem
    if (m.fase >= 4) {
      g.beginPath();
      g.moveTo(-r * 0.62, y - r * 0.5);
      g.quadraticCurveTo(0, y - r * 0.75, r * 0.62, y - r * 0.5);
      g.lineTo(r * 0.5, y + r * 0.35);
      g.quadraticCurveTo(0, y + r * 0.7, -r * 0.5, y + r * 0.35);
      g.closePath();
      const v = g.createLinearGradient(-r, y - r, r, y + r);
      v.addColorStop(0, '#eef2fb');
      v.addColorStop(0.5, '#9aa4bd');
      v.addColorStop(1, '#5d6782');
      vul(g, v, '#2b3048', 2.2);
      gloei(g, K.g, 12);
      g.beginPath();
      g.moveTo(0, y - r * 0.32);
      g.lineTo(r * 0.18, y - r * 0.05);
      g.lineTo(0, y + r * 0.22);
      g.lineTo(-r * 0.18, y - r * 0.05);
      g.closePath();
      vul(g, K.g, null);
      geenGloed(g);
    }
  }

  function oren(g, d, m, K) {
    const { kop: r, kopY: y } = m;
    const lijn = donker(K.a, 0.45);
    if (d.soort === 'draak') {
      for (const kant of [-1, 1]) {
        g.beginPath();
        g.moveTo(kant * r * 0.35, y - r * 0.75);
        g.quadraticCurveTo(kant * r * 0.55, y - r * 1.35, kant * r * 0.82, y - r * 1.38);
        g.quadraticCurveTo(kant * r * 0.68, y - r * 1.0, kant * r * 0.7, y - r * 0.62);
        g.closePath();
        vul(g, K.b, lijn);
        // oortjes opzij
        g.beginPath();
        g.moveTo(kant * r * 0.85, y - r * 0.2);
        g.lineTo(kant * r * 1.3, y - r * 0.45);
        g.lineTo(kant * r * 0.95, y + r * 0.1);
        g.closePath();
        vul(g, donker(K.a, 0.1), lijn);
      }
    } else if (d.soort === 'vos') {
      for (const kant of [-1, 1]) {
        g.beginPath();
        g.moveTo(kant * r * 0.2, y - r * 0.8);
        g.lineTo(kant * r * 0.78, y - r * 1.5);
        g.lineTo(kant * r * 0.92, y - r * 0.38);
        g.closePath();
        vul(g, K.a, lijn);
        g.beginPath();
        g.moveTo(kant * r * 0.36, y - r * 0.8);
        g.lineTo(kant * r * 0.74, y - r * 1.28);
        g.lineTo(kant * r * 0.8, y - r * 0.55);
        g.closePath();
        vul(g, m.fase >= 3 ? licht(K.g, 0.3) : K.b, null);
      }
    } else if (d.soort === 'uil') {
      for (const kant of [-1, 1]) {
        g.beginPath();
        g.moveTo(kant * r * 0.4, y - r * 0.85);
        g.lineTo(kant * r * 0.95, y - r * 1.3);
        g.lineTo(kant * r * 0.9, y - r * 0.55);
        g.closePath();
        vul(g, donker(K.a, 0.12), lijn);
      }
    } else if (d.soort === 'griffioen') {
      // een kuif van drie veren
      for (let i = -1; i <= 1; i++) {
        g.save();
        g.translate(i * r * 0.22, y - r * 0.9);
        g.rotate(i * 0.4);
        ovaal(g, 0, -r * 0.25, r * 0.13, r * 0.32);
        vul(g, i ? K.a : K.b, lijn, 2);
        g.restore();
      }
    } else if (d.soort === 'robo') {
      g.beginPath();
      g.moveTo(0, y - r * 0.85);
      g.lineTo(0, y - r * 1.35);
      g.strokeStyle = '#4a5270';
      g.lineWidth = 3;
      g.stroke();
      gloei(g, K.g, 14);
      ovaal(g, 0, y - r * 1.42, r * 0.15, r * 0.15);
      vul(g, K.g, '#2b3048', 2);
      geenGloed(g);
      for (const kant of [-1, 1]) {
        g.beginPath();
        g.roundRect(kant * r * 0.98 - (kant > 0 ? 0 : r * 0.22), y - r * 0.3, r * 0.22, r * 0.5, 3);
        vul(g, '#8b93ab', '#2b3048', 2);
      }
    }
  }

  function kop(g, d, m, K, o) {
    const { kop: r, kopY: y } = m;
    const lijn = donker(K.a, 0.45);
    if (d.soort === 'robo') {
      g.beginPath();
      g.roundRect(-r * 0.98, y - r * 0.88, r * 1.96, r * 1.7, r * 0.5);
      const v = g.createLinearGradient(0, y - r, 0, y + r);
      v.addColorStop(0, licht(K.a, 0.3));
      v.addColorStop(1, mix(K.a, '#5a6380', 0.4));
      vul(g, v, '#2b3048');
      // het schermpje met de ogen
      g.beginPath();
      g.roundRect(-r * 0.74, y - r * 0.5, r * 1.48, r * 0.98, r * 0.32);
      vul(g, '#141a2e', '#2b3048', 2);
    } else {
      ovaal(g, 0, y, r, r * 0.92);
      vul(g, bol(g, 0, y, r, d.soort === 'griffioen' ? K.b : K.a), lijn);
      if (d.soort === 'vos') {
        // witte wangen en snuit
        g.beginPath();
        g.moveTo(-r * 0.95, y + r * 0.05);
        g.quadraticCurveTo(-r * 0.4, y + r * 0.15, 0, y + r * 0.05);
        g.quadraticCurveTo(r * 0.4, y + r * 0.15, r * 0.95, y + r * 0.05);
        g.quadraticCurveTo(r * 0.7, y + r * 0.9, 0, y + r * 0.9);
        g.quadraticCurveTo(-r * 0.7, y + r * 0.9, -r * 0.95, y + r * 0.05);
        g.closePath();
        vul(g, K.b, null);
      } else if (d.soort === 'uil') {
        for (const kant of [-1, 1]) {
          ovaal(g, kant * r * 0.4, y + r * 0.02, r * 0.4, r * 0.42);
          vul(g, K.b, null);
          if (m.fase >= 3) {
            gloei(g, K.g, 8);
            g.strokeStyle = rgba(K.g, 0.9);
            g.lineWidth = 1.8;
            g.stroke();
            geenGloed(g);
          }
        }
      } else if (d.soort === 'draak') {
        ovaal(g, 0, y + r * 0.45, r * 0.5, r * 0.32);
        vul(g, K.b, null);
      }
    }
    gezicht(g, d, m, K, o);
  }

  function gezicht(g, d, m, K, o) {
    const { kop: r, kopY: y } = m;
    const robo = d.soort === 'robo';
    const oogX = r * 0.38;
    const oogY = y + (robo ? -r * 0.03 : r * 0.02);
    const stemming = o.stemming || 'blij';
    const knipper = !o.stil && (o.t % 4200) < 140;
    const oogKleur = robo ? K.g : '#1c1430';
    if (robo) gloei(g, K.g, 8);
    for (const kant of [-1, 1]) {
      const x = kant * oogX;
      if (stemming === 'slaap' || knipper) {
        g.beginPath();
        g.arc(x, oogY - r * 0.04, r * 0.13, 0.15 * PI, 0.85 * PI);
        g.strokeStyle = oogKleur;
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.stroke();
      } else if (stemming === 'juich') {
        g.beginPath();
        g.arc(x, oogY + r * 0.06, r * 0.13, 1.15 * PI, 1.85 * PI);
        g.strokeStyle = oogKleur;
        g.lineWidth = 3.4;
        g.lineCap = 'round';
        g.stroke();
      } else {
        const kijk = o.kijk || 0;
        ovaal(g, x + kijk * r * 0.05, oogY, r * 0.15, r * 0.2);
        vul(g, oogKleur, null);
        if (!robo) {
          ovaal(g, x + kijk * r * 0.05 - r * 0.05, oogY - r * 0.07, r * 0.055, r * 0.065);
          vul(g, '#ffffff', null);
          ovaal(g, x + kijk * r * 0.05 + r * 0.05, oogY + r * 0.08, r * 0.028, r * 0.028);
          vul(g, '#ffffff', null);
        }
      }
    }
    geenGloed(g);
    if (!robo) {
      // roze wangetjes
      for (const kant of [-1, 1]) {
        ovaal(g, kant * r * 0.62, y + r * 0.3, r * 0.14, r * 0.08);
        vul(g, 'rgba(255,110,150,.45)', null);
      }
    }
    // mond of bek
    const my = y + r * 0.36;
    if (d.soort === 'uil' || d.soort === 'griffioen') {
      const groot = d.soort === 'griffioen' ? 1.4 : 1;
      g.beginPath();
      g.moveTo(-r * 0.12 * groot, my - r * 0.12);
      g.lineTo(r * 0.12 * groot, my - r * 0.12);
      g.quadraticCurveTo(r * 0.06, my + r * 0.12 * groot, 0, my + r * 0.18 * groot);
      g.quadraticCurveTo(-r * 0.06, my + r * 0.1, -r * 0.12 * groot, my - r * 0.12);
      vul(g, '#ffb321', '#a8600a', 2);
      if (stemming === 'eet' || stemming === 'juich') {
        ovaal(g, 0, my + r * 0.02, r * 0.07, r * 0.05);
        vul(g, '#7a2a34', null);
      }
      return;
    }
    if (d.soort === 'vos') {
      ovaal(g, 0, my - r * 0.12, r * 0.08, r * 0.06);
      vul(g, '#1c1430', null);
    } else if (d.soort === 'draak') {
      for (const kant of [-1, 1]) {
        ovaal(g, kant * r * 0.12, my - r * 0.02, r * 0.03, r * 0.02);
        vul(g, donker(K.a, 0.5), null);
      }
    }
    const kl = robo ? K.g : '#3a1830';
    if (stemming === 'eet' || stemming === 'juich') {
      ovaal(g, 0, my + r * 0.1, r * 0.12, r * 0.1);
      vul(g, robo ? K.g : '#7a2a34', robo ? null : kl, 1.6);
      if (!robo) {
        ovaal(g, 0, my + r * 0.15, r * 0.07, r * 0.04);
        vul(g, '#ff7d93', null);
      }
    } else if (stemming === 'slaap') {
      ovaal(g, 0, my + r * 0.08, r * 0.04, r * 0.035);
      vul(g, kl, null);
    } else {
      g.beginPath();
      g.moveTo(-r * 0.13, my + r * 0.04);
      g.quadraticCurveTo(-r * 0.065, my + r * 0.14, 0, my + r * 0.05);
      g.quadraticCurveTo(r * 0.065, my + r * 0.14, r * 0.13, my + r * 0.04);
      g.strokeStyle = kl;
      g.lineWidth = 2.4;
      g.lineCap = 'round';
      if (robo) gloei(g, K.g, 6);
      g.stroke();
      geenGloed(g);
    }
  }

  // ---------- Hoedjes ----------

  function hoed(g, d, m, K) {
    const { kop: r, kopY: y, lijfY } = m;
    const top = y - r * 0.86;
    switch (d.hoed) {
      case 'strik': {
        g.save();
        g.translate(r * 0.62, y - r * 0.68);
        g.rotate(0.3);
        for (const kant of [-1, 1]) {
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(kant * r * 0.36, -r * 0.2);
          g.lineTo(kant * r * 0.36, r * 0.2);
          g.closePath();
          vul(g, '#ff4d8d', '#9c1d4c', 2);
        }
        ovaal(g, 0, 0, r * 0.1, r * 0.1);
        vul(g, '#ff8db5', '#9c1d4c', 2);
        g.restore();
        break;
      }
      case 'sjaal': {
        const sy = lijfY - m.lijf * 0.62;
        g.beginPath();
        g.ellipse(0, sy, m.lijf * 0.82, m.lijf * 0.24, 0, 0, PI * 2);
        vul(g, '#e63950', '#7a1424', 2.2);
        g.beginPath();
        g.roundRect(m.lijf * 0.25, sy, m.lijf * 0.28, m.lijf * 0.7, 3);
        vul(g, '#e63950', '#7a1424', 2.2);
        g.strokeStyle = '#ffd1d8';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-m.lijf * 0.6, sy);
        g.lineTo(m.lijf * 0.6, sy);
        g.stroke();
        break;
      }
      case 'helm': {
        g.beginPath();
        g.arc(0, top + r * 0.42, r * 0.72, PI, 0);
        g.closePath();
        const v = g.createLinearGradient(-r, top, r, top + r);
        v.addColorStop(0, '#f2f5fc');
        v.addColorStop(1, '#7c86a2');
        vul(g, v, '#2b3048', 2.4);
        g.beginPath();
        g.rect(-r * 0.75, top + r * 0.32, r * 1.5, r * 0.14);
        vul(g, '#9aa4bd', '#2b3048', 2);
        // pluim
        g.beginPath();
        g.moveTo(0, top - r * 0.28);
        g.quadraticCurveTo(r * 0.6, top - r * 0.75, r * 0.85, top - r * 0.05);
        g.quadraticCurveTo(r * 0.45, top - r * 0.35, 0, top - r * 0.2);
        vul(g, '#ff4d6d', '#8a1830', 2);
        break;
      }
      case 'krans': {
        const kl = ['#ff7eb6', '#ffd23f', '#8be0ff', '#ffffff', '#b48cff'];
        for (let i = 0; i < 7; i++) {
          const a = PI + (i / 6) * PI;
          const x = Math.cos(a) * r * 0.78;
          const yy = y - r * 0.32 + Math.sin(a) * r * 0.55;
          for (let b = 0; b < 5; b++) {
            ovaal(g, x + Math.cos(b * 1.26) * r * 0.08, yy + Math.sin(b * 1.26) * r * 0.08, r * 0.07, r * 0.07);
            vul(g, kl[i % kl.length], null);
          }
          ovaal(g, x, yy, r * 0.05, r * 0.05);
          vul(g, '#ffb321', null);
        }
        break;
      }
      case 'bril': {
        gloei(g, K.g, 10);
        g.beginPath();
        g.roundRect(-r * 0.86, y - r * 0.22, r * 1.72, r * 0.42, r * 0.2);
        vul(g, rgba(K.g, 0.55), '#1c2238', 2.4);
        geenGloed(g);
        g.strokeStyle = 'rgba(255,255,255,.7)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-r * 0.6, y - r * 0.12);
        g.lineTo(-r * 0.3, y - r * 0.12);
        g.stroke();
        break;
      }
      case 'koptel': {
        g.beginPath();
        g.arc(0, y - r * 0.05, r * 0.98, 1.08 * PI, 1.92 * PI);
        g.strokeStyle = '#2b3048';
        g.lineWidth = 5;
        g.stroke();
        for (const kant of [-1, 1]) {
          g.beginPath();
          g.roundRect(kant * r * 0.98 - r * 0.17, y - r * 0.3, r * 0.34, r * 0.55, r * 0.12);
          vul(g, '#3a4466', '#1c2238', 2);
          gloei(g, K.g, 8);
          ovaal(g, kant * r * 0.98, y - r * 0.02, r * 0.07, r * 0.12);
          vul(g, K.g, null);
          geenGloed(g);
        }
        break;
      }
      case 'tover': {
        g.beginPath();
        g.moveTo(-r * 0.62, top + r * 0.18);
        g.quadraticCurveTo(-r * 0.1, top - r * 0.5, r * 0.12, top - r * 1.15);
        g.quadraticCurveTo(r * 0.2, top - r * 0.5, r * 0.62, top + r * 0.18);
        g.closePath();
        vul(g, '#5b3bd6', '#24125e', 2.4);
        ovaal(g, 0, top + r * 0.2, r * 0.85, r * 0.16);
        vul(g, '#6f4ff0', '#24125e', 2.2);
        g.fillStyle = '#fff27a';
        for (const [sx, sy] of [[-0.18, -0.2], [0.12, -0.55], [0.22, -0.05]]) {
          ster(g, sx * r, top + sy * r, r * 0.09);
          g.fill();
        }
        break;
      }
      case 'bouw': {
        g.beginPath();
        g.arc(0, top + r * 0.38, r * 0.7, PI, 0);
        g.closePath();
        vul(g, '#ffc21a', '#8a5a00', 2.4);
        ovaal(g, 0, top + r * 0.38, r * 0.92, r * 0.13);
        vul(g, '#ffd23f', '#8a5a00', 2.2);
        g.beginPath();
        g.rect(-r * 0.1, top - r * 0.3, r * 0.2, r * 0.6);
        vul(g, '#ffe28a', null);
        break;
      }
      case 'kroon': {
        g.beginPath();
        g.moveTo(-r * 0.48, top + r * 0.18);
        g.lineTo(-r * 0.52, top - r * 0.32);
        g.lineTo(-r * 0.24, top - r * 0.08);
        g.lineTo(0, top - r * 0.45);
        g.lineTo(r * 0.24, top - r * 0.08);
        g.lineTo(r * 0.52, top - r * 0.32);
        g.lineTo(r * 0.48, top + r * 0.18);
        g.closePath();
        const v = g.createLinearGradient(0, top - r * 0.5, 0, top + r * 0.2);
        v.addColorStop(0, '#fff3a6');
        v.addColorStop(1, '#e09a00');
        vul(g, v, '#8a5a00', 2.2);
        gloei(g, '#ff4d6d', 6);
        ovaal(g, 0, top - r * 0.02, r * 0.07, r * 0.07);
        vul(g, '#ff4d6d', null);
        geenGloed(g);
        break;
      }
    }
  }

  function ster(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -PI / 2 + (i * PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  }

  // ---------- Het ei ----------

  // klaar: 0..1, hoe dicht bij uitkomen (dan komen er barstjes).
  function ei(g, d, o) {
    const K = KLEUREN[d.kleur] || KLEUREN[0];
    const wiebel = o.stil ? 0 : Math.sin(o.t / 160) * 0.06 * (o.klaar > 0.6 ? 2 : 1) * (Math.sin(o.t / 1300) > 0.3 ? 1 : 0.15);
    g.save();
    g.rotate(wiebel);
    const r = 30;
    g.beginPath();
    g.moveTo(0, -r * 2.5);
    g.bezierCurveTo(r * 1.1, -r * 2.5, r * 1.2, -r * 0.3, 0, 0);
    g.bezierCurveTo(-r * 1.2, -r * 0.3, -r * 1.1, -r * 2.5, 0, -r * 2.5);
    g.closePath();
    gloei(g, K.g, 18);
    const v = g.createRadialGradient(-r * 0.35, -r * 1.7, 2, 0, -r * 1.2, r * 1.6);
    v.addColorStop(0, '#ffffff');
    v.addColorStop(0.5, K.b);
    v.addColorStop(1, mix(K.b, K.a, 0.45));
    vul(g, v, donker(K.a, 0.3), 2.6);
    geenGloed(g);
    g.save();
    g.clip();
    // vlekken in de kleur van het dier, en een neonband
    g.fillStyle = K.a;
    for (const [x, y, rr] of [[-14, -58, 7], [12, -44, 9], [-8, -26, 6], [16, -66, 5], [-20, -40, 4]]) {
      ovaal(g, x, y, rr, rr * 0.85);
      g.fill();
    }
    gloei(g, K.g, 8);
    g.fillStyle = rgba(K.g, 0.85);
    g.beginPath();
    for (let i = 0; i <= 8; i++) g.lineTo(-40 + i * 10, -36 + (i % 2 ? -5 : 5));
    for (let i = 8; i >= 0; i--) g.lineTo(-40 + i * 10, -32 + (i % 2 ? -5 : 5));
    g.closePath();
    g.fill();
    geenGloed(g);
    g.restore();
    const klaar = o.klaar || 0;
    if (klaar > 0.3) {
      g.beginPath();
      g.moveTo(-6, -r * 2.2);
      g.lineTo(0, -r * 1.95);
      g.lineTo(-5, -r * 1.75);
      if (klaar > 0.6) {
        g.lineTo(3, -r * 1.55);
        g.moveTo(0, -r * 1.95);
        g.lineTo(9, -r * 1.85);
      }
      g.strokeStyle = donker(K.a, 0.5);
      g.lineWidth = 2;
      g.stroke();
    }
    g.restore();
  }

  // ---------- Alles samen ----------

  function teken(g, dier, x, y, h, opts = {}) {
    if (!dier) return;
    const o = { t: 0, ...opts };
    const K = KLEUREN[dier.kleur] || KLEUREN[0];
    g.save();
    g.translate(x, y);
    if (!dier.fase) {
      const s = h / 80;
      g.scale(s, s);
      if (!o.geenSchaduw) {
        ovaal(g, 0, 0, 26, 6);
        g.fillStyle = 'rgba(10,14,24,.28)';
        g.fill();
      }
      ei(g, dier, o);
      g.restore();
      return;
    }
    const m = maten(dier.fase);
    const s = (h / 100) * m.schaal * 1.02;
    if (!o.geenSchaduw) {
      g.save();
      g.scale(s, s);
      ovaal(g, 0, 0, m.lijf * 1.05 * (1 - Math.min(0.6, (o.dy || 0) / -120)), m.lijf * 0.24);
      g.fillStyle = 'rgba(10,14,24,.28)';
      g.fill();
      g.restore();
    }
    // Ademen: een heel klein beetje breder en lager.
    const adem = o.stil ? 0 : Math.sin(o.t / 520) * 0.02;
    g.translate(0, o.dy || 0);
    g.scale(s * (1 + adem + (o.plet || 0)), s * (1 - adem - (o.plet || 0)));
    if (o.draai) {
      g.translate(0, -50);
      g.rotate(o.draai);
      g.translate(0, 50);
    }
    if (o.spiegel) g.scale(-1, 1);
    const d = { ...dier };
    if (d.hoed === 'cape') cape(g, m, K);
    staart(g, d, m, K, o);
    vleugels(g, d, m, K, o);
    lijf(g, d, m, K, o);
    if (d.hoed === 'sjaal') hoed(g, d, m, K);
    oren(g, d, m, K);
    kop(g, d, m, K, o);
    if (d.hoed && d.hoed !== 'sjaal' && d.hoed !== 'cape') hoed(g, d, m, K);
    g.restore();
  }

  // Gebakken, zonder bewegen: voor de eilanden en de wereld. Een kleine cache per uitzicht.
  const cache = new Map();
  function sprite(dier, h = 48) {
    if (!dier) return null;
    const sleutel = `${dier.soort}|${dier.kleur}|${dier.fase}|${dier.hoed || ''}|${h}`;
    let c = cache.get(sleutel);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = Math.ceil(h * 1.5);
    c.height = Math.ceil(h * 1.45);
    teken(c.getContext('2d'), dier, c.width / 2, c.height - h * 0.08, h, { stil: true });
    if (cache.size > 120) cache.clear();
    cache.set(sleutel, c);
    return c;
  }

  // Een ridder met zijn huisdier aan zijn voeten (rechts), als één tekening.
  function metRidder(ridder, dier) {
    if (!dier) return ridder;
    const h = ridder ? ridder.height : 64;
    const p = sprite(dier, Math.round(h * 0.5));
    if (!ridder) return p;
    const c = document.createElement('canvas');
    c.width = ridder.width + Math.round(p.width * 0.62);
    c.height = h;
    const g = c.getContext('2d');
    g.drawImage(ridder, 0, 0);
    g.drawImage(p, c.width - p.width, h - p.height + Math.round(h * 0.02));
    return c;
  }

  Object.assign(api, { teken, sprite, metRidder, ster });
  root.HdArt = api;
})(this);
