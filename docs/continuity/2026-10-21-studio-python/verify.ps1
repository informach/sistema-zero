$ErrorActionPreference = 'Stop'
$archiveRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$inventory = Get-Content -LiteralPath (Join-Path $archiveRoot 'inventory.json') -Raw | ConvertFrom-Json
$checked = 0
foreach ($entry in $inventory.files) {
    if ($entry.storage -ne 'git-snapshot') { continue }
    if ([string]::IsNullOrWhiteSpace($entry.archivePath) -or [System.IO.Path]::IsPathRooted($entry.archivePath)) { throw 'Caminho de snapshot invalido' }
    $candidate = [System.IO.Path]::GetFullPath((Join-Path $archiveRoot $entry.archivePath))
    $prefix = $archiveRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $candidate.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Caminho fora do acervo' }
    $item = Get-Item -LiteralPath $candidate
    if ($item.PSIsContainer -or $item.Length -ne $entry.bytes) { throw ('Tamanho divergente: ' + $entry.archivePath) }
    $actual = (Get-FileHash -LiteralPath $candidate -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $entry.sha256) { throw ('SHA-256 divergente: ' + $entry.archivePath) }
    $checked++
}
Write-Output ('Integridade conferida: ' + $checked + ' snapshots versionados. Nenhum teste, servico ou deploy iniciado.')
