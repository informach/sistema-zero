import * as Blockly from 'blockly/core'
import { jsonPlainCopy } from './jsonPlainCopy'

/**
 * Área de transferência de blocos ENTRE projetos (e entre abas) do Estúdio.
 *
 * O Blockly tem clipboard nativo, mas é em MEMÓRIA (some ao remontar o editor ao
 * trocar de projeto). Aqui guardamos a subárvore serializada em `localStorage`
 * (chave `sz:block-clipboard`) — síncrono (a precondição do menu lê direto),
 * sobrevive à navegação/recarregamento e funciona entre abas da mesma origem. É o
 * mesmo approach do plugin oficial `@blockly/plugin-cross-tab-copy-paste`.
 *
 * - **Copiar**: `Blockly.serialization.blocks.save(block)` (o padrão já inclui os
 *   blocos DENTRO + a cadeia `next` ABAIXO — igual ao que se move ao arrastar).
 * - **Colar**: `Blockly.serialization.blocks.append(state, workspace)` ADICIONA a
 *   subárvore sem limpar o workspace; o bloco entra SOLTO (rascunho) e a criança o
 *   arrasta para a Área do projeto compatível.
 *
 * Variáveis NÃO precisam de remapeamento: no Estúdio o nome da variável é um
 * `field_input` (texto) que viaja DENTRO do JSON do bloco — o gerador monta o JS
 * por nome. Por isso este módulo não toca no `variableMap` do Blockly.
 */

const CLIPBOARD_KEY = 'sz:block-clipboard'
const CLIPBOARD_VERSION = 1

/** Rótulos amigáveis das extensões oficiais para os avisos ao colar. */
const EXTENSION_LABELS: Record<string, string> = {
  'game-2d': 'Jogo 2D',
  'game-2d-advanced': 'Jogo 2D Avançado',
  'game-3d': 'Jogo 3D',
  'game-3d-advanced': 'Jogo 3D Avançado',
}

export interface BlockClipboardPayload {
  version: number
  /** Estado serializado da subárvore (`Blockly.serialization.blocks.save`). */
  block: Blockly.serialization.blocks.State
  /** Ids de extensões oficiais que a subárvore usa (detectadas pelo prefixo do tipo). */
  requiredExtensions: string[]
  copiedAt: number
  sourceTitle?: string
}

/**
 * Handlers POR INSTÂNCIA do Estúdio: os itens de menu são GLOBAIS, mas o
 * `projectStore`/UI é por instância. O `BlocklyPanel` registra estes handlers por
 * workspace (ver {@link registerPasteTarget}); o colar os busca pelo `scope.workspace`.
 */
export interface PasteTargetHandlers {
  getInstalledExtensions(): ReadonlyArray<{ id: string }>
  /** Ativa a extensão no projeto destino (registra os blocos + atualiza a store). */
  installExtensionById(id: string): boolean
  /** Se o tipo de bloco é aceito NESTE projeto (core + extensões instaladas). */
  isBlockTypeKnown(type: string): boolean
  /** Aviso gentil dentro do Estúdio (toast/banner). */
  notify(message: string): void
}

// ---------------------------------------------------------------------------
// Detecção de extensões / tipos a partir do estado serializado
// ---------------------------------------------------------------------------

/** Mapeia o prefixo do `type` do bloco para o id da extensão oficial. */
function extensionIdForBlockType(type: string): string | null {
  if (type.startsWith('sz_g2d_')) return 'game-2d'
  if (type.startsWith('sz_g3k_')) return 'game-3d-advanced'
  if (type.startsWith('sz_g3d_')) return 'game-3d'
  if (type.startsWith('sz_gk_')) return 'game-2d-advanced'
  if (type.startsWith('sz_w3d_')) return 'world-3d'
  return null
}

interface SerializedNode {
  id?: string
  type?: string
  inputs?: Record<string, { block?: SerializedNode; shadow?: SerializedNode }>
  next?: { block?: SerializedNode; shadow?: SerializedNode }
}

/** Onde um bloco salvo mora: o encaixe (ou o `next`) que o guarda e em qual posição. */
interface SerializedSlot {
  holder: { block?: SerializedNode; shadow?: SerializedNode }
  slot: 'block' | 'shadow'
}

/**
 * Os filhos diretos de um bloco salvo, na ordem do Blockly: cada encaixe (bloco, depois sombra) e
 * por fim o `next` (bloco, depois sombra).
 */
function childEntries(node: SerializedNode): Array<SerializedSlot & { child: SerializedNode }> {
  const entries: Array<SerializedSlot & { child: SerializedNode }> = []
  const add = (holder: SerializedSlot['holder'] | undefined) => {
    if (holder?.block) entries.push({ child: holder.block, holder, slot: 'block' })
    if (holder?.shadow) entries.push({ child: holder.shadow, holder, slot: 'shadow' })
  }
  for (const wrapper of Object.values(node.inputs ?? {})) add(wrapper)
  add(node.next)
  return entries
}

