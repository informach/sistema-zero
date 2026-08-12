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
import { COPY } from '../../../core/copy'
import { isTextEntryTarget } from '../../../core/dom'
import { newId } from '../../../core/id'
import { DEFAULT_PALETTE_ID, type PaletteId } from '../../../core/palette'
import { PINTA_LIMITS } from '../../../core/project'
import {
  type AlignEdge,
  alignShapes,
  boundsCenter,
  boundsUnion,
  flipShape,
  shapeBounds,
  translateShape,
} from '../../../vector/geometry'
import {
  isVectorGradient,
  MAX_POLYGON_POINTS,
  type VectorFill,
  type VectorGradient,
  type VectorShape,
  type VectorStroke,
} from '../../../vector/model'
import {
  type EditablePath,
  fromEditablePath,
  insertNodeAt,
  makeCorner,
  makeSmooth,
  minNodesFor,
  moveNodes,
  removeNodes,
  segmentsForNodes,
  setClosed,
  setSegmentCurved,
  smoothPath,
  toEditablePath,
} from '../../../vector/pathNodes'
import { DEFAULT_STYLE, type ShapeStyle } from '../../../vector/shapes'
import { useToast } from '../../ui/Toast'
import { useEditor, useEditorStores, useSession } from '../editorContext'
import { useToolShortcuts } from '../useToolShortcuts'
import {
  cloneShapesWithNewIds,
  MAX_CUSTOM_COLORS,
  paletteSwatches,
  TOOL_SHORTCUTS,
  type VectorTool,
} from './vectorTools'

/** Qual "canal" de cor recebe o próximo clique na paleta. */
export type VectorColorChannel = 'fill' | 'stroke'

export interface VectorEditorContextValue {
  doc: ActiveShapesDoc
  onionShapes: VectorShape[] | null
  tool: VectorTool
  setTool: (tool: VectorTool) => void
  style: ShapeStyle
  customColors: string[]
  /** Apaga uma cor personalizada das recentes (lixeira do painel de cores). */
  forgetColor: (hex: string) => void
  paletteId: PaletteId
  setPaletteId: (id: PaletteId) => void
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
  /** Grava uma edição de nós. `recordUndo=false` durante o arrasto. */
  applyNodeEdit: (next: EditablePath, recordUndo?: boolean) => void
  removeSelectedNodes: () => void
  toggleNodePathClosed: () => void
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
  currentGradient: () => VectorGradient
  applyGradient: (partial: Partial<VectorGradient>) => void
  moveOrder: (to: 1 | -1 | 'front' | 'back') => void
  duplicateSelected: () => void
  removeSelected: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  flipSelected: (axis: 'h' | 'v') => void
  alignSelected: (edge: AlignEdge) => void
  zoomToFit: () => void
}

const VectorEditorContext = createContext<VectorEditorContextValue | null>(null)

export function useVectorEditor(): VectorEditorContextValue {
  const value = useContext(VectorEditorContext)
  if (!value) throw new Error('useVectorEditor deve ser usado dentro do VectorEditorScope')
  return value
}

