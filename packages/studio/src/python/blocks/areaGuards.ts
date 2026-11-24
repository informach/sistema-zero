/**
 * Guardas das áreas do projeto Python, depois de cada gesto da criança (nunca na carga nem no
 * desfazer, que repõe um estado que já era válido):
 *
 * - uma área de cada tipo: a repetida some e o que estava dentro dela vira rascunho (a mesma
 *   regra do JavaScript, que nunca apaga o código da criança);
 * - o bloco que liga ou desliga o jogo mora no fim da última área usada, com a cauda dele (o
 *   "obrigado por jogar" que roda quando o jogo fecha), no mesmo passo de desfazer do gesto que o
 *   tirou de lá. Só quando o GESTO mexeu nele ou pôs uma linha depois dele: editar outra linha não
 *   muda nada, e o organizar (que já planeja o fim no fim) fica de fora.
 */
import * as Blockly from 'blockly/core'
import { isWorkspaceLoading } from '../../blockly/loadFence'
import {
  isPythonGameSwitchBlock,
  pythonNameUsedElsewhere,
  pythonSettingNameBlock,
} from './areaConnectionChecker'
import {
  appendToPythonAreaFrame,
  executablePythonAreaFrames,
  PYTHON_AREA_INPUT,
  pythonAreaKindOf,
} from './areaFrames'
import { PYTHON_ORGANIZE_GROUPS } from './areaOrganize'
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
 * O fim do jogo mora no fim da última área usada. O fim é o primeiro bloco que liga ou desliga o
 * jogo e a cauda dele: o que vinha depois dele na mesma área sem ter mexido neste gesto (o
 * "obrigado por jogar" e o `sys.exit()` que rodam quando a janela fecha).
 *
 * A pilha que a criança soltou depois do fim (ou o que sobrou embaixo do bloco que ela soltou no
 * meio) volta para onde o fim estava. O Blockly religa embaixo da pilha solta o que estava ali
 * antes, e esse resto também mexe no gesto: é a outra parte da cauda, e fica com o fim.
 *
 * Só age quando o gesto mexeu no próprio bloco ou pôs uma LINHA depois do fim (`moved`). Mexer
 * dentro de uma linha que já estava depois dele não conta: um programa aberto do código pode ter
 * o `def on_key_down` depois do `pgzrun.go()`, e trocar a ordem mudaria o que ele faz. Sem
 * `moved`, confere sempre. Devolve se mexeu.
 */
export function keepPythonGameSwitchAtTheEnd(
  workspace: Blockly.Workspace,
  moved?: ReadonlySet<string>,
): boolean {
  const lines = areaLines(workspace)
  const index = lines.findIndex((block) => isPythonGameSwitchBlock(block))
  if (index < 0) return false
  const start = lines[index]!
  let last = start
  for (let block = start.getNextBlock(); block && !moved?.has(block.id); ) {
    last = block
    block = block.getNextBlock()
  }
  const endIndex = lines.indexOf(last, index)
  if (endIndex === lines.length - 1) return false
  if (moved && !moved.has(start.id) && !lines.slice(endIndex + 1).some((l) => moved.has(l.id)))
    return false
  // O que caiu embaixo do fim: da 1ª linha que mexeu até antes da próxima que mexeu (o resto
  // religado pelo Blockly), que volta para o fim.
  const dropped = last.getNextBlock()
  let remainder: Blockly.Block | null = null
  for (let block = dropped?.getNextBlock(); moved && block; block = block.getNextBlock())
    if (moved.has(block.id)) {
      remainder = block
      break
    }
  const above = start.getPreviousBlock()
  const frame = start.getSurroundParent()
  start.unplug(false)
  if (dropped) {
    dropped.unplug(false)
    if (remainder) {
      remainder.unplug(false)
      last.nextConnection!.connect(remainder.previousConnection!)
    }
    const slot = above?.nextConnection ?? frame?.getInput(PYTHON_AREA_INPUT)?.connection
    slot?.connect(dropped.previousConnection!)
  }
  const target = executablePythonAreaFrames(workspace).at(-1)
  if (target) appendToPythonAreaFrame(target, start)
  return true
}

/**
 * O "guardar" que entrou em 🎛️ Configurações com nome minúsculo ganha o nome em MAIÚSCULAS (o
 * arraste só deixa entrar quando o nome não é usado em outro lugar). Devolve se trocou algum.
 */
export function uppercasePythonSettingNames(
  workspace: Blockly.Workspace,
  ids: ReadonlySet<string>,
) {
  let changed = false
  const visit = (block: Blockly.Block) => {
    const target = pythonSettingNameBlock(block)
    if (!target || pythonNameUsedElsewhere(target)) return
    target.setFieldValue(String(target.getFieldValue('NAME')).toUpperCase(), 'NAME')
    changed = true
  }
  for (const id of ids) {
    let block = workspace.getBlockById(id)
    // O nome digitado: o bloco do nome dentro do "guardar".
    if (block && block.getParent()?.type === 'sz_py_assign') block = block.getParent()
    if (!block || pythonAreaKindOf(block.getSurroundParent()) !== 'settings') continue
    for (let current: Blockly.Block | null = block; current; current = current.getNextBlock())
      visit(current)
  }
  return changed
}

/** Liga as guardas neste workspace; devolve como desligar. */
export function attachPythonAreaGuards(workspace: Blockly.Workspace): () => void {
  let active = true
  let queued = false
  let group = ''
  let moved = new Set<string>()
  let renamed = new Set<string>()
  const run = () => {
    queued = false
    if (!active || isWorkspaceLoading()) return
    // No meio do arraste a pilha ainda não chegou: as guardas esperam a criança soltar (o
    // evento do fim do arraste pede de novo, com os blocos de agora guardados).
    if (workspace instanceof Blockly.WorkspaceSvg && workspace.isDragging()) return
    const ids = moved
    moved = new Set()
    const names = renamed
    renamed = new Set()
    const previous = Blockly.Events.getGroup()
    // O conserto entra no MESMO passo de desfazer do gesto que o pediu.
    Blockly.Events.setGroup(group || true)
    try {
      enforceUniquePythonAreas(workspace)
      uppercasePythonSettingNames(workspace, new Set([...ids, ...names]))
      // O organizar religa todas as linhas, e o plano dele já deixa o fim do jogo no fim.
      if (!PYTHON_ORGANIZE_GROUPS.has(group)) keepPythonGameSwitchAtTheEnd(workspace, ids)
    } finally {
      Blockly.Events.setGroup(previous)
    }
  }
  const listener = (event: Blockly.Events.Abstract) => {
    if (event.isUiEvent || !event.recordUndo || isWorkspaceLoading()) return
    const blockId = (event as Blockly.Events.BlockBase).blockId
    if (event.type === Blockly.Events.BLOCK_CHANGE) {
      // A criança terminou de digitar o nome de um "guardar" (ele vira MAIÚSCULO em 🎛️).
      const change = event as Blockly.Events.BlockChange
      if (change.element !== 'field' || change.name !== 'NAME' || !blockId) return
      renamed.add(blockId)
    } else if (
      event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_MOVE
    ) {
      if (blockId) moved.add(blockId)
    } else return
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
