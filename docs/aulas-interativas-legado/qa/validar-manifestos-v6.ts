/**
 * Portão de CI dos 27 manifestos v6 que estão no repositório.
 *
 * Valida o conteúdo gravado, sem depender das antigas receitas de geração: a aula publicada é
 * construída a partir deste manifesto, e não da receita que um dia o criou.
 * Uso: bun docs/aulas-interativas/qa/validar-manifestos-v6.ts
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isInteractiveBlock,
  isLearningManifest,
  isPublicInteractiveBlock,
  publicInteractiveBlock,
} from '../../../packages/core/src/learning'
import { sceneUnknownSetupGoals } from '../../../packages/core/src/learning/scene'
import { parsePublishedLessonBlock } from '../../../packages/members/src/interfaces/http/lesson-draft.dtos'
import { studioSectionCompletionIssues } from '../../../packages/studio/src/blockly/projectCheckAuthoring'

const root = resolve(import.meta.dir, '..')
const courses = ['corre-dino-v6', 'desafio-primeiro-jogo-v6', 'o-jogo-do-meu-jeito-v6']
const counts = { aulas: 0, secoes: 0, blocos: 0, interativos: 0, experiencias: 0, quizzes: 0 }
const problems: string[] = []

for (const course of courses) {
  const directory = resolve(root, course)
  const catalogue = JSON.parse(readFileSync(resolve(directory, 'catalogo.json'), 'utf8')) as Array<{
    path: string
    sections: number
  }>
  const folders = readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(resolve(directory, entry.name, 'manifesto.json')),
    )
    .map((entry) => entry.name)
    .sort()
  assert.deepEqual(
    catalogue.map((entry) => entry.path).sort(),
    folders,
    `${course}: catálogo e pastas divergem`,
  )

  for (const entry of catalogue) {
    const lesson = `${course}/${entry.path}`
    const manifest: unknown = JSON.parse(
      readFileSync(resolve(directory, entry.path, 'manifesto.json'), 'utf8'),
    )
    assert(isLearningManifest(manifest), `${lesson}: formato do manifesto recusado pelo core`)
    assert.equal(manifest.sections.length, entry.sections, `${lesson}: número de seções`)

    for (const block of manifest.blocks) {
      if (!('content' in block)) continue
      counts.blocos++
      parsePublishedLessonBlock(block.content)
      if (block.content.kind === 'quiz') counts.quizzes++
      if (block.content.kind !== 'interactive') continue
      counts.interativos++
      assert(isInteractiveBlock(block.content), `${lesson}/${block.key}: bloco interativo inválido`)
      assert(
        isPublicInteractiveBlock(publicInteractiveBlock(block.content)),
        `${lesson}/${block.key}: projeção pública inválida`,
      )
      if (block.content.activity.type === 'experimentation') {
        counts.experiencias++
        const activity = block.content.activity
        const unknown = sceneUnknownSetupGoals(activity.scene, activity.setup?.goals)
        if (unknown.length)
          problems.push(`${lesson}/${block.key}: metas inexistentes (${unknown.join(', ')})`)
      }
    }

    for (const section of manifest.sections) {
      for (const id of section.completion?.blockIds ?? [])
        if (!section.blockKeys.includes(id))
          problems.push(`${lesson}/${section.key}: conclusão cita bloco fora da seção (${id})`)
    }
    const sections = manifest.sections.map((section) => ({
      ...section,
      id: section.key,
      blockIds: section.blockKeys,
      workspaceBlockId: section.workspaceKey,
    }))
    const blocks = manifest.blocks.map((block) => ({
      id: block.key,
      content:
        'content' in block
          ? block.content
          : 'existing' in block
            ? {
                kind: block.existing.kind,
                initialProject: { installedExtensions: [{ id: 'game-2d' }] },
              }
            : { kind: 'video' },
    }))
    problems.push(
      ...studioSectionCompletionIssues(sections, blocks).map(
        (problem) => `${lesson}: ${JSON.stringify(problem)}`,
      ),
    )
    counts.aulas++
    counts.secoes += manifest.sections.length
  }
}

assert.equal(counts.aulas, 27, 'O catálogo v6 contém 27 aulas')
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(JSON.stringify(counts, null, 2))
