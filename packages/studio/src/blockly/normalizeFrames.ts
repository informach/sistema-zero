import * as Blockly from 'blockly/core'
import { areaForBlockType, inferBehaviorAreaFromType } from './blockContracts'
import {
  collectFlatFromWorkspace,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_START,
  FRAME_STRUCTURE,
} from './buildIR'
import { migrateHTMLStructure } from './migrateHTMLStructure'
import { migrateIfElseBlocks } from './migrateIfElse'
import { migrateLegacyValueFields, restoreShadowLiterals } from './migrateValueFields'
import { ensureBlocklyInitialized } from './setup'
import { buildWorkspaceStateFromIR } from './workspaceState'

const FRAME_TYPES = new Set<string>([
  FRAME_STRUCTURE,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR,
  FRAME_START,
  FRAME_EVENTS,
  FRAME_LOOPS,
])
const CURRENT_FRAME_TYPES = new Set<string>([
  FRAME_STRUCTURE,
  FRAME_APPEARANCE,
  FRAME_START,
  FRAME_EVENTS,
  FRAME_LOOPS,
])
const START_WRAPPER_BLOCK_TYPES = new Set([
  'sz_g2d_on_start',
  'sz_gk_on_game_start',
  'sz_js_on_load',
])
const ENGINE_BOOT_BLOCK_TYPES = new Set(['sz_gk_start', 'sz_g3k_start', 'sz_w3d_start'])

interface SerializedBlock {
  type: string
  id?: string
  x?: number
  y?: number
  inputs?: Record<string, { block?: SerializedBlock; shadow?: SerializedBlock }>
  next?: { block: SerializedBlock }
  [key: string]: unknown
}

/** O `blocksState` serializado já tem algum frame (container) no topo? */
export function blocksStateHasFrame(state: unknown): boolean {
  const blocks = (state as { blocks?: { blocks?: Array<{ type?: string }> } } | null | undefined)
    ?.blocks?.blocks
  return (
    Array.isArray(blocks) &&
    blocks.some((b) => typeof b?.type === 'string' && FRAME_TYPES.has(b.type))
  )
}

function serializedTopBlocks(state: unknown): SerializedBlock[] | null {
  const blocks = (state as { blocks?: { blocks?: unknown } } | null | undefined)?.blocks?.blocks
  if (!Array.isArray(blocks)) return null
  return blocks as SerializedBlock[]
}

function unlinkChain(head: SerializedBlock | undefined): SerializedBlock[] {
  const result: SerializedBlock[] = []
  let current = head
  while (current) {
    const next = current.next?.block
    const detached = { ...current }
    delete detached.next
    result.push(detached)
    current = next
  }
  return result
}

function linkChain(blocks: SerializedBlock[]): SerializedBlock | undefined {
  for (let index = 0; index < blocks.length - 1; index += 1) {
    const current = blocks[index]
    const next = blocks[index + 1]
    if (current && next) current.next = { block: next }
  }
  return blocks[0]
}

function firstStatementInput(block: SerializedBlock): SerializedBlock | undefined {
  for (const input of Object.values(block.inputs ?? {})) {
    if (input.block) return input.block
  }
  return undefined
}

function splitLegacySerializedBehavior(head: SerializedBlock | undefined): {
  start: SerializedBlock[]
  events: SerializedBlock[]
  loops: SerializedBlock[]
} {
  const sections = {
    start: [] as SerializedBlock[],
    events: [] as SerializedBlock[],
    loops: [] as SerializedBlock[],
  }

  const visit = (block: SerializedBlock): void => {
    if (START_WRAPPER_BLOCK_TYPES.has(block.type)) {
      for (const child of unlinkChain(firstStatementInput(block))) visit(child)
      return
    }
    if (ENGINE_BOOT_BLOCK_TYPES.has(block.type)) return
    const area = areaForBlockType(block.type) ?? inferBehaviorAreaFromType(block.type)
    if (area === 'events') sections.events.push(block)
    else if (area === 'loops') sections.loops.push(block)
    else sections.start.push(block)
  }

  for (const block of unlinkChain(head)) visit(block)
  return sections
}

function frame(type: string, children: SerializedBlock[], x: number, y: number): SerializedBlock {
  const child = linkChain(children)
  return {
    type,
    x,
    y,
    ...(child ? { inputs: { CHILDREN: { block: child } } } : {}),
  }
}

function migrateLegacyBehaviorFrame(state: unknown): unknown {
  const original = serializedTopBlocks(state)
  if (!original?.some((block) => block.type === FRAME_BEHAVIOR)) return state
  const cloned = structuredClone(state)
  const tops = serializedTopBlocks(cloned)
  if (!tops) return state
  const legacyIndex = tops.findIndex((block) => block.type === FRAME_BEHAVIOR)
  const legacy = tops[legacyIndex]
  if (!legacy) return state
  const sections = splitLegacySerializedBehavior(legacy.inputs?.CHILDREN?.block)
  const baseX = legacy.x ?? 32
  const baseY = legacy.y ?? 392
  const replacements: SerializedBlock[] = []
  if (sections.start.length > 0) replacements.push(frame(FRAME_START, sections.start, baseX, baseY))
  if (sections.events.length > 0) {
    replacements.push(frame(FRAME_EVENTS, sections.events, baseX + 420, baseY))
  }
  if (sections.loops.length > 0) {
    replacements.push(frame(FRAME_LOOPS, sections.loops, baseX + 840, baseY))
  }
  tops.splice(legacyIndex, 1, ...replacements)
  return cloned
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
  // `restoreShadowLiterals` CURA estados poluídos pela reconstrução IR→blocos
  // antiga (literais de preset emitidos como blocos reais → sombras de novo),
  // reativando fillFrames/applySuggestedSize em projetos já salvos.
  const migrated = migrateHTMLStructure(
    migrateIfElseBlocks(restoreShadowLiterals(migrateLegacyValueFields(state))),
  )
  if (!migrated) return migrated
  ensureBlocklyInitialized()
  const withLifecycleAreas = migrateLegacyBehaviorFrame(migrated)
  const topBlocks = serializedTopBlocks(withLifecycleAreas)
  if (topBlocks?.some((block) => CURRENT_FRAME_TYPES.has(block.type))) return withLifecycleAreas
  const blocks = (withLifecycleAreas as { blocks?: { blocks?: unknown[] } }).blocks?.blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return migrated
  const scratch = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(withLifecycleAreas as Record<string, unknown>, scratch)
    return buildWorkspaceStateFromIR(collectFlatFromWorkspace(scratch))
  } catch (e) {
    console.warn('Migração de blocos para frames falhou; mantendo o estado original:', e)
    return migrated
  } finally {
    scratch.dispose()
  }
}
