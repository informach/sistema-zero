import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isInteractiveBlock,
  isLearningManifest,
  type LearningManifest,
} from '../../../packages/core/src/learning'
import { SCENE_MODELS, type SceneId } from '../../../packages/core/src/learning/scene'
import { cenasDaMontagem, eCena, marcarCenasAnteriores } from './cenas-editorial'
import { earlyRecipes } from './corre-dino-aulas-02-05'
import { middleRecipes } from './corre-dino-aulas-06-09'
import { lateRecipes } from './corre-dino-aulas-10-13'
import { buildEditorial, editorialMarkdown, readOriginal } from './corre-dino-editorial'
import { gravarGeracao } from './gravar-geracao'
import { annotateStudioRecording, lessonStudioEdition } from './jogo-2d-edicao-atual'
import { lessonOneCuts, lessonOneOldScenes, reviseLessonOne } from './revisao-editorial-aula-01'
import { lessonOneMarkdown } from './revisao-editorial-aula-01-texto'

// Authored candidates only. Import/publish are deliberately separate operations.
const root = resolve(import.meta.dir, '..')
export const correDinoRecipes = { ...earlyRecipes, ...middleRecipes, ...lateRecipes }

/**
 * As 13 aulas do Corre Dino como a receita as produz, sem gravar nada: o gerador grava e o validador
 * compara com os arquivos publicados.
 */
export function construirCorreDino(sourceDirectory: string) {
  const lessons = []
  const catalog: {
    path: string
    title: string
    priority: 'pilot' | 'expansion'
    sections: number
  }[] = []
  // As missões originais do curso, na ordem das aulas: as demonstrações opcionais são as delas.
  const missoes: SceneId[] = []
  for (let lesson = 1; lesson <= 13; lesson++) {
    const slug = `aula-${String(lesson).padStart(2, '0')}`
    const source: unknown = JSON.parse(
      readFileSync(resolve(root, 'corre-dino', slug, 'manifesto.json'), 'utf8'),
    )
    if (!isLearningManifest(source) || source.version !== 4)
      throw new Error(`Invalid source ${slug}`)
    for (const block of source.blocks)
      if (eCena(block) && !missoes.includes(block.content.activity.scene))
        missoes.push(block.content.activity.scene)
    let manifest: LearningManifest = structuredClone(source)
    if (lesson === 1) manifest = reviseLessonOne(manifest)
    const original = readOriginal(sourceDirectory, lesson)
    const editorial =
      lesson > 1 ? buildEditorial(manifest, correDinoRecipes[lesson]!, original) : undefined
    if (editorial) manifest = editorial.manifest
    const firstMontage =
      lesson === 1
        ? (() => {
            const cortes = structuredClone(lessonOneCuts)
            annotateStudioRecording(manifest, cortes.clips)
            return {
              sourceFile: cortes.sourceFile,
              status: cortes.status,
              clips: marcarCenasAnteriores(slug, cortes.clips, lessonOneOldScenes),
              sourceHash: original.hash,
              cenas: cenasDaMontagem(manifest),
              studio: lessonStudioEdition(manifest),
            }
          })()
        : undefined
    if (!isLearningManifest(manifest)) throw new Error(`Invalid candidate ${slug}`)
    const montage = editorial?.montage ?? firstMontage!
    lessons.push({
      slug,
      manifest,
      montage,
      roteiro: editorial
        ? editorialMarkdown(editorial)
        : lessonOneMarkdown(manifest, original, firstMontage!),
      cenasAnteriores: editorial ? editorial.recipe.cenasAnteriores : lessonOneOldScenes,
    })
    catalog.push({
      path: slug,
      title: manifest.title,
      priority: [1, 3, 4, 10].includes(lesson) ? 'pilot' : 'expansion',
      sections: manifest.sections.length,
    })
  }
  // ⚠️ A demonstração NÃO carrega mais o roteiro embutido: sem `script`, o player e o servidor
  // usam o roteiro que vem com a CENA (`sceneModel(scene).script`). Gravar uma cópia aqui
  // congelaria o roteiro no arquivo e ele pararia de acompanhar as correções do catálogo.
  const demonstrations = missoes.map((scene) => {
    const modelo = SCENE_MODELS[scene]
    const content = {
      kind: 'interactive',
      title: `Observe: ${modelo.title}`,
      instructions: 'Observe cada etapa. Você pode pausar e rever o exemplo.',
      hints: [],
      required: false,
      activity: { type: 'demonstration', scene },
    }
    if (!isInteractiveBlock(content)) throw new Error(`Invalid demonstration ${scene}`)
    return { key: `demonstracao-${scene}`, content }
  })
  return { lessons, catalog, demonstrations }
}

if (import.meta.main) {
  const sourceDirectory = process.argv[2] ?? process.env.CORRE_DINO_ROTEIROS
  if (!sourceDirectory)
    throw new Error(
      'Informe a pasta dos 13 roteiros originais como primeiro argumento ou CORRE_DINO_ROTEIROS.',
    )
  const destination = resolve(root, 'corre-dino-v6')
  const { lessons, catalog, demonstrations } = construirCorreDino(sourceDirectory)
  gravarGeracao([
    ...lessons.flatMap(({ slug, manifest, montage, roteiro }) => [
      [resolve(destination, slug, 'roteiro.md'), roteiro] as const,
      [resolve(destination, slug, 'montagem.json'), montage] as const,
      [resolve(destination, slug, 'manifesto.json'), manifest] as const,
    ]),
    [resolve(destination, 'demonstracoes-opcionais.json'), demonstrations],
    [resolve(destination, 'catalogo.json'), catalog],
  ])
  console.log(`Validated ${catalog.length} v6 candidates. No lessons were published.`)
}
