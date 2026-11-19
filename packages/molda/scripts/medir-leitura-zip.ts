import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'
import { readZipFiles } from '../src/export/backupFile'

const raiz = resolve(fileURLToPath(new URL('../../..', import.meta.url))),
  destino = resolve(raiz, 'output/cenarios-reforma/lote8-portatil'),
  nome = process.argv[2] ?? 'baseline',
  bytes = new Uint8Array(256 * 1024)
if (!/^[a-z0-9-]+$/.test(nome)) throw Error('Escolha um identificador simples para a medição.')
let s = 0x12345678
for (let i = 0; i < bytes.length; i++) {
  s ^= s << 13
  s ^= s >>> 17
  s ^= s << 5
  bytes[i] = s & 255
}
const entradas = Object.fromEntries(
    Array.from({ length: 32 }, (_, i) => [
      `modelos/ensaio-${i}.glb`,
      bytes.subarray(i * 8192, (i + 1) * 8192),
    ]),
  ),
  original = createHash('sha256').update(bytes).digest('hex'),
  zip = zipSync(entradas, { level: 6, mtime: new Date('2000-01-01T00:00:00Z') }),
  arquivo = new File([new Uint8Array(zip).buffer], 'ensaio.zip'),
  amostras: number[] = []
for (let i = 0; i < 13; i++) {
  const inicio = performance.now(),
    r = await readZipFiles(arquivo, { maxBytes: bytes.length, maxEntries: 32 }),
    ms = performance.now() - inicio
  if (
    !r.ok ||
    r.files.length !== 32 ||
    r.files.some((f, i) => f.path !== `modelos/ensaio-${i}.glb`) ||
    createHash('sha256')
      .update(Buffer.concat(r.files.map((f) => f.bytes)))
      .digest('hex') !== original
  )
    throw Error('A leitura perdeu conteúdo ou ordem durante a medição.')
  if (i >= 3) amostras.push(ms)
}
const ordenadas = [...amostras].sort((a, b) => a - b),
  resultado = {
    nome,
    bytes: bytes.length,
    arquivos: 32,
    bytesZip: zip.length,
    warmup: 3,
    runs: 10,
    sha256: original,
    p50: ordenadas[4],
    p95: ordenadas[9],
    p99: ordenadas[9],
    amostras,
  }
mkdirSync(destino, { recursive: true })
writeFileSync(resolve(destino, `leitura-${nome}.json`), JSON.stringify(resultado, null, 2))
console.log(JSON.stringify(resultado))
