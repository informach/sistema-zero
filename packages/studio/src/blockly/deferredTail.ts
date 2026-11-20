import * as Blockly from 'blockly/core'
import {
  BLOCKS_FROM_TOP_PADDING,
  type DeferredDrawing,
  OFFSCREEN_BODIES_MIN_BLOCKS,
  trackDeferredDrawing,
} from './offscreenThreshold'

/**
 * Abertura do Clássico sem desenhar a cauda distante (etapa 3 da evolução do Estúdio, 20/11/2026).
 *
 * Num projeto com milhares de blocos, abrir custava quase tudo em DESENHAR: medir o texto de cada
 * campo (`getComputedStyle`, que encarece com o tamanho da página), o layout e o SVG de blocos que
 * a criança nem está vendo (`docs/estudio-evolucao/classico-em-escala.md`). Aqui todos os blocos
 * continuam CRIADOS (o modelo fica inteiro: gravar, gerar o código, desfazer e copiar leem os
 * blocos vivos do workspace), mas a cauda de cada área longe da vista não é desenhada na abertura.
 *
 * Como:
 * 1. Antes do `load`, só com `OFFSCREEN_BODIES_MIN_BLOCKS` ou mais, o plano (`planDeferredTail`)
 *    estima pelo JSON onde cada unidade (filho direto de uma área `sz_frame_*`, na cadeia `next`)
 *    vai cair e escolhe, por área, a primeira que passa de uma tela abaixo da vista inicial.
 * 2. Na carga, quando essa unidade termina de nascer (`initSvg`, depois dos filhos e da cadeia
 *    seguinte), ela e tudo o que vem depois saem da página antes do primeiro desenho (a árvore da
 *    área ainda nem entrou na página), cada unidade num pedaço solto (`deferChain`). Esses blocos
 *    entram no conjunto dos adiados deste workspace.
 * 3. Bloco adiado não é desenhado, não põe conexão no banco de conexões (nada encaixa num bloco
 *    invisível), não empurra vizinhos e, para quem está acima, fecha a conta da altura na borda
 *    do último desenhado.
 * 4. Quando a vista chega perto do fim do que foi desenhado, a próxima unidade volta à página e é
 *    desenhada, sempre de cima para baixo: a unidade k+1 nunca antes da k, então tudo o que está
 *    acima de algo à vista tem a geometria exata.
 * 5. Antes de algo precisar da posição de um bloco adiado ("Mostrar o bloco", o cursor do código,
 *    o chip do Zappy, desfazer e refazer, desencaixá-lo, organizar, a foto dos blocos), a cauda é
 *    desenhada até ele. Arrastar uma pilha que leva a cauda não a desenha: a conexão de baixo dela
 *    fica longe durante o gesto (`parkStackBottom`).
 *
 * Nunca nas aulas: os jogos dos cursos têm de 70 a 80 blocos e este módulo nem é carregado ali.
 *
 * WORKAROUND (Blockly 12.5.1): o Blockly não tem ponto de extensão para desenhar só parte de um
 * workspace (o desenho, o banco de conexões e o empurrão de vizinhos andam a árvore inteira de
 * cada bloco raiz). As adaptações em `BlockSvg.prototype` abaixo consultam o conjunto POR
 * WORKSPACE e não mudam nada em workspace sem abertura adiada (flyout, Python, projetos menores).
 * O que elas supõem do Blockly instalado está preso em `deferredTail.test.ts` (guarda de
 * atualização): uma versão nova que mude esses trechos reprova o teste antes de chegar à criança.
 */

/** Quantas alturas de tela, abaixo da vista, ficam desenhadas (a mesma folga do `offscreenBodies`). */
const MARGIN_IN_VIEWS = 1
/** Estimativas do plano (só decidem ONDE começa a cauda; o desenho mede de verdade). */
const AREA_HEADER_ESTIMATE = 64
const BLOCK_HEIGHT_ESTIMATE = 40
/** Tempo de desenho por tarefa ao rolar; o resto continua no quadro seguinte. */
const FILL_BUDGET_MS = 24
/** Onde fica, durante um arrasto, a conexão de baixo de uma pilha que termina sem desenho. */
const PARKED_CONNECTION = 1e9

