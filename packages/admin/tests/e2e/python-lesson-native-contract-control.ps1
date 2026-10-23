$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
. (Join-Path $root 'packages/community-kids/tests/e2e/windows/python-lesson-windows-job.ps1')
$count=0
function Check([bool]$Value){if(-not $Value){throw 'Native contract inert control refused'};$script:count++}
$name='Local\SistemaZero-QA-'+('a'*32);$hash='b'*64
$w=New-OwnedJobWitness 101 '134370339555391421' 'C:/inert/node.exe' $hash @('argument with spaces','--max-old-space-size=768') $name
$same=New-OwnedJobWitness 101 '134370339555391421' 'C:/inert/node.exe' $hash @('argument with spaces','--max-old-space-size=768') $name
Check (Test-SameOwnedJobWitness $w $same)
Check (([datetime]::Parse($w.createdAt).ToFileTimeUtc().ToString()) -ceq $w.creationFileTime)
Check ($w.argv.Count -eq 2 -and $w.argv[0] -ceq 'argument with spaces')
$changed=New-OwnedJobWitness 101 '134370339555391422' 'C:/inert/node.exe' $hash @('argument with spaces','--max-old-space-size=768') $name
Check (-not(Test-SameOwnedJobWitness $w $changed))
Check (-not(Test-SameOwnedJobWitness $w @{processId=101;createdAt=$w.createdAt;executable=$w.executable;cliSha256=$w.cliSha256}))
$different=New-OwnedJobWitness 101 $w.creationFileTime 'C:/inert/node.exe' $hash @('different') $name
Check (-not(Test-SameOwnedJobWitness $w $different))
$info=New-OwnedJobLaunchInfo 'C:/inert/node.exe' @('one argument with spaces','C:/inert/entry.mjs') 'C:/inert/cwd' @{LOCALAPPDATA='C:/owned/Local';APPDATA='C:/owned/Roaming'}
Check (-not $info.UseShellExecute -and $info.CreateNoWindow -and $info.RedirectStandardOutput -and $info.RedirectStandardError)
Check ($info.ArgumentList.Count -eq 2 -and $info.ArgumentList[0] -ceq 'one argument with spaces')
Check ($info.WorkingDirectory -ceq 'C:/inert/cwd' -and $info.Environment.Count -eq 2)
$refused=$false;try{New-OwnedJobWitness 0 $w.creationFileTime 'C:/inert/node.exe' $hash @() $name|Out-Null}catch{$refused=$true};Check $refused
$refused=$false;try{New-OwnedJobWitness 101 'invalid' 'C:/inert/node.exe' $hash @() $name|Out-Null}catch{$refused=$true};Check $refused
$refused=$false;try{New-OwnedJobWitness 101 $w.creationFileTime 'C:/inert/node.exe' $hash @() 'Global\foreign'|Out-Null}catch{$refused=$true};Check $refused
$refused=$false;try{New-OwnedJobLaunchInfo 'relative.exe' @() 'C:/inert' @{}|Out-Null}catch{$refused=$true};Check $refused
# Compile the pinned declarations; do not invoke a native job/process function.
$source=Join-Path $root 'packages/community-kids/tests/e2e/windows/python-lesson-windows-job.cs'
Initialize-OwnedJobNative (Get-FileHash -LiteralPath $source).Hash.ToLowerInvariant()
Check ([bool]('SzLessonOwned.Native' -as [type]))
@{state='PASS-INERT-ONLY';controls=$count;nativeCalls=0;processStarts=0;compileOnly=$true}|ConvertTo-Json
