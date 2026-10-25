import {
  assertPintaImageDimensions,
  type PintaImageTargetLimits,
} from '@sistemazero/core/studio/pinta-image'
import type { AnyTilesetAsset, PintaBitmap, TilemapAsset } from '../core/project'
import { resolveAssetPalette } from '../core/project'
import { bitmapToRGBA } from '../pixel/render'
import type { VectorShape } from '../vector/model'
import { embedVectorFonts, vectorToPortableSvg } from '../vector/portableSvg'
import { sceneDefsMarkup, shapesToMarkup, type VectorDoc } from '../vector/svg'

export type PintaImageScene =
  | { kind: 'pixel'; bitmap: PintaBitmap; colors: readonly string[] }
  | { kind: 'vector'; doc: VectorDoc }
  | { kind: 'map'; map: TilemapAsset; tileset: AnyTilesetAsset }

/** The production implementation owns all native resources. Tests can use a real native canvas. */
export interface PintaImageRaster {
  createCanvas(width: number, height: number): HTMLCanvasElement
  releaseCanvas(canvas: HTMLCanvasElement): void
  drawSvg(svg: string, canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void>
}

function throwFailures(primary: unknown, cleanup: unknown[]): void {
  if (primary !== undefined && cleanup.length)
    throw new AggregateError([primary, ...cleanup], 'Falha ao preparar e liberar a imagem.', {
      cause: primary,
    })
  if (primary !== undefined) throw primary
  if (cleanup.length) throw new AggregateError(cleanup, 'Não foi possível liberar a imagem.')
}

export const browserPintaImageRaster: PintaImageRaster = {
  releaseCanvas(canvas) {
    canvas.width = 0
    canvas.height = 0
  },
  createCanvas(width, height) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  },
  async drawSvg(svg, canvas, signal) {
    signal?.throwIfAborted()
    const context = canvas.getContext('2d')
    if (!context || typeof Image === 'undefined')
      throw new Error('Não foi possível preparar a imagem neste navegador.')
    let url: string | undefined
    let image: HTMLImageElement | undefined
    let primary: unknown
    let abort = () => {}
    try {
      url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      const ownedImage = new Image()
      image = ownedImage
      await new Promise<void>((resolve, reject) => {
        abort = () => reject(signal?.reason ?? new DOMException('Imagem cancelada.', 'AbortError'))
        ownedImage.onload = () => resolve()
        ownedImage.onerror = () => reject(new Error('Não foi possível renderizar este desenho.'))
        signal?.addEventListener('abort', abort, { once: true })
        if (signal?.aborted) abort()
        else ownedImage.src = url!
      })
      signal?.throwIfAborted()
      context.drawImage(ownedImage, 0, 0, canvas.width, canvas.height)
    } catch (error) {
      primary = error
    }
    const failures: unknown[] = []
    for (const cleanup of [
      () => signal?.removeEventListener('abort', abort),
      () => {
        if (image) {
          image.onload = image.onerror = null
          image.src = ''
        }
      },
      () => {
        if (url) URL.revokeObjectURL(url)
      },
    ]) {
      try {
        cleanup()
      } catch (error) {
        failures.push(error)
      }
    }
    throwFailures(primary, failures)
  },
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  return crc >>> 0
})

/** Only PNG raster references are allowed by Pinta's vector model. No URL/other MIME fallback. */
export function pngBytes(dataUrl: string, limits: PintaImageTargetLimits): Uint8Array<ArrayBuffer> {
  const prefix = 'data:image/png;base64,'
  if (!dataUrl.startsWith(prefix) || dataUrl.length > limits.dataUrlChars)
    throw new Error('A imagem PNG é inválida ou ultrapassa o limite do projeto.')
  const encoded = dataUrl.slice(prefix.length)
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded) ||
    (encoded.length / 4) * 3 - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0) >
      limits.imageBytes
  )
    throw new Error('Os bytes da imagem PNG ultrapassam o limite ou são inválidos.')
  const binary = atob(encoded)
  if (btoa(binary) !== encoded) throw new Error('Codificação PNG inválida.')
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  readPngDimensions(bytes, limits)
  return bytes
}

