import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readZipFiles } from '@sistemazero/molda/arquivos'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/compilar'

const raiz = resolve(import.meta.dir, '../../../..'),
  raylib = process.env.CENARIOS_QA_RAYLIB === '1',
  pasta = resolve(
    raiz,
    raylib
      ? 'output/cenarios-reforma/lote8-raylib/interface'
      : 'output/cenarios-reforma/lote8-interface',
  ),
  destino = raylib
    ? resolve(raiz, 'output/cenarios-reforma/lote8-raylib/pacote')
    : resolve(pasta, 'portatil'),
  extraidos = resolve(destino, 'extraido'),
  bytes = new Uint8Array(
    readFileSync(resolve(pasta, raylib ? '1440-900-light-raylib.zip' : '1440-900-light.zip')),
  ),
  zip = await readZipFiles(new File([bytes], 'cenario.zip'), {
    maxBytes: 300 * 1024 ** 2,
    maxEntries: 9000,
  })
if (!zip.ok) throw Error(`ZIP da interface recusado: ${zip.reason}`)
const arquivos = new Map(zip.files.map((f) => [f.path, f.bytes])),
  cena = JSON.parse(new TextDecoder().decode(arquivos.get('cenario.json')))
await conferirConteudoCompilado(
  cena,
  new Map(cena.arquivos.map((a: { caminho: string }) => [a.caminho, arquivos.get(a.caminho)!])),
)
for (const f of zip.files) {
  const caminho = resolve(extraidos, f.path)
  mkdirSync(resolve(caminho, '..'), { recursive: true })
  writeFileSync(caminho, f.bytes)
}
writeFileSync(
  resolve(destino, 'pacote.json'),
  JSON.stringify(
    {
      arquivos: zip.files.length,
      bytesZip: bytes.length,
      bytesExtraidos: zip.files.reduce((s, f) => s + f.bytes.length, 0),
      fonte: cena.fonte,
      origem: 'Download pela interface da oficina',
    },
    null,
    2,
  ),
)
console.log(`Pacote da interface conferido e extraído: ${zip.files.length} arquivos.`)
