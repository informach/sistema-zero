import * as Blockly from 'blockly/core'
import { areaForBlockType, getBlockContract } from './blockContracts'
import { BEHAVIOR_AREAS_STATE_KEY, BEHAVIOR_AREAS_STATE_VERSION } from './blocksStateVersion'
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

type LifecycleVersionedState = Record<string, unknown> & {
  [BEHAVIOR_AREAS_STATE_KEY]: typeof BEHAVIOR_AREAS_STATE_VERSION
}

export function markLifecycleBlocksState<T>(state: T): T | (T & LifecycleVersionedState) {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) return state
  const record = state as Record<string, unknown>
  if (record[BEHAVIOR_AREAS_STATE_KEY] === BEHAVIOR_AREAS_STATE_VERSION) return state
  return {
    ...record,
    [BEHAVIOR_AREAS_STATE_KEY]: BEHAVIOR_AREAS_STATE_VERSION,
  } as T & LifecycleVersionedState
}

function hasCurrentLifecycleVersion(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    !Array.isArray(state) &&
    (state as Record<string, unknown>)[BEHAVIOR_AREAS_STATE_KEY] === BEHAVIOR_AREAS_STATE_VERSION
  )
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
    // O catálogo semântico já foi registrado antes da migração. Tipo sem
    // contrato fica em Ao iniciar por compatibilidade, sem classificador de
    // nomes paralelo ao Blockly/IR.
    const area = areaForBlockType(block.type) ?? 'start'
    if (area === 'events') sections.events.push(block)
    else if (area === 'loops') sections.loops.push(block)
    else sections.start.push(block)
  }

  for (const block of unlinkChain(head)) visit(block)
  return sections
}

