# Inert nested-error controls. No kernel/process/CIM/network boundary is invoked.
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$operators=Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows'
. (Join-Path $operators 'python-lesson-process-ownership.ps1')
. (Join-Path $operators 'python-lesson-browser-watch.ps1')
$out=Join-Path $taskRoot ('.cache/lesson-monitor-diagnostic-controls/'+[guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($out)|Out-Null
$count=0
function Check([bool]$Condition,[string]$Name){if(-not $Condition){throw "Monitor diagnostic control failed: $Name"};$script:count++}
$marker='private-message-'+[guid]::NewGuid().ToString('N')
$script:fault='known'
# Replace only process-retention/normal-stop boundaries. The nested witness
# converter, browser catch, reconciliation and durable final save are real.
function Retain-OwnedProcess($Witness,$ExistingProcess){
 if($script:fault -ceq 'known'){
  ConvertTo-OwnedProcessWitness ([pscustomobject]@{ExecutablePath=$null;CommandLine=$null})
 }else{throw $marker}
}
function Request-LessonNormalStop($Path){throw ('cleanup-'+$marker)}
$results=@()
foreach($fault in @('known','arbitrary')){
 $script:fault=$fault
 $directory=Join-Path $out $fault;[IO.Directory]::CreateDirectory($directory)|Out-Null
 $stateFile=Join-Path $directory 'owned-process.json'
 $state=[pscustomobject]@{status='inert-before-monitor';observedTree=@();root=[pscustomobject]@{processId=99001;createdAt='2026-10-21T00:00:00Z';parentId=0;executable='inert';cliSha256=('0'*64)};forced=$false}
 $process=[pscustomobject]@{HasExited=$true;ExitCode=1};$process|Add-Member ScriptMethod Refresh {}
 $job=@{compactMemory=@{profileId='lessons-desktop-shared-r1'};stopRequest=(Join-Path $directory 'stop.request')}
 $result=Watch-OwnedBrowser $process $state $stateFile $job ([datetimeoffset]::UtcNow.AddSeconds(1)) ([datetimeoffset]::UtcNow.AddSeconds(2))
 $saved=Get-Content -LiteralPath $stateFile -Raw|ConvertFrom-Json
 Check ($saved.status -ceq 'NEG-monitor-failure') ($fault+' stays NEG')
 Check ($saved.ownershipComplete -eq $false -and $saved.cleanupConfirmed -eq $false) ($fault+' uncertainty preserved')
 Check ($saved.unconfirmedProcessIds.Count -eq 1 -and $saved.unconfirmedProcessIds[0] -eq 99001) ($fault+' missing root handle remains unconfirmed')
 Check ($saved.primaryFailure -ceq 'owned-browser-monitor-failed' -and $saved.monitorFailureName -ceq 'RuntimeException') ($fault+' original failure retained')
 Check (@($saved.secondaryFailures|Where-Object phase -ceq 'stop-request').Count -eq 1) ($fault+' cleanup failure separate')
 Check (-not $saved.forced) ($fault+' no force')
 $serialized=[IO.File]::ReadAllText($stateFile)
 Check (-not $serialized.Contains($marker) -and -not $serialized.Contains($taskRoot) -and -not $serialized.Contains('No complete process witness')) ($fault+' no raw message path or invocation leaked')
 if($fault -ceq 'known'){
  Check ($saved.monitorFailureSource -ceq 'python-lesson-process-ownership.ps1') 'nested original helper leaf'
  $expected=(Select-String -LiteralPath (Join-Path $operators 'python-lesson-process-ownership.ps1') -SimpleMatch "throw 'No complete process witness; refuse ownership inference.'").LineNumber
  Check ($saved.monitorFailureLine -eq $expected -and $saved.monitorFailureLine -gt 0) 'nested original throw line'
  Check ($saved.monitorFailureCode -ceq 'process-witness-incomplete') 'closed original throw code survives cleanup failure'
 }else{
  Check ($saved.monitorFailureSource -ceq 'unknown' -and $saved.monitorFailureLine -eq 0) 'unlisted source redacted'
  Check ($saved.monitorFailureCode -ceq 'unknown') 'arbitrary message is not a diagnostic code'
 }
 $results+=@{fault=$fault;state=$saved.status;source=$saved.monitorFailureSource;line=$saved.monitorFailureLine;code=$saved.monitorFailureCode;uncertaintyPreserved=$true;noMessageLeak=$true}
}
Write-Durable @{state='inert-original-error-diagnostics-passed';controls=$count;cases=$results;processStarts=0;processQueries=0;browserLaunches=0;providerCalls=0} (Join-Path $out 'receipt.json') -Exclusive
Write-Output "DIAGNOSTIC controls=$count; receipt=$(Join-Path $out 'receipt.json')"
