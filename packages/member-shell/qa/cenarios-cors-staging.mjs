import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3'

// Somente o bucket de testes. A CLI autenticada mantém os valores secretos em memória.
// Execução: node packages/member-shell/qa/cenarios-cors-staging.mjs [--apply]
const comando =
  'railway variable list --project 415d5a1c-5f75-432c-8445-b395d0977ce3 --environment f634cff6-aafb-4804-8b69-172fad4e946e --service 9df1b493-4cea-4b36-bec8-7299f054c17d --json'
function lerVariaveis() {
  try {
    return JSON.parse(
      execFileSync('pwsh', ['-NoProfile', '-Command', comando], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    )
  } catch {
    throw Error('Não consegui ler a configuração de staging pela CLI autenticada')
  }
}
const env = lerVariaveis()
assert.equal(env.R2_UGC_BUCKET, 'testes-ugc', 'A operação só aceita o bucket de testes conferido')
const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
})
const origens = [
  'https://community-staging-66f2.up.railway.app',
  'https://community-kids-staging.up.railway.app',
]
const ler = async () =>
  (await client.send(new GetBucketCorsCommand({ Bucket: env.R2_UGC_BUCKET }))).CORSRules ?? []
const antes = await ler()
const atende = (r, origem) =>
  r.AllowedOrigins?.includes(origem) && r.AllowedMethods?.includes('PUT')
assert.ok(
  origens.every((origem) => antes.some((r) => atende(r, origem))),
  'Falta a regra existente dos apps de staging',
)
const depois = antes.map((r) =>
  origens.some((o) => atende(r, o))
    ? { ...r, AllowedHeaders: [...new Set([...(r.AllowedHeaders ?? []), 'if-none-match'])] }
    : r,
)
const aplicar = process.argv.includes('--apply')
if (aplicar && JSON.stringify(antes) !== JSON.stringify(depois)) {
  assert.deepEqual(await ler(), antes, 'A configuração mudou durante a leitura; execute novamente')
  await client.send(
    new PutBucketCorsCommand({
      Bucket: env.R2_UGC_BUCKET,
      CORSConfiguration: { CORSRules: depois },
    }),
  )
}
if (aplicar) assert.deepEqual(await ler(), depois)
console.log(
  JSON.stringify({
    bucket: 'testes-ugc',
    aplicado: aplicar,
    alterado: JSON.stringify(antes) !== JSON.stringify(depois),
    regrasPreservadas: antes.length === depois.length,
    origens,
  }),
)
if (aplicar) {
  const checks = []
  for (const origin of origens) {
    let r
    // A documentação do R2 prevê até 30 s para propagação de mudanças no CORS.
    for (let tentativa = 0; tentativa < 4; tentativa++) {
      if (tentativa) await setTimeout(10_000)
      r = await fetch(
        `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_UGC_BUCKET}/cenarios/cors-probe`,
        {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'PUT',
            'Access-Control-Request-Headers': 'content-type,if-none-match',
          },
        },
      )
      if (r.ok) break
      await r.body?.cancel()
    }
    assert.ok(r.ok, `O preflight de staging foi recusado: ${r.status}`)
    assert.equal(r.headers.get('access-control-allow-origin'), origin)
    assert.ok(
      r.headers.get('access-control-allow-headers')?.toLowerCase().includes('if-none-match'),
    )
    checks.push({ origin, status: r.status, criacaoUnicaPermitida: true })
  }
  console.log(JSON.stringify({ checks }))
}
