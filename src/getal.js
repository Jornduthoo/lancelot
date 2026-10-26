// Getallen vergelijken die een leerling typt: "3,5" en "3.5" en "3,50" zijn hetzelfde, "1 000" en "1.000" ook.
// Een eenheid achter het juiste antwoord ("12 cm") mag de leerling weglaten. Breuken ("3/4") vergelijken we als tekst.

function zuiver(text) {
  return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Het getal in een tekst, of null. Komma's en punten op de Belgische manier.
function waarde(text) {
  let t = zuiver(text).replace(/^(=|±|ca\.?)\s*/, '').replace(/[€%°]/g, '').trim();
  const m = t.match(/^(-?[\d .,]*\d)(?:\s*[a-zµ²³]+[a-z²³]*)?$/);
  if (!m) return null;
  t = m[1].replace(/ /g, '');
  if (t.includes(',') && t.includes('.')) t = t.replace(/\./g, '').replace(',', '.');
  else if (t.includes(',')) t = (t.match(/,/g).length > 1 ? t.replace(/,/g, '') : t.replace(',', '.'));
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const breuk = text => zuiver(text).replace(/\s/g, '');

function isGetal(text) {
  return waarde(text) !== null || /^-?\d+\/\d+$/.test(breuk(text));
}

function gelijk(getypt, juist) {
  const a = waarde(getypt);
  const b = waarde(juist);
  if (a !== null && b !== null) return Math.abs(a - b) < 1e-9;
  return breuk(getypt) !== '' && breuk(getypt) === breuk(juist);
}

// Welk antwoordnummer telt voor wat de leerling typte? Het juiste als het klopt, anders een fout antwoord
// (het foute antwoord dat hij typte, als het erbij staat).
function kies(answers, juist, getypt) {
  if (gelijk(getypt, juist)) return answers.indexOf(juist);
  const fout = answers.findIndex(a => a !== juist && gelijk(getypt, a));
  return fout >= 0 ? fout : answers.findIndex(a => a !== juist);
}

module.exports = { waarde, isGetal, gelijk, kies };
