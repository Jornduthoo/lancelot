// LANcelot op de Chromebook: meldt aan LANcelot in de klas welke tabbladen openstaan (alleen site en titel)
// en voert uit wat de leerkracht vraagt: terug naar LANcelot, een link openen, een tabblad sluiten,
// LANcelot vastzetten (alleen LANcelot mag open) en "Kijk naar het bord" (de pauzeknop van LANcelot).
// Het adres van LANcelot komt uit Google Admin (beleid "server"), of uit het venstertje van de extensie.
// Zonder verbinding met LANcelot (thuis) meldt de extensie niets. Een vastgezette Chromebook komt na een uur
// zonder verbinding vanzelf vrij; "Kijk naar het bord" na twee minuten.
importScripts('socket.io.min.js');

const VERSIE = chrome.runtime.getManifest().version;
const VAST_ZONDER_VERBINDING = 60 * 60000;
const BORD_ZONDER_VERBINDING = 2 * 60000;
const REGEL_VAST = 1;
const REGEL_LANCELOT = 2;
const REGEL_TOEGESTAAN = 3;

let socket = null;
let serverUrl = '';
let email = '';
let meldTimer = null;

function normaliseer(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  try {
    const u = new URL(s);
    if (!u.port && u.protocol === 'http:') u.port = '3000';
    return u.origin;
  } catch { return ''; }
}

async function adres() {
  let s = '';
  try { s = (await chrome.storage.managed.get('server')).server || ''; } catch {}
  if (!s) s = (await chrome.storage.local.get('server')).server || '';
  return normaliseer(s);
}

