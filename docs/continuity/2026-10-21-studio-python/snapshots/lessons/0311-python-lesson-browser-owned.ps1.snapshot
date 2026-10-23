param(
 [ValidateSet('Plan','Run')][string]$Action='Plan',
 [ValidateSet('adminBrowser','kidsBrowser')][string]$Role='adminBrowser',
 [string]$ExpectedPlanSha256,[string]$ExpectedEnvSha256,
 [string]$InputFile,[string]$ExpectedInputSha256,
 [string]$NextStateFile,[string]$ExpectedNextStateSha256,
 [datetimeoffset]$WindowEnd,[datetimeoffset]$StartCutoff
)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'python-lesson-process-ownership.ps1')
. (Join-Path $PSScriptRoot 'python-lesson-browser-watch.ps1')
if($Action -eq 'Plan'){Write-Output 'PREPARED ONLY. No launch, browser, HTTP or credentials read.';return}
function Refuse-BrowserAdmission([string]$Reason, $Observation){
 $refusals=Join-Path $PSScriptRoot 'refusals';[IO.Directory]::CreateDirectory($refusals)|Out-Null
 Write-Durable @{state='admission-refused-before-start';role=$Role;reason=$Reason;observation=$Observation;at=[datetimeoffset]::UtcNow.ToString('o');runnerStarted=$false;browserStarted=$false} (Join-Path $refusals ($Role+'-'+[guid]::NewGuid().ToString('N')+'.json')) -Exclusive
 throw $Reason
}
if($PSVersionTable.PSVersion -lt [version]'7.5'){throw 'PowerShell 7.5+ required'}
$planPath=Join-Path $PSScriptRoot 'windows-plan.json'
if((Get-FileHash -LiteralPath $planPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedPlanSha256){throw 'Reviewed bound plan SHA required'}
$plan=Get-Content -LiteralPath $planPath -Raw|ConvertFrom-Json -DateKind String
if($plan.state -ne 'bound-to-actual-new-host-canonical-policy'){throw 'Actual fresh host bind required'}
foreach($pin in $plan.hostPins){if((Get-FileHash -LiteralPath $pin.path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $pin.sha256){throw 'Pinned input changed'}}
$spec=$plan.roles.$Role
if(-not $spec -or $spec.entryExport -cne $(if($Role -eq 'adminBrowser'){'runPythonLessonAdmin'}else{'runPythonLessonKids'})){throw 'Closed browser role/export required'}
$envPath=Join-Path $PSScriptRoot "envs/$Role.json"
if((Get-FileHash -LiteralPath $envPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedEnvSha256){throw 'Reviewed browser environment SHA required'}
$configuration=Get-Content -LiteralPath $envPath -Raw|ConvertFrom-Json
if($configuration.role -cne $Role -or $configuration.version -ne 1 -or $configuration.env.PSObject.Properties.Name -ne 'NODE_ENV'){throw 'Closed browser environment required; credentials never belong in files'}
$InputFile=[IO.Path]::GetFullPath($InputFile)
$cachePrefix=[IO.Path]::GetFullPath((Join-Path $spec.cwd '.cache'))+[IO.Path]::DirectorySeparatorChar
if(-not $InputFile.StartsWith($cachePrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'Input must be an own QA cache file'}
if((Get-FileHash -LiteralPath $InputFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedInputSha256){throw 'Reviewed scenario input SHA required'}
$NextStateFile=Owned-StatePath $NextStateFile
if((Get-FileHash -LiteralPath $NextStateFile -Algorithm SHA256).Hash.ToLowerInvariant() -cne $ExpectedNextStateSha256){throw 'Exact Next state SHA required'}
$next=Get-Content -LiteralPath $NextStateFile -Raw|ConvertFrom-Json -DateKind String
$expectedNext=if($Role -eq 'adminBrowser'){'adminNext'}else{'kidsNext'}
if($next.owner -cne $plan.owner -or $next.run -cne $plan.run -or $next.role -cne $expectedNext -or -not(Same-Witness $next.root (Process-Witness $next.root.processId))){throw 'Own live Next root witness required'}
if($plan.roles.$expectedNext.prefixArgv.Count -ne 1 -or $plan.roles.$expectedNext.prefixArgv[0] -cne '--max-old-space-size=1536'){throw 'Reviewed Next heap1536 required'}
if($next.root.executable -cne $plan.roles.$expectedNext.binary -or -not $next.root.cli.Contains($plan.adapter) -or -not $next.root.cli.Contains('--max-old-space-size=1536')){throw 'Next actual launch shape differs from reviewed heap/adapter'}
foreach($oldState in @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'windows-jobs') -Filter owned-process.json -Recurse -ErrorAction SilentlyContinue)) {
 $old=Get-Content -LiteralPath $oldState.FullName -Raw|ConvertFrom-Json -DateKind String
 if($old.role -in @('adminBrowser','kidsBrowser')){
  foreach($w in @($old.root)+@($old.observedTree)){if($w -and (Same-Witness $w (Process-Witness $w.processId))){throw 'Another own browser tree is still present'}}
 }
}
$now=[datetimeoffset]::UtcNow
if($now -ge $StartCutoff -or $now.AddSeconds(360) -gt $WindowEnd){throw 'No remaining granted six-minute browser interval'}
$deadline=$now.AddSeconds(360);$softDeadline=$deadline.AddSeconds(-30)
$known=@{};$known["$($next.root.processId):$($next.root.createdAt)"]=$next.root
do{$before=$known.Count;Capture-OwnedTree $next.root $known}while($known.Count -gt $before)
$nextWorking=0.0
foreach($w in $known.Values){if(-not(Same-Witness $w (Process-Witness $w.processId))){throw 'Next tree changed during admission'};$nextWorking+=(Get-Process -Id $w.processId -ErrorAction Stop).WorkingSet64/1MB}
$audience=if($Role -eq 'adminBrowser'){'admin'}else{'kids'}
$browserMiB=if($Role -eq 'adminBrowser'){1024}else{1536}
if($nextWorking -gt 2048){Refuse-BrowserAdmission 'Next exceeded the approved fixed attempt envelope' @{nextTreeWorkingSetMiB=$nextWorking;nextTreeBudgetMiB=2048}}
$requiredFree=[math]::Ceiling(($browserMiB+[math]::Max(0,2048-$nextWorking)+256+512)/256)*256
$freeMiB=[double](Get-CimInstance Win32_OperatingSystem -Property FreePhysicalMemory).FreePhysicalMemory/1024
if($freeMiB -lt $requiredFree){Refuse-BrowserAdmission 'Browser incremental preflight refused' @{nextTreeWorkingSetMiB=$nextWorking;observedFreeMiB=$freeMiB;requiredFreeMiB=$requiredFree}}
$jobDir=Join-Path $PSScriptRoot ('windows-jobs/'+$Role+'-'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $jobDir -ErrorAction Stop|Out-Null
$admissionPath=Join-Path $jobDir 'admission.json'
$admission=@{version=1;role=$audience;attemptId=[guid]::NewGuid().ToString();reviewedPlanSha256=$ExpectedPlanSha256;observedAt=[datetimeoffset]::UtcNow.ToString('o');nextTree=@{role=$expectedNext;processId=$next.root.processId;createdAt=$next.root.createdAt;executable=$next.root.executable;cliSha256=$next.root.cliSha256;workingSetMiB=$nextWorking};envelopes=@{browserMiB=$browserMiB;nextTreeMiB=2048;retainedBaseGrowthMiB=256;hostReserveMiB=512}}
Write-Durable $admission $admissionPath -Exclusive
$admissionSha=(Get-FileHash -LiteralPath $admissionPath -Algorithm SHA256).Hash.ToLowerInvariant()
$homeDir=Join-Path $jobDir 'home';New-Item -ItemType Directory -Path $homeDir -ErrorAction Stop|Out-Null
$StateFile=Join-Path $jobDir 'owned-process.json'
$job=@{version=1;owner=$plan.owner;run=$plan.run;nonce=[guid]::NewGuid().ToString('N');role=$Role;cwd=$spec.cwd;entry=$spec.entry;entrySha256=$spec.entrySha256;entryExport=$spec.entryExport;argv=@($InputFile,(Join-Path $jobDir 'scenario'),$admissionPath,$admissionSha);stopRequest=(Join-Path $jobDir 'stop.request');signalReceipt=(Join-Path $jobDir 'signal.json');failureReceipt=(Join-Path $jobDir 'failure.json');claimFile=(Join-Path $jobDir 'owner.claim.json');claimReceipt=(Join-Path $jobDir 'claim-accepted.json');stateFile=$StateFile;envFile=$envPath;envSha256=$ExpectedEnvSha256;cleanPath=$plan.cleanPath;home=$homeDir;runComplete=(Join-Path $jobDir 'run-complete.json');completionAck=(Join-Path $jobDir 'completion-ack.json')}
$jobPath=Join-Path $jobDir 'job.json';Write-Durable $job $jobPath -Exclusive
$bootstrapEnv=@{NODE_OPTIONS='';BUN_OPTIONS='';NODE_PATH='';NODE_V8_COVERAGE='';NODE_USE_ENV_PROXY='';HTTP_PROXY='';HTTPS_PROXY='';ALL_PROXY='';HOME=$homeDir;USERPROFILE=$homeDir;PATH=$plan.cleanPath;NODE_ENV='test'}
$credentialKeys=if($Role -eq 'adminBrowser'){@('STUDIO_LESSONS_QA_ADMIN_EMAIL','STUDIO_LESSONS_QA_ADMIN_PASSWORD')}else{@('STUDIO_LESSONS_QA_PARENT_EMAIL','STUDIO_LESSONS_QA_PARENT_PASSWORD','STUDIO_LESSONS_QA_LEARNER_ID')}
foreach($key in $credentialKeys){$value=[Environment]::GetEnvironmentVariable($key);if(-not $value){throw 'Missing in-memory QA credentials'};$bootstrapEnv[$key]=$value}
$argv=@($spec.prefixArgv)+@($plan.adapter,$jobPath)
if(@($argv|Where-Object{$_ -match '[\s"]'}).Count){throw 'Reviewed fixed Windows argv shape required'}
$process=$null
try {
 if([datetimeoffset]::UtcNow -ge $StartCutoff){throw 'Start cutoff passed during browser preflight'}
 $process=Start-Process -FilePath $spec.binary -ArgumentList $argv -WorkingDirectory $spec.cwd -WindowStyle Hidden -PassThru -Environment $bootstrapEnv -RedirectStandardOutput (Join-Path $jobDir 'stdout.log') -RedirectStandardError (Join-Path $jobDir 'stderr.log')
 $handle=$process.SafeHandle
 if($handle.IsInvalid -or $handle.IsClosed){throw 'Exact newly launched handle required'}
 $root=Process-Witness $process.Id
 if(-not $root -or $root.executable -cne $spec.binary -or -not $root.cli.Contains($plan.adapter) -or -not $root.cli.Contains($jobPath)){throw 'Exact new browser runner witness required'}
 $state=[pscustomobject]@{version=2;nonce=$job.nonce;owner=$plan.owner;run=$plan.run;role=$Role;status='witnessed-awaiting-app';root=$root;envSha256=$ExpectedEnvSha256;inputSha256=$ExpectedInputSha256;admissionSha256=$admissionSha;ports=@();observedTree=@();forced=$false;stopRequest=$job.stopRequest}
 Save $state $StateFile
 $pendingClaim=Join-Path $jobDir 'owner.claim.pending.json'
 Write-Durable @{version=1;nonce=$job.nonce;pid=$process.Id;stateSha256=(Get-FileHash -LiteralPath $StateFile -Algorithm SHA256).Hash.ToLowerInvariant()} $pendingClaim -Exclusive
 [IO.File]::Move($pendingClaim,$job.claimFile,$false)
} catch {
 # Before claim the adapter cannot import a scenario or create Chrome.
 if($process -and -not(Test-Path -LiteralPath $job.claimFile) -and -not $process.HasExited){$process.Kill($true);$process.WaitForExit(5000)|Out-Null}
 throw
} finally {
 foreach($key in $credentialKeys){$bootstrapEnv.Remove($key)}
}
Write-Output "START $Role PID=$($process.Id) deadline=$($deadline.ToString('o')); state=$StateFile"
try {
 $result=Watch-OwnedBrowser $process $state $StateFile $job $softDeadline $deadline
 Write-Output "END $Role state=$($result.status) exit=$($result.processExitCode); stateFile=$StateFile"
 if($result.status -ne 'completed-owned-tree-exited'){exit 1}
} finally {$process.Dispose()}
