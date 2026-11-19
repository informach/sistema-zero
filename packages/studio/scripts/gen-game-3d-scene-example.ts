/** Compila uma cena autoral do Molda para o exemplo Herói do Molda; não usa fixtures. */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import { compilarCenario } from '@sistemazero/molda-cenarios-motor/compilar'
import { createEmptyProject } from '../src/core/project'
import { prepararImportacaoDeCena3D } from '../src/core/scene3d/importar'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
const documento = criarDocumentoVazio('campo-do-heroi', 'Campo do Herói')
documento.base = { tipo: 'plano', largura: 32, comprimento: 32 }
documento.marcadores = [
  {
    id: 'inicio',
    nome: 'Início',
    grupo: null,
    oculto: false,
    bloqueado: false,
    posicao: { x: 0, y: 0, z: 0 },
    giro: Math.PI,
    noChao: true,
    objeto: null,
    configuracao: { tipo: 'inicio', principal: true },
  },
]
const semRecurso = async (): Promise<ArrayBuffer> => {
  throw Error('A cena autoral não depende de acervo externo.')
}
const pacote = await compilarCenario(
  documento,
  { cenario: documento.id, revisao: 1 },
  { equipe: false, bibliotecas: [] },
  { modelo: semRecurso, textura: semRecurso, terreno: semRecurso },
  new AbortController().signal,
)
const plano = await prepararImportacaoDeCena3D(
  createEmptyProject('heroi', 'Herói do Molda'),
  pacote,
)
const fonte = `// Gerado por scripts/gen-game-3d-scene-example.ts. Não editar os bytes.\nimport type { ProjectAsset } from '../../core/projectAssets'\n\nexport const CAMPO_DO_HEROI_ID = ${JSON.stringify(plano.assetId)}\nexport const CAMPO_DO_HEROI_ASSETS: ProjectAsset[] = ${JSON.stringify(plano.assets)}\n`
const caminho = resolve(
  import.meta.dirname,
  '../src/official-extensions/game-3d-advanced/sceneExampleAssets.ts',
)
const formatado = Bun.spawnSync({
  cmd: ['bunx', '--no-install', 'biome', 'format', '--stdin-file-path', caminho],
  stdin: Buffer.from(fonte),
  stdout: 'pipe',
  stderr: 'pipe',
})
if (formatado.exitCode !== 0)
  throw Error(`Biome não formatou a cena do exemplo: ${formatado.stderr.toString()}`)
const saida = formatado.stdout.toString()
if (process.argv.includes('--check')) {
  if ((await readFile(caminho, 'utf8')) !== saida)
    throw Error('Regenere o cenário do Herói do Molda.')
} else await writeFile(caminho, saida)
console.log(
  `Campo do Herói: ${plano.assets.length} recursos, ${saida.length} caracteres, ${plano.assetId}`,
)
