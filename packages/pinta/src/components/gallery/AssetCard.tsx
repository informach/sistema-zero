/**
 * Card de um desenho na galeria: miniatura REAL do desenho (canvas 1:1
 * esticado por CSS pixelated para pixel; SVG inline para vetor; minimapa de
 * cores para o tilemap), nome, chip colorido por PAPEL + selinho de estilo e
 * as ações (renomear/duplicar/apagar). Os diálogos de renomear/apagar vivem no
 * GalleryScreen — o card só chama.
 */
import type { JSX } from 'react'
import { useEffect, useRef } from 'react'
import { COPY } from '../../core/copy'
import { assetStyle, isTilesetKind, type PintaAsset, type PintaBitmap } from '../../core/project'
import { paintBitmap } from '../../pixel/render'
import { paintMinimap, tilemapMinimapColors } from '../../tiles/minimap'
import type { VectorShape } from '../../vector/model'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'

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

/** Documento vetorial "cara" do asset para a miniatura SVG (null = não vetor). */
export function thumbnailShapes(
  asset: PintaAsset,
): { width: number; height: number; shapes: VectorShape[] } | null {
  switch (asset.kind) {
    case 'vector-background':
      return { width: asset.width, height: asset.height, shapes: asset.shapes }
    case 'vector-sprite': {
      const frame = asset.animations[0]?.frames[0]
      if (!frame) return null
      return { width: asset.frameWidth, height: asset.frameHeight, shapes: frame }
    }
    case 'vector-tileset': {
      const tile = asset.tiles[0]
      if (!tile) return null
      return { width: asset.tileSize, height: asset.tileSize, shapes: tile }
    }
    default:
      return null
  }
}

/** Cor do chip por PAPEL (a mesma nos dois estilos — é como a criança pensa). */
const KIND_CHIP_CLASSES: Record<PintaAsset['kind'], string> = {
  'pixel-sprite': 'bg-pin-kind-sprite',
  'pixel-background': 'bg-pin-kind-background',
  tileset: 'bg-pin-kind-tileset',
  tilemap: 'bg-pin-kind-tilemap',
  'vector-sprite': 'bg-pin-kind-sprite',
  'vector-background': 'bg-pin-kind-background',
  'vector-tileset': 'bg-pin-kind-tileset',
}

function PixelThumb({ asset, bitmap }: { asset: PintaAsset; bitmap: PintaBitmap }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !('paletteId' in asset)) return
    // happy-dom: getContext() null → paintBitmap devolve false e a thumb fica
    // no emoji de fundo (nunca quebra).
    paintBitmap(canvas, bitmap, asset.paletteId)
  }, [asset, bitmap])

  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated relative h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function TilemapThumb({
  asset,
  findAsset,
}: {
  asset: Extract<PintaAsset, { kind: 'tilemap' }>
  findAsset?: (id: string) => PintaAsset | null
}): JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tileset = findAsset?.(asset.tilesetId) ?? null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !tileset || !isTilesetKind(tileset)) return
    paintMinimap(canvas, asset.cols, asset.rows, tilemapMinimapColors(asset, tileset))
  }, [asset, tileset])

  if (!tileset || !isTilesetKind(tileset)) return null
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated relative h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function Thumb({
  asset,
  findAsset,
}: {
  asset: PintaAsset
  findAsset?: (id: string) => PintaAsset | null
}): JSX.Element {
  const bitmap = thumbnailBitmap(asset)
  const shapesDoc = thumbnailShapes(asset)

  return (
    <div className="pin-checkerboard relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-pin-border">
      <span aria-hidden="true" className="absolute text-4xl opacity-30">
        {COPY.kinds[asset.kind].emoji}
      </span>
      {bitmap ? <PixelThumb asset={asset} bitmap={bitmap} /> : null}
      {shapesDoc && shapesDoc.shapes.length > 0 ? (
        <VectorFrameSvg
          width={shapesDoc.width}
          height={shapesDoc.height}
          shapes={shapesDoc.shapes}
          className="relative h-full w-full"
        />
      ) : null}
      {asset.kind === 'tilemap' ? <TilemapThumb asset={asset} findAsset={findAsset} /> : null}
    </div>
  )
}

export function AssetCard({
  asset,
  justCreated = false,
  findAsset,
  onOpen,
  onRename,
  onDuplicate,
  onRemove,
}: {
  asset: PintaAsset
  justCreated?: boolean
  /** Resolve outros assets do perfil (o tilemap precisa das peças p/ a thumb). */
  findAsset?: (id: string) => PintaAsset | null
  onOpen: () => void
  onRename: () => void
  onDuplicate: () => void
  onRemove: () => void
}): JSX.Element {
  const kind = COPY.kinds[asset.kind]
  const style = assetStyle(asset.kind)
  return (
    <div
      className={`flex flex-col gap-2 rounded-3xl border-2 border-pin-border bg-pin-surface p-3 shadow-sm ${justCreated ? 'pin-card-pop' : ''}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Abrir ${asset.name} (${kind.title}${style ? `, ${COPY.styleBadge[style]}` : ''})`}
        className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
      >
        <Thumb asset={asset} findAsset={findAsset} />
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
        {style ? (
          <span
            className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-bold text-white ${
              style === 'pixel' ? 'bg-pin-style-pixel' : 'bg-pin-style-vector'
            }`}
          >
            {COPY.styleBadge[style]}
          </span>
        ) : null}
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
