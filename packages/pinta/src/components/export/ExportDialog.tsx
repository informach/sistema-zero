/**
 * "Baixar" (v1): opções por tipo de asset + a RECEITA do bloco para sprites
 * (os números from/to/velocidade que a criança usa no Estúdio). A F6 amplia
 * (ZIP completo, upscale, .pinta.json).
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { type ActiveFrameRef, activeBitmapOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import type { PintaAsset, TilesetAsset } from '../../core/project'
import { triggerDownload } from '../../export/download'
import { bitmapToPngDataUrl, dataUrlToBlob, PNG_SCALES } from '../../export/png'
import {
  packSpritesheet,
  spritesheetMetadata,
  spritesheetPngDataUrl,
  spritesheetRecipe,
} from '../../export/spritesheet'
import {
  tilemapExportJson,
  tilemapRecipe,
  tilemapToStudioGrid,
  tilesetSolidList,
} from '../../export/studioGrid'
import { tilesetPngDataUrl } from '../../tiles/packTileset'
import { tilemapPngDataUrl } from '../../tiles/renderTilemap'
import { vectorPngDataUrl } from '../../vector/rasterize'
import { vectorToSvg } from '../../vector/svg'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'

export function ExportDialog({
  open,
  asset,
  frameRef,
  onClose,
}: {
  open: boolean
  asset: PintaAsset
  frameRef: ActiveFrameRef
  onClose: () => void
}): JSX.Element | null {
  const { showToast } = useToast()
  const { gallery } = usePintaApp()
  // Upscale nearest-neighbor dos PNGs (o ×1 é o tamanho REAL, o que o Estúdio espera).
  const [scale, setScale] = useState<1 | 2 | 4>(1)
  if (!open) return null

  const paletteId = asset.kind === 'tilemap' || asset.kind === 'vector' ? 'arcade' : asset.paletteId

  function downloadDataUrl(dataUrl: string | null, filename: string): void {
    const blob = dataUrl ? dataUrlToBlob(dataUrl) : null
    if (!blob) {
      showToast(COPY.toast.downloadError)
      return
    }
    triggerDownload(blob, filename)
    showToast(COPY.toast.downloadReady)
  }

  function downloadText(text: string, filename: string, mime = 'application/json'): void {
    triggerDownload(new Blob([text], { type: mime }), filename)
    showToast(COPY.toast.downloadReady)
  }

  const sprite = asset.kind === 'pixel-sprite' ? asset : null
  const pack = sprite ? packSpritesheet(sprite) : null
  const tileset = asset.kind === 'tileset' ? asset : null
  const tilemap = asset.kind === 'tilemap' ? asset : null
  const mapTileset = tilemap
    ? (gallery
        .getState()
        .assets.find(
          (a): a is TilesetAsset => a.kind === 'tileset' && a.id === tilemap.tilesetId,
        ) ?? null)
    : null

  async function copyGrid(): Promise<void> {
    if (!tilemap) return
    try {
      await navigator.clipboard.writeText(tilemapToStudioGrid(tilemap))
      showToast(COPY.exportDialog.gridCopied)
    } catch {
      showToast(COPY.exportDialog.copyError)
    }
  }

  return (
    <Dialog open onClose={onClose} title={COPY.exportDialog.title}>
      <div className="flex flex-col gap-2">
        {asset.kind !== 'vector' ? (
          <div className="mb-1 flex items-center gap-2">
            <span className="text-sm font-bold text-pin-muted">{COPY.exportDialog.scale}</span>
            {PNG_SCALES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={scale === option}
                onClick={() => setScale(option as 1 | 2 | 4)}
                className={`min-h-9 rounded-xl border-2 px-3 text-sm font-bold transition ${
                  scale === option
                    ? 'border-pin-accent bg-pin-accent/10'
                    : 'border-pin-border hover:border-pin-accent'
                }`}
              >
                ×{option}
              </button>
            ))}
          </div>
        ) : null}
        {tileset ? (
          <>
            <Button
              variant="primary"
              onClick={() =>
                downloadDataUrl(tilesetPngDataUrl(tileset, scale), `${asset.name}.tileset.png`)
              }
            >
              🧩 {COPY.exportDialog.tilesetSheet}
            </Button>
            <div className="mt-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-3">
              <p className="mb-1 text-sm font-bold text-pin-muted">
                {COPY.exportDialog.recipeTitle}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-pin-text">
                {`Peças de ${tileset.tileSize} × ${tileset.tileSize}.\n${
                  tilesetSolidList(tileset)
                    ? `Peças sólidas: ${tilesetSolidList(tileset)}.`
                    : 'Nenhuma peça sólida marcada.'
                }`}
              </pre>
            </div>
          </>
        ) : null}
        {tilemap && mapTileset ? (
          <>
            <Button variant="primary" onClick={() => void copyGrid()}>
              📋 {COPY.exportDialog.copyGrid}
            </Button>
            <Button
              onClick={() =>
                downloadText(tilemapToStudioGrid(tilemap), `${asset.name}.grade.txt`, 'text/plain')
              }
            >
              🗺️ Baixar a grade (arquivo de texto)
            </Button>
            <Button
              onClick={() =>
                downloadText(
                  tilemapExportJson(tilemap, mapTileset),
                  `${asset.name}.pinta-tilemap.json`,
                )
              }
            >
              🧾 {COPY.exportDialog.tilemapJson}
            </Button>
            <Button
              onClick={() =>
                downloadDataUrl(tilemapPngDataUrl(tilemap, mapTileset, scale), `${asset.name}.png`)
              }
            >
              🖼️ {COPY.exportDialog.tilemapImage}
            </Button>
            <div className="mt-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-3">
              <p className="mb-1 text-sm font-bold text-pin-muted">
                {COPY.exportDialog.recipeTitle}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-pin-text">
                {tilemapRecipe(tilemap, mapTileset)}
              </pre>
            </div>
          </>
        ) : null}
        {tilemap && !mapTileset ? (
          <p className="text-sm text-pin-muted">{COPY.tiles.missingTileset}</p>
        ) : null}
        {sprite && pack ? (
          <>
            <Button
              variant="primary"
              onClick={() =>
                downloadDataUrl(
                  spritesheetPngDataUrl(sprite, pack, scale),
                  `${asset.name}.spritesheet.png`,
                )
              }
            >
              🖼️ {COPY.exportDialog.spritesheet}
            </Button>
            <Button
              onClick={() =>
                downloadText(spritesheetMetadata(pack), `${asset.name}.spritesheet.json`)
              }
            >
              🧾 {COPY.exportDialog.spritesheetJson}
            </Button>
            <Button
              onClick={() =>
                downloadDataUrl(
                  (() => {
                    const bitmap = activeBitmapOf(asset, frameRef)
                    return bitmap ? bitmapToPngDataUrl(bitmap, paletteId, scale) : null
                  })(),
                  `${asset.name}.png`,
                )
              }
            >
              🎞️ {COPY.exportDialog.currentFrame}
            </Button>
            <div className="mt-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-3">
              <p className="mb-1 text-sm font-bold text-pin-muted">
                {COPY.exportDialog.recipeTitle}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-pin-text">
                {spritesheetRecipe(pack)}
              </pre>
            </div>
          </>
        ) : null}
        {asset.kind === 'vector' ? (
          <>
            <Button
              variant="primary"
              onClick={() => downloadText(vectorToSvg(asset), `${asset.name}.svg`, 'image/svg+xml')}
            >
              ✏️ {COPY.vector.svg}
            </Button>
            <Button
              onClick={() => {
                void vectorPngDataUrl(asset).then((dataUrl) =>
                  downloadDataUrl(dataUrl, `${asset.name}.png`),
                )
              }}
            >
              🖼️ {COPY.exportDialog.image}
            </Button>
          </>
        ) : null}
        {asset.kind === 'pixel-background' ? (
          <Button
            variant="primary"
            onClick={() =>
              downloadDataUrl(
                (() => {
                  const bitmap = activeBitmapOf(asset, frameRef)
                  return bitmap ? bitmapToPngDataUrl(bitmap, paletteId, scale) : null
                })(),
                `${asset.name}.png`,
              )
            }
          >
            🖼️ {COPY.exportDialog.image}
          </Button>
        ) : null}
        <div className="mt-1 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            {COPY.exportDialog.close}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
