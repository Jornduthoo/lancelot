@echo off
title LANcelot
cd /d "%~dp0"

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

rem Open het docentenscherm zodra de server draait.
start "" /b cmd /c "timeout /t 2 >nul & start http://localhost:3000/host"
node server.js
pause
