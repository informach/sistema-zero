import * as Blockly from 'blockly/core'
import { pythonAreaAcceptsStack } from './areaConnectionChecker'
import { ensurePythonAreaFrame, isPythonAreaFrame, pythonAreaFrames } from './areaFrames'
import { appendBeforePythonGameSwitch, pythonWantedArea } from './areaOrganize'
import { PYTHON_AREA_BY_KIND, PYTHON_AREAS, type PythonAreaKind } from './areas'

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
 * "Levar para <área>" no bloco que ficou fora da área dele (a nota explica por quê); "Mover
 * este bloco para Rascunhos" dentro das áreas; "Inserir no final de <área>" numa pilha solta.
 * Todos são um passo só de desfazer e entram antes do bloco que liga ou desliga o jogo.
 */
export function pythonAreaContextMenu(
  block: Blockly.BlockSvg,
  options: Blockly.ContextMenuRegistry.ContextMenuOption[],
) {
  const workspace = block.workspace
  if (workspace.isReadOnly() || !block.isEditable() || isPythonAreaFrame(block)) return
  const root = block.getRootBlock()
  const wanted = pythonWantedArea(block)
  if (wanted && isPythonAreaFrame(block.getSurroundParent())) {
    options.push({
      scope: { block, focusedNode: block },
      weight: 104,
      enabled: true,
      text: `Levar para ${PYTHON_AREA_BY_KIND.get(wanted)!.title}`,
      callback() {
        grouped(() => {
          block.unplug(true)
          appendBeforePythonGameSwitch(ensurePythonAreaFrame(workspace, wanted), block)
        })
      },
    })
  }
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
    if (!pythonAreaAcceptsStack(block, area.kind)) return
    options.push({
      scope: { block, focusedNode: block },
      weight: 105 + index / 10,
      enabled: true,
      text: `Inserir no final de ${PYTHON_AREA_BY_KIND.get(area.kind)!.title}`,
      callback() {
        grouped(() => {
          const frame = frames.get(area.kind) ?? ensurePythonAreaFrame(workspace, area.kind)
          appendBeforePythonGameSwitch(frame, block)
        })
      },
    })
  })
}
