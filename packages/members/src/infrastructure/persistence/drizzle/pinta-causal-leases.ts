import { and, eq, inArray, lte, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { Tx } from './pinta-causal-store'
import { creations as c, pintaCausalUnits as u } from './schema'

export async function expirePintaUnits(
  tx: Tx,
  scope: { userId: string; accountId: string; audience: CourseAudience },
  now: Date,
  individual = false,
) {
  const ids = await tx
    .update(u)
    .set({ state: 'expired', intent: null, pages: null })
    .where(
      and(
        eq(u.userId, scope.userId),
        eq(u.accountId, scope.accountId),
        eq(u.audience, scope.audience),
        inArray(u.state, ['collecting', 'reserved']),
        lte(u.expiresAt, now),
      ),
    )
    .returning({ id: u.opId })
  if (!ids.length) return []
  if (individual)
    await tx.execute(sql`select set_config('members.pinta_graph_writer','unit-v1',true)`)
  const released = ids.map((o) => o.id)
  await tx
    .update(c)
    .set(clearPending())
    .where(
      and(
        eq(c.userId, scope.userId),
        eq(c.accountId, scope.accountId),
        eq(c.audience, scope.audience),
        eq(c.tool, 'pinta'),
        inArray(c.pendingUnit, released),
      ),
    )
  if (individual) await tx.execute(sql`select set_config('members.pinta_graph_writer','',true)`)
  return released
}

/** Zera a reserva em voo (a lixeira e a recusa por quota no commit fazem isso). */
export function clearPending() {
  return {
    pendingUnit: null,
    pendingBinding: null,
    pendingAttestation: null,
    pendingParts: null,
    pendingRevision: null,
    pendingFormatVersion: null,
    pendingInventoryReader: null,
    pendingPaletteWrite: null,
    pendingBytes: null,
    pendingName: null,
    pendingKind: null,
    pendingItemUpdatedAt: null,
    pendingThumb: null,
    pendingContentFingerprint: null,
  }
}
