# Extends the existing witnessed operator protocol; no launch happens on import.
. (Join-Path $PSScriptRoot 'python-lesson-memory-watch.ps1')
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

function ConvertTo-OwnedTreeWitness($Row,$Known,$Retained,[ValidateSet('parent','child')][string]$Phase,[bool]$HasSnapshotChildren=$false) {
 if(-not $Row){return $null}
 $missingExecutable=-not $Row.ExecutablePath;$missingCommand=-not $Row.CommandLine
 if(-not $missingExecutable -and -not $missingCommand){return ConvertTo-OwnedProcessWitness $Row}
 # A dying CIM row may lose metadata. Only the already-retained SAME identity,
 # proven exited, can be skipped. No lookup, retry or incomplete new ownership.
 $processId=0;$knownIdentity=$false;$recordMatches=$false;$record=$null
 $integerTypes=@('Byte','SByte','Int16','UInt16','Int32','UInt32','Int64','UInt64')
 if($null -ne $Row.ProcessId -and [Type]::GetTypeCode($Row.ProcessId.GetType()).ToString() -cin $integerTypes -and $Row.ProcessId -gt 0 -and $Row.ProcessId -le [int]::MaxValue){$processId=[int]$Row.ProcessId}
 try{
  if($processId -gt 0 -and $Row.CreationDate -is [datetime] -and $null -ne $Row.ParentProcessId -and [Type]::GetTypeCode($Row.ParentProcessId.GetType()).ToString() -cin $integerTypes -and $Row.ParentProcessId -ge 0 -and $Row.ParentProcessId -le [int]::MaxValue){
   $createdAt=$Row.CreationDate.ToUniversalTime().ToString('o');$key="$($processId):$createdAt"
   if($Known.ContainsKey($key)){
    $w=$Known[$key]
    $knownIdentity=$w.processId -eq $processId -and $w.createdAt -ceq $createdAt -and $w.parentId -eq $Row.ParentProcessId -and ($missingExecutable -or $w.executable -eq $Row.ExecutablePath) -and ($missingCommand -or $w.cli -ceq $Row.CommandLine)
    if($knownIdentity -and $null -ne $Retained){
     $record=$Retained[$key];$ticks=([datetimeoffset]$w.createdAt).UtcTicks
     $recordMatches=$null -ne $record -and $record.processId -eq $processId -and $record.createdTicks -is [long] -and ($record.createdTicks-($record.createdTicks%10)) -eq ($ticks-($ticks%10)) -and $record.process.Id -eq $processId
    }
   }
  }
 }catch{$recordMatches=$false}
 $exitedParentWithChildren=$false
 if($recordMatches -and (Retained-OwnedProcessObservation $record).state -ceq 'exited'){
  if($Phase -ceq 'parent' -and $HasSnapshotChildren){$exitedParentWithChildren=$true}else{return $null}
 }
 # Skipping that parent would also skip children already present in this
 # snapshot. Do not infer their lifetime/ownership through an exited identity.
 $message=if($exitedParentWithChildren){'Exited parent has snapshot children; discovery unconfirmed.'}else{'Incomplete owned tree witness'}
 $failure=[InvalidOperationException]::new($message)
 $failure.Data['lessonTreePhase']=$Phase;$failure.Data['lessonTreeProcessId']=$processId;$failure.Data['lessonTreeKnownIdentity']=[bool]$knownIdentity
 $failure.Data['lessonTreeMissingExecutable']=[bool]$missingExecutable;$failure.Data['lessonTreeMissingCommand']=[bool]$missingCommand
 throw $failure
}

function Capture-OwnedTree($Root, $Known, $Retained=$null, $Snapshot=$null) {
 if($null -eq $Snapshot){$Snapshot=Get-OwnedProcessSnapshot}
 $queue=[Collections.Generic.List[object]]::new();foreach($w in @($Known.Values)){$queue.Add($w)}
 # One observation, visited breadth first; new grandchildren are handled in this
 # same pass. Never retain this snapshot across monitoring rounds.
 for($index=0;$index -lt $queue.Count;$index++) {
  $parent=$queue[$index];$children=$Snapshot.children[[int]$parent.processId]
  $hasChildren=$null -ne $children -and @($children).Count -gt 0
  $rawParent=$Snapshot.rows[[int]$parent.processId]
  $current=ConvertTo-OwnedTreeWitness $rawParent $Known $Retained 'parent' $hasChildren
  if(-not(Same-Witness $parent $current)){
   $record=if($null -ne $Retained){$Retained["$($parent.processId):$($parent.createdAt)"]}else{$null}
   if(Retained-OwnedProcessAlive $record){throw 'Live retained parent has no matching CIM witness; descendant discovery unconfirmed.'}
   if($null -eq $rawParent -and $hasChildren){
    # An absent exited parent cannot justify skipping children already observed.
    # A missing record is unknown, not an exit; both cases remain NEG.
    $message=if($record){'Exited parent has snapshot children; discovery unconfirmed.'}else{'Incomplete owned tree witness'}
    $failure=[InvalidOperationException]::new($message)
    $failure.Data['lessonTreePhase']='parent';$failure.Data['lessonTreeProcessId']=[int]$parent.processId;$failure.Data['lessonTreeKnownIdentity']=$false
    $failure.Data['lessonTreeMissingExecutable']=$true;$failure.Data['lessonTreeMissingCommand']=$true
    throw $failure
   }
   continue
  }
  foreach($child in @($children)) {
   $w=ConvertTo-OwnedTreeWitness $child $Known $Retained 'child'
   if($w -and [datetimeoffset]$w.createdAt -ge [datetimeoffset]$parent.createdAt) {
    $key="$($w.processId):$($w.createdAt)"
    if(-not $Known.ContainsKey($key)){
     $Known[$key]=$w
     $queue.Add($w)
     if($null -ne $Retained){$record=Retain-OwnedProcess $w;if($record){$Retained[$key]=$record}}
    }
   }
  }
 }
}

