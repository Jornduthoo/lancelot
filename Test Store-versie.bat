@echo off
title LANcelot - test van de Store-versie
cd /d "%~dp0"

rem Start LANcelot zoals de Store-versie: zonder De Kronieken, standaard zonder leerplandoelen.
rem Je eigen LANcelot blijft onaangeroerd: deze test bewaart alles in een aparte, lege map
rem en draait op poort 3020, zodat je gewone LANcelot (poort 3000) gewoon kan blijven draaien.

if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"
where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is nog niet geinstalleerd. Start eerst "Start LANcelot.bat".
  pause
  exit /b 1
)

set "LANCELOT_DATA=%USERPROFILE%\Documents\LANcelot Store-test"
if not exist "%LANCELOT_DATA%" mkdir "%LANCELOT_DATA%"

echo.
echo  Welke licentie wil je testen?
echo    1 = proefmaand (nog 20 dagen)
echo    2 = proefmaand, laatste week (nog 5 dagen)
echo    3 = gekocht
echo    4 = proefmaand voorbij
echo.
choice /c 1234 /n /m " Kies 1, 2, 3 of 4: "
set KEUZE=%errorlevel%

set DAGEN=20
if "%KEUZE%"=="2" set DAGEN=5
if "%KEUZE%"=="4" set DAGEN=-1
for /f "usebackq delims=" %%d in (`powershell -NoProfile -Command "(Get-Date).AddDays(%DAGEN%).ToUniversalTime().ToString('o')"`) do set "TOT=%%d"

set "LANCELOT_STORE_LICENTIE={"active":true,"trial":true,"expires":"%TOT%"}"
if "%KEUZE%"=="3" set "LANCELOT_STORE_LICENTIE={"active":true,"trial":false}"
if "%KEUZE%"=="4" set "LANCELOT_STORE_LICENTIE={"active":false,"trial":true,"expires":"%TOT%"}"

set LANCELOT_STORE=1
set PORT=3020
set LANCELOT_OPEN=1
echo.
echo  Gegevens van deze test: %LANCELOT_DATA%
echo  Wil je opnieuw van nul beginnen? Sluit dit venster en wis die map.
echo.
node server.js
if errorlevel 1 pause
