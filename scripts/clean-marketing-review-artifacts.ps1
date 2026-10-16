#requires -Version 5.1
<#
Limpeza pontual autorizada em 16/10/2026.
Sem -Execute: apenas confere e apresenta os tres artefatos.
Com -Execute: remove somente os caminhos fixados abaixo.
Nao para processos, nao limpa bancos e nao segue junctions/symlinks.
#>
[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param([switch]$Execute)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$approvedWorkspace = 'C:\Users\tocha\projects\sistema-zero-marketing'
$workspace = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot)).TrimEnd('\')
if (-not $workspace.Equals($approvedWorkspace, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Este script so pode limpar o worktree autorizado: $approvedWorkspace"
}

$targets = @(
    [PSCustomObject]@{
        Relative = 'packages\marketing-app\.next'
        Kind = 'Directory'
        Description = 'Build local inativo do marketing-app'
    },
    [PSCustomObject]@{
        Relative = '.cache\web-review-cb25a5e4-2647-4320-8726-266d337ec03f\.next'
        Kind = 'Directory'
        Description = 'Cache da instancia antiga de revisao web'
    },
    [PSCustomObject]@{
        Relative = '.cache\pg16-native-review\postgresql-16.15-5.zip'
        Kind = 'File'
        Description = 'ZIP de instalacao do PostgreSQL ja extraido'
    }
)

function Assert-NoRedirect([string]$Location) {
    $current = $Location
    while ($true) {
        $item = Get-Item -LiteralPath $current -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
            throw "Caminho redirecionado; nada sera removido: $current"
        }
        if ($current.Equals($workspace, [StringComparison]::OrdinalIgnoreCase)) { break }
        $current = Split-Path -Parent $current
        if (-not $current) { throw 'O caminho saiu do workspace autorizado' }
    }
}

function Get-CheckedEntries([IO.FileSystemInfo]$Item) {
    $Item
    if ($Item -is [IO.FileInfo]) { return }
    $directories = New-Object 'System.Collections.Generic.Stack[string]'
    $directories.Push($Item.FullName)
    while ($directories.Count -gt 0) {
        foreach ($entry in Get-ChildItem -LiteralPath $directories.Pop() -Force) {
            if ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) {
                if ($entry.LinkType -notin @('Junction', 'SymbolicLink')) {
                    throw "Redirecionamento desconhecido no cache; nada sera removido: $($entry.FullName)"
                }
                # Inclui somente o link no plano. Nunca enumera seu destino.
                $entry
                continue
            }
            $entry
            if ($entry.PSIsContainer) { $directories.Push($entry.FullName) }
        }
    }
}

$installedPostgres = Join-Path $workspace '.cache\pg16-native-review\runtime\pgsql\bin\postgres.exe'
if (-not (Test-Path -LiteralPath $installedPostgres -PathType Leaf)) {
    throw 'PostgreSQL extraido nao encontrado. O ZIP sera preservado.'
}

