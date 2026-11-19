import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Inflate } from 'fflate'
import { readZipFiles } from '../src/export/backupFile'

const zip = readFileSync(
    resolve(import.meta.dirname, '../../../output/cenarios-reforma/lote8-portatil/cenario.zip'),
  ),
  arquivo = new File([new Uint8Array(zip).buffer], 'cenario.zip'),
  tamanhos = new Map<number, number>(),
  original = Inflate.prototype.push
let pendente = 0,
  chamadas = 0,
  bytesRecebidos = 0
// Instrumentação do profiler, somente neste processo de ensaio; não altera o decoder ou os dados.
Inflate.prototype.push = function (chunk, final) {
  chamadas++
  bytesRecebidos += chunk.byteLength
  tamanhos.set(chunk.length, (tamanhos.get(chunk.length) ?? 0) + 1)
  const r = original.call(this, chunk, final)
  pendente = Math.max(pendente, (this as unknown as { p: Uint8Array }).p.length)
  return r
}
try {
  const t = performance.now(),
    r = await readZipFiles(arquivo, { maxBytes: 300 * 1024 * 1024, maxEntries: 100 })
  const resultado = {
    ms: performance.now() - t,
    ok: r.ok,
    chamadas,
    bytesRecebidos,
    pendente,
    tamanhos: [...tamanhos].sort((a, b) => b[1] - a[1]).slice(0, 12),
  }
  writeFileSync(
    resolve(
      import.meta.dirname,
      '../../../output/cenarios-reforma/lote8-portatil/leitura-decoder.json',
    ),
    JSON.stringify(resultado, null, 2),
  )
  console.log(JSON.stringify(resultado))
} finally {
  Inflate.prototype.push = original
}
