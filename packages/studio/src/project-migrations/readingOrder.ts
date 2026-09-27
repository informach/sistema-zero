/** Ordem de leitura do editor anterior às Áreas do projeto. */
const COLUMN_TOLERANCE = 150
export function readingOrderIndices(positions: { x: number; y: number }[]): number[] {
  const indices = positions.map((_, i) => i)
  if (positions.length <= 1) return indices
  const byX = [...indices].sort((a, b) => (positions[a]?.x ?? 0) - (positions[b]?.x ?? 0))
  const columnOf = new Map<number, number>()
  let column = 0
  let prevX = positions[byX[0] ?? 0]?.x ?? 0
  for (const i of byX) {
    const x = positions[i]?.x ?? 0
    if (x - prevX > COLUMN_TOLERANCE) column += 1
    columnOf.set(i, column)
    prevX = x
  }
  return indices.sort((a, b) => {
    const colA = columnOf.get(a) ?? 0
    const colB = columnOf.get(b) ?? 0
    if (colA !== colB) return colA - colB
    return (positions[a]?.y ?? 0) - (positions[b]?.y ?? 0)
  })
}

export function sortLegacyTopBlocks<T extends { x?: number; y?: number }>(blocks: T[]): T[] {
  if (blocks.every((block) => block.x === undefined && block.y === undefined)) return blocks
  return readingOrderIndices(blocks.map((block) => ({ x: block.x ?? 0, y: block.y ?? 0 }))).map(
    (index) => blocks[index]!,
  )
}