/** A vista em que o projeto vai abrir, em unidades do workspace. */
export interface OpeningView {
  top: number
  height: number
}

type Json = Record<string, unknown>

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Os blocos que o Blockly cria a partir deste estado: o encaixado, ou a sombra quando não há. */
function childStates(block: Json, withNext: boolean): Json[] {
  const children: Json[] = []
  if (isRecord(block.inputs))
    for (const input of Object.values(block.inputs)) {
      if (!isRecord(input)) continue
      if (isRecord(input.block)) children.push(input.block)
      else if (isRecord(input.shadow)) children.push(input.shadow)
    }
  if (withNext && isRecord(block.next) && isRecord(block.next.block))
    children.push(block.next.block)
  return children
}

/** Quantos blocos o Blockly criaria (a mesma conta do `getAllBlocks(false)`), até `limit`. */
function countStates(roots: Json[], limit: number): number {
  let count = 0
  const stack = [...roots]
  for (let block = stack.pop(); block && count < limit; block = stack.pop()) {
    count++
    stack.push(...childStates(block, true))
  }
  return count
}

function topStates(state: unknown): Json[] {
  if (!isRecord(state) || !isRecord(state.blocks) || !Array.isArray(state.blocks.blocks)) return []
  return state.blocks.blocks.filter(isRecord)
}

/** Quantos blocos o Blockly cria a partir deste estado de workspace (o mesmo que `getAllBlocks`). */
export function countBlocksInState(state: unknown): number {
  return countStates(topStates(state), Number.POSITIVE_INFINITY)
}

function nextState(block: Json): Json | undefined {
  return isRecord(block.next) && isRecord(block.next.block) ? block.next.block : undefined
}

function areaChildren(top: Json): Json | undefined {
  if (typeof top.type !== 'string' || !top.type.startsWith('sz_frame_')) return undefined
  const children = isRecord(top.inputs) ? top.inputs.CHILDREN : undefined
  return isRecord(children) && isRecord(children.block) ? children.block : undefined
}

/** O plano de uma carga: o estado a carregar e os ids das unidades onde cada cauda começa. */
export interface DeferredTailPlan {
  state: unknown
  boundaries: string[]
}

/**
 * Dá à unidade `chain[chain.length - 1]` o id `id`, numa cópia rasa do caminho da área até ela: o
 * estado de quem chamou não muda. Sem id no estado o Blockly sortearia um ao carregar; aqui ele é
 * sorteado antes, para a carga reconhecer a unidade.
 */
function withUnitId(area: Json, chain: Json[], id: string): Json {
  let copy: Json = { ...chain[chain.length - 1], id }
  for (let i = chain.length - 2; i >= 0; i--) {
    const unit = chain[i]
    if (!unit || !isRecord(unit.next)) throw new Error('A cadeia da área mudou durante o plano.')
    copy = { ...unit, next: { ...unit.next, block: copy } }
  }
  const inputs = isRecord(area.inputs) ? area.inputs : {}
  const children = isRecord(inputs.CHILDREN) ? inputs.CHILDREN : {}
  return { ...area, inputs: { ...inputs, CHILDREN: { ...children, block: copy } } }
}

/**
 * Onde começa a cauda adiada de cada área que passa da vista. `null` abaixo de `minBlocks` (o
 * caminho de sempre) ou quando tudo cabe perto da vista.
 */
