// Gerencia o CORS do bucket R2 PÚBLICO (animação Rive da trilha Kids).
//
// POR QUE existe:
//   Até 09/2026 nada precisava de CORS aqui: tudo que o bucket público serve era
//   consumido por `<img src>`/`<video src>`, e elemento de mídia NÃO passa por CORS.
//   A arte da trilha era um SVG animado num `<img>` — dispensava.
//
//   O Rive mudou isso. O runtime lê o `.riv` por `fetch(url).arrayBuffer()`, que é
//   requisição cross-origin de verdade (o app está em `kids.sistemazero.com.br`, o
//   arquivo em `cdn.sistemazero.com.br`). Sem `Access-Control-Allow-Origin` o
//   navegador bloqueia, o `onLoadError` dispara e o `TrailRive` some da tela —
//   indistinguível de "ninguém subiu animação nenhuma". É um defeito CALADO, e é
//   por isso que este script existe e que o componente loga um aviso.
//
//   ⚠️ Rode ANTES de subir o community-kids com a trilha em Rive.
//
//   `PutBucketCors` SUBSTITUI a config inteira → faz GET, MESCLA e PUTa. IDEMPOTENTE.
//
// USO (bun carrega o .env do cwd — rode de dentro de packages/admin):
//   bun scripts/r2-cors-public.ts            # DRY-RUN: mostra o atual e o proposto
//   bun scripts/r2-cors-public.ts --apply    # aplica a config mesclada e re-lê p/ confirmar
//
// Aponta p/ o bucket de `R2_BUCKET` do .env (dev/staging = testes; prod =
// comunidade-sistema-zero — rode com as credenciais do host de prod).
import {
  type CORSRule,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { STUDENT_APP_ORIGINS } from './student-app-origins'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env
// O MESMO token S3 acessa os 4 buckets — `--bucket=<nome>` mira outro (ex.: o
// público de PROD) sem trocar o .env.
const bucketArg = process.argv.find((a) => a.startsWith('--bucket='))?.slice('--bucket='.length)
const bucket = bucketArg || R2_BUCKET
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !bucket) {
  console.error(
    'faltam envs R2_* (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY) ou bucket (R2_BUCKET / --bucket=)',
  )
  process.exit(1)
}

const apply = process.argv.includes('--apply')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const READ_RULE_ID = 'public-direct-read'

/**
 * Leitura por `fetch()` das origens dos apps de aluno. Só GET/HEAD: o bucket
 * público NUNCA recebe escrita do navegador (o upload passa pelo Admin).
 */
const READ_RULE: CORSRule = {
  ID: READ_RULE_ID,
  AllowedOrigins: STUDENT_APP_ORIGINS,
  AllowedMethods: ['GET', 'HEAD'],
  AllowedHeaders: ['range', 'content-type'],
  ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type', 'Content-Range', 'Accept-Ranges'],
  MaxAgeSeconds: 3600,
}

/** Só a NOSSA regra de leitura é substituída; qualquer outra é preservada intacta. */
const isOurRule = (rule: CORSRule): boolean => rule.ID === READ_RULE_ID

async function readCurrentRules(): Promise<CORSRule[]> {
  try {
    const res = await client.send(new GetBucketCorsCommand({ Bucket: bucket }))
    return res.CORSRules ?? []
  } catch (error) {
    const name = (error as { name?: string }).name
    // Bucket sem nenhuma config de CORS ainda — que é o estado esperado aqui.
    if (name === 'NoSuchCORSConfiguration' || name === '404' || name === 'NotFound') return []
    throw error
  }
}

const current = await readCurrentRules()
console.log(`bucket: ${bucket}`)
console.log(`\n── CORS ATUAL (${current.length} regra(s)) ──`)
console.log(JSON.stringify(current, null, 2))

const preserved = current.filter((r) => !isOurRule(r))
const merged = [...preserved, READ_RULE]
console.log(
  `\n── CORS PROPOSTO (${merged.length} regra(s): ${preserved.length} preservada(s) + 1 leitura dos apps de aluno) ──`,
)
console.log(JSON.stringify(merged, null, 2))

if (!apply) {
  console.log('\nDRY-RUN — nada foi alterado. Rode com --apply p/ gravar.')
  process.exit(0)
}

await client.send(
  new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: merged } }),
)
console.log('\nPUT ok — relendo p/ confirmar…')
const after = await readCurrentRules()
const ok = after.some(isOurRule)
console.log(JSON.stringify(after, null, 2))
console.log(
  ok ? '\n✅ regra de leitura presente no bucket público' : '\n⚠️ regra NÃO encontrada após o PUT',
)
process.exit(ok ? 0 : 1)
