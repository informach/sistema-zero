import { sql } from 'drizzle-orm'
import { KidsJourneyCatalogBusyError } from '../../../domain/kids-journey/kids-journey.errors'
import type { Database } from './db'
import { courses, lessonBlocks, lessons } from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]
function lockUnavailable(error: unknown): boolean {
  let current = error
  for (let depth = 0; depth < 5 && typeof current === 'object' && current !== null; depth++) {
    if ((current as { code?: unknown }).code === '55P03') return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/**
 * One connection from LOCK through hash/CAS/commit. READ COMMITTED prevents any earlier
 * authorization/preparation read from fixing an old RR snapshot. NOWAIT never waits while
 * holding a partial set of relation locks; no writer changes/triggers/epochs or retries.
 */
export async function withKidsJourneyCatalogPublicationFence<T>(
  db: Database,
  publish: (tx: Transaction) => Promise<T>,
): Promise<T> {
  let catalogBusy = false
  try {
    return await db.transaction(
      async (tx) => {
        try {
          // Closed typed table identities. Keep this as the first application statement in this TX.
          await tx.execute(
            sql`lock table ${courses}, ${lessons}, ${lessonBlocks} in share mode nowait`,
          )
        } catch (error) {
          catalogBusy = lockUnavailable(error)
          throw error // The aborted TX rolls back before the author-facing error is translated.
        }
        return publish(tx)
      },
      { isolationLevel: 'read committed' },
    )
  } catch (error) {
    if (catalogBusy) throw new KidsJourneyCatalogBusyError()
    throw error
  }
}
