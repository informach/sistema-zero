# QA-only sampled bounds. No launch, kill or process query happens on import.
function Assert-LessonCompactNextAdmission {
 $free=[double](Get-CimInstance Win32_OperatingSystem -Property FreePhysicalMemory -ErrorAction Stop).FreePhysicalMemory/1024
 if($free -lt 2688){throw 'Compact whole-attempt admission requires2688MiB before Next'}
 return $free
}

function Get-LessonCompactBaseRoots($References) {
 if(-not $References -or @($References).Count -gt 8){throw 'Reviewed base state references required'}
 $roots=@()
 foreach($reference in $References){
  if(-not [IO.Path]::IsPathFullyQualified($reference.path) -or $reference.sha256 -cnotmatch '^[a-f0-9]{64}$'){throw 'Closed base state reference required'}
  if((Get-FileHash -LiteralPath $reference.path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $reference.sha256){throw 'Reviewed base state changed'}
  $state=Get-Content -LiteralPath $reference.path -Raw|ConvertFrom-Json -DateKind String
  if(-not $state.owner -or -not $state.run -or -not(Same-Witness $state.root (Process-Witness $state.root.processId))){throw 'Live retained-base ownership witness required'}
  $roots+= $state.root
 }
 if(@($roots|ForEach-Object{"$($_.processId):$($_.createdAt)"}|Select-Object -Unique).Count -ne $roots.Count){throw 'Duplicate retained-base root'}
 return $roots
}
function Test-LessonCompactSample($Observation,[string]$ProfileId='lessons-desktop-compact-r2') {
 if($ProfileId -cnotin @('lessons-desktop-compact-r2','lessons-desktop-shared-r1')){throw 'Unknown QA memory profile'}
 $reasons=[Collections.Generic.List[string]]::new()
 foreach($key in @('freeMiB','nextMiB','browserMiB','baseGrowthMiB')){
  $value=$Observation.$key
  if($ProfileId -ceq 'lessons-desktop-shared-r1' -and ($null -eq $value -or [Type]::GetTypeCode($value.GetType()).ToString() -cnotin @('Byte','SByte','Int16','UInt16','Int32','UInt32','Int64','UInt64','Single','Double','Decimal'))){$reasons.Add('unknown-'+$key);continue}
  if($null -eq $value -or $value -isnot [ValueType] -or [double]::IsNaN([double]$value) -or [double]::IsInfinity([double]$value) -or $value -lt 0){$reasons.Add('unknown-'+$key)}
 }
 if($Observation.ownershipComplete -ne $true){$reasons.Add('ownership-incomplete')}
 if($ProfileId -ceq 'lessons-desktop-shared-r1' -and $reasons.Count){return [pscustomobject]@{negative=$true;reasons=@($reasons);forceAuthorized=$false}}
 if($Observation.freeMiB -lt 512){$reasons.Add('host-reserve-crossed')}
 if($ProfileId -ceq 'lessons-desktop-shared-r1'){
  if(-not $reasons.Count -and ($Observation.nextMiB+$Observation.browserMiB) -gt 2048){$reasons.Add('combined-tree-budget-exceeded')}
 }elseif($Observation.nextMiB -gt 1024){$reasons.Add('next-tree-budget-exceeded')}
 if($Observation.browserMiB -gt 1024){$reasons.Add('browser-tree-budget-exceeded')}
 if($Observation.baseGrowthMiB -gt 128){$reasons.Add('retained-base-growth-exceeded')}
 return [pscustomobject]@{negative=$reasons.Count -gt 0;reasons=@($reasons);forceAuthorized=$false}
}

function Measure-LessonMemoryTree($Roots,$Known,$Retained,$Snapshot) {
 foreach($root in $Roots){
  if(-not(Same-Witness $root (Process-Witness $root.processId $Snapshot))){throw 'Own memory root witness changed'}
  $key="$($root.processId):$($root.createdAt)"
  if(-not $Known.ContainsKey($key)){$Known[$key]=$root;$record=Retain-OwnedProcess $root;if(-not $record){throw 'Own memory root handle unavailable'};$Retained[$key]=$record}
 }
 Capture-OwnedTree $Roots[0] $Known $Retained $Snapshot
 $total=0.0
 foreach($w in @($Known.Values)){
  $record=$Retained["$($w.processId):$($w.createdAt)"]
  if(-not $record){throw 'Own memory descendant handle unavailable'}
  if(Retained-OwnedProcessAlive $record){$record.process.Refresh();$total+=$record.process.WorkingSet64/1MB}
 }
 return $total
}

function New-LessonCompactMonitor($Next,[string]$NextStateFile,$BaseRoots,[string]$ProfileId='lessons-desktop-compact-r2') {
 if($ProfileId -cnotin @('lessons-desktop-compact-r2','lessons-desktop-shared-r1')){throw 'Unknown QA memory profile'}
 if(-not $BaseRoots -or @($BaseRoots).Count -gt 8){throw 'Reviewed retained-base roots required'}
 $directory=Split-Path (Owned-StatePath $NextStateFile)
 if($Next.stopRequest -cne (Join-Path $directory 'stop.request')){throw 'Next normal stop path differs from its own job'}
 $context=[pscustomobject]@{profileId=$ProfileId;next=$Next;nextStateFile=$NextStateFile;baseRoots=@($BaseRoots);nextKnown=@{};nextRetained=@{};baseKnown=@{};baseRetained=@{};baselineBaseMiB=0.0;directory=$directory;lastSampleAt=[datetimeoffset]::MinValue;lastObservation=$null}
 try{
  $snapshot=Get-OwnedProcessSnapshot
  $context.baselineBaseMiB=Measure-LessonMemoryTree $context.baseRoots $context.baseKnown $context.baseRetained $snapshot
  Measure-LessonMemoryTree @($Next.root) $context.nextKnown $context.nextRetained $snapshot|Out-Null
  return $context
 }catch{Close-LessonCompactMonitor $context;throw}
}

function Close-LessonCompactMonitor($Context) {
 if(-not $Context){return}
 foreach($records in @($Context.nextRetained,$Context.baseRetained)){
  foreach($record in $records.Values){if($record.ownsProcess){$record.process.Dispose()}}
  $records.Clear()
 }
}

function Get-LessonCompactObservation($Context,[double]$BrowserMiB,$Snapshot=$null) {
 if($null -eq $Snapshot){$Snapshot=Get-OwnedProcessSnapshot}
 $nextMiB=Measure-LessonMemoryTree @($Context.next.root) $Context.nextKnown $Context.nextRetained $Snapshot
 $baseMiB=Measure-LessonMemoryTree $Context.baseRoots $Context.baseKnown $Context.baseRetained $Snapshot
 $freeMiB=[double](Get-CimInstance Win32_OperatingSystem -Property FreePhysicalMemory -ErrorAction Stop).FreePhysicalMemory/1024
 $observation=[pscustomobject]@{nextMiB=$nextMiB;browserMiB=$BrowserMiB;baseGrowthMiB=[math]::Max(0,$baseMiB-$Context.baselineBaseMiB);freeMiB=$freeMiB;ownershipComplete=$true;observedAt=[datetimeoffset]::UtcNow.ToString('o')}
 $Context.lastSampleAt=[datetimeoffset]::UtcNow;$Context.lastObservation=$observation
 return $observation
}

function Request-LessonNormalStop([string]$Path) {
 if(-not(Test-Path -LiteralPath $Path)){Write-Durable @{reason='compact-memory-negative';requestedAt=[datetimeoffset]::UtcNow.ToString('o')} $Path -Exclusive}
}

function Request-LessonCompactNextStop($Context) {
 if(-not(Same-Witness $Context.next.root (Process-Witness $Context.next.root.processId))){throw 'Next normal stop ownership unconfirmed'}
 Request-LessonNormalStop $Context.next.stopRequest
}

function Invoke-LessonCompactLock([string]$Directory,[scriptblock]$Action) {
 $deadline=[datetimeoffset]::UtcNow.AddSeconds(2);$stream=$null
 while(-not $stream){
  try{$stream=[IO.File]::Open((Join-Path $Directory 'compact-memory.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)}
  catch [IO.IOException]{if([datetimeoffset]::UtcNow -ge $deadline){throw 'Compact memory handoff lock unavailable'};Start-Sleep -Milliseconds 25}
 }
 try{& $Action}finally{$stream.Dispose()}
}

function Test-LessonCompactHandoff($Context) {
 $path=Join-Path $Context.directory 'compact-memory-handoff.json'
 if(-not(Test-Path -LiteralPath $path)){return $false}
 $handoff=Get-Content -LiteralPath $path -Raw|ConvertFrom-Json -DateKind String
 if($handoff.profileId -cne $Context.profileId -or -not(Same-Witness $Context.next.root $handoff.nextRoot) -or -not(Same-Witness $handoff.browserRoot (Process-Witness $handoff.browserRoot.processId))){throw 'Compact memory handoff witness mismatch'}
 return $true
}

# Hook for the reviewed cache Next launcher: invoke immediately after durable Next
# claim, keeping that launcher alive until the browser supervisor's first sample.
# No extra monitor process is created. The fresh cache must call this hook explicitly.
function Watch-LessonCompactNextWarmup($Next,[string]$NextStateFile,$BaseRoots,[datetimeoffset]$WindowEnd,[string]$ProfileId='lessons-desktop-compact-r2') {
 if(-not $Next.root.cli.Contains('--max-old-space-size=768')){throw 'Compact Next heap witness required'}
 $context=New-LessonCompactMonitor $Next $NextStateFile $BaseRoots $ProfileId
 $statusPath=Join-Path $context.directory 'compact-memory.json'
 try{
  while([datetimeoffset]::UtcNow -lt $WindowEnd){
   # Sampling and its decision share the handoff lock, not just publication. A
   # browser can never claim ownership between an observed NEG and its latch.
   $transferred=Invoke-LessonCompactLock $context.directory {
    if(Test-LessonCompactHandoff $context){return $true}
    try{
     $observation=Get-LessonCompactObservation $context 0
     $decision=Test-LessonCompactSample $observation $ProfileId
     Write-Durable @{profileId=$ProfileId;nextRoot=$Next.root;baselineBaseMiB=$context.baselineBaseMiB;baseRoots=$context.baseRoots;observation=$observation;negative=$decision.negative;reasons=$decision.reasons;warmupActive=$true} $statusPath
     if($decision.negative){Request-LessonCompactNextStop $context;throw 'Compact Next warmup memory NEG'}
     return $false
    }catch{
     # Keep an explicit unknown/negative latch under the SAME lock before it can
     # be transferred. The own normal stop request also prevents a later claim.
     try{Write-Durable @{profileId=$ProfileId;nextRoot=$Next.root;negative=$true;reasons=@('warmup-negative-or-unknown');warmupActive=$true} $statusPath}
     finally{Request-LessonCompactNextStop $context}
     throw
    }
   }
   if($transferred){return}
   Start-Sleep -Milliseconds 500
  }
  throw 'Compact Next warmup window ended'
 }catch{
  # Before the supervisor handoff there is no admitted browser. Only stop Next normally.
  Invoke-LessonCompactLock $context.directory {if(-not(Test-LessonCompactHandoff $context)){Request-LessonCompactNextStop $context}}
  throw
 }finally{Close-LessonCompactMonitor $context}
}
