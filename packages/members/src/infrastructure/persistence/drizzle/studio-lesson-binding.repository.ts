import { and, eq, sql } from 'drizzle-orm'
import { AccessDeniedError } from '../../../domain/entitlement/entitlement.errors'
import { LiveConflictError } from '../../../domain/live/live.errors'
import type {
  StudioLessonBindingRepository,
  StudioLessonOwner,
} from '../../../domain/ports/studio-lesson-binding-repository.port'
import type { StudioLessonBaseline } from '../../../domain/studio/lesson-baseline'
import type { Database } from './db'
import { accountDeletionFences, studioLessonBaselines, studioLessonBindings } from './schema'

export type StudioBindingTransaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export async function lockStudioAccount(tx: StudioBindingTransaction, accountId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`members-account:${accountId}`}, 0))`,
  )
  const [fence] = await tx
    .select({ id: accountDeletionFences.accountId })
    .from(accountDeletionFences)
    .where(eq(accountDeletionFences.accountId, accountId))
  if (fence) throw new AccessDeniedError('Esta conta está em exclusão.')
}

export async function readStudioLessonBinding(
  db: Database | StudioBindingTransaction,
  owner: StudioLessonOwner,
  blockId: string,
) {
  const [row] = await db
    .select({ baseline: studioLessonBaselines, workspaceId: studioLessonBindings.workspaceId })
    .from(studioLessonBindings)
    .innerJoin(studioLessonBaselines, eq(studioLessonBaselines.id, studioLessonBindings.baselineId))
    .where(
      and(
        eq(studioLessonBindings.userId, owner.userId),
        eq(studioLessonBindings.accountId, owner.accountId),
        eq(studioLessonBindings.blockId, blockId),
      ),
    )
  if (!row) return null
  const { createdAt: _createdAt, ...baseline } = row.baseline
  return { baseline, workspaceId: row.workspaceId }
}

/** Caller holds the account lock. Same transaction as the live workspace insert/link. */
export async function insertStudioLessonBinding(
  tx: StudioBindingTransaction,
  owner: StudioLessonOwner,
  baseline: StudioLessonBaseline,
  workspaceId: string | null,
) {
  await tx.insert(studioLessonBaselines).values(baseline).onConflictDoNothing()
  await tx
    .insert(studioLessonBindings)
    .values({ ...owner, blockId: baseline.blockId, baselineId: baseline.id, workspaceId })
    .onConflictDoNothing()
  const stored = await readStudioLessonBinding(tx, owner, baseline.blockId)
  // A profile cannot be rebound to another account or to a live/recorded context by a race.
  if (!stored || stored.workspaceId !== workspaceId)
    throw new LiveConflictError(
      'O vínculo deste projeto mudou. Reabra a aula para continuar com o trabalho salvo.',
    )
  return stored
}

export class DrizzleStudioLessonBindingRepository implements StudioLessonBindingRepository {
  constructor(private readonly db: Database) {}
  find(owner: StudioLessonOwner, blockId: string) {
    return readStudioLessonBinding(this.db, owner, blockId)
  }
  bindRecorded(owner: StudioLessonOwner, baseline: StudioLessonBaseline) {
    return this.db.transaction(async (tx) => {
      await lockStudioAccount(tx, owner.accountId)
      const stored = await readStudioLessonBinding(tx, owner, baseline.blockId)
      if (stored) {
        if (stored.workspaceId)
          throw new LiveConflictError('Abra este projeto pela sala da oficina.')
        return stored
      }
      return insertStudioLessonBinding(tx, owner, baseline, null)
    })
  }
}
