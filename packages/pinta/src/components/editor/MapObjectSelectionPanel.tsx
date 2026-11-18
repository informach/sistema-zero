import { type JSX, useState } from 'react'
import { COPY } from '../../core/copy'
import { isObjectLayer, type TilemapObject } from '../../core/project'
import { shortcut } from '../../core/shortcuts'
import { removeMapObject } from '../../tiles/mapObjects'
import { arrangeObjects, type ObjectArrange, pasteObjects } from '../../tiles/objectSelection'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { useEditorStores } from './editorContext'
import { useActionShortcuts } from './useActionShortcuts'
export function MapObjectSelectionPanel({
  layerId,
  ids,
  onSelect,
}: {
  layerId: string
  ids: readonly string[]
  onSelect: (ids: string[]) => void
}): JSX.Element {
  const { editor } = useEditorStores(),
    { clipboard } = usePintaApp(),
    [arrange, setArrange] = useState<ObjectArrange>('left')
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
        s.commit(selected.reduce((m, o) => removeMapObject(m, layerId, o.id), s.asset))
        onSelect([])
      }
    }
  }
  function paste(): void {
    const item = clipboard.getState().get(),
      s = editor.getState()
    if (item?.kind !== 'objects' || s.asset.kind !== 'tilemap') return
    const next = pasteObjects(s.asset, layerId, item.objects)
    if (next === s.asset) return
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
          if (s.asset.kind === 'tilemap') s.commit(arrangeObjects(s.asset, layerId, ids, arrange))
        }}
      >
        {COPY.scene.organizar}
      </Button>
    </Panel>
  )
}
