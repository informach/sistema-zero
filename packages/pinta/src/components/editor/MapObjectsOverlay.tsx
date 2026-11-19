/**
 * Os OBJETOS do mapa por cima da grade: um `<svg>` do tamanho do canvas, com o
 * `viewBox` em PIXELS DO MAPA (o anel de "crescer o mapa" incluído), então cada
 * objeto é desenhado nas próprias coordenadas, sem conta de zoom.
 *
 * Só recebe o ponteiro quando a camada ativa é de objetos e a ferramenta é de
 * objeto (`interactive`); no resto ele só desenha e o canvas embaixo continua
 * sendo o palco. Os gestos seguem a régua do pintar: `replace` durante o arrasto
 * e `commitGesture` no fim — um desfazer por gesto.
 *
 * O hit-test é por CONTA (`objectAt` + as alças), não pelo alvo do DOM: o
 * resultado não depende de qual `<rect>` ficou por cima nem do layout.
 */
import type { JSX, PointerEvent, RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import { isTextEntryTarget } from '../../core/dom'
import { safeSetPointerCapture } from '../../core/pointer'
import {
  effectiveLayer,
  isLayerShown,
  isObjectLayer,
  type TilemapAsset,
  type TilemapObject,
  type TilemapObjectLayer,
} from '../../core/project'
import type { MapObjectToolId } from '../../state/sessionStore'
import {
  addMapObject,
  createMapObject,
  isPointObject,
  nextObjectName,
  objectAt,
  objectLayerById,
  snapToGrid,
  updateMapObject,
} from '../../tiles/mapObjects'
import {
  insertObjectPoint,
  minObjectPoints,
  moveObjectPoint,
  type ObjectHandle,
  objectBounds,
  objectFromWorldPoints,
  objectHandleAt,
  objectSegmentAt,
  objectVertexAt,
  type Point,
  removeObjectPoint,
  resizeObjectFromHandle,
} from '../../tiles/objectGeometry'
import { useToast } from '../ui/Toast'
import { useEditorStores } from './editorContext'
import { MapObjectArtwork } from './MapObjectArtwork'
import { MAP_EDITOR_LIMITS } from './mapTools/mapEditorLimits'

/** Tira o foco do campo de texto (o blur dele grava o rascunho, de forma síncrona). */
function commitFocusedField(): void {
  if (typeof document === 'undefined') return
  const active = document.activeElement
  if (active instanceof HTMLElement && isTextEntryTarget(active)) active.blur()
}

/** Cantos que mudam o tamanho de um objeto. */
type Handle = ObjectHandle

/** A forma que está sendo desenhada ponto a ponto (ainda não está no mapa). */
interface ShapeDraft {
  shape: 'polygon' | 'polyline'
  /** Os pontos já tocados, em pixels do mapa (no espaço da camada). */
  points: Point[]
}

type Gesture =
  | {
      kind: 'marquee'
      pointerId: number
      base: TilemapAsset
      objectId: ''
      start: { x: number; y: number }
      initialIds: readonly string[]
    }
  | {
      kind: 'move'
      pointerId: number
      base: TilemapAsset
      objectId: string
      start: { x: number; y: number }
      origin: { x: number; y: number }
    }
  | {
      kind: 'resize'
      pointerId: number
      base: TilemapAsset
      objectId: string
      handle: Handle
      origin: TilemapObject
    }
  | {
      kind: 'vertex'
      pointerId: number
      base: TilemapAsset
      objectId: string
      index: number
      /** O objeto como estava quando o arrasto começou (já com o ponto novo, se houve). */
      origin: TilemapObject
    }
  | {
      kind: 'create'
      pointerId: number
      base: TilemapAsset
      objectId: string
      start: { x: number; y: number }
    }

/** Tamanho das alças/marcadores em px de TELA (o desenho divide pela escala). */
const HANDLE_PX = 10
const POINT_PX = 7
const LABEL_PX = 12
/** Folga do toque em px de tela. */
const HIT_SLACK_PX = 8
/** Raio do alvo de toque das alças e dos pontos (44 px de um lado ao outro). */
const TOUCH_REACH_PX = MAP_EDITOR_LIMITS.touchTargetPx / 2
const VERTEX_PX = 6

interface MapObjectsOverlayProps {
  tilemap: TilemapAsset
  /** A camada de objetos ativa (`null` = a ativa é de peças: só desenha). */
  activeLayerId: string | null
  /** A camada ativa é de objetos E a ferramenta é de objeto. */
  interactive: boolean
  tool: MapObjectToolId | null
  tileSize: number
  /** Células do anel de "crescer o mapa" ao redor da grade (0 ou 1). */
  pad: number
  /** Px de tela por px do mapa (o zoom real da célula). */
  scale: number
  snap: boolean
  selectedObjectId: string | null
  selectedObjectIds?: readonly string[]
  onSelectObject: (id: string | null, additive?: boolean) => void
  onSelectObjects?: (ids: string[]) => void
  /** O palco põe aqui o "apagar o ponto escolhido" (o Delete chama antes de apagar o objeto). */
  deleteVertexRef?: RefObject<() => boolean>
  /** Objetos provisórios do pincel; não pertencem ainda ao documento do editor. */
  previewIds?: readonly string[]
}

export function MapObjectsOverlay({
  tilemap,
  activeLayerId,
  interactive,
  tool,
  tileSize,
  pad,
  scale,
  snap,
  selectedObjectId,
  selectedObjectIds = [],
  onSelectObject,
  onSelectObjects,
  deleteVertexRef,
  previewIds = [],
}: MapObjectsOverlayProps): JSX.Element {
  const { editor } = useEditorStores()
  const { showToast } = useToast()
  const previewSet = new Set(previewIds)
  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const [marquee, setMarquee] = useState<{
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  const [draft, setDraft] = useState<ShapeDraft | null>(null)
  const draftRef = useRef<ShapeDraft | null>(null)
  const [cursor, setCursor] = useState<Point | null>(null)
  const [vertex, setVertex] = useState<{ objectId: string; index: number } | null>(null)
  function changeDraft(next: ShapeDraft | null): void {
    draftRef.current = next
    setDraft(next)
    if (!next) setCursor(null)
  }

  const mapW = tilemap.cols * tileSize
  const mapH = tilemap.rows * tileSize
  const ring = pad * tileSize
  const unit = 1 / Math.max(scale, 0.0001)

  /** Ponteiro → pixels do mapa (pela caixa REAL do svg, como o canvas faz com a dele). */
  function pointFromEvent(event: PointerEvent<SVGSVGElement>): { x: number; y: number } {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 }
    const viewW = mapW + 2 * ring
    const viewH = mapH + 2 * ring
    return {
      x:
        ((event.clientX - rect.left) * viewW) / rect.width -
        ring -
        (activeLayerId
          ? effectiveLayer(tilemap, tilemap.layers.find((l) => l.id === activeLayerId)!).offsetX
          : 0),
      y:
        ((event.clientY - rect.top) * viewH) / rect.height -
        ring -
        (activeLayerId
          ? effectiveLayer(tilemap, tilemap.layers.find((l) => l.id === activeLayerId)!).offsetY
          : 0),
    }
  }

  const clampX = (x: number, width = 0): number => Math.min(Math.max(x, 0), mapW - width)
  const clampY = (y: number, height = 0): number => Math.min(Math.max(y, 0), mapH - height)
  /** Canto de retângulo: na linha da grade com o encaixe ligado. */
  const snapEdge = (value: number): number =>
    snap ? snapToGrid(value, tileSize) : Math.round(value)
  /** Ponto: no MEIO da peça com o encaixe ligado ("o ponto está naquela casa"). */
  const snapPoint = (value: number): number =>
    snap ? Math.floor(value / tileSize) * tileSize + tileSize / 2 : Math.round(value)

  function currentLayer(): TilemapObjectLayer | null {
    const asset = editor.getState().asset
    if (asset.kind !== 'tilemap' || !activeLayerId) return null
    return objectLayerById(asset, activeLayerId)
  }

  /**
   * O alcance do toque numa alça ou num ponto: 22 px de tela para cada lado (alvo de 44 px),
   * mas nunca mais de um terço do objeto, senão um objeto pequeno seria só alças e não daria
   * para arrastar pelo meio.
   */
  function touchReach(object: TilemapObject): number {
    const small = Math.min(object.width, object.height) / 3
    return Math.max((HANDLE_PX / 2 + 2) * unit, Math.min(TOUCH_REACH_PX * unit, small))
  }

  /** A alça de canto sob o toque. Vale também para o objeto girado. */
  function handleAt(object: TilemapObject, x: number, y: number): Handle | null {
    if (isPointObject(object)) return null
    return objectHandleAt(object, x, y, touchReach(object))
  }

  const hasPoints = (object: TilemapObject): boolean =>
    (object.shape === 'polygon' || object.shape === 'polyline') && !!object.points?.length

  // ---- Forma desenhada ponto a ponto ------------------------------------
  /** Fecha a forma: ela entra no mapa de uma vez (um desfazer). */
  function finishDraft(): void {
    const current = draftRef.current
    if (!current || !activeLayerId) return
    const min = minObjectPoints(current.shape)
    if (current.points.length < min) {
      showToast(COPY.scene.formaPrecisaDePontos(min))
      return
    }
    const state = editor.getState()
    const layer = currentLayer()
    if (state.asset.kind !== 'tilemap' || !layer) return
    const object = createMapObject({
      name: nextObjectName(layer),
      shape: current.shape,
      ...objectFromWorldPoints(current.points),
    })
    const next = addMapObject(state.asset, activeLayerId, object)
    changeDraft(null)
    if (next === state.asset) {
      showToast(COPY.tiles.objectLimit)
      return
    }
    state.commit(next)
    onSelectObject(object.id)
  }

  /** Um toque enquanto a forma é desenhada: fecha no primeiro ponto ou põe mais um. */
  function draftTap(shape: ShapeDraft['shape'], raw: Point): void {
    const p = { x: clampX(snapEdge(raw.x)), y: clampY(snapEdge(raw.y)) }
    const current = draftRef.current
    if (!current) {
      changeDraft({ shape, points: [p] })
      setCursor(p)
      showToast(COPY.scene.comoDesenharAForma)
      return
    }
    const first = current.points[0],
      last = current.points.at(-1)
    if (
      first &&
      current.points.length >= minObjectPoints(shape) &&
      Math.hypot(raw.x - first.x, raw.y - first.y) <= TOUCH_REACH_PX * unit
    ) {
      finishDraft()
      return
    }
    // O segundo toque de um toque duplo cai no mesmo lugar: não vira ponto repetido.
    if (last && last.x === p.x && last.y === p.y) return
    if (current.points.length >= MAP_EDITOR_LIMITS.maxObjectPoints) {
      showToast(COPY.scene.formaCheiaDePontos(MAP_EDITOR_LIMITS.maxObjectPoints))
      return
    }
    changeDraft({ shape, points: [...current.points, p] })
  }

  // Trocar de ferramenta ou de camada no meio da forma joga o rascunho fora.
  // biome-ignore lint/correctness/useExhaustiveDependencies: os gatilhos são a ferramenta e a camada
  useEffect(() => {
    changeDraft(null)
    setVertex(null)
  }, [tool, activeLayerId])
  // O ponto escolhido é do objeto escolhido: outra escolha larga o ponto.
  useEffect(() => {
    setVertex((old) => (old && old.objectId === selectedObjectId ? old : null))
  }, [selectedObjectId])

  // Enter fecha a forma e Esc cancela. Em captura: vale antes dos outros atalhos do editor.
  // biome-ignore lint/correctness/useExhaustiveDependencies: as funções leem o rascunho pelo ref
  useEffect(() => {
    if (!draft) return
    function onKeyDown(event: KeyboardEvent): void {
      if (isTextEntryTarget(event.target)) return
      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        finishDraft()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        changeDraft(null)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [draft !== null])

  /** O Delete com um ponto escolhido tira o ponto (o objeto fica). */
  function deleteVertex(): boolean {
    if (!vertex || !activeLayerId) return false
    const state = editor.getState()
    const object = currentLayer()?.objects.find((o) => o.id === vertex.objectId)
    if (state.asset.kind !== 'tilemap' || !object || !hasPoints(object)) return false
    const patch = removeObjectPoint(object, vertex.index)
    if (!patch) {
      showToast(COPY.scene.formaPrecisaDePontos(minObjectPoints(object.shape)))
      return true
    }
    const next = updateMapObject(state.asset, activeLayerId, object.id, patch)
    if (next !== state.asset) state.commit(next)
    setVertex(null)
    return true
  }
  if (deleteVertexRef) deleteVertexRef.current = interactive ? deleteVertex : () => false

  function apply(next: TilemapAsset): void {
    const state = editor.getState()
    if (next !== state.asset) state.replace(next)
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>): void {
    if (!interactive || !event.isPrimary || gestureRef.current || !activeLayerId) return
    // O campo do painel com rascunho grava AGORA, antes de o toque trocar a seleção ou criar
    // um objeto: o blur do navegador viria depois deste gesto, e o desfazer do gesto
    // (`commitGesture(base)`) engoliria a edição do campo.
    commitFocusedField()
    const asset = editor.getState().asset
    const layer = currentLayer()
    if (asset.kind !== 'tilemap' || !layer) return
    if (effectiveLayer(asset, layer).locked) {
      showToast(COPY.layers.lockedWarning)
      return
    }
    const p = pointFromEvent(event)
    // Desenhando uma forma: cada toque é um ponto (nada de arrastar objeto no meio).
    if (draftRef.current && (tool === 'object-polygon' || tool === 'object-polyline')) {
      draftTap(draftRef.current.shape, p)
      return
    }
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    // Alça do escolhido vem primeiro (fica por cima de tudo na tela).
    const selected = layer.objects.find((object) => object.id === selectedObjectId) ?? null
    // Os pontos da forma escolhida: tocar num ponto arrasta ele; tocar num trecho põe um
    // ponto novo ali e já arrasta. Tudo dentro de um desfazer só.
    if (selected && hasPoints(selected)) {
      const reach = touchReach(selected)
      let index = objectVertexAt(selected, p.x, p.y, reach)
      let origin = selected
      if (index < 0) {
        const at = objectSegmentAt(selected, p.x, p.y, HIT_SLACK_PX * unit)
        const patch =
          at >= 0 ? insertObjectPoint(selected, at, p, MAP_EDITOR_LIMITS.maxObjectPoints) : null
        if (at >= 0 && !patch)
          showToast(COPY.scene.formaCheiaDePontos(MAP_EDITOR_LIMITS.maxObjectPoints))
        if (patch) {
          const next = updateMapObject(asset, activeLayerId, selected.id, patch)
          const inserted = objectLayerById(next, activeLayerId)?.objects.find(
            (o) => o.id === selected.id,
          )
          if (inserted && next !== asset) {
            apply(next)
            origin = inserted
            index = at
          }
        }
      }
      if (index >= 0) {
        setVertex({ objectId: selected.id, index })
        gestureRef.current = {
          kind: 'vertex',
          pointerId: event.pointerId,
          base: asset,
          objectId: selected.id,
          index,
          origin,
        }
        return
      }
    }
    const handle = selected ? handleAt(selected, p.x, p.y) : null
    if (selected && handle) {
      gestureRef.current = {
        kind: 'resize',
        pointerId: event.pointerId,
        base: asset,
        objectId: selected.id,
        handle,
        origin: selected,
      }
      return
    }
    // Tocar num objeto (com qualquer ferramenta de objeto) escolhe e começa a arrastar.
    const hit = objectAt(layer, p.x, p.y, HIT_SLACK_PX * unit)
    if (hit) {
      setVertex(null)
      onSelectObject(hit.id, event.shiftKey || event.metaKey || event.ctrlKey)
      gestureRef.current = {
        kind: 'move',
        pointerId: event.pointerId,
        base: asset,
        objectId: hit.id,
        start: p,
        origin: { x: hit.x, y: hit.y },
      }
      return
    }
    if (tool === 'object-select') {
      const additive = event.shiftKey || event.ctrlKey || event.metaKey
      gestureRef.current = {
        kind: 'marquee',
        pointerId: event.pointerId,
        base: asset,
        objectId: '',
        start: p,
        initialIds: additive ? [...selectedObjectIds] : [],
      }
      if (!additive) {
        if (onSelectObjects) onSelectObjects([])
        else onSelectObject(null)
      }
      setMarquee({ x: p.x, y: p.y, width: 0, height: 0 })
      return
    }
    if (p.x < 0 || p.y < 0 || p.x > mapW || p.y > mapH) {
      onSelectObject(null)
      return
    }
    // Polígono e linha nascem ponto a ponto: este toque é o primeiro ponto.
    if (tool === 'object-polygon' || tool === 'object-polyline') {
      draftTap(tool === 'object-polygon' ? 'polygon' : 'polyline', p)
      return
    }
    // Ponto ou área nova: nasce já no mapa (via `replace`) e o arrasto continua o gesto.
    const isPoint = tool === 'object-point'
    const object = createMapObject({
      name: nextObjectName(layer),
      ...(tool === 'object-ellipse' ? { shape: 'ellipse' as const } : {}),
      x: isPoint ? clampX(snapPoint(p.x)) : clampX(snapEdge(p.x)),
      y: isPoint ? clampY(snapPoint(p.y)) : clampY(snapEdge(p.y)),
    })
    const next = addMapObject(asset, activeLayerId, object)
    if (next === asset) {
      showToast(COPY.tiles.objectLimit)
      return
    }
    apply(next)
    onSelectObject(object.id)
    gestureRef.current = isPoint
      ? {
          kind: 'move',
          pointerId: event.pointerId,
          base: asset,
          objectId: object.id,
          start: p,
          origin: { x: object.x, y: object.y },
        }
      : {
          kind: 'create',
          pointerId: event.pointerId,
          base: asset,
          objectId: object.id,
          start: { x: object.x, y: object.y },
        }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current
    // Sem gesto, com uma forma sendo desenhada: o trecho de prévia segue o ponteiro.
    if (!gesture && draftRef.current) {
      const raw = pointFromEvent(event)
      setCursor({ x: clampX(snapEdge(raw.x)), y: clampY(snapEdge(raw.y)) })
      return
    }
    if (!gesture || event.pointerId !== gesture.pointerId || !activeLayerId) return
    const asset = editor.getState().asset
    if (asset.kind !== 'tilemap') return
    if (gesture.kind === 'vertex') {
      const raw = pointFromEvent(event)
      // Sempre a partir do objeto do COMEÇO do arrasto: o ponto não escorrega por arredondar.
      const patch = moveObjectPoint(gesture.origin, gesture.index, {
        x: clampX(snapEdge(raw.x)),
        y: clampY(snapEdge(raw.y)),
      })
      if (patch) apply(updateMapObject(asset, activeLayerId, gesture.objectId, patch))
      return
    }
    if (gesture.kind === 'marquee') {
      const p = pointFromEvent(event),
        r = {
          x: Math.min(p.x, gesture.start.x),
          y: Math.min(p.y, gesture.start.y),
          width: Math.abs(p.x - gesture.start.x),
          height: Math.abs(p.y - gesture.start.y),
        }
      setMarquee(r)
      const ids = (currentLayer()?.objects ?? [])
        .filter((o) => {
          const b = objectBounds(o)
          return (
            b.x >= r.x &&
            b.y >= r.y &&
            b.x + b.width <= r.x + r.width &&
            b.y + b.height <= r.y + r.height
          )
        })
        .map((o) => o.id)
      onSelectObjects?.([...new Set([...gesture.initialIds, ...ids])])
      return
    }
    const object = currentLayer()?.objects.find((o) => o.id === gesture.objectId)
    if (!object) return
    const p = pointFromEvent(event)
    if (gesture.kind === 'move') {
      const rawX = gesture.origin.x + (p.x - gesture.start.x)
      const rawY = gesture.origin.y + (p.y - gesture.start.y)
      const point = isPointObject(object)
      const x = clampX(point ? snapPoint(rawX) : snapEdge(rawX), object.width)
      const y = clampY(point ? snapPoint(rawY) : snapEdge(rawY), object.height)
      let next = updateMapObject(asset, activeLayerId, object.id, { x, y })
      const baseLayer = objectLayerById(gesture.base, activeLayerId)
      for (const original of baseLayer?.objects ?? [])
        if (original.id !== object.id && selectedObjectIds.includes(original.id))
          next = updateMapObject(next, activeLayerId, original.id, {
            x: original.x + x - gesture.origin.x,
            y: original.y + y - gesture.origin.y,
          })
      apply(next)
      return
    }
    if (gesture.kind === 'create') {
      const endX = clampX(snapEdge(p.x))
      const endY = clampY(snapEdge(p.y))
      apply(
        updateMapObject(asset, activeLayerId, object.id, {
          x: Math.min(gesture.start.x, endX),
          y: Math.min(gesture.start.y, endY),
          width: Math.abs(endX - gesture.start.x),
          height: Math.abs(endY - gesture.start.y),
        }),
      )
      return
    }
    // Mudar o tamanho: o canto do outro lado fica parado no mapa, mesmo com o objeto girado
    // (a conta leva o ponteiro para o espaço do objeto). Passar do canto parado troca os lados.
    const turned = !!gesture.origin.rotation
    apply(
      updateMapObject(
        asset,
        activeLayerId,
        object.id,
        resizeObjectFromHandle(gesture.origin, gesture.handle, {
          x: turned ? p.x : clampX(snapEdge(p.x)),
          y: turned ? p.y : clampY(snapEdge(p.y)),
        }),
      ),
    )
  }

  function endGesture(event: PointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    gestureRef.current = null
    if (gesture.kind === 'marquee') {
      setMarquee(null)
      return
    }
    const state = editor.getState()
    const asset = state.asset
    // Área desenhada sem arrastar (ou só numa direção) vira UMA peça de tamanho:
    // retângulo de largura zero seria um ponto disfarçado.
    if (gesture.kind === 'create' && asset.kind === 'tilemap' && activeLayerId) {
      const object = objectLayerById(asset, activeLayerId)?.objects.find(
        (o) => o.id === gesture.objectId,
      )
      if (object && (object.width === 0 || object.height === 0)) {
        state.replace(
          updateMapObject(asset, activeLayerId, object.id, {
            width: object.width || Math.min(tileSize, mapW - object.x) || 1,
            height: object.height || Math.min(tileSize, mapH - object.y) || 1,
          }),
        )
      }
    }
    state.commitGesture(gesture.base)
  }

  const activeLayer = activeLayerId ? tilemap.layers.find((l) => l.id === activeLayerId) : null
  const layerOffset = activeLayer
    ? effectiveLayer(tilemap, activeLayer)
    : { offsetX: 0, offsetY: 0 }
  const layers = tilemap.layers
    .filter(isObjectLayer)
    .filter((layer) => isLayerShown(tilemap, layer))

  return (
    <svg
      ref={svgRef}
      aria-label={COPY.tiles.objectsOverlay}
      data-pin-objects-overlay=""
      className="absolute inset-0 block h-full w-full"
      viewBox={`${-ring} ${-ring} ${mapW + 2 * ring} ${mapH + 2 * ring}`}
      preserveAspectRatio="none"
      style={{
        pointerEvents: interactive ? 'auto' : 'none',
        touchAction: 'none',
        cursor: interactive ? (tool === 'object-select' ? 'default' : 'crosshair') : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onDoubleClick={() => {
        if (draftRef.current) finishDraft()
      }}
    >
      <title>{COPY.tiles.objectsOverlay}</title>
      {marquee ? (
        <rect
          x={
            marquee.x +
            (activeLayerId
              ? effectiveLayer(tilemap, tilemap.layers.find((l) => l.id === activeLayerId)!).offsetX
              : 0)
          }
          y={
            marquee.y +
            (activeLayerId
              ? effectiveLayer(tilemap, tilemap.layers.find((l) => l.id === activeLayerId)!).offsetY
              : 0)
          }
          width={marquee.width}
          height={marquee.height}
          fill="var(--color-pin-accent)"
          fillOpacity={0.15}
          stroke="var(--color-pin-accent)"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {layers.map((layer) => {
        const active = layer.id === activeLayerId
        return (
          <g
            key={layer.id}
            data-layer-id={layer.id}
            opacity={(active ? 1 : 0.45) * effectiveLayer(tilemap, layer).opacity}
            transform={`translate(${effectiveLayer(tilemap, layer).offsetX} ${effectiveLayer(tilemap, layer).offsetY})`}
          >
            {layer.objects.map((object) => (
              <g
                key={object.id}
                data-pin-scatter-preview={previewSet.has(object.id) ? object.id : undefined}
                opacity={previewSet.has(object.id) ? 0.6 : undefined}
                transform={`rotate(${object.rotation ?? 0} ${object.x} ${object.y})`}
              >
                <MapObjectShape
                  key={object.id}
                  object={object}
                  showLabel={!previewSet.has(object.id)}
                  unit={unit}
                  vertexIndex={
                    active && interactive && object.id === selectedObjectId && vertex
                      ? vertex.index
                      : -1
                  }
                  showVertices={active && interactive && object.id === selectedObjectId}
                  selected={
                    active &&
                    (object.id === selectedObjectId || selectedObjectIds.includes(object.id))
                  }
                />
                {object.art || object.setId ? (
                  <g
                    transform={`translate(${object.flipX ? 2 * object.x + object.width : 0} ${object.flipY ? 2 * object.y + object.height : 0}) scale(${object.flipX ? -1 : 1} ${object.flipY ? -1 : 1})`}
                  >
                    <MapObjectArtwork object={object} />
                  </g>
                ) : null}
              </g>
            ))}
          </g>
        )
      })}
      {draft ? (
        <g
          data-shape-draft={draft.shape}
          transform={`translate(${layerOffset.offsetX} ${layerOffset.offsetY})`}
          pointerEvents="none"
        >
          <path
            d={[...draft.points, ...(cursor ? [cursor] : [])]
              .map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`)
              .join(' ')}
            fill="none"
            stroke="var(--color-pin-accent, #2563eb)"
            strokeWidth={2}
            strokeDasharray="6 3"
            vectorEffect="non-scaling-stroke"
          />
          {draft.points.map((p, i) => (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: os pontos do rascunho só crescem no fim
              key={i}
              data-draft-point={i}
              cx={p.x}
              cy={p.y}
              r={(i === 0 ? VERTEX_PX + 2 : VERTEX_PX) * unit}
              fill={
                i === 0 ? 'var(--color-pin-accent, #2563eb)' : 'var(--color-pin-surface, #ffffff)'
              }
              stroke="var(--color-pin-accent, #2563eb)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      ) : null}
    </svg>
  )
}

function MapObjectShape({
  object,
  unit,
  selected,
  showLabel = true,
  showVertices = false,
  vertexIndex = -1,
}: {
  object: TilemapObject
  unit: number
  selected: boolean
  showLabel?: boolean
  /** Mostra as bolinhas dos pontos da forma (só no objeto escolhido da camada ativa). */
  showVertices?: boolean
  /** O ponto escolhido (fica cheio). */
  vertexIndex?: number
}): JSX.Element {
  const label = showLabel ? object.name || object.type : ''
  const stroke = selected ? 'var(--color-pin-accent, #2563eb)' : 'var(--color-pin-text, #1f2937)'
  if (isPointObject(object)) {
    const r = POINT_PX * unit
    return (
      <g data-object-id={object.id} data-object-kind="point">
        <circle
          cx={object.x}
          cy={object.y}
          r={r}
          fill="var(--color-pin-accent, #2563eb)"
          fillOpacity={0.35}
          stroke={stroke}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M ${object.x - r} ${object.y} H ${object.x + r} M ${object.x} ${object.y - r} V ${object.y + r}`}
          stroke={stroke}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {label ? (
          <ObjectLabel x={object.x + r * 1.4} y={object.y - r} unit={unit} text={label} />
        ) : null}
      </g>
    )
  }
  const handle = HANDLE_PX * unit
  return (
    <g data-object-id={object.id} data-object-kind="rect">
      <path
        d={
          object.shape === 'ellipse'
            ? `M ${object.x} ${object.y + object.height / 2} a ${object.width / 2} ${object.height / 2} 0 1 0 ${object.width} 0 a ${object.width / 2} ${object.height / 2} 0 1 0 ${-object.width} 0`
            : object.points?.length
              ? object.points
                  .map((p, i) => `${i ? 'L' : 'M'} ${p.x + object.x} ${p.y + object.y}`)
                  .join(' ') + (object.shape === 'polygon' ? ' Z' : '')
              : `M ${object.x} ${object.y} h ${object.width} v ${object.height} h ${-object.width} Z`
        }
        fill={object.shape === 'polyline' ? 'none' : 'var(--color-pin-accent, #2563eb)'}
        fillOpacity={selected ? 0.22 : 0.12}
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray={selected ? '6 3' : undefined}
        vectorEffect="non-scaling-stroke"
      />
      {label ? (
        <ObjectLabel x={object.x + 2 * unit} y={object.y - 3 * unit} unit={unit} text={label} />
      ) : null}
      {selected
        ? [
            [object.x, object.y],
            [object.x + object.width, object.y],
            [object.x, object.y + object.height],
            [object.x + object.width, object.y + object.height],
          ].map(([cx = 0, cy = 0]) => (
            <rect
              key={`${cx}-${cy}`}
              data-handle=""
              x={cx - handle / 2}
              y={cy - handle / 2}
              width={handle}
              height={handle}
              fill="var(--color-pin-surface, #ffffff)"
              stroke="var(--color-pin-accent, #2563eb)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ))
        : null}
      {showVertices && object.points?.length
        ? object.points.map((p, i) => (
            <g
              // biome-ignore lint/suspicious/noArrayIndexKey: o ponto é a posição dele na lista
              key={i}
              data-vertex={i}
              data-vertex-selected={i === vertexIndex ? '' : undefined}
            >
              <title>{COPY.scene.pontoDaForma(i + 1)}</title>
              {/* O alvo de toque de 44 px (sem tinta) e a bolinha que se vê. */}
              <circle
                cx={object.x + p.x}
                cy={object.y + p.y}
                r={TOUCH_REACH_PX * unit}
                fill="transparent"
              />
              <circle
                cx={object.x + p.x}
                cy={object.y + p.y}
                r={VERTEX_PX * unit}
                fill={
                  i === vertexIndex
                    ? 'var(--color-pin-accent, #2563eb)'
                    : 'var(--color-pin-surface, #ffffff)'
                }
                stroke="var(--color-pin-accent, #2563eb)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))
        : null}
    </g>
  )
}

/** Nome do objeto, com contorno claro para ler sobre qualquer peça. */
function ObjectLabel({
  x,
  y,
  unit,
  text,
}: {
  x: number
  y: number
  unit: number
  text: string
}): JSX.Element {
  return (
    <text
      x={x}
      y={y}
      fontSize={LABEL_PX * unit}
      fontWeight={700}
      fill="var(--color-pin-text, #1f2937)"
      stroke="var(--color-pin-surface, #ffffff)"
      strokeWidth={3}
      paintOrder="stroke"
      vectorEffect="non-scaling-stroke"
      style={{ userSelect: 'none' }}
    >
      {text}
    </text>
  )
}
