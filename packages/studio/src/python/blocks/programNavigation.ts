import * as Blockly from 'blockly/core'
import {
  orderedPythonAreaFrames,
  PYTHON_AREA_INPUT,
  pythonAreaKindOf,
  pythonScratchRoots,
} from './areaFrames'
import { PYTHON_AREA_BY_KIND, PYTHON_COLLAPSIBLE_HAT_CODECS } from './areas'

const definitions = new Set([
  'sz_py_def',
  'sz_py_function',
  'sz_py_class',
  'sz_py_decorated_function',
  'sz_py_decorated_class',
])
/** O laço do Pygame-ce (`while` de topo na área do laço) também abre e fecha como um chapéu. */
const LOOP_STATEMENTS = new Set(['sz_py_forever', 'sz_py_while'])

/**
 * Abre e fecha como as funções ("Fechar as funções", o "Ir para"): definições e os blocos de
 * evento e de laço das áreas do projeto.
 */
function isCollapsible(block: Blockly.Block) {
  if (definitions.has(block.type) || PYTHON_COLLAPSIBLE_HAT_CODECS.has(block.type)) return true
  return LOOP_STATEMENTS.has(block.type) && pythonAreaKindOf(block.getSurroundParent()) === 'loops'
}

/** O nome de um chapéu de evento ou de laço na lista: o título do bloco e o nome, se tiver. */
function hatLabel(block: Blockly.Block) {
  const title = String(block.getFieldValue('PYTHON_TITLE') ?? '').trim()
  const name = String(block.getFieldValue('NAME') ?? '').trim()
  return [title || 'bloco', name].filter(Boolean).join(' ')
}

export interface PythonProgramEntry {
  id: string
  label: string
  depth: number
  expanded: boolean
  /** Uma área do projeto (sempre aberta: não conta como a função aberta agora). */
  area?: boolean
}
export interface PythonProgramNavigationState {
  entries: PythonProgramEntry[]
  scratch: number
}

/** Keep the complete Blockly model/history, but mount only open definition bodies.
 * Reattach before expansion and disposal: Blockly retains ownership of every SVG. */
