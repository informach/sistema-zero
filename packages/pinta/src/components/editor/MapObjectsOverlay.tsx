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
import type { JSX, PointerEvent } from 'react'
import { useRef } from 'react'
import { COPY } from '../../core/copy'
import { isTextEntryTarget } from '../../core/dom'
import { safeSetPointerCapture } from '../../core/pointer'
import {
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
import { useToast } from '../ui/Toast'
import { useEditorStores } from './editorContext'

/** Tira o foco do campo de texto (o blur dele grava o rascunho, de forma síncrona). */
function commitFocusedField(): void {
  if (typeof document === 'undefined') return
  const active = document.activeElement
  if (active instanceof HTMLElement && isTextEntryTarget(active)) active.blur()
}

/** Cantos que redimensionam um retângulo. */
type Handle = 'nw' | 'ne' | 'sw' | 'se'

type Gesture =
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
      origin: { x: number; y: number; width: number; height: number }
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
  onSelectObject: (id: string | null) => void
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
  onSelectObject,
}: MapObjectsOverlayProps): JSX.Element {
  const { editor } = useEditorStores()
  const { showToast } = useToast()
  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<Gesture | null>(null)

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
      x: ((event.clientX - rect.left) * viewW) / rect.width - ring,
      y: ((event.clientY - rect.top) * viewH) / rect.height - ring,
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

  function handleAt(object: TilemapObject, x: number, y: number): Handle | null {
    if (isPointObject(object)) return null
    const reach = (HANDLE_PX / 2 + 2) * unit
    const corners: Array<[Handle, number, number]> = [
      ['nw', object.x, object.y],
      ['ne', object.x + object.width, object.y],
      ['sw', object.x, object.y + object.height],
      ['se', object.x + object.width, object.y + object.height],
    ]
    for (const [handle, cx, cy] of corners) {
      if (Math.abs(x - cx) <= reach && Math.abs(y - cy) <= reach) return handle
    }
    return null
  }

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
    safeSetPointerCapture(event.currentTarget, event.pointerId)
    const p = pointFromEvent(event)
    // Alça do escolhido vem primeiro (fica por cima de tudo na tela).
    const selected = layer.objects.find((object) => object.id === selectedObjectId) ?? null
    const handle = selected ? handleAt(selected, p.x, p.y) : null
    if (selected && handle) {
      gestureRef.current = {
        kind: 'resize',
        pointerId: event.pointerId,
        base: asset,
        objectId: selected.id,
        handle,
        origin: { x: selected.x, y: selected.y, width: selected.width, height: selected.height },
      }
      return
    }
    // Tocar num objeto (com qualquer ferramenta de objeto) escolhe e começa a arrastar.
    const hit = objectAt(layer, p.x, p.y, HIT_SLACK_PX * unit)
    if (hit) {
      onSelectObject(hit.id)
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
    if (tool === 'object-select' || p.x < 0 || p.y < 0 || p.x > mapW || p.y > mapH) {
      onSelectObject(null)
      return
    }
    // Ponto ou área nova: nasce já no mapa (via `replace`) e o arrasto continua o gesto.
    const isPoint = tool === 'object-point'
    const object = createMapObject({
      name: nextObjectName(layer),
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
    if (!gesture || event.pointerId !== gesture.pointerId || !activeLayerId) return
    const asset = editor.getState().asset
    if (asset.kind !== 'tilemap') return
    const object = currentLayer()?.objects.find((o) => o.id === gesture.objectId)
    if (!object) return
    const p = pointFromEvent(event)
    if (gesture.kind === 'move') {
      const rawX = gesture.origin.x + (p.x - gesture.start.x)
      const rawY = gesture.origin.y + (p.y - gesture.start.y)
      const point = isPointObject(object)
      const x = clampX(point ? snapPoint(rawX) : snapEdge(rawX), object.width)
      const y = clampY(point ? snapPoint(rawY) : snapEdge(rawY), object.height)
      apply(updateMapObject(asset, activeLayerId, object.id, { x, y }))
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
    // Redimensionar: o canto oposto fica parado; virar do avesso troca os lados.
    const o = gesture.origin
    const fixedX = gesture.handle === 'nw' || gesture.handle === 'sw' ? o.x + o.width : o.x
    const fixedY = gesture.handle === 'nw' || gesture.handle === 'ne' ? o.y + o.height : o.y
    const moveX = clampX(snapEdge(p.x))
    const moveY = clampY(snapEdge(p.y))
    apply(
      updateMapObject(asset, activeLayerId, object.id, {
        x: Math.min(fixedX, moveX),
        y: Math.min(fixedY, moveY),
        width: Math.max(1, Math.abs(moveX - fixedX)),
        height: Math.max(1, Math.abs(moveY - fixedY)),
      }),
    )
  }

  function endGesture(event: PointerEvent<SVGSVGElement>): void {
    const gesture = gestureRef.current
    if (!gesture || event.pointerId !== gesture.pointerId) return
    gestureRef.current = null
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

  const layers = tilemap.layers.filter(isObjectLayer).filter((layer) => layer.visible)

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
    >
      <title>{COPY.tiles.objectsOverlay}</title>
      {layers.map((layer) => {
        const active = layer.id === activeLayerId
        return (
          <g key={layer.id} data-layer-id={layer.id} opacity={active ? 1 : 0.45}>
            {layer.objects.map((object) => (
              <MapObjectShape
                key={object.id}
                object={object}
                unit={unit}
                selected={active && object.id === selectedObjectId}
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

function MapObjectShape({
  object,
  unit,
  selected,
}: {
  object: TilemapObject
  unit: number
  selected: boolean
}): JSX.Element {
  const label = object.name || object.type
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
      <rect
        x={object.x}
        y={object.y}
        width={object.width}
        height={object.height}
        fill="var(--color-pin-accent, #2563eb)"
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
