/**
 * Organizar as áreas do projeto Python no workspace: lê o programa das áreas, planeja a ordem
 * mais arrumada que faz o MESMO programa (`planPythonOrganize`) e religa os blocos nessa ordem,
 * num passo só de desfazer. O commit normal do editor grava o arquivo (os comentários de área
 * vêm na fase 2 da transação). A linha que não pode ir para a área dela ganha uma nota.
 */
import * as Blockly from 'blockly/core'
import { isPythonGameSwitchBlock } from './areaConnectionChecker'
import {
  appendToPythonAreaFrame,
  ensurePythonAreaFrame,
  executablePythonAreaFrames,
  layoutPythonAreaFrames,
  PYTHON_AREA_INPUT,
  pythonAreaFrames,
} from './areaFrames'
import {
  analyzePythonModuleAreas,
  PYTHON_AREA_BY_KIND,
  type PythonAreaContext,
  type PythonAreaKind,
  type PythonCommuteConflict,
  planPythonOrganize,
} from './areas'
import { pythonWorkspaceToVisual } from './blockly'
import type { PythonBlockCodec } from './contract'
import { pythonVisualToAST } from './projection'

export interface PythonAreaBlockNote {
  block: Blockly.Block
  wanted: PythonAreaKind
  conflict?: PythonCommuteConflict
}

export interface PythonOrganizeOptions {
  context?: PythonAreaContext
  /** Linha que não pode sair do lugar na fonte (divide a linha do arquivo com outro comando). */
  movable?: (block: Blockly.Block) => boolean
  /** false: só calcula as notas, sem mexer em nada. */
  apply?: boolean
}

export interface PythonOrganizeResult {
  changed: boolean
  notes: PythonAreaBlockNote[]
}

const NOTHING: PythonOrganizeResult = { changed: false, notes: [] }

/** Organiza as áreas (ou só calcula as notas). Programa incompleto: não mexe em nada. */
export function organizePythonWorkspace(
  workspace: Blockly.Workspace,
  codecs: readonly PythonBlockCodec[],
  options: PythonOrganizeOptions = {},
): PythonOrganizeResult {
  let blocks: Blockly.Block[]
  let current: PythonAreaKind[]
  let plan: ReturnType<typeof planPythonOrganize>
  try {
    const frames = executablePythonAreaFrames(workspace)
    const visual = pythonWorkspaceToVisual(
      workspace,
      frames.map((frame) => frame.id),
      [],
      codecs,
    )
    const module = pythonVisualToAST(visual, codecs)
    blocks = visual.body.map((value) => workspace.getBlockById(value.blockId ?? '')!)
    if (blocks.some((block) => !block)) return NOTHING
    current = visual.areas ?? []
    const analysis = analyzePythonModuleAreas(
      module,
      visual.body.map((value) => (value.kind === 'block' ? value.codecId : undefined)),
      options.context,
    )
    plan = planPythonOrganize(analysis, (index) => options.movable?.(blocks[index]!) ?? true)
  } catch {
    // Bloco com entrada vazia, área repetida no meio de um gesto: organiza na próxima.
    return NOTHING
  }
  const same =
    plan.order.every((original, position) => original === position) &&
    plan.areas.every((kind, position) => kind === current[position])
  const notes = plan.notes.map((note) => ({
    block: blocks[plan.order[note.statement]!]!,
    wanted: note.wanted,
    ...(note.conflict ? { conflict: note.conflict } : {}),
  }))
  if (same || options.apply === false) return { changed: false, notes }
  const existing = new Set(pythonAreaFrames(workspace).keys())
  const previous = Blockly.Events.getGroup()
  if (!previous) Blockly.Events.setGroup(true)
  try {
    // Desfaz as correntes (cada linha de topo solta) e religa na ordem planejada.
    for (const frame of executablePythonAreaFrames(workspace))
      frame.getInput(PYTHON_AREA_INPUT)?.connection?.disconnect()
    for (const block of blocks)
      if (block.nextConnection?.targetBlock()) block.nextConnection.disconnect()
    for (const [position, original] of plan.order.entries())
      appendToPythonAreaFrame(
        ensurePythonAreaFrame(workspace, plan.areas[position]!),
        blocks[original]!,
      )
    if ([...pythonAreaFrames(workspace).keys()].some((kind) => !existing.has(kind)))
      layoutPythonAreaFrames(workspace)
  } finally {
    if (!previous) Blockly.Events.setGroup(false)
  }
  return { changed: true, notes }
}

