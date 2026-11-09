import * as Blockly from 'blockly/core'
import { PYTHON_PROGRAM, pythonProgramArea, pythonScratchRoots } from './programArea'

const definitions = new Set([
  'sz_py_def',
  'sz_py_function',
  'sz_py_class',
  'sz_py_decorated_function',
  'sz_py_decorated_class',
])
export interface PythonProgramEntry {
  id: string
  label: string
  depth: number
  expanded: boolean
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
  const blocks = () => workspace.getAllBlocks(false).filter((block) => definitions.has(block.type))
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
    const area = pythonProgramArea(workspace)
    const entries: PythonProgramEntry[] = []
    // Input/next traversal follows the actual Python order, including nested definitions.
    const visit = (first: Blockly.Block | null, depth: number, scratch = false) => {
      for (let block = first; block; block = block.getNextBlock()) {
        const definition = definitions.has(block.type)
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
            visit(input.connection?.targetBlock() ?? null, depth + (definition ? 1 : 0), scratch)
      }
    }
    visit(area?.getInputTargetBlock('BODY') ?? null, 0)
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
      if (!parent || !definitions.has(parent.type) || !parent.isCollapsed()) {
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
      if (definitions.has(block.type)) open.add(block.id)
    Blockly.Events.disable()
    try {
      for (const block of blocks()) block.setCollapsed(!open.has(block.id))
      workspace.getBlocksByType(PYTHON_PROGRAM, false)[0]?.setCollapsed(false)
    } finally {
      Blockly.Events.enable()
    }
    await sync()
    if (disposed || request !== revealRevision) return
    const selected = target ?? pythonProgramArea(workspace)
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
