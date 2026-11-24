type Point = { x: number; y: number }
export interface MapPaperGeometry {
  cols: number
  rows: number
  tileSize: number
  pad: number
  origin?: { col: number; row: number }
}
type Box = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

/** Client pointer to world pixels. No clipping: resizing may continue beyond the paper. */
export function mapPointFromPaper(
  point: Point,
  options: MapPaperGeometry & { paper: Pick<Box, 'left' | 'top' | 'width' | 'height'> },
): Point | null {
  const { paper, cols, rows, tileSize, pad, origin } = options
  if (
    ![
      point.x,
      point.y,
      paper.left,
      paper.top,
      paper.width,
      paper.height,
      cols,
      rows,
      tileSize,
      pad,
      origin?.col ?? 0,
      origin?.row ?? 0,
    ].every(Number.isFinite) ||
    paper.width <= 0 ||
    paper.height <= 0 ||
    cols <= 0 ||
    rows <= 0 ||
    tileSize <= 0 ||
    pad < 0
  )
    return null
  return {
    x:
      (((point.x - paper.left) / paper.width) * (cols + 2 * pad) - pad + (origin?.col ?? 0)) *
      tileSize,
    y:
      (((point.y - paper.top) / paper.height) * (rows + 2 * pad) - pad + (origin?.row ?? 0)) *
      tileSize,
  }
}

/** World pixels to CSS pixels relative to an admitted map's paper. */
export function mapPointToPaper(
  point: Point,
  options: Pick<MapPaperGeometry, 'origin' | 'tileSize' | 'pad'> & { cellPx: number },
): Point {
  return {
    x: (point.x / options.tileSize - (options.origin?.col ?? 0) + options.pad) * options.cellPx,
    y: (point.y / options.tileSize - (options.origin?.row ?? 0) + options.pad) * options.cellPx,
  }
}

/** Canvas is a moving viewport of the paper. Layer offset is applied exactly once. */
export function mapCellFromCanvas(
  point: Point,
  options: Pick<MapPaperGeometry, 'origin' | 'tileSize' | 'pad'> & {
    canvas: Pick<Box, 'left' | 'top'>
    viewport: Point
    cellPx: number
    layerOffset: Point
  },
): { col: number; row: number } {
  const { canvas, viewport, cellPx, tileSize, pad, origin, layerOffset } = options
  return {
    col:
      Math.floor((point.x - canvas.left + viewport.x) / cellPx - layerOffset.x / tileSize) -
      pad +
      (origin?.col ?? 0),
    row:
      Math.floor((point.y - canvas.top + viewport.y) / cellPx - layerOffset.y / tileSize) -
      pad +
      (origin?.row ?? 0),
  }
}

/** Coordenadas autorais do papel, mesmo com o canvas recortado por culling ou rolagem. */
export function pointOnMap(
  point: Point,
  options: MapPaperGeometry & {
    paper: Box
    stage: Box
    viewport: { width: number; height: number }
  },
): Point | null {
  const { stage, viewport, cols, rows, tileSize, origin } = options
  if (
    ![
      stage.left,
      stage.top,
      stage.right,
      stage.bottom,
      stage.width,
      stage.height,
      viewport.width,
      viewport.height,
    ].every(Number.isFinite)
  )
    return null
  if (point.x < 0 || point.y < 0 || point.x >= viewport.width || point.y >= viewport.height)
    return null
  if (stage.width <= 0 || stage.height <= 0) return null
  if (
    point.x < stage.left ||
    point.x >= stage.right ||
    point.y < stage.top ||
    point.y >= stage.bottom
  )
    return null
  const result = mapPointFromPaper(point, options),
    left = (origin?.col ?? 0) * tileSize,
    top = (origin?.row ?? 0) * tileSize
  return !result ||
    result.x < left ||
    result.y < top ||
    result.x >= left + cols * tileSize ||
    result.y >= top + rows * tileSize
    ? null
    : result
}