async function wieBenIk() {
  if (email) return email;
  try { email = ((await chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' })) || {}).email || ''; } catch {}
  return email;
}

const isLancelot = url => !!serverUrl && String(url || '').startsWith(serverUrl + '/');
const eigen = url => String(url || '').startsWith(chrome.runtime.getURL(''));
function soort(url) {
  if (isLancelot(url)) return 'lancelot';
  if (/^https?:\/\//i.test(url || '')) return 'web';
  return 'intern';
}
function hostVan(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ---------- Melden ----------
async function meld() {
  if (!socket || !socket.connected) return;
  const [tabs, raam] = await Promise.all([chrome.tabs.query({}), chrome.windows.getLastFocused().catch(() => null)]);
  const lijst = tabs.filter(t => !eigen(t.url || t.pendingUrl)).slice(0, 40).map(t => {
    const url = t.url || t.pendingUrl || '';
    return { id: t.id, host: soort(url) === 'web' ? hostVan(url) : '', titel: String(t.title || '').slice(0, 150), soort: soort(url), actief: !!(t.active && raam && t.windowId === raam.id) };
  });
  socket.emit('meld', { email: await wieBenIk(), versie: VERSIE, tabs: lijst });
}
function straks() {
  clearTimeout(meldTimer);
  meldTimer = setTimeout(meld, 400);
}

// ---------- Verbinden ----------
async function verbind() {
  const url = await adres();
  if (!url) { if (socket) { socket.close(); socket = null; } return; }
  if (socket && url === serverUrl) { if (!socket.connected && !socket.active) socket.connect(); return; }
  if (socket) socket.close();
  serverUrl = url;
  socket = io(url + '/cb', { transports: ['websocket'], reconnectionDelayMax: 15000 });
  socket.on('connect', async () => {
    await chrome.storage.local.set({ contact: Date.now(), verbonden: true });
    meld();
  });
  socket.on('disconnect', () => chrome.storage.local.set({ contact: Date.now(), verbonden: false }));
  socket.on('stand', s => pasToe(s || {}));
  // De leerkracht zelf: geen slot en geen bordscherm, wel het bedieningspaneel in het venstertje.
  socket.on('rol', async ({ leerkracht } = {}) => {
    await chrome.storage.local.set({ leerkracht: !!leerkracht });
    if (leerkracht) pasToe({});
  });
  socket.on('terug', () => naarLancelot());
  socket.on('open', async ({ url } = {}) => {
    if (!/^https?:\/\//i.test(url || '')) return;
    // Staat LANcelot vast, dan mag deze site eerst open (anders sluit het slot hem meteen weer).
    const { vast, toegestaan = [] } = await chrome.storage.local.get(['vast', 'toegestaan']);
    const host = hostVan(url);
    if (vast && host && !toegestaan.includes(host)) { await chrome.storage.local.set({ toegestaan: [...toegestaan, host] }); await regels(false); }
    chrome.tabs.create({ url });
  });
  socket.on('sluit', ({ tab } = {}) => { if (Number.isInteger(tab)) chrome.tabs.remove(tab).catch(() => {}); });
}

async function naarLancelot() {
  if (!serverUrl) return;
  const tabs = await chrome.tabs.query({});
  const t = tabs.find(x => isLancelot(x.url));
  if (t) {
    await chrome.tabs.update(t.id, { active: true });
    await chrome.windows.update(t.windowId, { focused: true }).catch(() => {});
  } else await chrome.tabs.create({ url: serverUrl + '/' });
}

// ---------- Wat de leerkracht aanzette ----------
async function pasToe(s) {
  const { leerkracht, vast: wasVast } = await chrome.storage.local.get(['leerkracht', 'vast']);
  if (leerkracht) s = {};
  const vast = !!s.vast;
  const bord = !!(s.pauze && s.pauze.aan);
  await chrome.storage.local.set({ vast, toegestaan: Array.isArray(s.toegestaan) ? s.toegestaan : [], bord, bordTekst: (s.pauze && s.pauze.tekst) || '', contact: Date.now() });
  // Pas vastgezet: meteen naar LANcelot. Daarna niet telkens opnieuw (een gestuurde link blijft dan vooraan).
  await regels(vast && !wasVast);
  await naElkaar(bordSchermNu);
}

// Alles wat de regels of het bordscherm aanpast, na elkaar (anders botsen twee wijzigingen tegelijk).
let rij = Promise.resolve();
const naElkaar = f => (rij = rij.then(f, f));
function regels(terugNaarLancelot = true) { return naElkaar(() => regelsNu(terugNaarLancelot)); }
async function regelsNu(terugNaarLancelot) {
  const { vast, toegestaan = [] } = await chrome.storage.local.get(['vast', 'toegestaan']);
  const oud = (await chrome.declarativeNetRequest.getDynamicRules()).map(r => r.id);
  const nieuw = [];
  if (vast && serverUrl) {
    nieuw.push({ id: REGEL_VAST, priority: 1, action: { type: 'redirect', redirect: { extensionPath: '/vast.html' } }, condition: { regexFilter: '^https?://', resourceTypes: ['main_frame'] } });
    nieuw.push({ id: REGEL_LANCELOT, priority: 2, action: { type: 'allow' }, condition: { urlFilter: '|' + serverUrl + '/', resourceTypes: ['main_frame'] } });
    const hosts = toegestaan.filter(h => typeof h === 'string' && /^[a-z0-9.-]+$/i.test(h));
    if (hosts.length) nieuw.push({ id: REGEL_TOEGESTAAN, priority: 2, action: { type: 'allow' }, condition: { requestDomains: hosts, resourceTypes: ['main_frame'] } });
  }
  try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oud, addRules: nieuw }); } catch (err) { console.error('LANcelot-regels:', err.message); }
  if (!vast) return;
  // Wat al openstond en niet mag, gaat dicht achter het slot; LANcelot komt vooraan.
  const mag = url => isLancelot(url) || eigen(url) || toegestaan.includes(hostVan(url)) || toegestaan.some(h => hostVan(url).endsWith('.' + h));
  for (const t of await chrome.tabs.query({})) {
    const url = t.url || t.pendingUrl || '';
    if (/^https?:\/\//i.test(url) && !mag(url)) chrome.tabs.update(t.id, { url: chrome.runtime.getURL('vast.html') }).catch(() => {});
  }
  if (terugNaarLancelot) naarLancelot();
}

// "Kijk naar het bord": één venster over het hele scherm, dat terugkomt als je het wegklikt.
function bordScherm() { return naElkaar(bordSchermNu); }
async function bordSchermNu() {
  const { bord, bordRaam } = await chrome.storage.local.get(['bord', 'bordRaam']);
  let raam = null;
  if (bordRaam) raam = await chrome.windows.get(bordRaam).catch(() => null);
  if (bord) {
    if (raam) return chrome.windows.update(raam.id, { focused: true, state: 'fullscreen' }).catch(() => {});
    const w = await chrome.windows.create({ url: chrome.runtime.getURL('bord.html'), type: 'popup', state: 'fullscreen', focused: true }).catch(() => null);
    if (w) await chrome.storage.local.set({ bordRaam: w.id });
  } else if (raam) {
    await chrome.storage.local.remove('bordRaam');
    chrome.windows.remove(raam.id).catch(() => {});
  }
}

// Zonder verbinding: na een tijd alles weer vrij (zodat een Chromebook thuis nooit vast blijft zitten).
async function verloop() {
  const { contact = 0, vast, bord } = await chrome.storage.local.get(['contact', 'vast', 'bord']);
  if (socket && socket.connected) return chrome.storage.local.set({ contact: Date.now() });
  const stil = Date.now() - contact;
  if (bord && stil > BORD_ZONDER_VERBINDING) { await chrome.storage.local.set({ bord: false }); await bordScherm(); }
  if (vast && stil > VAST_ZONDER_VERBINDING) { await chrome.storage.local.set({ vast: false }); await regels(); }
}

// ---------- Gebeurtenissen ----------
chrome.tabs.onActivated.addListener(straks);
chrome.tabs.onRemoved.addListener(straks);
chrome.tabs.onCreated.addListener(straks);
chrome.tabs.onUpdated.addListener(async (id, info) => {
  if (info.url || info.title || info.status === 'complete') straks();
  // Vastgezet: ook de instellingen, bestanden en andere interne pagina's gaan achter het slot (een nieuw tabblad mag).
  if (info.url && /^(chrome|file|view-source|chrome-untrusted):/i.test(info.url) && !/^chrome:\/\/(newtab|new-tab-page)\b/i.test(info.url)) {
    const { vast } = await chrome.storage.local.get('vast');
    if (vast) chrome.tabs.update(id, { url: chrome.runtime.getURL('vast.html') }).catch(() => {});
  }
});
chrome.windows.onFocusChanged.addListener(async id => {
  straks();
  const { bord, bordRaam } = await chrome.storage.local.get(['bord', 'bordRaam']);
  if (bord && bordRaam && id !== bordRaam) chrome.windows.update(bordRaam, { focused: true }).catch(() => {});
});
chrome.windows.onRemoved.addListener(async id => {
  const { bord, bordRaam } = await chrome.storage.local.get(['bord', 'bordRaam']);
  if (id === bordRaam) { await chrome.storage.local.remove('bordRaam'); if (bord) bordScherm(); }
});
chrome.storage.onChanged.addListener((wijz, gebied) => {
  if ((gebied === 'managed' || gebied === 'local') && wijz.server) verbind();
});
chrome.alarms.onAlarm.addListener(async () => { await verbind(); await verloop(); meld(); });
chrome.runtime.onStartup.addListener(() => verbind());
chrome.runtime.onInstalled.addListener(() => verbind());
chrome.runtime.onMessage.addListener((bericht, _, antwoord) => {
  if (bericht && bericht.vraag === 'stand') {
    Promise.all([adres(), chrome.storage.local.get('leerkracht')]).then(([url, { leerkracht }]) => antwoord({ adres: url, verbonden: !!(socket && socket.connected), leerkracht: !!leerkracht }));
    return true;
  }
});
chrome.alarms.create('wakker', { periodInMinutes: 0.5 });
verbind();
