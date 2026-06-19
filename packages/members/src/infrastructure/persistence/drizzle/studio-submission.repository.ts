import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { StudioCheckResult } from '../../../domain/course/studio-activity'
import type {
  StudioSubmissionDetail,
  StudioSubmissionRecord,
  StudioSubmissionRepository,
  StudioSubmissionState,
  StudioSubmissionSummary,
} from '../../../domain/ports/studio-submission-repository.port'
import type { Database } from './db'
import { courses, studioSubmissions } from './schema'

export class DrizzleStudioSubmissionRepository implements StudioSubmissionRepository {
  constructor(private readonly db: Database) {}

  async upsert(
    submission: StudioSubmissionRecord,
    options?: { preservePassedAt?: boolean },
  ): Promise<void> {
    // Reenvio = último vence: atualiza projeto + data + correção, preservando a
    // linha (e o id). `passed_at` é STICKY — o service já calcula o valor a
    // gravar (existente ?? agora-se-passou), então o set abaixo só persiste.
    const values = {
      ...submission,
      score: submission.score ?? null,
      results: submission.results ?? null,
      checkedAt: submission.checkedAt ?? null,
      passedAt: submission.passedAt ?? null,
    }

    if (!options?.preservePassedAt) {
      await this.db
        .insert(studioSubmissions)
        .values(values)
        .onConflictDoUpdate({
          target: [studioSubmissions.userId, studioSubmissions.blockId],
          set: {
            project: values.project,
            submittedAt: values.submittedAt,
            score: values.score,
            results: values.results,
            checkedAt: values.checkedAt,
            passedAt: values.passedAt,
          },
        })
      return
    }

    await this.db.transaction(async (tx) => {
      // serializa concorrência de submit por aluno+bloco; evita perda de `passedAt` sticky.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`${submission.userId}:${submission.blockId}`}, 0))`,
      )

      const rows = await tx
        .select({ passedAt: studioSubmissions.passedAt })
        .from(studioSubmissions)
        .where(
          and(eq(studioSubmissions.userId, submission.userId), eq(studioSubmissions.blockId, submission.blockId)),
        )
        .limit(1)

      const nextPassedAt = rows[0]?.passedAt ?? values.passedAt ?? null

      await tx
        .insert(studioSubmissions)
        .values({ ...values, passedAt: nextPassedAt })
        .onConflictDoUpdate({
          target: [studioSubmissions.userId, studioSubmissions.blockId],
          set: {
            project: values.project,
            submittedAt: values.submittedAt,
            score: values.score,
            results: values.results,
            checkedAt: values.checkedAt,
            passedAt: nextPassedAt,
          },
        })
    })
  }

  async summarizeByBlockIds(
    userId: string,
    blockIds: string[],
  ): Promise<Map<string, StudioSubmissionState>> {
    if (blockIds.length === 0) return new Map()
    const rows = await this.db
      .select({
        blockId: studioSubmissions.blockId,
        submittedAt: studioSubmissions.submittedAt,
        score: studioSubmissions.score,
        passedAt: studioSubmissions.passedAt,
      })
      .from(studioSubmissions)
      .where(
        and(eq(studioSubmissions.userId, userId), inArray(studioSubmissions.blockId, blockIds)),
      )
    const map = new Map<string, StudioSubmissionState>()
    for (const r of rows) {
      map.set(r.blockId, {
        submittedAt: r.submittedAt,
        score: r.score ?? null,
        passed: r.passedAt != null,
      })
    }
    return map
  }

  async listByBlock(blockId: string): Promise<StudioSubmissionSummary[]> {
    const rows = await this.db
      .select({
        userId: studioSubmissions.userId,
        submittedAt: studioSubmissions.submittedAt,
        score: studioSubmissions.score,
        checkedAt: studioSubmissions.checkedAt,
        passedAt: studioSubmissions.passedAt,
      })
      .from(studioSubmissions)
      .where(eq(studioSubmissions.blockId, blockId))
      .orderBy(asc(studioSubmissions.submittedAt))
    return rows.map((r) => ({
      userId: r.userId,
      submittedAt: r.submittedAt,
      score: r.score ?? null,
      checkedAt: r.checkedAt ?? null,
      passed: r.passedAt != null,
    }))
  }

  async getOne(userId: string, blockId: string): Promise<StudioSubmissionDetail | null> {
    const rows = await this.db
      .select({
        project: studioSubmissions.project,
        submittedAt: studioSubmissions.submittedAt,
        score: studioSubmissions.score,
        results: studioSubmissions.results,
        checkedAt: studioSubmissions.checkedAt,
        passedAt: studioSubmissions.passedAt,
      })
      .from(studioSubmissions)
      .where(and(eq(studioSubmissions.userId, userId), eq(studioSubmissions.blockId, blockId)))
      .limit(1)
    const row = rows[0]
    if (!row) return null
    return {
      project: row.project,
      submittedAt: row.submittedAt,
      score: row.score ?? null,
      results: (row.results as StudioCheckResult[] | null) ?? null,
      checkedAt: row.checkedAt ?? null,
      passedAt: row.passedAt ?? null,
    }
  }

  async countByUserAndAudience(userId: string, audience: CourseAudience): Promise<number> {
    // Escopa por audiência via o curso da entrega (paridade com xp/badges/cursos do
    // dashboard dos pais — um perfil que tocasse curso de outra vitrine não infla).
    const [row] = await this.db
      .select({ value: count() })
      .from(studioSubmissions)
      .innerJoin(courses, eq(courses.id, studioSubmissions.courseId))
      .where(and(eq(studioSubmissions.userId, userId), eq(courses.audience, audience)))
    return row?.value ?? 0
  }
}
