# Executes the real browser launcher through its native Start boundary. Only this
# pwsh's handle is retained; CIM is inert and native Start never runs.
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$source=Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows'
$out=Join-Path $taskRoot ('.cache/lesson-preclaim-controls/'+[guid]::NewGuid().ToString('N'))
$operators=Join-Path $out 'operators';[IO.Directory]::CreateDirectory($operators)|Out-Null
foreach($name in @('python-lesson-browser-owned.ps1','python-lesson-browser-watch.ps1','python-lesson-memory-watch.ps1','python-lesson-process-ownership.ps1')){[IO.File]::Copy((Join-Path $source $name),(Join-Path $operators $name),$false)}
function Put($Value,[string]$Path){[IO.Directory]::CreateDirectory((Split-Path $Path))|Out-Null;[IO.File]::WriteAllText($Path,($Value|ConvertTo-Json -Depth 20))}
function Hash([string]$Path){return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()}
$self=[Diagnostics.Process]::GetCurrentProcess();$created=$self.StartTime.ToUniversalTime()
$adapter=Join-Path $out 'inert-adapter.txt';[IO.File]::WriteAllText($adapter,'never execute')
$entry=Join-Path $out 'inert-entry.txt';[IO.File]::WriteAllText($entry,'never import')
$cli="inert-self $adapter --max-old-space-size=768"
$cliSha=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($cli))).ToLowerInvariant()
$root=@{processId=$PID;parentId=0;createdAt=$created.ToString('o');executable=$self.Path;cli=$cli;cliSha256=$cliSha}
$nextDirectory=Join-Path $operators 'windows-jobs/next-control'
$nextPath=Join-Path $nextDirectory 'owned-process.json'
$next=@{owner='inert';run='inert';role='adminNext';root=$root;stopRequest=(Join-Path $nextDirectory 'stop.request')}
Put $next $nextPath
Put @{profileId='lessons-desktop-compact-r2';negative=$false;warmupActive=$true;nextRoot=$root;observation=@{observedAt=[datetimeoffset]::UtcNow.ToString('o')};baseRoots=@($root);baselineBaseMiB=($self.WorkingSet64/1MB)} (Join-Path $nextDirectory 'compact-memory.json')
$browser=@{cwd=$taskRoot;entry=$entry;entrySha256=(Hash $entry);binary='inert-no-native-launch';prefixArgv=@();entryExport='runPythonLessonAdmin'}
$plan=@{state='bound-to-actual-new-host-canonical-policy';memoryProfileId='lessons-desktop-compact-r2';owner='inert';run='inert';hostPins=@();adapter=$adapter;cleanPath='inert';roles=@{adminBrowser=$browser;adminNext=@{binary=$self.Path;prefixArgv=@('--max-old-space-size=768')}}}
$planPath=Join-Path $operators 'windows-plan.json';Put $plan $planPath
$envPath=Join-Path $operators 'envs/adminBrowser.json';Put @{version=1;role='adminBrowser';env=@{NODE_ENV='test'}} $envPath
$inputPath=Join-Path $out 'input.json';Put @{state='inert-no-request'} $inputPath
$preclaimProbe=[pscustomobject]@{snapshots=0;nativeAttempts=0}
function Get-CimInstance {param($ClassName,$Property,$Filter,$ErrorAction)
 if($ClassName -eq 'Win32_OperatingSystem'){return @{FreePhysicalMemory=4096*1024}}
 if($ClassName -ne 'Win32_Process'){throw 'Unexpected CIM boundary'}
 if(-not $Filter){$preclaimProbe.snapshots++}
 if($Filter -and $Filter -notmatch "^ProcessId=$PID`$"){throw 'Unexpected filtered process query'}
 return [pscustomobject]@{ProcessId=$PID;ParentProcessId=0;CreationDate=$created;ExecutablePath=$self.Path;CommandLine=$cli}
}
function Start-Process {
 $preclaimProbe.nativeAttempts++
 if($preclaimProbe.snapshots -ne 2){throw "Compact initialization/observation not completed before Start: $preclaimProbe.snapshots snapshots"}
 throw 'inert-native-start-sentinel'
}
$oldEmail=$env:STUDIO_LESSONS_QA_ADMIN_EMAIL;$oldPassword=$env:STUDIO_LESSONS_QA_ADMIN_PASSWORD
try{
 $env:STUDIO_LESSONS_QA_ADMIN_EMAIL='inert@example.invalid';$env:STUDIO_LESSONS_QA_ADMIN_PASSWORD='inert-memory-only-preclaim'
 $caught=$null
 try{& (Join-Path $operators 'python-lesson-browser-owned.ps1') -Action Run -Role adminBrowser -ExpectedPlanSha256 (Hash $planPath) -ExpectedEnvSha256 (Hash $envPath) -InputFile $inputPath -ExpectedInputSha256 (Hash $inputPath) -NextStateFile $nextPath -ExpectedNextStateSha256 (Hash $nextPath) -StartCutoff ([datetimeoffset]::UtcNow.AddMinutes(1)) -WindowEnd ([datetimeoffset]::UtcNow.AddMinutes(10))}catch{$caught=$_}
 if($preclaimProbe.nativeAttempts -ne 1 -or -not $caught.Exception.ToString().Contains('inert-native-start-sentinel')){throw "Real entry did not prepare context before Start: $caught"}
 foreach($file in Get-ChildItem -LiteralPath $out -File -Recurse){if([IO.File]::ReadAllText($file.FullName).Contains('inert-memory-only-preclaim')){throw 'Credential persisted'}}
 Put @{state='real-browser-launcher-prepares-monitor-before-native-start';processSnapshotsBeforeStart=$preclaimProbe.snapshots;nativeProcessesStarted=0;chromeStarted=$false;servicesStarted=0;actualCimCalls=0;actualRetainedHandle='current-test-pwsh-only'} (Join-Path $out 'receipt.json')
 Write-Output "PRECLAIM control passed; receipt=$out/receipt.json"
}finally{$env:STUDIO_LESSONS_QA_ADMIN_EMAIL=$oldEmail;$env:STUDIO_LESSONS_QA_ADMIN_PASSWORD=$oldPassword;$self.Dispose()}
