/**
 * Spike 04 — baixa o DANFSe (PDF) da NFS-e emitida no spike 02.
 * Uso: bun spike/04-danfse.ts [chaveAcesso]  (default: out/chave-acesso.txt)
 * ⚠️ O padrão do DANFSe muda em jul/2026 — se este endpoint sumir, consultar a
 * documentação atual (camada DanfseClient do serviço é trocável por isso).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { loadA1Certificate } from './lib/cert'
import { baseUrls, dumpResponse, mtlsFetch } from './lib/http'

const cert = loadA1Certificate()
const { adnDanfse, ambiente } = baseUrls()
if (ambiente === 'producao') throw new Error('Spike NÃO roda em produção.')

const chave = (
  process.argv[2] ?? readFileSync(`${import.meta.dir}/out/chave-acesso.txt`, 'utf8')
).trim()

// Endpoint confirmado no spec oficial do módulo: GET /danfse/{chaveAcesso}.
for (const url of [`${adnDanfse}/${chave}`]) {
  console.log('\nTentando', url)
  const res = await mtlsFetch(url, cert)
  const type = res.headers.get('content-type') ?? ''
  if (res.ok && type.includes('pdf')) {
    const bytes = Buffer.from(await res.arrayBuffer())
    writeFileSync(`${import.meta.dir}/out/danfse.pdf`, bytes)
    console.log(`OK → spike/out/danfse.pdf (${bytes.length} bytes) via ${url}`)
    process.exit(0)
  }
  await dumpResponse(`GET ${url}`, res)
}
console.log('\nNenhum endpoint devolveu PDF — conferir docs/Swagger do DANFSe.')
