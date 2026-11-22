import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  sceneIntersectsBox,
  sceneMoveBox,
  sceneObjectIntersectsBox,
  scenePlatformLanding,
  sceneVisitColliders,
} from '../src/studio/pinta-scene-geometry'
import {
  sceneArtFrame,
  sceneLayerState,
  transformSceneSetObject,
} from '../src/studio/pinta-scene-runtime'

// Capturar a função ANTES do bundler: a minificação pode introduzir templates e
// renomear símbolos. O texto portátil deve ser estável em dev e produção.
const file = new URL('../src/studio/pinta-scene-transform.generated.ts', import.meta.url)
const funcoes = [
  transformSceneSetObject,
  sceneArtFrame,
  sceneLayerState,
  sceneObjectIntersectsBox,
  sceneVisitColliders,
  sceneIntersectsBox,
  scenePlatformLanding,
  sceneMoveBox,
]
/**
 * Os nomes encurtados (lote 8 da conclusão do plano do Estúdio, 22/11/2026): o Bun.Transpiler
 * desta versão não encurta identificadores, então as funções passam pelo Bun.build num módulo
 * temporário. O resultado vai embrulhado numa função que devolve as oito com os nomes longos: os
 * nomes de uma letra nunca chegam ao escopo do motor (o fragmento entra no meio do Jogo 2D). É a
 * compensação de bytes que abre espaço para o cache e a pré-carga do tocador de cenas.
 */
async function compactar(): Promise<string> {
  const pasta = mkdtempSync(join(tmpdir(), 'sz-pinta-transform-'))
  try {
    const entrada = join(pasta, 'entrada.js')
    writeFileSync(
      entrada,
      `${funcoes.map((fn) => `var ${fn.name}=(${fn.toString()});`).join('')}export{${funcoes
        .map((fn) => fn.name)
        .join(',')}};`,
    )
    const resultado = await Bun.build({
      entrypoints: [entrada],
      format: 'esm',
      target: 'browser',
      minify: { whitespace: true, identifiers: true, syntax: false },
    })
    if (!resultado.success || resultado.outputs.length !== 1)
      throw new AggregateError(resultado.logs, 'Falha ao compactar o compositor portátil.')
    let codigo = (await resultado.outputs[0]!.text()).trim()
    const exportacao = codigo.match(/export\s*\{([^}]*)\};?\s*$/)
    if (!exportacao || exportacao.index === undefined)
      throw new Error('O compositor compactado perdeu a lista de exportações.')
    const curto = new Map(
      exportacao[1]!.split(',').map((par) => {
        const [interno, externo] = par.trim().split(/\s+as\s+/)
        return [externo ?? interno!, interno!] as const
      }),
    )
    codigo = codigo.slice(0, exportacao.index).trim()
    if (!codigo.endsWith(';')) codigo += ';'
    const nomes = funcoes.map((fn) => {
      const nome = curto.get(fn.name)
      if (!nome) throw new Error(`O compositor compactado perdeu ${fn.name}.`)
      return nome
    })
    return `var[${funcoes.map((fn) => fn.name).join(',')}]=(()=>{${codigo}return[${nomes.join(',')}]})();`
  } finally {
    rmSync(pasta, { recursive: true, force: true })
  }
}
const source = await compactar()
if (source.includes('`')) throw new Error('O compositor portátil exige fonte sem templates.')
// Match the repository formatter at generation time. JSON escapes embedded double
// quotes; the single-quoted TS literal only needs those escapes removed and its
// own apostrophes escaped. The exported runtime string remains byte-identical.
const literal = `'${JSON.stringify(source).slice(1, -1).replaceAll('\\"', '"').replaceAll("'", "\\'")}'`
if (process.argv.includes('--check')) {
  const saved = await import(file.href)
  if (saved.sceneObjectTransformSource !== source) {
    console.error('Rode bun packages/core/scripts/gen-pinta-scene-transform.ts')
    process.exit(1)
  }
} else {
  await Bun.write(
    file,
    `// Gerado por scripts/gen-pinta-scene-transform.ts. Não editar.\nexport const sceneObjectTransformSource =\n  ${literal}\n`,
  )
}
