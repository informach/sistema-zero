import { createHash } from 'node:crypto'
import { canonicalJson, inventoryDigestBoundary } from '@sistemazero/marketing-contracts'
import { and, asc, eq, gte } from 'drizzle-orm'
import { WorkspaceError } from '../../../domain/workspace/workspace-error'
import type { WorkspaceTransaction } from './workspace.repository'
import {
  editorialImportEntries as entries,
  type editorialImports as runs,
} from './workspace-schema'

/** Also used for retired snapshots: a receiving inventory can be retired before
 * sealing, so the retired state alone cannot establish complete source coverage. */
export async function verifyInventoryIntegrity(
  tx: WorkspaceTransaction,
  run: typeof runs.$inferSelect,
) {
  const conflict = (message: string) => new WorkspaceError('IMPORT_CONFLICT', message)
  if (run.received !== run.entryCount)
    throw conflict('Inventário incompleto; compare retratos completos')
  const boundary = inventoryDigestBoundary(run.origin, run.policyVersion),
    hash = createHash('sha256').update(boundary.prefix)
  let count = 0
  for (;;) {
    const page = await tx
      .select({ ordinal: entries.ordinal, source: entries.source })
      .from(entries)
      .where(and(eq(entries.runId, run.id), gte(entries.ordinal, count)))
      .orderBy(asc(entries.ordinal))
      .limit(500)
    for (const entry of page) {
      if (entry.ordinal !== count) throw conflict('Inventário contém uma lacuna')
      hash.update(`${count ? ',' : ''}${canonicalJson(entry.source)}`)
      count++
    }
    if (page.length < 500) break
  }
  const digest = hash.update(boundary.suffix).digest('hex')
  if (count !== run.entryCount || digest !== run.digest)
    throw conflict('O retrato recebido não corresponde ao hash do inventário')
}
