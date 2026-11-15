; LANcelot-installatie.exe: de schoolversie van LANcelot (alles erin: Kronieken, Woordkaarten, Junior, Vlaamse doelen).
; Bouwen met: node installer/maak-installer.js (zie installer/README.md). Dat script geeft STAGE, UIT, VERSIE en SHA mee.
; - Installeert per gebruiker, zonder beheerdersrechten, in %LOCALAPPDATA%\Programs\LANcelot. Node.js zit erin (map node).
; - installatie.json zet de gegevens van de klas apart in %LOCALAPPDATA%\LANcelot (zie src/gegevens.js).
;   De installer schrijft daar nooit iets. Opnieuw installeren of bijwerken laat de klas dus altijd staan.
; - Verwijderen haalt alleen de app weg, nooit de gegevens.
; - Firewall: Windows vraagt één keer toestemming. Weigeren mag: dan kan het later met de knop in LANcelot.

Unicode true
!include MUI2.nsh
!include LogicLib.nsh

!ifndef STAGE
  !error "Geef /DSTAGE=... mee (zie maak-installer.js)"
!endif

Name "LANcelot"
OutFile "${UIT}"
InstallDir "$LOCALAPPDATA\Programs\LANcelot"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64
BrandingText "LANcelot ${VERSIE}"
ShowInstDetails nevershow
ShowUninstDetails nevershow

VIProductVersion "${VIVERSIE}"
VIAddVersionKey /LANG=1043 "ProductName" "LANcelot"
VIAddVersionKey /LANG=1043 "CompanyName" "Jorn Duthoo"
VIAddVersionKey /LANG=1043 "FileDescription" "LANcelot installeren"
VIAddVersionKey /LANG=1043 "FileVersion" "${VERSIE}"
VIAddVersionKey /LANG=1043 "ProductVersion" "${VERSIE}"
VIAddVersionKey /LANG=1043 "LegalCopyright" "Jorn Duthoo, alle rechten voorbehouden"

!define MUI_ICON "${STAGE}\public\img\lancelot.ico"
!define MUI_UNICON "${STAGE}\public\img\lancelot.ico"
!define MUI_ABORTWARNING

!define MUI_WELCOMEPAGE_TITLE "LANcelot installeren"
!define MUI_WELCOMEPAGE_TEXT "Zo staat LANcelot in één minuut op deze pc.$\r$\n$\r$\nJe klas, quizzen en resultaten blijven altijd bewaard, ook als je LANcelot later bijwerkt of opnieuw installeert.$\r$\n$\r$\nKlik op Installeren."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_TITLE "LANcelot staat klaar"
!define MUI_FINISHPAGE_TEXT "Start LANcelot met het schild op het bureaublad.$\r$\n$\r$\nDe eerste keer helpt LANcelot je in vier korte stappen. Daar staat ook het bericht voor de ICT'er, zodat deze pc een vast adres krijgt."
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "LANcelot nu starten"
!define MUI_FINISHPAGE_RUN_FUNCTION StartLancelot
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "Dutch"

!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\LANcelot"

; Draait LANcelot nog vanuit deze map? Dan kan Windows node.exe niet vervangen.
!macro WachtTotGesloten UN
Function ${UN}WachtTotGesloten
  opnieuw:
  ${IfNot} ${FileExists} "$INSTDIR\node\node.exe"
    Return
  ${EndIf}
  ClearErrors
  FileOpen $0 "$INSTDIR\node\node.exe" a
  ${If} ${Errors}
    IfSilent 0 +2
      Abort
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "LANcelot draait nog op deze pc.$\r$\n$\r$\nSluit het zwarte venster van LANcelot (niet tijdens een les) en klik dan op Opnieuw." IDRETRY opnieuw
    Abort
  ${EndIf}
  FileClose $0
FunctionEnd
!macroend
!insertmacro WachtTotGesloten ""
!insertmacro WachtTotGesloten "un."

Function .onInit
  Call WachtTotGesloten
FunctionEnd

Function un.onInit
  Call un.WachtTotGesloten
FunctionEnd

Function StartLancelot
  ExecShell "" "$INSTDIR\Start LANcelot.bat" "" SW_SHOWNORMAL
FunctionEnd

