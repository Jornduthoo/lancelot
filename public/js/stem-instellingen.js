// Instellingen > Voorlezen: welke stem deze pc gebruikt, en een knop om het geluid te testen.
(() => {
  const info = document.getElementById('stem-info');
  if (!info || typeof Voorlees === 'undefined') return;
  const TEKST = {
    'toestel-be': 'Deze pc leest voor met een Vlaamse stem: {0}.',
    'toestel-nl': 'Op deze pc staat geen Vlaamse stem. Deze pc leest voor met: {0}.',
    toestel: 'Deze pc leest voor met: {0}.',
    geen: 'Op deze pc staat geen stem om voor te lezen.',
  };
  const toon = () => {
    const i = Voorlees.info();
    info.textContent = (TEKST[i.stand] || TEKST.geen).replace('{0}', i.stem);
  };
  toon();
  setTimeout(toon, 1600);
  document.getElementById('stem-test').addEventListener('click', () => setTimeout(toon, 100));
})();
