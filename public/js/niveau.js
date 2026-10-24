// De drie niveaus van een oefenblad of een quiz: Page (met hulp), Schildknaap (het doel zelf), Ridder (uitdaging).
// Gedeeld door de makers, het bord, het printblad, Mijn klas en het leerlingscherm.
const Niveau = (() => {
  const LIST = ['page', 'schildknaap', 'ridder'];
  const NAMES = { page: 'Page', schildknaap: 'Schildknaap', ridder: 'Ridder' };
  const ICONS = { page: '🪶', schildknaap: '🛡️', ridder: '⚔️' };
  const HELP = { page: 'met hulp', schildknaap: 'het doel', ridder: 'uitdaging' };
  // Wat de leerling ziet als hij zelf kiest.
  const STUDENT = {
    page: 'Ik oefen met hulp: voorbeelden en tips erbij.',
    schildknaap: 'Ik oefen het doel zelf.',
    ridder: 'Ik wil een uitdaging!',
  };
  const label = n => `${ICONS[n]} ${NAMES[n]}`;

  // Het stuk van de AI-prompt dat uitlegt wat elk niveau inhoudt.
  function prompt(level, wat) {
    return `Maak de ${wat} op drie niveaus, zodat elke leerling op zijn eigen hoogte oefent (differentiatie):
- "page" (Page, met hulp): dezelfde leerstof met ondersteuning. Zet een voorbeeld, een tip of een stappenplan in de opdracht of de vraag, gebruik eenvoudigere en kortere opgaven en maak de foute antwoorden duidelijker fout.
- "schildknaap" (Schildknaap, het doel): precies wat het doel vraagt, op het gewone niveau van ${level}.
- "ridder" (Ridder, uitdaging): dezelfde leerstof, maar moeilijker: toepassen in een nieuwe situatie, meer denkstappen of een uitbreiding.
Alle drie de niveaus gaan over hetzelfde onderwerp en dezelfde doelen.`;
  }

  return { LIST, NAMES, ICONS, HELP, STUDENT, label, prompt };
})();
