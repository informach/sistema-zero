import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeSZIR, SZIRV2Schema } from '../src/ir'
import { assetsForRecipe } from '../src/official-extensions/game-2d-advanced/examples/recipes/assets'
import { ADVANCED_RECIPE_SOURCES } from '../src/official-extensions/game-2d-advanced/examples/recipes/sources'
import { parseJS } from '../src/parsers/js'
import { writeGeneratedSource } from './writeGeneratedSource'

const entries = ADVANCED_RECIPE_SOURCES.map(({ source, ...metadata }) => {
  const ir = JSON.parse(
    JSON.stringify(
      normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(
          `${source}\nSZGameKit.setStageDescription(${JSON.stringify(metadata.description)});`,
        ),
        extensions: [{ extensionId: 'game-2d-advanced' }],
      }),
      (key, value) => (key === '__id' ? undefined : value),
    ),
  )
  SZIRV2Schema.parse(ir)
  const forbidden = JSON.stringify(ir).match(/"type":"(?:rawJS|memberCall|canvas\w*|css\w*)"/)
  if (forbidden)
    throw new Error(
      `${metadata.name}: a fonte não virou somente blocos de extensão (${forbidden[0]})`,
    )
  return { ...metadata, experience: 'demo', ir }
})
const target = join(
  import.meta.dir,
  '../src/official-extensions/game-2d-advanced/examples/recipes/generated.ts',
)
const body = `// Gerado por scripts/gen-game-2d-advanced-recipes.ts; edite sources.ts.\nimport type { ExtensionExample } from '../../../../extensions/types'\nimport { assetsForRecipe } from './assets'\n\nconst recipes: Array<Omit<ExtensionExample, 'assets'> & { assets: string[] }> = ${JSON.stringify(entries, null, 2)}\n\nexport const advancedRecipeExamples: ExtensionExample[] = recipes.map(({ assets, ...example }) => ({\n  ...example,\n  assets: assetsForRecipe(assets),\n}))\n`
if (process.argv.includes('--check')) {
  const current = readFileSync(target, 'utf8')
  // Formatting is separate; compare the generated data through the loaded module.
  const actual = await import(target)
  if (
    JSON.stringify(actual.advancedRecipeExamples) !==
    JSON.stringify(
      entries.map(({ assets, ...example }) => ({ ...example, assets: assetsForRecipe(assets) })),
    )
  )
    throw new Error('Receitas defasadas: rode gen-game-2d-advanced-recipes.ts')
  if (!current.includes('advancedRecipeExamples')) throw new Error('Receitas ausentes')
} else {
  writeGeneratedSource(target, body)
  const result = Bun.spawnSync([process.execPath, 'x', 'biome', 'format', '--write', target])
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
}
console.log(`${entries.length} receitas verificadas`)
