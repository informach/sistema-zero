param([ValidateSet('todos','avaliacoes','fixados','como-comecar')][string]$Escopo='todos')
$ErrorActionPreference = 'Stop'
$instagramProduction = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'docs/marketing/kids/comunidade-dos-criadores/instagram/producao'))
$instagramWork = [IO.Path]::GetFullPath((Join-Path (Get-Location) 'output/instagram'))
$instagramArchive = Join-Path $instagramWork ('entregas-anteriores/' + (Get-Date -Format 'yyyyMMdd-HHmmss'))

function Copy-ReviewedPngs([string]$source, [string]$destination, [string]$archiveName) {
    $sourceFull = [IO.Path]::GetFullPath($source)
    $destinationFull = [IO.Path]::GetFullPath($destination)
    $archiveFull = [IO.Path]::GetFullPath((Join-Path $instagramArchive $archiveName))
    if (-not $sourceFull.StartsWith($instagramWork + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Origem fora da pasta de trabalho.' }
    if (-not $destinationFull.StartsWith($instagramProduction + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Destino fora da produção do Instagram.' }
    if (-not $archiveFull.StartsWith($instagramWork + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Arquivo fora da pasta de trabalho.' }
    $sourceFiles = @(Get-ChildItem -LiteralPath $sourceFull -File -Filter '*.png')
    if ($sourceFiles.Count -eq 0) { throw "Sem PNGs em $sourceFull" }
    New-Item -ItemType Directory -Path $destinationFull -Force | Out-Null
    $previousFiles = @(Get-ChildItem -LiteralPath $destinationFull -File -Filter '*.png')
    if ($previousFiles.Count -gt 0) {
        New-Item -ItemType Directory -Path $archiveFull -Force | Out-Null
        foreach ($previousFile in $previousFiles) {
            if ($previousFile.DirectoryName -ne $destinationFull) { throw 'Arquivo fora do destino conferido.' }
            Move-Item -LiteralPath $previousFile.FullName -Destination (Join-Path $archiveFull $previousFile.Name)
        }
    }
    foreach ($sourceFile in $sourceFiles) { Copy-Item -LiteralPath $sourceFile.FullName -Destination (Join-Path $destinationFull $sourceFile.Name) }
    Write-Output "$archiveName : $($sourceFiles.Count) PNGs"
}

$avWork = Join-Path $instagramWork 'avaliacoes/2026-10-09'
$alWork = Join-Path $instagramWork 'alunos/2026-10-09'
$fxWork = Join-Path $instagramWork 'fixados/2026-10-09'
if ($Escopo -notin @('fixados','como-comecar')) {
    Copy-ReviewedPngs (Join-Path $avWork 'finais-beneficios') (Join-Path $instagramProduction 'destaques/avaliacoes') 'avaliacoes'
    foreach ($name in @('publicacao.txt','fontes-dos-relatos.txt')) { Copy-Item -LiteralPath (Join-Path $avWork $name) -Destination (Join-Path $instagramProduction ('destaques/avaliacoes/' + $name)) -Force }
    if ($Escopo -eq 'avaliacoes') { return }
    Copy-ReviewedPngs (Join-Path $alWork 'finais-ampliados') (Join-Path $instagramProduction 'destaques/alunos') 'alunos'
    Copy-ReviewedPngs (Join-Path $alWork 'molduras-ampliadas') (Join-Path $instagramProduction 'destaques/alunos/molduras') 'alunos-molduras'
    Copy-Item -LiteralPath (Join-Path $alWork 'publicacao.txt') -Destination (Join-Path $instagramProduction 'destaques/alunos/publicacao.txt') -Force
}
$fixadosManifest = Get-Content -LiteralPath (Join-Path $fxWork 'manifesto.json') -Raw | ConvertFrom-Json
foreach ($carousel in $fixadosManifest.carousels) {
    if ($Escopo -eq 'como-comecar' -and $carousel.id -ne 'F03') { continue }
    Copy-ReviewedPngs (Join-Path $fxWork ('finais/' + $carousel.slug)) (Join-Path $instagramProduction ('fixados/' + $carousel.slug)) ('fixados-' + $carousel.id)
}
