/**
 * Card de um desenho na galeria: miniatura REAL do desenho (canvas 1:1
 * esticado por CSS pixelated para pixel; SVG inline para vetor; minimapa de
 * cores para o tilemap), nome e selinho de estilo.
 *
 * ⚠️ Card COMPACTO (~164px): pequeno o bastante para caber muita coisa na tela
 * (referência MakeCode Arcade, "só para reconhecer o desenho") e largo o
 * bastante para as três ações ficarem NO card, cada uma com o alvo de 44px da
 * regra de toque infantil — 3×44 = 132px + respiros. Um menu "⋮" chegou a ser
 * tentado para caber em 10 colunas e foi REJEITADO pela dona: as ações voltaram
 * para o card. Os diálogos de renomear/apagar seguem no GalleryScreen.
 */
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { COPY } from '../../core/copy'
import {
  assetStyle,
  isTilesetKind,
  type PintaAsset,
  type PintaBitmap,
  resolveAssetPalette,
} from '../../core/project'
import { flattenCels } from '../../pixel/layers'
import { paintBitmap } from '../../pixel/render'
import { paintMinimap, tilemapMinimapColors } from '../../tiles/minimap'
import type { VectorShape } from '../../vector/model'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { Copy, Pencil, Trash2 } from '../ui/icons'

/** Bitmap "cara" do asset para a miniatura (null = sem prévia raster). */
export function thumbnailBitmap(asset: PintaAsset): PintaBitmap | null {
  switch (asset.kind) {
    // Miniatura mostra o desenho VISÍVEL (camadas achatadas).
    case 'pixel-sprite': {
      const cels = asset.animations[0]?.frames[0]
      return cels ? flattenCels(cels, asset.layers) : null
    }
    case 'pixel-background':
      return flattenCels(asset.cels, asset.layers)
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

/** Borda/sombra do card na cor do PAPEL (espelho do --unit do .kids-card). */
const KIND_PANEL_CLASSES: Record<PintaAsset['kind'], string> = {
  'pixel-sprite': '[--pin-panel-border:var(--color-pin-kind-sprite)]',
  'pixel-background': '[--pin-panel-border:var(--color-pin-kind-background)]',
  tileset: '[--pin-panel-border:var(--color-pin-kind-tileset)]',
  tilemap: '[--pin-panel-border:var(--color-pin-kind-tilemap)]',
  'vector-sprite': '[--pin-panel-border:var(--color-pin-kind-sprite)]',
  'vector-background': '[--pin-panel-border:var(--color-pin-kind-background)]',
  'vector-tileset': '[--pin-panel-border:var(--color-pin-kind-tileset)]',
}

function PixelThumb({ asset, bitmap }: { asset: PintaAsset; bitmap: PintaBitmap }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !('paletteId' in asset)) return
    // happy-dom: getContext() null → paintBitmap devolve false e a thumb fica
    // no emoji de fundo (nunca quebra).
    paintBitmap(canvas, bitmap, resolveAssetPalette(asset))
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
    <div className="pin-checkerboard relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 border-pin-border">
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
  onDuplicate: () => Promise<void> | void
  onRemove: () => void
}): JSX.Element {
  const kind = COPY.kinds[asset.kind]
  const style = assetStyle(asset.kind)
  const [duplicating, setDuplicating] = useState(false)
  // A trava do duplo clique é um REF: dois cliques no MESMO turno de JS chegam
  // antes de qualquer re-render marcar o botão como desabilitado.
  const duplicatingRef = useRef(false)

  async function handleDuplicate(): Promise<void> {
    if (duplicatingRef.current) return
    duplicatingRef.current = true
    setDuplicating(true)
    try {
      await onDuplicate()
    } finally {
      duplicatingRef.current = false
      setDuplicating(false)
    }
  }

  /** Alvo de toque de 44px — a regra de mão de criança vale para as 3 ações. */
  const actionClass =
    'flex min-h-11 min-w-11 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent'

  return (
    <div
      className={`pin-panel pin-pop flex flex-col gap-1 p-2 ${KIND_PANEL_CLASSES[asset.kind]} ${justCreated ? 'pin-card-pop' : ''}`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={COPY.a11y.openAsset(
          `${asset.name} (${kind.title}${style ? `, ${COPY.styleBadge[style]}` : ''})`,
        )}
        className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent"
      >
        <Thumb asset={asset} findAsset={findAsset} />
      </button>
      <div className="flex items-center gap-1">
        <span
          aria-hidden="true"
          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] text-white ${KIND_CHIP_CLASSES[asset.kind]}`}
          title={kind.title}
        >
          {kind.emoji}
        </span>
        <span className="truncate font-bold text-xs" title={asset.name}>
          {asset.name}
        </span>
        {style ? (
          <span
            className={`ml-auto shrink-0 rounded-full px-1.5 py-px font-bold text-[10px] text-white ${
              style === 'pixel' ? 'bg-pin-style-pixel' : 'bg-pin-style-vector'
            }`}
          >
            {COPY.styleBadge[style]}
          </span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onRename}
          aria-label={`${COPY.gallery.rename} ${asset.name}`}
          title={COPY.gallery.rename}
          className={`${actionClass} hover:bg-pin-border/40`}
        >
          <Pencil aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => void handleDuplicate()}
          disabled={duplicating}
          aria-busy={duplicating}
          aria-label={`${COPY.gallery.duplicate} ${asset.name}`}
          title={COPY.gallery.duplicate}
          className={`${actionClass} hover:bg-pin-border/40 disabled:cursor-wait disabled:opacity-50`}
        >
          <Copy aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${COPY.gallery.remove} ${asset.name}`}
          title={COPY.gallery.remove}
          className={`${actionClass} text-pin-danger hover:bg-pin-danger/20`}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  )
}
