import type { ProjectTilemapMeta } from '#core'
import { serializeGrid } from '../../blockly/fields/FieldTileGrid'

/**
 * Fatiador de imagem → mapa de tiles ("Usar como mapa de tiles" do painel
 * Imagens): corta a imagem em células de `tileSize`, DEDUPLICA células
 * idênticas (pixel a pixel) e reconstrói a folha de peças únicas + a grade —
 * o MESMO contrato `ProjectTilemapMeta` que o Pinta manda pela ponte, então o
 * bloco "Criar mapa do meu desenho" funciona igual para uploads.
 *
 * Núcleo PURO (`sliceTiles`) testável sem canvas; a casca (`imageToTilemapMeta`)
 * usa canvas e devolve null em ambiente sem raster (happy-dom) — QA de browser.
 */

/** Mesmo teto do metadado de tileset: mais que isso não é "mapa de blocos". */
export const MAX_UNIQUE_TILES = 64

export interface SliceInput {
  /** RGBA row-major (4 bytes por pixel) — o shape do ImageData. */
  data: Uint8ClampedArray | readonly number[]
  width: number
  height: number
}

export interface SliceResult {
  /** Grade de índices nas peças ÚNICAS; -1 = célula totalmente transparente. */
  cells: number[][]
  /** Bytes RGBA de cada peça única, na ordem de primeira aparição. */
  uniqueTiles: Uint8ClampedArray[]
  cols: number
  rows: number
  /** true quando passou de MAX_UNIQUE_TILES (imagem que não é feita de blocos). */
  tooMany: boolean
}

/** FNV-1a sobre os bytes da célula (bucket + comparação byte a byte anti-colisão). */
function hashBytes(bytes: Uint8ClampedArray): number {
  let h = 0x811c9dc5
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i] ?? 0
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function sameBytes(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false
  return true
}

/**
 * Corta e deduplica. Sobra que não divide por `tileSize` é cortada (floor,
 * igual ao runtime). Célula 100% transparente vira -1 (vazio) — não consome
 * uma peça única.
 */
export function sliceTiles(input: SliceInput, tileSize: number): SliceResult {
  const t = Math.floor(tileSize)
  const cols = t > 0 ? Math.floor(input.width / t) : 0
  const rows = t > 0 ? Math.floor(input.height / t) : 0
  const cells: number[][] = []
  const uniqueTiles: Uint8ClampedArray[] = []
  const buckets = new Map<number, number[]>()
  let tooMany = false
  const src = input.data
  for (let r = 0; r < rows; r += 1) {
    const line: number[] = []
    for (let c = 0; c < cols; c += 1) {
      const bytes = new Uint8ClampedArray(t * t * 4)
      let opaque = false
      for (let y = 0; y < t; y += 1) {
        const srcStart = ((r * t + y) * input.width + c * t) * 4
        for (let x = 0; x < t * 4; x += 1) {
          const v = Number(src[srcStart + x] ?? 0)
          bytes[y * t * 4 + x] = v
          // Alpha é o 4º byte de cada pixel.
          if (x % 4 === 3 && v > 0) opaque = true
        }
      }
      if (!opaque) {
        line.push(-1)
        continue
      }
      const h = hashBytes(bytes)
      const bucket = buckets.get(h)
      let found = -1
      if (bucket) {
        for (const idx of bucket) {
          const tile = uniqueTiles[idx]
          if (tile && sameBytes(tile, bytes)) {
            found = idx
            break
          }
        }
      }
      if (found === -1) {
        if (uniqueTiles.length >= MAX_UNIQUE_TILES) {
          tooMany = true
          line.push(-1)
          continue
        }
        found = uniqueTiles.length
        uniqueTiles.push(bytes)
        if (bucket) bucket.push(found)
        else buckets.set(h, [found])
      }
      line.push(found)
    }
    cells.push(line)
  }
  return { cells, uniqueTiles, cols, rows, tooMany }
}

/** Colunas da folha empacotada (mesmo empacotamento do Pinta: min(count, 8)). */
export function packedSheetCols(count: number): number {
  return Math.max(1, Math.min(count, 8))
}

/**
 * Lê o ImageData de um dataUrl (browser). Guarda o ctx ANTES do Image (regra
 * do repo: em happy-dom o getContext é null e o Image nunca carrega — devolver
 * null em vez de pendurar a promise).
 */
export function imageDataFromDataUrl(dataUrl: string): Promise<ImageData | null> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 0, 0)
      try {
        resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

/**
 * Monta o `ProjectTilemapMeta` completo de uma imagem de mapa: fatia, deduplica,
 * empacota as peças únicas numa folha PNG e serializa a grade. `null` = sem
 * canvas, raster falhou ou peças únicas demais (`tooMany` chega separado).
 */
export async function imageToTilemapMeta(
  dataUrl: string,
  tileSize: number,
  solid: readonly number[],
): Promise<{ meta: ProjectTilemapMeta | null; tooMany: boolean }> {
  const imageData = await imageDataFromDataUrl(dataUrl)
  if (!imageData) return { meta: null, tooMany: false }
  const sliced = sliceTiles(imageData, tileSize)
  if (sliced.tooMany) return { meta: null, tooMany: true }
  if (sliced.cols === 0 || sliced.rows === 0 || sliced.uniqueTiles.length === 0) {
    return { meta: null, tooMany: false }
  }
  const t = Math.floor(tileSize)
  const cols = packedSheetCols(sliced.uniqueTiles.length)
  const rows = Math.ceil(sliced.uniqueTiles.length / cols)
  const sheet = document.createElement('canvas')
  sheet.width = cols * t
  sheet.height = rows * t
  const ctx = sheet.getContext('2d')
  if (!ctx) return { meta: null, tooMany: false }
  for (let i = 0; i < sliced.uniqueTiles.length; i += 1) {
    const bytes = sliced.uniqueTiles[i]
    if (!bytes) continue
    const tile = new ImageData(new Uint8ClampedArray(bytes), t, t)
    ctx.putImageData(tile, (i % cols) * t, Math.floor(i / cols) * t)
  }
  const sheetUrl = sheet.toDataURL('image/png')
  // toDataURL acima do teto do device devolve "data:," sem lançar (regra do repo).
  if (!sheetUrl.startsWith('data:image/')) return { meta: null, tooMany: false }
  return {
    meta: {
      tileSize: t,
      cols: sliced.cols,
      rows: sliced.rows,
      grid: serializeGrid(sliced.cells),
      solid: [...new Set(solid.map((n) => Math.floor(n)).filter((n) => n >= 0))].sort(
        (a, b) => a - b,
      ),
      tileset: { dataUrl: sheetUrl, width: sheet.width, height: sheet.height },
    },
    tooMany: false,
  }
}
