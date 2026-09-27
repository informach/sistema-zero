export interface RasterPngPass {
  x: number
  y: number
  stepX: number
  stepY: number
  width: number
  height: number
  rowBytes: number
  offset: number
}

const ADAM7 = [
  [0, 0, 8, 8],
  [4, 0, 8, 8],
  [0, 4, 4, 8],
  [2, 0, 4, 4],
  [0, 2, 2, 4],
  [1, 0, 2, 2],
  [0, 1, 1, 2],
] as const

/** Empty Adam7 passes have neither pixels nor filter bytes. */
export function rasterPngPasses(
  width: number,
  height: number,
  bitsPerPixel: number,
  interlaced: boolean,
) {
  const passes: RasterPngPass[] = []
  let byteLength = 0
  for (const [x, y, stepX, stepY] of interlaced ? ADAM7 : ([[0, 0, 1, 1]] as const)) {
    const columns = Math.max(0, Math.ceil((width - x) / stepX))
    const rows = Math.max(0, Math.ceil((height - y) / stepY))
    if (columns === 0 || rows === 0) continue
    const rowBytes = Math.ceil((columns * bitsPerPixel) / 8)
    passes.push({ x, y, stepX, stepY, width: columns, height: rows, rowBytes, offset: byteLength })
    byteLength += (rowBytes + 1) * rows
  }
  return { passes, byteLength }
}