export const PYTHON_AREA_WARNING_ID = 'python-area'
const wantedOf = new WeakMap<Blockly.Block, PythonAreaKind>()

/** A área a que o bloco pertence quando ele ficou em outra (para o "Levar para…"). */
export const pythonWantedArea = (block: Blockly.Block) => wantedOf.get(block)

/** Por que a linha ficou fora da área dela, em palavras de criança. */
export function pythonAreaNoteText(note: Pick<PythonAreaBlockNote, 'wanted' | 'conflict'>) {
  const wanted = PYTHON_AREA_BY_KIND.get(note.wanted)!.title
  const start = PYTHON_AREA_BY_KIND.get('start')!.title
  const reason = (() => {
    switch (note.conflict?.reason) {
      case 'name':
        return `Ela depende de "${note.conflict.name}", que é preparado ou trocado por outra linha antes dela.`
      case 'barrier':
        return 'Uma linha antes dela prende o programa (um laço ou o bloco que liga o jogo).'
      case 'effects':
        return 'Ela e outra linha do caminho fazem coisas na hora (desenhar, tocar, mudar valores), e a ordem conta.'
      case 'fixed':
        return 'Ela divide a mesma linha do código com outro comando. Separe os dois no código.'
      case 'pinned':
        return 'O começo do arquivo fica sempre no topo.'
      default:
        return 'Mudar o lugar dela mudaria o que o programa faz.'
    }
  })()
  return `Este bloco é de ${wanted}, mas ficou em ${start} para o programa continuar igual.\n${reason}`
}

/** Mostra as notas (aviso do Blockly com id próprio) e tira as que não valem mais. */
export function applyPythonAreaNotes(
  workspace: Blockly.Workspace,
  notes: readonly PythonAreaBlockNote[],
) {
  const noted = new Map(notes.map((note) => [note.block, note]))
  for (const block of workspace.getAllBlocks(false)) {
    const note = noted.get(block)
    if (note) {
      wantedOf.set(block, note.wanted)
      block.setWarningText(pythonAreaNoteText(note), PYTHON_AREA_WARNING_ID)
    } else if (wantedOf.has(block)) {
      wantedOf.delete(block)
      block.setWarningText(null, PYTHON_AREA_WARNING_ID)
    }
  }
}

/**
 * Encaixa a pilha no fim da área, mas antes do bloco que liga ou desliga o jogo (nada encaixa
 * embaixo dele).
 */
export function appendBeforePythonGameSwitch(frame: Blockly.Block, first: Blockly.Block) {
  const chain: Blockly.Block[] = []
  for (
    let block = frame.getInputTargetBlock(PYTHON_AREA_INPUT);
    block;
    block = block.getNextBlock()
  )
    chain.push(block)
  let index = chain.length
  while (index > 0 && isPythonGameSwitchBlock(chain[index - 1]!)) index--
  if (index === chain.length) {
    appendToPythonAreaFrame(frame, first)
    return
  }
  // Põe a pilha entre o último bloco comum (ou a entrada da área) e o primeiro "ligar o jogo".
  const target =
    index === 0 ? frame.getInput(PYTHON_AREA_INPUT)!.connection! : chain[index - 1]!.nextConnection!
  let tail = first
  while (tail.getNextBlock()) tail = tail.getNextBlock()!
  const rest = chain[index]!
  rest.previousConnection!.disconnect()
  target.connect(first.previousConnection!)
  tail.nextConnection!.connect(rest.previousConnection!)
}

/** O editor Python liga o "Organizar blocos" do workspace por aqui. */
export interface PythonOrganizerWorkspace {
  __szOrganizePython?: () => void
}

/**
 * "Organizar blocos" no menu do workspace do Python: arruma as áreas na tela e o arquivo pelas
 * áreas (o mesmo texto do JavaScript, que é âncora do robô das aulas gravadas).
 */
export function registerPythonOrganizeMenu() {
  const registry = Blockly.ContextMenuRegistry.registry
  if (registry.getItem('sz_py_organize')) return
  registry.register({
    id: 'sz_py_organize',
    weight: 6,
    scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
    displayText: () => 'Organizar blocos',
    preconditionFn: (scope) =>
      (scope.workspace as PythonOrganizerWorkspace | undefined)?.__szOrganizePython
        ? 'enabled'
        : 'hidden',
    callback: (scope) =>
      (scope.workspace as PythonOrganizerWorkspace | undefined)?.__szOrganizePython?.(),
  })
}
