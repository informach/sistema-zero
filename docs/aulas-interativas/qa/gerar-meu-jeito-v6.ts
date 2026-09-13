import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { earlyRecipes } from './meu-jeito-aulas-01-04'
import { lateRecipes } from './meu-jeito-aulas-05-08'
import { buildLesson, originalOf, scriptMarkdown } from './meu-jeito-editorial'
import { experimentDefinitions, experimentHtml } from './meu-jeito-interacoes'

const sourceDirectory = process.argv[2] ?? process.env.MEU_JEITO_ROTEIROS
if (!sourceDirectory)
  throw new Error(
    'Informe a pasta dos oito roteiros originais como primeiro argumento ou MEU_JEITO_ROTEIROS.',
  )
const root = resolve(import.meta.dir, '../o-jogo-do-meu-jeito-v6')
const experiments = resolve(root, 'interacoes')
mkdirSync(experiments, { recursive: true })
for (const key of Object.keys(experimentDefinitions) as Array<keyof typeof experimentDefinitions>)
  writeFileSync(resolve(experiments, `${key}.html`), `${experimentHtml(key)}\n`)
const recipes = { ...earlyRecipes, ...lateRecipes }
const catalog = []
for (let lesson = 1; lesson <= 8; lesson++) {
  const result = buildLesson(lesson, recipes[lesson]!, originalOf(sourceDirectory, lesson))
  const path = result.manifest.lessonSlug
  mkdirSync(resolve(root, path), { recursive: true })
  writeFileSync(
    resolve(root, path, 'manifesto.json'),
    `${JSON.stringify(result.manifest, null, 2)}\n`,
  )
  writeFileSync(
    resolve(root, path, 'montagem.json'),
    `${JSON.stringify(result.montage, null, 2)}\n`,
  )
  writeFileSync(resolve(root, path, 'roteiro.md'), scriptMarkdown(result))
  catalog.push({
    path,
    title: result.manifest.title,
    source: result.montage.sourceFile,
    sourceHash: result.montage.sourceHash,
    sections: result.manifest.sections.length,
    clips: result.montage.clips.length,
    demonstrations: result.manifest.sections.filter((s) => s.intent === 'demonstration').length,
    experiments: result.manifest.sections.filter((s) => s.intent === 'exploration').length,
    gallery: {
      kind: recipes[lesson]!.tool === 'pinta' ? 'pinta' : 'studio',
      minItems: lesson === 5 ? 2 : 1,
      maxItems: lesson === 5 ? 2 : 1,
    },
  })
}
writeFileSync(resolve(root, 'catalogo.json'), `${JSON.stringify(catalog, null, 2)}\n`)
console.log(
  JSON.stringify({
    lessons: catalog.length,
    sections: catalog.reduce((n, c) => n + c.sections, 0),
    clips: catalog.reduce((n, c) => n + c.clips, 0),
    demonstrations: catalog.reduce((n, c) => n + c.demonstrations, 0),
    experiments: catalog.reduce((n, c) => n + c.experiments, 0),
  }),
)
