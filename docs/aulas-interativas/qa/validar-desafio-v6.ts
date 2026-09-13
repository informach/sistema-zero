import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { evaluateLearning, isLearningManifest } from '../../../packages/core/src/learning'
import {
  evaluateStudioSectionProject,
  studioSectionCompletionIssues,
} from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { earlyRecipes } from './desafio-aulas-00-02'
import { lateRecipes } from './desafio-aulas-03-05'
import { studioSettings } from './desafio-configuracao'
import { buildLesson, originalOf, scriptMarkdown } from './desafio-editorial'
import { courseProjects } from './desafio-projetos-qa'

const source = process.argv[2] ?? process.env.DESAFIO_ROTEIROS
assert(source, 'Informe a pasta de roteiros originais.')
const recipes = { ...earlyRecipes, ...lateRecipes },
  projects = courseProjects()
const metrics = [
  'sections',
  'clips',
  'demonstrations',
  'applications',
  'experiments',
  'questions',
] as const
const results: Array<
  Record<(typeof metrics)[number], number> & { lesson: string; sourceHash: string }
> = []
for (let day = 0; day <= 5; day++) {
  const slug = day ? `dia-${day}` : 'introducao',
    dir = resolve(import.meta.dir, '../desafio-primeiro-jogo-v6', slug)
  const manifest: unknown = JSON.parse(readFileSync(resolve(dir, 'manifesto.json'), 'utf8'))
  assert(isLearningManifest(manifest), `${slug}: schema`)
  const original = originalOf(source, day),
    result = buildLesson(day, recipes[day]!, original)
  if (day)
    assert.deepEqual(
      JSON.parse(readFileSync(resolve(dir, 'configuracao-estudio.json'), 'utf8')),
      studioSettings(day),
    )
  assert.deepEqual(manifest, result.manifest, `${slug}: manifesto reproduzível`)
  assert.deepEqual(JSON.parse(readFileSync(resolve(dir, 'montagem.json'), 'utf8')), result.montage)
  assert.equal(readFileSync(resolve(dir, 'roteiro.md'), 'utf8'), scriptMarkdown(result))
  assert.equal(result.montage.sourceReview.length, original.parts.length)
  for (const clip of result.montage.clips) {
    assert(
      original.parts
        .find((p) => p.heading === clip.sourceSection)
        ?.narration.includes(clip.narration),
    )
    assert.equal(clip.inSeconds, null)
    assert.equal(clip.outSeconds, null)
  }
  const sections = manifest.sections.map((s) => ({
    ...s,
    id: s.key,
    blockIds: s.blockKeys,
    workspaceBlockId: s.workspaceKey,
  }))
  const blocks = manifest.blocks.map((b) => ({
    id: b.key,
    content:
      'content' in b
        ? b.content
        : 'plannedVideo' in b
          ? { kind: 'video' }
          : {
              ...studioSettings(day),
              initialProject: { installedExtensions: [{ id: 'game-2d' }] },
            },
  }))
  assert.deepEqual(
    studioSectionCompletionIssues(sections, blocks),
    [],
    `${slug}: critérios válidos para o catálogo`,
  )
  for (const s of sections) {
    if (s.intent === 'application')
      assert(s.workspaceBlockId && s.completion?.projectChecks?.length)
    if (s.intent === 'demonstration')
      assert(
        !s.workspaceBlockId &&
          s.blockIds.length === 1 &&
          blocks.find((b) => b.id === s.blockIds[0])?.content.kind === 'video',
      )
    if (s.completion?.projectChecks)
      assert.deepEqual(
        evaluateStudioSectionProject(s.completion.projectChecks, projects[day]).filter(
          (c) => !c.passed,
        ),
        [],
        `${slug}/${s.key}: montagem final independente satisfaz a etapa`,
      )
  }
  let experiments = 0
  for (const block of manifest.blocks)
    if ('content' in block && block.content.kind === 'interactive') {
      experiments++
      const content = block.content
      assert(content.activity.type === 'html' && content.checkpoint)
      assert(!evaluateLearning(content, {}).passed)
      assert(
        !evaluateLearning(content, {
          participated: true,
          checkpoint: content.checkpoint.choices.find(
            (c) => c.id !== content.checkpoint!.correctChoiceId,
          )!.id,
        }).passed,
      )
      assert(
        evaluateLearning(content, {
          participated: true,
          checkpoint: content.checkpoint.correctChoiceId,
        }).passed,
      )
    }
  assert.equal(manifest.blocks.filter((b) => 'existing' in b).length, day ? 1 : 0)
  results.push({
    lesson: slug,
    sourceHash: original.hash,
    sections: sections.length,
    clips: result.montage.clips.length,
    demonstrations: sections.filter((s) => s.intent === 'demonstration').length,
    applications: sections.filter((s) => s.intent === 'application').length,
    experiments,
    questions: 2,
  })
}
const totals = Object.fromEntries(
  metrics.map((key) => [key, results.reduce((sum, r) => sum + r[key], 0)]),
)
writeFileSync(
  resolve(import.meta.dir, 'desafio-v6-verificacao.json'),
  `${JSON.stringify({ status: 'passed', scope: 'Fontes, reprodução editorial, contratos do catálogo, critérios dos projetos e correção das respostas. Não inclui publicação nem mídia editada.', totals, results }, null, 2)}\n`,
)
console.log(JSON.stringify({ totals, results }, null, 2))
