# 更新載入清單：tools\boot.ps1   （bump.ps1 改完版本號會自動跑這支）
# index.html 裡 <script id="bootList"> 的 f 是「遊戲 js 的載入順序」：新增模組時，把檔名照順序加進去（大小填 0 就好），再跑這支
# 這支會：重新量每個檔案的大小（給進度條用）、把版本號 v 設成 <title> 上的版本（網址加 ?v=，手機才會拿到新檔案）
$f = Join-Path $PSScriptRoot '..\index.html'
$t = [IO.File]::ReadAllText($f)
$ver = [regex]::Match($t, '<title>夢疑 MOE v([0-9.]+)</title>').Groups[1].Value
$m = [regex]::Match($t, '<script id="bootList" type="application/json">(.*?)</script>')
$list = $m.Groups[1].Value | ConvertFrom-Json
$rows = @()
foreach ($e in $list.f) {
  $name = $e[0]; $p = Join-Path $PSScriptRoot "..\js\$name"
  if (-not (Test-Path $p)) { Write-Error "找不到 js\$name"; exit 1 }
  $rows += '["' + $name + '",' + (Get-Item $p).Length + ']'
}
$json = '{"v":"' + $ver + '","f":[' + ($rows -join ',') + ']}'
$t = $t.Substring(0, $m.Groups[1].Index) + $json + $t.Substring($m.Groups[1].Index + $m.Groups[1].Length)
[IO.File]::WriteAllText($f, $t, (New-Object Text.UTF8Encoding $false))
# sw.js 的快取名稱也跟著版本走（舊版的檔案會被清掉）
$sw = Join-Path $PSScriptRoot '..\sw.js'
if (Test-Path $sw) { $s = [IO.File]::ReadAllText($sw) -replace "const VER = '[0-9.]+';", "const VER = '$ver';"; [IO.File]::WriteAllText($sw, $s, (New-Object Text.UTF8Encoding $false)) }
"bootList -> v$ver, $($rows.Count) files, $([math]::Round((($list.f | ForEach-Object { (Get-Item (Join-Path $PSScriptRoot "..\js\$($_[0])")).Length }) | Measure-Object -Sum).Sum / 1MB, 1)) MB"
