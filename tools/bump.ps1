# 改版本號：tools\bump.ps1 2.9.3   （會改 index.html 的 <title> 和標題畫面的小字）
param([Parameter(Mandatory = $true)][string]$ver)
$f = Join-Path $PSScriptRoot '..\index.html'
$t = [IO.File]::ReadAllText($f)
$t = $t -replace '<title>夢疑 MOE v[0-9.]+</title>', "<title>夢疑 MOE v$ver</title>" -replace '·　v[0-9.]+</div>', "·　v$ver</div>"
[IO.File]::WriteAllText($f, $t, (New-Object Text.UTF8Encoding $false))
"version -> v$ver  (matches: $((Select-String -Path $f -Pattern ([regex]::Escape("v$ver"))).Count))"