/**
 * Visita TODOS os blocos da subárvore em pré-ordem, sem recursão: a cauda `next` de uma cópia
 * pode ter milhares de blocos (copiar o primeiro evento leva todos os de baixo).
 */
function walkSerialized(
  state: unknown,
  visit: (node: SerializedNode, from?: SerializedSlot) => void,
): void {
  if (!state || typeof state !== 'object') return
  const pending: Array<{ node: SerializedNode; from?: SerializedSlot }> = [
    { node: state as SerializedNode },
  ]
  while (pending.length > 0) {
    const { node, from } = pending.pop() as { node: SerializedNode; from?: SerializedSlot }
    visit(node, from)
    const children = childEntries(node)
    for (let index = children.length - 1; index >= 0; index--) {
      const { child, holder, slot } = children[index] as SerializedSlot & { child: SerializedNode }
      if (typeof child === 'object') pending.push({ node: child, from: { holder, slot } })
    }
  }
}

/** Visita o `type` de TODOS os blocos da subárvore (inputs.block/shadow + next.block/shadow). */
function walkBlockTypes(state: unknown, visit: (type: string) => void): void {
  walkSerialized(state, (node) => {
    if (typeof node.type === 'string') visit(node.type)
  })
}

/** Ids de extensões oficiais que a subárvore usa (ex.: `['game-2d']`). */
export function requiredExtensionsForBlockState(state: unknown): string[] {
  const ids = new Set<string>()
  walkBlockTypes(state, (type) => {
    const id = extensionIdForBlockType(type)
    if (id) ids.add(id)
  })
  return [...ids]
}

function collectBlockTypes(state: unknown): string[] {
  const types: string[] = []
  walkBlockTypes(state, (type) => types.push(type))
  return types
}

interface SerializedLocation {
  detach(): SerializedNode
  preserveAsDraft: boolean
}

/**
 * Dá ids novos e rastreáveis a toda a árvore. Além de impedir colisão ao colar
 * a mesma cópia, os ids permitem identificar precisamente qual conexão o
 * desserializador recusou e soltar somente aquela subárvore como rascunho.
 */
function regenerateBlockIds(
  state: SerializedNode,
  workspace: Blockly.Workspace,
): Map<string, SerializedLocation> {
  const locations = new Map<string, SerializedLocation>()
  const assigned = new Set<string>()
  const freshId = (): string => {
    let id = Blockly.utils.idGenerator.genUid()
    while (assigned.has(id) || workspace.getBlockById(id)) id = Blockly.utils.idGenerator.genUid()
    assigned.add(id)
    return id
  }
  walkSerialized(state, (node, from) => {
    node.id = freshId()
    if (!from) return
    const { holder, slot } = from
    locations.set(node.id, {
      detach: () => {
        delete holder[slot]
        return node
      },
      preserveAsDraft: slot === 'block',
    })
  })
  return locations
}

function serializedBlockIds(state: SerializedNode): Set<string> {
  const ids = new Set<string>()
  walkSerialized(state, (node) => {
    if (node.id) ids.add(node.id)
  })
  return ids
}

function removePartialAppend(workspace: Blockly.Workspace, ids: ReadonlySet<string>): void {
  const created = [...ids]
    .map((id) => workspace.getBlockById(id))
    .filter((block): block is Blockly.Block => Boolean(block))
  const createdSet = new Set(created)
  const roots = created.filter((block) => {
    const parent = block.getParent()
    return !parent || !createdSet.has(parent)
  })
  for (const block of roots) block.dispose(false)
}

function failedConnectionBlockId(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error)
  return message.match(/block \(id="([^"]+)"\) could not connect/u)?.[1] ?? null
}

interface PreparedPaste {
  states: SerializedNode[]
  salvaged: boolean
}

/**
 * Preserva a árvore exata no caminho normal. Se uma versão nova tornar uma
 * conexão interna incompatível, solta apenas a subárvore recusada e tenta de
 * novo; blocos autorais viram rascunho, enquanto sombras inválidas são apenas
 * descartadas por serem valores padrão do bloco pai.
 */