export function planDeferredTail(
  state: unknown,
  view: OpeningView,
  minBlocks: number = OFFSCREEN_BODIES_MIN_BLOCKS,
  newId: () => string = Blockly.utils.idGenerator.genUid,
): DeferredTailPlan | null {
  const tops = topStates(state)
  if (!isRecord(state) || !isRecord(state.blocks)) return null
  if (countStates(tops, minBlocks) < minBlocks) return null
  const limit = view.top + view.height * (1 + MARGIN_IN_VIEWS)
  const boundaries: string[] = []
  let planned = tops
  for (const [index, top] of tops.entries()) {
    let cursor = (typeof top.y === 'number' ? top.y : 0) + AREA_HEADER_ESTIMATE
    const chain: Json[] = []
    for (let unit = areaChildren(top); unit; unit = nextState(unit)) {
      chain.push(unit)
      if (cursor <= limit) {
        cursor +=
          (1 + countStates(childStates(unit, false), Number.POSITIVE_INFINITY)) *
          BLOCK_HEIGHT_ESTIMATE
        continue
      }
      if (typeof unit.id === 'string') boundaries.push(unit.id)
      else {
        const id = newId()
        if (planned === tops) planned = [...tops]
        planned[index] = withUnitId(top, chain, id)
        boundaries.push(id)
      }
      break
    }
  }
  if (boundaries.length === 0) return null
  return {
    state: planned === tops ? state : { ...state, blocks: { ...state.blocks, blocks: planned } },
    boundaries,
  }
}

/**
 * A vista da primeira abertura: `showBlocksFromTop` rola até o alto do conteúdo ficar a
 * `BLOCKS_FROM_TOP_PADDING` do topo, com o zoom da injeção.
 */
export function openingViewFor(state: unknown, viewHeightPx: number, scale: number): OpeningView {
  let contentTop = Number.POSITIVE_INFINITY
  for (const top of topStates(state))
    if (typeof top.y === 'number' && top.y < contentTop) contentTop = top.y
  if (!Number.isFinite(contentTop)) contentTop = 0
  return { top: contentTop - BLOCKS_FROM_TOP_PADDING / scale, height: viewHeightPx / scale }
}

type Block = Blockly.BlockSvg

const tails = new WeakMap<Blockly.Workspace, DeferredTail>()

/** O bloco está adiado (fora da página, sem desenho)? Para o `offscreenBodies` não tocar nele. */
export function isDeferredBlock(block: Block): boolean {
  return tails.get(block.workspace)?.deferred.has(block) ?? false
}

class DeferredTail implements DeferredDrawing {
  readonly deferred = new Set<Block>()
  /** A primeira unidade adiada de cada cadeia: o pai dela está desenhado (ou ela é raiz). */
  readonly boundaries = new Set<Block>()
  /** Durante a carga: os ids das unidades onde a cauda começa. */
  loading: Set<string> | null = null
  private disposed = false
  private fillScheduled = false
  private published = -1
  private readonly listener: (event: Blockly.Events.Abstract) => void
  private readonly resizeObserver: ResizeObserver | null
  private readonly originalCenter: Blockly.WorkspaceSvg['centerOnBlock']
  private readonly centerOnBlock: Blockly.WorkspaceSvg['centerOnBlock']
  private readonly originalUndo: Blockly.WorkspaceSvg['undo']
  private readonly undo: Blockly.WorkspaceSvg['undo']

  constructor(readonly workspace: Blockly.WorkspaceSvg) {
    this.listener = (event) => {
      if (this.boundaries.size === 0) return
      // Rolar, dar zoom, apagar ou mover blocos e soltar um arrasto mudam o que precisa de desenho.
      if (
        event.type === Blockly.Events.VIEWPORT_CHANGE ||
        !event.isUiEvent ||
        event.type === Blockly.Events.BLOCK_DRAG
      )
        this.scheduleFill()
    }
    workspace.addChangeListener(this.listener)
    // O painel que cresce (aba que aparece, divisória arrastada) mostra mais sem rolar.
    const host = workspace.getInjectionDiv()
    this.resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.scheduleFill()) : null
    this.resizeObserver?.observe(host)

