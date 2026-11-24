import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const { chromium } = createRequire(new URL('../../molda-cenarios/package.json', import.meta.url))(
  'playwright-core',
)

// Primeiro compile a entrada com Bun, target node e conditions react-server.
// Credenciais, URLs assinadas e binários nunca são gravados na evidência.
const raiz = resolve(import.meta.dirname, '../../..')
const saida = resolve(raiz, 'output/cenarios-reforma/upload-condicional')
mkdirSync(saida, { recursive: true })
let etapa = 'ler configuração de staging'
let browser, r2
const chaves = [],
  checks = []
try {
  let env
  try {
    env = JSON.parse(
      execFileSync(
        'pwsh',
        [
          '-NoProfile',
          '-Command',
          'railway variable list --project 415d5a1c-5f75-432c-8445-b395d0977ce3 --environment f634cff6-aafb-4804-8b69-172fad4e946e --service 9df1b493-4cea-4b36-bec8-7299f054c17d --json',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      ),
    )
  } catch {
    throw Error('Configuração indisponível')
  }
  assert.equal(env.R2_UGC_BUCKET, 'testes-ugc')
  for (const [nome, valor] of Object.entries(env))
    if (nome.startsWith('R2_') || ['GATEWAY_URL', 'JWT_JWKS_URL'].includes(nome))
      process.env[nome] = valor
  r2 = await import(
    new URL('../../../output/cenarios-reforma/cenarios-upload-entry.mjs', import.meta.url)
  )
  const identificador = randomUUID(),
    prefixo = `qa/cenarios/${identificador}/`
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  for (const origem of [
    'https://community-staging-66f2.up.railway.app',
    'https://community-kids-staging.up.railway.app',
  ]) {
    etapa = `upload pela origem ${new URL(origem).hostname}`
    const p = await browser.newPage()
    await p.goto(`${origem}/login`)
    const posicoes = new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0])
    const json = Buffer.from(
      JSON.stringify({
        asset: { version: '2.0', extras: { ensaio: `${identificador}:${origem}` } },
        scene: 0,
        scenes: [{ nodes: [0] }],
        nodes: [{ mesh: 0 }],
        meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
        buffers: [{ byteLength: 36 }],
        bufferViews: [{ buffer: 0, byteLength: 36 }],
        accessors: [
          {
            bufferView: 0,
            componentType: 5126,
            count: 3,
            type: 'VEC3',
            min: [0, 0, 0],
            max: [2, 2, 0],
          },
        ],
      }),
    )
    const n = Math.ceil(json.length / 4) * 4,
      bytes = Buffer.alloc(28 + n + 36)
    ;[0x46546c67, 2, bytes.length, n, 0x4e4f534a].forEach((v, i) => {
      bytes.writeUInt32LE(v, i * 4)
    })
    bytes.fill(32, 20, 20 + n)
    bytes.set(json, 20)
    bytes.writeUInt32LE(36, 20 + n)
    bytes.writeUInt32LE(0x004e4942, 24 + n)
    bytes.set(new Uint8Array(posicoes.buffer), 28 + n)
    const digest = createHash('sha256').update(bytes).digest('hex'),
      key = `${prefixo}${digest}.glb`
    assert.match(key, /^qa\/cenarios\/[a-f0-9-]{36}\/[a-f0-9]{64}\.glb$/)
    assert.equal(await r2.r2GetObjectUgc(key), null)
    chaves.push(key)
    const url = await r2.r2PresignPutUgc({
      key,
      contentType: 'model/gltf-binary',
      contentLength: bytes.length,
      criarUmaVez: true,
      expiresInSeconds: 120,
    })
    const respostas = await p.evaluate(
      async ({ url, dados }) => {
        const headers = { 'content-type': 'model/gltf-binary', 'if-none-match': '*' }
        const primeiro = await fetch(url, { method: 'PUT', headers, body: new Uint8Array(dados) })
        const trocado = new Uint8Array(dados)
        trocado[trocado.length - 1] ^= 1
        const segundo = await fetch(url, { method: 'PUT', headers, body: trocado })
        return [primeiro.status, segundo.status]
      },
      { url, dados: [...bytes] },
    )
    assert.deepEqual(respostas, [200, 412])
    const recebido = await r2.r2GetObjectUgc(key)
    assert.ok(recebido)
    assert.deepEqual(await r2.conferirUploadDeCenario(recebido, digest, 'modelo'), {
      digest,
      bytes: bytes.length,
      tipoDoConteudo: 'model/gltf-binary',
    })
    checks.push({
      origem,
      primeiroPut: respostas[0],
      sobrescritaRecusada: respostas[1],
      hashETamanhoConferidos: true,
    })
    await p.close()
  }
} catch (e) {
  // Erros do navegador podem conter URLs assinadas. Grave somente a etapa e o tipo.
  writeFileSync(resolve(saida, 'falha.json'), JSON.stringify({ etapa, tipo: e.name }, null, 2))
  console.error(`Ensaio recusado: ${etapa}. Consulte a evidência sem credenciais.`)
  process.exitCode = 1
} finally {
  for (const chave of chaves) {
    assert.match(chave, /^qa\/cenarios\/[a-f0-9-]{36}\/[a-f0-9]{64}\.glb$/)
    await r2.r2DeleteObjectUgc(chave)
    assert.equal(await r2.r2GetObjectUgc(chave), null)
  }
  await browser?.close()
  if (!process.exitCode) {
    writeFileSync(
      resolve(saida, 'resultado.json'),
      JSON.stringify({ checks, arquivosTemporariosRemovidos: true }, null, 2),
    )
    console.log(JSON.stringify({ checks, arquivosTemporariosRemovidos: true }))
  }
}
