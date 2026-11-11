// De eerste tien minuten: op het startscherm staat voor een nieuwe leerkracht één grote knop (een proefspel) en
// drie stappen (klas, eerste quiz, spelen met de klas). Is alles gedaan of klikt de leerkracht het weg, dan
// verdwijnt het blok voorgoed. Wat al gedaan is, lezen we af uit de klaslijst, de quizzen en het logboek.
const settings = require('./settings');
const klas = require('./klas');
const quizzes = require('./quizzes');
const logboek = require('./logboek');
const doelen = require('./doelen');
const taal = require('./taal');
const startquizzen = require('./startquizzen');

function status() {
  const s = settings.read();
  if (s.eersteStart === 'klaar') return { toon: false };
  const lijst = quizzes.list();
  const stappen = {
    klas: klas.read().leerlingen.length > 0,
    quiz: !!s.startquizzen || lijst.some(q => !startquizzen.isStartquiz(q.file)),
    spel: logboek.read().length > 0,
  };
  if (stappen.klas && stappen.quiz && stappen.spel) {
    settings.write({ eersteStart: 'klaar' });
    return { toon: false };
  }
  const info = doelen.LANDEN[doelen.land()];
  const jaar = klas.read().leerjaar;
  return {
    toon: true,
    stappen,
    leerjaar: startquizzen.PAKKET[jaar] ? jaar : 6,
    jaren: Object.keys(startquizzen.PAKKET).map(Number).map(n => ({ id: n, naam: info ? info.jaar(n) : `${n}e leerjaar` })),
  };
}

// De quiz voor het proefspel: de voorbeeldquiz, anders de eerste quiz, anders zetten we de startquizzen klaar.
function proefQuiz() {
  let lijst = quizzes.list().filter(q => q.count);
  if (!lijst.length) {
    startquizzen.installeer(klas.read().leerjaar, taal.huidig());
    lijst = quizzes.list().filter(q => q.count);
  }
  const q = lijst.find(x => /^(voorbeeld-|sample-quiz|quiz-exemple|cuestionario-ejemplo|beispielquiz)/.test(x.file)) || lijst[0];
  if (!q) throw new Error('Er is nog geen quiz. Maak er eerst een.');
  return { file: q.file };
}

function host(socket, handle, sendLibrary) {
  socket.on('eerste-start', handle(() => status()));
  socket.on('eerste-start-weg', handle(() => { settings.write({ eersteStart: 'klaar' }); }));
  socket.on('eerste-start-proef', handle(() => proefQuiz()));
  socket.on('startquizzen-installeer', handle(({ leerjaar } = {}) => {
    const out = startquizzen.installeer(leerjaar, taal.huidig());
    settings.write({ startquizzen: true });
    sendLibrary('quiz');
    return out;
  }));
}

module.exports = { status, proefQuiz, host };
