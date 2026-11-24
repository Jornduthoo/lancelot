# LANcelot bijwerken als de gewone update vastloopt (bv. een pc met een oudere versie waar de LANcelot-knop public\img
# openhoudt). Je gegevens blijven altijd staan: de installatie gebeurt met LANcelot zelf (src/bijwerken.js pasToe).
# Gebruik: Windows-toets + R, en plak:
#   powershell -ep bypass -c "[Net.ServicePointManager]::SecurityProtocol='Tls12';irm https://raw.githubusercontent.com/Jornduthoo/lancelot/main/tools/lancelot-bijwerken.ps1 | iex"
& {
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
function Zeg($t) { Write-Host "  $t" }

# 1. Waar staat LANcelot? Naast dit bestand, of in de map op de leerkracht-pc links.
$kandidaten = @((Get-Location).Path, 'C:\Users\Dell All In One\Downloads\LANcelot-FINAL2 (1)\LANcelot', (Join-Path $env:USERPROFILE 'Desktop\LANcelot'), (Join-Path $env:LOCALAPPDATA 'Programs\LANcelot'))
# Anders zoeken in Bureaublad en Downloads (niet dieper dan nodig).
foreach ($m in @('Desktop', 'Downloads')) {
  $kandidaten += Get-ChildItem -LiteralPath (Join-Path $env:USERPROFILE $m) -Filter 'Start LANcelot.bat' -Recurse -Depth 3 -ErrorAction SilentlyContinue | ForEach-Object { $_.DirectoryName }
}
$app = $kandidaten | Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'server.js')) -and (Test-Path -LiteralPath (Join-Path $_ 'src\bijwerken.js')) } | Select-Object -First 1
if (-not $app) { Zeg 'LANcelot niet gevonden. Zet dit bestand in de map van LANcelot (waar "Start LANcelot.bat" staat) en dubbelklik opnieuw.'; return }
$app = (Resolve-Path -LiteralPath $app).Path
Write-Host ''
Zeg "LANcelot bijwerken in: $app"
Zeg 'Je gegevens (klas, logboek, taken, toetsen...) blijven altijd staan.'
Write-Host ''

# 2. Niet tijdens een les: zijn er leerlingen verbonden?
$poorten = 3000..3010
$buiten = @(Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue | Where-Object { $poorten -contains $_.LocalPort -and $_.RemoteAddress -notin @('127.0.0.1', '::1') })
if ($buiten.Count) {
  $a = Read-Host '  Er zijn nog leerlingen verbonden met LANcelot. Toch nu bijwerken? (j/n)'
  if ($a -notmatch '^[jJyY]') { Zeg 'Niets veranderd. Probeer het na de les opnieuw.'; return }
}

# 3. De nieuwste versie ophalen.
Zeg 'Nieuwste versie ophalen (dat duurt even)...'
$c = Invoke-RestMethod -UseBasicParsing -Headers @{ 'User-Agent' = 'LANcelot' } -Uri 'https://api.github.com/repos/Jornduthoo/lancelot/commits/main'
$upd = Join-Path $app '_update'
New-Item -ItemType Directory -Force -Path $upd | Out-Null
$tmp = Join-Path $upd 'klaar.zip.tmp'
for ($i = 1; $i -le 3; $i++) {
  try { Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/Jornduthoo/lancelot/zip/$($c.sha)" -OutFile $tmp; break }
  catch { if ($i -eq 3) { Zeg 'Ophalen lukte niet (geen internet?). Er is niets veranderd.'; return }; Start-Sleep -Seconds 10 }
}
if ((Get-Item -LiteralPath $tmp).Length -lt 50MB) { Remove-Item -LiteralPath $tmp; Zeg 'De download is onvolledig. Er is niets veranderd. Probeer opnieuw.'; return }
Move-Item -Force -LiteralPath $tmp -Destination (Join-Path $upd 'klaar.zip')
$info = @{ sha = $c.sha; datum = $c.commit.committer.date; bericht = ($c.commit.message -split "`n")[0] } | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $upd 'klaar.json'), $info, (New-Object Text.UTF8Encoding $false))

# 4. LANcelot sluiten: de LANcelot-knop in de taakbalk en de server van LANcelot. Niets anders.
Zeg 'LANcelot even sluiten...'
Get-CimInstance Win32_Process | Where-Object {
  ($_.Name -eq 'powershell.exe' -and $_.CommandLine -match '-STA' -and $_.CommandLine -match 'EncodedCommand') -or
  ($_.Name -eq 'node.exe' -and $_.CommandLine -match '(^|[\\\s"])(server|src\\systeemvak)\.js')
} | ForEach-Object { try { Stop-Process -Id $_.ProcessId -Force } catch {} }
Start-Sleep -Seconds 3

# 5. Installeren met LANcelot zelf (alleen de code wordt vervangen, nooit de gegevens).
Zeg 'Nieuwe versie installeren...'
Set-Location -LiteralPath $app
$node = if (Test-Path -LiteralPath (Join-Path $app 'node\node.exe')) { Join-Path $app 'node\node.exe' } else { 'node' }
$uit = & $node -e "const b=require('./src/bijwerken');const r=b.pasToe();console.log(JSON.stringify(r));console.log(b.view().melding||'')"
$uit | ForEach-Object { Zeg $_ }
if ($uit -match '"npm":true') { Zeg 'Onderdelen installeren...'; & cmd /c 'npm install --omit=dev' | Out-Null }

# 6. LANcelot opnieuw starten.
Zeg 'LANcelot opnieuw starten...'
Start-Process -FilePath (Join-Path $app 'Start LANcelot.bat') -WorkingDirectory $app
Write-Host ''
if ($uit -match 'is bijgewerkt') { Zeg 'Klaar! LANcelot is bijgewerkt. Je mag dit venster sluiten.' } else { Zeg 'Er ging iets mis bij het installeren (zie hierboven). LANcelot start met de vorige versie; je gegevens staan er nog.' }
}
Write-Host ''
Read-Host '  Druk op Enter om dit venster te sluiten'