    // "Mostrar o bloco", o cursor do código e o chip do Zappy rolam por aqui: a cauda é desenhada
    // até o bloco antes de o Blockly medir onde ele está.
    const tail = this
    this.originalCenter = workspace.centerOnBlock
    this.centerOnBlock = function (this: Blockly.WorkspaceSvg, id, blockOnly) {
      const block = id ? this.getBlockById(id) : null
      if (block) tail.drawThrough(block)
      tail.originalCenter.call(this, id, blockOnly)
    }
    workspace.centerOnBlock = this.centerOnBlock
    // Desfazer e refazer podem mexer num bloco ainda não desenhado: ele é desenhado antes.
    this.originalUndo = workspace.undo
    this.undo = function (this: Blockly.WorkspaceSvg, redo) {
      tail.drawUndoTargets(redo)
      tail.originalUndo.call(this, redo)
    }
    workspace.undo = this.undo
    trackDeferredDrawing(workspace, this)
  }

  /**
   * Na carga: a unidade `head` e tudo o que vem depois dela saem da página antes do desenho.
   *
   * Cada unidade vira um pedaço solto, cortado de baixo para cima. Tirar um nó do DOM custa o
   * tamanho do que está dentro dele (o Blink avisa cada descendente, conectado ou não): com a cauda
   * inteira aninhada na fronteira, desenhar a unidade k+1 e tirar dela a k+2 custava a cauda toda,
   * a cada unidade (medido: 600 unidades levavam 5,5 s, 3,8 s só em `remove`). Cortando de baixo
   * para cima, cada corte leva só a própria unidade.
   */
  deferChain(head: Block): void {
    const parent = head.getParent()
    if (!parent || this.deferred.has(parent)) return
    for (const block of head.getDescendants(false)) this.deferred.add(block)
    this.boundaries.add(head)
    const units: Block[] = []
    for (let unit: Block | null = head; unit; unit = unit.getNextBlock()) units.push(unit)
    for (let i = units.length - 1; i >= 0; i--) units[i]?.getSvgRoot().remove()
  }

  /** Um bloco desenhado foi encaixado dentro da parte adiada: some com ela, sem conexões vivas. */
  deferSubtree(block: Block): void {
    block.setConnectionTracking(false)
    for (const child of block.getDescendants(false)) this.deferred.add(child)
  }

  /**
   * Desenha a unidade adiada `unit` (o pai dela já está desenhado) e devolve a próxima adiada da
   * mesma cadeia. O resto da cauda continua fora da página: cada unidade adiada é um pedaço solto
   * (`deferChain`), e só uma que o Blockly tenha aninhado de novo precisa sair.
   */
  private drawUnit(unit: Block): Block | null {
    const next = unit.getNextBlock()
    const nextDeferred = next && this.deferred.has(next) ? next : null
    if (nextDeferred) {
      if (nextDeferred.getSvgRoot().parentNode) nextDeferred.getSvgRoot().remove()
      this.boundaries.add(nextDeferred)
    }
    this.boundaries.delete(unit)
    const parent = unit.getParent()
    ;(parent ? parent.getSvgRoot() : this.workspace.getCanvas()).appendChild(unit.getSvgRoot())
    this.renderSubtree(unit, next)
    // O pai encaixou a unidade quando ela ainda não tinha desenho (conexão de cima em 0,0): com a
    // medida de verdade, ele a encaixa de novo, como o Blockly faz ao desenhar o pai depois do filho.
    parent?.tightenChildrenEfficiently()
    return nextDeferred
  }

  /** Desenha de baixo para cima, como o `renderBlock` do Blockly: os filhos antes do pai. */
  private renderSubtree(block: Block, skip: Block | null): void {
    for (const child of block.getChildren(false))
      if (child !== skip) this.renderSubtree(child, null)
    this.deferred.delete(block)
    block.renderEfficiently()
  }

  /** A unidade onde começa a parte adiada que contém `block`. */
  private boundaryAbove(block: Block): Block {
    let unit = block
    for (
      let parent = unit.getParent();
      parent && this.deferred.has(parent);
      parent = unit.getParent()
    )
      unit = parent
    return unit
  }

  /**
   * Fecha um lote: cada raiz tocada se redesenha pelo próprio Blockly (a área cresce, as conexões
   * vão para o lugar, os vizinhos são empurrados como na abertura de sempre) e as unidades
   * desenhadas passam a valer para encaixe.
   */
  private settle(drawn: Map<Block, Block[]>): void {
    if (drawn.size === 0) return
    for (const root of drawn.keys()) if (!root.disposed) root.queueRender()
    Blockly.renderManagement.triggerQueuedRenders(this.workspace)
    for (const firsts of drawn.values())
      for (const first of firsts) if (!first.disposed) first.setConnectionTracking(true)
    this.publish()
  }

  /**
   * Um lote de desenho mede cada texto uma vez, como o `workspaces.load` do Blockly faz com estes
   * mesmos blocos na abertura de sempre (a memória de larguras dura a carga inteira). Sem isto,
   * cada campo pedia `getComputedStyle` no fundo da cadeia aninhada, e cada pedido custa a
   * profundidade: arrastar o primeiro evento de 2 mil blocos (a pilha leva a cauda inteira)
   * travava 3,8 s. A memória dura só o lote, que roda inteiro depois da fonte dos blocos chegar.
   */
  private measuringOnce<T>(draw: () => T): T {
    Blockly.utils.dom.startTextWidthCache()
    try {
      return draw()
    } finally {
      Blockly.utils.dom.stopTextWidthCache()
    }
  }

  /** Desenha, de cima para baixo, as unidades até `block` (adiado); devolve a primeira desenhada. */
  private drawUnitsThrough(block: Block): Block {
    const first = this.boundaryAbove(block)
    this.measuringOnce(() => {
      for (let unit: Block | null = first; unit && this.deferred.has(block); )
        unit = this.drawUnit(unit)
    })
    return first
  }

  /** Desenha, de cima para baixo, até `block` estar desenhado. Fora da parte adiada: nada. */
  drawThrough(block: Block): void {
    if (this.disposed || !this.deferred.has(block)) return
    const first = this.drawUnitsThrough(block)
    this.settle(new Map([[first.getRootBlock(), [first]]]))
  }

  /** Desenha a cadeia inteira a partir da unidade adiada `first`. */
  private drawChain(first: Block, drawn: Map<Block, Block[]>): void {
    this.measuringOnce(() => {
      for (let unit: Block | null = first; unit; ) unit = this.drawUnit(unit)
    })
    const root = first.getRootBlock()
    drawn.set(root, [...(drawn.get(root) ?? []), first])
  }

  /**
   * Antes de arrastar `block`. Da cauda que vai junto, o arrasto só consulta a conexão de baixo da
   * pilha (`lastConnectionInStack`, para encaixar a pilha em cima de outro bloco). Num bloco adiado
   * a posição dela é velha (perto da fronteira): ela vai para longe durante o arrasto, e nada
   * encaixa embaixo de uma pilha cujo fim a criança nem vê. O fim do arrasto redesenha a raiz e a
   * devolve ao lugar (fora do banco de conexões, como toda conexão adiada).
   *
   * Desenhar a cauda aqui era o caminho direto, e custava a abertura inteira no começo do gesto:
   * arrastar o primeiro evento de 5 mil blocos travava 8,3 s (a base, com tudo desenhado, 2,0 s).
   */
  parkStackBottom(block: Block): void {
    if (this.disposed || this.boundaries.size === 0) return
    const bottom = block.lastConnectionInStack(true)
    if (bottom && this.deferred.has(bottom.getSourceBlock()))
      bottom.moveTo(PARKED_CONNECTION, PARKED_CONNECTION)
  }

  /** O bloco adiado vai virar raiz (desencaixado): a unidade dele é desenhada antes. */
  drawBeforeUnplug(block: Block): void {
    if (this.disposed || !this.deferred.has(block)) return
    const first = this.drawUnitsThrough(block)
    // O redesenho da raiz e as conexões ficam para depois da troca de pai (o Blockly está no meio
    // de um desencaixe): o próprio desencaixe enfileira o desenho das duas pontas, e as conexões
    // entram no banco depois dele, já no lugar.
    requestAnimationFrame(() => {
      void Blockly.renderManagement.finishQueuedRenders().then(() => {
        if (!first.disposed) first.setConnectionTracking(true)
        this.publish()
      })
    })
  }

  private drawUndoTargets(redo: boolean): void {
    if (this.disposed || this.boundaries.size === 0) return
    const stack = redo ? this.workspace.getRedoStack() : this.workspace.getUndoStack()
    const last = stack[stack.length - 1]
    if (!last) return
    for (let i = stack.length - 1; i >= 0; i--) {
      const event = stack[i]
      if (!event || event.group !== last.group) break
      const ids =
        event instanceof Blockly.Events.BlockMove
          ? [event.blockId, event.oldParentId, event.newParentId]
          : event instanceof Blockly.Events.BlockBase
            ? [event.blockId]
            : []
      for (const id of ids) {
        const block = id ? this.workspace.getBlockById(id) : null
        if (block) this.drawThrough(block)
      }
      if (!last.group) break
    }
  }

  drawAll(): void {
    if (this.disposed) return
    const drawn = new Map<Block, Block[]>()
    for (const boundary of [...this.boundaries])
      if (this.boundaries.has(boundary) && !boundary.disposed) this.drawChain(boundary, drawn)
    this.settle(drawn)
  }

  scheduleFill(): void {
    if (this.fillScheduled || this.disposed) return
    this.fillScheduled = true
    // Depois do que o Blockly já tem na fila: as alturas e posições desenhadas são as finais.
    requestAnimationFrame(() => {
      void Blockly.renderManagement.finishQueuedRenders().then(() => this.fill())
    })
  }

  /** Desenha as unidades adiadas que chegaram perto da vista, dentro do tempo de uma tarefa. */
  private fill(): void {
    this.fillScheduled = false
    if (this.disposed) return
    for (const boundary of [...this.boundaries])
      if (boundary.disposed || !this.deferred.has(boundary)) this.boundaries.delete(boundary)
    if (this.boundaries.size === 0) {
      this.deferred.clear()
      this.publish()
      return
    }
    // No meio de um arrasto nada muda; o fim do arrasto chama de novo.
    if (this.workspace.isDragging()) return
    const view = this.workspace.getMetricsManager().getViewMetrics(true)
    const drawn = new Map<Block, Block[]>()
    const unfinished = this.measuringOnce(() => this.drawNearView(view, drawn))
    this.settle(drawn)
    if (unfinished) this.scheduleFill()
  }

  /** O lote da rolagem: as unidades que a vista alcança, até o tempo da tarefa. Sobrou algo? */
  private drawNearView(
    view: { top: number; left: number; width: number; height: number },
    drawn: Map<Block, Block[]>,
  ): boolean {
    const margin = view.height * MARGIN_IN_VIEWS
    const bottom = view.top + view.height + margin
    const left = view.left - view.width * MARGIN_IN_VIEWS
    const right = view.left + view.width + view.width * MARGIN_IN_VIEWS
    const deadline = performance.now() + FILL_BUDGET_MS
    let unfinished = false
    for (const boundary of [...this.boundaries]) {
      if (!this.boundaries.has(boundary)) continue
      const parent = boundary.getParent()
      if (!parent) {
        // Uma cadeia adiada que ficou solta precisa aparecer inteira onde está.
        this.drawChain(boundary, drawn)
        continue
      }
      const root = boundary.getRootBlock()
      const rootXY = root.getRelativeToSurfaceXY()
      if (rootXY.x > right || rootXY.x + root.width < left) continue
      // Onde a unidade adiada começa: o pai desenhado já a posicionou (`tightenChildrenEfficiently`).
      let top = parent.getRelativeToSurfaceXY().y + boundary.relativeCoords.y
      let unit: Block | null = boundary
      while (unit && top <= bottom) {
        if (performance.now() > deadline) {
          unfinished = true
          break
        }
        const next: Block | null = this.drawUnit(unit)
        if (next) top += next.relativeCoords.y
        unit = next
      }
      if (unit !== boundary) drawn.set(root, [...(drawn.get(root) ?? []), boundary])
      if (unfinished) break
    }
    return unfinished
  }

  /** Fim da carga: a contagem vai para a página e a vista confere o que falta perto dela. */
  loaded(): void {
    this.loading = null
    this.publish()
    this.scheduleFill()
  }

  /** À vista dos testes e da medição: quantos blocos ainda não foram desenhados. */
  private publish(): void {
    for (const block of this.deferred) if (block.disposed) this.deferred.delete(block)
    if (this.deferred.size === this.published) return
    this.published = this.deferred.size
    this.workspace.getInjectionDiv().dataset.szDeferredBlocks = String(this.published)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    trackDeferredDrawing(this.workspace, null)
    if (tails.get(this.workspace) === this) tails.delete(this.workspace)
    this.workspace.removeChangeListener(this.listener)
    this.resizeObserver?.disconnect()
    // Só devolve os métodos que ainda são nossos (outra integração pode ter embrulhado depois).
    if (this.workspace.centerOnBlock === this.centerOnBlock)
      this.workspace.centerOnBlock = this.originalCenter
    if (this.workspace.undo === this.undo) this.workspace.undo = this.originalUndo
    this.deferred.clear()
    this.boundaries.clear()
  }
}

