import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../packages/core/src/learning'
import {
  evaluateStudioSectionProject,
  studioSectionCompletionIssues,
} from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { lessonOneCuts } from './revisao-editorial-aula-01'

const root = resolve(import.meta.dir, '..')
const file = resolve(root, 'corre-dino-v6/aula-01/manifesto.json')
const candidate: unknown = JSON.parse(readFileSync(file, 'utf8'))
assert(isLearningManifest(candidate), 'Manifesto válido')
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
  'Objetivos alcançáveis no Estúdio e critérios compatíveis com cada seção',
)
assert.equal(
  candidate.blocks.filter((b) => 'existing' in b && b.existing.kind === 'studio').length,
  1,
)
assert.deepEqual(
  [...new Set(sections.flatMap((s) => (s.workspaceBlockId ? [s.workspaceBlockId] : [])))],
  ['projeto'],
)
assert.deepEqual(
  sections.map((s) => s.intent),
  [
    'presentation',
    'application',
    'application',
    'demonstration',
    'application',
    'demonstration',
    'application',
    'exploration',
    'delivery',
    'closing',
    'closing',
  ],
)

type Block = {
  type: string
  fields?: Record<string, string>
  inputs?: Record<string, { shadow?: Block; block?: Block }>
  next?: { block: Block }
  disabled?: boolean
}
const number = (n: number): { shadow: Block } => ({
  shadow: { type: 'sz_val_number', fields: { NUM: String(n) } },
})
const start = (): Block => ({ type: 'sz_frame_start' })
const stage: Block = { type: 'sz_g2d_setup_stage', inputs: { W: number(480), H: number(270) } }
const border: Block = {
  type: 'sz_g2d_stage_border',
  fields: { COLOR: '#ffffff' },
  inputs: { WIDTH: number(4) },
}
const description: Block = {
  type: 'sz_g2d_set_stage_description',
  fields: { DESCRIPTION: 'Corra com o dino e pule os cactos apertando espaço' },
}
const dino: Block = {
  type: 'sz_g2d_create_dino',
  fields: { NAME: 'dino', COLOR: '#8844ff' },
  inputs: { X: number(110), Y: number(150), SIZE: number(64) },
}
function project(children: Block[], loose: Block[] = []) {
  const area = start()
  let chain: Block | undefined
  for (const child of [...children].reverse())
    chain = { ...structuredClone(child), ...(chain ? { next: { block: chain } } : {}) }
  if (chain) area.inputs = { CHILDREN: { block: chain } }
  return { blocksState: { blocks: { blocks: [area, ...loose] } } }
}
function results(sectionKey: string, value: unknown) {
  const section = sections.find((s) => s.id === sectionKey)
  assert(section?.completion?.projectChecks)
  return evaluateStudioSectionProject(section.completion.projectChecks, value).map(
    (check) => check.passed,
  )
}
assert.deepEqual(results('iniciar-v7', { blocksState: { blocks: { blocks: [] } } }), [false])
assert.deepEqual(
  results('iniciar-v7', project([])),
  [true],
  'A primeira tarefa aceita Ao iniciar ainda vazio',
)
assert.deepEqual(
  results('tela-v7', project([stage])),
  [true, false],
  'Preparar a tela não substitui a borda',
)
assert.deepEqual(
  results('tela-v7', project([stage], [border])),
  [true, false],
  'Borda solta não conta',
)
assert.deepEqual(results('tela-v7', project([stage, { ...border, disabled: true }])), [true, false])
assert.deepEqual(results('tela-v7', project([stage, border])), [true, true])
assert.deepEqual(
  results(
    'descricao-criar-v7',
    project([
      stage,
      border,
      { ...description, fields: { DESCRIPTION: 'Pegue as moedas. Use as setas para andar.' } },
    ]),
  ),
  [false],
  'Texto padrão de outro jogo não conclui esta etapa',
)
assert.deepEqual(results('descricao-criar-v7', project([stage, border, description])), [true])
assert.deepEqual(
  results('dino-v7', project([stage, border, description, dino])),
  [true],
  'A cor pode variar; o identificador dino mantém a continuidade da trilha guiada',
)
assert.deepEqual(
  results(
    'dino-v7',
    project([stage, border, description, { ...dino, inputs: { ...dino.inputs, X: number(120) } }]),
  ),
  [false],
  'A posição precisa corresponder ao valor trabalhado',
)
assert.deepEqual(results('entrega-v7', project([stage, border, description, dino])), [
  true,
  true,
  true,
  true,
  true,
])
assert.deepEqual(
  results('entrega-v7', project([stage, description, dino])),
  [true, true, false, true, true],
  'A conferência final reconhece uma peça removida depois de concluir sua etapa',
)

const originals = process.argv[2]
let sourceHash: string | null = null
if (originals) {
  const original = readFileSync(resolve(originals, lessonOneCuts.sourceFile), 'utf8')
  const normalize = (s: string) => s.replaceAll('**', '').replaceAll('\r\n', '\n').normalize('NFC')
  const plain = normalize(original)
  for (const clip of lessonOneCuts.clips) {
    const from = plain.indexOf(`## ${clip.sourceSection}\n`)
    assert(from >= 0, `Parte da fonte: ${clip.key}`)
    const to = plain.indexOf('\n## ', from + 4)
    const part = plain.slice(from, to === -1 ? undefined : to)
    assert(part.includes(normalize(clip.entry)), `Entrada do recorte: ${clip.key}`)
    assert(part.includes(normalize(clip.exit)), `Saída do recorte: ${clip.key}`)
  }
  sourceHash = createHash('sha256').update(original).digest('hex')
}
const report = {
  checkedAt: new Date().toISOString(),
  manifest: 'corre-dino-v6/aula-01/manifesto.json',
  sections: sections.length,
  distinctProjectCriteria: sections.find((s) => s.id === 'entrega-v7')?.completion?.projectChecks
    ?.length,
  sharedStudioBlocks: 1,
  clips: lessonOneCuts.clips.length,
  originalAnchorsChecked: Boolean(originals),
  sourceSha256: sourceHash,
  status: 'passed',
  scope:
    'Validação de autoria e critérios sobre snapshots representativos. Não executa edição de vídeo, teste de fala, publicação ou percurso autenticado.',
}
writeFileSync(
  resolve(root, 'qa/revisao-aula-01-verificacao.json'),
  `${JSON.stringify(report, null, 2)}\n`,
)
console.log(JSON.stringify(report, null, 2))