export function createPythonProgramNavigation(
  workspace: Blockly.WorkspaceSvg,
  changed: (state: PythonProgramNavigationState) => void,
) {
  const detached = new Map<string, { svg: SVGGElement; parent: Element }>()
  let disposed = false
  let revision = 0
  let revealRevision = 0
  let lastState = ''
  const blocks = () => workspace.getAllBlocks(false).filter(isCollapsible)
  function restore() {
    revealRevision++
    for (const [id, { svg, parent }] of detached) {
      const block = workspace.getBlockById(id)
      // Undo can recreate an ID with a new SVG after deleting a closed definition.
      if (block?.getSvgRoot() === svg && !svg.parentNode)
        (block.getParent()?.getSvgRoot() ?? workspace.getCanvas() ?? parent).appendChild(svg)
    }
    detached.clear()
  }
  function publish() {
    let frames: Blockly.Block[] = []
    try {
      frames = orderedPythonAreaFrames(workspace)
    } catch {
      // Área repetida (colada por fora da paleta): a guarda do editor deixa uma só; a lista espera.
    }
    const entries: PythonProgramEntry[] = []
    // Input/next traversal follows the actual Python order, including nested definitions.
    const visit = (first: Blockly.Block | null, depth: number, scratch = false) => {
      for (let block = first; block; block = block.getNextBlock()) {
        const definition = definitions.has(block.type)
        const hat = !definition && isCollapsible(block)
        if (hat)
          entries.push({
            id: block.id,
            depth,
            label: `${scratch ? 'Rascunho · ' : ''}${hatLabel(block)}`,
            expanded: !block.isCollapsed(),
          })
        if (definition) {
          const name = String(
            block.getFieldValue('NAME') ?? block.getFieldValue('name') ?? '',
          ).trim()
          const params = String(block.getFieldValue('PARAMS') ?? '').trim()
          entries.push({
            id: block.id,
            depth,
            label: `${scratch ? 'Rascunho · ' : ''}${block.type.includes('class') ? 'Classe' : 'Função'} ${name || 'sem nome'}${params ? `(${params})` : ''}`,
            expanded: !block.isCollapsed(),
          })
        }
        for (const input of block.inputList)
          if (input.type === Blockly.inputs.inputTypes.STATEMENT)
            visit(
              input.connection?.targetBlock() ?? null,
              depth + (definition || hat ? 1 : 0),
              scratch,
            )
      }
    }
    // Cada área (na ordem do arquivo) e, dentro dela, as funções, classes e chapéus.
    for (const frame of frames) {
      const kind = pythonAreaKindOf(frame)
      entries.push({
        id: frame.id,
        depth: 0,
        label: kind ? PYTHON_AREA_BY_KIND.get(kind)!.title : 'Área',
        expanded: !frame.isCollapsed(),
        area: true,
      })
      visit(frame.getInputTargetBlock(PYTHON_AREA_INPUT), 1)
    }
    const scratch = pythonScratchRoots(workspace)
    for (const root of scratch) visit(root, 0, true)
    const state = { entries, scratch: scratch.length }
    const encoded = JSON.stringify(state)
    if (encoded !== lastState) {
      lastState = encoded
      changed(state)
    }
  }
  async function sync() {
    const token = ++revision
    await Blockly.renderManagement.finishQueuedRenders()
    if (disposed || token !== revision) return
    for (const [id, item] of detached) {
      const block = workspace.getBlockById(id)
      if (!block || block.getSvgRoot() !== item.svg) {
        detached.delete(id)
        continue
      }
      const parent = block?.getSurroundParent()
      if (!parent || !isCollapsible(parent) || !parent.isCollapsed()) {
        if (!item.svg.parentNode)
          (block.getParent()?.getSvgRoot() ?? workspace.getCanvas()).appendChild(item.svg)
        detached.delete(id)
      }
    }
    for (const block of blocks()) {
      if (!block.isCollapsed()) continue
      for (const input of block.inputList) {
        if (input.type !== Blockly.inputs.inputTypes.STATEMENT) continue
        const first = input.connection?.targetBlock()
        const svg = first instanceof Blockly.BlockSvg ? first.getSvgRoot() : undefined
        if (first && svg?.parentElement && !detached.has(first.id)) {
          detached.set(first.id, { svg, parent: svg.parentElement })
          svg.remove()
        }
      }
    }
    publish()
  }
  async function reveal(id?: string, select = true) {
    restore()
    const request = revealRevision
    const target = id ? workspace.getBlockById(id) : undefined
    const open = new Set<string>()
    for (let block: Blockly.Block | null = target ?? null; block; block = block.getSurroundParent())
      if (isCollapsible(block)) open.add(block.id)
    Blockly.Events.disable()
    try {
      for (const block of blocks()) block.setCollapsed(!open.has(block.id))
      for (const frame of orderedPythonAreaFrames(workspace)) frame.setCollapsed(false)
    } finally {
      Blockly.Events.enable()
    }
    await sync()
    if (disposed || request !== revealRevision) return
    const selected = target ?? orderedPythonAreaFrames(workspace)[0]
    if (selected) {
      const position = selected.getRelativeToSurfaceXY()
      workspace.scroll(40 - position.x * workspace.scale, 100 - position.y * workspace.scale)
      if (target && select) target.select()
    }
  }
  const listener = (event: Blockly.Events.Abstract) => {
    if (!event.isUiEvent) void sync()
  }
  workspace.addChangeListener(listener)
  return {
    restore,
    sync,
    reveal,
    async initialize(fresh: boolean) {
      if (fresh) await reveal()
      else await sync()
    },
    dispose() {
      disposed = true
      revision++
      workspace.removeChangeListener(listener)
      restore()
    },
  }
}
