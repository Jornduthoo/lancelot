// Het slot: hier komt elke site die niet mag zolang LANcelot vastgezet is.
const t = k => chrome.i18n.getMessage(k);
async function toon() {
  const { vast } = await chrome.storage.local.get('vast');
  document.body.classList.toggle('vrij', !vast);
  document.getElementById('teken').textContent = vast ? '🔒' : '🔓';
  document.getElementById('kop').textContent = t(vast ? 'vastKop' : 'vrijKop');
  document.getElementById('zin').textContent = t(vast ? 'vastZin' : 'vrijZin');
}
document.getElementById('terug').addEventListener('click', async () => {
  let s = '';
  try { s = (await chrome.storage.managed.get('server')).server || ''; } catch {}
  if (!s) s = (await chrome.storage.local.get('server')).server || '';
  if (!s) return;
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s;
  const u = new URL(s);
  if (!u.port && u.protocol === 'http:') u.port = '3000';
  location.href = u.origin + '/';
});
chrome.storage.onChanged.addListener(toon);
toon();
