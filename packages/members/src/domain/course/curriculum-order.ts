/** Reserve a disjoint range below all active and historical rows before reordering. */
export function curriculumParkingPositions(
  rows: readonly { id: string; sortOrder: number; archivedAt: Date | null }[],
) {
  let position = rows.reduce((lowest, row) => Math.min(lowest, row.sortOrder), 0)
  const active = rows.filter((row) => row.archivedAt === null)
  if (position - active.length < -2147483648)
    throw new Error('Limite de ordenação do histórico atingido')
  return active.map((row) => ({ id: row.id, sortOrder: --position }))
}
