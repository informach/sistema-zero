param([string]$ActualStateFile)
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
. (Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows/python-lesson-process-ownership.ps1')
. (Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows/python-lesson-memory-watch.ps1')
$profile='lessons-desktop-shared-r1';$count=0
function Check([bool]$Value,[string]$Name){if(-not $Value){throw "Shared control failed: $Name"};$script:count++}
$actual=@{nextMiB=1040.31640625;browserMiB=698.93359375;baseGrowthMiB=0;freeMiB=1730.51953125;ownershipComplete=$true}
if($ActualStateFile){$actual=(Get-Content -LiteralPath $ActualStateFile -Raw|ConvertFrom-Json -DateKind String).compactMemoryObservation}
Check (Test-LessonCompactSample $actual).negative 'recorded R7 remains NEG under historical v2'
Check (-not(Test-LessonCompactSample $actual $profile).negative) 'recorded R7 is below the shared v3 pool'
$boundary=@{nextMiB=1200;browserMiB=848;baseGrowthMiB=128;freeMiB=512;ownershipComplete=$true}
Check (-not(Test-LessonCompactSample $boundary $profile).negative) 'combined2048 exact boundary'
$bad=$boundary.Clone();$bad.nextMiB+=0.01;Check (Test-LessonCompactSample $bad $profile).negative 'combined pool exceeded'
$cap=$boundary.Clone();$cap.nextMiB=500;$cap.browserMiB=1024
Check (-not(Test-LessonCompactSample $cap $profile).negative) 'browser1024 exact boundary below pool'
$cap.browserMiB=1024.01;Check (Test-LessonCompactSample $cap $profile).negative 'browser cap independently exceeded'
$warm=$boundary.Clone();$warm.nextMiB=2048;$warm.browserMiB=0
Check (-not(Test-LessonCompactSample $warm $profile).negative) 'warmup uses pool with browser0'
$warm.nextMiB+=0.01;Check (Test-LessonCompactSample $warm $profile).negative 'warmup beyond pool'
foreach($key in @('freeMiB','nextMiB','browserMiB','baseGrowthMiB')){
 foreach($value in @($null,[double]::NaN,[double]::PositiveInfinity,-1,'unknown',$true,[datetime]::UtcNow,[pscustomobject]@{unknown=$true})){$bad=$boundary.Clone();$bad[$key]=$value;Check (Test-LessonCompactSample $bad $profile).negative ('invalid-'+$key)}
}
$bad=$boundary.Clone();$bad.ownershipComplete=$false;Check (Test-LessonCompactSample $bad $profile).negative 'unknown ownership'
$bad=$boundary.Clone();$bad.freeMiB=511.99;Check (Test-LessonCompactSample $bad $profile).negative 'OS reserve preserved'
$bad=$boundary.Clone();$bad.baseGrowthMiB=128.01;Check (Test-LessonCompactSample $bad $profile).negative 'retained base reserve preserved'
Check (-not(Test-LessonCompactSample $bad $profile).forceAuthorized) 'no force authorization'
$refused=$false;try{Test-LessonCompactSample $boundary 'custom'|Out-Null}catch{$refused=$true};Check $refused 'unknown profile refused'
$out=Join-Path $taskRoot ('.cache/lesson-shared-controls/'+[guid]::NewGuid().ToString('N'));[IO.Directory]::CreateDirectory($out)|Out-Null
$nextRoot=@{processId=1;createdAt='inert-next';executable='inert';cliSha256='next';cli='inert --max-old-space-size=768'}
$browserRoot=@{processId=2;createdAt='inert-browser';executable='inert';cliSha256='browser'}
function Process-Witness($ProcessId){if($ProcessId -eq 1){return $nextRoot};return $browserRoot}
$context=@{directory=$out;profileId=$profile;next=@{root=$nextRoot}}
$handoff=Join-Path $out 'compact-memory-handoff.json'
Write-Durable @{profileId='lessons-desktop-compact-r2';nextRoot=$nextRoot;browserRoot=$browserRoot} $handoff -Exclusive
$refused=$false;try{Test-LessonCompactHandoff $context|Out-Null}catch{$refused=$true};Check $refused 'historical profile cannot handoff shared monitor'
Write-Durable @{profileId=$profile;nextRoot=$nextRoot;browserRoot=$browserRoot} $handoff
Check (Test-LessonCompactHandoff $context) 'shared profile with matching witnesses can handoff'
# Execute real warmup/decision/status writer with inert process/observation
# boundaries. The R7 observation must be positive only when v3 is propagated.
$probe=[pscustomobject]@{samples=0;profile=$null}
function New-LessonCompactMonitor($Next,$NextStateFile,$BaseRoots,$ProfileId){$probe.profile=$ProfileId;return @{profileId=$ProfileId;next=$Next;directory=$out;baseRoots=$BaseRoots;baselineBaseMiB=0;nextRetained=@{};baseRetained=@{}}}
function Get-LessonCompactObservation($Context,$BrowserMiB){$probe.samples++;return $actual}
function Test-LessonCompactHandoff($Context){return $probe.samples -gt 0}
Watch-LessonCompactNextWarmup @{root=$nextRoot;stopRequest=(Join-Path $out 'stop.request')} (Join-Path $out 'state.json') @('inert-base') ([datetimeoffset]::UtcNow.AddSeconds(5)) $profile
$status=Get-Content -LiteralPath (Join-Path $out 'compact-memory.json') -Raw|ConvertFrom-Json
Check ($probe.profile -ceq $profile -and $status.profileId -ceq $profile -and $status.negative -eq $false) 'real warmup propagates v3 profile through decision and status'
Write-Durable @{state='inert-shared-controls-passed';controls=$count;actualR7Replay=[bool]$ActualStateFile;processStarts=0;networkCalls=0} (Join-Path $out 'receipt.json') -Exclusive
Write-Output "SHARED controls=$count; actualR7=$([bool]$ActualStateFile); no process/network"
