param([string]$src, [string]$dst)
Add-Type -AssemblyName System.Web
$lines = [System.IO.File]::ReadAllLines($src, [System.Text.Encoding]::UTF8)
$out = New-Object System.Collections.Generic.List[string]
function Inl([string]$s) {
  $s = [System.Web.HttpUtility]::HtmlEncode($s)
  $s = [regex]::Replace($s, '\*\*(.+?)\*\*', '<b>$1</b>')
  $s = [regex]::Replace($s, '`(.+?)`', '<code>$1</code>')
  return $s
}
$script:lt = $null
function CloseList { if ($script:lt) { $out.Add("</$($script:lt)>"); $script:lt = $null } }
$i = 0
while ($i -lt $lines.Length) {
  $l = $lines[$i]
  if ($l.StartsWith('|')) {
    CloseList
    $rows = @()
    while ($i -lt $lines.Length -and $lines[$i].StartsWith('|')) { $rows += ,($lines[$i].Trim().Trim('|').Split('|') | ForEach-Object { $_.Trim() }); $i++ }
    $h = '<table><tr>'; foreach ($c in $rows[0]) { $h += "<th>$(Inl $c)</th>" }; $out.Add($h + '</tr>')
    for ($r = 2; $r -lt $rows.Count; $r++) { $h = '<tr>'; foreach ($c in $rows[$r]) { $h += "<td>$(Inl $c)</td>" }; $out.Add($h + '</tr>') }
    $out.Add('</table>'); continue
  }
  if ($l -match '^(#+) (.*)') { CloseList; $n = $matches[1].Length; $out.Add("<h$n>$(Inl $matches[2])</h$n>") }
  elseif ($l.StartsWith('> ')) { CloseList; $out.Add("<blockquote>$(Inl $l.Substring(2))</blockquote>") }
  elseif ($l -match '^- (.*)') { if ($script:lt -ne 'ul') { CloseList; $out.Add('<ul>'); $script:lt = 'ul' }; $out.Add("<li>$(Inl $matches[1])</li>") }
  elseif ($l -match '^\d+\. (.*)') { if ($script:lt -ne 'ol') { CloseList; $out.Add('<ol>'); $script:lt = 'ol' }; $out.Add("<li>$(Inl $matches[1])</li>") }
  elseif ($l.Trim() -eq '') { CloseList }
  else { CloseList; $out.Add("<p>$(Inl $l)</p>") }
  $i++
}
CloseList
$css = @'
@page { size: A4; margin: 16mm 14mm; }
body { font-family: 'Microsoft JhengHei', sans-serif; font-size: 10.5pt; line-height: 1.65; color: #222; }
h1 { font-size: 22pt; color: #6a3a10; border-bottom: 3px solid #c89040; padding-bottom: 6px; }
h2 { font-size: 14pt; color: #6a3a10; margin-top: 18px; border-left: 5px solid #c89040; padding-left: 8px; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 6px 0 10px; font-size: 9.5pt; page-break-inside: avoid; }
th { background: #f3e6cc; } th, td { border: 1px solid #c8b490; padding: 4px 6px; text-align: left; vertical-align: top; }
blockquote { background: #faf3e4; border-left: 4px solid #c89040; margin: 8px 0; padding: 6px 10px; color: #555; }
code { background: #f2eee6; padding: 0 3px; font-family: Consolas, monospace; }
li { margin: 2px 0; }
'@
$doc = "<!doctype html><html lang=`"zh-Hant`"><head><meta charset=`"utf-8`"><style>$css</style></head><body>" + ($out -join "`n") + '</body></html>'
[System.IO.File]::WriteAllText($dst, $doc, (New-Object System.Text.UTF8Encoding $false))
