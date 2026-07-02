/**
 * Card de um desenho na galeria: miniatura (canvas 1:1 esticado por CSS
 * pixelated), nome, tipo colorido e as ações (renomear/duplicar/apagar). Os
 * diálogos de renomear/apagar vivem no GalleryScreen — o card só chama.
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { COPY } from '../../core/copy'
import type { PintaAsset, PintaBitmap } from '../../core/project'
import { paintBitmap } from '../../pixel/render'

/** Bitmap "cara" do asset para a miniatura (null = sem prévia raster). */
export function thumbnailBitmap(asset: PintaAsset): PintaBitmap | null {
  switch (asset.kind) {
    case 'pixel-sprite':
      return asset.animations[0]?.frames[0] ?? null
    case 'pixel-background':
      return asset.bitmap
    case 'tileset':
      return asset.tiles[0] ?? null
    default:
      return null
  }
}

const KIND_CHIP_CLASSES: Record<PintaAsset['kind'], string> = {
  'pixel-sprite': 'bg-pin-kind-sprite',
  'pixel-background': 'bg-pin-kind-background',
  tileset: 'bg-pin-kind-tileset',
  tilemap: 'bg-pin-kind-tilemap',
  vector: 'bg-pin-kind-vector',
}

function Thumb({ asset }: { asset: PintaAsset }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bitmap = thumbnailBitmap(asset)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !bitmap || asset.kind === 'tilemap' || asset.kind === 'vector') return
    // happy-dom: getContext() null → paintBitmap devolve false e a thumb fica
    // no emoji de fundo (nunca quebra).
    paintBitmap(canvas, bitmap, asset.paletteId)
  }, [asset, bitmap])

  return (
    <div className="pin-checkerboard relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-pin-border">
      <span aria-hidden="true" className="absolute text-4xl opacity-30">
        {COPY.kinds[asset.kind].emoji}
      </span>
      {bitmap &&
      (asset.kind === 'pixel-sprite' ||
        asset.kind === 'pixel-background' ||
        asset.kind === 'tileset') ? (
        <canvas
          ref={canvasRef}
          className="pin-pixelated relative h-full w-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : null}
    </div>
  )
}

export function AssetCard({
  asset,
  justCreated = false,
  onOpen,
  onRename,
  onDuplicate,
  onRemove,
}: {
  asset: PintaAsset
  justCreated?: boolean
  onOpen: () => void
  onRename: () => void
  onDuplicate: () => void
  onRemove: () => void
}): JSX.Element {
  const kind = COPY.kinds[asset.kind]
  return (
    <div
      className={`flex flex-col gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-3 shadow-sm ${justCreated ? 'pin-card-pop' : ''}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir ${asset.name}`}
        className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
      >
        <Thumb asset={asset} />
      </button>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm text-white ${KIND_CHIP_CLASSES[asset.kind]}`}
          title={kind.title}
        >
          {kind.emoji}
        </span>
        <span className="truncate text-base font-bold" title={asset.name}>
          {asset.name}
        </span>
      </div>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onRename}
          aria-label={`${COPY.gallery.rename} ${asset.name}`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-lg transition hover:bg-pin-border/40"
        >
          <span aria-hidden="true">✏️</span>
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          aria-label={`${COPY.gallery.duplicate} ${asset.name}`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-lg transition hover:bg-pin-border/40"
        >
          <span aria-hidden="true">🧬</span>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${COPY.gallery.remove} ${asset.name}`}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-2xl text-lg transition hover:bg-pin-danger/20"
        >
          <span aria-hidden="true">🗑️</span>
        </button>
      </div>
    </div>
  )
}
