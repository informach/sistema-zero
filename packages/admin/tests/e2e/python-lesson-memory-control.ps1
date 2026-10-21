# Pure/inert filesystem controls. Never launches a process, browser or listener.
$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$operators=Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows'
. (Join-Path $operators 'python-lesson-process-ownership.ps1')
. (Join-Path $operators 'python-lesson-memory-watch.ps1')
$out=Join-Path $taskRoot ('.cache/lessons-compact-controls/'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $out -ErrorAction Stop|Out-Null
$count=0
function Assert-Control([bool]$Condition,[string]$Name){if(-not $Condition){throw "Compact control failed: $Name"};$script:count++}
$valid=@{freeMiB=512;nextMiB=1024;browserMiB=1024;baseGrowthMiB=128;ownershipComplete=$true}
Assert-Control (-not(Test-LessonCompactSample $valid).negative) 'exact boundaries'
foreach($key in @('freeMiB','nextMiB','browserMiB','baseGrowthMiB')){
 $bad=$valid.Clone();$bad[$key]=if($key -eq 'freeMiB'){511.99}else{$valid[$key]+0.01}
 Assert-Control (Test-LessonCompactSample $bad).negative ('exceeded-'+$key)
 $bad=$valid.Clone();$bad[$key]=$null
 Assert-Control (Test-LessonCompactSample $bad).negative ('unknown-'+$key)
}
$bad=$valid.Clone();$bad.nextMiB=[double]::NaN
Assert-Control (Test-LessonCompactSample $bad).negative 'NaN'
$bad=$valid.Clone();$bad.ownershipComplete=$false
Assert-Control (Test-LessonCompactSample $bad).negative 'incomplete ownership'
Assert-Control (-not(Test-LessonCompactSample $bad).forceAuthorized) 'no force authority'
# Exercise the real normal-stop writer and exclusive handoff lock with only own files.
$stop=Join-Path $out 'stop.request'
Request-LessonNormalStop $stop
$first=(Get-FileHash -LiteralPath $stop -Algorithm SHA256).Hash
Request-LessonNormalStop $stop
Assert-Control ((Get-FileHash -LiteralPath $stop -Algorithm SHA256).Hash -ceq $first) 'normal stop is not overwritten'
$failed=$false
try{Invoke-LessonCompactLock $out {throw 'inert lock action failure'}}catch{$failed=$true}
Assert-Control $failed 'lock action failure propagated'
$locked=Invoke-LessonCompactLock $out {return 'released-and-reacquired'}
Assert-Control ($locked -ceq 'released-and-reacquired') 'lock released in finally'
# Only the CIM boundary is injected: the actual admission function makes the decision.
function Get-CimInstance {param($ClassName,$Property);return @{FreePhysicalMemory=$script:controlFreeMiB*1024}}
try{
 $script:controlFreeMiB=2688
 Assert-Control ((Assert-LessonCompactNextAdmission) -eq 2688) 'whole composition admitted at boundary'
 $script:controlFreeMiB=2687.99;$refused=$false
 try{Assert-LessonCompactNextAdmission|Out-Null}catch{$refused=$true}
 Assert-Control $refused 'whole composition refused below boundary'
}finally{Remove-Item Function:Get-CimInstance}
# Deterministic interleaving control: execute the actual warmup against inert
# filesystem/context boundaries and prove its SAMPLE holds the handoff lock.
$next=[pscustomobject]@{root=[pscustomobject]@{cli='node --max-old-space-size=768'};stopRequest=(Join-Path $out 'next.stop.request')}
$script:sampleHeldLock=$false
function New-LessonCompactMonitor($Next,$StateFile,$BaseRoots){return [pscustomobject]@{next=$Next;directory=$out;baselineBaseMiB=0;baseRoots=@()}}
function Close-LessonCompactMonitor($Context){}
function Request-LessonCompactNextStop($Context){Request-LessonNormalStop $Context.next.stopRequest}
function Get-LessonCompactObservation($Context,$BrowserMiB){
 try{$opened=[IO.File]::Open((Join-Path $out 'compact-memory.lock'),[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None);$opened.Dispose()}
 catch [IO.IOException]{$script:sampleHeldLock=$true}
 return @{freeMiB=511;nextMiB=606;browserMiB=0;baseGrowthMiB=0;ownershipComplete=$true;observedAt=[datetimeoffset]::UtcNow.ToString('o')}
}
$warmupRefused=$false
try{Watch-LessonCompactNextWarmup $next (Join-Path $out 'next-state.json') @('inert-root') ([datetimeoffset]::UtcNow.AddSeconds(5))}catch{$warmupRefused=$true}
Assert-Control $warmupRefused 'negative warmup refused'
Assert-Control $script:sampleHeldLock 'warmup sample itself serialized with claim'
Assert-Control (Get-Content -LiteralPath (Join-Path $out 'compact-memory.json') -Raw|ConvertFrom-Json).negative 'warmup negative latch persisted'
# Run the actual browser handoff critical section after the refused sample.
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path $operators 'python-lesson-browser-watch.ps1'),[ref]$tokens,[ref]$errors)
$critical=$ast.FindAll({param($node)$node -is [Management.Automation.Language.CommandAst] -and $node.GetCommandName() -ceq 'Invoke-LessonCompactLock'},$true)|Select-Object -First 1
$body=($critical.CommandElements|Where-Object{$_ -is [Management.Automation.Language.ScriptBlockExpressionAst]}).ScriptBlock.Extent.Text
$compactContext=[pscustomobject]@{next=$next;directory=$out};$StateFile=Join-Path $out 'state.json';$State=@{root=@{}};$Job=@{claimFile=(Join-Path $out 'forbidden-claim.json')}
# Independently exercise the negative latch; the preceding control already proved
# the normal stop file. Removing ONLY this inert file prevents that earlier guard
# from masking the latch check in the actual critical section.
Remove-Item -LiteralPath (Join-Path $out 'next.stop.request')
$blocked=$false
try{Invoke-LessonCompactLock $out ([scriptblock]::Create($body.Substring(1,$body.Length-2)))}catch{$blocked=$true}
Assert-Control ($blocked -and -not(Test-Path -LiteralPath $Job.claimFile)) 'actual handoff refuses latched negative without claiming scenario'
Write-Durable @{state='pure-and-filesystem-controls-passed';assertions=$count;noProcesses=$true;noBrowser=$true;noHttp=$true;noServices=$true;forceAuthorized=$false} (Join-Path $out 'receipt.json') -Exclusive
Write-Output "COMPACT controls=$count; receipt=$(Join-Path $out 'receipt.json')"
