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
// ⚠️ A descoberta do limite e a das coordenadas terminam em cenas que a criança mexe. A montagem
// da tela fica em uma seção seguinte, no mesmo Estúdio compartilhado, para não antecipar controles.
assert.deepEqual(
  sections.map((s) => s.intent),
  [
    'presentation',
    'application',
    'exploration',
    'application',
    'exploration',
    'application',
    'exploration',
    'delivery',
    'closing',
    'closing',
  ],
)
const limite = sections.find((section) => section.id === 'tela-experiencia-v8')
const montagemDaTela = sections.find((section) => section.id === 'tela-criar-v8')
assert.deepEqual(
  [
    limite?.blockIds,
    limite?.workspaceBlockId,
    montagemDaTela?.blockIds,
    montagemDaTela?.workspaceBlockId,
  ],
  [
    ['orientacao-experiencia-tela-v8', 'experiencia-tela'],
    null,
    ['video-tela-v7', 'orientacao-tela-v7'],
    'projeto',
  ],
  'Descoberta e montagem da tela não compartilham uma seção',
)
const experienciaDaTela = candidate.blocks.find((block) => block.key === 'experiencia-tela')
assert(experienciaDaTela && 'content' in experienciaDaTela)
assert.equal(experienciaDaTela.content.kind, 'interactive')
if (experienciaDaTela.content.kind === 'interactive')
  assert.deepEqual(experienciaDaTela.content.activity, {
    type: 'experimentation',
    scene: 'stage-size',
  })
assert.equal(
  candidate.blocks.some((block) => block.key === 'experiencia-leitor-de-tela'),
  false,
)
assert.equal(
  candidate.blocks.some((block) => block.key === 'video-descricao-demo-v7'),
  false,
)
assert.equal(
  candidate.blocks.some((block) => block.key === 'video-descricao-criar-v7'),
  false,
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
  results('tela-criar-v8', project([stage])),
  [true, false],
  'Preparar a tela não substitui a borda',
)
assert.deepEqual(
  results('tela-criar-v8', project([stage], [border])),
  [true, false],
  'Borda solta não conta',
)
assert.deepEqual(results('tela-criar-v8', project([stage, { ...border, disabled: true }])), [
  true,
  false,
])
assert.deepEqual(results('tela-criar-v8', project([stage, border])), [true, true])
assert.deepEqual(
  results('dino-v7', project([stage, border, dino])),
  [true],
  'A cor pode variar; o identificador dino mantém a continuidade da trilha guiada',
)
assert.deepEqual(
  results(
    'dino-v7',
    project([stage, border, { ...dino, inputs: { ...dino.inputs, X: number(120) } }]),
  ),
  [false],
  'A posição precisa corresponder ao valor trabalhado',
)
assert.deepEqual(results('entrega-v7', project([stage, border, dino])), [true, true, true, true])
assert.deepEqual(
  results('entrega-v7', project([stage, dino])),
  [true, true, false, true],
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
