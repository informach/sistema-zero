# Extends the existing witnessed operator protocol; no launch happens on import.
function Retain-OwnedProcess($Witness, [Diagnostics.Process]$ExistingProcess=$null) {
 $candidate=$ExistingProcess;$ownsProcess=$null -eq $ExistingProcess;$retained=$false
 try {
  if(-not $candidate){$candidate=[Diagnostics.Process]::GetProcessById($Witness.processId)}
  # Pin the kernel process object before validating creation. Never reopen at stop.
  $handle=$candidate.SafeHandle
  if($handle.IsClosed -or $handle.IsInvalid -or $candidate.HasExited -or $candidate.Id -ne $Witness.processId){return $null}
  $createdTicks=$candidate.StartTime.ToUniversalTime().Ticks
  $witnessTicks=([datetimeoffset]$Witness.createdAt).UtcTicks
  # CIM truncates its creation time to microseconds; Process exposes 100ns ticks.
  if(($createdTicks-($createdTicks%10)) -ne ($witnessTicks-($witnessTicks%10))){return $null}
  $retained=$true
  return [pscustomobject]@{process=$candidate;safeHandle=$handle;processId=$candidate.Id;createdTicks=$createdTicks;ownsProcess=$ownsProcess}
 } catch {return $null}
 finally {if(-not $retained -and $ownsProcess -and $candidate){$candidate.Dispose()}}
}

function Retained-OwnedProcessObservation($Record) {
 try {
  if(-not $Record -or $Record.safeHandle.IsClosed -or $Record.safeHandle.IsInvalid){throw 'Retained process handle is unavailable'}
  $Record.process.Refresh()
  $hasExited=$Record.process.HasExited
  if($hasExited -isnot [bool]){throw 'Retained process exit observation is unavailable'}
  if($hasExited){return [pscustomobject]@{state='exited';failureName=$null}}
  if($Record.process.Id -ne $Record.processId -or $Record.process.StartTime.ToUniversalTime().Ticks -ne $Record.createdTicks){throw 'Retained process identity is unconfirmed'}
  return [pscustomobject]@{state='alive';failureName=$null}
 } catch {return [pscustomobject]@{state='unknown';failureName=$_.Exception.GetType().Name}}
}

function Retained-OwnedProcessAlive($Record) {
 if(-not $Record){return $false}
 $observation=Retained-OwnedProcessObservation $Record
 if($observation.state -eq 'unknown'){throw 'Retained process observation is unknown; exit is not confirmed.'}
 return $observation.state -eq 'alive'
}

function Stop-RetainedOwnedProcess($Record) {
 if(-not(Retained-OwnedProcessAlive $Record)){return $false}
 # This exact Process retains its SafeHandle. No PID lookup/check-then-stop gap.
 $Record.process.Kill()
 return $true
}

function Save-OwnedMonitorResult($State, [string]$StateFile) {
 try {Save $State $StateFile}
 catch {
  $State.status='NEG-monitor-persistence'
  if(-not $State.primaryFailure){$State.primaryFailure='monitor-result-persistence-failed'}
  $State.secondaryFailures+=@{phase='result-save';name=$_.Exception.GetType().Name}
  $State.persistenceFallback=Join-Path (Split-Path $StateFile) 'monitor-failure.json'
  try{Write-Durable $State $State.persistenceFallback -Exclusive:(-not(Test-Path -LiteralPath $State.persistenceFallback))}
  catch{[Console]::Error.WriteLine('NEG: monitor result and fallback could not be persisted; inspect owned cleanup.');throw}
 }
}

