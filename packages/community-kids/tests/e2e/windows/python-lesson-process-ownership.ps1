function ConvertTo-OwnedProcessWitness($p){
 if(-not $p){return $null}
 if(-not $p.ExecutablePath -or -not $p.CommandLine){throw 'No complete process witness; refuse ownership inference.'}
 $bytes=[Text.Encoding]::UTF8.GetBytes($p.CommandLine);$hash=[Security.Cryptography.SHA256]::Create()
 try{$cliSha=[BitConverter]::ToString($hash.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()}finally{$hash.Dispose()}
 return [pscustomobject]@{processId=[int]$p.ProcessId;parentId=[int]$p.ParentProcessId;createdAt=$p.CreationDate.ToUniversalTime().ToString('o');executable=$p.ExecutablePath;cliSha256=$cliSha;cli=$p.CommandLine}
}
function Get-OwnedProcessSnapshot {
 $rows=@{};$children=@{}
 foreach($row in @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate,ExecutablePath,CommandLine -ErrorAction Stop)){
  $key=[int]$row.ProcessId
  if($rows.ContainsKey($key)){throw 'Duplicate PID in process observation'}
  $rows[$key]=$row;$parent=[int]$row.ParentProcessId
  if(-not $children.ContainsKey($parent)){$children[$parent]=[Collections.Generic.List[object]]::new()}
  $children[$parent].Add($row)
 }
 return [pscustomobject]@{rows=$rows;children=$children}
}
function Process-Witness([int]$ProcessId,$Snapshot=$null){
 $p=if($null -eq $Snapshot){Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction Stop}else{$Snapshot.rows[$ProcessId]}
 return ConvertTo-OwnedProcessWitness $p
}
function Same-Witness($before,$after){return $after -and $before.processId -eq $after.processId -and $before.createdAt -eq $after.createdAt -and $before.executable -eq $after.executable -and $before.cliSha256 -eq $after.cliSha256}
function Write-Durable($value,[string]$path,[switch]$Exclusive){
 $bytes=[Text.UTF8Encoding]::new($false).GetBytes(($value|ConvertTo-Json -Depth 12))
 $mode=if($Exclusive){[IO.FileMode]::CreateNew}else{[IO.FileMode]::Create}
 $stream=[IO.File]::Open($path,$mode,[IO.FileAccess]::Write,[IO.FileShare]::Read)
 try{$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)}finally{$stream.Dispose()}
}
function Save($state,$path){Write-Durable $state $path}
function Owned-StatePath([string]$path){
 $absolute=[IO.Path]::GetFullPath($path);$prefix=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'windows-jobs'))+[IO.Path]::DirectorySeparatorChar
 if(-not $absolute.StartsWith($prefix,[StringComparison]::OrdinalIgnoreCase)){throw 'State must be in this namespace windows-jobs.'}
 return $absolute
}
