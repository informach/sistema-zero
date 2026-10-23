param([string]$Directory,[string]$Nonce,[datetimeoffset]$EndUtc)
$ErrorActionPreference='Stop'
$claim=Join-Path $Directory 'claim.json';$stop=Join-Path $Directory 'stop.request'
while(-not(Test-Path -LiteralPath $claim)){
 if((Test-Path -LiteralPath $stop) -or [datetimeoffset]::UtcNow -ge $EndUtc){exit 2}
 Start-Sleep -Milliseconds 20
}
$value=Get-Content -LiteralPath $claim -Raw|ConvertFrom-Json
if($value.pid -ne $PID -or $value.nonce -cne $Nonce){exit 2}
[IO.File]::WriteAllText((Join-Path $Directory 'ready.json'),(@{pid=$PID;nonce=$Nonce}|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
while(-not(Test-Path -LiteralPath $stop) -and [datetimeoffset]::UtcNow -lt $EndUtc){Start-Sleep -Milliseconds 20}
exit 0
