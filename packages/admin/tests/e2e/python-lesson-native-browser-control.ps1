$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
. (Join-Path $root 'packages/community-kids/tests/e2e/windows/python-lesson-windows-job.ps1')
. (Join-Path $root 'packages/community-kids/tests/e2e/windows/python-lesson-native-browser-common.ps1')
$count=0
function Check([bool]$Value){if(-not $Value){throw 'Native browser inert control refused'};$script:count++}
function Refuses([scriptblock]$Run){try{& $Run|Out-Null;return $false}catch{return $true}}
$legacy=New-OwnedJobLaunchInfo 'C:/own/node.exe' @('a b') 'C:/own' @{}
$private=New-OwnedJobLaunchInfo 'C:/own/node.exe' @('a b') 'C:/own' @{} -RedirectInput
Check (-not $legacy.RedirectStandardInput)
Check ($private.RedirectStandardInput -and $private.CreateNoWindow -and -not $private.UseShellExecute -and $private.Environment.Count -eq 0)
Check (Test-OwnedBrowserBudget 1024 512)
Check (-not(Test-OwnedBrowserBudget 1024.01 512))
Check (-not(Test-OwnedBrowserBudget 100 511.99))
Check (Refuses {Test-OwnedBrowserBudget ([double]::NaN) 600})
Check (Refuses {Test-OwnedBrowserBudget 100 ([double]::PositiveInfinity)})
Check (Refuses {Test-OwnedBrowserBudget -1 600})
$nonce='inert-nonce';$valid=@{version=1;pid=101;nonce=$nonce;state='PASS';browserClosed=$true;functionalPassed=$true;sshClosed=$true}
Check (Test-OwnedBrowserCompletion $valid $nonce 101)
Check (-not(Test-OwnedBrowserCompletion $valid 'other' 101))
Check (-not(Test-OwnedBrowserCompletion $valid $nonce 102))
foreach($key in @('browserClosed','functionalPassed','sshClosed')){$bad=$valid.Clone();$bad[$key]=$false;Check (-not(Test-OwnedBrowserCompletion $bad $nonce 101))}
$negative=$valid.Clone();$negative.state='NEG';$negative.functionalPassed=$false
Check (Test-OwnedBrowserCompletion $negative $nonce 101)
$bad=$valid.Clone();$bad.state='unknown';Check (-not(Test-OwnedBrowserCompletion $bad $nonce 101))
$bad=$valid.Clone();$bad.browserClosed='true';Check (-not(Test-OwnedBrowserCompletion $bad $nonce 101))
# Exercise the real opaque reader/writer with streams, not provider mocks or
# process/browser startup. Whitespace/newlines are preserved without JSON parse.
$bytes=[Text.Encoding]::UTF8.GetBytes("opaque`nnot-json`n")
$inputStream=[IO.MemoryStream]::new($bytes,$false)
try{$received=Read-OwnedProviderBytes $inputStream;Check ([Convert]::ToHexString($received) -ceq [Convert]::ToHexString($bytes))}finally{$inputStream.Dispose()}
$outputStream=[IO.MemoryStream]::new();Send-OwnedProviderBytes $outputStream $received
Check ([Convert]::ToHexString($outputStream.ToArray()) -ceq [Convert]::ToHexString($bytes))
Check (-not $outputStream.CanWrite)
$inputStream=[IO.MemoryStream]::new([byte[]]::new(32768),$false)
try{Check ((Read-OwnedProviderBytes $inputStream).Length -eq 32768)}finally{$inputStream.Dispose()}
$inputStream=[IO.MemoryStream]::new([byte[]]::new(32769),$false)
try{Check (Refuses {Read-OwnedProviderBytes $inputStream})}finally{$inputStream.Dispose()}
$inputStream=[IO.MemoryStream]::new()
try{Check (Refuses {Read-OwnedProviderBytes $inputStream})}finally{$inputStream.Dispose()}
Check ((ConvertTo-OwnedChromeMarker 'secret-not-for-output <will force kill>') -ceq 'library-force-mentioned')
Check ((ConvertTo-OwnedChromeMarker 'arbitrary-private-content') -ceq 'other')
try{throw 'arbitrary-secret-marker'}catch{$failure=ConvertTo-OwnedBrowserFailure $_ 'inert';Check (($failure|ConvertTo-Json -Compress) -notmatch 'arbitrary-secret-marker')}
try{throw 'browser-memory-budget'}catch{Check ((ConvertTo-OwnedBrowserFailure $_ 'scenario').code -ceq 'browser-memory-budget')}
# Project already obtained native metrics; do not re-query a process or infer
# unique physical RAM by subtracting private commit from working set.
$rootIdentity=@{processId=101;creationFileTime='134370389358208947'}
$observation=@{workingSetMiB=300;privateMiB=500;ownershipComplete=$true;observed=@(
 @{processId=101;creationFileTime=$rootIdentity.creationFileTime;exited=$false;workingSetBytes=100MB;privateCommitBytes=200MB;secret='arbitrary-marker'},
 @{processId=102;creationFileTime='134370389358208948';exited=$false;workingSetBytes=200MB;privateCommitBytes=300MB},
 @{processId=103;creationFileTime='134370389358208949';exited=$true;workingSetBytes=$null;privateCommitBytes=$null}
)}
$at=[datetimeoffset]::Parse('2026-10-21T06:49:00.1234567Z')
$sample=New-OwnedBrowserMemorySnapshot $observation $rootIdentity 2048 500 $at 20 'preclaim'
Check ($sample.rows.Count -eq 2 -and $sample.rootWorkingSetMiB -eq 100 -and $sample.descendantWorkingSetMiB -eq 200)
Check ($sample.privateCommitMiB -eq 500 -and $sample.rootPrivateCommitMiB -eq 200 -and $sample.descendantPrivateCommitMiB -eq 300)
Check ($sample.rows[0].kind -ceq 'root-node' -and $sample.rows[1].kind -ceq 'owned-descendant')
Check ($sample.observedAt -ceq $at.ToString('o') -and $sample.elapsedMs -eq 500 -and $sample.sampleDurationMs -eq 20)
Check (($sample|ConvertTo-Json -Depth 8 -Compress) -notmatch 'arbitrary-marker|secret')
$unknownPhase=New-OwnedBrowserMemorySnapshot $observation $rootIdentity 2048 500 $at 20 'arbitrary-marker'
Check ($unknownPhase.phase -ceq 'unknown')
$snapshots=[pscustomobject]@{preclaim=$null;lastPositive=$null;firstNegative=$null;peak=$null}
Record-OwnedBrowserMemorySnapshot $snapshots $sample (Test-OwnedBrowserBudget $sample.workingSetMiB $sample.freeMiB)
Check ($snapshots.preclaim -eq $sample -and $snapshots.peak -eq $sample -and $null -eq $snapshots.firstNegative)
$observation.workingSetMiB=1024
$observation.observed[1].workingSetBytes=924MB
$positive=New-OwnedBrowserMemorySnapshot $observation $rootIdentity 2048 1000 $at 20 'scenario'
Record-OwnedBrowserMemorySnapshot $snapshots $positive (Test-OwnedBrowserBudget $positive.workingSetMiB $positive.freeMiB)
Check ($snapshots.lastPositive -eq $positive -and $snapshots.preclaim -eq $sample)
$observation.workingSetMiB=1077.73046875
$observation.observed[1].workingSetBytes=[ulong](977.73046875*1MB)
$breach=New-OwnedBrowserMemorySnapshot $observation $rootIdentity 2048 1500 $at 20 'scenario'
Record-OwnedBrowserMemorySnapshot $snapshots $breach (Test-OwnedBrowserBudget $breach.workingSetMiB $breach.freeMiB)
Check ($snapshots.firstNegative -eq $breach -and $snapshots.peak -eq $breach -and $snapshots.lastPositive -eq $positive)
$observation.workingSetMiB=1025
$observation.observed[1].workingSetBytes=925MB
$later=New-OwnedBrowserMemorySnapshot $observation $rootIdentity 2048 2000 $at 20 'scenario'
Record-OwnedBrowserMemorySnapshot $snapshots $later (Test-OwnedBrowserBudget $later.workingSetMiB $later.freeMiB)
Record-OwnedBrowserMemorySnapshot $snapshots $sample $true
Check ($snapshots.firstNegative -eq $breach -and $snapshots.peak -eq $breach -and $snapshots.lastPositive -eq $positive)
$observation.observed=@(1..1025|ForEach-Object{@{processId=$_;creationFileTime='134370389358208947';exited=$false;workingSetBytes=1;privateCommitBytes=2}})
$observation.workingSetMiB=1025/1MB;$observation.privateMiB=2050/1MB
$bounded=New-OwnedBrowserMemorySnapshot $observation $rootIdentity 2048 3000 $at 20 'scenario'
Check ($bounded.rows.Count -eq 1024 -and $bounded.rowsTruncated)
$strict=Get-OwnedBrowserPlanMemoryProfile ([pscustomobject]@{})
Check ($strict.resourceProfile -ceq 'strict-browser-1024' -and $strict.jobBudgetMiB -eq 1024 -and $strict.admissionMiB -eq 1536 -and $strict.passState -ceq 'PASS-hosted-js-pro-owned')
$functionalPlan=[pscustomobject]@{resourceProfile='hosted-functional-2048';functionalOnly=$true;performanceQualified=$false}
$functional=Get-OwnedBrowserPlanMemoryProfile $functionalPlan
Check ($functional.jobBudgetMiB -eq 2048 -and $functional.admissionMiB -eq 2560 -and $functional.functionalOnly -and -not $functional.performanceQualified -and $functional.passState -ceq 'PASS-hosted-js-pro-functional')
Check (Test-OwnedBrowserBudget 2048 512 $functional.resourceProfile)
Check (-not(Test-OwnedBrowserBudget 2048.01 512 $functional.resourceProfile))
Check (-not(Test-OwnedBrowserBudget 2048 511.99 $functional.resourceProfile))
# Recorded R3 aggregate remains strict NEG; this is a NEW functional profile,
# not a retroactive qualification or subtraction of Node/GPU/CLI memory.
Check (-not(Test-OwnedBrowserBudget 1405.5546875 2794.46484375))
Check (Test-OwnedBrowserBudget 1405.5546875 2794.46484375 $functional.resourceProfile)
foreach($unknown in @('2048','hosted-functional-4096','HOSTED-FUNCTIONAL-2048','',$null)){
 Check (Refuses {Test-OwnedBrowserBudget 100 2048 $unknown})
 Check (Refuses {Get-OwnedBrowserPlanMemoryProfile ([pscustomobject]@{resourceProfile=$unknown;functionalOnly=$true;performanceQualified=$false})})
}
Check (Refuses {Get-OwnedBrowserPlanMemoryProfile ([pscustomobject]@{resourceProfile='hosted-functional-2048'})})
Check (Refuses {Get-OwnedBrowserPlanMemoryProfile ([pscustomobject]@{resourceProfile='hosted-functional-2048';functionalOnly=$false;performanceQualified=$false})})
Check (Refuses {Get-OwnedBrowserPlanMemoryProfile ([pscustomobject]@{resourceProfile='hosted-functional-2048';functionalOnly=$true;performanceQualified=$true})})
Check (Refuses {Get-OwnedBrowserPlanMemoryProfile ([pscustomobject]@{resourceProfile='strict-browser-1024';performanceQualified=$true})})
Check (Refuses {Get-OwnedBrowserPlanMemoryProfile ([pscustomobject]@{resourceProfile='strict-browser-1024';functionalOnly=$true})})
@{state='PASS-INERT-ONLY';controls=$count;nativeCalls=0;processStarts=0;providerCalls=0;browserStarts=0;rawMarkerPersisted=$false}|ConvertTo-Json
