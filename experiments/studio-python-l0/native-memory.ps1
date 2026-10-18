param([Parameter(Mandatory=$true)][string]$ProcessIds)
$ErrorActionPreference = 'Stop'
if ($ProcessIds -notmatch '^\d+(,\d+)*$') { throw 'Invalid owned process identifiers' }
$rows = foreach ($observedId in $ProcessIds.Split(',')) {
  $processRecord = $null
  try {
    $processRecord = [System.Diagnostics.Process]::GetProcessById([int]$observedId)
    $processRecord.Refresh()
    [pscustomobject]@{
      id = $processRecord.Id
      exited = $false
      privateBytes = $processRecord.PrivateMemorySize64
      workingSetBytes = $processRecord.WorkingSet64
    }
  } catch {
    $reason = $_.Exception.GetBaseException()
    if ($reason -is [System.ArgumentException] -or $reason -is [System.InvalidOperationException]) {
      # Process lifetime can end between the CDP inventory and the OS sample.
      # Report absence explicitly; never invent a zero-valued live process.
      [pscustomobject]@{ id = [int]$observedId; exited = $true }
    } else { throw }
  } finally {
    if ($null -ne $processRecord) { $processRecord.Dispose() }
  }
}
ConvertTo-Json -InputObject @($rows) -Compress
