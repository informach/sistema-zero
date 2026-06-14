import { and, asc, eq, inArray } from 'drizzle-orm'
import type {
  StudioSubmissionRecord,
  StudioSubmissionRepository,
  StudioSubmissionSummary,
} from '../../../domain/ports/studio-submission-repository.port'
import type { Database } from './db'
import { studioSubmissions } from './schema'

export class DrizzleStudioSubmissionRepository implements StudioSubmissionRepository {
  constructor(private readonly db: Database) {}

  async upsert(submission: StudioSubmissionRecord): Promise<void> {
    // Reenvio = último vence: atualiza o projeto + a data, preservando a linha
    // (e o id) já existente. UNIQUE (user_id, block_id).
    await this.db
      .insert(studioSubmissions)
      .values(submission)
      .onConflictDoUpdate({
        target: [studioSubmissions.userId, studioSubmissions.blockId],
        set: { project: submission.project, submittedAt: submission.submittedAt },
      })
  }

  async listSubmittedBlockIds(userId: string, blockIds: string[]): Promise<Set<string>> {
    if (blockIds.length === 0) return new Set()
    const rows = await this.db
      .select({ blockId: studioSubmissions.blockId })
      .from(studioSubmissions)
      .where(
        and(eq(studioSubmissions.userId, userId), inArray(studioSubmissions.blockId, blockIds)),
      )
    return new Set(rows.map((r) => r.blockId))
  }

  async listByBlock(blockId: string): Promise<StudioSubmissionSummary[]> {
    return this.db
      .select({ userId: studioSubmissions.userId, submittedAt: studioSubmissions.submittedAt })
      .from(studioSubmissions)
      .where(eq(studioSubmissions.blockId, blockId))
      .orderBy(asc(studioSubmissions.submittedAt))
  }

  async getOne(
    userId: string,
    blockId: string,
  ): Promise<{ project: unknown; submittedAt: Date } | null> {
    const rows = await this.db
      .select({ project: studioSubmissions.project, submittedAt: studioSubmissions.submittedAt })
      .from(studioSubmissions)
      .where(and(eq(studioSubmissions.userId, userId), eq(studioSubmissions.blockId, blockId)))
      .limit(1)
    return rows[0] ?? null
  }
}
