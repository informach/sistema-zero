import { type ProductionReport, productionReportPageSchema } from '@sistemazero/marketing-contracts'
import type { WorkbenchPort } from './port'

/** A shared report is the durable receipt for that immutable inventory folder.
 * Changed local files belong to a new inventory, not a replay of this receipt. */
export async function sharedProductionReports(
  request: WorkbenchPort['request'],
  projectId: string,
  inventoryId: string,
  stopped: () => boolean = () => false,
) {
  const result: ProductionReport[] = [],
    ids = new Set<string>(),
    folders = new Set<string>(),
    cursors = new Set<string>()
  let cursor: string | null = null
  do {
    if (stopped()) throw new Error('Consulta de conferências interrompida')
    const page = productionReportPageSchema.parse(
      await request(
        `/projects/${projectId}/imports/${inventoryId}/production-reports${cursor ? `?after=${cursor}` : ''}`,
      ),
    )
    for (const report of page.items) {
      if (
        report.projectId !== projectId ||
        report.inventoryId !== inventoryId ||
        ids.has(report.id) ||
        folders.has(report.review.folder.path)
      )
        throw new Error('A consulta retornou outra carga ou uma conferência repetida')
      ids.add(report.id)
      folders.add(report.review.folder.path)
      result.push(report)
      if (result.length > 1000)
        throw new Error('A carga excede 1.000 conferências; confira conjuntos menores')
    }
    cursor = page.nextCursor
    if (cursor && cursors.has(cursor)) throw new Error('A consulta de conferências não avançou')
    if (cursor) cursors.add(cursor)
  } while (cursor)
  return result
}