function appendWithDraftSalvage(
  state: SerializedNode,
  workspace: Blockly.Workspace,
  locations: ReadonlyMap<string, SerializedLocation>,
): PreparedPaste {
  const ids = serializedBlockIds(state)
  const recordUndo = Blockly.Events.getRecordUndo()
  const eventGroup = Blockly.Events.getGroup()
  let appended: Blockly.BlockSvg | undefined
  let appendError: unknown
  try {
    appended = Blockly.serialization.blocks.append(
      state as Blockly.serialization.blocks.State,
      workspace,
    ) as Blockly.BlockSvg
  } catch (error) {
    appendError = error
  } finally {
    // O Blockly 12 restaura estes estados no caminho feliz, mas não quando a
    // desserialização lança por conexão incompatível. Sem esta fronteira, uma
    // edição posterior pode entrar no grupo errado ou perder o histórico de
    // desfazer do Studio inteiro.
    Blockly.Events.setGroup(eventGroup)
    Blockly.Events.setRecordUndo(recordUndo)
  }
  if (appended) return { states: [state], salvaged: false }

  removePartialAppend(workspace, ids)
  const failedId = failedConnectionBlockId(appendError)
  const location = failedId ? locations.get(failedId) : undefined
  if (!location) throw appendError

  const detached = location.detach()
  const parentResult = appendWithDraftSalvage(state, workspace, locations)
  if (!location.preserveAsDraft) return { ...parentResult, salvaged: true }
  const draftResult = appendWithDraftSalvage(detached, workspace, locations)
  return {
    states: [...parentResult.states, ...draftResult.states],
    salvaged: true,
  }
}

/**
 * Faz a desserialização potencialmente falha num workspace descartável. Assim,
 * uma árvore antiga nunca deixa blocos parciais nem eventos pendentes no
 * workspace real; somente os estados já compatíveis chegam à etapa de colagem.
 */
function preparePaste(
  state: SerializedNode,
  workspace: Blockly.WorkspaceSvg,
  locations: ReadonlyMap<string, SerializedLocation>,
): PreparedPaste {
  const scratch = new Blockly.Workspace(workspace.options)
  Blockly.Events.disable()
  try {
    return appendWithDraftSalvage(state, scratch, locations)
  } finally {
    scratch.dispose()
    Blockly.Events.enable()
  }
}

