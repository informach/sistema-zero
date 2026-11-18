import * as Blockly from 'blockly/core'

/**
 * Montagem sob demanda no Clássico JavaScript (etapa 2 da evolução do Estúdio, 18/11/2026).
 *
 * Num projeto muito grande o custo de arrastar e rolar não é JavaScript: é a quantidade de nós de
 * SVG que o navegador pinta (medido em `docs/estudio-evolucao/classico-em-escala.md`). Aqui o
 * CORPO dos blocos que estão longe da vista sai da página e volta quando a vista chega perto.
 *
 * O que NÃO muda: o modelo do Blockly fica inteiro (ids, conexões, seleção, histórico, o estado
 * gravado e o código gerado são os mesmos, com ou sem isto). Só o desenho do corpo sai do DOM; o
 * bloco de fora continua desenhado, do mesmo tamanho, então nada muda de lugar.
 *
 * Só liga a partir de `OFFSCREEN_BODIES_MIN_BLOCKS`. Os jogos dos cursos têm de 70 a 80 blocos:
 * neles isto nunca roda, e o robô das aulas continua achando todo bloco pelo texto na tela.
 */
export const OFFSCREEN_BODIES_MIN_BLOCKS = 1500

/** Quantas alturas de tela, acima e abaixo da vista, continuam montadas. */
const MARGIN_IN_VIEWS = 1

/** Classe do bloco de fora que está longe; a regra mora em `styles/studio.css`. */
export const FAR_CLASS = 'sz-block-far'
const NEXT_ATTRIBUTE = 'data-sz-block-next'

interface Detached {
  svg: SVGGElement
}

export interface OffscreenBodies {
  /** Confere o que está longe e o que voltou para perto. Barato: uma conta por bloco de fora. */
  sync(): void
  /** Devolve à página o corpo que contém este bloco (antes de rolar até ele ou de mexer nele). */
  reveal(blockId: string): void
  /** Devolve tudo (antes de descartar o canvas ou de recarregar os blocos). */
  restoreAll(): void
  /** Para os testes e para a medição: quantos corpos estão fora da página agora. */
  detachedCount(): number
  dispose(): void
}

function isStatementInput(input: Blockly.Input): boolean {
  return input.type === Blockly.inputs.inputTypes.STATEMENT
}

function isArea(block: Blockly.Block): boolean {
  return block.type.startsWith('sz_frame_')
}

