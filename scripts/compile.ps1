# Build standalone report/output/main.tex, then compile -> report/output/main.pdf (MiKTeX)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$pdflatex = "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"
if (-not (Test-Path $pdflatex)) {
    throw "pdflatex not found at $pdflatex"
}

Write-Host "Generating report/output/main.tex ..."
node scripts/build_standalone_tex.mjs

$outDir = Join-Path $root "report\output"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$args = @(
    "-interaction=nonstopmode",
    "-output-directory=$outDir",
    "$outDir\main.tex"
)

& $pdflatex @args | Out-Null
& $pdflatex @args | Out-Null
& $pdflatex @args | Out-Null

$keep = @("main.pdf", "main.tex")
Get-ChildItem $outDir -File | Where-Object { $keep -notcontains $_.Name } | Remove-Item -Force

Write-Host "Built: report\output\main.tex (standalone)"
Write-Host "Built: report\output\main.pdf"