export function readPngDimensions(
  bytes: Uint8Array,
  limits: PintaImageTargetLimits,
): { width: number; height: number } {
  if (
    bytes.length < 45 ||
    bytes.length > limits.imageBytes ||
    ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  )
    throw new Error('Arquivo PNG inválido.')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452)
    throw new Error('Cabeçalho PNG inválido.')
  const width = view.getUint32(16),
    height = view.getUint32(20)
  assertPintaImageDimensions(width, height, limits)
  let cursor = 8,
    imageData = false,
    ended = false
  while (cursor + 12 <= bytes.length) {
    const length = view.getUint32(cursor)
    if (length > bytes.length - cursor - 12) throw new Error('Arquivo PNG truncado.')
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8))
    if (
      !/^[A-Za-z]{4}$/.test(type) ||
      type === 'acTL' ||
      type === 'fcTL' ||
      type === 'fdAT' ||
      (cursor !== 8 && type === 'IHDR') ||
      (type[0] === type[0]?.toUpperCase() && !['IHDR', 'PLTE', 'IDAT', 'IEND'].includes(type))
    )
      throw new Error('Use um PNG estático válido.')
    let crc = 0xffffffff
    for (let index = cursor + 4; index < cursor + 8 + length; index++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[index]!) & 0xff]!
    }
    if ((crc ^ 0xffffffff) >>> 0 !== view.getUint32(cursor + 8 + length))
      throw new Error('Integridade PNG inválida.')
    if (type === 'IDAT') imageData = true
    cursor += length + 12
    if (type === 'IEND') {
      if (length !== 0 || !imageData || cursor !== bytes.length)
        throw new Error('Fim PNG inválido.')
      ended = true
      break
    }
  }
  if (!ended) throw new Error('Arquivo PNG incompleto.')
  return { width, height }
}

function* mapCells(map: TilemapAsset) {
  // Includes visible front layers, in their original z-order. Transparent top tiles keep the floor.
  for (const layer of map.layers) {
    if (!layer.visible) continue
    for (let index = 0; index < layer.cells.length; index++) {
      const tile = layer.cells[index]!
      if (tile >= 0) yield { tile, col: index % map.cols, row: Math.floor(index / map.cols) }
    }
  }
}

function sceneShapes(scene: PintaImageScene): VectorShape[] {
  if (scene.kind === 'vector') return scene.doc.shapes
  if (scene.kind !== 'map' || scene.tileset.kind !== 'vector-tileset') return []
  const used = new Set([...mapCells(scene.map)].map((cell) => cell.tile))
  return [...used].flatMap((index) =>
    scene.tileset.kind === 'vector-tileset' ? (scene.tileset.tiles[index] ?? []) : [],
  )
}

/** Validate every embedded bitmap before the SVG decoder sees any of them. */
export function validateSceneImages(
  scene: PintaImageScene,
  outputPixels: number,
  limits: PintaImageTargetLimits,
): void {
  const seen = new Set<string>()
  let pixels = outputPixels
  for (const shape of sceneShapes(scene)) {
    if (shape.type !== 'image' || seen.has(shape.src)) continue
    seen.add(shape.src)
    const bytes = pngBytes(shape.src, limits)
    const image = readPngDimensions(bytes, limits)
    pixels += image.width * image.height
    if (pixels > limits.totalImagePixels)
      throw new Error('As imagens deste desenho ultrapassam o limite de pixels do projeto.')
  }
}

async function sceneSvg(scene: Exclude<PintaImageScene, { kind: 'pixel' }>): Promise<string> {
  if (scene.kind === 'vector') return vectorToPortableSvg(scene.doc)
  if (scene.tileset.kind !== 'vector-tileset') throw new Error('Peças vetoriais esperadas.')
  const tileset = scene.tileset,
    map = scene.map,
    size = tileset.tileSize
  const cells = [...mapCells(map)]
  const used = [...new Set(cells.map((cell) => cell.tile))]
  const symbols = used.map((index) => {
    const shapes = tileset.tiles[index]
    if (!shapes) throw new Error('O mapa aponta para uma peça que não existe mais.')
    return `<g id="tile-${index}" clip-path="url(#pinta-tile-viewport)">${sceneDefsMarkup(shapes, `tile-${index}-`)}${shapesToMarkup(shapes, '', `tile-${index}-`)}</g>`
  })
  // Local fragment only. SVG2 href and SVG1.1 xlink are identical; no external resource lookup.
  const uses = cells.map(
    ({ tile, col, row }) =>
      `<use href="#tile-${tile}" xlink:href="#tile-${tile}" x="${col * size}" y="${row * size}"/>`,
  )
  return embedVectorFonts(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${map.cols * size}" height="${map.rows * size}" viewBox="0 0 ${map.cols * size} ${map.rows * size}"><defs><clipPath id="pinta-tile-viewport"><rect width="${size}" height="${size}"/></clipPath>${symbols.join('')}</defs>${uses.join('')}</svg>`,
    sceneShapes(scene),
  )
}

/** True when the scene has a portable vector document (an SVG recipe can be honored). */
export function pintaImageSceneIsVector(scene: PintaImageScene): boolean {
  return (
    scene.kind === 'vector' || (scene.kind === 'map' && scene.tileset.kind === 'vector-tileset')
  )
}

/**
 * The selected vector as a self-contained SVG whose ROOT says the output size: `width`/`height`
 * are the scaled output and the `viewBox` keeps the content's own coordinates, so a Pygame Zero
 * reader (root size, nanosvg rule) and the browser draw it at exactly width x height.
 * Same markup as the PNG path, which rasterizes this very document.
 */
