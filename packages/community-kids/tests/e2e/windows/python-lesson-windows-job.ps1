# QA primitive only. Import creates no job/process and makes no native query.
function Initialize-OwnedJobNative([string]$ExpectedSourceSha256){
 $path=Join-Path $PSScriptRoot 'python-lesson-windows-job.cs'
 if($ExpectedSourceSha256 -cnotmatch '^[a-f0-9]{64}$' -or (Get-FileHash -LiteralPath $path).Hash.ToLowerInvariant() -cne $ExpectedSourceSha256){throw 'Pinned QA native source required'}
 if('SzLessonOwned.Native' -as [type]){if($script:ownedJobNativeSha -cne $ExpectedSourceSha256){throw 'Previously loaded native assembly is not this pinned source'};return}
 Add-Type -Path $path;$script:ownedJobNativeSha=$ExpectedSourceSha256
}
function Assert-OwnedJobNativeInitialized {
 if(-not $script:ownedJobNativeSha -or -not('SzLessonOwned.Native' -as [type])){throw 'Pinned QA native initialization required'}
}
function Get-OwnedJobValueSha([object]$Value){
 $bytes=[Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 8 -Compress))
 return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}
function New-OwnedJobWitness([uint32]$ProcessId,[string]$CreationFileTime,[string]$Binary,[string]$BinarySha256,[string[]]$Arguments,[string]$JobName){
 [long]$ticks=0
 if($ProcessId -eq 0 -or -not [long]::TryParse($CreationFileTime,[ref]$ticks) -or $ticks -le 0 -or $BinarySha256 -cnotmatch '^[a-f0-9]{64}$' -or -not [IO.Path]::IsPathFullyQualified($Binary) -or $JobName -cnotmatch '^Local\\SistemaZero-QA-[a-f0-9]{32}$'){throw 'Exact native creator identity required'}
 $argv=@($Arguments);$argvSha=Get-OwnedJobValueSha $argv
 return [pscustomobject]@{ownershipKind='windows-job';processId=[int]$ProcessId;creationFileTime=$CreationFileTime;createdAt=[datetime]::FromFileTimeUtc($ticks).ToString('o');executable=[IO.Path]::GetFullPath($Binary);binarySha256=$BinarySha256;argv=$argv;argvSha256=$argvSha;cliSha256=$argvSha;jobName=$JobName}
}
function Test-SameOwnedJobWitness($Before,$After){
 return $Before -and $After -and $Before.ownershipKind -ceq 'windows-job' -and $After.ownershipKind -ceq 'windows-job' -and $Before.processId -eq $After.processId -and $Before.creationFileTime -ceq $After.creationFileTime -and $Before.binarySha256 -ceq $After.binarySha256 -and $Before.argvSha256 -ceq $After.argvSha256 -and $Before.jobName -ceq $After.jobName
}
function New-OwnedJobLaunchInfo([string]$Binary,[string[]]$Arguments,[string]$WorkingDirectory,[hashtable]$Environment){
 if(-not [IO.Path]::IsPathFullyQualified($Binary) -or -not [IO.Path]::IsPathFullyQualified($WorkingDirectory)){throw 'Absolute own launch paths required'}
 $info=[Diagnostics.ProcessStartInfo]::new($Binary);$info.UseShellExecute=$false;$info.CreateNoWindow=$true;$info.WorkingDirectory=$WorkingDirectory
 $info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true;$info.Environment.Clear()
 foreach($entry in $Environment.GetEnumerator()){$info.Environment[$entry.Key]=[string]$entry.Value}
 foreach($argument in $Arguments){if($null -eq $argument){throw 'Own argv contains null'};$info.ArgumentList.Add($argument)}
 return $info
}
function New-OwnedJobContext([string]$Owner,[string]$Run,[string]$Role,[string]$Nonce){
 Assert-OwnedJobNativeInitialized
 foreach($value in @($Owner,$Run,$Role,$Nonce)){if(-not $value){throw 'Own role context identity required'}}
 $job=[SzLessonOwned.Native]::CreateNamed('Local\SistemaZero-QA-'+[guid]::NewGuid().ToString('N'))
 return [pscustomobject]@{job=$job;rootProcess=$null;root=$null;members=@{};owner=$Owner;run=$Run;role=$Role;nonce=$Nonce;nativeSha256=$script:ownedJobNativeSha;creator=$true;creatorBound=$false;ownershipComplete=$true;unconfirmedProcessIds=@();goneBetweenEnumAndOpen=0;closed=$false}
}
function Get-OwnedJobCreatorWitness($Context,[Diagnostics.Process]$Process,$StartInfo,[string]$BinarySha256){
 if(-not $Context.creator -or $Context.creatorBound -or $Context.rootProcess){throw 'Own job accepts one newly returned creator only'}
 $Context.rootProcess=$Process
 $birth=[SzLessonOwned.Native]::ReadBirth($Process.SafeHandle)
 $Context.root=New-OwnedJobWitness $Process.Id $birth $StartInfo.FileName $BinarySha256 @($StartInfo.ArgumentList) $Context.job.Name
 return $Context.root
}
function Confirm-OwnedJobCreator($Context){
 if(-not $Context.creator -or -not $Context.rootProcess -or $Context.creatorBound -or -not $Context.root){throw 'Unbound exact creator required'}
 [SzLessonOwned.Native]::Assign($Context.job,$Context.rootProcess.SafeHandle)
 $member=[SzLessonOwned.Native]::Capture($Context.job,[uint32]$Context.root.processId)
 if($member.CreationFileTime -cne $Context.root.creationFileTime){$member.Dispose();throw 'Assigned creator birth mismatch'}
 $Context.members["$($member.Pid):$($member.CreationFileTime)"]=$member;$Context.creatorBound=$true
}
function Get-OwnedJobReference($Context){
 if(-not $Context.creatorBound){throw 'Assigned own creator required before publishing reference'}
 return [pscustomobject]@{version=1;name=$Context.job.Name;nativeSha256=$Context.nativeSha256;owner=$Context.owner;run=$Context.run;role=$Context.role;nonce=$Context.nonce;root=$Context.root}
}
function Open-OwnedJobContext($Reference){
 Assert-OwnedJobNativeInitialized
 if($Reference.version -ne 1 -or $Reference.nativeSha256 -cne $script:ownedJobNativeSha -or -not $Reference.owner -or -not $Reference.run -or -not $Reference.role -or -not $Reference.nonce -or $Reference.root.ownershipKind -cne 'windows-job' -or $Reference.name -cne $Reference.root.jobName){throw 'Pinned own native reference required'}
 $job=[SzLessonOwned.Native]::OpenQuery($Reference.name);$member=$null
 try{
  # A name/absent root is never an empty proof. The consumer must bind the live
  # expected root, or continue using an already retained context after its exit.
  $member=[SzLessonOwned.Native]::Capture($job,[uint32]$Reference.root.processId)
  if($member.CreationFileTime -cne $Reference.root.creationFileTime -or $member.HasExited()){throw 'Live expected root is required to open an own query context'}
  $known=@{};$known["$($member.Pid):$($member.CreationFileTime)"]=$member
  return [pscustomobject]@{job=$job;rootProcess=$null;root=$Reference.root;members=$known;owner=$Reference.owner;run=$Reference.run;role=$Reference.role;nonce=$Reference.nonce;nativeSha256=$script:ownedJobNativeSha;creator=$false;creatorBound=$true;ownershipComplete=$true;unconfirmedProcessIds=@();goneBetweenEnumAndOpen=0;closed=$false}
 }catch{if($member){$member.Dispose()};$job.Dispose();throw}
}
function Read-OwnedJobObservation($Context){
 if($Context.closed -or -not $Context.creatorBound){throw 'Open bound own context required'}
 $working=0.0;$private=0.0;$live=@();$exited=@();$observed=@()
 try{
  $list=[SzLessonOwned.Native]::Read($Context.job)
  foreach($id in $list.Pids){
   $candidate=$null
   try{$candidate=[SzLessonOwned.Native]::Capture($Context.job,$id)}catch{
    $cause=$_.Exception.GetBaseException()
    if($cause.GetType().FullName -ceq 'SzLessonOwned.NativeFailure' -and $cause.Operation -cin @('OpenProcess','Membership')){
     $fresh=[SzLessonOwned.Native]::Read($Context.job)
     if($id -notin $fresh.Pids){$Context.goneBetweenEnumAndOpen++;continue}
    }
    $Context.unconfirmedProcessIds=@($Context.unconfirmedProcessIds)+@([int]$id);throw
   }
   $key="$($candidate.Pid):$($candidate.CreationFileTime)"
   if($Context.members.ContainsKey($key)){$candidate.Dispose()}else{$Context.members[$key]=$candidate}
  }
  foreach($member in $Context.members.Values){
   $value=$member.Read();$observed+=@{processId=[int]$value.Pid;creationFileTime=$value.CreationFileTime;exited=$value.Exited;exitCode=$value.ExitCode}
   if($value.Exited){$exited+=[int]$value.Pid}else{
    if($null -eq $value.WorkingSetBytes -or $null -eq $value.PrivateBytes){throw 'Unknown live native memory'}
    $live+=[int]$value.Pid;$working+=[double]$value.WorkingSetBytes/1MB;$private+=[double]$value.PrivateBytes/1MB
   }
  }
  return [pscustomobject]@{workingSetMiB=$working;privateMiB=$private;liveProcessIds=$live;exitedProcessIds=$exited;observed=$observed;ownershipComplete=$Context.ownershipComplete;jobState=$list}
 }catch{$Context.ownershipComplete=$false;throw}
}
function Test-OwnedJobRootAlive($Context){
 $key="$($Context.root.processId):$($Context.root.creationFileTime)"
 if(-not $Context.members.ContainsKey($key)){throw 'Exact retained own root is missing'}
 return -not $Context.members[$key].HasExited()
}
function Close-OwnedJobContext($Context,[switch]$RequireEmpty){
 if(-not $Context -or $Context.closed){return $null}
 $complete=$Context.ownershipComplete;$rootExited=$false;$allExited=$false;$final=$null;$failure=$null
 try{
  if($RequireEmpty){
   Read-OwnedJobObservation $Context|Out-Null
   $rootExited=-not(Test-OwnedJobRootAlive $Context)
   $allExited=-not @($Context.members.Values|Where-Object{-not $_.HasExited()}).Count
  }
 }catch{$complete=$false;$failure=$_.Exception.GetBaseException().GetType().Name}finally{
  foreach($member in $Context.members.Values){$member.Dispose()}
  if($Context.rootProcess){$Context.rootProcess.Dispose()}
  if($RequireEmpty){try{$final=[SzLessonOwned.Native]::Read($Context.job)}catch{$complete=$false;$failure=$_.Exception.GetBaseException().GetType().Name}}
  $Context.job.Dispose();$Context.closed=$true
 }
 return [pscustomobject]@{cleanupConfirmed=([bool]$RequireEmpty -and $complete -and $rootExited -and $allExited -and $null -ne $final -and $final.Pids.Count -eq 0 -and $Context.job.ReleaseSucceeded);ownershipComplete=$complete;rootExitedConfirmed=$rootExited;knownExitedConfirmed=$allExited;jobState=$final;jobHandleClosed=$Context.job.ReleaseSucceeded;failureName=$failure}
}
