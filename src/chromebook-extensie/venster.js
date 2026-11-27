// Het venstertje van de extensie: verbonden of niet. Zonder Google Admin kan je hier het adres invullen.
// Voor de leerkracht: het bedieningspaneel. Met een sleutel (één keer gekoppeld met een code van LANcelot) bedien je
// de Chromebooks hier ook van overal: op school rechtstreeks, elders via het internetadres van LANcelot (de tunnel).
const t = k => chrome.i18n.getMessage(k);
const $ = id => document.getElementById(id);
let adresNu = '';
let opSchool = false;
let afstand = null; // { sleutel, adres }
let data = null;

async function toon() {
  const s = await chrome.runtime.sendMessage({ vraag: 'stand' }).catch(() => null) || {};
  afstand = (await chrome.storage.local.get('afstand')).afstand || null;
  opSchool = !!(s.verbonden && s.leerkracht);
  adresNu = s.adres || '';
  const metSleutel = !!(afstand && afstand.sleutel);
  const leerkracht = !!s.leerkracht || metSleutel;
  $('pil').classList.toggle('aan', !!s.verbonden || (metSleutel && !!data));
  $('stand').textContent = s.verbonden ? t('verbonden') : metSleutel && data ? t('vanOveral') : t('nietVerbonden');
  $('lk').classList.toggle('hidden', !opSchool);
  $('koppel').classList.toggle('hidden', !(opSchool && !metSleutel));
  $('afstand').classList.toggle('hidden', !metSleutel);
  $('uitleg').classList.toggle('hidden', leerkracht);
  let beheerd = '';
  try { beheerd = (await chrome.storage.managed.get('server')).server || ''; } catch {}
  $('eigen').classList.toggle('hidden', !!beheerd || metSleutel);
  if (!beheerd && document.activeElement !== $('adres')) $('adres').value = (await chrome.storage.local.get('server')).server || '';
}

// ---------- Van overal bedienen ----------
// Op school eerst rechtstreeks (sneller, werkt ook zonder tunnel), anders via het internetadres.
async function vraag(pad, body) {
  const adressen = [opSchool && adresNu, afstand && afstand.adres].filter(Boolean);
  if (!adressen.length) throw new Error(t('geenAdres'));
  for (const a of adressen) {
    try {
      const r = await fetch(a + pad, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: 'Bearer ' + afstand.sleutel, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(8000),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { await chrome.storage.local.remove('afstand'); afstand = null; throw Object.assign(new Error(j.error || t('losgekoppeld')), { stop: true }); }
      if (!r.ok) throw Object.assign(new Error(j.error || t('nietBereikbaar')), { stop: true });
      return j;
    } catch (err) {
      if (err.stop) throw err;
    }
  }
  throw new Error(t('nietBereikbaar'));
}
const melding = (tekst = '') => { $('melding').textContent = tekst; };

function teken() {
  if (!data) return;
  const zet = (id, aan) => $(id).classList.toggle('aan', !!aan);
  zet('sTonen', data.instellingen.tonen);
  zet('sVast', data.instellingen.vast);
  zet('sBord', data.pauze.aan);
  const l = data.toestellen.slice().sort((a, b) => (b.elders - a.elders) || a.naam.localeCompare(b.naam));
  if (!l.length) {
    const li = document.createElement('li');
    li.className = 'leeg';
    li.textContent = t('geenChromebooks');
    return $('lijst').replaceChildren(li);
  }
  $('lijst').replaceChildren(...l.map(x => {
    const li = document.createElement('li');
    if (x.elders) li.className = 'elders';
    const naam = document.createElement('b');
    naam.textContent = x.naam;
    const site = document.createElement('span');
    site.textContent = x.host || '—';
    site.title = x.titel || '';
    li.append(naam, site);
    if (x.elders) {
      const b = document.createElement('button');
      b.className = 'klein';
      b.textContent = '↩';
      b.title = t('terugEen');
      b.addEventListener('click', () => doe({ actie: 'terug', sid: x.sid }));
      li.append(b);
    }
    return li;
  }));
}

async function laad() {
  if (!afstand || !afstand.sleutel) return;
  try {
    data = await vraag('/cb-afstand/stand');
    melding('');
    teken();
    // Op school het internetadres bijwerken (een snelle tunnel krijgt na een herstart een ander adres).
    if (opSchool && adresNu) {
      const r = await fetch(adresNu + '/cb-afstand/adres', { headers: { Authorization: 'Bearer ' + afstand.sleutel } }).then(x => x.json()).catch(() => null);
      if (r && typeof r.adres === 'string' && r.adres !== afstand.adres) { afstand.adres = r.adres; await chrome.storage.local.set({ afstand }); }
    }
  } catch (err) {
    data = null;
    melding(err.message);
  }
  toon();
}
async function doe(w) {
  try { data = await vraag('/cb-afstand/doe', w); melding(''); teken(); } catch (err) { melding(err.message); toon(); }
}

$('sTonen').addEventListener('click', () => data && doe({ actie: 'zet', tonen: !data.instellingen.tonen }));
$('sVast').addEventListener('click', () => data && doe({ actie: 'zet', vast: !data.instellingen.vast }));
$('sBord').addEventListener('click', () => data && doe({ actie: 'pauze', aan: !data.pauze.aan }));
$('terug').addEventListener('click', () => doe({ actie: 'terug' }));
$('linkForm').addEventListener('submit', e => {
  e.preventDefault();
  const url = $('link').value.trim();
  if (url) doe({ actie: 'open', url }).then(() => { if (!$('melding').textContent) $('link').value = ''; });
});
$('los').addEventListener('click', async () => {
  await chrome.storage.local.remove('afstand');
  afstand = null;
  data = null;
  toon();
});
$('koppelKnop').addEventListener('click', async () => {
  const code = $('code').value.trim();
  if (!code || !adresNu) return;
  try {
    const email = ((await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }).catch(() => null)) || {}).email || '';
    const r = await fetch(adresNu + '/cb-afstand/koppel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, email }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.sleutel) throw new Error(j.error || t('nietBereikbaar'));
    afstand = { sleutel: j.sleutel, adres: j.adres || '' };
    await chrome.storage.local.set({ afstand });
    $('code').value = '';
    melding('');
    await toon();
    laad();
  } catch (err) {
    $('code').value = '';
    $('code').placeholder = err.message;
  }
});

$('bewaar').addEventListener('click', async () => {
  await chrome.storage.local.set({ server: $('adres').value.trim() });
  setTimeout(toon, 1500);
});
// Het bedieningspaneel: de pagina Chromebooks van LANcelot in een klein venster (met de geschiedenis).
$('paneel').addEventListener('click', () => {
  if (!adresNu) return;
  chrome.windows.create({ url: adresNu + '/chromebooks?klein=1', type: 'popup', width: 480, height: 760 });
  window.close();
});

toon().then(laad);
setInterval(() => toon().then(laad), 3000);
