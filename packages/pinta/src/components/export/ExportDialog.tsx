/**
 * "Baixar": opções por tipo de asset + a RECEITA do bloco para sprites (os
 * números from/to/velocidade que a criança usa no Estúdio), nos DOIS estilos.
 * Upscale ×1/×2/×4 para todos (no pixel é nearest-neighbor; no vetor é
 * re-render, sem perda). Downloads vetoriais são async (rasterização) — o
 * `busy` evita duplo clique.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import { type ActiveFrameRef, activeBitmapOf, activeShapesOf } from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import {
  type AnyTilesetAsset,
  assetStyle,
  isTilesetKind,
  type PintaAsset,
  paletteIdOf,
} from '../../core/project'
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
import {
  packVectorSpritesheet,
  vectorSheetPngDataUrl,
  vectorSheetSvg,
} from '../../export/vectorSheet'
import { tilesetPngDataUrl } from '../../tiles/packTileset'
import { vectorTilesetPngDataUrl, vectorTilesetSvg } from '../../tiles/packVectorTileset'
import { tilemapPngDataUrl } from '../../tiles/renderTilemap'
import { vectorTilemapPngDataUrl } from '../../tiles/renderVectorTilemap'
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
  // Upscale dos PNGs (o ×1 é o tamanho REAL, o que o Estúdio espera).
  const [scale, setScale] = useState<1 | 2 | 4>(1)
  const [busy, setBusy] = useState(false)
  if (!open) return null

  const isVector = assetStyle(asset.kind) === 'vector'

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

  /** Rasterização async com trava de duplo clique + toast gentil em falha. */
  function downloadAsyncPng(promise: Promise<string | null>, filename: string): void {
    if (busy) return
    setBusy(true)
    void promise
      .then((dataUrl) => downloadDataUrl(dataUrl, filename))
      .catch(() => showToast(COPY.toast.downloadError))
      .finally(() => setBusy(false))
  }

  const sprite = asset.kind === 'pixel-sprite' ? asset : null
  const pack = sprite ? packSpritesheet(sprite) : null
  const vectorSprite = asset.kind === 'vector-sprite' ? asset : null
  const vectorPack = vectorSprite ? packVectorSpritesheet(vectorSprite) : null
  const tileset = asset.kind === 'tileset' ? asset : null
  const vectorTileset = asset.kind === 'vector-tileset' ? asset : null
  const tilemap = asset.kind === 'tilemap' ? asset : null
  const mapTileset = tilemap
    ? (gallery
        .getState()
        .assets.find((a): a is AnyTilesetAsset => isTilesetKind(a) && a.id === tilemap.tilesetId) ??
      null)
    : null
  const activeDoc = isVector ? activeShapesOf(asset, frameRef) : null

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
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-pin-muted">{COPY.exportDialog.scale}</span>
          {PNG_SCALES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={scale === option}
              onClick={() => setScale(option as 1 | 2 | 4)}
              className={`min-h-11 rounded-xl border-2 px-3 text-sm font-bold transition ${
                scale === option
                  ? 'border-pin-accent bg-pin-accent/10'
                  : 'border-pin-border hover:border-pin-accent'
              }`}
            >
              ×{option}
            </button>
          ))}
        </div>
        {isVector ? (
          <p className="text-sm text-pin-muted">{COPY.exportDialog.scaleVectorHint}</p>
        ) : null}
        {scale !== 1 ? (
          <p className="text-sm font-bold text-pin-warn">{COPY.exportDialog.scaleStudioWarning}</p>
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

        {vectorTileset ? (
          <>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                downloadAsyncPng(
                  vectorTilesetPngDataUrl(vectorTileset, scale),
                  `${asset.name}.tileset.png`,
                )
              }
            >
              🧩 {busy ? COPY.exportDialog.preparing : COPY.exportDialog.tilesetSheet}
            </Button>
            <Button
              onClick={() =>
                downloadText(
                  vectorTilesetSvg(vectorTileset),
                  `${asset.name}.tileset.svg`,
                  'image/svg+xml',
                )
              }
            >
              ✏️ {COPY.exportDialog.tilesetSheetSvg}
            </Button>
            <div className="mt-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-3">
              <p className="mb-1 text-sm font-bold text-pin-muted">
                {COPY.exportDialog.recipeTitle}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-pin-text">
                {`Peças de ${vectorTileset.tileSize} × ${vectorTileset.tileSize}.\n${
                  tilesetSolidList(vectorTileset)
                    ? `Peças sólidas: ${tilesetSolidList(vectorTileset)}.`
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
              🗺️ {COPY.exportDialog.tilemapGridFile}
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
              disabled={busy && mapTileset.kind === 'vector-tileset'}
              onClick={() => {
                if (mapTileset.kind === 'tileset') {
                  downloadDataUrl(
                    tilemapPngDataUrl(tilemap, mapTileset, scale),
                    `${asset.name}.png`,
                  )
                } else {
                  downloadAsyncPng(
                    vectorTilemapPngDataUrl(tilemap, mapTileset, scale),
                    `${asset.name}.png`,
                  )
                }
              }}
            >
              🖼️{' '}
              {busy && mapTileset?.kind === 'vector-tileset'
                ? COPY.exportDialog.preparing
                : COPY.exportDialog.tilemapImage}
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
                    return bitmap ? bitmapToPngDataUrl(bitmap, paletteIdOf(asset), scale) : null
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

        {vectorSprite && vectorPack ? (
          <>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                downloadAsyncPng(
                  vectorSheetPngDataUrl(vectorPack, scale),
                  `${asset.name}.spritesheet.png`,
                )
              }
            >
              🖼️ {busy ? COPY.exportDialog.preparing : COPY.exportDialog.spritesheet}
            </Button>
            <Button
              onClick={() =>
                downloadText(
                  vectorSheetSvg(vectorPack),
                  `${asset.name}.spritesheet.svg`,
                  'image/svg+xml',
                )
              }
            >
              ✏️ {COPY.exportDialog.spritesheetSvg}
            </Button>
            <Button
              onClick={() =>
                downloadText(spritesheetMetadata(vectorPack), `${asset.name}.spritesheet.json`)
              }
            >
              🧾 {COPY.exportDialog.spritesheetJson}
            </Button>
            {activeDoc ? (
              <>
                <Button
                  disabled={busy}
                  onClick={() =>
                    downloadAsyncPng(vectorPngDataUrl(activeDoc, scale), `${asset.name}.png`)
                  }
                >
                  🎞️ {busy ? COPY.exportDialog.preparing : COPY.exportDialog.currentFrame}
                </Button>
                <Button
                  onClick={() =>
                    downloadText(vectorToSvg(activeDoc), `${asset.name}.svg`, 'image/svg+xml')
                  }
                >
                  ✏️ {COPY.exportDialog.currentFrameSvg}
                </Button>
              </>
            ) : null}
            <div className="mt-2 rounded-2xl border-2 border-pin-border bg-pin-bg p-3">
              <p className="mb-1 text-sm font-bold text-pin-muted">
                {COPY.exportDialog.recipeTitle}
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-pin-text">
                {spritesheetRecipe(vectorPack)}
              </pre>
            </div>
          </>
        ) : null}

        {asset.kind === 'vector-background' ? (
          <>
            <Button
              variant="primary"
              disabled={busy}
              onClick={() => downloadAsyncPng(vectorPngDataUrl(asset, scale), `${asset.name}.png`)}
            >
              🖼️ {busy ? COPY.exportDialog.preparing : COPY.exportDialog.image}
            </Button>
            <Button
              onClick={() => downloadText(vectorToSvg(asset), `${asset.name}.svg`, 'image/svg+xml')}
            >
              ✏️ {COPY.vector.svg}
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
                  return bitmap ? bitmapToPngDataUrl(bitmap, paletteIdOf(asset), scale) : null
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