// ---------------------------------------------------------------------------
// localStorage (defensivo: modo privado/contexto restrito pode lançar)
// ---------------------------------------------------------------------------

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/** Serializa o bloco (+ filhos + cadeia abaixo) e grava na área de transferência. */
export function copyBlockToClipboard(block: Blockly.Block, sourceTitle?: string): boolean {
  const ls = safeLocalStorage()
  if (!ls) return false
  try {
    // Padrão de `save`: addInputBlocks + addNextBlocks = true, addCoordinates = false
    // (sem x/y — quem posiciona é o colar, no viewport do projeto destino).
    // Em objetos comuns: o `save` do Blockly devolve objetos sem protótipo, e o `JSON.stringify`
    // do V8 só os lê com recursão (uma cauda longa estourava a pilha e a cópia sumia calada).
    const raw = Blockly.serialization.blocks.save(block)
    if (!raw) return false
    const saved = jsonPlainCopy(raw) as typeof raw
    const payload: BlockClipboardPayload = {
      version: CLIPBOARD_VERSION,
      block: saved,
      requiredExtensions: requiredExtensionsForBlockState(saved),
      copiedAt: Date.now(),
      sourceTitle,
    }
    ls.setItem(CLIPBOARD_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

/** Lê + valida o payload da área de transferência (sync). `null` se vazio/ inválido. */
export function readClipboard(): BlockClipboardPayload | null {
  const ls = safeLocalStorage()
  if (!ls) return null
  try {
    const raw = ls.getItem(CLIPBOARD_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BlockClipboardPayload>
    if (
      !parsed ||
      parsed.version !== CLIPBOARD_VERSION ||
      !parsed.block ||
      typeof parsed.block !== 'object'
    ) {
      return null
    }
    return {
      version: CLIPBOARD_VERSION,
      block: parsed.block,
      requiredExtensions: Array.isArray(parsed.requiredExtensions)
        ? parsed.requiredExtensions
        : requiredExtensionsForBlockState(parsed.block),
      copiedAt: typeof parsed.copiedAt === 'number' ? parsed.copiedAt : 0,
      sourceTitle: typeof parsed.sourceTitle === 'string' ? parsed.sourceTitle : undefined,
    }
  } catch {
    return null
  }
}

/** Há algo colável? (lido pela precondição do item "Colar blocos".) */
export function hasClipboard(): boolean {
  return readClipboard() !== null
}

// ---------------------------------------------------------------------------
// Ponte por instância (WeakMap workspace → handlers)
// ---------------------------------------------------------------------------

const pasteTargets = new WeakMap<Blockly.Workspace, PasteTargetHandlers>()

export function registerPasteTarget(
  workspace: Blockly.Workspace,
  handlers: PasteTargetHandlers,
): void {
  pasteTargets.set(workspace, handlers)
}

export function unregisterPasteTarget(workspace: Blockly.Workspace): void {
  pasteTargets.delete(workspace)
}

function handlersFor(workspace: Blockly.Workspace | null | undefined): PasteTargetHandlers | null {
  return workspace ? (pasteTargets.get(workspace) ?? null) : null
}

/**
 * Um aviso no canto do editor (o mesmo do copiar/colar), em vez do `window.alert` que trava a
 * página. Devolve `false` quando este workspace não tem onde avisar.
 */
export function notifyWorkspace(workspace: Blockly.Workspace, message: string): boolean {
  const handlers = handlersFor(workspace)
  if (!handlers) return false
  handlers.notify(message)
  return true
}

// ---------------------------------------------------------------------------
// Ações dos itens de menu (chamadas pelo setup.ts)
// ---------------------------------------------------------------------------

/** "Copiar blocos" (menu do BLOCO): grava a subárvore e avisa. */
export function runCopyBlocks(block: Blockly.BlockSvg): void {
  const ok = copyBlockToClipboard(block)
  handlersFor(block.workspace)?.notify(
    ok
      ? 'Blocos copiados! Você pode colar em outro projeto.'
      : 'Não consegui copiar os blocos agora.',
  )
}

/** "Colar blocos" (menu do CANVAS): ativa extensões que faltam, valida e cola como rascunho. */
export function runPasteBlocks(workspace: Blockly.WorkspaceSvg): void {
  const payload = readClipboard()
  if (!payload) return
  const handlers = handlersFor(workspace)

  // 1. Ativa as extensões necessárias que faltam (auto-instalar, com aviso).
  if (handlers) {
    const installed = new Set(handlers.getInstalledExtensions().map((e) => e.id))
    const installedNow: string[] = []
    for (const id of payload.requiredExtensions) {
      if (installed.has(id)) continue
      if (handlers.installExtensionById(id)) installedNow.push(id)
    }
    if (installedNow.length > 0) {
      const names = installedNow.map((id) => EXTENSION_LABELS[id] ?? id).join(', ')
      handlers.notify(`Liguei ${names} neste projeto para os blocos colados funcionarem.`)
    }
  }

  // 2. Recusa se algum bloco ainda for desconhecido AQUI (nunca cola bloco quebrado —
  //    evita o caminho all-or-nothing do `sanitizeImportedBlocksState` no próximo load).
  const unknown = collectBlockTypes(payload.block).filter((type) =>
    handlers ? !handlers.isBlockTypeKnown(type) : !Blockly.Blocks[type],
  )
  if (unknown.length > 0) {
    handlers?.notify(
      'Não consegui colar: estes blocos são de uma extensão que este projeto não tem.',
    )
    return
  }

  // 3. Cola como rascunho (append NÃO limpa o workspace) e posiciona num ponto visível.
  //    Como o bloco entra SOLTO (fora dos frames), a saída do projeto não muda até a
  //    criança arrastá-lo para dentro de uma área. Ids regenerados fazem a mesma cópia
  //    colar várias vezes sem colisão. Se uma conexão interna envelheceu, somente o
  //    ramo incompatível é preservado como um segundo rascunho top-level.
  // `structuredClone` também recursa no V8; o payload já é JSON.
  const blockState = jsonPlainCopy(payload.block) as SerializedNode
  const locations = regenerateBlockIds(blockState, workspace)
  try {
    const prepared = preparePaste(blockState, workspace, locations)
    const roots = prepared.states.map(
      (state) =>
        Blockly.serialization.blocks.append(
          state as Blockly.serialization.blocks.State,
          workspace,
        ) as Blockly.BlockSvg,
    )
    roots.forEach((block, index) => {
      positionPastedBlock(workspace, block)
      if (index > 0) block.moveBy(index * 32, index * 32)
    })
    handlers?.notify(
      prepared.salvaged
        ? 'Blocos colados! Uma conexão incompatível foi preservada como rascunho.'
        : 'Blocos colados! Arraste-os para a Área do projeto compatível para usá-los.',
    )
  } catch (error) {
    console.warn('Não foi possível recriar os blocos copiados no workspace.', error)
    handlers?.notify('Não consegui colar os blocos agora.')
  }
}

/** Leva o bloco recém-colado para o canto superior-esquerdo VISÍVEL (com um respiro). */
function positionPastedBlock(workspace: Blockly.WorkspaceSvg, block: Blockly.BlockSvg): void {
  try {
    const view = workspace.getMetricsManager?.()?.getViewMetrics?.(true)
    if (!view || typeof block.getRelativeToSurfaceXY !== 'function') return
    const targetX = view.left + 40
    const targetY = view.top + 40
    const current = block.getRelativeToSurfaceXY()
    block.moveBy(targetX - current.x, targetY - current.y)
  } catch {
    // Sem métricas (ou workspace descartado): mantém a posição padrão do append.
  }
}
