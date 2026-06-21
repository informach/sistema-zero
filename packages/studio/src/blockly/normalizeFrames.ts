import * as Blockly from 'blockly/core'
import {
  collectFlatFromWorkspace,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR,
  FRAME_STRUCTURE,
} from './buildIR'
import { ensureBlocklyInitialized } from './setup'
import { buildWorkspaceStateFromIR } from './workspaceState'

const FRAME_TYPES = new Set<string>([FRAME_STRUCTURE, FRAME_APPEARANCE, FRAME_BEHAVIOR])

/** O `blocksState` serializado já tem algum frame (container) no topo? */
export function blocksStateHasFrame(state: unknown): boolean {
  const blocks = (state as { blocks?: { blocks?: Array<{ type?: string }> } } | null | undefined)
    ?.blocks?.blocks
  return (
    Array.isArray(blocks) &&
    blocks.some((b) => typeof b?.type === 'string' && FRAME_TYPES.has(b.type))
  )
}

/**
 * MIGRAÇÃO transparente para o modelo CONTAINER (frames). Um projeto LEGADO
 * (blocos soltos, sem frames) é re-emitido com os 3 frames — 🧱 Estrutura /
 * 🎨 Aparência / ⚙️ Comportamento — **preservando a saída**. Idempotente: se já
 * tem frame, ou está vazio/nulo/ilegível, devolve o estado ORIGINAL.
 *
 * Carrega o estado num workspace HEADLESS de descarte, deriva a IR PLANA (a mesma
 * coleta do modelo antigo, `collectFlatFromWorkspace`) e re-emite com
 * `buildWorkspaceStateFromIR` (que embrulha tudo nos frames). Reusa o round-trip
 * blocos→IR→blocos já confiável, então o programa da criança não muda.
 *
 * ⚠️ Os blocos de extensão precisam estar registrados ANTES (o `BlocklyPanel`
 * chama `reregisterInstalledExtensions` antes do load) — senão o headless dropa
 * o tipo e a migração cairia no `catch`.
 */
export function normalizeBlocksStateToFrames(state: unknown): unknown {
  if (!state || blocksStateHasFrame(state)) return state
  const blocks = (state as { blocks?: { blocks?: unknown[] } }).blocks?.blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return state
  ensureBlocklyInitialized()
  const scratch = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(state as Record<string, unknown>, scratch)
    return buildWorkspaceStateFromIR(collectFlatFromWorkspace(scratch))
  } catch (e) {
    console.warn('Migração de blocos para frames falhou; mantendo o estado original:', e)
    return state
  } finally {
    scratch.dispose()
  }
}
