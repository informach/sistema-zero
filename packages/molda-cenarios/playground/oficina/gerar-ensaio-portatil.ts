import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readZipFiles } from '@sistemazero/molda/arquivos'
import {
  arquivosDoPacoteThree,
  exportarPacoteThree,
  LIMITES_DO_PACOTE_THREE,
} from '../../src/exportar/three'

const raiz = resolve(fileURLToPath(new URL('../../../..', import.meta.url))),
  origem = resolve(raiz, 'output/cenarios-reforma/lote8-integracao-terreno-juncao'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote8-portatil'),
  { cena } = JSON.parse(readFileSync(resolve(origem, 'resultado.json'), 'utf8')),
  arquivos = new Map<string, Uint8Array>(
    cena.arquivos.map((a: { caminho: string }) => [
      a.caminho,
      new Uint8Array(readFileSync(resolve(origem, a.caminho))),
    ]),
  ),
  pacote = { cena, arquivos },
  sinal = new AbortController().signal,
  inicio = performance.now(),
  esperados = await arquivosDoPacoteThree(pacote, sinal),
  preparado = performance.now()
console.log(`Conferência/distribuição: ${(preparado - inicio).toFixed(1)} ms`)
const zip = await exportarPacoteThree(pacote, sinal),
  compactado = performance.now()
console.log(`Exportação ZIP: ${(compactado - preparado).toFixed(1)} ms`)
const reaberto = await readZipFiles(new File([zip], 'cenario.zip'), {
  maxBytes: LIMITES_DO_PACOTE_THREE.bytes,
  maxEntries: LIMITES_DO_PACOTE_THREE.arquivos,
})
const reabertura = performance.now(),
  temposMs = {
    preparacao: preparado - inicio,
    exportacao: compactado - preparado,
    reabertura: reabertura - compactado,
  }
console.log(`Reabertura: ${temposMs.reabertura.toFixed(1)} ms`)
if (!reaberto.ok) throw Error(`O ZIP não reabriu: ${reaberto.reason}`)
if (reaberto.files.length !== esperados.size) throw Error('O ZIP perdeu arquivos.')
mkdirSync(saida, { recursive: true })
writeFileSync(resolve(saida, 'cenario.zip'), new Uint8Array(await zip.arrayBuffer()))
// O ensaio usa só os bytes que voltaram da descompactação, não o mapa original.
for (const f of reaberto.files) {
  const original = esperados.get(f.path)
  if (!original || !Buffer.from(original).equals(Buffer.from(f.bytes)))
    throw Error(`Bytes diferentes no ZIP: ${f.path}`)
  const destino = resolve(saida, 'extraido', f.path)
  mkdirSync(resolve(destino, '..'), { recursive: true })
  writeFileSync(destino, f.bytes)
}
writeFileSync(
  resolve(saida, 'pacote.json'),
  JSON.stringify(
    {
      arquivos: reaberto.files.length,
      bytesZip: zip.size,
      bytesExtraidos: reaberto.files.reduce((n, f) => n + f.bytes.length, 0),
      fonte: cena.fonte,
      temposMs,
    },
    null,
    2,
  ),
)
console.log(
  `ZIP reaberto: ${reaberto.files.length} arquivos, ${zip.size} bytes; conteúdo extraído conferido.`,
)
