// De leerploeg: cartoonfiguren van familie en vrienden (gemaakt met Gemini).
// De beelden staan versleuteld in fig/*.bin. De sleutel komt pas na het inloggen uit de database,
// dus zonder login zijn het onleesbare bestanden.
(function(){
// Wat doet wie in de app?
const ROLNAAM = {
  eli:'De kampioen zelf', supporter:'Supporter nummer 1', manager:'Ploegmanager', trainer:'Krachttrainer',
  coach:'Hoofdcoach', pauze:'Pauzekapitein', prof:'Professor', kunst:'Kunstkenner', denker:'Denker',
  chef:'Chef Frans', labo:'Laborant', ridder:'Geschiedenisridder',
};
const VAKNAAM = { kf:'Kunst & Filosofie', gsw:'Gedrag', fr:'Frans', wet:'Wetenschappen', cul:'Cultuur' };
const RESERVE = [{ id:'coach', naam:'Coach', rol:'coach', emoji:'🧢' }];

let ploeg = [];
const urls = {};          // id -> blob-url
let sleutel = null;

function b64(s){ return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
async function ontsleutel(f){
  if (urls[f.id]) return urls[f.id];
  if (!f.img) return null;
  if (!f.img.startsWith('enc:')) return (urls[f.id] = f.img);
  if (!sleutel) return null;
  const r = await fetch(f.img.slice(4), { cache:'force-cache' });
  if (!r.ok) throw new Error('fig ' + r.status);
  const buf = new Uint8Array(await r.arrayBuffer());
  const data = await crypto.subtle.decrypt({ name:'AES-GCM', iv: buf.slice(0, 12) }, sleutel, buf.slice(12));
  const url = URL.createObjectURL(new Blob([data], { type:'image/webp' }));
  urls[f.id] = url;
  document.querySelectorAll(`img[data-fig="${f.id}"]`).forEach(img => { img.src = url; img.classList.add('klaar'); });
  return url;
}
let klaarP = Promise.resolve();
async function zet(figuren, keyB64){
  ploeg = (figuren || []).filter(f => f.rol !== 'weg' && f.img);
  if (keyB64 && crypto.subtle) {
    try { sleutel = await crypto.subtle.importKey('raw', b64(keyB64), 'AES-GCM', false, ['decrypt']); } catch { sleutel = null; }
  }
  // Eerst de figuren die het meest verschijnen, dan de rest.
  klaarP = Promise.all(ploeg.map(f => ontsleutel(f).catch(() => null)));
  return klaarP;
}
const alle = () => ploeg.length ? ploeg : RESERVE;
const metId = id => alle().find(f => f.id === id);
function kies(vak, rol){
  const lijst = alle().filter(f => f.rol !== 'eli');
  const rollen = Array.isArray(rol) ? rol : rol ? [rol] : [];
  const opVak = vak ? lijst.filter(f => f.vak === vak) : [];
  const opRol = lijst.filter(f => rollen.includes(f.rol));
  const pool = opVak.length ? opVak : opRol.length ? opRol : lijst;
  return pool[Math.floor(Math.random() * pool.length)] || RESERVE[0];
}
function html(f, groot){
  const url = urls[f.id];
  const binnen = f.img
    ? `<img class="fig${url ? ' klaar' : ''}" data-fig="${f.id}" ${url ? `src="${url}"` : ''} alt="">`
    : `<div class="fig leeg">${f.emoji || '🙂'}</div>`;
  return `<div class="pop${groot ? ' groot' : ''}" aria-hidden="true">${binnen}</div>`;
}
// Eigen karakter: wat zeggen ze typisch? (gebruikt bij aanmoedigingen)
const EIGEN = {
  moemoe: [
    'Dag schatteke! Ik ben zo trots op jou. Elke dag een beetje, dat lukt jou zeker. 💛',
    'Ik denk heel de dag aan je, hoor. Zet hem op, lieverd! 🥰',
    'Weet je wat ik het liefste zie? Jou die zijn best doet. Dikke knuffel! 🤗',
    'Rustig aan, stap voor stap. Moemoe gelooft in jou! 💛',
    'Als je klaar bent, verdien je een dikke knuffel van mij. En een koekje. 🍪',
  ],
  boeboe: [
    'Waarom nam de voetballer een touw mee naar de match? Om de bal vast te binden! 😂 Hup, aan de slag!',
    'Weet je waarom boeken nooit koud hebben? Ze hebben een kaft! 📚😄 Doe je best, maat!',
    'Wat zegt een nul tegen een acht? Mooie riem! 😆 Zorg jij maar voor geen nullen.',
    'Waarom kan een fiets niet alleen rechtstaan? Hij is te moe! 🚲 Jij niet hé, kom op!',
    'Wat is groen en zit in een doel? Een keepertje… sla! 🥬 Oké, slecht. Leren nu!',
    'Waarom ging de leraar met een zonnebril naar school? Zijn leerlingen waren zo slim! 😎 Zoals jij.',
  ],
  papa: [
    'Pak je tijd! Geen half werk! 💪',
    'Kampioenen worden gemaakt op training, niet op de match. Hup!',
    'Focus, Eli! Gsm weg, hersenen aan. 🧠',
  ],
  marieke: [
    'Ik zie dat je bezig bent. Super, schat! Zo doen we dat. 💪',
    'Eerst je werk, dan je ontspanning. Je kan het! ⚽',
  ],
};
const eigen = (f, standaard) => (f && EIGEN[f.id] && Math.random() < .7) ? EIGEN[f.id][Math.floor(Math.random() * EIGEN[f.id].length)] : standaard;
// Een praatwolkje met een figuur ernaast. opts: { vak, rol, figuur, id, eigen }
function babbel(el, tekst, opts = {}){
  if (!el) return null;
  const f = opts.figuur || (opts.id && metId(opts.id)) || kies(opts.vak, opts.rol);
  el.innerHTML = `${html(f)}<div class="ballon"><span class="wie"></span><div class="tx"></div></div>`;
  el.querySelector('.wie').textContent = f.naam;
  el.querySelector('.tx').innerHTML = opts.eigen ? eigen(f, tekst) : tekst; // tekst komt uit onze eigen inhoud
  return f;
}
// De ereplek: alle figuren met hun taak.
function ploegHtml(){
  const esc = window.ELI.esc;
  const volg = ['eli','marieke','papa','boeboe','moemoe','thor','bjorn','onno'];
  const maten = { boeboe:1, moemoe:1, marieke:1, papa:1 };
  const lijst = alle().slice().sort((a, b) => {
    const ia = volg.indexOf(a.id), ib = volg.indexOf(b.id);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return lijst.map(f => `<div class="speler${f.rol === 'eli' ? ' ster' : maten[f.id] ? ' maat' : ''}">${html(f, true)}
    <b>${esc(f.naam)}</b><span>${esc(ROLNAAM[f.rol] || '')}${f.vak ? ' · ' + esc(VAKNAAM[f.vak] || '') : ''}</span></div>`).join('');
}
// De binnenste kring: mama, papa, Boeboe en Moemoe. Zij zeggen het vaakst iets.
const KRING = ['marieke','papa','boeboe','moemoe'];
function kring(){ const l = KRING.map(metId).filter(Boolean); return l[Math.floor(Math.random() * l.length)] || null; }
// Wie logt in als welke figuur?
const LOGIN = { mama:'marieke', omaveldegem:'oma' };
const vanLogin = naam => metId(LOGIN[naam] || naam);
window.POP = { vanLogin, zet, kies, html, babbel, metId, kring, ploegHtml, klaar: () => klaarP, ROLNAAM };
})();
