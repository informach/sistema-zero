import * as Blockly from 'blockly/core'

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
  type?: string
  inputs?: Record<string, { block?: SerializedNode; shadow?: SerializedNode }>
  next?: { block?: SerializedNode; shadow?: SerializedNode }
}

/** Visita o `type` de TODOS os blocos da subárvore (inputs.block/shadow + next.block/shadow). */
function walkBlockTypes(state: unknown, visit: (type: string) => void): void {
  const node = state as SerializedNode | null
  if (!node || typeof node !== 'object') return
  if (typeof node.type === 'string') visit(node.type)
  if (node.inputs) {
    for (const wrapper of Object.values(node.inputs)) {
      if (wrapper?.block) walkBlockTypes(wrapper.block, visit)
      if (wrapper?.shadow) walkBlockTypes(wrapper.shadow, visit)
    }
  }
  if (node.next) {
    if (node.next.block) walkBlockTypes(node.next.block, visit)
    if (node.next.shadow) walkBlockTypes(node.next.shadow, visit)
  }
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

/**
 * Remove (em profundidade) o `id` de cada bloco da subárvore. Sem isto, colar a
 * MESMA cópia duas vezes reusa os ids salvos e colide no workspace destino; sem
 * `id`, o Blockly gera ids novos no `append`.
 */
function stripBlockIds(state: unknown): void {
  if (!state || typeof state !== 'object') return
  const node = state as SerializedNode & { id?: string }
  node.id = undefined
  if (node.inputs) {
    for (const wrapper of Object.values(node.inputs)) {
      if (wrapper?.block) stripBlockIds(wrapper.block)
      if (wrapper?.shadow) stripBlockIds(wrapper.shadow)
    }
  }
  if (node.next) {
    if (node.next.block) stripBlockIds(node.next.block)
    if (node.next.shadow) stripBlockIds(node.next.shadow)
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
    const saved = Blockly.serialization.blocks.save(block)
    if (!saved) return false
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
  //    criança arrastá-lo para dentro de uma área. Ids removidos → colar a mesma cópia
  //    várias vezes não colide (o Blockly atribui ids novos).
  stripBlockIds(payload.block)
  try {
    const appended = Blockly.serialization.blocks.append(
      payload.block,
      workspace,
    ) as Blockly.BlockSvg
    positionPastedBlock(workspace, appended)
    handlers?.notify('Blocos colados! Arraste-os para a Área do projeto compatível para usá-los.')
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
