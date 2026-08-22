/**
 * "Baixar": opções por tipo de asset + a RECEITA do bloco para sprites (os
 * números from/to/velocidade que a criança usa no Estúdio), nos DOIS estilos.
 * Upscale ×1/×2/×4 para todos (no pixel é nearest-neighbor; no vetor é
 * re-render, sem perda). Downloads vetoriais são async (rasterização) — o
 * `busy` evita duplo clique.
 */
import type { JSX } from 'react'
import { useState } from 'react'
import {
  type ActiveFrameRef,
  activeAnimationOf,
  activeShapesOf,
  flattenActiveOf,
} from '../../core/assetEdit'
import { COPY } from '../../core/copy'
import {
  type AnyTilesetAsset,
  assetStyle,
  isTilesetKind,
  normalizeAssetName,
  type PintaAsset,
  resolveAssetPalette,
} from '../../core/project'
import { gifBlob, pixelAnimationGif, vectorAnimationGif } from '../../export/animationGif'
import { assetBundleToJson } from '../../export/assetJson'
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
  vectorSheetPortableSvg,
} from '../../export/vectorSheet'
import { tilesetPngDataUrl } from '../../tiles/packTileset'
import { vectorTilesetPngDataUrl, vectorTilesetPortableSvg } from '../../tiles/packVectorTileset'
import { tilemapPngDataUrl } from '../../tiles/renderTilemap'
import { vectorTilemapPngDataUrl } from '../../tiles/renderVectorTilemap'
import { vectorToPortableSvg } from '../../vector/portableSvg'
import { vectorPngDataUrl } from '../../vector/rasterize'
import { usePintaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import {
  ClipboardCopy,
  FileJson,
  Film,
  Image,
  Map as MapIcon,
  PenTool,
  Play,
  Puzzle,
} from '../ui/icons'
import { useToast } from '../ui/Toast'

/**
 * Deixa o navegador PINTAR o "Preparando..." antes de a thread travar no
 * encode. O GIF de um sprite grande ampliado (×4, 24 quadros) leva segundos, e
 * sem esta pausa o botão só congela: a criança clica de novo achando que falhou.
 */
function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

/**
 * O botão do GIF, igual nos dois estilos. Animação sem quadro nenhum não some o
 * botão: ela fica com o recado de "desenhe um quadro" embaixo — botão que
 * desaparece deixa a criança procurando o que ela viu ontem.
 */
function GifButton({
  busy,
  ready,
  name,
  onDownload,
}: {
  busy: boolean
  ready: boolean
  name: string
  onDownload: () => void
}): JSX.Element {
  return (
    <>
      <Button disabled={busy || !ready} onClick={onDownload}>
        <Play aria-hidden="true" className="size-4" />
        {busy ? COPY.exportDialog.preparing : COPY.exportDialog.gif(name)}
      </Button>
      <p className="-mt-1 text-sm text-pin-muted">
        {ready ? COPY.exportDialog.gifHint : COPY.exportDialog.gifEmpty}
      </p>
    </>
  )
}

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

  function downloadAsyncText(
    promise: Promise<string>,
    filename: string,
    mime = 'application/json',
  ): void {
    if (busy) return
    setBusy(true)
    void promise
      .then((content) => downloadText(content, filename, mime))
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
  // A animação SELECIONADA (a que está tocando na prévia) é a que vira GIF.
  // Separadas por estilo: os quadros são bitmap num caso e formas no outro, e a
  // união não passa por nenhum dos dois codificadores.
  const pixelAnimation = sprite ? activeAnimationOf(sprite, frameRef) : null
  const vectorAnimation = vectorSprite ? activeAnimationOf(vectorSprite, frameRef) : null
  const animation = pixelAnimation ?? vectorAnimation
  // O nome da ANIMAÇÃO entra no arquivo, e ele (ao contrário do nome do desenho)
  // nunca passou por normalização — a criança pode chamar de "andar rápido" ou
  // "pular/cair". Mesma régua do resto dos downloads; sobrando nada, cai no genérico.
  const animationName = (animation && normalizeAssetName(animation.name)) || 'animacao'
  const gifReady = (animation?.frames.length ?? 0) > 0

  /**
   * GIF da animação SELECIONADA (a que está tocando na prévia) — um sprite pode
   * ter várias, e exportar todas de uma vez viraria um monte de arquivo que
   * ninguém pediu. Para outra animação, é trocar a seleção e baixar de novo.
   */
  function downloadGif(produce: () => Promise<Uint8Array | null> | Uint8Array | null): void {
    if (busy) return
    setBusy(true)
    void afterPaint()
      .then(produce)
      .then((bytes) => {
        if (!bytes) {
          showToast(COPY.toast.downloadError)
          return
        }
        triggerDownload(gifBlob(bytes), `${asset.name}-${animationName}.gif`)
        showToast(COPY.toast.downloadReady)
      })
      .catch(() => showToast(COPY.toast.downloadError))
      .finally(() => setBusy(false))
  }

  async function copyGrid(): Promise<void> {
    if (!tilemap) return
    try {
      await navigator.clipboard.writeText(tilemapToStudioGrid(tilemap))
      showToast(COPY.exportDialog.gridCopied)
    } catch {
      showToast(COPY.exportDialog.copyError)
    }
  }

  function downloadEditable(): void {
    const json = assetBundleToJson(asset, gallery.getState().assets)
    if (!json) {
      showToast(COPY.exportDialog.editableMissingTileset)
      return
    }
    downloadText(json, `${asset.name}.pinta.json`)
  }

  return (
    <Dialog open onClose={onClose} title={COPY.exportDialog.title}>
      <div className="flex flex-col gap-2">
        <Button onClick={downloadEditable}>
          <FileJson aria-hidden="true" className="size-4" />
          {COPY.exportDialog.editableFile}
        </Button>
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
              <Puzzle aria-hidden="true" className="size-4" />
              {COPY.exportDialog.tilesetSheet}
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
              <Puzzle aria-hidden="true" className="size-4" />
              {busy ? COPY.exportDialog.preparing : COPY.exportDialog.tilesetSheet}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                downloadAsyncText(
                  vectorTilesetPortableSvg(vectorTileset),
                  `${asset.name}.tileset.svg`,
                  'image/svg+xml',
                )
              }
            >
              <PenTool aria-hidden="true" className="size-4" />
              {busy ? COPY.exportDialog.preparing : COPY.exportDialog.tilesetSheetSvg}
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
              <ClipboardCopy aria-hidden="true" className="size-4" />
              {COPY.exportDialog.copyGrid}
            </Button>
            <Button
              onClick={() =>
                downloadText(tilemapToStudioGrid(tilemap), `${asset.name}.grade.txt`, 'text/plain')
              }
            >
              <MapIcon aria-hidden="true" className="size-4" />
              {COPY.exportDialog.tilemapGridFile}
            </Button>
            <Button
              onClick={() =>
                downloadText(
                  tilemapExportJson(tilemap, mapTileset),
                  `${asset.name}.pinta-tilemap.json`,
                )
              }
            >
              <FileJson aria-hidden="true" className="size-4" />
              {COPY.exportDialog.tilemapJson}
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
              <Image aria-hidden="true" className="size-4" />
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
              <Image aria-hidden="true" className="size-4" />
              {COPY.exportDialog.spritesheet}
            </Button>
            <Button
              onClick={() =>
                downloadText(spritesheetMetadata(pack), `${asset.name}.spritesheet.json`)
              }
            >
              <FileJson aria-hidden="true" className="size-4" />
              {COPY.exportDialog.spritesheetJson}
            </Button>
            {pixelAnimation ? (
              <GifButton
                busy={busy}
                ready={gifReady}
                name={pixelAnimation.name}
                onDownload={() =>
                  downloadGif(() => pixelAnimationGif(sprite, pixelAnimation, scale))
                }
              />
            ) : null}
            <Button
              onClick={() =>
                downloadDataUrl(
                  (() => {
                    const bitmap = flattenActiveOf(asset, frameRef)
                    return bitmap
                      ? bitmapToPngDataUrl(bitmap, resolveAssetPalette(asset), scale)
                      : null
                  })(),
                  `${asset.name}.png`,
                )
              }
            >
              <Film aria-hidden="true" className="size-4" />
              {COPY.exportDialog.currentFrame}
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
              <Image aria-hidden="true" className="size-4" />
              {busy ? COPY.exportDialog.preparing : COPY.exportDialog.spritesheet}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                downloadAsyncText(
                  vectorSheetPortableSvg(vectorPack),
                  `${asset.name}.spritesheet.svg`,
                  'image/svg+xml',
                )
              }
            >
              <PenTool aria-hidden="true" className="size-4" />
              {busy ? COPY.exportDialog.preparing : COPY.exportDialog.spritesheetSvg}
            </Button>
            <Button
              onClick={() =>
                downloadText(spritesheetMetadata(vectorPack), `${asset.name}.spritesheet.json`)
              }
            >
              <FileJson aria-hidden="true" className="size-4" />
              {COPY.exportDialog.spritesheetJson}
            </Button>
            {vectorAnimation ? (
              <GifButton
                busy={busy}
                ready={gifReady}
                name={vectorAnimation.name}
                onDownload={() =>
                  downloadGif(() => vectorAnimationGif(vectorSprite, vectorAnimation, scale))
                }
              />
            ) : null}
            {activeDoc ? (
              <>
                <Button
                  disabled={busy}
                  onClick={() =>
                    downloadAsyncPng(vectorPngDataUrl(activeDoc, scale), `${asset.name}.png`)
                  }
                >
                  <Film aria-hidden="true" className="size-4" />
                  {busy ? COPY.exportDialog.preparing : COPY.exportDialog.currentFrame}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() =>
                    downloadAsyncText(
                      vectorToPortableSvg(activeDoc),
                      `${asset.name}.svg`,
                      'image/svg+xml',
                    )
                  }
                >
                  <PenTool aria-hidden="true" className="size-4" />
                  {busy ? COPY.exportDialog.preparing : COPY.exportDialog.currentFrameSvg}
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
              <Image aria-hidden="true" className="size-4" />
              {busy ? COPY.exportDialog.preparing : COPY.exportDialog.image}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                downloadAsyncText(vectorToPortableSvg(asset), `${asset.name}.svg`, 'image/svg+xml')
              }
            >
              <PenTool aria-hidden="true" className="size-4" />
              {busy ? COPY.exportDialog.preparing : COPY.vector.svg}
            </Button>
          </>
        ) : null}

        {asset.kind === 'pixel-background' ? (
          <Button
            variant="primary"
            onClick={() =>
              downloadDataUrl(
                (() => {
                  const bitmap = flattenActiveOf(asset, frameRef)
                  return bitmap
                    ? bitmapToPngDataUrl(bitmap, resolveAssetPalette(asset), scale)
                    : null
                })(),
                `${asset.name}.png`,
              )
            }
          >
            <Image aria-hidden="true" className="size-4" />
            {COPY.exportDialog.image}
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
