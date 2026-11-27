# De LANcelot-extensie op de Chromebooks

Met de extensie "LANcelot in de klas" zie je in LANcelot welke sites openstaan op de Chromebooks van je klas.
Je stuurt ze terug naar LANcelot, zet ze vast op LANcelot of vraagt hun aandacht ("Kijk naar het bord").
Alles bedien je in LANcelot via **Namen › Chromebooks**.

De code staat in `src/chromebook-extensie/`. De zip voor de Chrome Web Store download je in LANcelot zelf:
Namen › Chromebooks › Installeren › Extensie (zip). Die zip bevat ook de socket.io-client van deze LANcelot.

## 1. De extensie privé in de Chrome Web Store zetten (eenmalig)

1. Ga naar de [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) en meld je aan met je **schoolaccount** (Het Kleurenpalet).
   De eerste keer vraagt Google een eenmalige registratie als ontwikkelaar.
2. Kies **Nieuw item** en upload de zip uit LANcelot.
3. **Winkelvermelding**: naam en beschrijving staan al in de zip. Kies categorie *Onderwijs*, en voeg de schermafbeelding (1280×800) toe.
4. **Privacy**:
   - Eén doel: "De leerkracht ziet in LANcelot welke sites openstaan op de Chromebooks van de klas en kan ze terug naar LANcelot sturen."
   - Rechten: `tabs` (site en titel van open tabbladen), `storage` (instellingen), `alarms` (verbonden blijven), `identity` en `identity.email` (welk schoolaccount), `declarativeNetRequestWithHostAccess` en toegang tot alle sites (LANcelot vastzetten), `managed storage` (adres uit Google Admin).
   - Gegevens: *Persoonlijk identificeerbare info* (e-mailadres) en *Webgeschiedenis*. Vink aan dat je ze niet verkoopt en alleen voor dit doel gebruikt.
   - Privacybeleid: `https://lancelot.network/privacy.html`
5. **Distributie › Zichtbaarheid**: kies **Privé** en **Alleen voor testers / mijn domein** (het domein van de school). Dan ziet niemand buiten de school de extensie.
6. **Indienen**. Google kijkt de extensie na, meestal binnen enkele dagen.
7. Noteer het **ID** van de extensie (32 letters, staat bovenaan het item).

Een nieuwe versie: verhoog `version` in `manifest.json`, download de zip opnieuw en upload ze bij hetzelfde item. De Chromebooks werken zichzelf bij.

## 2. Alleen voor jouw klas: Google Admin

1. **Organisatie-eenheid**: admin.google.com › Directory › Organisatie-eenheden. Maak onder de leerlingen een eenheid voor je klas (bv. "6e leerjaar Jorn") en zet je leerlingen erin.
2. **Extensie verplicht installeren**: Apparaten › Chrome › Apps en extensies › **Gebruikers en browsers**. Kies links je klas.
   Klik op het gele **+** › *Uit de Chrome Web Store toevoegen* › tabblad **Privé** › "LANcelot in de klas" (of zoek op het ID).
   Zet het installatiebeleid op **Installatie forceren + vastzetten in browserwerkbalk**.
3. **Adres van LANcelot**: klik op de extensie en plak bij **Beleid voor extensies** (JSON) wat LANcelot toont bij Installeren, bijvoorbeeld:
   ```json
   {"server": {"Value": "http://192.168.1.109:3000"}}
   ```
4. **Opslaan.** Na een herstart of binnen een uur staat de extensie op de Chromebooks van je klas, en alleen daar.

## 3. Zo kunnen leerlingen ze niet omzeilen

Zet in dezelfde organisatie-eenheid (Apparaten › Chrome › Instellingen › **Gebruikers en browsers**):

| Instelling | Waarde | Waarom |
|---|---|---|
| Incognitomodus | Incognitomodus niet toestaan | In incognito werkt geen enkele extensie |
| Toegang tot browsergastmodus / Gastmodus | Uit | Een gast heeft de extensie niet |
| Ontwikkelaarstools | Nooit gebruik toestaan | Geen gepruts aan de extensie |
| Taakbeheer | Gebruikers mogen geen processen beëindigen | Anders kan een leerling de extensie stilleggen |
| Apps en extensies › Extra instellingen | Alle andere apps en extensies blokkeren (alleen toegestane) | Geen VPN- of proxy-extensies |
| Inloggen beperken tot | het domein van de school | Geen privé-Google-account op de Chromebook |

Bij **Apparaten › Chrome › Instellingen › Apparaat** (voor de Chromebooks van de klas): *Gastmodus* uit en *Inloggen beperken* tot het schooldomein.

Wat de extensie zelf doet:
- Ze is geforceerd geïnstalleerd: leerlingen kunnen ze niet uitzetten of verwijderen.
- Wifi uitzetten helpt niet: een vastgezette Chromebook blijft een uur vast zonder verbinding. "Kijk naar het bord" blijft twee minuten.
- Het venster "Kijk naar het bord" komt terug als je het wegklikt of naar een ander venster gaat.
- Vastgezet gaan ook de instellingen en interne pagina's van Chrome achter het slot.
- Thuis (geen verbinding met LANcelot) meldt de extensie niets en zet ze niets vast.

## 4. Jouw eigen Chrome als bedieningspaneel

1. Zet in LANcelot bij Namen › Chromebooks › Installeren je eigen schoolaccount.
2. Installeer de extensie ook in je eigen Chrome (in Google Admin bij de eenheid van de leerkrachten, of zelf uit de Web Store, tabblad Privé), met hetzelfde beleid.
3. Klik op het LANcelot-icoon › **Bedieningspaneel openen**. Op een andere pc dan het digibord koppel je die pc één keer met de code van het digibord (zoals de bureau-pc).

Jouw eigen Chrome wordt nooit gevolgd, vastgezet of op zwart gezet.

## Privacy

- Alleen de site en de titel van elk tabblad, nooit het volledige adres, de inhoud of wat er getypt wordt.
- De surfgeschiedenis staat alleen op de LANcelot-pc (`chromebooks/`), standaard 30 dagen, niet in de lesmap en niet in de back-up-zip. Wissen kan in Namen › Chromebooks › Geschiedenis.
- Vertel leerlingen en ouders dat de Chromebooks op school meekijken (bv. in de klasbrief). Het venstertje van de extensie zegt het de leerling ook.