let hooksInstalled = false

function tailOf(block: Block): DeferredTail | undefined {
  return tails.get(block.workspace)
}

/** As adaptações do Blockly (ver o WORKAROUND no topo). Uma vez por página; inertes sem cauda. */
function installHooks(): void {
  if (hooksInstalled) return
  hooksInstalled = true
  const proto = Blockly.BlockSvg.prototype
  const {
    bumpNeighbours,
    getHeightWidth,
    initSvg,
    renderEfficiently,
    select,
    setConnectionTracking,
    setParent,
    startDrag,
    updateComponentLocations,
  } = proto

  proto.initSvg = function (this: Block) {
    initSvg.call(this)
    const tail = tailOf(this)
    if (tail?.loading?.has(this.id)) tail.deferChain(this)
  }
  proto.renderEfficiently = function (this: Block) {
    if (tailOf(this)?.deferred.has(this)) return
    renderEfficiently.call(this)
  }
  // O adiado não tem lugar: o redesenho de quem está acima desce por todos os filhos e moveria as
  // conexões dele. Uma conexão criada depois da carga (um espaço novo do mutador de argumentos)
  // nasce para entrar no banco no primeiro movimento, e iria para lá na origem da fronteira
  // (revisão de 20/11/2026). Ao ser desenhado, o adiado acerta tudo pelo caminho de sempre.
  proto.updateComponentLocations = function (this: Block, blockOrigin: Blockly.utils.Coordinate) {
    if (tailOf(this)?.deferred.has(this)) return
    updateComponentLocations.call(this, blockOrigin)
  }
  // `serialization.blocks.appendInternal` liga as conexões da árvore inteira num `setTimeout`:
  // sem isto, as do bloco não desenhado iriam ao banco em (0,0) e um arrasto perto da origem
  // encaixaria num bloco invisível. A recursão para no primeiro adiado (o resto vem depois dele).
  proto.setConnectionTracking = function (this: Block, track: boolean) {
    if (track && tailOf(this)?.deferred.has(this)) return
    setConnectionTracking.call(this, track)
  }
  // Para quem está acima, o adiado não ocupa lugar: `altura - NOTCH_HEIGHT` na conta do anterior
  // fecha exatamente na borda do último desenhado.
  proto.getHeightWidth = function (this: Block) {
    if (tailOf(this)?.deferred.has(this))
      return { height: this.workspace.getRenderer().getConstants().NOTCH_HEIGHT, width: 0 }
    return getHeightWidth.call(this)
  }
  proto.bumpNeighbours = function (this: Block) {
    if (tailOf(this)?.deferred.has(this)) return
    bumpNeighbours.call(this)
  }
  proto.setParent = function (this: Block, newParent: Block | null) {
    const tail = tailOf(this)
    if (
      tail &&
      newParent === null &&
      !this.isDeadOrDying() &&
      !this.workspace.isClearing &&
      tail.deferred.has(this)
    )
      tail.drawBeforeUnplug(this)
    setParent.call(this, newParent)
    if (!tail || tail.boundaries.size === 0 || this.isDeadOrDying()) return
    const parent = this.getParent()
    if (tail.deferred.has(this)) {
      if (!parent) return
      // O Blockly pôs o SVG dentro do novo pai: dentro de um desenhado, ele volta a sair da página.
      if (tail.deferred.has(parent)) tail.boundaries.delete(this)
      else {
        this.getSvgRoot().remove()
        tail.boundaries.add(this)
      }
    } else if (parent && tail.deferred.has(parent)) tail.deferSubtree(this)
  }
  proto.select = function (this: Block) {
    tailOf(this)?.drawThrough(this)
    select.call(this)
  }
  proto.startDrag = function (this: Block, e?: PointerEvent) {
    tailOf(this)?.parkStackBottom(this)
    startDrag.call(this, e)
  }
}

