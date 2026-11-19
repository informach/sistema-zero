type Point = { x: number; y: number }
type Box = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

/** Coordenadas autorais do papel, mesmo com o canvas recortado por culling ou rolagem. */
export function pointOnMap(
  point: Point,
  options: {
    paper: Box
    stage: Box
    viewport: { width: number; height: number }
    cols: number
    rows: number
    tileSize: number
    pad: number
  },
): Point | null {
  const { paper, stage, viewport, cols, rows, tileSize, pad } = options
  if (point.x < 0 || point.y < 0 || point.x >= viewport.width || point.y >= viewport.height)
    return null
  if (paper.width <= 0 || paper.height <= 0 || stage.width <= 0 || stage.height <= 0) return null
  if (
    point.x < stage.left ||
    point.x >= stage.right ||
    point.y < stage.top ||
    point.y >= stage.bottom
  )
    return null
  const result = {
    x: (((point.x - paper.left) / paper.width) * (cols + 2 * pad) - pad) * tileSize,
    y: (((point.y - paper.top) / paper.height) * (rows + 2 * pad) - pad) * tileSize,
  }
  return result.x < 0 || result.y < 0 || result.x >= cols * tileSize || result.y >= rows * tileSize
    ? null
    : result
}
