# Pure observer controls. CIM/kernel-retention boundaries are inert; no processes.
param([string]$Operators)
$ErrorActionPreference='Stop'
if(-not $Operators){$Operators=Join-Path (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path 'packages/community-kids/tests/e2e/windows'}
. (Join-Path $Operators 'python-lesson-process-ownership.ps1')
. (Join-Path $Operators 'python-lesson-browser-watch.ps1')
$script:rows=@{}
foreach($base in @(100,200,300)){
 for($i=0;$i -lt 6;$i++){$id=$base+$i;$script:rows[$id]=[pscustomobject]@{ProcessId=$id;ParentProcessId=$(if($i){$id-1}else{0});CreationDate=([datetime]'2026-10-20T00:00:00Z').AddSeconds($i);ExecutablePath='inert.exe';CommandLine='inert-closed'}}
}
$script:queries=0;$script:unknown=$false
function Get-CimInstance {param($ClassName,$Property,$Filter,$ErrorAction)
 $script:queries++
 if($script:unknown){throw 'inert-CIM-unknown'}
 if($ClassName -eq 'Win32_OperatingSystem'){return @{FreePhysicalMemory=4096*1024}}
 if($ClassName -ne 'Win32_Process'){throw 'Unexpected query'}
 if(-not $Filter){return @($script:rows.Values)}
 if($Filter -match '^ProcessId=(\d+)$'){return $script:rows[[int]$Matches[1]]}
 if($Filter -match '^ParentProcessId=(\d+)$'){return @($script:rows.Values|Where-Object ParentProcessId -eq ([int]$Matches[1]))}
 throw 'Unexpected filter'
}
# Only the kernel handle boundary is fake. Tree traversal, snapshot conversion,
# monitor initialization and observations are the actual implementation.
function Retain-OwnedProcess($Witness){$metrics=[pscustomobject]@{WorkingSet64=1MB};$metrics|Add-Member ScriptMethod Refresh {};return @{process=$metrics;ownsProcess=$false;processId=$Witness.processId}}
function Retained-OwnedProcessAlive($Record){return $null -ne $Record}
function Owned-StatePath($Path){return $Path}
$roots=@(Process-Witness 100;Process-Witness 200;Process-Witness 300)
$directory=Join-Path $env:TEMP ('lesson-snapshot-inert-'+[guid]::NewGuid().ToString('N'))
$next=@{root=$roots[0];stopRequest=(Join-Path $directory 'stop.request')}
$script:queries=0
$context=New-LessonCompactMonitor $next (Join-Path $directory 'owned-process.json') @($roots[1],$roots[2])
$initQueries=$script:queries
$script:queries=0
$sample=Get-LessonCompactObservation $context 1
$sampleQueries=$script:queries
if($sample.nextMiB -ne 6 -or $context.baselineBaseMiB -ne 12 -or $sample.baseGrowthMiB -ne 0){throw 'Tree metrics changed'}
# With a deterministic300ms CIM cost, N+1 work must not consume the adapter's10s.
if($initQueries -gt 1 -or $sampleQueries -gt 2){throw "N+1 observer regression: init=$initQueries sample=$sampleQueries; modeled preclaim=$(( $initQueries+$sampleQueries)*300)ms"}
$script:unknown=$true;$failed=$false
try{Get-LessonCompactObservation $context 1|Out-Null}catch{$failed=$_.Exception.Message.Contains('inert-CIM-unknown')}
if(-not $failed){throw 'Unknown snapshot was accepted'}
$script:unknown=$false
$saved=$script:rows[100];$script:rows[100]=[pscustomobject]@{ProcessId=100;ParentProcessId=0;CreationDate=$saved.CreationDate.AddSeconds(20);ExecutablePath='inert.exe';CommandLine='inert-closed'}
$failed=$false;try{Get-LessonCompactObservation $context 1|Out-Null}catch{$failed=$true}
if(-not $failed){throw 'Changed root identity accepted'}
$script:rows[100]=$saved
Close-LessonCompactMonitor $context
Write-Output "SNAPSHOT controls passed: initQueries=$initQueries sampleQueries=$sampleQueries; 18nodes/3roots; unknown+identityNEG; no process/network"
