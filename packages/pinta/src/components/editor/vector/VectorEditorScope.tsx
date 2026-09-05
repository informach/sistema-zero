/**
 * ESCOPO do editor vetorial: um provider por documento aberto com o estado
 * compartilhado (ferramenta, estilo, seleção, cores recentes) e as ações que a
 * caixa de ferramentas, o palco e os painéis da direita consomem via
 * `useVectorEditor()`. Substitui o antigo componente único `VectorEditor`.
 *
 * Serve os TRÊS kinds vetoriais editando o "documento de shapes ativo"
 * (`activeShapesOf`/`withActiveShapes`): o cenário inteiro, o quadro da
 * animação selecionada (vector-sprite) ou o tile selecionado (vector-tileset).
 *
 * As ações leem o estado VIVO das stores (`editor.getState()`), nunca o do
 * render — mesmo padrão do componente original (sem closures velhas).
 */
import type { Dispatch, JSX, ReactNode, RefObject, SetStateAction } from 'react'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  type ActiveFrameRef,
  type ActiveShapesDoc,
  activeShapesOf,
  previousShapesOf,
  withActiveShapes,
} from '../../../core/assetEdit'
import { normalizeHex } from '../../../core/color'
import { COPY } from '../../../core/copy'
import { isTextEntryTarget } from '../../../core/dom'
import { newId } from '../../../core/id'
import { DEFAULT_PALETTE_ID } from '../../../core/palette'
import { PINTA_LIMITS, type PintaAsset } from '../../../core/project'
import { shortcut } from '../../../core/shortcuts'
import { isToolAllowed } from '../../../core/toolCuration'
import { ensureVectorFontLoaded, ensureVectorFontsForShapes } from '../../../vector/fonts'
import {
  type AlignEdge,
  alignShapes,
  boundsCenter,
  boundsUnion,
  flipShape,
  setTextAlign as setTextAlignGeometry,
  shapeBounds,
  translateShape,
} from '../../../vector/geometry'
import {
  imageShapeForInsert,
  insertPlanFor,
  resolveInsertSource,
  shapesForInsert,
} from '../../../vector/insertAsset'
import { lockedIdsOf, lockedShapesViolation } from '../../../vector/lock'
import {
  DEFAULT_VECTOR_FONT_FAMILY,
  isVectorGradient,
  MAX_POLYGON_POINTS,
  type VectorFill,
  type VectorFontFamily,
  type VectorGradient,
  type VectorShape,
  type VectorStroke,
  type VectorTextAlign,
} from '../../../vector/model'
import { moveShapesOrder } from '../../../vector/order'
import {
  type PathfinderOp,
  type PathfinderRefusal,
  pathfinderShapes,
} from '../../../vector/pathfinder'
import {
  type EditablePath,
  fromEditablePath,
  insertNodeAt,
  makeCorner,
  makeSmooth,
  minNodesFor,
  moveNodes,
  openClosedPathAt,
  removeNodes,
  segmentsForNodes,
  setClosed,
  setSegmentCurved,
  smoothPath,
  splitOpenPathAt,
  toEditablePath,
} from '../../../vector/pathNodes'
import { DEFAULT_STYLE, type ShapeStyle } from '../../../vector/shapes'
import { usePintaApp } from '../../appContext'
import { useToast } from '../../ui/Toast'
import { useEditor, useEditorStores, useSession } from '../editorContext'
import { isPintaModalOpen, useActionShortcuts } from '../useActionShortcuts'
import { useToolShortcuts } from '../useToolShortcuts'
import {
  cloneShapesWithNewIds,
  fitPastedShapes,
  MAX_CUSTOM_COLORS,
  occupiedBoundsOf,
  offsetInsideDoc,
  TOOL_SHORTCUTS,
  type VectorPaletteChoice,
  type VectorTool,
  vectorPaletteSwatches,
} from './vectorTools'

/** Qual "canal" de cor recebe o próximo clique na paleta. */
export type VectorColorChannel = 'fill' | 'stroke'

/**
 * Por que a captura de cor acabou sem cor: `user` = X/Esc (quem pediu quer
 * voltar para onde estava), `tool` = ela escolheu outra ferramenta no meio (quer
 * desenhar, não voltar).
 */
export type ColorPickCancelReason = 'user' | 'tool'

/** O que a janelinha de cor pede ao palco: UMA cor, tocando numa forma. */
export interface ColorPickRequest {
  onPick: (hex: string) => void
  onCancel: (reason: ColorPickCancelReason) => void
}

/** A captura em andamento (o que o palco precisa para renderizar a faixinha). */
export interface ColorPickSession {
  previousTool: VectorTool
}

