; LANcelot: ontwerp van de Windows-installer (Inno Setup 6). NOG NIET GEBOUWD; zie installer/README.md.
; - Installeert per gebruiker, zonder beheerdersrechten, in %LOCALAPPDATA%\Programs\LANcelot.
; - Levert Node.js zelf mee (map node), dus ook daarvoor zijn geen beheerdersrechten nodig.
; - installatie.json zet de gegevens van de klas apart in %LOCALAPPDATA%\LANcelot (zie src/gegevens.js).
; - Verwijderen haalt alleen de app weg: klas, quizzen, logboek en back-ups blijven altijd staan.
; - De firewallregel zet de leerkracht na de installatie met de knop in LANcelot (één keer toestemming).

#define Versie "0.1.0"

[Setup]
AppId={{9CCAE130-2AF9-405C-943A-66D8052D2B0E}
AppName=LANcelot
AppVersion={#Versie}
AppPublisher=Jorn Duthoo
DefaultDirName={localappdata}\Programs\LANcelot
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
LicenseFile=staging\LICENSE
SetupIconFile=staging\public\img\lancelot.ico
UninstallDisplayIcon={app}\public\img\lancelot.ico
UninstallDisplayName=LANcelot
OutputDir=uitvoer
OutputBaseFilename=LANcelot-installatie
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes
WizardStyle=modern

[Languages]
Name: "nl"; MessagesFile: "compiler:Languages\Dutch.isl"

[Tasks]
Name: "bureaublad"; Description: "Een snelkoppeling op het bureaublad"

[Files]
; staging\ = de app zoals in de repo, plus node\ (Node.js voor Windows, zip-versie) en node_modules\ (npm ci --omit=dev).
Source: "staging\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "installatie.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\LANcelot"; Filename: "{app}\Start LANcelot.bat"; WorkingDir: "{app}"; IconFilename: "{app}\public\img\lancelot.ico"; Comment: "LANcelot starten"
Name: "{autodesktop}\LANcelot"; Filename: "{app}\Start LANcelot.bat"; WorkingDir: "{app}"; IconFilename: "{app}\public\img\lancelot.ico"; Comment: "LANcelot starten"; Tasks: bureaublad

[Run]
Filename: "{app}\Start LANcelot.bat"; WorkingDir: "{app}"; Description: "LANcelot nu starten"; Flags: postinstall nowait skipifsilent shellexec

[Code]
// Na het verwijderen: ook wat LANcelot zelf in de app-map aanmaakte (updates, node_modules...) mag weg,
// maar alleen als daar geen gegevens van de klas staan. De gegevensmap zelf wordt nooit aangeraakt.
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  App, Data: String;
begin
  if CurUninstallStep <> usPostUninstall then Exit;
  App := ExpandConstant('{app}');
  Data := ExpandConstant('{localappdata}\LANcelot');
  if not DirExists(App + '\klas') and not DirExists(App + '\logboek') and not FileExists(App + '\settings.json') then
    DelTree(App, True, True, True);
  if not UninstallSilent and DirExists(Data) then
    MsgBox('LANcelot is verwijderd. Je klas, quizzen, logboek en back-ups blijven bewaard in:' + #13#10 + Data + #13#10#13#10 +
      'Installeer je LANcelot opnieuw, dan staat alles er meteen weer. Wil je ook je gegevens wissen, verwijder dan zelf die map.', mbInformation, MB_OK);
end;
