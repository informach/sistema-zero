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
@{state='PASS-INERT-ONLY';controls=$count;nativeCalls=0;processStarts=0;providerCalls=0;browserStarts=0;rawMarkerPersisted=$false}|ConvertTo-Json
