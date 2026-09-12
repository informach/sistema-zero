/** Validação local dos arquivos de autoria. Não acessa banco ou publica conteúdo. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import { studioSectionCompletionIssues } from '../../../packages/studio/src/blockly/projectCheckAuthoring'

const root = resolve(import.meta.dir, '..')
const catalog: Array<{ path: string; sections: number; clips: number }> = JSON.parse(
  readFileSync(resolve(root, 'catalogo.json'), 'utf8'),
)
const counts = { lessons: 0, sections: 0, clips: 0, projectStages: 0, projectObjectives: 0 }
for (const entry of catalog) {
  const manifest: unknown = JSON.parse(
    readFileSync(resolve(root, entry.path, 'manifesto.json'), 'utf8'),
  )
  assert(isLearningManifest(manifest), `Formato inválido: ${entry.path}`)
  const roteiro = readFileSync(resolve(root, entry.path, 'roteiro.md'), 'utf8').replaceAll(
    '\r\n',
    '\n',
  )
  assert.equal(manifest.sections.length, entry.sections, entry.path)
  if (manifest.version === 4) {
    assert(entry.path.startsWith('corre-dino/'), 'O piloto v4 começa pelo Dino')
    assert.equal(manifest.sections.at(-2)?.intent, 'delivery', entry.path)
    assert.equal(manifest.sections.at(-1)?.intent, 'closing', entry.path)
    assert(
      !manifest.blocks.some((b) => 'content' in b && b.content.kind === 'rich_text'),
      entry.path,
    )
    const discoveries = manifest.blocks.filter(
      (b) => 'content' in b && b.content.kind === 'interactive',
    )
    assert(discoveries.length > 0, entry.path)
    for (const block of discoveries)
      if ('content' in block && block.content.kind === 'interactive') {
        assert(['simulation', 'exploration'].includes(block.content.activity.type), entry.path)
        assert(!block.content.checkpoint, 'Não acrescentar pergunta obrigatória à exploração')
      }
    for (const section of manifest.sections.filter((s) => s.intent === 'application'))
      assert(section.workspaceKey && section.completion?.projectChecks?.length, entry.path)
    for (const section of manifest.sections.filter((s) => s.intent === 'exploration'))
      assert(
        section.completion?.blockIds.some((id) => discoveries.some((b) => b.key === id)),
        entry.path,
      )
    if (manifest.lessonSlug === 'aula-03') {
      assert.deepEqual(
        manifest.sections.map((s) => s.intent),
        ['exploration', 'application', 'exploration', 'application', 'delivery', 'closing'],
      )
      assert.equal(manifest.sections[1]?.workspaceKey, manifest.sections[3]?.workspaceKey)
      assert.equal(
        manifest.blocks.filter((b) => 'existing' in b && b.existing.kind === 'studio').length,
        1,
      )
    }
    const quizzes = manifest.blocks.filter((b) => 'content' in b && b.content.kind === 'quiz')
    assert.equal(quizzes.length, 1, entry.path)
    for (const block of quizzes)
      if ('content' in block && block.content.kind === 'quiz')
        assert(
          block.content.questions.length >= 2 && block.content.questions.length <= 3,
          entry.path,
        )
  }
  assert(roteiro.includes(`organizada em ${entry.sections} seções`), entry.path)
  const planned = manifest.blocks.filter((b) => 'plannedVideo' in b)
  assert.equal(planned.length, entry.clips, entry.path)
  for (const video of planned) {
    assert(roteiro.includes(`**Vídeo planejado:** \`${video.key}\``), video.key)
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
        : 'existing' in b
          ? {
              kind: b.existing.kind,
              // Contrato de autoria com Jogo 2D disponível. As permissões e o
              // projeto real da aula precisam ser conferidos ao importar em staging.
              initialProject: { installedExtensions: [{ id: 'game-2d' }] },
            }
          : { kind: 'video' },
  }))
  assert.deepEqual(studioSectionCompletionIssues(sections, blocks), [], entry.path)
  for (const [index, section] of manifest.sections.entries()) {
    assert(roteiro.includes(`## ${index + 1}. ${section.title}`), section.key)
    const checks = section.completion?.projectChecks ?? []
    counts.projectStages += Number(checks.length > 0)
    counts.projectObjectives += checks.length
    for (const check of checks) assert(roteiro.includes(check.label), check.label)
  }
  for (const block of manifest.blocks) {
    if (!('content' in block)) continue
    const c = block.content
    if (c.kind === 'interactive') {
      assert(roteiro.includes(c.instructions), `${entry.path}: ${block.key}`)
      if (c.checkpoint) {
        assert(roteiro.includes(c.checkpoint.prompt), block.key)
        assert(roteiro.includes(c.checkpoint.explanation), block.key)
      }
    }
    if (c.kind === 'rich_text') assert(roteiro.includes(c.markdown), block.key)
  }
  counts.lessons++
  counts.sections += manifest.sections.length
  counts.clips += planned.length
}
console.log(JSON.stringify(counts, null, 2))