export function createOffscreenBodies(
  workspace: Blockly.WorkspaceSvg,
  options: { minBlocks?: number; onChange?: (detached: number) => void } = {},
): OffscreenBodies {
  const minBlocks = options.minBlocks ?? OFFSCREEN_BODIES_MIN_BLOCKS
  const detached = new Map<string, Detached>()
  let disposed = false
  let scheduled = false

  function attach(id: string): void {
    const item = detached.get(id)
    if (!item) return
    detached.delete(id)
    const block = workspace.getBlockById(id) as Blockly.BlockSvg | null
    // Desfazer pode recriar o mesmo id com outro desenho; o desenho antigo não volta.
    if (!block || block.getSvgRoot() !== item.svg || item.svg.parentNode) return
    const parent = block.getParent() as Blockly.BlockSvg | null
    ;(parent?.getSvgRoot() ?? workspace.getCanvas()).appendChild(item.svg)
  }

  function restoreAll(): void {
    for (const id of [...detached.keys()]) attach(id)
    for (const block of far.keys()) clearFar(block)
    far.clear()
  }

  // O bloco de fora que está longe também deixa de ser pintado. O SVG do bloco seguinte mora
  // DENTRO do dele, então não dá para tirar o bloco da página: uma classe esconde o desenho
  // próprio (contorno, campos, valores encaixados) e poupa só o bloco seguinte, marcado.
  const far = new Map<Blockly.BlockSvg, SVGElement | null>()
  function clearFar(block: Blockly.BlockSvg): void {
    const svg = block.getSvgRoot()
    svg?.classList.remove(FAR_CLASS)
    for (const child of svg?.children ?? []) child.removeAttribute(NEXT_ATTRIBUTE)
  }
  function setFar(block: Blockly.BlockSvg, isFar: boolean): void {
    if (!isFar) {
      if (far.delete(block)) clearFar(block)
      return
    }
    const svg = block.getSvgRoot()
    const next = (block.getNextBlock() as Blockly.BlockSvg | null)?.getSvgRoot() ?? null
    // Já está longe e o seguinte é o mesmo: nada a fazer (é o caso de quase todos, a cada rolagem).
    if (far.get(block) === next && far.has(block)) return
    for (const child of svg.children) {
      if (child === next) child.setAttribute(NEXT_ATTRIBUTE, '')
      else child.removeAttribute(NEXT_ATTRIBUTE)
    }
    svg.classList.add(FAR_CLASS)
    far.set(block, next)
  }

  function reveal(blockId: string): void {
    if (detached.size === 0 && far.size === 0) return
    for (
      let block: Blockly.Block | null = workspace.getBlockById(blockId);
      block;
      block = block.getParent()
    ) {
      if (detached.has(block.id)) attach(block.id)
      if (far.delete(block as Blockly.BlockSvg)) clearFar(block as Blockly.BlockSvg)
    }
  }

  /** Um bloco de fora (filho direto de uma área, ou de uma pilha solta) e onde ele está. */
  function visitChain(
    first: Blockly.BlockSvg | null,
    y: number,
    top: number,
    bottom: number,
  ): void {
    let blockY = y
    for (let block = first; block; block = block.getNextBlock() as Blockly.BlockSvg | null) {
      if (block !== first) {
        blockY += block.relativeCoords.y
      }
      const near = blockY + block.height >= top && blockY <= bottom
      setFar(block, !near)
      for (const input of block.inputList) {
        if (!isStatementInput(input)) continue
        const body = input.connection?.targetBlock() as Blockly.BlockSvg | null | undefined
        if (!body) continue
        if (near) {
          attach(body.id)
          continue
        }
        if (detached.has(body.id)) continue
        const svg = body.getSvgRoot()
        if (!svg?.parentNode) continue
        detached.set(body.id, { svg })
        svg.remove()
      }
    }
  }

  function syncPass(): void {
    scheduled = false
    if (disposed) return
    // Corpos de blocos que já não existem (apagados, canvas recarregado) saem da conta.
    for (const [id, item] of detached) {
      const block = workspace.getBlockById(id) as Blockly.BlockSvg | null
      if (!block || block.getSvgRoot() !== item.svg) detached.delete(id)
    }
    for (const block of far.keys()) if (block.disposed) far.delete(block)
    if (workspace.isDragging() || workspace.getAllBlocks(false).length < minBlocks) {
      // Projeto que encolheu abaixo do limiar volta inteiro; no meio de um arrasto nada sai.
      if (!workspace.isDragging()) restoreAll()
      return
    }
    const view = workspace.getMetricsManager().getViewMetrics(true)
    const margin = view.height * MARGIN_IN_VIEWS
    const top = view.top - margin
    const bottom = view.top + view.height + margin
    for (const root of workspace.getTopBlocks(false) as Blockly.BlockSvg[]) {
      const origin = root.getRelativeToSurfaceXY()
      if (!isArea(root)) {
        visitChain(root, origin.y, top, bottom)
        continue
      }
      for (const input of root.inputList) {
        if (!isStatementInput(input)) continue
        const first = input.connection?.targetBlock() as Blockly.BlockSvg | null | undefined
        if (!first) continue
        visitChain(first, origin.y + first.relativeCoords.y, top, bottom)
      }
    }
  }

  let published = 0
  function syncNow(): void {
    syncPass()
    if (disposed || detached.size === published) return
    published = detached.size
    options.onChange?.(published)
  }

  function sync(): void {
    if (scheduled || disposed) return
    scheduled = true
    // Depois de o Blockly desenhar o que está na fila: as alturas e posições já são as finais.
    void Blockly.renderManagement.finishQueuedRenders().then(syncNow)
  }

  const listener = (event: Blockly.Events.Abstract) => {
    // Uma mudança de verdade dentro de um corpo fora da página (desfazer, a Ponte): ele volta
    // antes de qualquer outra coisa, para o Blockly redesenhar com o desenho no lugar.
    const blockId = (event as { blockId?: string }).blockId
    if (!event.isUiEvent && blockId) reveal(blockId)
    if (event.type === Blockly.Events.VIEWPORT_CHANGE || !event.isUiEvent) sync()
    else if (event.type === Blockly.Events.BLOCK_DRAG) sync()
  }
  workspace.addChangeListener(listener)

  // Rolar até um bloco (Mostrar o bloco, cursor do código, chip do Zappy) passa por aqui: o corpo
  // volta antes de o Blockly medir onde o bloco está.
  const originalCenter = workspace.centerOnBlock.bind(workspace)
  workspace.centerOnBlock = (id: string | null, animate?: boolean) => {
    if (id) reveal(id)
    originalCenter(id, animate)
  }
  // Desfazer e refazer mexem em blocos que podem estar fora da página.
  const originalUndo = workspace.undo.bind(workspace)
  workspace.undo = (redo: boolean) => {
    const stack = redo ? workspace.getRedoStack() : workspace.getUndoStack()
    const last = stack[stack.length - 1] as { blockId?: string; group?: string } | undefined
    if (last) {
      for (let i = stack.length - 1; i >= 0; i--) {
        const event = stack[i] as { blockId?: string; group?: string }
        if (event.group !== last.group) break
        if (event.blockId) reveal(event.blockId)
        if (!last.group) break
      }
    }
    originalUndo(redo)
    sync()
  }

  return {
    sync,
    reveal,
    restoreAll,
    detachedCount: () => detached.size,
    dispose() {
      disposed = true
      workspace.removeChangeListener(listener)
      restoreAll()
    },
  }
}
