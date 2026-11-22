# Remet l'interface d'avant la modernisation.
# A lancer depuis le dossier matistore_mobile :
#   powershell -ExecutionPolicy Bypass -File .\sauvegarde-avant-modernisation\restaurer.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backup = $PSScriptRoot

# 1. Chaque fichier sauvegarde (.txt) reprend sa place d'origine.
Get-ChildItem -Path $backup -Recurse -Filter '*.txt' | Where-Object { $_.Name -ne 'NOUVEAUX-FICHIERS.txt' } | ForEach-Object {
  $relative = $_.FullName.Substring($backup.Length + 1)
  $target = Join-Path $root ($relative -replace '\.txt$', '')
  $dir = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Copy-Item -LiteralPath $_.FullName -Destination $target -Force
  Write-Host "remis : $relative"
}

# 2. Les fichiers ajoutes par la modernisation sont supprimes.
Get-Content (Join-Path $backup 'NOUVEAUX-FICHIERS.txt') | Where-Object { $_.Trim() } | ForEach-Object {
  $target = Join-Path $root $_.Trim()
  if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force; Write-Host "supprime : $_" }
}
Write-Host 'Termine. Relancez l application (ou reconstruisez l APK).'
