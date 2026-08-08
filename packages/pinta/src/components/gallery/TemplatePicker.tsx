/**
 * Grade de MODELOS PRONTOS (passo "template" do Criar novo): cada cartão mostra
 * uma miniatura REAL do modelo (construído uma vez) + título/descrição. Pixel
 * rende em canvas; vetor em SVG; mapa mostra as peças do tileset companheiro.
 */
import type { JSX } from 'react'
import { useEffect, useMemo, useRef } from 'react'
import { COPY } from '../../core/copy'
import type { PintaAssetRole } from '../../core/project'
import {
  type AnyTilesetAsset,
  isTilesetKind,
  type PintaAsset,
  type PintaBitmap,
  resolveAssetPalette,
} from '../../core/project'
import { flattenCels } from '../../pixel/layers'
import { paintBitmap } from '../../pixel/render'
import { PINTA_TEMPLATES, type PintaTemplate } from '../../templates/catalog'
import { VectorFrameSvg } from '../../vector/VectorFrameSvg'
import { Button } from '../ui/Button'

function PixelThumb({ bitmap, asset }: { bitmap: PintaBitmap; asset: PintaAsset }): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const colors = useMemo(() => resolveAssetPalette(asset), [asset])
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) paintBitmap(canvas, bitmap, colors)
  }, [bitmap, colors])
  return (
    <canvas
      ref={canvasRef}
      className="pin-pixelated h-full w-full object-contain"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function TilesetStrip({ tileset }: { tileset: AnyTilesetAsset }): JSX.Element {
  const shown = Math.min(tileset.tiles.length, 6)
  return (
    <div className="flex h-full w-full items-center justify-center gap-0.5">
      {Array.from({ length: shown }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: peças não têm id; a ordem É a identidade
          key={i}
          className="size-8 shrink-0"
        >
          {tileset.kind === 'tileset' ? (
            <PixelThumb bitmap={tileset.tiles[i] as PintaBitmap} asset={tileset} />
          ) : (
            <VectorFrameSvg
              width={tileset.tileSize}
              height={tileset.tileSize}
              shapes={tileset.tiles[i] ?? []}
              className="h-full w-full"
            />
          )}
        </span>
      ))}
    </div>
  )
}

function TemplateThumb({
  assets,
  primaryIndex,
}: {
  assets: PintaAsset[]
  primaryIndex: number
}): JSX.Element | null {
  const primary = assets[primaryIndex]
  if (!primary) return null
  switch (primary.kind) {
    case 'pixel-sprite': {
      const cels = primary.animations[0]?.frames[0]
      const flat = cels ? flattenCels(cels, primary.layers) : null
      return flat ? <PixelThumb bitmap={flat} asset={primary} /> : null
    }
    case 'pixel-background': {
      const flat = flattenCels(primary.cels, primary.layers)
      return flat ? <PixelThumb bitmap={flat} asset={primary} /> : null
    }
    case 'tileset':
      return <TilesetStrip tileset={primary} />
    case 'tilemap': {
      const companion = assets.find((a): a is AnyTilesetAsset => isTilesetKind(a))
      return companion ? <TilesetStrip tileset={companion} /> : null
    }
    case 'vector-sprite':
      return (
        <VectorFrameSvg
          width={primary.frameWidth}
          height={primary.frameHeight}
          shapes={primary.animations[0]?.frames[0] ?? []}
          className="h-full w-full"
        />
      )
    case 'vector-background':
      return (
        <VectorFrameSvg
          width={primary.width}
          height={primary.height}
          shapes={primary.shapes}
          className="h-full w-full"
        />
      )
    default:
      return null
  }
}

export function TemplatePicker({
  role,
  onPick,
  onBack,
}: {
  /** Filtra a lista pelo papel (missão de arte do Pensa); null = todos. */
  role: PintaAssetRole | null
  onPick: (template: PintaTemplate) => void
  onBack: () => void
}): JSX.Element {
  const entries = useMemo(
    () =>
      PINTA_TEMPLATES.filter((t) => !role || t.role === role).map((t) => ({
        template: t,
        built: t.build(),
      })),
    [role],
  )
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {entries.map(({ template, built }) => {
          const info = COPY.templates.items[template.id]
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onPick(template)}
              className="pin-pop flex flex-col items-stretch gap-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-3 text-left transition hover:border-pin-accent hover:shadow-md"
            >
              <span className="pin-checkerboard flex h-20 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-pin-border">
                <TemplateThumb assets={built.assets} primaryIndex={built.primaryIndex} />
              </span>
              <span className="pin-display block text-sm leading-tight">{info.title}</span>
              <span className="block text-xs text-pin-muted">{info.description}</span>
            </button>
          )
        })}
      </div>
      <div className="flex justify-start">
        <Button variant="ghost" onClick={onBack}>
          {COPY.newAsset.back}
        </Button>
      </div>
    </div>
  )
}