function legacyDrafts(head: SerializedBlock | undefined): SerializedBlock[] {
  const drafts: SerializedBlock[] = []
  for (const block of unlinkChain(head)) {
    if (START_WRAPPER_BLOCK_TYPES.has(block.type)) {
      drafts.push(...unlinkChain(firstStatementInput(block)))
      continue
    }
    if (!ENGINE_BOOT_BLOCK_TYPES.has(block.type)) drafts.push(block)
  }
  return drafts
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

const FRAME_FOR_AREA = {
  structure: FRAME_STRUCTURE,
  appearance: FRAME_APPEARANCE,
  start: FRAME_START,
  events: FRAME_EVENTS,
  loops: FRAME_LOOPS,
} as const

function appendChildrenToArea(
  tops: SerializedBlock[],
  area: keyof typeof FRAME_FOR_AREA,
  children: SerializedBlock[],
): void {
  if (children.length === 0) return
  const frameType = FRAME_FOR_AREA[area]
  const existing = tops.find((block) => block.type === frameType)
  if (!existing) {
    const column = area === 'appearance' || area === 'events' ? 1 : area === 'loops' ? 2 : 0
    const row = area === 'structure' || area === 'appearance' ? 0 : 1
    tops.push(frame(frameType, children, 32 + column * 420, 32 + row * 360))
    return
  }
  const current = unlinkChain(existing.inputs?.CHILDREN?.block)
  const head = linkChain([...current, ...children])
  existing.inputs = head
    ? { ...(existing.inputs ?? {}), CHILDREN: { block: head } }
    : existing.inputs
}

type BehaviorArea = 'start' | 'events' | 'loops'

const BEHAVIOR_AREA_FOR_FRAME: Readonly<Record<string, BehaviorArea>> = {
  [FRAME_START]: 'start',
  [FRAME_EVENTS]: 'events',
  [FRAME_LOOPS]: 'loops',
}

function extractStrictLifecycleRoots(
  block: SerializedBlock,
  collected: Record<BehaviorArea, SerializedBlock[]>,
): boolean {
  let changed = false
  for (const input of Object.values(block.inputs ?? {})) {
    if (!input.block) continue
    const kept: SerializedBlock[] = []
    for (const child of unlinkChain(input.block)) {
      if (extractStrictLifecycleRoots(child, collected)) changed = true
      const placement = getBlockContract(child.type)?.placement
      const target =
        placement?.root.length === 1 && placement.nested.length === 0
          ? placement.root[0]
          : undefined
      if (target) {
        collected[target].push(child)
        changed = true
      } else {
        kept.push(child)
      }
    }
    const head = linkChain(kept)
    if (head) input.block = head
    else delete input.block
  }
  return changed
}

/**
 * Versão 3: reencaminha raízes cujo contrato mudou e ergue construtores
 * persistentes que projetos antigos permitiam salvar dentro de eventos/laços.
 * Nada é apagado: o bloco estrito vai para o fim da sua área canônica.
 */
function migrateCurrentLifecyclePlacements(state: unknown, force = false): unknown {
  if (!force && hasCurrentLifecycleVersion(state)) return state
  const original = serializedTopBlocks(state)
  if (!original?.some((block) => BEHAVIOR_AREA_FOR_FRAME[block.type])) return state
  const previousVersion =
    typeof state === 'object' && state !== null && !Array.isArray(state)
      ? (state as Record<string, unknown>)[BEHAVIOR_AREAS_STATE_KEY]
      : undefined

  const cloned = structuredClone(state)
  const tops = serializedTopBlocks(cloned)
  if (!tops) return state
  const collected: Record<BehaviorArea, SerializedBlock[]> = {
    start: [],
    events: [],
    loops: [],
  }
  let changed = false

  for (const top of tops) {
    const currentArea = BEHAVIOR_AREA_FOR_FRAME[top.type]
    if (!currentArea) continue
    const kept: SerializedBlock[] = []
    for (const child of unlinkChain(top.inputs?.CHILDREN?.block)) {
      if (extractStrictLifecycleRoots(child, collected)) changed = true
      const target = areaForBlockType(child.type)
      if (target === 'start' || target === 'events' || target === 'loops') {
        if (target !== currentArea) {
          collected[target].push(child)
          changed = true
          continue
        }
      }
      kept.push(child)
    }
    const head = linkChain(kept)
    if (head) {
      top.inputs = { ...(top.inputs ?? {}), CHILDREN: { block: head } }
    } else if (top.inputs?.CHILDREN) {
      const inputs = { ...top.inputs }
      delete inputs.CHILDREN
      if (Object.keys(inputs).length > 0) top.inputs = inputs
      else delete top.inputs
    }
  }

  if (!changed && previousVersion !== 2) return state

  appendChildrenToArea(tops, 'start', collected.start)
  appendChildrenToArea(tops, 'events', collected.events)
  appendChildrenToArea(tops, 'loops', collected.loops)
  return markLifecycleBlocksState(cloned)
}

function migrateLooseTopBlocks(state: unknown): unknown {
  const original = serializedTopBlocks(state)
  if (!original || original.length === 0) return state
  const cloned = structuredClone(state)
  const tops = serializedTopBlocks(cloned)
  if (!tops) return state

  const kept: SerializedBlock[] = []
  const collected = {
    structure: [] as SerializedBlock[],
    appearance: [] as SerializedBlock[],
    start: [] as SerializedBlock[],
    events: [] as SerializedBlock[],
    loops: [] as SerializedBlock[],
  }
  let changed = false

  for (const top of tops) {
    if (FRAME_TYPES.has(top.type)) {
      kept.push(top)
      continue
    }
    const area = areaForBlockType(top.type)
    if (!area) {
      kept.push(top)
      continue
    }
    changed = true
    if (area === 'structure' || area === 'appearance') {
      collected[area].push(...unlinkChain(top))
      continue
    }
    const sections = splitLegacySerializedBehavior(top)
    collected.start.push(...sections.start)
    collected.events.push(...sections.events)
    collected.loops.push(...sections.loops)
  }

  if (!changed) return state
  tops.splice(0, tops.length, ...kept)
  appendChildrenToArea(tops, 'structure', collected.structure)
  appendChildrenToArea(tops, 'appearance', collected.appearance)
  appendChildrenToArea(tops, 'start', collected.start)
  appendChildrenToArea(tops, 'events', collected.events)
  appendChildrenToArea(tops, 'loops', collected.loops)
  return markLifecycleBlocksState(cloned)
}

function migrateLegacyBehaviorFrame(state: unknown): unknown {
  const original = serializedTopBlocks(state)
  if (!original?.some((block) => block.type === FRAME_BEHAVIOR)) return state
  const cloned = structuredClone(state)
  const tops = serializedTopBlocks(cloned)
  if (!tops) return state
  const legacyIndexes = tops.flatMap((block, index) =>
    block.type === FRAME_BEHAVIOR ? [index] : [],
  )
  const legacyIndex = legacyIndexes[0] ?? -1
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
  const duplicateDrafts = legacyIndexes.slice(1).flatMap((index, duplicateIndex) => {
    const duplicate = tops[index]
    if (!duplicate) return []
    return legacyDrafts(duplicate.inputs?.CHILDREN?.block).map((draft, draftIndex) => ({
      ...draft,
      x: draft.x ?? (duplicate.x ?? baseX) + duplicateIndex * 32,
      y: draft.y ?? (duplicate.y ?? baseY) + 120 + draftIndex * 48,
    }))
  })
  for (const index of [...legacyIndexes].reverse()) tops.splice(index, 1)
  tops.splice(legacyIndex, 0, ...replacements, ...duplicateDrafts)
  return markLifecycleBlocksState(cloned)
}

/**
 * MIGRAÇÃO transparente para o modelo CONTAINER (frames). Um projeto LEGADO
 * (blocos soltos, sem Áreas do projeto) é reemitido nas áreas necessárias:
 * 🧱 Estrutura, 🎨 Aparência, ⚙️ Ao iniciar, ⚡ Quando acontecer e
 * 🔁 Enquanto estiver rodando, sempre **preservando a saída**. Áreas antigas
 * duplicadas viram rascunhos soltos para
 * não executar duas vezes nem apagar o trabalho da criança.
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
  if (hasCurrentLifecycleVersion(migrated)) return migrated
  // Encaminha primeiro somente os blocos que já estavam soltos. A conversão da
  // área legada pode criar rascunhos a partir de áreas duplicadas; eles devem
  // continuar soltos, não ser recolhidos por esta mesma migração.
  const withLooseTopBlocks = migrateLooseTopBlocks(migrated)
  const withLifecycleAreas = migrateLegacyBehaviorFrame(withLooseTopBlocks)
  const withCurrentPlacements = migrateCurrentLifecyclePlacements(withLifecycleAreas, true)
  if (hasCurrentLifecycleVersion(withCurrentPlacements)) return withCurrentPlacements
  if (withCurrentPlacements !== migrated) return markLifecycleBlocksState(withCurrentPlacements)
  const topBlocks = serializedTopBlocks(withCurrentPlacements)
  if (topBlocks?.some((block) => CURRENT_FRAME_TYPES.has(block.type))) return withCurrentPlacements
  const blocks = (withCurrentPlacements as { blocks?: { blocks?: unknown[] } }).blocks?.blocks
  if (!Array.isArray(blocks) || blocks.length === 0) return migrated
  const scratch = new Blockly.Workspace()
  try {
    Blockly.serialization.workspaces.load(withCurrentPlacements as Record<string, unknown>, scratch)
    return markLifecycleBlocksState(buildWorkspaceStateFromIR(collectFlatFromWorkspace(scratch)))
  } catch (e) {
    console.warn('Migração de blocos para frames falhou; mantendo o estado original:', e)
    return migrated
  } finally {
    scratch.dispose()
  }
}
