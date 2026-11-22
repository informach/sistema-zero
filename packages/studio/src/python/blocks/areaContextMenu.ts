import * as Blockly from 'blockly/core'
import {
  appendToPythonAreaFrame,
  ensurePythonAreaFrame,
  isPythonAreaFrame,
  pythonAreaFrames,
} from './areaFrames'
import { PYTHON_AREA_BY_KIND, PYTHON_AREAS, type PythonAreaKind } from './areas'

/** Quais áreas aceitam esta pilha solta (o editor dá a regra de arraste; sem ela, só o Ao iniciar). */
export type PythonAreaAcceptance = (block: Blockly.Block, kind: PythonAreaKind) => boolean
let acceptance: PythonAreaAcceptance = (_block, kind) => kind === 'start'
export function setPythonAreaAcceptance(rule: PythonAreaAcceptance) {
  acceptance = rule
}

function grouped(run: () => void) {
  const group = Blockly.Events.getGroup()
  if (!group) Blockly.Events.setGroup(true)
  try {
    run()
  } finally {
    if (!group) Blockly.Events.setGroup(false)
  }
}

/**
 * "Mover este bloco para Rascunhos" dentro das áreas; "Inserir no final de <área>" numa pilha
 * solta. Os dois são um passo só de desfazer.
 */
export function pythonAreaContextMenu(
  block: Blockly.BlockSvg,
  options: Blockly.ContextMenuRegistry.ContextMenuOption[],
) {
  const workspace = block.workspace
  if (workspace.isReadOnly() || !block.isEditable() || isPythonAreaFrame(block)) return
  const root = block.getRootBlock()
  if (isPythonAreaFrame(root)) {
    options.push({
      scope: { block, focusedNode: block },
      weight: 105,
      enabled: true,
      text: 'Mover este bloco para Rascunhos',
      callback() {
        grouped(() => {
          block.unplug(true)
          const position = block.getRelativeToSurfaceXY()
          const origin = root.getRelativeToSurfaceXY()
          const width = root instanceof Blockly.BlockSvg ? root.getHeightWidth().width : 600
          block.moveBy(origin.x + width + 80 - position.x, origin.y - position.y)
        })
      },
    })
    return
  }
  if (block.getParent() || !block.previousConnection) return
  let frames: Map<PythonAreaKind, Blockly.Block>
  try {
    frames = pythonAreaFrames(workspace)
  } catch {
    return
  }
  PYTHON_AREAS.forEach((area, index) => {
    if (!acceptance(block, area.kind)) return
    options.push({
      scope: { block, focusedNode: block },
      weight: 105 + index / 10,
      enabled: true,
      text: `Inserir no final de ${PYTHON_AREA_BY_KIND.get(area.kind)!.title}`,
      callback() {
        grouped(() => {
          const frame = frames.get(area.kind) ?? ensurePythonAreaFrame(workspace, area.kind)
          appendToPythonAreaFrame(frame, block)
        })
      },
    })
  })
}
