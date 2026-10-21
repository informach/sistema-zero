param([ValidateSet('complete','abrupt','deadline','completion-malformed','monitor-save-failure','monitor-cim-failure','monitor-parent-witness-missing','witness-query-failure','completion-ack-slow','retained-observation-failure')][string]$Mode='complete', [ValidateSet('Refresh','HasExited','StartTime')][string]$ObservationFault='Refresh')
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$operators=Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows'
. (Join-Path $operators 'python-lesson-process-ownership.ps1')
. (Join-Path $operators 'python-lesson-browser-watch.ps1')
$out=Join-Path $taskRoot ('.cache/lessons-qa-controls-r1/supervisor-'+$Mode+'-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $out -ErrorAction Stop|Out-Null
if($Mode -eq 'witness-query-failure'){
 # Real successful query with no matching process remains a legitimate null.
 if($null -ne (Process-Witness 2147483647)){throw 'Absent PID unexpectedly produced a witness'}
 function Get-CimInstance {
  [CmdletBinding()]param([string]$ClassName,[string]$Filter)
  $script:cimErrorAction=[string]$PSBoundParameters['ErrorAction']
  Write-Error -Message 'benign nonterminating CIM query failure' -ErrorId 'LessonsCimControl'
 }
 $queryFailed=$false
 try{Process-Witness 2147483647|Out-Null}catch{$queryFailed=$true}
 finally{Remove-Item Function:Get-CimInstance}
 if(-not $queryFailed){throw 'CIM query failure was silently converted to absent PID'}
 if($script:cimErrorAction -cne 'Stop'){throw 'Process witness did not request terminating CIM errors'}
 Write-Durable @{mode=$Mode;state='inert-control-passed';absentPidReturnedNull=$true;queryErrorPropagated=$true;queryErrorAction=$script:cimErrorAction;resources='none';noBrowser=$true;noHttp=$true;noServices=$true;at=[datetimeoffset]::UtcNow.ToString('o')} (Join-Path $out 'control-receipt.json') -Exclusive
 Write-Output "CONTROL $Mode passed; receipt=$(Join-Path $out 'control-receipt.json')"
 return
}
$entry=Join-Path $out 'inert-scenario.mjs'
$source=@'
import { writeFileSync } from 'node:fs';
export async function runPythonLessonAdmin() {
  const [mode, childReceipt, completionPath, statePath] = process.argv.slice(2);
  const child = Bun.spawn([process.execPath, '--eval', 'setInterval(() => {}, 1000)'], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' });
  if (mode === 'retained-observation-failure') child.unref();
  writeFileSync(childReceipt, JSON.stringify({ childPid: child.pid, inert: true }));
  if (mode === 'completion-malformed') {
    const { readFileSync } = await import('node:fs');
    for (let i = 0; i < 100; i++) {
      try { if (JSON.parse(readFileSync(statePath, 'utf8')).observedTree.some(w => w.processId === child.pid)) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    writeFileSync(completionPath, '{');
    setInterval(() => {}, 1000); await new Promise(() => {});
  }
  if (mode === 'monitor-save-failure' || mode === 'monitor-cim-failure' || mode === 'monitor-parent-witness-missing') { setInterval(() => {}, 1000); await new Promise(() => {}); }
  if (mode === 'deadline') { setInterval(() => {}, 1000); await new Promise(() => {}); }
  await new Promise(resolve => setTimeout(resolve, 2000));
  if (mode === 'abrupt') process.exit(9);
  if (mode === 'retained-observation-failure') return; // Completion while owned child remains alive.
  child.kill();
  await child.exited;
}
'@
[IO.File]::WriteAllText($entry,$source)
$binary='C:\Users\tocha\projects\sistema-zero-python\.cache\studio-python-l0\bun-1.4.3-isolated\extracted\bun-windows-x64\bun.exe'
$adapter=Join-Path $operators 'python-lesson-windows-entry.mjs'
$envFile=Join-Path $out 'env.json';Write-Durable @{version=1;role='adminBrowser';env=@{NODE_ENV='test'}} $envFile -Exclusive
$stateFile=Join-Path $out 'owned-process.json'
$job=@{version=1;owner='lessons-inert-control';run=[guid]::NewGuid().ToString();nonce=[guid]::NewGuid().ToString('N');role='adminBrowser';cwd=$taskRoot;entry=$entry;entrySha256=(Get-FileHash -LiteralPath $entry -Algorithm SHA256).Hash.ToLowerInvariant();entryExport='runPythonLessonAdmin';argv=@($Mode,(Join-Path $out 'child.json'));stopRequest=(Join-Path $out 'stop.request');signalReceipt=(Join-Path $out 'signal.json');failureReceipt=(Join-Path $out 'failure.json');claimFile=(Join-Path $out 'owner.claim.json');claimReceipt=(Join-Path $out 'claim-accepted.json');stateFile=$stateFile;envFile=$envFile;envSha256=(Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash.ToLowerInvariant();cleanPath=$env:PATH;home=$out;runComplete=(Join-Path $out 'run-complete.json');completionAck=(Join-Path $out 'completion-ack.json')}
$job.argv+=@($job.runComplete,$stateFile)
$jobPath=Join-Path $out 'job.json';Write-Durable $job $jobPath -Exclusive
$process=Start-Process -FilePath $binary -ArgumentList @('--no-env-file',$adapter,$jobPath) -WorkingDirectory $taskRoot -WindowStyle Hidden -PassThru -Environment @{STUDIO_LESSONS_QA_ADMIN_EMAIL='inert@example.invalid';STUDIO_LESSONS_QA_ADMIN_PASSWORD='control-password-in-memory'} -RedirectStandardOutput (Join-Path $out 'stdout.log') -RedirectStandardError (Join-Path $out 'stderr.log')
$handle=$process.SafeHandle
if($handle.IsInvalid -or $handle.IsClosed){throw 'Exact inert child handle required'}
$root=Process-Witness $process.Id
if(-not $root){$process.Kill($true);throw 'No inert root witness'}
$state=[pscustomobject]@{version=2;nonce=$job.nonce;owner=$job.owner;run=$job.run;role='adminBrowser';status='witnessed-awaiting-app';root=$root;observedTree=@();forced=$false}
Save $state $stateFile
$pending=Join-Path $out 'claim.pending.json'
Write-Durable @{version=1;nonce=$job.nonce;pid=$process.Id;stateSha256=(Get-FileHash -LiteralPath $stateFile -Algorithm SHA256).Hash.ToLowerInvariant()} $pending -Exclusive
[IO.File]::Move($pending,$job.claimFile,$false)
if($Mode -eq 'completion-ack-slow'){
 $script:originalWriteDurable=${function:Write-Durable};$script:slowAckObserved=$false
 function Write-Durable($value,[string]$path,[switch]$Exclusive){
  if($path -eq $job.completionAck -or $path -eq ($job.completionAck+'.pending')){
   $script:slowAckObserved=$true
   $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($value|ConvertTo-Json -Depth 12))
   $stream=[IO.File]::Open($path,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
   try{$stream.Write($bytes,0,1);$stream.Flush($true);Start-Sleep -Milliseconds 500;$stream.Write($bytes,1,$bytes.Length-1);$stream.Flush($true)}finally{$stream.Dispose()}
   return
  }
  & $script:originalWriteDurable $value $path -Exclusive:$Exclusive
 }
}
if($Mode -eq 'monitor-save-failure'){
 $script:failMonitorSave=$false;$script:originalSave=${function:Save}
 function Save($value,$path){
  if($script:failMonitorSave){throw [IO.IOException]::new('benign monitor Save control')}
  if($value.status -eq 'monitoring-owned-browser-tree' -and (Test-Path -LiteralPath (Join-Path $out 'child.json'))){
   $childPid=(Get-Content -LiteralPath (Join-Path $out 'child.json') -Raw|ConvertFrom-Json).childPid
   if($value.observedTree.processId -contains $childPid){$script:failMonitorSave=$true;throw [IO.IOException]::new('benign monitor Save control')}
  }
  & $script:originalSave $value $path
 }
}
if($Mode -in @('monitor-cim-failure','monitor-parent-witness-missing')){
 $script:realGetCimInstance=Get-Command Get-CimInstance -CommandType Cmdlet
 $script:cimFaultObserved=$false
 function Get-CimInstance {
  [CmdletBinding()]param([string]$ClassName,[string]$Filter)
  if($state.status -eq 'monitoring-owned-browser-tree' -and (Test-Path -LiteralPath (Join-Path $out 'child.json'))){
   $childPid=(Get-Content -LiteralPath (Join-Path $out 'child.json') -Raw|ConvertFrom-Json).childPid
   if($state.observedTree.processId -contains $childPid -and $Filter -ceq "ProcessId=$($state.root.processId)"){
    $script:cimFaultObserved=$true
    $script:cimErrorAction=[string]$PSBoundParameters['ErrorAction']
    if($Mode -eq 'monitor-cim-failure'){Write-Error -Message 'benign nonterminating monitor CIM failure' -ErrorId 'LessonsCimControl'}
    return
   }
  }
  & $script:realGetCimInstance -ClassName $ClassName -Filter $Filter -ErrorAction Stop
 }
}
$started=[datetimeoffset]::UtcNow
if($Mode -eq 'retained-observation-failure'){
 $script:originalRetainOwnedProcess=${function:Retain-OwnedProcess}
 $script:observationFaultRecord=$null
 $script:observationControlRecord=$null
 function Retain-OwnedProcess($Witness,[Diagnostics.Process]$ExistingProcess=$null){
  $record=& $script:originalRetainOwnedProcess $Witness $ExistingProcess
  $childReceipt=Join-Path $out 'child.json'
  if($record -and (Test-Path -LiteralPath $childReceipt) -and $Witness.processId -eq (Get-Content -LiteralPath $childReceipt -Raw|ConvertFrom-Json).childPid){
   $script:observationControlRecord=& $script:originalRetainOwnedProcess $Witness
   # Keep the actual pinned handle; fault only a Process observation, not the liveness helper.
   $facade=[pscustomobject]@{inner=$record.process;fault=$ObservationFault;killCalls=0;faultCalls=0}
   $facade|Add-Member ScriptMethod Refresh {if($this.fault -eq 'Refresh'){$this.faultCalls++;throw [IO.IOException]::new('benign retained Refresh failure')};$this.inner.Refresh()}
   $facade|Add-Member ScriptProperty HasExited {if($this.fault -eq 'HasExited'){$this.faultCalls++;throw [IO.IOException]::new('benign retained HasExited failure')};$this.inner.HasExited}
   $facade|Add-Member ScriptProperty Id {$this.inner.Id}
   $facade|Add-Member ScriptProperty StartTime {if($this.fault -eq 'StartTime'){$this.faultCalls++;throw [IO.IOException]::new('benign retained StartTime failure')};$this.inner.StartTime}
   $facade|Add-Member ScriptMethod Kill {$this.killCalls++;$this.inner.Kill()}
   $facade|Add-Member ScriptMethod Dispose {$this.inner.Dispose()}
   $record.process=$facade;$script:observationFaultRecord=$record
  }
  return $record
 }
}
$positive=$Mode -in @('complete','completion-ack-slow')
$soft=if($positive -or $Mode -eq 'retained-observation-failure'){$started.AddSeconds(15)}else{$started.AddSeconds(3)}
$hard=if($positive -or $Mode -eq 'retained-observation-failure'){$started.AddSeconds(20)}else{$started.AddSeconds(7)}
try {
 $result=Watch-OwnedBrowser $process $state $stateFile $job $soft $hard
 if($Mode -eq 'retained-observation-failure'){
  ${function:Retain-OwnedProcess}=$script:originalRetainOwnedProcess
  if(-not $script:observationFaultRecord -or -not $script:observationFaultRecord.process.faultCalls){throw 'Real retained observation boundary was not exercised'}
  if($result.status -notlike 'NEG-*' -or $result.ownershipComplete -or $result.cleanupConfirmed){throw 'Unknown retained process was falsely qualified as exited'}
  if(Test-Path -LiteralPath $job.completionAck){throw 'Unknown retained descendant received completion acknowledgement'}
  if($result.unconfirmedProcessIds -notcontains $script:observationFaultRecord.processId -and $result.provenExitedProcessIds -notcontains $script:observationFaultRecord.processId){throw 'Retained process was lost without a proven exit or explicit uncertainty'}
  if($script:observationFaultRecord.process.killCalls){throw 'Unknown retained object was signalled'}
  # The monitor must leave this unconfirmed. The benign control owns a separate fresh
  # separately retained real handle for its own cleanup; that does not qualify monitor cleanup.
  $cleanupRecord=$script:observationControlRecord
  if(-not $cleanupRecord){throw 'Control did not retain its own independent inert child handle'}
  if(Retained-OwnedProcessAlive $cleanupRecord){if(-not(Stop-RetainedOwnedProcess $cleanupRecord)){throw 'Control inert child was not stopped'}}
  if(-not $cleanupRecord.process.WaitForExit(5000)){throw 'Control inert child did not exit'}
 }
 if($Mode -in @('monitor-cim-failure','monitor-parent-witness-missing')){Remove-Item Function:Get-CimInstance}
 $live=@($result.observedTree|Where-Object{Same-Witness $_ (Process-Witness $_.processId)})
 if($live.Count){throw 'Inert control left witnessed resources alive'}
 if($result.observedTree.Count -lt 2){throw 'Inert child was not captured below the live root'}
 if($positive -and $result.status -cne 'completed-owned-tree-exited'){throw "Expected complete control, got $($result.status)"}
 if(-not $positive -and $result.status -notlike 'NEG-*'){throw 'Negative control was incorrectly qualified'}
 if($Mode -eq 'abrupt' -and $result.processExitCode -ne 9){throw 'Abrupt primary process exit was not preserved'}
 if($Mode -eq 'deadline' -and -not $result.forced){throw 'Hard deadline did not mark its forced negative'}
 if($result.retainedHandleCount -ne $result.observedTree.Count -or -not $result.descendantHandlesReleased){throw 'Validated descendant handles were not retained/released'}
 if($Mode -in @('completion-malformed','monitor-save-failure','monitor-cim-failure','monitor-parent-witness-missing')){
  if($result.status -notlike 'NEG-monitor-*' -or -not $result.forced -or $result.ownershipComplete){throw 'Monitor failure escaped without forced-negative reconciliation'}
 }
 if($Mode -in @('monitor-cim-failure','monitor-parent-witness-missing')){
  if(-not $script:cimFaultObserved){throw 'Actual witness CIM command path was not exercised'}
  if($script:cimErrorAction -cne 'Stop'){throw 'Witness CIM query still suppresses errors'}
  $persisted=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json -DateKind String
  if($persisted.ownershipComplete -or $persisted.primaryFailure -cne 'owned-browser-monitor-failed' -or -not $persisted.descendantHandlesReleased){throw 'CIM failure NEG and exact-handle reconciliation were not durably retained'}
 }
 if($Mode -eq 'monitor-save-failure' -and -not(Test-Path -LiteralPath $result.persistenceFallback)){throw 'Missing durable NEG fallback after Save failure'}
 if($Mode -eq 'complete' -and (Test-Path -LiteralPath ($job.runComplete+'.pending'))){throw 'Completion was not atomically published'}
 if($Mode -eq 'completion-ack-slow' -and (-not $script:slowAckObserved -or (Test-Path -LiteralPath ($job.completionAck+'.pending')))){throw 'Slow acknowledgement publication was not exercised and completed'}
 foreach($file in Get-ChildItem -LiteralPath $out -File){if([IO.File]::ReadAllText($file.FullName).Contains('control-password-in-memory')){throw 'Credential escaped into an artifact'}}
 Write-Durable @{mode=$Mode;state='inert-control-passed';supervisorState=$result.status;observedProcesses=$result.observedTree.Count;exitCode=$result.processExitCode;forced=$result.forced;ownershipComplete=$result.ownershipComplete;cleanupConfirmed=$result.cleanupConfirmed;unconfirmedProcessIds=$result.unconfirmedProcessIds;observationFault=$ObservationFault;primaryFailure=$result.primaryFailure;queryFaultObserved=$script:cimFaultObserved;queryErrorAction=$script:cimErrorAction;resources='none';noBrowser=$true;noHttp=$true;noServices=$true;at=[datetimeoffset]::UtcNow.ToString('o')} (Join-Path $out 'control-receipt.json') -Exclusive
 Write-Output "CONTROL $Mode passed; receipt=$(Join-Path $out 'control-receipt.json')"
} finally {
 if($Mode -eq 'retained-observation-failure'){${function:Retain-OwnedProcess}=$script:originalRetainOwnedProcess}
 # Also bound a failed control itself using exact retained objects, never Stop -Id.
 foreach($w in @($state.observedTree|Sort-Object createdAt -Descending)){
  $cleanupRecord=Retain-OwnedProcess $w
  if($cleanupRecord){try{Stop-RetainedOwnedProcess $cleanupRecord|Out-Null}finally{$cleanupRecord.process.Dispose()}}
 }
 $process.Dispose()
 if($Mode -eq 'retained-observation-failure' -and $script:observationControlRecord){$script:observationControlRecord.process.Dispose()}
}
