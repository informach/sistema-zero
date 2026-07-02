/**
 * Tira de PEÇAS do tileset (espelho do FrameStrip): miniaturas clicáveis +
 * nova/duplicar/apagar + o badge 🧱 de peça SÓLIDA. Inserir/remover uma peça
 * REMAPEIA as células de todos os MAPAS que usam este tileset (invariante:
 * índice no array = índice na folha = índice nas células) — o remap dos mapas
 * é persistido direto na galeria (fora do undo do tileset; cross-asset).
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { COPY } from '../../core/copy'
import type { PaletteId } from '../../core/palette'
import type { PintaBitmap, TilemapAsset } from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import { persistAsset } from '../../state/persistence'
import {
  addTile,
  duplicateTile,
  remapTilemapCells,
  removeTile,
  toggleSolid,
} from '../../tiles/tilesetOps'
import { usePintaApp } from '../appContext'
import { IconButton } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useEditor, useEditorStores, useSession } from './editorContext'

function TileThumb({
  bitmap,
  paletteId,
  selected,
  solid,
  label,
  onSelect,
}: {
  bitmap: PintaBitmap
  paletteId: PaletteId
  selected: boolean
  solid: boolean
  label: string
  onSelect: () => void
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) paintBitmap(canvas, bitmap, paletteId)
  }, [bitmap, paletteId])
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={`pin-checkerboard relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
        selected ? 'border-pin-accent ring-2 ring-pin-accent' : 'border-pin-border'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="pin-pixelated h-full w-full object-contain"
        style={{ imageRendering: 'pixelated' }}
      />
      {solid ? (
        <span aria-hidden="true" className="absolute right-0 bottom-0 text-xs">
          🧱
        </span>
      ) : null}
    </button>
  )
}

export function TileStrip(): JSX.Element | null {
  const { editor, session } = useEditorStores()
  const { gallery } = usePintaApp()
  const { showToast } = useToast()
  const asset = useEditor((state) => state.asset)
  const frameIndex = useSession((state) => state.frameIndex)

  if (asset.kind !== 'tileset') return null
  const selectedIndex = Math.min(frameIndex, asset.tiles.length - 1)

  /** Persiste o remap nos MAPAS deste tileset (best-effort, fora do undo). */
  function remapMaps(change: { insertedAt: number } | { removedAt: number }): void {
    const state = gallery.getState()
    const affected = state.assets.filter(
      (a): a is TilemapAsset => a.kind === 'tilemap' && a.tilesetId === asset.id,
    )
    for (const tilemap of affected) {
      const next = remapTilemapCells(tilemap, change)
      if (next === tilemap) continue
      const stamped = { ...next, updatedAt: Date.now() }
      state.absorb(stamped)
      void persistAsset(stamped)
    }
  }

  function mutate(
    op: (tileset: Extract<typeof asset, { kind: 'tileset' }>) => {
      next: typeof asset
      selectIndex?: number
      remap?: { insertedAt: number } | { removedAt: number }
      limitToast?: string
    },
  ): void {
    const current = editor.getState().asset
    if (current.kind !== 'tileset') return
    const { next, selectIndex, remap, limitToast } = op(current)
    if (next === current) {
      if (limitToast) showToast(limitToast)
      return
    }
    editor.getState().commit(next)
    if (selectIndex !== undefined) session.getState().selectFrame(selectIndex)
    if (remap) remapMaps(remap)
  }

  return (
    <div className="flex items-center gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-2">
      <span className="px-1 text-sm font-bold text-pin-muted">{COPY.tiles.tiles}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1">
        {asset.tiles.map((tile, index) => (
          <TileThumb
            // biome-ignore lint/suspicious/noArrayIndexKey: peças não têm id; a ordem É a identidade (índice nos mapas)
            key={index}
            bitmap={tile}
            paletteId={asset.paletteId}
            selected={index === selectedIndex}
            solid={asset.solid[index] === true}
            label={`Peça ${index}`}
            onSelect={() => session.getState().selectFrame(index)}
          />
        ))}
      </div>
      <div className="flex items-center gap-1">
        <IconButton
          aria-label={COPY.tiles.addTile}
          title={COPY.tiles.addTile}
          onClick={() =>
            mutate((tileset) => ({
              next: addTile(tileset, selectedIndex),
              selectIndex: selectedIndex + 1,
              remap: { insertedAt: selectedIndex + 1 },
              limitToast: COPY.tiles.tileLimit,
            }))
          }
        >
          <span aria-hidden="true">＋</span>
        </IconButton>
        <IconButton
          aria-label={COPY.tiles.duplicateTile}
          title={COPY.tiles.duplicateTile}
          onClick={() =>
            mutate((tileset) => ({
              next: duplicateTile(tileset, selectedIndex),
              selectIndex: selectedIndex + 1,
              remap: { insertedAt: selectedIndex + 1 },
              limitToast: COPY.tiles.tileLimit,
            }))
          }
        >
          <span aria-hidden="true">🧬</span>
        </IconButton>
        <IconButton
          aria-label={COPY.tiles.removeTile}
          title={COPY.tiles.removeTile}
          disabled={asset.tiles.length <= 1}
          onClick={() =>
            mutate((tileset) => ({
              next: removeTile(tileset, selectedIndex),
              selectIndex: Math.max(selectedIndex - 1, 0),
              remap: { removedAt: selectedIndex },
            }))
          }
        >
          <span aria-hidden="true">🗑️</span>
        </IconButton>
        <IconButton
          active={asset.solid[selectedIndex] === true}
          aria-label={COPY.tiles.solid}
          aria-pressed={asset.solid[selectedIndex] === true}
          title={COPY.tiles.solid}
          onClick={() => mutate((tileset) => ({ next: toggleSolid(tileset, selectedIndex) }))}
        >
          <span aria-hidden="true">🧱</span>
        </IconButton>
      </div>
    </div>
  )
}
