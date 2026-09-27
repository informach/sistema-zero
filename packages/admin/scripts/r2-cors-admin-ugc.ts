// Libera a leitura de anexos da comunidade no Admin por URL pré-assinada.
// Não altera a regra de upload dos alunos nem torna o bucket público.
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_UGC_BUCKET } = process.env
const origins = process.argv
  .find((arg) => arg.startsWith('--origins='))
  ?.slice(10)
  .split(',')
if (
  !R2_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_UGC_BUCKET ||
  !origins?.length
)
  throw new Error(
    'Configure R2_* incluindo R2_UGC_BUCKET e informe --origins=https://admin.exemplo',
  )
for (const origin of origins) {
  const url = new URL(origin)
  if (
    url.origin !== origin ||
    !(url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === 'localhost'))
  )
    throw new Error(`Origem inválida: ${origin}`)
}
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})
const bucket = R2_UGC_BUCKET
async function readRules() {
  try {
    return (await client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules ?? []
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchCORSConfiguration') return []
    throw error
  }
}
const current = await readRules()
const ruleId = 'admin-community-attachments-read'
const proposed = [
  ...current.filter((rule) => rule.ID !== ruleId),
  {
    ID: ruleId,
    AllowedOrigins: origins,
    AllowedMethods: ['GET', 'HEAD'],
    AllowedHeaders: ['range', 'content-type'],
    ExposeHeaders: [
      'ETag',
      'Content-Length',
      'Content-Type',
      'Content-Disposition',
      'Content-Range',
      'Accept-Ranges',
    ],
    MaxAgeSeconds: 3600,
  },
]
console.log(JSON.stringify({ bucket, current, proposed }, null, 2))
if (process.argv.includes('--apply')) {
  if (JSON.stringify(current) !== JSON.stringify(proposed))
    await client.send(
      new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: proposed } }),
    )
  const after = await readRules()
  // O SDK pode reordenar chaves; compara o contrato via serialização ordenada.
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return JSON.stringify(value.map(stable))
    if (value && typeof value === 'object')
      return JSON.stringify(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, stable(item)]),
      )
    return JSON.stringify(value)
  }
  if (stable(after) !== stable(proposed)) throw new Error('CORS divergiu após a aplicação')
  console.log('CORS dos anexos do Admin confirmado; regras anteriores preservadas')
} else {
  console.log('Simulação; use --apply para gravar a configuração proposta')
}
