# Import is inert. Native ownership is supplied by python-lesson-windows-job.ps1.
function Read-OwnedProviderBytes([IO.Stream]$InputStream){
 $buffer=[byte[]]::new(32769);$length=0;$cancellation=[Threading.CancellationTokenSource]::new(10000)
 try{
  do{
   $count=$InputStream.ReadAsync($buffer,$length,$buffer.Length-$length,$cancellation.Token).WaitAsync($cancellation.Token).GetAwaiter().GetResult()
   $length+=$count
   if($length -gt 32768){throw 'provider-input-bound'}
  }while($count -gt 0)
  if($length -lt 1){throw 'provider-input-empty'}
  $result=[byte[]]::new($length);[Array]::Copy($buffer,$result,$length);return ,$result
 }finally{[Array]::Clear($buffer);$cancellation.Dispose()}
}
function Send-OwnedProviderBytes([IO.Stream]$OutputStream,[byte[]]$Bytes){
 if($Bytes.Length -lt 1 -or $Bytes.Length -gt 32768){throw 'provider-input-bound'}
 $cancellation=[Threading.CancellationTokenSource]::new(10000)
 try{[void]$OutputStream.WriteAsync($Bytes,0,$Bytes.Length,$cancellation.Token).WaitAsync($cancellation.Token).GetAwaiter().GetResult();[void]$OutputStream.FlushAsync($cancellation.Token).WaitAsync($cancellation.Token).GetAwaiter().GetResult()}
 finally{$OutputStream.Dispose();$cancellation.Dispose()}
}
function Test-OwnedBrowserBudget([double]$WorkingSetMiB,[double]$FreeMiB){
 if([double]::IsNaN($WorkingSetMiB) -or [double]::IsInfinity($WorkingSetMiB) -or $WorkingSetMiB -lt 0 -or [double]::IsNaN($FreeMiB) -or [double]::IsInfinity($FreeMiB) -or $FreeMiB -lt 0){throw 'browser-memory-unknown'}
 return $WorkingSetMiB -le 1024 -and $FreeMiB -ge 512
}
# Closed diagnostic projection of the SAME native reads used for admission.
# PrivateUsage is committed private memory, not private working set/unique RAM.
function New-OwnedBrowserMemorySnapshot($Observation,$Root,[double]$FreeMiB,[double]$ElapsedMs,[datetimeoffset]$ObservedAt,[double]$SampleDurationMs,[string]$Phase){
 $rows=@();$rootWS=0.0;$rootCommit=0.0;$descendantWS=0.0;$descendantCommit=0.0;$truncated=$false
 foreach($value in $Observation.observed){
  if($value.exited){continue}
  $isRoot=$value.processId -eq $Root.processId -and $value.creationFileTime -ceq $Root.creationFileTime
  $ws=[double]$value.workingSetBytes;$commit=[double]$value.privateCommitBytes
  if($isRoot){$rootWS+=$ws;$rootCommit+=$commit}else{$descendantWS+=$ws;$descendantCommit+=$commit}
  if($rows.Count -lt 1024){$rows+=@{processId=[int]$value.processId;creationFileTime=[string]$value.creationFileTime;kind=$(if($isRoot){'root-node'}else{'owned-descendant'});workingSetBytes=$value.workingSetBytes;privateCommitBytes=$value.privateCommitBytes}}else{$truncated=$true}
 }
 $closedPhase=if($Phase -cin @('preclaim','scenario')){$Phase}else{'unknown'}
 return [pscustomobject]@{observedAt=$ObservedAt.ToString('o');elapsedMs=$ElapsedMs;sampleDurationMs=$SampleDurationMs;phase=$closedPhase;freeMiB=$FreeMiB;workingSetMiB=$Observation.workingSetMiB;privateCommitMiB=$Observation.privateMiB;rootWorkingSetMiB=$rootWS/1MB;rootPrivateCommitMiB=$rootCommit/1MB;descendantWorkingSetMiB=$descendantWS/1MB;descendantPrivateCommitMiB=$descendantCommit/1MB;ownershipComplete=$Observation.ownershipComplete;rows=$rows;rowsTruncated=$truncated}
}
function Record-OwnedBrowserMemorySnapshot($Snapshots,$Value,[bool]$Positive){
 if($Value.phase -ceq 'preclaim' -and $null -eq $Snapshots.preclaim){$Snapshots.preclaim=$Value}
 if($Positive){if($null -eq $Snapshots.firstNegative){$Snapshots.lastPositive=$Value}}elseif($null -eq $Snapshots.firstNegative){$Snapshots.firstNegative=$Value}
 if($null -eq $Snapshots.peak -or $Value.workingSetMiB -gt $Snapshots.peak.workingSetMiB){$Snapshots.peak=$Value}
}
function Test-OwnedBrowserCompletion($Value,[string]$Nonce,[int]$RootId){
 return $null -ne $Value -and $Value.nonce -ceq $Nonce -and $Value.pid -eq $RootId -and $Value.version -eq 1 -and $Value.state -cin @('PASS','NEG') -and $Value.browserClosed -is [bool] -and $Value.functionalPassed -is [bool] -and $Value.sshClosed -is [bool] -and ($Value.state -cne 'PASS' -or ($Value.browserClosed -and $Value.functionalPassed -and $Value.sshClosed))
}
function ConvertTo-OwnedBrowserFailure($Record,[string]$Phase){
 $cause=$Record.Exception.GetBaseException();$native=$cause.GetType().FullName -ceq 'SzLessonOwned.NativeFailure'
 $code=if($cause.Message -cin @('provider-input-bound','provider-input-empty','browser-memory-unknown','browser-memory-budget','browser-streams-unknown','browser-admission-refused','browser-start-cutoff','browser-preclaim-membership','browser-completion-bound','browser-completion-refused','browser-exited-before-completion','browser-work-deadline','browser-functional-NEG','browser-final-functional-refused')){$cause.Message}else{'unknown'}
 return @{phase=$Phase;code=$code;type=$(if($native){'NativeFailure'}else{'owner-failed'});operation=$(if($native){$cause.Operation}else{'closed-owner-error'});nativeCode=$(if($native){$cause.NativeCode}else{0})}
}
function ConvertTo-OwnedChromeMarker([string]$Line){
 if($Line.Length -gt 4096){return 'line-bound-exceeded'}
 foreach($entry in @(@('<will force kill>','library-force-mentioned'),@('<kill>','library-force-mentioned'),@('<forcefully close>','library-force-mentioned'),@('<gracefully close start>','graceful-close-start'),@('<gracefully close end>','graceful-close-end'),@('<process did exit:','browser-process-exit'),@('<launching>','launch-requested'),@('<launched> pid=','browser-process-created'),@('DevTools remote debugging requires a non-default data directory','default-profile-refused'),@('No usable sandbox','sandbox-unavailable'))){if($Line.Contains($entry[0])){return $entry[1]}}
 return 'other'
}
function Read-OwnedBrowserStreams($Context){
 if(-not $Context){return}
 foreach($name in @('stdout','stderr')){
  for($i=0;$i -lt 128 -and -not $Context.closed[$name] -and $Context.pending[$name].IsCompleted;$i++){
   try{$line=$Context.pending[$name].GetAwaiter().GetResult()}catch{$Context.unknown=$true;$Context.closed[$name]=$true;break}
   if($null -eq $line){$Context.closed[$name]=$true;break}
   $Context.characters+=$line.Length;$marker=ConvertTo-OwnedChromeMarker $line
   if($line.Length -gt 4096 -or $Context.characters -gt 262144){$Context.overflow=$true}
   if(-not $Context.counts.ContainsKey($marker)){$Context.counts[$marker]=0};$Context.counts[$marker]++
   $Context.pending[$name]=$Context.readers[$name].ReadLineAsync()
  }
 }
}
