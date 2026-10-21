# Real discovery/retained-observation controls with inert rows and Process objects.
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$operators=Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows'
. (Join-Path $operators 'python-lesson-process-ownership.ps1')
. (Join-Path $operators 'python-lesson-browser-watch.ps1')
$out=Join-Path $taskRoot ('.cache/lesson-exited-witness-controls/'+[guid]::NewGuid().ToString('N'));[IO.Directory]::CreateDirectory($out)|Out-Null
$count=0
function Check([bool]$Condition,[string]$Name){if(-not $Condition){throw "Exited witness control failed: $Name"};$script:count++}
function Raw([int]$Id,[int]$Parent){return [pscustomobject]@{ProcessId=$Id;ParentProcessId=$Parent;CreationDate=([datetime]'2026-10-21T00:00:00Z').AddSeconds($Id);ExecutablePath='inert.exe';CommandLine='inert --private-control'}}
function Record($Witness,[string]$State='exited'){
 $process=[pscustomobject]@{Id=$Witness.processId;HasExited=($State -ceq 'exited');fail=($State -ceq 'unknown');StartTime=([datetime]$Witness.createdAt).AddTicks(7)}
 $process|Add-Member ScriptMethod Refresh {if($this.fail){throw 'inert-observation-unknown'}}
 return [pscustomobject]@{processId=$Witness.processId;createdTicks=([datetimeoffset]$Witness.createdAt).UtcTicks+7;process=$process;safeHandle=@{IsClosed=$false;IsInvalid=$false};ownsProcess=$false}
}
function Fixture([string]$Phase='child'){
 $parent=Raw 100 0;$child=Raw 101 100
 $pw=ConvertTo-OwnedProcessWitness $parent;$cw=ConvertTo-OwnedProcessWitness $child
 $known=[Collections.Generic.Dictionary[string,object]]::new();$retained=@{}
 if($Phase -ceq 'child'){$known.Add("$($pw.processId):$($pw.createdAt)",$pw);$retained["$($pw.processId):$($pw.createdAt)"]=Record $pw 'alive'}
 $known.Add("$($cw.processId):$($cw.createdAt)",$cw);$retained["$($cw.processId):$($cw.createdAt)"]=Record $cw
 $snapshot=@{rows=@{100=$parent;101=$child};children=@{100=@($child)}}
 return @{known=$known;retained=$retained;snapshot=$snapshot;child=$child;witness=$cw;key="$($cw.processId):$($cw.createdAt)";root=$(if($Phase -ceq 'parent'){$cw}else{$pw})}
}
$proof=ConvertTo-OwnedProcessWitness (Raw 101 100)
foreach($state in @('alive','exited','unknown')){Check ((Retained-OwnedProcessObservation (Record $proof $state)).state -ceq $state) ('real retained observation '+$state)}
foreach($phase in @('parent','child')){
 foreach($missing in @('CommandLine','ExecutablePath','both')){
  $f=Fixture $phase
  if($missing -cin @('CommandLine','both')){$f.child.CommandLine=$null}
  if($missing -cin @('ExecutablePath','both')){$f.child.ExecutablePath=$null}
  $errorRecord=$null;try{Capture-OwnedTree $f.root $f.known $f.retained $f.snapshot}catch{$errorRecord=$_}
  Check ($null -eq $errorRecord) ($phase+' same identity retained exit '+$missing)
  Check ($f.known.Count -eq $(if($phase -ceq 'parent'){1}else{2})) 'no unconfirmed identity added'
 }
}
# An incomplete exited parent must not hide a new child already in the snapshot.
foreach($phase in @('parent','child')){
 $f=Fixture $phase;$f.child.CommandLine=$null
 $grandchild=Raw 102 101;$f.snapshot.rows[102]=$grandchild;$f.snapshot.children[101]=@($grandchild)
 $errorRecord=$null;try{Capture-OwnedTree $f.root $f.known $f.retained $f.snapshot}catch{$errorRecord=$_}
 Check ($null -ne $errorRecord) ($phase+' exited partial parent with new child refuses omission')
 $diagnostic=Get-LessonMonitorFailureDiagnostic $errorRecord
 Check ($diagnostic.code -ceq 'exited-parent-descendants-unconfirmed' -and $diagnostic.witness.phase -ceq 'parent' -and $diagnostic.witness.knownIdentity -eq $true) 'closed descendant uncertainty diagnostic'
 Check (-not $f.known.ContainsKey("102:$($grandchild.CreationDate.ToUniversalTime().ToString('o'))")) 'no adoption through exited incomplete parent'
}
# The complete-row traversal remains unchanged and still inventories a child.
$script:retentionCalls=0
function Retain-OwnedProcess($Witness,$ExistingProcess){$script:retentionCalls++;return Record $Witness 'alive'}
$f=Fixture 'child';$grandchild=Raw 102 101;$f.snapshot.rows[102]=$grandchild;$f.snapshot.children[101]=@($grandchild)
Capture-OwnedTree $f.root $f.known $f.retained $f.snapshot
Check ($f.known.ContainsKey("102:$($grandchild.CreationDate.ToUniversalTime().ToString('o'))") -and $script:retentionCalls -eq 1) 'complete parent still discovers and retains new child'
foreach($phase in @('parent','child')){
 $f=Fixture $phase;[void]$f.snapshot.rows.Remove(101);$f.snapshot.children[100]=@()
 $errorRecord=$null;try{Capture-OwnedTree $f.root $f.known $f.retained $f.snapshot}catch{$errorRecord=$_}
 Check ($null -eq $errorRecord) ($phase+' absent exited parent without children keeps existing behavior')
 $grandchild=Raw 102 101;$f.snapshot.rows[102]=$grandchild;$f.snapshot.children[101]=@($grandchild)
 $errorRecord=$null;try{Capture-OwnedTree $f.root $f.known $f.retained $f.snapshot}catch{$errorRecord=$_}
 Check ($null -ne $errorRecord) ($phase+' absent exited parent with new child refuses omission')
 $diagnostic=Get-LessonMonitorFailureDiagnostic $errorRecord
 Check ($diagnostic.code -ceq 'exited-parent-descendants-unconfirmed' -and $diagnostic.witness.phase -ceq 'parent' -and $diagnostic.witness.processId -eq 101 -and $diagnostic.witness.knownIdentity -eq $false -and $diagnostic.witness.missingExecutable -eq $true -and $diagnostic.witness.missingCommand -eq $true) 'absent parent safe facts; no reconstructed identity'
}
$cases=@('alive','unknown','missing-handle','closed-handle','wrong-record-pid','wrong-process-object','wrong-record-birth','pid-reuse','wrong-parent','missing-parent','missing-birth','missing-pid','new-row','contradict-executable','contradict-command')
foreach($phase in @('parent','child')){
 foreach($case in $cases){
  $f=Fixture $phase;$f.child.CommandLine=$null
  switch -CaseSensitive ($case){
   'alive' {$f.retained[$f.key]=Record $f.witness 'alive'}
   'unknown' {$f.retained[$f.key]=Record $f.witness 'unknown'}
   'missing-handle' {$f.retained.Remove($f.key)}
   'closed-handle' {$f.retained[$f.key].safeHandle.IsClosed=$true}
   'wrong-record-pid' {$f.retained[$f.key].processId=999}
   'wrong-process-object' {$f.retained[$f.key].process.Id=999}
   'wrong-record-birth' {$f.retained[$f.key].createdTicks+=100}
   'pid-reuse' {$f.child.CreationDate=$f.child.CreationDate.AddSeconds(1)}
   'wrong-parent' {$f.child.ParentProcessId=999}
   'missing-parent' {$f.child.ParentProcessId=$null}
   'missing-birth' {$f.child.CreationDate=$null}
   'missing-pid' {$f.child.ProcessId=$null}
   'new-row' {if($phase -ceq 'parent'){continue};[void]$f.known.Remove($f.key)}
   'contradict-executable' {$f.child.ExecutablePath='different-inert.exe'}
   'contradict-command' {$f.child.ExecutablePath=$null;$f.child.CommandLine='different private command'}
  }
  if($phase -ceq 'parent' -and $case -ceq 'new-row'){continue}
  $errorRecord=$null;try{Capture-OwnedTree $f.root $f.known $f.retained $f.snapshot}catch{$errorRecord=$_}
  Check ($null -ne $errorRecord) ($phase+' '+$case+' stays NEG')
  $diagnostic=Get-LessonMonitorFailureDiagnostic $errorRecord
  Check ($diagnostic.code -ceq 'tree-witness-incomplete' -and $diagnostic.witness.phase -ceq $phase) ($phase+' '+$case+' safe classified error')
 }
}
# Exercise the actual browser catch/reconciliation/save using a nested real tree
# failure. No native-retention boundary is reached by the incomplete new child.
$script:failureFixture=Fixture 'child';[void]$script:failureFixture.known.Remove($script:failureFixture.key)
$script:failureFixture.child.ExecutablePath=$null;$script:failureFixture.child.CommandLine='private-'+[guid]::NewGuid().ToString('N')
function Retain-OwnedProcess($Witness,$ExistingProcess){
 $f=$script:failureFixture
 try{Capture-OwnedTree $f.root $f.known $f.retained $f.snapshot}catch{$_.Exception.Data['private-extra']=$f.child.CommandLine;throw}
 throw 'Unexpected success'
}
$state=[pscustomobject]@{status='inert';observedTree=@();forced=$false;root=$script:failureFixture.root}
$process=[pscustomobject]@{HasExited=$true;ExitCode=1};$process|Add-Member ScriptMethod Refresh {}
$job=@{compactMemory=@{profileId='lessons-desktop-shared-r1'};stopRequest=(Join-Path $out 'stop.request')}
$stateFile=Join-Path $out 'owned-process.json'
$result=Watch-OwnedBrowser $process $state $stateFile $job ([datetimeoffset]::UtcNow.AddSeconds(1)) ([datetimeoffset]::UtcNow.AddSeconds(2))
$saved=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json
Check ($saved.status -ceq 'NEG-monitor-failure' -and $saved.ownershipComplete -eq $false -and $saved.cleanupConfirmed -eq $false) 'outer catch preserves NEG and uncertainty'
Check ($saved.monitorFailureCode -ceq 'tree-witness-incomplete' -and $saved.monitorFailureWitness.phase -ceq 'child' -and $saved.monitorFailureWitness.processId -eq 101 -and $saved.monitorFailureWitness.knownIdentity -eq $false -and $saved.monitorFailureWitness.missingExecutable -eq $true -and $saved.monitorFailureWitness.missingCommand -eq $false) 'closed witness facts persisted'
Check (-not([IO.File]::ReadAllText($stateFile).Contains($script:failureFixture.child.CommandLine))) 'raw available command not persisted'
Check (-not $saved.forced -and $saved.unconfirmedProcessIds.Count -eq 1 -and (Test-Path -LiteralPath $job.stopRequest)) 'normal stop only; missing root handle remains unconfirmed'
Write-Durable @{state='inert-exited-witness-controls-passed';assertions=$count;phaseCases=2;negativeCases=$cases.Count;processQueries=0;processStarts=0;browserLaunches=0;providerCalls=0} (Join-Path $out 'receipt.json') -Exclusive
Write-Output "EXITED WITNESS controls=$count; receipt=$(Join-Path $out 'receipt.json')"
