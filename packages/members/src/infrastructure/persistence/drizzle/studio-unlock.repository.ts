import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type {
  StudioBlockGrant,
  StudioUnlockRepository,
} from '../../../domain/ports/studio-unlock-repository.port'
import type { Database } from './db'
import { studioBlockGrants } from './schema'

export class DrizzleStudioUnlockRepository implements StudioUnlockRepository {
  constructor(private readonly db: Database) {}

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
    // O service já resolveu a UNIÃO com o que estava congelado, então `excluded.blocks`
    // (o valor que ESTA linha tentou inserir) nunca ENCOLHE a lista guardada.
    // `granted_at` marca a última ampliação.
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
        set: { blocks: sql`excluded.blocks`, grantedAt: now },
      })
  }
}