export async function renderPintaImageSvg(
  scene: PintaImageScene,
  width: number,
  height: number,
  limits: PintaImageTargetLimits,
  signal?: AbortSignal,
): Promise<string> {
  signal?.throwIfAborted()
  assertPintaImageDimensions(width, height, limits)
  if (scene.kind === 'pixel' || !pintaImageSceneIsVector(scene))
    throw new Error('Este desenho é de pixels e só pode vir como imagem PNG.')
  validateSceneImages(scene, width * height, limits)
  const svg = await sceneSvg(scene)
  signal?.throwIfAborted()
  return withRootSize(svg, width, height)
}

function withRootSize(svg: string, width: number, height: number): string {
  const rootEnd = svg.indexOf('>')
  if (!svg.startsWith('<svg') || rootEnd < 0) throw new Error('O desenho vetorial é inválido.')
  const root = svg.slice(0, rootEnd)
  if (!/\swidth="[^"]*"/.test(root) || !/\sheight="[^"]*"/.test(root) || !/\sviewBox="/.test(root))
    throw new Error('O desenho vetorial não diz o próprio tamanho.')
  return (
    root
      .replace(/(\s)width="[^"]*"/, `$1width="${width}"`)
      .replace(/(\s)height="[^"]*"/, `$1height="${height}"`) + svg.slice(rootEnd)
  )
}

export async function renderPintaImage(
  scene: PintaImageScene,
  width: number,
  height: number,
  limits: PintaImageTargetLimits,
  signal?: AbortSignal,
  raster: PintaImageRaster = browserPintaImageRaster,
): Promise<Uint8Array<ArrayBuffer>> {
  signal?.throwIfAborted()
  assertPintaImageDimensions(width, height, limits)
  validateSceneImages(scene, width * height, limits)
  // Font imports finish before any native allocation. The SVG viewport, not its viewBox, is scaled.
  const svg =
    scene.kind === 'vector' || (scene.kind === 'map' && scene.tileset.kind === 'vector-tileset')
      ? await sceneSvg(scene)
      : null
  signal?.throwIfAborted()
  const canvases: HTMLCanvasElement[] = []
  let allocatedPixels = 0
  const create = (w: number, h: number) => {
    assertPintaImageDimensions(w, h, limits)
    if (allocatedPixels + w * h > limits.totalImagePixels)
      throw new Error('O preparo ultrapassa o limite de pixels do projeto.')
    const canvas = raster.createCanvas(w, h)
    canvases.push(canvas)
    allocatedPixels += w * h
    return canvas
  }
  let primary: unknown, output: Uint8Array<ArrayBuffer> | undefined
  try {
    const canvas = create(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D indisponível para preparar a imagem.')
    if (svg !== null) {
      const rootEnd = svg.indexOf('>')
      const root = svg
        .slice(0, rootEnd)
        .replace(/\bwidth="[^"]*"/, `width="${width}"`)
        .replace(/\bheight="[^"]*"/, `height="${height}"`)
      await raster.drawSvg(root + svg.slice(rootEnd), canvas, signal)
    } else {
      context.imageSmoothingEnabled = false
      const bitmapCanvas = (bitmap: PintaBitmap, colors: readonly string[]) => {
        const base = create(bitmap.width, bitmap.height)
        const ctx = base.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D indisponível para as peças.')
        const data = ctx.createImageData(bitmap.width, bitmap.height)
        data.data.set(bitmapToRGBA(bitmap, colors))
        ctx.putImageData(data, 0, 0)
        return base
      }
      if (scene.kind === 'pixel')
        context.drawImage(bitmapCanvas(scene.bitmap, scene.colors), 0, 0, width, height)
      else if (scene.kind === 'map' && scene.tileset.kind === 'tileset') {
        const tiles = new Map<number, HTMLCanvasElement>()
        const colors = resolveAssetPalette(scene.tileset)
        const cellWidth = width / scene.map.cols,
          cellHeight = height / scene.map.rows
        for (const cell of mapCells(scene.map)) {
          let tile = tiles.get(cell.tile)
          if (!tile) {
            const bitmap = scene.tileset.tiles[cell.tile]
            if (!bitmap) throw new Error('O mapa aponta para uma peça que não existe mais.')
            tile = bitmapCanvas(bitmap, colors)
            tiles.set(cell.tile, tile)
          }
          context.drawImage(
            tile,
            cell.col * cellWidth,
            cell.row * cellHeight,
            cellWidth,
            cellHeight,
          )
        }
      }
    }
    signal?.throwIfAborted()
    output = pngBytes(canvas.toDataURL('image/png'), limits)
    const actual = readPngDimensions(output, limits)
    if (actual.width !== width || actual.height !== height)
      throw new Error('O PNG não corresponde ao tamanho escolhido.')
  } catch (error) {
    primary = error
  }
  const cleanup: unknown[] = []
  for (const canvas of canvases.reverse()) {
    try {
      raster.releaseCanvas(canvas)
    } catch (error) {
      cleanup.push(error)
    }
  }
  throwFailures(primary, cleanup)
  if (!output) throw new Error('Não foi possível preparar o PNG.')
  return output
}
