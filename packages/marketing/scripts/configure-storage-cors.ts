import { isDeepStrictEqual } from 'node:util'
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'
import { z } from 'zod'
import { marketingStorageCors, storageOrigin } from './storage-cors-policy'

// Read-only by default. No credentials or presigned URLs in the report.
const args = process.argv.slice(2)
const origins: string[] = []
let bucket: string | undefined
for (let index = 0; index < args.length; index++) {
  const arg = args[index]
  if (arg === '--origin') origins.push(storageOrigin(args[++index] ?? ''))
  else if (arg === '--bucket') bucket = args[++index]
  else if (!['--apply', '--staging-storage'].includes(arg ?? ''))
    throw new Error('Uso: --bucket NOME --origin ORIGEM [--origin ORIGEM] [--apply]')
}
const config = z
  .object({
    R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_MARKETING_BUCKET: z.string().min(1),
  })
  .parse(
    args.includes('--staging-storage')
      ? await (await import('../../../scripts/marketing-review-storage')).reviewStorage()
      : process.env,
  )
if (!bucket || bucket !== config.R2_MARKETING_BUCKET)
  throw new Error('--bucket precisa corresponder ao bucket da configuração selecionada')
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.R2_ACCESS_KEY_ID,
    secretAccessKey: config.R2_SECRET_ACCESS_KEY,
  },
  requestHandler: { connectionTimeout: 5000, requestTimeout: 20000 },
})
const read = async () => {
  try {
    return (await client.send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules ?? []
  } catch (error) {
    if (error instanceof Error && error.name === 'NoSuchCORSConfiguration') return []
    throw error
  }
}
try {
  const before = await read()
  const after = marketingStorageCors(before, origins)
  const changed = !isDeepStrictEqual(before, after)
  console.log(
    JSON.stringify(
      { bucket, mode: args.includes('--apply') ? 'apply' : 'check', changed, before, after },
      null,
      2,
    ),
  )
  if (changed && args.includes('--apply')) {
    if (!isDeepStrictEqual(before, await read()))
      throw new Error('A configuração mudou durante a revisão; confira novamente antes de aplicar')
    await client.send(
      new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: after } }),
    )
    if (!isDeepStrictEqual(after, await read()))
      throw new Error('O bucket não confirmou a configuração enviada')
    console.log('CORS confirmado; execute também o upload real no navegador.')
  } else if (changed) process.exitCode = 1
} finally {
  client.destroy()
}
