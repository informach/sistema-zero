import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EXPLORATION_DEFINITIONS,
  EXPLORATION_MISSIONS,
  experienceScript,
  isInteractiveBlock,
  isLearningManifest,
  type LearningManifest,
} from '../../../packages/core/src/learning'
import { earlyRecipes } from './corre-dino-aulas-02-05'
import { middleRecipes } from './corre-dino-aulas-06-09'
import { lateRecipes } from './corre-dino-aulas-10-13'
import { buildEditorial, editorialMarkdown, readOriginal } from './corre-dino-editorial'
import { lessonOneCuts, reviseLessonOne } from './revisao-editorial-aula-01'
import { lessonOneMarkdown } from './revisao-editorial-aula-01-texto'

// Authored candidates only. Import/publish are deliberately separate operations.
const root = resolve(import.meta.dir, '..')
const destination = resolve(root, 'corre-dino-v6')
const sourceDirectory = process.argv[2] ?? process.env.CORRE_DINO_ROTEIROS
if (!sourceDirectory)
  throw new Error(
    'Informe a pasta dos 13 roteiros originais como primeiro argumento ou CORRE_DINO_ROTEIROS.',
  )
const recipes = { ...earlyRecipes, ...middleRecipes, ...lateRecipes }
mkdirSync(destination, { recursive: true })
const catalog: {
  path: string
  title: string
  priority: 'pilot' | 'expansion'
  sections: number
}[] = []
for (let lesson = 1; lesson <= 13; lesson++) {
  const slug = `aula-${String(lesson).padStart(2, '0')}`
  const source: unknown = JSON.parse(
    readFileSync(resolve(root, 'corre-dino', slug, 'manifesto.json'), 'utf8'),
  )
  if (!isLearningManifest(source) || source.version !== 4) throw new Error(`Invalid source ${slug}`)
  let manifest: LearningManifest = structuredClone(source)
  for (const block of manifest.blocks) {
    if (
      !('content' in block) ||
      block.content.kind !== 'interactive' ||
      block.content.activity.type !== 'exploration'
    )
      continue
    const activity = block.content.activity
    block.content.activity = { ...activity, version: 3, mode: 'explore' }
    if (['gravity', 'impulse', 'jump-sound'].includes(activity.mission))
      block.content.instructions = block.content.instructions.replace(
        'Toque no Dino',
        'Toque no Dino ou no botão de pular',
      )
  }
  if (lesson === 1) manifest = reviseLessonOne(manifest)
  const original = readOriginal(sourceDirectory, lesson)
  const editorial = lesson > 1 ? buildEditorial(manifest, recipes[lesson]!, original) : undefined
  if (editorial) manifest = editorial.manifest
  if (!isLearningManifest(manifest)) throw new Error(`Invalid candidate ${slug}`)
  mkdirSync(resolve(destination, slug), { recursive: true })
  writeFileSync(
    resolve(destination, slug, 'roteiro.md'),
    editorial ? editorialMarkdown(editorial) : lessonOneMarkdown(manifest, original),
  )
  writeFileSync(
    resolve(destination, slug, 'montagem.json'),
    `${JSON.stringify(editorial?.montage ?? { ...lessonOneCuts, sourceHash: original.hash }, null, 2)}\n`,
  )
  writeFileSync(
    resolve(destination, slug, 'manifesto.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  catalog.push({
    path: slug,
    title: manifest.title,
    priority: [1, 3, 4, 10].includes(lesson) ? 'pilot' : 'expansion',
    sections: manifest.sections.length,
  })
}
const demonstrations = EXPLORATION_MISSIONS.map((mission) => {
  const definition = EXPLORATION_DEFINITIONS[mission]
  const activity = { type: 'exploration', version: 3, mission, mode: 'demonstrate' } as const
  const content = {
    kind: 'interactive',
    title: `Observe: ${definition.title}`,
    instructions: 'Observe cada etapa. Você pode pausar e rever o exemplo.',
    hints: [],
    required: false,
    activity: { ...activity, demonstration: experienceScript(activity) },
  }
  if (!isInteractiveBlock(content)) throw new Error(`Invalid demonstration ${mission}`)
  return { key: `demonstracao-${mission}`, content }
})
writeFileSync(
  resolve(destination, 'demonstracoes-opcionais.json'),
  `${JSON.stringify(demonstrations, null, 2)}\n`,
)
writeFileSync(resolve(destination, 'catalogo.json'), `${JSON.stringify(catalog, null, 2)}\n`)
console.log(`Validated ${catalog.length} v6 candidates. No lessons were published.`)