Section "LANcelot"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  ; Bij opnieuw installeren: oude code weg, zodat er geen bestanden van een vorige versie blijven hangen.
  ; Alleen mappen van de app zelf; wat van de klas is (gegevens.js) staat in %LOCALAPPDATA%\LANcelot.
  RMDir /r "$INSTDIR\public"
  RMDir /r "$INSTDIR\src"
  RMDir /r "$INSTDIR\lang"
  RMDir /r "$INSTDIR\node_modules"
  RMDir /r "$INSTDIR\node"
  File /r "${STAGE}\*"
  WriteUninstaller "$INSTDIR\LANcelot verwijderen.exe"

  CreateShortcut "$DESKTOP\LANcelot.lnk" "$INSTDIR\Start LANcelot.bat" "" "$INSTDIR\public\img\lancelot.ico" 0 SW_SHOWNORMAL "" "LANcelot starten"
  CreateShortcut "$SMPROGRAMS\LANcelot.lnk" "$INSTDIR\Start LANcelot.bat" "" "$INSTDIR\public\img\lancelot.ico" 0 SW_SHOWNORMAL "" "LANcelot starten"

  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "LANcelot"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "${VERSIE}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "Jorn Duthoo"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\public\img\lancelot.ico"
  WriteRegStr HKCU "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\LANcelot verwijderen.exe"'
  WriteRegStr HKCU "${UNINST_KEY}" "QuietUninstallString" '"$INSTDIR\LANcelot verwijderen.exe" /S'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "EstimatedSize" ${KB}

  ; Firewall: leerlingen binnenlaten op de poorten van LANcelot, en node.exe van deze installatie toelaten
  ; (dan komt het venster van Windows Firewall niet, dat iemand per ongeluk kan wegklikken).
  ; Dit is de enige stap met beheerdersrechten. Weigeren mag: Instellingen > Firewall goed zetten doet hetzelfde.
  IfSilent firewall_klaar
  MessageBox MB_OK|MB_ICONINFORMATION "Nog één ding: Windows vraagt zo toestemming, zodat leerlingen met hun Chromebook of gsm kunnen meespelen. Klik daar op Ja.$\r$\n$\r$\nHeb je geen beheerdersrechten? Geen probleem: de ICT'er kan dit later doen met Instellingen > Firewall goed zetten."
  ExecShellWait "runas" "powershell.exe" "-NoProfile -WindowStyle Hidden -Command $\"$$n = '$INSTDIR\node\node.exe'; Get-NetFirewallApplicationFilter -Program $$n -ErrorAction SilentlyContinue | Get-NetFirewallRule | Where-Object { $$_.Action -eq 'Block' -and $$_.Direction -eq 'Inbound' } | Remove-NetFirewallRule; Remove-NetFirewallRule -DisplayName 'LANcelot' -ErrorAction SilentlyContinue; New-NetFirewallRule -DisplayName 'LANcelot' -Direction Inbound -Protocol TCP -LocalPort 3000-3010 -Action Allow -Profile Any | Out-Null; New-NetFirewallRule -DisplayName 'LANcelot' -Direction Inbound -Program $$n -Action Allow -Profile Any | Out-Null$\"" SW_HIDE
  firewall_klaar:
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  Delete "$DESKTOP\LANcelot.lnk"
  Delete "$SMPROGRAMS\LANcelot.lnk"
  DeleteRegKey HKCU "${UNINST_KEY}"
  ; Staan er (toch) gegevens van een klas in de map van de app? Dan alleen de app zelf weghalen.
  ${If} ${FileExists} "$INSTDIR\.lancelot-gegevens.json"
  ${OrIf} ${FileExists} "$INSTDIR\klas\*.*"
  ${OrIf} ${FileExists} "$INSTDIR\settings.json"
    !include "${LIJST}"
    Delete "$INSTDIR\LANcelot verwijderen.exe"
  ${Else}
    RMDir /r "$INSTDIR"
  ${EndIf}
  IfSilent +2
    MessageBox MB_OK|MB_ICONINFORMATION "LANcelot is verwijderd.$\r$\n$\r$\nJe klas, quizzen, logboek en back-ups blijven bewaard in:$\r$\n$LOCALAPPDATA\LANcelot$\r$\n$\r$\nInstalleer je LANcelot opnieuw, dan staat alles er meteen weer."
SectionEnd
