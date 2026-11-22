[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repo = (git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Execute o ensaio em um checkout do repositório.' }

$name = 'pinta-causal-bff-minio-20261122'
$image = 'pinta-causal-bff-minio:20250907'
$endpoint = 'http://127.0.0.1:5578'
$version = 'RELEASE.2025-09-07T16-13-09Z'
$expectedSha = '7c5bd8512c6e966455b1d198209358b2d191c77a83ab377c4073281065fb855f'
$url = "https://github.com/minio/minio/releases/download/$version/minio.linux-amd64.$version"
$cache = Join-Path $repo '.cache/pinta-causal-minio-20250907'
$module = Join-Path $repo 'packages/member-shell'
$log = Join-Path $repo '.cache/pinta-causal-minio-local.log'
$binary = Join-Path $cache 'minio'

$existing = docker ps -a --filter "name=^${name}$" --format '{{.ID}}'
if ($LASTEXITCODE -ne 0 -or $existing) { throw 'Docker indisponível ou nome isolado em uso.' }
if (Get-NetTCPConnection -State Listen -LocalPort 5578 -ErrorAction SilentlyContinue) {
  throw 'A porta 5578 está ocupada.'
}

New-Item -ItemType Directory -Path $cache,$(Join-Path $module '.cache') -Force | Out-Null
if (!(Test-Path -LiteralPath $binary)) {
  $tempBinary = Join-Path $cache 'minio.download'
  curl.exe --fail --silent --show-error --location --retry 2 --max-time 100 --output $tempBinary $url
  if ($LASTEXITCODE -ne 0) { throw 'Download do binário oficial do MinIO falhou.' }
  if ((Get-FileHash -Algorithm SHA256 -LiteralPath $tempBinary).Hash.ToLowerInvariant() -ne $expectedSha) {
    throw 'O SHA-256 do binário recebido difere do release oficial.'
  }
  Move-Item -LiteralPath $tempBinary -Destination $binary
}
$actualSha = (Get-FileHash -Algorithm SHA256 -LiteralPath $binary).Hash.ToLowerInvariant()
if ($actualSha -ne $expectedSha) { throw 'O SHA-256 do binário em cache difere do release oficial.' }

Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Dockerfile') -Destination (Join-Path $cache 'Dockerfile')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'probe.ts') -Destination (Join-Path $module '.cache/pinta-causal-s3-probe.test.ts')
docker build --quiet --network none --platform linux/amd64 --tag $image $cache
if ($LASTEXITCODE -ne 0) { throw 'A imagem descartável do MinIO não foi construída.' }

$names = @(
  'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ACCOUNT_ID', 'R2_UGC_BUCKET', 'R2_S3_ENDPOINT',
  'MINIO_ROOT_USER', 'MINIO_ROOT_PASSWORD', 'MINIO_API_CORS_ALLOW_ORIGIN', 'MINIO_SITE_REGION', 'MINIO_BROWSER'
)
$prior = @{}
foreach ($variable in $names) {
  $prior[$variable] = [Environment]::GetEnvironmentVariable($variable, 'Process')
}
$container = $null
$probeExit = 1
try {
  $env:R2_ACCESS_KEY_ID = 'pintatest' + [Guid]::NewGuid().ToString('N')
  $env:R2_SECRET_ACCESS_KEY = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
  $env:R2_ACCOUNT_ID = 'pinta-local-test'
  $env:R2_UGC_BUCKET = 'pinta-causal-qa-' + [Guid]::NewGuid().ToString('N')
  $env:R2_S3_ENDPOINT = $endpoint
  $env:MINIO_ROOT_USER = $env:R2_ACCESS_KEY_ID
  $env:MINIO_ROOT_PASSWORD = $env:R2_SECRET_ACCESS_KEY
  $env:MINIO_API_CORS_ALLOW_ORIGIN = 'http://127.0.0.1:5577'
  $env:MINIO_SITE_REGION = 'auto'
  $env:MINIO_BROWSER = 'off'

  $containerArgs = @(
    'run', '-d', '--name', $name, '--publish', '127.0.0.1:5578:9000',
    '--tmpfs', '/data:rw,size=33554432', '--tmpfs', '/tmp:rw',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true',
    '--env', 'MINIO_ROOT_USER', '--env', 'MINIO_ROOT_PASSWORD',
    '--env', 'MINIO_API_CORS_ALLOW_ORIGIN', '--env', 'MINIO_SITE_REGION',
    '--env', 'MINIO_BROWSER', $image, 'server', '/data', '--address', ':9000'
  )
  $container = docker @containerArgs
  if ($LASTEXITCODE -ne 0 -or $container -notmatch '^[a-f0-9]{64}$') {
    throw 'O container descartável ficou indisponível.'
  }
  $ready = $false
  for ($attempt = 0; $attempt -lt 25; $attempt++) {
    $code = curl.exe --silent --max-time 1 --output NUL --write-out '%{http_code}' "$endpoint/minio/health/ready"
    if ($code -eq '200') { $ready = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if (!$ready) { throw 'O MinIO não chegou ao estado pronto.' }

  Write-Output "MinIO $version SHA-256 $actualSha"
  Write-Output "Fontes do checkout $(git -C $repo rev-parse HEAD)"
  Push-Location -LiteralPath $module
  try {
    bun test ./.cache/pinta-causal-s3-probe.test.ts 2>&1 |
      ForEach-Object { $_.ToString().Replace($env:R2_ACCESS_KEY_ID, '[redacted]').Replace($env:R2_SECRET_ACCESS_KEY, '[redacted]') } |
      Tee-Object -FilePath $log
    $probeExit = $LASTEXITCODE
  } finally {
    Pop-Location
  }
} finally {
  if ($container -match '^[a-f0-9]{64}$') { docker rm -f $container | Out-Null }
  foreach ($variable in $names) {
    [Environment]::SetEnvironmentVariable($variable, $prior[$variable], 'Process')
  }
}
exit $probeExit