function Get-LessonMonitorFailureDiagnostic([Management.Automation.ErrorRecord]$ErrorRecord) {
 # Closed diagnostic projection only. Never persist Message, stack, invocation
 # text or full script paths, which may include private inputs.
 $leaf=[IO.Path]::GetFileName([string]$ErrorRecord.InvocationInfo.ScriptName)
 $allowed=@('python-lesson-process-ownership.ps1','python-lesson-browser-watch.ps1','python-lesson-memory-watch.ps1')
 $line=$ErrorRecord.InvocationInfo.ScriptLineNumber
 if($leaf -cnotin $allowed -or $line -isnot [int] -or $line -le 0){$leaf='unknown';$line=0}
 $codes=@{
  'No complete process witness; refuse ownership inference.'='process-witness-incomplete'
  'Duplicate PID in process observation'='process-snapshot-duplicate-pid'
  'Live retained parent has no matching CIM witness; descendant discovery unconfirmed.'='live-parent-witness-mismatch'
  'Retained process observation is unknown; exit is not confirmed.'='retained-process-observation-unknown'
  'Own memory root witness changed'='memory-root-witness-mismatch'
  'Own memory root handle unavailable'='memory-root-handle-unavailable'
  'Own memory descendant handle unavailable'='memory-descendant-handle-unavailable'
  'Completion identity mismatch'='completion-identity-mismatch'
  'Incomplete owned tree witness'='tree-witness-incomplete'
  'Exited parent has snapshot children; discovery unconfirmed.'='exited-parent-descendants-unconfirmed'
 }
 $code=if($leaf -cne 'unknown' -and $codes.ContainsKey($ErrorRecord.Exception.Message)){$codes[$ErrorRecord.Exception.Message]}else{'unknown'}
 $witness=$null;$data=$ErrorRecord.Exception.Data
 if($leaf -ceq 'python-lesson-browser-watch.ps1' -and $code -cin @('tree-witness-incomplete','exited-parent-descendants-unconfirmed') -and $data['lessonTreePhase'] -cin @('parent','child') -and $data['lessonTreeProcessId'] -is [int] -and $data['lessonTreeProcessId'] -ge 0 -and $data['lessonTreeKnownIdentity'] -is [bool] -and $data['lessonTreeMissingExecutable'] -is [bool] -and $data['lessonTreeMissingCommand'] -is [bool]){
  $witness=[pscustomobject]@{phase=$data['lessonTreePhase'];processId=$data['lessonTreeProcessId'];knownIdentity=$data['lessonTreeKnownIdentity'];missingExecutable=$data['lessonTreeMissingExecutable'];missingCommand=$data['lessonTreeMissingCommand']}
 }
 return [pscustomobject]@{source=$leaf;line=$line;code=$code;witness=$witness}
}

