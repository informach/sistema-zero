import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import {
  evaluateStudioSectionProject,
  studioSectionCompletionIssues,
} from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { readOriginal } from './corre-dino-editorial'
import { courseProjects } from './corre-dino-projetos-qa'

const sourceDirectory = process.argv[2] ?? process.env.CORRE_DINO_ROTEIROS
assert(sourceDirectory, 'Informe a pasta dos roteiros originais')
const root = resolve(import.meta.dir, '../corre-dino-v6')
const snapshots = courseProjects()
const results = []
for (let lesson = 1; lesson <= 13; lesson++) {
  const slug = `aula-${String(lesson).padStart(2, '0')}`
  const candidate: unknown = JSON.parse(readFileSync(resolve(root, slug, 'manifesto.json'), 'utf8'))
  assert(isLearningManifest(candidate), `${slug}: formato`)
  const original = readOriginal(sourceDirectory, lesson)
  const montage = JSON.parse(readFileSync(resolve(root, slug, 'montagem.json'), 'utf8'))
  assert.equal(montage.sourceHash, original.hash, `${slug}: fonte alterada depois da revisão`)
  const normalize = (value: string) => value.replaceAll('**', '').replace(/\s+/g, ' ').trim()
  for (const clip of montage.clips) {
    const part = original.parts.find((part) => part.heading === clip.sourceSection)
    assert(part, `${slug}: parte ${clip.sourceSection}`)
    const spoken = normalize(part.narration)
    const entry = spoken.indexOf(normalize(clip.entry))
    assert(
      entry >= 0 && spoken.indexOf(normalize(clip.exit), entry) >= 0,
      `${slug}: âncoras de ${clip.key}`,
    )
    assert.equal(clip.inSeconds, null)
    assert.equal(clip.outSeconds, null)
  }
  const sections = candidate.sections.map((s) => ({
    ...s,
    id: s.key,
    blockIds: s.blockKeys,
    workspaceBlockId: s.workspaceKey,
  }))
  const blocks = candidate.blocks.map((b) => ({
    id: b.key,
    content:
      'content' in b
        ? b.content
        : 'plannedVideo' in b
          ? { kind: 'video' }
          : { kind: 'studio', initialProject: { installedExtensions: [{ id: 'game-2d' }] } },
  }))
  assert.deepEqual(
    studioSectionCompletionIssues(sections, blocks),
    [],
    `${slug}: autoria e critérios`,
  )
  assert.equal(
    candidate.blocks.filter((b) => 'existing' in b && b.existing.kind === 'studio').length,
    1,
  )
  assert.equal(
    new Set(sections.filter((s) => s.workspaceBlockId).map((s) => s.workspaceBlockId)).size,
    1,
  )
  const delivery = sections.find((s) => s.intent === 'delivery')!
  assert(delivery.completion?.projectChecks?.length)
  const checks = evaluateStudioSectionProject(delivery.completion.projectChecks, snapshots[lesson])
  assert.deepEqual(
    checks.filter((check) => !check.passed),
    [],
    `${slug}: projeto final independente`,
  )
  const script = readFileSync(resolve(root, slug, 'roteiro.md'), 'utf8')
  for (const section of sections) {
    assert(script.includes(section.title), `${slug}: seção sem roteiro`)
    if (section.intent === 'application')
      assert(section.completion?.projectChecks?.length && section.workspaceBlockId)
    if (section.intent === 'demonstration')
      assert(!section.workspaceBlockId, 'Demonstração não dá controle do projeto')
  }
  const interactions = candidate.blocks.filter(
    (b) => 'content' in b && b.content.kind === 'interactive',
  )
  for (const block of interactions)
    if ('content' in block && block.content.kind === 'interactive') {
      assert(
        block.content.activity.type === 'exploration' &&
          block.content.activity.version === 3 &&
          block.content.activity.mode === 'explore',
      )
    }
  results.push({
    lesson: slug,
    sourceHash: original.hash,
    sections: sections.length,
    demonstrations: sections.filter((s) => s.intent === 'demonstration').length,
    experiments: interactions.length,
    clips: montage.clips.length,
    finalChecks: checks.length,
  })
}
writeFileSync(
  resolve(import.meta.dir, 'revisao-13-aulas-verificacao.json'),
  `${JSON.stringify({ status: 'passed', scope: 'Local: 13 fontes, roteiros, manifestos, contratos do catálogo Jogo 2D e programas finais independentes. Não inclui mídia, banco ou publicação.', totals: { lessons: results.length, sections: results.reduce((sum, r) => sum + r.sections, 0), clips: results.reduce((sum, r) => sum + r.clips, 0) }, results }, null, 2)}\n`,
)
console.log(JSON.stringify(results, null, 2))
