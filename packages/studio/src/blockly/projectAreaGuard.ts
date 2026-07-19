import type * as Blockly from 'blockly/core'
import {
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR_LEGACY,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  FRAME_STRUCTURE,
  type ProjectAreaKind,
} from './blockContracts'

function areaKind(type: string): ProjectAreaKind | undefined {
  if (type === FRAME_STRUCTURE) return 'structure'
  if (type === FRAME_APPEARANCE) return 'appearance'
  if (type === FRAME_START || type === FRAME_BEHAVIOR_LEGACY) return 'start'
  if (type === FRAME_EVENTS) return 'events'
  if (type === FRAME_LOOPS) return 'loops'
  return undefined
}

export interface ProjectAreaGuardResult {
  removed: number
  focusedBlockId?: string
}

/**
 * Mantém uma única moldura de cada área. O conteúdo de uma duplicata vira
 * rascunho antes da moldura ser descartada, portanto a operação nunca apaga o
 * código da criança.
 */
export function enforceUniqueProjectAreas(workspace: Blockly.Workspace): ProjectAreaGuardResult {
  const firstByArea = new Map<ProjectAreaKind, Blockly.Block>()
  let removed = 0
  let focusedBlockId: string | undefined

  for (const block of workspace.getTopBlocks(true)) {
    const area = areaKind(block.type)
    if (!area) continue
    const first = firstByArea.get(area)
    if (!first) {
      firstByArea.set(area, block)
      continue
    }
    const child = block.getInputTargetBlock('CHILDREN')
    if (child) child.unplug(false)
    block.dispose(false)
    removed += 1
    focusedBlockId ??= first.id
  }

  return focusedBlockId ? { removed, focusedBlockId } : { removed }
}

export function attachProjectAreaGuard(workspace: Blockly.WorkspaceSvg): () => void {
  let enforcing = false
  const listener = () => {
    if (enforcing) return
    enforcing = true
    try {
      const result = enforceUniqueProjectAreas(workspace)
      if (result.focusedBlockId) workspace.centerOnBlock(result.focusedBlockId)
    } finally {
      enforcing = false
    }
  }
  workspace.addChangeListener(listener)
  return () => workspace.removeChangeListener(listener)
}
