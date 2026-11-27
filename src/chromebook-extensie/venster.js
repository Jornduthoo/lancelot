// Het venstertje van de extensie: verbonden of niet. Zonder Google Admin kan je hier het adres invullen.
const t = k => chrome.i18n.getMessage(k);
let adresNu = '';
async function toon() {
  const s = await chrome.runtime.sendMessage({ vraag: 'stand' }).catch(() => null) || {};
  document.getElementById('pil').classList.toggle('aan', !!s.verbonden);
  document.getElementById('stand').textContent = s.verbonden ? t('verbonden') : t('nietVerbonden');
  document.getElementById('lk').classList.toggle('hidden', !s.leerkracht);
  document.getElementById('uitleg').classList.toggle('hidden', !!s.leerkracht);
  adresNu = s.adres || '';
  let beheerd = '';
  try { beheerd = (await chrome.storage.managed.get('server')).server || ''; } catch {}
  document.getElementById('eigen').classList.toggle('hidden', !!beheerd);
  if (!beheerd) document.getElementById('adres').value = (await chrome.storage.local.get('server')).server || '';
}
document.getElementById('bewaar').addEventListener('click', async () => {
  await chrome.storage.local.set({ server: document.getElementById('adres').value.trim() });
  setTimeout(toon, 1500);
});
toon();
setInterval(toon, 3000);
// Het bedieningspaneel: de pagina Chromebooks van LANcelot in een klein venster.
document.getElementById('paneel').addEventListener('click', () => {
  if (!adresNu) return;
  chrome.windows.create({ url: adresNu + '/chromebooks?klein=1', type: 'popup', width: 480, height: 760 });
  window.close();
});
