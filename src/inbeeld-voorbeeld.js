// Voorbeeldkaarten van In Beeld, ingebouwd: zo kan je het aanbrengen, de woorden van de week en de quiz meteen uitproberen,
// ook voor de echte kaarten online staan. De beelden komen uit het Toverdorp van LANcelot Junior.
// De echte kaarten (met een vast nummer zoals W-142) haal je op bij In Beeld; deze krijgen een V-nummer.
const WS = { K3: '1.5.GK3.3', 1: '1.5.GL1.2', 3: '1.5.GL3.9', 4: '1.5.GL4.7', 6: '1.5.GL6.3' };
const k = (nr, woord, uitleg, zin, beeld, leerjaren, doelen, verwant = []) => ({
  nr, woord, uitleg, zin, beeld: `/img/junior/rijk/${beeld}.webp`, leerjaren, doelen, verwant, vak: 'Nederlands',
});

module.exports = {
  id: 'voorbeeld',
  titel: 'Voorbeeldkaarten',
  kaarten: [
    k('V-1', 'het schip', 'Een grote boot die over de zee vaart.', 'Het schip vaart met de wind in de zeilen naar de haven.', 'haven/1', ['K3', '1', '2'], [WS.K3, WS[1]], ['V-2', 'V-3']),
    k('V-2', 'het anker', 'Een zware haak van ijzer. Je laat het zakken, dan blijft je boot op zijn plek.', 'De kapitein gooit het anker in het water.', 'haven/2', ['1', '2', '3'], [WS[1], WS[3]], ['V-1']),
    k('V-3', 'de vuurtoren', 'Een hoge toren aan zee met een sterke lamp. Zo zien schepen in het donker waar de kust is.', "'s Nachts draait het licht van de vuurtoren rond.", 'haven/3', ['K3', '1', '2', '3'], [WS.K3, WS[3]], ['V-1', 'V-4']),
    k('V-4', 'de reddingsboei', 'Een ring die blijft drijven. Je gooit hem naar iemand die in het water valt.', 'De redder gooit de reddingsboei naar de zwemmer.', 'haven/4', ['2', '3', '4'], [WS[3], WS[4]], ['V-3']),
    k('V-5', 'de zeehond', 'Een dier met een dikke vacht dat goed zwemt en op het strand ligt te rusten.', 'Op de zandbank ligt een zeehond in de zon.', 'haven/5', ['K2', 'K3', '1'], [WS.K3], []),
    k('V-6', 'de verrekijker', 'Een toestel met twee buizen. Je kijkt erdoor en ziet dingen ver weg heel groot.', 'Met de verrekijker zie ik een schip aan de horizon.', 'haven/6', ['1', '2', '3', '4'], [WS[1], WS[4]], ['V-3']),
    k('V-7', 'de regenboog', 'Een boog met veel kleuren in de lucht. Je ziet hem als de zon schijnt terwijl het regent.', 'Na de bui staat er een regenboog boven de school.', 'weer/3', ['K2', 'K3', '1', '2'], [WS.K3, WS[1]], ['V-8', 'V-9']),
    k('V-8', 'de bliksem', 'Een felle lichtflits in de lucht tijdens een onweer.', 'De bliksem verlicht de hele hemel.', 'weer/5', ['1', '2', '3', '4'], [WS[1], WS[4]], ['V-7']),
    k('V-9', 'de sneeuwvlok', 'Een klein, wit sterretje van ijs dat uit de lucht valt als het heel koud is.', 'Er valt een sneeuwvlok op mijn want.', 'weer/6', ['K3', '1', '2'], [WS.K3, WS[1]], ['V-7']),
    k('V-10', 'de kroon', 'Een gouden ring met edelstenen die een koning of koningin op het hoofd draagt.', 'De koningin zet haar kroon op.', 'kasteel/2', ['JK', 'K2', 'K3'], [WS.K3], ['V-11']),
    k('V-11', 'de troon', 'Een grote, mooie stoel waar een koning of koningin op zit.', 'De koning zit op zijn troon in de grote zaal.', 'kasteel/4', ['2', '3', '4', '5'], [WS[3], WS[4]], ['V-10', 'V-12']),
    k('V-12', 'de schatkist', 'Een stevige kist met een slot. Er zitten kostbare dingen in, zoals goud en juwelen.', 'De piraten begraven de schatkist op het eiland.', 'kasteel/5', ['K3', '1', '2', '3'], [WS.K3, WS[3]], ['V-11']),
    k('V-13', 'de koets', 'Een wagen met grote wielen die door paarden getrokken wordt. Vroeger reisden rijke mensen zo.', 'De prinses rijdt in een gouden koets naar het feest.', 'kasteel/6', ['3', '4', '5', '6'], [WS[4], WS[6]], ['V-11']),
    k('V-14', 'de raket', 'Een toestel dat heel snel de ruimte in vliegt.', 'Drie, twee, één: de raket stijgt op!', 'ruimte/1', ['K3', '1', '2', '3'], [WS.K3, WS[3]], ['V-15', 'V-16']),
    k('V-15', 'de astronaut', 'Iemand die met een raket naar de ruimte reist om daar te werken en te onderzoeken.', 'De astronaut zweeft door het ruimtestation.', 'ruimte/2', ['2', '3', '4', '5', '6'], [WS[4], WS[6]], ['V-14', 'V-16']),
    k('V-16', 'de planeet', 'Een grote, ronde hemelbol die rond een ster draait. De aarde is er ook een.', 'Mars is de rode planeet naast de aarde.', 'ruimte/3', ['3', '4', '5', '6'], [WS[4], WS[6]], ['V-15']),
  ],
};
