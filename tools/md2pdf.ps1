# Markdown 轉 PDF：tools\md2pdf.ps1 D:\POE系統\某文件.md   （PDF 會放在同一個資料夾）
param([Parameter(Mandatory = $true)][string]$md)
$html = Join-Path $env:TEMP ('moe_' + [IO.Path]::GetFileNameWithoutExtension($md) + '.html')
$pdf = [IO.Path]::ChangeExtension($md, '.pdf')
& (Join-Path $PSScriptRoot 'md2html.ps1') -src $md -dst $html
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$prof = Join-Path $env:TEMP ('moe_edge_' + [Guid]::NewGuid().ToString('N'))
$p = Start-Process $edge -ArgumentList '--headless=new', '--disable-gpu', "--user-data-dir=$prof", '--no-pdf-header-footer', "--print-to-pdf=`"$pdf`"", "`"$html`"" -PassThru
$p.WaitForExit(60000) | Out-Null
Get-Item $pdf | Select-Object Name, Length
