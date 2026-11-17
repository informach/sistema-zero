import { resolveAssetPalette, type TilesetAsset, type VectorTilesetAsset } from '../core/project'
import { bitmapToRGBA } from '../pixel/render'
import { packTileset } from './packTileset'
import { packVectorTileset, vectorTilesetPortableSvg } from './packVectorTileset'

/** Folha 1:1 de um tileset de PIXEL (síncrona; `null` sem canvas 2D). */
export function pixelSheetCanvas(tileset: TilesetAsset): HTMLCanvasElement | null {
  const pack = packTileset(tileset)
  const colors = resolveAssetPalette(tileset)
  const sheet = document.createElement('canvas')
  sheet.width = pack.columns * pack.tileSize
  sheet.height = pack.rows * pack.tileSize
  const ctx = sheet.getContext('2d')
  if (!ctx) return null
  for (const cell of pack.cells) {
    ctx.putImageData(
      new ImageData(bitmapToRGBA(cell.bitmap, colors), cell.bitmap.width, cell.bitmap.height),
      cell.col * pack.tileSize,
      cell.row * pack.tileSize,
    )
  }
  return sheet
}

/**
 * Folha de um tileset VETORIAL: rasteriza o SVG portátil uma vez (async). A URL
 * temporária é revogada em `load`, `error` E no cancelamento (o devolvido), com
 * guarda idempotente — troca rápida de peças ou desmontar não deixa Blob URL viva.
 */
export function loadVectorSheet(
  tileset: VectorTilesetAsset,
  onReady: (sheet: HTMLCanvasElement) => void,
  onError: () => void,
): () => void {
  if (typeof Image === 'undefined' || !document.createElement('canvas').getContext('2d')) {
    return () => {}
  }
  let cancelled = false
  const pack = packVectorTileset(tileset)
  let url: string | null = null
  let img: HTMLImageElement | null = null
  let revoked = false
  const revoke = (): void => {
    if (revoked || !url) return
    revoked = true
    URL.revokeObjectURL(url)
  }
  void vectorTilesetPortableSvg(tileset)
    .then((svg) => {
      if (cancelled) return
      url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      img = new Image()
      img.onload = () => {
        revoke()
        if (cancelled || !img) return
        const sheet = document.createElement('canvas')
        sheet.width = pack.columns * pack.tileSize
        sheet.height = pack.rows * pack.tileSize
        const ctx = sheet.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        onReady(sheet)
      }
      img.onerror = () => {
        revoke()
        if (!cancelled) onError()
      }
      img.src = url
    })
    .catch(() => {
      if (!cancelled) onError()
    })
  return () => {
    cancelled = true
    if (img) {
      img.onload = null
      img.onerror = null
    }
    revoke()
  }
}