export function VectorEditorScope({ children }: { children: ReactNode }): JSX.Element | null {
  const { editor, session } = useEditorStores()
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
  const [paletteId, setPaletteId] = useState<PaletteId>(DEFAULT_PALETTE_ID)
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
  // Canal de cor SELECIONADO (espelho do activeSlot do pixel): a próxima cor
  // tocada na paleta cai no preenchimento ou no contorno.
  const [activeChannel, setActiveChannel] = useState<VectorColorChannel>('fill')
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // Área de transferência (copiar/colar) — shapes clonados, vive na sessão.
  const clipboardRef = useRef<VectorShape[]>([])
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

  // Copiar/colar/selecionar-tudo (Ctrl/Cmd+C/V/A) — sempre ativo, ignora campos
  // de texto. Não colide com o desfazer/refazer do EditorScreen (Z/Y).
  // biome-ignore lint/correctness/useExhaustiveDependencies: lê estado vivo via stores/refs; só a seleção re-registra (p/ o copiar)
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey)) return
      if (isTextEntryTarget(event.target)) return
      const key = event.key.toLowerCase()
      if (key === 'a') {
        event.preventDefault()
        selectAll()
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

  const ref: ActiveFrameRef = { animationId, frameIndex }
  const doc = activeShapesOf(asset, ref)
  const selected = doc?.shapes.filter((s) => selectedIds.includes(s.id)) ?? []
  const single = selected.length === 1 ? (selected[0] ?? null) : null
  // Editar pontos é sempre de UMA forma por vez (o palco desenha os nós dela).
  const nodeTarget = tool === 'reshape' ? single : null
  const nodePath = nodeTarget ? toEditablePath(nodeTarget) : null
  const nodeStructure = nodeTarget && nodePath ? `${nodeTarget.id}:${nodePath.nodes.length}` : null

  useEffect(() => {
    const expected = expectedNodeStructureRef.current
    if (expected !== null && expected !== nodeStructure) setSelectedNodes([])
    expectedNodeStructureRef.current = nodeStructure
  }, [nodeStructure])

  // O estilo também funciona como inspetor da seleção. Undo/redo troca o
  // objeto do shape sem trocar seu id; sem esta sincronização, o desenho era
  // restaurado mas o painel (inclusive as pontas do degradê) ficava exibindo e
  // reaplicando a versão anterior.
  useEffect(() => {
    if (!single) return
    setStyle({
      fill: single.fill,
      stroke: single.stroke ? { ...single.stroke } : null,
      opacity: single.opacity,
    })
  }, [single])

  if (!doc) return null

  // Ordem da grade (espelho do pixel: base primeiro, adicionadas no fim): as 15
  // cores da paleta escolhida → as cores do JOGO (Pensa), que não podem sumir na
  // troca de paleta → as personalizadas recentes, que são as apagáveis.
  const baseSwatches = paletteSwatches(paletteId)
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
    const updated = withActiveShapes(state.asset, currentRef(), next)
    if (updated === state.asset) return
    if (recordUndo) state.commit(updated)
    else state.replace(updated)
  }

  function updateSelected(update: (shape: VectorShape) => VectorShape): void {
    if (selected.length === 0) return
    commitShapes(currentShapes().map((s) => (selectedIds.includes(s.id) ? update(s) : s)))
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

  function applyStyle(partial: Partial<ShapeStyle>): void {
    setStyle((current) => ({ ...current, ...partial }))
    if (selected.length > 0) {
      updateSelected((shape) => ({
        ...shape,
        ...(partial.fill !== undefined && shape.type !== 'line' ? { fill: partial.fill } : {}),
        ...(partial.stroke !== undefined ? { stroke: partial.stroke } : {}),
        ...(partial.opacity !== undefined ? { opacity: partial.opacity } : {}),
      }))
    }
  }

  /** Aplica uma cor da paleta (ou `'none'`) no CANAL ativo. */
  function applyChannelColor(hex: string): void {
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

  /** Degradê "de trabalho": o atual, ou um novo a partir da cor sólida vigente. */
  function currentGradient(): VectorGradient {
    if (isVectorGradient(style.fill)) return style.fill
    const from =
      typeof style.fill === 'string' && style.fill.startsWith('#') ? style.fill : '#78dc52'
    return { type: 'linear', from, to: '#ffffff', angle: 90 }
  }

  function applyGradient(partial: Partial<VectorGradient>): void {
    applyStyle({ fill: { ...currentGradient(), ...partial } })
  }

  /** Ordem-Z: um passo (±1) ou direto pro topo/fundo (front/back). */
  function moveOrder(to: 1 | -1 | 'front' | 'back'): void {
    if (!single) return
    const shapes = [...currentShapes()]
    const index = shapes.findIndex((s) => s.id === single.id)
    if (index === -1) return
    const last = shapes.length - 1
    const target = to === 'front' ? last : to === 'back' ? 0 : index + to
    if (target < 0 || target > last || target === index) return
    const [moved] = shapes.splice(index, 1)
    if (!moved) return
    shapes.splice(target, 0, moved)
    commitShapes(shapes)
  }

  function duplicateSelected(): void {
    if (selected.length === 0) return
    const shapes = currentShapes()
    if (shapes.length + selected.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    const copies = cloneShapesWithNewIds(selected)
    commitShapes([...shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }

  function removeSelected(): void {
    if (selected.length === 0) return
    commitShapes(currentShapes().filter((s) => !selectedIds.includes(s.id)))
    setSelectedIds([])
  }

  /** Agrupa a seleção (2+): passam a se mover/selecionar juntos. */
  function groupSelected(): void {
    if (selected.length < 2) return
    const gid = newId()
    commitShapes(
      currentShapes().map((s) => (selectedIds.includes(s.id) ? { ...s, groupId: gid } : s)),
    )
  }

  /** Desagrupa a seleção (tira o vínculo de grupo). */
  function ungroupSelected(): void {
    if (!selected.some((s) => s.groupId)) return
    commitShapes(
      currentShapes().map((s) =>
        selectedIds.includes(s.id) && s.groupId ? { ...s, groupId: undefined } : s,
      ),
    )
  }

  function copySelected(): void {
    if (selected.length === 0) return
    clipboardRef.current = selected.map((s) => structuredClone(s))
  }

  /** Cola o clipboard (ids/grupos NOVOS, deslocado +12,+12), selecionando as cópias. */
  function pasteClipboard(): void {
    const clip = clipboardRef.current
    if (clip.length === 0) return
    const shapes = currentShapes()
    if (shapes.length + clip.length > PINTA_LIMITS.maxShapes) {
      showToast(COPY.vector.shapeLimit)
      return
    }
    const copies = cloneShapesWithNewIds(clip)
    commitShapes([...shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }

  function selectAll(): void {
    // Só as visíveis: selecionar (e apagar) algo invisível assustaria.
    setSelectedIds(
      currentShapes()
        .filter((s) => s.hidden !== true)
        .map((s) => s.id),
    )
  }

  /** Espelha cada shape selecionado em torno do PRÓPRIO centro. */
  function flipSelected(axis: 'h' | 'v'): void {
    if (selected.length === 0) return
    commitShapes(
      currentShapes().map((s) =>
        selectedIds.includes(s.id) ? flipShape(s, axis, boundsCenter(shapeBounds(s))) : s,
      ),
    )
  }

  /**
   * Alinha a seleção: com 2+ formas, em relação à CAIXA da própria seleção;
   * com 1, em relação à TELA do documento. Um commit (desfazível de uma vez).
   */
  function alignSelected(edge: AlignEdge): void {
    if (selected.length === 0 || !doc) return
    const target =
      selected.length >= 2
        ? boundsUnion(selected.map(shapeBounds))
        : { x: 0, y: 0, width: doc.width, height: doc.height }
    commitShapes(alignShapes(currentShapes(), selectedIds, edge, target))
  }

  /** Move a seleção com as setas (Shift = passos de 10). */
  function nudgeSelected(dx: number, dy: number): void {
    if (selectedIds.length === 0) return
    commitShapes(
      currentShapes().map((s) => (selectedIds.includes(s.id) ? translateShape(s, dx, dy) : s)),
    )
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
  function applyNodeEdit(next: EditablePath, recordUndo = true): void {
    if (!nodeTarget) return
    const shapes = currentShapes()
    const before = shapes.find((s) => s.id === nodeTarget.id)
    if (!before) return
    const edited = fromEditablePath(before, next)
    if (edited === before) return
    expectedNodeStructureRef.current = `${nodeTarget.id}:${next.nodes.length}`
    commitShapes(
      shapes.map((s) => (s.id === nodeTarget.id ? edited : s)),
      recordUndo,
    )
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

  function simplifyNodePath(): void {
    if (!nodePath) return
    const next = smoothPath(nodePath)
    if (!next) {
      showToast(COPY.vector.nodeSimplifyDone)
      return
    }
    applyNodeEdit(next)
    // Suavizar mexe na estrutura (some ponto): a escolha antiga não vale mais.
    setSelectedNodes([])
  }

  const value: VectorEditorContextValue = {
    doc,
    onionShapes,
    tool,
    setTool,
    style,
    customColors,
    forgetColor,
    paletteId,
    setPaletteId,
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
    insertNodeOnSegment,
    setSelectedSegmentsCurved,
    setSelectedNodesSmooth,
    simplifyNodePath,
    polygonSides,
    setPolygonSides,
    starTips,
    setStarTips,
    rectRadius,
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
    currentGradient,
    applyGradient,
    moveOrder,
    duplicateSelected,
    removeSelected,
    groupSelected,
    ungroupSelected,
    flipSelected,
    alignSelected,
    zoomToFit,
  }

  return <VectorEditorContext.Provider value={value}>{children}</VectorEditorContext.Provider>
}
