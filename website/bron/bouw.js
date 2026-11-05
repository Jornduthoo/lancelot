// Bouwt de website van LANcelot (website/site) in vijf talen: node website/bron/bouw.js
// De teksten staan in website/bron/teksten/<taal>.json. De spellen (naam, uitleg, icoon) komen rechtstreeks uit
// het leerkrachtenscherm (public/host.html) en de vertalingen van de app (lang/<taal>/*.json): een nieuw spel in de
// app staat zo na een nieuwe bouw ook op de website. Cloudflare Pages publiceert de map website/site zoals ze is.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BRON = __dirname;
const SITE = path.join(ROOT, 'website', 'site');
const CONFIG = JSON.parse(fs.readFileSync(path.join(BRON, 'site.json'), 'utf8'));
const TALEN = ['nl', 'en', 'fr', 'es', 'de'];
// Spellen waarvan de naam naar een bestaand spel verwijst, staan niet op de website.
const NIET_OP_SITE = new Set(CONFIG.nietOpSite || []);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function appWoorden(taal) {
  if (taal === 'nl') return {};
  const dir = path.join(ROOT, 'lang', taal);
  const uit = {};
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort()) Object.assign(uit, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  return uit;
}

// De spellen uit de Arena van het leerkrachtenscherm, per groep.
function spellen() {
  const html = fs.readFileSync(path.join(ROOT, 'public', 'host.html'), 'utf8');
  const start = html.indexOf('id="realm-arena"');
  const einde = html.indexOf('realm-panel', start + 20);
  if (start < 0 || einde < 0) throw new Error('De Arena niet gevonden in public/host.html');
  const stuk = html.slice(start, einde);
  const re = /<h3>([^<]*)<\/h3>|data-module="([^"]+)"[\s\S]*?src="\/img\/icons\/([^"]+)"[\s\S]*?<strong>([^<]*)<\/strong>\s*<span>([^<]*)<\/span>/g;
  const groepen = [];
  let m, totaal = 0;
  while ((m = re.exec(stuk))) {
    if (m[1]) { groepen.push({ naam: m[1], spellen: [] }); continue; }
    totaal++;
    if (NIET_OP_SITE.has(m[2])) continue;
    groepen[groepen.length - 1].spellen.push({ id: m[2], icoon: m[3], naam: m[4].trim(), uitleg: m[5].trim(), groep: groepen[groepen.length - 1].naam });
  }
  return { groepen, totaal };
}

const SVG = {
  bord: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="19" height="12.5" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/></svg>',
  laptop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="5" width="15" height="10" rx="1.2"/><path d="M2 18.5h20l-1.5-3.5h-17z"/></svg>',
  gsm: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/></svg>',
  vink: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  wereld: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>',
  pijl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12M6.5 11l5.5 5.5 5.5-5.5M5 20h14"/></svg>',
  schild: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l7.5 3v5.6c0 4.6-3.2 8.3-7.5 9.8-4.3-1.5-7.5-5.2-7.5-9.8V5.8z"/></svg>',
  slot: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="1.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
  bliksem: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z"/></svg>',
  tegels: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/></svg>',
  munt: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6.5v11M15 9c-.6-1-1.7-1.5-3-1.5-1.8 0-3 .9-3 2.2 0 3 6 1.6 6 4.6 0 1.3-1.3 2.2-3 2.2-1.4 0-2.6-.6-3.1-1.6"/></svg>'
};
const PUNT_ICOON = ['tegels', 'bliksem', 'slot'];
const OPVOLGEN_ICOON = { zorg: 'burcht', taken: 'oefenblad', zegelrol: 'zegelrol', postduif: 'postduif' };
const MOTIVATIE_ICOON = { ridder: 'toernooi', klaseiland: 'klaseiland', huisdier: 'huisdier', runenraadsel: 'runenraadsel' };

function pad(taal) { return taal === 'nl' ? '/' : `/${taal}/`; }
const BASIS = CONFIG.adres.replace(/\/$/, '');
const INFO = JSON.parse(fs.readFileSync(path.join(BRON, 'spellen.json'), 'utf8'));
// Het privacybeleid (ook het adres dat in de Microsoft Store staat): bron/privacy.json, een pagina per taal.
const PRIVACY = JSON.parse(fs.readFileSync(path.join(BRON, 'privacy.json'), 'utf8'));
const privacyPad = taal => `${taal === 'nl' ? '' : taal + '/'}privacy.html`;
// Schermafbeeldingen per spel (website/site/beelden/<taal>/<id>-bord|cb|gsm.webp), gemaakt met bron/spelbeelden.js.
const BEELDEN = ['bord', 'cb', 'gsm'];
const spelPad = (taal, id) => `${taal === 'nl' ? '' : taal + '/'}spellen/${id}.html`;
const beeldPad = (taal, id) => `beelden/${taal}/${(INFO[id] && INFO[id].beeld) || id}`;
const heeftBeelden = (taal, id) => BEELDEN.every(b => fs.existsSync(path.join(SITE, `${beeldPad(taal, id)}-${b}.webp`)));

// Kop, menu, voet en taalwenk: dezelfde op elke pagina. root = weg naar de hoofdmap, thuis = weg naar de startpagina
// van deze taal, links = per taal de weg naar dezelfde pagina in die taal, adressen = per taal het volledige adres.
function omhulsel({ taal, t, alle, root, thuis, links, adressen, titel, omschrijving, beeld, main, extraCss = '' }) {
  const talenLinks = TALEN.map(x => `<a href="${links[x]}" hreflang="${x}" lang="${x}"${x === taal ? ' aria-current="page"' : ''}>${esc(alle[x].taalNaam)}</a>`).join('');
  const alternatieven = TALEN.map(x => `<link rel="alternate" hreflang="${x}" href="${adressen[x]}">`).join('\n  ')
    + `\n  <link rel="alternate" hreflang="x-default" href="${adressen.nl}">`;
  return `<!doctype html>
<html lang="${taal}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titel)}</title>
  <meta name="description" content="${esc(omschrijving)}">
  <link rel="canonical" href="${adressen[taal]}">
  ${alternatieven}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(titel)}">
  <meta property="og:description" content="${esc(omschrijving)}">
  <meta property="og:url" content="${adressen[taal]}">
  <meta property="og:image" content="${beeld}">
  <meta name="theme-color" content="#060a13">
  <link rel="icon" href="${root}img/favicon.png">
  <link rel="preload" href="${root}fonts/cinzel-latin-900-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${root}site.css">${extraCss}
</head>
<body>
  <a class="skip" href="#inhoud">${esc(t.nav.hallen)}</a>
  <header class="kop">
    <a class="merk" href="${thuis || './'}" aria-label="LANcelot"><img src="${root}img/mark.webp" alt="" width="40" height="40"><img class="woord" src="${root}img/wordmark.webp" alt="LANcelot" width="113" height="40"></a>
    <nav class="menu" aria-label="Menu">
      <a href="${thuis}#werkt">${esc(t.stappen.titel)}</a>
      <a href="${thuis}#hallen">${esc(t.nav.hallen)}</a>
      <a href="${thuis}#spellen">${esc(t.nav.spellen)}</a>
      <a href="${thuis}#ai">${esc(t.nav.ai)}</a>
      <a href="${thuis}#privacy">${esc(t.nav.privacy)}</a>
      <a href="${thuis}#faq">${esc(t.nav.faq)}</a>
    </nav>
    <details class="talen">
      <summary aria-label="${esc(t.voet.taal)}">${SVG.wereld}<span>${taal.toUpperCase()}</span></summary>
      <div class="talen-lijst">${talenLinks}</div>
    </details>
    <a class="knop klein" href="${thuis}#download">${esc(t.nav.download)}</a>
  </header>
  <p class="taalwenk" id="taalwenk" hidden></p>

  <main id="inhoud">
${main}
  </main>

  <footer class="voet">
    <img src="${root}img/mark.webp" alt="" width="48" height="48" loading="lazy">
    <p>${esc(t.voet.door)}</p>
    ${CONFIG.email ? `<p class="contact">${esc(t.voet.contact)} <a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a></p>` : ''}
    <nav class="voet-talen" aria-label="${esc(t.voet.taal)}">${talenLinks}</nav>
    <p class="klein"><a href="${root}${privacyPad(taal)}">${esc(PRIVACY[taal].link)}</a></p>
    <p class="klein">${esc(t.voet.rechten)}</p>
  </footer>
  <script>
  // Spreekt de browser een andere taal die de site heeft? Dan een klein wenkje, nooit een automatische sprong.
  (function () {
    var talen = ${JSON.stringify(Object.fromEntries(TALEN.map(x => [x, { naar: links[x], zin: alle[x].taalWenk }])))};
    var huidig = ${JSON.stringify(taal)};
    try { if (localStorage.getItem('lancelot-taal')) return; } catch (e) {}
    var b = (navigator.language || '').slice(0, 2).toLowerCase();
    if (!talen[b] || b === huidig) return;
    var p = document.getElementById('taalwenk');
    var a = document.createElement('a');
    a.href = talen[b].naar; a.lang = b; a.textContent = talen[b].zin;
    var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', '×'); x.textContent = '×';
    x.onclick = function () { p.hidden = true; try { localStorage.setItem('lancelot-taal', huidig); } catch (e) {} };
    p.appendChild(a); p.appendChild(x); p.hidden = false;
  })();
  // Video: YouTube laadt pas na een klik (privacyvriendelijk, youtube-nocookie).
  document.querySelectorAll('.video[data-yt]').forEach(function (v) {
    v.querySelector('button').addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(v.getAttribute('data-yt')) + '?autoplay=1&rel=0';
      f.title = 'LANcelot'; f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen = true;
      v.innerHTML = ''; v.appendChild(f);
    });
  });
  document.querySelectorAll('.talen-lijst a, .voet-talen a').forEach(function (a) {
    a.addEventListener('click', function () { try { localStorage.setItem('lancelot-taal', a.lang); } catch (e) {} });
  });
  </script>
</body>
</html>
`;
}

function pagina(taal, t, w, data, alle) {
  const n = CONFIG.aantalSpellen || `${Math.floor(data.totaal / 10) * 10}+`;
  const vul = s => String(s).replace(/\{n\}/g, n);
  const tr = s => (w[s] && typeof w[s] === 'string' ? w[s] : s);
  const rel = taal === 'nl' ? '' : '../';
  const shot = naam => `${rel}shots/${taal}-${naam}.webp`;

  const spelTegels = data.groepen.map(g => `
      <h3 class="groep">${esc(t.spellen.groepen[g.naam] || tr(g.naam))}</h3>
      <ul class="spellen">${g.spellen.map(s => `
        <li class="spel"><a href="spellen/${s.id}.html" title="${esc(tr(s.uitleg))}"><img src="${rel}img/spellen/${s.icoon}" alt="" width="64" height="64" loading="lazy" decoding="async"><div><strong>${esc(tr(s.naam))}</strong><span>${esc(tr(s.uitleg))}</span></div></a></li>`).join('')}
      </ul>`).join('');

  const main = `    <section class="held">
      <div class="held-in">
        <img class="logo" src="${rel}img/logo.webp" alt="LANcelot" width="440" height="400" fetchpriority="high">
        <p class="kicker">${esc(t.hero.kicker)}</p>
        <h1>${esc(vul(t.hero.titel))}</h1>
        <p class="lead">${esc(t.hero.tekst)}</p>
        <div class="knoppen">
          <a class="knop" href="#download">${esc(t.hero.knop)}</a>
          <a class="knop tweede" href="#spellen">${esc(t.hero.knop2)}</a>
        </div>
        <p class="noot">${esc(t.hero.noot)}</p>
      </div>
    </section>

    <section class="punten" aria-label="LANcelot">
      ${t.punten.map((p, i) => `<div class="punt">${SVG[PUNT_ICOON[i]]}<h2>${esc(p.titel)}</h2><p>${esc(p.tekst)}</p></div>`).join('\n      ')}
    </section>

${(CONFIG.videos || {})[taal] ? `    <section class="blok" id="video">
      <h2 class="titel">${esc(t.video.titel)}</h2>
      <div class="video" data-yt="${esc(CONFIG.videos[taal])}">
        <button type="button" class="video-start" aria-label="${esc(t.video.knop)}">
          <img src="${rel}video/${taal}.webp" alt="" width="960" height="540" loading="lazy" decoding="async">
          <span class="video-knop"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>${esc(t.video.knop)}</span>
        </button>
      </div>
      <p class="noot video-noot">${esc(t.video.noot)}</p>
    </section>

` : ''}    <section class="blok" id="werkt">
      <h2 class="titel">${esc(t.stappen.titel)}</h2>
      <ol class="stappen">
        ${t.stappen.lijst.map(s => `<li><h3>${esc(s.titel)}</h3><p>${esc(s.tekst)}</p></li>`).join('\n        ')}
      </ol>
      <div class="schermen">
        <figure class="scherm-bord"><img src="${shot('host')}" alt="${esc(t.schermen.bord)}" width="1200" height="750" loading="lazy" decoding="async"><figcaption>${esc(t.schermen.bord)}</figcaption></figure>
        <figure class="scherm-gsm"><img src="${shot('gsm')}" alt="${esc(t.schermen.gsm)}" width="390" height="844" loading="lazy" decoding="async"><figcaption>${esc(t.schermen.gsm)}</figcaption></figure>
      </div>
    </section>

    <section class="blok" id="hallen">
      <h2 class="titel">${esc(t.hallen.titel)}</h2>
      <p class="intro">${esc(t.hallen.tekst)}</p>
      <ul class="hallen">
        ${t.hallen.lijst.map(h => `<li class="hal"><img src="${rel}img/spellen/${h.id}.webp" alt="" width="96" height="96" loading="lazy" decoding="async"><h3>${esc(h.naam)}</h3><p>${esc(h.tekst)}</p></li>`).join('\n        ')}
      </ul>
    </section>

    <section class="blok" id="spellen">
      <h2 class="titel">${esc(vul(t.spellen.titel))}</h2>
      <p class="intro">${esc(t.spellen.tekst)}</p>
      <figure class="breed"><img src="${shot('arena')}" alt="${esc(t.hallen.lijst[0].naam)}" width="1200" height="467" loading="lazy" decoding="async"></figure>
      ${spelTegels}
    </section>

    <section class="blok duo" id="ai">
      <div>
        <h2 class="titel">${esc(t.ai.titel)}</h2>
        <p class="intro">${esc(t.ai.tekst)}</p>
        <ul class="vinken">${t.ai.lijst.map(x => `<li>${SVG.vink}<span>${esc(x)}</span></li>`).join('')}</ul>
      </div>
      <figure><img src="${shot('smidse')}" alt="${esc(t.hallen.lijst[2].naam)}" width="1200" height="433" loading="lazy" decoding="async"></figure>
    </section>

    <section class="blok" id="niveaus">
      <h2 class="titel">${esc(t.niveaus.titel)}</h2>
      <p class="intro">${esc(t.niveaus.tekst)}</p>
      <ol class="niveaus">
        ${t.niveaus.lijst.map((x, i) => `<li class="niveau n${i + 1}"><span class="schilden">${SVG.schild.repeat(i + 1)}</span><h3>${esc(x.naam)}</h3><p>${esc(x.tekst)}</p></li>`).join('\n        ')}
      </ol>
    </section>

    <section class="blok" id="opvolgen">
      <h2 class="titel">${esc(t.opvolgen.titel)}</h2>
      <p class="intro">${esc(t.opvolgen.tekst)}</p>
      <ul class="hallen vier">
        ${t.opvolgen.lijst.map(x => `<li class="hal"><img src="${rel}img/spellen/${OPVOLGEN_ICOON[x.id]}.webp" alt="" width="96" height="96" loading="lazy" decoding="async"><h3>${esc(x.naam)}</h3><p>${esc(x.tekst)}</p></li>`).join('\n        ')}
      </ul>
    </section>

    <section class="blok" id="motivatie">
      <h2 class="titel">${esc(t.motivatie.titel)}</h2>
      <ul class="hallen vier">
        ${t.motivatie.lijst.map(x => `<li class="hal"><img src="${rel}img/spellen/${MOTIVATIE_ICOON[x.id]}.webp" alt="" width="96" height="96" loading="lazy" decoding="async"><h3>${esc(x.naam)}</h3><p>${esc(x.tekst)}</p></li>`).join('\n        ')}
      </ul>
    </section>

    <section class="blok duo" id="privacy">
      <div>
        <h2 class="titel">${esc(t.privacy.titel)}</h2>
        <ul class="vinken">${t.privacy.lijst.map(x => `<li>${SVG.vink}<span>${esc(x)}</span></li>`).join('')}</ul>
      </div>
      <div>
        <h2 class="titel">${esc(t.toestellen.titel)}</h2>
        <ul class="toestellen">${t.toestellen.lijst.map((x, i) => `<li>${SVG[['bord', 'laptop', 'gsm'][i]]}<div><strong>${esc(x.naam)}</strong><span>${esc(x.tekst)}</span></div></li>`).join('')}</ul>
        <h3 class="sub">${esc(t.talen.titel)}</h3>
        <p>${esc(t.talen.tekst)}</p>
      </div>
    </section>

    <section class="blok download" id="download">
      <h2 class="titel">${esc(t.download.titel)}</h2>
      <p class="intro">${esc(t.download.tekst)}</p>
      <p class="binnenkort">${esc(t.nav.download)}</p>
      <p class="noot">${esc(t.download.noot)}</p>
      ${CONFIG.email ? `<p class="contact">${esc(t.voet.contact)} <a href="mailto:${esc(CONFIG.email)}">${esc(CONFIG.email)}</a></p>` : ''}
    </section>

    <section class="blok" id="faq">
      <h2 class="titel">${esc(t.faq.titel)}</h2>
      <div class="faq">
        ${t.faq.lijst.map(x => `<details><summary>${esc(x.v)}</summary><p>${esc(x.a)}</p></details>`).join('\n        ')}
      </div>
    </section>`;

  return omhulsel({
    taal, t, alle, root: rel, thuis: '',
    links: Object.fromEntries(TALEN.map(x => [x, `${rel}${x === 'nl' ? '' : x + '/'}`])),
    adressen: Object.fromEntries(TALEN.map(x => [x, BASIS + pad(x)])),
    titel: vul(t.titel), omschrijving: vul(t.omschrijving), beeld: `${BASIS}/shots/${taal}-host.webp`, main,
  });
}

// Een pagina per spel: uitleg, hoe je speelt, wat een goed antwoord geeft en beelden van het bord en de leerlingschermen.
function spelPagina(taal, t, w, data, alle, s, vorige, volgende) {
  const tr = x => (w[x] && typeof w[x] === 'string' ? w[x] : x);
  const root = taal === 'nl' ? '../' : '../../';
  const info = INFO[s.id] || { vorm: [], juist: {} };
  const p = t.spel;
  const naam = tr(s.naam), uitleg = tr(s.uitleg);
  const b = beeldPad(taal, s.id);
  const beelden = heeftBeelden(taal, s.id) ? `
      <h2 class="titel klein">${esc(p.schermen)}</h2>
      <div class="spelbeelden">
        <figure class="sb-bord"><img src="${root}${b}-bord.webp" alt="${esc(`${naam}: ${p.bord}`)}" width="960" height="540" decoding="async"><figcaption>${SVG.bord}${esc(p.bord)}</figcaption></figure>
        <figure class="sb-cb"><img src="${root}${b}-cb.webp" alt="${esc(`${naam}: ${p.chromebook}`)}" width="800" height="450" loading="lazy" decoding="async"><figcaption>${SVG.laptop}${esc(p.chromebook)}</figcaption></figure>
        <figure class="sb-gsm"><img src="${root}${b}-gsm.webp" alt="${esc(`${naam}: ${p.gsm}`)}" width="270" height="585" loading="lazy" decoding="async"><figcaption>${SVG.gsm}${esc(p.gsm)}</figcaption></figure>
      </div>` : '';
  const feit = (ic, kop, tekst) => `<li>${SVG[ic]}<div><strong>${esc(kop)}</strong><span>${esc(tekst)}</span></div></li>`;
  const feiten = [
    info.vorm.length ? feit('tegels', p.vorm, info.vorm.map(v => p.vormen[v]).join(' · ')) : '',
    info.juist[taal] ? feit('vink', p.juist, info.juist[taal]) : '',
    feit('bliksem', p.quiz, p.quizTekst),
    feit('gsm', p.toestellen, p.toestellenTekst),
  ].filter(Boolean).join('\n          ');
  const nav = (x, kl, label) => `<a class="${kl}" href="${x.id}.html"><img src="${root}img/spellen/${x.icoon}" alt="" width="40" height="40" loading="lazy"><span><small>${esc(label)}</small>${esc(tr(x.naam))}</span></a>`;
  const main = `    <section class="blok spelpagina">
      <a class="terug" href="../#spellen">← ${esc(p.terug)}</a>
      <div class="spelkop">
        <img src="${root}img/spellen/${s.icoon}" alt="" width="112" height="112">
        <div>
          <p class="kicker">${esc(t.spellen.groepen[s.groep] || tr(s.groep))}</p>
          <h1>${esc(naam)}</h1>
          <p class="lead">${esc(uitleg)}</p>
        </div>
      </div>
      <ul class="feiten">
          ${feiten}
      </ul>${beelden}
      <nav class="spelnav" aria-label="${esc(t.nav.spellen)}">
        ${nav(vorige, 'vorige', p.vorige)}
        ${nav(volgende, 'volgende', p.volgende)}
      </nav>
    </section>`;
  return omhulsel({
    taal, t, alle, root, thuis: '../',
    links: Object.fromEntries(TALEN.map(x => [x, root + spelPad(x, s.id)])),
    adressen: Object.fromEntries(TALEN.map(x => [x, `${BASIS}/${spelPad(x, s.id)}`])),
    titel: `${naam} · LANcelot`, omschrijving: uitleg,
    beeld: heeftBeelden(taal, s.id) ? `${BASIS}/${b}-bord.webp` : `${BASIS}/shots/${taal}-arena.webp`, main,
  });
}

// Het privacybeleid: kort en volledig, in elke taal.
function privacyPagina(taal, t, alle) {
  const p = PRIVACY[taal];
  const root = taal === 'nl' ? '' : '../';
  const main = `    <section class="blok privacybeleid">
      <h1 class="titel">${esc(p.titel)}</h1>
      <p class="klein">${esc(p.bijgewerkt)}</p>
${p.secties.map(([kop, alineas]) => `      <h2>${esc(kop)}</h2>\n${alineas.map(a => `      <p>${esc(a)}</p>`).join('\n')}`).join('\n')}
    </section>`;
  return omhulsel({
    taal, t, alle, root, thuis: './',
    links: Object.fromEntries(TALEN.map(x => [x, root + privacyPad(x)])),
    adressen: Object.fromEntries(TALEN.map(x => [x, `${BASIS}/${privacyPad(x)}`])),
    titel: `${p.titel} · LANcelot`, omschrijving: p.omschrijving,
    beeld: `${BASIS}/shots/${taal}-arena.webp`, main,
    extraCss: '\n  <style>.privacybeleid{max-width:760px;margin:0 auto}.privacybeleid h2{margin:1.6em 0 .4em;font-size:1.25rem}.privacybeleid p{line-height:1.6;margin:.6em 0}</style>',
  });
}

function kopieer(van, naar) {
  fs.mkdirSync(path.dirname(naar), { recursive: true });
  fs.copyFileSync(van, naar);
}

function bouw() {
  const data = spellen();
  const alle = Object.fromEntries(TALEN.map(x => [x, JSON.parse(fs.readFileSync(path.join(BRON, 'teksten', `${x}.json`), 'utf8'))]));
  // Beelden uit de app: iconen van spellen en zalen, het merk en de lettertypes.
  const iconen = new Set(['arena', 'ronde-tafel', 'smidse', 'wapenkamer', 'kronieken', ...Object.values(MOTIVATIE_ICOON), ...Object.values(OPVOLGEN_ICOON)].map(x => x + '.webp'));
  for (const g of data.groepen) for (const s of g.spellen) iconen.add(s.icoon);
  fs.rmSync(path.join(SITE, 'img', 'spellen'), { recursive: true, force: true });
  for (const f of iconen) kopieer(path.join(ROOT, 'public', 'img', 'icons', f), path.join(SITE, 'img', 'spellen', f));
  kopieer(path.join(ROOT, 'public', 'img', 'mark.webp'), path.join(SITE, 'img', 'mark.webp'));
  kopieer(path.join(ROOT, 'public', 'img', 'wordmark.webp'), path.join(SITE, 'img', 'wordmark.webp'));
  kopieer(path.join(ROOT, 'public', 'favicon.png'), path.join(SITE, 'img', 'favicon.png'));
  for (const f of ['cinzel-latin-700-normal', 'cinzel-latin-900-normal', 'exo-2-latin-400-normal', 'exo-2-latin-600-normal', 'exo-2-latin-800-normal', 'orbitron-latin-600-normal']) {
    kopieer(path.join(ROOT, 'public', 'fonts', f + '.woff2'), path.join(SITE, 'fonts', f + '.woff2'));
  }
  kopieer(path.join(ROOT, 'public', 'fonts', 'LICENSE.txt'), path.join(SITE, 'fonts', 'LICENSE.txt'));
  kopieer(path.join(BRON, 'site.css'), path.join(SITE, 'site.css'));

  for (const taal of TALEN) {
    const html = pagina(taal, alle[taal], appWoorden(taal), data, alle);
    const doel = taal === 'nl' ? path.join(SITE, 'index.html') : path.join(SITE, taal, 'index.html');
    fs.mkdirSync(path.dirname(doel), { recursive: true });
    fs.writeFileSync(doel, html);
    fs.writeFileSync(path.join(SITE, privacyPad(taal)), privacyPagina(taal, alle[taal], alle));
    // Een pagina per spel.
    const lijst = data.groepen.flatMap(g => g.spellen);
    const map = path.join(SITE, taal === 'nl' ? '' : taal, 'spellen');
    fs.mkdirSync(map, { recursive: true });
    for (const f of fs.readdirSync(map)) if (f.endsWith('.html')) fs.rmSync(path.join(map, f));
    lijst.forEach((s, i) => fs.writeFileSync(path.join(map, `${s.id}.html`),
      spelPagina(taal, alle[taal], appWoorden(taal), data, alle, s, lijst[(i - 1 + lijst.length) % lijst.length], lijst[(i + 1) % lijst.length])));
  }
  const basis = CONFIG.adres.replace(/\/$/, '');
  fs.writeFileSync(path.join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${TALEN.map(x => `  <url><loc>${basis}${pad(x)}</loc></url>`).join('\n')}
${TALEN.map(x => `  <url><loc>${basis}/${privacyPad(x)}</loc></url>`).join('\n')}
${TALEN.flatMap(x => data.groepen.flatMap(g => g.spellen).map(sp => `  <url><loc>${basis}/${spelPad(x, sp.id)}</loc></url>`)).join('\n')}
</urlset>
`);
  fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${basis}/sitemap.xml\n`);
  return data;
}

if (require.main === module) {
  const data = bouw();
  const n = data.groepen.reduce((a, g) => a + g.spellen.length, 0);
  console.log(`Website gebouwd in website/site: ${TALEN.length} talen, ${n} spellen (van ${data.totaal} in de app).`);
}
module.exports = { bouw, spellen, TALEN, SITE };
