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

export function attachProjectAreaGuard(workspace: Blockly.Workspace): () => void {
  let enforcing = false
  let queued = false
  let active = true
  const listener = () => {
    if (enforcing || queued) return
    queued = true
    queueMicrotask(() => {
      queued = false
      if (!active || enforcing) return
      enforcing = true
      try {
        // Espera o lote atual terminar: durante `serialization.blocks.append`,
        // o evento de criação da área chega antes de seus filhos. Remover a
        // duplicata no meio da desserialização poderia clonar a pilha.
        const result = enforceUniqueProjectAreas(workspace)
        const svgWorkspace = workspace as unknown as Partial<Blockly.WorkspaceSvg>
        if (result.focusedBlockId) svgWorkspace.centerOnBlock?.(result.focusedBlockId)
      } finally {
        enforcing = false
      }
    })
  }
  workspace.addChangeListener(listener)
  return () => {
    active = false
    workspace.removeChangeListener(listener)
  }
}
