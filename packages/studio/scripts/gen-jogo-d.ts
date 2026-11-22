/**
 * Gera o jogo D (lote 8 da conclusão do plano do Estúdio, 22/11/2026): os materiais (cenas do
 * Pinta, personagens e sons, tudo feito por código em `scripts/jogo-d/`) e a IR estruturada do
 * programa (`src/examples/jogoDSource.ts`). Mesmos bytes a cada rodada. `--check` só confere.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type PintaScene, PintaSceneSchema } from '@sistemazero/core/studio/pinta-scene'
import type { ProjectAsset } from '../src/core/project'
import { sanitizeProjectAssets } from '../src/core/projectAssets'
import { JOGO_D_DESCRIPTION, jogoDSource } from '../src/examples/jogoDSource'
import { normalizeSZIR, SZIRV2Schema } from '../src/ir'
import { parseJS } from '../src/parsers/js'
import { dataUrl, personagens, previa, tileset } from './jogo-d/arte'
import { casa, caverna, mundo } from './jogo-d/cenas'
import { sons } from './jogo-d/sons'
import { writeGeneratedSource } from './writeGeneratedSource'

function stripIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripIds)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== '__id')
      .map(([key, child]) => [key, stripIds(child)]),
  )
}
/** Nenhum nó opaco: todo trecho do programa vira um bloco de verdade. */
function assertStructured(value: unknown): void {
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (['rawJS', 'rawHTML', 'rawCSS', 'memberCall'].includes(String(record.type)))
    throw new Error(`Trecho opaco no jogo D: ${JSON.stringify(record).slice(0, 300)}`)
  for (const child of Object.values(record)) assertStructured(child)
}

export function jogoDAssets(): ProjectAsset[] {
  const pecas = tileset(),
    imagemDasPecas = dataUrl(pecas.png)
  const cenas = [
    mundo(imagemDasPecas),
    ...[0, 1, 2].map((i) => caverna(i, imagemDasPecas)),
    ...[0, 1, 2, 3].map((i) => casa(i, imagemDasPecas)),
  ]
  const assets: ProjectAsset[] = cenas.map(({ cena, grade }) => {
    const scene: PintaScene = PintaSceneSchema.parse(cena)
    const visiveis = scene.layers.flatMap((l) =>
      l.kind === 'tiles' && !l.collision && !l.front ? [l.cells] : [],
    )
    return {
      id: scene.id,
      name: scene.id,
      kind: 'image',
      source: 'library',
      dataUrl: dataUrl(previa(grade.colunas, grade.linhas, visiveis, pecas.medias).png),
      width: grade.colunas * 4,
      height: grade.linhas * 4,
      scene,
    }
  })
  for (const [nome, png] of Object.entries(personagens()))
    assets.push({
      id: `jogo-d-${nome}`,
      name: `jogo-d-${nome}`,
      kind: 'image',
      source: 'library',
      dataUrl: dataUrl(png),
      width: 32,
      height: 32,
    })
  for (const [nome, wav] of Object.entries(sons()))
    assets.push({
      id: nome,
      name: nome,
      kind: 'audio',
      source: 'library',
      dataUrl: dataUrl(wav, 'audio/wav'),
    })
  // O saneador do projeto é o mesmo da abertura: nada pode ficar de fora.
  const avisos: string[] = []
  const saneados = sanitizeProjectAssets(assets, { warnings: avisos })
  if (saneados.length !== assets.length || avisos.length)
    throw new Error(`Materiais recusados: ${assets.length - saneados.length} ${avisos.join(' ')}`)
  return assets
}

export function jogoDIR() {
  const ir = SZIRV2Schema.parse(
    normalizeSZIR({
      html: [],
      css: [],
      js: parseJS(jogoDSource()),
      extensions: [{ extensionId: 'game-2d' }],
    }),
  )
  assertStructured(ir)
  return stripIds(ir)
}

if (import.meta.main) {
  const assets = jogoDAssets(),
    ir = jogoDIR()
  const destinoMateriais = join(import.meta.dir, '../src/examples/jogoD.generated.ts'),
    destinoIR = join(import.meta.dir, '../src/examples/__gen_jogoD.ts')
  const materiais = `// Gerado por scripts/gen-jogo-d.ts. Não edite.\nimport type { ProjectAsset } from '../core/project'\nexport const JOGO_D_ASSETS: ProjectAsset[] = ${JSON.stringify(assets)}\n`
  const programa = `// Gerado por scripts/gen-jogo-d.ts. Não edite.\nimport type { SZIRV2 } from '../ir'\n/** ${JOGO_D_DESCRIPTION} */\nexport const JOGO_D_IR = ${JSON.stringify(ir, null, 2)} as SZIRV2\n`
  if (process.argv.includes('--check')) {
    const atuais = [
      (await import(destinoMateriais)).JOGO_D_ASSETS,
      stripIds((await import(destinoIR)).JOGO_D_IR),
    ]
    if (JSON.stringify(atuais[0]) !== JSON.stringify(assets))
      throw new Error('Os materiais do jogo D mudaram; rode bun run gen:jogo-d')
    if (JSON.stringify(atuais[1]) !== JSON.stringify(ir))
      throw new Error('O programa do jogo D mudou; rode bun run gen:jogo-d')
    console.log('jogo D: materiais e programa conferidos')
  } else {
    writeGeneratedSource(destinoMateriais, materiais)
    writeGeneratedSource(destinoIR, programa)
    // O programa sai formatado (o arquivo dos materiais, grande, fica fora do biome).
    const formato = Bun.spawnSync([process.execPath, 'x', 'biome', 'format', '--write', destinoIR])
    if (formato.exitCode !== 0) throw new Error(formato.stderr.toString())
    if (!readFileSync(destinoIR, 'utf8').includes('JOGO_D_IR')) throw new Error('Falhou ao gerar')
    const chars = assets.reduce(
      (n, a) => n + a.dataUrl.length + (a.scene ? JSON.stringify(a.scene).length : 0),
      0,
    )
    console.log(`jogo D: ${assets.length} materiais, ${chars} caracteres; programa estruturado`)
  }
}
