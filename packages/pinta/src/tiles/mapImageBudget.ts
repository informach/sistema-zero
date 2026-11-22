/** The scene compositor already caps output area at 16 Mi pixels. Region
 * images also cap each side, before allocating a raster or preparing fonts. */
export const MAP_IMAGE_LIMITS = {
  dimension: 8192,
  pixels: 16_777_216,
  thumbnail: 512,
  svgChars: 8 * 1024 * 1024,
} as const

export function mapImageSize(
  map: { cols: number; rows: number },
  tileSize: number,
  scale: number,
  maxPx = Infinity,
): { width: number; height: number; scale: number } | null {
  return mapPixelImageSize(map.cols * tileSize, map.rows * tileSize, scale, maxPx)
}

export function mapPixelImageSize(
  widthPixels: number,
  heightPixels: number,
  scale: number,
  maxPx = Infinity,
): { width: number; height: number; scale: number } | null {
  if (!Number.isFinite(scale) || scale <= 0 || !(maxPx > 0)) return null
  const actual = Math.min(scale, maxPx / Math.max(widthPixels, heightPixels)),
    width = Math.max(1, Math.round(widthPixels * actual)),
    height = Math.max(1, Math.round(heightPixels * actual))
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width > MAP_IMAGE_LIMITS.dimension ||
    height > MAP_IMAGE_LIMITS.dimension ||
    width * height > MAP_IMAGE_LIMITS.pixels
  )
    return null
  return { width, height, scale: actual }
}

export class MapImageBudgetError extends Error {
  constructor() {
    super('A imagem ficou grande demais. Use uma escala menor ou baixe o cenário como projeto.')
    this.name = 'MapImageBudgetError'
  }
}

/** Checked per fragment as well as after portable fonts are embedded. */
export function admitMapSvg(svg: string): string {
  if (svg.length > MAP_IMAGE_LIMITS.svgChars) throw new MapImageBudgetError()
  return svg
}
