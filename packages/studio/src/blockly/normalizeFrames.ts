import * as Blockly from 'blockly/core'
import {
  areaForBlockType,
  areasForBlockType,
  contractProvidesUserGesture,
  effectiveBodyExecution,
  getBlockContract,
} from './blockContracts'
import { BEHAVIOR_AREAS_STATE_KEY, BEHAVIOR_AREAS_STATE_VERSION } from './blocksStateVersion'
import {
  collectFlatFromWorkspace,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR,
  FRAME_EVENTS,
  FRAME_LOOPS,
  FRAME_MOLDS,
  FRAME_START,
  FRAME_STRUCTURE,
} from './buildIR'
import { VARIABLE_DECL_BLOCKS } from './fields/FieldNamePicker'
import { migrateAsyncBlocks } from './migrateAsyncBlocks'
import { migrateHTMLStructure } from './migrateHTMLStructure'
import { migrateIfElseBlocks } from './migrateIfElse'
import { migrateLegacyValueFields, restoreShadowLiterals } from './migrateValueFields'
import { ensureBlocklyInitialized } from './setup'
import { buildWorkspaceStateFromIR } from './workspaceState'

const FRAME_TYPES = new Set<string>([
  FRAME_STRUCTURE,
  FRAME_APPEARANCE,
  FRAME_BEHAVIOR,
  FRAME_MOLDS,
  FRAME_START,
  FRAME_EVENTS,
  FRAME_LOOPS,
])
const CURRENT_FRAME_TYPES = new Set<string>([
  FRAME_STRUCTURE,
  FRAME_APPEARANCE,
  FRAME_MOLDS,
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
const USER_GESTURE_COMMAND_TYPES = new Set(['sz_js_request_fullscreen', 'sz_js_toggle_fullscreen'])
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

/** Todo texto de campo da subárvore de um bloco (inclui sombras e a pilha de dentro). */
function fieldTextsInSubtree(block: SerializedBlock, into = new Set<string>()): Set<string> {
  const fields = block.fields
  if (typeof fields === 'object' && fields !== null) {
    for (const value of Object.values(fields as Record<string, unknown>)) {
      if (typeof value === 'string' && value.trim()) into.add(value.trim())
    }
  }
  for (const input of Object.values(block.inputs ?? {})) {
    if (input.block) for (const child of unlinkChain(input.block)) fieldTextsInSubtree(child, into)
    if (input.shadow) fieldTextsInSubtree(input.shadow, into)
  }
  return into
}

/**
 * Os nomes de variável que ESTE bloco cria, pelo registro do seletor de nomes.
 *
 * ⚠️ Só conta quem PODE viver em 🧩 Meus moldes. A maioria dos declaradores de
 * variável cria um recurso concreto (a pontuação, o teclado, um elemento da
 * página) e é exclusiva de ⚙️ Ao iniciar: mover um deles geraria um estado que o
 * Blockly RECUSA ao carregar, e o projeto deixaria de abrir.
 */
function declaredVariableNames(block: SerializedBlock): string[] {
  const fieldNames = VARIABLE_DECL_BLOCKS[block.type]
  if (!fieldNames) return []
  if (!areasForBlockType(block.type)?.includes('molds')) return []
  const fields = block.fields
  if (typeof fields !== 'object' || fields === null) return []
  const record = fields as Record<string, unknown>
  return fieldNames
    .map((name) => record[name])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
}

/**
 * Sobe para 🧩 Meus moldes as variáveis e constantes de que os moldes migrados
 * dependem, para a área nova nunca nascer apontando para um nome que só passa a
 * existir depois dela.
 *
 * ⭐ Isto só é seguro porque variável cabe nas DUAS áreas: mover uma para cima
 * nunca a torna inválida, e o Ao iniciar continua enxergando o que foi criado
 * antes dele. O contrário (descer o molde) seria proibido pelo encaixe.
 *
 * ⚠️ O casamento é por TEXTO de campo, não por análise de referência: a única
 * consequência de um falso positivo é uma constante subir junto, o que continua
 * sendo um programa válido. Um falso negativo, sim, apareceria — e aparece como
 * erro legível de "nome ainda não foi criado", não como quebra silenciosa.
 *
 * O ponto fixo cobre a cadeia (a constante que o molde usa pode depender de
 * outra), com um teto de voltas porque cada volta só pode mover para cima.
 */
function liftMoldDependencies(startChain: SerializedBlock[], molds: SerializedBlock[]): void {
  if (molds.length === 0) return
  const lifted: SerializedBlock[] = []

  for (let round = 0; round < 8; round += 1) {
    const used = new Set<string>()
    for (const mold of [...molds, ...lifted]) fieldTextsInSubtree(mold, used)

    const moved: SerializedBlock[] = []
    for (let index = startChain.length - 1; index >= 0; index -= 1) {
      const candidate = startChain[index]
      if (!candidate) continue
      const declares = declaredVariableNames(candidate)
      if (declares.length === 0 || !declares.some((name) => used.has(name))) continue
      startChain.splice(index, 1)
      moved.unshift(candidate)
    }
    if (moved.length === 0) break
    lifted.unshift(...moved)
  }

  // As dependências entram ANTES dos moldes, preservando a ordem em que estavam
  // no Ao iniciar: uma constante que dependia de outra continua depois dela.
  molds.unshift(...lifted)
}

interface UserGestureContext {
  userGestureBody: boolean
}

function isSerializedUserGestureEvent(block: SerializedBlock): boolean {
  const fields = block.fields
  const record =
    typeof fields === 'object' && fields !== null ? (fields as Record<string, unknown>) : {}
  return contractProvidesUserGesture(getBlockContract(block.type), (name) => record[name])
}

/**
 * Solta como rascunho comandos de tela cheia que versões anteriores deixavam
 * salvar fora de uma ativação transitória válida. A versão 6 também aplica o
 * contrato declarado por callbacks de extensões oficiais.
 */
function detachInvalidUserGestureCommands(
  head: SerializedBlock | undefined,
  context: UserGestureContext,
  drafts: SerializedBlock[],
): { head: SerializedBlock | undefined; changed: boolean } {
  const kept: SerializedBlock[] = []
  let changed = false

  for (const block of unlinkChain(head)) {
    if (USER_GESTURE_COMMAND_TYPES.has(block.type) && !context.userGestureBody) {
      drafts.push(block)
      changed = true
      continue
    }

    const contract = getBlockContract(block.type)
    const bodyExecution = effectiveBodyExecution(contract)
    const resetsActivation = bodyExecution === 'deferred-callback' || bodyExecution === 'function'
    const childContext: UserGestureContext = {
      userGestureBody:
        isSerializedUserGestureEvent(block) || (!resetsActivation && context.userGestureBody),
    }
    for (const input of Object.values(block.inputs ?? {})) {
      if (!input.block) continue
      const nested = detachInvalidUserGestureCommands(input.block, childContext, drafts)
      if (nested.changed) changed = true
      if (nested.head) input.block = nested.head
      else delete input.block
    }
    kept.push(block)
  }

  return { head: linkChain(kept), changed }
}

function splitLegacySerializedBehavior(
  head: SerializedBlock | undefined,
): Record<BehaviorArea, SerializedBlock[]> {
  const sections = emptyBehaviorCollection()

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
    else if (area === 'molds') sections.molds.push(block)
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
  molds: FRAME_MOLDS,
  start: FRAME_START,
  events: FRAME_EVENTS,
  loops: FRAME_LOOPS,
} as const

/**
 * Onde um frame CRIADO pela migração nasce no canvas. ⚠️ 🧩 Meus moldes ganha
 * uma linha própria em vez da coluna 0 da linha de baixo (que é do Ao iniciar):
 * mover os frames que já existem para abrir espaço mudaria o arranjo que a
 * criança montou. "Organizar blocos" recoloca tudo na ordem canônica quando ela
 * quiser.
 */
function framePosition(area: keyof typeof FRAME_FOR_AREA): { column: number; row: number } {
  if (area === 'structure') return { column: 0, row: 0 }
  if (area === 'appearance') return { column: 1, row: 0 }
  if (area === 'molds') return { column: 0, row: 2 }
  if (area === 'events') return { column: 1, row: 1 }
  if (area === 'loops') return { column: 2, row: 1 }
  return { column: 0, row: 1 }
}

function appendChildrenToArea(
  tops: SerializedBlock[],
  area: keyof typeof FRAME_FOR_AREA,
  children: SerializedBlock[],
): void {
  if (children.length === 0) return
  const frameType = FRAME_FOR_AREA[area]
  const existing = tops.find((block) => block.type === frameType)
  if (!existing) {
    const { column, row } = framePosition(area)
    tops.push(frame(frameType, children, 32 + column * 420, 32 + row * 360))
    return
  }
  const current = unlinkChain(existing.inputs?.CHILDREN?.block)
  const head = linkChain([...current, ...children])
  existing.inputs = head
    ? { ...(existing.inputs ?? {}), CHILDREN: { block: head } }
    : existing.inputs
}

type BehaviorArea = 'molds' | 'start' | 'events' | 'loops'

const BEHAVIOR_AREA_FOR_FRAME: Readonly<Record<string, BehaviorArea>> = {
  [FRAME_MOLDS]: 'molds',
  [FRAME_START]: 'start',
  [FRAME_EVENTS]: 'events',
  [FRAME_LOOPS]: 'loops',
}

function emptyBehaviorCollection(): Record<BehaviorArea, SerializedBlock[]> {
  return { molds: [], start: [], events: [], loops: [] }
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
 * Versão 5: reencaminha raízes cujo contrato mudou, ergue construtores
 * persistentes e solta tela cheia inválida que projetos antigos permitiam.
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
  const collected = emptyBehaviorCollection()
  const gestureDrafts: SerializedBlock[] = []
  let changed = false

  for (const top of tops) {
    const currentArea = BEHAVIOR_AREA_FOR_FRAME[top.type]
    if (!currentArea) continue
    const kept: SerializedBlock[] = []
    for (const child of unlinkChain(top.inputs?.CHILDREN?.block)) {
      if (extractStrictLifecycleRoots(child, collected)) changed = true
      const target = areaForBlockType(child.type)
      const allowedAreas = areasForBlockType(child.type)
      if (target && target !== 'structure' && target !== 'appearance') {
        if (!allowedAreas?.includes(currentArea)) {
          collected[target].push(child)
          changed = true
          continue
        }
      }
      kept.push(child)
    }
    // Os moldes saem do ⚙️ Ao iniciar, então é aqui — com a cadeia que FICA
    // ainda em mãos — que as variáveis de que eles dependem sobem junto.
    if (currentArea === 'start' && collected.molds.length > 0) {
      liftMoldDependencies(kept, collected.molds)
      changed = true
    }
    const sanitized = detachInvalidUserGestureCommands(
      linkChain(kept),
      { userGestureBody: false },
      gestureDrafts,
    )
    if (sanitized.changed) changed = true
    const head = sanitized.head
    if (head) {
      top.inputs = { ...(top.inputs ?? {}), CHILDREN: { block: head } }
    } else if (top.inputs?.CHILDREN) {
      const inputs = { ...top.inputs }
      delete inputs.CHILDREN
      if (Object.keys(inputs).length > 0) top.inputs = inputs
      else delete top.inputs
    }
  }

  if (!changed && previousVersion !== 2 && previousVersion !== 3 && previousVersion !== 4) {
    return state
  }

  appendChildrenToArea(tops, 'molds', collected.molds)
  appendChildrenToArea(tops, 'start', collected.start)
  appendChildrenToArea(tops, 'events', collected.events)
  appendChildrenToArea(tops, 'loops', collected.loops)
  gestureDrafts.forEach((draft, index) => {
    draft.x = draft.x ?? 32 + index * 32
    draft.y = draft.y ?? 760 + index * 48
    tops.push(draft)
  })
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
    ...emptyBehaviorCollection(),
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
    collected.molds.push(...sections.molds)
    collected.start.push(...sections.start)
    collected.events.push(...sections.events)
    collected.loops.push(...sections.loops)
  }

  if (!changed) return state
  tops.splice(0, tops.length, ...kept)
  appendChildrenToArea(tops, 'structure', collected.structure)
  appendChildrenToArea(tops, 'appearance', collected.appearance)
  appendChildrenToArea(tops, 'molds', collected.molds)
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

  // Um salvamento interrompido pode conter a área legada ao lado de uma ou
  // mais áreas atuais. Nesse caso, preserve o frame atual e acrescente nele os
  // filhos migrados; criar outro frame faria o build consumir apenas o primeiro.
  const replacements: SerializedBlock[] = []
  const mergeOrReplace = (area: BehaviorArea, children: SerializedBlock[], x: number): void => {
    if (children.length === 0) return
    if (tops.some((block) => block.type === FRAME_FOR_AREA[area])) {
      appendChildrenToArea(tops, area, children)
      return
    }
    replacements.push(frame(FRAME_FOR_AREA[area], children, x, baseY))
  }
  mergeOrReplace('molds', sections.molds, baseX)
  mergeOrReplace('start', sections.start, baseX + 420)
  mergeOrReplace('events', sections.events, baseX + 840)
  mergeOrReplace('loops', sections.loops, baseX + 1260)
  tops.splice(legacyIndex, 0, ...replacements, ...duplicateDrafts)
  return markLifecycleBlocksState(cloned)
}

/**
 * MIGRAÇÃO transparente para o modelo CONTAINER (frames). Um projeto LEGADO
 * (blocos soltos, sem Áreas do projeto) é reemitido nas áreas necessárias:
 * 🧱 Estrutura, 🎨 Aparência, 🧩 Meus moldes, ⚙️ Ao iniciar, ⚡ Quando acontecer
 * e 🔁 Enquanto estiver rodando, sempre **preservando a saída**. Áreas antigas
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
  // `migrateAsyncBlocks` desfaz o campo ASYNC que virou bloco próprio; roda
  // ANTES de tudo porque muda o TIPO do bloco, e as migrações seguintes decidem
  // por tipo.
  const premigrated = migrateIfElseBlocks(
    restoreShadowLiterals(migrateLegacyValueFields(migrateAsyncBlocks(state))),
  )
  // ⚠️ Num estado ATUAL (marcador de versão), bloco HTML solto no topo é RASCUNHO
  // deliberado (ex.: um filho-de-svg que o encaixe semântico recusou) — a migração
  // de estrutura NÃO pode reescrevê-lo (embrulhar num svg novo etc.): a reescrita
  // fazia o restore do BlocklyPanel recarregar o canvas no meio da edição ("o bloco
  // se auto-encaixou e duplicou o resto", bug 24/07). Só estados LEGADOS normalizam
  // o topo; o conteúdo DENTRO dos frames segue normalizado sempre (cura de saves).
  const migrated = migrateHTMLStructure(premigrated, {
    preserveTopLevelDrafts: hasCurrentLifecycleVersion(premigrated),
  })
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
