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
import { newId } from '../../../core/id'
import { PINTA_LIMITS } from '../../../core/project'
import { boundsCenter, flipShape, shapeBounds, translateShape } from '../../../vector/geometry'
import { isVectorGradient, type VectorGradient, type VectorShape } from '../../../vector/model'
import { DEFAULT_STYLE, type ShapeStyle } from '../../../vector/shapes'
import { useToast } from '../../ui/Toast'
import { useEditor, useEditorStores, useSession } from '../editorContext'
import { useToolShortcuts } from '../useToolShortcuts'
import {
  MAX_CUSTOM_COLORS,
  SWATCH_SET,
  SWATCHES,
  TOOL_SHORTCUTS,
  type VectorTool,
} from './vectorTools'

export interface VectorEditorContextValue {
  doc: ActiveShapesDoc
  onionShapes: VectorShape[] | null
  tool: VectorTool
  setTool: (tool: VectorTool) => void
  style: ShapeStyle
  customColors: string[]
  swatches: string[]
  selectedIds: string[]
  setSelectedIds: Dispatch<SetStateAction<string[]>>
  selected: VectorShape[]
  single: VectorShape | null
  polygonSides: number
  setPolygonSides: (value: number) => void
  starTips: number
  setStarTips: (value: number) => void
  svgRef: RefObject<SVGSVGElement | null>
  stageRef: RefObject<HTMLDivElement | null>
  currentRef: () => ActiveFrameRef
  currentShapes: () => VectorShape[]
  commitShapes: (next: VectorShape[], recordUndo?: boolean) => void
  updateSelected: (update: (shape: VectorShape) => VectorShape) => void
  rememberColor: (hex: string) => void
  applyStyle: (partial: Partial<ShapeStyle>) => void
  adoptStyle: (partial: Partial<ShapeStyle>) => void
  currentGradient: () => VectorGradient
  applyGradient: (partial: Partial<VectorGradient>) => void
  moveOrder: (to: 1 | -1 | 'front' | 'back') => void
  duplicateSelected: () => void
  removeSelected: () => void
  groupSelected: () => void
  ungroupSelected: () => void
  flipSelected: (axis: 'h' | 'v') => void
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
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Lados do polígono / pontas da estrela (configuráveis quando a ferramenta ativa).
  const [polygonSides, setPolygonSides] = useState(6)
  const [starTips, setStarTips] = useState(5)
  const svgRef = useRef<SVGSVGElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // Área de transferência (copiar/colar) — shapes clonados, vive na sessão.
  const clipboardRef = useRef<VectorShape[]>([])

  // Trocar de quadro/tile é trocar de documento: a seleção não migra. (A prévia
  // e o gesto em andamento são resetados pelo VectorStage, dono deles.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: as deps são o GATILHO (mudou o quadro/tile ativo), não leituras
  useEffect(() => {
    setSelectedIds([])
  }, [animationId, frameIndex])

  // Atalhos de teclado da seleção (Delete apaga; setas movem, Shift = 10) —
  // no window, sem exigir foco no palco; campos de texto são ignorados.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o handler lê o estado vivo via stores; só a seleção re-registra
  useEffect(() => {
    if (selectedIds.length === 0) return
    function onKeyDown(event: globalThis.KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
      const step = event.shiftKey ? 10 : 1
      switch (event.key) {
        case 'Delete':
        case 'Backspace':
          event.preventDefault()
          removeSelected()
          return
        case 'ArrowLeft':
          event.preventDefault()
          nudgeSelected(-step, 0)
          return
        case 'ArrowRight':
          event.preventDefault()
          nudgeSelected(step, 0)
          return
        case 'ArrowUp':
          event.preventDefault()
          nudgeSelected(0, -step)
          return
        case 'ArrowDown':
          event.preventDefault()
          nudgeSelected(0, step)
          return
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedIds])

  // Copiar/colar/selecionar-tudo (Ctrl/Cmd+C/V/A) — sempre ativo, ignora campos
  // de texto. Não colide com o desfazer/refazer do EditorScreen (Z/Y).
  // biome-ignore lint/correctness/useExhaustiveDependencies: lê estado vivo via stores/refs; só a seleção re-registra (p/ o copiar)
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return
      }
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
  if (!doc) return null

  // Paleta do JOGO (Pensa) entra na frente das cores fixas, sem duplicar. Só
  // no vetor (cor livre) — o bitmap é indexado em 16 cores e não muda. As cores
  // personalizadas recentes (conta-gotas/seletor) vêm na frente de tudo.
  const projectSwatches = (asset.projectRef?.palette ?? []).filter((hex) => !SWATCH_SET.has(hex))
  const baseSwatches = [...projectSwatches, ...SWATCHES]
  const extraCustom = customColors.filter((hex) => !baseSwatches.includes(hex))
  const swatches = [...extraCustom, ...baseSwatches]

  const onionShapes = onion ? previousShapesOf(asset, ref) : null
  const selected = doc.shapes.filter((s) => selectedIds.includes(s.id))
  const single = selected.length === 1 ? (selected[0] ?? null) : null

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
    const copies = selected.map((s) => ({ ...translateShape(s, 12, 12), id: newId() }))
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
    const groupMap = new Map<string, string>()
    const copies = clip.map((s) => {
      const moved = translateShape({ ...structuredClone(s), id: newId() }, 12, 12)
      if (!s.groupId) return moved
      const gid = groupMap.get(s.groupId) ?? newId()
      groupMap.set(s.groupId, gid)
      return { ...moved, groupId: gid }
    })
    commitShapes([...shapes, ...copies])
    setSelectedIds(copies.map((c) => c.id))
  }

  function selectAll(): void {
    setSelectedIds(currentShapes().map((s) => s.id))
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

  const value: VectorEditorContextValue = {
    doc,
    onionShapes,
    tool,
    setTool,
    style,
    customColors,
    swatches,
    selectedIds,
    setSelectedIds,
    selected,
    single,
    polygonSides,
    setPolygonSides,
    starTips,
    setStarTips,
    svgRef,
    stageRef,
    currentRef,
    currentShapes,
    commitShapes,
    updateSelected,
    rememberColor,
    applyStyle,
    adoptStyle,
    currentGradient,
    applyGradient,
    moveOrder,
    duplicateSelected,
    removeSelected,
    groupSelected,
    ungroupSelected,
    flipSelected,
    zoomToFit,
  }

  return <VectorEditorContext.Provider value={value}>{children}</VectorEditorContext.Provider>
}