# Todas as verificacoes terminam antes da primeira exclusao.
$processes = @(Get-CimInstance Win32_Process)
$plan = @()
foreach ($target in $targets) {
    $absolute = [IO.Path]::GetFullPath((Join-Path $workspace $target.Relative))
    if (-not $absolute.StartsWith($workspace + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw "Caminho fora do workspace: $absolute"
    }
    if (-not (Test-Path -LiteralPath $absolute)) {
        Write-Host "Ja ausente: $($target.Relative)"
        continue
    }
    Assert-NoRedirect $absolute
    $item = Get-Item -LiteralPath $absolute -Force
    if (($target.Kind -eq 'Directory') -ne [bool]$item.PSIsContainer) {
        throw "Tipo de artefato inesperado: $absolute"
    }
    foreach ($process in $processes) {
        if ($process.ProcessId -eq $PID -or -not $process.CommandLine) { continue }
        if ($process.CommandLine.IndexOf($absolute, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
            throw "Um processo ainda referencia o artefato (PID $($process.ProcessId)). Nada sera removido."
        }
    }
    $entries = @(Get-CheckedEntries $item)
    $files = @($entries | Where-Object {
        -not $_.PSIsContainer -and -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint)
    })
    $links = @($entries | Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint })
    foreach ($child in $entries) {
        if ($child.FullName -ne $absolute -and
            -not $child.FullName.StartsWith($absolute + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw "Entrada fora do artefato autorizado: $($child.FullName)"
        }
    }
    [long]$bytes = 0
    foreach ($file in $files) {
        $bytes += $file.Length
        # Recusa arquivo aberto por outro processo, inclusive bancos/servidores inesperados.
        $handle = $null
        try {
            $handle = [IO.File]::Open($file.FullName, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
        } catch {
            throw "Arquivo em uso ou sem acesso; nada sera removido: $($file.FullName)"
        } finally {
            if ($null -ne $handle) { $handle.Dispose() }
        }
    }
    $plan += [PSCustomObject]@{
        Path = $absolute
        Description = $target.Description
        Bytes = $bytes
        MiB = [Math]::Round($bytes / 1MB, 1)
        Links = $links.Count
        Entries = $entries
    }
}

if ($plan.Count -eq 0) {
    Write-Host 'Os tres artefatos ja estao ausentes. Nenhuma acao necessaria.'
    return
}
$plan | Select-Object Description, MiB, Links, Path | Format-Table -AutoSize -Wrap
Write-Host 'Links internos serao removidos sem acessar nem apagar seus destinos.'
$total = ($plan | Measure-Object -Property Bytes -Sum).Sum
Write-Host ('Total previsto: {0:N2} GiB.' -f ($total / 1GB))
if (-not $Execute) {
    Write-Host 'Conferencia concluida. Nada foi apagado. Use -Execute para realizar a limpeza.'
    return
}

[long]$removed = 0
foreach ($entry in $plan) {
    if ($PSCmdlet.ShouldProcess($entry.Path, 'Apagar artefato regeneravel autorizado')) {
        Assert-NoRedirect $entry.Path
        # A enumeracao coloca cada pai antes dos filhos. Inverte para excluir
        # primeiro os filhos, sem nenhuma exclusao recursiva implicita.
        $orderedEntries = @($entry.Entries)
        [Array]::Reverse($orderedEntries)
        foreach ($child in $orderedEntries) {
            Assert-NoRedirect (Split-Path -Parent $child.FullName)
            $current = Get-Item -LiteralPath $child.FullName -Force
            $wasLink = [bool]($child.Attributes -band [IO.FileAttributes]::ReparsePoint)
            $isLink = [bool]($current.Attributes -band [IO.FileAttributes]::ReparsePoint)
            if ($wasLink -ne $isLink -or $child.PSIsContainer -ne $current.PSIsContainer) {
                throw "Artefato alterado durante a limpeza; exclusao interrompida: $($child.FullName)"
            }
            if ($current.PSIsContainer) {
                # Directory.Delete(false) remove so o link ou diretorio vazio.
                # https://learn.microsoft.com/dotnet/api/system.io.directory.delete
                [IO.Directory]::Delete($current.FullName, $false)
            } else {
                Remove-Item -LiteralPath $current.FullName -Force -Confirm:$false
            }
        }
        $removed += $entry.Bytes
        Write-Host "Apagado: $($entry.Path)"
    }
}
$drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($workspace))
Write-Host ('Limpeza concluida: {0:N2} GiB removidos; {1:N2} GiB livres em {2}.' -f ($removed / 1GB), ($drive.AvailableFreeSpace / 1GB), $drive.Name)
if ($drive.AvailableFreeSpace -lt 2GB) {
    Write-Warning 'O disco ainda esta abaixo da reserva de 2 GiB do app. Nenhum caminho adicional sera apagado.'
}