function Watch-OwnedBrowser($Process, $State, [string]$StateFile, $Job, [datetimeoffset]$SoftDeadline, [datetimeoffset]$HardDeadline, $PreparedCompactContext=$null) {
 $known=@{};$known["$($State.root.processId):$($State.root.createdAt)"]=$State.root
 $retained=@{};$rootRecord=$null
 $stopRequested=$false;$complete=$null;$acknowledged=$false;$earlyExit=$false;$completionStableRounds=0
 $compactContext=$null;$compactNegative=$false
 $State|Add-Member -NotePropertyMembers @{hardDeadline=$HardDeadline.ToString('o');softDeadline=$SoftDeadline.ToString('o');maxSampledTreeWorkingSetMiB=0;maxSampledTreePrivateMiB=0;primaryFailure=$null;secondaryFailures=@();processExitCode=$null;scenarioExitCode=$null;liveOwned=@();completedAt=$null;retainedHandleCount=0;descendantHandlesReleased=$false;monitorFailureName=$null;monitorFailureSource=$null;monitorFailureLine=$null;monitorFailureCode=$null;monitorFailureWitness=$null;ownershipComplete=$true;cleanupConfirmed=$false;provenExitedProcessIds=@();unconfirmedProcessIds=@();persistenceFallback=$null;compactMemoryObservation=$null;compactMemoryReasons=@()} -Force
 try {
 $rootRecord=Retain-OwnedProcess $State.root $Process
 if(-not $rootRecord){throw 'Cannot retain the witnessed root process object'}
 $retained["$($State.root.processId):$($State.root.createdAt)"]=$rootRecord
 if($Job.compactMemory){
  $inputMemory=$Job.compactMemory
  $memoryProfile=if($inputMemory.profileId){$inputMemory.profileId}else{'lessons-desktop-compact-r2'}
  $compactContext=if($null -ne $PreparedCompactContext){$PreparedCompactContext}else{New-LessonCompactMonitor $inputMemory.next $inputMemory.nextStateFile $inputMemory.baseRoots $memoryProfile}
  if($compactContext.profileId -cne $memoryProfile -or $compactContext.nextStateFile -cne $inputMemory.nextStateFile -or -not(Same-Witness $compactContext.next.root $inputMemory.next.root)){throw 'Prepared compact context belongs to another Next'}
  if($inputMemory.baselineBaseMiB -isnot [ValueType] -or $inputMemory.baselineBaseMiB -lt 0 -or [double]::IsInfinity([double]$inputMemory.baselineBaseMiB) -or [double]::IsNaN([double]$inputMemory.baselineBaseMiB)){throw 'Invalid original retained-base observation'}
  $compactContext.baselineBaseMiB=[double]$inputMemory.baselineBaseMiB
  $Process.Refresh();$observation=Get-LessonCompactObservation $compactContext ($Process.WorkingSet64/1MB)
  $decision=Test-LessonCompactSample $observation $compactContext.profileId
  if($decision.negative){throw 'Compact preclaim memory negative'}
  # Transfer supervision before importing the scenario. The file lock prevents a
  # warmup negative from stopping Next while this owner publishes the browser claim.
  Invoke-LessonCompactLock $compactContext.directory {
   if(Test-Path -LiteralPath $compactContext.next.stopRequest){throw 'Next already stopping normally'}
   $warmup=Get-Content -LiteralPath (Join-Path $compactContext.directory 'compact-memory.json') -Raw|ConvertFrom-Json -DateKind String
   if($warmup.profileId -cne $compactContext.profileId -or $warmup.negative -ne $false){throw 'Compact warmup latched a negative observation'}
   if(-not(Retained-OwnedProcessAlive $rootRecord)){throw 'Browser adapter exited before supervision handoff'}
   Write-Durable @{profileId=$compactContext.profileId;nextRoot=$compactContext.next.root;browserRoot=$State.root} (Join-Path $compactContext.directory 'compact-memory-handoff.json') -Exclusive
   [IO.File]::Move((Join-Path (Split-Path $StateFile) 'owner.claim.pending.json'),$Job.claimFile,$false)
  }
 }
 # The adapter verifies the original state SHA before accepting the claim.
 # Do not rewrite that state until it has durably acknowledged the claim.
 while(-not(Test-Path -LiteralPath $Job.claimReceipt) -and (Retained-OwnedProcessAlive $rootRecord) -and [datetimeoffset]::UtcNow -lt $HardDeadline){
  if($compactContext -and ([datetimeoffset]::UtcNow-$compactContext.lastSampleAt).TotalMilliseconds -ge 500){
   $observation=Get-LessonCompactObservation $compactContext ($Process.WorkingSet64/1MB)
   if((Test-LessonCompactSample $observation $compactContext.profileId).negative){throw 'Compact claim-wait memory negative'}
  }
  Start-Sleep -Milliseconds 25
 }
 while($true) {
  # Repeat discovery until every newly found parent has been visited this round.
  $snapshot=Get-OwnedProcessSnapshot
  Capture-OwnedTree $State.root $known $retained $snapshot
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
  if($compactContext -and ([datetimeoffset]::UtcNow-$compactContext.lastSampleAt).TotalMilliseconds -ge 500){
   $observation=Get-LessonCompactObservation $compactContext $working $snapshot
   $decision=Test-LessonCompactSample $observation $compactContext.profileId
   $State.compactMemoryObservation=$observation;$State.compactMemoryReasons=$decision.reasons
   if($decision.negative -and -not $compactNegative){
    $compactNegative=$true
    if(-not $State.primaryFailure){$State.primaryFailure='compact-memory-budget-negative'}
    Request-LessonNormalStop $Job.stopRequest;$stopRequested=$true
    $HardDeadline=[datetimeoffset]::MinValue.AddTicks([math]::Min($HardDeadline.Ticks,[datetimeoffset]::UtcNow.AddSeconds(30).Ticks))
   }
  }
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
   foreach($w in @($live|Sort-Object createdAt -Descending|Where-Object{-not $Job.compactMemory})) {
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
  $originalMonitorError=$_
  $diagnostic=Get-LessonMonitorFailureDiagnostic $originalMonitorError
  $State.monitorFailureSource=$diagnostic.source;$State.monitorFailureLine=$diagnostic.line;$State.monitorFailureCode=$diagnostic.code;$State.monitorFailureWitness=$diagnostic.witness
  if($Job.compactMemory){$compactNegative=$true}
  $State.monitorFailureName=$originalMonitorError.Exception.GetType().Name
  if(-not $State.primaryFailure){$State.primaryFailure='owned-browser-monitor-failed'}
  $State.status='NEG-monitor-failure';$State.ownershipComplete=$false
  # Persist NEG before attempting cleanup. A broken state path must not bypass it.
  try{Save-OwnedMonitorResult $State $StateFile}catch{$State.secondaryFailures+=@{phase='failure-save';name=$_.Exception.GetType().Name}}
  try{
   if($Job.compactMemory){Request-LessonNormalStop $Job.stopRequest}
   elseif(Retained-OwnedProcessAlive $rootRecord){if(-not(Test-Path -LiteralPath $Job.stopRequest)){Write-Durable @{requestedAt=[datetimeoffset]::UtcNow.ToString('o');reason='monitor-failure'} $Job.stopRequest -Exclusive}}
  }catch{$State.secondaryFailures+=@{phase='stop-request';name=$_.Exception.GetType().Name}}
  # Discovery may have failed, so act only on kernel objects already retained.
  if($Job.compactMemory){
   # No forced cleanup for the compact profile. The adapter owns normal browser
   # shutdown; a residual root/child stays NEG and remains visible to the operator.
   $until=[datetimeoffset]::UtcNow.AddSeconds(30)
   do{
    Start-Sleep -Milliseconds 100
    $observations=@($retained.Values|ForEach-Object{Retained-OwnedProcessObservation $_})
    # Unknown is not an exit. Stop draining and persist explicit uncertainty via
    # Reconcile below instead of calling the throwing boolean helper in this catch.
    if(@($observations|Where-Object state -eq 'unknown').Count){break}
    $alive=@($observations|Where-Object state -eq 'alive')
   }while($alive.Count -and [datetimeoffset]::UtcNow -lt $until)
  }
  foreach($record in @($retained.Values|Sort-Object createdTicks -Descending|Where-Object{-not $Job.compactMemory})){
   try{if(Stop-RetainedOwnedProcess $record){$State.forced=$true}}catch{$State.secondaryFailures+=@{phase='failure-cleanup';processId=$record.processId;name=$_.Exception.GetType().Name}}
  }
  Reconcile-RetainedOwnedProcesses $State $known $retained
  $State.observedTree=@($known.Values|ForEach-Object{[pscustomobject]@{processId=$_.processId;parentId=$_.parentId;createdAt=$_.createdAt;executable=$_.executable;cliSha256=$_.cliSha256}})
  try{$Process.Refresh();if($Process.HasExited){$State.processExitCode=$Process.ExitCode}}catch{$State.secondaryFailures+=@{phase='root-exit-observation';name=$_.Exception.GetType().Name};$State.unconfirmedProcessIds=@($State.unconfirmedProcessIds+$State.root.processId|Select-Object -Unique);$State.cleanupConfirmed=$false}
  $State.retainedHandleCount=$retained.Count
  $State.completedAt=[datetimeoffset]::UtcNow.ToString('o')
 } finally {
  if($compactContext){
   # Stop Next only AFTER every captured browser/runner identity is proven exited.
   try{
    $remaining=@($retained.Values|Where-Object{Retained-OwnedProcessAlive $_})
    if(-not $remaining.Count -and $compactNegative){Request-LessonCompactNextStop $compactContext}
    elseif($remaining.Count){$State.secondaryFailures+=@{phase='compact-next-stop';name='BrowserResidualsNextPreserved'}}
   }catch{$State.secondaryFailures+=@{phase='compact-next-stop';name=$_.Exception.GetType().Name}}
   Close-LessonCompactMonitor $compactContext
  }
  foreach($record in $retained.Values){if($record.ownsProcess){$record.process.Dispose()}}
  $State.descendantHandlesReleased=$true
 }
 Save-OwnedMonitorResult $State $StateFile
 return $State
}