export interface VectorEditorContextValue {
  doc: ActiveShapesDoc
  onionShapes: VectorShape[] | null
  tool: VectorTool
  setTool: (tool: VectorTool) => void
  style: ShapeStyle
  customColors: string[]
  /** Apaga uma cor personalizada das recentes (lixeira do painel de cores). */
  forgetColor: (hex: string) => void
  palette: VectorPaletteChoice
  setPalette: (choice: VectorPaletteChoice) => void
  swatches: string[]
  selectedIds: string[]
  setSelectedIds: Dispatch<SetStateAction<string[]>>
  selected: VectorShape[]
  single: VectorShape | null
  /** A forma em edição de PONTOS: a única selecionada, com a ferramenta ligada. */
  nodeTarget: VectorShape | null
  /** Os nós dessa forma, já na visão âncora+alças. `null` = não dá para editar. */
  nodePath: EditablePath | null
  /** Índices dos nós escolhidos (laço/toque). Nenhuma escolha atravessa uma
   *  edição estrutural: acrescentar ou apagar ponto já refaz a escolha. */
  selectedNodes: number[]
  setSelectedNodes: Dispatch<SetStateAction<number[]>>
  /** Grava uma edição de nós. `recordUndo=false` durante o arrasto.
   *  `false` = recusada (o `d` estourou o teto e a forma voltaria a ser a de
   *  antes; sem esse retorno, "cortar" duplicaria o traço em silêncio). */
  applyNodeEdit: (next: EditablePath, recordUndo?: boolean) => boolean
  removeSelectedNodes: () => void
  toggleNodePathClosed: () => void
  /**
   * A TESOURA, com UM ponto escolhido: caminho FECHADO abre exatamente ali (uma
   * forma só, um nó a mais); caminho ABERTO vira DOIS traços com o mesmo estilo.
   */
  cutNodePath: () => void
  insertNodeOnSegment: (segmentIndex: number, t: number) => void
  /** Curva ou endireita os segmentos que os nós escolhidos alcançam. */
  setSelectedSegmentsCurved: (curved: boolean) => void
  /** Arredonda (suave) ou aquina (canto) os nós escolhidos. */
  setSelectedNodesSmooth: (smooth: boolean) => void
  /** Tira o tremido do traço inteiro. Repetir suaviza mais. */
  simplifyNodePath: () => void
  polygonSides: number
  setPolygonSides: (value: number) => void
  starTips: number
  setStarTips: (value: number) => void
  rectRadius: number
  setRectRadius: (value: number) => void
  /** Alinhamento do texto: arma o PRÓXIMO e reescreve o selecionado. */
  textAlign: VectorTextAlign
  setTextAlign: (value: VectorTextAlign) => void
  /** Fonte do próximo texto; ao selecionar texto, edita a família existente. */
  fontFamily: VectorFontFamily
  setFontFamily: (value: VectorFontFamily) => void
  /** Traz um desenho da galeria para dentro deste (formas ou figura). */
  insertFromAsset: (asset: PintaAsset) => boolean
  svgRef: RefObject<SVGSVGElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  currentRef: () => ActiveFrameRef
  currentShapes: () => VectorShape[]
  commitShapes: (next: VectorShape[], recordUndo?: boolean) => void
  updateSelected: (update: (shape: VectorShape) => VectorShape) => void
  rememberColor: (hex: string) => void
  applyStyle: (partial: Partial<ShapeStyle>) => void
  adoptStyle: (partial: Partial<ShapeStyle>) => void
  activeChannel: VectorColorChannel
  setActiveChannel: (channel: VectorColorChannel) => void
  applyChannelColor: (hex: string) => void
  swapFillStroke: () => void
  /**
   * O preenchimento que a janela do Degradê inspeciona e edita: o da primeira
   * forma selecionada com preenchimento; sem seleção, o estilo vigente.
   */
  inspectedFill: () => VectorFill
  currentGradient: () => VectorGradient
  /** Edita o degradê de CADA forma livre da seleção em cima do dela (e o estilo). */
  applyGradient: (partial: Partial<VectorGradient>) => void
  /** "Tirar o degradê": cada forma com degradê fica com a cor do começo DELA. */
  clearGradient: () => void
  /** Há degradê para tirar (alguma forma selecionada com preenchimento; sem seleção, o estilo). */
  hasGradient: boolean
  /**
   * Modo de CAPTURA de cor (conta-gotas da janelinha de cor): a janelinha fecha,
   * a ferramenta vira o conta-gotas e o próximo toque numa forma devolve UMA cor
   * pela `onPick`. `null` fora do modo.
   */
  colorPick: ColorPickSession | null
  /**
   * Entra no modo. `false` = recusado (conta-gotas curado). Já em captura, a
   * pedida nova SUBSTITUI a anterior (a última ponta pedida vence).
   */
  beginColorPick: (request: ColorPickRequest) => boolean
  /** Sai do modo com a cor tocada: restaura a ferramenta e entrega a cor. */
  endColorPick: (hex: string) => void
  /** Sai do modo sem cor. Só `user` restaura a ferramenta (`tool` já trocou). */
  cancelColorPick: (reason: ColorPickCancelReason) => void
  /**
   * A janela do Degradê vive no ESCOPO (e é montada pelo palco): o painel de
   * Aparência, dono do botão, desmonta na tela estreita quando o disclosure
   * "Cores e camadas" recolhe, e a janela precisa reabrir depois da captura.
   */
  gradientOpen: boolean
  setGradientOpen: (open: boolean) => void
  /** O botão "Degradê" do painel: a janela reaberta sozinha devolve o foco a ele. */
  gradientButtonRef: RefObject<HTMLButtonElement | null>
  moveOrder: (to: 1 | -1 | 'front' | 'back') => void
  duplicateSelected: () => void
  removeSelected: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  pathfinderSelected: (op: PathfinderOp) => void
  flipSelected: (axis: 'h' | 'v') => void
  alignSelected: (edge: AlignEdge) => void
  zoomToFit: () => void
}

/**
 * ⭐ Um `Record`, não um `switch`: recusa NOVA no núcleo quebra o typecheck aqui
 * em vez de virar um toast vazio. É o oposto do `default: return null` do
 * `sanitizeVectorShape`, que é justamente o buraco silencioso que este arquivo
 * manda vigiar.
 */
const PATHFINDER_REFUSALS: Record<PathfinderRefusal, string> = {
  'open-path': COPY.vector.pathfinderOpenPath,
  'bad-path': COPY.vector.pathfinderBadPath,
  'not-shapes': COPY.vector.pathfinderSkips,
  'needs-two': COPY.vector.pathfinderNeedsTwo,
  apart: COPY.vector.pathfinderApart,
  empty: COPY.vector.pathfinderEmpty,
  'too-big': COPY.vector.pathfinderTooBig,
  'geometry-failed': COPY.vector.pathfinderFailed,
}

/** Tem preenchimento que se vê: linha não tem miolo e a figura desenha a própria imagem. */
function hasFill(shape: VectorShape): boolean {
  return shape.type !== 'line' && shape.type !== 'image'
}

/**
 * O degradê "de trabalho" de um preenchimento: o próprio, se já é degradê;
 * sólido vira um degradê que COMEÇA nele; sem cor, o verde de fábrica.
 */
function gradientOf(fill: VectorFill): VectorGradient {
  if (isVectorGradient(fill)) return fill
  const from = typeof fill === 'string' && fill.startsWith('#') ? fill : '#78dc52'
  return { type: 'linear', from, to: '#ffffff', angle: 90 }
}

function sameGradient(fill: VectorFill, gradient: VectorGradient): boolean {
  return (
    isVectorGradient(fill) &&
    fill.type === gradient.type &&
    fill.from === gradient.from &&
    fill.to === gradient.to &&
    fill.angle === gradient.angle
  )
}

const VectorEditorContext = createContext<VectorEditorContextValue | null>(null)

export function useVectorEditor(): VectorEditorContextValue {
  const value = useContext(VectorEditorContext)
  if (!value) throw new Error('useVectorEditor deve ser usado dentro do VectorEditorScope')
  return value
}

