// Gerencia o CORS dos buckets R2 PRIVADOS (materiais didáticos: anexos + PDF do e-book).
//
// POR QUE existe:
//   O bucket privado é lido por URL pré-assinada (SigV4, TTL ~300s) — a assinatura
//   É o controle de acesso; o CORS só decide se o JS de uma ORIGEM pode LER a
//   resposta. Regras já existentes: `admin-direct-upload` (PUT do PDF pelo admin) e
//   `community-direct-download` (GET dos apps de aluno via fetch). Esta última nasceu
//   só com o community ADULTO (localhost:3007 + staging) — quando o community-KIDS
//   ganhou o LIVRO 3D do e-book (pdf.js faz `fetch()` do PDF e SEGUE o 302 pré-assinado
//   até o R2, leitura CROSS-ORIGIN), a origem do kids NÃO estava na lista → o navegador
//   bloqueia: "No 'Access-Control-Allow-Origin' header is present". (O anexo baixava por
//   navegação top-level OU stream inline ≤20MB, sem CORS; o livro 3D e o download de anexo
//   por fetch — kids-lesson-attachments — precisam.)
//
//   Este script ESTENDE a `community-direct-download` p/ os DOIS apps × dev/staging/prod
//   (mantém métodos/headers como SUPERCONJUNTO — zero regressão no fluxo adulto que já
//   funciona) e PRESERVA a `admin-direct-upload`. `PutBucketCors` SUBSTITUI a config
//   inteira → faz GET, MESCLA e PUTa. IDEMPOTENTE (re-rodar converge p/ o mesmo estado).
//
// USO (bun carrega o .env do cwd — rode de dentro de packages/admin):
//   bun scripts/r2-cors-private.ts           # DRY-RUN: mostra o atual e o proposto
//   bun scripts/r2-cors-private.ts --apply    # aplica a config mesclada e re-lê p/ confirmar
//
// Aponta p/ o bucket de `R2_PRIVATE_BUCKET` do .env (dev/staging = testes-privado;
// prod = comunidade-sistema-zero-privado — rode com as credenciais do host de prod).
import {
  type CORSRule,
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PRIVATE_BUCKET } = process.env
// O MESMO token S3 acessa os 4 buckets — `--bucket=<nome>` mira outro (ex.: o privado de
// PROD) sem trocar o .env. Sem a flag, usa R2_PRIVATE_BUCKET do ambiente carregado.
const bucketArg = process.argv.find((a) => a.startsWith('--bucket='))?.slice('--bucket='.length)
const bucket = bucketArg || R2_PRIVATE_BUCKET
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !bucket) {
  console.error(
    'faltam envs R2_* (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY) ou bucket (R2_PRIVATE_BUCKET / --bucket=)',
  )
  process.exit(1)
}

const apply = process.argv.includes('--apply')

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

// ID da regra de download dos apps de aluno (já existia só com o community adulto).
const DOWNLOAD_RULE_ID = 'community-direct-download'

// Origens dos apps de ALUNO que LEEM o bucket privado via fetch (livro 3D do e-book +
// download de anexo). Os DOIS apps (community adulto + community-kids) × dev/staging/prod
// + domínios definitivos. Origem que nunca bate neste bucket é inócua (só não casa).
const STUDENT_APP_ORIGINS = [
  'http://localhost:3007', // community (dev)
  'http://localhost:3008', // community-kids (dev)
  'https://community-staging-66f2.up.railway.app', // community (staging)
  'https://community-kids-staging.up.railway.app', // community-kids (staging)
  'https://community-production-4149.up.railway.app', // community (prod, fallback railway)
  'https://community-kids-production.up.railway.app', // community-kids (prod, fallback railway)
  'https://comunidade.sistemazero.com.br', // community (prod, domínio definitivo)
  'https://kids.sistemazero.com.br', // community-kids (prod, domínio definitivo)
]

// Regra canônica de download: GET/HEAD nas origens dos apps de aluno. ExposeHeaders =
// SUPERCONJUNTO do que a regra adulta já expunha (Content-Disposition p/ o filename do
// anexo baixado por fetch) + Content-Range/Accept-Ranges (futuro: pdf.js por faixas).
const DOWNLOAD_RULE: CORSRule = {
  ID: DOWNLOAD_RULE_ID,
  AllowedOrigins: STUDENT_APP_ORIGINS,
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
}

function subsetOf(a: string[] = [], whole: string[]): boolean {
  const set = new Set(whole)
  return a.every((x) => set.has(x))
}

// Uma regra é a "nossa" de download (versão antiga, a ser substituída pela canônica)
// se casar o ID OU for SÓ GET/HEAD em origens ⊆ apps de aluno. NÃO casa a
// `admin-direct-upload` (tem PUT) — ela é preservada intacta.
function isOurRule(rule: CORSRule): boolean {
  if (rule.ID === DOWNLOAD_RULE_ID) return true
  const methods = [...(rule.AllowedMethods ?? [])].sort()
  return (
    methods.length === 2 &&
    methods[0] === 'GET' &&
    methods[1] === 'HEAD' &&
    subsetOf(rule.AllowedOrigins, STUDENT_APP_ORIGINS)
  )
}

async function readCurrentRules(): Promise<CORSRule[]> {
  try {
    const res = await client.send(new GetBucketCorsCommand({ Bucket: bucket }))
    return res.CORSRules ?? []
  } catch (error) {
    const name = (error as { name?: string }).name
    // Bucket sem nenhuma config de CORS ainda.
    if (name === 'NoSuchCORSConfiguration' || name === '404' || name === 'NotFound') return []
    throw error
  }
}

const current = await readCurrentRules()
console.log(`bucket: ${bucket}`)
console.log(`\n── CORS ATUAL (${current.length} regra(s)) ──`)
console.log(JSON.stringify(current, null, 2))

const preserved = current.filter((r) => !isOurRule(r))
const merged = [...preserved, DOWNLOAD_RULE]
console.log(
  `\n── CORS PROPOSTO (${merged.length} regra(s): ${preserved.length} preservada(s) + 1 download dos apps de aluno) ──`,
)
console.log(JSON.stringify(merged, null, 2))

if (!apply) {
  console.log('\nDRY-RUN — nada foi alterado. Rode com --apply p/ gravar.')
  process.exit(0)
}

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: { CORSRules: merged },
  }),
)
console.log('\nPUT ok — relendo p/ confirmar…')
const after = await readCurrentRules()
const ok = after.some(isOurRule)
console.log(JSON.stringify(after, null, 2))
console.log(
  ok ? '\n✅ regra dos apps de aluno presente no bucket' : '\n⚠️ regra NÃO encontrada após o PUT',
)
process.exit(ok ? 0 : 1)
