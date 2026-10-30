// Knoppen om vanuit een ander spel een quiz te maken of te bewerken in de quizmaker van het leerkrachtenscherm.
function quizMakerUrl(what, file) {
  const query = new URLSearchParams({ terug: location.pathname });
  if (what === 'bewerk') query.set('bewerk', file);
  else query.set('maak', what);
  return `/host?${query}`;
}
for (const b of document.querySelectorAll('[data-make]')) {
  b.addEventListener('click', () => { location.href = quizMakerUrl(b.dataset.make); });
}
