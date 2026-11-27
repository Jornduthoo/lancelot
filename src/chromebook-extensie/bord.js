// "Kijk naar het bord": het bericht van de leerkracht (de pauzeknop van LANcelot).
async function toon() {
  const { bordTekst } = await chrome.storage.local.get('bordTekst');
  document.getElementById('tekst').textContent = bordTekst || chrome.i18n.getMessage('bordZin');
}
chrome.storage.onChanged.addListener(toon);
toon();
