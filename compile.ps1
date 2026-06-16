# Build standalone output/main.tex, then compile -> output/main.pdf (MiKTeX)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$pdflatex = "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64\pdflatex.exe"
if (-not (Test-Path $pdflatex)) {
    throw "pdflatex not found at $pdflatex"
}

Write-Host "Generating standalone output/main.tex ..."
node build_standalone_tex.mjs

New-Item -ItemType Directory -Path "output" -Force | Out-Null

$args = @(
    "-interaction=nonstopmode",
    "-output-directory=output",
    "output/main.tex"
)

& $pdflatex @args | Out-Null
& $pdflatex @args | Out-Null
& $pdflatex @args | Out-Null

# Remove LaTeX auxiliary files; keep tex + pdf
$keep = @("main.pdf", "main.tex")
Get-ChildItem "output" -File | Where-Object { $keep -notcontains $_.Name } | Remove-Item -Force

Write-Host "Built: output\main.tex (standalone)"
Write-Host "Built: output\main.pdf"