function Reconcile-RetainedOwnedProcesses($State,$Known,$Retained) {
 $live=@();$exited=@();$unconfirmed=@($Known.Values|Where-Object{-not $Retained.ContainsKey("$($_.processId):$($_.createdAt)")}|ForEach-Object{$_.processId})
 foreach($record in $Retained.Values){
  $observation=Retained-OwnedProcessObservation $record
  if($observation.state -eq 'alive'){$live+= $record.processId}
  elseif($observation.state -eq 'exited'){$exited+= $record.processId}
  elseif($observation.state -eq 'unknown'){
   $unconfirmed+= $record.processId
   $State.secondaryFailures+=@{phase='reconciliation-observation';processId=$record.processId;name=$observation.failureName}
  }
 }
 if($unconfirmed.Count){$State.ownershipComplete=$false;if(-not $State.primaryFailure){$State.primaryFailure='retained-process-exit-unconfirmed'}}
 $State.liveOwned=@($live);$State.provenExitedProcessIds=@($exited);$State.unconfirmedProcessIds=@($unconfirmed|Select-Object -Unique)
 $State.cleanupConfirmed=$State.ownershipComplete -and -not $live.Count -and -not $unconfirmed.Count
}

function Capture-OwnedTree($Root, $Known, $Retained=$null) {
 foreach($parent in @($Known.Values)) {
  $current=Process-Witness $parent.processId
  if(-not(Same-Witness $parent $current)){
   $record=if($null -ne $Retained){$Retained["$($parent.processId):$($parent.createdAt)"]}else{$null}
   if(Retained-OwnedProcessAlive $record){throw 'Live retained parent has no matching CIM witness; descendant discovery unconfirmed.'}
   continue
  }
  foreach($child in @(Get-CimInstance Win32_Process -Filter "ParentProcessId=$($parent.processId)" -ErrorAction Stop)) {
   $w=Process-Witness $child.ProcessId
   if($w -and [datetimeoffset]$w.createdAt -ge [datetimeoffset]$parent.createdAt) {
    $key="$($w.processId):$($w.createdAt)"
    if(-not $Known.ContainsKey($key)){
     $Known[$key]=$w
     if($null -ne $Retained){$record=Retain-OwnedProcess $w;if($record){$Retained[$key]=$record}}
    }
   }
  }
 }
}