/** O que a carga usa: o estado a carregar e quem fecha a carga (depois do `load`, mesmo se falhar). */
export interface DeferredTailLoad {
  state: unknown
  finish(): void
}

/**
 * O plano da carga, que é opcional: se ler a vista ou o estado falhar, o projeto abre como sempre
 * abriu (como quando o módulo não chega), em vez de a carga inteira cair junto e o projeto não
 * reabrir (revisão de 20/11/2026). Nada muda antes do plano pronto.
 */
function planFor(
  workspace: Blockly.WorkspaceSvg,
  state: unknown,
  opening: boolean,
): ReturnType<typeof planDeferredTail> {
  try {
    const metrics = workspace.getMetricsManager().getViewMetrics(false)
    const scale = workspace.scale || 1
    // Painel ainda sem altura (aba escondida): a janela é a melhor estimativa; o desenho corrige.
    const heightPx = metrics.height > 0 ? metrics.height : window.innerHeight
    const view = opening
      ? openingViewFor(state, heightPx, scale)
      : { top: workspace.getMetricsManager().getViewMetrics(true).top, height: heightPx / scale }
    return planDeferredTail(state, view)
  } catch (error) {
    console.warn('Abrindo sem adiar o desenho:', error)
    return null
  }
}

/**
 * Antes do `serialization.workspaces.load`: decide a cauda adiada. `null` = abre como sempre abriu.
 * A vista é a da primeira abertura (`opening`, os blocos no alto) ou a de agora (a Ponte refazendo
 * os blocos a partir do código).
 */
export function prepareDeferredTail(
  workspace: Blockly.WorkspaceSvg,
  state: unknown,
  opening: boolean,
): DeferredTailLoad | null {
  const plan = planFor(workspace, state, opening)
  let tail = tails.get(workspace)
  // A carga substitui todos os blocos: o que estava adiado antes deixa de existir.
  tail?.deferred.clear()
  tail?.boundaries.clear()
  if (!plan) {
    tail?.loaded()
    return null
  }
  installHooks()
  if (!tail) {
    tail = new DeferredTail(workspace)
    tails.set(workspace, tail)
  }
  tail.loading = new Set(plan.boundaries)
  const loading = tail
  return { state: plan.state, finish: () => loading.loaded() }
}
