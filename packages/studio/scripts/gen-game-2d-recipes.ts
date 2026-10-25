import { fileURLToPath } from 'node:url'
import { compileStatements } from '../src/generators'
import { behaviorStatements, normalizeSZIR, SZIRV2Schema } from '../src/ir'
import { GAME_TWO_D_RECIPE_SOURCES } from '../src/official-extensions/game-2d/recipeSources'
import { GAME_TWO_D_API_KEYS } from '../src/official-extensions/game-2d/runtimeContract'
import { parseJS } from '../src/parsers/js'
import { writeGeneratedSource } from './writeGeneratedSource'

const examples = GAME_TWO_D_RECIPE_SOURCES.map(
  ({ source, interactions: _interactions, ...metadata }) => {
    const ir = SZIRV2Schema.parse(
      normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(source),
        extensions: [{ extensionId: 'game-2d' }],
      }),
    )
    const raw = JSON.stringify(ir)
    if (raw.includes('"rawJS"') || raw.includes('"memberCall"')) {
      throw new Error(`Receita sem bloco: ${metadata.name}`)
    }
    const methods = new Set<string>(GAME_TWO_D_API_KEYS)
    const calls = [...compileStatements(behaviorStatements(ir), 0).matchAll(/SZGame2D\.(\w+)\(/g)]
    const missing = calls.map((match) => match[1]).filter((method) => !methods.has(method ?? ''))
    if (missing.length) {
      throw new Error(`Receita com método inexistente: ${metadata.name}: ${missing.join(', ')}`)
    }
    return { ...metadata, experience: 'demo', difficulty: 'intermediate', genre: 'receita', ir }
  },
)

if (process.argv.includes('--check')) {
  const { gameTwoDRecipes } = await import('../src/official-extensions/game-2d/recipes.generated')
  if (JSON.stringify(gameTwoDRecipes) !== JSON.stringify(examples))
    throw new Error('Receitas Jogo 2D desatualizadas: rode gen:game-2d-recipes')
  console.log(`${examples.length} receitas Jogo 2D conferidas`)
} else {
  const target = fileURLToPath(
    new URL('../src/official-extensions/game-2d/recipes.generated.ts', import.meta.url),
  )
  writeGeneratedSource(
    target,
    `// GERADO por scripts/gen-game-2d-recipes.ts.\nimport type { ExtensionExample } from '#extensions'\n\nexport const gameTwoDRecipes: readonly ExtensionExample[] = ${JSON.stringify(examples, null, 2)}\n`,
  )
  const formatted = Bun.spawnSync({
    cmd: [process.execPath, 'x', 'biome', 'format', '--write', target],
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (formatted.exitCode !== 0) throw new Error('Não foi possível formatar as receitas geradas')
  console.log(`${examples.length} receitas Jogo 2D geradas`)
}
