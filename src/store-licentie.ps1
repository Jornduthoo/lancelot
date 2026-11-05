# Vraagt aan Windows de licentie van LANcelot uit de Microsoft Store (alleen in de Store-versie, zie src/store.js).
# Geeft een regel JSON terug: { "active": true, "trial": true, "expires": "2026-12-05T10:00:00.0000000+00:00" }.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Services.Store.StoreContext, Windows.Services.Store, ContentType = WindowsRuntime]
$null = [Windows.Services.Store.StoreAppLicense, Windows.Services.Store, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1
$ctx = [Windows.Services.Store.StoreContext]::GetDefault()
$taak = $asTask.MakeGenericMethod([Windows.Services.Store.StoreAppLicense]).Invoke($null, @($ctx.GetAppLicenseAsync()))
if (-not $taak.Wait(20000)) { exit 2 }
$l = $taak.Result
[pscustomobject]@{
  active  = [bool]$l.IsActive
  trial   = [bool]$l.IsTrial
  expires = $l.ExpirationDate.ToString('o')
  sku     = [string]$l.SkuStoreId
} | ConvertTo-Json -Compress
