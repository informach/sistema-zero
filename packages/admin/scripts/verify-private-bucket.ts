// Verificação descartável: o token S3 dos .env acessa o bucket PRIVADO novo?
// Roda com `bun scripts/verify-private-bucket.ts` (bun carrega o .env do cwd).
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET } = process.env
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PRIVATE_BUCKET) {
  console.error('faltam envs R2_*')
  process.exit(1)
}

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const key = 'admin/attachments/_verify-private-bucket.txt'
const payload = `verificacao ${new Date().toISOString()}`

await client.send(
  new PutObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: key,
    Body: payload,
    ContentType: 'text/plain',
  }),
)
console.log('PUT ok')

const got = await client.send(new GetObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: key }))
const text = await got.Body?.transformToString()
console.log('GET ok:', text === payload ? 'conteudo confere' : 'CONTEUDO DIVERGE')

await client.send(new DeleteObjectCommand({ Bucket: R2_PRIVATE_BUCKET, Key: key }))
console.log('DELETE ok — token S3 acessa o bucket privado', R2_PRIVATE_BUCKET)