function Watch-OwnedBrowser($Process, $State, [string]$StateFile, $Job, [datetimeoffset]$SoftDeadline, [datetimeoffset]$HardDeadline) {
 $known=@{};$known["$($State.root.processId):$($State.root.createdAt)"]=$State.root
 $retained=@{};$rootRecord=$null
 $stopRequested=$false;$complete=$null;$acknowledged=$false;$earlyExit=$false;$completionStableRounds=0
 $State|Add-Member -NotePropertyMembers @{hardDeadline=$HardDeadline.ToString('o');softDeadline=$SoftDeadline.ToString('o');maxSampledTreeWorkingSetMiB=0;maxSampledTreePrivateMiB=0;primaryFailure=$null;secondaryFailures=@();processExitCode=$null;scenarioExitCode=$null;liveOwned=@();completedAt=$null;retainedHandleCount=0;descendantHandlesReleased=$false;monitorFailureName=$null;ownershipComplete=$true;cleanupConfirmed=$false;provenExitedProcessIds=@();unconfirmedProcessIds=@();persistenceFallback=$null} -Force
 try {
 $rootRecord=Retain-OwnedProcess $State.root $Process
 if(-not $rootRecord){throw 'Cannot retain the witnessed root process object'}
 $retained["$($State.root.processId):$($State.root.createdAt)"]=$rootRecord
 # The adapter verifies the original state SHA before accepting the claim.
 # Do not rewrite that state until it has durably acknowledged the claim.
 while(-not(Test-Path -LiteralPath $Job.claimReceipt) -and (Same-Witness $State.root (Process-Witness $State.root.processId)) -and [datetimeoffset]::UtcNow -lt $HardDeadline){Start-Sleep -Milliseconds 25}
 while($true) {
  # Repeat discovery until every newly found parent has been visited this round.
  do{$before=$known.Count;Capture-OwnedTree $State.root $known $retained}while($known.Count -gt $before)
  $State.retainedHandleCount=$retained.Count
  $live=[Collections.Generic.List[object]]::new();$working=0.0;$private=0.0
  foreach($w in @($known.Values)) {
   $record=$retained["$($w.processId):$($w.createdAt)"]
   if(-not $record){
    if(Same-Witness $w (Process-Witness $w.processId)){$live.Add($w);$State.ownershipComplete=$false;if(-not $State.primaryFailure){$State.primaryFailure='live-descendant-handle-unavailable; refuse PID-only stop'}}
    continue
   }
   if(-not(Retained-OwnedProcessAlive $record)){continue}
   $live.Add($w)
   $metrics=$record.process
   if($metrics){$working+=$metrics.WorkingSet64/1MB;$private+=$metrics.PrivateMemorySize64/1MB}
  }
  $State.maxSampledTreeWorkingSetMiB=[math]::Max($State.maxSampledTreeWorkingSetMiB,[math]::Round($working,2))
  $State.maxSampledTreePrivateMiB=[math]::Max($State.maxSampledTreePrivateMiB,[math]::Round($private,2))
  $State.observedTree=@($known.Values|ForEach-Object{[pscustomobject]@{processId=$_.processId;parentId=$_.parentId;createdAt=$_.createdAt;executable=$_.executable;cliSha256=$_.cliSha256}})
  $State.liveOwned=@($live|ForEach-Object{$_.processId})
  if(-not $complete -and (Test-Path -LiteralPath $Job.runComplete)) {
   $complete=Get-Content -LiteralPath $Job.runComplete -Raw|ConvertFrom-Json -DateKind String
   if($complete.pid -ne $State.root.processId -or $complete.nonce -cne $Job.nonce){throw 'Completion identity mismatch'}
   $State.scenarioExitCode=[int]$complete.exitCode
  }
  $rootAlive=Retained-OwnedProcessAlive $rootRecord
  if(-not $rootAlive -and -not $acknowledged) {
   if(-not $earlyExit){$HardDeadline=[datetimeoffset]::MinValue.AddTicks([math]::Min($HardDeadline.Ticks,[datetimeoffset]::UtcNow.AddSeconds(30).Ticks))}
   $earlyExit=$true
   if(-not $State.primaryFailure){$State.primaryFailure='root-exited-before-completion-ack; descendant completeness unconfirmed'}
  }
  # A private Windows console host can only exit after its owning runner exits.
  # Keep it in the witnessed tree and final reconciliation, but do not deadlock
  # completion acknowledgement on that root-bound platform helper.
  $consoleHost=Join-Path ([Environment]::GetFolderPath('System')) 'conhost.exe'
  $children=@($live|Where-Object{ $_.processId -ne $State.root.processId -and -not($_.parentId -eq $State.root.processId -and [string]::Equals($_.executable,$consoleHost,[StringComparison]::OrdinalIgnoreCase)) })
  if($complete -and $rootAlive -and -not $children.Count){$completionStableRounds++}else{$completionStableRounds=0}
  if($completionStableRounds -ge 2 -and -not $acknowledged) {
   # The adapter polls the final name before parsing: never expose partial JSON.
   $pendingAck=$Job.completionAck+'.pending'
   Write-Durable @{pid=$State.root.processId;nonce=$Job.nonce;at=[datetimeoffset]::UtcNow.ToString('o')} $pendingAck -Exclusive
   [IO.File]::Move($pendingAck,$Job.completionAck,$false)
   $acknowledged=$true
  }
  $Process.Refresh()
  if($Process.HasExited){$State.processExitCode=$Process.ExitCode}
  if(-not $live.Count) {break}
  $now=[datetimeoffset]::UtcNow
  if(($now -ge $SoftDeadline -or $earlyExit) -and -not $stopRequested) {
   if(-not $State.primaryFailure){$State.primaryFailure='external-browser-deadline'}
   if($rootAlive -and -not(Test-Path -LiteralPath $Job.stopRequest)){Write-Durable @{requestedAt=$now.ToString('o')} $Job.stopRequest -Exclusive}
   $stopRequested=$true
  }
  if($now -ge $HardDeadline) {
   if(-not $State.primaryFailure){$State.primaryFailure='external-browser-hard-deadline'}
   # Only identities captured below this exact witnessed root are eligible.
   # Forced cleanup is always NEG, even if every process exits afterward.
   foreach($w in @($live|Sort-Object createdAt -Descending)) {
    $record=$retained["$($w.processId):$($w.createdAt)"]
    try{if(Stop-RetainedOwnedProcess $record){$State.forced=$true}}
    catch{$State.ownershipComplete=$false;$State.secondaryFailures+=@{processId=$w.processId;name=$_.Exception.GetType().Name}}
   }
   break
  }
  $State.status='monitoring-owned-browser-tree';Save $State $StateFile
  Start-Sleep -Milliseconds 100
 }
 Reconcile-RetainedOwnedProcesses $State $known $retained
 $Process.Refresh()
 if($Process.HasExited){$State.processExitCode=$Process.ExitCode}
 $State.completedAt=[datetimeoffset]::UtcNow.ToString('o')
 $State.status=if(-not $State.ownershipComplete -or $State.unconfirmedProcessIds.Count){'NEG-owned-cleanup-unconfirmed'}elseif($State.liveOwned.Count){'NEG-live-owned-residuals'}elseif($earlyExit -or $State.forced -or $State.primaryFailure){'NEG-abrupt-or-deadline-cleanup'}elseif(-not $acknowledged -or $State.scenarioExitCode -ne 0 -or $State.processExitCode -ne 0){'NEG-scenario-or-exit'}else{'completed-owned-tree-exited'}
 } catch {
  $State.monitorFailureName=$_.Exception.GetType().Name
  if(-not $State.primaryFailure){$State.primaryFailure='owned-browser-monitor-failed'}
  $State.status='NEG-monitor-failure';$State.ownershipComplete=$false
  # Persist NEG before attempting cleanup. A broken state path must not bypass it.
  try{Save-OwnedMonitorResult $State $StateFile}catch{$State.secondaryFailures+=@{phase='failure-save';name=$_.Exception.GetType().Name}}
  try{if(Retained-OwnedProcessAlive $rootRecord){if(-not(Test-Path -LiteralPath $Job.stopRequest)){Write-Durable @{requestedAt=[datetimeoffset]::UtcNow.ToString('o');reason='monitor-failure'} $Job.stopRequest -Exclusive}}}catch{$State.secondaryFailures+=@{phase='stop-request';name=$_.Exception.GetType().Name}}
  # Discovery may have failed, so act only on kernel objects already retained.
  foreach($record in @($retained.Values|Sort-Object createdTicks -Descending)){
   try{if(Stop-RetainedOwnedProcess $record){$State.forced=$true}}catch{$State.secondaryFailures+=@{phase='failure-cleanup';processId=$record.processId;name=$_.Exception.GetType().Name}}
  }
  Reconcile-RetainedOwnedProcesses $State $known $retained
  $State.observedTree=@($known.Values|ForEach-Object{[pscustomobject]@{processId=$_.processId;parentId=$_.parentId;createdAt=$_.createdAt;executable=$_.executable;cliSha256=$_.cliSha256}})
  try{$Process.Refresh();if($Process.HasExited){$State.processExitCode=$Process.ExitCode}}catch{$State.secondaryFailures+=@{phase='root-exit-observation';name=$_.Exception.GetType().Name};$State.unconfirmedProcessIds=@($State.unconfirmedProcessIds+$State.root.processId|Select-Object -Unique);$State.cleanupConfirmed=$false}
  $State.retainedHandleCount=$retained.Count
  $State.completedAt=[datetimeoffset]::UtcNow.ToString('o')
 } finally {
  foreach($record in $retained.Values){if($record.ownsProcess){$record.process.Dispose()}}
  $State.descendantHandlesReleased=$true
 }
 Save-OwnedMonitorResult $State $StateFile
 return $State
}
