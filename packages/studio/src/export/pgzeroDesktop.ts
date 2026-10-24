import { studioPortableFileConflict } from '@sistemazero/core/studio/project-environment'
import type { PythonAssetManifestEntry } from '../core/pythonAssets'
import { PGZERO_EXTENSION, PGZERO_UPSTREAM } from '../runtime/python/pgzero/contract'
import { pgzeroSvgSize } from '../runtime/python/pgzero/svgSize'
import type { ExportFileMap } from './fileMap'

/** Turns an SVG into a PNG of exactly width x height. Injected by tests; the browser by default. */
export type SvgRasterizer = (
  svg: Uint8Array<ArrayBuffer>,
  width: number,
  height: number,
) => Promise<Uint8Array<ArrayBuffer>>

/** Browser rasterizer: the same engine that draws the vector in the Studio. */
export const browserSvgRasterizer: SvgRasterizer = async (svg, width, height) => {
  if (typeof document === 'undefined' || typeof Image === 'undefined')
    throw new Error('Sem navegador para desenhar o SVG.')
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Sem canvas para desenhar o SVG.')
    context.drawImage(image, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('O navegador não gerou o PNG.')
    return new Uint8Array(await blob.arrayBuffer())
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function hasPgzeroExtension(project: { installedExtensions: readonly { id: string }[] }) {
  return project.installedExtensions.some((extension) => extension.id === PGZERO_EXTENSION.id)
}

/**
 * Desktop Pygame Zero (pgzero 1.2.1) finds png/gif/jpg/bmp but not svg. Each vector image in an
 * images/ folder gets a PNG of the same size next to it: the program is unchanged and pgzero
 * picks the PNG. The SVG stays, still editable. Existing files are never replaced.
 */
export async function buildPgzeroDesktopFiles(input: {
  assets: readonly PythonAssetManifestEntry[]
  bundle: ReadonlyMap<string, Uint8Array<ArrayBuffer>>
  occupied: readonly string[]
  directories: readonly string[]
  rasterize: SvgRasterizer
}) {
  const occupied = [...input.occupied]
  const files: ExportFileMap = {}
  const converted: string[] = []
  const warnings: string[] = []
  const free = (path: string) =>
    !studioPortableFileConflict([...occupied, path], [...input.directories])
  for (const asset of input.assets) {
    if (asset.mime !== 'image/svg+xml' || !/(^|\/)images\/[^/]+\.svg$/i.test(asset.path)) continue
    const png = asset.path.replace(/\.svg$/i, '.png')
    if (!free(png)) {
      warnings.push(
        `${png} já existe; o Pygame Zero do computador vai usar esse arquivo no lugar de ${asset.path}.`,
      )
      continue
    }
    const bytes = input.bundle.get(asset.path)
    const size = bytes && pgzeroSvgSize(new TextDecoder().decode(bytes))
    if (!bytes || !size) {
      warnings.push(`Não consegui ler o tamanho de ${asset.path}; ele não foi convertido em PNG.`)
      continue
    }
    try {
      files[png] = await input.rasterize(bytes, size.width, size.height)
    } catch {
      warnings.push(
        `Não consegui converter ${asset.path} em PNG; no computador o Pygame Zero não abre SVG.`,
      )
      continue
    }
    occupied.push(png)
    converted.push(png)
  }
  let requirementsPath: string | null = null
  for (let index = 1; ; index++) {
    const path = `requisitos-pygame-zero${index === 1 ? '' : `-${index}`}.txt`
    if (!free(path)) continue
    requirementsPath = path
    break
  }
  // pgzero 1.2.1 declares the old pygame; pygame-ce replaces it, so pgzero goes in without deps.
  files[requirementsPath] = `pygame-ce==${PGZERO_UPSTREAM.pygameCe}\nnumpy\n`
  return { files, converted, warnings, requirementsPath }
}
