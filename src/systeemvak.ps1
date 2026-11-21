# LANcelot zonder zwart venster: een knop met het logo van LANcelot in de taakbalk, en de server verborgen erachter.
# Gestart door src/systeemvak.js (vanuit Start LANcelot.bat). Klik op de knop in de taakbalk: een klein venster met
# "Leerkrachtenscherm openen" en "LANcelot afsluiten". Stopt de server met een fout, dan toont een melding wat er misging.
# (Een pictogram naast de klok kan Windows 11 zelf verbergen achter het pijltje ^; een knop in de taakbalk is altijd zichtbaar.)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$app = $env:LANCELOT_APP
$log = Join-Path ([IO.Path]::GetTempPath()) 'lancelot-log.txt'

$teksten = @{
  nl = @{ zin = 'LANcelot draait. Leerlingen kunnen spelen.'; open = 'Leerkrachtenscherm openen'; uit = 'LANcelot afsluiten'; vraag = 'LANcelot afsluiten? Leerlingen kunnen dan niet meer spelen tot je LANcelot opnieuw start.'; fout = 'LANcelot is gestopt met een fout:' }
  en = @{ zin = 'LANcelot is running. Students can play.'; open = 'Open teacher screen'; uit = 'Close LANcelot'; vraag = 'Close LANcelot? Students cannot play until you start LANcelot again.'; fout = 'LANcelot stopped with an error:' }
  fr = @{ zin = 'LANcelot fonctionne. Les élèves peuvent jouer.'; open = "Ouvrir l'écran de l'enseignant"; uit = 'Fermer LANcelot'; vraag = 'Fermer LANcelot ? Les élèves ne pourront plus jouer avant que vous redémarriez LANcelot.'; fout = "LANcelot s'est arrêté avec une erreur :" }
  de = @{ zin = 'LANcelot läuft. Die Schüler können spielen.'; open = 'Lehrkraftbildschirm öffnen'; uit = 'LANcelot beenden'; vraag = 'LANcelot beenden? Die Schüler können erst wieder spielen, wenn du LANcelot neu startest.'; fout = 'LANcelot wurde mit einem Fehler beendet:' }
  es = @{ zin = 'LANcelot está en marcha. Los alumnos pueden jugar.'; open = 'Abrir la pantalla del docente'; uit = 'Cerrar LANcelot'; vraag = '¿Cerrar LANcelot? Los alumnos no podrán jugar hasta que vuelvas a iniciar LANcelot.'; fout = 'LANcelot se detuvo con un error:' }
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

# Het venster: in de taakbalk met het logo, klein en rustig. Het start geminimaliseerd: alleen de knop in de taakbalk.
$venster = New-Object System.Windows.Forms.Form
$venster.Text = 'LANcelot'
$venster.Icon = New-Object System.Drawing.Icon (Join-Path $app 'public\img\systeemvak.ico')
$venster.ClientSize = New-Object System.Drawing.Size(400, 300)
$venster.FormBorderStyle = 'FixedSingle'
$venster.MaximizeBox = $false
$venster.StartPosition = 'CenterScreen'
$venster.BackColor = [System.Drawing.Color]::FromArgb(11, 20, 48)
$venster.ForeColor = [System.Drawing.Color]::White
$venster.Font = New-Object System.Drawing.Font('Segoe UI', 11)
$venster.ShowInTaskbar = $true
$venster.WindowState = 'Minimized'

$beeld = New-Object System.Windows.Forms.PictureBox
$beeld.Image = [System.Drawing.Image]::FromFile((Join-Path $app 'public\img\icon-192.png'))
$beeld.SizeMode = 'Zoom'
$beeld.SetBounds(140, 14, 120, 120)
$venster.Controls.Add($beeld)

$zin = New-Object System.Windows.Forms.Label
$zin.Text = $w.zin
$zin.TextAlign = 'MiddleCenter'
$zin.SetBounds(10, 140, 380, 30)
$venster.Controls.Add($zin)

function Maak-Knop($tekst, $y, $kleur) {
  $k = New-Object System.Windows.Forms.Button
  $k.Text = $tekst
  $k.SetBounds(60, $y, 280, 44)
  $k.FlatStyle = 'Flat'
  $k.BackColor = $kleur
  $k.ForeColor = [System.Drawing.Color]::White
  $k.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
  $k.Cursor = [System.Windows.Forms.Cursors]::Hand
  $venster.Controls.Add($k)
  return $k
}
$knopOpen = Maak-Knop $w.open 180 ([System.Drawing.Color]::FromArgb(30, 110, 230))
$knopUit = Maak-Knop $w.uit 234 ([System.Drawing.Color]::FromArgb(60, 66, 90))
$venster.AcceptButton = $knopOpen

# De server zelf, zonder venster. Wat hij meldt, komt in het logboek.
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $env:ComSpec
$psi.Arguments = '/d /s /c ""' + $env:LANCELOT_NODE + '" server.js > "' + $log + '" 2>&1"'
$psi.WorkingDirectory = $app
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
# Na een update stopt de server met code 75: dan start deze knop LANcelot helemaal opnieuw (zie server.js).
$psi.EnvironmentVariables['LANCELOT_KAN_HERSTARTEN'] = '1'
$server = [System.Diagnostics.Process]::Start($psi)

# De knop staat er en de server start: Start LANcelot.bat mag zijn venster sluiten.
[IO.File]::WriteAllText($env:LANCELOT_KLAAR, 'ok')

$ErrorActionPreference = 'Continue'
$script:stoppen = $false
function Stop-Alles {
  $script:stoppen = $true
  $venster.Close()
}
$knopOpen.add_Click({ Open-Scherm; $venster.WindowState = 'Minimized' })
$knopUit.add_Click({ $venster.Close() })
# Het kruisje of "afsluiten": eerst vragen. Nee = het venster gaat gewoon terug naar de taakbalk.
$venster.add_FormClosing({
  param($s, $e)
  if ($script:stoppen) { return }
  # Windows sluit af of meldt af: niets vragen, gewoon stoppen.
  if ($e.CloseReason -ne [System.Windows.Forms.CloseReason]::UserClosing) {
    $script:stoppen = $true
    if (-not $server.HasExited) { & taskkill.exe /T /F /PID $server.Id | Out-Null }
    return
  }
  $ja = [System.Windows.Forms.MessageBox]::Show($venster, $w.vraag, 'LANcelot', 'YesNo', 'Question')
  if ($ja -ne 'Yes') { $e.Cancel = $true; $venster.WindowState = 'Minimized'; return }
  $script:stoppen = $true
  if (-not $server.HasExited) { & taskkill.exe /T /F /PID $server.Id | Out-Null }
})

$klok = New-Object System.Windows.Forms.Timer
$klok.Interval = 1000
$klok.add_Tick({
  if (-not $server.HasExited) { return }
  $klok.Stop()
  $code = $server.ExitCode
  if ($code -eq 75) {
    # Een update is net geïnstalleerd: LANcelot helemaal opnieuw starten, zodat ook deze knop de nieuwe versie is.
    $env:LANCELOT_BIJGEWERKT = '1'
    Start-Process -FilePath $env:LANCELOT_NODE -ArgumentList 'src\systeemvak.js' -WorkingDirectory $app -WindowStyle Hidden
  } elseif ($code -ne 0) {
    $eigenaar = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false }
    $regels = (Lees-Log) -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -Last 12
    [System.Windows.Forms.MessageBox]::Show($eigenaar, $w.fout + "`n`n" + ($regels -join "`n"), 'LANcelot', 'OK', 'Warning') | Out-Null
  }
  Stop-Alles
})
$klok.Start()
[System.Windows.Forms.Application]::Run($venster)
