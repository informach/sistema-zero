import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateLearning,
  isLearningAnswers,
  isLearningManifest,
  sectionCompletionIssues,
} from '../../../packages/core/src/learning'
import { packAnimationsGeometry } from '../../../packages/pinta/src/export/spritesheet'
import { earlyRecipes } from './meu-jeito-aulas-01-04'
import { lateRecipes } from './meu-jeito-aulas-05-08'
import { buildLesson, originalOf, plain, scriptMarkdown } from './meu-jeito-editorial'
import { experimentDefinitions, experimentHtml } from './meu-jeito-interacoes'

const directory = process.argv[2] ?? process.env.MEU_JEITO_ROTEIROS
assert(directory, 'Informe a pasta dos oito roteiros originais')
const root = resolve(import.meta.dir, '../o-jogo-do-meu-jeito-v6')
const recipes = { ...earlyRecipes, ...lateRecipes }
const results = []
for (let lesson = 1; lesson <= 8; lesson++) {
  const slug = `aula-${String(lesson).padStart(2, '0')}`
  const original = originalOf(directory, lesson)
  const manifest: unknown = JSON.parse(readFileSync(resolve(root, slug, 'manifesto.json'), 'utf8'))
  assert(isLearningManifest(manifest), `${slug}: contrato do manifesto`)
  const recipe = recipes[lesson]!
  const regenerated = buildLesson(lesson, recipe, original)
  assert.deepEqual(
    manifest,
    regenerated.manifest,
    `${slug}: arquivo desatualizado em relação à receita`,
  )
  const montage = JSON.parse(readFileSync(resolve(root, slug, 'montagem.json'), 'utf8'))
  assert.deepEqual(montage, regenerated.montage)
  const script = readFileSync(resolve(root, slug, 'roteiro.md'), 'utf8')
  assert.equal(script, scriptMarkdown(regenerated))
  assert.equal(montage.sourceHash, original.hash)
  for (const clip of regenerated.montage.clips) {
    const part = original.parts.find((p) => p.heading === clip.sourceSection)
    assert(part?.narration.includes(plain(clip.narration)), `${slug}/${clip.key}: trecho original`)
    assert(clip.narration.startsWith(clip.entry) && clip.narration.endsWith(clip.exit))
    assert.equal(clip.inSeconds, null)
    assert.equal(clip.outSeconds, null)
  }
  // Every original instructional Part has an explicit disposition: recut or replaced by an experiment.
  for (const part of original.parts.filter((p) => p.heading.startsWith('Parte '))) {
    const number = Number(/^Parte (\d+)\./.exec(part.heading)?.[1])
    assert(
      recipe.steps.some((s) => s.part === number),
      `${slug}: Parte ${number} sem análise`,
    )
  }
  const refs = manifest.blocks.filter((b) => 'existing' in b)
  assert.equal(refs.length, 1, `${slug}: uma entrega, sem novo editor`)
  assert(
    'existing' in refs[0]! &&
      refs[0].existing.kind === (recipe.tool === 'pinta' ? 'pinta' : 'studio'),
  )
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
              kind: b.existing.kind,
              gallery: { minItems: lesson === 5 ? 2 : 1, maxItems: lesson === 5 ? 2 : 1 },
            },
  }))
  assert.deepEqual(
    sectionCompletionIssues(sections, blocks),
    [],
    `${slug}: autoria e progressão com galeria configurada`,
  )
  for (const section of sections) {
    assert.equal(section.workspaceBlockId, null)
    assert(script.includes(section.title))
    if (section.intent === 'demonstration' || section.intent === 'presentation') {
      assert.equal(section.blockIds.length, 1)
      assert.equal(section.externalTool, null)
      assert(manifest.blocks.some((b) => b.key === section.blockIds[0] && 'plannedVideo' in b))
    }
    if (section.intent === 'exploration') assert.equal(section.externalTool, null)
  }
  let interactions = 0
  for (const b of manifest.blocks) {
    if (!('content' in b) || b.content.kind !== 'interactive') continue
    const block = b.content
    assert(block.checkpoint)
    assert.equal(evaluateLearning(block, {}).passed, false)
    const wrong = block.checkpoint.choices.find(
      (c) => c.id !== block.checkpoint!.correctChoiceId,
    )!.id
    assert.equal(evaluateLearning(block, { participated: true, checkpoint: wrong }).passed, false)
    assert.equal(
      evaluateLearning(block, { participated: true, checkpoint: block.checkpoint.correctChoiceId })
        .passed,
      true,
    )
    if (block.activity.type === 'html') {
      interactions++
      assert.equal(
        evaluateLearning(block, { checkpoint: block.checkpoint.correctChoiceId }).passed,
        false,
        'Resposta sem participação não conclui o experimento',
      )
    }
  }
  const quiz = manifest.blocks.find((b) => 'content' in b && b.content.kind === 'quiz')
  assert(quiz && 'content' in quiz && quiz.content.kind === 'quiz')
  assert.equal(quiz.content.questions.length, 2)
  if (lesson === 8) assert.equal(recipe.steps[0]?.key, 'publicar')
  results.push({
    lesson: slug,
    sourceHash: original.hash,
    sections: sections.length,
    clips: montage.clips.length,
    demonstrations: sections.filter((s) => s.intent === 'demonstration').length,
    experiments: interactions,
    gallery: recipe.tool,
    quizQuestions: quiz.content.questions.length,
  })
}
for (const kind of Object.keys(experimentDefinitions) as Array<
  keyof typeof experimentDefinitions
>) {
  assert.equal(
    readFileSync(resolve(root, 'interacoes', `${kind}.html`), 'utf8'),
    `${experimentHtml(kind)}\n`,
  )
  assert(isLearningAnswers({ selected: 1, tested: ['0', '1'], participated: true }))
}
// Check the course's sizes/indices against the real Pinta export geometry, including the larger vector sheet.
for (const [size, name] of [
  [32, 'voando'],
  [64, 'girando'],
] as const) {
  const geometry = packAnimationsGeometry(size, size, [{ name, fps: 8, loop: true, frameCount: 2 }])
  assert.equal(geometry.columns * geometry.frameWidth, size * 2)
  assert.equal(geometry.rows * geometry.frameHeight, size)
  assert.deepEqual(geometry.animations[0], {
    name,
    row: 0,
    frames: 2,
    from: 0,
    to: 1,
    fps: 8,
    loop: true,
  })
}
const report = {
  status: 'passed',
  scope:
    'Oito fontes e hashes, todas as Partes, 55 recortes por âncoras, geração reproduzível, manifestos, critérios de progressão com galeria previamente configurada, respostas corretas/incorretas e geometria real de exportação. Não comprova importação em conta real, mídia editada, qualidade artística, jogabilidade das criações dos alunos ou publicação.',
  totals: {
    lessons: results.length,
    sections: results.reduce((n, r) => n + r.sections, 0),
    clips: results.reduce((n, r) => n + r.clips, 0),
    demonstrations: results.reduce((n, r) => n + r.demonstrations, 0),
    experiments: results.reduce((n, r) => n + r.experiments, 0),
    quizQuestions: results.reduce((n, r) => n + r.quizQuestions, 0),
  },
  results,
}
writeFileSync(
  resolve(import.meta.dir, 'meu-jeito-v6-verificacao.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
console.log(JSON.stringify(report.totals))
