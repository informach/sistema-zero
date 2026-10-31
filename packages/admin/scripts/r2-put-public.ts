// Envia um arquivo público imutável e confere conteúdo e CORS na leitura.
// Use --prefix=<prefixo> ou --key=<chave>; sobrescrita exige --force.
import { createHash } from 'node:crypto'
import { basename, extname } from 'node:path'
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { normalizeWebAnimation } from '@sistemazero/edisvg/data'
import { buildPublicObjectUrl, KIDS_STAGING_ORIGIN } from './r2-cors-public-lib'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } =
  process.env
const arg = (nome: string) =>
  process.argv.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3)
const arquivo = process.argv.slice(2).find((a) => !a.startsWith('--'))
const bucket = arg('bucket') || R2_BUCKET
const publicBaseUrl = arg('public-url') || R2_PUBLIC_URL
const origem = arg('probe-origin') || KIDS_STAGING_ORIGIN
const force = process.argv.includes('--force')

if (!arquivo) {
  console.error('Uso: bun scripts/r2-put-public.ts <arquivo> --prefix=<prefixo> | --key=<chave>')
  process.exit(2)
}
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !bucket || !publicBaseUrl) {
  throw new Error(
    'faltam R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET ou R2_PUBLIC_URL',
  )
}

const bytes = new Uint8Array(await Bun.file(arquivo).arrayBuffer())
if (bytes.length === 0) throw new Error(`${arquivo} está vazio`)
const animation = arquivo.toLowerCase().endsWith('.edi-animation.json')
const extensao = animation ? '.edi-animation.json' : extname(arquivo).toLowerCase()
if (animation) normalizeWebAnimation(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
if (extensao === '.riv') throw new Error('Exporte a animação no ediSVG como Animação para web.')

const sha256 = createHash('sha256').update(bytes).digest('hex')
const key = (() => {
  const exata = arg('key')
  if (exata) return exata
  const prefixo = arg('prefix')
  if (!prefixo)
    throw new Error('passe --prefix=<prefixo> (a chave vira <prefixo>/<nome>-<sha256>) ou --key=')
  const nome = arg('nome') || basename(arquivo, extensao)
  return `${prefixo.replace(/\/+$/, '')}/${nome}-${sha256}${extensao}`
})()

const contentType = animation
  ? 'application/json'
  : extensao === '.webp'
    ? 'image/webp'
    : extensao === '.png'
      ? 'image/png'
      : extensao === '.svg'
        ? 'image/svg+xml'
        : 'application/octet-stream'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

// ⚠️ Sem `s3:ListBucket` o HEAD de uma chave INEXISTENTE volta 403, não 404 (semântica do S3):
// aí a existência é conferida pelo endereço PÚBLICO, que é o que importa para o leitor.
const existe = await client
  .send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
  .then(() => true)
  .catch(async (e: { name?: string; $metadata?: { httpStatusCode?: number } }) => {
    const status = e.$metadata?.httpStatusCode
    if (e.name === 'NotFound' || status === 404) return false
    if (status === 403) {
      const publica = await fetch(buildPublicObjectUrl(publicBaseUrl, key), {
        method: 'HEAD',
        cache: 'no-store',
      })
      return publica.status === 200
    }
    throw e
  })
if (existe && !force) {
  console.error(`A chave ${key} já existe no bucket ${bucket}; nada enviado (use --force).`)
  console.log(buildPublicObjectUrl(publicBaseUrl, key))
  process.exit(3)
}

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
    Metadata: { sha256, origem: basename(arquivo) },
  }),
)
const url = buildPublicObjectUrl(publicBaseUrl, key)
console.error(`${bytes.length} bytes → ${bucket}/${key}`)

// Prova pelo endereço público, como a criança vai ler: 200, o mesmo conteúdo e o CORS da origem.
const resposta = await fetch(url, { headers: { origin: origem }, cache: 'no-store' })
const corpo = new Uint8Array(await resposta.arrayBuffer())
const allowOrigin = resposta.headers.get('access-control-allow-origin')
const mesmo = corpo.length === bytes.length && Buffer.compare(corpo, bytes) === 0
if (resposta.status !== 200 || !mesmo || !allowOrigin) {
  throw new Error(
    `Prova pública falhou: HTTP ${resposta.status}, ${corpo.length} bytes, Access-Control-Allow-Origin=${allowOrigin ?? 'ausente'} (origem ${origem})`,
  )
}
console.error(`Prova pública OK (CORS para ${origem}: ${allowOrigin})`)
console.log(url)
