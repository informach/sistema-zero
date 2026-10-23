param([ValidateSet('Plan','Run','Verify')][string]$Action='Plan',[string]$PlanPath,[string]$ExpectedPlanSha256,[datetimeoffset]$StartCutoff,[datetimeoffset]$WindowEnd)
$ErrorActionPreference='Stop'
if($Action -eq 'Plan'){Write-Output 'PREPARED ONLY. No credentials read, native query, process or browser started.';return}
. (Join-Path $PSScriptRoot 'python-lesson-windows-job.ps1')
. (Join-Path $PSScriptRoot 'python-lesson-native-browser-common.ps1')
if($ExpectedPlanSha256 -cnotmatch '^[a-f0-9]{64}$' -or (Get-FileHash -LiteralPath $PlanPath).Hash.ToLowerInvariant() -cne $ExpectedPlanSha256){throw 'Exact owner plan required'}
$plan=Get-Content -LiteralPath $PlanPath -Raw -Encoding utf8|ConvertFrom-Json
if($plan.version -ne 1 -or $plan.kind -cne 'hosted-js-pro-node-job' -or $plan.attemptId -cnotmatch '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'){throw 'Closed hosted browser plan required'}
$memoryProfile=Get-OwnedBrowserPlanMemoryProfile $plan
foreach($pin in @($plan.pins)+@($plan.node,$plan.chrome,$plan.binding)){
 if(-not [IO.Path]::IsPathFullyQualified($pin.path) -or $pin.sha256 -cnotmatch '^[a-f0-9]{64}$' -or (Get-FileHash -LiteralPath $pin.path).Hash.ToLowerInvariant() -cne $pin.sha256 -or (Get-Item -LiteralPath $pin.path).Length -ne $pin.bytes){throw 'Pinned owner input changed'}
}
# Pin code that will actually execute, not merely a duplicate elsewhere.
foreach($path in @($PSCommandPath,(Join-Path $PSScriptRoot 'python-lesson-native-browser-common.ps1'),(Join-Path $PSScriptRoot 'python-lesson-windows-job.ps1'),(Join-Path $PSScriptRoot 'python-lesson-windows-job.cs'),(Join-Path $PSScriptRoot 'python-lesson-native-browser-worker.mjs'),$plan.providerEntry,$plan.playwrightEntry,$plan.scenarioEntry)){
 if(@($plan.pins|Where-Object{[IO.Path]::GetFullPath($_.path) -ieq [IO.Path]::GetFullPath($path)}).Count -ne 1){throw 'Required owner source pin missing'}
}
if($Action -eq 'Verify'){Write-Output 'OFFLINE VERIFIED. No credential input, native query, process or browser started.';return}
if(-not [OperatingSystem]::IsWindows() -or [IntPtr]::Size -ne 8 -or [datetimeoffset]::UtcNow -ge $StartCutoff -or ($WindowEnd-[datetimeoffset]::UtcNow).TotalSeconds -lt 360){throw 'Fresh Root Windows x64 window360s required'}
$nativePin=@($plan.pins|Where-Object{[IO.Path]::GetFullPath($_.path) -ieq [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'python-lesson-windows-job.cs'))})[0]
Initialize-OwnedJobNative $nativePin.sha256
if(-not [IO.Path]::IsPathFullyQualified($plan.directory) -or (Test-Path -LiteralPath $plan.directory)){throw 'Fresh exclusive owner output required'}
New-Item -ItemType Directory -Path $plan.directory -ErrorAction Stop|Out-Null
$directory=$plan.directory;$nonce=[guid]::NewGuid().ToString('N');$owner=$null;$process=$null;$streams=$null;$providerBytes=$null;$primary=$null;$cleanupFailure=$null;$close=$null;$completion=$null;$maxWS=0.0;$force=$false;$phase='admission';$functional=$false;$clock=[Diagnostics.Stopwatch]::StartNew();$started=[datetimeoffset]::UtcNow
$memorySnapshots=[pscustomobject]@{preclaim=$null;lastPositive=$null;firstNegative=$null;peak=$null}
function Put([string]$Name,$Value){$path=Join-Path $directory $Name;$temporary=$path+'.pending';[IO.File]::WriteAllText($temporary,($Value|ConvertTo-Json -Depth 14),[Text.UTF8Encoding]::new($false));[IO.File]::Move($temporary,$path,$false)}
function Stop-OwnedBrowser {if(-not(Test-Path -LiteralPath (Join-Path $directory 'stop.request'))){Put 'stop.request' @{nonce=$nonce}}}
function Sample-OwnedBrowser {
 $sampleAt=[datetimeoffset]::UtcNow;$sampleElapsed=$clock.Elapsed.TotalMilliseconds
 $sample=Read-OwnedJobObservation $owner;$script:maxWS=[math]::Max($script:maxWS,$sample.workingSetMiB)
 Read-OwnedBrowserStreams $streams
 $free=[double](Get-CimInstance Win32_OperatingSystem -Property FreePhysicalMemory -ErrorAction Stop).FreePhysicalMemory/1024
 $positive=Test-OwnedBrowserBudget $sample.workingSetMiB $free $memoryProfile.resourceProfile
 $memorySnapshot=New-OwnedBrowserMemorySnapshot $sample $owner.root $free $sampleElapsed $sampleAt ($clock.Elapsed.TotalMilliseconds-$sampleElapsed) $phase
 Record-OwnedBrowserMemorySnapshot $memorySnapshots $memorySnapshot $positive
 if(-not $positive){throw 'browser-memory-budget'}
 if($streams.unknown -or $streams.overflow){throw 'browser-streams-unknown'}
 return $sample
}
try{
 $free=[double](Get-CimInstance Win32_OperatingSystem -Property FreePhysicalMemory -ErrorAction Stop).FreePhysicalMemory/1024
 if($free -lt $memoryProfile.admissionMiB){throw 'browser-admission-refused'}
 # Read opaque private bytes before starting the gated Node. No decoding, JSON,
 # transcript or persistence. The final Node is the only envelope parser.
 $phase='provider-relay';$providerBytes=Read-OwnedProviderBytes ([Console]::OpenStandardInput())
 $environment=@{};foreach($key in @('SystemRoot','WINDIR','COMSPEC','PROGRAMFILES','PROGRAMFILES(X86)')){if([Environment]::GetEnvironmentVariable($key)){$environment[$key]=[Environment]::GetEnvironmentVariable($key)}}
 $homePath=Join-Path $directory 'home';$tempPath=Join-Path $directory 'temp';$local=Join-Path $homePath 'AppData/Local';$roaming=Join-Path $homePath 'AppData/Roaming'
 foreach($path in @($homePath,$tempPath,$local,$roaming)){[IO.Directory]::CreateDirectory($path)|Out-Null}
 $environment.HOME=$homePath;$environment.USERPROFILE=$homePath;$environment.TEMP=$tempPath;$environment.TMP=$tempPath;$environment.LOCALAPPDATA=$local;$environment.APPDATA=$roaming;$environment.PATH=(Split-Path $plan.node.path)+';'+[Environment]::SystemDirectory;$environment.DEBUG='pw:browser';$environment.DEBUG_COLORS='0';$environment.NODE_ENV='test'
 $jobPath=Join-Path $directory 'job.json'
 Put 'job.json' @{version=1;nonce=$nonce;directory=$directory;attemptId=$plan.attemptId;binding=$plan.binding;providerEntry=$plan.providerEntry;playwrightEntry=$plan.playwrightEntry;scenarioEntry=$plan.scenarioEntry;pins=$plan.pins;chrome=$plan.chrome;softEndUtc=$started.AddSeconds(330).ToString('o');workEndUtc=$started.AddSeconds(355).ToString('o')}
 $owner=New-OwnedJobContext 'qa-hosted-js-pro' $plan.attemptId 'hostedProBrowser' $nonce
 $info=New-OwnedJobLaunchInfo $plan.node.path @('--max-old-space-size=768',(Join-Path $PSScriptRoot 'python-lesson-native-browser-worker.mjs'),$jobPath,$nonce) $directory $environment -RedirectInput
 if([datetimeoffset]::UtcNow -ge $StartCutoff){throw 'browser-start-cutoff'}
 $phase='creator';$process=[Diagnostics.Process]::Start($info)
 $streams=[pscustomobject]@{readers=@{stdout=$process.StandardOutput;stderr=$process.StandardError};pending=@{stdout=$process.StandardOutput.ReadLineAsync();stderr=$process.StandardError.ReadLineAsync()};closed=@{stdout=$false;stderr=$false};counts=@{};characters=0;overflow=$false;unknown=$false}
 $root=Get-OwnedJobCreatorWitness $owner $process $info $plan.node.sha256;Put 'creator.json' $root
 Confirm-OwnedJobCreator $owner;Put 'reference.json' (Get-OwnedJobReference $owner)
 $phase='preclaim';$sample=Sample-OwnedBrowser
 if($sample.liveProcessIds.Count -ne 1 -or $sample.liveProcessIds[0] -ne $root.processId){throw 'browser-preclaim-membership'}
 Put 'claim.json' @{pid=$root.processId;nonce=$nonce}
 try{Send-OwnedProviderBytes $process.StandardInput.BaseStream $providerBytes}finally{[Array]::Clear($providerBytes);$providerBytes=$null}
 Sample-OwnedBrowser|Out-Null
 Put 'launch.json' @{pid=$root.processId;nonce=$nonce}
 $phase='scenario'
 while($clock.Elapsed.TotalSeconds -lt 330 -and [datetimeoffset]::UtcNow -lt $WindowEnd){
  $sample=Sample-OwnedBrowser
  if(Test-Path -LiteralPath (Join-Path $directory 'run-complete.json')){
   $path=Join-Path $directory 'run-complete.json';if((Get-Item -LiteralPath $path).Length -gt 4096){throw 'browser-completion-bound'}
   $completion=Get-Content -LiteralPath $path -Raw -Encoding utf8|ConvertFrom-Json
   if(-not(Test-OwnedBrowserCompletion $completion $nonce $root.processId) -or -not $sample.ownershipComplete){throw 'browser-completion-refused'}
   Put 'completion-ack.json' @{pid=$root.processId;nonce=$nonce};break
  }
  if(-not(Test-OwnedJobRootAlive $owner)){throw 'browser-exited-before-completion'}
  Start-Sleep -Milliseconds 500
 }
 if(-not $completion){throw 'browser-work-deadline'}
 if($completion.state -cne 'PASS'){throw 'browser-functional-NEG'}
}catch{$primary=ConvertTo-OwnedBrowserFailure $_ $phase}finally{
 if($providerBytes){[Array]::Clear($providerBytes)}
 try{Stop-OwnedBrowser}catch{if(-not $primary){$primary=ConvertTo-OwnedBrowserFailure $_ 'stop-persist'}}
 if($owner){
  # Keep the original creator job handle throughout drain/emergency. Missing
  # job/name is never an empty proof. Sample unknown remains sticky NEG.
  $needsRelease=$true
  do{
   # Audit native ownership independently from admission/budget assertions.
   # A primary budget refusal must not prevent noticing normal child exit.
   try{Read-OwnedJobObservation $owner|Out-Null}catch{if(-not $cleanupFailure){$cleanupFailure=ConvertTo-OwnedBrowserFailure $_ 'normal-drain'}}
   Read-OwnedBrowserStreams $streams
   try{$needsRelease=([SzLessonOwned.Native]::Read($owner.job).Pids.Count -gt 0 -or ($process -and -not $process.HasExited))}catch{$needsRelease=$true;if(-not $cleanupFailure){$cleanupFailure=ConvertTo-OwnedBrowserFailure $_ 'native-reconcile'}}
   if(-not $needsRelease -and $streams.closed.stdout -and $streams.closed.stderr){break}
   Start-Sleep -Milliseconds 500
  }while($clock.Elapsed.TotalSeconds -lt 355 -and [datetimeoffset]::UtcNow -lt $WindowEnd)
  if($needsRelease){
   if(-not $primary){$primary=@{phase='normal-drain';type='owner-failed';operation='normal-exit-unconfirmed';nativeCode=0}}
   # Re-query immediately before emergency: never force an already empty job
   # because an earlier observation said that it still had live processes.
   try{$needsRelease=([SzLessonOwned.Native]::Read($owner.job).Pids.Count -gt 0 -or ($process -and -not $process.HasExited))}catch{$needsRelease=$true;if(-not $cleanupFailure){$cleanupFailure=ConvertTo-OwnedBrowserFailure $_ 'emergency-precheck'}}
   if($needsRelease -and $owner.creatorBound -and [datetimeoffset]::UtcNow -lt $WindowEnd){
    $force=$true
    try{
     [SzLessonOwned.Native]::EmergencyTerminateOwned($owner.job,$process.SafeHandle,$owner.root.creationFileTime)
     do{Read-OwnedBrowserStreams $streams;if([SzLessonOwned.Native]::Read($owner.job).Pids.Count -eq 0){break};Start-Sleep -Milliseconds 100}while($clock.Elapsed.TotalSeconds -lt 360 -and [datetimeoffset]::UtcNow -lt $WindowEnd)
    }catch{if(-not $cleanupFailure){$cleanupFailure=ConvertTo-OwnedBrowserFailure $_ 'owned-job-emergency'}}
   }
  }
  Read-OwnedBrowserStreams $streams
  $libraryForce=$streams -and $streams.counts.ContainsKey('library-force-mentioned')
  if(-not $primary){
   try{
    $key="$($owner.root.processId):$($owner.root.creationFileTime)";$finalRoot=$owner.members[$key].Read()
    if(-not $finalRoot.Exited -or $finalRoot.ExitCode -ne 0 -or -not $completion -or $completion.state -cne 'PASS' -or $libraryForce -or $streams.unknown -or $streams.overflow -or -not $streams.closed.stdout -or -not $streams.closed.stderr){throw 'browser-final-functional-refused'}
    $functional=$true
   }catch{$primary=ConvertTo-OwnedBrowserFailure $_ 'final-functional'}
  }
  try{$close=Close-OwnedJobContext $owner -RequireEmpty}catch{if(-not $cleanupFailure){$cleanupFailure=ConvertTo-OwnedBrowserFailure $_ 'close-context'}}
 }
 $normalCleanup=$null -ne $close -and $close.cleanupConfirmed -and -not $force -and -not $cleanupFailure -and -not $libraryForce -and $streams.closed.stdout -and $streams.closed.stderr -and -not $streams.unknown -and -not $streams.overflow
 $receipt=@{version=1;state=$(if(-not $primary -and $functional -and $normalCleanup){$memoryProfile.passState}else{'NEG'});resourceProfile=$memoryProfile.resourceProfile;functionalOnly=$memoryProfile.functionalOnly;performanceQualified=$false;jobBudgetMiB=$memoryProfile.jobBudgetMiB;admissionMiB=$memoryProfile.admissionMiB;planSha256=$ExpectedPlanSha256;attemptId=$plan.attemptId;startedAt=$started.ToString('o');completedAt=[datetimeoffset]::UtcNow.ToString('o');elapsedMs=$clock.ElapsedMilliseconds;primary=$primary;cleanupFailure=$cleanupFailure;functionalPassed=$functional;normalCleanup=$normalCleanup;resourceReleaseConfirmed=($null -ne $close -and $close.cleanupConfirmed);cleanup=$close;operatorForceUsed=$force;libraryForceObserved=[bool]$libraryForce;playwrightInternalFallbackAttested=$false;maxSampledWorkingSetMiB=$maxWS;memorySnapshots=$memorySnapshots;reference=$(if($owner){@{root=$owner.root;name=$owner.job.Name}}else{$null});known=$(if($owner){@($owner.members.Values|ForEach-Object{@{pid=$_.Pid;creationFileTime=$_.CreationFileTime}})}else{@()});diagnostics=$(if($streams){@{counts=$streams.counts;characters=$streams.characters;unknown=$streams.unknown;overflow=$streams.overflow;stdoutClosed=$streams.closed.stdout;stderrClosed=$streams.closed.stderr;rawPersisted=$false}}else{$null})}
 Put 'receipt.json' $receipt
}
Write-Output ($receipt|Select-Object state,resourceProfile,functionalOnly,performanceQualified,functionalPassed,normalCleanup,resourceReleaseConfirmed,operatorForceUsed,elapsedMs|ConvertTo-Json -Compress)
if($receipt.state -cne $memoryProfile.passState){exit 1}
