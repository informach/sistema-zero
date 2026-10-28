/** Diagnostic against the real production evaluator. No browser, DB, generators or mocks. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  evaluateStudioSectionObjectives,
  studioSectionCompletionIssues,
} from '../../../../packages/studio/src/blockly/projectCheckAuthoring'

const root = resolve(import.meta.dir, '../../../..')
const read = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const started = performance.now()
const cadePath =
  'docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-aula-2.manifesto.json'
const dinoPath = 'docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-10.manifesto.json'
const nextDinoPath = 'docs/aulas-interativas/inventor/corre-dino/corre-dino-aula-11.manifesto.json'
const cade = read(cadePath)
const countSection = cade.sections.find((section: any) => section.key === 'contar-achados')
assert.ok(countSection)
const workspace = cade.blocks.find((block: any) => block.key === countSection.workspaceKey)
assert.ok(workspace)
const actual = evaluateStudioSectionObjectives(
  countSection.completion.projectChecks,
  workspace.content.initialProject,
  workspace.content.initialProject,
)
assert.equal(actual.passed, false, 'The initial project must not already pass the entire practice.')
assert.equal(actual.results.find((item) => item.checkId === 'revelar-ao-toque')?.passed, true)
assert.equal(actual.results.find((item) => item.checkId === 'somar-achado')?.passed, false)
const publicationIssues = studioSectionCompletionIssues(
  [
    {
      ...countSection,
      id: countSection.key,
      blockIds: countSection.blockKeys,
      workspaceBlockId: countSection.workspaceKey,
    },
  ],
  cade.blocks.map((block: any) => ({ id: block.key, content: block.content })),
)
const wrongPreservationIssue = publicationIssues.find(
  (issue) =>
    issue.message.includes('projeto inicial já cumpre') && issue.message.includes('Revele'),
)
assert.ok(wrongPreservationIssue, 'Expected the existing publication defect to be reproduced.')

const dino = read(dinoPath)
const presence = dino.sections
  .find((section: any) => section.key === 'ligar-raio-x')
  ?.completion.projectChecks.find((check: any) => check.id === 'raio-x')
const absence = dino.sections
  .find((section: any) => section.key === 'retirar-contorno')
  ?.completion.projectChecks.find((check: any) => check.id === 'sem-raio-x')
assert.ok(presence && absence)
const nextDino = read(nextDinoPath)
const without = nextDino.blocks.find((block: any) => block.key === 'projeto').content.initialProject
const withHitbox = structuredClone(without)
const pending = [withHitbox.blocksState]
let frame: any
while (pending.length) {
  const value: any = pending.pop()
  if (!value || typeof value !== 'object') continue
  if (value.type === 'sz_g2d_update_each_frame') {
    frame = value
    break
  }
  pending.push(...Object.values(value))
}
assert.ok(frame?.inputs?.BODY?.block)
let tail = frame.inputs.BODY.block
while (tail.next?.block) tail = tail.next.block
tail.next = { block: { type: 'sz_g2d_draw_hitbox', fields: { SPRITE: 'dino' } } }
// These are structural snapshots, not runnable newly generated games. The production rule
// under diagnosis reads blocksState, so no duplicate evaluator or toy matching logic is used.
const verdict = (project: unknown) => evaluateStudioSectionObjectives([presence, absence], project)
const before = verdict(without)
const after = verdict(withHitbox)
assert.deepEqual(
  before.results.map((result) => result.passed),
  [false, true],
)
assert.deepEqual(
  after.results.map((result) => result.passed),
  [true, false],
)
assert.equal(before.passed, false)
assert.equal(after.passed, false)

const sourcePaths = [
  cadePath,
  dinoPath,
  nextDinoPath,
  'packages/studio/src/blockly/projectCheckAuthoring.ts',
  'packages/core/src/learning/project-structure.ts',
  'packages/core/src/learning/section-progression.ts',
]
const receipt = {
  kind: 'Existing P0 defects reproduced; no implementation fix applied',
  createdAt: new Date().toISOString(),
  durationMs: Math.round(performance.now() - started),
  cade: { initial: actual, publicationIssue: wrongPreservationIssue.message },
  dino: {
    withoutHitbox: before,
    withHitbox: after,
    conclusion: 'Opposing structural rules require different per-part reference snapshots.',
  },
  sources: sourcePaths.map((path) => ({
    path,
    sha256: createHash('sha256')
      .update(readFileSync(resolve(root, path)))
      .digest('hex'),
  })),
}
writeFileSync(
  resolve(import.meta.dir, 'p0-causal-receipt.json'),
  JSON.stringify(receipt, null, 2) + '\n',
)
console.log(
  JSON.stringify({
    cadePreservationDefectReproduced: true,
    dinoOpposingSnapshotsReproduced: true,
    durationMs: receipt.durationMs,
  }),
)
