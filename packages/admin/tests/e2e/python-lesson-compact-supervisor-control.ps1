# Real inert owned processes; no Next, Chrome, listeners, database or provider.
param([ValidateSet('budget','unknown-persistent','unknown-transient')][string]$Mode='budget')
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$operators=Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows'
. (Join-Path $operators 'python-lesson-process-ownership.ps1')
. (Join-Path $operators 'python-lesson-browser-watch.ps1')
$out=Join-Path $taskRoot ('.cache/lessons-compact-controls/supervisor-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $out -ErrorAction Stop|Out-Null
# The inert test's state files use its own cache rather than an executable operator namespace.
function Owned-StatePath([string]$Path){$value=[IO.Path]::GetFullPath($Path);if(-not $value.StartsWith($out+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Control state escaped own cache'};return $value}
$node='C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/node-v24.22.0/node-v24.22.0-win-x64/node.exe'
$bun='C:/Users/tocha/projects/sistema-zero-python/.cache/studio-python-l0/bun-1.4.3-isolated/extracted/bun-windows-x64/bun.exe'
$nextDirectory=Join-Path $out 'next';New-Item -ItemType Directory -Path $nextDirectory|Out-Null
$nextStop=Join-Path $nextDirectory 'stop.request'
$nextEntry=Join-Path $out 'inert-next.mjs'
[IO.File]::WriteAllText($nextEntry,"import {existsSync} from 'node:fs';setInterval(()=>{if(existsSync(process.argv[2]))process.exit(0)},25)")
$scenario=Join-Path $out 'inert-browser.mjs'
$onStop=if($Mode -eq 'budget'){'stopped=true'}else{'process.exit(0)'}
[IO.File]::WriteAllText($scenario,"export async function runPythonLessonAdmin(){let stopped=false;process.on('SIGTERM',()=>{$onStop});const end=Date.now()+15000;while(!stopped&&Date.now()<end)await new Promise(r=>setTimeout(r,25));if(!stopped)throw Error('Control stop was not requested')}")
$nextProcess=$null;$browserProcess=$null;$baseProcess=$null;$result=$null
$baseStop=Join-Path $out 'base.stop.request'
try{
 $nextProcess=Start-Process -FilePath $node -ArgumentList @('--max-old-space-size=768',$nextEntry,$nextStop) -WindowStyle Hidden -PassThru
 $nextRoot=Process-Witness $nextProcess.Id
 $baseProcess=Start-Process -FilePath $node -ArgumentList @($nextEntry,$baseStop) -WindowStyle Hidden -PassThru
 $next=[pscustomobject]@{root=$nextRoot;stopRequest=$nextStop}
 $nextState=Join-Path $nextDirectory 'owned-process.json';Write-Durable $next $nextState -Exclusive
 $envFile=Join-Path $out 'env.json';Write-Durable @{version=1;role='adminBrowser';env=@{NODE_ENV='test'}} $envFile -Exclusive
 $stateFile=Join-Path $out 'owned-process.json';$jobPath=Join-Path $out 'job.json'
 $job=@{owner='compact-inert';run='compact-inert';nonce=[guid]::NewGuid().ToString('N');role='adminBrowser';cwd=$taskRoot;entry=$scenario;entrySha256=(Get-FileHash -LiteralPath $scenario -Algorithm SHA256).Hash.ToLowerInvariant();entryExport='runPythonLessonAdmin';argv=@();envFile=$envFile;envSha256=(Get-FileHash -LiteralPath $envFile -Algorithm SHA256).Hash.ToLowerInvariant();cleanPath=$env:PATH;home=$out;stateFile=$stateFile;stopRequest=(Join-Path $out 'stop.request');signalReceipt=(Join-Path $out 'signal.json');failureReceipt=(Join-Path $out 'failure.json');claimFile=(Join-Path $out 'owner.claim.json');claimReceipt=(Join-Path $out 'claim-accepted.json');runComplete=(Join-Path $out 'run-complete.json');completionAck=(Join-Path $out 'completion-ack.json');compactMemory=@{next=$next;nextStateFile=$nextState;baseRoots=@((Process-Witness $PID));baselineBaseMiB=0}}
 # Measure the real control base once; the supervisor still measures all roots/children.
 $job.compactMemory.baseRoots=@((Process-Witness $baseProcess.Id))
 $base=New-LessonCompactMonitor $next $nextState $job.compactMemory.baseRoots
 $job.compactMemory.baselineBaseMiB=$base.baselineBaseMiB;Close-LessonCompactMonitor $base
 Write-Durable @{negative=$false;profileId='lessons-desktop-compact-r2';nextRoot=$nextRoot} (Join-Path $nextDirectory 'compact-memory.json') -Exclusive
 Write-Durable $job $jobPath -Exclusive
 $adapter=Join-Path $operators 'python-lesson-windows-entry.mjs'
 $browserProcess=Start-Process -FilePath $bun -ArgumentList @('--no-env-file',$adapter,$jobPath) -WindowStyle Hidden -PassThru -Environment @{STUDIO_LESSONS_QA_ADMIN_EMAIL='inert@example.invalid';STUDIO_LESSONS_QA_ADMIN_PASSWORD='compact-inert-memory-only'} -RedirectStandardOutput (Join-Path $out 'stdout.log') -RedirectStandardError (Join-Path $out 'stderr.log')
 $browserRoot=Process-Witness $browserProcess.Id
 $state=[pscustomobject]@{version=2;nonce=$job.nonce;owner=$job.owner;run=$job.run;role='adminBrowser';status='witnessed-awaiting-app';root=$browserRoot;observedTree=@();forced=$false}
 Save $state $stateFile
 Write-Durable @{version=1;nonce=$job.nonce;pid=$browserProcess.Id;stateSha256=(Get-FileHash -LiteralPath $stateFile -Algorithm SHA256).Hash.ToLowerInvariant()} (Join-Path $out 'owner.claim.pending.json') -Exclusive
 $script:actualCim=Get-Command Get-CimInstance -CommandType Cmdlet;$script:memorySamples=0
 function Get-CimInstance {
  [CmdletBinding()]param([string]$ClassName,[string]$Filter,$Property)
  if($ClassName -ceq 'Win32_OperatingSystem'){$script:memorySamples++;return @{FreePhysicalMemory=$(if($script:memorySamples -eq 1 -or $Mode -ne 'budget'){4096*1024}else{511*1024})}}
  & $script:actualCim @PSBoundParameters
 }
 # Any call to a force path fails the control. Neither owned inert process needs it.
 function Stop-RetainedOwnedProcess($Record){throw 'Compact supervisor attempted forbidden force'}
 if($Mode -ne 'budget'){
  $script:realObservation=${function:Retained-OwnedProcessObservation};$script:unknownObservations=0
  function Retained-OwnedProcessObservation($Record){
   if($Record.processId -eq $browserProcess.Id -and ($Mode -eq 'unknown-persistent' -or $script:unknownObservations -eq 0)){
    $script:unknownObservations++;return [pscustomobject]@{state='unknown';failureName='InertPersistentOrTransientObservationFault'}
   }
   & $script:realObservation $Record
  }
 }
 $start=[datetimeoffset]::UtcNow
 $result=Watch-OwnedBrowser $browserProcess $state $stateFile $job ($start.AddSeconds(18)) ($start.AddSeconds(20))
 if($result.status -notlike 'NEG-*' -or $result.forced){throw 'Compact negative was not preserved without force'}
 if($Mode -eq 'budget'){
  if($result.primaryFailure -cne 'compact-memory-budget-negative' -or -not $result.cleanupConfirmed -or $result.liveOwned.Count){throw 'Inert budget normal cleanup not confirmed'}
  if(-not(Test-Path -LiteralPath $nextStop) -or -not $nextProcess.WaitForExit(5000)){throw 'Owned Next normal stop did not follow browser cleanup'}
  if([IO.File]::GetCreationTimeUtc($nextStop) -lt $browserProcess.ExitTime.ToUniversalTime()){throw 'Next stop was requested before the browser runner exited'}
 }else{
  if(-not $script:unknownObservations -or $result.cleanupConfirmed -or $result.ownershipComplete){throw 'Unknown observation was qualified or not exercised'}
  $persisted=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json
  if($persisted.status -notlike 'NEG-*' -or -not $persisted.completedAt -or $persisted.cleanupConfirmed){throw 'Final negative/reconciliation was not persisted'}
  if($Mode -eq 'unknown-persistent' -and $persisted.unconfirmedProcessIds -notcontains $browserProcess.Id){throw 'Persistent unknown identity was silently lost'}
 }
 if(-not(Test-Path -LiteralPath (Join-Path $nextDirectory 'compact-memory-handoff.json'))){throw 'First-sample supervisor transfer not recorded'}
 foreach($file in Get-ChildItem -LiteralPath $out -File){if([IO.File]::ReadAllText($file.FullName).Contains('compact-inert-memory-only')){throw 'Control credential persisted'}}
 Write-Durable @{state='inert-compact-supervisor-passed';mode=$Mode;memorySamples=$script:memorySamples;browserStatus=$result.status;browserCleanup=$result.cleanupConfirmed;nextExited=$nextProcess.HasExited;forced=$result.forced;unknownObservations=$script:unknownObservations;unconfirmedProcessIds=$result.unconfirmedProcessIds;noChrome=$true;noNextServer=$true;noHttp=$true} (Join-Path $out 'receipt.json') -Exclusive
 Write-Output "COMPACT supervisor passed; receipt=$(Join-Path $out 'receipt.json')"
}finally{
 if(Test-Path Function:Get-CimInstance){Remove-Item Function:Get-CimInstance}
 if($script:realObservation){${function:Retained-OwnedProcessObservation}=$script:realObservation}
 if($browserProcess){if(-not $browserProcess.HasExited){Request-LessonNormalStop (Join-Path $out 'stop.request');if(-not $browserProcess.WaitForExit(35000)){throw 'Independent inert browser normal cleanup incomplete'}};$browserProcess.Dispose()}
 if($nextProcess){if(-not $nextProcess.HasExited){Request-LessonNormalStop $nextStop;if(-not $nextProcess.WaitForExit(5000)){throw 'Independent inert Next normal cleanup incomplete'}};$nextProcess.Dispose()}
 if($baseProcess){if(-not $baseProcess.HasExited){Request-LessonNormalStop $baseStop;if(-not $baseProcess.WaitForExit(5000)){throw 'Independent inert base normal cleanup incomplete'}};$baseProcess.Dispose()}
 Write-Durable @{state='independent-inert-control-resources-exited';mode=$Mode;monitorUnknownNotRewritten=$true;normalFileRequestsOnly=$true;forceUsed=$false} (Join-Path $out 'control-cleanup.json') -Exclusive
}
