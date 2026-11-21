# LANcelot zonder zwart venster: het schild van LANcelot naast de klok (systeemvak), en de server verborgen erachter.
# Gestart door src/systeemvak.js (vanuit Start LANcelot.bat). Klik op het schild: het leerkrachtenscherm opent.
# Rechtsklik: openen of afsluiten. Stopt de server met een fout, dan toont een melding wat er misging.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$app = $env:LANCELOT_APP
$log = Join-Path ([IO.Path]::GetTempPath()) 'lancelot-log.txt'

$teksten = @{
  nl = @{ open = 'Leerkrachtenscherm openen'; uit = 'LANcelot afsluiten'; tip = 'LANcelot draait. Klik om te openen.'; vraag = 'LANcelot afsluiten? Leerlingen kunnen dan niet meer spelen tot je LANcelot opnieuw start.'; fout = 'LANcelot is gestopt met een fout:' }
  en = @{ open = 'Open teacher screen'; uit = 'Close LANcelot'; tip = 'LANcelot is running. Click to open.'; vraag = 'Close LANcelot? Students cannot play until you start LANcelot again.'; fout = 'LANcelot stopped with an error:' }
  fr = @{ open = "Ouvrir l'écran de l'enseignant"; uit = 'Fermer LANcelot'; tip = 'LANcelot fonctionne. Cliquez pour ouvrir.'; vraag = 'Fermer LANcelot ? Les élèves ne pourront plus jouer avant que vous redémarriez LANcelot.'; fout = "LANcelot s'est arrêté avec une erreur :" }
  de = @{ open = 'Lehrkraftbildschirm öffnen'; uit = 'LANcelot beenden'; tip = 'LANcelot läuft. Zum Öffnen klicken.'; vraag = 'LANcelot beenden? Die Schüler können erst wieder spielen, wenn du LANcelot neu startest.'; fout = 'LANcelot wurde mit einem Fehler beendet:' }
  es = @{ open = 'Abrir la pantalla del docente'; uit = 'Cerrar LANcelot'; tip = 'LANcelot está en marcha. Haz clic para abrir.'; vraag = '¿Cerrar LANcelot? Los alumnos no podrán jugar hasta que vuelvas a iniciar LANcelot.'; fout = 'LANcelot se detuvo con un error:' }
}
$w = $teksten[(Get-UICulture).TwoLetterISOLanguageName]
if (-not $w) { $w = $teksten.en }

# Het logboek van de server lezen terwijl die er nog in schrijft.
function Lees-Log {
  try {
    $f = [IO.File]::Open($log, 'Open', 'Read', 'ReadWrite')
    try { return (New-Object IO.StreamReader($f)).ReadToEnd() } finally { $f.Close() }
  } catch { return '' }
}
# Het adres dat de server zelf meldt (poort 3000, of een volgende als die bezet was).
function Open-Scherm {
  $m = [regex]::Match((Lees-Log), 'http://localhost:\d+/host')
  $url = if ($m.Success) { $m.Value } else { 'http://localhost:3000/host' }
  Start-Process $url
}

$icoon = New-Object System.Windows.Forms.NotifyIcon
# Een eigen, helder icoon voor naast de klok (het helm-vizier met een lichte rand), in de maat die Windows daar gebruikt.
$icoon.Icon = New-Object System.Drawing.Icon((Join-Path $app 'public\img\systeemvak.ico'), [System.Windows.Forms.SystemInformation]::SmallIconSize)
$icoon.Text = 'LANcelot'
$menu = New-Object System.Windows.Forms.ContextMenuStrip
$itemOpen = $menu.Items.Add($w.open)
$itemOpen.Font = New-Object System.Drawing.Font($itemOpen.Font, [System.Drawing.FontStyle]::Bold)
$itemUit = $menu.Items.Add($w.uit)
$icoon.ContextMenuStrip = $menu
$icoon.Visible = $true

# De server zelf, zonder venster. Wat hij meldt, komt in het logboek.
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $env:ComSpec
$psi.Arguments = '/d /s /c ""' + $env:LANCELOT_NODE + '" server.js > "' + $log + '" 2>&1"'
$psi.WorkingDirectory = $app
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$server = [System.Diagnostics.Process]::Start($psi)

# Het schild staat er en de server start: Start LANcelot.bat mag zijn venster sluiten.
[IO.File]::WriteAllText($env:LANCELOT_KLAAR, 'ok')

$ErrorActionPreference = 'Continue'
# Meldingen altijd bovenaan, niet verstopt achter andere vensters.
$eigenaar = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false }
function Stop-Alles {
  $icoon.Visible = $false
  $icoon.Dispose()
  [System.Windows.Forms.Application]::Exit()
}
$itemOpen.add_Click({ Open-Scherm })
$icoon.add_MouseClick({ param($s, $e) if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Open-Scherm } })
$itemUit.add_Click({
  $ja = [System.Windows.Forms.MessageBox]::Show($eigenaar, $w.vraag, 'LANcelot', 'YesNo', 'Question')
  if ($ja -ne 'Yes') { return }
  if (-not $server.HasExited) { & taskkill.exe /T /F /PID $server.Id | Out-Null }
  Stop-Alles
})

$script:gemeld = $false
$klok = New-Object System.Windows.Forms.Timer
$klok.Interval = 1000
$klok.add_Tick({
  if (-not $script:gemeld -and (Lees-Log).Contains('LANcelot draait!')) {
    $script:gemeld = $true
    $icoon.Text = $w.tip
  }
  if ($server.HasExited) {
    $klok.Stop()
    if ($server.ExitCode -ne 0) {
      $regels = (Lees-Log) -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -Last 12
      [System.Windows.Forms.MessageBox]::Show($eigenaar, $w.fout + "`n`n" + ($regels -join "`n"), 'LANcelot', 'OK', 'Warning') | Out-Null
    }
    Stop-Alles
  }
})
$klok.Start()

# Windows 11 zet een nieuw pictogram eerst bij de verborgen pictogrammen (pijltje ^). Het schild moet altijd zichtbaar
# naast de klok staan: Windows bewaart dat per pictogram in NotifyIconSettings (IsPromoted). Windows maakt die regel
# pas aan nadat het schild verschenen is, dus een paar keer kijken. Windows 10 kent dit niet: dan gebeurt er niets.
$script:zichtbaarPogingen = 0
$zichtbaar = New-Object System.Windows.Forms.Timer
$zichtbaar.Interval = 1500
$zichtbaar.add_Tick({
  $script:zichtbaarPogingen++
  try {
    Get-ChildItem 'HKCU:\Control Panel\NotifyIconSettings' -ErrorAction Stop | ForEach-Object {
      $r = Get-ItemProperty $_.PSPath
      if ($r.ExecutablePath -like '*powershell.exe' -and $r.InitialTooltip -eq 'LANcelot' -and $r.IsPromoted -ne 1) {
        Set-ItemProperty $_.PSPath -Name IsPromoted -Value 1 -Type DWord
      }
    }
  } catch {}
  if ($script:zichtbaarPogingen -ge 8) { $zichtbaar.Stop() }
})
$zichtbaar.Start()
[System.Windows.Forms.Application]::Run()
