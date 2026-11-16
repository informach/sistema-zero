import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { ModeloDeCatalogoSchema } from '@sistemazero/molda-cenarios-core'
import { validarArteCenario } from '../src/lib/cenarios-assets'

const arquivo = process.argv[2]
if (!arquivo) throw Error('Informe o catálogo JSON preparado')
const c = await Bun.file(resolve(arquivo)).json(),
  modelos = c.modelos.map((m: unknown) => ModeloDeCatalogoSchema.parse(m))
if (createHash('sha256').update(JSON.stringify(modelos)).digest('hex') !== c.digest)
  throw Error('Catálogo alterado')
const env = process.env
if (
  !env.R2_ACCOUNT_ID ||
  !env.R2_ACCESS_KEY_ID ||
  !env.R2_SECRET_ACCESS_KEY ||
  !env.R2_PRIVATE_BUCKET
)
  throw Error('R2 privado não configurado')
const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    requestHandler: { connectionTimeout: 5000, requestTimeout: 120000 },
  }),
  bucket = env.R2_PRIVATE_BUCKET
let proximo = 0,
  enviados = 0,
  existentes = 0
async function trabalhador() {
  for (;;) {
    const m = modelos[proximo++]
    if (!m) return
    const key = `molda-cenarios/arte/${m.digest}.glb`
    try {
      const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
      if (h.ContentLength !== m.bytes) throw Error('Objeto remoto de tamanho diferente')
      existentes++
      continue
    } catch (e) {
      if (!(e instanceof Error) || !['NotFound', 'NoSuchKey'].includes(e.name)) throw e
    }
    const acervo = Bun.file(resolve('../../output/molda-cenarios/acervo', m.arquivo)),
      piloto = Bun.file(resolve('../../output/faisca-arte', m.arquivo)),
      f = (await acervo.exists()) ? acervo : piloto,
      bytes = new Uint8Array(await f.arrayBuffer())
    validarArteCenario(`${m.digest}.glb`, bytes)
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ContentType: 'model/gltf-binary',
        CacheControl: 'private,max-age=31536000,immutable',
      }),
    )
    enviados++
    if ((enviados + existentes) % 100 === 0)
      console.log(JSON.stringify({ enviados, existentes, total: modelos.length }))
  }
}
await Promise.all(Array.from({ length: 4 }, () => trabalhador()))
// Leitura real de uma peça confirma o objeto remoto pelo mesmo SHA-256 do catálogo.
const amostra = modelos[0],
  r = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: `molda-cenarios/arte/${amostra.digest}.glb` }),
  ),
  bytes = await r.Body!.transformToByteArray()
validarArteCenario(`${amostra.digest}.glb`, bytes)
console.log(
  JSON.stringify({
    enviados,
    existentes,
    total: modelos.length,
    amostraVerificada: true,
    digest: c.digest,
  }),
)
await Bun.write(
  resolve('../../output/molda-cenarios/publicacao-arte.json'),
  JSON.stringify(
    {
      enviados,
      existentes,
      total: modelos.length,
      digest: c.digest,
      amostra: amostra.digest,
      verificadoEm: new Date().toISOString(),
    },
    null,
    2,
  ),
)
s3.destroy()
