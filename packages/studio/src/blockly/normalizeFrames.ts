import * as Blockly from 'blockly/core'
import {
  collectFlatFromWorkspace,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR,
  FRAME_STRUCTURE,
} from './buildIR'
import { migrateIfElseBlocks } from './migrateIfElse'
import { migrateLegacyValueFields } from './migrateValueFields'
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
  // Antes de tudo: migra campos que viraram soquetes de valor (`field_*` → `input_value`),
  // preservando o valor salvo pela criança. Roda SEMPRE — inclusive em projetos já
  // framados (o campo legado pode estar dentro de um frame). Devolve a MESMA referência
  // quando não há nada a migrar (preserva a idempotência abaixo).
  // Migra "Se" legado (input ELSE fixo → mutator com `extraState.hasElse`) para não
  // perder o "senão" da criança ao carregar. Roda SEMPRE (inclusive em já framados;
  // devolve a MESMA referência quando não há nada a migrar).
  const migrated = migrateIfElseBlocks(migrateLegacyValueFields(state))
  if (!migrated || blocksStateHasFrame(migrated)) return migrated
  const blocks = (migrated as { blocks?: { blocks?: unknown[] } }).blocks?.blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return migrated
  ensureBlocklyInitialized()
  const scratch = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(migrated as Record<string, unknown>, scratch)
    return buildWorkspaceStateFromIR(collectFlatFromWorkspace(scratch))
  } catch (e) {
    console.warn('Migração de blocos para frames falhou; mantendo o estado original:', e)
    return migrated
  } finally {
    scratch.dispose()
  }
}