export function VectorEditorScope({ children }: { children: ReactNode }): JSX.Element | null {
  const { editor, session, allowTools } = useEditorStores()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const animationId = useSession((state) => state.animationId)
  const frameIndex = useSession((state) => state.frameIndex)
  const onion = useSession((state) => state.onion)
  const [tool, setTool] = useState<VectorTool>('brush')
  const [style, setStyle] = useState<ShapeStyle>(DEFAULT_STYLE)
  // Cores personalizadas recentes (conta-gotas + seletor livre) — viram swatches.
  const [customColors, setCustomColors] = useState<string[]>([])
  // Paleta SUGERIDA (a cor do vetor é livre; a paleta só troca as sugestões da
  // grade). Vive aqui, e não no asset como no pixel: kinds vetoriais não têm
  // campo `paletteId` e criar um entraria no desfazer sem mudar o desenho.
  // Personalizada entra como SNAPSHOT (VectorPaletteChoice) — excluir da
  // biblioteca não quebra a sessão aberta.
  const [palette, setPalette] = useState<VectorPaletteChoice>({
    kind: 'builtin',
    id: DEFAULT_PALETTE_ID,
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Seleção de NÓS (só vale com a ferramenta de pontos). Guardada por ÍNDICE,
  // como o palco sempre desenhou os nós. ⭐ Índice velho nunca sobrevive a uma
  // mudança de estrutura: acrescentar um ponto deixa SÓ ele escolhido e apagar
  // limpa a escolha — por isso não existe reindexação para dar errado.
  const [selectedNodes, setSelectedNodes] = useState<number[]>([])
  // Lados do polígono / pontas da estrela (configuráveis quando a ferramenta ativa).
  const [polygonSides, setPolygonSides] = useState(6)
  const [starTips, setStarTips] = useState(5)
  // Raio dos cantos do PRÓXIMO retângulo (o slider também edita o selecionado).
  const [rectRadius, setRectRadius] = useState(0)
  const [textAlign, setTextAlignState] = useState<VectorTextAlign>('left')
  const [fontFamily, setFontFamilyState] = useState<VectorFontFamily>(DEFAULT_VECTOR_FONT_FAMILY)
  // Canal de cor SELECIONADO (espelho do activeSlot do pixel): a próxima cor
  // tocada na paleta cai no preenchimento ou no contorno.
  const [activeChannel, setActiveChannel] = useState<VectorColorChannel>('fill')
  // Captura de cor da janelinha (conta-gotas). O ESTADO é o que renderiza
  // (faixinha, alças escondidas, cursor); a request com os callbacks vive num
  // REF: os handlers de ponteiro e o efeito da ferramenta leem sempre a request
  // VIVA, sem entrar em deps nem correr atrás de um render.
  const [colorPick, setColorPick] = useState<ColorPickSession | null>(null)
  const colorPickRef = useRef<(ColorPickRequest & ColorPickSession) | null>(null)
  const [gradientOpen, setGradientOpen] = useState(false)
  const gradientButtonRef = useRef<HTMLButtonElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // Área de transferência do APLICATIVO (copiar aqui, colar em outro desenho — ou
  // receber pixel art de outro desenho como figura). Antes era um ref deste escopo.
  const { clipboard } = usePintaApp()
  // Última estrutura de nós que nasceu de uma ação DESTE escopo. Se undo/redo
  // troca a quantidade por fora, nenhum índice escolhido pode atravessar.
  const expectedNodeStructureRef = useRef<string | null>(null)

  // Trocar de quadro/tile é trocar de documento: a seleção não migra. (A prévia
  // e o gesto em andamento são resetados pelo VectorStage, dono deles.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro/tile ativo), não leituras
  useEffect(() => {
    setSelectedIds([])
  }, [animationId, frameIndex])

  // Trocar de forma ou de ferramenta larga os nós escolhidos. ⚠️ A chave é o
  // CONTEÚDO da seleção, não o array: o palco chama `setSelectedIds` a cada
  // toque num nó, e comparar por identidade limparia a escolha na hora.
  const selectionKey = selectedIds.join(',')
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro/forma/ferramenta), não leituras
  useEffect(() => {
    setSelectedNodes([])
  }, [animationId, frameIndex, tool, selectionKey])

  // Atalhos de teclado da seleção (Delete apaga; setas movem, Shift = 10) —
  // no window, sem exigir foco no palco; campos de texto são ignorados.
  //
  // ⚠️ Com NÓS escolhidos, Delete e setas valem para os PONTOS, não para a forma
  // inteira. O ramo mora aqui, no mesmo handler, de propósito: o palco é filho e
  // registra os listeners dele ANTES deste, então tentar cancelar daqui de baixo
  // com `preventDefault` não funcionaria (só `stopImmediatePropagation`, que é a
  // versão frágil disso).
  // biome-ignore lint/correctness/useExhaustiveDependencies: o handler lê o estado vivo via stores; a seleção (de forma e de nó) e a ferramenta re-registram
  useEffect(() => {
    if (selectedIds.length === 0) return
    const editingNodes = tool === 'reshape' && selectedNodes.length > 0
    function onKeyDown(event: globalThis.KeyboardEvent): void {
      if (isTextEntryTarget(event.target)) return
      // Mesmo portão dos atalhos de ação: com um modal do Pinta aberto, o Delete e as
      // setas são do modal (o card focado), não da forma atrás dele.
      if (isPintaModalOpen()) return
      const step = event.shiftKey ? 10 : 1
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          if (editingNodes) removeSelectedNodes()
          else removeSelected()
          return
        case 'ArrowLeft':
          event.preventDefault()
          if (editingNodes) nudgeNodes(-step, 0)
          else nudgeSelected(-step, 0)
          return
        case 'ArrowRight':
          event.preventDefault()
          if (editingNodes) nudgeNodes(step, 0)
          else nudgeSelected(step, 0)
          return
        case 'ArrowUp':
          event.preventDefault()
          if (editingNodes) nudgeNodes(0, -step)
          else nudgeSelected(0, -step)
          return
        case 'ArrowDown':
          event.preventDefault()
          if (editingNodes) nudgeNodes(0, step)
          else nudgeSelected(0, step)
          return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIds, selectedNodes, tool])

  // Copiar/colar/selecionar-tudo (Ctrl/Cmd+C/V/A; Ctrl+Shift+A solta a seleção, como no
  // pixel) — sempre ativo, ignora campos de texto e modal do Pinta aberto. Não colide
  // com o desfazer/refazer do EditorScreen (Z/Y).
  // biome-ignore lint/correctness/useExhaustiveDependencies: lê estado vivo via stores/refs; só a seleção re-registra (p/ o copiar)
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey)) return
      if (isTextEntryTarget(event.target)) return
      if (isPintaModalOpen()) return
      const key = event.key.toLowerCase()
      if (key === 'a') {
        event.preventDefault()
        if (event.shiftKey) setSelectedIds([])
        else selectAll()
      } else if (key === 'c') {
        event.preventDefault()
        copySelected()
      } else if (key === 'v') {
        event.preventDefault()
        pasteClipboard()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds])

  // Arrow (não o `setTool` cru): amarra o genérico do hook ao id da ferramenta.
  useToolShortcuts(TOOL_SHORTCUTS, (id) => setTool(id))

  // Trocar de ferramenta no meio da captura (caixa, letra de atalho ou o
  // `toolFallback` da curadoria) cancela SEM restaurar: ela escolheu o que quer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a dep é o GATILHO (trocou de ferramenta), não leitura
  useEffect(() => {
    if (colorPickRef.current && tool !== 'picker') cancelColorPick('tool')
  }, [tool])

  // Esc cancela a captura. Em CAPTURA (molde do Esc da Caneta no palco) e com
  // `preventDefault`: o `useActionShortcuts` ignora evento já consumido, então o
  // Esc de "soltar a seleção" não dispara junto. Com um modal do Pinta aberto por
  // cima (a ajuda `?`), o Esc é do modal. ⚠️ Sem o guard de botão/campo da
  // Caneta: ao fechar as janelinhas o foco cai no botão "Degradê", e o guard
  // engoliria o Esc.
  // biome-ignore lint/correctness/useExhaustiveDependencies: cancelColorPick lê o ref vivo; só o modo re-registra
  useEffect(() => {
    if (!colorPick) return
    function onKey(event: globalThis.KeyboardEvent): void {
      if (event.key !== 'Escape') return
      if (isPintaModalOpen()) return
      event.preventDefault()
      cancelColorPick('user')
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [colorPick])

  // Atalhos de AÇÃO no padrão do Illustrator (08/2026): agrupar, ordem, trancar e
  // esconder, zoom, grade, espelhar, Esc. As combinações vêm do catálogo
  // (`core/shortcuts.ts`), que também alimenta a janela "Atalhos". As funções são
  // declarações içadas — o hook lê sempre as do último render.
  useActionShortcuts([
    { combo: shortcut('group'), run: () => groupSelected() },
    { combo: shortcut('ungroup'), run: () => ungroupSelected() },
    { combo: shortcut('toFront'), run: () => moveOrder('front') },
    { combo: shortcut('toBack'), run: () => moveOrder('back') },
    { combo: shortcut('forward'), run: () => moveOrder(1) },
    { combo: shortcut('backward'), run: () => moveOrder(-1) },
    { combo: shortcut('duplicateShapes'), run: () => duplicateSelected() },
    { combo: shortcut('swapFillStroke'), run: () => swapFillStroke() },
    // A mesma tecla faz o inverso sem seleção (o "tudo" não tem combo próprio: Alt+Shift
    // troca o idioma do teclado no Windows com dois layouts).
    { combo: shortcut('lock'), run: () => (selectedIds.length > 0 ? lockSelected() : unlockAll()) },
    { combo: shortcut('hide'), run: () => (selectedIds.length > 0 ? hideSelected() : showAll()) },
    { combo: shortcut('zoomFit'), run: () => zoomToFit() },
    { combo: shortcut('zoomIn'), run: () => session.getState().zoomIn(), repeat: true },
    { combo: shortcut('zoomOut'), run: () => session.getState().zoomOut(), repeat: true },
    { combo: shortcut('grid'), run: () => session.getState().toggleGrid() },
    { combo: shortcut('flipShapesH'), run: () => flipSelected('h') },
    { combo: shortcut('flipShapesV'), run: () => flipSelected('v') },
    {
      combo: shortcut('deselectShapes'),
      run: () => setSelectedIds([]),
      when: () => selectedIds.length > 0,
    },
    {
      combo: shortcut('onion'),
      run: () => session.getState().toggleOnion(),
      when: () => asset.kind === 'vector-sprite',
    },
  ])

  const ref: ActiveFrameRef = { animationId, frameIndex }
  const doc = activeShapesOf(asset, ref)

  useEffect(() => {
    void ensureVectorFontLoaded(fontFamily)
    if (doc) void ensureVectorFontsForShapes(doc.shapes)
  }, [doc, fontFamily])
  const selected = doc?.shapes.filter((s) => selectedIds.includes(s.id)) ?? []
  const single = selected.length === 1 ? (selected[0] ?? null) : null
  // A forma que a janela do Degradê INSPECIONA (e da qual o estilo sincroniza
  // numa seleção com várias): a primeira LIVRE com preenchimento, na ordem do
  // documento (a de baixo na pilha; linha e figura não contam). Trancada só
  // quando a seleção inteira está trancada: a janela mostra o que ela PODE
  // editar (`applyStyle` só escreve nas livres), não o que ela não pode.
  const lockedIds = doc ? lockedIdsOf(doc.shapes) : new Set<string>()
  const fillBearing = selected.filter(hasFill)
  const inspectedShape = fillBearing.find((s) => !lockedIds.has(s.id)) ?? fillBearing[0] ?? null
  // Editar pontos é sempre de UMA forma por vez (o palco desenha os nós dela).
  // Trancada não expõe os nós (editar pontos muda a geometria).
  const nodeTarget = tool === 'reshape' && single?.locked !== true ? single : null
  const nodePath = nodeTarget ? toEditablePath(nodeTarget) : null
  const nodeStructure = nodeTarget && nodePath ? `${nodeTarget.id}:${nodePath.nodes.length}` : null

  useEffect(() => {
    const expected = expectedNodeStructureRef.current
    if (expected !== null && expected !== nodeStructure) setSelectedNodes([])
    expectedNodeStructureRef.current = nodeStructure
  }, [nodeStructure])

  // O estilo também funciona como inspetor da seleção: com UMA forma, dela; com
  // VÁRIAS (grupo), da inspecionada — senão o slot da caixa e a paleta mostravam
  // a cor da forma ANTERIOR enquanto o botão do Degradê mostrava a do grupo
  // (três respostas para "qual é a cor de agora"). Undo/redo troca o objeto do
  // shape sem trocar seu id; sem esta sincronização, o desenho era restaurado
  // mas o painel (inclusive as pontas do degradê) ficava exibindo e reaplicando
  // a versão anterior.
  const styleSource = single ?? inspectedShape
  useEffect(() => {
    if (!styleSource) return
    setStyle((current) => ({
      // Linha e figura não têm preenchimento que valha como inspetor: o estilo
      // guarda o que já tinha (um degradê recém-montado para a PRÓXIMA forma).
      fill: hasFill(styleSource) ? styleSource.fill : current.fill,
      stroke: styleSource.stroke ? { ...styleSource.stroke } : null,
      opacity: styleSource.opacity,
    }))
  }, [styleSource])

  if (!doc) return null

  // Ordem da grade (espelho do pixel: base primeiro, adicionadas no fim): as 15
  // cores da paleta escolhida → as cores do JOGO (Pensa), que não podem sumir na
  // troca de paleta → as personalizadas recentes, que são as apagáveis.
  const baseSwatches = vectorPaletteSwatches(palette)
  const projectSwatches = [...new Set(asset.projectRef?.palette ?? [])].filter(
    (hex) => !baseSwatches.includes(hex),
  )
  const fixedSwatches = [...baseSwatches, ...projectSwatches]
  const extraCustom = customColors.filter((hex) => !fixedSwatches.includes(hex))
  const swatches = [...new Set([...fixedSwatches, ...extraCustom])]

  const onionShapes = onion ? previousShapesOf(asset, ref) : null

  function currentRef(): ActiveFrameRef {
    const s = session.getState()
    return { animationId: s.animationId, frameIndex: s.frameIndex }
  }

  /** Shapes ATUAIS do documento ativo (sempre do estado vivo, não do render). */
  function currentShapes(): VectorShape[] {
    const state = editor.getState()
    return activeShapesOf(state.asset, currentRef())?.shapes ?? []
  }

  function commitShapes(next: VectorShape[], recordUndo = true): void {
    const state = editor.getState()
    // Backstop do CADEADO: forma trancada não muda nem sai do documento (só
    // destrancar/esconder/reordenar). Os gates de UX filtram antes; qualquer
    // caminho esquecido morre aqui. Toast só no commit com undo — o replace
    // por-frame dos gestos rodaria isto 60×/s.
    const shapes = activeShapesOf(state.asset, currentRef())?.shapes ?? []
    if (lockedShapesViolation(shapes, next)) {
      if (recordUndo) showToast(COPY.layers.lockedShapeWarning)
      return
    }
    const updated = withActiveShapes(state.asset, currentRef(), next)
    if (updated === state.asset) return
    if (recordUndo) state.commit(updated)
    else state.replace(updated)
  }

  /**
   * Ids da seleção SEM os trancados — as mutações agem só neles (seleção mista
   * mexe só nas livres). Devolve `null` (e toasta) quando a seleção inteira
   * está trancada: aí não há o que fazer, e o silêncio leria como "quebrou".
   */
  function freeSelectedIds(): string[] | null {
    const locked = lockedIdsOf(currentShapes())
    const free = selectedIds.filter((id) => !locked.has(id))
    if (free.length === 0 && selectedIds.length > 0) {
      showToast(COPY.layers.lockedShapeWarning)
      return null
    }
    return free
  }

  /**
   * Aplica só nas formas LIVRES da seleção. Sem commit quando nada mudou (o
   * updater devolveu as mesmas referências): `withActiveShapes` sempre monta um
   * asset novo, então sem isto uma edição que não muda nada gravaria um desfazer
   * VAZIO (regra da casa: `null` no no-op é obrigação).
   */
  function updateSelected(update: (shape: VectorShape) => VectorShape): void {
    if (selected.length === 0) return
    const free = freeSelectedIds()
    if (!free) return
    updateFree(free, update)
  }

  /** O miolo do `updateSelected`, para quem já resolveu as livres (sem checar o cadeado 2×). */
  function updateFree(free: readonly string[], update: (shape: VectorShape) => VectorShape): void {
    const current = currentShapes()
    const next = current.map((s) => (free.includes(s.id) ? update(s) : s))
    if (next.every((s, i) => s === current[i])) return
    commitShapes(next)
  }

  /**
   * Arma o alinhamento do PRÓXIMO texto e, se houver texto selecionado,
   * realinha ele na hora — preservando a caixa (o bloco não pula de lugar).
   */
  function setTextAlign(value: VectorTextAlign): void {
    setTextAlignState(value)
    if (!selected.some((s) => s.type === 'text')) return
    updateSelected((s) => (s.type === 'text' ? setTextAlignGeometry(s, value) : s))
  }

  function setFontFamily(value: VectorFontFamily): void {
    setFontFamilyState(value)
    void ensureVectorFontLoaded(value)
    if (!selected.some((shape) => shape.type === 'text')) return
    updateSelected((shape) => (shape.type === 'text' ? { ...shape, fontFamily: value } : shape))
  }

  /**
   * Traz um desenho da galeria para dentro deste. Vetor entra como FORMAS
   * (agrupadas, ainda editáveis); pixel art entra como FIGURA. Uma entrada de
   * undo, e o que entrou já fica selecionado para a criança arrastar.
   */
  function insertFromAsset(asset: PintaAsset): boolean {
    // O escopo devolve `null` sem documento ativo, mas esta função é declarada
    // antes daquele portão — o narrowing do TS não atravessa.
    if (!doc) return false
    const plan = insertPlanFor(asset)
    if (!plan) return false
    const source = resolveInsertSource(plan)
    // Sem canvas (ou PNG grande demais para o sanitize aceitar): recusa em vez
    // de inserir uma figura vazia que sumiria no próximo load.
    if (!source) {
      showToast(COPY.vector.insertFailed)
      return false
    }
    const shapes = currentShapes()
    const target = { width: doc.width, height: doc.height }
    const novas =
      source.kind === 'shapes'
        ? shapesForInsert(source, target)
        : [imageShapeForInsert(source, target)]
    if (novas.length === 0) {
      showToast(COPY.vector.insertEmpty)
      return false
    }
    if (shapes.length + novas.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.insertTooManyShapes)
      return false
    }
    commitShapes([...shapes, ...novas])
    setSelectedIds(novas.map((s) => s.id))
    setTool('select')
    return true
  }

  /** Guarda uma cor livre no topo das recentes (dedup, teto). */
  function rememberColor(hex: string): void {
    setCustomColors((cur) => [hex, ...cur.filter((c) => c !== hex)].slice(0, MAX_CUSTOM_COLORS))
  }

  /**
   * Tira uma cor das recentes (lixeira). Diferente do pixel, aqui NÃO mexe no
   * desenho: as formas guardam o hex, não um índice — some só a sugestão.
   */
  function forgetColor(hex: string): void {
    setCustomColors((cur) => cur.filter((c) => c !== hex))
  }

  /** Adota um estilo (conta-gotas): muda só o estilo VIGENTE, sem re-estilizar a seleção. */
  function adoptStyle(partial: Partial<ShapeStyle>): void {
    setStyle((current) => ({ ...current, ...partial }))
  }

  /**
   * As formas livres da seleção, ou `[]` sem seleção; `null` = seleção inteira
   * trancada (o `freeSelectedIds` já toastou) — aí NEM o estilo muda: a janela
   * do Degradê e os slots da caixa mentiriam mostrando uma cor que o desenho
   * recusou. Custo aceito: com uma trancada selecionada pelo painel Camadas, a
   * paleta não arma a cor da PRÓXIMA forma (o toast do cadeado explica; Esc
   * solta a seleção).
   */
  function freeForStyle(): string[] | null {
    return selected.length > 0 ? freeSelectedIds() : []
  }

  function applyStyle(partial: Partial<ShapeStyle>): void {
    const free = freeForStyle()
    if (!free) return
    setStyle((current) => ({ ...current, ...partial }))
    if (free.length === 0) return
    updateFree(free, (shape) => {
      const fillApplies = partial.fill !== undefined && hasFill(shape)
      const strokeApplies = partial.stroke !== undefined
      const opacityApplies = partial.opacity !== undefined
      // Nada se aplica a esta forma (linha ou figura recebendo só preenchimento):
      // a MESMA referência, para o `updateFree` não gravar desfazer vazio.
      if (!fillApplies && !strokeApplies && !opacityApplies) return shape
      return {
        ...shape,
        ...(fillApplies ? { fill: partial.fill } : {}),
        ...(strokeApplies ? { stroke: partial.stroke } : {}),
        ...(opacityApplies ? { opacity: partial.opacity } : {}),
      }
    })
  }

  /**
   * Aplica uma cor da paleta (ou `'none'`) no CANAL ativo. Em CAPTURA de cor
   * (conta-gotas da janelinha do degradê), a paleta e a cor livre também são
   * FONTE: a criança pode pegar de qualquer lugar da tela, não só de uma forma
   * (a dona testava clicando na paleta, e a cor sólida apagava o degradê da
   * forma selecionada). "Sem cor" não é uma cor: avisa e continua na captura
   * (clique mudo não ensina nada).
   */
  function applyChannelColor(hex: string): void {
    if (colorPickRef.current) {
      if (hex === 'none') showToast(COPY.vector.pickColorNone)
      else endColorPick(hex)
      return
    }
    if (activeChannel === 'stroke') {
      applyStyle({
        stroke: hex === 'none' ? null : { color: hex, width: style.stroke?.width ?? 2 },
      })
      return
    }
    applyStyle({ fill: hex })
  }

  /**
   * Troca preenchimento ↔ contorno (o botão de trocar dos slots, espelho do
   * swapColors do pixel). A espessura do traço fica; degradê no preenchimento
   * passa a cor DO COMEÇO para o contorno.
   */
  function swapFillStroke(): void {
    const width = style.stroke?.width ?? 2
    const nextFill: VectorFill = style.stroke ? style.stroke.color : 'none'
    const nextStroke: VectorStroke | null =
      typeof style.fill === 'string'
        ? style.fill === 'none'
          ? null
          : { color: style.fill, width }
        : { color: style.fill.from, width }
    applyStyle({ fill: nextFill, stroke: nextStroke })
  }

  /**
   * O preenchimento que a janela do Degradê INSPECIONA e edita: o da primeira
   * forma selecionada com preenchimento (linha e figura não contam); sem
   * seleção, o estilo vigente. ⚠️ Antes era sempre `style.fill`, e o estilo
   * descola da seleção em quatro situações reais (grupo: o efeito de
   * sincronização só roda com UMA forma; conta-gotas da caixa: `adoptStyle` não
   * commita; linha; trancada). Aí "pegar a cor do fim" montava o degradê em
   * cima de uma cor velha e a criança via a PRIMEIRA cor trocar.
   */
  function inspectedFill(): VectorFill {
    return inspectedShape ? inspectedShape.fill : style.fill
  }

  /** Degradê "de trabalho": o inspecionado, ou um novo a partir da cor sólida dele. */
  function currentGradient(): VectorGradient {
    return gradientOf(inspectedFill())
  }

  /**
   * Edita o degradê de CADA forma livre da seleção em cima do DELA (o começo de
   * uma nunca vira o começo da outra; sólida vira degradê a partir da própria
   * cor) e o estilo em cima do inspecionado; sem seleção, só o estilo. Forma que
   * já tem exatamente esse degradê sai pela MESMA referência (sem desfazer vazio
   * — é o "pegar a mesma cor que já está na ponta").
   */
  function applyGradient(partial: Partial<VectorGradient>): void {
    const free = freeForStyle()
    if (!free) return
    setStyle((current) => ({ ...current, fill: { ...currentGradient(), ...partial } }))
    if (free.length === 0) return
    updateFree(free, (shape) => {
      if (!hasFill(shape)) return shape
      const next = { ...gradientOf(shape.fill), ...partial }
      return sameGradient(shape.fill, next) ? shape : { ...shape, fill: next }
    })
  }

  /** "Tirar o degradê": cada forma livre com degradê fica com a cor do COMEÇO dela. */
  function clearGradient(): void {
    const free = freeForStyle()
    if (!free) return
    setStyle((current) => ({
      ...current,
      fill: isVectorGradient(current.fill) ? current.fill.from : current.fill,
    }))
    if (free.length === 0) return
    updateFree(free, (shape) =>
      isVectorGradient(shape.fill) ? { ...shape, fill: shape.fill.from } : shape,
    )
  }

  // Trancada com degradê conta: o botão vivo leva ao toast do cadeado, que
  // explica; desligado, a criança só veria um botão morto.
  const hasGradient =
    selected.length > 0
      ? selected.some((s) => hasFill(s) && isVectorGradient(s.fill))
      : isVectorGradient(style.fill)

  /**
   * Entra na captura: guarda a request + a ferramenta de agora e liga o
   * conta-gotas. Recusa com o conta-gotas CURADO (a caixa reverteria a
   * ferramenta na hora pelo `toolFallback`; o botão nem aparece nesse caso, mas
   * um no-op é mais seguro do que fechar as janelinhas para nada).
   */
  function beginColorPick(request: ColorPickRequest): boolean {
    if (!isToolAllowed(allowTools, 'picker')) return false
    // Já em captura (o Degradê reaberto por cima da faixinha pediu OUTRA ponta):
    // a última pedida vence, e a ferramenta a restaurar continua a original.
    const previousTool = colorPickRef.current?.previousTool ?? tool
    colorPickRef.current = { ...request, previousTool }
    setColorPick({ previousTool })
    setTool('picker')
    return true
  }

  /**
   * Lê e LIMPA a request. ⚠️ Limpar ANTES do `setTool(previous)` é load-bearing:
   * o efeito sobre `tool` roda depois do batch com a ferramenta restaurada e
   * precisa achar o ref vazio, senão cancelaria uma segunda vez.
   */
  function takeColorPick(): (ColorPickRequest & ColorPickSession) | null {
    const request = colorPickRef.current
    colorPickRef.current = null
    setColorPick(null)
    return request
  }

  function endColorPick(hex: string): void {
    const request = takeColorPick()
    if (!request) return
    setTool(request.previousTool)
    request.onPick(normalizeHex(hex) ?? hex)
  }

  function cancelColorPick(reason: ColorPickCancelReason): void {
    const request = takeColorPick()
    if (!request) return
    if (reason !== 'tool') setTool(request.previousTool)
    request.onCancel(reason)
  }

  /**
   * Ordem-Z: um passo (±1) ou direto pro topo/fundo (front/back). A seleção
   * INTEIRA anda como uma peça só, e um passo pula o vizinho inteiro — a régua
   * mora em `vector/order.ts`. `null` = nada mudou, então nada é commitado.
   */
  function moveOrder(to: 1 | -1 | 'front' | 'back'): void {
    const next = moveShapesOrder(currentShapes(), selectedIds, to)
    if (next) commitShapes(next)
  }

  function duplicateSelected(): void {
    // O escopo devolve `null` sem documento; o narrowing não atravessa a função.
    if (selected.length === 0 || !doc) return
    const shapes = currentShapes()
    if (shapes.length + selected.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    // A MESMA régua do colar: a cópia nasce do lado, mas DENTRO do papel (num
    // personagem de 32 px o +12 cego jogava a forma pequena para fora).
    const offset = offsetInsideDoc(
      boundsUnion(selected.map(shapeBounds)),
      doc,
      occupiedBoundsOf(shapes),
    )
    const copies = cloneShapesWithNewIds(selected, offset.dx, offset.dy)
    commitShapes([...shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }

  function removeSelected(): void {
    if (selected.length === 0) return
    const free = freeSelectedIds()
    if (!free) return
    commitShapes(currentShapes().filter((s) => !free.includes(s.id)))
    // As trancadas FICAM (no desenho e na seleção — a criança vê que sobraram).
    setSelectedIds(selectedIds.filter((id) => !free.includes(id)))
  }

  /**
   * Ctrl+Shift+L (idioma do Figma): TRANCA a seleção. Trancada sai da seleção de
   * ação (o mesmo que o cadeado do painel faz) — para destrancar uma só, o painel;
   * para todas, o mesmo Ctrl+Shift+L sem nada selecionado. (Ctrl+2/Ctrl+Alt+2 do Illustrator são troca de aba no
   * navegador; Ctrl+L viraria Cmd+L no Mac, a barra de endereço.)
   */
  function lockSelected(): void {
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    commitShapes(currentShapes().map((s) => (ids.has(s.id) ? { ...s, locked: true } : s)))
    setSelectedIds([])
  }

  /** Ctrl+Shift+L SEM seleção: destranca TODAS as formas (destrancar é permitido pelo guard). */
  function unlockAll(): void {
    const shapes = currentShapes()
    if (!shapes.some((s) => s.locked === true)) return
    commitShapes(
      shapes.map((s) => {
        if (s.locked !== true) return s
        const { locked: _drop, ...rest } = s
        return rest as VectorShape
      }),
    )
  }

  /** Ctrl+Shift+H: ESCONDE a seleção (some do palco e do export; esconder desseleciona). */
  function hideSelected(): void {
    if (selectedIds.length === 0) return
    const ids = new Set(selectedIds)
    commitShapes(currentShapes().map((s) => (ids.has(s.id) ? { ...s, hidden: true } : s)))
    setSelectedIds([])
  }

  /** Ctrl+Shift+H SEM seleção: MOSTRA todas as formas escondidas. */
  function showAll(): void {
    const shapes = currentShapes()
    if (!shapes.some((s) => s.hidden === true)) return
    commitShapes(
      shapes.map((s) => {
        if (s.hidden !== true) return s
        const { hidden: _drop, ...rest } = s
        return rest as VectorShape
      }),
    )
  }

  /** Agrupa a seleção (2+): passam a se mover/selecionar juntos. */
  function groupSelected(): void {
    if (selected.length < 2) return
    // Agrupar muda o `groupId` — trancada exige destrancar antes.
    const free = freeSelectedIds()
    if (!free || free.length < 2) {
      if (free) showToast(COPY.layers.lockedShapeWarning)
      return
    }
    const gid = newId()
    commitShapes(currentShapes().map((s) => (free.includes(s.id) ? { ...s, groupId: gid } : s)))
  }

  /**
   * MISTURAR a seleção numa forma só. Um commit, um desfazer.
   *
   * ⭐ O resultado guarda o id, o lugar, o estilo e o grupo do participante de
   * TRÁS. O id é a parte OBRIGATÓRIA: com um id novo, `selectedIds` fica órfão
   * por um render, `selected` vira `[]` e a `VectorSelectionBar` INTEIRA
   * devolve null. Ela está no FLUXO (irmã do corpo), então o palco pularia uns
   * 54px e voltaria. É a lição do corte com a tesoura, um degrau pior.
   *
   * Quem quer avisar é o TOAST, nunca um botão morto: dizer o que fazer a
   * seguir ensina, e um botão apagado não ensina nada.
   */
  function pathfinderSelected(op: PathfinderOp): void {
    // Misturar REESCREVE a geometria dos participantes: trancada fica de fora
    // (e não some) — com menos de 2 livres o próprio pathfinder recusa.
    const free = freeSelectedIds()
    if (!free) return
    const result = pathfinderShapes(currentShapes(), free, op)
    if (!result.ok) {
      showToast(PATHFINDER_REFUSALS[result.reason])
      return
    }
    commitShapes(result.shapes)
    setSelectedIds([result.resultId])
  }

  /** Desagrupa a seleção (tira o vínculo de grupo). */
  function ungroupSelected(): void {
    if (!selected.some((s) => s.groupId)) return
    const free = freeSelectedIds()
    if (!free) return
    commitShapes(
      currentShapes().map((s) =>
        free.includes(s.id) && s.groupId ? { ...s, groupId: undefined } : s,
      ),
    )
  }

  /**
   * Guarda a seleção na área de transferência do APLICATIVO, com o tamanho do
   * documento de origem (para centralizar num documento de outro tamanho ao colar).
   */
  function copySelected(): void {
    if (selected.length === 0 || !doc) return
    clipboard.getState().set({
      kind: 'shapes',
      shapes: selected.map((s) => structuredClone(s)),
      width: doc.width,
      height: doc.height,
    })
  }

  /**
   * Cola o que está na área de transferência, selecionando o que entrou:
   * - formas (deste ou de OUTRO desenho): ids/grupos NOVOS; no mesmo tamanho de
   *   documento entra pelo `offsetInsideDoc` (do lado, dentro do papel e fora de
   *   cima do que já existe — a MESMA régua do Duplicar); vinda de um documento
   *   de outro tamanho, cabe e centraliza (`fitPastedShapes`);
   * - pixel art (de um desenho de pixel): vira FIGURA, pelo mesmo caminho do
   *   "trazer um desenho da galeria" — recusa educada quando o PNG passa do teto.
   */
  function pasteClipboard(): void {
    if (!doc) return
    const item = clipboard.getState().get()
    if (!item) return
    const shapes = currentShapes()
    const target = { width: doc.width, height: doc.height }
    let copies: VectorShape[]
    if (item.kind === 'shapes') {
      if (item.shapes.length === 0) return
      copies = fitPastedShapes(
        item.shapes,
        { width: item.width, height: item.height },
        target,
        occupiedBoundsOf(shapes),
      )
    } else {
      const source = resolveInsertSource({
        kind: 'pixel',
        width: item.bitmap.width,
        height: item.bitmap.height,
        bitmap: item.bitmap,
        colors: item.colors,
      })
      // Sem canvas, ou PNG acima do teto que o sanitize aceita: recusa em vez de
      // inserir uma figura que sumiria no próximo load (mesma régua do insertFromAsset).
      if (source?.kind !== 'image') {
        showToast(COPY.clipboard.figureUnavailable)
        return
      }
      copies = [imageShapeForInsert(source, target)]
    }
    if (shapes.length + copies.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    commitShapes([...shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
    if (item.kind === 'pixel') setTool('select')
  }

  function selectAll(): void {
    // Só as visíveis e DESTRANCADAS: o Ctrl+A existe para agir em cima do que
    // vier (mover/apagar), e a trancada não entra nisso — quem quer mexer nela
    // clica a linha dela no painel de propósito.
    setSelectedIds(
      currentShapes()
        .filter((s) => s.hidden !== true && s.locked !== true)
        .map((s) => s.id),
    )
  }

  /** Espelha cada shape selecionado em torno do PRÓPRIO centro. */
  function flipSelected(axis: 'h' | 'v'): void {
    if (selected.length === 0) return
    const free = freeSelectedIds()
    if (!free) return
    commitShapes(
      currentShapes().map((s) =>
        free.includes(s.id) ? flipShape(s, axis, boundsCenter(shapeBounds(s))) : s,
      ),
    )
  }

  /**
   * Alinha a seleção: com 2+ formas, em relação à CAIXA da própria seleção;
   * com 1, em relação à TELA do documento. Um commit (desfazível de uma vez).
   */
  function alignSelected(edge: AlignEdge): void {
    if (selected.length === 0 || !doc) return
    const free = freeSelectedIds()
    if (!free) return
    const target =
      selected.length >= 2
        ? boundsUnion(selected.map(shapeBounds))
        : { x: 0, y: 0, width: doc.width, height: doc.height }
    commitShapes(alignShapes(currentShapes(), free, edge, target))
  }

  /** Move a seleção com as setas (Shift = passos de 10). */
  function nudgeSelected(dx: number, dy: number): void {
    if (selectedIds.length === 0) return
    const free = freeSelectedIds()
    if (!free) return
    commitShapes(currentShapes().map((s) => (free.includes(s.id) ? translateShape(s, dx, dy) : s)))
  }

  /** Zoom que encaixa o documento inteiro no palco visível. */
  function zoomToFit(): void {
    const stage = stageRef.current
    if (!stage || !doc) return
    const availWidth = stage.clientWidth - 24
    const availHeight = stage.clientHeight - 24
    if (availWidth < 1 || availHeight < 1) return
    session.getState().setZoom(Math.min(availWidth / doc.width, availHeight / doc.height))
  }

  /**
   * Grava uma edição de nós na forma alvo. Lê a forma VIVA (não a do render):
   * durante o arrasto o palco manda o resultado do gesto inteiro a cada quadro.
   */
  function applyNodeEdit(next: EditablePath, recordUndo = true): boolean {
    if (!nodeTarget) return false
    const shapes = currentShapes()
    const before = shapes.find((s) => s.id === nodeTarget.id)
    if (!before) return false
    const edited = fromEditablePath(before, next)
    if (edited === before) return false
    expectedNodeStructureRef.current = `${nodeTarget.id}:${next.nodes.length}`
    commitShapes(
      shapes.map((s) => (s.id === nodeTarget.id ? edited : s)),
      recordUndo,
    )
    return true
  }

  function removeSelectedNodes(): void {
    if (!nodeTarget || !nodePath || selectedNodes.length === 0) return
    const min = minNodesFor(nodeTarget)
    const next = removeNodes(nodePath, selectedNodes, min)
    if (!next) {
      showToast(COPY.vector.nodeFloor(min))
      return
    }
    applyNodeEdit(next)
    setSelectedNodes([])
  }

  function nudgeNodes(dx: number, dy: number): void {
    if (!nodePath || selectedNodes.length === 0) return
    applyNodeEdit(moveNodes(nodePath, selectedNodes, { x: dx, y: dy }))
  }

  function toggleNodePathClosed(): void {
    if (!nodePath) return
    // Fechar com 2 nós desenharia o traço de ida e volta: não é o que o botão
    // promete, e o resultado parece "não aconteceu nada".
    if (!nodePath.closed && nodePath.nodes.length < 3) {
      showToast(COPY.vector.nodeCloseNeedsThree)
      return
    }
    applyNodeEdit(setClosed(nodePath, !nodePath.closed))
  }

  /**
   * A tesoura. Fechado + um ponto = abre NAQUELE ponto (o botão "abrir" sem
   * ponto escolhido continua abrindo pelo começo, que é outra coisa: ele TIRA o
   * trecho que fechava, este aqui preserva o desenho inteiro).
   * Aberto + um ponto do miolo = dois traços.
   */
  function cutNodePath(): void {
    if (!nodeTarget || !nodePath || selectedNodes.length !== 1) return
    const index = selectedNodes[0]
    if (index === undefined) return

    if (nodePath.closed) {
      const next = openClosedPathAt(nodePath, index)
      if (!next) return
      if (!applyNodeEdit(next)) {
        showToast(COPY.vector.nodeCutTooBig)
        return
      }
      setSelectedNodes([])
      return
    }

    const halves = splitOpenPathAt(nodePath, index)
    if (!halves) {
      showToast(COPY.vector.nodeCutEndpoint)
      return
    }
    const shapes = currentShapes()
    // Lê a forma VIVA, não a do render (mesma regra do applyNodeEdit).
    const before = shapes.find((s) => s.id === nodeTarget.id)
    if (!before) return
    if (shapes.length + 1 > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    // ⭐ A metade A guarda o id ORIGINAL. Com dois ids novos, `selectedIds`
    // ficaria órfão por um render, `single` viraria null e a faixa de pontos
    // inteira sumiria da tela — leria como "quebrou".
    const first = fromEditablePath(before, halves[0])
    const second = fromEditablePath({ ...before, id: newId() }, halves[1])
    // ⚠️ `fromEditablePath` devolve a forma ORIGINAL quando o `d` estoura o
    // teto: sem esta guarda o corte duplicaria o traço inteiro.
    if (first === before || first.type !== 'path' || second.type !== 'path') {
      showToast(COPY.vector.nodeCutTooBig)
      return
    }
    const at = shapes.findIndex((s) => s.id === before.id)
    const next = [...shapes]
    next.splice(at, 1, first, second)
    commitShapes(next)
    setSelectedIds([first.id])
    setSelectedNodes([])
    showToast(COPY.vector.nodeCutDone)
  }

  function insertNodeOnSegment(segmentIndex: number, t: number): void {
    if (!nodeTarget || !nodePath) return
    if (nodeTarget.type === 'polygon' && nodePath.nodes.length >= MAX_POLYGON_POINTS) {
      showToast(COPY.vector.nodeCeiling)
      return
    }
    const next = insertNodeAt(nodePath, segmentIndex, t)
    if (!next) return
    applyNodeEdit(next)
    // ⭐ O ponto novo vira a ÚNICA escolha (e não mais um somado aos anteriores):
    // no QA, acrescentar um ponto com dois já escolhidos deixava TRÊS marcados, e
    // o Delete seguinte levaria os três. Tocar escolhe o que foi tocado, como em
    // todo o resto do editor — e, de quebra, nenhuma escolha atravessa uma edição
    // estrutural, então não existe índice velho para reindexar.
    setSelectedNodes([segmentIndex + 1])
  }

  function setSelectedSegmentsCurved(curved: boolean): void {
    if (!nodePath || selectedNodes.length === 0) return
    const segments = segmentsForNodes(nodePath, selectedNodes)
    if (segments.length === 0) return
    applyNodeEdit(setSegmentCurved(nodePath, segments, curved))
  }

  function setSelectedNodesSmooth(smooth: boolean): void {
    if (!nodePath || selectedNodes.length === 0) return
    applyNodeEdit(
      smooth ? makeSmooth(nodePath, selectedNodes) : makeCorner(nodePath, selectedNodes),
    )
  }

  /**
   * Sem ponto escolhido alcança o traço INTEIRO (como sempre); com pontos
   * escolhidos alcança só eles — o mesmo contrato `(ep, indices)` que apagar,
   * mover e curvar já usam. Escolher TODOS os pontos volta ao traço inteiro.
   */
  function simplifyNodePath(): void {
    if (!nodePath) return
    const parcial = selectedNodes.length > 0
    const antes = nodePath.nodes.length
    const next = smoothPath(nodePath, undefined, selectedNodes)
    if (!next) {
      showToast(parcial ? COPY.vector.nodeSimplifyPartDone : COPY.vector.nodeSimplifyDone)
      return
    }
    if (!applyNodeEdit(next)) {
      // `fromEditablePath` devolve a forma ORIGINAL quando o `d` estoura o teto,
      // e arredondar ENGORDA o `d` (cada reta vira cúbica): sem isto o botão
      // ficaria mudo justamente no desenho mais carregado. Recado PRÓPRIO — o da
      // tesoura fala em "cortar", que não é o que ela pediu aqui.
      showToast(parcial ? COPY.vector.nodeSimplifyPartTooBig : COPY.vector.nodeSimplifyTooBig)
      return
    }
    // ⭐ Só a edição ESTRUTURAL invalida a escolha: índice velho não sobrevive a
    // um ponto que some. Arredondar sem tirar ponto preserva os índices — e o
    // efeito do `expectedNodeStructureRef` também não dispara, porque a
    // contagem continua a mesma.
    if (next.nodes.length !== antes) setSelectedNodes([])
  }

  const value: VectorEditorContextValue = {
    doc,
    onionShapes,
    tool,
    setTool,
    style,
    customColors,
    forgetColor,
    palette,
    setPalette,
    swatches,
    selectedIds,
    setSelectedIds,
    selected,
    single,
    nodeTarget,
    nodePath,
    selectedNodes,
    setSelectedNodes,
    applyNodeEdit,
    removeSelectedNodes,
    toggleNodePathClosed,
    cutNodePath,
    insertNodeOnSegment,
    setSelectedSegmentsCurved,
    setSelectedNodesSmooth,
    simplifyNodePath,
    polygonSides,
    setPolygonSides,
    starTips,
    setStarTips,
    rectRadius,
    textAlign,
    setTextAlign,
    fontFamily,
    setFontFamily,
    insertFromAsset,
    setRectRadius,
    svgRef,
    stageRef,
    currentRef,
    currentShapes,
    commitShapes,
    updateSelected,
    rememberColor,
    applyStyle,
    adoptStyle,
    activeChannel,
    setActiveChannel,
    applyChannelColor,
    swapFillStroke,
    inspectedFill,
    currentGradient,
    applyGradient,
    clearGradient,
    hasGradient,
    colorPick,
    beginColorPick,
    endColorPick,
    cancelColorPick,
    gradientOpen,
    setGradientOpen,
    gradientButtonRef,
    moveOrder,
    duplicateSelected,
    removeSelected,
    groupSelected,
    ungroupSelected,
    pathfinderSelected,
    flipSelected,
    alignSelected,
    zoomToFit,
  }

  return <VectorEditorContext.Provider value={value}>{children}</VectorEditorContext.Provider>
}
