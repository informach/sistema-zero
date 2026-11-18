import { type JSX, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  effectiveLayer,
  isObjectLayer,
  isTilesetKind,
  type TilemapObject,
} from '../../core/project'
import { shortcut } from '../../core/shortcuts'
import { removeMapObject } from '../../tiles/mapObjects'
import { objectBounds } from '../../tiles/objectGeometry'
import {
  arrangeObjects,
  type ObjectArrange,
  pasteObjects,
  pasteOffset,
} from '../../tiles/objectSelection'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useToast } from '../ui/Toast'
import { useEditorStores } from './editorContext'
import { commitIfChanged } from './mapTools/commitGuard'
import { useActionShortcuts } from './useActionShortcuts'
export function MapObjectSelectionPanel({
  layerId,
  ids,
  onSelect,
  position,
  snapObjects = true,
}: {
  layerId: string
  ids: readonly string[]
  snapObjects?: boolean
  onSelect: (ids: string[]) => void
  /** Onde o ponteiro esteve por último no palco, em pixels do mapa (ou o meio do que se vê). */
  position?: () => { x: number; y: number } | null
}): JSX.Element {
  const { editor } = useEditorStores(),
    { clipboard, gallery } = usePintaApp(),
    { showToast } = useToast(),
    [arrange, setArrange] = useState<ObjectArrange>('left')
  /** Nada mudou: se a camada está trancada, diz por quê. */
  const warnLocked = (): void => {
    const a = editor.getState().asset
    const layer = a.kind === 'tilemap' ? a.layers.find((l) => l.id === layerId) : null
    if (a.kind === 'tilemap' && layer && effectiveLayer(a, layer).locked)
      showToast(COPY.layers.lockedWarning)
  }
  const objects = (): TilemapObject[] => {
    const a = editor.getState().asset
    return a.kind === 'tilemap'
      ? a.layers
          .flatMap((l) => (l.id === layerId && isObjectLayer(l) ? l.objects : []))
          .filter((o) => ids.includes(o.id))
      : []
  }
  function copy(cut = false): void {
    const selected = objects()
    if (!selected.length) return
    clipboard.getState().set({ kind: 'objects', objects: structuredClone(selected) })
    if (cut) {
      const s = editor.getState()
      if (s.asset.kind === 'tilemap') {
        if (
          commitIfChanged(
            s,
            selected.reduce((m, o) => removeMapObject(m, layerId, o.id), s.asset),
          )
        )
          onSelect([])
        else warnLocked()
      }
    }
  }
  function paste(): void {
    const item = clipboard.getState().get(),
      s = editor.getState()
    if (item?.kind !== 'objects' || s.asset.kind !== 'tilemap') return
    // O que foi copiado cai com o MEIO onde o ponteiro esteve por último (sem ponteiro, um
    // pouco ao lado do original, como antes).
    const target = position?.()
    const layer = s.asset.layers.find((l) => l.id === layerId)
    if (!layer || !isObjectLayer(layer)) return
    const offset = effectiveLayer(s.asset, layer)
    let [dx, dy] = target
      ? pasteOffset(item.objects, {
          x: target.x - offset.offsetX,
          y: target.y - offset.offsetY,
        })
      : [16, 16]
    if (snapObjects && item.objects.length) {
      const tilesetId = s.asset.tilesetId
      const ts = gallery.getState().assets.find((a) => a.id === tilesetId)
      const size = ts && isTilesetKind(ts) ? ts.tileSize : 16
      const boxes = item.objects.map(objectBounds),
        minX = Math.min(...boxes.map((b) => b.x)),
        minY = Math.min(...boxes.map((b) => b.y))
      // Pontos ficam no meio da casa; desenhos e grupos encaixam pela borda, como no palco.
      const phase = item.objects.every((o) => o.width === 0 && o.height === 0) ? size / 2 : 0
      dx = Math.max(-minX, Math.round((minX + dx - phase) / size) * size + phase - minX)
      dy = Math.max(-minY, Math.round((minY + dy - phase) / size) * size + phase - minY)
    }
    const next = pasteObjects(s.asset, layerId, item.objects, dx, dy)
    if (next === s.asset) {
      warnLocked()
      return
    }
    const oldIds = new Set(
      s.asset.layers.flatMap((l) => (isObjectLayer(l) ? l.objects.map((o) => o.id) : [])),
    )
    s.commit(next)
    onSelect(
      next.layers.flatMap((l) =>
        l.id === layerId && isObjectLayer(l)
          ? l.objects.filter((o) => !oldIds.has(o.id)).map((o) => o.id)
          : [],
      ),
    )
  }
  useActionShortcuts([
    { combo: shortcut('copy'), run: () => copy() },
    { combo: shortcut('cut'), run: () => copy(true) },
    { combo: shortcut('paste'), run: paste },
    {
      combo: shortcut('selectAll'),
      run: () => {
        const a = editor.getState().asset
        if (a.kind === 'tilemap')
          onSelect(
            a.layers.flatMap((l) =>
              l.id === layerId && isObjectLayer(l) ? l.objects.map((o) => o.id) : [],
            ),
          )
      },
    },
  ])
  const options: [ObjectArrange, string][] = [
    ['left', COPY.scene.left],
    ['right', COPY.scene.right],
    ['top', COPY.scene.emCima],
    ['bottom', COPY.scene.embaixo],
    ['centerX', COPY.scene.centralizarNaHorizontal],
    ['centerY', COPY.scene.centralizarNaVertical],
    ['distributeX', COPY.scene.distribuirNaHorizontal],
    ['distributeY', COPY.scene.distribuirNaVertical],
  ]
  return (
    <Panel title={COPY.scene.dynamicObjetosEscolhidos(ids.length)}>
      <div className="flex flex-wrap gap-1">
        <Button variant="barOutline" disabled={!ids.length} onClick={() => copy()}>
          {COPY.scene.copiar}
        </Button>
        <Button variant="barOutline" disabled={!ids.length} onClick={() => copy(true)}>
          {COPY.scene.recortar}
        </Button>
        <Button variant="barOutline" onClick={paste}>
          {COPY.scene.colar}
        </Button>
      </div>
      <p className="my-2 text-xs text-pin-muted">{COPY.scene.shiftToqueEscolheMaisDeUmObjeto}</p>
      <select
        aria-label={COPY.scene.organizarObjetos}
        className="min-h-11 w-full rounded-xl border-2 border-pin-border bg-pin-surface px-2 text-sm"
        value={arrange}
        onChange={(e) => {
          const value = options.find(([v]) => v === e.target.value)?.[0]
          if (value) setArrange(value)
        }}
      >
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <Button
        variant="barOutline"
        disabled={ids.length < 2}
        className="mt-2 w-full"
        onClick={() => {
          const s = editor.getState()
          if (s.asset.kind !== 'tilemap') return
          if (!commitIfChanged(s, arrangeObjects(s.asset, layerId, ids, arrange))) warnLocked()
        }}
      >
        {COPY.scene.organizar}
      </Button>
    </Panel>
  )
}
