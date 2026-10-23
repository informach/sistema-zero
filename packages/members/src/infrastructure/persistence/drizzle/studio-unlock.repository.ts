import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { LearningOwner } from '../../../domain/ports/learning-repository.port'
import type {
  StudioBlockGrant,
  StudioUnlockRepository,
} from '../../../domain/ports/studio-unlock-repository.port'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { studioBlockGrants } from './schema'

export class DrizzleStudioUnlockRepository implements StudioUnlockRepository {
  constructor(private readonly db: Pick<Database, 'select' | 'insert' | 'transaction'>) {}

  async freezeGrants(
    owner: LearningOwner,
    audience: CourseAudience,
    grants: readonly StudioBlockGrant[],
  ): Promise<void> {
    const capturedOwner = { userId: owner.userId, accountId: owner.accountId }
    const capturedGrants = structuredClone(grants)
    if (capturedGrants.length === 0) return
    await this.db.transaction(async (tx) => {
      // Same account → creation-quota order as award/purge; no policy or catalog lock.
      await lockLearningOwner(tx, capturedOwner)
      await new DrizzleStudioUnlockRepository(tx).saveGrants(
        capturedOwner.userId,
        audience,
        capturedGrants,
      )
    })
  }

  async listGrants(userId: string, audience: CourseAudience): Promise<StudioBlockGrant[]> {
    const rows = await this.db
      .select({ courseId: studioBlockGrants.courseId, blocks: studioBlockGrants.blocks })
      .from(studioBlockGrants)
      .where(and(eq(studioBlockGrants.userId, userId), eq(studioBlockGrants.audience, audience)))
    return rows.map((row) => ({
      courseId: row.courseId,
      blocks: Array.isArray(row.blocks) ? row.blocks : [],
    }))
  }

  async saveGrants(
    userId: string,
    audience: CourseAudience,
    grants: readonly StudioBlockGrant[],
  ): Promise<void> {
    if (grants.length === 0) return
    const now = new Date()
    // O service resolve a união para evitar escritas inúteis, mas duas leituras concorrentes
    // podem partir de snapshots diferentes. O UPSERT faz a união FINAL no banco para que um
    // escritor atrasado nunca remova o bloco salvo por outra requisição.
    const unionedBlocks = sql<string[]>`(
      select coalesce(
        jsonb_agg(deduplicated.value order by deduplicated.first_ordinality),
        '[]'::jsonb
      )
      from (
        select expanded.value, min(expanded.ordinality) as first_ordinality
        from jsonb_array_elements_text(
          ${studioBlockGrants.blocks} || excluded.blocks
        ) with ordinality as expanded(value, ordinality)
        group by expanded.value
      ) as deduplicated
    )`
    await this.db
      .insert(studioBlockGrants)
      .values(
        grants.map((grant) => ({
          id: randomUUID(),
          userId,
          audience,
          courseId: grant.courseId,
          blocks: grant.blocks,
          grantedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [studioBlockGrants.userId, studioBlockGrants.audience, studioBlockGrants.courseId],
        set: { blocks: unionedBlocks, grantedAt: now },
      })
  }
}
