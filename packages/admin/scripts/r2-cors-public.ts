// Garante e prova o CORS do bucket R2 PÚBLICO usado pelas animações Rive.
//
// O runtime do Rive lê o `.riv` por `fetch(url).arrayBuffer()`. O Admin usa uma
// rota-proxy de mesma origem para a prévia, então só uma prova no endereço
// público detecta o defeito que faria a animação sumir no navegador da criança.
//
// USO (Bun carrega o .env do cwd — rode de dentro de packages/admin):
//   bun scripts/r2-cors-public.ts          # garante a regra e prova o CDN
//   bun scripts/r2-cors-public.ts --check  # não altera a regra; ainda prova o CDN
//   bun scripts/r2-cors-public.ts --install-probe # mantém o objeto usado pelo CI
//
// `PutBucketCors` substitui a configuração inteira. Este comando sempre lê,
// mescla e preserva as regras que não gerencia. A escrita é idempotente.
import {
  type CORSRule,
  DeleteObjectCommand,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import {
  buildPublicObjectUrl,
  KIDS_STAGING_ORIGIN,
  mergePublicReadRule,
  PUBLIC_CORS_PROBE_BODY,
  PUBLIC_CORS_PROBE_KEY,
  PUBLIC_READ_RULE_ID,
  publicReadRuleMatches,
  validatePublicCorsProbe,
} from './r2-cors-public-lib'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } =
  process.env
const bucketArg = process.argv.find((argument) => argument.startsWith('--bucket='))?.slice(9)
const bucket = bucketArg || R2_BUCKET
const probeOriginArg = process.argv
  .find((argument) => argument.startsWith('--probe-origin='))
  ?.slice('--probe-origin='.length)
const probeOrigin = probeOriginArg || KIDS_STAGING_ORIGIN
const checkOnly = process.argv.includes('--check')
const installProbe = process.argv.includes('--install-probe')

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !bucket || !R2_PUBLIC_URL) {
  throw new Error(
    'faltam R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET ou R2_PUBLIC_URL',
  )
}
const publicBaseUrl = R2_PUBLIC_URL
const PROBE_DEADLINE_MS = 30_000
const PROBE_REQUEST_TIMEOUT_MS = 5_000
const PROBE_RETRY_INTERVAL_MS = 1_000

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

async function readCurrentRules(): Promise<CORSRule[]> {
  try {
    const response = await client.send(new GetBucketCorsCommand({ Bucket: bucket }))
    return response.CORSRules ?? []
  } catch (error) {
    const name = (error as { name?: string }).name
    if (name === 'NoSuchCORSConfiguration' || name === '404' || name === 'NotFound') return []
    throw error
  }
}

function hasExactManagedRule(rules: CORSRule[]): boolean {
  const managedRules = rules.filter((rule) => rule.ID === PUBLIC_READ_RULE_ID)
  return managedRules.length === 1 && publicReadRuleMatches(managedRules[0])
}

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

async function provePublicCors(): Promise<void> {
  const key = installProbe
    ? PUBLIC_CORS_PROBE_KEY
    : `admin/module-rive/cors-probes/${crypto.randomUUID()}.riv`
  const body = installProbe
    ? PUBLIC_CORS_PROBE_BODY
    : `sistema-zero-cors-probe:${crypto.randomUUID()}`
  const url = buildPublicObjectUrl(publicBaseUrl, key)
  let operationError: unknown
  let cleanupError: unknown

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/octet-stream',
      CacheControl: 'no-store, max-age=0',
    }),
  )

  try {
    let lastFailure = 'a consulta pública ainda não foi executada'
    let passed = false
    let attempts = 0
    const deadline = Date.now() + PROBE_DEADLINE_MS
    while (!passed && Date.now() < deadline) {
      attempts += 1
      try {
        const timeout = Math.min(PROBE_REQUEST_TIMEOUT_MS, Math.max(1, deadline - Date.now()))
        const response = await fetch(url, {
          headers: { Origin: probeOrigin, 'Cache-Control': 'no-cache' },
          cache: 'no-store',
          signal: AbortSignal.timeout(timeout),
        })
        const responseBody = await response.text()
        const failure = validatePublicCorsProbe(
          {
            status: response.status,
            allowOrigin: response.headers.get('access-control-allow-origin'),
            body: responseBody,
          },
          { origin: probeOrigin, body },
        )
        if (!failure) {
          console.log(`✅ prova pública passou na tentativa ${attempts}: ${probeOrigin}`)
          passed = true
        } else {
          lastFailure = failure
        }
      } catch (error) {
        lastFailure = error instanceof Error ? error.message : String(error)
      }

      const remaining = deadline - Date.now()
      if (!passed && remaining > 0) await delay(Math.min(PROBE_RETRY_INTERVAL_MS, remaining))
    }
    if (!passed) {
      throw new Error(
        `CORS não propagou no endpoint público em ${PROBE_DEADLINE_MS / 1_000}s (${attempts} tentativa(s)): ${lastFailure}`,
      )
    }
  } catch (error) {
    operationError = error
  }

  if (installProbe) {
    console.log(`objeto-prova permanente instalado: ${key}`)
  } else {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      console.log('objeto temporário da prova removido')
    } catch (error) {
      cleanupError = error
    }
  }

  if (operationError) {
    if (cleanupError) console.error('falha adicional ao remover o objeto temporário', cleanupError)
    throw operationError
  }
  if (cleanupError) throw cleanupError
}

async function main(): Promise<void> {
  const current = await readCurrentRules()
  console.log(`bucket: ${bucket} · ${current.length} regra(s) atual(is)`)

  if (checkOnly) {
    if (!hasExactManagedRule(current)) {
      throw new Error(`regra ${PUBLIC_READ_RULE_ID} ausente ou divergente`)
    }
    console.log(`regra ${PUBLIC_READ_RULE_ID} confere; modo --check não alterou a configuração`)
  } else if (hasExactManagedRule(current)) {
    console.log(`regra ${PUBLIC_READ_RULE_ID} já está correta; nenhuma escrita necessária`)
  } else {
    const merged = mergePublicReadRule(current)
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: { CORSRules: merged },
      }),
    )
    console.log(
      `regra ${PUBLIC_READ_RULE_ID} aplicada; ${merged.length - 1} regra(s) preservada(s)`,
    )
  }

  const after = await readCurrentRules()
  if (!hasExactManagedRule(after)) {
    throw new Error(`regra ${PUBLIC_READ_RULE_ID} não confere após a operação`)
  }
  console.log('✅ configuração de controle confirmada')
  await provePublicCors()
}

await main()
