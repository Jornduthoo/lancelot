@echo off
title LANcelot
cd /d "%~dp0"

rem Een meegeleverde Node.js (map node naast de app) heeft voorrang: dan hoeft er niets met beheerdersrechten geinstalleerd te worden.
if exist "%~dp0node\node.exe" set "PATH=%~dp0node;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is nog niet geinstalleerd.
  echo  Installeer de LTS-versie van https://nodejs.org en start daarna dit bestand opnieuw.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)

rem Installeren bij de eerste keer, of als een update nieuwe onderdelen nodig heeft.
call npm ls --omit=dev >nul 2>nul
if errorlevel 1 (
  echo  Benodigde onderdelen installeren...
  call npm install --omit=dev
  if errorlevel 1 if not exist node_modules (
    echo  Installeren is mislukt. Controleer je internetverbinding en probeer opnieuw.
    pause
    exit /b 1
  )
)

rem LANcelot opent zelf het leerkrachtenscherm zodra de server draait, ook als poort 3000 bezet was.
set LANCELOT_OPEN=1
node server.js
if errorlevel 1 pause
