/**
 * Guardas das áreas do projeto Python, depois de cada gesto da criança (nunca na carga nem no
 * desfazer, que repõe um estado que já era válido):
 *
 * - uma área de cada tipo: a repetida some e o que estava dentro dela vira rascunho (a mesma
 *   regra do JavaScript, que nunca apaga o código da criança);
 * - o bloco que liga ou desliga o jogo mora no fim da última área usada, no mesmo passo de
 *   desfazer do gesto que o tirou de lá. Só quando o GESTO mexeu nele: um programa que já vinha
 *   com algo depois do `pgzrun.go()` (o "obrigado por jogar" que roda quando o jogo fecha) não
 *   muda sozinho porque a criança editou outra linha.
 */
import * as Blockly from 'blockly/core'
import { isWorkspaceLoading } from '../../blockly/loadFence'
import { isPythonGameSwitchBlock } from './areaConnectionChecker'
import {
  appendToPythonAreaFrame,
  executablePythonAreaFrames,
  PYTHON_AREA_INPUT,
  pythonAreaKindOf,
} from './areaFrames'
import type { PythonAreaKind } from './areas'

/** Deixa uma área de cada tipo; o conteúdo da repetida vira rascunho. Devolve quantas saíram. */
export function enforceUniquePythonAreas(workspace: Blockly.Workspace): number {
  const first = new Map<PythonAreaKind, Blockly.Block>()
  let removed = 0
  for (const block of workspace.getTopBlocks(true)) {
    const kind = pythonAreaKindOf(block)
    if (!kind) continue
    if (!first.has(kind)) {
      first.set(kind, block)
      continue
    }
    const child = block.getInputTargetBlock(PYTHON_AREA_INPUT)
    if (child) child.unplug(false)
    block.dispose(false)
    removed++
  }
  return removed
}

/** As linhas de topo das áreas com conteúdo, na ordem do arquivo. */
function areaLines(workspace: Blockly.Workspace) {
  const lines: Blockly.Block[] = []
  for (const frame of executablePythonAreaFrames(workspace))
    for (
      let block = frame.getInputTargetBlock(PYTHON_AREA_INPUT);
      block;
      block = block.getNextBlock()
    )
      lines.push(block)
  return lines
}

/**
 * Leva os blocos que ligam ou desligam o jogo para o fim da última área usada, na ordem em que
 * estavam. Devolve se mexeu.
 */
export function keepPythonGameSwitchAtTheEnd(workspace: Blockly.Workspace): boolean {
  const lines = areaLines(workspace)
  const switches = lines.filter((block) => isPythonGameSwitchBlock(block))
  if (!switches.length) return false
  // Já estão no fim (a cauda da última área é exatamente eles): nada a fazer.
  const tail = lines.slice(lines.length - switches.length)
  const frames = executablePythonAreaFrames(workspace)
  const last = frames.at(-1)!
  const inLast = (block: Blockly.Block) => block.getSurroundParent() === last
  if (tail.every((block, index) => block === switches[index] && inLast(block))) return false
  for (const block of switches) block.unplug(true)
  const target = executablePythonAreaFrames(workspace).at(-1) ?? last
  for (const block of switches) appendToPythonAreaFrame(target, block)
  return true
}

/** Liga as guardas neste workspace; devolve como desligar. */
export function attachPythonAreaGuards(workspace: Blockly.Workspace): () => void {
  let active = true
  let queued = false
  let group = ''
  let moved = new Set<string>()
  /** O gesto mexeu num bloco que liga ou desliga o jogo (ele ou alguém da pilha dele)? */
  const movedSwitch = (ids: ReadonlySet<string>) =>
    [...ids].some((id) => {
      for (let block = workspace.getBlockById(id); block; block = block.getNextBlock())
        if (isPythonGameSwitchBlock(block)) return true
      return false
    })
  const run = () => {
    queued = false
    if (!active || isWorkspaceLoading()) return
    // No meio do arraste a pilha ainda não chegou: as guardas esperam a criança soltar (o
    // evento do fim do arraste pede de novo, com os blocos de agora guardados).
    if ((workspace as Partial<Blockly.WorkspaceSvg>).isDragging?.()) return
    const ids = moved
    moved = new Set()
    const previous = Blockly.Events.getGroup()
    // O conserto entra no MESMO passo de desfazer do gesto que o pediu.
    Blockly.Events.setGroup(group || true)
    try {
      enforceUniquePythonAreas(workspace)
      if (movedSwitch(ids)) keepPythonGameSwitchAtTheEnd(workspace)
    } finally {
      Blockly.Events.setGroup(previous)
    }
  }
  const listener = (event: Blockly.Events.Abstract) => {
    if (event.isUiEvent || !event.recordUndo || isWorkspaceLoading()) return
    if (event.type !== Blockly.Events.BLOCK_CREATE && event.type !== Blockly.Events.BLOCK_MOVE)
      return
    const blockId = (event as Blockly.Events.BlockBase).blockId
    if (blockId) moved.add(blockId)
    group = event.group
    if (queued) return
    queued = true
    // Depois do lote inteiro: na criação de uma área, o evento dela chega antes dos filhos.
    queueMicrotask(run)
  }
  workspace.addChangeListener(listener)
  return () => {
    active = false
    workspace.removeChangeListener(listener)
  }
}
