$ErrorActionPreference='Stop'
$taskRoot=(Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$operators=Join-Path $taskRoot 'packages/community-kids/tests/e2e/windows'
. (Join-Path $operators 'python-lesson-process-ownership.ps1')
. (Join-Path $operators 'python-lesson-browser-watch.ps1')
$out=Join-Path $taskRoot ('.cache/lessons-safehandle-r1/control-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $out -ErrorAction Stop|Out-Null
$binary='C:\Users\tocha\projects\sistema-zero-python\.cache\studio-python-l0\bun-1.4.3-isolated\extracted\bun-windows-x64\bun.exe'
$entry=Join-Path $out 'inert-loop.mjs';[IO.File]::WriteAllText($entry,'setInterval(() => {}, 1000)')
$victim=$null;$sentinel=$null;$record=$null;$sentinelRecord=$null;$assertionsPassed=$false;$sentinelWitness=$null
try {
 $victim=Start-Process -FilePath $binary -ArgumentList @('--no-env-file',$entry) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $out 'victim.stdout') -RedirectStandardError (Join-Path $out 'victim.stderr')
 $witness=Process-Witness $victim.Id
 $record=Retain-OwnedProcess $witness $victim
 if(-not $record -or -not(Retained-OwnedProcessAlive $record)){throw 'Cannot retain benign victim'}
 $sentinel=Start-Process -FilePath $binary -ArgumentList @('--no-env-file',$entry) -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $out 'sentinel.stdout') -RedirectStandardError (Join-Path $out 'sentinel.stderr')
 $sentinelWitness=Process-Witness $sentinel.Id
 $sentinelRecord=Retain-OwnedProcess $sentinelWitness $sentinel
 if(-not $sentinelRecord){throw 'Cannot retain unrelated benign sentinel'}
 # A different creation generation for this same PID must be refused.
 $wrong=($witness|ConvertTo-Json|ConvertFrom-Json -DateKind String)
 $wrong.createdAt=([datetimeoffset]$wrong.createdAt).AddTicks(10).ToString('o')
 if($null -ne (Retain-OwnedProcess $wrong)){throw 'Mismatched creation generation accepted'}
 # Deterministic PID-rebinding attempt: never look up or signal the new PID.
 $originalId=$record.processId;$record.processId=$sentinel.Id
 if((Retained-OwnedProcessObservation $record).state -cne 'unknown'){throw 'Rebound identifier was classified as an exit'}
 $reboundRefused=$false
 try{Stop-RetainedOwnedProcess $record|Out-Null}catch{$reboundRefused=$true}
 if(-not $reboundRefused){throw 'Rebound identifier did not refuse unknown ownership'}
 if(-not(Retained-OwnedProcessAlive $sentinelRecord)){throw 'Unrelated sentinel was touched'}
 $record.processId=$originalId
 if(-not(Stop-RetainedOwnedProcess $record)){throw 'Exact retained victim was not stopped'}
 if(-not $victim.WaitForExit(5000)){throw 'Victim did not exit'}
 if(Stop-RetainedOwnedProcess $record){throw 'Exited retained object was signalled again'}
 if((Retained-OwnedProcessObservation $record).state -cne 'exited'){throw 'Proven process exit was not distinguished from unknown'}
 if(-not(Retained-OwnedProcessAlive $sentinelRecord)){throw 'Old-record retry touched unrelated sentinel'}
 $record.safeHandle.Dispose()
 if((Retained-OwnedProcessObservation $record).state -cne 'unknown'){throw 'Closed retained handle was classified as an exit'}
 $assertionsPassed=$true
} finally {
 # Both are exact newly returned Process objects, never looked up for cleanup.
 $cleanupErrors=@()
 foreach($owned in @($victim,$sentinel)){
  if($owned){try{if(-not $owned.HasExited){$handle=$owned.SafeHandle;$owned.Kill();if(-not $owned.WaitForExit(5000)){throw 'Benign process did not exit'}}}catch{$cleanupErrors+=$_.Exception.GetType().Name}finally{$owned.Dispose()}}
 }
 if($cleanupErrors.Count){throw 'Retained-handle control cleanup failed'}
}
if($assertionsPassed){
 Write-Durable @{state='benign-retained-handle-control-passed';creationMismatchRefused=$true;pidRebindingRefused=$true;oldExitedRecordRefused=$true;unrelatedSentinelUntouched=$true;victimStoppedByRetainedObject=$true;witnesses=@($witness,$sentinelWitness);resources='none';noBrowser=$true;noServices=$true;noHttp=$true;at=[datetimeoffset]::UtcNow.ToString('o')} (Join-Path $out 'receipt.json') -Exclusive
 Write-Output "CONTROL retained handles passed; receipt=$(Join-Path $out 'receipt.json')"
}
