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
