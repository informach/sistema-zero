param([ValidateSet('Plan','Run')][string]$Action='Plan',[string]$ExpectedNativeSha256,[string]$PwshBinary,[string]$ExpectedPwshSha256,[string]$ExpectedFixtureSha256,[datetimeoffset]$StartCutoff,[datetimeoffset]$WindowEnd)
$ErrorActionPreference='Stop'
if($Action -eq 'Plan'){Write-Output 'PREPARED ONLY: named-job lifecycle proof. No native query/process/job started.';return}
$root=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
. (Join-Path $root 'packages/community-kids/tests/e2e/windows/python-lesson-process-ownership.ps1')
. (Join-Path $root 'packages/community-kids/tests/e2e/windows/python-lesson-windows-job.ps1')
Initialize-OwnedJobNative $ExpectedNativeSha256
$fixture=Join-Path $PSScriptRoot 'python-lesson-native-named-fixture.ps1'
foreach($pin in @(@{path=$PwshBinary;sha=$ExpectedPwshSha256},@{path=$fixture;sha=$ExpectedFixtureSha256})){if($pin.sha -cnotmatch '^[a-f0-9]{64}$' -or (Get-FileHash -LiteralPath $pin.path).Hash.ToLowerInvariant() -cne $pin.sha){throw 'Exact native fixture/binary pins required'}}
if([datetimeoffset]::UtcNow -ge $StartCutoff -or ($WindowEnd-[datetimeoffset]::UtcNow).TotalSeconds -lt 20){throw 'Fresh Root window20s required'}
$directory=Join-Path $root ('.cache/lesson-native-named/'+[guid]::NewGuid().ToString('N'));New-Item -ItemType Directory -Path $directory -ErrorAction Stop|Out-Null
$nonce=[guid]::NewGuid().ToString('N');$creator=$null;$query=$null;$process=$null;$reference=$null;$primary=$null;$close=$null;$checks=0
function Check([bool]$Value){if(-not $Value){throw 'Named native control refused'};$script:checks++}
try{
 $creator=New-OwnedJobContext 'qa-native-control' $nonce 'nativeControl' $nonce
 $environment=@{};foreach($key in @('SystemRoot','WINDIR','COMSPEC','PROGRAMFILES','PROGRAMFILES(X86)')){if([Environment]::GetEnvironmentVariable($key)){$environment[$key]=[Environment]::GetEnvironmentVariable($key)}}
 $environment.TEMP=$directory;$environment.TMP=$directory;$environment.USERPROFILE=$directory;$environment.HOME=$directory
 $arguments=@('-NoProfile','-NonInteractive','-File',$fixture,'-Directory',$directory,'-Nonce',$nonce,'-EndUtc',[datetimeoffset]::UtcNow.AddSeconds(12).ToString('o'))
 $info=New-OwnedJobLaunchInfo $PwshBinary $arguments $directory $environment
 if([datetimeoffset]::UtcNow -ge $StartCutoff){throw 'Native start cutoff passed'}
 $process=[Diagnostics.Process]::Start($info)
 $witness=Get-OwnedJobCreatorWitness $creator $process $info $ExpectedPwshSha256
 Write-Durable $witness (Join-Path $directory 'creator.json') -Exclusive
 Confirm-OwnedJobCreator $creator;$reference=Get-OwnedJobReference $creator
 Write-Durable @{pid=$process.Id;nonce=$nonce} (Join-Path $directory 'claim.json') -Exclusive
 $deadline=[datetimeoffset]::UtcNow.AddSeconds(10)
 while(-not(Test-Path -LiteralPath (Join-Path $directory 'ready.json'))){if([datetimeoffset]::UtcNow -ge $deadline -or $process.HasExited){throw 'Native fixture readiness failed'};Start-Sleep -Milliseconds 20}
 $query=Open-OwnedJobContext $reference
 Check ((Read-OwnedJobObservation $query).liveProcessIds -contains $process.Id)
 $denied=$false;try{[SzLessonOwned.Native]::Assign($query.job,$process.SafeHandle)}catch{$cause=$_.Exception.GetBaseException();$denied=$cause.GetType().FullName -ceq 'SzLessonOwned.NativeFailure' -and $cause.Operation -ceq 'AssignProcessToJobObject' -and $cause.NativeCode -eq 5};Check $denied
 $collision=$false;try{$unexpected=[SzLessonOwned.Native]::CreateNamed($reference.name);$unexpected.Dispose()}catch{$cause=$_.Exception.GetBaseException();$collision=$cause.GetType().FullName -ceq 'SzLessonOwned.NativeFailure' -and $cause.Operation -ceq 'JobNameCollision'};Check $collision
 Close-OwnedJobContext $query|Out-Null;$query=$null
 # Keep only the exact created Process handle; release ALL job handles while
 # the worker is alive, then prove named reopen still binds the same native root.
 $creator.rootProcess=$null;Close-OwnedJobContext $creator|Out-Null;$creator=$null
 $query=Open-OwnedJobContext $reference
 Check (Test-OwnedJobRootAlive $query)
 Write-Durable @{nonce=$nonce} (Join-Path $directory 'stop.request') -Exclusive
 Check ($process.WaitForExit(12000) -and $process.ExitCode -eq 0)
 $process.Dispose();$process=$null
 $close=Close-OwnedJobContext $query -RequireEmpty;$query=$null
 Check $close.cleanupConfirmed
}catch{$primary=@{type=$_.Exception.GetBaseException().GetType().Name;operation=$(if($_.Exception.GetBaseException().GetType().FullName -ceq 'SzLessonOwned.NativeFailure'){$_.Exception.GetBaseException().Operation}else{'named-control'});nativeCode=$(if($_.Exception.GetBaseException().GetType().FullName -ceq 'SzLessonOwned.NativeFailure'){$_.Exception.GetBaseException().NativeCode}else{0})}}finally{
 if(-not(Test-Path -LiteralPath (Join-Path $directory 'stop.request'))){Write-Durable @{nonce=$nonce} (Join-Path $directory 'stop.request') -Exclusive}
 if($process){$remaining=[math]::Max(0,[math]::Min(12000,($WindowEnd-[datetimeoffset]::UtcNow).TotalMilliseconds));[void]$process.WaitForExit([int]$remaining);$process.Dispose()}
 if($query){$close=Close-OwnedJobContext $query -RequireEmpty}
 if($creator){$close=Close-OwnedJobContext $creator -RequireEmpty}
 $receipt=@{state=$(if(-not $primary -and $close.cleanupConfirmed){'PASS-native-named-only'}else{'NEG'});checks=$checks;primary=$primary;cleanup=$close;reference=$reference;operatorForceUsed=$false;productQualified=$false;completedAt=[datetimeoffset]::UtcNow.ToString('o')}
 Write-Durable $receipt (Join-Path $directory 'receipt.json') -Exclusive
}
$receipt|ConvertTo-Json -Depth 8
if($receipt.state -cne 'PASS-native-named-only'){exit 1}
