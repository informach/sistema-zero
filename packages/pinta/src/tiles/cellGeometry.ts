/**
 * Geometria PURA em CÉLULAS do mapa — o espelho de `pixel/bitmap.ts`/`selection.ts`
 * para a grade de tiles. Sem DOM, testável: retângulos clampados, linha de
 * Bresenham por célula, células de um retângulo.
 */

export interface CellPos {
  col: number
  row: number
}

export interface CellRect {
  col: number
  row: number
  cols: number
  rows: number
}

/**
 * Normaliza dois cantos de arrasto num retângulo de células CLAMPADO à grade
 * (espelho de `normalizeRect` do pixel). `null` quando não sobra nada dentro.
 */
export function normalizeCellRect(
  a: CellPos,
  b: CellPos,
  maxCols: number,
  maxRows: number,
): CellRect | null {
  if (maxCols <= 0 || maxRows <= 0) return null
  const c0 = Math.max(Math.min(a.col, b.col), 0)
  const r0 = Math.max(Math.min(a.row, b.row), 0)
  const c1 = Math.min(Math.max(a.col, b.col), maxCols - 1)
  const r1 = Math.min(Math.max(a.row, b.row), maxRows - 1)
  if (c1 < c0 || r1 < r0) return null
  return { col: c0, row: r0, cols: c1 - c0 + 1, rows: r1 - r0 + 1 }
}

/** Células de uma linha reta entre dois pontos (Bresenham, conectividade-8). */
export function lineCells(a: CellPos, b: CellPos): CellPos[] {
  const out: CellPos[] = []
  let x = a.col
  let y = a.row
  const dx = Math.abs(b.col - x)
  const dy = Math.abs(b.row - y)
  const sx = x < b.col ? 1 : -1
  const sy = y < b.row ? 1 : -1
  let err = dx - dy
  // Guarda de sanidade (posições absurdas não devem prender o loop).
  const max = dx + dy + 1
  for (let i = 0; i <= max; i += 1) {
    out.push({ col: x, row: y })
    if (x === b.col && y === b.row) break
    const e2 = 2 * err
    if (e2 > -dy) {
      err -= dy
      x += sx
    }
    if (e2 < dx) {
      err += dx
      y += sy
    }
  }
  return out
}

/** Todas as células de um retângulo, em ordem row-major. */
export function rectCells(rect: CellRect): CellPos[] {
  const out: CellPos[] = []
  for (let r = 0; r < rect.rows; r += 1) {
    for (let c = 0; c < rect.cols; c += 1) {
      out.push({ col: rect.col + c, row: rect.row + r })
    }
  }
  return out
}

/** Verdadeiro se a célula cai dentro do retângulo. */
export function cellInRect(rect: CellRect, p: CellPos): boolean {
  return (
    p.col >= rect.col &&
    p.col < rect.col + rect.cols &&
    p.row >= rect.row &&
    p.row < rect.row + rect.rows
  )
}
